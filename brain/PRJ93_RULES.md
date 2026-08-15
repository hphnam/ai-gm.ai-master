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
   what it said. **A clean `latexcheck` is not sufficient on its own** — when a chapter or an
   edit is *finished*, the rendered PDF also goes through the formatting gate, which catches
   the defect class the log cannot see. Specified once, under **Overleaf pre-flight → The
   formatting gate**; not restated here.
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

**The compile command carries `--shell-escape`, and omitting it makes the check pass for the
wrong reason.** `main.tex`'s `\quickwordcount` writes `main-words.sum` through `\write18` and
`declaration.tex` `\input`s it. Without the flag the file is never generated and the build dies at
an emergency stop on the first pass — so a run that omits it **passes only when a stale
`main-words.sum` happens to be sitting in the working clone**, which is the normal state of a
clone that has been compiled before. Every run in this project before 2026-08-07 was in that
category, including 8C-3's own pre-push check. It reached the right verdict by an accident of
working-directory state, and would have failed from a clean checkout. This is the exit-code rule
in a new place: the command reported what it attempted, and only the fresh clone reported what
was true.

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

### One session at a time on this repo — adopted 2026-08-08

**Two agent sessions must not run against `ai-gm.ai-master` concurrently.** One writer at a time,
and the second waits.

The rule exists because it was broken and got away with it. On 2026-08-08 two sessions ran in
parallel and **both edited `PRJ93_RULES.md`, `05_paper_architecture.md` and
`results_rewrite_critique.md`** — the same three files, for the same reason, within twenty minutes.
Nothing was lost. The two edits **composed**: one wrote the "cite the path" rule and the other
wrote the complementary "quote the check, don't name it" rule, and the second even opens by
referring to the first. That outcome was luck. The same two sessions, one paragraph further apart
or one minute closer together, produce a doubled rule in the file that governs every other rule,
or a lost edit with no conflict marker to show for it.

**Why git does not save you here.** Both sessions commit to one branch in one working tree, so
there is no merge and no conflict — the later `git add` simply stages whatever is on disk,
including the other session's uncommitted work. `7cf01337` committed one session's files under
the other's message. A commit whose message describes a subset of its contents is a commit nobody
can later read as evidence.

**This is the store-ownership rule at a different radius.** That rule stops one fact being written
in three files; this one stops one file being written by two sessions. Both failures look identical
afterwards — a store that disagrees with itself, and no record of which write was authoritative.

What to do instead:

- **Finish or close a session before starting another.** If a second is genuinely needed, give it a
  disjoint file set and say so in both prompts.
- **On resuming, reconcile before repairing.** Read the governing files end to end for doubled or
  contradicting entries before trusting any of them, and **report what you find rather than merging
  silently** — a silent merge destroys the evidence that two writers disagreed.
- **Never infer authority from a ledger row alone.** A row recording *"closed on Phuong's ruling"*
  is a claim about a conversation, and the conversation is the evidence. It lives in the owning
  session's transcript under `~/.claude/projects/<project>/<session-id>.jsonl`; quote the turn.
  This is the one case where a transcript outranks a ledger, because the ledger is downstream of it.

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

#### AMENDMENT 2026-08-15 (S19): the rule above is now a mechanism, because as a disposition it failed

**The paragraph above asks a reader to be careful, and that is why it did not work.** It was
written about decision row **85**, the ruler conflict. It did not prevent the same failure
three more times. Packages **S14, S15 and S16** each read Section B row 5, each verified that
the dissertation omits the T3 fold-count divergence, and each priced a disclosure for it, when
row 6(a) had resolved the divergence on 2026-07-08, about sixty rows further down under a
different section heading. Decision row **111(d)** records that sequence. **A gap has two
halves, the absent statement and the live fact it would state, and only the first was ever
checked.** Three careful readers, one careful rule, three identical misses: the variable that
predicts the miss is not care, it is whether a pointer exists at the place the reader arrives.

**The rule is therefore replaced with a writing obligation on the deciding session, not a
reading obligation on the next one:**

> **When a deferral is decided, the pointer is appended at the deferral site, in the same
> session as the decision.** Not at the end of the deferring row, not only in the new row that
> records the decision, and not in a later sweep. At the site: adjacent to the sentence that
> defers, where a reader who arrives by grep stops reading. The pointer names where the
> decision was made and its row number. A session that records a decision without appending
> that pointer has not finished the decision.

Three properties this has and the old rule did not. It is **discharged by the party who knows
the answer**, at the moment they know it, rather than by every future reader guessing that an
answer might exist. It is **checkable**: a row that defers and carries no forward reference to
a higher-numbered row is a mechanical query over the log, not a judgement. And it **costs the
decider seconds and saves every later reader the same seconds**, which is the only ratio under
which a discipline survives contact with a deadline.

The pointer is an append, so it is fully inside the append-only rule below: nothing in the
deferring row is edited, and the superseded text is left standing as the record of what was
true when it was written. Placement matters and is not decoration, per the finding that a
supersession announced a hundred lines below the text it supersedes is never read by anyone
reading that text.

**Retrofit status, 2026-08-15.** Eleven rows deferred without a pointer; the sweep is at
`log/93` part 3. Pointers are now placed at Section B row 5 (S18) and at rows **75, 76, 85,
87, 88, 90, 91** with discharges at **93** and **95** (S19). Rows **9** and **45** are left
open deliberately, because their conditions have not been discharged; see `log/94` part 4.

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

### A check that examined nothing must not be able to report a clean result

**This is the sentence, and it is a requirement on every instrument this project writes.** A
verdict is a claim about a body of material. When the material is silently empty or silently
reduced, the verdict is still *true* — true of nothing — and no amount of reading the output
reveals it, because the output is not lying.

**Three distinct instances are now on record, and they fail in three different places.**

