"""Tests for the Yahoo price layer. No network: a fake downloader returns yfinance-shaped frames."""
from __future__ import annotations

import datetime as dt

import pandas as pd
import pytest

from tools.investability_monitor import prices as P

DAYS = ["2026-10-15", "2026-10-16", "2026-10-19"]


def block(close, volume=None, split=None) -> dict:
    n = len(close)
    return {
        "Open": close, "High": close, "Low": close, "Close": close, "Adj Close": close,
        "Volume": volume or [1000.0] * n, "Dividends": [0.0] * n, "Stock Splits": split or [0.0] * n,
    }


def yf_frame(blocks: dict[str, dict], days=DAYS, tz: str | None = None) -> pd.DataFrame:
    """Shaped like yf.download(..., group_by="ticker", actions=True): (ticker, field) columns."""
    idx = pd.DatetimeIndex(pd.to_datetime(days))
    if tz:
        idx = idx.tz_localize(tz)
    return pd.DataFrame({(sym, f): v for sym, fields in blocks.items() for f, v in fields.items()}, index=idx)


class TestToLong:
    def test_rows_per_stock_day(self):
        raw = yf_frame({"AAAA.JK": block([1000.0, 850.0, 795.0]),
                        "BBBB.JK": block([50.0, 50.0, 51.0], split=[0.0, 2.0, 0.0])})
        df = P.to_long(raw, ["AAAA.JK", "BBBB.JK", "ZZZZ.JK"])
        assert list(df.columns) == P.COLUMNS
        assert sorted(df["code"].unique()) == ["AAAA", "BBBB"]  # no ".JK", unknown symbol skipped
        assert len(df) == 6
        assert df.loc[(df["code"] == "BBBB") & (df["date"] == "2026-10-16"), "split"].item() == 2.0

    def test_days_without_a_close_are_dropped(self):
        raw = yf_frame({"AAAA.JK": block([1000.0, float("nan"), 795.0])})
        assert len(P.to_long(raw, ["AAAA.JK"])) == 2

    def test_timezone_aware_index(self):
        raw = yf_frame({"AAAA.JK": block([1000.0, 850.0, 795.0])}, tz="Asia/Jakarta")
        df = P.to_long(raw, ["AAAA.JK"])
        assert df["date"].dt.tz is None
        assert df["date"].min() == pd.Timestamp("2026-10-15")

    def test_single_symbol_without_multiindex(self):
        raw = pd.DataFrame(block([1000.0, 850.0, 795.0]), index=pd.to_datetime(DAYS))
        df = P.to_long(raw, ["AAAA.JK"])
        assert list(df["code"].unique()) == ["AAAA"] and len(df) == 3

    def test_nothing_returned(self):
        assert P.to_long(pd.DataFrame(), ["AAAA.JK"]).empty
        assert P.to_long(None, ["AAAA.JK"]).empty


class TestFetch:
    def test_chunks_pause_and_missing_codes(self):
        calls, sleeps = [], []

        def downloader(symbols, start, end):
            calls.append((list(symbols), start, end))
            return yf_frame({s: block([1000.0, 850.0, 795.0]) for s in symbols if s != "CCCC.JK"})

        df, missing = P.fetch(["BBBB", "AAAA", "CCCC", "AAAA"], dt.date(2026, 10, 15), dt.date(2026, 10, 16),
                              downloader=downloader, chunk=2, pause_s=1.5, sleep=sleeps.append)
        assert [c[0] for c in calls] == [["AAAA.JK", "BBBB.JK"], ["CCCC.JK"]]
        assert calls[0][1:] == ("2026-10-15", "2026-10-17")  # Yahoo's end date is exclusive
        assert sleeps == [1.5]
        assert missing == ["CCCC"]
        assert df["date"].max() == pd.Timestamp("2026-10-16")  # trimmed to the asked range
        assert len(df) == 4


class TestCache:
    def frame(self, closes: dict[str, list[float]], days=DAYS) -> pd.DataFrame:
        raw = yf_frame({f"{c}.JK": block(v) for c, v in closes.items()}, days=days)
        return P.to_long(raw, [f"{c}.JK" for c in closes])

    def test_round_trip(self, tmp_path):
        df = self.frame({"AAAA": [1000.0, 850.0, 795.0], "BBBB": [50.0, 50.0, 51.0]})
        P.write_cache(df, tmp_path)
        back = P.read_cache(tmp_path, dt.date(2026, 10, 1), dt.date(2026, 10, 31))
        pd.testing.assert_frame_equal(back, df, check_dtype=False)

    def test_fetched_stocks_replace_their_rows_and_others_stay(self, tmp_path):
        P.write_cache(self.frame({"AAAA": [1000.0, 850.0, 795.0], "BBBB": [50.0, 50.0, 51.0]}), tmp_path)
        P.write_cache(self.frame({"AAAA": [1.0, 2.0, 3.0]}), tmp_path)
        back = P.read_cache(tmp_path, dt.date(2026, 10, 1), dt.date(2026, 10, 31))
        assert list(back.loc[back["code"] == "AAAA", "close"]) == [1.0, 2.0, 3.0]
        assert list(back.loc[back["code"] == "BBBB", "close"]) == [50.0, 50.0, 51.0]

    def test_one_file_per_month_and_reads_across_months(self, tmp_path):
        df = self.frame({"AAAA": [1000.0, 850.0, 795.0]}, days=["2026-09-30", "2026-10-01", "2026-11-02"])
        paths = P.write_cache(df, tmp_path)
        assert sorted(p.name for p in paths) == ["2026-09.csv.gz", "2026-10.csv.gz", "2026-11.csv.gz"]
        assert len(P.read_cache(tmp_path, dt.date(2026, 10, 1), dt.date(2026, 11, 30))) == 2

    def test_files_are_deterministic(self, tmp_path):
        df = self.frame({"AAAA": [1000.0, 850.0, 795.0]})
        a, b = P.write_cache(df, tmp_path / "a")[0], P.write_cache(df, tmp_path / "b")[0]
        assert a.read_bytes() == b.read_bytes()

    def test_empty_cache_reads_empty(self, tmp_path):
        assert P.read_cache(tmp_path, dt.date(2026, 1, 1), dt.date(2026, 1, 31)).empty


def test_clean_keeps_one_row_per_stock_day():
    df = pd.DataFrame({"date": pd.to_datetime(["2026-10-15", "2026-10-15", "2026-10-16", "2026-10-19"]),
                       "code": ["AAAA"] * 4, "open": 1.0, "high": 1.0, "low": 1.0,
                       "close": [1000.0, 1005.0, 0.0, float("nan")], "volume": [1.0, 2.0, 3.0, None], "split": 0.0})
    out = P.clean(df)
    assert len(out) == 1 and out["close"].item() == 1005.0  # last duplicate kept, zero and missing closes dropped
