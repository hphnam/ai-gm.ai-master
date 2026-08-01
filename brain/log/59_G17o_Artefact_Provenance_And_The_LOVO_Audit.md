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

## Files touched

- regenerated: `eval/deviation_eval.md`, `transfer/transfer_results.md`
- regenerated, byte-identical: `eval/judge_prompts.md`
- `transfer/lovo.py`: per-venue ruler from `config`, pool and count restricted to scaled
  venues, `mase_*` keys renamed `loss_*` because they no longer always hold a MASE,
  NOT-EVALUABLE gate, report text and module docstring rewritten
- `tests/test_a7_transfer.py`: the majority assertion replaced by four behaviour tests
- corrections: report 57 (the "orphaned" row and a new correction section), report 58 (the
  "both are test output" claim in "What is not done")

## Open

- ~~**Gate: `lovo.py`'s pooled statistic under G2.**~~ CLOSED above by decision.
- **Gate: `lovo.py`'s foundation rung.** New. The `available: True` branch needs either the
  zero-shot-vs-global-GBM evaluation implemented, or an explicit decision to keep the rung
  dropped on grounds other than backbone absence. Until one of the two, the committed PASS
  should not be relied on.
- Two River Taps reports a post-closure trading day in the deviation stream. Recorded above.
- `eval/worldcup_fixture_probe.py` still scores Ellel on `calendar_lag7`. Writes no
  artefact, appears in neither chapter.
- The latent output-directory bug from report 58: `signals/deviation.py` writes without a
  `mkdir(parents=True)`, where `eval/judge.py` does one. A fresh deployment writing to an
  empty report root would raise `FileNotFoundError` from the former.
- `chapters/methodology.tex` header comment still says "the live ref.bib (111 entries)".
- G3's ECE run, parked by instruction.
