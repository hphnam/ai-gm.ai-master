# PRJ93 — the research questions

Written 2026-08-06 under `brain/PRJ93_RULES.md`. Derived from
`knowledge/05_paper_architecture.md` §2.10 (the gap and its seven limbs),
`docs/PRJ93.md` (the project specification), `knowledge/00_marking_criteria.md`
(R7, R8, R109–R111, D12), `ledger/literature_conformance.md` §8–§13, and the
Results inventory at `05_paper_architecture.md` §1.3.

**Status: APPROVED by Phuong, 2026-08-06. Closed.** Every later session — 8B, 8C
and the Introduction, Discussion and Conclusions sessions — works to the numbered
set and the exact strings in §5 and §6 below. Recorded as A15–A17 in
`05_paper_architecture.md` §7. Approved with the set as proposed, plus three
decisions taken at the gate:

- The contributions count moves four → five. This reopened an approved item and
  is recorded as unlock **U1** in `05_paper_architecture.md` §7, not corrected
  silently.
- Discussion 5.1 holds at **500 words**. See §8 and the §10 Chapter 5 block.
- The three-venue estate is confirmed factually correct. See §9.

No dissertation prose was changed in producing this file.

---

## 0. The three constraints every question had to clear

A question was admitted only if it cleared all three.

| | Constraint | Source | What it rejects |
|---|---|---|---|
| **C1** | Entailed by the gap Chapter 2 establishes **from prior work alone** | `05_paper_architecture.md` §2.10 | Any question whose motivation rests on a PRJ93 observation. The thirty-eight passages being excised from Chapter 2 cannot be smuggled back as question motivation. |
| **C2** | Answerable by a result this project holds, or can still produce | §1.3 Results inventory; `BLOCKED_third_party.md` | Any question whose answer is blocked on a third party. See §4. |
| **C3** | Stated at a grain Chapter 5 can answer **directly** | R8, D12; Discussion 5.1 at 500 words | Questions so broad that the answer is a chapter, and questions so narrow that answering them is reciting a table. |

**One further constraint on the set as a whole.** The five questions map
**one-to-one onto the five Results sections** in the approved target tree
(`05_paper_architecture.md` §2.1, sections 4.1–4.5). That is deliberate. R8
requires each stated question be explicitly answered by the end of the document,
and a marker checks that by tracing. A one-to-one mapping makes the trace
mechanical: one question, one Results section, one answer paragraph in
Discussion 5.1, one objective judgement in Conclusions 6.1.

---

## 1. The aim

Stated once, in Introduction 1.3, immediately above the questions.

> **Aim.** To determine whether an operational estate of three hospitality
> venues holds enough data to support a proactive intervention layer: that is,
> whether venue demand can be forecast well enough to establish what is normal,
> whether the uncertainty around that forecast can be calibrated per venue, and
> whether departures from it can be detected under a cost asymmetry that favours
> silence over noise.

This is the project specification's research question — *"how can an LLM-based
agent, given access to a hospitality venue's operational data and tools, learn
that venue's normal operating rhythm and intervene proactively when reality
deviates from it"* (`docs/PRJ93.md`) — narrowed to what the evidence can settle.
The narrowing is deliberate and is declared in Discussion 5.5 under HC59. See §4.

---

## 2. The questions

Five, numbered, stated as questions in Introduction 1.3 and nowhere else in
interrogative form (heading rule N2, `05_paper_architecture.md` §3.1).

**RQ1.** Under the data volumes available to a three-venue estate, can candidate
forecasting approaches be separated on out-of-sample accuracy, and does the
number of evaluation origins change which approach is selected?

**RQ2.** Does the demand structure of these venues — intermittency, and a
hierarchy of venue totals over daily nodes — admit the point-forecast estimand
and the coherent reconciliation that standard practice assumes?

**RQ3.** Does information beyond a venue's own trading history — weather, and
cross-series pooling across venues — improve forecast accuracy at this estate
size?

**RQ4.** Does a split-conformal interval built on this estate hold its nominal
coverage at every venue, and where it does not, what property of the data
accounts for the shortfall?

**RQ5.** Under a cost asymmetry in which a false alarm is more expensive than a
miss, does deviation detection from a calibrated interval reach a performance
that would justify surfacing its output to an operator?

