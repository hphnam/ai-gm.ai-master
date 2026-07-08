"""WP9b · Chronos-2 covariate probe (report-only).

Chronos-2's verified headline is zero-shot covariate support (addendum S7), which
bears directly on the project's logged exogenous honest null ("Chronos / TimesFM
ingest covariates poorly"). This probe refreshes that evidence: for the Beer Hall
rolling folds it compares Chronos-2 univariate against a covariate variant whose
future_df carries only covariates genuinely known in advance (bank holidays, Ellel
event nights, school / university term flags). Weather is deliberately excluded,
it is not known-future.

This does not enter the ladder or any gate. It writes
eval/chronos2_covariate_probe.md and refreshes the exogenous-null decision-log
entry and the Discussion chapter.

Run (in the eval venv):
    .venv-eval/bin/python -m eval.chronos2_covariate_probe
"""

from __future__ import annotations

import sys

import numpy as np
import pandas as pd

from config import SEASONAL_PERIOD, STORE_DIR
from eval import harness
from features.build_features import build_features
from models.foundation import CHRONOS2_MODEL_ID, HAS_CHRONOS, _chronos2_pipeline

VENUE = "beer_hall"
# Covariates known at forecast time (calendar-derived). Never weather.
KNOWN_FUTURE = ["is_bank_holiday", "is_ellel_event", "exo_is_school_term",
                "exo_is_uni_term"]
RESULTS_MD = STORE_DIR.parent / "eval" / "chronos2_covariate_probe.md"


def _point_forecast(pipe, train: pd.DataFrame, test: pd.DataFrame,
                    covariates: list[str]) -> np.ndarray:
    n = len(test)
    context_df = pd.DataFrame({
        "id": "l1",
        "timestamp": pd.to_datetime(train["date"].to_numpy()),
        "target": train["value"].to_numpy(float)})
    future_df = None
    if covariates:
        for c in covariates:
            context_df[c] = train[c].to_numpy(float)
        future_df = pd.DataFrame({
            "id": "l1", "timestamp": pd.to_datetime(test["date"].to_numpy())})
        for c in covariates:
            future_df[c] = test[c].to_numpy(float)
    pred = pipe.predict_df(
        context_df, future_df=future_df, prediction_length=n,
        quantile_levels=[0.1, 0.5, 0.9], id_column="id",
        timestamp_column="timestamp", target="target")
    col = "0.5" if "0.5" in pred.columns else "predictions"
    return np.clip(np.asarray(pred[col].to_numpy(), float), 0.0, None)


def probe() -> dict:
    feats = build_features(VENUE)
    pipe = _chronos2_pipeline()
    rows = []
    for k, (tr, te) in enumerate(harness.rolling_origin(
            feats, n_folds=6, horizon_days=7, min_train_days=120), 1):
        ytr, yte = tr["value"].to_numpy(), te["value"].to_numpy()
        uni = _point_forecast(pipe, tr, te, [])
        cov = _point_forecast(pipe, tr, te, KNOWN_FUTURE)
        rows.append({
            "fold": k,
            "mase_univariate": harness.mase(yte, uni, ytr, SEASONAL_PERIOD),
            "mase_covariate": harness.mase(yte, cov, ytr, SEASONAL_PERIOD)})
    uni_mean = float(np.mean([r["mase_univariate"] for r in rows]))
    cov_mean = float(np.mean([r["mase_covariate"] for r in rows]))
    return {"rows": rows, "uni_mean": uni_mean, "cov_mean": cov_mean}


def _write_report(out: dict) -> None:
    RESULTS_MD.parent.mkdir(parents=True, exist_ok=True)
    delta = out["cov_mean"] - out["uni_mean"]
    verdict = (
        "covariates HELP: the covariate variant lowers mean rolling MASE"
        if delta < -1e-6 else
        "covariates do NOT help: the covariate variant does not lower mean rolling "
        "MASE" if delta > 1e-6 else
        "covariates are neutral on mean rolling MASE")
    lines = [
        f"# WP9b · Chronos-2 covariate probe ({VENUE})\n",
        f"Model: **{CHRONOS2_MODEL_ID}**, zero-shot. Univariate vs a covariate "
        "variant whose future_df carries only known-future calendar covariates "
        f"({', '.join(KNOWN_FUTURE)}); weather is excluded as not known-future. "
        "Report-only: this touches no ladder rung and no gate.\n",
        "| Fold | MASE univariate | MASE covariate |",
        "|---|---|---|",
    ]
    for r in out["rows"]:
        lines.append(f"| {r['fold']} | {r['mase_univariate']:.3f} | "
                     f"{r['mase_covariate']:.3f} |")
    lines += [
        f"| **mean** | **{out['uni_mean']:.3f}** | **{out['cov_mean']:.3f}** |",
        f"\nOutcome: {verdict} ({out['uni_mean']:.3f} -> {out['cov_mean']:.3f}, "
        f"delta {delta:+.3f}). This refreshes the exogenous-null evidence: the "
        "project's logged finding that time-series foundation models ingest "
        "covariates weakly can now be quoted against Chronos-2's own covariate "
        "path on real Beer Hall folds.",
    ]
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    if not HAS_CHRONOS:
        print("WP9b covariate probe: chronos backend not installed; skipped.")
        return 0
    print(f"WP9b · Chronos-2 covariate probe ({VENUE})")
    out = probe()
    for r in out["rows"]:
        print(f"  fold {r['fold']}: univariate MASE={r['mase_univariate']:.3f} "
              f"covariate MASE={r['mase_covariate']:.3f}")
    print(f"  mean: univariate={out['uni_mean']:.3f} covariate={out['cov_mean']:.3f}")
    _write_report(out)
    print(f"  report            : {RESULTS_MD}")
    print("WP9b RESULT: PASS (covariate vs univariate compared, report-only)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
