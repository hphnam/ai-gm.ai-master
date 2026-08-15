# 97 · S22, the degenerate served bands recorded, and what the honest C7 form costs

**This package records and prices. It repairs nothing and applies nothing.** No `.tex`
file was edited, no reduction made, no served path changed, no partition turned off
anywhere, no test removed, no numbered ledger row edited. Every word figure was taken on a
throwaway copy of the Overleaf clone under the scratchpad.

| | |
|---|---|
| HEAD at start | `7c7770501d66f7f2723f0655bdcb388b56b4b795` |
| HEAD at end | stated in the commit that carries this file; a commit cannot state its own SHA |
| Overleaf clone and `origin/main` | both `fbf64a2bb7db3ab99c26b023d56562c34547bfac`, verified live by `git ls-remote` |
| Store ceiling, before and after | `2026-07-07` |
| Counted body, canonical `\bodywordcount` scope | **19,993**, margin **+7** |
| `.tex` files touched | **0** |

---

## 1 · The twelve rows, with the split that decides how serious they are

### 1.1 · The count, and a scope correction

**The count is confirmed at report 96's scope and the scope was too narrow.** At Ellel,
level 0.90, model `conformal_rung2_ets`, half-width exactly 0.00: **12 rows, 2026-03-30 to
2026-05-05**, all Monday or Tuesday. That is exactly what report 96 reported.

Across **every** level and model the store holds **72** zero-width L1 conformal band rows,
all at Ellel:

| venue | layer | model | level | n | first | last |
|---|---|---|---:|---:|---|---|
| ellel | L1 | `conformal_rung2_ets` | 0.90 | **12** | 2026-03-30 | 2026-05-05 |
| ellel | L1 | `conformal_rung2_ets` | 0.80 | 28 | 2026-03-30 | 2026-06-30 |
| ellel | L1 | `conformal_rung1_robust_dow` | 0.90 | 16 | 2026-03-30 | 2026-05-19 |
| ellel | L1 | `conformal_rung1_robust_dow` | 0.80 | 16 | 2026-03-30 | 2026-05-19 |

**Zero at the Beer Hall and zero at Two River Taps.** Both figures are reported and
neither is adopted silently, per the package's instruction. The L2/L3 `mint_dowmedian`
rows that are also zero-width are a different construction (per hierarchy node, not
calendar grouped) and are excluded by construction, not by filename.

### 1.2 · The twelve rows, with the realised value on each

`revenue_exvat` from `l1_daily`; `read_series(fill_calendar=True)` fills an absent day to
0, so an absent row is a day the venue took nothing, not a day with no data.

| date | dow | band lo | band hi | half-width | yhat | revenue ex-VAT | transactions | verdict |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 2026-03-30 | Monday | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 | harmless |
| **2026-03-31** | **Tuesday** | **0.00** | **0.00** | **0.00** | 0.00 | **120.67** | **22** | **GUARANTEED MISS** |
| **2026-04-06** | **Monday** | **0.00** | **0.00** | **0.00** | 0.00 | **230.85** | **47** | **GUARANTEED MISS** |
| 2026-04-07 | Tuesday | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 | harmless |
| 2026-04-13 | Monday | 22.70 | 22.70 | 0.00 | 22.70 | 0 | 0 | harmless |
| 2026-04-14 | Tuesday | 29.82 | 29.82 | 0.00 | 29.82 | 0 | 0 | harmless |
| 2026-04-20 | Monday | 14.53 | 14.53 | 0.00 | 14.53 | 0 | 0 | harmless |
| 2026-04-21 | Tuesday | 19.41 | 19.41 | 0.00 | 19.41 | 0 | 0 | harmless |
| 2026-04-27 | Monday | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 | harmless |
| 2026-04-28 | Tuesday | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 | harmless |
| 2026-05-04 | Monday | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 | harmless |
| 2026-05-05 | Tuesday | 0.00 | 0.00 | 0.00 | 0.00 | 0 | 0 | harmless |

