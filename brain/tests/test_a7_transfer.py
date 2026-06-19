"""A7 tests — donor shape is unit-mean and transfer wins at cold-start."""

from __future__ import annotations

import numpy as np

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


def test_transfer_wins_majority_at_cold_start():
    out = lovo.run(cold_days=14)
    majority = (out["n_folds"] // 2) + 1
    assert out["transfer_wins"] >= majority


def test_foundation_dropped_per_ablation_when_absent():
    abl = lovo._foundation_ablation()
    # No backbone is installed in this environment -> dropped, not silently kept.
    assert abl["available"] is False
    assert "DROPPED" in abl["verdict"]
