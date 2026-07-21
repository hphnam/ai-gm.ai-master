"""S4 Part 4 - the occurrence gate (Cragg 1971 / Mullahy 1986 hurdle).

    yhat = P(trade) * E[revenue | trade]

A two-part / hurdle model: a binary part for whether the day trades at all, and an amount
part for how much, given that it does. The project's contribution is that **P(trade) is
observed, not estimated.** Beer Hall's closed days are a known weekly calendar (shut
Mon/Tue); Ellel's are a booking diary the venue holds. A full estimated hurdle would
spend sixty hours learning a quantity a covariate already knows.

Two invariants this module keeps, and the S4 G4/G5 tests pin:

  * A **comped day** - open and serving but zero revenue - is a trading day with
    P(trade)=1 and E[revenue|trade]=0. It is representable and is NOT a structural zero:
    occurrence 1, amount 0, which a scheduled closure (occurrence 0) is not.

  * The occurrence label is **exogenous by construction and never read from a venue's own
    revenue.** For a calendar-driven venue it is the weekly schedule; for an event-driven
    venue (Ellel) it is the booking diary, which has not arrived (FLAG-ELLEL-DIARY). Until
    it does the covariate is inert, and there is no code path - no argument, no branch -
    that could fill it from Ellel's trading days. That is the `is_ellel_event` self-leak
    killed in `features/build_features.py`; it cannot return here.
"""

from __future__ import annotations

from typing import Callable

import numpy as np
import pandas as pd

import org_profile

# Mirrors config.CHECKLIST_LIVE: the Ellel booking diary is not yet ingested, so the
# Ellel occurrence covariate stays inert. Flipping this True requires a real diary ingest;
# it must NEVER be satisfied from Ellel's own revenue (the self-leak).
ELLEL_DIARY_LIVE = False


def hurdle(p_trade, amount) -> np.ndarray:
    """The gate itself: yhat = P(trade) * E[revenue | trade], elementwise.

    P(trade)=1 with amount 0 yields 0 (a trading day that earned nothing); P(trade)=0
    yields 0 (a closed day). The two zeros are the same forecast but different states -
    the occurrence label, not this product, is what keeps them distinct.

    A closed day (P=0) is forced to exactly 0 regardless of the amount model's output, so
    the gate stays exact even if an amount model returns a non-finite value for a
    day-of-week it never saw among the trading days.
    """
    p = np.asarray(p_trade, dtype=float)
    return np.where(p == 0.0, 0.0, p * np.asarray(amount, dtype=float))


def occurrence_label(venue: str, dates) -> np.ndarray:
    """Exogenous per-day trading label O in {0, 1}, or NaN where unknown.

    Calendar-driven venue: O = 1 on scheduled-open weekdays, 0 on the structural-zero
    weekdays (the known schedule; a comped open day is still O = 1). Event-driven venue
    (Ellel): O comes from the booking diary and is NaN (inert) until the diary arrives.
    Never reads revenue, so it cannot self-leak.
    """
    idx = pd.to_datetime(pd.Index(dates))
    if org_profile.is_event_driven(venue):
        return ellel_diary_occurrence(idx)
    closed = org_profile.structural_zero_dow(venue)
    return np.where(idx.dayofweek.isin(closed), 0.0, 1.0)


def ellel_diary_occurrence(dates, diary: dict | None = None) -> np.ndarray:
    """Ellel occurrence from the booking diary. INERT until the diary arrives.

    Returns all-NaN unless `ELLEL_DIARY_LIVE` and an explicit `diary` (a date->booked map)
    is supplied. It takes a diary, never a revenue series: there is no argument here that
    could carry Ellel's own trading days and no branch that reads them, so the
    `is_ellel_event` self-leak is impossible by construction rather than by convention.
    """
    idx = pd.to_datetime(pd.Index(dates))
    if not ELLEL_DIARY_LIVE or diary is None:
        return np.full(len(idx), np.nan)
    return np.array([1.0 if diary.get(d.date(), False) else 0.0 for d in idx])


def p_trade(train: pd.DataFrame, target: pd.DataFrame, venue: str) -> np.ndarray:
    """P(trade) per target day: E[occurrence | day-of-week] from the training labels.

    Observed from the known calendar, not estimated: a structurally-closed weekday
    resolves to ~0, an open weekday to ~1. All-NaN (inert) when the occurrence signal is
    unavailable (Ellel without a diary), so the gate degrades to a no-op rather than a
    fabricated proxy.
    """
    o = occurrence_label(venue, train["date"])
    if np.isnan(o).all():
        return np.full(len(target), np.nan)
    by_dow = (pd.DataFrame({"dow": pd.to_datetime(train["date"]).dt.dayofweek, "o": o})
              .groupby("dow")["o"].mean())
    return (pd.to_datetime(target["date"]).dt.dayofweek.map(by_dow)
            .fillna(0.0).to_numpy(float))


def hurdle_forecast(
    train: pd.DataFrame, target: pd.DataFrame, venue: str,
    amount_predict: Callable[[pd.DataFrame, pd.DataFrame], np.ndarray],
) -> np.ndarray:
    """Gated forecast: P(trade) * E[revenue | trade].

    `E[revenue|trade]` is `amount_predict` fit on TRADING days only (occurrence 1), so the
    amount model is not diluted by structural-closure zeros; P(trade) then re-applies the
    occurrence. Where the occurrence signal is inert (Ellel, no diary) this returns the
    ungated `amount_predict(train, target)` unchanged - the gate is a measured no-op, never
    a proxy fabricated from the venue's own revenue.
    """
    p = p_trade(train, target, venue)
    if np.isnan(p).all():
        return amount_predict(train, target)
    o_train = occurrence_label(venue, train["date"])
    trading = train[np.asarray(o_train) > 0.5]
    return hurdle(p, amount_predict(trading, target))
