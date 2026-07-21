# Report 44 - S3 G17c: the Model Confidence Set, environment pinning, and store durability

Date: 2026-07-21. Branch `brain-construction-local`, from tip `34a1779`. Scope: run the
significance test S2 made computable, and close the two reproducibility holes that would
otherwise make its answer unrepeatable - unpinned dependencies, and a store ceiling that lives
outside the build and is silently reset by the test suite. The work was done in the spec's order,
protective items first, so a silent store reset could not invalidate the expensive run at the end.

## Headline

**The significance test that was uncomputable at six folds now runs, and it puts every served
model inside its own 90% Model Confidence Set.** At six folds the Harvey-Leybourne-Newbold
correction was algebraically zero, so selection had no available test (report 43). On 273/260/205
overlapping origins the Model Confidence Set of Hansen, Lunde and Nason (2011) is computable, and
the pre-registered prediction (decision log row 33) holds at all three venues:

| venue | served model | in its 90% set? | 90% set size (of 9 rungs) | MCS p-value of served |
|---|---|---|---|---|
| Beer Hall | `rung4_chronos2_exo` | **yes** | 5 | 1.000 |
| Two River Taps | `rung2_ets` | **yes** | 4 | 1.000 |
| Ellel | `rung1_robust_dow` | **yes** | 5 (246-fold) / 3 (260-fold) | 0.575 |

**No served model changes.** The pre-registered Ellel rule (row 32) resolves cleanly: the set
contains `rung1_robust_dow`, so it stays served, and the S2 six-fold argmin flip to
`rung4_chronos_bolt` (gap 0.008 = 0.18 se) is confirmed as noise - both models are inside the set
and statistically indistinguishable. The wide sets are the honest result: the data separates the
clearly-worse rungs but cannot separate the foundation models from the served incumbent, exactly
what Hansen, Lunde and Nason say uninformative data should yield.

Alongside the test, `FLAG-STORE-DURABILITY` is closed and the forecast environment is pinned to
the resolution under which the committed six-fold tables reproduce to the digit.

---

## Part 1 - Store durability (FLAG-STORE-DURABILITY, resolved)

The store ceiling is state that sits outside the build. `warehouse.build()` rebuilds from a seed
CSV ending 2026-05-31, and only `sim/restore_clock.py` advances the clock to the operational
ceiling 2026-07-07. Two test modules call `build()` in an autouse fixture, so any run collecting
them reset a developer's working store five weeks into the past, silently. The fix is three layers.

**1a. A loud guard.** `warehouse.assert_store_ceiling(expected=config.EXPECTED_STORE_CEILING)`
raises `StoreCeilingError` naming the fix command, and is called at the head of every entrypoint
that produces a reported number: `ladder.main`, `harness.main`, `fold_vectors.build`, and the
July and June confront mains. The message is exactly:

```
StoreCeilingError: store ceiling is 2026-05-31, expected 2026-07-07.
Run: python -m sim.restore_clock
```

The MCS runner is the one exception, and deliberately: it reads persisted per-fold vectors, not
the store, so its guard is on the *provenance* of what it consumes - it asserts the vectors were
built at the pinned ceiling (`eval/mcs.py::_assert_vector_provenance`), which is the correct
coupling because a rolling-origin loss is a function of the store ceiling even when the process
reading it never touches the store.

**1b. One build entrypoint.** `python -m store.build` runs normalise -> warehouse -> restore_clock
-> assert, and short-circuits to a single ceiling read when the store is already warm. It is the
one command that gets the three-step sequence right.

**1c. Suite isolation.** `current_db_path()` now honours a `BRAIN_DUCKDB_PATH` override at call
time, and `tests/conftest.py` points it at a throwaway database. The isolated store is seeded by
copying the working store's file (a read, never a write) so the auxiliary tables `build()` does
not create - weather, events, stock, watermark - are present for the tests that read them, then
`line_items` is rebuilt to the seed ceiling the suite has always run at. The two autouse `build()`
fixtures therefore rebuild the *throwaway* store and the developer's working store is untouched.
The handful of tests that deliberately assert the configured default path opt back out with
`monkeypatch.delenv` (`test_scratch_store.py`, one path assertion in `test_compute_engine.py`).

**Proven, not asserted (G1).** `test_store_durability.py` records the working store's mtime, runs
a build-touching operation, and asserts the mtime is unchanged. Verified end to end: a full suite
run under both venvs leaves the working store at 2026-07-07, measured before and after.

**1d. Provenance everywhere.** Every result JSON and every fold-vector file now carries a
`store_ceiling` field - the S1 `as_of` lesson one level up: an artefact without its ceiling is not
reproducible. The three committed `fold_vectors_L1_*.json` were stamped with their build ceiling
(2026-07-07, verifiable from their own test windows); this is metadata, not a recomputation.

