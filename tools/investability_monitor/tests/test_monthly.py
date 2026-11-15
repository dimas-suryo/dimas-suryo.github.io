"""Tests for the monthly ownership step, on synthetic registers and prices."""
from __future__ import annotations

import datetime as dt
import hashlib
import json

import pandas as pd
import pytest

pytest.importorskip("openpyxl")

from tools.investability_monitor import monthly as M

from .workbooks import HEADER, HOLDINGS, workbook

MARCH = dt.datetime(2026, 3, 31)
OCT = dt.datetime(2026, 10, 30)
EEEE_OCT = ("EEEE", "Holder E1", "Corporate", "CONTROLLER", "L", 900_000_000, 90.0)  # a 10% free float
MARCH_ROWS = [  # the February/March layout: KSEI codes, no controller column, A for foreign
    ("AAAA", "Holder A1", "CP", None, "L", 600_000_000, 60.0),
    ("AAAA", "Holder A2", "ID", None, "L", 50_000_000, 5.0),
    ("AAAA", "Holder A4", "IB", None, "A", 70_000_000, 7.0),
    ("EEEE", "Holder E1", "CP", None, "L", 900_000_000, 90.0),
]
MARCH_HEADER = [("INVESTOR_TYPE" if h == "INVESTOR_CLASSIFICATION" else h)
                for h in HEADER if h != "CONTROLLER_OR_AFFILIATE"]


def with_source(path):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    path.with_suffix(".SOURCE.txt").write_text(
        f"file: {path.name}\nsha256: {digest}\nobtained_from: test\noriginal_source: test\n", encoding="utf-8")
    return path


@pytest.fixture
def files(tmp_path):
    march = with_source(workbook(tmp_path / "r-2026-03-31.xlsx", MARCH_ROWS, header=MARCH_HEADER, day=MARCH))
    october = with_source(workbook(tmp_path / "r-2026-10-30.xlsx", HOLDINGS + [EEEE_OCT], day=OCT))
    return [october, march]  # out of order on purpose


PRICES = pd.DataFrame(
    [("AAAA", "2026-03-31", 1000.0), ("EEEE", "2026-03-31", 100.0),
     ("AAAA", "2026-10-29", 900.0), ("EEEE", "2026-10-30", 100.0), ("TRUE", "2026-10-30", 500.0)],
    columns=["code", "date", "close"],
).assign(date=lambda d: pd.to_datetime(d["date"]))
BOARDS = {"TRUE": "acceleration"}
HSC = {"EEEE"}


@pytest.fixture
def built(files):
    return M.build(files, PRICES, BOARDS, HSC)


def by_code(snapshot):
    return {r["code"]: r for r in snapshot["stocks"]}


class TestSnapshots:
    def test_one_per_register_in_date_order(self, built):
        snapshots, series = built
        assert list(snapshots) == ["2026-03-31", "2026-10-30"]
        assert [s["as_of"] for s in series["snapshots"]] == ["2026-03-31", "2026-10-30"]

    def test_market_cap_uses_the_last_close_on_or_before_the_register_date(self, built):
        a = by_code(built[0]["2026-10-30"])["AAAA"]
        assert a["close"] == 900.0  # 29 Oct, the register is dated 30 Oct
        assert a["market_cap_idr"] == 1_000_000_000 * 900
        assert a["float_idx_like"] == pytest.approx(0.28) and a["deadline"] is None

    def test_low_float_stock_gets_its_deadline(self, built):
        e = by_code(built[0]["2026-10-30"])["EEEE"]
        assert e["float_idx_like"] == pytest.approx(0.10) and e["hsc"] is True
        assert (e["deadline"], e["deadline_target"], e["deadline_tier"]) == ("2029-03-31", 0.15, "small")
        assert "overdue" not in e  # never published: the float is an estimate

    def test_no_deadline_for_a_stock_above_15_percent_in_march(self, built):
        # AAAA had 28% in March (60% and 7% holders out); a drop later would not make it "overdue" here.
        a = by_code(built[0]["2026-10-30"])["AAAA"]
        assert a["deadline"] is None and a["deadline_tier"] is None

    def test_no_deadline_on_the_acceleration_board_or_without_a_price(self, built):
        s = by_code(built[0]["2026-10-30"])
        assert s["TRUE"]["board"] == "acceleration" and s["TRUE"]["deadline"] is None
        assert s["BBBB"]["market_cap_idr"] is None and s["BBBB"]["deadline"] is None
        assert built[0]["2026-10-30"]["meta"]["priced"] == 3

    def test_source_manifest(self, built):
        src = built[0]["2026-10-30"]["meta"]["source"]
        assert src["file"] == "r-2026-10-30.xlsx" and len(src["sha256"]) == 64 and src["obtained_from"] == "test"


class TestSeries:
    def test_flagged_only_when_the_register_has_flags(self, built):
        march, october = built[1]["snapshots"]
        assert march["flagged"] is None and october["flagged"] is not None
        assert march["class_column"] == "INVESTOR_TYPE"

    def test_comparable_summary(self, built):
        october = built[1]["snapshots"][1]["comparable"]
        assert october["below_15_count"]["float_idx_like"] == 1  # EEEE
        # Priced: AAAA Rp900bn, EEEE Rp100bn, TRUE Rp250bn. Under 15% IDX-style: EEEE only.
        assert october["below_15_mcap_share"]["float_idx_like"] == pytest.approx(100 / 1250, abs=1e-4)


class TestSafety:
    def test_no_holder_name_in_any_output(self, built):
        text = json.dumps(built[0]) + json.dumps(built[1])
        assert "Holder" not in text and "Issuer" not in text

    def test_name_guard_stops_the_run(self):
        with pytest.raises(M.NameLeakError):
            M.check_no_names(['{"note": "held by Holder A1"}'], {"Holder A1"})

    def test_source_note_must_match_the_file(self, files):
        files[0].with_suffix(".SOURCE.txt").write_text("sha256: " + "0" * 64 + "\n", encoding="utf-8")
        with pytest.raises(ValueError, match="SHA-256"):
            M.read_source(files[0])

    def test_output_is_deterministic(self, built, tmp_path):
        M.write_json(built[1], tmp_path / "a.json")
        M.write_json(built[1], tmp_path / "b.json")
        assert (tmp_path / "a.json").read_bytes() == (tmp_path / "b.json").read_bytes()
