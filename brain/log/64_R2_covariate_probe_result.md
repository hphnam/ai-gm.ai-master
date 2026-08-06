# R2 result — the Chronos-2 covariate probe, re-instrumented. W37 closed.

Run 2026-08-05. Closes weakness **W37** (Major, `[O]`) and conformance rows **R5 / R15 /
R27**. Also serves **R7** for this artefact.

## Provenance

| Field | Value |
|---|---|
| Command | `.venv-forecast/bin/python -m eval.chronos2_covariate_probe` |
| Venv | `.venv-forecast` — Python 3.12.13, chronos 2.3.1, torch 2.12.1, numpy 2.5.1 |
| Model | `amazon/chronos-2`, zero-shot |
| Store ceiling | 2026-07-07; venue beer_hall |
| Wall clock | **17 s** (23:24:51Z → 23:25:08Z) |
| Artefacts | `eval/chronos2_covariate_probe.md`, `.json` (new) |

## What was wrong

The committed artefact read, as its conclusion:

> "Outcome: covariates HELP: the covariate variant lowers mean rolling MASE
> (0.793 -> 0.779, delta -0.014)."

The table directly above that sentence was **three folds better and three folds worse**,
across six folds, at a fold-to-fold spread of roughly 0.20 — a paired sign test at p = 1.0.
A null was on record as a positive result, about the served model's covariate arm, and it
was being offered as refreshed evidence for the project's exogenous-null claim.

Three defects, all fixed:

1. **Bare mean difference as verdict.** No dispersion, no interval, no confidence set.
   This is W5 in a file W5 had not been applied to.
2. **Six folds.** At six folds `mcs.moving_block_indices` clamps the block to `n_obs`, so
   with `BLOCK_LEN = 7` every resample **is** the sample. Report 54 caught this exact
   degeneracy producing zero-width CIs and MCS p-values pinned to 0.0/1.0, and on that
   basis "shipping" a weather feature that scored 6.5% worse than its baseline.
3. **Wrong basis.** `calendar_lag7` was hard-coded, where the estate rules
   `calendar_lag7_active` for Beer Hall (`config.VENUE_SCALE_BASIS`). The same G2 fault
   found in `transfer/lovo.py` at G17o, in a second file.

## Method now

Per-fold loss **vectors** for both arms → `mcs.model_confidence_set` at 90% → paired
moving-block bootstrap on the difference. The bootstrap is lifted from
`eval/weather_basis.py::_paired_bootstrap` rather than rewritten, so the two instruments
cannot drift. Rolling origin over the whole active span at a full-horizon step. Seeds:
MCS 93, paired bootstrap 94 (distinct, so its resample is independent of the MCS);
block 7; B = 1000. A `dispersion_ok` guard fails loudly if folds ever fall to the block
length again.

## Result — the null is confirmed and the positive is retracted

| | six folds (committed) | **39 folds (this run)** |
|---|---|---|
| basis | `calendar_lag7` | **`calendar_lag7_active`** |
| univariate mean MASE | 0.793 | **0.607** |
| covariate mean MASE | 0.779 | **0.607** |
| delta | −0.014 | **−0.0002** |
| folds where covariate wins | 3 of 6 | **18 of 39** |
| fold-to-fold SD | not computed | uni 0.409, cov 0.403 |
| paired bootstrap 90% CI | not computed | **[−0.0102, +0.0108]** — contains zero |
| 90% MCS | not computed | **{covariate, univariate}** — both retained |
| verdict | "covariates HELP" | **not separable** |

## What it says

Widening the fold grid collapsed the difference by two orders of magnitude, from −0.014 to
−0.0002, and the covariate arm wins on 18 of 39 folds — as close to a coin flip as the
grid allows. The paired interval contains zero and the confidence set retains both arms.
**Known-future calendar covariates are not separable from the univariate arm on this
venue.**

That the −0.014 was noise is now demonstrated rather than argued: it was an artefact of the
fold count, and it pointed in the flattering direction.

Three independent lines now agree, which is what makes this a Discussion paragraph rather
than a footnote:

- this probe — calendar covariates not separable, 39 folds, MCS retains both;
- S6 weather basis — weather marginal, no serving optimism;
- `hertel_explainable_2026`, verified verbatim — load history 89%, temperature 3.55%,
  irradiance 2.74% attribution on Chronos-2, i.e. the covariates carry little;
- `haben_short_2019`, verified — temperature *"often detrimental"* at low aggregation.

## Consequence for the write-up

W37 is closed and the direction of the correction is publishable: the project caught its
own false positive by applying its own instrument. The exogenous-null claim survives and
is now properly evidenced. Any sentence quoting 0.793 → 0.779 or the word "help" must go.
