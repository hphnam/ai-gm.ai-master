# PRJ93 log 94: the pointer retrofit, two discharges, and the rule that replaces a disposition

**Date:** 2026-08-15
**Package:** S19, last build action
**Repo:** `ai-gm.ai-master`, branch `brain-construction-local`
**Constraints honoured:** append-only; no `.tex` edited; no `ref.bib` edited; no reduction made;
no numbered decision-log row edited; no served path changed; no test removed; zero em dashes in
everything written here. One deletion was made, and it was the one this package ordered: the
`5.0 staff` line in `ledger/format_accepted.txt`.

**Store ceiling before and after:** 2026-07-07 at `beer_hall`. Unchanged. Measured directly from
`store/brain.duckdb`, not read from a ledger:

```
beer_hall       2025-06-04 .. 2026-07-07   302 rows
ellel           2025-06-08 .. 2026-07-04    68 rows
two_river_taps  2025-06-12 .. 2026-05-08   280 rows
```

---

## 0. What this package is, in one paragraph

S18 found that eleven rows of the decision log defer a decision and never say where the decision
was made, and that this had already cost three work packages a wasted disclosure costing. S18 was
allowed to place one pointer. S19 places the rest, discharges two rows whose condition has since
been met, reports the two rows whose condition has not, deletes one dead accept line, and
replaces the rule that was supposed to prevent all of this. The rule is the part that matters:
until today it asked a reader to be careful, and the evidence is now unambiguous that careful
readers miss this, because three of them did, one after another, on the same row.

---

## 1. The dead accept line is gone, and the gate is green without it

**Removed:** `5.0 staff`, the last data line of `brain/ledger/format_accepted.txt`. One deletion,
ten lines of removal record appended in its place, following the file's own precedent from
2026-08-12 (`REPAIRED ..., line removed per the pruning rule above`), so the history of the defect
survives the removal of the licence to ignore it.

**Why it was dead.** S17 repaired the spill by breaking the line before the `ffi` ligature. The
accept line then accepted nothing. The proof is not an argument, it is a second run: the gate
returns PASS with **no accept file passed at all**, exit 0, at the same scope.

**Why it was worth deleting rather than leaving.** The accept format keys on a **substring of the
offending text**, and the substring here was `staff`. In a hospitality dissertation that word is
everywhere. The line did not licence one repaired defect; it licenced up to 5.0pt of margin ink on
**any future line containing the word `staff`**, silently, with a PASS. An accept file's exposure
is the substring's reach, not the defect it was written for, and that is a general property worth
carrying forward: a broad substring is a broad exemption no matter how narrow the ruling was.

**The gate, at the canonical scope, and the scope stated as a number rather than as a word:**

```
python3 brain/scripts/formatcheck.py <clone>/main.pdf \
    --aux <clone>/main.aux --body-from 21 \
    --accept brain/ledger/format_accepted.txt

scanned 95 pages of 115 (body from p.21), 2588 justified lines
VERDICT: PASS - no unaccepted ink outside the text block (0 accepted, each ruled and capped).
exit 0
```

And the same invocation with `--accept` omitted entirely:

```
scanned 95 pages of 115 (body from p.21), 2588 justified lines
VERDICT: PASS ...  (0 accepted)
exit 0
```

**Identical.** `0 accepted` in both, which is the line that proves the accept file is now inert
rather than merely small. The scope is 95 of 115 pages, because `--body-from 21` starts at the
first arabic-numbered page and the twenty pages of front matter are outside it. That is the
canonical scope per `PRJ93_RULES.md`, and it is the narrower of the two scopes this project has
reported: a `--body-from 1` run scans 115 of 115 and 2914 justified lines. Both pass. A PASS is
only as wide as the page set it scanned, so the count is quoted with the verdict every time.

The PDF is the 2026-08-14 local compile of `main.tex`. `git status` over `*.tex` and `ref*.bib`
in the Overleaf clone is clean, so the rendered artefact corresponds to the tracked source at
`origin/main` `fbf64a2`, and no `.tex` was touched by this package.

---

## 2. Eight forward pointers, each placed where the reader arrives

All eight are appends. Not one character of any existing row was altered; every deferring
sentence still stands as the record of what was true when it was written. **102 insertions, 0
deletions** in `log/Decision_and_Resolution_Log.md`.

