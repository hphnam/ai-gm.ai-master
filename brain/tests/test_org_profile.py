"""The de-Lune seam: per-tenant facts replace Lune's module globals.

Two claims are load-bearing here and both are tested directly.

1. UNBOUND IS LUNE. The research path binds nothing, so every accessor must return the
   `config.py` constant it replaced. This is what keeps the pre-registered July result
   (report 31) reproducible from shipped code after the engine went multi-tenant; if
   these drift, the evidence chain is broken and the C2 number stops meaning anything.

2. BOUND IS TOTAL. A bound profile wins entirely, including when a field is empty. A
   per-field fallback would hand Lune's Monday/Tuesday closures to a tenant that trades
   seven days, and it would reach the Mondrian grouping, so the damage would surface as
   a miscalibrated band rather than as an error.
"""

from __future__ import annotations

from datetime import date, timedelta

import config
import org_profile
from compute.contract import OrgProfile, SalesRow, VenueProfile


def _profile(**kw) -> OrgProfile:
    venues = kw.pop("venues", [VenueProfile(venue_id="v1", slug="tenant_bar")])
    return OrgProfile(org_id=kw.pop("org_id", "org_x"), venues=venues, **kw)


# --- Unbound is Lune ----------------------------------------------------------

def test_unbound_structural_zeros_are_lunes():
    assert org_profile.structural_zero_dow("beer_hall") == frozenset(
        config.STRUCTURAL_ZERO_DOW)


def test_unbound_event_driven_matches_lunes_event_only_venues():
    assert org_profile.is_event_driven("ellel") is True


def test_unbound_a_normal_venue_is_not_event_driven():
    assert org_profile.is_event_driven("beer_hall") is False


def test_unbound_venue_list_is_lunes_forecast_venues():
    assert org_profile.venues() == tuple(config.FORECAST_VENUES)


def test_unbound_weather_cell_is_lunes_mapping():
    assert org_profile.weather_cell("two_river_taps") == config.WEATHER_CELLS[
        "two_river_taps"]


def test_unbound_event_scopes_keep_lunes_city_separation():
    """Lancaster anchors must never reach the Preston venue."""
    assert "lancaster" not in org_profile.event_scopes("two_river_taps")


def test_unbound_exo_families_are_all_on():
    """Lune's published configuration has every family live; the research path must
    reproduce it, not the tenant-safe default."""
    assert "sports" in org_profile.exo_families()


# --- Bound is total -----------------------------------------------------------

def test_bound_structural_zeros_come_from_the_profile():
    p = _profile(venues=[VenueProfile(venue_id="v", slug="tenant_bar",
                                      structural_zero_dow=[6])])
    with org_profile.bind_profile(p):
        assert org_profile.structural_zero_dow("tenant_bar") == frozenset({6})


def test_an_empty_structural_zero_list_means_none_not_lunes_mon_tue():
    """The whole reason bound-is-total exists. A seven-day tenant must not inherit
    Lune's Monday/Tuesday closure through a per-field fallback."""
    with org_profile.bind_profile(_profile()):
        assert org_profile.structural_zero_dow("tenant_bar") == frozenset()


def test_a_bound_tenant_is_not_event_driven_by_default():
    with org_profile.bind_profile(_profile()):
        assert org_profile.is_event_driven("tenant_bar") is False


def test_bound_event_driven_comes_from_the_profile():
    p = _profile(venues=[VenueProfile(venue_id="v", slug="hall", is_event_driven=True)])
    with org_profile.bind_profile(p):
        assert org_profile.is_event_driven("hall") is True


def test_bound_venue_list_is_the_tenants_not_lunes():
    with org_profile.bind_profile(_profile()):
        assert org_profile.venues() == ("tenant_bar",)


def test_a_tenant_venue_without_coordinates_has_no_weather_cell():
    """None must mean 'no weather', not 'fall through to a Lune cell'."""
    with org_profile.bind_profile(_profile()):
        assert org_profile.weather_cell("tenant_bar") is None


def test_a_tenant_venue_with_coordinates_is_its_own_weather_cell():
    p = _profile(venues=[VenueProfile(venue_id="v", slug="tenant_bar",
                                      lat=53.4, lon=-2.9)])
    with org_profile.bind_profile(p):
        assert org_profile.weather_cell("tenant_bar") == "tenant_bar"


def test_a_tenant_never_inherits_lunes_curated_cities():
    with org_profile.bind_profile(_profile()):
        assert org_profile.event_scopes("tenant_bar") == frozenset({"all"})


def test_sports_are_opt_in_for_a_tenant():
    """The World Cup block is a fixed 2026 fixture list with England/Scotland flags.
    Defaulting it on would feed an unrelated org another country's football."""
    with org_profile.bind_profile(_profile()):
        assert "sports" not in org_profile.exo_families()


def test_bound_country_comes_from_the_profile():
    with org_profile.bind_profile(_profile(country="IE")):
        assert org_profile.country("tenant_bar") == "IE"


# --- The binding is per-context and unwinds ----------------------------------

def test_the_profile_unbinds_after_the_block():
    with org_profile.bind_profile(_profile()):
        pass
    assert org_profile.current_profile() is None


def test_the_profile_unbinds_after_an_exception():
    try:
        with org_profile.bind_profile(_profile()):
            raise RuntimeError("boom")
    except RuntimeError:
        pass
    assert org_profile.current_profile() is None


def test_bindings_nest():
    outer = _profile(org_id="outer")
    inner = _profile(org_id="inner")
    with org_profile.bind_profile(outer):
        with org_profile.bind_profile(inner):
            pass
        assert org_profile.current_profile().org_id == "outer"


