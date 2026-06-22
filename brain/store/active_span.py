"""Shared definition of a venue's active trading span.

A venue may have a long zero-tail (Two River Taps' closure) or be sparse
throughout (Ellel). `fill_calendar` pads missing days with 0 up to the global
calendar max, so the naive "last 8 weeks" test block of a closed venue would be
the dead zero-tail — every model trivially "wins" by predicting zero. These
helpers give the one shared notion of "the days the venue actually traded" used
by the ladder, the conformal wrapper, and the LOVO transfer.
"""

from __future__ import annotations

import pandas as pd

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


def is_closed(venue: str, con=None) -> bool:
    """True when the venue's last active day is before the global calendar max
    (i.e. it has a closure tail)."""
    s = read_series(venue, "L1", value="revenue_exvat", fill_calendar=True, con=con)
    return active_trading_end(venue, con=con) < pd.Timestamp(s["date"].max())
