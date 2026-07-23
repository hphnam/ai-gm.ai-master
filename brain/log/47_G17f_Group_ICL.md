# Report 47 - S5 G17f: multi-venue group in-context learning

Date: 2026-07-23. Branch `brain-construction-local`, from tip `64e6fc4` (S8a). Run venv
`.venv-forecast` (Chronos-2 present), device CPU. Style: no em-dashes, plain prose, loud
failures, verify before asserting, pre-register before running.

## Headline

**Group in-context learning does not improve accuracy at any venue in a way the evidence can
distinguish, and where it moves the number at all it moves it the wrong way. No served model
changes.** Chronos-2 can forecast several venues together under cross-learning, and a grouped
forecast genuinely differs from the univariate one (so the capability is real, not a no-op),
but on this estate the grouped arms are indistinguishable from or worse than the univariate
baseline:

| venue | loss (basis) | U | G2 | G3 | 90% set | paired U vs group |
|---|---|---|---|---|---|---|
| Beer Hall | MASE (calendar_lag7_active), n=260 | **0.6091** | 0.6166 | 0.6185 | {U, G2, G3} | U lower, CI excludes 0 |
| Ellel | MAE (unscaled), n=260 | 110.85 | 110.53 | **110.21** | {G3, G2, U} | group lower, CI spans 0 |
| Two River Taps | MASE (calendar_lag7_active), n=203 | **0.6263** | n/a | 0.6406 | {U} | U lower, CI excludes 0 |

The pre-registered prediction was that group ICL would most plausibly help Ellel, the sparse
series with the most to gain from borrowing a rich one, and do nothing at Beer Hall. That is
directionally what happened at Ellel (G3 < G2 < U in MAE) but the improvement is not
significant; at Beer Hall and Two River Taps grouping is a small, significant loss. **No group
arm both enters the 90 percent set and has the lower mean at Beer Hall or Two River Taps, so
the pre-registered adoption rule yields no candidate and no stop condition fires.** This is the
publishable negative result the spec anticipated, reported at full prominence.

## Preconditions (verified, not assumed)

Tip `64e6fc4`. Store ceiling 2026-07-07 (`assert_store_ceiling`). Suites green at the S8a
counts before any change: `.venv` 503 passed / 8 skipped, `.venv-forecast` 510 passed / 1
skipped. Every count below was derived by calling the code's own function and the function is
named beside the number.

## Part 1 - the identifier change (Major 14) and the grouped path (Major 10)

The Chronos-2 series id was hardcoded to `"l1"` at three sites in `models/foundation.py`
(`chronos2_predict` context, `chronos2_exo_predict` context and future frames). All three now
take a `series_id` parameter defaulting to a single `DEFAULT_SERIES_ID = "l1"`; the default
keeps the single-series univariate path byte-identical, and on a single series the id is
cosmetic and does not enter the forecast. That last claim is what the G2 gate verifies on the
model, and a unit test pins it structurally (`test_univariate_frame_defaults_to_l1_and_is_
invariant_to_the_series_id`): a custom id changes only the label, never the timestamps or
targets.

The grouped path is a new, strictly separate module (`models/group_forecast.py`) so the
univariate baseline is untouched. It presents each venue as a labelled series in one call and
forecasts them together under Chronos-2's `cross_learning=True`. Two invariants are enforced,
not assumed, and both were verified against the model before any arm was scored:

- **Group equals Chronos batch.** Under cross-learning the pipeline zeroes the group ids of
  every series in a Chronos batch, so the cross-learning group IS the batch (read from the
  installed `chronos/chronos2/pipeline.py`). Pinning `batch_size` to the group size (venues per
  origin) and ordering the frame origin-major makes each origin its own isolated group. An
  oversized batch merges origins into one group; a probe on the real model measured that merge
  changing the forecast by up to GBP 44.8, which is exactly why `batch_size` is derived from
  the group size and never left at the pipeline default of 256.
- **Panel leakage guard (G1, below).**

## Part 2 - group composition, and the Two River Taps zeros (G6)

Three arms, all on plain Chronos-2 (no covariates, so the comparison isolates cross-series
learning and does not confound it with the weather/World-Cup exo path or its Ellel June gap):

