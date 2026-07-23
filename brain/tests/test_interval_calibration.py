"""S7 G17h - the conformal methods and the power analysis. Store/network/Chronos independent
(synthetic residuals, no ETS or Chronos), so it runs in CI where the models never do."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from conformal.methods import (
    ACI,
    AgACI,
    mondrian_band,
    perstep_band,
    plain_band,
    safe_conformal_quantile,
)
from eval.interval_calibration import (
    arm_metrics,
    clopper_pearson,
    power_analysis,
    run_online,
)


# --- Part 1: the power calculation (G1) --------------------------------------

def test_power_1_00_on_seven_points_does_not_support_miscalibration():
    out = power_analysis(n=7, level=0.90, coverage=1.0)
    assert out["supports_miscalibration"] is False


def test_power_probability_all_seven_inside_is_nominal_to_the_seventh():
    out = power_analysis(n=7, level=0.90, coverage=1.0)
    assert out["p_all_in_if_calibrated"] == pytest.approx(0.90 ** 7, abs=1e-9)


def test_power_clopper_pearson_on_seven_of_seven_contains_nominal():
    out = power_analysis(n=7, level=0.90, coverage=1.0)
    lo, hi = out["clopper_pearson_95"]
    assert lo < 0.90 <= hi  # the interval on 1.00 straddles the nominal 0.90


def test_clopper_pearson_full_success_lower_bound():
    lo, hi = clopper_pearson(7, 7)
    assert hi == 1.0
    assert lo == pytest.approx(0.025 ** (1 / 7), abs=1e-6)


# --- G4: AgACI reduces to a single ACI on a degenerate grid -------------------

def _synthetic_pool(seed=0, n=400):
    rng = np.random.default_rng(seed)
    return np.abs(rng.normal(0, 100, n)), rng.integers(1, 8, n)


def test_agaci_single_gamma_reduces_to_aci():
    pool_res, pool_step = _synthetic_pool()
    rng = np.random.default_rng(1)
    aci = ACI(level=0.90, gamma=0.02)
    agaci = AgACI(level=0.90, gammas=(0.02,), eta=1.0)
    steps = np.arange(1, 8)
    max_diff = 0.0
    for _ in range(30):
        yhat = rng.normal(500, 50, 7)
        lo_a, hi_a = aci.band(pool_res, pool_step, yhat, steps)
        lo_g, hi_g = agaci.band(pool_res, pool_step, yhat, steps)
        max_diff = max(max_diff, float(np.max(np.abs(lo_a - lo_g))),
                       float(np.max(np.abs(hi_a - hi_g))))
        y = yhat + rng.normal(0, 80, 7)
        for i, h in enumerate(steps):
            aci.update_step(int(h), y[i], lo_a[i], hi_a[i])
            los, his = agaci.last_experts[int(h)]
            agaci.update_step(int(h), y[i], los, his)
    assert max_diff == 0.0


# --- G3: the ACI level is constrained loudly, not clipped silently -----------

def test_aci_counts_clamps_when_gamma_forces_the_level_out_of_range():
    pool_res, pool_step = _synthetic_pool()
    aci = ACI(level=0.90, gamma=5.0)  # a huge rate drives the effective alpha out of [0, 1]
    steps = np.arange(1, 8)
    for _ in range(20):
        lo, hi = aci.band(pool_res, pool_step, np.full(7, 500.0), steps)
        for i, h in enumerate(steps):
            aci.update_step(int(h), 1e9, lo[i], hi[i])  # always a miss -> alpha driven below 0
    assert aci.clamps > 0
    assert aci.excursion_lo < 0.0


def test_aci_clamped_level_never_leaves_unit_interval():
    aci = ACI(level=0.90, gamma=0.5)
    aci.eff[3] = -0.4  # force an excursion
    lvl = aci._clamped_level(3)
    assert 0.0 <= lvl <= 1.0
    assert aci.clamps == 1


# --- Method correctness ------------------------------------------------------

def test_safe_quantile_endpoints():
    s = np.arange(1.0, 11.0)
    assert safe_conformal_quantile(s, 0.0) == 0.0
    assert safe_conformal_quantile(s, 1.0) == 10.0


def test_perstep_uses_a_separate_quantile_per_step():
    # Step 1 residuals are tiny, step 7 residuals are large; per-step must give a wider band
    # at step 7 than at step 1, which pooling could not.
    pool_step = np.array([1] * 50 + [7] * 50)
    pool_res = np.concatenate([np.full(50, 10.0), np.full(50, 200.0)])
    yhat = np.array([500.0, 500.0])
    steps = np.array([1, 7])
    lo, hi = perstep_band(0.90, pool_res, pool_step, yhat, steps)
    assert (hi - lo)[1] > (hi - lo)[0]


def test_mondrian_uses_a_separate_quantile_per_state():
    pool_state = np.array([0] * 50 + [1] * 50)
    pool_res = np.concatenate([np.full(50, 200.0), np.full(50, 10.0)])
    yhat = np.array([500.0, 500.0])
    states = np.array([0, 1])
    lo, hi = mondrian_band(0.90, pool_res, pool_state, yhat, states)
    assert (hi - lo)[0] > (hi - lo)[1]  # active (state 0) band wider than the zero-day band


def test_online_pass_covers_near_nominal_on_exchangeable_residuals():
    # A stationary iid series: split conformal must cover close to (and no far below) nominal.
    rng = np.random.default_rng(3)
    dates = pd.date_range("2025-01-01", periods=320, freq="D")
    actual = {d: 1000.0 + rng.normal(0, 200) for d in dates}
    rows = []
    for i, o in enumerate(dates):
        if i + 7 >= len(dates):
            break
        for h in range(1, 8):
            tgt = dates[i + h]
            rows.append({"origin": o, "step": h, "target": tgt, "y": actual[tgt],
                         "yhat": 1000.0, "res": abs(actual[tgt] - 1000.0), "state": 0})
    out = run_online(pd.DataFrame(rows), 0.90, eta=0.001, warmup=140)
    cov = arm_metrics(out["S"], 0.90)["marginal"]["coverage"]
    assert 0.87 <= cov <= 0.94
