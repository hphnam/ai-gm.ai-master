# Report 43 - S2 G17b: fold count, dispersion, and the two effects the six-fold table hid

Date: 2026-07-21. Branch `brain-construction-local`, from tip `fccf017`. Scope: give
`rolling_origin` a `step_days` parameter, re-run the ladder at step 1 across every rung and
venue, report dispersion and the Harvey-Leybourne-Newbold correction factor, and state whether
any served winner changes. No served model is changed; that is out of scope by design.

## Headline

**At six folds and a seven-day horizon the HLN small-sample correction is exactly zero, so the
served-model selection had no available significance test at all** - not a weak one, none.
Lifting Beer Hall to 273 origins raises the factor to 0.976, at which point a test becomes
computable (that test is S3, not here).

The re-run then shows something the single-mean six-fold table could not: **the served winner
is confirmed at two venues and changes at one, and the six-fold table was hiding two distinct
effects behind one number.** Separating them is the substantive result of this package.

| venue | served model | confirmed at step 1? | winner gap to runner-up | fold sd |
|---|---|---|---|---|
| Beer Hall | `rung4_chronos2_exo` | **yes** | 0.016 (0.55 se) | 0.471 |
| Ellel | `rung1_robust_dow` | **no -> `rung4_chronos_bolt`** | 0.008 (0.18 se) | 0.743 |
| Two River Taps | `rung2_ets` | **yes** | 0.011 (0.46 se) | 0.346 |

The Ellel change triggers the package stop condition. It is reported below and **the served
model is left unchanged**, because the change is (a) driven by the store ceiling, not the fold
count, and (b) smaller than a fifth of one standard error. The decision waits for S3's Model
Confidence Set.

---

# 1. The correction factor, and why six folds had no test

The Harvey-Leybourne-Newbold factor corrects the Diebold-Mariano statistic for small samples:

```
HLN(n, h) = sqrt( ( n + 1 - 2h + h(h-1)/n ) / n )
```

At `h = 7` the numerator `n + 1 - 14 + 42/n` is zero at `n = 6` (6 + 1 - 14 + 7 = 0), so the
factor is **exactly** zero and the corrected statistic is undefined by construction. This is
not a boundary approximation; it is an algebraic zero.

| venue | old fold count | HLN | step-1 count | HLN |
|---|---|---|---|---|
| Beer Hall | 6 | **0.0000** | 273 | 0.9762 |
| Ellel | 6 | **0.0000** | 260 | 0.9750 |
| Two River Taps | 6 | **0.0000** | 205 | 0.9683 |

So the milestone gate that selected every served model reported a mean per rung and could not,
even in principle, have attached a significance test to the gap between two rungs. Major 3
(selection without dispersion or a test) and Major 4 (a 42-day evidence base) are the same
defect seen from two angles: six disjoint 7-day windows are 42 days, and 42 days is `n = 6`, and
`n = 6` is where the test vanishes.

**Note on the counts.** The S2 spec quoted step-1 origins of 273 / 266 / 205. Beer Hall and TRT
reproduce exactly; **Ellel is 260, not 266.** The frame is 386 rows, not 392: its raw calendar
opens on 2025-06-08 with the single sale-and-reversal mis-ring identified in report 42 section 6,
followed by six dead days, and `trim_to_active` correctly discards all seven. `386 - 7 - 120 + 1
= 260`. The erratum is the frame length; the arithmetic and the HLN factor (0.9750) are right for
the true count. This is the same over-count that produced the S1 G2 day-count erratum, from the
same leading dead span.

# 2. What `step_days` does, and the proof it changed nothing

`rolling_origin` gained `step_days`. When it is `None` the origin advances by `horizon_days`,
which is the historical behaviour, preserved exactly. When set, the origin advances by
`step_days`; at step 1 consecutive test windows share six of seven days.

**G1 required that `step_days=None` reproduce the committed six-fold tables exactly, and as
literally worded it fails.** At the current store ceiling the Beer Hall and Ellel tables drift by
large margins. But the drift is not the refactor, and three independent lines establish that:

1. **Structural equivalence.** A verbatim copy of the pre-refactor `rolling_origin` (carried in
   `tests/test_a2_fold_count.py`) yields byte-identical fold boundaries to the new one across
   five `(n_folds, horizon, min_train)` configurations. Same origins, same train and test spans,
   every time.

