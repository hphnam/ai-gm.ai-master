# 99 · S26, three appendix placements applied, and the static-regime disclosure priced

Package S26. Parts 1, 2 and 4 applied; Part 3 priced and applied nowhere; Part 5 verified.
Nothing pushed.

## 0 · SHAs

| repo | start | end |
|---|---|---|
| `ai-gm.ai-master` (brain) | `5ad875bc` | **`6c919a59`** (this report and ledger rows 119, 120) |
| `prj93-overleaf` | `1a5639f` (= `origin/main`) | **`6643753`**, one commit ahead, unpushed |

The Overleaf clone was clean of tracked `.tex` changes at start; the only dirty paths were
build artefacts and `.DS_Store`. The brain repo carried one uncommitted change at start,
ledger row 119, written by S25 and committed here.

**Scope of verification.** The store-ceiling assertion did not run. `duckdb` is not
importable from system `python3` and nothing was installed to make it run, per the package.
So the figures in the applied notes are asserted against the **committed ladder reports and
their git history**, which is where every one of them lives, and against nothing else. No
claim below rests on a live store query.

---

## 1 · What was applied, with measured deltas

Four edits, all in `appendix/`. Every delta is a **whole-body difference** on a throwaway
copy of the live tree, never a fragment counted alone.

| # | edit | file | counted body | appendix |
|---|---|---|---:|---:|
| | baseline at `1a5639f` | | 19,997 | 9,759 |
| 1 | Prophet record | `appendix/tables.tex` | **+0** | +281 |
| 2 | L2/L3 scope reasoning | `appendix/tables.tex` | **+0** | +170 |
| 3 | Oracle labelled unavailable at forecast time | `appendix/pseudocode.tex` | **+0** | +31 |
| 4 | Two stale appendix-letter comments | `tables.tex:2`, `robustness.tex:2` | **+0** | +0 |
| | **after** | | **19,997** | **10,241** |

The three prose deltas sum to 482 and the appendix total moved 482. Counted body is
**unchanged at 19,997**, margin **+3**, as required by item 14. No wording anywhere was
adjusted to reach that figure; it is unchanged because all four edits are outside
`\bodywordcount`'s scope, which is the six chapters plus `abstract.tex`.

### 1.1 The §7.3 partition finding was already applied, and it failed one of this package's two tests

Item 2 of Part 1 reads as a placement to be made. It was made in S24 and has been on
`origin/main` since `6b353cb`. Checked against the package's two hard requirements:

- **Winkler counter evidence: present.** *"it records the lowest Winkler score at all three
  venues (Table~\ref{tab:winkler}), which is the criterion the adoption rule reads, and no
  method displaced it."*
- **Oracle labelled unavailable at forecast time: ABSENT.** The applied text said only
  *"exactly what an oracle grouped on realised occurrence achieves"*. Report 98 §3.2 asserted
  that both its forms *"name the oracle as an oracle"*, which is true and is a weaker property
  than this package requires.

By this package's own rule (*"a form omitting either is not to be applied"*) the standing text
should not have been applied, and it was live. The repair adds the label rather than removing
the form:

> That oracle is a ceiling and not a candidate method: whether the venue traded is not known
> when the band is issued, so grouping on it is unavailable at forecast time.

+31 appendix words, +0 counted. The **full** form is what stands, per item 3; nothing broke.

### 1.2 The L2/L3 note carries the source's reasons, not the brief's paraphrase

The brief gives the Beer-Hall-only ground as *"the only venue with a deep enough item
hierarchy"*. `hierarchy/reconciliation_forecast.md:5`, which FIX-9 actually wrote, gives a
sharper one: Two River Taps is closed and Ellel is booking-driven at roughly 64 trading days,
so **their splits would be sparser than the Beer Hall's already-under-covering item bands**.
The applied note carries the source. It also carries both halves of the base-forecaster
reason from `:8`, the roughly thirty item-level series being individually too sparse to fit
without overfitting, and coherence depending on the summing matrix alone.

That is why the note prices at +170 rather than the +130 of the earlier draft. Zero counted
words either way, so the difference costs nothing.

---

## 2 · The Prophet record: anchor, grounds, and one deviation

### 2.1 Anchor

**`appendix/tables.tex`, the "committed adoption gate" section, immediately after
`tab:ladder` and its trace comment.** Grounds:

1. **It is the table the note corrects.** `tab:ladder` lists exactly nine models. The note
   explains the tenth row's absence at the only place a reader can see that a row is missing.
   Every other candidate site would send the reader back here.
2. **`appendix/project_specification.tex:293` is the only current occurrence of the word
   Prophet in the document and cannot host the note.** That appendix is a verbatim HC54
   reproduction whose header forbids rewording, and the occurrence is a *plan* sentence
   (*"exponential smoothing or Prophet-style models"*), not a statement about an entrant. A
   note attached there would be a result placed inside a reproduced planning document.
3. **The body sentence at `results.tex:38-40` is true and was not touched**, per Part 6. It
   says two entrants scored at no venue, one for want of its backend. The appendix now
   supplies which one and what it had scored.

### 2.2 Every fact item 4 requires, and where it is

| required | in the note |
|---|---|
| the entrant is Prophet | *"It is Prophet, a decomposable additive model carried in a separate backend"* |
| 0.799 rolling, 0.824 static at the Beer Hall; 0.709 at Two River Taps | stated verbatim |
| named winner outright in the Beer Hall report | *"it was for a time the Beer Hall's selection, named outright in that venue's report"* |
| regenerated in an environment without the backend | *"that backend was not present in the environment where they were last regenerated"* |
| **no adopted model moves: 0.779 against 0.799 on the same folds** | *"At the last gate that scored it, the exogenous foundation arm stood at $0.779$ against Prophet's $0.799$ on the same folds, and the change that dropped the backend left that selection untouched"* |
| the ETS row-shift test (item 5) | the closing two sentences, Beer Hall 0.825 to 0.799 against Two River Taps 0.584 to 0.597 |

### 2.3 Deviation: the SHAs are in the trace comment, not the prose

Item 4 names `d4f347d9` and `a04eb2d6` as content of the note. They are in the note, in its
`% Trace:` comment, not in the rendered sentences.

**Grounds.** Every provenance pointer in this document sits in a `% Trace:` comment; there is
no precedent anywhere in `chapters/` or `appendix/` for a git SHA in rendered prose, and an
appendix of results tables is not a place a marker expects commit identifiers. The comment is
part of the note, costs zero words either way, and a future session reading the source finds
the SHAs at the sentence they support. **If the SHAs are wanted in the rendered text, that is
one edit and still +0 counted.** Flagged rather than assumed.

### 2.4 Two facts the brief did not have, both verified and both in the note

- **Prophet never scored at Ellel.** At `a0fbd64e` every Ellel entrant above Rung 1 was
  capped, `rung2_prophet` included. `a04eb2d6` uncapped Ellel's rungs and dropped the backend
  **in the same change**, so Ellel's entire Rung 2 to Rung 4 row set has only ever existed
  without Prophet. D24's superset guarantee was never true at that venue.
- **The exogenous arm's move from 0.779 to 0.745 is a different commit.** `a04eb2d6` dropped
  Prophet and left the exogenous arm at 0.779; `c4efe3cc` later took it to 0.745, which is the
  value `tab:ladder` prints. The note says so, because a reader comparing the note's 0.779
  against the table's 0.745 two paragraphs above would otherwise read a contradiction. The
  brief's framing is exactly right on the point that matters: **same commit, same folds, and
  the order does not change.**

---

## 3 · The static-regime disclosure, priced and NOT applied

### 3.1 The four passages, verbatim, with their weight

Weights are counted-word costs measured by removing the passage from the live tree and
differencing the whole body, not by counting the fragment.

**`chapters/methodology.tex:374-376` (26 words) inside `sec:ladder`:**

> A rung is adopted only if it beats both the seasonal-naive benchmark and the robust
> day-of-week baseline on rolling-origin root mean squared scaled error at the basis ruled in
> Section~\ref{sec:ruler}, and at Ellel on the unscaled equivalent. The committed gate whose
> results Section~\ref{sec:res-ladder} reports predates that ruling and its difference is
> disclosed where the older figures appear. **The ladder exists to make the null expensive to
> reject: a foundation model is served only where it defeats a benchmark that costs nothing to
> compute.** Appendix~\ref{app:pseudocode} states the adoption rule and its fail-closed
> conditions as pseudocode.

**`chapters/results.tex:35-38` (46 words) inside `sec:res-ladder`:**

