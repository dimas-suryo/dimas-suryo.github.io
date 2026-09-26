"""Does a hidden Markov model rewrite the past when it gets more data?

The Regime Radar page has long made three claims about HMMs without testing them:
  1. The labels move: refit with more data and the model relabels history.
  2. The states have no fixed meaning: state 0 in one fit can be state 1 in the next.
  3. The probabilities look more precise than they are.
This script tests all three on IHSG, using the same cleaned closes the site publishes.

The HMM gets the strongest fair setup, since the point is to criticize the method
and not a strawman of it:
  - Gaussian HMM on daily log returns (in percent), best of several random starts
  - states identified after every fit by variance, lowest first, so "turbulent"
    always means the most volatile state
  - a real-time label for each day from a forward filter, run with parameters from
    the most recent monthly refit, which is how one would run it in production

Run from the repo root (reads the published payload, no network needed):
    pip install -r tools/regime_radar/requirements-research.txt
    python -m tools.regime_radar.hmm_refit --out hmm_k2                            # about 4 min
    python -m tools.regime_radar.hmm_refit --k 3 --every 3 --daily 0 --out hmm_k3q  # about 6 min
    python -m tools.regime_radar.hmm_refit --k 3 --every 6 --daily 0 --out hmm_k3h  # about 3 min
The first is the two-state setup the post calls the main case; the other two are
the three-state checks (turbulent label every quarter, all labels every six months).

Writes <out>/report.md, <out>/results.json and figures.
"""
from __future__ import annotations

import argparse
import json
import warnings
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Pure NumPy parts (tested in CI without hmmlearn)
# ---------------------------------------------------------------------------


@dataclass
class HMMParams:
    """Parameters of a Gaussian HMM with states already sorted by variance."""

    startprob: np.ndarray  # (K,)
    transmat: np.ndarray  # (K, K)
    means: np.ndarray  # (K,)
    variances: np.ndarray  # (K,)


def forward_filter(x: np.ndarray, p: HMMParams, prior: np.ndarray | None = None) -> np.ndarray:
    """P(state_t | x_1..x_t) for every t. Uses no data after t, unlike smoothing.

    `prior` is the state distribution before x[0]; defaults to the start probabilities.
    """
    K = len(p.means)
    out = np.empty((len(x), K))
    alpha = (p.startprob if prior is None else prior).astype(float)
    sd = np.sqrt(p.variances)
    for t, xt in enumerate(x):
        if t > 0 or prior is not None:
            alpha = alpha @ p.transmat
        dens = np.exp(-0.5 * ((xt - p.means) / sd) ** 2) / (sd * np.sqrt(2 * np.pi))
        alpha = alpha * np.maximum(dens, 1e-300)
        alpha /= alpha.sum()
        out[t] = alpha
    return out


def relabel_share(prev: np.ndarray, new: np.ndarray) -> float:
    """Share of the dates both fits cover (the first len(prev)) whose label changed."""
    n = len(prev)
    return float(np.mean(prev != new[:n])) if n else 0.0


def earliest_change(prev: np.ndarray, new: np.ndarray) -> int | None:
    """Index of the earliest date relabeled by the new fit, or None if nothing changed."""
    diff = np.flatnonzero(prev != new[: len(prev)])
    return int(diff[0]) if len(diff) else None


def self_agreement(realtime_p: np.ndarray, hindsight_label: np.ndarray, lo: float, hi: float) -> tuple[float, int]:
    """Among days where the real-time P(turbulent) was in [lo, hi], how often hindsight agreed.

    Agreement means hindsight turbulent when the real-time probability was above 0.5,
    calm otherwise. Returns (share agreeing, number of days).
    """
    m = (realtime_p >= lo) & (realtime_p <= hi)
    if not m.any():
        return float("nan"), 0
    said_turbulent = realtime_p[m] > 0.5
    return float(np.mean(said_turbulent == hindsight_label[m].astype(bool))), int(m.sum())


# ---------------------------------------------------------------------------
# Fitting (needs hmmlearn)
# ---------------------------------------------------------------------------


