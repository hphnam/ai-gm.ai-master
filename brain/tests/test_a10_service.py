"""A10 tests — every endpoint returns valid JSON and OpenAPI is served."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from service.app import app
from store import warehouse


@pytest.fixture(scope="module", autouse=True)
def _store():
    warehouse.build()  # ensure the DuckDB store exists for read endpoints


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
    r = client.post("/deviation/check", json={
        "venue": "beer_hall", "layer": "L1", "level": 0.90,
        "observations": [{"date": "2026-05-01", "value": 99999.0}]})
    # Either a 404 (no band persisted yet) or a valid breach payload.
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        assert "n_breaches" in r.json()
