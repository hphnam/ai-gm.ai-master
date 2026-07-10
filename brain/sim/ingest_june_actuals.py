"""G12.17a-0 - advance the operational clock: ingest June 2026 as observed history.

MCP-SIM fallback path (Neon not provisioned). Ingests the held-out June eval files
into the served store's `line_items` base table at AGGREGATE grain: one synthetic
line per (venue, date, category, item) carrying that cell's ex-VAT net sales and
units. That is the modelling grain the forecast consumes (the L1/L2/L3 views
aggregate line_items by day), so it is a clean fit, not fabricated per-order detail;
the manifest labels June rows aggregate-sourced with no intraday/tax breakdown.

Source: `sim/june2026_actuals_l3_raw.json` (item grain, G12.16), which reconciles to
the L2 pull to GBP 0.00, so rebuilding L1/L2/L3 from it keeps all three coherent.
The two null-item Square residual rows are inserted with item NULL (they feed L1/L2
but not L3, matching the view's `item IS NOT NULL` filter). Categories are mapped to
brain spelling through the taxonomy map (Uncategorized to Uncategorised).

Idempotent: deletes any existing June rows first. Advances the L1 watermark per
venue. Two River Taps has no June rows (closed since 2026-05-08) and is not touched.
The frozen June artefact is not read or written here.

Run: .venv-forecast/bin/python -m sim.ingest_june_actuals
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
JUNE_START = "2026-06-01"
JUNE_END = "2026-06-30"
AS_OF = "2026-06-30"  # operational cutoff; no venue traded on the 30th itself
SOURCE = "mcp-sim-aggregate-june2026"


def _build_line_items() -> pd.DataFrame:
    raw = json.loads((SIM_DIR / "june2026_actuals_l3_raw.json").read_text())
    rows = []
    for i, r in enumerate(raw["rows"]):
        venue = r["venue"]
        cat = map_category(r["category"])  # Square -> brain spelling, loud on unmapped
        net = float(r["net_exvat"])
        d = pd.Timestamp(r["date"]).date()
        rows.append({
            "transaction_id": f"JUN2026-{venue}-{r['date']}-{i}",
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
    """June store views vs the held-out pull totals, per venue."""
    out = {}
    a1 = pd.DataFrame(json.loads((SIM_DIR / "june2026_actuals_l1_raw.json").read_text())["rows"])
    for venue in ("beer_hall", "ellel"):
        l1_store = con.execute(
            "SELECT SUM(revenue_exvat) FROM l1_daily WHERE venue=? AND date>=? AND date<=?",
            [venue, JUNE_START, JUNE_END]).fetchone()[0] or 0.0
        l3_store = con.execute(
            "SELECT SUM(revenue_exvat) FROM l3_item_daily WHERE venue=? AND date>=? AND date<=?",
            [venue, JUNE_START, JUNE_END]).fetchone()[0] or 0.0
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
        con.execute("DELETE FROM line_items WHERE date>=? AND date<=?", [JUNE_START, JUNE_END])
        li = _build_line_items()
        con.register("_june", li)
        con.execute("INSERT INTO line_items SELECT * FROM _june")
        con.unregister("_june")

        for venue in ("beer_hall", "ellel"):
            last = con.execute(
                "SELECT max(date) FROM line_items WHERE venue=? AND date>=? AND date<=?",
                [venue, JUNE_START, JUNE_END]).fetchone()[0]
            n = int((li.venue == venue).sum())
            _advance_watermark(con, venue, "L1", last, SOURCE, n)

        ceiling = con.execute("SELECT max(date) FROM l1_daily").fetchone()[0]
        recon = _reconcile(con)
    finally:
        con.close()

    result = {"rows_inserted": int(len(li)), "store_ceiling": str(ceiling),
              "as_of": AS_OF, "reconcile": recon}
    print(json.dumps(result, indent=2))
    _update_manifest(int(len(li)), str(ceiling))
    return result


def _update_manifest(n_rows: int, ceiling: str) -> None:
    path = config.BRAIN_DIR / "store" / "manifest.json"
    manifest = json.loads(path.read_text())
    manifest["june2026_ingest"] = {
        "ingested_at": datetime.now().isoformat(),
        "mode": "MCP-SIM aggregate (Neon not provisioned)",
        "grain": "one line per venue/date/category/item from the held-out ProductMix "
                 "item pull; aggregate-sourced, no intraday or tax breakdown",
        "source_file": "sim/june2026_actuals_l3_raw.json",
        "rows_inserted": n_rows,
        "store_ceiling": ceiling,
        "as_of": AS_OF,
        "venues": ["beer_hall", "ellel"],
        "note": "Two River Taps closed since 2026-05-08 (no June rows). June L1 "
                "tracks the SalesUK pull within a small VAT/rounding gap; L1/L2/L3 "
                "are mutually coherent (rebuilt from the item pull).",
    }
    path.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    run()
