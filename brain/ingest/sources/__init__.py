"""Ingest sources for the research history path.

`get_adapter()` returns the `SourceAdapter` named by `config.INGEST_SOURCE` (default,
and now only, `csv`). Selection is configuration, never the model.

The Neon and Square backends are gone: the brain no longer fetches its own history. In
production gm-ai's API supplies an org's rows in the request and `compute/loader.py`
loads them into a per-request scratch store. This package is the research bootstrap that
keeps the local pipeline and the frozen artefacts reproducible.
"""

from ingest.sources.base import (
    CsvAdapter,
    NotProvisionedError,
    SourceAdapter,
    get_adapter,
)

__all__ = ["SourceAdapter", "CsvAdapter", "NotProvisionedError", "get_adapter"]