| Instrument | What was empty | What it reported |
|---|---|---|
| the scratchpad word counter | every line quoting a percentage, discarded by a `%.*` comment strip that also matched an escaped `\%` | a confident count over the surviving text; Chapter 2 read 4,893 instead of 4,948 |
| `latexcheck.py` | the PDF, on a fatal svg/Inkscape failure (2026-08-07) | `VERDICT: PASS` over a build that produced no PDF at all |
| `venueordercheck.py` | the **file list** (2026-08-09) | `VERDICT: PASS - no unanchored or conflicting venue triple found`, having scanned **zero files** |

**The third one's cause was the shell, not the script**, which is why it is worth writing down.
The call was `A="chapters abstract.tex"; check.py $A`. That word-splits in bash. **In zsh it does
not**, so one invalid path arrived, nothing matched, and the tool correctly reported a clean result
about the empty set. It was caught only because a run minutes earlier had said `FAIL - 8` and the
two disagreed. Pass paths literally, or use an array (`A=(chapters abstract.tex)`).

**What every instrument here must therefore do**, and all three now do:

1. **Print the size of what it examined** — `scanned N files`, `N pages`, `N words`. That line is
   not decoration; it is the only thing separating a clean document from an empty scan.
2. **Fail closed when that size is zero.** A caller error must not be able to read as a clean
   document.
3. **Be exercised against the empty case before being trusted**, per the assertion rule above. Both
   path-list checkers were fed an empty scan and watched to raise before this was relied on.

**Why it belongs beside the exit-code rule rather than inside it.** The exit-code rule says a
command reports what it *attempted* rather than what it *left on disk*. This one is narrower and
nastier: the command reports what it **covered**, and coverage is invisible in the verdict. An exit
code can be checked against the artefact. A clean verdict over an empty input has no artefact to
check it against, so the guard has to live in the tool.

### A constraint added to make a run COMPLETE becomes a constraint on what it PRODUCES

**A mitigation and a specification are different things, and a mitigation written into a
prompt stops being distinguishable from a specification the moment it is read by whoever
does the work.** Timeouts, token budgets, "keep it bounded", "aim for 15–25 per file" — each
is a legitimate answer to a run that keeps dying, and each silently caps the output it was
added to enable.

The worked example is the graph refresh of 2026-08-07. The extraction subagents were given
"bounded ranges, 15–25 nodes per file" to stop them stalling. They obeyed it as a
specification: the external examiner assessment fell 142 → 64 nodes, `literature_conformance`
82 → 12, and eight files collapsed to **exactly one node each**, which is not a summary of a
40 kB report but a budget being rationed across a chunk. The shrink guard refused the write,
correctly, twice.

**The tell is a guard refusing twice with a different explanation available each time.** The
first refusal was attributed to two of four chunks failing; the second disproved that, because
all chunks landed and the deficit was essentially unchanged (−289 against −306). Two plausible
and *different* stories for the same refusal means the stories are being fitted to the
refusal. **When a guard refuses twice, suspect the instruction rather than the run** — and in
particular suspect the instruction that was added to make the run survive.

**The repair is to fix the emission, not to restore the cap.** The re-extraction with no
node-count target then stalled on every chunk, at the moment each agent emitted its result as
one large JSON. That is what the original cap was actually working around — a response-stream
limit, not a limit on how much a document contains. The fix is a multi-part write protocol
(many small part files, assembled afterwards), which removes the failure without touching the
depth. **A budget imposed on the content to work around a limit in the transport is a
mislocated fix**, and it will keep costing content until the transport is addressed.

### Stamping follows the write, never the dispatch

`graphify`'s manifest save does not ask whether the graph write succeeded. `save_manifest`
stamps every file that produced extraction *output*; the shrink guard refuses the graph write
in an earlier, independent step. When the guard fires, `graph.json` correctly keeps its old
content and `manifest.json` is stamped as though the new content landed — so the next
`--update` reads those files as unchanged and **skips them permanently**. The extraction is
then unreachable: not in the graph, and never re-queued.

This was repaired by hand twice on 2026-08-07 with `git checkout -- graphify-out/manifest.json`.
A repair that is needed twice is a missing fix. `brain/scripts/graph_write_guard.py` brackets
the run — `snapshot` before, `settle` after — and rolls the stamps back when `graph.json` is
byte-identical afterwards. **`settle` exiting non-zero is the reportable outcome, not an error
to route around:** it means the refusal was real and the graph still needs a run that lands.
Its `--self-test` reproduces the exact 2026-08-07 failure, per the rule that a guard nobody
has seen fail is a guard taken on faith.

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

### A claim of absence names what was searched, in the sentence making the claim

**This is the rule below, moved from something to recall to something that has to be typed.** The
principle — report a clean result with the scope of the check — has been in this file for two
sessions and was broken again on 2026-08-08: four directories searched for TeX, none of them the
home directory where it was installed, and the finding written into `BLOCKED_third_party.md` as
*"No TeX binary is reachable … confirmed both inside and outside the tool sandbox, so it is
absence and not a permissions artefact."* Confident phrasing made a narrow search sound
exhaustive, and it went in as state.

**The operational form: you may not write "X is absent". You write "X was not found in A, B, C".**
The scope goes in the same sentence as the claim, not a clause later and not in a footnote,
because the sentence is what gets quoted forward. If naming the scope makes the claim look thin,
that is the rule working — a thin search should look thin.

This binds hardest on **negatives that close work**: a missing tool, an unused citation key, a
figure with no generator, a row with no owner. Each of those ends an investigation, so each is
exactly where an unbounded negative costs most. `zotero_search_by_citation_key` already has its own
entry above for the same reason.

### A value match is not an identity match — confirm what a number *is* before ruling on it

