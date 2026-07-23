"""S6 G17g - lead-matched weather: the five-arm exogenous ablation, MCS, and coverage.

Five arms of the SAME Chronos-2 exo entrant, differing only in the 7-day target-window
weather they are handed (training context weather, calendar/event/World Cup covariates, and
everything else held fixed):

  N   no weather at all (the exogenous path off; reproduces the committed rung4_chronos2)
  O   observed  - ERA5 reanalysis at the valid time (perfect foreknowledge, upper bound)
  H   hindcast  - archived near valid time (the committed default; what exo numbers used)
  F   fixed-lead - the forecast issued a fixed operational lead (3 days) ahead, one lead
  M   horizon-matched - the forecast issued h days ahead for horizon step h (serving reality)

The question, stated plainly: how much of chronos2_exo's advantage over the no-weather arm
survives when the weather is on the basis the model would ACTUALLY have at serving? If M and
N share a confidence set, weather adds nothing at operational lead. If H beats M, that gap is
the optimism in every previously published exo number.

O/H come from the observed/hindcast basis tables; F/M from a per-lead store pulled from ONE
pinned global model (`config.WEATHER_HORIZON_MODEL`), so F-vs-M isolates the lead policy on a
single model rather than confounding it with a change of model between leads. The comparison
instrument is the S3 Model Confidence Set at 90 percent with a moving-block paired bootstrap,
per venue; Beer Hall and Two River Taps on MASE (basis calendar_lag7_active), Ellel on
unscaled MAE (the S4 decision: no defensible seasonal-naive basis at 1.2 trading days a week).
Results are reported per horizon step as well as pooled, because forecast skill decays with
lead and a pooled average hides the H-to-M gap where it is largest.

Run (forecast venv, Chronos-2 present; CPU keeps N comparable to the committed ladder):
    .venv-forecast/bin/python -m eval.weather_basis --build       # the full five-arm run + MCS
    .venv-forecast/bin/python -m eval.weather_basis --smoke       # a few origins, wall-clock probe
    .venv-forecast/bin/python -m eval.weather_basis               # re-render report from JSON
"""

from __future__ import annotations

import json
import os
import sys
import time

import numpy as np
import pandas as pd

import config
from eval import fold_vectors, harness, mcs
from ingest.exog_weather import (
    HORIZON_TABLE,
    coverage,
    horizon_coverage,
    read_basis,
    read_horizon,
)
from models.foundation import CHRONOS2_EXO_COLS
from models.group_forecast import PanelOrigin, PanelSeries, group_predict, load_pipeline
from models.weather_basis import (
    ExoFold,
    assert_lead_matched,
    exo_predict,
    fixed_lead_target,
    horizon_matched_target,
    observed_target,
)
from store.warehouse import assert_store_ceiling

OUT_DIR = config.BRAIN_DIR / "eval"
VECTORS_PATH = OUT_DIR / "weather_basis_L1.json"
MCS_PATH = OUT_DIR / "weather_basis_mcs.json"
COVERAGE_PATH = OUT_DIR / "weather_basis_coverage.json"
REPORT_PATH = OUT_DIR / "weather_basis.md"

HORIZON = 7
MIN_TRAIN_DAYS = 120
STEP_DAYS = 1
SEED = config.EVAL_SCALED_SEED           # 93, shared with the MCS
PAIRED_BOOTSTRAP_SEED = SEED + 1         # distinct so its resample is independent of the MCS
BOOTSTRAP_B = 10000
BLOCK_LEN = mcs.BLOCK_LEN                # 7, the horizon-length block
ORIGIN_BATCH = 32
EXO_COLS = list(CHRONOS2_EXO_COLS)
FIXED_LEAD = config.WEATHER_LEAD_DAYS    # 3, the stock operational reorder lead

