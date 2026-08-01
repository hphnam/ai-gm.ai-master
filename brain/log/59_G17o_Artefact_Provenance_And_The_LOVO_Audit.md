# Report 59 - S9 G17o: artefact provenance settled, and the LOVO gate audited

Date: 2026-08-01. Branch `brain-construction-local`. Store ceiling 2026-07-07. Style: no
em-dashes, plain prose, loud failures, verify before asserting, pre-register before running.

Closes the two artefact items report 58 left open. Audits `transfer/lovo.py` under G2 and
finds a second, larger defect in it that G2 has nothing to do with. The G2 gate itself is
NOT closed here: it is a methodology decision and it is presented for a human call.

## 1. `deviation_eval.md` was stale, and report 57 said so for the wrong reason

Report 57's sweep recorded this artefact as "orphaned, its module no longer exists". Both
clauses are false. `signals/deviation.py` exists, is executable, documents
`python -m signals.deviation` in its own docstring, and writes the artefact in
`_write_report`. The row was written without being checked against the module, and the
cost of that was a further sweep in which the artefact was not regenerated because it had
been recorded as having no owner.

It was genuinely stale, for the reason report 58 established rather than the reason report
57 gave: the suite resolved artefact paths into the checkout, so the committed copy was
`pytest` output at the seed ceiling.

Regenerated from the production entrypoint at ceiling 2026-07-07:

| Venue | committed (test output, 2026-05-31) | regenerated (2026-07-07) |
|---|---|---|
| The Beer Hall | 2026-05-31 normal, z -0.25 | 2026-07-05 normal, z -0.08 |
| Ellel Village Hall | 2026-05-16 **deviation up, z +6.22** | 2026-07-04 normal, z +0.67 |
| Two River Taps | 2026-05-31 normal, z -0.66 | 2026-07-05 normal, z -0.60 |

The committed file was on record showing Ellel more than six band-halves above its interval
with an unexplained-operational-change attribution. That is now gone: it was an artefact of
reporting a mid-May day as the latest trading day, five weeks after the estate had moved on.

**Noted, not fixed:** the regenerated Two River Taps row reports 2026-07-05 as a trading
day with actual 0.0, two months after the venue closed on 2026-05-08. The committed file
has the same shape at its own ceiling, so this is a pre-existing property of the residual
stream's trading-day filter and not something this regeneration introduced. It is recorded
here rather than repaired, because deciding what a closed venue's "latest trading day"
should be is a specification question and the frozen-control argument in `sec:design`
depends on the answer.

## 2. `judge_prompts.md` was never stale, and report 58 was wrong to imply it was

Regenerated from `python -m eval.judge`: **byte-identical to the committed file.** The run
is the offline emit-prompts seam (`JUDGE_LIVE` unset, no key resolvable), so it is
deterministic and costs nothing; no live judging was run and no kappa is claimed.

The reason it does not move is deliberate and documented at the constant:

```
AGENT_EVAL_STREAM_CEILING = os.environ.get("BRAIN_AGENT_EVAL_CEILING", "2026-05-31")
```

The injection-oracle corpus is a controlled experiment pinned to a fixed clean window so it
cannot slide with the operational clock into the live World Cup, whose real exogenous signal
would confound the synthetic exo-attribution scenario. `eval/inject.base_stream` applies the
cap. So the artefact's May dates are the design working, not staleness.

Report 58 said both committed copies were "test output rather than real runs" and left both
unverified. That conflated two separate properties. The suite did overwrite this file, and
the committed content is nonetheless correct, because the pin makes the output independent
of the store ceiling. Being clobbered and being wrong are not the same thing, and only one
of the two artefacts was both.

## 3. The LOVO audit: the G2 violation is real, and it is the smaller finding

`transfer/lovo.py` does write an artefact, `transfer/transfer_results.md`. Report 57's
statement that neither violating module is written up refers to the thesis, and that part
checks out: `lovo`, `leave-one-venue`, `transfer_results`, `donor` and `partial-pooling`
return zero matches in the live `chapters/results.tex`, and `chapters/methodology.tex` has
no transfer section. **Nothing is retracted either way.**

### The G2 fault

Ellel is scored on `calendar_lag7` MASE and pooled with the other two venues. Under G2 that
is two faults, as report 57 stated: Ellel has no defensible scaled error, and a pooled MASE
across venues is only meaningful if MASE is meaningful at each. `tab:bases` is the evidence
already in the thesis: Ellel's scale runs 180.1 on `calendar_lag7` against 770.8 on
`trading_lag7`, a factor of more than four on the denominator alone.

