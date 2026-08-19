# 106 · S34 · Every open Hansi item drafted under a suspended cap

**Package:** S34, drafting and editing with the 20,000 cap suspended inside the package.
**Predecessors:** S28 (`101_feedback_triage.md`) for the prices below; S29 (`102_post_push_free_repairs.md`) for what was already closed.
**Regime:** all work on `feedback-hansi`, never pushed. `main` untouched. No API call, no credential, no change to the brain codebase, store, ceiling, served models or frozen artefacts.

---

## 0 · State at both ends

| | V0 (start) | V7 (end) |
|---|---|---|
| Overleaf clone branch | `main` | `feedback-hansi` |
| local `main` SHA | `019f1354794db20a6f70375de65b4cecdaea17b2` | `019f1354794db20a6f70375de65b4cecdaea17b2` |
| `git ls-remote origin` HEAD | `019f1354794db20a6f70375de65b4cecdaea17b2` | `019f1354794db20a6f70375de65b4cecdaea17b2` |
| `git ls-remote origin` refs/heads/main | `019f1354794db20a6f70375de65b4cecdaea17b2` | `019f1354794db20a6f70375de65b4cecdaea17b2` |
| counted body (`texcount -0 -sum -merge -total`, the seven files `\bodywordcount` names) | **19,985** | **20,085** |
| appendices (four files) | 10,631 | **10,631** |
| `latexcheck main.tex --shell-escape` | PASS, 116 pages | PASS, 116 pages |
| undefined references / citations / floats lost | 0 / 0 / 0 | 0 / 0 / 0 |
| overfull / underfull boxes | 4 / 14 | 4 / 14, same locations |
| `venueordercheck.py chapters abstract.tex` | PASS | PASS |
| ai-gm repo HEAD | `48549bedafde1e641e86b4e6c1f42601d1116c78` | this report |

**`origin/main` did not move.** Overleaf served the compliant document throughout, and still does.

**The branch is 85 words over the cap.** That is the declared consequence of the suspension, not a failure of the package.

`~/texlive/2026/bin/universal-darwin` was exported before every measurement. `svg.sty` in the clone root is the scratch stub the local compile needs; it is gitignored, which is why the baseline control build in a worktree failed twice before it was copied across.

---

## 1 · V0 · Baseline, per file

| file | V0 | V7 | delta |
|---|---:|---:|---:|
| `abstract.tex` | 320 | 320 | 0 |
| `chapters/introduction.tex` | 1,172 | 1,205 | **+33** |
| `chapters/literature_review.tex` | 3,584 | 3,606 | **+22** |
| `chapters/methodology.tex` | 4,919 | 4,919 | 0 |
| `chapters/results.tex` | 5,561 | 5,566 | **+5** |
| `chapters/discussion.tex` | 2,593 | 2,634 | **+41** |
| `chapters/conclusion.tex` | 1,836 | 1,835 | **-1** |
| **body** | **19,985** | **20,085** | **+100** |

Every delta below is measured on that instrument, before and after, on the same files.

---

## 2 · V1 · H-1, the abstract. Two drafts. Neither selected.

The measured baseline reproduces S28 exactly: `wordcount.py` returns **299** marker words for the
abstract section, and the eleven-sentence allocation is problem 20, gap 24, aim 12, method 50,
results 148, disclosure 26, conclusion 19.

### 2.1 · Draft 1a, keeping the 399 / 386 / 331 triple

Background is raised from 44 to 59 by one new sentence defining estate scale qualitatively, and
the method sentence is cut from 50 to 36 by moving the target variable into that sentence and
dropping the trading-rate range.

> Small hospitality estates are offered forecasting, calibration and alerting components validated on corpora orders of magnitude larger than their own. Whether they hold at estate scale is untested, and no surveyed proactive system scores its decisions against those of the operator bearing their cost. **Estate scale means few venues, daily revenue over short histories, and a mostly empty calendar.** This dissertation measures what one three-venue estate's data can and cannot establish. **Ten forecasting approaches were fielded at rolling origins under model confidence sets, a Mondrian split-conformal interval audited per venue, and a cumulative-sum detector evaluated against injected events under asymmetric cost, over 399, 386 and 331 days.** [sentences 6 to 12 unchanged]