Each pointer sits **adjacent to the deferring sentence**, not at the end of the row. This is the
whole mechanism and it is worth being explicit about why. S14, S15 and S16 all reached row 5 by
grepping for the phrase `a call for Nam`. They landed on the deferring line and stopped. A pointer
forty-nine lines below would have been true, correct, dated, and unread. The unit of placement is
not the row, it is the sentence someone greps to.

| Row | The deferral, as written | Decided at | Pointer placed |
|---|---|---|---|
| **85** (d) | "**NOT RESOLVED, methodology decision, human gate**" | **87** Gate A, completed **88** | after the (d) block, before (e) |
| **75** | "G1 remains the human's decision and is deliberately left open" | **79**, executed **92** | after the Evidence line |
| **76** | five DIVERGES-DEFENSIBLE rows "reserved to the human" | **79, 80, 81, 82, 84**; written at **91** | at the paragraph end |
| **87** | "Still owed:" five items | **88, 89, 90, 91** | after the list |
| **88** | "Still owed:" four items | **89, 90, 91** | after the list |
| **90** | "Still owed:" three items | **91**, the next row | after the list |
| **91** | "CONFLICT FLAGGED, NOT RESOLVED ... Needs an operator decision" | **92**, the next row | after the sentence |

### 2.1 Row 85 is the one that already cost a day

`PRJ93_RULES.md` lines 199 to 206 exist because of this row. On 2026-08-06 the
`REPORTED_BASIS` against `VENUE_SCALE_BASIS` ruler conflict was relayed as the highest-priority
open blocker, gating a figure programme and a day of compute, when row 87 two rows below had
already ruled it and `log/70` had recorded the migration completing. A rule was written. **The
pointer was not added.** The rule and the pointer are not substitutes, and this package is the
proof: the rule has been in force since 2026-08-06 and the same failure happened three more times
in August.

The pointer now carries one thing beyond the location, because a bare location would perpetuate
an error: row 87 **withdraws** row 85's own "~20% movement in published MASE" estimate. Ellel is
ruled `unscaled`, so its nine rows become MAE in GBP. That is a structural change to the table,
not a rescale, and anyone quoting row 85's recommendation without row 87's correction quotes a
number the deciding row retracted.

### 2.2 Rows 87, 88 and 90 are one list copied three times

The same "Still owed" list appears at the end of three consecutive rows, shortened at each copy
as items landed, and **not one of the three says where anything landed**. The reader who greps
`Still owed` gets three hits, all stale, none pointing anywhere. Each pointer now names its
siblings, so arriving at any one of the three tells you the other two exist and are equally
closed.

Two of the items were not merely discharged but **retracted**. The `tab:ladder` re-score was
carried across several sessions as owed and row 89 establishes it was never owed at all:
`tab:ladder` is the frozen six-origin committed gate, its own caption freezes it, and it is not
built from the per-fold vectors. The vectors feed `tab:mcs`. An item can leave a "Still owed" list
by being done or by being wrong, and a pointer that does not distinguish the two is half a
pointer.

### 2.3 Rows 75, 76 and 91 are one question recorded four times

D-D1, the MASE against RMSSE headline, is deferred at row 75, deferred again inside row 76 as one
of five, decided at row 79, and then flagged at row 91 as **still unimplemented** twelve rows
after it was decided. Row 92 implements it. Only row 92 links, and it links backward.

Row 91's flag was not wrong about the state of the chapters. It was wrong about the state of the
decision, and the two are different: the chapters did report MASE as headline, and the decision to
report RMSSE had been recorded twelve rows earlier. That is the exact shape the pointer prevents.
The pointer at row 91 says so in those terms rather than just naming row 92, because a reader who
learns only "resolved at 92" learns the wrong lesson from it.

---

## 3. Two discharges, and a closure recorded in the wrong place

### 3.1 Row 93: the condition is met and the move was made

Row 93 flagged a structural gap: `chapters/conclusion.tex` was a 7-line stub with no Further Work
section, so the Two River Taps counterfactual sat inline in `sec:res-mcs-functional`, and it
"should move when the conclusion is written."

Verified in the live source at `origin/main` `fbf64a2`, not inferred:

- `chapters/conclusion.tex` is **260 lines**.
- `\section{Further work}` at `:202`, `\label{sec:further-work}` at `:203`.
- The counterfactual is there, as the last of the five smaller extensions, at `:240-241`: *"And a
  rule fixed in advance for deciding when a pairwise separation should override a set retaining
  the incumbent (Section~\ref{sec:res-mcs-functional})."*

**Discharged.** One thing changed that row 93 could not have anticipated, and it is in the
discharge because a reader following the chain will hit it: the **inline home moved too**. On
2026-08-13 `sec:res-mcs-functional` was cut, and its working, the gate-versus-headline argument,
the two ties, the 3.27 and 1.80 standard errors and the Two River Taps closure that makes the
restraint free, was relocated to `app:squared-loss`. Only the finding and the verdict remain in
the chapter. So the further-work item points at a section that is now a summary of what it used to
point at, and the evidence is one hop further on, in the appendix. Sound, and worth knowing before
quoting the chain as if it were two links.

### 3.2 Row 95: all four are closed, and one was recorded at a location that does not exist

Row 95 listed four rows open and not third-party blocked, two of them (C11 and C12) waiting
specifically on the conclusion being written. All four are now closed in the chapters. Verified by
reading the live `.tex` and `main.aux`, which is the standard row 95 itself set: what the chapters
SAY, not what a ledger claims about them.

| Row | Home | Source | Compiled as |
|---|---|---|---|
| D-F8 | `sec:res-vuspr` | `results.tex:771` | 4.5.2, p. 41 |
| D-F7 writing half | `sec:res-reconciliation` | `results.tex:157` | 4.2.1, p. 30 |
| D-U6 | `sec:res-exchangeability` | `results.tex:520` | 4.4.3, p. 37 |
| **C11 and C12** | `sec:disc-divergences` | `discussion.tex:172` | **5.2, p. 47** |

**And here is the finding.** That closure had already been recorded once, in
`ledger/literature_conformance.md` section 15, and the record names the wrong home:

> | **C11 / C12** | `chapters/conclusion.tex` (written) | `sec:conclusion-reversal`, `sec:conclusion-adaptive` |

**Neither label exists.** Not in any `.tex` file, and not in `main.aux`, which settles it, because
a label that compiled would be in the aux whatever the source did. The labels were never real. The
work was done and the location was written from the plan rather than from the artefact.

The two rows landed in the **discussion**, which is where C11 and C12 said they must resolve in
the first place. C11's adjudication of the directionless-instability claim is at
`discussion.tex:187`; C12's reading of the negative adaptive-conformal result as a Zaffran
boundary condition is at `:200-206`, with its trace comments. So the substance is right, the
chapter is right, and only the recorded coordinates are wrong.

This is worth more than a footnote. It is the mirror image of the pointer defect. The pointer
defect is a **true fact recorded nowhere the reader will look**. This is a **false location
recorded exactly where the reader will look**, and it is more expensive, because the reader who
follows it does not find nothing and go on searching, they find nothing and conclude the work was
not done. A discharge that names a section must name a section that compiled.

---

## 4. Rows 9 and 45: what they wait for, and why neither is closed

Both are open with no tracker pointing anywhere. Neither is closed here. Both were checked against
the live environment rather than against any ledger.

### 4.1 Row 9: the data arrived, the probe ran, the decision was never made

**Waiting for:** a June-inclusive store, so the `wc_*` World Cup fixture covariates could be
scored, and then a retention decision: keep them in the served exogenous covariate set, or drop
them from the forecast and keep them only for the reasoning and attribution path.

**Did it arrive? Partly, and more than enough to run the probe.** Row 9 was written when the store
ended 2026-05-31. It now ends **2026-07-07** at Beer Hall, with **32 June-onward rows** at Beer
Hall and 4 at Ellel. Two River Taps still ends 2026-05-08 and always will: the venue closed on
8 May 2026 and is frozen.

**And the probe did run.** Row **85(b)** records the first-ever results from
`eval/worldcup_fixture_probe.py`, which had never produced a number in its life before that:
beer_hall MASE 1.056 with `wc_*` against 1.127 without, tournament-only 1.152 against 1.258,
England-only ablation 1.080; ellel MAE 78.431 against 76.805, tournament-only 112.178 against
109.021, ablation 77.191. The covariates help at Beer Hall and mildly hurt at Ellel.