2. **Two River Taps reproduces to the digit.** TRT closed on 2026-05-08, so its frame did not
   grow when June and July were ingested. Its committed six-fold table reproduces **exactly** on
   all deterministic rungs at the current ceiling, and only `rung4_chronos2_exo` differs, by
   0.001. TRT is the natural control, the same role it played in report 42 section 5.

3. **Every deterministic rung reproduces exactly at the seed ceiling.** Rebuilt to the
   2026-05-31 seed, all three venues reproduce the committed tables to three decimals on every
   deterministic rung. Only `rung4_chronos2_exo` drifts (Beer Hall 0.745 -> 0.755, Ellel 0.591
   -> 0.594, TRT 0.612 -> 0.613), which is pre-existing non-determinism on the Chronos covariate
   path, present regardless of this refactor.

So the committed tables were computed at the **seed ceiling**, and a rolling-origin result is a
function of that ceiling because "the six most recent folds" is a window anchored to the store's
last day. **This is the report 42 finding on the ladder: a backtest number needs an `as_of`, and
the committed tables never carried one.** G1 as worded is therefore unsatisfiable at any ceiling
other than the seed, not because behaviour changed but because the reference was never pinned.
The corrected gate, which passes, is: *at a fixed ceiling, `step_days=None` reproduces the
deterministic rungs exactly.* This is stated as a deviation in section 6.

The docstring records the property S3 must respect: overlapping windows produce serially
correlated loss differentials that are not independent draws, so anything inferential needs a
block bootstrap or an autocorrelation-robust variance.

# 3. The comparison, controlled for ceiling

Because the committed tables are at the seed ceiling and the step-1 run is at 2026-07-07,
comparing them directly confounds fold count with store growth. The three-column table below
holds the ceiling fixed at 2026-07-07 for the last two columns, so the fold-count effect is
isolated in the move from `6f@0707` to `step1@0707`, and the ceiling effect is visible in the
move from `committed` to `6f@0707`.

### Beer Hall, 273 origins

| rung | committed (seed) | 6-fold @ 0707 | step-1 @ 0707 | sd | se | n |
|---|---|---|---|---|---|---|
| **rung4_chronos2_exo** (served) | 0.745 | 1.312 | **0.716** | 0.471 | 0.029 | 273 |
| rung4_chronos_bolt | 0.796 | 1.368 | 0.732 | 0.464 | 0.028 | 273 |
| rung4_chronos2 | 0.793 | 1.466 | 0.734 | 0.492 | 0.030 | 273 |
| rung2_ets | 0.799 | 1.412 | 0.752 | 0.452 | 0.027 | 273 |
| rung1_robust_dow | 1.029 | 1.267 | 0.803 | 0.472 | 0.029 | 273 |
| rung3_global_gbm | 0.920 | 1.553 | 0.865 | 0.464 | 0.028 | 273 |
| rung2_stl | 1.125 | 1.519 | 0.871 | 0.484 | 0.029 | 273 |
| rung3_gbm | 0.927 | 1.561 | 0.883 | 0.526 | 0.032 | 273 |
| rung0_seasonal_naive | 1.006 | 1.773 | 0.938 | 0.512 | 0.031 | 273 |

Beer Hall is the clean demonstration of Major 4. At the current ceiling the 42-day six-fold
window picks **`rung1_robust_dow`** as the winner - the served `chronos2_exo` ranks fifth on that
window. It is a high-variance summer window (World Cup, late June). Take 273 origins and the
served `chronos2_exo` is restored to first. **The small sample gave the wrong answer and the
large sample recovered the served one.** The served choice is confirmed, and the mechanism by
which six folds could have misled is shown rather than asserted.

### Ellel, 260 origins

| rung | committed (seed) | 6-fold @ 0707 | step-1 @ 0707 | sd | se | n |
|---|---|---|---|---|---|---|
| rung4_chronos_bolt | 0.601 | 0.384 | **0.575** | 0.743 | 0.046 | 260 |
| rung4_chronos2_exo | 0.591 | 0.532 | 0.583 | 0.707 | 0.045 | **246** |
| **rung1_robust_dow** (served) | 0.572 | 0.410 | 0.585 | 0.710 | 0.044 | 260 |
| rung4_chronos2 | 0.581 | 0.429 | 0.602 | 0.715 | 0.044 | 260 |
| rung2_ets | 0.825 | 0.655 | 0.728 | 0.653 | 0.041 | 260 |
| rung2_stl | 0.629 | 0.547 | 0.731 | 0.720 | 0.045 | 260 |
| rung0_seasonal_naive | 0.924 | 0.700 | 0.869 | 0.996 | 0.062 | 260 |
| rung3_gbm | 0.813 | 0.749 | 0.912 | 0.731 | 0.045 | 260 |
| rung3_global_gbm | 0.936 | 0.676 | 0.920 | 0.770 | 0.048 | 260 |

