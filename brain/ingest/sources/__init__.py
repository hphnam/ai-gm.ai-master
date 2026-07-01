"""Pluggable ingest sources (the T2 history seam).

`get_adapter()` returns the `SourceAdapter` named by `config.INGEST_SOURCE`
(default `csv`). Selection is configuration, never the model. Neon/Square are
inert behind `LIVE_INGEST` until Ryan provisions access.
"""

from ingest.sources.base import (
    CsvAdapter,
    NeonAdapter,
    NotProvisionedError,
    SourceAdapter,
    SquareAdapter,
    get_adapter,
)

__all__ = [
    "SourceAdapter", "CsvAdapter", "NeonAdapter", "SquareAdapter",
    "NotProvisionedError", "get_adapter",
]
