"""G12.10d · World Cup fixture loader + code-derived relevance tests.

Relevance is derived from real trading hours vs kickoff overlap, with no hand-set
rank or hour cap. The loader is tolerant of the committed markdown's exact
headers; the overlap rule is checked against the real England vs Croatia fixture
and an early-hours-only date.
"""

from __future__ import annotations

from datetime import time

import pandas as pd
import pytest

from ingest import world_cup


def _schedule_md(tmp_path, rows: str):
    p = tmp_path / "wc.md"
    p.write_text(
        "# FIFA World Cup 2026\n"
        "## Group Stage\n"
        "| Match # | Group | Date (London) | Time (London) | Home Team | Away Team | Venue | Result/Score |\n"
        "|--- |--- |--- |--- |--- |--- |--- |--- |\n" + rows,
        encoding="utf-8")
    return p


def test_loader_parses_all_matches_and_normalises_date(tmp_path):
    p = _schedule_md(
        tmp_path,
        "| 1 | Group A | June 11, 2026 | 20:00 | Mexico | South Africa | Azteca | 2-0 |\n"
        "| 21 | Group L | June 17, 2026 | 21:00 | England | Croatia | Dallas | 4-2 |\n")
    df = world_cup.read_world_cup_schedule(p)
    assert len(df) == 2
    assert df.iloc[1]["home"] == "England" and df.iloc[1]["away"] == "Croatia"
    assert df.iloc[1]["date"] == pd.Timestamp("2026-06-17")
    assert df.iloc[1]["kickoff_london"] == time(21, 0)


def test_loader_skips_malformed_row_without_crashing(tmp_path):
    p = _schedule_md(
        tmp_path,
        "| 1 | Group A | June 11, 2026 | 20:00 | Mexico | South Africa | Azteca | 2-0 |\n"
        "| 2 | Group A | not-a-date | 20:00 | France | Spain | Paris | 1-0 |\n")
    df = world_cup.read_world_cup_schedule(p)
    assert len(df) == 1
    assert df.iloc[0]["home"] == "Mexico"


def test_absent_schedule_returns_empty_frame(tmp_path):
    df = world_cup.read_world_cup_schedule(tmp_path / "does_not_exist.md")
    assert df.empty


def test_england_match_in_hours_when_window_reaches_kickoff(tmp_path, monkeypatch):
    p = _schedule_md(
        tmp_path,
        "| 21 | Group L | June 17, 2026 | 21:00 | England | Croatia | Dallas | 4-2 |\n")
    # 2026-06-17 is a Wednesday (dow=2); give BH a window that reaches 21:00.
    monkeypatch.setattr(world_cup, "_trading_windows", lambda venue, con=None: {2: (12.0, 23.5)})
    f = world_cup.world_cup_features("beer_hall", pd.to_datetime(["2026-06-17"]),
                                     schedule=world_cup.read_world_cup_schedule(p))
    row = f.iloc[0]
    assert row["wc_england_in_hours"] == 1
    assert row["wc_match_in_hours"] == 1
    assert row["wc_any_match"] == 1


def test_early_kickoff_only_date_is_not_in_hours(tmp_path, monkeypatch):
    # A 02:00 kickoff never overlaps a daytime/evening window: excluded by the
    # overlap rule, not a hand-set cap.
    p = _schedule_md(
        tmp_path,
        "| 4 | Group D | June 13, 2026 | 02:00 | United States | Paraguay | LA | 4-1 |\n")
    monkeypatch.setattr(world_cup, "_trading_windows", lambda venue, con=None: {5: (12.0, 23.5)})
    f = world_cup.world_cup_features("beer_hall", pd.to_datetime(["2026-06-13"]),
                                     schedule=world_cup.read_world_cup_schedule(p))
    row = f.iloc[0]
    assert row["wc_match_in_hours"] == 0
    assert row["wc_any_match"] == 1        # the match existed, just not in hours


def test_trt_and_other_out_of_scope_venues_get_all_zero(tmp_path):
    p = _schedule_md(
        tmp_path,
        "| 21 | Group L | June 17, 2026 | 21:00 | England | Croatia | Dallas | 4-2 |\n")
    f = world_cup.world_cup_features("two_river_taps", pd.to_datetime(["2026-06-17"]),
                                     schedule=world_cup.read_world_cup_schedule(p))
    assert int(f[list(world_cup.WC_FEATURE_COLS)].to_numpy().sum()) == 0


def test_coincident_fixtures_names_the_specific_england_match(tmp_path, monkeypatch):
    p = _schedule_md(
        tmp_path,
        "| 21 | Group L | June 17, 2026 | 21:00 | England | Croatia | Dallas | 4-2 |\n")
    monkeypatch.setattr(world_cup, "_trading_windows", lambda venue, con=None: {2: (12.0, 23.5)})
    hits = world_cup.coincident_fixtures(
        "beer_hall", pd.Timestamp("2026-06-15"), pd.Timestamp("2026-06-19"),
        schedule=world_cup.read_world_cup_schedule(p))
    assert len(hits) == 1
    assert hits[0]["home"] == "England" and hits[0]["kickoff"] == "21:00"
    assert hits[0]["is_england"] is True


def test_attribute_names_the_coincident_fixture(monkeypatch):
    """The reasoning path (signals.residual.attribute) names the specific
    coincident fixture, strictly as coincidence."""
    import duckdb

    from ingest import world_cup as wc
    from signals import residual

    monkeypatch.setattr(residual, "is_closed", lambda v, con=None: False)
    monkeypatch.setattr(residual.cal, "is_school_term", lambda d: True)
    monkeypatch.setattr(residual.cal, "is_uni_term", lambda d: True)
    monkeypatch.setattr(wc, "coincident_fixtures", lambda venue, lo, hi, con=None: [
        {"date": pd.Timestamp("2026-06-17"), "home": "England", "away": "Croatia",
         "kickoff": "21:00", "is_england": True}])
    con = duckdb.connect()
    reasons = residual.attribute("beer_hall", pd.Timestamp("2026-06-17"), "up", "L1", con=con)
    assert any("England vs Croatia, 21:00 kickoff, within trading hours" in r
               for r in reasons)
    assert not any("caused by" in r for r in reasons)
