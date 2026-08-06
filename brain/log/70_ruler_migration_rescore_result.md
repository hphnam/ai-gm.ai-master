# 70 — Ruler migration: fold-vector regeneration, MCS re-run, `tab:ladder` re-score

Closes the computational half of gate A (decision row 87). `config.VENUE_SCALE_BASIS` is now
the single authority; `harness.REPORTED_BASIS` is a fallback only.

Runtime: `.venv-forecast` (Py 3.12.13, numpy 2.5.1, pandas 3.0.3). Deterministic inputs —
`SEED=93`, `PAIRED_BOOTSTRAP_SEED=94`, `BLOCK_LEN=7`, `N_BOOT=1000`. Store ceiling asserted by
`warehouse.assert_store_ceiling()` and carried in each artefact.

## 1 · What was regenerated

`eval/fold_vectors_L1_{beer_hall,ellel,two_river_taps}.json`, 2511s of Chronos across the three
venues. Fold counts unchanged (273 / 260 / 205), so the windows are the same windows; only the
ruler moved.

| venue | basis before | basis after | loss after |
|---|---|---|---|
| beer_hall | `calendar_lag7` | `calendar_lag7_active` | MASE |
| two_river_taps | `calendar_lag7` | `calendar_lag7_active` | MASE |
| ellel | `calendar_lag7` | **`unscaled`** | **MAE (GBP)** |

The `basis` field in the artefact was previously a hard-coded literal while the values were
already scored on the ruled basis (`evaluate_rolling` migrated at G2). Ellel's committed vectors
therefore carried a `calendar_lag7` label on values that were not on that ruler. That label is
now derived, and `loss` / `secondary_loss` are written alongside it so a consumer cannot pair a
MASE reader against an MAE vector.

## 2 · Movement, and the check that it is a denominator swap

At the two scaled venues the ratio new/old is uniform across all nine rungs — beer_hall
0.8179–0.8190, two_river_taps 0.9297–0.9355. A rung-independent ratio is the signature of a
changed denominator rather than changed predictions, which is the expected and wanted result.

It is **not** exactly the pinned-`as_of` ratios of report 69 (1.2417 and 1.1361), and should not
be: `fold_vectors` scales per fold on that fold's own training slice (ex-ante), whereas report 69
measured a single pinned ruler. Mean-of-ratios and ratio-of-means differ.

At Ellel the ratio is **not** uniform (183.15–189.99), because the old scaled values were a
per-fold rescale of a quantity whose denominator varies fold to fold. This is why the change is
structural there and not cosmetic: it reorders the ladder.

## 3 · Ranking changes

- **beer_hall** — ranking identical at all nine positions.
- **two_river_taps** — positions 3 and 4 swap (`rung4_chronos2_exo` ↔ `rung4_chronos2`); means
  0.6260 against 0.6261, a separation of 1e-4 against a standard error of ~0.023. This is a tie,
  not a reordering with content, and must not be reported as one.
- **ellel** — positions 2 and 3 swap: `rung1_robust_dow` (107.59) now beats `rung4_chronos2_exo`
  (110.78). Standard errors 7.56 and 7.68, so this too is well inside noise.

No ranking change at any venue survives its own standard error. The honest statement is that the
ruler change moves the *level* at Ellel and leaves the *ordering* undetermined among the leaders.

## 4 · Model Confidence Set — re-run, and the one substantive change

`eval/mcs_L1_results.json` regenerated from the new vectors. Deterministic; reads no store.

- **beer_hall** — every set identical at both α and both metrics.
- **two_river_taps** — sets reordered, membership unchanged.
- **ellel** — **membership changed**: `rung0_seasonal_naive` is **eliminated** from the 90% MCS
  under both the primary MASE and the secondary RMSSE criterion.

| venue · criterion | α | before | after |
|---|---|---|---|
| ellel · MASE | 0.10 | 5 rungs, incl. `rung0_seasonal_naive` | **4 rungs, naive excluded** |
| ellel · RMSSE | 0.10 | 7 rungs, incl. `rung0_seasonal_naive` | **6 rungs, naive excluded** |

