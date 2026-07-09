"""G12.13b Stage 3 - run the EXISTING proactive-brain modules over the June stream.

Runs against a store COPY (BRAIN_STORE_DIR must point at it, with June actuals
already appended as synthetic line_items). The served store is never touched.
Drives signals.deviation, signals.change_point, signals.residual.attribute, and
signals.briefing unchanged - no detector is reimplemented here.

Run: BRAIN_STORE_DIR=<copy> .venv-forecast/bin/python -m sim.brain_over_june
"""

from __future__ import annotations

import json
import os

import pandas as pd

import config
from store.warehouse import connect

JUNE_LO = pd.Timestamp("2026-06-01").date()
JUNE_HI = pd.Timestamp("2026-06-30").date()


def _june(df: pd.DataFrame, col: str) -> pd.DataFrame:
    d = pd.to_datetime(df[col]).dt.date
    return df[(d >= JUNE_LO) & (d <= JUNE_HI)]


def run() -> dict:
    from signals.deviation import scan as deviation_scan
    from signals.change_point import detect as changepoint_detect
    from signals.residual import attribute
    from signals.briefing import build as briefing_build

    result = {"store": os.environ.get("BRAIN_STORE_DIR"), "venues": {}}
    con = connect(read_only=True)
    try:
        for venue in config.FORECAST_VENUES:
            v: dict = {}
            # Deviation scan over a window covering June.
            scan = deviation_scan(venue, window=45, con=con)
            jscan = _june(scan, "date") if not scan.empty else scan
            devs = jscan[jscan["status"] == "deviation"] if not jscan.empty else jscan
            v["deviation"] = {
                "june_days_scanned": int(len(jscan)),
                "n_deviation": int(len(devs)),
                "flagged": [
                    {"date": str(r["date"]), "actual": float(r["actual"]),
                     "expected": float(r["expected"]), "z": float(r["z"]),
                     "direction": r["direction"], "severity": r["severity"]}
                    for _, r in devs.iterrows()],
            }
            # Attribution for each flagged June deviation (existing module).
            attr = []
            for _, r in devs.iterrows():
                factors = attribute(venue, pd.Timestamp(r["date"]), r["direction"],
                                    "L1", con=con)
                attr.append({"date": str(r["date"]), "direction": r["direction"],
                             "coincides_with": factors})
            v["attribution"] = attr
            # Change-point detection.
            cps = changepoint_detect(venue, con=con)
            jcp = _june(cps, "onset_date") if not cps.empty else cps
            v["change_point"] = {
                "n_june_onsets": int(len(jcp)),
                "onsets": [
                    {"onset": str(r["onset_date"]), "direction": r["direction"],
                     "magnitude_pct": float(r["magnitude_pct"]) if pd.notna(r["magnitude_pct"]) else None,
                     "detector": r["detector"], "severity": r["severity"]}
                    for _, r in jcp.iterrows()] if not jcp.empty else [],
            }
            result["venues"][venue] = v

        # Briefing: the daily brief the manager would receive across June.
        brief_days = pd.date_range(JUNE_LO, JUNE_HI, freq="D")
        surfaced = []
        for d in brief_days:
            env = briefing_build(as_of=d.date(), venues=list(config.FORECAST_VENUES),
                                 con=con)
            items = env.get("items", [])
            if items:
                surfaced.append({
                    "date": str(d.date()),
                    "n_items": len(items),
                    "headlines": [it["headline"] for it in items[:4]],
                })
        n_days = len(brief_days)
        n_surfaced_days = len(surfaced)
        result["briefing"] = {
            "june_days": n_days,
            "days_with_surface": n_surfaced_days,
            "surface_rate": round(n_surfaced_days / n_days, 3),
            "total_items": int(sum(s["n_items"] for s in surfaced)),
            "items_per_week": round(sum(s["n_items"] for s in surfaced) / (n_days / 7), 2),
            "surfaced": surfaced,
        }

        # Stock cover (beer_hall only), existing table.
        has = con.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name='stock_cover'"
        ).fetchone()
        if has:
            sc = con.execute(
                "SELECT product_canon, days_of_cover, reorder_flag FROM stock_cover "
                "WHERE venue='beer_hall' ORDER BY days_of_cover ASC NULLS LAST LIMIT 8"
            ).df()
            result["stock_cover_beer_hall"] = [
                {"product": r["product_canon"],
                 "days_of_cover": float(r["days_of_cover"]) if pd.notna(r["days_of_cover"]) else None,
                 "reorder": bool(r["reorder_flag"]) if pd.notna(r["reorder_flag"]) else None}
                for _, r in sc.iterrows()]
        else:
            result["stock_cover_beer_hall"] = "no stock_cover table in copy"
    finally:
        con.close()

    out = config.BRAIN_DIR / "sim" / "june2026_brain_result.json"
    out.write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    run()
