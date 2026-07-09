"""G12.15c - refresh-cadence sweep over June (item-demand focus, on MPS).

Analysis over the already-seen June actuals (no pre-registration concern). At each
rolling origin, condition the venue's gate-winner (Chronos-2-exo for Beer Hall, on
MPS, with the full exo set including the home-nation flags) on June actuals up to
that origin, forecast forward to the next refresh, and score against actuals.

Cadences: cold (one 30-day forecast from 31 May), 7-day (current default), 3-day,
daily. Scored at L1 venue revenue and L2 category (sale-item) demand. Reports
overall MASE, fixture-day MASE, the FIRST-fixture-day error separately, and
wall-clock per cadence. L3 item-level is the taxonomy-reconciliation gap (report 22).

Run: .venv-forecast/bin/python -m sim.cadence_sweep
"""

from __future__ import annotations

import json
import time

import numpy as np
import pandas as pd

import config
from features.build_features import build_features
from ingest.world_cup import world_cup_features
from models.foundation import (
    CHRONOS2_EXO_COLS,
    chronos2_exo_predict,
    chronos2_runtime_info,
)
from models.ladder import rung1_robust_dow, rung2_ets
from sim.build_frozen_forecast import GATE_WINNER, build_future_frame
from store.active_span import trim_to_active
from store.warehouse import connect, read_series

SIM_DIR = config.BRAIN_DIR / "sim"
JUNE = pd.date_range("2026-06-01", "2026-06-30", freq="D")
CADENCES = {"cold_30": 30, "7_day": 7, "3_day": 3, "daily": 1}


def _actuals_l1(venue: str) -> pd.Series:
    raw = json.loads((SIM_DIR / "june2026_actuals_l1_raw.json").read_text())["rows"]
    df = pd.DataFrame([r for r in raw if r["venue"] == venue])
    if df.empty:
        return pd.Series(0.0, index=JUNE)
    df["date"] = pd.to_datetime(df["date"])
    return df.set_index("date")["net_exvat"].reindex(JUNE, fill_value=0.0)


def _seasonal_scale(venue: str) -> float:
    con = connect(read_only=True)
    try:
        s = read_series(venue, "L1", fill_calendar=True, con=con)
    finally:
        con.close()
    y = s["value"].to_numpy(float)
    d = np.abs(y[config.SEASONAL_PERIOD:] - y[:-config.SEASONAL_PERIOD])
    return float(np.mean(d)) if d.size else float("nan")


def _l2_actuals_and_scale(venue: str):
    """June L2 category actuals + per-category seasonal-naive scale + recent share."""
    raw = json.loads((SIM_DIR / "june2026_actuals_l2_raw.json").read_text())["rows"]
    a = pd.DataFrame([r for r in raw if r["venue"] == venue])
    con = connect(read_only=True)
    try:
        hist = con.execute(
            "SELECT date, category, revenue_exvat FROM l2_category_daily WHERE venue=?",
            [venue]).df()
        ceiling = con.execute(
            "SELECT MAX(date) FROM l1_daily WHERE venue=?", [venue]).fetchone()[0]
    finally:
        con.close()
    if a.empty or hist.empty:
        return {}, {}, {}
    a["date"] = pd.to_datetime(a["date"])
    hist["date"] = pd.to_datetime(hist["date"])
    ceiling = pd.Timestamp(ceiling)
    lo = ceiling - pd.Timedelta(days=120)
    recent = hist[(hist["date"] > lo) & (hist["date"] <= ceiling)]
    tot = float(recent["revenue_exvat"].sum()) or 1.0
    shares, scales, actuals = {}, {}, {}
    for c, g in hist.groupby("category"):
        s = g.set_index("date")["revenue_exvat"].reindex(
            pd.date_range(g["date"].min(), ceiling), fill_value=0.0).to_numpy(float)
        d = np.abs(s[config.SEASONAL_PERIOD:] - s[:-config.SEASONAL_PERIOD])
        scales[c] = float(np.mean(d)) if d.size else float("nan")
        shares[c] = float(recent[recent["category"] == c]["revenue_exvat"].sum()) / tot
        actuals[c] = a[a["category"] == c].set_index("date")["net_exvat"].reindex(
            JUNE, fill_value=0.0)
    return shares, scales, actuals


