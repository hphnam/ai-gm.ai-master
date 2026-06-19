"""A6 tests — MinT makes incoherent base forecasts coherent."""

from __future__ import annotations

import numpy as np

from hierarchy.reconcile import mint_reconcile


def _toy_S() -> np.ndarray:
    # nodes: VENUE, CAT_A, CAT_B, item1(A), item2(A), item3(B); bottom = items.
    return np.array([
        [1, 1, 1],  # VENUE
        [1, 1, 0],  # CAT_A
        [0, 0, 1],  # CAT_B
        [1, 0, 0],  # item1
        [0, 1, 0],  # item2
        [0, 0, 1],  # item3
    ], float)


def test_reconciled_forecasts_are_coherent():
    S = _toy_S()
    # Deliberately incoherent base forecasts (venue != Σ items).
    Ybase = np.array([[10.0], [4.0], [5.0], [1.0], [2.0], [2.0]])
    recon = mint_reconcile(Ybase, S, w=np.ones(6))
    venue, cat_a, cat_b, i1, i2, i3 = recon[:, 0]
    assert np.isclose(venue, i1 + i2 + i3)
    assert np.isclose(cat_a, i1 + i2)
    assert np.isclose(cat_b, i3)


def test_already_coherent_input_is_preserved():
    S = _toy_S()
    bottom = np.array([3.0, 2.0, 4.0])
    Ybase = (S @ bottom).reshape(-1, 1)
    recon = mint_reconcile(Ybase, S, w=np.ones(6))
    assert np.allclose(recon[:, 0], Ybase[:, 0])


def test_weighting_shifts_reconciliation_toward_low_variance_nodes():
    S = _toy_S()
    Ybase = np.array([[10.0], [4.0], [5.0], [1.0], [2.0], [2.0]])
    # Trust the bottom items (low variance) far more than the aggregates.
    w = np.array([100.0, 100.0, 100.0, 0.01, 0.01, 0.01])
    recon = mint_reconcile(Ybase, S, w)
    # The reconciled bottoms should stay close to their base values.
    assert np.allclose(recon[3:, 0], Ybase[3:, 0], atol=0.2)
