"""S20 - Mondrian x AgACI: does adapting the LEVEL repair a partition that is wrong about
MEMBERSHIP?

THE COMPOSITION MEASURED HERE IS PRIOR ART AND NOTHING IN THIS MODULE CLAIMS A METHOD.
Bharti, Pal, Teneggi and Sulam, `Parameter-Free and Group Conditional Online Conformal
Prediction`, arXiv:2606.00419 (v1 2026-05-29, v4 2026-07-07; no peer-reviewed venue of record),
introduce POGO and state it is "the first parameter-free algorithm for group-conditional online
conformal prediction". Their stock experiment already defines Mondrian groups by "calendar-year
markers such as day-of-week", so a calendar-defined group-conditional online conformal arm is
not novel. This module is an EMPIRICAL MEASUREMENT on one estate, not a proposal.

What is measured is the question C7 (report 86) opened. The served Mondrian partition splits on
the CLOSURE CALENDAR, which encodes whether a venue was scheduled open. What governs the residual
distribution is OCCURRENCE, whether it took money. ACI adapts the coverage LEVEL; it does not
change group MEMBERSHIP. So the standing prediction is that adaptation widens the whole
calendar-closed group to cover the misgrouped cell, improving that cell at the cost of the rest
of the group. Pre-registered as decision log row 112, committed 6348a082 at
2026-08-15T17:33:52+01:00, strictly before the first line of this file was authored.

Five arms, one residual stream per venue, one set of folds, one nominal level:

  A  unpartitioned, fixed level        run_online(avail)["P"]
  B  Mondrian only, fixed level        run_online(avail)["D"]   <- C7's own path, reused
  C  AgACI only, adaptive, no groups   run_online(avail)["G"]
  D  Mondrian x AgACI, adaptive        this module's driver, one AgACI PER GROUP
  E  occurrence ORACLE, fixed level    run_online(occur)["D"]   <- C7's oracle path, reused

ARM E IS AN ORACLE AND IS NOT DEPLOYABLE. Occurrence is unknown at forecast time: a deployment
can condition on the rota, never on the till. The word ORACLE rides in its arm key so it cannot
be quoted without it.

ONLY ARM D IS NEW CODE. Arms A, B and C come from ONE `run_online` call on the availability
records, so pool ordering, point forecasts, residuals and warmup are shared by construction
rather than by agreement. `conformal.methods.AgACI` is used unmodified.

WHY NOT `signals/residual.py`, which the S20 package brief names as the source of the residual
stream: it is the wrong object, and report 86 section 8 already recorded this in S12 -- it
"supplies the deviation detector's stream, a different object from the conformal calibration
pass, and importing it would have measured the wrong band". Arm B is required to reuse C7's path,
and C7's path is `eval.interval_calibration.run_online`. See row 112(d).

THE TWO REPRODUCTION CHECKS ARE LOAD-BEARING AND HALT. Arm B must reproduce C7's published
Mondrian coverage on the scheduled-closed-but-traded cell and arm E its published oracle
coverage, at the four decimal places report 86 published. Arm B is the baseline every comparison
runs through, so a failure there voids every arm comparison. Both raise rather than warn.

Run:
    .venv-forecast/bin/python -m eval.mondrian_aci
"""

from __future__ import annotations

import contextlib
import json
import math
import sys
import time

import numpy as np
import pandas as pd

import config
import provenance
from conformal import methods
from conformal.methods import HORIZON, AgACI
from eval import interval_calibration as ic
from eval import partition_contrast as pc
from store.warehouse import assert_store_ceiling

OUT_PATH = config.BRAIN_DIR / "eval" / "mondrian_aci.json"
LEVEL = ic.PRIMARY_LEVEL                 # 0.90
GAMMAS = ic.ACI_GAMMAS                   # (0.005, 0.01, 0.02, 0.05, 0.1), pre-registered row 112(f)
WARMUP = ic.WARMUP_POOL                  # 140
VENUES = ic.VENUES

ARM_A = "A_unpartitioned_fixed"
ARM_B = "B_mondrian_fixed"
ARM_C = "C_agaci_unpartitioned_adaptive"
ARM_D = "D_mondrian_agaci_pergroup"
ARM_E = "E_occurrence_ORACLE_fixed"
ARMS = (ARM_A, ARM_B, ARM_C, ARM_D, ARM_E)

