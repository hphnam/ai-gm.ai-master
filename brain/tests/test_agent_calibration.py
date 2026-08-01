"""S8a gates: the offline agent evaluation is replayable, calibrated honestly, and its
cost-sensitive threshold and agent-versus-constants machinery are correct.

Store-independent and network-independent: every test runs on synthetic records or a
synthetic cache, so an examiner with no key and no store reproduces them. The real 644-call
numbers are S8b; these pin the machinery those numbers will flow through.
"""

from __future__ import annotations

import numpy as np
import pytest

import config
from eval import agent_cache
from eval import agent_calibration as ac
from signals import agent

# --- Fixtures: synthetic scenarios + records ---------------------------------

_ITEMS = [{
    "item_key": "beer_hall:down:2026-05-20:change_point", "headline": "sustained dip",
    "reason": "coincides with a cold snap", "severity": "high", "direction": "down",
    "status": "new", "score": 3.21, "caveats": [],
    "head": {"source": "change_point", "onset_date": "2026-05-20", "direction": "down",
             "severity": "high", "magnitude": 18.0, "payload": {"magnitude_pct": -18.0}},
}]
_CONTEXT = {"venue": "beer_hall", "venue_label": "Beer Hall", "as_of": "2026-05-31",
            "event_driven": False}


def _calibrated_corpus() -> list[dict]:
    """Perfectly calibrated: at each probability level, exactly that fraction of items are
    real. On such a corpus the Bayes threshold t=1/(1+r) minimises expected cost."""
    recs = []
    for p in (0.1, 0.3, 0.5, 0.7, 0.9):
        n_real = round(p * 100)
        recs += [{"item_key": f"{p}:{i}", "constant_score": p, "p_raise": p,
                  "truth": i < n_real} for i in range(100)]
    return recs


def _two_bin_corpus() -> list[dict]:
    """10 items at p=0.9 with 8 real, 10 at p=0.1 with 1 real. Hand ECE = 0.5*0.1 = 0.05."""
    hi = [{"item_key": f"hi{i}", "constant_score": 0.9, "p_raise": 0.9, "truth": i < 8}
          for i in range(10)]
    lo = [{"item_key": f"lo{i}", "constant_score": 0.1, "p_raise": 0.1, "truth": i < 1}
          for i in range(10)]
    return hi + lo


# --- Part 1/2: the agent contract + zero-call cache replay (G2) ---------------

def test_prompt_hash_is_stable():
    assert agent.prompt_hash() == agent.prompt_hash()


def test_payload_is_deterministic():
    a = agent.payload_json(agent.build_payload(_ITEMS, _CONTEXT))
    b = agent.payload_json(agent.build_payload(_ITEMS, _CONTEXT))
    assert a == b


def test_parse_response_rejects_missing_item():
    with pytest.raises(ValueError):
        agent.parse_response({"verdicts": []}, _ITEMS)


def test_parse_response_rejects_out_of_range_probability():
    resp = {"verdicts": [{"item_key": _ITEMS[0]["item_key"], "p_raise": 1.5, "rationale": "x"}]}
    with pytest.raises(ValueError):
        agent.parse_response(resp, _ITEMS)


def test_cache_replays_without_a_network_call(tmp_path):
    """G2: a cached scenario replays from disk and the live seam is never touched."""
    cache = agent_cache.ResponseCache(allow_live=False, path=tmp_path / "c.json")
    cache.live_fn = lambda payload: pytest.fail("live seam called during replay")
    key = cache.key(agent.build_payload(_ITEMS, _CONTEXT))
    cache.store = {key: {"model": config.AGENT_MODEL, "prompt_hash": agent.prompt_hash(),
                         "response": {"verdicts": [{"item_key": _ITEMS[0]["item_key"],
                                                    "p_raise": 0.73, "rationale": "cached"}]}}}
    verdicts = agent.score_scenario(_ITEMS, _CONTEXT, execute=cache.execute)
    assert verdicts[0].p_raise == 0.73


def test_cache_replay_makes_zero_live_calls(tmp_path):
    cache = agent_cache.ResponseCache(allow_live=False, path=tmp_path / "c.json")
    key = cache.key(agent.build_payload(_ITEMS, _CONTEXT))
    cache.store = {key: {"response": {"verdicts": [{"item_key": _ITEMS[0]["item_key"],
                                                    "p_raise": 0.5, "rationale": "c"}]}}}
    agent.score_scenario(_ITEMS, _CONTEXT, execute=cache.execute)
    assert cache.calls == 0