**So why is this still open?** Because **evidence is not a decision**, and row 85(b) is explicit
that its numbers are "directional only, 6 folds (4 tournament), no dispersion statistic". There is
no row anywhere in the log where anyone rules on `wc_*` retention. The question row 9 asks has
never been answered by anybody.

Two caveats a decider will need, and neither is in any row today:

1. **The store covers the tournament only up to 2026-07-07.** The tournament runs 11 June to
   19 July 2026. The store stops twelve days before the final. So the evidence is not the
   tournament, it is the first four weeks of it, and the knockout stages are absent.
2. **The probe is directional with no dispersion statistic.** A 1.056-against-1.127 gap with no
   standard error is not a result this project would accept anywhere else, and row 85 says so
   itself. Deciding retention on it would be deciding on a number the project's own standard
   rejects.

**Left open, correctly.** What changed is that the blocker moved: row 9 says the decision waits on
data, and it no longer does. It waits on a decision, and the evidence now available is weaker than
the evidence a decision needs. That is a different open state and the row should eventually say
so, but saying so is a ruling and rulings are not mine.

### 4.2 Row 45: it did not arrive, and the stated remedy would fail even if it had

**Waiting for:** a keyed environment. `ANTHROPIC_API_KEY` plus the `anthropic` SDK, for the 644
live calls that fill the S8b response cache and the empirical Part 3, 4 and 5 numbers that flow
from them. Row 45 states the remedy as **"S8b is one command"**:
`ANTHROPIC_API_KEY=... python -m eval.agent_calibration --build`.

**Did it arrive? No.** Checked in this environment today: `ANTHROPIC_API_KEY` absent from the
process; `import anthropic` raises `ModuleNotFoundError` in the shell python. Row 45's blocker
stands exactly as written.

**And the remedy is stale, which is the part row 45 cannot tell you.** `signals/agent.py:177`
sends `temperature=config.AGENT_TEMPERATURE`, and `config.py:513-514` pins
`AGENT_MODEL = "claude-opus-4-8"` with `AGENT_TEMPERATURE = 0.0`. Sampling parameters were removed
on that model line and now return a 400. **The one command fails on call one even with a valid
key.** Verified at source in this package: both lines are still present and unchanged.

Nothing could have caught this. The seam carries `# pragma: no cover - needs network + key`, so no
test executes it, and the whole apparatus is otherwise green. **A pin that makes a run
reproducible is the same pin that goes stale while nobody runs it**, and anything gated behind an
absent credential has never been executed once, so its "one command" claim is unverified rather
than tested.

**Left open, correctly, and it is now two blockers rather than one.** The credential, and a
one-line fix to the call before the credential would help. Deleting the `temperature` argument is
safe for the pre-registration, since the cache key is `hash(model, prompt_hash, scenario_payload)`
and temperature is not a term in it, so the frozen prompt hash survives the edit. That fix is not
made here: S19 is append-only and changes no served or evaluated path.

---

## 5. The rule at `PRJ93_RULES.md:199-206` is now a mechanism

**What was there.** A paragraph headed "The rule exists because it was broken", recounting the
row 85 incident, under a section instructing a reader to verify any OPEN claim against two owning
stores before reporting it.

**Why it was replaced.** It asks a reader to be careful. It was written on 2026-08-06 about row 85
and it did not prevent the identical failure in **three later packages**: S14, S15 and S16 each
read Section B row 5, each verified that the dissertation omits the T3 fold-count divergence, each
priced a disclosure for it, and none checked whether the divergence still existed. Row 6(a) had
resolved it on 2026-07-08, sixty rows down under a different section heading. Decision row 111(d)
records the sequence. **Three careful readers, one careful rule, three identical misses.** The
variable that predicts the miss is not care. It is whether a pointer exists at the place the
reader arrives.

**What replaces it,** appended as a dated `AMENDMENT` subsection immediately below the superseded
paragraph, which is left standing:

> **When a deferral is decided, the pointer is appended at the deferral site, in the same session
> as the decision.** Not at the end of the deferring row, not only in the new row that records the
> decision, and not in a later sweep. At the site: adjacent to the sentence that defers, where a
> reader who arrives by grep stops reading. The pointer names where the decision was made and its
> row number. A session that records a decision without appending that pointer has not finished
> the decision.

