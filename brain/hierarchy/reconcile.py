"""A6 · Hierarchy + WLS_v reconciliation + consumption proxy (methodology §6).

Builds a coherent venue -> category -> item units hierarchy for the Beer Hall,
forecasts every node independently (robust DOW-median base forecasts), then
reconciles them so item/category/venue forecasts are coherent. Output is coherent
by construction, Σ(item) = category = venue exactly, which we verify.

**Naming.** The reconciliation formula is exactly Equation (11) of Wickramasuriya
et al. (2019), but with a DIAGONAL W. Those authors reserve the name "MinT" for
their full off-diagonal estimators, MinT(Sample) and MinT(Shrink), and call the
diagonal case **WLS_v** --- of which they write that MinT "can be described as a
WLS estimator" in that case. This module therefore says WLS_v, not MinT. The
diagonal is a deliberate choice, not an approximation of convenience: at 30-odd
nodes over a 399-day calendar the shrinkage estimator would be estimating a
covariance with more entries than the calibration block has rows.

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

from config import (
    ANCHOR_VENUE,
    CONFORMAL_LEVELS,
    REPORT_ROOT,
    TEST_WEEKS,
)
from conformal.wrap import conformal_quantile
from eval import harness
from models.intermittent import croston_classic, croston_sba
from store.warehouse import connect, read_series, write_band, write_forecast

MODELS_DIR = REPORT_ROOT / "models_L2_L3"
RESULTS_MD = REPORT_ROOT / "hierarchy" / "reconciliation_forecast.md"

PINTS_PER_KEG = 88            # 11-gallon (imperial) keg
KEG_LINES = ("lager - bh",)  # the consumption-proxy line(s)
_EPS = 1e-6


# --- Hierarchy construction --------------------------------------------------

def build_hierarchy(venue: str = ANCHOR_VENUE, top_k: int = 3, since=None):
    """Return (node_series, S, nodes, bottom_nodes, cat_of_bottom).

    Nodes are ordered [VENUE, CAT::*, ITEM::*]; bottom = item nodes (top-k per
    category plus an OTHER residual so items sum to their category exactly).

    `since` (G12.17a-2, taxonomy refresh): when given, the top-k ITEM ranking and the
    category ordering are computed from rows on/after that date, so the node set
    tracks the CURRENT menu rather than the whole-history top sellers (the June
    confront proved the historical set drifts). The node SERIES still span the full
    calendar; only the SELECTION uses the recent window. `since=None` keeps the
    original whole-history behaviour.
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
    rank_src = item if since is None else item[item["date"] >= pd.Timestamp(since)]
    cats = rank_src.groupby("category")["units"].sum().sort_values(ascending=False).index

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

        rank_sub = rank_src[rank_src["category"] == c]
        totals = rank_sub.groupby("item")["units"].sum().sort_values(ascending=False)
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


# --- Base forecasts + WLS_v ---------------------------------------------------

def _dow_median_forecast(
    series: pd.Series, test_dates: pd.DatetimeIndex, fit_end: pd.Timestamp | None = None
):
    """DOW-median forecast for `test_dates`, fitted strictly before `fit_end`.

    `fit_end` defaults to the first target date, which is the ordinary
    fit-right-up-to-the-forecast behaviour. A6 passes an EARLIER boundary so the
    conformal calibration block sits between the fit span and the test block and
    the same fitted median produces both the calibration scores and the test
    point forecast --- the disjointness split conformal's guarantee rests on.

    The second return value is the IN-SAMPLE residual variance. A6 no longer uses
    it (its MinT weights come off the held-out calibration block, see
    `node_quantiles`); the `sim/` July builders still do.
    """
    train = series[series.index < (fit_end or test_dates.min())]
    med = train.groupby(train.index.dayofweek).median()
    overall = float(train.median())
    yhat = np.array([med.get(d.dayofweek, overall) for d in test_dates], float)
    resid = train.to_numpy() - np.array(
        [med.get(d.dayofweek, overall) for d in train.index], float)
    return yhat, float(np.var(resid)) if len(resid) > 1 else 1.0


