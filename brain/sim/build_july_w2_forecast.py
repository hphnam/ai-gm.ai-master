"""G12.17c-C1 - freeze the BLIND July 8 to 14 2026 forecast (pre-registration).

A second, later July window than the 1 to 7 freeze (report 26, commit 7d103aa),
built from the SAME June-inclusive store cutoff (last trade 2026-06-29, as-of
2026-06-30) and the SAME standing gate winners and config, so the two windows are
directly comparable. Its purpose is to add a second in-hours England fixture to the
in-context-learning evidence: the window contains the England quarter-final (Norway v
England, 11 Jul 22:00 London, in-hours for the Beer Hall) plus two in-hours
non-home-nation matches (France v Morocco 9 Jul, Spain v Belgium 10 Jul), so it tests
the home-nation-vs-generic distinction forward on held-out dates.

Timing (why this is a freeze, not a confront): today is 2026-07-10, so 11 to 14 July
have not happened. The 8 to 14 July window is partly in the future, which makes the
pre-registration airtight by CALENDAR, not just by commit ordering. The artefact is
committed before any 8 to 14 July actual exists; Step C2 confronts it in a later
session strictly after 2026-07-14. No 8 to 14 July observation enters this pass.

Known-future covariates are computed exactly as the 1 to 7 freeze: calendar / term /
bank-holiday and the World Cup wc_* (incl. home-nation flags) forward, is_ellel_event
0 forward (blind), weather on the real hindcast forecast basis (retrieved into the
store for 8 to 14 July, a genuine forward forecast). L2/L3 use the measured split
(report 23): MinT for the Beer Hall, revenue-share disaggregation for Ellel, on the
refreshed node set. The liveness gate keeps Two River Taps dormant (not forecast).

Run (needs .venv-forecast with chronos):
    .venv-forecast/bin/python -m sim.build_july_w2_forecast
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd

import config
from features.build_features import build_features
from hierarchy.reconcile import _dow_median_forecast
from ingest.world_cup import read_world_cup_schedule
from models.foundation import chronos2_runtime_info
from sim.build_frozen_forecast import (
    GATE_WINNER,
    LEVEL,
    SHARE_WINDOW_DAYS,
    TOP_ITEMS_PER_CAT,
    _band_halfwidth,
    _l1_point,
    _reason,
)
from sim.build_july_forecast import (
    WEATHER_BASIS,
    _disagg_l2l3,
    _future_frame,
    _mint_l2l3,
    _revenue_hierarchy,
    _served_winner,
)
from store.active_span import is_dormant, trim_to_active
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"
WIN_START = pd.Timestamp("2026-07-08")
WIN_END = pd.Timestamp("2026-07-14")
AS_OF = pd.Timestamp("2026-06-30")


def _win_dates() -> pd.DatetimeIndex:
    return pd.date_range(WIN_START, WIN_END, freq="D")


def _baseline(venue: str, ceiling: pd.Timestamp, since: pd.Timestamp,
              dates: pd.DatetimeIndex) -> np.ndarray:
    """Per-date DOW-median baseline of the venue L1 revenue series - the 'normal for
    that weekday' line the freeze's fixture-day points are compared against, so the
    expectation notes can state in advance whether the model lifts a fixture date
    above its weekday baseline."""
    ns, _, _ = _revenue_hierarchy(venue, ceiling, since)
    base, _ = _dow_median_forecast(ns["VENUE"], dates)
    return base


def build() -> dict:
    SIM_DIR.mkdir(parents=True, exist_ok=True)
    schedule = read_world_cup_schedule()
    schedule = schedule.assign(date=pd.to_datetime(schedule["date"]).dt.normalize())
    dates = _win_dates()
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

        # Forward expectation notes (stated before any actual): does the model lift the
        # 11 Jul England QF above its Saturday baseline, and the 9/10 Jul generic dates?
        byd = {str(pd.Timestamp(d).date()): (float(yhat[k]), float(base[k]))
               for k, d in enumerate(dates)}
        fixtures = {}
        for fdate, label in [("2026-07-11", "england_qf_in_hours"),
                             ("2026-07-09", "generic_france_morocco"),
                             ("2026-07-10", "generic_spain_belgium")]:
            if fdate in byd:
                fy, fb = byd[fdate]
                fixtures[fdate] = {"label": label, "yhat": round(fy, 2),
                                   "dow_baseline": round(fb, 2),
                                   "lift_over_baseline": round(fy - fb, 2),
                                   "anticipates_lift": bool(fy > fb)}

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
    parquet = SIM_DIR / "july2026_w2_forecast_frozen.parquet"
    frozen.to_parquet(parquet, index=False)
    meta = {
        "artefact": "july2026_w2_forecast_frozen",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "horizon": {"start": str(WIN_START.date()), "end": str(WIN_END.date()), "days": 7},
        "as_of": str(AS_OF.date()),
        "blind": "produced 2026-07-10 before any 8 to 14 July 2026 actual existed; 11 to 14 "
                 "July are genuinely in the future, so the pre-registration is airtight by "
                 "calendar. Weather is the real hindcast forecast basis for 8 to 14 July, "
                 "is_ellel_event=0 forward, wc_* from the fixed fixture calendar",
        "level_conf": LEVEL,
        "sibling_window": {"artefact": "july2026_forecast_frozen", "commit": "7d103aa",
                           "note": "the 1 to 7 July freeze; same models, same config, same "
                                   "June-inclusive cutoff, comparable"},
        "liveness_gate": {"dormant_venues": [v for v, m in meta_venues.items() if m.get("dormant")],
                          "lookback_days": config.DORMANCY_LOOKBACK_DAYS},
        "weather_basis": WEATHER_BASIS,
        "l2_l3_method": "measured split (report 23): MinT for beer_hall, revenue-share "
                        "disaggregation for ellel, on the refreshed node set",
        "venues": meta_venues,
        "chronos_runtime": chronos2_runtime_info(),
        "caveats": [
            "same June-inclusive cutoff as the 1 to 7 freeze: an 9 to 15 day-ahead horizon, "
            "longer than the reliable 7-day regime, chosen for comparability not accuracy.",
            "hindcast weather is a forecast product; for 11 to 14 July it is the live "
            "forward forecast retrieved 2026-07-10.",
            "two in-hours England dates (1 Jul + 11 Jul) is still a small sample; the "
            "in-context signal stays directional, never a proven effect.",
        ],
        "reasons": reasons,
    }
    (SIM_DIR / "july2026_w2_forecast_frozen.json").write_text(json.dumps(meta, indent=2))
    _write_md(meta, frozen)
    print(f"\nfrozen rows: {len(frozen)}  L1={(frozen.level=='L1').sum()} "
          f"L2={(frozen.level=='L2').sum()} L3={(frozen.level=='L3').sum()}")
    return meta


def _assert_fixture_flags(rows: list[dict]) -> None:
    """A17c.1 flag checks for the 8 to 14 July window, on the venue that carries the
    wc covariates (Beer Hall, the pub open at 22:00):
      * 11 Jul Norway v England 22:00 fires England + home-nation in-hours;
      * 9 Jul France v Morocco 21:00 and 10 Jul Spain v Belgium 20:00 fire generic
        match-in-hours but NOT England / home-nation;
      * 12 Jul 02:00 Argentina v Switzerland fires no flag (out of hours).
    Ellel is handled separately below: its data-derived Saturday window runs late
    enough to overlap the 22:00 match, so its 11 Jul England flag fires too - a
    deviation from the spec's assumption, recorded honestly, inert because Ellel's
    served model (robust-DOW) consumes no wc covariate."""
    bh = {r["date"]: r for r in rows if r["venue"] == "beer_hall" and r["level"] == "L1"}
    assert bh["2026-07-11"]["wc_england_in_hours"] == 1, "11 Jul England flag must fire for BH"
    assert bh["2026-07-11"]["wc_home_nation_in_hours"] == 1, "11 Jul home-nation flag must fire for BH"
    for d in ("2026-07-09", "2026-07-10"):
        assert bh[d]["wc_match_in_hours"] == 1, f"{d} generic match must be in-hours for BH"
        assert bh[d]["wc_england_in_hours"] == 0, f"{d} is non-home-nation, no England flag"
        assert bh[d]["wc_home_nation_in_hours"] == 0, f"{d} is non-home-nation, no home flag"
    assert bh["2026-07-12"]["wc_match_in_hours"] == 0, "12 Jul 02:00 is out of hours, no flag"
    for d, r in bh.items():
        if d != "2026-07-11":
            assert r["wc_england_in_hours"] == 0, f"only 11 Jul fires England in-hours, got {d}"
    print("fixture-flag assertions passed: 11 Jul England+home-nation, 9/10 Jul generic, "
          "12 Jul out-of-hours (Beer Hall)")


def _write_md(meta: dict, frozen: pd.DataFrame) -> None:
    lines = ["# Frozen July 8 to 14 2026 forecast (pre-registration, second window)", "",
             f"As-of cutoff {meta['as_of']}; horizon {meta['horizon']['start']} to "
             f"{meta['horizon']['end']}. {meta['blind']}", "",
             f"Liveness gate dormant: {meta['liveness_gate']['dormant_venues'] or 'none'}. "
             f"Sibling window: the 1 to 7 July freeze ({meta['sibling_window']['commit']}).", ""]
    for venue, m in meta["venues"].items():
        if m.get("dormant"):
            lines.append(f"## {venue}: DORMANT - {m['reason']}")
            lines.append("")
            continue
        lines.append(f"## {venue}  (model {m['model']}, L2/L3 {m['l2_l3_split']})")
        lines.append(f"Expected Jul 8 to 14 L1 total GBP {m['window_l1_total']:,.0f}; "
                     f"11 Jul (England QF, Saturday) point GBP {m['jul11_yhat']:,.0f}.")
        lines.append("")
        lines.append("Forward expectation (stated before any actual):")
        for fdate, fx in m["fixture_expectations"].items():
            verb = "lifts ABOVE" if fx["anticipates_lift"] else "does NOT lift above"
            lines.append(f"- {fdate} {fx['label']}: yhat GBP {fx['yhat']:,.0f} {verb} the "
                         f"weekday baseline GBP {fx['dow_baseline']:,.0f} "
                         f"(delta GBP {fx['lift_over_baseline']:+,.0f})")
        l1 = frozen[(frozen.venue == venue) & (frozen.level == "L1")].sort_values("date")
        lines.append("")
        lines.append("| date | yhat | lo | hi | reason |")
        lines.append("|---|---|---|---|---|")
        for _, r in l1.iterrows():
            lines.append(f"| {r['date']} | {r['yhat']:,.0f} | {r['lo']:,.0f} | {r['hi']:,.0f} "
                         f"| {meta['reasons'][venue][r['date']]} |")
        lines.append("")
    (SIM_DIR / "july2026_w2_forecast_frozen.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    build()
