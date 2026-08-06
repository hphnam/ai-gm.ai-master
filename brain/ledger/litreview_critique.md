# Literature review — critique-revise record

Loop run 2026-08-01/02 under `brain/skills/autoresearchclaw/SKILL.md` §2–§4 and
`brain/PRJ93_RULES.md`. Subject: `chapters/literature_review.tex`, restructured
and rewritten from the Overleaf version after the Step 1 corpus gate
(`brain/ledger/litreview_corpus_judgement.md`) was approved.

Working drafts, all under `brain/drafts/`:

| File | Words | What it is |
|---|---|---|
| `literature_review_v1.tex` | 7,145 | First restructure + rewrite |
| `literature_review_v2.tex` | 8,865 | After critique iteration 1 |
| `literature_review_v3.tex` | 9,200 | After critique iteration 2 |
| `literature_review.tex` | 9,553 | After critique iteration 3 — current |

The Overleaf original is ~5,600 words / 75 citation keys. Current draft is
9,553 words / 90 keys. **Nothing has been pushed to Overleaf** (gate 5).

---

## Conflict with SKILL.md, flagged not resolved

`SKILL.md` §2 sets a **hard cap of 2 revision rounds** and §5 requires stopping
and reporting after the second with any blocking failures named. The phase
prompt requires a **minimum of three iterations**. Three critique rounds and
three revision passes were run, so the prompt's floor exceeded the manual's
ceiling. Per `SKILL.md` §Preamble the conflict is flagged rather than resolved
unilaterally: the extra round was run because it was instructed, and the
outstanding-failure report §5 demands is given below regardless.

The extra round earned its cost. Iteration 3 found three statements that were
statistically **wrong** rather than imprecise, all three introduced or left
standing by iteration 2's repairs.

---

## Method

Three roles, **one separate call each**, none seeing the others' work, followed
by a fourth synthesis call — `SKILL.md` §2's structure, adopted specifically
because a single call producing three voices shares every blind spot.

- **Role A — Methodologist.** Received the draft plus `00_state_brief.md`, so it
  could check the chapter against what the project actually built and found.
- **Role B — Statistician.** Received the draft **only**, to keep its audit of
  quoted figures independent of project context.
- **Role C — Claim auditor.** Received the draft plus `citation_audit.md`, to
  check no previously-corrected defect had been reintroduced.
- **Synthesiser.** Received all three critiques and the verified-facts list;
  instructed to take the strongest element of each rather than compromise, to
  preserve disagreements, and to say what it discarded.

Disputed claims were settled **at source** before revision, not by adjudicating
between reviewers. Twelve such retrievals were made across the three rounds.

---

# Iteration 1

## Role A — Methodologist (12 findings, 11 blocking)

Pre-registration credibility borrowed without the mechanism; the "predicted
negatives" selected (three reported, two contrary ones omitted);
Montero-Manso applied to inference-time attention when it governs estimation;
the locality principle made unfalsifiable; Haben's electricity mechanism
assumed to transfer to hospitality; an internal contradiction between the
covariate justification and the weather argument; the rank-instability
literature (directionless) used to claim a directional prediction; a stale
six-fold MCS sentence functioning as hindsight exculpation; the contribution's
three legs not in hand; the chapter committing to ECE and Ask-F1; an n=1 design
upgraded to a general question; no search protocol.

## Role B — Statistician (12 findings, 9 blocking)

Ancker's figures treated as probability changes when they are odds ratios; a
false uniqueness theorem on coherence-compatible measures; the HLN degenerate
case misdescribed; the intermittency constants' 0.013 window called "decisive";
the Angelopoulos–Bates bound applied to a realised finite window; the M5
figures misattributed; a cluster of magnitudes with no metric, baseline or
denominator; SHAP shares with no stated total; PRISM's figures with no units or
baseline; four significant figures on a 233-event test set; comparative verbs
without the intervals that adjudicate them; a challenge to the Chatfield cost
direction.

## Role C — Claim auditor (12 findings, 7 blocking)

Two sentences of unverifiable self-praise, in the same class as the NotebookLM
assurance previously withdrawn under W34; a preprint disclosure whose numbers
were wrong; a false claim that no contribution rested on unrefereed work; a
point-of-use flagging promise honoured once; nine citations with no verification
record; a Meyer inference walked back into an attributed sentence; an uncited
hinge paragraph at maximum modality.

## Synthesis 1

Ranked 20 items in four tiers. **Rejected B's HLN correction on arithmetic** —
B claimed the bracketed quantity goes negative rather than to zero; the
synthesiser showed `f(h) = n+1-2h+h(h-1)/n` is exactly zero at `h=n` and
`h=n+1` for every `n` and strictly positive at other integer horizons, so the
draft's "can vanish" was right and B's correction was not. Downgraded A's
Paleyes limb (the chapter had not in fact made the strong claim), C's
verification findings (an evidence-grade complaint that was really a ledger
gap), and B's Chatfield challenge (pending source check). Named the most
serious problem: **four of the five checkable claims the chapter made about
itself were false**, in the one paragraph whose function is to establish that
the chapter can be trusted.

