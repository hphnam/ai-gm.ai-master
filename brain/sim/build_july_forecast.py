"""G12.17a-4 - freeze the BLIND July 1 to 7 2026 forecast (pre-registration).

Forecasts a 7-day forward horizon from the June-inclusive store cutoff (last trade
2026-06-29, as-of 2026-06-30), strictly from data on or before the cutoff. Unlike the
June cold 30-day freeze this is the reliable 7-day horizon, and it carries the two
things the June confront proved necessary:
  * the liveness gate: Two River Taps is dormant and is marked not-forecast, not
    served a positive number (the direct fix of the June GBP 5,329-vs-0 miss);
  * the refreshed taxonomy: L2/L3 node selection uses a recent window ending at the
    cutoff, so the branded LuneBrew lines that displaced Lager - BH are tracked.

Known-future covariates: calendar/term/bank-holiday and the World Cup wc_* (incl.
home-nation flags) computed forward; is_ellel_event 0 forward (blind); weather from
the real hindcast forecast basis for July 1 to 7 (a genuine 7-day forecast, retrieved
into the store, NOT June's climatology). L2/L3 use the measured split (report 23):
MinT for Beer Hall, revenue-share disaggregation for Ellel, on the refreshed nodes.

The artefact (july2026_forecast_frozen.{parquet,json,md}) is committed BEFORE any July
actual is pulled; its commit timestamp is the pre-registration evidence. No July
observation enters this pass. Run (needs .venv-forecast with chronos):
    .venv-forecast/bin/python -m sim.build_july_forecast
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd

import config
from hierarchy.reconcile import _dow_median_forecast, mint_reconcile
from ingest.exog_weather import read_basis
from ingest.world_cup import read_world_cup_schedule
from models.foundation import chronos2_runtime_info
from sim.build_frozen_forecast import (
    BAND_CALIB_DAYS,
    GATE_WINNER,
    LEVEL,
    SHARE_WINDOW_DAYS,
    TOP_ITEMS_PER_CAT,
    _band_halfwidth,
    _l1_point,
    _reason,
    _revenue_shares,
    build_future_frame,
)
from store.active_span import is_dormant
from store.warehouse import connect
from features.build_features import build_features
from store.active_span import trim_to_active

SIM_DIR = config.BRAIN_DIR / "sim"
JULY_START = pd.Timestamp("2026-07-01")
JULY_END = pd.Timestamp("2026-07-07")
AS_OF = pd.Timestamp("2026-06-30")
WEATHER_BASIS = "hindcast"  # forecast product, the serving basis (WEATHER_TRAIN_BASIS)


def _july_dates() -> pd.DatetimeIndex:
    return pd.date_range(JULY_START, JULY_END, freq="D")


def _served_winner(venue: str) -> str:
    """Gate winner to serve = the STANDING promoted winner (GATE_WINNER).

    The June-inclusive 6-fold refit (sim/refit_june_inclusive) put a different rung
    marginally ahead for both live venues (robust-DOW over Chronos-exo at Beer Hall,
    Chronos-bolt over robust-DOW at Ellel), but within noise on a single refit over a
    uniquely volatile World Cup June. A promoted model is not hot-swapped on that, per
    the store's ladder_selection adoption gate; the change is recorded flagged-not-
    adopted in the refit artefact and the report. Serving the standing Chronos-exo
    winner at Beer Hall also keeps the served model fixture-aware, so Pass 2's
    in-context test is meaningful rather than trivially null against a DOW baseline.
    """
    return GATE_WINNER[venue]


def _future_frame(venue: str, dates: pd.DatetimeIndex) -> pd.DataFrame:
    """Known-future frame over `dates`, with REAL hindcast forecast weather where the
    store has it (the emitted July 1 to 7 window). `dates` may include bridge days
    between the venue's training ceiling and July 1 (Chronos needs the forecast
    contiguous with training); those keep build_future_frame's climatology and are
    dropped before the artefact, so their weather quality does not matter. The July
    window is asserted to be real (not climatology) by the caller."""
    fut = build_future_frame(venue, dates)
    cell = config.WEATHER_CELLS[venue]
    wx = read_basis(WEATHER_BASIS)
    wx = wx[wx["cell"] == cell].copy()
    wx["date"] = pd.to_datetime(wx["date"])
    wx = wx.set_index("date")
    have = [d for d in dates if d in wx.index]
    sel = wx.loc[have]
    m = fut["date"].isin(have)
    fut.loc[m, "exo_temp_c"] = sel["exo_temp_c"].to_numpy()
    fut.loc[m, "exo_rain_mm"] = sel["exo_rain_mm"].to_numpy()
    fut.loc[m, "exo_sunshine_hrs"] = sel["exo_sunshine_hrs"].to_numpy()
    fut["exo_is_dry"] = (fut["exo_rain_mm"] < config.WEATHER_DRY_MM).astype(float)
    fut.attrs["real_weather_dates"] = set(have)
    return fut


def _revenue_hierarchy(venue: str, ceiling: pd.Timestamp, since: pd.Timestamp):
    """VENUE / CAT / ITEM (refreshed top-k + OTHER) daily ex-VAT revenue series + S.
    Top-k is ranked on the recent [since, ceiling] window (the taxonomy refresh)."""
    con = connect(read_only=True)
    try:
        item = con.execute(
            "SELECT date, category, item, revenue_exvat FROM l3_item_daily WHERE venue=?",
            [venue]).df()
    finally:
        con.close()
    item["date"] = pd.to_datetime(item["date"])
    cal = pd.DatetimeIndex(sorted(item["date"].unique()))
    rank_src = item[(item["date"] >= since) & (item["date"] <= ceiling)]
    node_series, cat_nodes, bottom_nodes, cat_of_bottom = {}, [], [], {}
    venue_total = pd.Series(0.0, index=cal)
    for c in rank_src.groupby("category")["revenue_exvat"].sum().sort_values(
            ascending=False).index:
        sub = item[item["category"] == c]
        cat_daily = sub.groupby("date")["revenue_exvat"].sum().reindex(cal, fill_value=0.0)
        cid = f"CAT::{c}"
        node_series[cid] = cat_daily
        cat_nodes.append(cid)
        venue_total = venue_total + cat_daily
        totals = rank_src[rank_src["category"] == c].groupby("item")["revenue_exvat"].sum(
            ).sort_values(ascending=False)
        used = pd.Series(0.0, index=cal)
        for it in totals.index[:TOP_ITEMS_PER_CAT]:
            s = sub[sub["item"] == it].groupby("date")["revenue_exvat"].sum().reindex(
                cal, fill_value=0.0)
            nid = f"ITEM::{c}::{it}"
            node_series[nid] = s
            bottom_nodes.append(nid)
            cat_of_bottom[nid] = cid
            used = used + s
        other = (cat_daily - used).clip(lower=0.0)
        if float(other.sum()) > 1.0:
            nid = f"ITEM::{c}::OTHER"
            node_series[nid] = other
            bottom_nodes.append(nid)
            cat_of_bottom[nid] = cid
    node_series["VENUE"] = venue_total
    nodes = ["VENUE"] + cat_nodes + bottom_nodes
    idx = {b: j for j, b in enumerate(bottom_nodes)}
    S = np.zeros((len(nodes), len(bottom_nodes)))
    for i, n in enumerate(nodes):
        if n == "VENUE":
            S[i, :] = 1.0
        elif n.startswith("CAT::"):
            for b in bottom_nodes:
                if cat_of_bottom[b] == n:
                    S[i, idx[b]] = 1.0
        else:
            S[i, idx[n]] = 1.0
    return node_series, S, nodes


def _mint_l2l3(venue, ceiling, since, dates, l1_point):
    """MinT-reconciled L2/L3 over the July horizon: VENUE row = gate-winner L1 point,
    other bases = per-node DOW-median, reconciled coherent to L1 (report 23 winner)."""
    ns, S, nodes = _revenue_hierarchy(venue, ceiling, since)
    Ybase = np.zeros((len(nodes), len(dates)))
    w = np.zeros(len(nodes))
    for i, n in enumerate(nodes):
        Ybase[i], w[i] = _dow_median_forecast(ns[n], dates)
    Ybase[0] = l1_point
    # Pin the VENUE row (near-zero variance = dominant weight) so the reconciled
    # bottom nodes sum EXACTLY to the served gate-winner L1: L1 stays the gate winner,
    # L2/L3 are MinT-distributed and coherent to it.
    w[0] = 1e-9
    recon = mint_reconcile(Ybase, S, w)
    return nodes, recon


def _disagg_l2l3(venue, ceiling, dates, l1_point):
    """Revenue-share disaggregation of the L1 point (Ellel; report 23 winner)."""
    cat_share, item_share = _revenue_shares(venue, ceiling)
    l2, l3 = {}, {}
    for k, d in enumerate(dates):
        for c, cs in cat_share.items():
            cat_yhat = float(l1_point[k]) * cs
            l2[(c, d)] = cat_yhat
            for it, is_ in item_share.get(c, {}).items():
                l3[(f"{c}::{it}", d)] = cat_yhat * is_
    return l2, l3


def build() -> dict:
    SIM_DIR.mkdir(parents=True, exist_ok=True)
    schedule = read_world_cup_schedule()
    schedule = schedule.assign(date=pd.to_datetime(schedule["date"]).dt.normalize())
    dates = _july_dates()
    rows: list[dict] = []
    reasons: dict[str, dict[str, str]] = {}
    meta_venues: dict[str, dict] = {}

    for venue in config.FORECAST_VENUES:
        if is_dormant(venue, as_of=AS_OF):
            meta_venues[venue] = {"dormant": True,
                                  "reason": f"no trading in the {config.DORMANCY_LOOKBACK_DAYS} "
                                            f"days to {AS_OF.date()}; liveness gate withholds a "
                                            "positive forecast"}
            print(f"{venue}: DORMANT (liveness gate) - not forecast")
            continue

        feats = trim_to_active(build_features(venue), venue)
        ceiling = pd.Timestamp(feats["date"].max()).normalize()
        since = ceiling - pd.Timedelta(days=SHARE_WINDOW_DAYS)
        model = _served_winner(venue)
        # Chronos needs the forecast contiguous with training: predict from the day
        # after the ceiling through Jul 7, then emit only the Jul 1 to 7 window.
        pred_dates = pd.date_range(ceiling + pd.Timedelta(days=1), JULY_END, freq="D")
        fut_pred = _future_frame(venue, pred_dates)
        assert set(dates) <= fut_pred.attrs["real_weather_dates"], \
            f"{venue}: July window lacks real forecast weather"
        yhat_pred = _l1_point(venue, feats, fut_pred)
        pos = {pd.Timestamp(d): k for k, d in enumerate(pred_dates)}
        jidx = [pos[d] for d in dates]
        yhat = yhat_pred[jidx]
        fut = fut_pred.iloc[jidx].reset_index(drop=True)
        half = _band_halfwidth(venue, feats)
        lo = np.clip(yhat - half, 0.0, None)
        hi = yhat + half

        reasons[venue] = {}
        for i, r in fut.iterrows():
            d = str(pd.Timestamp(r["date"]).date())
            rows.append({"venue": venue, "level": "L1", "key": None, "date": d,
                         "dow": int(r["dow"]), "yhat": float(yhat[i]),
                         "lo": float(lo[i]), "hi": float(hi[i]), "model": model,
                         "wc_match_in_hours": int(r["wc_match_in_hours"]),
                         "wc_england_in_hours": int(r["wc_england_in_hours"])})
            reasons[venue][d] = _reason(venue, r, schedule)

        if venue == "beer_hall":
            nodes, recon = _mint_l2l3(venue, ceiling, since, dates, yhat)
            split = "mint"
            for i, n in enumerate(nodes):
                if n == "VENUE":
                    continue
                level = "L2" if n.startswith("CAT::") else "L3"
                key = n.split("::", 1)[1]
                for k, d in enumerate(dates):
                    r = fut.iloc[k]
                    rows.append({"venue": venue, "level": level, "key": key,
                                 "date": str(d.date()), "dow": int(r["dow"]),
                                 "yhat": float(recon[i, k]), "lo": float("nan"),
                                 "hi": float("nan"), "model": f"{model}+mint",
                                 "wc_match_in_hours": int(r["wc_match_in_hours"]),
                                 "wc_england_in_hours": int(r["wc_england_in_hours"])})
        else:
            l2, l3 = _disagg_l2l3(venue, ceiling, dates, yhat)
            split = "disaggregation"
            for (c, d), v in l2.items():
                r = fut.iloc[list(dates).index(d)]
                rows.append({"venue": venue, "level": "L2", "key": c, "date": str(d.date()),
                             "dow": int(r["dow"]), "yhat": float(v), "lo": float("nan"),
                             "hi": float("nan"), "model": f"{model}+revshare",
                             "wc_match_in_hours": int(r["wc_match_in_hours"]),
                             "wc_england_in_hours": int(r["wc_england_in_hours"])})
            for (k, d), v in l3.items():
                r = fut.iloc[list(dates).index(d)]
                rows.append({"venue": venue, "level": "L3", "key": k, "date": str(d.date()),
                             "dow": int(r["dow"]), "yhat": float(v), "lo": float("nan"),
                             "hi": float("nan"), "model": f"{model}+revshare",
                             "wc_match_in_hours": int(r["wc_match_in_hours"]),
                             "wc_england_in_hours": int(r["wc_england_in_hours"])})

        meta_venues[venue] = {
            "dormant": False, "model": model, "train_ceiling": str(ceiling.date()),
            "l2_l3_split": split, "band_halfwidth": None if not np.isfinite(half) else round(half, 2),
            "july_l1_total": round(float(yhat.sum()), 2),
            "jul1_yhat": round(float(yhat[0]), 2),
        }
        print(f"{venue}: model={model} ceiling={ceiling.date()} split={split} "
              f"Jul1-7 L1=GBP {yhat.sum():,.0f} Jul1=GBP {yhat[0]:,.0f} band=+/-{half:,.0f}")

    _assert_fixture_flags(rows)
    frozen = pd.DataFrame(rows)
    parquet = SIM_DIR / "july2026_forecast_frozen.parquet"
    frozen.to_parquet(parquet, index=False)
    meta = {
        "artefact": "july2026_forecast_frozen",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "horizon": {"start": str(JULY_START.date()), "end": str(JULY_END.date()), "days": 7},
        "as_of": str(AS_OF.date()),
        "blind": "produced before any July 2026 actual was read; weather is the real "
                 "hindcast forecast basis for Jul 1 to 7, is_ellel_event=0 forward, wc_* "
                 "from the fixed fixture calendar",
        "level_conf": LEVEL,
        "liveness_gate": {"dormant_venues": [v for v, m in meta_venues.items() if m.get("dormant")],
                          "lookback_days": config.DORMANCY_LOOKBACK_DAYS},
        "taxonomy_refresh": f"L2/L3 top-{TOP_ITEMS_PER_CAT} nodes reselected from the recent "
                            f"{SHARE_WINDOW_DAYS}-day window ending at the cutoff (see "
                            "july2026_taxonomy_diff.json)",
        "l2_l3_method": "measured split (report 23): MinT for beer_hall, revenue-share "
                        "disaggregation for ellel, on the refreshed node set",
        "venues": meta_venues,
        "chronos_runtime": chronos2_runtime_info(),
        "caveats": [
            "7-day horizon: the reliable regime (unlike June's 30-day cold freeze).",
            "hindcast weather is a forecast product; the archived historical-forecast may "
            "reflect issues a few days before each date rather than strictly at the cutoff.",
            "the 1 Jul in-context anticipation rests on a single in-hours England date.",
        ],
        "reasons": reasons,
    }
    (SIM_DIR / "july2026_forecast_frozen.json").write_text(json.dumps(meta, indent=2))
    _write_md(meta, frozen)
    print(f"\nfrozen rows: {len(frozen)}  L1={(frozen.level=='L1').sum()} "
          f"L2={(frozen.level=='L2').sum()} L3={(frozen.level=='L3').sum()}")
    return meta


def _assert_fixture_flags(rows: list[dict]) -> None:
    """A17a.4: 1 Jul England v DR Congo (17:00) fires the England/home-nation flag for
    Beer Hall (open at 17:00); no other July date does; Ellel (shut at 17:00) does not."""
    bh = {r["date"]: r for r in rows if r["venue"] == "beer_hall" and r["level"] == "L1"}
    assert bh["2026-07-01"]["wc_england_in_hours"] == 1, "1 Jul England flag must fire for BH"
    for d, r in bh.items():
        if d != "2026-07-01":
            assert r["wc_england_in_hours"] == 0, f"only 1 Jul should fire England in-hours, got {d}"
    ellel = {r["date"]: r for r in rows if r["venue"] == "ellel" and r["level"] == "L1"}
    if "2026-07-01" in ellel:
        assert ellel["2026-07-01"]["wc_england_in_hours"] == 0, "Ellel shut at 17:00 on 1 Jul"
    print("fixture-flag assertions passed: 1 Jul England in-hours (BH only)")


def _write_md(meta: dict, frozen: pd.DataFrame) -> None:
    lines = ["# Frozen July 1 to 7 2026 forecast (pre-registration)", "",
             f"As-of cutoff {meta['as_of']}; horizon {meta['horizon']['start']} to "
             f"{meta['horizon']['end']}. {meta['blind']}", "",
             f"Liveness gate dormant: {meta['liveness_gate']['dormant_venues'] or 'none'}.", ""]
    for venue, m in meta["venues"].items():
        if m.get("dormant"):
            lines.append(f"## {venue}: DORMANT - {m['reason']}")
            lines.append("")
            continue
        lines.append(f"## {venue}  (model {m['model']}, L2/L3 {m['l2_l3_split']})")
        lines.append(f"Expected Jul 1 to 7 L1 total GBP {m['july_l1_total']:,.0f}; "
                     f"1 Jul point GBP {m['jul1_yhat']:,.0f}.")
        l1 = frozen[(frozen.venue == venue) & (frozen.level == "L1")].sort_values("date")
        lines.append("")
        lines.append("| date | yhat | lo | hi | reason |")
        lines.append("|---|---|---|---|---|")
        for _, r in l1.iterrows():
            lines.append(f"| {r['date']} | {r['yhat']:,.0f} | {r['lo']:,.0f} | {r['hi']:,.0f} "
                         f"| {meta['reasons'][venue][r['date']]} |")
        lines.append("")
    (SIM_DIR / "july2026_forecast_frozen.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    build()
