"""A14b tests — the weather/calendar diagnostic computes its pieces and adopts
nothing (spec gates G1/G3/G5/G7). The GBM-heavy tests A/C are exercised by the
module run, not the unit suite (kept fast)."""

from __future__ import annotations

import pytest

from features.build_features import _ADOPTED_EXO, feature_columns, build_features
from signals import weather_diagnostic as wd
from store import warehouse


@pytest.fixture(scope="module")
def store():
    warehouse.build()


# --- G1 / G7 no regression, non-adopting -------------------------------------

def test_diagnostic_adopts_nothing():
    assert _ADOPTED_EXO == frozenset()


def test_feature_columns_have_no_exogenous_columns(store):
    cols = feature_columns(build_features("beer_hall"))
    assert not any(c.startswith("exo_") for c in cols)


# --- G3 physiology-matched features ------------------------------------------

def test_beer_garden_day_is_binary(store):
    ser = warehouse.read_series("beer_hall", "L1", fill_calendar=True)[["date", "value"]]
    feats = wd._series_features(ser, "beer_hall", wd._climatology())
    assert set(feats["exo_beer_garden_day"].dropna().unique()) <= {0.0, 1.0}


def test_climatology_covers_the_year_when_weather_present():
    climo = wd._climatology()
    if climo.empty:
        pytest.skip("weather not ingested")
    assert climo.notna().sum() >= 300


# --- G5 redundancy regression ------------------------------------------------

def test_test_d_reports_incremental_r2_for_l1(store):
    if wd.read_basis("leadmatched").empty:
        pytest.skip("weather not ingested")
    rows = wd.test_d(wd._climatology())
    l1 = next((r for r in rows if r["series"] == "L1"), None)
    assert l1 is not None and "incr_r2" in l1