ARMS = ("N", "O", "H", "F", "M")
VENUES = ("beer_hall", "ellel", "two_river_taps")
VENUE_BASIS = {"beer_hall": "calendar_lag7_active",
               "two_river_taps": "calendar_lag7_active",
               "ellel": "unscaled"}
VENUE_LOSS = {"beer_hall": "mase", "two_river_taps": "mase", "ellel": "mae"}


# --- Frames and folds --------------------------------------------------------

def base_frame(venue: str) -> pd.DataFrame:
    """The active-trimmed feature frame the committed exo ladder uses (weather=hindcast)."""
    from models.ladder import _load_feats

    return _load_feats(venue).reset_index(drop=True)


def venue_folds(venue: str, frame: pd.DataFrame) -> list[tuple[pd.DataFrame, pd.DataFrame]]:
    """Every step-1 rolling-origin (train, test) fold, matching the committed ladder."""
    return list(harness.rolling_origin(
        frame, n_folds=None, horizon_days=HORIZON, min_train_days=MIN_TRAIN_DAYS,
        step_days=STEP_DAYS))


def _weather_complete(frame: pd.DataFrame) -> bool:
    return not frame[["exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs"]].isna().any().any()


# --- Per-arm forecasts -------------------------------------------------------

def _n_arm(venue: str, folds, pipe) -> dict[str, np.ndarray]:
    """N: plain Chronos-2, no covariates (the group_predict univariate path)."""
    panels = []
    for tr, _te in folds:
        ctx = tr[["date", "value"]]
        origin = tr["date"].max()
        panels.append(PanelOrigin(
            origin=origin,
            future_dates=pd.date_range(origin + pd.Timedelta(days=1), periods=HORIZON,
                                       freq="D").to_numpy(),
            series=(PanelSeries(venue=venue,
                                dates=pd.to_datetime(ctx["date"]).to_numpy(),
                                values=ctx["value"].to_numpy(float)),)))
    pred = group_predict(panels, cross_learning=False, pipe=pipe, origin_batch=ORIGIN_BATCH)
    return {k: d[venue] for k, d in pred.items()}


def _exo_arm(venue: str, cell: str, folds, arm: str, pipe, *,
             observed_df, horizon_df) -> tuple[dict[str, np.ndarray], int]:
    """One exogenous arm (O/H/F/M). Returns (forecasts, skipped_incomplete_weather)."""
    exo_folds, skipped = [], 0
    for tr, te in folds:
        key = str(tr["date"].max().date())
        base_target = te[["date", *EXO_COLS]].copy()
        if arm == "H":
            target = base_target
        elif arm == "O":
            target = observed_target(base_target, cell, observed_df)
        elif arm == "F":
            target = fixed_lead_target(base_target, cell, horizon_df, lead=FIXED_LEAD)
        elif arm == "M":
            target = horizon_matched_target(base_target, cell, horizon_df)
            assert_lead_matched(target, cell, horizon_df)   # G1, load-bearing
        else:
            raise ValueError(f"unknown exo arm {arm!r}")
        # Training context weather is hindcast for every exo arm; the target is the arm.
        if not (_weather_complete(tr) and _weather_complete(target)):
            skipped += 1
            continue
        exo_folds.append(ExoFold(key=key, venue=venue,
                                 train=tr[["date", "value", *EXO_COLS]].copy(),
                                 target=target[["date", *EXO_COLS]].copy()))
    forecasts = exo_predict(exo_folds, pipe=pipe, exo_cols=EXO_COLS,
                            origin_batch=ORIGIN_BATCH)
    return forecasts, skipped


# --- Scoring -----------------------------------------------------------------

def _truth(frame: pd.DataFrame, origin: pd.Timestamp) -> np.ndarray | None:
    fut = pd.date_range(origin + pd.Timedelta(days=1), periods=HORIZON, freq="D")
    fr = frame.set_index(pd.to_datetime(frame["date"]))
    if not all(d in fr.index for d in fut):
        return None
    return fr.loc[fut, "value"].to_numpy(float)


