"""S2 G17b tests: `step_days`, leakage under overlapping windows, round-trip.

The equivalence test carries a verbatim copy of the pre-refactor `rolling_origin`
rather than trusting the new one to describe itself. That is the point of G1: if
`step_days=None` drifts by a single fold boundary, every committed ladder result
becomes unreproducible, and a test that shares an implementation with the thing
it checks would not notice.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest

import config
from eval import fold_vectors, harness


def _series(n: int = 400, start: str = "2025-06-04") -> pd.DataFrame:
    dates = pd.date_range(start, periods=n, freq="D")
    dow = dates.dayofweek.to_numpy()
    value = 100.0 + 50.0 * (dow >= 4) + np.sin(np.arange(n))
    return pd.DataFrame({"date": dates, "value": value})


def _pre_refactor_rolling_origin(
    df, *, date_col="date", n_folds=4, horizon_days=14, min_train_days=90
):
    """Verbatim implementation as at d40dea7, for equivalence checking."""
    df = df.sort_values(date_col).reset_index(drop=True)
    last = df[date_col].max()
    for k in range(n_folds, 0, -1):
        test_end = last - pd.Timedelta(days=horizon_days * (k - 1))
        test_start = test_end - pd.Timedelta(days=horizon_days)
        train = df[df[date_col] <= test_start]
        test = df[(df[date_col] > test_start) & (df[date_col] <= test_end)]
        if len(train) < min_train_days or test.empty:
            continue
        harness.assert_no_leakage(train, test, date_col=date_col)
        yield train.copy(), test.copy()


def _signature(folds):
    return [
        (len(tr), tr["date"].max(), te["date"].min(), te["date"].max(), len(te))
        for tr, te in folds
    ]


# --- G1: step_days=None must not have changed anything -----------------------

@pytest.mark.parametrize(
    "n_folds,horizon,min_train",
    [(6, 7, 120), (4, 14, 90), (3, 14, 90), (12, 7, 120), (2, 7, 120)],
)
def test_step_days_none_is_identical_to_the_pre_refactor_implementation(
    n_folds, horizon, min_train
):
    df = _series()
    old = _signature(_pre_refactor_rolling_origin(
        df, n_folds=n_folds, horizon_days=horizon, min_train_days=min_train))
    new = _signature(harness.rolling_origin(
        df, n_folds=n_folds, horizon_days=horizon, min_train_days=min_train))
    assert new == old


def test_step_days_equal_to_horizon_reproduces_the_disjoint_default():
    df = _series()
    implicit = _signature(harness.rolling_origin(
        df, n_folds=6, horizon_days=7, min_train_days=120))
    explicit = _signature(harness.rolling_origin(
        df, n_folds=6, horizon_days=7, min_train_days=120, step_days=7))
    assert explicit == implicit


# --- Fold counts -------------------------------------------------------------

def test_every_origin_is_taken_when_n_folds_is_none():
    # 400 rows, horizon 7, min_train 120 -> 400 - 7 - 120 + 1
    folds = list(harness.rolling_origin(
        _series(400), n_folds=None, horizon_days=7, min_train_days=120,
        step_days=1))
    assert len(folds) == 274


def test_n_folds_still_caps_to_the_most_recent_origins_when_stepping():
    df = _series()
    capped = _signature(harness.rolling_origin(
        df, n_folds=5, horizon_days=7, min_train_days=120, step_days=1))
    every = _signature(harness.rolling_origin(
        df, n_folds=None, horizon_days=7, min_train_days=120, step_days=1))
    assert capped == every[-5:]


def test_folds_are_yielded_oldest_first():
    folds = list(harness.rolling_origin(
        _series(), n_folds=None, horizon_days=7, min_train_days=120, step_days=1))
    starts = [te["date"].min() for _, te in folds]
    assert starts == sorted(starts)


def test_rolling_origin_needs_at_least_one_of_n_folds_or_step_days():
    with pytest.raises(ValueError):
        list(harness.rolling_origin(_series(), n_folds=None))


def test_a_non_positive_step_is_rejected_rather_than_looping_forever():
    with pytest.raises(ValueError):
        list(harness.rolling_origin(_series(), n_folds=None, step_days=0))


# --- G3: leakage under overlap ----------------------------------------------
#
# Three separate claims, because they fail in different ways and only the middle
# one is what the gate actually asks for. Note that `rolling_origin` cannot itself
# emit a leaking fold: train is `date <= test_start` and test is `date >
# test_start`, so the guard is unfireable from inside the generator by
# construction. What is testable is that the guard DOES fire on a genuinely
# overlapping pair, that no fold at step 1 leaks, and that the windows really do
# overlap (otherwise the first two would pass vacuously).

def test_the_guard_fires_on_a_constructed_overlapping_train_and_test():
    df = _series(200)
    test = df[df["date"] >= "2025-11-01"]
    # Train deliberately runs one day PAST the test start, the exact corruption
    # an off-by-one in the fold arithmetic would introduce.
    train = df[df["date"] <= test["date"].min()]
    with pytest.raises(harness.LeakageError):
        harness.assert_no_leakage(train, test)


def test_no_fold_leaks_at_step_one_where_windows_overlap():
    folds = list(harness.rolling_origin(
        _series(), n_folds=None, horizon_days=7, min_train_days=120, step_days=1))
    latest_train = max(tr["date"].max() for tr, _ in folds)
    earliest_matching_test = min(te["date"].min() for _, te in folds)
    assert all(tr["date"].max() < te["date"].min() for tr, te in folds), (
        f"a fold leaked: train reached {latest_train}, "
        f"earliest test start {earliest_matching_test}")


def test_consecutive_test_windows_genuinely_overlap_at_step_one():
    """Without this the leakage tests above could pass vacuously on disjoint
    windows, which is the behaviour S2 exists to replace."""
    folds = list(harness.rolling_origin(
        _series(), n_folds=None, horizon_days=7, min_train_days=120, step_days=1))
    first, second = folds[0][1]["date"], folds[1][1]["date"]
    shared = set(first) & set(second)
    assert len(shared) == 6


def test_training_history_grows_monotonically_across_folds():
    folds = list(harness.rolling_origin(
        _series(), n_folds=None, horizon_days=7, min_train_days=120, step_days=1))
    sizes = [len(tr) for tr, _ in folds]
    assert sizes == sorted(sizes)


# --- G4: round-trip ----------------------------------------------------------

def _payload() -> dict:
    return {
        "schema_version": fold_vectors.SCHEMA_VERSION,
        "venue": "synthetic",
        "basis": "calendar_lag7",
        "step_days": 1,
        "horizon_days": 7,
        "n_folds": 4,
        "folds": [
            {"train_end": "2026-01-01", "test_start": "2026-01-02",
             "test_end": "2026-01-08", "n_train": 120, "n_test": 7},
        ],
        "rungs": {
            "rung_a": {"available": True, "rung": 0, "fold_index": [0, 1, 2, 3],
                       "mase": [1.0, 2.0, 3.0, 4.0],
                       "rmsse": [1.1, 2.1, 3.1, 4.1], "summary": {}},
            # Deliberately missing fold 1, the misalignment case.
            "rung_b": {"available": True, "rung": 1, "fold_index": [0, 2, 3],
                       "mase": [0.5, 1.5, 2.5],
                       "rmsse": [0.6, 1.6, 2.6], "summary": {}},
            "rung_c": {"available": False, "note": "backend not installed"},
        },
    }


def test_fold_vectors_round_trip_through_disk(tmp_path, monkeypatch):
    monkeypatch.setattr(fold_vectors, "OUT_DIR", tmp_path)
    saved = _payload()
    fold_vectors.save(saved)
    assert fold_vectors.load("synthetic") == saved


def test_round_trip_preserves_float_values_exactly(tmp_path, monkeypatch):
    monkeypatch.setattr(fold_vectors, "OUT_DIR", tmp_path)
    saved = _payload()
    saved["rungs"]["rung_a"]["mase"] = [0.1234567890123456, 1e-9, 12345.6789]
    fold_vectors.save(saved)
    assert fold_vectors.load("synthetic")["rungs"]["rung_a"]["mase"] == \
        saved["rungs"]["rung_a"]["mase"]


def test_saved_payload_is_valid_json(tmp_path, monkeypatch):
    monkeypatch.setattr(fold_vectors, "OUT_DIR", tmp_path)
    fold_vectors.save(_payload())
    assert json.loads((tmp_path / "fold_vectors_L1_synthetic.json").read_text())


def test_aligned_pair_drops_folds_only_one_rung_scored():
    a, b = fold_vectors.aligned_pair(_payload(), "rung_a", "rung_b")
    assert (a, b) == ([1.0, 3.0, 4.0], [0.5, 1.5, 2.5])


def test_aligned_pair_would_have_mispaired_under_a_naive_zip():
    """The reason `aligned_pair` exists: zipping the raw vectors pairs fold 1's
    loss for rung_a against fold 2's for rung_b, and nothing errors."""
    p = _payload()
    naive = list(zip(p["rungs"]["rung_a"]["mase"], p["rungs"]["rung_b"]["mase"]))
    assert naive != list(zip(*fold_vectors.aligned_pair(p, "rung_a", "rung_b")))


