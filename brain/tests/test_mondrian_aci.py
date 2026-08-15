"""S20 - Mondrian x AgACI, the group-conditional adaptive arm.

Synthetic frames only, so this runs without the store, without ETS and without a network.

Two things everything else rests on, so both get their own tests. P5 -- that group membership is
invariant across arms, because adaptation changes level and not membership -- is a reproduction
check with no tolerance, and it is tested in both directions. The per-group alpha sequence is the
design decision row 112(e) says is most easily made by accident, so it is tested by behaviour: a
group that keeps missing and a group that keeps hitting must drive their effective levels APART.
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from conformal.methods import HORIZON
from eval import interval_calibration as ic
from eval.mondrian_aci import (
    ARM_B,
    ARM_D,
    ARM_E,
    attainable_min_n,
    classify_quantile_call,
    fixed_arm_attainability,
    pool_trace,
    run_grouped_agaci,
    verify_membership,
    verify_reproduction,
)


def _records(rows: list[tuple[int, float, float]], start: str = "2026-01-01") -> pd.DataFrame:
    """(state, y, yhat) per day into the record frame the instruments read.

    One step-1 observation per origin, which is the smallest frame that still exercises the
    pool advance, the warmup and the lagged update. The target is the day AFTER the origin, as
    `generate_records` produces it: a step-h row targets origin + h. A fixture that dated the
    target on the origin would leak the banded row's own residual into the pool that bands it,
    and would never fire the lagged update at all.
    """
    dates = pd.date_range(start, periods=len(rows) + 1, freq="D")
    return pd.DataFrame([
        {"origin": dates[i], "step": 1, "target": dates[i + 1], "y": y, "yhat": yh,
         "res": abs(y - yh), "state": s}
        for i, (s, y, yh) in enumerate(rows)
    ])


def _alternating(n: int, warm: int) -> pd.DataFrame:
    """`n` days alternating between the two Mondrian groups, both groups well populated."""
    return _records([(i % 2, 100.0 + (i % 7) * 10.0, 100.0) for i in range(n)])


# --- P5, the membership reproduction check -----------------------------------

def test_p5_passes_when_every_arm_carries_the_same_cell_size():
    block = {"contingency_records": {"counts": {"closed_traded": 94}},
             "arms": {ARM_B: {"cells": {"closed_traded": {"n": 94}}},
                      ARM_D: {"cells": {"closed_traded": {"n": 94}}}}}
    out = verify_membership({"beer_hall": block})
    assert out["per_venue"]["beer_hall"]["match"] is True


def test_p5_raises_when_an_arm_regroups_the_days(monkeypatch):
    monkeypatch.setattr("eval.partition_contrast.persisted_closed_but_traded",
                        lambda: {"ghost_bar": 94})
    block = {"contingency_records": {"counts": {"closed_traded": 94}},
             "arms": {ARM_B: {"cells": {"closed_traded": {"n": 94}}},
                      ARM_D: {"cells": {"closed_traded": {"n": 93}}}}}
    with pytest.raises(AssertionError, match="not partitioning the same days"):
        verify_membership({"ghost_bar": block})


def test_p5_raises_when_the_records_frame_misses_the_persisted_count(monkeypatch):
    monkeypatch.setattr("eval.partition_contrast.persisted_closed_but_traded",
                        lambda: {"ghost_bar": 94})
    block = {"contingency_records": {"counts": {"closed_traded": 93}},
             "arms": {ARM_B: {"cells": {"closed_traded": {"n": 93}}}}}
    with pytest.raises(AssertionError, match="against persisted"):
        verify_membership({"ghost_bar": block})


# --- R4 and R5, the coverage reproduction checks ------------------------------

def _repro_block(cov_b: float, cov_e: float, n: int = 94) -> dict:
    return {"arms": {ARM_B: {"cells": {"closed_traded": {"coverage": cov_b, "n": n}}},
                     ARM_E: {"cells": {"closed_traded": {"coverage": cov_e, "n": n}}}}}


def _patch_c7(monkeypatch, mondrian: float, oracle: float, n: int = 94):
    monkeypatch.setattr("eval.mondrian_aci.persisted_c7",
                        lambda: {"beer_hall": {"mondrian": mondrian, "oracle": oracle, "n": n}})


def test_r5_passes_when_arm_b_reproduces_c7_at_the_published_precision(monkeypatch):
    _patch_c7(monkeypatch, 0.48936170212765956, 0.925531914893617)
    out = verify_reproduction({"beer_hall": _repro_block(0.48936170212765956,
                                                         0.925531914893617)})
    assert out["per_venue"]["beer_hall"]["R5_arm_B"]["match_at_published_dp"] is True


def test_r5_halts_when_arm_b_diverges_from_c7(monkeypatch):
    _patch_c7(monkeypatch, 0.48936170212765956, 0.925531914893617)
    with pytest.raises(AssertionError, match="HALT"):
        verify_reproduction({"beer_hall": _repro_block(0.5000, 0.925531914893617)})


def test_r4_halts_when_the_oracle_arm_diverges_from_c7(monkeypatch):
    _patch_c7(monkeypatch, 0.48936170212765956, 0.925531914893617)
    with pytest.raises(AssertionError, match="HALT"):
        verify_reproduction({"beer_hall": _repro_block(0.48936170212765956, 0.8000)})


def test_a_cell_size_disagreement_halts_even_when_coverage_agrees(monkeypatch):
    _patch_c7(monkeypatch, 0.48936170212765956, 0.925531914893617, n=94)
    with pytest.raises(AssertionError, match="closed_traded cell n"):
        verify_reproduction({"beer_hall": _repro_block(0.48936170212765956,
                                                       0.925531914893617, n=93)})


def test_an_artefact_that_has_drifted_from_report_86_halts(monkeypatch):
    # The persisted artefact and the measurement agree with each other but not with the figure
    # report 86 published, which is the drift the published literals exist to catch.
    _patch_c7(monkeypatch, 0.5500, 0.925531914893617)
    with pytest.raises(AssertionError, match="disagrees with report 86"):
        verify_reproduction({"beer_hall": _repro_block(0.5500, 0.925531914893617)})


# --- The degeneracy conventions ----------------------------------------------

def test_the_level_is_attainable_at_nine_observations_and_not_at_eight():
    assert attainable_min_n(0.90) == 9


def test_a_level_at_or_below_zero_is_a_zero_width_interval():
    assert classify_quantile_call(500, 0.0) == "zero_width"


def test_a_level_at_or_above_one_returns_the_largest_observed_residual():
    assert classify_quantile_call(500, 1.0) == "max_residual_level_excursion"


def test_a_calibration_set_too_small_for_the_level_is_an_attainability_clamp():
    assert classify_quantile_call(8, 0.90) == "attainability_clamp"


def test_a_calibration_set_large_enough_for_the_level_is_not_degenerate():
    assert classify_quantile_call(9, 0.90) is None


def test_an_empty_pool_is_reported_rather_than_passed_over():
    assert classify_quantile_call(0, 0.90) == "empty_pool"


# --- The per-group alpha sequence, row 112(e) --------------------------------

def _diverging_groups() -> pd.DataFrame:
    """Group 0 misses on every banded row; group 1 hits on every banded row.

    Group 0's residual grows strictly, so the current residual always exceeds every residual in
    its own pool and therefore exceeds any quantile of it -- the miss is deterministic and cannot
    self-correct as the pool catches up. Group 1's residual is constant, so its band always
    covers. Two groups, opposite outcome streams, one shared driver.
    """
    rows = []
    for i in range(240):
        if i % 2 == 0:
            rows.append((0, 100.0 + 100.0 * (i + 1), 100.0))
        else:
            rows.append((1, 110.0, 100.0))
    return _records(rows)


def test_each_group_keeps_its_own_effective_level():
    """The design decision row 112(e) says is most easily made by accident.

    A single alpha sequence shared across groups cannot hold two different values at once, so a
    disagreement here is the per-group state existing.
    """
    out = run_grouped_agaci(_diverging_groups(), 0.90, gammas=(0.05,), warmup=40)
    eff = {g: out["_aggs"][g].experts[0].eff[1] for g in out["groups"]}
    assert eff[0] != eff[1]


def test_the_group_that_keeps_missing_drives_its_own_level_wider():
    out = run_grouped_agaci(_diverging_groups(), 0.90, gammas=(0.05,), warmup=40)
    # An effective alpha below the 0.10 target is a level above 0.90, i.e. a wider band.
    assert out["_aggs"][0].experts[0].eff[1] < 0.10


def test_the_group_that_keeps_hitting_is_not_widened_by_the_other_group_s_misses():
    out = run_grouped_agaci(_diverging_groups(), 0.90, gammas=(0.05,), warmup=40)
    assert out["_aggs"][1].experts[0].eff[1] > 0.10


def test_a_group_with_no_slice_in_the_pool_falls_back_and_is_counted():
    """Group 1 appears only after the pool is warm, so its first bands have no slice of its own."""
    rows = [(0, 100.0 + (i % 5) * 10.0, 100.0) for i in range(60)]
    rows += [(1, 300.0, 100.0)]
    out = run_grouped_agaci(_records(rows), 0.90, gammas=(0.05,), warmup=40)
    assert out["group_pool_empty"].get("1") == 1


# --- The pool reconstruction agrees with the banded pass ----------------------

def test_pool_trace_yields_exactly_the_origins_run_online_bands():
    records = _alternating(200, 40)
    banded = ic.run_online(records, 0.90, warmup=40)["D"]
    assert sorted({o for o, _, _, _ in pool_trace(records, 40)}) == sorted(set(banded["origin"]))


def test_arm_d_bands_the_same_observations_as_the_mondrian_arm():
    records = _alternating(200, 40)
    b = ic.run_online(records, 0.90, warmup=40)["D"].sort_values(["origin", "step"])
    d = run_grouped_agaci(records, 0.90, gammas=(0.05,),
                          warmup=40)["banded"].sort_values(["origin", "step"])
    assert list(zip(b["origin"], b["step"])) == list(zip(d["origin"], d["step"]))


def test_arm_d_preserves_every_row_s_group_label():
    records = _alternating(200, 40)
    d = run_grouped_agaci(records, 0.90, gammas=(0.05,),
                          warmup=40)["banded"].sort_values(["origin", "step"])
    merged = d.merge(records[["origin", "step", "state"]], on=["origin", "step"],
                     suffixes=("_banded", "_records"))
    assert (merged["state_banded"] == merged["state_records"]).all()


# --- The fixed-arm attainability count ---------------------------------------

def test_a_group_that_never_reaches_nine_observations_is_counted_as_clamped():
    """Group 1 gets one observation every fortnight, so its slice stays under nine all through."""
    rows = [(1 if i % 14 == 0 else 0, 100.0 + (i % 5) * 10.0, 100.0) for i in range(200)]
    out = fixed_arm_attainability(_records(rows), 0.90, warmup=40)
    assert out["clamp_rows_by_group"].get("1", 0) > 0


def test_a_well_populated_group_is_not_counted_as_clamped():
    out = fixed_arm_attainability(_alternating(200, 40), 0.90, warmup=40)
    assert out["clamp_rows_by_group"].get("0", 0) == 0


def test_a_clean_attainability_count_reports_how_much_it_examined():
    """A zero over an unexamined loop is UNKNOWN, not clean, so the scope rides with the count."""
    out = fixed_arm_attainability(_alternating(200, 40), 0.90, warmup=40)
    assert out["examined_origin_group_events"] > 0


# --- The instrumentation must not outlive itself -----------------------------

def test_the_quantile_tap_restores_the_shared_function():
    """Arm D instruments a module global, so the restore is the thing that keeps arms A, B, C
    and E measuring what they would have measured without it."""
    from conformal import methods
    before = methods.safe_conformal_quantile
    run_grouped_agaci(_alternating(200, 40), 0.90, gammas=(0.05,), warmup=40)
    assert methods.safe_conformal_quantile is before


# --- The B-to-D group delta, which P2 and P4 are verdicts about --------------

def test_the_group_delta_reports_the_width_change_p2_is_a_verdict_about():
    from eval.mondrian_aci import ARM_D as D, b_to_d_group_deltas
    arms = {ARM_B: {"by_availability_group": {"1": {"n": 500, "coverage": 0.84,
                                                    "mean_width": 100.0}}},
            D: {"by_availability_group": {"1": {"n": 500, "coverage": 0.83,
                                                "mean_width": 125.0}}}}
    assert b_to_d_group_deltas(arms)["1"]["delta_mean_width"] == 25.0