---

## 3. The mapping

Every column is a location in the approved target tree
(`05_paper_architecture.md` §2.1). No cell is empty; that is the point of the
table.

| RQ | Gap limb | Methods | Results | Discussion | Conclusions |
|---|---|---|---|---|---|
| **RQ1** | 1, 2, 5 — pooling unevidenced at small $n$; rank instability on few origins | 3.5 candidate models and the adoption gate; 3.6 comparison procedure, small-sample correction, model confidence set | **4.1** — the ladder, the origin-count reversal, the confidence sets | 5.1 (answer); 5.2 (the reversal runs against Brigato and Hewamalage) | 6.1 objective 1 |
| **RQ2** | 5 — absolute-error degeneracy on intermittent data; the median-under-a-mean's-name chain | 3.2 accuracy measures and the denominator basis; 3.3 demand-pattern classification; 3.9 occurrence modelling | **4.2** — classification, adoption margin, occurrence gate, failed unbiasedness precondition | 5.1 (answer); 5.3 (the four-link empirical chain, `literature_conformance.md` §8) | 6.1 objective 1 |
| **RQ3** | 2, 3 — in-context borrowing shown only on large corpora; no controlled hospitality weather test at venue-total aggregation | 3.4 covariates and availability lead; 3.5 the grouped in-context arms | **4.3** — the weather ablation and the pooling null | 5.1 (answer); 5.2 | 6.1 objective 1 |
| **RQ4** | 4 — the two-sided bound's distinct-scores condition; coverage loss under regime change bounded, not eliminated | 3.7 conformal construction, four-block split, three refinements, distinct-scores condition tested rather than assumed | **4.4** — coverage at power, the exchangeability violation and its cause, the interval-method comparison | 5.1 (answer); 5.2 (adaptive calibration underperformed a static band); 5.4 | 6.1 objective 1 |
| **RQ5** | 6 — over-offering above 50 per cent false alarms; alert fatigue; the asymmetric cost with only a symmetric metric available | 3.8 deviation detection; 3.10 detection evaluation protocol with $F_\beta$ | **4.5** — injection validity, VUS-PR, suppression, the cost sweep | 5.1 (answer); 5.4 | 6.1 objective 2 |
| *(none)* | **7 — operator-grounded evaluation** | 3.12 intervention layer and scoring apparatus | 4.5 (status only) | **5.5, mandatory HC59** | 6.1 objective 2, not achieved |

**Every question has a Results section, and every Results section has a
question.** The one gap limb with no question is limb 7, handled next.

---

## 4. Limb 7 — recommendation, and the reasoning

### The decision

**Recommendation: scope limb 7 out of the research questions and carry it as a
contribution at graded strength.** Do not make it RQ6 answered negatively.

### Why

Three reasons, in descending weight.

**1. R8 and D12 are trace criteria, and a negatively-answered question fails
both by construction.** R8 requires each stated research question to be
*explicitly answered by the end of the document*. D12 — a Distinction
requirement — is stronger still: *the research question is answered
completely*. A marker tracing an RQ6 that reads "does the intervention layer's
output match an operator's accept-or-dismiss decisions?" arrives at Chapter 5
and finds no answer, because there is none: N = 0 operator labels, D-U1, D-U4
and D-U7 all blocked (`BLOCKED_third_party.md` §A, §B). That is a stated
question with no answer, which is the exact defect R8 exists to catch. It costs
marks under R8 and it forecloses D12 outright. A contribution qualified as
"apparatus specified and frozen, measurement identified as blocked" is assessed
as a deliverable against what it claims, and it claims exactly what is true.

**2. The rubric already provides the correct home, and it is mandatory.** HC59
requires divergence from the project specification to be discussed in the
Discussion. The project specification promises *"qualitative manager feedback"*
among the evaluation deliverables (`docs/PRJ93.md`, student deliverable 2). Not
reaching it is precisely a scope divergence, and §5.5 is where the rubric
demands it appear. Routing it through an unanswerable RQ would state the same
fact twice, once in the place the rubric asks for it and once in a place the
rubric penalises it.

