"""S5 G17f - multi-venue group in-context learning: the three-arm run, MCS, and calibration.

Three arms of the same Chronos-2 model, differing only in what shares the call:

  U   univariate, each venue on its own frame (the committed S2 baseline path)
  G2  beer_hall + ellel forecast together (cross-series in-context learning)
  G3  beer_hall + ellel + two_river_taps together, TRT carrying constructed
      post-closure zeros over the common window

The hypothesis (pre-registered here before the run, decision-log): group ICL most
plausibly helps Ellel, the sparse series with the most to gain from borrowing a rich one;
it may do nothing at Beer Hall, whose own history is long. No improvement anywhere is a
publishable negative result, reported at full prominence, not a failure.

The comparison instrument is the S3 Model Confidence Set on the per-fold loss vectors, per
venue, arms together, at 90 percent, with a moving-block paired bootstrap because
consecutive step-1 origins share six of seven days. Beer Hall and Two River Taps are scored
on MASE (basis calendar_lag7_active, the S4 decision); Ellel on unscaled MAE and RMSE only,
because S4's bootstrap found no defensible seasonal-naive basis at 1.2 trading days a week.

Every persisted artefact carries `store_ceiling` and `device`. The whole run is a function
of the store ceiling (a rolling-origin loss is), and of the device (float placement), so an
artefact without both is not reproducible.

Run (forecast venv, Chronos-2 present):
    .venv-forecast/bin/python -m eval.group_icl --calibrate   # device + batch calibration
    .venv-forecast/bin/python -m eval.group_icl --build       # the full three-arm run + MCS
    .venv-forecast/bin/python -m eval.group_icl               # re-render report from JSON
"""

from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass

import numpy as np
import pandas as pd

import config
from eval import fold_vectors, harness, mcs
from models.group_forecast import (
    HORIZON_DAYS,
    PanelOrigin,
    PanelSeries,
    group_predict,
    load_pipeline,
)
from store.warehouse import assert_store_ceiling

OUT_DIR = config.BRAIN_DIR / "eval"
VECTORS_PATH = OUT_DIR / "group_icl_L1.json"
MCS_PATH = OUT_DIR / "group_icl_mcs.json"
REPORT_PATH = OUT_DIR / "group_icl.md"

MIN_TRAIN_DAYS = 120
STEP_DAYS = 1
SEED = config.EVAL_SCALED_SEED       # 93, shared with the MCS and scaled-eval
# The paired-difference bootstrap draws from a DISTINCT seed so its resample is
# independent of the MCS resample (which reuses seed 93 at block 7); sharing the seed
# would make the two analyses' draws overlap and read as coupled in the write-up.
PAIRED_BOOTSTRAP_SEED = SEED + 1
BOOTSTRAP_B = 10000
BLOCK_LEN = mcs.BLOCK_LEN            # 7, the horizon-length block of report 44

G2_VENUES = ("beer_hall", "ellel")
G3_VENUES = ("beer_hall", "ellel", "two_river_taps")
CLOSURE_ZERO_VENUE = "two_river_taps"

# Basis + loss per venue (S4 / G4). Ellel gets no MASE; its loss is unscaled MAE.
# G2 lives in config, not here: this was one of two private copies that could
# drift apart. Aliased rather than renamed so the call sites read unchanged.
VENUE_BASIS = config.VENUE_SCALE_BASIS
VENUE_LOSS = config.VENUE_LOSS
# The arms each venue participates in.
VENUE_ARMS = {"beer_hall": ("U", "G2", "G3"),
              "ellel": ("U", "G2", "G3"),
              "two_river_taps": ("U", "G3")}


# --- Frames and origins ------------------------------------------------------

def venue_frame(venue: str) -> pd.DataFrame:
    """The active-trimmed daily (date, value) frame the committed ladder used."""
    from models.ladder import _load_feats

    f = _load_feats(venue)
    return f[["date", "value"]].reset_index(drop=True)


