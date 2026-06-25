"""A14 tests — feature enrichment: calendar correctness, event scoping, the
retrospective spike flag, weather bases, and the honest adoption verdict
(spec §9 gates G1/G2/G3/G7/G8/G10)."""

from __future__ import annotations

import pandas as pd
import pytest

from features.build_features import _ADOPTED_EXO, build_features, feature_columns
from ingest import calendar_sources as cal
from ingest import local_events, spike_days
from ingest.exog_weather import BASES, read_basis
from store import warehouse


@pytest.fixture(scope="module")
def store():
    warehouse.build()
    local_events.build()
    spike_days.build()


# --- G2 calendar correctness -------------------------------------------------

def test_school_term_false_on_spring_half_term():
    assert cal.is_school_term("2026-02-18") is False


def test_uni_term_true_in_michaelmas():
    assert cal.is_uni_term("2025-10-15") is True


def test_coverage_gaps_empty_for_beer_hall_span():
    assert cal.coverage_gaps("2025-06-04", "2026-05-31") == {}


# --- G1 seam activation ------------------------------------------------------

def test_calendar_seam_is_populated(store):
    feats = build_features("beer_hall")
    assert not feats["exo_is_uni_term"].isna().any()


def test_no_exo_feature_is_adopted_into_the_model(store):
    feats = build_features("beer_hall")
    cols = feature_columns(feats)
    assert not any(c.startswith("exo_") for c in cols)


# --- G7 spike flag is retrospective, never a model feature -------------------

def test_spike_flag_absent_from_feature_table(store):
    feats = build_features("beer_hall")
    assert "is_spike_day" not in feats.columns


def test_spike_days_table_computed(store):
    sp = spike_days.read_spikes()
    assert "is_spike_day" in sp.columns and len(sp) > 0


# --- G8 event scoping (never cross-city) -------------------------------------

def test_lancaster_event_flags_beer_hall(store):
    feats = build_features("beer_hall")
    row = feats[feats["date"] == pd.Timestamp("2025-11-08")]  # Light Up Lancaster
    assert int(row["exo_fixture_nearby"].iloc[0]) == 1


def test_lancaster_event_does_not_flag_two_river_taps(store):
    feats = build_features("two_river_taps")
    assert int(feats["exo_fixture_nearby"].sum()) == 0


# --- G3 weather bases (network-gated; skip if not ingested) ------------------

def test_three_weather_bases_present_when_ingested():
    present = [b for b in BASES if not read_basis(b).empty]
    if not present:
        pytest.skip("weather not ingested (no network) — run ingest.exog_weather")
    assert set(present) == set(BASES)


def test_observed_differs_from_hindcast_when_ingested():
    obs, hind = read_basis("observed"), read_basis("hindcast")
    if obs.empty or hind.empty:
        pytest.skip("weather not ingested")
    m = obs.merge(hind, on=["date", "cell"], suffixes=("_o", "_h"))
    assert (m["exo_temp_c_o"] - m["exo_temp_c_h"]).abs().max() > 0.01
