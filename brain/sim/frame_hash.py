"""The training-frame hash gate: does a change move any Lune number?

Report 33 established this as the real gate for anything that could affect a forecast,
and correctly demoted "C2 reproduces" - `sim/confront_july_w2.py` re-scores a FROZEN
artefact, so it validates the store and the scoring, never forecast generation.

It was never committed. Reports 33, 34 and 35 all quote three sha256 prefixes that no
script in this repository produces, so the gate the project leans on could not be run
by anyone, including its author, which is the same failure mode as a document outliving
its code. G15a committed this and re-baselined against the canonical restored store.

The hash covers contents AND column order: tree split ties break on feature index, so a
reordering silently changes a forecast while every value stays identical.

Baseline recorded 2026-07-19 at tip `44a0f08`, store ceiling 2026-07-07 (restore with
`.venv-forecast/bin/python -m sim.restore_clock` first - a pytest run that collects
`tests/test_a10_service.py` or `tests/test_a1_warehouse.py` rebuilds the store from the
seed and silently resets the clock five weeks).

Run:
    .venv-forecast/bin/python -m sim.frame_hash
"""

from __future__ import annotations

import hashlib
import json
import sys

import pandas as pd

import config
from features.build_features import build_features, event_venue_dates

OUT = config.BRAIN_DIR / "sim" / "frame_hash_baseline.json"

# venue -> (sha256[:16], rows, cols), G15a baseline. See the report-33 note below.
BASELINE = {
    "beer_hall": ("8c8a8be9d8dc5791", 399, 40),
    "two_river_taps": ("b6339032a219213c", 331, 40),
    "ellel": ("ea28bcacbf1825e4", 392, 40),
}


def frame_hash(df: pd.DataFrame) -> str:
    """Column order first, then contents. Both are load-bearing."""
    payload = ("|".join(df.columns) + "\n" + df.to_csv(index=False)).encode()
    return hashlib.sha256(payload).hexdigest()[:16]


def measure() -> dict:
    nights = event_venue_dates()          # estate-wide, computed once
    return {v: {"hash": frame_hash(df), "rows": len(df), "cols": df.shape[1]}
            for v in BASELINE
            for df in [build_features(v, event_nights=nights)]}


def run() -> int:
    got = measure()
    ok = True
    print("training-frame hashes (contents + column order)")
    for venue, (want_hash, want_rows, want_cols) in BASELINE.items():
        g = got[venue]
        match = (g["hash"] == want_hash and g["rows"] == want_rows
                 and g["cols"] == want_cols)
        ok = ok and match
        print(f"  {venue:16s} {g['rows']:4d} x {g['cols']:2d}  {g['hash']}  "
              f"{'OK' if match else f'MOVED (baseline {want_hash} {want_rows}x{want_cols})'}")
    OUT.write_text(json.dumps({"baseline": {k: {"hash": h, "rows": r, "cols": c}
                                            for k, (h, r, c) in BASELINE.items()},
                               "measured": got, "match": ok}, indent=2) + "\n")
    print(f"FRAME HASHES: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(run())
