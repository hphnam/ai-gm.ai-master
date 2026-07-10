"""G12.17c-b-2 - re-freeze the BLIND 8 to 14 July forecast from the 7 JULY cutoff
(Origin B, production-faithful 7-day horizon).

Corrects the horizon inconsistency in the first C1 (report 28, Origin A `a590f91`),
which forecast 8 to 14 July from a 29-June cutoff (9 to 15 day-ahead) "for
comparability" and so denied the model the very context the in-context test measures.
The live system refreshes every 7 days, so by 8 July it would forecast 8 to 14 July
from a 7 July cutoff, WITH the 1 July England fixture and its observed uplift in
context. This freeze does exactly that: same standing gate winners and config as Origin
A, differing ONLY in cutoff, so Step C2 can score both origins against the held-out 8
to 14 July actuals and isolate the value of the extra week of context.

Still pre-registered: 11 to 14 July are in the future at freeze time (2026-07-10), so
the target does not exist yet. Origin A stands committed and untouched; this adds a
second origin, not a replacement. No 8 to 14 July actual is read.

Run (needs .venv-forecast with chronos, store advanced to 7 July via
sim.ingest_july_w1_actuals):
    .venv-forecast/bin/python -m sim.build_july_w2b_forecast
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd

import config
from features.build_features import build_features
from ingest.world_cup import read_world_cup_schedule
from models.foundation import chronos2_runtime_info
from sim.build_frozen_forecast import (
    LEVEL,
    SHARE_WINDOW_DAYS,
    _band_halfwidth,
    _l1_point,
    _reason,
)
from sim.build_july_forecast import (
    WEATHER_BASIS,
    _disagg_l2l3,
    _future_frame,
    _mint_l2l3,
    _served_winner,
)
from sim.build_july_w2_forecast import (
    WIN_END,
    WIN_START,
    _assert_fixture_flags,
    _baseline,
    _win_dates,
)
from store.active_span import is_dormant, trim_to_active
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"
AS_OF = pd.Timestamp("2026-07-07")  # production 7-day-cadence cutoff (Origin B)
ORIGIN_A = "july2026_w2_forecast_frozen"
FIXTURE_LABELS = {"2026-07-11": "england_qf_in_hours",
                  "2026-07-09": "generic_france_morocco",
                  "2026-07-10": "generic_spain_belgium"}


def _origin_a_expectations() -> dict:
    """Origin A's per-venue pre-registered fixture expectations (read-only), so the
    two origins' expectations sit side by side. Origin A is never modified."""
    a = json.loads((SIM_DIR / f"{ORIGIN_A}.json").read_text())
    return {v: m.get("fixture_expectations", {}) for v, m in a["venues"].items()
            if not m.get("dormant")}