**3. It costs nothing in honesty, and gains in visibility.** Scoping limb 7 out
of the *questions* does not remove it from the *gap*.
`05_paper_architecture.md` §2.10 already binds Chapter 2 to state the gap in
full, limb 7 included, and §1.4 to state the contributions at graded strength so
the unmeasured limb is visible from the first page. Under this recommendation
limb 7 appears in five places — Chapter 2's gap statement, Introduction 1.4 as
C5, Methods 3.12 as apparatus, Results 4.5 as status, Discussion 5.5 as the
declared divergence — and the aim in §1 above is explicitly narrower than the
project specification's, with the narrowing declared. A reader cannot miss it.
What they will not find is a promise the document does not keep.

### The consequence to write into Introduction 1.3

One sentence, immediately after RQ5, so the narrowing is stated where the
questions are and not only in Chapter 5:

> These five questions address the conditions a proactive intervention layer
> requires. Whether such a layer's judgements agree with an operator's own is a
> sixth condition, and it is not addressed here: the apparatus is specified and
> frozen, and the evaluation it supports awaits access this project did not
> obtain. Section 5.5 states what that leaves unestablished.

**If the API key and Elliot both arrive before submission**, this decision is
reversible in one direction only: the apparatus runs, and the result reports as
a *finding under RQ5's heading* rather than as a new RQ6, because adding a
question after the evidence is seen is the ordering defect the pre-registration
discipline exists to prevent. Record any such arrival against `D-U7` in
`BLOCKED_third_party.md` and escalate to Phuong before writing it as anything
more than a supplement.

---

## 5. The exact strings for Introduction 1.3

These are the formulations that go into the prose. Fixed here, where the mapping
is visible, rather than in the Introduction session where it is not. 1.3's
budget is **350 words**; the aim (§1) plus these five plus the narrowing
sentence (§4) total approximately 290, leaving room for the one-line lead-in.

| RQ | Sentence as it appears in 1.3 |
|---|---|
| **RQ1** | *Can candidate forecasting approaches be separated on out-of-sample accuracy at the data volumes a three-venue estate provides, and does the number of evaluation origins change which approach is selected?* |
| **RQ2** | *Do the intermittency and hierarchical structure of these venues' demand admit the point-forecast estimand and the coherent reconciliation that standard practice assumes?* |
| **RQ3** | *Does weather, or cross-series pooling across venues, improve forecast accuracy beyond what a venue's own trading history supports?* |
| **RQ4** | *Does a split-conformal interval hold its nominal coverage at every venue in the estate, and where it does not, which property of the data accounts for the shortfall?* |
| **RQ5** | *Under a cost asymmetry favouring silence over noise, does deviation detection from a calibrated interval perform well enough to justify surfacing its output to an operator?* |

Two properties to preserve if any of these is reworded. Each is a **yes-or-no
question with a named object**, so Chapter 5 can open its answer with the word
*yes* or *no* and then qualify — which is what makes R8 traceable. And no
question presupposes its own answer: RQ4 asks *whether* coverage holds rather
than *why it fails*, even though the answer is that it fails at one venue.

---

## 6. The exact strings for Introduction 1.4 — contributions at graded strength

1.4's budget is **250 words**. Five contributions, each one sentence plus a
strength qualifier.

**THE COUNT IS FIVE. This subsection is the single source, and it settles the
question for both 1.4 and 6.2.** Ruled by Phuong, 2026-08-09, restating the
unlock **U1** already taken at the 2026-08-06 gate. Anything that reads "four"
outside the two exceptions below is stale and is corrected on sight rather than
treated as a live disagreement.

**Where "four" still appears, and what each occurrence is.** Checked 2026-08-09
across `knowledge/`, `ledger/` and the live document:

