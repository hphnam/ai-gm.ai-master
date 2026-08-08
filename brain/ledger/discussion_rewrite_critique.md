# Discussion critique log — 8C-4, 2026-08-08

**Roles are the three in `brain/skills/autoresearchclaw/SKILL.md` §3** — Methodologist,
Statistician, Claim auditor — run as **independent calls**, plus the two named for this phase
(knowledge-telling against critical writing per `ds-writing` §1; process reported in place of
result), plus the §4.5 displacement check that 8C-3 added.

## Correction at the head of this file, because the first attempt got the method wrong

**The first pass invented its own roles.** It read the round headings out of
`results_rewrite_critique.md` (A rubric coverage, B numbers, C structure, D knowledge-telling,
E process) and treated them as the house roles. They are not: they are 8C-3's own round labels.
`brain/skills/autoresearchclaw/SKILL.md` §3 owns the roles and names three different ones, and
§2 attaches a structural requirement the first pass also missed:

> Issue **one separate call per role.** Do not ask one call to produce three reviewer voices.
> Three personas sharing a single context share every blind spot and cannot disagree in any
> load-bearing way — this is the single largest defect in the system this manual is distilled
> from, and the reason the loop is structured this way.

The first pass produced all five "rounds" inside one context. It found seven findings, none
blocking. The three independent calls found **42 blocking findings**. That is the defect the
skill file warns about, measured: a self-review inside one context found 0 blocking issues where
three independent reviews found 42, and the difference is not diligence but the shared context.

**This is the same failure as 8C-3's second durable conclusion, one level up.** There the lesson
was that an approval you have not read loses to an argument you construct in-session. Here the
unread file was the one that defines the method, and the argument constructed in-session was
"the roles are whatever the last critique log used". Both are the same mistake: reconstructing a
specification from a downstream artefact instead of opening the file that owns it.

---

## Round F — the `05_paper_architecture.md` §4.5 displacement list, run BEFORE drafting

Run first deliberately, because in 8C-3 it was the round that caught what five others missed.

**F1. Two rulings land on Chapter 5, not one.** The obvious one is the Discussion 5.4 row: *"the
one section that grows"*, absorbing the status half of `sec:res-agent`, the review's admitted
omissions, R106 and R107. The second is inside the **Background 2.3** row and is filed under
another chapter, which is why it is easy to miss: *"the TabPFN withdrawal leaves the review
entirely and appears once, in Discussion 5.5, as a scope divergence."* Both applied. Reading only
the 5.4 row would have given 5.5 five divergences against U2's six.

**F2. §4.5 pre-authorises 5.4's overrun.** 5.4 is budgeted 700 against 543 words of existing
material and then told to absorb four further items. The arithmetic of that instruction is an
overrun and it was issued knowingly, so compressing 5.4 toward 700 would reverse an approval.

**F3. One displaced item was deliberately NOT brought in.** The Results 4.4 row displaces *"the
implementation-correction narrative in `sec:res-winkler`"*. The faithful-BOA AgACI correction
(the corrected arm scoring 16, 3 and 18 points **worse**, so the departing implementation had
been flattering the method it was named for) is displaced material. **Brought to Phuong as the
one deliberate omission** rather than smuggled in against the ruling.

**F4. `tab:mcs`'s W2 exposure left where 8C-3 put it.** §2.7b W2 requires the ladder-MCS numerics
exposure as a clause in Results 4.1. 5.3 does not re-argue it, because W2 is *plausible and
untested* for the ladder and restating it in the Discussion would upgrade it to established.

---

## Iteration 1 — the three independent calls

Each role received the draft, the result files it cites, and nothing from the other roles.
**Verdicts: revise, revise, revise.** 42 blocking findings, ~25 distinct after de-duplication.

### Synthesis (the fourth call, per SKILL.md §2)

Per the skill's instruction, this takes the strongest element from each critique rather than
compromising between them, and preserves genuine disagreements rather than flattening them.
**No role vetoed; two were partly overruled and both overrulings are recorded below with the
evidence.**

