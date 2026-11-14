"""Tests for the >1% register parser. The workbooks are synthetic, in the layout of the 30 Oct 2026 file."""
from __future__ import annotations

import datetime as dt

import pytest

openpyxl = pytest.importorskip("openpyxl")

from tools.investability_monitor.idx_client import SchemaError
from tools.investability_monitor.ownership import aggregate, below, load_register, unrecognized_classes

HEADER = ["DATE", "SHARE_CODE", "ISSUER_NAME", "INVESTOR_NAME", "INVESTOR_CLASSIFICATION",
          "CONTROLLER_OR_AFFILIATE", "LOCAL_FOREIGN", "NATIONALITY", "DOMICILE",
          "HOLDINGS_SCRIPLESS", "HOLDINGS_SCRIP", "TOTAL_HOLDING_SHARES", "PERCENTAGE"]
DAY = dt.datetime(2026, 10, 30)

# (code, investor, class, controller flag, local/foreign, shares, percent)
HOLDINGS = [
    ("AAAA", "Holder A1", "Corporate", "CONTROLLER", "L", 600_000_000, 60.0),
    ("AAAA", "Holder A2", "Individual", "AFFILIATE OF THE CONTROLLER", "L", 50_000_000, 5.0),
    ("AAAA", "Holder A3", "Mutual Funds", None, "L", 30_000_000, 3.0),
    ("AAAA", "Holder A4", "Private Bank", None, "F", 70_000_000, 7.0),
    ("AAAA", "Holder A5", "Individual", None, "L", 20_000_000, 2.0),
    ("AAAA", "Holder A6", None, None, None, 10_000_000, 1.0),  # paper certificates: no class
    (True, "Holder T1", "Corporate", "CONTROLLER", "L", 400_000_000, 80.0),  # Excel's reading of ticker TRUE
    ("BBBB", "Holder B1", "Sovereign Wealth Fund", None, "F", 100_000_000, 5.0),
    ("BBBB", "Holder B2", "Space Agency", None, "L", 40_000_000, 2.0),  # a class this module does not know
]


def workbook(path, holdings=HOLDINGS, *, header=HEADER, dates=None):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["*Penafian:\n1. Sumber data ..."])
    ws.append(["*Disclaimer:\n1. Sources of data ..."])
    ws.append(["[PUBLIC]"])
    ws.append([])
    ws.append(header)
    for i, (code, name, cls, flag, lf, shares, pct) in enumerate(holdings):
        row = {"DATE": (dates or {}).get(i, DAY), "SHARE_CODE": code, "ISSUER_NAME": f"Issuer {code} Tbk",
               "INVESTOR_NAME": name, "INVESTOR_CLASSIFICATION": cls, "CONTROLLER_OR_AFFILIATE": flag,
               "LOCAL_FOREIGN": lf, "NATIONALITY": None, "DOMICILE": None,
               "HOLDINGS_SCRIPLESS": shares, "HOLDINGS_SCRIP": 0, "TOTAL_HOLDING_SHARES": shares, "PERCENTAGE": pct}
        ws.append([row.get(h) for h in header])
    wb.save(path)
    return path


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

    def test_missing_column(self, tmp_path):
        header = [h for h in HEADER if h != "PERCENTAGE"] + ["PCT"]
        with pytest.raises(SchemaError, match="SHARE_CODE and PERCENTAGE"):
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
        assert a["float_idx_like"] == pytest.approx(1 - 0.65 - 0.07)  # minus the nominee's 7% stake
        assert a["float_adjusted"] == pytest.approx(1 - 0.65 - 0.02 - 0.01)  # minus the individual and the scrip holder
        assert a["float_strict"] == pytest.approx(1 - 0.65 - 0.02 - 0.01 - 0.07)
        assert a["nominee"] == pytest.approx(0.07) and a["foreign_1pct"] == pytest.approx(0.07)
        assert a["top_holder"] == pytest.approx(0.60) and a["n_holders"] == 6
        assert a["hhi"] == pytest.approx(0.36 + 0.0025 + 0.0009 + 0.0049 + 0.0004 + 0.0001)
        assert a["listed_shares_est"] == 1_000_000_000
        assert bool(a["controller_flags"])

    def test_ticker_true_and_a_stock_without_controller(self, reg):
        out = aggregate(reg)
        assert out.loc["TRUE", "float_idx_like"] == pytest.approx(0.20)
        b = out.loc["BBBB"]
        assert b["controller"] == 0 and b["float_idx_like"] == pytest.approx(0.95)  # the 5% fund counts under IDX's rule
        assert b["float_adjusted"] == pytest.approx(0.98)  # but not under ours: funds are float

    def test_no_holder_name_in_the_output(self, reg):
        text = aggregate(reg).to_csv()
        assert "Holder" not in text and "Issuer" not in text

    def test_below(self, reg):
        out = aggregate(reg)
        assert set(out.index[below(out, "float_idx_like")]) == set()
        assert set(out.index[below(out, "float_idx_like", 0.25)]) == {"TRUE"}
