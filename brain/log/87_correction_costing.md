# 87 · The word count recomputed, the served configuration checked, and the correction set costed

Package S13, Parts 1 to 3 and Part 5. Read-only on every `.tex` file and on `ref.bib`.
HEAD at start `35f6fb42`. Store ceiling asserted `2026-07-07` before and after every
pass (`select max(date) from l1_daily`).

**Part 4 is a separate report, `log/88_c7_placement_analysis.md`.**

---

## 0 · The four results, before the evidence

1. **The word count recomputes to exactly 19,993.** `texcount` was installed all
   along, on a PATH S12 did not export. Margin **+7**. No stop condition fires.
2. **The submission documentation grants no exclusions at all.** It says
   "The dissertation must not exceed 20,000 words" and nothing else. Every
   exclusion the declaration claims rests on a supervisor confirmation recorded in
   the project log, not on the documentation. That is the first thing to know
   before hunting for slack in an exclusion.
3. **The document's served claims are claims about the adoption gate, and the gate
   artefacts support them. The store does not, and was never asked to.**
   `served_forecast` holds zero rows and `ladder_selection` holds zero rows, so no
   promotion record exists at any venue. No served designation that governs a
   reported number was changed. There is a recording gap, not a governance breach,
   and section 2.7 states its exact shape.
4. **The correction set costs +2, not +8, and it fits.** S12 priced three
   corrections at +8 against a margin of 7 using `wordcount.py`. Priced with
   `texcount`, which is the instrument the declaration prints, and with the fourth
   correction added, the minimum correct set lands at **19,995, margin 5**. At the
   most specific form of the citation repair it lands at **20,000, margin 0**.

A fifth defect was found while costing the fourth, it is in Chapter 4, and it is
**refuted by S12's own C7 instrument**. It is costed in report 88 because its
repair and the C7 statement are the same edit.

---

## Part 1 · The word count, measured

### Item 1: the canonical counting method

`main.tex:255-257`, verbatim:

```latex
\newcommand{\bodywordcount}{%
  \immediate\write18{texcount -0 -sum -merge -total chapters/introduction.tex chapters/literature_review.tex chapters/methodology.tex chapters/results.tex chapters/discussion.tex chapters/conclusion.tex abstract.tex > main-words.sum }%
  \input{main-words.sum}%
}
```

Tool: `texcount`. Options: `-0` (terse, total only), `-sum` (sum the word
subcounts), `-merge` (follow `\input` and `\include`), `-total` (one figure for
all files rather than one per file). Population: the six chapter files plus
`abstract.tex`, listed explicitly. Output: `main-words.sum`, which `.gitignore`
covers and which is `\input` back into the declaration.

The comment above it at `main.tex:246-253` states why the files are listed rather
than globbed: "a glob that silently matches nothing would produce a confident
count of zero, and this project has the rule that a check which examined nothing
must not report clean."

`brain/scripts/wordcount.py` is a **different** instrument with two documented
over-reads (displayed math scaffolding and `\label` keys). Its totals are not
interchangeable with `texcount`'s and it is not what the declaration prints.

### Item 2: making the method runnable

**It was already runnable.** `texcount` is present at
`/Users/hapuna/texlive/2026/bin/universal-darwin/texcount`, TeXcount 3.1.1. S12's
`which texcount` failed because that directory is not on the default PATH; TeX
Live 2026 on this machine lives in `~/texlive`, not `/usr/local/texlive` or
`/Library/TeX`. The memory note `prj93-local-compile-invocation` records exactly
this trap and S12 did not apply it to the counter, only to the compiler.

Nothing was installed. Invocation:

```
export PATH="$HOME/texlive/2026/bin/universal-darwin:$PATH"
cd /Users/hapuna/Downloads/prj93-overleaf
texcount -0 -sum -merge -total chapters/*.tex abstract.tex   # files listed explicitly
```

### Item 3: the recomputed count

| File | `texcount -0 -sum -merge -total` |
|---|---|
| `chapters/introduction.tex` | 1,172 |
| `chapters/literature_review.tex` | 3,588 |
| `chapters/methodology.tex` | 4,916 |
| `chapters/results.tex` | 5,561 |
| `chapters/discussion.tex` | 2,592 |
| `chapters/conclusion.tex` | 1,844 |
| `abstract.tex` | 320 |
| **counted body** | **19,993** |

The seven parts sum to 19,993 exactly, and the single `-total` invocation over all
seven returns 19,993, so the per-file split and the governing total agree.

Outside the counted population, for the relocation arithmetic in section 3.4:

| File | Words |
|---|---|
| `appendix/project_specification.tex` | 2,366 |
| `appendix/pseudocode.tex` | 3,293 |
| `appendix/robustness.tex` | 3,019 |
| `appendix/tables.tex` | 919 |
| **appendices** | **9,597** |

### Item 4: recomputed against the read figure

**19,993 recomputed against 19,993 read. Difference exactly 0.**

`main-words.sum` was current. S12's UNVERIFIED-LOCALLY caveat was correct as a
statement about what S12 could establish and is now discharged. The file is
untracked (`.gitignore:1`), it was not written by this pass, and it was not
modified.

One thing S12 got right for the wrong reason: it reasoned from mtimes that the
figure was probably current while noting that no local compile had produced it.
The figure is current, but that inference could not have established it, and this
recomputation is what does.

### Item 5: the margin

**Margin against 20,000: +7.**

### Item 6: what the limit counts, from the submission documentation

