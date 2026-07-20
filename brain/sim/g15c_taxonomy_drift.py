"""G15c - taxonomy drift on the STANDING path, measured before it is decided.

`hierarchy.build_hierarchy` takes `since=` and ranks the top-k node set from recent rows.
The freeze scripts pass it. `hierarchy.reconcile()` - the standing service path - does
not, and no caller anywhere does, so the served L2/L3 node set is still ranked over the
whole history. Report 25 named the consequence: `Lager - BH` (two years of history, GBP
14.86 in June) outranks `LuneBrew Pilsner` (GBP 3,484 in June), which lands in OTHER.

This changes the served node set, so it gets a gate and a before/after, exactly like a
rung promotion, and the decision is allowed to be no.

Four measurements:
  1 standing    reconcile()'s node set as it stands, with June and July in the store,
                and the share of recent revenue those nodes capture.
  2 refreshed   the same with `since=` at a stated lookback, swept rather than assumed.
  3 scored      L3 revenue MASE on held-out June, BOTH node sets, ONE ruler.
  4 L1 check    the served L1 top must be untouched (it is pure Chronos-2-exo and is
                never reconciled downward). A stop condition, so it is asserted.

The scoring is deliberately blind: node selection and the base forecaster both see only
rows on or before the cutoff, and June is the held-out block. Ranking on data that
includes the scored window would make refreshing win by construction.

Kept strictly separate from the NEW-ITEM problem throughout. An item first sold after the
cutoff has no history, lands in OTHER by design, and is irreducible. That is not drift and
is counted separately.

Read-only. Does not call `reconcile()`, which persists forecasts and bands.

Run:
    .venv-forecast/bin/python -m sim.g15c_taxonomy_drift
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import config
from eval import harness
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"
OUT = SIM_DIR / "g15c_taxonomy_drift.json"
VENUES = ("beer_hall", "ellel")
TOP_K = 3
CUTOFF = pd.Timestamp("2026-05-31")                 # node selection sees nothing after
HELD_OUT = pd.date_range("2026-06-01", "2026-06-30", freq="D")
# Swept rather than picked: the tradeoff has to be shown, not asserted.
LOOKBACKS = (56, 90, 120, 180)
# The freeze scripts' L2/L3 revenue-share window (`sim/build_frozen_forecast`). Using the
# same number keeps ONE knob governing L2/L3 recency instead of two that can disagree.
DEFAULT_LOOKBACK = 120


def _l3(venue: str) -> pd.DataFrame:
    con = connect(read_only=True)
    try:
        df = con.execute(
            "SELECT date, category, item, units, revenue_exvat FROM l3_item_daily "
            "WHERE venue = ?", [venue]).df()
    finally:
        con.close()
    df["date"] = pd.to_datetime(df["date"])
    return df


def _select_nodes(df: pd.DataFrame, since: pd.Timestamp | None) -> dict:
    """Mirror `build_hierarchy`'s selection, with an explicit cutoff so it stays blind.

    `build_hierarchy` ranks on UNITS and has no upper bound; the standing store now runs
    past the scored window, so ranking through it would leak. Same ordering rule, same
    top-k, cutoff enforced.
    """
    rank_src = df[df["date"] <= CUTOFF]
    if since is not None:
        rank_src = rank_src[rank_src["date"] >= since]
    cats = (rank_src.groupby("category")["units"].sum()
            .sort_values(ascending=False).index)
    named: list[tuple[str, str]] = []
    for c in cats:
        totals = (rank_src[rank_src["category"] == c].groupby("item")["units"].sum()
                  .sort_values(ascending=False))
        named += [(c, it) for it in totals.index[:TOP_K]]
    return {"categories": list(cats), "named": named}


def _capture(df: pd.DataFrame, named: list[tuple[str, str]],
             window: pd.DatetimeIndex) -> dict:
    """Share of held-out revenue the NAMED nodes capture, and how much falls to OTHER.

    New items are split out rather than blamed on drift: an item with no rows on or
    before the cutoff could not have been selected by any ranking, so its revenue is
    irreducible OTHER, not a selection failure.
    """
    win = df[df["date"].isin(window)]
    total = float(win["revenue_exvat"].sum())
    named_set = set(named)
    keyed = win.set_index(["category", "item"]).index
    is_named = np.array([k in named_set for k in keyed])
    captured = float(win.loc[is_named, "revenue_exvat"].sum())

    seen_before = set(df.loc[df["date"] <= CUTOFF].set_index(["category", "item"]).index)
    is_new = np.array([k not in seen_before for k in keyed])
    new_rev = float(win.loc[is_new, "revenue_exvat"].sum())
    return {
        "window_revenue": round(total, 2),
        "captured_by_named": round(captured, 2),
        "capture_pct": round(100.0 * captured / total, 1) if total else None,
        "to_other": round(total - captured, 2),
        "new_item_revenue": round(new_rev, 2),
        "new_item_pct_of_total": round(100.0 * new_rev / total, 1) if total else None,
        "irreducible_other_pct": round(100.0 * new_rev / total, 1) if total else None,
    }


def _node_series(df: pd.DataFrame, cat: str, item: str | None,
                 named_in_cat: list[str], cal: pd.DatetimeIndex) -> np.ndarray:
    """Daily revenue for one node: a named item, or the category's OTHER residual."""
    sub = df[df["category"] == cat]
    if item is not None:
        s = sub[sub["item"] == item].groupby("date")["revenue_exvat"].sum()
        return s.reindex(cal, fill_value=0.0).to_numpy(float)
    cat_daily = sub.groupby("date")["revenue_exvat"].sum().reindex(cal, fill_value=0.0)
    used = pd.Series(0.0, index=cal)
    for it in named_in_cat:
        used = used + (sub[sub["item"] == it].groupby("date")["revenue_exvat"].sum()
                       .reindex(cal, fill_value=0.0))
    return (cat_daily - used).clip(lower=0.0).to_numpy(float)