## Part 2 - Environment pinning

**The served-model selection is version-dependent, and that is the argument for pinning.** An
independent rerun on statsmodels 0.14.6 with scikit-learn 1.8.0 produced Two River Taps ETS 0.617
and GBM 0.601, against the committed 0.597 and 0.602 - which flips the served model from ETS to
GBM. This environment reproduces the committed table to the digit; both facts are true, and
together they are the evidence that a bare `>=` is unsafe for a result anyone must reproduce.

**2c. The versions under which the committed six-fold tables reproduce** (verified this run,
`two_river_taps` at the current ceiling; Two River Taps is closed since 2026-05-08 so its frame is
frozen and reproduces at any ceiling): rung0 0.673, rung2_ets **0.597**, rung3_gbm **0.602**,
rung2_stl 0.829, rung1_robust_dow 0.737 - all exact. The resolution:

| package | version |
|---|---|
| numpy | 2.5.1 |
| pandas | 3.0.3 |
| scikit-learn | 1.9.0 |
| statsmodels | 0.14.6 |
| scipy | 1.18.0 |
| torch | 2.12.1 |
| chronos-forecasting | 2.3.1 |
| transformers | 5.13.0 |

**2a. Lockfile.** `requirements-forecast.lock.txt` pins the entire forecast-venv resolution (66
packages) to `==`. The shared `requirements.txt` keeps bounds, not `==`, on purpose - three venvs
resolve it differently and `.venv-eval` pins `numpy<2.0` (TSB-AD) and `scipy<1.16` (statsforecast),
so `==` there is unresolvable. A per-venv lockfile is what the file's own header already recommends
as the durable answer, so the lockfile is the mechanism and the bounds stay. `requirements-forecast.txt`
additionally pins `torch==2.12.1` exactly.

**2b. Chronos revision SHAs.** A model id alone lets the weights move under a re-tag. The exact HF
commit revisions of the repos that produced the committed Rung-4 results are now pinned in
`models/foundation.py` and passed to every `from_pretrained`:

- `amazon/chronos-2` -> `29ec3766d36d6f73f0696f85560a422f50e8498c`
- `amazon/chronos-bolt-small` -> `772f3d25d38aec6d914c8949dab4462e2d46f5d8`

Verified they load from cache with `HF_HUB_OFFLINE=1` (no network), and the runtime-info line now
reports the pinned revision. The resource-guard fallback model is left unpinned deliberately: it is
a degraded substitute, never a serving path.

## Part 3 - The Ellel June covariate gap (FLAG-ELLEL-JUNE-EXO)

`rung4_chronos2_exo` scores only 246 of Ellel's 260 folds, failing on the contiguous block 246 to
259 (test windows 2026-06-15 to 2026-07-04) with `MissingCovariateError`. The carry from S2 (row
32) was to establish whether this is an upstream data gap or a covariate-join defect, because a
join defect would contaminate S6's entire weather ablation.

**Verdict: a venue-specific upstream data gap, not a join defect.** Queried directly, the
`exog_weather_*` tables for the Ellel grid cell have exactly one internal hole - **2026-06-21 to
2026-06-29, nine days** - in all three bases (hindcast, leadmatched, observed). Every one of those
nine dates *is present for the Beer Hall cell*, which is fetched in the same ingest pass and has no
gaps at all. The feature join (`_attach_exog`) attaches the weather rows that exist and correctly
leaves NaN where the Ellel cell has none; Beer Hall, through the identical join, gets all nine
days. So the join logic is sound and **S6's weather ablation is not contaminated by a join bug**.
The entrant never imputes (`_require_covariates` raises), which is why the failure is loud and
traceable rather than a quiet wrong number. Not fixed here, per spec: closing the hole is a
fetch-layer change that belongs with S6.

## Part 4 - The Model Confidence Set

### 4a. Pre-registration (decision log row 33)

Every choice was written to the decision log before the set was computed: primary loss per-fold
MASE (the loss the committed gate used) with RMSSE secondary; the range statistic **T_R** with the
matched elimination rule **e_R**; a **moving block** bootstrap (consecutive origins share six of
seven days, so an iid resample is invalid), block length **l = 7** primary with sensitivity at
{2, 7, 14, 21}; **B = 1000** primary, repeated at 5000; levels **alpha 0.10** primary and 0.25
secondary, never 0.05 (no power at these n). Bootstrap seed fixed at 93.

