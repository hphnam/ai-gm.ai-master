"""WP4 / WP9 · Rung-4 foundation-model forecasters: Chronos-Bolt and Chronos-2.

Two zero-shot L1 point forecasters matching the ladder PREDICTORS signature, so
each climbs the same adoption gate as every other rung: adopted only if the best
Rung-4 entrant beats seasonal-naive AND robust DOW on held-out rolling MASE. We
additionally record whether it beats rung3_global_gbm, the Rung-4 criterion.

Zero-shot: no fine-tuning. Weights download from Hugging Face on first use
(network required once), then run on CPU. If chronos is not importable the rung
reports "backend not installed" and the ladder is byte-identical to its
pre-Rung-4 behaviour.

Pinned per the Chronos paper's declared codebase
(https://github.com/amazon-science/chronos-forecasting):
  * Chronos-Bolt (WP4), tensor API:
        from chronos import BaseChronosPipeline
        pipeline = BaseChronosPipeline.from_pretrained(CHRONOS_MODEL_ID, device_map=_resolve_device())
        quantiles, mean = pipeline.predict_quantiles(
            inputs=<1D float tensor>, prediction_length=H, quantile_levels=[...])
    quantiles shape [batch, H, n_levels]; the point forecast is the 0.5 row. (The
    2.x line renamed the first argument from `context` to `inputs`.)
  * Chronos-2 (WP9), README-canonical dataframe API:
        from chronos import Chronos2Pipeline
        pipeline = Chronos2Pipeline.from_pretrained(CHRONOS2_MODEL_ID, device_map=_resolve_device())
        pred_df = pipeline.predict_df(context_df, prediction_length=H,
            quantile_levels=[0.1, 0.5, 0.9], id_column="id",
            timestamp_column="timestamp", target="target")
    point forecast = the "0.5" column (else "predictions"). The fallback path is
    the tensor API predict_quantiles(inputs=[<1D tensor>], ...); see D-note in the
    build-report addendum, Chronos-2's predict_quantiles takes `inputs`, not the
    Bolt-style `context=`, and returns lists of [1, H, n_levels] tensors.
  * Chronos-2 + known-future covariates (WP12), same dataframe API with a
    future_df: context_df carries the CHRONOS2_EXO_COLS columns from train,
    future_df carries them for the target dates. No fallback to the univariate
    tensor path here: a covariate failure raises loudly (see chronos2_exo_predict)
    rather than silently degrading to the univariate entrant, which already
    exists as its own row.
"""

from __future__ import annotations

import os
import signal
from contextlib import contextmanager

import numpy as np
import pandas as pd

CHRONOS_MODEL_ID = "amazon/chronos-bolt-small"
CHRONOS2_MODEL_ID = "amazon/chronos-2"
CHRONOS2_FALLBACK_MODEL_ID = "autogluon/chronos-2-small"
RESOURCE_GUARD_SECONDS = 120

# S5 G17f / Major 14: the Chronos-2 series identifier was hardcoded to "l1" at
# three call sites, which forecloses grouped multi-venue calls (every venue would
# collide on one id). It is a parameter now, defaulting to the historical value so
# the single-series univariate path is byte-identical; the grouped path
# (models/group_forecast.py) passes venue-distinct ids. On a single-series call the
# id is cosmetic and does not enter the forecast, which is what the S5 G2 gate
# verifies empirically.
DEFAULT_SERIES_ID = "l1"

# Pinned Hugging Face weight revisions (S3 / reproducibility). A model id alone lets the
# weights move under a re-tag or re-upload, which would silently change zero-shot output
# and invalidate the frozen pre-registration artefacts in sim/. These are the exact
# commit SHAs of the repos that produced the committed Rung-4 results; a fresh download
# at these revisions is byte-identical. The resource-guard fallback model is left
# unpinned deliberately: it is a degraded substitute, never a serving path.
CHRONOS2_REVISION = "29ec3766d36d6f73f0696f85560a422f50e8498c"   # amazon/chronos-2
CHRONOS_REVISION = "772f3d25d38aec6d914c8949dab4462e2d46f5d8"    # amazon/chronos-bolt-small
_PINNED_REVISION = {CHRONOS2_MODEL_ID: CHRONOS2_REVISION,
                    CHRONOS_MODEL_ID: CHRONOS_REVISION}


def _revision_for(model_id: str) -> str | None:
    """The pinned HF revision for a model id, or None for the unpinned fallback."""
    return _PINNED_REVISION.get(model_id)