**2 of 12 traded. Both are guaranteed misses.** A band of [0.00, 0.00] against an actual of
120.67 and of 230.85 cannot cover. The other 10 are true structural zeros where actual,
forecast and band are all zero: degenerate, and harmless.

**Four rows deserve a second look and survive it.** 2026-04-13, 04-14, 04-20 and 04-21 have
a non-zero half-width printed above, but `lo` equals `hi` on each because the point
forecast is small and positive while the group quantile is zero. They are zero-width bands
sitting at a non-zero location, and all four fall on days the venue took nothing, so they
are harmless too.

### 1.3 · The mechanism, measured rather than assumed

Ellel's calendar-closed group, over the 392-day filled calendar 2025-06-08 to 2026-07-04:

| group | days | took nothing | traded | zero fraction |
|---|---:|---:|---:|---:|
| calendar-closed (Mon/Tue) | 112 | 108 | **4** | **0.9643** |
| calendar-open | 280 | 218 | 62 | 0.7786 |

A closed day gives an actual and a forecast of both zero and hence an absolute residual of
exactly zero. With **96.4 per cent** of the group's scores in that atom, the
`ceil((n + 1) x 0.90)`-th smallest score lands **inside the atom**, so the quantile is
0.00 and the band collapses.

**This is not the small-n attainability clamp.** The pool is large, the guarantee is
available, and the quantile is correct. It is a correct quantile of a degenerate group, and
that is a harder thing to defend against than a clamp, because nothing about it looks
wrong from inside the construction.

**The four traded Mon/Tue days across Ellel's entire history:**

| date | revenue ex-VAT |
|---|---:|
| 2025-08-25 | 480.27 |
| 2026-02-03 | 613.94 |
| 2026-03-31 | 120.67 |
| 2026-04-06 | 230.85 |

**Whenever Ellel trades on a calendar-closed day, the band that is meant to cover it is at
or near zero width.** That is not incidental to this window; it is the group's defining
property.

### 1.4 · This reconciles report 95's Ellel cell exactly

Report 95 §3.2 gives Ellel `closed_traded` at **n = 21** with coverage **0.0000** under both
the served Mondrian arm and the adaptive one. The banded frame is (origin, step) pairs at
seven steps per origin. Ellel's first forecast origin sits ~120 days after the series
starts on 2025-06-08, so **2025-08-25 is never banded**, leaving three traded
calendar-closed dates in frame: 2026-02-03, 2026-03-31 and 2026-04-06. **3 x 7 = 21.**

The evaluated finding and the served defect are therefore the same event seen twice, and
two of those three dates carry a zero-width band standing in the served store now.
2026-02-03 falls outside the served test window, which begins 2026-03-27.

### 1.5 · The document already carries the cause and not the consequence

Two places state the mechanism, both as grounds for withholding the two-sided coverage
bound rather than as a statement about the band:

- `appendix/pseudocode.tex:238-239` (`app:conformal-bounds`): *"doors shut gives an actual
  and a forecast of zero and hence a residual of exactly zero, an atom at the foot of the
  score distribution rather than a continuous tail."*
- `results.tex:428-434`, the `tab:coverage` caption: the atom holds *"$0.152$, $0.556$ and
  $0.173$ of the calibration mass"*. **Ellel is the 0.556.**

**Neither says the atom can drive the served band to zero width.** The 0.556 is the
marginal mass; within the calendar-closed group it is 0.964, and that is the figure that
produces the collapse.

### 1.6 · Nothing reported reads these rows

**Enumerated, not inferred.** The `bands` table has exactly **two** readers outside the
test suite, both inside `GET /forecast`: `service/app.py:206` (`warehouse.read_band`) and
`service/app.py:213` (`_read_band_with_key`). Scope of the check: `rg` over the whole
`brain/` tree for `read_band`, `FROM bands`, `from bands` and the quoted table name in
both quote styles, excluding `graphify-out/` and `log/`; and separately over `figures/`,
where the only store reader is `fig_estate.py`, which reads `l1_daily`.

