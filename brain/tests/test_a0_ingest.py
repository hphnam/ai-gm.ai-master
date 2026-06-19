"""A0 tests — ingest reconciles to the profiled audit figures, no leakage of
unparseable rows, VAT rule applied.
"""

from __future__ import annotations

import pandas as pd
import pytest

from config import EXPECTED_ROW_COUNTS, VAT_RATE
from ingest.normalise import canonical_venue, normalise


@pytest.fixture(scope="module")
def normalised() -> tuple[pd.DataFrame, dict]:
    return normalise()


def test_per_venue_counts_match_audit(normalised):
    _, manifest = normalised
    assert manifest["per_venue_counts"] == EXPECTED_ROW_COUNTS


def test_total_rows_reconcile(normalised):
    _, manifest = normalised
    assert manifest["reconciles"] is True


def test_no_kept_row_missing_venue_or_date(normalised):
    df, _ = normalised
    assert df["venue"].isna().sum() == 0
    assert df["date"].isna().sum() == 0


def test_vat_deflation_applied_to_trt_only(normalised):
    df, _ = normalised
    trt = df[df["venue"] == "two_river_taps"]
    bh = df[df["venue"] == "beer_hall"]
    # TRT ex-VAT is deflated by 1/1.2; Beer Hall is unchanged.
    assert trt["net_sales_exvat"].sum() == pytest.approx(
        trt["net_sales"].sum() / (1 + VAT_RATE), rel=1e-9
    )
    assert bh["net_sales_exvat"].sum() == pytest.approx(
        bh["net_sales"].sum(), rel=1e-9
    )


def test_canonical_venue_is_case_and_space_insensitive():
    assert canonical_venue("  THE  Beer   Hall ") == "beer_hall"
    assert canonical_venue("Ellel Village Hall") == "ellel"
    assert canonical_venue("nonexistent venue") is None
