"""A10 tests, every endpoint returns valid JSON and OpenAPI is served, and all
three forecast venues are actually served (the regression guard for FIX-4: all
venues are forecast targets, not just the Beer Hall)."""

from __future__ import annotations

import sys
from unittest import mock

import pytest
from fastapi.testclient import TestClient

import config
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


def test_openapi_docs_served_in_development(client):
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200


# --- Hardening: the API-to-brain hop is the only caller (H1/M1/M3) ------------

_SECRET = "test-shared-secret"


@pytest.fixture
def secured(monkeypatch):
    """A client against a brain that holds a shared secret. `require_auth` reads
    the secret at call time, so patching config is enough to arm the check."""
    monkeypatch.setattr(config, "BRAIN_SHARED_SECRET", _SECRET)
    return TestClient(app)


def test_refresh_is_absent_from_the_http_surface(client):
    """M1: unbounded, state-mutating compute is reachable only via the function."""
    assert client.post("/refresh", json={"venue": "beer_hall"}).status_code == 404


def test_secured_brain_rejects_a_request_with_no_token(secured):
    assert secured.get("/freshness?venue=all").status_code == 401


def test_secured_brain_rejects_a_wrong_token(secured):
    r = secured.get("/freshness?venue=all",
                    headers={"Authorization": "Bearer wrong-token"})
    assert r.status_code == 401


def test_secured_brain_accepts_the_shared_secret(secured):
    r = secured.get("/freshness?venue=all",
                    headers={"Authorization": f"Bearer {_SECRET}"})
    assert r.status_code == 200


def test_secured_brain_rejects_a_non_ascii_token_without_crashing(secured):
    """A str compare_digest raises TypeError on non-ASCII, turning a hostile token
    into a 500 plus a logged traceback on an unauthenticated path. It must be a 401.

    Sent as latin-1 bytes because that is how it arrives on the wire: a str header
    would be rejected by the client before it ever reached the app.
    """
    r = secured.get("/freshness?venue=all",
                    headers={b"Authorization": "Bearer café".encode("latin-1")})
    assert r.status_code == 401


def test_health_stays_reachable_without_a_token(secured):
    """Liveness probes run before an orchestrator holds the secret."""
    assert secured.get("/health").status_code == 200


@pytest.fixture
def topup_calls(monkeypatch):
    """Record what `_live_topup` actually forwards to refresh. Patches sys.modules
    because `_live_topup` imports refresh lazily inside the function."""
    from service import app as app_module

    calls: list[str] = []
    monkeypatch.setattr(app_module, "_LAST_TOPUP", {})
    monkeypatch.setitem(
        sys.modules,
        "ingest.refresh",
        type("_Stub", (), {"refresh": staticmethod(lambda v, **k: calls.append(v))})(),
    )
    return calls


def test_live_topup_runs_once_inside_the_throttle_window(topup_calls):
    """`freshness=live` reaches a write path from an LLM-supplied parameter, so a
    second call inside the window must not reach refresh again (the M1 bound)."""
    from service import app as app_module

    app_module._live_topup("beer_hall", "live")
    app_module._live_topup("beer_hall", "live")
    assert topup_calls == ["beer_hall"]


def test_live_topup_throttles_per_venue_not_globally(topup_calls):
    """One venue's top-up must not suppress a different venue's."""
    from service import app as app_module

    app_module._live_topup("beer_hall", "live")
    app_module._live_topup("ellel", "live")
    assert topup_calls == ["beer_hall", "ellel"]


def test_live_topup_ignores_an_unknown_venue(topup_calls):
    """An unrecognised venue would mint a throttle slot per string variation and
    take the full-history branch, so it is refused before it is stamped."""
    from service import app as app_module

    app_module._live_topup("../../etc/passwd", "live")
    assert topup_calls == []


def test_live_topup_does_not_suppress_the_first_call_for_a_venue(topup_calls):
    """Guards the -inf default: time.monotonic()'s reference point is undefined, so
    a 0.0 default would suppress every venue's first top-up wherever the clock
    starts near zero."""
    from service import app as app_module

    monkeypatched_clock = 1.0     # a clock sitting inside the window of 0.0
    with mock.patch.object(app_module.time, "monotonic", return_value=monkeypatched_clock):
        app_module._live_topup("beer_hall", "live")
    assert topup_calls == ["beer_hall"]


def test_service_refuses_to_import_with_no_secret_and_no_opt_out(monkeypatch):
    """The posture switch fails CLOSED: forgetting to configure anything must stop
    the service booting, not silently serve every route unauthenticated."""
    from service.auth import assert_auth_configured

    monkeypatch.setattr(config, "HARDENED", True)
    monkeypatch.setattr(config, "BRAIN_SHARED_SECRET", None)
    with pytest.raises(RuntimeError, match="BRAIN_SHARED_SECRET"):
        assert_auth_configured()


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
    """FIX-4: all three venues are forecast targets, /forecast must not 404."""
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
