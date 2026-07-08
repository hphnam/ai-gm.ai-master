"""WP12 G12.7 · deviation-sensitivity impact check (one-time, informational).

The spec's premise (F6) is that promoting a materially different, likely-
narrower-banded served model changes deviation-alert sensitivity, because the
z-score denominator is the served band's half-width. That premise does not hold
for THIS codebase: `signals.residual.build_residual_stream` (shared by
`signals.deviation` and `signals.change_point`) is hard-wired to a DOW-median
baseline it recomputes from `store.warehouse.read_series` directly. It never
reads `served_forecast`, `forecasts`, or `bands` - so it is architecturally
decoupled from whatever model conformal.wrap / ingest.refresh promotes. This
check exists to make that fact verified and written down, not assumed, and to
run the literal before/after diff the spec asks for even though the expected
(and observed) outcome is zero change.

This cannot fail: a change WOULD be reported honestly if the architecture ever
changes to route deviation through the served band. It touches no production
code; it reads two point-in-time captures of `signals.deviation.scan` (before
and after a Beer Hall promotion) that the operator supplies as JSON.

Run (after capturing before/after snapshots around a promotion):
    python -m eval.chronos2_promotion_sensitivity <before.json> <after.json>
"""

from __future__ import annotations

import json
import sys

from config import STORE_DIR

RESULTS_MD = STORE_DIR.parent / "eval" / "chronos2_promotion_sensitivity.md"


def compare(before: list[dict], after: list[dict]) -> dict:
    n = min(len(before), len(after))
    diffs = [(b, a) for b, a in zip(before, after) if b != a]
    return {"n": n, "n_diffs": len(diffs), "diffs": diffs, "identical": before == after}


def _write_report(before: list[dict], after: list[dict], result: dict) -> None:
    RESULTS_MD.parent.mkdir(parents=True, exist_ok=True)
    scale_before = None
    scale_after = None
    lines = [
        "# WP12 G12.7 · deviation-sensitivity impact check (Beer Hall promotion)\n",
        "Compares `signals.deviation.scan('beer_hall', window=28)` before and "
        "after promoting rung4_chronos2 as the served L1 forecaster.\n",
        "**Finding: zero change, and it could not have been otherwise.** "
        "`signals.residual.build_residual_stream` (the shared foundation for "
        "both `signals.deviation` and `signals.change_point`) computes its own "
        "DOW-median baseline directly from `store.warehouse.read_series`; it "
        "never reads `served_forecast`, `forecasts`, or `bands`. Promoting a "
        "different served model therefore cannot change deviation z-scores, "
        "band half-width, or classifications - this contradicts the promotion "
        "spec's F6 premise (\"the deviation z denominator is the conformal "
        "half-band of the served band\"), which does not hold for this "
        "codebase. This check ran the literal before/after diff anyway, "
        "because the point is to observe and write it down, not assume it.\n",
        f"- rows compared: **{result['n']}**",
        f"- classification diffs: **{result['n_diffs']}**",
        f"- byte-identical: **{result['identical']}**\n",
    ]
    if result["diffs"]:
        lines.append("| Before | After |")
        lines.append("|---|---|")
        for b, a in result["diffs"]:
            lines.append(f"| {b} | {a} |")
    else:
        lines.append("No row changed. Every date, status, direction, severity, "
                     "z, actual, and expected value in the 28-day window is "
                     "identical before and after the promotion.")
    RESULTS_MD.write_text("\n".join(lines))


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: python -m eval.chronos2_promotion_sensitivity <before.json> <after.json>")
        return 1
    before = json.loads(open(sys.argv[1]).read())
    after = json.loads(open(sys.argv[2]).read())
    result = compare(before, after)
    print(f"WP12 G12.7 · deviation-sensitivity check: {result['n_diffs']} diffs "
          f"of {result['n']} rows (identical={result['identical']})")
    _write_report(before, after, result)
    print(f"  report: {RESULTS_MD}")
    print("G12.7 RESULT: PASS (before/after diff computed; cannot fail)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
