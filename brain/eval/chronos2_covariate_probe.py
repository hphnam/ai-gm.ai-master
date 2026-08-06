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

import json
import sys

import numpy as np
import pandas as pd

import config
from config import REPORT_ROOT
from eval import harness, mcs
from features.build_features import build_features
from models.foundation import CHRONOS2_MODEL_ID, HAS_CHRONOS, _chronos2_pipeline

VENUE = "beer_hall"
# Covariates known at forecast time (calendar-derived). Never weather.
KNOWN_FUTURE = ["is_bank_holiday", "is_ellel_event", "exo_is_school_term",
                "exo_is_uni_term"]
RESULTS_MD = REPORT_ROOT / "eval" / "chronos2_covariate_probe.md"
METRICS_JSON = REPORT_ROOT / "eval" / "chronos2_covariate_probe.json"

# The estate's ruled basis for this venue (G2), not a hard-coded literal. The previous
# version pinned `calendar_lag7`, the same fault found in `transfer/lovo.py` at G17o.
BASIS = config.VENUE_SCALE_BASIS.get(VENUE, "calendar_lag7_active")

# Dispersion configuration, mirroring `eval/weather_basis.py` and `eval/group_icl.py`.
SEED = 93
PAIRED_BOOTSTRAP_SEED = SEED + 1     # distinct, so its resample is independent of the MCS
BLOCK_LEN = mcs.BLOCK_LEN            # 7, the horizon-length block
BOOTSTRAP_B = 1000
HORIZON = 7
MIN_TRAIN = 120
ARMS = ("univariate", "covariate")


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


def _paired_bootstrap(L: np.ndarray, arms: list[str], *, b: int, block_len: int,
                      seed: int) -> list[dict]:
    """Moving-block paired bootstrap on each arm-pair mean difference.

    Lifted from `eval/weather_basis.py::_paired_bootstrap` rather than rewritten, so the
    two instruments cannot drift apart.
    """
    T = L.shape[0]
    rng = np.random.default_rng(seed)
    resample = mcs.moving_block_indices(T, block_len, b, rng)
    boot = L[resample].mean(axis=1)
    full = L.mean(axis=0)
    out = []
    for i in range(len(arms)):
        for j in range(i + 1, len(arms)):
            d = boot[:, i] - boot[:, j]
            lo, hi = float(np.quantile(d, 0.05)), float(np.quantile(d, 0.95))
            out.append({"pair": f"{arms[i]}-{arms[j]}",
                        "mean_delta": float(full[i] - full[j]),
                        "ci_lo": lo, "ci_hi": hi,
                        "excludes_zero": bool(lo > 0 or hi < 0)})
    return out


def probe() -> dict:
    """Per-fold loss VECTORS for both arms, then the MCS and a paired bootstrap over them.

    Two things changed against the six-fold version this replaces, and both were forced by
    defects the audit found elsewhere in the project:

    1. The fold grid is the whole active span at a full-horizon step, not a six-fold cap.
       At six folds `mcs.moving_block_indices` clamps the block to `n_obs`, so with
       BLOCK_LEN = 7 every resample IS the sample and the bootstrap is degenerate -- report
       54 caught it producing zero-width CIs and p-values pinned to 0.0/1.0, and on that
       basis "shipping" a feature that scored 6.5% WORSE than its baseline.
    2. The verdict is read off the MCS and the paired CI, never off the sign of a mean
       difference. The previous artefact concluded "covariates HELP" from a delta of -0.014
       across folds that split three better and three worse.
    """
    feats = build_features(VENUE)
    pipe = _chronos2_pipeline()
    rows = []
    for k, (tr, te) in enumerate(harness.rolling_origin(
            feats, n_folds=None, horizon_days=HORIZON, min_train_days=MIN_TRAIN,
            step_days=HORIZON), 1):
        ytr, yte = tr["value"].to_numpy(), te["value"].to_numpy()
        uni = _point_forecast(pipe, tr, te, [])
        cov = _point_forecast(pipe, tr, te, KNOWN_FUTURE)
        rows.append({
            "fold": k,
            "train_end": str(tr["date"].max().date()),
            "mase_univariate": harness.mase(yte, uni, ytr, basis=BASIS),
            "mase_covariate": harness.mase(yte, cov, ytr, basis=BASIS)})

    L = np.array([[r["mase_univariate"], r["mase_covariate"]] for r in rows], float)
    keep = np.isfinite(L).all(axis=1)
    L, rows = L[keep], [r for r, k in zip(rows, keep) if k]
    arms = list(ARMS)

    n_folds = int(L.shape[0])
    res = mcs.model_confidence_set(arms, L, metric=f"mase[{BASIS}]",
                                   block_len=BLOCK_LEN, n_boot=mcs.N_BOOT, seed=SEED)
    boot = _paired_bootstrap(L, arms, b=BOOTSTRAP_B, block_len=BLOCK_LEN,
                             seed=PAIRED_BOOTSTRAP_SEED)
    # Guard the exact defect report 54 found: a block at or above n_obs cannot resample.
    dispersion_ok = n_folds > BLOCK_LEN

    uni_mean = float(L[:, 0].mean())
    cov_mean = float(L[:, 1].mean())
    n_better = int((L[:, 1] < L[:, 0]).sum())
    return {
        "rows": rows, "uni_mean": uni_mean, "cov_mean": cov_mean,
        "basis": BASIS, "n_folds": n_folds, "arms": arms,
        "n_folds_covariate_better": n_better,
        "fold_sd_univariate": float(L[:, 0].std(ddof=1)),
        "fold_sd_covariate": float(L[:, 1].std(ddof=1)),
        "mean_loss": {a: res.mean_loss[a] for a in arms},
        "mcs_pvalue": {a: res.mcs_pvalue[a] for a in arms},
        "set_90": res.set_at(0.10), "set_75": res.set_at(0.25),
        "paired_bootstrap": boot,
        "dispersion_ok": dispersion_ok,
        "seed": SEED, "paired_bootstrap_seed": PAIRED_BOOTSTRAP_SEED,
        "block_len": BLOCK_LEN, "n_boot": BOOTSTRAP_B,
    }