def venue_origins(frame: pd.DataFrame, *, min_train_days: int = MIN_TRAIN_DAYS,
                  horizon: int = HORIZON_DAYS) -> list[pd.Timestamp]:
    """Origin dates (train_end = test_start) matching harness.rolling_origin at step 1.

    A daily-complete frame makes this exact: an origin needs >= min_train_days of history
    and a full horizon ahead, so it is every date from index min_train_days-1 to
    len-horizon-1. This reproduces the committed 273/260/205 counts by construction.
    """
    dates = list(pd.to_datetime(frame["date"]))
    return dates[min_train_days - 1: len(dates) - horizon]


def _closure_zero_series(frame: pd.DataFrame, origin: pd.Timestamp) -> tuple[np.ndarray, np.ndarray]:
    """A closed venue's context at `origin`: real history then daily zeros to the origin.

    The store holds NO rows past the closure (verified), so these zeros are constructed,
    not observed. They are nonetheless the factually-correct revenue of a venue confirmed
    shut, and they keep the series gap-free (Chronos-2 requires regular timestamps).
    """
    real = frame[pd.to_datetime(frame["date"]) <= origin]
    dates = pd.date_range(pd.to_datetime(frame["date"]).min(), origin, freq="D")
    known = dict(zip(pd.to_datetime(real["date"]), real["value"].to_numpy(float)))
    values = np.array([known.get(d, 0.0) for d in dates], float)
    return dates.to_numpy(), values


def build_panels(frames: dict[str, pd.DataFrame], venues: tuple[str, ...],
                 origins: list[pd.Timestamp], *,
                 closure_zero_venue: str | None = None) -> list[PanelOrigin]:
    """Grouped forecast tasks: one PanelOrigin per origin, every venue truncated at t."""
    panels = []
    for t in origins:
        series = []
        for v in venues:
            fr = frames[v]
            if v == closure_zero_venue:
                d, vals = _closure_zero_series(fr, t)
            else:
                ctx = fr[pd.to_datetime(fr["date"]) <= t]
                d = pd.to_datetime(ctx["date"]).to_numpy()
                vals = ctx["value"].to_numpy(float)
            series.append(PanelSeries(venue=v, dates=d, values=vals))
        future = pd.date_range(t + pd.Timedelta(days=1), periods=HORIZON_DAYS, freq="D")
        panels.append(PanelOrigin(origin=t, future_dates=future.to_numpy(),
                                   series=tuple(series)))
    return panels


def _truth(frame: pd.DataFrame, origin: pd.Timestamp) -> np.ndarray | None:
    """A venue's actual values over the horizon after `origin`, or None if the window
    is not fully within the venue's real active span (a closed venue past its end)."""
    fut = pd.date_range(origin + pd.Timedelta(days=1), periods=HORIZON_DAYS, freq="D")
    fr = frame.set_index(pd.to_datetime(frame["date"]))
    if not all(d in fr.index for d in fut):
        return None
    return fr.loc[fut, "value"].to_numpy(float)


# --- Scoring -----------------------------------------------------------------

def _score(venue: str, y_true: np.ndarray, y_pred: np.ndarray,
           y_train: np.ndarray) -> dict:
    """MAE and RMSE always; MASE on the venue's basis only where the venue gets one."""
    row = {"mae": harness.mae(y_true, y_pred), "rmse": harness.rmse(y_true, y_pred)}
    basis = VENUE_BASIS[venue]
    if basis != "unscaled":
        row["mase"] = harness.mase(y_true, y_pred, y_train, basis=basis)
    return row


