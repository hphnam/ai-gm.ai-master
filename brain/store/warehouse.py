"""A1 · Local time-series store (the brain's memory).

A DuckDB database that holds the tidy line items plus the three forecasting
layers as views, and persistent tables for the brain's own forecasts and
calibrated bands. This *is* the warehoused history the production architecture
lacks — the methodology's stated design contribution.

Layers:
    L1  venue-daily          revenue ex-VAT (the spine)
    L2  venue-category-daily  units AND £
    L3  venue-item-daily      units (and £)

Run:
    python -m store.warehouse --build       # (re)build from line_items.parquet
    python -m store.warehouse --check       # round-trip + reconciliation check
"""

from __future__ import annotations

import argparse
import sys
from datetime import date

import duckdb
import pandas as pd

from config import (
    BH_NET_SALES_TOTAL,
    DUCKDB_PATH,
    RECONCILE_TOL,
    STORE_DIR,
)
from ingest.normalise import LINE_ITEMS_PARQUET

LAYERS = ("L1", "L2", "L3")


def connect(read_only: bool = False) -> duckdb.DuckDBPyConnection:
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(DUCKDB_PATH), read_only=read_only)


def _create_views(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """
        CREATE OR REPLACE VIEW l1_daily AS
        SELECT
            venue,
            date,
            CAST(dayofweek(date) AS INTEGER)        AS dow,
            SUM(net_sales_exvat)                    AS revenue_exvat,
            SUM(net_sales)                          AS revenue_raw,
            SUM(gross_sales)                        AS gross_sales,
            SUM(qty)                                AS units,
            COUNT(*)                                AS n_line_items,
            COUNT(DISTINCT transaction_id)          AS n_transactions
        FROM line_items
        WHERE NOT excluded
        GROUP BY venue, date
        """
    )
    con.execute(
        """
        CREATE OR REPLACE VIEW l2_category_daily AS
        SELECT
            venue,
            date,
            COALESCE(category, 'Uncategorised')     AS category,
            SUM(qty)                                AS units,
            SUM(net_sales_exvat)                    AS revenue_exvat
        FROM line_items
        WHERE NOT excluded
        GROUP BY venue, date, COALESCE(category, 'Uncategorised')
        """
    )
    con.execute(
        """
        CREATE OR REPLACE VIEW l3_item_daily AS
        SELECT
            venue,
            date,
            item,
            COALESCE(category, 'Uncategorised')     AS category,
            SUM(qty)                                AS units,
            SUM(net_sales_exvat)                    AS revenue_exvat
        FROM line_items
        WHERE NOT excluded AND item IS NOT NULL
        GROUP BY venue, date, item, COALESCE(category, 'Uncategorised')
        """
    )


def _create_output_tables(con: duckdb.DuckDBPyConnection) -> None:
    # Persisted brain outputs. `key` holds the category (L2) or item (L3), NULL
    # at L1. (venue, layer, key, target_date, model) is the logical PK we
    # upsert on.
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS forecasts (
            venue       VARCHAR NOT NULL,
            layer       VARCHAR NOT NULL,
            key         VARCHAR,
            target_date DATE    NOT NULL,
            model       VARCHAR NOT NULL,
            yhat        DOUBLE  NOT NULL,
            created_at  TIMESTAMP DEFAULT now()
        )
        """
    )
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS bands (
            venue       VARCHAR NOT NULL,
            layer       VARCHAR NOT NULL,
            key         VARCHAR,
            target_date DATE    NOT NULL,
            model       VARCHAR NOT NULL,
            level       DOUBLE  NOT NULL,
            lo          DOUBLE  NOT NULL,
            hi          DOUBLE  NOT NULL,
            created_at  TIMESTAMP DEFAULT now()
        )
        """
    )


def build() -> None:
    """(Re)build the store from the A0 parquet. Idempotent."""
    if not LINE_ITEMS_PARQUET.exists():
        raise FileNotFoundError(
            f"{LINE_ITEMS_PARQUET} missing — run `python -m ingest.normalise` first."
        )
    con = connect()
    try:
        con.execute("DROP TABLE IF EXISTS line_items")
        con.execute(
            "CREATE TABLE line_items AS SELECT * FROM read_parquet(?)",
            [str(LINE_ITEMS_PARQUET)],
        )
        _create_views(con)
        _create_output_tables(con)
    finally:
        con.close()


# --- Read helpers ------------------------------------------------------------

def read_series(
    venue: str,
    layer: str = "L1",
    *,
    value: str = "revenue_exvat",
    fill_calendar: bool = False,
    con: duckdb.DuckDBPyConnection | None = None,
) -> pd.DataFrame:
    """Read a daily series for a venue/layer.

    L1 returns one row per date. L2/L3 return one row per (date, key). When
    `fill_calendar` is set on L1, the series is reindexed onto a continuous
    daily calendar with missing days filled to 0 (the structural-zero days).
    """
    own = con is None
    con = con or connect(read_only=True)
    try:
        if layer == "L1":
            df = con.execute(
                f"SELECT date, dow, {value} AS value FROM l1_daily "
                "WHERE venue = ? ORDER BY date",
                [venue],
            ).df()
        elif layer == "L2":
            df = con.execute(
                f"SELECT date, category AS key, {value} AS value "
                "FROM l2_category_daily WHERE venue = ? ORDER BY date, category",
                [venue],
            ).df()
        elif layer == "L3":
            df = con.execute(
                f"SELECT date, item AS key, category, {value} AS value "
                "FROM l3_item_daily WHERE venue = ? ORDER BY date, item",
                [venue],
            ).df()
        else:
            raise ValueError(f"unknown layer {layer!r}; expected one of {LAYERS}")
    finally:
        if own:
            con.close()

    df["date"] = pd.to_datetime(df["date"])
    if layer == "L1" and fill_calendar and not df.empty:
        full = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
        df = (
            df.set_index("date")
            .reindex(full)
            .rename_axis("date")
            .reset_index()
        )
        df["value"] = df["value"].fillna(0.0)
        df["dow"] = df["date"].dt.dayofweek
    return df


