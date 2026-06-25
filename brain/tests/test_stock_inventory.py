"""A11/A12 tests — stock ingest, panel integrity, and the days-of-cover signal
(spec §10 gates G1–G9)."""

from __future__ import annotations

import pytest

from hierarchy import reconcile
from ingest import stock_normalise
from signals import stock_inventory
from store import warehouse


@pytest.fixture(scope="module")
def built():
    """Build the store + stock tables once; return the in-memory artefacts."""
    warehouse.build()
    panel, conflicts, recon = stock_normalise.build_bar_panel()
    master = stock_normalise.build_master(panel)
    agg = stock_normalise.build_snapshot_agg(panel)
    brewery = stock_normalise.build_brewery()
    stock_normalise._persist(panel, master, agg, brewery)
    reconcile.reconcile()              # persist A6 forecasts the signal reads
    out = stock_inventory.run()        # persist stock_cover
    return {"panel": panel, "master": master, "agg": agg, "conflicts": conflicts,
            "recon": recon, "brewery": brewery, "cover": out["cover"]}


# --- G1 ingest reconciles ----------------------------------------------------

def test_ingest_yields_ten_unique_snapshots(built):
    assert built["recon"]["n_snapshots"] == 10


def test_footers_reconcile_on_majority_of_sheets(built):
    assert built["recon"]["n_within_1pct"] >= 7


# --- G2 panel integrity ------------------------------------------------------

def test_panel_has_no_null_category(built):
    assert built["panel"]["l1"].isna().sum() == 0


def test_panel_value_is_non_negative(built):
    assert (built["panel"]["value"] >= 0).all()


def test_canon_collapses_lunebrew_casing_variants():
    assert stock_normalise.canon("LuneBrew: Session IPA") == "lunebrew session ipa"


# --- G3 date conflict surfaced (FLAG-1) --------------------------------------

def test_march_date_conflict_is_surfaced(built):
    files = [c["file"] for c in built["conflicts"]]
    assert "Stock Sheet 01.03.2026.xlsx" in files


# --- G4 master & aggregate ---------------------------------------------------

def test_master_core_product_count(built):
    assert int(built["master"]["is_core"].sum()) == 129


def test_snapshot_aggregate_has_ten_rows(built):
    assert len(built["agg"]) == 10


# --- G5 cover signal ---------------------------------------------------------

def test_mapped_line_has_days_of_cover(built):
    mapped = built["cover"][built["cover"]["a6_node"].notna()]
    assert mapped["days_of_cover"].notna().all()


def test_suggested_order_is_non_negative_integer(built):
    mapped = built["cover"][built["cover"]["forecast_daily_pints"].notna()]
    orders = mapped["suggested_order_kegs"]
    assert ((orders >= 0) & (orders % 1 == 0)).all()


def test_unmapped_line_carries_null_cover(built):
    unmapped = built["cover"][built["cover"]["a6_node"].isna()]
    assert unmapped["days_of_cover"].isna().all()


# --- G6 A6 still headless ----------------------------------------------------

def test_a6_reconcile_runs_without_stock_table(built):
    con = warehouse.connect()
    try:
        con.execute("DROP TABLE IF EXISTS stock_cover")
    finally:
        con.close()
    out = reconcile.reconcile()
    stock_inventory.run()  # restore stock_cover for any later readers
    assert out["coherent"] and out["stock"] == []


# --- G9 brewery isolated -----------------------------------------------------

def test_brewery_table_has_no_venue_join_column(built):
    assert "venue" not in built["brewery"].columns
