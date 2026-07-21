"""S3 G17c tests: the Model Confidence Set on known synthetic cases.

G4 requires the implementation reproduce two constructed truths before any real set
is trusted: a uniformly dominant model must collapse the set to itself, and a field of
identically-distributed models must be retained whole. Both are here, plus the
moving-block machinery and the nesting property that makes the S3 stop condition
(a model retained at 0.25 but eliminated at 0.10) structurally impossible.

These use synthetic loss matrices, never the store, so they are fast and deterministic
under a fixed bootstrap seed.
"""

from __future__ import annotations

import numpy as np
import pytest

from eval import mcs
from store.warehouse import StoreCeilingError


def _payload(rungs: dict) -> dict:
    """A minimal fold_vectors-shaped payload for the matrix/diagnostic helpers."""
    return {"venue": "synthetic", "rungs": rungs}


def _rung(fold_index, mase, rung=0):
    return {"available": True, "rung": rung, "fold_index": list(fold_index),
            "mase": list(mase), "rmsse": list(mase)}


# --- G4 case 1: a dominant model collapses the set --------------------------

def test_a_uniformly_dominant_model_collapses_the_set_to_itself():
    rng = np.random.default_rng(0)
    n = 60
    loss = np.column_stack([
        0.20 + 0.02 * rng.standard_normal(n),
        1.50 + 0.05 * rng.standard_normal(n),
        1.60 + 0.05 * rng.standard_normal(n),
        1.70 + 0.05 * rng.standard_normal(n)])
    res = mcs.model_confidence_set(
        ["best", "b", "c", "d"], loss, block_len=7, n_boot=1000, seed=1)
    assert res.set_at(0.10) == ["best"]


def test_the_dominant_model_is_also_alone_at_the_wider_level():
    rng = np.random.default_rng(0)
    n = 60
    loss = np.column_stack([
        0.20 + 0.02 * rng.standard_normal(n),
        1.50 + 0.05 * rng.standard_normal(n),
        1.60 + 0.05 * rng.standard_normal(n),
        1.70 + 0.05 * rng.standard_normal(n)])
    res = mcs.model_confidence_set(
        ["best", "b", "c", "d"], loss, block_len=7, n_boot=1000, seed=1)
    assert res.set_at(0.25) == ["best"]


# --- G4 case 2: identically distributed models are all retained -------------

def test_identical_models_are_all_retained():
    col = np.linspace(0.5, 1.5, 60)
    loss = np.column_stack([col, col, col, col])
    res = mcs.model_confidence_set(
        list("abcd"), loss, block_len=7, n_boot=1000, seed=1)
    assert set(res.set_at(0.10)) == set("abcd")


def test_identical_models_carry_a_unit_mcs_pvalue():
    col = np.linspace(0.5, 1.5, 60)
    loss = np.column_stack([col, col, col, col])
    res = mcs.model_confidence_set(
        list("abcd"), loss, block_len=7, n_boot=1000, seed=1)
    assert all(p == 1.0 for p in res.mcs_pvalue.values())


def test_equal_mean_independent_models_are_all_retained():
    rng = np.random.default_rng(7)
    loss = 1.0 + 0.3 * rng.standard_normal((80, 4))
    res = mcs.model_confidence_set(
        list("abcd"), loss, block_len=7, n_boot=1000, seed=2)
    assert len(res.set_at(0.10)) == 4


# --- The stop-condition property: sets are nested by construction ------------

def test_the_wider_level_set_is_always_a_subset_of_the_tighter_one():
    rng = np.random.default_rng(3)
    loss = np.column_stack([
        0.80 + 0.20 * rng.standard_normal(70),
        0.90 + 0.20 * rng.standard_normal(70),
        1.00 + 0.20 * rng.standard_normal(70),
        1.60 + 0.20 * rng.standard_normal(70)])
    res = mcs.model_confidence_set(
        ["a", "b", "c", "d"], loss, block_len=7, n_boot=1000, seed=5)
    assert set(res.set_at(0.25)) <= set(res.set_at(0.10))


def test_a_model_eliminated_at_the_wider_level_stays_eliminated_at_the_tighter():
    """The impossible ordering the S3 stop condition names: retained at 0.25 while
    eliminated at 0.10. The monotone MCS p-value forbids it for every model."""
    rng = np.random.default_rng(11)
    loss = np.column_stack([
        0.5 + 0.2 * rng.standard_normal(90),
        0.6 + 0.2 * rng.standard_normal(90),
        1.4 + 0.2 * rng.standard_normal(90)])
    res = mcs.model_confidence_set(
        ["a", "b", "c"], loss, block_len=7, n_boot=1000, seed=4)
    retained_025 = set(res.set_at(0.25))
    eliminated_010 = set(res.eliminated_at(0.10))
    assert retained_025 & eliminated_010 == set()


