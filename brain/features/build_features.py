"""A3 · L1 daily series + leak-free feature table (methodology §5 step 3).

Builds the venue-daily revenue (ex-VAT) series on a continuous calendar and
engineers features that are *all knowable at prediction time*: calendar flags
(DOW, month, season, Happy-Hour day, UK bank holiday, Ellel event night,
price regime) and strictly-past statistics (lag-7, lag-14, rolling-4-week
median). The target (`value`) is never used as its own feature.

A clean **exogenous-join seam** is included: `exo_*` columns keyed on
(venue, date), present but unpopulated, so weather / fixtures / school-term
covariates attach later with no model rework.

Run:
    python -m features.build_features            # Beer Hall -> store/bh_daily.parquet
"""

from __future__ import annotations

import sys

import holidays
import numpy as np
import pandas as pd

from config import (
    ANCHOR_VENUE,
    BH_NET_SALES_TOTAL,
    EVENT_SCOPE,
    HAPPY_HOUR_DAYS,
    PRICE_REGIME_BREAK,
    RECONCILE_TOL,
    STORE_DIR,
    STRUCTURAL_ZERO_DOW,
    WEATHER_CELLS,
    WEATHER_DRY_MM,
    WEATHER_TRAIN_BASIS,
)
from ingest import calendar_sources as cal
from ingest.exog_weather import read_basis
from ingest.local_events import read_events
from store.warehouse import connect, read_series

BH_DAILY_PARQUET = STORE_DIR / "bh_daily.parquet"

# The full exogenous column set, now populated by _attach_exog (A14). Weather +
# the activated deterministic flags become model features; the rest are kept for
# attribution only (see _NON_FEATURE below).
EXO_COLUMNS = [
    "exo_temp_c",
    "exo_rain_mm",
    "exo_sunshine_hrs",
    "exo_is_dry",
    "exo_is_school_term",
    "exo_is_uni_term",
    "exo_uni_phase",
    "exo_fixture_nearby",
    "exo_event_rank",
]

# Exogenous columns ADOPTED as model features. This set is EMPTY by the A14
# ablation's verdict (signals/feature_ablation.py): against the strong
# autoregressive baseline (lag-7/14, roll-28, DOW), no exo feature improves
# held-out MASE on the operational rolling-origin window — calendar flags are
# near-constant within the recent test folds (so add only overfitting), weather
# overfits ~270 days, and events have no in-window anchors. The whole seam is
# still POPULATED (below) for deviation attribution and the weather train/serve
# study; adoption is gated by evidence, not assumed. Flip a column in here only
# if a re-run of the ablation rewards it (e.g. on a longer horizon that spans
# term-boundary transitions). See feature_ablation.md / FLAG-FE10.
_ADOPTED_EXO: frozenset[str] = frozenset()

# Non-feature columns: identifiers, target, and the non-adopted exogenous columns.
_NON_FEATURE = {"date", "venue", "value"} | (set(EXO_COLUMNS) - _ADOPTED_EXO)


def _uk_bank_holidays(years: range) -> set:
    cal = holidays.UnitedKingdom(subdiv="England", years=list(years))
    return set(cal.keys())


def _ellel_event_dates(con) -> set:
    """Dates on which Ellel traded — the spillover-hypothesis event calendar."""
    df = read_series("ellel", "L1", con=con)
    return set(df.loc[df["value"] > 0, "date"].dt.date)


