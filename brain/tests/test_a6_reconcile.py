"""A6 tests — MinT makes incoherent base forecasts coherent, and the persisted
band is the same conformal band whose coverage is reported (FIX-1 guard)."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from config import CONFORMAL_LEVELS, TEST_WEEKS
from hierarchy.reconcile import (
    build_hierarchy,
    mint_reconcile,
    node_quantiles,
    reconcile,
)
from store import warehouse


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


@pytest.fixture(scope="module")
def reconciled_store():
    warehouse.build()
    reconcile("beer_hall")  # persists forecasts + bands
    yield "beer_hall"


def test_persisted_l2_band_matches_conformal_quantile(reconciled_store):
    """The band the /forecast API serves must equal recon ± node_q — NOT a
    parametric Gaussian z·sd. Fails on the pre-FIX-1 code, passes after."""
    venue = reconciled_store
    node_series, _S, nodes, _bn, _cob = build_hierarchy(venue)
    test_start = node_series["VENUE"].index.max() - pd.Timedelta(weeks=TEST_WEEKS)
    node_q = node_quantiles(node_series, nodes, test_start)

    cat_node = next(n for n in nodes if n.startswith("CAT::"))
    cat_key = cat_node.split("::", 1)[1]

    con = warehouse.connect(read_only=True)
    try:
        row = con.execute(
            "SELECT f.yhat, b.lo, b.hi FROM forecasts f JOIN bands b "
            "ON f.venue=b.venue AND f.layer=b.layer AND f.key=b.key "
            "AND f.target_date=b.target_date AND f.model=b.model "
            "WHERE f.venue=? AND f.layer='L2' AND f.key=? AND b.level=? "
            "AND f.model='mint_dowmedian' ORDER BY f.target_date LIMIT 1",
            [venue, cat_key, 0.90],
        ).fetchone()
    finally:
        con.close()

    assert row is not None, "no persisted L2 band found"
    yhat, lo, hi = float(row[0]), float(row[1]), float(row[2])
    q = node_q[(cat_node, 0.90)]
    assert hi - yhat == pytest.approx(q, abs=1e-6)
    assert lo == pytest.approx(max(yhat - q, 0.0), abs=1e-6)


def test_both_l2_and_l3_coverage_reported(reconciled_store):
    out = reconcile(reconciled_store)
    for lvl in CONFORMAL_LEVELS:
        assert 0.0 <= out["l2_coverage"][lvl] <= 1.0
        assert 0.0 <= out["l3_coverage"][lvl] <= 1.0
