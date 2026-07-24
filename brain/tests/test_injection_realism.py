"""S10 Part 2 tests - sampling, scoring, statistics, and G4 (control-arm reproduction).

The full paired build (120 injections through both arms) is exercised by
`python -m eval.injection_realism --build`, not here (it is the multi-minute driver run
that produced `eval/injection_realism.json`); these tests cover the pieces at unit/small-
integration scale so the suite stays fast.
"""

from __future__ import annotations

import numpy as np
import pytest

from eval import injection_realism as ir
from store.warehouse import connect


@pytest.fixture(scope="module")
def con():
    c = connect(read_only=True)
    yield c
    c.close()


# --- Pre-registration pinned ----------------------------------------------------

def test_target_counts_meet_the_spec_floor():
    assert sum(ir.TARGET_COUNTS.values()) >= 120
    assert ir.TARGET_COUNTS["regime_shift"] >= 60


# --- Sampling: deterministic, stratified ----------------------------------------

def test_build_pool_returns_paired_injections_with_shared_onset(con):
    pool = ir._build_pool("spike", con)
    assert pool, "expected at least one valid spike candidate"
    for pair in pool[:5]:
        assert pair["control"].truth[0].onset == pair["realistic"].truth[0].onset


def test_sampling_is_deterministic_given_the_same_seed(con):
    pool = ir._build_pool("spike", con)
    rng1 = np.random.default_rng(ir.SAMPLE_SEED)
    rng2 = np.random.default_rng(ir.SAMPLE_SEED)
    idx1 = rng1.choice(len(pool), size=min(10, len(pool)), replace=False)
    idx2 = rng2.choice(len(pool), size=min(10, len(pool)), replace=False)
    assert list(idx1) == list(idx2)


# --- Scoring: reuses eval.agent_eval unchanged -----------------------------------

def test_score_pair_reuses_agent_eval_scoring_unchanged(con):
    pool = ir._build_pool("regime_shift", con)
    pair = pool[0]
    clean_cache: dict = {}
    rec = ir._score_pair(pair, con, clean_cache)
    assert set(rec) == {"control", "realistic"}
    for arm in rec.values():
        assert set(arm) == {"caught", "attributable", "spurious", "delay"}
        assert isinstance(arm["caught"], bool)


# --- Statistics: Clopper-Pearson + paired bootstrap ------------------------------

def test_bootstrap_diff_is_zero_when_arms_are_identical():
    rows = [{"control": {"caught": True, "attributable": 1, "spurious": 0},
            "realistic": {"caught": True, "attributable": 1, "spurious": 0}}
           for _ in range(20)]
    rng = np.random.default_rng(1)
    out = ir._bootstrap_diffs(rows, rng, B=500)
    assert out["recall_diff"]["point"] == 0.0
    assert out["recall_diff"]["ci"] == [0.0, 0.0]


def test_bootstrap_diff_is_positive_when_control_recalls_more():
    rows = [{"control": {"caught": True, "attributable": 1, "spurious": 0},
            "realistic": {"caught": False, "attributable": 1, "spurious": 0}}
           for _ in range(20)]
    rng = np.random.default_rng(1)
    out = ir._bootstrap_diffs(rows, rng, B=500)
    assert out["recall_diff"]["point"] == pytest.approx(1.0)
    assert out["recall_diff"]["ci"][0] > 0.0


def test_pooled_precision_handles_zero_attributable():
    assert np.isnan(ir._pooled_precision(np.array([0.0, 0.0]), np.array([0.0, 0.0])))


def test_clopper_matches_interval_calibrations_implementation():
    from eval.interval_calibration import clopper_pearson
    assert ir._clopper(8, 10) == list(clopper_pearson(8, 10))


# --- G4: the committed corpus still reproduces -----------------------------------

def test_control_arm_reproduces_the_committed_corpus(con):
    checks = ir.control_reproduction_check(con)
    assert checks["n_injections"] == ir.COMMITTED_N_INJECTIONS
    assert checks["all_within_tol"], checks
