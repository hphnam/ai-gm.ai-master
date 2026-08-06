"""R4 / G1 evidence - does the headline metric change which model the ladder picks?

G1 asks whether RMSSE should replace MASE as the headline. The literature's case against
MASE is not about magnitude, it is about which functional the measure elicits:

  * Hewamalage, Ackermann & Bergmeir (2023): "measures with squared base errors such as MSE
    and RMSE optimize for the mean whereas others with absolute value base errors such as
    MAE and Mean Absolute Scaled Error (MASE) optimize for the median."
  * Kolassa (2023): "The only error measures whose minimizing point forecasts are coherent
    are the squared error and monotonic functions of weighted sums of squared errors," and
    MASE is among the measures that "are just scaled MAEs," hence "usually not" coherent.

That argument bites on a DECISION only if the two measures disagree about which model wins.
This module measures that, and it changes nothing: it re-reads the committed per-fold loss
vectors and re-runs the SAME Model Confidence Set instrument under each loss. No refit, no
new fold grid, no new model. The point is to turn G1 from a preference into a measurement.

Scope. Only venues that admit a scaled error are scored. Under G2 (`config.VENUE_SCALE_BASIS`)
Ellel is ruled `unscaled`, so neither MASE nor RMSSE is defined there and the venue is
reported as out of scope rather than silently included.
"""

from __future__ import annotations

import json
import sys

import numpy as np
from scipy import stats

import config
import provenance
from eval import fold_vectors, mcs

REPORT_MD = config.REPORT_ROOT / "eval" / "metric_ordering.md"
METRICS_JSON = config.REPORT_ROOT / "eval" / "metric_ordering.json"

METRICS = ("mase", "rmsse")


def _ordering(payload: dict, rungs: list[str], metric: str) -> dict:
    """Mean loss per rung on the COMMON fold set, plus the MCS 90% set under that loss."""
    names, folds, L = mcs.common_loss_matrix(payload, rungs, metric)
    means = {n: float(np.mean(L[:, i])) for i, n in enumerate(names)}
    order = sorted(names, key=lambda n: means[n])
    res = mcs.model_confidence_set(names, L, metric=metric)
    summary = mcs._summarise(res)
    # `sets` is keyed by alpha; "0.1" is the 90% confidence set this project reports.
    return {
        "metric": metric,
        "n_folds": int(L.shape[0]),
        "names": names,
        "means": means,
        "order": order,
        "winner": order[0],
        "mcs_set": summary["sets"].get("0.1", []),
        "summary": summary,
    }


def run_venue(venue: str) -> dict:
    payload = fold_vectors.load(venue)
    rungs = mcs.available_rungs(payload)
    out = {m: _ordering(payload, rungs, m) for m in METRICS}

    a, b = out["mase"], out["rmsse"]
    # Rank each rung under each loss on the SAME name set, then correlate the two rankings.
    names = a["names"]
    ra = [a["order"].index(n) for n in names]
    rb = [b["order"].index(n) for n in names]
    rho, p_rho = stats.spearmanr(ra, rb)
    tau, p_tau = stats.kendalltau(ra, rb)
    set_a, set_b = set(a["mcs_set"] or []), set(b["mcs_set"] or [])
    return {
        "venue": venue,
        "n_rungs": len(names),
        "mase": a,
        "rmsse": b,
        "winner_mase": a["winner"],
        "winner_rmsse": b["winner"],
        "winner_changes": bool(a["winner"] != b["winner"]),
        "order_identical": bool(a["order"] == b["order"]),
        "spearman_rho": float(rho),
        "spearman_p": float(p_rho),
        "kendall_tau": float(tau),
        "kendall_p": float(p_tau),
        "mcs_set_mase": sorted(set_a),
        "mcs_set_rmsse": sorted(set_b),
        "mcs_set_identical": bool(set_a == set_b),
        "mcs_only_in_mase": sorted(set_a - set_b),
        "mcs_only_in_rmsse": sorted(set_b - set_a),
    }


