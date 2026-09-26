"""Data access and cleaning.

Primary source: yfinance (a community scraper of Yahoo Finance, not an official API).
Fallback: Stooq CSV download (no API key).

This is the only file that knows where prices come from. Swapping in another
source, or a direct IDX feed later, only touches this module.
"""
from __future__ import annotations

import datetime as dt
import sys
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

# Five years of baseline for the volatility cut points plus a buffer for the
# 21-day vol window. A symbol with less history fails fast with a clear message
# instead of dying later with "0 rows after warmup".
MIN_ROWS = 252 * 5 + 30


def _ensure_min_rows(df: pd.DataFrame, symbol: str, source: str) -> pd.DataFrame:
    if len(df) < MIN_ROWS:
        raise ValueError(
            f"{symbol}: {source} returned only {len(df)} rows after cleaning, need >= {MIN_ROWS}"
        )
    return df


def _fetch_yfinance(symbol: str, start: str) -> pd.DataFrame:
    import yfinance as yf

    end = dt.date.today() + dt.timedelta(days=1)
    raw = yf.download(
        symbol,
        start=start,
        end=end.isoformat(),
        progress=False,
        # Split and dividend adjusted close. No effect on indices or FX, but it
        # matters for single stocks: an unadjusted split shows up as a fake crash
        # and would corrupt both signals.
        auto_adjust=True,
        actions=False,
    )
    if raw is None or raw.empty:
        raise ValueError(f"yfinance returned nothing for {symbol}")

    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)

    df = raw.rename(columns=str.lower)[["open", "high", "low", "close", "volume"]]
    df = df.sort_index().dropna(subset=["close"])
    df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
    df.index.name = "date"
    return _ensure_min_rows(df, symbol, "yfinance")


def _fetch_stooq(symbol: str, start: str, stooq_symbol: str | None = None) -> pd.DataFrame:
    """Stooq daily CSV: https://stooq.com/q/d/l/?s=<symbol>&i=d

    Stooq's symbols often differ from Yahoo's (S&P 500 is ^spx, USD/IDR is
    usdidr), so Ticker.stooq overrides the default of symbol.lower(). The
    mapping for ^JKSE has not been checked against Stooq.
    """
    sym = stooq_symbol or symbol.lower()
    url = f"https://stooq.com/q/d/l/?s={sym}&i=d"
    try:
        raw = pd.read_csv(url)
    except Exception as e:
        raise ValueError(f"Stooq download failed for {symbol} ({sym}): {e}") from e

    if raw.empty or "Date" not in raw.columns or "Close" not in raw.columns:
        raise ValueError(f"Stooq returned no usable data for {symbol} ({sym})")

    raw.columns = [c.lower() for c in raw.columns]
    raw["date"] = pd.to_datetime(raw["date"]).dt.normalize()
    df = raw.set_index("date").sort_index()
    if "volume" not in df.columns:  # Stooq often has no volume for indices and FX
        df["volume"] = 0
    df = df[["open", "high", "low", "close", "volume"]].dropna(subset=["close"])
    df = df[df.index >= pd.Timestamp(start)]
    df.index.name = "date"
    return _ensure_min_rows(df, symbol, "stooq")


def fetch_prices(symbol: str, start: str = "2000-01-01", stooq_symbol: str | None = None) -> pd.DataFrame:
    """Daily OHLCV from `start` to today. yfinance first, Stooq if that fails.

    Returns a DataFrame indexed by a tz-naive daily DatetimeIndex with columns
    open, high, low, close, volume. Raises ValueError with both error messages
    if both sources fail.
    """
    errors: list[str] = []
    attempts = [
        ("yfinance", lambda: _fetch_yfinance(symbol, start)),
        ("stooq", lambda: _fetch_stooq(symbol, start, stooq_symbol)),
    ]
    for name, fn in attempts:
        try:
            df = fn()
            print(f"  · {symbol}: {name} ok ({len(df)} rows)", file=sys.stderr)
            return df
        except Exception as e:
            errors.append(f"{name}: {type(e).__name__}: {e}")
            print(f"  · {symbol}: {name} failed: {errors[-1]}", file=sys.stderr)

    raise ValueError(f"All data sources failed for {symbol}:\n  - " + "\n  - ".join(errors))


