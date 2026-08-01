"""S3 Part 1 / FLAG-STORE-DURABILITY: the suite cannot touch the working store, and
the ceiling guard fires loudly on a reverted one.

G1 is proven by mtime, not by inspection: a build-touching operation must leave the
configured working store's file untouched. G2 is proven by the guard raising on the
seed store the isolated suite actually sits at, with the fix command in the message.
"""

from __future__ import annotations

import os

import pytest

import config
from ingest.normalise import LINE_ITEMS_PARQUET
from store import warehouse


# --- G1: isolation -----------------------------------------------------------

def test_the_suite_runs_against_an_isolated_store_not_the_configured_one():
    assert os.environ.get("BRAIN_DUCKDB_PATH")
    assert warehouse.current_db_path() != config.DUCKDB_PATH


def test_a_build_does_not_touch_the_configured_working_store():
    """The whole point of the isolation: `pytest` rebuilds happen in the throwaway
    store, so a developer's operational store keeps its mtime and its ceiling."""
    if not LINE_ITEMS_PARQUET.exists():
        pytest.skip("no line_items.parquet to build from")
    real = config.DUCKDB_PATH
    if real.exists():
        before = real.stat().st_mtime_ns
        warehouse.build()
        assert real.stat().st_mtime_ns == before
    else:
        warehouse.build()
        assert not real.exists()


# --- G2: the ceiling guard ---------------------------------------------------

def test_store_ceiling_reports_the_seed_the_isolated_store_sits_at():
    assert warehouse.store_ceiling() == config.SEED_CEILING


def test_assert_store_ceiling_fires_on_the_reverted_seed_store():
    with pytest.raises(warehouse.StoreCeilingError) as exc:
        warehouse.assert_store_ceiling()
    message = str(exc.value)
    assert config.EXPECTED_STORE_CEILING in message
    assert "python -m sim.restore_clock" in message


def test_assert_store_ceiling_names_the_actual_ceiling_it_found():
    with pytest.raises(warehouse.StoreCeilingError) as exc:
        warehouse.assert_store_ceiling()
    assert config.SEED_CEILING in str(exc.value)


def test_assert_store_ceiling_passes_when_the_expectation_matches():
    assert warehouse.assert_store_ceiling(expected=config.SEED_CEILING) == config.SEED_CEILING


# --- G3: the build itself says it landed short -------------------------------
#
# assert_store_ceiling guards READ time. Until report 58 a build gave no signal at all
# at WRITE time, so a store could be rebuilt to the seed and look healthy until some
# later entrypoint happened to guard. These pin the write-time signal.

def _build_as_working_store(monkeypatch, capsys):
    """Build with the isolated store standing in as the configured working store.

    Pointing `config.DUCKDB_PATH` at the tmp database the suite already uses is what
    makes the warning's `is_working_store` branch reachable without any test writing to
    a developer's real store, which G1 above forbids.
    """
    monkeypatch.setattr(config, "DUCKDB_PATH", warehouse.current_db_path())
    warehouse.build()
    return capsys.readouterr().err


def test_a_build_that_lands_short_of_the_ceiling_warns(monkeypatch, capsys):
    if not LINE_ITEMS_PARQUET.exists():
        pytest.skip("no line_items.parquet to build from")
    assert "below the operational ceiling" in _build_as_working_store(monkeypatch, capsys)


def test_the_short_build_warning_names_the_command_that_fixes_it(monkeypatch, capsys):
    if not LINE_ITEMS_PARQUET.exists():
        pytest.skip("no line_items.parquet to build from")
    assert "python -m sim.restore_clock" in _build_as_working_store(monkeypatch, capsys)


def test_a_build_into_an_isolated_store_stays_quiet(monkeypatch, capsys):
    """A scratch or overridden store is SUPPOSED to sit at the seed, so warning there
    would fire several times per suite run and train the reader to ignore it."""
    if not LINE_ITEMS_PARQUET.exists():
        pytest.skip("no line_items.parquet to build from")
    warehouse.build()
    assert capsys.readouterr().err == ""


def test_build_returns_the_ceiling_it_landed_at():
    if not LINE_ITEMS_PARQUET.exists():
        pytest.skip("no line_items.parquet to build from")
    assert warehouse.build() == config.SEED_CEILING
