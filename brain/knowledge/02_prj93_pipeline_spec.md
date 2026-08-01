# PRJ93 pipeline spec

The AutoResearchClaw 23-stage pipeline adapted to this dissertation. Approved
2026-07-30.

**Inputs.** `brain/knowledge/01_autoresearchclaw_reference.md` (what ARC does),
`brain/knowledge/00_state_brief.md` (chapter state; `W<n>` below refers to its
§2 weakness numbering), `brain/skills/autoresearchclaw/SKILL.md` (the roles and
the `T1`–`T14` tests), `brain/PRJ93_RULES.md` (the gates).

**Roles.** **A** = methodologist, **B** = statistician, **C** = claim auditor —
defined in `SKILL.md` §3. Three independent calls plus a synthesiser; never one
call producing three voices.

**Verification vocabulary.** Four checks, one or more required before a stage's
output is trusted: *Zotero key check* (the citation key exists), *NotebookLM
content check* (the claim about the paper is true of the paper), *released-code
comparison* (the paper's code matches its prose claims — discrepancies to
`brain/ledger/code_vs_paper.md`), *repo result-file trace* (the number exists in
a `brain/log/*result*.md` file, path cited in a LaTeX comment).

**Dates.** Today 2026-07-30. Build window closes 2026-08-21. Submission
2026-09-04 16:00. Body target 17,300 words.

---

## 1. Disposition of all 23 stages

| # | ARC stage | Disposition | Reason |
|---|---|---|---|
| 1 | TOPIC_INIT | **Drop** | Research question fixed by the PRJ93 brief; the four objectives are already set. |
| 2 | PROBLEM_DECOMPOSE | **Drop** | Objectives 1–4 are the decomposition. |
| 3 | SEARCH_STRATEGY | **Adapt** | Becomes the missing search-protocol appendix (W33) — "a half-page appendix and it is free marks". |
| 4 | LITERATURE_COLLECT | **Adapt** | Becomes closure of the 13 named reading gaps (W54), not open-ended collection. |
| 5 | LITERATURE_SCREEN | **Adapt** | Screening record plus the second preprint-density flag (W35). |
| 6 | KNOWLEDGE_EXTRACT | **Adapt** | Becomes the NotebookLM verification log that W34 says was asserted but never evidenced. |
| 7 | SYNTHESIS | **Adapt** | Becomes the contribution-claim repositioning (W21, W24, W30, W31, W32). |
| 8 | HYPOTHESIS_GEN | **Drop** | Re-hypothesising five weeks from submission is scope creep; the hypotheses are the brief's. |
| 9 | EXPERIMENT_DESIGN | **Adapt** | Applies only to the unrun set: S8b/S8c, S9, ECE, RMSSE, the Ellel occurrence gate. |
| 10 | CODE_GENERATION | **Adapt** | Only ECE / reliability diagram / temperature scaling — cheap, unblocked, closes W10 and W26. |
| 11 | RESOURCE_PLANNING | **Drop** | Subsumed by §4's phase order and the 2026-08-21 build window. |
| 12 | EXPERIMENT_RUN | **Keep** | The unrun set, under the existing frame-hash and pre-registration discipline. |
| 13 | ITERATIVE_REFINE | **Drop — deliberately** | Refit-until-better is p-hacking on a dissertation. Pre-registration by commit ordering is called "the strongest thing in the project"; this loop would destroy it. See §5. |
| 14 | RESULT_ANALYSIS | **Keep** | Where MCS, dispersion and DM live. W36 — the absent alternative-comparison — is the stated reason Distinction is "Not met". |
| 15 | RESEARCH_DECISION | **Adapt** | Verdict per gap is report-as-negative / report-with-caveat / drop. Never pivot-to-new-experiment. |
| 16 | PAPER_OUTLINE | **Adapt** | Discussion chapter only — missing entirely, named highest writing priority (W45). |
| 17 | PAPER_DRAFT | **Keep** | Discussion, plus the absent results sections (W46). |
| 18 | PEER_REVIEW | **Keep** | The three-role critique in `SKILL.md` §3. |
| 19 | PAPER_REVISION | **Keep** | One pass per round, two rounds maximum. |
| 20 | QUALITY_GATE | **Adapt** | Marked against `00_marking_criteria.md`, not an LLM 1–10 score. |
| 21 | KNOWLEDGE_ARCHIVE | **Adapt** | `phase_state.md` plus the verification log W34 requires. |
| 22 | EXPORT_PUBLISH | **Adapt** | Overleaf push. Human gate, unconditional. |
| 23 | CITATION_VERIFY | **Keep** | Zotero key check plus the `ref.bib` repoint hazard (W48). |

