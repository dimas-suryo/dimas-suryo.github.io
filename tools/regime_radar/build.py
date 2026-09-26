"""Build step: fetch, clean, classify, summarize, write JSON. One file per ticker.

Run from the repo root:  python -m tools.regime_radar.build

Writes static/data/regime-radar/<SYMBOL>.json for each ticker in UNIVERSE, then
index.json with the latest reading of every ticker that has a file, and the
Atom feeds of regime changes (see feed.py). A ticker
that fails keeps its previous file, so one broken symbol never blocks the rest.
Exit code is 1 if any ticker failed, so the workflow run still shows red.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .data import clean_prices, daily_log_returns, fetch_prices
from .feed import write_feeds
from .signals import (
    confirm,
    realized_vol,
    trailing_streak,
    trend_components,
    trend_regime,
    vol_regime,
    vol_thresholds,
)
from .stats import baseline, bootstrap_intervals, current_episode, forward_metrics, regime_table
from .universe import UNIVERSE, Ticker, safe_filename

# Every tunable number lives here and is copied into payload.meta.params,
# so each JSON file records the rules that produced it.
PARAMS = {
    "history_start": "2000-01-01",
    "vol_window": 21,
    "vol_quantile_breaks": [0.33, 0.67],
    "vol_quantile_lookback": 252 * 5,
    "trend_short": 50,
    "trend_long": 200,
    "trend_slope_window": 60,
    "confirm_days": 3,
    "stats_horizon": 21,
    "bootstrap_reps": 2000,
    "bootstrap_seed": 7,
    "ci_level": 0.95,
    "min_episodes_for_ci": 5,
}

OUT_DIR = Path("static/data/regime-radar")

TREND_ORDER = ["up", "sideways", "down"]
VOL_ORDER = ["low", "mid", "high"]


def _round_sig(x: Any, sig: int = 6) -> float | None:
    """Round to `sig` significant digits. 6241.89208984375 -> 6241.89, 1.0823456 -> 1.08235."""
    if x is None:
        return None
    v = float(x)
    if not math.isfinite(v):
        return None
    if v == 0:
        return 0.0
    return round(v, sig - 1 - int(math.floor(math.log10(abs(v)))))


def _round_fixed(x: Any, nd: int) -> float | None:
    if x is None:
        return None
    v = float(x)
    return round(v, nd) if math.isfinite(v) else None


def _iso(d: Any) -> str:
    return pd.Timestamp(d).strftime("%Y-%m-%d")


def _pending(raw: pd.Series, confirmed: pd.Series, needed: int) -> dict | None:
    """If today's raw reading disagrees with the confirmed label, how far along the switch is."""
    r, c = raw.iloc[-1], confirmed.iloc[-1]
    if pd.isna(r) or r == c:
        return None
    return {"label": r, "days": trailing_streak(raw), "needed": needed}


def classify(prices: pd.DataFrame, params: dict | None = None) -> pd.DataFrame:
    """Every signal input and label per day, warmup rows dropped.

    Columns: close, ma_short, ma_long, ma_long_change, realized_vol, vol_lo,
    vol_hi, vol_raw, trend_raw, vol_regime, trend_regime (the last two confirmed).
    """
    p = {**PARAMS, **(params or {})}
    returns = daily_log_returns(prices)
    rv = realized_vol(returns, window=p["vol_window"])
    vol_lo, vol_hi = vol_thresholds(rv, tuple(p["vol_quantile_breaks"]), p["vol_quantile_lookback"])
    vol_raw = vol_regime(
        returns,
        window=p["vol_window"],
        quantile_breaks=tuple(p["vol_quantile_breaks"]),
        quantile_lookback=p["vol_quantile_lookback"],
    )
    tc = trend_components(prices, p["trend_short"], p["trend_long"], p["trend_slope_window"])
    trend_raw = trend_regime(prices, p["trend_short"], p["trend_long"], p["trend_slope_window"])

    df = pd.concat(
        {
            "close": prices["close"],
            "ma_short": tc["ma_short"],
            "ma_long": tc["ma_long"],
            "ma_long_change": tc["ma_long_change"],
            "realized_vol": rv,
            "vol_lo": vol_lo,
            "vol_hi": vol_hi,
            "vol_raw": vol_raw,
            "trend_raw": trend_raw,
        },
        axis=1,
    ).dropna()
    if df.empty:
        return df
    # Confirm only after the warmup is gone, so every ticker starts the same way.
    df["vol_regime"] = confirm(df["vol_raw"], p["confirm_days"])
    df["trend_regime"] = confirm(df["trend_raw"], p["confirm_days"])
    return df


