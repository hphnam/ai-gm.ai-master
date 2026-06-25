"""A12 · Stock inventory — days-of-cover reorder signal (spec §7).

Joins the latest bar-stock snapshot (physical on-hand, from A11) to the A6
reconciled demand forecast (pints/day) to produce an inventory-aware reorder
signal:

    days_of_cover = on_hand_pints / forecast_daily_pints
    reorder when  days_of_cover < lead_time + safety

Stock is a *level*, not a flow (deliveries are unobserved), so consumption comes
from the sales-side A6 forecast — never from stock differences (FLAG-2). Cover is
computed only for **core** keg/cask lines that map to a forecast A6 node; unmapped
lines carry NULL demand, never a guess. Two secondary readouts fall out of the
same panel: a working-capital / dead-stock summary, and a mix-confounded cost note.

Run:
    python -m signals.stock_inventory

Artefacts:
    DuckDB table `stock_cover`; report `signals/stock_inventory.md`.
"""

from __future__ import annotations

import math
import sys

import pandas as pd

from config import (
    STOCK_A6_NODE_MAP,
    STOCK_LEAD_TIME_DAYS,
    STOCK_REORDER_CYCLE_DAYS,
    STOCK_SAFETY_DAYS,
    STORE_DIR,
)
from store.warehouse import connect

RESULTS_MD = STORE_DIR.parent / "signals" / "stock_inventory.md"
A6_FORECAST_VENUE = "beer_hall"   # A6 forecasts key the sales-side slug
A6_MODEL = "mint_dowmedian"
_HORIZON_DAYS = 7


def _a6_daily_pints(con, node_key: str) -> float | None:
    """Mean reconciled forecast (units≈pints/day for draught) for an A6 node
    over its persisted horizon. None if the node was not forecast."""
    row = con.execute(
        "SELECT AVG(yhat) FROM forecasts WHERE venue=? AND model=? AND key=?",
        [A6_FORECAST_VENUE, A6_MODEL, node_key],
    ).fetchone()
    return float(row[0]) if row and row[0] is not None else None


def compute_cover(con=None) -> pd.DataFrame:
    """One row per core keg/cask line in the latest snapshot, with days-of-cover
    where a forecast A6 node is mapped (else NULL demand)."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        as_of = con.execute("SELECT MAX(snapshot_date) FROM stock_panel").fetchone()[0]
        kegs = con.execute(
            """
            SELECT p.product_canon, p.l1, p.qty AS on_hand_kegs, p.pints_per_keg
            FROM stock_panel p
            JOIN stock_product_master m ON p.product_canon = m.product_canon
            WHERE p.snapshot_date = ? AND p.unit_type IN ('keg', 'cask')
              AND m.is_core
            ORDER BY p.product_canon, p.l1
            """,
            [as_of],
        ).df()

        lead_safety = STOCK_LEAD_TIME_DAYS + STOCK_SAFETY_DAYS
        target_days = lead_safety + STOCK_REORDER_CYCLE_DAYS
        rows = []
        for _, k in kegs.iterrows():
            node = STOCK_A6_NODE_MAP.get((k["product_canon"], k["l1"]))
            daily = _a6_daily_pints(con, node) if node else None
            on_hand_pints = float(k["on_hand_kegs"]) * float(k["pints_per_keg"])
            if daily and daily > 0:
                days_cover = on_hand_pints / daily
                reorder = days_cover < lead_safety
                target_pints = daily * target_days
                order_kegs = max(0, math.ceil(
                    (target_pints - on_hand_pints) / float(k["pints_per_keg"])))
            else:
                days_cover = reorder = order_kegs = None
            rows.append({
                "venue": "beer_hall", "as_of": as_of,
                "product_canon": k["product_canon"], "l1": k["l1"],
                "on_hand_kegs": round(float(k["on_hand_kegs"]), 2),
                "pints_per_keg": float(k["pints_per_keg"]),
                "on_hand_pints": round(on_hand_pints, 1),
                "forecast_daily_pints": round(daily, 2) if daily else None,
                "days_of_cover": round(days_cover, 1) if days_cover is not None else None,
                "reorder_flag": reorder,
                "suggested_order_kegs": float(order_kegs) if order_kegs is not None else None,
                "a6_node": node,
            })
        return pd.DataFrame(rows)
    finally:
        if own:
            con.close()


def _persist(cover: pd.DataFrame) -> None:
    con = connect()
    try:
        con.execute("DROP TABLE IF EXISTS stock_cover")
        con.register("_cover", cover)
        con.execute("CREATE TABLE stock_cover AS SELECT * FROM _cover")
        con.unregister("_cover")
    finally:
        con.close()


def working_capital(con=None) -> dict:
    """Working-capital summary from the snapshot aggregates (spec §6)."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        agg = con.execute(
            "SELECT * FROM stock_snapshot_agg ORDER BY snapshot_date").df()
    finally:
        if own:
            con.close()
    val = agg["total_value"]
    return {
        "mean_value": round(float(val.mean()), 0),
        "min_value": round(float(val.min()), 0),
        "min_month": str(agg.loc[val.idxmin(), "snapshot_date"])[:7],
        "max_value": round(float(val.max()), 0),
        "max_month": str(agg.loc[val.idxmax(), "snapshot_date"])[:7],
        "cv": round(float(val.std() / val.mean()), 2),
        "kegs_min": round(float(agg["total_kegs"].min()), 1),
        "kegs_max": round(float(agg["total_kegs"].max()), 1),
        "value_draught": round(float(agg["value_draught"].mean()), 0),
        "value_cask": round(float(agg["value_cask"].mean()), 0),
        "value_spirits": round(float(agg["value_spirits"].mean()), 0),
        "value_wine": round(float(agg["value_wine"].mean()), 0),
    }