---

## 2. Specification for the 18 kept stages

### 3 · Search protocol

- **Artefact.** `appendix/search_protocol.tex` (new).
- **Verification.** None — this is a protocol record, not a claim about a paper.
- **Destination.** Working file, then Overleaf.
- **Roles.** C.
- **Acceptance.** Databases named, query strings reproduced, inclusion and
  exclusion criteria stated, screened-vs-retained counts given. W33 closed.
- **Gate.** No.

### 4 · Reading-gap closure

- **Artefact.** Zotero library + the NotebookLM notebook
  (`d565d5f0-9ad6-446f-9573-2316a2f8c0ca`).
- **Verification.** Zotero key check on every addition.
- **Destination.** Working.
- **Roles.** C.
- **Acceptance.** All thirteen W54 papers present in Zotero *and* loaded into
  the notebook — Hansen/Lunde/Nason, Hewamalage & Bergmeir, Kolassa, Barber et
  al. 2023, Haben et al., Cragg, Mullahy, Kostenko & Hyndman, Athanasopoulos et
  al. 2024, TabPFN-TS, Meyer et al., Brigato et al., Makridakis et al. 2022.
  The choice of MASE, the model-selection procedure and the weather covariates
  must each be governed by at least one citation — W54's core charge is that
  none was.
- **Gate.** **Yes — G7.** One question per paper. Do not batch.
- **Note.** Diebold & Mariano was added 2026-07-27; part of the Zotero surplus
  over the notebook is already this work.

### 5 · Screening record

- **Artefact.** Screening record (working file) + the lit review's preprint
  paragraph.
- **Verification.** NotebookLM content check.
- **Destination.** Working, feeding a lit-review edit.
- **Roles.** A, C.
- **Acceptance.** Preprint count stated once with a density figure (W35 says it
  is flagged once only, and that ten or more load-bearing citations are 2025–26
  preprints). No unrefereed source left load-bearing for the contribution claim.
- **Gate.** No.

### 6 · Verification log

- **Artefact.** `brain/log/verification_log.md` (new).
- **Verification.** NotebookLM content check, per claim.
- **Destination.** Working.
- **Roles.** C.
- **Acceptance.** Every empirical claim in `literature_review.tex` has a dated
  notebook query recorded against it. The chapter header sentence withdrawn
  under W34 may be restored **only** if this log exists and covers the chapter —
  the CPTC misstatement (W20) is itself evidence the original pass was not
  thorough.
- **Gate.** No.

### 7 · Contribution-claim repositioning

- **Artefact.** `chapters/literature_review.tex` synthesis and contribution
  paragraphs.
- **Verification.** NotebookLM content check + released-code comparison
  (PRISM / Fu et al. 2026, Sun & Yu 2025).
- **Destination.** Working, then Overleaf.
- **Roles.** A, C.
- **Acceptance.** The claim survives the conflict check in §5: no leg asserts
  something the results refute. PRISM correctly positioned as occupying the
  intersection (W21). Chronos-2 argued for as the served model (W30). CUSUM
  present as the production detector (W31). Croston framed toward its actual
  negative outcome (W32).
- **Gate.** **Yes — G6.** Depends on Phase C; see §5.

