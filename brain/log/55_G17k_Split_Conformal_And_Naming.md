# Report 55 - S9 G17k: the A6 band made genuinely split-conformal, and the naming corrected

Date: 2026-08-01. Branch `brain-construction-local`. Store ceiling 2026-07-07. Style: no
em-dashes, plain prose, loud failures, verify before asserting, pre-register before running.

Closes `ledger/code_vs_paper.md` **M2** (HIGH), **M5**, **M6**, **M7**. M9 and M22 are
prose-only and are carried to the Overleaf push below.

## Headline

A6's node bands were called "split-conformal" and were not. The day-of-week median was
fitted on the training span and then scored against that same span, so the quantile was of
an IN-SAMPLE residual and carried no coverage guarantee at all. The calibration set now
sits in its own block, held out from the fit.

Two findings came out of the re-run that matter more than the closure.

**The published direction of the M1/M4 correction was half wrong.** Category coverage does
not fall, it rises sharply, from 77.6 to 85.1 per cent at nominal ninety. Item coverage
falls, 77.6 to 72.1. The chapter currently reports both as falling.

**One adoption on a 0.2 per cent validation margin costs nine points of item coverage.**
Lager - BH wins its contest 1.418 against 1.421 and then loses the test block 1.749 against
0.891, and it drags item coverage from 72.1 to 64.0. The adoption rule has no margin
requirement. It was NOT given one: that is a methodology change and it is a gate.

## The three-block layout

Walking back from the end of the calendar, each block doing exactly one job:

| Block | Span | Job |
|---|---|---|
| test | 2026-05-12 to 2026-07-07 | reported, touched by nothing else |
| calibration | 2026-03-17 to 2026-05-11 | conformal scores AND the WLS_v weights |
| validation | 2026-01-20 to 2026-03-16 | the Croston/DOW adoption contest |
| fit | before 2026-01-20 | the contest's estimators |

Everything the test block sees is fitted strictly before `cal_start`, so the same fitted
median produces both the calibration scores and the test point forecast. That identity is
what makes the guarantee transfer to the served band; calibrating one predictor and
serving another would not.

The weights moved with it. MinT's W is the base-forecast ERROR covariance, and an
in-sample residual understates it for the same reason an in-sample quantile does, so `w`
is now the variance of the held-out calibration residual on BOTH paths. Report 53 had
already made the two paths agree on signed-versus-absolute; this makes them agree on
in-sample-versus-held-out as well.

## Decomposition, because the coverage moved both ways

Four runs on one store, DOW-median only so the adoption does not confound the band change:

| Run | Fit span | Band | L2@80 | L2@90 | L3@80 | L3@90 |
|---|---|---|---|---|---|---|
| A (old) | < test_start | in-sample | 64.0 | 77.6 | 60.4 | 77.6 |
| B | < test_start | held-out | 67.5 | 86.4 | 62.6 | 72.9 |
| C | < cal_start | in-sample | 62.1 | 76.1 | 58.4 | 77.6 |
| D (new) | < cal_start | held-out | 65.8 | 85.1 | 60.0 | 72.1 |

Run A reproduces the pre-correction published figures exactly, which is the control that
says the harness is measuring the right thing.

**Shortening the fit span is nearly free**: A to C costs 1.5 points at L2 and 0.1 at L3.
The 112 days surrendered to the two held-out blocks buy the guarantee at almost no
accuracy cost. **The band change is the whole story**, and it is asymmetric: category
bands widen and coverage rises, sparse item bands narrow and coverage falls.

That asymmetry is worth stating because it contradicts the natural expectation. An
in-sample quantile is optimistic given the same sample, but it is not automatically the
narrower number here: it is taken over a 343-day fitting span while the calibration block
is 56 days, so at sparse item nodes it can be larger simply by covering more history. A
test asserting the band "widens" was written, run against the estate, found false, and
withdrawn in favour of one that pins what the band IS rather than which way it moved.

## The adoption that should not have happened

| | val MASE DOW | val MASE est | margin | test MASE DOW | test MASE est |
|---|---|---|---|---|---|
| ITEM::Beer::Lager - BH | 1.421 | 1.418 | 0.21% | 0.891 | 1.749 |

