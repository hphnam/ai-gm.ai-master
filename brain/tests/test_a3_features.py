"""A3 tests — features reconcile, are leak-free, and carry the empty seam."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from config import BH_NET_SALES_TOTAL, RECONCILE_TOL
from features.build_features import (
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


def test_exogenous_seam_present_but_empty(feats):
    for col in EXO_COLUMNS:
        assert col in feats.columns
        assert feats[col].isna().all()


def test_feature_columns_exclude_target_ids_and_seam(feats):
    cols = feature_columns(feats)
    assert "value" not in cols
    assert "date" not in cols
    assert "venue" not in cols
    assert not any(c in cols for c in EXO_COLUMNS)


def test_happy_hour_flag_is_wed_and_fri(feats):
    hh = feats[feats["is_happy_hour_day"] == 1]
    assert set(hh["dow"].unique()) == {2, 4}
