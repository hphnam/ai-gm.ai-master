---
name: autoresearchclaw
description: >
  Operating manual for the critique-revise loop on PRJ93 dissertation drafts.
  Contains the three review-role definitions with their critique dimensions,
  the advance-vs-revise tests as pass/fail checks, the failure and pivot
  signals with the action each triggers, and the human gate list. Distilled
  from the AutoResearchClaw stage architecture; the full source analysis is in
  brain/knowledge/01_autoresearchclaw_reference.md and is NOT needed to run
  the loop. Load explicitly in any phase that critiques, revises, or checks a
  chapter draft before it goes to Overleaf. Not auto-loaded — name this file
  in the phase prompt or it will not be read.
---

# autoresearchclaw

Operating rules for critiquing and revising PRJ93 chapter drafts.

Read `brain/PRJ93_RULES.md` alongside this file. Where the two conflict,
`PRJ93_RULES.md` wins and you flag the conflict rather than resolving it.

---

## 1. Human gates — stop before these

These five are from `PRJ93_RULES.md` and are authoritative. Stop, present the
decision compactly with a recommendation, and wait. One gate per question — do
not batch.

1. Changing the methodology.
2. Dropping or adding a cited paper.
3. Rerunning any experiment.
4. Choosing final figure types.
5. Pushing any file to Overleaf.

Two further gates are *candidates*, not adopted. Do not enforce them; if a
session's work would cross one, say so and ask:

- A gate on the evidence base before reading effort is spent (the point where
  the shortlist of papers is fixed).
- A gate on the research question before the methodology that serves it.

Never write outside `brain/`. `.claude/` and the root `CLAUDE.md` are shared
with a collaborator and are out of bounds.

---

## 2. The loop

```
draft → critique (3 roles, independent) → synthesis → revise → test → advance or repeat
```

Hard cap: **2 revision rounds.** On the third failure, stop and report what
still fails with a stated caveat. Do not loop further — see §5.

### Run the critique

Issue **one separate call per role.** Do not ask one call to produce three
reviewer voices. Three personas sharing a single context share every blind spot
and cannot disagree in any load-bearing way — this is the single largest defect
in the system this manual is distilled from, and the reason the loop is
structured this way.

Each role receives: the draft section, the result files it cites, and nothing
from the other roles.

### Synthesise

A fourth call reconciles the three critiques. Its instruction:

> Take the strongest elements from each critique rather than compromising
> between them. Preserve genuine disagreements — do not flatten them. Where two
> roles conflict, state both positions and which evidence would settle it.

No role may veto. The synthesiser may discard a critique, but must say it did
and why.

### Revise

One revision pass per round, addressing the synthesised critique. Then run §4.

---

## 3. Review roles

Three roles. Independent calls. Each returns findings, each tagged `blocking`
or `advisory`, attached to the specific line or number it concerns.

### Role A — Methodologist

Audits whether the work supports the claim, independent of how it is written.

- Internal validity: does the design isolate what it claims to isolate?
- External validity: what population, period or venue does the result
  generalise to, and does the text overreach that?
- Baseline fairness: is the comparison a real contest, or a strawman? Was the
  baseline tuned with comparable effort?
- Ablation completeness: is each component's contribution separable, or are
  several things changed at once?
- Reproducibility: could a reader reimplement this from the text alone?
  Hyperparameters, seeds, data splits, compute, preprocessing.
- Protocol leakage: is any tuning or selection decision made on the test set?

### Role B — Statistician

Audits whether the numbers mean what the sentences say.

- Are 95% confidence intervals or error bars reported on every result table?
- Is n > 1? How many seeds, folds or splits, and is the count stated?
- Are significance tests appropriate to the design — paired where the data are
  paired, corrected where comparisons are multiple?
- Is an effect size reported, not just a p-value? Is a significant-but-tiny
  effect being sold as important?
- Survivorship: if any run failed or diverged, are both conditional (successful
  runs only) and unconditional (failures as worst case) metrics reported?
  Without both, every comparative claim is biased.
