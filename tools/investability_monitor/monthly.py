"""Monthly ownership step: the >1% registers turned into published, name-free JSON.

Run locally after saving a new register and its .SOURCE.txt in
<data dir>/manual/ownership/:

    python -m tools.investability_monitor.monthly             # fetches the Yahoo closes it needs
    python -m tools.investability_monitor.monthly --no-fetch  # price cache only

Writes, under static/data/investability-monitor/:
    ownership/<as_of>.json  per-stock facts for one register
    ownership.json          the monthly market series, with a manifest of sources

Every register is processed on every run, so a replaced file (an IDX copy
instead of the mirror's) flows through on the next run. The output has no build
timestamp, so unchanged inputs give byte-identical files.

Two variants per register:
    flagged     uses CONTROLLER_OR_AFFILIATE (October 2026 on); the per-stock facts
    comparable  ignores the flags; the only variant comparable across months

Holder names exist only in memory. Before anything is written, every holder
name of six characters or more is searched for in the output text. If one is
found, the run stops.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

from . import prices as P
from . import rules
from .ownership import aggregate, load_register, unrecognized_classes
from .paths import data_dir, manual_dir, reference_dir

OUT_DIR = Path("static/data/investability-monitor")
THRESHOLD = 0.15
BASE_DATE = rules.FREE_FLOAT_CLASSIFICATION_DATE  # 31 Mar 2026 fixes each company's I-A tier
LOOKBACK_DAYS = 10  # a register date can fall on a holiday: use the last close before it
NAME_MIN_LEN = 6
FLOATS = ["float_idx_like", "float_adjusted", "float_strict"]


class NameLeakError(RuntimeError):
    """A holder name turned up in output meant for publication."""


# -- inputs -----------------------------------------------------------------


def read_source(xlsx: Path) -> dict:
    """The .SOURCE.txt next to a register, checked against the file's own hash."""
    digest = hashlib.sha256(xlsx.read_bytes()).hexdigest()
    note = xlsx.with_suffix(".SOURCE.txt")
    meta: dict = {"file": xlsx.name, "sha256": digest}
    if note.exists():
        for line in note.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.partition(":")
            if sep:
                meta[key.strip()] = value.strip()
        if meta.get("sha256") != digest:
            raise ValueError(f"{xlsx.name}: SHA-256 differs from its .SOURCE.txt; check which file is right")
    keep = ("file", "sha256", "obtained_from", "original_source", "downloaded")
    return {k: meta[k] for k in keep if k in meta}


def reference_lists() -> tuple[dict[str, str], set[str]]:
    """(code -> board for the special boards, HSC codes) from the committed reference CSVs."""
    ref = reference_dir()
    boards = pd.read_csv(ref / "boards.csv", dtype=str)
    hsc = pd.read_csv(ref / "hsc.csv", dtype=str)
    return dict(zip(boards["code"], boards["board"])), set(hsc["code"])


def closes_on(prices: pd.DataFrame, day: dt.date) -> pd.Series:
    """Each stock's last close on or before `day`, within LOOKBACK_DAYS."""
    lo, hi = pd.Timestamp(day - dt.timedelta(days=LOOKBACK_DAYS)), pd.Timestamp(day)
    window = prices[(prices["date"] >= lo) & (prices["date"] <= hi)]
    return window.sort_values("date").groupby("code")["close"].last()


# -- per register --------------------------------------------------------------


def _with_caps(facts: pd.DataFrame, closes: pd.Series) -> pd.DataFrame:
    out = facts.copy()
    out["close"] = closes.reindex(out.index)
    out["market_cap_idr"] = out["listed_shares_est"] * out["close"]
    return out


