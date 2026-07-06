"""Incremental weather ingest (FB1): an already-populated basis table is EXTENDED
to new dates, not skipped; a full rebuild is available via force; and a coverage
shortfall is reported as a structured weather_gap. Network is stubbed so the test
exercises the extend/no-op/rebuild logic deterministically.
"""

from __future__ import annotations

from datetime import date

import duckdb
import pandas as pd
import pytest

from ingest import exog_weather


def _fake_fetch(cell, start, end, *args):
    dates = pd.date_range(start, end, freq="D")
    return pd.DataFrame({
        "date": dates, "cell": cell, "exo_temp_c": 15.0,
        "exo_rain_mm": 1.0, "exo_sunshine_hrs": 5.0,
    })


@pytest.fixture
def store(tmp_path, monkeypatch):
    path = str(tmp_path / "w.duckdb")
    monkeypatch.setattr(exog_weather, "connect",
                        lambda read_only=False: duckdb.connect(path, read_only=read_only))
    monkeypatch.setattr(exog_weather, "_cell_span", lambda cell: ("2026-06-01", "2026-06-10"))
    monkeypatch.setattr(exog_weather, "WEATHER_CELLS", {"beer_hall": "lancaster"})
    monkeypatch.setattr(exog_weather, "_FETCH", {b: _fake_fetch for b in exog_weather.BASES})
    return path


def _dates(path, table):
    c = duckdb.connect(path, read_only=True)
    try:
        return list(pd.to_datetime(
            c.execute(f"SELECT date FROM {table} ORDER BY date").df()["date"]).dt.date)
    finally:
        c.close()


def _seed(path, table, upto):
    c = duckdb.connect(path)
    try:
        df = _fake_fetch("lancaster", "2026-06-01", upto)
        c.register("_w", df)
        c.execute(f"CREATE TABLE {table} AS SELECT * FROM _w")
        c.unregister("_w")
    finally:
        c.close()


def test_extends_populated_table_to_new_dates(store):
    _seed(store, "exog_weather_observed", "2026-06-05")   # pre-populated only to the 5th
    summary = exog_weather.build()
    assert summary["observed"]["mode"] == "incremental"
    assert summary["observed"]["added"] == 5              # 6th..10th appended
    d = _dates(store, "exog_weather_observed")
    assert d[0] == date(2026, 6, 1) and d[-1] == date(2026, 6, 10)
    assert len(d) == len(set(d)) == 10                    # no duplicates


def test_second_run_is_a_clean_noop(store):
    exog_weather.build()
    again = exog_weather.build()
    assert all(again[b]["added"] == 0 and again[b]["cached"] for b in exog_weather.BASES)


def test_force_rebuilds(store):
    exog_weather.build()
    forced = exog_weather.build(force=True)
    assert forced["observed"]["mode"] == "rebuild"
    assert len(_dates(store, "exog_weather_observed")) == 10


def test_weather_gap_flags_a_shortfall(store, monkeypatch):
    # l1_daily demands coverage to the 10th; seed weather only to the 6th.
    c = duckdb.connect(store)
    c.execute("CREATE TABLE l1_daily AS SELECT * FROM (VALUES "
              "('beer_hall', DATE '2026-06-10')) AS t(venue, date)")
    c.close()
    _seed(store, "exog_weather_leadmatched", "2026-06-06")
    monkeypatch.setattr(exog_weather, "FORECAST_VENUES", ("beer_hall",))
    con = duckdb.connect(store, read_only=True)
    try:
        gap = exog_weather.weather_gap(con)
    finally:
        con.close()
    lead = [g for g in gap if g["basis"] == "leadmatched"]
    assert lead and lead[0]["covered_through"] == "2026-06-06"
    assert lead[0]["required_through"] == "2026-06-10"
