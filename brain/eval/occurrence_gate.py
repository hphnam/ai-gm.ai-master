"""S4 Part 4b - does the occurrence gate measurably help at Beer Hall?

Scores the gated forecast (P(trade) * E[revenue|trade]) against the ungated base on the
same step-1 rolling origins the ladder and the MCS use, and asks the S3 Model Confidence
Set whether the two are distinguishable - not a difference of means. The base is
`rung1_robust_dow` (the interpretable DOW baseline), so the whole comparison is
Chronos-free and fast.

The expected result is that the gate does NOT measurably help: Beer Hall trades ~75% of
days and its Mon/Tue closures are already implicit in the day-of-week features, so a DOW
base and its gated form barely differ. A 90% set containing both is the honest statement.

Run:
    .venv-forecast/bin/python -m eval.occurrence_gate
"""

from __future__ import annotations

import json
import sys

import numpy as np

import config
from eval import harness, mcs
from signals import occurrence

VENUE = "beer_hall"
HORIZON = 7
MIN_TRAIN = 120
STEP = 1
BASIS = "calendar_lag7"


def _base(train, target):
    from models.ladder import rung1_robust_dow
    return rung1_robust_dow(train, target)


def evaluate() -> dict:
    from store.warehouse import assert_store_ceiling
    from models.ladder import _load_feats

    ceiling = assert_store_ceiling()
    feats = _load_feats(VENUE)
    gated, ungated = [], []
    for train, target in harness.rolling_origin(
        feats, n_folds=None, horizon_days=HORIZON, min_train_days=MIN_TRAIN, step_days=STEP
    ):
        ytr, yte = train["value"].to_numpy(float), target["value"].to_numpy(float)
        ung = _base(train, target)
        gat = occurrence.hurdle_forecast(train, target, VENUE, _base)
        gated.append(harness.mase(yte, gat, ytr, basis=BASIS))
        ungated.append(harness.mase(yte, ung, ytr, basis=BASIS))

    g = np.asarray(gated, float)
    u = np.asarray(ungated, float)
    keep = np.isfinite(g) & np.isfinite(u)
    loss = np.column_stack([g[keep], u[keep]])
    res = mcs.model_confidence_set(["gated", "ungated"], loss)

    return {
        "artefact": "occurrence_gate_beer_hall",
        "store_ceiling": ceiling, "venue": VENUE, "basis": BASIS,
        "n_folds": int(keep.sum()),
        "mean_mase": {"gated": round(float(g[keep].mean()), 4),
                      "ungated": round(float(u[keep].mean()), 4)},
        "mcs": {
            "set_0.10": res.set_at(0.10),
            "set_0.25": res.set_at(0.25),
            "mcs_pvalue": {k: round(v, 4) for k, v in res.mcs_pvalue.items()},
        },
        "base_model": "rung1_robust_dow",
        "seed": mcs.SEED, "block_len": mcs.BLOCK_LEN, "n_boot": mcs.N_BOOT,
    }


def main() -> int:
    rep = evaluate()
    print(f"Beer Hall occurrence gate ({rep['n_folds']} folds, base {rep['base_model']}):")
    print(f"  mean MASE  gated={rep['mean_mase']['gated']}  ungated={rep['mean_mase']['ungated']}")
    print(f"  90% MCS set: {rep['mcs']['set_0.10']}  (p-values {rep['mcs']['mcs_pvalue']})")
    both = set(rep["mcs"]["set_0.10"]) == {"gated", "ungated"}
    print(f"  verdict: {'gate did NOT measurably help (both in the 90% set)' if both else 'the set distinguishes them - inspect'}")
    path = config.BRAIN_DIR / "eval" / "occurrence_gate_beer_hall.json"
    path.write_text(json.dumps(rep, indent=2, allow_nan=False) + "\n")
    print(f"  wrote {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