#### Where all three converged — treated as established

| # | Finding | Roles | Verified how |
|---|---|---|---|
| **S1** | **`tab:winkler`'s aggregated adaptive arm is NOT worst at every venue.** Beer Hall: P 1940, D 1807, S 1928, A 1814, **G 1837** — G is third and pooled split conformal is worst. G is worst only at Ellel and Two River Taps. | A, B, C | Read off `tab:winkler` in `results.tex`. **The draft inherited this error verbatim from `conclusion.tex`, which is also wrong** — recorded for 8C-5 |
| **S2** | **"a mean gap of £1.91 … is measurable at all" is false.** £1.91 against a paired se of £3.81 is **0.50** standard errors; unpaired it is **0.08**. Pairing moved the gap from deeply unmeasurable to still unmeasurable. | A, B | Both roles derived it independently and agreed to the digit |
| **S3** | **205/273/260 are the LADDER's fold counts; the interval-calibration study runs 250/237/182.** The draft explained an instability in the interval study using the ladder's $n$, in the same paragraph that forbids conflating the two studies. | A, B, C | `interval_calibration_mcs.json`: `n_folds` 250 / 237 / 182, confirmed directly. **`log/78`:126 and `numbers_audit.md` make the same substitution**, so the error was inherited, not invented |
| **S4** | **"reproduces exactly across both environments" overstates its source.** `log/78` Part 2 records coverage moving: Beer Hall marginal 0.7937 → 0.7931, step-7 0.9760 → 0.9720. The defensible claim is stability to three significant figures. | A, B | Read `log/78`:68–70 directly. **The approved wording in `blocker_clearance_package.md` §5.3 carries the same overstatement** and is corrected by this round |
| **S5** | **"none of it on the 263 days it did trade" converts $p = 0.129$ into an exact zero.** `results.tex`:551 says "no **significant** drift"; the draft deleted the qualifier. This is the error §2.7a E1 exists to prevent and that Chapter 4 avoids in its own voice. | B, C | `numbers_audit.md` X5 and `results.tex` both state it correctly |
| **S6** | **Two River Taps OVER-covers at 0.963, so "shortfall" is wrong for all three venues.** | A, B, C | `tab:coverage` |
| **S7** | **Zero `% Trace:` comments in the chapter.** `results.tex` stamps one beside almost every numeric block. This is a direct violation of `PRJ93_RULES.md` ("cite the result file path in a LaTeX comment next to the number") and is the mechanism by which the untraceable numbers below survived. | B, C | `grep -c "% Trace:"` returned 0 |
| **S8** | **The cost sweep's degeneracy is causally misattributed.** The draft blamed the unelicited cost ratio; `results.tex`:817 gives the real reason — one detector threshold was evaluated, so the ratio reweights a fixed pair of counts instead of trading them off. | A, B | `results.tex` states it explicitly |

#### Single-role findings the synthesis accepted

- **A8 (Methodologist), and it is the sharpest single finding of the round.** The chapter argues
  at length that the ranking reversal was not "arranged after the fact" while omitting the one
  selection decision the project's own artefact stamps as post hoc: `mcs_L1_results.json` carries
  `"headline_designation_changed_post_hoc": true`. Verified directly. Chapter 4 discloses it at
  `sec:res-mcs`; Chapter 5, which is where the ruler divergence is *argued*, did not.
- **A1.** The origin-count reversal holds on the **absolute-error** measure only. Verified in
  `log/70` §9: at 273 origins under MASE the served arm is first (0.5862) and the day-of-week
  baseline fifth (0.6578), while `results.tex`:141 states that under the squared headline the
  served model is the argument-minimum at **none** of three venues. The draft named no measure,
  creating an apparent cross-chapter contradiction where Chapter 4 is careful to distinguish the
  two rulers.
- **A2 / C11.** "They cannot" is false at Two River Taps, where the incumbent sits 3.27 paired
  standard errors behind the argument-minimum and is eliminated at the secondary level. The
  Discussion was claiming **less** than Chapter 4 reports, on a result Chapter 4 says "needs
  stating".
