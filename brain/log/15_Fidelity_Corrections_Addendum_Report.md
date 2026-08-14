# PRJ93 Fidelity Corrections Addendum: Build Report (WP8 to WP11, Chronos-2)

**Date:** 2026-07-08
**Branch:** `fix/fidelity-corrections` (continued)
**Scope:** implements `PRJ93_Fidelity_Corrections_Spec_Addendum.md` (WP8 through WP11).
**Status:** complete. Both suites green: runtime venv **223 passed, 5 skipped**;
eval venv **228 passed, 0 skipped** (run in chunks, see D26). The three deferred
acceptances from the first build (D5, D10, D14) are now closed.

No em-dashes are used in this report or in any new report, log, or module docstring.

---

## 0. Environment (WP8)

- **Interpreter (A8.1):** no system Python 3.11/3.12 existed (only 3.13t and 3.14),
  so Python **3.12.13** was provisioned with `uv` and `brain/.venv-eval` created
  from it (`uv venv --python 3.12 .venv-eval`). The venv is gitignored; the runtime
  venv and its dependencies are untouched.
- **Packages (A8.2):** installed into `.venv-eval` via `uv pip`: chronos-forecasting
  **2.3.1**, torch **2.12.1**, statsforecast **2.0.3**, TSB-AD **1.5** (numpy pinned
  to 1.26.4 by TSB-AD), plus the brain runtime requirements and prophet (D24). TSB-AD
  installed, so the VUS fallback was not needed.
- **Full pytest (A8.3):** ran in `.venv-eval`. The two previously skipped tests now
  execute: the statsforecast cross-check (WP2 G2.2) and the torch/chronos foundation
  tests. The cross-check initially FAILED, exactly the risk G8.4 flagged.

### G8.4: Croston initialisation, settled by the oracle
The cross-check failed at rtol 1e-6 on series with leading zeros. Empirically,
`statsforecast.CrostonClassic` matches `phat0 = i0 + 1` (the first observed
interval, i0 = index of the first non-zero demand), not `phat0 = 1.0`. Per the
G8.4 rule the implementation was aligned to the oracle (`models/intermittent.py`,
`phat = float(i0 + 1)`), which is also what the module docstring already claimed.
The WP2 per-node comparison was re-run: **no node verdict flipped** (DOW-median
still wins all 17 intermittent nodes), so decision-log row 1's conclusion stands;
`reconciliation_forecast.md` was regenerated with the corrected SBA numbers. **D5
closed.**

---

## 1. What each work package delivered

### WP9: Rung-4 upgraded to Chronos-2 and actually run
- `models/foundation.py`: `chronos2_predict` (primary README `predict_df` API,
  0.5 column; fallback tensor `predict_quantiles(inputs=[...])`; resource guard that
  substitutes `autogluon/chronos-2-small` on failure or a 120s timeout and records
  it; `chronos2_runtime_info` surfaces version / model id / API path / substitution).
- `models/ladder.py`: `rung4_chronos2` joins PREDICTORS alongside `rung4_chronos_bolt`;
  both climb the same gate, subject to MAX_RUNG (Ellel capped). The report names both
  entrants, the winner, the package version, the model id loaded, the API path, and
  the fixed-form gate sentence.
- **Actual run (G9.4, A9.1, A9.2):** Beer Hall `rung4_chronos2` rolling MASE **0.793**
  is the **milestone winner**, beating robust DOW (1.029), seasonal-naive (1.006),
  prophet (0.799) and `rung3_global_gbm` (0.905), so **Rung 4 is adopted by the gate
  on Beer Hall**. On Two River Taps the best Rung-4 entrant is `rung4_chronos_bolt`
  (rolling MASE 0.612), with `rung4_chronos2` at 0.636; both beat naive/DOW/GBM but
  neither beats `rung2_ets` (0.584), which stays selected. Ellel capped. (All figures
  here are rolling MASE, the milestone-gate metric; static-regime figures differ, e.g.
  TRT Bolt is 0.556 static; cite from the `models/ladder_results_L1_*.md` tables.)
  Provenance line: "chronos-forecasting 2.3.1, model loaded amazon/chronos-2, API
  path predict_df."