Three properties it has that the old rule did not, and these are the reason to expect it to hold
where the disposition did not:

1. **It is discharged by the party who knows the answer**, at the moment they know it, instead of
   by every future reader guessing that an answer might exist somewhere below.
2. **It is checkable.** A row that defers and carries no forward reference to a higher-numbered
   row is a mechanical query over one file. It is not a judgement about anyone's diligence. That
   query is what produced the eleven-row list in `log/93`.
3. **It costs the decider seconds and saves every later reader the same seconds.** That ratio is
   the only one under which a discipline survives contact with a deadline. The old rule inverted
   it: zero cost to the decider, a permanent tax on everyone after.

The amendment records that the rule was written about row 85 and did not prevent the same failure
in three later packages, because a rule that has already failed should say so where it is read.
It also carries the retrofit status, so the next reader knows which rows have pointers and which
two are deliberately still open.

**This is inside the append-only discipline, not an exception to it.** A pointer is an append.
Nothing in a deferring row is edited and the superseded text stands as the record of what was true
when written. The placement requirement is the operational half of an existing finding: a
supersession announced a hundred lines below the text it supersedes is never read by anyone
reading that text.

---

## 6. Report 16's compliance line is false, and was false on the day it was written

`log/16_Chronos2_Promotion_Report.md:10` reads: *"No em-dashes are used in this report, per the
spec's style rule."*

The file contains **29 U+2014 em dashes**. All 29 are in the report's **own prose**, none inside a
blockquote, table cell or code span, so no scoping reading rescues the claim. All 29 fall before
line 293, where the first appended correction begins, so every one dates from the original
2026-07-08 authoring; the two appended correction sections carry zero.

A correction is appended, the body is untouched, and it adds no em dashes of its own.

**What actually failed is worth naming.** The style rule was real and was stated. The compliance
line was **written rather than measured**: it asserts an outcome about the file it sits in, at a
point in the file where nothing had been counted, and nothing downstream counted it either. It
survived from 2026-07-08 to 2026-08-15 in a project that runs an AI-writing pre-flight on every
prose deliverable, because the pre-flight runs over the dissertation `.tex` and not over the build
reports. **A statement of the form "this artefact satisfies rule X", placed inside the artefact,
is a claim like any other and should be run before it is written.**

**Sibling claims swept, per the rule that a withdrawal is chased by grepping for the claim rather
than for the file it was written in.** Three other files assert a zero-em-dash result and contain
em dashes:

| File | Em dashes | Verdict |
|---|---|---|
| `ledger/phase_state.md` | 574 | **Not in breach.** Every claim is scoped to a named `.tex` deliverable, not to the ledger prose carrying it |
| `log/Decision_and_Resolution_Log.md` | 76 | **Not in breach.** Same: the claims are about chapters |
| `log/30_G12_18_Comment_Rewrite_Report.md` | 215 | **Defensible.** Its subject IS em dashes; the 215 are quoted BEFORE-samples of the comments it rewrote, each prefixed with its source line number. Worth a scoping clause it does not have |

`log/16` is the only one of the four where the claim is simply untrue. Nothing else was edited.

---

## 7. `origin/main` verified, and the three measurements in their correctly scoped forms

**The push landed.** `git ls-remote origin main` at the Overleaf remote returns
**`fbf64a2bb7db3ab99c26b023d56562c34547bfac`**. This is the first S-package in this thread whose
item 7 precondition is actually met; S18 reported all three figures against the local clone
because `origin/main` was still `99ee32b7` at the time.

Measurements were taken on a **fresh clone** checked out at that SHA, not on the working clone, so
no uncommitted file can contribute to a number reported as the remote's.

### Counted body: 19,993. Margin +7.

```
texcount -0 -sum -merge -total abstract.tex chapters/introduction.tex \
  chapters/literature_review.tex chapters/methodology.tex \
  chapters/results.tex chapters/discussion.tex chapters/conclusion.tex
19993
```

Seven files, which is the exact scope `\bodywordcount` defines at `main.tex:256`: the six chapters
plus `abstract.tex`. Not the appendices, which sit outside the counted population. Against the
20,000 cap that is a margin of **+7**, which is **243 below the project's own reserve floor of
250**. S19 moved it by zero, as it must, having touched no `.tex`.

### Format gate: PASS, at 95 of 115 pages.