def _fold_vectors(venue: str, forecasts: dict[str, np.ndarray],
                  frame: pd.DataFrame, folds) -> dict:
    """Per-fold per-STEP loss for one venue+arm, keyed by origin date.

    Stores the loss-metric contribution per horizon step (scaled abs error for a scaled
    venue, raw abs error for Ellel); the window loss is their mean and per-step pooling is
    a mean across folds, so both views come from one aligned object.
    """
    basis = VENUE_BASIS[venue]
    keys, per_step = [], []
    for tr, _te in folds:
        origin = tr["date"].max()
        key = str(origin.date())
        y_pred = forecasts.get(key)
        y_true = _truth(frame, origin)
        if y_pred is None or y_true is None:
            continue
        abs_err = np.abs(y_true - y_pred)
        if basis == "unscaled":
            step = abs_err
        else:
            y_train = frame[pd.to_datetime(frame["date"]) <= origin]["value"].to_numpy(float)
            scale = harness.seasonal_naive_scale(y_train, basis=basis)
            if not np.isfinite(scale):
                continue
            step = abs_err / scale
        if not np.all(np.isfinite(step)):
            continue
        keys.append(key)
        per_step.append([float(v) for v in step])
    return {"origin_keys": keys, "per_step": per_step}


def _window_loss(arm_block: dict) -> dict[str, float]:
    return {k: float(np.mean(v))
            for k, v in zip(arm_block["origin_keys"], arm_block["per_step"])}


# --- MCS + paired bootstrap over the five arms -------------------------------

def _loss_matrix(venue_block: dict, venue: str):
    arms = [a for a in ARMS if a in venue_block["arms"]
            and venue_block["arms"][a]["origin_keys"]]
    per_arm = {a: _window_loss(venue_block["arms"][a]) for a in arms}
    common = sorted(set.intersection(*(set(d) for d in per_arm.values())))
    L = np.array([[per_arm[a][k] for a in arms] for k in common], float)
    return arms, common, L


def _paired_bootstrap(L: np.ndarray, arms: list[str], *, b: int, block_len: int,
                      seed: int) -> list[dict]:
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


def _per_step_pooled(venue_block: dict, common: list[str]) -> dict:
    """Mean per-step loss per arm over the origins common to all arms (comparable rows)."""
    out = {}
    for arm, block in venue_block["arms"].items():
        by_key = dict(zip(block["origin_keys"], block["per_step"]))
        rows = np.array([by_key[k] for k in common if k in by_key], float)
        out[arm] = [float(v) for v in rows.mean(axis=0)] if rows.size else []
    return out


def run_mcs(vectors: dict) -> dict:
    out = {"seed": SEED, "paired_bootstrap_seed": PAIRED_BOOTSTRAP_SEED,
           "block_len": BLOCK_LEN, "n_boot": BOOTSTRAP_B, "venues": {}}
    for venue, block in vectors["venues"].items():
        arms, common, L = _loss_matrix(block, venue)
        if len(arms) < 2 or L.shape[0] < 2:
            out["venues"][venue] = {"note": "fewer than two arms/folds; MCS not run",
                                    "arms": arms, "n_folds": int(L.shape[0])}
            continue
        res = mcs.model_confidence_set(arms, L, metric=VENUE_LOSS[venue],
                                       block_len=BLOCK_LEN, n_boot=mcs.N_BOOT, seed=SEED)
        boot = _paired_bootstrap(L, arms, b=BOOTSTRAP_B, block_len=BLOCK_LEN,
                                 seed=PAIRED_BOOTSTRAP_SEED)
        out["venues"][venue] = {
            "loss_metric": VENUE_LOSS[venue], "basis": block["basis"],
            "n_folds": int(L.shape[0]), "arms": arms,
            "mean_loss": {a: res.mean_loss[a] for a in arms},
            "mcs_pvalue": {a: res.mcs_pvalue[a] for a in arms},
            "set_90": res.set_at(0.10), "set_75": res.set_at(0.25),
            "elimination": res.elimination,
            "paired_bootstrap": boot,
            "per_step_pooled": _per_step_pooled(block, common),
            "per_step_common_origins": len(common),
        }
    return out


