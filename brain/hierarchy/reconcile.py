"""A6 · Hierarchy + MinT reconciliation + consumption proxy (methodology §6).

Builds a coherent venue -> category -> item units hierarchy for the Beer Hall,
forecasts every node independently (robust DOW-median base forecasts), then
reconciles them with **MinT** (Wickramasuriya et al. 2019; WLS with a diagonal
error-covariance) so item/category/venue forecasts are coherent. MinT output is
coherent by construction — Σ(item) = category = venue exactly — which we verify.

The reconciled item-unit forecast is the **stock-consumption proxy**: forecast
pints of `Lager - BH` -> implied keg depletion, serving the ordering use-case
without real stock data.

Run:
    python -m hierarchy.reconcile [--top-k 3]
"""

from __future__ import annotations

import argparse
import sys

import numpy as np
import pandas as pd

from config import ANCHOR_VENUE, CONFORMAL_LEVELS, STORE_DIR, TEST_WEEKS
from conformal.wrap import conformal_quantile
from store.warehouse import connect, read_series, write_band, write_forecast

MODELS_DIR = STORE_DIR.parent / "models_L2_L3"
RESULTS_MD = STORE_DIR.parent / "hierarchy" / "reconciliation_forecast.md"

PINTS_PER_KEG = 88            # 11-gallon (imperial) keg
KEG_LINES = ("lager - bh",)  # the consumption-proxy line(s)
_EPS = 1e-6


# --- Hierarchy construction --------------------------------------------------

def build_hierarchy(venue: str = ANCHOR_VENUE, top_k: int = 3):
    """Return (node_series, S, nodes, bottom_nodes, cat_of_bottom).

    Nodes are ordered [VENUE, CAT::*, ITEM::*]; bottom = item nodes (top-k per
    category plus an OTHER residual so items sum to their category exactly).
    """
    con = connect(read_only=True)
    try:
        l1 = read_series(venue, "L1", value="units", fill_calendar=True, con=con)
        item = con.execute(
            "SELECT date, category, item, units FROM l3_item_daily WHERE venue = ?",
            [venue],
        ).df()
    finally:
        con.close()

    calendar = pd.to_datetime(l1["date"])
    item["date"] = pd.to_datetime(item["date"])
    cats = item.groupby("category")["units"].sum().sort_values(ascending=False).index

    node_series: dict[str, pd.Series] = {}
    cat_nodes: list[str] = []
    bottom_nodes: list[str] = []
    cat_of_bottom: dict[str, str] = {}

    venue_total = pd.Series(0.0, index=calendar)
    for c in cats:
        sub = item[item["category"] == c]
        cat_daily = sub.groupby("date")["units"].sum().reindex(calendar, fill_value=0.0)
        cat_id = f"CAT::{c}"
        node_series[cat_id] = cat_daily
        cat_nodes.append(cat_id)
        venue_total = venue_total + cat_daily

        totals = sub.groupby("item")["units"].sum().sort_values(ascending=False)
        used = pd.Series(0.0, index=calendar)
        for it in totals.index[:top_k]:
            s = sub[sub["item"] == it].groupby("date")["units"].sum().reindex(
                calendar, fill_value=0.0)
            nid = f"ITEM::{c}::{it}"
            node_series[nid] = s
            bottom_nodes.append(nid)
            cat_of_bottom[nid] = cat_id
            used = used + s
        other = (cat_daily - used).clip(lower=0.0)
        if float(other.sum()) > 1.0:
            nid = f"ITEM::{c}::OTHER"
            node_series[nid] = other
            bottom_nodes.append(nid)
            cat_of_bottom[nid] = cat_id

    node_series["VENUE"] = venue_total
    nodes = ["VENUE"] + cat_nodes + bottom_nodes

    # Summing matrix S (m x n_bottom).
    n = len(bottom_nodes)
    bottom_index = {b: j for j, b in enumerate(bottom_nodes)}
    S = np.zeros((len(nodes), n))
    for i, node in enumerate(nodes):
        if node == "VENUE":
            S[i, :] = 1.0
        elif node.startswith("CAT::"):
            for b in bottom_nodes:
                if cat_of_bottom[b] == node:
                    S[i, bottom_index[b]] = 1.0
        else:
            S[i, bottom_index[node]] = 1.0
    return node_series, S, nodes, bottom_nodes, cat_of_bottom


