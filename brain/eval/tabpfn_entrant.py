"""R5 - TabPFN-TS as a ladder entrant, and as a second functional minimal pair.

Pre-registered at decision-log row 83, commit `473de1df`, BEFORE this file existed.
Read that row for the design, the five written predictions and the abort conditions.

Why this run exists. `sec:rw-rhythm` argues that 3 venues / 1 year / few regressors sits
inside the regime where Chronos-2 AND TabPFN-TS are the licensed choices. One was tested.
A named-but-untested alternative is the easiest question an examiner asks.

Why it is not merely "another rung". TabPFN-TS computes "the mean for squared-error
evaluations, the median for absolute-error evaluations" from a binned posterior predictive
(Hoo et al.), so it exposes a GENUINE predictive mean. The served foundation model does not:
`chronos-forecasting` 2.3.1, `chronos/chronos2/pipeline.py` L817, "the median is returned as
the mean here". So this is the R9 minimal pair repeated on a foundation model, with the
functional switched at `tabpfn_output_selection` and nothing else varying.

Reported, never served. This module does not touch `models/ladder.py` and does not enter
served-model selection.

Run:
    .venv-tabpfn/bin/python -m eval.tabpfn_entrant
"""

from __future__ import annotations

import json
import sys
import time

import numpy as np
import pandas as pd
from scipy import stats

import config
from eval import harness, mcs
from features.build_features import build_features, feature_columns
from models import ladder

REPORT_MD = config.REPORT_ROOT / "eval" / "tabpfn_entrant.md"
METRICS_JSON = config.REPORT_ROOT / "eval" / "tabpfn_entrant.json"

HORIZON = 7
MIN_TRAIN = 120
STEP = 7                       # pre-registered: the R2 protocol, ~39 folds/venue
SEED = 93
PAIRED_BOOTSTRAP_SEED = 94
BOOTSTRAP_B = 1000

# TabPFN's validated envelope (Hollmann et al. 2025): "up to 10,000 samples and 500
# features". Prediction (i) checks the estate sits inside it.
TABPFN_MAX_SAMPLES = 10_000
TABPFN_MAX_FEATURES = 500

# The incumbents, re-scored on the SAME folds so the comparison is not borrowed from R9.
INCUMBENTS = {
    "rung0_seasonal_naive": ladder.rung0_seasonal_naive,
    "rung1_robust_dow": ladder.rung1_robust_dow,
    "rung1_mean_dow": ladder.rung1_mean_dow,
    "rung2_ets": ladder.rung2_ets,
    "rung3_gbm": ladder.rung3_gbm,
}


def _build_pipeline(output_selection: str):
    """A TabPFN-TS pipeline pinned to LOCAL inference.

    `TabPFNTSPipeline` already defaults to LOCAL, but the older
    `TabPFNTimeSeriesPredictor.__new__` defaults to `TabPFNMode.CLIENT`, which posts the
    series to a third-party API. This estate's revenue must not leave the machine, so the
    mode is passed explicitly rather than relied upon.
    """
    from tabpfn_time_series import TabPFNMode, TabPFNTSPipeline

    return TabPFNTSPipeline(
        tabpfn_mode=TabPFNMode.LOCAL,
        tabpfn_output_selection=output_selection,
    )


def _tabpfn_predict(pipeline, train: pd.DataFrame, target: pd.DataFrame) -> np.ndarray:
    context = pd.DataFrame({
        "timestamp": pd.to_datetime(train["date"]).to_numpy(),
        "target": train["value"].to_numpy(float),
    })
    future = pd.DataFrame({"timestamp": pd.to_datetime(target["date"]).to_numpy()})
    out = pipeline.predict_df(context, future_df=future)
    col = "target" if "target" in out.columns else out.columns[0]
    return np.asarray(out[col].to_numpy(), dtype=float)


def _fold_losses(y_true, yhat, y_train, venue: str) -> tuple[float, float]:
    basis = config.VENUE_SCALE_BASIS.get(venue, "calendar_lag7_active")
    if config.is_scaled_venue(venue):
        return (harness.mase(y_true, yhat, y_train, basis=basis),
                harness.rmsse(y_true, yhat, y_train, basis=basis))
    return harness.mae(y_true, yhat), harness.rmse(y_true, yhat)