- **A4.** §5.3 generalised its validity warrant to the weather and pooling nulls, which neither
  the pairing nor the numerics measurement touches, and whose artefacts `log/78` Part 6 records
  as carrying no environment identity.
- **A11 / A12.** §5.4's partition had cross-venue transfer on the circumstances side when
  `config.py`:178–191 makes it a demand-structure property (Ellel trades ~1.2 days a week, so
  every scaled basis fails); §5.5's "four of the six" did not close.
- **A13.** §5.5's boundary criterion read "no site and no opening calendar". Ellel is an
  **included** venue in `EVENT_ONLY_VENUES` precisely because its structural zero is not a fixed
  weekday, and §5.4 concedes its calendar is wrong on four days in five, so the calendar limb
  does not discriminate. Only the fixed-site limb does.
- **B10.** The 1st↔5th reordering carried no $p$-value. Verified: `rung1_robust_dow` sits at
  $p = 0.178$ in the same ninety per cent set, so what moves is rank order, not separability.
- **B11 / B15.** "124 misses and 8 false alarms" had no denominator ($N = 644$, recall 0.807
  [0.78, 0.84]); "five of nine" silently conditioned on the nine entrants that scored, a tenth
  having returned no measurement (T6 survivorship).
- **B13.** The rank-implied coverage agreement is 0.00114 / 0.00121 / 0.00157, so "to a
  thousandth" is not met at any venue. The stronger point, accepted: the implied and measured
  columns are a **decomposition of the same indicators**, so the agreement locates the departure
  and adds no precision to its size. `results.tex`:526 carries the same "to a thousandth" phrase
  and is recorded for 8D.
- **B16.** The 22-of-41 reconciliation result needed its multiplicity disclosed (uncorrected
  $t$-tests, 56 residuals per node, about two rejections expected by chance). The conclusion is
  robust — 22 of 41 against $\pi = 0.05$ is overwhelming — so only the disclosure was missing.
- **B17.** "Four quantities … in three of them the sample size had not been recorded" had **no
  result file**. Sourced instead to `numbers_audit.md`: 340 claims audited, 309 resolving exactly,
  four conclusion-changing mismatches. The unsupported "three of them" quantifier is gone.
- **C7 / A17.** §5.5 gave the licence as the TabPFN withdrawal reason, which contradicts
  `conclusion.tex` (hosted-service entry point) and is self-defeating: if evaluation is licensed,
  the licence cannot be why nothing was evaluated. `BLOCKED_third_party.md` §C carries **two**
  constraints; the proximate one is data egress plus a vendor-gated local-weights path.
- **C8.** Zaffran's claim was widened from "a shift that never arrives" to "whether or not a
  shift arrives", dropping the step-size condition Chapter 2 states.
- **C10.** RQ5's answer did not open with a verdict, which `06` §5 binds Chapter 5 to do and
  which is what makes R8 traceable.
- **C12.** D-D1's equal-prominence requirement (R9's two failed predictions) is unmet **and R9 is
  nowhere in the document** — none of its figures appears in any `.tex` file. Taken the
  in-scope way: the paragraph is narrowed to the chain it can evidence, and §5.4 now records the
  two failed pre-registered predictions.
- **C18.** D-D2's instruction *"State this before an examiner finds A12"* was unmet; the Beer
  Hall replenishment decision is now named.
- **C19 / A9.** Stocker's finite-sample guarantee was stated unqualified while §5.4 measures
  within-group exchangeability failing at two venues. Condition attached; "extends" changed to
  "composes".
- **C20.** An unverified negative about `montero-manso_principles_2021` ("never quantify")
  softened to what Chapter 2 supports.
- **C3 / B21 / A16 (three roles, one resolution).** The saturated-logit "$10^{-4}$" appears in no
  Chapter 4 result, and all three roles objected for different reasons — C: unanchored; B: the
  agreement is at optimiser tolerance and is an **algebraic identity**, not an empirical
  comparison; A: the logit is equally non-identified under complete separation. B's framing
  resolves all three, and the number is now gone in favour of the identity.

