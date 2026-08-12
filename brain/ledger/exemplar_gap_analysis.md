# Exemplar gap analysis — PRJ93 against the Board-recommended sample dissertation

Recorded 2026-08-12. Source comparison: `brain/docs/Sample Dissertation.md` (Parsons,
*NLP for Business Insight*, Peak BI, 25,440 words) against the `prj93-overleaf`
manuscript at body 19,986 words, read alongside
`brain/docs/Student Documentation - MSc DS - Dissertation Submission.md` (DS591
guidelines and Appendix B marking guide) and
`brain/docs/DataSciDissWriting June2026final.md` (FST writing workshop).

Published form: <https://claude.ai/code/artifact/586acdd5-7f69-40f0-aab3-72d6c104e1e8>

## 0. Measured state at the time of comparison

| Quantity | Sample | PRJ93 |
| --- | --- | --- |
| Body words | ~19,000 (25,440 incl. front matter, refs, appendix) | 19,986 against a 20,000 cap |
| Unique citations | ~37 | 87 |
| Body figures | 9 | 8 |
| Body tables | 7 | 11 |
| Chapters | 5 (two of them aim-chapters carrying their own Background/Method/Results/Discussion) | 6 (classic IMRAD-plus-LR) |
| Present:past verbs in Results | past-dominant | 214 : 21 present-dominant |

## 1. The diagnosis in one line

**The sample is a solution narrative. PRJ93 is an epistemology narrative.**

The sample says: here was a broken thing at a real company, here is what I built, here
is exactly how much better it got (precision +10.5 per cent, recall held above 99;
framework +5.38 precision and +13.93 recall over the incumbent). PRJ93 says: here is
what three venues' data can and cannot establish, and the answer is mostly *cannot*.

PRJ93 is the harder project and is measurably more sophisticated on every methodological
axis. It is also fighting the grain of a marking scheme written around the data science
pipeline, whose 60–69 band asks for exploratory data analysis leading to model
formulation, and whose Distinction band asks that "the research question should be
answered logically and completely". A document whose headline is a series of
non-separations, whose fifth contribution "has not been run", and whose conclusion opens
by announcing an unmeasured deliverable, makes the marker hunt for the achievement.

No finding below asks for an overclaim. Each is either a reframing of work already done
or a bounded piece of new work.

## 2. Nine drawbacks, ranked by mark impact

### D1 — There is no success criterion, so nothing can be judged as achieved (HIGH)

The sample's decisive structural move is its §2.4, "Defining accuracy": *Peak have
defined a sufficient performance to be 90% precision*. A threshold agreed with the
stakeholder before any work begins, against which every later number is judgeable.

PRJ93's equivalent quantity is the miss-to-false-alarm cost ratio, and
`discussion.tex` §5.4 states it "was never elicited". That single absence cascades:
β unfixable → F_β uncomputable → cost sweep degenerate ("selects no operating point")
→ RQ5 unanswerable. One of five research questions ends in a non-answer for a reason
that costs an hour of an operator's time to remove.

**Fix.** Elicit two numbers: how many unnecessary alerts per week would make the
operator switch the system off, and what a missed bad day costs relative to one false
alarm. Record the elicitation as a method in Chapter 3, not as an anecdote.

### D2 — The marker never sees the data, and never sees the system (HIGH)

The sample gives a whole chapter (Ch. 2) to the current model, the data and the accuracy
definition before any new idea appears. The reader can picture SCRAM afterwards.

PRJ93 §3.1 gives the venues one table and ~600 words, then moves to error denominators.
There is **no exploratory data analysis anywhere in the document** — no revenue series,
no weekly profile, no distribution of takings, no picture of the closure calendar that
half the findings turn on. Three series are called "erratic or lumpy" and the reader
never sees one. The system half is equally invisible: the title promises a brain, the
body delivers a calibration audit, and the production artefact is never shown.

**Fix.** New §3.2 with two figures (revenue-versus-time strip with closures shaded;
weekday profile per venue), and one system figure in Chapter 1 showing what an operator
actually receives.

### D3 — Hedging has eaten the findings (HIGH)

Over-correction from a good instinct. Almost every result sentence carries a qualifier
that cancels it inside the same clause.

- Sample: "spaCy was the best performing tool across entity detection and correct phrase
  chunking, the only tool to have precisions and recalls all above 70%."
- PRJ93: "the pair is a marginal detection the set does not sustain"; "it locates the
  departure without narrowing how large it is"; "a claim about this sample and not a
  general finding".

The sample states the finding, then qualifies it in a *separate* sentence. PRJ93
qualifies inside the clause, so the reader never gets a clean proposition to hold.

**Fix.** One rule across Results and Discussion: state the finding in a short sentence
with no subordinate clause; put every qualification in the next sentence. Costs no
words.

### D4 — Four overlapping enumerations that do not map to each other (HIGH)

The sample has two aims, each with four bulleted objectives, each with its own chapter,
each chapter's Discussion closing on "The aim was achieved, along with the objectives".

