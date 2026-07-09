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
    """Rebuild line_items from the CSV and drop the append/refit/serving
    bookkeeping, so an append test starts from a clean ceiling (build() alone
    leaves the watermark). Clearing served_forecast matters from WP12 onward: a
    real promotion run persists it in the same on-disk brain.duckdb the test
    suite reads, and a leftover Rung-4 served model would trip the G12.4 guards
    for tests (like G6) that are not exercising those guards."""
    warehouse.build()
    con = warehouse.connect()
    try:
        con.execute("DROP TABLE IF EXISTS data_watermark")
        con.execute("DROP TABLE IF EXISTS ladder_selection")
        con.execute("DROP TABLE IF EXISTS served_forecast")
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


# --- G12.10c: Neon adapter wiring (inert until provisioned) ------------------

def test_neon_fetch_transactions_raises_while_inert():
    from ingest.sources.base import NotProvisionedError

    with pytest.raises(NotProvisionedError):
        NeonAdapter().fetch_transactions(since=None)


def test_neon_to_txn_schema_derives_config_columns_only():
    """The brain_txn -> TXN_COLUMNS mapping derives venue_label / net_sales_exvat /
    excluded from config, never fabricating transaction facts, and keeps only the
    known TXN_COLUMNS so a thinner Neon schema still appends cleanly."""
    from ingest.sources.base import TXN_COLUMNS, _to_txn_schema

    raw = pd.DataFrame({
        "transaction_id": ["t1"], "venue": ["two_river_taps"], "category": ["Draught"],
        "item": ["Lager"], "qty": [1.0], "net_sales": [12.0], "gross_sales": [12.0],
        "discounts": [0.0], "tax": [0.0],
        "ts": [pd.Timestamp("2026-06-15 20:00:00", tz="Europe/London")],
        "date": [date(2026, 6, 15)]})
    out = _to_txn_schema(raw)
    assert set(out.columns) <= set(TXN_COLUMNS)
    assert out.loc[0, "venue_label"] == config.VENUE_LABELS["two_river_taps"]
    # TRT is VAT-inclusive: net_sales_exvat = net_sales / 1.2.
    assert abs(out.loc[0, "net_sales_exvat"] - 10.0) < 1e-9
    assert bool(out.loc[0, "excluded"]) is False


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
    monkeypatch.setattr(refresh, "_auto_exog", lambda notes: (0, []))
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
    # Neutralise the G12.15d event-window path so this test isolates the
    # change-point trigger (the run date may itself sit inside a fixture window).
    monkeypatch.setattr(config, "EVENT_AWARE_REFRESH_ENABLED", False)
    _seed_refit("beer_hall", datetime(2025, 11, 1))               # before the BH onset
    should, reason = refresh._should_refit("beer_hall", "auto")
    assert should is True and "change-point" in reason


def test_event_window_tightens_cadence(store, monkeypatch):
    monkeypatch.setattr(config, "RETRAIN_ON_CHANGEPOINT", False)   # isolate cadence
    _seed_refit("beer_hall", datetime.now() - timedelta(days=3))   # 3d since last fit
    # Outside an event window the weekly cadence (7d) holds: 3d does not refit.
    monkeypatch.setattr(refresh, "_in_event_window", lambda *a, **k: (False, None))
    assert refresh._should_refit("beer_hall", "auto")[0] is False
    # Inside a flagged event window the cadence tightens to 2d, so 3d refits.
    monkeypatch.setattr(refresh, "_in_event_window", lambda *a, **k: (True, "test fixture"))
    should, reason = refresh._should_refit("beer_hall", "auto")
    assert should is True and "event-window" in reason


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
    _reset_store()   # no leftover served Rung-4 model to trip the G12.4 guard
    before = _count_selection("beer_hall")
    res = refresh._refit_ladder("beer_hall", "forced re-fit")
    assert res["new_rung"] is not None and res["new_mase"] is not None
    assert _count_selection("beer_hall") == before + 1


# --- G12.9b: per-fold MASE audit column --------------------------------------