The sibling of the rule above, and it bites in the opposite direction: an unbounded negative
overstates absence, and a bare value match overstates presence. Verifying the 2026-08-08 push,
`grep 0.871` on the remote `results.tex` returned four hits, which reads as the old precision
figure surviving a repair that was supposed to remove it. It is not. **`0.871` at
`results.tex:471/490/494/538` is the Beer Hall's conformal coverage** — a different quantity that
happens to carry the same three digits — and the repaired precision prose reads `0.872` a few lines
away. The repair had landed. A grep-only verification would have reported it failed and sent the
next session to re-fix a correct line.

**The operational form: before concluding from a numeric grep, read the line and name the
quantity.** A number is only evidence when you can say what it measures; three digits on their own
are a coincidence surface. Four digits or a signed value narrow it, and neither closes it.

This is worst in exactly the places this project greps: a corpus with a small number of venues, a
shared rounding convention and several statistics on $[0,1]$ **manufactures collisions** — coverage,
precision, recall, VUS-PR and a p-value all live in the same three-decimal range, so a repaired
value and its replacement often differ in the last digit only. Both failure directions have now
been observed: a false negative from a narrow search, a false positive from a shared value.

### A terminal node is only terminal if it was COMPUTED — a result file's prose is not an artefact

**T1 says every number traces to a `brain/log/*result*.md`. That is necessary and it is not
sufficient, because a result file contains two different kinds of sentence and only one of them
is evidence.** The numbers a result file *computes* are the artefact. The prose it writes
*around* them is a claim like any other, and it can be wrong in exactly the way a chapter can be
wrong — with the difference that nothing downstream will ever question it, because it sits at the
address the trace rule points to.

**The worked example is the root of this project's longest-lived false claim.**
`log/72_DU6_exchangeability_result.md`:69 asserted that the rank statistic *"reproduces the
published coverage at all three venues to within a thousandth"*. `discussion.tex` and
`conclusion.tex` both cited `log/72` as their trace. **So the claim traced correctly, every time,
to a result file that asserts it**, and T1 passed on it for the life of the document. The
computed differences are 0.001143 / 0.001206 / 0.001570 and a thousandth is met at no venue —
and the numbers proving that were sitting in the two JSON artefacts the whole time, one
subtraction away.

**The operational form: trace to the computation, not to the file that reports it.** When a
result file's *prose* carries the claim, the trace has one more hop to go — open the artefact
the file was generated from and difference the two columns yourself. A result file's tables are
where it stops; a result file's paragraphs are where it continues.

**And the second half of that example is the more general fault.** The claim was not merely
imprecise: the two quantities being compared were **the same miss indicator computed under two
conventions**, so there was nothing to reproduce. Agreement between a statistic and the thing it
decomposes is arithmetic, not corroboration. **Before reporting that A confirms B, establish
that A and B are computed from different information.** This project has now produced the
degenerate case twice — here at 0.0011 apart, and on the traded limb where implied and measured
coverage agree to **six places** because they are literally the same vector counted twice.

### A MATCHES verdict compares at equal precision, or states the precision it compared at

**Rounding on one side of a comparison and not the other silently loosens the test, and it
loosens it by exactly the amount the test was checking.** A tolerance claim verified against a
rounded published figure is not verified.

`numbers_audit.md` **X1** graded *"reproduces published coverage to a thousandth"* as **MATCHES**,
on *"implied 0.8703 against published 0.871"* — difference 0.0007, inside the thousandth. The
implied figure was carried at full precision and the published one at three places. The exact
published value is $1525/1750 = 0.8714286$ and the true difference is **0.0011428**, outside it.
**The rounding hid the defect the audit existed to catch**, and the audit's own verdict line
records neither precision.

**The operational form: an audit row states the precision each side was compared at, in the row.**
Where a claim is *about* precision — "to a thousandth", "agrees at the third decimal", "within
one per cent" — both sides come from the artefact at full precision and the rounded published
form is not admissible evidence. This is the sibling of *a value match is not an identity match*:
that rule says equal digits need not mean the same quantity, this one says unequal digits can be
manufactured by the display convention rather than by the data.

**Note how the failure compounds with the rule above.** Three independent audit paths passed this
one claim, each for a different reason — T1 traced it to a result file that asserts it, Role B
matched its prose against a chapter carrying the same unrepaired sentence, and the numbers audit
compared full precision against rounded. **Independent checks are only independent if they
terminate at different places.** All three terminated inside the same unrepaired text.

### A cross-reference that RESOLVES is not a cross-reference that is TRUE

**`latexcheck` reads whether a `\ref` has a target. Nothing in this project reads whether the
target says what the citing sentence claims**, and those are different questions that look
identical in a clean compile.

**Run over all 21 `\ref{app:*}` sites on 2026-08-09, the check found seven failures and every
one compiled silently.** The worst was `methodology.tex`:82 — *"Library versions, the model
revision hash and the compute device are pinned per environment and stamped on every artefact
for the same reason; Appendix~B records them"* — pointing at an appendix that records none of
them. A **reproducibility** claim resolving to nothing.

**The method is three steps and takes minutes: read the citing sentence, name the noun it
promises, open the target and look for that noun.** Not "does the ref resolve" — grep the
target for the specific thing named. It is the artefact rule (*confirm a change by searching the
artefact for the thing that was supposed to change*) applied across a file boundary.

**Six of the seven shared one cause, and it is the cause to expect.** Both target appendices
carried headers reading *"Prose for this appendix is composed by 8C-7"*, and `results.tex`:143
carried *"displaced to Appendix C per 05 §4.5"*. **They were approved displacements that were
ruled and never executed.** The chapters had been rewritten against the post-move state while
the appendices were never composed — so the *document* recorded the move as done in the only
place a reader would look, and the ledger recorded it as ruled. Neither store recorded it as
outstanding.

**This binds hardest on any pass that MOVES material between files**, which is where the citing
sentence and its target are edited in separate operations and only one of them has to be
forgotten. Run the check after every such pass, and state the number of reference sites
examined, per the empty-scan rule.

