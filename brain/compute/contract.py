"""The dataset-in / bundle-out types. See CONTRACT.md for the argument behind them.

These are the agreement with the API, so they are strict on purpose: extra fields are
rejected rather than ignored, because a silently-dropped field is how a caller comes to
believe it sent something it did not. Everything the compute needs is here and nothing
else is reachable - compute holds no connection and cannot fetch what it was not given,
which is what makes tenant isolation structural rather than a policy to enforce.

`org_id` is supplied by the API and trusted as given. Compute never resolves, widens, or
validates it against anything, because it has nothing to validate it against; the
authority is the caller's session, upstream.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --- Dataset in ---------------------------------------------------------------

class VenueProfile(_Strict):
    """Per-venue config, replacing the Lune constants frozen in config.py."""

    venue_id: str
    slug: str = Field(description="The brain works in slugs; the API maps venueId <-> slug.")
    timezone: str = "Europe/London"
    lat: float | None = None
    lon: float | None = None
    vat_inclusive: bool = False
    vat_rate: float = 0.20
    structural_zero_dow: list[int] = Field(
        default_factory=list,
        description="Days closed by design (Mon=0..Sun=6). Keeps the band off the floor.")
    is_event_driven: bool = Field(
        False, description="Booking-led venues are capped at Rung 1.")


class OrgProfile(_Strict):
    org_id: str
    venues: list[VenueProfile]
    currency: str = "GBP"
    country: str = "GB"
    exo_enabled: list[str] = Field(
        default_factory=lambda: ["calendar", "weather"],
        description="Covariate families that are live. Sports and local events are "
                    "opt-in: they are Lune-shaped and must not default on.")
    stock_enabled: bool = Field(
        False, description="Brewpub-specific; off by default for other verticals.")
    expected_totals: dict[str, float] | None = Field(
        None,
        description="Optional per-venue reconciliation target. None skips the check - "
                    "an org without audited totals must still build.")

    def venue(self, slug: str) -> VenueProfile | None:
        return next((v for v in self.venues if v.slug == slug), None)


class SalesRow(_Strict):
    """One row of the aggregate the API GROUP BYs from its normalised sales store.

    Grain: venue x business_date x category x item, ex-VAT. The brain never sees line
    items or anything customer-identifying.
    """

    venue: str
    date: date
    category: str = ""
    item: str | None = None
    units: float = 0.0
    revenue_exvat: float = 0.0


class TradingHoursRow(_Strict):
    """Per venue x day-of-week trading window, in decimal venue-local hours.

    NOT derivable from the daily aggregate and NOT optional when sports covariates are
    on: it is what makes the World Cup features code-derived by kickoff overlap rather
    than hardcoded. The API computes it as a percentile of transaction time-of-day, so
    it is a second small GROUP BY over data it already holds, not a re-pull.
    """

    venue: str
    dow: int = Field(ge=0, le=6, description="Mon=0 .. Sun=6")
    open_hour: float
    close_hour: float
    n: int = 0


class ExogenousRow(_Strict):
    """One venue-date of known-future covariates.

    Must span the training history PLUS the full horizon, or the Chronos exo entrant
    raises rather than silently degrading to univariate. Weather must be on the hindcast
    basis: the observed/ERA5 basis is an oracle and leaks into the backtest.
    """

    venue: str
    date: date
    values: dict[str, float] = Field(
        default_factory=dict,
        description="Covariate name -> value, e.g. exo_temp_c. Names must match "
                    "CHRONOS2_EXO_COLS for the served entrant to consume them.")


class PriorState(_Strict):
    """What the engine currently reads back from its own store.

    Retiring the store means the API round-trips these, or the behaviour they gate is
    lost. The briefing chain is the sharp one: without it every standing item re-fires
    daily and the false-alarm control is gone.
    """

    watermark: date | None = None
    served_model: dict[str, str] = Field(
        default_factory=dict, description="venue -> model name currently live.")
    last_refit_ts: datetime | None = None
    briefing_chain: list[dict] = Field(
        default_factory=list,
        description="The new/continuing/resolved chain. Drop it and fatigue returns.")
    change_point_state: dict[str, dict] = Field(
        default_factory=dict, description="venue -> detector state, incl. closure dormancy.")


class ComputeDataset(_Strict):
    """Everything one compute call gets. One org, one request."""

    org_profile: OrgProfile
    sales_daily: list[SalesRow]
    trading_hours: list[TradingHoursRow] = Field(default_factory=list)
    exogenous: list[ExogenousRow] = Field(default_factory=list)
    prior_state: PriorState = Field(default_factory=PriorState)
    horizon_days: int = Field(7, ge=1, le=30)


# --- Bundle out ---------------------------------------------------------------

class ForecastRow(_Strict):
    venue: str
    layer: str
    key: str | None = None
    target_date: date
    model: str
    yhat: float


class BandRow(_Strict):
    venue: str
    layer: str
    key: str | None = None
    target_date: date
    model: str
    level: float
    lo: float
    hi: float


class ServedRow(_Strict):
    venue: str
    layer: str
    model: str
    rung: int | None = None
    data_as_of: date | None = None


class LadderSelectionRow(_Strict):
    """Append-only audit. Why this model is live, and what it beat."""

    venue: str
    layer: str
    old_rung: int | None = None
    new_rung: int | None = None
    old_mase: float | None = None
    new_mase: float | None = None
    reason: str = ""


class DormantVenue(_Strict):
    """A venue with no forecast, stated positively.

    The liveness gate's whole point: a dormant venue gets a marker, not a projection.
    Reporting it as an empty forecast would be indistinguishable from a bug.
    """

    venue: str
    reason: str


class ComputeBundle(_Strict):
    """Everything the API persists. Compute writes none of it."""

    org_id: str = Field(
        description="ECHOED from the request, never decided here, and NOT an "
                    "authorization statement. The caller MUST persist under the orgId "
                    "it already authorized and assert `bundle.org_id == expectedOrgId` "
                    "rather than trusting this value: it is only ever as trustworthy as "
                    "whatever sent the dataset. It exists so an async caller can match a "
                    "bundle to its request, not to tell the caller whose data this is.")
    forecasts: list[ForecastRow] = Field(default_factory=list)
    bands: list[BandRow] = Field(default_factory=list)
    served: list[ServedRow] = Field(default_factory=list)
    watermark: date | None = None
    ladder_selection: list[LadderSelectionRow] = Field(default_factory=list)
    dormant: list[DormantVenue] = Field(default_factory=list)
    # State the API must persist and hand back next call, or the behaviour it gates is
    # lost. Both are currently ECHOED from prior_state rather than advanced, because the
    # engine does not run the briefing or the change-point detector yet; echoing keeps
    # the round-trip intact so wiring them later is not also a schema change. Dropping
    # either would silently restore the failure it prevents: daily re-firing of every
    # standing item, and a closed venue re-alarming every day.
    briefing_chain: list[dict] = Field(default_factory=list)
    change_point_state: dict[str, dict] = Field(default_factory=dict)
    diagnostics: list[str] = Field(
        default_factory=list,
        description="Weather gaps, refit reasons, degradation notes. Surfaced, never "
                    "silently swallowed: a quiet degradation is the failure mode that "
                    "produces plausible wrong numbers.")
