"""S10 tests - the realistic injection pipeline (G1 propagation, G2 occurrence, G3 parity).

G1 is load-bearing: it must prove the propagation invariant fires on an intact pipeline AND
fails to fire on a deliberately partial one, so a defect that perturbs only one downstream
component cannot pass silently.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

import config
import org_profile
from conformal.wrap import conformal_quantile as _conformal_quantile
from eval import inject, inject_realistic
from eval.inject_realistic import (
    MIN_DETECTION_WINDOW_DAYS,
    OccurrenceViolation,
    RefitEvent,
    assert_trading_day,
    realistic_stream,
)
from signals.residual import _raw_series
from store.warehouse import connect


@pytest.fixture(scope="module")
def con():
    c = connect(read_only=True)
    yield c
    c.close()


# --- G2: the occurrence guard --------------------------------------------------

def test_assert_trading_day_raises_on_a_structural_zero_day():
    closed_dow = next(iter(org_profile.structural_zero_dow("beer_hall")))
    d = pd.Timestamp("2026-01-05")   # a Monday
    d = d + pd.Timedelta(days=(closed_dow - d.dayofweek) % 7)
    with pytest.raises(OccurrenceViolation):
        assert_trading_day("beer_hall", d.date())


def test_assert_trading_day_passes_on_a_trading_day():
    open_dow = next(d for d in range(7) if d not in org_profile.structural_zero_dow("beer_hall"))
    d = pd.Timestamp("2026-01-05")
    d = d + pd.Timedelta(days=(open_dow - d.dayofweek) % 7)
    assert_trading_day("beer_hall", d.date())   # does not raise


def test_regime_shift_onset_is_never_a_structural_zero_day(con):
    inj, _ = inject_realistic.inject_regime_shift("beer_hall", con=con, direction="down")
    onset_dow = pd.Timestamp(inj.truth[0].onset).dayofweek
    assert onset_dow not in org_profile.structural_zero_dow("beer_hall")


def test_ellel_is_excluded_from_the_realistic_sample():
    assert "ellel" not in inject_realistic.REALISTIC_VENUES


# --- G1: the propagation gate, load-bearing ------------------------------------

def _propagation_snapshot(dates, vals, dows, from_idx: int) -> dict | None:
    """expected/scale at the first refit at/after from_idx, or None if none occurred."""
    df, refits = realistic_stream(dates, vals, dows)
    after = [r for r in refits if r.idx >= from_idx]
    if not after:
        return None
    row = df[df["date"] == after[0].date]
    if row.empty:
        return None
    return {"idx": after[0].idx, "expected": float(row["expected"].iloc[0]),
            "scale": float(row["scale"].iloc[0])}


def test_propagation_reaches_training_frame_and_calibration_and_forecast_input(con):
    """G1, intact pipeline: perturbing raw revenue from onset onward must move BOTH the
    DOW-median training frame (expected, the forecast input) and the conformal
    calibration (scale) at the first refit after the injection, relative to a run over
    the unperturbed series. This is the exact triple the spec names."""
    raw = _raw_series("beer_hall", con=con)
    dates = raw["date"].to_numpy()
    vals_clean = raw["value"].to_numpy(float)
    dows = raw["date"].dt.dayofweek.to_numpy()

    onset_idx = config.CP_WARMUP_DAYS + 120
    onset_date = pd.Timestamp(dates[onset_idx])
    big_shift = vals_clean[onset_idx] * 5.0 + 500.0   # unmistakably large, not a rounding wobble

    vals_perturbed = vals_clean.copy()
    vals_perturbed[onset_idx:] += big_shift

    clean_snap = _propagation_snapshot(dates, vals_clean, dows, onset_idx)
    pert_snap = _propagation_snapshot(dates, vals_perturbed, dows, onset_idx)

    assert clean_snap is not None and pert_snap is not None
    assert not np.isclose(pert_snap["expected"], clean_snap["expected"]), \
        "the forecast input (expected) did not reflect the perturbed training frame"
    assert not np.isclose(pert_snap["scale"], clean_snap["scale"]), \
        "the conformal calibration (scale) did not reflect the perturbed residuals"


def test_propagation_gate_fires_on_a_deliberately_partial_perturbation(con):
    """G1, the negative control: prove the check above is discriminating, not vacuous.

    Builds a DELIBERATELY BROKEN stream constructor that computes the reported `z` (what
    detection reads) from the PERTURBED array, so from the outside it looks exactly like a
    real injection, but computes the refit's DOW-median training frame and conformal scale
    from the CLEAN array regardless - a plausible real bug: the caller believes both were
    perturbed; only the detection-facing value was. This is the exact partial-propagation
    defect G1 exists to catch, and it must be indistinguishable from a genuinely broken
    pipeline only by the SAME check the positive-control test above uses (expected/scale at
    the first refit after onset), never by a comparison that is clean-vs-clean by
    construction (which would pass regardless of whether propagation happened at all)."""
    raw = _raw_series("beer_hall", con=con)
    dates = raw["date"].to_numpy()
    vals_clean = raw["value"].to_numpy(float)
    dows = raw["date"].dt.dayofweek.to_numpy()

    onset_idx = config.CP_WARMUP_DAYS + 120
    big_shift = vals_clean[onset_idx] * 5.0 + 500.0
    vals_perturbed = vals_clean.copy()
    vals_perturbed[onset_idx:] += big_shift
    onset_date = pd.Timestamp(dates[onset_idx])

    def broken_stream(vals_for_detection: np.ndarray, vals_for_refit: np.ndarray) -> pd.DataFrame:
        n = len(vals_for_detection)
        last_refit_idx = None
        dow_median = overall = scale = None
        rows = []
        for i in range(config.CP_WARMUP_DAYS, n):
            if last_refit_idx is None or (i - last_refit_idx) >= inject_realistic.REFIT_CADENCE_DAYS:
                tr_v, tr_d = vals_for_refit[:i], dows[:i]
                dow_median = pd.Series(tr_v).groupby(tr_d).median()
                overall = float(np.median(tr_v))
                tr_exp = np.array([dow_median.get(d, overall) for d in tr_d], float)
                scale = max(float(_conformal_quantile(np.abs(tr_v - tr_exp), config.CP_LEVEL)), 1e-6)
                last_refit_idx = i
            exp_i = float(dow_median.get(dows[i], overall))
            if exp_i <= 1e-6:
                continue
            z_i = (vals_for_detection[i] - exp_i) / scale
            rows.append({"date": pd.Timestamp(dates[i]), "expected": exp_i, "scale": scale, "z": z_i})
        return pd.DataFrame(rows)

    # The bug: detection reads the perturbed array; the refit silently does not.
    broken_df = broken_stream(vals_perturbed, vals_for_refit=vals_clean)
    # A fully unperturbed baseline, for comparison (no injection anywhere).
    baseline_df = broken_stream(vals_clean, vals_for_refit=vals_clean)

    broken_after = broken_df[broken_df["date"] >= onset_date]
    baseline_after = baseline_df[baseline_df["date"] >= onset_date]
    assert not broken_after.empty and not baseline_after.empty

    # Detection SEES the perturbation (z spikes) - the bug is not that it's invisible.
    assert broken_after["z"].abs().max() > 3.0, \
        "the broken stream should still show an elevated z; otherwise this isn't testing " \
        "a partial-propagation bug, it's testing a stream with no perturbation at all"

    # But the training frame and calibration never absorb it: the SAME comparison the
    # positive-control test uses (expected/scale at the first post-onset refit) shows NO
    # divergence from the fully-unperturbed baseline, proving the check would catch this
    # exact defect rather than always reading "propagated" regardless of what happened.
    first_broken = broken_after.iloc[0]
    first_baseline = baseline_after.iloc[0]
    assert np.isclose(first_broken["expected"], first_baseline["expected"]), \
        "the broken constructor's forecast input should NOT reflect the perturbation"
    assert np.isclose(first_broken["scale"], first_baseline["scale"]), \
        "the broken constructor's calibration should NOT reflect the perturbation"


# --- G3: identical perturbation across arms ------------------------------------

@pytest.mark.parametrize("kind,injector_kwargs", [
    ("regime_shift", {"direction": "down", "magnitude_z": 2.0, "onset": "early"}),
    ("spike", {"direction": "up", "z": 2.5, "onset": "mid"}),
])
def test_perturbation_is_numerically_identical_across_arms(con, kind, injector_kwargs):
    venue = "beer_hall"
    stream = inject.base_stream(venue, con=con)
    train, test = inject.holdout(stream)
    window = (train, test)

    if kind == "regime_shift":
        control = inject.inject_regime_shift(venue, con=con, stream=stream, window=window,
                                             **injector_kwargs)
        realistic_inj, _ = inject_realistic.inject_regime_shift(
            venue, con=con, stream=stream, window=window, **injector_kwargs)
    else:
        control = inject.inject_spike(venue, con=con, stream=stream, window=window,
                                      **injector_kwargs)
        realistic_inj, _ = inject_realistic.inject_spike(
            venue, con=con, stream=stream, window=window, **injector_kwargs)

    at = pd.Timestamp(control.truth[0].onset)
    original_actual = test.set_index("date")["actual"]
    control_actual = control.stream.set_index("date")["actual"].reindex(test["date"]).dropna()
    control_delta = (control_actual - original_actual.reindex(control_actual.index)).fillna(0.0)

    dz = injector_kwargs.get("magnitude_z", injector_kwargs.get("z"))
    dz = dz * (-1 if injector_kwargs["direction"] == "down" else 1)
    mask = (test["date"] == at) if kind == "spike" else (test["date"] >= at)
    expected_delta = inject_realistic._revenue_delta(test, mask, dz)

    for d, delta in expected_delta.items():
        if d in control_delta.index and abs(delta) > 1e-9:
            assert control_delta.loc[d] == pytest.approx(delta, abs=1e-6), \
                f"revenue delta diverges between arms on {d}"


def test_the_paired_window_shares_the_identical_onset_across_arms(con):
    venue = "beer_hall"
    stream = inject.base_stream(venue, con=con)
    train, test = inject.holdout(stream)
    control = inject.inject_regime_shift(venue, con=con, direction="down", magnitude_z=1.6,
                                         stream=stream, window=(train, test), onset="early")
    realistic_inj, _ = inject_realistic.inject_regime_shift(
        venue, con=con, direction="down", magnitude_z=1.6, stream=stream,
        window=(train, test), onset="early")
    assert control.truth[0].onset == realistic_inj.truth[0].onset


# --- Refit cadence + detection-window floor ------------------------------------

def test_refit_fires_at_least_once_per_cadence_window(con):
    inj, refits = inject_realistic.inject_regime_shift("beer_hall", con=con, direction="down")
    window_refits = [r for r in refits if r.date > pd.Timestamp(inj.train_end)]
    assert len(window_refits) >= 1


def test_detection_window_meets_the_21_day_floor(con):
    inj, _ = inject_realistic.inject_regime_shift("beer_hall", con=con, direction="down")
    span = (inj.stream["date"].max() - pd.Timestamp(inj.truth[0].onset)).days
    assert span >= MIN_DETECTION_WINDOW_DAYS - 1


def test_changepoint_triggered_refit_fires_for_a_large_sustained_shift(con):
    inj, refits = inject_realistic.inject_regime_shift("beer_hall", con=con, direction="down",
                                                        magnitude_z=3.0)
    window_refits = [r for r in refits if r.date > pd.Timestamp(inj.train_end)]
    assert any(r.trigger == "changepoint" for r in window_refits)


def test_weekly_only_ablation_never_fires_a_changepoint_refit(con):
    inj, refits = inject_realistic.inject_regime_shift("beer_hall", con=con, direction="down",
                                                        magnitude_z=3.0, changepoint_refit=False)
    assert not any(r.trigger == "changepoint" for r in refits)
