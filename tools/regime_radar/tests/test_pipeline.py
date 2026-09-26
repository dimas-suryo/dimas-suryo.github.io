"""Tests for the pieces added in the Sep 2026 revision: confirm(), stats,
price cleaning, and the build's partial-failure behaviour."""
from __future__ import annotations

import datetime as dt
import json

import numpy as np
import pandas as pd
import pytest

from tools.regime_radar import build as build_mod
from tools.regime_radar.build import _round_sig, build_payload, main, write_index, write_payload
from tools.regime_radar.data import clean_prices
from tools.regime_radar.signals import confirm, trailing_streak
from tools.regime_radar.stats import current_episode, episodes, forward_metrics, regime_table
from tools.regime_radar.universe import Ticker, safe_filename


def _bdates(n: int, start: str = "2016-01-04") -> pd.DatetimeIndex:
    return pd.bdate_range(start=start, periods=n)


def _labels(seq: list) -> pd.Series:
    return pd.Series(seq, index=_bdates(len(seq)), dtype="object")


def _prices(close: np.ndarray, start: str = "2016-01-04") -> pd.DataFrame:
    return pd.DataFrame(
        {"open": close, "high": close, "low": close, "close": close, "volume": 0},
        index=_bdates(len(close), start),
    )


def _random_prices(n: int, seed: int = 0, sigma: float = 0.012) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    return _prices(5000.0 * np.exp(np.cumsum(rng.normal(0.0003, sigma, n))))


# ============================================================
# confirm
# ============================================================

class TestConfirm:
    def test_days_one_is_identity(self):
        raw = _labels(["up", "down", "up", "sideways"])
        assert confirm(raw, 1).tolist() == raw.tolist()

    def test_switch_needs_n_consecutive_days(self):
        raw = _labels(["up", "up", "side", "up", "side", "side", "side", "side"])
        out = confirm(raw, 3).tolist()
        assert out == ["up", "up", "up", "up", "up", "up", "side", "side"]

    def test_two_other_labels_alternating_never_switch(self):
        raw = _labels(["mid", "high", "low", "high", "low", "high"])
        assert set(confirm(raw, 2).tolist()) == {"mid"}

    def test_nan_passes_through(self):
        raw = _labels([np.nan, np.nan, "up", "up"])
        out = confirm(raw, 2)
        assert out.iloc[:2].isna().all()
        assert out.iloc[2:].tolist() == ["up", "up"]

    def test_invalid_days_raises(self):
        with pytest.raises(ValueError):
            confirm(_labels(["up"]), 0)

    def test_no_run_shorter_than_n_except_first_and_last(self):
        rng = np.random.default_rng(3)
        raw = _labels(list(rng.choice(["low", "mid", "high"], size=2000, p=[0.45, 0.1, 0.45])))
        eps = episodes(confirm(raw, 3))
        inner = eps.iloc[1:-1]
        assert (inner["length"] >= 3).all()

    def test_no_lookahead(self):
        rng = np.random.default_rng(5)
        raw = _labels(list(rng.choice(["a", "b", "c"], size=1500)))
        short = confirm(raw.iloc[:1000], 3)
        full = confirm(raw, 3)
        assert short.tolist() == full.iloc[:1000].tolist()

    def test_trailing_streak(self):
        assert trailing_streak(_labels(["a", "b", "b", "b"])) == 3
        assert trailing_streak(_labels([np.nan, np.nan])) == 0


# ============================================================
# stats
# ============================================================

class TestStats:
    def test_episodes_basic(self):
        e = episodes(_labels(["a", "a", "b", "a", "a", "a"]))
        assert e["label"].tolist() == ["a", "b", "a"]
        assert e["length"].tolist() == [2, 1, 3]

    def test_episodes_empty(self):
        assert episodes(_labels([np.nan, np.nan])).empty

    def test_forward_return_exact(self):
        close = pd.Series([100.0, 110.0, 121.0, 133.1], index=_bdates(4))
        f = forward_metrics(close, horizon=2)
        assert f["fwd_return"].iloc[0] == pytest.approx(0.21)
        assert f["fwd_return"].iloc[1] == pytest.approx(0.21)
        assert f["fwd_return"].iloc[2:].isna().all()

    def test_forward_vol_uses_next_days_only(self):
        # Constant growth for 10 days, then a jump. Forward vol at day 0 over 5 days
        # must not see the jump; at day 6 it must.
        close = pd.Series(np.r_[100 * 1.01 ** np.arange(11), 200.0, 202.0], index=_bdates(13))
        f = forward_metrics(close, horizon=5)
        assert f["fwd_vol"].iloc[0] == pytest.approx(0.0, abs=1e-12)
        assert f["fwd_vol"].iloc[6] > 1.0

    def test_regime_table_shares_and_counts(self):
        lab = _labels(["up"] * 40 + ["down"] * 20 + ["up"] * 40)
        close = pd.Series(np.linspace(100, 200, 100), index=lab.index)
        rows = regime_table(lab, forward_metrics(close, 5), ["up", "sideways", "down"])
        by = {r["label"]: r for r in rows}
        assert by["up"]["days"] == 80 and by["up"]["episodes"] == 2
        assert by["down"]["episodes"] == 1 and by["down"]["median_length"] == 20
        assert by["sideways"]["days"] == 0 and by["sideways"]["median_return"] is None
        assert sum(r["share"] for r in rows) == pytest.approx(1.0)
        assert by["up"]["share_positive"] == 1.0

    def test_current_episode(self):
        start, n = current_episode(_labels(["a", "b", "b", "b"]))
        assert n == 3 and start == _bdates(4)[1].strftime("%Y-%m-%d")


