"""S6 G17g - weather covariate bases for the Chronos-2 exogenous entrant.

The served model `rung4_chronos2_exo` conditions its 7-day revenue forecast on weather.
Every accuracy number it has produced used the `hindcast` basis, which is the forecast as
archived NEAR its valid time - better weather than a model has at serving, where horizon
step h needs a forecast issued h days earlier. This module builds, per fold, the target
weather each ablation arm hands the model, holding everything else (calendar/event/World
Cup covariates, and the training-context weather) fixed so the arms differ only in the
quality of the 7-day-ahead weather:

    O  observed   ERA5 reanalysis at the valid time (perfect foreknowledge, upper bound)
    H  hindcast   archived near valid time (the committed default; what exo numbers used)
    F  fixed-lead the forecast issued a fixed operational lead ahead (the stock reorder lead)
    M  horizon-matched  the forecast issued h days ahead for horizon step h (serving reality)

Two things are load-bearing and enforced, not assumed:

  * THE LEAD GATE (G1). Under M, horizon step h must receive the lead-h value and can never
    receive a shorter lead. `assert_lead_matched` verifies each target row's weather equals
    the pinned per-lead store's lead-(step) value and raises otherwise, so a permissive
    construction error - which would silently restore the optimism this package removes -
    cannot pass. It is the weather analogue of S5's panel-leakage gate.

  * BATCHED == UNBATCHED. `exo_predict` packs several origins into one predict_df call under
    `cross_learning=False` (each id independent), purely for CPU throughput; the id label
    does not enter the forecast, so a batched run matches per-origin calls (verified).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator

import numpy as np
import pandas as pd

from config import WEATHER_DRY_MM, WEATHER_LEAD_DAYS
from models.foundation import _WEATHER_EXO
from models.group_forecast import HORIZON_DAYS, load_pipeline  # reused, same pinned revision

# The three raw weather values an arm substitutes; exo_is_dry is DERIVED from rain so it is
# re-derived after any substitution, never copied, or it would disagree with the new rain.
WEATHER_VALUE_COLS = ["exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs"]
assert set(WEATHER_VALUE_COLS) | {"exo_is_dry"} == set(_WEATHER_EXO)


class LeadMismatchError(AssertionError):
    """Raised when a horizon-matched target row carries a lead other than its horizon step."""


# --- Per-arm target weather construction -------------------------------------

def _rederive_is_dry(target: pd.DataFrame) -> pd.DataFrame:
    """exo_is_dry from the (possibly substituted) rain, on the same threshold as ingest."""
    target = target.copy()
    target["exo_is_dry"] = (target["exo_rain_mm"] < WEATHER_DRY_MM).astype(float)
    return target


def _substitute(target: pd.DataFrame, wx: pd.DataFrame) -> pd.DataFrame:
    """Replace the weather value columns in `target` from date-keyed `wx`, keeping every
    non-weather covariate untouched, then re-derive exo_is_dry from the new rain."""
    out = target.copy()
    src = wx.set_index(pd.to_datetime(wx["date"]))
    dates = pd.to_datetime(out["date"])
    for c in WEATHER_VALUE_COLS:
        out[c] = dates.map(src[c]).to_numpy(float)
    return _rederive_is_dry(out)


def observed_target(target: pd.DataFrame, cell: str, observed: pd.DataFrame) -> pd.DataFrame:
    """O arm: the target-window weather is ERA5 reanalysis at the valid time (upper bound)."""
    wx = observed[observed["cell"] == cell][["date", *WEATHER_VALUE_COLS]]
    return _substitute(target, wx)


def fixed_lead_target(target: pd.DataFrame, cell: str, horizon: pd.DataFrame,
                      lead: int = WEATHER_LEAD_DAYS) -> pd.DataFrame:
    """F arm: every horizon step gets the forecast issued `lead` days ahead (one lead)."""
    wx = horizon[(horizon["cell"] == cell) & (horizon["lead"] == lead)][
        ["date", *WEATHER_VALUE_COLS]]
    return _substitute(target, wx)


def horizon_matched_target(target: pd.DataFrame, cell: str,
                           horizon: pd.DataFrame) -> pd.DataFrame:
    """M arm: horizon step h (row position, 1-indexed) gets the lead-h forecast.

    Carries a `_weather_lead` column recording the lead used per row, so the lead gate can
    verify provenance. `assert_lead_matched` is the authority; this builder must satisfy it.
    """
    out = target.reset_index(drop=True).copy()
    cell_h = horizon[horizon["cell"] == cell]
    by_lead = {int(lead): g.set_index(pd.to_datetime(g["date"]))
               for lead, g in cell_h.groupby("lead")}
    dates = pd.to_datetime(out["date"]).to_numpy()
    leads = np.arange(1, len(out) + 1)  # step h for row h-1
    for c in WEATHER_VALUE_COLS:
        out[c] = [float(by_lead[h].loc[pd.Timestamp(d), c])
                  for d, h in zip(dates, leads)]
    out["_weather_lead"] = leads
    return _rederive_is_dry(out)


def assert_lead_matched(target: pd.DataFrame, cell: str, horizon: pd.DataFrame) -> None:
    """G1: prove each target row's weather is the lead-(horizon step) value, no shorter.

    Verifies against the pinned per-lead store by VALUE, not just the `_weather_lead` label:
    a planted short-lead value (e.g. lead-1 placed at step 7) makes the row's weather differ
    from the store's lead-7 value and trips this. Fires loudly so a permissive M construction
    cannot silently hand the model a nearer-term, easier forecast than serving would have.
    """
    cell_h = horizon[horizon["cell"] == cell]
    by_lead = {int(lead): g.set_index(pd.to_datetime(g["date"]))
               for lead, g in cell_h.groupby("lead")}
    dates = pd.to_datetime(target["date"]).to_numpy()
    for i, d in enumerate(dates):
        step = i + 1
        if step not in by_lead:
            raise LeadMismatchError(
                f"{cell}: horizon step {step} has no lead-{step} row in the store")
        expected = by_lead[step].loc[pd.Timestamp(d), WEATHER_VALUE_COLS].to_numpy(float)
        got = target.iloc[i][WEATHER_VALUE_COLS].to_numpy(float)
        if not np.allclose(got, expected, rtol=0, atol=0, equal_nan=True):
            raise LeadMismatchError(
                f"{cell} {pd.Timestamp(d).date()} step {step}: weather is not the "
                f"lead-{step} value (got {got}, lead-{step} is {expected}) - a target row "
                f"carries a lead other than its horizon step")


# --- Batched exogenous prediction (throughput only; each origin independent) ---

@dataclass(frozen=True)
class ExoFold:
    """One venue-origin forecast task: the context and the covariate-bearing horizon."""

    key: str                 # origin date, ISO
    venue: str
    train: pd.DataFrame      # date, value, and every exo covariate column
    target: pd.DataFrame     # date and every exo covariate column (no target value)


def _chunks(items: list, size: int) -> Iterator[list]:
    for i in range(0, len(items), size):
        yield items[i:i + size]


def exo_predict(folds: list[ExoFold], *, pipe, exo_cols: list[str],
                origin_batch: int = 32, horizon: int = HORIZON_DAYS,
                ) -> dict[str, np.ndarray]:
    """Forecast every fold with its covariates. Returns {origin_key: median[H]}, clipped.

    `cross_learning=False` keeps every id independent, so packing `origin_batch` origins
    into one predict_df call is a pure throughput choice that does not change a number. The
    id encodes the origin key so the batched output demultiplexes back to per-origin rows.
    """
    out: dict[str, np.ndarray] = {}
    for chunk in _chunks(folds, max(1, origin_batch)):
        ctx_parts, fut_parts = [], []
        for f in chunk:
            sid = f"{f.key}::{f.venue}"
            ctx = pd.DataFrame({
                "id": sid,
                "timestamp": pd.to_datetime(f.train["date"].to_numpy()),
                "target": f.train["value"].to_numpy(float)})
            fut = pd.DataFrame({
                "id": sid,
                "timestamp": pd.to_datetime(f.target["date"].to_numpy())})
            for c in exo_cols:
                ctx[c] = f.train[c].to_numpy(float)
                fut[c] = f.target[c].to_numpy(float)
            ctx_parts.append(ctx)
            fut_parts.append(fut)
        ctx_df = pd.concat(ctx_parts, ignore_index=True)
        fut_df = pd.concat(fut_parts, ignore_index=True)
        pred = pipe.predict_df(
            ctx_df, future_df=fut_df, prediction_length=horizon,
            quantile_levels=[0.1, 0.5, 0.9], id_column="id",
            timestamp_column="timestamp", target="target",
            cross_learning=False, batch_size=max(1, len(chunk)))
        col = "0.5" if "0.5" in pred.columns else "predictions"
        for sid, g in pred.groupby("id", sort=False):
            key = sid.split("::", 1)[0]
            out[key] = np.clip(np.asarray(g[col].to_numpy(), float), 0.0, None)
    return out
