# 90 · S15 · The patch manifest

**Package S15. Read-only on every `.tex` file and on `ref.bib`. One file written,
this one.** No reduction made, no decision-log row edited, no served path changed.

| | |
|---|---|
| Repo HEAD at start | `bc6792f1c12661ae8ab102025826854d63b1f3da` |
| **Overleaf clone HEAD, the SHA every line number below is stated against** | **`99ee32b75c8294abc808a2929115a7fb86af438f`** |
| Store ceiling, asserted before and after | **2026-07-07** (`max(date)` on `l1_daily`) |
| Counted body at that HEAD | **19,993**, margin **+7** |
| Instrument | `texcount -0 -sum -merge -total` over the seven files `\bodywordcount` names (`main.tex:255-257`) |
| texcount version | 3.1.1 |

**Every number in this file was measured, not estimated.** Each site was applied
alone to a fresh full copy of the clone and recounted, then all eleven were applied
together and recounted, then the combined tree was compiled.

---

## 0 · Results before the evidence

1. **The net is exactly 0.** All eleven applied together give a counted body of
   **19,993**, unchanged, margin **+7**. No wording was adjusted to reach that; the
   eleven prices are the eleven S14 published, each reproduced independently.
2. **The patched tree compiles clean and is formatting-neutral.** Exit 0, zero
   errors, zero undefined references, zero undefined citations, and **4 overfull /
   14 underfull boxes, identical to a controlled unpatched baseline**.
3. **The clone's committed `main.log` is stale and must not be used as a baseline.**
   It shows 3 overfull boxes; a clean recompile of the *unpatched* tree shows 4. The
   extra box is in `appendix/project_specification.tex:351`, which no site touches.
   Anyone comparing a patched build against the checked-in log will read a
   regression that does not exist.
4. **Site 6 needs no `ref.bib` edit.** `ansari_chronos-2_2025` is already cited at
   `literature_review.tex:51`, so the joint `\citep` adds no `.bbl` entry.
5. **Part 3 item 16 cannot be answered as asked, and the reason is a number.** Row
   109(f) recorded the divergence as "0.745 against 0.823". Those two figures come
   from **different store vintages** and pairing them in the document would be a new
   defect. Section 3.1 gives the pair that is internally consistent. **The +19 form
   is not honest and should not be ruled on**; see 3.1.
6. Measured Part 3 prices are **+20** (short disclosure), **+33** (full disclosure),
   **+23** (C7 counterweights, marginal over site 8). S14's +19 and +31 were one and
   two words light respectively.

---

## 1 · The manifest

**Application order matters within a file.** Apply descending by line number so
earlier edits do not shift later anchors. For `chapters/results.tex` that is site 5,
then 7, then 8, then 4, then 1, then 9.

Nine of the eleven are inside `\bodywordcount`'s seven files. **Sites 10 and 11 are
outside the counted population and buy nothing against the cap**; they are here
because both are false as written, not because they help the budget.

---

### Site 1 · `chapters/results.tex:103` · inside the count · **Δ 0**

The `tab:mcs` header. "Served" here is the gate's selection, and the header is the
one place a reader meets the word with no sentence around it to disambiguate.

Current:

```latex
Venue & Served model & Set & $p_{\mathrm{MCS}}$ & Origins \\
```

Replacement:

```latex
Venue & Adopted model & Set & $p_{\mathrm{MCS}}$ & Origins \\
```

---

### Site 2 · `chapters/discussion.tex:187-189` · inside the count · **Δ +2**

One of the two sentences that assert a running deployment. The change is on line
188; the surrounding lines are quoted so the anchor is unambiguous.

Current:

```latex
The ranking reversal moved in a direction no cited work predicts, those works leaving the
direction open \citep{hewamalage_look_2021, brigato_there_2025}, and this estate's instance favoured the model already in production, which is
the direction most open to the suspicion of a result arranged after the fact.
```

Replacement:

```latex
The ranking reversal moved in a direction no cited work predicts, those works leaving the
direction open \citep{hewamalage_look_2021, brigato_there_2025}, and this estate's instance favoured the model the gate had already adopted,
which is the direction most open to the suspicion of a result arranged after the fact.
```

---

### Site 3 · `chapters/discussion.tex:317-320` · inside the count · **Δ −1**

The second running-deployment assertion, and the load-bearing one: this is the
estimand argument. S14 item 4 established it survives the gate-selection reading and
would be **false** under a store-state reading, because `rung2_ets`
(`models/ladder.py:219-225`) returns a conditional mean. Three words change:
`in production` to `adopted`, `this deployment` to `that selection`, and the trailing
`served model` to `adopted model` for coherence with sites 1 and 4.

Current:

```latex
Four are properties of the problem. A revenue decision layer needs a mean and the absolute-error
rulers the field defaults to elicit a median; that the model in production cannot emit a mean is a
property of this deployment, and integrating over its emitted quantiles was declined because it
would change the served model after the evaluation was frozen.
```

Replacement:

```latex
Four are properties of the problem. A revenue decision layer needs a mean and the absolute-error
rulers the field defaults to elicit a median; that the adopted model cannot emit a mean is a
property of that selection, and integrating over its emitted quantiles was declined because it
would change the adopted model after the evaluation was frozen.
```

---

### Site 4 · `chapters/results.tex:114` · inside the count · **Δ 0**

Current:

```latex
The set is also the multiple-comparison control over the thirty-six pairwise contrasts nine rungs
generate per venue. Two readings follow. No deployed choice was contradicted by the stronger test:
```

Replacement:

```latex
The set is also the multiple-comparison control over the thirty-six pairwise contrasts nine rungs
generate per venue. Two readings follow. No adopted choice was contradicted by the stronger test:
```