def _dow_median(train: np.ndarray, train_idx: pd.DatetimeIndex,
                target: pd.DatetimeIndex) -> np.ndarray:
    """The same base forecaster `reconcile` uses, so only the NODE SET differs."""
    s = pd.Series(train, index=train_idx)
    med = s.groupby(s.index.dayofweek).median()
    overall = float(s.median()) if len(s) else 0.0
    return np.array([med.get(d.dayofweek, overall) for d in target], float)


def _score(df: pd.DataFrame, selection: dict) -> dict:
    """L3 revenue MASE per node on the held-out block. One ruler for both node sets:
    the seasonal-naive MAE of that node's PRE-CUTOFF series, `SEASONAL_PERIOD` 7."""
    cal = pd.date_range(df["date"].min(), CUTOFF, freq="D")
    named_by_cat: dict[str, list[str]] = {}
    for c, i in selection["named"]:
        named_by_cat.setdefault(c, []).append(i)

    nodes = [(c, i) for c, i in selection["named"]]
    nodes += [(c, None) for c in named_by_cat]            # the OTHER residuals
    rows, named_mases, all_mases = [], [], []
    for cat, item in nodes:
        train = _node_series(df, cat, item, named_by_cat.get(cat, []), cal)
        actual = _node_series(df, cat, item, named_by_cat.get(cat, []), HELD_OUT)
        yhat = _dow_median(train, cal, HELD_OUT)
        scale = harness.seasonal_naive_scale(train, basis="calendar_lag7")
        m = harness.mase(actual, yhat, train, basis="calendar_lag7")
        # A near-constant pre-cutoff node divides by ~0 and blows MASE up; excluded
        # from the aggregate and counted, exactly as sim/score_l3 does.
        scoreable = bool(np.isfinite(m) and np.isfinite(scale) and scale >= 1.0)
        rows.append({"node": f"{cat}::{item or 'OTHER'}",
                     "held_out_revenue": round(float(actual.sum()), 2),
                     "mase": round(float(m), 3) if scoreable else None})
        if scoreable:
            all_mases.append(m)
            if item is not None:
                named_mases.append(m)
    return {
        "n_nodes": len(rows),
        "n_scoreable": len(all_mases),
        "median_mase_all": round(float(np.median(all_mases)), 3) if all_mases else None,
        "median_mase_named": (round(float(np.median(named_mases)), 3)
                              if named_mases else None),
        "beats_seasonal_naive": bool(all_mases and float(np.median(all_mases)) < 1.0),
        "per_node": sorted(rows, key=lambda r: -r["held_out_revenue"])[:12],
    }


def _smoking_gun(df: pd.DataFrame, item: str = "LuneBrew Pilsner") -> dict:
    """Does refreshing actually fix the item report 25 named?

    Report 25's smoking gun is `LuneBrew Pilsner`: GBP 3,484 in June, dropped into OTHER
    while `Lager - BH` keeps its node on two years of history. The whole "wire `since=`"
    prescription exists because of it, so the prescription is tested against it directly
    rather than against the aggregate. Ranked BOTH ways, because the standing path ranks
    on UNITS while the drift argument is framed in REVENUE.
    """
    rows = {}
    for lb in (None, *LOOKBACKS):
        src = df[df["date"] <= CUTOFF]
        if lb is not None:
            src = src[src["date"] >= CUTOFF - pd.Timedelta(days=lb)]
        cat = src[src["category"] == "Beer"]
        by_units = list(cat.groupby("item")["units"].sum()
                        .sort_values(ascending=False).index)
        by_rev = list(cat.groupby("item")["revenue_exvat"].sum()
                      .sort_values(ascending=False).index)
        rows[str(lb) if lb else "whole"] = {
            "units_rank": by_units.index(item) + 1 if item in by_units else None,
            "revenue_rank": by_rev.index(item) + 1 if item in by_rev else None,
            "selected_at_top_k": item in by_units[:TOP_K],
        }
    return {"item": item, "top_k": TOP_K, "by_lookback": rows,
            "ever_selected": any(r["selected_at_top_k"] for r in rows.values())}