def test_refit_records_per_fold_mase_so_a_single_fold_win_is_visible(store, monkeypatch):
    """The winner's per-fold MASE vector is surfaced in the audit row, not just
    its mean. A win concentrated in one fold must be visible in the row."""
    import json

    from models import ladder
    from models.ladder import RungResult

    _reset_store()
    single_fold_dominant = [0.20, 0.95, 0.95, 0.95, 0.95, 0.80]

    def _fake_rolling(venue, *, n_folds=6, horizon=7, with_prophet=False):
        results = [
            RungResult("rung0_seasonal_naive", 0,
                      metrics={"MASE": 1.0, "folds": 6, "per_fold_mase": [1.0] * 6}),
            RungResult("rung1_robust_dow", 1,
                      metrics={"MASE": 0.95, "folds": 6, "per_fold_mase": [0.95] * 6}),
            RungResult("rung4_chronos2_exo", 4,
                      metrics={"MASE": float(sum(single_fold_dominant) / 6), "folds": 6,
                              "per_fold_mase": single_fold_dominant}),
        ]
        return results, n_folds

    monkeypatch.setattr(ladder, "evaluate_rolling", _fake_rolling)
    refresh._refit_ladder("beer_hall", "test single-fold-dominant win")

    con = warehouse.connect(read_only=True)
    try:
        row = con.execute(
            "SELECT per_fold_mase, n_folds FROM ladder_selection WHERE venue='beer_hall' "
            "ORDER BY ts DESC LIMIT 1").fetchone()
    finally:
        con.close()
    stored = json.loads(row[0])
    assert stored == single_fold_dominant
    assert row[1] == 6
    # the audit row itself exposes that one fold, not the mean, drove the win.
    assert min(stored) < 0.5 * (sum(stored) / len(stored))


# --- G12.4 environment guards: a chronos-less venv never demotes a served
# Rung-4 model as a side effect -----------------------------------------------

def _seed_served(venue: str, model: str, layer: str = "L1") -> None:
    con = warehouse.connect()
    try:
        refresh._ensure_tables(con)
        con.execute("DELETE FROM served_forecast WHERE venue=? AND layer=?", [venue, layer])
        con.execute(
            "INSERT INTO served_forecast (venue, layer, model, data_as_of, promoted_ts) "
            "VALUES (?, ?, ?, CURRENT_DATE, now())", [venue, layer, model])
    finally:
        con.close()


def test_is_rung4_matches_any_rung4_entrant():
    assert refresh._is_rung4("rung4_chronos2_exo")
    assert refresh._is_rung4("rung4_chronos_bolt")
    assert not refresh._is_rung4("rung2_ets")
    assert not refresh._is_rung4(None)


def test_refit_guard_skips_loudly_with_no_audit_row_when_backend_absent(store, monkeypatch):
    _reset_store()
    _seed_served("beer_hall", "rung4_chronos2_exo")
    monkeypatch.setattr("models.foundation.HAS_CHRONOS", False)
    before = _count_selection("beer_hall")
    res = refresh._refit_ladder("beer_hall", "forced re-fit")
    assert res["skipped"] == "backend absent"
    assert "rung4_chronos2_exo" in res["note"] and ".venv-forecast" in res["note"]
    assert _count_selection("beer_hall") == before   # no audit row written


def test_promotion_guard_skips_and_leaves_band_untouched_when_backend_absent(store, monkeypatch):
    _reset_store()
    _seed_served("beer_hall", "rung4_chronos2_exo")
    monkeypatch.setattr("models.foundation.HAS_CHRONOS", False)
    result = refresh._promote_and_serve("beer_hall", adopted_model="rung4_chronos2_exo")
    assert result["skipped"] == "backend absent"
    con = warehouse.connect(read_only=True)
    try:
        served, _ = refresh._served("beer_hall", con)
    finally:
        con.close()
    assert served == "rung4_chronos2_exo"   # untouched, not silently swapped


def test_operator_approved_fallback_writes_audited_selection_row(store, monkeypatch):
    _reset_store()
    _seed_served("beer_hall", "rung4_chronos2_exo")
    monkeypatch.setattr("models.foundation.HAS_CHRONOS", False)
    before = _count_selection("beer_hall")
    result = refresh._promote_and_serve(
        "beer_hall", adopted_model="rung4_chronos2_exo", allow_fallback=True)
    assert result["model"] == "rung2_ets"
    assert _count_selection("beer_hall") == before + 1
    con = warehouse.connect(read_only=True)
    try:
        reason = con.execute(
            "SELECT reason FROM ladder_selection WHERE venue='beer_hall' "
            "ORDER BY ts DESC LIMIT 1").fetchone()[0]
        served, _ = refresh._served("beer_hall", con)
    finally:
        con.close()
    assert "operator-approved fallback to rung2_ets" in reason
    assert served == "rung2_ets"


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