# ============================================================
# clean_prices
# ============================================================

class TestCleanPrices:
    def _df(self, n=10, start="2026-09-21"):
        return _prices(np.linspace(100, 110, n), start)

    def test_drops_bar_during_session(self):
        df = self._df(5, "2026-09-21")  # Mon 21 .. Fri 25 Sep 2026
        now = dt.datetime(2026, 9, 25, 4, 0, tzinfo=dt.timezone.utc)  # 11:00 WIB Friday
        out, notes = clean_prices(df, tz="Asia/Jakarta", close_time="16:30", now=now)
        assert len(out) == 4 and notes

    def test_keeps_bar_after_close(self):
        df = self._df(5, "2026-09-21")
        now = dt.datetime(2026, 9, 25, 22, 30, tzinfo=dt.timezone.utc)  # 05:30 WIB Saturday
        out, notes = clean_prices(df, tz="Asia/Jakarta", close_time="16:30", now=now)
        assert len(out) == 5 and not notes

    def test_no_tz_means_no_session_check(self):
        df = self._df(5, "2026-09-21")
        now = dt.datetime(2026, 9, 25, 4, 0, tzinfo=dt.timezone.utc)
        out, _ = clean_prices(df, now=now)
        assert len(out) == 5

    def test_naive_now_rejected(self):
        with pytest.raises(ValueError):
            clean_prices(self._df(), tz="Asia/Jakarta", close_time="16:30", now=dt.datetime(2026, 9, 25))

    def test_removes_isolated_spike(self):
        close = np.full(40, 100.0)
        close[20] = 1000.0  # bad tick, back to 100 the next day
        out, notes = clean_prices(_prices(close))
        assert len(out) == 39 and out["close"].max() == 100.0 and notes

    def test_keeps_real_crash(self):
        close = np.r_[np.full(30, 100.0), np.full(30, 80.0)]  # -22% and it stays there
        out, _ = clean_prices(_prices(close))
        assert len(out) == 60

    def test_duplicates_and_nonpositive(self):
        df = self._df(5)
        df = pd.concat([df, df.iloc[[2]]])
        df.iloc[0, df.columns.get_loc("close")] = 0.0
        out, _ = clean_prices(df)
        assert out.index.is_unique and (out["close"] > 0).all()


# ============================================================
# build: payload, rounding, index, partial failure
# ============================================================