| Where | Reads | Status |
|---|---|---|
| `05_paper_architecture.md` §2.1, the 1.4 purpose cell (:271) | **Five**, "amended from four by explicit unlock, §7 U1" | Already correct. Nothing to do. |
| `05_paper_architecture.md` §7, unlock **U1** (:1317) | four → **Five** | The authority. Nothing to do. |
| §11 of this file | *"resolved in favour of five, by unlock U1"* | Already correct. |
| `05_paper_architecture.md` §1.3 (:242) | *"Four contributions at graded strength"* | ~~**Correctly four.** It is an inventory of the document as it stands, not a target. It stays four until 6.2 is composed.~~ **DISCHARGED 2026-08-09.** 6.2 is composed; a note beside that row records the recomposed state and the row is kept as history. |
| `chapters/conclusion.tex`, `sec:conclusion-claims` | *"divides into four claims"* | ~~**Correctly four today, and 8C-5 changes it.**~~ **CHANGED 2026-08-09 by 8C-5.** Now *"divides into five claims"*; the heading is **Contributions**; C2 is written in at its numbered place and nothing was renumbered. |

**What writing C2 in actually cost, recorded because the strength column above was optimistic.**
C2's fixed string and its strength note survive, but **two clauses of the strength note did not
survive contact with the evidence** and the composed text departs from them deliberately:

1. *"Both arms return nulls; state the null as the finding"* — **the pooling arm is not a null.**
   `tab:group` retains `{U}` alone at Two River Taps, so both grouped arms are *eliminated*, and
   the paired intervals exclude zero at the two data-rich venues. Only Ellel spans zero. Found
   independently by two critique roles. The composed sentence reads "neither buys accuracy",
   which is the claim the evidence supports, and names the loss where it was detected.
2. The weather limb is a **set-level** null with one pairwise exception the Results chapter
   instructs be read *against* it, not past it: the Beer Hall no-weather against horizon-matched
   contrast at $+0.0163\,[0.0004,0.0337]$. It is now inside the same sentence as the null.

**C3's strength note is also stale and was not followed.** It reads *"Reproduces measured
coverage to a thousandth at all three venues"*. `discussion_rewrite_critique.md` **B13** measures
that agreement at **0.00114 / 0.00121 / 0.00157**, so a thousandth is not met anywhere, and B13
records `results.tex`:526/650 as still carrying the unrepaired phrase. **Chapter 4's copy is
still live and is carried forward to 8D.**

**And one contribution was missing that this table never flagged.** RQ2 maps to **C1** in §3
above, but C1's fixed string says nothing about reconciliation or the estimand, so the composed
chapter had no statement of the 22-of-41 unbiasedness failure until a critique role grepped for
it. The limb is now carried inside C1. **A fixed-string table guarantees the strings are
consistent across sites; it does not guarantee they cover the RQs they are mapped to.**

**The note this replaces recommended updating §2.1 and was discharged the same
day; the recommendation is kept here because the reason still binds.** Limb 7's
apparatus must be separately visible under §4 above and cannot be folded into
another claim without concealing it, and 250 words hold five sentences.

**The finding that makes this more than bookkeeping.** The live
`sec:conclusion-claims` was read end to end on 2026-08-09 and its four claims map
to **C1, C3, C4, C5**. It contains no occurrence of *weather*, *pooling* or
*covariate*. **C2 is not the fifth contribution appended to four existing ones —
it is a contribution the document currently omits.** The omitted one is the pair
of nulls: the controlled weather and cross-series-pooling test that returned no
improvement. So the gap between four and five runs in the direction this project
guards against, a null dropped from the summary while four positive-sounding
claims survive, and 8C-5 closes it by writing C2 in rather than by renumbering.

| # | RQ | Contribution as it appears in 1.4 | Strength |
|---|---|---|---|
| **C1** | RQ1, RQ2 | *A model-selection study on a three-venue estate showing which candidate approaches the available evidence can and cannot separate, and demonstrating that the selection reverses with the number of evaluation origins.* | **Full.** Measured, with a model confidence set over 273/260/205 origins. |
| **C2** | RQ3 | *A controlled test of weather and of cross-series pooling at venue-total aggregation, separating the covariate arms by the lead at which each is actually available.* | **Full**, and it is the first such controlled test in hospitality at this aggregation. Both arms return nulls; state the null as the finding. |
| **C3** | RQ4 | *A per-venue calibration audit of a split-conformal interval, identifying the exchangeability violation responsible for the one venue that under-covers and reproducing the measured coverage from it.* | **Full and the strongest.** Reproduces measured coverage to a thousandth at all three venues. |
| **C4** | RQ5 | *An evaluation of deviation detection under an asymmetric cost, on a measure committed to before the results were seen, with the injection design's contribution to the score measured rather than assumed.* | **Full on the measurement, qualified on the operating point.** The cost sweep selects no operating point, and the reason is itself a finding: 8 false alarms against 124 misses inverts the failure mode the literature guards against. |
| **C5** | *(limb 7)* | *A specified and frozen apparatus for evaluating an intervention layer against an operator's own accept-or-dismiss decisions, together with a statement of what it can and cannot establish once run.* | **Graded down explicitly. The apparatus is complete and has not been run.** The sentence must carry "and has not been run" or an equivalent in 1.4 itself, not deferred to 5.5. |

