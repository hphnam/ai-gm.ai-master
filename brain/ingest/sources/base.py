"""Source adapters for the RESEARCH history path. One backend: the CSV export.

This used to carry three: CSV plus inert Neon and Square backends, waiting on
provisioning so the brain could fetch its own history. That is no longer the
architecture. The brain does not fetch, and does not hold a DSN or a vendor client:
gm-ai's API reads an org's sales through its own org-scoped path and hands the rows
over in the request, and `compute/loader.py` materialises them into a per-request
scratch store. That is the T2 seam now, and it is why tenant isolation is structural -
there is no connection here through which another org's data could be reached.

What remains is the research bootstrap. `CsvAdapter` feeds `refresh()` from the
committed seed export so the local pipeline, the sim/ scripts, and the frozen
pre-registration artefacts stay reproducible. It is not a production path and does not
pretend to be one.

Deleted with the live backends: `_to_txn_schema` (a Neon `brain_txn` mapper with no
Neon to map), `_InertLiveAdapter`, and the `psycopg` connection path - which also
retires security finding L3 (`os.environ` referenced with no `import os`) by removing
the code rather than fixing a NameError in a path that should not exist.
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
    """Raised when an unprovisioned live source is asked for data.

    Kept after the live adapters were deleted because `ingest/live.py` (the T1
    live-facts path, a separate concern from T2 history) still raises it.
    """


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
        in the `TXN_COLUMNS` schema. Only completed trading days, never a partial
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


_ADAPTERS: dict[str, type[SourceAdapter]] = {"csv": CsvAdapter}


def get_adapter(source: str | None = None) -> SourceAdapter:
    """The adapter named by `INGEST_SOURCE` (default csv). Config, never model."""
    name = (source or config.INGEST_SOURCE or "csv").lower()
    cls = _ADAPTERS.get(name)
    if cls is None:
        raise ValueError(f"unknown INGEST_SOURCE {name!r}; expected one of {sorted(_ADAPTERS)}")
    return cls()