def fit_best(x: np.ndarray, k: int = 2, n_init: int = 5, seed: int = 0):
    """Best-of-n Gaussian HMM. Returns (params sorted by variance, raw index of the most volatile state)."""
    from hmmlearn.hmm import GaussianHMM

    X = x.reshape(-1, 1)
    best = None
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for i in range(n_init):
            m = GaussianHMM(n_components=k, covariance_type="diag", n_iter=500, tol=1e-6, random_state=seed + i)
            m.fit(X)
            score = m.score(X)
            if best is None or score > best[0]:
                best = (score, m)
    m = best[1]
    var = m.covars_.reshape(k, -1)[:, 0]
    order = np.argsort(var)
    params = HMMParams(
        startprob=m.startprob_[order],
        transmat=m.transmat_[np.ix_(order, order)],
        means=m.means_.ravel()[order],
        variances=var[order],
    )
    return params, int(order[-1]), m, order


def state_labels(m, order, x: np.ndarray) -> np.ndarray:
    """Most likely state for every day, numbered by variance (0 = calmest).

    With two states this is the same as the turbulent label. With three it also
    separates calm from normal, which is where most of the instability lives.
    """
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        post = m.predict_proba(x.reshape(-1, 1))
    return post[:, order].argmax(axis=1).astype(np.int8)