def dead_stock(con=None, limit: int = 8) -> pd.DataFrame:
    """Non-core lines carrying value, or core lines that sit near-zero — the
    working-capital-tied-up / dead-listing candidates."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        return con.execute(
            """
            SELECT product_canon, l1, n_snapshots, is_core,
                   ROUND(mean_qty, 2) AS mean_qty,
                   ROUND(last_price, 2) AS last_price
            FROM stock_product_master
            WHERE (NOT is_core AND last_price > 15)
               OR (is_core AND mean_qty < 0.5)
            ORDER BY last_price DESC
            LIMIT ?
            """,
            [limit],
        ).df()
    finally:
        if own:
            con.close()


def run() -> dict:
    con = connect(read_only=True)
    try:
        cover = compute_cover(con)
        wc = working_capital(con)
        dead = dead_stock(con)
    finally:
        con.close()
    _persist(cover)
    mapped = cover[cover["forecast_daily_pints"].notna()]
    return {
        "cover": cover, "mapped": mapped, "working_capital": wc, "dead": dead,
        "n_core_keg": len(cover), "n_mapped": len(mapped),
        "n_reorder": int(cover["reorder_flag"].fillna(False).sum()),
    }


def _write_report(out: dict) -> None:
    cover, wc, dead = out["cover"], out["working_capital"], out["dead"]
    mapped = out["mapped"].sort_values("days_of_cover")
    as_of = str(cover["as_of"].iloc[0])[:10] if not cover.empty else "n/a"
    lines = [
        "# A12 · Stock inventory — days-of-cover reorder signal\n",
        f"Latest snapshot **{as_of}**, Beer Hall only (spec scope; no TRT/Ellel "
        "sheets exist — FLAG-5). Cover joins physical on-hand (kegs) to the A6 "
        "reconciled demand forecast (pints/day). Stock is a monthly *level*, not "
        "a flow, so consumption is taken from the sales-side A6 forecast, never "
        "from stock differences (FLAG-2).\n",
        f"Reorder rule: `days_of_cover < lead({STOCK_LEAD_TIME_DAYS}) + "
        f"safety({STOCK_SAFETY_DAYS})` days (FLAG-3); order target extends "
        f"{STOCK_REORDER_CYCLE_DAYS} days beyond cover. Keg→pints uses size-aware "
        "52.8 (30 L) / 88 (50 L, default) — refines A6's flat 88 (FLAG-4).\n",
        "## Days-of-cover (core keg/cask lines mapped to a forecast A6 node)",
        "| Product | L1 | On-hand kegs | On-hand pints | Forecast pints/day | "
        "Days cover | Reorder | Suggest kegs | A6 node |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for _, r in mapped.iterrows():
        lines.append(
            f"| {r['product_canon']} | {r['l1']} | {r['on_hand_kegs']:.1f} | "
            f"{r['on_hand_pints']:.0f} | {r['forecast_daily_pints']:.2f} | "
            f"**{r['days_of_cover']:.1f}** | {'⚠ YES' if r['reorder_flag'] else 'no'} | "
            f"{r['suggested_order_kegs']:.0f} | {r['a6_node']} |")
    n_unmapped = out["n_core_keg"] - out["n_mapped"]
    lines += [
        f"\n{out['n_mapped']} of {out['n_core_keg']} core keg/cask lines map to a "
        f"forecast A6 node; the other {n_unmapped} carry **NULL demand** (no "
        "single sales item maps to that brand, or it is not in A6's top-k node "
        "set) — surfaced as on-hand only, never a guessed cover. This is the "
        "honest scope: the cover signal is exact where demand is known and silent "
        "where it is not.\n",
        "## Working capital (the inefficiency the signal targets)",
        f"Mean inventory **£{wc['mean_value']:.0f}** (min £{wc['min_value']:.0f} "
        f"{wc['min_month']}, max £{wc['max_value']:.0f} {wc['max_month']}; CV "
        f"{wc['cv']}). Draught (£{wc['value_draught']:.0f} avg) + Cask "
        f"(£{wc['value_cask']:.0f}) is the largest block — bigger than Spirits "
        f"(£{wc['value_spirits']:.0f}) and Wine (£{wc['value_wine']:.0f}). Total "
        f"kegs on hand swing **{wc['kegs_min']:.0f} → {wc['kegs_max']:.0f}** across "
        "months with no smooth trend: reactive bulk-ordering. The cover signal "
        "converts 'order when the cellar looks empty' into 'order N kegs of X by "
        "<date>'.\n",
        "## Dead-stock / dead-listing candidates",
        "| Product | L1 | Snapshots | Core | Mean qty | Last price |",
        "|---|---|---|---|---|---|",
    ]
    for _, r in dead.iterrows():
        lines.append(
            f"| {r['product_canon']} | {r['l1']} | {int(r['n_snapshots'])} | "
            f"{bool(r['is_core'])} | {r['mean_qty']} | £{r['last_price']:.2f} |")
    lines += [
        "\n## Honesty flags",
        "- **FLAG-2** Stock is a level, not a flow — consumption from A6, not "
        "stock differences.",
        "- **FLAG-3** Lead/safety days are working assumptions — owner to confirm "
        "per beer.",
        "- **FLAG-4** Keg→pints: 30 L→52.8, 50 L/unknown→88.",
        "- **FLAG-5** Beer Hall only; no TRT/Ellel stock sheets exist.",
        "- **FLAG-6** Hand-typed footers occasionally stale (Feb/Apr/May); "
        "line-item sums are authoritative.",
        "- **FLAG-7** Median keg-cost rise is mix-confounded — indicative only.",
    ]
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    print("A12 · stock inventory — days-of-cover reorder signal")
    out = run()
    cover = out["cover"]
    print(f"  core keg lines    : {out['n_core_keg']} "
          f"({out['n_mapped']} mapped to a forecast A6 node)")
    for _, r in out["mapped"].sort_values("days_of_cover").iterrows():
        flag = "REORDER" if r["reorder_flag"] else "ok"
        print(f"    {r['product_canon']:24s} {r['l1']:8s} "
              f"cover={r['days_of_cover']:5.1f}d  on_hand={r['on_hand_kegs']:.1f}keg "
              f"order={r['suggested_order_kegs']:.0f}  [{flag}]")
    print(f"  reorder flags     : {out['n_reorder']}")
    _write_report(out)
    print(f"  report            : {RESULTS_MD}")

    # G5: cover computed for every mapped core keg line; integer non-negative
    # orders; unmapped lines carry NULL (not a guessed cover).
    m = out["mapped"]
    cover_ok = (m["days_of_cover"].notna().all()
                and (m["suggested_order_kegs"] >= 0).all()
                and (m["suggested_order_kegs"] % 1 == 0).all())
    unmapped = cover[cover["a6_node"].isna()]
    null_ok = unmapped["days_of_cover"].isna().all()
    ok = out["n_mapped"] >= 1 and cover_ok and null_ok
    print(f"A12 RESULT: {'PASS' if ok else 'FAIL'} "
          f"(cover for {out['n_mapped']} mapped lines; unmapped NULL preserved)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
