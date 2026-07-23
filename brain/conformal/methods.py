"""S7 G17h - the five conformal banding methods compared on step-1 rolling origins.

Each method turns a growing pool of past absolute residuals (each tagged with its horizon
step 1..7 and its active/structural-zero state) into a 7-day band at one origin. They share
the split-conformal quantile; they differ in how they slice or adapt it:

  P  plain    one pooled quantile across every step and state (the pooled default)
  D  mondrian one quantile per state (active vs structural-zero day), pooled over steps
  S  per-step one quantile per horizon step, pooled over states
  A  ACI      per-step Adaptive Conformal Inference (Gibbs and Candes 2021): the effective
              miscoverage level is nudged online after each observed outcome, so a run of
              misses widens the band and a run of hits narrows it
  G  AgACI    per-step Aggregated ACI (Zaffran et al. 2022): an online expert aggregation
              over a grid of ACI learning rates, removing the single-rate choice A exposes

The online (A, G) methods keep the effective miscoverage in [0, 1] and count every clamp
rather than clipping silently, so a degenerate learning rate is loud in the artefact.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

HORIZON = 7


def safe_conformal_quantile(scores: np.ndarray, level: float) -> float:
    """Split-conformal quantile (k-th smallest |residual|) safe over the whole [0, 1] range.

    Matches `conformal.wrap.conformal_quantile` for level in (0, 1); the online methods drive
    the level to the endpoints, where the base helper's `ceil((n+1)*level)-1` would index -1
    (returning the MAX at level 0). Here level <= 0 is a zero-width band and level >= 1 is the
    largest residual, which is what an ACI level excursion should mean."""
    scores = np.sort(np.asarray(scores, dtype=float))
    n = scores.size
    if n == 0:
        return float("nan")
    if level <= 0.0:
        return 0.0
    if level >= 1.0:
        return float(scores[-1])
    k = min(int(math.ceil((n + 1) * level)), n)
    return float(scores[k - 1])


def _pinball(y: float, q_pred: float, q: float) -> float:
    diff = y - q_pred
    return max(q * diff, (q - 1.0) * diff)


def interval_pinball(y: float, lo: float, hi: float, level: float) -> float:
    """Summed pinball loss of an interval's two quantiles; the AgACI expert loss."""
    alpha = 1.0 - level
    return _pinball(y, lo, alpha / 2.0) + _pinball(y, hi, 1.0 - alpha / 2.0)


# --- The non-adaptive arms: pure functions of the pool -----------------------