def _fold_vectors(venue: str, forecasts: dict[str, np.ndarray],
                  frames: dict[str, pd.DataFrame],
                  origins: list[pd.Timestamp]) -> dict:
    """Per-origin loss vectors for one venue+arm, indexed by origin date."""
    fr = frames[venue]
    keys, mase_v, mae_v, rmse_v = [], [], [], []
    for t in origins:
        key = t.date().isoformat()
        y_pred = forecasts.get(key)
        y_true = _truth(fr, t)
        if y_pred is None or y_true is None:
            continue
        y_train = fr[pd.to_datetime(fr["date"]) <= t]["value"].to_numpy(float)
        s = _score(venue, y_true, y_pred, y_train)
        # Drop a fold if ANY reported metric is non-finite, including the MASE of a
        # scored venue: a nan/inf reaching the allow_nan=False persist would abort the
        # whole run after the Chronos time was spent. Real revenue is not perfectly
        # lag-7 periodic so this is a guard, not an expected path.
        metrics = [s["mae"], s["rmse"]] + ([s["mase"]] if "mase" in s else [])
        if not all(np.isfinite(v) for v in metrics):
            continue
        keys.append(key)
        mae_v.append(s["mae"])
        rmse_v.append(s["rmse"])
        mase_v.append(s.get("mase", float("nan")))
    out = {"origin_keys": keys, "mae": mae_v, "rmse": rmse_v}
    if VENUE_BASIS[venue] != "unscaled":
        out["mase"] = mase_v
    return out


# --- Arms --------------------------------------------------------------------

def run_arms(pipe, device: str, *, origin_batch: int = 32) -> dict:
    """Run U, G2, G3 and return per-venue per-arm fold vectors, keyed by origin date."""
    frames = {v: venue_frame(v) for v in G3_VENUES}
    origins = {v: venue_origins(frames[v]) for v in G3_VENUES}
    group_origins = sorted(set(origins["beer_hall"]) & set(origins["ellel"]))

    # U: each venue univariate on its own origins (single-venue panels, no cross-learning).
    u_forecasts = {}
    for v in G3_VENUES:
        panels = build_panels(frames, (v,), origins[v])
        pred = group_predict(panels, cross_learning=False, pipe=pipe,
                             origin_batch=origin_batch)
        u_forecasts[v] = {k: d[v] for k, d in pred.items()}

    # G2 and G3: the venues grouped, cross-learning on, batch pinned to the group size.
    g2_panels = build_panels(frames, G2_VENUES, group_origins)
    g2_pred = group_predict(g2_panels, cross_learning=True, pipe=pipe,
                            origin_batch=origin_batch)
    g3_panels = build_panels(frames, G3_VENUES, group_origins,
                             closure_zero_venue=CLOSURE_ZERO_VENUE)
    g3_pred = group_predict(g3_panels, cross_learning=True, pipe=pipe,
                            origin_batch=origin_batch)

    def per_venue(pred, venue):
        return {k: d[venue] for k, d in pred.items() if venue in d}

    venues_out = {}
    for v in G3_VENUES:
        arms = {}
        if "U" in VENUE_ARMS[v]:
            arms["U"] = _fold_vectors(v, u_forecasts[v], frames, origins[v])
        if "G2" in VENUE_ARMS[v]:
            arms["G2"] = _fold_vectors(v, per_venue(g2_pred, v), frames, group_origins)
        if "G3" in VENUE_ARMS[v]:
            arms["G3"] = _fold_vectors(v, per_venue(g3_pred, v), frames, group_origins)
        venues_out[v] = {"basis": VENUE_BASIS[v], "loss_metric": VENUE_LOSS[v],
                         "arms": arms}

    return {
        "group_window": [group_origins[0].date().isoformat(),
                         group_origins[-1].date().isoformat()],
        "group_origin_count": len(group_origins),
        "venue_origin_counts": {v: len(origins[v]) for v in G3_VENUES},
        "venues": venues_out,
    }


# --- G2 reproduction of the committed univariate ladder ----------------------

