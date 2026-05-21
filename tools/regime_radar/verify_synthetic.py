"""Local verification — synthetic IDX-like data, jalan tanpa internet.

Dipakai untuk membuktikan signals.py + build.py mengeluarkan output yang masuk
akal SEBELUM kita commit ke GH Actions (yang punya internet & bisa pakai yfinance
betulan). NOT bagian dari production pipeline.

Jalanin:  python -m tools.regime_radar.verify_synthetic
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from .build import build_payload
from .universe import Ticker


def synth_prices(seed: int = 42, n_days: int = 252 * 10) -> pd.DataFrame:
    """Synthetic IDX-Composite-like daily close, ~10 years, dengan 4 regime jelas.

    Designed to exercise BOTH signals:
      - Era 1 (calm, drifting up)       : harusnya didominasi vol=low, trend=up
      - Era 2 (volatile, sideways)      : harusnya banyak vol=high, trend=sideways
      - Era 3 (crash, down)             : harusnya vol=high, trend=down
      - Era 4 (recovery, low vol up)    : harusnya vol=low/mid, trend=up
    """
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range("2016-01-04", periods=n_days)

    eras = [
        dict(n=int(n_days * 0.35), mu=0.0006, sigma=0.008),  # 1: calm up
        dict(n=int(n_days * 0.25), mu=0.0001, sigma=0.022),  # 2: volatile sideways
        dict(n=int(n_days * 0.15), mu=-0.0030, sigma=0.030),  # 3: crash
    ]
    eras.append(dict(n=n_days - sum(e["n"] for e in eras), mu=0.0008, sigma=0.010))  # 4: recovery

    returns = np.concatenate(
        [rng.normal(e["mu"], e["sigma"], e["n"]) for e in eras]
    )
    close = 5000.0 * np.exp(np.cumsum(returns))
    df = pd.DataFrame(
        {
            "open": close,
            "high": close,
            "low": close,
            "close": close,
            "volume": rng.integers(1e8, 5e8, n_days),
        },
        index=dates,
    )
    df.index.name = "date"
    return df


def main() -> None:
    prices = synth_prices()
    ticker = Ticker(symbol="^TEST", display_name="Synthetic IDX-like", kind="index")
    payload = build_payload(ticker, prices=prices)

    # --- Schema sanity ---
    assert set(payload.keys()) == {"meta", "series", "latest"}, payload.keys()
    series = payload["series"]
    n = len(series["date"])
    for k in ("close", "realized_vol", "vol_regime", "trend_regime"):
        assert len(series[k]) == n, f"length mismatch on {k}: {len(series[k])} vs {n}"
    assert all(isinstance(d, str) for d in series["date"]), "dates not iso strings"
    print(f"Schema OK · series length = {n}")

    # --- Distribusi label cek ---
    df = pd.DataFrame(
        {
            "date": pd.to_datetime(series["date"]),
            "close": series["close"],
            "vol_regime": series["vol_regime"],
            "trend_regime": series["trend_regime"],
        }
    ).set_index("date")

    print("\nDistribusi vol_regime (overall):")
    print(df["vol_regime"].value_counts(normalize=True).round(3).to_string())
    print("\nDistribusi trend_regime (overall):")
    print(df["trend_regime"].value_counts(normalize=True).round(3).to_string())

    # --- Per-era cross-check: signal harus menangkap rezim yang kita SUNTIKKAN ---
    n_total = len(prices)
    era_bounds = [
        ("Era 1 calm-up", 0, int(n_total * 0.35)),
        ("Era 2 vol-sideways", int(n_total * 0.35), int(n_total * 0.60)),
        ("Era 3 crash", int(n_total * 0.60), int(n_total * 0.75)),
        ("Era 4 recovery", int(n_total * 0.75), n_total),
    ]
    price_dates = prices.index
    print("\nLabel mix per era (warmup rows skipped automatically):")
    for name, lo, hi in era_bounds:
        era_dates = price_dates[lo:hi]
        sub = df.loc[df.index.intersection(era_dates)]
        if sub.empty:
            print(f"  {name:<22} (warmup — no labels yet)")
            continue
        v = sub["vol_regime"].value_counts(normalize=True).round(2).to_dict()
        t = sub["trend_regime"].value_counts(normalize=True).round(2).to_dict()
        print(f"  {name:<22}  vol={v}  trend={t}")

    # --- Save sample for inspection ---
    out = Path("/tmp/regime-radar-sample.json")
    with out.open("w") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"\nSample payload: {out}  ({out.stat().st_size / 1024:.1f} KB)")
    print(f"Latest snapshot: {payload['latest']}")


if __name__ == "__main__":
    main()
