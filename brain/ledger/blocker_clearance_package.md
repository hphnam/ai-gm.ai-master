# Blocker clearance package — B1, B2, B4, B5

**Prepared 2026-08-06. NOTHING HAS BEEN PUSHED TO OVERLEAF.** Every item below is a
chapter edit, and pushing to Overleaf is a standing human gate in `PRJ93_RULES.md`. This
file assembles the corrected values with their sources so the edits can be approved as a
batch and applied in one pass.

B3 and B6 were cleared by measurement rather than by editing and are recorded in `log/77`
and `log/76`. B0 was never open (`log/76`, correction).

---

## B1 · `tab:group` — "roughly £40" is untraceable

**Verdict: UNTRACEABLE. No £40 figure exists anywhere in the repository.**

The nearest number, **£44.8** (`log/47:58`), is the *batch-merge probe* — how far an
oversized `batch_size` shifts a forecast by merging origins into one cross-learning group.
It is a different quantity from grouped-versus-univariate, and the chapter **already cites
it correctly as ~£45 two subsections later**. Reusing it here would be the same number
counted twice for two different purposes. It also has no artefact of its own: it survives
only as prose in report 47.

**The real quantity**, computed from the committed per-origin MAE vectors in
`eval/group_icl_L1.json` — arithmetic on stored results, no model re-run:

| venue | pair | n | mean abs difference | median | max |
|---|---|---|---|---|---|
| beer_hall | U vs G2 | 260 | **£9.99** | £7.07 | £171.82 |
| beer_hall | U vs G3 | 260 | **£10.94** | £7.87 | £185.17 |
| ellel | U vs G2 | 260 | £4.27 | £3.75 | £14.14 |
| ellel | U vs G3 | 260 | £4.68 | £2.69 | £47.78 |
| two_river_taps | U vs G3 | 203 | £5.84 | £3.92 | £65.30 |

**Proposed edit.** Replace "roughly £40" with the Beer Hall figure: **£9.99 mean, £172 max
per origin**. It supports the sentence's actual point — that the grouped path is genuinely
different from the univariate one rather than a no-op — with a number that exists.

**Note the direction of the correction.** The claim gets *smaller*, not larger, and the
argument is unaffected: the pooling result is a null either way, and the sentence exists to
establish that the grouped arm was really running.

Source: `numbers_audit_resolutions.md` §3.1.

---

## B2 · `tab:coverage` — the power claim, and why it should be removed rather than computed

**Verdict: the power calculation does not exist, was never done, and must not be retrofitted.**

The audit's finding stands verbatim: *"No test alpha, no effect size, no minimum detectable
effect, no achieved power (1−β), no sample-size justification exists anywhere. 'Power' in
this section means 'enough pairs to measure'."*

**Verified directly against the artefact.** `eval/interval_calibration_power.json` is not a
power table despite the filename. It holds exactly two things:

1. A **7-point retrospective check** on the C2 confrontation — `n_pairs: 7`,
   `p_all_in_if_calibrated: 0.478`, `clopper_pearson_95: [0.590, 1.000]`,
   `supports_miscalibration: false`. This is the *withdrawn* claim from `sec:res-power`,
   which is **CUT** under §2.4. It is a refutation of a miscalibration claim, not a power
   analysis.
2. The **Angelopoulos–Bates upper bound** and its score-ties check per venue.

Neither is a power calculation. There is no α, no effect size, no MDE and no 1−β anywhere
in the repository.

**Proposed edit — remove the claim, do not manufacture it.**

- Drop the **power** and **MDE** columns from `tab:coverage`.
- Drop the caption sentence *"Power is for an exact two-sided binomial test at α = 0.05"*
  from the §3.6 worked example.
- The approved rename already does half the work: "Measured with power, one venue
  under-covers" → **"Empirical coverage of the served band"** (§3.4), which removes the word
  from the heading. §2.7's description of the float must be amended to match — it currently
  reads *"Coverage, Clopper–Pearson interval, power and MDE per venue are all looked up"*.

