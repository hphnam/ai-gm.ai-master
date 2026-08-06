"""S7 G17h - interval calibration: powered coverage, per-step bands, and the adaptive methods.

Measures the conformal band where there is power to measure it (the S2 step-1 rolling origins,
roughly 1,900 interval-observation pairs at Beer Hall, not a seven-day confrontation window) and
compares five banding methods on the SAME point forecasts:

  P  plain pooled split conformal (the pooled default)
  D  Mondrian, grouped by active vs structural-zero day (the served band variant)
  S  per-step calibration (a separate quantile per horizon step)
  A  per-step ACI (Gibbs and Candes 2021) at the best learning rate from a reported sweep
  G  per-step AgACI (Zaffran et al. 2022), aggregating ACI experts over the rate grid

The point forecaster is the band's current default (`conformal.wrap.default_model`, ETS here),
held fixed across arms so the comparison is about the banding METHOD, not the point model. The
primary metric is the Winkler score (proper, in the units of the data, so Ellel is scored on the
same footing as the other two venues); coverage and width are reported beside it, never instead.
The band uses only residuals whose target date has been observed by the origin (leak-free on
overlapping step-1 origins), and the online methods update their effective level with the
matching lag (a step-h interval's outcome is observed h days later).

Run (no Chronos needed, the band wraps ETS):
    .venv/bin/python -m eval.interval_calibration --build
    .venv/bin/python -m eval.interval_calibration            # re-render from JSON
"""

from __future__ import annotations

import json
import sys
import time

import numpy as np
import pandas as pd
from scipy import stats

import config
import org_profile
import provenance
from conformal.methods import (
    ACI,
    AgACI,
    HORIZON,
    interval_pinball,
    mondrian_band,
    perstep_band,
    plain_band,
)
from conformal.wrap import default_model, _predictor
from eval import harness, mcs
from features.build_features import feature_columns
from models.ladder import _load_feats
from store.warehouse import assert_store_ceiling

OUT_DIR = config.BRAIN_DIR / "eval"
VECTORS_PATH = OUT_DIR / "interval_calibration_L1.json"
MCS_PATH = OUT_DIR / "interval_calibration_mcs.json"
POWER_PATH = OUT_DIR / "interval_calibration_power.json"
REPORT_PATH = OUT_DIR / "interval_calibration.md"

VENUES = ("beer_hall", "ellel", "two_river_taps")
LEVELS = tuple(config.CONFORMAL_LEVELS)          # (0.80, 0.90)
PRIMARY_LEVEL = 0.90                              # the Winkler/MCS comparison level
MIN_TRAIN_DAYS = 120
WARMUP_POOL = 140                                # ~20 residuals per step before banding
ACI_GAMMAS = (0.005, 0.01, 0.02, 0.05, 0.1)
SEED = config.EVAL_SCALED_SEED                   # 93
PAIRED_BOOTSTRAP_SEED = SEED + 1
BOOTSTRAP_B = 10000
BLOCK_LEN = mcs.BLOCK_LEN                         # 7
INCUMBENT = "D"                                   # the served Mondrian band
STATIC_ARMS = ("P", "D", "S")


# --- Clopper-Pearson --------------------------------------------------------

def clopper_pearson(k: int, n: int, alpha: float = 0.05) -> tuple[float, float]:
    """Exact binomial confidence interval on a coverage estimate k/n."""
    if n == 0:
        return float("nan"), float("nan")
    lo = 0.0 if k == 0 else float(stats.beta.ppf(alpha / 2, k, n - k + 1))
    hi = 1.0 if k == n else float(stats.beta.ppf(1 - alpha / 2, k + 1, n - k))
    return lo, hi


# --- Point forecasts + residuals --------------------------------------------

