"""A1 tests — store round-trips at all three layers, BH reconciles, forecast
and band writes persist and read back coherently.
"""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from config import BH_NET_SALES_TOTAL, RECONCILE_TOL
from store import warehouse


@pytest.fixture(scope="module", autouse=True)
def built_store():
    warehouse.build()
    yield


@pytest.mark.parametrize("layer", ["L1", "L2", "L3"])
def test_layer_round_trips(layer):
    df = warehouse.read_series("beer_hall", layer)
    assert not df.empty


def test_bh_l1_reconciles_to_audit():
    df = warehouse.read_series("beer_hall", "L1")
    total = df["value"].sum()
    assert abs(total - BH_NET_SALES_TOTAL) <= BH_NET_SALES_TOTAL * RECONCILE_TOL


def test_l1_fill_calendar_is_continuous():
    df = warehouse.read_series("beer_hall", "L1", fill_calendar=True)
    gaps = df["date"].diff().dropna().dt.days
    assert (gaps == 1).all()


def test_forecast_and_band_write_read_round_trip():
    con = warehouse.connect()
    try:
        fc = pd.DataFrame(
            {
                "venue": ["beer_hall"],
                "layer": ["L1"],
                "key": [None],
                "target_date": [date(2030, 1, 1)],
                "model": ["unit_test"],
                "yhat": [1234.5],
            }
        )
        bd = pd.DataFrame(
            {
                "venue": ["beer_hall"],
                "layer": ["L1"],
                "key": [None],
                "target_date": [date(2030, 1, 1)],
                "model": ["unit_test"],
                "level": [0.9],
                "lo": [1000.0],
                "hi": [1500.0],
            }
        )
        warehouse.write_forecast(fc, con=con)
        warehouse.write_band(bd, con=con)
        # Upsert again must not duplicate.
        warehouse.write_forecast(fc, con=con)

        out = warehouse.read_band("beer_hall", "L1", level=0.9, con=con)
        out = out[out["model"] == "unit_test"]
        assert len(out) == 1
        assert out.iloc[0]["yhat"] == pytest.approx(1234.5)
        assert out.iloc[0]["lo"] == pytest.approx(1000.0)
    finally:
        con.execute("DELETE FROM forecasts WHERE model = 'unit_test'")
        con.execute("DELETE FROM bands WHERE model = 'unit_test'")
        con.close()