> It served the exogenous foundation arm at the Beer Hall at $0.745$ MASE, exponential
> smoothing at Two River Taps at $0.597$, and the robust day-of-week median at Ellel at
> $0.572$ (Table~\ref{tab:ladder}, Appendix~\ref{app:tables}), so capacity paid at the anchor
> venue and not at the two thin ones.

**`chapters/results.tex:52-58` (67 words) inside `sec:res-demonstration`:**

> At the Beer Hall the number of origins changed which model the gate selected. Evaluated at
> the current ceiling on the original six folds, the gate selected the robust day-of-week
> baseline and placed the served foundation model second of nine, $0.045$ behind it. Evaluated
> on $273$ origins over the same frame, the ordering reversed: the served model returned to
> first and the day-of-week baseline fell to fifth.

**`chapters/discussion.tex:310-390`, `sec:disc-limitations` (729 counted words, 81 source
lines).** Five paragraphs: four problem properties, three circumstance properties, four
disclosed biases, and five assumptions with their consequences. The fifth is where a
regime-scope assumption would sit if it went here.

### 3.2 Which site is the right home, and why it is not Limitations

**The clause belongs at `methodology.tex:375-376`, the adoption-principle sentence itself.**

The grounds are not preference and not proximity.

1. **Only that sentence over-claims.** The two Results passages are both correctly scoped
   already, in their own text: `results.tex:35` is introduced as *"the gate's own record"*
   under a protocol the same paragraph names, and `results.tex:53-55` states *"Evaluated on
   $273$ origins over the same frame"*, which is inside the rolling regime. Neither asserts
   anything about a static block. **The methodology sentence is a general principle in the
   present tense with no regime attached at all**, and it is the sentence the ladder chapter
   is built to justify.
2. **A qualification in Limitations cannot reach the reader who needs it.**
   The adoption principle sits in `sec:ladder`, §3.6, printed page **20**;
   `sec:disc-limitations` is §5.4, printed page **49**. Twenty-nine pages, both figures read
   off `main.aux` rather than estimated. This is the failure mode already recorded for this
   document at
   `Decision_and_Resolution_Log.md` and in the S1 supersession finding: a correction placed
   far below the text it corrects is read by nobody who reads the text it corrects. A reader
   who accepts the principle in Chapter 3 and applies it has already acted before Chapter 5
   qualifies it.
3. **Limitations would also be the wrong category.** Its five-assumption paragraph names
   assumptions that the results *rest on*. The static-regime failure is not an assumption
   behind a reported number; it is a bound on a stated rule. Put there, it would read as a
   caveat about the evaluation rather than as a scope limit on the principle.

An appendix is excluded outright, for the reason the package gives: a body claim qualified
only in an appendix is still an unqualified body claim. That is also why this item cannot be
made free the way Parts 1 and 2 were.

### 3.3 The three forms, verbatim, with signed deltas

All replace the sentence *"a foundation model is served only where it defeats a benchmark
that costs nothing to compute."*

**F1, minimal, names the regime without numbers (+15):**

> a foundation model is served only where it defeats a benchmark that costs nothing to compute
> on the rolling-origin protocol, which is the only regime in which the comparison was made.

**F2, carries that the served arm errors there (+31):**

> a foundation model is served only where it defeats a benchmark that costs nothing to compute
> on the rolling-origin protocol. The claim does not carry beyond that regime: evaluated
> instead on a single held-out block, the served arm raises an error and returns no forecast at
> all.

**F3, also carries 0.704 and 0.721 (+47):**

> a foundation model is served only where it defeats a benchmark that costs nothing to compute
> on the rolling-origin protocol. The claim does not carry beyond that regime: evaluated
> instead on a single held-out block, the served arm raises an error and returns no forecast at
> all, on a block where the robust day-of-week baseline scores $0.704$ and the univariate
> foundation arm $0.721$.

A fourth was measured because it changes the answer to item 11. **F0, a bare scope phrase,
the cheapest wording that names the regime at all (+4):**

> a foundation model is served only where it defeats a benchmark that costs nothing to compute
> on the rolling-origin protocol.

### 3.4 The de-duplication, re-measured in situ

Report 92's **−16 does not reproduce**, as the package anticipated. Its splice is not
recoverable from report 91 or 92, so this is a new one, constructed to remove **only** material
Discussion already carries: *"in opposite directions"* is at `sec:disc-answers` RQ4, and the
overlapping-origins ground for calling the intervals optimistic is in the five-assumptions
paragraph of `sec:disc-limitations`.

