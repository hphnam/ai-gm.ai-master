# Introduction (Chapter 1) and abstract — critique log, 8C-6, 2026-08-09

Governing file: `brain/skills/autoresearchclaw/SKILL.md`. §2 for the process, **§3 for the
three standing roles**, **§4 for the T1–T14 gate**. Written as a path and a section number
rather than as a name, per `PRJ93_RULES.md`: a name degrades where a path does not, and
*"the three standing roles"* once decayed into referring to nothing but itself across four
files.

**Every round below carries its role's remit QUOTED from the owning file, beside the
heading.** A heading naming a role with no quoted remit is not a record of that role. This
is the structural half of the remedy: a wrong quote is visible on the page, a wrong name is
not.

**Five roles, five independent calls, one per role.** SKILL.md §2 requires it in terms:

> Issue **one separate call per role.** Do not ask one call to produce three reviewer
> voices. Three personas sharing a single context share every blind spot and cannot
> disagree in any load-bearing way — this is the single largest defect in the system this
> manual is distilled from, and the reason the loop is structured this way.

Each call received the draft, the artefacts it cites, and **nothing from the other roles**.
Three are SKILL.md §3's standing roles; two are phase-specific and were specified inline in
the prompt, which is the form the control case of 2026-08-08 showed to be reliable.

---

## Measurement provenance, established before the critique ran

Re-derived with `brain/scripts/wordcount.py` on the working clone at `49b8f01`, rather than
quoted forward from `BLOCKED_third_party.md` §F. Two of §F's six floors were wrong.

| Chapter | §F recorded | Re-measured 2026-08-09 | Δ |
|---|---|---|---|
| 1 Introduction | — (unwritten) | **1,740** | new |
| 2 Background | 4,938 | **4,938** | 0 |
| 3 Methods | 5,526 | **5,569** | **+43** |
| 4 Results | 7,712 | **7,701** | **−11** |
| 5 Discussion | 4,870 | **4,870** | 0 |
| 6 Conclusions | 2,328 | **2,328** | 0 |
| Abstract | 299 | **300** | +1 (this session) |

**Chapter 3's floor has been stale since `12f8cc7` and the cause is locatable.** Measured
across the intervening commits, `chapters/methodology.tex` reads 5,526 at `fe7bd9a` and
**5,569 at `12f8cc7`**, the *"active/traded terminology sweep"* commit, and has not moved
since. The sweep rewrote `active` to *calendar-open* or *trading-day* in Chapter 3 as well
as Chapter 4, and replacing a word with a phrase costs words. Three subsequent §F rows each
re-ran the instrument on Chapters 2, 4 and 5 and **copied Chapter 3's 5,526 forward without
re-running it**, which is the pointer-not-copy rule failing inside the row whose own
instrument line names `wordcount.py`.

**Chapter 4's 7,712 is a transcription error, not staleness.** `chapters/results.tex`
measures **7,701** at `29016e7` (the S-4 commit the figure was taken from) and at `49b8f01`.
Nothing changed between them. The recorded figure was never 7,701 at any commit in the range.

**Consequence.** §F's *"Five chapters measured … = 25,374"* is understated by 32; the true
five-chapter figure is **25,406**. The six-chapter total is reported in the session summary
on the re-derived numbers, not on §F's.

---

## Round A — Methodologist

**Remit, quoted from `brain/skills/autoresearchclaw/SKILL.md` §3:**

> ### Role A — Methodologist
> Audits whether the work supports the claim, independent of how it is written.
> - Internal validity: does the design isolate what it claims to isolate?
> - External validity: what population, period or venue does the result generalise to, and does the text overreach that?
> - Baseline fairness: is the comparison a real contest, or a strawman? Was the baseline tuned with comparable effort?
> - Ablation completeness: is each component's contribution separable, or are several things changed at once?
> - Reproducibility: could a reader reimplement this from the text alone? Hyperparameters, seeds, data splits, compute, preprocessing.
> - Protocol leakage: is any tuning or selection decision made on the test set?

**Returned: 6 blocking, 12 advisory.** Every number terminated at an artefact.

