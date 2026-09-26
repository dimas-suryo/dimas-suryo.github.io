"""Tests for the NumPy parts of hmm_refit.py. These run in the daily build.
Fitting tests live in test_hmm_fit.py and need hmmlearn."""
from __future__ import annotations

import itertools

import numpy as np
import pytest

from tools.regime_radar.hmm_refit import (
    HMMParams, earliest_change, forward_filter, prob_shift, relabel_share, self_agreement,
)

P = HMMParams(
    startprob=np.array([0.7, 0.3]),
    transmat=np.array([[0.95, 0.05], [0.2, 0.8]]),
    means=np.array([0.1, -0.3]),
    variances=np.array([0.6, 5.0]),
)


def _pdf(x, mu, var):
    return np.exp(-0.5 * (x - mu) ** 2 / var) / np.sqrt(2 * np.pi * var)


def _brute_force_filter(x, p):
    """P(s_t | x_1..t) by summing over every state path. Exponential, fine for tiny T."""
    K, T = len(p.means), len(x)
    out = np.zeros((T, K))
    for t in range(T):
        w = np.zeros(K)
        for path in itertools.product(range(K), repeat=t + 1):
            pr = p.startprob[path[0]] * _pdf(x[0], p.means[path[0]], p.variances[path[0]])
            for i in range(1, t + 1):
                pr *= p.transmat[path[i - 1], path[i]] * _pdf(x[i], p.means[path[i]], p.variances[path[i]])
            w[path[-1]] += pr
        out[t] = w / w.sum()
    return out


def test_forward_filter_matches_brute_force():
    x = np.array([0.2, -2.5, 3.1, 0.05, -0.4, 1.8])
    np.testing.assert_allclose(forward_filter(x, P), _brute_force_filter(x, P), atol=1e-10)


def test_forward_filter_with_prior_continues_the_filter():
    """Filtering in two pieces, passing the last posterior on, equals filtering in one go."""
    x = np.random.default_rng(0).normal(0, 1.5, 40)
    whole = forward_filter(x, P)
    first = forward_filter(x[:25], P)
    second = forward_filter(x[25:], P, prior=first[-1])
    np.testing.assert_allclose(second, whole[25:], atol=1e-12)


def test_forward_filter_uses_no_future_data():
    x = np.random.default_rng(1).normal(0, 1.5, 60)
    a = forward_filter(x[:40], P)
    b = forward_filter(x, P)
    np.testing.assert_allclose(a, b[:40], atol=1e-12)


def test_relabel_metrics():
    prev = np.array([0, 0, 1, 1, 0])
    new = np.array([0, 1, 1, 0, 0, 1, 1])  # two of the five shared days changed
    assert relabel_share(prev, new) == pytest.approx(0.4)
    assert earliest_change(prev, new) == 1
    assert earliest_change(prev, prev.copy()) is None
    assert prob_shift(np.array([0.1, 0.9]), np.array([0.2, 0.9, 0.5])) == pytest.approx(0.05)


def test_self_agreement():
    rt = np.array([0.95, 0.97, 0.05, 0.02, 0.6])
    hind = np.array([1, 0, 0, 0, 1])
    assert self_agreement(rt, hind, 0.9, 1.0) == (0.5, 2)
    assert self_agreement(rt, hind, 0.0, 0.1) == (1.0, 2)
    share, n = self_agreement(rt, hind, 0.3, 0.4)
    assert n == 0 and np.isnan(share)
