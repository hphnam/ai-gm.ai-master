# 92 · S17 · Land the eleven, green the gate, close the ledger

| | |
|---|---|
| Store ceiling, before and after | **2026-07-07** |
| Overleaf clone HEAD | **`fbf64a2`** (`f966f3d4` the eleven, `fbf64a2` the format fix) |
| `origin/main` | **`99ee32b7`**, two commits behind, **push outstanding** |
| Counted body | **19,993**, margin **+7**, unchanged by everything here |
| `formatcheck.py` | **FAIL to PASS** |
| Ledger row appended | **111**, forward pointer from 110, append only (85 insertions, 0 deletions) |

---

## 0 · Results before the evidence

1. **The push needs no change to anything.** The blocker is a Claude Code hook that
   constrains me and not a person. A human running `git push origin main` in a
   terminal is not subject to it. Nothing is protecting Overleaf and nothing needs
   relaxing.
2. **The format gate passes.** Cause measured, not guessed: Computer Modern's `ff`
   ligature in "staff" overhangs its advance width. The repair is **one tie**, no word
   changed, in a verbatim reproduction where that mattered.
3. **`CONTRACT.md`'s three assertions are correct going forward.** S14 could not say
   this; with the refit path on six folds it can be said, under two stated conditions.
4. **Row 5 has no forward pointer to row 6(a).** That is why S14, S15 and S16 all
   priced a disclosure for a divergence resolved a month earlier. It is a structural
   defect in the ledger, not three oversights.
5. **The minimal C7 form is withdrawn.** Not because it is expensive, but because the
   only form cheaper than the full one can be acted on wrongly. The qualitative middle
   costs **exactly the same 23 words** as the numbered form, so there is no economy in
   dropping the numbers.
6. **The document is 243 words below its own stated reserve floor.** The register
   requires **>=250**; the margin is **+7**. That, not arithmetic, settles C7.

---

## 1 · The push, diagnosed

### 1.1 The guard (item 1)

**A Claude Code `PreToolUse` hook on Bash. Not a git hook, not a config setting, not
an Overleaf policy.**

- **File:** `/Users/hapuna/Downloads/ai-gm.ai-master/.claude/hooks/block-dangerous-commands.sh`
- **Refusing line: 43**, reached from the `git push` detector at line 39 and the
  protected-refspec test at line 41:

```bash
if contains_cmd "git[[:space:]]+push[[:space:]]+[^[:space:]]+[[:space:]]+([^[:space:]]*:)?($BR_REGEX)(\$|[[:space:]])"; then
  MATCHED_BRANCH=$(...)
  emit_deny "Blocked: push to protected branch '${MATCHED_BRANCH:-main}'. Use a feature branch and open a PR."
```

`PROTECTED_BRANCHES` defaults to `main,master` plus `init.defaultBranch` (line 27-31)
and is overridable by `CLAUDE_PROTECTED_BRANCHES`. The hook matches on the **command
string**, so it fires regardless of which repository the command runs in: it lives in
the `ai-gm.ai-master` project and it stopped a push to Overleaf.

**Confirmed absent on the git side:** the clone has no `pre-push` hook, `.git/hooks`
holds no non-sample files, and `core.hooksPath` is unset. Overleaf did not reject
anything, because nothing reached Overleaf.

### 1.2 What a person would have to do (item 2)

**Nothing. That is the finding.**

The hook is a Claude Code tool-use gate. It inspects commands issued through my Bash
tool and has no effect on a terminal. A person opens a shell and pushes.

For completeness, the two ways to let *me* push, neither recommended:

| Route | Persistence | What else it unprotects |
|---|---|---|
| `CLAUDE_PROTECTED_BRANCHES` set to a value not containing `main` | Session-wide env, persistent for its lifetime | **Every repository in the session**, including `ai-gm.ai-master`'s own `main`. The force-push, `rm -rf`, DROP TABLE and publish guards are unaffected, since only this one list is consulted |
| Remove or edit the hook | Persistent until restored | The whole `git push` block at lines 39-61, including the **force-push** guard at 57-60 |

**Bypassing it for one push is not possible without leaving one of those two in
place**, which is why the answer is that a person should do it.

### 1.3 The clone is otherwise ready (item 3)

