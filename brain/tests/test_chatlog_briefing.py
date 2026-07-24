"""S11 tests - the chat-log KB-gap signal, wired into the briefing (G1-G4).

G1 wiring, G2 pinned embedder, G3 noise guard (must discriminate, not just read
"no gap" by construction), G4 occurrence gate. G3 mirrors S10's negative-control
standard: the guard is proven against a REAL clustering run over constructed
text, not asserted from the threshold formula alone.
"""

from __future__ import annotations

import sys
from datetime import date

import pandas as pd
import pytest

from signals import briefing, chatlog_kb_gap

BEER_HALL_CLOSED_DAY = date(2026, 5, 4)    # a Monday, structural zero for beer_hall
BEER_HALL_TRADING_DAY = date(2026, 5, 6)   # a Wednesday, open

FRYER_EXAMPLE = "How do I reset the fryer after it trips the breaker?"


def _fake_ranked(venue_tags: dict, onset: date, score: float = 6.0,
                 n_failed: int = 6, size: int = 6) -> pd.DataFrame:
    return pd.DataFrame([{
        "cluster": 0, "size": size, "n_failed": n_failed,
        "failure_density": round(n_failed / size, 3), "score": score,
        "is_gap": True, "venue_tags": venue_tags, "examples": [FRYER_EXAMPLE],
        "onset_date": pd.Timestamp(onset),
    }])


def _patch_report(monkeypatch, venue_tags: dict, onset: date, **kw):
    ranked = _fake_ranked(venue_tags, onset, **kw)
    monkeypatch.setattr(briefing, "chatlog_gap_report",
                        lambda: {"ranked": ranked, "backend": "tfidf", "stats": {}})


# --- G2: the embedder is pinned, not merely defaulted ------------------------

def test_pinned_backend_ignores_a_present_key_and_touches_no_network(monkeypatch):
    monkeypatch.setenv("VOYAGE_API_KEY", "fake-key-not-a-real-credential")
    # If the tfidf branch ever imported voyageai this would raise ImportError,
    # proving the pin never even attempts the network path, not just that a
    # missing key happens to fall through to it today.
    monkeypatch.setitem(sys.modules, "voyageai", None)
    texts = ["the fryer keeps tripping the breaker again today"] * 6 + \
            ["something entirely unrelated about the delivery schedule"] * 6
    emb, backend = chatlog_kb_gap.embed(texts, backend="tfidf")
    assert backend == "tfidf"
    assert emb.shape[0] == len(texts)


def test_rank_gaps_defaults_to_the_pinned_backend(monkeypatch):
    monkeypatch.setenv("VOYAGE_API_KEY", "fake-key-not-a-real-credential")
    monkeypatch.setitem(sys.modules, "voyageai", None)
    turns = pd.DataFrame({
        "content": ["the fryer keeps tripping the breaker again today"] * 6 +
                   ["something entirely unrelated about the delivery schedule"] * 6,
        "ts": pd.date_range("2026-05-01", periods=12),
        "failed": [True] * 6 + [False] * 6,
        "venue": ["estate"] * 12,
    })
    ranked, backend = chatlog_kb_gap.rank_gaps(turns, n_clusters=4)
    assert backend == "tfidf"


def test_unknown_backend_is_rejected():
    with pytest.raises(ValueError):
        chatlog_kb_gap.embed(["a b c d"], backend="not-a-real-backend")


# --- G3: the noise guard discriminates, proven via a real clustering run ----

_ORDINARY = [
    "Good morning, how is everyone doing today?",
    "Thanks so much for the help earlier this week.",
    "Can you tell me the weather forecast for tomorrow?",
    "What time does the delivery usually arrive on Fridays?",
    "I just wanted to say the new menu looks great.",
    "Is the car park still closed for resurfacing?",
    "Do we have any events booked in for next month?",
    "How do I update my staff profile picture please?",
    "Could you remind me when payroll usually runs?",
    "What is the wifi password for the back office?",
    "Are we fully staffed for the bank holiday weekend?",
    "Can someone confirm the float amount for tonight?",
]
_REPEATED = [
    "How do I reset the fryer after it trips the breaker?",
    "The fryer keeps tripping, how do I reset it safely?",
    "Fryer breaker tripped again, what is the reset procedure?",
    "Can someone explain how to reset the fryer breaker?",
    "The fryer tripped the breaker, how do we reset it?",
    "What is the process to reset the fryer breaker?",
]


def _mixed_corpus_ranked() -> pd.DataFrame:
    ts0 = pd.Timestamp("2026-05-01")
    rows = []
    for i, c in enumerate(_ORDINARY):
        rows.append({"conversationId": f"c{i}", "content": c, "ts": ts0 + pd.Timedelta(days=i),
                     "failed": i == 0, "venue": "estate"})
    for i, c in enumerate(_REPEATED):
        rows.append({"conversationId": f"r{i}", "content": c, "ts": ts0 + pd.Timedelta(days=i),
                     "failed": True, "venue": "estate"})
    turns = pd.DataFrame(rows)
    ranked, backend = chatlog_kb_gap.rank_gaps(turns, n_clusters=6)
    assert backend == "tfidf"
    return ranked