- **A9.3:** backend-absent output verified byte-identical (runtime-venv rerun matches
  the WP4-committed reports exactly). **A9.4:** no promotion re-run, no persisted band
  or forecast changed. **A9.5:** fake-pipeline unit tests cover Bolt, and Chronos-2
  primary / fallback / resource-guard-substitution paths.
- **WP9b (G9.6, A9.6):** `eval/chronos2_covariate_probe.py`. Chronos-2 with only
  known-future calendar covariates (bank holiday, Ellel event, school/university term;
  weather excluded) gives a small mean MASE improvement over univariate (0.793 to
  0.779). Report-only, no ladder or gate impact.

### WP10: VUS-PR computed (A10.1 to A10.3)
Rerun in `.venv-eval` with TSB-AD importable. S6b of `PRJ93_Agent_Eval_Report.md`
is now a populated (kind, venue, N, VUS-PR) table via the pinned
`TSB_AD.evaluation.metrics.get_metrics` (named as **TSB-AD 1.5**). Sustained events
score high (regime/exo 0.90 to 0.99), single-day spikes lower (0.76 to 0.91).
stock_drawdown still excluded; exo_coincident labelled as a sustained shift (D13).
Only the S6b section changed. **D14 closed.**

### WP11: closeout
- G11.2: the remaining "Tan ablation" wording in `transfer/lovo.py` (verdict strings
  and report header) is qualified to the real criterion; `grep "Tan ablation"` now
  returns nothing (A11.2). **Build-report D4 closed.**
- G11.4: the ADI blind-spot sentence (dense-then-dead items like Lancashire crisps
  are the Teunter-Syntetos-Babai case, out of scope) is in both the diagnostic report
  and decision-log row 1 (A11.4).
- G11.1: decision-log Section B appended with the four addendum rows; Section A row 3
  annotated as superseded.
- G11.3 / A11.3: this report plus the build-report addendum section; both suites green.

---

## 2. Deviations from the addendum spec

Continuing the D-numbering from the first build report (which ended at D18).

- **D19. Python provisioned via uv.** No system 3.11/3.12 was present, so 3.12.13 was
  installed with `uv` and `.venv-eval` created from it. The venv is uv-managed and
  pip-less, so installs used `uv pip`. Gitignored.
- **D20. chronos-forecasting 2.3.1, not 2.2.2.** The spec cites 2.2.2 as the latest at
  writing; 2.3.1 is now current and satisfies the `>=2.2` pin. Chronos2Pipeline is
  present and works.
- **D21. S10 fallback API corrected for Chronos-2.** The spec's fallback
  `predict_quantiles(context=<1D tensor>)` returning a `[batch, H, levels]` array
  raises on Chronos-2: `BaseChronosPipeline.from_pretrained("amazon/chronos-2")`
  returns a `Chronos2Pipeline` whose `predict_quantiles` takes `inputs` (a list of
  series) and returns a list of `[1, H, levels]` tensors. The fallback was implemented
  against the real signature (`inputs=[tensor]`, median = `q[0][0, :, 1]`). The primary
  `predict_df` path works, so the fallback is not exercised in the run.
- **D22. chronos_bolt_predict NOT kept literally unchanged (contra G9.1).** The chronos
  2.x line renamed the Bolt pipeline's first argument from `context` to `inputs`, so
  the WP4 code raises `TypeError` under 2.x. Keeping it literally unchanged would break
  the same-family comparison row that G9.1 wants. The minimal kwarg fix (context to
  inputs) was made; the output shape `[batch, H, levels]` is unchanged, so median
  extraction is identical. Bolt now scores on both venues.
- **D23. Resource-guard timeout is best-effort.** The 120s guard uses SIGALRM, which is
  main-thread only; off the main thread it falls through without a hard limit. It wraps
  the model load. In practice it never triggered (weights cached, CPU load is seconds).
- **D24. Prophet installed into the eval venv.** So the committed ladder reports are a
  proper superset (prophet plus both Chronos entrants). Without it the eval-venv reports
  would drop the prophet rows the runtime reports carry. Prophet is a runtime-optional
  dependency, not an eval dependency, so it is not added to requirements-eval.txt.