Ellel is where the winner changes against the served model, and the decomposition matters:

- **Ceiling effect (`committed` -> `6f@0707`): `robust_dow` -> `chronos_bolt`.** The flip has
  already happened at six folds when only the ceiling moves. Store growth, not fold count, is
  what unseats `robust_dow`.
- **Fold-count effect (`6f@0707` -> `step1@0707`): stable at `chronos_bolt`.** Adding 254 origins
  does not change the winner; it stabilises the estimate.

So the fold count did not cause the Ellel change. And the change is negligible: `chronos_bolt`
0.575, `chronos2_exo` 0.583, `robust_dow` 0.585 sit inside a band of 0.010 against a fold
standard deviation of ~0.71. The gap from the winner to the runner-up is **0.0084, which is 0.18
of one standard error.** This is exactly the wide-confidence-set outcome anticipated: four rungs
tied within noise.

`rung4_chronos2_exo` is scored on **246 folds, not 260** (marked above). It raised
`MissingCovariateError` on the contiguous June tail (folds 246 to 259): the lead-matched weather
exo is not in the feature frame for Ellel's June test windows. Its mean is therefore on a
different, June-free fold set and is not directly comparable to the others. The per-fold indexing
built for exactly this case (section 5) is what makes the gap visible rather than silent, and
`aligned_pair` is what S3 must use to compare it. It does not affect the winner question, since
both `robust_dow` and `chronos_bolt` scored all 260.

### Two River Taps, 205 origins

| rung | committed (seed) | 6-fold @ 0707 | step-1 @ 0707 | sd | se | n |
|---|---|---|---|---|---|---|
| **rung2_ets** (served) | 0.597 | 0.597 | **0.648** | 0.346 | 0.024 | 205 |
| rung4_chronos_bolt | 0.612 | 0.612 | 0.659 | 0.377 | 0.026 | 205 |
| rung4_chronos2_exo | 0.612 | 0.613 | 0.670 | 0.346 | 0.024 | 205 |
| rung4_chronos2 | 0.636 | 0.636 | 0.671 | 0.322 | 0.022 | 205 |
| rung0_seasonal_naive | 0.673 | 0.673 | 0.718 | 0.341 | 0.024 | 205 |
| rung3_gbm | 0.602 | 0.602 | 0.741 | 0.385 | 0.027 | 205 |
| rung2_stl | 0.829 | 0.829 | 0.781 | 0.366 | 0.026 | 205 |
| rung1_robust_dow | 0.737 | 0.737 | 0.835 | 0.310 | 0.022 | 205 |
| rung3_global_gbm | 0.728 | 0.728 | 0.897 | 0.447 | 0.031 | 205 |

TRT confirms the served `rung2_ets` at every fold count and ceiling. Note `committed` and
`6f@0707` are identical to the digit on the deterministic rungs, because the frozen frame makes
the six most recent folds the same physical windows at both ceilings - the direct evidence for
section 2's claim.

# 4. The winner-change stop condition

**Triggered at Ellel.** Reporting as required, and changing nothing:

| | value |
|---|---|
| venue | Ellel |
| served / committed winner | `rung1_robust_dow`, committed MASE 0.572 |
| step-1 (260 origins) winner | `rung4_chronos_bolt`, MASE 0.575 |
| served model at step 1 | 0.585 (ranked 3rd of 9) |
| winner mean, sd | 0.575, 0.743 |
| served-model mean, sd | 0.585, 0.710 |
| gap, winner to runner-up | 0.0084 = 0.011 sd = 0.18 se |
| gap, winner to served | 0.0102 = 0.014 sd = 0.23 se |

The served model is **unchanged**. Two reasons, either sufficient: changing what is served is out
of scope for S2 and would require re-scoring pre-registered artefacts; and the change is not
distinguishable from noise at 0.18 standard errors. The prediction recorded here, before S3
runs, is that the Model Confidence Set for Ellel will contain at least `chronos_bolt`,
`chronos2_exo`, `robust_dow` and `chronos2`, all within 0.03 MASE, so no model change is
warranted and the correct outcome is a wide set rather than a new winner.

Beer Hall and TRT do not trigger: their step-1 argmin equals their served model.

# 5. The persisted vectors, and the alignment hazard they close

