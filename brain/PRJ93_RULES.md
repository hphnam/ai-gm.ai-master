# PRJ93 Rules

Personal invariants for the dissertation work under `brain/`. Not
auto-loaded — every phase prompt must name this file explicitly.

## Where the open work is

`brain/ledger/BLOCKED_third_party.md` is the single retrieval point for everything
still open. As of 2026-08-06 that is seven rows, every one blocked on a named third
party, plus two gated Further Work items. Read it before planning anything; do not
re-derive the list from `literature_conformance.md`, which records history rather
than state. When a blocker clears, that file says what already exists and what to
run, and D-U3 carries a falsifiable prediction to check the account against.

## Conflicts — unresolved

None identified between the rules below and the root `CLAUDE.md`.

## Token discipline (non-negotiable)

- Never read a `.tex` file end-to-end. Use `grep -n` to locate sections,
  then read bounded line ranges (offset/limit). Log which ranges you read.
- Never read more than 3 files at full length in one session. If a task
  needs broad reading, delegate it to a subagent and require the subagent
  to return under 400 lines of findings.
- Consult the graphify map before reading source — see root `CLAUDE.md`
  (graphify section) for the query/path/explain commands and precedence
  order. Read source files only when the map is insufficient.
- Any analysis longer than 40 lines gets written to a file under
  `brain/knowledge/` or `brain/ledger/` immediately, not held in context.
- End every session by appending to `brain/ledger/phase_state.md`: phase
  id, what was completed, what artifacts were written, what is unstarted.

## Verification rules

- No factual claim about a cited paper without a NotebookLM query first
  (notebook `d565d5f0-9ad6-446f-9573-2316a2f8c0ca`). Memory is not a
  source.
- No citation key used without confirming it exists in Zotero. New papers
  are pushed to Zotero by me (the agent), never handed to Phuong to add.
- No number written into the dissertation without tracing it to the
  matching `brain/log/*result*.md` file. Cite the result file path in a
  LaTeX comment next to the number.
- When a paper has released code, compare it against the paper's prose
  claims and record any discrepancy in `brain/ledger/code_vs_paper.md`.

## Human gates

Stop and ask before:
- changing the methodology
- dropping or adding a cited paper
- rerunning any experiment
- choosing final figure types
- pushing any file to Overleaf

Present each decision compactly with a recommendation and wait. Do not
batch multiple gates into one question.

## Writing standard

Target: publishable, distinction-grade. Apply the installed skills that
match the task:

- `scientific-writing` — drafting or revising any prose section.
- `statistical-reporting` — any test selection, assumption check, or
  results-section number.
- `scientific-visualization` — any figure.
- `literature-search` — search strategy, screening, synthesis; pairs with
  `literature-review-writer` for the background section.
- `hypothesis-formulation` — stating hypotheses or experimental
  predictions.

## Rubric compliance (every write-up section)

No section is written or revised without first re-reading what the
marker expects of it. Three sources, all authoritative:

- `brain/docs/Student Documentation - MSc DS - Dissertation Submission.md`
  — the submission requirements as issued.
- `brain/knowledge/00_marking_criteria.md` — the same rubric converted
  for working use. Use this for the per-section criteria.
- the `ds-writing` skill — Lancaster FST writing guidance: chapter
  structure and balance, critical vs descriptive prose, source
  integration, figure/table captioning.

Before drafting a section, name the criteria it must satisfy. After
drafting, trace back: for each criterion, point at the passage that
meets it. A section that cannot be traced is not finished. Descriptive
knowledge-telling that hits the word count still fails — `ds-writing`
diagnoses this, so run it on any chapter that feels thin.

## Overleaf pre-flight

Every file bound for Overleaf gets an AI-writing pass before it goes:
run `humanizer` and `avoid-ai-writing` over the text and clear the
findings. This is part of the Overleaf human gate above — present the
cleaned text, not the raw draft.

Plain tables are a defect, not a baseline — every table must be justified
against a chart alternative.

## Scope boundary

Nothing in this file, or anything else under `brain/`, modifies
`.claude/` or the root `CLAUDE.md`. That config is shared with a
collaborator and is out of bounds for this project.
