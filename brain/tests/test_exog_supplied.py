"""Caller-supplied covariates: the overlay, and the hole it closes.

`ExogenousRow.values` is a free `dict[str, float]`. `extra="forbid"` guards the model's
top-level fields, so a caller cannot invent `exogenus=[...]` - but it does not reach
inside the dict, so `exo_tempc` validates cleanly and then does nothing at all. That is
precisely the failure the strict contract was written to prevent, one level down, and it
would land as a univariate forecast wearing the exo model's name.
"""

from __future__ import annotations

from datetime import date, timedelta

from compute.contract import (
    ComputeDataset,
    ExogenousRow,
    OrgProfile,
    PriorState,
    SalesRow,
    VenueProfile,
)
from compute.engine import run
from ingest.exog_supplied import KNOWN_EXO_COLS

START = date(2026, 1, 1)
N = 200


def _sales(venue: str = "tenant_bar") -> list[SalesRow]:
    return [SalesRow(venue=venue, date=START + timedelta(days=i), category="Beer",
                     item="IPA", units=10.0, revenue_exvat=100.0 + (i % 7) * 50.0)
            for i in range(N)]


def _dataset(exogenous=None, **kw) -> ComputeDataset:
    model = kw.pop("model", "rung2_ets")
    return ComputeDataset(
        org_profile=OrgProfile(
            org_id="o",
            venues=[VenueProfile(venue_id="v", slug="tenant_bar")],
            **kw.pop("profile", {})),
        sales_daily=_sales(),
        exogenous=exogenous or [],
        prior_state=PriorState(served_model={"tenant_bar": model}),
        **kw,
    )


def _train_and_serve_frames(exogenous, slug: str = "tenant_bar"):
    """Build the TRAINING frame and the HORIZON frame for one tenant, the way compute
    does. The pair is the only way to see skew: each side alone looks reasonable."""
    import tempfile
    from pathlib import Path

    import pandas as pd

    import org_profile
    from compute import forward, loader
    from features.build_features import build_features
    from store import warehouse

    ds = ComputeDataset(
        org_profile=OrgProfile(org_id="o", venues=[VenueProfile(venue_id="v", slug=slug)]),
        sales_daily=_sales(slug),
        exogenous=[ExogenousRow(venue=slug, date=r.date, values=r.values)
                   for r in exogenous],
        prior_state=PriorState(served_model={slug: "rung2_ets"}),
    )
    with tempfile.TemporaryDirectory() as tmp:
        with warehouse.scratch_store(Path(tmp) / "s.duckdb"), \
                org_profile.bind_profile(ds.org_profile):
            loader.load(ds)
            train = build_features(slug)
            last = pd.Timestamp(train["date"].max())
            dates = pd.date_range(last + pd.Timedelta(days=1), periods=7, freq="D")
            serve = forward._future_frame(ds, slug, dates, [])
    return train, serve


def _exo(cols: dict, days: int = N + 30) -> list[ExogenousRow]:
    return [ExogenousRow(venue="tenant_bar", date=START + timedelta(days=i), values=cols)
            for i in range(days)]


# --- The universe is real -----------------------------------------------------

def test_the_known_universe_matches_the_models_exo_columns():
    """`KNOWN_EXO_COLS` is a literal in `ingest` because importing `models` upward would
    invert the layering. This is what stops the duplicate drifting."""
    from models.foundation import CHRONOS2_EXO_COLS

    assert set(CHRONOS2_EXO_COLS) <= KNOWN_EXO_COLS


def test_the_universe_is_fifteen_columns_plus_the_event_rank():
    from models.foundation import CHRONOS2_EXO_COLS

    assert len(CHRONOS2_EXO_COLS) == 15


# --- Unknown names are reported, not swallowed --------------------------------

def test_a_misspelled_covariate_is_reported():
    bundle = run(_dataset(exogenous=_exo({"exo_tempc": 12.0})))
    assert any("unknown covariate" in d and "exo_tempc" in d
               for d in bundle.diagnostics)


def test_the_unknown_covariate_report_is_bounded():
    """The honest report is itself an amplifier: every name is caller-controlled and they
    are joined into one string. Inside every contract bound (500k rows x 64 keys, all
    distinct) an unbounded report would render tens of millions of names."""
    from ingest.exog_supplied import MAX_REPORTED_UNKNOWN

    junk = {f"exo_{'x' * 40}_{i}": 1.0 for i in range(64)}
    bundle = run(_dataset(exogenous=_exo(junk, days=3)))
    report = [d for d in bundle.diagnostics if "unknown covariate" in d][0]
    assert report.count("exo_xxx") <= MAX_REPORTED_UNKNOWN


