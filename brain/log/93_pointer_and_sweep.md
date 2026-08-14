# S18: the pointer placed, the stale artefacts corrected, and every other row that defers without one

**Date:** 2026-08-14
**Repo HEAD at start:** `c5fdab45`
**Overleaf clone HEAD:** `fbf64a2`, `origin/main` **`99ee32b7`**
**Store ceiling:** `l1_daily` MAX(date) = **2026-07-07**, unchanged. Nothing in this
package touches code, the store, or an ingest path, so it could not have moved.

**Written:** this report, plus three append-only insertions (decision log row 5,
`log/15`, `log/16`). **Not written:** any `.tex` file, `ref.bib`, any numbered
decision-log row body, `CONTRACT.md`, `FLAGS.md`, `format_accepted.txt`. No
reduction made. Nothing from report `90` Part 3 applied. Zero em-dashes in
everything written here.

---

## Part 1 · The forward pointer from row 5 to row 6(a)

**Written, and placed deliberately.** 16 insertions, **0 deletions**
(`git diff --numstat`: `16 0`).

**Placement.** The pointer sits at **lines 138 to 153**, as a new bullet
**immediately after** the bullet that ends "is a call for Nam, not made unilaterally
here" (line 137). It is not at the end of row 5's block, which is line 185, and
that was a decision rather than convenience.

The reason is the failure mode this project has already met once: a supersession
written a hundred lines below the text it supersedes is never read by anyone who
reads the superseded text. Row 5 is a 75-line block of ten sub-bullets. A reader
arriving from a grep for "call for Nam", which is exactly how S14, S15 and S16
arrived, lands on line 136 and stops. A pointer at line 185 would have been true and
invisible. The one at line 138 is the next thing that reader sees.

**Nothing above it is edited.** The bullet it follows still says what was true on
2026-07-08, and the new bullet says so explicitly, because a row that quietly
acquired a different meaning is worse evidence than one that carries both states
with dates.

**What it carries:** the resolution and its side (row 6(a), on the side of 6), the
verification at source rather than from either row (`ingest/refresh.py:302`, commit
`a04eb2d6`, 2026-07-08 19:20:09 +0100), the reason the store's `rung4_chronos2` band
is not counter-evidence (written 15:23:41, four hours and fifty-seven minutes before
that commit), and a pointer on to rows 111(a), 111(b) and 111(d).

---

## Part 2 · The four artefacts at row 111(e)

Item 2 required each to be confirmed **stale rather than frozen** before touching.
The confirmations differ per artefact and two of the four came out differently from
the other two, so they are given separately.

### The mutability rule these were checked against

`PRJ93_RULES.md:218-232`, "**Corrections are appended, never overwritten**": a later
finding that supersedes an earlier one is recorded with what it supersedes and why,
because "a silently revised claim leaves a reader unable to tell a verified statement
from a lucky one". The named patterns are `log/73` §4 and decision rows 101 and 106.

**Precedent that numbered reports are amendable and not frozen**, found rather than
assumed: `log/63:91` carries "## CORRECTION appended 2026-08-06", and `log/72:127`
carries "## 7 · Correction, 2026-08-09", both appended sections inside numbered
reports, both explicitly citing this rule. `CONTRACT.md`'s own header block carries
three corrections "kept visible rather than quietly edited". So the house method is
**append a dated correction section, quote what it corrects, leave the original
standing**, and that is what was done. Neither report carries a frozen, archival or
do-not-edit marker; the only "frozen" artefacts in this project are data
(`21_G12_13a_Frozen_Forecast_Report.md` and the `1d966be` artefact), not documents.

### (1) Decision log row 5, lines 111 to 185

**Stale. Corrected in Part 1.** This is the root of the thread and the only one of
the four the pointer had to go in.

### (2) `log/15_Fidelity_Corrections_Addendum_Report.md:201-205`

**Stale, not frozen. Corrected**, 38 insertions, 0 deletions.