Adopted, and then 96 per cent worse on the block it is reported on. Its cost, isolated by
D against the final run: item coverage 72.1 to 64.0 at ninety, 60.0 to 50.4 at eighty;
category coverage barely moves. It also drives the operational deliverable, the keg order,
from 0.72 to 1.39 kegs per week. (CORRECTED 2026-08-01: this first read "from 1.09", which misattributed the PRE-M2 artefact's keg figure. Run D was a coverage-only control and never computed the proxy. See report 56.)

The estimator still loses to the day-of-week median on the test block at FIFTEEN of the
sixteen nodes. It does not lose at the sixteenth: `ITEM::Merchandise::Caravan T-shirt` has
`n/a` for both test scores, so there is nothing to compare. The chapter said "every one of
the sixteen" before this session and that was already an overstatement; see the addendum.

A one-standard-error margin rule (Breiman et al. 1984) would reject this adoption. It is
not applied here. Adding a margin having just watched this specific adoption fail is
exactly the post-hoc criterion-editing this audit exists to catch, and it is a methodology
change, which is a human gate. It goes to Phuong as one.

> **SUPERSEDED, this passage only, 2026-08-01.** The gate was taken the same day and the
> margin WAS adopted, by the pre-registration route: specification committed at `1b649dc`
> before any implementing code existed, then run. It refuses this adoption (criterion
> `+0.026`) and 0 of 16 nodes now adopt. See report 56 and
> `ledger/prereg_adoption_margin_2026-08-01.md`. The coverage and keg figures in the
> paragraphs above describe the pre-margin state and are retained as the comparator.

**Sauvignon Blanc's adoption disappears** and this is correct, not a regression. Its first
recorded sale is 2026-01-30, ten days after `val_start`, so the contest's fit span holds no
sales at all, the scaled-error denominator is zero and both val figures are `n/a`. A
scale-free contest cannot be run on a series with no history, and declining to adopt is the
right answer. Under the old layout it had three months of history and adopted.

## M5, the naming

The formula in `mint_reconcile` is exactly Equation (11) of Wickramasuriya et al. (2019),
but with a diagonal W. Those authors reserve "MinT" for MinT(Sample) and MinT(Shrink) and
call the diagonal case **WLS_v**, writing that MinT "can be described as a WLS estimator"
there. Module docstring, function docstring, report generator, CLI banner and the A6
artefact now say WLS_v.

The reason for the diagonal is now stated rather than left implicit: at 41 nodes over a
399-day calendar the shrinkage estimator would be estimating a covariance with more
entries than the calibration block has rows.

The persisted model key `mint_dowmedian` is deliberately UNCHANGED. It is a database
identifier joined on by `signals/stock_inventory.py`, not a claim in prose; renaming it
would be a data migration for no gain in honesty.

## M6, the superseded constant

One live literal remained, in the empty-case branch of the A6 report generator: "ADI >=
1.32", the SBC constant Kostenko-Hyndman corrects to 4/3. Now formatted from
`ADI_INTERMITTENT_CUTOFF`. The other two sites named in the ledger were already fixed in
commit `5f77591`.

## M7, the clamp that lapsed silently

`conformal_quantile` takes the `ceil((n+1)*level)`-th smallest score and clamps that index
to `n`. Below `n = level/(1-level)` the honest answer is an infinite band; MAPIE and
`crepes` return infinity, we return the largest observed residual. The clamp is kept, an
infinite band being useless to an operator, but it is now COUNTED: `conformal_min_n(level)`
is the test, `evaluate` tallies group bands issued below it, and both the CLI and the A5
report print the count.

On the Beer Hall it is **0 of 60 group bands at both levels**, so the guarantee never
actually lapsed. That is worth knowing and was not knowable before.

A defect surfaced while writing it. The first implementation returned
`ceil(level/(1-level))` and reported the boundary as 5 and 10 instead of 4 and 9, because
`0.8/(1-0.8)` is `4.000000000000001` in binary. The boundary is now searched with the same
expression `conformal_quantile` clamps on, and asserted minimal and attainable.

## A5's gate is failing, and the artefact was hiding it

Regenerating `conformal/conformal_L1_beer_hall.md` moved every figure in it:

| | committed | now |
|---|---|---|
| plain @80 | 81.4 | 78.0 |
| mondrian @80 | 78.5 | **75.1 (FAIL, gate is +/-3pp)** |
| plain @90 | 89.5 | 88.5 |
| mondrian @90 | 90.7 | 87.6 |

**This is not caused by anything in this report.** Stashing `conformal/wrap.py` and
re-running reproduces 78.0 / 75.1 / 88.5 / 87.6 exactly, so the M7 edit changes no band.
The committed artefact was simply never regenerated after the warehouse restore of commit
`1641dbc`, and it has been carrying stale numbers and a stale PASS since.

Checked before alarming anyone: none of 78.5, 81.4, 90.7, 89.5 appears in results.tex. The
chapter's coverage table is the `eval/interval_calibration.py` measurement over rolling
origins (Beer Hall 0.871 on 1750 pairs), a different and larger instrument, and it already
reports the Beer Hall under-covering. So no published number is wrong. What IS true is that
an internal gate flipped to FAIL and nobody would have noticed, and that other artefacts
may be stale against the restored warehouse for the same reason. That sweep is not done.

## Verification

| Check | Status | Evidence |
|---|---|---|
| Calibration set disjoint from the fitting set | PASS | `test_the_conformal_calibration_set_is_disjoint_from_the_fitting_set` |
| Band equals the conformal quantile of the held-out residual | PASS | `test_the_band_is_the_conformal_quantile_of_the_held_out_residual` |
| Weight is the held-out signed residual variance | PASS | `test_mint_weight_is_the_variance_of_the_held_out_signed_residual` |
| Adopted node is refit up to cal_start, not to test_start | PASS | `test_an_adopted_node_forecasts_the_estimator_refit_up_to_the_calibration_block` |
| Control run A reproduces the published pre-correction figures | PASS | 64.0 / 77.6 / 60.4 / 77.6, identical |
| M7 boundary is minimal and attainable | PASS | asserted against `ceil((n+1)*level)` at both levels |
| M7 edit changes no band | PASS | stash control reproduces all four A5 figures |
| Coherence still exact | PASS | venue and category discrepancy 0.00e+00 |
| A6 suite | PASS | 14 of 14 |
| No new suite failures | PASS | 8 failures, same pre-existing parquet/pydantic set |

## Files touched

- `hierarchy/reconcile.py` (three-block layout, held-out calibration, held-out weights,
  WLS_v naming, ADI constant)
- `conformal/wrap.py` (`conformal_min_n`, clamp docstring, undersized tally, report table)
- `tests/test_a6_reconcile.py` (block-layout helper, three new tests, one withdrawn claim)
- `hierarchy/reconciliation_forecast.md`, `conformal/conformal_L1_beer_hall.md`
  (regenerated)
- `ledger/code_vs_paper.md` (M2, M5, M6, M7)

## Open after this

- **Gate: the adoption margin.** One-standard-error rule, or leave the bare inequality.
- **Gate: G2**, the Ellel scale basis, still the last gate not blocked on a missing key.
- **Gate: the citation key** for the M5 metric source (Hewamalage et al., arXiv 2108.03588).
- M9 and M22 are prose-only and go out with this push.
- The staleness sweep against the restored warehouse is NOT done. A5 was found by accident.
- G3's ECE run still needs `ANTHROPIC_API_KEY`.

---

## Addendum, same session: M9, M19, M22 and two near-misses

**M22 needed no edit.** Both halves the ledger asked for were already written in the live
chapters (methodology's "takes only the values 0 and 1, never an intermediate probability";
results' "a null is the expected geometry rather than a measurement about the venue"). The
row was stale. Verified by reading Overleaf, not assumed.

**M9** added a paragraph to methodology `\section{Detection}`: the ARL tables are derived
for a sigma-standardised statistic, `eq:z` divides by a conformal half-width, so no
run-length claim is made on that literature's authority and the empirical validation is
named as the warrant instead.

**M19** was the only live recommendation among the seven LOW rows. Methodology now states
that the exponential-smoothing rung is a fixed ETS(A,A,A) rather than an
information-criterion selection over the family, and that a poor showing is therefore
evidence against that specification and not against the class.

The other six LOW rows (M10, M12, M14, M17, M20, and M13) carried "Recommended action:
None" and are closed as verification records; M13 is carried into G2, where the basis
choice is already the subject.

### Two near-misses, both caught on read-back

**A dangling cross-reference.** The M9 paragraph first cited `sec:res-detection-eval`,
which does not exist and would have compiled to `??`. Corrected to `sec:res-injection`.

**Two subsections deleted and restored.** `write_section` replaces a section THROUGH TO THE
NEXT HEADING OF THE SAME LEVEL, so it silently takes nested subsections with it. Writing
`\section{The forecasting ladder and its gate}` destroyed
`\subsection{Exogenous covariates and the lead at which they are available}`, and writing
`\section{Detection}` destroyed
`\subsection{Occurrence, and why the hurdle here is not estimated}`. Both were caught by
calling `get_sections` after the push and comparing against the structure recorded before
it, and both were restored verbatim from the full-file read taken earlier in the session.
`get_sections` now shows all fifteen entries, matching the original exactly.

**This is a standing hazard, not a one-off.** Any future `write_section` on a section that
contains subsections must include those subsections in `newContent`. The pipeline spec's
preference for `write_section` over `write_file` does not protect against this.

### One factual overstatement corrected, inherited not introduced

The chapter said the intermittent estimator loses to the day-of-week median "at every one
of the sixteen nodes". Checking the artefact row by row: it loses at fifteen, and at the
sixteenth (`ITEM::Merchandise::Caravan T-shirt`) BOTH test scores are `n/a`, so there is no
comparison to lose. The claim was in the chapter before this session and was repeated in
the first push of this one. Both chapters now say fifteen of sixteen, with the sixteenth
explained.

### Final cross-reference audit

Every `\ref` in results.tex and every reference added to methodology this session was
checked against the union of labels defined in both files. **No dangling references.**
`tab:recon-decomp`, the one new label, is defined.
