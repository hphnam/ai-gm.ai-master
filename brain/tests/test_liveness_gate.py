"""G12.17a-1 liveness gate (`active_span.is_dormant`).

A venue with no trading for the last N days ending at the as-of date is dormant and
must not be served a positive forecast; one trading day inside the window flips it
back to live. The store read is stubbed so the window boundary and the reactivation
transition are tested deterministically, independent of the live store's contents.
"""

from __future__ import annotations

import pandas as pd
import pytest

import config
from store import active_span

AS_OF = pd.Timestamp("2026-06-30")


def _series(last_trade: pd.Timestamp | None):
    """A filled daily L1 series ending at AS_OF; nonzero only on `last_trade`."""
    dates = pd.date_range(AS_OF - pd.Timedelta(days=120), AS_OF, freq="D")
    val = [0.0] * len(dates)
    if last_trade is not None:
        val[list(dates).index(last_trade)] = 500.0
    return pd.DataFrame({"date": dates, "value": val})


@pytest.fixture
def stub_series(monkeypatch):
    def _install(last_trade):
        monkeypatch.setattr(active_span, "read_series",
                            lambda *a, **k: _series(last_trade))
    return _install


def test_recent_trade_is_live(stub_series):
    stub_series(AS_OF - pd.Timedelta(days=2))
    assert active_span.is_dormant("beer_hall", as_of=AS_OF) is False


def test_no_recent_trade_is_dormant(stub_series):
    stub_series(AS_OF - pd.Timedelta(days=40))
    assert active_span.is_dormant("two_river_taps", as_of=AS_OF) is True


def test_reactivation_on_window_boundary_is_live(stub_series):
    boundary = AS_OF - pd.Timedelta(days=config.DORMANCY_LOOKBACK_DAYS - 1)
    stub_series(boundary)
    assert active_span.is_dormant("two_river_taps", as_of=AS_OF) is False


def test_never_traded_is_dormant(stub_series):
    stub_series(None)
    assert active_span.is_dormant("ellel", as_of=AS_OF) is True