# --- Reproduction of the committed ladder ------------------------------------

def _reproduce(forecasts: dict[str, np.ndarray], venue: str, frame: pd.DataFrame,
               folds, committed_rung: str) -> dict:
    """Score `forecasts` on the committed basis (calendar_lag7) and pair to the committed
    rung's per-fold MASE by train_end. G3 for N (rung4_chronos2); a like-for-like sanity
    for H (rung4_chronos2_exo)."""
    payload = fold_vectors.load(venue)
    committed = payload["rungs"][committed_rung]
    if not committed.get("available"):
        return {"note": f"{committed_rung} not available for {venue}"}
    by_date = {payload["folds"][i]["train_end"]: m
               for i, m in zip(committed["fold_index"], committed["mase"])}
    mine, theirs = [], []
    for tr, _te in folds:
        origin = tr["date"].max()
        key = str(origin.date())
        y_pred = forecasts.get(key)
        y_true = _truth(frame, origin)
        if y_pred is None or y_true is None or key not in by_date:
            continue
        y_train = frame[pd.to_datetime(frame["date"]) <= origin]["value"].to_numpy(float)
        m = harness.mase(y_true, y_pred, y_train, basis="calendar_lag7")
        if np.isfinite(m):
            mine.append(m)
            theirs.append(by_date[key])
    a, b = np.array(mine), np.array(theirs)
    return {"n_paired": int(a.size),
            "mean_reproduced": float(a.mean()) if a.size else float("nan"),
            "mean_committed": float(b.mean()) if b.size else float("nan"),
            "max_abs_delta": float(np.max(np.abs(a - b))) if a.size else float("nan")}


# --- Build --------------------------------------------------------------------

def run(*, device: str = "cpu", venues=VENUES, smoke: int | None = None) -> dict:
    ceiling = assert_store_ceiling()
    pipe, resolved = load_pipeline(device)
    observed_df = read_basis("observed")
    started = time.time()

    venues_out, repro, skipped_all, fold_counts = {}, {}, {}, {}
    for venue in venues:
        cell = config.WEATHER_CELLS[venue]
        frame = base_frame(venue)
        folds = venue_folds(venue, frame)
        if smoke:
            folds = folds[-smoke:]
        horizon_df = read_horizon(cell)

        forecasts = {}
        forecasts["N"] = _n_arm(venue, folds, pipe)
        skipped = {}
        for arm in ("O", "H", "F", "M"):
            fc, sk = _exo_arm(venue, cell, folds, arm, pipe,
                              observed_df=observed_df, horizon_df=horizon_df)
            forecasts[arm] = fc
            skipped[arm] = sk

        arms_block = {}
        for arm in ARMS:
            arms_block[arm] = _fold_vectors(venue, forecasts[arm], frame, folds)
        venues_out[venue] = {"basis": VENUE_BASIS[venue], "loss_metric": VENUE_LOSS[venue],
                             "arms": arms_block}
        fold_counts[venue] = {a: len(arms_block[a]["origin_keys"]) for a in ARMS}
        skipped_all[venue] = skipped
        repro[venue] = {
            "N_vs_rung4_chronos2": _reproduce(forecasts["N"], venue, frame, folds,
                                              "rung4_chronos2"),
            "H_vs_rung4_chronos2_exo": _reproduce(forecasts["H"], venue, frame, folds,
                                                  "rung4_chronos2_exo")}

    payload = {
        "schema_version": 1,
        "store_ceiling": ceiling,
        "device": resolved,
        "horizon_days": HORIZON,
        "min_train_days": MIN_TRAIN_DAYS,
        "step_days": STEP_DAYS,
        "seed": SEED,
        "arms": {
            "N": "no weather (exogenous path off)",
            "O": "observed / ERA5 reanalysis at valid time (upper bound)",
            "H": "hindcast, archived near valid time (committed default)",
            "F": f"fixed lead {FIXED_LEAD} days (pinned {config.WEATHER_HORIZON_MODEL})",
            "M": f"horizon-matched, lead=step (pinned {config.WEATHER_HORIZON_MODEL})"},
        "train_context_weather": "hindcast (identical across all exo arms)",
        "horizon_model": config.WEATHER_HORIZON_MODEL,
        "horizon_table": HORIZON_TABLE,
        "fixed_lead_days": FIXED_LEAD,
        "fold_counts": fold_counts,
        "skipped_incomplete_weather": skipped_all,
        "reproduction": repro,
        "smoke": smoke,
        "wall_clock_s": round(time.time() - started, 1),
        "venues": venues_out,
    }
    if not smoke:
        VECTORS_PATH.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n")
    return payload


