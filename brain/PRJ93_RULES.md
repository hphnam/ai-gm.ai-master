# PRJ93 Rules

Personal invariants for the dissertation work under `brain/`. Not
auto-loaded — every phase prompt must name this file explicitly.

## Where the open work is

`brain/ledger/BLOCKED_third_party.md` is the single retrieval point for everything
still open. Read it before planning anything; do not re-derive the list from
`literature_conformance.md`, which records history rather than state. When a blocker
clears, that file says what already exists and what to run.

**No counts are repeated here on purpose.** An earlier version of this section said
"seven rows plus two gated Further Work items" and was already wrong by one when it
was next read. The owning file carries the numbers; this section carries only the
pointer.

## Session lifecycle — both ends, every time

Nothing that a future session would have to re-derive may exist only in a
context window. Context is lost on compaction, on a crash, and at the end of
every run, and none of those give warning. So the two persistent stores are
written at **both** ends of a session, not just at the close.

**At the start, before planning anything:**

1. `mcp__agentmemory__memory_recall` on the topic of the first request. Recall is
   BM25 unless embeddings are configured, so query with concrete keywords — file
   names, error strings, row ids like `D-U3` — not prose.
2. `graphify query "<question>"` to orient before reading source. The map is the
   first move, raw files the second.
3. Read `brain/ledger/BLOCKED_third_party.md`. That is the state; `phase_state.md`
   is history and will mislead if read as current.

Recall returns what was true when it was written. If a memory names a file, a
flag or a function, confirm it still exists before acting on it.

**Mid-run, not deferred to the close:** the moment a `brain/log/*result*.md` lands,
or a decision is taken that cost real work to reach, save it. A conclusion held
back for a tidy end-of-session write-up is a conclusion gambled on the session
ending tidily. This is the rule that stops information being dropped mid-run.

**At the close, all four, in this order:**

1. `mcp__agentmemory__memory_save` for the durable conclusions: what was decided
   and why, what was ruled out and on what evidence, what a blocker actually is.
   Not activity — the hooks capture that.
2. `graphify update .` after any code change, so the map does not go stale between
   runs. Run `graphify label` as well when the community set has shifted and the
   names will be read.
3. Append to `brain/ledger/phase_state.md`: what was completed, what artefacts were
   written, what is unstarted, and the verified end state — heads, row counts,
   artefact paths. This is the only place that requirement is stated.
4. Commit, and confirm the working tree is clean. An uncommitted correction is
   indistinguishable from one that was never made.

**`brain-construction-local` is a local branch and Overleaf is the publication target.**
`git push` happens on explicit instruction only — the branch has run many commits ahead of
`origin` for whole phases, and that is the intent rather than a backlog. "Push it" in this
project means push to Overleaf. Stated here so it stops being re-inferred once a session.

### The Overleaf write path is git — adopted 2026-08-07

The Overleaf project is cloned as a **sibling** of this repo, at
`/Users/hapuna/Downloads/prj93-overleaf` (remote `git.overleaf.com/6a11ac2180bb716e3c2491c4`).
It is a separate history and is deliberately **not** a submodule, subtree or subdirectory of
`ai-gm.ai-master`: merging the two would recreate exactly the confusion this move removes.

| | Rule |
|---|---|
| **Writes** | **All edits go through git.** The Overleaf web UI is for compiling and reading only. Two writers produce `.tex` conflicts, and the conflict surfaces as a corrupted section rather than as an error. |
| **Verification** | `git diff` and `git status`, **not** a full remote read-back. A diff is the artefact-level check the rules already demand; a read-back of 40 kB compared by eye is not a check. |
| **The MCP bridge** | Retained for **reading and status only** — `list_files`, `get_sections`, `read_file`, `status_summary`. Not for writes. |
| **Before every push** | `brain/scripts/latexcheck.py` runs on the clone and **its output is reported**. A push whose compile was not reported has not been pre-flighted. |

**`write_section`'s known hazard stops being a hazard once writes are diffs.** The
2026-07-31 incident (`ledger/overleaf_incident_2026-07-31.md`) recorded that `write_section`
replaces through to the next same-level heading and **silently deletes nested subsections**.
That failure mode exists because the tool rewrites a span it infers. A git diff shows every
line that changes before it is committed, so a silent deletion becomes a visible `-` block.
The tool is not banned because it is dangerous; it is retired from writing because the diff
is strictly better evidence.

