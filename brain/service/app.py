"""A10 · FastAPI service — exposes the brain to Track B (the AI-GM agent).

A localhost service reading from the DuckDB store and the signal modules.
Endpoints (typed JSON):

    GET  /health                health + store status
    GET  /forecast              point + calibrated band per date (A5/A6)
    POST /deviation/check       band breaches + severity (the §6 breach rule)
    POST /deviation/changepoint sustained regime shifts + attribution (A13)
    GET  /sop-gaps              ranked KB-gap clusters + failure rate (A8)
    POST /checklist/discipline  expected vs actual, weighted misses (A9)
    GET  /stock/cover           days-of-cover reorder lines per venue (A12)

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

from config import DUCKDB_PATH, EVENT_ONLY_VENUES, VENUES_FOR_CHANGEPOINT, VENUES_WITH_STOCK
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

class Observation(BaseModel):
    date: date
    value: float


class DeviationRequest(BaseModel):
    venue: str = "beer_hall"
    layer: str = "L1"
    level: float = 0.90
    observations: list[Observation] | None = Field(
        default=None, description="If omitted, recent stored actuals are used.")


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
) -> dict:
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
            "n": len(rows), "forecast": rows}


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
    band = _read_band_with_key(req.venue, req.layer, req.level, None)
    if band.empty:
        raise HTTPException(404, f"no stored band for {req.venue}/{req.layer}")
    band = band.set_index(band["date"].astype(str).str[:10])

    if req.observations:
        obs = {o.date.isoformat(): o.value for o in req.observations}
    else:
        con = warehouse.connect(read_only=True)
        try:
            series = warehouse.read_series(req.venue, "L1", con=con)
        finally:
            con.close()
        obs = {str(d)[:10]: float(v) for d, v in
               zip(series["date"].tail(14), series["value"].tail(14))}

    breaches = []
    checked = 0
    for d, value in obs.items():
        if d not in band.index:
            continue
        row = band.loc[d]
        lo, hi = float(row["lo"]), float(row["hi"])
        checked += 1
        if value < lo or value > hi:
            half = max((hi - lo) / 2.0, 1e-6)
            dist = (lo - value) if value < lo else (value - hi)
            ratio = dist / half
            severity = "high" if ratio > 1.0 else "medium" if ratio > 0.5 else "low"
            breaches.append({
                "date": d, "value": round(value, 2), "lo": round(lo, 2),
                "hi": round(hi, 2), "direction": "below" if value < lo else "above",
                "exceedance_ratio": round(ratio, 3), "severity": severity})
    return {"venue": req.venue, "layer": req.layer, "level": req.level,
            "n_checked": checked, "n_breaches": len(breaches), "breaches": breaches}


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
                    "lines": [], "note": f"no stock data for venue '{venue}'"}
        df = con.execute(
            "SELECT * FROM stock_cover WHERE venue = ? "
            "ORDER BY reorder_flag DESC NULLS LAST, days_of_cover ASC NULLS LAST",
            [venue],
        ).df()
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
            "n_reorder": n_reorder, "lines": lines}


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
                    "note": f"change-point detection not run for venue '{req.venue}'"}
        df = con.execute(
            "SELECT * FROM change_points WHERE venue=? AND layer=? "
            "ORDER BY severity='high' DESC, onset_date DESC", [req.venue, req.layer]).df()
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
            "change_points": cps, "stable": len(cps) == 0}


@app.post("/checklist/discipline")
def checklist_discipline(req: ChecklistRequest) -> dict:
    checklists = _checklists()
    steps = checklists[req.checklist]
    res = checklist_evaluate(steps, set(req.completed), req.dow,
                             completion_minutes=req.completion_minutes)
    res["checklist"] = req.checklist
    res["n_expected_mandatory"] = len(expected_mandatory(steps, req.dow == 6))
    return res