| arm | composition | window | aligned origins |
|---|---|---|---|
| U | univariate, per venue | each venue's own frame | 273 / 260 / 205 (`venue_origins`) |
| G2 | beer_hall + ellel grouped | their common calendar | **260** (2025-10-11 to 2026-06-27) |
| G3 | + two_river_taps, closure zeros | same window as G2 | **260** forecast, TRT scorable on 203 |

The 260 aligned origins are the intersection of Beer Hall's and Ellel's origin dates
(`sorted(set(bh) & set(ellel))`), verified equal to the persisted per-fold vector lengths. Two
River Taps is forecast at all 260 grouped origins but scored only on the 203 whose horizon
falls inside its real active span (`_truth` returns None past the closure), so its own numbers
never rest on constructed values.

**G6, resolved as a stronger substitution, and flagged.** The spec's G6 asks that Two River
Taps' post-closure rows be confirmed *present and zero in the store* before G3 relies on them,
and to report the composition as padding or drop it if they are absent. Queried directly, the
`l1_daily` table holds **zero** Two River Taps rows after the 2026-05-08 closure (raw count 0),
and even within the active span the closed-day zeros are `fill_calendar` constructions, not
stored observations (280 raw rows over a 331-day span). So the literal G6 premise is false: the
rows are absent, not stored-zero. Rather than trust a stored zero that does not exist, the
stronger check verifies the property G3 actually needs, namely that zero is the *factually
correct* revenue for every post-closure day: `is_closed("two_river_taps")` is True, the last
active day is 2026-05-08 against a dataset max of 2026-07-07, and there are no recorded
transactions after closure. A venue confirmed shut has genuinely zero revenue, so the
constructed closure zeros are correct, not padding of an unknown value. G3 is therefore run and
its zeros are labelled throughout as constructed-and-correct, never as observed. `FLAG-TRT-
CONSTRUCTED-ZEROS` records this. It does not change the verdict: G3 is worse than U at Two
River Taps regardless.

## The device calibration (G3b): CPU, and report 24 generalised

Report 24 measured Chronos-2 at ~3.2s on MPS against ~0.6s on CPU, on a univariate
single-series call. S5 issues grouped and batched calls, a different compute shape, so that
verdict was re-measured, not inherited. Twenty origins, CPU against MPS, at origin-batch 1, 8,
32, on both the univariate (independent) arm and the grouped G2 arm:

| arm | device | batch 1 | batch 8 | batch 32 |
|---|---|---|---|---|
| U (independent) | CPU | 1.330s | 0.148s | **0.085s** |
| U | MPS | 0.881s | 1.211s | 0.316s |
| G2 (grouped) | CPU | 0.622s | 0.589s | 0.594s |
| G2 | MPS | 1.214s | 0.405s | **0.346s** |

Two findings, both mechanical and both as predicted. **Batching origins is a large win for the
independent arm** (CPU 1.330s to 0.085s, ~15x) because independent series pack into one forward
pass, and **flat for the grouped arm** (0.622s to 0.594s) because cross-learning forces one
forward pass per origin, so more origins per call amortise only Python overhead, not dispatch.
On the throughput regime (batch 32) **CPU still wins the univariate arm** (0.085 vs 0.316s,
~3.7x), so report 24 holds for the shape it measured; but **MPS wins the grouped arm** (0.346
vs 0.594s), by ~1.7x. The device verdict depends on the call shape, which is the sentence the
spec asked for. Because 1.7x is under the 2x switch threshold, and because a CPU run keeps the
univariate arm directly comparable to the committed ladder (the free G2 check below), **the
whole package runs on CPU**, device stamped on every artefact.

**Batched equals unbatched (G3b), proven on the model.** A batched forecast must equal the
unbatched one to within Chronos non-determinism, else batching is changing a number, not just
its cost. Measured maximum absolute difference, batch 8 and 32 against batch 1: the **grouped
arm is exact, 0.0 on both CPU and MPS** (the group boundaries are identical whether one origin
or thirty-two share the call); the independent arm differs by at most 0.00092, three orders
below the 0.010 Chronos-non-determinism tolerance. Batching changes the time, not the number.
The driver's batching invariance is also unit-tested against a fake pipeline
(`test_batched_equals_unbatched_for_the_*_arm`).

## Part 3 - the measurement