def reproduce_committed(pipe, *, origin_batch: int = 32) -> dict:
    """G2: the refactored univariate arm reproduces the committed rung4_chronos2 vectors.

    Scores the univariate forecast on the committed basis (calendar_lag7, not the S5
    active basis) so the comparison is like-for-like with the persisted S2 numbers. Any
    drift beyond Chronos non-determinism (S2 measured <= 0.010) is a stop condition.
    """
    out = {}
    for v in G3_VENUES:
        fr = venue_frame(v)
        origins = venue_origins(fr)
        panels = build_panels({v: fr}, (v,), origins)
        pred = group_predict(panels, cross_learning=False, pipe=pipe,
                             origin_batch=origin_batch)
        # Map the committed chronos2 vector onto origin dates (committed fold_index ->
        # the fold's train_end, which IS the origin cutoff t), so the reproduction pairs
        # by date, never by position.
        committed_payload = fold_vectors.load(v)
        committed = committed_payload["rungs"]["rung4_chronos2"]
        folds = committed_payload["folds"]
        committed_by_date = {folds[i]["train_end"]: m
                             for i, m in zip(committed["fold_index"], committed["mase"])}
        mine, theirs = [], []
        for t in origins:
            key = t.date().isoformat()
            y_pred = pred[key][v]
            y_true = _truth(fr, t)
            if y_true is None:
                continue
            y_train = fr[pd.to_datetime(fr["date"]) <= t]["value"].to_numpy(float)
            # Pair on the basis the committed payload RECORDS, never a literal (see
            # `weather_basis._reproduce`): a fixed basis would compare two rulers.
            m = harness.mase(y_true, y_pred, y_train, basis=committed_payload["basis"])
            if key in committed_by_date and np.isfinite(m):
                mine.append(m)
                theirs.append(committed_by_date[key])
        mine_a, theirs_a = np.array(mine), np.array(theirs)
        out[v] = {
            "n_paired": int(mine_a.size),
            "mean_mase_reproduced": float(mine_a.mean()),
            "mean_mase_committed": float(theirs_a.mean()),
            "mean_abs_delta": float(np.mean(np.abs(mine_a - theirs_a))),
            "max_abs_delta": float(np.max(np.abs(mine_a - theirs_a))),
        }
    return out


# --- Model Confidence Set over the arms --------------------------------------

def _loss_matrix(venue_block: dict, venue: str) -> tuple[list[str], list[str], np.ndarray]:
    """Aligned (arms, common_origin_keys, L[T,M]) for a venue's arms on the loss metric."""
    metric = VENUE_LOSS[venue]
    arms = [a for a in VENUE_ARMS[venue] if a in venue_block["arms"]]
    per_arm = {a: dict(zip(venue_block["arms"][a]["origin_keys"],
                           venue_block["arms"][a][metric])) for a in arms}
    common = sorted(set.intersection(*(set(d) for d in per_arm.values())))
    L = np.array([[per_arm[a][k] for a in arms] for k in common], float)
    return arms, common, L


def _paired_bootstrap(L: np.ndarray, arms: list[str], *, b: int, block_len: int,
                      seed: int) -> list[dict]:
    """Moving-block paired bootstrap of every arm-pair mean loss difference.

    One index draw per replication is applied to both arms, so the strong cross-arm
    correlation shrinks the variance (the S3 argument) instead of being resampled away.
    """
    T = L.shape[0]
    rng = np.random.default_rng(seed)
    resample = mcs.moving_block_indices(T, block_len, b, rng)   # (B, T)
    boot = L[resample].mean(axis=1)                            # (B, M)
    full = L.mean(axis=0)
    out = []
    for i in range(len(arms)):
        for j in range(i + 1, len(arms)):
            d = boot[:, i] - boot[:, j]
            out.append({
                "pair": f"{arms[i]}-{arms[j]}",
                "mean_delta": float(full[i] - full[j]),
                "ci_lo": float(np.quantile(d, 0.05)),
                "ci_hi": float(np.quantile(d, 0.95)),
                "excludes_zero": bool(np.quantile(d, 0.05) > 0 or np.quantile(d, 0.95) < 0),
            })
    return out


