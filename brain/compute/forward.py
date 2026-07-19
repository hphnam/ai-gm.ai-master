"""The forward projection: the forecast the service exists to produce.

Phase 2 wired compute to `conformal.wrap.evaluate`, which is a **backtest**. It walks
the series in 7-day blocks, bands each block from residuals accumulated strictly before
it, and persists the last `TEST_WEEKS` as its deliverable. Those are forecasts for days
that have already happened - the coverage evidence for report 31's gate, and exactly
what Objective 1 needed. What it is not is a prediction. Measured on the Phase 2 engine:
57 rows returned, 57 for dates inside the supplied history, 0 for any date after it.

So `horizon_days` was not merely "not honoured" (the Phase 2 diagnostic's wording): the
engine had no forward horizon to honour it with. The caller's field asking for a 7-day
forecast addressed a code path that produced none.

This module is that path. It reuses the pieces already validated rather than inventing a
second forecaster: the same `rolling_point_forecasts` residual stream `evaluate` builds,
the same Mondrian grouping, the same conformal quantile, and - after review caught the
first cut breaking its own rule - the same `calendar_features` and `_attach_exog` that
build the TRAINING frame. That rule is the module's whole premise: every covariate must
be produced by the SAME function that produced the training column of that name. A
forward frame that computes `exo_is_school_term` its own way is train/serve skew wearing
a helper's clothing, and the model is then scored on one definition and served another.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

import org_profile
from compute.contract import MAX_HORIZON_DAYS, BandRow, ComputeDataset, ForecastRow
from config import BAND_CALIB_DAYS, CONFORMAL_LEVELS
from conformal.wrap import (
    _mondrian_quantiles,
    _predictor,
    conformal_quantile,
    rolling_point_forecasts,
)

# Below this many calibrated residuals the conformal quantile is not a quantile of
# anything - it is the max of a handful of errors. A point forecast with an honestly
# absent band beats one carrying a band that means nothing.
MIN_CALIB_RESIDUALS = 30

# The block size the residual stream is built from: every residual is a <=7-step-ahead
# error. This is a property of the CALIBRATION METHOD and is deliberately NOT the same
# symbol as `contract.MAX_HORIZON_DAYS`, which is a SERVING limit that happens to equal
# it today. Aliasing them reads tidy and runs the wrong way: raising the contract cap to
# 30 once FLAG-BAND-HORIZON is closed would silently rebuild the stream from 30-day
# blocks (3 blocks x 30 = 90 residuals, still over MIN_CALIB_RESIDUALS, so nothing raises
# and no test fails) - the banding method changed as a side effect of a contract edit.
_CALIB_BLOCK_DAYS = 7

# The cap may never outrun what the blocks calibrate. Whoever lifts one must confront the
# other, which is the whole point of FLAG-BAND-HORIZON.
#
# A `raise`, not an `assert`: asserts are stripped under `python -O`, and a guard that
# disappears in the configuration most likely to be production is not a guard.
#
# G15b (round 4): the guard used to read `MAX_HORIZON_DAYS > _CALIB_BLOCK_DAYS`, which
# fires on the path that was TESTED (raising the contract cap to 30) and not on the
# symmetric one. Raising `_CALIB_BLOCK_DAYS` to 30 instead gives `7 > 30`, no raise, and
# `rolling_point_forecasts(horizon=30)` rebuilds the residual stream from 30-day blocks -
# every residual becomes a <=30-step error and the BANDING METHOD changes underneath a
# 7-day horizon, silently, which is the exact side effect splitting the two symbols was
# meant to make impossible. The drift is toward over-coverage, split conformal's safe
# direction, so nothing would have failed and nothing would have looked wrong.
#
# Equality, not inequality: the two are only in a defensible state when they agree.
# Testing the symmetric case of an asymmetric guard is how the third round's defect
# should have been caught, so it is now done by construction.
if MAX_HORIZON_DAYS != _CALIB_BLOCK_DAYS:
    raise RuntimeError(
        f"horizon_days is capped at {MAX_HORIZON_DAYS} but the band is calibrated on "
        f"{_CALIB_BLOCK_DAYS}-day blocks. These must agree: serving past the block size "
        "leaves the band uncalibrated, and calibrating on blocks wider than the horizon "
        "changes the banding method without changing any result that would show it. "
        "See FLAG-BAND-HORIZON.")

# Weather columns the frame must carry for the exo entrant. Named here because they are
# the ones compute CANNOT derive: they come from the request or not at all.
_WEATHER_COLS = ("exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs")


def project(dataset: ComputeDataset, venue: str, model_name: str,
            feats: pd.DataFrame) -> tuple[list[ForecastRow], list[BandRow], list[str]]:
    """Forecast `horizon_days` forward from the venue's last observed day.

    Returns (forecasts, bands, diagnostics). Raises rather than returning a degraded
    forecast: a caller that gets rows back must be able to trust them, and the engine
    turns a raise into a per-venue diagnostic without losing the rest of the org.
    """
    notes: list[str] = []
    horizon = dataset.horizon_days
    last = pd.Timestamp(feats["date"].max()).normalize()
    dates = pd.date_range(last + pd.Timedelta(days=1), periods=horizon, freq="D")

    fut = _future_frame(dataset, venue, dates, notes)
    cols = _feature_cols(feats)

    fn = _predictor(model_name, venue)
    yhat = np.clip(np.asarray(fn(feats, fut, cols), dtype=float), 0.0, None)

    # first_target bounds the calibration walk to the recent window. Without it,
    # `rolling_point_forecasts` re-fits once per 7-day block across the WHOLE history, so
    # the work scales with the span of whatever arrives: one typo'd year in a tenant's
    # export ("2202" for "2022") densifies to ~65k daily rows and ~9,300 re-fits from a
    # two-row request. The window is also the statistically right answer, and the one the
    # frozen research forecasts already use (`sim/build_frozen_forecast._band_halfwidth`).
    residuals = rolling_point_forecasts(
        feats, model_name, cols, horizon=_CALIB_BLOCK_DAYS, venue=venue,
        first_target=last - pd.Timedelta(days=BAND_CALIB_DAYS))
    forecasts = [
        ForecastRow(venue=venue, layer="L1", key=None, target_date=d.date(),
                    model=model_name, yhat=float(y))
        # strict: a predictor returning the wrong number of points is a silent
        # truncation of the horizon, not something to discover in the bundle.
        for d, y in zip(dates, yhat, strict=True)
    ]
    bands = _bands(venue, model_name, dates, yhat, residuals, notes)
    return forecasts, bands, notes


def _feature_cols(feats: pd.DataFrame) -> list[str]:
    from features.build_features import feature_columns
    return feature_columns(feats)


def _future_frame(dataset: ComputeDataset, venue: str, dates: pd.DatetimeIndex,
                  notes: list[str]) -> pd.DataFrame:
    """Known-future covariates over `dates`, blind to any actual.

    Every column is built by the SAME function that builds the training column of that
    name - `calendar_features` then `_attach_exog`, exactly as `build_features` does.
    This module used to hand-roll its own versions, which is train/serve skew by
    construction, and it also silently omitted 13 columns so `rung3_gbm` raised KeyError
    instead of forecasting.

    Two things are deliberately different from training, and only two:
      * `value` is NaN - there is no observation inside the horizon;
      * `event_nights` is empty, so `is_ellel_event` is 0 forward. A forecaster standing
        at the cutoff does not know the event venue's future bookings. Same convention as
        every frozen research freeze (`sim/build_frozen_forecast.py`).
    Weather lands NaN from `_attach_exog` (the scratch store has no weather table) and is
    filled by the caller's `exogenous`, or reported missing.
    """
    from features.build_features import _attach_exog, calendar_features

    country = org_profile.country(venue)
    if country != "GB":
        notes.append(f"{venue}: country={country!r} but exo_is_school_term / "
                     "exo_is_uni_term come from a curated UK academic calendar; supply "
                     "them via exogenous to override")

    fut = pd.DataFrame({"date": pd.DatetimeIndex(dates)})
    fut["value"] = np.nan
    fut["venue"] = venue
    fut = calendar_features(fut, venue, event_nights=set())
    fut = _attach_exog(fut, venue)
    _report_horizon_gaps(fut, venue, notes)
    return fut


def _report_horizon_gaps(fut: pd.DataFrame, venue: str, notes: list[str]) -> None:
    """Say which horizon dates still have no weather after the overlay.

    Weather is the covariate compute cannot derive, so a gap here is the difference
    between the served exo entrant and a model that raises. Naming the dates makes the
    fix obvious; leaving it to the exo entrant's assertion makes it a stack trace.
    """
    missing = [c for c in _WEATHER_COLS if fut[c].isna().any()]
    if not missing:
        return
    gap_dates = sorted({d.date() for c in missing
                        for d in fut.loc[fut[c].isna(), "date"]})
    notes.append(
        f"{venue}: no weather for {len(gap_dates)} of {len(fut)} horizon dates "
        f"({missing[0]} first missing {gap_dates[0]}); supply it via exogenous or the "
        "exo entrant cannot be served")


def _bands(venue: str, model_name: str, dates: pd.DatetimeIndex, yhat: np.ndarray,
           residuals: pd.DataFrame, notes: list[str]) -> list[BandRow]:
    """Split-conformal band, Mondrian-grouped on the venue's structural-zero days.

    Grouping matters more than it looks: closed days are deterministically near zero, so
    pooling their tiny residuals with trading days' drags the marginal quantile down and
    under-covers the days that carry the money.
    """
    if residuals.empty or len(residuals) < MIN_CALIB_RESIDUALS:
        notes.append(
            f"{venue}: {len(residuals)} calibration residuals (< {MIN_CALIB_RESIDUALS}); "
            "point forecast returned WITHOUT a band rather than with a meaningless one")
        return []

    abs_res = np.abs(residuals["y"].to_numpy() - residuals["yhat"].to_numpy())
    groups = residuals["is_zero"].to_numpy()
    zero_dow = org_profile.structural_zero_dow(venue)
    target_grp = np.array([int(d.dayofweek in zero_dow) for d in dates])

    out: list[BandRow] = []
    for level in CONFORMAL_LEVELS:
        marginal = conformal_quantile(abs_res, level)
        by_grp = _mondrian_quantiles(abs_res, groups, level)
        # The floor has to apply PER GROUP, not to the pool. Mondrian splits the
        # residuals after the pooled check, so a venue closed one day a week can clear 30
        # pooled and leave 4 in the closed group - and `conformal_quantile` clamps k to n
        # rather than failing, so that group's "90% quantile" is silently the max of 4
        # errors. Falling back to the marginal quantile is a real quantile of a real
        # sample; it is less conditional, and it is reported.
        thin = {g for g, n in zip(*np.unique(groups, return_counts=True), strict=True)
                if n < MIN_CALIB_RESIDUALS}
        for g in sorted(thin):
            by_grp.pop(g, None)
        if thin and level == CONFORMAL_LEVELS[0]:
            notes.append(
                f"{venue}: Mondrian group(s) {sorted(int(g) for g in thin)} have fewer "
                f"than {MIN_CALIB_RESIDUALS} residuals; those days fall back to the "
                "marginal band rather than a quantile of a handful of errors")
        q = np.array([by_grp.get(g, marginal) for g in target_grp])
        for d, y, half in zip(dates, yhat, q, strict=True):
            out.append(BandRow(
                venue=venue, layer="L1", key=None, target_date=d.date(),
                model=model_name, level=float(level),
                lo=float(max(y - half, 0.0)), hi=float(y + half)))
    return out