def summarize(
    df: pd.DataFrame,
    close: pd.Series,
    params: dict | None = None,
    start: str | None = None,
    end: str | None = None,
) -> dict:
    """The "what followed" block, optionally restricted to labeled days in [start, end].

    Forward outcomes always come from the full close series, so a day near
    `end` still sees its real next 21 days.
    """
    p = {**PARAMS, **(params or {})}
    sub = df
    if start:
        sub = sub[sub.index >= pd.Timestamp(start)]
    if end:
        sub = sub[sub.index <= pd.Timestamp(end)]
    fwd = forward_metrics(close, p["stats_horizon"])

    trend_rows = regime_table(sub["trend_regime"], fwd, TREND_ORDER)
    vol_rows = regime_table(sub["vol_regime"], fwd, VOL_ORDER)
    all_row = baseline(sub.index, fwd)

    boot_kw = dict(
        n_boot=p["bootstrap_reps"],
        seed=p["bootstrap_seed"],
        level=p["ci_level"],
        min_episodes=p["min_episodes_for_ci"],
    )
    for rows, lab_col, order in ((trend_rows, "trend_regime", TREND_ORDER), (vol_rows, "vol_regime", VOL_ORDER)):
        ci = bootstrap_intervals(sub[lab_col], fwd, order, **boot_kw)
        for r in rows:
            r["ci"] = ci.get(r["label"])
        if ci.get("all") and "ci" not in all_row:
            all_row["ci"] = ci["all"]  # the trend and vol draws give near-identical all-days intervals; keep one

    return {
        "horizon_days": p["stats_horizon"],
        "first_date": _iso(sub.index[0]) if len(sub) else None,
        "last_date": _iso(sub.index[-1]) if len(sub) else None,
        "ci_level": p["ci_level"],
        "bootstrap": {"unit": "episode", "reps": p["bootstrap_reps"], "seed": p["bootstrap_seed"]},
        "all": all_row,
        "trend": trend_rows,
        "vol": vol_rows,
    }


