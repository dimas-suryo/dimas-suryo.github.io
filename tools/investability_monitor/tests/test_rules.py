"""Tests for the dated IDX rulebook (rules.py).

Expected limits are worked out by hand or by brute force over the tick grid,
with the percentages typed in again here, so a slip in either the tables or the
rounding code shows up as a mismatch rather than agreeing with itself.
"""
from __future__ import annotations

import bisect
import datetime as dt
import json
import subprocess
import sys
from fractions import Fraction as F
from pathlib import Path

import pytest

from tools.investability_monitor import rules
from tools.investability_monitor.rules import (
    EVENTS,
    RULEBOOK_CHECKED,
    RULEBOOK_START,
    SCHEDULED,
    RuleGapError,
    free_float_deadline,
    free_float_status,
    price_limits,
    tick_size,
)

D = dt.date
REPO = Path(__file__).resolve().parents[3]


# --------------------------------------------------------------------------
# The cases the brief asks for
# --------------------------------------------------------------------------


def test_previous_close_1000_gets_15pct_lower_limit_on_16_oct_and_7pct_on_19_oct_2026():
    assert price_limits(D(2026, 10, 16), 1000) == (850.0, 1250.0)
    assert price_limits(D(2026, 10, 19), 1000) == (930.0, 1250.0)
    assert price_limits(D(2026, 10, 20), 1000) == (930.0, 1250.0)


def test_close_at_minus_7pct_is_a_lower_limit_hit_on_19_oct_but_not_16_oct():
    close = 930.0
    assert close == price_limits(D(2026, 10, 19), 1000)[0]
    assert close > price_limits(D(2026, 10, 16), 1000)[0]


def test_rp12_stock_has_lower_limit_rp11_on_20_oct_2026():
    assert price_limits(D(2026, 10, 20), 12) == (11.0, 16.0)


@pytest.mark.parametrize("ref", [11, 12, 13, 14])
def test_rp11_to_14_could_not_fall_on_19_oct_and_may_fall_rp1_from_20_oct(ref):
    # 7% of Rp11-14 is under one tick, and IDX rounds the lower limit up: Kep-00158 fixed that.
    assert price_limits(D(2026, 10, 19), ref)[0] == ref
    assert price_limits(D(2026, 10, 20), ref)[0] == ref - 1


@pytest.mark.parametrize("day", [D(2020, 1, 2), D(2024, 6, 3), D(2026, 10, 20), RULEBOOK_CHECKED])
@pytest.mark.parametrize(
    "price, tick",
    [(1, 1), (50, 1), (199, 1), (199.5, 1), (200, 2), (499, 2), (500, 5), (1999, 5), (2000, 10), (4999, 10), (4999.99, 10), (5000, 25), (100_000, 25)],
)
def test_tick_size_at_band_boundaries(day, price, tick):
    assert tick_size(day, price) == tick


@pytest.mark.parametrize(
    "day, ref, expected",
    [
        # symmetric 35/25/20% (Sep 2023 - Apr 2025)
        (D(2024, 1, 15), 150, (98, 202)),  # 202.5 rounds down on the Rp2 grid above Rp200
        (D(2024, 1, 15), 149, (97, 200)),  # 201.15 -> 200, not 201: the tick of the limit price counts
        (D(2024, 1, 15), 266, (200, 332)),  # 199.5 rounds up to Rp200
        (D(2024, 1, 15), 402, (302, 500)),  # 502.5 -> 500 on the Rp5 grid
        (D(2024, 1, 15), 665, (500, 830)),  # 498.75 rounds up to Rp500
        (D(2024, 1, 15), 1605, (1205, 2000)),  # 2006.25 -> 2000 on the Rp10 grid
        (D(2024, 1, 15), 4010, (3010, 5000)),  # 5012.5 -> 5000 on the Rp25 grid
        # 7% lower limit (Kep-00158)
        (D(2026, 10, 20), 2150, (2000, 2680)),  # 1999.5 rounds up to Rp2,000
        (D(2026, 10, 20), 5375, (5000, 6450)),  # 4998.75 rounds up to Rp5,000
    ],
)
def test_limit_rounding_at_tick_band_boundaries(day, ref, expected):
    assert price_limits(day, ref) == tuple(float(x) for x in expected)


