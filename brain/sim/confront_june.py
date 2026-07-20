"""G12.13b (Pass 2 of 2) - confront the frozen forecast with real June actuals.

Loads the committed frozen forecast (never regenerated), pulls the held-out June
actuals from the eval files (Square MCP-SIM provenance), and scores:
  Stage 1  pre-registered cold 30-day forecast vs reality (L1 + L2), band
           coverage, and the World Cup fixture effect on the real England dates.
  Stage 2  realistic weekly-rolling operation (uses progressive actuals; labelled
           separately, this is NOT the pre-registered number).
Stage 3 (the full brain over June) runs in sim/brain_over_june.py against a store
COPY so the served store is never modified.

The served store is read-only here; pulled actuals live only in brain/sim/ eval
files and are never written to served_forecast/forecasts/l1_daily.

Run: .venv-forecast/bin/python -m sim.confront_june
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import config
from eval import harness
from ingest.taxonomy import map_category
from sim.build_frozen_forecast import GATE_WINNER, build_future_frame
from store.warehouse import connect, read_series

SIM_DIR = config.BRAIN_DIR / "sim"
JUNE = pd.date_range("2026-06-01", "2026-06-30", freq="D")
BACKTEST_MASE = {"beer_hall": 0.745, "two_river_taps": 0.597, "ellel": 0.572}
BAND_LEVEL = 0.90
STAGE2_MAX_CEILING = "2026-05-31"       # stage2's first forecast origin


def _load_frozen() -> pd.DataFrame:
    return pd.read_parquet(SIM_DIR / "june2026_forecast_frozen.parquet")


def _load_actuals_l1() -> pd.DataFrame:
    raw = json.loads((SIM_DIR / "june2026_actuals_l1_raw.json").read_text())
    df = pd.DataFrame(raw["rows"])
    df["date"] = pd.to_datetime(df["date"])
    return df


def _load_actuals_l2() -> pd.DataFrame:
    raw = json.loads((SIM_DIR / "june2026_actuals_l2_raw.json").read_text())
    df = pd.DataFrame(raw["rows"])
    df["date"] = pd.to_datetime(df["date"])
    # Align Square categories to brain L2 nodes through the canonical map (loud-fail
    # on an unmapped category), replacing the old raw-string spelling fix.
    df["category"] = df["category"].map(map_category)
    return df


def _build_actuals_eval(frozen, a1, a2):
    """Persist the aligned eval parquet (L1 + L2, all June days, 0 where closed)."""
    rows = []
    for venue in config.FORECAST_VENUES:
        av = a1[a1["venue"] == venue].set_index("date")["net_exvat"]
        for d in JUNE:
            rows.append({"venue": venue, "level": "L1", "key": None,
                         "date": str(d.date()), "actual": float(av.get(d, 0.0))})
        cv = a2[a2["venue"] == venue]
        for cat, sub in cv.groupby("category"):
            idx = sub.set_index("date")["net_exvat"]
            for d in JUNE:
                rows.append({"venue": venue, "level": "L2", "key": cat,
                             "date": str(d.date()), "actual": float(idx.get(d, 0.0))})
    ev = pd.DataFrame(rows)
    ev.to_parquet(SIM_DIR / "june2026_actuals.parquet", index=False)
    return ev


def stage1(frozen, a1, a2) -> dict:
    out = {"l1": {}, "l2": {}, "world_cup": {}}
    for venue in config.FORECAST_VENUES:
        fz = frozen[(frozen.venue == venue) & (frozen.level == "L1")].copy()
        fz["date"] = pd.to_datetime(fz["date"])
        fz = fz.sort_values("date")
        av = a1[a1["venue"] == venue].set_index("date")["net_exvat"]
        actual = np.array([av.get(d, 0.0) for d in fz["date"]], float)
        yhat = fz["yhat"].to_numpy(float)
        lo, hi = fz["lo"].to_numpy(float), fz["hi"].to_numpy(float)
        ruler = harness.venue_ruler(venue)
        # Trading-days mask: exclude structural-closed days (both forecast small
        # AND no actual) to report an active-day view alongside the full horizon.
        trading = ~((actual == 0.0) & (yhat < 60))
        res = {
            "june_actual_total": round(float(actual.sum()), 0),
            "june_frozen_total": round(float(yhat.sum()), 0),
            **harness.venue_metric_row(ruler, actual, yhat, lo, hi,
                                       reported_basis=harness.REPORTED_BASIS,
                                       level=BAND_LEVEL),
            "mase_trading_days_only": {
                b: round(ruler.mase(actual[trading], yhat[trading], b), 3)
                for b in harness.SCALE_BASES
            } if trading.any() else None,
            "backtest_mase": BACKTEST_MASE[venue],
            "backtest_basis": harness.REPORTED_BASIS,
            # Active days in the June HORIZON, distinct from the venue-history
            # `n_trading_days` the metric row carries.
            "n_trading_horizon": int(trading.sum()),
        }
        out["l1"][venue] = res

    # L2: June-total per category, frozen vs actual (beer_hall + ellel have actuals).
    for venue in ("beer_hall", "ellel"):
        fz = frozen[(frozen.venue == venue) & (frozen.level == "L2")]
        fz_tot = fz.groupby("key")["yhat"].sum()
        av = a2[a2["venue"] == venue].groupby("category")["net_exvat"].sum()
        cats = sorted(set(fz_tot.index) | set(av.index))
        table = []
        for c in cats:
            table.append({"category": c, "frozen": round(float(fz_tot.get(c, 0.0)), 0),
                          "actual": round(float(av.get(c, 0.0)), 0)})
        mae = float(np.mean([abs(r["frozen"] - r["actual"]) for r in table]))
        out["l2"][venue] = {"mae_category_total": round(mae, 0), "table": table}

    # World Cup: the three England dates - actual vs frozen vs DOW-median baseline.
    bh_fz = frozen[(frozen.venue == "beer_hall") & (frozen.level == "L1")].copy()
    bh_fz["date"] = pd.to_datetime(bh_fz["date"])
    av = a1[a1["venue"] == "beer_hall"].set_index("date")["net_exvat"]
    con = connect(read_only=True)
    try:
        hist = read_series("beer_hall", "L1", fill_calendar=True, con=con)
    finally:
        con.close()
    dow_median = hist.groupby(hist["date"].dt.dayofweek)["value"].median()
    eng_dates = bh_fz[bh_fz["wc_england_in_hours"] == 1]["date"]
    fixtures = {"2026-06-17": "England v Croatia 21:00",
                "2026-06-23": "England v Ghana 21:00",
                "2026-06-27": "Panama v England 22:00"}
    rows = []
    for d in eng_dates:
        ds = str(d.date())
        frow = bh_fz[bh_fz["date"] == d].iloc[0]
        rows.append({
            "date": ds, "dow": d.day_name()[:3], "fixture": fixtures.get(ds, ""),
            "actual": round(float(av.get(d, 0.0)), 0),
            "frozen_yhat": round(float(frow["yhat"]), 0),
            "dow_median": round(float(dow_median.get(d.dayofweek, np.nan)), 0),
        })
    out["world_cup"] = {"beer_hall_england_dates": rows,
                        "note": "One June, 3 England dates: directional only, no power."}
    return out


def stage2() -> dict:
    """Realistic weekly-rolling 7-day-ahead: each week forecast from history plus
    June actuals up to the prior week. USES PROGRESSIVE ACTUALS - not the
    pre-registered number. Same gate winner per venue.

    Requires a store whose ceiling is at or before the first forecast origin. Once
    the clock advanced to 2026-07-07 the June rows became observed history, so
    `build_features` returns a frame that already contains the target dates and
    Chronos rejects the future frame. Stated as a precondition here because the
    vendor error it otherwise raises names timestamps, not the cause. Pre-existing
    at d40dea7 and unchanged by S1: re-scoring it needs the pinned store that S3
    introduces.
    """
    from models.foundation import CHRONOS2_EXO_COLS, chronos2_exo_predict
    from models.ladder import rung1_robust_dow, rung2_ets
    from store.active_span import trim_to_active
    from features.build_features import build_features

    con = connect(read_only=True)
    try:
        ceiling = str(con.execute("SELECT MAX(date) FROM l1_daily").fetchone()[0])
    finally:
        con.close()
    if ceiling > STAGE2_MAX_CEILING:
        return {
            "unavailable": "store-ceiling-advanced-past-forecast-origin",
            "store_ceiling": ceiling,
            "requires_ceiling_at_or_before": STAGE2_MAX_CEILING,
        }

    a1 = _load_actuals_l1()
    boundaries = [pd.Timestamp("2026-05-31"), pd.Timestamp("2026-06-07"),
                  pd.Timestamp("2026-06-14"), pd.Timestamp("2026-06-21"),
                  pd.Timestamp("2026-06-28")]
    out = {}
    for venue in config.FORECAST_VENUES:
        feats = trim_to_active(build_features(venue), venue)
        av = a1[a1["venue"] == venue].set_index("date")["net_exvat"]
        ruler = harness.venue_ruler(venue)
        preds_all, acts_all = [], []
        for b in boundaries:
            block = pd.date_range(b + pd.Timedelta(days=1),
                                  min(b + pd.Timedelta(days=7), JUNE[-1]), freq="D")
            block = block[block <= JUNE[-1]]
            if len(block) == 0:
                continue
            past = pd.date_range("2026-06-01", b, freq="D")
            past = past[past >= JUNE[0]]
            train = feats
            if len(past):
                pj = build_future_frame(venue, past).copy()
                pj["value"] = [float(av.get(d, 0.0)) for d in past]
                train = pd.concat([feats, pj], ignore_index=True)
            tgt = build_future_frame(venue, block)
            model = GATE_WINNER[venue]
            if model == "rung4_chronos2_exo":
                pred = chronos2_exo_predict(train, tgt, venue=venue,
                                            exo_cols=list(CHRONOS2_EXO_COLS))
            elif model == "rung2_ets":
                pred = rung2_ets(train, tgt)
            else:
                pred = rung1_robust_dow(train, tgt)
            act = np.array([float(av.get(d, 0.0)) for d in block], float)
            preds_all.extend(pred.tolist())
            acts_all.extend(act.tolist())
        acts_all = np.array(acts_all); preds_all = np.array(preds_all)
        out[venue] = harness.venue_metric_row(
            ruler, acts_all, preds_all,
            reported_basis=harness.REPORTED_BASIS) if len(acts_all) else {
            "n_days": 0}
    return out


def main() -> dict:
    frozen = _load_frozen()
    a1, a2 = _load_actuals_l1(), _load_actuals_l2()
    _build_actuals_eval(frozen, a1, a2)
    result = {"stage1": stage1(frozen, a1, a2), "stage2": stage2()}
    # New file, not an edit: see sim/confront_july.py and S1 G5.
    (SIM_DIR / "june2026_confront_rescored.json").write_text(
        json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    main()
