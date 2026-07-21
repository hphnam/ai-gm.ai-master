"""S4 Part 4 gates: the occurrence hurdle represents a comped trading day (G4), and the
Ellel occurrence covariate is inert and cannot be populated from Ellel's own revenue (G5).

Store-independent: the occurrence label comes from the known calendar / the (absent)
diary, never from the store, so these are fast and deterministic.
"""

from __future__ import annotations

import inspect

import numpy as np
import pandas as pd

from signals import occurrence


def _weekday(dow: int) -> pd.Timestamp:
    """A concrete date with the given day-of-week (Mon=0 ... Sun=6)."""
    week = pd.date_range("2026-06-01", periods=7)
    return week[[d.dayofweek for d in week].index(dow)]


# --- G4: a comped trading day is representable, not a structural zero --------

def test_the_hurdle_is_p_trade_times_amount():
    assert occurrence.hurdle(1.0, 250.0) == 250.0
    assert occurrence.hurdle(0.0, 250.0) == 0.0


def test_a_comped_open_day_is_a_trading_day():
    wednesday = _weekday(2)  # Beer Hall trades Wed-Sun
    assert occurrence.occurrence_label("beer_hall", [wednesday])[0] == 1.0


def test_a_structurally_closed_day_is_not_a_trading_day():
    monday = _weekday(0)  # Beer Hall shut Mon/Tue
    assert occurrence.occurrence_label("beer_hall", [monday])[0] == 0.0


def test_p_trade_one_with_zero_revenue_yields_zero_but_stays_trading():
    """P(trade)=1, E[revenue|trade]=0: the comped day. yhat is 0, occurrence is 1 - a
    trading day that earned nothing, NOT a structural zero."""
    o = occurrence.occurrence_label("beer_hall", [_weekday(2)])[0]
    assert o == 1.0
    assert occurrence.hurdle(o, 0.0) == 0.0


def test_a_closure_and_a_comped_day_share_the_forecast_but_not_the_state():
    o_open = occurrence.occurrence_label("beer_hall", [_weekday(2)])[0]
    o_closed = occurrence.occurrence_label("beer_hall", [_weekday(0)])[0]
    assert occurrence.hurdle(o_open, 0.0) == occurrence.hurdle(o_closed, 500.0)  # both 0
    assert o_open != o_closed  # trading vs closed: distinct occurrence states


# --- G5: the Ellel occurrence covariate is inert and cannot self-leak -------

def test_ellel_occurrence_is_inert_without_a_diary():
    o = occurrence.occurrence_label("ellel", pd.date_range("2026-06-01", periods=30))
    assert np.isnan(o).all()


def test_the_ellel_occurrence_function_takes_a_diary_never_a_revenue_series():
    params = set(inspect.signature(occurrence.ellel_diary_occurrence).parameters)
    assert params <= {"dates", "diary"}


def test_ellel_occurrence_stays_inert_even_when_handed_a_diary_while_the_flag_is_off():
    diary = {pd.Timestamp("2026-06-01").date(): True}
    o = occurrence.ellel_diary_occurrence(pd.date_range("2026-06-01", periods=5), diary=diary)
    assert np.isnan(o).all()


def test_the_inert_ellel_gate_is_a_no_op_not_a_revenue_proxy():
    train = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=60),
                          "value": np.arange(60.0)})
    target = pd.DataFrame({"date": pd.date_range("2026-03-02", periods=7)})

    def amount(_train, tg):
        return np.full(len(tg), 42.0)

    out = occurrence.hurdle_forecast(train, target, "ellel", amount)
    assert np.allclose(out, 42.0)