# --------------------------------------------------------------------------
# Brute force: every reference price on the grid, against an independent table
# --------------------------------------------------------------------------

TICKS = ((0, 1), (200, 2), (500, 5), (2000, 10), (5000, 25))


def _tick(p: int) -> int:
    size = 1
    for start, t in TICKS:
        if p >= start:
            size = t
    return size


VALID = [p for p in range(1, 20_001) if p % _tick(p) == 0]


def pct(n: int) -> tuple[str, F]:
    return ("pct", F(n, 100))


RP1 = ("rp", 1)

# date -> (minimum price, [(band upper bound, upper limit, lower limit), ...]), typed in from the sources
SCHEDULES = {
    D(2020, 2, 3): (50, [(200, pct(35), pct(35)), (5000, pct(25), pct(25)), (None, pct(20), pct(20))]),
    D(2021, 6, 1): (50, [(200, pct(35), pct(7)), (5000, pct(25), pct(7)), (None, pct(20), pct(7))]),
    D(2024, 6, 3): (50, [(200, pct(35), pct(35)), (5000, pct(25), pct(25)), (None, pct(20), pct(20))]),
    D(2025, 8, 1): (50, [(200, pct(35), pct(15)), (5000, pct(25), pct(15)), (None, pct(20), pct(15))]),
    D(2026, 10, 1): (1, [(10, RP1, RP1), (200, pct(35), pct(15)), (5000, pct(25), pct(15)), (None, pct(20), pct(15))]),
    D(2026, 10, 20): (1, [(10, RP1, RP1), (14, pct(35), RP1), (200, pct(35), pct(7)), (5000, pct(25), pct(7)), (None, pct(20), pct(7))]),
}


def _apply(ref: int, limit: tuple[str, F | int], sign: int) -> F:
    kind, amount = limit
    return ref * (1 + sign * amount) if kind == "pct" else F(ref + sign * amount)


def _brute(ref: int, min_price: int, bands) -> tuple[float, float]:
    for up_to, up, down in bands:
        if up_to is None or ref <= up_to:
            break
    hi, lo = _apply(ref, up, +1), _apply(ref, down, -1)
    upper = VALID[bisect.bisect_right(VALID, hi) - 1]  # highest valid price <= hi
    lower = VALID[bisect.bisect_left(VALID, lo)] if lo > 0 else min_price  # lowest valid price >= lo
    return float(max(lower, min_price)), float(upper)


@pytest.mark.parametrize("day", sorted(SCHEDULES))
def test_limits_match_brute_force_on_every_grid_price(day):
    min_price, bands = SCHEDULES[day]
    bad = []
    for ref in (p for p in VALID if min_price <= p <= 12_000):
        got, want = price_limits(day, ref), _brute(ref, min_price, bands)
        if got != want:
            bad.append((ref, got, want))
    assert not bad, bad[:5]


# --------------------------------------------------------------------------
# History of the regular boards' limits
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "day, expected",
    [
        (D(2020, 1, 2), (750, 1250)),
        (D(2020, 3, 9), (750, 1250)),
        (D(2020, 3, 10), (900, 1250)),
        (D(2020, 3, 12), (900, 1250)),
        (D(2020, 3, 13), (930, 1250)),
        (D(2023, 6, 2), (930, 1250)),
        (D(2023, 6, 5), (850, 1250)),
        (D(2023, 9, 1), (850, 1250)),
        (D(2023, 9, 4), (750, 1250)),
        (D(2025, 4, 7), (750, 1250)),
        (D(2025, 4, 8), (850, 1250)),
        (D(2026, 9, 25), (850, 1250)),
        (D(2026, 9, 28), (850, 1250)),
        (D(2026, 10, 19), (930, 1250)),
        (D(2026, 12, 31), (930, 1250)),
    ],
)
def test_regular_board_limits_through_every_change(day, expected):
    for board in ("main", "development", "new_economy"):
        assert price_limits(day, 1000, board) == tuple(float(x) for x in expected)