# Arms whose grouping is the availability calendar. Arm E groups on occurrence; arms A and C do
# not group at all. Used to decide which arms get a per-group degeneracy breakdown.
AVAILABILITY_GROUPED = (ARM_B, ARM_D)

# Report 86's published four-decimal figures for the scheduled-closed-but-traded cell, in the
# precision report 86 printed them at (sections 3.1-3.3 for arm B, section 6.1 for arm E). These
# literals exist so a drift between the persisted artefact and the REPORT is caught; the
# comparison proper runs against the persisted artefact, which is read rather than transcribed.
PUBLISHED_B = {"beer_hall": 0.4894, "ellel": 0.0000, "two_river_taps": 0.7368}
PUBLISHED_E = {"beer_hall": 0.9255, "ellel": 1.0000, "two_river_taps": 1.0000}
PUBLISHED_DP = 4


# --- Degeneracy accounting ---------------------------------------------------

def classify_quantile_call(n: int, level: float) -> str | None:
    """Name the degeneracy, if any, of one `safe_conformal_quantile` call at (n, level).

    The conventions are that function's own, not this module's: level <= 0 returns a zero-width
    point interval, level >= 1 returns the largest observed residual, and for a level in between
    the index `ceil((n+1)*level)` is clamped to n, which ALSO returns the largest observed
    residual -- that clamp is what "the calibration set is too small to attain the level" means,
    and at level 0.90 it is exactly n < 9. None means the level was attained normally.
    """
    if n == 0:
        return "empty_pool"
    if level <= 0.0:
        return "zero_width"
    if level >= 1.0:
        return "max_residual_level_excursion"
    if math.ceil((n + 1) * level) > n:
        return "attainability_clamp"
    return None


def attainable_min_n(level: float) -> int:
    """Smallest calibration-set size at which `level` is attainable without the index clamp."""
    n = 1
    while math.ceil((n + 1) * level) > n:
        n += 1
    return n


@contextlib.contextmanager
def _quantile_tap():
    """Count every `safe_conformal_quantile` call, tagged with a caller-set group label.

    Instrumentation, not reimplementation: the wrapper delegates to the real function and reads
    its real arguments, so the counts cannot drift from the convention they describe. It is
    installed ONLY around arm D's banding, where this module owns every call and can therefore
    attribute each one to a group exactly, with no inference from call ordering.
    """
    tap = {"group": None, "counts": {}}
    original = methods.safe_conformal_quantile

    def counting(scores, level):
        n = int(np.asarray(scores).size)
        kind = classify_quantile_call(n, float(level))
        if kind is not None:
            bucket = tap["counts"].setdefault(tap["group"], {})
            bucket[kind] = bucket.get(kind, 0) + 1
        return original(scores, level)

    methods.safe_conformal_quantile = counting
    try:
        yield tap
    finally:
        methods.safe_conformal_quantile = original


# --- The shared pool advance -------------------------------------------------

def pool_trace(records: pd.DataFrame, warmup: int = WARMUP):
    """Yield `(origin, pool_res, pool_step, pool_state)` for each origin that gets banded.

    One implementation, two consumers: arm D's driver bands from it, and the fixed arms'
    attainability counts are read off the same group slice sizes. The advance mirrors
    `interval_calibration.run_online` step 2 -- every residual whose target date is on or before
    the origin -- and the agreement is CHECKED rather than assumed: `venue_block` asserts that the
    origins yielded here are exactly the origins arm B banded.
    """
    by_origin = {o: g.sort_values("step") for o, g in records.groupby("origin")}
    res_by_target: dict = {}
    for _, r in records.iterrows():
        res_by_target.setdefault(r["target"], []).append(
            (int(r["step"]), float(r["res"]), int(r["state"])))
    sorted_targets = sorted(res_by_target)
    tptr = 0
    pool_res: list[float] = []
    pool_step: list[int] = []
    pool_state: list[int] = []

    for t in sorted(by_origin):
        while tptr < len(sorted_targets) and sorted_targets[tptr] <= t:
            for st, rs, stt in res_by_target[sorted_targets[tptr]]:
                pool_res.append(rs)
                pool_step.append(st)
                pool_state.append(stt)
            tptr += 1
        if len(pool_res) < warmup:
            continue
        yield (t, np.asarray(pool_res), np.asarray(pool_step, dtype=int),
               np.asarray(pool_state, dtype=int))