def smoothed_turbulent(m, order, x: np.ndarray) -> np.ndarray:
    """P(most volatile state | all data in the fit), forward-backward smoothed."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        post = m.predict_proba(x.reshape(-1, 1))
    return post[:, order[-1]]


# ---------------------------------------------------------------------------
# Experiments
# ---------------------------------------------------------------------------


def load_returns(payload: Path) -> tuple[pd.Series, pd.Series, pd.Series]:
    """(daily log returns in percent, Regime Radar vol label, close), all indexed by date."""
    p = json.loads(payload.read_text())
    s = p["series"]
    idx = pd.to_datetime(s["date"])
    close = pd.Series(s["close"], index=idx)
    r = (np.log(close).diff() * 100).dropna()
    vol = pd.Series(s["vol_regime"], index=idx)
    return r, vol, close


def monthly_refits(r: pd.Series, start: str = "2010-01", k: int = 2, n_init: int = 5, every: int = 1) -> dict:
    """Refit at every `every`-th month end from `start`. Keeps each fit's smoothed labels
    and probabilities, and the real-time filtered probability for every day until the next refit."""
    ends = r.groupby(r.index.to_period("M")).apply(lambda s: s.index[-1])
    ends = [d for d in ends if d >= pd.Timestamp(start)][::every]
    x = r.to_numpy()
    pos = {d: i for i, d in enumerate(r.index)}

    fits, labels, probs, raw_turb, full = [], [], [], [], []
    realtime = pd.Series(np.nan, index=r.index)
    for j, d in enumerate(ends):
        n = pos[d] + 1
        params, raw, m, order = fit_best(x[:n], k=k, n_init=n_init, seed=1000 + j)
        sp = smoothed_turbulent(m, order, x[:n])
        full.append(state_labels(m, order, x[:n]))
        probs.append(sp)
        labels.append((sp > 0.5).astype(np.int8))
        raw_turb.append(raw)
        fits.append(params)
        # Real-time: carry the filter forward through the next month with these parameters.
        prior_post = forward_filter(x[:n], params)[-1]
        stop = pos[ends[j + 1]] + 1 if j + 1 < len(ends) else len(x)
        if stop > n:
            f = forward_filter(x[n:stop], params, prior=prior_post)
            realtime.iloc[n:stop] = f[:, -1]
    return {"ends": ends, "labels": labels, "probs": probs, "full_labels": full,
            "raw_turbulent_index": raw_turb, "params": fits, "realtime": realtime}


def daily_refits(r: pd.Series, last_n: int = 250, k: int = 2, n_init: int = 5) -> dict:
    """Refit after every one of the last `last_n` trading days."""
    x = r.to_numpy()
    labels = []
    for j, n in enumerate(range(len(x) - last_n, len(x) + 1)):
        _, _, m, order = fit_best(x[:n], k=k, n_init=n_init, seed=5000 + j)
        labels.append((smoothed_turbulent(m, order, x[:n]) > 0.5).astype(np.int8))
    return {"labels": labels, "dates": list(r.index[len(x) - last_n - 1 :])}


def prob_shift(prev: np.ndarray, new: np.ndarray) -> float:
    """Mean absolute change in P(turbulent) over the dates both fits cover."""
    n = len(prev)
    return float(np.mean(np.abs(prev - new[:n]))) if n else 0.0


def summarize_churn(labels: list[np.ndarray], dates: pd.DatetimeIndex, step_dates: list,
                    probs: list[np.ndarray] | None = None) -> dict:
    shares, reach_days, changed, ndays, shifts = [], [], 0, [], []
    for i, (a, b, d) in enumerate(zip(labels[:-1], labels[1:], step_dates[1:])):
        sh = relabel_share(a, b)
        shares.append(sh)
        ndays.append(int(np.sum(a != b[: len(a)])))
        if probs is not None:
            shifts.append(prob_shift(probs[i], probs[i + 1]))
        e = earliest_change(a, b)
        if e is not None:
            changed += 1
            reach_days.append((pd.Timestamp(d) - dates[e]).days)
    shares = np.array(shares)
    return {
        "refits": len(labels) - 1,
        "refits_that_relabeled_something": changed,
        "median_share_relabeled": float(np.median(shares)),
        "p90_share_relabeled": float(np.quantile(shares, 0.9)),
        "max_share_relabeled": float(shares.max()),
        "median_days_back_of_earliest_change": float(np.median(reach_days)) if reach_days else None,
        "max_days_back_of_earliest_change": float(max(reach_days)) if reach_days else None,
        "median_days_relabeled": float(np.median(ndays)),
        "max_days_relabeled": int(max(ndays)),
        "median_prob_shift": float(np.median(shifts)) if shifts else None,
        "max_prob_shift": float(max(shifts)) if shifts else None,
        "shares": shares.tolist(),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--payload", type=Path, default=Path("static/data/regime-radar/_JKSE.json"))
    ap.add_argument("--out", type=Path, default=Path("hmm_report"))
    ap.add_argument("--daily", type=int, default=250, help="daily refits over the last N days")
    ap.add_argument("--n-init", type=int, default=5)
    ap.add_argument("--k", type=int, default=2, help="number of states")
    ap.add_argument("--every", type=int, default=1, help="refit every N months")
    ap.add_argument("--start", default="2010-01", help="first refit month")
    args = ap.parse_args(argv)
    args.out.mkdir(parents=True, exist_ok=True)

    r, rr_vol, close = load_returns(args.payload)
    x = r.to_numpy()

    # Full-sample fit: the "textbook" chart.
    full_params, _, full_m, full_order = fit_best(x, k=args.k, n_init=args.n_init, seed=0)
    full_p = smoothed_turbulent(full_m, full_order, x)
    full_label = (full_p > 0.5).astype(np.int8)

    mon = monthly_refits(r, start=args.start, k=args.k, n_init=args.n_init, every=args.every)
    mon_churn = summarize_churn(mon["labels"], r.index, mon["ends"], mon["probs"])
    all_churn = summarize_churn(mon["full_labels"], r.index, mon["ends"])
    raw = np.array(mon["raw_turbulent_index"])
    swaps = int(np.sum(raw[1:] != raw[:-1]))

    rt = mon["realtime"].dropna()
    rt_idx = r.index.get_indexer(rt.index)
    hind = full_label[rt_idx]
    rt_label = (rt.to_numpy() > 0.5).astype(np.int8)
    agree_all = float(np.mean(rt_label == hind))
    conf_t, n_conf_t = self_agreement(rt.to_numpy(), hind, 0.9, 1.0)
    conf_c, n_conf_c = self_agreement(rt.to_numpy(), hind, 0.0, 0.1)
    unsure, n_unsure = self_agreement(rt.to_numpy(), hind, 0.1, 0.9)
    share_confident = float(np.mean((rt >= 0.9) | (rt <= 0.1)))

    # Turbulent share: how different does history look in hindsight vs in real time?
    turb_share_hind = float(hind.mean())
    turb_share_rt = float(rt_label.mean())

    # Gaussian check: within-state standardized returns under the full-sample fit.
    sd = np.sqrt(full_params.variances)[full_label]
    mu = full_params.means[full_label]
    z = (x - mu) / sd
    excess_kurt_within = float(pd.Series(z).kurt())

    if args.daily > 0:
        daily = daily_refits(r, last_n=args.daily, k=args.k, n_init=args.n_init)
        day_churn = summarize_churn(daily["labels"], r.index, daily["dates"])
    else:
        daily = {"labels": [], "dates": []}
        day_churn = {"shares": []}

    # Next-month volatility after each label, real-time HMM vs Regime Radar.
    fwd_vol = r.rolling(21).std().shift(-21) * np.sqrt(252)
    fv = fwd_vol.reindex(rt.index)
    hmm_calm, hmm_turb = float(fv[rt_label == 0].median()), float(fv[rt_label == 1].median())
    rrv = rr_vol.reindex(rt.index)
    rr_low, rr_high = float(fv[rrv == "low"].median()), float(fv[rrv == "high"].median())

    res = {
        "settings": {"k": args.k, "n_init": args.n_init, "refit_every_months": args.every, "daily_refits": args.daily},
        "sample": [str(r.index[0].date()), str(r.index[-1].date())],
        "returns_excess_kurtosis": float(pd.Series(x).kurt()),
        "within_state_excess_kurtosis": excess_kurt_within,
        "full_fit": {
            "sd": np.sqrt(full_params.variances).round(3).tolist(),
            "mean": full_params.means.round(4).tolist(),
            "expected_duration_days": (1 / (1 - np.diag(full_params.transmat))).round(1).tolist(),
            "turbulent_share": float(full_label.mean()),
        },
        "monthly": {**{k: v for k, v in mon_churn.items() if k != "shares"}, "raw_index_swaps": swaps},
        "monthly_all_states": {k: v for k, v in all_churn.items() if k not in ("shares", "median_prob_shift", "max_prob_shift")},
        "daily": {k: v for k, v in day_churn.items() if k != "shares"},
        "realtime_vs_hindsight": {
            "days": int(len(rt)),
            "agreement": agree_all,
            "turbulent_share_realtime": turb_share_rt,
            "turbulent_share_hindsight": turb_share_hind,
            "share_confident_calls": share_confident,
            "agreement_when_realtime_p_ge_0.9": [conf_t, n_conf_t],
            "agreement_when_realtime_p_le_0.1": [conf_c, n_conf_c],
            "agreement_when_unsure": [unsure, n_unsure],
        },
        "next_month_vol": {"hmm_calm": hmm_calm, "hmm_turbulent": hmm_turb, "rr_low": rr_low, "rr_high": rr_high},
    }
    (args.out / "results.json").write_text(json.dumps(res, indent=2))

    np.savez_compressed(
        args.out / "labels.npz",
        full_p=full_p, full_label=full_label,
        monthly=np.array([np.pad(l, (0, len(x) - len(l)), constant_values=-1) for l in mon["labels"]]),
        monthly_ends=np.array([str(d.date()) for d in mon["ends"]]),
        realtime=mon["realtime"].to_numpy(),
        daily=np.array([np.pad(l, (0, len(x) - len(l)), constant_values=-1) for l in daily["labels"]]) if daily["labels"] else np.zeros((0, len(x))),
        dates=np.array([str(d.date()) for d in r.index]),
        close=close.reindex(r.index).to_numpy(),
        monthly_shares=np.array(mon_churn["shares"]),
        monthly_all_states=np.array([np.pad(l, (0, len(x) - len(l)), constant_values=-1) for l in mon["full_labels"]]),
        daily_shares=np.array(day_churn["shares"]),
    )
    print(json.dumps(res, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
