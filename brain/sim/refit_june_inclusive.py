"""G12.17a-3 - refit the T3 ladder gate on June-inclusive data.

Runs the 6-fold unified rolling-origin gate (models.ladder.evaluate_rolling) for the
live venues now that June is in the store, so the gate winner, the per-fold MASE, and
the exo set's measured value reflect the real June fixture-uplift days. Records
whether the winner changes per venue versus the served GATE_WINNER, and the margin by
which the Beer Hall Chronos-exo winner beats the best non-foundation rung (a proxy for
the exo set's value with June in the eval window). Two River Taps is dormant (liveness
gate) and is not refit. Read-only; writes sim/july2026_refit_result.json.

Run: .venv-forecast/bin/python -m sim.refit_june_inclusive
"""

from __future__ import annotations

import json

import numpy as np

import config
from models.ladder import evaluate_rolling, select_best
from sim.build_frozen_forecast import GATE_WINNER
from store.active_span import is_dormant

SIM_DIR = config.BRAIN_DIR / "sim"
AS_OF = "2026-06-30"


def run() -> dict:
    result = {"as_of": AS_OF, "venues": {}}
    for venue in config.FORECAST_VENUES:
        if is_dormant(venue, as_of=AS_OF):
            result["venues"][venue] = {"dormant": True, "note": "not refit (liveness gate)"}
            print(f"{venue}: DORMANT, skipped")
            continue
        results, n_folds = evaluate_rolling(venue, n_folds=6, horizon=7)
        table = []
        for r in results:
            if r.available and r.metrics and np.isfinite(r.metrics.get("MASE", np.nan)):
                table.append({"rung": r.name, "mase": round(r.metrics["MASE"], 4),
                              "folds": r.metrics.get("folds")})
        table.sort(key=lambda x: x["mase"])
        best = select_best(results)
        served = GATE_WINNER[venue]
        chronos = next((t for t in table if t["rung"] == "rung4_chronos2_exo"), None)
        best_non_foundation = next((t for t in table if t["rung"] != "rung4_chronos2_exo"), None)
        result["venues"][venue] = {
            "dormant": False,
            "n_folds": n_folds,
            "served_winner": served,
            "refit_winner": best.name if best else None,
            "refit_winner_mase": round(best.metrics["MASE"], 4) if best else None,
            "winner_changed": bool(best and best.name != served),
            "chronos_exo_mase": chronos["mase"] if chronos else None,
            "exo_margin_vs_best_non_foundation": (
                round(best_non_foundation["mase"] - chronos["mase"], 4)
                if chronos and best_non_foundation else None),
            "rung_table": table,
        }
        print(f"{venue}: served={served} refit={best.name if best else None} "
              f"MASE={best.metrics['MASE']:.3f} changed={best and best.name != served}")

    (SIM_DIR / "july2026_refit_result.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    run()
