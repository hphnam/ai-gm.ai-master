"""G15a.2 - the `is_ellel_event` train/serve asymmetry, measured three ways.

POST HOC AND EXPLORATORY. The 11 July actual was seen (report 31) before this
hypothesis was specified. A post-hoc diagnostic may explain; it may not confirm.

The asymmetry. `is_ellel_event` is one of the 15 `CHRONOS2_EXO_COLS`. On the Beer Hall
frame it is a binary "did the booking-led venue trade that day" flag, populated from
observed trading (`features/build_features.py`). On EVERY forecast horizon it is pinned
to 0: a forecaster standing at the cutoff does not know the event venue's future
bookings (`compute/forward.py`, and the same convention in every research freeze). So
the served model trains on an informative covariate and serves it constant.

That is train and serve disagreeing on a column the model was fit on - the same species
as report 33's `exo_is_dry` finding, except documented rather than hidden.

The consequence nobody had checked: Ellel traded on 11 July (GBP 385.12, 55 orders) and
both frozen forecasts were conditioned on `is_ellel_event = 0` for that date.

Three measurements, in order, because each one can kill the next:
  1  unconditional  Beer Hall revenue on Ellel-active vs Ellel-quiet days, matched on
                    day of week. Sign, dispersion, n on both sides. Positive means
                    complement (spillover), negative means substitution.
  2  sensitivity    the served entrant run twice over the same horizon, identical but
                    for the flag forced to 1 then 0. A zero difference means the
                    covariate is inert at serving and hypothesis 2 collapses.
  3  counterfactual the Origin B configuration for 11 July with the flag set to 1 on
                    that date only, against the GBP 984.62 actual.

This is a counterfactual ON a frozen artefact, never a re-freeze. Nothing here writes
to `july2026_w2b_forecast_frozen.*` or `july2026_w2_confront_result.json`, and nothing
is written to the store. Step 3 asserts the control arm reproduces the committed
Origin B number before any delta is believed.

Run (needs .venv-forecast, store restored to 2026-07-07):
    .venv-forecast/bin/python -m sim.g15a_ellel_counterfactual
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

import config
from features.build_features import build_features, event_venue_dates
from models.foundation import CHRONOS2_EXO_COLS, chronos2_exo_predict
from sim.build_july_forecast import _future_frame
from sim.build_july_w2_forecast import WIN_END
from store.active_span import trim_to_active
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"
OUT = SIM_DIR / "g15a_ellel_counterfactual.json"
VENUE = "beer_hall"
AS_OF = pd.Timestamp("2026-07-07")          # Origin B's cutoff, unchanged
TARGET = pd.Timestamp("2026-07-11")
TARGET_ACTUAL = 984.62                       # report 31, held-out, evaluation only
FROZEN_B_YHAT = 1558.28                      # committed Origin B, the control
FLAG = "is_ellel_event"
DOW_NAMES = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


# --- 1. unconditional association ------------------------------------------------

def unconditional() -> dict:
    """Beer Hall revenue on Ellel-active vs Ellel-quiet days, matched on day of week.

    Matched rather than pooled because Ellel's bookings concentrate on weekends and
    Beer Hall's revenue is strongly day-of-week driven; a pooled comparison would read
    the day-of-week effect and call it spillover.
    """
    df = build_features(VENUE)
    df = df[df["value"].notna()]
    per_dow, weighted_num, weighted_den = [], 0.0, 0.0
    for dow in range(7):
        sub = df[df["dow"] == dow]
        active = sub.loc[sub[FLAG] == 1, "value"]
        quiet = sub.loc[sub[FLAG] == 0, "value"]
        row = {
            "dow": DOW_NAMES[dow],
            "n_active": int(len(active)),
            "n_quiet": int(len(quiet)),
            "mean_active": round(float(active.mean()), 2) if len(active) else None,
            "mean_quiet": round(float(quiet.mean()), 2) if len(quiet) else None,
            "sd_active": round(float(active.std(ddof=1)), 2) if len(active) > 1 else None,
            "sd_quiet": round(float(quiet.std(ddof=1)), 2) if len(quiet) > 1 else None,
            "median_active": round(float(active.median()), 2) if len(active) else None,
            "median_quiet": round(float(quiet.median()), 2) if len(quiet) else None,
        }
        if len(active) and len(quiet):
            row["diff_mean"] = round(row["mean_active"] - row["mean_quiet"], 2)
            row["diff_median"] = round(row["median_active"] - row["median_quiet"], 2)
            # Weight each day of week by its active-day count: the estimand is the
            # average effect on a day Ellel actually trades, not on a uniform week.
            weighted_num += row["diff_mean"] * len(active)
            weighted_den += len(active)
        else:
            row["diff_mean"] = row["diff_median"] = None
        per_dow.append(row)

    active_all, quiet_all = df.loc[df[FLAG] == 1, "value"], df.loc[df[FLAG] == 0, "value"]
    effect = round(weighted_num / weighted_den, 2) if weighted_den else None
    return {
        "per_dow": per_dow,
        "n_active_total": int(len(active_all)),
        "n_quiet_total": int(len(quiet_all)),
        "pooled_mean_active": round(float(active_all.mean()), 2),
        "pooled_mean_quiet": round(float(quiet_all.mean()), 2),
        "pooled_sd_active": round(float(active_all.std(ddof=1)), 2),
        "pooled_sd_quiet": round(float(quiet_all.std(ddof=1)), 2),
        "pooled_diff_mean": round(float(active_all.mean() - quiet_all.mean()), 2),
        "dow_matched_effect_mean": effect,
        "sign": (None if effect is None else
                 "positive (complement / spillover)" if effect > 0 else
                 "negative (substitution / cannibalisation)"),
    }


# --- shared serving machinery ----------------------------------------------------

def _served_inputs() -> tuple[pd.DataFrame, pd.DataFrame, pd.DatetimeIndex]:
    """The exact Origin B training frame and forward frame, unmodified.

    Chronos needs the horizon contiguous with training, so the prediction runs from the
    day after the training ceiling through the window end, the same as the freeze.
    """
    feats = trim_to_active(build_features(VENUE), VENUE)
    ceiling = pd.Timestamp(feats["date"].max()).normalize()
    if ceiling != AS_OF:
        raise RuntimeError(f"training ceiling {ceiling.date()} != Origin B cutoff "
                           f"{AS_OF.date()}; run sim.restore_clock")
    pred_dates = pd.date_range(ceiling + pd.Timedelta(days=1), WIN_END, freq="D")
    return feats, _future_frame(VENUE, pred_dates), pred_dates


def _predict(feats: pd.DataFrame, fut: pd.DataFrame) -> np.ndarray:
    return chronos2_exo_predict(feats, fut, venue=VENUE, exo_cols=list(CHRONOS2_EXO_COLS))


# --- 2. served-model sensitivity -------------------------------------------------

def sensitivity() -> dict:
    """The served entrant with the flag forced on, measured two ways.

    If the difference is zero the covariate is inert at serving and the whole
    hypothesis collapses, which is a result and is reported as one.

    Both arms are needed and they do not agree, which is the point. Chronos-2
    conditions on the WHOLE future covariate path, so "flag = 1 on every horizon day"
    is a constant column over the horizon - a different conditioning regime, carrying
    no within-horizon contrast - while "flag = 1 on one day" is the spike that a real
    Ellel booking actually presents. The spec asked for the constant arm; the spike arm
    is what the 11 July counterfactual needs, so measuring only the first would have
    reported the wrong sign for the operative case.
    """
    feats, fut, pred_dates = _served_inputs()
    on, off = fut.copy(), fut.copy()
    on[FLAG] = 1
    off[FLAG] = 0
    yhat_on, yhat_off = _predict(feats, on), _predict(feats, off)
    delta = yhat_on - yhat_off

    # Spike arm: one horizon day lit at a time, each against the same baseline, so the
    # per-date effect is isolated from the rest of the path.
    spike = []
    for k, d in enumerate(pred_dates):
        one = off.copy()
        one.loc[one["date"] == d, FLAG] = 1
        yk = float(_predict(feats, one)[k])
        spike.append({"date": str(d.date()), "yhat_spike": round(yk, 2),
                      "delta_vs_baseline": round(yk - float(yhat_off[k]), 2)})

    per_day = [
        {"date": str(d.date()), "yhat_flag_1": round(float(a), 2),
         "yhat_flag_0": round(float(b), 2), "delta": round(float(c), 2)}
        for d, a, b, c in zip(pred_dates, yhat_on, yhat_off, delta)
    ]
    spike_deltas = np.array([r["delta_vs_baseline"] for r in spike])
    return {
        "constant_arm_per_day": per_day,
        "window_total_flag_1": round(float(yhat_on.sum()), 2),
        "window_total_flag_0": round(float(yhat_off.sum()), 2),
        "window_total_delta": round(float(delta.sum()), 2),
        "max_abs_daily_delta": round(float(np.abs(delta).max()), 2),
        "spike_arm_per_day": spike,
        "spike_mean_delta": round(float(spike_deltas.mean()), 2),
        "spike_max_abs_delta": round(float(np.abs(spike_deltas).max()), 2),
        "arms_agree_in_sign": bool(
            np.all(np.sign(spike_deltas) == np.sign(delta)) ),
        "inert": bool(np.allclose(delta, 0.0) and np.allclose(spike_deltas, 0.0)),
    }


# --- 3. the 11 July counterfactual -----------------------------------------------

def counterfactual() -> dict:
    """Origin B's configuration with the flag set to 1 on 11 July only.

    The control arm re-runs the frozen configuration untouched. It must reproduce the
    committed 1558.28 or the delta means nothing, so the reproduction gap is reported
    beside the counterfactual rather than assumed away.
    """
    feats, fut, pred_dates = _served_inputs()
    pos = {pd.Timestamp(d): k for k, d in enumerate(pred_dates)}
    idx = pos[TARGET]

    control = fut.copy()                    # flag already 0 forward, as frozen
    treated = fut.copy()
    treated.loc[treated["date"] == TARGET, FLAG] = 1

    yhat_control = float(_predict(feats, control)[idx])
    yhat_treated = float(_predict(feats, treated)[idx])
    repro_gap = yhat_control - FROZEN_B_YHAT
    return {
        "date": str(TARGET.date()),
        "actual": TARGET_ACTUAL,
        "frozen_origin_b_yhat": FROZEN_B_YHAT,
        "control_yhat_flag_0": round(yhat_control, 2),
        "counterfactual_yhat_flag_1": round(yhat_treated, 2),
        "reproduction_gap_vs_frozen": round(repro_gap, 2),
        "reproduces_frozen": bool(abs(repro_gap) < 0.01),
        "residual_control": round(yhat_control - TARGET_ACTUAL, 2),
        "residual_counterfactual": round(yhat_treated - TARGET_ACTUAL, 2),
        "shortfall_closed": round(yhat_control - yhat_treated, 2),
        "frozen_residual": round(FROZEN_B_YHAT - TARGET_ACTUAL, 2),
    }


def _ellel_on_target() -> dict:
    """Confirm from the store that the event venue did trade on the target date."""
    con = connect(read_only=True)
    try:
        row = con.execute(
            "SELECT revenue_raw, n_line_items FROM l1_daily WHERE venue='ellel' "
            "AND date = ?", [str(TARGET.date())]).fetchone()
    finally:
        con.close()
    # Held out of the store by design: 8 to 14 July is the Step-C2 target window.
    return {"in_store": row is not None,
            "note": "held out of the store by design; report 31 records GBP 385.12 "
                    "on 55 orders from the evaluation-only actuals pull"}


def run() -> dict:
    nights = event_venue_dates()
    out = {
        "package": "G15a.2",
        "status": "POST HOC AND EXPLORATORY",
        "venue": VENUE,
        "flag": FLAG,
        "served_model": "rung4_chronos2_exo",
        "cutoff": str(AS_OF.date()),
        "event_nights_in_history": len(nights),
        "ellel_on_target_date": _ellel_on_target(),
        "step1_unconditional": unconditional(),
        "step2_serving_sensitivity": sensitivity(),
    }
    if out["step2_serving_sensitivity"]["inert"]:
        out["step3_counterfactual"] = {
            "skipped": "step 2 measured the covariate inert at serving; the "
                       "counterfactual cannot move and the hypothesis collapses"}
    else:
        out["step3_counterfactual"] = counterfactual()
    OUT.write_text(json.dumps(out, indent=2) + "\n")

    u, s = out["step1_unconditional"], out["step2_serving_sensitivity"]
    print("G15a.2 is_ellel_event asymmetry - POST HOC")
    print(f"  1 unconditional  n_active={u['n_active_total']} n_quiet={u['n_quiet_total']}")
    print(f"    dow-matched effect GBP {u['dow_matched_effect_mean']}  ({u['sign']})")
    print(f"    pooled           GBP {u['pooled_diff_mean']}")
    print(f"  2 sensitivity    constant arm: window delta GBP {s['window_total_delta']}, "
          f"max daily |delta| GBP {s['max_abs_daily_delta']}")
    print(f"                   spike arm:    mean delta GBP {s['spike_mean_delta']}, "
          f"max |delta| GBP {s['spike_max_abs_delta']}")
    print(f"                   inert={s['inert']}  arms_agree_in_sign="
          f"{s['arms_agree_in_sign']}")
    c = out["step3_counterfactual"]
    if "skipped" in c:
        print(f"  3 counterfactual SKIPPED: {c['skipped']}")
    else:
        print(f"  3 counterfactual control={c['control_yhat_flag_0']} "
              f"(reproduces frozen: {c['reproduces_frozen']}, gap "
              f"{c['reproduction_gap_vs_frozen']})")
        print(f"    flag=1 {c['counterfactual_yhat_flag_1']} vs actual {c['actual']}")
        print(f"    residual {c['residual_control']} -> {c['residual_counterfactual']}")
    print(f"  artefact: {OUT}")
    return out


if __name__ == "__main__":
    run()
