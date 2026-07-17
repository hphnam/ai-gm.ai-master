"""Materialise an injected dataset into the per-request scratch store.

This is what lets the statelessness refactor avoid rewriting ~157 call sites: the
analytics layer reads the store through `warehouse.connect()`, so if the store is a
temporary database holding exactly the rows the API handed us, every existing function
works unchanged against injected data and persists nothing.

The brain's base table is `line_items` and L1/L2/L3 are VIEWS over it, so the loader has
one real job: turn the API's daily aggregate back into line-grain rows the views can
aggregate. Those rows are synthetic by construction - one line per
(venue, date, category, item) carrying that cell's units and ex-VAT revenue. That is not
a fabrication of detail the brain then trusts: the views immediately re-aggregate to the
same daily grain the forecaster consumes, so the round-trip is lossless at the only
grain that is read. It is the same aggregate path `sim/ingest_june_actuals.py` already
uses.

The `ts` column is the one place this matters. Trading hours are derived from
transaction time-of-day, which a daily aggregate does not carry, so the API supplies
`trading_hours` directly (CONTRACT.md §3) and the loader writes `venue_trading_hours`
from it rather than letting `derive_trading_hours` invent a window from synthetic
timestamps. Synthetic `ts` values are stamped at midday purely so the column is
well-typed; nothing reads them for a window.
"""

from __future__ import annotations

import pandas as pd

from compute.contract import ComputeDataset
from store import warehouse

# The columns `line_items` must carry for the L1/L2/L3 views to aggregate cleanly,
# with the dtype each one must land in DuckDB as.
#
# The dtypes are not decoration. An empty frame built from column names alone carries no
# dtype, so DuckDB infers `date` as INTEGER and `CREATE VIEW l1_daily` fails to bind
# `dayofweek(date)`. That is the cold-start path: an org with no sales yet would 503
# rather than return an empty bundle, which is exactly the case a new tenant hits first.
_LINE_ITEM_DTYPES: dict[str, str] = {
    "transaction_id": "object",
    "category": "object",
    "item": "object",
    "price_point": "object",
    "channel": "object",
    "venue": "object",
    "venue_label": "object",
    "qty": "float64",
    "net_sales": "float64",
    "gross_sales": "float64",
    "discounts": "float64",
    "tax": "float64",
    "ts": "datetime64[ns]",
    "date": "object",          # datetime.date objects -> DuckDB DATE
    "net_sales_exvat": "float64",
    "excluded": "bool",
}
_LINE_ITEM_COLUMNS = list(_LINE_ITEM_DTYPES)


def _empty_line_items() -> pd.DataFrame:
    """A typed, empty line_items frame.

    DuckDB needs a real DATE column to bind the L1 view even when there are no rows.
    """
    frame = pd.DataFrame({c: pd.Series(dtype=d) for c, d in _LINE_ITEM_DTYPES.items()})
    # An all-object `date` column with no rows still arrives as VARCHAR; naming the type
    # explicitly is what makes dayofweek() bind.
    frame["date"] = pd.Series(dtype="datetime64[ns]")
    return frame


def _line_items_frame(dataset: ComputeDataset) -> pd.DataFrame:
    rows = []
    for i, r in enumerate(dataset.sales_daily):
        rows.append({
            "transaction_id": f"AGG-{r.venue}-{r.date.isoformat()}-{i}",
            "category": r.category or None,
            "item": r.item,
            "price_point": None,
            "channel": "aggregate",
            "venue": r.venue,
            "venue_label": r.venue,
            "qty": float(r.units),
            # The API sends ex-VAT (CONTRACT.md §2): the brain assumes nothing and
            # applies no VAT rule of its own, so these are equal by contract, not by
            # coincidence. Mixing bases across venues is unrecoverable downstream.
            "net_sales": float(r.revenue_exvat),
            "gross_sales": float(r.revenue_exvat),
            "discounts": 0.0,
            "tax": 0.0,
            "ts": pd.Timestamp(f"{r.date.isoformat()} 12:00:00"),
            "date": r.date,
            "net_sales_exvat": float(r.revenue_exvat),
            "excluded": False,
        })
    if not rows:
        return _empty_line_items()
    return pd.DataFrame(rows)[_LINE_ITEM_COLUMNS]


def _trading_hours_frame(dataset: ComputeDataset) -> pd.DataFrame:
    rows = [{"venue": t.venue, "dow": int(t.dow), "open_hour": float(t.open_hour),
             "close_hour": float(t.close_hour), "n": int(t.n)}
            for t in dataset.trading_hours]
    return pd.DataFrame(rows, columns=["venue", "dow", "open_hour", "close_hour", "n"])


def load(dataset: ComputeDataset) -> None:
    """Populate the CURRENT scratch store from `dataset`.

    Must be called inside a `warehouse.scratch_store(...)` block; it deliberately does
    not open one itself, so the caller owns the lifetime and nothing can accidentally
    load into the served store.
    """
    con = warehouse.connect()
    try:
        li = _line_items_frame(dataset)
        con.register("_li", li)
        con.execute("CREATE OR REPLACE TABLE line_items AS SELECT * FROM _li")
        con.unregister("_li")

        warehouse.create_schema(con)
        _ensure_state_tables(con)

        th = _trading_hours_frame(dataset)
        con.register("_th", th)
        con.execute("CREATE OR REPLACE TABLE venue_trading_hours AS SELECT * FROM _th")
        con.unregister("_th")

        _load_prior_state(con, dataset)
    finally:
        con.close()


def _ensure_state_tables(con) -> None:
    """The tables `ingest/refresh.py` ensures at runtime. Created here so a compute run
    never depends on refresh having been invoked first."""
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS data_watermark (
            venue VARCHAR, layer VARCHAR, last_date DATE,
            source VARCHAR, n_rows INTEGER, updated_at TIMESTAMP DEFAULT now()
        )
        """
    )
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS served_forecast (
            venue VARCHAR, layer VARCHAR, model VARCHAR, rung INTEGER,
            data_as_of DATE, selected_at TIMESTAMP DEFAULT now()
        )
        """
    )
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS ladder_selection (
            venue VARCHAR, layer VARCHAR, old_rung INTEGER, new_rung INTEGER,
            old_mase DOUBLE, new_mase DOUBLE, reason VARCHAR,
            per_fold_mase VARCHAR, n_folds INTEGER, created_at TIMESTAMP DEFAULT now()
        )
        """
    )


def _load_prior_state(con, dataset: ComputeDataset) -> None:
    """Seed the state the engine reads back and would otherwise lose.

    Without `served_model` the promotion is not continuous and every run re-picks from
    scratch; without `watermark` the refit cadence collapses to every-run.
    """
    state = dataset.prior_state
    for venue, model in state.served_model.items():
        con.execute(
            "INSERT INTO served_forecast (venue, layer, model, data_as_of) VALUES (?, ?, ?, ?)",
            [venue, "L1", model, state.watermark])
    if state.watermark is not None:
        for v in dataset.org_profile.venues:
            con.execute(
                "INSERT INTO data_watermark (venue, layer, last_date, source, n_rows) "
                "VALUES (?, ?, ?, ?, ?)",
                [v.slug, "L1", state.watermark, "api-dataset", 0])