| # | Grade | Finding |
|---|---|---|
| A1 | blocking | **The limb-to-question mapping asserted in 1.2 does not exist.** Chapter 2's five reachable limbs map onto the five questions as five-to-four with an orphan: limbs 1 and 2 are both RQ3, and RQ2 answers to no limb in Chapter 2's list. Chapter 2 never asserts the identity; **Chapter 1 added it**, and it is load-bearing because RQ2 carries the chapter's only negative precondition result |
| **A2** | **blocking** | **"reproducing the measured coverage from it" names an identity, not a reproduction.** From `exchangeability_diagnostic.json` `rank_uniformity.traded_only`, `1 - frac_above_nominal_quantile` = **0.891780 / 0.691670 / 0.963455** against R30's measured **0.8918 / 0.6917 / 0.9635**. The implied and measured columns count **the same indicator vector twice**. There is nothing to reproduce. This is a softened descendant of the "to a thousandth" defect, not a repair of it |
| A3 | blocking | The cost sweep's limitation is **misattributed to the ratio grid**. The 1:1 rung weights the two failures equally and is on the line, not the far side; and the report's own sweep header reads *"fixed-threshold detector -> the operating point is fixed; what moves is which failure dominates"*. As written the limitation read as repairable by re-running with ratios below 1:1. It is a property of the detector |
| A4 | blocking | `abstract`: the "so" does not follow. Set cardinality is evidence about **separability**, not about the served model's standing; and at Ellel and Two River Taps **the served model IS the simple incumbent** (`robust_dow`, `ets`), so "indistinguishable from simpler incumbents" is vacuous at two venues of three. At Two River Taps it is also outside the set at α = 0.25 and sits 3.27 paired standard errors behind the argument-minimum |
| A5 | blocking | `abstract`: "the other two sitting at nominal or above" is false, **and the declared word-budget defence is beatable**. Costed: the replacement is at worst free once a rankable sentence and a positional triple are spent |
| **A6** | **blocking** | **"operating estate" over-states the population, and the omission is introduced here.** `methodology.tex:41-44` records **Two River Taps ceased trading 2026-05-08**, two months before the data ceiling, and designates it a frozen control series. Chapter 1 called the estate "operating" three times. Load-bearing for external validity, not decoration: that venue carries the largest over-coverage and one of the two measured pooling losses |
| A7 | advisory | "with one pairwise exception" drops the **no-weather** restriction whose loss on 2026-08-08 is a logged incident. Five contrasts exclude zero estate-wide |
| A8 | advisory | "the two data-rich venues" is ambiguous (Ellel's frame is longer than Two River Taps'), and C2 omits that Ellel is where `group_icl.py`'s docstring **pre-registered** pooling as most likely to help |
| A9 | advisory | Asymmetric disclosure of protocol commitment: `mcs_L1_results.json` carries `headline_designation_changed_post_hoc: true` and C4 advertises a pre-committed measure while C1 says nothing |
| A10 | advisory | "the selection reverses with the number of evaluation origins" **holds at one venue**. `log/43` isolates fold count from store ceiling: Beer Hall is a genuine fold-count reversal, Ellel's change is the **store ceiling**, Two River Taps is confirmed at every fold count |
| A11 | advisory | "staying inside one confidence set" is level- and block-length-dependent (p = 0.178 at the Beer Hall: inside at α = 0.10, outside at 0.25; and the `block_len` 2 set excludes it entirely) |
| A12 | advisory | 22 of 41 is uncorrected; ~2 rejections expected by chance |
| A13 | advisory | The 75 has no denominator; its population is 588 surfaced attributable items |
| A14 | advisory | "frames no longer than thirteen months" is a bound the largest value (399 days) crosses |
| A15 | advisory | The cold-start case motivates 1.1 and is never evaluated: the shortest frame is 331 days |
| A16 | advisory | The RQ4 amendment is **right, on the wrong ground**. Two venues over-cover only on the **marginal** limb, and Ellel's marginal z is +1.82, not significant. On the **traded** limb the chapter uses, only Two River Taps over-covers. "Departure" is correct on either limb; the recorded ground was drawn from the limb the chapter does not use |
| A17 | advisory | Four claims offered against 1.1's "three requirements", and `abstract.tex:32` records this exact defect class as fixed on 2026-08-08 |
| A18 | advisory | `interval_calibration_L1.json` carries top-level `"device": "cpu"` and `provenance.device: "mps"` in the same file, and the generator makes the run a function of the device. **Artefact-level, for whoever owns Chapter 3's reproducibility statement** |

**Verified clean:** frames and trading rates cross-checked arithmetically against origin counts;
the weather arm labelling; Ellel's invisibility in the marginals (traded 0.6917 against marginal
0.9126, z = +1.82); pooling directions; the ten-fielded/nine-scored survivorship, sourced to a
**pre-registered** abort; the gap proposition verbatim; RQ order matching the five Results
sections one-to-one and in order.

---

## Round B — Statistician

**Remit, quoted from `brain/skills/autoresearchclaw/SKILL.md` §3:**

> ### Role B — Statistician
> Audits whether the numbers mean what the sentences say.
> - Are 95% confidence intervals or error bars reported on every result table?
> - Is n > 1? How many seeds, folds or splits, and is the count stated?
> - Are significance tests appropriate to the design — paired where the data are paired, corrected where comparisons are multiple?
> - Is an effect size reported, not just a p-value? Is a significant-but-tiny effect being sold as important?
> - Survivorship: if any run failed or diverged, are both conditional (successful runs only) and unconditional (failures as worst case) metrics reported? Without both, every comparative claim is biased.
> - Is variance across conditions non-zero? Identical metrics across conditions means the manipulation did not take, not that it had no effect.
> - Are denominators, baselines and scaling stated for every ratio metric?

**Returned: 22 numbers verified MATCHES, 3 blocking, 12 advisory.** Every number was terminated
on a `brain/eval/*.json`, `brain/log/*.md` or `brain/ledger/*.md` artefact. No `.tex` file was
used as a terminal node, which is the rule this role broke last session.

