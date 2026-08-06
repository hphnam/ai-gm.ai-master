"""R9 - the functional minimal pair: does the forecast functional drive the bias?

Pre-registered at decision-log row 77, commit `c098fba`, BEFORE `rung1_mean_dow` existed.
Read that row for the design, the five written predictions and the abort conditions.

The question. Two defects were mutually concealing. MASE elicits the median
(Hewamalage et al. 2023). The decision layer needs a mean: deviation z-scores, band
construction and any revenue summed across days or venues are mean-shaped quantities, and
expectations add where medians do not (Kolassa 2023, "the expectation is additive"). A
median-optimal ruler scoring a median-emitting estimator cannot see the mismatch.

The design. `rung1_robust_dow` and `rung1_mean_dow` share one code path (`_dow_profile`)
and differ ONLY in the central-tendency aggregator. Same features, same folds, same fit
span, same monthly index and bank-holiday structure. That is a controlled manipulation of
the functional with nothing else varying, and it is the only such manipulation available in
this ladder. Contrasting the median rung against ETS or the GBM instead -- both of which
already emit conditional means -- would confound the functional with model family,
capacity, feature access and fit procedure; that contrast is retained in `ladder_arms` as a
GENERALISATION CHECK, explicitly not as the load-bearing evidence.

The metric axis is venue-dependent, per G2: {MASE, RMSSE} where a scaled error is defined,
{MAE, RMSE} at Ellel where `config.VENUE_SCALE_BASIS` rules `unscaled`.

Reported, never served. `rung1_mean_dow` does not enter served-model selection.
"""

from __future__ import annotations

import json
import sys
import time

import numpy as np
from scipy import stats

import config
from eval import harness
from features.build_features import build_features, feature_columns
from models import ladder

REPORT_MD = config.REPORT_ROOT / "eval" / "functional_pair.md"
METRICS_JSON = config.REPORT_ROOT / "eval" / "functional_pair.json"

HORIZON = 7
MIN_TRAIN = 120
STEP = 1                       # the established one-day step (273/260/205 origins)

# The minimal pair. Order matters only for reporting.
PAIR = {"median": ladder.rung1_robust_dow, "mean": ladder.rung1_mean_dow}

# The generalisation check: rungs that already differ in functional for other reasons.
LADDER_ARMS = {
    "rung2_ets": "mean",          # statsmodels ExponentialSmoothing.forecast()
    "rung3_gbm": "mean",          # HistGradientBoostingRegressor, default squared_error
}


def _folds(venue: str):
    feats = build_features(venue)
    return feats, list(harness.rolling_origin(
        feats, n_folds=None, horizon_days=HORIZON,
        min_train_days=MIN_TRAIN, step_days=STEP))


def _score_arm(fn, folds, venue: str, cols) -> dict:
    """Per-fold losses and the pooled signed residual for one forecaster."""
    basis = config.VENUE_SCALE_BASIS.get(venue, "calendar_lag7_active")
    scaled = config.is_scaled_venue(venue)
    per_fold, signed = [], []
    for tr, te in folds:
        ytr, yte = tr["value"].to_numpy(float), te["value"].to_numpy(float)
        try:
            yhat = np.asarray(fn(tr, te, cols), float)
        except TypeError:
            yhat = np.asarray(fn(tr, te), float)
        signed.append(yte - yhat)                      # actual - forecast
        if scaled:
            per_fold.append((harness.mase(yte, yhat, ytr, basis=basis),
                             harness.rmsse(yte, yhat, ytr, basis=basis)))
        else:
            per_fold.append((harness.mae(yte, yhat), harness.rmse(yte, yhat)))
    per_fold = np.asarray(per_fold, float)
    e = np.concatenate(signed)
    e = e[np.isfinite(e)]
    n = int(e.size)
    mean_resid = float(e.mean())
    sd = float(e.std(ddof=1))
    se = sd / np.sqrt(n) if sd > 0 else 0.0
    t = mean_resid / se if se > 0 else float("nan")
    p = float(2 * stats.t.sf(abs(t), df=n - 1)) if se > 0 else float("nan")
    half = float(stats.t.ppf(0.975, df=n - 1) * se) if se > 0 else 0.0
    keep = np.isfinite(per_fold).all(axis=1)
    return {
        "n_folds": int(keep.sum()),
        "n_points": n,
        "absolute_metric": float(np.mean(per_fold[keep, 0])),
        "squared_metric": float(np.mean(per_fold[keep, 1])),
        "per_fold_absolute": per_fold[keep, 0].tolist(),
        "per_fold_squared": per_fold[keep, 1].tolist(),
        "mean_signed_residual": mean_resid,
        "bias_ci_lo": mean_resid - half, "bias_ci_hi": mean_resid + half,
        "bias_p": p,
        "biased": bool(np.isfinite(p) and p < 0.05),
    }


