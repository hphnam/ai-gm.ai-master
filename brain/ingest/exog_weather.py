"""A14 · Weather ingest (Open-Meteo, no API key, CC BY 4.0).

Pulls three weather *bases* per grid cell and caches them to DuckDB. The bases
exist to study train/serve consistency (spec §4): at inference only a forecast of
the weather is known, so training on clean reanalysis ("observed") may not be the
best basis when serving on forecast.

    exog_weather_observed     ERA5 reanalysis (archive), ground truth / upper bound
    exog_weather_hindcast     historical-forecast (matches serve), realistic training basis
    exog_weather_leadmatched  previous-runs, issued N days ahead, forecast as actually issued

Each venue has its own precise grid cell keyed by venue name (G12.9e / G12.10a;
`config.WEATHER_CELLS`): `beer_hall`, `ellel`, `two_river_taps`. Beer Hall and
Ellel are ~0.6 km apart but no longer share one. One HTTP call per (cell, basis),
never one per venue or per forecast.

Run:
    python -m ingest.exog_weather              # pull all bases for all cells, cache to DuckDB
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

import pandas as pd

from config import (
    FORECAST_VENUES,
    WEATHER_CELL_COORDS,
    WEATHER_CELLS,
    WEATHER_DRY_MM,
    WEATHER_HORIZON_MAX_LEAD,
    WEATHER_HORIZON_MODEL,
    WEATHER_LEAD_DAYS,
)
from store.warehouse import connect, read_series

_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
_HINDCAST = "https://historical-forecast-api.open-meteo.com/v1/forecast"
_PREVRUNS = "https://previous-runs-api.open-meteo.com/v1/forecast"
_DAILY = "temperature_2m_max,precipitation_sum,sunshine_duration"
BASES = ("observed", "hindcast", "leadmatched")
_TABLE = {b: f"exog_weather_{b}" for b in BASES}
# S6 A14c: the per-lead horizon store. One row per (cell, date, lead 1..7), pulled
# from a single pinned global model. Parallel to the one-value-per-date BASES above,
# NOT one of them, so the existing bases and their build/coverage/read paths are
# untouched; only the horizon-matched ablation basis reads it.
HORIZON_TABLE = "exog_weather_horizon"


class WeatherFetchIncompleteError(RuntimeError):
    """Raised when a fetch returns fewer days than the span it was asked for.

    The silent-gap defect S6 Part 1 fixes: a short return was inserted as-is and the
    incremental watermark (MAX(date)) advanced past the hole, so the missing interior
    days were never revisited. A loud failure belongs where a silent partial was."""


def _get(url: str, retries: int = 3) -> dict:
    last = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=40) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError) as exc:  # transient
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"open-meteo unreachable after {retries} tries: {last}")


def _assert_span_complete(df: pd.DataFrame, start: str, end: str,
                          cell: str, basis: str) -> None:
    """Raise unless `df` carries a non-null value for EVERY calendar day in [start, end].

    S6 Part 1: the write path must refuse a short return rather than insert it and let
    the incremental watermark step past the hole. Both a missing interior day (the Ellel
    2026-06-21..06-29 case) and a truncated tail trip this."""
    required = pd.date_range(start, end, freq="D")
    got = df[df["exo_temp_c"].notna()]
    have = set(pd.to_datetime(got["date"]).dt.normalize())
    missing = [d.date().isoformat() for d in required if d.normalize() not in have]
    if missing:
        raise WeatherFetchIncompleteError(
            f"{basis}/{cell}: fetch for [{start}, {end}] returned {len(required) - len(missing)}"
            f"/{len(required)} days; missing {len(missing)}: {missing[:8]}"
            f"{' ...' if len(missing) > 8 else ''}")


def _cell_span(cell: str) -> tuple[str, str]:
    """[earliest start, latest end] across the venues that share this cell."""
    starts, ends = [], []
    for v in FORECAST_VENUES:
        if WEATHER_CELLS[v] != cell:
            continue
        s = read_series(v, "L1", fill_calendar=True)
        starts.append(s["date"].min())
        ends.append(s["date"].max())
    return str(min(starts).date()), str(max(ends).date())


def _daily_frame(cell: str, days: dict) -> pd.DataFrame:
    out = pd.DataFrame({"date": pd.to_datetime(days["time"])})
    out["cell"] = cell
    out["exo_temp_c"] = days["temperature_2m_max"]
    out["exo_rain_mm"] = days["precipitation_sum"]
    out["exo_sunshine_hrs"] = [None if v is None else v / 3600.0
                               for v in days["sunshine_duration"]]
    return out


def fetch_observed(cell: str, start: str, end: str) -> pd.DataFrame:
    lat, lon = WEATHER_CELL_COORDS[cell]
    url = (f"{_ARCHIVE}?latitude={lat}&longitude={lon}&start_date={start}"
           f"&end_date={end}&daily={_DAILY}&timezone=Europe/London")
    return _daily_frame(cell, _get(url)["daily"])


def fetch_hindcast(cell: str, start: str, end: str) -> pd.DataFrame:
    lat, lon = WEATHER_CELL_COORDS[cell]
    url = (f"{_HINDCAST}?latitude={lat}&longitude={lon}&start_date={start}"
           f"&end_date={end}&daily={_DAILY}&timezone=Europe/London")
    return _daily_frame(cell, _get(url)["daily"])


def fetch_leadmatched(cell: str, start: str, end: str,
                      lead: int = WEATHER_LEAD_DAYS, *,
                      model: str | None = None) -> pd.DataFrame:
    """The forecast as issued exactly `lead` days ahead. The previous-runs API
    only exposes the `_previous_dayN` suffix on HOURLY variables, so pull hourly
    and aggregate to the same daily stats (max temp, sum rain, sum sunshine).

    `model` pins an explicit Open-Meteo model (e.g. `ecmwf_ifs025`); None leaves the
    API's automatic selection. S6 pins a global model for the horizon store because
    automatic selection can pick a local high-res model whose longer leads are null."""
    lat, lon = WEATHER_CELL_COORDS[cell]
    hourly = (f"temperature_2m_previous_day{lead},precipitation_previous_day{lead},"
              f"sunshine_duration_previous_day{lead}")
    url = (f"{_PREVRUNS}?latitude={lat}&longitude={lon}&start_date={start}"
           f"&end_date={end}&hourly={hourly}&timezone=Europe/London")
    if model:
        url += f"&models={model}"
    h = _get(url)["hourly"]
    df = pd.DataFrame({
        "ts": pd.to_datetime(h["time"]),
        "t": h[f"temperature_2m_previous_day{lead}"],
        "r": h[f"precipitation_previous_day{lead}"],
        "s": h[f"sunshine_duration_previous_day{lead}"],
    })
    df["date"] = df["ts"].dt.normalize()
    agg = df.groupby("date").agg(
        exo_temp_c=("t", "max"), exo_rain_mm=("r", "sum"),
        exo_sunshine_hrs=("s", lambda s: s.sum() / 3600.0)).reset_index()
    agg["cell"] = cell
    return agg[["date", "cell", "exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs"]]


_FETCH = {"observed": fetch_observed, "hindcast": fetch_hindcast,
          "leadmatched": fetch_leadmatched}


_COLS = ["date", "cell", "exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs"]


def build(force: bool = False) -> dict:
    """Pull every basis for every cell and persist. INCREMENTAL by default: an
    already-populated basis table is EXTENDED per cell from its current max date to
    the store's data max, never skipped (weather is immutable history, but the span
    grows as closed days land). `force=True` is the repair hatch: full drop and
    rebuild. The required span end is the store's L1 data max (via `_cell_span`), not
    a fixed constant, so `_auto_exog` genuinely carries new dates into the seam."""
    cells = sorted(set(WEATHER_CELLS.values()))
    spans = {cell: _cell_span(cell) for cell in cells}  # read-only, before write conn
    con = connect()
    summary = {}
    try:
        for basis in BASES:
            table = _TABLE[basis]
            exists = con.execute(
                "SELECT 1 FROM information_schema.tables WHERE table_name=?",
                [table]).fetchone()
            if not exists or force:
                # The rebuild path is the initial population and the force=True repair, the
                # largest and most gap-prone fetch, so it gets the same completeness guard as
                # the incremental path: a short return on any cell raises before any write.
                frames = []
                for cell in cells:
                    f = _FETCH[basis](cell, *spans[cell])
                    _assert_span_complete(f, spans[cell][0], spans[cell][1], cell, basis)
                    frames.append(f)
                df = pd.concat(frames, ignore_index=True)
                con.execute(f"DROP TABLE IF EXISTS {table}")
                con.register("_w", df)
                con.execute(f"CREATE TABLE {table} AS SELECT * FROM _w")
                con.unregister("_w")
                summary[basis] = {"rows": len(df), "added": len(df), "cached": False,
                                  "mode": "rebuild", "cells": cells}
                continue
            # Incremental: extend each cell to its required span end.
            added, pulled = 0, {}
            for cell in cells:
                start, end = spans[cell]
                cur = con.execute(
                    f"SELECT MAX(date) FROM {table} WHERE cell=?", [cell]).fetchone()[0]
                if cur is None:
                    gap_start = start
                else:
                    cur_d = pd.Timestamp(cur)
                    if cur_d.date() >= pd.Timestamp(end).date():
                        continue
                    gap_start = str((cur_d + pd.Timedelta(days=1)).date())
                df = _FETCH[basis](cell, gap_start, end)
                # Refuse a short return: the whole requested [gap_start, end] must be
                # present before we insert, or the watermark would step past a hole.
                _assert_span_complete(df, gap_start, end, cell, basis)
                if cur is not None:
                    df = df[df["date"] > pd.Timestamp(cur)]
                if df.empty:
                    continue
                con.register("_w", df)
                con.execute(
                    f"INSERT INTO {table} ({', '.join(_COLS)}) "
                    f"SELECT {', '.join(_COLS)} FROM _w")
                con.unregister("_w")
                added += len(df)
                pulled[cell] = (gap_start, end)
            total = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            summary[basis] = {"rows": total, "added": added, "cached": added == 0,
                              "mode": "incremental", "pulled": pulled}
    finally:
        con.close()
    return summary


def coverage(con=None) -> dict:
    """Per-basis, per-cell max covered date. `{basis: {cell: date|None}}`."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        out: dict = {}
        for basis in BASES:
            table = _TABLE[basis]
            exists = con.execute(
                "SELECT 1 FROM information_schema.tables WHERE table_name=?",
                [table]).fetchone()
            if not exists:
                out[basis] = {}
                continue
            rows = con.execute(f"SELECT cell, MAX(date) FROM {table} GROUP BY cell").fetchall()
            out[basis] = {c: (pd.Timestamp(m).date() if m is not None else None)
                          for c, m in rows}
        return out
    finally:
        if own:
            con.close()


