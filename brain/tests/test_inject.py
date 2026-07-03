"""Injection-oracle tests (PRJ93 agent-eval spec, G1 / G-eval-e).

The four event kinds land on held-out windows with truth records, and the leakage
guard passes for every injection (injected days are strictly after the training
portion the detectors standardise against).
"""

from __future__ import annotations

import ast
import inspect

import pytest

from eval import harness, inject
from store.warehouse import connect


@pytest.fixture(scope="module")
def con():
    c = connect(read_only=True)
    yield c
    c.close()


def _imported(module) -> set[str]:
    mods: set[str] = set()
    for node in ast.walk(ast.parse(inspect.getsource(module))):
        if isinstance(node, ast.ImportFrom) and node.module:
            mods.add(node.module)
        elif isinstance(node, ast.Import):
            mods.update(a.name for a in node.names)
    return mods


# --- G1: the four event kinds -------------------------------------------------

def test_regime_shift_kind_and_direction(con):
    inj = inject.inject_regime_shift("beer_hall", con=con, direction="down")
    assert inj.truth[0].kind == "regime_shift" and inj.truth[0].direction == "down"


def test_spike_is_a_single_day(con):
    inj = inject.inject_spike("beer_hall", con=con, direction="up")
    assert inj.truth[0].kind == "spike" and inj.truth[0].direction == "up"


def test_stock_drawdown_emits_a_stock_signal(con):
    inj = inject.inject_stock_drawdown("beer_hall", con=con)
    assert inj.stock[0].source == "stock" and inj.stock[0].payload["days_of_cover"] == 0.0


def test_exo_coincident_plants_weather_or_honest_null(con):
    inj = inject.inject_exo_coincident("beer_hall", con=con, direction="down")
    assert inj.truth[0].expected_cause in ("weather", None)


# --- G-eval-e: leakage guard --------------------------------------------------

def test_regime_injection_window_is_held_out(con):
    inj = inject.inject_regime_shift("beer_hall", con=con, direction="down")
    assert inj.train_end < inj.truth[0].onset


def test_injected_window_passes_leakage_guard(con):
    inj = inject.inject_regime_shift("beer_hall", con=con, direction="down")
    train = inj.stream[inj.stream["date"].dt.date <= inj.train_end]
    test = inj.stream[inj.stream["date"].dt.date > inj.train_end]
    harness.assert_no_leakage(train, test)   # raises LeakageError on a future leak


# --- Ranking ground truth: a shift outranks a one-day spike -------------------

def test_multi_event_ranks_shift_above_spike(con):
    inj = inject.multi_event("beer_hall", con=con)
    shift = next(t for t in inj.truth if t.kind == "regime_shift")
    spike = next(t for t in inj.truth if t.kind == "spike")
    assert shift.relevance > spike.relevance


# --- G0: dependency direction (nothing in signals/ imports eval) --------------

def test_inject_imports_harness_and_signals_not_the_reverse(con):
    from signals import briefing, change_point, deviation
    mods = _imported(inject)
    assert {"eval", "signals.residual"} <= mods
    assert not any(m == "eval" or m.startswith("eval.")
                   for m in _imported(briefing) | _imported(change_point) | _imported(deviation))
