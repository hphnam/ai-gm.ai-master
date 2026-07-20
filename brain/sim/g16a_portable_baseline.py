"""Measure the three training-frame hashes against ANY tree in this repository's history.

Why this exists. `sim/frame_hash.py` pins a baseline taken at `44a0f08`, which is after
Phase 3's de-Lune. The de-Lune's safety argument, the one report 35 gave Ryan as the
reason to trust a multi-tenant engine, rested on a before-versus-after comparison run
inside a single session by a script that was never committed. Report 36 recorded that as
permanently lost. It is not lost: the pre-de-Lune tree is still in git and the store is
restorable, so the comparison can be made portable.

`sim/frame_hash.py` cannot do this job itself. It imports `event_venue_dates`, which
Phase 3 introduced; at `2cc97e7` the equivalent was the private `_ellel_event_dates` and
`build_features` took no `event_nights` argument at all. So this module carries its own
copy of the hashing function and dispatches on the signature it finds.

THE COMPARABILITY RULES, and the whole result is worthless if any is broken:

1. The hashing function here is byte-identical to `frame_hash.frame_hash`. It is copied
   rather than imported because the old tree has no `sim/frame_hash` to import from.
2. Both runs MUST use the same interpreter, so pandas float formatting, NaN rendering and
   dtype rendering cannot differ. The difference under test is the code, not the venv.
3. Both runs MUST read the same store bytes. Point `BRAIN_STORE_DIR` at one copy. Report
   33's `ellel` measurement is 386 rows against the canonical 392 precisely because this
   rule was not in force.
4. Validate before trusting: run this against the CURRENT tree first and confirm it
   reproduces `frame_hash.BASELINE`. A shim that cannot reproduce a known answer cannot
   be believed about an unknown one.

Run (from a brain/ directory, with the venv from the working clone):

    BRAIN_STORE_DIR=/path/to/store-copy PYTHONPATH=. \\
      /path/to/.venv-forecast/bin/python sim/g16a_portable_baseline.py
"""

from __future__ import annotations

import hashlib
import inspect
import json
import subprocess
import sys

import pandas as pd

VENUES = ("beer_hall", "two_river_taps", "ellel")


def frame_hash(df: pd.DataFrame) -> str:
    """Column order first, then contents. Byte-identical to `sim.frame_hash.frame_hash`."""
    payload = ("|".join(df.columns) + "\n" + df.to_csv(index=False)).encode()
    return hashlib.sha256(payload).hexdigest()[:16]


def _build_all() -> dict[str, pd.DataFrame]:
    """Build the three frames on whichever tree we are standing in.

    Post-de-Lune `build_features` takes `event_nights` so a caller looping venues computes
    the estate-wide calendar once. Pre-de-Lune it computed `_ellel_event_dates` internally
    per venue. Same frames either way; only the call shape differs.
    """
    from features.build_features import build_features

    if "event_nights" in inspect.signature(build_features).parameters:
        from features.build_features import event_venue_dates
        nights = event_venue_dates()
        return {v: build_features(v, event_nights=nights) for v in VENUES}
    return {v: build_features(v) for v in VENUES}


def measure() -> dict:
    return {v: {"hash": frame_hash(df), "rows": len(df), "cols": df.shape[1]}
            for v, df in _build_all().items()}


def _head() -> str:
    out = subprocess.run(["git", "rev-parse", "--short", "HEAD"],
                         capture_output=True, text=True)
    return out.stdout.strip() or "unknown"


def run() -> int:
    import config

    got = measure()
    payload = {"commit": _head(), "store": str(config.DUCKDB_PATH), "measured": got}
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(run())