The graded-strength convention: C1–C4 are stated in the past tense of completed
work; C5 is stated as a built artefact with its unmeasured status inside the
same sentence. `sec:conclusion-claims` already does this correctly and is the
model to follow (`05_paper_architecture.md` §2.10).

---

## 7. Structural defects found while deriving the set

The brief asked for two checks. Both were run against the full §1.3 Results
inventory.

### 7.1 Questions with no corresponding result — none

All five map to a Results section holding a measured answer. RQ5's answer is
qualified (the cost sweep is degenerate) but the degeneracy is itself measured
and reportable, so the question is answered rather than unanswered.

### 7.2 Substantial results answering no question — one

**`sec:res-chatlog`, "A second learning domain reaches the output", 348 words.**
It reports the knowledge-gap signal: clustering staff questions from the chat
corpus to flag a missing SOP. The project specification names this explicitly —
*"Three staff have asked about the fryer reset this month? Flag a missing
SOP"* — and Methods 3.11 carries its corpus, clustering and threshold.

**It cannot become a research question**, and the reason is C1 in §0. The seven
gap limbs at `05_paper_architecture.md` §2.10 contain nothing about knowledge-gap
detection; there is no prior-work claim in the review from which such a question
follows. Making it RQ6 would require adding an eighth limb to an approved §2.10,
and that limb would have to be built from literature the review does not survey.

**Recommended disposition: report it as a specification-level deliverable rather
than as a research answer.** Concretely — keep it in Results 4.5 within that
section's 800 words, framed as the second signal reaching the output rather than
as an answer to anything; revisit it in Conclusions 6.1 against the project
specification's objective 1, where the deliverable is *"a working prototype …
that learns each venue's rhythm from live data and surfaces prompts"*; and do
not give it a contribution line in 1.4. This is the honest placement: it is
something the project built and demonstrated, not something the project
established.

Two further items are correctly homeless and need no action. `sec:res-pattern`
(394 words, "A common pattern across the studies") is already directed to
Discussion 5.3 by `05_paper_architecture.md` §1.3 — it is interpretation, not a
result, and answers no question by design. `sec:res-agent` (318 words) is the
limb-7 status report and routes to 5.5 under §4 above.

---

## 8. Tracing back to the rubric

| Criterion | Where it is met | Check |
|---|---|---|
| **R7** — a research question is explicitly stated in the Introduction | 1.3, five of them, §5 strings | Present |
| **R8** — each stated question is explicitly answered by the end | 5.1, one answer paragraph per RQ at ~100 words | Traceable by the §3 table |
| **R109–R111** — Conclusions revisit the aim and each objective, and state whether achieved | 6.1, 400 words | Objectives from `docs/PRJ93.md`; achieved/not judgement from `BLOCKED_third_party.md` |
| **HC59** — divergence from the specification discussed | 5.5, 300 words, mandatory | Limb 7 is the principal divergence; see §4 |
| **D12** — the question answered *completely* | Achievable for RQ1–RQ5 as scoped | Would be foreclosed by an RQ6 on limb 7; that is why §4 recommends against it |

**One budget consequence to carry into 8C.** Discussion 5.1 holds 500 words for
five answers — 100 words each. That is enough for a direct answer with its
headline number and one qualification, and it is not enough for argument.
Argument belongs in 5.2, 5.3 and 5.4, which is where the approved tree puts it.
If 5.1 starts arguing, it will overrun, and the budget is fixed
(`05_paper_architecture.md` §7).

---

## 9. The estate size — verified at the gate, 2026-08-06