#### Genuine disagreements, preserved rather than flattened

**D1. A5 against the synthesis, on what the numpy sensitivity establishes.** A5 held that the
$p$-value moving 0.191 → 0.036 does not exclude Monte Carlo instability, so calling it "a finding
about the data rather than about the computation" is unidentified, and recommended conceding the
rival explanation. **Partly overruled, on arithmetic A5 did not have.** A5 assumed $B = 1000$ from
`tab:winkler`'s caption; `interval_calibration_mcs.json` records `n_boot: 10000`. At $B = 10{,}000$
the Monte Carlo standard error on $p \approx 0.19$ is about 0.004, so a move of 0.155 is roughly
forty times resampling noise and is not explained by it. The resolution **strengthens** the
paragraph instead of conceding: the exclusion is now stated in the text. A5's underlying demand
was right — the claim needed identifying — and the disagreement is about which way.
**Byproduct worth more than the finding: `tab:winkler`'s caption says $B = 1000$ where the
artefact says 10,000.** Recorded for 8D as H7.

**D2. C2 against B2, on whether the pairing figures are traceable.** C2: £381.68 and £61.51
appear nowhere in the document, and `appendix/robustness.tex` lacks the pairing-variance material
`results.tex`:130 promises is there. B2: the draft picked the *correct* triple and it resolves in
`mcs_L1_results.json`. **Both are right and they are not in conflict** — the numbers trace to the
artefact and not to any float in the document, because §4.5 displaced the pairing exposition to
Appendix D and it never landed there. That is a Chapter-4/Appendix-D debt, not a Chapter-5 defect.
Recorded as H8.

**D3. A11(a) against the synthesis, on Ellel's occurrence signal.** A11 placed it circumstance-side
(the booking diary was not supplied); the draft had it problem-side. **Resolved by splitting it**,
which is what the evidence supports: the *uncertainty* of occurrence at a booking-driven venue
recurs for anyone, and the *diary's non-arrival* is this project's circumstance.

#### Corrections this round makes to files upstream of the chapter

Recorded here because the corrections-are-appended rule applies to the stores, not only to the
draft, and because three of these are errors the draft **inherited** rather than introduced.

| Store | What is wrong | Status |
|---|---|---|
| `conclusion.tex` | "the aggregated adaptive arm is the worst of the five at every venue" — false at the Beer Hall (S1) | For 8C-5 |
| `blocker_clearance_package.md` §5.3 | the approved note's "reproduces exactly" overstates `log/78` (S4) | Corrected in the chapter; flagged to the owning file |
| `log/78` Part 3 and `numbers_audit.md` ADDENDUM | attribute the interval-study instability to the **ladder's** 205 origins (S3) | Corrected in the chapter; flagged |
| `results.tex` `tab:winkler` caption | states $B = 1000$; the artefact says 10,000 (H7) | For 8D |
| `results.tex`:526 | "agree to a thousandth" — the differences exceed 0.001 at all three venues (B13) | For 8D |
| `results.tex` §`sec:res-vuspr` / §`sec:res-costsweep` | recall 0.807 against 0.804, precision 0.871 against audit V4's 0.872 (H4) | For 8D |

---

## Iteration 2 — verification plus fresh audit

Three independent calls again, each given the specific repairs to verify plus a fresh audit
mandate, and each warned that a repair may have introduced a new overreach.

*(Findings recorded on return; this file is written at both ends of the round rather than only at
the close, per `PRJ93_RULES.md`.)*

### The cost of iteration 1, measured

| | Marker total | 5.1 | 5.2 | 5.3 | 5.4 | 5.5 |
|---|---|---|---|---|---|---|
| Budget | **2,400** | 500 | 500 | 400 | 700 | 300 |
| Before critique | 3,041 | 508 | 740 | 487 | 795 | 471 |
| After iteration-1 fixes | **4,144** | **828** | **1,123** | **783** | 890 | 521 |