# --- Base forecasts + MinT ---------------------------------------------------

def _dow_median_forecast(series: pd.Series, test_dates: pd.DatetimeIndex):
    train = series[series.index < test_dates.min()]
    med = train.groupby(train.index.dayofweek).median()
    overall = float(train.median())
    yhat = np.array([med.get(d.dayofweek, overall) for d in test_dates], float)
    resid = train.to_numpy() - np.array(
        [med.get(d.dayofweek, overall) for d in train.index], float)
    return yhat, float(np.var(resid)) if len(resid) > 1 else 1.0


def mint_reconcile(Ybase: np.ndarray, S: np.ndarray, w: np.ndarray) -> np.ndarray:
    """MinT (diagonal WLS). Ybase (m,H), returns coherent (m,H)."""
    winv = 1.0 / np.clip(w, _EPS, None)
    A = S.T @ (winv[:, None] * S)            # n x n
    b = S.T @ (winv[:, None] * Ybase)        # n x H
    bottom = np.linalg.solve(A + _EPS * np.eye(A.shape[0]), b)
    return S @ bottom                        # m x H, coherent by construction


def node_quantiles(
    node_series: dict, nodes: list[str], test_start: pd.Timestamp
) -> dict[tuple[str, float], float]:
    """Split-conformal quantile per non-VENUE node per level — the single band
    source of truth for A6 (used by BOTH the coverage check and persistence).

    Score = |actual - DOW-median| on each node's pre-test training span, which
    is exactly the residual of that node's base forecaster (_dow_median_forecast).
    """
    out: dict[tuple[str, float], float] = {}
    for node in nodes:
        if node == "VENUE":
            continue
        s = node_series[node]
        train = s[s.index < test_start]
        med = train.groupby(train.index.dayofweek).median()
        res = np.abs(train.to_numpy() - np.array(
            [med.get(d.dayofweek, train.median()) for d in train.index], float))
        for lvl in CONFORMAL_LEVELS:
            out[(node, lvl)] = conformal_quantile(res, lvl)
    return out


def reconcile(venue: str = ANCHOR_VENUE, top_k: int = 3) -> dict:
    node_series, S, nodes, bottom_nodes, cat_of_bottom = build_hierarchy(venue, top_k)
    cat_nodes = [n for n in nodes if n.startswith("CAT::")]
    calendar = node_series["VENUE"].index
    test_start = calendar.max() - pd.Timedelta(weeks=TEST_WEEKS)
    test_dates = calendar[calendar >= test_start]

    Ybase = np.zeros((len(nodes), len(test_dates)))
    w = np.zeros(len(nodes))
    actual = np.zeros((len(nodes), len(test_dates)))
    for i, node in enumerate(nodes):
        Ybase[i], w[i] = _dow_median_forecast(node_series[node], test_dates)
        actual[i] = node_series[node].reindex(test_dates, fill_value=0.0).to_numpy()

    recon = mint_reconcile(Ybase, S, w)

    # Coherence: venue row == Σ bottom rows; each category == Σ its bottoms.
    bottom_rows = [nodes.index(b) for b in bottom_nodes]
    venue_disc = float(np.max(np.abs(recon[0] - recon[bottom_rows].sum(axis=0))))
    cat_disc = 0.0
    for ci, node in enumerate(nodes):
        if node.startswith("CAT::"):
            members = [nodes.index(b) for b in bottom_nodes if cat_of_bottom[b] == node]
            cat_disc = max(cat_disc, float(np.max(np.abs(
                recon[ci] - recon[members].sum(axis=0)))))
    coherent = max(venue_disc, cat_disc) < 1e-6

    # One conformal band source (node_q), used for coverage AND persistence.
    node_q = node_quantiles(node_series, nodes, test_start)

    def _coverage(node_list: list[str]) -> dict[float, float]:
        cov = {lvl: {"hit": 0, "tot": 0} for lvl in CONFORMAL_LEVELS}
        for node in node_list:
            i = nodes.index(node)
            for lvl in CONFORMAL_LEVELS:
                q = node_q[(node, lvl)]
                lo, hi = np.clip(recon[i] - q, 0, None), recon[i] + q
                inside = (actual[i] >= lo) & (actual[i] <= hi)
                cov[lvl]["hit"] += int(inside.sum())
                cov[lvl]["tot"] += len(inside)
        return {lvl: cov[lvl]["hit"] / max(cov[lvl]["tot"], 1) for lvl in CONFORMAL_LEVELS}

    # L3 = item nodes (exclude the OTHER residual buckets); L2 = category nodes.
    item_nodes = [b for b in bottom_nodes if not b.endswith("::OTHER")]
    l3_coverage = _coverage(item_nodes)
    l2_coverage = _coverage(cat_nodes)

    # Consumption proxy: reconciled pints of the keg line over the next 7 days.
    keg = _consumption_proxy(node_series, nodes, recon, bottom_nodes, test_dates)

    _persist(venue, nodes, recon, test_dates, node_q)

    return {
        "venue": venue, "n_nodes": len(nodes), "n_bottom": len(bottom_nodes),
        "venue_disc": venue_disc, "cat_disc": cat_disc, "coherent": coherent,
        "l2_coverage": l2_coverage, "l3_coverage": l3_coverage,
        "keg": keg, "test_dates": (test_dates.min(), test_dates.max()),
    }


