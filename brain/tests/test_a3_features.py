"""A3 tests — features reconcile, are leak-free, and carry the activated seam."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from config import BH_NET_SALES_TOTAL, RECONCILE_TOL
from features.build_features import (
    _ADOPTED_EXO,
    EXO_COLUMNS,
    assert_no_leakage,
    build_features,
    feature_columns,
)


@pytest.fixture(scope="module")
def feats() -> pd.DataFrame:
    return build_features("beer_hall")


def test_series_reconciles_to_audit(feats):
    total = feats["value"].sum()
    assert abs(total - BH_NET_SALES_TOTAL) <= BH_NET_SALES_TOTAL * RECONCILE_TOL


def test_lag_7_equals_value_seven_days_earlier(feats):
    s = feats.set_index("date")["value"]
    row = feats.dropna(subset=["lag_7"]).iloc[10]
    assert np.isclose(row["lag_7"], s.loc[row["date"] - pd.Timedelta(days=7)])


def test_no_future_leakage(feats):
    assert_no_leakage(feats)  # raises on leak


def test_exogenous_seam_present_and_populated(feats):
    for col in EXO_COLUMNS:
        assert col in feats.columns


def test_deterministic_calendar_seam_is_populated(feats):
    for col in ("exo_is_school_term", "exo_is_uni_term"):
        assert not feats[col].isna().any()


def test_feature_columns_expose_adopted_exo_only(feats):
    cols = feature_columns(feats)
    assert "value" not in cols
    assert "date" not in cols
    assert "venue" not in cols
    assert _ADOPTED_EXO <= set(cols)
    # Non-adopted exo (everything, per the ablation verdict) stays out of the model.
    assert not (set(EXO_COLUMNS) - _ADOPTED_EXO) & set(cols)


def test_happy_hour_flag_is_wed_and_fri(feats):
    hh = feats[feats["is_happy_hour_day"] == 1]
    assert set(hh["dow"].unique()) == {2, 4}


# --- G12.9d: Ellel exo coverage (full exo set, train + test, no self-leak) ---

def test_ellel_features_carry_the_full_exo_and_chronos2_exo_column_set():
    from config import ENRICH_FEATURES
    from models.foundation import CHRONOS2_EXO_COLS
    from store.active_span import trim_to_active

    feats = trim_to_active(build_features("ellel"), "ellel")
    for col in (*ENRICH_FEATURES, *CHRONOS2_EXO_COLS):
        assert col in feats.columns, f"{col} missing from Ellel's feature table"


def test_ellel_active_span_has_no_nan_in_adopted_exo_or_a_reported_gap():
    """G12.9d assertion test: no NaN in the columns the Ellel exo entrant reads
    across its active trading span, or the shortfall is a reported weather_gap
    (never a silent zero, per the existing B3 rule)."""
    from ingest.exog_weather import weather_gap
    from models.foundation import CHRONOS2_EXO_COLS
    from store.active_span import trim_to_active

    feats = trim_to_active(build_features("ellel"), "ellel")
    nan_cols = [c for c in CHRONOS2_EXO_COLS if feats[c].isna().any()]
    if nan_cols:
        gaps = {g["cell"] for g in weather_gap()}
        weather_nan = [c for c in nan_cols
                      if c in ("exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs")]
        assert weather_nan and "ellel" in gaps, (
            f"unreported NaN in Ellel exo columns {nan_cols}, must be a "
            "structured weather_gap, never a silent gap")


def test_ellel_exo_entrant_never_reads_its_own_event_flag_as_a_covariate():
    """The Ellel exo entrant excludes is_ellel_event (a self-leak: it is a
    near-perfect proxy for Ellel's own sparse target on Ellel's own frame)."""
    from models.foundation import exo_cols_for_venue

    assert "is_ellel_event" not in exo_cols_for_venue("ellel")
