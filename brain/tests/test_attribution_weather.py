"""Attribution must distinguish "weather checked, no coincidence" from "weather
unavailable for this date, not checked" (FB3). Conflating them is what let the June
probe's honest null read as a clean weather check when the seam held no June weather.
Calendar and closure are stubbed so only the weather branch is under test.
"""

from __future__ import annotations

import duckdb
import pandas as pd
import pytest

from config import WEATHER_CELLS
from signals import residual

_ONSET = pd.Timestamp("2026-06-13")


@pytest.fixture
def con(tmp_path, monkeypatch):
    monkeypatch.setattr(residual, "is_closed", lambda v, con=None: False)
    monkeypatch.setattr(residual.cal, "is_school_term", lambda d: True)
    monkeypatch.setattr(residual.cal, "is_uni_term", lambda d: True)
    return duckdb.connect(str(tmp_path / "a.duckdb"))


def _seed_leadmatched(con):
    df = pd.DataFrame({
        "date": pd.to_datetime(pd.date_range("2026-06-01", "2026-06-30")),
        "cell": WEATHER_CELLS["beer_hall"], "exo_temp_c": 15.0, "exo_rain_mm": 1.0,
        "exo_sunshine_hrs": 5.0,
    })
    con.register("_w", df)
    con.execute("CREATE TABLE exog_weather_leadmatched AS SELECT * FROM _w")
    con.unregister("_w")


def test_absent_weather_reads_as_not_checked(con):
    reasons = residual.attribute("beer_hall", _ONSET, "up", "L1", con=con)
    assert any("weather unavailable for this date, not checked" in r for r in reasons)
    assert not any("no coincident calendar/weather/event/promo" in r for r in reasons)


def test_present_weather_no_anomaly_reads_as_real_null(con):
    _seed_leadmatched(con)
    reasons = residual.attribute("beer_hall", _ONSET, "up", "L1", con=con)
    assert any("no coincident calendar/weather/event/promo signal" in r for r in reasons)
    assert not any("weather unavailable" in r for r in reasons)