### What fixing it would and would not change

Committed table, 14-day cold start:

| Held-out venue | MASE transfer | MASE naive | delta [90% CI] | MCS |
|---|---|---|---|---|
| The Beer Hall | 0.872 | 1.243 | -0.371 [-0.391, -0.348] | transfer |
| Two River Taps | 1.184 | 0.700 | +0.486 [+0.442, +0.529] | naive |
| Ellel Village Hall | 0.927 | 1.319 | -0.373 [-0.488, -0.300] | transfer |

**The pooled headline is already null.** Over 153 blocks the mean difference is -0.119 MASE
with a 90 per cent CI of [-0.242, +0.036], straddling zero, and the MCS retains both
methods. The artefact states this plainly. So correcting the pool does not retract a
positive claim, because there is no positive pooled claim to retract.

What it does change is the count. Dropping Ellel takes the tally from 2 of 3 to 1 of 2, one
win and one loss, across an estate in which the remaining loss is the venue that closed. The
crossover table, on which the entire partial-pooling narrative rests, is also computed over
all three venues at every window. A 1-of-2 crossover is not a story.

## 4. The larger finding: the LOVO gate passed only because torch was missing

This is not a G2 matter and report 57 did not see it.

```python
foundation_ok = (not out["foundation"]["available"]) or \
    out["foundation"].get("beats_global_gbm", False)
```

`_foundation_ablation` probes for `chronos`, `timesfm`, `moirai`. On a hit it returns
`{"available": True, "backend": ..., "verdict": "evaluate zero-shot vs global GBM; adopt
only if it beats it on held-out rolling MASE"}`. That verdict is an **instruction, not a
result**, and the returned dict carries no `beats_global_gbm` key. So the `.get(...,
False)` fallback resolves to `False`.

Measured in both environments:

| Environment | `available` | `foundation_ok` |
|---|---|---|
| `.venv-run` (no backbone) | False | **True** |
| `.venv-forecast` (chronos 2.3.1, torch 2.12.1) | True | **False** |

The committed artefact records `available: False` and the gate as **PASS**. That PASS was
contingent on the backbone being absent. Installing the backbone that the ladder's rung 4
requires, which report 58 did, flips this gate to FAIL, and it fails on an unimplemented
evaluation rather than on a model losing a comparison. The branch that fires when the
backbone is present was never finished.

This is the same class of defect as the `weather_diagnostic.py` crash in report 57: a code
path that no run had exercised, kept alive by an environment that could not reach it. The
argument for building the venvs is the same argument as the one for regenerating artefacts.

The committed artefact is therefore **stale in its second clause** as of report 58, and is
deliberately not regenerated here, because regenerating it under `.venv-forecast` would
write a FAIL produced by missing code rather than by evidence.

## 5. G2 gate CLOSED by decision: Ellel separate, pool the two

Decision taken by the supervisor on 2026-08-01, with the narrative cost stated in advance
and accepted: report Ellel on unscaled MAE, pool only the two scaled venues, state the
reduced pool. Implemented against `config` as the single source of truth rather than a
fourth private copy of the rule.

### A third fault, found while implementing the first two

`config.VENUE_SCALE_BASIS` rules `calendar_lag7_active` for the two scaled venues.
`lovo.py` hard-coded `calendar_lag7` for all three. So the basis was wrong even for the
venues that admit one, and correcting it moves a headline number:

| Venue | basis | transfer | naive |
|---|---|---|---|
| Beer Hall | `calendar_lag7` (was) | 0.872 | 1.243 |
| Beer Hall | `calendar_lag7_active` (ruled) | **1.242** | 1.771 |
| Two River Taps | either | 1.184 | 0.700 |

Two River Taps is unchanged because `_active_series` already trims its closure tail, so
the two bases coincide there. The Beer Hall is not, and the correction crosses 1.0.

**That crossing is the substantive result.** A MASE above one is worse than the
seasonal-naive reference the denominator is built from. On the ruled basis, shape-transfer
at the anchor venue does not beat the benchmark; it beats a cold-window baseline that is
poorer still (1.771). The committed 0.872 read as beating the benchmark. The forecasts did
not change, the denominator did.

### What the corrected artefact says