# G12.10b: the FULL known-future covariate universe the Chronos-2 exo entrant
# reads (was four calendar flags pre-G12.10b). Chronos-2 supports arbitrary
# covariates through the context frame + future_df, so the entrant consumes every
# factor genuinely known in advance for the 7-day horizon and weighs them itself:
#   * calendar (pure date functions, computable for any date):
#     is_bank_holiday, exo_is_school_term, exo_is_uni_term.
#   * is_ellel_event: the Ellel spillover flag. Safe for ALL venues now that
#     G12.10a2 neutralises it AT SOURCE (constant 0 on the Ellel frame, genuine
#     spillover on the Beer Hall frame). It is informative for Beer Hall and inert
#     (constant, therefore harmless) for Ellel; a constant covariate must not make
#     the entrant raise (the guard checks missing/NaN, not zero variance). No
#     entrant-level special-case; the source fix is the single point of truth.
#   * civic events: exo_fixture_nearby (curated Lancaster anchors, unchanged).
#   * World Cup (G12.10d/G12.15b, code-derived, raw/un-ranked): wc_match_in_hours,
#     wc_england_in_hours, wc_scotland_in_hours, wc_home_nation_in_hours,
#     wc_n_matches_in_hours, wc_any_match. Known-future because the fixture
#     calendar is fixed; home-nation flags kept raw so the model weighs them.
#   * weather: exo_temp_c, exo_rain_mm, exo_sunshine_hrs, exo_is_dry. Known-future
#     at serving time BECAUSE config serves on a forecast basis
#     (WEATHER_TRAIN_BASIS='hindcast', WEATHER_FORECAST_MAX_DAYS=16 covers the
#     7-day horizon). The observed/ERA5 upper-bound basis is NEVER used here (it
#     would leak into the backtest); `chronos2_exo_predict` asserts the basis.
# Weather is populated from `WEATHER_TRAIN_BASIS`; the entrant records that basis
# in its runtime info line.
_CALENDAR_EXO = ["is_bank_holiday", "is_ellel_event", "exo_is_school_term",
                 "exo_is_uni_term"]
_EVENT_EXO = ["exo_fixture_nearby"]
# G12.15b: home-nation flags added raw; the model weighs them, the analysis decides.
_WORLD_CUP_EXO = ["wc_match_in_hours", "wc_england_in_hours",
                  "wc_scotland_in_hours", "wc_home_nation_in_hours",
                  "wc_n_matches_in_hours", "wc_any_match"]
_WEATHER_EXO = ["exo_temp_c", "exo_rain_mm", "exo_sunshine_hrs", "exo_is_dry"]

# The auditable full universe, in one place.
CHRONOS2_EXO_COLS = _CALENDAR_EXO + _EVENT_EXO + _WORLD_CUP_EXO + _WEATHER_EXO

# G12.15a: some T5/Chronos ops are not yet MPS-native. Enabling the CPU fallback
# BEFORE torch is imported keeps an MPS run correct (unsupported ops fall back to
# CPU) rather than raising. setdefault so an explicit operator override wins.
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

try:
    import torch
    from chronos import BaseChronosPipeline, Chronos2Pipeline

    HAS_CHRONOS = True
except Exception:  # pragma: no cover - optional heavy backend
    HAS_CHRONOS = False


def _resolve_device() -> str:
    """G12.15a: the torch device for Chronos loads. `BRAIN_TORCH_DEVICE` overrides
    (portability); otherwise prefer Apple-GPU `mps` when available, else `cpu`.
    Never `cuda` on this host. Recorded in the entrant runtime info."""
    override = os.environ.get("BRAIN_TORCH_DEVICE")
    if override:
        return override
    if HAS_CHRONOS and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


_PIPELINE = None
# Chronos-2 process-level state: the loaded pipelines, the model id actually
# loaded, the API path last used, whether the resource guard substituted the
# small fallback model, the weather serving basis the exo entrant used, and the
# torch device the pipeline loaded on (G12.15a).
_CHRONOS2: dict = {"pipe": None, "base": None, "model_id": None,
                   "api": None, "substituted": False, "weather_basis": None,
                   "device": None}


def _pipeline():
    """Load the pinned Chronos-Bolt pipeline once per process (device auto-resolved,
    G12.15a: MPS on this Mac, else CPU)."""
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = BaseChronosPipeline.from_pretrained(
            CHRONOS_MODEL_ID, revision=CHRONOS_REVISION, device_map=_resolve_device())
    return _PIPELINE


def chronos2_runtime_info() -> dict:
    """Version / model id / API path / substitution flag / device for the report."""
    try:
        from importlib.metadata import version
        pkg = version("chronos-forecasting")
    except Exception:  # pragma: no cover
        pkg = "unknown"
    return {"version": pkg, "model_id": _CHRONOS2["model_id"],
            "revision": _revision_for(_CHRONOS2["model_id"] or CHRONOS2_MODEL_ID),
            "api": _CHRONOS2["api"], "substituted": _CHRONOS2["substituted"],
            "weather_basis": _CHRONOS2["weather_basis"],
            "device": _CHRONOS2["device"],
            "mps_fallback_enabled": os.environ.get("PYTORCH_ENABLE_MPS_FALLBACK")}


