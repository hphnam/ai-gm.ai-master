# Report 56 - S9 G17l: a pre-registered one-standard-error margin on the A6 adoption rule

Date: 2026-08-01. Branch `brain-construction-local`. Store ceiling 2026-07-07. Style: no
em-dashes, plain prose, loud failures, verify before asserting, pre-register before running.

Gate taken by Phuong on 2026-08-01, option 3 of three: pre-register the rule, then re-run.

## Ordering, stated first

The margin was written **after** observing that the bare inequality adopted
`ITEM::Beer::Lager - BH` on a 0.21 per cent validation margin, and that this node then
scored 96 per cent worse on the test block. Nothing in this report claims otherwise.

What pre-registration bought is narrower and real: the rule, its estimator, its sub-block
unit and its fail-closed conditions were fixed in
`ledger/prereg_adoption_margin_2026-08-01.md` and committed at **`1b649dc`**, before any
implementing code existed. Commit order therefore establishes the specification could not
be adjusted once its consequences were visible. It does not make the rule an advance
prediction and it is not presented as one.

## The rule

Adopt the intermittent estimator only when

    mean(d) + sd(d, ddof=1)/sqrt(B)  <  0,   d_b = MASE_est(b) - MASE_dow(b)

over `B` disjoint 7-day sub-blocks of the validation window. Sub-blocks not days because
daily errors are serially correlated and a daily standard error is biased downward;
disjoint not overlapping so no bootstrap is needed; seven days because that is the unit the
LOVO study already uses (report 54). Fails closed to the incumbent on `B < 2`, on any
non-finite `d_b`, and on `sd(d) == 0`.

## Outcome: the prediction held

`Lager - BH` criterion `= +0.026`, positive, so the adoption is refused. **0 of 16 nodes
now adopt**, down from 1. No other node's decision moved, and none could: a stricter rule
can only lower an adoption count.

The pooled margin of two parts in a thousand sits an order of magnitude inside the
dispersion of the sub-block differential. That is exactly what a pooled point estimate
cannot show, and it is the substantive argument for the rule.

| | before the margin | after |
|---|---|---|
| adoptions | 1 of 16 | 0 of 16 |
| L2 coverage @80 / @90 | 63.4 / 84.9 | 65.8 / 85.1 |
| L3 coverage @80 / @90 | 50.4 / 64.0 | 60.0 / 72.1 |
| keg order | 1.39 | 0.72 |
| coherence | exact | exact |

**The coverage gain is not evidence for the rule.** Removing a forecaster already measured
to be worse on the reported block necessarily improves that block. The argument is the
one-standard-error argument plus the dispersion finding; the coverage is arithmetic.

## Two errors of mine, both corrected

**The pre-registration's own "already measured" block was wrong.** It stated the
no-adoption keg order as 1.09. It is **0.72**. The 1.09 comes from the PRE-M2 artefact,
under the old fitting span and in-sample band; run D of report 55 was a coverage-only
control that never computed the consumption proxy, so there was no run-D keg figure to
quote. The coverage figures quoted in the same block were correct and reproduced exactly.
The error had already propagated into report 55 and into the results chapter, both of which
said the adoption moved the order "from 1.09 to 1.39" when the like-for-like comparison is
**0.72 to 1.39**. Corrected in all three places.

**I first mis-stated what the rule does, in a test.** The initial test asserted that a
challenger winning "by a hair" must be refused. That is false, and the test failed against
the real arithmetic. A uniformly tiny win has uniformly tiny dispersion, so it clears a
one-standard-error rule and SHOULD. What the rule refuses is a win small *relative to its
own variability*: large gains on some sub-blocks nearly cancelled by large losses on
others. The test was rewritten to pin that semantics in both directions, and the
distinction is now stated in both chapters, because a reader could make the same mistake.

## Two near-misses on the Overleaf push

**An unresolvable citation key.** The first push of the margin subsection wrote
`\citet{breiman_classification_1984}`. That key does **not** exist in `ref.bib` (112
entries, no Breiman), so it would have compiled to a `?` and, worse, adding a cited paper
is a human gate under `PRJ93_RULES.md`. Rewritten to describe the device in prose without a
citation command, exactly as the M5 metric source is handled. **Adding the key remains an
open gate.**

**Markdown in LaTeX.** The same push contained `**No node in the hierarchy...**`, which
would have rendered literal asterisks. Now `\textbf{...}`.

Both were caught by a mechanical check that is now the standing procedure after any push:
extract every `\cite*` key and compare against `ref.bib`; extract every `\ref` and compare
against every `\label` in the chapter set; grep for markdown bold and headings. Current
state of both chapters: **no missing bib keys, no dangling refs, no markdown**.

## Verification

| Check | Status | Evidence |
|---|---|---|
| Pre-registration precedes implementation | PASS | commit `1b649dc`, no implementing code in tree |
| Prediction recorded before the run, and held | PASS | criterion +0.026, adoption refused |
| A win inside its own dispersion is refused | PASS | `test_a_win_smaller_than_its_own_dispersion_is_refused` |
| A consistent win is still adopted | PASS | `test_a_consistent_win_is_still_adopted` |
| Margin fails closed when dispersion is unestimable | PASS | `test_the_margin_fails_closed_when_dispersion_cannot_be_estimated` |
| Coherence unaffected | PASS | venue and category discrepancy 0.00e+00 |
| A6 suite | PASS | 17 of 17 |
| No new suite failures | PASS | 8, same pre-existing parquet/pydantic set |
| Every cite key resolves in ref.bib | PASS | 9 in results, 20 in methodology, 0 missing |
| No dangling cross-references | PASS | mechanical label/ref diff |

## Files touched

- `ledger/prereg_adoption_margin_2026-08-01.md` (specification, then outcome appended)
- `hierarchy/reconcile.py` (`_one_se_adopt`, `one_se_crit` column, report prose)
- `tests/test_a6_reconcile.py` (three margin tests, one withdrawn false claim)
- `hierarchy/reconciliation_forecast.md` (regenerated)
- Overleaf: new `\subsection{A selection rule with no margin, and what replaced it}` in
  results, margin specification in methodology's demand-pattern section

## Open

- **Gate: the citation key** for the one-standard-error rule (Breiman, Friedman, Olshen and
  Stone 1984) and for the M5 metric source (Hewamalage et al., arXiv 2108.03588). Both are
  currently described in prose without a `\cite`.
- **Gate: G2**, the Ellel scale basis. M13 depends on it.
- The artefact staleness sweep against the restored warehouse (A5 was found by accident).
- G3's ECE run still needs `ANTHROPIC_API_KEY`.
