"""A6 tests: WLS_v makes incoherent base forecasts coherent, the persisted band is
the same conformal band whose coverage is reported (FIX-1 guard), and the band is
calibrated on a block held out from the fit (M2)."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from config import CONFORMAL_LEVELS, TEST_WEEKS
from conformal.wrap import conformal_quantile
from eval import harness
from hierarchy.reconcile import (
    _croston_comparison,
    _dow_median_forecast,
    _one_se_adopt,
    build_hierarchy,
    mint_reconcile,
    node_quantiles,
    reconcile,
)
from models.intermittent import croston_classic, croston_sba
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


# --- Ex-ante intermittent estimator selection (closes the test-block selection defect) ---

def _spiky() -> np.ndarray:
    y = np.zeros(140)
    y[::3] = 4.0
    y[::7] = 11.0
    return y


def _trending() -> np.ndarray:
    """A node the intermittent estimator actually wins on: the DOW-median lags a trend
    that Croston's exponential update tracks, so the validation contest adopts."""
    return np.linspace(1.0, 40.0, 140)


def _intermittent_case(adi: float, cv2: float, y: np.ndarray | None = None):
    """One intermittent node run through _croston_comparison.

    Three 20-day blocks (fit | validation | calibration | test), the same shape A6
    uses at TEST_WEEKS scale. Returns (row, ytr, Ybase, w), where `ytr` is the span
    the SERVED estimator is fitted on, i.e. everything before the calibration block.
    """
    y = _spiky() if y is None else y
    idx = pd.date_range("2025-01-01", periods=len(y), freq="D")
    s = pd.Series(np.asarray(y, float), index=idx)

    val_start, cal_start, test_start = idx[60], idx[80], idx[100]
    test_dates = idx[idx >= test_start]
    nodes = ["VENUE", "ITEM::X"]
    node_series = {"VENUE": s, "ITEM::X": s}
    Ybase = np.zeros((2, len(test_dates)))
    w = np.ones(2)
    rows = _croston_comparison(
        node_series, nodes, test_dates, test_start, cal_start, val_start,
        {"ITEM::X": {"adi": adi, "cv2": cv2}}, Ybase, w, {})
    return rows[0], s[s.index < cal_start].to_numpy(float), Ybase, w


def test_estimator_is_sba_when_the_kostenko_hyndman_rule_selects_it():
    # cv2 = 3.0 sits above 2 - 1.5*2.0 = -1.0, so the rule selects SBA.
    row, _ytr, _Ybase, _w = _intermittent_case(adi=2.0, cv2=3.0)
    assert row["method"] == "sba"


def test_estimator_is_classic_croston_when_the_rule_selects_it():
    # cv2 = 0.1 sits below 2 - 1.5*1.0 = 0.5, so the rule selects classic Croston.
    # Such a node is below the ADI >= 4/3 trigger and so never reaches A6 in practice;
    # this pins the branch, and the next test says why it stays unreached.
    row, _ytr, _Ybase, _w = _intermittent_case(adi=1.0, cv2=0.1)
    assert row["method"] == "croston"


def test_an_adopted_node_forecasts_the_estimator_refit_up_to_the_calibration_block():
    _row, ytr, Ybase, _w = _intermittent_case(adi=2.0, cv2=3.0, y=_trending())
    assert Ybase[1][0] == pytest.approx(croston_sba(ytr, alpha=0.1))


def test_a_node_losing_the_validation_contest_keeps_the_dow_median():
    _row, _ytr, Ybase, _w = _intermittent_case(adi=2.0, cv2=3.0, y=_spiky())
    assert not Ybase[1].any()


def test_the_selection_rule_is_degenerate_over_the_intermittency_trigger_set():
    """At the gate ADI >= 4/3 the cutoff 2 - (3/2)ADI is already <= 0, and CV-squared
    cannot be negative, so SBA is selected for every node A6 ever asks about. The rule
    is applied on principle, not because it discriminates on this hierarchy."""
    from eval.intermittency_diagnostic import ADI_INTERMITTENT_CUTOFF, select_sba

    assert select_sba(ADI_INTERMITTENT_CUTOFF, cv2=1e-9)


def test_adoption_is_decided_on_the_validation_block_not_the_test_block():
    row, _ytr, _Ybase, _w = _intermittent_case(adi=2.0, cv2=3.0)
    assert row["adopted"] == (row["one_se_crit"] < 0)


def _val_arrays(n_days: int = 56):
    """A validation block long enough for 8 whole sub-blocks, with its DOW forecast."""
    y = np.linspace(1.0, 40.0, 60 + n_days)
    idx = pd.date_range("2025-01-01", periods=len(y), freq="D")
    s = pd.Series(y, index=idx)
    val = idx[60:]
    yv = s.reindex(val).to_numpy(float)
    yfit = s[s.index < idx[60]].to_numpy(float)
    dow, _ = _dow_median_forecast(s, val, idx[60])
    return yv, dow, yfit


def _challenger(yv, dow, factor_per_block):
    """A forecast whose absolute error is `factor` times the incumbent's, per sub-block."""
    f = np.repeat(np.asarray(factor_per_block, float), 7)[: len(yv)]
    return yv - f * (yv - dow)


