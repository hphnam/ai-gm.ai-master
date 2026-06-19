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
    HAPPY_HOUR_DAYS,
    PRICE_REGIME_BREAK,
    RECONCILE_TOL,
    STORE_DIR,
    STRUCTURAL_ZERO_DOW,
)
from store.warehouse import connect, read_series

BH_DAILY_PARQUET = STORE_DIR / "bh_daily.parquet"

# Columns that are the exogenous-join seam — present but unpopulated in Phase 2.
EXO_COLUMNS = [
    "exo_temp_c",
    "exo_rain_mm",
    "exo_sunshine_hrs",
    "exo_is_school_term",
    "exo_fixture_nearby",
]

# Non-feature columns (identifiers, target, and the empty exogenous seam).
_NON_FEATURE = {"date", "venue", "value"} | set(EXO_COLUMNS)


def _uk_bank_holidays(years: range) -> set:
    cal = holidays.UnitedKingdom(subdiv="England", years=list(years))
    return set(cal.keys())


def _ellel_event_dates(con) -> set:
    """Dates on which Ellel traded — the spillover-hypothesis event calendar."""
    df = read_series("ellel", "L1", con=con)
    return set(df.loc[df["value"] > 0, "date"].dt.date)


def build_features(venue: str = ANCHOR_VENUE) -> pd.DataFrame:
    """Return the leak-free daily feature table for one venue."""
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

    # --- Exogenous-join seam (present, unpopulated) -------------------------
    for col in EXO_COLUMNS:
        df[col] = np.nan

    return df


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
    exo_empty = all(df[c].isna().all() for c in EXO_COLUMNS)

    print("A3 · L1 features (Beer Hall)")
    print(f"  rows (daily)      : {len(df)}")
    print(f"  span              : {df['date'].min().date()} -> {df['date'].max().date()}")
    print(f"  L1 net ex-VAT     : £{total:,.2f} (audit £{BH_NET_SALES_TOTAL:,.0f})")
    print(f"  reconciles        : {reconciles}")
    print(f"  feature columns   : {len(feats)}")
    print(f"  leak-free         : {leak_free}")
    print(f"  exogenous seam    : present={exo_present} unpopulated={exo_empty} "
          f"({len(EXO_COLUMNS)} cols)")
    print(f"  parquet           : {BH_DAILY_PARQUET}")

    ok = reconciles and leak_free and exo_present and exo_empty
    print(f"A3 RESULT: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