def generate_records(venue: str, model: str | None = None) -> pd.DataFrame:
    """Step-1 rolling-origin forecasts of the band's point model. One row per (origin, step)
    with the target date, actual, forecast, absolute residual, and active/zero state.

    `model` overrides the point forecaster; None uses `default_model` (ETS, wrap.py's default
    and coverage-gate reference). The served-model check passes the ladder winner."""
    feats = _load_feats(venue)
    cols = feature_columns(feats)
    fn = _predictor(model or default_model(venue), venue)
    zero_dow = org_profile.structural_zero_dow(venue)
    folds = list(harness.rolling_origin(
        feats, n_folds=None, horizon_days=HORIZON, min_train_days=MIN_TRAIN_DAYS,
        step_days=1))
    rows = []
    for tr, te in folds:
        origin = tr["date"].max()
        preds = fn(tr, te, cols)
        te = te.reset_index(drop=True)
        for h, (_, r) in enumerate(te.iterrows(), start=1):
            y = float(r["value"])
            yhat = float(preds[h - 1])
            rows.append({"origin": origin, "step": h, "target": r["date"],
                         "y": y, "yhat": yhat, "res": abs(y - yhat),
                         "state": int(r["date"].dayofweek in zero_dow)})
    return pd.DataFrame(rows)


# --- The online leak-free pass ----------------------------------------------

def run_online(records: pd.DataFrame, level: float, *, gammas=ACI_GAMMAS,
               warmup: int = WARMUP_POOL) -> dict[str, pd.DataFrame]:
    """One leak-free EnbPI-style pass. Returns {arm: banded rows}. The pool holds residuals
    whose target date is observed by the origin; the online arms update per step with the lag
    h at which that step's outcome is revealed."""
    actual_by_date = dict(zip(records["target"], records["y"]))
    by_origin = {o: g.sort_values("step") for o, g in records.groupby("origin")}
    res_by_target: dict = {}
    for _, r in records.iterrows():
        res_by_target.setdefault(r["target"], []).append(
            (int(r["step"]), float(r["res"]), int(r["state"])))
    origins = sorted(by_origin)

    acis = {g: ACI(level, g) for g in gammas}
    agaci = AgACI(level, gammas)
    aci_keys = {g: f"A@{g}" for g in gammas}
    online = list(aci_keys.values()) + ["G"]
    pending = {k: {h: {} for h in range(1, HORIZON + 1)} for k in online}
    banded: dict[str, list] = {k: [] for k in (*STATIC_ARMS, *aci_keys.values(), "G")}

    pool_res: list[float] = []
    pool_step: list[int] = []
    pool_state: list[int] = []
    sorted_targets = sorted(res_by_target)
    tptr = 0

    def _record(arm, rows_df, lo, hi):
        for i in range(len(rows_df)):
            r = rows_df.iloc[i]
            banded[arm].append({"origin": r["origin"], "step": int(r["step"]),
                                 "target": r["target"], "y": float(r["y"]),
                                 "lo": float(lo[i]), "hi": float(hi[i]),
                                 "state": int(r["state"])})

    for t in origins:
        y_t = actual_by_date.get(t)
        # 1. lagged online updates: step-h intervals whose target is now t (observed).
        if y_t is not None:
            for g, aci in acis.items():
                for h in range(1, HORIZON + 1):
                    memo = pending[aci_keys[g]][h].pop(t, None)
                    if memo is not None:
                        aci.update_step(h, y_t, memo[0], memo[1])
            for h in range(1, HORIZON + 1):
                memo = pending["G"][h].pop(t, None)
                if memo is not None:
                    agaci.update_step(h, y_t, *memo)
        # 2. advance the pool to every residual whose target date is <= t.
        while tptr < len(sorted_targets) and sorted_targets[tptr] <= t:
            for st, rs, stt in res_by_target[sorted_targets[tptr]]:
                pool_res.append(rs)
                pool_step.append(st)
                pool_state.append(stt)
            tptr += 1
        # 3. band origin t once the pool is warm.
        if len(pool_res) < warmup:
            continue
        g_rows = by_origin[t]
        steps = g_rows["step"].to_numpy(int)
        yhat = g_rows["yhat"].to_numpy(float)
        states = g_rows["state"].to_numpy(int)
        targets = g_rows["target"].tolist()
        pr = np.asarray(pool_res)
        ps = np.asarray(pool_step)
        pst = np.asarray(pool_state)

        lo, hi = plain_band(level, pr, yhat)
        _record("P", g_rows, lo, hi)
        lo, hi = mondrian_band(level, pr, pst, yhat, states)
        _record("D", g_rows, lo, hi)
        lo, hi = perstep_band(level, pr, ps, yhat, steps)
        _record("S", g_rows, lo, hi)
        for g, aci in acis.items():
            lo, hi = aci.band(pr, ps, yhat, steps)
            _record(aci_keys[g], g_rows, lo, hi)
            for i, h in enumerate(steps):
                pending[aci_keys[g]][int(h)][targets[i]] = (lo[i], hi[i])
        lo, hi = agaci.band(pr, ps, yhat, steps)
        _record("G", g_rows, lo, hi)
        for i, h in enumerate(steps):
            los, his, lo_pred, hi_pred = agaci.last_experts[int(h)]
            pending["G"][int(h)][targets[i]] = (los.copy(), his.copy(), lo_pred, hi_pred)

    out = {k: pd.DataFrame(v) for k, v in banded.items()}
    out["_clamps"] = {aci_keys[g]: acis[g].clamps for g in gammas}
    out["_clamps"]["G"] = agaci.clamps
    return out