`brain/docs/Student Documentation - MSc DS - Dissertation Submission.md`, the
section headed **Length**, lines 15-19, complete and verbatim:

> Length
> The dissertation must not exceed 20,000 words. Note that this is an upper limit and that
> competence in producing a succinct and coherent report is essential. Reports that are unstructured,
> overly verbose and contain irrelevant content will be penalised rather than rewarded. You should
> discuss the length and content of your report with your supervisor.

**That is the whole rule.** The word "words" appears nowhere else in the document
in a counting sense. The Format and Presentation section (lines 164-208) covers
font, margins, headings, figures, tables and referencing, and says nothing about
what the count includes.

| Element | Excluded by the documentation? |
|---|---|
| Abstract | **Not stated** |
| Captions | **Not stated** |
| Footnotes | **Not stated** |
| Tables | **Not stated** |
| Appendices | **Not stated** |
| Bibliography | **Not stated** |

So there is **no documented exclusion to find slack in**. The exclusions the
document relies on come from elsewhere:

- `declaration.tex:23`, verbatim: *"The body of this dissertation, comprising the
  abstract and Chapters 1 to 6, contains \bodywordcount{} words. That count
  excludes the bibliography and the appendices, and the permitted maximum is
  20,000 words."*
- The authority for that scope is the 8C-7 ruling recorded in
  `ledger/relocation_candidates.md` §0, quoting Phuong: *"appendices and
  references do not count toward the 20,000, confirmed by my supervisor."*

Two consequences, both material.

**(i) The declaration does not assert compliance, deliberately.** The comment at
`declaration.tex:19-21` records that asserting it while over the cap would repeat
an earlier fault, and that the statement becomes a compliance claim by arithmetic
once the body is under. At 19,993 it already is.

**(ii) The relocation lever is connected, and a standing project note says it is
not.** `ledger/relocation_candidates.md` §0 is headed "READ THIS FIRST, the lever
is currently disconnected" and states that moving a paragraph from `chapters/` to
`appendix/` "leaves `texcount main.tex` unchanged to the word." That was true of
`\quickwordcount{main}`, which followed every `\input` and printed 32,240. It is
**no longer true**: the macro was renamed `\bodywordcount` and rescoped to the six
chapters plus the abstract, and `declaration.tex` was rewritten to match. Section
§0's own stated precondition ("reconfigure `\quickwordcount` to count `chapters/`
and `abstract.tex` only") has been executed. **Relocating a body passage to an
appendix now reduces the declared number by its full `texcount` value.** That is
the largest single source of slack and section 3.4 treats it as such.

**No stop condition fires. The margin is positive. Part 2 proceeds.**

---

## Part 2 · The served-configuration question

### Item 7: every statement in `chapters/*.tex` asserting which model is served where

| Location | Quote | What it designates |
|---|---|---|
| `results.tex:34-38` | "It served the exogenous foundation arm at the Beer Hall at $0.745$ MASE, exponential smoothing at Two River Taps at $0.597$, and the robust day-of-week median at Ellel at $0.572$" | the **adoption gate's** selection; the subject of "It" is "The adoption gate of Section~\ref{sec:ladder}" |
| `results.tex:103-107` | table column header **"Served model"**, rows "Beer Hall / foundation, exogenous", "Two River Taps / exponential smoothing", "Ellel / robust day-of-week" | present-tense designation, one per venue |
| `results.tex:52-53` | "placed the served foundation model second of nine ... the served model returned to first" | Beer Hall, foundation |
| `results.tex:115-118` | "every served model survived its own set ... the served choice rests on cold-start capability and inference cost" | all three |
| `abstract.tex:224` | "the data cannot separate the served model from simpler incumbents" | unspecified venue |
| `introduction.tex:22` | comment only, not printed | n/a |
| `discussion.tex:90` | "the one served model eliminated anywhere is Two River Taps'" | TRT |
| `discussion.tex:139-141` | "The served band missed nominal at all three venues ... the served exogenous forecaster under-covered" | the band, and the exogenous arm |
| `discussion.tex:188` | "this estate's instance favoured **the model already in production**" | Beer Hall |
| `discussion.tex:318-320` | "**the model in production** cannot emit a mean is a property of this deployment ... it would change the served model after the evaluation was frozen" | Beer Hall |
| `discussion.tex:265` | "The $\pounds 1.91$ between the served ..." | Beer Hall |
| `conclusion.tex:113` | "six placing the served Beer Hall model second of nine where 273 returned it to first" | Beer Hall |
| `conclusion.tex:126` | "leaving a served forecaster that returns a median where a revenue decision layer needs a mean" | all three |
| `conclusion.tex:155` | "The served band missed nominal at all three venues" | the band |
| `methodology.tex:271-274` | "the served foundation model returns a median under a mean's name ... would change the served model after the evaluation was frozen" | Beer Hall |
| `methodology.tex:358` | "its **served** point forecast is the median quantile clipped at zero" | rung 4 |
| `methodology.tex:375` | "a foundation model is served only where it defeats a benchmark that costs nothing to compute" | the adoption rule |
| `methodology.tex:521` | "a theorem about a procedure **the served system never runs**" | the Mondrian construction |
| `methodology.tex:526` | "the band that is served is the one that outscored the others there" | the band |

Two registers are in play. Most of these designate the **gate's selection**, which
is a result. Three (`discussion.tex:188`, `discussion.tex:318-320`, and the
present-tense table header at `results.tex:103`) read as claims about a **running
deployment**.