| move | V0 | 1a |
|---|---:|---:|
| problem + gap | 44 | 44 |
| **background (new)** | 0 | **15** |
| aim | 12 | 12 |
| method | 50 | **36** |
| results | 148 | 148 |
| disclosure | 26 | 26 |
| conclusion | 19 | 19 |
| **total** | **299** | **300** |

**Delta +1**, which is the whole headroom. `venueordercheck.py` PASS, default and `--advisory`.

### 2.2 · Draft 1b, removing the triple

The frame lengths become a range and move into the background, which lets the method sentence stop
at "asymmetric cost".

> [sentences 1 and 2 unchanged] **Estate scale here is three venues, daily revenue over 331 to 399 days, and 1.2 to 5.9 trading days weekly. This dissertation measures what that estate's data can and cannot establish. Ten forecasting approaches were fielded at rolling origins under model confidence sets, a Mondrian split-conformal interval audited per venue, and a cumulative-sum deviation detector evaluated against injected events under asymmetric cost.** [sentences 6 to 12 unchanged]

| move | V0 | 1b |
|---|---:|---:|
| problem + gap | 44 | 44 |
| **background (new)** | 0 | **20** |
| aim | 12 | **11** |
| method | 50 | **31** |
| results | 148 | 148 |
| disclosure | 26 | 26 |
| conclusion | 19 | 19 |
| **total** | **299** | **299** |

**Delta 0.** `venueordercheck.py` PASS, default and `--advisory`.

### 2.3 · The venueordercheck consequence, which is the opposite of the one the brief anticipated

The brief asks whether any finding **becomes** UNANCHORED under 1b. **None does, and none can.**
The check grades on **two or more** positional triples in a paragraph that names no venue, and the
abstract has been one paragraph since HC4. Removing a triple takes the file from one to zero, and
zero cannot fail.

**The instrument was verified live on both drafts before that was reported**, because a check that
scans nothing must not read as a pass. A control probe reinstated the second triple, restoring
`retain five, six and four` in the results sentence:

| file | triples | probe (second triple restored) | verdict |
|---|---:|---|---|
| draft 1a | 1 | 2 | **FAIL, UNANCHORED at line 215** |
| draft 1b | 0 | 1 | **PASS** |

**That is the finding, and it is what decides between them.** Draft 1a leaves the abstract at the
check's ceiling: one triple, and any future addition is caught. Draft 1b spends that protection.
At zero triples the file has a free slot, so an editor who later reinstates `five, six and four`
gets a clean pass on exactly the defect this check was commissioned for, the R5 venue-order swap
the abstract reproduced independently in August.

Against that, 1b carries the frame lengths as a range, a form that cannot be read positionally at
all, so it removes the defect shape from the numbers it keeps rather than relying on a guard.

**Neither draft is selected. The choice is between a guard and a shape, and it is Nam's.**

---

## 3 · V2 · H-2, the four abbreviation sites. Applied.

**First-occurrence status re-verified per site in document order**, comments and `\label` / `\ref` /
`\cite` arguments excluded. All four are still the first occurrence:

| token | first occurrence now | earlier hits |
|---|---|---|
| TabPFN-TS | `literature_review.tex:53` | one comment at `:48` |
| VUS-PR | `literature_review.tex:207` | none; `methodology.tex:461` and `results.tex:770` are later |
| CPTC | `literature_review.tex:217` | one comment at `:213` |
| TSB-AD | `results.tex:783`, in a caption | `methodology.tex:476` is a comment |

| site | forecast | **measured** |
|---|---:|---:|
| `literature_review.tex:53` TabPFN-TS | +9 | **+9** |
| `literature_review.tex:207` VUS-PR | +5 | **+7** |
| `literature_review.tex:217` CPTC | +7 | **+7** |
| `results.tex:783` TSB-AD | +5 | **+5** |
| **total** | **+26** | **+28** |

Each site was priced in isolation, against `git show HEAD:` of the same file, so the four figures
are independent and sum exactly.