At `conclusion.tex:155-158`, replacing

> is miscalibrated. The served band missed nominal at all three venues, in opposite directions,
> on exact intervals declared optimistic because overlapping origins do not supply the
> independence they assume (Table~\ref{tab:coverage}). Which venue fails in the unsafe
> direction is not visible in those marginals:

with

> is miscalibrated. The served band missed nominal at all three venues on exact intervals
> declared optimistic (Table~\ref{tab:coverage}), and which venue fails in the unsafe direction
> is not visible in those marginals:

**measures −12, not −16.** Nothing unique to the conclusion is lost: Ellel's $0.692$, the
largest-miscalibration claim, the Beer Hall standard-error comparison and the exchangeability
mechanism all survive untouched.

### 3.5 Funded positions

Baseline 19,997, margin **+3**. De-duplication alone: 19,985, margin **+15**.

| form | alone | margin | with de-duplication | margin | fits? |
|---|---:|---:|---:|---:|---|
| F0 bare scope phrase (+4) | 20,001 | **−1** | 19,989 | **+11** | only with de-dup |
| F1 minimal (+15) | 20,012 | −12 | 20,000 | **+0** | only with de-dup, zero reserve |
| F2 plus the error (+31) | 20,028 | −28 | 20,016 | −16 | no |
| F3 plus the numbers (+47) | 20,044 | −44 | 20,032 | −32 | no |

### 3.6 Item 11, plainly

**No form fits without the de-duplication.** Not F1, and not even F0, a four-word
prepositional phrase, which busts the cap by one word. The margin at `1a5639f` is +3 and the
cheapest honest wording of this disclosure is +4.

With the de-duplication, two fit: **F0 at +11 reserve** and **F1 at exactly zero reserve**.
Neither reaches the project's own >=250 reserve floor, and F1 reproduces precisely the
"lands exactly on the cap" position report 92 §4.4 flagged as the best available and still
unacceptable.

**The ruling this needs.** F0 and F1 both name the regime and neither says what happens in it.
F2 is the first form that discloses the actual defect, that the served arm produces no forecast
at all outside the rolling protocol, and it is 16 words beyond reach even after the
de-duplication. So the choice is not between three strengths. It is between **naming a scope
limit without its content** (F0 or F1, affordable) and **disclosing the defect** (F2 or F3,
not affordable without a reduction this package does not authorise).

**Nothing in Part 3 was applied.**

---

## 4 · Part 4, and what the fix uncovered

`tables.tex:2` said *"Appendix D"*. It is **Appendix C**: `main.tex:438-450` inputs
pseudocode, robustness, tables, project_specification in that order, and `main.aux` confirms
it, `app:pseudocode` = A, `app:robustness` = B, `app:tables` = C, `app:specification` = D.
Corrected. It is a `%` comment, so **+0 counted words**, confirmed by measurement.

**`appendix/robustness.tex:2` also said "Appendix C".** So the authorised fix created a
collision, two files each claiming C. Robustness is B, and its header was corrected too. That
is one comment word beyond the package's literal instruction; the alternative was leaving a
duplicate claim I had just created.

**Nothing references the old letter in prose.** Verified across `chapters/`, `appendix/`,
`abstract.tex` and `notation.tex`: **51 appendix cross-references over 21 distinct labels**,
every one through `\ref{app:...}`, so all of them follow the lettering automatically. The
substance of `main.tex:419` holds, but **its count is stale**: it says 22, which was true on
2026-08-09 and is now less than half the real figure. The claim it carries, that lettering is
not load-bearing, is confirmed here by measurement rather than inherited.

Nine other literal letter strings survive, **all of them in comments and all of them
historical**: `results.tex:148` *"Demoted to Appendix D on 2026-08-09"*, `results.tex:642`,
`:877`, `:886`, `methodology.tex:366`, `robustness.tex:16`, `:113`, `:170`, `:172`, and
`robustness.tex:400`. These record what the letter was when a decision was taken. **They were
left alone deliberately**: rewriting a dated provenance note to today's lettering would
falsify the record it exists to keep. The two headers were different, being present-tense
claims about what the file is.

---

## 5 · Verification