PRJ93 has one aim, five research questions, five contributions, three student
deliverables and a project specification with its own terms — and `introduction.tex`
§1.4 concedes the mismatch in writing.

**Fix.** One summary table (RQ · answer in one clause · evidence · strength) closing
Chapter 1 or opening Chapter 6. ~120 words.

### D5 — Sentences carry two or three ideas each (MEDIUM)

The cap was met by compression rather than by cutting. Representative, from
`conclusion.tex`: "The ladder is re-adjudicated by a model confidence set over hundreds
of rolling origins per venue, against a deployment gate taken at six origins with no
significance test computable at that fold count" — four propositions in 34 words with a
nominalised subject. The sample averages ~18 words and one idea.

**Fix.** Relocate rather than compress. The appendices sit outside the counted body
(`\bodywordcount` spans the abstract and Chapters 1–6 only), so the pairing-factor and
numerics-regime arguments move from §5.3 into Appendix B at zero cost to the count.
Spend the freed words splitting compound sentences, not on new content.

### D6 — No error analysis on individual cases (MEDIUM)

The sample's most persuasive evidence of understanding is case work: why `3M` was missed
by all five NER tools; why `Zacks Investment` was tagged PERSON; why one article with 39
irrelevant mentions wrecked precision. PRJ93 stays at aggregate-statistic altitude
almost throughout. The one exception — Ellel's 1,037 calendar-open days on which nothing
was taken — is the strongest passage in the Results chapter.

**Fix.** One worked deviation (real day, forecast, band, standardised residual, CUSUM
trace, what was happening at the venue) plus two spike failure cases, the weakest cell
at VUS-PR 0.70–0.91.

### D7 — The document opens on what it did not do (MEDIUM)

Three load-bearing sentences lead with an absence: the abstract's final clause, the
conclusion's first line, and the fifth contribution in §1.4. The disclosure is correct
and required — the guidance is explicit that specification divergence is not a
disadvantage where an account is given — but an account belongs in the Discussion, which
is where the guidance puts it.

**Fix.** Reordering only. Close the abstract on the positive finding it already
contains; open Chapter 6 on the achievement and let §6.1.2 carry the unrun deliverable
in its proper place. The disclosure stays at all five sites.

### D8 — Figures are cited as evidence, not walked through (MEDIUM)

The FST workshop contrasts two dissertations on exactly this axis. PRJ93's captions are
better than the sample's; the body text mostly points at figures rather than reading
them.

**Fix.** Two sentences per results figure saying what to look at and what it means —
the shape, not the provenance.

### D9 — Present tense throughout, against an explicit instruction (MEDIUM)

Submission guidance, Format and Presentation: "Make sure that you use past tense, as
your report is an account of work that has been performed." Results runs 214 present
against 21 past.

**Fix.** Convert procedural sentences only — what was done, what was found. Keep present
for standing properties (definitions, what a theorem states, what a table shows). That
is the convention the sample follows.

## 3. Where PRJ93 already exceeds the exemplar

Recorded so that revision does not erode these.

| Dimension | Sample | PRJ93 |
| --- | --- | --- |
| Literature criticality | Sources summarised, lightly evaluated | Every source carries an argued qualification; limits derived rather than inherited |
| Methodology | MNB, k-means, hierarchical clustering, pretrained NER | Model confidence sets, split conformal with Mondrian partitions, HLN correction, moving-block bootstrap, VUS-PR, one added instrument (rank uniformity) |
| Statistical discipline | Point comparisons, no significance testing | Paired bootstrap intervals throughout, multiple-comparison control, pre-registered adoption rules, fail-closed defaults |
| Threats to validity | Two paragraphs | Full section: four problem-properties, three circumstance-properties, four disclosed biases, five assumptions with consequences |
| Reproducibility | Not addressed | Pinned store ceiling, stamped artefacts, seeds, library versions, numerics-regime sensitivity measured |
| Captions | One-line titles | Title-plus-body carrying the configuration behind each figure |

On the two criteria separating 70–79 from 60–69 — "a substantial body of methodology
beyond that of the MSc modules" and "discussion of why the approach taken is better than
alternatives" — PRJ93 is comfortably clear of the exemplar. The risk is not the ceiling.
It is that the strengths are hard to see through the prose, and that the document's own
framing keeps pointing at what is missing.

## 4. Revision plan

Ordered by marks per hour. The word column shows where each addition is funded from.

| # | Action | Effort | Words |
| --- | --- | --- | --- |
| 1 | Elicit the cost ratio; recompute F_β and the cost sweep at that β; rewrite the RQ5 answer | 1 day | +150 |
| 2 | Add the RQ → answer → evidence → strength summary table | 2 h | +120 |
| 3 | Apply the finding-then-qualifier rule across Results and Discussion | 1 day | 0 |
| 4 | New §3.2: estate EDA, two figures | 1 day | +700 |
| 5 | Move the pairing-factor and numerics arguments from §5.3 into Appendix B | 3 h | −550 |
| 6 | Worked deviation example + two spike failure cases, one figure | 1 day | +400 |
| 7 | System figure in Chapter 1 | 3 h | +150 |
| 8 | Reorder the abstract close and the Chapter 6 opening | 2 h | 0 |
| 9 | Two interpretive sentences per results figure | 3 h | +250 |
| 10 | Past-tense pass over procedural sentences only | 4 h | 0 |
| 11 | Trim §2.1–2.2 and the §3.2 ruler discussion to fund the balance | 3 h | −1,200 |