def fixed_arm_attainability(records: pd.DataFrame, level: float = LEVEL,
                            warmup: int = WARMUP) -> dict:
    """Per-group attainability-clamp count for a FIXED-level Mondrian arm.

    Exact, and it needs no instrumentation, because a fixed arm's level never moves: the clamp
    fires for a group at an origin exactly when that group's pool slice is smaller than
    `attainable_min_n(level)`, and it then fires for every row banded under that group at that
    origin. Counted in ROWS, so it is commensurable with the zero-width counts.
    """
    by_origin = {o: g.sort_values("step") for o, g in records.groupby("origin")}
    min_n = attainable_min_n(level)
    out: dict[str, int] = {}
    for origin, _pr, _ps, pst in pool_trace(records, warmup):
        states = by_origin[origin]["state"].to_numpy(int)
        for grp in np.unique(states):
            n_g = int((pst == grp).sum())
            if n_g < min_n:
                key = str(int(grp))
                out[key] = out.get(key, 0) + int((states == grp).sum())
    return out


# --- Arm D: Mondrian x AgACI, a separate alpha sequence per group ------------

def run_grouped_agaci(records: pd.DataFrame, level: float = LEVEL, *,
                      gammas=GAMMAS, warmup: int = WARMUP) -> dict:
    """Arm D. One `AgACI` per Mondrian group, each banding from its own residual slice.

    The effective miscoverage state is therefore keyed by (GROUP, horizon step) and a group's
    alpha advances only from outcomes that were banded under that group. A single alpha sequence
    shared across groups is a different arm and does not test the hypothesis -- row 112(e).

    The pool, the warmup, the lagged update discipline and the leak-free ordering mirror
    `run_online`; the banding itself is `conformal.methods.AgACI`, unmodified. When a group has no
    slice in the pool yet, the whole pool is used for that row, mirroring `mondrian_band`'s own
    fallback, and the event is COUNTED as `group_pool_empty` rather than passed over.
    """
    actual_by_date = dict(zip(records["target"], records["y"]))
    by_origin = {o: g.sort_values("step") for o, g in records.groupby("origin")}

    aggs: dict[int, AgACI] = {}
    pending: dict[int, dict] = {}
    banded: list[dict] = []
    group_pool_empty: dict[str, int] = {}
    min_n = attainable_min_n(level)

    with _quantile_tap() as tap:
        for origin, pr, ps, pst in _origin_stream(records, by_origin, warmup):
            y_t = actual_by_date.get(origin)
            # 1. lagged updates: intervals whose target date is now observed.
            if y_t is not None:
                for grp, agg in aggs.items():
                    for h in range(1, HORIZON + 1):
                        memo = pending[grp][h].pop(origin, None)
                        if memo is not None:
                            agg.update_step(h, y_t, *memo)
            # 2. band this origin, one group at a time.
            g_rows = by_origin[origin]
            steps = g_rows["step"].to_numpy(int)
            yhat = g_rows["yhat"].to_numpy(float)
            states = g_rows["state"].to_numpy(int)
            targets = g_rows["target"].tolist()

            for grp in np.unique(states):
                grp = int(grp)
                rows_m = states == grp
                slice_m = pst == grp
                if slice_m.any():
                    slice_res, slice_step = pr[slice_m], ps[slice_m]
                else:
                    slice_res, slice_step = pr, ps
                    group_pool_empty[str(grp)] = (group_pool_empty.get(str(grp), 0)
                                                  + int(rows_m.sum()))
                if grp not in aggs:
                    aggs[grp] = AgACI(level, gammas)
                    pending[grp] = {h: {} for h in range(1, HORIZON + 1)}
                agg = aggs[grp]
                tap["group"] = str(grp)
                lo, hi = agg.band(slice_res, slice_step, yhat[rows_m], steps[rows_m])
                tap["group"] = None

                sub = g_rows[rows_m]
                for i in range(len(sub)):
                    r = sub.iloc[i]
                    banded.append({"origin": r["origin"], "step": int(r["step"]),
                                   "target": r["target"], "y": float(r["y"]),
                                   "lo": float(lo[i]), "hi": float(hi[i]),
                                   "state": int(r["state"])})
                idx = np.flatnonzero(rows_m)
                for i, j in enumerate(idx):
                    h = int(steps[j])
                    los, his, lo_pred, hi_pred = agg.last_experts[h]
                    pending[grp][h][targets[j]] = (los.copy(), his.copy(), lo_pred, hi_pred)
        degeneracy_calls = {g: dict(c) for g, c in tap["counts"].items()}

    return {
        "banded": pd.DataFrame(banded),
        # The live aggregators, so a test can read a group's effective level directly. Not
        # serialised: `venue_block` reads named keys, never the whole dict.
        "_aggs": aggs,
        "clamps_per_group": {str(g): int(a.clamps) for g, a in aggs.items()},
        "group_pool_empty": group_pool_empty,
        "quantile_degeneracy_calls": degeneracy_calls,
        "attainable_min_n": min_n,
        "groups": sorted(int(g) for g in aggs),
    }