def _required_ends(con) -> dict:
    """Per-cell required weather coverage end = the store's L1 data max across the
    venues that share the cell (the honest 'new date span' end)."""
    out: dict = {}
    for cell in sorted(set(WEATHER_CELLS.values())):
        ms = []
        for v in FORECAST_VENUES:
            if WEATHER_CELLS[v] != cell:
                continue
            r = con.execute("SELECT MAX(date) FROM l1_daily WHERE venue=?", [v]).fetchone()[0]
            if r is not None:
                ms.append(pd.Timestamp(r).date())
        out[cell] = max(ms) if ms else None
    return out


def weather_gap(con=None) -> list:
    """Structured coverage gap: one entry per (basis, cell) whose weather does not
    reach the store's data max. Empty list means every basis covers the new span.
    This is the loud, visible state B3 requires, in place of a swallowed skip."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        cov = coverage(con)
        req = _required_ends(con)
        gaps = []
        for basis in BASES:
            for cell, need in req.items():
                if need is None:
                    continue
                have = cov.get(basis, {}).get(cell)
                if have is None or have < need:
                    gaps.append({
                        "basis": basis, "cell": cell,
                        "covered_through": have.isoformat() if have else None,
                        "required_through": need.isoformat(),
                    })
        return gaps
    finally:
        if own:
            con.close()


def read_basis(basis: str, con=None) -> pd.DataFrame:
    """Read a weather basis table (date, cell, exo_temp_c/rain/sunshine)."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        table = _TABLE[basis]
        exists = con.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name=?",
            [table]).fetchone()
        if not exists:
            return pd.DataFrame(
                columns=["date", "cell", "exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs"])
        df = con.execute(f"SELECT * FROM {table}").df()
        df["date"] = pd.to_datetime(df["date"])
        return df
    finally:
        if own:
            con.close()