- **D25. Committed ladder reports are the backend-present (eval-venv) artifacts.** Per
  G9.4/A9.1 they must show the real Rung-4 rows. A9.3 byte-identity was therefore
  verified separately, by diffing post-WP9 runtime-venv output against the WP4-committed
  (pre-WP9) reports (empty diff), not by comparing against the committed files. A
  runtime-venv rerun will differ from the committed reports by design (it has no Chronos
  rung).
- **D26. Eval-venv full pytest OOM in one process.** Running the whole suite in a single
  process (torch + prophet/cmdstanpy + numba + transformers + duckdb, cumulative) was
  killed with exit 137 on the sandbox memory ceiling. Green was demonstrated by running
  in chunks: non-ladder/foundation 213 passed, foundation 8 passed, ladder 7 passed;
  228 total, 0 skipped. This is a memory limit, not a test failure.
- **D27. test_a7_transfer absent-branch test made deterministic.** The pre-existing
  `test_foundation_dropped_per_ablation_when_absent` asserted the no-backend branch by
  relying on the environment; with chronos present in the eval venv it failed. It now
  forces the import to fail via monkeypatch, so it tests the intended branch and holds
  in both venvs.
- **D28. Covariate probe nuances the null, does not overturn it.** Covariates help
  modestly (0.793 to 0.779) rather than not at all; the Discussion wording should say
  "a small real improvement", not "no help".

---

## 3. Stop conditions

None were hit. Python 3.12 was available via uv; the Chronos-2 weights downloaded
once from Hugging Face; the flagship `amazon/chronos-2` loaded within the resource
guard (no substitution needed); and no step altered detection thresholds, briefing
weights, gate criteria, or persisted forecasts. The Rung-4 gate outcome (adopted on
Beer Hall, passes the criterion but not selected on TRT, capped on Ellel) is reported
exactly as the gate decided.

## 4. Files changed (addendum)

New: `eval/chronos2_covariate_probe.py` (+ its `.md`),
`PRJ93_Fidelity_Corrections_Addendum_Report.md`.
Edited: `models/foundation.py`, `models/ladder.py`, `models/intermittent.py`,
`eval/agent_eval.py`, `eval/intermittency_diagnostic.py`, `transfer/lovo.py`,
`requirements-eval.txt`, `.gitignore`, `tests/test_foundation.py`,
`tests/test_intermittent.py`, `tests/test_a7_transfer.py`,
`PRJ93_Decision_and_Resolution_Log.md`, `PRJ93_Agent_Eval_Report.md`, plus
regenerated report markdown under `models/`, `hierarchy/`, `eval/`, `transfer/`.

---

## 5. WP12 addendum: Chronos-2 live-serving promotion

Implements `PRJ93_Chronos2_Promotion_Spec.md` on child branch
`feat/chronos2-promotion` (off `fix/fidelity-corrections`). D-numbering
continues from D28. This section is appended here per G12.8's own instruction;
the full narrative (including the headline finding) is in the dedicated
`PRJ93_Chronos2_Promotion_Report.md`, which is the primary deliverable for this
spec.

### What was delivered

- **G12.1** `rung4_chronos2_exo` (`models/foundation.py`): a third Rung-4
  entrant reading exactly `CHRONOS2_EXO_COLS` (is_bank_holiday, is_ellel_event,
  exo_is_school_term, exo_is_uni_term; never weather), raising
  `MissingCovariateError` on any missing/NaN covariate rather than falling back
  to the univariate path. Wired into `PREDICTORS` alongside the other two
  entrants, subject to `MAX_RUNG`.
- **G12.2** Gate run (eval venv, `models.ladder --all-venues`): `rung4_chronos2_exo`
  scores rolling MASE **0.779** on Beer Hall, matching F1 and winning the
  6-fold preview milestone. No stop condition.
- **G12.3** `requirements-forecast.txt` + `.venv-forecast` (Python 3.12,
  uv-provisioned, gitignored): chronos-forecasting + torch only, verified
  installable and correctly excludes eval-only deps. README nightly one-liner
  added.
