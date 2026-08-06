"""D-D3 evidence · is the occurrence gate's binary part outside Cragg's specification?

The conformance ledger recorded `signals/occurrence.py::p_trade` as returning "exactly 0
or 1 by construction", which would put the binary part outside the hurdle literature's
specification (Cragg 1971 fits a probit; Mullahy 1986 fits a binomial logit).

Reading the code, that premise is wrong: `p_trade` returns `E[occurrence | day-of-week]`,
a groupby mean over the training labels. That is a *saturated nonparametric estimator* of
P(trade | DOW) — the special case of Cragg's probit whose design matrix is a full set of
DOW dummies. This module checks that equivalence numerically rather than asserting it, and
records what the probit/logit parameterisation does at a deterministic cell.

Two checks:
  1. On synthetic data with both stochastic and deterministic DOW cells, does the
     saturated-logit MLE reproduce the groupby cell frequencies?
  2. What do the fitted coefficients do in the deterministic cells (complete separation)?

Run:
    python -m eval.hurdle_saturation_check
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm

SEED = 93
N = 400
# Mon/Tue structurally closed (Beer Hall's real pattern); the rest stochastic.
DOW_P = {0: 0.0, 1: 0.0, 2: 0.9, 3: 0.7, 4: 0.95, 5: 1.0, 6: 0.8}


def _saturated_logit(df: pd.DataFrame) -> tuple[pd.Series, np.ndarray]:
    """Fit P(o=1 | DOW) with a full set of DOW dummies and no intercept."""
    design = pd.get_dummies(df["dow"], prefix="d").astype(float)
    fit = sm.Logit(df["o"], design).fit(disp=0, method="bfgs", maxiter=2000)
    fitted = pd.Series(fit.predict(design).to_numpy(), index=df["dow"].to_numpy())
    return fitted.groupby(level=0).first(), fit.params.to_numpy()


def check() -> dict:
    rng = np.random.default_rng(SEED)
    dow = rng.integers(0, 7, N)
    p_true = np.array([DOW_P[int(d)] for d in dow])
    df = pd.DataFrame({"dow": dow, "o": (rng.random(N) < p_true).astype(int)})

    cells = df.groupby("dow")["o"].mean()
    fitted, coefs = _saturated_logit(df)
    diff = np.abs(cells.to_numpy() - fitted.reindex(cells.index).to_numpy())

    deterministic = [d for d, p in DOW_P.items() if p in (0.0, 1.0)]
    return {
        "n": N,
        "cells": {int(d): float(cells[d]) for d in cells.index},
        "fitted": {int(d): float(fitted[d]) for d in fitted.index},
        "max_abs_diff": float(diff.max()),
        "deterministic_dow": deterministic,
        "coef_abs_max": float(np.abs(coefs).max()),
        "equivalent": bool(diff.max() < 1e-3),
    }


def main() -> int:
    out = check()
    print("D-D3 · saturated logit vs groupby cell frequency")
    print(f"  n = {out['n']}, seed = {SEED}\n")
    print("  dow | groupby mean | saturated logit | abs diff")
    for d in sorted(out["cells"]):
        g, f = out["cells"][d], out["fitted"][d]
        print(f"   {d}  |   {g:.6f}   |    {f:.6f}   | {abs(g - f):.2e}")
    print(f"\n  max abs diff        : {out['max_abs_diff']:.2e}")
    print(f"  estimators equivalent: {out['equivalent']}")
    print(f"  deterministic cells  : {out['deterministic_dow']} "
          f"(complete separation; |coef| max = {out['coef_abs_max']:.2f}, diverging)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