**Implementation gate (G4), verified before any real set was trusted.** On synthetic data a
uniformly dominant model collapses the set to itself, and identically-distributed models are all
retained (`tests/test_a2_mcs.py`). One elimination sequence is computed and thresholded at each
alpha, so the 0.25 set is a subset of the 0.10 set **by construction** - the stop-condition
ordering "retained at 0.25 but eliminated at 0.10" is made structurally impossible, not merely
asserted. The bootstrap resamples folds jointly across models, so the cross-model correlation is
preserved.

### 4b. Paired variance is why the test can discriminate at all

The report-43 marginal standard errors (near 0.029 at Beer Hall) made the 0.036 top-of-ladder gaps
look hopeless. But the rungs are strongly correlated across folds, so the **paired** differential
standard deviation is far smaller. The ratio of paired sd to independent sd `sqrt(var_i+var_j)`,
over the top-four rungs pairwise:

| venue | paired-to-independent sd ratio | implied paired se |
|---|---|---|
| Beer Hall | 0.16 - 0.27 | ~0.007 - 0.011 |
| Two River Taps | 0.15 - 0.45 | ~0.010 - 0.016 |
| Ellel | **0.06 - 0.16** | ~0.004 - 0.010 |

The paired standard error is three to ten times smaller than the marginal one. That is why a
significance test is possible here at all - and it justifies the block length empirically: the
autocorrelation of the differential series decays from lag-1 ~ 0.5 to 0.8 down to ~ 0 by lag 7, so
`l = 7` is adequate and conservative. The sensitivity sweep confirms it: `l = 2` understates the
overlap and returns spuriously narrow sets (Beer Hall 3/1 against 5/3 at `l = 7`), while
`l in {7, 14, 21}` and `B in {1000, 5000}` are stable.

### 4c / 4d. The sets

Per-fold MASE, common-fold restriction, bootstrap seed 93, `l = 7`, `B = 1000`. Served model in
**bold**; MCS p-value in brackets; the 90% set is every rung with p-value >= 0.10.

**Beer Hall (common-fold n = 273).** 90% set (5): **`rung4_chronos2_exo`** (1.000),
`rung4_chronos_bolt` (0.38), `rung4_chronos2` (0.38), `rung2_ets` (0.22), `rung1_robust_dow`
(0.11). At alpha 0.25 it tightens to the three Chronos entrants. `rung3_global_gbm`, `rung3_gbm`,
`rung2_stl`, `rung0_seasonal_naive` are eliminated at p <= 0.002. RMSSE returns the same five.

**Two River Taps (common-fold n = 205).** 90% set (4): **`rung2_ets`** (1.000),
`rung4_chronos_bolt` (0.68), `rung4_chronos2_exo` (0.68), `rung4_chronos2` (0.68) - the three
Chronos entrants tie the served ETS. Identical at alpha 0.25 and under RMSSE. `rung0_seasonal_naive`
and `rung3_gbm` fall at p = 0.05; `rung2_stl`, `rung1_robust_dow`, `rung3_global_gbm` below.

**Ellel, two runs (spec 4c).** The bracketed numbers here are **MCS p-values** (dimensionless
retention probabilities), NOT MASE. That distinction matters at Ellel because of a coincidence a
reader would otherwise trip on: `rung1_robust_dow`'s MCS p-value below is **0.575**, numerically
identical to `rung4_chronos_bolt`'s *six-fold MASE* of 0.575 reported in row 31 / report 43. They
are different quantities that happen to share three digits. Primary, common-fold n = 246: 90% set
(5) `rung4_chronos_bolt` (p 1.000), **`rung1_robust_dow`** (p 0.575), `rung4_chronos2_exo`
(p 0.28), `rung4_chronos2` (p 0.43), `rung0_seasonal_naive` (p 0.10). Secondary, full n = 260
excluding `chronos2_exo`: 90% set (3) `rung4_chronos_bolt`, **`rung1_robust_dow`**,
`rung4_chronos2`. **The served DOW model is retained in both alignments and under RMSSE.** The
246-fold restriction drops the contiguous June block of FLAG-ELLEL-JUNE-EXO - the most recent
period, not a random sample - and the caveat is stated: because the two runs agree on
`robust_dow`, the June block is not doing the work and no ambiguity halt is forced.

**Set membership at the margin is not stable in B, and that does not matter here.** Ellel's
`rung0_seasonal_naive` sits at p = 0.10 at B = 1000 and drops out at B = 5000, so the 246-fold set
is five models at B = 1000 and four at B = 5000. That single marginal model is the only thing that
moves; the decision is untouched because `rung1_robust_dow` sits at p = 0.575, nowhere near the
0.10 boundary, in every configuration. A model at the boundary is exactly where bootstrap noise
should show, and it is the only place it does.

**A wide set is a valid result.** At Two River Taps and Beer Hall the data cannot separate the
served model from the Chronos entrants on accuracy; the served choice rests on cold-start
capability and inference cost, not demonstrated superiority. That sentence is worth more than a
spurious winner.