def repair_span(basis: str, cell: str, start: str, end: str, *,
                model: str | None = None) -> int:
    """Refetch [start, end] for one (basis, cell) and UPSERT it, asserting completeness.

    S6 Part 1's surgical repair for the Ellel 2026-06-21..06-29 hole: idempotent (deletes
    the span's rows first, reinserts the complete refetch), so it fills an interior gap the
    incremental watermark had stepped past without touching any other cell/basis/span.
    Raises `WeatherFetchIncompleteError` if the refetch is itself short, so a repair can
    never re-record a partial. Returns the row count written."""
    fetch = _FETCH[basis]
    df = (fetch(cell, start, end, model=model)
          if basis == "leadmatched" else fetch(cell, start, end))
    _assert_span_complete(df, start, end, cell, basis)
    con = connect()
    try:
        table = _TABLE[basis]
        con.execute(f"DELETE FROM {table} WHERE cell=? AND date BETWEEN ? AND ?",
                    [cell, start, end])
        con.register("_w", df)
        con.execute(f"INSERT INTO {table} ({', '.join(_COLS)}) "
                    f"SELECT {', '.join(_COLS)} FROM _w")
        con.unregister("_w")
    finally:
        con.close()
    return len(df)


# --- S6 A14c: the per-lead horizon store (one pinned global model, leads 1..7) ------