def build() -> dict:
    payload = run(device="cpu")
    mcs_out = run_mcs(payload)
    mcs_out["store_ceiling"] = payload["store_ceiling"]
    mcs_out["device"] = payload["device"]
    mcs_out["horizon_model"] = config.WEATHER_HORIZON_MODEL
    MCS_PATH.write_text(json.dumps(mcs_out, indent=2, allow_nan=False) + "\n")
    cov = {"store_ceiling": payload["store_ceiling"],
           "device": payload["device"],
           "horizon_model": config.WEATHER_HORIZON_MODEL,
           "horizon_max_lead": config.WEATHER_HORIZON_MAX_LEAD,
           "basis_max_date": {b: {str(c): (d.isoformat() if hasattr(d, "isoformat") else d)
                                  for c, d in cov_b.items()}
                              for b, cov_b in coverage().items()},
           "horizon_coverage": horizon_coverage()}
    COVERAGE_PATH.write_text(json.dumps(cov, indent=2, allow_nan=False) + "\n")
    render(payload, mcs_out, cov)
    return {"vectors": payload, "mcs": mcs_out, "coverage": cov}


# --- Rendering ---------------------------------------------------------------

def render(vectors: dict, mcs_out: dict, cov: dict) -> None:
    lines = [
        "# S6 G17g - lead-matched weather: five-arm exogenous ablation and MCS\n",
        f"Store ceiling {vectors['store_ceiling']}; device {vectors['device']}; "
        f"seed {vectors['seed']}; horizon model {vectors['horizon_model']}; "
        f"wall-clock {vectors['wall_clock_s']}s.\n",
        "Arms (target-window weather; training context is hindcast throughout): "
        + "; ".join(f"**{k}** {v}" for k, v in vectors["arms"].items()) + ".\n",
        "## Fold counts per arm (N has no weather dependency)\n",
        "| venue | " + " | ".join(ARMS) + " |", "|" + "---|" * (len(ARMS) + 1)]
    for v, fc in vectors["fold_counts"].items():
        lines.append(f"| {v} | " + " | ".join(str(fc[a]) for a in ARMS) + " |")

    lines.append("\n## Reproduction (committed basis calendar_lag7)\n")
    lines.append("| venue | N vs rung4_chronos2 (max Δ) | H vs rung4_chronos2_exo (max Δ) |")
    lines.append("|---|---|---|")
    for v, r in vectors["reproduction"].items():
        n, h = r["N_vs_rung4_chronos2"], r["H_vs_rung4_chronos2_exo"]
        lines.append(f"| {v} | {n.get('max_abs_delta', float('nan')):.4f} "
                     f"(n={n.get('n_paired')}) | {h.get('max_abs_delta', float('nan')):.4f} "
                     f"(n={h.get('n_paired')}) |")

    lines.append("\n## The arms, by venue (90% Model Confidence Set)\n")
    for venue, mv in mcs_out["venues"].items():
        if "note" in mv:
            lines.append(f"### {venue}\n{mv['note']} (arms {mv['arms']}).\n")
            continue
        lines += [f"### {venue} (loss {mv['loss_metric']}, basis {mv['basis']}, "
                  f"n_folds {mv['n_folds']})\n",
                  "| arm | mean loss | MCS p-value | in 90% set |", "|---|---|---|---|"]
        for a in mv["arms"]:
            lines.append(f"| {a} | {mv['mean_loss'][a]:.4f} | {mv['mcs_pvalue'][a]:.3f} | "
                         f"{'yes' if a in mv['set_90'] else 'no'} |")
        lines.append(f"\n90% set: {mv['set_90']}. Paired bootstrap "
                     f"(block {mcs_out['block_len']}, B {mcs_out['n_boot']}):")
        for p in mv["paired_bootstrap"]:
            lines.append(f"- {p['pair']}: mean delta {p['mean_delta']:+.4f}, "
                         f"90% CI [{p['ci_lo']:+.4f}, {p['ci_hi']:+.4f}]"
                         f"{' (excludes 0)' if p['excludes_zero'] else ''}")
        lines.append(f"\nPer horizon step (mean {mv['loss_metric']}, "
                     f"{mv['per_step_common_origins']} common origins):")
        lines.append("| arm | h1 | h2 | h3 | h4 | h5 | h6 | h7 |")
        lines.append("|---|---|---|---|---|---|---|---|")
        for a, steps in mv["per_step_pooled"].items():
            cells = " | ".join(f"{s:.3f}" for s in steps) if steps else "–"
            lines.append(f"| {a} | {cells} |")
        lines.append("")

    lines.append("## Weather coverage (S6 G2)\n")
    lines.append(f"Horizon model {cov['horizon_model']}, leads 1..{cov['horizon_max_lead']}. "
                 "Per-cell per-lead non-null coverage:\n")
    for cell, leads in cov["horizon_coverage"].items():
        span = list(leads.values())[0]["span"] if leads else "-"
        nn = " ".join(f"L{k}={v['non_null']}/{v['rows']}" for k, v in leads.items())
        lines.append(f"- {cell} span {span}: {nn}")
    REPORT_PATH.write_text("\n".join(lines) + "\n")


