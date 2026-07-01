"""Promote-and-serve tests (PRJ93 live-ingest v2.1 addendum, GP0–GP7 / G-promote-a..e).

Promotion regenerates the SERVED forecast (not just the signal layer): after new
closed days land or a T3 adopts a rung, `_promote_and_serve` re-persists L1
`forecasts`/`bands` and the Beer Hall keg forecast, then records `served_forecast`.
The heavy persists (`wrap.evaluate`, `reconcile`) are stubbed for the wiring and
model-resolution tests, and run for real once end-to-end to prove `/forecast`
actually advances and the closed-venue standby band is preserved.
"""

from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
import pytest

import config
from ingest import refresh
from ingest.sources import SourceAdapter
from store import warehouse


# --- Fixtures / helpers ------------------------------------------------------

def _reset() -> None:
    """Rebuild line_items from the CSV and drop the append/refit/serve bookkeeping,
    so each test starts from a clean ceiling with nothing promoted yet."""
    warehouse.build()
    con = warehouse.connect()
    try:
        con.execute("DROP TABLE IF EXISTS data_watermark")
        con.execute("DROP TABLE IF EXISTS ladder_selection")
        con.execute("DROP TABLE IF EXISTS served_forecast")
    finally:
        con.close()


class _FakeAdapter(SourceAdapter):
    """One synthetic closed day beyond the store ceiling (drives an append)."""

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


def _synthetic_next_day(venue="beer_hall") -> pd.DataFrame:
    con = warehouse.connect(read_only=True)
    try:
        row = con.execute(
            "SELECT * FROM line_items WHERE venue=? ORDER BY date DESC LIMIT 1", [venue]).df()
    finally:
        con.close()
    row = row.copy()
    row["date"] = pd.to_datetime(row["date"]).dt.date
    row["date"] = max(row["date"]) + timedelta(days=1)
    row["transaction_id"] = "synthetic-promote-1"
    return row


def _stub_heavy(monkeypatch) -> dict:
    """Replace the two expensive persists with spies capturing their model/venue, so
    the wiring and resolution can be checked without running a real backtest."""
    seen: dict = {}
    monkeypatch.setattr("conformal.wrap.evaluate",
                        lambda venue, model_name="rung2_ets", **k: seen.__setitem__("model", model_name))
    monkeypatch.setattr("hierarchy.reconcile.reconcile",
                        lambda venue, *a, **k: seen.__setitem__("reconciled", venue))
    return seen


# --- GP2 trigger wiring (G-promote-c) ----------------------------------------

def test_new_data_triggers_promote(monkeypatch):
    _reset()
    calls: list[str] = []
    monkeypatch.setattr(refresh, "_promote_and_serve",
                        lambda venue, **k: calls.append(venue) or {"model": "rung2_ets", "data_as_of": None})
    monkeypatch.setattr(refresh, "get_adapter", lambda *a, **k: _FakeAdapter(_synthetic_next_day()))
    monkeypatch.setattr(refresh, "_auto_exog", lambda notes: 0)
    monkeypatch.setattr(refresh, "_rebuild_features", lambda venue, notes: True)
    try:
        refresh.refresh("beer_hall", refit="never")
        assert calls == ["beer_hall"]
    finally:
        _reset()


def test_quiet_refresh_does_not_promote(monkeypatch):
    _reset()
    calls: list[str] = []
    monkeypatch.setattr(refresh, "_promote_and_serve", lambda venue, **k: calls.append(venue))
    try:
        s = refresh.refresh("beer_hall", refit="never")["venues"]["beer_hall"]
        assert not calls and s["promote"] is None
    finally:
        _reset()


def test_force_refresh_always_promotes(monkeypatch):
    _reset()
    calls: list[str] = []
    monkeypatch.setattr(refresh, "_promote_and_serve",
                        lambda venue, **k: calls.append(venue) or {"model": "rung2_ets", "data_as_of": None})
    try:
        refresh.refresh("beer_hall", force=True, refit="never")
        assert calls == ["beer_hall"]
    finally:
        _reset()


def test_adoption_promotes_the_adopted_rung(monkeypatch):
    _reset()
    passed: list[str | None] = []
    monkeypatch.setattr(refresh, "_should_refit", lambda venue, refit: (True, "forced re-fit"))
    monkeypatch.setattr(refresh, "_refit_ladder",
                        lambda venue, reason, **k: {"adopted": True, "winner": "rung3_gbm"})
    monkeypatch.setattr(refresh, "_promote_and_serve",
                        lambda venue, **k: passed.append(k.get("adopted_model")) or {"model": "rung3_gbm", "data_as_of": None})
    try:
        refresh.refresh("beer_hall", refit="force")
        assert passed == ["rung3_gbm"]
    finally:
        _reset()