### 9 · Experiment design for the unrun set

- **Artefact.** An experiment plan per gap, in `brain/ledger/`.
- **Verification.** Repo result-file trace on the prior work each plan builds on.
- **Destination.** Working.
- **Roles.** A, B.
- **Acceptance.** Baselines named, ablations separable (one component varied at
  a time), seeds and origins pre-registered by commit **before** any run. The
  pre-registration-by-commit-ordering discipline is the project's strongest
  asset and is not suspended for the remaining work.
- **Gate.** **Yes — G1, G2, G3, G4, G5.**

### 10 · ECE / reliability / temperature scaling

- **Artefact.** New evaluation code + `brain/log/*result*.md`.
- **Verification.** Repo result-file trace.
- **Destination.** Working.
- **Roles.** A, B.
- **Acceptance.** Runs against committed data; produces a reliability diagram
  and an ECE figure. Closes W10 ("the most expensive unforced error in the
  project") and W26 (the lit review ends on Guo et al. and ECE as the
  loop-closing guarantee, and no ECE exists).
- **Gate.** No — the *decision* to run it is G3; execution is not separately
  gated.

### 12 · Experiment run

- **Artefact.** `brain/log/*result*.md` per run.
- **Verification.** Repo result-file trace.
- **Destination.** Working.
- **Roles.** —
- **Acceptance.** Frame-hash gate passes. No run reported without a committed
  result file. A run producing no finite metric is a hard stop under
  `SKILL.md` §5, not a result.
- **Gate.** No — but any *rerun* of existing work is `PRJ93_RULES.md` gate 3.

### 14 · Result analysis

- **Artefact.** Analysis file per gap, in `brain/log/`.
- **Verification.** Repo result-file trace.
- **Destination.** Working.
- **Roles.** A, B.
- **Acceptance.** Dispersion reported with every point estimate — W5's bare
  argmin of a six-fold mean is the defect being closed. MCS or DM wherever a
  comparison is claimed. The HLN degeneracy at n=6, h=7 (factor exactly zero, no
  DM variant computable) stated openly rather than worked around (W6).
- **Gate.** No.

### 15 · Research decision

- **Artefact.** `brain/ledger/decision_<gap>.md`.
- **Verification.** Repo result-file trace.
- **Destination.** Working.
- **Roles.** A, B, C.
- **Acceptance.** Every gap carries a written verdict — report as negative,
  report with caveat, or drop — with the evidence for it. No gap silently
  dropped. A negative result is a reportable outcome; the project's record of
  reporting rather than burying them is a stated strength.
- **Gate.** **Yes, where the verdict is "drop".**

### 16 · Discussion outline

- **Artefact.** Outline for `chapters/discussion.tex`.
- **Verification.** Repo result-file trace.
- **Destination.** Working.
- **Roles.** A, C.
- **Acceptance.** Every open `[O]` weakness is either addressed in a named
  section or explicitly declared out of scope. The strongest available
  methodological argument — small-sample claims that fail at power: the six-fold
  selection, the library-flip artefact, the `contract.py` half-width growth —
  must appear (W45).
- **Gate.** No.

### 17 · Paper draft

- **Artefact.** `chapters/discussion.tex` (new) and the absent results sections.
- **Verification.** Repo result-file trace on every number.
- **Destination.** Working.
- **Roles.** A, B, C.
- **Acceptance.** `T1`–`T9` in `SKILL.md` §4 all pass. W46's build-report
  material — fold-count/MCS served-model results, intermittency and
  occurrence-gate results, the four ablations — is first-class, not appendix.
  Nothing on the state brief's "forbidden to quote" list appears.
- **Gate.** No.

### 18 · Peer review

- **Artefact.** Critique record.
- **Verification.** —
- **Destination.** Working.
- **Roles.** A, B, C, plus synthesiser.
- **Acceptance.** Three independent calls. Disagreements preserved, not
  flattened. Findings tagged blocking or advisory and attached to specific
  lines.