# --- Metrics ----------------------------------------------------------------

def _cov_ci(mask: np.ndarray) -> dict:
    n = int(mask.size)
    k = int(mask.sum())
    lo, hi = clopper_pearson(k, n)
    return {"n": n, "coverage": (k / n if n else float("nan")),
            "cp_lo": lo, "cp_hi": hi}


def arm_metrics(banded: pd.DataFrame, level: float) -> dict:
    y = banded["y"].to_numpy(float)
    lo = banded["lo"].to_numpy(float)
    hi = banded["hi"].to_numpy(float)
    covered = (y >= lo) & (y <= hi)
    step = banded["step"].to_numpy(int)
    state = banded["state"].to_numpy(int)
    out = {
        "n_pairs": int(len(banded)),
        "marginal": _cov_ci(covered),
        "mean_width": harness.mean_width(lo, hi),
        "winkler": harness.winkler(y, lo, hi, level),
        # Keys are strings, not ints: `render` runs both on this dict in-process and on
        # its JSON round-trip (which stringifies keys), and the two must index alike.
        "per_step": {str(h): {**_cov_ci(covered[step == h]),
                              "mean_width": harness.mean_width(lo[step == h], hi[step == h]),
                              "winkler": harness.winkler(y[step == h], lo[step == h],
                                                         hi[step == h], level)}
                     for h in range(1, HORIZON + 1)},
        "per_state": {int(s): _cov_ci(covered[state == s]) for s in np.unique(state)},
    }
    return out


def per_origin_winkler(banded: pd.DataFrame, level: float) -> dict:
    """Mean Winkler over a fold's (origin's) seven steps, keyed by origin date (the MCS unit)."""
    out = {}
    for o, g in banded.groupby("origin"):
        w = harness.winkler(g["y"].to_numpy(float), g["lo"].to_numpy(float),
                            g["hi"].to_numpy(float), level)
        out[pd.Timestamp(o).date().isoformat()] = float(w)
    return out


# --- MCS over the five arms -------------------------------------------------

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


def run_mcs(winkler_by_arm: dict[str, dict], venue: str) -> dict:
    arms = [a for a in ("P", "D", "S", "A", "G") if a in winkler_by_arm]
    common = sorted(set.intersection(*(set(winkler_by_arm[a]) for a in arms)))
    L = np.array([[winkler_by_arm[a][k] for a in arms] for k in common], float)
    res = mcs.model_confidence_set(arms, L, metric="winkler", block_len=BLOCK_LEN,
                                   n_boot=mcs.N_BOOT, seed=SEED)
    boot = _paired_bootstrap(L, arms, b=BOOTSTRAP_B, block_len=BLOCK_LEN,
                             seed=PAIRED_BOOTSTRAP_SEED)
    set_90 = res.set_at(0.10)
    incumbent_mean = res.mean_loss[INCUMBENT]
    candidates = [a for a in arms if a != INCUMBENT and a in set_90
                  and res.mean_loss[a] < incumbent_mean]
    return {"venue": venue, "n_folds": int(L.shape[0]), "arms": arms,
            "mean_winkler": {a: res.mean_loss[a] for a in arms},
            "mcs_pvalue": {a: res.mcs_pvalue[a] for a in arms},
            "set_90": set_90, "set_75": res.set_at(0.25),
            "incumbent": INCUMBENT, "adoption_candidates": candidates,
            "paired_bootstrap": boot}


