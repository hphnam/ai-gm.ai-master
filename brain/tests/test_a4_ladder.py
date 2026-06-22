"""A4 tests — rung predictors and the milestone/selection logic (fast, on a
synthetic series; the full real-data ladder is exercised by the CLI artefact).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from models import ladder
from models.ladder import RungResult


def _synthetic(n: int = 84) -> pd.DataFrame:
    dates = pd.date_range("2025-01-06", periods=n, freq="D")  # starts on a Monday
    dow = dates.dayofweek.to_numpy()
    value = 200.0 + 400.0 * (dow == 4) + 300.0 * (dow == 5) + 50.0 * (dow >= 2)
    return pd.DataFrame({
        "date": dates, "value": value, "dow": dow,
        "is_bank_holiday": np.zeros(n, dtype=int),
    })


def test_seasonal_naive_repeats_prior_week():
    df = _synthetic()
    train, target = df.iloc[:70], df.iloc[70:]
    preds = ladder.rung0_seasonal_naive(train, target)
    assert len(preds) == len(target)
    # A Friday in the target must inherit the prior Friday's level.
    fri = target[target["dow"] == 4].index[0]
    assert preds[target.index.get_loc(fri)] > 300


def test_robust_dow_tracks_day_of_week_medians():
    df = _synthetic()
    train, target = df.iloc[:70], df.iloc[70:]
    preds = ladder.rung1_robust_dow(train, target)
    # Friday (high) prediction must exceed Monday (low) prediction.
    fri_idx = target.index.get_loc(target[target["dow"] == 4].index[0])
    mon_idx = target.index.get_loc(target[target["dow"] == 0].index[0])
    assert preds[fri_idx] > preds[mon_idx]


def test_select_best_picks_lowest_mase():
    results = [
        RungResult("a", 0, metrics={"MASE": 1.5}),
        RungResult("b", 2, metrics={"MASE": 0.7}),
        RungResult("c", 3, metrics={"MASE": 0.9}),
    ]
    assert ladder.select_best(results).name == "b"


def test_milestone_passes_when_a_rung_beats_both_baselines():
    results = [
        RungResult("rung0_seasonal_naive", 0, metrics={"MASE": 1.0}),
        RungResult("rung1_robust_dow", 1, metrics={"MASE": 0.95}),
        RungResult("rung3_gbm", 3, metrics={"MASE": 0.8}),
    ]
    passed, info = ladder.milestone(results)
    assert passed is True
    assert info["best"] == "rung3_gbm"


def test_milestone_fails_when_baseline_is_best():
    results = [
        RungResult("rung0_seasonal_naive", 0, metrics={"MASE": 1.0}),
        RungResult("rung1_robust_dow", 1, metrics={"MASE": 0.7}),
        RungResult("rung3_gbm", 3, metrics={"MASE": 0.85}),
    ]
    passed, _ = ladder.milestone(results)
    assert passed is False


def test_capped_milestone_gate_is_rung1_beats_naive():
    # A capped venue (cap=1) is adopted when Rung 1 beats Rung 0 — there is no
    # higher rung to beat Rung 1 with.
    results = [
        RungResult("rung0_seasonal_naive", 0, metrics={"MASE": 0.92}),
        RungResult("rung1_robust_dow", 1, metrics={"MASE": 0.57}),
    ]
    passed, info = ladder.milestone(results, cap=1)
    assert passed is True
    assert info["best"] == "rung1_robust_dow"
    assert "Rung 1" in info["gate"]


def test_ellel_ladder_never_returns_an_available_rung_above_one():
    results, _split, _cols = ladder.evaluate_static("ellel")
    for r in results:
        if r.rung >= 2:
            assert r.available is False, f"{r.name} should be capped for Ellel"