class TestBuild:
    @pytest.fixture
    def payload(self):
        return build_payload(Ticker("^TEST", "Test", "index"), prices=_random_prices(252 * 8, seed=9))

    def test_series_alignment_with_new_columns(self, payload):
        s = payload["series"]
        n = len(s["date"])
        for k in ("close", "ma_short", "ma_long", "realized_vol", "vol_lo", "vol_hi",
                  "vol_regime", "trend_regime"):
            assert len(s[k]) == n, k

    def test_cut_points_ordered(self, payload):
        s = payload["series"]
        assert all(lo <= hi for lo, hi in zip(s["vol_lo"], s["vol_hi"]))

    def test_latest_regime_age_matches_series(self, payload):
        s, l = payload["series"], payload["latest"]
        lab = s["trend_regime"]
        n = 0
        for v in reversed(lab):
            if v != lab[-1]:
                break
            n += 1
        assert l["trend_days"] == n
        assert l["trend_since"] == s["date"][-n]

    def test_pending_is_consistent(self, payload):
        l = payload["latest"]
        for sig in ("trend", "vol"):
            pend = l[f"{sig}_pending"]
            if l[f"{sig}_raw"] == l[f"{sig}_regime"]:
                assert pend is None
            else:
                assert pend["label"] == l[f"{sig}_raw"] and 1 <= pend["days"] < pend["needed"]

    def test_stats_shape(self, payload):
        st = payload["stats"]
        assert [r["label"] for r in st["trend"]] == ["up", "sideways", "down"]
        assert [r["label"] for r in st["vol"]] == ["low", "mid", "high"]
        assert sum(r["days"] for r in st["vol"]) == st["all"]["days"]
        json.dumps(st, allow_nan=False)  # raises if a NaN slipped in

    def test_whole_payload_is_strict_json(self, payload):
        json.dumps(payload, allow_nan=False)

    def test_round_sig(self):
        assert _round_sig(6241.89208984375) == 6241.89
        assert _round_sig(1.0823456) == 1.08235
        assert _round_sig(float("nan")) is None
        assert _round_sig(0) == 0.0

    def test_safe_filename(self):
        assert safe_filename("^JKSE") == "_JKSE"
        assert safe_filename("BBCA.JK") == "BBCA_JK"
        assert safe_filename("IDR=X") == "IDR_X"

    def test_index_lists_files_in_universe_order(self, payload, tmp_path):
        uni = [Ticker("^B", "B", "index"), Ticker("^TEST", "Test", "index")]
        write_payload(payload, tmp_path)
        idx = json.loads(write_index(tmp_path, uni).read_text())
        assert [t["symbol"] for t in idx["tickers"]] == ["^TEST"]  # ^B has no file
        assert idx["tickers"][0]["latest"]["trend_regime"] == payload["latest"]["trend_regime"]
        assert "generated_at" not in idx  # stable file when nothing changed

    def test_partial_failure_writes_the_rest_and_exits_1(self, tmp_path, monkeypatch):
        good = _random_prices(252 * 8, seed=1)

        def fake_fetch(symbol, start, stooq_symbol=None):
            if symbol == "^BAD":
                raise ValueError("boom")
            return good

        monkeypatch.setattr(build_mod, "fetch_prices", fake_fetch)
        uni = [Ticker("^BAD", "Bad", "index"), Ticker("^OK", "Ok", "index")]
        code = main(universe=uni, out_dir=tmp_path)
        assert code == 1
        assert (tmp_path / "_OK.json").exists() and not (tmp_path / "_BAD.json").exists()
        idx = json.loads((tmp_path / "index.json").read_text())
        assert [t["symbol"] for t in idx["tickers"]] == ["^OK"]


# ============================================================
# Bad-print filter on real price paths
# ============================================================

from tools.regime_radar.data import rolling_median_outliers  # noqa: E402
from tools.regime_radar.tests import fixtures_real as real  # noqa: E402
from tools.regime_radar.universe import UNIVERSE  # noqa: E402


def _series(rows):
    return pd.Series([c for _, c in rows], index=pd.to_datetime([d for d, _ in rows]))


def _flagged(rows, floor):
    s = _series(rows)
    return [d.strftime("%Y-%m-%d") for d in s.index[rolling_median_outliers(s, floor=floor).to_numpy()]]


FLOOR = {t.symbol: t.bad_print_floor for t in UNIVERSE}


class TestBadPrintsOnRealData:
    def test_usdidr_2013_stuck_quote_removed(self):
        got = _flagged(real.IDR_2013_STUCK_QUOTE, FLOOR["IDR=X"])
        assert got == ["2013-10-28", "2013-11-29", "2013-12-02", "2013-12-03", "2013-12-06", "2013-12-09"]

    def test_usdidr_boxing_day_2024_removed(self):
        assert _flagged(real.IDR_2024_BOXING_DAY, FLOOR["IDR=X"]) == ["2024-12-26"]

    def test_usdidr_2008_crisis_kept(self):
        assert _flagged(real.IDR_2008_CRISIS, FLOOR["IDR=X"]) == []

    def test_ihsg_2008_crash_kept(self):
        assert _flagged(real.JKSE_2008_CRASH, FLOOR["^JKSE"]) == []

    def test_ihsg_8_june_2026_kept(self):
        rows = real.JKSE_2026_JUNE
        assert ("2026-06-08", 5342.14) in rows
        assert _flagged(rows, FLOOR["^JKSE"]) == []

    def test_clean_prices_reports_what_it_dropped(self):
        s = _series(real.IDR_2013_STUCK_QUOTE)
        df = pd.DataFrame({"open": s, "high": s, "low": s, "close": s, "volume": 0})
        out, notes = clean_prices(df, bad_print_floor=FLOOR["IDR=X"])
        assert len(out) == len(df) - 6
        assert any("2013-12-09" in n for n in notes)
        assert out["close"].min() > 10000


class TestWeekendBars:
    def test_saturday_bar_dropped(self):
        idx = pd.DatetimeIndex(["2026-09-24", "2026-09-25", "2026-09-26"])  # Thu, Fri, Sat
        df = pd.DataFrame({"open": 1.0, "high": 1.0, "low": 1.0, "close": [17837.3, 17559.5, 17890.0], "volume": 0}, index=idx)
        out, notes = clean_prices(df)
        assert out.index[-1] == pd.Timestamp("2026-09-25")
        assert any("weekend" in n for n in notes)