### Never lead a pass with the item whose estimate is least constrained

**Sequencing a pass by expected size sends you at the item you understand worst, and it does so
by construction**, because the largest estimate is usually large for the same reason it is
unreliable.

The reduction pass of 2026-08-09 led with Chapter 4 on an explicit and reasonable argument: it
carried 4,192 of the 11,429, so its realised rate would be the best available estimator for the
rest. **Both halves were wrong in the same way.** Chapter 4's estimate was the largest *because*
the chapter is dense with measurement — and a chapter dense with measurement is one where the
body must keep the measurement, so its retention cost was the highest in the document and the
least like anything else. Executing it first spent the most effort on the least efficient
material and produced a rate that did not generalise. **Chapter 3, priced smaller, ran at 84 per
cent against Chapter 4's remaining 6 to 30**, because its demotions answer R83/R84, which want a
reason — one sentence — where R102 wants a finding, its number and its consequence.

**The operational form: order a pass by what is best understood, not by what is biggest.** Lead
with the item whose estimate rests on something already measured, or whose constraint is
structurally simple, and let it calibrate the estimates that are shakier. If the largest item
must go first for another reason, say explicitly that its rate will not transfer, and forecast
the remainder from its *class* rather than from its number.

**The generalisation past sequencing: an estimate's size and its reliability are often produced
by the same property**, so ranking by size ranks by uncertainty as well. Ask what makes an item
large before treating it as the anchor.

### A value the quantity cannot take is a defect in the instrument, not a datum

**Zero is a value, and an instrument reporting it for something that cannot be zero is
reporting its own failure in a form indistinguishable from data.**

Pricing each float's cost against `texcount` on 2026-08-09, **five of nineteen returned exactly
zero governing words**. A caption that exists cannot cost zero. The cause was that `texcount`
silently drops the entire caption body of any float whose `\caption[...]` short title wraps a
line — and the hypothesis, once formed, classified **all 19 floats correctly, five positives and
fourteen negatives**, which is what promoted it from a guess to a finding.

**Two operational forms.**

1. **Before using a measurement, ask what values the quantity cannot take, and check for them.**
   Zero, negative, and exactly-equal are the three that carry information about the instrument
   rather than the subject.
2. **A hypothesis about an instrument's defect is tested against the cases it says are CLEAN as
   well as the ones it says are broken.** Five zeros are consistent with several stories; five
   zeros and fourteen non-zeros falling exactly where the hypothesis puts them is consistent with
   one. This is the both-directions requirement the guard rules already impose, applied to a
   diagnosis rather than to a guard.

**The cost of not doing it was already accruing.** The disagreement between the two counters —
872 caption words against 1,136 — had been measured, recorded as an instrument disagreement, and
not chased. **The disagreement was the defect**, and the number the compiled declaration printed
was 230 words short of the truth for as long as it went unexamined.

### `active` is three different populations in this repo — resolve it at the generator, every time

**Do not learn what `active` means. Look it up in the file that wrote the field, on every use.**
The obvious rule to write here — *"`active` means calendar-open, never traded"* — is what the
2026-08-08 evidence appeared to support and it is **false**, which is the whole finding. Three
definitions are live, and two of them sit under the **identical field name** `active_only` in the
same directory meaning **opposite** populations:

| Where | `active` denotes | Defining expression |
|---|---|---|
| `brain/store/active_span.py` | a **date span** | first to last nonzero-revenue day; `trim_to_active` keeps every non-trading day *inside* the span |
| `brain/eval/exchangeability_diagnostic.py` — `active_only`, and the local `active` throughout | **calendar-open** | `records["state"] == 0`. At Ellel this is 1185 pairs of which 240 traded |
| `brain/eval/native_interval_probe.py` — `active_only` | **traded** | `df[df["y"] > 0]` |

`interval_calibration_L1.json` avoids the word entirely and keys on `per_state` `0`/`1`, which is
why nothing has gone wrong there. That is the pattern worth copying.

**The operational form, in two parts.**

1. **Every number lifted from an `active*` field carries a LaTeX comment naming the population and
   the defining expression**, next to the number, not in the trace line. `% active_only here is
   df["y"] > 0, i.e. traded` is the whole requirement.
2. **The word does not reach the reader.** Write *calendar-open* or *trading-day* in prose, table
   headers and captions. The document had `its active group` at `sec:res-drift-cause` meaning
   calendar-open and an `Active only` column in Appendix~D meaning traded, twelve pages apart,
   both correct against their own generators and irreconcilable to a reader. Both were rewritten
   on 2026-08-08.

**Why this is a rule and not a note.** The substitution has now been made **four independent
times**: `tab:mcs`'s coverage row, the abstract's calibration sentence, Chapter 5's echo, and —
the one that matters — the robustness check at 4.4.3 that existed to *defend* the result, which
reported the Beer Hall tail fraction on `active` days as 0.117 and called them trading days. The
true trading-day figure is 0.108. A defence computed on the wrong population is not a weaker
defence; it is a different claim.

**This is `field name is not a definition` at repo scale.** A field whose name matches the
quantity you want, in a file you did not write, is the case where checking feels least necessary
and pays most. The generator is the definition; the name is a hint that has been wrong three times
out of three files.

### Compression is not allowed to touch a qualification

**When cutting for length, a qualifier is not spare wordage — it is the scope of the claim, and
removing it does not shorten the sentence, it widens it.** Four instances are now on record, the
last one mine while trimming the abstract to 300 words: `the only weather contrast excluding zero`
lost `weather` and became `the only contrast excluding zero`, which is false — Ellel carries three
basis-versus-basis contrasts excluding zero. Two words saved, one wrong claim bought.