def test_aligned_pair_refuses_an_unavailable_rung():
    with pytest.raises(ValueError):
        fold_vectors.aligned_pair(_payload(), "rung_a", "rung_c")


# --- The contract S3 consumes ------------------------------------------------

@pytest.mark.parametrize("venue", ["beer_hall", "ellel", "two_river_taps"])
def test_persisted_artefact_declares_its_overlap_and_scale_policy(venue):
    """S3 must not treat these folds as iid draws. The warning lives in the file
    itself, not only in the module docstring, because that is what a consumer
    loads."""
    p = fold_vectors.load(venue)
    assert p["windows_overlap"] is True
    assert p["step_days"] < p["horizon_days"]
    assert "block bootstrap" in p["independence_warning"]
    # Pair on the ruled basis, never a literal. This assertion used to hard-code
    # `calendar_lag7`, which is what let the artefact carry a basis label that
    # disagreed with the ruler it was actually scored on (report 69).
    assert p["basis"] == config.VENUE_SCALE_BASIS.get(venue, harness.REPORTED_BASIS)
    assert p["loss"] == ("mase" if config.is_scaled_venue(venue) else "mae")


@pytest.mark.parametrize("venue", ["beer_hall", "ellel", "two_river_taps"])
def test_persisted_vectors_align_with_their_fold_boundaries(venue):
    p = fold_vectors.load(venue)
    assert len(p["folds"]) == p["n_folds"]
    for name, r in p["rungs"].items():
        if not r.get("available"):
            continue
        assert len(r["mase"]) == len(r["fold_index"]), name
        assert max(r["fold_index"]) < p["n_folds"], name


@pytest.mark.parametrize("venue", ["beer_hall", "ellel", "two_river_taps"])
def test_persisted_folds_never_leak(venue):
    """The boundaries are stored as dates, so the leakage property is checkable
    from the artefact alone, without rebuilding the frame."""
    p = fold_vectors.load(venue)
    assert all(f["train_end"] < f["test_start"] for f in p["folds"])
