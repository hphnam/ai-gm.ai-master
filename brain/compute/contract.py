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

from datetime import date, datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field, model_validator


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# Bounds. Compute is a shared service with no per-request concurrency cap of its own, so
# every list a caller controls is a resource dimension. These are deliberately generous -
# they exist to turn an absurd request into a 422 rather than an OOM, not to police a
# real one. For scale: Lune's whole two-year corpus is 92,329 line items, which aggregate
# to roughly 40k rows at this grain.
MAX_VENUES = 100
MAX_EXOGENOUS_ROWS = 500_000
MAX_TRADING_HOURS_ROWS = MAX_VENUES * 7
MAX_EXO_KEYS_PER_ROW = 64
# The briefing chain is one entry per standing item, not per day: an estate with a
# hundred venues does not have ten thousand live concerns.
MAX_BRIEFING_CHAIN = 10_000

# `max_length` on a list is NOT an OOM guard, and it was first set as though it were.
# Pydantic validates every item and only then checks the length, so a 2.2M-row body is
# fully parsed into 2.2M `SalesRow` models before the cap fires - measured at ~278MB RSS
# for 200k rows, so a 2M cap sits well above the point the process dies. The cap has to
# be low enough to mean something on its own, and the real guard for an oversized body is
# a request-size limit at the ingress, which is the API's to set (CONTRACT.md open
# decision 4). 200k rows is ~5x Lune's entire two-year estate (92,329 line items,
# aggregating to roughly 40k rows at this grain), so a tenant hitting it is batching
# wrong, not trading hard.
MAX_SALES_ROWS = 200_000

# The widest history span compute will accept, in days (~20 years). A COST knob, and only
# that: it bounds the calendar `read_series(fill_calendar=True)` densifies. The
# correctness guard is MAX_FUTURE_DAYS below - see the note there, because the first cut
# of this conflated the two and caught the wrong bug.
MAX_HISTORY_DAYS = 366 * 20

# How far past today a sales row may be dated before the dataset is refused.
#
# `sales_daily` is CLOSED HISTORY by contract, so nothing in it should postdate today at
# all; the slack absorbs business-date-vs-UTC boundaries and clock skew, not real data.
#
# This is the correctness guard, and it exists because the first attempt was a SPAN check
# that failed on the likelier typo. `trim_to_active` trims only ZERO endpoints, so a
# nonzero row with a mistyped year survives, becomes `feats["date"].max()`, and the
# forecast origin moves with it. Measured against the span guard:
#
#   2026 -> 2027  ACCEPTED -> seven banded rows for January 2027, watermark to match
#   2026 -> 2036  ACCEPTED -> seven banded rows for January 2036, watermark to match
#   2026 -> 2202  rejected
#   whole export mis-stamped 2202 (span only 199 days)  ACCEPTED -> forecasts 2202-07-20
#
# A one-digit slip is likelier than 2202 and sailed straight through, because span is a
# relative measure of a failure that is absolute. It compounds, too: the API persists the
# poisoned watermark and hands it back as `prior_state` on the next call, so the cadence
# stays wrong after the bad row is gone. An absolute bound catches every future-dated
# typo including 2202, and leaves MAX_HISTORY_DAYS as the pure size knob it should have
# been.
MAX_FUTURE_DAYS = 7

# The furthest ahead compute will forecast. Seven, because seven is what the band is
# calibrated for and what every result in the project is evidence for: the residual
# stream is built from 7-day rolling blocks, so every residual is a <=7-step-ahead error.
#
# The contract used to advertise 30. Measured on a drifting weekly series, the pooled
# 90% band applied unchanged across steps covers 100.0% at step 1, 96.2% at step 7, 84.6%
# at step 14 and 80.8% at step 30 - against a nominal 90% and a project gate of +/-3pp. Note
# the direction: at <=7 it OVER-covers, which is split conformal's safe failure mode
# (conformal/wrap.py says so); past 7 it silently under-covers, which is not.
#
# Per-step calibration fixes it - the same measurement gives 96.2% at every step, with the
# half-width growing 181 -> 224 - but that is a change to the banding METHOD, and this
# project adopts a method only when it beats a gate on held-out folds. Inventing one
# inside an integration phase would be exactly the move the ladder exists to prevent. So
# the horizon is capped at what is evidenced, and per-step conformal is logged as a
# research work package (FLAGS.md, FLAG-BAND-HORIZON) rather than smuggled in here.
MAX_HORIZON_DAYS = 7


# --- Dataset in ---------------------------------------------------------------

class VenueProfile(_Strict):
    """Per-venue config, replacing the Lune constants frozen in config.py.

    There is deliberately no `vat_inclusive` / `vat_rate` here, and no `timezone`.
    `sales_daily` is ex-VAT by contract (see CONTRACT.md §2, decision closed in Phase 3),
    so the brain applies no VAT rule of its own; and every series it builds is date-grain,
    so a venue timezone has nothing to act on - the API resolves business dates before it
    aggregates.

    All three were fields nothing read, which is worse than an absent field rather than
    harmless. A caller setting `vat_inclusive=True` would reasonably expect deflation,
    receive none, and mix bases across venues; a caller setting `timezone` would expect
    its 2am trade to land on the previous business day. Both surface as a plausible wrong
    number rather than an error - the exact failure `extra="forbid"` exists to prevent,
    which a field that validates and does nothing quietly reintroduces.
    """

    venue_id: str
    slug: str = Field(description="The brain works in slugs; the API maps venueId <-> slug.")
    lat: float | None = None
    lon: float | None = None
    structural_zero_dow: list[int] = Field(
        default_factory=list,
        description="Days closed by design (Mon=0..Sun=6). Feeds the is_structural_zero "
                    "feature AND the Mondrian conformal grouping. An EMPTY list means "
                    "this venue has no closed days - it does NOT mean 'unset'.")
    is_event_driven: bool = Field(
        False,
        description="Booking-led venue: sparse by nature, never judged 'closed' on a "
                    "trailing lull, and its own trading nights are the spillover signal "
                    "for sibling venues. Does NOT cap the ladder rung.")


