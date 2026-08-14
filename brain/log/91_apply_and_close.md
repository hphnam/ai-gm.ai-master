# 91 · S16 · Apply the eleven, correct the ledger, close the disclosure question

**The first package to write `.tex`.** Eleven sites applied, one ledger row appended,
two questions closed. No reduction made, no numbered decision-log row edited, no
served path changed, no test removed. Zero em-dashes.

| | |
|---|---|
| Store ceiling, before and after | **2026-07-07** (`max(date)` on `l1_daily`) |
| Overleaf clone HEAD before | `99ee32b75c8294abc808a2929115a7fb86af438f` |
| Clone HEAD after sync | `99ee32b7`, **unchanged**, `origin/main` identical |
| **Clone HEAD after applying** | **`f966f3d4fd34ffa25f8d36e2b38ac7f463d862b7`** |
| **Push** | **BLOCKED, see section 1.5. `origin/main` is still `99ee32b7`** |
| Counted body, before and after | **19,993**, margin **+7** |
| Ledger row appended | **110**, forward pointer to 109, append only |

---

## 0 · Results before the evidence

1. **The eleven are applied and the count did not move.** 19,993 before, 19,993
   after. Compile clean, boxes identical to a controlled baseline, `ref.bib`
   untouched.
2. **The push is blocked by a local protected-branch guard, not by Overleaf.** The
   commit exists locally and is unpushed. I did not force and did not rebase.
   **This is the one part of the package that did not complete.**
3. **The disclosure question is closed, and not by the route Part 3 anticipated.**
   The rung-4 divergence is not among the six divergences in
   `sec:disc-specification`, but it does not belong there and **there is nothing to
   disclose: the divergence was resolved at G12.9**, verified at
   `ingest/refresh.py:302`. Report 90 section 3.1's +33 disclosure is **withdrawn**.
4. **Part 4's two de-duplications do not exist.** Both were already taken in the 8G
   pass. Report 87 section 3.4 read a table headed "What was taken" as a menu of
   what was available. **Measured saving from each: 0.** The C7 funding decision
   rested on about 33 words spent before report 87 was written.
5. **One span of residual duplication is real and measures 16 words.** It funds the
   C7 displacement to land at **exactly 20,000, margin 0**, and nothing further.
6. **The Clopper-Pearson interval costs +2, not about +6.** Report 88's estimate was
   three times high.

---

## 1 · Part 1, the eleven applied

### 1.1 Sync (items 1 and 2)

`git fetch origin` then compared. **No drift in either direction:** no commits on
`origin/main` that the clone lacks, none locally that origin lacks. Clone HEAD
`99ee32b7` before the sync and `99ee32b7` after. Nobody has edited the document
since report 90 was measured, so its line numbers are current.

**The eleven anchors were verified byte for byte, and verified against the manifest
rather than against my working notes.** The apply script parses the eleven `Current`
and `Replacement` blocks out of `90_patch_manifest.md` itself and requires each
`Current` block to occur exactly once in the target file. All eleven returned OK.
That checks two things at once: that the document has not drifted, and that the
manifest's quoted text is a faithful transcription of the document. Neither was
assumed.

### 1.2 Applied (items 3 and 4)

Applied exactly as the manifest gives them, from the manifest's own text. **No
improvisation, and no wording concern arose worth reporting.** Both divergences from
the S15 brief were taken in the manifest's direction as instructed: site 7 attaches
the qualifier to the arm, and site 9 moves `results.tex:38`.

| Site | File | Δ | In `\bodywordcount` |
|---:|---|---:|:---:|
| 1 | `chapters/results.tex` | 0 | yes |
| 2 | `chapters/discussion.tex` | +2 | yes |
| 3 | `chapters/discussion.tex` | −1 | yes |
| 4 | `chapters/results.tex` | 0 | yes |
| 5 | `chapters/results.tex` | 0 | yes |
| 6 | `chapters/methodology.tex` | −1 | yes |
| 7 | `chapters/results.tex` | +2 | yes |
| 8 | `chapters/results.tex` | −3 | yes |
| 9 | `chapters/results.tex` | +1 | yes |
| 10 | `notation.tex` | 0 | **no** |
| 11 | `appendix/robustness.tex` | 0 | **no** |
| | **net** | **0** | |