def test_a_win_smaller_than_its_own_dispersion_is_refused():
    """The pre-registered one-standard-error margin
    (`ledger/prereg_adoption_margin_2026-08-01.md`). This challenger wins on the pooled
    validation score, but only because large wins on half the sub-blocks slightly
    outweigh large losses on the other half. The mean advantage is inside the noise of
    the differential, which is exactly the situation that adopted a node on a 0.21 per
    cent margin and then scored 96 per cent worse on the test block."""
    yv, dow, yfit = _val_arrays()
    est = _challenger(yv, dow, [0.2, 1.7] * 4)

    assert harness.mase(yv, est, yfit, basis="calendar_lag7") < \
        harness.mase(yv, dow, yfit, basis="calendar_lag7"), "should win the bare rule"
    adopt, crit = _one_se_adopt(yv, dow, est, yfit)
    assert not adopt and crit > 0


def test_a_consistent_win_is_still_adopted():
    """The margin must not refuse everything. A challenger that beats the incumbent by
    the same modest amount on every sub-block has little dispersion in its differential,
    so its advantage clears one standard error and it is adopted."""
    yv, dow, yfit = _val_arrays()
    est = _challenger(yv, dow, [0.95] * 8)

    adopt, crit = _one_se_adopt(yv, dow, est, yfit)
    assert adopt and crit < 0


def test_the_margin_fails_closed_when_dispersion_cannot_be_estimated():
    """Fewer than two sub-blocks, a non-finite differential or zero dispersion all keep
    the incumbent rather than falling back to the bare inequality."""
    y = _trending()
    idx = pd.date_range("2025-01-01", periods=len(y), freq="D")
    s = pd.Series(y, index=idx)
    yfit = s[s.index < idx[60]].to_numpy(float)
    short = s.reindex(idx[60:66]).to_numpy(float)          # 6 days -> 0 whole sub-blocks
    adopt, crit = _one_se_adopt(short, short, short - 1.0, yfit)
    assert not adopt and np.isnan(crit)


def test_mint_weight_is_the_variance_of_the_held_out_signed_residual():
    """W is the base-forecast ERROR covariance, so the weight comes off the
    calibration block, scored with the rate fitted strictly before it. Taking it
    in-sample understates the error for the same reason an in-sample conformal
    quantile understates the band."""
    y = _trending()
    _row, ytr, _Ybase, w = _intermittent_case(adi=2.0, cv2=3.0, y=y)
    rate = croston_sba(ytr, alpha=0.1)
    signed = y[80:100] - rate
    assert w[1] == pytest.approx(float(np.var(signed)))


def test_the_conformal_calibration_set_is_disjoint_from_the_fitting_set():
    """The whole source of split conformal's guarantee. The score must be of a
    residual the DOW median never saw: fit strictly before cal_start, score on
    [cal_start, test_start). Scoring the fitting span itself --- what this did
    before --- makes the quantile in-sample and the guarantee vacuous."""
    idx = pd.date_range("2025-01-01", periods=140, freq="D")
    s = pd.Series(np.linspace(1.0, 40.0, 140), index=idx)
    cal_start, test_start = idx[80], idx[100]
    _q, resid = node_quantiles({"ITEM::X": s}, ["ITEM::X"], cal_start, test_start)

    fitted, _ = _dow_median_forecast(s, idx[(idx >= cal_start) & (idx < test_start)],
                                     cal_start)
    expected = s[(s.index >= cal_start) & (s.index < test_start)].to_numpy() - fitted
    assert np.allclose(resid["ITEM::X"], expected)


def test_the_band_is_the_conformal_quantile_of_the_held_out_residual():
    """Pins WHAT the band is, deliberately not which DIRECTION the fix moved it.

    An in-sample quantile is optimistic given the same sample, but it is not
    generally the narrower number here: it is taken over a 343-day fitting span
    while the calibration block is 56 days, so it can be the larger of the two
    simply by covering more history. On the real hierarchy the L2 bands widened
    and the sparse L3 bands narrowed. A test asserting "wider" would be asserting
    something the estate contradicts.
    """
    idx = pd.date_range("2025-01-01", periods=140, freq="D")
    s = pd.Series(np.linspace(1.0, 40.0, 140), index=idx)
    cal_start, test_start = idx[80], idx[100]
    q, resid = node_quantiles({"ITEM::X": s}, ["ITEM::X"], cal_start, test_start)
    assert q[("ITEM::X", 0.90)] == pytest.approx(
        conformal_quantile(np.abs(resid["ITEM::X"]), 0.90))


@pytest.fixture(scope="module")
def reconciled_store():
    warehouse.build()
    reconcile("beer_hall")  # persists forecasts + bands
    yield "beer_hall"


def test_persisted_l2_band_matches_conformal_quantile(reconciled_store):
    """The band the /forecast API serves must equal recon ± node_q, NOT a
    parametric Gaussian z·sd. Fails on the pre-FIX-1 code, passes after."""
    venue = reconciled_store
    node_series, _S, nodes, _bn, _cob = build_hierarchy(venue)
    test_start = node_series["VENUE"].index.max() - pd.Timedelta(weeks=TEST_WEEKS)
    cal_start = test_start - pd.Timedelta(weeks=TEST_WEEKS)
    node_q, _resid = node_quantiles(node_series, nodes, cal_start, test_start)

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
