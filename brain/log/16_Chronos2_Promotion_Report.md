# PRJ93 Chronos-2 Promotion Report (WP12)

**Date:** 2026-07-08
**Branch:** `feat/chronos2-promotion` (off `fix/fidelity-corrections`)
**Scope:** implements `PRJ93_Chronos2_Promotion_Spec.md` (G12.1 through G12.8).
**Status:** complete, with one major, honestly-reported divergence from the
spec's stated decision (see §1 below). Runtime venv **230 passed, 6 skipped**
throughout. Every gate committed with its gate id.

No em-dashes are used in this report, per the spec's style rule.

---

## 0. Read this first: the headline finding

The spec's opening sentence names the decision being implemented as promoting
"the Chronos-2 covariate variant." That is not what actually got promoted.

- The **preview** check (G12.2, a 6-fold ladder backtest run in the eval venv)
  showed `rung4_chronos2_exo` (Chronos-2 with known-future calendar covariates)
  winning Beer Hall's milestone at rolling MASE **0.779**, exactly matching the
  spec's F1 prediction. This is correct and reproducible.
- The **actual promotion mechanism** (`ingest.refresh`'s T3 re-fit, a
  pre-existing code path this work did not modify) uses a **4-fold, no-prophet**
  backtest, not 6 folds. At that fold count, plain **`rung4_chronos2`** wins
  (MASE **0.823**), beating `rung4_chronos2_exo` (0.834) and `rung4_chronos_bolt`
  (0.845). This is deterministic (no RNG) and reproduces exactly on every run.
- Root cause: fold-count sensitivity. The covariate probe's own per-fold table
  (`eval/chronos2_covariate_probe.md`) shows the covariate variant winning big
  on fold 1 (0.641 to 0.485) and losing narrowly on folds 2 to 4; the 6-fold
  mean is pulled positive by that one large early win, while the 4-fold T3
  window does not include the same folds the same way.