**Every blocking fix added words, and that is the finding this table exists to record.** T2, T3
and T6 require a $p$-value, an interval, a denominator and a survivorship disclosure on each
claim; the chapter restates roughly thirty of Chapter 4's numbers; so compliance costs on the
order of a thousand words in a chapter budgeted 2,400. The draft went from 27 % over budget to
73 % over.

**This is not a writing problem and compressing the prose will not fix it.** The apparatus
belongs beside the number, and the number's first home is Chapter 4. Three routes exist and only
the third is both honest and cheap:

1. Keep the apparatus in Chapter 5 and accept ~4,100 words. Lands the document near 23,000
   against HC1's 20,000 with two chapters unwritten. Rejected.
2. Drop the disclosures. Reverses eight blocking findings and fails T2/T3/T6. Rejected.
3. **Put each disclosure once, in Chapter 4 where the number is first reported, and have
   Chapter 5 cite the section.** Chapter 4 already has the caption convention for exactly this.
   Costs Chapter 4 some words and returns most of Chapter 5's.

Route 3 touches an approved composition (8C-3's Chapter 4), so **it is an escalation and is
brought to Phuong rather than executed.** What is executed here is the part that needs no
approval: the apparatus that can live in a `% Trace:` comment does, and the prose carries the
claim and its locator.

### Iteration 2, Role A (Methodologist) — returned

Ten of twelve nominated repairs land. **Six blocking findings stand and five are attributable to
the revision rather than to the original draft**, which is the pattern the skill file warns about:
a fix that strengthens a claim exposes the claim to a sharper test.

| # | Finding | Verified | Disposition |
|---|---|---|---|
| **G1** | **The paired standard error carrying §5.3's whole argument is computed as if folds were independent, and the same artefact stores the autocorrelation showing they are not.** `ellel.paired_variance_top4[0]` reports `se_paired: 3.8149` = 61.5128/√260 and, immediately beside it, `acf_lag1_10` running 0.811 down to 0.241. A one-day origin step at a seven-day horizon overlaps every window. | **CONFIRMED.** Newey–West inflation over the ten stored lags is 9.88, so the sd multiplier is 3.14 and the effective paired se is about £12, putting the gap at 0.16 se rather than 0.50. | **Fix, but not with that number.** See the ruling below |
| **G2** | **"The one figure it does move is Ellel's reported set size" is false and self-contradicting.** §5.1's Two River Taps exception exists only under the squared measure; `results.tex`:158 says so in terms. | **CONFIRMED** against `results.tex` | Fixed |
| **G3** | §5.3's "reproducing to three significant figures" is contradicted by `log/78`, which records Beer Hall arm A Winkler 1814.3 → 1839.6 | **OVERRULED, and the disagreement is recorded rather than resolved.** That row is in `log/78` **Part 2**, whose subject is `.venv-eval` reproducing `log/61`'s *recorded deltas*, and it is at level 0.05 where `tab:winkler` prints 0.90. `log/78`'s own Part 3 headline is *"The coverage and Winkler point estimates are resolution-stable to three significant figures"*, and Part 4 states *"its Winkler point estimates reproduce exactly"*. The draft uses the source's own wording | **No change.** What would settle it is the Winkler means from both environments; only one environment's artefact is committed, so it **cannot be settled from here**. `log/78` carries an internal tension between its Part 2 table and its Part 3/4 summaries: recorded for 8D as H9 |
| **G4** | **§5.3 reports the smaller of two Two River Taps flips and omits the one its source calls "the single most consequential thing found in this session"**: p(P) 0.209 → 1.000, P displacing incumbent D as the survivor, and an adoption candidate appearing from nothing. | **CONFIRMED** in `log/78` Part 3 | Fixed. It also makes the resampling-noise exclusion far more emphatic, so disclosure costs the argument nothing |
| **G5** | **The headline set sizes are block-length dependent, and at the Beer Hall the dependence reverses §5.1's answer.** At `block_len` 2 the set is 3 members and `rung1_robust_dow` **is eliminated**, which is the separation §5.1 says does not occur. | **CONFIRMED** from `sensitivity_headline_common`: BH sizes 3/5/4/4 at blocks 2/7/14/21, `robust_dow` absent only at 2. Block 7 is pre-registered and yields the largest set, so it is the conservative choice | Fixed by naming the pre-registered block length. The sweep itself stays in Appendix D per approval A9 |
| **G6** | **The cost-sweep counts and the corpus precision are on different bases.** 644 events minus 124 misses is 520 true positives; against 8 false alarms that is a precision of 0.985, not the 0.871/0.872 reported. | **CONFIRMED by arithmetic** | Fixed by separating the two, not by reconciling them, which cannot be done from here. Compounds H4 |
| **G7–G12** | advisory: per-paragraph rather than per-partition counts; the MC exclusion uses the se of one $p$ where the se of a difference is wanted (~28× not ~40×); entrant accounting; `config.py`'s `VENUE_LOSS` declares the absolute ruler while the artefact declares the squared one; baseline-tuning effort unstated; protocol leakage disclosed for one decision but not scoped | Accepted | G8 and G10 fixed; G11/G12 recorded for 8D |

#### The ruling on G1, and it is the most important judgement of this round

**The finding is right and its number may not enter the dissertation.** `PRJ93_RULES.md` is explicit
that a number entering a decision or the dissertation comes from an instrumented tool with a
fixture, never from an ad-hoc calculation, and a Newey–West inflation computed in a critique round
is exactly the ad-hoc script that rule exists to keep out. Putting £12 or 0.16 se into the chapter
would repair one defect by committing the one the rules name first.

**What survives the correction is the argument, and it survives intact.** The dependence inflation
multiplies the paired and the unpaired standard error by the *same* factor, so it cancels in their
ratio:

$$\text{sd}_{\text{indep}} / \text{sd}_{\text{paired}} = 381.6804 / 61.5128 = 6.2049$$

is invariant to it. The factor of 6.2 is therefore the quantity Phuong's hand-off should have
rested on all along, and it is untouched. What the correction reaches is the two things built on
top of the factor: the absolute bound ("roughly £6 either side of zero"), which was mine, unsourced
and anti-conservative, and the se-multiple, which is Chapter 4's.

**So the repair is: drop the invented bound, keep the artefact's 0.50 se as Chapter 4 reports it,
add the dependence caveat in the same words §5.4 already uses for coverage, and say that the
factor is a ratio and so unaffected.** That leaves the chapter with no number it cannot trace, one
fewer overclaim, and a stronger argument than the one the critique attacked.

### Iteration 2, Roles B and C — returned, and one of my own rulings reversed

**The G3 overrule was wrong, and it is the most instructive item in this log.** In iteration 2 I
overruled Role A's G3 (that "reproducing to three significant figures" is contradicted by
`log/78`) on the reasoning that the cited row sits in Part 2, a different comparison, at level 0.05
where `tab:winkler` prints 0.90. Role B then returned the same finding independently with the
significant-figure arithmetic attached, and the check that settles it is one line:

- `tab:winkler` prints **Beer Hall arm A = 1814** (`results.tex`:655).
- `log/78` Part 2's table shows that exact value moving **1814.3 → 1839.6** across the two
  environments.
- For a nominal ninety per cent band the lower quantile *is* 0.05, so "@ 0.05" is that band, not a
  different level.

To three significant figures 1810 and 1840 differ. **The claim was false and two independent roles
were right.** Three consequences beyond the sentence:

1. `log/78` **contradicts itself**: its Part 2 table records a 1.4 % move in a Winkler mean while
   its Part 3 headline says the point estimates are "resolution-stable to three significant
   figures" and its Part 4 says they "reproduce exactly". Recorded as **H9**.
2. **`blocker_clearance_package.md` §5.3's approved note is wrong** where it says "Every Winkler
   mean, coverage figure and Clopper–Pearson limb reproduces exactly". Recorded as **H10**.
3. The chapter now states the measured bound: coverage shifts by at most 0.004 and the largest
   Winkler movement is 25 points on 1814, so the figures are stable to **two** significant figures.

**Why the overrule happened is worth recording, because it is the session's own failure mode
recurring.** I reasoned about which level the row referred to instead of opening `results.tex` and
comparing the printed value. That is the exit-code rule in a new place: I checked my reasoning
about the artefact rather than the artefact. The fix took one grep.