def run_mcs(vectors: dict) -> dict:
    """The 90 percent MCS + paired bootstrap per venue, over that venue's arms."""
    out = {"seed": SEED, "paired_bootstrap_seed": PAIRED_BOOTSTRAP_SEED,
           "block_len": BLOCK_LEN, "n_boot": BOOTSTRAP_B,
           "bootstrap_b_note": "n_boot is the paired-CI B; the MCS uses mcs.N_BOOT at seed",
           "venues": {}}
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
        }
    return out


# --- Device + batch calibration ----------------------------------------------

def calibrate(*, n_origins: int = 20, batch_sizes=(1, 8, 32),
              devices=("cpu", "mps")) -> dict:
    """G3b: time CPU vs MPS at three origin-batch sizes, and prove batched == unbatched.

    Runs the univariate arm (the report-24 regime, where batching origins genuinely packs
    forward passes) and the grouped G2 arm (dispatch-bound), so the report can say whether
    report 24's CPU win generalises from univariate to grouped and batched calls. Equality
    is checked on the real model: a batched forecast must match the unbatched one to within
    Chronos non-determinism, else batching is changing a number, not just its cost.
    """
    import torch

    frames = {v: venue_frame(v) for v in G2_VENUES}
    origins = {v: venue_origins(frames[v]) for v in G2_VENUES}
    group_origins = sorted(set(origins["beer_hall"]) & set(origins["ellel"]))[-n_origins:]
    uni_panels = build_panels(frames, ("beer_hall",),
                              origins["beer_hall"][-n_origins:])
    grp_panels = build_panels(frames, G2_VENUES, group_origins)

    results = {"n_origins": n_origins, "batch_sizes": list(batch_sizes),
               "timings": [], "equality": []}
    for dev in devices:
        if dev == "mps" and not torch.backends.mps.is_available():
            results["timings"].append({"device": dev, "skipped": "mps unavailable"})
            continue
        pipe, resolved = load_pipeline(dev)
        for arm, panels, cl in (("U", uni_panels, False), ("G2", grp_panels, True)):
            base = None
            for bs in batch_sizes:
                t0 = time.time()
                pred = group_predict(panels, cross_learning=cl, pipe=pipe, origin_batch=bs)
                dt = time.time() - t0
                results["timings"].append({"device": resolved, "arm": arm,
                                           "batch": bs, "seconds": round(dt, 3)})
                flat = np.concatenate([pred[k][v] for k in sorted(pred)
                                       for v in sorted(pred[k])])
                if base is None:
                    base = flat
                else:
                    results["equality"].append({
                        "device": resolved, "arm": arm, "batch_vs_1": bs,
                        "max_abs_delta": float(np.max(np.abs(flat - base)))})
    return results


# --- Persistence + rendering -------------------------------------------------

def build(*, device: str | None = None, origin_batch: int = 32) -> dict:
    """The full S5 run: reproduce the committed ladder, run the arms, compute the MCS."""
    ceiling = assert_store_ceiling()
    pipe, resolved = load_pipeline(device)
    started = time.time()
    reproduction = reproduce_committed(pipe, origin_batch=origin_batch)
    arms = run_arms(pipe, resolved, origin_batch=origin_batch)
    payload = {
        "schema_version": 1,
        "store_ceiling": ceiling,
        "device": resolved,
        "horizon_days": HORIZON_DAYS,
        "min_train_days": MIN_TRAIN_DAYS,
        "step_days": STEP_DAYS,
        "seed": SEED,
        "model": "chronos2 (plain, no covariates)",
        "chronos_non_determinism_tolerance": 0.010,
        "reproduction_committed": reproduction,
        "wall_clock_s": round(time.time() - started, 1),
        **arms,
    }
    VECTORS_PATH.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n")
    mcs_out = run_mcs(payload)
    mcs_out["store_ceiling"] = ceiling
    mcs_out["device"] = resolved
    MCS_PATH.write_text(json.dumps(mcs_out, indent=2, allow_nan=False) + "\n")
    render(payload, mcs_out)
    return {"vectors": payload, "mcs": mcs_out}