def test_lower_limit_never_below_minimum_price():
    assert price_limits(D(2021, 6, 1), 50) == (50.0, 67.0)  # 46.5 would round to 47, but Rp50 was the floor
    assert price_limits(D(2026, 10, 1), 50) == (43.0, 67.0)  # Rp1 floor from 28 Sep 2026
    assert price_limits(D(2026, 10, 1), 1) == (1.0, 2.0)
    with pytest.raises(ValueError, match="below"):
        price_limits(D(2021, 6, 1), 30)


@pytest.mark.parametrize("ref, expected", [(5, (4, 6)), (10, (9, 11)), (11, (10, 14)), (200, (170, 270))])
def test_rp1_band_from_28_sep_2026(ref, expected):
    assert price_limits(D(2026, 10, 1), ref) == tuple(float(x) for x in expected)


def test_first_trading_day_limits():
    # Before 13 Mar 2020 a new listing's limits were doubled; the lower side is unconfirmed.
    assert price_limits(D(2020, 1, 15), 100, first_day=True) == (50.0, 170.0)
    assert price_limits(D(2020, 1, 15), 100) == (65.0, 135.0)
    assert price_limits(D(2021, 6, 1), 100, first_day=True) == (93.0, 135.0)
    assert price_limits(D(2024, 6, 3), 100, "acceleration", first_day=True) == (90.0, 110.0)


# --------------------------------------------------------------------------
# Other boards
# --------------------------------------------------------------------------


@pytest.mark.parametrize("day", [D(2020, 1, 2), D(2022, 6, 1), D(2024, 6, 3), D(2026, 10, 19), RULEBOOK_CHECKED])
def test_acceleration_board_keeps_its_own_limits(day):
    assert price_limits(day, 100, "acceleration") == (90.0, 110.0)
    assert price_limits(day, 8, "acceleration") == (7.0, 9.0)
    assert price_limits(day, 11, "acceleration") == (10.0, 12.0)
    assert price_limits(day, 1000, "acceleration") == (900.0, 1100.0)


def test_special_monitoring_board():
    for day in (D(2023, 6, 12), D(2024, 3, 25), D(2026, 10, 20)):
        assert price_limits(day, 100, "special_monitoring") == (90.0, 110.0)
        assert price_limits(day, 1000, "fca") == (900.0, 1100.0)
        assert price_limits(day, 3, "Full Call Auction") == (2.0, 4.0)
    with pytest.raises(RuleGapError, match="2023-06-12"):
        price_limits(D(2023, 6, 9), 100, "special_monitoring")


def test_unknown_board_and_bad_inputs():
    with pytest.raises(ValueError, match="unknown board"):
        price_limits(D(2024, 6, 3), 100, "nasdaq")
    with pytest.raises(ValueError):
        tick_size(D(2024, 6, 3), 0)
    with pytest.raises(ValueError):
        price_limits(D(2024, 6, 3), float("nan"))
    with pytest.raises(TypeError):
        price_limits(D(2024, 6, 3), True)


def test_dates_outside_the_rulebook_raise():
    with pytest.raises(RuleGapError, match="starts on 2020-01-01"):
        price_limits(D(2019, 12, 31), 1000)
    with pytest.raises(RuleGapError, match="Kep-00158/BEI/10-2026"):
        price_limits(D(2027, 1, 4), 1000)
    # Boards and tables with no announced end keep answering.
    assert price_limits(D(2027, 1, 4), 1000, "acceleration") == (900.0, 1100.0)
    assert tick_size(D(2027, 1, 4), 1000) == 5


def test_inputs_can_be_floats_numpy_strings_and_datetimes():
    np = pytest.importorskip("numpy")
    expected = (930.0, 1250.0)
    assert price_limits(D(2026, 10, 19), 1000.0) == expected
    assert price_limits(D(2026, 10, 19), np.int64(1000)) == expected
    assert price_limits(D(2026, 10, 19), np.float64(1000.0)) == expected
    assert price_limits("2026-10-19", 1000) == expected
    assert price_limits(dt.datetime(2026, 10, 19, 15, 0), 1000) == expected
    assert all(type(x) is float for x in price_limits(D(2026, 10, 19), np.int64(1000)))


