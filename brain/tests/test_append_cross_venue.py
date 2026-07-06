"""Regression: `_append_transactions` must be strictly venue-local (FA1).

The earlier idempotence gate (G-live-d) only exercised the single-venue path, so a
multi-venue frame — or a fresh store where venues sit at different date ceilings —
could pass one venue's rows through gated by another venue's ceiling. This lands a
two-venue frame into a store whose venues have different ceilings and asserts the
append never crosses venues, never duplicates, and re-runs as a clean no-op.
"""

from __future__ import annotations

from datetime import date

import duckdb
import pandas as pd

from ingest.refresh import _append_transactions

_COLS = ["transaction_id", "venue", "date", "net_sales"]


def _store(tmp_path):
    """A line_items store: beer_hall through 2026-05-31, ellel through 2026-05-20."""
    con = duckdb.connect(str(tmp_path / "t.duckdb"))
    con.execute(
        "CREATE TABLE line_items (transaction_id VARCHAR, venue VARCHAR, "
        "date DATE, net_sales DOUBLE)")
    base = pd.DataFrame([
        {"transaction_id": "bh-0531", "venue": "beer_hall", "date": date(2026, 5, 31), "net_sales": 100.0},
        {"transaction_id": "el-0520", "venue": "ellel", "date": date(2026, 5, 20), "net_sales": 50.0},
    ])
    con.register("_b", base)
    con.execute("INSERT INTO line_items SELECT transaction_id, venue, date, net_sales FROM _b")
    con.unregister("_b")
    return con


def _frame():
    """A multi-venue frame with a new day for each venue past its OWN ceiling."""
    return pd.DataFrame([
        {"transaction_id": "bh-0601", "venue": "beer_hall", "date": date(2026, 6, 1), "net_sales": 200.0},
        {"transaction_id": "el-0601", "venue": "ellel", "date": date(2026, 6, 1), "net_sales": 60.0},
    ])


def _rows(con, venue):
    s = con.execute(
        "SELECT date FROM line_items WHERE venue=? ORDER BY date", [venue]).df()["date"]
    return list(pd.to_datetime(s).dt.date)


def test_append_for_lower_ceiling_venue_does_not_pull_other_venue(tmp_path):
    con = _store(tmp_path)
    # Appending ellel (ceiling 2026-05-20) must NOT insert the beer_hall 2026-06-01
    # row, even though that row's date is beyond ellel's ceiling.
    added = _append_transactions(con, "ellel", _frame())
    assert added == 1
    assert date(2026, 6, 1) not in _rows(con, "beer_hall")
    assert _rows(con, "ellel") == [date(2026, 5, 20), date(2026, 6, 1)]


def test_append_is_venue_local_and_idempotent(tmp_path):
    con = _store(tmp_path)
    frame = _frame()
    assert _append_transactions(con, "beer_hall", frame) == 1
    assert _append_transactions(con, "ellel", frame) == 1
    # Each venue got exactly its own new day, no duplicates.
    assert _rows(con, "beer_hall") == [date(2026, 5, 31), date(2026, 6, 1)]
    assert _rows(con, "ellel") == [date(2026, 5, 20), date(2026, 6, 1)]
    # Second pass is a clean no-op.
    assert _append_transactions(con, "beer_hall", frame) == 0
    assert _append_transactions(con, "ellel", frame) == 0
    assert con.execute("SELECT COUNT(*) FROM line_items").fetchone()[0] == 4