### Item 8: what `brain/CONTRACT.md` states

| Line | Quote |
|---|---|
| 123 | "Required for **the served Beer Hall model**. `CHRONOS2_EXO_COLS` (`models/foundation.py`) is **15 columns**: 4 calendar, 1 event, 6 World Cup, 4 weather." |
| 152-153 | "The verdict in `signals/feature_ablation.md` ('no exogenous feature is adopted') binds the **Rung-3 GBM only**. It does not govern **the served Rung-4 entrant**." |
| 175 | "absence is the difference between **the served exo entrant** and a model that raises" |
| 197 | table row: "`served_model` | which model is live per series | promotion continuity" |
| 244 | table row: "`served_forecast` | upsert | `venue, layer, model, rung, data_as_of, selected_at`" |
| 270 | "It is the intraday envelope **the served Chronos-2 model's** trading-hours feature needs" |
| 328-335 | **"[OPEN] Who runs the ladder.** Compute honours `prior_state.served_model` and cold-starts on `default_model` when it is absent, so promotion is continuous, but nothing in the compute path ever *re-runs* the gate. Verified against the engine: `ladder_selection` comes back `[]` on every call. **A tenant's served model is therefore whatever it started as, for ever.**" |

CONTRACT.md asserts the served Beer Hall model is the **exogenous** Chronos-2
entrant, in three separate places, and carries an OPEN item saying the gate never
re-runs.

### Item 9: every forecast and band write in the store

`forecasts` (4,262 rows) and `bands` (8,524 rows), grouped by venue, model and
write date, most recent first. Store time tops out at 2026-07-07; write times are
wall clock and every write in the table falls inside the last sixty days of it.

| Written | Venue | Model | Rows | Target span |
|---|---|---|---|---|
| 2026-08-06 23:09 | two_river_taps | `conformal_rung2_ets` | 85 | 2026-03-13 to 2026-06-05 |
| 2026-08-06 23:09 | ellel | `conformal_rung2_ets` | 57 | 2026-05-09 to 2026-07-04 |
| 2026-08-06 23:09 | beer_hall | `conformal_rung2_ets` | 57 | 2026-05-12 to 2026-07-07 |
| 2026-08-06 23:04 | beer_hall | `mint_dowmedian` (L2/L3) | 2,280 | 2026-05-12 to 2026-07-07 |
| 2026-07-21 02:05 | beer_hall | `conformal_rung2_ets` | 37 | 2026-04-05 to 2026-05-11 |
| 2026-07-21 02:04 | beer_hall | `mint_dowmedian` (L2/L3) | 1,532 | 2026-04-05 to 2026-06-01 |
| 2026-07-21 02:04 | ellel | `conformal_rung2_ets` | 43 | 2026-03-27 to 2026-05-08 |
| 2026-07-08 19:00 | ellel | `conformal_rung3_gbm` | 57 | 2026-03-27 to 2026-05-22 |
| 2026-07-08 15:35 | ellel | `conformal_rung1_robust_dow` | 57 | 2026-03-27 to 2026-05-22 |
| 2026-07-08 15:23 | beer_hall | **`conformal_rung4_chronos2`** | 57 | 2026-04-05 to 2026-05-31 |

`bands` mirrors this exactly at both levels (0.8 and 0.9), same venues, same
models, same write timestamps.

Three facts follow. The only rung-4 rows in the store are the **plain**
`rung4_chronos2` write of 2026-07-08. No `rung4_chronos2_exo` band has ever been
persisted. And the most recent write at every venue is `conformal_rung2_ets`.

`served_forecast`: **0 rows.** `ladder_selection`: **0 rows.**

### Item 10: what `served_forecast` is for, from code

The writer is `ingest/refresh.py:_promote_and_serve`, and its docstring
(`refresh.py:345-354`) states the purpose:

> Regenerate the SERVED forecast, not just the signal layer, so /forecast and
> /stock/cover move with new data. This closes the v2 gap where 'beat the rung'
> was detect-only: detection audits `ladder_selection`; promotion re-persists the
> served artifacts here and records `served_forecast`.
>
> Re-persists L1 `forecasts`/`bands` via `conformal.wrap.evaluate(model_name=...)`
> ... then upserts `served_forecast`. Model served = the rung this cycle's T3
> adopted, else the incumbent served model, else the venue default (respecting
> MAX_RUNG).

The write itself, `refresh.py:412-415`:

```python
con.execute("DELETE FROM served_forecast WHERE venue=? AND layer=?", [venue, layer])
con.execute(
    "INSERT INTO served_forecast (venue, layer, model, data_as_of, promoted_ts) "
    "VALUES (?, ?, ?, ?, ?)", [venue, layer, served_model, data_as_of, promoted_ts])
```

The reader is `refresh.py:_served` at `:114-120`, and `conformal/wrap.py:60-66`
states what happens without it:

> Fallback point forecaster to wrap when no rung has been adopted/served yet for
> this venue: robust-DOW for any venue still capped at Rung 1 via `MAX_RUNG` (empty
> by default post-G12.9c, so Ellel is no longer capped), else ETS. The actual
> served model normally comes from `ladder_selection`/`served_forecast` once a T3
> re-fit has run.

**So `served_forecast` is a runtime promotion pointer for the serving API, not a
research artefact.** It is empty because nothing has promoted since the pointer was
last cleared, and `default_model(venue)` returns `rung2_ets` at all three venues
now that `MAX_RUNG` is empty (`config.py:151`). That is precisely the model the
2026-08-06 writes carry, at all three venues, which is the fallback and not a
designation.

