"""Tests for the >1% register parser. The workbooks are synthetic, in the layouts of the 2026 files."""
from __future__ import annotations

import datetime as dt

import pytest

openpyxl = pytest.importorskip("openpyxl")

from tools.investability_monitor.idx_client import SchemaError
from tools.investability_monitor.ownership import aggregate, below, load_register, unrecognized_classes

from .workbooks import HEADER, HOLDINGS, workbook


@pytest.fixture
def reg(tmp_path):
    return load_register(workbook(tmp_path / "register.xlsx"))


class TestLoad:
    def test_columns_and_values(self, reg):
        assert len(reg) == len(HOLDINGS)
        assert set(reg["as_of"]) == {dt.date(2026, 10, 30)}
        assert sorted(reg["code"].unique()) == ["AAAA", "BBBB", "TRUE"]
        a1 = reg[reg["holder"] == "Holder A1"].iloc[0]
        assert a1["pct"] == pytest.approx(0.60) and a1["controller"] and a1["group"] == "strategic"

    def test_groups(self, reg):
        g = dict(zip(reg["holder"], reg["group"]))
        assert g["Holder A3"] == "portfolio" and g["Holder A4"] == "nominee"
        assert g["Holder A6"] == "unknown" and g["Holder B1"] == "portfolio"
        assert g["Holder B2"] == "strategic"
        assert unrecognized_classes(reg) == ["Space Agency"]

    def test_spelling_variants_are_recognized(self, tmp_path):
        rows = [("CCCC", "Holder C1", "PermanentEstablishment", None, "F", 30_000_000, 3.0),
                ("CCCC", "Holder C2", "Diocese", None, "L", 20_000_000, 2.0)]
        reg = load_register(workbook(tmp_path / "x.xlsx", rows))
        assert unrecognized_classes(reg) == [] and set(reg["group"]) == {"strategic"}

    def test_february_layout_with_ksei_codes(self, tmp_path):
        rows = [("DDDD", "Holder D1", "CP", None, "L         ", 600_000_000, 60.0),
                ("DDDD", "Holder D2", "MF", None, "A         ", 30_000_000, 3.0),
                ("DDDD", "Holder D3", "SC", None, "A", 20_000_000, 2.0),
                ("DDDD", "Holder D4", "ID", None, "L", 10_000_000, 1.0)]
        header = [("INVESTOR_TYPE" if h == "INVESTOR_CLASSIFICATION" else h)
                  for h in HEADER if h != "CONTROLLER_OR_AFFILIATE"]
        reg = load_register(workbook(tmp_path / "feb.xlsx", rows, header=header))
        assert dict(zip(reg["holder"], reg["group"])) == {
            "Holder D1": "strategic", "Holder D2": "portfolio", "Holder D3": "nominee", "Holder D4": "strategic"}
        assert list(reg["local_foreign"]) == ["L", "F", "F", "L"]  # A (asing) means foreign
        d = aggregate(reg).loc["DDDD"]
        assert d["float_idx_like"] == pytest.approx(0.40) and d["float_adjusted"] == pytest.approx(0.39)
        assert d["float_strict"] == pytest.approx(0.37) and d["foreign_1pct"] == pytest.approx(0.05)

    def test_missing_column(self, tmp_path):
        header = [h for h in HEADER if h != "PERCENTAGE"] + ["PCT"]
        with pytest.raises(SchemaError, match="SHARE_CODE and PERCENTAGE"):
            load_register(workbook(tmp_path / "x.xlsx", header=header))

    def test_no_class_column(self, tmp_path):
        header = [h for h in HEADER if h != "INVESTOR_CLASSIFICATION"]
        with pytest.raises(SchemaError, match="INVESTOR_CLASSIFICATION or INVESTOR_TYPE"):
            load_register(workbook(tmp_path / "x.xlsx", header=header))

    def test_mixed_dates(self, tmp_path):
        with pytest.raises(SchemaError, match="one DATE"):
            load_register(workbook(tmp_path / "x.xlsx", dates={0: dt.datetime(2026, 9, 30)}))

    def test_snapshot_without_controller_flags(self, tmp_path):
        header = [h for h in HEADER if h != "CONTROLLER_OR_AFFILIATE"]
        reg = load_register(workbook(tmp_path / "old.xlsx", header=header))
        assert not reg["controller"].any()
        out = aggregate(reg)
        assert not out["controller_flags"].any() and (out["controller"] == 0).all()


class TestAggregate:
    def test_measures(self, reg):
        a = aggregate(reg).loc["AAAA"]
        assert a["held_1pct"] == pytest.approx(0.78)
        assert a["controller"] == pytest.approx(0.65)  # controller and affiliate
        assert a["float_idx_like"] == pytest.approx(1 - 0.65 - 0.07)  # the nominee's 7% is over the 5% line
        assert a["float_adjusted"] == pytest.approx(0.28 - 0.02 - 0.01)  # minus the 1-5% individual and scrip holder
        assert a["float_strict"] == pytest.approx(0.25)  # no nominee between 1% and 5%
        assert a["nominee"] == pytest.approx(0.07) and a["foreign_1pct"] == pytest.approx(0.07)
        assert a["unknown_1pct"] == pytest.approx(0.01)
        assert a["top_holder"] == pytest.approx(0.60) and a["n_holders"] == 6
        assert a["hhi"] == pytest.approx(0.36 + 0.0025 + 0.0009 + 0.0049 + 0.0004 + 0.0001)
        assert a["listed_shares_est"] == 1_000_000_000
        assert bool(a["controller_flags"])

    def test_ticker_true_and_a_stock_without_controller(self, reg):
        out = aggregate(reg)
        assert out.loc["TRUE", "float_idx_like"] == pytest.approx(0.20)
        b = out.loc["BBBB"]
        assert b["controller"] == 0 and b["float_idx_like"] == pytest.approx(0.95)  # a 5% fund is over the line
        assert b["float_adjusted"] == pytest.approx(0.93)  # the 2% holder of an unknown class counts as strategic

    def test_ignoring_flags_matches_the_older_registers(self, reg):
        a = aggregate(reg, use_flags=False).loc["AAAA"]
        assert a["controller"] == 0 and not a["controller_flags"]
        assert a["float_idx_like"] == pytest.approx(1 - 0.60 - 0.05 - 0.07)  # every 5%+ holder, flagged or not
        assert a["float_adjusted"] == pytest.approx(0.28 - 0.02 - 0.01)

    def test_no_holder_name_in_the_output(self, reg):
        text = aggregate(reg).to_csv()
        assert "Holder" not in text and "Issuer" not in text

    def test_below(self, reg):
        out = aggregate(reg)
        assert set(out.index[below(out, "float_idx_like")]) == set()
        assert set(out.index[below(out, "float_idx_like", 0.25)]) == {"TRUE"}
