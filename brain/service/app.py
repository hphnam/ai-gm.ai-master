"""A10 · FastAPI service — exposes the brain to Track B (the AI-GM agent).

A localhost service reading from the DuckDB store and the signal modules.
Endpoints (typed JSON):

    GET  /health                health + store status
    GET  /forecast              point + calibrated band per date (A5/A6)
    POST /deviation/check       per-day band check on the residual stream (point primitive)
    POST /deviation/scan        last N trading days, classified (briefing feed)
    POST /deviation/changepoint sustained regime shifts + attribution (A13)
    GET  /sop-gaps              ranked KB-gap clusters + failure rate (A8)
    POST /checklist/discipline  expected vs actual, weighted misses (A9)
    GET  /stock/cover           days-of-cover reorder lines per venue (A12)
    GET  /briefing              ranked, de-duplicated, attributed daily feed (capstone)
    GET  /freshness             per-venue currency (source, staleness, last re-fit)
    POST /refresh               operator/cron T2 refresh (+ conditional T3)

Run:
    uvicorn service.app:app --port 8088     # http://127.0.0.1:8088/docs
"""

from __future__ import annotations

from datetime import date
from functools import lru_cache

import duckdb
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from config import (
    DEV_SCAN_WINDOW,
    DUCKDB_PATH,
    EVENT_ONLY_VENUES,
    VENUES_FOR_CHANGEPOINT,
    VENUES_WITH_STOCK,
)
from signals.checklist_discipline import evaluate as checklist_evaluate
from signals.checklist_discipline import expected_mandatory, parse_checklists
from store import warehouse


def _f(v) -> float | None:
    """Pandas/NumPy scalar → JSON float, or None for NULL/NaN."""
    return None if v is None or pd.isna(v) else float(v)


def _b(v) -> bool | None:
    return None if v is None or pd.isna(v) else bool(v)

app = FastAPI(
    title="Proactive Brain",
    version="0.1.0",
    description="PRJ93 Phase-2 forecasting & signals engine (Track A).",
)


# --- Models ------------------------------------------------------------------

class DeviationRequest(BaseModel):
    venue: str = "beer_hall"
    layer: str = "L1"
    as_of: date | None = Field(
        default=None, description="Trading day to check; omit for the latest.")
    freshness: str = Field("cached", pattern="^(cached|live)$")


class DeviationScanRequest(BaseModel):
    venue: str = "beer_hall"
    layer: str = "L1"
    window: int = Field(DEV_SCAN_WINDOW, ge=1, le=90)


class ChecklistRequest(BaseModel):
    checklist: str = Field("closing", pattern="^(opening|closing)$")
    completed: list[int]
    dow: int = Field(..., ge=0, le=6, description="Mon=0 … Sun=6")
    completion_minutes: int | None = None


class ChangePointRequest(BaseModel):
    venue: str = "beer_hall"
    layer: str = "L1"
    level: float = 0.90


# --- Cached, read-only resources --------------------------------------------

@lru_cache(maxsize=1)
def _checklists():
    return parse_checklists()


@lru_cache(maxsize=1)
def _sop_gaps_cached():
    from signals.chatlog_kb_gap import load_turns, rank_gaps

    turns, stats = load_turns()
    ranked, backend = rank_gaps(turns)
    gaps = ranked[ranked["is_gap"]].head(8)
    return {
        "failure_rate": round(stats["failure_rate"], 4),
        "rolling7_max": round(stats["rolling7_max"], 4),
        "active_days": stats["active_days"],
        "channels": stats["channels"],
        "embedding_backend": backend,
        "gaps": [
            {"size": int(r["size"]), "failed": int(r["n_failed"]),
             "failure_density": float(r["failure_density"]),
             "score": float(r["score"]), "venue_tags": r["venue_tags"],
             "examples": r["examples"]}
            for _, r in gaps.iterrows()
        ],
    }


def _read_only() -> duckdb.DuckDBPyConnection:
    if not DUCKDB_PATH.exists():
        raise HTTPException(503, "store not built — run `python -m store.warehouse --build`")
    return warehouse.connect(read_only=True)