| Check | State |
|---|---|
| Working tree, tracked files | Only `.DS_Store` modified, which predates this work and is **not** in either commit |
| Staged | **nothing** |
| Unpushed commits | **two**, `f966f3d4` and `fbf64a2` |
| Untracked that could ride along | none. `git push` sends commits, not the working tree, so the 14 build artefacts and `.DS_Store` cannot travel |
| `ref.bib` | untouched |

**One caution.** `.gitignore` covers only `main-words.sum` and `svg.sty`, so
`main.pdf`, `main.log`, `main.aux` and eleven others sit untracked and unignored.
**Do not run `git add -A` before pushing**; it would sweep them and `.DS_Store` into a
commit. The command below stages nothing.

### 1.4 The command, and the two checks (item 5)

```
cd /Users/hapuna/Downloads/prj93-overleaf
git push origin main
```

Nothing else. No `add`, no `-f`, no `--force-with-lease`, no branch. Per item 4 I did
not force, did not rebase, and did not create a feature branch.

**Check one, that the remote moved:**

```
git rev-parse origin/main     # must NOT be 99ee32b7...; expect fbf64a2...
```

**Check two, in the Overleaf web UI.** Open `chapters/results.tex` and read line 608.
It must say:

> traded: drawn from the trading distribution and banded against a group of near-zero residuals,

and it must **not** contain the words "misses by construction", which is the false
absolute C7 refuted. If the old text is still there, the push did not land.

---

## 2 · The format gate

### 2.1 The cause, measured (item 6)

**Source, `appendix/project_specification.tex:110-115`**, the offending line third:

```latex
AI General Manager Ltd is an early-stage venture building GM-AI, a digital general manager for
hospitality venues. The company frames the product as a role, not a tool: GM-AI reads every
standard operating procedure (SOP), runs opening and closing checklists, monitors stock, drafts
supplier purchase orders, and answers staff questions on WhatsApp throughout each shift. It is
currently live across four venues operated by Lune Brew Co., with external operators onboarding
next.
```

**Not a long token, not verbatim, not a URL, not a table column. It is a font
characteristic.** Measured from the rendered PDF:

- The derived text block right edge is **524.48 pt**; 2302 of 2914 justified lines
  land on it.
- The rendered line runs to **528.01 pt**, so 3.53 pt of ink sits outside.
- Character origins on that line: the two `f` glyphs of the `ff` ligature have origins
  at 517.61 and **524.44**. **The ligature's advance ends at 524.44, on the margin.
  Its ink reaches 528.01.**
- `staff` has an ink width of **25.43 pt everywhere it appears** in the document, so
  this is not an anomalous rendering of one instance.
- Interword spaces on the line are ~3.53 pt, **not** at maximum shrink, so TeX was not
  straining.

**So TeX justified a line it considers perfect and warned about nothing, because TeX
measures advance widths. `formatcheck` measures ink.** Suppression is ruled out: no
`\hfuzz` or `\vfuzz` is set in any `.tex`, `.cls` or `.sty`, and TeX does report a
0.98 pt box elsewhere in the same run.

Across the whole document 80 lines carry some ink past 524.48; the next largest is
1.72 pt. **This line is the only one above tolerance and the only line-final `ff`.**

### 2.2 The repair (item 7)

**`\sloppypar` around the paragraph was tried first and changed nothing**, which is
consistent with the diagnosis: it grants extra stretch to a paragraph TeX is
struggling with, and TeX was not struggling.

The repair is **one tie**, forbidding the break after "staff" so the line breaks
earlier:

```latex
supplier purchase orders, and answers staff~questions on WhatsApp throughout each shift. It is
```

**This is the whole diff.** It matters that it is: `appendix/project_specification.tex`
is a **verbatim reproduction of the Week 1 specification for HC54**, and its own header
states "Apart from (4), no sentence, bullet, table row or field is dropped, reordered
or reworded". **No word is changed, dropped, reordered or reworded.** A tie renders as
an ordinary space, so the page says exactly what it said.

**Word-neutral to the counted body, confirmed two ways.** The file is outside
`\bodywordcount`'s seven, and the counted body measures **19,993** after the fix.

### 2.3 The gate (item 8)

