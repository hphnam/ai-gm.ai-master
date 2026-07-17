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

from compute import loader
from compute.contract import (
    BandRow,
    ComputeBundle,
    ComputeDataset,
    DormantVenue,
    ForecastRow,
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
        with warehouse.scratch_store(scratch):
            loader.load(dataset)
            return _compute(dataset)
    # TemporaryDirectory removes the scratch on exit, including on exception. It does
    # NOT run on SIGKILL, which is what sweep_stale_scratch() covers.


def _compute(dataset: ComputeDataset) -> ComputeBundle:
    bundle = ComputeBundle(org_id=dataset.org_profile.org_id)
    _report_unconsumed(dataset, bundle)
    live = _live_venues(dataset, bundle)

    for venue in live:
        try:
            _forecast_venue(dataset, venue, bundle)
        except Exception as exc:
            # One venue's failure must not lose the rest of the org's forecasts, but it
            # must be visible: a silent per-venue drop is indistinguishable from a venue
            # that legitimately produced nothing.
            bundle.diagnostics.append(
                f"{venue}: forecast failed ({type(exc).__name__}: {exc})")

    bundle.watermark = _watermark(dataset)
    # Echoed, not advanced: the briefing and change-point detectors are not driven from
    # this path yet. Returning them keeps the API's round-trip whole, so the state
    # survives a call instead of being dropped and silently reset.
    bundle.briefing_chain = list(dataset.prior_state.briefing_chain)
    bundle.change_point_state = dict(dataset.prior_state.change_point_state)
    return bundle


def _report_unconsumed(dataset: ComputeDataset, bundle: ComputeBundle) -> None:
    """Say out loud which supplied fields this engine does not read yet.

    The contract forbids UNKNOWN fields so a caller cannot believe it sent something it
    did not. Accepting a KNOWN field and dropping it on the floor is the same failure
    wearing a different hat, and it is worse, because the field validated. Until these
    are wired, a caller that sends them learns so from the bundle instead of from a
    forecast that quietly ignored its covariates.

    Each of these is a real gap, not a shrug:
      * exogenous  - the served Beer Hall entrant consumes 15 known-future covariates.
                     Without them it cannot be the served model, whatever prior state says.
      * exo_enabled - "sports and local events are opt-in" is only a promise while
                     nothing reads the toggle.
      * horizon_days - the engine currently emits whatever the analytics produce.
      * per-venue profile - structural_zero_dow / is_event_driven / VAT are still taken
                     from Lune's module globals for every tenant (Phase 3).
    """
    if dataset.exogenous:
        bundle.diagnostics.append(
            f"exogenous: {len(dataset.exogenous)} rows supplied but NOT consumed; the "
            "forecast is univariate regardless of the served model named")
    if dataset.horizon_days != 7:
        bundle.diagnostics.append(
            f"horizon_days={dataset.horizon_days} supplied but NOT honoured; the "
            "analytics emit their own horizon")
    if set(dataset.org_profile.exo_enabled) != {"calendar", "weather"}:
        bundle.diagnostics.append(
            f"exo_enabled={dataset.org_profile.exo_enabled} supplied but NOT honoured; "
            "the covariate universe is still global")
    per_venue = [v.slug for v in dataset.org_profile.venues
                 if v.structural_zero_dow or v.is_event_driven or v.vat_inclusive]
    if per_venue:
        bundle.diagnostics.append(
            f"per-venue profile for {per_venue} supplied but NOT honoured; "
            "structural zeros, event-driven capping and VAT still come from Lune's "
            "module globals (Phase 3)")


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


def _forecast_venue(dataset: ComputeDataset, venue: str, bundle: ComputeBundle) -> None:
    """Produce the L1 point forecast + conformal band for one venue.

    Model choice honours prior state: a model the API says is already served stays
    served, so promotion is continuous across calls rather than re-decided every run.
    Falling back to `default_model` is a cold-start path, and it is recorded as a
    diagnostic so a silent fallback cannot masquerade as a decision.
    """
    from conformal.wrap import default_model, evaluate

    served = dataset.prior_state.served_model.get(venue)
    if served is None:
        served = default_model(venue)
        bundle.diagnostics.append(
            f"{venue}: no served model supplied, cold-starting on {served}")

    result = evaluate(venue, served)
    _drain_outputs(venue, served, bundle, result)


def _drain_outputs(venue: str, model: str, bundle: ComputeBundle,
                   result: dict) -> None:
    """Read the rows the analytics just wrote into the scratch store into the bundle.

    The existing code persists forecasts and bands as its output contract. Rather than
    rewrite that, compute lets it write to the scratch database and drains the result
    here, which keeps the analytics untouched and still returns everything to the API.
    """
    con = warehouse.connect(read_only=True)
    try:
        fc = con.execute(
            "SELECT venue, layer, key, target_date, model, yhat FROM forecasts "
            "WHERE venue = ?", [venue]).df()
        bd = con.execute(
            "SELECT venue, layer, key, target_date, model, level, lo, hi FROM bands "
            "WHERE venue = ?", [venue]).df()
    finally:
        con.close()

    for _, r in fc.iterrows():
        bundle.forecasts.append(ForecastRow(
            venue=r.venue, layer=r.layer,
            key=None if r.key is None or r.key != r.key else str(r.key),
            target_date=r.target_date, model=r.model, yhat=float(r.yhat)))

    for _, r in bd.iterrows():
        bundle.bands.append(BandRow(
            venue=r.venue, layer=r.layer,
            key=None if r.key is None or r.key != r.key else str(r.key),
            target_date=r.target_date, model=r.model,
            level=float(r.level), lo=float(r.lo), hi=float(r.hi)))

    bundle.served.append(ServedRow(
        venue=venue, layer="L1", model=model,
        data_as_of=result.get("data_as_of") if isinstance(result, dict) else None))