class OrgProfile(_Strict):
    """The tenant. No `currency`: compute emits no formatted money, only floats in
    whatever unit `sales_daily` arrived in, so a currency code here would be a field
    nothing reads - see the note on VenueProfile."""

    org_id: str
    venues: list[VenueProfile] = Field(max_length=MAX_VENUES)
    country: str = Field(
        "GB", min_length=2, max_length=2,
        description="ISO 3166-1 alpha-2. Drives the public-holiday calendar. Length-"
                    "bounded because it is echoed into a diagnostic once per venue, so "
                    "an unbounded string is amplified by the venue count.")
    exo_enabled: list[str] = Field(
        default_factory=lambda: ["calendar", "weather"],
        description="Covariate families that are live. Sports and local events are "
                    "opt-in: they are Lune-shaped and must not default on.")
    stock_enabled: bool = Field(
        False, description="Brewpub-specific; off by default for other verticals.")
    expected_totals: dict[str, float] | None = Field(
        None, max_length=MAX_VENUES,
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
        default_factory=dict, max_length=MAX_EXO_KEYS_PER_ROW,
        description="Covariate name -> value, e.g. exo_temp_c. Names must match "
                    "CHRONOS2_EXO_COLS EXACTLY for the served entrant to consume them; "
                    "unknown names are ignored and reported in diagnostics, because "
                    "extra=forbid guards this model's fields but not inside this dict.")


class PriorState(_Strict):
    """What the engine currently reads back from its own store.

    Retiring the store means the API round-trips these, or the behaviour they gate is
    lost. The briefing chain is the sharp one: without it every standing item re-fires
    daily and the false-alarm control is gone.
    """

    watermark: date | None = None
    served_model: dict[str, str] = Field(
        default_factory=dict, max_length=MAX_VENUES,
        description="venue -> model name currently live.")
    last_refit_ts: datetime | None = None
    briefing_chain: list[dict] = Field(
        default_factory=list, max_length=MAX_BRIEFING_CHAIN,
        description="The new/continuing/resolved chain. Drop it and fatigue returns.")
    change_point_state: dict[str, dict] = Field(
        default_factory=dict, max_length=MAX_VENUES,
        description="venue -> detector state, incl. closure dormancy.")


class ComputeDataset(_Strict):
    """Everything one compute call gets. One org, one request."""

    org_profile: OrgProfile
    sales_daily: list[SalesRow] = Field(max_length=MAX_SALES_ROWS)
    trading_hours: list[TradingHoursRow] = Field(
        default_factory=list, max_length=MAX_TRADING_HOURS_ROWS)
    exogenous: list[ExogenousRow] = Field(
        default_factory=list, max_length=MAX_EXOGENOUS_ROWS)
    prior_state: PriorState = Field(default_factory=PriorState)
    horizon_days: int = Field(
        7, ge=1, le=MAX_HORIZON_DAYS,
        description="Capped at the horizon the band is actually calibrated for. Asking "
                    "for more is refused rather than answered with an uncalibrated "
                    "interval - see MAX_HORIZON_DAYS.")

    @model_validator(mode="after")
    def _reject_implausible_dates(self) -> ComputeDataset:
        """Two guards, and they are guarding different things.

        The FUTURE bound is the correctness one. `sales_daily` is closed history, so a row
        dated after today is a typo; left alone it becomes `feats["date"].max()` and takes
        the forecast origin and the watermark with it, silently. It is checked absolutely
        rather than by span because the failure is absolute: a `2026 -> 2036` slip is one
        keystroke and a 3,666-day span, well inside any tolerable window.

        The SPAN bound is the cost one: it caps the calendar the feature build densifies.

        Both name the offending date. That matters more than the refusal - the caller has
        to find one bad row among a million, and "span too wide" would not help them.
        """
        if not self.sales_daily:
            return self
        lo = min(r.date for r in self.sales_daily)
        hi = max(r.date for r in self.sales_daily)

        horizon_of_sanity = date.today() + timedelta(days=MAX_FUTURE_DAYS)
        if hi > horizon_of_sanity:
            raise ValueError(
                f"sales_daily contains {hi}, which is after today "
                f"({date.today()}) plus {MAX_FUTURE_DAYS} days of slack. sales_daily is "
                "closed history, so this is a mistyped date; left alone it would become "
                "the forecast origin and the watermark rather than raise.")

        span = (hi - lo).days
        if span > MAX_HISTORY_DAYS:
            raise ValueError(
                f"sales_daily spans {span} days ({lo} to {hi}), beyond the "
                f"{MAX_HISTORY_DAYS}-day limit. The oldest row is the likely typo: a "
                "history this long densifies to a calendar the feature build has to walk "
                "day by day.")
        return self


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