def build() -> dict:
    scoped, skipped = [], []
    for venue in config.FORECAST_VENUES:
        if config.is_scaled_venue(venue):
            scoped.append(venue)
        else:
            skipped.append(venue)
    out = {
        "scaled_venues": scoped,
        "out_of_scope": {v: config.VENUE_SCALE_BASIS.get(v, "unscaled") for v in skipped},
        "venues": {v: run_venue(v) for v in scoped},
    }
    out["winner_changes_anywhere"] = any(
        out["venues"][v]["winner_changes"] for v in scoped)
    out["order_identical_everywhere"] = all(
        out["venues"][v]["order_identical"] for v in scoped)
    out["provenance"] = provenance.runtime_stamp()
    _write_report(out)
    METRICS_JSON.write_text(json.dumps(out, indent=2, sort_keys=True, default=str) + "\n")
    return out


def _write_report(out: dict) -> None:
    L = [
        "# R4 / G1 - does the headline metric change the ladder's decision?",
        "",
        "Re-analysis only. The committed per-fold loss vectors are re-read and the SAME "
        "Model Confidence Set instrument is re-run under each loss. No refit, no new fold "
        "grid, no new model, so any difference below is attributable to the measure alone.",
        "",
        f"Scaled venues scored: **{', '.join(out['scaled_venues'])}**.",
    ]
    if out["out_of_scope"]:
        oos = ", ".join(f"{v} ({b})" for v, b in out["out_of_scope"].items())
        L += ["", f"Out of scope under G2, no scaled error is defined: **{oos}**."]
    L += [
        "",
        "## Verdict",
        "",
        f"- Served/winning rung changes between MASE and RMSSE anywhere: "
        f"**{out['winner_changes_anywhere']}**",
        f"- Full ordering identical at every scaled venue: "
        f"**{out['order_identical_everywhere']}**",
        "",
    ]
    for v, r in out["venues"].items():
        L += [
            f"## {v}",
            "",
            f"- rungs compared: {r['n_rungs']}, folds: {r['mase']['n_folds']}",
            f"- winner under MASE: `{r['winner_mase']}`",
            f"- winner under RMSSE: `{r['winner_rmsse']}`",
            f"- **winner changes: {r['winner_changes']}**; full ordering identical: "
            f"{r['order_identical']}",
            f"- rank correlation between the two orderings: Spearman rho "
            f"{r['spearman_rho']:.3f} (p {r['spearman_p']:.2e}), Kendall tau "
            f"{r['kendall_tau']:.3f} (p {r['kendall_p']:.2e})",
            f"- 90% MCS under MASE: {r['mcs_set_mase']}",
            f"- 90% MCS under RMSSE: {r['mcs_set_rmsse']}",
            f"- **MCS sets identical: {r['mcs_set_identical']}**",
        ]
        if r["mcs_only_in_mase"]:
            L.append(f"- retained under MASE only: {r['mcs_only_in_mase']}")
        if r["mcs_only_in_rmsse"]:
            L.append(f"- retained under RMSSE only: {r['mcs_only_in_rmsse']}")
        L += ["", "| rung | mean MASE | mean RMSSE | rank MASE | rank RMSSE |",
              "|---|---|---|---|---|"]
        for n in r["mase"]["order"]:
            L.append(
                f"| {n} | {r['mase']['means'][n]:.4f} | {r['rmsse']['means'][n]:.4f} | "
                f"{r['mase']['order'].index(n)+1} | {r['rmsse']['order'].index(n)+1} |")
        L.append("")
    REPORT_MD.write_text("\n".join(L))


def main() -> int:
    out = build()
    print("R4 / G1 - metric ordering invariance")
    for v, r in out["venues"].items():
        print(f"  {v}: MASE winner {r['winner_mase']} | RMSSE winner {r['winner_rmsse']} "
              f"| changes={r['winner_changes']} | order identical={r['order_identical']} "
              f"| MCS identical={r['mcs_set_identical']}")
    print(f"  report: {REPORT_MD}")
    print(f"R4 RESULT: winner_changes_anywhere={out['winner_changes_anywhere']}, "
          f"order_identical_everywhere={out['order_identical_everywhere']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