**The +2 divergence is entirely VUS-PR, and half of it is the instrument.** The expansion is
`volume under the surface for precision--recall (VUS-PR)`, which a reader counts as six added
words. `texcount` charges **seven**, because it splits a `--` compound into two tokens. Measured
directly: `alpha precision--recall omega` counts 4, `alpha precision-recall omega` counts 3. The
remaining word is that S28's +5 assumed a phrase one word shorter than the one that matches
`acronyms.tex`, which writes `precision--recall`. Accuracy was preferred to the two words.

**A `--` compound is one word to a marker and two to the counter.** Any future expansion carrying
one is priced one word high by a hand count and one word low by a prose estimate.

---

## 4 · V3 · H-5, the five research questions. Applied verbatim.

### 4.1 · Verbatim, demonstrated rather than asserted

The five questions were **extracted programmatically** from the `enumerate` at
`chapters/introduction.tex` `sec:intro-aims` and substituted into `sec:disc-answers`, so the two
sites cannot differ by a typing error. Diffed after the edit, whitespace normalised:

| | intro chars | discussion chars | identical |
|---|---:|---:|---|
| RQ1 | 203 | 203 | yes |
| RQ2 | 169 | 169 | yes |
| RQ3 | 130 | 130 | yes |
| RQ4 | 165 | 165 | yes |
| RQ5 | 172 | 172 | yes |

All five character-for-character identical.

### 4.2 · The price is +41, not +26, and the reason is in the forecast

| form | `discussion.tex` | delta |
|---|---:|---:|
| V0 | 2,593 | |
| **applied: `The Nth asked: \emph{<question>}`** | 2,634 | **+41** |
| alternative: `\emph{<question>}` with no ordinal | 2,619 | **+26** |

S28's +26 came from comparing the five bare questions (123 words) against the five current openers
(97 words). **The openers include their ordinal framing and the questions do not.** Keeping
`The first asked:` and the four like it costs 3 words each, 15 in total, and 97 + 41 = 138 = 123 + 15.

The unframed variant lands on S28's +26 exactly. It was measured and not applied: the ordinals are
how a reader ties each paragraph to its row in `tab:answers`, and the section's own opening sentence
promises the questions are answered "in the order the Introduction states it".

### 4.3 · The restoration draft, priced separately. Not applied.

Measured across `f34a486` and `1dfb029`, the five answer paragraphs went **657 words to 526**, a
loss of **131**. (S28 reported 668 to 526; the difference is that this measurement excludes the
mid-paragraph comment block `f34a486` inserted, which `1dfb029` later repaired.)

**Every removal `f34a486` named a survivor for still has that survivor today**, checked at the
named site rather than assumed:

| removed from §5.1 | words | named survivor | present |
|---|---:|---|---|
| six-origins / 273-origins pair | 24 | `conclusion.tex:113` | yes, with the interpretation |
| "19 of them with a positive mean residual" | 9 | `results.tex:165` | yes, with the predicted direction |
| Ellel 0.692 / Beer Hall calendar-closed pairs | 20 | `conclusion.tex:157` | yes, plus "the largest miscalibration in the study" |

**So the de-duplication commit was right, and stays right. Everything worth restoring is from
`1dfb029`, which named no survivor for any of it.**

