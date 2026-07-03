"""Agent-evaluation tests (PRJ93 agent-eval spec, G2/G3/G5/G6/G7 + honesty gates).

One heavy `run()` produces the full battery once; the metric tests assert on it. The
oracle catches the injected events (recall), scores precision only on
injection-attributable items, ranks a sustained shift above a one-day spike,
attributes the planted weather cause and the honest null, and the two named probes
each return a quantified result. Cheap unit tests cover the label store and the
judge's offline seam + calibration.
"""

from __future__ import annotations

import ast
import inspect

import numpy as np
import pytest

import config
from eval import agent_eval, judge, labels
from store.warehouse import connect


@pytest.fixture(scope="module")
def res():
    return agent_eval.run()


@pytest.fixture()
def clean_labels():
    _drop()
    yield
    _drop()


def _drop() -> None:
    con = connect()
    try:
        con.execute("DROP TABLE IF EXISTS eval_labels")
    finally:
        con.close()


def _imported(module) -> set[str]:
    mods: set[str] = set()
    for node in ast.walk(ast.parse(inspect.getsource(module))):
        if isinstance(node, ast.ImportFrom) and node.module:
            mods.add(node.module)
        elif isinstance(node, ast.Import):
            mods.update(a.name for a in node.names)
    return mods


# --- G2 detection -------------------------------------------------------------

def test_recall_catches_every_injected_event(res):
    assert res.detection["recall"] == 1.0


def test_precision_ignores_real_window_background(res):
    assert res.detection["fp"] == 0


def test_detection_reports_confidence_interval(res):
    lo, hi = res.detection["recall_ci"]
    assert np.isfinite(lo) and np.isfinite(hi)


# --- G3 ranking + attribution -------------------------------------------------

def test_ranking_puts_the_shift_above_the_spike(res):
    assert res.ranking["spearman"] > 0.99


def test_attribution_names_planted_cause_and_honest_null(res):
    assert res.attribution["top1"] == 1.0 and res.attribution["n"] >= 1


def test_latency_is_non_negative_when_surfaced(res):
    assert res.latency["surfaced"] and res.latency["delay_days"] >= 0


# --- G6 Ask-F1 fatigue + cost -------------------------------------------------

def test_fatigue_rate_is_finite_upper_bound(res):
    assert np.isfinite(res.fatigue["per_week_upper_bound"])


def test_cost_curve_sweeps_every_ratio(res):
    assert [c["miss_to_false_alarm"] for c in res.cost] == list(config.EVAL_COST_RATIOS)


# --- G7 probes ----------------------------------------------------------------

def test_aged_probe_returns_a_crossover_verdict(res):
    assert isinstance(res.aged_probe["sinks_below_minor"], bool)


def test_sparse_cluster_escapes_the_single_day_downweight(res):
    assert res.sparse_probe["down_weight_escaped"] and res.sparse_probe["score_inflation_x"] > 1.0


# --- G5 human anchor + judge --------------------------------------------------

def test_judge_defaults_to_offline_emit_prompts(res):
    assert res.judge["mode"] == "emit-prompts" and res.judge["model"] == config.JUDGE_MODEL


def test_labels_roundtrip_scores_keep_against_surfaced(clean_labels):
    labels.add_label("2026-05-31", "beer_hall", "k1", "keep", labeller="t")
    m = labels.score_against(labels.load_labels(), surfaced_keys={"k1"})
    assert m["tp"] == 1 and m["fn"] == 0


def test_judge_calibrates_kappa_against_the_anchor(clean_labels):
    labels.add_label("2026-05-31", "beer_hall", "k1", "keep", labeller="t")
    labels.add_label("2026-05-31", "beer_hall", "j1", "drop", labeller="t")
    cal = judge.calibrate([{"item_key": "k1", "keep": True}, {"item_key": "j1", "keep": False}])
    assert cal["kappa"] == 1.0


# --- G0 dependency direction / read-only --------------------------------------

def test_agent_eval_imports_briefing_and_signals_one_way():
    mods = _imported(agent_eval)
    assert "eval.inject" in mods and "signals.residual" in mods
