"""S5 G17f - grouped cross-series Chronos-2 forecasting (multi-venue in-context learning).

Chronos-2 borrows strength across related series when they are passed together in ONE
grouped call under `cross_learning=True`; verified against the model, a grouped forecast
differs materially from the univariate one (so the capability is real, not a no-op). The
univariate serving path passes every venue under the id "l1" one call at a time, so the
venues never share a group. This module is the grouped counterpart, kept strictly separate
so the univariate baseline (the S5 U arm) is untouched.

Two invariants are load-bearing and enforced here, not assumed:

  * PANEL LEAKAGE (G1). When any venue is forecast at origin t, EVERY series in the group
    - the target venue and the others alike - is truncated at t. `assert_panel_leak_free`
    raises on any context row dated after its origin. A cross-series boundary error would
    be invisible in the summary statistics and would inflate the grouped arms into a
    false win, which is why it is a hard guard rather than a convention.

  * GROUP == CHRONOS BATCH (verified against the model). Under `cross_learning=True` the
    pipeline zeroes the group ids of every series in a Chronos batch, so they all mix; the
    cross-learning group IS the batch. Pinning the Chronos `batch_size` to the group size
    (venues per origin) and ordering the frame origin-major makes each origin its own
    isolated group. Batching B origins into one call is then numerically identical to B
    separate calls (verified dmax 0 on CPU) and origins never cross-contaminate. An
    oversized batch would merge origins into one group (verified: it changes the numbers),
    so `batch_size` is derived from the group size, never left at the pipeline default.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Iterator

import numpy as np
import pandas as pd

from models.foundation import _resolve_device

HORIZON_DAYS = 7
# For the independent (cross_learning=False) univariate arm the batch size is a pure
# throughput knob: every series keeps its own group id whatever the batching, so this
# only sets how many series share a forward pass. 256 matches the pipeline default that
# the S2 committed univariate vectors were produced under.
INDEP_BATCH_SIZE = 256


class PanelLeakageError(AssertionError):
    """Raised when a grouped context carries a row dated at or after its origin."""


@dataclass(frozen=True)
class PanelSeries:
    """One venue's context history for a single grouped origin."""

    venue: str
    dates: np.ndarray   # datetime64[ns], the training history, all <= the origin
    values: np.ndarray


@dataclass(frozen=True)
class PanelOrigin:
    """A grouped forecast task: several venues' contexts truncated at one origin, plus
    the shared future dates every venue is forecast over."""

    origin: pd.Timestamp
    future_dates: np.ndarray               # H dates, all strictly after the origin
    series: tuple[PanelSeries, ...]        # one per venue, in a fixed order

    @property
    def key(self) -> str:
        return self.origin.date().isoformat()

    @property
    def venues(self) -> tuple[str, ...]:
        return tuple(s.venue for s in self.series)


def assert_panel_leak_free(origins: Iterable[PanelOrigin]) -> None:
    """G1: prove every series in every grouped context stops at or before its origin.

    Checks the target and the non-target venues identically, because cross-series
    attention makes another venue's future just as leaky as the target's own. Fires
    loudly (a raise, not a warning) so a planted leak cannot pass silently.
    """
    for po in origins:
        for s in po.series:
            if s.dates.size and pd.Timestamp(np.max(s.dates)) > po.origin:
                raise PanelLeakageError(
                    f"panel leak: {s.venue} context reaches "
                    f"{pd.Timestamp(np.max(s.dates)).date()} but the origin is "
                    f"{po.origin.date()} - a series in the group carries data beyond t")
        fut = pd.to_datetime(po.future_dates)
        if len(fut) and pd.Timestamp(fut.min()) <= po.origin:
            raise PanelLeakageError(
                f"panel future window at origin {po.origin.date()} starts "
                f"{pd.Timestamp(fut.min()).date()}, not strictly after the origin")


def _series_id(origin_key: str, venue: str) -> str:
    return f"{origin_key}::{venue}"


def _long_frame(chunk: list[PanelOrigin]) -> pd.DataFrame:
    """The predict_df context for a run of origins, ordered origin-major then venue.

    Origin-major ordering is what makes a Chronos batch of `group_size` fall exactly on
    one origin's venues, so `cross_learning` mixes within an origin and never across
    origins. `validate_inputs` re-sorts internally, but building the frame already sorted
    keeps the intent legible and the group boundaries obvious.
    """
    parts = []
    for po in chunk:
        for s in po.series:
            parts.append(pd.DataFrame({
                "id": _series_id(po.key, s.venue),
                "timestamp": pd.to_datetime(s.dates),
                "target": np.asarray(s.values, float)}))
    return pd.concat(parts, ignore_index=True)


def _chunks(origins: list[PanelOrigin], size: int) -> Iterator[list[PanelOrigin]]:
    for i in range(0, len(origins), size):
        yield origins[i:i + size]


def group_predict(
    origins: list[PanelOrigin], *, cross_learning: bool, pipe,
    origin_batch: int = 1, horizon: int = HORIZON_DAYS,
) -> dict[str, dict[str, np.ndarray]]:
    """Forecast every venue at every origin. Returns {origin_key: {venue: median[H]}}.

    `origin_batch` panels are issued per predict_df call. For the grouped arm this is a
    throughput knob that provably does not change a number; for the univariate arm it is
    the lever report 24's device verdict may turn on. The Chronos `batch_size` is derived
    - the group size under cross-learning (so each origin is its own group), a large fixed
    value otherwise - and never left at the pipeline default, which would merge origins.
    """
    if not origins:
        return {}
    assert_panel_leak_free(origins)

    if cross_learning:
        sizes = {len(po.series) for po in origins}
        if len(sizes) != 1:
            raise ValueError(
                f"cross-learning needs a uniform group size so batch_size isolates each "
                f"origin; got group sizes {sorted(sizes)}")
        chronos_batch = sizes.pop()
    else:
        chronos_batch = INDEP_BATCH_SIZE

    out: dict[str, dict[str, np.ndarray]] = {po.key: {} for po in origins}
    for chunk in _chunks(origins, max(1, origin_batch)):
        df = _long_frame(chunk)
        pred = pipe.predict_df(
            df, prediction_length=horizon, quantile_levels=[0.1, 0.5, 0.9],
            id_column="id", timestamp_column="timestamp", target="target",
            cross_learning=cross_learning, batch_size=chronos_batch)
        col = "0.5" if "0.5" in pred.columns else "predictions"
        for sid, g in pred.groupby("id", sort=False):
            origin_key, venue = sid.split("::", 1)
            median = np.clip(np.asarray(g[col].to_numpy(), float), 0.0, None)
            out[origin_key][venue] = median
    return out


def load_pipeline(device: str | None = None):
    """Load a fresh Chronos-2 pipeline on an explicit device, for the device calibration.

    Deliberately NOT the process-cached `_chronos2_pipeline()`: the calibration compares
    CPU against MPS in one process, which needs two independently-placed pipelines. Uses
    the same pinned revision so a calibration forecast is byte-comparable to a served one.
    """
    from chronos import Chronos2Pipeline

    from models.foundation import CHRONOS2_MODEL_ID, CHRONOS2_REVISION

    dev = device or _resolve_device()
    pipe = Chronos2Pipeline.from_pretrained(
        CHRONOS2_MODEL_ID, revision=CHRONOS2_REVISION, device_map=dev)
    return pipe, dev