def _deadlines(comparable: pd.DataFrame, as_of: dt.date, base: pd.DataFrame | None, boards: dict[str, str]) -> pd.DataFrame:
    """Peraturan I-A transition deadline per stock, estimated from the register.

    Uses the IDX-style float without controller flags on both dates, because the
    31 Mar 2026 register that fixes the tiers has no flags. Mixing a flagged float
    now with an unflagged one then made revealed affiliates look like a fall below
    the rule. Only stocks already in a transition tier get a deadline. No stock is
    ever labelled overdue: the float is an estimate, and that claim is IDX's to make.
    """
    rows = []
    for code, r in comparable.iterrows():
        status = None
        if boards.get(code) != "acceleration" and pd.notna(r["market_cap_idr"]):
            if base is not None and code in base.index and pd.notna(base.at[code, "market_cap_idr"]):
                cap, base_float = base.at[code, "market_cap_idr"], base.at[code, "float_idx_like"]
            else:
                cap, base_float = r["market_cap_idr"], r["float_idx_like"]
            status = rules.free_float_status(float(cap), float(r["float_idx_like"]), as_of,
                                             base_float_ratio=float(base_float))
        in_tier = status is not None and status.tier is not None
        rows.append({
            "code": code,
            "deadline": status.deadline.isoformat() if in_tier and status.deadline else None,
            "deadline_target": float(status.target) if in_tier and status.target is not None else None,
            "deadline_tier": status.tier if in_tier else None,
        })
    return pd.DataFrame(rows).set_index("code")


def _round(x, nd: int = 4):
    if x is None or (isinstance(x, float) and not np.isfinite(x)):
        return None
    return round(float(x), nd)


def stock_records(facts: pd.DataFrame, boards: dict[str, str], hsc: set[str]) -> list[dict]:
    recs = []
    for code, r in facts.sort_index().iterrows():
        recs.append({
            "code": code,
            "board": boards.get(code, "regular"),
            "hsc": code in hsc,
            **{f: _round(r[f]) for f in FLOATS},
            "controller": _round(r["controller"]),
            "nominee": _round(r["nominee"]),
            "foreign_1pct": _round(r["foreign_1pct"]),
            "top_holder": _round(r["top_holder"]),
            "n_holders": int(r["n_holders"]),
            "unknown_1pct": _round(r["unknown_1pct"]),
            "listed_shares_est": int(r["listed_shares_est"]),
            "close": _round(r["close"], 2),
            "market_cap_idr": None if pd.isna(r["market_cap_idr"]) else int(round(r["market_cap_idr"])),
            "deadline": r["deadline"],
            "deadline_target": r["deadline_target"],
            "deadline_tier": r["deadline_tier"],
        })
    return recs


def market_summary(facts: pd.DataFrame) -> dict:
    """Medians, counts and market-cap shares under 15%, and the cap-weighted float gap."""
    priced = facts[facts["market_cap_idr"].notna() & (facts["market_cap_idr"] > 0)]
    mcap = priced["market_cap_idr"]
    total = mcap.sum()
    return {
        "median": {f: _round(facts[f].median()) for f in FLOATS},
        "below_15_count": {f: int((facts[f] < THRESHOLD).sum()) for f in FLOATS},
        "below_15_mcap_share": {f: _round(mcap[priced[f] < THRESHOLD].sum() / total) if total else None for f in FLOATS},
        "float_gap_capweighted": _round(((priced["float_idx_like"] - priced["float_adjusted"]) * mcap).sum() / total)
        if total else None,
    }