def chronos_bolt_predict(train: pd.DataFrame, target: pd.DataFrame, _cols=None) -> np.ndarray:
    """Zero-shot Chronos-Bolt point forecast: the 0.5 quantile row, clipped at 0.

    The chronos-forecasting 2.x line renamed this pipeline's first argument from
    `context` to `inputs` (the output is still [batch, H, n_levels]); the call uses
    the 2.x keyword so the same-family comparison row keeps working."""
    series = torch.tensor(train["value"].to_numpy(), dtype=torch.float32)
    quantiles, _mean = _pipeline().predict_quantiles(
        inputs=series, prediction_length=len(target),
        quantile_levels=[0.1, 0.5, 0.9])
    median = np.asarray(quantiles[0, :, 1], dtype=float)  # 0.5 quantile, batch 0
    return np.clip(median, 0.0, None)


class _GuardTimeout(Exception):
    pass


@contextmanager
def _time_limit(seconds: int):
    """Best-effort wall-clock guard via SIGALRM. Falls through without a hard
    limit when not on the main thread (SIGALRM is main-thread only)."""
    def _handler(_signum, _frame):
        raise _GuardTimeout()
    try:
        old = signal.signal(signal.SIGALRM, _handler)
        signal.alarm(seconds)
    except (ValueError, AttributeError):  # pragma: no cover - non-main-thread
        yield
        return
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old)


def _chronos2_pipeline():
    """Load Chronos-2 once per process. Resource guard (G9.2): if the flagship
    amazon/chronos-2 fails to load or exceeds the time guard, substitute the small
    autogluon/chronos-2-small once and record the substitution."""
    if _CHRONOS2["pipe"] is not None:
        return _CHRONOS2["pipe"]
    errors = []
    device = _resolve_device()
    for mid in (CHRONOS2_MODEL_ID, CHRONOS2_FALLBACK_MODEL_ID):
        try:
            with _time_limit(RESOURCE_GUARD_SECONDS):
                pipe = Chronos2Pipeline.from_pretrained(
                    mid, revision=_revision_for(mid), device_map=device)
            _CHRONOS2.update(pipe=pipe, model_id=mid, device=device,
                             substituted=(mid != CHRONOS2_MODEL_ID))
            return pipe
        except (_GuardTimeout, Exception) as exc:  # noqa: B014 - guard + load errors
            errors.append(f"{mid}: {type(exc).__name__}")
            continue
    raise RuntimeError("chronos-2 load failed -> " + "; ".join(errors))


def _chronos2_base_pipeline():
    """Base pipeline of the loaded Chronos-2 model, for the tensor fallback path."""
    if _CHRONOS2["base"] is not None:
        return _CHRONOS2["base"]
    mid = _CHRONOS2["model_id"] or CHRONOS2_MODEL_ID
    _CHRONOS2["base"] = BaseChronosPipeline.from_pretrained(
        mid, revision=_revision_for(mid), device_map=_resolve_device())
    return _CHRONOS2["base"]


def chronos2_predict(train: pd.DataFrame, target: pd.DataFrame, _cols=None, *,
                     series_id: str = DEFAULT_SERIES_ID) -> np.ndarray:
    """Zero-shot Chronos-2 point forecast, clipped at 0.

    Primary path (S9): the README-canonical predict_df dataframe API. Fallback
    (S10, corrected for Chronos-2): the tensor predict_quantiles(inputs=[...])
    API, used only if predict_df raises or returns a malformed frame.

    `series_id` labels the single series; the default reproduces the historical
    "l1" frame exactly and a single-series forecast is invariant to it."""
    n = len(target)
    try:
        pipe = _chronos2_pipeline()
        context_df = pd.DataFrame({
            "id": series_id,
            "timestamp": pd.to_datetime(train["date"].to_numpy()),
            "target": train["value"].to_numpy(float)})
        pred_df = pipe.predict_df(
            context_df, prediction_length=n, quantile_levels=[0.1, 0.5, 0.9],
            id_column="id", timestamp_column="timestamp", target="target")
        col = "0.5" if "0.5" in pred_df.columns else "predictions"
        out = np.asarray(pred_df[col].to_numpy(), float)
        if out.shape[0] != n:
            raise ValueError(f"predict_df returned {out.shape[0]} rows, expected {n}")
        _CHRONOS2["api"] = "predict_df"
        return np.clip(out, 0.0, None)
    except Exception:
        base = _chronos2_base_pipeline()
        series = torch.tensor(train["value"].to_numpy(), dtype=torch.float32)
        quantiles, _mean = base.predict_quantiles(
            inputs=[series], prediction_length=n, quantile_levels=[0.1, 0.5, 0.9])
        median = np.asarray(quantiles[0][0, :, 1], dtype=float)  # series 0, 0.5 level
        _CHRONOS2["api"] = "predict_quantiles"
        return np.clip(median, 0.0, None)


