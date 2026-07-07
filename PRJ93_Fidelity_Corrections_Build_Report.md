# PRJ93 Fidelity Corrections: Build Report

**Date:** 2026-07-07
**Branch:** `fix/fidelity-corrections` (off `main`)
**Scope:** implements `PRJ93_Fidelity_Corrections_Spec.md` (WP1 through WP7).
**Status:** complete. Brain pytest **222 passed, 2 skipped** (both are documented
backend skips), up from a **215-passing** baseline. Every work package committed
with its WP id.

No em-dashes are used in this report or in any new report, log, or module docstring,
per the spec's style rule.

---

## 0. Baseline

The spec's invariant is "the existing brain pytest suite must be green before the
first commit and after every work package". That held at every step. Note the
suite is **215 tests**, not the **128** the spec cites: it grew since the spec was
written. The green invariant is what matters and it was satisfied throughout; the
count is a documentation drift, called out here rather than silently accepted.
statsforecast, chronos/torch, and TSB-AD/vus do not build on this Python 3.14 venv,
which shapes several acceptance outcomes below (each called out).

---

## 1. What each work package delivered

### WP1: wording and citation corrections (no behaviour change)
- `conformal/wrap.py` docstring: the band is split conformal recalibrated per
  7-day block in the temporally robust spirit of EnbPI (Xu and Xie 2021); SPCI (Xu
  and Xie 2023) is stated as not implemented; Sun and Yu 2025 noted, not wired.
- `models/ladder.py` and `transfer/lovo.py`: the "Tan ablation" gate is qualified
  to its real criterion (beats rung3_global_gbm on held-out rolling MASE), noting
  Tan et al. (2024) targets LLM-backbone forecasters.
- `eval/agent_eval.py`: the linear weighted miss-to-false-alarm cost sweep is no
  longer called an Ask-F1; the detection F1 is the Ask-F1 analogue. No computation,
  dict keys, or table structure changed.
- **Acceptance:** A1.1 pytest green, count unchanged; A1.2 diff is comments,
  docstrings, and labels only (verified); A1.3 `grep "Ask-F1 cost ="` returns
  nothing. See deviation D3 for the `Xu & Xie 2023` grep nuance.

### WP2: L3 intermittency diagnostic, then conditional Croston/SBA
- `eval/intermittency_diagnostic.py` classifies every L3 item node over the venue's
  trading days (L1 units DOW-median > eps): **17 of 30 non-OTHER nodes are
  intermittent** (ADI >= 1.32), including the keg/consumption-proxy line
  (Lager - BH, ADI 1.55), so the conditional path triggers.
- `models/intermittent.py` implements `croston_classic` / `croston_sba` per S3
  (flat per-period rate; SBA = (1 - alpha/2) x Croston).
- `hierarchy/reconcile.py` scores croston_sba against DOW-median per intermittent
  node on the held-out block (MAE + MASE); adopts only on a MASE win. **Outcome:
  DOW-median wins on all 17 nodes**, so nothing is swapped and coherence is
  unchanged. The per-node table is in `hierarchy/reconciliation_forecast.md`.
- **Acceptance:** A2.1 diagnostic report present, all four statistics; A2.2 unit
  tests green (hand-computed example; SBA = 0.95 x Croston; statsforecast
  cross-check skipped with reason, see D5); A2.3 MinT coherence holds (venue and
  category discrepancy 0); A2.4 full pytest green.

### WP3: FLAG-CP1 resolution
- `config.py`: `CP_TARGET_ARL0 = 75` replaced by `CP_ARL0_EMPIRICAL_LB = 400`
  (empirical ARL0 right-censored at the 400-day horizon); `CP_CUSUM_H = 5.0`
  retained; the "CALIBRATE to ARL0" imperative removed.
- `eval/change_point_eval.py` reports the operating point as a resolved decision.
- **Acceptance:** A3.1 config shows resolved wording, no CALIBRATE imperative; A3.2
  report regenerated as a decision; A3.3 no detector constant changed, TRT closure
  detection identical (onset 2026-05-08, delay 8) before and after.

### WP4: Rung 4 Chronos-Bolt zero-shot through the adoption gate
- `models/foundation.py`: `chronos_bolt_predict` per S1 (amazon/chronos-bolt-small
  pinned, CPU, 0.5-quantile point forecast clipped at 0, pipeline loaded once).
