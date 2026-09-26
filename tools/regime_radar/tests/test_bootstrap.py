"""Tests for the episode bootstrap and the sensitivity report."""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest

from tools.regime_radar.build import PARAMS, classify, summarize
from tools.regime_radar.sensitivity import VARIANTS, _cell, report, run_variants
from tools.regime_radar.stats import _episode_blocks, bootstrap_intervals, forward_metrics
from tools.regime_radar.universe import Ticker


def _prices(returns: np.ndarray, start: str = "2000-01-03") -> pd.DataFrame:
    c = 1000.0 * np.exp(np.cumsum(returns))
    return pd.DataFrame(
        {"open": c, "high": c, "low": c, "close": c, "volume": 0},
        index=pd.bdate_range(start, periods=len(returns)),
    )


def _garch(n: int, seed: int) -> np.ndarray:
    """GARCH(1,1) returns: volatility clusters, the mean is zero throughout."""
    rng = np.random.default_rng(seed)
    w, a, b = 1e-6, 0.08, 0.9
    h = w / (1 - a - b)
    out = np.empty(n)
    for i in range(n):
        e = rng.normal() * np.sqrt(h)
        out[i] = e
        h = w + a * e * e + b * h
    return out


def _stats(prices: pd.DataFrame, **overrides) -> dict:
    p = {**PARAMS, **overrides}
    return summarize(classify(prices, p), prices["close"], p)


def _star(ci: dict | None, metric: str) -> bool:
    if not ci:
        return False
    lo, hi = ci[metric]["gap_ci"]
    return lo > 0 or hi < 0


class TestEpisodeBlocks:
    def test_one_block_per_episode_and_drops_days_without_future(self):
        idx = pd.bdate_range("2020-01-01", periods=10)
        labels = pd.Series(["a"] * 4 + ["b"] * 3 + ["a"] * 3, index=idx, dtype=object)
        fwd = forward_metrics(pd.Series(np.linspace(100, 110, 10), index=idx), horizon=2)
        blocks = _episode_blocks(labels, fwd, ["a", "b"])
        assert [len(x) for x in blocks["a"]] == [4, 1]  # last episode: only 1 of 3 days has a full future
        assert [len(x) for x in blocks["b"]] == [3]


@pytest.fixture(scope="module")
def garch_stats():
    return _stats(_prices(_garch(252 * 26, seed=0)), bootstrap_reps=400)


@pytest.fixture(scope="module")
def results():
    r = np.random.default_rng(4).normal(0.0003, 0.012, 252 * 22)
    prices = _prices(r)
    return prices, run_variants(prices, reps=60)


class TestBootstrapIntervals:
    def test_interval_brackets_point_estimate(self, garch_stats):
        for row in garch_stats["trend"] + garch_stats["vol"]:
            if not row["ci"]:
                continue
            for m in ("median_return", "share_positive", "median_vol", "p10_return"):
                lo, hi = row["ci"][m]["ci"]
                assert lo <= row[m] <= hi, (row["label"], m, lo, row[m], hi)

    def test_detects_volatility_clustering(self, garch_stats):
        v = {r["label"]: r for r in garch_stats["vol"]}
        assert v["high"]["ci"]["median_vol"]["gap_ci"][0] > 0, "high vol should be followed by higher vol"
        assert v["low"]["ci"]["median_vol"]["gap_ci"][1] < 0, "low vol should be followed by lower vol"

    def test_quiet_on_pure_noise(self):
        """iid returns carry no trend information: stars should be rare (5% nominal)."""
        stars = cells = 0
        for seed in range(6):
            r = np.random.default_rng(seed).normal(0.0003, 0.012, 252 * 26)
            st = _stats(_prices(r), bootstrap_reps=300)
            for row in st["trend"]:
                if row["ci"]:
                    cells += 1
                    stars += _star(row["ci"], "median_return")
        assert cells >= 12
        assert stars <= 3, f"{stars} of {cells} trend cells flagged on pure noise"

    def test_deterministic_given_seed(self, garch_stats):
        again = _stats(_prices(_garch(252 * 26, seed=0)), bootstrap_reps=400)
        assert json.dumps(again, sort_keys=True) == json.dumps(garch_stats, sort_keys=True)

    def test_too_few_episodes_gives_none(self):
        idx = pd.bdate_range("2020-01-01", periods=300)
        labels = pd.Series(["up"] * 100 + ["down"] * 100 + ["up"] * 100, index=idx, dtype=object)
        fwd = forward_metrics(pd.Series(np.linspace(100, 200, 300), index=idx), 21)
        ci = bootstrap_intervals(labels, fwd, ["up", "sideways", "down"], n_boot=100, min_episodes=5)
        assert ci["up"] is None and ci["down"] is None and ci["sideways"] is None
        assert ci["all"] is not None

    def test_payload_stats_are_strict_json(self, garch_stats):
        json.dumps(garch_stats, allow_nan=False)
        assert garch_stats["bootstrap"]["unit"] == "episode"


class TestSensitivity:
    def test_one_result_per_variant(self, results):
        _, res = results
        assert len(res) == len(VARIANTS)
        assert all(r["stats"] is not None for r in res)

    def test_halves_split_at_midpoint_without_overlap(self, results):
        _, res = results
        first, second = res[-2]["stats"], res[-1]["stats"]
        assert first["last_date"] < second["first_date"]
        assert abs(first["all"]["days"] - second["all"]["days"]) <= 2
        assert "to" in res[-1]["name"]

    def test_report_renders_every_variant(self, results):
        prices, res = results
        md = report(Ticker("^T", "Test", "index"), prices, res)
        for r in res:
            assert r["name"] in md
        assert md.count("| Variant |") == 4  # median, 10th percentile, share up, volatility
        assert "nan" not in md.lower()

    def test_cell_marks_star_only_when_gap_excludes_zero(self):
        row = {"median_return": 0.01, "episodes": 9,
               "ci": {"median_return": {"ci": [0.002, 0.02], "gap_ci": [0.001, 0.015]}}}
        assert _cell(row, "median_return").startswith("1.0%*")
        row["ci"]["median_return"]["gap_ci"] = [-0.001, 0.015]
        assert _cell(row, "median_return").startswith("1.0% [")
        assert "too few" in _cell({"median_return": 0.01, "episodes": 2, "ci": None}, "median_return")