A dry run on a scratch copy reproduced 19,993 to 19,993 before the clone was touched.

### 1.3 Verified (items 5 to 9)

| Check | Required | Measured |
|---|---|---|
| `texcount` via the `\bodywordcount` invocation | 19,993 | **19,993** |
| Compile exit | clean | **0** |
| LaTeX errors | 0 | **0** |
| Undefined references | 0 | **0** |
| Undefined citations | 0 | **0** |
| `\ref{sec:exo}` resolves | yes | **section 3.5, page 20** |
| `tab:mcs` resolves | yes | **Table 4.1, page 30** |
| Declaration prints | 19,993 | **19,993** |
| `ref.bib` touched | no | **no**, `git diff` on it is empty |
| Words broken across a line in the PDF | 0 | **0** |

**Item 9 confirmed:** site 6 needed no bibliography change. `ansari_chronos-2_2025`
resolves and `main.bbl` carries exactly one entry for it, because
`literature_review.tex:51` already cited it.

### 1.4 The controlled box comparison (item 8)

A clean unpatched baseline was built in this session, from the same tree, with the
same invocation, with all generated files removed first.

| | Patched clone | Controlled baseline |
|---|---:|---:|
| Overfull | **4** | **4** |
| Underfull | **14** | **14** |
| Errors | 0 | 0 |

`diff` of the two logs' overfull lines: **identical**, byte for byte. The patch is
formatting-neutral. Had this been judged against the committed `main.log`, which
shows three, it would have read as a one-box regression that does not exist.

**One pre-existing failure, reported because it is real and is not mine.**
`brain/scripts/formatcheck.py` returns **FAIL** on the patched PDF: one margin spill
of 3.51 pt on page 108, `appendix/project_specification.tex:113`, "and answers staff".
**It returns the identical FAIL on the unpatched baseline**, same page, same
magnitude, same line, and the same 37 inner-gap pages. So the patch neither caused it
nor cleared it. It sits in the reproduced project specification, the same file as the
0.98 pt overfull box at `:351`. **The formatting gate does not currently pass at HEAD
and did not before this package.** That needs a ruling before submission and is
outside this package's scope.

### 1.5 Commit and push (items 10 and 11)

Commit **`f966f3d4`**, authored `hapuna-namhoang`, no trailer:

> Pin served to the gate's selection, and replace the one claim the measurement refutes

Five files, 21 insertions, 20 deletions. The tracked `.DS_Store`, which was already
modified before this package began, was deliberately left out of the commit.

**The push did not go through.** `git push origin main` was refused by a local
protected-branch guard:

> Blocked: push to protected branch 'main'. Use a feature branch and open a PR.

**This is a local guard, not an Overleaf rejection.** Per item 11 I stopped and did
not force, did not rebase, and did not push to a side branch. A feature branch would
not help here: Overleaf's canonical branch is `main` and the project has no pull
request mechanism, so a branch push would leave the document unchanged while
appearing to succeed. `origin/main` remains `99ee32b7`.

**The eleven repairs are therefore in the local clone and not yet in Overleaf.**
Resolving this needs either the guard relaxed for this repository or the push run by
hand.

---

## 2 · Part 2, the ledger corrected

**Row 110 appended.** Verified append only: `git diff --numstat` reports **65
insertions, 0 deletions**, and the diff contains no removed lines, so row 109 is
intact. Format matched against the existing forward-pointer precedent at row 104.

Row 110 carries five sub-parts: (a) the incomparable pair, with `tab:ladder`'s
provenance and row 5's four-fold triple; (b) the G12.9 resolution and the withdrawal
of the disclosure; (c) the state change, that the eleven are applied and row 109's
closing line no longer describes the document; (d) the de-duplication misread; (e)
the measured funding combinations.

---

## 3 · Part 3, the disclosure question

