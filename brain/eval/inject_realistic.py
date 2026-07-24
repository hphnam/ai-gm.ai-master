"""S10 - the realistic injection pipeline (spec `PRJ93_Remediation_S10_Injection_Realism.md`).

`eval/inject.py` perturbs z directly (`_apply_z`), holding `expected`/`scale` fixed at
whatever the ORIGINAL unperturbed history produced, and splices the result onto untouched
training rows (`_reassemble`). The forecaster underlying that z-stream, `signals.residual.
build_residual_stream`'s Rung-1 DOW-median `expected` and CP_LEVEL conformal `scale`, the
SAME model the 644-injection corpus's detection is scored against, therefore never sees the
perturbation and never revises its expectation. Production does both:
`config.RETRAIN_CADENCE_DAYS` refits weekly, `config.RETRAIN_ON_CHANGEPOINT` refits again on
a confirmed onset (`ingest.refresh._should_refit`), and the conformal band recalibrates on
rolling seven-day blocks (`conformal.wrap.evaluate`). This module builds a second stream
constructor, `realistic_stream`, that perturbs RAW revenue (not z) from the onset onward,
including rows that later become training data, and re-derives `expected`/`scale` under that
cadence: frozen between refits, refit at a 7-day boundary or on a confirmed change-point
since the last refit, mirroring `ingest.refresh._should_refit`'s cadence-or-changepoint gate.
Narrower than `_should_refit` in one respect, stated rather than silently dropped:
`_should_refit` also tightens the cadence to `EVENT_REFRESH_CADENCE_DAYS` inside a flagged
high-volatility event window (`_in_event_window`, World Cup / curated local events);
`realistic_stream` always uses the fixed weekly `refit_cadence` and does not implement that
tightening. The injection oracle's stream is capped at `AGENT_EVAL_STREAM_CEILING`
(2026-05-31), before the live World Cup period other packages measured against, so this gap
has no reach into the sampled dates here, but it is a real, disclosed scope narrowing, not a
claim of exact parity.

Substitution, stated (the standing rule: if a gate's premise is defective, substitute
something STRONGER, state it, flag it). The spec frames "the forecaster" via
RETRAIN_CADENCE_DAYS/RETRAIN_ON_CHANGEPOINT, which in production governs the SERVED point
model, the rung0-4 ladder, re-selected by an expensive rolling-origin backtest
(`models.ladder.evaluate_rolling`) and wrapped by `conformal.wrap` for `/forecast`. That is
NOT the model the 644-injection corpus's detection recall is measured against:
`signals.change_point.detect` and `signals.deviation` both run on
`signals.residual.build_residual_stream`, which is ALWAYS the Rung-1 DOW-median baseline,
regardless of which rung is currently served. Re-running the full ladder backtest per
injected day (dozens of refits across 120+ paired injections, several with a chronos
entrant) is compute-intractable inside this package's one-to-two-hour compute budget, AND it
would not close the realism gap the spec names, because the ladder's rung selection never
appears in the detection z-stream at all. This module instead applies the SAME governing
cadence (weekly plus change-point acceleration) and the SAME rolling-block conformal-
recalibration discipline to the model that is actually in the detection loop. Flagged here,
not buried in a comment three files away.

Scope narrowing, also stated: Ellel is excluded from this module's sample. Its occurrence
label is inert (`signals.occurrence.occurrence_label` returns NaN, no booking diary), so G2
("no injection lands on a structural-zero day") cannot be honestly proven there; Beer Hall
and Two River Taps both carry a defined calendar occurrence label and comfortably supply the
required sample. `stock_drawdown` is out of scope for the same reason as it is out of scope
for the realism question itself: it is a single snapshot `Signal`, not a residual/z time
series, so there is no forecaster-adaptation mechanism for a retrain cadence to act on.

Detection is UNCHANGED: a realistic `Injection` is the same `eval.inject.Injection`
dataclass the control arm uses (only `.stream` came from a different constructor), and it is
scored by the existing `eval.agent_eval.surface` / `item_covers` machinery, never
reimplemented here. `signals.change_point.cusum` / `.persistence` are reused verbatim, both
inside `realistic_stream`'s own refit gate and downstream in scoring.

Run:
    python -m eval.inject_realistic
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

import config
from conformal.wrap import conformal_quantile
from eval import inject
from eval.inject import Injection, TruthRecord
from signals.change_point import cusum, persistence
from signals.occurrence import occurrence_label
from signals.residual import _EPS, _raw_series
from store.warehouse import connect

REFIT_CADENCE_DAYS = config.RETRAIN_CADENCE_DAYS        # 7: production T3 weekly boundary
MIN_DETECTION_WINDOW_DAYS = 21                            # spec Part 1: >=21 days past onset
REALISTIC_VENUES = ("beer_hall", "two_river_taps")        # occurrence label is defined for both

# Scope narrowing, stated: the committed corpus's "mid"/"late" onset positions for a
# SUSTAINED kind (regime_shift, exo_coincident) leave only ~11/~3 days of the 28-day fold
# past onset, short of the spec's 21-day floor, so this module defaults those two kinds'
# onset to "early" (~22 days remaining). Spike is exempt from the floor (see `_build`'s
# docstring) and keeps the committed corpus's own "mid" default, which is where
# `signals.deviation`'s DEV_SCAN_WINDOW tail actually looks; eval.injection_realism (Part
# 2) mirrors this split. The committed corpus's mid/late positions for the sustained
# kinds are out of this package's scope, not silently investigated.


class OccurrenceViolation(ValueError):
    """G2: an injection would land on a day the S4 occurrence gate does not call trading."""


@dataclass
class RefitEvent:
    idx: int
    date: pd.Timestamp
    trigger: str      # "warmup" | "cadence" | "changepoint"


# --- G2: the occurrence guard -------------------------------------------------

def assert_trading_day(venue: str, onset) -> None:
    """No injection may land on a structural-zero day (S4's occurrence definition,
    `signals.occurrence.occurrence_label`: non-zero-net-revenue calendar/diary trading
    label). NaN (an event-driven venue with no diary, e.g. Ellel) cannot be checked and is
    left alone rather than fabricating a verdict, mirroring `occurrence.py`'s own
    no-op-when-unknown discipline; callers that need a hard guarantee restrict to
    REALISTIC_VENUES, where the label is always 0 or 1."""
    label = occurrence_label(venue, [pd.Timestamp(onset)])[0]
    if label == 0.0:
        raise OccurrenceViolation(
            f"{venue} {onset} is not a trading day (occurrence=0); an injection here would "
            "manufacture a phantom trading day")


# --- The refit-cadence stream constructor (Part 1, points 1-4) ---------------

def _changepoint_since(z_tail: list[float]) -> bool:
    """Has a change-point fired in the z accumulated strictly since the last refit,
    the SAME cusum/persistence detectors production and the control arm both read."""
    if len(z_tail) < 2:
        return False
    arr = np.asarray(z_tail, float)
    return bool(cusum(arr)) or bool(persistence(arr))


def realistic_stream(
    dates: np.ndarray, vals: np.ndarray, dows: np.ndarray, *,
    warmup: int = config.CP_WARMUP_DAYS, cp_level: float = config.CP_LEVEL,
    refit_cadence: int = REFIT_CADENCE_DAYS, changepoint_refit: bool = True,
) -> tuple[pd.DataFrame, list[RefitEvent]]:
    """Re-derive `expected`/`scale` under the production refit cadence instead of
    `build_residual_stream`'s fully-expanding daily recompute. `expected`/`scale` are
    frozen at the last refit and used for every day until the next one, so a perturbation
    in `vals` is only absorbed at a refit boundary, a weekly cadence boundary
    (`refit_cadence`) or a confirmed change-point since the last refit
    (`changepoint_refit`), mirroring `ingest.refresh._should_refit`'s cadence-or-changepoint
    gate (module docstring: not its event-window cadence tightening). Both the DOW-
    median training frame and the conformal calibration set are recomputed together at
    every refit from `vals[:i]`, so if `vals` carries a perturbation, both reflect it (G1).
    """
    n = len(vals)
    rows: list[dict] = []
    refits: list[RefitEvent] = []
    dow_median = overall = scale = None
    last_refit_idx: int | None = None
    z_since_refit: list[float] = []

    for i in range(warmup, n):
        trigger = None
        if last_refit_idx is None:
            trigger = "warmup"
        elif (i - last_refit_idx) >= refit_cadence:
            trigger = "cadence"
        elif changepoint_refit and _changepoint_since(z_since_refit):
            trigger = "changepoint"

        if trigger:
            tr_v, tr_d = vals[:i], dows[:i]
            dow_median = pd.Series(tr_v).groupby(tr_d).median()
            overall = float(np.median(tr_v))
            tr_exp = np.array([dow_median.get(d, overall) for d in tr_d], float)
            scale = max(float(conformal_quantile(np.abs(tr_v - tr_exp), cp_level)), _EPS)
            last_refit_idx = i
            z_since_refit = []
            refits.append(RefitEvent(i, pd.Timestamp(dates[i]), trigger))

        exp_i = float(dow_median.get(dows[i], overall))
        if exp_i <= _EPS:
            continue                                   # not a trading day for this venue
        z_i = (vals[i] - exp_i) / scale
        z_since_refit.append(z_i)
        rows.append({"date": pd.Timestamp(dates[i]), "actual": vals[i],
                     "expected": exp_i, "scale": scale, "z": z_i})
    return pd.DataFrame(rows), refits


# --- Perturb raw revenue, not z (Part 1, points 1-2) --------------------------

def _revenue_delta(control_test: pd.DataFrame, mask: pd.Series, dz: float) -> dict:
    """The absolute revenue delta per masked date: `dz * scale_t` of the ORIGINAL
    (unperturbed) control stream at each date, the exact delta `eval.inject._apply_z`
    produces (`actual' = expected + (z+dz)*scale = actual + dz*scale`). Reading it from
    the control stream, never recomputed adaptively, is what makes the two arms move
    identical money (G3): the only difference is what happens to it downstream."""
    delta = mask.astype(float) * dz * control_test["scale"]
    return dict(zip(control_test["date"], delta))


def _perturbed_raw(venue: str, con, delta_by_date: dict) -> pd.DataFrame:
    raw = _raw_series(venue, con=con)
    vals = raw["value"].to_numpy(float).copy()
    dates_arr = raw["date"].to_numpy()
    for i, d in enumerate(dates_arr):
        bump = delta_by_date.get(pd.Timestamp(d))
        if bump:
            vals[i] += bump
    return pd.DataFrame({"date": raw["date"], "value": vals})


def _resolve_onset(kind: str, venue: str, con, test: pd.DataFrame, onset_position: str) -> pd.Timestamp:
    if kind == "exo_coincident":
        at = inject._weather_anomaly_date(venue, test, con)
        if at is None:
            at = inject._onset(test, inject._position_offset(test, "early"))
        return pd.Timestamp(at)
    return inject._onset(test, inject._position_offset(test, onset_position))


def _build(
    venue: str, con, *, kind: str, direction: str, magnitude_z: float | None,
    stream: pd.DataFrame | None, window: tuple | None, onset_position: str,
    changepoint_refit: bool,
) -> tuple[Injection, list[RefitEvent]]:
    """The realistic-pipeline counterpart of `eval.inject.inject_regime_shift` /
    `inject_spike` / `inject_exo_coincident`: same fold-resolution helpers (so, given the
    same `stream`/`window`/`onset_position`, both arms land on the IDENTICAL onset date),
    the perturbation lands on raw revenue, and `expected`/`scale` are re-derived under the
    production refit cadence. Detection is unchanged: the result is a normal `Injection`.
    """
    stream = stream if stream is not None else inject.base_stream(venue, con=con)
    train, test = window if window is not None else inject.holdout(stream)
    at = _resolve_onset(kind, venue, con, test, onset_position)
    assert_trading_day(venue, at.date())

    default_z = config.EVAL_INJECT_SPIKE_Z if kind == "spike" else config.EVAL_INJECT_SHIFT_Z
    dz = (magnitude_z if magnitude_z is not None else default_z) * (-1 if direction == "down" else 1)
    mask = (test["date"] == at) if kind == "spike" else (test["date"] >= at)
    delta_by_date = _revenue_delta(test, mask, dz)

    test_end = pd.Timestamp(test["date"].max())
    perturbed_raw = _perturbed_raw(venue, con, delta_by_date)
    perturbed_raw = perturbed_raw[perturbed_raw["date"] <= test_end].reset_index(drop=True)
    dates_arr = perturbed_raw["date"].to_numpy()
    vals_arr = perturbed_raw["value"].to_numpy(float)
    dows_arr = perturbed_raw["date"].dt.dayofweek.to_numpy()

    realistic_df, refits = realistic_stream(dates_arr, vals_arr, dows_arr,
                                            changepoint_refit=changepoint_refit)
    train_end = pd.Timestamp(train["date"].max())
    window_df = realistic_df[realistic_df["date"] > train_end].reset_index(drop=True)
    if window_df.empty:
        raise ValueError(f"empty realistic detection window for {venue}/{kind}@{at.date()}")
    # The 21-day floor is about giving a SUSTAINED shift room for two refits to chase
    # it (spec Part 1); a spike is a single memoryless day with no adaptation dynamic
    # to observe afterward, and its detectability instead depends on sitting within
    # signals.deviation's DEV_SCAN_WINDOW tail (see eval.injection_realism, which uses
    # onset="mid" for spike specifically), so the floor does not apply to it.
    if kind != "spike" and (window_df["date"].max() - at).days < MIN_DETECTION_WINDOW_DAYS - 1:
        raise ValueError(
            f"realistic detection window for {venue}/{kind}@{at.date()} is shorter than "
            f"the {MIN_DETECTION_WINDOW_DAYS}-day floor the spec requires")

    expected_cause = "weather" if kind == "exo_coincident" and inject._weather_anomaly_date(
        venue, test, con) is not None else None
    relevance = 1.0 if kind == "spike" else 2.0
    truth = TruthRecord(venue, kind, at.date(), direction, abs(dz), expected_cause,
                        relevance=relevance)
    reassembled = inject._reassemble(stream, window_df)
    injection = Injection(venue, window_df["date"].max().date(), kind, reassembled, [truth],
                          train_end=train["date"].max().date())
    return injection, refits


def inject_regime_shift(venue: str, con=None, *, direction: str = "down",
                        magnitude_z: float | None = None, stream=None, window=None,
                        onset: str = "early", changepoint_refit: bool = True):
    own = con is None
    con = con or connect(read_only=True)
    try:
        return _build(venue, con, kind="regime_shift", direction=direction,
                      magnitude_z=magnitude_z, stream=stream, window=window,
                      onset_position=onset, changepoint_refit=changepoint_refit)
    finally:
        if own:
            con.close()


def inject_spike(venue: str, con=None, *, direction: str = "up", z: float | None = None,
                 stream=None, window=None, onset: str = "mid", changepoint_refit: bool = True):
    own = con is None
    con = con or connect(read_only=True)
    try:
        return _build(venue, con, kind="spike", direction=direction, magnitude_z=z,
                      stream=stream, window=window, onset_position=onset,
                      changepoint_refit=changepoint_refit)
    finally:
        if own:
            con.close()


def inject_exo_coincident(venue: str, con=None, *, direction: str = "down",
                          magnitude_z: float | None = None, stream=None, window=None,
                          changepoint_refit: bool = True):
    own = con is None
    con = con or connect(read_only=True)
    try:
        return _build(venue, con, kind="exo_coincident", direction=direction,
                      magnitude_z=magnitude_z, stream=stream, window=window,
                      onset_position="early", changepoint_refit=changepoint_refit)
    finally:
        if own:
            con.close()


# --- The feedback loop (Part 1, "capture the feedback loop") -----------------

def feedback_loop_effect(venue: str, con, *, kind: str, direction: str = "down",
                         magnitude_z: float | None = None, stream=None, window=None,
                         onset: str = "early") -> dict:
    """Does a change-point's own triggered refit suppress further detection of the SAME
    persisting shift? Builds the identical perturbed history twice, once under the
    production policy (weekly cadence + change-point acceleration) and once under a
    weekly-cadence-only ablation (`changepoint_refit=False`), and counts raw cusum/
    persistence alarms after the first change-point-triggered refit in each. A strict
    deficit under the production policy is the suppression the spec's stop condition
    names; a tie means the shift stayed strong enough that the frozen model still
    breaches even after chasing it."""
    fn = {"regime_shift": inject_regime_shift, "exo_coincident": inject_exo_coincident}[kind]
    kw = dict(direction=direction, magnitude_z=magnitude_z, stream=stream, window=window)
    if kind == "regime_shift":
        kw["onset"] = onset
    prod, refits_prod = fn(venue, con, **kw, changepoint_refit=True)
    weekly, _ = fn(venue, con, **kw, changepoint_refit=False)

    train_end = pd.Timestamp(prod.train_end)
    window_refits = [r for r in refits_prod if r.date > train_end]
    cp_refits = [r for r in window_refits if r.trigger == "changepoint"]
    if not cp_refits:
        return {"changepoint_refits": 0, "suppression_detected": False,
                "alarms_after_prod": None, "alarms_after_weekly_only": None}

    trigger_date = cp_refits[0].date

    def alarms_after(inj: Injection, from_date: pd.Timestamp) -> int:
        window_df = inj.stream[inj.stream["date"] >= from_date]
        z = window_df["z"].to_numpy()
        return len(cusum(z)) + len(persistence(z))

    n_prod = alarms_after(prod, trigger_date)
    n_weekly = alarms_after(weekly, trigger_date)
    return {"changepoint_refits": len(cp_refits), "alarms_after_prod": n_prod,
           "alarms_after_weekly_only": n_weekly, "suppression_detected": n_weekly > n_prod}


def main() -> int:
    con = connect(read_only=True)
    try:
        inj, refits = inject_regime_shift("beer_hall", con=con, direction="down",
                                          magnitude_z=3.0)
        window_refits = [r for r in refits if r.date > pd.Timestamp(inj.train_end)]
        fb = feedback_loop_effect("beer_hall", con, kind="regime_shift", direction="down",
                                  magnitude_z=3.0)
    finally:
        con.close()
    print("S10 · realistic injection pipeline (smoke)")
    print(f"  regime_shift @ beer_hall (z=3.0): onset {inj.truth[0].onset}, "
          f"{len(window_refits)} refits within the window "
          f"({sum(1 for r in window_refits if r.trigger == 'changepoint')} "
          "change-point-triggered)")
    print(f"  feedback loop: {fb}")
    ok = len(refits) > 0
    print(f"S10-PIPELINE RESULT: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