# --- Moving block bootstrap --------------------------------------------------

def test_moving_block_indices_have_the_requested_shape():
    idx = mcs.moving_block_indices(50, 7, 100, np.random.default_rng(0))
    assert idx.shape == (100, 50)


def test_moving_block_indices_stay_in_range():
    idx = mcs.moving_block_indices(50, 7, 100, np.random.default_rng(0))
    assert idx.min() >= 0 and idx.max() < 50


def test_each_block_is_a_run_of_consecutive_folds():
    idx = mcs.moving_block_indices(50, 7, 1, np.random.default_rng(0))[0]
    assert np.array_equal(np.diff(idx[:7]), [1, 1, 1, 1, 1, 1])


def test_a_non_positive_block_length_is_rejected():
    with pytest.raises(ValueError):
        mcs.moving_block_indices(50, 0, 10, np.random.default_rng(0))


# --- Loss matrix assembly ----------------------------------------------------

def test_common_loss_matrix_restricts_to_folds_every_rung_scored():
    payload = _payload({
        "ra": _rung([0, 1, 2, 3, 4], [1.0, 2.0, 3.0, 4.0, 5.0]),
        "rb": _rung([0, 2, 4], [0.5, 1.5, 2.5], rung=1)})
    names, folds, loss = mcs.common_loss_matrix(payload, ["ra", "rb"])
    assert folds == [0, 2, 4]


def test_common_loss_matrix_pairs_by_fold_index_not_position():
    payload = _payload({
        "ra": _rung([0, 1, 2, 3, 4], [1.0, 2.0, 3.0, 4.0, 5.0]),
        "rb": _rung([0, 2, 4], [0.5, 1.5, 2.5], rung=1)})
    _names, _folds, loss = mcs.common_loss_matrix(payload, ["ra", "rb"])
    # ra's losses on folds 0,2,4 are 1.0,3.0,5.0 - its position-2/4 values, not 2.0/4.0.
    assert loss[:, 0].tolist() == [1.0, 3.0, 5.0]


def test_available_rungs_are_ordered_by_rung_then_name():
    payload = _payload({
        "rung3_gbm": _rung([0, 1], [1.0, 1.0], rung=3),
        "rung0_seasonal_naive": _rung([0, 1], [1.0, 1.0], rung=0),
        "rung2_ets": _rung([0, 1], [1.0, 1.0], rung=2),
        "rung2_absent": {"available": False, "note": "x"}})
    assert mcs.available_rungs(payload) == [
        "rung0_seasonal_naive", "rung2_ets", "rung3_gbm"]


# --- Paired variance diagnostic ---------------------------------------------

def test_perfectly_tracking_models_have_a_near_zero_paired_sd():
    base = np.linspace(1.0, 2.0, 40)
    payload = _payload({
        "ra": _rung(range(40), base + 0.5),
        "rb": _rung(range(40), base, rung=1)})
    pv = mcs.paired_variance(payload, ["ra", "rb"])[0]
    assert pv["sd_paired"] == pytest.approx(0.0, abs=1e-9)


def test_perfectly_tracking_models_have_paired_far_below_independent():
    base = np.linspace(1.0, 2.0, 40)
    payload = _payload({
        "ra": _rung(range(40), base + 0.5),
        "rb": _rung(range(40), base, rung=1)})
    pv = mcs.paired_variance(payload, ["ra", "rb"])[0]
    assert pv["paired_to_independent"] < 0.01


def test_the_mean_differential_is_the_gap_between_the_two_series():
    base = np.linspace(1.0, 2.0, 40)
    payload = _payload({
        "ra": _rung(range(40), base + 0.5),
        "rb": _rung(range(40), base, rung=1)})
    pv = mcs.paired_variance(payload, ["ra", "rb"])[0]
    assert pv["mean_diff"] == pytest.approx(0.5)


# --- Real committed vectors: provenance guard + integration smoke -----------

def test_run_venue_returns_nested_non_empty_sets_for_a_real_venue():
    """Reads the committed beer_hall fold vectors and runs the whole MCS; asserts only
    structural properties (non-empty, nested) so it is robust across numpy versions."""
    cf = mcs.run_venue("beer_hall")["runs"]["common_fold"]["sets"]
    s10, s25 = set(cf["0.1"]), set(cf["0.25"])
    assert s10 and s25 <= s10


def test_run_venue_rejects_vectors_built_at_the_wrong_store_ceiling(monkeypatch):
    import config
    monkeypatch.setattr(config, "EXPECTED_STORE_CEILING", "1999-01-01")
    with pytest.raises(StoreCeilingError):
        mcs.run_venue("beer_hall")