Confirmed stale: the G12.6 bullet asserts in the **present tense** that "the real T3
refit (4 folds, no prophet - pre-existing, unmodified settings) selects plain
`rung4_chronos2`". `ingest/refresh.py:302` reads `n_folds=6`. The sentence describes
a code path that no longer exists.

Confirmed not frozen: last git touch is `19bac325`, 2026-07-09, a bulk rename with no
content change; no immutability marker; the report's only use of "superseded" is at
:87 about something else. It is a build report whose §"Files changed" already records
that it edited the decision log, so it is a working document of the same family.

Appended section: **"CORRECTION appended 2026-08-14 (S18): the four-fold T3 refit no
longer exists"**. It quotes the bullet verbatim in a blockquote, names G12.9a and row
6(a) as where the call was made, verifies at source, and separates **what still
stands** (the gate deciding rather than hand-picking, the divergence being surfaced,
the 0.823/0.834 figures as a record of what the four-fold path produced on the day)
from **what does not** (any reading of it as live or open).

### (3) `log/16_Chronos2_Promotion_Report.md:25-26, :47`

**Stale, not frozen. Corrected**, 52 insertions, 0 deletions.

Confirmed stale on two passages, not one. §0's second bullet says the mechanism
"**uses** a 4-fold, no-prophet backtest", and §0's closing sentence says reconciling
the fold count "**is** a decision for Nam, not made unilaterally here". Both are
present tense about a state that ended at 19:20 on the evening of the same day this
report was written.

Confirmed not frozen: same evidence as (2), same rename commit, no marker.

**This is the artefact where the correction most needed to be visible.** §0 is headed
"Read this first: the headline finding", so it is the first thing any reader of this
file meets, and the divergence is that headline. The appended section says so
explicitly as its reason for existing.

Appended section: **"CORRECTION appended 2026-08-14 (S18): §0's headline divergence
is closed, and §0 is where a reader meets it"**. Both passages quoted verbatim, the
resolution named, source verification given, and the same stands / does not stand
split. It adds the consequence for the store band, so that nobody cites
`conformal_rung4_chronos2` as evidence the six-fold path selects the plain arm.

**One incidental observation, not acted on.** `log/16` line 10 states "No em-dashes
are used in this report, per the spec's style rule". The file contains **29**, at
:39, :46, :49 and elsewhere. That claim was false when written and is outside this
package's scope. Reported, not edited.

### (4) `brain/CONTRACT.md:123, :152-153, :175`, NOT TOUCHED, and it should not be

**Neither stale nor mine.** Both halves of that matter, so both are given.

**It is not stale.** Read at source: `:123` says the exogenous set is "Required for
the served Beer Hall model", `:152-153` distinguishes the ablation verdict binding
"the **Rung-3 GBM only**" from "the served Rung-4 entrant", `:175` names "the served
exo entrant". None of the three describes a fold-count divergence, and none describes
anything as open. Row 111(c) already established that with the refit path selecting
on six folds, these three assertions are **correct going forward**. Row 111(e) listed
the file as "still worth a pointer at the resolution", which is a different and much
weaker claim than the one that got the other three onto the list. Correcting a
correct statement is not a correction.

**It is not mine.** S17 was told "Report only; changing `CONTRACT.md` is Ryan's", and
row 111(c) records that as "**Reported only. `CONTRACT.md` is Ryan's.**" An
instruction to update the artefacts on a list does not silently revoke a named
ownership on one of them, and the confirm-before-touching step in item 2 is exactly
where that has to be caught.

**What Ryan could add if he wants it**, priced at one sentence and not written: a
line in the §4 exogenous block noting that the fold count T3 refits at was unified to
6 at G12.9a (decision log row 6(a)), which is the condition under which the three
assertions hold. That is an addition of context, not a correction of error.

**Net for item 2: three of four handled, one refused with its reasons.** No
`FLAGS.md` entry describes the fold divergence as open; the S17 sweep found none and
this one re-confirms it.