# --- Part 1: the Major 9 power analysis -------------------------------------

def score_ties(scores: np.ndarray) -> dict:
    """Diagnostic for the condition the conformal UPPER bound rests on.

    Angelopoulos & Bates state it twice: Theorem D.2 holds only "if the scores s_1, ..., s_n
    have a continuous joint distribution", and in the preamble, "the upper bound only holds
    when the distribution of the conformal score is continuous, avoiding ties." Their remedy
    -- "the user can always add a vanishing amount of random noise to the score" -- addresses
    INCIDENTAL ties. It does not address an atom: on a venue whose trading week is mostly
    structural closures the residual is exactly zero on most calibration days, so the score
    distribution has a point mass and no vanishing noise recovers continuity.

    Reported, never silently applied. `holds` is the paper's literal condition; `atom_mass`
    is how badly it fails, so a reader can judge rather than take a boolean.
    """
    s = np.asarray(scores, dtype=float)
    s = s[np.isfinite(s)]
    n = int(s.size)
    if n == 0:
        return {"n": 0, "n_distinct": 0, "tie_fraction": None, "atom_mass": None,
                "holds": False, "note": "no finite scores"}
    vals, counts = np.unique(s, return_counts=True)
    n_distinct = int(vals.size)
    return {
        "n": n,
        "n_distinct": n_distinct,
        # share of scores that do NOT hold a value uniquely
        "tie_fraction": float((n - n_distinct) / n),
        # mass of the single largest atom -- the quantity that breaks continuity
        "atom_mass": float(counts.max() / n),
        "atom_value": float(vals[int(np.argmax(counts))]),
        "holds": bool(n_distinct == n),
    }


def power_analysis(*, n: int = 7, level: float = PRIMARY_LEVEL, coverage: float = 1.0,
                   calib_sizes: dict | None = None, calib_ties: dict | None = None) -> dict:
    k = int(round(coverage * n))
    p_all_in = level ** n
    cp_lo, cp_hi = clopper_pearson(k, n)
    out = {
        "source": "C2 confrontation (reports 31/35): BH L1 7-day held-out window, "
                  "8-14 July, all 7 points in the 90% band -> coverage 1.00",
        "n_pairs": n, "coverage": coverage, "nominal": level,
        "p_all_in_if_calibrated": p_all_in,
        "clopper_pearson_95": [cp_lo, cp_hi],
        "supports_miscalibration": bool(cp_lo > level or cp_hi < level),
        "verdict": ("1.00 on 7 points does NOT support a miscalibration claim: under perfect "
                    f"90% calibration all 7 fall inside with probability {p_all_in:.3f}, and the "
                    f"95% Clopper-Pearson interval on the estimate is [{cp_lo:.3f}, {cp_hi:.3f}], "
                    "which contains the nominal 0.90."),
    }
    if calib_sizes:
        ties = calib_ties or {}
        ab = {}
        for v, nc in calib_sizes.items():
            t = ties.get(v)
            entry = {"n_calib": nc, "upper_bound": level + 1.0 / (nc + 1)}
            if t is not None:
                entry["score_ties"] = t
                # The bound is quoted only where the condition it rests on is met.
                entry["upper_bound_valid"] = bool(t["holds"])
            ab[v] = entry
        out["angelopoulos_bates"] = ab
    return out


# --- Build ------------------------------------------------------------------