def unbiasedness_check(cal_resid: dict, nodes: list[str], alpha: float = 0.05) -> dict:
    """Test the condition WLS_v inherits from MinT, per node, on held-out residuals.

    Wickramasuriya et al. (2019) build the whole result on unbiased base forecasts:
    "Let e_T(h) = y_{T+h} - yhat_T(h) be the h-step-ahead conditionally stationary base
    forecast errors with E[e_T(h)|I_T] = 0 ... This implies that the base forecasts are
    unbiased." Theorem 1 then minimises the trace "such that SPS = S", which is what makes
    the reconciled forecasts "the best (minimum variance) linear UNBIASED reconciled
    forecasts". The 2019 paper says nothing about what happens when the bases are biased;
    Athanasopoulos et al. (2024) note only that dropping unbiasedness leads to a different
    (Ben Taieb & Koo) estimator, which is not what is implemented here.

    So the honest statement is conditional, and this measures the condition. A DOW MEDIAN is
    a median-eliciting forecaster, and on a right-skewed node the median sits below the mean,
    so a negative mean residual is the outcome to expect rather than a surprise.

    One-sample t-test of mean(e) = 0 per node on the calibration block. No multiplicity
    correction is applied and the count is reported raw, because the quantity of interest is
    the direction and size of any bias, not a family-wise decision.
    """
    from scipy import stats as _stats

    rows = []
    for node in nodes:
        e = cal_resid.get(node)
        if e is None or np.asarray(e).size < 2:
            continue
        e = np.asarray(e, dtype=float)
        e = e[np.isfinite(e)]
        n = int(e.size)
        if n < 2:
            continue
        mean = float(e.mean())
        sd = float(e.std(ddof=1))
        se = sd / np.sqrt(n) if sd > 0 else 0.0
        if se > 0:
            t = mean / se
            p = float(2 * _stats.t.sf(abs(t), df=n - 1))
            half = float(_stats.t.ppf(1 - alpha / 2, df=n - 1) * se)
        else:
            t, p, half = (float("nan"), float("nan"), 0.0)
        rows.append({
            "node": node, "n": n, "mean_residual": mean, "se": float(se),
            "ci_lo": mean - half, "ci_hi": mean + half,
            "t": float(t), "p": p,
            "biased": bool(np.isfinite(p) and p < alpha),
        })
    n_biased = sum(1 for r in rows if r["biased"])
    return {
        "alpha": alpha,
        "n_nodes_tested": len(rows),
        "n_biased": n_biased,
        # Sign of the bias where it is detected: a median-eliciting base on skewed
        # nodes is expected to sit low, i.e. a POSITIVE mean residual (actual - forecast).
        "n_biased_positive": sum(1 for r in rows if r["biased"] and r["mean_residual"] > 0),
        "holds": bool(n_biased == 0),
        "nodes": rows,
    }


def mint_reconcile(Ybase: np.ndarray, S: np.ndarray, w: np.ndarray) -> np.ndarray:
    """WLS_v reconciliation: Wickramasuriya et al. (2019) Eq. (11) with a diagonal
    W. Named WLS_v, not MinT, after those authors' own convention --- see the module
    docstring. Ybase (m,H), returns coherent (m,H)."""
    winv = 1.0 / np.clip(w, _EPS, None)
    A = S.T @ (winv[:, None] * S)            # n x n
    b = S.T @ (winv[:, None] * Ybase)        # n x H
    bottom = np.linalg.solve(A + _EPS * np.eye(A.shape[0]), b)
    return S @ bottom                        # m x H, coherent by construction