- **Gate.** No.

### 19 · Revision

- **Artefact.** Revised draft.
- **Verification.** Repo result-file trace re-run on anything changed.
- **Destination.** Working.
- **Roles.** —
- **Acceptance.** No blocking failure outstanding, or the caveat is written.
  Two rounds maximum, then stop and report per `SKILL.md` §5.
- **Gate.** No.

### 20 · Quality gate

- **Artefact.** Mark record.
- **Verification.** —
- **Destination.** Working.
- **Roles.** A, B, C.
- **Acceptance.** Scored against `00_marking_criteria.md` — every HC item
  explicitly pass or fail, R and D items assessed. No graceful-degradation path:
  a failed HC item is a failed HC item.
- **Gate.** No.

### 21 · Archive

- **Artefact.** `brain/ledger/phase_state.md`, `brain/log/verification_log.md`.
- **Verification.** —
- **Destination.** Working.
- **Roles.** —
- **Acceptance.** Session logged with phase id, artefacts written, unstarted
  items named — per `PRJ93_RULES.md`.
- **Gate.** No.

### 22 · Export to Overleaf

- **Artefact.** The `.tex` files.
- **Verification.** All four checks clear for the content being pushed.
- **Destination.** **Overleaf.**
- **Roles.** —
- **Acceptance.** `T1`–`T14` run. Nothing pushed carrying a blocking failure.
- **Gate.** **Yes — G9, every push, unconditional.**

### 23 · Citation verify

- **Artefact.** `ref.bib`.
- **Verification.** Zotero key check.
- **Destination.** Working, then Overleaf.
- **Roles.** C.
- **Acceptance.** Zero undefined citations. `angelopoulos_conformal_2023` points
  to the intended paper — a Zotero refresh silently repointed it from Conformal
  PID Control to the Gentle Introduction and the document still compiled clean
  (W48). **Never re-export via Better BibTeX** — the key format differs and
  breaks roughly sixty citations. The duplicate `chapters/ref.bib` stub for
  `chatfield_all-zero_2007` resolved (W47).
- **Gate.** No — but adding or dropping a cited paper is G7.

---

## 3. Gate list

| | Decision | Why it is live | By |
|---|---|---|---|
| **G1** | RMSSE vs MASE as headline metric | The examiner's Fatal-3 remedy, unadopted. MASE optimises the median, and Ellel's median day is £0 on an 82%-zero series, so a near-zero flatline is rewarded. Changes results *and* the lit review's metric paragraph | before Phase B |
| **G2** | Ellel scale basis — unscaled or cost-weighted error | W49: at 1.2 trading days a week no MASE scale is defensible at all. Remedy points at Chatfield & Hayya (2007) | before Phase B |
| **G3** | Run ECE, or amend the lit review's Guo et al. promise | Cheap and unblocked. Running it lets the chapter keep its promise; not running it forces a lit-review edit | before Phase B |
| **G4** | S8b go/no-go, and what the dissertation says if Ryan's key never lands | Fatal 2's measurement half. ~644 live calls, temperature 0. S8c and the whole Objective 3 results section sit behind it | 2026-08-04 |
| **G5** | S9 self-labelling fallback | Recovers three of Objective 4's four terms. Needs 60–100 labels from Elliot by 08-14; fallback trigger already set | 2026-08-11 |
| **G6** | The contribution-claim rewrite | W24 — all three legs fail. "Do not submit them as they stand" | after Phase C |
| **G7** | Each paper added to close W54 | `PRJ93_RULES.md` gate 2. One question per paper | Phase A, rolling |
| **G8** | Figure types for Discussion and the new results sections | `PRJ93_RULES.md` gate 4. Every table justified against a chart alternative | Phase D |
| **G9** | Every Overleaf push | `PRJ93_RULES.md` gate 5. Unconditional | rolling |

