"""Restore the operational clock to 2026-07-07 after a store rebuild.

`warehouse.build()` rebuilds from the committed CSV seed, which ends 2026-05-31, so it
silently drops the aggregate-ingested June and 1 to 7 July rows and resets the store to
the seed. Nothing warns; the store just quietly becomes five weeks stale, and the next
thing that reads it is wrong rather than broken.

The suite used to be the main way this happened, via the `warehouse.build()` calls in
several modules' autouse fixtures. It no longer is: `tests/conftest.py` points
`BRAIN_DUCKDB_PATH` at a throwaway database for the session (S3 / FLAG-STORE-DURABILITY),
so pytest cannot reach the working store at all. What remains is a manual rebuild, a bare
`ingest.normalise` run, or - the quiet one, because the file looks perfectly healthy - a
store restored from a backup taken before the clock was last advanced. That last case is
what happened on 2026-07-31, and `assert_store_ceiling` is what caught it.

This chains the two ingests that put it back, in the order they depend on (July W1
refuses to run against a June-less store), and verifies the result. Both are idempotent
and both read committed artefacts under sim/, so this reproduces the same clock every
time and needs no network.

It never touches the held-out 8 to 14 July window: that is the Step-C2 target and the
confront asserts it is absent.

Run after any pytest run or manual rebuild:
    .venv-forecast/bin/python -m sim.restore_clock
"""

from __future__ import annotations

import json

from store.warehouse import connect

EXPECTED_CEILING = "2026-07-07"
HELD_OUT = ("2026-07-08", "2026-07-14")


def _state() -> dict:
    con = connect(read_only=True)
    try:
        ceiling = con.execute("SELECT MAX(date) FROM l1_daily").fetchone()[0]
        june = con.execute(
            "SELECT COUNT(DISTINCT date) FROM l1_daily "
            "WHERE date >= '2026-06-01' AND date <= '2026-06-30'").fetchone()[0]
        july = con.execute(
            "SELECT COUNT(DISTINCT date) FROM l1_daily "
            "WHERE date >= '2026-07-01' AND date <= '2026-07-07'").fetchone()[0]
        leaked = con.execute(
            "SELECT COUNT(*) FROM l1_daily WHERE date >= ? AND date <= ?",
            list(HELD_OUT)).fetchone()[0]
    finally:
        con.close()
    return {"ceiling": str(ceiling), "june_days": int(june),
            "july_w1_days": int(july), "held_out_rows": int(leaked)}


def run() -> dict:
    before = _state()
    if before["ceiling"] == EXPECTED_CEILING and before["july_w1_days"] == 7:
        print(json.dumps({"action": "none", "reason": "clock already at "
                          + EXPECTED_CEILING, "state": before}, indent=2))
        return before

    # Imported here, not at module load: each ingest opens its own write connection,
    # and importing them is enough to want the store to exist. Import order is
    # alphabetical and means nothing; the call order below is the dependency.
    from sim import ingest_july_w1_actuals, ingest_june_actuals

    ingest_june_actuals.run()         # first: July W1 refuses against a June-less store
    ingest_july_w1_actuals.run()

    after = _state()
    if after["ceiling"] != EXPECTED_CEILING:
        raise RuntimeError(f"restore failed: ceiling {after['ceiling']}, "
                           f"want {EXPECTED_CEILING}")
    if after["july_w1_days"] != 7:
        raise RuntimeError(f"restore failed: {after['july_w1_days']} July W1 days, want 7")
    if after["held_out_rows"] != 0:
        raise RuntimeError(f"restore polluted the held-out window: "
                           f"{after['held_out_rows']} rows in {HELD_OUT[0]}..{HELD_OUT[1]}")

    print(json.dumps({"action": "restored", "before": before, "after": after}, indent=2))
    return after


if __name__ == "__main__":
    run()
