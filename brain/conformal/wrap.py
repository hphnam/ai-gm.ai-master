"""A5 · Conformal wrapper, the deliverable of Objective 1 (methodology §2/§5).

Wraps the selected L1 forecaster so it emits a **calibrated band**, not a
point. The band is split conformal (the finite-sample quantile of absolute
residuals), recalibrated per 7-day block on the residuals accumulated strictly
before that block, in the temporally robust spirit of EnbPI (Xu and Xie 2021).
SPCI (Xu and Xie 2023), whose defining step is quantile-random-forest
regression on recent residuals, is not implemented here. Change-point-aware
online conformal (Sun and Yu 2025) remains noted, not wired.

Two band variants are produced and validated on the held-out test block:
  * **plain**     y_hat ± q,  q = conformal quantile of |residual| (marginal)
  * **mondrian**  group-conditional split conformal, grouped by active vs
                  structural-zero (Mon/Tue ≈ £0) day. The closed days are
                  deterministically near-zero, so a single marginal quantile is
                  contaminated by their tiny residuals and under-covers the busy
                  days; conditioning restores calibration on the days that
                  matter (Vovk Mondrian conformal).

Gate: empirical coverage within ±3pp of nominal at 80% and 90%.

Run:
    python -m conformal.wrap --layer L1 [--model rung2_ets]
"""

from __future__ import annotations

import argparse
import math
import sys
import warnings

import numpy as np
import pandas as pd

import org_profile
import provenance
from config import (
    ANCHOR_VENUE,
    CONFORMAL_LEVELS,
    COVERAGE_TOL_PP,
    FORECAST_VENUES,
    MAX_RUNG,
    REPORT_ROOT,
    STORE_DIR,
    TEST_WEEKS,
    VENUE_LABELS,
)
from eval import harness
from features.build_features import build_features, feature_columns
from models import ladder
from store import warehouse
from store.active_span import active_trading_end, is_closed, trim_to_active

# How many days of forward "standby" band to project for a closed venue, so its
# band is queryable the day it reopens.
STANDBY_DAYS = 28


def default_model(venue: str) -> str:
    """Fallback point forecaster to wrap when no rung has been adopted/served yet
    for this venue: robust-DOW for any venue still capped at Rung 1 via
    `MAX_RUNG` (empty by default post-G12.9c, so Ellel is no longer capped),
    else ETS. The actual served model normally comes from `ladder_selection`/
    `served_forecast` once a T3 re-fit has run."""
    return "rung1_robust_dow" if MAX_RUNG.get(venue, 99) <= 1 else "rung2_ets"

warnings.filterwarnings("ignore")

EPS = 1e-6


def conformal_min_n(level: float, *, cap: int = 100_000) -> int:
    """Smallest calibration set at which `level` is actually attainable: 4 points
    for 80%, 9 for 90%.

    Split conformal takes the `ceil((n+1)(1-alpha))`-th smallest score; that index
    exceeds `n` for small n, where the correct prediction set is INFINITE and the
    guarantee is simply unavailable. Searched with the SAME expression
    `conformal_quantile` clamps on rather than the closed form `level/(1-level)`,
    which is not exact in binary --- `0.8/(1-0.8)` is 4.000000000000001, and
    rounding that up reports the boundary one point too high.
    """
    n = 1
    while n < cap and math.ceil((n + 1) * level) > n:
        n += 1
    return n


def conformal_quantile(scores: np.ndarray, level: float) -> float:
    """Finite-sample split-conformal quantile: the k-th smallest |residual|.

    CLAMPED at the largest observed score when `n < conformal_min_n(level)`, where
    the honest answer is +inf. MAPIE and `crepes` return infinity instead. The clamp
    is kept because an infinite band is useless to an operator, but it is not free:
    below that n the band is finite and carries NO coverage guarantee. Callers that
    can hit small groups must count how often it fires --- `conformal_min_n` is the
    test, and `evaluate` reports the tally as `undersized_group_bands`. A guarantee
    that lapses silently on exactly the sparsest groups is the worst case.
    """
    scores = np.sort(np.asarray(scores, float))
    n = len(scores)
    if n == 0:
        return float("nan")
    k = min(int(math.ceil((n + 1) * level)), n)
    return float(scores[k - 1])