| check | result |
|---|---|
| counted body (item 14) | **19,997**, unchanged, margin +3 |
| appendix before / after (item 15) | 9,759 -> **10,241**, +482 |
| compile errors | **0** |
| undefined references | **0** |
| undefined citations | **0** |
| floats lost | **0** |
| `latexcheck` | **PASS** |
| `formatcheck --body-from 21` | **PASS**, no unaccepted ink outside the text block, 0 accepted entries used |
| pages before / after (item 17) | **115 -> 116** |
| page limit | **none is stated**, see below |

**Labels resolve, checked in `main.aux` rather than inferred from a clean compile:**
`tab:recon-decomp` = C.3 p90, `app:conformal-bounds` = A.9.2 p76, `app:tables` = C p88,
`tab:ladder` = C.1 p88, `tab:winkler` = 4.8 p40, `app:mondrian` = A.9.3 p76. 145 labels in
total, zero undefined.

**The new prose is in the rendered PDF**, checked with `pymupdf` on `build25/main.pdf`: the
Prophet record on page 103, the L2/L3 note on page 104, the oracle label on page 91.

### 5.1 Boxes against a controlled baseline (item 18)

`1a5639f` was rebuilt in this session, same TeX Live, same stub, same invocation. Not read
off the committed `main.log`.

| | baseline `1a5639f` | after |
|---|---|---|
| overfull hboxes | 4 | **4, identical list and identical overflow points** |
| underfull hboxes | 14 | **14, identical list and identical badnesses** |
| pages | 115 | 116 |

The four overfull boxes are 5.72pt `pseudocode.tex`, 5.47pt `methodology.tex`, 2.81pt
`notation.tex`, 0.98pt `project_specification.tex`. **No box moved.** Three appendix
additions and one page, with the box population byte-identical.

`formatcheck` section 2 (advisory): INNER gaps above 60pt fell 26 to 23, total INNER rose
7,909pt to 8,030pt. Section 3 (advisory): 11 floats sit 2 or more pages from their nearest
reference in both builds; the only movement is `tab:recon-decomp` from page 104 to 105, which
is the L2/L3 prose pushing its own table down one, drift 57 to 58.

### 5.2 The page limit, quoted from the submission documentation

**No page limit is stated.** `knowledge/00_marking_criteria.md:405` carries
*"Whether any page limit applies"* in the list headed *"Each of these is a plausible
mechanical constraint that the two source documents do **not** state. Do not invent a rule"*,
and the item is unstruck, unlike the three resolved word-count questions above it. So the
answer is not "the limit is large enough"; it is that **the issued documentation is silent and
the question has never been put to the module handbook, Moodle or the supervisor.** The 116
pages are reported for the record, not against a threshold.

### 5.3 The suite

`669 tests across 51 files`, derived by summing `--collect-only -q` per-file counts, because
this project's pytest config prints no `N passed` line and `grep -c '::'` on the collect
output returns a fake zero.

Run as `.venv-forecast/bin/python -m pytest tests/ -q` with the one unmarked
network-dependent test deselected by node id,
`tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`,
which otherwise falls back to downloading Chronos weights unauthenticated.

**GREEN. 667 passed, 1 skipped, 0 failed, 0 errors, exit 0**, in 21 minutes wall.

The verdict is **not** read off the exit code alone, per the package. This config prints no
`N passed` line, so the counts are a census of the progress marks: 668 marks in the `[ nn%]`
lines, 667 `.` and one `s`. That reconciles exactly against collection, **669 collected minus
the 1 deselected node id = 668 run**, so no test silently vanished between collection and
execution. No `FAILURES` and no `ERRORS` section appears in the output. The single `s` is the
expected venv-boundary skip. The only warning is a `StarletteDeprecationWarning` from
`fastapi/testclient.py`, pre-existing and unrelated.

---

## 6 · Unsolicited findings

**F1. The applied §7.3 form did not meet this package's own bar, and it was already live.**
Covered at 1.1. Report 98 checked its forms for *"names the oracle as an oracle"* and passed
them; this package asked for *"unavailable at forecast time"*, which no form had. A review
criterion that is one word weaker than the requirement passes text the requirement rejects.

**F2. `robustness.tex:2` was stale too, and the authorised fix created a collision.** Covered
at Part 4. The single-site instruction was accurate about the site it named and silent about
the one that made the fix incomplete.

