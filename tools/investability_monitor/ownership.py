"""The monthly register of shareholders above 1% (IDX/KSEI), turned into per-stock ownership facts.

The workbook has one row per holding of 1% or more. It is read into memory and
holder names never leave this module: aggregate() returns codes, shares of
listed shares and counts only, and tests check that no name survives.

Layouts seen so far (the header row is found by name, so its position does not
matter: row 5 in February, row 7 from March):
    Feb-Mar 2026  INVESTOR_TYPE with KSEI's two-letter codes (CP, ID, MF, IB, SC,
                  IS, PF, FD, OT); LOCAL_FOREIGN as L or A (asing), padded with spaces
    Apr-Sep 2026  INVESTOR_CLASSIFICATION with names ("Mutual Funds", ...), some
                  spelled without spaces ("PermanentEstablishment")
    Oct 2026 on   the same, plus CONTROLLER_OR_AFFILIATE
Shared columns: DATE, SHARE_CODE, ISSUER_NAME, INVESTOR_NAME, LOCAL_FOREIGN,
NATIONALITY, DOMICILE, HOLDINGS_SCRIPLESS, HOLDINGS_SCRIP, TOTAL_HOLDING_SHARES,
PERCENTAGE (in percent, 1 to 99.99). Excel turns the ticker TRUE (Triniti
Dinamik) into a boolean, which is mapped back.

Holder groups:
    controller  flagged CONTROLLER or AFFILIATE OF THE CONTROLLER (Oct 2026 on)
    portfolio   funds, insurers, investment managers
    nominee     banks, brokers and private banks holding for clients. Who owns
                those shares cannot be seen, which is MSCI's opacity point.
    strategic   everyone else: individuals, corporates, the state, private equity
    unknown     no classification (paper-certificate holdings), treated as strategic

Per-stock measures, as shares of listed shares (0 to 1):
    controller        controllers and their affiliates
    float_idx_like    1 - (controllers, affiliates and every other holder of 5% or more).
                      IDX's definition minus what the register cannot see (directors'
                      and commissioners' shares, treasury shares, lock-ups), so an
                      upper bound on IDX's own figure.
    float_adjusted    float_idx_like minus strategic and unknown holders of 1% to 5%:
                      the stakes that sit under IDX's 5% line yet are not portfolio
                      investments. float_idx_like - float_adjusted is the float gap.
    float_strict      float_adjusted minus nominee holdings of 1% to 5%
    nominee           all nominee holdings outside the controller group
    unknown_1pct      holdings with no classification (a data-quality marker)
    held_1pct, foreign_1pct, top_holder, n_holders, hhi (Herfindahl of the 1%+ stakes)
    listed_shares_est shares / percentage of the largest holding (within about 1%)

aggregate(reg, use_flags=False) ignores the controller flags. Registers before
October 2026 have none, so that variant is the one comparable across months.
"""
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from .idx_client import SchemaError

REQUIRED = ["DATE", "SHARE_CODE", "INVESTOR_NAME", "LOCAL_FOREIGN", "TOTAL_HOLDING_SHARES", "PERCENTAGE"]
CLASS_COLUMNS = ("INVESTOR_CLASSIFICATION", "INVESTOR_TYPE")  # newer names first
CONTROLLER_COLUMN = "CONTROLLER_OR_AFFILIATE"
CONTROLLER_VALUES = {"CONTROLLER", "AFFILIATE OF THE CONTROLLER"}
FOREIGN = {"F", "A"}  # A = asing, in the February 2026 file
BIG = 0.05  # IDX counts holders of 5% or more as outside the free float

# Every investor class seen in the 2026 registers, by group. Matching ignores case,
# spaces and punctuation. A class not listed here counts as strategic and is
# reported by unrecognized_classes().
GROUPS = {
    "portfolio": [
        "Mutual Funds", "Insurance", "Pension Funds", "Investment Manager", "Investment Advisors",
        "Hedge Fund", "Exchange Traded Funds", "Sovereign Wealth Fund",
        "MF", "IS", "PF",  # KSEI codes, Feb-Mar 2026
    ],
    "nominee": [
        "Securities Company", "Private Bank", "Bank", "Trustee Bank", "Financial Institutional",
        "Brokerage Firms", "Investment Fund Selling Agent", "Capital Market Supporting Institutions and Professions",
        "IB", "SC",
    ],
    "strategic": [
        "Individual", "Corporate", "Firm", "Partnership", "Sole proprietorship",
        "Commanditaire Vennootschap (CV) or Limited partnership", "Cooperatives", "Foundation", "Government",
        "State Owned Enterprises", "State Owned Company", "Private Equity", "Venture Capital",
        "Permanent establishment", "Educational Institution", "Association/social organizations",
        "International organization", "Peer to peer lending", "Diocese",
        "ID", "CP", "FD", "OT",
    ],
}


def _key(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.casefold())


GROUP_OF = {_key(name): group for group, names in GROUPS.items() for name in names}

