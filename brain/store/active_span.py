"""Shared definition of a venue's active trading span.

A venue may stop trading partway through the dataset (Two River Taps' closure)
or be sparse throughout (Ellel). `fill_calendar` pads missing days with 0, so a
closed venue's last weeks of feature rows are **post-closure zero-padding** —
not real trading days the model should be scored on. These helpers give the one
shared notion of "the days the venue actually traded" used by the ladder, the
conformal wrapper, and the LOVO transfer; trimming removes that trailing
zero-padding (and any leading pre-open padding), not a real declining tail.
"""

from __future__ import annotations

import pandas as pd

from config import EVENT_ONLY_VENUES, FORECAST_VENUES
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
    span — drops the leading/trailing all-zero stretches (e.g. TRT's closure)."""
    start = active_trading_start(venue, con=con)
    end = active_trading_end(venue, con=con)
    return feats[(feats["date"] >= start) & (feats["date"] <= end)].reset_index(drop=True)


def dataset_max_date(con=None) -> pd.Timestamp:
    """Latest L1 date seen across ALL forecast venues — the 'today' reference a
    closed venue's tail is measured against. `read_series` reindexes each venue
    onto its OWN min..max calendar, so a venue's own max is just its last
    transaction; closure has to be judged against the dataset-wide max instead."""
    ends = [pd.Timestamp(read_series(v, "L1", value="revenue_exvat",
                                     fill_calendar=True, con=con)["date"].max())
            for v in FORECAST_VENUES]
    return max(ends)


def is_closed(venue: str, con=None) -> bool:
    """True when a continuously-trading venue stopped before the dataset-global
    max (a genuine closure, like Two River Taps). Event/booking-driven venues
    (`EVENT_ONLY_VENUES`, e.g. Ellel) are never "closed": a trailing gap is
    expected sparsity between bookings, not a closure — judging them against the
    global max would misclassify a normal booking lull as a shutdown."""
    if venue in EVENT_ONLY_VENUES:
        return False
    return active_trading_end(venue, con=con) < dataset_max_date(con=con)