**Build artefacts are not committed.** `main-words.sum` is produced by `\quickwordcount`'s
`\write18` on every compile and must stay untracked; the build directory lives outside the
clone entirely (`--outdir` into the scratchpad), so a compile never dirties `git status`.

### Compile and push — one lifecycle, not two optional halves

**This is a lifecycle rule, not a suggestion.** It applies to every change to a `.tex` file,
a float body, or the preamble.

1. **Compile before pushing.** The change goes through `brain/scripts/latexcheck.py` on the
   clone *before* it is pushed. **A clean `latexcheck` is the precondition for a push, not a
   courtesy.** A push whose compile was not run is unpre-flighted; a push whose compile was
   run and not reported is unverified, because the run is only evidence once someone can read
   what it said.
2. **Compiling locally does not end the work.** A change that compiles locally and is **not
   pushed** leaves Overleaf holding a state that may not build at all. That is not
   hypothetical: `fig_pipeline`'s `out`/`outb` key collision sat on Overleaf in a
   non-compiling state while the fix sat in an unpushed local commit. **Overleaf is the
   publication target and the only render a marker ever sees.** Local green plus unpushed
   equals a broken document, not a fixed one.
3. **Report both halves.** What `latexcheck` said locally, *and* that the push landed —
   confirmed against the remote, not assumed from a command that appeared to succeed.
   **Either without the other is an incomplete report.** "It compiles" and "it is pushed" are
   two different claims and neither implies the other.
4. **Tier 2 does not speak for tier 3.** Agreement between the local toolchain and Overleaf is
   **UNVERIFIED** until Overleaf's TeX Live year is known — see `BLOCKED_third_party.md` §F.
   Until then **no local compile result may be stated as a claim about the target render.**
   Write "compiles under TeX Live 2026 locally", never "compiles".

**A push is verified against the remote, not against the exit code of `git push`.** Confirm
`git ls-remote --heads origin` carries the expected commit and that `origin/<branch>..HEAD` is
empty. The stronger form, and the one to use after any change that touched a float body or
the preamble, is to **clone the pushed state fresh and compile that** — which is the only
check that answers "does the state Overleaf now holds actually build", as opposed to "did the
state I had before pushing build". This project has already had an artefact damaged between a
verified run and the file on disk; a push is exactly such a gap.

### The three stores must agree

Each answers a different question, and drift between them is how a later session
gets a wrong answer confidently. Keep the division sharp:

| Store | Authoritative for | Never use for |
|---|---|---|
| `BLOCKED_third_party.md` | what is open **now**, and what unblocks it | history; it is rewritten, not appended |
| `phase_state.md` + `Decision_and_Resolution_Log.md` | what happened and why, in order | current state; entries age out of truth |
| agentmemory | cross-session recall of decisions, traps and constraints | anything the repo already records |

When a fact changes, change it in the store that owns it and correct the others by
pointing at that store rather than by restating the fact in each. A number
duplicated across three files will be updated in one of them.

### Any claim that something is OPEN gets verified before it is reported

**This is a hard step, not a disposition.** A claim that something is open, unresolved,
unrun, blocked, still waiting or never decided is checked against **both** owning stores
before it reaches Phuong or a plan:

1. `brain/ledger/BLOCKED_third_party.md` — §F carries the open-row counts.
2. `brain/log/Decision_and_Resolution_Log.md` — read the **tail**. A decision row appended
   after a `phase_state.md` entry supersedes it, and the log is the only file that records
   the supersession.

If the two disagree with the source of the claim, the stores win and the claim is wrong.

**The rule exists because it was broken.** On 2026-08-06 the ruler conflict
(`harness.REPORTED_BASIS` against `config.VENUE_SCALE_BASIS`) was reported as the highest
-priority open blocker, gating a figure programme and a day of compute. It had already been
ruled and executed — decision row **87**, Gate A, with `log/70` recording the migration
completing. The claim came from `phase_state.md:1794-1804`, which records the conflict as
open because that is what was true when the line was appended. `BLOCKED_third_party.md` §F
already read *"Open rows not blocked on a third party: 0"*. The check that would have caught
it took seconds and was not done.