def _origin_stream(records: pd.DataFrame, by_origin: dict, warmup: int):
    """`pool_trace` restricted to the origins this record frame actually carries."""
    for origin, pr, ps, pst in pool_trace(records, warmup):
        if origin in by_origin:
            yield origin, pr, ps, pst


# --- Assembling one venue ----------------------------------------------------

def venue_block(venue: str, level: float = LEVEL) -> dict:
    """All five arms over one calibration population, with timings and degeneracy counts."""
    t0 = time.perf_counter()
    records = ic.generate_records(venue)
    t_records = time.perf_counter() - t0

    occur_records = records.assign(state=pc.occurrence_state(records))

    t0 = time.perf_counter()
    avail_pass = ic.run_online(records, level)
    t_avail = time.perf_counter() - t0

    t0 = time.perf_counter()
    occur_pass = ic.run_online(occur_records, level)
    t_occur = time.perf_counter() - t0

    t0 = time.perf_counter()
    d_out = run_grouped_agaci(records, level)
    t_armd = time.perf_counter() - t0

    banded = {
        ARM_A: pc._align(avail_pass["P"]),
        ARM_B: pc._align(avail_pass["D"]),
        ARM_C: pc._align(avail_pass["G"]),
        ARM_D: pc._align(d_out["banded"]),
        ARM_E: pc._align(occur_pass["D"]),
    }
    # Every fixed-gamma ACI arm from the pre-registered grid, reported in full per row 112(f).
    for g in GAMMAS:
        banded[f"ACI_fixed_gamma_{g}"] = pc._align(avail_pass[f"A@{g}"])

    # P5's construction, checked rather than assumed: the arms must have banded the SAME
    # observations in the SAME order, or a per-cell comparison compares different days.
    ref_keys = list(zip(banded[ARM_B]["origin"], banded[ARM_B]["step"]))
    for arm, df in banded.items():
        keys = list(zip(df["origin"], df["step"]))
        if keys != ref_keys:
            raise AssertionError(
                f"{venue}: arm {arm} banded {len(keys)} observations against arm B's "
                f"{len(ref_keys)}, or in a different order; a per-cell contrast would be "
                f"meaningless")

    # The pool reconstruction must cover exactly the origins the real pass banded.
    traced = [o for o, _, _, _ in pool_trace(records)]
    banded_origins = sorted(set(banded[ARM_B]["origin"]))
    if sorted(set(traced)) != banded_origins:
        raise AssertionError(
            f"{venue}: pool_trace yielded {len(set(traced))} origins against arm B's "
            f"{len(banded_origins)}; the reconstructed pool is not the banded pool")

    # Cell membership is a property of the DAY, not of the arm. Taken once, from arm B's rows,
    # and reused for every arm. This is P5 as a construction rather than as a hope.
    avail_lab = banded[ARM_B]["state"].to_numpy(int)
    occur_lab = pc.occurrence_state(banded[ARM_B])

    arms = {arm: pc._arm_stats(df, avail_lab, occur_lab) for arm, df in banded.items()}

    block = {
        "venue": venue,
        "point_model": ic.default_model(venue),
        "n_origins": int(records["origin"].nunique()),
        "level": level,
        "gammas": list(GAMMAS),
        "warmup_pool": WARMUP,
        "contingency_records": pc.contingency(records),
        "contingency_banded": pc.contingency(banded[ARM_B]),
        "arms": arms,
        "degeneracy": degeneracy_block(banded, d_out, records, occur_records, level),
        "wall_seconds": {
            "generate_records": t_records,
            "run_online_availability_ABC": t_avail,
            "run_online_occurrence_E": t_occur,
            "arm_D_grouped_agaci": t_armd,
        },
        "adaptive_clamps": {
            ARM_C: int(avail_pass["_clamps"]["G"]),
            ARM_D: d_out["clamps_per_group"],
        },
    }
    return block