def _summarise_arm(per_fold: list, signed: list) -> dict:
    arr = np.asarray(per_fold, float)
    keep = np.isfinite(arr).all(axis=1)
    e = np.concatenate(signed)
    e = e[np.isfinite(e)]
    n = int(e.size)
    mean_resid = float(e.mean())
    sd = float(e.std(ddof=1)) if n > 1 else 0.0
    se = sd / np.sqrt(n) if sd > 0 else 0.0
    p = float(2 * stats.t.sf(abs(mean_resid / se), df=n - 1)) if se > 0 else float("nan")
    half = float(stats.t.ppf(0.975, df=n - 1) * se) if se > 0 else 0.0
    return {
        "n_folds": int(keep.sum()),
        "absolute_metric": float(np.mean(arr[keep, 0])),
        "squared_metric": float(np.mean(arr[keep, 1])),
        "per_fold_absolute": arr[keep, 0].tolist(),
        "per_fold_squared": arr[keep, 1].tolist(),
        "mean_signed_residual": mean_resid,
        "bias_ci_lo": mean_resid - half,
        "bias_ci_hi": mean_resid + half,
        "bias_p": p,
        "biased": bool(np.isfinite(p) and p < 0.05),
    }


def _paired_bootstrap(a: np.ndarray, b: np.ndarray) -> dict:
    """Moving-block paired bootstrap on per-fold differences (b - a). Lifted from
    `eval/weather_basis.py` so every dispersion statement in the project shares one
    implementation."""
    d = np.asarray(b, float) - np.asarray(a, float)
    d = d[np.isfinite(d)]
    n = d.size
    if n == 0:
        return {"mean": float("nan"), "ci_lo": float("nan"), "ci_hi": float("nan"),
                "p": float("nan"), "n": 0}
    rng = np.random.default_rng(PAIRED_BOOTSTRAP_SEED)
    block = min(mcs.BLOCK_LEN, n)
    n_blocks = int(np.ceil(n / block))
    boot = np.empty(BOOTSTRAP_B, float)
    for i in range(BOOTSTRAP_B):
        starts = rng.integers(0, n - block + 1, n_blocks)
        idx = np.concatenate([np.arange(s, s + block) for s in starts])[:n]
        boot[i] = d[idx].mean()
    return {
        "mean": float(d.mean()),
        "ci_lo": float(np.percentile(boot, 2.5)),
        "ci_hi": float(np.percentile(boot, 97.5)),
        "p": float(2 * min((boot <= 0).mean(), (boot >= 0).mean())),
        "n": int(n),
    }


def run_venue(venue: str, pipelines: dict) -> dict:
    feats = build_features(venue)
    cols = feature_columns(feats)
    folds = list(harness.rolling_origin(feats, n_folds=None, horizon_days=HORIZON,
                                        min_train_days=MIN_TRAIN, step_days=STEP))
    arms: dict[str, dict] = {}

    max_train_rows = max(len(tr) for tr, _ in folds)
    envelope = {
        "max_train_rows": int(max_train_rows),
        "n_features_tabpfn_ts": None,      # filled from the first prediction
        "inside_sample_limit": bool(max_train_rows <= TABPFN_MAX_SAMPLES),
    }

    for name, fn in INCUMBENTS.items():
        per_fold, signed = [], []
        for tr, te in folds:
            ytr, yte = tr["value"].to_numpy(float), te["value"].to_numpy(float)
            try:
                yhat = np.asarray(fn(tr, te, cols), float)
            except TypeError:
                yhat = np.asarray(fn(tr, te), float)
            signed.append(yte - yhat)
            per_fold.append(_fold_losses(yte, yhat, ytr, venue))
        arms[name] = _summarise_arm(per_fold, signed)

    for label, pipeline in pipelines.items():
        per_fold, signed = [], []
        for tr, te in folds:
            ytr, yte = tr["value"].to_numpy(float), te["value"].to_numpy(float)
            yhat = _tabpfn_predict(pipeline, tr, te)
            signed.append(yte - yhat)
            per_fold.append(_fold_losses(yte, yhat, ytr, venue))
        arms[f"tabpfn_ts_{label}"] = _summarise_arm(per_fold, signed)

    # MCS on the venue's primary (absolute) loss, over every arm on identical folds.
    names = list(arms)
    loss_matrix = np.column_stack([arms[n]["per_fold_absolute"] for n in names])
    summary = mcs.model_confidence_set(loss_matrix, names, seed=SEED)
    retained = summary["sets"].get("0.1", [])

    best_incumbent = min(INCUMBENTS, key=lambda n: arms[n]["absolute_metric"])
    pairs = {}
    for label in pipelines:
        arm = f"tabpfn_ts_{label}"
        pairs[f"{arm}_vs_{best_incumbent}"] = _paired_bootstrap(
            np.asarray(arms[best_incumbent]["per_fold_absolute"]),
            np.asarray(arms[arm]["per_fold_absolute"]))
    if "mean" in pipelines and "median" in pipelines:
        pairs["tabpfn_mean_vs_median_absolute"] = _paired_bootstrap(
            np.asarray(arms["tabpfn_ts_median"]["per_fold_absolute"]),
            np.asarray(arms["tabpfn_ts_mean"]["per_fold_absolute"]))
        pairs["tabpfn_mean_vs_median_squared"] = _paired_bootstrap(
            np.asarray(arms["tabpfn_ts_median"]["per_fold_squared"]),
            np.asarray(arms["tabpfn_ts_mean"]["per_fold_squared"]))

    return {
        "venue": venue,
        "n_folds": len(folds),
        "scaled": bool(config.is_scaled_venue(venue)),
        "basis": config.VENUE_SCALE_BASIS.get(venue, "calendar_lag7_active"),
        "envelope": envelope,
        "arms": arms,
        "mcs_retained": retained,
        "best_incumbent": best_incumbent,
        "paired": pairs,
    }