**F3. Prophet never scored at Ellel, so D24 was never true there.** `a04eb2d6` uncapped
Ellel's rungs and dropped the backend in one change. Ledger row 119 records Ellel as "capped
at Rung 1" before the regeneration, which is right, but the superset guarantee is retired at
three venues and was only ever live at two.

**F4. `log/02_Phase2_Remediation_Report.md:112-113` mixes report vintages in one table.** Its
Beer Hall row reads *"PASS - Prophet 0.799"* and its Two River Taps row *"ETS 0.597"*. Prophet
0.799 is pre-regeneration (`a0fbd64e`); TRT ETS 0.597 is post-regeneration (`a04eb2d6`, where
the pre value was 0.584). **No single run produced both.** Not repaired: it is a numbered
historical report and repairing it is not in scope.

**F5. Row 119's clause (e) attributes the exogenous move to the wrong commit.** It lists
*"rung4_chronos2_exo $0.779$ to $0.745$"* among values that *"moved in the same
regeneration"*. That move is `c4efe3cc`, a later change; at `a04eb2d6` the arm was still
0.779. The row's conclusion is unaffected, since the row-shift is ruled out on the Two River
Taps pair and not on this. **Not edited**, per the package's "no numbered ledger row edited";
the correction is recorded as row 120 instead.

**F6. Report 92's de-duplication figure is 4 words optimistic against the best splice I could
construct.** −12, not −16, and the difference is the whole margin between F0 fitting with
+11 reserve and something tighter being needed. The package was right to require a
re-measurement.

**F7. Two silent-empty-scan failures in this one session, both caught.** `texcount` returned
**0** when passed a shell variable holding a file list, because zsh does not word-split; and
`pdftotext` is **not installed on this machine**, so a `2>/dev/null` redirect produced a
zero-byte extraction that read as ABSENT for all six needles checked against the rendered PDF.
Both were re-run with a working instrument and both then reported the opposite. Same class as
`grep -c '::'` on the collect output.

**F8. Report 98's own drafting flag survives into the applied text.** It noted that
*"the ninetieth percentile"* is loose for the `ceil((n + 1) x 0.90)`-th smallest score. The
applied `app:conformal-bounds` paragraph still says "ninetieth percentile". Zero counted words
to fix. Not touched, no instruction.

**F9. The document still asserts the adoption principle without a regime.** Part 3 is
unapplied by instruction, so as of this report `methodology.tex:375-376` states as a general
rule something the committed reports contradict on a static block, and the static-regime
`ValueError` remains disclosed nowhere in `chapters/`, `appendix/`, `abstract.tex` or
`notation.tex`. This is the open item.

**F10. `main.tex:419`'s cross-reference count is stale by more than half.** It records 22
appendix cross-references, verified 2026-08-09. There are now **51**, over 21 distinct labels.
The conclusion it draws, that lettering is not load-bearing and relettering is safe, is still
correct and was re-verified here; only the number is out of date. Left alone, being a dated
verification note.

**F11. Three algorithm floats are unreferenced by number.** `alg:conformal`, `alg:adoption`
and `alg:detection`, pages 84, 86 and 87. Pre-existing, unchanged by this session, and
flagged by `formatcheck` section 3 in both builds.

### Contradictions with the brief

- **Item 4 prices the Prophet note at +148 appendix words. It measures +267.** The +148 draft
  in report 98's harness named neither the entrant, nor any commit, nor the static figure, nor
  the row-shift test, all of which item 4 requires. The brief's content list and its word
  figure come from different drafts. Appendix words are uncounted, so the divergence costs
  nothing; reported because the number was stated as a prediction.
- **Item 3's L2/L3 note prices at +170, not the +130 of the earlier draft**, for the same
  reason: it carries the source's two reasons rather than one.
- **Item 2 describes a placement to be made that was made in S24**, and the thing actually
  needed there was a repair to the applied form.
- **Item 13 names one stale comment; there were two current-tense ones and nine historical.**

---

## 7 · End state and the push

**Nothing was pushed.** The clone is at the SHA below and Nam pushes by hand:

```
cd /Users/hapuna/Downloads/prj93-overleaf
git push origin main
```

No served path changed, no evaluated path changed, no test removed, no reduction made, no
numbered ledger row edited, no backend installed, nothing else installed. Zero em dashes and
zero en dashes in every file authored or edited in this session, checked by sweep.