def build_payload(
    ticker: Ticker,
    prices: pd.DataFrame | None = None,
    now: dt.datetime | None = None,
    params: dict | None = None,
) -> dict:
    """End to end for one ticker. Pass prices=... in tests to skip the network."""
    p = {**PARAMS, **(params or {})}
    if prices is None:
        prices = fetch_prices(ticker.symbol, start=p["history_start"], stooq_symbol=ticker.stooq)
        prices, notes = clean_prices(
            prices, tz=ticker.tz, close_time=ticker.close_time, now=now,
            bad_print_floor=ticker.bad_print_floor,
        )
        for n in notes:
            print(f"  · {ticker.symbol}: {n}", file=sys.stderr)
    else:
        notes = []

    df = classify(prices, p)
    if df.empty:
        raise ValueError(f"{ticker.symbol}: 0 rows after dropping warmup; history too short?")

    last = df.iloc[-1]
    trend_since, trend_days = current_episode(df["trend_regime"])
    vol_since, vol_days = current_episode(df["vol_regime"])

    def col(name: str, fn) -> list:
        return [fn(v) for v in df[name].tolist()]

    return {
        "meta": {
            "symbol": ticker.symbol,
            "display_name": ticker.display_name,
            "kind": ticker.kind,
            "note": ticker.note,
            "generated_at": dt.datetime.now(dt.timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
            "params": p,
            # What the cleaning step removed, so anyone can audit it.
            "cleaning": notes,
        },
        "series": {
            "date": [_iso(d) for d in df.index],
            "close": col("close", _round_sig),
            "ma_short": col("ma_short", _round_sig),
            "ma_long": col("ma_long", _round_sig),
            "realized_vol": col("realized_vol", lambda v: _round_fixed(v, 5)),
            "vol_lo": col("vol_lo", lambda v: _round_fixed(v, 5)),
            "vol_hi": col("vol_hi", lambda v: _round_fixed(v, 5)),
            "vol_regime": df["vol_regime"].tolist(),
            "trend_regime": df["trend_regime"].tolist(),
        },
        "latest": {
            "date": _iso(df.index[-1]),
            "close": _round_sig(last["close"]),
            "trend_regime": last["trend_regime"],
            "vol_regime": last["vol_regime"],
            "realized_vol_annualized": _round_fixed(last["realized_vol"], 5),
            "trend_since": trend_since,
            "trend_days": trend_days,
            "vol_since": vol_since,
            "vol_days": vol_days,
            "trend_raw": last["trend_raw"],
            "vol_raw": last["vol_raw"],
            "trend_pending": _pending(df["trend_raw"], df["trend_regime"], p["confirm_days"]),
            "vol_pending": _pending(df["vol_raw"], df["vol_regime"], p["confirm_days"]),
            "ma_short": _round_sig(last["ma_short"]),
            "ma_long": _round_sig(last["ma_long"]),
            "ma_long_change": _round_sig(last["ma_long_change"]),
            "vol_lo": _round_fixed(last["vol_lo"], 5),
            "vol_hi": _round_fixed(last["vol_hi"], 5),
        },
        "stats": summarize(df, prices["close"], p),
    }


def _atomic_write_json(obj: dict, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp_", suffix=".json")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        finally:
            raise
    return path


def write_payload(payload: dict, out_dir: Path) -> Path:
    """Write {out_dir}/{safe_symbol}.json atomically (temp file + rename)."""
    return _atomic_write_json(payload, out_dir / (safe_filename(payload["meta"]["symbol"]) + ".json"))


INDEX_LATEST_KEYS = (
    "date", "close", "trend_regime", "vol_regime", "realized_vol_annualized",
    "trend_since", "trend_days", "vol_since", "vol_days",
)


def write_index(out_dir: Path, universe: list[Ticker]) -> Path:
    """index.json: the latest reading of every ticker that has a file, in universe order.

    Built from the files on disk, so a ticker that failed today still appears
    with yesterday's data and its own generated_at. No top-level timestamp:
    if nothing changed, the file does not change and the workflow commits nothing.
    """
    entries = []
    for t in universe:
        fname = safe_filename(t.symbol) + ".json"
        path = out_dir / fname
        if not path.exists():
            continue
        with path.open() as f:
            p = json.load(f)
        entries.append(
            {
                "symbol": t.symbol,
                "display_name": t.display_name,
                "kind": t.kind,
                "file": fname,
                "generated_at": p["meta"]["generated_at"],
                "latest": {k: p["latest"].get(k) for k in INDEX_LATEST_KEYS},
            }
        )
    return _atomic_write_json({"tickers": entries}, out_dir / "index.json")


def main(universe: list[Ticker] | None = None, out_dir: Path = OUT_DIR) -> int:
    universe = UNIVERSE if universe is None else universe
    failures: list[tuple[str, str]] = []

    for ticker in universe:
        try:
            payload = build_payload(ticker)
            path = write_payload(payload, out_dir)
            l = payload["latest"]
            print(
                f"  ✓ {ticker.symbol:<8} {l['date']}  trend={l['trend_regime']:<8} "
                f"vol={l['vol_regime']:<4} -> {path}"
            )
        except Exception as e:
            msg = f"{type(e).__name__}: {e}"
            print(f"  ✗ {ticker.symbol:<8} FAILED: {msg}", file=sys.stderr)
            # GitHub Actions annotation, shows up on the run summary page.
            print(f"::warning title=regime-radar {ticker.symbol}::{msg.splitlines()[0]}")
            failures.append((ticker.symbol, msg))

    write_index(out_dir, universe)
    write_feeds(out_dir, universe)
    print(f"\nDone: {len(universe) - len(failures)} ok, {len(failures)} failed.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