def test_an_unknown_venue_under_a_bound_profile_raises_rather_than_falling_back():
    """The fail-open this seam must not have. Returning Lune's constants for a slug the
    profile does not carry would hand a tenant Monday/Tuesday closures it never
    configured, straight into the Mondrian grouping, silently."""
    import pytest

    with org_profile.bind_profile(_profile()), pytest.raises(KeyError):
        org_profile.structural_zero_dow("not_in_profile")


def test_the_unknown_venue_error_names_the_profile_it_checked():
    import pytest

    with org_profile.bind_profile(_profile()), pytest.raises(KeyError, match="tenant_bar"):
        org_profile.is_event_driven("not_in_profile")


# --- The seam reaches the analytics ------------------------------------------

def test_structural_zeros_reach_the_mondrian_grouping():
    """The grouping read the literal (0, 1), so Lune's own constant never reached the
    band it defines. If this regresses, a tenant's band is calibrated on Lune's
    closed days and nothing errors."""
    import numpy as np
    import pandas as pd

    from conformal.wrap import rolling_point_forecasts

    days = 200
    feats = pd.DataFrame({
        "date": pd.date_range("2026-01-01", periods=days, freq="D"),
        "value": np.linspace(100.0, 200.0, days),
    })
    feats["dow"] = feats["date"].dt.dayofweek

    p = _profile(venues=[VenueProfile(venue_id="v", slug="tenant_bar",
                                      structural_zero_dow=[6])])
    with org_profile.bind_profile(p):
        # rung0 needs only date/value, so the grouping is what is under test here and
        # not a predictor's feature appetite.
        out = rolling_point_forecasts(feats, "rung0_seasonal_naive", [],
                                      venue="tenant_bar")

    flagged = {pd.Timestamp(d).dayofweek for d in out.loc[out["is_zero"] == 1, "date"]}
    assert flagged == {6}


def _sales(venue: str, n: int = 200) -> list[SalesRow]:
    start = date(2026, 1, 1)
    return [SalesRow(venue=venue, date=start + timedelta(days=i), category="Beer",
                     item="IPA", units=10.0, revenue_exvat=100.0 + (i % 7) * 50.0)
            for i in range(n)]


def test_a_seven_day_tenant_gets_no_structural_zero_days_flagged():
    """End to end through the engine: the feature, not just the accessor."""
    from compute.contract import ComputeDataset, PriorState
    from compute.engine import run

    ds = ComputeDataset(
        org_profile=OrgProfile(org_id="o", venues=[
            VenueProfile(venue_id="v", slug="tenant_bar")]),
        sales_daily=_sales("tenant_bar"),
        prior_state=PriorState(served_model={"tenant_bar": "rung2_ets"}),
    )
    bundle = run(ds)
    assert bundle.forecasts


# --- G15d: the price-regime seam ---------------------------------------------

def _regime(dates: list, **profile_kw):
    """The `price_regime` column `calendar_features` stamps, for the given dates."""
    import pandas as pd

    from features.build_features import calendar_features

    df = pd.DataFrame({"date": pd.to_datetime(dates)})
    if profile_kw.pop("bind", True):
        with org_profile.bind_profile(_profile(**profile_kw)):
            return calendar_features(df, "tenant_bar", set())["price_regime"].tolist()
    return calendar_features(df, config.ANCHOR_VENUE, set())["price_regime"].tolist()


_SPAN = ["2025-06-01", "2025-07-01", "2026-01-01"]


def test_unbound_price_regime_still_flips_at_lunes_single_date():
    """The whole point of the seam: unbound reproduces Lune exactly, so the three
    training-frame hashes and every research number stay put. One date makes the counter
    0/1, which is byte-identical to the old `date >= PRICE_REGIME_BREAK` flip."""
    assert _regime(_SPAN, bind=False) == [0, 1, 1]


def test_unbound_price_change_dates_are_lunes_one_date():
    assert org_profile.price_change_dates() == (config.PRICE_REGIME_BREAK,)


def test_a_bound_profile_with_no_price_changes_gets_a_flat_regime():
    """Additive and optional means an absent value is not a behaviour change, and it also
    means an EMPTY list is not "unset". A tenant that never repriced must not inherit a
    Lancaster brewpub's Q2-2025 step change - that is a plausible wrong number, not an
    error, which is the failure this seam exists to prevent."""
    assert _regime(_SPAN) == [0, 0, 0]


def test_a_bound_profile_counts_its_own_price_changes():
    """Two changes give three regimes, so a model can separate the trading periods."""
    assert _regime(_SPAN, price_change_dates=[date(2025, 7, 1), date(2025, 12, 1)]) \
        == [0, 1, 2]


def test_a_bound_profile_ignores_lunes_date_entirely():
    """Bound is TOTAL on this seam: Lune's 2025-07-01 must not leak in alongside."""
    assert _regime(_SPAN, price_change_dates=[date(2026, 1, 1)]) == [0, 0, 1]


def test_price_change_dates_are_bounded():
    """Every caller-controlled list is a resource dimension, the round-3 lesson."""
    import pytest
    from pydantic import ValidationError

    from compute.contract import MAX_PRICE_CHANGE_DATES

    too_many = [date(2020, 1, 1) + timedelta(days=i)
                for i in range(MAX_PRICE_CHANGE_DATES + 1)]
    with pytest.raises(ValidationError):
        _profile(price_change_dates=too_many)