**A retrofitted power analysis would be worse than none.** Power is a property of a design
fixed before the data are seen. Computing it now, against a coverage result already
observed, would produce a number that looks like a pre-specified sensitivity and is not one
— and the document's whole credibility rests on the commit-ordering discipline it applies
everywhere else.

**What survives, and it is the stronger material anyway.** The same artefact establishes
that the two-sided expected-coverage upper limb is **invalid at all three venues**
(`upper_bound_valid: false`) because structural closure places an atom at score zero — tie
fractions **0.160 / 0.590 / …** on `n_calib` 1883 / 1792 / 1407. That is already in the
approved caption and is a real, measured, methodologically interesting finding. `tab:coverage`
keeps coverage, the Clopper–Pearson intervals and the withheld-limb statement, and loses
only the two columns nothing supports.

Sources: `numbers_audit.md` (UNTRACEABLE 3.3), `numbers_audit_resolutions.md` "still open"
row 3, `eval/interval_calibration_power.json` inspected directly 2026-08-06.

---

## B4 · `tab:bases` — six point estimates with no dispersion

**Verdict: MISMATCH. The intervals exist and were never transcribed.**

`bootstrap_scale` resamples the absolute lag-difference vector with replacement,
**B = 10,000**, 95 per cent percentile interval, ruler pinned `as_of = 2026-07-07`.

| venue | basis | scale | 95% interval | width | n pairs | induced MASE |
|---|---|---|---|---|---|---|
| Beer Hall | `calendar_lag7` | 315.7 | [270.0, 365.0] | 30.1% | 392 | 0.571 [0.494, 0.668] |
| Beer Hall | `calendar_lag7_active` | 386.9 | [332.1, 446.4] | 29.5% | **276** | 0.466 [0.404, 0.543] |
| Two River Taps | `calendar_lag7_active` | 173.2 | [148.6, 202.1] | 30.9% | 268 | n/a (dormant) |
| Ellel | `calendar_lag7` | 180.1 | [135.3, 229.9] | 52.5% | 385 | 0.411 [0.322, 0.547] |
| Ellel | `trading_lag7` | 770.8 | [604.3, 952.7] | 45.2% | 61 | 0.096 [0.078, 0.122] |
| Ellel | `trading_same_weekday` | 806.2 | [639.1, 979.2] | 42.2% | 67 | 0.092 [0.076, 0.116] |
| Ellel | `calendar_lag7_active` | 754.0 | [522.0, 1016.4] | **65.6%** | **28** | 0.098 [0.073, 0.142] |

**Proposed edit.** Add an interval column and an n-pairs column.

**Why this is the most consequential of the four.** The Ellel `calendar_lag7_active` interval
is **65.6 per cent wide on 28 pairs**. That single cell *is* the argument for "no defensible
scaled basis at Ellel", and the chapter currently states the conclusion while omitting the
evidence for it. The induced-MASE column makes the same point in the units the reader cares
about: the same forecast reads as 0.411 or 0.092 depending on which admissible basis is
chosen, a factor of four.

**Frame annotation, folding in `numbers_audit.md:108` row 21.** The `n pairs` column resolves
a live ambiguity: the `calendar_lag7` rows run on the **untrimmed** frame (Beer Hall 392,
Ellel 385) while `tab:venues` publishes the **trimmed** lengths (399 / 386 after
`trim_to_active`). Printing n per row states which frame each cell is on and closes the
question rather than leaving it to be rediscovered — this is the third time the 392-against-386
distinction has surfaced in two sessions.

Source: `log/45_G17d_Intermittency_and_Occurrence.md:105-118`.

---

## B5 · `tab:mcs-config` — three pre-registration omissions

**Verdict: UNTRACEABLE ×3. The values are known; the table omits them.**

A pre-registration table that omits its own reproducibility parameters is defective as a
pre-registration, which is the whole function of the float.

