"""The per-request tenant profile, and the accessors that read it.

Phase 3's seam. The analytics were written against one estate, so a dozen facts about
Lune's four venues are frozen in `config.py` as module globals: which days are closed by
design, which venue is booking-led, which weather cell a slug maps to, which three
venues exist at all. Every one of those is a per-tenant fact wearing a constant's
clothing.

The rule here, and it is the whole design:

    UNBOUND -> config.py (Lune)      BOUND -> the profile, entirely

Unbound is not a fallback for missing profile fields; it is the research path. The CLIs,
`sim/` and the test suite bind nothing, resolve to Lune's constants, and reproduce
bit-for-bit - which is what keeps the pre-registered July result (report 31) checkable
from shipped code after the engine became multi-tenant.

Bound is total. A bound profile with `structural_zero_dow=[]` means *this venue has no
structural zeros*, NOT "unset, use Mon/Tue". Falling back per-field would silently hand
Lune's closures to a tenant that trades seven days, and it would do it to the band, so
the damage would show up as calibration rather than as an error.

Why a ContextVar and not an argument: the same reason `warehouse.scratch_store` is one.
Threading a profile down to `is_structural_zero` means changing every predictor
signature in `models/ladder.PREDICTORS`, which is the ~157-call-site rewrite Phase 2
declined. anyio does `copy_context()` per threadpool submit, so a bound profile is
per-request even when FastAPI runs a sync endpoint off the event loop; the Phase 2
review verified that empirically for the scratch path and the mechanism is identical.

CAUTION - this holds BY ABSENCE, and the absence is load-bearing. A ContextVar is carried
into a copied context, NOT into a bare `threading.Thread`, which starts with an empty
one. A thread started that way would read no profile AND no scratch path, so
`warehouse.current_db_path()` would fall back to `config.DUCKDB_PATH` - Lune's real
database - inside a tenant's request. There is deliberately no `ThreadPoolExecutor`,
`joblib` or `multiprocessing` anywhere in the analytics (only in tests); introducing one
without propagating the context via `contextvars.copy_context()` reopens exactly that.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import TYPE_CHECKING

import config

if TYPE_CHECKING:  # imported for typing only - compute/ must not become a runtime dep
    from compute.contract import OrgProfile, VenueProfile

_ACTIVE: ContextVar[OrgProfile | None] = ContextVar("brain_active_profile", default=None)


@contextmanager
def bind_profile(profile: OrgProfile):
    """Bind `profile` for the duration of the block. Nests and unwinds on exception."""
    token = _ACTIVE.set(profile)
    try:
        yield profile
    finally:
        _ACTIVE.reset(token)


def current_profile() -> OrgProfile | None:
    """The bound profile, or None on the research path."""
    return _ACTIVE.get()


def _venue(slug: str) -> VenueProfile | None:
    """The bound profile's entry for `slug`, or None on the research path.

    Raises when a BOUND profile is asked about a venue it does not carry. Returning the
    Lune constant there would be a fail-open on the one seam whose contract is
    "bound is total": the caller would get Monday/Tuesday closures it never configured,
    applied to the Mondrian grouping, with nothing said. Every compute-path venue comes
    from `dataset.org_profile.venues`, so this is unreachable by construction - which is
    exactly why it should raise rather than paper over the day that stops being true.
    """
    p = _ACTIVE.get()
    if p is None:
        return None
    v = p.venue(slug)
    if v is None:
        raise KeyError(
            f"venue {slug!r} is not in the bound profile for org {p.org_id!r}; "
            f"it carries {[x.slug for x in p.venues]}. Refusing to fall back to Lune's "
            "constants under a bound profile.")
    return v


# --- Per-venue facts ----------------------------------------------------------

def structural_zero_dow(venue: str) -> frozenset[int]:
    """Days this venue is closed by design (Mon=0 .. Sun=6).

    Feeds the `is_structural_zero` feature AND the Mondrian conformal grouping. The
    grouping is the load-bearing use: closed days sit deterministically near zero, so
    pooling their tiny residuals with trading days' produces a single marginal quantile
    that under-covers the days that matter. Group on the wrong days and the band is
    miscalibrated on the right ones.
    """
    v = _venue(venue)
    if v is not None:
        return frozenset(v.structural_zero_dow)
    return frozenset(config.STRUCTURAL_ZERO_DOW)


def is_event_driven(venue: str) -> bool:
    """Booking-led venue: sparse by nature, with no fixed weekly closure.

    Gates the three seams `EVENT_ONLY_VENUES` gates today, and NOT the ladder's rung cap
    - that was `MAX_RUNG`, which G12.9c emptied (config.py:101). CONTRACT.md said
    otherwise; the contract was wrong, not the code.
    """
    v = _venue(venue)
    if v is not None:
        return bool(v.is_event_driven)
    return venue in config.EVENT_ONLY_VENUES


def venues() -> tuple[str, ...]:
    """Every forecastable venue slug in the current tenant."""
    p = _ACTIVE.get()
    if p is not None:
        return tuple(v.slug for v in p.venues)
    return tuple(config.FORECAST_VENUES)


def weather_cell(venue: str) -> str | None:
    """The weather grid cell key for this venue.

    Lune keys cells by slug with per-venue coordinates, so under a bound profile a venue
    is simply its own cell. None means no weather is available for it, and the caller
    must say so rather than quietly forecasting without it.
    """
    v = _venue(venue)
    if v is not None:
        return venue if (v.lat is not None and v.lon is not None) else None
    return config.WEATHER_CELLS.get(venue)


def event_scopes(venue: str) -> frozenset[str]:
    """Curated local-event scopes this venue inherits, plus the always-on "all".

    Lune's scopes are hand-curated cities. A tenant has none, so it gets {"all"} and its
    events must arrive through `exogenous`; nothing is ever cross-applied between cities.
    """
    v = _venue(venue)
    if v is not None:
        return frozenset({"all"})
    return frozenset(config.EVENT_SCOPE.get(venue, ())) | {"all"}


def country(venue: str) -> str:
    """ISO country for the bank-holiday calendar."""
    p = _ACTIVE.get()
    return p.country if p is not None else "GB"


# --- Org-wide facts -----------------------------------------------------------

def exo_families() -> frozenset[str]:
    """Covariate families that are live for this tenant.

    Unbound, every family is on: that is Lune's published configuration and the research
    path must reproduce it. Bound, the default is calendar + weather, with sports and
    local events opt-in - they are Lune-shaped and must not default on for a tenant that
    never asked for a World Cup.
    """
    p = _ACTIVE.get()
    if p is not None:
        return frozenset(p.exo_enabled)
    return frozenset({"calendar", "weather", "sports", "events"})
