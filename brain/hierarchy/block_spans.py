"""R1 -- emit the four-block split's boundaries and row counts.

`fig:blocks` (the R69 Methods figure) draws the fit / validation / calibration / test
split that `reconcile.reconcile` uses. The split is computed at runtime from
`config.TEST_WEEKS` and the venue calendar and has never been persisted: the only
number that reaches an artefact is `n=56`, the calibration and test block length,
printed in every row of the unbiasedness table. A figure drawn from that alone would
be a schematic, and a schematic of a real split is a missed opportunity to show the
reader the actual dates.

This module recomputes the boundaries with the SAME expression as `reconcile` -- not a
paraphrase of it -- and writes them to JSON so the figure script never reimplements the
arithmetic. It fits nothing, calls no model and touches no forecast.

Run:  brain/.venv-forecast/bin/python -m hierarchy.block_spans
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

if __package__ in (None, ""):  # pragma: no cover - direct-script invocation
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config
import provenance
from config import ANCHOR_VENUE, TEST_WEEKS
from hierarchy.reconcile import build_hierarchy

OUT_PATH = config.BRAIN_DIR / "hierarchy" / "block_spans.json"


def spans(venue: str = ANCHOR_VENUE, top_k: int = 3) -> dict:
    node_series, _S, nodes, bottom_nodes, _cat = build_hierarchy(venue, top_k)
    calendar = node_series["VENUE"].index

    # Identical to reconcile.reconcile. Kept as three lines rather than imported because
    # reconcile computes them inside a function that also fits the whole hierarchy.
    test_start = calendar.max() - pd.Timedelta(weeks=TEST_WEEKS)
    cal_start = test_start - pd.Timedelta(weeks=TEST_WEEKS)
    val_start = cal_start - pd.Timedelta(weeks=TEST_WEEKS)

    blocks = [
        ("fit", None, val_start, "estimators for the adoption contest"),
        ("validation", val_start, cal_start, "Croston/DOW adoption contest"),
        ("calibration", cal_start, test_start, "conformal scores + reconciliation weights"),
        ("test", test_start, None, "reported; touched by nothing else"),
    ]

    out = []
    for name, lo, hi in ((b[0], b[1], b[2]) for b in blocks):
        if lo is None:
            mask = calendar < hi
        elif hi is None:
            mask = calendar >= lo
        else:
            mask = (calendar >= lo) & (calendar < hi)
        sel = calendar[mask]
        out.append({
            "block": name,
            "start": str(sel.min().date()) if len(sel) else None,
            "end": str(sel.max().date()) if len(sel) else None,
            "n_days": int(len(sel)),
            "job": dict((b[0], b[3]) for b in blocks)[name],
        })

    return {
        "artefact": "block_spans",
        "venue": venue,
        "test_weeks": int(TEST_WEEKS),
        "calendar_start": str(calendar.min().date()),
        "calendar_end": str(calendar.max().date()),
        "n_calendar_days": int(len(calendar)),
        "n_nodes": len(nodes),
        "n_bottom_nodes": len(bottom_nodes),
        "blocks": out,
        "store_ceiling": provenance.store_ceiling(),
        "provenance": provenance.runtime_stamp(),
    }


def main() -> int:
    rep = spans()
    print(f"Four-block split ({rep['venue']}, TEST_WEEKS={rep['test_weeks']}, "
          f"calendar {rep['calendar_start']} -> {rep['calendar_end']}, "
          f"{rep['n_calendar_days']} days)")
    for b in rep["blocks"]:
        print(f"  {b['block']:12s} {str(b['start']):>10s} -> {str(b['end']):>10s}  "
              f"n={b['n_days']:3d}   {b['job']}")
    OUT_PATH.write_text(json.dumps(rep, indent=2) + "\n")
    print(f"  wrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
