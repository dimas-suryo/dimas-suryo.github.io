"""Synthetic >1% register workbooks in the layout of the 2026 files, shared by the tests."""
from __future__ import annotations

import datetime as dt

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
    ("BBBB", "Holder B2", "Space Agency", None, "L", 40_000_000, 2.0),  # a class the parser does not know
]


def workbook(path, holdings=HOLDINGS, *, header=HEADER, dates=None, day: dt.datetime = DAY):
    import openpyxl

    class_col = "INVESTOR_TYPE" if "INVESTOR_TYPE" in header else "INVESTOR_CLASSIFICATION"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["*Penafian:\n1. Sumber data ..."])
    ws.append(["*Disclaimer:\n1. Sources of data ..."])
    ws.append(["[PUBLIC]"])
    ws.append([])
    ws.append(header)
    for i, (code, name, cls, flag, lf, shares, pct) in enumerate(holdings):
        row = {"DATE": (dates or {}).get(i, day), "SHARE_CODE": code, "ISSUER_NAME": f"Issuer {code} Tbk",
               "INVESTOR_NAME": name, class_col: cls, "CONTROLLER_OR_AFFILIATE": flag,
               "LOCAL_FOREIGN": lf, "NATIONALITY": None, "DOMICILE": None,
               "HOLDINGS_SCRIPLESS": shares, "HOLDINGS_SCRIP": 0, "TOTAL_HOLDING_SHARES": shares, "PERCENTAGE": pct}
        ws.append([row.get(h) for h in header])
    wb.save(path)
    return path