def test_offline_cache_miss_raises(tmp_path):
    """Stop condition: an uncached scenario in offline mode is a hard miss, not a fallback."""
    cache = agent_cache.ResponseCache(allow_live=False, path=tmp_path / "c.json")
    with pytest.raises(agent_cache.CacheMiss):
        agent.score_scenario(_ITEMS, _CONTEXT, execute=cache.execute)


def test_editing_the_prompt_changes_the_cache_key(tmp_path):
    """The key folds in the prompt hash, so a different prompt version keys elsewhere."""
    payload = agent.build_payload(_ITEMS, _CONTEXT)
    c1 = agent_cache.ResponseCache(allow_live=False, path=tmp_path / "c.json")
    c2 = agent_cache.ResponseCache(allow_live=False, path=tmp_path / "c.json")
    c2.prompt_hash = "deadbeef" + c2.prompt_hash[8:]
    assert c1.key(payload) != c2.key(payload)


# --- Part 3: the cost-sensitive threshold ------------------------------------

def test_implied_threshold_is_the_bayes_point():
    assert ac.implied_threshold(1.0) == 0.5
    assert ac.implied_threshold(4.0) == pytest.approx(0.2)
    assert ac.implied_threshold(0.25) == pytest.approx(0.8)


def test_threshold_sweep_recovers_the_known_optimum():
    """On calibrated data, at ratio 4:1 the grid threshold that minimises expected cost is
    the Bayes threshold 0.2, which is exactly the swept threshold for that ratio."""
    recs = _calibrated_corpus()
    p = np.array([r["p_raise"] for r in recs])
    y = np.array([r["truth"] for r in recs], bool)
    costs = {ac.implied_threshold(r): ac._decision_metrics(p >= ac.implied_threshold(r), y, 4.0)
             ["expected_cost"] for r in config.AGENT_COST_RATIOS}
    assert min(costs, key=costs.get) == ac.implied_threshold(4.0)


def test_lower_threshold_raises_more_at_higher_miss_cost():
    """A higher miss:false-alarm ratio lowers the threshold, so at least as many items are
    raised."""
    recs = _calibrated_corpus()
    sweep = {row["ratio"]: row["raised"] for row in ac.cost_sweep(recs)}
    assert sweep[4.0] >= sweep[0.25]


# --- Part 4: calibration -----------------------------------------------------

def test_ece_matches_a_hand_computed_case():
    cal = ac.calibration(_two_bin_corpus(), n_bins=10, min_bin=10)
    assert cal["ece"] == pytest.approx(0.05)


def test_a_probability_on_a_bin_edge_falls_in_the_lower_bin():
    """Guo et al. use `(lo, hi]`, so p = 0.7 belongs to (0.6, 0.7], not [0.7, 0.8).
    With equal-width bins the edges are round decimals, which is exactly what a
    temperature-0 model emits, so this convention decides where most of the mass sits."""
    recs = [{"item_key": str(i), "constant_score": 0.0, "p_raise": 0.7, "truth": True}
            for i in range(10)]
    cal = ac.calibration(recs, n_bins=10, min_bin=10)
    occupied = next(b for b in cal["bins"] if b["n"])
    assert occupied["hi"] == pytest.approx(0.7)


def test_zero_is_kept_by_the_first_bin_which_stays_closed_at_the_left():
    recs = [{"item_key": str(i), "constant_score": 0.0, "p_raise": 0.0, "truth": False}
            for i in range(10)]
    cal = ac.calibration(recs, n_bins=10, min_bin=10)
    assert sum(b["n"] for b in cal["bins"]) == 10


def _overconfident(n=200, seed=93):
    """Truth is Bernoulli(0.5 + 0.4*s) but the agent reports a far sharper probability."""
    rng = np.random.default_rng(seed)
    out = []
    for i in range(n):
        s = rng.uniform(-1, 1)
        true_p = 0.5 + 0.4 * s
        stated = 0.5 + 0.499 * np.sign(s) * abs(s) ** 0.3   # pushed toward 0/1
        out.append({"item_key": str(i), "constant_score": 0.0,
                    "p_raise": float(np.clip(stated, 0.001, 0.999)),
                    "truth": bool(rng.random() < true_p)})
    return out


def test_temperature_scaling_softens_an_overconfident_agent():
    fit = ac.fit_temperature(_overconfident())
    assert fit["temperature"] > 1.0


