"""WP4 · Rung-4 foundation-model forecaster: Chronos-Bolt zero-shot.

Wraps amazon/chronos-bolt-small as a drop-in L1 point forecaster matching the
ladder PREDICTORS signature, so it climbs the same adoption gate as every other
rung: it is adopted only if it beats seasonal-naive AND robust DOW on held-out
rolling MASE. We additionally record whether it beats rung3_global_gbm, the
Rung-4 adoption criterion.

Zero-shot: no fine-tuning. The pretrained weights download from Hugging Face on
first use (network required once), then run on CPU. If chronos is not importable
the rung reports "backend not installed" and the ladder is byte-identical to its
pre-Rung-4 behaviour.

Pinned per the Chronos paper's declared codebase
(https://github.com/amazon-science/chronos-forecasting):
    from chronos import BaseChronosPipeline
    pipeline = BaseChronosPipeline.from_pretrained(CHRONOS_MODEL_ID, device_map="cpu")
    quantiles, mean = pipeline.predict_quantiles(
        context=<1D float tensor>, prediction_length=H,
        quantile_levels=[0.1, 0.5, 0.9])
  quantiles shape [batch, H, n_levels]; the point forecast is the 0.5 row.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

CHRONOS_MODEL_ID = "amazon/chronos-bolt-small"

try:
    import torch
    from chronos import BaseChronosPipeline

    HAS_CHRONOS = True
except Exception:  # pragma: no cover - optional heavy backend
    HAS_CHRONOS = False

_PIPELINE = None


def _pipeline():
    """Load the pinned pipeline once per process (CPU inference)."""
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = BaseChronosPipeline.from_pretrained(
            CHRONOS_MODEL_ID, device_map="cpu")
    return _PIPELINE


def chronos_bolt_predict(train: pd.DataFrame, target: pd.DataFrame, _cols=None) -> np.ndarray:
    """Zero-shot Chronos-Bolt point forecast: the 0.5 quantile row, clipped at 0."""
    context = torch.tensor(train["value"].to_numpy(), dtype=torch.float32)
    quantiles, _mean = _pipeline().predict_quantiles(
        context=context, prediction_length=len(target),
        quantile_levels=[0.1, 0.5, 0.9])
    median = np.asarray(quantiles[0, :, 1], dtype=float)  # 0.5 quantile, batch 0
    return np.clip(median, 0.0, None)
