"""T1 live facts — current partial-period aggregates, read on demand and cached.

The owner's questions are dominated by "how are we doing tonight?" and "staff cost
this week Mon to now" — partial-period figures a nightly-only pull cannot serve.
T1 reads those live from Square and caches them per (venue, metric, window) for
`LIVE_CACHE_TTL_MIN`, so the bursty follow-ups in one conversation hit the cache,
not Square.

Two honesty rules:
  - A partial day so-far is NEVER warehoused (appending "£3,000 at 8pm Friday" as a
    completed day would corrupt the baseline). T1 serves the moving figure for the
    answer and discards it; only completed days reach the store (T2, ingest/refresh).
  - While `LIVE_INGEST=False` this returns an inert envelope (`live: false`); the
    agent then uses its own Track-B Square tools directly. No false live claim.
"""

from __future__ import annotations

import time

import config
from ingest.sources.base import NotProvisionedError

# In-process read-through TTL cache: key (venue, metric, window) → (value, expiry).
# Per-process, no external store — right for bursty single-conversation follow-ups.
_CACHE: dict[tuple[str, str, str], tuple[dict, float]] = {}

_METRICS = ("sales", "labour_cost", "cogs")


def live_facts(venue: str, metrics=("sales",), window: str = "today",
               *, force: bool = False) -> dict:
    """Current aggregates for the requested metrics, as-of now. Inert envelope
    while `LIVE_INGEST=False`. A forced read bypasses the cache (G-live-e)."""
    if not config.LIVE_INGEST:
        return {
            "venue": venue, "live": False, "source": "unavailable",
            "window": window, "metrics": {},
            "note": "Square live reads not provisioned to the brain (LIVE_INGEST=0); "
                    "the agent uses its own Square tools for tonight/this-week facts",
        }
    out: dict[str, dict] = {}
    for metric in metrics:
        key = (venue, metric, window)
        if not force:
            cached = _cache_get(key)
            if cached is not None:
                out[metric] = {**cached, "cached": True}
                continue
        value = _fetch_metric(venue, metric, window)
        _cache_put(key, value)
        out[metric] = {**value, "cached": False}
    return {"venue": venue, "live": True, "source": "square",
            "window": window, "metrics": out}


def _fetch_metric(venue: str, metric: str, window: str) -> dict:
    """Read one live aggregate from Square's summary endpoints. Stubbed until Square
    access is provisioned to the brain env (separate from Track-B's credentials);
    tests inject a fake fetcher. The Square client is imported inside this function,
    never at module load."""
    raise NotProvisionedError(
        "Square live-fact read not wired to the brain env — provision access or use "
        "the Track-B Square tools")


# --- Cache primitives --------------------------------------------------------

def _ttl_seconds() -> float:
    return float(config.LIVE_CACHE_TTL_MIN) * 60.0


def _cache_get(key: tuple[str, str, str]) -> dict | None:
    hit = _CACHE.get(key)
    if hit is None:
        return None
    value, expiry = hit
    if time.monotonic() >= expiry:
        _CACHE.pop(key, None)
        return None
    return value


def _cache_put(key: tuple[str, str, str], value: dict) -> None:
    _CACHE[key] = (value, time.monotonic() + _ttl_seconds())


def cache_clear() -> None:
    _CACHE.clear()