#### Iteration 2 disposition

| Finding | Roles | Status |
|---|---|---|
| `p = 0.178` is the squared measure's; the clause is scoped to the absolute measure, where it is **0.103** | A, C (B marked this FIXED and missed it) | Fixed. **An instance of independence paying off in the other direction**: the Statistician verified the figure against the artefact and did not notice it was the wrong artefact column for the sentence's scope |
| "the one figure it does move" is false; Two River Taps' secondary elimination moves too | A | Fixed |
| §5.3 reported the smaller of two Two River Taps flips, omitting p(P) 0.209 → 1.000 with the incumbent displaced and an adoption candidate appearing | A | Fixed. `log/78` calls it "the single most consequential thing found in this session" |
| Set sizes 5/4/6 are the **maximum** over four block lengths; at block 2 the Beer Hall baseline is eliminated | A, B | Fixed by naming the pre-registered block length and that it is the least discriminating of the four |
| "roughly £6 either side of zero" is not the interval: it is centred on −1.91, so [−8.19, +4.37], and the se itself is optimistic | A, B | Fixed by removing the invented bound. See the G1 ruling above: the **factor** is a ratio and cancels the dependence correction, so 6.2 survives and is what the argument now rests on |
| **Beer Hall coverage exclusion assumes independent indicators**, which §5.4 disowns. Exclusion of nominal needs design effect < 3.33, i.e. ICC < 0.39; at complete within-origin dependence the interval becomes [0.830, 0.913] and **includes** nominal. Two River Taps survives either way | B | **Mitigated, not closed.** The chapter now rests the Beer Hall result on the served model's identical 0.870 and on the rank decomposition rather than on the interval, and states the dependence. **The design effect is computable from stored per-origin indicators and was not computed** — a run decision, so it stays open as **H11** |
| Pooling displacement divided an estate-wide numerator by one venue's trailing level at two moments | B, C | Fixed with per-venue ratios (one to three per cent, largest at Ellel) |
| VUS-PR: a categorical sustained-versus-point claim drawn from cells with no intervals whose adjacent members (0.912, 0.932) straddle the boundary | B | Fixed by weakening to what the point estimates support |
| The audit paragraph reported 309/340 and four conclusion-changing mismatches, omitting MISMATCH 17 and UNTRACEABLE 9 | C | Fixed. Same survivorship shape as the omitted flip above |
| "an order of magnitude" is 6.98× | B | Fixed to "roughly seven times", matching `results.tex` |
| §5.3 carried zero citations | C | Fixed with `hansen_model_2011`, already cited elsewhere |
| "factor of eleven" drops Chapter 4's "false-open" qualifier and appears to contradict its "factor of about fifty" | C | Fixed |
| Traces mis-targeted: 702/901 are `exchangeability_diagnostic.json level_coupling`, not the weather or group files; the six-fold rank is in `log/43` | B | Fixed |
| MC exclusion bounds resampling only; a near-uniform null $p$ makes a move of this size ordinary as sampling variability | B | Fixed by stating it, which is the section's own reading |

---

## Round cap reached, per SKILL.md §5

**Two revision rounds are done and blocking failures remain, so the manual says stop and report
with an explicit caveat naming each.** Not a third round.

### Unresolved, with owners