### Item 11: what produced the 2026-08-06 writes

**An approved artefact-regeneration pass, and it changed nothing.**

`brain/log/76_staleness_triage_result.md`, PART 2, headed "Regeneration and diff,
2026-08-06", tranched "body-float artefacts first, then the conformal trio, then
the rest". Its table at line 153 names the generator: `conformal/wrap.py` writing
`conformal_L1_{venue}.md` times three. Its results table at lines 174-176:

| Artefact | Verdict |
|---|---|
| `conformal/conformal_L1_beer_hall.md` | **Reproduces exactly.** Not stale |
| `conformal/conformal_L1_ellel.md` | **Reproduces exactly.** Not stale |
| `conformal/conformal_L1_two_river_taps.md` | **Reproduces exactly.** Not stale |

Corroboration on disk: those three markdown files carry mtimes inside the
2026-08-06 22:00 to 2026-08-07 01:00 window, each stamps `store ceiling:
2026-07-07`, and each opens "Selected forecaster: **rung2_ets**".

The mechanism is `conformal/wrap.py:main` with `--all-venues` and no `--model`,
so `_run_one(v, layer, None)` resolves through `default_model(venue)` to
`rung2_ets` at every venue. It is **not** `_promote_and_serve`: that function
upserts `served_forecast` on every successful call, and `served_forecast` is
empty. The `mint_dowmedian` write five minutes earlier at 23:04 is
`hierarchy/reconcile.py:539-544`, the Beer Hall L2/L3 reconciliation, which is the
same tranche.

So: **a deliberate, approved regeneration and verification pass. Not a re-serve,
not a test fixture, not a backfill, not a side effect.** The bands it wrote are
byte-equivalent in their reported values to the ones already committed.

### Item 12: are the document's served claims supported by the store

**Stated plainly: the gate claims are supported by the gate artefacts. The store
neither supports nor contradicts them, because it holds no served designation at
all. Two present-tense deployment claims in Chapter 5 are not supported by
anything.**

Taken apart:

**(a) The gate's selection is supported.** `results.tex:34-38`'s three MASE values
(0.745 / 0.597 / 0.572) are reproduced verbatim in decision-log row 11 as the
go-live config, and `eval/mcs_L1_results.json` carries exactly the nine entrants
the chapter ranges over. `models/ladder_results_L1_beer_hall.md` names
`rung4_chronos2_exo` at 0.745 as best entrant and `appendix/tables.tex:37` bolds
the same figure. Nothing here needs the store.

**(b) The store holds no served designation.** `served_forecast` 0 rows,
`ladder_selection` 0 rows. There is nothing in the store to agree or disagree with.
Section 2.7 covers how it got that way.

**(c) One designation is contradicted by the only evidence that exists.** The
document says the Beer Hall's served model is the **exogenous** foundation arm.
The only foundation band ever persisted is the **plain** `rung4_chronos2`
(2026-07-08), and decision-log row 5 records why:

> The REAL promotion mechanism (`ingest.refresh`'s T3 re-fit, which uses 4 folds
> and no prophet) produces a DIFFERENT winner: plain **`rung4_chronos2`** at
> rolling MASE **0.823** ... the actually-promoted model is `rung4_chronos2`, not
> the covariate variant the spec's opening framing named. **This is a genuine
> divergence from the spec's stated decision, surfaced, not hidden**

So "served = exogenous foundation" is true of the six-fold gate and false of every
promotion the store has ever recorded. CONTRACT.md compounds this by asserting the
exogenous arm as served in three places.

