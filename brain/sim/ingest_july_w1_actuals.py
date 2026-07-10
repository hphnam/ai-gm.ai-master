"""G12.17c-b-1 - advance the operational clock through 7 July: ingest 1 to 7 July
as observed history.

The live system refreshes every 7 days (`RETRAIN_CADENCE_DAYS`), so by 8 July it
would have ingested the 1 to 7 July week as observed history and forecast 8 to 14 July
from a 7 JULY cutoff (a true 7-day-ahead forecast), not from end-June. This advances
the served store's operational clock to that production-faithful cutoff.

Legitimate now because 1 to 7 July are past and were already scored held-out in
G12.17b (their 1 to 7 pre-registration, `7d103aa`, is complete): they are observed
history, and the corrected freeze forecasts FORWARD from them (8 to 14 July). The
"NEVER written to served store" note in the raw file was the confront-time blindness
constraint, now discharged for this past week.

Same labelled aggregate path as the June ingest (`sim/ingest_june_actuals.py`): one
synthetic line per (venue, date, category, item) at the modelling grain the L1/L2/L3
views aggregate. Idempotent (deletes any existing 1 to 7 July rows first). The frozen
1 to 7 July artefact (`7d103aa`) is not read or written here.

Run: .venv-forecast/bin/python -m sim.ingest_july_w1_actuals
"""

from __future__ import annotations

import json
from datetime import datetime

import pandas as pd

import config
from ingest.refresh import _advance_watermark, _ensure_tables
from ingest.taxonomy import map_category
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"
JULY_START = "2026-07-01"
JULY_END = "2026-07-07"
AS_OF = "2026-07-07"  # advanced operational cutoff (production 7-day cadence)
SOURCE = "mcp-sim-aggregate-july2026-w1"


def _build_line_items() -> pd.DataFrame:
    raw = json.loads((SIM_DIR / "july2026_actuals_l3_raw.json").read_text())
    rows = []
    for i, r in enumerate(raw["rows"]):
        venue = r["venue"]
        cat = map_category(r["category"])  # Square -> brain spelling, loud on unmapped
        net = float(r["net_exvat"])
        d = pd.Timestamp(r["date"]).date()
        rows.append({
            "transaction_id": f"JUL2026W1-{venue}-{r['date']}-{i}",
            "category": cat,
            "item": r["item"],
            "price_point": None,
            "channel": "aggregate",
            "venue": venue,
            "venue_label": config.VENUE_LABELS.get(venue),
            "qty": float(r["units"]),
            "net_sales": net,
            "gross_sales": net,
            "discounts": 0.0,
            "tax": 0.0,
            "ts": pd.Timestamp(f"{r['date']} 12:00:00", tz="Europe/London"),
            "date": d,
            "net_sales_exvat": net,
            "excluded": False,
        })
    return pd.DataFrame(rows)


def _reconcile(con) -> dict:
    """1 to 7 July store views vs the held-out pull totals, per venue."""
    out = {}
    a1 = pd.DataFrame(json.loads((SIM_DIR / "july2026_actuals_l1_raw.json").read_text())["rows"])
    for venue in ("beer_hall", "ellel"):
        l1_store = con.execute(
            "SELECT SUM(revenue_exvat) FROM l1_daily WHERE venue=? AND date>=? AND date<=?",
            [venue, JULY_START, JULY_END]).fetchone()[0] or 0.0
        l3_store = con.execute(
            "SELECT SUM(revenue_exvat) FROM l3_item_daily WHERE venue=? AND date>=? AND date<=?",
            [venue, JULY_START, JULY_END]).fetchone()[0] or 0.0
        salesuk_l1 = float(a1[a1.venue == venue]["net_exvat"].sum())
        out[venue] = {
            "store_l1_exvat": round(float(l1_store), 2),
            "store_l3_exvat": round(float(l3_store), 2),
            "salesuk_l1_exvat": round(salesuk_l1, 2),
            "l1_minus_salesuk": round(float(l1_store) - salesuk_l1, 2),
        }
    return out


def run() -> dict:
    con = connect()
    try:
        _ensure_tables(con)
        june = con.execute(
            "SELECT COUNT(*) FROM line_items WHERE date>='2026-06-01' AND date<='2026-06-30'"
        ).fetchone()[0]
        if june == 0:
            raise RuntimeError(
                "store is not June-inclusive (0 June rows); re-ingest June first "
                "(sim.ingest_june_actuals) before advancing to 7 July")

        con.execute("DELETE FROM line_items WHERE date>=? AND date<=?", [JULY_START, JULY_END])
        li = _build_line_items()
        con.register("_july", li)
        con.execute("INSERT INTO line_items SELECT * FROM _july")
        con.unregister("_july")

        for venue in ("beer_hall", "ellel"):
            last = con.execute(
                "SELECT max(date) FROM line_items WHERE venue=? AND date>=? AND date<=?",
                [venue, JULY_START, JULY_END]).fetchone()[0]
            n = int((li.venue == venue).sum())
            _advance_watermark(con, venue, "L1", last, SOURCE, n)

        ceiling = con.execute("SELECT max(date) FROM l1_daily").fetchone()[0]
        present = con.execute(
            "SELECT COUNT(DISTINCT date) FROM line_items WHERE date>=? AND date<=?",
            [JULY_START, JULY_END]).fetchone()[0]
        recon = _reconcile(con)
    finally:
        con.close()

    if int(present) != 7:
        raise RuntimeError(f"expected 7 July days present, got {present}")

    result = {"rows_inserted": int(len(li)), "store_ceiling": str(ceiling),
              "july_days_present": int(present), "as_of": AS_OF, "reconcile": recon}
    print(json.dumps(result, indent=2))
    _update_manifest(int(len(li)), str(ceiling))
    return result


def _update_manifest(n_rows: int, ceiling: str) -> None:
    path = config.BRAIN_DIR / "store" / "manifest.json"
    manifest = json.loads(path.read_text())
    manifest["july2026_w1_ingest"] = {
        "ingested_at": datetime.now().isoformat(),
        "mode": "MCP-SIM aggregate (Neon not provisioned)",
        "grain": "one line per venue/date/category/item from the held-out ProductMix "
                 "item pull; aggregate-sourced, no intraday or tax breakdown",
        "source_file": "sim/july2026_actuals_l3_raw.json",
        "rows_inserted": n_rows,
        "store_ceiling": ceiling,
        "as_of": AS_OF,
        "venues": ["beer_hall", "ellel"],
        "note": "Advances the operational clock to the production 7-day-cadence cutoff "
                "(7 July) so the 8 to 14 July re-freeze (Origin B) is a true 7-day-ahead "
                "forecast. 1 to 7 July are past and already scored held-out in G12.17b; "
                "now observed history. Two River Taps dormant (no July rows).",
    }
    path.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    run()