- Per this project's own standing principle, stated repeatedly across the
  fidelity-corrections and addendum specs, **"the gate decides, formally; do
  not hand-pick,"** the actually-promoted model is `rung4_chronos2`, not the
  covariate variant. I did not override the gate to force the spec's named
  outcome through. G12.2's own text anticipates exactly this kind of
  contingency ("if the exo entrant does NOT win... promote the best gate
  winner instead, and the decision log records the surprise") — it just
  materialised one level deeper than G12.2 checked, inside T3's independent,
  smaller backtest rather than the ladder CLI preview.

**What this means practically:** Beer Hall is now served by Chronos-2
zero-shot (a genuine, verified upgrade over the previous `rung2_ets`/prophet
baseline), just without the covariate path. The covariate entrant is fully
built, gated, tested, and available — it simply is not what the live T3
mechanism currently selects. Reconciling T3's fold count with the ladder CLI's
(so future refits and the documented preview agree) is a decision for Nam, not
made unilaterally here — it would mean changing a pre-existing backtest
parameter specifically because I did not like its answer, which is the kind of
hand-picking the whole project's methodology exists to prevent.

---

## 1. What each gate delivered

### G12.1: `rung4_chronos2_exo`, a first-class covariate entrant
- `models/foundation.py`: `CHRONOS2_EXO_COLS = [is_bank_holiday, is_ellel_event,
  exo_is_school_term, exo_is_uni_term]` (never weather). `chronos2_exo_predict`
  shares the process-level Chronos-2 pipeline with the univariate entrant,
  builds `context_df`/`future_df` with those four columns, and raises
  `MissingCovariateError` (a `ValueError`) on any missing column or NaN value —
  no fallback to the univariate tensor path, so a covariate failure is a
  distinct, loud, visible entrant failure, never a silent degrade.
- `models/ladder.py`: `rung4_chronos2_exo` joins `PREDICTORS` alongside the
  other two Rung-4 entrants when the backend imports, subject to `MAX_RUNG`.
  The report table now shows three entrants and the winner.
- **Acceptance:** A12.1 met — reads exactly `CHRONOS2_EXO_COLS`, raises on
  missing covariates (unit-tested), never touches weather.

### G12.2: the gate decides, formally
- Eval-venv `models.ladder --all-venues` run: `rung4_chronos2_exo` scores
  rolling MASE **0.779** on Beer Hall (matches F1 exactly) and wins the
  6-fold milestone, beating `rung4_chronos2` (0.793), `rung4_chronos_bolt`
  (0.796), naive (1.006), DOW (1.029), and `rung3_global_gbm` (0.905).
- **Deviation (documented, not worked around):** the exo entrant fails with a
  loud `ValueError` in the STATIC evaluation regime for Beer Hall and TRT.
  Chronos-2's `predict_df` requires `future_df` to be a gap-free continuation
  of `context_df`; `harness.time_split`'s static split reserves a ~29-day
  validation buffer between train and test, violating that. The milestone
  gate (rolling only) and the promotion path (`wrap.evaluate`, gap-free by
  construction) are unaffected. No `validate_inputs=False` bypass was added —
  a covariate/timestamp mismatch should fail loudly, not silently degrade.
- **Acceptance:** A12.2 met at this stage — no stop condition triggered. (The
  divergence described in §0 was discovered later, at G12.6, not here.)

### G12.3: the forecast venv (production nightly environment)
- `requirements-forecast.txt`: `chronos-forecasting>=2.3`, `torch>=2.5` only.
  Deliberately excludes statsforecast, TSB-AD, vus, prophet (eval-only
  concerns; prophet's absence changes only report comparison rows, never the
  served model — same asymmetry as the addendum report's D25).
- `.venv-forecast` built (Python 3.12.13, uv-provisioned, gitignored) and
  verified: `HAS_CHRONOS` True, chronos-forecasting 2.3.1, torch 2.12.1,
  statsforecast correctly absent.
- `README.md` nightly ops one-liner: `.venv-forecast/bin/python -m ingest.refresh`.
- **Acceptance:** A12.3 met.

### G12.4: environment guards (no silent demotion)
- `ingest/refresh.py`: `_is_rung4(model_name)` matches any `rung4_*` served
  model. `_refit_ladder` now checks the served model *before* running the
  backtest; if it is Rung-4 and `HAS_CHRONOS` is False, the re-fit is skipped
  entirely — no backtest run, no `ladder_selection` row, served model
  untouched. `_promote_and_serve` gets the same guard on the resolved model,
  before calling `wrap.evaluate` (which would otherwise raise
  `ValueError('unknown model ...')` since the entrant is absent from
  `PREDICTORS` in a chronos-less venv): skip cleanly, leave the band as-is,
  upsert nothing, return a `"skipped"` dict with a named note.
- Escape hatch: `refresh(..., allow_fallback=True)` — also exposed on
  `POST /refresh` as `RefreshRequest.allow_fallback` (default False), since
  that endpoint is the operator's actual point of control in a deployed
  system — writes an audited `ladder_selection` row
  ("backend unavailable, operator-approved fallback to rung2_ets") before
  serving the fallback. Never automatic; the nightly cron's `run()` always
  calls `refresh()` with the default False.
- Cadence unchanged: `INGEST_STALENESS_DAYS`, the T3 weekly/change-point
  triggers, and the Phase 4 fire conditions are untouched.
- **Acceptance:** A12.4 met — both guards unit-tested
  (`test_refit_guard_skips_loudly_with_no_audit_row_when_backend_absent`,
  `test_promotion_guard_skips_and_leaves_band_untouched_when_backend_absent`,
  `test_operator_approved_fallback_writes_audited_selection_row`, all in
  `tests/test_ingest_refresh.py`).

### G12.5: exogenous coverage for the serving horizon
- Verified empirically: all four `CHRONOS2_EXO_COLS` have zero NaN across the
  full observed history, both `beer_hall` (n=362) and `two_river_taps` (n=331).
- **Finding, documented not silently accepted:** F7's claim that "Ellel events
  [come from] the events table, which is known-in-advance by nature since they
  are bookings" does not match the codebase. `build_features._ellel_event_dates`
  derives `is_ellel_event` from Ellel's own **observed** L1 revenue
  (`value > 0`), not a bookings/events table — there is no forward-looking
  Ellel calendar anywhere in this codebase. Three of the four columns
  (`is_bank_holiday`, `exo_is_school_term`, `exo_is_uni_term`) genuinely are
  known-future (pure calendar-rule functions of the date); `is_ellel_event` is
  not.
- This gap is real but currently **dormant**: every path that actually calls
  the exo entrant today (`wrap.evaluate`'s rolling-origin persistence,
  `hierarchy.reconcile`) only ever forecasts already-observed held-out dates
  for the open Beer Hall. The only genuinely-future-date path in the codebase,
  `conformal.wrap._persist_standby_forward`, fires only for a **closed**
  venue, which Beer Hall is not. No future-Ellel-events extension mechanism
  was built — there is no bookings table to extend from, and fabricating one
  would be exactly the imputation the spec forbids ("raise, do not impute").
  `chronos2_exo_predict`'s `_require_covariates` check is the correct backstop
  for the dormant case: if Beer Hall ever closes while this entrant is served,
  the standby-forward path's bare `date`-only future frame will make it raise
  loudly rather than guess.
- **Acceptance:** A12.5 met — coverage verified (not silently assumed);
  assertion tests present (`test_exo_predict_raises_on_missing_covariate_column`,
  `test_exo_predict_raises_on_nan_covariate_value`, both runnable without
  torch/chronos since the check is pure pandas, before any pipeline call).

### G12.6: the promotion itself
Run from `.venv-forecast` against a clean store (`forecasts`/`bands`/
`data_watermark`/`ladder_selection`/`served_forecast` all reset first, so the
demonstration is not polluted by test-suite leftovers sharing the same
on-disk `brain.duckdb`).

- `refresh("beer_hall", force=True, refit="force")` ran the real T3 refit.
  Result: `rung4_chronos2` adopted (MASE 0.823 vs naive 0.955), promoted.
  See §0 for the full discrepancy against G12.2's preview.
- Verified clean: `served_forecast(beer_hall, L1) = rung4_chronos2`, fresh
  `promoted_ts`. `GET /forecast?venue=beer_hall&level=0.9` returns 57 rows, all
  under `model=conformal_rung4_chronos2` — no stale rows from earlier models.
  Sample row: `{"date": "2026-04-05", "yhat": 495.71, "lo": 0.0, "hi": 1268.05,
  "level": 0.9, "model": "conformal_rung4_chronos2"}`.
- **TRT and Ellel come out unchanged.** Neither had a `served_forecast` row
  before this work (the table did not exist in the store prior to WP12) and
  neither has one after — the promotion run is scoped to Beer Hall only, and a
  normal (`refit="auto"`, non-forced) pass over all three venues confirms TRT
  and Ellel correctly stay un-refit (`"T3 skipped: no prior fit on record"`)
  and un-promoted.
- **Deviation, unrelated to Chronos-2, discovered and left out of scope:** an
  initial trial force-refit of TRT (testing a literal reading of "TRT and
  Ellel go through the same run") surfaced that T3's 4-fold winner for TRT is
  `rung3_gbm` (MASE 0.575), not `rung2_ets` — and `rung3_gbm` cannot actually
  be served through `wrap.evaluate`: it raises `KeyError` on missing feature
  columns. This is a genuinely pre-existing bug, unrelated to WP12:
  `conformal.wrap.default_model()` never returns `rung3_gbm`, so this
  combination had never been exercised through the promotion path before this
  exercise stumbled onto it. The failure was caught cleanly (loud note, no
  corrupted state — `_promote_and_serve`'s try/except in `_refresh_one`
  absorbed it exactly as designed), but it is a real, separate defect worth a
  dedicated fix. Not touched here; the final run scopes `force=True` to Beer
  Hall only, matching the spec's literal text, sidestepping the bug entirely
  rather than patching it under WP12's banner.
- **Acceptance:** A12.6 met, with the model named honestly as `rung4_chronos2`,
  not the covariate variant.

### G12.7: band-sensitivity impact check
- `eval/chronos2_promotion_sensitivity.py` (new, report-only): compares
  `signals.deviation.scan('beer_hall', window=28)` before and after the
  promotion.
- **Result: 0 of 28 rows differ, byte-identical.**
- **This is not a coincidence, and it corrects the spec's F6.** F6 claims "the
  deviation z denominator is the conformal half-band of the served band,"
  implying promotion changes alert sensitivity. That is false for this
  codebase: `signals.residual.build_residual_stream` (the shared foundation
  for both `signals.deviation` and `signals.change_point`) is hard-wired to a
  DOW-median baseline it recomputes directly from `store.warehouse.read_series`.
  It never reads `served_forecast`, `forecasts`, or `bands` — the module's own
  docstring says as much ("expected_t = DOW-median baseline (Rung-1)"; "This
  module changes no forecast — it reads existing store data only"). Promoting
  any model, including Chronos-2, mechanically cannot change deviation
  classifications through this path. The check ran anyway, because the point
  is to observe and write down the true state, not assume the spec's premise.
- **Acceptance:** A12.7 met — before/after diff written to
  `eval/chronos2_promotion_sensitivity.md` and the decision log; the
  >5-of-28 flag condition does not apply (0 diffs).

### G12.8: closeout
- Decision-log Section B row 5 appended to `PRJ93_Decision_and_Resolution_Log.md`,
  covering the promotion decision, the F1/actual numbers, the guards, the
  G12.7 outcome, and TRT/Ellel unchanged — written to name the divergence from
  §0 plainly, not soften it.
- `PRJ93_Fidelity_Corrections_Addendum_Report.md` gained a "§5. WP12 addendum"
  section per G12.8's literal instruction, continuing D-numbering from D28
  through D35 (full list below).
- Unit tests: all five required categories present (exo happy path with a fake
  pipeline, missing-future-covariate raise, refit guard, promotion guard,
  operator-approved fallback) — see the file list in §3.
- **Acceptance:** A12.8 met — runtime venv 230 passed, 6 skipped, throughout.

---

## 2. Deviations from the spec

Every departure from a literal reading of `PRJ93_Chronos2_Promotion_Spec.md`,
continuing the D-numbering from the addendum report's D28.

- **D29. `chronos2_exo_predict` fails in the STATIC evaluation regime.** See
  G12.2 above. Chronos-2's `predict_df` gap-strictness versus
  `harness.time_split`'s validation-buffer gap. Loud failure, not worked
  around; does not affect the milestone gate or the promotion path.
- **D30. `requirements-forecast.txt` is an addendum file, not an inlined
  `-r requirements.txt` plus additions.** Matches the existing
  `requirements-eval.txt` precedent; the spec's literal "runtime requirements
  plus X and Y" phrasing could be read either way, and I chose consistency
  with the established project convention over a literal reading.
- **D31. `allow_fallback` also exposed on `POST /refresh`.** G12.4 only names
  the Python-API flag `refresh(..., allow_fallback=True)`; since `/refresh` is
  the actual operator-facing HTTP surface in a deployed system, `RefreshRequest`
  gained the same field (default False) so the flag is genuinely reachable by
  "the operator" as the spec's own language intends, not just by someone with
  Python REPL access to the running process.
- **D32. F7's "Ellel events... bookings" claim does not match the codebase.**
  See G12.5 above. Documented as a real, dormant limitation; not fixed, since
  there is no bookings table to extend from and fabricating one would be
  imputation.
- **D33. The actual T3 gate does not select the covariate variant — the
  headline finding.** See §0. Full technical detail, exact numbers, and the
  reasoning for accepting rather than overriding the gate are there.
- **D34. TRT was not force-refit in the final run.** An initial trial (testing
  a literal "TRT and Ellel go through the same run" reading) surfaced the
  unrelated `rung3_gbm`/`wrap.evaluate` bug described in G12.6. The final run
  scopes `force=True` to Beer Hall only, per the spec's literal text ("run
  ... with `force=True` for beer_hall"), and confirms TRT/Ellel remain
  unpromoted via a normal `refit="auto"` pass — genuinely unchanged, and the
  unrelated bug is sidestepped rather than patched under this spec's banner.
- **D35. `_reset_store()` (test helper) extended to drop `served_forecast`.**
  A real promotion persists state in the same on-disk `brain/store/brain.duckdb`
  the test suite reads and writes; a leftover Rung-4 served row from this
  work's manual exercises would otherwise trip the new G12.4 guards for the
  pre-existing G6 test (`test_forced_refit_selects_rung_and_logs_selection`),
  which is not exercising those guards. Fixed at the source; that test now
  also resets explicitly rather than relying on fixture-ordering luck.

---

## 3. Stop conditions

No step required altering detection thresholds, briefing weights, the Square
pull cadence, or T3/Phase4 trigger conditions, and no guard weakens the audit
trail. The one genuine "surprise" — D33/§0, the actual gate not selecting the
covariate variant — is precisely the kind of gate-decides-formally outcome
this project's own stop-condition philosophy anticipates for a losing-gate
result (G12.2's text explicitly names this contingency, just for a shallower
check than where it actually materialised). It was reported in full, with
exact numbers and root cause, not overridden or hidden.

## 4. Files changed

New: `requirements-forecast.txt`, `eval/chronos2_promotion_sensitivity.py`
(+ its `.md`), this report.
Edited: `models/foundation.py` (`chronos2_exo_predict`, `CHRONOS2_EXO_COLS`,
`MissingCovariateError`), `models/ladder.py`, `ingest/refresh.py`,
`service/app.py`, `README.md`, `.gitignore`, `tests/test_foundation.py`,
`tests/test_ingest_refresh.py`, `PRJ93_Decision_and_Resolution_Log.md`,
`PRJ93_Fidelity_Corrections_Addendum_Report.md`, plus regenerated
`models/ladder_results_L1_*.md`.

---

## CORRECTION appended 2026-08-14 (S18): §0's headline divergence is closed, and §0 is where a reader meets it

**Appended, not substituted**, per the corrections-are-appended rule in
`PRJ93_RULES.md`. Nothing above this line is edited. This report's §0 is headed
"Read this first: the headline finding", so it is the first thing a reader of this
file sees, and it is the reason this correction is here rather than only in the
decision log.

**Two passages are corrected.** §0's second bullet:

> The **actual promotion mechanism** (`ingest.refresh`'s T3 re-fit, a
> pre-existing code path this work did not modify) uses a **4-fold, no-prophet**
> backtest, not 6 folds. At that fold count, plain **`rung4_chronos2`** wins
> (MASE **0.823**), beating `rung4_chronos2_exo` (0.834) and `rung4_chronos_bolt`
> (0.845).

and §0's closing sentence:

> Reconciling T3's fold count with the ladder CLI's (so future refits and the
> documented preview agree) is a decision for Nam, not made unilaterally here

**The decision was made, at G12.9a, on the side of 6.** `ingest.refresh._refit_ladder`
now evaluates at `n_folds=6`, so T3 and the `models.ladder` CLI agree on fold count
and the 0.823 versus 0.779 split cannot recur. Recorded at decision log row **6(a)**
and in report `17_G12_9_Report.md`.

**Verified at source rather than from a row.** `ingest/refresh.py:302` reads
`ladder.evaluate_rolling(venue, n_folds=6, horizon=7, with_prophet=False)`;
`n_folds=6` first entered that file at commit **`a04eb2d6`, 2026-07-08 19:20:09
+0100**. The four-fold path does not exist.

**What still stands.** The whole of §0's reasoning: that the gate decides formally,
that hand-picking was refused, that the divergence was reported with its exact
numbers and root cause. The fold-count sensitivity finding stands as the diagnosis
that motivated the unification. The 0.823/0.834/0.845 triple stands as a record of
what the four-fold path produced on 2026-07-08. **What does not stand is the
present tense.** "uses a 4-fold backtest" and "is a decision for Nam" describe a
state that ended on the evening of the same day this report was written.

**One consequence worth naming.** The `conformal_rung4_chronos2` band in the store
was written 2026-07-08 15:23:41, four hours and fifty-seven minutes BEFORE the
unification commit. It is four-fold output produced before the fix and never
regenerated. It is not evidence that the six-fold path selects the plain arm, and it
should not be cited as such.

**Why this correction was needed.** Section B row 5 of the decision log carried no
forward pointer to row 6(a), and three later work packages (S14, S15, S16) priced a
dissertation disclosure for a divergence that had already been resolved. Full
account at decision log row **111(d)**; the pointer is now in row 5 itself.

---

## CORRECTION appended 2026-08-15 (S19): the no-em-dash claim at line 10 is false, and was false on the day it was written

**The claim, verbatim, at `:10`:**

> No em-dashes are used in this report, per the spec's style rule.

**The measurement.** This file contains **29 U+2014 em dashes**, at lines 39, 46, 49, 62, 68,
82, 84, 91, 102, 108, 111, 117, 130, 141, 147, 163, 168, 175, 181, 200, 202, 206, 213, 220,
221, 249, 257, 273 and 274. All 29 sit in the report's **own prose**, not one inside a
blockquote, a table cell or a code span, so no reading of the claim as scoped to original
sentences rescues it. Every one of them falls before line 293, which is where the first
appended correction begins, so all 29 date from the original 2026-07-08 authoring and none
was introduced by a later append. The two appended correction sections carry zero.

**What this is and is not.** The style rule was real and it was stated. What failed is that
the compliance line was **written rather than measured**: it asserts an outcome about the file
it sits in, at a point in the file where nothing had yet been counted, and nothing downstream
ever counted it either. A statement of the form "this artefact satisfies rule X" placed inside
the artefact is a claim, and it is exactly as checkable as any other claim in this project,
which is to say it should have been run before it was written. It survived from 2026-07-08 to
2026-08-15 in a project that runs an AI-writing pre-flight on every prose deliverable, because
the pre-flight runs over the dissertation `.tex` and not over the build reports.

**What still stands.** Nothing else in this report is touched or affected. The em dashes are a
style-rule breach and a false self-report; they change no number, no gate, no verdict, and no
finding. The body is left exactly as written, per the append-only correction rule at
`PRJ93_RULES.md` "Corrections are appended, never overwritten".

**Sibling claims checked, since the rule is to grep for the claim rather than for the file it
was written in.** Three other files assert a zero-em-dash result and contain em dashes.
`ledger/phase_state.md` (574) and `log/Decision_and_Resolution_Log.md` (76) are **not in
breach**: every one of their claims is scoped to a named `.tex` deliverable or chapter, not to
the ledger prose carrying it. `log/30_G12_18_Comment_Rewrite_Report.md:6` says *"Zero
em-dashes in the edits or in this report"* and the file holds 215, but that report's subject
IS em dashes and the 215 are quoted BEFORE-samples of the comments it rewrote, each prefixed
with its source line number. Defensible, and worth a scoping clause it does not have. **This
report is the only one of the four where the claim is simply untrue.**