def degeneracy_block(banded: dict, d_out: dict, records: pd.DataFrame,
                     occur_records: pd.DataFrame, level: float) -> dict:
    """Degenerate-interval counts per arm and per group. A RESULT, not a diagnostic.

    Three kinds, each stated with the scope it is exact over:

      zero_width_rows          `hi - lo == 0`, read off the banded rows of EVERY arm and
                               attributed by the row's own group label. Exact everywhere.
      level_excursion_clamps   the effective alpha leaving [0,1], counted by `ACI.clamps`.
                               Adaptive arms only; per group for arm D.
      attainability_clamps     the group's calibration slice too small for the level to be
                               attained. Exact for the fixed Mondrian arms B and E from their
                               pool slice sizes, and exact per group for arm D from the tap.
                               NOT separately attributable for arm C -- see `scope_note`.
    """
    out = {"attainable_min_n": attainable_min_n(level), "arms": {}}
    for arm, df in banded.items():
        width = df["hi"].to_numpy(float) - df["lo"].to_numpy(float)
        state = df["state"].to_numpy(int)
        zero = width == 0.0
        out["arms"][arm] = {
            "n_rows": int(len(df)),
            "zero_width_rows_total": int(zero.sum()),
            "zero_width_rows_by_group": {str(int(s)): int((zero & (state == s)).sum())
                                         for s in np.unique(state)},
        }
    out["arms"][ARM_B]["attainability_clamp_rows_by_group"] = fixed_arm_attainability(
        records, level)
    out["arms"][ARM_E]["attainability_clamp_rows_by_group"] = fixed_arm_attainability(
        occur_records, level)
    out["arms"][ARM_A]["attainability_clamp_rows_by_group"] = {
        "0": 0, "note": "ungrouped: the pool is never smaller than the warmup, so the level is "
                        "always attainable"}
    out["arms"][ARM_D]["quantile_degeneracy_calls_by_group"] = d_out["quantile_degeneracy_calls"]
    out["arms"][ARM_D]["group_pool_empty_rows"] = d_out["group_pool_empty"]
    out["scope_note"] = (
        "Arm C's attainability clamps are not separately attributable. Its bands are produced "
        "inside `run_online`, which computes every arm in one pass, so a tap installed there "
        "would count calls belonging to arms P, D, S and the five fixed-gamma ACI arms as well; "
        "and `run_online` is reused unmodified. Arm C's level-excursion count is reported "
        "instead, and it is the quantity that drives the clamp for an ungrouped adaptive arm.")
    return out


# --- The two reproduction checks, both of which HALT -------------------------

def persisted_c7() -> dict:
    """C7's per-venue closed_traded coverage under both arms, read from the committed artefact."""
    d = json.loads(pc.OUT_PATH.read_text())
    return {v: {"mondrian": b["availability"]["cells"]["closed_traded"]["coverage"],
                "oracle": b["occurrence"]["cells"]["closed_traded"]["coverage"],
                "n": b["availability"]["cells"]["closed_traded"]["n"]}
            for v, b in d["venues"].items()}


