"""Layer akses data — dengan fallback chain.

Sumber utama: yfinance (Yahoo Finance, community scraper).
Fallback:     Stooq (CSV download, no API key, lebih stabil tapi coverage lebih sempit).

Kalau yfinance succeed, hasilnya dipakai. Kalau gagal (network, rate limit,
Yahoo ubah schema, dll), otomatis coba Stooq. Kalau dua-duanya gagal, raise
ValueError dengan detail kedua failure-nya.

`data.py` sengaja jadi satu-satunya file yang tahu soal sumber data — kalau
nanti mau tambah EOD Historical Data atau langsung IDX feed, perubahan
terisolasi di sini.
"""
from __future__ import annotations

import datetime as dt
import logging
import sys

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

MIN_ROWS = 252 * 5 + 30  # Sejajar dengan quantile_lookback default (5y) + vol_window buffer.
                         # Kalau ticker punya history kurang dari ini, fetch gagal cepat dengan
                         # error message jelas — daripada lolos lalu mati di "0 rows after warmup".


def _ensure_min_rows(df: pd.DataFrame, symbol: str, source: str) -> pd.DataFrame:
    if len(df) < MIN_ROWS:
        raise ValueError(
            f"{symbol}: {source} returned only {len(df)} rows after cleaning, need >= {MIN_ROWS}"
        )
    return df


def _yahoo_to_stooq_symbol(symbol: str) -> str:
    """Translate Yahoo Finance symbol → Stooq convention.

    Examples:
        ^JKSE   -> ^jkse
        BBCA.JK -> bbca.jk
    Stooq pakai lowercase, suffix .jk untuk IDX stocks (sama dengan Yahoo), ^prefix
    untuk indeks (sama dengan Yahoo).
    """
    return symbol.lower()


def _fetch_yfinance(symbol: str, lookback_years: int) -> pd.DataFrame:
    """Fetch via yfinance. Raise on failure (apa pun bentuknya)."""
    import yfinance as yf

    end = dt.date.today()
    start = end - dt.timedelta(days=int(lookback_years * 365.25) + 5)

    raw = yf.download(
        symbol,
        start=start.isoformat(),
        end=(end + dt.timedelta(days=1)).isoformat(),
        progress=False,
        # auto_adjust=True menerapkan split + dividend adjustment ke 'close'. Untuk indeks
        # tidak ada efeknya (no splits/divs), TAPI critical kalau universe nanti ekspansi
        # ke individual IDX stocks (BBCA punya split historis, kalau raw close ada
        # jump artificial yang bakal corrupt trend signal).
        auto_adjust=True,
        actions=False,
    )
    if raw is None or raw.empty:
        raise ValueError(f"yfinance empty for {symbol}")

    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)

    df = raw.rename(columns=str.lower)[["open", "high", "low", "close", "volume"]]
    df = df.sort_index().dropna(subset=["close"])
    df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
    df.index.name = "date"
    return _ensure_min_rows(df, symbol, "yfinance")


def _fetch_stooq(symbol: str, lookback_years: int) -> pd.DataFrame:
    """Fetch via Stooq CSV download. Raise on failure.

    Stooq tidak butuh API key. Format URL:
        https://stooq.com/q/d/l/?s=<symbol>&i=d
    Response: CSV dengan kolom Date, Open, High, Low, Close, Volume.
    Atau plaintext "No data" / HTML kalau symbol tidak dikenal.
    """
    stooq_sym = _yahoo_to_stooq_symbol(symbol)
    url = f"https://stooq.com/q/d/l/?s={stooq_sym}&i=d"

    try:
        raw = pd.read_csv(url)
    except Exception as e:
        raise ValueError(f"Stooq read_csv failed for {symbol} ({stooq_sym}): {e}")

    if raw.empty or "Date" not in raw.columns or "Close" not in raw.columns:
        raise ValueError(f"Stooq returned no usable data for {symbol} ({stooq_sym})")

    raw.columns = [c.lower() for c in raw.columns]
    raw["date"] = pd.to_datetime(raw["date"]).dt.normalize()
    df = raw.set_index("date").sort_index()
    # Stooq kadang tidak punya volume untuk indeks → fill 0 supaya schema konsisten
    if "volume" not in df.columns:
        df["volume"] = 0
    df = df[["open", "high", "low", "close", "volume"]].dropna(subset=["close"])

    # Cut ke lookback yang diminta (Stooq return seluruh history kalau tidak di-cap)
    cutoff = pd.Timestamp(dt.date.today() - dt.timedelta(days=int(lookback_years * 365.25) + 5))
    df = df[df.index >= cutoff]

    df.index.name = "date"
    return _ensure_min_rows(df, symbol, "stooq")


def fetch_prices(symbol: str, lookback_years: int = 10) -> pd.DataFrame:
    """Ambil daily OHLCV — yfinance primary, Stooq fallback.

    Args:
        symbol: Yahoo Finance ticker (mis. "^JKSE", "BBCA.JK"). Stooq dapat
                translasi otomatis.
        lookback_years: berapa tahun ke belakang yang di-fetch.

    Returns:
        DataFrame ber-index DatetimeIndex (timezone-naive, daily), kolom:
            open, high, low, close, volume.

    Raises:
        ValueError: kalau kedua sumber gagal. Message berisi detail keduanya.
    """
    errors: list[str] = []
    for fetcher_name, fn in [("yfinance", _fetch_yfinance), ("stooq", _fetch_stooq)]:
        try:
            df = fn(symbol, lookback_years)
            print(f"  · {symbol}: {fetcher_name} ok ({len(df)} rows)", file=sys.stderr)
            return df
        except Exception as e:
            errors.append(f"{fetcher_name}: {type(e).__name__}: {e}")
            print(f"  · {symbol}: {fetcher_name} failed → {errors[-1]}", file=sys.stderr)

    raise ValueError(
        f"All data sources failed for {symbol}. Details:\n  - " + "\n  - ".join(errors)
    )


def daily_log_returns(prices: pd.DataFrame) -> pd.Series:
    """Log-return close-to-close. NaN pertama di-drop.

    Pakai log return (bukan simple return) karena: (a) additive across waktu,
    (b) lebih simetris around zero, (c) standar di literature realized vol.
    """
    return np.log(prices["close"]).diff().dropna().rename("log_return")
