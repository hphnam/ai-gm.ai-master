"""WP6 · ACI update-rule + deterministic-bound tests (fidelity corrections A6.1)."""

from __future__ import annotations

import numpy as np
import pytest

from eval.aci_closure_probe import ALPHA_TARGET, WARMUP, aci_policy


def _synthetic_scores(n=240, seed=6):
    # A stable stretch then a breach-heavy tail, so err_t takes both values.
    rng = np.random.default_rng(seed)
    stable = np.abs(rng.normal(0, 1, n - 30))
    breach = np.abs(rng.normal(6, 1, 30))
    return np.concatenate([stable, breach])


def test_aci_update_matches_telescoping_identity():
    gamma = 0.01
    scores = _synthetic_scores()
    r = aci_policy(scores, gamma)
    mean_err = r["err"][WARMUP:].mean()
    identity = (r["alphas"][0] - r["alphas"][-1]) / (gamma * r["steps"])
    assert mean_err - ALPHA_TARGET == pytest.approx(identity, abs=1e-9)


def test_aci_miscoverage_obeys_deterministic_bound():
    gamma = 0.01
    scores = _synthetic_scores()
    r = aci_policy(scores, gamma)
    mean_err = r["err"][WARMUP:].mean()
    assert abs(mean_err - ALPHA_TARGET) <= r["bound"]
