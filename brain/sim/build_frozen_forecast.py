"""G12.13a (Pass 1 of 2) - freeze the forward June 2026 forecast BLIND to actuals.

Produces a genuine forward horizon for 1-30 June 2026 from data strictly on or
before each venue's store ceiling (<= 2026-05-31), serving each venue's gate
winner pure at L1 and disaggregating coherently to L2 (category) and L3 (top
items per category + OTHER residual) by historical ex-VAT revenue share. The
artefact is committed BEFORE June actuals are pulled, so Pass 2's confrontation
is a true pre-registered out-of-sample test, not a post-hoc fit.

Known-future covariates for the Beer Hall Chronos-2 exo winner:
  * calendar / term / bank-holiday / World Cup wc_*: computed forward (pure date
    functions and the fixed fixture calendar), genuinely knowable in advance.
  * is_ellel_event: 0 forward (a real forecaster on 31 May does not know which
    June nights Ellel will trade); the blind default.
  * weather: a climatological normal (prior-June mean per cell). Beyond the ~16
    day live weather-forecast horizon there is no skilful forecast, so the honest
    known-future prior is climatology, not realised June weather (which would
    leak reality into a "forecast"). This is the day-8-to-30 extrapolation caveat.

Run (needs .venv-forecast with chronos):
    .venv-forecast/bin/python -m sim.build_frozen_forecast
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import holidays
import numpy as np
import pandas as pd

import config
from conformal.wrap import conformal_quantile, rolling_point_forecasts
from features.build_features import build_features
from ingest import calendar_sources as cal
from ingest.exog_weather import read_basis
from ingest.world_cup import WC_FEATURE_COLS, read_world_cup_schedule, world_cup_features
from models.foundation import (
    CHRONOS2_EXO_COLS,
    chronos2_exo_predict,
    chronos2_runtime_info,
)
from models.ladder import rung1_robust_dow, rung2_ets
from store.active_span import trim_to_active
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"
JUNE_START = pd.Timestamp("2026-06-01")
JUNE_END = pd.Timestamp("2026-06-30")
LEVEL = 0.90
BAND_CALIB_DAYS = 90         # rolling-origin calibration window for the band
SHARE_WINDOW_DAYS = 120      # recent window for L2/L3 revenue-share mix
TOP_ITEMS_PER_CAT = 3        # mirror build_hierarchy's top-k + OTHER

# Gate winners (V1, decision log Section C): served pure at L1.
GATE_WINNER = {
    "beer_hall": "rung4_chronos2_exo",
    "two_river_taps": "rung2_ets",
    "ellel": "rung1_robust_dow",
}


def _june_dates() -> pd.DatetimeIndex:
    return pd.date_range(JUNE_START, JUNE_END, freq="D")


def _weather_climatology(cell: str) -> dict[str, float]:
    """Prior-June mean per weather variable for a cell, on the hindcast (serving)
    basis. The no-skill known-future prior beyond the live forecast horizon."""
    wx = read_basis("hindcast")
    wx = wx[wx["cell"] == cell].copy()
    wx["date"] = pd.to_datetime(wx["date"])
    june = wx[wx["date"].dt.month == 6]
    src = june if not june.empty else wx
    return {
        "exo_temp_c": float(src["exo_temp_c"].mean()),
        "exo_rain_mm": float(src["exo_rain_mm"].mean()),
        "exo_sunshine_hrs": float(src["exo_sunshine_hrs"].mean()),
    }


def build_future_frame(venue: str, dates: pd.DatetimeIndex | None = None) -> pd.DataFrame:
    """A target frame: dates + every known-future covariate, no NaN, blind to
    actuals. Weather is climatology; wc_* is the fixed fixture calendar. Default
    horizon is all of June; a custom `dates` range drives the weekly-rolling view."""
    dates = _june_dates() if dates is None else dates
    fut = pd.DataFrame({"date": dates})
    fut["value"] = np.nan
    fut["dow"] = fut["date"].dt.dayofweek
    fut["month"] = fut["date"].dt.month

    bh = holidays.UnitedKingdom(subdiv="England", years=[2026])
    fut["is_bank_holiday"] = fut["date"].dt.date.isin(set(bh.keys())).astype(int)
    fut["exo_is_school_term"] = fut["date"].map(cal.is_school_term).astype(int)
    fut["exo_is_uni_term"] = fut["date"].map(cal.is_uni_term).astype(int)
    # Blind forward default: a 31-May forecaster does not know June Ellel nights.
    fut["is_ellel_event"] = 0
    # No curated local events in June (verified); the seam is 0 forward.
    fut["exo_event_rank"] = 0.0
    fut["exo_fixture_nearby"] = 0

    wc = world_cup_features(venue, fut["date"])
    fut = fut.merge(wc, on="date", how="left")
    for c in WC_FEATURE_COLS:
        fut[c] = fut[c].fillna(0).astype(int)

    clim = _weather_climatology(config.WEATHER_CELLS.get(venue))
    for k, v in clim.items():
        fut[k] = v
    fut["exo_is_dry"] = float(clim["exo_rain_mm"] < config.WEATHER_DRY_MM)
    return fut


def _l1_point(venue: str, feats: pd.DataFrame, fut: pd.DataFrame) -> np.ndarray:
    model = GATE_WINNER[venue]
    if model == "rung4_chronos2_exo":
        return chronos2_exo_predict(feats, fut, venue=venue,
                                    exo_cols=list(CHRONOS2_EXO_COLS))
    if model == "rung2_ets":
        return rung2_ets(feats, fut)
    if model == "rung1_robust_dow":
        return rung1_robust_dow(feats, fut)
    raise ValueError(f"no forward path for {model}")


def _band_halfwidth(venue: str, feats: pd.DataFrame) -> float:
    """Split-conformal half-width from recent rolling 7-day residuals of the served
    model. Calibrated on <=7-day-ahead errors; the June horizon runs to 30 days
    ahead, so the band is a nominal floor (the extrapolation caveat)."""
    model = GATE_WINNER[venue]
    first = feats["date"].max() - pd.Timedelta(days=BAND_CALIB_DAYS)
    roll = rolling_point_forecasts(
        feats, model, list(CHRONOS2_EXO_COLS), venue=venue, first_target=first)
    if roll.empty:
        return float("nan")
    abs_res = np.abs(roll["y"].to_numpy() - roll["yhat"].to_numpy())
    return conformal_quantile(abs_res, LEVEL)


def _revenue_shares(venue: str, ceiling: pd.Timestamp):
    """Recent ex-VAT revenue mix: category share of venue total, and each item's
    share of its category (top-k per category + an OTHER residual)."""
    con = connect(read_only=True)
    try:
        lo = ceiling - pd.Timedelta(days=SHARE_WINDOW_DAYS)
        cat = con.execute(
            "SELECT category, SUM(revenue_exvat) r FROM l2_category_daily "
            "WHERE venue=? AND date>? AND date<=? GROUP BY category", [venue, lo, ceiling]).df()
        item = con.execute(
            "SELECT category, item, SUM(revenue_exvat) r FROM l3_item_daily "
            "WHERE venue=? AND date>? AND date<=? GROUP BY category, item", [venue, lo, ceiling]).df()
    finally:
        con.close()
    cat = cat[cat["r"] > 0]
    total = float(cat["r"].sum())
    if total <= 0:
        return {}, {}
    cat_share = {r["category"]: r["r"] / total for _, r in cat.iterrows()}
    item_share: dict[str, dict[str, float]] = {}
    for c, sub in item[item["r"] > 0].groupby("category"):
        csum = float(sub["r"].sum())
        if csum <= 0:
            continue
        sub = sub.sort_values("r", ascending=False)
        top = sub.head(TOP_ITEMS_PER_CAT)
        shares = {r["item"]: r["r"] / csum for _, r in top.iterrows()}
        other = 1.0 - sum(shares.values())
        if other > 1e-6:
            shares["OTHER"] = other
        item_share[c] = shares
    return cat_share, item_share


def _reason(venue: str, row: pd.Series, schedule: pd.DataFrame) -> str:
    d = pd.Timestamp(row["date"]).normalize()
    bits = []
    day_fx = schedule[schedule["date"] == d]
    in_hours = int(row.get("wc_match_in_hours", 0))
    if int(row.get("wc_england_in_hours", 0)) and not day_fx.empty:
        names = "; ".join(f"{m.home} v {m.away} {m.kickoff_london.strftime('%H:%M')}"
                          for m in day_fx.itertuples())
        bits.append(f"England fixture in trading hours ({names}); expect uplift")
    elif in_hours and not day_fx.empty:
        names = "; ".join(f"{m.home} v {m.away}" for m in day_fx.itertuples())
        bits.append(f"World Cup match(es) in trading hours ({names})")
    if int(row.get("is_bank_holiday", 0)):
        bits.append("bank holiday")
    bits.append("weekend" if row["dow"] >= 5 else "weekday")
    if not int(row.get("exo_is_school_term", 1)):
        bits.append("school holiday")
    return "; ".join(bits)


def build() -> dict:
    SIM_DIR.mkdir(parents=True, exist_ok=True)
    schedule = read_world_cup_schedule()
    schedule = schedule.assign(date=pd.to_datetime(schedule["date"]).dt.normalize())
    rows: list[dict] = []
    reasons: dict[str, dict[str, str]] = {}
    meta_venues: dict[str, dict] = {}

    for venue in config.FORECAST_VENUES:
        feats = trim_to_active(build_features(venue), venue)
        ceiling = pd.Timestamp(feats["date"].max()).normalize()
        fut = build_future_frame(venue)
        yhat = _l1_point(venue, feats, fut)
        half = _band_halfwidth(venue, feats)
        lo = np.clip(yhat - half, 0.0, None)
        hi = yhat + half

        # L1 rows + per-day reason.
        reasons[venue] = {}
        for i, r in fut.iterrows():
            d = str(pd.Timestamp(r["date"]).date())
            rows.append({"venue": venue, "level": "L1", "key": None, "date": d,
                         "dow": int(r["dow"]), "yhat": float(yhat[i]),
                         "lo": float(lo[i]), "hi": float(hi[i]),
                         "model": GATE_WINNER[venue],
                         "wc_match_in_hours": int(r["wc_match_in_hours"]),
                         "wc_england_in_hours": int(r["wc_england_in_hours"])})
            reasons[venue][d] = _reason(venue, r, schedule)

        # L2 / L3 by recent revenue-share disaggregation (coherent to L1).
        cat_share, item_share = _revenue_shares(venue, ceiling)
        for i, r in fut.iterrows():
            d = str(pd.Timestamp(r["date"]).date())
            for c, cs in cat_share.items():
                cat_yhat = float(yhat[i]) * cs
                rows.append({"venue": venue, "level": "L2", "key": c, "date": d,
                             "dow": int(r["dow"]), "yhat": cat_yhat,
                             "lo": float("nan"), "hi": float("nan"),
                             "model": f"{GATE_WINNER[venue]}+revshare",
                             "wc_match_in_hours": int(r["wc_match_in_hours"]),
                             "wc_england_in_hours": int(r["wc_england_in_hours"])})
                for it, is_ in item_share.get(c, {}).items():
                    rows.append({"venue": venue, "level": "L3",
                                 "key": f"{c}::{it}", "date": d, "dow": int(r["dow"]),
                                 "yhat": cat_yhat * is_, "lo": float("nan"),
                                 "hi": float("nan"),
                                 "model": f"{GATE_WINNER[venue]}+revshare",
                                 "wc_match_in_hours": int(r["wc_match_in_hours"]),
                                 "wc_england_in_hours": int(r["wc_england_in_hours"])})

        meta_venues[venue] = {
            "model": GATE_WINNER[venue],
            "train_ceiling": str(ceiling.date()),
            "band_halfwidth": None if not np.isfinite(half) else round(half, 2),
            "n_categories": len(cat_share),
            "june_l1_total": round(float(yhat.sum()), 2),
        }
        print(f"{venue}: model={GATE_WINNER[venue]} ceiling={ceiling.date()} "
              f"June L1 total=£{yhat.sum():,.0f} band=+/-{half:,.0f} "
              f"cats={len(cat_share)}")

    frozen = pd.DataFrame(rows)
    parquet = SIM_DIR / "june2026_forecast_frozen.parquet"
    frozen.to_parquet(parquet, index=False)

    meta = {
        "artefact": "june2026_forecast_frozen",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "horizon": {"start": str(JUNE_START.date()), "end": str(JUNE_END.date()),
                    "days": 30},
        "blind": "produced before any June 2026 actual was read; weather is "
                 "climatology (prior-June mean), is_ellel_event=0 forward, wc_* from "
                 "the fixed fixture calendar",
        "level_conf": LEVEL,
        "venues": meta_venues,
        "chronos_runtime": chronos2_runtime_info(),
        "l2_l3_method": "forecast-proportion disaggregation of pure L1 by recent "
                        f"{SHARE_WINDOW_DAYS}-day ex-VAT revenue share; L3 = top-"
                        f"{TOP_ITEMS_PER_CAT} items/category + OTHER",
        "caveats": [
            "30-day cold horizon: band calibrated on <=7-day rolling residuals is a "
            "nominal floor beyond day 8 (extrapolation caveat).",
            "weather beyond the ~16-day live forecast horizon is climatology, not a "
            "skilful forecast.",
            "two_river_taps is INACTIVE in Square; its ETS horizon projects forward "
            "from a 2026-05-08 ceiling and may confront a closed venue.",
        ],
        "reasons": reasons,
    }
    (SIM_DIR / "june2026_forecast_frozen.json").write_text(json.dumps(meta, indent=2))
    print(f"\nfrozen rows: {len(frozen)}  ->  {parquet}")
    print(f"L1 rows: {(frozen.level=='L1').sum()}  L2: {(frozen.level=='L2').sum()}  "
          f"L3: {(frozen.level=='L3').sum()}")
    return meta


if __name__ == "__main__":
    build()