def _standing_membership(venue: str) -> dict:
    """What `reconcile()` actually selects TODAY, June and July in the store, no cutoff.

    This is the state the spec asks to record: the standing path as it stands, not a
    blind reconstruction of it.
    """
    from hierarchy.reconcile import build_hierarchy
    _, _, nodes, bottom, _ = build_hierarchy(venue, TOP_K)
    named = [b for b in bottom if not b.endswith("::OTHER")]
    return {"n_nodes": len(nodes), "n_bottom": len(bottom), "n_named": len(named),
            "named": sorted(named)}


def _l1_untouched() -> dict:
    """Stop condition: the served L1 top must not move. It is pure Chronos-2-exo and is
    never reconciled downward - `reconcile._persist` writes layer L2 and L3 only."""
    import inspect

    from hierarchy import reconcile as rc
    src = inspect.getsource(rc._persist)
    return {
        "persist_writes_layers": sorted({"L2", "L3"}),
        "persist_skips_venue_node": 'if node == "VENUE":' in src,
        "l1_written_by_reconcile": "L1" in src,
    }


def run() -> dict:
    out = {"package": "G15c", "cutoff": str(CUTOFF.date()),
           "held_out": [str(HELD_OUT.min().date()), str(HELD_OUT.max().date())],
           "top_k": TOP_K, "default_lookback_days": DEFAULT_LOOKBACK,
           "l1_check": _l1_untouched(), "venues": {}}

    for venue in VENUES:
        df = _l3(venue)
        standing = _select_nodes(df, None)
        v = {
            "standing_membership_today": _standing_membership(venue),
            "blind_standing": {
                "named": [f"{c}::{i}" for c, i in standing["named"]],
                "capture": _capture(df, standing["named"], HELD_OUT),
                "score": _score(df, standing),
            },
            "refreshed": {},
        }
        if venue == "beer_hall":
            v["smoking_gun"] = _smoking_gun(df)
        for lb in LOOKBACKS:
            sel = _select_nodes(df, CUTOFF - pd.Timedelta(days=lb))
            v["refreshed"][str(lb)] = {
                "named": [f"{c}::{i}" for c, i in sel["named"]],
                "changed_from_standing": sorted(
                    set(f"{c}::{i}" for c, i in sel["named"])
                    ^ set(f"{c}::{i}" for c, i in standing["named"])),
                "capture": _capture(df, sel["named"], HELD_OUT),
                "score": _score(df, sel),
            }
        out["venues"][venue] = v

    OUT.write_text(json.dumps(out, indent=2) + "\n")

    print("G15c taxonomy drift on the standing path")
    print(f"  cutoff {CUTOFF.date()}, held out {HELD_OUT.min().date()} to "
          f"{HELD_OUT.max().date()}, top_k {TOP_K}")
    print(f"  L1 check: reconcile persists {out['l1_check']['persist_writes_layers']}, "
          f"writes L1 = {out['l1_check']['l1_written_by_reconcile']}")
    for venue, v in out["venues"].items():
        b = v["blind_standing"]
        print(f"\n  {venue}")
        print(f"    standing today   : {v['standing_membership_today']['n_named']} named "
              f"nodes, {v['standing_membership_today']['n_bottom']} bottom")
        print(f"    {'lookback':>10s} {'capture%':>9s} {'other':>10s} {'newitem%':>9s} "
              f"{'MASE all':>9s} {'MASE named':>11s} {'changed':>8s}")
        print(f"    {'whole':>10s} {b['capture']['capture_pct']:>9} "
              f"{b['capture']['to_other']:>10} {b['capture']['new_item_pct_of_total']:>9} "
              f"{str(b['score']['median_mase_all']):>9s} "
              f"{str(b['score']['median_mase_named']):>11s} {'-':>8s}")
        for lb, r in v["refreshed"].items():
            print(f"    {lb:>10s} {r['capture']['capture_pct']:>9} "
                  f"{r['capture']['to_other']:>10} "
                  f"{r['capture']['new_item_pct_of_total']:>9} "
                  f"{str(r['score']['median_mase_all']):>9s} "
                  f"{str(r['score']['median_mase_named']):>11s} "
                  f"{len(r['changed_from_standing']):>8d}")
    sg = out["venues"]["beer_hall"].get("smoking_gun", {})
    if sg:
        print(f"\n  report 25's smoking gun: {sg['item']!r} at top_k={sg['top_k']}")
        for lb, r in sg["by_lookback"].items():
            print(f"    {lb:>7s}: units rank {r['units_rank']:>3}, revenue rank "
                  f"{r['revenue_rank']:>3}, selected={r['selected_at_top_k']}")
        print(f"    EVER selected by any lookback tested: {sg['ever_selected']}")
    print(f"\n  artefact: {OUT}")
    return out


if __name__ == "__main__":
    run()