| # | Grade | Finding |
|---|---|---|
| B1 | blocking | `0.692` is over-precise. n = 240 traded days carries a binomial 95 per cent interval of **[0.633, 0.750]**; the text prints to +/-0.0005 a figure whose sampling interval is +/-0.06. Same defect class as "to a thousandth", in different dress |
| B2 | blocking | `abstract`: "the other two sitting at nominal or above" is false of the Beer Hall at **0.8918**, below nominal 0.90 |
| B3 | blocking | `abstract`: set sizes carry **no confidence level**. `mcs_L1_results.json` reports both pre-registered alphas; at 0.25 the sizes are **3/4/3** and `log/71` §7 records that **Two River Taps does not survive it**, which reverses the sentence's own conclusion |
| B4 | advisory | "every arm retained at every venue" holds at `set_90` only; at `set_75` Ellel retains 3 and Two River Taps 4 |
| B5 | advisory | "each sits on the opposite side of the asymmetry" is false for the **1:1** rung, which weights the two failures equally and sits on the line. R4 puts the crossing near 0.6:1, outside the sweep |
| B6 | advisory | The abstract asserts evaluation "under asymmetric cost" but every swept ratio is >= 1:1, the opposite asymmetry to the one RQ5 poses. The chapter discloses this; the abstract does not |
| B7 | advisory | The z values in `recompute_set.md` R30 are **Wald** statistics using the observed proportion. Under the null variance they are **-0.96 / -10.76 / +6.36**, not -0.93 / -6.99 / +10.16. Every sign and verdict survives; Ellel's departure is understated by 35 per cent. **Inherited from R30**, not repairable here |
| B8 | advisory | "1.2 to 5.9 days a week" rounds the maximum **down**: the busiest venue trades 5.92. Ruled acceptable for prose at `numbers_audit.md` item 16, but it is a stated **range**, the one place rounding toward the middle makes the interval wrong |
| B9 | advisory | The 75 has no denominator where the 124 has one. Its population is 588 surfaced attributable items |
| B10 | advisory | C3's "reproducing the measured coverage" and the following sentence's "locates the departure without narrowing how large it is" are two strengths for one object in adjacent sentences. **The repair belongs at 06 §6's fixed string** |
| B11 | advisory, upstream | `06_research_questions.md` §6's **C4 strength cell is stale**: it still reads *"8 false alarms against 124 misses"*, the pair R4 withdrew |
| B12 | advisory, INHERITED | "the served forecaster returns a median" over-generalises. `log/62` establishes the median bias for the Beer Hall hierarchy's **base** forecaster; of the three served models only Ellel's is a day-of-week median. Live at `discussion.tex:62`, `discussion.tex:352`, `conclusion.tex:116` |
| B13 | advisory, INHERITED | 22 of 41 is **uncorrected**; `log/62` says so in terms and B16 rules the disclosure required. Chapter 4 carries it |
| B14 | advisory | "frames no longer than thirteen months": 399 days is **13.11** months. A bound the largest value crosses is false rather than rounded |
| B15 | advisory | The 69 per cent rests on **240** of that venue's 1,659 banded pairs, invisible in the abstract. Chapter 4's `tab:coverage-traded` carries the limb sizes |

**Role B remit items with nothing to report:** n > 1 and stated throughout (273/260/205 origins,
644 injections, 56 residuals per node, 1229/240/903 traded pairs, B = 10,000 at block length 7,
seeds 93/94); pairing correct to the design (moving-block paired bootstraps on common origins);
**survivorship handled unusually well** (the tenth entrant is disclosed and sourced to a
*pre-registered* abort condition at `log/68`, not a post-hoc exclusion); non-zero variance across
conditions; effect sizes everywhere, no p-value without a magnitude.

---

## Round C — Claim auditor

**Remit, quoted from `brain/skills/autoresearchclaw/SKILL.md` §3:**

> ### Role C — Claim auditor
> Audits the join between text and evidence, sentence by sentence.
> - For every claim in a title, abstract or conclusion: name the specific metric, table or figure that supports it. Unnamed → blocking.
> - Does any number in the prose fail to appear in a result file? → blocking.
> - Topic drift: does a section argue something the chapter is not about?
> - Does the strength of the verb match the strength of the evidence? "demonstrates" vs "suggests" vs "is consistent with".
> - Are limitations stated once, in the limitations section, rather than hedged throughout? Scattered hedging reads as evasion and costs marks.
> - Citation placement: do Method, Results and Discussion cite anything, or do all citations sit in the introduction and related work?

**Returned: 4 blocking, 7 advisory. The enumeration was the primary task and it found the
chapter's worst defect.**

**The enumeration, run as greps per item rather than by reading:** `weather` 8, `pool` 5,
`covariate` 2, `reconcil` 2, `hierarch` 2, `coherent` 1, `estimand` 1, `median` 1, `unbiased` 2,
`frozen` 5, `operator` 9, `intermitt` 2, `conformal` 6, `asymmetr` 6, `calibrat` 7. **No item
zero.** All five RQs present and verbatim; all five contributions present and verbatim; **RQ2's
reconciliation-and-estimand limb IS carried inside C1**, which is the Chapter 6 omission that had
no symptom; C5's canonical phrase is in 1.4 itself, not deferred; 06 §4's narrowing sentence
present.

**The absence was at the GAP, not at the questions.**

