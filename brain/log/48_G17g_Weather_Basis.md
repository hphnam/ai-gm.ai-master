# Report 48 - S6 G17g: lead-matched weather and what the exogenous path is worth

Date: 2026-07-23. Branch `brain-construction-local`, from tip `5b95641` (S5). Run venv
`.venv-forecast` (Chronos-2 present), device CPU. Style: no em-dashes, plain prose, loud
failures, verify before asserting, pre-register before running.

## Headline

**On the basis the model would actually have at serving, weather does not distinguishably
improve the forecast at any venue. The exogenous path is, on this estate and this evidence,
decoration.** At every venue the no-weather arm shares the 90 percent Model Confidence Set
with every weather arm, including the serving-realistic one, so the multiplicity-controlled
test cannot separate having weather from not having it.

The covariate-quality optimism this package set out to quantify (hindcast weather, archived
near the valid time, beating the horizon-matched forecast the model would really have) is real
and significant, but only at **Ellel**, and it grows with lead exactly as predicted. At **Beer
Hall**, the one venue whose served model is `rung4_chronos2_exo`, the horizon-matched basis is
statistically inseparable from hindcast and if anything nominally better, so there is **no
covariate-quality optimism in the served model's published numbers**. Ellel's served model is
`rung1_robust_dow`, not the exo entrant, so its optimism implicates no served model. **No stop
condition fires; no served model changes.**

| venue | loss (basis) | N | O | H | F | M | 90% set | headline |
|---|---|---|---|---|---|---|---|---|
| Beer Hall | MASE (calendar_lag7_active), n=273 | 0.6005 | 0.5865 | 0.5862 | 0.5860 | **0.5842** | {M,F,H,O,N} | H vs M inseparable: no optimism; weather marginal |
| Ellel | MAE (unscaled), n=260 | 110.85 | 110.88 | **110.78** | 111.02 | 111.00 | {H,N,O,M,F} | H beats M and F (CI excludes 0): optimism, but exo not served |
| Two River Taps | MASE (calendar_lag7_active), n=205 | 0.6260 | 0.6233 | 0.6261 | 0.6246 | **0.6232** | {M,O,F,N,H} | weather decoration: M vs N inseparable |

Arms (they differ ONLY in the 7-day target-window weather; training-context weather is
hindcast throughout, and the calendar/event/World Cup covariates are identical across O/H/F/M):
**N** no weather (exogenous path off); **O** observed ERA5 at the valid time (perfect
foreknowledge, upper bound); **H** hindcast archived near valid time (the committed default,
what every exo number used); **F** fixed lead 3 days; **M** horizon-matched, lead equals the
horizon step (serving reality). O/H come from the observed/hindcast basis tables; F/M from a
per-lead store pulled from one pinned global model (`ecmwf_ifs025`), so F versus M isolates the
lead policy on a single model.

## Preconditions (verified, not assumed)

- Store ceiling `2026-07-07` (`warehouse.store_ceiling`), matching `EXPECTED_STORE_CEILING`.
- Suites green at the S5 counts before any change: `.venv` 518 passed 8 skipped, `.venv-forecast`
  525 passed 1 skipped.
- Weather tables present and populated for all three cells across all three bases; row counts
  and spans reported below (`ingest.exog_weather.coverage`, direct SQL on `_TABLE`).
- `previous-runs-api.open-meteo.com` reachable, verified with one call before planning
  (`fetch_leadmatched`).
- Every count is derived by calling the code's own function, named beside the number.

## Part 1: the Ellel June gap, its cause, and the completeness assertion

`FLAG-ELLEL-JUNE-EXO` recorded a nine-day hole, **2026-06-21 to 2026-06-29**, present for the
Ellel cell across all three bases and absent for Beer Hall through the identical join. S3
established it was upstream rather than a join defect. S6 names the upstream cause.

**Evidence.**
- The data exists at source right now: a refetch of the span returns **9 of 9 days non-null**
  for all three bases, including ERA5 `observed` (`fetch_observed/hindcast/leadmatched`). A
  genuine interior hole in ERA5 reanalysis for a single UK cell does not occur, so **hypothesis
  2 (a real model-coverage gap for the Ellel grid cell) is ruled out.**
- The adjacent Beer Hall cell (0.6 km away) has the same span complete, so the cause is
  request-specific, not meteorological.
- The fetch helper `_get` raises `RuntimeError` after three failed retries: a total failure is
  loud and crashes the build, leaving the incremental watermark un-advanced so the span is
  retried next tick. **Hypothesis 1 (a transient give-up recorded silently) is inconsistent
  with the code**: a give-up is not silent.