def build_horizon(*, model: str = WEATHER_HORIZON_MODEL,
                  max_lead: int = WEATHER_HORIZON_MAX_LEAD,
                  force: bool = False) -> dict:
    """Populate `exog_weather_horizon` with lead 1..`max_lead` from one pinned model.

    One row per (cell, date, lead); the weather value at lead h is the forecast issued h
    days before the valid date, which is what horizon step h would have at serving. Always
    a full drop-and-rebuild (the store is small and the pin/leads must stay consistent);
    every fetched span is completeness-asserted. Returns per-cell per-lead row counts."""
    # Check existence before fetching, like build(): a cache check must not hit the network,
    # and an already-populated store must survive an offline moment.
    with connect(read_only=True) as ro:
        exists = ro.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name=?",
            [HORIZON_TABLE]).fetchone()
    if exists and not force:
        return {"model": model, "max_lead": max_lead, "cached": True}

    cells = sorted(set(WEATHER_CELLS.values()))
    spans = {cell: _cell_span(cell) for cell in cells}
    frames, summary = [], {}
    for cell in cells:
        start, end = spans[cell]
        per_lead = {}
        for lead in range(1, max_lead + 1):
            df = fetch_leadmatched(cell, start, end, lead=lead, model=model)
            _assert_span_complete(df, start, end, cell, "horizon")
            df = df.copy()
            df["lead"] = lead
            frames.append(df[["date", "cell", "lead", "exo_temp_c",
                              "exo_rain_mm", "exo_sunshine_hrs"]])
            per_lead[lead] = len(df)
        summary[cell] = per_lead
    all_df = pd.concat(frames, ignore_index=True)
    con = connect()
    try:
        con.execute(f"DROP TABLE IF EXISTS {HORIZON_TABLE}")
        con.register("_w", all_df)
        con.execute(f"CREATE TABLE {HORIZON_TABLE} AS SELECT * FROM _w")
        con.unregister("_w")
    finally:
        con.close()
    return {"model": model, "max_lead": max_lead, "cached": False,
            "rows": len(all_df), "per_cell": summary}


