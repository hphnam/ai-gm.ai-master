"""G15a.1 - weather across the two Saturdays, conditioning basis vs what occurred.

POST HOC AND EXPLORATORY. The 11 July actual was seen (report 31) before this
comparison was specified. Nothing here confirms a hypothesis; it bounds one.

27 June (largest home-nation lift on record, +234%) and 11 July (shortfall, -21%) are
both Saturdays with a 22:00 England kickoff, so weather is the one exogenous family
report 31 named and did not compare. There are two distinct questions and merging them
produces a wrong answer:

  what the model saw   the `hindcast` basis AS PERSISTED. For 27 Jun that is a closed
                       historical forecast inside the training frame. For 11 Jul it is
                       a FORWARD forecast, retrieved 2026-07-10 when both freezes were
                       built, for a date that had not happened. Dissertation-notes
                       limitation 9. The store is the authoritative record of it and
                       re-fetching cannot recover it.
  what occurred        the `observed` (ERA5 reanalysis) basis, retrievable now.

A third column, the hindcast as the API answers it TODAY, is pulled to separate
"the model was given a bad forecast" from "the archive was later revised".

Read-only with respect to the store. `ingest.exog_weather.build()` is NOT called: it
persists and extends coverage, which would write the held-out window's weather into
the served store. Only the explicit-range `fetch_*` helpers are used, and the result
goes to a sim/ artefact.

Run:
    .venv-forecast/bin/python -m sim.g15a_weather_compare
"""

from __future__ import annotations

import json

import pandas as pd

import config
from ingest.exog_weather import fetch_hindcast, fetch_observed
from store.warehouse import connect

SIM_DIR = config.BRAIN_DIR / "sim"
OUT = SIM_DIR / "g15a_weather_compare.json"
VENUE = "beer_hall"
CELL = config.WEATHER_CELLS[VENUE]
DATES = {
    "2026-06-27": "Panama v England, Sat 22:00, +234% (largest lift on record)",
    "2026-07-11": "Norway v England, Sat 22:00, -21% (the shortfall)",
}
FIELDS = ("exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs", "exo_is_dry")


def _is_dry(rain_mm: float | None) -> float | None:
    """Same derivation the frame and the forward frame use, so the cells compare."""
    if rain_mm is None or pd.isna(rain_mm):
        return None
    return float(rain_mm < config.WEATHER_DRY_MM)


def _row(frame: pd.DataFrame, date: str) -> dict:
    if frame is None or frame.empty:
        return dict.fromkeys(FIELDS)
    sel = frame[pd.to_datetime(frame["date"]).dt.normalize() == pd.Timestamp(date)]
    if sel.empty:
        return dict.fromkeys(FIELDS)
    r = sel.iloc[0]
    rain = float(r["exo_rain_mm"]) if pd.notna(r["exo_rain_mm"]) else None
    return {
        "exo_temp_c": float(r["exo_temp_c"]) if pd.notna(r["exo_temp_c"]) else None,
        "exo_rain_mm": rain,
        "exo_sunshine_hrs": (float(r["exo_sunshine_hrs"])
                             if pd.notna(r["exo_sunshine_hrs"]) else None),
        "exo_is_dry": _is_dry(rain),
    }


def _stored_hindcast() -> pd.DataFrame:
    """What the model was conditioned on, exactly as it was persisted on 2026-07-10."""
    con = connect(read_only=True)
    try:
        return con.execute(
            "SELECT date, exo_temp_c, exo_rain_mm, exo_sunshine_hrs "
            "FROM exog_weather_hindcast WHERE cell = ? AND date IN ('2026-06-27', "
            "'2026-07-11') ORDER BY date", [CELL]).df()
    finally:
        con.close()


def run() -> dict:
    stored = _stored_hindcast()
    lo, hi = min(DATES), max(DATES)
    observed = fetch_observed(CELL, lo, hi)
    hindcast_now = fetch_hindcast(CELL, lo, hi)

    cells = {
        d: {
            "fixture": note,
            "model_saw": _row(stored, d),
            "occurred": _row(observed, d),
            "hindcast_today": _row(hindcast_now, d),
        }
        for d, note in DATES.items()
    }

    # Question 1: does OBSERVED weather differ between the two Saturdays by enough to
    # plausibly carry a swing from +234% to -21%? Magnitude only, no verdict.
    a, b = cells["2026-06-27"]["occurred"], cells["2026-07-11"]["occurred"]
    between = {f: (None if a[f] is None or b[f] is None else round(b[f] - a[f], 4))
               for f in FIELDS}

    # Question 2: did the CONDITIONING weather for 11 July differ from what occurred?
    # A non-zero answer is a forecast-of-a-covariate error, a distinct failure mode
    # from the fixture effect.
    saw, occ = cells["2026-07-11"]["model_saw"], cells["2026-07-11"]["occurred"]
    conditioning_error = {
        f: (None if saw[f] is None or occ[f] is None else round(saw[f] - occ[f], 4))
        for f in FIELDS
    }

    out = {
        "package": "G15a.1",
        "status": "POST HOC AND EXPLORATORY",
        "venue": VENUE,
        "cell": CELL,
        "dry_threshold_mm": config.WEATHER_DRY_MM,
        "conditioning_basis": config.WEATHER_TRAIN_BASIS,
        "note": ("model_saw is the persisted hindcast basis; for 2026-07-11 that is a "
                 "FORWARD forecast retrieved 2026-07-10, not reanalysis"),
        "cells": cells,
        "observed_difference_11jul_minus_27jun": between,
        "conditioning_error_11jul_saw_minus_occurred": conditioning_error,
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")

    print("G15a.1 weather, beer_hall cell - POST HOC")
    print(f"  basis: conditioning={config.WEATHER_TRAIN_BASIS}, occurred=observed (ERA5)")
    hdr = f"  {'date':12s} {'view':16s} " + " ".join(f"{f:18s}" for f in FIELDS)
    print(hdr)
    for d in sorted(cells):
        for view in ("model_saw", "occurred", "hindcast_today"):
            vals = cells[d][view]
            line = " ".join(
                f"{'n/a':>18s}" if vals[f] is None else f"{vals[f]:18.3f}" for f in FIELDS)
            print(f"  {d:12s} {view:16s} {line}")
    print(f"  observed 11 Jul minus 27 Jun : {between}")
    print(f"  11 Jul conditioning error    : {conditioning_error}")
    print(f"  artefact: {OUT}")
    return out


if __name__ == "__main__":
    run()
