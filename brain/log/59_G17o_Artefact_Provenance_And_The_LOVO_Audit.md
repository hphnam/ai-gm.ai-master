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

## Files touched

- regenerated: `eval/deviation_eval.md`
- regenerated, byte-identical: `eval/judge_prompts.md`
- corrections: report 57 (the "orphaned" row and a new correction section), report 58 (the
  "both are test output" claim in "What is not done")

## Open

- **Gate: `lovo.py`'s pooled statistic under G2.** Unchanged and awaiting a human call.
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