def read_horizon(cell: str, con=None) -> pd.DataFrame:
    """Read the per-lead horizon store for one cell (date, lead, exo_temp_c/rain/sunshine)."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        exists = con.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name=?",
            [HORIZON_TABLE]).fetchone()
        if not exists:
            return pd.DataFrame(columns=["date", "cell", "lead", "exo_temp_c",
                                         "exo_rain_mm", "exo_sunshine_hrs"])
        df = con.execute(f"SELECT * FROM {HORIZON_TABLE} WHERE cell=?", [cell]).df()
        df["date"] = pd.to_datetime(df["date"])
        return df
    finally:
        if own:
            con.close()


def horizon_coverage(con=None) -> dict:
    """Non-null lead coverage per cell per lead in the horizon store, for the S6 G2 record."""
    own = con is None
    con = con or connect(read_only=True)
    try:
        exists = con.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name=?",
            [HORIZON_TABLE]).fetchone()
        if not exists:
            return {}
        rows = con.execute(
            f"SELECT cell, lead, COUNT(*) FILTER (WHERE exo_temp_c IS NOT NULL), "
            f"COUNT(*), MIN(date), MAX(date) FROM {HORIZON_TABLE} "
            f"GROUP BY cell, lead ORDER BY cell, lead").fetchall()
        out: dict = {}
        for cell, lead, nonnull, total, dmin, dmax in rows:
            out.setdefault(cell, {})[int(lead)] = {
                "non_null": int(nonnull), "rows": int(total),
                "span": [pd.Timestamp(dmin).date().isoformat(),
                         pd.Timestamp(dmax).date().isoformat()]}
        return out
    finally:
        if own:
            con.close()


def main() -> int:
    print("A14 · weather ingest (Open-Meteo, 3 bases)")
    summary = build()
    ok = True
    for basis in BASES:
        s = summary[basis]
        tag = ("cached (covers span)" if s.get("cached")
               else f"{s.get('mode', 'rebuild')} +{s.get('added', s['rows'])} rows")
        print(f"  {basis:12s} rows={s['rows']:5d}  {tag}")
        ok = ok and s["rows"] > 0
    # Sanity: observed and hindcast must differ somewhere (a forecast is not ERA5).
    obs = read_basis("observed"); hind = read_basis("hindcast")
    merged = obs.merge(hind, on=["date", "cell"], suffixes=("_o", "_h"))
    differ = bool((merged["exo_temp_c_o"] - merged["exo_temp_c_h"]).abs().gt(0.01).any()) \
        if not merged.empty else False
    print(f"  observed != hindcast (temp): {differ}")
    ok = ok and differ
    print(f"A14-weather RESULT: {'PASS' if ok else 'FAIL'} "
          f"(3 bases populated; forecast basis differs from reanalysis)")
    return 0 if ok else 1


def derive_is_dry(df: pd.DataFrame) -> pd.DataFrame:
    """Set `exo_is_dry` from `exo_rain_mm`, keeping any value the caller supplied.

    **Must run AFTER the supplied-covariate overlay**, in every frame, or `exo_is_dry`
    means different things at fit and serve time. It did: the training frame derived it
    before the overlay and the horizon frame after, so a tenant supplying rain but not
    `exo_is_dry` trained on 0.0 for every row (NaN < 1.0 is False) and served 1.0 on dry
    days. `exo_is_dry` is not a GBM feature - it is excluded by the A14 ablation verdict -
    but it IS one of the 15 `CHRONOS2_EXO_COLS`, so the skew landed on the served entrant
    and on nothing that would have failed.

    Existing values are preserved where present, so a caller that has its own definition
    of "dry" is not overruled by a threshold it never chose.
    """
    derived = (df["exo_rain_mm"] < WEATHER_DRY_MM).astype(float)
    if "exo_is_dry" in df:
        df["exo_is_dry"] = df["exo_is_dry"].where(df["exo_is_dry"].notna(), derived)
    else:
        df["exo_is_dry"] = derived
    return df


if __name__ == "__main__":
    sys.exit(main())