- The only path that lands a partial span silently is the incremental `build()` inserting a
  short return (an HTTP 200 with fewer dates than requested) with no completeness check, after
  which the `MAX(date)` watermark advances past the interior hole so it is never revisited.
  **Cause: hypothesis 3, a partial success recorded as complete.** The signature (an interior
  9-day hole rather than a truncated tail) is exactly what a watermark stepping past a short
  return leaves behind. The precise upstream trigger for that one partial 200 is not
  reproducible now (the API returns the span complete), but the defect that let a partial land
  silently was real and is the same failure class the project keeps finding: a silent fallback
  where a loud failure belonged.

**Fix.** `_assert_span_complete` now runs on every fetched span before insert, in both the
incremental `build()` path and the new surgical `repair_span`: a short return (missing interior
day, truncated tail, or a null value on any day) raises `WeatherFetchIncompleteError` rather
than being written. The Ellel span was repaired with `repair_span` (idempotent delete-and-
reinsert of the nine days, itself completeness-asserted): interior missing days at the Ellel
cell went from 9 to **0** across all three bases.

**14 folds recovered (G4).** The committed `rung4_chronos2_exo` scored **246 of Ellel's 260**
folds, failing the contiguous block of 14 (test windows 2026-06-15 to 2026-07-04, train_end
2026-06-14 to 2026-06-27) with `MissingCovariateError`. This is exactly the set of origins
whose training or target window intersects the nine-day hole, bounded to 14 because Ellel's
active span ends 2026-07-04. After the repair, an eligibility recount (train and target weather
NaN-free, mirroring `_require_covariates`) gives **260 of 260** eligible, recovering exactly the
14; the five-arm run then scores all 260 for every exo arm, and the H arm reproduces the
committed exo vector on the original 246 to 0.0000.

## Part 2: lead availability and the pinned model

The previous-runs API exposes leads 1 to 7. Requesting all seven for each cell over a 14-day
span returned **full 14 of 14 non-null coverage at every lead** under automatic model
selection. But automatic selection is not safe to rely on: pinning `ukmo_seamless` (a UK
high-resolution local model) returns **L5=1, L7=0** for every cell, the exact "local model,
shorter horizon, null long leads" failure the package warned about. A basis built on partly
null leads would measure missingness, not skill.

The horizon store is therefore pinned to **`ecmwf_ifs025`** (a global model, roughly 15-day
horizon), which returns full coverage at every lead for every cell. Pinning one model also
keeps lead 1 and lead 7 the same model, so the horizon-matched basis measures forecast-skill
decay with lead rather than a change of model between leads. The model name is recorded in
`config.WEATHER_HORIZON_MODEL` and stamped on every artefact
(`eval/weather_basis_coverage.json`).

Horizon store coverage (`ingest.exog_weather.horizon_coverage`), all leads 1..7 non-null:
Beer Hall 399/399 (span 2025-06-04..2026-07-07), Ellel 392/392 (2025-06-08..2026-07-04), Two
River Taps 331/331 (2025-06-12..2026-05-08).

## Part 3: the horizon-matched basis, and the fixed-lead rename

The horizon-matched basis (`models.weather_basis.horizon_matched_target`) hands horizon step
h the forecast issued h days ahead: step 1 gets lead 1, step 7 gets lead 7. Under every
existing basis a date carries one weather value; under horizon matching a date carries up to
seven (one per lead) and the correct one depends on the origin, so the substitution is made
per fold at scoring time, never baked into a single per-date column. The existing single-lead
`leadmatched` table (a fixed lead of `WEATHER_LEAD_DAYS = 3`) and its constant are kept
untouched as the stock reorder-lead object and renamed in this report to what they are, a
**fixed-lead** basis; the ablation's F arm reads the same fixed lead 3 from the pinned store so
that F versus M isolates the lead policy alone.

**The lead gate (G1, load-bearing).** `assert_lead_matched` verifies each target row's weather
equals the pinned store's lead-(horizon step) value, by value not just by label, and raises
`LeadMismatchError` otherwise. A planted lead-1 value placed at horizon step 7 (a shorter,
easier forecast than serving would have) makes the row differ from the store's lead-7 value and
**fires the gate** (`tests/test_weather_basis.py::test_lead_gate_fires_on_planted_short_lead_at_step_7`).
It is the weather analogue of S5's panel-leakage gate: a permissive error here would silently
restore the optimism the package removes.

