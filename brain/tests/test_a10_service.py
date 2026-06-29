"""A10 tests — every endpoint returns valid JSON and OpenAPI is served, and all
three forecast venues are actually served (the regression guard for FIX-4: all
venues are forecast targets, not just the Beer Hall)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from config import FORECAST_VENUES
from conformal.wrap import default_model, evaluate
from service.app import app
from store import warehouse


@pytest.fixture(scope="module", autouse=True)
def _store():
    warehouse.build()  # ensure the DuckDB store exists for read endpoints
    # Persist an L1 band for every forecast venue so /forecast serves all three.
    for v in FORECAST_VENUES:
        evaluate(v, default_model(v))


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_health_reports_store_built(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["store_built"] is True
    assert body["status"] == "ok"


def test_openapi_docs_served(client):
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200


def test_checklist_endpoint_flags_missed_gas(client):
    # Closing checklist on a Wednesday missing the gas-off step (#8).
    completed = list(range(1, 33))
    completed.remove(8)
    r = client.post("/checklist/discipline",
                    json={"checklist": "closing", "completed": completed, "dow": 2})
    assert r.status_code == 200
    body = r.json()
    assert 8 in body["critical_missed"]
    assert body["severity"] == "high"


def test_checklist_sunday_rule(client):
    # #31 absent on a weekday must NOT be a miss.
    completed = [n for n in range(1, 33) if n != 31]
    r = client.post("/checklist/discipline",
                    json={"checklist": "closing", "completed": completed, "dow": 3})
    missed = [m[0] for m in r.json()["missed"]]
    assert 31 not in missed


def test_deviation_check_returns_json(client):
    r = client.post("/deviation/check", json={"venue": "beer_hall", "layer": "L1"})
    assert r.status_code == 200
    body = r.json()
    assert body["found"] and body["status"] in ("normal", "deviation")
    assert "z" in body and "band_low" in body and "band_high" in body


def test_deviation_check_unknown_venue_returns_not_found_envelope(client):
    r = client.post("/deviation/check", json={"venue": "no_such_venue"})
    assert r.status_code == 200
    assert r.json()["found"] is False


@pytest.mark.parametrize("venue", list(FORECAST_VENUES))
def test_forecast_served_for_every_venue(client, venue):
    """FIX-4: all three venues are forecast targets — /forecast must not 404."""
    r = client.get(f"/forecast?venue={venue}&layer=L1&level=0.9")
    assert r.status_code == 200
    body = r.json()
    assert body["n"] > 0, f"no L1 band served for {venue}"


@pytest.mark.parametrize("venue", list(FORECAST_VENUES))
def test_deviation_check_served_for_every_venue(client, venue):
    r = client.post("/deviation/check", json={"venue": venue, "layer": "L1"})
    assert r.status_code == 200
    assert "found" in r.json()


def test_deviation_scan_returns_recent_days(client):
    r = client.post("/deviation/scan", json={"venue": "beer_hall", "window": 7})
    assert r.status_code == 200
    body = r.json()
    assert body["n"] <= 7 and isinstance(body["days"], list)
