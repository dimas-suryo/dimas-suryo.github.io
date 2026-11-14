"""The monthly register of shareholders above 1% (IDX/KSEI), turned into per-stock ownership facts.

The workbook has one row per holding of 1% or more. It is read into memory and
holder names never leave this module: aggregate() returns codes, shares of
listed shares and counts only, and a test checks that no name survives.

Layout of the 30 Oct 2026 workbook, the first one with controller flags: four
rows of disclaimers and a blank row, then a header row with
    DATE, SHARE_CODE, ISSUER_NAME, INVESTOR_NAME, INVESTOR_CLASSIFICATION,
    CONTROLLER_OR_AFFILIATE, LOCAL_FOREIGN, NATIONALITY, DOMICILE,
    HOLDINGS_SCRIPLESS, HOLDINGS_SCRIP, TOTAL_HOLDING_SHARES, PERCENTAGE
The header row is found by name, not position. PERCENTAGE is in percent
(1 to 99.99). Excel turns the ticker TRUE (Triniti Dinamik) into a boolean,
which is mapped back. Earlier snapshots (Feb to Sep 2026) have no
CONTROLLER_OR_AFFILIATE column; they load with every flag off and
controller_flags=False in the output.

Holder groups, used by the float measures:
    controller  flagged CONTROLLER or AFFILIATE OF THE CONTROLLER
    portfolio   funds, insurers, investment managers: their stakes count as free float
    nominee     banks, brokers and private banks holding for clients. Who owns
                those shares cannot be seen, which is MSCI's opacity point.
    strategic   everyone else at 1% or more: individuals, corporates, the state,
                private equity, family vehicles
    unknown     no classification (paper-certificate holdings), treated as strategic

Per-stock measures, as shares of listed shares (0 to 1):
    held_1pct         everything held by holders of 1% or more
    controller        controllers and their affiliates
    float_idx_like    1 - (controllers, affiliates and any other holder of 5% or more).
                      IDX's definition minus what the register cannot see (directors'
                      and commissioners' shares, treasury shares, lock-ups), so an
                      upper bound on IDX's own figure.
    float_adjusted    1 - (controllers, strategic and unknown holders): funds, insurers,
                      nominees and everyone under 1% count as float
    float_strict      float_adjusted without the nominee holdings
    nominee           nominee holdings outside the controller group
    foreign_1pct      held by foreign holders of 1% or more
    top_holder, n_holders, hhi (Herfindahl index of the 1%+ stakes)
    listed_shares_est shares / percentage of the largest holding (within about 1%)
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

import numpy as np
import pandas as pd

from .idx_client import SchemaError

REQUIRED = ["DATE", "SHARE_CODE", "INVESTOR_NAME", "INVESTOR_CLASSIFICATION",
            "LOCAL_FOREIGN", "TOTAL_HOLDING_SHARES", "PERCENTAGE"]
CONTROLLER_COLUMN = "CONTROLLER_OR_AFFILIATE"
CONTROLLER_VALUES = {"CONTROLLER", "AFFILIATE OF THE CONTROLLER"}

# Every investor class in the 30 Oct 2026 register, by group. A class that is
# not listed here is treated as strategic and reported by unrecognized_classes().
GROUPS = {
    "portfolio": [
        "Mutual Funds", "Insurance", "Pension Funds", "Investment Manager", "Investment Advisors",
        "Hedge Fund", "Exchange Traded Funds", "Sovereign Wealth Fund",
    ],
    "nominee": [
        "Securities Company", "Private Bank", "Bank", "Trustee Bank", "Financial Institutional",
        "Brokerage Firms", "Investment Fund Selling Agent", "Capital Market Supporting Institutions and Professions",
    ],
    "strategic": [
        "Individual", "Corporate", "Firm", "Partnership", "Sole proprietorship",
        "Commanditaire Vennootschap (CV) or Limited partnership", "Cooperatives", "Foundation", "Government",
        "State Owned Enterprises", "State Owned Company", "Private Equity", "Venture Capital",
        "Permanent establishment", "Educational Institution", "Association/social organizations",
        "International organization", "Peer to peer lending",
    ],
}
GROUP_OF = {name.casefold(): group for group, names in GROUPS.items() for name in names}

MEASURES = ["held_1pct", "controller", "float_idx_like", "float_adjusted", "float_strict", "nominee",
            "foreign_1pct", "top_holder", "n_holders", "hhi", "listed_shares_est", "controller_flags"]


def _find_header(path: Path) -> int:
    head = pd.read_excel(path, header=None, nrows=30, engine="openpyxl")
    for i, row in head.iterrows():
        cells = {str(v).strip() for v in row if pd.notna(v)}
        if {"SHARE_CODE", "PERCENTAGE"} <= cells:
            return int(i)
    raise SchemaError(f"{path.name}: no header row with SHARE_CODE and PERCENTAGE in the first 30 rows")


def _code(v: object) -> str:
    if isinstance(v, bool):  # Excel's reading of the ticker TRUE
        return "TRUE" if v else "FALSE"
    return "" if pd.isna(v) else str(v).strip().upper()


def load_register(path: Path | str) -> pd.DataFrame:
    """One row per holding: as_of, code, holder, holder_class, group, controller, local_foreign, shares, pct."""
    path = Path(path)
    raw = pd.read_excel(path, header=_find_header(path), dtype={"SHARE_CODE": object}, engine="openpyxl")
    raw.columns = [str(c).strip() for c in raw.columns]
    missing = [c for c in REQUIRED if c not in raw.columns]
    if missing:
        raise SchemaError(f"{path.name}: missing columns {missing}")

    code = raw["SHARE_CODE"].map(_code)
    raw = raw[code != ""].assign(code=code[code != ""])
    dates = pd.to_datetime(raw["DATE"], errors="coerce").dt.date.dropna().unique()
    if len(dates) != 1:
        raise SchemaError(f"{path.name}: expected one DATE, found {sorted(map(str, dates))}")

    has_flags = CONTROLLER_COLUMN in raw.columns
    flag = raw[CONTROLLER_COLUMN].fillna("").astype(str).str.strip().str.upper() if has_flags else ""
    holder_class = raw["INVESTOR_CLASSIFICATION"].fillna("").astype(str).str.strip()
    reg = pd.DataFrame(
        {
            "as_of": dates[0],
            "code": raw["code"],
            "holder": raw["INVESTOR_NAME"].astype(str).str.strip(),
            "holder_class": holder_class,
            "group": holder_class.map(lambda c: GROUP_OF.get(c.casefold(), "strategic") if c else "unknown"),
            "controller": flag.isin(CONTROLLER_VALUES) if has_flags else False,
            "local_foreign": raw["LOCAL_FOREIGN"].fillna("").astype(str).str.strip().str.upper(),
            "shares": pd.to_numeric(raw["TOTAL_HOLDING_SHARES"], errors="coerce"),
            "pct": pd.to_numeric(raw["PERCENTAGE"], errors="coerce") / 100,
        }
    )
    if reg["pct"].isna().any() or reg["shares"].isna().any():
        raise SchemaError(f"{path.name}: {int(reg['pct'].isna().sum() + reg['shares'].isna().sum())} holdings without numbers")
    reg.attrs["controller_flags"] = has_flags
    return reg.reset_index(drop=True)


def unrecognized_classes(reg: pd.DataFrame) -> list[str]:
    """Investor classes this module does not know (treated as strategic). Empty when all are known."""
    return sorted({c for c in reg["holder_class"] if c and c.casefold() not in GROUP_OF})


def aggregate(reg: pd.DataFrame) -> pd.DataFrame:
    """Per-stock ownership measures, indexed by code. Contains no holder names."""
    g = reg.groupby("code")

    def total(mask: pd.Series) -> pd.Series:
        return reg[mask].groupby("code")["pct"].sum().reindex(g.size().index, fill_value=0.0)

    ctrl = reg["controller"].astype(bool)
    out = pd.DataFrame(index=g.size().index)
    out["held_1pct"] = g["pct"].sum()
    out["controller"] = total(ctrl)
    big_other = total(~ctrl & (reg["pct"] >= 0.05))
    strategic = total(~ctrl & reg["group"].isin(["strategic", "unknown"]))
    out["nominee"] = total(~ctrl & (reg["group"] == "nominee"))
    out["float_idx_like"] = 1 - (out["controller"] + big_other)
    out["float_adjusted"] = 1 - (out["controller"] + strategic)
    out["float_strict"] = out["float_adjusted"] - out["nominee"]
    out["foreign_1pct"] = total(reg["local_foreign"] == "F")
    out["top_holder"] = g["pct"].max()
    out["n_holders"] = g.size()
    out["hhi"] = (reg["pct"] ** 2).groupby(reg["code"]).sum()
    largest = reg.loc[g["pct"].idxmax()].set_index("code")
    out["listed_shares_est"] = (largest["shares"] / largest["pct"]).round()

    shares_cols = ["held_1pct", "controller", "float_idx_like", "float_adjusted", "float_strict", "nominee", "foreign_1pct"]
    out[shares_cols] = out[shares_cols].clip(0.0, 1.0)
    out["controller_flags"] = bool(reg.attrs.get("controller_flags", True))
    out.attrs["as_of"] = reg["as_of"].iloc[0] if len(reg) else None
    out.index.name = "code"
    return out[MEASURES]


def below(per_stock: pd.DataFrame, column: str, threshold: float = 0.15) -> pd.Series:
    """Codes whose `column` is under `threshold`, as a boolean Series."""
    return per_stock[column] < threshold