```
scanned 115 pages of 115 (body from p.1), 2914 justified lines
  text block, even pages: 99.2pt .. 524.5pt (150.0mm wide)  [derived, not assumed]
  calibration: 2302 of 2914 lines land on the derived right margin (79%)

[1] MARGIN SPILL  (ink outside the text block)
  (none unaccepted)

VERDICT: PASS - no unaccepted ink outside the text block (0 accepted, each ruled and capped).
```

**Scope, stated so the PASS is not over-read.** It scanned 115 of 115 pages and 2914
justified lines, so it is not a pass over the empty set. Section 1 is the only section
that can fail. Sections 2 and 3 are advisory and unchanged: 37 inner gaps over 60 pt
(identical list to before), 0 stubs, and float distance skipped for want of `--aux`.
The tool cannot see a float exiled to its own page, a table with wrong cells, or a
float never referenced by number.

### 2.4 Recompile (item 9)

| | Patched clone | Controlled unpatched baseline |
|---|---:|---:|
| Counted body | **19,993** | 19,993 |
| Errors | **0** | 0 |
| Undefined references | **0** | 0 |
| Undefined citations | **0** | 0 |
| Overfull | **4** | **4** |
| Underfull | **14** | **14** |

`diff` of the overfull lines against the baseline built in this session: **identical**.
Both labels resolve, `sec:exo` and `tab:mcs`. `ref.bib` untouched.

**A page-by-page diff of the rendered text over all 115 pages** shows exactly one
change: the word "a" moves from page 107 to page 108. No word altered, no hyphenation
introduced, nothing lost. Item 10 did not fire; the spill was fixable without touching
meaning.

**One correction to report 91.** Its "0 words broken across a line in the PDF" was
produced by a `pdftotext` that is not installed, with stderr suppressed, so it counted
an empty stream. The check has been redone with `pymupdf` and the finding holds, but
the earlier line was a check that scanned nothing.

---

## 3 · The G12.9 resolution, banked

**Ledger row 111 appended** (item 11), forward pointer from 110, append only, 85
insertions and 0 deletions. It carries the commit SHA, the timestamp ordering, the
`CONTRACT.md` finding, the stale list, the format fix and the reserve.

**The timestamp ordering is the part worth stating plainly.** `n_folds=6` entered
`ingest/refresh.py` at **`a04eb2d6`, 2026-07-08 19:20:09 +0100**. The store's only
foundation bands, `conformal_rung4_chronos2` at the Beer Hall, were written **2026-07-08
15:23:41**, **four hours and fifty-seven minutes earlier**. So that row is output of
the four-fold path produced before the fix and never regenerated. **It is not the
six-fold path selecting the plain arm**, which is the reading that would have kept the
divergence alive.

### 3.1 `CONTRACT.md` (item 12)

**Yes, the three assertions are now correct going forward.** `:123`, `:152-153` and
`:175` assert the Beer Hall's served model is the exogenous arm. S14 found them right
about the gate and wrong about anything ever promoted, and could not say more. With
`_refit_ladder` on six folds, the mechanism that produced a different winner is gone:
a refit run today evaluates on the fold count the gate used, at which the exogenous arm
is the Beer Hall winner.

**Two conditions, stated rather than buried.**

1. It holds **only if a refit ever runs**. `CONTRACT.md`'s own OPEN item 6 says nothing
   in the compute path re-runs the gate and `ladder_selection` comes back empty on every
   call, which the current store confirms: `served_forecast` and `ladder_selection` are
   both **empty**. So the assertions describe what a refit **would** select, not what
   any store holds.
2. It is a claim about the **mechanism**, not a forecast. Whether a six-fold refit on
   future data reproduces the exogenous win is a question about that data.

**Reported only. `CONTRACT.md` is Ryan's.**

### 3.2 Artefacts still describing the divergence as open (item 13)

Listed, not edited.

