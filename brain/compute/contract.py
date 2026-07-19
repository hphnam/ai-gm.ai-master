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
from itertools import pairwise

from pydantic import BaseModel, ConfigDict, Field, model_validator


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# Bounds. Compute is a shared service with no per-request concurrency cap of its own, so
# every list a caller controls is a resource dimension.
#
# The venue cap and the row cap are DERIVED from one another rather than picked
# separately, because picked separately they contradicted: 100 venues and 200,000 rows
# sounds generous twice and means "100 venues with 68 days of history each". Measured on
# this project's own store, `l3_item_daily` holds 18,994 rows over 650 venue-days at the
# `venue x date x category x item` grain - about 29 rows per venue-day - so a request's
# size is roughly venues x days x 30 and the two knobs are one knob.
#
# 25 venues is ~6x Lune's estate and a substantial group; lifting it is not a config
# change but CONTRACT.md open decision 4 (transport), because two years of item-grain
# rows for a large chain is not a JSON body.
MAX_VENUES = 25
_TWO_YEARS = 730
_ROWS_PER_VENUE_DAY = 30          # measured 29.2 on `l3_item_daily`
MAX_SALES_ROWS = MAX_VENUES * _TWO_YEARS * _ROWS_PER_VENUE_DAY

MAX_EXOGENOUS_ROWS = MAX_VENUES * _TWO_YEARS      # one row per venue-day, not per item
MAX_TRADING_HOURS_ROWS = MAX_VENUES * 7
MAX_EXO_KEYS_PER_ROW = 64
# One entry per standing item, not per day: an estate does not have ten thousand live
# concerns.
MAX_BRIEFING_CHAIN = 1_000

# What a row cap does and does not buy, because the first version of this comment was
# wrong in the flattering direction. Measured on pydantic 2.13.4: given `max_length=10`
# and 1,000 items, it constructs **11** and stops - so the cap DOES bound model
# construction, and lowering it from 2,000,000 genuinely bounds ~2.8GB of `SalesRow`
# objects down to a few hundred MB.
#
# What it does not bound is the body itself: the JSON is parsed into a list of dicts
# before any model is built, so an oversized request is already in memory by the time the
# cap is consulted. That guard is a request-size limit at the ingress, and it is the
# API's to set - noted as an obligation rather than pretended away here.

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
# This exists because the first attempt was a SPAN check, which failed on the likelier
# typo. `trim_to_active` trims only ZERO endpoints, so a nonzero row with a mistyped year
# survives, becomes `feats["date"].max()`, and the forecast origin moves with it. Measured
# against that span guard:
#
#   2026 -> 2027  ACCEPTED -> seven banded rows for January 2027, watermark to match
#   2026 -> 2036  ACCEPTED -> seven banded rows for January 2036, watermark to match
#   2026 -> 2202  rejected
#   whole export mis-stamped 2202 (span only 199 days)  ACCEPTED -> forecasts 2202-07-20
#
# It caught the one case it had been measured against. It compounds, too: the API persists
# the poisoned watermark and hands it back as `prior_state` next call, so the cadence stays
# wrong after the bad row is gone.
MAX_FUTURE_DAYS = 7