### 3.1 The section, quoted (item 14)

`chapters/discussion.tex:391-436`, `\section{Divergence from the project
specification}`, `\label{sec:disc-specification}`. **texcount 350.**

> Six things the project specification describes did not hold for the work as done,
> and the specification is reproduced at Appendix~\ref{app:specification}. Three are
> deliverables it undertook to supply the inputs to, where the inputs did not arrive,
> so much of the reduction in scope followed from provisioning rather than from
> judgements about what was worth attempting. Divergence is stated here rather than
> defended.
>
> The first is a divergence in description rather than a shortfall in the work. The
> specification describes the platform as live across four venues and this study
> covers three: four counts the deployment, three is the sample, and the difference
> is the unit of analysis of Section~\ref{sec:design}. The fourth location books
> off-site events and has no site, so it has no daily rhythm to learn whatever it
> turns over. That is a boundary on what the study is about, not a threshold applied
> to data.
>
> The specification offers read access to a dedicated research schema in the
> production database from the first week. No such schema was provisioned at any
> point, so every result here rests on a corpus assembled from source exports into a
> local warehouse. That is the divergence with the widest consequence: the external
> validity of every figure is untested, because the data was prepared by the same
> work that evaluated on it and no independently provisioned copy exists against
> which the preparation could be checked.
>
> Two named deliverables were not reached for the same reason. An agent reasoning
> over the deviation signals is built, frozen and unmeasured, and no qualitative
> manager feedback was obtained, so the term of the objective requiring human
> judgement is unmeasured rather than measured badly. The same absence reaches the
> surfacing measure, whose cost ratio the operator was never asked for, which is why
> the asymmetry the fifth research question posits is declared here rather than
> answered there (Section~\ref{sec:disc-limitations}).
>
> Multi-venue transfer learning, which the specification makes central to its
> modelling approach, was not evaluable for the reason
> Section~\ref{sec:disc-limitations} gives, and this one is not a provisioning
> failure: no arriving input would have changed it.

**The six, enumerated:**

| # | Divergence | Lines | Kind |
|---:|---|---|---|
| 1 | Platform described as live across four venues; the study covers three | 402-407 | description, quantitative |
| 2 | The dedicated research schema was never provisioned | 413-418 | binary absence |
| 3 | The deviation-reasoning agent is built, frozen and unmeasured | 420-421 | binary absence |
| 4 | No qualitative manager feedback obtained | 421-422 | binary absence |
| 5 | The surfacing measure's cost ratio was never obtained from the operator | 422-425 | binary absence |
| 6 | Multi-venue transfer learning was not evaluable | 427-429 | binary absence |

### 3.2 Is the rung-4 divergence among them (item 15)

**No.** None of the six touches model selection, fold counts, the adoption gate or
the promotion path.

**But the question is closed anyway, by a stronger route, and this is the finding of
the package.**

**The divergence was resolved at G12.9.** Decision-log row 6(a):

> **a, fold unification.** `ingest.refresh._refit_ladder` now evaluates at
> `n_folds=6` (was 4), so the real T3 re-fit and the `models.ladder` CLI backtest
> agree on fold count. This resolves the WP12 divergence flagged in Section B row 5
> (the 4-fold T3 picked `rung4_chronos2` while the 6-fold CLI preview picked
> `rung4_chronos2_exo`); the fold-count reconciliation left open for Nam there is
> now made, on the side of 6.

**Verified at source rather than taken from the log**, which is the discipline the
whole thread rests on: `ingest/refresh.py:302` reads
`ladder.evaluate_rolling(venue, n_folds=6, horizon=7, with_prophet=False)`, and
`n_folds=6` first entered that file at commit `a04eb2d6`, **2026-07-08 19:20**. The
four-fold path that produced the divergent winner does not exist any more.

So row 109(f) was literally true that the document does not disclose the divergence,
and **the absence is not a defect**, because the divergence is not live. **The ten
Chapter 4 passages stand. Report 90 section 3.1's +33 disclosure is withdrawn.**