| Location | What it still says | Note |
|---|---|---|
| `log/Decision_and_Resolution_Log.md` **row 5**, :111-160 | "reconciling T3's fold count with the ladder CLI's ... is a call for Nam, not made unilaterally here" | **The root.** Resolved at row 6(a) about sixty rows later under a different section heading, with **no forward pointer** |
| `log/15_Fidelity_Corrections_Addendum_Report.md:201-205` | "the real T3 refit (4 folds, no prophet - pre-existing, unmodified settings)" | Archival WP12 report, correct when written, names a fold count changed at G12.9 |
| `log/16_Chronos2_Promotion_Report.md:25-26, :47` | the 0.823/0.834/0.845 triple, then "Reconciling T3's fold count with the ladder CLI's" as pending | Frames the reconciliation as outstanding |
| `brain/CONTRACT.md:123, :152-153, :175` | the exogenous arm is served | Correct going forward per 3.1; would benefit from a pointer at the resolution |

**No `FLAGS.md` entry describes the fold divergence as open.** The sweep found none.

**The structural finding.** Row 5 names the reconciliation as an open call and never
points forward to the row that made it. S14, S15 and S16 each read row 5, each verified
that the dissertation omits the divergence, and none verified that the divergence still
existed. A gap has two halves, the absent statement and the live fact it would state,
and only the first was ever checked.

---

## 4 · A minimal C7 form, priced and then withdrawn

### 4.1 The pricing (items 14 and 15)

All measured in situ against **site 8's applied replacement**, so these are marginal
costs over text already in the document.

**(a) Bare foreclosure, +9:**

```latex
shortfall. Regrouping on realised occurrence does not repair the estate.
```

**(b) Both counterweights, no numbers, +23:**

```latex
shortfall. Regrouping on realised occurrence lifts this cell but lowers Ellel's coverage overall, and at
this venue an unpartitioned band beats either Mondrian arm.
```

**(c) The full numbered form, +23:**

```latex
shortfall. Regrouping on realised occurrence lifts them to $0.926$ but costs Ellel $0.914$
against $0.843$, and here an unpartitioned band covers $0.880$, above either.
```

| Form | texcount | Δ over site 8 |
|---|---:|---:|
| (a) bare foreclosure | 20,002 | **+9** |
| (b) both counterweights, no numbers | 20,016 | **+23** |
| (c) full, both numbered | 20,016 | **+23** |

**(b) and (c) cost exactly the same.** Dropping the numbers buys nothing, because the
words needed to name both counterweights qualitatively are as many as the numbers they
replace. **There is no cheap defensible middle**; the choice is +9 without evidence or
+23 with it.

### 4.2 The honesty verdict (item 16)

**Withdraw (a). It is misleading, and not only under-evidenced.**

It satisfies the letter of item 14: it forecloses the inference that occurrence is the
partition to adopt. But it does so by asserting a bare negative, and a reader who takes
it at face value learns something false about direction. **Regrouping on occurrence
does lift this cell, from 0.489 to 0.926.** What it does not do is help the estate,
because it costs Ellel (0.914 to 0.843) and because at the Beer Hall an unpartitioned
band beats both Mondrian arms. A reader given only "does not repair the estate" can
reasonably conclude that occupancy-based grouping is a dead end.

**That is a wrong belief a reader could act on**, and there is a concrete place they
would act on it: the Further Work item at `conclusion.tex:215-222` proposes grouping on
**predicted** occupancy. A reader who has just been told occurrence grouping fails has
been set up to dismiss the one repair the document actually proposes. The bare form
saves 14 words by removing the evidence that keeps that door open.

Per item 16's own standard, a cheaper form a reader could act on wrongly is worse than
no form. **(a) is withdrawn. The choice is (c) at +23, or nothing.**

### 4.3 Report 91's figures re-confirmed (item 17)

Re-measured on the clone at `fbf64a2`, both unchanged:

| | Δ |
|---|---:|
| Residual de-duplication, section 5.1 RQ4 against `conclusion.tex:155-157` | **−16** |
| Clopper-Pearson interval | **+2** |

Report 88's estimate of about +6 for the interval remains three times high.

### 4.4 The budget, with the minimal form as a row (item 18)

Standing margin **+7**. Everything measured on the clone at `fbf64a2`.

| Position | Counted body | Margin | Against the >=250 floor |
|---|---:|---:|---|
| **Clone HEAD, eleven plus format fix** | **19,993** | **+7** | 243 short |
| Residual de-duplication alone | 19,977 | +23 | 227 short |
| (a) minimal C7, **withdrawn** | 20,002 | −2 | over cap |
| (c) full C7 | 20,016 | −16 | over cap |
| (c) plus Clopper-Pearson | 20,018 | −18 | over cap |
| De-duplication plus (c) | **20,000** | **0** | 250 short |
| De-duplication plus (c) plus interval | 20,002 | −2 | over cap |

