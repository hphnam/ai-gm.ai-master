"""S10 Part 2 - the paired comparison (spec `PRJ93_Remediation_S10_Injection_Realism.md`).

Both arms, same injections (same venue, kind, magnitude, direction, fold, onset), same
forecaster (the Rung-1 DOW-median + conformal detection baseline both arms share by
construction - see `eval.inject_realistic`'s module docstring for why that is the right
model to compare, not the served ladder). Both are scored through the SAME unchanged
`eval.agent_eval` machinery (`surface` / `item_covers` / `_score_injection` / `_clean`), so
the only thing that differs between a control record and its paired realistic record is
which stream constructor built the `Injection`.

Sampling is a stratified paired subsample, `TARGET_COUNTS` weighted toward `regime_shift`
(spec: at least 120 total, at least 60 `regime_shift`). Recall/precision get a
Clopper-Pearson interval (`eval.interval_calibration.clopper_pearson`, S7's implementation,
reused); the paired difference (control minus realistic) gets a bootstrap interval,
B=10000, resampling injections within a kind.

Run:
    python -m eval.injection_realism --build          # sample, pair, score, write the artefact
    python -m eval.injection_realism --control-check   # G4: does eval.agent_eval.run_scaled()
                                                        # still reproduce the committed corpus?
"""

from __future__ import annotations

import argparse
import json

import numpy as np

import config
from eval import agent_eval, inject, inject_realistic
from eval.inject_realistic import REALISTIC_VENUES
from eval.interval_calibration import clopper_pearson
from store.warehouse import connect

SAMPLE_SEED = 95
BOOTSTRAP_SEED = 96
BOOTSTRAP_B = 10000
TARGET_COUNTS = {"regime_shift": 64, "spike": 32, "exo_coincident": 24}
ONSET_POSITION = "early"          # see eval.inject_realistic's module docstring

ARTEFACT = config.STORE_DIR.parent / "eval" / "injection_realism.json"

# Committed corpus reference (log/09_Agent_Eval_Report.md, N=644, deterministic grid).
# G4 compares a fresh eval.agent_eval.run_scaled() against these, tolerating the drift a
# store ceiling that has advanced since the snapshot introduces (S5's G2 / S6's G3 pattern).
COMMITTED_N_INJECTIONS = 644
COMMITTED_OVERALL_RECALL = 0.803
COMMITTED_BY_KIND_RECALL = {"regime_shift": 0.996, "spike": 0.566,
                            "exo_coincident": 0.988, "stock_drawdown": 1.000}
CONTROL_REPRODUCTION_TOL = 0.03    # 3pp: comfortably inside every by-kind 95% CI reported


# --- Sampling ------------------------------------------------------------------

def _build_pool(kind: str, con) -> list[dict]:
    """Every (venue, fold, direction, magnitude) combination for `kind`, built through
    BOTH arms and kept only if both succeed (G2's occurrence guard, and the 21-day
    detection-window floor, silently exclude the rest - never a fabricated pair)."""
    pool = []
    for venue in REALISTIC_VENUES:
        stream = inject.base_stream(venue, con=con)
        folds = list(agent_eval._usable_folds(venue, stream, con))
        for fold_idx, (train, test) in enumerate(folds):
            window = (train, test)
            for direction in ("down", "up"):
                for z in config.EVAL_INJECT_Z_GRID:
                    pair = _try_build_pair(venue, kind, direction, z, stream, window, con)
                    if pair is not None:
                        pair["fold"] = fold_idx
                        pool.append(pair)
    return pool