# --- Endpoints ---------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    built = DUCKDB_PATH.exists()
    last_trained = None
    n_forecasts = 0
    if built:
        con = warehouse.connect(read_only=True)
        try:
            row = con.execute(
                "SELECT COUNT(*), MAX(created_at) FROM forecasts").fetchone()
            n_forecasts = int(row[0])
            last_trained = str(row[1]) if row[1] is not None else None
        finally:
            con.close()
    return {"status": "ok" if built else "store_missing",
            "store_built": built, "n_forecasts": n_forecasts,
            "last_trained": last_trained}


@app.get("/forecast")
def forecast(
    venue: str = "beer_hall",
    layer: str = "L1",
    level: float = 0.90,
    date_from: date | None = None,
    date_to: date | None = None,
    key: str | None = Query(None, description="category (L2) or item (L3)"),
    freshness: str = "cached",
) -> dict:
    _live_topup(venue, freshness)
    con = _read_only()
    try:
        df = warehouse.read_band(venue, layer, level=level, con=con)
    finally:
        con.close()
    if key is not None and not df.empty and "key" in df:
        df = df[df["key"] == key]
    if df.empty:
        # join helper does not surface key; fall back to a manual query for L2/L3
        df = _read_band_with_key(venue, layer, level, key)
    rows = []
    for _, r in df.iterrows():
        d = r["date"]
        d_date = d.date() if hasattr(d, "date") else d
        if date_from and d_date < date_from:
            continue
        if date_to and d_date > date_to:
            continue
        rows.append({"date": str(d)[:10], "yhat": round(float(r["yhat"]), 2),
                     "lo": round(float(r["lo"]), 2), "hi": round(float(r["hi"]), 2),
                     "level": float(r["level"]), "model": r["model"]})
    return {"venue": venue, "layer": layer, "level": level, "key": key,
            "n": len(rows), "forecast": rows, "freshness": _freshness_for(venue)}


def _read_band_with_key(venue, layer, level, key):
    con = warehouse.connect(read_only=True)
    try:
        sql = (
            "SELECT f.target_date AS date, f.key, f.yhat, b.level, b.lo, b.hi, f.model "
            "FROM forecasts f JOIN bands b ON f.venue=b.venue AND f.layer=b.layer "
            "AND f.key IS NOT DISTINCT FROM b.key AND f.target_date=b.target_date "
            "AND f.model=b.model "
            "WHERE f.venue=? AND f.layer=? AND b.level=?"
        )
        params = [venue, layer, level]
        if key is not None:
            sql += " AND f.key=?"
            params.append(key)
        sql += " ORDER BY f.target_date"
        return con.execute(sql, params).df()
    finally:
        con.close()


@app.post("/deviation/check")
def deviation_check(req: DeviationRequest) -> dict:
    """Per-day point primitive: is one trading day outside its 90% conformal band
    on the shared residual stream (`z = (actual − DOW-median) / half-band`)? Returns
    the classified day, or a `found=false` envelope (200, never an error) when the
    requested day is not a trading day in the stream (closed / non-trading / beyond
    data / too little history)."""
    # NOTE: function-local import — defers the heavy pandas/signal graph off module
    # load (same lazy pattern as the sop-gaps handler).
    from signals.deviation import check_point

    _live_topup(req.venue, req.freshness)
    con = _read_only()
    try:
        result = check_point(req.venue, layer=req.layer, as_of=req.as_of, con=con)
        block = _freshness_block(req.venue, con)
    finally:
        con.close()
    if result is None:
        return {"venue": req.venue, "layer": req.layer,
                "as_of": req.as_of.isoformat() if req.as_of else None,
                "found": False, "status": "no_data",
                "note": f"no trading-day band to check for '{req.venue}'"
                        + (f" on {req.as_of.isoformat()}" if req.as_of else ""),
                "freshness": block}
    return {"found": True, **result, "freshness": block}


@app.post("/deviation/scan")
def deviation_scan(req: DeviationScanRequest) -> dict:
    """The daily-briefing feed: the last `window` trading days, each classified
    normal/deviation. A run of deviations here is what change-point escalates."""
    from signals.deviation import scan as scan_days

    con = _read_only()
    try:
        df = scan_days(req.venue, layer=req.layer, window=req.window, con=con)
    finally:
        con.close()
    days = [
        {"date": str(r["date"])[:10], "actual": _f(r["actual"]),
         "expected": _f(r["expected"]), "z": _f(r["z"]), "status": r["status"],
         "direction": r["direction"], "severity": r["severity"]}
        for _, r in df.iterrows()
    ]
    return {"venue": req.venue, "layer": req.layer, "window": req.window,
            "n": len(days), "days": days, "freshness": _freshness_for(req.venue)}


