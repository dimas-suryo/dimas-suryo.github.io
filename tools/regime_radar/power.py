"""Power check for the pre-registered test: how often would it detect a real effect?

Simulates 26 years of prices with planted bear markets (a negative drift and
three times the volatility, lasting 120 to 260 days, between calm bull runs of
300 to 700 days), runs the same pipeline and decision rule, and counts how often
the verdict is "supported". Pure noise is included to measure false alarms.

Run:  python -m tools.regime_radar.power            (about a minute)
      python -m tools.regime_radar.power --seeds 30

This is a model of what a real effect might look like, so its numbers describe
the test under that model, not the real world.
"""
from __future__ import annotations

import argparse

import numpy as np
import pandas as pd

from .build import PARAMS, classify, summarize
from .prereg import PREREGISTRATION, evaluate


def _prices(r: np.ndarray) -> pd.DataFrame:
    c = 1000.0 * np.exp(np.cumsum(r))
    idx = pd.bdate_range("2000-01-03", periods=len(r))
    return pd.DataFrame({"open": c, "high": c, "low": c, "close": c, "volume": 0}, index=idx)


def bear_markets(n: int, seed: int, drift: float, vol: float) -> np.ndarray:
    rng = np.random.default_rng(seed)
    out: list[float] = []
    while len(out) < n:
        out += list(rng.normal(0.0006, 0.008, rng.integers(300, 700)))
        out += list(rng.normal(drift, vol, rng.integers(120, 260)))
    return np.array(out[:n])


SCENARIOS = {
    "strong bear markets": lambda n, s: bear_markets(n, s, -0.0015, 0.025),
    "mild bear markets": lambda n, s: bear_markets(n, s, -0.0008, 0.016),
    "pure noise": lambda n, s: np.random.default_rng(s).normal(0.0003, 0.012, n),
}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--seeds", type=int, default=12)
    ap.add_argument("--reps", type=int, default=300)
    args = ap.parse_args(argv)

    p = {**PARAMS, "bootstrap_reps": args.reps}
    spec = PREREGISTRATION["primary"]
    n = 252 * 26
    for name, gen in SCENARIOS.items():
        hits = 0
        gaps = []
        for seed in range(args.seeds):
            px = _prices(gen(n, seed))
            e = evaluate(summarize(classify(px, p), px["close"], p), spec)
            hits += e["verdict"] == "supported"
            if e["gap"] is not None:
                gaps.append(e["gap"])
        med = f"{np.median(gaps) * 100:.1f}%" if gaps else "n/a"
        print(f"{name:<20} supported {hits}/{args.seeds}   median gap {med}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