def _try_build_pair(venue, kind, direction, z, stream, window, con) -> dict | None:
    kw = {"direction": direction, "stream": stream, "window": window}
    if kind == "regime_shift":
        kw.update(magnitude_z=z, onset=ONSET_POSITION)
        control_fn, real_fn = inject.inject_regime_shift, inject_realistic.inject_regime_shift
    elif kind == "spike":
        # Spike is exempt from the sustained-kind onset restriction (see
        # eval.inject_realistic's module docstring): it needs to sit within
        # signals.deviation's tail scan, not leave 21 days of runway, so it keeps the
        # committed corpus's own "mid" default here.
        kw.update(z=z, onset="mid")
        control_fn, real_fn = inject.inject_spike, inject_realistic.inject_spike
    else:
        kw.update(magnitude_z=z)
        control_fn, real_fn = inject.inject_exo_coincident, inject_realistic.inject_exo_coincident
    try:
        control = control_fn(venue, con, **kw)
        realistic_inj, refits = real_fn(venue, con, **kw)
    except (inject_realistic.OccurrenceViolation, ValueError):
        return None
    if control.truth[0].onset != realistic_inj.truth[0].onset:
        return None          # defensive: both arms must share the identical onset (G3)
    return {"venue": venue, "kind": kind, "direction": direction, "z": z,
            "control": control, "realistic": realistic_inj, "refits": refits,
            "stream": stream, "window": window}


def sample(con, seed: int = SAMPLE_SEED) -> dict:
    rng = np.random.default_rng(seed)
    sampled: dict[str, list[dict]] = {}
    pool_sizes: dict[str, int] = {}
    for kind, target in TARGET_COUNTS.items():
        pool = _build_pool(kind, con)
        pool_sizes[kind] = len(pool)
        take = min(target, len(pool))
        idx = rng.choice(len(pool), size=take, replace=False) if pool else np.array([], int)
        sampled[kind] = [pool[i] for i in idx]
    return {"sampled": sampled, "pool_sizes": pool_sizes, "seed": seed}


# --- Scoring (unchanged detection code: agent_eval.surface / item_covers) ------

def _score_pair(pair: dict, con, clean_cache: dict) -> dict:
    out = {}
    for arm in ("control", "realistic"):
        inj_s = pair[arm]
        key = (inj_s.venue, str(inj_s.as_of))
        if key not in clean_cache:
            clean_cache[key] = {it.item_key for it in agent_eval.surface(
                agent_eval._clean(inj_s, con), con)}
        rec = agent_eval._score_injection(inj_s, con, clean_cache[key])
        out[arm] = {"caught": bool(rec["caught"]), "attributable": int(rec["attributable"]),
                   "spurious": int(rec["spurious"]),
                   "delay": int(rec["delay"]) if rec["delay"] is not None else None}
    return out


def score_sample(sampled: dict, con) -> dict:
    clean_cache: dict = {}
    scored: dict[str, list[dict]] = {}
    for kind, pairs in sampled.items():
        rows = []
        for pair in pairs:
            rec = _score_pair(pair, con, clean_cache)
            refits = pair["refits"]
            window_refits = [r for r in refits
                             if r.date.date() > pair["control"].train_end]
            rows.append({"venue": pair["venue"], "direction": pair["direction"],
                        "z": pair["z"], "fold": pair["fold"],
                        "control": rec["control"], "realistic": rec["realistic"],
                        "changepoint_refits": sum(1 for r in window_refits
                                                  if r.trigger == "changepoint"),
                        "cadence_refits": sum(1 for r in window_refits
                                              if r.trigger == "cadence")})
        scored[kind] = rows
    return scored


# --- Statistics ------------------------------------------------------------

def _clopper(k: int, n: int) -> list[float]:
    lo, hi = clopper_pearson(k, n)
    return [lo, hi]


def _pooled_precision(attr: np.ndarray, spur: np.ndarray) -> float:
    total = float(attr.sum())
    return float((attr.sum() - spur.sum()) / total) if total > 0 else float("nan")


def _latency_stats(rows: list[dict], arm: str) -> dict:
    delays = [r[arm]["delay"] for r in rows if r[arm]["delay"] is not None]
    if not delays:
        return {"n": 0, "median": None, "q1": None, "q3": None}
    arr = np.array(delays, float)
    return {"n": len(delays), "median": float(np.median(arr)),
            "q1": float(np.percentile(arr, 25)), "q3": float(np.percentile(arr, 75))}