- **G12.4** Environment guards in `ingest/refresh.py`: `_is_rung4()`, a refit
  guard (`_refit_ladder`) and a promotion guard (`_promote_and_serve`) that
  skip loudly with no audit row / no upsert when a Rung-4 model is served and
  `HAS_CHRONOS` is False. `refresh(..., allow_fallback=True)` (also exposed on
  `POST /refresh`) is the sole, audited escape hatch. Cadence untouched.
- **G12.5** Exogenous coverage verified empirically (zero NaN, both venues,
  full history) for the paths that actually call the entrant today; documented,
  precisely, that F7's "Ellel events... bookings" claim does not match the
  codebase (`is_ellel_event` is derived from Ellel's own observed revenue, not
  a forward-looking table) and that this only matters via
  `_persist_standby_forward`, which never fires for the open Beer Hall.
- **G12.6** Actual promotion run, `.venv-forecast`, clean store. **Headline
  finding: the real T3 refit (4 folds, no prophet - pre-existing, unmodified
  settings) selects plain `rung4_chronos2` (MASE 0.823), not
  `rung4_chronos2_exo`** (0.834 at that fold count), diverging from G12.2's
  6-fold preview. Reproducible, deterministic. Accepted per "the gate decides,
  formally"; not hand-picked. `served_forecast(beer_hall)` verified serving
  `rung4_chronos2` cleanly. TRT/Ellel come out unchanged (neither had a served
  model before or after); force-refitting TRT as a trial surfaced an unrelated,
  pre-existing bug (`rung3_gbm` cannot be served via `wrap.evaluate`), left
  untouched and out of scope.
- **G12.7** `eval/chronos2_promotion_sensitivity.py`: 0 of 28
  `signals.deviation.scan` rows differ before/after promotion. Confirms F6's
  premise does not hold for this codebase - the deviation signal never reads
  the served band.