def run_venue(venue: str) -> dict:
    feats, folds = _folds(venue)
    cols = feature_columns(feats)
    scaled = config.is_scaled_venue(venue)
    names = ("MASE", "RMSSE") if scaled else ("MAE", "RMSE")

    pair = {k: _score_arm(fn, folds, venue, cols) for k, fn in PAIR.items()}
    arms = {}
    for name, functional in LADDER_ARMS.items():
        fn = getattr(ladder, name, None)
        if fn is None:
            continue
        try:
            arms[name] = {"functional": functional,
                          **_score_arm(fn, folds, venue, cols)}
        except Exception as exc:                       # a rung may be unavailable
            arms[name] = {"functional": functional, "error": str(exc)}

    med, mn = pair["median"], pair["mean"]
    # Paired per-fold differences (mean arm minus median arm), the comparison the design buys.
    d_abs = np.asarray(mn["per_fold_absolute"]) - np.asarray(med["per_fold_absolute"])
    d_sq = np.asarray(mn["per_fold_squared"]) - np.asarray(med["per_fold_squared"])
    def _paired(d):
        n = d.size
        se = d.std(ddof=1) / np.sqrt(n) if n > 1 and d.std(ddof=1) > 0 else 0.0
        p = float(2 * stats.t.sf(abs(d.mean() / se), df=n - 1)) if se > 0 else float("nan")
        half = float(stats.t.ppf(0.975, df=n - 1) * se) if se > 0 else 0.0
        return {"mean_delta": float(d.mean()), "ci_lo": float(d.mean() - half),
                "ci_hi": float(d.mean() + half), "p": p,
                "mean_arm_better": bool(d.mean() < 0)}

    return {
        "venue": venue, "scaled": scaled, "metric_names": names,
        "basis": config.VENUE_SCALE_BASIS.get(venue, "calendar_lag7_active"),
        "n_folds": med["n_folds"], "pair": pair, "ladder_arms": arms,
        "paired_absolute": _paired(d_abs), "paired_squared": _paired(d_sq),
        # Prediction (iv): each functional wins under the metric that elicits it.
        "crossing_observed": bool(d_abs.mean() > 0 and d_sq.mean() < 0),
        "bias_gap": abs(med["mean_signed_residual"]) - abs(mn["mean_signed_residual"]),
    }


def build() -> dict:
    t0 = time.time()
    out = {"horizon": HORIZON, "min_train_days": MIN_TRAIN, "step_days": STEP,
           "prereg": "decision-log row 77, commit c098fba",
           "venues": {v: run_venue(v) for v in config.FORECAST_VENUES}}
    out["wall_clock_s"] = round(time.time() - t0, 1)
    out["crossing_venues"] = [v for v, r in out["venues"].items() if r["crossing_observed"]]
    _write_report(out)
    METRICS_JSON.write_text(json.dumps(out, indent=2, sort_keys=True, default=str) + "\n")
    return out