def build() -> dict:
    ceiling = assert_store_ceiling()
    started = time.time()
    venues_out = {}
    mcs_out = {}
    calib_sizes = {}
    calib_ties = {}
    for venue in VENUES:
        records = generate_records(venue)
        n_origins = records["origin"].nunique()
        calib = records[records["target"] <= records["origin"].max()]
        calib_sizes[venue] = int(len(calib))
        # `res` IS the conformity score: the absolute residual the quantile is taken over.
        calib_ties[venue] = score_ties(calib["res"].to_numpy())

        per_level = {}
        winkler_primary = {}
        gamma_sweep = {}
        for level in LEVELS:
            arms_raw = run_online(records, level)
            clamps = arms_raw.pop("_clamps")
            # ACI gamma sweep on the primary level: pick the best gamma by mean Winkler.
            sweep = {f"A@{g}": arm_metrics(arms_raw[f"A@{g}"], level)["winkler"]
                     for g in ACI_GAMMAS}
            best_key = min(sweep, key=sweep.get)
            # Assemble the five named arms; A = best-gamma ACI.
            named = {"P": arms_raw["P"], "D": arms_raw["D"], "S": arms_raw["S"],
                     "A": arms_raw[best_key], "G": arms_raw["G"]}
            metrics = {a: arm_metrics(named[a], level) for a in named}
            per_level[str(level)] = {
                "metrics": metrics,
                "aci_best_gamma": float(best_key.split("@")[1]),
                "aci_gamma_sweep_winkler": {g.split("@")[1]: sweep[g] for g in sweep},
                "clamps": {"A": clamps[best_key], "G": clamps["G"]},
            }
            if level == PRIMARY_LEVEL:
                for a in named:
                    winkler_primary[a] = per_origin_winkler(named[a], level)
                gamma_sweep = per_level[str(level)]["aci_gamma_sweep_winkler"]

        venues_out[venue] = {
            "n_origins": int(n_origins),
            "point_model": default_model(venue),
            "agaci_aggregation": "BOA (Wintenberger 2017), per bound, no tuned rate",
            "per_level": per_level,
            "aci_gamma_sweep": gamma_sweep,
        }
        mcs_out[venue] = run_mcs(winkler_primary, venue)

    power = power_analysis(calib_sizes=calib_sizes, calib_ties=calib_ties)

    payload = {
        "schema_version": 1, "store_ceiling": ceiling, "device": "cpu",
        "levels": list(LEVELS), "primary_level": PRIMARY_LEVEL,
        "horizon_days": HORIZON, "min_train_days": MIN_TRAIN_DAYS,
        "warmup_pool": WARMUP_POOL, "aci_gammas": list(ACI_GAMMAS), "seed": SEED,
        "method": "split conformal on step-1 rolling origins; ETS point model",
        "wall_clock_s": round(time.time() - started, 1),
        "provenance": provenance.runtime_stamp(),
        "venues": venues_out,
    }
    VECTORS_PATH.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n")
    # The MCS and power artefacts are quoted independently of the vector file -- `tab:mcs`
    # and `tab:coverage` read them without ever opening `interval_calibration_L1.json` --
    # so each carries its own identity rather than inheriting one nobody looks up.
    mcs_payload = {"store_ceiling": ceiling, "device": "cpu",
                   "primary_level": PRIMARY_LEVEL, "seed": SEED,
                   "paired_bootstrap_seed": PAIRED_BOOTSTRAP_SEED,
                   "block_len": BLOCK_LEN, "n_boot": BOOTSTRAP_B,
                   "incumbent": INCUMBENT,
                   "provenance": payload["provenance"], "venues": mcs_out}
    MCS_PATH.write_text(json.dumps(mcs_payload, indent=2, allow_nan=False) + "\n")
    power["store_ceiling"] = ceiling
    power["provenance"] = payload["provenance"]
    POWER_PATH.write_text(json.dumps(power, indent=2, allow_nan=False) + "\n")
    render(payload, mcs_payload, power)
    return {"vectors": payload, "mcs": mcs_payload, "power": power}


# --- Rendering --------------------------------------------------------------