- Is variance across conditions non-zero? Identical metrics across conditions
  means the manipulation did not take, not that it had no effect.
- Are denominators, baselines and scaling stated for every ratio metric?

### Role C — Claim auditor

Audits the join between text and evidence, sentence by sentence.

- For every claim in a title, abstract or conclusion: name the specific metric,
  table or figure that supports it. Unnamed → blocking.
- Does any number in the prose fail to appear in a result file? → blocking.
- Topic drift: does a section argue something the chapter is not about?
- Does the strength of the verb match the strength of the evidence?
  "demonstrates" vs "suggests" vs "is consistent with".
- Are limitations stated once, in the limitations section, rather than hedged
  throughout? Scattered hedging reads as evasion and costs marks.
- Citation placement: do Method, Results and Discussion cite anything, or do
  all citations sit in the introduction and related work?

---

## 4. Advance-vs-revise tests

Run every test. Each is pass/fail — no partial credit, no judgement call. Any
`blocking` failure means revise. Advisory failures are recorded and may pass
with a stated caveat.

| # | Test | Fail = |
|---|---|---|
| T1 | Every number in the text traces to a `brain/log/*result*.md` file, with the path in a LaTeX comment beside it | blocking |
| T2 | Every comparison claim carries a p-value, or an explicit sentence that the difference is not significant | blocking |
| T3 | Every result table reports 95% CIs (mean ± CI, or [low, high]) | blocking |
| T4 | Every title, abstract and conclusion claim names the metric supporting it | blocking |
| T5 | Seed/fold count is stated and n > 1, or the single-run limitation is stated explicitly | blocking |
| T6 | Where any run failed, both conditional and unconditional metrics are reported | blocking |
| T7 | No placeholder text, no `TODO`, no `[PLACEHOLDER]`, no `---` standing in for a value | blocking |
| T8 | Every factual claim about a cited paper was checked against NotebookLM this session | blocking |
| T9 | Every citation key used exists in Zotero | blocking |
| T10 | Method, Results and Discussion each cite at least one source | advisory |
| T11 | Bullets appear only in the contributions paragraph and the limitations section; body sections are prose | advisory |
| T12 | At least two figures, each referenced by `\ref{}` from the text | advisory |
| T13 | Limitations stated once, in one section, 200–400 words | advisory |
| T14 | No table a chart would show better — every table justified against a chart alternative | advisory |

**T1 is the load-bearing test.** A number without a traceable source is the
failure mode that destroys a dissertation's credibility, and no amount of good
prose compensates for it. If T1 fails, stop revising prose and fix the trace
first.

**Not covered by these tests — you will need another source:**

- Per-section word targets. This manual has none for PRJ93. The targets in the
  source system are NeurIPS conference budgets and do not transfer. Get real
  ones from the hard-constraints section of
  `brain/knowledge/00_marking_criteria.md` before checking section balance.
- The marking rubric itself. Nothing here scores a draft against DS591 bands.
  T1–T14 are necessary, not sufficient.

---

## 5. Failure and pivot signals

Each signal has one action. Take it — do not deliberate.

| Signal | Detect by | Action |
|---|---|---|
| **No real data** | The result files contain no finite metric, or the run crashed | **Hard stop.** Do not write up. Report that there is nothing to write about. This overrides everything else — a chapter with no grounded data must not be drafted. |
| **Saturation** | Metric ≥ 0.999 or ≤ 0.001, or relative change between rounds < 0.001 | Stop revising the analysis. The measurement has stopped discriminating — either the task is too easy or the metric is wrong. Raise it as a methodology gate; do not iterate. |
| **No improvement** | Two consecutive rounds with no test flipping fail → pass | Converged. Stop. Report the remaining failures rather than running a third round. |
| **Round cap** | 2 revision rounds done with blocking failures outstanding | Stop and report with an explicit caveat naming each unresolved failure. Do not silently proceed as if clean. |
| **Ablations flat** | More than half of ablations sit within 2% of baseline | The problem is the experiment design, not the writing. Stop revising prose; raise a methodology gate. |
| **Revision shrank** | Revised text is under 80% of the original word count | Discard the revision, keep the original, file the revision's useful points separately. Losing content silently is worse than not revising. Retry once, instructing that unchanged sections be preserved verbatim. |
| **Identical conditions** | Two conditions report byte-identical metrics across all keys | Treat as a bug in the experiment, not a finding. Do not report it as a null result. |
| **Contradiction** | Two sections state incompatible things about the same number | Blocking. Resolve before any other revision — a contradiction is worse than either version alone. |