def build() -> dict:
    SIM_DIR.mkdir(parents=True, exist_ok=True)
    # Guard: the store must be advanced to 7 July for this to be a true 7-day horizon.
    con = connect(read_only=True)
    try:
        ceiling_store = pd.Timestamp(con.execute("SELECT max(date) FROM l1_daily").fetchone()[0])
    finally:
        con.close()
    if ceiling_store.normalize() < AS_OF:
        raise RuntimeError(
            f"store ceiling {ceiling_store.date()} < {AS_OF.date()}; run "
            "sim.ingest_july_w1_actuals first to advance the clock to 7 July")

    schedule = read_world_cup_schedule()
    schedule = schedule.assign(date=pd.to_datetime(schedule["date"]).dt.normalize())
    dates = _win_dates()
    origin_a = _origin_a_expectations()
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
        # after the ceiling through 14 Jul, then emit only the 8 to 14 Jul window.
        pred_dates = pd.date_range(ceiling + pd.Timedelta(days=1), WIN_END, freq="D")
        fut_pred = _future_frame(venue, pred_dates)
        assert set(dates) <= fut_pred.attrs["real_weather_dates"], \
            f"{venue}: 8 to 14 Jul window lacks real forecast weather"
        yhat_pred = _l1_point(venue, feats, fut_pred)
        pos = {pd.Timestamp(d): k for k, d in enumerate(pred_dates)}
        widx = [pos[d] for d in dates]
        yhat = yhat_pred[widx]
        fut = fut_pred.iloc[widx].reset_index(drop=True)
        half = _band_halfwidth(venue, feats)
        lo = np.clip(yhat - half, 0.0, None)
        hi = yhat + half
        base = _baseline(venue, ceiling, since, dates)

        reasons[venue] = {}
        for i, r in fut.iterrows():
            d = str(pd.Timestamp(r["date"]).date())
            rows.append({"venue": venue, "level": "L1", "key": None, "date": d,
                         "dow": int(r["dow"]), "yhat": float(yhat[i]),
                         "lo": float(lo[i]), "hi": float(hi[i]), "model": model,
                         "wc_match_in_hours": int(r["wc_match_in_hours"]),
                         "wc_england_in_hours": int(r["wc_england_in_hours"]),
                         "wc_home_nation_in_hours": int(r["wc_home_nation_in_hours"])})
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
                                 "wc_england_in_hours": int(r["wc_england_in_hours"]),
                                 "wc_home_nation_in_hours": int(r["wc_home_nation_in_hours"])})
        else:
            l2, l3 = _disagg_l2l3(venue, ceiling, dates, yhat)
            split = "disaggregation"
            for (c, d), v in l2.items():
                r = fut.iloc[list(dates).index(d)]
                rows.append({"venue": venue, "level": "L2", "key": c, "date": str(d.date()),
                             "dow": int(r["dow"]), "yhat": float(v), "lo": float("nan"),
                             "hi": float("nan"), "model": f"{model}+revshare",
                             "wc_match_in_hours": int(r["wc_match_in_hours"]),
                             "wc_england_in_hours": int(r["wc_england_in_hours"]),
                             "wc_home_nation_in_hours": int(r["wc_home_nation_in_hours"])})
            for (k, d), v in l3.items():
                r = fut.iloc[list(dates).index(d)]
                rows.append({"venue": venue, "level": "L3", "key": k, "date": str(d.date()),
                             "dow": int(r["dow"]), "yhat": float(v), "lo": float("nan"),
                             "hi": float("nan"), "model": f"{model}+revshare",
                             "wc_match_in_hours": int(r["wc_match_in_hours"]),
                             "wc_england_in_hours": int(r["wc_england_in_hours"]),
                             "wc_home_nation_in_hours": int(r["wc_home_nation_in_hours"])})

        # Origin B pre-registered expectations, with Origin A alongside for each fixture.
        byd = {str(pd.Timestamp(d).date()): (float(yhat[k]), float(base[k]))
               for k, d in enumerate(dates)}
        a_fx = origin_a.get(venue, {})
        fixtures = {}
        for fdate, label in FIXTURE_LABELS.items():
            if fdate not in byd:
                continue
            fy, fb = byd[fdate]
            a = a_fx.get(fdate, {})
            fixtures[fdate] = {
                "label": label, "yhat": round(fy, 2), "dow_baseline": round(fb, 2),
                "lift_over_baseline": round(fy - fb, 2), "anticipates_lift": bool(fy > fb),
                "origin_a_yhat": a.get("yhat"), "origin_a_lift": a.get("lift_over_baseline"),
                "b_minus_a_lift": (None if a.get("lift_over_baseline") is None
                                   else round((fy - fb) - a["lift_over_baseline"], 2)),
            }

        meta_venues[venue] = {
            "dormant": False, "model": model, "train_ceiling": str(ceiling.date()),
            "l2_l3_split": split, "band_halfwidth": None if not np.isfinite(half) else round(half, 2),
            "window_l1_total": round(float(yhat.sum()), 2),
            "jul11_yhat": round(float(byd["2026-07-11"][0]), 2),
            "fixture_expectations": fixtures,
        }
        print(f"{venue}: model={model} ceiling={ceiling.date()} split={split} "
              f"Jul8-14 L1=GBP {yhat.sum():,.0f} Jul11=GBP {byd['2026-07-11'][0]:,.0f} "
              f"(Sat base GBP {byd['2026-07-11'][1]:,.0f}) band=+/-{half:,.0f}")

    _assert_fixture_flags(rows)
    frozen = pd.DataFrame(rows)
    parquet = SIM_DIR / "july2026_w2b_forecast_frozen.parquet"
    frozen.to_parquet(parquet, index=False)

    # Sharpening hypothesis: does Origin B lift the 11 Jul England date MORE than Origin A?
    bh_11 = meta_venues.get("beer_hall", {}).get("fixture_expectations", {}).get("2026-07-11", {})
    sharpen = {
        "beer_hall_jul11_origin_a_lift": bh_11.get("origin_a_lift"),
        "beer_hall_jul11_origin_b_lift": bh_11.get("lift_over_baseline"),
        "b_minus_a": bh_11.get("b_minus_a_lift"),
        "origin_b_sharpens_england_anticipation": (
            None if bh_11.get("b_minus_a_lift") is None else bool(bh_11["b_minus_a_lift"] > 0)),
    }

    meta = {
        "artefact": "july2026_w2b_forecast_frozen",
        "origin": "B", "cutoff": str(AS_OF.date()), "horizon_days_ahead": "1 to 7 (true)",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "horizon": {"start": str(WIN_START.date()), "end": str(WIN_END.date()), "days": 7},
        "as_of": str(AS_OF.date()),
        "blind": "produced 2026-07-10 before any 8 to 14 July 2026 actual existed; 11 to 14 "
                 "July are in the future. Cutoff 2026-07-07 (production 7-day cadence), so the "
                 "1 July England fixture and its observed uplift are IN the model context. "
                 "Weather is the real hindcast forecast basis for 8 to 14 July, is_ellel_event=0 "
                 "forward, wc_* from the fixed fixture calendar",
        "level_conf": LEVEL,
        "origin_a": {"artefact": ORIGIN_A, "commit": "a590f91", "cutoff": "2026-06-30",
                     "note": "9 to 15 day-ahead, no July fixture in context; stands untouched"},
        "corrects": "report 28 horizon inconsistency: Origin B is the true 7-day-ahead "
                    "forecast the live system serves; differs from Origin A ONLY by cutoff",
        "sharpening_hypothesis": sharpen,
        "liveness_gate": {"dormant_venues": [v for v, m in meta_venues.items() if m.get("dormant")],
                          "lookback_days": config.DORMANCY_LOOKBACK_DAYS},
        "weather_basis": WEATHER_BASIS,
        "l2_l3_method": "measured split (report 23): MinT for beer_hall, revenue-share "
                        "disaggregation for ellel, on the refreshed node set",
        "venues": meta_venues,
        "chronos_runtime": chronos2_runtime_info(),
        "caveats": [
            "true 7-day-ahead horizon, the regime the system actually serves (unlike Origin A).",
            "hindcast weather is a forecast product; for 11 to 14 July it is the live forward "
            "forecast retrieved 2026-07-10.",
            "two in-hours England dates (1 Jul + 11 Jul) is still a small sample; the in-context "
            "signal stays directional. C2 scores both origins against the held-out actuals.",
        ],
        "reasons": reasons,
    }
    (SIM_DIR / "july2026_w2b_forecast_frozen.json").write_text(json.dumps(meta, indent=2))
    _write_md(meta, frozen)
    print(f"\nfrozen rows: {len(frozen)}  L1={(frozen.level=='L1').sum()} "
          f"L2={(frozen.level=='L2').sum()} L3={(frozen.level=='L3').sum()}")
    print(f"sharpening: {json.dumps(sharpen)}")
    return meta