def render(vectors: dict, mcs_out: dict, power: dict) -> None:
    lvl = str(PRIMARY_LEVEL)
    lines = [
        "# S7 G17h - interval calibration: powered coverage, per-step bands, adaptive methods\n",
        f"Store ceiling {vectors['store_ceiling']}; device {vectors['device']}; "
        f"seed {vectors['seed']}; primary level {PRIMARY_LEVEL}; "
        f"wall-clock {vectors['wall_clock_s']}s.\n",
        "## Part 1: the 1.00 coverage claim, restated with power\n",
        f"{power['source']}.\n",
        f"- n = {power['n_pairs']} interval-observation pairs.",
        f"- P(all {power['n_pairs']} inside | perfectly calibrated at "
        f"{power['nominal']:.0%}) = {power['p_all_in_if_calibrated']:.3f}.",
        f"- 95% Clopper-Pearson interval on the 1.00 estimate: "
        f"[{power['clopper_pearson_95'][0]:.3f}, {power['clopper_pearson_95'][1]:.3f}].",
        f"- Supports miscalibration: **{power['supports_miscalibration']}**. {power['verdict']}\n",
    ]
    if "angelopoulos_bates" in power:
        lines.append("Angelopoulos-Bates upper bound on expected coverage "
                     "(nominal + 1/(n_calib+1)). Theorem D.2 holds only if the conformity "
                     "scores have a continuous joint distribution, so the bound is quoted "
                     "only where the calibration scores are distinct:")
        for v, ab in power["angelopoulos_bates"].items():
            t = ab.get("score_ties")
            if t is None:
                lines.append(f"- {v}: n_calib {ab['n_calib']}, bound {ab['upper_bound']:.4f}")
                continue
            if ab.get("upper_bound_valid"):
                lines.append(
                    f"- {v}: n_calib {ab['n_calib']}, bound {ab['upper_bound']:.4f} "
                    f"(scores distinct: {t['n_distinct']}/{t['n']})")
            else:
                lines.append(
                    f"- {v}: n_calib {ab['n_calib']}, **upper bound NOT AVAILABLE** - "
                    f"the score distribution is not continuous "
                    f"({t['n_distinct']}/{t['n']} distinct; tie fraction "
                    f"{t['tie_fraction']:.3f}; largest atom {t['atom_mass']:.3f} of the mass "
                    f"at score {t['atom_value']:.4g}). "
                    f"The unquotable value would have been {ab['upper_bound']:.4f}. "
                    "The lower bound is unaffected: it requires no continuity.")
        lines.append("")

    lines.append("## Part 2 and 4: five-arm comparison at the primary level\n")
    for venue, mv in mcs_out["venues"].items():
        vv = vectors["venues"][venue]
        m = vv["per_level"][lvl]["metrics"]
        lines += [f"### {venue} (point model {vv['point_model']}, n_origins {vv['n_origins']}, "
                  f"n_folds {mv['n_folds']})\n",
                  "| arm | marginal cov [CP] | mean width | Winkler | in 90% set |",
                  "|---|---|---|---|---|"]
        for a in mv["arms"]:
            mk = m[a]["marginal"]
            lines.append(f"| {a} | {mk['coverage']:.3f} [{mk['cp_lo']:.3f},{mk['cp_hi']:.3f}] "
                         f"| {m[a]['mean_width']:.0f} | {mv['mean_winkler'][a]:.1f} "
                         f"| {'yes' if a in mv['set_90'] else 'no'} |")
        lines.append(f"\n90% Winkler set: {mv['set_90']}. Incumbent {mv['incumbent']}; "
                     f"adoption candidates (in set AND lower mean than incumbent): "
                     f"{mv['adoption_candidates'] or 'none'}.")
        lines.append("Per-step coverage (arm S per-step vs D pooled), primary level:")
        lines.append("| step | " + " | ".join(str(h) for h in range(1, HORIZON + 1)) + " |")
        lines.append("|" + "---|" * (HORIZON + 1))
        for a in ("D", "S", "A", "G"):
            cov = " | ".join(f"{m[a]['per_step'][str(h)]['coverage']:.2f}"
                             for h in range(1, HORIZON + 1))
            lines.append(f"| {a} | {cov} |")
        lines.append(f"\nS per-step half-width: " + ", ".join(
            f"h{h}={m['S']['per_step'][str(h)]['mean_width'] / 2:.0f}"
            for h in range(1, HORIZON + 1)) + ".")
        lines.append(f"ACI gamma sweep (mean Winkler): " + ", ".join(
            f"{g}={w:.1f}" for g, w in vv["aci_gamma_sweep"].items())
            + f"; best {vv['per_level'][lvl]['aci_best_gamma']}. "
            f"Clamps A={vv['per_level'][lvl]['clamps']['A']}, "
            f"G={vv['per_level'][lvl]['clamps']['G']}.")
        lines.append("Paired bootstrap vs incumbent:")
        for p in mv["paired_bootstrap"]:
            if INCUMBENT in p["pair"].split("-"):
                lines.append(f"- {p['pair']}: mean delta {p['mean_delta']:+.1f}, "
                             f"90% CI [{p['ci_lo']:+.1f}, {p['ci_hi']:+.1f}]"
                             f"{' (excludes 0)' if p['excludes_zero'] else ''}")
        lines.append("")
    # R3 found this artefact restating coverages and Winkler scores under a different
    # numpy/pandas resolution while the code was untouched. The store ceiling and device
    # were already stamped; the library resolution was not, so the two runs were
    # indistinguishable on the page. Every figure in `tab:winkler` comes from here.
    lines.append("")
    lines += provenance.stamp_lines()
    REPORT_PATH.write_text("\n".join(lines) + "\n")


