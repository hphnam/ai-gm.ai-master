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


# --- The forward horizon: the forecast the service exists to produce ---------

def test_the_forecast_is_for_dates_after_the_supplied_history():
    """Phase 2 returned a BACKTEST: 57 rows, every one for a day already in the
    dataset. A prediction about the past is not what the caller asked for."""
    bundle = run(_dataset())
    last_history = max(r.date for r in _sales("ghost_bar"))
    assert all(f.target_date > last_history for f in bundle.forecasts)


def test_horizon_days_drives_the_number_of_forecast_days():
    bundle = run(_dataset(horizon_days=3))
    assert len({f.target_date for f in bundle.forecasts}) == 3


def test_the_forecast_starts_the_day_after_the_last_observation():
    bundle = run(_dataset())
    last_history = max(r.date for r in _sales("ghost_bar"))
    assert min(f.target_date for f in bundle.forecasts) == last_history + timedelta(days=1)


def test_bands_cover_every_forecast_date():
    """A point without a band is not a deliverable: Objective 1 is the interval."""
    bundle = run(_dataset())
    assert ({b.target_date for b in bundle.bands}
            == {f.target_date for f in bundle.forecasts})


def test_a_band_too_thin_to_calibrate_is_withheld_not_faked():
    """Below the calibration floor the conformal quantile is the max of a handful of
    errors. An honestly absent band beats a meaningless one."""
    bundle = run(_dataset(sales=_sales("ghost_bar", n=125)))
    assert bundle.bands == [] and bundle.forecasts


# --- Supplied-but-unconsumed fields are reported, not dropped ----------------

def test_stock_enabled_is_reported_as_unhonoured():
    """The one field Phase 3 leaves unwired: the stock pipeline reads spreadsheets off
    disk and has no injected path."""
    ds = _dataset()
    ds.org_profile.stock_enabled = True
    bundle = run(ds)
    assert any("stock_enabled" in d and "NOT honoured" in d for d in bundle.diagnostics)


def test_a_default_dataset_reports_no_false_unconsumed_warnings():
    """The warnings must mean something: a caller sending nothing extra gets silence."""
    bundle = run(_dataset())
    assert not [d for d in bundle.diagnostics if "NOT consumed" in d or "NOT honoured" in d]


# --- Prior state round-trips -------------------------------------------------

def test_briefing_chain_survives_the_round_trip():
    """Drop it and every standing item re-fires daily: the false-alarm control is gone."""
    chain = [{"id": "stock-low", "status": "continuing"}]
    bundle = run(_dataset(prior_state=PriorState(
        served_model={"ghost_bar": "rung2_ets"}, briefing_chain=chain)))
    assert bundle.briefing_chain == chain


def test_change_point_state_survives_the_round_trip():
    """Drop it and a closed venue re-alarms every day."""
    state = {"ghost_bar": {"dormant_since": "2026-05-08"}}
    bundle = run(_dataset(prior_state=PriorState(
        served_model={"ghost_bar": "rung2_ets"}, change_point_state=state)))
    assert bundle.change_point_state == state


# --- Scratch residue ----------------------------------------------------------

def test_sweep_removes_a_stranded_scratch_directory():
    """TemporaryDirectory does not unwind on SIGKILL, and an OOM kill is how this
    process realistically dies, stranding one org's sales in TMPDIR."""
    import tempfile as _tf
    from pathlib import Path as _P

    from compute.engine import SCRATCH_PREFIX, sweep_stale_scratch

    stranded = _P(_tf.mkdtemp(prefix=SCRATCH_PREFIX))
    (stranded / "scratch.duckdb").write_bytes(b"one org's sales")
    assert sweep_stale_scratch() >= 1
    assert not stranded.exists()


# --- The dataset contract is strict ------------------------------------------

def test_unknown_dataset_fields_are_rejected():
    """A silently-dropped field is how a caller comes to believe it sent something."""
    with pytest.raises(ValidationError):
        OrgProfile(org_id="o", venues=[], not_a_real_field=1)


def _with_typo(year: int) -> list[SalesRow]:
    return _sales("ghost_bar") + [
        SalesRow(venue="ghost_bar", date=date(year, 1, 15), category="Beer",
                 item="Test IPA", units=1.0, revenue_exvat=100.0)]