# The widest hole allowed INSIDE the history, in days.
#
# The reason this exists is the second half of the same lesson, and it took a third review
# round to see. The argument against the span check - "a one-digit slip is likelier than
# 2202" - is SYMMETRIC, and the future bound above is not: `2026 -> 2016` is exactly as
# much a one-keystroke slip, spans 3,653 days, sits comfortably under MAX_HISTORY_DAYS,
# and postdates nothing. Measured, one such row added to an otherwise clean 200-day
# history:
#
#   rung1_robust_dow  clean      yhat=[300.0, 350.0, 400.0, 100.0, 150.0, 200.0, 250.0]
#   rung1_robust_dow  2016 typo  yhat=[  0.0,   0.0,   0.0,   0.0,   0.0,   0.0,   0.0]
#
# Seven rows of GBP 0.00 with fourteen conformal bands, the right watermark, the served
# model's name on them, and no error. Worse than the future case, which at least announces
# itself with an absurd date: this is a plausible zero for a live venue - the
# "GBP 5,329 for a dead venue" failure the liveness gate exists for, running backwards.
#
# Mechanism: `read_series(fill_calendar=True)` densifies 2016..2026 into ~3,840 daily rows,
# ~3,450 of them fabricated zeros; `trim_to_active` trims to first-nonzero..last-nonzero,
# and the typo row IS nonzero, so it becomes the start and the fabricated zeros sit in the
# MIDDLE of the frame rather than at an endpoint where they would be trimmed. A robust
# per-DOW median over a span that is 90% zeros is zero.
#
# Span cannot express this and neither can an endpoint bound. The property that separates
# a typo from history is ISOLATION: a tiny fragment of data cut off from the body by a
# long emptiness.
#
# It has to be isolation and not simply "a long gap", because a long gap is a legitimate
# trading pattern. A seasonal venue - a beach bar, a festival site - is shut for six
# months every year, and for IT the calendar-filled zeros are correct: it really did take
# nothing in February, and a model that learns that is right. Rejecting year-long holes
# outright would refuse a whole business model to catch a typo.
#
# What a typo looks like that a season does not: ONE row, or a handful, stranded years
# from everything else. A season leaves two large blocks; a fat finger leaves a speck and
# a continent. So the dataset is split into segments at gaps wider than MAX_DATA_GAP_DAYS,
# and a segment too small to be a trading period is the fault.
#
# The 365-day near-miss that forced this: `2026 -> 2025` is the likeliest past slip of all,
# and it produces a gap of EXACTLY 365 days - it slipped a `> 365` threshold by one day.
# Tuning the number would have been the third version of the same mistake: fitting the
# guard to the example in front of me.
#
# G15b (round 4) found the fourth version of the same mistake, in the fix above. Every
# word of the reasoning is about ONE venue's history - "it becomes active_trading_start
# and buries the real history" - and the harm really is per-venue: `read_series`,
# `trim_to_active` and the whole feature build run per venue. But the check was applied to
# the dates of the WHOLE REQUEST, pooled across venues, so a sibling venue trading through
# the hole closes the gap and the isolation disappears. Measured, same typo row every time:
#
#   single venue, one 2016-typo row                    REJECT   the fix works
#   + a sibling venue spanning 2016..today             ACCEPT   the fix is gone
#   + a sibling of ONE ROW EVERY 60 DAYS (64 rows)     ACCEPT   64 rows defeat it
#
# So the guard did not fire on any multi-venue org, which is every real one - Lune has
# three. It is now segmented PER VENUE, which is the grain the harm has.
#
# This is not free and the cost is stated rather than discovered later: it also removes the
# accidental cover a sibling gave a genuinely intermittent venue, so a pop-up or a
# just-reopened venue inside a multi-venue estate now hits MIN_SEGMENT_DAYS where before it
# was masked. That false REJECT is real, it is measured in report 37, and it is deliberately
# NOT patched here - see the note on MIN_SEGMENT_DAYS.
MAX_DATA_GAP_DAYS = 90

# A segment smaller than this, on the far side of a gap, is read as a mistyped date.
#
# KNOWN FALSE POSITIVE, open on purpose (report 37, FLAG-SEGMENT-FALSE-REJECT). This
# refuses shapes that are neither a season nor a speck. Measured:
#
#   reopened after 8 months with 21 days trade   ACCEPT
#   reopened after 8 months with 13 days trade   REJECT   <- legitimate, refused
#   reopened after 8 months, day 1 back          REJECT   <- legitimate, refused
#   pop-up trading 4 days a quarter              REJECT   <- legitimate, refused
#
# A venue that genuinely reopens is refused for its first 13 trading days, and the whole
# org's request fails with it.
#
# It is left open because every discriminator tried reopens a worse hole. The obvious one -
# exempt the LAST segment, since a reopening is always at the end - was measured and
# rejected: a venue whose real history ended months ago plus one mistyped recent row is
# also a one-day trailing segment, and exempting it restores the forecast origin poisoning
# AND relights a dormant venue, which is the "GBP 5,329 for a dead venue" failure the
# liveness gate exists for. A day-1 reopening is genuinely indistinguishable from a typo
# from inside a single request; the information that separates them (does this venue keep
# trading tomorrow) is not in the dataset.
#
# An honest open item beats a change that cannot be defended, and this project has now
# shipped three consecutive fixes that were each worse than the defect.
MIN_SEGMENT_DAYS = 14

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


