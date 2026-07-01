"""T1 live-fact + cache tests (PRJ93 live-ingest spec, G7 / G-live-a / G-live-e).

The cache mechanics (TTL, per-metric key, force-bypass) and the inert-while-off
envelope are exercised with an injected fake fetcher — no Square, no network.
"""

from __future__ import annotations

import config
from ingest import live


def _counter(monkeypatch):
    calls = {"n": 0}

    def fake(venue, metric, window):
        calls["n"] += 1
        return {"value": 100.0}

    monkeypatch.setattr(live, "_fetch_metric", fake)
    return calls


# --- G-live-a: no false live -------------------------------------------------

def test_live_facts_inert_while_off(monkeypatch):
    monkeypatch.setattr(config, "LIVE_INGEST", False)
    live.cache_clear()
    r = live.live_facts("beer_hall", ["sales"])
    assert r["live"] is False and r["source"] == "unavailable"


# --- G7 / G-live-e: cache TTL + key + force-bypass ---------------------------

def test_cache_hit_avoids_a_second_fetch(monkeypatch):
    monkeypatch.setattr(config, "LIVE_INGEST", True)
    live.cache_clear()
    calls = _counter(monkeypatch)
    live.live_facts("beer_hall", ["sales"])
    r2 = live.live_facts("beer_hall", ["sales"])
    assert calls["n"] == 1 and r2["metrics"]["sales"]["cached"] is True


def test_force_read_bypasses_the_cache(monkeypatch):
    monkeypatch.setattr(config, "LIVE_INGEST", True)
    live.cache_clear()
    calls = _counter(monkeypatch)
    live.live_facts("beer_hall", ["sales"])
    live.live_facts("beer_hall", ["sales"], force=True)
    assert calls["n"] == 2


def test_cache_is_keyed_per_metric(monkeypatch):
    monkeypatch.setattr(config, "LIVE_INGEST", True)
    live.cache_clear()
    calls = _counter(monkeypatch)
    live.live_facts("beer_hall", ["sales", "labour_cost"])
    assert calls["n"] == 2


def test_cache_honours_ttl_expiry(monkeypatch):
    monkeypatch.setattr(config, "LIVE_INGEST", True)
    monkeypatch.setattr(config, "LIVE_CACHE_TTL_MIN", 0)   # instant expiry
    live.cache_clear()
    calls = _counter(monkeypatch)
    live.live_facts("beer_hall", ["sales"])
    live.live_facts("beer_hall", ["sales"])
    assert calls["n"] == 2
