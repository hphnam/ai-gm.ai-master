"""One build entrypoint (S3 / FLAG-STORE-DURABILITY).

The store ceiling is state that lives outside the build. `ingest.normalise` plus
`store.warehouse` rebuild from a seed CSV ending 2026-05-31, and only
`sim/restore_clock.py` advances the clock to the operational ceiling. Three commands
in the right order, easy to get wrong. This is the one command that does all of them
and then ASSERTS the result, so a build either lands at the pinned ceiling or fails
loudly.

    python -m store.build            # normalise -> warehouse -> restore clock -> assert
    python -m store.build --force    # rebuild even if the store is already at ceiling

`restore_clock` already short-circuits a warm store, and this skips the whole rebuild
when the ceiling is already correct, so a warm run costs a single ceiling read.
"""

from __future__ import annotations

import argparse
import sys

import config
from store import warehouse


def build(*, force: bool = False) -> str:
    """Bring the store to `config.EXPECTED_STORE_CEILING`; return the final ceiling."""
    if not force and warehouse.store_ceiling() == config.EXPECTED_STORE_CEILING:
        print(f"store already at ceiling {config.EXPECTED_STORE_CEILING}; nothing to do")
        return warehouse.assert_store_ceiling()

    # Imported here so `python -m store.build --help` needs neither pandas nor the CSVs.
    from ingest import normalise
    from sim import restore_clock

    print("store.build: normalise -> warehouse -> restore_clock -> assert")
    normalise.main()          # rebuild line_items.parquet from the seed CSVs
    # warn_if_short is off because the short store is expected here and lives for exactly
    # one line: restore_clock runs next and assert_store_ceiling checks the result.
    warehouse.build(warn_if_short=False)
    restore_clock.run()       # re-ingest June + July W1 to advance to the ceiling
    ceiling = warehouse.assert_store_ceiling()
    print(f"store.build: OK, ceiling {ceiling}")
    return ceiling


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Build the store to the operational ceiling")
    ap.add_argument("--force", action="store_true",
                    help="rebuild even when the store is already at ceiling")
    args = ap.parse_args(argv)
    build(force=args.force)
    return 0


if __name__ == "__main__":
    sys.exit(main())