def _segments(dates: list[date]) -> list[list[date]]:
    """Split sorted dates wherever the history goes quiet for longer than a quarter.

    A season leaves two large blocks; a fat finger leaves a speck and a continent. The
    split is what lets the validator tell them apart without punishing the season.
    """
    out: list[list[date]] = [[dates[0]]]
    for prev, cur in pairwise(dates):
        if (cur - prev).days > MAX_DATA_GAP_DAYS:
            out.append([])
        out[-1].append(cur)
    return out


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
        """Three guards. They catch different things and only one is about size.

        FUTURE - `sales_daily` is closed history, so a row after today is a typo; left
        alone it becomes `feats["date"].max()` and takes the forecast origin and the
        watermark with it.

        ISOLATION - the same failure pointing backwards, which is the half the first two
        attempts missed. A mistyped PAST year postdates nothing and spans little, but it
        becomes `active_trading_start` and buries the real history under years of
        fabricated zeros, and a robust per-DOW median over that is 0.00. What marks it out
        is not the gap - a seasonal venue has those legitimately - but the speck of data
        on the far side of one.

        SPAN - the only cost check: it caps the calendar the feature build must densify
        even when the history is contiguous.

        Every message names the offending date(s). That matters more than the refusal:
        the caller has to find one bad row among 200,000, and "span too wide" would not
        help them do it.
        """
        today = date.today()
        # The watermark is checked even with no sales rows, because that is precisely the
        # case that let a poisoned one through: the engine echoes `prior_state.watermark`
        # back out when it has nothing better, so a bad one persisted by a previous call
        # would round-trip for ever. This closes the compounding loop the future bound
        # above describes.
        wm = self.prior_state.watermark
        if wm is not None and wm > today + timedelta(days=MAX_FUTURE_DAYS):
            raise ValueError(
                f"prior_state.watermark is {wm}, after today ({today}) plus "
                f"{MAX_FUTURE_DAYS} days of slack. A watermark is a closed day that was "
                "observed; this one was most likely persisted from an earlier dataset "
                "carrying a mistyped date, and it would round-trip indefinitely.")

        if not self.sales_daily:
            return self
        dates = sorted({r.date for r in self.sales_daily})
        lo, hi = dates[0], dates[-1]

        if hi > today + timedelta(days=MAX_FUTURE_DAYS):
            raise ValueError(
                f"sales_daily contains {hi}, which is after today ({today}) plus "
                f"{MAX_FUTURE_DAYS} days of slack. sales_daily is closed history, so this "
                "is a mistyped date; left alone it would become the forecast origin and "
                "the watermark rather than raise.")

        # PER VENUE, because that is the grain the harm has: the feature build, the
        # calendar fill and `trim_to_active` all run on one venue's series. Pooled across
        # the request, a sibling venue trading through the hole bridges it and the guard
        # silently stops existing - measured, 64 sibling rows were enough. See the note on
        # MAX_DATA_GAP_DAYS.
        #
        # Only meaningful with something to be isolated FROM. A single short history is a
        # new tenant, not a typo - the cold-start case, and the first thing a new org
        # hits; an earlier cut of this refused ten days of data as "stranded from the rest
        # of the history", where it WAS the history.
        by_venue: dict[str, set[date]] = {}
        for row in self.sales_daily:
            by_venue.setdefault(row.venue, set()).add(row.date)

        for venue, venue_dates in sorted(by_venue.items()):
            ordered = sorted(venue_dates)
            segments = _segments(ordered)
            if len(segments) == 1:
                continue
            for segment in segments:
                if len(segment) < MIN_SEGMENT_DAYS:
                    raise ValueError(
                        f"sales_daily has {len(segment)} day(s) around {segment[0]} for "
                        f"venue {venue!r}, stranded more than {MAX_DATA_GAP_DAYS} days "
                        f"from the rest of THAT VENUE's history ({ordered[0]} to "
                        f"{ordered[-1]}). Most often this is a mistyped year: the calendar "
                        "fill turns the emptiness between into zero-revenue rows inside "
                        "the training span and the forecast follows them to zero. If the "
                        "venue genuinely reopened after a long closure, or trades in short "
                        f"bursts, it needs {MIN_SEGMENT_DAYS} days on both sides of the "
                        "gap before it can be forecast - a known limitation, not a "
                        "judgement that your data is wrong.")

        span = (hi - lo).days
        if span > MAX_HISTORY_DAYS:
            raise ValueError(
                f"sales_daily spans {span} days ({lo} to {hi}), beyond the "
                f"{MAX_HISTORY_DAYS}-day limit. This one is about cost, not correctness: "
                "a history this long densifies to a calendar the feature build walks day "
                "by day.")
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