def verify_reproduction(venues: dict) -> dict:
    """R5 (arm B) and R4 (arm E) against C7, at the precision report 86 published.

    Compared at four decimal places, which is the precision report 86's tables carry, and the
    full-precision difference against the persisted artefact is reported beside the verdict
    rather than rounded away. Cell SIZES are compared as integers with no tolerance. A failure
    means the instruments are reading different populations, so it raises: arm B is the baseline
    every comparison runs through, and every arm comparison here would be void.
    """
    persisted = persisted_c7()
    rows, failures = {}, []
    for venue, block in venues.items():
        want = persisted.get(venue)
        if want is None:
            failures.append(f"{venue}: absent from the persisted C7 artefact")
            continue
        got_b = block["arms"][ARM_B]["cells"]["closed_traded"]
        got_e = block["arms"][ARM_E]["cells"]["closed_traded"]
        row = {
            "cell_n_measured": got_b["n"], "cell_n_persisted": want["n"],
            "cell_n_match": int(got_b["n"]) == int(want["n"]),
            "R5_arm_B": _repro_row(got_b["coverage"], want["mondrian"], PUBLISHED_B[venue]),
            "R4_arm_E": _repro_row(got_e["coverage"], want["oracle"], PUBLISHED_E[venue]),
        }
        rows[venue] = row
        if not row["cell_n_match"]:
            failures.append(f"{venue}: closed_traded cell n {got_b['n']} against persisted "
                            f"{want['n']}")
        for key, criterion in (("R5_arm_B", "R5"), ("R4_arm_E", "R4")):
            r = row[key]
            if not r["match_at_published_dp"]:
                failures.append(f"{venue}: {criterion} measured {r['measured']} against "
                                f"published {r['published']}")
            if not r["published_matches_artefact"]:
                failures.append(f"{venue}: {criterion} the persisted artefact "
                                f"({r['persisted']}) disagrees with report 86's published "
                                f"{r['published']} at {PUBLISHED_DP} dp")
    out = {"per_venue": rows, "all_match": not failures, "published_dp": PUBLISHED_DP}
    if failures:
        raise AssertionError(
            "HALT. S20 does not reproduce C7, so the two instruments are reading different "
            "populations and every arm comparison here is void: " + "; ".join(failures))
    return out


def _repro_row(measured, persisted, published) -> dict:
    m = None if measured is None else round(float(measured), PUBLISHED_DP)
    p = None if persisted is None else round(float(persisted), PUBLISHED_DP)
    return {
        "measured": measured, "measured_rounded": m,
        "persisted": persisted, "persisted_rounded": p,
        "published": published,
        "abs_diff_full_precision": (None if measured is None or persisted is None
                                    else abs(float(measured) - float(persisted))),
        "match_at_published_dp": m is not None and m == round(float(published), PUBLISHED_DP),
        "published_matches_artefact": p is not None and p == round(float(published),
                                                                   PUBLISHED_DP),
    }


def verify_membership(venues: dict) -> dict:
    """P5, as a reproduction check: exact, integer, no tolerance, raises on mismatch.

    The misgrouping counts must be unchanged across all arms -- adaptation changes level, not
    membership. In this design that is true BY CONSTRUCTION, because cell membership is taken
    once from the record frame and reused for every arm; the check exists to guard the
    construction, and the construction is exactly what P5 asserts. The persisted counts are read
    from C7's own source, `eval/exchangeability_diagnostic.json`, not transcribed.
    """
    persisted = pc.persisted_closed_but_traded()
    rows, failures = {}, []
    for venue, block in venues.items():
        want = persisted.get(venue)
        got = block["contingency_records"]["counts"]["closed_traded"]
        per_arm = {arm: int(stats["cells"]["closed_traded"]["n"])
                   for arm, stats in block["arms"].items()}
        identical = len(set(per_arm.values())) == 1
        ok = want is not None and int(got) == int(want) and identical
        rows[venue] = {"persisted": want, "measured_records_frame": int(got),
                       "banded_frame_n_by_arm": per_arm,
                       "identical_across_arms": identical, "match": bool(ok)}
        if want is None or int(got) != int(want):
            failures.append(f"{venue}: records-frame closed_traded {got} against persisted {want}")
        if not identical:
            failures.append(f"{venue}: banded closed_traded cell size differs across arms "
                            f"({per_arm})")
    out = {"per_venue": rows, "all_match": not failures}
    if failures:
        raise AssertionError(
            "P5 REFUTED as a construction: group membership is not invariant across arms, so "
            "these arms are not partitioning the same days: " + "; ".join(failures))
    return out


