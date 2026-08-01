"""WP2 · Croston / SBA unit tests (fidelity corrections G2.2).

(a) the recursion reproduces a hand-computed 10-point example;
(b) cross-check gate: final forecast matches statsforecast CrostonClassic/SBA on
    Bernoulli-gap series (skipped with a clear reason when statsforecast is not
    importable, it does not build on this Python 3.14 venv);
(c) SBA output equals 0.95 times Croston output at alpha 0.1.
"""

from __future__ import annotations

import numpy as np
import pytest

from models.intermittent import croston_classic, croston_sba

# y = [0,2,0,0,3,0,5,0,0,4], alpha=0.1. Tracing S3 by hand, with phat initialised
# from the first observed interval (first demand at index 1, so phat0 = 2):
#   first demand y=2 -> zhat=2, phat=2, q=1
#   t4 demand 3: zhat=2.1,   phat=2.1    (q was 3)
#   t6 demand 5: zhat=2.39,  phat=2.09   (q was 2)
#   t9 demand 4: zhat=2.551, phat=2.181  (q was 3)  -> rate = 2.551/2.181
_HAND_SERIES = [0, 2, 0, 0, 3, 0, 5, 0, 0, 4]
_HAND_CROSTON = 2.551 / 2.181


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
    # RUN AND PASSED OUT OF BAND, 2026-07-31 (ledger M11): statsforecast 2.1.1 on a
    # CPython 3.12.13 venv, 200 Bernoulli-gap series. Max absolute difference 1.3e-15 for
    # both CrostonClassic and CrostonSBA, and the leading-zero edge cases (our
    # `phat = i0 + 1` against their `np.diff(..., prepend=0)`) agree exactly. Note the run
    # cannot discriminate our parameterised `1 - alpha/2` from their hard-coded 0.95,
    # because at the default alpha = 0.1 the two coincide; see report 53.
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
