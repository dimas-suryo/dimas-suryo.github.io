"""Orchestrator: fetch → signal → assemble → write JSON. Satu per ticker.

Dijalankan dari root repo dengan:  python -m tools.regime_radar.build
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .data import daily_log_returns, fetch_prices
from .signals import realized_vol, trend_regime, vol_regime
from .universe import UNIVERSE, Ticker, safe_filename

# Parameter terpusat di sini biar mudah di-tweak & ter-record di payload.meta.params.
PARAMS = {
    "lookback_years": 10,
    "vol_window": 21,
    "vol_quantile_breaks": [0.33, 0.67],
    "vol_quantile_lookback": 252 * 5,
    "trend_short": 50,
    "trend_long": 200,
    "trend_slope_window": 60,
}

# Output dir relatif terhadap root repo (Hugo static dir).
OUT_DIR = Path("static/data/regime-radar")


def _to_jsonable(x: Any) -> Any:
    """Numpy/pandas scalar → native Python (np.float64 not JSON-serializable)."""
    if isinstance(x, (np.floating,)):
        v = float(x)
        return None if not np.isfinite(v) else v
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (pd.Timestamp, dt.date, dt.datetime)):
        return pd.Timestamp(x).strftime("%Y-%m-%d")
    if isinstance(x, float):
        return None if not np.isfinite(x) else x
    return x


def _series_to_list(s: pd.Series) -> list:
    return [_to_jsonable(v) for v in s.tolist()]


def build_payload(ticker: Ticker, prices: pd.DataFrame | None = None) -> dict:
    """End-to-end untuk satu ticker. Inject prices=... untuk testing.

    Returns dict matching the schema yang sudah disepakati di Layer 2.
    Rows dengan label NaN (warmup period) di-drop dari series output.
    """
    if prices is None:
        prices = fetch_prices(ticker.symbol, lookback_years=PARAMS["lookback_years"])

    returns = daily_log_returns(prices)
    rv = realized_vol(returns, window=PARAMS["vol_window"])
    vol_lab = vol_regime(
        returns,
        window=PARAMS["vol_window"],
        quantile_breaks=tuple(PARAMS["vol_quantile_breaks"]),
        quantile_lookback=PARAMS["vol_quantile_lookback"],
    )
    trd_lab = trend_regime(
        prices,
        short_window=PARAMS["trend_short"],
        long_window=PARAMS["trend_long"],
        slope_window=PARAMS["trend_slope_window"],
    )

    # Gabung & drop warmup rows (any-NaN). Index = trading dates.
    df = pd.concat(
        {
            "close": prices["close"],
            "realized_vol": rv,
            "vol_regime": vol_lab,
            "trend_regime": trd_lab,
        },
        axis=1,
    ).dropna()

    if df.empty:
        raise ValueError(
            f"{ticker.symbol}: 0 rows after dropping warmup — lookback too short?"
        )

    latest_row = df.iloc[-1]
    latest_date = df.index[-1]

    return {
        "meta": {
            "symbol": ticker.symbol,
            "display_name": ticker.display_name,
            "kind": ticker.kind,
            "generated_at": dt.datetime.now(dt.timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
            "params": PARAMS,
        },
        "series": {
            "date": [_to_jsonable(d) for d in df.index],
            "close": _series_to_list(df["close"]),
            "realized_vol": _series_to_list(df["realized_vol"]),
            "vol_regime": _series_to_list(df["vol_regime"]),
            "trend_regime": _series_to_list(df["trend_regime"]),
        },
        "latest": {
            "date": _to_jsonable(latest_date),
            "close": _to_jsonable(latest_row["close"]),
            "vol_regime": _to_jsonable(latest_row["vol_regime"]),
            "trend_regime": _to_jsonable(latest_row["trend_regime"]),
            "realized_vol_annualized": _to_jsonable(latest_row["realized_vol"]),
        },
    }


def write_payload(payload: dict, out_dir: Path) -> Path:
    """Atomic write ke {out_dir}/{safe_symbol}.json (write-tmp + rename)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    fname = safe_filename(payload["meta"]["symbol"]) + ".json"
    path = out_dir / fname

    fd, tmp_path = tempfile.mkstemp(dir=out_dir, prefix=".tmp_", suffix=".json")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        finally:
            raise
    return path


def main() -> int:
    """Loop universe, build+write tiap ticker, print summary. Exit non-zero kalau ada gagal."""
    out_dir = OUT_DIR
    successes: list[tuple[str, Path]] = []
    failures: list[tuple[str, str]] = []

    for ticker in UNIVERSE:
        try:
            payload = build_payload(ticker)
            path = write_payload(payload, out_dir)
            latest = payload["latest"]
            print(
                f"  ✓ {ticker.symbol:<12} {latest['date']}  "
                f"vol={latest['vol_regime']:<8} trend={latest['trend_regime']:<8} "
                f"→ {path}"
            )
            successes.append((ticker.symbol, path))
        except Exception as e:
            print(f"  ✗ {ticker.symbol:<12} FAILED: {type(e).__name__}: {e}", file=sys.stderr)
            failures.append((ticker.symbol, str(e)))

    print(f"\nDone: {len(successes)} ok, {len(failures)} failed.")
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