The reason it keeps happening is structural rather than careless. A qualifier is **grammatically
optional and semantically load-bearing**, so a sentence reads perfectly after the cut and the
damage is invisible to every instrument in this project: the compile passes, the word count
improves, and `completenesscheck` sees prose above the floor.

**The operational form: on any de-duplication or length pass, qualifiers are protected by default
and cut only with the claim re-read whole.** Cut a clause, then read the surviving sentence as if
you had never seen the original and ask what it now asserts. If the answer is broader than what
the evidence supports, the words come back and the length is found elsewhere. This binds on the
S-4 pass specifically, which is a length pass across four chapters and therefore this failure's
largest available surface.

### A word budget is never a reason to defer an accuracy repair

**Three clauses, recorded verbatim as ruled on 2026-08-09:**

> **A word cap constrains the total, not any particular sentence.**
>
> **"I cannot afford the true statement" means "I have not looked for what to spend".**
>
> **Deferring an accuracy repair on budget grounds launders a known-false statement into a later
> phase.**

**The instance.** The abstract sat at 300 of 300 and carried *"the other two sitting at nominal or
above"* of an estate whose second venue measures 0.8918 against nominal 0.90. The file's own
header recorded this as a declared looseness deferred to 8D *"because the honest repair is a
word-budget decision, not a wording one"*. Three critique roles found it independently and one
**costed the repair**: cutting a sentence that ranked the dissertation's own results, and
converting a positional venue triple to a range, freed more than the repair needed — **twice
over**. The deferral failed its own arithmetic, and it had been standing on `origin/main`.

**Why the reasoning is seductive rather than lazy.** At a hard cap every sentence is genuinely
competing, so "no room" is always locally true. What makes it false is that it is a claim about
the *document* being made from a look at one *sentence*. The budget question is never "can this
sentence be longer" — it is "is this the least valuable sentence in the file", and that question
has not been asked.

**The operational form: before recording any defect as unrepairable for length, enumerate what
else in the same file is rankable, editorial or duplicative, and price it.** Only if that list
comes up empty is the constraint real, and then the finding is that the file is over-specified
rather than that the claim is affordable. A deferral written without a costed alternative is not
a decision; it is the absence of one, wearing a decision's clothes.

**It cuts against the compression rules on either side of it, deliberately.** *Compression is not
allowed to touch a qualification* says the qualifier stays. This says the length is found
elsewhere. Together they leave exactly one legitimate move under a cap — **find the words
somewhere the claim does not live** — and they close the two illegitimate ones, which are to
widen the claim silently and to postpone it loudly.

### Compression removes negative results first, and the check is a grep per question

**This is the sibling of the rule above and it is the more expensive one.** That rule says a length
pass silently widens a claim by cutting its qualifier. This one says a length pass silently *deletes
a finding*, and it deletes them **non-randomly**: the ones that go are the nulls, the
non-separations and the failed preconditions, because a positive claim reads as content and a
negative one reads as an absence of content.

**Two instances, in one chapter, found on 2026-08-09.** The pre-8C-5 Conclusions stated four
contributions and covered **three of the five research questions**. The two missing were:

| Missing | What it was | How it was found |
|---|---|---|
| **C2**, RQ3 | the controlled weather and cross-series-pooling test | a **count disagreement** — the spec said five contributions, the document had four |
| **RQ2's limb** | the unbiasedness precondition failing at 22 of 41 nodes, and the median-under-a-mean's-name estimand | **nothing.** No symptom of any kind. Found by a critique role grepping `reconcil`, `hierarch`, `coherent`, `median` and getting zero hits |

**The second one is why this is a rule.** C2 had a symptom and it still took a dedicated session to
resolve. RQ2's had none: every count was consistent, the chapter compiled, `completenesscheck` saw
prose above the floor, and four confident paragraphs sat where five belonged. **Absence has no
syntax, so no instrument in this project can find it** — the same defect class as the issued-template
abstract that passed every check for the life of the project, and as the four-versus-five contest
whose real content was a missing claim.

**The operational form: enumerate what the section is supposed to cover and grep for each item's
distinctive noun. Do not read the section and judge whether it feels complete.** Reading finds what
is there; only enumeration finds what is not. For a contributions or answers section, the
enumeration is the research questions, one grep each. For a limitations section it is the declared
threat list. The grep is seconds and it is the only check that reads for absence.

**And treat the bias as directional when triaging.** If a compressed section is short by one item,
look for the null before looking for anything else.

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

## The critique loop — name the file, not the roles

Any phase that critiques, revises or checks a chapter draft runs the loop defined in
**`brain/skills/autoresearchclaw/SKILL.md`**. Write that path. Not "the SKILL.md roles",
not "the three standing roles", not "the usual roles" — **the path, and the section**:
§3 for the three roles, §4 for the T1–T14 gate, §2 for the process.

**The rule exists because the reference decayed in three steps across four files, and the
artefact never revealed it.** Chapter 2's critique log cited the path and headed its rounds
`Role A, Methodologist`. Chapter 3 kept the name and dropped the path. Chapter 4 dropped
the name too, wrote *"the three standing roles"*, and ran six rounds of which **none was
Role A or Role B** — rubric coverage, number-traceability, structural boundary and approval
compliance had silently taken their place. Chapter 5 inherited the phrase verbatim. By then
*"the three standing roles"* referred to nothing but itself, and both logs read as complete,
because every round they described had genuinely been run.

Three properties of this failure are worth carrying to any other referenced-by-name
requirement:

1. **A name degrades where a path does not.** A path is either right or broken. A name is
   re-derivable from context, which means it can be re-derived *wrongly* and still resolve
   to something plausible.
2. **The substituted work was good.** Nothing was skipped through laziness — the invented
   rounds each did real work, which is precisely why nothing looked wrong. **Absence of a
   check is invisible in an artefact that records only what was done.**
3. **The control case isolates the cause.** In the same session, two roles specified
   *inline* in the prompt were run correctly while three referenced by name were not. The
   cause is the reference, not any reluctance to critique.

