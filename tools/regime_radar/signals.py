"""Regime classifiers.

Two independent signals:
    vol_regime   : 'low' | 'mid' | 'high'      realized volatility vs. its own trailing history
    trend_regime : 'up' | 'sideways' | 'down'  close vs. its 50- and 200-day averages

No lookahead: the label for day t uses closes up to and including day t and
nothing later. The volatility cut points for day t come from realized vol up
to day t-1, so today's reading is compared against a baseline that does not
contain it.

`confirm()` sits on top of both. A label only changes after the new raw
reading has held for N trading days in a row.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS_PER_YEAR = 252


def realized_vol(returns: pd.Series, window: int = 21) -> pd.Series:
    """Annualized realized volatility: rolling std of daily log returns x sqrt(252)."""
    return returns.rolling(window=window, min_periods=window).std() * np.sqrt(
        TRADING_DAYS_PER_YEAR
    )


def vol_thresholds(
    rv: pd.Series,
    quantile_breaks: tuple[float, float] = (0.33, 0.67),
    quantile_lookback: int = TRADING_DAYS_PER_YEAR * 5,
) -> tuple[pd.Series, pd.Series]:
    """Low/mid and mid/high cut points for each day.

    The cut points for day t are quantiles of realized vol over the
    `quantile_lookback` days ending at t-1. NaN until that window is full.
    """
    if not (0 < quantile_breaks[0] < quantile_breaks[1] < 1):
        raise ValueError(f"quantile_breaks must be (lo, hi) with 0<lo<hi<1, got {quantile_breaks}")
    base = rv.shift(1).rolling(quantile_lookback, min_periods=quantile_lookback)
    return base.quantile(quantile_breaks[0]), base.quantile(quantile_breaks[1])


def vol_regime(
    returns: pd.Series,
    window: int = 21,
    quantile_breaks: tuple[float, float] = (0.33, 0.67),
    quantile_lookback: int = TRADING_DAYS_PER_YEAR * 5,
) -> pd.Series:
    """Raw daily volatility label: 'low' | 'mid' | 'high', NaN during warmup."""
    rv = realized_vol(returns, window=window)
    q_lo, q_hi = vol_thresholds(rv, quantile_breaks, quantile_lookback)

    label = pd.Series(index=rv.index, dtype="object", name="vol_regime")
    valid = rv.notna() & q_lo.notna() & q_hi.notna()
    label[valid & (rv <= q_lo)] = "low"
    label[valid & (rv > q_lo) & (rv <= q_hi)] = "mid"
    label[valid & (rv > q_hi)] = "high"
    return label


def trend_components(
    prices: pd.DataFrame,
    short_window: int = 50,
    long_window: int = 200,
    slope_window: int = 60,
) -> pd.DataFrame:
    """The three inputs to the trend rule, one row per day.

    ma_short, ma_long : simple moving averages of close
    ma_long_change    : ma_long[t] - ma_long[t - slope_window]; only its sign is used
    """
    close = prices["close"]
    ma_s = close.rolling(short_window, min_periods=short_window).mean()
    ma_l = close.rolling(long_window, min_periods=long_window).mean()
    return pd.DataFrame(
        {"ma_short": ma_s, "ma_long": ma_l, "ma_long_change": ma_l - ma_l.shift(slope_window)}
    )


def trend_regime(
    prices: pd.DataFrame,
    short_window: int = 50,
    long_window: int = 200,
    slope_window: int = 60,
) -> pd.Series:
    """Raw daily trend label: 'up' | 'sideways' | 'down', NaN during warmup.

        up       : close > MA_long  and  MA_short > MA_long  and  MA_long rising over slope_window
        down     : close < MA_long  and  MA_short < MA_long  and  MA_long falling over slope_window
        sideways : anything else

    A signed difference instead of a regression slope: the rule only asks
    whether the long average went up or down, and both give the same sign
    for that question in practice.
    """
    close = prices["close"]
    c = trend_components(prices, short_window, long_window, slope_window)
    ma_s, ma_l, chg = c["ma_short"], c["ma_long"], c["ma_long_change"]

    label = pd.Series(index=close.index, dtype="object", name="trend_regime")
    valid = ma_s.notna() & ma_l.notna() & chg.notna()
    is_up = (close > ma_l) & (ma_s > ma_l) & (chg > 0)
    is_dn = (close < ma_l) & (ma_s < ma_l) & (chg < 0)

    label[valid] = "sideways"
    label[valid & is_up] = "up"
    label[valid & is_dn] = "down"
    return label


def confirm(labels: pd.Series, days: int = 3) -> pd.Series:
    """Hold the current label until a different raw label appears `days` times in a row.

    Removes the one- and two-day flips that happen when a reading sits right on
    a cut point. The price is a lag: a real switch shows up `days - 1` trading
    days late. Uses only past and current raw labels, so it adds no lookahead.
    With days=1 the output equals the input. NaN in, NaN out.
    """
    if days < 1:
        raise ValueError(f"days must be >= 1, got {days}")
    if days == 1:
        return labels.copy()

    values = labels.to_numpy(dtype=object)
    out = np.empty(len(values), dtype=object)
    state = candidate = None
    streak = 0
    for i, v in enumerate(values):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            out[i] = np.nan
            candidate, streak = None, 0
            continue
        if state is None or v == state:
            state = v
            candidate, streak = None, 0
        else:
            streak = streak + 1 if v == candidate else 1
            candidate = v
            if streak >= days:
                state, candidate, streak = v, None, 0
        out[i] = state
    return pd.Series(out, index=labels.index, name=labels.name, dtype="object")


def trailing_streak(labels: pd.Series) -> int:
    """How many days in a row the last non-NaN label has held."""
    s = labels.dropna()
    if s.empty:
        return 0
    last = s.iloc[-1]
    values = s.to_numpy(dtype=object)
    n = 0
    for v in values[::-1]:
        if v != last:
            break
        n += 1
    return n
