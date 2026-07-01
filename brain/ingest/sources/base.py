"""Source adapters — the pluggable T2 history seam.

One interface, three backends: the CSV export working today (default, the test
fixture), plus Neon (the intended system-of-record) and Square (the direct
historical fallback), both inert behind `LIVE_INGEST` until Ryan provisions
access. `refresh()` (ingest/refresh.py) talks only to this interface, so going
live is a config swap (`INGEST_SOURCE`) with no code change downstream.

Honesty rule (G-live-a / G-live-f): while `LIVE_INGEST=False` the brain runs
entirely on `CsvAdapter`; the Neon/Square adapters import no DB/HTTP client at
module load and raise a clear `NotProvisionedError` if used. The brain therefore
stays standalone and DB-free at import.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date

import pandas as pd

import config
from ingest.normalise import LINE_ITEMS_PARQUET

# The line_items columns a transaction row must carry to append cleanly.
TXN_COLUMNS = [
    "transaction_id", "category", "item", "price_point", "channel", "venue",
    "venue_label", "qty", "net_sales", "gross_sales", "discounts", "tax", "ts",
    "date", "net_sales_exvat", "excluded",
]


class NotProvisionedError(RuntimeError):
    """Raised when an inert live adapter is asked for data while LIVE_INGEST is off."""


class SourceAdapter(ABC):
    """A source of closed-day transactions and stock for the T2 warehouse."""

    name: str = "abstract"
    is_live: bool = False

    @abstractmethod
    def latest_available_date(self) -> date | None:
        """Most recent date the source can offer, or None when unavailable."""

    @abstractmethod
    def fetch_transactions(self, since: date | None) -> pd.DataFrame:
        """Closed-day line-item rows with `date > since` (all rows when None),
        in the `TXN_COLUMNS` schema. Only completed trading days — never a partial
        intraday figure (that is served live at T1 and never warehoused)."""

    @abstractmethod
    def fetch_stock(self, since: date | None) -> pd.DataFrame:
        """Stock snapshots since `since`. Empty frame when the source has none."""


class CsvAdapter(SourceAdapter):
    """The supplied CSV export (via ingest/normalise → line_items.parquet). Working
    today and the default; `is_live=False` because a fixed export has no intraday."""

    name = "csv"
    is_live = False

    def _parquet(self) -> pd.DataFrame:
        if not LINE_ITEMS_PARQUET.exists():
            return pd.DataFrame(columns=TXN_COLUMNS)
        df = pd.read_parquet(LINE_ITEMS_PARQUET)
        df["date"] = pd.to_datetime(df["date"]).dt.date
        return df

    def latest_available_date(self) -> date | None:
        df = self._parquet()
        return None if df.empty else max(df["date"])

    def fetch_transactions(self, since: date | None) -> pd.DataFrame:
        df = self._parquet()
        if since is not None:
            df = df[df["date"] > since]
        cols = [c for c in TXN_COLUMNS if c in df.columns]
        return df[cols].reset_index(drop=True)

    def fetch_stock(self, since: date | None) -> pd.DataFrame:
        # Stock rides its own normaliser (ingest.stock_normalise); the CSV export
        # carries no incremental stock feed, so this is intentionally empty.
        return pd.DataFrame()


class _InertLiveAdapter(SourceAdapter):
    """Shared base for the live backends. Imports no client at module load; every
    data call raises until provisioned, so the brain stays DB-free and standalone."""

    is_live = True

    def _require_live(self) -> None:
        if not config.LIVE_INGEST:
            raise NotProvisionedError(
                f"{self.name} adapter is inert (LIVE_INGEST=0) — set LIVE_INGEST=1 "
                f"and provision access, or use INGEST_SOURCE=csv")

    def latest_available_date(self) -> date | None:
        if not config.LIVE_INGEST:
            return None                     # inert: reports 'no source', never raises
        raise NotProvisionedError(f"{self.name} access not wired yet")

    def fetch_transactions(self, since: date | None) -> pd.DataFrame:
        self._require_live()
        raise NotProvisionedError(f"{self.name} access not wired yet")

    def fetch_stock(self, since: date | None) -> pd.DataFrame:
        self._require_live()
        raise NotProvisionedError(f"{self.name} access not wired yet")


class NeonAdapter(_InertLiveAdapter):
    """The brain's Neon system-of-record (intended primary for T2 history).

    DDL sketch (Ryan to stand up):
        CREATE TABLE brain_txn (
            transaction_id text, venue text, category text, item text,
            qty numeric, net_sales numeric, gross_sales numeric, discounts numeric,
            tax numeric, ts timestamptz, date date
        );
    When provisioned, `fetch_transactions(since)` is
    `SELECT ... FROM brain_txn WHERE date > :since` (closed days only) via a
    read-only connection whose driver is imported INSIDE the method, never at load.
    """

    name = "neon"


class SquareAdapter(_InertLiveAdapter):
    """Direct Square historical pull (the fallback until Neon exists). Uses the
    Square Orders/Payments API, with its client imported inside the method. Live
    intraday facts are served separately at T1 (ingest/live.py), not here."""

    name = "square"


_ADAPTERS: dict[str, type[SourceAdapter]] = {
    "csv": CsvAdapter, "neon": NeonAdapter, "square": SquareAdapter,
}


def get_adapter(source: str | None = None) -> SourceAdapter:
    """The adapter named by `INGEST_SOURCE` (default csv). Config, never model."""
    name = (source or config.INGEST_SOURCE or "csv").lower()
    cls = _ADAPTERS.get(name)
    if cls is None:
        raise ValueError(f"unknown INGEST_SOURCE {name!r}; expected one of {sorted(_ADAPTERS)}")
    return cls()
