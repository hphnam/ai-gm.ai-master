# 8C-5 input — what Conclusions inherits, and two things that block 6.1 and 6.2

**Discovery run 2026-08-09. NOTHING COMPOSED.** Written because both blockers are the kind that a
composing session resolves silently and wrongly if it meets them mid-draft.

## The spec, quoted from the owning file

`knowledge/05_paper_architecture.md` §2.1:309–313 — **Chapter 6, 1,100 words**:

| | Section | Spec | Budget |
|---|---|---|---|
| 6.1 | Objectives revisited | *"Each objective, achieved or not, stated plainly."* | 400 |
| 6.2 | Contributions | *"Restated at final strength."* | 250 |
| 6.3 | Further work | *"Eight extensions, count reconciled, ordered by executability."* | 400 |
| 6.4 | Closing | *"The methodological lesson."* | 50 |

Section provenance (`05` :362–365): **6.1 is NEW** — *"No objective is currently revisited
anywhere"*, which confirms the claim verbatim from the file that owns it. 6.2 ← `sec:conclusion-claims`,
6.3 ← `sec:further-work`, 6.4 ← `sec:conclusion-closing`.

Rubric rows (`05`:1180–1182): **6.1 → R109, R110, R111, R38, R39, R40. 6.2 → R112, D12.
6.3 → R113, R116.**

`05`:1092 records Conclusions at **2,672 against 1,100**. That figure predates 8C-4's excision of
`sec:conclusion-divergences` and `sec:conclusion-limitations` (§F: 1,423 words lighter), so the live
floor must be **re-measured with `wordcount.py` before any compression is planned** rather than
inferred from either number.

---

## BLOCKER 1 — `PRJ93.md` contains no objectives, so 6.1 has no list to revisit

**Verified by reading the file end to end (38 lines).** The counts, with the scope named in the same
sentence: in `brain/docs/PRJ93.md`, **"objective" occurs 0 times, "aim" 0, "goal" 0, "outcome" 0,
"success criteri" 0, "deliverable" 1.**

It is the **host's placement advertisement**, not an academic objective list. What it actually
carries is three different candidate referents, and 6.1 reads differently against each:

1. **One host-stated research question** — *"how can an LLM-based agent, given access to a
   hospitality venue's operational data and tools, learn that venue's normal operating rhythm and
   intervene proactively when reality deviates from it."*
2. **Three components of the brain** — learn the rhythm; notice deviation; reason and surface.
3. **Three "Student deliverables"** — (i) the proactive brain, a working prototype with documented
   methodology; (ii) an evaluation framework with results, *"quantitative measures (precision,
   recall, calibration) plus qualitative manager feedback"*; (iii) the dissertation.

**Why this is not a naming quibble.** Component 3 is the one the spec itself calls the research
centre: *"This is where most of the unsolved research lives: agent design, tool-use evaluation, and
how you tell whether an agent's judgement is any good."* **That component, deliverable (i)'s
evaluation, and the qualitative half of deliverable (ii) are exactly the blocked rows** — D-U1, D-U4
and D-U7 on the Anthropic key, D-U2 and D-U5 on Elliot. §A already records D-U7 as *"the largest
single gap between what the dissertation set out to do and what it reports"*.

**So 6.1 done honestly is substantially a statement of what was not achieved**, and which of the
three referents is chosen decides how large that statement is. Choosing referent 2 or 3 makes the
unmeasured agent layer a headline of the chapter; choosing referent 1 lets the rhythm-learning and
deviation-detection work answer most of it.

**This is a scope decision and it is Phuong's, not mine.** It cannot be settled by picking whichever
reading composes most comfortably, which is the failure mode a mid-draft encounter would produce.

**Recommendation:** revisit the **three student deliverables**, because they are the only numbered
commitments in the spec and are what an examiner comparing spec to dissertation will line up. State
(iii) as met, (i) as met for the rhythm and deviation components and unmeasured for the agent, and
(ii) as met quantitatively and unmet qualitatively, each with its blocked row named. That is the
reading that makes 6.1 an honest audit rather than a favourable one.

---

## BLOCKER 2 — the contributions count is contested four against five, and 6.2 restates it

`knowledge/06_research_questions.md` is the file whose §6 holds *"The exact strings for Introduction
1.4 — contributions at graded strength"*, and it disagrees with itself and with the document:

- :15 — *"The contributions count moves four → five. This reopened an approved item"*
- :202 — *"1.4's budget is **250 words**. Five contributions, each one sentence plus a strength
  qualifier."*
- :205 — records the document currently reading *"Four contributions at graded strength"*
- :372 — *"The §2.1 'four/five' discrepancy is …"*

**6.2's whole job is to restate the contributions at final strength, so it cannot be composed while
the count is contested.** This is an X1-shaped item: a live contradiction about the same quantity in
two places, which `autoresearchclaw/SKILL.md` §5 makes *"Blocking. Resolve before any other
revision."*

It also binds **8C-6**: 1.4 and 6.2 use the same `06` §6 strings verbatim, so whatever is ruled here
propagates to the Introduction, and the two must not be composed under different counts.

**Recommendation:** rule the count before 8C-5 opens, and record the ruling in `06` §6 so both
sections compose from one place.

---

## Two constraints 8C-5 carries that are already known

- **6.2's strings are fixed and used verbatim in two chapters.** They are not S-4 material: mandated
  repetition is not duplication. Flag them as not available if a later pass meets them.
- **6.3 must reconcile the extension count to eight.** §E of `BLOCKED_third_party.md` holds three
  gated Further Work items and §C the TabPFN residue; `07_figure_programme.md` and `sec:further-work`
  hold the rest. Reconcile against those, not against the current prose.

## What was NOT done

**No composition, by instruction.** No text was written to `conclusion.tex`, and the live word floor
was not re-measured because that is the first act of the composing session rather than of this one.
