"""A8 tests — failure detection, baseline reproduction, gap ranking."""

from __future__ import annotations

import pytest

from config import CHATLOG_FAILURE_BASELINE
from signals import chatlog_kb_gap as kb


def test_failure_marker_detection():
    assert kb._is_failure("I couldn't produce an answer — please retry or rephrase.")
    assert not kb._is_failure("Here's the opening checklist — tick each step.")


def test_venue_tagging_from_content():
    assert kb._venue_tag("How do I open the Beer Hall?") == "beer_hall"
    assert kb._venue_tag("set this for all venues") == "estate"
    assert kb._venue_tag("what time is lunch") == "estate"


@pytest.fixture(scope="module")
def loaded():
    return kb.load_turns()


def test_failure_rate_reproduces_baseline(loaded):
    _, stats = loaded
    assert abs(stats["failure_rate"] - CHATLOG_FAILURE_BASELINE) <= 0.01


def test_channel_is_web_not_whatsapp(loaded):
    _, stats = loaded
    assert "web" in stats["channels"]


def test_ranking_surfaces_at_least_one_above_baseline_gap(loaded):
    turns, _ = loaded
    ranked, backend = kb.rank_gaps(turns, n_clusters=12)
    gaps = ranked[ranked["is_gap"]]
    assert len(gaps) >= 1
    assert gaps.iloc[0]["failure_density"] > CHATLOG_FAILURE_BASELINE
    assert gaps.iloc[0]["examples"]


def test_substantive_filter_drops_one_word_acks():
    assert not kb._is_substantive("Perfect,")
    assert kb._is_substantive("Why is the gas not connecting?")