**Subagent findings of this shape do not pass through unchecked.** A subagent reporting an
item as open has almost always read a history file, because history files are longer, more
specific and easier to grep than the one-line state a status file carries. Verify before
relaying, and say in the subagent's prompt which store owns the answer.

This will recur in 8C, where *"this was never decided"* is a claim that arrives constantly —
about a rejected alternative, a naming choice, a float disposition. Most of the time it is
`phase_state.md` being read as state, and the answer is in `05_paper_architecture.md` §7 or a
decision row.

### Corrections are appended, never overwritten

Where a later finding supersedes an earlier one, record the correction with what it
supersedes and why. `log/73` §4 and decision rows 101 and 106 are the pattern. A
silently revised claim leaves a reader unable to tell a verified statement from a
lucky one.

**A withdrawal is retracted everywhere the claim was ASSERTED, not only where it was
RECORDED.** Those are different sets, and the second is usually the smaller one. On
2026-08-07 the claim that the word counter was *"calibrated to 0.14 %"* was withdrawn in
`phase_state.md` — and was still sitting in `brain/scripts/wordcount.py`'s own docstring
hours later, where the next reader would actually meet it. The ledger had the retraction;
the tool had the claim. **On withdrawing anything, grep for the claim rather than for the
file you wrote it in**, and fix the copies in code comments, docstrings, captions and
`README`s, which are the copies a reader reaches first.

### A fix is verified by inspecting the artefact, never by the exit code

**An exit code reports what a script decided. It does not report what the script left on
disk, and those come apart precisely when something has gone wrong.** After any change to a
generator — a guard, a basis, an output path, a stamp — open the artefact and check the thing
that was supposed to change, plus one thing that was not.

**The rule exists because it was broken twice in one session, in opposite directions.**

- `eval/agent_eval.py` was given a guard refusing a `--scaled` run without the VUS-PR
  library. The guard sat inside the `if args.scaled` block, by which point `_write_report`
  had already truncated the scaled section — so the guard returned a correct non-zero exit
  **after destroying the artefact it existed to protect**. The exit code was right and the
  file was gone. Found by opening the file.
- The same script, run in the wrong venv, exited **zero** having replaced a seven-cell
  headline table with a "dependency unavailable" notice, leaving the other 272 lines intact.
  A green run and a damaged artefact.

A third form appeared later, in a shell rather than a script. A `&&` chain began with a
`git mv` that failed; the heredoc behind it — the one that folded the retrofitted F1 into
`figure_proof.tex` — therefore never ran. **The chain reported the failure honestly and the
proof silently kept the stale figure.** Nothing was destroyed and nothing exited zero; the
step simply did not happen, and every downstream statement about the proof was made about a
file that had not changed.

The operational form is the same in all three cases and is worth stating as a method rather
than as a warning: **confirm a change by searching the artefact for the specific thing that
was supposed to change.** Not "did the command succeed" — grep the new axis coordinate, the
new stamp, the new row. A command reports what it attempted. Only the artefact reports what
is there. That grep is what caught the `git mv`.

Corollary: **`git diff` on a regenerated artefact is part of the run, not an optional check
afterwards.** A regeneration whose diff nobody read has not been verified, whatever it
printed.

### A number that enters a decision comes from an instrumented tool, never an ad-hoc script

**Ad-hoc measurement scripts have been wrong twice, and both times in the direction of the
number that was about to be acted on.** Both were caught the same way: by building the real
tool and watching it disagree with the throwaway one.

- The scratchpad word counter stripped LaTeX comments with `%.*`, which also matches an
  **escaped** `\%`, truncating every line quoting a percentage. Chapter 2 read 4,893 instead
  of 4,948 — and the overrun was about to be accepted at the lower figure.
- The one-off script measuring the counter's own over-read added equation-environment words to
  *all* label words, double-counting the labels that sit **inside** equation environments.
  Methods' artefact read 98 instead of 92, and that figure was already in a report.