def plain_band(level: float, pool_res: np.ndarray, yhat: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    q = safe_conformal_quantile(pool_res, level)
    return np.clip(yhat - q, 0.0, None), yhat + q


def mondrian_band(level: float, pool_res: np.ndarray, pool_state: np.ndarray,
                  yhat: np.ndarray, states: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    fallback = safe_conformal_quantile(pool_res, level)
    per_state = {int(g): safe_conformal_quantile(pool_res[pool_state == g], level)
                 for g in np.unique(pool_state)}
    q = np.array([per_state.get(int(s), fallback) for s in states], float)
    q = np.where(np.isnan(q), fallback, q)
    return np.clip(yhat - q, 0.0, None), yhat + q


def perstep_band(level: float, pool_res: np.ndarray, pool_step: np.ndarray,
                 yhat: np.ndarray, steps: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    fallback = safe_conformal_quantile(pool_res, level)
    per_step = {int(h): safe_conformal_quantile(pool_res[pool_step == h], level)
                for h in np.unique(steps)}
    q = np.array([per_step.get(int(h), fallback) for h in steps], float)
    q = np.where(np.isnan(q), fallback, q)
    return np.clip(yhat - q, 0.0, None), yhat + q


# --- Adaptive Conformal Inference (per horizon step) -------------------------

@dataclass
class ACI:
    """Per-step Gibbs-Candes ACI. `eff[h]` is the effective miscoverage alpha for step h,
    updated by alpha_target - 1{miss} after each origin; the band uses level 1 - eff[h].

    The effective alpha is clamped to [0, 1] and every clamp is COUNTED (`clamps`), so a
    learning rate that pushes the level out of range is loud in the result rather than a
    silent clip. `excursion_lo/hi` record how far out it went."""

    level: float
    gamma: float
    horizon: int = HORIZON
    eff: dict = field(default_factory=dict)
    clamps: int = 0
    excursion_lo: float = 0.0
    excursion_hi: float = 1.0

    def __post_init__(self):
        self.alpha_target = 1.0 - self.level
        if not self.eff:
            self.eff = {h: self.alpha_target for h in range(1, self.horizon + 1)}

    def _clamped_level(self, step: int) -> float:
        a = self.eff[step]
        if a < 0.0 or a > 1.0:
            self.clamps += 1
            self.excursion_lo = min(self.excursion_lo, a)
            self.excursion_hi = max(self.excursion_hi, a)
        a = min(1.0, max(0.0, a))
        return 1.0 - a

    def band(self, pool_res: np.ndarray, pool_step: np.ndarray,
             yhat: np.ndarray, steps: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        fallback_all = pool_res
        q = np.empty(len(steps))
        for i, h in enumerate(steps):
            lvl = self._clamped_level(int(h))
            resh = pool_res[pool_step == h]
            q[i] = safe_conformal_quantile(resh if resh.size else fallback_all, lvl)
        return np.clip(yhat - q, 0.0, None), yhat + q

    def update_step(self, step: int, y: float, lo: float, hi: float) -> None:
        """Nudge step `step`'s effective miscoverage from ONE observed outcome. Called with
        the lag h by the driver, when the step-h interval's target date has been observed."""
        covered = lo <= y <= hi
        err = 0.0 if covered else 1.0
        self.eff[int(step)] += self.gamma * (self.alpha_target - err)


# --- Aggregated ACI: online expert aggregation over the learning-rate grid ---

@dataclass
class AgACI:
    """Per-step online aggregation of ACI experts over a grid of learning rates. Each expert
    is an ACI at one gamma; the band is the exponentially-weighted average of the experts'
    bounds, weights driven by each expert's cumulative interval pinball loss. Reduces EXACTLY
    to a single ACI when the grid has one gamma (G4)."""

    level: float
    gammas: tuple[float, ...]
    horizon: int = HORIZON
    eta: float = 1.0
    experts: list = field(default_factory=list)
    cumloss: dict = field(default_factory=dict)
    clamps: int = 0
    last_experts: dict = field(default_factory=dict)

    def __post_init__(self):
        self.experts = [ACI(self.level, g, self.horizon) for g in self.gammas]
        self.cumloss = {h: np.zeros(len(self.gammas)) for h in range(1, self.horizon + 1)}

    def _weights(self, step: int) -> np.ndarray:
        losses = self.cumloss[step]
        z = -self.eta * (losses - losses.min())
        w = np.exp(z)
        return w / w.sum()

    def band(self, pool_res: np.ndarray, pool_step: np.ndarray,
             yhat: np.ndarray, steps: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        lo_out = np.empty(len(steps))
        hi_out = np.empty(len(steps))
        self.last_experts = {}
        for i, h in enumerate(steps):
            los = np.empty(len(self.experts))
            his = np.empty(len(self.experts))
            for k, ex in enumerate(self.experts):
                lo_k, hi_k = ex.band(pool_res, pool_step,
                                     np.array([yhat[i]]), np.array([h]))
                los[k], his[k] = lo_k[0], hi_k[0]
            w = self._weights(int(h))
            lo_out[i] = max(float(np.dot(w, los)), 0.0)
            hi_out[i] = float(np.dot(w, his))
            self.last_experts[int(h)] = (los, his)
        self.clamps = sum(ex.clamps for ex in self.experts)
        return lo_out, hi_out

    def update_step(self, step: int, y: float, los: np.ndarray, his: np.ndarray) -> None:
        """Update every expert's cumulative loss and ACI state at step `step` from one
        observed outcome, with the per-expert interval bounds that produced it."""
        self.cumloss[int(step)] += np.array(
            [interval_pinball(y, lo, hi, self.level) for lo, hi in zip(los, his)])
        for k, ex in enumerate(self.experts):
            covered = los[k] <= y <= his[k]
            err = 0.0 if covered else 1.0
            ex.eff[int(step)] += ex.gamma * (ex.alpha_target - err)
