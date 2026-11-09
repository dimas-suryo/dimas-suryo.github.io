"""Decode the Remarks code in IDX's daily stock summary.

The layout below was inferred from the 6 Nov 2026 summary (963 stocks, every
code 30 characters long). Each field says how sure we are:

    pos 0      corporate action phase: C = cum, X = ex          (inferred: always paired with pos 1)
    pos 1      corporate action kind: D = dividend, R = rights, B = bonus   (inferred)
    pos 2      M or U, meaning unknown (M stocks are larger)    (unknown, kept raw)
    pos 3      O = continuous trading, - = call auction only    (inferred: '-' exactly on boards 3 and 4)
    pos 4      listing board                                    (boards 4 and 5 verified, others inferred)
    pos 5-13   unknown flags                                    (unknown, kept raw)
    pos 14-17  IDX-IC sub-industry code, e.g. A121              (verified by pattern and sector counts)
    pos 18-29  special notations, one letter per position       (the X at pos 29 verified)

"Verified" means checked against something independent. The 70 stocks with
board code 4 are exactly the 70 with notation X, the special monitoring board's
notation. The one stock with board code 5 is the one with notation I, which
rules.NOTATIONS defines as being on the new economy board (I and K both mean
that board, with and without multiple voting shares). Everything marked
inferred still needs the Phase 0 cross-check
against IDX's own board and notation lists. check_layout() reports when a daily
file breaks the assumptions above, so a silent change in IDX's format shows up
in the build log instead of in the charts.

Older summaries use other formats (2020: "--S1K--1"). They decode to version
"legacy" with only the raw code kept, until Phase 0 pins those layouts too.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

import pandas as pd

WIDTH = 30
NOTATION_SLICE = slice(18, 30)
IDX_IC = re.compile(r"^[A-K]\d{3}$")

CA_PHASE = {"C": "cum", "X": "ex"}
CA_KIND = {"D": "dividend", "R": "rights", "B": "bonus"}
BOARDS = {
    "1": "main",
    "2": "development",
    "3": "acceleration",
    "4": "special_monitoring",
    "5": "new_economy",
}
VERIFIED_BOARDS = frozenset({"4", "5"})


@dataclass(frozen=True)
class Remarks:
    raw: str
    version: str  # "v30" or "legacy"
    board_code: str | None = None
    board: str | None = None  # label, None when the code is not in BOARDS
    continuous: bool | None = None
    idx_ic: str | None = None
    notations: frozenset[str] = frozenset()
    ca_phase: str | None = None
    ca_kind: str | None = None
    unknown: str = ""  # pos 2 and 5-13, kept so nothing is lost


def decode(raw: str | None) -> Remarks:
    """One Remarks code. Never raises: anything unexpected stays visible in the result."""
    raw = raw or ""
    if len(raw) != WIDTH:
        return Remarks(raw=raw, version="legacy")
    code = raw[4]
    ic = raw[14:18]
    phase, kind = raw[0], raw[1]
    return Remarks(
        raw=raw,
        version="v30",
        board_code=code,
        board=BOARDS.get(code),
        continuous=raw[3] == "O",
        idx_ic=ic if IDX_IC.match(ic) else None,
        notations=frozenset(c for c in raw[NOTATION_SLICE] if c != "-"),
        ca_phase=CA_PHASE.get(phase, phase if phase != "-" else None),
        ca_kind=CA_KIND.get(kind, kind if kind != "-" else None),
        unknown=raw[2] + raw[5:14],
    )


def decode_frame(df: pd.DataFrame, column: str = "remarks") -> pd.DataFrame:
    """Decoded fields as new columns, vectorized. `notations` is a sorted string, e.g. "LXY"."""
    s = df[column].fillna("").astype(str)
    v30 = s.str.len() == WIDTH
    out = pd.DataFrame(index=df.index)
    out["remarks_version"] = v30.map({True: "v30", False: "legacy"})

    def part(a: int, b: int) -> pd.Series:
        return s.str.slice(a, b).where(v30)

    out["board_code"] = part(4, 5)
    out["board"] = out["board_code"].map(BOARDS)
    out["continuous"] = (part(3, 4) == "O").where(v30)
    ic = part(14, 18)
    out["idx_ic"] = ic.where(ic.str.match(IDX_IC.pattern, na=False))
    out["notations"] = part(18, 30).map(
        lambda x: "".join(sorted(set(x) - {"-"})) if isinstance(x, str) else "", na_action=None
    )
    phase, kind = part(0, 1), part(1, 2)
    out["ca_phase"] = phase.map(lambda c: CA_PHASE.get(c, c) if isinstance(c, str) and c != "-" else None)
    out["ca_kind"] = kind.map(lambda c: CA_KIND.get(c, c) if isinstance(c, str) and c != "-" else None)
    return out


def has_notation(decoded: pd.DataFrame, letter: str) -> pd.Series:
    return decoded["notations"].str.contains(re.escape(letter), regex=True)


def check_layout(decoded: pd.DataFrame) -> list[str]:
    """Plain-language problems with the inferred layout, empty when it still holds."""
    problems = []
    v30 = decoded["remarks_version"] == "v30"
    if not v30.any():
        return problems
    d = decoded[v30]
    x = has_notation(d, "X")
    board4 = d["board_code"] == "4"
    if (x != board4).any():
        problems.append(f"notation X and board code 4 disagree on {int((x != board4).sum())} stocks")
    new_economy = has_notation(d, "I") | has_notation(d, "K")
    board5 = d["board_code"] == "5"
    if (new_economy != board5).any():
        problems.append(f"notations I/K and board code 5 disagree on {int((new_economy != board5).sum())} stocks")
    unknown_boards = sorted(set(d["board_code"].dropna()) - set(BOARDS))
    if unknown_boards:
        problems.append(f"unknown board codes: {', '.join(unknown_boards)}")
    if d["idx_ic"].isna().any():
        problems.append(f"{int(d['idx_ic'].isna().sum())} codes without an IDX-IC sub-industry at pos 14-17")
    half = d["ca_phase"].isna() != d["ca_kind"].isna()
    if half.any():
        problems.append(f"{int(half.sum())} corporate-action flags without their pair")
    continuous_off = d["continuous"] == False  # noqa: E712 (pandas elementwise)
    if (continuous_off != d["board_code"].isin(["3", "4"])).any():
        problems.append("the call-auction flag no longer lines up with boards 3 and 4")
    if (~v30).any():
        problems.append(f"{int((~v30).sum())} codes are not {WIDTH} characters long")
    return problems
