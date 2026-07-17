"""Caller-supplied covariates, and the one place they are overlaid.

The brain derives its covariates from curated Lancaster sources: Open-Meteo cells keyed
to Lune's coordinates, hand-curated Lancaster/Preston fixtures, a UK academic calendar,
a 2026 World Cup schedule. For Lune those are real. For any other tenant they are a
guess at best, and for weather they are simply absent - compute holds no connection, so
it cannot fetch a forecast for a venue it has never heard of.

So the API supplies them, and this module overlays them onto whatever was derived. It is
used by BOTH the training frame (`features.build_features._attach_exog`) and the horizon
frame (`compute.forward`), through the same function, because a covariate that means one
thing in training and another at serving time is train/serve skew - and skew in a
covariate the model was fit on is invisible until the forecast is quietly wrong.

Rows land in a scratch table rather than being passed as an argument for the same reason
the sales rows do: the analytics read the store, and a table is what lets injected data
reach them without rewriting every signature. Absent table means the research path, which
overlays nothing and reproduces bit-for-bit.
"""

from __future__ import annotations

import pandas as pd

# The covariate universe a caller may set. Deliberately a literal rather than an import
# of `models.foundation.CHRONOS2_EXO_COLS`: `ingest` sits below `models` and importing
# upward would invert the layering. `tests/test_exog_supplied.py` asserts the two agree,
# so the duplication cannot drift silently.
KNOWN_EXO_COLS: frozenset[str] = frozenset({
    # calendar
    "is_bank_holiday", "is_ellel_event", "exo_is_school_term", "exo_is_uni_term",
    # event
    "exo_fixture_nearby", "exo_event_rank",
    # World Cup
    "wc_match_in_hours", "wc_england_in_hours", "wc_scotland_in_hours",
    "wc_home_nation_in_hours", "wc_n_matches_in_hours", "wc_any_match",
    # weather
    "exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs", "exo_is_dry",
})

_TABLE = "exog_supplied"

# How many distinct unknown covariate names are worth echoing back. The point of the
# report is to name the mistake, not to inventory it.
MAX_REPORTED_UNKNOWN = 10


def write_supplied(con, rows) -> tuple[int, list[str]]:
    """Materialise supplied covariates into the scratch store, long-form.

    Returns (n_rows, unknown_column_names). Unknown names are NOT written and NOT an
    error: `ExogenousRow.values` is a free `dict[str, float]`, so `extra="forbid"` -
    which stops a caller inventing a top-level field - does not reach inside it. A
    caller that sends `exo_tempc` would otherwise get silence and a univariate forecast
    wearing the exo model's name. The engine reports them back instead.

    The unknown set is capped. Every name is caller-controlled and they are joined into
    one diagnostic string, so the honest report is itself an amplifier: a request inside
    every contract bound (500k exogenous rows x 64 keys, all distinct) would otherwise
    collect tens of millions of names and render them into a multi-gigabyte string. A
    handful names the mistake; the rest only repeat it.
    """
    long: list[dict] = []
    unknown: set[str] = set()
    for r in rows:
        for col, value in r.values.items():
            if col not in KNOWN_EXO_COLS:
                if len(unknown) < MAX_REPORTED_UNKNOWN:
                    unknown.add(col)
                continue
            long.append({"venue": r.venue, "date": pd.Timestamp(r.date).normalize(),
                         "col": col, "value": float(value)})

    frame = pd.DataFrame(long, columns=["venue", "date", "col", "value"])
    if frame.empty:
        # Typed, even when empty: an all-object frame lands `date` as VARCHAR and the
        # later join silently matches nothing.
        frame = frame.astype({"venue": "object", "col": "object", "value": "float64"})
        frame["date"] = pd.Series(dtype="datetime64[ns]")
    con.register("_exog_supplied", frame)
    con.execute(f"CREATE OR REPLACE TABLE {_TABLE} AS SELECT * FROM _exog_supplied")
    con.unregister("_exog_supplied")
    return len(frame), sorted(unknown)


def read_supplied(venue: str, con) -> pd.DataFrame:
    """Wide frame (date + one column per supplied covariate) for `venue`.

    Empty frame when nothing was supplied or the table does not exist, which is the
    research path: `build_features` then overlays nothing.
    """
    exists = con.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_name=?", [_TABLE]).fetchone()
    if not exists:
        return pd.DataFrame(columns=["date"])
    df = con.execute(
        f"SELECT date, col, value FROM {_TABLE} WHERE venue=?", [venue]).df()
    if df.empty:
        return pd.DataFrame(columns=["date"])
    wide = df.pivot_table(index="date", columns="col", values="value", aggfunc="last")
    wide.index = pd.to_datetime(wide.index)
    return wide.reset_index().rename_axis(None, axis=1)


def overlay(df: pd.DataFrame, venue: str, con=None) -> pd.DataFrame:
    """Replace derived covariates with supplied ones, per (venue, date, column).

    Precedence is one-directional and deliberate: where both the request and the curated
    source have a value, the request wins. The derived value is compute's guess about a
    tenant it knows nothing about; the caller's is a fact about its own venue.

    A supplied column absent for a given date leaves that date's derived value alone, so
    a caller may override a single day's weather without having to restate the calendar.
    """
    from store.warehouse import connect

    own = con is None
    con = con or connect(read_only=True)
    try:
        sup = read_supplied(venue, con)
    finally:
        if own:
            con.close()
    if sup.empty or "date" not in sup:
        return df

    out = df.copy()
    out["date"] = pd.to_datetime(out["date"])
    sup = sup.set_index("date")
    for col in sup.columns:
        mapped = out["date"].map(sup[col])
        out[col] = mapped.where(mapped.notna(), out[col]) if col in out else mapped
    return out