| # | Grade | Finding |
|---|---|---|
| C1 | blocking | Budget breach, and it sits on the null-bearing sentences: the entire 1.4 surplus is C1's 22-of-41 limb, C2's pooling loss and C4's no-operating-point finding. Test for relocation before costing a cut |
| **C2** | **blocking** | **Gap limb 5 has no antecedent anywhere in Chapter 1, yet two questions and one contribution rest on it.** 1.2 named four prior-work strands; a grep for `intermitt\|origin\|rank\|degener\|estimand\|reconcil\|median\|hierarch` over 1.2's body returned **zero**. The missing strand is §2.10 limb 5, which Chapter 2 states in its own list at `literature_review.tex:474`. 1.2 then asserted *"Five of them"* while enumerating four. **This is the deletion-of-a-null shape: the omitted limb is the one carrying the failed precondition** |
| C3 | blocking | RQ4's string was amended here; `06` §2 (:83), §5 (:188) and §5's rationale note (:195) were not. Two stores now disagree and both read as closed |
| C4 | blocking | "the other two sitting at nominal or above" is false of the Beer Hall; the concession lived in a comment a marker never sees |
| C5 | advisory | C3's verb outruns the qualification in its own sentence. **Inherited** from 06 §6's fixed string |
| C6 | advisory | "one pairwise exception" is unscoped: five contrasts exclude zero estate-wide, only the Beer Hall's involves the no-weather arm |
| C7 | advisory | C2's pooling limb omitted the **set-level** result, which is the stronger and more negative one: `two_river_taps set_90 = ['U']` alone, both grouped arms eliminated. Asymmetric compression of a null, weather reported set-level-first and pooling paired-only |
| C8 | advisory | "staying inside one confidence set" is block-length dependent: at `block_len` 2 the Beer Hall set drops to 3 and excludes `rung1_robust_dow`. Also §2.7b W2 binds 8C to a clause where set membership is stated as a finding |
| C9 | advisory | "one recently opened offers none" matches no venue in the estate and can be read as answering the three-versus-four-venue question 06 §9 records as open |
| C10 | advisory | "frames no longer than thirteen months" exceeded. **Inherited**, identical phrase at `conclusion.tex:88` |
| C11 | advisory | "the two data-rich venues" is unnamed and undefined within Chapter 1; Ellel's frame is longer than Two River Taps', so "data-rich" cannot mean frame length |

**Verified clean:** every number terminated at an artefact; the gap proposition verbatim against
`literature_review.tex:466`; all 9 citation keys resolve; all 13 `\ref` targets resolve to exactly
one `\label`; headings pass N1–N8; hedging not scattered; "to a thousandth" **not propagated**
(three hits, all in comments, each explicitly refuting it).

---

## Round D — knowledge-telling against critical writing

Phase-specific role, specified inline in the session prompt. **Remit, quoted from the
`ds-writing` skill §1, which is the owning file:**

> Knowledge telling states what is known. Knowledge transforming tells the reader why and
> how the stated material bears on the research question.
> ### Diagnostic: descriptive moves versus critical moves
> Descriptive moves state what happened, what something is like, the order events occurred,
> how something works, what method was used, what the options were, and what the components
> are. Critical moves identify significance, judge strengths and weaknesses, weigh one piece
> of evidence against another, argue a case from evidence, show why something is relevant or
> suitable, indicate why an approach will work best, explain why timing or ordering matters,
> give reasons for selecting each option, rank details by importance, show the relevance of
> links between findings, and draw conclusions.
> A section that is more than roughly half descriptive is not yet at Masters level.

**Returned: descriptive/critical ratios per section, 8 blocking, 12 advisory.**

| Section | Critical / total | Verdict |
|---|---|---|
| 1.1 | 8 / 12 (67 %) | passes; no orphan descriptive sentence |
| 1.2 | 14 / 15 (93 %) | strongest in the chapter; every prior-work sentence carries its own limitation clause |
| 1.3 | 3 / 7 prose sentences (43 %) | **the only section below the line**, and aims sections are constitutively descriptive; the fault named is specific, not the fraction |
| 1.4 | 10 / 14 (71 %) | strong; carries the best sentence in the chapter |
| 1.5 | 1 / 7 (14 %) | **not scored against the line** — signposting is descriptive by construction and R56 requires it |
| Abstract | 9 / 13 (69 %) | **verdict on ds-writing's "most common error": this is an abstract, not an introduction**, and it clears the test decisively |