def _bootstrap_diffs(rows: list[dict], rng: np.random.Generator, B: int) -> dict:
    n = len(rows)
    caught_c = np.array([r["control"]["caught"] for r in rows], float)
    caught_r = np.array([r["realistic"]["caught"] for r in rows], float)
    attr_c = np.array([r["control"]["attributable"] for r in rows], float)
    spur_c = np.array([r["control"]["spurious"] for r in rows], float)
    attr_r = np.array([r["realistic"]["attributable"] for r in rows], float)
    spur_r = np.array([r["realistic"]["spurious"] for r in rows], float)

    idx = rng.integers(0, n, size=(B, n)) if n else np.zeros((B, 0), int)
    recall_c_b = caught_c[idx].mean(axis=1) if n else np.full(B, np.nan)
    recall_r_b = caught_r[idx].mean(axis=1) if n else np.full(B, np.nan)
    attr_c_b, spur_c_b = attr_c[idx].sum(axis=1), spur_c[idx].sum(axis=1)
    attr_r_b, spur_r_b = attr_r[idx].sum(axis=1), spur_r[idx].sum(axis=1)
    with np.errstate(invalid="ignore", divide="ignore"):
        prec_c_b = np.where(attr_c_b > 0, (attr_c_b - spur_c_b) / attr_c_b, np.nan)
        prec_r_b = np.where(attr_r_b > 0, (attr_r_b - spur_r_b) / attr_r_b, np.nan)

    def ci(diffs):
        lo, hi = np.nanpercentile(diffs, [2.5, 97.5])
        return [float(lo), float(hi)]

    return {
        "recall_diff": {"point": float(caught_c.mean() - caught_r.mean()) if n else None,
                        "ci": ci(recall_c_b - recall_r_b)},
        "precision_diff": {"point": float(_pooled_precision(attr_c, spur_c)
                                          - _pooled_precision(attr_r, spur_r)) if n else None,
                          "ci": ci(prec_c_b - prec_r_b)},
    }


def kind_stats(kind: str, rows: list[dict], rng: np.random.Generator) -> dict:
    n = len(rows)
    caught_c = sum(r["control"]["caught"] for r in rows)
    caught_r = sum(r["realistic"]["caught"] for r in rows)
    attr_c = np.array([r["control"]["attributable"] for r in rows], float)
    spur_c = np.array([r["control"]["spurious"] for r in rows], float)
    attr_r = np.array([r["realistic"]["attributable"] for r in rows], float)
    spur_r = np.array([r["realistic"]["spurious"] for r in rows], float)
    tp_c, tp_r = float(attr_c.sum() - spur_c.sum()), float(attr_r.sum() - spur_r.sum())

    cp_refit_pairs = sum(1 for r in rows if r["changepoint_refits"] > 0)
    return {
        "n": n,
        "control": {
            "recall": caught_c / n if n else None, "recall_ci": _clopper(caught_c, n) if n else None,
            "precision": _pooled_precision(attr_c, spur_c), "precision_ci": _clopper(int(tp_c), int(attr_c.sum())),
            "latency": _latency_stats(rows, "control"),
        },
        "realistic": {
            "recall": caught_r / n if n else None, "recall_ci": _clopper(caught_r, n) if n else None,
            "precision": _pooled_precision(attr_r, spur_r), "precision_ci": _clopper(int(tp_r), int(attr_r.sum())),
            "latency": _latency_stats(rows, "realistic"),
        },
        "paired_bootstrap": _bootstrap_diffs(rows, rng, BOOTSTRAP_B),
        "changepoint_triggered_refit_pairs": cp_refit_pairs,
        "changepoint_triggered_refit_rate": cp_refit_pairs / n if n else None,
    }


# --- The feedback loop (regime_shift + exo_coincident only) --------------------

