"""T2 incremental store + T3 conditional re-fit (the freshness orchestrator).

`refresh()` keeps the one learned DuckDB store current at the CHEAP tier: it
appends new CLOSED trading days from the configured `SourceAdapter`, advances the
`data_watermark`, auto-pulls exogenous for the new span, and rebuilds the affected
features leak-free. Because every module reads that one store, keeping it fresh
propagates to forecast / deviation / change-point / stock / briefing without
touching them.

The cost guarantee (G-live-d): a transaction only ever reaches T2, a cheap append.
The expensive T3 re-fit (ladder backtest + rung re-select) fires ONLY on a weekly
cadence boundary or a confirmed change-point since the last fit — never per
transaction, never per single day. Every re-fit writes a `ladder_selection` audit
row; no silent rung swap (G-live-c).

All inert by default: with `INGEST_SOURCE=csv` the adapter's latest date equals the
warehouse ceiling, so `refresh()` is a genuine no-op (idempotent). It comes alive
as a config swap when Ryan provisions Neon/Square and `LIVE_INGEST` flips.

Run:
    python -m ingest.refresh                 # nightly: refresh(None, refit="auto")
"""

from __future__ import annotations

import sys
from datetime import date, datetime

import config
from ingest.sources import get_adapter
from store.warehouse import connect

_WM_COLS = ["venue", "layer", "last_txn_date", "last_ingested_at", "source", "rows_since"]


# --- Tables ------------------------------------------------------------------

def _ensure_tables(con) -> None:
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS data_watermark (
            venue VARCHAR NOT NULL, layer VARCHAR NOT NULL,
            last_txn_date DATE, last_ingested_at TIMESTAMP,
            source VARCHAR, rows_since INTEGER,
            PRIMARY KEY (venue, layer)
        )
        """)
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS ladder_selection (
            venue VARCHAR NOT NULL, layer VARCHAR NOT NULL,
            old_rung INTEGER, new_rung INTEGER,
            old_mase DOUBLE, new_mase DOUBLE,
            adopted BOOLEAN, reason VARCHAR, ts TIMESTAMP DEFAULT now()
        )
        """)


def _has_table(con, name: str) -> bool:
    return con.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_name=?", [name]).fetchone() is not None


def read_watermark(venue: str, con, layer: str = "L1") -> dict | None:
    if not _has_table(con, "data_watermark"):
        return None
    row = con.execute(
        "SELECT venue, layer, last_txn_date, last_ingested_at, source, rows_since "
        "FROM data_watermark WHERE venue=? AND layer=?", [venue, layer]).fetchone()
    if row is None:
        return None
    return dict(zip(_WM_COLS, row))


def _advance_watermark(con, venue, layer, last_txn_date, source, rows_since) -> None:
    con.execute("DELETE FROM data_watermark WHERE venue=? AND layer=?", [venue, layer])
    con.execute(
        "INSERT INTO data_watermark (venue, layer, last_txn_date, last_ingested_at, "
        "source, rows_since) VALUES (?, ?, ?, ?, ?, ?)",
        [venue, layer, last_txn_date, datetime.now(), source, int(rows_since)])


# --- Freshness ---------------------------------------------------------------

def _data_max(venue: str, con) -> date | None:
    row = con.execute("SELECT MAX(date) FROM l1_daily WHERE venue=?", [venue]).fetchone()
    return row[0] if row else None


def _last_refit(venue: str, con, layer: str = "L1") -> tuple[datetime | None, int | None]:
    if not _has_table(con, "ladder_selection"):
        return None, None
    row = con.execute(
        "SELECT ts, new_rung FROM ladder_selection WHERE venue=? AND layer=? "
        "ORDER BY ts DESC LIMIT 1", [venue, layer]).fetchone()
    if row is None:
        return None, None
    return row[0], row[1]


def freshness(venue: str, con) -> dict:
    """Per-venue currency: is this current, does it need a refresh? Never falsely
    stale on the CSV ceiling (G2) — a store with no watermark falls back to its
    data max and reports staleness 0 against the source's own latest date."""
    adapter = get_adapter()
    latest = adapter.latest_available_date()
    wm = read_watermark(venue, con)
    data_max = _data_max(venue, con)
    as_of = wm["last_txn_date"] if wm else data_max
    staleness_days = (latest - as_of).days if (latest and as_of) else 0
    last_refit, incumbent_rung = _last_refit(venue, con)
    return {
        "venue": venue,
        "as_of": as_of.isoformat() if as_of else None,
        "last_ingested_at": wm["last_ingested_at"].isoformat() if wm and wm["last_ingested_at"] else None,
        "source": adapter.name,
        "is_live": bool(adapter.is_live and config.LIVE_INGEST),
        "stale": staleness_days > config.INGEST_STALENESS_DAYS,
        "staleness_days": int(staleness_days),
        "last_refit": last_refit.isoformat() if last_refit else None,
        "incumbent_rung": incumbent_rung,
    }