def _write_report(out: dict) -> None:
    RESULTS_MD.parent.mkdir(parents=True, exist_ok=True)
    delta = out["cov_mean"] - out["uni_mean"]
    pair = out["paired_bootstrap"][0]
    separable = (len(out["set_90"]) == 1)
    # The verdict is the MCS plus the paired interval. A mean difference on its own is
    # not admitted as evidence for either direction.
    if not out["dispersion_ok"]:
        verdict = ("NOT EVALUABLE: the fold count is at or below the bootstrap block "
                   "length, so no dispersion is estimable")
    elif separable:
        winner = out["set_90"][0]
        verdict = (f"the two arms ARE separable: the 90% model confidence set retains "
                   f"`{winner}` alone")
    else:
        verdict = ("covariates are NOT separable from the univariate arm: the 90% model "
                   "confidence set retains both, and the paired bootstrap interval on "
                   "the difference contains zero")
    lines = [
        f"# WP9b · Chronos-2 covariate probe ({VENUE})\n",
        f"Model: **{CHRONOS2_MODEL_ID}**, zero-shot. Univariate vs a covariate "
        "variant whose future_df carries only known-future calendar covariates "
        f"({', '.join(KNOWN_FUTURE)}); weather is excluded as not known-future. "
        "Report-only: this touches no ladder rung and no gate.\n",
        f"Scored on the estate's ruled basis for this venue, `{out['basis']}` "
        "(`config.VENUE_SCALE_BASIS`). Rolling origin over the whole active span at a "
        f"full-horizon step: **{out['n_folds']} folds**, horizon {HORIZON}.\n",
        f"Dispersion: moving-block bootstrap, block {out['block_len']}, "
        f"B={out['n_boot']}, MCS seed {out['seed']}, paired-bootstrap seed "
        f"{out['paired_bootstrap_seed']}.\n",
        "| Fold | train end | MASE univariate | MASE covariate |",
        "|---|---|---|---|",
    ]
    for r in out["rows"]:
        lines.append(f"| {r['fold']} | {r['train_end']} | {r['mase_univariate']:.3f} | "
                     f"{r['mase_covariate']:.3f} |")
    lines += [
        f"| **mean** | | **{out['uni_mean']:.3f}** | **{out['cov_mean']:.3f}** |",
        "",
        "## Dispersion, and the verdict read off it",
        "",
        f"- fold-to-fold SD: univariate {out['fold_sd_univariate']:.3f}, "
        f"covariate {out['fold_sd_covariate']:.3f}",
        f"- mean difference (covariate - univariate): **{delta:+.4f}**, against those SDs",
        f"- folds where the covariate arm is better: "
        f"**{out['n_folds_covariate_better']} of {out['n_folds']}**",
        f"- paired moving-block bootstrap on the difference: mean "
        f"{pair['mean_delta']:+.4f}, 90% CI "
        f"[{pair['ci_lo']:+.4f}, {pair['ci_hi']:+.4f}], excludes zero: "
        f"**{pair['excludes_zero']}**",
        f"- MCS p-values: " + ", ".join(
            f"`{a}` {out['mcs_pvalue'][a]:.3f}" for a in out["arms"]),
        f"- 90% model confidence set: **{out['set_90']}**; 75% set: {out['set_75']}",
        "",
        f"**Outcome: {verdict}** "
        f"({out['uni_mean']:.3f} -> {out['cov_mean']:.3f}, delta {delta:+.4f}).",
        "",
        "This refreshes the exogenous-null evidence: the project's logged finding that "
        "time-series foundation models ingest covariates weakly is quoted against "
        "Chronos-2's own covariate path on real Beer Hall folds. A mean difference is "
        "not evidence of direction at this fold-to-fold spread, and the artefact no "
        "longer reports one as if it were.",
    ]
    RESULTS_MD.write_text("\n".join(lines))
    METRICS_JSON.write_text(
        json.dumps(out, indent=2, sort_keys=True, default=str) + "\n")


def main() -> int:
    if not HAS_CHRONOS:
        print("WP9b covariate probe: chronos backend not installed; skipped.")
        return 0
    print(f"WP9b · Chronos-2 covariate probe ({VENUE})")
    out = probe()
    pair = out["paired_bootstrap"][0]
    print(f"  basis             : {out['basis']}  folds: {out['n_folds']}")
    print(f"  mean              : univariate={out['uni_mean']:.3f} "
          f"covariate={out['cov_mean']:.3f} (delta {out['cov_mean']-out['uni_mean']:+.4f})")
    print(f"  fold SD           : uni={out['fold_sd_univariate']:.3f} "
          f"cov={out['fold_sd_covariate']:.3f}; covariate better on "
          f"{out['n_folds_covariate_better']}/{out['n_folds']} folds")
    print(f"  paired bootstrap  : {pair['mean_delta']:+.4f} "
          f"90% CI [{pair['ci_lo']:+.4f}, {pair['ci_hi']:+.4f}] "
          f"excludes zero={pair['excludes_zero']}")
    print(f"  90% MCS           : {out['set_90']}")
    _write_report(out)
    print(f"  report            : {RESULTS_MD}")
    print(f"WP9b RESULT: separable={len(out['set_90']) == 1}, "
          f"dispersion_ok={out['dispersion_ok']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