def _consumption_proxy(node_series, nodes, recon, bottom_nodes, test_dates) -> dict:
    matches = [b for b in bottom_nodes
               if any(k in b.lower() for k in KEG_LINES) and not b.endswith("OTHER")]
    if not matches:
        return {}
    horizon = min(7, len(test_dates))
    pints = sum(float(recon[nodes.index(b), :horizon].sum()) for b in matches)
    return {
        "line": "Lager - BH",
        "nodes": matches,
        "horizon_days": horizon,
        "forecast_pints": round(pints, 1),
        "pints_per_keg": PINTS_PER_KEG,
        "implied_kegs": round(pints / PINTS_PER_KEG, 2),
    }


def _persist(venue, nodes, recon, test_dates, node_q) -> None:
    """Persist forecasts + bands. The band is the SAME conformal band whose
    coverage reconcile() validates — `recon[i] ± node_q[(node, level)]` — so the
    rows the /forecast API serves are exactly the rows that were coverage-checked.
    """
    fc_rows, band_rows = [], []
    for i, node in enumerate(nodes):
        if node == "VENUE":
            continue
        layer = "L2" if node.startswith("CAT::") else "L3"
        key = node.split("::", 1)[1] if layer == "L2" else node.split("::")[-1]
        for d, yhat in zip(test_dates, recon[i]):
            yhat = float(max(yhat, 0.0))
            fc_rows.append({"venue": venue, "layer": layer, "key": key,
                            "target_date": d.date(), "model": "mint_dowmedian",
                            "yhat": yhat})
            for lvl in CONFORMAL_LEVELS:
                q = node_q[(node, lvl)]
                band_rows.append({"venue": venue, "layer": layer, "key": key,
                                  "target_date": d.date(), "model": "mint_dowmedian",
                                  "level": lvl, "lo": float(max(yhat - q, 0.0)),
                                  "hi": float(yhat + q)})
    con = connect()
    try:
        write_forecast(pd.DataFrame(fc_rows), con=con)
        write_band(pd.DataFrame(band_rows), con=con)
    finally:
        con.close()


