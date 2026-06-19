"""A2 tests — metrics behave correctly and the splits never leak."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from eval import harness


def _series(n: int = 200) -> pd.DataFrame:
    dates = pd.date_range("2025-01-01", periods=n, freq="D")
    dow = dates.dayofweek.to_numpy()
    value = 100.0 + 50.0 * (dow >= 4) + np.sin(np.arange(n))
    return pd.DataFrame({"date": dates, "value": value})


def test_perfect_forecast_has_zero_point_error():
    y = np.array([10.0, 20.0, 30.0])
    assert harness.mae(y, y) == 0.0
    assert harness.rmse(y, y) == 0.0


def test_mase_of_perfect_forecast_is_zero():
    rng = np.random.default_rng(0)
    train = rng.normal(100, 20, size=60)  # non-degenerate -> positive scale
    y = np.array([110.0, 95.0])
    assert harness.mase(y, y, train, season=7) == 0.0


def test_coverage_counts_points_inside_band():
    y = np.array([1.0, 2.0, 3.0, 4.0])
    lo = np.array([0.0, 0.0, 5.0, 0.0])
    hi = np.array([2.0, 2.0, 6.0, 5.0])
    assert harness.coverage(y, lo, hi) == 0.75


def test_winkler_penalises_a_miss_more_than_a_hit():
    y = np.array([5.0])
    hit = harness.winkler(y, np.array([4.0]), np.array([6.0]), level=0.8)
    miss = harness.winkler(y, np.array([0.0]), np.array([2.0]), level=0.8)
    assert miss > hit


def test_time_split_is_ordered_and_non_overlapping():
    split = harness.time_split(_series(), test_weeks=4, val_weeks=2)
    assert split.train["date"].max() < split.val["date"].min()
    assert split.val["date"].max() < split.test["date"].min()


def test_rolling_origin_folds_never_leak():
    folds = list(harness.rolling_origin(_series(), n_folds=3, horizon_days=14))
    assert len(folds) >= 2
    for train, test in folds:
        assert train["date"].max() < test["date"].min()


def test_leakage_guard_raises_on_overlap():
    df = _series()
    with pytest.raises(harness.LeakageError):
        harness.assert_no_leakage(df, df)


def test_smape_excludes_structural_zeros():
    y = np.array([0.0, 100.0])
    pred = np.array([50.0, 100.0])
    # The zero is excluded, so only the perfect second point counts -> 0%.
    assert harness.smape(y, pred) == pytest.approx(0.0)