| # | restored | from | words | why it is a finding and not repetition |
|---|---|---|---:|---|
| a | `, which is what predicts their signs` | `1dfb029` | 6 | The scale-drift limb is the **independent** evidential leg (the rank statistic decomposes the same miss indicator, per this file's own 2026-08-09 note). Without the clause the body states the drift and never says what it establishes. **Nowhere else in the body claims that drift direction predicts coverage-miss direction**; `results.tex:585` reports opposite drift signs, which is a different statement. |
| b | `What changes is the subject of the finding rather than the finding.` | `1dfb029` | 12 | Tells the reader the trading-day decomposition **relocates** the coverage failure rather than overturning it. Stated nowhere else. |
| c | `, so no operating point was available to select` | `1dfb029` | 8 | The consequence of the counts staying fixed, and the reason `tab:answers` grades RQ5 "Unanswered, cause declared". The fact survives at `results.tex:893` and `discussion.tex:342`; what is missing is the answer paragraph stating its own conclusion. **The weakest of the four.** |
| d | `confidence` in "the confidence set did not sustain it" | `1dfb029` | 1 | Restores which set failed to sustain the marginal weather detection. "The set" is otherwise ambiguous with the five-arm weather set in the same sentence. |
| | **measured total** | | **+27** | on top of the applied V3 |

**Refused, and the refusal is the point:**

- *"rather than smooth"* (RQ2, 3 words). A gloss on a technical classification that `tab:intermittency` carries. Repetition.
- *"ninety per cent"* on the bootstrap intervals (RQ5, 3 words). **Cannot be restored from these two commits**: the clause it qualified was removed by `0e01f57`, outside the two the package names, and `results.tex:803` carries it with the level stated in the `tab:vuspr` caption. No defect.
- The six-origins, 19-nodes and 0.692 spans above. Survivors verified present.

---

## 5 · V4 · H-6, objectives. Both applied.

| option | forecast | **measured** |
|---|---:|---:|
| **(a)** `\section{Objectives revisited}` becomes `\section{The specification's objectives revisited}` | +2 | **+2** |
| **(b)** an objectives statement in `sec:intro-aims` | +29 | **+33** |

**(b), as applied**, inserted after the sentence that narrows the specification's research question:

> The specification decomposes that aim into five objectives: rhythm modelling, deviation detection, reasoning and surfacing, evaluation, and documentation and handover. Each is discharged through one of its three deliverables, and Section~\ref{sec:conclusion-objectives} revisits them.

The +4 divergence is deliberate. S28's minimum form put the colon list after "three deliverables"
while the list names the **five objectives**, so a reader meets five items introduced as three.
The applied form attaches the list to the objectives and states the mapping in a second sentence.

`\label{sec:conclusion-objectives}` is unchanged. **It had no live `\ref` in the body at all**: the
only occurrence at V0 was inside a comment at `discussion.tex:36`. V4(b) gives it its first real
one, and `latexcheck` resolves it with zero undefined references.

**Both are separately promotable.** (a) alone answers the confusion. (b) additionally moves the
objectives out of Appendix D and into the body, which is the H-A2 exposure closed rather than
pointed at.

---

## 6 · V5 · H-A2. Every deferral enumerated, classified and priced. Nothing moved.

**47 references from the counted body into `appendix/`, across 22 distinct labels**, re-derived on
the current document rather than transcribed. A reference is a **deferral** only where the body's
claim is not intelligible or not defensible without the appendix; most of the 47 point at detail
the body has already summarised.

### 6.1 · Must promote: the body claim is not defensible without it

| # | body site | target | what the appendix carries | price |
|---|---|---|---|---:|
| **P1** | `methodology.tex:377` | `app:static-regime` (B.13) | The adoption principle is stated with a scope clause and a bare parenthetical. Behind it: on a single eight-week static block the served exogenous arm **produces no forecast at any venue**, and at the Beer Hall the robust day-of-week baseline wins at 0.704 MASE against the univariate foundation arm's 0.721, so **the benchmark that costs nothing is not defeated at all**. A marker who does not open Appendix B reads an unqualified adoption principle. | **+15** outcome only, **+28** naming both failures |
| **P2** | `conclusion.tex:219` | `app:conformal-bounds` (A.9.2) | A Further Work proposal rests on a ceiling that exists nowhere else. On the Beer Hall cell where the calendar partition covers 0.489, an unpartitioned band already covers 0.926, which is exactly what an oracle grouped on realised occurrence achieves. **The proposal's ceiling on that cell is what doing nothing already reaches.** | **+20** ceiling only, **+33** with the Winkler qualifier the appendix attaches |

P2's fuller form carries the appendix's own bound on the finding, that the partition still records
the lowest Winkler score at all three venues and no method displaced it. Promoting the ceiling
without it would leave the body reading as a case for removing the partition, which the appendix
declines to make.

### 6.2 · Should promote: the body claim is weaker without it

| # | body site | target | what is missing from the body | price |
|---|---|---|---|---:|
| **P3** | `methodology.tex:86` | `app:gap-signal` (A.9.7) | The body names the input (735 messages) and `results.tex:933` reports the outcome (four of twelve clusters cleared). **What the signal does is only in the appendix**: it clusters repeated operational questions and surfaces one only where its density of unanswered questions exceeds a measured baseline for ordinary traffic. | **+23** |
| **P4** | `discussion.tex:235` | `app:divergence-catalogue` | Five divergences from the reviewed literature; the body retains two and `1dfb029` moved three to the appendix. Divergence from reviewed method is a marking criterion, and a marker who skips appendices sees two of five. Naming the three costs little. | **+10** |

### 6.3 · Appendix is correct, including three S28 classified as load-bearing

S28 listed six load-bearing references. **Three of them are reclassified here, each on the body
sentence rather than on the label:**

| site | target | why the body already stands |
|---|---|---|
| `methodology.tex:275` | `app:elicitation` | The limitation is stated in the body, in the sentence before the pointer: *"the served foundation model returns a median under a mean's name, so the headline measure elicits a functional the served forecaster cannot produce."* The appendix carries the argument, not the limit. |
| `methodology.tex:523` | `app:mondrian` | The body states the refusal in full: *"That motivates the choice and does not certify it, the result being proved for an algorithm this work does not implement, so citing it as the guarantee would claim a theorem about a procedure the served system never runs."* The appendix separates construction from guarantee from motivation, which is organisation. |
| `methodology.tex:637` | `app:agent-apparatus` | The body states what the agent returns, both comparators, the prompt-ordering pre-registration and the swept cost grid. The appendix adds the caching protocol and the paired bootstrap. Contribution 5 is evaluable from the body. |

The remaining 41 references are pseudocode, computational environment, figures, full tables,
parameter grids, sensitivity sweeps, seeds, column names, derivations and one verbatim
reproduction. Body claims stand without them.

**Found while reading the appendix, not repaired here:** `app:agent-apparatus` still reads
*"Temperature is zero and the model identifier is pinned."* S32 removed the `temperature` argument
because sampling parameters now return 400 on the pinned model. The package puts that sentence in
the next one; its exact site is `appendix/pseudocode.tex`, in the paragraph opening
*"For each candidate item the agent returns a probability"*.

### 6.4 · The objectives deferral, closed in this package

The package names the objectives in Appendix D as a known member. It was the sharpest case in the
list, because Chapter 6's heading sent a reader to Chapter 1 for something that existed only in an
appendix and **had no body reference at all**. **V4(b) promoted it, measured at +33.** No further
promotion is owed.

### 6.5 · All six prices re-measured after V6, and none moved

The V5 pricing above was taken before V6 changed `methodology.tex`, `conclusion.tex` and
`discussion.tex`. Re-measured against the post-V6 files, every promotion still applies at the same
anchor and at the same price: P1-min +15, P1-full +28, P2-min +20, P2-full +33, P3 +23, P4 +10.

**One interaction is real and it is a length, not a price.** V6 #19 split the Further Work sentence
P2 lands in, from 62 words to 33. P2-min returns it to 53. **P2-full returns it to 66**, longer
than it was before V6 touched it. If P2-full is taken, it needs its own split or V6 #19's gain at
that site is spent.

**Zero `.tex` content was moved. Every figure above is a scratch-copy measurement.**

---

## 7 · V6 · H-8, density. Nineteen of twenty rewritten, one refused.

### 7.1 · The count Hansi named is understated in the triage, by 13

| population | count |
|---|---:|
| `rather than` on a single source line | **174** |
| split across a line break (`rather\nthan`) | **13** |
| **all occurrences in non-comment source** | **187** |
| occurrences in prose outside float environments | 184 |

**174 is S28's figure and it is an artefact of a line-based counter.** The true figure is 187, one
every 150 words rather than one every 182. The observation is right and worse than the triage said.

### 7.2 · The twenty, measured before and after

Every rewrite splits at punctuation that **already** separated two independent clauses, a semicolon
or a colon, so the propositional content is carried across unchanged and the word cost is close to
zero. No qualifier was deleted; this is not the blanket reduction `99ee32b` refused.

| # | file | before | after, split into | delta | claim preserved because |
|---:|---|---:|---|---:|---|
| 1 | `literature_review.tex` | 114 | 18 + 19 + 34 + 23 + 20 | 0 | Four-limb colon list; each limb was already a full clause with its own qualification, and all four qualifications survive verbatim. |
| 2 | `introduction.tex` | 107 | 33 + 10 + 21 + 16 + 27 | 0 | Same shape, four citation-terminated limbs. Every `\citep` stays attached to the limb it supports. |
| 3 | `methodology.tex` | 77 | 17 + 60 | 0 | Split before the display equation; the second sentence still governs the equation and its `$m = 7$` gloss. |
| 4 | `conclusion.tex` | 75 | 33 + 41 | -1 | Semicolon becomes a full stop; the dropped word is the coordinating "and". |
| 5 | `literature_review.tex` | 72 | 32 + 39 | -1 | As 4. The contrast between energy load and bar revenue stays inside the first sentence. |
| 6 | `introduction.tex` | 72 | **72** | 0 | **REFUSED, see 7.3.** |
| 7 | `methodology.tex` | 70 | 36 + 34 | 0 | Colon split; the one-standard-error rule keeps its definition in the second sentence. |
| 8 | `methodology.tex` | 67 | 18 + 49 | 0 | Colon split only. **The second available split was refused, see 7.3.** |
| 9 | `conclusion.tex` | 67 | 52 + 14 | -1 | Split at the contrast rather than at the colon, so the participle "broken open by whether the venue traded" keeps the subject it modifies. |
| 10 | `results.tex` | 66 | 47 + 19 | 0 | Semicolon split; "which side dominates on the examined injections alone is unsettled" is unchanged. |
| 11 | `introduction.tex` | 66 | 23 + 43 | 0 | The aim keeps its stem; its three limbs move into a second sentence introduced by "That is:". `sec:conclusion-objectives` reads the three limbs back one by one and still can. |
| 12 | `literature_review.tex` | 65 | 50 + 15 | 0 | Semicolon split. The MAE and MASE expansions stay in the first half, where they are first used. |
| 13 | `conclusion.tex` | 65 | 40 + 24 | -1 | Semicolon split; dropped word is "and". |
| 14 | `results.tex` | 63 | 33 + 30 | 0 | Colon split; "they" in the second sentence refers to the 94 days named in the first. |
| 15 | `literature_review.tex` | 63 | 25 + 38 | 0 | Semicolon split; the hurdle-model limitation keeps both its halves. |
| 16 | `discussion.tex` | 63 | 44 + 19 | 0 | Semicolon split. Venues stay named inline beside their set sizes, so no positional read is created. |
| 17 | `conclusion.tex` | 63 | 39 + 24 | 0 | Semicolon split; the pairwise exception keeps its interval and its non-sustaining qualifier. |
| 18 | `literature_review.tex` | 62 | 31 + 31 | 0 | Semicolon split; "Their separate selection rule" keeps the same antecedent. |
| 19 | `conclusion.tex` | 62 | 29 + 33 | 0 | Semicolon split. The refusal ("not to group on whether the venue traded") and the proposal stay in that order. |
| 20 | `methodology.tex` | 60 | 23 + 19 + 18 | 0 | "Three refinements are specified" already announced three limbs; each becomes one sentence. |
| | **total** | | | **-4** | |

**26 splits, delta -4.** All four words are the coordinating "and" or "while" at a junction that
became a sentence boundary.

### 7.3 · The refusals

**#6, `introduction.tex` `sec:intro-contributions`, 72 words. Refused outright.** It is a
five-item naming list, and its length is item count rather than compounded argument. The only
available split detaches *"which is specified and frozen and has not been run"* from the fifth
contribution, and **C5 requires that disclosure to appear in the same sentence as the contribution,
not be deferred**. A split that satisfies the density criterion would breach the disclosure rule.

**#8, second split. Refused.** After the colon split the remainder is 49 words and could be split
again at *"because at frame lengths of 399 days"*. Doing so removes the word "because", and with it
the stated causal link between the frame length and the decision not to run an information-criterion
search. Juxtaposition is not causation, and no rewording found preserved the link at a lower word
cost than keeping the sentence.

### 7.4 · The distribution, before and after

| file | sentences | mean | median | >40w | >40% | longest |
|---|---:|---:|---:|---:|---:|---:|
| `introduction.tex` | 37 → **44** | 32.0 → **27.7** | 28.0 → **25.5** | 8 → **7** | 21.6% → **15.9%** | 107 → **72** |
| `literature_review.tex` | 115 → **123** | 30.8 → **29.0** | 28.0 → 28.0 | 27 → **24** | 23.5% → **19.5%** | 114 → **60** |
| `methodology.tex` | 166 → **171** | 29.1 → **28.2** | 28.0 → 28.0 | 33 → **31** | 19.9% → **18.1%** | 77 → **60** |
| `results.tex` | 170 → **172** | 27.7 → **27.3** | 26.0 → 26.0 | 33 → **32** | 19.4% → **18.6%** | 66 → **57** |
| `discussion.tex` | 96 → **97** | 26.9 → **27.1** | 26.0 → **27.0** | 17 → **17** | 17.7% → **17.5%** | 63 → **55** |
| `conclusion.tex` | 62 → **67** | 30.0 → **27.7** | 28.0 → 28.0 | 10 → **7** | 16.1% → **10.4%** | 75 → **57** |

**The longest sentence in the counted body falls from 114 words to 72**, and the 72 is the one
refused. Conclusions, which S28 measured worst on "rather than" at 9.05 per 1,000, drops from one
sentence in six over 40 words to one in ten.

`rather than` **187 before, 187 after.** V6 deleted none, which is what V6 was for.

### 7.5 · S28's +150 to +450 risk estimate priced the wrong operation

The triage forecast +2 to +5 per split, from +126 for a third of the over-40 sentences to +375 for
all of them. **26 splits measured -4.** The estimate assumed each split needs a new subject and a
connective. It does where a long sentence is one clause with subordinate matter. It does **not**
where the sentence is two or more independent clauses already joined by a semicolon or a colon,
which is what this document's long sentences overwhelmingly are: the punctuation is replaced rather
than added, and capitalisation is free.

**A rhythm pass on this document is affordable at any margin.** What is not affordable is the
different operation the estimate described.

### 7.6 · Found while rewriting, not repaired

- **`introduction.tex` `sec:intro-gap` opens on a count that does not match.** *"Each of those
  three requirements"* is followed by **four** qualifications. The three requirements are at
  `:77-80` (a model of what is normal, an honest measure of uncertainty, a rule for deciding when a
  departure is worth attention); the four limbs are pooling, weather, the conformal band and the
  alert cost, with the first two both serving requirement one. The mapping is 4 to 3, correct, and
  **stated nowhere**. The antecedent also sits in the previous section, across a `\section`
  boundary. Splitting the sentence makes the mismatch easier to see and does not create or repair
  it. Left for a ruling.
- **V2 pushed one sentence into the long tail.** The CPTC expansion took
  `literature_review.tex:217` from 53 words to 60, which is now the joint-longest sentence in that
  chapter. The two items are individually correct and interact.

---

## 8 · V7 · Close

`latexcheck main.tex --shell-escape`: **PASS**, zero errors, **zero undefined references**, **zero
undefined citations**, **zero floats lost**, 116 pages. Overfull 4 and underfull 14, the same
counts at the same locations as V0.

**No float moved chapter, and no float moved page.** Verified against a control rather than
inferred: `main.tex` was built at `HEAD` in a throwaway worktree, and its `main.lof` and `main.lot`
are **byte-identical** to the branch build's, page numbers included. The pre-session artefact in
the clone root matches both, which confirms it was a true baseline.

**No number, `\ref`, `\label` or citation key was altered anywhere in the seven counted files.**
Checked by extracting all four token classes from `git show HEAD:` and from the working file for
each, comment-stripped, and comparing sorted. One difference, and it is the intended one:
`introduction.tex` gains `\ref{sec:conclusion-objectives}` from V4(b).

`venueordercheck.py chapters abstract.tex`: **PASS**.

### 8.1 · Which items are finished, and which need a ruling before they can be

| item | state |
|---|---|
| **H-2** abbreviations | **FINISHED.** Four sites expanded, first occurrence re-verified per site, +28 measured and the divergence from +26 explained. Nothing outstanding. |
| **H-6** objectives | **FINISHED.** Both options applied and separately priced. Nothing outstanding. |
| **H-8** density | **FINISHED for the twenty.** Nineteen rewritten, one refused with a rule-level reason, one sub-split refused. The rest of the 187 instances is out of this package by its own terms. |
| **H-1** abstract | **NEEDS A RULING.** Two drafts, both at or under 300, both passing `venueordercheck`. The decision is whether to keep the file at the check's ceiling (1a) or to remove the triple's shape and give up the guard (1b). Neither is applied. |
| **H-5** research questions | **APPLIED, one ruling open.** The verbatim quoting is in at +41. Two options need a decision: whether to drop the ordinal framing (+26 instead of +41) and whether to take the restoration draft (+27), which is measured but not applied. |
| **H-A2** appendices | **NEEDS A RULING, and it is the largest.** Every deferral is enumerated, classified and priced; nothing is moved. One member of the list was closed by V4(b) at +33. The other six promotions are Nam's call. |

---

## 9 · The priced promotion table

Everything below is measured on the same instrument at the same point in the document. **Applied**
items are on `feedback-hansi` now. **Drafted** items are measured on scratch copies and are not in
any file.

| item | what it does | delta | state | coupling |
|---|---|---:|---|---|
| **V2** four abbreviation expansions | H-2 discharged | **+28** | applied | independent |
| **V4(a)** heading names the specification | H-6 answered | **+2** | applied | independent |
| **V4(b)** objectives stated in `sec:intro-aims` | H-6 answered and the Appendix D deferral closed | **+33** | applied | independent; **also discharges one H-A2 member**, so it is not additive with any further objectives promotion |
| **V3** five questions quoted verbatim, ordinals kept | H-5 discharged | **+41** | applied | **exclusive with the next row** |
| **V3-alt** same, ordinals dropped | H-5 discharged more cheaply, loses the tie to `tab:answers` | **+26** | drafted | **exclusive with the row above**; taking it saves 15 |
| **V3-restore** four spans from `1dfb029` | restores the independent calibration leg, the relocation statement, the RQ5 conclusion and one level | **+27** | drafted | independent of which V3 form is taken |
| **V6** nineteen sentence splits | H-8 worked on the twenty | **-4** | applied | independent |
| **V1-1a** abstract, triple kept | H-1 discharged, guard kept | **+1** | drafted | **exclusive with V1-1b** |
| **V1-1b** abstract, triple removed | H-1 discharged, shape removed | **0** | drafted | **exclusive with V1-1a** |
| **P1-min** static-regime outcome in the body | H-A2 must-promote, outcome only | **+15** | drafted | **exclusive with P1-full** |
| **P1-full** static-regime, both failures named | H-A2 must-promote, complete | **+28** | drafted | **exclusive with P1-min** |
| **P2-min** conformal ceiling in Further Work | H-A2 must-promote, ceiling only | **+20** | drafted | **exclusive with P2-full**; lands in the sentence V6 #19 split, taking it 33w → 53w |
| **P2-full** ceiling plus the Winkler bound | H-A2 must-promote, complete | **+33** | drafted | **exclusive with P2-min**; takes that sentence 33w → **66w**, four words longer than before V6 touched it, so it needs its own split |
| **P3** what the knowledge-gap signal does | H-A2 should-promote | **+23** | drafted | independent |
| **P4** name the three catalogued divergences | H-A2 should-promote | **+10** | drafted | independent |
| | **applied on the branch** | **+100** | | body **19,985 → 20,085** |
| | **cheapest complete set still to place** (V3-alt swap -15, V1-1b 0, P1-min +15, P2-min +20, P3 +23, P4 +10) | **+53** | | body would reach **20,138** |
| | **fullest set** (V3 kept, V3-restore +27, V1-1a +1, P1-full +28, P2-full +33, P3 +23, P4 +10) | **+122** | | body would reach **20,207** |
