"""Proactive-briefing tests (PRJ93 briefing spec, gates G0/G2/G4/G5a-c/G6/G7).

The synthesis layer: de-dup, transparent ranking, honesty gates, and "since
yesterday" novelty. Deterministic gates construct `Signal`s directly or
monkeypatch `collect`; the store-backed gates use the built warehouse.
"""

from __future__ import annotations

import ast
import inspect
from datetime import date

import pytest

from signals import briefing
from signals import change_point, checklist_discipline, deviation, residual
from signals.briefing import Signal
from store import warehouse
from store.active_span import active_trading_end

AS_OF = date(2026, 5, 31)


@pytest.fixture(scope="module")
def store():
    warehouse.build()


@pytest.fixture
def no_attr(monkeypatch):
    """Neutralise the store-backed attributor so the pure gates stay offline."""
    monkeypatch.setattr(briefing, "attribute", lambda *a, **k: ["coincides with a test signal"])


def _imported(module) -> set[str]:
    mods: set[str] = set()
    for node in ast.walk(ast.parse(inspect.getsource(module))):
        if isinstance(node, ast.ImportFrom) and node.module:
            mods.add(node.module)
        elif isinstance(node, ast.Import):
            mods.update(a.name for a in node.names)
    return mods


# --- G0 dependency direction -------------------------------------------------

def test_briefing_composes_the_four_signals_one_way():
    mods = _imported(briefing)
    assert {"signals.deviation", "signals.change_point", "signals.residual",
            "signals.checklist_discipline"} <= mods


def test_no_signal_imports_briefing():
    for mod in (deviation, change_point, residual, checklist_discipline):
        assert "signals.briefing" not in _imported(mod)


# --- G2 de-duplication -------------------------------------------------------

def test_changepoint_absorbs_deviation_run_and_coincident_stock(no_attr):
    cp = Signal("change_point", "beer_hall", date(2025, 12, 27), "down", "medium", -29.0,
                {"magnitude_pct": -29.0})
    devs = [Signal("deviation", "beer_hall", date(2025, 12, 24 + i), "down", "high", -2.0,
                   {"actual": 100.0}) for i in range(3)]
    stock = Signal("stock", "beer_hall", date(2025, 12, 29), "down", "high", 0.0,
                   {"product": "lager", "days_of_cover": 0.0, "suggested_order_kegs": 1.0})
    clusters = briefing._cluster([cp, *devs, stock])
    assert len(clusters) == 1
    item = briefing._build_item(clusters[0], AS_OF, "L1", None)
    assert item.head.source == "change_point"
    assert len(item.evidence) == 4
    assert any("reorder" in c for c in item.caveats)   # stock action never lost


# --- G4 ranking is deterministic and matches the documented order ------------

def test_ranking_orders_changepoint_then_stock_then_deviation(no_attr):
    heads = [
        Signal("deviation", "beer_hall", AS_OF, "up", "high", 3.0, {"actual": 100.0}),
        Signal("stock", "beer_hall", AS_OF, "down", "high", 0.0,
               {"product": "lager", "days_of_cover": 0.0, "suggested_order_kegs": 1.0}),
        Signal("change_point", "beer_hall", AS_OF, "down", "high", -29.0, {"magnitude_pct": -29.0}),
    ]
    items = []
    for h in heads:
        it = briefing._build_item([h], AS_OF, "L1", None)
        bt, _ = briefing._baseline_trust(it.head, [it.head])
        it.status = "new"
        it.score = briefing._score(it.head, "new", bt, AS_OF)
        items.append(it)
    items.sort(key=briefing._sort_key)
    assert [it.head.source for it in items] == ["change_point", "stock", "deviation"]


# --- G5a template checklist data never reaches the feed ----------------------

def test_checklist_excluded_while_not_live():
    assert briefing._collect_checklist("beer_hall", AS_OF, None) == []


def test_build_has_no_checklist_items(store):
    env = briefing.build()
    assert all(it["head"]["source"] != "checklist" for it in env["items"])


# --- G5b sparse single-day deviation is down-weighted and caveated -----------

def test_sparse_single_day_deviation_carries_caveat_and_low_trust(no_attr):
    dev = Signal("deviation", "ellel", date(2026, 5, 16), "up", "high", 6.22, {"actual": 2018.0})
    trust, sparse = briefing._baseline_trust(dev, [dev])
    assert sparse and trust == 0.5
    item = briefing._build_item([dev], date(2026, 5, 16), "L1", None)
    assert any("small-sample" in c for c in item.caveats)


# --- G5c a closed venue stays quiet post-closure -----------------------------

def test_closed_venue_emits_no_post_closure_deviation(store):
    con = warehouse.connect(read_only=True)
    try:
        sigs = briefing.collect("two_river_taps", con=con)
        aend = active_trading_end("two_river_taps", con=con).date()
    finally:
        con.close()
    assert all(s.onset_date < aend for s in sigs if s.source == "deviation")


# --- G6 novelty: new -> continuing -> resolved -------------------------------

def test_novelty_transitions_new_continuing_resolved(store, monkeypatch):
    con = warehouse.connect()
    try:
        con.execute("DROP TABLE IF EXISTS briefing_runs")
    finally:
        con.close()
    monkeypatch.setattr(briefing, "attribute", lambda *a, **k: ["coincides with a test signal"])
    dev = Signal("deviation", "beer_hall", date(2026, 5, 20), "down", "high", -3.0,
                 {"actual": 100.0, "date": "2026-05-20"})
    monkeypatch.setattr(briefing, "collect",
                        lambda venue, **k: [dev] if venue == "beer_hall" else [])

    env1 = briefing.run()                       # persists → all new
    assert env1["counts"]["new"] >= 1
    env2 = briefing.build()                      # same data → continuing
    assert env2["counts"]["new"] == 0 and env2["counts"]["continuing"] >= 1

    monkeypatch.setattr(briefing, "collect", lambda venue, **k: [])
    env3 = briefing.run()                        # signal gone → resolved once (writes marker)
    assert env3["counts"]["resolved"] >= 1


def test_cleared_story_is_not_re_resolved_on_the_next_empty_run(store, monkeypatch):
    con = warehouse.connect()
    try:
        con.execute("DROP TABLE IF EXISTS briefing_runs")
    finally:
        con.close()
    monkeypatch.setattr(briefing, "attribute", lambda *a, **k: ["coincides with a test signal"])
    dev = Signal("deviation", "beer_hall", date(2026, 5, 20), "down", "high", -3.0,
                 {"actual": 100.0, "date": "2026-05-20"})
    monkeypatch.setattr(briefing, "collect",
                        lambda venue, **k: [dev] if venue == "beer_hall" else [])
    briefing.run()                                       # persist the story
    monkeypatch.setattr(briefing, "collect", lambda venue, **k: [])
    assert briefing.run()["counts"]["resolved"] >= 1     # cleared → resolved once
    assert briefing.run()["counts"]["resolved"] == 0     # next empty run: not again


# --- G7 endpoint envelope ----------------------------------------------------

def test_endpoint_returns_envelope_and_never_500s(store):
    from fastapi.testclient import TestClient

    from service.app import app

    client = TestClient(app)
    r = client.get("/briefing?venue=all")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["items"], list) and "counts" in body
    assert client.get("/briefing?venue=no_such_venue").status_code == 200