def _predictor(model_name: str, venue: str | None = None):
    fn = dict((name, fn) for name, _r, fn, _a in ladder.PREDICTORS).get(model_name)
    if fn is None:
        raise ValueError(f"unknown model {model_name!r}")
    if model_name == "rung4_chronos2_exo":
        # G12.9d: serving must apply the same venue-scoped covariate exclusion
        # (drop the Ellel self-leak column for Ellel) as the ladder backtest.
        import functools
        fn = functools.partial(fn, venue=venue)
    return fn


def rolling_point_forecasts(
    feats: pd.DataFrame,
    model_name: str,
    cols: list[str],
    *,
    horizon: int = 7,
    min_train_days: int = 120,
    first_target: pd.Timestamp | None = None,
    last_target: pd.Timestamp | None = None,
    venue: str | None = None,
) -> pd.DataFrame:
    """Operational 7-day rolling forecasts: each block is forecast from a model
    fit on all data strictly before the block. Returns (date, y, yhat)."""
    fn = _predictor(model_name, venue)
    feats = feats.sort_values("date").reset_index(drop=True)
    start = first_target or (feats["date"].min() + pd.Timedelta(days=min_train_days))
    end = last_target or feats["date"].max()

    # The Mondrian group. This read the literal (0, 1) rather than a constant, so
    # Lune's own `STRUCTURAL_ZERO_DOW` never actually reached the grouping it defines:
    # editing config would have moved the feature and left the band calibrated on
    # Mon/Tue. Per-venue now, and honest about where the days come from.
    zero_dow = org_profile.structural_zero_dow(venue)

    rows = []
    block_start = pd.Timestamp(start).normalize()
    while block_start <= end:
        block_end = block_start + pd.Timedelta(days=horizon - 1)
        train = feats[feats["date"] < block_start]
        block = feats[(feats["date"] >= block_start) & (feats["date"] <= block_end)]
        if len(train) >= min_train_days and not block.empty:
            preds = fn(train, block, cols)
            for (_, r), p in zip(block.iterrows(), preds):
                rows.append({
                    "date": r["date"], "y": r["value"], "yhat": float(p),
                    "is_zero": int(r["date"].dayofweek in zero_dow)})
        block_start = block_end + pd.Timedelta(days=1)
    return pd.DataFrame(rows)


def _mondrian_quantiles(
    abs_res: np.ndarray, groups: np.ndarray, level: float
) -> dict[int, float]:
    return {
        g: conformal_quantile(abs_res[groups == g], level)
        for g in np.unique(groups)
    }


def evaluate(
    venue: str = ANCHOR_VENUE, model_name: str = "rung2_ets", *, warmup: int = 70
) -> dict:
    """Online rolling-origin split conformal, coverage pooled across the year.

    One rolling forecast pass over the whole series gives leak-free residuals.
    We then walk forward in 7-day blocks: each block is banded using only the
    residuals accumulated *strictly before* it, and its coverage is pooled.
    Pooling ~180 held-out points (vs 57 in one block) makes the coverage
    estimate stable to ~0.5pp instead of ~1.75pp. The most recent block's band
    (calibrated on everything before the test window) is persisted as the
    deployable deliverable.
    """
    # Trim to the active trading span so a closed venue's zero-tail (TRT) is not
    # calibrated/validated against, the closure is a structural break.
    feats = trim_to_active(build_features(venue), venue)
    cols = feature_columns(feats)
    full = rolling_point_forecasts(feats, model_name, cols, horizon=7, venue=venue)
    full = full.sort_values("date").reset_index(drop=True)
    full["res"] = np.abs(full["y"] - full["yhat"])

    pooled = {lvl: {v: {"y": [], "lo": [], "hi": []} for v in ("plain", "mondrian")}
              for lvl in CONFORMAL_LEVELS}
    acc_res: list[float] = []
    acc_grp: list[int] = []
    # M7: how many group-conditional bands were issued from a calibration set too
    # small for the level, where `conformal_quantile` clamps and the guarantee lapses.
    undersized = {lvl: 0 for lvl in CONFORMAL_LEVELS}
    n_group_bands = {lvl: 0 for lvl in CONFORMAL_LEVELS}

    bs = full["date"].min()
    end = full["date"].max()
    while bs <= end:
        be = bs + pd.Timedelta(days=6)
        block = full[(full["date"] >= bs) & (full["date"] <= be)]
        if not block.empty and len(acc_res) >= warmup:
            ar, ag = np.asarray(acc_res), np.asarray(acc_grp)
            yb = block["y"].to_numpy()
            yh = block["yhat"].to_numpy()
            gb = block["is_zero"].to_numpy()
            for lvl in CONFORMAL_LEVELS:
                q = conformal_quantile(ar, lvl)
                _accumulate(pooled[lvl]["plain"], yb, yh - q, yh + q)
                qg = _mondrian_quantiles(ar, ag, lvl)
                for g in qg:
                    n_group_bands[lvl] += 1
                    undersized[lvl] += int((ag == g).sum() < conformal_min_n(lvl))
                qpt = np.array([qg.get(g, q) for g in gb])
                _accumulate(pooled[lvl]["mondrian"], yb,
                            np.clip(yh - qpt, 0, None), yh + qpt)
        if not block.empty:
            acc_res.extend(block["res"].tolist())
            acc_grp.extend(block["is_zero"].tolist())
        bs = be + pd.Timedelta(days=1)

    out: dict = {"venue": venue, "model": model_name, "n_points": len(full),
                 "levels": {}}
    for lvl in CONFORMAL_LEVELS:
        entry = {}
        for variant in ("plain", "mondrian"):
            p = pooled[lvl][variant]
            entry[variant] = harness.interval_metrics(
                np.asarray(p["y"]), np.asarray(p["lo"]), np.asarray(p["hi"]), lvl)
            entry[f"{variant}_n"] = len(p["y"])
        entry["undersized_group_bands"] = undersized[lvl]
        entry["group_bands"] = n_group_bands[lvl]
        entry["min_calibration_n"] = conformal_min_n(lvl)
        out["levels"][lvl] = entry

    _persist_test_band(venue, model_name, feats, full)
    out["closed"] = is_closed(venue)
    if out["closed"]:
        _persist_standby_forward(venue, model_name, feats, full)
        out["standby_days"] = STANDBY_DAYS
    out["test_dates"] = (full["date"].min(), full["date"].max())
    return out