def _write_report(out: dict) -> None:
    L = [
        "# R9 - the functional minimal pair",
        "",
        f"Pre-registered at {out['prereg']}, before `rung1_mean_dow` existed. Rolling origin, "
        f"horizon {out['horizon']}, min train {out['min_train_days']}, step "
        f"{out['step_days']}. Wall clock {out['wall_clock_s']}s.",
        "",
        "`rung1_robust_dow` and `rung1_mean_dow` share one code path and differ only in the "
        "central-tendency aggregator, so a difference between them is attributable to the "
        "forecast functional alone. The ladder arms below are a generalisation check, not the "
        "load-bearing evidence: they confound the functional with family, capacity, feature "
        "access and fit procedure.",
        "",
    ]
    for v, r in out["venues"].items():
        a, s = r["metric_names"]
        med, mn = r["pair"]["median"], r["pair"]["mean"]
        L += [
            f"## {v}",
            "",
            f"- metric axis **{a} / {s}**"
            + (f", basis `{r['basis']}`" if r["scaled"] else " (G2: unscaled venue)"),
            f"- folds: {r['n_folds']}, points: {med['n_points']}",
            "",
            "### Bias (mean signed residual, actual - forecast)",
            "",
            "| arm | mean signed resid | 95% CI | p | biased |",
            "|---|---|---|---|---|",
            f"| `rung1_robust_dow` (median) | {med['mean_signed_residual']:+.3f} | "
            f"[{med['bias_ci_lo']:+.3f}, {med['bias_ci_hi']:+.3f}] | {med['bias_p']:.3e} | "
            f"{med['biased']} |",
            f"| `rung1_mean_dow` (mean) | {mn['mean_signed_residual']:+.3f} | "
            f"[{mn['bias_ci_lo']:+.3f}, {mn['bias_ci_hi']:+.3f}] | {mn['bias_p']:.3e} | "
            f"{mn['biased']} |",
            "",
            f"Bias magnitude closer to zero for the mean arm by "
            f"**{r['bias_gap']:+.3f}** "
            + ("(mean arm less biased -- prediction (i) HOLDS here)."
               if r["bias_gap"] > 0 else
               "(NEGATIVE: the mean arm is MORE biased -- prediction (i) FAILS here)."),
            "",
            "### The 2x2",
            "",
            f"| arm | {a} | {s} |",
            "|---|---|---|",
            f"| `rung1_robust_dow` (median) | {med['absolute_metric']:.4f} | "
            f"{med['squared_metric']:.4f} |",
            f"| `rung1_mean_dow` (mean) | {mn['absolute_metric']:.4f} | "
            f"{mn['squared_metric']:.4f} |",
            "",
            f"Paired per-fold difference (mean arm - median arm): "
            f"**{a} {r['paired_absolute']['mean_delta']:+.4f}** "
            f"[{r['paired_absolute']['ci_lo']:+.4f}, {r['paired_absolute']['ci_hi']:+.4f}], "
            f"p {r['paired_absolute']['p']:.3e}; "
            f"**{s} {r['paired_squared']['mean_delta']:+.4f}** "
            f"[{r['paired_squared']['ci_lo']:+.4f}, {r['paired_squared']['ci_hi']:+.4f}], "
            f"p {r['paired_squared']['p']:.3e}.",
            "",
            f"**Crossing observed (median wins on {a}, mean wins on {s}): "
            f"{r['crossing_observed']}**"
            + (("  However BOTH legs are non-significant "
                f"(p {r['paired_absolute']['p']:.3f} and "
                f"{r['paired_squared']['p']:.3f}), so this is a consistent DIRECTION, "
                "not a demonstrated effect.")
               if (r["crossing_observed"]
                   and r["paired_absolute"]["p"] > 0.05
                   and r["paired_squared"]["p"] > 0.05) else ""),
            "",
        ]
        if r["ladder_arms"]:
            L += ["### Generalisation check (confounded; not load-bearing)", "",
                  f"| rung | functional | {a} | {s} | mean signed resid | p |",
                  "|---|---|---|---|---|---|"]
            for name, d in r["ladder_arms"].items():
                if "error" in d:
                    L.append(f"| `{name}` | {d['functional']} | - | - | unavailable | - |")
                else:
                    L.append(
                        f"| `{name}` | {d['functional']} | {d['absolute_metric']:.4f} | "
                        f"{d['squared_metric']:.4f} | {d['mean_signed_residual']:+.3f} | "
                        f"{d['bias_p']:.3e} |")
            L.append("")
    L += ["## Crossing summary", "",
          f"Venues showing the predicted crossing: **{out['crossing_venues'] or 'none'}**", ""]
    REPORT_MD.write_text("\n".join(L))


def main() -> int:
    out = build()
    print("R9 - functional minimal pair")
    for v, r in out["venues"].items():
        a, s = r["metric_names"]
        med, mn = r["pair"]["median"], r["pair"]["mean"]
        print(f"  {v} ({r['n_folds']} folds, {a}/{s})")
        print(f"    bias  median {med['mean_signed_residual']:+8.2f} (p {med['bias_p']:.2e}) | "
              f"mean {mn['mean_signed_residual']:+8.2f} (p {mn['bias_p']:.2e})")
        print(f"    {a:<5} median {med['absolute_metric']:.4f} | mean {mn['absolute_metric']:.4f}"
              f"   {s:<5} median {med['squared_metric']:.4f} | mean {mn['squared_metric']:.4f}")
        print(f"    crossing: {r['crossing_observed']}")
    print(f"  report: {REPORT_MD}")
    print(f"R9 RESULT: crossing at {out['crossing_venues'] or 'no venue'}; "
          f"{out['wall_clock_s']}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