Per-fold loss vectors for each arm and venue, indexed by origin date, scored on the S4 bases:
Beer Hall and Two River Taps on MASE (`calendar_lag7_active`), Ellel on unscaled MAE and RMSE
only, because S4's bootstrap found no defensible seasonal-naive basis at 1.2 trading days a
week (G4). The Model Confidence Set (Hansen, Lunde, Nason 2011) is run per venue over that
venue's arms at 90 percent, moving-block bootstrap, block length 7, seed 93 (the report-44
machinery, reused). The paired difference of every arm-pair carries a moving-block bootstrap
90 percent interval, resampling folds jointly so the strong cross-arm correlation shrinks the
variance instead of being resampled away (B = 10000).

**Beer Hall (MASE active, n=260).** Means U 0.6091, G2 0.6166, G3 0.6185. The 90 percent set is
all three (U p=1.000, G2 and G3 p=0.129, just above the 0.10 line); at 75 percent it tightens
to {U} alone. The paired bootstrap is sharper than the multiplicity-corrected set and
separates them: U beats G2 by 0.0075 (90% CI [0.0009, 0.0153], excludes zero) and G3 by 0.0094
([0.0018, 0.0183], excludes zero); G2 and G3 are indistinguishable. So grouping does not help
Beer Hall's long own-history, and marginally but significantly hurts it. The set retains the
group arms only because the range statistic corrects for multiplicity; the pairwise test, which
does not, finds the small real edge for the univariate arm.

**Ellel (MAE unscaled, n=260).** Means G3 110.21, G2 110.53, U 110.85: grouping is
directionally best, in the pre-registered order (the sparse series gains most, and the fuller
group G3 more than the pair G2). But all three sit in the 90 percent set AND the 75 percent
set, and every paired interval spans zero (U-G3 mean +0.64, CI [-0.71, +1.93]). The predicted
gain is present in the point estimate and absent from the evidence. G3 meets the letter of the
general adoption-candidate criterion here (in the set with the lower mean), but this is not a
stop condition (the stop is scoped to Beer Hall and Two River Taps) and not a real effect: an
undistinguishable set with a CI spanning zero is precisely the outcome expected under no
effect, which is the case the adoption rule was written to exclude by demanding more than a
lower point estimate. The served Ellel model is `robust_dow`, not any Chronos variant, so this
comparison among Chronos arms does not bear on the served choice regardless.

**Two River Taps (MASE active, n=203).** Means U 0.6263, G3 0.6406. G3 is eliminated from the
90 percent set (p=0.035) and from the 75 percent set; the paired bootstrap has U beating G3 by
0.0144 (CI [0.0041, 0.0254], excludes zero). Adding a closed venue's real pre-closure history
to a group with Beer Hall and Ellel hurts Two River Taps' own forecast. G2 versus G3 is not
computed for Two River Taps because it is absent from G2 by construction.

**G2 - the univariate arm reproduces the committed ladder (free correctness check).** Scored on
the committed basis (`calendar_lag7`), the refactored univariate arm reproduces the committed
`rung4_chronos2` per-fold vectors to the digit: mean MASE 0.7342 / 0.6023 / 0.6709, identical
to the committed values, with a maximum per-fold absolute difference of **1.4e-6** across all
738 folds. Well inside the 0.010 Chronos-non-determinism tolerance; the identifier refactor did
not perturb the univariate path.

## Acceptance gates

