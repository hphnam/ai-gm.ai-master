"""Test-suite environment.

Two things must be true before any test module imports `config`, which is why they
live at conftest import time rather than in a fixture:

  1  The service is hardened by default and refuses to import without a shared secret
     (service/auth.py). The suite opts out explicitly here rather than the default
     being open, which is the whole point of the switch: forgetting it anywhere real
     is loud.

  2  The suite must not be able to rebuild the developer's working store (S3 /
     FLAG-STORE-DURABILITY). Several tests call `warehouse.build()`, which rebuilds
     from the seed CSV ending 2026-05-31 and silently resets a store a developer had
     advanced to the operational ceiling. Pointing `BRAIN_DUCKDB_PATH` at a throwaway
     database isolates every store write in the suite to it; `current_db_path()` reads
     the override at call time. The handful of tests that deliberately assert the
     configured default path opt back out with `monkeypatch.delenv`.
"""

from __future__ import annotations

import os
import shutil
import tempfile

import pytest

os.environ.setdefault("BRAIN_ALLOW_INSECURE", "1")

# A session-lifetime throwaway store. setdefault so a developer who deliberately points
# the suite at a specific database (BRAIN_DUCKDB_PATH already set) keeps their choice.
_SUITE_STORE_DIR = tempfile.mkdtemp(prefix="brain-test-store-")
os.environ.setdefault("BRAIN_DUCKDB_PATH", os.path.join(_SUITE_STORE_DIR, "brain.duckdb"))

# Isolating the DATABASE was never enough. Artefact paths resolve from BRAIN_REPORT_ROOT,
# and until report 58 they resolved from `STORE_DIR.parent` instead, which is the checkout
# whatever BRAIN_DUCKDB_PATH says. So a suite run rewrote committed artefacts in the
# working tree: `signals/briefing.md`, `eval/deviation_eval.md` and `eval/judge_prompts.md`
# were being produced by pytest, at the seed ceiling, over the real ones. The committed
# briefing's "quiet day - nothing above threshold" was a test artefact, not a briefing.
# Redirecting the report root closes that at the source rather than per-test.
_SUITE_REPORT_ROOT = tempfile.mkdtemp(prefix="brain-test-reports-")
os.environ.setdefault("BRAIN_REPORT_ROOT", _SUITE_REPORT_ROOT)

# The writers assume their output directory already exists, which held only because it
# always did in the checkout. Mirroring the repo's artefact directories keeps that
# assumption true under isolation. Derived from the checkout rather than hard-coded, so a
# module writing to a new subdirectory does not need this list updated.
_BRAIN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for _name in os.listdir(_BRAIN_DIR):
    if os.path.isdir(os.path.join(_BRAIN_DIR, _name)) and not _name.startswith("."):
        os.makedirs(os.path.join(_SUITE_REPORT_ROOT, _name), exist_ok=True)


@pytest.fixture(scope="session", autouse=True)
def _isolated_store_built():
    """Seed the isolated store once so store-reading tests find data regardless of module
    order, and so the isolated store is a faithful replica of the state the suite has
    always run at.

    Two steps, in order:
      1  Copy the working store's file, if present, so the auxiliary tables `build()`
         does NOT create (weather, events, stock, watermark, ...) are available to the
         tests that read them - the same tables the suite read from the working store
         before isolation existed. This is a read of the working store, never a write.
      2  Rebuild `line_items` to the seed ceiling. That is the ceiling the suite has
         always run at (an early module rebuilds to seed), and it drops the copied
         June/July rows while leaving the copied auxiliary tables intact.

    Isolation therefore relocates the file and reproduces the working store's ceiling
    and contents; it does not change what any test sees, only where it reads it from.
    """
    import config
    from ingest.normalise import LINE_ITEMS_PARQUET
    from store import warehouse

    tmp = warehouse.current_db_path()
    if config.DUCKDB_PATH.exists() and config.DUCKDB_PATH != tmp:
        shutil.copy2(config.DUCKDB_PATH, tmp)
    if LINE_ITEMS_PARQUET.exists():
        warehouse.build()
    yield
    shutil.rmtree(_SUITE_STORE_DIR, ignore_errors=True)
    shutil.rmtree(_SUITE_REPORT_ROOT, ignore_errors=True)