## Settled at source before revising

| Question | Answer | Effect |
|---|---|---|
| Chatfield cost direction | Abstract verbatim: all-zero lowest cost at high lumpiness, best at mid-lumpiness "if the shortage cost is much higher than the holding cost" | **B12 rejected** — draft was right |
| Are 4/3 and 0.5 classification cutoffs? | Yes — explicit corrections to SBC's 1.32/0.49; `v > 2-(3/2)p` is a *separate* SBA selection rule | **B6 rejected**, B4's "which side" accepted |
| Croston 1972, Syntetos & Boylan 2005 | Verified verbatim | Cleared two "weak evidence" grades outstanding since the first audit |

## Changed in revision 2

Deleted both self-praise sentences and the pre-registration appeal. Recounted
preprints. Recast Montero-Manso as the chapter's own conjecture, stated so it
can fail. Added the electricity-versus-hospitality channel disagreement.
Resolved the covariate contradiction. Restated the rank claim as directionless.
Deleted the six-fold sentence; corrected the Hansen MCS statement. Corrected
Ancker to odds ratios, dropped the false uniqueness claim, added the no-ties
condition, fixed the M5 attribution, named metrics and denominators throughout.
Added the two contrary results the chapter had omitted. Added an honest scope
paragraph naming the closed venue and the excluded fourth location.

## Rejected in revision 2, and why

- **B's HLN "negative not zero"** — arithmetically wrong; the original stood.
- **B's Chatfield reversal** — the paper's own abstract contradicts it.
- **B's claim that 4/3 is only an SBA-selection constant** — Kostenko &
  Hyndman use it as both; the classification limb is explicit in the text.

---

# Iteration 2

## What the three roles found

