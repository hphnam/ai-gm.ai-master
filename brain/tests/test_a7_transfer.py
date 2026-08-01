"""A7 tests: donor shape is unit-mean, and the scaled pool is too small to gate on."""

from __future__ import annotations

import numpy as np

import config
from config import FORECAST_VENUES
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