# --- GP1 model resolution ----------------------------------------------------

def test_resolution_prefers_adopted_model(monkeypatch):
    _reset()
    seen = _stub_heavy(monkeypatch)
    try:
        out = refresh._promote_and_serve("beer_hall", adopted_model="rung3_gbm")
        assert seen["model"] == "rung3_gbm" and out["model"] == "rung3_gbm"
    finally:
        _reset()


def test_resolution_falls_back_to_incumbent(monkeypatch):
    _reset()
    seen = _stub_heavy(monkeypatch)
    con = warehouse.connect()
    try:
        refresh._ensure_tables(con)
        con.execute("INSERT INTO served_forecast (venue, layer, model, data_as_of, promoted_ts) "
                    "VALUES ('beer_hall', 'L1', 'rung3_gbm', NULL, now())")
    finally:
        con.close()
    try:
        refresh._promote_and_serve("beer_hall")
        assert seen["model"] == "rung3_gbm"
    finally:
        _reset()


def test_resolution_defaults_to_venue_default(monkeypatch):
    _reset()
    seen = _stub_heavy(monkeypatch)
    try:
        refresh._promote_and_serve("beer_hall")
        assert seen["model"] == "rung2_ets"
    finally:
        _reset()


def test_capped_venue_default_is_rung1(monkeypatch):
    _reset()
    seen = _stub_heavy(monkeypatch)
    try:
        refresh._promote_and_serve("ellel")
        assert seen["model"] == "rung1_robust_dow"
    finally:
        _reset()


# --- GP5 reconcile only for the stock venue ----------------------------------

def test_stock_venue_reconciles(monkeypatch):
    _reset()
    seen = _stub_heavy(monkeypatch)
    try:
        out = refresh._promote_and_serve("beer_hall")
        assert out["reconciled"] is True and seen.get("reconciled") == "beer_hall"
    finally:
        _reset()


def test_non_stock_venue_skips_reconcile(monkeypatch):
    _reset()
    seen = _stub_heavy(monkeypatch)
    try:
        out = refresh._promote_and_serve("two_river_taps")
        assert out["reconciled"] is False and "reconciled" not in seen
    finally:
        _reset()


# --- GP6 served_forecast marker + freshness surfacing ------------------------

def test_served_forecast_records_model_and_watermark(monkeypatch):
    _reset()
    _stub_heavy(monkeypatch)
    con = warehouse.connect()
    try:
        refresh._ensure_tables(con)
        refresh._advance_watermark(con, "beer_hall", "L1", date(2026, 5, 31), "csv", 1)
    finally:
        con.close()
    try:
        refresh._promote_and_serve("beer_hall", adopted_model="rung2_ets")
        con = warehouse.connect(read_only=True)
        try:
            model, as_of = refresh._served("beer_hall", con)
        finally:
            con.close()
        assert model == "rung2_ets" and str(as_of) == "2026-05-31"
    finally:
        _reset()


def test_freshness_surfaces_served_model(monkeypatch):
    _reset()
    _stub_heavy(monkeypatch)
    try:
        refresh._promote_and_serve("beer_hall", adopted_model="rung2_ets")
        con = warehouse.connect(read_only=True)
        try:
            f = refresh.freshness("beer_hall", con)
        finally:
            con.close()
        assert f["served_model"] == "rung2_ets"
    finally:
        _reset()


# --- GP3/GP4/GP5 end-to-end (real persists) ----------------------------------

def test_promote_end_to_end_advances_served_forecast():
    _reset()
    try:
        out = refresh._promote_and_serve("beer_hall")     # real wrap.evaluate + reconcile
        con = warehouse.connect(read_only=True)
        try:
            model, _ = refresh._served("beer_hall", con)
            n = con.execute(
                "SELECT COUNT(*) FROM forecasts WHERE venue='beer_hall' AND layer='L1' "
                "AND model='conformal_rung2_ets'").fetchone()[0]
        finally:
            con.close()
        assert model == "rung2_ets" and n > 0 and out["reconciled"] is True
    finally:
        _reset()


def test_closed_venue_keeps_standby_band_after_promote():
    _reset()
    from store.active_span import active_trading_end, is_closed
    if not is_closed("two_river_taps"):
        pytest.skip("Two River Taps is not closed in this dataset")
    try:
        refresh._promote_and_serve("two_river_taps")      # real wrap.evaluate (standby path)
        end = active_trading_end("two_river_taps").date()
        con = warehouse.connect(read_only=True)
        try:
            n = con.execute(
                "SELECT COUNT(*) FROM forecasts WHERE venue='two_river_taps' AND layer='L1' "
                "AND target_date > ?", [end]).fetchone()[0]
        finally:
            con.close()
        assert n > 0
    finally:
        _reset()