The aim in §1 says *three-venue estate*, and RQ1 and RQ3 both turn on estate
size, so the figure was checked before the gate closed rather than left to 8D.

**Confirmed: the estate studied is three venues — the Beer Hall, Ellel, and Two
River Taps.** The aim, RQ1 and RQ3 are factually correct as written and need no
change. This is not a miscount.

**It is, however, a divergence from the project specification, and 5.5 must say
so.** `docs/PRJ93.md` describes GM-AI as *"currently live across 4 Lune Brew Co
venues"* and offers *"read access to a dedicated research schema in the
production database"* on *"PostgreSQL with pgvector (NeonDB)"*. Two of those did
not hold for the work as done:

| Specification says | What the study had | Where it is declared |
|---|---|---|
| Four live venues | Three: Beer Hall, Ellel, Two River Taps | **5.5** |
| NeonDB research schema, read access from day one | Not provided | **5.5** — the non-provision already identified for HC59 |

**One thing this file does not hold, and 5.5 needs it.** Nothing in `brain/`
records *why* the estate is three rather than four — whether the fourth venue
was excluded during the work for want of usable history, or was never in scope.
The distinction matters to the reader: an exclusion made after seeing data is a
methodological decision requiring a stated criterion, whereas a venue that was
never in scope is a boundary. **8D must establish which and state it in one
sentence in 5.5.** If it was an exclusion, Methods 3.1 must also carry the
criterion, because 3.1's purpose line is *"three venues, per-venue regimes, the
closed venue as control, provenance of every source"* and an unexplained
omission from that list is exactly what R83 asks to be justified.

Note that the number itself is load-bearing beyond the aim. The gap's limbs 1
and 2 are *small-estate* claims — `montero-manso_principles_2021` give no
threshold, and `ansari_chronos-2_2025` leaves group size open — so the estate
size is the quantity that makes RQ1 and RQ3 the questions they are. It appears
in the abstract, in 1.1, in 2.3, in 3.1 and in the answers to RQ1 and RQ3.
**Terminology consistency check for 8D: "three venues" everywhere, never
"four", and never "the estate" unqualified on first use.**

---

## 10. Binding instructions for the later session prompts

Recorded here so they survive independently of the prompt they were written
into. A session that reads this file gets them whether or not the prompt carried
them.

### For the Chapter 5 session

> 5.1 is strictly answers: one direct answer per question with its headline
> number and at most one qualification, 100 words each. Argument belongs in
> 5.2–5.4. If RQ4 or RQ5 will not fit, move the qualification into 5.4 and
> cross-reference — do not take words from 5.2 or widen 5.1.

The reason 5.1 is not widened: it is the R8 trace. A marker must be able to find
five direct answers without reading argument, and a 5.1 that argues blurs the
trace it exists to provide. The reason RQ4 and RQ5 are named specifically: they
carry the most qualified answers — RQ4's coverage result holds at two venues and
fails at one, RQ5's cost sweep selects no operating point — so they are where an
overrun will originate.

### For the Methods session (session 4)

> Methods 3.11 (knowledge-gap signal) serves no research question by approved
> decision, per 06's defects section. It is retained because the project spec
> names it and it is reported in Results 4.5. Do not flag it as a defect and do
> not construct a question for it. Every other method must trace to an RQ in 06.

This pre-records the one exception to that session's own trace rule. Without it
3.11 flags, and the resolution the agent would reach for — constructing a
question — is the one §7.2 rules out, because it would require an eighth gap
limb built from literature Chapter 2 does not survey.

---

## 11. What is fixed

- The aim as worded in §1.
- The five questions, their numbering, and the §5 strings.
- The §3 mapping — no later session relocates an answer to a different chapter
  without saying so.
- The limb-7 decision in §4, including its one-directional reversibility.
- The five contributions and the §6 strings. The §2.1 "four/five" discrepancy is
  resolved in favour of five, by unlock U1.
- The `sec:res-chatlog` disposition in §7.2.
- The three-venue estate figure (§9), and the two specification divergences it
  carries into 5.5.
- The two prompt blocks in §10.

**Still open, and owned by 8D:** why the estate is three venues rather than the
specification's four — exclusion or boundary. One sentence in 5.5, and a
criterion in Methods 3.1 if it was an exclusion.