| # | Grade | Finding |
|---|---|---|
| D1 | blocking | 1.1: *"A simple method is competitive here"* outruns its evidence. `chae_value_2024` reports deep models beating **their own richer variants**, which is parsimony of **features**, not simplicity of **method**. Half the cited evidence did not carry the claim it was cited for |
| **D2** | **blocking** | 1.3: **no reason is given for the five questions or for their order.** ds-writing lists "give reasons for selecting each option", "explain why timing or ordering matters" and "rank details by importance" as critical moves. The order is **not** arbitrary: it is a dependency chain. One sentence converts the section from knowledge telling to knowledge transforming, and it is the single highest-value addition available |
| D3 | blocking | 1.2: the gap is stated **twice in adjacent sentences**, ~90 words apart, overlapping on three of four limbs. ds-writing §7's "jumping back to material already covered" |
| D4 | blocking | 1.2: *"limbs"* arrives with no antecedent and an unrecoverable count. Three requirements (1.1) -> four proposition attributes -> six limbs, unreconciled inside one section |
| D5 | blocking | 1.2: *"requires that operator's judgements"* repeats a phrase within one sentence, ds-writing §7's named defect verbatim |
| D6 | blocking | 1.4: **the chapter contradicts its own provenance note.** The header says "to a thousandth" was not propagated, but C3's defining sentence read *"reproducing the measured coverage"* unqualified and walked it back only in the sentence after |
| D7 | blocking | 1.4: *"limbs"* now means the two covariate arms, a second technical sense one chapter later, with "arms" used in the sentences either side |
| D8 | blocking | 1.4: **the five contributions do not map onto the five questions and nothing says so.** C1 discharges RQ1 **and** RQ2; C5 answers none. A reader arriving from a numbered list of five reads "The first... The second..." as answering RQ1...RQ5 and is silently wrong twice |
| D9 | blocking (abstract) | The abstract **does not answer its own aim**. It promises to measure what the estate can and cannot establish, then ends on contributions. ds-writing §5 requires "from aims to conclusions" |
| D10 | blocking (abstract) | Stand-alone failure: *"the literature's over-offering"* is never established in the abstract |
| D11 | blocking (abstract) | Ambiguous referent: *"Whether they hold at that scale"* — the nearest scale in the previous sentence is the **large** one |
| D12 | blocking (abstract) | Passive scaffolding, exactly as ds-writing §5 names it: 24 words of subject before "was used to", which defers the claim |
| D13 | advisory | 1.1: "supply" three times; "that statement" chained across three sentences |
| D14 | advisory | 1.1: "one recently opened offers none" is refuted downstream by frames of 399, 386 and 331 days |
| D15 | advisory | 1.2: the `meyer_conceptual_2004` sentence is the one bare descriptive item in a list whose every sibling carries a limitation clause, and it opens on "And" |
| D16 | advisory | 1.3: RQ4's *"the departure"* is singular where 1.4's C3 is correctly plural. **The amendment fixed the direction-presupposition and left the number-presupposition** |
| D17 | advisory | 1.3: near-verbatim jump back to 1.1's closing clause, ~40 lines apart |
| D18 | advisory | 1.4: "rungs" is unglossed at first use; its only context arrives 80 lines later |
| D19 | advisory | 1.4: "thirteen months" is tighter than the data by a few days |
| D20 | advisory | 1.5: a **circular** cross-reference — 1.2 points at 2.x for its derivation and 1.5 points 2.x back at 1.2 |
| D21 | advisory | 1.5: *"in the order above"* reaches back across the whole of 1.4 |
| D22 | advisory (abstract) | *"A fifth, an apparatus for..."* buries "has not been run", the actual news, behind eighteen words of appositive |
| **D23** | **blocking, cross-cutting** | **The abstract's known-loose claim is payable on the page, contrary to the header.** Cutting the self-ranking sentence frees ten words and de-tripling the set sizes frees more. **"The deferral to 8D is not necessary; the accuracy repair should be taken here"** |

---

## Round E — process reported in place of result

Phase-specific role, specified inline in the session prompt. **Remit, quoted as issued:**

> A dissertation section must report *results and claims*, not *the conduct of the work that
> produced them*. You audit for the substitution of process for result. The defect has
> several forms: (1) narrating the work rather than stating the finding; (2) headings whose
> subject is the conduct of the work, against `05_paper_architecture.md` §3.1's N1–N8;
> (3) chronology leaking into prose; (4) method described where a result is owed;
> (5) self-referential scaffolding; (6) provenance surfacing into reader-facing text.
> …Both files carry long LaTeX comment blocks recording provenance. Those are correct and
> required by this project's rules — they are NOT the defect. The defect is process reaching
> text that renders into the PDF.

**Returned: 4 blocking, 9 advisory.**

**Scope of the clean half, stated because a clean result invites over-reading.** The role
verified mechanically that no file path, ledger id, critique-round id, session id, tool name
or `R`-number reaches a **non-comment** line in either file, and that no chronology
vocabulary (`initially`, `at first`, `later`, `subsequently`, `we then`) and no
self-referential scaffolding (`this section will`, `as discussed above`, `it is worth
noting`) appears in rendered text. Defect forms 5 and 6 are clean in both files, and the
headings pass N6 and N7. That says nothing about forms 1 and 4, where all four blocking
findings sit.

