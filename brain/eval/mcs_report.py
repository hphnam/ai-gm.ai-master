"""S3 G17c - compute the Model Confidence Set artefact for all three venues.

Reads the persisted per-fold loss vectors (S2), runs the pre-registered MCS (decision
log row 33) plus the paired-variance diagnostic and the block-length / replication
sensitivity sweeps, and writes one result JSON the report is built from. Reads no store
(the vectors carry their own store_ceiling, which the runner asserts).

Run:
    .venv-forecast/bin/python -m eval.mcs_report
"""

from __future__ import annotations

import json
import sys

import numpy as np

import config
from eval import fold_vectors, mcs


def _mcs_run(payload: dict, rungs: list[str], metric: str, *,
             block_len: int = mcs.BLOCK_LEN, n_boot: int = mcs.N_BOOT) -> dict:
    names, folds, L = mcs.common_loss_matrix(payload, rungs, metric)
    res = mcs.model_confidence_set(names, L, metric=metric,
                                   block_len=block_len, n_boot=n_boot)
    return {
        "n_folds": res.n_folds, "block_len": block_len, "n_boot": n_boot,
        "sets": {str(a): res.set_at(a) for a in mcs.ALPHAS},
        "set_sizes": {str(a): len(res.set_at(a)) for a in mcs.ALPHAS},
        "elimination": res.elimination,
        "mcs_pvalue": {k: round(v, 4) for k, v in res.mcs_pvalue.items()},
        "mean_loss": {k: round(v, 4) for k, v in res.mean_loss.items()},
    }


def _paired(payload: dict, rungs: list[str], metric: str) -> list[dict]:
    out = []
    for pv in mcs.paired_variance(payload, rungs, metric):
        out.append({
            "pair": list(pv["pair"]),
            "mean_diff": round(pv["mean_diff"], 4),
            "sd_paired": round(pv["sd_paired"], 4),
            "sd_independent": round(pv["sd_independent"], 4),
            "paired_to_independent": round(pv["paired_to_independent"], 3),
            "se_paired": round(pv["se_paired"], 4),
            "acf_lag1_10": [round(x, 3) for x in pv["acf"]],
        })
    return out


# Which loss the write-up leads on. Both are always computed and both are always
# stored; this names the one Results reports as headline.
#
# The artefact keys below are named for the LOSS (`mcs_mase`, `mcs_rmsse`) and never
# for the designation. They used to read `mcs_primary_mase` / `mcs_secondary_rmsse`,
# which baked "primary" into a key that a later decision could falsify -- the same
# defect class as the hard-coded basis literal in `fold_vectors` (report 70). A
# consumer wanting the headline run reads `headline_loss` and indexes with it.
HEADLINE_LOSS = "rmsse"
SECONDARY_LOSS = "mase"


def venue_report(venue: str) -> dict:
    payload = fold_vectors.load(venue)
    ceiling = mcs._assert_vector_provenance(payload, venue)
    rungs = mcs.available_rungs(payload)
    counts = {n: len(payload["rungs"][n]["fold_index"]) for n in rungs}
    full = max(counts.values())
    short = [n for n in rungs if counts[n] < full]
    top4 = mcs.top_rungs_by_mean(payload, HEADLINE_LOSS, 4)

    out = {
        "venue": venue, "store_ceiling": ceiling,
        "fold_counts": counts, "short_rungs": short,
        # What these vectors actually are at this venue: at a venue ruled `unscaled`
        # the `rmsse` vector is an RMSE in currency, not a scaled error.
        "headline_loss_at_venue": payload["secondary_loss"],
        "secondary_loss_at_venue": payload["loss"],
        "top4_by_mean_headline": top4,
        "paired_variance_top4": _paired(payload, top4, HEADLINE_LOSS),
        "mcs_rmsse": {},
        "mcs_mase": {},
        "sensitivity_headline_common": [],
    }

    out["mcs_rmsse"]["common_fold"] = _mcs_run(payload, rungs, "rmsse")
    out["mcs_mase"]["common_fold"] = _mcs_run(payload, rungs, "mase")

    # Ellel second run: full 260 excluding the short (chronos2_exo) rung.
    if short:
        full_rungs = [n for n in rungs if n not in short]
        out["mcs_rmsse"]["full_excluding_short"] = _mcs_run(
            payload, full_rungs, "rmsse")
        out["mcs_mase"]["full_excluding_short"] = _mcs_run(
            payload, full_rungs, "mase")
        out["excluded_for_full"] = short

    # Block-length and replication sensitivity on the headline common-fold run.
    for block_len in mcs.BLOCK_LEN_SENSITIVITY:
        for n_boot in mcs.N_BOOT_SENSITIVITY:
            names, _folds, L = mcs.common_loss_matrix(payload, rungs, HEADLINE_LOSS)
            res = mcs.model_confidence_set(
                names, L, block_len=block_len, n_boot=n_boot)
            out["sensitivity_headline_common"].append({
                "block_len": block_len, "n_boot": n_boot,
                "set_size": {str(a): len(res.set_at(a)) for a in mcs.ALPHAS},
                "set_0.10": res.set_at(0.10),
            })
    return out


def main(argv: list[str]) -> int:
    venues = argv[1:] or list(config.FORECAST_VENUES)
    artefact = {
        "artefact": "mcs_L1_results",
        "store_ceiling": config.EXPECTED_STORE_CEILING,
        "seed": mcs.SEED, "alphas": list(mcs.ALPHAS),
        "block_len_primary": mcs.BLOCK_LEN, "n_boot_primary": mcs.N_BOOT,
        "pre_registration": "decision log row 33; sets computed after, procedure fixed before",
        "headline_loss": HEADLINE_LOSS,
        "secondary_loss": SECONDARY_LOSS,
        # The MCS procedure was pre-registered with MASE as the reported headline. The
        # designation was changed to RMSSE afterwards, on the estimand argument of D-D1
        # rather than on any result. Both losses were computed and stored from the first
        # run, no set was recomputed for the swap, and the change is declared in the
        # write-up rather than absorbed silently (decision row 92).
        "headline_designation_changed_post_hoc": True,
        "venues": {},
    }
    for venue in venues:
        rep = venue_report(venue)
        artefact["venues"][venue] = rep
        head = rep[f"mcs_{HEADLINE_LOSS}"]["common_fold"]
        print(f"\n=== {venue} (common-fold n={head['n_folds']}) ===")
        print(f"  headline {HEADLINE_LOSS:5s} set@0.10 ({head['set_sizes']['0.1']}): "
              f"{head['sets']['0.1']}")
        print(f"  headline {HEADLINE_LOSS:5s} set@0.25 ({head['set_sizes']['0.25']}): "
              f"{head['sets']['0.25']}")
        sec = rep[f"mcs_{SECONDARY_LOSS}"]["common_fold"]
        print(f"  second   {SECONDARY_LOSS:5s} set@0.10 ({sec['set_sizes']['0.1']}): "
              f"{sec['sets']['0.1']}")
        if "full_excluding_short" in rep[f"mcs_{HEADLINE_LOSS}"]:
            fe = rep[f"mcs_{HEADLINE_LOSS}"]["full_excluding_short"]
            print(f"  [full 260 excl {rep['excluded_for_full']}] {HEADLINE_LOSS} set@0.10 "
                  f"({fe['set_sizes']['0.1']}): {fe['sets']['0.1']}")

    path = config.BRAIN_DIR / "eval" / "mcs_L1_results.json"
    path.write_text(json.dumps(artefact, indent=2, allow_nan=False) + "\n")
    print(f"\nwrote {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