**No reported number in `chapters/` or `appendix/` reads a band from those 12 rows.** Every
coverage figure in the document is computed in memory by `eval/interval_calibration.py` or
`conformal/wrap.evaluate` and lands in a JSON artefact; the `bands` table is a serving
surface, not an evaluation input.

### 1.7 · Not repaired, and what a repair would need

**Not repaired, deliberately.** Changing the served band regenerates every downstream
artefact and invalidates reported numbers three weeks before submission. Same disposition
as the unguarded deviation path at decision row 107: recorded, described, left in place.

A post-submission repair would need one of: a floor on the group quantile, serving the
marginal quantile whenever the group quantile is zero, which is what
`compute/forward.py:203-216` already does for a group below `MIN_CALIB_RESIDUALS` but keyed
on a **thin pool** rather than a **degenerate quantile**; or dropping the partition at this
venue; or a non-zero minimum half-width. **Each changes the served band and so re-opens the
coverage numbers**, which is why none is done now.

---

## 2 · Flags and ledger rows

| Artefact | Where |
|---|---|
| **FLAG-BAND-DEGENERATE-ELLEL** (OPEN, recorded not repaired) | `FLAGS.md`, new entry after `FLAG-BAND-UNDERCOVERAGE-BH` |
| **FLAG-BAND-UNDERCOVERAGE-BH** (still OPEN) | `FLAGS.md`, dated update appended inside the entry |
| **Decision row 114** | the degenerate bands, the traded split, the mechanism, the scope correction |
| **Decision row 115** | the §6.3 discharge, the honesty answer, the priced forms, the methodology verdict |

Both rows are appends. No numbered row was edited.

---

## 3 · The §6.3 pointer

**Placed at the refusal, not at the end of the section**, per the S19 amendment at
`PRJ93_RULES.md:223`: *"At the site: adjacent to the sentence that defers, where a reader
who arrives by grep stops reading."*

It sits immediately after the refusing sentence in
`log/86_c7_partition_contrast.md` §6.3 and carries three things, the third being the one
that keeps it from becoming a verdict:

1. That `log/95_mondrian_aci.md` §7.3 is the conditional-coverage measurement §6.3 named as
   missing.
2. The three arms landing identically on **87 of 94**, coverage 0.9255 [0.853, 0.970],
   against the served arm's 0.4894 [0.385, 0.595].
3. **The Winkler counter evidence**, and an explicit instruction not to read the pointer as
   a verdict in one direction, with the arbitration assigned to the served-band review.

**Why this was owed.** A refusal that names its own missing evidence is a live obligation
whose trigger is the arrival of that evidence. Report 86 could not know the trigger had
fired; nothing pointed forward; and this is the same shape as the row 5 failure that cost
S14, S15 and S16 a package each.

---

## 4 · Item 11, answered directly

> **Does a statement that dropping the partition matches the oracle on the misgrouped cell
> mislead a reader if it does not also say the partitioned arm wins on Winkler at all three
> venues?**

**Yes. And so does the standing proposal (c), which has never been priced with the clause
either.**

**The misreading is not about the fact, it is about the inference.** Nothing in (d1) or
(d3) is untrue, and the 0.926 is exact. What a reader does with it is conclude that the
served band should drop the partition. That conclusion runs directly into
`chapters/results.tex` Table `tab:winkler`, seventy lines further into the same chapter,
where the partitioned arm beats the pooled arm at **all three** venues (1807 against 1940
at the Beer Hall, 1263 against 1435 at Ellel, 646 against 654 at Two River Taps), the
confidence set retains all five methods at the Beer Hall, and *"no method both entered the
confidence set and improved on the incumbent's mean, so under the pre-registered rule none
was adopted"*.

**So a reader acting on (d1) or (d3) would be acting against the document's own
pre-registered adoption rule, stated in the same chapter and never connected to the new
sentence.** That is report 92 item 16's standard met: a form a reader could act on wrongly.

**Do they share form (a)'s defect? In kind, yes. In mechanism, no**, and the distinction
matters for which repair works.

