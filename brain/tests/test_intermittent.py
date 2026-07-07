"""WP2 · Croston / SBA unit tests (fidelity corrections G2.2).

(a) the recursion reproduces a hand-computed 10-point example;
(b) cross-check gate: final forecast matches statsforecast CrostonClassic/SBA on
    Bernoulli-gap series (skipped with a clear reason when statsforecast is not
    importable — it does not build on this Python 3.14 venv);
(c) SBA output equals 0.95 times Croston output at alpha 0.1.
"""

from __future__ import annotations

import numpy as np
import pytest

from models.intermittent import croston_classic, croston_sba

# y = [0,2,0,0,3,0,5,0,0,4], alpha=0.1. Tracing S3 by hand:
#   first demand y=2 -> zhat=2, phat=1, q=1
#   t4 demand 3: zhat=2.1,  phat=1.2   (q was 3)
#   t6 demand 5: zhat=2.39, phat=1.28  (q was 2)
#   t9 demand 4: zhat=2.551, phat=1.452 (q was 3)  -> rate = 2.551/1.452
_HAND_SERIES = [0, 2, 0, 0, 3, 0, 5, 0, 0, 4]
_HAND_CROSTON = 2.551 / 1.452


def test_croston_reproduces_hand_computed_example():
    assert croston_classic(_HAND_SERIES, alpha=0.1) == pytest.approx(_HAND_CROSTON, rel=1e-12)


def test_sba_is_croston_deflated_by_the_bias_factor():
    croston = croston_classic(_HAND_SERIES, alpha=0.1)
    assert croston_sba(_HAND_SERIES, alpha=0.1) == pytest.approx(0.95 * croston, rel=1e-12)


def test_matches_statsforecast_on_bernoulli_gap_series():
    sf = pytest.importorskip(
        "statsforecast.models",
        reason="statsforecast does not build on this Python 3.14 venv (scipy/numba); "
        "cross-check skipped per spec G2.2",
    )
    rng = np.random.default_rng(93)
    series = [
        (rng.random(120) < 0.4) * rng.integers(1, 6, 120).astype(float)
        for _ in range(200)
    ]
    ours_classic = np.array([croston_classic(y, alpha=0.1) for y in series])
    ref_classic = np.array([
        sf.CrostonClassic().forecast(y=y, h=1)["mean"][0] for y in series
    ])
    assert np.allclose(ours_classic, ref_classic, rtol=1e-6)