- **G12.8** Decision-log Section B row 5 (this document's companion log);
  tests: `test_is_rung4_matches_any_rung4_entrant`,
  `test_refit_guard_skips_loudly_with_no_audit_row_when_backend_absent`,
  `test_promotion_guard_skips_and_leaves_band_untouched_when_backend_absent`,
  `test_operator_approved_fallback_writes_audited_selection_row` (all in
  `tests/test_ingest_refresh.py`), plus five in `tests/test_foundation.py`
  (missing-covariate raise x2, never-reads-weather, happy-path future_df,
  best-entrant selection). Runtime venv: 230 passed, 6 skipped throughout WP12.

### Deviations from the WP12 spec

- **D29. `chronos2_exo_predict` fails in the STATIC evaluation regime.**
  Chronos-2's `predict_df` requires `future_df` to be a gap-free continuation
  of `context_df`; `harness.time_split`'s static split reserves a ~29-day
  validation buffer between train and test, violating that. The entrant raises
  loudly (correct per the style rule); the milestone gate (rolling only) and
  the promotion path (`wrap.evaluate`, gap-free by construction) are
  unaffected. Not worked around (no `validate_inputs=False`).
- **D30. `requirements-forecast.txt` is an addendum file, not `-r requirements.txt`
  plus additions.** Matches the existing `requirements-eval.txt` precedent
  rather than the spec's literal "runtime requirements plus X" phrasing, which
  could be read either way.
- **D31. `allow_fallback` also exposed on `POST /refresh`.** G12.4 specifies
  `refresh(..., allow_fallback=True)` as a Python-API flag; `/refresh` is the
  actual operator-facing surface in a deployed system, so `RefreshRequest`
  gained the same field (default False) to make the flag genuinely reachable
  by "the operator," not just a raw Python call.
- **D32. F7 ("Ellel events... a bookings table") does not match the codebase.**
  `build_features._ellel_event_dates` derives `is_ellel_event` from Ellel's own
  observed L1 revenue (`value > 0`); there is no forward-looking events table.
  Documented as a dormant limitation (G12.5), not fixed - no real bookings data
  exists to extend from, and fabricating one would be exactly the imputation
  the spec forbids.
- **D33. The actual T3 gate does not select the covariate variant (the
  headline finding).** See "What was delivered," G12.6. The spec's opening
  decision framing names "the Chronos-2 covariate variant" as the option
  chosen; the mechanically-determined promotion is plain Chronos-2. Surfaced
  prominently, not smoothed over; reconciling T3's fold count with the preview
  ladder CLI's is left for Nam.
- **D34. TRT was not force-refit in the final run.** An initial trial
  force-refit of TRT (matching a literal reading of "TRT and Ellel go through
  the same run") surfaced the unrelated `rung3_gbm`/`wrap.evaluate` bug (D-note
  in the promotion report). The final run scopes `force=True` to Beer Hall
  only, per the spec's literal text, and confirms TRT/Ellel remain unpromoted
  (unchanged) via a normal `refit="auto"` pass.
- **D35. `_reset_store()` extended to drop `served_forecast`.** A real
  promotion persists cross-venv-shared on-disk state
  (`brain/store/brain.duckdb`); a leftover Rung-4 served row from this WP12
  work would otherwise trip the new G12.4 guards for the pre-existing G6 test
  (`test_forced_refit_selects_rung_and_logs_selection`), which is not
  exercising those guards. Fixed at the source (`_reset_store`), and the G6
  test now resets explicitly rather than relying on fixture-ordering luck.

### Stop conditions

None were hit in the sense of halting work: no step required altering
detection thresholds, briefing weights, the Square pull cadence, or T3/Phase4
trigger conditions, and every guard preserves the audit trail. The one true
"surprise" (D33) is exactly the kind of gate-decides-formally outcome this
project's stop-condition philosophy anticipates for a losing gate result; it
was reported, not overridden, consistent with G12.2's own contingency wording.

### Files changed (WP12)

New: `models/foundation.py` additions (`chronos2_exo_predict`,
`CHRONOS2_EXO_COLS`, `MissingCovariateError`), `requirements-forecast.txt`,
`eval/chronos2_promotion_sensitivity.py` (+ its `.md`),
`PRJ93_Chronos2_Promotion_Report.md`.
Edited: `models/ladder.py`, `ingest/refresh.py`, `service/app.py`, `README.md`,
`.gitignore`, `tests/test_foundation.py`, `tests/test_ingest_refresh.py`,
`PRJ93_Decision_and_Resolution_Log.md`, plus regenerated
`models/ladder_results_L1_*.md`.

---

## CORRECTION appended 2026-08-14 (S18): the four-fold T3 refit no longer exists

**Appended, not substituted**, per the corrections-are-appended rule in
`PRJ93_RULES.md`. Nothing above this line is edited. The G12.6 bullet in the WP12
summary reads:

> **G12.6** Actual promotion run, `.venv-forecast`, clean store. **Headline
> finding: the real T3 refit (4 folds, no prophet - pre-existing, unmodified
> settings) selects plain `rung4_chronos2` (MASE 0.823), not
> `rung4_chronos2_exo`** (0.834 at that fold count), diverging from G12.2's
> 6-fold preview.

**That was true on 2026-07-08 and it is false now.** `ingest.refresh._refit_ladder`
evaluates at `n_folds=6`, unified with the `models.ladder` CLI backtest at **G12.9a**
(decision log row **6(a)**, report `17_G12_9_Report.md`). The reconciliation this
report and Section B row 5 both left open for Nam was made there, on the side of 6.
There is no live fold-count divergence.

**Verified at source rather than from a row.** `ingest/refresh.py:302` reads
`ladder.evaluate_rolling(venue, n_folds=6, horizon=7, with_prophet=False)`;
`n_folds=6` first entered that file at commit **`a04eb2d6`, 2026-07-08 19:20:09
+0100**. The four-fold path does not exist.

**What still stands from the bullet above.** That the gate was allowed to decide
rather than hand-picked, that the divergence was surfaced rather than hidden, and
the 0.823/0.834 figures as a record of what the four-fold path produced on the day.
What does not stand is any reading of it as a live or open condition. The
`conformal_rung4_chronos2` band still in the store was written 2026-07-08 15:23:41,
four hours and fifty-seven minutes BEFORE the unification commit, so it is
pre-fix output that was never regenerated.

**Why this correction was needed.** Row 5 carried no forward pointer to row 6(a),
and three later work packages (S14, S15, S16) priced a dissertation disclosure for a
divergence that had already been resolved. Full account at decision log row
**111(d)**; the pointer is now in row 5 itself.