def node_quantiles(
    node_series: dict, nodes: list[str], cal_start: pd.Timestamp,
    test_start: pd.Timestamp,
) -> tuple[dict[tuple[str, float], float], dict[str, np.ndarray]]:
    """Split-conformal quantile per non-VENUE node per level, the single band
    source of truth for A6 (used by BOTH the coverage check and persistence).

    Score = |actual - DOW-median| on the CALIBRATION block `[cal_start,
    test_start)`, with the median fitted strictly before `cal_start`. The
    calibration set is therefore disjoint from the fitting set, which is the
    entire source of split conformal's finite-sample guarantee (Lei et al. 2018;
    Angelopoulos & Bates 2023 §1) --- and `reconcile` predicts the test block
    from that same fitted median, so the guarantee transfers to the served band.

    This previously scored the fitting span itself. A DOW median is fitted to the
    very points it was then scored against, so the quantile was of an in-sample
    residual: optimistically narrow, and carrying no guarantee at all despite the
    name. Returns the signed calibration residuals alongside, because MinT's W is
    the base-forecast ERROR covariance and an in-sample residual understates it
    for the same reason.
    """
    out: dict[tuple[str, float], float] = {}
    resid: dict[str, np.ndarray] = {}
    for node in nodes:
        s = node_series[node]
        cal_dates = s.index[(s.index >= cal_start) & (s.index < test_start)]
        if not len(cal_dates):
            continue
        yhat, _ = _dow_median_forecast(s, cal_dates, cal_start)
        resid[node] = s.reindex(cal_dates, fill_value=0.0).to_numpy(float) - yhat
        if node == "VENUE":
            continue
        for lvl in CONFORMAL_LEVELS:
            out[(node, lvl)] = conformal_quantile(np.abs(resid[node]), lvl)
    return out, resid


def reconcile(venue: str = ANCHOR_VENUE, top_k: int = 3) -> dict:
    node_series, S, nodes, bottom_nodes, cat_of_bottom = build_hierarchy(venue, top_k)
    cat_nodes = [n for n in nodes if n.startswith("CAT::")]
    calendar = node_series["VENUE"].index
    # Three disjoint blocks of TEST_WEEKS each, walking back from the end of the
    # calendar, so no block is ever asked to do two jobs:
    #   [test_start, end]        test    --- reported, touched by nothing else
    #   [cal_start, test_start)  calibration --- conformal scores + MinT weights
    #   [val_start, cal_start)   validation  --- the Croston/DOW adoption contest
    #   < val_start              fit         --- the contest's estimators
    # Everything the test block sees is fitted strictly before cal_start.
    test_start = calendar.max() - pd.Timedelta(weeks=TEST_WEEKS)
    cal_start = test_start - pd.Timedelta(weeks=TEST_WEEKS)
    val_start = cal_start - pd.Timedelta(weeks=TEST_WEEKS)
    test_dates = calendar[calendar >= test_start]

    Ybase = np.zeros((len(nodes), len(test_dates)))
    w = np.ones(len(nodes))
    actual = np.zeros((len(nodes), len(test_dates)))
    for i, node in enumerate(nodes):
        Ybase[i], _ = _dow_median_forecast(node_series[node], test_dates, cal_start)
        actual[i] = node_series[node].reindex(test_dates, fill_value=0.0).to_numpy()

    # One conformal band source (node_q), used for coverage AND persistence.
    node_q, cal_resid = node_quantiles(node_series, nodes, cal_start, test_start)

    # MinT's W is the base-forecast error covariance, so the weights come off the
    # held-out calibration block rather than the fitting span.
    for i, node in enumerate(nodes):
        e = cal_resid.get(node)
        if e is not None and e.size > 1:
            w[i] = float(np.var(e))

    # The precondition WLS_v inherits from MinT, tested rather than assumed.
    unbiased = unbiasedness_check(cal_resid, nodes)

    # WP2: every intermittent L3 node (ADI >= 4/3) moves off the DOW-median onto the
    # Croston-family estimator its (ADI, CV-squared) pair selects. No decision reads
    # the test block. Adoption overrides Ybase/w/node_q in place, so MinT and the band
    # both use it. MinT coherence is unaffected (S unchanged).
    from eval.intermittency_diagnostic import intermittent_node_stats
    intermittent = intermittent_node_stats(venue, top_k)
    croston_rows = _croston_comparison(
        node_series, nodes, test_dates, test_start, cal_start, val_start,
        intermittent, Ybase, w, node_q)

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

    # Optional inventory-aware upgrade: if A12 has written stock_cover, attach the
    # on-hand position so the demand-only proxy becomes a days-of-cover signal.
    # A6 still runs headless when no stock table exists (spec G6).
    stock = _read_stock_position()

    return {
        "venue": venue, "n_nodes": len(nodes), "n_bottom": len(bottom_nodes),
        "venue_disc": venue_disc, "cat_disc": cat_disc, "coherent": coherent,
        "l2_coverage": l2_coverage, "l3_coverage": l3_coverage,
        "keg": keg, "stock": stock, "test_dates": (test_dates.min(), test_dates.max()),
        "croston": croston_rows, "unbiasedness": unbiased,
    }