def test_a_truncated_unknown_report_says_it_is_truncated():
    junk = {f"exo_bogus_{i}": 1.0 for i in range(64)}
    bundle = run(_dataset(exogenous=_exo(junk, days=3)))
    assert any("first few" in d for d in bundle.diagnostics)


def test_a_known_covariate_raises_no_unknown_warning():
    bundle = run(_dataset(exogenous=_exo({"exo_temp_c": 12.0})))
    assert not [d for d in bundle.diagnostics if "unknown covariate" in d]


def test_a_dataset_with_no_exogenous_raises_no_warning():
    bundle = run(_dataset())
    assert not [d for d in bundle.diagnostics if "unknown covariate" in d]


# --- Supplied wins over derived -----------------------------------------------

def test_supplied_weather_reaches_the_horizon_frame():
    """Weather is the covariate compute cannot derive: it holds no connection, so a
    tenant's weather arrives in the request or not at all."""
    bundle = run(_dataset(exogenous=_exo(
        {"exo_temp_c": 21.0, "exo_rain_mm": 0.0, "exo_sunshine_hrs": 9.0})))
    assert not [d for d in bundle.diagnostics if "no weather" in d]


def test_absent_weather_is_reported_against_the_horizon():
    bundle = run(_dataset())
    assert any("no weather" in d for d in bundle.diagnostics)


def test_supplied_covariates_override_the_derived_calendar():
    """Precedence is one-directional: the caller knows its tenant, compute knows only
    Lune's curated UK calendar. Where both have a value, the request wins."""
    import pandas as pd

    from ingest.exog_supplied import overlay, write_supplied
    from store import warehouse

    with warehouse.scratch_store(_tmp_db()) as _:
        con = warehouse.connect()
        try:
            write_supplied(con, _exo({"exo_is_school_term": 1.0}, days=3))
        finally:
            con.close()
        derived = pd.DataFrame({
            "date": pd.to_datetime([START, START + timedelta(days=1)]),
            "exo_is_school_term": [0, 0],
        })
        out = overlay(derived, "tenant_bar")
    assert out["exo_is_school_term"].tolist() == [1.0, 1.0]


def test_a_date_without_a_supplied_value_keeps_its_derived_one():
    """A caller overriding one day's weather must not have to restate the calendar."""
    import pandas as pd

    from ingest.exog_supplied import overlay, write_supplied
    from store import warehouse

    with warehouse.scratch_store(_tmp_db()) as _:
        con = warehouse.connect()
        try:
            write_supplied(con, [ExogenousRow(venue="tenant_bar", date=START,
                                              values={"exo_temp_c": 25.0})])
        finally:
            con.close()
        derived = pd.DataFrame({
            "date": pd.to_datetime([START, START + timedelta(days=1)]),
            "exo_temp_c": [5.0, 6.0],
        })
        out = overlay(derived, "tenant_bar")
    assert out["exo_temp_c"].tolist() == [25.0, 6.0]


def test_another_venues_covariates_do_not_leak_across():
    import pandas as pd

    from ingest.exog_supplied import overlay, write_supplied
    from store import warehouse

    with warehouse.scratch_store(_tmp_db()) as _:
        con = warehouse.connect()
        try:
            write_supplied(con, [ExogenousRow(venue="other_bar", date=START,
                                              values={"exo_temp_c": 25.0})])
        finally:
            con.close()
        derived = pd.DataFrame({"date": pd.to_datetime([START]), "exo_temp_c": [5.0]})
        out = overlay(derived, "tenant_bar")
    assert out["exo_temp_c"].tolist() == [5.0]


# --- Lune-shaped families are opt-in -----------------------------------------

def test_the_world_cup_is_off_for_a_tenant_that_did_not_ask():
    import pandas as pd

    from compute import forward

    ds = _dataset()
    with _bound(ds):
        fut = forward._future_frame(ds, "tenant_bar",
                                    pd.date_range("2026-06-15", periods=7), [])
    assert fut["wc_any_match"].sum() == 0


