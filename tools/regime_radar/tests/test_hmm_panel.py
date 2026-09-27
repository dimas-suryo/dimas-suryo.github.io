"""Tests for the experimental HMM panel: real-time series, cache, and payload contract."""
from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest

pytest.importorskip("hmmlearn")

from tools.regime_radar import build as build_mod  # noqa: E402
from tools.regime_radar import hmm as hmm_mod  # noqa: E402
from tools.regime_radar.build import build_payload, main  # noqa: E402
from tools.regime_radar.hmm import complete_month_ends, realtime_turbulent  # noqa: E402
from tools.regime_radar.universe import Ticker  # noqa: E402

ON = {"hmm_enabled": True, "hmm_n_init": 1, "hmm_start": "2009-01"}


def _close(n=252 * 6, start="2007-01-01", seed=3):
    """Calm stretches with turbulent bursts, so the model has two real states to find."""
    rng = np.random.default_rng(seed)
    out, calm = [], True
    while len(out) < n:
        k = rng.integers(150, 400) if calm else rng.integers(30, 90)
        out += list(rng.normal(0.0004, 0.007, k) if calm else rng.normal(-0.002, 0.025, k))
        calm = not calm
    r = np.array(out[:n])
    return pd.Series(1000 * np.exp(np.cumsum(r)), index=pd.bdate_range(start, periods=n))


@pytest.fixture(scope="module")
def full():
    c = _close()
    p, refits = realtime_turbulent(c, start="2009-01", n_init=1)
    return c, p, refits


def test_month_ends_exclude_the_running_month():
    idx = pd.bdate_range("2020-01-01", "2020-03-17")
    ends = complete_month_ends(idx, "2020-01")
    assert [d.strftime("%Y-%m-%d") for d in ends] == ["2020-01-31", "2020-02-28"]


def test_values_before_first_refit_are_missing_and_rest_are_probabilities(full):
    c, p, refits = full
    first = pd.Timestamp(refits[0]["end"])
    assert p[: first].isna().all()
    assert p[p.index > first].between(0, 1).all()


@pytest.mark.parametrize("cut", ["2011-06-15", "2011-06-30"])  # mid-month, and a month end
def test_no_lookahead_appending_data_never_changes_published_values(full, cut):
    c, p, refits = full
    short, _ = realtime_turbulent(c[:cut], start="2009-01", n_init=1, cache=refits)
    common = short.index
    np.testing.assert_allclose(short.to_numpy(), p.loc[common].to_numpy(), equal_nan=True, atol=1e-12)


def test_cache_gives_identical_result_without_refitting(full, monkeypatch):
    c, p, refits = full

    def boom(*a, **k):
        raise AssertionError("fit_best called although every refit was cached")

    monkeypatch.setattr(hmm_mod, "fit_best", boom)
    p2, refits2 = realtime_turbulent(c, start="2009-01", n_init=1, cache=refits)
    assert refits2 == refits
    np.testing.assert_allclose(p2.to_numpy(), p.to_numpy(), equal_nan=True)


def test_cache_is_invalidated_when_history_changes(full):
    c, p, refits = full
    edited = c.copy()
    edited.loc["2010-03-10"] *= 1.01  # a corrected price in March 2010
    _, refits2 = realtime_turbulent(edited, start="2009-01", n_init=1, cache=refits)
    by = {r["end"]: r for r in refits2}
    old = {r["end"]: r for r in refits}
    feb, mar = "2010-02-26", "2010-03-31"
    assert by[feb] == old[feb], "a month end before the edit must be reused"
    assert by[mar]["data_hash"] != old[mar]["data_hash"], "an edit mid-month must invalidate that month"
    later = [e for e in by if e > mar]
    assert all(by[e]["data_hash"] != old[e]["data_hash"] for e in later), "and every month after it"


def test_payload_contract():
    c = _close(n=252 * 12, start="2003-01-01")
    px = pd.DataFrame({"open": c, "high": c, "low": c, "close": c, "volume": 0})
    pl = build_payload(Ticker("^T", "Test", "index"), prices=px, params=ON)
    h, s = pl["hmm"], pl["series"]
    assert len(s["hmm_p_turbulent"]) == len(s["date"])
    vals = [v for v in s["hmm_p_turbulent"] if v is not None]
    assert vals and all(0 <= v <= 1 for v in vals)
    assert pl["latest"]["hmm_p_turbulent"] == h["p_turbulent"] == pytest.approx(vals[-1], abs=1e-3)
    calm, turb = h["states"]
    assert h["shown"] is True
    assert calm["name"] == "calm" and calm["daily_sd"] < turb["daily_sd"]
    assert pl["_hmm_refits"] and h["fitted_through"] == pl["_hmm_refits"][-1]["end"]
    json.dumps({k: v for k, v in pl.items() if k != "_hmm_refits"}, allow_nan=False)


def test_hmm_failure_never_breaks_the_build(monkeypatch):
    c = _close(n=252 * 12, start="2003-01-01")
    px = pd.DataFrame({"open": c, "high": c, "low": c, "close": c, "volume": 0})

    def fail(*a, **k):
        raise RuntimeError("model exploded")

    monkeypatch.setattr(build_mod, "realtime_turbulent", fail)
    pl = build_payload(Ticker("^T", "Test", "index"), prices=px, params=ON)
    assert "hmm" not in pl and "hmm_p_turbulent" not in pl["series"]
    assert "model exploded" in pl["meta"]["hmm_error"]


def test_main_writes_cache_file_and_strips_private_key(tmp_path, monkeypatch):
    c = _close(n=252 * 12, start="2003-01-01")
    px = pd.DataFrame({"open": c, "high": c, "low": c, "close": c, "volume": 0})
    monkeypatch.setattr(build_mod, "fetch_prices", lambda s, start, stooq_symbol=None: px)
    for k, v in ON.items():
        monkeypatch.setitem(build_mod.PARAMS, k, v)
    assert main(universe=[Ticker("^T", "Test", "index")], out_dir=tmp_path) == 0
    payload = json.loads((tmp_path / "_T.json").read_text())
    cache = json.loads((tmp_path / "hmm-_T.json").read_text())
    assert "_hmm_refits" not in payload and "hmm" in payload
    assert cache["refits"][-1]["end"] == payload["hmm"]["fitted_through"]
    # Second run reuses the cache and produces the same file.
    before = (tmp_path / "hmm-_T.json").read_text()
    assert main(universe=[Ticker("^T", "Test", "index")], out_dir=tmp_path) == 0
    assert (tmp_path / "hmm-_T.json").read_text() == before


def test_short_lived_turbulent_state_is_not_shown():
    """A jump detector (turbulent spells of a few days) must not be presented as a regime."""
    c = _close(n=252 * 12, start="2003-01-01")
    px = pd.DataFrame({"open": c, "high": c, "low": c, "close": c, "volume": 0})
    pl = build_payload(Ticker("^T", "Test", "index"), prices=px, params={**ON, "hmm_min_turbulent_days": 10_000})
    assert pl["hmm"]["shown"] is False and "regime" in pl["hmm"]["reason"]
    assert "hmm_p_turbulent" not in pl["series"] and "hmm_p_turbulent" not in pl["latest"]
    assert pl["_hmm_refits"], "the cache is still written, so the check can pass again later"
