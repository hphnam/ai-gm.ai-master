"""S12 C7 - the availability/occurrence partition contrast.

Synthetic frames only, so this runs without the store, without ETS and without a network.
The reproduction check in `verify_reproduction` is the one thing in the instrument that
everything else rests on, so it gets its own tests: that the contingency agrees cell for cell
with the function whose persisted number it has to reproduce, and that a disagreement is loud.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from eval.exchangeability_diagnostic import _partition_fidelity
from eval.partition_contrast import (
    cell_deltas,
    derived_rates,
    _arm_stats,
    contingency,
    occurrence_state,
    verify_reproduction,
)


def _frame(rows: list[tuple[int, float]]) -> pd.DataFrame:
    """(state, y) pairs into the frame both instruments read. `res` is unused by the cell
    counts and is present because `_partition_fidelity` reads it."""
    return pd.DataFrame([{"state": s, "y": y, "res": abs(y - 100.0)} for s, y in rows])


# --- The reproduction check --------------------------------------------------

def test_closed_traded_cell_equals_the_persisted_counts_definition():
    records = _frame([(1, 250.0), (1, 0.0), (1, 40.0), (0, 900.0), (0, 0.0)])
    assert (contingency(records)["counts"]["closed_traded"]
            == _partition_fidelity(records)["n_calendar_closed_but_traded"])


def test_reproduction_mismatch_raises_rather_than_warning(monkeypatch):
    monkeypatch.setattr("eval.partition_contrast.persisted_closed_but_traded",
                        lambda: {"ghost_bar": 94})
    venues = {"ghost_bar": {"contingency_records": {"counts": {"closed_traded": 93}}}}
    with pytest.raises(AssertionError, match="same population"):
        verify_reproduction(venues)


def test_reproduction_match_reports_both_numbers(monkeypatch):
    monkeypatch.setattr("eval.partition_contrast.persisted_closed_but_traded",
                        lambda: {"ghost_bar": 94})
    venues = {"ghost_bar": {"contingency_records": {"counts": {"closed_traded": 94}}}}
    out = verify_reproduction(venues)
    assert out["per_venue"]["ghost_bar"] == {"persisted": 94, "measured": 94, "match": True}


def test_a_venue_absent_from_the_persisted_artefact_is_a_failure(monkeypatch):
    monkeypatch.setattr("eval.partition_contrast.persisted_closed_but_traded", dict)
    venues = {"ghost_bar": {"contingency_records": {"counts": {"closed_traded": 0}}}}
    with pytest.raises(AssertionError):
        verify_reproduction(venues)


# --- The contingency ---------------------------------------------------------

def test_the_four_cells_partition_the_population():
    records = _frame([(1, 250.0), (1, 0.0), (0, 900.0), (0, 0.0), (0, 12.0)])
    counts = contingency(records)["counts"]
    assert sum(counts.values()) == len(records)


def test_a_calendar_open_day_that_took_nothing_is_its_own_cell():
    records = _frame([(0, 0.0), (0, 500.0)])
    assert contingency(records)["counts"]["open_took_nothing"] == 1


def test_disagreement_counts_both_off_diagonal_cells():
    records = _frame([(1, 250.0), (0, 0.0), (0, 500.0), (1, 0.0)])
    assert contingency(records)["n_disagreeing"] == 2


def test_occurrence_treats_a_zero_takings_day_as_took_nothing():
    records = _frame([(0, 0.0), (0, 0.01)])
    assert list(occurrence_state(records)) == [1, 0]


# --- Empty cells are reported, not backfilled --------------------------------

def _banded(rows: list[tuple[float, float, float]]) -> pd.DataFrame:
    """(y, lo, hi) triples into the shape `_arm_stats` reads."""
    return pd.DataFrame([{"y": y, "lo": lo, "hi": hi} for y, lo, hi in rows])


def test_an_empty_cell_reports_empty_rather_than_a_coverage_number():
    banded = _banded([(500.0, 400.0, 600.0), (0.0, 0.0, 50.0)])
    avail = np.array([0, 1])
    occur = np.array([0, 1])
    out = _arm_stats(banded, avail, occur)
    assert out["cells"]["closed_traded"] == {
        "n": 0, "empty": True, "coverage": None, "ci": [None, None],
        "mean_width": None, "median_width": None}


def test_a_populated_cell_carries_its_own_size_beside_its_coverage():
    banded = _banded([(500.0, 400.0, 600.0), (900.0, 400.0, 600.0)])
    avail = np.array([0, 0])
    occur = np.array([0, 0])
    cell = _arm_stats(banded, avail, occur)["cells"]["open_traded"]
    assert (cell["n"], cell["coverage"]) == (2, 0.5)


# --- The pre-registered contrast quantity ------------------------------------

def _arm(coverage: float | None, width: float | None) -> dict:
    cell = {"n": 10, "empty": coverage is None, "coverage": coverage,
            "ci": [None, None], "mean_width": width, "median_width": width}
    return {"overall": cell, "cells": {k: cell for k in
                                       ("open_traded", "open_took_nothing",
                                        "closed_traded", "closed_took_nothing")}}


def test_delta_is_availability_minus_occurrence():
    block = {"availability": _arm(0.489, 187.69), "occurrence": _arm(0.926, 805.80)}
    assert cell_deltas(block)["closed_traded"]["delta_coverage"] == pytest.approx(-0.437)


def test_delta_on_an_empty_cell_is_none_not_zero():
    block = {"availability": _arm(None, None), "occurrence": _arm(0.9, 100.0)}
    assert cell_deltas(block)["closed_traded"]["delta_coverage"] is None


# --- Divergence has two denominators and they are not the same ---------------

def _block(open_traded: int, open_none: int, closed_traded: int, closed_none: int) -> dict:
    counts = {"open_traded": open_traded, "open_took_nothing": open_none,
              "closed_traded": closed_traded, "closed_took_nothing": closed_none}
    n = sum(counts.values())
    c = {"counts": counts, "n": n, "n_disagreeing": open_none + closed_traded}
    return {"contingency_records": c, "contingency_banded": c}


def test_calendar_open_rate_uses_the_open_group_as_its_denominator():
    rates = derived_rates(_block(263, 1037, 21, 499))["contingency_records"]
    assert rates["open_group_took_nothing_rate"] == pytest.approx(1037 / 1300)


def test_unconditional_divergence_uses_the_whole_population():
    rates = derived_rates(_block(263, 1037, 21, 499))["contingency_records"]
    assert rates["unconditional_divergence"] == pytest.approx(1058 / 1820)


def test_the_two_denominators_give_materially_different_rates():
    rates = derived_rates(_block(263, 1037, 21, 499))["contingency_records"]
    assert (rates["open_group_took_nothing_rate"]
            - rates["unconditional_divergence"]) > 0.2
