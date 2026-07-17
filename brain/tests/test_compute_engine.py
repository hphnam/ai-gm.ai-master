"""Stateless compute: dataset in, bundle out, nothing persisted.

The isolation tests are the point. The architecture's claim is that compute cannot reach
another tenant's data even in principle, because it holds no connection and sees only
what the request carried. That claim is only worth what these tests prove, so they are
written to fail loudly if compute ever starts reading the served store.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from compute.contract import (
    ComputeDataset,
    OrgProfile,
    PriorState,
    SalesRow,
    TradingHoursRow,
    VenueProfile,
)
from compute.engine import run
from store import warehouse


def _sales(venue: str, n: int = 200, start: date = date(2026, 1, 1)) -> list[SalesRow]:
    """A weekly-seasonal series with enough history for the conformal warmup."""
    return [
        SalesRow(venue=venue, date=start + timedelta(days=i), category="Beer",
                 item="Test IPA", units=10.0,
                 revenue_exvat=100.0 + (i % 7) * 50.0)
        for i in range(n)
    ]


def _dataset(venue: str = "ghost_bar", **kw) -> ComputeDataset:
    return ComputeDataset(
        org_profile=OrgProfile(
            org_id=kw.pop("org_id", "org_test"),
            venues=[VenueProfile(venue_id="v1", slug=venue)]),
        sales_daily=kw.pop("sales", _sales(venue)),
        prior_state=kw.pop("prior_state", PriorState(served_model={venue: "rung2_ets"})),
        **kw,
    )


# --- The contract holds -------------------------------------------------------

def test_compute_returns_forecasts_for_the_supplied_venue():
    bundle = run(_dataset())
    assert {f.venue for f in bundle.forecasts} == {"ghost_bar"}


def test_compute_returns_bands_for_both_levels():
    bundle = run(_dataset())
    assert {b.level for b in bundle.bands} == {0.80, 0.90}


def test_watermark_is_the_last_day_the_dataset_carries():
    sales = _sales("ghost_bar", n=10, start=date(2026, 3, 1))
    bundle = run(_dataset(sales=sales))
    assert bundle.watermark == date(2026, 3, 10)


def test_org_id_is_echoed_not_decided():
    bundle = run(_dataset(org_id="org_specific"))
    assert bundle.org_id == "org_specific"


def test_supplied_served_model_is_honoured():
    """Promotion must be continuous: a model the API says is live stays live."""
    bundle = run(_dataset(prior_state=PriorState(served_model={"ghost_bar": "rung1_robust_dow"})))
    assert [s.model for s in bundle.served] == ["rung1_robust_dow"]


def test_cold_start_without_a_served_model_is_reported_not_silent():
    bundle = run(_dataset(prior_state=PriorState()))
    assert any("cold-starting" in d for d in bundle.diagnostics)


# --- The liveness gate --------------------------------------------------------

def test_a_venue_with_no_sales_is_dormant_not_forecast():
    """The GBP 5,329-for-a-dead-venue rule, on injected data: a dormant venue gets a
    marker, never a positive projection."""
    ds = ComputeDataset(
        org_profile=OrgProfile(org_id="o", venues=[
            VenueProfile(venue_id="v1", slug="ghost_bar"),
            VenueProfile(venue_id="v2", slug="closed_bar")]),
        sales_daily=_sales("ghost_bar"),
        prior_state=PriorState(served_model={"ghost_bar": "rung2_ets"}),
    )
    bundle = run(ds)
    assert [d.venue for d in bundle.dormant] == ["closed_bar"]


def test_a_dormant_venue_gets_no_forecast_rows():
    ds = ComputeDataset(
        org_profile=OrgProfile(org_id="o", venues=[
            VenueProfile(venue_id="v1", slug="ghost_bar"),
            VenueProfile(venue_id="v2", slug="closed_bar")]),
        sales_daily=_sales("ghost_bar"),
        prior_state=PriorState(served_model={"ghost_bar": "rung2_ets"}),
    )
    bundle = run(ds)
    assert not [f for f in bundle.forecasts if f.venue == "closed_bar"]


# --- Cold start: the first thing a new tenant hits ---------------------------

def test_an_org_with_no_venues_returns_an_empty_bundle_not_an_error():
    bundle = run(ComputeDataset(
        org_profile=OrgProfile(org_id="o", venues=[]), sales_daily=[]))
    assert bundle.forecasts == []


def test_a_new_org_with_no_sales_yet_is_dormant_not_a_failure():
    """The cold-start path. An empty line_items frame with no dtypes makes DuckDB infer
    `date` as INTEGER, so the L1 view fails to bind and the whole call 503s - which is
    the first thing a brand-new tenant would ever see."""
    bundle = run(ComputeDataset(
        org_profile=OrgProfile(org_id="o", venues=[
            VenueProfile(venue_id="v", slug="brand_new_bar")]),
        sales_daily=[]))
    assert [d.venue for d in bundle.dormant] == ["brand_new_bar"]


# --- Isolation: the load-bearing claim ---------------------------------------

def test_compute_writes_nothing_to_the_served_store():
    run(_dataset())
    con = warehouse.connect(read_only=True)
    try:
        leaked = con.execute(
            "SELECT COUNT(*) FROM line_items WHERE venue = 'ghost_bar'").fetchone()[0]
    finally:
        con.close()
    assert leaked == 0


def test_compute_cannot_see_venues_it_was_not_given():
    """A fabricated org must not inherit the served store's real venues. If compute ever
    reads the served store instead of its dataset, this is what catches it."""
    bundle = run(_dataset())
    assert {f.venue for f in bundle.forecasts} == {"ghost_bar"}


def test_two_orgs_in_one_process_do_not_bleed():
    """The compute service is shared, so sequential orgs must be independent."""
    first = run(_dataset(venue="org_a_bar", org_id="org_a"))
    second = run(_dataset(venue="org_b_bar", org_id="org_b"))
    assert {f.venue for f in first.forecasts} == {"org_a_bar"}
    assert {f.venue for f in second.forecasts} == {"org_b_bar"}


def test_the_scratch_store_is_gone_after_the_run():
    """Nothing persists: no volume to preserve, no residue to leak into the next call."""
    seen: list = []

    real_load = __import__("compute.loader", fromlist=["load"]).load

    def spy(dataset):
        seen.append(warehouse.current_db_path())
        return real_load(dataset)

    import compute.engine as engine
    original = engine.loader.load
    engine.loader.load = spy
    try:
        run(_dataset())
    finally:
        engine.loader.load = original

    assert seen and not seen[0].exists()


def test_the_path_reverts_to_the_served_store_after_a_run():
    import config
    run(_dataset())
    assert warehouse.current_db_path() == config.DUCKDB_PATH


def test_a_failing_venue_does_not_lose_the_bundle():
    """One venue's blow-up must be reported, not swallowed, and must not take the org's
    other forecasts with it."""
    ds = ComputeDataset(
        org_profile=OrgProfile(org_id="o", venues=[
            VenueProfile(venue_id="v1", slug="ghost_bar")]),
        sales_daily=_sales("ghost_bar"),
        prior_state=PriorState(served_model={"ghost_bar": "no_such_model"}),
    )
    bundle = run(ds)
    assert any("forecast failed" in d for d in bundle.diagnostics)


# --- The dataset contract is strict ------------------------------------------

def test_unknown_dataset_fields_are_rejected():
    """A silently-dropped field is how a caller comes to believe it sent something."""
    with pytest.raises(ValidationError):
        OrgProfile(org_id="o", venues=[], not_a_real_field=1)


def test_trading_hours_round_trip_into_the_scratch_store():
    """Trading hours are not derivable from a daily aggregate, so the API supplies them
    and the loader must land them where the World Cup features look."""
    ds = _dataset()
    ds.trading_hours = [TradingHoursRow(venue="ghost_bar", dow=d, open_hour=12.0,
                                        close_hour=23.0, n=100) for d in range(7)]
    captured: dict = {}

    import compute.engine as engine
    original = engine._compute

    def spy(dataset):
        con = warehouse.connect(read_only=True)
        try:
            captured["rows"] = con.execute(
                "SELECT COUNT(*) FROM venue_trading_hours").fetchone()[0]
        finally:
            con.close()
        return original(dataset)

    engine._compute = spy
    try:
        run(ds)
    finally:
        engine._compute = original

    assert captured["rows"] == 7
