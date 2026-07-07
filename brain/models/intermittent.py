"""Croston's method and the Syntetos-Boylan Approximation (SBA) for
intermittent-demand series (WP2 of the fidelity corrections).

Croston (1972) decouples demand SIZE from demand INTERVAL and smooths each with
its own simple-exponential update, so a series with many zero periods is
forecast by a flat per-period rate size/interval rather than by a level model
that a long zero run would drag toward zero. SBA (Syntetos and Boylan 2005)
multiplies that rate by (1 - alpha/2) to remove Croston's known positive bias.

Both estimators produce a CONSTANT per-period rate forecast: Croston's method
has no trend or seasonality, so the forecast for every horizon step is the flat
rate at the end of training. We do not add seasonality on top.

The update recursion (verbatim from the fidelity spec S3), tracking the demand
size estimate zhat, the interval estimate phat, and the periods-since-last-demand
counter q:
  * zero period (z_t = 0):  zhat, phat unchanged;  q += 1
  * demand period (z_t > 0):
        zhat <- zhat + alpha (z_t - zhat)
        phat <- phat + alpha (q   - phat)
        q    <- 1
  forecast per period = zhat / phat  (SBA: (1 - alpha/2) * zhat / phat)

zhat and phat are initialised from the first non-zero demand and the first
observed interval. alpha is typically 0.1 to 0.2; we default to 0.1 to match
the CrostonClassic / CrostonSBA cross-check oracle.
"""

from __future__ import annotations

import numpy as np


def croston_classic(y, alpha: float = 0.1) -> float:
    """Flat per-period Croston rate at the end of the training series."""
    rate, _ = _croston_core(np.asarray(y, float), alpha, deflate=False)
    return rate


def croston_sba(y, alpha: float = 0.1) -> float:
    """Flat per-period SBA rate: (1 - alpha/2) times the Croston rate."""
    rate, _ = _croston_core(np.asarray(y, float), alpha, deflate=True)
    return rate


def croston_fitted(y, alpha: float = 0.1, *, deflate: bool = True) -> np.ndarray:
    """Leak-free one-step-ahead in-sample forecasts aligned to y.

    fitted[t] is the rate computed from y[:t] (strictly before t), so
    y[t] - fitted[t] is an honest in-sample residual. Entries before the first
    non-zero demand are NaN (no rate exists yet). Used to calibrate a
    conformal band on the same forecaster that produces the point.
    """
    _, fitted = _croston_core(np.asarray(y, float), alpha, deflate=deflate)
    return fitted


def _croston_core(y: np.ndarray, alpha: float, deflate: bool) -> tuple[float, np.ndarray]:
    n = len(y)
    fitted = np.full(n, np.nan)
    nonzero = np.flatnonzero(y > 0)
    if nonzero.size == 0:
        return 0.0, fitted

    i0 = int(nonzero[0])
    zhat = float(y[i0])
    phat = 1.0
    q = 1
    factor = (1.0 - alpha / 2.0) if deflate else 1.0
    rate = zhat / phat
    for t in range(i0 + 1, n):
        fitted[t] = factor * rate
        if y[t] > 0:
            zhat = zhat + alpha * (y[t] - zhat)
            phat = phat + alpha * (q - phat)
            q = 1
            rate = zhat / phat
        else:
            q += 1
    return factor * rate, fitted