G1, G2 and G4 are also methodology changes and therefore hit `PRJ93_RULES.md`
gate 1 independently of their listing here.

---

## 4. Phase order

| Phase | Window | Content |
|---|---|---|
| **A** | now → 08-04 | Unblocked lit-review repair: search protocol (W33), preprint flag (W35), verification log (W34), reading gaps (W54). Chase Ryan on the Track B key 08-04 |
| **B** | now → 08-07, parallel with A | Unblocked methodology: G1, G2, G3. Run ECE. State the DM/HLN degeneracy (W6) |
| **C** | 08-04 → 08-14 | Blocked experiments as they unblock: S8b/S8c, S9, the Ellel booking diary |
| **D** | 08-14 → 08-21 | Discussion chapter and the absent results sections. Build window closes 08-21 |
| **E** | 08-21 → 08-27 | Contribution-claim settlement (G6); lit review second pass |
| **F** | 08-27 → 09-04 | Critique-revise loop, mark against criteria, final Overleaf push |

A and B run in parallel because B's decisions are prerequisites for E, and
serialising them behind A wastes the only slack in the schedule.

---

## 5. Dependency conflicts

The working rule is: literature review settles before methodology, methodology
before any experiment rerun. **The second half holds without exception. The
first half is inverted for three specific items, recorded here rather than
quietly reordered.**

**5.1 — The contribution claim cannot settle before the results.** W24 holds
that all three legs of the lit review's contribution claim fail against what was
actually built: multi-venue transfer is used by no served model, no LLM exists
in the served system, and there are zero real manager outcomes. Leg two resolves
only when S8b runs, and S8b is blocked on a key held by another party with a
chase date of 08-04. The lit review therefore settles in **two passes** — every
result-independent repair in Phase A, the contribution claim in Phase E. A
single settlement point is not achievable on this dependency graph.

**5.2 — The four broken promises face two ways.** W25 (VUS-PR), W26 (ECE), W27
(Ask-F1), W28 (the memory stream) are each a lit-review commitment the results
do not deliver. Each closes either by running the thing or by amending the
promise — and choosing between those is a methodology decision that must precede
the lit-review edit. That inverts the stated order for these four items. G3 is
this conflict in its cheapest form: ECE is unblocked and inexpensive, so running
it is probably cheaper than defending the amendment.

**5.3 — G1 and G2 are three-way.** Adopting RMSSE changes the headline metric,
which changes the results chapter *and* the lit review's metric paragraph. The
Ellel scale-basis decision behaves the same way. Methodology-before-experiment
holds; lit-review-before-methodology cannot.

**5.4 — Why stage 13 is dropped rather than adapted.** ARC's ITERATIVE_REFINE
rewrites the experiment and re-runs it up to ten times, keeping the best metric.
On a dissertation that is p-hacking with a progress bar. The project's
pre-registration by commit ordering is described as its single strongest
feature; an iterate-until-improved loop would retroactively invalidate it. Where
a result is disappointing, the verdict belongs in stage 15 — report it as a
negative — not in another refit.

---

## 6. What this spec does not settle

- **Per-chapter word budgets.** None exist anywhere; the only stated figure is
  17,300 for the body. The "7,000–8,000 words missing" figure is stale (W44) and
  needs re-measurement now that `methodology.tex` and `results.tex` are known to
  be on Overleaf.
- **Whether `methodology.tex` and `results.tex` hold prose or stubs.** Unverified.
  Needs a bounded `grep -n` plus line-range reads before Phase D can be scoped.
- **Which Zotero library backs the Overleaf `ref.bib`.** Unreconciled: NotebookLM
  106 sources, Zotero My Library 122, group `scc452` 109. Resolve before the
  stage-23 key check is trustworthy.
- **Round 5 adversarial review.** Listed in the state brief as unrun, on a
  four-for-four record that every fix round shipped a fresh defect. Not placed
  in a phase above — it is a review, not an experiment, and where it belongs
  depends on whether Phase C produces new code.