---

## 6. Anti-patterns

These are the specific ways the source system fails. Do not reproduce them.

- **Computing a quality signal and not branching on it.** If you produce a
  score, warning or recommendation, it must change what happens next, or you
  must not produce it. A signal written to a file and never read is worse than
  no signal — it manufactures the appearance of rigour.
- **Backfilling to hit a count.** If a filter yields 6 items against a target of
  15, report 6. Padding to the target makes the number 15 carry no information.
- **Single-call multi-persona critique.** See §2.
- **Degrading the hard stop.** A "proceed anyway with a warning label" path on a
  blocking test converts the only real quality gate into a footnote. There is no
  graceful-degradation mode in this loop.
- **Placeholder output.** If a step fails, fail the step. Never emit
  `[PLACEHOLDER]` into a draft and continue — it survives into the artifact.
- **Verifying and then not writing back.** If a check finds a problem in a file,
  fix that file. Producing a corrected copy alongside the uncorrected original
  means the uncorrected one is what gets submitted.
- **Absence by grep as proof.** "I searched and found nothing" is weak evidence.
  Verify a negative more than one way before recording it as fact, and label it
  an unverified negative if you cannot.

---

## 7. Adopted drafting rules

Apply these when writing or revising, not only when critiquing.

**Claim bounding.** Before writing a title or an abstract sentence, list the
conditions actually tested and their values. The claim may only assert what
those numbers show. Where coverage is partial, use "Toward…", "Investigating…",
"An empirical study of…" rather than a global causal claim.

**Statistical honesty.** No superiority claim without a p-value. Where the
difference is not significant, say so in those words. Where the proposed
approach does not beat the baseline, reframe as "comparable" or "competitive",
or report it as a negative result — do not reach for a framing that implies a
win.

**Honest retitling.** If the results do not support the original claim, change
the title. An accurate title on a negative result marks better than an
aspirational title the evidence contradicts.

**No invented numbers under pressure.** If a critique asks for an analysis that
was not run, write that it was not conducted. Never synthesise a plausible
figure to close a gap.

**Method sections must be reimplementable.** Algorithm description or
pseudocode, every hyperparameter, data representation, and baseline
configuration including any tuning done to make the baseline competitive.

Longer-form guidance — section-by-section structure, the full evidence-bounding
rule set, and the anti-hedging and anti-repetition rules — is in
`references/drafting-rules.md`. Not needed to run the critique-revise loop.

---

## 8. What this file cannot do

Stated rather than padded.

- **It cannot mark a draft.** T1–T14 catch defects; they do not produce a grade
  or check the DS591 rubric. Load `brain/knowledge/00_marking_criteria.md` for
  that.
- **It has no PRJ93 section word targets.** See §4.
- **It does not know the project's state** — which chapters exist, what the
  examiner flagged, which experiments ran. Load
  `brain/knowledge/00_state_brief.md` when that matters.
- **The role definitions are adapted, not validated.** They are distilled from a
  system whose own review stage was its weakest component. They have not been
  run against a real PRJ93 chapter. Treat the first use as a trial and record
  what the roles missed in `brain/ledger/phase_state.md`.

---

## References

- `references/drafting-rules.md` — long-form writing rules (§7 pointer).
- `brain/knowledge/01_autoresearchclaw_reference.md` — the full source
  analysis: 23-stage table, per-stage reasoning, gate-leverage ranking,
  README-vs-code mismatches. Provenance only; not needed to operate this loop.