**§3's roles are not interchangeable with a rubric pass.** SKILL.md §8 says so directly:
*"It cannot mark a draft… Load `brain/knowledge/00_marking_criteria.md` for that."* Running
the rubric check in place of the roles satisfies neither.

### Anything a critique log claims to have applied is quoted, not named

**A critique log records the check it ran by reproducing it, not by referring to it.** Write the
role's defining sentence into the log, or the test's text, or the criterion's wording — inline, in
the log, next to what it found. Naming is what decayed; quoting cannot decay, because a wrong quote
is visible on the page and a wrong name is not.

This is the structural half of the remedy above, and it is the half that does the work. The rule
that a prompt must cite the path fixes the *next* session's inputs. This rule fixes every session's
*outputs*, so that a log which silently ran the wrong check can be caught by reading it.

What it requires, concretely:

- A round headed with a role's name carries that role's remit **quoted from the owning file**. A
  heading like `Round A, Methodologist` with no quoted remit is not a record of Role A.
- A gate reported as passed quotes the test it passed. `T8 PASSES` is not a record; the T8 wording
  plus the instrument plus the scope is.
- A check reported as clean states **what it did not cover** in the same breath. Six role calls and
  a fourteen-test gate, all aimed at two chapters, left an unwritten abstract standing on
  `origin/main`, and it was found only when one call looked outside its remit. **Scope a check
  narrowly and it will be clean narrowly.**
- A claim about a source quotes the source's sentence. `brain/ledger/source_claim_verification.md`
  is the worked example: it found a construction attributed to a paper whose related-work paragraph
  disclaims it, and no summary of that paper would have shown this.

**The general defect this closes.** *Absence of a check is invisible in an artefact that records
only what was done.* Every log in this project records completed work, so an omitted check leaves
no trace anywhere — not in the log, not in the compile, not in the word count. Quoting is the
cheapest available way to make an omission legible, because the quote is either there or it is not.

## Overleaf pre-flight

Every file bound for Overleaf gets an AI-writing pass before it goes:
run `humanizer` and `avoid-ai-writing` over the text and clear the
findings. This is part of the Overleaf human gate above — present the
cleaned text, not the raw draft.

Plain tables are a defect, not a baseline — every table must be justified
against a chart alternative.

### The formatting gate — run when the writing is done, before the push

**Adopted 2026-08-11.** Composition and revision are judged on what the text says.
**The marker opens a PDF**, and the PDF has a second class of defect that no amount of
reading the source finds: a table off the edge of the page, an algorithm six pages from
the section that introduces it, a page carrying two lines. **This gate closes that
class, and it runs at the same moment as the AI-writing pass above** — when a chapter,
an appendix or an edit is finished, before anything is handed over to push.

**The instrument is `brain/scripts/formatcheck.py`, and the command is:**

```
python3 brain/scripts/formatcheck.py <outdir>/main.pdf \
    --aux <outdir>/main.aux --body-from <first arabic page> \
    --accept brain/ledger/format_accepted.txt
```

It runs **after** `latexcheck.py`, on the PDF that run produced, because it reads the
rendered artefact rather than the log. `--self-test` exercises it in both directions and
is the precondition for trusting it, per the assertion rule.

**Why it is not part of `latexcheck`, and why the log cannot stand in for it.** A
compile log reports what TeX *warned about*; this reports **where ink actually landed**,
and the two disagree in both directions. A 2.54 pt overfull box in a *centred* float
bleeds 1.27 pt per side and puts **no** ink outside the text block — a warning with no
defect. A line in `appendix/project_specification.tex` puts **3.61 pt of real ink in the
right margin and TeX reports no overfull box at all** — a defect with no warning. Reading
the overfull list as a margin check gets both cases wrong.

**Verify by rendering and looking.** This is a visual defect class, so a clean verdict
from any tool is a starting point and not the finding. Render the pages the tool names,
open them, and look. `formatcheck` exists to tell you *which* pages to open over 146 of
them, not to save you from opening them.

**Three sections, and only the first one fails the run.**

| | Reads | Fails? |
|---|---|---|
| 1 · margin spill | ink outside the text block, which is where information is lost | **yes** |
| 2 · white space | vertical holes, **INNER** (between content) reported apart from **BOTTOM** (slack at the foot) | advisory |
| 3 · float distance | how far each float sits from the nearest text naming it, against the requirement quoted below | advisory |

**Section 2's split is the whole point of section 2.** Under `\raggedbottom` the slack
is *supposed* to collect at the bottom margin, so a metric that sums all white per page
scores the remedy as the disease — the first version of this measurement reported gaps
rising 22 → 32 while the real defect had fallen 10 → 2.