def rolling_median_outliers(
    close: pd.Series, window: int = 10, n_mad: float = 6.0, floor: float = 0.10
) -> pd.Series:
    """True where a close sits implausibly far from the prices around it.

    Compares each log close with the median of the `window` days on either side
    (21 days in total). A day is flagged when its distance from that median is
    larger than both `floor` and `n_mad` robust standard deviations (1.4826 x the
    median absolute deviation over the same window). The MAD term raises the bar
    in turbulent months, which is what keeps real crash days such as IHSG on
    8 Oct 2008 or 8 Jun 2026 from being flagged. The floor keeps the filter from
    firing on ordinary moves in calm months, when the MAD is tiny.

    This catches what a one-day reversal check misses: a wrong value that
    persists for a few days or keeps coming back, like USD/IDR at 9,612.45 on
    six days in late 2013. It looks at days after t, so it revises history as
    new data arrives. That is data correction, like a vendor fixing a bad tick,
    and it never feeds future prices into the signal rules themselves.
    """
    x = np.log(close)
    w = 2 * window + 1
    med = x.rolling(w, center=True, min_periods=window + 1).median()
    dev = (x - med).abs()
    mad = dev.rolling(w, center=True, min_periods=window + 1).median() * 1.4826
    return (dev > np.maximum(floor, n_mad * mad)).fillna(False)


def clean_prices(
    df: pd.DataFrame,
    tz: str | None = None,
    close_time: str | None = None,
    now: dt.datetime | None = None,
    bad_print_floor: float = 0.10,
) -> tuple[pd.DataFrame, list[str]]:
    """Remove rows that would produce a wrong label. Returns (clean_df, notes).

    1. Duplicate dates, non-positive closes, and weekend bars. No market we track
       trades on Saturday or Sunday; Yahoo sometimes emits a weekend FX bar anyway.
    2. An unfinished bar. If the build runs while the exchange is open (a manual
       run, or a push during the IDX session), Yahoo returns today's intraday
       price as if it were a close. Needs `tz` and `close_time`; FX has no
       session close and is left alone.
    3. Bad prints, via rolling_median_outliers() with `bad_print_floor`.
    """
    notes: list[str] = []
    out = df[~df.index.duplicated(keep="last")].sort_index()
    out = out[out["close"] > 0]

    weekend = out.index.dayofweek >= 5
    if weekend.any():
        notes.append("dropped weekend bars " + ", ".join(d.strftime("%Y-%m-%d") for d in out.index[weekend]))
        out = out[~weekend]

    if tz and close_time and len(out):
        now_utc = now or dt.datetime.now(dt.timezone.utc)
        if now_utc.tzinfo is None:
            raise ValueError("now must be timezone-aware")
        local = now_utc.astimezone(ZoneInfo(tz))
        hh, mm = (int(x) for x in close_time.split(":"))
        last = out.index[-1].date()
        session_over = local.time() >= dt.time(hh, mm)
        if last > local.date() or (last == local.date() and not session_over):
            notes.append(f"dropped unfinished bar {last.isoformat()}")
            out = out.iloc[:-1]

    bad = rolling_median_outliers(out["close"], floor=bad_print_floor)
    if bad.any():
        notes.append("dropped bad prints " + ", ".join(d.strftime("%Y-%m-%d") for d in out.index[bad.to_numpy()]))
        out = out[~bad.to_numpy()]

    return out, notes


def daily_log_returns(prices: pd.DataFrame) -> pd.Series:
    """Close-to-close log returns, first NaN dropped.

    Log returns add up over time and are the standard input for realized vol.
    """
    return np.log(prices["close"]).diff().dropna().rename("log_return")