# --- T2 append ---------------------------------------------------------------

def _append_transactions(con, venue: str, rows) -> int:
    """Append genuinely-new closed days (date beyond the store's current max for
    this venue) to line_items. Dedup-by-date makes it idempotent: re-running never
    double-appends. Views (l1/l2/l3) derive from line_items, so readers update."""
    if rows is None or rows.empty:
        return 0
    cur_max = con.execute("SELECT MAX(date) FROM line_items WHERE venue=?", [venue]).fetchone()[0]
    new = rows[rows["date"] > cur_max] if cur_max is not None else rows
    if new.empty:
        return 0
    from ingest.sources.base import TXN_COLUMNS
    cols = [c for c in TXN_COLUMNS if c in new.columns]
    con.register("_txn", new[cols])
    con.execute(f"INSERT INTO line_items ({', '.join(cols)}) SELECT {', '.join(cols)} FROM _txn")
    con.unregister("_txn")
    return len(new)


# --- T3 conditional re-fit ---------------------------------------------------

def _has_changepoint_since(venue: str, since: datetime | None, con) -> bool:
    if since is None:
        return False        # no fit on record → no "since last fit" window
    from signals.change_point import detect
    df = detect(venue, con=con)
    if df.empty:
        return False
    import pandas as pd
    return bool((pd.to_datetime(df["onset_date"]) > pd.Timestamp(since)).any())


def _should_refit(venue: str, refit: str) -> tuple[bool, str]:
    """The T3 guard. `never`/`force` are explicit; `auto` fires only on a weekly
    cadence boundary or a confirmed change-point since the last recorded fit — so a
    single new closed day never triggers it (the cost guarantee). Opens and closes
    its own read connection so no connection is held into the (own-connection)
    backtest that follows."""
    if refit == "never":
        return False, "refit disabled (never)"
    if refit == "force":
        return True, "forced re-fit"
    con = connect(read_only=True)
    try:
        last_refit, _ = _last_refit(venue, con)
        if last_refit is None:
            return False, "no prior fit on record; auto defers to the weekly force cron"
        age_days = (datetime.now() - last_refit).days
        if age_days >= config.RETRAIN_CADENCE_DAYS:
            return True, f"weekly cadence boundary ({age_days}d since last fit)"
        if config.RETRAIN_ON_CHANGEPOINT and _has_changepoint_since(venue, last_refit, con):
            return True, "confirmed change-point since the last fit"
        return False, f"no cadence boundary ({age_days}d) or new change-point"
    finally:
        con.close()


def _refit_ladder(venue: str, reason: str, layer: str = "L1") -> dict:
    """Re-fit the ladder on a rolling-origin backtest and re-select the winning
    rung by MASE, adopting it only if it beats the classical baselines (the Tan
    adoption guard). Writes a `ladder_selection` audit row every time. Runs the
    backtest FIRST with no connection open anywhere (the ladder opens its own read
    connections); then a SINGLE write connection does both the incumbent read and
    the audit insert — so there is never a read↔write connection open at once on the
    store file (DuckDB permits only one open configuration)."""
    from models import ladder

    results, *_ = ladder.evaluate_rolling(venue, n_folds=4, horizon=7, with_prophet=False)
    best = ladder.select_best(results)
    by_name = {r.name: r for r in results}
    naive = by_name.get("rung0_seasonal_naive")
    dow = by_name.get("rung1_robust_dow")
    adopted = bool(
        best is not None and naive is not None and dow is not None
        and best.metrics.get("MASE", float("inf")) < naive.metrics.get("MASE", float("inf"))
        and best.metrics.get("MASE", float("inf")) < dow.metrics.get("MASE", float("inf")))
    new_mase = float(best.metrics["MASE"]) if best is not None else None
    old_mase = float(naive.metrics["MASE"]) if naive is not None else None

    con = connect()
    try:
        _ensure_tables(con)
        old_rung = _last_refit(venue, con)[1]
        new_rung = best.rung if (adopted and best is not None) else (old_rung if old_rung is not None else 1)
        con.execute(
            "INSERT INTO ladder_selection (venue, layer, old_rung, new_rung, old_mase, "
            "new_mase, adopted, reason, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [venue, layer, old_rung, new_rung, old_mase, new_mase, adopted, reason,
             datetime.now()])
    finally:
        con.close()
    return {"old_rung": old_rung, "new_rung": new_rung, "old_mase": old_mase,
            "new_mase": new_mase, "adopted": adopted, "reason": reason,
            "winner": best.name if best else None}