# --------------------------------------------------------------------------
# Halts, reference price, notations
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "day, first, last",
    [
        (D(2020, 3, 10), F(10, 100), (F(15, 100), "suspend")),
        (D(2020, 3, 11), F(5, 100), (F(15, 100), "suspend")),
        (D(2025, 4, 7), F(5, 100), (F(15, 100), "suspend")),
        (D(2025, 4, 8), F(8, 100), (F(20, 100), "suspend")),
        (RULEBOOK_CHECKED, F(8, 100), (F(20, 100), "suspend")),
    ],
)
def test_halt_thresholds(day, first, last):
    steps = rules.halt_rule(day).steps
    assert steps[0].decline == first and steps[0].action == "halt" and steps[0].minutes == 30
    assert (steps[-1].decline, steps[-1].action) == last


def test_reference_price_basis():
    assert rules.reference_price_rule(D(2020, 3, 12)).basis == "opening_price_if_preopening"
    assert rules.reference_price_rule(D(2020, 3, 13)).basis == "previous_close"
    assert rules.reference_price_rule(RULEBOOK_CHECKED).basis == "previous_close"


def test_notation_letters_over_time():
    assert {"B", "M", "E", "S", "A", "D", "L"} <= set(rules.notations_in_force(D(2020, 1, 2)))
    assert "X" not in rules.notations_in_force(D(2023, 6, 9))
    assert "X" in rules.notations_in_force(D(2023, 6, 12))
    assert "P" not in rules.notations_in_force(D(2026, 8, 2))
    assert "P" in rules.notations_in_force(D(2026, 8, 3))
    for code in "EDAS":
        assert code in rules.notations_in_force(D(2026, 11, 29))
        assert code not in rules.notations_in_force(D(2026, 11, 30))
    assert set(rules.notations_in_force(D(2026, 11, 30))) == set("BMLCQYFGVNKIXP")


def test_notation_p_is_shown_board_by_board():
    shown = rules.notation_shown
    assert not shown("P", D(2026, 11, 29), "acceleration")
    assert shown("P", D(2026, 11, 30), "acceleration")
    assert not shown("P", D(2026, 12, 1), "main")
    assert shown("P", D(2027, 4, 30), "main") and shown("P", D(2027, 4, 30), "development")
    assert shown("L", D(2020, 1, 2), "main")
    assert not shown("E", D(2026, 11, 30), "main")


# --------------------------------------------------------------------------
# Free float transition (Peraturan I-A, Kep-00045 then Kep-00152)
# --------------------------------------------------------------------------

LARGE, SMALL = 10e12, 1e12
NOW = D(2026, 11, 9)


def test_tier_large_cap_below_12_5pct():
    assert free_float_deadline(LARGE, 0.10, NOW) == D(2027, 3, 31)
    status = free_float_status(LARGE, 0.10, NOW)
    assert (status.target, status.tier, status.overdue) == (F(125, 1000), "large_below_12_5", False)
    # Once at 12.5%, the next step is 15% by 31 Mar 2028.
    assert free_float_deadline(LARGE, 0.13, D(2027, 6, 30), base_float_ratio=0.10) == D(2028, 3, 31)
    # Missing the interim step leaves it overdue.
    late = free_float_status(LARGE, 0.10, D(2027, 4, 1))
    assert (late.deadline, late.overdue) == (D(2027, 3, 31), True)


def test_tier_large_cap_12_5_to_15pct():
    assert free_float_deadline(LARGE, 0.13, NOW) == D(2027, 3, 31)
    assert free_float_deadline(LARGE, 0.125, NOW) == D(2027, 3, 31)
    assert free_float_status(LARGE, 0.125, NOW).tier == "large_12_5_to_15"
    assert free_float_status(LARGE, 0.1499, NOW).target == F(15, 100)


def test_tier_small_cap():
    assert free_float_deadline(SMALL, 0.05, NOW) == D(2029, 3, 31)
    assert free_float_deadline(SMALL, 0.14, NOW) == D(2029, 3, 31)
    assert free_float_deadline(5e12 - 1, 0.10, NOW) == D(2029, 3, 31)
    assert free_float_deadline(5e12, 0.10, NOW) == D(2027, 3, 31)  # Rp5 trillion counts as large