This strengthens the ladder argument rather than weakening it. On the discredited ruler the
seasonal-naive baseline could not be separated from the learned rungs at Ellel; on the ruled
basis it can. Ellel's α=0.25 MASE set is unchanged.

## 5 · `tab:ladder` — the re-scored cells

Mean, standard deviation and standard error over folds. Ellel's column is **MAE in GBP**; the
other two are MASE. The table now carries two units and cannot be read down a single column.

### beer_hall — `calendar_lag7_active`, MASE, n=273

| rung | mean | sd | se |
|---|---|---|---|
| rung4_chronos2_exo | 0.5862 | 0.3792 | 0.0230 |
| rung4_chronos_bolt | 0.5991 | 0.3733 | 0.0226 |
| rung4_chronos2 | 0.6005 | 0.3960 | 0.0240 |
| rung2_ets | 0.6159 | 0.3642 | 0.0220 |
| rung1_robust_dow | 0.6578 | 0.3813 | 0.0231 |
| rung3_global_gbm | 0.7081 | 0.3727 | 0.0226 |
| rung2_stl | 0.7130 | 0.3888 | 0.0235 |
| rung3_gbm | 0.7230 | 0.4237 | 0.0256 |
| rung0_seasonal_naive | 0.7678 | 0.4117 | 0.0249 |

### two_river_taps — `calendar_lag7_active`, MASE, n=205

| rung | mean | sd | se |
|---|---|---|---|
| rung2_ets | 0.6051 | 0.3306 | 0.0231 |
| rung4_chronos_bolt | 0.6150 | 0.3603 | 0.0252 |
| rung4_chronos2 | 0.6260 | 0.3112 | 0.0217 |
| rung4_chronos2_exo | 0.6261 | 0.3340 | 0.0233 |
| rung0_seasonal_naive | 0.6684 | 0.3219 | 0.0225 |
| rung3_gbm | 0.6931 | 0.3691 | 0.0258 |
| rung2_stl | 0.7285 | 0.3464 | 0.0242 |
| rung1_robust_dow | 0.7805 | 0.3066 | 0.0214 |
| rung3_global_gbm | 0.8338 | 0.4172 | 0.0291 |

### ellel — `unscaled`, **MAE in GBP**, n=260

| rung | mean | sd | se |
|---|---|---|---|
| rung4_chronos_bolt | 106.04 | 129.75 | 8.05 |
| rung1_robust_dow | 107.59 | 121.86 | 7.56 |
| rung4_chronos2_exo | 110.78 | 123.79 | 7.68 |
| rung4_chronos2 | 110.85 | 123.12 | 7.64 |
| rung2_ets | 133.88 | 109.74 | 6.81 |
| rung2_stl | 135.29 | 123.35 | 7.65 |
| rung0_seasonal_naive | 159.11 | 172.48 | 10.70 |
| rung3_gbm | 168.49 | 122.40 | 7.59 |
| rung3_global_gbm | 169.13 | 129.38 | 8.02 |

Ellel's standard deviations exceed its means at every rung. The MAE distribution over folds is
right-skewed and zero-inflated — consistent with the occurrence structure that motivated the
hurdle (report 67) — so the mean is a poor summary there and an interval around it is not
symmetric. A chart carrying the fold distribution is the defensible presentation; a bare mean
column is not.

## 6 · Guard test corrected

`tests/test_a2_fold_count.py::test_persisted_artefact_declares_its_overlap_and_scale_policy`
asserted `p["basis"] == "calendar_lag7"` — the same literal that let the mislabelling stand. It
now pairs on `config.VENUE_SCALE_BASIS` and additionally asserts the `loss` field. 49 tests pass.

## 7 · What is superseded by this file

- Any `tab:ladder` figure on `calendar_lag7`, including the D-F4 block of
  `ledger/transcription_pack.md` as first written.
- Ellel's pre-G2 scaled per-fold values (~0.118 family). Already on the forbidden-to-quote list;
  this file replaces them with the currency figures above.
- Report 44's Ellel MCS membership at α=0.10.

## 8 · Not done here

The Overleaf push of the re-scored `tab:ladder` is **not** made. It needs a human gate, and it is
entangled with gate 4 (table or chart) because the table now mixes MASE and GBP in one float.
