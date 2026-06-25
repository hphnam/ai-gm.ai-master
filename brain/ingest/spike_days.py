"""A14 · Retrospective spike / discount-day flag (spec §6).

Derives `is_spike_day` per (venue, date) from the discount share already parsed
in A0 (`discounts` / `gross_sales`). A spike day is one where an unusually large
share of gross sales was discounted — a promo/event the model could not have
known in advance.

CRITICAL: `is_spike_day` is **retrospective**. It is NOT a forward regressor and
stays in `_NON_FEATURE` (FLAG-FE9). Its legitimate uses are (a) deviation
attribution ("that spike coincided with a discount day") and (b) training-data
treatment (down-weight / widen bands on spike days). The forward hook is a future
operator-supplied `promo_calendar` (known in advance), shipped here as an empty
table.

Run:
    python -m ingest.spike_days
"""

from __future__ import annotations

import sys

import pandas as pd

from config import SPIKE_DISCOUNT_SHARE
from store.warehouse import connect


def compute(con=None) -> pd.DataFrame:
    own = con is None
    con = con or connect(read_only=True)
    try:
        df = con.execute(
            """
            SELECT venue, date,
                   SUM(discounts)   AS discounts,
                   SUM(gross_sales) AS gross_sales
            FROM line_items
            WHERE NOT excluded
            GROUP BY venue, date
            ORDER BY venue, date
            """
        ).df()
    finally:
        if own:
            con.close()
    # discounts are stored negative (a reduction); use magnitude over gross.
    gross = df["gross_sales"].where(df["gross_sales"] > 0)
    df["discounted_share"] = (df["discounts"].abs() / gross).fillna(0.0).round(4)
    df["is_spike_day"] = (df["discounted_share"] >= SPIKE_DISCOUNT_SHARE).astype(int)
    df["date"] = pd.to_datetime(df["date"])
    return df[["venue", "date", "discounted_share", "is_spike_day"]]


def build() -> pd.DataFrame:
    spikes = compute()
    con = connect()
    try:
        con.execute("DROP TABLE IF EXISTS spike_days")
        con.register("_sp", spikes)
        con.execute("CREATE TABLE spike_days AS SELECT * FROM _sp")
        con.unregister("_sp")
        # Forward hook: empty promo_calendar (operator-supplied, known-in-advance).
        con.execute(
            "CREATE TABLE IF NOT EXISTS promo_calendar ("
            "venue VARCHAR, date DATE, promo_name VARCHAR, expected_pull VARCHAR)")
    finally:
        con.close()
    return spikes


def read_spikes(con=None) -> pd.DataFrame:
    own = con is None
    con = con or connect(read_only=True)
    try:
        exists = con.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_name='spike_days'"
        ).fetchone()
        if not exists:
            return pd.DataFrame(columns=["venue", "date", "discounted_share", "is_spike_day"])
        df = con.execute("SELECT * FROM spike_days").df()
        df["date"] = pd.to_datetime(df["date"])
        return df
    finally:
        if own:
            con.close()


def main() -> int:
    print("A14 · spike / discount-day flag (retrospective)")
    spikes = build()
    n_spike = int(spikes["is_spike_day"].sum())
    by_venue = spikes[spikes["is_spike_day"] == 1].groupby("venue").size().to_dict()
    print(f"  rows              : {len(spikes)} (venue×date)")
    print(f"  threshold         : discounted_share >= {SPIKE_DISCOUNT_SHARE}")
    print(f"  spike days        : {n_spike} {by_venue or ''}")
    print("  use               : attribution + band-treatment ONLY — never a "
          "forward regressor (stays in _NON_FEATURE; FLAG-FE9)")
    ok = len(spikes) > 0
    print(f"A14-spike RESULT: {'PASS' if ok else 'FAIL'} (retrospective flag built)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
