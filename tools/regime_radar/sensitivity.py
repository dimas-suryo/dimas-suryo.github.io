"""Robustness check: do the "what followed" results survive other reasonable choices?

Re-runs the classification and the forward-outcome table under a set of
parameter variants and two halves of the history, then writes one markdown
report. Nothing here feeds the live page; it exists to answer "is this finding
an artifact of 50/200/60 and three-day confirmation?" before anyone writes it up.

Run from the repo root (needs internet for yfinance):
    python -m tools.regime_radar.sensitivity --out sensitivity.md
    python -m tools.regime_radar.sensitivity --tickers ^JKSE --reps 500
Offline, from a CSV with date and close columns:
    python -m tools.regime_radar.sensitivity --prices-csv jkse.csv --tickers ^JKSE

Reading the report: each cell is the median over the next horizon, the 95%
episode-bootstrap interval in brackets, and the episode count. An asterisk
means the gap to the all-days median has an interval that excludes zero.
With dozens of cells per ticker, a few asterisks will appear by chance alone
(at 95%, about one in twenty), so look for patterns that hold across variants,
not single stars.
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

import pandas as pd

from .build import PARAMS, TREND_ORDER, VOL_ORDER, classify, summarize
from .data import clean_prices, fetch_prices
from .universe import UNIVERSE, Ticker

# (name, parameter overrides, period). Period is (start, end) on labeled days, or
# "first_half" / "second_half", split at the midpoint of the labeled history so
# there is no cutoff date to pick.
VARIANTS: list[tuple[str, dict, tuple[str | None, str | None] | str]] = [
    ("Baseline (50/200/60, confirm 3)", {}, (None, None)),
    ("No confirmation", {"confirm_days": 1}, (None, None)),
    ("Confirm 5 days", {"confirm_days": 5}, (None, None)),
    ("Faster trend (20/100/40)", {"trend_short": 20, "trend_long": 100, "trend_slope_window": 40}, (None, None)),
    ("Slower trend (100/300/90)", {"trend_short": 100, "trend_long": 300, "trend_slope_window": 90}, (None, None)),
    ("Vol window 63 days", {"vol_window": 63}, (None, None)),
    ("Vol baseline 3 years", {"vol_quantile_lookback": 252 * 3}, (None, None)),
    ("Vol cuts 20/80", {"vol_quantile_breaks": [0.2, 0.8]}, (None, None)),
    ("Horizon 63 days", {"stats_horizon": 63}, (None, None)),
    ("Baseline, first half of history", {}, "first_half"),
    ("Baseline, second half of history", {}, "second_half"),
]

TREND_NAMES = {"up": "Up", "sideways": "Sideways", "down": "Down"}
VOL_NAMES = {"low": "Low", "mid": "Mid", "high": "High"}


def _pct(x: float | None, d: int = 1) -> str:
    if x is None:
        return "n/a"
    v = round(x * 100, d)
    return f"{0.0 if v == 0 else v:.{d}f}%"  # no "-0.0%"


def _cell(row: dict, metric: str, d: int = 1) -> str:
    """'0.7%* [0.1%, 1.3%] 28 ep' or 'n/a' when a label never occurred."""
    v = row.get(metric)
    if v is None:
        return "n/a"
    ci = (row.get("ci") or {}).get(metric)
    star = ""
    band = ""
    if ci:
        lo, hi = ci["gap_ci"]
        star = "*" if (lo > 0 or hi < 0) else ""
        band = f" [{_pct(ci['ci'][0], d)}, {_pct(ci['ci'][1], d)}]"
    else:
        band = " (too few episodes)"
    return f"{_pct(v, d)}{star}{band}, {row['episodes']} ep"


def run_variants(prices: pd.DataFrame, reps: int, variants=VARIANTS) -> list[dict]:
    """One summary per variant. Classification is cached per parameter set."""
    cache: dict[str, pd.DataFrame] = {}
    out = []
    for name, overrides, period in variants:
        p = {**PARAMS, **overrides, "bootstrap_reps": reps}
        key = repr(sorted((k, repr(v)) for k, v in p.items() if k != "stats_horizon"))
        if key not in cache:
            cache[key] = classify(prices, p)
        df = cache[key]
        if df.empty:
            out.append({"name": name, "stats": None})
            continue
        if isinstance(period, str):
            mid = df.index[len(df) // 2]
            if period == "first_half":
                start, end = None, (mid - pd.Timedelta(days=1)).strftime("%Y-%m-%d")
            else:
                start, end = mid.strftime("%Y-%m-%d"), None
        else:
            start, end = period
        st = summarize(df, prices["close"], p, start=start, end=end)
        if isinstance(period, str) and st["first_date"]:
            name = f"{name}, {st['first_date'][:4]} to {st['last_date'][:4]}"
        out.append({"name": name, "stats": st})
    return out


def _table(results: list[dict], group: str, order: list[str], names: dict, metric: str, d: int) -> list[str]:
    head = "| Variant | " + " | ".join(names[k] for k in order) + " | All days |"
    lines = [head, "|" + " --- |" * (len(order) + 2)]
    for r in results:
        st = r["stats"]
        if st is None:
            lines.append(f"| {r['name']} | " + " | ".join(["no data"] * (len(order) + 1)) + " |")
            continue
        by = {row["label"]: row for row in st[group]}
        cells = [_cell(by[k], metric, d) for k in order]
        a = st["all"]
        a_ci = (a.get("ci") or {}).get(metric)
        all_cell = _pct(a.get(metric), d) + (f" [{_pct(a_ci['ci'][0], d)}, {_pct(a_ci['ci'][1], d)}]" if a_ci else "")
        horizon = f" ({st['horizon_days']}d)" if st["horizon_days"] != PARAMS["stats_horizon"] else ""
        lines.append(f"| {r['name']}{horizon} | " + " | ".join(cells) + f" | {all_cell} |")
    return lines


def report(ticker: Ticker, prices: pd.DataFrame, results: list[dict]) -> str:
    base = next((r["stats"] for r in results if r["stats"]), None)
    span = f"{base['first_date']} to {base['last_date']}" if base else "n/a"
    h = PARAMS["stats_horizon"]
    out = [
        f"## {ticker.display_name} ({ticker.symbol})",
        "",
        f"Prices {prices.index[0]:%Y-%m-%d} to {prices.index[-1]:%Y-%m-%d}; baseline labels {span}.",
        "",
        f"### Trend label: median return over the next {h} trading days",
        "",
        *_table(results, "trend", TREND_ORDER, TREND_NAMES, "median_return", 1),
        "",
        f"### Trend label: share of {h}-day windows that ended up",
        "",
        *_table(results, "trend", TREND_ORDER, TREND_NAMES, "share_positive", 0),
        "",
        f"### Volatility label: median realized volatility over the next {h} trading days",
        "",
        *_table(results, "vol", VOL_ORDER, VOL_NAMES, "median_vol", 1),
        "",
    ]
    return "\n".join(out)


def _load_csv(path: Path) -> pd.DataFrame:
    raw = pd.read_csv(path)
    raw.columns = [c.lower() for c in raw.columns]
    raw["date"] = pd.to_datetime(raw["date"]).dt.normalize()
    df = raw.set_index("date").sort_index()[["close"]]
    for c in ("open", "high", "low"):
        df[c] = df["close"]
    df["volume"] = 0
    return df


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tickers", default=",".join(t.symbol for t in UNIVERSE))
    ap.add_argument("--reps", type=int, default=1000, help="bootstrap replicates per cell (default 1000)")
    ap.add_argument("--prices-csv", type=Path, help="offline input with date,close columns (one ticker only)")
    ap.add_argument("--out", type=Path, default=Path("sensitivity.md"))
    args = ap.parse_args(argv)

    wanted = [s.strip() for s in args.tickers.split(",") if s.strip()]
    known = {t.symbol: t for t in UNIVERSE}
    tickers = [known.get(s, Ticker(s, s, "index")) for s in wanted]
    if args.prices_csv and len(tickers) != 1:
        ap.error("--prices-csv needs exactly one ticker")

    sections = [
        "# Regime Radar sensitivity report",
        "",
        f"Generated {dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M} UTC. "
        f"Each cell: median, [95% episode-bootstrap interval], episode count. "
        f"`*` = the gap to the all-days median has an interval excluding zero. "
        f"Expect about one chance asterisk per twenty cells; trust patterns across rows, not single stars.",
        "",
    ]
    failed = 0
    for t in tickers:
        try:
            if args.prices_csv:
                prices = _load_csv(args.prices_csv)
            else:
                prices = fetch_prices(t.symbol, start=PARAMS["history_start"], stooq_symbol=t.stooq)
                prices, _ = clean_prices(prices, tz=t.tz, close_time=t.close_time, bad_print_floor=t.bad_print_floor)
            print(f"  · {t.symbol}: {len(prices)} rows, running {len(VARIANTS)} variants", file=sys.stderr)
            sections.append(report(t, prices, run_variants(prices, args.reps)))
        except Exception as e:
            failed += 1
            sections += [f"## {t.display_name} ({t.symbol})", "", f"Failed: {type(e).__name__}: {e}", ""]
            print(f"  ✗ {t.symbol}: {e}", file=sys.stderr)

    args.out.write_text("\n".join(sections))
    print(f"Wrote {args.out}")
    return 1 if failed == len(tickers) else 0


if __name__ == "__main__":
    raise SystemExit(main())
