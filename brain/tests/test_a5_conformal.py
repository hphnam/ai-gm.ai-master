"""A5 tests — the conformal quantile is valid and Mondrian is group-conditional."""

from __future__ import annotations

import numpy as np

from conformal.wrap import _mondrian_quantiles, conformal_quantile


def test_conformal_quantile_is_monotone_in_level():
    scores = np.arange(1, 101, dtype=float)
    assert conformal_quantile(scores, 0.8) <= conformal_quantile(scores, 0.9)


def test_split_conformal_achieves_nominal_coverage_on_iid_data():
    rng = np.random.default_rng(7)
    cal = np.abs(rng.normal(0, 1, 1000))
    test = np.abs(rng.normal(0, 1, 5000))
    for level in (0.80, 0.90):
        q = conformal_quantile(cal, level)
        coverage = float(np.mean(test <= q))
        assert abs(coverage - level) < 0.03


def test_mondrian_quantiles_differ_by_group():
    res = np.concatenate([np.full(100, 10.0), np.full(100, 1000.0)])
    grp = np.concatenate([np.zeros(100, int), np.ones(100, int)])
    q = _mondrian_quantiles(res, grp, 0.9)
    assert q[0] < q[1]  # the high-variance group gets the wider quantile


def test_conformal_quantile_handles_empty():
    assert np.isnan(conformal_quantile(np.array([]), 0.9))
