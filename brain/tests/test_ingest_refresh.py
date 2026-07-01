"""T2/T3 ingest-refresh tests (PRJ93 live-ingest spec, G0–G6 / G-live-b/c/d).

The default CSV path is a genuine no-op (idempotent); a `FakeAdapter` supplies a
synthetic future closed day to exercise the append + watermark + T3-guard paths
without a live source. The expensive re-fit runs only when forced.
"""

from __future__ import annotations

import ast
import inspect
from datetime import date, datetime, timedelta

import pandas as pd
import pytest

import config
from ingest import refresh
from ingest.sources import CsvAdapter, NeonAdapter, SourceAdapter, get_adapter
from store import warehouse


@pytest.fixture(scope="module")
def store():
    _reset_store()


def _imported(module) -> set[str]:
    mods: set[str] = set()
    for node in ast.walk(ast.parse(inspect.getsource(module))):
        if isinstance(node, ast.ImportFrom) and node.module:
            mods.add(node.module)
        elif isinstance(node, ast.Import):
            mods.update(a.name for a in node.names)
    return mods


class FakeAdapter(SourceAdapter):
    """Returns one synthetic closed day beyond the store ceiling."""

    name = "fake"
    is_live = False

    def __init__(self, rows: pd.DataFrame):
        self._rows = rows

    def latest_available_date(self):
        return None if self._rows.empty else max(self._rows["date"])

    def fetch_transactions(self, since):
        df = self._rows
        return df[df["date"] > since] if since is not None else df

    def fetch_stock(self, since):
        return pd.DataFrame()


def _reset_store() -> None:
    """Rebuild line_items from the CSV and drop the append/refit bookkeeping, so an
    append test starts from a clean ceiling (build() alone leaves the watermark)."""
    warehouse.build()
    con = warehouse.connect()
    try:
        con.execute("DROP TABLE IF EXISTS data_watermark")
        con.execute("DROP TABLE IF EXISTS ladder_selection")
    finally:
        con.close()


def _synthetic_next_day(venue="beer_hall") -> pd.DataFrame:
    con = warehouse.connect(read_only=True)
    try:
        row = con.execute(
            "SELECT * FROM line_items WHERE venue=? ORDER BY date DESC LIMIT 1", [venue]).df()
    finally:
        con.close()
    row = row.copy()
    row["date"] = pd.to_datetime(row["date"]).dt.date
    new_day = max(row["date"]) + timedelta(days=1)
    row["date"] = new_day
    row["transaction_id"] = "synthetic-live-1"
    return row


# --- G0 dependency direction -------------------------------------------------

def test_refresh_composes_the_pipeline_one_way():
    mods = _imported(refresh)
    assert "ingest.sources" in mods and "store.warehouse" in mods


def test_no_module_imports_refresh_back():
    from signals import change_point
    from store import warehouse as wh
    assert "ingest.refresh" not in _imported(change_point)
    assert "ingest.refresh" not in _imported(wh)


# --- G1 adapter seam ---------------------------------------------------------

def test_default_adapter_is_csv():
    assert get_adapter().name == "csv" and isinstance(get_adapter(), CsvAdapter)


def test_live_adapters_inert_while_off():
    # LIVE_INGEST is False by default → neon reports no data, never raises.
    assert NeonAdapter().latest_available_date() is None


# --- G2 watermark: fresh store is not falsely stale --------------------------

def test_fresh_store_reports_current_not_stale(store):
    con = warehouse.connect(read_only=True)
    try:
        f = refresh.freshness("beer_hall", con)
    finally:
        con.close()
    assert f["source"] == "csv" and f["stale"] is False and f["staleness_days"] == 0


# --- G3 T2 append + idempotence ----------------------------------------------

def test_append_new_closed_day_then_idempotent(store, monkeypatch):
    _reset_store()                                       # clean ceiling
    fake = FakeAdapter(_synthetic_next_day())
    monkeypatch.setattr(refresh, "get_adapter", lambda *a, **k: fake)
    monkeypatch.setattr(refresh, "_auto_exog", lambda notes: 0)
    monkeypatch.setattr(refresh, "_rebuild_features", lambda venue, notes: True)
    try:
        first = refresh.refresh("beer_hall", refit="never")["venues"]["beer_hall"]
        again = refresh.refresh("beer_hall", refit="never")["venues"]["beer_hall"]
        assert first["rows_added"] == 1 and again["rows_added"] == 0   # idempotent
    finally:
        _reset_store()                                   # restore the store