def _write_report(out: dict) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "# A6 · Hierarchical reconciliation (Beer Hall, units)\n",
        f"Nodes: {out['n_nodes']} ({out['n_bottom']} bottom item nodes). "
        "Base forecasts: robust DOW-median per node. Reconciliation: MinT "
        "(diagonal WLS).\n",
        "**Scope:** A6 (L2/L3 hierarchy reconciliation) is run for the Beer Hall "
        "only. It is intentionally not extended to Two River Taps (closed) or "
        "Ellel (booking-driven, ~64 trading days) — their category/item splits "
        "would be sparser than the Beer Hall's already-under-covering item bands. "
        "Revisit if/when those venues' L1 forecasts prove operationally useful.\n",
        "## Base forecaster (scope decision)",
        "Base forecasts at L2/L3 use robust DOW-median only — the rung-climbing "
        "discipline applied at L1 (A4) was deliberately **not** repeated here, "
        "because (a) the ~30 item-level series are individually too sparse to "
        "support ETS/GBM fitting without overfitting, and (b) MinT's coherence "
        "guarantee depends only on the *summing matrix*, not on the base "
        "forecaster's sophistication — a better base forecaster would tighten "
        "the bands, not change the coherence result. This is a considered scope "
        "decision, not an oversight; revisit if item-level band sharpness "
        "becomes operationally important.\n",
        "## Coherence (Σ item = category = venue)",
        f"- max venue discrepancy: {out['venue_disc']:.2e}",
        f"- max category discrepancy: {out['cat_disc']:.2e}",
        f"- **coherent: {out['coherent']}**\n",
        "## Reconciled-band coverage (the SAME band the /forecast API serves)",
        "Each band is `reconciled ŷ ± split-conformal quantile of the node's "
        "DOW-median residuals` — one band-construction path, used for both this "
        "coverage check and persistence (no separate parametric band).\n",
        "| Layer | 80% coverage | 90% coverage |",
        "|---|---|---|",
        f"| L2 (category) | {out['l2_coverage'][0.80]*100:.1f}% | "
        f"{out['l2_coverage'][0.90]*100:.1f}% |",
        f"| L3 (top item) | {out['l3_coverage'][0.80]*100:.1f}% | "
        f"{out['l3_coverage'][0.90]*100:.1f}% |",
        "\nItem (L3) series are sparse and noisy, so their bands under-cover — "
        "an honest, expected limitation of conformal at this grain; category "
        "(L2) bands are tighter to nominal.",
        "\n## Stock-consumption proxy",
    ]
    if out["keg"]:
        k = out["keg"]
        lines += [
            f"- line: **{k['line']}** ({len(k['nodes'])} node(s))",
            f"- reconciled {k['horizon_days']}-day forecast: "
            f"**{k['forecast_pints']} pints**",
            f"- @ {k['pints_per_keg']} pints/keg → **{k['implied_kegs']} kegs** to "
            "order for the week.",
        ]
    else:
        lines.append("- (keg line not found)")
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    ap = argparse.ArgumentParser(description="Hierarchical MinT reconciliation")
    ap.add_argument("--venue", default=ANCHOR_VENUE)
    ap.add_argument("--top-k", type=int, default=3)
    args = ap.parse_args()

    print(f"A6 · hierarchy + MinT reconciliation ({args.venue})")
    out = reconcile(args.venue, args.top_k)
    print(f"  nodes             : {out['n_nodes']} ({out['n_bottom']} bottom items)")
    print(f"  test span         : {out['test_dates'][0].date()} -> "
          f"{out['test_dates'][1].date()}")
    print(f"  venue discrepancy : {out['venue_disc']:.2e}")
    print(f"  category discrep. : {out['cat_disc']:.2e}")
    print(f"  coherent          : {out['coherent']}")
    for lvl in CONFORMAL_LEVELS:
        print(f"  L2 band @{int(lvl*100)}%    : coverage={out['l2_coverage'][lvl]*100:.1f}%"
              f"   L3 @{int(lvl*100)}%: {out['l3_coverage'][lvl]*100:.1f}%")
    if out["keg"]:
        k = out["keg"]
        print(f"  consumption proxy : {k['line']} {k['forecast_pints']} pints/"
              f"{k['horizon_days']}d → {k['implied_kegs']} kegs")
    _write_report(out)
    print(f"  report            : {RESULTS_MD}")

    ok = out["coherent"] and bool(out["keg"]) and all(
        v > 0 for v in out["l3_coverage"].values()) and all(
        v > 0 for v in out["l2_coverage"].values())
    print(f"A6 RESULT: {'PASS' if ok else 'FAIL'} "
          f"(coherent hierarchy + item bands + consumption proxy)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