VAL_SUBBLOCK_DAYS = 7


def _one_se_adopt(y_val, dow_pred, est_pred, y_fit) -> tuple[bool, float]:
    """One-standard-error adoption gate, per `ledger/prereg_adoption_margin_2026-08-01.md`.

    Returns `(adopt, mean(d) + se)`. Adopt only when that quantity is negative, i.e. when
    the estimator's mean advantage over the DOW median exceeds one standard error of that
    advantage (Breiman et al. 1984). The bare inequality it replaces adopted on any margin
    at all, and adopted a node that won by 0.21 per cent and then scored 96 per cent worse
    on the test block.

    The differential is paired over DISJOINT 7-day sub-blocks: both candidates are scored
    on identical days, so the sub-block's own difficulty cancels, and disjointness keeps
    the standard error a plain one rather than requiring a moving-block bootstrap. Daily
    differentials would be serially correlated and would understate the standard error,
    making the margin too easy to clear.

    Fail-closed on fewer than two sub-blocks, on any non-finite differential (a node with
    no sales in the fitting span has a zero scaled-error denominator), and on zero
    dispersion, which would collapse the rule back to the bare inequality.
    """
    n_blocks = len(y_val) // VAL_SUBBLOCK_DAYS
    if n_blocks < 2:
        return False, float("nan")
    d = []
    for b in range(n_blocks):
        sl = slice(b * VAL_SUBBLOCK_DAYS, (b + 1) * VAL_SUBBLOCK_DAYS)
        d.append(harness.mase(y_val[sl], est_pred[sl], y_fit, basis="calendar_lag7")
                 - harness.mase(y_val[sl], dow_pred[sl], y_fit, basis="calendar_lag7"))
    d = np.asarray(d, float)
    if not np.all(np.isfinite(d)):
        return False, float("nan")
    sd = float(np.std(d, ddof=1))
    if sd == 0.0:
        return False, float("nan")
    crit = float(np.mean(d)) + sd / np.sqrt(n_blocks)
    return bool(crit < 0.0), crit