def build(files: list[Path], prices: pd.DataFrame, boards: dict[str, str], hsc: set[str]) -> tuple[dict, dict]:
    """(snapshots by as_of, series) for every register in `files`. Pure apart from reading the files."""
    loaded = sorted(((load_register(f), read_source(f)) for f in files), key=lambda x: x[0]["as_of"].iloc[0])
    names = {h for reg, _ in loaded for h in reg["holder"] if len(h) >= NAME_MIN_LEN}

    base = None  # comparable facts on 31 Mar 2026, which fix the I-A tiers
    for reg, _ in loaded:
        if reg["as_of"].iloc[0] == BASE_DATE:
            base = _with_caps(aggregate(reg, use_flags=False), closes_on(prices, BASE_DATE))

    snapshots, series = {}, []
    for reg, source in loaded:
        as_of = reg["as_of"].iloc[0]
        closes = closes_on(prices, as_of)
        flags = bool(reg.attrs.get("controller_flags"))
        comparable = _with_caps(aggregate(reg, use_flags=False), closes)
        flagged = _with_caps(aggregate(reg), closes) if flags else comparable
        facts = flagged.join(_deadlines(comparable, as_of, base, boards))
        unknown_classes = unrecognized_classes(reg)
        snapshots[as_of.isoformat()] = {
            "meta": {
                "as_of": as_of.isoformat(),
                "controller_flags": flags,
                "issuers": int(len(facts)),
                "priced": int(facts["market_cap_idr"].notna().sum()),
                "threshold": THRESHOLD,
                "deadline_basis": ("estimated: IDX-style float without controller flags; tier fixed by market cap "
                                   "and float on 31 Mar 2026; stocks at 15% or more on that date get none"),
                "source": source,
                "unrecognized_classes": unknown_classes,
            },
            "stocks": stock_records(facts, boards, hsc),
        }
        series.append({
            "as_of": as_of.isoformat(),
            "issuers": int(len(facts)),
            "priced": int(facts["market_cap_idr"].notna().sum()),
            "unclassified_holdings": _round(reg["group"].eq("unknown").mean()),
            "class_column": reg.attrs.get("class_column"),
            "comparable": market_summary(comparable),
            "flagged": market_summary(flagged) if flags else None,
            "source": source,
        })

    out = {"meta": {"threshold": THRESHOLD, "variants": ["comparable", "flagged"]}, "snapshots": series}
    check_no_names([json.dumps(snapshots, ensure_ascii=False), json.dumps(out, ensure_ascii=False)], names)
    return snapshots, out


def check_no_names(texts: list[str], names: set[str]) -> None:
    hits = sum(1 for n in names if any(n in t for t in texts))
    if hits:
        raise NameLeakError(f"{hits} holder names found in the output; nothing was written")


# -- prices and files --------------------------------------------------------------


def ensure_prices(codes: list[str], dates: list[dt.date], root: Path, *, fetch: bool) -> pd.DataFrame:
    start, end = min(dates) - dt.timedelta(days=LOOKBACK_DAYS), max(dates)
    cached = P.read_cache(root, start, end)
    have = set(cached["code"])
    missing = sorted(set(codes) - have)
    if fetch and missing:
        new, absent = P.fetch(missing, start, end)
        P.write_cache(new, root)
        if absent:
            print(f"  Yahoo has no data for {len(absent)} codes (they get no market cap)")
        cached = P.read_cache(root, start, end)
    return cached


def write_json(obj: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp_", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Turn the >1% registers into the published ownership JSON.")
    ap.add_argument("--no-fetch", action="store_true", help="use the price cache only")
    ap.add_argument("--out", type=Path, default=OUT_DIR)
    args = ap.parse_args(argv)

    root = data_dir()
    files = sorted((manual_dir(root) / "ownership").glob("*.xlsx"))
    if not files:
        print(f"No registers in {manual_dir(root) / 'ownership'}", file=sys.stderr)
        return 1
    regs = [load_register(f) for f in files]
    codes = sorted({c for r in regs for c in r["code"]})
    dates = sorted({r["as_of"].iloc[0] for r in regs} | {BASE_DATE})
    prices = ensure_prices(codes, dates, root, fetch=not args.no_fetch)
    boards, hsc = reference_lists()

    snapshots, series = build(files, prices, boards, hsc)
    for as_of, payload in snapshots.items():
        write_json(payload, args.out / "ownership" / f"{as_of}.json")
    write_json(series, args.out / "ownership.json")

    print(f"{len(snapshots)} registers -> {args.out}")
    print("as_of        issuers priced  median idx/adj   <15% count idx/adj   <15% mcap idx/adj   gap   (comparable)")
    for s in series["snapshots"]:
        c = s["comparable"]
        print(f"{s['as_of']}  {s['issuers']:7d} {s['priced']:6d}  {c['median']['float_idx_like']:.3f}/{c['median']['float_adjusted']:.3f}"
              f"      {c['below_15_count']['float_idx_like']:4d}/{c['below_15_count']['float_adjusted']:4d}"
              f"          {c['below_15_mcap_share']['float_idx_like'] or 0:.3f}/{c['below_15_mcap_share']['float_adjusted'] or 0:.3f}"
              f"     {c['float_gap_capweighted'] or 0:.3f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