The failure is structural, not careless. A script written to answer one question is written
once, read once, and never given a case whose answer is known independently — so its only
test is whether the number looks plausible, and a number that looks plausible is exactly what
a defect of this kind produces.

**The rule: any number entering a decision, a hand-off or the dissertation goes through a
committed tool with a fixture.** The fixture carries the awkward constructs — escaped
percents, comments, inline and displayed maths, citations, captions — and its expected value
is derived **by hand, cell by cell**, before the tool is run. `brain/scripts/wordcount.py` is
the worked example. A one-off script is fine for orientation and never for a figure someone
will act on.

Corollary, and it is the same failure as the exit-code rule: **cell-by-cell, not aggregate
against aggregate.** One total compared to one other total cannot detect a defect that moves
both the same way — see the withdrawn "0.14 %" calibration above.

### A clean result is reported with the scope of the check that produced it

**State what a check establishes and, in the same breath, what it does not.** This matters
most when the answer is clean, because a clean result invites the reader to generalise it and
a narrow check gives them nothing to stop on.

The rule exists because it was broken twice, in the same shape both times:

- The R0 triage verified 20 of 22 artefacts against the **store ceiling** and was reported as
  "verified fresh". Freshness against the store and provenance under a numerics regime are
  different properties, and a later sweep found 14 artefacts carrying no environment
  identity at all. One verdict was given where two were needed.
- The B0 error was the same failure earlier: `phase_state.md` answers *what happened*, and it
  was used to answer *what is open now*.

The operational form: when a check comes back clean, write the sentence as "X reproduces
under Y" — naming the condition — rather than "X is verified". If the condition cannot be
named, the check has not been characterised well enough to report. See `log/78` Part 1 for
the worked example: the artefacts reproduce **under the regime `log/61` identifies as
committed**, which is not the same claim as the regime question being closed.

## Conflicts — unresolved

None identified between the rules below and the root `CLAUDE.md`. The session
lifecycle above **reinforces** the memory rule in `.claude/rules/memory.md` rather
than competing with it: that file already requires recall at the start and save at
the end, and this one adds graphify to both ends, adds the mid-run save, and fixes
which store owns which fact. Nothing here modifies that file — see Scope boundary.

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
- The `phase_state.md` write-up at session end is specified once, under
  Session lifecycle. It is not restated here, because a requirement written
  in two places is a requirement updated in one.

## Verification rules

- No factual claim about a cited paper without a NotebookLM query first
  (notebook `d565d5f0-9ad6-446f-9573-2316a2f8c0ca`). Memory is not a
  source.
- **The rule above covers what a paper says. It does not cover venue, date
  or peer-review status, and those are what a marker checks first.** A
  bibliographic claim needs the venue of record — the publisher, DOI or
  proceedings entry — not the arXiv page. An arXiv posting does not mean a
  paper is unpublished: Ye et al. was called a preprint here and is a
  peer-reviewed NeurIPS 2025 paper (decision row 104).
- No citation key used without confirming it exists in Zotero **and is not
  in the trash**. `zotero_search_items` returns trashed items, and the Web
  API only reveals `deleted` if that field is inspected; a whole session was
  spent editing a discarded duplicate on the strength of that (row 106).
  Check `deleted` before editing any item reached via search.
- **A null from `zotero_search_by_citation_key` is not evidence of absence.**
  In web/hybrid mode that tool resolves a key only by scanning the `Extra`
  field for a `Citation Key:` line, so it finds *only* keys that were pinned
  by hand — everything else returns "No item found" whether or not the item
  exists. Four live keys came back null in one session on 2026-08-07
  (`montero-manso_principles_2021`, `fu_prism_2026`, `meyer_conceptual_2004`,
  `hewamalage_forecast_2023`) and all four were then confirmed present by
  title lookup. **Confirm with `zotero_search_items` on the title before
  acting on a null**, and never record a MISSING-KEY verdict, delete a
  citation or re-add a paper on the strength of one. The same fact makes the
  tool useless as a completeness check: a clean sweep with it proves only
  that the pinned subset is pinned.