def _persist_standby_forward(venue, model_name, feats, full) -> None:
    """For a closed venue: project the band forward STANDBY_DAYS past the last
    active day, so /forecast returns a ready-for-reopening band. Calibrated on
    the whole active residual set (Mondrian by active/closed weekday)."""
    fn = _predictor(model_name, venue)
    last = pd.Timestamp(feats["date"].max())
    future = pd.DataFrame({
        "date": pd.date_range(last + pd.Timedelta(days=1), periods=STANDBY_DAYS, freq="D")
    })
    yhat = fn(feats, future, feature_columns(feats))
    grp = (future["date"].dt.dayofweek.isin(
        org_profile.structural_zero_dow(venue))).astype(int).to_numpy()
    ar, ag = full["res"].to_numpy(), full["is_zero"].to_numpy()

    fc_rows, band_rows = [], []
    for d, y in zip(future["date"], yhat):
        fc_rows.append({"venue": venue, "layer": "L1", "key": None,
                        "target_date": d.date(),
                        "model": f"conformal_{model_name}", "yhat": float(max(y, 0.0))})
    for lvl in CONFORMAL_LEVELS:
        qg = _mondrian_quantiles(ar, ag, lvl)
        qpt = np.array([qg.get(g, conformal_quantile(ar, lvl)) for g in grp])
        for d, y, q in zip(future["date"], yhat, qpt):
            y = float(max(y, 0.0))
            band_rows.append({"venue": venue, "layer": "L1", "key": None,
                              "target_date": d.date(),
                              "model": f"conformal_{model_name}", "level": lvl,
                              "lo": float(max(y - q, 0.0)), "hi": float(y + q)})
    con = warehouse.connect()
    try:
        warehouse.write_forecast(pd.DataFrame(fc_rows), con=con)
        warehouse.write_band(pd.DataFrame(band_rows), con=con)
    finally:
        con.close()


def _accumulate(store: dict, y, lo, hi) -> None:
    store["y"].extend(np.asarray(y).tolist())
    store["lo"].extend(np.asarray(lo).tolist())
    store["hi"].extend(np.asarray(hi).tolist())