def test_tier_compliant_and_rule_dates():
    assert free_float_deadline(LARGE, 0.15, NOW) is None
    assert free_float_deadline(SMALL, 0.60, NOW) is None
    assert free_float_deadline(LARGE, 0.05, D(2026, 3, 30)) is None  # 7.5% rule, no schedule
    assert free_float_deadline(LARGE, 0.05, D(2026, 3, 31)) == D(2027, 3, 31)  # Kep-00045 in force
    assert free_float_deadline(SMALL, 0.05, D(2026, 5, 1)) == D(2029, 3, 31)
    fell = free_float_status(LARGE, 0.12, NOW, base_float_ratio=0.20)
    assert (fell.deadline, fell.overdue) == (D(2026, 3, 31), True)


def test_free_float_inputs_are_checked():
    with pytest.raises(ValueError):
        free_float_deadline(LARGE, 1.5, NOW)
    with pytest.raises(ValueError):
        free_float_deadline(-1, 0.1, NOW)
    with pytest.raises(RuleGapError):
        free_float_deadline(LARGE, 0.1, D(2019, 6, 1))


def test_free_float_minimums_over_time():
    assert rules.free_float_rule(D(2020, 1, 2)).min_ratio == F(75, 1000)
    assert rules.free_float_rule(D(2026, 3, 30)).min_ratio == F(75, 1000)
    assert rules.free_float_rule(D(2026, 3, 31)).min_ratio == F(15, 100)
    current = rules.free_float_rule(NOW)
    assert current.source.doc == "Kep-00152/BEI/10-2026"
    assert current.min_shares == 50_000_000
    assert any("controlling shareholder" in x for x in current.excluded)


# --------------------------------------------------------------------------
# Events
# --------------------------------------------------------------------------


def test_events_are_dated_sourced_one_line_markers():
    assert list(EVENTS) == sorted(EVENTS, key=lambda e: e.on)
    for e in EVENTS:
        assert RULEBOOK_START <= e.on <= RULEBOOK_CHECKED, e
        assert e.label and "\n" not in e.label and len(e.label) <= 100, e.label
        assert e.kind in {"msci", "rule", "data", "index", "halt"}, e.kind
        assert e.announced is None or e.announced <= e.on
    for e in SCHEDULED:
        assert e.on > RULEBOOK_CHECKED, e


@pytest.mark.parametrize(
    "day, kind, words",
    [
        (D(2026, 1, 28), "msci", "freezes"),
        (D(2026, 4, 21), "msci", "keeps the freeze"),
        (D(2026, 10, 16), "msci", "Standalone"),
        (D(2026, 3, 3), "data", "above 1%"),
        (D(2026, 10, 30), "data", "controllers"),
        (D(2026, 11, 2), "index", "leave IHSG"),
        (D(2026, 8, 3), "rule", "Notation P"),
        (D(2026, 3, 31), "rule", "15%"),
        (D(2026, 10, 9), "rule", "Peraturan I-A"),
    ],
)
def test_required_events_are_present(day, kind, words):
    assert any(e.on == day and e.kind == kind and words in e.label for e in EVENTS)


def test_every_rule_change_has_a_marker():
    marked = {e.on for e in EVENTS if e.kind == "rule"}
    starts = {
        r.effective_from
        for table in (rules.PRICE_LIMIT_RULES, rules.HALT_RULES, rules.FREE_FLOAT_RULES)
        for r in table
        if RULEBOOK_START < r.effective_from <= RULEBOOK_CHECKED
    }
    assert starts <= marked, sorted(starts - marked)


# --------------------------------------------------------------------------
# Table integrity and provenance
# --------------------------------------------------------------------------