**No row in this table reaches the project's own reserve floor.** The best available
position, de-duplication plus the full C7 form, lands exactly on the cap with zero
reserve.

---

## 5 · Reserve

### 5.1 From the submission documentation (item 19)

The complete Length rule,
`docs/Student Documentation - MSc DS - Dissertation Submission.md:15-19`:

> **Length**
> The dissertation must not exceed 20,000 words. Note that this is an upper limit and
> that competence in producing a succinct and coherent report is essential. Reports
> that are unstructured, overly verbose and contain irrelevant content will be
> penalised rather than rewarded. You should discuss the length and content of your
> report with your supervisor.

**No tolerance above 20,000 is stated, anywhere.** The phrase "must not exceed" is
absolute and "this is an upper limit" reinforces it. S13's finding that no exclusions
are granted is confirmed, and the same passage is the whole of the rule.

**Is anything countable that is not currently counted? On the documentation's own
words, yes, and the exposure is large.** The rule governs "the dissertation", not "the
body". `\bodywordcount` counts six chapters plus `abstract.tex`. The **appendices are
9,597 words** and the bibliography is further. The exclusion the declaration claims
rests on the supervisor confirmation recorded in the 8C-7 ruling, **not on the
documentation**, and it is load-bearing to the tune of nearly ten thousand words. That
is the standing position and this package does not reopen it; it is recorded so the
reserve question is answered against what the rules say rather than what the
declaration asserts.

**A second reading worth stating.** The rule does not merely cap length, it makes
brevity assessable: "competence in producing a succinct and coherent report is
essential", and verbose reports "will be penalised rather than rewarded". So 20,000 is
not a target to spend up to. Words added near the cap are assessed twice, once for
what they say and once as length.

### 5.2 The project's own prior practice (item 20)

`ledger/reduction_cost_register.md:810` states the floor plainly:

> Final **19,888**, margin **112**, reserve required **>=250**. Funding even the
> cheapest item, R108 at ~35, lands the reserve at 77. R101 (~80-120), R96 (~50) and
> R108 (~35) therefore **stay unfunded**.

**The required reserve is >=250 words**, and it has been enforced against real
candidates: three priced items were refused at a margin of 112 purely because funding
them would breach it.

The reason is recorded at `:911-914`, where the margin had fallen to 11:

> **This is below any safe reserve and the next session must not read it as
> headroom.** Tier 3 cost 171 against a margin of 182, and there is no repetition left
> to harvest.

**That is the justification: a correction pass costs more than the margin it is
measured against.** Tier 3 alone consumed 171 words. The reserve exists to absorb
corrections found after the count is taken, which is exactly the class of thing the
last five packages have been producing.

The governing principle, quoted at `:812-813`:

> "A document at 19,900 with three criteria thin is a better position than one at
> 19,700 with a finding missing."

**Applied to the current position: the document stands at +7, which is 243 below its
own floor.** Against that policy the C7 ruling is not a question of whether 23 words
fit inside 7. **The document is already in reserve deficit, and every priced item
including C7 deepens it.** The three levers for restoring a reserve, all Phuong's,
remain those at `:920-923`: reverse the 8G refusal on section 5.1's five question
restatements (~57), relocate a body passage to an appendix, or accept the document as
it stands.

---

## 6 · Close

| | |
|---|---|
| Store ceiling after | **2026-07-07** |
| Clone HEAD | **`fbf64a2`**, two commits, both unpushed |
| `origin/main` | **`99ee32b7`**, **push outstanding, needs a person** |
| Counted body | **19,993**, margin **+7** |
| Compile | 0 errors, 0 undefined, boxes equal to a controlled baseline |
| `formatcheck.py` | **PASS**, 115 of 115 pages, 2914 justified lines |
| Ledger | row **111**, 85 insertions, 0 deletions |
| Applied from report 90 Part 3 | **nothing** |
| Reductions made | **none** |

**One item leaves this package open and it is not a measurement: the push.** Everything
else it was sent to do is done.
