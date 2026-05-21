"""Signal/regime classifiers.

Dua signal independen:
    vol_regime  : 'low' | 'mid' | 'high'   — berdasarkan realized volatility
    trend_regime: 'up'  | 'sideways' | 'down' — berdasarkan MA crossover + slope

Semua quantile dihitung dengan window TRAILING dan SHIFTED-by-1 supaya tidak ada
lookahead: label tanggal t hanya melihat data sampai tanggal t-1.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS_PER_YEAR = 252


def realized_vol(returns: pd.Series, window: int = 21) -> pd.Series:
    """Annualized realized volatility = rolling std × sqrt(252)."""
    return returns.rolling(window=window, min_periods=window).std() * np.sqrt(
        TRADING_DAYS_PER_YEAR
    )


def vol_regime(
    returns: pd.Series,
    window: int = 21,
    quantile_breaks: tuple[float, float] = (0.33, 0.67),
    quantile_lookback: int = TRADING_DAYS_PER_YEAR * 5,
) -> pd.Series:
    """Klasifikasi per-tanggal: 'low' | 'mid' | 'high'.

    Realized vol = rolling std(returns, window) annualized.
    Quantile breaks dihitung dengan **trailing window shifted-by-1** — quantile
    untuk tanggal t pakai data [t - quantile_lookback - 1 .. t - 1]. Jadi
    label hari ini tidak "tahu" vol hari ini, no lookahead.

    Sebelum trailing window cukup terisi, label = NaN.
    """
    if not (0 < quantile_breaks[0] < quantile_breaks[1] < 1):
        raise ValueError(f"quantile_breaks must be (lo, hi) with 0<lo<hi<1, got {quantile_breaks}")

    rv = realized_vol(returns, window=window)

    # Trailing quantiles, shift(1) supaya tidak melihat 'today':
    q_lo = rv.shift(1).rolling(quantile_lookback, min_periods=quantile_lookback).quantile(
        quantile_breaks[0]
    )
    q_hi = rv.shift(1).rolling(quantile_lookback, min_periods=quantile_lookback).quantile(
        quantile_breaks[1]
    )

    label = pd.Series(index=rv.index, dtype="object", name="vol_regime")
    valid = rv.notna() & q_lo.notna() & q_hi.notna()
    label[valid & (rv <= q_lo)] = "low"
    label[valid & (rv > q_lo) & (rv <= q_hi)] = "mid"
    label[valid & (rv > q_hi)] = "high"
    return label


def trend_regime(
    prices: pd.DataFrame,
    short_window: int = 50,
    long_window: int = 200,
    slope_window: int = 60,
) -> pd.Series:
    """Klasifikasi per-tanggal: 'up' | 'sideways' | 'down'.

    Rule (closed-form, tidak butuh fitting):
        up       : close > MA_long  AND  MA_short > MA_long  AND  slope(MA_long) > 0
        down     : close < MA_long  AND  MA_short < MA_long  AND  slope(MA_long) < 0
        sideways : everything else

    Slope didefinisikan sebagai (MA_long[t] - MA_long[t - slope_window]) / slope_window.
    Kita cuma peduli SIGN-nya — magnitude tidak dipakai. Pemilihan signed-difference
    daripada regression slope sengaja: lebih cepat dan untuk pertanyaan biner
    "naik atau turun" hasilnya identik.

    Tidak ada quantile/baseline -- jadi tidak ada masalah lookahead.
    """
    close = prices["close"]
    ma_s = close.rolling(short_window, min_periods=short_window).mean()
    ma_l = close.rolling(long_window, min_periods=long_window).mean()
    slope_l = ma_l - ma_l.shift(slope_window)

    label = pd.Series(index=close.index, dtype="object", name="trend_regime")
    valid = ma_s.notna() & ma_l.notna() & slope_l.notna()

    is_up = (close > ma_l) & (ma_s > ma_l) & (slope_l > 0)
    is_dn = (close < ma_l) & (ma_s < ma_l) & (slope_l < 0)

    label[valid] = "sideways"
    label[valid & is_up] = "up"
    label[valid & is_dn] = "down"
    return label
