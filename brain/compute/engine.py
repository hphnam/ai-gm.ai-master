"""The pure entry point: dataset in, bundle out, nothing persisted.

    bundle = run(dataset)

One org, one call. The engine opens a temporary store, loads exactly the rows it was
handed, runs the existing analytics against them, reads the results back, and deletes
the store. It holds no connection to anything the caller did not supply, so it cannot
reach another tenant's data even in principle - the isolation is structural, not a
policy someone has to keep enforcing.

What this does NOT do, deliberately: it does not write to the served store, it does not
fetch, and it does not choose an org. `org_id` is echoed from the dataset because the
API needs it back to persist the bundle, never because compute decided it.
"""

from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

import pandas as pd

import config
import org_profile
from compute import forward, loader
from compute.contract import (
    ComputeBundle,
    ComputeDataset,
    DormantVenue,
    ServedRow,
)
from store import warehouse

SCRATCH_PREFIX = "brain-compute-"


def sweep_stale_scratch() -> int:
    """Delete scratch directories a previous process left behind. Returns the count.

    TemporaryDirectory unwinds on exception but NOT on SIGKILL, and an OOM kill is the
    realistic way this process dies: it holds Chronos plus several GB and the compute
    route has no concurrency cap of its own. Each kill would otherwise strand a DuckDB
    containing one org's sales in TMPDIR, and they accumulate across restarts.

    Called at service import (service/compute.py), which is the only moment we know no
    scratch of ours is live.
    """
    swept = 0
    for path in Path(tempfile.gettempdir()).glob(f"{SCRATCH_PREFIX}*"):
        if not path.is_dir():
            continue
        try:
            shutil.rmtree(path)
            swept += 1
        except OSError:
            # Another user's directory, or a live one from a sibling process. Not ours
            # to force, and not worth failing a boot over.
            continue
    return swept


def run(dataset: ComputeDataset) -> ComputeBundle:
    """Compute one org's forecasts. Never touches the served store."""
    with tempfile.TemporaryDirectory(prefix=SCRATCH_PREFIX) as tmp:
        # 0o700: the scratch holds one org's sales in the clear, and the default umask
        # would let any local user read it. Narrows the blast radius of a stranded
        # directory to the same user.
        os.chmod(tmp, 0o700)
        scratch = Path(tmp) / "scratch.duckdb"
        # Both bindings are per-request ContextVars, so two orgs in one process cannot
        # see each other's store OR each other's profile. Profile is bound around the
        # load as well as the compute: the loader's frames are venue-shaped too.
        with warehouse.scratch_store(scratch), \
                org_profile.bind_profile(dataset.org_profile):
            notes = loader.load(dataset)
            return _compute(dataset, notes)
    # TemporaryDirectory removes the scratch on exit, including on exception. It does
    # NOT run on SIGKILL, which is what sweep_stale_scratch() covers.


def _compute(dataset: ComputeDataset, notes: list[str]) -> ComputeBundle:
    bundle = ComputeBundle(org_id=dataset.org_profile.org_id)
    bundle.diagnostics.extend(notes)
    _report_unconsumed(dataset, bundle)
    live = _live_venues(dataset, bundle)

    # Once per request, not once per venue: the spillover calendar is a property of the
    # estate, so recomputing it inside every build_features is V x E identical
    # aggregations for one answer.
    event_nights = _event_nights(live)

    for venue in live:
        try:
            _forecast_venue(dataset, venue, bundle, event_nights)
        except Exception as exc:
            # One venue's failure must not lose the rest of the org's forecasts, but it
            # must be visible: a silent per-venue drop is indistinguishable from a venue
            # that legitimately produced nothing.
            bundle.diagnostics.append(
                f"{venue}: forecast failed ({_redact(exc)})")

    bundle.watermark = _watermark(dataset)
    # Echoed, not advanced: the briefing and change-point detectors are not driven from
    # this path yet. Returning them keeps the API's round-trip whole, so the state
    # survives a call instead of being dropped and silently reset.
    bundle.briefing_chain = list(dataset.prior_state.briefing_chain)
    bundle.change_point_state = dict(dataset.prior_state.change_point_state)
    return bundle