- Per-venue rows carry their own `loss` column and are not comparable across rows.
- Win count and pool run over the two scaled venues only: **1 of 2** at the 14-day window.
- Pooled over 100 blocks: -0.072 MASE, 90% CI [-0.295, +0.154], MCS retains both. The old
  three-venue pool reported the same null by averaging Ellel's pounds with two
  dimensionless MASE series, so its direction was right by an inadmissible route.
- Crossover sweep is 1/2, 0/2, 0/2, 0/2, 0/2. The heading no longer claims transfer's
  advantage is greatest when history is shortest, because a descent through counts out of
  two is equally consistent with one venue plus noise.
- **Gate verdict: NOT EVALUABLE**, not FAIL. The criterion is a majority over three scaled
  venues and the estate supplies two. Reporting FAIL would assert a criterion result where
  the criterion does not apply. `main()` would otherwise have computed `(2 // 2) + 1 = 2`
  and silently demanded unanimity.

### The test that had to be replaced

`test_transfer_wins_majority_at_cold_start` asserted `transfer_wins >= majority`, which
encodes the estate-level claim now withdrawn. It was replaced rather than relaxed, by four
tests of the corrected behaviour: the scaled pool is under three, the unscaled venue is
reported but never counted, it is scored in currency, and each scaled venue uses the basis
`config` rules for it. A test that had been made to pass by weakening its bound would have
been the same defect one level up.

## 6. Foundation gate CLOSED: the comparison implemented, and the rung adopted

Instructed on 2026-08-01 to implement it rather than keep the rung dropped on other
grounds. `_foundation_adoption` now runs the criterion the gate has always named: zero-shot
Chronos-2 against the global GBM on held-out rolling MASE, paired within fold over the
ladder's 6-fold rolling origin at horizon 7.

Two scoping decisions, both consequences of G2 and both stated in the code:

- Scored only where a scaled error is defensible, because the criterion is a MASE
  comparison. Ellel is excluded for the same reason it is excluded from the transfer pool.
- Adoption requires a win at EVERY such venue. Two venues carry no majority, and unanimity
  is the conservative bar for adopting a pretrained backbone over a fitted baseline that
  already exists.

A fold that either arm cannot score is dropped from both, never from one: keeping the
GBM's score on a fold the backbone failed would compare them on different windows.

**Result: ADOPTED.** Superseded at 24 folds in section 7; the 6-fold figures are kept here
because the sequence is the finding.

| Venue | folds | dropped | foundation MASE | global GBM MASE |
|---|---|---|---|---|
| The Beer Hall | 6 | 0 | **1.180** | 1.250 |
| Two River Taps | 6 | 0 | **0.559** | 0.641 |

Zero-shot Chronos-2 beats the global GBM at both, by 0.070 and 0.082 MASE. At this fold
count the Beer Hall figure sits above 1.0 on the ruled basis, so the rung beat the GBM
while both remained worse than the seasonal-naive reference there. **That reading did not
survive the wider window and is withdrawn in section 7.**

### A zero-width confidence interval, caught before it was reported

The first run emitted `-0.070 [-0.070, -0.070]` and `-0.082 [-0.082, -0.082]`. Those are
not intervals. `mcs.BLOCK_LEN` is 7 and the comparison has 6 folds, so the moving-block
bootstrap has exactly one admissible block, every resample reproduces the original series,
and the percentile interval collapses to a point mass at the observed mean. Measured
directly: at n=6 the resampler returns **1 distinct row** out of 200 draws, against 200 of
200 at n=45 and n=55.

A zero-width CI does not read as "no evidence", it reads as infinite precision, which is
the worse failure. `_dispersion` now returns `insufficient` whenever the sample is at or
below the block length, and the report prints "no dispersion" plus an explicit paragraph
saying the adoption rests on the mean comparison alone. The transfer folds carry 45 to 55
blocks, so the guard moves no existing number.

The defect was in code written for this task and it was caught by looking at the output
rather than by a test, which is worth recording: the tests asserted the decision logic and
would not have flagged a degenerate interval.

### Coverage for a branch that had none

The adoption branch had no tests at all, which is exactly why it could return an
instruction string and no `beats_global_gbm` key for as long as no backbone was
importable. Five tests now cover it, and they stub the per-venue comparison so they run in
every venv rather than only where torch is installed: the key is always present, a loss at
one venue blocks adoption, an unscorable backbone is not adopted, an importable backbone
with no implemented predictor (timesfm, moirai) is not adopted, and the unscaled venue is
never scored by the criterion.

### The gate is now reported as two clauses