@app.get("/sop-gaps")
def sop_gaps() -> dict:
    return _sop_gaps_cached()


@app.get("/stock/cover")
def stock_cover(venue: str = "beer_hall") -> dict:
    """A12 days-of-cover reorder lines, reorder-flagged first. Venues without
    stock sheets return an explicit empty envelope (200), never an error."""
    con = _read_only()
    try:
        has_table = con.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name='stock_cover'"
        ).fetchone()
        if venue not in VENUES_WITH_STOCK or not has_table:
            return {"venue": venue, "as_of": None, "n": 0, "n_reorder": 0,
                    "lines": [], "note": f"no stock data for venue '{venue}'",
                    "freshness": _freshness_block(venue, con)}
        df = con.execute(
            "SELECT * FROM stock_cover WHERE venue = ? "
            "ORDER BY reorder_flag DESC NULLS LAST, days_of_cover ASC NULLS LAST",
            [venue],
        ).df()
        block = _freshness_block(venue, con)
    finally:
        con.close()
    lines = []
    for _, r in df.iterrows():
        lines.append({
            "product": r["product_canon"], "l1": r["l1"],
            "on_hand_kegs": _f(r["on_hand_kegs"]),
            "on_hand_pints": _f(r["on_hand_pints"]),
            "forecast_daily_pints": _f(r["forecast_daily_pints"]),
            "days_of_cover": _f(r["days_of_cover"]),
            "reorder": _b(r["reorder_flag"]),
            "suggested_order_kegs": _f(r["suggested_order_kegs"]),
            "a6_node": r["a6_node"] if pd.notna(r["a6_node"]) else None,
        })
    as_of = str(df["as_of"].iloc[0])[:10] if not df.empty else None
    n_reorder = int(df["reorder_flag"].fillna(False).sum()) if not df.empty else 0
    return {"venue": venue, "as_of": as_of, "n": len(lines),
            "n_reorder": n_reorder, "lines": lines, "freshness": block}


@app.post("/deviation/changepoint")
def deviation_changepoint(req: ChangePointRequest) -> dict:
    """A13 sustained regime-shift detection (complements the per-day
    /deviation/check). Excluded / short-history venues return a 200 envelope."""
    import json as _json

    eligible = req.venue in VENUES_FOR_CHANGEPOINT or req.venue in EVENT_ONLY_VENUES
    con = _read_only()
    try:
        has_table = con.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name='change_points'"
        ).fetchone()
        if not eligible or not has_table:
            return {"venue": req.venue, "layer": req.layer, "n_change_points": 0,
                    "change_points": [], "stable": True,
                    "note": f"change-point detection not run for venue '{req.venue}'",
                    "freshness": _freshness_block(req.venue, con)}
        df = con.execute(
            "SELECT * FROM change_points WHERE venue=? AND layer=? "
            "ORDER BY severity='high' DESC, onset_date DESC", [req.venue, req.layer]).df()
        block = _freshness_block(req.venue, con)
    finally:
        con.close()
    cps = []
    for _, r in df.iterrows():
        cps.append({
            "onset_date": str(r["onset_date"])[:10],
            "detected_date": str(r["detected_date"])[:10],
            "detection_delay_days": _f(r["detection_delay_days"]),
            "direction": r["direction"],
            "magnitude_band_units": _f(r["magnitude_band_units"]),
            "magnitude_pct": _f(r["magnitude_pct"]),
            "detector": r["detector"], "severity": r["severity"],
            "recalibration_needed": _b(r["recalibration_needed"]),
            "attribution": _json.loads(r["attribution"]) if r["attribution"] else [],
            "note": r["note"] if pd.notna(r["note"]) else None,
        })
    return {"venue": req.venue, "layer": req.layer, "n_change_points": len(cps),
            "change_points": cps, "stable": len(cps) == 0, "freshness": block}


@app.post("/checklist/discipline")
def checklist_discipline(req: ChecklistRequest) -> dict:
    checklists = _checklists()
    steps = checklists[req.checklist]
    res = checklist_evaluate(steps, set(req.completed), req.dow,
                             completion_minutes=req.completion_minutes)
    res["checklist"] = req.checklist
    res["n_expected_mandatory"] = len(expected_mandatory(steps, req.dow == 6))
    return res