def _croston_comparison(node_series, nodes, test_dates, test_start, cal_start,
                        val_start, intermittent, Ybase, w, node_q) -> list[dict]:
    """WP2: choose between the DOW-median and a Croston-family estimator per node.

    No decision touches the test block, and no block does two jobs:

      * WHICH intermittent estimator is Kostenko-Hyndman `select_sba(adi, cv2)` --- SBA
        above `cv2 = 2 - (3/2) adi`, Croston below --- read off the training window.
      * WHETHER it displaces the DOW-median is a MASE contest on the VALIDATION block
        `[val_start, cal_start)`, with both forecasters fitted strictly before it. The
        winner is then refitted on everything before `cal_start` for the test forecast.
      * Its band and its MinT weight come off the CALIBRATION block, scored with that
        refit --- held out from the fit, and disjoint from the block that selected it.

    Adoption originally ran the contest on the test block itself and then reported that
    same block's MASE, so the published figure was a minimum over two forecasters, biased
    low, and not an out-of-sample number for the rule in force. The band was then taken
    over the estimator's own in-sample residual, understating it a second time. Both
    blocks now sit strictly between the fit span and the test block.

    Adoption overrides Ybase (fed to MinT and persistence), w (the MinT trust weight) and
    node_q (so the band is calibrated on the forecaster that produces the point). Returns
    one row per node for the report.
    """
    # Deferred: intermittency_diagnostic imports build_hierarchy from this module.
    from eval.intermittency_diagnostic import select_sba

    rows = []
    for node, stats in intermittent.items():
        if node not in nodes:
            continue
        i = nodes.index(node)
        s = node_series[node]
        ytr = s[s.index < cal_start].to_numpy(float)
        y_true = s.reindex(test_dates, fill_value=0.0).to_numpy(float)
        dow_pred = Ybase[i].copy()

        use_sba = select_sba(stats["adi"], stats["cv2"])
        rate = (croston_sba if use_sba else croston_classic)(ytr, alpha=0.1)
        cro_pred = np.full(len(test_dates), rate, float)

        # The contest, on the validation block, both fitted strictly before it.
        val_dates = s.index[(s.index >= val_start) & (s.index < cal_start)]
        fit = s[s.index < val_start]
        adopt = False
        val_dow = val_est = margin = float("nan")
        if len(val_dates) and len(fit) > 1:
            yv = s.reindex(val_dates, fill_value=0.0).to_numpy(float)
            yfit = fit.to_numpy(float)
            dow_val, _ = _dow_median_forecast(fit, val_dates, val_start)
            est_val = np.full(len(val_dates),
                              (croston_sba if use_sba else croston_classic)(
                                  yfit, alpha=0.1), float)
            val_dow = harness.mase(yv, dow_val, yfit, basis="calendar_lag7")
            val_est = harness.mase(yv, est_val, yfit, basis="calendar_lag7")
            adopt, margin = _one_se_adopt(yv, dow_val, est_val, yfit)

        # Held-out residual of the estimator that would actually be served: the rate
        # is fitted strictly before cal_start, the block starts at it.
        cal_dates = s.index[(s.index >= cal_start) & (s.index < test_start)]
        signed = s.reindex(cal_dates, fill_value=0.0).to_numpy(float) - rate
        signed = signed[np.isfinite(signed)]
        adopt = adopt and signed.size > 1
        if adopt:
            Ybase[i] = cro_pred
            # Variance of the SIGNED residual: MinT's W is the base-forecast error
            # covariance (Wickramasuriya et al. 2019 §2.3). Taking it over |e| measured
            # the spread of the error MAGNITUDE, a different and smaller quantity, so
            # every intermittent node was over-trusted relative to its DOW-median peers.
            w[i] = float(np.var(signed))
            for lvl in CONFORMAL_LEVELS:
                node_q[(node, lvl)] = conformal_quantile(np.abs(signed), lvl)
        rows.append({
            "node": node, "adopted": adopt,
            "method": "sba" if use_sba else "croston",
            "adi": stats["adi"], "cv2": stats["cv2"],
            "val_mase_dow": val_dow, "val_mase_est": val_est, "one_se_crit": margin,
            "mae_dow": harness.mae(y_true, dow_pred),
            "mae_sba": harness.mae(y_true, cro_pred),
            "mase_dow": harness.mase(y_true, dow_pred, ytr, basis="calendar_lag7"),
            "mase_sba": harness.mase(y_true, cro_pred, ytr, basis="calendar_lag7"),
        })
    return rows


def _read_stock_position() -> list[dict]:
    """Read mapped days-of-cover rows from the A12 `stock_cover` table, if it
    exists. Returns [] when stock has not been ingested, keeping A6 headless."""
    con = connect(read_only=True)
    try:
        exists = con.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_cover'"
        ).fetchone()
        if not exists:
            return []
        return con.execute(
            "SELECT product_canon, l1, on_hand_kegs, on_hand_pints, "
            "forecast_daily_pints, days_of_cover, reorder_flag, "
            "suggested_order_kegs, a6_node FROM stock_cover "
            "WHERE a6_node IS NOT NULL ORDER BY days_of_cover"
        ).df().to_dict("records")
    finally:
        con.close()


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
    coverage reconcile() validates, `recon[i] ± node_q[(node, level)]`, so the
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