def _predict(venue, train, tgt):
    m = GATE_WINNER[venue]
    if m == "rung4_chronos2_exo":
        return chronos2_exo_predict(train, tgt, venue=venue,
                                    exo_cols=list(CHRONOS2_EXO_COLS))
    if m == "rung2_ets":
        return rung2_ets(train, tgt)
    return rung1_robust_dow(train, tgt)


def _mase(a, p, scale):
    if not np.isfinite(scale) or scale <= 0 or len(a) == 0:
        return None
    return round(float(np.mean(np.abs(a - p)) / scale), 3)


def _sweep_venue(venue: str) -> dict:
    feats = trim_to_active(build_features(venue), venue)
    av = _actuals_l1(venue)
    scale = _seasonal_scale(venue)
    l2_shares, l2_scales, l2_actuals = _l2_actuals_and_scale(venue)
    wc = world_cup_features(venue, JUNE).set_index("date")
    fixture_days = [d for d in JUNE if int(wc.loc[d, "wc_match_in_hours"]) == 1]
    first_fixture = min(fixture_days) if fixture_days else None

    out = {}
    for name, step in CADENCES.items():
        origins = pd.date_range("2026-05-31", "2026-06-29", freq=f"{step}D")
        per_day = {}
        t0 = time.time()
        for origin in origins:
            block = pd.date_range(origin + pd.Timedelta(days=1),
                                  min(origin + pd.Timedelta(days=step), JUNE[-1]), freq="D")
            block = block[(block >= JUNE[0]) & (block <= JUNE[-1])]
            if len(block) == 0:
                continue
            past = pd.date_range(JUNE[0], origin, freq="D")
            past = past[past >= JUNE[0]]
            train = feats
            if len(past):
                pj = build_future_frame(venue, past).copy()
                pj["value"] = [float(av.get(d, 0.0)) for d in past]
                train = pd.concat([feats, pj], ignore_index=True)
            pred = _predict(venue, train, build_future_frame(venue, block))
            for d, p in zip(block, pred):
                per_day[d] = float(p)  # last forecast for a day wins (nearest origin)
        wall = time.time() - t0

        days = [d for d in JUNE if d in per_day]
        a = np.array([float(av.get(d, 0.0)) for d in days])
        p = np.array([per_day[d] for d in days])
        fx = [i for i, d in enumerate(days) if d in fixture_days]
        first_i = [i for i, d in enumerate(days) if d == first_fixture]
        later_fx = [i for i in fx if i not in first_i]
        # L2 category MASE: disaggregate each day's L1 forecast by fixed revenue
        # share, score per category, average. Ranking mirrors L1 (fixed share).
        l2_vals = []
        for c, share in l2_shares.items():
            sc = l2_scales.get(c)
            if not sc or not np.isfinite(sc) or sc <= 0:
                continue
            ca = np.array([float(l2_actuals[c].get(d, 0.0)) for d in days])
            cp = np.array([per_day[d] * share for d in days])
            l2_vals.append(np.mean(np.abs(ca - cp)) / sc)
        out[name] = {
            "mase_all": _mase(a, p, scale),
            "mase_fixture_days": _mase(a[fx], p[fx], scale) if fx else None,
            "mase_later_fixture_days": _mase(a[later_fx], p[later_fx], scale) if later_fx else None,
            "l2_category_mase": round(float(np.mean(l2_vals)), 3) if l2_vals else None,
            "first_fixture_day": str(first_fixture.date()) if first_fixture is not None else None,
            "first_fixture_abs_err": round(float(abs(a[first_i[0]] - p[first_i[0]])), 0)
            if first_i else None,
            "n_days": len(days), "wall_clock_s": round(wall, 1),
        }
    return out


def run() -> dict:
    result = {"device": None, "venues": {}}
    for venue in config.FORECAST_VENUES:
        result["venues"][venue] = _sweep_venue(venue)
        print(f"\n=== {venue} ({GATE_WINNER[venue]}) ===")
        for name, r in result["venues"][venue].items():
            print(f"  {name:8s}: L1_MASE={r['mase_all']} fixture={r['mase_fixture_days']} "
                  f"L2_MASE={r['l2_category_mase']} first_fix_err=£{r['first_fixture_abs_err']} "
                  f"wall={r['wall_clock_s']}s")
    result["device"] = chronos2_runtime_info().get("device")
    (SIM_DIR / "june2026_cadence_sweep.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    run()