**(d) Two Chapter 5 sentences assert a running deployment.**
`discussion.tex:188` ("the model already in production") and
`discussion.tex:318-320` ("the model in production cannot emit a mean is a
property of this deployment"). No promotion record exists, no forecast is served,
and CONTRACT.md's own OPEN item 6 says the gate never re-runs in the compute path.

**What the document would have to say instead, if a change were made.** Nothing in
Chapter 4 needs to move: "Served model" as a table header for a gate outcome is
defensible where the gate is the subject two paragraphs above. The two Chapter 5
sentences would need "in production" replaced by something like "the gate's
incumbent", and the Beer Hall designation would need to name which foundation arm
the gate selected as distinct from which was promoted. **Neither is costed in Part
3 and neither is proposed.** They are recorded here because item 12 asked, and
because the second is a live discrepancy that predates this package by six weeks
and is already on file as row 5's "genuine divergence."

### Item 13: was a served designation changed without a decision-log row

**No governance breach. One recording gap, and it is in a runtime pointer that has
never been the authority for a reported number.**

The trail, in order:

| When | State of `served_forecast(beer_hall)` | Recorded? |
|---|---|---|
| WP12 | `rung4_chronos2`, fresh `promoted_ts` | **Yes**, row 5: "`served_forecast(beer_hall) = rung4_chronos2`, fresh `promoted_ts`; `/forecast?venue=beer_hall` serves `conformal_rung4_chronos2` exclusively, verified against a clean store" |
| G12.12 | `rung2_ets` | **Yes**, row 11, as an incidental finding: "the on-disk BH `served_forecast` is currently `rung2_ets`, not the gate winner `rung4_chronos2_exo` (store reset since WP12); correcting it is the first step of the blocked gate b" |
| now | **absent, 0 rows** | **No row records this transition** |

TRT and Ellel never had a row at all, which row 5 states explicitly: "neither had
a `served_forecast` row before this work and neither has one after."

The mechanism for the last transition is evidenced, not guessed.
`warehouse.build()` drops only `line_items` (`store/warehouse.py:212`), so a
rebuild alone would not empty the pointer. Two test modules drop it by name:
`tests/test_promote_and_serve.py:34` and `tests/test_ingest_refresh.py:70`, both
inside a `_reset` that also drops `data_watermark` and `ladder_selection`. The
store's surviving state matches that signature exactly: `ladder_selection` empty,
`served_forecast` empty, and `data_watermark` repopulated only for the two venues
the 2026-07-31 aggregate ingest touched (`mcp-sim-aggregate-july2026-w1`, beer_hall
and ellel, TRT absent). `_promote_and_serve` is the only non-test path that
repopulates `served_forecast`, and it has not run since.

That class of accident is exactly `FLAG-STORE-DURABILITY` (`FLAGS.md:804`,
RESOLVED at report 44), which records the store as "derived and disposable by
design" with "a sharp edge", and it fired three times on file. The suite has since
been isolated: `tests/conftest.py` points `BRAIN_DUCKDB_PATH` at a session
throwaway store precisely so "the suite must not be able to rebuild the
developer's working store."

**Why this is a recording gap rather than a breach.** Not one reported number in
the dissertation reads `served_forecast`. Decision-log row 5 measured that
directly: "0 of 28 `signals.deviation.scan` rows differ before vs after
promotion, byte-identical ... `signals.residual.build_residual_stream` (shared by
deviation and change-point) always recomputes its own DOW-median baseline from
`store.warehouse.read_series` and never reads `served_forecast`, `forecasts`, or
`bands`." The designation that governs the document is the gate winner, and it
lives in committed artefacts. **No forward-pointer row is proposed here**; S13
writes no decision-log row at all, by its own scope.

---

## Part 3 · The correction set, costed

**Every figure below is `texcount -0 -sum -merge -total`, measured in situ on a
scratch copy of the chapter, not on an isolated snippet and not with
`wordcount.py`.** Isolated-snippet costs are given where they differ, and they did
not.

Baseline: **19,993. Margin +7.**

### (a) The rung-4 citation

**Current, `chapters/methodology.tex:356-358`:**

> Rung 4 is a pretrained time-series
> foundation model \citep{ansari_chronos_2024}, zero-shot and without per-venue training, in a
> univariate arm and in an arm conditioned on the exogenous set of Section~\ref{sec:exo}; its
> served point forecast is the median quantile clipped at zero.

**39 words by `texcount`** (40 by `wordcount.py`; the two tokenizers differ on
`\ref{sec:exo}`).

**A second defect in the same sentence, not in S12's brief.** The paragraph opens
(`methodology.tex:350`) "the five supply **nine** scored entrants." Counting what
the paragraph then enumerates: rung 0 one, rung 1 one, rung 2 two ("exponential
smoothing ... and a robust seasonal-trend decomposition"), rung 3 two ("in a
per-venue and a global arm"), rung 4 **two** ("in a univariate arm and in an arm
conditioned on the exogenous set"). **That is eight against a stated nine.** The
missing entrant is Chronos-Bolt. `models/ladder.py:326-329` registers three rung-4
arms and `eval/mcs_L1_results.json` ranges over exactly nine keys including
`rung4_chronos_bolt`, so nine is right and the enumeration is short.

This changes the repair: it is not only a citation defect, it is an arithmetic one
in the same sentence, and any candidate that leaves rung 4 at two arms leaves the
paragraph contradicting its own opening.

**Two candidates at different costs:**

| Candidate | `texcount` | Δ | Arms named | Which key goes with which arm |
|---|---|---|---|---|
| **A1, joint citation** | 39 | **0** | three | not stated |
| **A2, per-arm citation** | 44 | **+5** | three | stated |

**A1, verbatim (Δ 0):**

> Rung 4 is a pretrained time-series
> foundation model \citep{ansari_chronos-2_2025, ansari_chronos_2024}, zero-shot and without per-venue training, in two
> univariate arms and in an arm conditioned on the exogenous set of Section~\ref{sec:exo}; its
> served point forecast is the median quantile clipped at zero.

Two edits, both single-token: `a` becomes `two`, `arm` becomes `arms`, and the
second key joins the existing `\citep`. It fixes the arm count and it cites both
papers. **What it gives up:** it does not say that `ansari_chronos-2_2025` covers
the two Chronos-2 arms and `ansari_chronos_2024` the Bolt arm. A reader learns
that rung 4 rests on two papers and not which arm rests on which.

**A2, verbatim (Δ +5):**

> Rung 4 is a pretrained Chronos-2 time-series
> foundation model \citep{ansari_chronos-2_2025}, zero-shot and without per-venue training, in a
> univariate arm and in an arm conditioned on the exogenous set of Section~\ref{sec:exo}, beside a
> Chronos-Bolt arm \citep{ansari_chronos_2024}; its
> served point forecast is the median quantile clipped at zero.

**What A1 gives up is already in the appendix.** `appendix/tables.tex:37-39` tables
all three arms under distinct labels, the comment at `tables.tex:44-45` states
"Rung 4 carries three foundation arms, two chronos-2 (univariate and exogenous)
and one chronos-bolt-small, all zero-shot and pinned by revision hash", and
`appendix/pseudocode.tex:74-76` pins both revision hashes. **A1 is the
recommendation** on that basis: it is free, it fixes both defects, and the
attribution it omits is stated twice in the appendices.

The word-neutral key **swap** S12 listed (replace `ansari_chronos_2024` with
`ansari_chronos-2_2025`, change nothing else) remains wrong and is not a candidate:
it would leave the Bolt arm cited to a Chronos-2 paper, and S12 item 4 established
that `ansari_chronos_2024` is the correct citation for Bolt.

### (b) The realism qualifier

**Current, `chapters/results.tex:759-762`** (the clause needing the change is the
second sentence):

> Section~\ref{sec:injection} expected the detection figures below to be upper
> bounds, the corpus perturbing the standardised residual stream while holding the
> forecast expectation fixed. They were not. Measured against a realistic arm of
> $120$ paired injections re-derived under the production refit policy
> (Appendix~\ref{app:injection-pipelines}), the discount was zero for every event
> kind ...

The realism arm has **zero Ellel records** (`eval/injection_realism.json`:
beer_hall 71, two_river_taps 49, ellel 0, total 120), and S12 item 15 established
that two of seven descriptions qualify the venue coverage and both are outside
Chapter 4.

| Candidate | Δ |
|---|---|
| ", Ellel excluded," after "injections" | **+2** |
| "at the two continuously-trading venues," | +5 |
| "at two venues," | +3 |

**Recommendation: +2**, which is both the cheapest and the most informative, and
it uses the same words Methods already uses (`methodology.tex:623`, "Ellel is
excluded").

### (c) The closure scoping

**Current, `appendix/robustness.tex:439-440`:**

> The closure flag
> then made monitoring dormant, so the run of structural zeros that followed raised nothing further.
> A repeated alarm on a known-closed venue would have violated that behaviour.

**A change is needed, and S12 pointed at the wrong sentence.** S12 concluded the
sentence at `:440` is "not false, it is unqualified about a surface it does not
cover", and recommended scoping it. Re-reading the paragraph, `:440` inherits its
scope from the preceding sentence ("Both production detectors fired on it"), so on
that antecedent it is true. The sentence that is **false as written** is the one at
`:439`: *"The closure flag then made monitoring dormant."* Monitoring was not made
dormant. `POST /deviation/scan` returns fourteen deviation rows on that venue after
closure (S12 item 10), and `signals/deviation.py` carries no `is_closed` reference
at all.

| Candidate | Δ |
|---|---|
| "made **both** dormant" (referring to the two detectors just named) | **0** |
| "made **this monitoring** dormant" plus "A repeated alarm **from either**" at `:440` | **−1** |
| "made **change-point monitoring** dormant" | +1 |
| Scope it and also disclose the unguarded primitive | +18 to +25 |

**This does not help the budget and must not be counted as if it did.**
`appendix/robustness.tex` is outside `\bodywordcount`'s population, so the −1
saving buys nothing against the cap. Measured directly: robustness.tex 3,019 to
3,018, counted body unchanged at 19,993.

**Recommendation: the −1 form**, on accuracy grounds only. It is the truest of the
three and the cheapest, and its cost to the budget is zero either way. The
disclosure of the unguarded primitive stays where S12 put it, in
`FLAG-DEV-CLOSURE-UNGUARDED`.

### (d) The fatigue bound

**Current, `chapters/results.tex:905-911`, verbatim with its surrounding context:**

> Three things bound that reading. The misses are counted against synthetic injections rather than
> events an operator confirmed, and $84$ of the $124$ are injections the detector never examined
> (Section~\ref{sec:res-vuspr}), so the margin by which misses dominate measures where the harness
> placed its events as much as what the detector sees; which side dominates on the examined
> injections alone is unsettled, the spurious items not having been recorded per injection. Recall
> and precision have different denominators here, $644$
> injections against $588$ surfaced attributable items, so no ratio of the two is reported. And the
> $8$ items surfaced on un-injected windows, an upper bound of $0.667$ alerts a week, measure a
> deployment fatigue rate on real background and belong to neither denominator.

**Does the document already frame the figure as an upper bound? Yes, explicitly,
in the sentence itself: "an upper bound of $0.667$ alerts a week."** The framing is
also load-bearing in the paragraph, which is headed "Three things bound that
reading."

**Could a reader be misled without a further sentence? Yes, but not about the
number, and the fix is word-neutral.**

The number is safe. It is declared an upper bound, and S12's finding pushes in the
conservative direction, so it remains one. What is not safe is the word
**"deployment"**. The 8 items came from `eval/agent_eval.py:fatigue_metrics`, whose
signal assembly (`_signals_from_stream`) reimplements `briefing.collect` and omits
both closure guards, and whose window comes from `inject.holdout` rather than the
closure-filtered `_usable_folds`. One of the 8 is a TRT `change_point` onset dated
2026-05-22, fourteen days after closure, which the served briefing suppresses:
`briefing_runs` holds only the 2025-11-01 and 2026-05-08 onsets for that venue.
**A deployment would not have raised it.** So the sentence claims for a deployment
a rate that a deployment would not produce.

The document already has a second, recorded reason the figure is an upper bound
(decision-log row 12, G12.13a: "per-day briefing without a persisted
`briefing_runs` chain over-counts continuing items"). This is a third, and both
run the same way.

| Candidate | Δ |
|---|---|
| "deployment fatigue rate" becomes "**harness** fatigue rate" | **0** |
| the above plus "; one is a post-closure alarm the served briefing suppresses" | +9 |

**Recommendation: the word-neutral swap.** It removes the only misleading word for
nothing. The +9 disclosure is available and unnecessary given
`FLAG-EVAL-HARNESS-UNGUARDED`, which is the disclosure of record.

**This is a fourth correction and it is free.**

### Item 15: the total, and the margin after it

Measured in situ on scratch copies, counting the seven files `\bodywordcount`
counts:

| Set | methodology | results | body total | Margin |
|---|---|---|---|---|
| baseline | 4,916 | 5,561 | **19,993** | **+7** |
| A1 + (b) + (c) + (d) | 4,916 | 5,563 | **19,995** | **+5** |
| A2 + (b) + (c) + (d) | 4,921 | 5,563 | **20,000** | **0** |

**The whole correction set fits.** At the recommended form the margin after it is
**+5**. At the most specific citation the document lands on **exactly 20,000**,
which does not exceed the limit and leaves nothing.

**This contradicts S12's costing and the correction is worth stating plainly.**
S12 reported "+8 against a margin of 7, one word over" from three corrections.
Three things moved it: the binding instrument is `texcount` and S12 priced with
`wordcount.py`; the joint-citation form at Δ 0 was not on S12's list, because S12
was solving a citation problem and not an arm-count problem; and the closure repair
lives in an appendix, so its cost was never against the cap in either direction.
The fourth correction, which S13 added, is free.

### Item 16: the slack, as a menu

**Nothing below has been executed. No reduction was made.**

#### 16.1 · Content counted that the submission rules exclude

**None, and this is a negative result that closes a whole avenue.** Part 1 item 6
establishes that the documentation states no exclusions. Everything currently
counted is counted legitimately, and the exclusions the declaration claims are
narrower than the count, not wider: the counted population is already only the
abstract plus six chapters, with the appendices and bibliography already outside
it. **There is no slack of this kind to find.**

#### 16.2 · The relocation lever, which is the largest item and is now connected

| Location | Saving | What is lost |
|---|---|---|
| Any body passage moved to `appendix/` | its full `texcount` value, word for word | the marker reads it in an appendix rather than in the chapter; a criterion bound to a chapter location is not served by an appendix |

Part 1 item 6(ii) establishes the mechanism: `\bodywordcount` counts
`chapters/*.tex` plus `abstract.tex` only, so a relocated paragraph leaves the
counted body entirely. `ledger/relocation_candidates.md` §0 says the opposite and
is stale; that file's §1 to §5 carry a per-passage candidate list prepared on
2026-08-09 and never executed, and every item on it is now live.

`ledger/reduction_cost_register.md:921-923` already names this as one of three
ways to restore a reserve, with the caveat "buys cap words, costs the marker's
view, `D2` unconfirmed."

**This is Phuong's ruling, item by item, per the 8C-7 brief.** It is not costed
further here because the candidate list already exists.

#### 16.3 · Redundant restatement, with both locations

Two items are on file with both locations quoted. Neither has been executed.

**(i) `ledger/reduction_cost_register.md:779`.** §5.1 RQ4, *"Ellel covers 0.692 ...
Beer Hall's shortfall ... calendar-closed pairs"*, against **`conclusion.tex:137-140`**,
which the register calls "a strict superset, same numbers plus *'the largest
miscalibration in the study'*". Priced at **~20**. Recorded as checked for
antecedent damage ("the next sentence's *'the decomposition'* keeps its
antecedent").

**(ii) `ledger/reduction_cost_register.md:780`.** §5.5's statement of the transfer
test's mechanism, against **§5.4**, R105's site 95 lines earlier. Priced at
**~13**. §5.5 keeps its own distinct claim.

Both are from the 8G de-duplication pass and both are marked as available rather
than taken.

#### 16.4 · Already considered and rejected, with the reason, and whether it still holds

Per the brief, nothing here is re-proposed without its rejection and a test of
whether the reason still holds.

| Candidate | Saving | Rejected because | Does the reason still hold? |
|---|---|---|---|
| §5.1's five question restatements (`reduction_cost_register.md:793`) | **~57** | "Genuine repetition ... **Refused on judgement:** R103 asks the Discussion to make the relation to each question visible, and a terse tag reads worse for no criterion's benefit" | **Yes on the criterion, and the register itself lists reversing it as one of three ways to restore a reserve (`:921`).** A readability judgement, not a criterion bar. Phuong's to reverse |
| *"the forecasts remain exactly coherent"* (§5.1 RQ2) | ~8 | "**A qualification wearing repetition's clothes.** Without it the negative claim widens from *'optimality cannot be claimed'* to *'coherence broke'*" | **Yes, fully.** Do not re-propose |
| §5.1 RQ3's marginal weather detection; RQ5's cost-ratio clause | not priced | "Both are **nulls carrying their own bounding qualifiers**. *Compression removes negative results first*, so these are exactly where a length pass must not go" | **Yes, fully.** Do not re-propose |
| Results' restatements of Methods rules (`results.tex:215-217`, `:290-291`) | ~40 | "each is the rule stated **at the point of its application**, next to the number it produced, and one is the explanation of the Beer Hall anomaly" | **Yes.** Do not re-propose |
| §6.2's measurements generally | not priced | "`00_marking_criteria.md` §1.1: *'Chapter 6 is the wrong place to look for savings'*, eight location-bound criteria, R109 to R116" | **Yes, fully** |
| 4.2.4 occurrence gating (`reduction_plan.md:39`) | 269 | "**declined**, the result is RQ2's null" | **Yes** |
| C-3 (`reduction_plan.md:265`) | 76 | "Declined by Phuong: *'the worst trade on the list'*" | **Yes, it is a ruling** |

**Summary of the menu.** One item is free of criterion objection and rulable
today (§5.1's five restatements, ~57, refused on readability). Two are
de-duplications already located and priced (~20 and ~13). One is unbounded and is
the 8C-7 lever (relocation). Five are refused on grounds that still hold and
should not be re-proposed.

---

## Part 5 · Two small items

### Item 22: the deselected network test

**`tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`
carries no marker.** `pytest.ini`/`pyproject` register no `network` or `slow`
marker, the test file imports no marker, and nothing in the test's name or
decorators signals that it reaches the network. Its failure mode is an
unauthenticated Hugging Face weight download in `.venv-eval`.

**What marking it would take**, not done here:

1. Register the marker (one line in the pytest config `markers` list, for example
   `network: needs outbound HTTP, deselect with -m "not network"`). Without
   registration `--strict-markers` runs error and unregistered markers warn.
2. One `@pytest.mark.network` decorator on the test.
3. Optionally a `-m "not network"` default in the config, which would change what
   a bare `pytest` collects and is therefore a behaviour change rather than a
   labelling one.

Cost: two lines, plus a ruling on point 3. **Not applied in this package.**

**The correct scoped form of the suite claim, quotable:**

> 15 new tests in `tests/test_partition_contrast.py` pass. Over `brain/tests/`,
> the suite exits 0 with one network-dependent test deselected
> (`test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`,
> which downloads Chronos weights and fails unauthenticated in `.venv-eval`). The
> failure is pre-existing and unrelated to any change in S12 or S13.

Any claim of a green suite that omits the deselection is over-broad by exactly one
test, and the test is not one this project's changes can affect.

### Item 23: the uncited bibliography entries

**Confirmed from biber's behaviour, not by inference. The four stale entries are
harmless and need no action before submission.**

The mechanism, stated in the order the toolchain runs it:

1. `biblatex` writes a `.bcf` control file listing the citation keys the document
   actually used, harvested from `\cite`-family commands during the LaTeX pass.
2. `biber` reads the `.bcf`, resolves **only those keys** against `ref.bib`, and
   writes one `\entry{...}` block per resolved key into `main.bbl`. An entry in the
   `.bib` file that no key names is never resolved and never emitted.
3. LaTeX `\input`s `main.bbl` to typeset the bibliography. A datum that is not in
   `main.bbl` is not in the document, so it cannot be printed and cannot be
   counted.

The measurement on this document, which is the check rather than the argument:
`main.bbl` contains **89** `\entry{` blocks, `ref.bib` contains **124** entries,
and an independent regex parse of the `chapters/` and `appendix/` sources finds
**89** distinct cited keys with **zero** cited-but-absent keys. The three numbers
are consistent: 124 minus 89 is the 35 uncited entries, and none of them reaches
`main.bbl`.

The word count is untouched for a second, independent reason: `\bodywordcount`'s
population is the six chapters plus `abstract.tex`, and the bibliography is in
neither, so the count cannot see `main.bbl` at all.

**Therefore the four entries with unreflected published versions**
(`norton_tailored_2025`, now *Science Advances* 12(29) eady7216, DOI
10.1126/sciadv.ady7216; `thakur_judging_2025`; `mohammadi_evaluation_2025`;
`staufer_2025_2026`) **print nowhere, count nothing, and need no action before
submission.** Correcting them remains worthwhile hygiene for the `.bib` file's own
sake and is not on any critical path.

The 35 uncited entries stay recorded for the author's judgement, with the same
four flagged in S12 as possible omissions rather than leftovers
(`tibshirani_conformal_2019`, `truong_ruptures_2018`, `ye_closer_2025`,
`athanasopoulos_forecast_2024`).

---

## Scope of every check in this report

| Check | Population | Instrument |
|---|---|---|
| Word count | 6 chapters + `abstract.tex` | `texcount -0 -sum -merge -total`, TeXcount 3.1.1 |
| Correction costs | the same 7 files, edited on scratch copies | the same invocation, in situ |
| Submission rules | 1 file, whole | read end to end, both length-bearing sections quoted |
| Served claims in chapters | `chapters/*.tex` + `abstract.tex`, 7 files | grep over `serve`/`Serve`/`production`/`adopt`, then read in context |
| Store writes | `forecasts`, `bands`, `served_forecast`, `ladder_selection` | DuckDB, read-only connection, all rows grouped |
| Bibliography | `ref.bib` 124 entries, `main.bbl` 89 blocks | `\entry{` count against a regex key parse |
| Store ceiling | `l1_daily` | `max(date)`, before and after: **2026-07-07** both times |

**Not checked:** whether an Overleaf compile reproduces 19,993 (this is a local
`texcount` on a local clone at `99ee32b7`; the two should agree because the
population is a file list, but that is a prediction, not a measurement). Whether
the two Chapter 5 production sentences have a defensible reading under some other
antecedent (they are reported, not adjudicated). Whether relocation candidates in
`ledger/relocation_candidates.md` §1 to §5 are individually still accurate at the
current chapter text.

**Not edited:** every `.tex` file, `ref.bib`, `main-words.sum`, every numbered
decision-log row, `signals/deviation.py`, `eval/agent_eval.py`, and every served
path.