---

## Part 3 · Every other ledger row that defers a decision without a forward pointer

### The method, and the two defects it had first

The log was split into its numbered rows programmatically and each row scanned for
fourteen strong deferral phrases ("a call for", "left open", "deferred", "still
owed", "reserved to the human", "needs an operator", "the human's decision",
"awaits", "stays open", "is a human gate"). Every row-number reference in a matching
row was then extracted and compared against that row's own number, so that a
**backward** citation could not be mistaken for a forward pointer. Every survivor was
read by hand and its deferred item traced through the rest of the log.

**The first version of this sweep could not see row 5, which is the row the whole
package is about.** The log's numbering is not continuous: Section A runs 1 to 6,
**Section B RESTARTS at 1 to 5**, and Section C then CONTINUES at 6 to 111. The
parser required each row number to be its predecessor plus one, so every Section B
row was silently dropped, including row 5. It reported a clean list over 111 rows and
the list was over the wrong 111. A second version reset at each section heading and
then dropped all 106 Section C rows instead. Only the third parse, which accepts
`n == previous + 1` **or** `n == 1` immediately after a section heading, reads all
117 rows. **The instrument was blind over exactly the row that motivated it**, and it
reported a number the whole time.

**The second defect was the criterion.** Item 3 says "ends by deferring", and the
first sweep matched only each row's closing eight lines. **Row 5 does not end by
deferring.** Its deferral is at line 136 of a 75-line block and its last bullet is the
G12.7 sensitivity check. A criterion taken literally would have excluded the one row
known to have the defect, so the scan was widened to the whole row body. That is the
scope reported below.

**What it still cannot see.** A row that defers in wording none of those fourteen
phrases covers is not in this list, and nothing here can find it.