- `models/ladder.py`: when the backend imports, `("rung4_chronos_bolt", 4, ...)`
  joins PREDICTORS and climbs the same gate in both regimes, subject to MAX_RUNG
  (Ellel stays at Rung 1). The report states the outcome strictly by the gate and
  records whether it beats rung3_global_gbm. When the backend is absent the ladder
  is byte-identical.
- **Acceptance:** A4.1 backend-absent output byte-identical (verified by report
  diff for all three venues); A4.4 no promotion re-run (ladder is report-only).
  A4.2 and A4.3 require the backend installed, which is not possible here (see D10);
  the present path is unit-tested with a fake pipeline.

### WP5: detector-level VUS-PR supplement
- `eval/agent_eval.py`: `vus_pr_supplement` computes VUS-PR per (kind, venue) on the
  continuous z score via the pinned TSB-AD library (VUS fallback), never
  reimplemented. New section S6b, additive only (existing scaled numbers unchanged).
- **Acceptance:** A5.1 metric via the pinned library only; A5.2 keyed by
  (kind, venue) with N, stock_drawdown excluded with the stated reason; A5.3
  existing scaled numbers unchanged. Neither library installs here, so S6b records
  "not computed, dependency unavailable" (see D12 for the report-filename nuance).

### WP6: ACI coverage across the TRT closure (report-only)
- `eval/aci_closure_probe.py`: walks the TRT residual stream forward daily,
  comparing static split conformal (0.90) against ACI (alpha_1 = 0.10, gamma in
  {0.005, 0.01, 0.02}) per S5. Reports rolling 28-day coverage, pre/post/overall
  means, a plot, and the deterministic miscoverage bound per gamma.
- **Finding:** neither static nor ACI recovers coverage post-closure (both ~0.5);
  the break is in the mean, not the spread, so spread-adaptation cannot restore it.
- **Acceptance:** A6.1 update rule verified symbol-for-symbol (telescoping identity)
  plus the bound, in `tests/test_aci_closure_probe.py`; A6.2 the report states the
  policies' post-closure coverage plainly; A6.3 no production code touched (see D15
  on the mandated unit test's location).

### WP7: decision-log rows
- `PRJ93_Decision_and_Resolution_Log.md` created (it did not previously exist) with
  the six WP-cited rows in spec order.

---

## 2. Deviations from the spec

Every departure from a literal reading of `PRJ93_Fidelity_Corrections_Spec.md`,
with the reason.

- **D1. Test count.** Spec cites 128 tests; the suite is 215 at baseline (222 + 2
  skipped after this work). The green invariant held throughout; the count is stale
  in the spec. No action beyond flagging it.
- **D2. Style vs existing convention.** The no-em-dash rule is honoured in all new
  report, log, and docstring prose. Where an edit landed on an existing
  em-dash-delimited docstring line (for example the ladder Rung-4 line, the
  agent_eval cost docstring), the surrounding em-dash was preserved so the diff
  reads consistently with its heavily em-dashed neighbours. Existing em-dashes
  elsewhere were not mass-edited (out of scope).
- **D3. A1.3 grep spelling.** The G1.1 instruction body writes "Xu and Xie 2023",
  so the corrected sentence uses "and". A1.3's literal `grep "Xu & Xie 2023"`
  therefore returns nothing (rather than "only the SPCI sentence"). The intent, no
  lingering misattribution of the calibration to 2023, is satisfied.
- **D4. lovo.py Tan scope.** G1.2 scopes the lovo.py change to "(docstring)", so
  only the module docstring was qualified. The runtime verdict strings and the
  report header in lovo.py still contain "Tan ablation"; they were left untouched
  to respect the explicit site list. Flagged in case a wider sweep is wanted.
- **D5. statsforecast cross-check skipped.** WP2 test (b) uses `pytest.importorskip`;
  statsforecast does not build on the Python 3.14 venv (scipy/numba). The spec
  explicitly permits a documented skip. Tests (a) and (c) fully validate the
  recursion and the SBA factor.
- **D6. WP2 trigger interpretation.** "Non-OTHER keg/consumption-proxy node" is read
  as any non-OTHER L3 item node; the trigger fires if any is intermittent. The keg
  line itself is intermittent, so this reading does not change the outcome.