# --- Write helpers -----------------------------------------------------------

_FORECAST_COLS = ["venue", "layer", "key", "target_date", "model", "yhat"]
_BAND_COLS = ["venue", "layer", "key", "target_date", "model", "level", "lo", "hi"]


def write_forecast(
    df: pd.DataFrame, con: duckdb.DuckDBPyConnection | None = None
) -> int:
    """Upsert forecast rows keyed on (venue, layer, key, target_date, model)."""
    return _upsert("forecasts", df, _FORECAST_COLS, con)


def write_band(
    df: pd.DataFrame, con: duckdb.DuckDBPyConnection | None = None
) -> int:
    """Upsert band rows keyed on (venue, layer, key, target_date, model, level)."""
    return _upsert("bands", df, _BAND_COLS, con)


def _upsert(
    table: str,
    df: pd.DataFrame,
    cols: list[str],
    con: duckdb.DuckDBPyConnection | None,
) -> int:
    if df.empty:
        return 0
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise ValueError(f"{table} write missing columns: {missing}")
    payload = df[cols].copy()
    payload["key"] = payload["key"].astype("object").where(payload["key"].notna(), None)

    own = con is None
    con = con or connect()
    try:
        con.register("_payload", payload)
        # Delete colliding rows, then append — a portable upsert.
        key_cols = [c for c in cols if c not in ("yhat", "lo", "hi")]
        join = " AND ".join(
            f"(t.{c} = p.{c} OR (t.{c} IS NULL AND p.{c} IS NULL))" for c in key_cols
        )
        con.execute(
            f"DELETE FROM {table} t WHERE EXISTS "
            f"(SELECT 1 FROM _payload p WHERE {join})"
        )
        con.execute(
            f"INSERT INTO {table} ({', '.join(cols)}) "
            f"SELECT {', '.join(cols)} FROM _payload"
        )
        con.unregister("_payload")
        return len(payload)
    finally:
        if own:
            con.close()


def read_band(
    venue: str,
    layer: str = "L1",
    *,
    level: float | None = None,
    con: duckdb.DuckDBPyConnection | None = None,
) -> pd.DataFrame:
    own = con is None
    con = con or connect(read_only=True)
    try:
        # `key` is NULL at L1; a plain USING/equi-join drops NULL=NULL rows, so
        # join on IS NOT DISTINCT FROM for the nullable key.
        sql = (
            "SELECT f.target_date AS date, f.yhat, b.level, b.lo, b.hi, f.model "
            "FROM forecasts f JOIN bands b ON "
            "  f.venue = b.venue AND f.layer = b.layer "
            "  AND f.key IS NOT DISTINCT FROM b.key "
            "  AND f.target_date = b.target_date AND f.model = b.model "
            "WHERE f.venue = ? AND f.layer = ?"
        )
        params: list = [venue, layer]
        if level is not None:
            sql += " AND b.level = ?"
            params.append(level)
        sql += " ORDER BY f.target_date"
        return con.execute(sql, params).df()
    finally:
        if own:
            con.close()


# --- CLI / checks ------------------------------------------------------------

def check() -> bool:
    con = connect(read_only=True)
    try:
        ok = True
        for layer in LAYERS:
            df = read_series("beer_hall", layer, con=con)
            roundtrips = not df.empty
            print(f"  {layer} round-trip   : {'ok' if roundtrips else 'EMPTY'} "
                  f"({len(df)} rows)")
            ok = ok and roundtrips

        bh_total = float(
            con.execute(
                "SELECT SUM(revenue_exvat) FROM l1_daily WHERE venue = 'beer_hall'"
            ).fetchone()[0]
        )
    finally:
        con.close()

    delta = abs(bh_total - BH_NET_SALES_TOTAL)
    reconciles = delta <= BH_NET_SALES_TOTAL * RECONCILE_TOL
    print(f"  BH L1 net ex-VAT  : £{bh_total:,.2f} "
          f"(audit £{BH_NET_SALES_TOTAL:,.0f}, Δ £{delta:,.2f})")
    ok = ok and reconciles
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description="Proactive Brain DuckDB store")
    ap.add_argument("--build", action="store_true", help="rebuild from parquet")
    ap.add_argument("--check", action="store_true", help="round-trip + reconcile")
    args = ap.parse_args()
    if not (args.build or args.check):
        args.build = args.check = True

    print("A1 · time-series store")
    if args.build:
        build()
        print(f"  built             : {DUCKDB_PATH}")
    ok = True
    if args.check:
        ok = check()
    print(f"A1 RESULT: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