| # | Grade | Finding |
|---|---|---|
| E1 | blocking | `abstract.tex` final paragraph: *"Four contributions are stated at the strength their evidence supports."* The grammatical subject is the act of stating. The abstract's final slot owes a conclusion and spends it on the dissertation's own rhetorical practice. Repair must keep C4's qualification and be **word-neutral** at 300/300 |
| E2 | blocking | `introduction.tex` §1.5, Chapter 4 entry: *"reports the measurements, one section per research question in the order above"* conveys only an ordering convention for the chapter whose establishments a marker most wants signposted |
| E3 | blocking | §1.4 C1: *"showing which candidate approaches the available evidence can and cannot separate"* is promissory — it names the question and withholds the answer. It is the only one of the five contributions carrying no number for its headline result, while carrying one (22 of 41) for its subsidiary negative result |
| E4 | blocking | §1.4 C4 opening: three clauses, no finding — an activity, a pre-commitment and an ablation performed. *"committed to before the results were seen"* is the history of the work's conduct at the head of a contribution, and the result is deferred to the next sentence |
| E5 | advisory | Five sentences in §1.2–§1.3 take a **section** as grammatical subject. Individually ordinary cross-references; collectively heavy for 650 words |
| E6 | advisory | *"The narrowing is deliberate"* answers an objection to the author's conduct rather than supplying the narrowing's content |
| E7 | advisory | *"access this project did not obtain"* appears twice, 64 lines apart, narrating what the work failed to secure rather than stating a property of the evidence |
| E8 | advisory | *"one pairwise exception to be read against that verdict rather than past it"* instructs the reader's interpretive procedure on top of a result that already stands |
| E9 | advisory | *"…is what makes the unreachable limb worth naming as unreached"* is meta-commentary on the act of naming |
| E10 | advisory | `abstract.tex`: *"The calibration audit is the strongest result."* ranks the dissertation's own results, four words at 300/300 spent on self-assessment |
| E11 | advisory | §1.5 Chapter 5 entry: four verbs of doing, no answer named. *"where the work diverged from its specification"* is project history; *"departs"* states the same content as a property |
| E12 | advisory | §1.5: *"Figures are used where a relationship is spatial rather than numeric"* states the author's presentational policy to the reader |
| E13 | advisory | Heading observation, **explicitly out of scope for repair**: three of five headings name components of a document rather than subject matter. They pass N6/N7, are conventional, and are fixed by approval A2. Recorded so the set is complete |

**The pattern behind all four blocking findings is one pattern**, and it is concentrated in
the two places a marker looks for claims: §1.4 and the abstract's final paragraph state what
the work did and how carefully it phrased itself, and demote the finding to a subordinate
clause or to the next sentence. §1.5's Chapter 4 entry is the third instance.

---

---

## Synthesis

**Deviation from SKILL.md §2, declared rather than concealed.** §2 specifies *"A fourth call
reconciles the three critiques"*. The synthesis below was performed **in the main session, not as
a separate call**, and the reason is that the load-bearing disagreement could not be settled from
the critiques alone. Roles B and C both graded C3's *"reproducing the measured coverage"* as
**inherited, authorised by 06 §6's fixed string, do not repair here**. Role A graded the same
clause **blocking**, on the ground that it names a validation that does not exist. Nothing in any
of the three reports settles that; only the artefact does. Re-derived in the main session from
`exchangeability_diagnostic.json`: on the traded limb `1 - frac_above_nominal_quantile` =
0.891780 / 0.691670 / 0.963455 against R30's 0.8918 / 0.6917 / 0.9635. **Role A is right and the
other two are wrong**, and the synthesiser call would have had to leave the session to find that
out. The §2 instruction is still the better default; this is the exception, recorded so the
deviation is legible.

**Genuine disagreements preserved, per §2's "do not flatten them":**

| Disagreement | Positions | What settled it |
|---|---|---|
| C3's "reproducing" | B10/C5: inherited, authorised, do not repair. A2: blocking, names a non-existent validation | **The artefact.** Implied and measured are the same vector. 06 §6's **amendment** ("predicts in sign and rough size; decomposes the same indicators") governs over the unamended fixed string, and the clause was dropped |
| The abstract's "at nominal or above" | C4: blocking-but-declared, cannot repair at 300/300. A5 and D23: the budget exists, the deferral fails its own arithmetic | **Costed.** D23 named the two spends. Repaired here; the deferral is withdrawn in the file |
| RQ4's amendment | C3: two stores now disagree, not repairable from here. A16: the amendment is right on the wrong ground | Both accepted. The amendment stands, its **stated ground** is corrected to the traded limb, and 06 §5's two sites are reported as open for 8D |
| 1.4's overrun | C1: relocate to Chapter 6 before costing a cut. §4.5 test | **Relocation tested and refused.** 6.2 already carries the evidence at 962 words; moving it there duplicates rather than relocates. Recorded in `05_paper_architecture.md` §4.5 |

**Discarded, with the reason, per §2's "may discard a critique, but must say it did and why":**

- **B1, 0.692 as over-precise.** Correct on the statistics and **not applied**, because the figure
  is fixed at four other sites (06 §6 C3, `conclusion.tex:152`, `results.tex`, `discussion.tex`)
  and changing it here alone would create the drift the fixed-string convention exists to prevent.
  The **substance** of B1 was applied instead: the n is now stated, so a reader can compute the
  interval. Precision across all sites is recorded for 8D.
- **D16, RQ4's singular "departure" to plural.** Refused because `discussion.tex:86` writes the
  singular, and R8 requires 1.3 and 5.1 to state the same question. Making 1.3 plural alone
  creates drift. Reported for 8D as a both-sites item.
- **E13, the heading observation.** Out of scope by the role's own statement; headings are fixed
  by approval A2.
- **A9 and A18** are Chapters 3–4's and the artefact's respectively, not Chapter 1's.

