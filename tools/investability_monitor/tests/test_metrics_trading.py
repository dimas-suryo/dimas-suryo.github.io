"""Tests for the trading-quality measures. Limits come from the real rulebook."""
from __future__ import annotations

import pandas as pd
import pytest

from tools.investability_monitor import rules
from tools.investability_monitor.metrics_trading import monthly, prepare, turnover_share
from tools.investability_monitor.prices import COLUMNS


def px(rows: list[tuple]) -> pd.DataFrame:
    """rows: (code, date, close[, volume[, split]])."""
    full = [(r + (1000.0, 0.0))[:5] if len(r) == 3 else (r + (0.0,))[:5] if len(r) == 4 else r for r in rows]
    df = pd.DataFrame(full, columns=["code", "date", "close", "volume", "split"])
    df["date"] = pd.to_datetime(df["date"])
    for c in ("open", "high", "low"):
        df[c] = df["close"]
    return df[COLUMNS]


# Yahoo-like: HHHH's pre-split closes are already rescaled (1000 -> 500, 1010 -> 505).
ROWS = [
    ("AAAA", "2026-10-15", 1000.0), ("AAAA", "2026-10-16", 850.0),            # 15% lower limit hit
    ("BBBB", "2026-10-16", 1000.0), ("BBBB", "2026-10-19", 930.0),            # 7% lower limit hit
    ("CCCC", "2026-10-19", 1000.0), ("CCCC", "2026-10-20", 1250.0),           # 25% upper limit hit
    ("DDDD", "2026-10-19", 1000.0), ("DDDD", "2026-10-20", 960.0),            # inside the band
    ("EEEE", "2026-11-05", 1000.0), ("EEEE", "2026-11-06", 900.0),            # special monitoring, 10%
    ("FFFF", "2026-10-19", 1000.0), ("FFFF", "2026-10-20", 700.0),            # beyond the limit: excluded
    ("GGGG", "2026-10-19", 1000.0), ("GGGG", "2026-10-20", 1000.0, 0.0),      # no trades: excluded
    ("HHHH", "2026-10-14", 500.0), ("HHHH", "2026-10-15", 505.0), ("HHHH", "2026-10-16", 505.0, 1000.0, 2.0),
]
BOARDS = {"EEEE": "special_monitoring"}


@pytest.fixture(scope="module")
def prepared() -> pd.DataFrame:
    return prepare(px(ROWS), BOARDS)


def row(df: pd.DataFrame, code: str, date: str) -> pd.Series:
    return df[(df["code"] == code) & (df["date"] == pd.Timestamp(date))].iloc[0]


class TestPrepare:
    def test_limits_follow_the_rulebook_by_date(self, prepared):
        a, b = row(prepared, "AAAA", "2026-10-16"), row(prepared, "BBBB", "2026-10-19")
        assert (a["lower"], a["upper"]) == rules.price_limits("2026-10-16", 1000, "main") == (850.0, 1250.0)
        assert (b["lower"], b["upper"]) == (930.0, 1250.0)  # the 7% lower limit from 19 Oct
        assert a["at_lower"] and b["at_lower"] and not a["at_upper"]

    def test_upper_hit_and_no_hit(self, prepared):
        assert row(prepared, "CCCC", "2026-10-20")["at_upper"]
        d = row(prepared, "DDDD", "2026-10-20")
        assert not d["at_lower"] and not d["at_upper"] and d["limit_usable"]
        assert d["ret"] == pytest.approx(-0.04)

    def test_board_changes_the_limits(self, prepared):
        e = row(prepared, "EEEE", "2026-11-06")
        assert (e["lower"], e["upper"]) == (900.0, 1100.0) and e["at_lower"]

    def test_beyond_the_limits_is_excluded(self, prepared):
        f = row(prepared, "FFFF", "2026-10-20")
        assert f["outside"] and not f["usable"] and not f["limit_usable"]

    def test_no_trades_excluded(self, prepared):
        assert not row(prepared, "GGGG", "2026-10-20")["usable"]

    def test_days_before_a_split_are_kept_out_of_limit_counts(self, prepared):
        before, on = row(prepared, "HHHH", "2026-10-15"), row(prepared, "HHHH", "2026-10-16")
        assert before["adjusted"] and before["usable"] and not before["limit_usable"]
        assert not on["adjusted"] and on["limit_usable"]

    def test_first_day_of_each_stock_has_no_previous_close(self, prepared):
        first = prepared.groupby("code").head(1)
        assert first["prev_close"].isna().all() and not first["usable"].any()

    def test_reference_below_the_board_minimum_leaves_limits_unknown(self):
        df = prepare(px([("IIII", "2026-08-31", 40.0), ("IIII", "2026-09-01", 41.0)]))
        r = row(df, "IIII", "2026-09-01")
        assert pd.isna(r["lower"]) and r["usable"] and not r["limit_usable"]

    def test_a_date_without_a_rule_stops_the_build(self):
        with pytest.raises(rules.RuleGapError):
            prepare(px([("JJJJ", "2026-12-30", 1000.0), ("JJJJ", "2027-01-04", 1000.0)]))


class TestMonthly:
    def test_limit_hit_rates(self, prepared):
        m = monthly(prepared)
        oct_, nov = m.loc[pd.Period("2026-10", "M")], m.loc[pd.Period("2026-11", "M")]
        # October: AAAA, BBBB, CCCC, DDDD and HHHH on the split day; three of them at a limit.
        assert oct_["stock_days"] == 5
        assert oct_["limit_hit_rate"] == pytest.approx(0.6)
        assert oct_["lower_hit_rate"] == pytest.approx(0.4) and oct_["upper_hit_rate"] == pytest.approx(0.2)
        assert nov["stock_days"] == 1 and nov["limit_hit_rate"] == 1.0

    def test_amihud_and_value(self, prepared):
        m = monthly(prepared, ["DDDD"], min_days=1).loc[pd.Period("2026-10", "M")]
        assert m["amihud_median"] == pytest.approx(0.04 / (960 * 1000 / 1e9))
        assert m["value_bn"] == pytest.approx(960 * 1000 / 1e9)

    def test_too_few_days_leave_amihud_empty(self, prepared):
        assert pd.isna(monthly(prepared, ["DDDD"]).loc[pd.Period("2026-10", "M"), "amihud_median"])


def test_turnover_share(prepared):
    share = turnover_share(prepared, ["AAAA"])
    # Usable October value: AAAA 850k, BBBB 930k, CCCC 1,250k, DDDD 960k, HHHH 505k twice = 5,000k.
    assert share.loc[pd.Period("2026-10", "M")] == pytest.approx(850 / 5000)
    assert share.loc[pd.Period("2026-11", "M")] == 0.0