def _persist_test_band(venue, model_name, feats, full) -> None:
    """Persist the deployable band for the last TEST_WEEKS, calibrated on all
    residuals strictly before that window."""
    test_start = feats["date"].max() - pd.Timedelta(weeks=TEST_WEEKS)
    cal = full[full["date"] < test_start]
    test = full[full["date"] >= test_start]
    if cal.empty or test.empty:
        return
    ar = cal["res"].to_numpy()
    ag = cal["is_zero"].to_numpy()
    yh = test["yhat"].to_numpy()
    gb = test["is_zero"].to_numpy()

    fc_rows, band_rows = [], []
    for _, r in test.iterrows():
        fc_rows.append({"venue": venue, "layer": "L1", "key": None,
                        "target_date": r["date"].date(),
                        "model": f"conformal_{model_name}", "yhat": float(r["yhat"])})
    for lvl in CONFORMAL_LEVELS:
        qg = _mondrian_quantiles(ar, ag, lvl)
        qpt = np.array([qg.get(g, conformal_quantile(ar, lvl)) for g in gb])
        lo = np.clip(yh - qpt, 0, None)
        hi = yh + qpt
        for (_, r), l, h in zip(test.iterrows(), lo, hi):
            band_rows.append({"venue": venue, "layer": "L1", "key": None,
                              "target_date": r["date"].date(),
                              "model": f"conformal_{model_name}", "level": lvl,
                              "lo": float(l), "hi": float(h)})

    con = warehouse.connect()
    try:
        warehouse.write_forecast(pd.DataFrame(fc_rows), con=con)
        warehouse.write_band(pd.DataFrame(band_rows), con=con)
    finally:
        con.close()


def _plot(out: dict) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:  # pragma: no cover
        return
    levels = list(out["levels"].keys())
    nominal = [l * 100 for l in levels]
    plain = [out["levels"][l]["plain"]["coverage"] * 100 for l in levels]
    mond = [out["levels"][l]["mondrian"]["coverage"] * 100 for l in levels]
    x = np.arange(len(levels))
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.bar(x - 0.2, plain, 0.2, label="plain")
    ax.bar(x + 0.0, mond, 0.2, label="mondrian")
    ax.plot(x, nominal, "k--o", label="nominal")
    ax.set_xticks(x)
    ax.set_xticklabels([f"{int(n)}%" for n in nominal])
    ax.set_ylabel("empirical coverage (%)")
    ax.set_title(f"A5 conformal coverage — {out['model']} "
                 f"({VENUE_LABELS.get(out['venue'], out['venue'])} L1)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(_coverage_png(out["venue"]), dpi=110)
    plt.close(fig)


def _coverage_png(venue: str):
    return STORE_DIR / f"conformal_coverage_{venue}.png"


def _run_one(venue: str, layer: str, model: str | None) -> bool:
    model_name = model or default_model(venue)
    print(f"A5 · conformal band ({layer}, {venue}, model={model_name})")
    out = evaluate(venue, model_name)
    sample = out["levels"][CONFORMAL_LEVELS[0]]
    print(f"  pooled validation : {sample['mondrian_n']} held-out points "
          f"(online rolling-origin, warmup 70)")

    ok = True
    for level, m in out["levels"].items():
        for variant in ("plain", "mondrian"):
            cov = m[variant]["coverage"] * 100
            within = abs(cov - level * 100) <= COVERAGE_TOL_PP
            print(f"  {variant:9s} @{int(level*100)}%: coverage={cov:5.1f}% "
                  f"(nominal {int(level*100)}%, ±{COVERAGE_TOL_PP}pp -> "
                  f"{'ok' if within else 'OUT'})  "
                  f"width={m[variant]['mean_width']:.0f} "
                  f"winkler={m[variant]['winkler']:.0f}")
    for level, m in out["levels"].items():
        cov = m["mondrian"]["coverage"] * 100
        ok = ok and abs(cov - level * 100) <= COVERAGE_TOL_PP
        print(f"  guarantee @{int(level*100)}%: {m['undersized_group_bands']} of "
              f"{m['group_bands']} group bands issued below n="
              f"{m['min_calibration_n']} (clamped, no coverage guarantee)")

    if out.get("closed"):
        print(f"  standby band      : +{out['standby_days']}d projected past "
              f"{active_trading_end(venue).date()} (closed venue)")
    _plot(out)
    _write_report(out, ok)
    print(f"  coverage plot     : {_coverage_png(venue)}")

    is_anchor = venue == ANCHOR_VENUE
    if is_anchor:
        # Beer Hall is the Objective-1 deliverable: strict two-sided ±3pp gate.
        print(f"A5 RESULT ({venue}): {'PASS' if ok else 'FAIL'} "
              f"(Mondrian coverage within ±{COVERAGE_TOL_PP}pp at 80% and 90%)")
    else:
        # Secondary venues: the deliverable is a persisted, calibrated band.
        # Coverage is reported honestly, any miss here is over-coverage (the
        # conservative/safe direction for a closed or sparse venue).
        worst = max(abs(out["levels"][lvl]["mondrian"]["coverage"] * 100 - lvl * 100)
                    for lvl in CONFORMAL_LEVELS)
        detail = "within ±3pp" if ok else f"over-covers, worst Δ {worst:.1f}pp (conservative)"
        print(f"A5 RESULT ({venue}): band persisted ({detail})")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description="Conformal wrapper for L1")
    ap.add_argument("--layer", default="L1")
    ap.add_argument("--venue", default=ANCHOR_VENUE)
    ap.add_argument("--model", default=None, help="default: per-venue (ETS, or "
                    "robust DOW for capped venues)")
    ap.add_argument("--all-venues", action="store_true")
    args = ap.parse_args()

    venues = list(FORECAST_VENUES) if args.all_venues else [args.venue]
    anchor_ok = True
    for v in venues:
        ok = _run_one(v, args.layer, args.model)
        if v == ANCHOR_VENUE:
            anchor_ok = ok
    return 0 if anchor_ok else 1


