"""G12.16b - first real L3 item-accuracy score against the frozen forecast.

Aligns the held-out item-grain June actuals (sim/june2026_actuals_l3_raw.json) to
the brain's frozen L3 nodes THROUGH the canonical taxonomy map (ingest/taxonomy),
then scores per-node revenue MASE at each venue's top-3 items plus OTHER. This is
the number reports 22 and 24 could not produce because June was pulled at category
grain only.

Node actuals are built venue-aware: map_item lands each Square item on a brain node,
and any node not in this venue's frozen set folds into that category's OTHER, so the
per-venue actual conserves to the L1 total. MASE scale is the seasonal-naive MAE of
each node's PRE-JUNE training series from the served store (blind: store ceiling is
2026-05-31).

Reads only; writes sim/june2026_l3_result.json. Served store untouched.
Run: .venv-forecast/bin/python -m sim.score_l3
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import config
from eval import harness
from ingest.taxonomy import map_category, map_item
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"
JUNE = pd.date_range("2026-06-01", "2026-06-30", freq="D")
SCORE_VENUES = ("beer_hall", "ellel")  # TRT closed all June (zero actuals)


def _store_l3(venue: str) -> pd.DataFrame:
    con = connect(read_only=True)
    try:
        df = con.execute(
            "SELECT date, category, item, revenue_exvat FROM l3_item_daily WHERE venue=?",
            [venue]).df()
    finally:
        con.close()
    df["date"] = pd.to_datetime(df["date"])
    return df


def _train_series(store: pd.DataFrame, cal: pd.DatetimeIndex, cat: str,
                  item: str | None, named_items: list[str]) -> np.ndarray:
    """Pre-June daily revenue for a node: a named item, or category-OTHER residual."""
    sub = store[store["category"] == cat]
    cat_daily = sub.groupby("date")["revenue_exvat"].sum().reindex(cal, fill_value=0.0)
    if item is not None:
        s = sub[sub["item"] == item].groupby("date")["revenue_exvat"].sum().reindex(
            cal, fill_value=0.0)
        return s.to_numpy(float)
    used = pd.Series(0.0, index=cal)
    for it in named_items:
        used = used + sub[sub["item"] == it].groupby("date")["revenue_exvat"].sum(
            ).reindex(cal, fill_value=0.0)
    return (cat_daily - used).clip(lower=0.0).to_numpy(float)


def _actual_by_node(a3: pd.DataFrame, venue_named: set[str]) -> dict[str, pd.Series]:
    """June daily actual revenue per brain node, folding non-frozen-named to OTHER.

    `a3` is already scoped to one venue.
    """
    out: dict[str, pd.Series] = {}
    for _, row in a3.iterrows():
        node = map_item(row["item"], row["category"])
        if node is None:
            continue  # DROP category (none today)
        if node not in venue_named:
            node = f"{map_category(row['category'])}::OTHER"
        s = out.setdefault(node, pd.Series(0.0, index=JUNE))
        d = pd.Timestamp(row["date"])
        if d in s.index:
            s[d] += float(row["net_exvat"])
    return out


def run() -> dict:
    fz = pd.read_parquet(SIM_DIR / "june2026_forecast_frozen.parquet")
    a3_all = pd.DataFrame(json.loads(
        (SIM_DIR / "june2026_actuals_l3_raw.json").read_text())["rows"])
    a3_all["date"] = pd.to_datetime(a3_all["date"])

    result = {}
    for venue in SCORE_VENUES:
        l3 = fz[(fz.venue == venue) & (fz.level == "L3")].copy()
        l3["date"] = pd.to_datetime(l3["date"])
        nodes = sorted(l3["key"].unique())
        venue_named = {n for n in nodes if not n.endswith("::OTHER")}
        named_by_cat: dict[str, list[str]] = {}
        for n in venue_named:
            c, i = n.split("::", 1)
            named_by_cat.setdefault(c, []).append(i)

        store = _store_l3(venue)
        cal = pd.date_range(store["date"].min(), store["date"].max(), freq="D")
        actual_nodes = _actual_by_node(a3_all[a3_all.venue == venue], venue_named)

        # Score the union: frozen nodes (some get 0 actual) plus any node the actuals
        # land on that the frozen set never modelled (a category OTHER the forecast
        # missed) - so per-venue revenue conserves exactly.
        all_nodes = sorted(set(nodes) | set(actual_nodes))
        table, mases_named, mases_all = [], [], []
        for node in all_nodes:
            cat, item = node.split("::", 1)
            frozen = l3[l3.key == node].set_index("date")["yhat"].reindex(
                JUNE, fill_value=0.0).to_numpy(float)
            actual = actual_nodes.get(node, pd.Series(0.0, index=JUNE)).to_numpy(float)
            is_other = item == "OTHER"
            train = _train_series(store, cal, cat, None if is_other else item,
                                  named_by_cat.get(cat, []))
            # Degenerate scale (a near-constant pre-June node) makes MASE blow up on a
            # near-zero denominator; exclude those from aggregates and count them.
            scale = harness.seasonal_naive_scale(train, basis="calendar_lag7")
            m = harness.mase(actual, frozen, train, basis="calendar_lag7")
            scoreable = np.isfinite(m) and np.isfinite(scale) and scale >= 1.0
            in_frozen = node in nodes
            row = {"node": node, "june_actual": round(float(actual.sum()), 2),
                   "june_frozen": round(float(frozen.sum()), 0),
                   "in_frozen": in_frozen,
                   "mase": round(float(m), 3) if scoreable else None}
            table.append(row)
            if scoreable:
                mases_all.append(m)
                if not is_other:
                    mases_named.append(m)

        venue_actual_total = float(a3_all[a3_all.venue == venue]["net_exvat"].sum())
        node_actual_total = float(sum(r["june_actual"] for r in table))
        named_actual = float(sum(r["june_actual"] for r in table
                                 if not r["node"].endswith("::OTHER")))
        result[venue] = {
            "n_frozen_nodes": len(nodes),
            "n_named": len(venue_named),
            "n_missed_other_nodes": len([r for r in table
                                         if not r["in_frozen"]]),
            "n_scored": len(mases_all),
            "n_unscoreable_degenerate": len([r for r in table if r["mase"] is None]),
            "mase_named_mean": round(float(np.mean(mases_named)), 3) if mases_named else None,
            "mase_named_median": round(float(np.median(mases_named)), 3) if mases_named else None,
            "mase_all_mean": round(float(np.mean(mases_all)), 3) if mases_all else None,
            "mase_all_median": round(float(np.median(mases_all)), 3) if mases_all else None,
            "named_share_of_actual": round(named_actual / venue_actual_total, 3),
            "conservation_ok": abs(node_actual_total - venue_actual_total) < 1.0,
            "venue_actual_total": round(venue_actual_total, 0),
            "table": sorted(table, key=lambda r: -r["june_actual"]),
        }
        print(f"{venue}: named-MASE={result[venue]['mase_named_mean']} "
              f"all-MASE={result[venue]['mase_all_mean']} "
              f"named-share={result[venue]['named_share_of_actual']} "
              f"conserved={result[venue]['conservation_ok']}")

    (SIM_DIR / "june2026_l3_result.json").write_text(
        json.dumps(result, indent=2, allow_nan=False) + "\n")
    return result


if __name__ == "__main__":
    run()