def _check_contiguous(entries, name, starts_by=RULEBOOK_START, open_ended=True):
    ordered = sorted(entries, key=lambda e: e.effective_from)
    assert ordered[0].effective_from <= starts_by, f"{name}: nothing in force on {starts_by}"
    for a, b in zip(ordered, ordered[1:]):
        assert a.effective_to is not None, f"{name}: {a.source.doc} is open-ended but followed by {b.source.doc}"
        assert b.effective_from == a.effective_to + dt.timedelta(days=1), f"{name}: gap or overlap after {a.source.doc}"
    for e in ordered:
        assert e.effective_to is None or e.effective_from <= e.effective_to, e
    if open_ended:
        assert ordered[-1].effective_to is None, f"{name}: no rule in force on {RULEBOOK_CHECKED}"


def test_tables_have_no_gaps_or_overlaps():
    for board in sorted(rules.BOARDS):
        entries = [r for r in rules.PRICE_LIMIT_RULES if board in r.boards]
        starts_by = D(2023, 6, 12) if board == "special_monitoring" else RULEBOOK_START
        _check_contiguous(entries, f"price limits ({board})", starts_by, open_ended=board not in rules.REGULAR_BOARDS)
    regular = [r for r in rules.PRICE_LIMIT_RULES if r.boards == rules.REGULAR_BOARDS]
    assert max(r.effective_to for r in regular) == D(2026, 12, 31)
    for name in ("first_day", "ticks", "rounding", "reference_price", "halts", "free_float"):
        _check_contiguous(rules.TABLES[name], name)
    for tier in ("large_below_12_5", "large_12_5_to_15", "small"):
        _check_contiguous([t for t in rules.FREE_FLOAT_TIERS if t.name == tier], tier, rules.FREE_FLOAT_CLASSIFICATION_DATE)
    for code in {n.code for n in rules.NOTATIONS}:
        assert len([n for n in rules.NOTATIONS if n.code == code]) == 1, code
    assert all(rules.price_limit_rule(RULEBOOK_START, b) for b in ("main", "acceleration"))


def test_bands_and_ticks_are_well_formed():
    for rule in rules.PRICE_LIMIT_RULES + rules.SCHEDULED_PRICE_LIMIT_RULES:
        bounds = [b.up_to for b in rule.bands]
        assert bounds[-1] is None and all(x is not None for x in bounds[:-1])
        assert bounds[:-1] == sorted(bounds[:-1])
        for band in rule.bands:
            for side in (band.upper, band.lower):
                assert side.pct is None or 0 < side.pct < 1
                assert side.rupiah is None or side.rupiah > 0
    for rule in rules.TICK_RULES:
        assert rule.bands[0][0] == 0
        for (start_a, tick_a), (start_b, tick_b) in zip(rule.bands, rule.bands[1:]):
            # Rounding to the tick at the limit price only lands on valid prices if each band
            # starts on a multiple of both neighbouring ticks.
            assert start_a < start_b and start_b % tick_a == 0 and start_b % tick_b == 0


def test_every_entry_has_a_source_and_unconfirmed_entries_say_why():
    for name, table in rules.TABLES.items():
        assert table, name
        for e in table:
            assert isinstance(e.confirmed, bool)
            assert e.source.doc.strip(), (name, e)
            for url in (e.source.url, *e.source.also):
                assert url.startswith("https://"), (name, url)
            if not e.confirmed:
                assert e.note.startswith("Not confirmed"), (name, e.source.doc, e.note[:60])
    flagged = rules.unconfirmed()
    assert flagged and all(not e.confirmed for _, e in flagged)
    assert {name for name, _ in flagged} >= {"rounding", "price_limits", "notations"}


def test_manifest_is_json_ready():
    data = json.loads(json.dumps(rules.manifest()))
    assert data["checked"] == RULEBOOK_CHECKED.isoformat()
    first = data["tables"]["price_limits"][0]
    assert first["source"]["doc"] == "Kep-00113/BEI/12-2016"
    assert first["bands"][0]["upper"]["pct"] == pytest.approx(0.35)


def test_module_needs_no_third_party_packages():
    code = "import sys, tools.investability_monitor.rules; print(sorted(m for m in ('pandas', 'numpy', 'requests') if m in sys.modules))"
    out = subprocess.run([sys.executable, "-c", code], cwd=REPO, capture_output=True, text=True, check=True)
    assert out.stdout.strip() == "[]"