def _redact(exc: Exception) -> str:
    """The exception type, plus its message only when not hardened.

    `service/compute.py` already withholds internals from the 503 body under `HARDENED`;
    the 200 path was handing the same internals back in `diagnostics`, which is the same
    leak through the door that succeeded. Exception text here carries scratch tempdir
    paths and library internals, and `diagnostics` also echoes caller-controlled strings,
    so the type alone is what travels. The detail belongs in the logs.
    """
    return type(exc).__name__ if config.HARDENED else f"{type(exc).__name__}: {exc}"


def _report_unconsumed(dataset: ComputeDataset, bundle: ComputeBundle) -> None:
    """Say out loud which supplied fields this engine still does not read.

    The contract forbids UNKNOWN fields so a caller cannot believe it sent something it
    did not. Accepting a KNOWN field and dropping it on the floor is the same failure
    wearing a different hat, and it is worse, because the field validated.

    Phase 3 wired the rest: `exogenous` overlays both the training and horizon frames,
    `horizon_days` drives a real forward projection, `exo_enabled` gates the Lune-shaped
    families, and the per-venue profile now reaches the structural zeros, the Mondrian
    grouping and the liveness rules. What remains is `stock_enabled`, whose pipeline
    reads monthly spreadsheets that only exist for one venue of one estate.
    """
    if dataset.org_profile.stock_enabled:
        bundle.diagnostics.append(
            "stock_enabled=True supplied but NOT honoured; the stock pipeline reads "
            "monthly bar-stock sheets from disk (config.STOCK_DIR) and has no injected "
            "path, so days-of-cover is unavailable to a tenant")


def _live_venues(dataset: ComputeDataset, bundle: ComputeBundle) -> list[str]:
    """Split the profile's venues into forecastable and dormant.

    The liveness gate, applied to injected data: a venue with no sales in the dataset
    gets a dormant marker, not a positive projection. This is the rule that turned a
    GBP 5,329 forecast for a closed venue into no forecast and no alarm; it is generic,
    not a special case for one venue.
    """
    with_sales = {r.venue for r in dataset.sales_daily}
    live = []
    for v in dataset.org_profile.venues:
        if v.slug in with_sales:
            live.append(v.slug)
        else:
            bundle.dormant.append(DormantVenue(
                venue=v.slug, reason="no sales rows in the supplied window"))
    return live


def _watermark(dataset: ComputeDataset):
    """The furthest closed day the dataset actually carries."""
    dates = [r.date for r in dataset.sales_daily]
    return max(dates) if dates else dataset.prior_state.watermark


def _event_nights(live: list[str]) -> set:
    """The estate's spillover calendar, or an empty set when nothing can spill over."""
    from features.build_features import event_venue_dates

    if not live:
        return set()
    return event_venue_dates()


def _forecast_venue(dataset: ComputeDataset, venue: str, bundle: ComputeBundle,
                    event_nights: set) -> None:
    """Produce the L1 forward point forecast + conformal band for one venue.

    Model choice honours prior state: a model the API says is already served stays
    served, so promotion is continuous across calls rather than re-decided every run.
    Falling back to `default_model` is a cold-start path, and it is recorded as a
    diagnostic so a silent fallback cannot masquerade as a decision.
    """
    from conformal.wrap import default_model
    from features.build_features import build_features
    from store.active_span import trim_to_active

    served = dataset.prior_state.served_model.get(venue)
    if served is None:
        served = default_model(venue)
        bundle.diagnostics.append(
            f"{venue}: no served model supplied, cold-starting on {served}")

    feats = trim_to_active(build_features(venue, event_nights=event_nights), venue)
    forecasts, bands, notes = forward.project(dataset, venue, served, feats)

    bundle.forecasts.extend(forecasts)
    bundle.bands.extend(bands)
    bundle.diagnostics.extend(notes)
    bundle.served.append(ServedRow(
        venue=venue, layer="L1", model=served, rung=_rung_of(served),
        data_as_of=pd.Timestamp(feats["date"].max()).date() if not feats.empty else None))


def _rung_of(model_name: str) -> int | None:
    """The ladder rung a served model sits on, from the registry rather than its name.

    `ServedRow.rung` was in the contract and always came back None, so the API had a
    column it could never populate and an operator could not see which rung was live
    without parsing the model string. Reading `PREDICTORS` keeps it honest: a model the
    ladder does not know returns None rather than a guess from the `rungN_` prefix.
    """
    from models.ladder import PREDICTORS

    return next((r for name, r, _fn, _avail in PREDICTORS if name == model_name), None)
