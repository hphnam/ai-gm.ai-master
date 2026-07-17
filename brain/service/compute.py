"""The compute service: the heavy, stateless half of the brain.

One endpoint. gm-ai's API posts one org's dataset, this returns the bundle, the API
persists it. There is no store here, no DSN, no scheduler and no org loop: the schedule
and the loop belong to the app, and the cadence DECISION stays in the engine, on the
state the API supplies.

    POST /compute   {dataset} -> {bundle}
    GET  /health    liveness (unauthenticated, no tenant data)

Separate from `service/app.py` because the two have different appetites: app.py serves
light on-demand signals and needs no torch, while this loads Chronos and wants several
GB. They are separate Docker targets for that reason. Both share the same bearer.

Run:
    uvicorn service.compute:app --port 8089
"""

from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException

import config
from compute.contract import ComputeBundle, ComputeDataset
from compute.engine import run, sweep_stale_scratch
from service.auth import assert_auth_configured, require_auth

assert_auth_configured()   # no secret and no explicit opt-out => do not serve

# An OOM kill strands a scratch DuckDB holding one org's sales in TMPDIR, and they
# accumulate across restarts. Boot is the only moment we know none of ours is live.
_SWEPT = sweep_stale_scratch()

app = FastAPI(
    title="Proactive Brain · compute",
    version="0.1.0",
    description="Stateless forecasting compute. Dataset in, bundle out.",
    docs_url=None if config.HARDENED else "/docs",
    redoc_url=None if config.HARDENED else "/redoc",
    openapi_url=None if config.HARDENED else "/openapi.json",
    dependencies=[Depends(require_auth)],
)


@app.get("/health")
def health() -> dict:
    """Liveness only. Deliberately says nothing about any org: this is the one
    unauthenticated route, so it must never carry tenant data."""
    return {"status": "ok", "service": "compute"}


@app.post("/compute", response_model=ComputeBundle)
def post_compute(dataset: ComputeDataset) -> ComputeBundle:
    """Compute one org's forecasts from the supplied dataset.

    `org_id` rides inside the dataset and is trusted as given: the API sets it from the
    session it already authorized, and compute has nothing to validate it against. That
    is not a gap. Compute holds no connection, so it cannot widen the request to another
    org even if the value were wrong - the isolation is structural, and this route is
    reachable only by the API over the private network with the shared secret.
    """
    try:
        return run(dataset)
    except Exception as exc:
        # A compute failure is a 503, not a 500 with internals attached: the body is a
        # generic string in production (L4) and the detail belongs in the logs.
        detail = "compute failed" if config.HARDENED else f"compute failed: {exc!r}"
        raise HTTPException(503, detail) from exc
