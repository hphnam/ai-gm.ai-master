"""S1 G17a tests: the one scale ruler, its four bases, and RMSSE.

Everything here is on synthetic arrays with hand-computable answers. The
venue-level reproduction (the four scales per venue, and the July W1 MASE on each)
is deliberately NOT asserted here: those numbers are a function of the store
ceiling, and the suite rebuilds the store to the 2026-05-31 seed part-way through
(`tests/test_a10_service.py`), so a store-backed assertion would pass or fail
depending on test order. That reproduction is a gate run against the restored
clock and is recorded in `brain/log/42_G17a_Metric_Integrity.md`.
"""

from __future__ import annotations

import numpy as np
import pytest

from eval import harness

# Three lag-7 pairs, chosen so every basis has a different, exact answer:
#   pairs are (13,10), (0,0), (39,30) -> diffs 3, 0, 9
PAIRED = np.array([10.0, 0.0, 30.0, 0.0, 0.0, 0.0, 0.0, 13.0, 0.0, 39.0])


def test_calendar_lag7_averages_every_pair_including_the_zero_one():
    assert harness.seasonal_naive_scale(PAIRED, basis="calendar_lag7") == 4.0


def test_calendar_lag7_active_drops_the_structural_zero_pair():
    assert harness.seasonal_naive_scale(PAIRED, basis="calendar_lag7_active") == 6.0


def test_structural_zero_count_is_reported_against_the_total():
    assert harness.structural_zero_diffs(PAIRED) == (1, 3)


def test_active_pair_count_is_the_sample_the_active_basis_used():
    assert harness.active_pair_count(PAIRED) == 2


def test_active_pairs_are_not_total_minus_zero_diffs():
    """The two diagnostics count different populations and must never be
    subtracted from each other: a difference is zero when both endpoints are zero
    OR when two trading days happen to be equal, but the active basis drops a pair
    when EITHER endpoint is zero. Here every pair is trading-against-trading so the
    active basis keeps all three, while one of them differences to zero because 30
    recurs. Subtracting would understate the sample by that pair."""
    series = np.array([10.0, 30.0, 50.0, 0.0, 0.0, 0.0, 0.0, 13.0, 30.0, 55.0])
    zero_diffs, total = harness.structural_zero_diffs(series)
    assert harness.active_pair_count(series) == 3 != total - zero_diffs


def test_trading_lag7_reads_the_series_it_is_given_at_lag_seven():
    trading = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 9.0, 12.0])
    # pairs (9,1) and (12,2) -> diffs 8 and 10
    assert harness.seasonal_naive_scale(trading, basis="trading_lag7") == 9.0


def test_same_weekday_lag_is_derived_from_trading_density_not_hard_coded():
    assert harness.same_weekday_lag(n_trading_days=10, n_calendar_days=70) == 1
    assert harness.same_weekday_lag(n_trading_days=302, n_calendar_days=399) == 5
    assert harness.same_weekday_lag(n_trading_days=68, n_calendar_days=392) == 1


def test_trading_same_weekday_differences_at_the_derived_lag():
    trading = np.array([1.0, 2.0, 4.0, 7.0, 11.0, 16.0, 22.0, 29.0, 37.0, 46.0])
    # 10 trading days over 70 calendar days -> lag 1 -> diffs 1..9 -> mean 5
    scale = harness.seasonal_naive_scale(
        trading, basis="trading_same_weekday", n_calendar_days=70)
    assert scale == 5.0


def test_a_basis_is_required_with_no_default():
    with pytest.raises(TypeError):
        harness.seasonal_naive_scale(PAIRED)


def test_an_unrecognised_basis_raises_rather_than_falling_back():
    with pytest.raises(harness.UnknownBasisError):
        harness.seasonal_naive_scale(PAIRED, basis="calendar_lag14")


def test_same_weekday_basis_refuses_to_guess_the_calendar_length():
    with pytest.raises(ValueError):
        harness.seasonal_naive_scale(PAIRED, basis="trading_same_weekday")


def test_scale_is_nan_when_the_series_is_shorter_than_its_lag():
    assert np.isnan(harness.seasonal_naive_scale(
        np.array([1.0, 2.0, 3.0]), basis="calendar_lag7"))


# --- RMSSE against a hand-computed case --------------------------------------

# lag-7 pairs (13,10), (26,20), (39,30) -> diffs 3, 6, 9
HAND = np.array([10.0, 20.0, 30.0, 0.0, 0.0, 0.0, 0.0, 13.0, 26.0, 39.0])
HAND_TRUE = np.array([10.0, 12.0])
HAND_PRED = np.array([8.0, 15.0])


def test_rmsse_denominator_is_the_mean_squared_seasonal_difference():
    # (3^2 + 6^2 + 9^2) / 3 = 42
    assert harness.seasonal_naive_squared_scale(HAND, basis="calendar_lag7") == 42.0