**Applied: 18 of the 22 blocking findings, and 14 advisories.** The four blocking findings not
applied are the four disagreements resolved above (B1 discarded on drift grounds; the rest
applied in a different form than proposed).

**What the revision cost.** 1,740 -> 2,112 -> 2,023 marker words. The +372 was the critique's
repairs; the -89 was de-duplication inside 1.2 that the critique itself identified (D3's doubled
gap statement, and the limb enumeration that 1.3 restates). **No qualifier and no finding was cut.**

---

## The §4 gate, T1-T14, run as a checklist

Each test is quoted from `brain/skills/autoresearchclaw/SKILL.md` §4, per the rule that a gate
reported as passed quotes the test, the instrument and the scope. *"Any `blocking` failure means
revise. Advisory failures are recorded and may pass with a stated caveat."*

| # | Test, quoted | Instrument and scope | Verdict |
|---|---|---|---|
| T1 | *"Every number in the text traces to a `brain/log/*result*.md` file, with the path in a LaTeX comment beside it"* | Every number in rendered text enumerated by grep: 0.0004, 0.0163, 0.0337, 0.692, 22, 41, 75, 124, 644. Each carries a trace comment naming a result file: `62_R6_wlsv_unbiasedness_result.md`, `77_R1_R2_R4_result.md`, `72_DU6_exchangeability_result.md`, `74_DU6_ellel_drift_result.md`, `60_R1_vus_pr_result.md`. **Verified independently by Roles B and C at the artefacts** | **PASS** |
| T2 | *"Every comparison claim carries a p-value, or an explicit sentence that the difference is not significant"* | 1.4 carries intervals rather than p-values, and every non-separation is stated as one: "cannot separate", "a statement about the evidence available rather than a finding of equivalence", "the set does not sustain it", "spans zero only at Ellel" | **PASS** |
| T3 | *"Every result table reports 95% CIs"* | **Not applicable.** Chapter 1 contains no float. `figurecheck` scanned 19 figure sources; none belongs to Chapter 1 | **N/A** |
| T4 | *"Every title, abstract and conclusion claim names the metric supporting it"* | Abstract audited sentence by sentence by Role C. MASE with interval, coverage against nominal, counts with populations, set sizes with the level now stated | **PASS**, after B3's repair |
| T5 | *"Seed/fold count is stated and n > 1, or the single-run limitation is stated explicitly"* | Role B: 273/260/205 origins, 644 injections, 56 residuals per node, 240 traded days now stated in 1.4, B = 10,000 at block length 7, seeds 93/94 | **PASS** |
| T6 | *"Where any run failed, both conditional and unconditional metrics are reported"* | The tenth entrant returned no measurement. The abstract states "ten forecasting approaches were fielded" and "the nine approaches that scored"; `log/68` records a **pre-registered** abort condition. Both populations visible | **PASS** |
| T7 | *"No placeholder text, no TODO, no [PLACEHOLDER], no --- standing in for a value"* | grep over rendered text: zero `TODO`, zero `---`, zero bracketed placeholders. `completenesscheck` template scan clean on both files | **PASS** |
| T8 | *"Every factual claim about a cited paper was checked against NotebookLM this session"* | **FAIL, advisory, and declared.** Nine keys are cited in 1.1-1.2 and **none was re-checked against NotebookLM this session**. Mitigation, stated as scope and not as a pass: all nine claims are **restatements of Chapter 2's**, whose T8 run is discharged, and the two carrying the most weight were confirmed at source metadata this session (`judd_forecasting_2025`'s abstract states weather is significant for individual categories and not for the total; `chae_value_2024`'s that deep models beat their own richer variants). **A restatement inheriting a discharged check is not the same as a check.** Recorded for 8D | **FAIL (advisory), declared** |
| T9 | *"Every citation key used exists in Zotero"* | All nine confirmed by **title lookup** via `zotero_search_items`, not by `zotero_search_by_citation_key`, whose null is not evidence of absence. `montero-manso_principles_2021` returned null from the key tool and was then found at item `257UK8GY`. Item keys: 257UK8GY, KG8QMUJV, JFA4M2TE, 8VENW5JY, LC8S2GXZ, CZL7FJ7V, WZR9K8QL, 2AYHSR65, XDFF6YG4. Compile reports **0 undefined citations** | **PASS** |
| T10 | *"Method, Results and Discussion each cite at least one source"* | **N/A to Chapter 1.** Within it, 1.1 and 1.2 cite; 1.3-1.5 report this work, which Role C confirms is correct placement for an introduction | **N/A** |
| T11 | *"Bullets appear only in the contributions paragraph and the limitations section; body sections are prose"* | One `enumerate`, in 1.3, carrying the five research questions. 1.4 is prose, not bullets | **PASS** |
| T12 | *"At least two figures, each referenced by `\ref{}` from the text"* | Document-level, not Chapter 1's. The build reports **0 floats lost** and 0 undefined references | **N/A** |
| T13 | *"Limitations stated once, in one section, 200-400 words"* | Role C: hedging is **not** scattered. Limitations appear once each, as the per-contribution strength qualifiers 06 §6 mandates | **PASS** |
| T14 | *"No table a chart would show better"* | Chapter 1 contains no table | **N/A** |