| | form (a), withdrawn | (d1) and (d3) |
|---|---|---|
| Literally true | yes | yes |
| How it misleads | asserts a bare negative, so the reader infers the wrong **direction** | omits the **criterion** the document adjudicates on, so the reader infers the wrong **conclusion** |
| Repair | restore the evidence, which is what made (c) cost +23 | name the criterion, which is what makes (d3-w) cost +27 |

**And the same test convicts (c) and (g).** Form (c)'s clause *"here an unpartitioned band
covers $0.880$, above either"* is an unqualified unpartitioned-beats-partitioned comparison
with no mention of Winkler. Report 96 called this a property of the site rather than of
§7.3, which was correct and incomplete: **it is a property of every form on the table.** The
honest comparison is therefore between forms that all carry the clause, which section 5
prices.

---

## 5 · The priced forms

All in situ against site 8's applied replacement at `results.tex:607-610`, spliced after
`shortfall.`, whole counted body re-measured each time. The harness reproduced report 92's
(a) +9, (b) +23 and (c) +23 exactly before anything new was priced.

### 5.1 · The minimum clause

| clause | cost |
|---|---:|
| **w1** ` The partition still wins on the Winkler score at every venue (Table~\ref{tab:winkler}).` | **+12** |
| w2, as w1 without the cross-reference | +11 |
| w4, ` It is wider, and the partition wins on Winkler at every venue (Table~\ref{tab:winkler}).` | +13 |
| w3, w1 plus `, which is the criterion the adoption rule reads` | +20 |

**w1 is the minimum that removes the misreading.** w2 saves one word by dropping the
cross-reference, and a claim about a table the reader is not sent to is the weaker form for
that one word. w3's extra clause is what makes the block airtight and costs eight more; it
is not proposed.

### 5.2 · The forms

| form | text after `shortfall.` | bare | **with w1** |
|---|---|---:|---:|
| **(d1)** | `Dropping the partition covers the same cell at $0.926$.` | +9 | **(d1-w) +21** |
| **(d3)** | `An oracle grouped on realised occurrence reaches $0.926$ here, and so does dropping the partition.` | +15 | **(d3-w) +27** |
| **(c)** | the standing proposal, both occurrence-oracle counterweights numbered | +23 | **(c-w) +35** |
| **(g)** | §7.3 plus the Ellel counterweight | +23 | **(g-w) +35** |

The clause costs **+12 on every base form**, which is expected: it is the same words.

### 5.3 · Item 14, answered plainly

**(d3-w) at +27 exceeds the standing (c) at +23.** Stated as the package asks: on that
comparison the cheap §7.3 form does **not** undercut the standing proposal once it is made
honest, and report 92's *"no cheap defensible middle"* holds below +21.

**But the comparison is unlike-for-unlike, and the honest one flips it.** (c) carries the
same defect and costs **+35** once repaired. Both readings, with neither preferred here:

| comparison | §7.3 form | standing form | §7.3 advantage |
|---|---:|---:|---:|
| As the package frames it, (d3-w) against bare (c) | +27 | +23 | **−4, worse** |
| Like for like, (d3-w) against (c-w) | +27 | +35 | **+8, better** |
| Like for like, (d1-w) against (c-w) | +21 | +35 | **+14, better** |

**The one unambiguous statement: the cheapest honest form on the table is (d1-w) at +21,
and it is 2 words cheaper than the standing (c) which is not honest.**

### 5.4 · The budget

Baseline **19,993**, margin **+7** against the 20,000 cap, reserve floor **>= 250**
(`ledger/reduction_cost_register.md:810`). The residual de-duplication at **−16** is report
92 §4.3's figure, re-confirmed there on this same clone at `fbf64a2`; **it was not
re-measured here**, because the edit's text is not recorded in reports 87, 92 or 96 in a
form that could be re-spliced. Combination rows are therefore **arithmetic over one measured
figure and one carried figure**, and are marked.

