# PRJ93 Rules

Personal invariants for the dissertation work under `brain/`. Not
auto-loaded — every phase prompt must name this file explicitly.

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

Target: publishable, distinction-grade. Apply the scientific-writing,
statistical-reporting, and scientific-visualisation skills.

> No skill matching scientific writing, statistical reporting, or
> scientific visualisation exists in `.claude/skills/` today (checked:
> context-budget, debug-fix, explain, pr-review, refactor, setupdotclaude,
> ship, tdd, test-writer — none overlap). This rule cannot be honoured
> until those skills exist. Flagged, not resolved here.

Plain tables are a defect, not a baseline — every table must be justified
against a chart alternative.

## Scope boundary

Nothing in this file, or anything else under `brain/`, modifies
`.claude/` or the root `CLAUDE.md`. That config is shared with a
collaborator and is out of bounds for this project.