Net roughly −80 words, so the declaration stays under cap without another reallocation
argument. Items 1–4 carry most of the movement.

## 4a. Applied 2026-08-12 — what was done and what it cost

All nine drawbacks were addressed except D1, which is blocked on the operator.

| ID | Applied | Where |
| --- | --- | --- |
| D1 | **BLOCKED** — requires the operator. Nothing in the manuscript can settle it. | — |
| D2 | New §3.2 "The three series before any model" + `fig:estate` (new generator `figures/fig_estate.py`) | `methodology.tex` |
| D3 | Finding-then-qualifier applied to the weather findings, MCS reading, pooling null, cost sweep, §5.3 | `results.tex`, `discussion.tex` |
| D4 | `tab:answers` — five RQs, answers, evidence, strength | `discussion.tex` §5.1 |
| D5 | Pairing-factor sweep and Monte-Carlo arithmetic → `app:mcs-numerics` | `discussion.tex` → `robustness.tex` |
| D7 | Abstract closes on the positive claim; Ch. 6 opens on the achievement | `abstract.tex`, `conclusion.tex` |
| D8 | Reading sentences for all five results figures | `results.tex` |
| D9 | Procedural sentences converted to past tense (partial — see below) | `results.tex` |
| D11 | ~1,100 words trimmed or relocated across all six chapters | all |

**Final state.** Declared body 19,974 against the 20,000 cap (was 19,986). Compiles
clean at 108 pages, zero undefined references or citations, `venueordercheck` PASS,
`figurecheck` PASS. 12 figures, 21 tables.

### Defects found while applying the fixes

Four, each found by measuring rather than by reading, and each recorded here because
three are of classes this ledger already tracks.

1. **The abstract stood 3 words over the regulation cap.** `wordcount.py` returned 303
   against a comment claiming "re-measured at 300/300" on 2026-08-09. No instrument in
   this project reads the abstract against its own limit. Now 299.
2. **`sec:res-occurrence` called the Beer Hall's closed weekdays "a fixed set".** The new
   exploratory measurement refutes it on the document's own data: Monday trades on 26 per
   cent of occasions and Tuesday on 9, so two of seven weekdays carry a first factor
   strictly inside (0,1). Clause corrected to a five-of-seven property. **OPEN FOR A
   RULING:** whether those two probabilistic weekdays make the Beer Hall gate a weak but
   genuine test rather than a tautology. Settling it needs the first factor as fitted on
   the training slice, not the trading rate over the frame.
3. **`fig:sensitivity` was described by what it was meant to show.** The text read "catch
   rate rising with injected magnitude for each kind"; the rendered figure has three of
   its four kinds flat at a catch rate of one across every magnitude bin, and only the
   spike curve has a gradient. Corrected.
4. **`sec:disc-divergences` promised "four further divergences" and listed five.**
   Enumerated against the paragraph before changing the opener; all five are present, so
   this was a count error and not a missing item. Now "five".

### What the EDA figure now grounds that was previously asserted

The section was added for a marking criterion and turned out to carry evidential weight:
the right-skew (skewness 2.12 / 1.36 / 4.05, mean above median at all three venues) is
the stated reason a day-of-week median is low by construction, which is the *direction*
`sec:res-reconciliation` finds at 19 of its 22 rejecting nodes; the closure calendar
(Ellel's best weekday at 54 per cent against the Beer Hall's five days above 98) is the
evidence for the contractual-versus-event-led distinction the hurdle turns on; and the
generator asserts its reconstructed frame lengths against `tab:venues`, so 399/386/331 is
now a check that passes rather than a number copied across.

### Not finished

- **D1** is blocked, and it is the highest-value item in the plan.
- **D6** (worked deviation example, spike failure cases) was not done: it needs a chosen
  day, a re-derived band and CUSUM trace, and a judgement about which real event to show.
- **D9** is partial. Procedural sentences were converted where the change was
  unambiguous; a full pass over both chapters remains.

## 5. The thing to keep in view

The exemplar's Chapter 4 reports a hypothesis that was **disproved** — distributional
clustering did not separate contexts, the frameworks performed worse than random, and
the author says so. It still scored highly, because the chapter ends by stating what the
failure established and what it would take to do better. Negative results are not the
problem.

What that chapter never does is leave the reader unsure whether anything was achieved.
PRJ93 currently does, on the strength of work more sophisticated than the exemplar's.
The gap is one of presentation and framing, not of substance.