def main(argv: list[str]) -> int:
    os.environ.setdefault("BRAIN_TORCH_DEVICE", "cpu")
    if "--smoke" in argv:
        assert_store_ceiling()
        n = 6
        payload = run(device="cpu", smoke=n)
        print(json.dumps({"smoke_origins": n, "wall_clock_s": payload["wall_clock_s"],
                          "fold_counts": payload["fold_counts"],
                          "skipped": payload["skipped_incomplete_weather"]}, indent=2))
        return 0
    if "--build" in argv:
        out = build()
        print(json.dumps({
            "fold_counts": out["vectors"]["fold_counts"],
            "reproduction": {v: {"N": r["N_vs_rung4_chronos2"].get("max_abs_delta"),
                                 "H": r["H_vs_rung4_chronos2_exo"].get("max_abs_delta")}
                             for v, r in out["vectors"]["reproduction"].items()},
            "sets": {v: mv.get("set_90") for v, mv in out["mcs"]["venues"].items()}},
            indent=2, default=str))
        return 0
    if not VECTORS_PATH.exists():
        print("no persisted vectors; run with --build first (needs Chronos-2)")
        return 1
    vectors = json.loads(VECTORS_PATH.read_text())
    mcs_out = json.loads(MCS_PATH.read_text())
    cov = json.loads(COVERAGE_PATH.read_text())
    render(vectors, mcs_out, cov)
    print(f"re-rendered {REPORT_PATH.name} from persisted JSON")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
