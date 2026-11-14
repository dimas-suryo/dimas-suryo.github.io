"""Daily prices and volume for IDX stocks, from Yahoo Finance.

IDX refuses automated clients (Phase 0, 9 and 14 Nov 2026), so the monitor
takes daily OHLCV from Yahoo, the same source Regime Radar uses. With
auto_adjust=False Yahoo's Close is the traded close, adjusted only for splits.
Split days are flagged so the metrics can leave them out: a split shows up as a
fake jump, and earlier prices no longer sit on IDX's tick grid.

Known gaps, which the page states:
- no delisted stocks, so history covers today's listings only (survivorship);
- no foreign flows, board codes or index free-float shares;
- no traded value, so value is approximated as close x volume.

The raw cache holds one deterministic gzipped CSV per month under
<data dir>/yahoo/YYYY/YYYY-MM.csv.gz. Writing a month replaces the rows of the
stocks just fetched and keeps everyone else's.
"""
from __future__ import annotations

import datetime as dt
import gzip
import io
import os
import tempfile
import time
from pathlib import Path
from typing import Callable

import pandas as pd

from .paths import yahoo_dir

COLUMNS = ["date", "code", "open", "high", "low", "close", "volume", "split"]
PRICE_COLUMNS = ["open", "high", "low", "close"]
DEFAULT_CHUNK = 50  # symbols per Yahoo request
DEFAULT_PAUSE_S = 2.0  # between requests, to stay well clear of Yahoo's rate limit

Downloader = Callable[[list[str], str, str], pd.DataFrame]


def yahoo_symbol(code: str) -> str:
    return f"{code}.JK"


def _code(symbol: str) -> str:
    return symbol[:-3] if symbol.endswith(".JK") else symbol


def _yf_download(symbols: list[str], start: str, end: str) -> pd.DataFrame:
    import yfinance as yf

    return yf.download(
        symbols,
        start=start,
        end=end,
        progress=False,
        auto_adjust=False,  # traded closes; the metrics need IDX's tick grid
        actions=True,  # brings the "Stock Splits" column
        group_by="ticker",
        threads=True,
    )


def empty() -> pd.DataFrame:
    return pd.DataFrame({c: pd.Series(dtype="datetime64[ns]" if c == "date" else ("object" if c == "code" else float))
                         for c in COLUMNS})


def to_long(raw: pd.DataFrame | None, symbols: list[str]) -> pd.DataFrame:
    """yfinance's wide frame (one column block per ticker) to one row per stock-day."""
    if raw is None or raw.empty:
        return empty()
    multi = isinstance(raw.columns, pd.MultiIndex)
    frames = []
    for sym in symbols:
        if multi:
            if sym not in raw.columns.get_level_values(0):
                continue
            sub = raw[sym]
        elif len(symbols) == 1:
            sub = raw
        else:
            raise ValueError("several symbols asked for, but Yahoo returned one block of columns")
        sub = sub.rename(columns=lambda c: str(c).strip().lower())
        if not set(PRICE_COLUMNS + ["volume"]) <= set(sub.columns):
            continue
        idx = pd.DatetimeIndex(sub.index)
        if idx.tz is not None:
            idx = idx.tz_localize(None)
        out = pd.DataFrame(
            {
                "date": idx.normalize(),
                "code": _code(sym),
                **{c: pd.to_numeric(sub[c], errors="coerce").to_numpy(dtype=float) for c in PRICE_COLUMNS},
                "volume": pd.to_numeric(sub["volume"], errors="coerce").fillna(0).to_numpy(dtype=float),
                "split": (pd.to_numeric(sub["stock splits"], errors="coerce").fillna(0).to_numpy(dtype=float)
                          if "stock splits" in sub.columns else 0.0),
            }
        )
        frames.append(out)
    if not frames:
        return empty()
    return clean(pd.concat(frames, ignore_index=True))


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Drop rows without a positive close, keep one row per stock-day, sort."""
    df = df[df["close"].notna() & (df["close"] > 0)].copy()
    df["volume"] = df["volume"].fillna(0).clip(lower=0)
    df["split"] = df["split"].fillna(0)
    df = df.drop_duplicates(["code", "date"], keep="last")
    return df[COLUMNS].sort_values(["code", "date"], kind="stable").reset_index(drop=True)


def fetch(
    codes: list[str],
    start: dt.date,
    end: dt.date,
    *,
    downloader: Downloader = _yf_download,
    chunk: int = DEFAULT_CHUNK,
    pause_s: float = DEFAULT_PAUSE_S,
    sleep: Callable[[float], None] = time.sleep,
) -> tuple[pd.DataFrame, list[str]]:
    """Daily rows for `codes` from `start` to `end` inclusive, plus the codes Yahoo had nothing for."""
    codes = sorted(dict.fromkeys(codes))
    frames = []
    yahoo_end = (end + dt.timedelta(days=1)).isoformat()  # Yahoo's end is exclusive
    for i in range(0, len(codes), chunk):
        if i:
            sleep(pause_s)
        symbols = [yahoo_symbol(c) for c in codes[i:i + chunk]]
        frames.append(to_long(downloader(symbols, start.isoformat(), yahoo_end), symbols))
    frames = [f for f in frames if not f.empty]
    df = clean(pd.concat(frames, ignore_index=True)) if frames else empty()
    df = df[(df["date"] >= pd.Timestamp(start)) & (df["date"] <= pd.Timestamp(end))].reset_index(drop=True)
    missing = sorted(set(codes) - set(df["code"]))
    return df, missing


# -- cache ------------------------------------------------------------------


def _month_path(root: Path, year: int, month: int) -> Path:
    return yahoo_dir(root) / f"{year:04d}" / f"{year:04d}-{month:02d}.csv.gz"


def _read_csv_gz(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={"code": str}, parse_dates=["date"])
    return df[COLUMNS]


def _write_csv_gz(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = df.to_csv(index=False, lineterminator="\n", date_format="%Y-%m-%d")
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp_", suffix=".csv.gz")
    try:
        # mtime=0: the same rows always give the same bytes, so the data repo
        # never records a change that is not one.
        with os.fdopen(fd, "wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as gz:
            gz.write(text.encode("utf-8"))
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise


def write_cache(df: pd.DataFrame, root: Path) -> list[Path]:
    """Merge `df` into the monthly files: its stocks' rows replace theirs, others stay."""
    written = []
    if df.empty:
        return written
    for (year, month), part in df.groupby([df["date"].dt.year, df["date"].dt.month]):
        path = _month_path(root, int(year), int(month))
        if path.exists():
            old = _read_csv_gz(path)
            part = pd.concat([old[~old["code"].isin(set(part["code"]))], part], ignore_index=True)
        _write_csv_gz(clean(part), path)
        written.append(path)
    return written


def read_cache(root: Path, start: dt.date, end: dt.date) -> pd.DataFrame:
    """Every cached row from `start` to `end` inclusive."""
    frames = []
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        path = _month_path(root, y, m)
        if path.exists():
            frames.append(_read_csv_gz(path))
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    if not frames:
        return empty()
    df = clean(pd.concat(frames, ignore_index=True))
    return df[(df["date"] >= pd.Timestamp(start)) & (df["date"] <= pd.Timestamp(end))].reset_index(drop=True)


def to_csv_text(df: pd.DataFrame) -> str:
    """The cache's CSV form, for tests and quick looks."""
    buf = io.StringIO()
    df.to_csv(buf, index=False, lineterminator="\n", date_format="%Y-%m-%d")
    return buf.getvalue()