Previously one verdict covered both, so the transfer clause's NOT EVALUABLE would have
hidden a foundation failure. The report states them separately: transfer NOT EVALUABLE,
foundation PASS (adopted), overall NOT EVALUABLE governed by the transfer clause.

## 7. Three follow-ups, and one of them overturned a finding

Instructed on 2026-08-01: stamp runtime identity onto artefacts, widen the foundation
window, and align the ladder with `VENUE_SCALE_BASIS`.

### 7.1 Runtime identity (`provenance.py`)

A new root module, alongside `config.py` and `org_profile.py`, answering "what produced
this". It reports the four coordinates `sec:repro` argues are part of a result's identity
and which no artefact carried: the venv, the compute device, the resolution of the seven
libraries that have actually moved a number here, and the store ceiling. Every field is
best-effort and reports `unknown` rather than raising, because a stamp that crashes a
report generator is worse than a missing field.

Stamped into the LOVO artefact and the ladder tables, the two whose content depends on
whether a backbone is importable.

It paid for itself immediately. The two venvs are not the same environment:

| | `.venv-run` | `.venv-forecast` |
|---|---|---|
| Python | 3.14.0 | 3.12.13 |
| pandas | 3.0.5 | **3.0.3** |
| duckdb | 1.5.5 | **1.5.4** |
| device | n/a (no torch) | mps |

Two libraries differ between the environments this project runs its numbers in, and
nothing on any artefact said so before today. `sec:flip` withdrew a specific claim about a
library upgrade reversing a selection, but its general argument, that an unpinned
resolution makes a selection unverifiable, is exactly what this table shows was live.

### 7.2 The foundation window widened to 24 folds, and a finding withdrawn

Six folds met the criterion's letter and left it with no dispersion at all. Both scaled
venues supply 24 folds in full at this horizon and minimum training length, so neither is
evaluated on fewer than the other. 24 is comfortably above `mcs.BLOCK_LEN`, so the
bootstrap regains resampling freedom and the intervals are real:

| Venue | folds | foundation MASE | global GBM MASE | Δ [90% CI] |
|---|---|---|---|---|
| The Beer Hall | 24 | **0.643** | 0.760 | -0.117 [-0.139, -0.073] |
| Two River Taps | 24 | **0.595** | 0.811 | -0.216 [-0.361, -0.158] |

**Both CIs exclude zero.** The adoption no longer rests on a bare mean comparison: it is
supported with dispersion at both venues, which is a materially stronger result than the
criterion asked for.

**And it withdraws the caveat from section 6.** The Beer Hall's foundation MASE is 0.643 at
24 folds, not 1.180. The claim that the rung beat the GBM while both stayed worse than
seasonal-naive was an artefact of which six windows the narrow origin happened to select,
not a property of the venue. A six-fold mean was not merely imprecise, it pointed the wrong
way on a qualitative question, and it did so while looking like a clean pass. That is the
argument for the wider window in one line, and it is the reason the caveat is withdrawn
rather than quietly dropped.

### 7.3 The ladder aligned to the ruled basis

`evaluate_rolling` hard-coded `calendar_lag7`. It now takes the venue's basis from
`config.VENUE_SCALE_BASIS`, and for a venue ruled `unscaled` it scores unscaled MAE and
RMSE rather than dividing by a denominator the estate has ruled indefensible.

The blast radius was checked before anything was changed, because `ingest/refresh.py` uses
this function to select the SERVED model. **Selection is unchanged at every venue**, under
both the basis switch and Ellel's move to MAE:

| Venue | best, `calendar_lag7` | best, ruled basis | full ordering |
|---|---|---|---|
| Beer Hall | rung1_robust_dow | rung1_robust_dow | identical |
| Two River Taps | rung2_ets | rung2_ets | identical |
| Ellel (MASE vs MAE) | rung1_robust_dow | rung1_robust_dow | identical |

Magnitudes move; order does not. Beer Hall 1.267 to 1.021, Two River Taps 0.597 to 0.524,
Ellel to 74.141 in pounds.

`metrics["MASE"]` was the key every consumer read, including the serving path. Storing
Ellel's MAE under it would have been the same naming lie corrected in `lovo.py`, so the
primary value is now keyed by the name of the quantity in it, with `loss` and `basis`
alongside and a `primary_loss()` accessor reading through them. Twenty read sites updated
across `ladder.py` and `refresh.py`. `refresh.py` is worth naming: it used
`metrics.get("MASE", inf)`, which for a venue reporting MAE would have compared `inf`
against `inf` and silently adopted nothing.