def test_rmsse_matches_the_hand_computed_value():
    # errors 2 and -3 -> mean square 6.5; sqrt(6.5 / 42)
    expected = float(np.sqrt(6.5 / 42.0))
    got = harness.rmsse(HAND_TRUE, HAND_PRED, HAND, basis="calendar_lag7")
    assert got == pytest.approx(expected, abs=1e-12)


def test_mase_matches_the_hand_computed_value_on_the_same_series():
    # mean |error| 2.5, scale (3 + 6 + 9) / 3 = 6
    got = harness.mase(HAND_TRUE, HAND_PRED, HAND, basis="calendar_lag7")
    assert got == pytest.approx(2.5 / 6.0, abs=1e-12)


# An intermittent week: seven zeros and one spike. Predicting zero throughout is
# the median-optimal answer and never anticipates the spike; spreading the same
# mass evenly is the mean-optimal one. The two metrics rank them oppositely, which
# is why M5 scores a 73 percent intermittent corpus on RMSSE and not MASE.
SPIKY_TRUTH = np.array([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 100.0])
ALL_ZERO_FORECAST = np.zeros(8)
SPREAD_FORECAST = np.full(8, 12.5)


def test_mase_prefers_the_zero_forecast_on_an_intermittent_week():
    assert harness.mase(SPIKY_TRUTH, ALL_ZERO_FORECAST, HAND, basis="calendar_lag7") < \
        harness.mase(SPIKY_TRUTH, SPREAD_FORECAST, HAND, basis="calendar_lag7")


def test_rmsse_prefers_the_spread_forecast_on_the_same_week():
    assert harness.rmsse(SPIKY_TRUTH, SPREAD_FORECAST, HAND, basis="calendar_lag7") < \
        harness.rmsse(SPIKY_TRUTH, ALL_ZERO_FORECAST, HAND, basis="calendar_lag7")


# --- The ruler object --------------------------------------------------------

def _ruler() -> harness.VenueRuler:
    """A ruler built without a store, so the assertions below are deterministic."""
    trading = np.array([10.0, 30.0, 13.0, 39.0, 50.0, 61.0, 72.0, 84.0, 97.0])
    zero_diffs, total_diffs = harness.structural_zero_diffs(PAIRED)
    return harness.VenueRuler(
        venue="synthetic",
        n_trading_days=int(trading.size),
        n_calendar_days=int(PAIRED.size),
        same_weekday_lag=harness.same_weekday_lag(trading.size, PAIRED.size),
        zero_lag7_diffs=zero_diffs,
        total_lag7_diffs=total_diffs,
        active_lag7_pairs=harness.active_pair_count(PAIRED),
        scales={
            "calendar_lag7": harness.seasonal_naive_scale(
                PAIRED, basis="calendar_lag7"),
            "trading_lag7": harness.seasonal_naive_scale(
                trading, basis="trading_lag7"),
            "trading_same_weekday": harness.seasonal_naive_scale(
                trading, basis="trading_same_weekday", n_calendar_days=PAIRED.size),
            "calendar_lag7_active": harness.seasonal_naive_scale(
                PAIRED, basis="calendar_lag7_active"),
        },
        trading=trading,
        calendar=PAIRED,
    )


def test_ruler_routes_calendar_bases_to_the_calendar_series():
    assert _ruler().series_for("calendar_lag7_active") is PAIRED


def test_ruler_routes_trading_bases_to_the_trading_series():
    r = _ruler()
    assert r.series_for("trading_lag7") is r.trading


def test_ruler_rejects_an_unknown_basis():
    with pytest.raises(harness.UnknownBasisError):
        _ruler().series_for("nonsense")


def test_ruler_mase_uses_the_basis_specific_denominator():
    r = _ruler()
    truth, pred = np.array([10.0, 12.0]), np.array([8.0, 15.0])
    assert r.mase(truth, pred, "calendar_lag7") == pytest.approx(2.5 / 4.0)
    assert r.mase(truth, pred, "calendar_lag7_active") == pytest.approx(2.5 / 6.0)


def test_metric_row_carries_every_basis_and_names_the_one_it_reports():
    r = _ruler()
    truth, pred = np.array([10.0, 12.0]), np.array([8.0, 15.0])
    row = harness.venue_metric_row(r, truth, pred, reported_basis="calendar_lag7")
    assert set(row["mase"]) == set(harness.SCALE_BASES)
    assert row["reported_basis"] == "calendar_lag7"
    assert row["scale"] == pytest.approx(4.0)


def test_metric_row_reports_width_alongside_coverage():
    """The confrontation defect S1 also closes: coverage without the width that
    bought it makes an over-wide band look like a success."""
    r = _ruler()
    truth = np.array([10.0, 12.0])
    pred = np.array([8.0, 15.0])
    lo, hi = np.array([-100.0, -100.0]), np.array([100.0, 100.0])
    row = harness.venue_metric_row(
        r, truth, pred, lo, hi, reported_basis="calendar_lag7")
    assert row["empirical_coverage"] == 1.0
    assert row["mean_width"] == 200.0


def test_reported_basis_is_one_of_the_four():
    assert harness.REPORTED_BASIS in harness.SCALE_BASES