| Gate | Verdict | Evidence |
|---|---|---|
| **G1** Panel leakage (load-bearing) | **PASS** | `assert_panel_leak_free` raises on a context row past the origin, for the target and for a non-target venue alike, and on a future window not strictly after the origin; `group_predict` runs it before forecasting. Five tests, each proving the guard fires on a planted leak. |
| **G2** Univariate arm reproduces the committed ladder | **PASS** | Mean MASE 0.7342 / 0.6023 / 0.6709 = committed to the digit; max per-fold delta 1.4e-6 over 738 folds; same device (CPU), same origins, same basis. Refactor is a pure relabel (unit test). |
| **G3** Aligned origin counts reported and match vector lengths | **PASS** | G2 and G3 = 260 (`len(sorted(set(bh) & set(ellel)))`), verified equal to persisted `origin_keys` lengths; Two River Taps scorable on 203. |
| **G3b** Device calibration + batched==unbatched | **PASS** | CPU/MPS at batch 1/8/32 tabled; CPU chosen (MPS grouped win 1.7x < 2x); grouped batched==unbatched exact (0.0), independent within 0.00092 << 0.010. Chosen device stamped on every artefact. |
| **G4** Ellel on unscaled error only | **PASS** | `VENUE_BASIS["ellel"] = "unscaled"`, `VENUE_LOSS["ellel"] = "mae"`; no MASE is computed or reported for Ellel; a unit test asserts Ellel gets no MASE while Beer Hall does. |
| **G5** Suites green, no served model changed, no frozen artefact modified, provenance stamped | **PASS** | See suites below; no served model changed (no adoption); no `sim/*` frozen artefact touched; every new artefact carries `store_ceiling` (2026-07-07) and `device` (cpu). |
| **G6** Two River Taps post-closure rows present and zero | **SUBSTITUTED (stronger), flagged** | Rows are absent, not stored-zero (raw count 0 after closure). Replaced with a closure-verification that the zeros are factually correct (`is_closed` True, no post-closure transactions); G3 run with the zeros labelled constructed, `FLAG-TRT-CONSTRUCTED-ZEROS`. Does not change the verdict. |

## Stop conditions - none fired

- **No group arm enters the 90 percent set with a lower mean at Beer Hall or Two River Taps.**
  At Beer Hall the group arms are in the 90 percent set but with the higher mean; at Two River
  Taps G3 has the higher mean and is outside the set. The served model should not change.
- **The univariate arm reproduced the committed ladder** (max delta 1.4e-6), so the refactor
  did not change behaviour.
- **Adoption rule (pre-registered, decision-log row 46).** A group arm is an adoption candidate
  only if it both enters the 90 percent set and has the lower mean; entering alone is not
  enough. No arm meets this at a stop-scoped venue. Ellel's G3 meets the letter but the effect
  is not distinguishable from zero and the served Ellel model is not a Chronos arm.
- Runtime 21.5s for the three-arm build plus 738-fold reproduction, far under the two-hour cap.

## Deviations

1. **G6 substituted, not met literally (stronger, flagged).** The store has no stored
   post-closure Two River Taps zeros; the closure is verified genuine instead, so the
   constructed zeros are factually correct. `FLAG-TRT-CONSTRUCTED-ZEROS`.
2. **Plain Chronos-2, no covariates, for all three arms.** The hypothesis is cross-series
   learning; running it on the exo path would confound it with the covariate set and inherit
   the Ellel June covariate gap (FLAG-ELLEL-JUNE-EXO). Grouping with covariates is a distinct
   question, named as future work (`FLAG-GROUP-EXO`), not run here.
3. **The G2 reproduction is a run artefact, not a suite test**, matching the repo convention
   that the real Chronos model never runs in CI (fake pipelines only). The refactor's
   frame-identity is unit-tested; the numeric reproduction is reported from the build (max
   delta 1.4e-6).

## Deliverables

`models/foundation.py` (the three-site `series_id` parameter); `models/group_forecast.py` (the
grouped path, leakage guard, batching); `eval/group_icl.py` (the three-arm run, MCS, paired
bootstrap, device calibration, committed reproduction); `eval/group_icl_L1.json`,
`eval/group_icl_mcs.json`, `eval/group_icl_calibration.json`, `eval/group_icl.md` (all stamped
with `store_ceiling` and `device`); `tests/test_group_icl.py` (15 tests, the G1 leakage gate
and the batching invariance among them); decision-log rows 46-48; `FLAG-TRT-CONSTRUCTED-ZEROS`
and `FLAG-GROUP-EXO`; the Model Confidence Set section moved into `chapters/methodology.tex`.

## Bottom line

Chronos-2's cross-series in-context learning is real and it is measurable, and on this
three-venue estate it does not pay. It marginally but significantly hurts the two venues scored
on MASE, and it helps the sparse Ellel only in the point estimate, not in any interval the data
supports. The univariate serving path stands unchanged at every venue. The apparatus that
proves this is leakage-guarded at the panel level, numerically identical under batching, and
reproduces the committed ladder to the sixth decimal, so the negative result is trustworthy
rather than an artefact of a boundary error that a cross-series model makes newly easy to hide.