**A** confirmed A1, A3, A4, A5, A7, A8 fixed, and reported the preprint
accounting **newly broken** by the repair itself (6+4=10, not 11; three markers
where four were claimed; "each is marked" false). Raised the ECE abstention,
the mean-eliciting-loss arc arguing for a measure the dissertation does not
report, and a fresh foresight claim ("stated here rather than discovered
later") about a defect that *was* discovered later. Judged the hedging
**non-uniformly distributed** — thick at exactly the three places the project
has unmet promises: "hygiene that intensifies precisely at the unmet promises
reads as a map of them."

**B** confirmed six items fixed and found repairs had broken two: a binomial
standard error applied to an F1 that is not a Bernoulli rate, and an
under-coverage claim blamed on the tie condition, which governs only the upper
bound. Also found the Kostenko near-boundary argument a non sequitur — the
equal-performance locus is a *line in the (p,v) plane*, not an interval of p.

**C** confirmed C1, C4, C9, C11, C12 fixed and found the unearned-assurance
**class recurred in five new places** after one instance was removed, plus a new
appeal to repository commit ordering. Judged the hedging a defect of
**allocation**: hardest where the evidence was strongest (Hancock, Zheng),
absent where weakest (three uncited universals).

## Synthesis 2 — the diagnosis that mattered

Ranked 19 items and then named a **defect generator**, which is the most useful
output of the whole loop:

> When the chapter cannot resolve a claim, it adds a sentence about how the
> claim will be handled.

Evidence: iteration 1 removed a protocol-leakage sentence and iteration 2
re-instantiated it elsewhere; removed one unearned assurance and five appeared;
removed an uncited high-modality paragraph and the defect relocated; and the
preprint repair broke the arithmetic the disclosure exists to make checkable.
The synthesiser located the generator in two project facts — no discussion
chapter exists, and three argumentative arcs terminate in facts the chapter
would not state (MASE not RMSSE, ECE not computed, Ask-F1 sweep degenerate) —
and prescribed **R-Zero**, adopted verbatim for revision 3:

> The chapter may state what the literature says and what the project's design
> assumes, and nothing about what any later chapter will do.

It also ruled on the one genuine reviewer conflict (below) and concluded the
draft was **thrashing, not converging**, unless R-Zero was applied first.

## Settled at source before revising

| Question | Answer | Effect |
|---|---|---|
| Hancock's k and CIs | Correlational: performance k=5, CI [+.25,+.43]; attributes k=5, CI [−.09,+.15] — **non-overlapping**. Experimental: performance k=2, attributes k=8 | Ruled D1 (below) |
| Lu's false-alarm denominator | "the proportion of incorrect task predictions" — a share of predictions made | **A9 rejected**; draft was right |
| PRISM's figures | F1 gain is **percentage points** (66.47→86.61) vs the Qwen2-7B-Proactive baseline; false-alarm 50.22→22.94, ≈54% relative. The abstract's 22.78% is not reconcilable with the body | **B-F6 upheld** — a silent points→relative conversion had been made |

## Genuine disagreement, and the ruling

**B-F9 (add confidence intervals to Hancock) versus C7 (delete the Hancock
hedge, the claim is verified).** The synthesiser rejected C7's prescription and
partly rejected B's: the hedge was not attached to the correlational finding —
which the source supports and whose intervals do not overlap — but to the
cross-analysis generalisation, where the source is genuinely weak. The fix was
neither deletion nor a bare interval but **re-scoping plus the actual k**. The
retrieved k=2-against-8 confirmed the hedge was earned, and the non-overlapping
correlational intervals confirmed the ordering was too. Both reviewers were half
right and neither prescription would have produced the correct sentence.

## Changed in revision 3

R-Zero applied throughout. Preprint accounting recounted mechanically from the
file rather than by inference. ECE abstention replaced by the plain fact that it
is not computed. The MASE-versus-RMSSE tension disclosed in `sec:rw-ruler` as a
limitation of the work. Foresight clause deleted. Argument-from-absence replaced
by three positive checkable facts. Calendar-versus-weather split explicitly
labelled an assumption. Kostenko passage rewritten with the (p,v) geometry.
Under-coverage reattributed to expectation-versus-realisation. Hancock given
its intervals and k. PRISM's figures corrected to percentage points. Schmidt
downgraded to an illustration.

## Rejected in revision 3, and why

- **A9 (Lu's per-intervention framing gratuitous)** — the source defines the
  rate exactly that way; the framing is correct and load-bearing.
- **C7 (delete the Hancock hedge)** — mis-located what the hedge modifies.
- **B's HLN addendum** — already correct; the note added rigour, not a fix.

---

# Iteration 3

## What the three roles found

**A**: the R-Zero rule **broken four times** ("named here and resolved later",
"that the methodology should", "the discussion … is where that trade should be
defended", "and is recorded as one"); the preprint arithmetic now right but its
two surrounding claims false; a generic finite-window caveat used to neutralise
an under-coverage result that is several standard errors wide and therefore not
a finite-window artefact; the scope paragraph asserting operator judgements
that do not yet exist and naming the wrong validity threat; and the contribution
sentence describing "a rhythm borrowed across a small real estate" when pooling
is a negative result used by no served model.

**B**: three statements **statistically wrong**, not merely imprecise —
(i) coverage "degrades in proportion to" the misclassification rate, where the
sources give an upper *bound*; (ii) absolute-error measures making a constant
zero optimal on "intermittent" series, true only once zeros outnumber trading
days (p>2), not at the chapter's own p>4/3 threshold; (iii) endorsing Ask-F1,
an **equally weighted** harmonic mean, as the template for a metric the same
sentence requires to be **asymmetrically cost-weighted**. Also: four-significant-
figure PRISM numbers surviving two paragraphs after the chapter argued such
precision unsupportable, and Hertel's attribution shares doing work an accuracy
result should do.

**C**: the rule broken at the same four sites plus the header comment, which had
been *enlarged* into a self-certification of compliance with the rule the body
breached; the preprint sentence's marking rationale false (the real criterion is
peer-review status, not load-bearingness); the enumeration behind the
contribution's negative half covering seven of nine surveyed systems; and the
Bregman generalisation claimed as the chapter's own observation when it is a
standard published result.

## Changed in the final revision

All three wrong statements corrected: proportionality → bound in both places;
the p>2 condition stated explicitly and distinguished from p>4/3; Ask-F1
replaced by an `$F_\beta$` with `$\beta$` fixed from the elicited cost ratio,
with the symmetry problem stated as the reason. All four rule breaches deleted;
header comment reduced to a pointer to this file. Preprint rationale corrected
to peer-review status. Under-coverage rewritten to distinguish a short-window
artefact from a multi-standard-error shortfall and to name Barber et al. as the
frame. Contribution sentence rewritten to describe a **per-venue** rhythm, with
pooling named as a hypothesis examined and not adopted. Scope paragraph
rewritten as a design statement including author-as-rater non-independence.
Enumeration extended to all nine systems and the quantifier narrowed. Bregman
clause **dropped** rather than cited — the argument does not need it, and adding
a source would have been an unapproved gate-2 citation. PRISM and Lu figures
rounded consistently. Hertel demoted to weak corroboration with the collinearity
objection stated.

## Rejected in the final revision, and why

- **C's PRISM baseline-identity doubt** — Qwen2-7B-Proactive *is* Lu's best
  fine-tuned agent; the coincidence C flagged is the actual relationship, and it
  was verified at source in iteration 2.
- **A's request to state this estate's Ask-F1 sweep as degenerate** — partially
  taken. The general condition is stated and the shape of record that produces
  it is described, but asserting the project's specific sweep result inside the
  literature review would import a results claim the chapter is designed not to
  carry.
- **A's VUS-PR symmetry request** — resolved by removing the normative
  prescription rather than adding a delivery claim, because the project record
  is ambiguous on whether VUS-PR was computed (report 11 says the dependency was
  unavailable; the run list says it was run via pinned TSB-AD). Asserting either
  would have been unverified.
- **Adding a Bregman citation (Savage / Banerjee / Gneiting & Raftery)** — would
  have been a new cited paper and therefore gate 2. Clause dropped instead.

---

# Acceptance tests — `SKILL.md` §4

Run against the final draft. Several tests have no surface in a literature
review; those are marked N/A with the reason rather than counted as passes.

| # | Test | Verdict |
|---|---|---|
| T1 | Every number traces to a `brain/log/*result*.md`, path in a LaTeX comment | **N/A — by design.** The chapter contains no project-derived figure. Every quoted number is from a cited paper. Project results are referred to qualitatively only ("returns a null", "covers below its nominal level"), so there is no number for T1 to trace |
| T2 | Comparison claims carry a p-value or an explicit non-significance statement | **N/A.** The chapter makes no quantitative project comparison |
| T3 | Result tables report 95% CIs | **N/A.** No tables |
| T4 | Title/abstract/conclusion claims name their supporting metric | **PASS.** The synthesis names the source behind each of its four established results and each of its three literature-led expectations |
| T5 | Seed/fold count stated, n>1 | **N/A.** No experiment reported here |
| T6 | Conditional and unconditional metrics where runs failed | **N/A** |
| T7 | No placeholder text, no TODO | **PASS** — verified by grep |
| T8 | Every factual claim about a cited paper checked against NotebookLM this session | **PARTIAL — the one that does not fully pass.** The 17 added or newly-activated citations were verified this session with verbatim quotes, as were Chatfield, Kostenko, Croston, Syntetos, Hancock, Lu and PRISM on specific disputed points. The remaining pre-existing citations rest on the 2026-07-30 `citation_audit.md` two-pass verification, not on a fresh check. That is a re-verification gap, not an unverified claim |
| T9 | Every citation key exists in Zotero | **PARTIAL.** All 90 keys resolve in `ref.bib`; the four new ones are confirmed in Zotero by item key. Full Zotero-to-`ref.bib` reconciliation remains open per `02_prj93_pipeline_spec.md` §6 (NotebookLM 106 / My Library 122 / group `scc452` 109) |
| T10 | Method, Results and Discussion each cite ≥1 source | **N/A.** Not this chapter |
| T11 | Bullets only in contributions and limitations; body is prose | **PASS** — no list environments |
| T12 | At least two figures, each `\ref`'d from the text | **FAIL (advisory).** The chapter has no figures. See below |
| T13 | Limitations stated once, 200–400 words | **PARTIAL (advisory).** The scope paragraph in `sec:rw-synthesis` is the single inventory but runs ~170 words, and four further limitation statements sit where they bear (measure choice, sampling uncertainty on p, ECE, rater independence). Role C accepted the siting and noted the absence of one consolidated inventory |
| T14 | No table a chart would show better | **N/A.** No tables |

**No blocking test fails.** Two advisory failures stand, T12 and T13.

### T12, stated precisely

The chapter would be improved by two figures, and both are cheap: the pipeline
schematic the chapter's structure already implies (rhythm → ruler → deviation →
surfacing → evaluation), and the Syntetos–Boylan–Croston classification plane
with the SBC and Kostenko cutoffs and the `v > 2-(3/2)p` diagonal drawn on it —
which would make `sec:rw-rhythm`'s geometric argument immediate instead of
verbal. **Neither was created, because choosing final figure types is
`PRJ93_RULES.md` gate 4 and was not raised in this session's approval.**

---

# Outstanding at close — `SKILL.md` §5 report

## Prose defects: none outstanding

Every blocking finding from all three rounds is either applied or explicitly
rejected with a reason recorded above. The final mechanical sweep found no
surviving rule violation, no unresolved citation key, no placeholder, and
preprint accounting matching the text exactly (12 = 1 + 3 + 8).

## Defects editing cannot reach

Role A drew this distinction and it is the honest close. These are facts about
the project, not the prose; the chapter can only stop asserting otherwise.

1. **No live-LLM agent run.** S8b/S8c blocked on a third-party key. The
   `sec:rw-surfacing` → `sec:rw-evaluation` arc introduces an agent whose
   empirical half does not exist.
2. **N=0 operator labels.** Objective 4's target measurement is unobtained and
   the documented fallback is author self-labelling. The chapter now states this
   as a design threat rather than assuming the labels exist.
3. **Transfer is used by no served model and group ICL is a negative result.**
   The contribution sentence has been rewritten to describe a per-venue rhythm.
4. **ECE not computed; the Ask-F1 sweep is degenerate.** The chapter now states
   the first as a limitation and states the degeneracy condition generally.
5. **Beer Hall band under-coverage.** The chapter now presents it as a finding
   requiring explanation rather than a caveat to absorb.

## Two decisions for the human

- **The MASE disclosure.** `sec:rw-ruler` now states that the chapter's own
  argument runs against the measure the results chapter reports. This is
  defensible and pre-empts an examiner, but it is a judgement about how much to
  concede in a literature review and it was made by the agent.
- **T12.** Two figures are wanted; creating them is gate 4.

---

## Step 5 — pushed to Overleaf, 2026-08-02

Approved by the human at the Step 5 gate. Three files written via the Overleaf MCP:

- `chapters/literature_review.tex` — the revision-3 draft (9,553 words, 90 keys).
- `ref_additions.bib` — NEW. The four added references.
- `main.tex` — one line, `\addbibresource{ref_additions.bib}`.

Deviation from the plan presented at the gate, and the reason. The four entries
were NOT appended to `ref.bib`. That file is 190KB and the MCP write tool takes
whole-file content only, so appending means round-tripping all 114 entries
through a tool call and risking corrupting working ones. A second bib resource
also means a future Better BibTeX re-export of `ref.bib` cannot clobber the
additions, which turns W48 from a live hazard into a non-issue.

Consequence: both hygiene items remain OPEN, since both require editing
`ref.bib` itself.

- `noauthor_full_nodate` not deleted. Uncited, so it compiles clean. Low priority.
- `ding_proactor_2026` not retyped. Still `@article` with no `journaltitle`, so
  it renders as a journal article with no venue while being cited as a
  substantive result. Needs a one-entry manual edit before submission.

Still open from the acceptance tests, unchanged by the push: T12 (no figures —
gate 4, not raised), T13 (scope inventory ~170 words against a 200--400 target),
T8 (pre-existing citations rest on the 2026-07-30 audit, not a fresh check).

## Revision 4 — style pass, 2026-08-03

Applied `avoid-ai-writing`, `humanizer` and `literature-review-writer` to
`brain/drafts/literature_review.tex`. Style only: no claim, citation, number,
hedge, preprint marker or disclosure was altered. Verified mechanically —
90/90 citation keys preserved (none dropped, none added), every numeric literal
preserved (none dropped, none added, so no fabricated specifics), all `\label`s
preserved, no `\ref` dropped.

| Pattern | Before | After |
|---|---|---|
| `---` em dashes | 48 (5.0 per 1,000 words) | 0 |
| `rather than` | 56 | 9 |
| Median sentence length | 30 words | 25 |
| Sentences over 45 words | 58 | 31 |
| Sentences under 12 words | 38 | 53 |
| Word count | 9,553 | 9,449 |

Also removed: moral adjectives on non-agentic nouns ("scored and selected
honestly", "the honest response"); "worth stating / worth noting" hedges;
several enumerative paragraph openers.

Headings rewritten to sentence case, dropping the gerund-plus-colon formula
that ran on six of seven sections. This is a house-style correction as well as
an AI-pattern one: `chapters/methodology.tex` and `chapters/results.tex` both
use sentence case and neither uses that formula. `\label`s are unchanged, so
every cross-reference still resolves.

One editorial addition: `\emph{calibration}` is now defined at first use in
`sec:rw-rhythm` (the "From a point to a band" subsection) instead of six
paragraphs later, per the literature-review-writer checklist item 4.4.

Second-pass audit caught a regression in the first pass: the `rather than` tic
had been converted into an `and not` tic (29 occurrences), which trades one
fingerprint for another. Ten of those were dropped outright where the negation
carried nothing the surrounding prose did not already say; the rest were
diversified into ordinary contrastive apposition. Contrastive precision is a
legitimate and frequent move in a critical review, so the target was to vary
the form and cut the empty instances, not to drive the count to zero.

NOT pushed to Overleaf. Gate 5 stands; `chapters/literature_review.tex` there
is still revision 3.

## T12 — figures built, 2026-08-03

Revision 4 pushed to Overleaf (`chapters/literature_review.tex`), commit
message "Literature review: style pass — remove AI writing patterns,
sentence-case headings". Bibliography untouched, so `ref_additions.bib` and
`main.tex` did not change.

Gate 4 (choosing final figure types) opened by the operator in the same turn.
Two figures built at `brain/drafts/figures/`, generator
`make_litreview_figures.py`, insertion points and captions in `INSERTION.md`.
Neither is pushed.

- `sbc_plane.pdf` — the SBC classification plane, both cutoff pairs, the
  Kostenko selection diagonal, and this estate's three venues. Recommended.
  It carries a geometric argument `sec:rw-rhythm` currently makes in prose,
  and the estate corroborates it: Beer Hall's ADI of 1.3267 falls inside the
  sliver between 1.32 and 4/3, so its LABEL flips from lumpy to erratic on the
  correction while SBA remains selected at all three venues. That is exactly
  the chapter's claim that the correction "changes how a venue is described,
  while the estimator choice ... is not in doubt either way."
- `hln_correction.pdf` — the Harvey-Leybourne-Newbold factor against window
  length, vanishing at n = h. Recommended. Pure literature, no project data.

The pipeline schematic named in the earlier T12 note was NOT built. The
chapter's structure is already stated in its opening paragraph and carried by
seven section headings; a box-and-arrow restatement would be a figure added to
meet a count. If a pipeline diagram is wanted it belongs in the methodology
chapter, describing the system rather than the chapter.

### Closes an open question from `ledger/citation_fixes.md`

That file flagged, and left unrun, a check on whether CV-squared was computed
zero-inclusive rather than conditional on demand occurring ("a very common
misimplementation"; would move every intermittency classification in the
project). **Checked and clean.** `eval/intermittency_diagnostic.py::_pattern`
does `sizes = size[occ]` before taking the coefficient of variation, so it is
conditional on occurrence, as Syntetos & Boylan specify. No discrepancy, so
nothing goes to `code_vs_paper.md`.

Separately: the ADI/CV-squared values quoted in `citation_fixes.md`
(BH 1.35/0.57, Ellel 5.63/0.98, TRT 1.18/0.61) are **stale**. The generated
report `eval/intermittency_L1.md` gives BH 1.3267/0.62, Ellel 5.9231/1.04,
TRT 1.1828/0.61 on the `nonzero_revenue` definition. The figure uses the
report, not the ledger note.

## T13 resolved, and the T12 blocker, 2026-08-03

### T13 — CLOSED

The scope inventory measured **150 words**, not the ~170 recorded earlier in
this file; that figure was stale. Rather than pad to the 200--400 target, the
paragraph now gathers the three limitations the chapter argues elsewhere but
never collected: the MASE-against-RMSSE tension (`sec:rw-ruler`), the
uncomputed expected calibration error (`sec:rw-evaluation`), and the
unquantified sampling uncertainty on the inter-demand interval
(`sec:rw-rhythm`). Each is a cross-reference, not a restatement. 250 words,
inside the target, and the inventory is now genuinely consolidated, which is
what T13 asks for.

Pushed as "Literature review: consolidate the limitations inventory (T13)".
Verified by readback: remote and local are **byte-identical**, SHA256
`1a84c36db1689194`, 65,381 bytes. Preprint-marker arithmetic re-checked after
the edit and still exact: 1 + 3 + (7 + 1) = 12, matching the chapter's own
claim. 90/90 citation keys, all numbers, all labels, all refs resolve.

`write_section` was NOT used, per the standing rule in
`ledger/overleaf_incident_2026-07-31.md`: reconstruct and write whole.

### T12 — BLOCKED on a tool limitation, not on judgement

The two figures are built and correct. They cannot be pushed from here:

- `mcp__overleaf__write_file` takes string content, so a binary PDF cannot be
  uploaded through it, and the project has no `figures/` directory or any
  image file today.
- The SVG route is dead: `main.tex` does load `\usepackage{svg}`, but
  `\includesvg` needs Inkscape, which is absent locally and on Overleaf.
- The TikZ/pgfplots route would be text and therefore pushable, but there is
  no local TeX toolchain (`pdflatex`, `latexmk`, `tectonic` all absent), so
  the figure code could not be compiled or seen before pushing. Pushing
  unverifiable figure code into a thesis is worse than pushing none.

**The remaining step is manual and takes about a minute:** upload
`brain/drafts/figures/sbc_plane.pdf` and `hln_correction.pdf` to a `figures/`
folder at the Overleaf project root, then paste the two figure environments
from `brain/drafts/figures/INSERTION.md`. No preamble change is needed;
`graphicx` is already loaded. Until the files exist, the figure LaTeX must NOT
be pushed, because `\includegraphics` on a missing file fails the build.

### Still open on this chapter

- **T8 (blocking, PARTIAL).** The 17 added or newly-activated citations were
  verified with verbatim quotes. The remaining pre-existing citations rest on
  the 2026-07-30 `citation_audit.md` two-pass verification, not a fresh check.
  Closing it means re-verifying roughly seventy citations through NotebookLM.
  Unchanged by revisions 4 and 5, which touched no citation.
- **`ding_proactor_2026`.** Still `@article` with no `journaltitle`, so it
  typesets as a journal article with no venue. The fix is a one-entry edit in
  `ref.bib`, which the separate-resource approach deliberately cannot reach.
  Manual, in the Overleaf editor.

## T8 verification pass, 2026-08-03 — four errors found and fixed

Run against NotebookLM notebook `d565d5f0` (113 sources) plus direct
full-text retrieval where the notebook could not serve a source.

### Source coverage first

Mapping all 90 citation keys against the notebook found exactly two gaps:

- `diebold_comparing_1995` — **absent from the notebook entirely.** Added this
  session (`sas.upenn.edu/~fdiebold/papers/paper68/pa.dm.pdf`).
- `ancker_effects_2017` — the europepmc source sits at status 3, the only
  non-ready source in the notebook. BMC and PMC both refuse ingestion
  (Springer auth wall; PMC returns a reCAPTCHA page, which NotebookLM
  helpfully ingested as a source titled "Checking your browser - reCAPTCHA" —
  **that junk source should be deleted**). Verified instead by direct
  retrieval of the EuropePMC REST full text for PMC5387195.

### Errors found

1. **`ancker_effects_2017` — wrong statistic.** The chapter said "the
   \emph{odds} ... fell by about 30\%" and called them "odds ratios from a
   multivariable model fitted over the full set of alerts". The paper reports
   **incident rate ratios** (0.70 and 0.90) from a **negative binomial model of
   clinician-level acceptance rates**. Its own table note: "An IRR (incident
   rate ratio) is the ratio of 2 rates and is interpreted similarly to a
   relative risk or odds ratio." Two errors: the quantity, and the unit of
   analysis (clinician-level, not alert-level). FIXED.
2. **`ding_proactor_2026` — no longer unrefereed.** Published at ACL 2026,
   Volume 1 Long Papers, pp. 18257--18303. Marker removed; preprint accounting
   corrected from 12 to 11 (= 1 + 3 + 7). The sentence "every result in the
   next two paragraphs is a preprint or an unrefereed submission" was false
   even before this (three adjacent systems carry no marker) and is now
   rewritten. FIXED.
3. **`chae_value_2024` — misrepresented.** The chapter said deep models on
   internal features match or beat ML models with external data, "so the
   marginal value of additional data is smaller than practitioners assume".
   The paper's own conclusion is the opposite in general: "We found a
   significant enhancement in forecasting accuracy by integrating external
   macroeconomic and pandemic-related variables, particularly with the ML
   models." The DL-beats-ML result holds in the **turbulent** period only; in
   the stable period adding external features improved DL by 17/22/45%. Now
   stated conditionally, with the paper's practical recommendation as the part
   this work actually inherits. FIXED.
4. **`makridakis_m5_2022` — wrong number.** The chapter said 77.3% of series
   have ADI above 4/3. Product-store level: 22,339 intermittent (73%) + 5,206
   lumpy (17%) = **90%**. Across all 42,840 series: 77.9%. 77.3% matches
   neither. Restated exactly. FIXED.

### Confirmed correct under challenge

NotebookLM gave a WRONG answer first on two of these and retracted when
pushed for verbatim text. Do not accept its first answer on a number.

- TimesFM ">25% over a language-model prompting baseline" — first reported
  NOT SUPPORTED; the paper says verbatim "improves on llmtime's performance by
  more than 25%". Chapter correct.
- Staufer 135/240 safety fields — first "corrected" to 133 by summing figure
  labels; the paper states "most safety-related fields (135/240) have no public
  information available". Chapter correct.
- TSB-AD 1070 series — first "not in sources"; it is in the abstract. Chapter
  correct.

Also verified SUPPORTED with verbatim quotes: Schmidt sMAPE figures, Hossain,
Chronos 27/42 + WQL/MASE, Tan ablations, Kostenko constants and diagonal,
Syntetos $1-\alpha/2$, Chatfield all-zero, Brigato 8/14/~5000, Hewamalage rank
stability, Harvey correction formula, Hansen MCS, tau-bench 35.2%, Lu
6790/233/51.85/64.73/66.47/91.80, PRISM 66.47→86.61 and 50.22→22.94, Tang
28000/500h, Zheng 85 vs 81, Hancock correlational vs experimental split, Dixon
32 participants.

### T8 status: ADVANCED, NOT CLOSED

Roughly 30 of 90 cited works had their chapter claims checked against source
text this session, chosen as the numeric and attributive claims that carry
argumentative weight. The remainder are cited for framing rather than for a
specific number, and still rest on the 2026-07-30 `citation_audit.md` pass.
T8 as written ("every factual claim ... this session") is therefore still not
satisfied, and the honest statement is that the load-bearing quantitative
claims now are.

## T8 second pass, 2026-08-03 — the remaining 60 keys

Route: NotebookLM first (per the standing preference), Zotero full text /
semantic search wherever the notebook could not serve the source. Every claim
below was settled on verbatim source text, not on a summary.

### Corrections found

1. **`hertel_explainable_2026` — rounding that flattered the argument.** The
   chapter said temperature took "about 4\%" of the attribution and irradiance
   "about 3\%". Table 3 (Chronos-2 column) reads **Temperature 3.55\%,
   Irradiance 2.74\%**, load history 89\%. Rounding 3.55 up to 4 while rounding
   2.74 down to 3 widens a 0.8-point gap into a 1-point one in the direction
   that suits the surrounding sentence. Restated exactly: 89\% / 3.6\% / 2.7\%.
   Prepared in `push5.tex`; not yet pushed.

No other error found in this pass.

### Where NotebookLM failed and Zotero settled it

The notebook returned NOT IN SOURCES or a wrong verdict on six claims that are
in fact fully supported. Zotero full text confirmed every one:

- `kim_towards_2022` — "we can always obtain the F1PA close to 1 by changing
  delta-prime"; Case 1 (uniform random score) scores F1PA 0.969 / 0.965 / 0.931
  / 0.961 against SOTA, the SMD dataset being the stated exception. The
  chapter's "most state-of-the-art results" is exactly right.
- `parasuraman_humans_1997` — the Zotero PDF is an unOCR'd ProQuest scan, but
  the abstract carries it verbatim: "Disuse, or the neglect or underutilization
  of automation, is commonly caused by alarms that activate falsely."
- `kolassa_why_2020` — verbatim: "there are different functionals of central
  tendency of a distribution, such as the mean, the median and the (-1)-median".
- `ansari_chronos-2_2025` — verbatim: "the time attention layer aggregates
  information across patches within a single time series, while the group
  attention layer aggregates information across all series within a group at
  each patch index."
- `angelopoulos_conformal_2023-1` — verbatim: "It treats the system for
  producing prediction sets as a proportional-integral-derivative (PID)
  controller."
- `zou_poisonedrag_2025` — verbatim: "inject a few malicious texts into the
  knowledge database of a RAG system to induce an LLM to generate an
  attacker-chosen target answer".

This is the third session in which NotebookLM's first answer on a specific
claim was wrong. Treat it as a search index, not as an oracle.

### Confirmed correct, this pass

das_-context_2025 (up to 25\%, rivals explicit fine-tuning, no gradient
updates), liu_generative_2024 (MAE reduction 5.75\% avg -> chapter's "about
6\%"), hollmann_accurate_2025 + hoo_tables_2026 (11M params, up to 10,000
samples), angelopoulos_conformal_2023 (two-sided bound 1-alpha to
1-alpha+1/(n+1)), barber_conformal_2023 (TV-distance bound, no assumption on
the joint distribution), zaffran_adaptive_2022 (efficiency degrades linearly in
gamma on exchangeable scores), xu_conformal_2021 (mixing errors, sliding-window
residuals, no refit), sun_conformal_2025, wickramasuriya_optimal_2019 (minimum
trace among unbiased linear reconciliations), panickssery_llm_2024,
wang_large_2024, bavaresco_llms_2025, gulati_ask_2026 (goal clarification loses
nearly all value after 10\% of execution, input clarification through ~50\%),
trinh_hil-bench_2026 (Ask-F1), gorry_framework_1971, meyer_conceptual_2004,
lee_trust_2004, parasuraman_complacency_2010, paleyes_challenges_2022,
haben_short_2019 (temperature often detrimental), hewamalage_look_2021,
park_generative_2023 (importance-sum threshold, 150 in their implementation),
hu_memory_2026, montero-manso_principles_2021, siffer_anomaly_2017,
truong_selective_2020, page_continuous_1954 (ARL as the false-alarm/delay
trade), adams_bayesian_2007, zhou_context-driven_2025, guo_calibration_2017,
kolassa_evaluating_2016, cini_graph-based_2024, bhattacharya_towards_2024,
gim_evaluation_2023, kumar_agentic_2026, cragg_statistical_1971,
mullahy_specification_1986.

`kolassa_we_2023`: my own probe overreached ("never coherent" for both MAE and
MAPE); the paper says MAPE-optimal are *never* coherent and MAE-optimal are
*usually* not. The chapter already says "usually not coherent". No change.

### Bib hygiene

`angelopoulos_conformal_2023` and `angelopoulos_conformal_2023-1` are NOT a
duplicate: the first is the Gentle Introduction monograph, the second is
Conformal PID Control (NeurIPS 36). The suffixed key is correct as it stands.

### T8 status: CLOSED

All 90 citation keys have now had their chapter claims checked against source
text. Two passes, 2026-08-03: the first covered ~30 keys and found four errors
(Ancker, ProActor, Chae, M5); this one covered the remaining ~60 and found one
(Hertel rounding).

### Figure follow-up (T12)

`sbc_plane.pdf` was regenerated venue-free at 17:31 on 2026-08-03, AFTER the
copy on Overleaf was uploaded. The remote binary is very likely still the
WITH_VENUES version, and `write_file` cannot push a PDF. The uploaded file must
be replaced by hand from `brain/drafts/figures/sbc_plane.pdf`.

## Figures replaced, 2026-08-03 — pedagogical out, synthetic in

Both earlier figures dropped. `sbc_plane` and `hln_correction` each illustrated
a formula the prose already states; neither said anything about the literature
as a body. They existed largely because T12 asked for figures, which is a
whole-thesis rule doing a chapter's thinking for it — the same error the
operator caught on the venue data.

Replaced by one synthetic figure, `fig:gap-map` (`gap_map.pdf`): the surveyed
proactive systems positioned on intervention policy (rows) against what their
decisions are scored against (columns). Both axes are lifted from
`sec:rw-synthesis`'s own sentences, so the figure asserts nothing the prose does
not. Nine systems occupy the bottom-left; the top-right cell — operator-elicited
cost ratio with measured gate calibration, scored against the operator's own
accept-or-dismiss decisions — is empty, and that emptiness IS the gap claim.

Peer-review status deliberately not encoded: the chapter marks preprints
per-citation but leaves liu_proactiveeval, yang_contextagent and yang_fingertip
unmarked, so a filled/hollow encoding would assert a status not established.

`push6.tex` holds the whole file: both figure environments and both `\ref`
sentences removed, new figure + `\ref` added, 67,389 bytes, one figure / one
ref / one label, braces balanced. Awaiting the push gate. The operator must also
upload `gap_map.pdf` and delete the two dead PDFs — `write_file` is text-only.

Also folded in: the operator applied the Hertel correction directly in Overleaf,
keeping "roughly nine-tenths ... about 3.6\% ... about 2.7\%". Accurate; kept
their wording rather than mine.

**Pushed 2026-08-03.** `chapters/literature_review.tex`, 67,389 bytes.
Readback verified byte-identical to `push6.tex`, SHA256
`4e6e62188045880873f24736de4a0ed1f82cc452a0a2f184fd2b10d809285417`. Both old
figure environments gone, `fig:gap-map` in and referenced. Note: the first
write attempt was blocked by the permission classifier, and the call it blocked
was malformed — it carried only the opening paragraph, so it would have
destroyed the file. Never assemble a whole-file write by hand; read the prepared
file and pass it entire.