| # | Unresolved failure | Why it is not closed here | Owner |
|---|---|---|---|
| **H11** | The Beer Hall coverage exclusion is conditional on an unquantified design effect (ICC < 0.39) | Computable from stored per-origin indicators; that is a run, and reruns are a human gate | Phuong / 8D |
| **H12** | **T8 fails.** No NotebookLM check was run this session on any claim about a cited paper | Every such claim is inherited from Chapter 2 or from `defensible_divergences_writeup_pack.md`, where it was verified at source, and was re-checked here against those records. That is a documentary check, not the one the rule names. Reporting it as a pass would be the "clean result without its scope" defect | Phuong / 8D |
| **H8** | The £381.68 / £61.51 / 6.2 decomposition exists in **no float**; `appendix/robustness.tex` lacks the pairing-variance material `results.tex`:130 promises is there | Adding it edits 8C-3's approved Appendix D | Phuong / 8C-3 |
| **H7** | `tab:winkler`'s caption says $B = 1000$; the artefact says **10,000**. §5.3's stability argument depends on 10,000, so as printed the chapter is refuted by its own table. (`tab:mcs`'s $B = 1000$ is correct — a different bootstrap) | A Chapter 4 caption fix | 8D |
| **H4** | Chapter 4 states recall as 0.807 and 0.804 and precision as 0.871 against the audit's 0.872; and 644 − 124 misses against 8 false alarms gives a precision of 0.985, so the counts and the precision are on different bases | Cannot be reconciled from committed artefacts | 8D |
| **H9 / H10** | `log/78` contradicts itself on point-estimate stability; `blocker_clearance_package.md` §5.3's approved note says "reproduces exactly" | Corrections to the owning stores | 8D |
| **H13** | **RQ5's premise was never instantiated.** The sweep runs miss-to-false-alarm ratios of 1:1 to 10:1, all weighting a miss at least as heavily as a false alarm, while RQ5 posits the opposite asymmetry. The chapter says so plainly, but `06` §4 argues a stated question without an answer is the defect R8 catches and forecloses D12 | Rewording a research question is a methodology gate | **Phuong, explicitly** |
| **H3** | `conclusion.tex`: the adaptive-arm error (S1), the extension count stated as eight, seven, six and nine, and the unsourced "three of four" quantifier | Conclusions is 8C-5's chapter | 8C-5 |

### The budget, which is now the chapter's largest open question

| | Marker | 5.1 | 5.2 | 5.3 | 5.4 | 5.5 |
|---|---|---|---|---|---|---|
| Budget | 2,400 | 500 | 500 | 400 | 700 | 300 |
| Before critique | 3,041 | 508 | 740 | 487 | 795 | 471 |
| After round 1 | 4,144 | 828 | 1,123 | 783 | 890 | 521 |
| **After round 2** | **4,572** | **962** | **1,157** | **1,031** | **902** | **521** |

**Correctness cost 1,531 words, and the direction is one-way.** T2, T3 and T6 require a $p$-value,
an interval, a denominator and a survivorship disclosure per claim; the chapter restates roughly
thirty of Chapter 4's numbers; so compliance is ~1,500 words in a section budgeted 2,400.

**One finding materially reframes this, and it is in the rubric.**
`00_marking_criteria.md`:411–414 records that the guidance *"states explicitly that 'there is no
word count for each section', and section balance should be agreed with the supervisor."* The §2.1
per-section budgets are therefore **this project's own approved allocation (A10), not a rubric
requirement**. What is mechanical is HC1's 20,000-word document total.

So the question is not whether 5.2 exceeds 500. It is the document:

| Chapter | Marker | Budget |
|---|---|---|
| 2 Background | 4,938 | 4,000 |
| 3 Methods | 5,526 | 4,200 |
| 4 Results | 6,247 | 5,200 |
| **5 Discussion** | **4,572** | **2,400** |
| 1 Introduction | 0 (unwritten) | 1,400 |
| 6 Conclusions | unmeasured | 1,100 |
| Abstract | 0 | 300 |
| **Four measured** | **21,283** | **15,800** |

Projected at budget for the unwritten three, the document lands near **24,000 against 20,000**.
**Four of six chapters are now measured against the reallocation decision S-3 defers, and the
deficit is +35 % on the measured four.** Reallocation can no longer be deferred on the grounds
that too few chapters are measured; what it now needs is a decision about which criteria are
dropped or which chapters are cut, and that is Phuong's.
