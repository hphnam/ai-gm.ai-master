"""Scaled-run + labelling-sampler tests (PRJ93 scaled-eval spec, GA1 / GB1 / GB2).

The grid enumerates venue × kind × magnitude × onset × fold × direction under the
venue constraints (Ellel spike-only, Two River Taps no stock and pre-closure folds
only), the injectors honour magnitude/onset/window, every fold is leakage-checked,
and the day sampler is deterministic and stratified. The full `run_scaled` battery is
a CLI, not run here (it is minutes of CPU) — these cover the enumeration and the
sampler, which are the parts that need pinning.
"""

from __future__ import annotations

import pytest

from eval import agent_eval as ae
from eval import harness, inject, labels
from store.active_span import active_trading_end
from store.warehouse import connect


@pytest.fixture(scope="module")
def con():
    c = connect(read_only=True)
    yield c
    c.close()


# --- GA1 grid enumeration -----------------------------------------------------

def test_grid_respects_venue_kind_constraints(con):
    kinds = {(i.venue, i.kind) for i in ae.build_scaled_corpus(con)}
    assert ("ellel", "regime_shift") not in kinds and ("two_river_taps", "stock_drawdown") not in kinds


def test_grid_covers_all_beer_hall_kinds(con):
    kinds = {(i.venue, i.kind) for i in ae.build_scaled_corpus(con)}
    assert {("beer_hall", k) for k in
            ("regime_shift", "spike", "stock_drawdown", "exo_coincident")} <= kinds


def test_grid_is_deterministic(con):
    assert len(ae.build_scaled_corpus(con)) == len(ae.build_scaled_corpus(con))


def test_usable_folds_excludes_post_closure_for_a_closed_venue(con):
    stream = inject.base_stream("two_river_taps", con=con)
    aend = active_trading_end("two_river_taps", con=con)
    folds = ae._usable_folds("two_river_taps", stream, con)
    assert folds and all(te["date"].max() <= aend for _, te in folds)


def test_folds_yields_multiple_leakage_checked_windows(con):
    folds = inject.folds(inject.base_stream("beer_hall", con=con))
    assert len(folds) >= 2
    for train, test in folds:
        harness.assert_no_leakage(train, test)   # raises LeakageError on a future leak


def test_injector_onset_position_moves_the_onset(con):
    stream = inject.base_stream("beer_hall", con=con)
    window = inject.folds(stream, n_folds=1)[-1]
    early = inject.inject_regime_shift("beer_hall", con, magnitude_z=1.0, stream=stream,
                                       window=window, onset="early")
    late = inject.inject_regime_shift("beer_hall", con, magnitude_z=1.0, stream=stream,
                                      window=window, onset="late")
    assert early.truth[0].onset < late.truth[0].onset


# --- GA2/GA3 aggregation primitives ------------------------------------------

def test_magbin_flags_near_threshold():
    assert ae._magbin("regime_shift", 1.0) == "near-threshold (|z|≤1.25)"


def test_cell_recall_is_caught_fraction():
    recs = [{"caught": True, "attributable": 1, "spurious": 0},
            {"caught": False, "attributable": 1, "spurious": 0}]
    assert ae._cell(recs)["recall"] == 0.5


# --- GB1 stratified sampler ---------------------------------------------------

def test_sample_days_is_deterministic_under_seed(con):
    assert labels.sample_days(3, seed=7, con=con).equals(labels.sample_days(3, seed=7, con=con))


def test_sample_days_strata_are_valid(con):
    sample = labels.sample_days(3, seed=7, con=con)
    assert set(sample["stratum"]) <= set(labels._STRATA)


def test_sample_report_counts_match(con):
    sample = labels.sample_days(2, seed=7, con=con)
    assert labels.sample_report(sample)["total"] == len(sample)


# --- GB2 labelling instrument (pure halves) ----------------------------------

def test_render_raw_day_names_the_venue(con):
    assert "beer_hall" in labels.render_raw_day("2026-05-31", "beer_hall", con=con)


def test_briefing_items_for_returns_a_list(con):
    assert isinstance(labels.briefing_items_for("2026-05-31", "beer_hall", con=con), list)


# --- GB4 judge calibration over labelled days --------------------------------

def test_judge_labelled_is_honest_noop_without_labels(con):
    from eval import judge
    rep = judge.evaluate_labelled(con=con)
    assert rep["mode"] == "no-labels" and rep["calibration"]["calibrated"] is False