@pytest.mark.parametrize("year", [2027, 2036, 2202])
def test_a_future_dated_row_is_refused_whatever_the_year(year):
    """`sales_daily` is closed history, so a future date is a typo. `trim_to_active`
    trims only ZERO endpoints, so it survives, becomes the series maximum and takes the
    forecast origin and watermark with it - silently.

    Parametrised because the first guard was a SPAN check: it rejected 2202 and ACCEPTED
    2027 and 2036, which are one-keystroke slips and therefore likelier. Span is a
    relative measure of a failure that is absolute.
    """
    with pytest.raises(ValidationError):
        _dataset(sales=_with_typo(year))


def test_a_wholly_mis_stamped_export_is_refused_despite_a_normal_span():
    """The case a span guard cannot see: every row shifted to 2202, so the span is a
    perfectly ordinary 199 days. It forecast 2202-07-20 before this."""
    rows = _sales("ghost_bar", n=200, start=date(2202, 1, 1))
    with pytest.raises(ValidationError):
        _dataset(sales=rows)


def test_the_date_error_names_the_offending_row_so_it_is_findable():
    """"Too far ahead" alone leaves the caller hunting one row in 200,000."""
    with pytest.raises(ValidationError, match="2036-01-15"):
        _dataset(sales=_with_typo(2036))


def test_a_normal_two_year_history_is_not_refused():
    """The guard must not fire on real history."""
    rows = _sales("ghost_bar", n=730, start=date(2024, 1, 1))
    assert len(_dataset(sales=rows).sales_daily) == 730


def test_an_absurdly_old_row_is_refused_on_span():
    """The cost half of the guard: span still bounds the calendar the feature build
    densifies, and an ancient row is not caught by the future check."""
    rows = _sales("ghost_bar", n=5, start=date(1900, 1, 1)) + _sales("ghost_bar", n=5)
    with pytest.raises(ValidationError, match="spans"):
        _dataset(sales=rows)


def test_an_absurd_venue_count_is_refused():
    """Every list a caller controls is a resource dimension on a shared service with no
    concurrency cap of its own."""
    from compute.contract import MAX_VENUES

    venues = [VenueProfile(venue_id=f"v{i}", slug=f"bar_{i}")
              for i in range(MAX_VENUES + 1)]
    with pytest.raises(ValidationError):
        OrgProfile(org_id="o", venues=venues)


def test_a_hardened_service_reports_the_error_type_without_internals(monkeypatch):
    """`service/compute.py` already withholds internals from the 503 body when hardened.
    The 200 path was handing the same scratch paths and library internals back in
    diagnostics - the identical leak, through the door that succeeded.

    The suite runs with BRAIN_ALLOW_INSECURE=1 (conftest), so hardening must be forced
    here; that is the posture a deployed brain actually runs in.
    """
    import config

    monkeypatch.setattr(config, "HARDENED", True)
    bundle = run(_dataset(prior_state=PriorState(
        served_model={"ghost_bar": "no_such_model"})))
    failed = [d for d in bundle.diagnostics if "forecast failed" in d]
    assert failed == ["ghost_bar: forecast failed (ValueError)"]


def test_an_unhardened_service_keeps_the_detail_for_local_debugging():
    bundle = run(_dataset(prior_state=PriorState(
        served_model={"ghost_bar": "no_such_model"})))
    assert any("unknown model" in d for d in bundle.diagnostics)


def test_the_served_rung_is_populated():
    """`ServedRow.rung` was in the contract and always came back None, so the API had a
    column it could never fill."""
    bundle = run(_dataset(prior_state=PriorState(
        served_model={"ghost_bar": "rung1_robust_dow"})))
    assert [s.rung for s in bundle.served] == [1]


def test_an_unknown_model_reports_no_rung_rather_than_guessing():
    """Read from the ladder registry, not parsed off the `rungN_` prefix."""
    from compute.engine import _rung_of

    assert _rung_of("rung9_invented") is None


def test_trading_hours_round_trip_into_the_scratch_store():
    """Trading hours are not derivable from a daily aggregate, so the API supplies them
    and the loader must land them where the World Cup features look."""
    ds = _dataset()
    ds.trading_hours = [TradingHoursRow(venue="ghost_bar", dow=d, open_hour=12.0,
                                        close_hour=23.0, n=100) for d in range(7)]
    captured: dict = {}

    import compute.engine as engine
    original = engine._compute

    def spy(dataset, notes):
        con = warehouse.connect(read_only=True)
        try:
            captured["rows"] = con.execute(
                "SELECT COUNT(*) FROM venue_trading_hours").fetchone()[0]
        finally:
            con.close()
        return original(dataset, notes)

    engine._compute = spy
    try:
        run(ds)
    finally:
        engine._compute = original

    assert captured["rows"] == 7