Verified against the real model before the run: the exo wrapper reproduces the committed
`chronos2_exo_predict` to 0.000000; batched equals unbatched to 0.000000 (throughput only); the
no-weather arm reproduces `chronos2_predict` to 0.000000.

## Part 4: the five-arm ablation, per venue

Instrument: the S3 Model Confidence Set at 90 percent (range statistic, moving-block bootstrap,
block 7, `mcs.N_BOOT`) plus a paired moving-block bootstrap of every arm-pair mean difference
(B 10000, seed 94, distinct from the MCS resample). Beer Hall and Two River Taps on MASE (basis
`calendar_lag7_active`, the S4 active-day decision), Ellel on unscaled MAE (no defensible
seasonal-naive basis at 1.2 trading days a week, the S4 decision; **G4**). Per-fold vectors and
per horizon step, all stamped with `store_ceiling`, `device`, the weather basis and the model
name.

### Beer Hall (served by exo, n=273, MASE)

All five arms in the 90 percent set. Mean loss M 0.5842 < F 0.5860 < H 0.5862 < O 0.5865 < N
0.6005. Among the four weather arms every paired CI spans zero, so the **basis choice does not
matter**; in particular **H versus M is +0.0020, CI [-0.0019, +0.0066], inseparable**, so there
is no measurable optimism at the served venue and the horizon-matched basis is if anything
nominally the best. The only pair that separates is N versus M (+0.0163, CI [+0.0004, +0.0337]),
and it is borderline (lower bound 0.0004) and not adjusted for multiplicity; the MCS, which is,
keeps N in the set (p 0.459). Per horizon step, M is at or below H at every step (no lead
decay). Honest reading: whatever small value weather carries at Beer Hall (about 0.016 MASE,
roughly 2.7 percent, at the edge of significance), the serving-realistic basis captures it in
full.

### Ellel (served by robust DOW, n=260, MAE)

All five arms in the 90 percent set. The no-weather arm N is inseparable from everything (its
paired CIs span roughly plus or minus 2 MAE, Ellel is noisy), so **weather adds nothing over no
weather**. Among the weather arms the optimism is real: **H beats M by 0.22 MAE (CI [-0.42,
-0.033], excludes zero) and beats F by 0.24 (CI [-0.43, -0.046])**, and the per-step view shows
the H-over-M gap widening with lead (h1 +0.12, h7 +0.36), exactly the pre-registered pattern.
So the hindcast basis genuinely flatters the exo entrant at Ellel relative to what serving would
deliver. But the entrant it flatters is neither served (Ellel serves `rung1_robust_dow`) nor
better than no weather, so the optimism inflates a number that does not matter.

### Two River Taps (exo not the committed best, ETS is, n=205, MASE)

All five arms in the 90 percent set. Mean loss M 0.6232 approximately O 0.6233 < F 0.6246 < N
0.6260 approximately H 0.6261. N versus M spans zero and H versus M spans zero; the only
separating pair is O versus H (-0.0028, CI [-0.0051, -0.0006]), a hair. Weather is decoration
here: M and N are inseparable.

### The question, answered

How much of the exo entrant's advantage over the no-weather arm survives on the realistic
basis? At Beer Hall essentially all of it: M's edge over N (0.0163) is at least H's edge over N
(0.0143), so nothing is lost by moving to the serving basis. At Ellel and Two River Taps there
is no distinguishable advantage over no weather to survive. The pre-registered "if M and N sit
in the same confidence set, weather adds nothing at operational lead and the exogenous path is
decoration" holds at all three venues under the MCS.

## The pre-registered prediction, scored

Predicted O better than H better than M with F between, because skill decays with lead. **Not
confirmed as an accuracy ordering**: at Beer Hall M is nominally best, at Two River Taps M and O
tie best, and only at Ellel does H lead the weather arms. The prediction was about forecast
skill; the result is that weather is too weak a covariate here for its forecast quality to move
the revenue error in a consistent direction. Predicted the H-to-M gap material at steps 5 to 7
and small at step 1: **confirmed at Ellel** (the gap widens with lead), absent or reversed
elsewhere. Predicted no confident view on M versus N: **the answer is inseparable**, the
publishable negative result the spec anticipated.

## Stop conditions

None fired.
- The exo entrant does NOT fall out of the 90 percent set at Beer Hall under the horizon-matched
  basis: M is in the set and is the nominal best, and M beats the no-weather sibling N. Nor is it
  beaten by a lower rung: the committed ladder has `rung4_chronos2_exo` best at Beer Hall by 5
  percent over the nearest lower rung (ETS 0.7524 against exo 0.7163 on calendar_lag7), and M is
  statistically inseparable from H, so the served-model selection holds under realistic weather.
