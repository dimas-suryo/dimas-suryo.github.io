"""The pre-registered test for the trend label, and the code that scores it.

Written on 26 Sep 2026, after the median columns of the "what followed" table
showed no trend effect in any of the three markets, and before the 10th
percentile column had been computed on real data. Its purpose is to fix the
question before seeing the answer. Do not edit PREREGISTRATION to fit a result;
tests/test_prereg.py pins its exact contents, so any change shows up in review.

The claim being tested is the one trend-following proponents actually make:
not a better typical month, but smaller losses in bad months. If the 200-day
rule carries that information for IHSG, the 21-day windows that start in a
downtrend should have a worse 10th percentile than windows in general.
"""
from __future__ import annotations

PREREGISTRATION: dict = {
    "locked_on": "2026-09-26",
    "hypothesis": (
        "Over the next 21 trading days, the 10th percentile return after days labeled "
        "trend=down is lower than after all days."
    ),
    "primary": {"symbol": "^JKSE", "signal": "trend", "label": "down", "metric": "p10_return", "direction": "lower"},
    "replication": {"symbol": "^GSPC", "signal": "trend", "label": "down", "metric": "p10_return", "direction": "lower"},
    "decision_rule": (
        "Supported if, in the baseline settings, the 95% episode-bootstrap interval for the gap "
        "between the down row and the all-days row lies entirely below zero. Not supported if the "
        "interval includes zero. Inconclusive if the down row has too few episodes for an interval. "
        "Agreement across the other variants is reported but does not change the verdict."
    ),
    "power_check": (
        "Run on 26 Sep 2026 before the real result was computed (python -m tools.regime_radar.power): "
        "with 26 years of synthetic prices, the rule said supported in 1 of 12 runs with strong planted "
        "bear markets, 1 of 12 with mild ones, and 0 of 12 on pure noise. Expected shortfall instead of "
        "the 10th percentile did no better. The test rarely raises a false alarm and rarely detects a real effect."
    ),
    "if_not_supported": (
        "The table cannot detect the claimed effect in IHSG's history. Given the power check, that is weak "
        "evidence against the claim: one market's twenty years hold too few downtrends to settle it."
    ),
}


def evaluate(stats: dict, spec: dict) -> dict:
    """Score one spec against a summarize() result. Pure function, no I/O."""
    rows = {r["label"]: r for r in stats[spec["signal"]]}
    row = rows.get(spec["label"])
    metric = spec["metric"]
    base = stats["all"].get(metric)
    out = {"estimate": None, "all_days": base, "gap": None, "gap_ci": None, "verdict": "inconclusive"}
    if row is None or row.get(metric) is None or base is None:
        out["reason"] = "label never occurred"
        return out

    out["estimate"] = row[metric]
    out["gap"] = round(row[metric] - base, 4)
    ci = (row.get("ci") or {}).get(metric)
    if not ci:
        out["reason"] = "too few episodes for an interval"
        return out

    lo, hi = ci["gap_ci"]
    out["gap_ci"] = [lo, hi]
    if spec["direction"] == "lower":
        supported = hi < 0
    else:
        supported = lo > 0
    out["verdict"] = "supported" if supported else "not supported"
    return out


def sign_agreement(results: list[dict], spec: dict) -> tuple[int, int]:
    """How many variants put the point estimate on the predicted side, out of how many had one."""
    agree = total = 0
    for r in results:
        st = r.get("stats")
        if not st:
            continue
        e = evaluate(st, spec)
        if e["gap"] is None:
            continue
        total += 1
        if (e["gap"] < 0) == (spec["direction"] == "lower"):
            agree += 1
    return agree, total
