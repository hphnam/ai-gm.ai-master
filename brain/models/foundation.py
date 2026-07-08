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
        pipeline = BaseChronosPipeline.from_pretrained(CHRONOS_MODEL_ID, device_map="cpu")
        quantiles, mean = pipeline.predict_quantiles(
            inputs=<1D float tensor>, prediction_length=H, quantile_levels=[...])
    quantiles shape [batch, H, n_levels]; the point forecast is the 0.5 row. (The
    2.x line renamed the first argument from `context` to `inputs`.)
  * Chronos-2 (WP9), README-canonical dataframe API:
        from chronos import Chronos2Pipeline
        pipeline = Chronos2Pipeline.from_pretrained(CHRONOS2_MODEL_ID, device_map="cpu")
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

import signal
from contextlib import contextmanager

import numpy as np
import pandas as pd

CHRONOS_MODEL_ID = "amazon/chronos-bolt-small"
CHRONOS2_MODEL_ID = "amazon/chronos-2"
CHRONOS2_FALLBACK_MODEL_ID = "autogluon/chronos-2-small"
RESOURCE_GUARD_SECONDS = 120

# WP12: the exact covariate set the exo entrant reads. Calendar-derived, known at
# forecast time. Weather is never included here (it is not known-future); it
# stays attribution-only per G-live-b / the covariate probe.
CHRONOS2_EXO_COLS = ["is_bank_holiday", "is_ellel_event", "exo_is_school_term",
                     "exo_is_uni_term"]

try:
    import torch
    from chronos import BaseChronosPipeline, Chronos2Pipeline

    HAS_CHRONOS = True
except Exception:  # pragma: no cover - optional heavy backend
    HAS_CHRONOS = False

_PIPELINE = None
# Chronos-2 process-level state: the loaded pipelines, the model id actually
# loaded, the API path last used, and whether the resource guard substituted the
# small fallback model.
_CHRONOS2: dict = {"pipe": None, "base": None, "model_id": None,
                   "api": None, "substituted": False}


def _pipeline():
    """Load the pinned Chronos-Bolt pipeline once per process (CPU inference)."""
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = BaseChronosPipeline.from_pretrained(
            CHRONOS_MODEL_ID, device_map="cpu")
    return _PIPELINE


def chronos2_runtime_info() -> dict:
    """Version / model id / API path / substitution flag for the report line."""
    try:
        from importlib.metadata import version
        pkg = version("chronos-forecasting")
    except Exception:  # pragma: no cover
        pkg = "unknown"
    return {"version": pkg, "model_id": _CHRONOS2["model_id"],
            "api": _CHRONOS2["api"], "substituted": _CHRONOS2["substituted"]}


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
    for mid in (CHRONOS2_MODEL_ID, CHRONOS2_FALLBACK_MODEL_ID):
        try:
            with _time_limit(RESOURCE_GUARD_SECONDS):
                pipe = Chronos2Pipeline.from_pretrained(mid, device_map="cpu")
            _CHRONOS2.update(pipe=pipe, model_id=mid,
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
    _CHRONOS2["base"] = BaseChronosPipeline.from_pretrained(mid, device_map="cpu")
    return _CHRONOS2["base"]


def chronos2_predict(train: pd.DataFrame, target: pd.DataFrame, _cols=None) -> np.ndarray:
    """Zero-shot Chronos-2 point forecast, clipped at 0.

    Primary path (S9): the README-canonical predict_df dataframe API. Fallback
    (S10, corrected for Chronos-2): the tensor predict_quantiles(inputs=[...])
    API, used only if predict_df raises or returns a malformed frame."""
    n = len(target)
    try:
        pipe = _chronos2_pipeline()
        context_df = pd.DataFrame({
            "id": "l1",
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


def _require_covariates(frame: pd.DataFrame, which: str) -> None:
    missing_cols = [c for c in CHRONOS2_EXO_COLS if c not in frame.columns]
    if missing_cols:
        raise MissingCovariateError(
            f"chronos2_exo_predict: {which} frame is missing covariate column(s) "
            f"{missing_cols} (of {CHRONOS2_EXO_COLS}); not imputing, raising instead")
    nan_cols = [c for c in CHRONOS2_EXO_COLS if frame[c].isna().any()]
    if nan_cols:
        raise MissingCovariateError(
            f"chronos2_exo_predict: {which} frame has NaN covariate value(s) in "
            f"{nan_cols}; not imputing, raising instead")


def chronos2_exo_predict(train: pd.DataFrame, target: pd.DataFrame, _cols=None) -> np.ndarray:
    """Zero-shot Chronos-2 point forecast with known-future calendar covariates
    (WP12), clipped at 0. Reads exactly CHRONOS2_EXO_COLS; never weather.

    Shares the process-level Chronos-2 pipeline with chronos2_predict (one model
    in memory for both entrants). No fallback to the univariate tensor path: if
    the covariate call fails for any reason (missing/NaN covariate, a predict_df
    error), this raises so the ladder harness reports it as a distinct failed
    entrant, never a silent degrade to the univariate row (which already exists
    on its own)."""
    _require_covariates(train, "train")
    _require_covariates(target, "target")
    n = len(target)
    pipe = _chronos2_pipeline()
    context_df = pd.DataFrame({
        "id": "l1",
        "timestamp": pd.to_datetime(train["date"].to_numpy()),
        "target": train["value"].to_numpy(float)})
    for c in CHRONOS2_EXO_COLS:
        context_df[c] = train[c].to_numpy(float)
    future_df = pd.DataFrame({
        "id": "l1", "timestamp": pd.to_datetime(target["date"].to_numpy())})
    for c in CHRONOS2_EXO_COLS:
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
