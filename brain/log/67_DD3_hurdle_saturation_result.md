# D-D3 evidence — the occurrence gate's binary part is Cragg's, saturated

Run 2026-08-06. Supports decision-log row 81 and `ledger/literature_conformance.md` §11.
This is a **verification run, not an experiment**: it checks an estimator-equivalence claim
that would otherwise have to be asserted, which the standing instruction on R6 forbids.

## Provenance

| Field | Value |
|---|---|
| Command | `.venv-forecast/bin/python -m eval.hurdle_saturation_check` |
| Venv | `.venv-forecast` — Python 3.12.13, numpy 2.5.1, pandas 3.0.3, statsmodels 0.14.6 |
| Seed | 93 |
| n | 400 synthetic days, DOW-driven occurrence |
| Module | `eval/hurdle_saturation_check.py` |

## Why this was run

The conformance ledger recorded `signals/occurrence.py::p_trade` as returning *"exactly 0 or
1 by construction"*, which would place the binary part **outside** the specification Cragg
(1971) and Mullahy (1986) give. Reading the code, that premise is **false**. `p_trade`
returns

```python
by_dow = (pd.DataFrame({"dow": ..., "o": o}).groupby("dow")["o"].mean())
```

— `E[occurrence | day-of-week]` over the training labels (`signals/occurrence.py:95-98`).
That is a **saturated nonparametric estimator** of `P(trade | DOW)`, not a hard-coded
constant. It *evaluates* to 0 or 1 at Beer Hall because the closure calendar is
deterministic, not because the code forces it. A venue that traded on some Mondays and not
others would return a fraction, and the module is written to allow exactly that.

## Result

| dow | groupby cell mean | saturated logit MLE | abs diff |
|---|---|---|---|
| 0 (Mon) | 0.000000 | 0.000011 | 1.06e-05 |
| 1 (Tue) | 0.000000 | 0.000011 | 1.06e-05 |
| 2 | 0.981132 | 0.981142 | 9.60e-06 |
| 3 | 0.580000 | 0.580076 | 7.61e-05 |
| 4 | 0.966102 | 0.966100 | 1.26e-06 |
| 5 | 1.000000 | 0.999989 | 1.05e-05 |
| 6 | 0.870968 | 0.870962 | 5.41e-06 |

**Max absolute difference 7.61e-05**, which is BFGS convergence tolerance, not a modelling
difference. The two estimators are the same estimator.

**Complete separation in the deterministic cells.** DOW 0, 1 and 5 have degenerate cell
frequencies (0, 0, 1). Their fitted logit coefficients reach **|coef| = 11.46 and are still
diverging** at 2000 BFGS iterations — the standard complete-separation signature: the MLE of
the coefficient does not exist, while the fitted *probability* converges to the cell
frequency.

## What it licenses

1. **The groupby mean IS the fitted binary part.** For a design matrix of DOW dummies, the
   MLE of Cragg's probit / Mullahy's binomial logit is the within-cell empirical frequency.
   Our first stage is therefore not a departure from their specification — it is their
   specification with one categorical covariate, computed in closed form.
2. **The parameterisation is what breaks at a deterministic calendar, not the design.** A
   practitioner who insisted on literally fitting a probit here would be fitting a model
   whose coefficient estimates do not exist. Choosing the closed form is the numerically
   stable route to the same fitted probabilities, not an avoidance of estimation.
3. **The honest limitation is unchanged and is about covariates, not about estimation.**
   Cragg's motivation for a *separate* first stage is friction — *"search, information, and
   transactions costs which inhibit the carrying out of desired plans"* — and Mullahy's is
   that the two processes need not share parameters. Both gains are about **separating** the
   two processes, which this design has. What our first stage does not have is a *rich*
   covariate set: it conditions on DOW alone. That is the limitation to state, and it is a
   much smaller one than "the binary part is not estimated at all".

## Scope caveat, stated

This check is on synthetic data with a known DOW-driven generator. It establishes an
**estimator-equivalence fact**, which is a property of the two estimators and not of this
estate's data; nothing here is a claim about Beer Hall or Ellel occurrence rates. The real
`p_trade` cells are not reported from this run and must not be quoted from it.