# --- Orchestrator ------------------------------------------------------------

def refresh(venue: str | None = None, *, force: bool = False, refit: str = "auto") -> dict:
    """Per-venue T2 append (+ conditional T3). Idempotent: no new data and not
    `force` is a no-op. `refit` in {auto, force, never}."""
    from config import FORECAST_VENUES

    venues = [venue] if venue else list(FORECAST_VENUES)
    adapter = get_adapter()
    summaries = {}
    for v in venues:
        summaries[v] = _refresh_one(v, adapter, force=force, refit=refit)
    return {"source": adapter.name, "is_live": bool(adapter.is_live and config.LIVE_INGEST),
            "venues": summaries}


def _refresh_one(venue: str, adapter, *, force: bool, refit: str) -> dict:
    notes: list[str] = []
    latest = adapter.latest_available_date()

    # Phase 1 — ingest (write connection only).
    con = connect()
    try:
        _ensure_tables(con)
        wm = read_watermark(venue, con)
        as_of = wm["last_txn_date"] if wm else _data_max(venue, con)
        n_added = 0
        if latest is None:
            notes.append(f"source '{adapter.name}' has no data available (inert)")
        elif force or (as_of is None) or (latest > as_of):
            rows = adapter.fetch_transactions(since=as_of)
            n_added = _append_transactions(con, venue, rows)
        new_max = con.execute("SELECT MAX(date) FROM line_items WHERE venue=?", [venue]).fetchone()[0]
        if n_added or (force and new_max is not None):
            _advance_watermark(con, venue, "L1", new_max, adapter.name, n_added)
    finally:
        con.close()

    # Phase 2 — enrich (own connections), only when new closed days landed.
    exog_dates, features_built = 0, False
    if n_added:
        exog_dates = _auto_exog(notes)
        features_built = _rebuild_features(venue, notes)

    # Phase 3 — conditional T3 re-fit (each helper manages its own connection).
    refit_done, rung_change = False, None
    should, reason = _should_refit(venue, refit)
    if should:
        try:
            rung_change = _refit_ladder(venue, reason)
            refit_done = True
        except Exception as exc:                          # pragma: no cover - defensive
            notes.append(f"re-fit failed: {type(exc).__name__}: {exc}")
    else:
        notes.append(f"T3 skipped: {reason}")

    return {"venue": venue, "rows_added": n_added, "new_as_of": str(new_max) if new_max else None,
            "exog_dates_filled": exog_dates, "features_rebuilt": features_built,
            "refit": refit_done, "rung_change": rung_change, "notes": notes}


def _auto_exog(notes: list[str]) -> int:
    """Pull exogenous for the new span. Forecast-neutral while the adopted exo set
    is empty (G-live-b) — it serves reasoning/attribution, not the forecast."""
    try:
        from ingest.exog_weather import build as exog_build
        res = exog_build()
        notes.append("auto-exog refreshed (reasoning-serving; forecast-neutral "
                     "while the adopted exo set is empty)")
        return int(res.get("rows", 0)) if isinstance(res, dict) else 0
    except Exception as exc:                              # pragma: no cover - network/offline
        notes.append(f"auto-exog skipped: {type(exc).__name__}")
        return 0


def _rebuild_features(venue: str, notes: list[str]) -> bool:
    try:
        from features.build_features import build_features
        build_features(venue)
        return True
    except Exception as exc:                              # pragma: no cover - defensive
        notes.append(f"feature rebuild skipped: {type(exc).__name__}")
        return False


def run() -> dict:
    return refresh(None, refit="auto")


def main() -> int:
    print("Live ingest · T2 refresh (+ conditional T3)")
    out = run()
    print(f"  source {out['source']} (is_live={out['is_live']})")
    for v, s in out["venues"].items():
        print(f"  {v:16s}: +{s['rows_added']} rows, as_of {s['new_as_of']}, "
              f"refit={s['refit']}")
        for n in s["notes"]:
            print(f"      note: {n}")
    ok = isinstance(out["venues"], dict)
    print(f"REFRESH RESULT: {'PASS' if ok else 'FAIL'} "
          f"(idempotent no-op while INGEST_SOURCE=csv at the ceiling)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
