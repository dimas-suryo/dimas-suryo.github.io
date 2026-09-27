"""Two-state hidden Markov model for the experimental panel, shared with hmm_refit.py.

What the panel shows is strictly real time. The model is refit at the end of
every complete month on the returns up to that day, and each following day gets
P(turbulent) from a forward filter run with that month's parameters. Nothing
here uses a day's future, so, unlike the smoothed "textbook" HMM chart, a value
never changes once published (unless the price history itself is corrected).
See /blog/the-argument-i-never-tested/ for why this setup and not another.

Each month's fitted model is cached and published next to the payloads as
hmm-<SYMBOL>.json, so a daily build fits at most one new model, and anyone can
inspect every model the panel has ever used.
"""
from __future__ import annotations

import hashlib
import warnings
from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class HMMParams:
    """Parameters of a Gaussian HMM with states sorted by variance (0 = calmest)."""

    startprob: np.ndarray  # (K,)
    transmat: np.ndarray  # (K, K)
    means: np.ndarray  # (K,)
    variances: np.ndarray  # (K,)

    def to_dict(self) -> dict:
        return {
            "startprob": [round(float(v), 10) for v in self.startprob],
            "transmat": [[round(float(v), 10) for v in row] for row in self.transmat],
            "means": [round(float(v), 10) for v in self.means],
            "variances": [round(float(v), 10) for v in self.variances],
        }

    @classmethod
    def from_dict(cls, d: dict) -> "HMMParams":
        return cls(
            startprob=np.array(d["startprob"], dtype=float),
            transmat=np.array(d["transmat"], dtype=float),
            means=np.array(d["means"], dtype=float),
            variances=np.array(d["variances"], dtype=float),
        )


def forward_filter(x: np.ndarray, p: HMMParams, prior: np.ndarray | None = None) -> np.ndarray:
    """P(state_t | x_1..x_t) for every t. Uses no data after t, unlike smoothing.

    `prior` is the state distribution on the day before x[0] (the last filtered
    posterior of an earlier run); without it the start probabilities are used.
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


def fit_best(x: np.ndarray, k: int = 2, n_init: int = 5, seed: int = 0):
    """Best-of-n Gaussian HMM (needs hmmlearn).

    Returns (params sorted by variance, raw index of the most volatile state,
    the fitted hmmlearn model, the sort order).
    """
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


def complete_month_ends(index: pd.DatetimeIndex, start: str) -> list[pd.Timestamp]:
    """Last trading day of every month from `start` whose month is over.

    The month of the latest date is still running, so its last day so far is
    not a month end yet. It becomes one when the first day of the next month arrives.
    """
    s = pd.Series(index, index=index)
    ends = s.groupby(index.to_period("M")).max()
    latest = index[-1].to_period("M")
    return [d for p, d in ends.items() if p >= pd.Period(start, "M") and p < latest]


def _returns_pct(close: pd.Series) -> pd.Series:
    return (np.log(close).diff() * 100).dropna()


def data_hash(x: np.ndarray) -> str:
    """Fingerprint of the returns a refit was fitted on. Any corrected price before
    the month end changes it, which forces that month (and later ones) to refit."""
    return hashlib.sha1(np.round(x, 8).tobytes()).hexdigest()[:16]


def realtime_turbulent(
    close: pd.Series,
    start: str = "2010-01",
    n_init: int = 3,
    cache: list[dict] | None = None,
) -> tuple[pd.Series, list[dict]]:
    """Real-time P(turbulent) for every day, and the list of monthly refits used.

    Days up to and including the first refit get NaN. Each refit in `cache` is
    reused only when the returns it was fitted on are unchanged, checked with a
    hash of all of them; otherwise it is fitted again.
    """
    r = _returns_pct(close)
    x = r.to_numpy()
    pos = {d: i for i, d in enumerate(r.index)}
    cached = {c["end"]: c for c in (cache or [])}

    refits = []
    for d in complete_month_ends(r.index, start):
        n = pos[d] + 1
        key = d.strftime("%Y-%m-%d")
        h = data_hash(x[:n])
        c = cached.get(key)
        if c and c.get("n") == n and c.get("data_hash") == h:
            refits.append(c)
            continue
        params, _, m, _ = fit_best(x[:n], k=2, n_init=n_init, seed=d.year * 100 + d.month)
        prior = forward_filter(x[:n], params)[-1]
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            loglik = float(m.score(x[:n].reshape(-1, 1)))
        refits.append({
            "end": key, "n": n, "data_hash": h, "last_close": float(close.loc[d]),
            "params": params.to_dict(), "prior": [round(float(v), 12) for v in prior],
            "loglik": round(loglik, 4),
        })

    p = pd.Series(np.nan, index=close.index)
    for j, c in enumerate(refits):
        lo = pos[pd.Timestamp(c["end"])] + 1
        hi = pos[pd.Timestamp(refits[j + 1]["end"])] + 1 if j + 1 < len(refits) else len(x)
        if hi > lo:
            f = forward_filter(x[lo:hi], HMMParams.from_dict(c["params"]), prior=np.array(c["prior"]))
            p.loc[r.index[lo:hi]] = f[:, -1]
    return p, refits


def describe(refit: dict) -> dict:
    """Readable summary of one monthly model: daily volatility, mean and expected spell length per state."""
    prm = HMMParams.from_dict(refit["params"])
    stay = np.diag(prm.transmat)
    names = ["calm", "turbulent"]
    return {
        "fitted_through": refit["end"],
        "states": [
            {
                "name": names[i],
                "daily_sd": round(float(np.sqrt(prm.variances[i]) / 100), 5),
                "daily_mean": round(float(prm.means[i] / 100), 6),
                "expected_days": round(float(1 / (1 - stay[i])), 1) if stay[i] < 1 else None,
            }
            for i in range(len(names))
        ],
    }
