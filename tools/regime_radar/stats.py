"""Descriptive statistics for the page: episodes, and what followed each regime.

Everything here looks forward in time on purpose: it is a historical table,
not an input to the labels. The labels themselves never see these numbers.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .signals import TRADING_DAYS_PER_YEAR

# How bad a bad month is: the return that one forward window in ten fell below.
# Added 26 Sep 2026, after the median columns showed no trend effect. The case
# for trend rules has always been about smaller losses in bad months rather
# than a better typical month, so this is the column that tests their claim.
TAIL_Q = 0.10


def episodes(labels: pd.Series) -> pd.DataFrame:
    """Runs of identical consecutive labels: label, start, end, length (trading days)."""
    s = labels.dropna()
    cols = ["label", "start", "end", "length"]
    if s.empty:
        return pd.DataFrame(columns=cols)
    run_id = (s != s.shift()).cumsum()
    g = s.groupby(run_id)
    out = pd.DataFrame(
        {
            "label": g.first().to_numpy(),
            "start": [grp.index[0] for _, grp in g],
            "end": [grp.index[-1] for _, grp in g],
            "length": g.size().to_numpy(),
        }
    )
    return out[cols]


def forward_metrics(close: pd.Series, horizon: int = 21) -> pd.DataFrame:
    """For each day t, what happened over the next `horizon` trading days.

    fwd_return : simple return from close[t] to close[t + horizon]
    fwd_vol    : annualized std of daily log returns t+1 .. t+horizon
    NaN for the last `horizon` days, which have no complete future yet.
    """
    logc = np.log(close)
    r = logc.diff()
    return pd.DataFrame(
        {
            "fwd_return": np.exp(logc.shift(-horizon) - logc) - 1,
            "fwd_vol": r.rolling(horizon).std().shift(-horizon) * np.sqrt(TRADING_DAYS_PER_YEAR),
        },
        index=close.index,
    )


def _summary(mask: pd.Series, fwd: pd.DataFrame, run_id: pd.Series | None) -> dict:
    valid = mask & fwd["fwd_return"].notna() & fwd["fwd_vol"].notna()
    fr = fwd.loc[valid, "fwd_return"]
    fv = fwd.loc[valid, "fwd_vol"]
    out = {
        "days_with_future": int(valid.sum()),
        "median_return": None if fr.empty else round(float(fr.median()), 4),
        "p10_return": None if fr.empty else round(float(fr.quantile(TAIL_Q)), 4),
        "share_positive": None if fr.empty else round(float((fr > 0).mean()), 3),
        "median_vol": None if fv.empty else round(float(fv.median()), 4),
    }
    if run_id is not None:
        out["episodes_with_future"] = int(run_id[valid].nunique())
    return out


def regime_table(labels: pd.Series, fwd: pd.DataFrame, order: list[str]) -> list[dict]:
    """One row per label in `order`: time share, episode count and length, forward outcomes."""
    s = labels.dropna()
    total = len(s)
    fwd = fwd.reindex(s.index)
    eps = episodes(s)
    run_id = (s != s.shift()).cumsum()
    rows = []
    for lab in order:
        mask = s == lab
        e = eps[eps["label"] == lab]
        rows.append(
            {
                "label": lab,
                "days": int(mask.sum()),
                "share": round(float(mask.sum() / total), 3) if total else None,
                "episodes": int(len(e)),
                "median_length": None if e.empty else int(e["length"].median()),
                **_summary(mask, fwd, run_id),
            }
        )
    return rows


def baseline(index: pd.Index, fwd: pd.DataFrame) -> dict:
    """The same forward numbers over every labeled day, for comparison."""
    fwd = fwd.reindex(index)
    mask = pd.Series(True, index=index)
    return {"label": "all", "days": int(len(index)), **_summary(mask, fwd, None)}


def current_episode(labels: pd.Series) -> tuple[str | None, int]:
    """(start date, length in trading days) of the run the last label belongs to."""
    eps = episodes(labels)
    if eps.empty:
        return None, 0
    last = eps.iloc[-1]
    return pd.Timestamp(last["start"]).strftime("%Y-%m-%d"), int(last["length"])


# ---------------------------------------------------------------------------
# Episode bootstrap
# ---------------------------------------------------------------------------

METRICS = ("median_return", "share_positive", "median_vol", "p10_return")


def _metrics(arr: np.ndarray) -> np.ndarray:
    """arr columns: fwd_return, fwd_vol. Returns the table metrics, in METRICS order."""
    r = arr[:, 0]
    return np.array([np.median(r), np.mean(r > 0), np.median(arr[:, 1]), np.quantile(r, TAIL_Q)])


def _episode_blocks(labels: pd.Series, fwd: pd.DataFrame, order: list[str]) -> dict[str, list[np.ndarray]]:
    """Forward outcomes grouped into one array per episode, per label.

    Days without a complete forward window (the last `horizon` days) are dropped,
    so the current, unfinished episode only contributes the days it can.
    """
    s = labels.dropna()
    f = fwd.reindex(s.index)
    valid = (f["fwd_return"].notna() & f["fwd_vol"].notna()).to_numpy()
    run_id = (s != s.shift()).cumsum().to_numpy()
    lab = s.to_numpy(dtype=object)
    vals = f[["fwd_return", "fwd_vol"]].to_numpy()

    blocks: dict[str, list[np.ndarray]] = {k: [] for k in order}
    start = 0
    n = len(s)
    for i in range(1, n + 1):
        if i == n or run_id[i] != run_id[start]:
            if lab[start] in blocks:
                m = valid[start:i]
                if m.any():
                    blocks[lab[start]].append(vals[start:i][m])
            start = i
    return blocks


def bootstrap_intervals(
    labels: pd.Series,
    fwd: pd.DataFrame,
    order: list[str],
    n_boot: int = 2000,
    seed: int = 7,
    level: float = 0.95,
    min_episodes: int = 5,
) -> dict:
    """Stratified episode bootstrap for the forward-outcome columns of the table.

    Each replicate resamples whole episodes with replacement, keeping the number
    of episodes per label fixed, and recomputes every label's metrics plus the
    pooled all-days metrics from the same draw. That gives two intervals per
    cell: one for the level, and one for the gap to all days. A gap interval
    that excludes zero is what the page marks with an asterisk.

    Why episodes and not days: neighbouring days share most of their forward
    window, so a day-level bootstrap treats thousands of nearly identical
    observations as independent and produces intervals that are far too narrow.
    Episodes are closer to independent, though not fully: volatility clusters
    across episode boundaries and forward windows spill into the next episode,
    so these intervals are still somewhat optimistic.

    Labels with fewer than `min_episodes` episodes get None instead of an interval.
    """
    blocks = _episode_blocks(labels, fwd, order)
    usable = [k for k in order if blocks[k]]
    if not usable:
        return {"all": None, **{k: None for k in order}}

    rng = np.random.default_rng(seed)
    reps = {k: np.empty((n_boot, len(METRICS))) for k in usable}
    reps_all = np.empty((n_boot, len(METRICS)))
    for b in range(n_boot):
        pooled = []
        for k in usable:
            eps = blocks[k]
            arr = np.concatenate([eps[j] for j in rng.integers(0, len(eps), len(eps))])
            reps[k][b] = _metrics(arr)
            pooled.append(arr)
        reps_all[b] = _metrics(np.concatenate(pooled))

    q = [(1 - level) / 2, 1 - (1 - level) / 2]

    def interval(x: np.ndarray) -> list[float]:
        lo, hi = np.quantile(x, q)
        return [round(float(lo), 4), round(float(hi), 4)]

    out: dict = {
        "all": {m: {"ci": interval(reps_all[:, j])} for j, m in enumerate(METRICS)}
    }
    for k in order:
        if k not in usable or len(blocks[k]) < min_episodes:
            out[k] = None
            continue
        out[k] = {
            m: {"ci": interval(reps[k][:, j]), "gap_ci": interval(reps[k][:, j] - reps_all[:, j])}
            for j, m in enumerate(METRICS)
        }
    return out