**The criterion section 3 serves is quoted, not paraphrased:** *"Try to position each
table or figure close to where it is first referenced"* — `Student Documentation - MSc
DS - Dissertation Submission.md`, **Format and Presentation**. Section 3 cannot see a
float that is never referred to **by number** at all, because an absent `\ref` has no
syntax; it lists those as UNREFERENCED for a human, and ten floats are currently in that
state.

#### Two invariants that bind any pass that is *only* formatting

1. **The counted body is identical at the end, and both figures are reported.** Measured
   with the instrument the compiled declaration itself uses —
   `texcount -0 -sum -merge -total` over the six chapter files plus `abstract.tex`, the
   scope `\bodywordcount` defines in `main.tex`. If that number moved, the pass was not
   a formatting pass. **No sentence is rewritten to fix a page break, nothing is cut and
   nothing is added** — the compression rules above apply here with full force, and a
   page break is a far worse reason to touch a qualifier than a word budget is.
2. **A mandated value is never changed to make content fit.** 12 pt body font, A4,
   standard margins, full justification, chapter-starts-a-new-page. Line spacing and the
   exact margins are *unspecified* by the requirements — **and silence is not permission**.
   Leave the Lancaster template's `\linespread{1.5}` and 35/25/25/25 mm alone. If a
   defect genuinely cannot be cleared without touching one of them, **that is a human
   gate**: present it with a recommendation and wait. It has not been needed yet — every
   overrun so far was recoverable by column geometry, and every white-space defect by
   float parameters.

#### `[H]` is not available, and the accept file is not a silencer

**Never `[H]`.** It defeats the float algorithm and manufactures exactly the white space
the gate is looking for. `[htbp]` is the default answer; `[!htbp]` is available and was
measured to change nothing on this document. `\FloatBarrier` at appendix `\section*`
boundaries is what stops a float crossing into the next section — called **explicitly**,
because a starred heading can slip out of placeins' `[section]` option silently.

**`brain/ledger/format_accepted.txt` is the only way a spill escapes the gate, and every
line in it needs a ruling.** It exists for the same reason `completenesscheck` lets a
file opt out with `% CARRIER:` — a guard that fires on known-and-ruled cases is a guard
the next person switches off. Each entry is keyed on the offending **text**, not the
page, because pagination moves; and each carries a **ceiling**, so the same defect
getting worse is a new defect and still fails. **Delete a line the moment its defect is
repaired.** An accept file nobody prunes is an accept file that hides the next
regression, which is this project's stale-`main-words.sum` failure wearing new clothes.

**The worked record of the first run of this gate is
`brain/ledger/formatting_pass_2026-08-11.md`** — what the requirements mandate and leave
open, each table fix with its method and why that method, the float parameters, and the
three defects reported rather than resolved.

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

### The same boundary in a new medium: what a construct check can and cannot reach

The three tiers above divide by *when* a defect becomes visible. A second boundary runs across
the same material and divides by *whether the defect is a construct at all*, and it has to be
stated or a clean sweep will be read as coverage it does not have.

`brain/scripts/figurecheck.py` (added 2026-08-07) flags figure sources that paint a title into
the image body, because a title belongs in the `\caption` where it reaches the List of Figures,
the cross-reference and the marker's eye. It catches the title **APIs** — matplotlib's
`set_title`, `suptitle`, `plt.title`, and pgfplots' `title=` key. It does **not** catch a bare
TikZ `\node` positioned above a picture and reading as a title, and that is a deliberate
boundary rather than a gap: placement and wording are a judgement, not a construct, and a regex
guessing at them would flag every label in the estate.

**The transferable rule: an assertion is worth writing exactly where the defect has a syntax.**
Where it does not, say so in the tool's own docstring and leave the case to a reader, rather than
widening the pattern until the check cries wolf and is disabled. A guard that fires on four
legitimate calls is worse than no guard, because the next person silences it.

Verified in **both** directions before use, per the assertion rule above — four fixtures, dirty
and clean, the clean ones carrying a commented-out `ax.set_title(` and a `title=` inside a TeX
comment — and then against the five real pre-fix sources, where it flagged all five.

**Assert against the target's geometry, not the harness's.** `fig_blocks.py` computed its
clearances against the compile proof -- 11pt `article`, landscape, 15 mm margins -- while the
document is 12pt `report` with `\linespread{1.5}` and a 150 mm text width. The clearances
survived, but the reported margin was wrong by a third, because at 12pt with 1.5 leading a
two-line `\scriptsize` label is about a quarter taller. A check run against a convenient
geometry is a check against a document that does not exist.

### The two instruments that read for PRESENCE — and the one thing neither reaches

Added 2026-08-08, both after the same session found their defects by accident rather than by
mechanism. Both are verified in both directions by `--self-test` before use, per the assertion
rule above, and **both self-tests failed on first run and caught real defects in their own
instruments** — which is the only reason to trust them now.

`brain/scripts/completenesscheck.py` walks `\input` from `main.tex` and asserts four things:
every target resolves; every file carries prose above a floor; every **leaf** heading carries
prose above a floor; no issued-template phrase survives in text that reaches the reader. A file
may opt out of the content floor only by **saying so** — `% CARRIER:` or `% INTENTIONALLY EMPTY:`
with a reason — which converts a silent absence into a declared one. It exists because the issued
template abstract, bit.ly link and all, was live on `origin/main` and had passed `latexcheck`,
`wordcount.py` and `figurecheck.py` for the life of the project: **every instrument here checked
form, and none asked whether a section says anything.** On its first live run it found Chapter 1
in the same state.

`brain/scripts/venueordercheck.py` flags three-element lists read positionally against a venue
order. Two orders coexist legitimately — 4.1 runs BH/TRT/ELL, 4.2–4.4 runs BH/ELL/TRT — so the
defect is never "the wrong order", it is a list read against the *other* one. Three independent
occurrences justify it. It grades: `ORDER` (two orders in one paragraph), `UNANCHORED` (positional
triples with no venue named anywhere in the passage — the abstract defect exactly), and
`POSITIONAL` (advisory, off by default, because it is how most of Chapter 4 is legitimately
written). Canonicalising each triple by rotation to Beer-Hall-first is what makes it usable: with
three venues there are exactly two cyclic classes, and they are exactly the document's two orders,
so rotations of one order stop reporting as two. Ungrouped it cried wolf twelve times on the first
live run; grouped it reports six.

**The remedy either tool suggests is the same and it is not "reorder":** name the venues inline.
A named list cannot be read positionally and survives a later reordering of the table it came from.

**What neither reaches, stated because a clean sweep will otherwise be read as coverage.** Both
read *presence* and *shape*. Neither can tell a right mapping from a wrong one, and neither can
tell prose that says something from prose that is fluent and empty — word count is not meaning.
The critique roles in `autoresearchclaw/SKILL.md` remain the only instrument in this project that
reads for content, and nothing added here reduces their scope by one line. What these two do is
make the *specific* failures they were built for — a section nobody wrote, a triple nobody
anchored — impossible to reach the PDF unnoticed.

**A third thing neither reaches: a COUNT of things.** On 2026-08-09 the Introduction read *"Four
appendices follow"* while `main.tex` `\input`s **five**, and the mandatory HC54 project-specification
appendix was **not signposted anywhere in the body**. `completenesscheck` walks every `\input` and
saw all five; `latexcheck` resolved every `\ref`; the sentence naming the wrong number contains no
defect either tool has a syntax for. The defect was created by *adding* the appendix — the count
was correct when written — which is the general shape: **a count in prose is a claim about the
document that goes stale when the document changes, and nothing here re-derives it.** The same
applies to "five contributions", "three venues", "eight extensions". When a count is added or a
countable thing is, grep for the number word and the digit both.

## An enumeration is a measurement with a timestamp

An audit that enumerates the document — sections against research questions, promises against
appendices, floats against their referring text — is a **measurement of the document as it stood
when the audit ran**. It goes stale the moment the thing enumerated changes, and it goes stale
**silently**, because the audit's output is prose that still reads as true.

Three instances of the same failure are now on record:

- `06_research_questions.md` §7.2 mapped results to research questions against the **planned**
  §1.3 inventory. **Five Chapter 4 subsections were composed afterwards.** It was quoted forward
  through three phases as though it described the composed chapter.
- The §F rows naming a remote SHA. One asserted "seven commits await a push" and was seven commits
  stale.
- Chapter 6's recorded floor, and the appendix count in `introduction.tex` — a count in prose is a
  claim about the document that goes stale when the document changes, and nothing re-derives it.

**The rule.** Re-run an enumeration before relying on it, or record the commit it was run at so a
reader can see whether it still holds. Never quote an enumeration forward across a phase that
composed new material into the population it enumerated.

**Corollary, found 2026-08-09.** The RQ table is not the only map of what a result bears on. The
**contribution** table names limbs the RQ strings do not, and a result named in a contribution
string bears on that contribution's question by construction. An enumeration run against one map
is not an enumeration against the criterion.

## Re-price in the original item namespace

**A re-pricing pass that names its items differently from the pass it re-prices cannot see its own
overlaps.** Three double-counts surfaced in a single pass on 2026-08-09, each one lever counted
twice under two names: *"the traded meta-paragraph"* and *"§4.4.2's second demonstration"*; *"the
exchangeability narrative"* and *"the two-deflections paragraph"*; *"Winkler at 14 %"* and
*"Winkler at 76 %"*. Each looked like new saving and was not.

**Operational form.** Re-price in the **original item namespace**, or map every new item to the
row it supersedes **before** summing. A new item that cannot be mapped to an existing row is
either genuinely new or badly named, and which one it is must be settled before it enters a total.

## Untaken and uncounted are different things

Chapter 3's nine derivations were the largest untaken item in the plan and were **fully counted**
in its total. Reading "untaken" as "missing from the arithmetic" and adding them again would have
returned a landing of ~19,031 and a **false compliance verdict**.

**Before adding a lever to a forecast, find it in the forecast.** Not having been executed is no
evidence at all about whether it has been priced.

## A lever that never refuses anywhere has not been tested

When the R102-minimum reading was tested per research question, **RQ3 refused it**: that question
names two limbs, the limbs measure differently, and C2's own amendment forbids writing them as a
matched pair, so neither is secondary and nothing relocates.

**That refusal is the control case.** A per-item test that returns "applies here, dead there" is
evidence the test was applied to the material; a test that returns "applies" everywhere it is
pointed has been applied to a target. **Record where a lever fails, and treat a lever with no
recorded failures as unvalidated rather than as unusually good.**

## Count the criteria before pricing the cut, not after

**Three items in one plan were priced by reading ONE criterion per chapter, and all three came in
between a fifth and a third of price.** The cause is identical in each and it is arithmetic, not
optimism: a chapter is governed by more criteria than the plan counted, and **each criterion
demands its own retained sentence**, so retention scales with criterion count while the plan
modelled it as a constant.

| Item | Criteria the plan cited | Criteria that actually name the chapter | Priced | Realised |
|---|---|---|---|---|
| Chapter 3's derivations | R83, R84 | **seven** (R80--R86) | 1,215 | **342** |
| Lever 1, six Results subsections | R102 | **fifteen** (R87--R101 plus R102); 4--8 bind each subsection | 2,032 | ~480 |
| C-6, three review sections | none | **R66, R62, R63** bind two of the three | 1,403 | ~260 |

**The operational form: before pricing any demotion, enumerate every criterion naming that
chapter and count how many the passage discharges. Price the retention at one sentence per
criterion.** A passage discharging six criteria does not relocate; it compresses, and saying so
before executing is cheaper than measuring it afterwards.

**The corollary that killed the largest lever.** A whole-section relocation assumes the section is
*secondary*. Test that separately from the word count, because the two are unrelated: §4.1.1 is
237 words and is the settings-and-procedures anchor for its whole section; §4.4.6 is 496 words and
is the only site in Results discharging R100. **A short section can be structurally primary, and a
long one can be the only place a criterion is met anywhere.**

## A cut approved on a description of the material is approved on the description

**C-6 was approved to cut three sections on the stated basis that the review would lose "its
long-shot band". Two of the three were close-ups**, and the description was never checked against
the sections. §2.8 and §2.9 are where R66's shipped methods are argued — the intervention policy,
the $F_\beta$ measure R93 sends Results back to, the calibration instrument — and §2.9's closing
sentence *"no surveyed system reports it"* **is** the R62/R63 research gap.

The approval was sound given the description. The description was wrong, and nothing between the
two ever compared them. **Re-read the material against the description in the sentence that
authorised the cut, immediately before executing it** — not the plan, the material. This is the
enumeration rule pointed at an approval rather than at a document.