**Two neighbouring occurrences are deliberately left alone.** `results.tex:115`
("every served model survived its own set") and `results.tex:118` ("the served
choice rests on cold-start capability") are both gate-selection uses, which is the
sense the eleven sites pin. They are true as written and owe no repair. Changing
them is optional and, measured, free; leaving them is not an inconsistency.

---

### Site 5 · `chapters/results.tex:910-911` · inside the count · **Δ 0**

The fatigue figure is measured by `eval/agent_eval.py:fatigue_metrics` over injected
streams, not observed on a running system. The function's own docstring already calls
it "an honest UPPER BOUND on the weekly false-alarm rate", which is what keeps the
sentence safe once the word changes.

Current:

```latex
$8$ items surfaced on un-injected windows, an upper bound of $0.667$ alerts a week, measure a
deployment fatigue rate on real background and belong to neither denominator.
```

Replacement:

```latex
$8$ items surfaced on un-injected windows, an upper bound of $0.667$ alerts a week, measure a
harness fatigue rate on real background and belong to neither denominator.
```

---

### Site 6 · `chapters/methodology.tex:356-359` · inside the count · **Δ −1**

S14 form (iii). This fixes **two** defects at once. The arithmetic defect first:
`methodology.tex:350` claims "the five supply nine scored entrants" and the paragraph
enumerates **eight** (rung 0 one, rung 1 one, rung 2 two, rung 3 two, rung 4 two).
The missing ninth is the second univariate foundation arm. `appendix/tables.tex:44-45`
states the true structure, "Rung 4 carries three foundation arms, two chronos-2
(univariate and exogenous) and one chronos-bolt-small", and
`models/ladder.py:327-329` registers exactly those three. Second, the serving claim
comes out with the count, since "its served point forecast" becomes "its point
forecast" at no cost to the meaning: the clipped median is what the arm emits
whether or not anything adopted it.

Current:

```latex
on its own lag features, in a per-venue and a global arm. Rung 4 is a pretrained time-series
foundation model \citep{ansari_chronos_2024}, zero-shot and without per-venue training, in a
univariate arm and in an arm conditioned on the exogenous set of Section~\ref{sec:exo}; its
served point forecast is the median quantile clipped at zero.
```

Replacement:

```latex
on its own lag features, in a per-venue and a global arm. Rung 4 is a pretrained time-series
foundation model \citep{ansari_chronos_2024, ansari_chronos-2_2025}, zero-shot and without
per-venue training, in two univariate arms and in an arm conditioned on the exogenous set of
Section~\ref{sec:exo}; its point forecast is the median quantile clipped at zero.
```

`\ref{sec:exo}` is retained, so nothing is orphaned. `ansari_chronos-2_2025` resolves
against the existing `ref.bib` and already prints in `main.bbl`.

---

### Site 7 · `chapters/results.tex:759-762` · inside the count · **Δ +2**

The realism arm has **zero Ellel records** (`eval/injection_realism.json`: beer_hall
71, two_river_taps 49, ellel 0, total 120). The qualifier is placed against the
**arm**, not against the discount, because it is the arm that excludes Ellel. It uses
the same words Methods already uses at `methodology.tex:623`.

Current:

```latex
Section~\ref{sec:injection} expected the detection figures below to be upper bounds, the corpus
perturbing the standardised residual stream while holding the forecast expectation fixed. They were not. Measured against a realistic arm of $120$ paired injections
re-derived under the production refit policy (Appendix~\ref{app:injection-pipelines}), the discount
was zero for every event kind, at a paired interval of $[0.0, 0.0]$, and the pre-registered
```

Replacement:

```latex
Section~\ref{sec:injection} expected the detection figures below to be upper bounds, the corpus
perturbing the standardised residual stream while holding the forecast expectation fixed. They were not. Measured against a realistic arm of $120$ paired injections, Ellel
excluded, re-derived under the production refit policy (Appendix~\ref{app:injection-pipelines}), the discount
was zero for every event kind, at a paired interval of $[0.0, 0.0]$, and the pre-registered
```

---

### Site 8 · `chapters/results.tex:606-609` · inside the count · **Δ −3**

**The document's one over-claim, and the repair is shorter than the defect.** "Misses
by construction" asserts inevitability. C7 measures availability coverage on that cell
at **0.4894**, Clopper-Pearson 95 per cent interval [0.385, 0.595], `n = 94`, against
a nominal 0.900. **46 of the 94 are covered**, so the miss is not by construction. The
replacement drops the 238.0/32.21 residual pair, which was the qualitative proxy for
exactly the quantity the coverage figure now states directly.

**No counterweight is owed here.** This repairs a false absolute and asserts nothing
about regrouping. The counterweights belong only to the Part 3 statement at 3.2,
which does make a regrouping claim.

Current:

```latex
is right, and at the Beer Hall $94$ of $546$ calendar-closed days, or $17.2$ per cent, actually
traded, with an absolute residual averaging $238.0$ against $32.21$ on genuinely closed days: they
are drawn from the trading distribution and banded against a group of near-zero residuals, so they
are misses by construction.
```

Replacement:

```latex
is right, and at the Beer Hall $94$ of $546$ calendar-closed days, or $17.2$ per cent, actually
traded: drawn from the trading distribution and banded against a group of near-zero residuals,
they cover $0.489$ against a nominal $0.900$ and carry $77$ per cent of the venue's coverage
shortfall.
```

The following sentence, "Two River Taps carries a similar rate and Ellel a lower one",
survives unchanged and still reads correctly against the replacement.

---

### Site 9 · `chapters/results.tex:38-39` · inside the count · **Δ +1**

**`results.tex` moves, not `methodology.tex`.** Eleven entrants are specified and nine
scored. `methodology.tex:389-392` is correct: two are specified and scored at no
venue, one for want of a backend (TabPFN-TS, `log/68_R5_tabpfn_entrant_result.md`) and
one for a vendor-service licensing question. `results.tex:38`'s "A tenth entrant"
implies ten specified and names only the first of the two. The nine-scored figure is
correct in both places and in `tab:mcs`, which ranges over nine.

Current:

```latex
capacity paid at the anchor venue and not at the two thin ones. A tenth entrant scored at no venue
for want of its backend, so the nine that scored are the nine the confidence sets below range over.
```

Replacement:

```latex
capacity paid at the anchor venue and not at the two thin ones. Two further entrants scored at no venue,
one for want of its backend, so the nine that scored are the nine the confidence sets below range
over.
```

---

### Site 10 · `notation.tex:40` · **OUTSIDE the count** · Δ 0 against the cap

**The sharpest of the three "served" referents, and free to fix.** The notation table
is where a reader looks for a definition. `signals/residual.py:81-106`
(`build_residual_stream`) computes `expected` as an **expanding day-of-week median**
recomputed at every venue, and never reads `served_forecast`; its docstring names it
"the Rung-1 baseline". The gate adopted the foundation arm at the Beer Hall and
exponential smoothing at Two River Taps, so the current gloss is **false at two venues
of three**.

Current:

```latex
$\tilde{y}_t$ & Day-of-week median forecast, the incumbent served model & \pounds & Equation~\ref{eq:z} \\
```

Replacement:

```latex
$\tilde{y}_t$ & Day-of-week median forecast, the deviation-detection baseline & \pounds & Equation~\ref{eq:z} \\
```

---

### Site 11 · `appendix/robustness.tex:438-439` · **OUTSIDE the count** · Δ 0 against the cap

S12 pointed at `:440`, which is true because it inherits its scope from "Both
production detectors fired on it". The sentence that is **false as written** is
`:439`: monitoring was not made dormant. `POST /deviation/scan` returns fourteen
deviation rows on that venue after closure and `signals/deviation.py` carries no
`is_closed` reference at all. Naming the two detectors just named scopes the claim to
what is true of them.

Current:

```latex
was dated to 8 May 2026 and the alarm raised on 16 May, eight trading days later. The closure flag
then made monitoring dormant, so the run of structural zeros that followed raised nothing further.
```

Replacement:

```latex
was dated to 8 May 2026 and the alarm raised on 16 May, eight trading days later. The closure flag
then made both dormant, so the run of structural zeros that followed raised nothing further.
```

This does **not** disclose the unguarded primitive, which stays under
FLAG-EVAL-HARNESS-UNGUARDED. Disclosing it in the document was priced at +18 to +25
in report 87 and is not part of this set.

---

## 2 · The net, verified once

### 2.1 Per-site, each measured alone on a fresh copy

| Site | File | Δ | In `\bodywordcount` |
|---:|---|---:|:---:|
| 1 | `chapters/results.tex` | 0 | yes |
| 2 | `chapters/discussion.tex` | **+2** | yes |
| 3 | `chapters/discussion.tex` | **−1** | yes |
| 4 | `chapters/results.tex` | 0 | yes |
| 5 | `chapters/results.tex` | 0 | yes |
| 6 | `chapters/methodology.tex` | **−1** | yes |
| 7 | `chapters/results.tex` | **+2** | yes |
| 8 | `chapters/results.tex` | **−3** | yes |
| 9 | `chapters/results.tex` | **+1** | yes |
| 10 | `notation.tex` | 0 | **no** |
| 11 | `appendix/robustness.tex` | 0 | **no** |
| | **sum of the nine counted** | **0** | |

### 2.2 All eleven together

| | |
|---|---|
| Baseline | **19,993** |
| All eleven applied | **19,993** |
| **Signed delta** | **+0** |
| Margin | **+7**, unchanged |

**Item 13 is not triggered.** The net is exactly 0 and no wording was adjusted to
make it so. Every one of the eleven prices reproduces S14's published figure
independently, which is the check worth having: the two measurements were taken on
different scratch trees on different days and agree at every site.

### 2.3 Compile and cross-references (item 14)

Compiled with `latexmk -pdf -shell-escape -interaction=nonstopmode`, TeX Live 2026,
against a controlled unpatched baseline built the same way in the same session.

| | Patched | Unpatched baseline |
|---|---:|---:|
| Exit code | **0** | 0 |
| LaTeX errors | **0** | 0 |
| Undefined references or citations | **0** | 0 |
| Overfull boxes | **4** | **4** |
| Underfull boxes | **14** | **14** |
| Words broken across a line in the PDF | **0** | 0 |
| `main-words.sum` printed by the declaration | **19,993** | 19,993 |

**No cross reference broke.** Both references the package named resolve:
`\ref{sec:exo}` to section 3.5 on page 20, and `tab:mcs` to Table 4.1 on page 30.
`ansari_chronos-2_2025` resolves to a `.bbl` entry that already existed.

**The stale-log trap, recorded because it will mislead the next person.** The clone's
checked-in `main.log` reports 3 overfull boxes. A clean recompile of the unpatched
tree reports 4. The difference is a 0.98 pt box at
`appendix/project_specification.tex:351` on page 98, in a file no site touches. Judged
against the checked-in log the patch looks like a regression; judged against a
controlled baseline it is neutral. **Rebuild the baseline, do not read the committed
log.**

### 2.4 Scratch deleted (item 15)

Confirmed in section 5.

---

## 3 · The two funded-by-ruling items

**Neither is applied. Text and price only.** Both are measured on top of all eleven,
so the numbers below are marginal costs over the mandatory set, which is the position
a ruling would actually be made from.

### 3.1 · The divergence disclosure at `results.tex:38`

**Read this before ruling on the wording.** Row 109(f) states the divergence as "the
six-fold gate winner `rung4_chronos2_exo` at 0.745" against "the four-fold refit
path's winner, plain `rung4_chronos2` at 0.823". **Those two numbers are not
comparable.** Row 5 records the six-fold preview ladder check putting
`rung4_chronos2_exo` at the Beer Hall at **0.779**, not 0.745. The 0.745 in the
document is `tab:ladder`'s figure, and `appendix/tables.tex:42-43` says what it is:
"the historical committed gate, restated rather than re-run, ending at each venue's
last active day as the store stood when that gate was taken". So 0.745 and 0.823 come
from different store vintages, and printing them as a pair would attribute to fold
count a gap that is partly vintage. **A disclosure built on that pair would be a new
defect, not a repair.**

The pair that is internally consistent is row 5's own, one run, one store state, four
folds: plain `rung4_chronos2` **0.823**, `rung4_chronos2_exo` **0.834**,
`rung4_chronos_bolt` 0.845. At that fold count the ordering the gate recorded
reverses. That is the fact a reader needs, and it needs no cross-vintage number.

Both forms attach to the end of site 9's replacement sentence.

**Short form, measured +20:**

```latex
The weekly refit path selects on four folds, not six, and does not reproduce this
ordering at the Beer Hall.
```

**What a reader learns:** that a divergence exists, and where.
**What they do not:** which arm wins instead, by how much, or whether the difference
is material. **This is the partial disclosure the package warned about.** A reader
told only that the ordering is not reproduced cannot tell whether the gap is 0.001 or
0.5, and the natural reading of an undisclosed magnitude is that it was omitted
because it is bad. It costs 20 words to raise a doubt it does not let anyone settle.
**Recommendation: this form should not be chosen.** Either disclose the numbers or
leave the ten passages as they stand, since every one of them is true about the gate.

**Full form, measured +33:**

```latex
The weekly refit path selects on four folds, not six, and at that fold count the
univariate arm scores $0.823$ at the Beer Hall against the exogenous arm's $0.834$, so the
ordering reverses.
```

**What a reader learns:** that a divergence exists, which arm wins under the refit
path, the magnitude (0.011, small), and that both figures come from one fold count so
the comparison is sound.
**What they do not:** that the promotion path is what runs nightly, or that
`CONTRACT.md` still names the exogenous arm. Both are outside what a results chapter
owes.

**On the package's conditional: yes, plainly.** The short form discloses that a
divergence exists without letting a reader tell which arm or by how much, so **the
+33 form is the only honest one of the two.** The cost of honesty here is 13 words
over the partial disclosure, and 33 over silence.

### 3.2 · The C7 displacement at `results.tex:606-609`

Priced against **site 8's replacement**, not against the current text, so the number
below is the marginal cost over the mandatory repair.

```latex
is right, and at the Beer Hall $94$ of $546$ calendar-closed days, or $17.2$ per cent, actually
traded: drawn from the trading distribution and banded against a group of near-zero residuals,
they cover $0.489$ against a nominal $0.900$ and carry $77$ per cent of the venue's coverage
shortfall. Regrouping on realised occurrence lifts them to $0.926$ but costs Ellel $0.914$
against $0.843$, and here an unpartitioned band covers $0.880$, above either.
```

| Priced against | Δ |
|---|---:|
| The current text (49 words) | **+20** |
| **Site 8's replacement (46 words), the number that governs** | **+23** |

Both counterweights are present and both carry their numbers: the occurrence oracle
makes Ellel's overall coverage worse (0.914 against 0.843), and at the Beer Hall an
unpartitioned band covers 0.880, above either Mondrian arm. Without both, a reader
would conclude that occurrence is the partition to use, which the estate's own numbers
refuse. The Clopper-Pearson interval is omitted at a saving of about 6 words and is
the first thing to restore if margin allows.

### 3.3 · Combined cost, and the slack that would fund it (item 18)

At the recommended forms, both taken on top of the eleven:

| Position | Counted body | Margin |
|---|---:|---:|
| Baseline | 19,993 | +7 |
| **All eleven (mandatory, no ruling needed)** | **19,993** | **+7** |
| Eleven + C7 displacement | 20,016 | −16 |
| Eleven + full disclosure | 20,026 | −26 |
| **Eleven + both, at the honest forms** | **20,049** | **−49** |

**Combined marginal cost: +56. Slack that must be released: 56 words, and 49 net of
the standing margin.**

If only one can be funded, **C7 at +23 is the better buy**, on two grounds. It
repairs a passage the document currently gets wrong in the direction of over-claiming,
whereas the disclosure adds a caveat to passages that are all true as written. And
site 8 must be applied regardless, so C7 is an extension of an edit already being made
rather than a new insertion.

Against report 87 section 3.4's menu, 49 words is covered by any one of:

- Reversing the 8G refusal on section 5.1's five question restatements, about **57**
  words, refused on readability rather than on any criterion.
- Both located de-duplications together, about **20** at `conclusion.tex:137-140` and
  about **13** at sections 5.4/5.5, which reach 33 and would fund C7 alone but not
  both items.
- Relocating a body passage of about 50 words to an appendix, the lever report 87
  Part 1 item 6(ii) confirmed is connected.

**None of those was taken. All three are human rulings, and this package made no
reduction.**

---

## 4 · What this package deliberately did not do

- **No `.tex` file was edited.** Every measurement was taken on a scratch copy of the
  whole tree, and the clone is clean at the SHA stated at the top.
- **No wording was adjusted to force the net to zero.** It arrived at zero.
- **Site 8 was given no counterweight.** It repairs a false absolute; only the
  Part 3 statement makes a regrouping claim, and only that statement carries them.
- **Nothing from Part 3 was applied.**
- **Row 109(f) was not edited**, though section 3.1 corrects it. Amending a numbered
  row is outside this package.

---

## 5 · Close

| | |
|---|---|
| Overleaf clone HEAD | `99ee32b7`, unchanged |
| `git status --short` on `*.tex` and `ref.bib` in the clone | **clean** |
| Store ceiling after | **2026-07-07** |
| Scratch trees | deleted |
| Counted body at HEAD | **19,993**, margin **+7** |