def build_features(venue: str = ANCHOR_VENUE,
                   weather_basis: str = WEATHER_TRAIN_BASIS) -> pd.DataFrame:
    """Return the leak-free daily feature table for one venue. `weather_basis`
    selects which weather table populates the weather columns (the A14 train/serve
    study sweeps it); the default is config.WEATHER_TRAIN_BASIS."""
    con = connect(read_only=True)
    try:
        series = read_series(venue, "L1", fill_calendar=True, con=con)
        ellel_events = _ellel_event_dates(con)
    finally:
        con.close()

    df = series[["date", "value"]].copy()
    df["venue"] = venue
    d = df["date"]

    # --- Deterministic calendar features (known in advance) -----------------
    df["dow"] = d.dt.dayofweek
    df["is_weekend"] = (df["dow"] >= 5).astype(int)
    for k in range(7):
        df[f"dow_{k}"] = (df["dow"] == k).astype(int)
    df["month"] = d.dt.month
    df["quarter"] = d.dt.quarter
    # Meteorological season as an ordinal (0=winter..3=autumn).
    df["season"] = (d.dt.month % 12 // 3).astype(int)
    df["weekofyear"] = d.dt.isocalendar().week.astype(int)

    df["is_happy_hour_day"] = df["dow"].isin(HAPPY_HOUR_DAYS).astype(int)
    df["is_structural_zero"] = df["dow"].isin(STRUCTURAL_ZERO_DOW).astype(int)

    bh_holidays = _uk_bank_holidays(range(d.dt.year.min(), d.dt.year.max() + 1))
    df["is_bank_holiday"] = d.dt.date.isin(bh_holidays).astype(int)
    df["is_ellel_event"] = d.dt.date.isin(ellel_events).astype(int)
    df["price_regime"] = (d >= pd.Timestamp(PRICE_REGIME_BREAK)).astype(int)

    # --- Strictly-past statistics (shifted so today is never used) ----------
    df["lag_7"] = df["value"].shift(7)
    df["lag_14"] = df["value"].shift(14)
    # rolling-4-week median, shifted by 1 so the window ends yesterday.
    df["roll28_median"] = df["value"].shift(1).rolling(28, min_periods=7).median()
    df["roll28_mean"] = df["value"].shift(1).rolling(28, min_periods=7).mean()

    # --- Exogenous features (A14): calendar + weather + events --------------
    df = _attach_exog(df, venue, basis=weather_basis)
    return df


def _attach_exog(df: pd.DataFrame, venue: str, basis: str = WEATHER_TRAIN_BASIS,
                 con=None) -> pd.DataFrame:
    """Populate the exo_* columns by LEFT-JOINing the deterministic calendar
    (leakage-free at any horizon), the chosen weather basis, and curated local
    events. Venue→cell and venue→event-scope maps come from config; events are
    never cross-applied across cities."""
    d = df["date"]

    # Deterministic calendar — known in advance, safe at any horizon.
    df["exo_is_school_term"] = d.map(cal.is_school_term).astype(int)
    df["exo_is_uni_term"] = d.map(cal.is_uni_term).astype(int)
    df["exo_uni_phase"] = d.map(cal.uni_phase)

    # Weather — the chosen training basis for this venue's grid cell.
    cell = WEATHER_CELLS.get(venue)
    wx = read_basis(basis, con=con)
    wx = wx[wx["cell"] == cell][["date", "exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs"]]
    df = df.merge(wx, on="date", how="left")
    df["exo_is_dry"] = (df["exo_rain_mm"] < WEATHER_DRY_MM).astype("float")

    # Local events — only this venue's scope(s); fixture flag + max rank.
    scopes = set(EVENT_SCOPE.get(venue, ())) | {"all"}
    ev = read_events(con=con)
    ev = ev[ev["venue_scope"].isin(scopes)]
    if not ev.empty:
        rank_by_date = ev.groupby("event_date")["rank"].max()
        df["exo_event_rank"] = df["date"].map(rank_by_date).fillna(0).astype(float)
    else:
        df["exo_event_rank"] = 0.0
    df["exo_fixture_nearby"] = (df["exo_event_rank"] > 0).astype(int)

    return df[[c for c in df.columns if c != "exo_uni_phase"] + ["exo_uni_phase"]]


def feature_columns(df: pd.DataFrame) -> list[str]:
    """Model feature columns: everything bar ids/target and the empty seam."""
    return [c for c in df.columns if c not in _NON_FEATURE]


def assert_no_leakage(df: pd.DataFrame) -> None:
    """Verify lag/rolling features only ever reference strictly-earlier dates."""
    s = df.set_index("date")["value"]
    for _, row in df.dropna(subset=["lag_7"]).iterrows():
        past = s.loc[s.index < row["date"]]
        expected = s.loc[row["date"] - pd.Timedelta(days=7)]
        if not np.isclose(row["lag_7"], expected):
            raise AssertionError(f"lag_7 leak at {row['date']}")
        # rolling median must be computable from the strictly-past window.
        if not np.isnan(row["roll28_median"]) and len(past) < 7:
            raise AssertionError(f"rolling median used too-short past at {row['date']}")


def main() -> int:
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    df = build_features(ANCHOR_VENUE)
    df.to_parquet(BH_DAILY_PARQUET, index=False)

    total = df["value"].sum()
    reconciles = abs(total - BH_NET_SALES_TOTAL) <= BH_NET_SALES_TOTAL * RECONCILE_TOL

    leak_free = True
    try:
        assert_no_leakage(df)
    except AssertionError as exc:  # pragma: no cover - guard
        leak_free = False
        print(f"  LEAKAGE: {exc}")

    feats = feature_columns(df)
    exo_present = all(c in df.columns for c in EXO_COLUMNS)
    # The deterministic calendar seam must be fully populated (always knowable);
    # weather may be NaN if the weather tables have not been ingested.
    seam_populated = not df[["exo_is_school_term", "exo_is_uni_term"]].isna().any().any()
    gaps = cal.coverage_gaps(df["date"].min(), df["date"].max())

    print("A3 · L1 features (Beer Hall)")
    print(f"  rows (daily)      : {len(df)}")
    print(f"  span              : {df['date'].min().date()} -> {df['date'].max().date()}")
    print(f"  L1 net ex-VAT     : £{total:,.2f} (audit £{BH_NET_SALES_TOTAL:,.0f})")
    print(f"  reconciles        : {reconciles}")
    print(f"  feature columns   : {len(feats)} (adopted exo: {sorted(_ADOPTED_EXO) or 'none — ablation verdict'})")
    print(f"  leak-free         : {leak_free}")
    print(f"  exo seam          : present={exo_present} calendar_populated={seam_populated} "
          f"({len(EXO_COLUMNS)} cols)")
    print(f"  calendar coverage : {'full' if not gaps else f'GAPS {gaps}'}")
    print(f"  parquet           : {BH_DAILY_PARQUET}")

    ok = reconciles and leak_free and exo_present and seam_populated and not gaps
    print(f"A3 RESULT: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