**The published table: CLOSED by an Overleaf push.** `tab:ladder` and the committed frozen
tables were computed on `calendar_lag7`: Two River Taps ETS reads 0.597 there and the
aligned code produces 0.524. The frozen tables are deliberately NOT regenerated, per report
57's argument that re-running them replaces the decision under audit. Any newly generated
table now carries a basis note saying so, and the ordering and adopted model are unchanged,
so no conclusion moves. The `tab:ladder` caption now records the basis explicitly,
authorised and pushed on 2026-08-01 (section 7.4).

### 7.4 The `tab:ladder` caption, verified at the committed ceilings then pushed

The invariance claim was checked at the ceilings the committed gate actually used
(2026-05-31 Beer Hall, 2026-05-22 Ellel, 2026-05-08 Two River Taps), not on the current
frame, because a caption in the thesis must be about the table it sits under. Reconstructing
the gate there reproduces the committed figures exactly for the six statistical rungs: Beer
Hall ETS 0.799, Ellel robust-DOW 0.572, Two River Taps ETS 0.597, all matching the table.

Run again with the backbone present so all nine entrants score, the ordering is **identical
under all three rulers** at all three venues, and the served model is unchanged:

| Venue | `calendar_lag7` | `calendar_lag7_active` | unscaled MAE | ordering |
|---|---|---|---|---|
| Beer Hall | rung4_chronos2_exo | rung4_chronos2_exo | rung4_chronos2_exo | identical |
| Ellel | rung1_robust_dow 0.572 | 0.142 | 106.553 | identical |
| Two River Taps | rung2_ets 0.597 | 0.524 | 91.166 | identical |

One thing the check does NOT establish, and the caption does not claim: rung-4 magnitudes
do not reproduce to the digit (Beer Hall's exogenous arm scores 0.755 here against the
committed 0.745). That is the device-and-resolution dependence `sec:repro` names, now
visible because `provenance.py` stamps it. The caption's claim is confined to ordering and
the served model, which is what was verified.

The push replaced the whole `sec:res-ladder` section, so `sec:res-demonstration` was
re-appended in the same write: `write_section` replaces through to the next SAME-level
heading and would otherwise have deleted the nested subsection. Verified after: 25 section
entries before and after, the subsection present exactly once, every downstream index
shifted by exactly +1193.

## Verification

| Check | Status | Evidence |
|---|---|---|
| `deviation.py` exists and owns its artefact | PASS | module executable, `_write_report`, docstring entrypoint |
| `deviation_eval.md` regenerated at true ceiling | PASS | 2026-05-31 to 2026-07-07 on all three venues |
| `judge_prompts.md` reproduces from entrypoint | PASS | byte-identical, file rewritten 19:18:58 |
| judge ran offline, no live calls | PASS | `JUDGE_LIVE` unset, no key, emit-prompts mode |
| judge pin is deliberate, not staleness | PASS | `AGENT_EVAL_STREAM_CEILING`, reason at the constant |
| LOVO is unpublished in both chapters | PASS | zero matches across five search terms in live Overleaf |
| LOVO foundation gate is environment-contingent | PASS | measured True/False across the two venvs |
| G2 fix scores Ellel in currency, never pooled | PASS | `loss` MAE (£), absent from count and pool |
| Scaled venues use the ruled basis | PASS | asserted against `config.VENUE_SCALE_BASIS` |
| Basis correction explains the moved number | PASS | 0.872 to 1.242 reproduced on both bases side by side |
| Gate reports NOT EVALUABLE, not FAIL | PASS | `evaluable` guard on a pool below three |
| Suite green after the change | PASS | 609 passed, 8 skipped, 0 failed |
| Corrected artefact survives a suite run | PASS | "NOT EVALUABLE" still present after full `pytest` |
| Foundation criterion implemented, not asserted | PASS | per-fold paired MASE, both arms, tabulated |
| Foundation adoption reproduces | PASS | 1.180/1.250 and 0.559/0.641 identical across two runs |
| Zero-width CI cannot be emitted | PASS | `insufficient` at or below `mcs.BLOCK_LEN`; "no dispersion" printed |
| Degenerate bootstrap measured, not assumed | PASS | 1 distinct resample of 200 at n=6; 200 of 200 at n=45 and n=55 |
| Guard moves no existing number | PASS | transfer folds carry 45 to 55 blocks, CIs unchanged |
| No-backbone path byte-identical | PASS | `.venv-run` artefact unchanged but for the gate restructure |
| Adoption branch covered in every venv | PASS | 5 tests, per-venue comparison stubbed |
| Suite green after the foundation work | PASS | `.venv-run` 616 passed / 8 skipped; `.venv-forecast` 621 passed / 1 skipped, 0 failed in both |
| Runtime stamp renders in both venvs | PASS | `.venv-run` and `.venv-forecast` blocks differ as expected |
| Stamp surfaces a real environment divergence | PASS | pandas 3.0.5 vs 3.0.3, duckdb 1.5.5 vs 1.5.4 |
| 24 folds restores real dispersion | PASS | both CIs non-degenerate and excluding zero |
| Wider window overturns the 6-fold reading | PASS | Beer Hall 1.180 at 6 folds, 0.643 at 24 |
| Ladder basis change moves no selection | PASS | best rung and full ordering identical at all 3 venues |
| Ellel MAE moves no selection | PASS | MASE and MAE orderings identical |
| Serving path updated, not left on a stale key | PASS | `refresh.py` reads `primary_loss`, not `metrics["MASE"]` |
| Frozen ladder tables untouched | PASS | `git status models/` clean but for the module |
| Suite green after the ladder alignment | PASS | 617 passed, 8 skipped, 0 failed |
| Committed gate reproduces at its own ceilings | PASS | 0.799 / 0.572 / 0.597 match `tab:ladder` exactly |
| Ordering invariant across all three rulers | PASS | all 9 entrants, all 3 venues, served model unchanged |
| Caption push lost no content | PASS | 25 sections before and after; subsection once; indices +1193 |