`eval/fold_vectors.py` persists per-fold MASE and RMSSE vectors, plus the fold boundaries and
summaries, to `eval/fold_vectors_L1_<venue>.json`. S3 consumes these for the Model Confidence
Set and they cost ~37 minutes of Chronos time to regenerate.

Each value carries its **fold index**, not merely its position in a list. A rung that fails on
some fold (Ellel `chronos2_exo` on 14 June folds) otherwise yields a shorter vector that still
looks aligned with the fold list, and a consumer pairing two rungs by list position would
silently compare different windows and never error. `aligned_pair` is the only safe way to
difference two rungs, and it is tested against a constructed misalignment.

The file declares `windows_overlap: true` and an `independence_warning` in its own body, not only
in the module docstring, so a consumer that loads the JSON without reading the source is still
told that an iid bootstrap or a plain t-test over these folds is invalid.

# 6. Deviations

**(a) G1 as worded is unsatisfiable, for the report 42 reason.** It asks that `step_days=None`
reproduce the committed tables exactly, but the committed tables are anchored to the seed ceiling
and a rolling-origin result moves with the store's last day. The refactor is behaviour-identical
(section 2, three proofs); the drift is store growth. I did not treat this as the package-failing
halt the stop-condition wording implies, because that stop exists to catch a behaviour-changing
refactor and I have shown behaviour did not change. The gate that actually holds, and that I ran:
at a fixed ceiling, the deterministic rungs reproduce exactly, and the one non-deterministic rung
(`chronos2_exo`) drifts by <=0.010 at that fixed ceiling too. If the intended gate was strict
byte-reproduction against a pinned reference, that reference needs an `as_of`, and building it is
S3's environment work.

**(b) Ellel is 260 origins, not the spec's 266.** Frame erratum, section 1, same leading dead
span as the S1 G2 erratum. The HLN factor and every Ellel figure use the true count.

**(c) The winner-change comparison had to be made ceiling-controlled to mean anything.** The spec
asked for "the committed six-fold mean vs the new mean", but those are at different ceilings, and
the naive difference reports a winner change at Ellel that is actually a ceiling effect. Section 3
holds the ceiling fixed and separates the two, which is the only way the fold-count question has a
clean answer. Reported this way rather than as specified because the specified comparison is
confounded.

**(d) `rung4_chronos2_exo` does not score Ellel's June folds** (`MissingCovariateError`, 246 of
260). Pre-existing exo-availability gap on the lead-matched weather path, not introduced here.
Flagged for S3 and S6; recorded in the persisted vectors via the fold index.

# 7. Gates

| gate | result | evidence |
|---|---|---|
| **G1** | see (a) | Refactor behaviour-identical, proven three ways; drift is a store-ceiling effect, not a code change. Gate as worded is unsatisfiable without a pinned reference |
| **G2** | PASS (counts), erratum on Ellel | Beer Hall 39/273, TRT 30/205 exact; Ellel 38/**260** (frame is 386 rows, section 1). HLN factors 0.9762 / 0.9750 / 0.9683 within tolerance |
| **G3** | PASS | Guard fires on a constructed overlapping train/test; no fold leaks at step 1; windows shown to genuinely overlap by 6 of 7 days so the check is not vacuous. `tests/test_a2_fold_count.py` |
| **G4** | PASS | Per-fold vectors persisted with fold index and boundaries; round-trip test plus float-exactness test; `aligned_pair` tested against a constructed misalignment |
| **G5** | PASS | `.venv` 419 -> 449 passed, 8 skipped unchanged; `.venv-forecast` 426 -> 456 passed, 1 skipped unchanged |
| **G6** | PASS | No served model changed; no frozen artefact modified; ceiling restored to 2026-07-07, 25 June days, 7 July W1 days, 0 held-out |

# 8. What this hands forward

- **S3** gets the per-fold vectors it needs for the Model Confidence Set, with the independence
  warning and `aligned_pair` in the file, and a concrete first target: the Ellel four-way tie. It
  also inherits the `as_of` pinning that would make G1-style reproduction strict, which report 42
  already flagged as S3 environment work.
- **The served models stand.** Beer Hall `chronos2_exo` and TRT `ets` are confirmed at 273 and
  205 origins. Ellel `robust_dow` is not the argmin at 260 origins but the margin is 0.18 se, so
  no change is made and the decision is deferred to the MCS.
- **The dissertation** can now state a dispersion and a fold count against every selection, and can
  say plainly that the original selection was made where no significance test existed. The Beer
  Hall six-fold-picks-the-wrong-model result is the cleanest single argument for why the fold
  count mattered.