# --- G4 auto-exog honesty note -----------------------------------------------

def test_append_records_auto_exog_note(store, monkeypatch):
    _reset_store()
    fake = FakeAdapter(_synthetic_next_day())
    monkeypatch.setattr(refresh, "get_adapter", lambda *a, **k: fake)
    monkeypatch.setattr("ingest.exog_weather.build", lambda force=False: {"rows": 3})
    monkeypatch.setattr(refresh, "_rebuild_features", lambda venue, notes: True)
    try:
        s = refresh.refresh("beer_hall", refit="never")["venues"]["beer_hall"]
        assert any("auto-exog" in n for n in s["notes"])
    finally:
        _reset_store()


# --- G5 / G-live-d: the T3 cost guarantee ------------------------------------

def test_single_new_day_does_not_trigger_t3(store):
    con = warehouse.connect()
    try:
        con.execute("DROP TABLE IF EXISTS ladder_selection")
    finally:
        con.close()
    should, _ = refresh._should_refit("beer_hall", "auto")
    assert should is False


def test_never_refit_is_honoured():
    assert refresh._should_refit("beer_hall", "never")[0] is False


def test_cadence_boundary_fires_auto_refit(store, monkeypatch):
    monkeypatch.setattr(config, "RETRAIN_ON_CHANGEPOINT", False)   # isolate cadence
    _seed_refit("beer_hall", datetime.now() - timedelta(days=30))
    assert refresh._should_refit("beer_hall", "auto")[0] is True


def test_changepoint_fires_auto_refit(store, monkeypatch):
    monkeypatch.setattr(config, "RETRAIN_CADENCE_DAYS", 100_000)   # isolate change-point
    _seed_refit("beer_hall", datetime(2025, 11, 1))               # before the BH onset
    should, reason = refresh._should_refit("beer_hall", "auto")
    assert should is True and "change-point" in reason


# --- G8 serving surface: /freshness + /refresh + freshness block -------------

def test_freshness_and_refresh_endpoints(store):
    from fastapi.testclient import TestClient

    from service.app import app

    client = TestClient(app)
    fr = client.get("/freshness?venue=all")
    assert fr.status_code == 200 and len(fr.json()["venues"]) == 3
    rf = client.post("/refresh", json={"venue": "beer_hall", "refit": "never"})
    assert rf.status_code == 200 and rf.json()["venues"]["beer_hall"]["refit"] is False
    # every serving envelope carries its own currency
    assert "freshness" in client.get("/forecast?venue=beer_hall").json()


# --- G6 beat-the-rung: forced re-fit writes a ladder_selection audit row ------

def test_forced_refit_selects_rung_and_logs_selection(store):
    before = _count_selection("beer_hall")
    res = refresh._refit_ladder("beer_hall", "forced re-fit")
    assert res["new_rung"] is not None and res["new_mase"] is not None
    assert _count_selection("beer_hall") == before + 1


def _count_selection(venue: str) -> int:
    con = warehouse.connect(read_only=True)
    try:
        if not refresh._has_table(con, "ladder_selection"):
            return 0
        return con.execute(
            "SELECT COUNT(*) FROM ladder_selection WHERE venue=?", [venue]).fetchone()[0]
    finally:
        con.close()


def _seed_refit(venue: str, ts: datetime) -> None:
    con = warehouse.connect()
    try:
        refresh._ensure_tables(con)
        con.execute("DELETE FROM ladder_selection WHERE venue=?", [venue])
        con.execute(
            "INSERT INTO ladder_selection (venue, layer, old_rung, new_rung, old_mase, "
            "new_mase, adopted, reason, ts) VALUES (?, 'L1', 1, 2, 1.0, 0.8, TRUE, 'seed', ?)",
            [venue, ts])
    finally:
        con.close()