| Missing | Value | Source |
|---|---|---|
| Bootstrap **seed** | **93** (`PAIRED_BOOTSTRAP_SEED = 94` where a paired bootstrap is used) | `eval/mcs_L1_results.json`; `log/70` header |
| **Candidate-set size** | **9** scored entrants enter the MCS | `eval/mcs_L1_results.json`, `mcs_pvalue` has 9 keys per venue |
| **Common-fold restriction** | The MCS runs on the common-fold intersection, so **the n actually used at Ellel is not 260** | `eval/mcs_L1_results.json` → `venues.<v>.mcs_<loss>.common_fold.n_folds` |

**Proposed edit.** Add the three rows. Also state the per-venue `common_fold.n_folds`
explicitly rather than the headline origin counts, because the chapter says "common-fold"
nowhere and a reader will otherwise pair the 273/260/205 origins with an MCS that did not
use all of them.

Already-present values to keep: range statistic, block length **7**, **B = 1000**, α = 0.10
and 0.25.

Note `tab:mcs-config` goes to **Appendix C** under A9, so its caption is uncounted and these
additions cost nothing against HC1.

Source: `numbers_audit.md:303-305`.

---

## Summary

| Blocker | Float | Action | Cost against HC1 |
|---|---|---|---|
| B1 | `tab:group` | Replace "£40" with **£9.99 mean / £172 max** | Neutral |
| B2 | `tab:coverage` | **Remove** power + MDE columns and the caption sentence | Saves caption words |
| B4 | `tab:bases` | **Add** 95% interval, n-pairs and induced-MASE columns | Body table, no caption change |
| B5 | `tab:mcs-config` | **Add** seed, candidate-set size, common-fold restriction | Zero — Appendix C |

None requires a re-run. All four are transcription from committed artefacts.

**Awaiting approval before anything reaches Overleaf.**

---

## §5.3 validity note — drafted 2026-08-07, approved in principle

Approved on the reasoning that the sensitivity **leads as evidence for non-separability**
and the quantification supports it. Written the other way round it reads as an apology for
the table. Source: `log/78`.

> The ninety per cent Winkler set at Two River Taps loses a member when the numerical
> library changes minor version: S is retained under numpy 2.5.1 and eliminated under
> 1.26.4, its exclusion p-value moving from 0.191 to 0.036. The economical reading is that
> these five interval methods are not separable at this sample size. A confidence set that
> reports a real distinction survives its own arithmetic; this one does not, and that is a
> finding about the data rather than about the computation. Two River Taps is where it
> surfaces because it has the fewest evaluation origins — 205 against 273 and 260 — the
> tightest spread between arms, and correspondingly the least margin to absorb a threshold
> crossing. The instability is confined to set membership. Every Winkler mean, coverage
> figure and Clopper–Pearson limb reproduces exactly across both environments, and Ellel's
> set is unchanged in every verdict.

**118 words** against the ~60 estimated. The overage buys the two things that make the note
credible rather than alarming: the scope statement (what does *not* move) and the sample-size
attribution. Cutting either leaves a reader free to generalise the instability across
Chapter 4, which is a worse outcome than 58 words. Charged against 5.3.

### Should 4.1's answer to RQ1 cross-reference it? — qualified yes, one clause

RQ1 asks whether candidate approaches can be separated at these data volumes **and whether
the number of evaluation origins changes which is selected**. The temptation is to present
this as a second, independent answer to the separability half. **It is not, and the
distinction has to be kept**: RQ1's candidates are *forecasting* approaches, evidenced by the
ladder MCS in `tab:mcs`. This finding is about *interval* methods, a different candidate set
in a different float. Offering it as corroboration of the forecasting result would be
comparing two different populations.

What it genuinely corroborates is the **mechanism** — and that is the half of RQ1 about
origin count. The venue with 205 origins is the one whose set membership moves; the venues
with 273 and 260 hold. That is the same sample-size-driven selection instability RQ1 names,
observed on an independent candidate set, and it is worth one clause in 4.1 pointing forward
to 5.3. Not a second answer; a second sighting of the same cause.
