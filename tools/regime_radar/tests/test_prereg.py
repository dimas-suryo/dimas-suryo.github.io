"""The pre-registration is pinned here on purpose.

If a test in this file fails because PREREGISTRATION changed, that change is a
change to a hypothesis that was locked before the data was seen. Edit this file
only with a note in the commit message saying why, and say so in the write-up.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from tools.regime_radar.prereg import PREREGISTRATION, evaluate, sign_agreement

LOCKED_SPECS = {
    "primary": {"symbol": "^JKSE", "signal": "trend", "label": "down", "metric": "p10_return", "direction": "lower"},
    "replication": {"symbol": "^GSPC", "signal": "trend", "label": "down", "metric": "p10_return", "direction": "lower"},
}


def test_preregistration_is_unchanged():
    assert PREREGISTRATION["locked_on"] == "2026-09-26"
    assert PREREGISTRATION["primary"] == LOCKED_SPECS["primary"]
    assert PREREGISTRATION["replication"] == LOCKED_SPECS["replication"]
    assert "entirely below zero" in PREREGISTRATION["decision_rule"]
    assert "1 of 12" in PREREGISTRATION["power_check"]


def _stats(gap_ci, row_value=-0.08, base=-0.05, ci=True):
    row = {"label": "down", "p10_return": row_value, "ci": None}
    if ci:
        row["ci"] = {"p10_return": {"ci": [row_value - 0.02, row_value + 0.02], "gap_ci": gap_ci}}
    return {"all": {"p10_return": base}, "trend": [row]}


SPEC = LOCKED_SPECS["primary"]


def test_supported_when_gap_interval_below_zero():
    e = evaluate(_stats([-0.05, -0.01]), SPEC)
    assert e["verdict"] == "supported" and e["gap"] == -0.03


def test_not_supported_when_interval_includes_zero():
    assert evaluate(_stats([-0.05, 0.01]), SPEC)["verdict"] == "not supported"


def test_inconclusive_without_interval():
    e = evaluate(_stats(None, ci=False), SPEC)
    assert e["verdict"] == "inconclusive" and "few episodes" in e["reason"]


def test_inconclusive_when_label_never_occurred():
    st = {"all": {"p10_return": -0.05}, "trend": [{"label": "up", "p10_return": -0.04}]}
    assert evaluate(st, SPEC)["verdict"] == "inconclusive"


def test_sign_agreement_counts_variants_with_an_estimate():
    results = [
        {"stats": _stats([-0.05, 0.01], row_value=-0.08)},  # gap -0.03, agrees
        {"stats": _stats([-0.01, 0.03], row_value=-0.04)},  # gap +0.01, disagrees
        {"stats": None},
    ]
    assert sign_agreement(results, SPEC) == (1, 2)


def test_report_puts_verdict_first(tmp_path):
    """End to end through the CLI on offline synthetic prices."""
    rng = np.random.default_rng(0)
    close = 1000 * np.exp(np.cumsum(rng.normal(0.0003, 0.012, 252 * 16)))
    csv = tmp_path / "px.csv"
    pd.DataFrame({"date": pd.bdate_range("2005-01-03", periods=len(close)), "close": close}).to_csv(csv, index=False)
    out = tmp_path / "r.md"
    root = Path(__file__).resolve().parents[3]
    subprocess.run(
        [sys.executable, "-m", "tools.regime_radar.sensitivity", "--prices-csv", str(csv),
         "--tickers", "^JKSE", "--reps", "40", "--out", str(out)],
        check=True, cwd=root, capture_output=True,
    )
    md = out.read_text()
    assert md.index("Pre-registered test") < md.index("## IHSG")
    assert "| primary | ^JKSE |" in md
    assert "| replication | ^GSPC |" in md and "not run" in md
    assert "10th percentile return" in md
