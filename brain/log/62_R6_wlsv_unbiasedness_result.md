# R6 result — the unbiasedness precondition WLS_v inherits from MinT

Run 2026-08-05. Closes **D-F7**. Conformance row **R22**.

## Provenance

| Field | Value |
|---|---|
| Command | `.venv-forecast/bin/python -m hierarchy.reconcile` |
| Venv | `.venv-forecast` — Python 3.12.13, numpy 2.5.1, pandas 3.0.3 |
| Store ceiling | 2026-07-07; venue beer_hall; 41 nodes (32 bottom) |
| Test span | 2026-05-12 → 2026-07-07 |
| Wall clock | **5 s** |
| Code | `hierarchy/reconcile.py` — new `unbiasedness_check()`, wired into the payload and the report |

## The source condition, verified this session

Wickramasuriya, Athanasopoulos & Hyndman (2019) build the whole result on it. Verbatim:

> "Let ê_T(h) = y_{T+h} − ŷ_T(h) be the h-step-ahead conditionally stationary base forecast
> errors with **E[ê_T(h)|I_T] = 0** ... This implies that the base forecasts are unbiased,
> that is, E[ŷ_T(h)|I_T] = E[y_{T+h}|I_T]."

> "We wish to find the value of P that minimizes the trace of var[...] subject to it
> satisfying SPS = S. This would give the best (minimum variance) linear **unbiased**
> reconciled forecasts."

Asked directly what the 2019 paper says happens when the bases are biased: **NOT SUPPORTED
— the paper does not address it.** Athanasopoulos et al. (2024) note only that dropping
unbiasedness leads to a different estimator (Ben Taieb & Koo 2019), which is not what is
implemented here.

So the honest form of our claim is conditional, and until now the condition was assumed.

## Method

One-sample t-test of `mean(residual) = 0` per node, on the **held-out calibration block**
(the same block M2's split-conformal fix introduced, so the residuals are genuinely
out-of-sample), α = 0.05, n = 56 per node. No multiplicity correction, and the count is
reported raw: the quantity of interest is the direction and size of any bias, not a
family-wise decision.

## Result — the condition fails, in the direction theory predicts

| | |
|---|---|
| nodes tested | **41** |
| nodes rejecting unbiasedness | **22** |
| of those, with a **positive** mean residual (forecast sits BELOW actual) | **19** |
| precondition holds across all nodes | **False** |

The largest violations:

| node | n | mean resid | 95% CI | p |
|---|---|---|---|---|
| CAT::Beer | 56 | +25.36 | [+13.47, +37.25] | 7.69e-05 |
| **VENUE** | 56 | **+21.09** | [+0.27, +41.91] | 4.72e-02 |
| ITEM::Beer::OTHER | 56 | +17.04 | [+9.16, +24.91] | 6.22e-05 |
| ITEM::Beer::Lager - BH | 56 | +10.12 | [+6.38, +13.87] | 1.39e-06 |
| CAT::Soft Drinks | 56 | +5.98 | [+1.23, +10.74] | 1.47e-02 |
| ITEM::Uncategorised::OTHER | 56 | +4.52 | [+2.86, +6.18] | 1.21e-06 |
| ITEM::Food::Crisps | 56 | −2.57 | [−3.07, −2.07] | 1.54e-14 |
| CAT::Food | 56 | −2.16 | [−3.44, −0.88] | 1.37e-03 |

Full table in `hierarchy/reconciliation_forecast.md`.

## What it means, and why it is not a bug

The base forecaster is a **day-of-week median**. A median is median-eliciting, so on a
right-skewed node it sits below the mean, and a positive mean residual is the outcome
theory predicts rather than a surprise. 19 of the 22 violations are positive, which is
that prediction cashed out.

This connects the two halves of the review's measurement argument into one empirical chain,
each link verified at source this session:

1. Absolute-error measures optimise the **median** (`hewamalage_forecast_2023`).
2. Median-eliciting point forecasts are *"usually not"* coherent, and MASE is *"just a
   scaled MAE"* (`kolassa_we_2023`).
3. MinT/WLS_v optimality holds only for **unbiased** bases
   (`wickramasuriya_optimal_2019`).
4. **Our DOW-median bases are biased, measurably, on 22 of 41 nodes — including the venue
   total.**

So the reconciliation's optimality claim is conditional on a condition this estate
violates. That is a limitation, and it is a considerably more interesting one than silence.

## Control

Only the new section was added to `hierarchy/reconciliation_forecast.md`; the diff contains
no deletions and no changed values. Coherence still exact (0.00e+00 venue and category
discrepancy), coverage unchanged (L2 85.1% / L3 72.1% at 90%), intermittency adoption still
0 of 16.

## Consequence for the write-up

The methodology should state the condition, cite it to the paper's own sentence, report
that it was tested rather than assumed, and give the count. The Discussion gets the chain
above — it is one of the few places where this project's own data supplies empirical
support for a theoretical objection its literature review makes.