Two further grounds point the same way, either of which alone would rule out
`sec:disc-specification` as the home:

- **The project specification says nothing about this.**
  `appendix/project_specification.tex` contains no occurrence of foundation, Chronos,
  model selection, fold, MASE or benchmark. A divergence from a document that makes
  no such claim is not a divergence from that document.
- **Row 5's "spec" is not the project specification.** It is the WP12 work-package
  spec, an internal engineering document. Row 5's phrase is "the spec's opening
  framing", and row 5 sits under the WP12 heading. Filing it in
  `sec:disc-specification` would be a category error.

One residue worth keeping visible rather than burying: the store's last foundation
write is `conformal_rung4_chronos2` at the Beer Hall, 114 band rows, **2026-07-08
15:23**, four hours *before* the unification commit, and nothing re-promotes it
(`CONTRACT.md` OPEN item 6, "a tenant's served model is therefore whatever it started
as, for ever"). The most recent bands at all three venues are `conformal_rung2_ets`
from 2026-08-06. **The document makes no claim about what the store holds**, and
after the eleven were applied it says so explicitly, which is precisely what makes
this residue harmless to the dissertation.

### 3.3 Priced anyway, because the package asked (item 16)

Measured in situ, attached to `sec:disc-specification` as a seventh entry.

The section's own framing forces two things a `results.tex:38` insertion does not.
The opening numeral must move, "Six things" to "Seven things", which is free. And the
entry cannot state a bare divergence, because the section is a list of things that
"did not hold for the work as done" and this one was fixed before the evaluation, so
an entry that omitted the resolution would assert something false in a section whose
whole purpose is candour.

```latex
The weekly refit path selected on four folds where the adoption gate used six, and at that fold
count the univariate arm scored $0.823$ at the Beer Hall against the exogenous arm's $0.834$, so
the ordering reversed. The fold counts were unified at six before this study's evaluation, and the
gate reported in Chapter~\ref{chap:results} is the six-fold one.
```

| Placement | Δ |
|---|---:|
| `results.tex:38`, report 90's full form | +33 |
| **`sec:disc-specification`, as a seventh entry** | **+58** |

**The hypothesis behind item 16 is refuted.** The section carries the framing but not
the facts, and supplying the resolution costs more than the framing saves. Placing it
there is 25 words *more* expensive, not less. **Not applied, and not recommended at
either price**, since section 3.2 establishes there is nothing to disclose.

### 3.4 Do the section's entries disclose magnitudes (item 17)

**Only one entry has a magnitude to disclose, and it discloses it.** Entry 1 is the
section's sole quantitative divergence and it gives both numbers plainly: "the
specification describes the platform as live across four venues and this study covers
three", then names the reason the two counts differ. Entries 2 to 6 are binary
absences, a schema not provisioned, feedback not obtained, a ratio never asked for,
where a magnitude does not exist to state.

**So the section's own practice is: state the numbers when there are numbers.** Had
the rung-4 divergence belonged here, it is quantitative like entry 1, and a
magnitude-free entry would have been inconsistent with the only comparable entry in
its own section. **That settles short-versus-full independently of report 90's
argument, and in the same direction.** It is now moot, because the entry is not owed
at all.

---

## 4 · Part 4, the de-duplications priced properly

### 4.1 Both named candidates have already been taken (items 18 and 19)

Report 87 section 3.4 says of the two: "Both are from the 8G de-duplication pass and
both are marked as available rather than taken."

**That is a misreading of the register, and the heading says so.**
`ledger/reduction_cost_register.md:773` reads **"## What was taken, 109 words"**, and
rows 1 to 5 beneath it are the five removals executed in that pass, 24 + 7 + 20 + 13
+ 46. The refused candidates are a *separate* table at `:787` headed "What was
refused". Rows 3 and 4, the two that report 87 forwarded as available, are in the
taken table.

Confirmed against the document rather than against the register:

| Register row | Probe | Present in the document? |
|---|---|---|
| 3, section 5.1 RQ4 | `0.692` | **no** |
| 3 | "calendar-closed pairs" | **no** |
| 3 | "largest miscalibration" | **no**, only `conclusion.tex:159` and `results.tex:508` |
| 4, section 5.5 | "three venues carrying" | **no** |
| 4 | "defensible scaled" | **no** |
| 4 | section 5.5 defers to `\ref{sec:disc-limitations}` instead | **yes** |

**Measured saving from each: 0.** There is no current text to give verbatim and no
reduced text to propose, because the reductions are already in the document's past.
**Nothing is lost by not taking them, because they cannot be taken twice.**

### 4.2 What is actually available there, measured (items 18 and 19)

One span of residual duplication survives at the same site.

**Current, `chapters/discussion.tex:138-142`:**

```latex
exchangeability. The served band missed nominal at all three venues with the departures running in
opposite directions (Table~\ref{tab:coverage}); the served exogenous forecaster under-covered
identically, so this is not a property of the point forecaster, and the residual scale drifted in
opposite directions at the two venues whose coverage did.
```

**Reduced:**

```latex
exchangeability. The served exogenous forecaster under-covered
identically (Table~\ref{tab:coverage}), so this is not a property of the point forecaster, and the
residual scale drifted in opposite directions at the two venues whose coverage did.
```

**Measured saving: 16 words.** The survivor is `conclusion.tex:155-157`, which carries
the same claim plus the reason the intervals are optimistic.

**What is lost, concretely, and it is not nothing.** The paragraph answers research
question four. Its opening two sentences keep the answer ("It did not, and the
property is exchangeability"), but the *shape* of the failure, that it missed at all
three venues in opposite directions, would leave the Discussion and survive only in
Chapter 4 and the Conclusion. The reduced paragraph opens its evidence with a
control, the exogenous forecaster under-covering identically, before stating what was
under-covered. **This sits at the boundary the package draws:** it is a true
de-duplication by the register's own test, and it is also the removal of the sentence
that states the finding in the place that answers the question. I would not take it
without a ruling.

### 4.3 Does any of it fund C7 (item 20)

All measured on the clone with the eleven applied. Standing margin **+7**.

| Position | Counted body | Margin |
|---|---:|---:|
| Clone HEAD | 19,993 | **+7** |
| C7 displacement | 20,016 | −16 |
| C7 plus Clopper-Pearson | 20,018 | −18 |
| Residual de-duplication alone | 19,977 | +23 |
| **De-duplication plus C7** | **20,000** | **0** |
| De-duplication, C7 and Clopper-Pearson | 20,002 | −2 |

**The two named de-duplications fund nothing at all**, because they yield 0.

**The residual funds C7 exactly and nothing else.** It lands the document on
**20,000, margin 0**. That is arithmetically inside the cap and operationally a bad
place to stand: every remaining open item, and any correction found between now and
submission, would put it over with no reserve. The Clopper-Pearson interval,
**measured at +2 rather than report 88's estimated about +6**, does not fit even so.

**So the honest answer to item 20 is no.** Nothing on this menu funds C7 plus the
interval, and the one thing that funds C7 alone does it by spending the entire
margin.

### 4.4 Nothing applied (item 21)

No reduction was made. The residual de-duplication, the C7 displacement, the
Clopper-Pearson interval and the withdrawn disclosure are all priced and none is in
the document.

---

## 5 · Close

| | |
|---|---|
| Store ceiling after | **2026-07-07** |
| Clone HEAD | **`f966f3d4`**, eleven applied, committed |
| `origin/main` | **`99ee32b7`**, push blocked by a local guard, **outstanding** |
| Counted body | **19,993**, margin **+7** |
| Compile | 0 errors, 0 undefined, boxes equal to a controlled baseline |
| `formatcheck.py` | **FAIL**, pre-existing and identical on the baseline, outstanding |
| Ledger | row **110** appended, 65 insertions, 0 deletions |
| Applied from report 90 Part 3 | **nothing** |

**Two items leave this package open and neither is a measurement.** The push needs a
hand or a relaxed guard, and the formatting gate fails at HEAD on a defect this
package neither caused nor was scoped to fix.
