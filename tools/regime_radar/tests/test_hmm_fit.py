"""Fitting tests for hmm_refit.py. Need hmmlearn (requirements-research.txt);
skipped in the daily build, which does not install it."""
from __future__ import annotations

import numpy as np
import pytest

hmmlearn = pytest.importorskip("hmmlearn")



def _two_regime_returns(n=2400, seed=3):
    rng = np.random.default_rng(seed)
    out, calm = [], True
    while len(out) < n:
        k = rng.integers(150, 400) if calm else rng.integers(30, 90)
        out += list(rng.normal(0.05, 0.7, k) if calm else rng.normal(-0.2, 2.5, k))
        calm = not calm
    return np.array(out[:n])


def test_fit_orders_states_by_variance_and_recovers_them():
    from tools.regime_radar.hmm_refit import fit_best

    params, raw, m, order = fit_best(_two_regime_returns(), k=2, n_init=3)
    sd = np.sqrt(params.variances)
    assert sd[0] < sd[1]
    assert sd[0] == pytest.approx(0.7, rel=0.15) and sd[1] == pytest.approx(2.5, rel=0.15)
    assert raw == order[-1]


def test_monthly_refits_end_to_end():
    import pandas as pd

    from tools.regime_radar.hmm_refit import monthly_refits, summarize_churn

    x = _two_regime_returns(1200)
    r = pd.Series(x, index=pd.bdate_range("2009-01-01", periods=len(x)))
    mon = monthly_refits(r, start="2011-01", k=2, n_init=1, every=6)
    assert len(mon["labels"]) == len(mon["ends"]) >= 3
    assert all(len(a) < len(b) for a, b in zip(mon["labels"][:-1], mon["labels"][1:]))
    rt = mon["realtime"].dropna()
    assert rt.index[0] > mon["ends"][0] and rt.between(0, 1).all()
    ch = summarize_churn(mon["labels"], r.index, mon["ends"], mon["probs"])
    assert ch["refits"] == len(mon["labels"]) - 1 and 0 <= ch["median_share_relabeled"] <= 1
