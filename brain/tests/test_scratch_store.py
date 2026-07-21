"""The per-request scratch store: the seam that makes the analytics layer stateless.

`scratch_store()` points warehouse.connect() at a temporary database so the existing
compute can run against injected data and persist nothing. Every call site reaches the
store through connect(), so this seam is load-bearing for the whole stateless refactor
and is tested at the level the refactor depends on: the default is unchanged, the
override is real, it survives threads, and it always unwinds.
"""

from __future__ import annotations

import threading
from pathlib import Path

import duckdb
import pytest

import config
from store import warehouse


@pytest.fixture(autouse=True)
def _use_the_real_default_store(monkeypatch):
    """This module tests the ContextVar seam against the CONFIGURED default path, so it
    opts out of the suite-wide BRAIN_DUCKDB_PATH isolation (conftest). Every read here
    is read-only, so the working store is not mutated."""
    monkeypatch.delenv("BRAIN_DUCKDB_PATH", raising=False)


def test_default_path_is_the_configured_store():
    assert warehouse.current_db_path() == config.DUCKDB_PATH


def test_scratch_store_overrides_the_path(tmp_path):
    scratch = tmp_path / "scratch.duckdb"
    with warehouse.scratch_store(scratch):
        assert warehouse.current_db_path() == scratch


def test_path_reverts_after_the_block(tmp_path):
    with warehouse.scratch_store(tmp_path / "scratch.duckdb"):
        pass
    assert warehouse.current_db_path() == config.DUCKDB_PATH


def test_path_reverts_even_when_the_block_raises(tmp_path):
    with pytest.raises(RuntimeError), warehouse.scratch_store(tmp_path / "s.duckdb"):
        raise RuntimeError("compute blew up")
    assert warehouse.current_db_path() == config.DUCKDB_PATH


def test_nested_blocks_unwind_in_order(tmp_path):
    outer, inner = tmp_path / "outer.duckdb", tmp_path / "inner.duckdb"
    with warehouse.scratch_store(outer):
        with warehouse.scratch_store(inner):
            assert warehouse.current_db_path() == inner
        assert warehouse.current_db_path() == outer
    assert warehouse.current_db_path() == config.DUCKDB_PATH


def test_connect_opens_the_scratch_database_not_the_real_one(tmp_path):
    """The point of the seam: existing code reaching connect() lands on injected data."""
    scratch = tmp_path / "scratch.duckdb"
    with warehouse.scratch_store(scratch):
        con = warehouse.connect()
        try:
            con.execute("CREATE TABLE probe (v INTEGER)")
            con.execute("INSERT INTO probe VALUES (42)")
        finally:
            con.close()

    assert scratch.exists()
    con = duckdb.connect(str(scratch), read_only=True)
    try:
        assert con.execute("SELECT v FROM probe").fetchone()[0] == 42
    finally:
        con.close()


def test_scratch_writes_never_touch_the_real_store(tmp_path):
    """A compute run must not be able to mutate the served store."""
    with warehouse.scratch_store(tmp_path / "scratch.duckdb"):
        con = warehouse.connect()
        try:
            con.execute("CREATE TABLE l1_daily (venue VARCHAR, date DATE, revenue_exvat DOUBLE)")
            con.execute("INSERT INTO l1_daily VALUES ('ghost', '2099-01-01', 999999)")
        finally:
            con.close()

    real = warehouse.connect(read_only=True)
    try:
        leaked = real.execute(
            "SELECT COUNT(*) FROM l1_daily WHERE venue = 'ghost'").fetchone()[0]
    finally:
        real.close()
    assert leaked == 0


def test_the_override_is_per_thread(tmp_path):
    """Starlette runs sync endpoints in a threadpool, so two concurrent requests must
    not see each other's scratch store. A module global would fail this."""
    seen: dict[str, Path] = {}
    barrier = threading.Barrier(2)

    def worker(name: str) -> None:
        with warehouse.scratch_store(tmp_path / f"{name}.duckdb"):
            barrier.wait()          # both inside their own block at once
            seen[name] = warehouse.current_db_path()

    threads = [threading.Thread(target=worker, args=(n,)) for n in ("a", "b")]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert seen == {"a": tmp_path / "a.duckdb", "b": tmp_path / "b.duckdb"}


def test_a_thread_without_a_scratch_sees_the_real_store(tmp_path):
    """ContextVar defaults do not leak across threads: a background job running with no
    scratch must reach the configured store, not some request's temporary one."""
    seen: list[Path] = []

    def worker() -> None:
        seen.append(warehouse.current_db_path())

    with warehouse.scratch_store(tmp_path / "request.duckdb"):
        t = threading.Thread(target=worker)
        t.start()
        t.join()

    assert seen == [config.DUCKDB_PATH]