- **D7. WP2 adoption outcome.** croston_sba wins on 0 of 17 nodes, so no base
  forecast is swapped and the reconcile production path output is unchanged. This is
  the gate deciding, not a spec departure, but it is worth stating plainly.
- **D8. WP2 band residual for adopted nodes.** For any adopted node the conformal
  band residuals are recomputed from the Croston forecaster (so the band matches the
  point). Moot here since none adopted, but implemented for correctness.
- **D9. WP2 "append" to reconciliation_forecast.md.** `_write_report` regenerates
  the whole file, so the comparison table is added as a regenerated section rather
  than a literal file append; this avoids duplication on re-run. Same net content.
- **D10. WP4 backend not installable.** chronos-forecasting and torch do not build
  on the Python 3.14 venv, so A4.2/A4.3 (backend-present rows and adoption decision)
  are not exercisable here. A4.1 (backend-absent byte-identity) is verified, and the
  present path is unit-tested with a fake pipeline. The numeric zero-shot result is
  pending an environment where the backend installs.
- **D11. WP4 report header punctuation.** The new Rung-4 report header uses a colon
  ("## Rung 4: Chronos-Bolt zero-shot") rather than the em-dash sibling headers use,
  to honour the no-em-dash rule.
- **D12. WP5 report filename.** The spec names PRJ93_Scaled_Eval_Report.md, but the
  scaled run's `REPORT_MD` is PRJ93_Agent_Eval_Report.md (that is where the S
  sections are written; PRJ93_Scaled_Eval_Report.md is a hand-written analysis report
  that points to it). The generated S6b table therefore lands in the Agent report;
  the required narrative paragraph was added to the hand-written scaled report.
- **D13. WP5 exo_coincident labelling.** The spec's label rule names regime_shift and
  spike only. exo_coincident is a sustained z shift, so it is labelled like a regime
  shift (onset to window end). stock_drawdown is excluded as specified.
- **D14. WP5 metric not computed.** Neither TSB-AD nor the vus fallback installs on
  the Python 3.14 venv, so the supplement reports "not computed, dependency
  unavailable" per the spec's own fallback instruction. The metric is never
  approximated by hand.
- **D15. WP6 unit-test location.** A6.3 asks for zero diff outside `brain/eval/`, but
  A6.1 mandates a unit test, and pytest collects only from `brain/tests/`. The test
  file is the sole non-eval addition; no production code is touched.
- **D16. WP6 empirical finding.** ACI does not beat static through the closure (both
  ~0.5 post-closure), which is not the "ACI recovers coverage" result one might
  expect. The break is a permanent mean shift, not a spread change, so this is the
  honest and pedagogically correct outcome; it is reported as such.
- **D17. requirements-eval.txt.** Created as a new file (not touching runtime
  requirements) with statsforecast, chronos-forecasting, torch, TSB-AD, and vus.
- **D18. No remote push.** All work is local on `fix/fidelity-corrections`. The spec
  names a GitHub repo; nothing was pushed, and the reader should push and open the PR.

---

## 3. Stop conditions

None of the spec's stop conditions were hit: no existing test broke (the two skips
are clean `importorskip` guards, not failures); no gate required changing detection
thresholds, briefing weights, or persisted forecasts beyond what a WP authorised
(WP2's adoption gate chose DOW-median, so nothing was swapped). The three heavy
backends that do not build on Python 3.14 degrade exactly as the spec's fallbacks
prescribe (documented skip or "not computed"), which is a designed path, not a stop.

## 4. Files changed

New: `models/foundation.py`, `models/intermittent.py`,
`eval/intermittency_diagnostic.py`, `eval/aci_closure_probe.py`,
`tests/test_foundation.py`, `tests/test_intermittent.py`,
`tests/test_aci_closure_probe.py`, `requirements-eval.txt`,
`PRJ93_Decision_and_Resolution_Log.md`, this report.
Edited: `conformal/wrap.py`, `models/ladder.py`, `transfer/lovo.py`,
`eval/agent_eval.py`, `config.py`, `eval/change_point_eval.py`,
`hierarchy/reconcile.py`, `PRJ93_Scaled_Eval_Report.md`, plus regenerated report
markdown under `eval/`, `hierarchy/`, and `models/`.