class MissingCovariateError(ValueError):
    """Raised when chronos2_exo_predict is handed a frame lacking a required
    known-future covariate value. Deliberate: this entrant never imputes."""


# G12.10b: the resolver returns the FULL known-future universe for every venue.
# No Ellel special-case: `is_ellel_event` is neutralised AT SOURCE (G12.10a2,
# constant 0 on the Ellel frame), so it is inert-not-excluded here: informative
# for Beer Hall, harmless-constant for Ellel. The `venue` argument is kept for
# future per-venue flexibility but returns the same set for all venues today.
# (Alias retained: `exo_cols_for_venue` == `chronos2_exo_cols`.)
def chronos2_exo_cols(venue: str | None = None) -> list[str]:
    return list(CHRONOS2_EXO_COLS)


exo_cols_for_venue = chronos2_exo_cols


def _require_covariates(frame: pd.DataFrame, which: str, exo_cols: list[str]) -> None:
    missing_cols = [c for c in exo_cols if c not in frame.columns]
    if missing_cols:
        raise MissingCovariateError(
            f"chronos2_exo_predict: {which} frame is missing covariate column(s) "
            f"{missing_cols} (of {exo_cols}); not imputing, raising instead")
    nan_cols = [c for c in exo_cols if frame[c].isna().any()]
    if nan_cols:
        raise MissingCovariateError(
            f"chronos2_exo_predict: {which} frame has NaN covariate value(s) in "
            f"{nan_cols}; not imputing, raising instead")


def chronos2_exo_predict(train: pd.DataFrame, target: pd.DataFrame, _cols=None, *,
                         venue: str | None = None,
                         exo_cols: list[str] | None = None,
                         series_id: str = DEFAULT_SERIES_ID) -> np.ndarray:
    """Zero-shot Chronos-2 point forecast with the FULL known-future covariate set
    (G12.10b), clipped at 0. Reads `chronos2_exo_cols(venue)` (the same full
    universe for every venue): calendar + is_ellel_event (inert-not-excluded, safe
    via the G12.10a2 source fix) + civic events + World Cup + weather.

    Weather is a genuine known-future covariate here ONLY because it is served on a
    forecast basis (`config.WEATHER_TRAIN_BASIS`, which build_features uses to
    populate the weather columns); the observed/ERA5 upper-bound basis would leak
    into the backtest, so this raises if the serving basis is 'observed'. The
    resolved basis is recorded in the runtime-info line.

    Shares the process-level Chronos-2 pipeline with chronos2_predict (one model in
    memory for both entrants). No fallback to the univariate tensor path: if the
    covariate call fails for any reason (missing/NaN covariate, a predict_df error),
    this raises so the ladder harness reports it as a distinct failed entrant, never
    a silent degrade to the univariate row (which already exists on its own)."""
    import config

    # `exo_cols` override (G12.10e ablation): an explicit subset of the universe,
    # e.g. the full set minus the wc_* features, for the with/without probe. Default
    # is the full resolved universe for the venue.
    exo_cols = list(exo_cols) if exo_cols is not None else chronos2_exo_cols(venue)
    if any(c in _WEATHER_EXO for c in exo_cols):
        basis = config.WEATHER_TRAIN_BASIS
        if basis == "observed":
            raise MissingCovariateError(
                "chronos2_exo_predict: weather covariates require a FORECAST serving "
                "basis (hindcast/leadmatched); WEATHER_TRAIN_BASIS='observed' is the "
                "ERA5 upper bound and would leak into the backtest")
        _CHRONOS2["weather_basis"] = basis
    _require_covariates(train, "train", exo_cols)
    _require_covariates(target, "target", exo_cols)
    n = len(target)
    pipe = _chronos2_pipeline()
    context_df = pd.DataFrame({
        "id": series_id,
        "timestamp": pd.to_datetime(train["date"].to_numpy()),
        "target": train["value"].to_numpy(float)})
    for c in exo_cols:
        context_df[c] = train[c].to_numpy(float)
    future_df = pd.DataFrame({
        "id": series_id, "timestamp": pd.to_datetime(target["date"].to_numpy())})
    for c in exo_cols:
        future_df[c] = target[c].to_numpy(float)
    pred_df = pipe.predict_df(
        context_df, future_df=future_df, prediction_length=n,
        quantile_levels=[0.1, 0.5, 0.9], id_column="id",
        timestamp_column="timestamp", target="target")
    col = "0.5" if "0.5" in pred_df.columns else "predictions"
    out = np.asarray(pred_df[col].to_numpy(), float)
    if out.shape[0] != n:
        raise ValueError(f"predict_df returned {out.shape[0]} rows, expected {n}")
    return np.clip(out, 0.0, None)