def test_temperature_scaling_improves_ece_on_an_overconfident_agent():
    fit = ac.fit_temperature(_overconfident())
    assert fit["ece_after"] < fit["ece_before"]


def test_temperature_scaling_preserves_the_ranking():
    """The map is strictly monotone, so it cannot change any ordering or threshold sweep."""
    recs = _overconfident()
    fit = ac.fit_temperature(recs)
    p = np.array([r["p_raise"] for r in recs])
    scaled = ac._sigmoid(ac._logit(p) / fit["temperature"])
    assert np.array_equal(np.argsort(p, kind="stable"),
                          np.argsort(scaled, kind="stable"))


def test_temperature_scaling_declines_a_single_outcome_corpus():
    recs = [{"item_key": str(i), "constant_score": 0.0, "p_raise": 0.6, "truth": True}
            for i in range(20)]
    assert ac.fit_temperature(recs)["fitted"] is False


def test_brier_matches_a_hand_computed_case():
    # 10 items p=0.9 (8 real -> (0.9-1)^2*8 + (0.9-0)^2*2), 10 items p=0.1 (1 real).
    hand = (8 * 0.1 ** 2 + 2 * 0.9 ** 2 + 1 * 0.9 ** 2 + 9 * 0.1 ** 2) / 20
    cal = ac.calibration(_two_bin_corpus(), n_bins=10, min_bin=10)
    assert cal["brier"] == pytest.approx(hand, abs=1e-4)


def test_calibration_coarsens_below_the_bin_floor():
    """Many tiny bins trigger the G3 coarsening, so no occupied bin is under the floor."""
    recs = [{"item_key": str(i), "constant_score": 0.0,
             "p_raise": i / 100.0, "truth": i % 2 == 0} for i in range(100)]
    cal = ac.calibration(recs, n_bins=50, min_bin=10)
    assert min(b["n"] for b in cal["bins"] if b["n"]) >= 10


def test_coarsening_holds_floor_on_tie_heavy_probabilities():
    """Temperature-0 probabilities cluster on round numbers; quantile edges collapse on the
    ties and leave a sub-floor bin. The checked greedy merge must still hold the floor."""
    ps = [0.01, 0.02] + [0.5] * 38 + [0.99]
    recs = [{"item_key": str(i), "constant_score": 0.0, "p_raise": p, "truth": i % 2 == 0}
            for i, p in enumerate(ps)]
    cal = ac.calibration(recs, n_bins=10, min_bin=10)
    assert min(b["n"] for b in cal["bins"] if b["n"]) >= 10


def test_calibration_below_floor_uses_one_stated_bin_not_zero():
    """A sample smaller than the floor collapses to a single stated bin with a real ECE, not
    zero bins with a falsely perfect ECE of 0."""
    recs = [{"item_key": str(i), "constant_score": 0.0, "p_raise": 0.4, "truth": i < 4}
            for i in range(5)]
    cal = ac.calibration(recs, min_bin=10)
    occupied = [b for b in cal["bins"] if b["n"]]
    assert len(occupied) == 1 and occupied[0]["n"] == 5 and cal["ece"] == pytest.approx(0.4)


def test_calibration_reports_detection_not_intervention():
    assert ac.calibration(_two_bin_corpus())["kind"] == "detection"


# --- Part 5: agent versus the six constants ----------------------------------

def test_agent_tracking_constants_is_decorative():
    """When the agent's p_raise ranks items the same way the constant score does, they raise
    the same set: the disagreement is zero and the LLM is decorative (the stop condition)."""
    recs = [{"item_key": str(i), "constant_score": float(i), "p_raise": i / 20.0,
             "truth": i >= 10} for i in range(20)]
    out = ac.agent_vs_constants(recs, b=100)
    assert out["decorative"] is True


def test_disagreement_is_reported_when_deciders_diverge():
    """Agent raises the low-score items, the constant scorer raises the high-score ones:
    they disagree on every raised item."""
    recs = [{"item_key": str(i), "constant_score": float(i), "p_raise": (19 - i) / 20.0,
             "truth": i >= 10} for i in range(20)]
    out = ac.agent_vs_constants(recs, b=100)
    assert out["disagreement_rate"] > 0.0


def test_paired_bootstrap_returns_a_confidence_interval():
    out = ac.agent_vs_constants(_calibrated_corpus(), b=500)
    ci = out["bootstrap"]["delta_ask_f1"]
    assert ci["lo"] <= ci["mean"] <= ci["hi"]