def test_the_world_cup_is_on_when_sports_are_enabled():
    """Default-off must mean togglable, not removed: Lune's own profile has to switch
    it back on or the published result stops being reproducible from shipped code."""
    import pandas as pd

    from compute import forward

    ds = _dataset(profile={"exo_enabled": ["calendar", "weather", "sports"]})
    ds.org_profile.venues[0].slug = "beer_hall"
    with _bound(ds):
        fut = forward._future_frame(ds, "beer_hall",
                                    pd.date_range("2026-06-15", periods=7), [])
    assert "wc_any_match" in fut


# --- Train/serve skew: the failures review caught ------------------------------

def test_exo_is_dry_means_the_same_thing_in_training_and_at_serving():
    """The skew that shipped in Phase 3's first cut. The training frame derived
    exo_is_dry BEFORE the supplied-covariate overlay and the horizon frame after, so a
    caller supplying rain but not the flag trained on 0.0 for every row (NaN < 1.0 is
    False) and served the real flag. exo_is_dry is one of the 15 CHRONOS2_EXO_COLS, so it
    landed on the served entrant and on nothing that would have failed."""
    train, serve = _train_and_serve_frames(_exo(
        {"exo_temp_c": 15.0, "exo_rain_mm": 0.0, "exo_sunshine_hrs": 8.0}))
    assert set(train["exo_is_dry"].dropna()) == set(serve["exo_is_dry"].dropna())


def test_dry_weather_actually_reads_as_dry():
    """The above passes if both sides are wrong in the same way. Rain of 0.0mm is dry."""
    train, _ = _train_and_serve_frames(_exo({"exo_rain_mm": 0.0}))
    assert set(train["exo_is_dry"].dropna()) == {1.0}


def test_a_caller_supplied_is_dry_survives_the_derivation():
    """A caller with its own definition of "dry" must not be overruled by a threshold it
    never chose."""
    train, _ = _train_and_serve_frames(_exo({"exo_rain_mm": 0.0, "exo_is_dry": 0.0}))
    assert set(train["exo_is_dry"].dropna()) == {0.0}


def test_the_world_cup_off_switch_applies_to_training_too():
    """Gating only the horizon frame gave a tenant Lune's World Cup in training (read off
    disk) and zeros at serving: a clean off-switch on one side, skew on the other."""
    train, serve = _train_and_serve_frames([], slug="beer_hall")
    assert int(train["wc_any_match"].sum()) == 0 and int(serve["wc_any_match"].sum()) == 0


def test_the_forward_frame_carries_every_training_feature_column():
    """`_future_frame` hand-rolled its own calendar and omitted 13 columns, so rung3_gbm
    raised KeyError instead of forecasting."""
    bundle = run(_dataset(model="rung3_gbm"))
    assert len(bundle.forecasts) == 7


# --- The band is only sold where it is calibrated ------------------------------

def test_a_horizon_beyond_the_calibration_is_refused_not_answered():
    """The contract advertised 30 days. Measured on a drifting series, the pooled band
    covers 96% at step 7 but 81% at step 30 against a nominal 90% - and it UNDER-covers,
    which is not split conformal's safe direction. Per-step calibration fixes it but is a
    change to the banding method, and this project adopts a method only when it beats a
    gate. So the horizon is capped at what is evidenced."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        _dataset(horizon_days=30)


def test_the_evidenced_horizon_is_still_served():
    bundle = run(_dataset(horizon_days=7))
    assert len({f.target_date for f in bundle.forecasts}) == 7


# --- expected_totals ----------------------------------------------------------

def test_a_short_dataset_is_reported_against_the_callers_own_total():
    """The failure is the API's, not the brain's: a paged sales query that drops rows
    does not error, it forecasts low."""
    ds = _dataset(profile={"expected_totals": {"tenant_bar": 999_999.0}})
    bundle = run(ds)
    assert any("does not reconcile" in d for d in bundle.diagnostics)


def test_a_matching_total_is_silent():
    total = sum(r.revenue_exvat for r in _sales())
    ds = _dataset(profile={"expected_totals": {"tenant_bar": total}})
    bundle = run(ds)
    assert not [d for d in bundle.diagnostics if "does not reconcile" in d]


def test_absent_expected_totals_skips_the_check():
    """An org without audited totals must still build."""
    bundle = run(_dataset())
    assert not [d for d in bundle.diagnostics if "does not reconcile" in d]


# --- helpers ------------------------------------------------------------------

def _tmp_db():
    import tempfile
    from pathlib import Path

    return Path(tempfile.mkdtemp(prefix="brain-test-")) / "t.duckdb"


def _bound(ds: ComputeDataset):
    import org_profile

    return org_profile.bind_profile(ds.org_profile)