- The lead gate fires on a planted short-lead value (Part 3).
- Longer leads are available for the Lancaster and Preston cells (Part 2).
- The Ellel gap is an ingest artefact, not a join defect, consistent with S3 (Part 1).

## Acceptance gates

| gate | verdict | evidence |
|---|---|---|
| G1 lead gate, load-bearing | PASS | fires on a planted short-lead at step 7; verified by value against the pinned store |
| G2 coverage before use, model pinned | PASS | per cell per basis per lead in `weather_basis_coverage.json`; `ecmwf_ifs025` recorded |
| G3 N reproduces committed no-exo | PASS | max abs delta 8.3e-7 / 7.8e-7 / 1.4e-6 (BH/Ellel/TRT); H reproduces committed exo to 1.6e-6 / 4.8e-7 / 5.8e-7 |
| G4 Ellel June repair recovers 14 folds | PASS | 246 -> 260 exo-eligible; the exact 14 gap-adjacent origins, proven analytically and in the run |
| G5 results per horizon step | PASS | per-step tables per arm per venue in report and `weather_basis.md` |
| G6 suites green, no served model changed, artefacts stamped | PASS | `.venv` 518 to 534 passed (8 skipped unchanged), `.venv-forecast` 525 to 541 passed (1 skipped unchanged), both +16 new tests, 0 failures; no served model changed; no frozen artefact modified; every artefact carries ceiling, device, basis, model |

## Deviations and flags

- **F sourced from the pinned model, not the existing auto-model table (stated, stronger).** The
  spec's F is "the existing leadmatched implementation" (auto model, lead 3). For a confound-free
  F-versus-M contrast the ablation reads fixed lead 3 from the same pinned `ecmwf_ifs025` store as
  M, so the only difference between them is the lead policy. The pinned lead-3 tracks the existing
  auto-model lead-3 table closely (mean absolute temperature difference 0.72 C at Beer Hall), so F
  still faithfully represents the fixed-lead basis; the stored `exog_weather_leadmatched` table and
  the `WEATHER_LEAD_DAYS` constant are untouched as the stock object. `FLAG-WEATHER-PINNED-MODEL`.
- **O uses hindcast training context with observed target weather.** The upper bound is on the
  covariate-quality axis (perfect future weather), and keeping the training context at hindcast
  makes O differ from H/F/M in the target window only, so the whole O/H/F/M comparison is a single
  knob. Stated here so the "upper bound" is not misread as a fully-observed run.
- **`FLAG-ELLEL-JUNE-EXO` closed.** Cause named (ingest partial recorded complete), fix landed
  (completeness assertion plus repair), 14 folds recovered. See FLAGS.md.
- **`FLAG-METHODOLOGY-OVERLEAF` still open.** Deliverable 7 (report 45's scale-basis bootstrap)
  moved into `chapters/methodology.tex`; the Overleaf root copy cannot be verified from here, so
  the local file carries the prose and the sync flag stays open, as for S5.

## Review gate

Code and security reviewers ran on the changed files. Security: no issues (SQL parameterised,
no SSRF or secret handling, the completeness guard is fail-loud and bounded, artefact writes are
`allow_nan=False`). Code review confirmed all six load-bearing invariants (lead gate by value,
batched equals unbatched, per-step and window scoring, completeness assertion, MCS common-origin
alignment, no leakage) and raised two robustness findings, both fixed: the completeness assertion
was wired into `build()`'s incremental branch but not the rebuild/force branch (the initial and
force-repair path), now guarded per cell with a regression test; and `build_horizon` fetched
before its cache check, now checks table existence first so a cache hit never touches the network.

## Artefacts

- `eval/weather_basis.py` (driver), `models/weather_basis.py` (exo wrapper, target construction,
  lead gate), `ingest/exog_weather.py` (completeness assertion, `repair_span`, horizon store).
- `eval/weather_basis_L1.json` (per-fold per-step vectors), `weather_basis_mcs.json` (MCS plus
  paired bootstrap plus per-step), `weather_basis_coverage.json` (coverage plus model), all
  `allow_nan=False` and stamped.
- `tests/test_weather_basis.py` (16 tests: lead gate incl. planted short-lead, completeness
  assertion incl. the rebuild branch, batching, per-arm target construction),
  store/network/Chronos independent.
- Decision log rows 49-52; `chapters/methodology.tex` scale-basis section.
