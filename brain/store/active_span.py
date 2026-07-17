"""Shared definition of a venue's active trading span.

A venue may stop trading partway through the dataset (Two River Taps' closure)
or be sparse throughout (Ellel). `fill_calendar` pads missing days with 0, so a
closed venue's last weeks of feature rows are **post-closure zero-padding**
not real trading days the model should be scored on. These helpers give the one
shared notion of "the days the venue actually traded" used by the ladder, the
conformal wrapper, and the LOVO transfer; trimming removes that trailing
zero-padding (and any leading pre-open padding), not a real declining tail.
"""

from __future__ import annotations

import pandas as pd

import config
import org_profile
from store.warehouse import read_series


def active_trading_end(venue: str, con=None) -> pd.Timestamp:
    """Last calendar date with nonzero L1 revenue (the global max if always-on)."""
    s = read_series(venue, "L1", value="revenue_exvat", fill_calendar=True, con=con)
    nz = s.loc[s["value"] > 0, "date"]
    return pd.Timestamp(nz.max()) if len(nz) else pd.Timestamp(s["date"].max())


def active_trading_start(venue: str, con=None) -> pd.Timestamp:
    s = read_series(venue, "L1", value="revenue_exvat", fill_calendar=True, con=con)
    nz = s.loc[s["value"] > 0, "date"]
    return pd.Timestamp(nz.min()) if len(nz) else pd.Timestamp(s["date"].min())


def trim_to_active(feats: pd.DataFrame, venue: str, con=None) -> pd.DataFrame:
    """Trim a feature/series frame (with a `date` column) to the venue's active
    span, drops the leading/trailing all-zero stretches (e.g. TRT's closure)."""
    start = active_trading_start(venue, con=con)
    end = active_trading_end(venue, con=con)
    return feats[(feats["date"] >= start) & (feats["date"] <= end)].reset_index(drop=True)


def dataset_max_date(con=None) -> pd.Timestamp:
    """Latest L1 date seen across ALL of the tenant's venues, the 'today' reference a
    closed venue's tail is measured against. `read_series` reindexes each venue
    onto its OWN min..max calendar, so a venue's own max is just its last
    transaction; closure has to be judged against the dataset-wide max instead.

    Venue list comes from the profile: this iterated Lune's three slugs, so inside a
    tenant's store every read missed and the max came back NaT - which made `is_closed`
    return False for everyone by accident rather than by reasoning.
    """
    ends = [pd.Timestamp(read_series(v, "L1", value="revenue_exvat",
                                     fill_calendar=True, con=con)["date"].max())
            for v in org_profile.venues()]
    # A venue with no rows reads back NaT, and NaT silently poisons max() into an
    # arbitrary answer rather than an error. With nothing anywhere, "today" has no
    # defensible value: `is_dormant` would subtract its lookback from the sentinel and
    # overflow, so say so here instead of propagating a wrong date.
    ends = [e for e in ends if pd.notna(e)]
    if not ends:
        raise ValueError(
            "dataset_max_date: no venue in the current profile has any L1 data, so "
            "there is no reference 'today' to judge closure against")
    return max(ends)


def is_closed(venue: str, con=None) -> bool:
    """True when a continuously-trading venue stopped before the dataset-global
    max (a genuine closure, like Two River Taps). Booking-driven venues are never
    "closed": a trailing gap is expected sparsity between bookings, not a closure, and
    judging them against the global max would misclassify a normal booking lull as a
    shutdown."""
    if org_profile.is_event_driven(venue):
        return False
    return active_trading_end(venue, con=con) < dataset_max_date(con=con)


def is_dormant(venue: str, as_of=None, con=None, days: int | None = None) -> bool:
    """True when a venue has had ZERO trading for the last `days` consecutive days
    ending at `as_of` (the liveness gate, G12.17a-1).

    Distinct from `is_closed`: dormancy is judged against a fixed recent window
    ending at the operational as-of date, not against the dataset-global max, and it
    applies to every venue uniformly (no event-venue exemption) because a genuinely
    dark venue must not be served a positive forecast whatever its type. Reactivation
    is automatic: one trading day inside the window flips it back to live. `as_of`
    defaults to the dataset-global max; `days` to `config.DORMANCY_LOOKBACK_DAYS`.
    """
    days = config.DORMANCY_LOOKBACK_DAYS if days is None else days
    as_of = dataset_max_date(con=con) if as_of is None else pd.Timestamp(as_of)
    s = read_series(venue, "L1", value="revenue_exvat", fill_calendar=True, con=con)
    traded = s.loc[s["value"] > 0, "date"]
    if traded.empty:
        return True  # never traded: not a live forecaster
    window_start = as_of - pd.Timedelta(days=days - 1)
    in_window = traded[(traded >= window_start) & (traded <= as_of)]
    return in_window.empty