```
scanned 95 pages of 115 (body from p.21), 2588 justified lines
VERDICT: PASS - no unaccepted ink outside the text block (0 accepted, each ruled and capped)
exit 0
```

**`0 accepted`** is the number that changed today. Before this package it would have read
`0 accepted` as well, because the line was already inert, but with one accept line loaded and
live. Now the file holds no data lines at all. The wider `--body-from 1` scope also passes at
115 of 115 pages and 2914 justified lines; the canonical figure is the narrower one, and both are
quoted because a PASS is only as wide as what it scanned.

### Test suite: 642 of 643, one deselected, exit 0.

```
.venv-forecast/bin/python -m pytest \
  --deselect tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted

642/643 tests collected (1 deselected)     [--collect-only pass]
641 passed, 1 skipped, 1 deselected, 1 warning in 600.23s (0:10:00)
PYTEST_EXIT=0
```

**The one skip is reported rather than absorbed into the pass count, because 641 and 642 are
different numbers and only one of them is what ran.** The skip is
`tests/test_intermittent.py::test_matches_statsforecast_on_bernoulli_gap_series`, and its stated
reason is a venv boundary, not a defect: *"statsforecast absent: it is an eval-only dependency
(requirements-eval.txt, .venv-eval) and does not build on the 3.14 runtime venv (scipy/numba);
cross-check skipped per spec G2.2"*. **Run in `.venv-eval`, where that dependency lives, it
passes** (verified today, 1 passed in 10.67s). So the fully scoped result is 642 of 642 selected
tests passing across the two venvs the project actually uses, with 641 of them green in one run
and the statsforecast cross-check green in the other. No test was removed, and the one warning is
a `StarletteDeprecationWarning` from `fastapi`, unrelated to anything here.

The deselected test is
`tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`. It is
**network-dependent and still unmarked**, which is why it has to be deselected by node id rather
than by marker expression. That is a small standing debt: an unmarked network test cannot be
excluded by anyone who does not already know its name, so the correctly scoped form of this
result has to carry the node id every time it is quoted.

**Two instrument notes, because both were live traps in the previous package and both are still
live.** `brain/pyproject.toml` sets `addopts = "-q"`, so passing `-q` on the command line yields
`-qq`, at which pytest suppresses the summary line entirely and a green run looks identical to a
run that collected almost nothing. The counts above come from a separate `--collect-only` pass for
that reason. And a pytest invocation piped into `tail` reports **`tail`'s** exit code, not
pytest's; output here was redirected to a file and the exit code read directly.

---

## 8. Files changed

| File | Insertions | Deletions |
|---|---|---|
| `log/Decision_and_Resolution_Log.md` | 102 | 0 |
| `PRJ93_RULES.md` | 40 | 0 |
| `log/16_Chronos2_Promotion_Report.md` | 40 | 0 |
| `ledger/format_accepted.txt` | 10 | **1** |
| `log/94_pointer_retrofit_and_discharge.md` | new | 0 |

The single deletion is the `5.0 staff` accept line, which this package was told to delete and
which the accept file's own header rule required.

---

## 9. Open after S19

1. **Row 9, `wc_*` retention.** No longer blocked on data. Blocked on a ruling, and on evidence
   stronger than the directional six-fold probe currently available. §4.1.
2. **Row 45, S8b live half.** Two blockers: the absent credential, and the `temperature=0.0`
   argument at `signals/agent.py:177` that 400s against `claude-opus-4-8` before the first
   response. The second is a one-line fix that is safe for the pre-registration and was not made
   here. §4.2.
3. **`ledger/literature_conformance.md` section 15** names two labels for C11 and C12 that do not
   exist. The discharge in decision row 95 now carries the right ones, but the conformance ledger
   itself is uncorrected. It is a ledger, not a frozen artefact, so an appended correction is
   available. §3.2.
4. **The reserve.** +7 against a floor of 250, unchanged.
5. **The C7 displacement ruling** (+23, form (c) or nothing) remains Phuong's, to be made in
   Overleaf, which is canonical.
6. **`CONTRACT.md`'s optional pointer sentence** remains Ryan's.
7. **Nothing in this package is pushed to Overleaf**, and nothing in it needs to be: no `.tex`,
   no `.bib`, no figure. All five files are in the `ai-gm.ai-master` brain.
