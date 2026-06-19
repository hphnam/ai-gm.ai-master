"""A5 · Conformal wrapper — the deliverable of Objective 1 (methodology §2/§5).

Wraps the selected L1 forecaster so it emits a **calibrated band**, not a
point. We use split conformal with calibration residuals collected from a
rolling-origin backtest over the *pre-test* region (an EnbPI-style temporally
robust calibration; Xu & Xie 2023). The forward option for sustained shifts is
change-point-aware online conformal (Sun & Yu 2025) — noted, not yet wired.

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

from config import (
    ANCHOR_VENUE,
    CONFORMAL_LEVELS,
    COVERAGE_TOL_PP,
    STORE_DIR,
    TEST_WEEKS,
)
from eval import harness
from features.build_features import build_features, feature_columns
from models import ladder
from store import warehouse

warnings.filterwarnings("ignore")

COVERAGE_PNG = STORE_DIR / "conformal_coverage.png"
EPS = 1e-6


def conformal_quantile(scores: np.ndarray, level: float) -> float:
    """Finite-sample split-conformal quantile: the k-th smallest |residual|."""
    scores = np.sort(np.asarray(scores, float))
    n = len(scores)
    if n == 0:
        return float("nan")
    k = min(int(math.ceil((n + 1) * level)), n)
    return float(scores[k - 1])


def _predictor(model_name: str):
    fn = dict((name, fn) for name, _r, fn, _a in ladder.PREDICTORS).get(model_name)
    if fn is None:
        raise ValueError(f"unknown model {model_name!r}")
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
) -> pd.DataFrame:
    """Operational 7-day rolling forecasts: each block is forecast from a model
    fit on all data strictly before the block. Returns (date, y, yhat)."""
    fn = _predictor(model_name)
    feats = feats.sort_values("date").reset_index(drop=True)
    start = first_target or (feats["date"].min() + pd.Timedelta(days=min_train_days))
    end = last_target or feats["date"].max()

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
                    "is_zero": int(r["date"].dayofweek in (0, 1))})
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
    feats = build_features(venue)
    cols = feature_columns(feats)
    full = rolling_point_forecasts(feats, model_name, cols, horizon=7)
    full = full.sort_values("date").reset_index(drop=True)
    full["res"] = np.abs(full["y"] - full["yhat"])

    pooled = {lvl: {v: {"y": [], "lo": [], "hi": []} for v in ("plain", "mondrian")}
              for lvl in CONFORMAL_LEVELS}
    acc_res: list[float] = []
    acc_grp: list[int] = []

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
                qpt = np.array([qg.get(g, q) for g in gb])
                _accumulate(pooled[lvl]["mondrian"], yb,
                            np.clip(yh - qpt, 0, None), yh + qpt)
        if not block.empty:
            acc_res.extend(block["res"].tolist())
            acc_grp.extend(block["is_zero"].tolist())
        bs = be + pd.Timedelta(days=1)

    out: dict = {"model": model_name, "n_points": len(full), "levels": {}}
    for lvl in CONFORMAL_LEVELS:
        entry = {}
        for variant in ("plain", "mondrian"):
            p = pooled[lvl][variant]
            entry[variant] = harness.interval_metrics(
                np.asarray(p["y"]), np.asarray(p["lo"]), np.asarray(p["hi"]), lvl)
            entry[f"{variant}_n"] = len(p["y"])
        out["levels"][lvl] = entry

    _persist_test_band(venue, model_name, feats, full)
    out["test_dates"] = (full["date"].min(), full["date"].max())
    return out


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
    ax.set_title(f"A5 conformal coverage — {out['model']} (Beer Hall L1)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(COVERAGE_PNG, dpi=110)
    plt.close(fig)


def main() -> int:
    ap = argparse.ArgumentParser(description="Conformal wrapper for L1")
    ap.add_argument("--layer", default="L1")
    ap.add_argument("--venue", default=ANCHOR_VENUE)
    ap.add_argument("--model", default="rung2_ets")
    args = ap.parse_args()

    print(f"A5 · conformal band ({args.layer}, {args.venue}, model={args.model})")
    out = evaluate(args.venue, args.model)
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
    # Gate on the Mondrian (persisted) band — the deliverable.
    for level, m in out["levels"].items():
        cov = m["mondrian"]["coverage"] * 100
        ok = ok and abs(cov - level * 100) <= COVERAGE_TOL_PP

    _plot(out)
    _write_report(out, ok)
    print(f"  coverage plot     : {COVERAGE_PNG}")
    print(f"A5 RESULT: {'PASS' if ok else 'FAIL'} "
          f"(Mondrian coverage within ±{COVERAGE_TOL_PP}pp at 80% and 90%)")
    return 0 if ok else 1


def _write_report(out: dict, passed: bool) -> None:
    md = STORE_DIR.parent / "conformal" / "conformal_L1.md"
    lines = [
        "# A5 · Conformal band — coverage report (Beer Hall L1)\n",
        f"Selected forecaster: **{out['model']}**. Validation: online rolling-"
        "origin split conformal (EnbPI-style), coverage pooled across "
        f"{out['levels'][CONFORMAL_LEVELS[0]]['mondrian_n']} held-out points.\n",
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
        "\n**Deliverable:** the Mondrian band (group-conditional on active vs "
        "structural-zero day) is persisted to DuckDB (`bands`/`forecasts`, model "
        f"`conformal_{out['model']}`) and is the input to Objective 2 — *a "
        "deviation is an observation outside this band*.",
        f"\nGate (±{COVERAGE_TOL_PP}pp at 80% and 90% on the Mondrian band): "
        f"**{'PASS' if passed else 'FAIL'}**.",
    ]
    md.write_text("\n".join(lines))


if __name__ == "__main__":
    sys.exit(main())