# --- Build -------------------------------------------------------------------

def build(venues: tuple[str, ...] = VENUES) -> dict:
    ceiling = assert_store_ceiling()
    t0 = time.perf_counter()
    blocks = {v: venue_block(v) for v in venues}
    elapsed = time.perf_counter() - t0
    out = {
        "artefact": "mondrian_aci",
        "prior_art": {
            "composition": "group-conditional online conformal prediction is PRIOR ART",
            "reference": "Bharti, Pal, Teneggi, Sulam, arXiv:2606.00419 (POGO), v1 2026-05-29, "
                         "v4 2026-07-07, no peer-reviewed venue of record",
            "claim_made_here": "empirical measurement on one estate; NO method is claimed",
        },
        "pre_registration": {"ledger_row": 112, "commit": "6348a082",
                             "committed_at": "2026-08-15T17:33:52+01:00"},
        "store_ceiling": ceiling,
        "level": LEVEL,
        "gammas": list(GAMMAS),
        "warmup_pool": WARMUP,
        "arms": {
            ARM_A: "unpartitioned, fixed level; run_online(availability)['P']",
            ARM_B: "Mondrian on the closure calendar, fixed level; run_online(availability)['D'] "
                   "- C7's own path, reused",
            ARM_C: "AgACI, adaptive level, no partition; run_online(availability)['G']",
            ARM_D: "Mondrian x AgACI, adaptive level PER GROUP; this module's driver",
            ARM_E: "ORACLE. Occurrence partition, fixed level; run_online(occurrence)['D']. NOT "
                   "DEPLOYABLE: occurrence is unknown at forecast time",
        },
        "reproduction_check": verify_reproduction(blocks),
        "membership_check_P5": verify_membership(blocks),
        "provenance": provenance.runtime_stamp(),
        "wall_seconds_total": elapsed,
        "venues": blocks,
    }
    return out


def _fmt(v, dp: int = 3) -> str:
    return "-" if v is None else f"{v:.{dp}f}"


def main(argv: list[str]) -> int:
    only = [a for a in argv if not a.startswith("-")]
    venues = tuple(only) if only else VENUES
    out = build(venues)
    if not only:
        OUT_PATH.write_text(json.dumps(out, indent=2, default=str))
    print(f"store ceiling {out['store_ceiling']}  level {out['level']}  "
          f"warmup {out['warmup_pool']}  gammas {out['gammas']}")
    print(f"wall {out['wall_seconds_total']:.1f}s over {len(venues)} venue(s)")
    print("\nreproduction checks (HALT on failure), closed_traded cell:")
    for v, r in out["reproduction_check"]["per_venue"].items():
        b, e = r["R5_arm_B"], r["R4_arm_E"]
        print(f"  {v:<16} n={r['cell_n_measured']}/{r['cell_n_persisted']} "
              f"R5 armB {b['measured_rounded']} vs {b['published']} "
              f"{'MATCH' if b['match_at_published_dp'] else 'MISMATCH'}   "
              f"R4 armE {e['measured_rounded']} vs {e['published']} "
              f"{'MATCH' if e['match_at_published_dp'] else 'MISMATCH'}")
    for v, b in out["venues"].items():
        print(f"\n{v}  n_origins={b['n_origins']}  banded={b['contingency_banded']['n']}")
        print(f"  {'arm':<34}{'overall':>9}{'n':>7}{'width':>10}"
              f"{'closed_traded':>15}{'n':>6}")
        for arm in ARMS:
            a = b["arms"][arm]
            ct = a["cells"]["closed_traded"]
            print(f"  {arm:<34}{_fmt(a['overall']['coverage']):>9}{a['overall']['n']:>7}"
                  f"{_fmt(a['overall']['mean_width'], 1):>10}"
                  f"{_fmt(ct['coverage']):>15}{ct['n']:>6}")
    print(f"\nwrote {OUT_PATH}" if not only else "\n(venue subset: artefact NOT written)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
