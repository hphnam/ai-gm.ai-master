"""G12.17b (Pass 2) - confront the frozen July forecast with real July 1 to 7 actuals.

Loads the committed frozen July artefact (Pass-1 commit 7d103aaa, never regenerated)
and the held-out July actuals (Square MCP-SIM), then runs:
  Stage 1  score L1/L2/L3 vs reality on the REFRESHED taxonomy; band coverage; TRT
           dormant confirmation (no forecast, no actual, no false alarm).
  Stage 2  the in-context-learning test on 1 Jul (single in-hours England date):
           did the July forecast lift 1 Jul above the DOW-median, unlike June's first
           in-hours fixture (report 22). Single-case, directional, caveated.
  Stage 3  drift-vs-model decomposition: June (stale taxonomy, report 25) vs July
           (refreshed) L3 item MASE and named-node revenue coverage.

Read-only: July actuals live only in sim/july2026_actuals_*.json, never in the served
store. Run: .venv-forecast/bin/python -m sim.confront_july
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
JULY = pd.date_range("2026-07-01", "2026-07-07", freq="D")
PASS1_SHA = "7d103aaa"
BACKTEST_MASE = {"beer_hall": 0.745, "ellel": 0.572}
BAND_LEVEL = 0.90


def _load(name: str) -> pd.DataFrame:
    df = pd.DataFrame(json.loads((SIM_DIR / name).read_text())["rows"])
    if "date" in df:
        df["date"] = pd.to_datetime(df["date"])
    return df


def stage1(frozen, a1, a2, a3) -> dict:
    out = {"l1": {}, "l2": {}, "l3": {}, "dormant": {}}
    live = ("beer_hall", "ellel")
    rulers = {v: harness.venue_ruler(v) for v in live}

    for venue in live:
        fz = frozen[(frozen.venue == venue) & (frozen.level == "L1")].sort_values("date")
        av = a1[a1.venue == venue].set_index("date")["net_exvat"]
        actual = np.array([av.get(d, 0.0) for d in fz["date"]], float)
        yhat = fz["yhat"].to_numpy(float)
        lo, hi = fz["lo"].to_numpy(float), fz["hi"].to_numpy(float)
        out["l1"][venue] = {
            "july_actual_total": round(float(actual.sum()), 0),
            "july_frozen_total": round(float(yhat.sum()), 0),
            **harness.venue_metric_row(rulers[venue], actual, yhat, lo, hi,
                                       reported_basis=harness.REPORTED_BASIS,
                                       level=BAND_LEVEL),
            "backtest_mase": BACKTEST_MASE[venue],
            "backtest_basis": harness.REPORTED_BASIS,
        }

    # L2 category MASE through the map (per-day per-category).
    for venue in live:
        a2v = a2[a2.venue == venue].copy()
        a2v["bcat"] = a2v["category"].map(map_category)
        fz = frozen[(frozen.venue == venue) & (frozen.level == "L2")]
        cats = sorted(set(fz["key"]) | set(a2v["bcat"]))
        tbl = []
        for c in cats:
            fzc = fz[fz.key == c].set_index("date")["yhat"].reindex(JULY, fill_value=0.0).to_numpy()
            ac = a2v[a2v.bcat == c].groupby("date")["net_exvat"].sum().reindex(JULY, fill_value=0.0).to_numpy()
            tbl.append({"category": c, "frozen": round(float(fzc.sum()), 0),
                        "actual": round(float(ac.sum()), 0)})
        out["l2"][venue] = {"mae_category_total": round(
            float(np.mean([abs(r["frozen"] - r["actual"]) for r in tbl])), 0),
            "table": tbl}

    # L3 item MASE through the map on the refreshed frozen July node set.
    out["l3"] = _score_l3(frozen, a3)

    # Dormant confirmation.
    for venue in config.FORECAST_VENUES:
        has_forecast = not frozen[(frozen.venue == venue)].empty
        has_actual = venue in set(a1.venue)
        out["dormant"][venue] = {"forecast": has_forecast, "any_july_actual": has_actual}
    return out


def _score_l3(frozen, a3) -> dict:
    result = {}
    for venue in ("beer_hall", "ellel"):
        l3 = frozen[(frozen.venue == venue) & (frozen.level == "L3")]
        nodes = sorted(l3["key"].unique())
        venue_named = {n for n in nodes if not n.endswith("::OTHER")}
        named_by_cat: dict[str, list[str]] = {}
        for n in venue_named:
            c, i = n.split("::", 1)
            named_by_cat.setdefault(c, []).append(i)

        store = _store_l3(venue)
        cal = pd.date_range(store["date"].min(), store["date"].max(), freq="D")
        actual_nodes = _actual_by_node(a3[a3.venue == venue], venue_named)
        all_nodes = sorted(set(nodes) | set(actual_nodes))

        mases, rmsses, table, named_actual, total_actual = [], [], [], 0.0, 0.0
        for node in all_nodes:
            cat, item = node.split("::", 1)
            frozen_d = l3[l3.key == node].set_index("date")["yhat"].reindex(JULY, fill_value=0.0).to_numpy()
            actual_d = actual_nodes.get(node, pd.Series(0.0, index=JULY)).to_numpy()
            is_other = item == "OTHER"
            train = _train_series(store, cal, cat, None if is_other else item, named_by_cat.get(cat, []))
            # An L3 node series is already calendar-reindexed, so `calendar_lag7`
            # is the only basis defined for it: there is no trading-day index at
            # node grain (report 42 section 4).
            scale = harness.seasonal_naive_scale(train, basis="calendar_lag7")
            m = harness.mase(actual_d, frozen_d, train, basis="calendar_lag7")
            r = harness.rmsse(actual_d, frozen_d, train, basis="calendar_lag7")
            scoreable = np.isfinite(m) and np.isfinite(scale) and scale >= 1.0
            total_actual += float(actual_d.sum())
            if not is_other:
                named_actual += float(actual_d.sum())
            if scoreable:
                mases.append(m)
                if np.isfinite(r):
                    rmsses.append(r)
            table.append({"node": node, "actual": round(float(actual_d.sum()), 2),
                          "frozen": round(float(frozen_d.sum()), 0),
                          "mase": round(float(m), 3) if scoreable else None,
                          "rmsse": round(float(r), 3) if scoreable and np.isfinite(r) else None})
        venue_total = float(a3[a3.venue == venue]["net_exvat"].sum())
        result[venue] = {
            "basis": "calendar_lag7",
            "n_scored": len(mases),
            "mase_all_mean": round(float(np.mean(mases)), 3) if mases else None,
            "mase_all_median": round(float(np.median(mases)), 3) if mases else None,
            "rmsse_all_mean": round(float(np.mean(rmsses)), 3) if rmsses else None,
            "rmsse_all_median": round(float(np.median(rmsses)), 3) if rmsses else None,
            "named_share_of_actual": round(named_actual / venue_total, 3) if venue_total else None,
            "conservation_ok": abs(sum(r["actual"] for r in table) - venue_total) < 1.0,
            "table": sorted(table, key=lambda r: -r["actual"]),
        }
    return result


def _store_l3(venue: str) -> pd.DataFrame:
    con = connect(read_only=True)
    try:
        df = con.execute(
            "SELECT date, category, item, revenue_exvat FROM l3_item_daily WHERE venue=? AND date<=?",
            [venue, "2026-06-30"]).df()
    finally:
        con.close()
    df["date"] = pd.to_datetime(df["date"])
    return df


def _train_series(store, cal, cat, item, named_items):
    sub = store[store["category"] == cat]
    cat_daily = sub.groupby("date")["revenue_exvat"].sum().reindex(cal, fill_value=0.0)
    if item is not None:
        return sub[sub["item"] == item].groupby("date")["revenue_exvat"].sum().reindex(
            cal, fill_value=0.0).to_numpy(float)
    used = pd.Series(0.0, index=cal)
    for it in named_items:
        used = used + sub[sub["item"] == it].groupby("date")["revenue_exvat"].sum().reindex(
            cal, fill_value=0.0)
    return (cat_daily - used).clip(lower=0.0).to_numpy(float)


def _actual_by_node(a3, venue_named):
    out: dict[str, pd.Series] = {}
    for _, row in a3.iterrows():
        node = map_item(row["item"], row["category"])
        if node is None:
            continue
        if node not in venue_named:
            node = f"{map_category(row['category'])}::OTHER"
        s = out.setdefault(node, pd.Series(0.0, index=JULY))
        d = pd.Timestamp(row["date"])
        if d in s.index:
            s[d] += float(row["net_exvat"])
    return out


def stage2_incontext(frozen, a1) -> dict:
    """1 Jul BH: forecast vs DOW-median vs actual; compare to June's first in-hours
    England fixture (report 22: model sat near the DOW-median, undershooting)."""
    d = pd.Timestamp("2026-07-01")
    fz = frozen[(frozen.venue == "beer_hall") & (frozen.level == "L1") & (frozen.date == d)].iloc[0]
    con = connect(read_only=True)
    try:
        s = con.execute("SELECT date, revenue_exvat v FROM l1_daily WHERE venue='beer_hall' "
                        "AND date<=? ORDER BY date", ["2026-06-30"]).df()
    finally:
        con.close()
    s["date"] = pd.to_datetime(s["date"])
    wed_median = float(s[(s["v"] > 0) & (s["date"].dt.dayofweek == 2)]["v"].median())
    av = a1[a1.venue == "beer_hall"].set_index("date")["net_exvat"]
    actual = float(av.get(d, 0.0))
    frozen_yhat = float(fz["yhat"])
    return {
        "date": "2026-07-01", "fixture": "England v DR Congo 17:00 (only in-hours England date)",
        "frozen_yhat": round(frozen_yhat, 0), "dow_median_wed": round(wed_median, 0),
        "actual": round(actual, 0),
        "anticipated_above_baseline": bool(frozen_yhat > wed_median),
        "lift_over_baseline": round(frozen_yhat - wed_median, 0),
        "actual_uplift_over_baseline": round(actual - wed_median, 0),
        "june_first_fixture_report22": {"date": "2026-06-17", "frozen": 300, "dow_median": 289,
                                        "actual": 607, "anticipated": False},
        "caveat": "single in-hours England date; directional, not significant. A real "
                  "in-context claim needs many fixture dates across venues and seasons.",
    }


def stage3_drift(l3_july) -> dict:
    june = json.loads((SIM_DIR / "june2026_l3_result.json").read_text())
    out = {}
    for venue in ("beer_hall", "ellel"):
        j = june[venue]
        out[venue] = {
            "june_named_share": j["named_share_of_actual"],
            "july_named_share": l3_july[venue]["named_share_of_actual"],
            "june_l3_mase_median": j["mase_all_median"],
            "july_l3_mase_median": l3_july[venue]["mase_all_median"],
            "named_coverage_jump": round(
                l3_july[venue]["named_share_of_actual"] - j["named_share_of_actual"], 3),
        }
    out["note"] = ("June used the stale taxonomy (report 25), July the refreshed one. A "
                   "rise in named-node coverage quantifies how much June L3 degradation was "
                   "drift, not model error. Residual: items new in July still fall to OTHER "
                   "(the irreducible new-item problem), so coverage will not reach 100%.")
    return out


def main() -> dict:
    frozen = _load("july2026_forecast_frozen.parquet") if False else pd.read_parquet(
        SIM_DIR / "july2026_forecast_frozen.parquet")
    frozen["date"] = pd.to_datetime(frozen["date"])
    a1, a2, a3 = (_load("july2026_actuals_l1_raw.json"),
                  _load("july2026_actuals_l2_raw.json"),
                  _load("july2026_actuals_l3_raw.json"))
    s1 = stage1(frozen, a1, a2, a3)
    result = {"pass1_sha": PASS1_SHA, "stage1": s1,
              "stage2_incontext": stage2_incontext(frozen, a1),
              "stage3_drift": stage3_drift(s1["l3"])}
    # A NEW file, deliberately. `july2026_confront_result.json` is the committed
    # pre-registered scoring record and stays byte-identical; re-scoring on the
    # documented ruler is an additional artefact, not an edit to the chain (S1 G5).
    (SIM_DIR / "july2026_confront_rescored.json").write_text(
        json.dumps(result, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"l1": s1["l1"], "incontext": result["stage2_incontext"],
                      "drift": result["stage3_drift"]}, indent=2))
    return result


if __name__ == "__main__":
    main()