## Files touched

- regenerated: `eval/deviation_eval.md`, `transfer/transfer_results.md`
- regenerated, byte-identical: `eval/judge_prompts.md`
- `transfer/lovo.py`: per-venue ruler from `config`, pool and count restricted to scaled
  venues, `mase_*` keys renamed `loss_*` because they no longer always hold a MASE,
  NOT-EVALUABLE gate, report text and module docstring rewritten
- `transfer/lovo.py`: `_foundation_adoption` + `_foundation_vs_global_gbm` implement the
  adoption criterion, `_foundation_table` and `_foundation_clause` report its evidence,
  `_dispersion` guards against a degenerate bootstrap, gate split into two clauses
- `tests/test_a7_transfer.py`: the majority assertion replaced by four behaviour tests,
  plus five covering the adoption branch and two covering the dispersion guard (14 total)
- corrections: report 57 (the "orphaned" row and a new correction section), report 58 (the
  "both are test output" claim in "What is not done")

## Open

- ~~**Gate: `lovo.py`'s pooled statistic under G2.**~~ CLOSED above by decision.
- ~~**Gate: `lovo.py`'s foundation rung.**~~ CLOSED above: the criterion is implemented and
  the rung is adopted on it.
- **The committed LOVO artefact is now environment-dependent.** It is generated from
  `.venv-forecast` and stamps `available: True`; regenerating from `.venv-run` flips the
  foundation clause to "PASS (dropped)" and drops the evidence table. `sec:repro` already
  names the library resolution and the compute device as part of a result's identity, and
  this artefact names neither. It should carry the environment stamp the chapter's own
  argument requires, and it does not yet.
- **The foundation adoption has no dispersion behind it.** It rests on a mean comparison
  over 6 folds, which is what the gate's criterion asks for and is thin. A dispersion-aware
  version needs a denser rolling origin, which is affordable for the GBM and expensive for
  the backbone. Not claimed, and flagged here rather than buried in the artefact.
- **`ladder.evaluate_rolling` still hard-codes `calendar_lag7`**, the basis G2 rules
  against for these venues, the same fault corrected in `lovo.py` above. The ladder is the
  committed gate under audit so it was deliberately not touched, but the two instruments
  now disagree on the ruler and that is a live inconsistency, not a settled one.
- Two River Taps reports a post-closure trading day in the deviation stream. Recorded above.
- `eval/worldcup_fixture_probe.py` still scores Ellel on `calendar_lag7`. Writes no
  artefact, appears in neither chapter.
- The latent output-directory bug from report 58: `signals/deviation.py` writes without a
  `mkdir(parents=True)`, where `eval/judge.py` does one. A fresh deployment writing to an
  empty report root would raise `FileNotFoundError` from the former.
- `chapters/methodology.tex` header comment still says "the live ref.bib (111 entries)".
- G3's ECE run, parked by instruction.