def feedback_loop_summary(sampled: dict, con) -> dict:
    """How often the change-point-triggered refit fires, and whether it suppresses
    further detection of the event that triggered it, over the SAMPLED regime_shift and
    exo_coincident pairs specifically (their own fold/venue/direction/magnitude, not a
    freshly-resolved default window)."""
    fired = suppressed = checked = 0
    for kind in ("regime_shift", "exo_coincident"):
        for pair in sampled.get(kind, []):
            eff = inject_realistic.feedback_loop_effect(
                pair["venue"], con, kind=kind, direction=pair["direction"],
                magnitude_z=pair["z"], stream=pair["stream"], window=pair["window"],
                onset=ONSET_POSITION)
            checked += 1
            if eff["changepoint_refits"] > 0:
                fired += 1
                if eff["suppression_detected"]:
                    suppressed += 1
    return {"pairs_checked": checked, "changepoint_refit_fired": fired,
           "suppression_detected": suppressed}


def build(con=None) -> dict:
    own = con is None
    con = con or connect(read_only=True)
    try:
        samp = sample(con)
        scored = score_sample(samp["sampled"], con)
        rng = np.random.default_rng(BOOTSTRAP_SEED)
        stats = {kind: kind_stats(kind, rows, rng) for kind, rows in scored.items()}
        n_total = sum(len(rows) for rows in scored.values())
        fb = feedback_loop_summary(samp["sampled"], con)
        out = {
            "store_ceiling": config.EXPECTED_STORE_CEILING, "device": "cpu",
            "sample_seed": SAMPLE_SEED, "bootstrap_seed": BOOTSTRAP_SEED, "bootstrap_B": BOOTSTRAP_B,
            "onset_position": ONSET_POSITION, "target_counts": TARGET_COUNTS,
            "pool_sizes": samp["pool_sizes"], "n_total": n_total,
            "feedback_loop": fb,
            "stats": stats,
            "records": {kind: [{"venue": r["venue"], "direction": r["direction"], "z": r["z"],
                                "fold": r["fold"], "control": r["control"], "realistic": r["realistic"],
                                "changepoint_refits": r["changepoint_refits"],
                                "cadence_refits": r["cadence_refits"]}
                               for r in rows]
                       for kind, rows in scored.items()},
        }
        ARTEFACT.parent.mkdir(parents=True, exist_ok=True)
        ARTEFACT.write_text(json.dumps(out, indent=2, default=str))
        return out
    finally:
        if own:
            con.close()


# --- G4: does the committed corpus still reproduce? ----------------------------

def control_reproduction_check(con=None) -> dict:
    own = con is None
    con = con or connect(read_only=True)
    try:
        out = agent_eval.run_scaled(con)
    finally:
        if own:
            con.close()
    o = out["detection"]["overall"]
    by_kind = {k: c["recall"] for k, c in out["detection"]["by_kind"].items()}
    checks = {"n_injections": out["n_injections"],
             "overall_recall": o["recall"],
             "overall_within_tol": abs(o["recall"] - COMMITTED_OVERALL_RECALL) <= CONTROL_REPRODUCTION_TOL}
    for kind, committed in COMMITTED_BY_KIND_RECALL.items():
        fresh = by_kind.get(kind)
        checks[f"{kind}_recall"] = fresh
        checks[f"{kind}_within_tol"] = (fresh is not None
                                        and abs(fresh - committed) <= CONTROL_REPRODUCTION_TOL)
    checks["all_within_tol"] = all(v for k, v in checks.items() if k.endswith("_within_tol"))
    return checks


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--control-check", action="store_true")
    args = ap.parse_args()

    if args.control_check or not args.build:
        checks = control_reproduction_check()
        print("G4 · control-arm reproduction of the committed corpus")
        print(json.dumps(checks, indent=2))
        print(f"G4 RESULT: {'PASS' if checks['all_within_tol'] else 'FAIL'}")
    if args.build:
        out = build()
        print(f"S10 Part 2 · sampled {out['n_total']} paired injections "
              f"(pool sizes {out['pool_sizes']})")
        for kind, s in out["stats"].items():
            print(f"  {kind}: n={s['n']} control recall={s['control']['recall']} "
                  f"realistic recall={s['realistic']['recall']}")
        print(f"  artefact: {ARTEFACT}")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