MEASURES = ["held_1pct", "controller", "float_idx_like", "float_adjusted", "float_strict", "nominee",
            "unknown_1pct", "foreign_1pct", "top_holder", "n_holders", "hhi", "listed_shares_est",
            "controller_flags"]


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
    class_col = next((c for c in CLASS_COLUMNS if c in raw.columns), None)
    missing = [c for c in REQUIRED if c not in raw.columns] + ([] if class_col else [" or ".join(CLASS_COLUMNS)])
    if missing:
        raise SchemaError(f"{path.name}: missing columns {missing}")

    code = raw["SHARE_CODE"].map(_code)
    raw = raw[code != ""].assign(code=code[code != ""])
    dates = pd.to_datetime(raw["DATE"], errors="coerce").dt.date.dropna().unique()
    if len(dates) != 1:
        raise SchemaError(f"{path.name}: expected one DATE, found {sorted(map(str, dates))}")

    has_flags = CONTROLLER_COLUMN in raw.columns
    flag = raw[CONTROLLER_COLUMN].fillna("").astype(str).str.strip().str.upper() if has_flags else None
    holder_class = raw[class_col].fillna("").astype(str).str.strip()
    lf = raw["LOCAL_FOREIGN"].fillna("").astype(str).str.strip().str.upper()
    reg = pd.DataFrame(
        {
            "as_of": dates[0],
            "code": raw["code"],
            "holder": raw["INVESTOR_NAME"].astype(str).str.strip(),
            "holder_class": holder_class,
            "group": holder_class.map(lambda c: GROUP_OF.get(_key(c), "strategic") if c else "unknown"),
            "controller": flag.isin(CONTROLLER_VALUES) if has_flags else False,
            "local_foreign": lf.where(~lf.isin(FOREIGN), "F"),
            "shares": pd.to_numeric(raw["TOTAL_HOLDING_SHARES"], errors="coerce"),
            "pct": pd.to_numeric(raw["PERCENTAGE"], errors="coerce") / 100,
        }
    )
    if reg["pct"].isna().any() or reg["shares"].isna().any():
        raise SchemaError(f"{path.name}: {int(reg['pct'].isna().sum() + reg['shares'].isna().sum())} holdings without numbers")
    reg.attrs["controller_flags"] = has_flags
    reg.attrs["class_column"] = class_col
    return reg.reset_index(drop=True)


def unrecognized_classes(reg: pd.DataFrame) -> list[str]:
    """Investor classes this module does not know (treated as strategic). Empty when all are known."""
    return sorted({c for c in reg["holder_class"] if c and _key(c) not in GROUP_OF})


def aggregate(reg: pd.DataFrame, *, use_flags: bool = True) -> pd.DataFrame:
    """Per-stock ownership measures, indexed by code. Contains no holder names.

    use_flags=False ignores CONTROLLER_OR_AFFILIATE, which makes a register from
    October 2026 on comparable with the earlier ones.
    """
    g = reg.groupby("code")
    codes = g.size().index

    def total(mask: pd.Series) -> pd.Series:
        return reg[mask].groupby("code")["pct"].sum().reindex(codes, fill_value=0.0)

    flags = bool(reg.attrs.get("controller_flags", True)) and use_flags
    ctrl = reg["controller"].astype(bool) & flags
    small = reg["pct"] < BIG
    out = pd.DataFrame(index=codes)
    out["held_1pct"] = g["pct"].sum()
    out["controller"] = total(ctrl)
    out["float_idx_like"] = 1 - (out["controller"] + total(~ctrl & ~small))
    out["float_adjusted"] = out["float_idx_like"] - total(~ctrl & small & reg["group"].isin(["strategic", "unknown"]))
    out["float_strict"] = out["float_adjusted"] - total(~ctrl & small & (reg["group"] == "nominee"))
    out["nominee"] = total(~ctrl & (reg["group"] == "nominee"))
    out["unknown_1pct"] = total(reg["group"] == "unknown")
    out["foreign_1pct"] = total(reg["local_foreign"] == "F")
    out["top_holder"] = g["pct"].max()
    out["n_holders"] = g.size()
    out["hhi"] = (reg["pct"] ** 2).groupby(reg["code"]).sum()
    largest = reg.loc[g["pct"].idxmax()].set_index("code")
    out["listed_shares_est"] = (largest["shares"] / largest["pct"]).round()

    shares_cols = ["held_1pct", "controller", "float_idx_like", "float_adjusted", "float_strict",
                   "nominee", "unknown_1pct", "foreign_1pct"]
    out[shares_cols] = out[shares_cols].clip(0.0, 1.0)
    out["controller_flags"] = flags
    out.attrs["as_of"] = reg["as_of"].iloc[0] if len(reg) else None
    out.index.name = "code"
    return out[MEASURES]


def below(per_stock: pd.DataFrame, column: str, threshold: float = 0.15) -> pd.Series:
    """Codes whose `column` is under `threshold`, as a boolean Series."""
    return per_stock[column] < threshold