def _fmt(x, nd=4):
    return "n/a" if x is None or not np.isfinite(x) else f"{x:.{nd}f}"


def _write_report(out: dict) -> None:
    L = ["# R5 · TabPFN-TS as a ladder entrant\n",
         "Pre-registered at decision-log row 83, commit `473de1df`, before this evaluator "
         "existed. Reported, never served.\n",
         f"- Wall clock **{out['wall_clock_s']:.1f} s**",
         f"- Folds: horizon {HORIZON}, min train {MIN_TRAIN}, step {STEP}",
         f"- Inference: **local** (`TabPFNMode.LOCAL`) — no data leaves the machine",
         f"- `tabpfn_time_series` {out['versions']['tabpfn_time_series']}, "
         f"`tabpfn` {out['versions']['tabpfn']}\n"]

    for v in out["venues"]:
        scaled = v["scaled"]
        a_lbl, s_lbl = ("MASE", "RMSSE") if scaled else ("MAE", "RMSE")
        L.append(f"\n## {v['venue']} — {v['n_folds']} folds, basis `{v['basis']}`\n")
        L.append(f"| arm | {a_lbl} | {s_lbl} | bias | 95% CI | p | in 90% MCS |")
        L.append("|---|---|---|---|---|---|---|")
        for name, arm in v["arms"].items():
            inset = "yes" if name in v["mcs_retained"] else "no"
            L.append(
                f"| {name} | {_fmt(arm['absolute_metric'])} | {_fmt(arm['squared_metric'])} "
                f"| {arm['mean_signed_residual']:+.2f} | "
                f"[{arm['bias_ci_lo']:+.2f}, {arm['bias_ci_hi']:+.2f}] | "
                f"{arm['bias_p']:.2e} | {inset} |")
        L.append(f"\nBest incumbent on {a_lbl}: **{v['best_incumbent']}**. "
                 f"90% MCS retains {len(v['mcs_retained'])} of {len(v['arms'])} arms.\n")
        L.append("Paired moving-block bootstrap (positive = second arm worse):\n")
        L.append("| contrast | mean diff | 95% CI | p | separable from zero |")
        L.append("|---|---|---|---|---|")
        for k, p in v["paired"].items():
            sep = "yes" if np.isfinite(p["p"]) and p["p"] < 0.05 else "**no**"
            L.append(f"| {k} | {p['mean']:+.4f} | [{p['ci_lo']:+.4f}, {p['ci_hi']:+.4f}] "
                     f"| {p['p']:.3f} | {sep} |")

    L.append("\n## Envelope check (prediction i)\n")
    L.append("| venue | max training rows | TabPFN validated limit | inside |")
    L.append("|---|---|---|---|")
    for v in out["venues"]:
        e = v["envelope"]
        L.append(f"| {v['venue']} | {e['max_train_rows']} | {TABPFN_MAX_SAMPLES} | "
                 f"{'yes' if e['inside_sample_limit'] else '**no**'} |")

    L.append("\n> Scored against the five pre-registered predictions in "
             "`log/68_R5_tabpfn_entrant_result.md`. Null and negative cells carry the same "
             "prominence as positive ones.\n")
    REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    REPORT_MD.write_text("\n".join(L))


def main() -> int:
    import tabpfn
    import tabpfn_time_series as tts

    t0 = time.time()
    print("R5 · TabPFN-TS entrant — local inference, reported never served")
    pipelines = {"median": _build_pipeline("median"), "mean": _build_pipeline("mean")}

    venues = []
    for venue in config.FORECAST_VENUES:
        print(f"  {venue} ...", flush=True)
        venues.append(run_venue(venue, pipelines))
        print(f"    done at {time.time() - t0:.0f}s", flush=True)

    out = {
        "wall_clock_s": time.time() - t0,
        "seed": SEED,
        "paired_bootstrap_seed": PAIRED_BOOTSTRAP_SEED,
        "versions": {
            "tabpfn_time_series": getattr(tts, "__version__", "unknown"),
            "tabpfn": tabpfn.__version__,
        },
        "venues": venues,
    }
    METRICS_JSON.parent.mkdir(parents=True, exist_ok=True)
    METRICS_JSON.write_text(json.dumps(out, indent=2))
    _write_report(out)
    print(f"\n  wrote {REPORT_MD}")
    print(f"  wall clock {out['wall_clock_s']:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