def _write_md(meta: dict, frozen: pd.DataFrame) -> None:
    s = meta["sharpening_hypothesis"]
    lines = ["# Frozen July 8 to 14 2026 forecast (pre-registration, Origin B: 7 July cutoff)",
             "",
             f"As-of cutoff {meta['as_of']} (production 7-day cadence); horizon "
             f"{meta['horizon']['start']} to {meta['horizon']['end']}, a true 7-day-ahead "
             f"forecast. {meta['blind']}", "",
             f"Corrects report 28's Origin A ({meta['origin_a']['commit']}, 29-June cutoff, "
             f"9 to 15 day-ahead), which stands untouched. Liveness gate dormant: "
             f"{meta['liveness_gate']['dormant_venues'] or 'none'}.", "",
             "## Sharpening hypothesis (Beer Hall, 11 July England QF)", "",
             f"Origin A lifted 11 July GBP {s['beer_hall_jul11_origin_a_lift']:+,.0f} over the "
             f"Saturday baseline; Origin B lifts it GBP {s['beer_hall_jul11_origin_b_lift']:+,.0f}. "
             f"Origin B {'DOES' if s['origin_b_sharpens_england_anticipation'] else 'does NOT'} "
             f"sharpen the England anticipation with the extra week of context "
             f"(delta GBP {s['b_minus_a']:+,.0f}). C2 scores both against the actual.", ""]
    for venue, m in meta["venues"].items():
        if m.get("dormant"):
            lines.append(f"## {venue}: DORMANT - {m['reason']}")
            lines.append("")
            continue
        lines.append(f"## {venue}  (model {m['model']}, L2/L3 {m['l2_l3_split']}, "
                     f"ceiling {m['train_ceiling']})")
        lines.append(f"Expected Jul 8 to 14 L1 total GBP {m['window_l1_total']:,.0f}; "
                     f"11 Jul (England QF, Saturday) point GBP {m['jul11_yhat']:,.0f}.")
        lines.append("")
        lines.append("Pre-registered expectation, Origin B vs Origin A (yhat lift over weekday baseline):")
        lines.append("")
        lines.append("| date | fixture | B yhat | B lift | A lift | B - A |")
        lines.append("|---|---|---|---|---|---|")
        for fdate, fx in m["fixture_expectations"].items():
            al = fx["origin_a_lift"]
            bml = fx["b_minus_a_lift"]
            lines.append(f"| {fdate} | {fx['label']} | {fx['yhat']:,.0f} | "
                         f"{fx['lift_over_baseline']:+,.0f} | "
                         f"{'n/a' if al is None else format(al, '+,.0f')} | "
                         f"{'n/a' if bml is None else format(bml, '+,.0f')} |")
        l1 = frozen[(frozen.venue == venue) & (frozen.level == "L1")].sort_values("date")
        lines.append("")
        lines.append("| date | yhat | lo | hi | reason |")
        lines.append("|---|---|---|---|---|")
        for _, r in l1.iterrows():
            lines.append(f"| {r['date']} | {r['yhat']:,.0f} | {r['lo']:,.0f} | {r['hi']:,.0f} "
                         f"| {meta['reasons'][venue][r['date']]} |")
        lines.append("")
    (SIM_DIR / "july2026_w2b_forecast_frozen.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    build()
