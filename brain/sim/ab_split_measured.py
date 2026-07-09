"""G12.13a Stage 3 (retro-measured) - the A-vs-B L2/L3 split comparison.

Closes the canonical G12.13a A13a.3 requirement that the L2/L3 method be MEASURED,
not assumed. Runs entirely on PRE-JUNE data (held-out backtest block before each
venue's store ceiling), so it is blind-admissible: no June actual enters.

Candidate A  MinT-with-gate-winner-top: L1 base = the served gate winner (revenue),
             L2/L3 bases = DOW-median (revenue); reconcile with diagonal MinT.
Candidate B  forecast-proportion disaggregation: L1 gate-winner total split by
             recent revenue share (the method the frozen artefact used).
Metric       held-out L3 item revenue MASE (mean over item nodes, excluding OTHER).
Winner       lower mean L3 MASE per venue.

Everything is in the REVENUE (ex-VAT) domain, matching the L1 gate winner and the
frozen artefact (build_hierarchy is units-only, so the hierarchy is rebuilt here in
revenue). Run: .venv-forecast/bin/python -m sim.ab_split_measured
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import config
from conformal.wrap import rolling_point_forecasts
from eval import harness
from features.build_features import build_features
from hierarchy.reconcile import mint_reconcile
from models.foundation import CHRONOS2_EXO_COLS
from sim.build_frozen_forecast import GATE_WINNER, TOP_ITEMS_PER_CAT
from store.active_span import trim_to_active
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"


def _revenue_hierarchy(venue: str):
    """VENUE / CAT / ITEM (top-k + OTHER) daily ex-VAT revenue series + S matrix."""
    con = connect(read_only=True)
    try:
        item = con.execute(
            "SELECT date, category, item, revenue_exvat FROM l3_item_daily WHERE venue=?",
            [venue]).df()
    finally:
        con.close()
    item["date"] = pd.to_datetime(item["date"])
    cal = pd.DatetimeIndex(sorted(item["date"].unique()))
    node_series, cat_nodes, bottom_nodes, cat_of_bottom = {}, [], [], {}
    venue_total = pd.Series(0.0, index=cal)
    for c, sub in item.groupby("category"):
        cat_daily = sub.groupby("date")["revenue_exvat"].sum().reindex(cal, fill_value=0.0)
        cid = f"CAT::{c}"
        node_series[cid] = cat_daily
        cat_nodes.append(cid)
        venue_total = venue_total + cat_daily
        totals = sub.groupby("item")["revenue_exvat"].sum().sort_values(ascending=False)
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
    return node_series, S, nodes, bottom_nodes, cat_of_bottom, cal


def _dow_median(series: pd.Series, test_dates, test_start):
    train = series[series.index < test_start]
    med = train.groupby(train.index.dayofweek).median()
    overall = float(train.median()) if len(train) else 0.0
    yhat = np.array([med.get(d.dayofweek, overall) for d in test_dates], float)
    resid = train.to_numpy() - np.array(
        [med.get(d.dayofweek, overall) for d in train.index], float)
    return yhat, float(np.var(resid)) if len(resid) > 1 else 1.0


def _l1_top_forecast(venue, test_dates, test_start):
    """Gate-winner L1 revenue forecast over the test block (rolling 7-day)."""
    feats = trim_to_active(build_features(venue), venue)
    roll = rolling_point_forecasts(feats, GATE_WINNER[venue], list(CHRONOS2_EXO_COLS),
                                   venue=venue, first_target=test_start)
    m = roll.set_index("date")["yhat"]
    return np.array([float(m.get(d, np.nan)) for d in test_dates], float)


def run() -> dict:
    result = {}
    for venue in config.FORECAST_VENUES:
        ns, S, nodes, bottom, cat_of, cal = _revenue_hierarchy(venue)
        test_start = cal.max() - pd.Timedelta(weeks=config.TEST_WEEKS)
        test_dates = cal[cal >= test_start]
        if len(test_dates) < 7:
            result[venue] = {"skipped": "insufficient test block"}
            continue
        l1_top = _l1_top_forecast(venue, test_dates, test_start)
        if not np.isfinite(l1_top).any():
            result[venue] = {"skipped": "no L1 top forecast over block"}
            continue
        l1_top = np.nan_to_num(l1_top, nan=0.0)

        # Bases (DOW-median) + actuals.
        Ybase = np.zeros((len(nodes), len(test_dates)))
        w = np.zeros(len(nodes))
        actual = np.zeros((len(nodes), len(test_dates)))
        for i, n in enumerate(nodes):
            Ybase[i], w[i] = _dow_median(ns[n], test_dates, test_start)
            actual[i] = ns[n].reindex(test_dates, fill_value=0.0).to_numpy()
        # Candidate A top row = the gate winner, not DOW-median.
        Ybase[0] = l1_top
        w[0] = max(w[0], 1e-6)
        reconA = mint_reconcile(Ybase, S, w)

        # Candidate B: disaggregate the SAME L1 top by recent revenue share.
        share_lo = test_start - pd.Timedelta(days=120)
        item_rows = [i for i, n in enumerate(nodes) if n.startswith("ITEM::")]
        train_mask = (cal >= share_lo) & (cal < test_start)
        shares = {}
        for i in item_rows:
            n = nodes[i]
            tot = float(ns[n][train_mask].sum())
            shares[i] = tot
        vtot = sum(shares.values()) or 1.0
        reconB_items = {i: l1_top * (shares[i] / vtot) for i in item_rows}

        # Score L3 item MASE (exclude OTHER).
        def _mase_items(pred_of):
            vals = []
            for i in item_rows:
                if nodes[i].endswith("::OTHER"):
                    continue
                ytr = ns[nodes[i]][ns[nodes[i]].index < test_start].to_numpy(float)
                mase = harness.mase(actual[i], pred_of(i), ytr, config.SEASONAL_PERIOD)
                if np.isfinite(mase):
                    vals.append(mase)
            return float(np.mean(vals)) if vals else float("nan")

        mase_A = _mase_items(lambda i: reconA[i])
        mase_B = _mase_items(lambda i: reconB_items[i])
        winner = "A_mint" if mase_A < mase_B else "B_disaggregation"
        result[venue] = {
            "test_block": f"{test_dates.min().date()}..{test_dates.max().date()}",
            "n_item_nodes": len([i for i in item_rows if not nodes[i].endswith('::OTHER')]),
            "mase_A_mint": round(mase_A, 3),
            "mase_B_disaggregation": round(mase_B, 3),
            "winner": winner,
            "frozen_used": "B_disaggregation",
            "frozen_matches_winner": winner == "B_disaggregation",
        }
        print(f"{venue}: A(MinT)={mase_A:.3f} B(disagg)={mase_B:.3f} -> {winner}")

    (SIM_DIR / "june2026_ab_split_result.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    run()
