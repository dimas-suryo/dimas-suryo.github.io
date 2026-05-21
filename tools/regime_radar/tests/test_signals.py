"""Table-driven tests untuk signals.py.

Run:  pip install -r tools/regime_radar/requirements-dev.txt
      pytest tools/regime_radar/tests/ -v

Fokus: invariants yang KRITIS (no-lookahead, regime detection on controlled data).
Bukan exhaustive line-coverage.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from tools.regime_radar.signals import (
    realized_vol,
    trend_regime,
    vol_regime,
)


# ============================================================
# Helpers
# ============================================================

def _bdates(n: int, start: str = "2016-01-04") -> pd.DatetimeIndex:
    return pd.bdate_range(start=start, periods=n)


def _gbm_returns(n: int, mu: float, sigma: float, seed: int = 0) -> pd.Series:
    rng = np.random.default_rng(seed)
    return pd.Series(rng.normal(mu, sigma, n), index=_bdates(n))


def _prices_from_returns(returns: pd.Series, start_price: float = 100.0) -> pd.DataFrame:
    close = start_price * np.exp(np.cumsum(returns.values))
    return pd.DataFrame(
        {"open": close, "high": close, "low": close, "close": close, "volume": 0},
        index=returns.index,
    )


# ============================================================
# realized_vol
# ============================================================

class TestRealizedVol:
    def test_zero_returns_zero_vol(self):
        returns = pd.Series(np.zeros(100), index=_bdates(100))
        rv = realized_vol(returns, window=21)
        assert (rv.dropna() == 0).all()

    def test_constant_sigma_matches_input(self):
        """Realized vol dari sample sigma=0.01 daily harus close ke 0.01*sqrt(252) ≈ 0.159."""
        returns = _gbm_returns(1000, mu=0.0, sigma=0.01, seed=1)
        rv = realized_vol(returns, window=63)  # 1 quarter
        median_rv = rv.dropna().median()
        expected = 0.01 * np.sqrt(252)
        assert abs(median_rv - expected) < 0.01, f"got {median_rv}, expected ≈ {expected}"

    def test_warmup_period_is_nan(self):
        returns = _gbm_returns(50, mu=0.0, sigma=0.01)
        rv = realized_vol(returns, window=21)
        # First 20 entries should be NaN (need 21 to compute std)
        assert rv.iloc[:20].isna().all()
        assert rv.iloc[20:].notna().all()


# ============================================================
# vol_regime
# ============================================================

class TestVolRegime:
    @pytest.fixture
    def long_calm_returns(self):
        """5y+ calm low-vol returns — enough to populate the 5y quantile baseline."""
        return _gbm_returns(252 * 7, mu=0.0, sigma=0.005, seed=2)

    def test_invalid_quantile_breaks_raises(self):
        bad_inputs = [(0.5, 0.5), (0.7, 0.3), (-0.1, 0.5), (0.5, 1.1), (0.0, 0.5)]
        for breaks in bad_inputs:
            with pytest.raises(ValueError, match="quantile_breaks"):
                vol_regime(_gbm_returns(50, 0, 0.01), quantile_breaks=breaks)

    def test_labels_only_in_allowed_set(self, long_calm_returns):
        labels = vol_regime(long_calm_returns).dropna()
        assert set(labels.unique()) <= {"low", "mid", "high"}

    def test_warmup_returns_nan(self, long_calm_returns):
        """Sebelum trailing 5y quantile cukup terisi, label harus NaN."""
        labels = vol_regime(long_calm_returns, quantile_lookback=252 * 5)
        # Pertama 252*5 + 21 baris seharusnya NaN (vol window + quantile lookback)
        first_valid = labels.first_valid_index()
        assert first_valid is not None
        position = labels.index.get_loc(first_valid)
        assert position >= 252 * 5, (
            f"First label appeared at position {position}, expected >= {252*5}"
        )

    def test_no_lookahead_invariance(self):
        """Properti DEFINING: extending series dengan future data TIDAK boleh ubah past labels.

        Compute labels untuk series S. Append future data → recompute. Labels untuk
        rentang tanggal asli harus IDENTIK. Kalau berubah, lookahead bocor.
        """
        full = _gbm_returns(252 * 7, mu=0.0, sigma=0.01, seed=7)
        original = vol_regime(full.iloc[: 252 * 6])
        extended = vol_regime(full)  # Adds 1 extra year of data
        overlap = original.index
        # Compare label-by-label di rentang yang overlap
        diff = (
            original.dropna().compare(extended.loc[overlap].dropna(), keep_equal=False)
        )
        assert diff.empty, (
            f"Lookahead bocor — {len(diff)} labels berubah ketika future data ditambahkan"
        )

    def test_detects_vol_regime_shift(self):
        """Inject vol shift LOW → HIGH di tengah, baseline established → labels should follow."""
        n_baseline = 252 * 5
        n_low = 252 * 2
        n_high = 252 * 1
        rng = np.random.default_rng(42)
        baseline = rng.normal(0.0, 0.012, n_baseline)  # mid vol baseline
        low_era = rng.normal(0.0, 0.004, n_low)
        high_era = rng.normal(0.0, 0.030, n_high)
        dates = _bdates(n_baseline + n_low + n_high)
        returns = pd.Series(np.concatenate([baseline, low_era, high_era]), index=dates)

        labels = vol_regime(returns)  # keep NaN, slice by date

        # Last 1y of low era — past quantile-shift warmup, should be low-dominant
        low_dates = dates[n_baseline + n_low - 252 : n_baseline + n_low]
        # Last 1y overall (high era)
        high_dates = dates[-252:]

        low_labels = labels.loc[low_dates].dropna()
        high_labels = labels.loc[high_dates].dropna()
        assert len(low_labels) > 200, f"low_labels has only {len(low_labels)} non-NaN"
        assert len(high_labels) > 200, f"high_labels has only {len(high_labels)} non-NaN"

        low_pct = (low_labels == "low").mean()
        high_pct = (high_labels == "high").mean()

        assert low_pct > 0.8, f"Low era seharusnya didominasi 'low', got {low_pct:.2%}"
        assert high_pct > 0.8, f"High era seharusnya didominasi 'high', got {high_pct:.2%}"


# ============================================================
# trend_regime
# ============================================================

class TestTrendRegime:
    def test_monotonic_uptrend_labels_up(self):
        n = 600
        prices = pd.DataFrame(
            {"open": [100.0] * n, "high": [100.0] * n, "low": [100.0] * n,
             "close": np.linspace(100.0, 200.0, n), "volume": [0] * n},
            index=_bdates(n),
        )
        labels = trend_regime(prices).dropna()
        up_pct = (labels == "up").mean()
        assert up_pct > 0.95, f"Monotonic uptrend → expected almost all 'up', got {up_pct:.2%}"

    def test_monotonic_downtrend_labels_down(self):
        n = 600
        prices = pd.DataFrame(
            {"open": [100.0] * n, "high": [100.0] * n, "low": [100.0] * n,
             "close": np.linspace(200.0, 100.0, n), "volume": [0] * n},
            index=_bdates(n),
        )
        labels = trend_regime(prices).dropna()
        down_pct = (labels == "down").mean()
        assert down_pct > 0.95, f"Monotonic downtrend → expected almost all 'down', got {down_pct:.2%}"

    def test_flat_prices_labels_sideways(self):
        n = 600
        prices = pd.DataFrame(
            {"open": [100.0] * n, "high": [100.0] * n, "low": [100.0] * n,
             "close": [100.0] * n, "volume": [0] * n},
            index=_bdates(n),
        )
        labels = trend_regime(prices).dropna()
        # Flat: tidak ada signal up/down; semua sideways
        assert (labels == "sideways").all(), f"Flat prices → all sideways, got {labels.value_counts().to_dict()}"

    def test_reversal_up_then_down(self):
        """Trend ke atas selama setengah, lalu ke bawah. Labels harus follow setelah lag."""
        n_each = 400
        prices = pd.DataFrame(
            {"open": [100.0] * (n_each * 2), "high": [100.0] * (n_each * 2), "low": [100.0] * (n_each * 2),
             "close": np.concatenate([
                 np.linspace(100.0, 250.0, n_each),
                 np.linspace(250.0, 100.0, n_each),
             ]),
             "volume": [0] * (n_each * 2)},
            index=_bdates(n_each * 2),
        )
        labels = trend_regime(prices)
        # Ambil label di tengah era pertama (sudah past warmup MA200+slope60)
        era1_mid = labels.iloc[260:n_each - 30].dropna()
        era2_late = labels.iloc[-100:].dropna()  # last 100 bars dari era 2 — past reversal lag
        up_pct_era1 = (era1_mid == "up").mean()
        down_pct_era2 = (era2_late == "down").mean()
        assert up_pct_era1 > 0.9, f"Era 1 (up) → expected 'up' dominant, got {up_pct_era1:.2%}"
        assert down_pct_era2 > 0.9, f"Era 2 (down) → expected 'down' dominant, got {down_pct_era2:.2%}"

    def test_no_lookahead_invariance(self):
        """Sama dengan vol_regime: extending data tidak boleh ubah past labels."""
        n_full = 1000
        rng = np.random.default_rng(11)
        close_full = 100.0 * np.exp(np.cumsum(rng.normal(0.0005, 0.01, n_full)))
        prices_full = pd.DataFrame(
            {"open": close_full, "high": close_full, "low": close_full,
             "close": close_full, "volume": [0] * n_full},
            index=_bdates(n_full),
        )
        prices_short = prices_full.iloc[:800]

        labels_short = trend_regime(prices_short)
        labels_full = trend_regime(prices_full)
        diff = labels_short.dropna().compare(
            labels_full.loc[labels_short.index].dropna(), keep_equal=False
        )
        assert diff.empty, f"Lookahead bocor di trend_regime — {len(diff)} labels berubah"


# ============================================================
# daily_log_returns
# ============================================================

from tools.regime_radar.data import daily_log_returns


class TestDailyLogReturns:
    def test_constant_prices_zero_returns(self):
        n = 100
        prices = pd.DataFrame({"close": [100.0] * n}, index=_bdates(n))
        r = daily_log_returns(prices)
        assert (r == 0).all()
        assert len(r) == n - 1  # First NaN dropped

    def test_log_relation_holds(self):
        """log_return[t] = ln(close[t]) - ln(close[t-1])."""
        closes = [100.0, 102.0, 99.0, 105.5]
        prices = pd.DataFrame({"close": closes}, index=_bdates(len(closes)))
        r = daily_log_returns(prices).values
        expected = np.log(np.array(closes[1:])) - np.log(np.array(closes[:-1]))
        np.testing.assert_allclose(r, expected, rtol=1e-12)

    def test_drops_leading_nan(self):
        prices = pd.DataFrame({"close": [100.0, 101.0]}, index=_bdates(2))
        r = daily_log_returns(prices)
        assert not r.isna().any()
        assert len(r) == 1


# ============================================================
# build_payload — schema contract validation
# ============================================================

from tools.regime_radar.build import build_payload
from tools.regime_radar.universe import Ticker


class TestBuildPayloadSchema:
    @pytest.fixture
    def synthetic_prices(self):
        n = 252 * 7  # cukup untuk quantile_lookback 5y warmup
        rng = np.random.default_rng(123)
        returns = rng.normal(0.0003, 0.012, n)
        close = 5000.0 * np.exp(np.cumsum(returns))
        return pd.DataFrame(
            {"open": close, "high": close, "low": close, "close": close, "volume": 0},
            index=_bdates(n),
        )

    @pytest.fixture
    def payload(self, synthetic_prices):
        ticker = Ticker(symbol="^TEST", display_name="Test", kind="index")
        return build_payload(ticker, prices=synthetic_prices)

    def test_top_level_keys(self, payload):
        assert set(payload.keys()) == {"meta", "series", "latest"}

    def test_meta_shape(self, payload):
        m = payload["meta"]
        for k in ("symbol", "display_name", "kind", "generated_at", "params"):
            assert k in m, f"meta missing {k}"
        # generated_at must be ISO 8601 (Z-terminated)
        assert m["generated_at"].endswith("Z")
        assert "T" in m["generated_at"]

    def test_series_columns_and_alignment(self, payload):
        s = payload["series"]
        for k in ("date", "close", "realized_vol", "vol_regime", "trend_regime"):
            assert isinstance(s[k], list), f"series.{k} bukan list"
        n = len(s["date"])
        assert n > 0
        for k in ("close", "realized_vol", "vol_regime", "trend_regime"):
            assert len(s[k]) == n, f"series.{k} length {len(s[k])} != {n}"

    def test_series_dates_are_iso_strings(self, payload):
        for d in payload["series"]["date"][:5]:
            assert isinstance(d, str)
            assert len(d) == 10 and d[4] == "-" and d[7] == "-"

    def test_series_labels_in_allowed_set(self, payload):
        s = payload["series"]
        assert set(s["vol_regime"]) <= {"low", "mid", "high"}
        assert set(s["trend_regime"]) <= {"up", "sideways", "down"}

    def test_latest_matches_last_series_row(self, payload):
        s = payload["series"]
        l = payload["latest"]
        assert l["date"] == s["date"][-1]
        assert l["close"] == s["close"][-1]
        assert l["vol_regime"] == s["vol_regime"][-1]
        assert l["trend_regime"] == s["trend_regime"][-1]
        assert l["realized_vol_annualized"] == s["realized_vol"][-1]

    def test_no_nan_or_inf_in_numeric_series(self, payload):
        """JSON tidak punya NaN/Inf — kalau lewat lolos, JSON.parse di browser akan rusak."""
        s = payload["series"]
        for v in s["close"]:
            assert v is None or (isinstance(v, (int, float)) and np.isfinite(v))
        for v in s["realized_vol"]:
            assert v is None or (isinstance(v, (int, float)) and np.isfinite(v))