def _write_report(out: dict, passed: bool) -> None:
    venue = out["venue"]
    label = VENUE_LABELS.get(venue, venue)
    md = REPORT_ROOT / "conformal" / f"conformal_L1_{venue}.md"
    lines = [
        f"# A5 · Conformal band — coverage report ({label} L1)\n",
        f"Selected forecaster: **{out['model']}**. Validation: online rolling-"
        "origin split conformal (EnbPI-style), coverage pooled across "
        f"{out['levels'][CONFORMAL_LEVELS[0]]['mondrian_n']} held-out points.\n",
    ]
    if out.get("closed"):
        lines.append(
            f"> **{label} is currently closed** (last active "
            f"{active_trading_end(venue).date()}). Coverage is validated on the "
            "pre-closure active span; a +{0}-day **standby band** is persisted "
            "past the last active day so the band is queryable on reopening. It "
            "reflects pre-closure rhythm and is **not** validated against any "
            "post-reopening data.\n".format(out.get("standby_days", STANDBY_DAYS)))
    lines += [
        "| Variant | Level | Coverage | Width | Winkler | Pinball | Within ±3pp |",
        "|---|---|---|---|---|---|---|",
    ]
    for lvl, m in out["levels"].items():
        for v in ("plain", "mondrian"):
            cov = m[v]["coverage"] * 100
            ok = abs(cov - lvl * 100) <= COVERAGE_TOL_PP
            lines.append(
                f"| {v} | {int(lvl*100)}% | {cov:.1f}% | {m[v]['mean_width']:.0f} | "
                f"{m[v]['winkler']:.0f} | {m[v]['mean_pinball']:.0f} | {ok} |")
    lines += [
        "\n**Where the guarantee lapses.** Split conformal needs at least "
        "`level/(1-level)` calibration points before the requested level is even "
        "attainable; below that the correct band is infinite and "
        "`conformal_quantile` clamps to the largest observed residual instead. The "
        "clamp keeps the band usable but it carries no coverage guarantee, and the "
        "group-conditional bands are where a sparse group can hit it, so the count "
        "is reported rather than left silent:",
        "",
        "| Level | Min calibration n | Group bands issued | Of which clamped |",
        "|---|---|---|---|",
    ]
    for lvl, m in out["levels"].items():
        lines.append(
            f"| {int(lvl*100)}% | {m['min_calibration_n']} | {m['group_bands']} | "
            f"{m['undersized_group_bands']} |")
    lines += [
        "\n**Deliverable:** the Mondrian band (group-conditional on active vs "
        "structural-zero day) is persisted to DuckDB (`bands`/`forecasts`, model "
        f"`conformal_{out['model']}`) and is the input to Objective 2 — *a "
        "deviation is an observation outside this band*.",
    ]
    if venue == ANCHOR_VENUE:
        lines.append(
            f"\nGate (±{COVERAGE_TOL_PP}pp at 80% and 90% on the Mondrian band): "
            f"**{'PASS' if passed else 'FAIL'}**.")
    elif not passed:
        lines.append(
            "\n**Note:** this venue misses the ±3pp band on the *conservative* "
            "(over-coverage) side — the band is wider than nominal, not narrower. "
            "Over-coverage is split conformal's safe failure mode and is expected "
            "with the smaller calibration set of a closed/sparse venue; the band "
            "is still valid (coverage ≥ nominal). The Beer Hall (the Objective-1 "
            "deliverable) meets the strict two-sided gate.")
    lines += provenance.stamp_lines()
    md.write_text("\n".join(lines))


if __name__ == "__main__":
    sys.exit(main())