@app.get("/briefing")
def briefing(venue: str = "all", as_of: date | None = None, layer: str = "L1",
             freshness: str = "cached") -> dict:
    """The proactive-briefing capstone: the four signals composed into one ranked,
    de-duplicated, attributed daily feed with new/continuing/resolved status. A
    quiet day returns `items: []` at 200; a closed / unknown venue never 500s.
    Read-only — the daily `run()` (CLI/cron) is what persists `briefing_runs`.
    `freshness=live` does a capped T2 top-up first (never a T3 re-fit)."""
    # NOTE: function-local import defers the signal graph off module load.
    from signals.briefing import build

    _live_topup(venue, freshness)
    con = _read_only()
    try:
        venues = None if venue == "all" else [venue]
        env = build(as_of=as_of, venues=venues, layer=layer, con=con)
        env["freshness"] = _estate_freshness_block(env.get("venues") or venues or [], con)
        return env
    finally:
        con.close()


# --- Freshness / live-ingest surface (three-tier model) ----------------------

def _freshness_block(venue: str, con) -> dict:
    """The compact currency block stamped onto every serving envelope, so no answer
    is returned without stating its own freshness. A stale answer says so."""
    from ingest.refresh import freshness as _freshness

    f = _freshness(venue, con)
    return {"source": f["source"], "is_live": f["is_live"],
            "stale": f["stale"], "staleness_days": f["staleness_days"],
            "served_model": f["served_model"], "served_as_of": f["served_as_of"]}


def _freshness_for(venue: str) -> dict:
    con = _read_only()
    try:
        return _freshness_block(venue, con)
    finally:
        con.close()


def _estate_freshness_block(venues, con) -> dict:
    blocks = [_freshness_block(v, con) for v in venues] or [_freshness_block("beer_hall", con)]
    models = {b["served_model"] for b in blocks}
    served_dates = [b["served_as_of"] for b in blocks if b["served_as_of"]]
    return {"source": blocks[0]["source"],
            "is_live": any(b["is_live"] for b in blocks),
            "stale": any(b["stale"] for b in blocks),
            "staleness_days": max(b["staleness_days"] for b in blocks),
            # One served model across the estate, or None when venues differ; the
            # oldest served date is the conservative estate-wide currency.
            "served_model": next(iter(models)) if len(models) == 1 else None,
            "served_as_of": min(served_dates) if served_dates else None}


def _live_topup(venue: str, freshness: str) -> None:
    """`freshness=live` → a capped T2 top-up (append closed days since the
    watermark), NEVER a T3 re-fit (D1). Inert and a no-op while INGEST_SOURCE=csv
    sits at the ceiling. Never fails the read: a swallowed top-up failure cannot
    stamp a false 'fresh' answer, because the freshness block is computed AFTER this
    from the store's actual watermark, so it still reports the true staleness."""
    if freshness != "live" or venue == "all":
        return
    try:
        from ingest.refresh import refresh as _refresh
        _refresh(venue, refit="never")
    except Exception:  # pragma: no cover - a top-up must never break the answer
        pass


@app.get("/freshness")
def get_freshness(venue: str = "all") -> dict:
    """Per-venue currency: as-of, source, is_live, stale, staleness, last re-fit,
    incumbent rung, and the currently-served model + its data date (served_model /
    served_as_of). Read-only; reports, never triggers work."""
    from config import FORECAST_VENUES
    from ingest.refresh import freshness as _freshness

    con = _read_only()
    try:
        venues = list(FORECAST_VENUES) if venue == "all" else [venue]
        return {"venues": [_freshness(v, con) for v in venues]}
    finally:
        con.close()


class RefreshRequest(BaseModel):
    venue: str | None = None
    force: bool = False
    refit: str = Field("auto", pattern="^(auto|force|never)$")


@app.post("/refresh")
def post_refresh(req: RefreshRequest) -> dict:
    """Operator / cron entry: run T2 refresh (+ conditional T3). Not on the model
    surface — the agent gets read-only freshness, never a way to trigger a re-fit."""
    from ingest.refresh import refresh as _refresh

    return _refresh(req.venue, force=req.force, refit=req.refit)