SERVED_CHECK_PATH = OUT_DIR / "interval_calibration_served_check.json"
SERVED_MODELS = {"beer_hall": "rung4_chronos2_exo"}


def served_coverage_check(venue: str = "beer_hall") -> dict:
    """Supplementary: does the powered under-coverage hold for the SERVED forecaster (which
    degrades with horizon), not just the ETS cold-start band? Scopes stop condition #3.

    Needs the forecast venv (Chronos). Runs the static arms only (P/D/S); the method verdict
    is the ETS `build`, this is a coverage/half-width scope check on the served point model."""
    model = SERVED_MODELS[venue]
    records = generate_records(venue, model=model)
    out = {}
    for level in LEVELS:
        arms = run_online(records, level)
        arms.pop("_clamps")
        out[str(level)] = {a: {
            "marginal": arm_metrics(arms[a], level)["marginal"],
            "per_step_coverage": {h: arm_metrics(arms[a], level)["per_step"][str(h)]["coverage"]
                                  for h in range(1, HORIZON + 1)},
            "per_step_half_width":
                {h: arm_metrics(arms[a], level)["per_step"][str(h)]["mean_width"] / 2
                 for h in range(1, HORIZON + 1)},
        } for a in ("P", "D", "S")}
    ceiling = assert_store_ceiling()
    payload = {"store_ceiling": ceiling, "device": "cpu", "venue": venue,
               "served_model": model, "levels": list(LEVELS), "per_level": out}
    SERVED_CHECK_PATH.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n")
    return payload


def main(argv: list[str]) -> int:
    if "--served-check" in argv:
        import os
        os.environ.setdefault("BRAIN_TORCH_DEVICE", "cpu")
        payload = served_coverage_check()
        d = payload["per_level"][str(PRIMARY_LEVEL)]["D"]
        print(json.dumps({"served_model": payload["served_model"],
                          "D_marginal_coverage": d["marginal"]["coverage"],
                          "D_cp": [d["marginal"]["cp_lo"], d["marginal"]["cp_hi"]]}, indent=2))
        return 0
    if "--build" in argv:
        out = build()
        print(json.dumps({
            "power_supports_miscalibration": out["power"]["supports_miscalibration"],
            "sets": {v: mv["set_90"] for v, mv in out["mcs"]["venues"].items()},
            "adoption": {v: mv["adoption_candidates"]
                         for v, mv in out["mcs"]["venues"].items()}},
            indent=2, default=str))
        return 0
    if not VECTORS_PATH.exists():
        print("no persisted vectors; run with --build first")
        return 1
    render(json.loads(VECTORS_PATH.read_text()), json.loads(MCS_PATH.read_text()),
           json.loads(POWER_PATH.read_text()))
    print(f"re-rendered {REPORT_PATH.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
