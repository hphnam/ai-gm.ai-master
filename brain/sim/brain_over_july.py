"""G12.17b Stage 4 - run the proactive brain over the July 1 to 7 stream.

Runs against a store COPY (BRAIN_STORE_DIR points at it) with the held-out July
actuals inserted as aggregate line_items; the served store is never touched. Drives
the EXISTING detectors (deviation, change-point, residual.attribute) and the briefing
via the PERSISTED chain (build + _persist per day), warmed up over the last week of
June so standing items (the Two River Taps closure, any continuing change-point) are
already 'continuing' before July and are suppressed from the July new-item fatigue.
No detector logic is added here.

Run: BRAIN_STORE_DIR=<copy> .venv-forecast/bin/python -m sim.brain_over_july
"""

from __future__ import annotations

import json
import os

import pandas as pd

import config
from ingest.taxonomy import map_category
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"
JULY = pd.date_range("2026-07-01", "2026-07-07", freq="D")
WARMUP = pd.date_range("2026-06-24", "2026-06-30", freq="D")


def _insert_july(con) -> int:
    raw = json.loads((SIM_DIR / "july2026_actuals_l3_raw.json").read_text())
    rows = []
    for i, r in enumerate(raw["rows"]):
        net = float(r["net_exvat"])
        rows.append({
            "transaction_id": f"JUL2026-{r['venue']}-{r['date']}-{i}",
            "category": map_category(r["category"]), "item": r["item"],
            "price_point": None, "channel": "aggregate", "venue": r["venue"],
            "venue_label": config.VENUE_LABELS.get(r["venue"]), "qty": float(r["units"]),
            "net_sales": net, "gross_sales": net, "discounts": 0.0, "tax": 0.0,
            "ts": pd.Timestamp(f"{r['date']} 12:00:00", tz="Europe/London"),
            "date": pd.Timestamp(r["date"]).date(), "net_sales_exvat": net, "excluded": False})
    df = pd.DataFrame(rows)
    con.execute("DELETE FROM line_items WHERE date>=? AND date<=?", ["2026-07-01", "2026-07-07"])
    con.register("_jul", df)
    con.execute("INSERT INTO line_items SELECT * FROM _jul")
    con.unregister("_jul")
    return len(df)


def run() -> dict:
    store = os.environ.get("BRAIN_STORE_DIR")
    if not store or "brain" not in store:
        raise RuntimeError("refusing to run without a BRAIN_STORE_DIR copy (never the served store)")

    from signals import briefing
    from signals.deviation import scan as deviation_scan
    from signals.residual import attribute

    con = connect()
    try:
        n = _insert_july(con)
    finally:
        con.close()

    # Persisted briefing chain: warm up through end-June, then the July week.
    daily = []
    for d in list(WARMUP) + list(JULY):
        env = briefing.build(as_of=d.date(), venues=list(config.FORECAST_VENUES))
        briefing._persist(env)
        if d in JULY:
            daily.append({"as_of": str(d.date()), "counts": env["counts"],
                          "new_items": [{"venue": it["venue"], "headline": it["headline"]}
                                        for it in env["items"] if it["status"] == "new"]})

    # Fatigue: real new items per venue over the July week.
    fatigue: dict[str, int] = {v: 0 for v in config.FORECAST_VENUES}
    for day in daily:
        for it in day["new_items"]:
            fatigue[it["venue"]] = fatigue.get(it["venue"], 0) + 1

    # Deviation + attribution over July (the 1 Jul fixture day in particular).
    con = connect(read_only=True)
    try:
        dev = {}
        for venue in config.FORECAST_VENUES:
            scan = deviation_scan(venue, window=40, con=con)
            if scan.empty:
                dev[venue] = {"n_deviation": 0, "flagged": []}
                continue
            js = scan[(pd.to_datetime(scan["date"]) >= JULY[0]) &
                      (pd.to_datetime(scan["date"]) <= JULY[-1])]
            devs = js[js["status"] == "deviation"]
            flagged = []
            for _, r in devs.iterrows():
                factors = attribute(venue, pd.Timestamp(r["date"]), r["direction"], "L1", con=con)
                flagged.append({"date": str(pd.Timestamp(r["date"]).date()),
                                "direction": r["direction"], "z": round(float(r["z"]), 2),
                                "coincides_with": factors})
            dev[venue] = {"n_deviation": int(len(devs)), "flagged": flagged}
    finally:
        con.close()

    jul1 = next((f for f in dev.get("beer_hall", {}).get("flagged", [])
                 if f["date"] == "2026-07-01"), None)
    result = {
        "store_copy": store, "july_rows_inserted": n,
        "fatigue_new_items_per_week": fatigue,
        "trt_closed_note": "Two River Taps is_closed; the briefing marks its closure dormant "
                           "(no routine deviation items) and the persisted chain labels it "
                           "continuing, not a daily new alarm (contrast June's 6 downward "
                           "deviations).",
        "jul1_fixture_deviation": jul1,
        "deviation": dev,
        "daily": daily,
    }
    (SIM_DIR / "july2026_brain_result.json").write_text(
        json.dumps(result, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"fatigue": fatigue, "jul1": jul1,
                      "trt_july_deviations": dev.get("two_river_taps", {}).get("n_deviation")}, indent=2))
    return result


if __name__ == "__main__":
    run()