**What this gate did not cover.** T1-T14 are necessary, not sufficient, and §4 says so: *"The
marking rubric itself. Nothing here scores a draft against DS591 bands."* The rubric trace is
separate, below. The gate also says nothing about the four defects the roles found that have no
test: the missing gap limb, the limb-to-question mapping, the "operating estate" over-statement,
and the abstract's four paragraphs against HC4.

---

## Criterion trace

`PRJ93_RULES.md`: *"After drafting, trace back: for each criterion, point at the passage that
meets it. A section that cannot be traced is not finished."* Criteria from
`05_paper_architecture.md` §5's rubric map; wording from `00_marking_criteria.md`.

| Criterion | Wording | Passage that meets it |
|---|---|---|
| **R9** | *"The topic is clearly motivated."* | 1.1 opening: costs are committed before trade is known, and the two ways of being wrong do not cost the same, one of them leaving no trace in the till |
| **R50** | *"The Introduction gives a contextual overview."* | 1.1 paragraphs 2 and 3: the scarcity constraint, the competitiveness of lean specifications, and the layer now being sold on top of a forecast |
| **R51** | *"That contextual overview is supported with references."* | `chae_value_2024`, `hossain_comparative_2025`, `lu_proactive_2024` in 1.1 |
| **R52** | *"The Introduction states why the project is worthwhile / names the current knowledge gap."* | 1.2's proposition, verbatim from `sec:rw-synthesis`, plus the three things no surveyed system supplies together |
| **R53** | *"The Introduction states how the project may be beneficial to others."* | 1.2 closing: an operator is currently asked to take transfer to a business of this size on trust, and settling the reachable limbs removes the need for it |
| **R62** | *"The chapter elicits the gap that the method fills."* | 1.2 paragraph 1's five prior-work strands, each with its own limitation clause; the fifth (limb 5) was added by Round C |
| **R63** | *"The gap elicited is the same gap the method actually fills."* | 1.2's limb paragraph, which separates the five reachable limbs from the one that is not, and 1.4's C5, which claims only a frozen apparatus on that limb |
| **R7** | *"A research question (or questions) is explicitly stated in the Introduction."* **Threshold item; T2 makes an unanswered research question a Fail trigger.** | 1.3's `enumerate`, five questions, interrogative, verbatim from 06 §5 with the RQ4 amendment recorded |
| **R54** | *"The Introduction clearly states the aims of the project."* | 1.3 paragraph 1, verbatim from 06 §1 |
| **R55** | *"Those aims are informed by the project proposal."* | 1.3 paragraph 2: the specification's own research question, quoted in substance, with the narrowing declared and cross-referenced to 5.5 |
| **R24 / R25** | *"Some use of techniques / understanding of issues beyond those covered in the MSc modules studied."* | 1.4: model confidence sets, Mondrian split-conformal calibration, rank-uniformity decomposition of an exchangeability violation, VUS-PR under asymmetric cost |
| **D3** | *"a substantial body of methodology beyond the MSc modules studied is used"* | Same passage; five distinct methodological apparatus named in 1.4 |
| **D8** | *"The document demonstrates a high level of insight."* | 1.4's C3 closing clause, which derives a limit on evidential value from a property of the method: because the decomposition decomposes the same indicators rather than measuring them independently, it locates the departure without narrowing how large it is. Round D named this the chapter's strongest sentence |
| **R56** | *"The Introduction ends with a brief chapter-by-chapter overview of the report's structure."* | 1.5, six chapters and four appendices, the appendices by `\ref` rather than by letter |
| **HC4** | *"The abstract is a single paragraph."* | **Was FAILING at four paragraphs since 2026-08-08.** Now one |
| **HC5** | *"The abstract is approximately 300 words."* | 300 marker words, `wordcount.py` |
| **R43-R46** | aims / design and methods / major findings / conclusions | Sentence 3 (aim), sentence 4 (method), sentences 5-11 (findings), closing sentence (conclusion). Round D labelled the sequence and confirmed the aim now has an answer |
| **R47** | *"The abstract's results sentences carry specific statistical detail, not vague claims."* | +0.0163 MASE with a ninety per cent interval; sixty-nine per cent against nominal ninety; 124 of 644 and 75 |
| **R48** | *"The abstract stands alone."* | Round D's stand-alone audit; the one failure it found ("the literature's over-offering") is repaired |
| **R49** | *"The abstract does not act as an introduction (common mistake!)."* | Round D's explicit verdict: framing is two sentences of thirteen, the aim lands at sentence 3 and the first number at sentence 4 |
| **R8** | *"each stated research question is explicitly answered by the end of the document"* | **Traced against `discussion.tex` directly, not assumed.** 5.1 answers the five in the order 1.3 states them, and each answer opens by restating its question. RQ1, RQ2, RQ3 and RQ5 match 06 §5's strings essentially verbatim. **RQ4 is the one drift**, and 1.3 now matches 5.1's "departure" rather than 06 §5's "shortfall" |

**Criteria named against Chapter 1 that this chapter does NOT discharge, stated so the trace is
not read as complete:** R65 (Appendix B's search protocol) and HC54 (the project-specification
appendix, **mandatory and absent from `main.tex`**) are document-level and neither is Chapter 1's.