| position | counted body | margin | vs reserve floor |
|---|---:|---:|---|
| Baseline, site 8 applied | 19,993 | **+7** | 243 short |
| De-duplication alone (carried) | 19,977 | +23 | 227 short |
| plus (d1) bare | 20,002 | −9 | over cap |
| plus (d3) bare | 20,008 | −15 | over cap |
| plus **(d1-w)** | 20,014 | −14 | over cap |
| plus (c), standing and unqualified | 20,016 | −16 | over cap |
| plus **(d3-w)** | 20,020 | −20 | over cap |
| plus (c-w) or (g-w) | 20,028 | −28 | over cap |
| **(d1-w) + de-duplication** (arithmetic) | **19,998** | **+2** | **248 short** |
| (c) + de-duplication (arithmetic, report 92's row) | 20,000 | 0 | 250 short |
| (d3-w) + de-duplication (arithmetic) | 20,004 | −4 | over cap |
| (c-w) + de-duplication (arithmetic) | 20,012 | −12 | over cap |

**One position on this table carries a Winkler-honest C7 statement and stays under the cap:
(d1-w) plus the de-duplication, at 19,998 with a margin of +2.** It is still 248 words below
the project's own reserve floor, so it is not a comfortable position, only a legal one.

**No placement recommendation is made and no reduction is proposed.** The de-duplication is
a human ruling that has not been taken, and so is every row above.

---

## 6 · `methodology.tex:511-515`, the passage nobody had priced

### 6.1 · Verbatim

The package names it 511-514. The sentence runs to **515**; the paragraph is quoted whole.

```latex
Three refinements are specified. A Mondrian variant computes group-conditional quantiles
separating calendar-open from structural-zero days, so a closed venue's near-zero residuals cannot
shrink a trading day's interval; per-step calibration fits a separate quantile per horizon step,
since a one-step and a seven-step residual are not exchangeable; and two adaptive methods are
implemented \citep{gibbs_adaptive_2021, zaffran_adaptive_2022}, the second removing the learning-rate choice the first exposes (Appendix~\ref{app:adaptive-impl}).
```

**texcount: the paragraph governs 62 words; the Mondrian clause alone governs 23.** Both by
deletion against the whole-body instrument (19,993 to 19,931, and 19,993 to 19,970).

### 6.2 · Verdict: **FALSE**, not weakened

The package's distinction is the right one and it decides the case. Split the clause:

1. *"A Mondrian variant computes group-conditional quantiles separating calendar-open from
   structural-zero days"* is a **specification of what the construction does**.
   **Unaffected, and true.**
2. *"so a closed venue's near-zero residuals cannot shrink a trading day's interval"* is a
   **consequence claim in the present tense**, asserting the mechanism works. This is the
   second kind of claim, and it is the one a conditional measurement can contradict.

**It is true under one reading of "trading day" and false under the reading its own words
carry.** If "trading day" means *calendar-open day*, the clause is true by construction: an
open day is banded from the open group and never sees the closed group's residuals. If
"trading day" means *a day the venue trades*, which is what the phrase says, the clause is
false at **94 days at the Beer Hall, 21 at Ellel and 38 at Two River Taps**, where a day the
venue traded is banded against the near-zero group precisely because the calendar called it
closed.

**The document already asserts the negation, in the Results chapter.**
`results.tex:608-609`, site 8's applied text:

> traded: drawn from the trading distribution and **banded against a group of near-zero
> residuals**, they cover $0.489$ against a nominal $0.900$

That is the literal contradiction of *"near-zero residuals cannot shrink a trading day's
interval"*. **The contradiction is not created by site 8** and predates it: the text site 8
replaced said the same days *"are misses by construction"*, which negates the clause just as
directly. What is new is that the negation now carries a number.

**Note what is not claimed.** `methodology.tex:517-522`, the passage defending the choice of
an observed calendar variable over an inferred regime, is a **rationale for adopting the
partition** and is untouched by any of this. Report 96 listed it as assuming; it assumes,
and correctly, and §7.3 does not reach it.

### 6.3 · The minimum repair costs nothing

| repair | text | Δ |
|---|---|---:|
| **r1** | `a trading day's interval` becomes `a calendar-open day's interval` | **+0** |
| r3 | r1 plus `, which is not every day the venue trades` | +8 |
| r2 | r1 plus a clause naming the exception explicitly | +15 |

**r1 prices at exactly zero words, measured, and converts a false sentence into a true
one.** It replaces the trading reading with the calendar reading, which is what the clause
is true of.

**It is priced and NOT applied.** Whether the sentence should merely become true, or should
also name the exception at +8, is a ruling: r1 makes the claim correct and leaves the reader
without the fact that the two readings differ at 153 days across the estate, which is the
finding site 8 and any C7 form carry in the Results chapter.

---

## 7 · The appendix sweep report 96 did not do

Same classification as report 96's `chapters/` sweep. Terms: `mondrian`,
`group-conditional`, `group conditional`, `groupwise`, `per-group`, `partition`,
`unpartitioned`, `pooled split`, case insensitive, over all four files
(`project_specification.tex`, `pseudocode.tex`, `robustness.tex`, `tables.tex`).

**Three passages. None recommends. None is contradicted.**

| location | class | what it says | affected by §7.3 |
|---|---|---|---|
| `pseudocode.tex:241-256`, `app:mondrian` | **assumes** | Separates the three claims attaching to the construction: what it **is** (Vovk), what it **guarantees** (split conformal within each group, Stocker), and why the partition is **observed rather than inferred** (Sun, explicitly *"motivates the choice without certifying it"*) | **No.** It is scrupulous about exactly the distinction section 6.2 turns on, and asserts no consequence claim about coverage on any cell |
| `pseudocode.tex:224-239`, `app:conformal-bounds` | **diagnoses** | The attainable size, the two-sided bound, and the zero atom the closure calendar creates | **No, and it is corroborated.** Decision row 114 is that atom's served consequence |
| `robustness.tex:405-411`, `app:native-quantiles` | **diagnoses** | Two constructions sharing *"no point model, no calibration layer and no partition"* fail at Ellel by close to the same margin | **No.** It uses the absence of a partition as a control, and draws no recommendation from it |

`tables.tex` and `project_specification.tex` returned nothing on any term.

**Combined with report 96's `chapters/` sweep**: across the whole document, **one** passage
recommends group-conditional calibration (`conclusion.tex:215-222`), **six** assume it, and
**six** describe or diagnose it. Exactly one assuming passage is false as written, and it is
`methodology.tex:511-515`.

---

## 8 · Unsolicited findings, including what contradicts this brief

**1. The brief's count was one scope of four.** Part 1 item 1 asked whether the count is 12.
It is 12 at report 96's scope and **72** across all levels and models. Reported rather than
resolved in favour of either, per the instruction.

**2. The brief assumes only §7.3-bearing forms need the Winkler clause.** Part 4 item 11
asks whether (d1) and (d3) share form (a)'s defect. They do, **and so do (c) and (g)**,
which the brief treats as the honest baseline. The comparison the brief sets up, item 14's
"+23 threshold", is therefore against a form that is itself unqualified, and the answer
changes sign depending on which comparison is made. Both are given in section 5.3 and
neither is preferred here.

**3. The document's own adoption rule is the counter-argument, not merely the Winkler
table.** `results.tex:708` states that under the pre-registered rule **no** alternative was
adopted, at any venue. Any C7 form implying the partition should go is not just against a
table, it is against a rule the document pre-registered and honoured. This strengthens the
case for the clause and is why w1 names the table rather than the score alone.

**4. The mechanism behind the degenerate bands is already in the appendix, twice, as an
argument for something else.** `app:conformal-bounds` and the `tab:coverage` caption both
state the zero atom. Neither connects it to the served band. **A fact can be in a document
and still be missing**, if it is only ever put to one use.

**5. Report 95's Ellel `closed_traded` cell and the served degeneracy are the same three
days.** Section 1.4. Nothing previously connected the evaluated cell to the rows sitting in
the store.

**6. The stale `conformal_rung1_robust_dow` rows are served.** `warehouse.read_band` applies
no model filter, so `GET /forecast` returns rows for every model persisted at a venue,
including 32 zero-width rows from a model that is no longer Ellel's selection
(`MAX_RUNG` was emptied at G12.9c). This is not a new defect and is not repaired; it is
recorded because it is why the 72 figure is larger than the 12.

**7. The minimum repair of a false sentence in Methodology is free.** Section 6.3. That is
the cheapest correction this project has priced, and it was found only because report 96's
sweep named a passage no C7 costing had.

---

## 9 · Verification

| check | scope | result |
|---|---|---|
| Counted body | `texcount -0 -sum -merge -total` over the six chapters plus `abstract.tex`, the `\bodywordcount` scope at `main.tex:255-258` | **19,993**, margin **+7** |
| `origin/main` | `git ls-remote origin main`, live | **`fbf64a2`**, equal to the local clone HEAD |
| `.tex` dirty | `git status --porcelain -- '*.tex'` on the clone | **0** |
| Format gate | `python3 brain/scripts/formatcheck.py main.pdf --aux main.aux --body-from 21` | **PASS**, section 1. Scanned **95 pages of 115**, 2,588 justified lines, calibration 84 per cent. Sections 2 and 3 are advisory and unchanged: 26 inner gaps over 60pt, 0 stubs, 11 floats 2+ pages from their reference, 3 unreferenced by number |
| Store ceiling | `warehouse.assert_store_ceiling()`, before and after | **2026-07-07** |
| Em and en dashes | over every line added this session | **0** |

**On the format gate's PDF.** `main.pdf` is dated 2026-08-14 17:59, the same timestamp as
`main-words.sum`, whose contents (19,993) match a fresh `texcount` over the current tree,
and no `.tex` has changed since. The gate is therefore reporting on the tree it was asked
about. **It did not examine everything**: 20 of 115 pages are front matter below the
`--body-from 21` boundary, and sections 2 and 3 of its own output are advisory rather than
gated, which is why the verdict line says so itself.

**Suite, in its correctly scoped form. 667 passed, 1 skipped, 0 failed, 0 errors, 1
deselected.**

- The **deselected** node is the one unmarked network-dependent test,
  `tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`,
  excludable only by node id.
- The **skip** is the venv boundary, `tests/test_intermittent.py:37`: *"statsforecast
  absent: it is an eval-only dependency (requirements-eval.txt, .venv-eval) and does not
  build on the 3.14 runtime venv (scipy/numba); cross-check skipped per spec G2.2"*.

**No bare green is claimed and the count is not read off the exit code.** This project's
pytest prints no final `N passed` line, and under `-q` it prints neither the `SKIPPED`
summary nor a `collected` line, so both had to be recovered deliberately. Reconciled two
independent ways that agree: **668 progress characters** (667 `.` and 1 `s`), and
**668 of 669 collected with 1 deselected**. The skip reason came from a targeted `-rs`
run, because the full run under `-q` never printed it.

---

## 10 · What this package did not do

- **Nothing was repaired.** The 12 rows stand, the partition is on at all three venues, and
  `conformal/wrap.py`, `compute/forward.py` and `config.py` are untouched.
- **No `.tex` file was edited**, no reduction made, no form applied.
- **No numbered ledger row was edited.** Rows 114 and 115 are appends, and the §6.3 pointer
  is an append to a log report, which the S19 amendment states explicitly is inside the
  append-only rule.
- **No placement recommendation was made**, and none of the priced forms is proposed.
- **The arbitration between cell coverage and the Winkler score was not taken.** It belongs
  to the served-band review, and both halves are now recorded in the flag that review owns.

**Open after this package:**

1. `FLAG-BAND-DEGENERATE-ELLEL`, new, unowned, not repaired before submission by decision.
2. `FLAG-BAND-UNDERCOVERAGE-BH`, still open, now with a located cause, a candidate repair
   and its counter evidence in the same entry.
3. **The C7 displacement ruling**, now with four honest prices (+21, +27, +35, +35) and one
   under-cap combination.
4. **Whether `methodology.tex:511-515` is repaired**, at a measured cost of zero words.
5. **Whether `conclusion.tex:215-222` is amended**, unchanged from report 96 §4.3 and still
   dependent on item 3.
