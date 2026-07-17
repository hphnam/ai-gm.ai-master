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


def run(dataset: ComputeDataset) -> ComputeBundle:
    """Compute one org's forecasts. Never touches the served store."""
    with tempfile.TemporaryDirectory(prefix="brain-compute-") as tmp:
        scratch = Path(tmp) / "scratch.duckdb"
        with warehouse.scratch_store(scratch):
            loader.load(dataset)
            return _compute(dataset)
    # TemporaryDirectory removes the scratch on exit, including on exception.


def _compute(dataset: ComputeDataset) -> ComputeBundle:
    bundle = ComputeBundle(org_id=dataset.org_profile.org_id)
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
    bundle.briefing_chain = list(dataset.prior_state.briefing_chain)
    return bundle


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