**Six false positives**, named so nobody re-derives them: rows 2 and 3 of Section A
(a negation, and a pending resolved in its own sentence), row 10 (both follow-ups
discharged in the row), row 23 ("the pass report 32 §6 deferred", a backward
reference to a debt this row pays), row 62 ("rather than left to the three-tier
degrade", a design choice), and rows 97/102 ("zero unresolved references", a result).

### Class A: deferred, since decided, no forward pointer. Row 5's exact defect.

| Row | Lines | What it defers | Where the decision was made |
|---|---|---|---|
| **B5** | 111-185 | fold-count reconciliation, "a call for Nam" | **C6(a)**. Pointer added in Part 1 |
| **12** | 385-410 | "the G12.12c A-vs-B **deferred**" | **row 14**, "measured A-vs-B" |
| **13** | 412-444 | "L3 not scored (item-taxonomy reconciliation **deferred**)" | **row 16**, G12.16 taxonomy reconciliation |
| **75** | 1915-1926 | "**G1 remains the human's decision and is deliberately left open**" | **row 79** decided it (D-D1, RMSSE adopted as headline); **row 92** executed it |
| **76** | 1928-1936 | all five DIVERGES--DEFENSIBLE rows "**reserved to the human**" | **rows 79, 80, 81, 82, 84**, one per row, D-D1 through D-D5 |
| **85** | 2274-2323 | the ruler conflict, "**NOT RESOLVED -- methodology decision, human gate**" | **row 87, Gate A** |
| **87** | 2356-2396 | "**Still owed:** `tab:ladder` re-score, D-F6, V1/V3, D-D paragraphs" | **rows 91 and 95** |
| **88** | 2398-2425 | "**Still owed:** `tab:ladder` push + gate 4, D-F6, V1/V3, D-D paragraphs" | **rows 91 and 95** |
| **90** | 2457-2475 | "**Still owed:** D-F6, V1/V3, D-D1/D-D2/D-D4/D-D5 paragraphs" | **row 91** wrote them, **row 95** verified them closed in the text |
| **91** | 2477-2515 | "**CONFLICT FLAGGED, NOT RESOLVED** ... Needs an operator decision" | **row 92**, the next row |

**Ten rows, and they are four threads, not ten independent misses.**

**Row 85 is the one that has already cost this project a day.** Its deferral is the
`harness.REPORTED_BASIS` against `config.VENUE_SCALE_BASIS` ruler conflict, marked
"NOT RESOLVED -- methodology decision, human gate". It was resolved two rows later at
row 87 Gate A, which records `VENUE_SCALE_BASIS` becoming "the single authority".
**`PRJ93_RULES.md:199-206` is written about this exact failure:** on 2026-08-06 the
conflict "was reported as the highest-priority open blocker, gating a figure
programme and a day of compute", when it "had already been ruled and executed --
decision row 87, Gate A". The rules section titled "Any claim that something is OPEN
gets verified before it is reported" exists because of row 85. **The rule was written
and the pointer was still never added**, so the row that caused it still reads as
open today. A rule that tells every future reader to double-check is a weaker
instrument than a pointer that makes the check unnecessary.

**Rows 75, 76, 91 and 92 are one question recorded four times.** Row 75 leaves the
MASE-versus-RMSSE headline "deliberately left open"; row 76 lists it among five
decisions "reserved to the human"; row 79 decides it; row 91, twelve rows after the
decision, records a "CONFLICT FLAGGED, NOT RESOLVED" because the chapters still
printed MASE and asks for an operator decision; row 92 flips it. **Row 92 points
backward** ("which row 91 had flagged as unimplemented") and that is the only link in
the chain. Every forward hop is missing.

**Rows 87, 88 and 90 are one debt, not three.** Each ends with a "Still owed" list
that is a shortened copy of the one above it, four items then four then three, and
none points forward to rows 91 and 95 where the items were written and verified. A
reader who greps "Still owed", which is what those bold words invite, meets an
outstanding debt that was paid.

**Row 76 is the widest single miss**: five deferred decisions in one row, all five
subsequently taken in five consecutive rows, and not one pointer.

### Class D: conditional deferrals whose condition has since been met

Neither is stale on its face, which is what makes them worth separating.

| Row | Lines | The condition | Status |
|---|---|---|---|
| **93** | 2553-2580 | "`conclusion.tex` is a 7-line stub with no Further Work section ... **It should move when the conclusion is written**" | The conclusion **is** written, with Further Work at `conclusion.tex:210-224`. **No row records whether the counterfactual moved out of `sec:res-mcs-functional`.** |
| **95** | 2608-2650 | "**C11 and C12** (both deferred to a discussion, and `chapters/conclusion.tex` is still the unedited template stub)" | Same condition, same silence |

**This is a question the sweep surfaces and does not answer**, because answering it
means auditing the dissertation text, which item 3 did not ask for.

### Class B: deferred, still open, and pointing at nothing

| Row | Lines | What it defers |
|---|---|---|
| **9** | 324-335 | "the retention decision for the `wc_*` features ... **stays open pending** that data". No FLAG, no tracker, and no later mention anywhere in the log. **This row is the only record that the decision is owed.** |
| **45** | 1569-1579 | "**S8b deferred:** the live half **awaits** a keyed environment". Genuinely blocked, but no flag id and no owning ledger named. |

### Class C: deferred WITH a named tracker. Not the defect, listed for completeness.

- **Row 7(f)**, line 304: Neon-SOR topology, "a Ryan decision (`FLAG-STORE-SOR`)", tracker at `FLAGS.md:403`.
- **Row 25(c)**, lines 1030-1040: the reopening-venue guard, "deliberately LEFT OPEN" with `FLAG-SEGMENT-FALSE-REJECT` opened and pinned by a test.
- **Row 39**, line 1516: Ellel gate "inert behind `ELLEL_DIARY_LIVE = False` pending the booking diary", `FLAG-ELLEL-DIARY`, tracker at `FLAGS.md:984`.
- **Row 65**, lines 1807-1816: the five DEFENSIBLE and eight UNRESOLVED conformance rows, owned by `ledger/literature_conformance.md` and enumerated at row 76.
- **Row 110**, lines 3163-3226: "Not applied. This remains Phuong's ruling", pointed at from row 111.

### The convention already existed, and was used correctly three times

This is an omission, not a missing practice. **Row 7(e)**, line 302, ends "stays open
pending a June-inclusive store **(see row 9)**". **Row 6** points forward to row 7.
**Row 32** defers "to S3's MCS" by work-package name before that set exists, and
**row 35** cites row 32 back when it applies the rule. Three rows out of 117 close a
deferral properly. The other sixteen do not.

**No pointers were added beyond row 5.** Ten Class A rows, two Class D, two Class B
and five Class C are listed above; the list is the deliverable.

---

## Part 4 · The push has NOT landed, and what is therefore verifiable

**`origin/main` is `99ee32b7`.** Verified against the remote after
`git fetch origin`, not from a local ref. The clone is **ahead 2**: `f966f3d4` (the
eleven repairs) and `fbf64a2` (the ligature fix). **Item 4's precondition is not met.**

**What that means, said plainly.** Every number below is measured at the local clone
HEAD `fbf64a2`. **`origin/main` does not hold any of it.** The document Overleaf
serves still says "misses by construction" at `chapters/results.tex:608`, still
carries the ten other claims report `90` priced, and still has the margin spill. A
green measurement here is not a green submitted document, and this section is written
so that it cannot be quoted as one.

### The three measurements, in their correctly scoped forms

**Counted body: 19,993.** `texcount -0 -sum -merge -total` over exactly the seven
files `\bodywordcount` names (`main.tex:256`): the six chapters plus `abstract.tex`.
**Margin +7 against 20,000, which is 243 below this project's own reserve floor of
250** (`ledger/reduction_cost_register.md:810`). Scoped: this counts the body only;
the appendices are a further 9,597 words that the declaration excludes on the 8C-7
supervisor confirmation, not on the submission rules.

**Format gate: PASS, and the scope is two numbers not one.** `formatcheck.py` on
`main.pdf` (verified current: no `.tex` or `.bib` file is newer than the PDF, and no
`.tex` is modified in the working tree):

- `--body-from 21`: "scanned **95 pages of 115**, **2588 justified lines**", calibration 84%.
- `--body-from 1`: "scanned **115 pages of 115**, **2914 justified lines**", calibration 79%.

Both PASS section 1 with "(none unaccepted)". **The 115/2914 figure S17 reported is
the whole-document scan; the canonical invocation in `PRJ93_RULES.md` uses
`--body-from 21` and scans 95.** Both are given because a PASS is only as wide as what
it scanned. Sections 2 and 3 are advisory and unchanged: 26 INNER gaps over 60pt, 11
floats 2+ pages from their reference, 3 algorithms unreferenced by number.

**Test suite: exits 0, over 642 of 643 tests, with 1 deselected.** Run in
`.venv-eval` over `brain/tests/`, deselecting the one network-dependent test by node
id per the scoped form report `87` item 22 fixed:
`tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`,
which downloads Chronos weights and fails unauthenticated. It still carries **no
marker**, so the deselection is by node id and a bare `pytest` still collects it.
Collection reports "**642/643 tests collected (1 deselected)**"; the full run exits
**0** in roughly 35 minutes. Scoped: this is the brain suite, not the dissertation.
Nothing in S18 touches `brain/` code, so this result cannot have been affected by it,
and it is reported as an unchanged baseline rather than as evidence about anything
written here.

**Two method notes, because the first two attempts at this measurement were both
wrong in the same family.**

*First:* the suite was run as `pytest ... 2>&1 | tail -15` and the shell reported exit
0. **That was `tail`'s exit code, not pytest's**, and the summary line fell outside
the fifteen lines captured, so the run proved nothing. Re-run redirecting to a file
and reading pytest's own status.

*Second:* that re-run exited 0 and printed **no counts at all**. `pyproject.toml`
already sets `addopts = "-q"`, so passing `-q` again makes it **`-qq`**, at which
pytest suppresses the summary line entirely. A green run and a run that collected
almost nothing would have looked identical on stdout. The counts above come from a
separate `--collect-only` pass.

Both are the `pdftotext` defect from S17 wearing different clothes: **an instrument
that reports less than you assume, in a way that reads as success.** The general
guard is the one `formatcheck.py` already implements, which is to print the size of
what was examined next to the verdict.

### The command, unchanged from report 92

```
cd /Users/hapuna/Downloads/prj93-overleaf
git push origin main
```

Nothing staged first. `.gitignore` covers only `main-words.sum` and `svg.sty`, so
`git add -A` would sweep 14 build artefacts and two `.DS_Store` files into the commit.
Post-checks: `git rev-parse origin/main` no longer `99ee32b7`, and Overleaf's
`chapters/results.tex:608` reading "traded: drawn from the trading distribution"
with no "misses by construction".

---

## Part 5 · A fifth stale artefact the row 111(e) list did not have

**`ledger/format_accepted.txt` still carries the accept line for the defect S17
repaired**, and by that file's own rule it should not.

The file's header states the rule: "**Delete a line the moment its defect is repaired
-- an accept file nobody prunes is an accept file that hides the next regression.**"
The live line is `5.0 staff`, carried since 2026-08-11 with a note saying "ruling
pending" and "STILL LIVE after the 2026-08-13 source swap".

**It is provably dead.** The gate run above reports "0 accepted", meaning nothing
matched it. Run with **no accept file at all**, the gate still returns
`VERDICT: PASS` with "(none unaccepted)". The `fbf64a2` tie removed the defect the
line existed to excuse.

**Why it matters rather than being tidy-up.** The line is keyed on the substring
`staff` with a 5.0pt ceiling. While it stands, any future line anywhere in the
document that puts up to 5.0pt of ink in the margin and contains the word "staff"
passes the gate silently. That is precisely the regression-hiding the header warns
about, and the word is common in a hospitality dissertation.

**Not deleted here.** It is not one of the four artefacts item 2 named, and pruning a
gate's escape list is a change to what the gate will accept in future. Deleting the
line is one line and changes no measurement today, since the gate already passes
without it. **Recommended, and left for a ruling.**

---

## What this package leaves open

1. **The push.** Unchanged from report `92` and still the only thing blocking six
   false or inconsistent statements from leaving the submitted document. Two commits,
   one command, a person at a terminal.
2. **Nine more Class A rows.** Item 3 asked for a list and not for pointers, so the
   list is what was produced. Adding them is nine append-only insertions of the shape
   Part 1 demonstrates, and row **85** is the one to do first: the rules already carry
   a whole section written about the day that row cost, and the pointer that would
   have prevented it is still absent.
3. **Rows 93 and 95's conditional deferrals.** Whether the trading-venue
   counterfactual and C11/C12 moved into the now-written Further Work section.
   Surfaced by the sweep, not answered by it, because answering means auditing the
   dissertation text.
4. **Row 9's `wc_*` retention decision** and **row 45's S8b live half**, both open
   with no tracker anywhere.
5. **`format_accepted.txt`'s dead `5.0 staff` line**, recommended for deletion.
6. **`CONTRACT.md`'s optional pointer sentence**, Ryan's.
7. **Everything report `92` left open**: the C7 displacement at +23 (form (c) or
   nothing), the residual de-duplication at -16, the Clopper-Pearson interval at +2,
   and the three reserve-restoration levers. All Phuong's, all to be taken in
   Overleaf, which is canonical.

**No reduction was made. Nothing from report `90` Part 3 was applied. No numbered
decision-log row body was edited. Store ceiling 2026-07-07 before and after.**