**Prediction scorecard (row 33, recorded before the run):** Beer Hall retains at least the top
three and eliminates `rung0_seasonal_naive` and `rung3_gbm` - **holds** (it retained five and
eliminated both, plus STL and global-GBM). Ellel retains `rung1_robust_dow` - **holds**. Two River
Taps retains `rung2_ets` - **holds**. The paired variance turned out much tighter than the marginal
errors, as the spec anticipated it might; the sets are nonetheless wide among the top cluster
because the range statistic corrects for multiplicity.

### 4e. Applying the pre-registered Ellel rule (row 32)

Row 32 bound the action before the set existed. The set contains `rung1_robust_dow` - in the
primary 246-fold run (0.575), the secondary 260-fold run, and under RMSSE - so **it stays served,
and no confrontation is re-scored.** Applied as written, not reinterpreted in light of the result.
This closes the S2 stop-flag: the six-fold argmin flip was noise.

---

## Acceptance gates

| Gate | Verdict | Evidence |
|---|---|---|
| **G1** `pytest` cannot modify the working store, proven by mtime | **PASS** | `test_store_durability.py::test_a_build_does_not_touch_the_configured_working_store`; working store measured at 2026-07-07 before and after a full run under both venvs |
| **G2** `assert_store_ceiling` fires on a reverted store and names the fix | **PASS** | Fires on the isolated seed store (ceiling 2026-05-31); message contains `python -m sim.restore_clock` and the expected ceiling |
| **G3** Fold counts and HLN factors unchanged from S2 | **PASS** | 273 / 260 / 205 and 0.9762 / 0.9750 / 0.9683, recomputed this run |
| **G4** MCS reproduces the two synthetic truths | **PASS** | Dominant model collapses the set to itself; identical models all retained (`test_a2_mcs.py`) |
| **G5** Bootstrap sensitivity reported across four block lengths and both B | **PASS** | Full sweep in `eval/mcs_L1_results.json`; `l = 2` narrow, `l in {7,14,21}` stable, `B` negligible |
| **G6** Suites green with no reduction; no frozen artefact modified; served models changed only where row 32 requires | **PASS** | `.venv` 449 -> 474 passed, 8 skipped unchanged; `.venv-forecast` 456 -> 481 passed, 1 skipped unchanged (both +25, the new MCS and store-durability tests); no served model changed (row 32 required none); frozen `sim/*_confront_result.json` untouched |

## Stop conditions - none fired

The 0.25 set is a subset of the 0.10 set at every venue (nested by construction). The 246-fold and
260-fold Ellel runs agree that `robust_dow` is retained. G4's synthetic cases pass. The store
ceiling held at 2026-07-07 throughout. No alpha, block length or statistic was changed after seeing
a result.

## Deviations

1. **`requirements.txt` was NOT pinned to `==` (stronger substitution, flagged).** The spec says
   "pin `requirements*.txt` to `==`". Applied literally to the shared `requirements.txt` this
   breaks `.venv-eval`, which pins `numpy<2.0` and `scipy<1.16` and would become unresolvable - a
   hard constraint documented in that file's own header. The stronger, correct substitution is a
   per-venv **lockfile** (`requirements-forecast.lock.txt`, full `==` resolution) plus an exact
   `torch` pin in `requirements-forecast.txt`, which is what the file already names as the durable
   answer. Stated here rather than done silently.

2. **The MCS runner's guard is on vector provenance, not the live store.** The spec lists "the MCS
   runner" among entrypoints that should call `assert_store_ceiling`. The MCS reads persisted
   vectors and never touches the store, so a live-store assert would be a false coupling; the
   correct, stronger guard asserts the consumed vectors were built at the pinned ceiling. Same
   intent (no number from a wrong ceiling), tighter mechanism.

3. **Restored the clock before Part 3 and stamped the fold-vector files.** The suite baseline run
   reset the store to seed (the very hazard being fixed); `sim.restore_clock` was run before any
   0707-dependent measurement. The three committed fold-vector JSONs were stamped with their known
   build ceiling as a one-line metadata backfill, not regenerated (regeneration costs an hour of
   Chronos time and G3 requires the counts unchanged).

## Deliverables

`eval/mcs.py`, `eval/mcs_report.py`, `eval/mcs_L1_results.json`; `store/build.py`,
`warehouse.assert_store_ceiling`; `tests/test_a2_mcs.py`, `tests/test_store_durability.py`;
`requirements-forecast.lock.txt`, pinned `torch` and Chronos revisions; decision log rows 33-35;
`FLAG-ELLEL-JUNE-EXO` and the resolution of `FLAG-STORE-DURABILITY` in `FLAGS.md`.