def _croston_section(rows: list[dict]) -> list[str]:
    # Deferred: intermittency_diagnostic imports build_hierarchy from this module.
    from eval.intermittency_diagnostic import ADI_INTERMITTENT_CUTOFF

    if not rows:
        return [
            "\n## Intermittency: Croston/SBA vs DOW-median (WP2)",
            f"No non-OTHER L3 node classified as intermittent "
            f"(ADI >= {ADI_INTERMITTENT_CUTOFF:.4f}), so the "
            "DOW-median base forecaster stands unchanged (see "
            "eval/intermittency_diagnostic.md).",
        ]

    def fmt(x: float) -> str:
        return "n/a" if not np.isfinite(x) else f"{x:.3f}"

    n_adopt = sum(1 for r in rows if r["adopted"])
    n_sba = sum(1 for r in rows if r["adopted"] and r["method"] == "sba")
    out = [
        "\n## Intermittency: Croston/SBA vs DOW-median (WP2)",
        "For each intermittent L3 node (ADI >= 4/3), Kostenko-Hyndman "
        "`cv2 > 2 - (3/2) adi` picks the estimator and a MASE contest on the "
        "VALIDATION block (the third TEST_WEEKS block back from the end of the "
        "calendar, both forecasters fitted strictly before it) decides whether it "
        "displaces the DOW-median, under a ONE-STANDARD-ERROR margin: the estimator must "
        "beat the DOW-median by more than one standard error of the paired differential "
        "over disjoint 7-day sub-blocks (`1-SE crit` column, adopt when negative), not "
        "merely by any amount. The margin was pre-registered in "
        "`ledger/prereg_adoption_margin_2026-08-01.md` before implementation, AFTER "
        "observing that the bare inequality adopted a node on a 0.21% margin which then "
        "scored 96% worse on test; that ordering is stated rather than concealed. "
        "An adopted estimator is then refitted on everything "
        "before the CALIBRATION block, which supplies its band and its weight. The TEST "
        "columns are therefore reported, never selected on. WLS_v coherence is preserved "
        "either way.",
        f"\n**{n_adopt} of {len(rows)}** intermittent nodes adopted an intermittent "
        f"estimator ({n_sba} SBA, {n_adopt - n_sba} Croston).\n",
        "| Node | ADI | CV2 | Est. | val MASE DOW | val MASE est | 1-SE crit | Adopted "
        "| test MASE DOW | test MASE est |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        out.append(
            f"| {r['node']} | {fmt(r['adi'])} | {fmt(r['cv2'])} | {r['method']} | "
            f"{fmt(r['val_mase_dow'])} | {fmt(r['val_mase_est'])} | "
            f"{fmt(r.get('one_se_crit', float('nan')))} | "
            f"{'yes' if r['adopted'] else 'no'} | "
            f"{fmt(r['mase_dow'])} | {fmt(r['mase_sba'])} |")
    return out