def test_ordinary_non_repeating_chatter_is_not_flagged_as_a_gap():
    ranked = _mixed_corpus_ranked()
    ordinary_clusters = ranked[ranked["examples"].map(
        lambda ex: not any("fryer" in e.lower() for e in ex))]
    assert not ordinary_clusters.empty
    assert not ordinary_clusters["is_gap"].any()


def test_a_repeated_operational_question_is_flagged_as_a_gap():
    ranked = _mixed_corpus_ranked()
    fryer_cluster = ranked[ranked["examples"].map(
        lambda ex: any("fryer" in e.lower() for e in ex))]
    assert len(fryer_cluster) == 1
    row = fryer_cluster.iloc[0]
    assert bool(row["is_gap"])
    assert row["n_failed"] >= 2
    assert row["failure_density"] > chatlog_kb_gap.CHATLOG_FAILURE_BASELINE


# --- G1: the signal wires into the briefing on the same footing -------------

def test_a_known_repeated_question_cluster_becomes_a_ranked_briefing_item(monkeypatch):
    _patch_report(monkeypatch, {"beer_hall": 6}, BEER_HALL_TRADING_DAY)
    sigs = briefing._collect_sop("beer_hall")
    assert len(sigs) == 1
    assert sigs[0].source == "sop"

    item = briefing._build_item(sigs, BEER_HALL_TRADING_DAY, "L1", None)
    assert item.head.source == "sop"
    assert "fryer" in item.headline.lower()
    assert "missing sop" in item.headline.lower()
    assert "6 of 6 similar questions went unanswered" in item.reason

    score = briefing._score(item.head, "new", item.baseline_trust, BEER_HALL_TRADING_DAY)
    assert score > 0.0   # ranks (a positive score sorts alongside sales items)


def test_sop_source_carries_its_own_declared_weight():
    from config import BRIEFING_SOURCE_WEIGHT
    assert BRIEFING_SOURCE_WEIGHT["sop"] == 0.35


# --- G4: the occurrence gate -------------------------------------------------

def test_a_gap_cannot_be_surfaced_on_a_structural_zero_day(monkeypatch):
    _patch_report(monkeypatch, {"beer_hall": 6}, BEER_HALL_CLOSED_DAY)
    assert briefing._collect_sop("beer_hall") == []


def test_a_gap_is_surfaced_on_a_trading_day(monkeypatch):
    _patch_report(monkeypatch, {"beer_hall": 6}, BEER_HALL_TRADING_DAY)
    assert len(briefing._collect_sop("beer_hall")) == 1


def test_ellels_inert_occurrence_never_gates_a_gap(monkeypatch):
    # Ellel's occurrence label is NaN (no booking diary) - inert, never
    # fabricated into a pass or a fail (mirrors S10's occurrence guard).
    _patch_report(monkeypatch, {"ellel": 3}, BEER_HALL_CLOSED_DAY, n_failed=3, size=3)
    assert len(briefing._collect_sop("ellel")) == 1


# --- Venue attribution (estate broadcast, brewery excluded) -----------------

def test_an_unnamed_venue_cluster_is_broadcast_to_every_briefing_venue(monkeypatch):
    from config import BRIEFING_VENUES
    _patch_report(monkeypatch, {"estate": 6}, BEER_HALL_TRADING_DAY)
    for venue in BRIEFING_VENUES:
        sigs = briefing._collect_sop(venue)
        # Ellel's occurrence is inert (never gates), the calendar venues are on
        # a trading day here, so every venue should see the broadcast gap.
        assert len(sigs) == 1, venue


def test_a_brewery_only_cluster_is_excluded_not_surfaced_ungated(monkeypatch):
    from config import BRIEFING_VENUES
    _patch_report(monkeypatch, {"brewery": 2}, BEER_HALL_TRADING_DAY, n_failed=2, size=2)
    for venue in BRIEFING_VENUES:
        assert briefing._collect_sop(venue) == []


# --- Additive: wiring the signal must not perturb existing sales items ------

def test_wiring_sop_does_not_change_non_sop_briefing_items(monkeypatch):
    from store import warehouse

    warehouse.build()
    with_sop = briefing.build()
    non_sop_with = [it for it in with_sop["items"] if it["head"]["source"] != "sop"]

    monkeypatch.setattr(briefing, "_collect_sop", lambda venue: [])
    without_sop = briefing.build()
    non_sop_without = [it for it in without_sop["items"] if it["head"]["source"] != "sop"]

    assert non_sop_with == non_sop_without