- New papers are pushed to Zotero by me (the agent), never handed to Phuong
  to add. Pin the citation key in both the native `citationKey` field and an
  Extra `Citation Key:` line, so a Better BibTeX re-export cannot regenerate
  a different key and break a citation that already compiles. Pinning is also
  what makes `zotero_search_by_citation_key` work on that item at all — see
  the rule above.
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

### Geometry a generator can check is not left to a render

A figure's layout has two kinds of defect. One needs eyes — is the line too faint, does the
ordering read. The other is **arithmetic**: a 2.45 cm label on 1.885 cm centres overlaps its
neighbour by 0.565 cm whatever text it holds, and no amount of looking is needed to know it.

**Compute the second kind and assert it in the generator.** `figures/fig_blocks.py` refuses
to write when two labels overlap or when any node sits left of the picture origin, because
both were missed twice: once by eye and once by reasoning about the figure instead of about
its coordinates. Fixing a label's vertical overflow by moving it outside its bar left the
horizontal overlap untouched, and the fix read as complete because the thing it was compared
against was the previous defect rather than the geometry.

The general form: **when a fix moves an object, re-derive every constraint the object was
subject to, not the one that prompted the move.** That failed twice in a row on one figure:
moving the labels out of the bars fixed vertical overflow and left horizontal overlap
untouched; narrowing the labels then fixed the overlap and pushed the vertical extent back
through the time axis. Each fix was checked against the defect that prompted it.

**The assertions have a hard boundary, and it must not be mistaken for coverage.** A
generator can check what it computes: horizontal spans, node coordinates, whether anything
sits left of the origin. It **cannot** check anything downstream of line breaking — how many
lines a label wraps to, and therefore how far down the page it descends, depends on font
metrics and TeX's decisions that the generator never sees.

**There are three tiers, not two.** The two-tier version of this table assigned vertical
extent, overfull boxes and glyph collision to *"the compile, and only the compile"* — which,
while no compiler existed here, silently meant *"Phuong's Overleaf run, and only that"*. A
local TeX Live installation (2026-08-07) makes the middle tier mine to run, and the boundary
has to say so or the checks will keep being deferred to a human.

| Tier | Verifies | Instrument | Run by |
|---|---|---|---|
| 1 · generator | horizontal geometry: spans, overlap, inter-node clearance, origin placement | `figures/_tikz_assert.py`, asserted on every write | the generator, unattended |
| 2 · local compile | **everything downstream of line breaking**: vertical extent, overfull/underfull boxes, glyph collision, float placement and loss, undefined refs and citations, appendix lettering, list-of-figures short titles | `brain/scripts/latexcheck.py` | me, before every push |
| 3 · Overleaf | the **target** rendering — the artefact a marker actually opens | Overleaf's own compile | Phuong |

**Tier 2 is a pre-flight and not the target.** It is a different TeX Live year from Overleaf's
until the two are confirmed equal, and this project has already been bitten by exactly that
class of split (numpy 1.26 against 2.5, `log/78`). A tier-2 pass licenses a push; it does not
license a claim about what the marker sees. Where the two disagree, **Overleaf wins** and the
disagreement itself is the finding — record it rather than re-running until one agrees.

A green tier-1 run means the geometry it can compute is sound. It says nothing about tiers 2
and 3, and both remaining F1 defects lived in tier 2.

**An assertion nobody has seen fail is an assertion taken on faith.** Before relying on a
guard, feed it the violation it exists to catch and watch it raise. `figures/_tikz_assert.py`
was exercised against an overlap, a sub-minimum gap, a non-adjacent reach past an immediate
neighbour, an out-of-extent box and a negative-x node before any figure was built on it.
This is the exit-code rule generalised: a guard that returns quietly is reporting what it
decided, and until it has failed once you do not know it can.

**Assert against the target's geometry, not the harness's.** `fig_blocks.py` computed its
clearances against the compile proof -- 11pt `article`, landscape, 15 mm margins -- while the
document is 12pt `report` with `\linespread{1.5}` and a 150 mm text width. The clearances
survived, but the reported margin was wrong by a third, because at 12pt with 1.5 leading a
two-line `\scriptsize` label is about a quarter taller. A check run against a convenient
geometry is a check against a document that does not exist.
