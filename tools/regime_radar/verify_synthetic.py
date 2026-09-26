"""Offline check on synthetic IHSG-like data. Not part of the production pipeline.

Shows that the signals recover regimes that were planted on purpose, before
anything touches the real data in GitHub Actions.

Run:  python -m tools.regime_radar.verify_synthetic
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from .build import build_payload
from .universe import Ticker


def synth_prices(seed: int = 42, n_days: int = 252 * 10) -> pd.DataFrame:
    """About ten years of synthetic daily closes with four planted eras.

      1. calm drift up       -> expect mostly vol=low, trend=up
      2. volatile, flat      -> expect vol=high, trend=sideways
      3. crash               -> expect vol=high, trend=down
      4. calm recovery       -> expect vol=low/mid, trend=up
    """
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range("2016-01-04", periods=n_days)
    eras = [
        dict(n=int(n_days * 0.35), mu=0.0006, sigma=0.008),
        dict(n=int(n_days * 0.25), mu=0.0001, sigma=0.022),
        dict(n=int(n_days * 0.15), mu=-0.0030, sigma=0.030),
    ]
    eras.append(dict(n=n_days - sum(e["n"] for e in eras), mu=0.0008, sigma=0.010))
    returns = np.concatenate([rng.normal(e["mu"], e["sigma"], e["n"]) for e in eras])
    close = 5000.0 * np.exp(np.cumsum(returns))
    df = pd.DataFrame(
        {"open": close, "high": close, "low": close, "close": close,
         "volume": rng.integers(1e8, 5e8, n_days)},
        index=dates,
    )
    df.index.name = "date"
    return df


def main() -> None:
    prices = synth_prices()
    payload = build_payload(Ticker("^TEST", "Synthetic", "index"), prices=prices)
    s = payload["series"]
    df = pd.DataFrame(
        {"vol_regime": s["vol_regime"], "trend_regime": s["trend_regime"]},
        index=pd.to_datetime(s["date"]),
    )
    print(f"Rows with labels: {len(df)}")

    n = len(prices)
    bounds = [("calm up", 0, 0.35), ("volatile flat", 0.35, 0.60),
              ("crash", 0.60, 0.75), ("recovery", 0.75, 1.0)]
    print("\nLabel mix per planted era (warmup rows have no labels):")
    for name, lo, hi in bounds:
        sub = df.loc[df.index.intersection(prices.index[int(n * lo):int(n * hi)])]
        if sub.empty:
            print(f"  {name:<14} (still in warmup)")
            continue
        v = sub["vol_regime"].value_counts(normalize=True).round(2).to_dict()
        t = sub["trend_regime"].value_counts(normalize=True).round(2).to_dict()
        print(f"  {name:<14} vol={v}  trend={t}")

    out = Path("/tmp/regime-radar-sample.json")
    out.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"\nSample payload: {out} ({out.stat().st_size / 1024:.0f} KB)")
    print(f"Latest: {payload['latest']}")


if __name__ == "__main__":
    main()
