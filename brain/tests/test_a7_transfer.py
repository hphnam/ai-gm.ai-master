"""A7 tests: donor shape is unit-mean, and the scaled pool is too small to gate on."""

from __future__ import annotations

import numpy as np

import config
from config import FORECAST_VENUES
from eval import mcs
from transfer import lovo


def test_donor_shape_is_unit_mean():
    shape = lovo.donor_dow_shape(["beer_hall", "two_river_taps"])
    assert abs(np.mean(list(shape.values())) - 1.0) < 1e-9
    assert len(shape) == 7


def test_seasonal_naive_repeats_prior_week():
    import pandas as pd
    dates = pd.date_range("2025-06-04", periods=21, freq="D")
    cold = pd.DataFrame({"date": dates[:14], "value": np.arange(14, dtype=float)})
    test = pd.DataFrame({"date": dates[14:], "value": np.zeros(7)})
    preds = lovo._seasonal_naive(cold, test)
    assert preds[0] == cold["value"].iloc[7]  # lag-7


def test_the_scaled_pool_is_too_small_for_a_majority_verdict():
    """G2 left this gate unevaluable rather than failed.

    The gate was written as a majority over three venues. Ellel admits no defensible
    scaled error, so it cannot enter a MASE tally, and two venues carry no majority.
    This asserted `transfer_wins >= majority` and so encoded the estate-level claim
    the corrected pool withdraws; it now asserts the pool is too small to carry one.
    """
    out = lovo.run(cold_days=14)
    assert out["n_folds"] < 3


def test_the_unscaled_venue_is_reported_but_never_counted():
    out = lovo.run(cold_days=14)
    unscaled = [f for f in out["folds"] if not f["scaled"]]
    assert len(unscaled) == out["n_venues_reported"] - out["n_folds"]


def test_the_unscaled_venue_is_scored_in_currency_not_mase():
    out = lovo.run(cold_days=14)
    ellel = next(f for f in out["folds"] if not f["scaled"])
    assert ellel["loss"] == "MAE"


def test_each_scaled_venue_uses_the_basis_the_estate_ruled_for_it():
    out = lovo.run(cold_days=14)
    for f in (f for f in out["folds"] if f["scaled"]):
        assert f["basis"] == config.VENUE_SCALE_BASIS[f["holdout"]]


def test_foundation_dropped_per_ablation_when_absent(monkeypatch):
    # Force the no-backbone branch deterministically, so the test holds whether or
    # not a foundation backend is installed in the running venv (the eval venv has
    # chronos; the runtime venv does not).
    import builtins
    real_import = builtins.__import__

    def _no_backend(name, *args, **kwargs):
        if name in ("chronos", "timesfm", "moirai"):
            raise ImportError(name)
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", _no_backend)
    abl = lovo._foundation_ablation()
    assert abl["available"] is False
    assert "DROPPED" in abl["verdict"]


# --- The adoption branch -----------------------------------------------------
#
# This branch had no coverage at all, which is why it could return an instruction
# string and no `beats_global_gbm` key for as long as no backbone was importable.
# These run without a backbone by stubbing the per-venue comparison, so the decision
# logic is tested in every venv rather than only where torch is installed.


def _stub_venue_result(venue, foundation, gbm):
    return {"venue": venue, "n_folds": 6, "failed_folds": 0, "scored": True,
            "mase_foundation": foundation, "mase_global_gbm": gbm,
            "beats": foundation < gbm,
            "dispersion": {"insufficient": True}}


def test_the_adoption_branch_always_reports_whether_it_beat_the_gbm(monkeypatch):
    """The defect: this key was absent, so `.get(..., False)` silently read as a loss."""
    monkeypatch.setattr(lovo, "_foundation_vs_global_gbm",
                        lambda v: _stub_venue_result(v, 0.5, 0.9))
    assert lovo._foundation_adoption("chronos")["beats_global_gbm"] is True


def test_a_backbone_losing_at_one_venue_is_not_adopted(monkeypatch):
    scores = {"beer_hall": (0.5, 0.9), "two_river_taps": (1.1, 0.7)}
    monkeypatch.setattr(lovo, "_foundation_vs_global_gbm",
                        lambda v: _stub_venue_result(v, *scores[v]))
    assert lovo._foundation_adoption("chronos")["beats_global_gbm"] is False


def test_an_unscorable_backbone_is_not_adopted(monkeypatch):
    monkeypatch.setattr(lovo, "_foundation_vs_global_gbm",
                        lambda v: {"venue": v, "n_folds": 0, "failed_folds": 6,
                                   "scored": False})
    assert lovo._foundation_adoption("chronos")["beats_global_gbm"] is False


def test_a_backbone_with_no_implemented_predictor_is_not_adopted():
    """timesfm and moirai are probed for but this project implements no predictor for
    either, so importability alone must not adopt one."""
    assert lovo._foundation_adoption("timesfm")["beats_global_gbm"] is False


def test_a_sample_at_the_block_length_yields_no_confidence_interval():
    """A moving-block bootstrap at or below its block length has one admissible block,
    so every resample is the original series and the interval collapses to a point mass.
    Reported as absent rather than as a zero-width CI, which would read as certainty."""
    n = mcs.BLOCK_LEN
    d = lovo._dispersion([1.0] * n, [1.5] * n)
    assert d["insufficient"] is True


def test_a_sample_above_the_block_length_still_yields_a_confidence_interval():
    n = mcs.BLOCK_LEN + 40
    rng = np.random.default_rng(0)
    d = lovo._dispersion(list(rng.normal(1.0, 0.2, n)), list(rng.normal(1.5, 0.2, n)))
    assert d["ci90"][0] < d["ci90"][1]


def test_the_unscaled_venue_is_never_scored_by_the_foundation_criterion(monkeypatch):
    seen = []
    monkeypatch.setattr(lovo, "_foundation_vs_global_gbm",
                        lambda v: (seen.append(v), _stub_venue_result(v, 0.5, 0.9))[1])
    lovo._foundation_adoption("chronos")
    assert not [v for v in seen if not config.is_scaled_venue(v)]