def _write_report(out: dict) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "# A6 · Hierarchical reconciliation (Beer Hall, units)\n",
        f"Nodes: {out['n_nodes']} ({out['n_bottom']} bottom item nodes). "
        "Base forecasts: robust DOW-median per node. Reconciliation: **WLS_v** "
        "(Wickramasuriya et al. 2019 Eq. 11 with a diagonal W; those authors reserve "
        "\"MinT\" for the off-diagonal Sample/Shrink estimators, so this artefact does "
        "not use that name).\n",
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
    ]
    ub = out.get("unbiasedness")
    if ub:
        lines += [
            "## Base-forecast unbiasedness (the precondition WLS_v inherits from MinT)",
            "Wickramasuriya et al. (2019) assume `E[e_T(h)|I_T] = 0` and deliver the best "
            "minimum-variance linear **unbiased** reconciled forecasts. The condition is "
            "measured here rather than assumed: a one-sample t-test of mean(residual) = 0 "
            "per node on the held-out calibration block, `alpha` "
            f"{ub['alpha']}, no multiplicity correction.\n",
            f"- nodes tested: **{ub['n_nodes_tested']}**",
            f"- nodes rejecting unbiasedness: **{ub['n_biased']}** "
            f"(of which {ub['n_biased_positive']} with a positive mean residual, i.e. the "
            "base forecast sits BELOW the actual)",
            f"- **precondition holds across all nodes: {ub['holds']}**\n",
        ]
        if ub["n_biased"]:
            lines += [
                "| node | n | mean resid | 95% CI | p |",
                "|---|---|---|---|---|",
            ]
            for r in sorted((x for x in ub["nodes"] if x["biased"]),
                            key=lambda x: x["p"]):
                lines.append(
                    f"| {r['node']} | {r['n']} | {r['mean_residual']:+.2f} | "
                    f"[{r['ci_lo']:+.2f}, {r['ci_hi']:+.2f}] | {r['p']:.2e} |")
            lines.append(
                "\nA DOW **median** base is median-eliciting, so on a right-skewed node it "
                "is expected to sit below the mean. Where that is what the table shows, the "
                "bias is a property of the chosen base forecaster and not a defect in the "
                "reconciliation. The MinT optimality claim is nonetheless conditional on a "
                "condition these nodes do not meet, and is reported as such.\n")
    lines += [
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
    ]
    lines += _croston_section(out.get("croston", []))
    lines += ["\n## Stock-consumption proxy"]
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

    if out.get("stock"):
        lines += [
            "\n## Inventory-aware reorder (A12 stock-cover join)",
            "The demand-only proxy above becomes a true reorder signal once the "
            "physical on-hand position (A12 `stock_cover`) is joined: "
            "`days_of_cover = on_hand_pints / forecast_daily_pints`. Lines whose "
            "brand is not a forecast A6 node are omitted here (NULL demand, not "
            "guessed).\n",
            "| Product | L1 | On-hand kegs | Forecast pints/day | Days cover | "
            "Reorder | Suggest kegs |",
            "|---|---|---|---|---|---|---|",
        ]
        for s in out["stock"]:
            lines.append(
                f"| {s['product_canon']} | {s['l1']} | {s['on_hand_kegs']:.1f} | "
                f"{s['forecast_daily_pints']:.2f} | **{s['days_of_cover']:.1f}** | "
                f"{'⚠ YES' if s['reorder_flag'] else 'no'} | "
                f"{s['suggested_order_kegs']:.0f} |")
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    ap = argparse.ArgumentParser(description="Hierarchical WLS_v reconciliation")
    ap.add_argument("--venue", default=ANCHOR_VENUE)
    ap.add_argument("--top-k", type=int, default=3)
    args = ap.parse_args()

    print(f"A6 · hierarchy + WLS_v reconciliation ({args.venue})")
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
    if out.get("croston"):
        n_adopt = sum(1 for r in out["croston"] if r["adopted"])
        n_sba = sum(1 for r in out["croston"] if r["adopted"] and r["method"] == "sba")
        print(f"  intermittency     : {n_adopt}/{len(out['croston'])} intermittent "
              f"nodes off DOW-median ({n_sba} SBA, {n_adopt - n_sba} Croston; "
              "ex-ante Kostenko-Hyndman rule)")
    if out["keg"]:
        k = out["keg"]
        print(f"  consumption proxy : {k['line']} {k['forecast_pints']} pints/"
              f"{k['horizon_days']}d → {k['implied_kegs']} kegs")
    if out.get("stock"):
        print(f"  stock-cover join  : {len(out['stock'])} mapped line(s) "
              f"(A12); e.g. {out['stock'][0]['product_canon']} "
              f"{out['stock'][0]['days_of_cover']:.1f}d cover")
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