def render(vectors: dict, mcs_out: dict) -> None:
    lines = [
        "# S5 G17f - group in-context learning: three-arm run and MCS\n",
        f"Store ceiling {vectors['store_ceiling']}; device {vectors['device']}; "
        f"model {vectors['model']}; seed {vectors['seed']}; "
        f"wall-clock {vectors['wall_clock_s']}s.\n",
        f"Group window {vectors['group_window'][0]} to {vectors['group_window'][1]}, "
        f"**{vectors['group_origin_count']} aligned origins** (G2 and G3). "
        f"Univariate origin counts: "
        + ", ".join(f"{v} {n}" for v, n in vectors['venue_origin_counts'].items()) + ".\n",
        "## G2 - univariate reproduces the committed ladder (basis calendar_lag7)\n",
        "| venue | n | reproduced mean MASE | committed mean MASE | max abs delta |",
        "|---|---|---|---|---|",
    ]
    for v, r in vectors["reproduction_committed"].items():
        lines.append(f"| {v} | {r['n_paired']} | {r['mean_mase_reproduced']:.4f} | "
                     f"{r['mean_mase_committed']:.4f} | {r['max_abs_delta']:.4f} |")
    lines.append("\n## The arms, by venue (90% Model Confidence Set)\n")
    for venue, mv in mcs_out["venues"].items():
        if "note" in mv:
            lines.append(f"### {venue}\n{mv['note']} (arms {mv['arms']}).\n")
            continue
        lines += [
            f"### {venue} (loss {mv['loss_metric']}, basis {mv['basis']}, "
            f"n_folds {mv['n_folds']})\n",
            "| arm | mean loss | MCS p-value | in 90% set |", "|---|---|---|---|"]
        for a in mv["arms"]:
            lines.append(f"| {a} | {mv['mean_loss'][a]:.4f} | {mv['mcs_pvalue'][a]:.3f} "
                         f"| {'yes' if a in mv['set_90'] else 'no'} |")
        lines.append(f"\n90% set: {mv['set_90']}. Paired bootstrap "
                     f"(block {mcs_out['block_len']}, B {mcs_out['n_boot']}):")
        for p in mv["paired_bootstrap"]:
            lines.append(f"- {p['pair']}: mean delta {p['mean_delta']:+.4f}, "
                         f"90% CI [{p['ci_lo']:+.4f}, {p['ci_hi']:+.4f}]"
                         f"{' (excludes 0)' if p['excludes_zero'] else ''}")
        lines.append("")
    REPORT_PATH.write_text("\n".join(lines) + "\n")


def main(argv: list[str]) -> int:
    if "--calibrate" in argv:
        assert_store_ceiling()
        result = calibrate()
        # allow_nan=False so a non-finite equality delta (the batched==unbatched check
        # this file exists to prove) fails loud rather than persisting an invalid token.
        (OUT_DIR / "group_icl_calibration.json").write_text(
            json.dumps(result, indent=2, allow_nan=False) + "\n")
        print(json.dumps(result, indent=2))
        return 0
    if "--build" in argv:
        out = build()
        print(json.dumps({"group_origins": out["vectors"]["group_origin_count"],
                          "reproduction": out["vectors"]["reproduction_committed"],
                          "sets": {v: mv.get("set_90")
                                   for v, mv in out["mcs"]["venues"].items()}},
                         indent=2, default=str))
        return 0
    if not VECTORS_PATH.exists():
        print("no persisted vectors; run with --build first (needs Chronos-2)")
        return 1
    vectors = json.loads(VECTORS_PATH.read_text())
    mcs_out = json.loads(MCS_PATH.read_text())
    render(vectors, mcs_out)
    print(f"re-rendered {REPORT_PATH.name} from persisted JSON")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
