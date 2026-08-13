# 85 · Defect evidence for three document corrections

Package S12, Part 1. Read-only on every `.tex` and on `ref.bib`. No file in
`/Users/hapuna/Downloads/prj93-overleaf` was written by this session. The
corrections themselves belong in Overleaf, which is canonical; this report exists
so they can be written correctly and costed against a margin of seven words.

**Repo HEAD at start:** `e7fae52efe9d0aff8d4e27ad72839dbed4e02e5d`
**Overleaf clone HEAD:** `99ee32b75c8294abc808a2929115a7fb86af438f` (2026-08-13 21:10:59 +0100)
**Store ceiling asserted before this pass:** `l1_daily` max date = **2026-07-07**
(also `l2_category_daily`, `l3_item_daily`, `line_items`, `exog_weather_observed`,
`exog_weather_horizon`; `exog_weather_hindcast` and `..._leadmatched` run to
2026-07-14 by design, being lead-matched).

---

## 0 · The one finding that was not in the brief, first

Part 0 of the package says the unguarded deviation path "is recorded, described in
the document, and left in place", and item 11 asked whether any post-closure fire
reaches a reported result. **It does, and not by the route anyone was watching.**

`eval/agent_eval.py` computes the alert-fatigue bound that `results.tex:911`
reports as **8 items, an upper bound of 0.667 alerts a week**. Measured this
session, that 8 decomposes as Beer Hall 3, **Two River Taps 2**, Ellel 3. Both
Two River Taps items are change-point items, and one of them,

    change_point  onset 2026-05-22  down  medium  magnitude -73.24%

has an onset **fourteen days after the closure** (last active day 2026-05-08).
On the production briefing path that alarm does not exist: `briefing_runs` holds
exactly two Two River Taps change-point onsets, 2025-11-01 and 2026-05-08, and
`signals/change_point.py:173-183` collapses every later downward shift into the
single closure alarm. The eval harness reaches a different answer because
`eval/agent_eval.py:_signals_from_stream` reimplements the collection step and
omits both closure guards, while its own docstring says it works

> "exactly as `briefing.collect` does from the store, but over the perturbed stream."

It does not. `briefing._collect_deviation` carries `if closed and aend is not None
and onset >= aend: continue` (the G5c guard); `_signals_from_stream` has no such
line, and no `is_closed` call anywhere in the module's stream path. The second
omission is upstream: `fatigue_metrics` (`agent_eval.py:318`) selects its window
with `inject.holdout(stream)`, not with `_usable_folds`, which is the function
that carries the closure filter, so for a closed venue the fatigue window is
post-closure by construction.

So the defect class named in Part 0 is wider than the deviation endpoint. It has
two live sites, and the second one touches a printed number.

**This does not change what should be done.** Repairing it would move the
reported 0.667 and everything the cost sweep derives from it, eight days out. The
recommendation is unchanged: leave it, record it. It does change what the flag has
to say, and §2 of this report says it.

None of the fourteen post-closure **deviation** fires reaches a reported result.
Two artefacts persist seven of them (§1.2, item 11) and neither is cited by any
`.tex` file.

---

## 1.1 · The rung-4 citation

### Item 1: the sentence, verbatim

`chapters/methodology.tex`, lines 356-358, the sentence proper:

> Rung 4 is a pretrained time-series foundation model \citep{ansari_chronos_2024},
> zero-shot and without per-venue training, in a univariate arm and in an arm
> conditioned on the exogenous set of Section~\ref{sec:exo}; its served point
> forecast is the median quantile clipped at zero.

**40 words** by `brain/scripts/wordcount.py:count`, which is the project's own
tokenizer (citations contribute nothing, `\ref{sec:exo}` contributes one).

Its paragraph is `methodology.tex:348-358`, **137 words** by the same function.

### Item 2: every rung-4 arm the ladder can instantiate

Registered at `models/ladder.py:326-329`, guarded by `HAS_CHRONOS`:

| Arm identifier | Checkpoint, quoted from source | Conditioning |
|---|---|---|
| `rung4_chronos_bolt` | `CHRONOS_MODEL_ID = "amazon/chronos-bolt-small"`, `models/foundation.py:49` | univariate |
| `rung4_chronos2` | `CHRONOS2_MODEL_ID = "amazon/chronos-2"`, `models/foundation.py:50` | univariate |
| `rung4_chronos2_exo` | `CHRONOS2_MODEL_ID = "amazon/chronos-2"`, `models/foundation.py:50` | covariate-conditioned, known-future covariates via `future_df` |

The arm→checkpoint map is asserted a second time at `models/ladder.py:596-598`:

```python
_RUNG4_MODEL_IDS = {"rung4_chronos2": CHRONOS2_MODEL_ID,
                    "rung4_chronos_bolt": CHRONOS_MODEL_ID,
                    "rung4_chronos2_exo": CHRONOS2_MODEL_ID}
```

A fourth identifier, `rung4_foundation` (`models/ladder.py:369-384`), is a
placeholder emitted only when no backend is importable. It never predicts.

There is also `CHRONOS2_FALLBACK_MODEL_ID = "autogluon/chronos-2-small"`
(`foundation.py:51`), reached only by the resource guard and deliberately
unpinned; the source calls it "a degraded substitute, never a serving path".

### Item 3: served versus entrant

Measured against `store/brain.duckdb` at HEAD:

- `served_forecast`, the promotion pointer, holds **0 rows**.
- `ladder_selection` holds **0 rows**.
- `forecasts` holds 4,262 rows. Grouped by venue, layer, model and write time:

| venue | layer | model | rows | written |
|---|---|---|---|---|
| beer_hall | L1 | `conformal_rung4_chronos2` | 57 | 2026-07-08 15:23 |
| ellel | L1 | `conformal_rung1_robust_dow` | 57 | 2026-07-08 15:35 |
| ellel | L1 | `conformal_rung3_gbm` | 57 | 2026-07-08 19:00 |
| ellel | L1 | `conformal_rung2_ets` | 100 | to 2026-08-06 23:09 |
| beer_hall | L1 | `conformal_rung2_ets` | 94 | to 2026-08-06 23:09 |
| two_river_taps | L1 | `conformal_rung2_ets` | 85 | to 2026-08-06 23:09 |
| beer_hall | L2/L3 | `mint_dowmedian` | 752 / 3,060 | to 2026-08-06 23:04 |

**No rung-4 arm is currently served.** The most recent write at every venue is
`conformal_rung2_ets`. The single rung-4 row set is a `rung4_chronos2` write from
2026-07-08 that nothing has refreshed since. All three arms are entrants; one of
them has a month-old residue in the forecast table.

That bears directly on the sentence, which says "its **served** point forecast is
the median quantile clipped at zero". The clause is true of what the code returns
(`foundation.py:362-368` takes the `"0.5"` column and applies `np.clip(out, 0.0,
None)`), and it is a claim about serving that this store does not currently
support. It is also worth noting the gate reports and the store disagree about
which rung-4 arm won at the Beer Hall: `models/ladder_results_L1_beer_hall.md`
names `rung4_chronos2_exo` (0.745) as best entrant and adopted, `appendix/tables.tex:37`
bolds the same 0.745, and the forecast row that exists is `rung4_chronos2`.
Recorded, not resolved. `served_forecast` is empty, so no promotion record
adjudicates it.

### Item 4: is Chronos-Bolt citable?

**Yes, and by the entry already in the sentence.** The Hugging Face model card for
`amazon/chronos-bolt-small` gives no separate paper and states:

> "If you find Chronos or Chronos-Bolt models useful for your research, please
> consider citing the associated paper"

with BibTeX pointing to arXiv 2403.07815, the original Chronos paper, which is
`ansari_chronos_2024`. There is no Chronos-Bolt paper, no technical report, and no
dedicated model card citation.

**This narrows the defect and changes the repair.** `ansari_chronos_2024` is the
*correct* citation for `rung4_chronos_bolt`. It is wrong only for the two
Chronos-2 arms. The sentence is not uncitable; it is under-cited by exactly one
key, and the key it carries is right for the arm the sentence does not mention.

### Item 5: `ansari_chronos-2_2025` in `ref.bib`

Present. Key exactly `ansari_chronos-2_2025`, at `ref.bib:1841`, `@misc`,
arXiv:2510.15821, DOI `10.48550/arXiv.2510.15821`, dated 2025-10-17,
title "Chronos-2: From Univariate to Universal Forecasting".

Cited in `chapters/` at exactly one place, `literature_review.tex:50-51`:

> Chronos-2 \citep[a 2025 preprint]{ansari_chronos-2_2025} adds a \emph{group}
> attention layer aggregating across series sharing a group identifier, so
> cross-series learning happens at inference rather than at training, its authors
> naming short histories and cold starts as where that helps most.

No occurrence in `appendix/`.

### Item 6: every other use of `ansari_chronos_2024`

One, at `literature_review.tex:41`, inside a seven-key list introduced by
"Time-series foundation models pretrain on large heterogeneous corpora and
forecast unseen series zero-shot". **Correct.** Chronos belongs in that list on
exactly those grounds, and the list makes no covariate claim.

So `ansari_chronos_2024` is used twice: correctly at `literature_review.tex:41`,
and at `methodology.tex:357` where it is correct for one of three arms.

### What the appendix already gets right

`appendix/tables.tex:37-39` tables all three arms under distinct labels,
"4 foundation, univariate", "4 foundation, exogenous", "4 foundation, Bolt
(univariate)", and the comment at `tables.tex:44-45` states plainly that
"Rung 4 carries three foundation arms, two chronos-2 (univariate and exogenous)
and one chronos-bolt-small, all zero-shot and pinned by revision hash."
`appendix/pseudocode.tex:74-76` pins both revision hashes. The methodology
sentence is the only place in the document that describes rung 4 as one model.

---

## 1.2 · The closure-guard scope claim

### Item 7: the sentence, verbatim, with its scope

`appendix/robustness.tex:440`:

> A repeated alarm on a known-closed venue would have violated that behaviour.

**12 words.** Its paragraph (`robustness.tex:436-441`, **74 words**) fixes what
"that behaviour" refers to:

> Both production detectors fired on it, the two-sided cumulative-sum scheme at
> $k = 0.5$, $h = 5$ and the four-of-seven persistence gate, and neither alone:
> the onset was dated to 8 May 2026 and the alarm raised on 16 May, eight trading
> days later. The closure flag then made monitoring dormant, so the run of
> structural zeros that followed raised nothing further. A repeated alarm on a
> known-closed venue would have violated that behaviour.

The scope is the two production **change-point** detectors, and on that scope the
claim is true. The section is `\label{app:closure-case}` under the heading "The
Two River Taps closure, in full", which is where "in full" starts doing work the
paragraph cannot support.

### Item 8: every module that references `is_closed`

Definition: `store/active_span.py:67`.

**Referencing (non-test, non-doc):**

| File | Lines | What the reference does |
|---|---|---|
| `signals/change_point.py` | 47, 173, 175 | **suppresses** repeat post-closure down-alarms |
| `signals/briefing.py` | 86, 133, 459 | 133 computes `closed`/`aend` for `_collect_deviation`; 459 appends a note only |
| `signals/residual.py` | 41, 64, 126 | 64 **includes** the post-closure zero run; 126 attributes an onset to the closure |
| `models/ladder.py` | 66, 666 | evaluation span |
| `eval/agent_eval.py` | 41, 422 | `_usable_folds` only, not `fatigue_metrics` and not `_signals_from_stream` |
| `sim/brain_over_july.py` | 109 | note text |

Note that `residual.py`'s use is not a guard in the suppressing sense. At
`residual.py:64-72` the closure branch deliberately reindexes to the dataset-global
max and zero-fills, "so the closure is an abrupt, detectable drop (the trimmed
active span would hide it)". The post-closure days are in the stream on purpose.
What keeps them from firing is meant to be the trading-day filter at
`residual.py:96`, `if exp_i <= _EPS: continue`, and that filter tests the
**expanding day-of-week median**, which stays well above zero for months after a
venue stops trading. That is the mechanism of the whole defect.

**`signals/` modules with zero `is_closed` occurrences** (`grep -c` per file):

`__init__.py`, `agent.py`, `chatlog_kb_gap.py`, `checklist_discipline.py`,
**`deviation.py`**, `feature_ablation.py`, `occurrence.py`, `stock_inventory.py`,
`weather_diagnostic.py`.

Of those, `deviation.py` is the one that classifies days against a band, and its
own docstring makes the claim that fails:

> "The stream is leakage-free (expanding one-step-ahead), trading days only, so a
> booking-driven venue's structural-zero days never raise a false deviation."

### Item 9: every endpoint, and which reach an unguarded path

`service/app.py`:

| Line | Endpoint | Signal path reached | Guarded? |
|---|---|---|---|
| 174 | `GET /health` | none (row counts) | n/a |
| 193 | `GET /forecast` | store read | n/a |
| **249** | **`POST /deviation/check`** | `signals.deviation.check_point` | **NO** |
| **277** | **`POST /deviation/scan`** | `signals.deviation.scan` | **NO** |
| 298 | `GET /sop-gaps` | `signals.chatlog_kb_gap` | n/a (no venue-closure concept) |
| 303 | `GET /stock/cover` | `stock_cover` table | n/a |
| 342 | `POST /deviation/changepoint` | `change_points` table (written by the guarded detector) | yes |
| 383 | `POST /checklist/discipline` | `signals.checklist_discipline` | n/a |
| 394 | `GET /briefing` | `signals.briefing.build` → `collect` → `_collect_deviation` | **yes** |
| 494 | `GET /freshness` | `ingest.refresh.freshness` | n/a |

**Two endpoints reach the unguarded path: `POST /deviation/check` and
`POST /deviation/scan`.** Both import `signals.deviation` directly at
`app.py:260` and `app.py:283` and neither consults `is_closed`.

### Item 10: the fourteen fires, and which surface would show them

Computed on the live store: `build_residual_stream("two_river_taps")` yields 313
rows, of which 42 fall after the last active day (2026-05-08).
`signals.deviation._classify` at `DEV_BAND_K = 1.0`, `DEV_SEVERE_K = 2.0` returns
`deviation` on fourteen of the 42.

| # | Date | Actual | Expected | Scale | z | Dir | Sev | Briefing shows it? | Direct endpoint shows it? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-05-09 | 0.00 | 595.45 | 431.74 | −1.379 | down | medium | no | yes |
| 2 | 2026-05-15 | 0.00 | 675.53 | 444.79 | −1.519 | down | medium | no | yes |
| 3 | 2026-05-16 | 0.00 | 590.08 | 471.64 | −1.251 | down | medium | no | yes |
| 4 | 2026-05-22 | 0.00 | 673.68 | 472.24 | −1.427 | down | medium | no | yes |
| 5 | 2026-05-23 | 0.00 | 584.72 | 473.68 | −1.234 | down | medium | no | yes |
| 6 | 2026-05-29 | 0.00 | 672.74 | 473.97 | −1.419 | down | medium | no | yes |
| 7 | 2026-05-30 | 0.00 | 574.80 | 477.38 | −1.204 | down | medium | no | yes |
| 8 | 2026-06-05 | 0.00 | 671.79 | 480.63 | −1.398 | down | medium | no | yes |
| 9 | 2026-06-06 | 0.00 | 564.88 | 480.63 | −1.175 | down | medium | no | yes |
| 10 | 2026-06-12 | 0.00 | 665.20 | 489.97 | −1.358 | down | medium | no | yes |
| 11 | 2026-06-13 | 0.00 | 549.97 | 524.21 | −1.049 | down | medium | no | yes |
| 12 | 2026-06-19 | 0.00 | 658.62 | 524.21 | −1.256 | down | medium | no | yes |
| 13 | 2026-06-26 | 0.00 | 654.84 | 525.51 | −1.246 | down | medium | no | yes |
| 14 | 2026-07-03 | 0.00 | 651.07 | 515.97 | −1.262 | down | medium | no | yes |

Every one has `actual = 0.00` exactly. Every one is a Friday or a Saturday, the
two weekdays whose expanding day-of-week median is large enough for a zero to
clear `|z| > 1`. The magnitudes drift toward zero over time as each zero pulls the
median down. The defect is self-limiting, and would have stopped firing on its
own after roughly another quarter.

**The served briefing path is guarded and shows none of them.** Two independent
confirmations:

1. `signals/briefing.py:156-158`, `if closed and aend is not None and onset >=
   aend: continue`, commented "G5c: a closed venue's post-closure days are
   represented by the closure change-point, not routine deviation items". Every
   one of the fourteen has a date strictly after `aend`, so every one is dropped.
2. `briefing_runs` in the live store holds 55 rows. Grouped for Two River Taps:
   `sop` 5 and `change_point` 10, `deviation` **0**. The query
   `select count(*) from briefing_runs where venue='two_river_taps' and
   source='deviation' and onset_date > DATE '2026-05-08'` returns **0**.

This is the branch item 10 anticipated, and it does change what the document has
to say. The claim at `robustness.tex:440` is not false. It is unqualified about a
surface it does not cover.

### Item 11: does any post-closure fire feed a reported result?

**No post-closure *deviation* fire does. One post-closure *change-point* alarm
does.** Detail in §0 above; it is one of the 8 items behind the 0.667/week bound
at `results.tex:911`.

Two artefacts do persist post-closure deviation fires, and neither is referenced
by any `.tex` file (checked by grep across `chapters/` and `appendix/`):

- `sim/june2026_brain_result.json`, six, at 2026-06-05, -06, -12, -13, -19,
  -26, all `actual: 0.0`, matching rows 8-13 above to two decimal places.
- `sim/july2026_brain_result.json`, one, at 2026-07-03, `z: -1.26`, matching
  row 14.

The July file is internally contradictory in a way worth recording: its
`trt_closed_note` reads

> "Two River Taps is_closed; the briefing marks its closure dormant (no routine
> deviation items) and the persisted chain labels it continuing, not a daily new
> alarm (contrast June's 6 downward deviations)."

and the same file's `deviation` block lists the 2026-07-03 fire. Both statements
are true of different code paths in the same artefact.

One further occurrence, not a fire: `eval/deviation_eval.md` reports Two River
Taps' "latest trading day" as **2026-07-05, actual 0.0, status normal, z −0.60**,
under a table footnote reading "Trading days only (the shared stream excludes
structural-zero days)". The day is post-closure and the revenue is zero, so the
footnote is false for that row. Not cited by any `.tex` file.

---

## 1.3 · The realism arm's coverage

### Item 12: the passage, verbatim

`chapters/results.tex:759-762`:

> Section~\ref{sec:injection} expected the detection figures below to be upper
> bounds, the corpus perturbing the standardised residual stream while holding the
> forecast expectation fixed. They were not. Measured against a realistic arm of
> $120$ paired injections re-derived under the production refit policy
> (Appendix~\ref{app:injection-pipelines}), the discount was zero for every event
> kind, at a paired interval of $[0.0, 0.0]$, and the pre-registered

**61 words** to line 762; the sentence completes at line 764 and the full span
759-766 is **110 words**. No venue qualifier appears anywhere in it.

### Item 13: the Ellel-exclusion sentences

`chapters/methodology.tex:623-624` (clause within a 37-word span):

> The paired comparison runs on a stratified subsample of $n_{\mathrm{sub}} = 120$
> under a recorded seed, because the realistic arm re-runs the forecaster for
> every event; Ellel is excluded, its occurrence label being inert without the
> booking diary.

`appendix/robustness.tex:39-41` (43 words):

> Ellel is excluded for the reason Section~\ref{sec:res-injection} gives, that
> without the booking diary its occurrence label is inert and an injection there
> could not be verified to land on a trading day.

### Item 14: record counts in `injection_realism.json`

Confirmed. `n_total: 120`, `store_ceiling: "2026-07-07"`, `sample_seed: 95`,
`bootstrap_seed: 96`, `bootstrap_B: 10000`, `onset_position: "early"`.

| Kind | n | pool | beer_hall | two_river_taps | ellel |
|---|---|---|---|---|---|
| regime_shift | 64 | 84 | 38 | 26 | **0** |
| spike | 32 | 60 | 25 | 7 | **0** |
| exo_coincident | 24 | 72 | 8 | 16 | **0** |
| **total** | **120** | | **71** | **49** | **0** |

The per-stratum counts and pool sizes match `robustness.tex:36-37` exactly
(64 from 84, 32 from 60, 24 from 72), as do the two seeds and $B$. **Ellel
contributes zero records**, so the exclusion is real in the artefact and not only
in the prose.

### Item 15: every other description of the realism arm

| Location | Venue coverage qualified? |
|---|---|
| `chapters/results.tex:759-766` | **no** |
| `chapters/methodology.tex:622-624` | **yes**, "Ellel is excluded" |
| `appendix/robustness.tex:28-31` | no, but describes the pipeline rather than the sample |
| `appendix/robustness.tex:34-41` | **yes**, the stratification, seeds, and exclusion |
| `appendix/robustness.tex:54-56` | no; figure caption, describes the two arms |
| `appendix/robustness.tex:65-70` | no; pipeline definition |
| `appendix/robustness.tex:332` | no; reports the $[-0.011, 0.000]$ precision interval |

Two of seven qualify it, and both are outside Chapter 4. A reader of the results
chapter alone sees "120 paired injections" over a three-venue estate.

---

## 1.4 · Word budget

### Item 16: the current countable total

**Method:** `texcount -0 -sum -merge -total` over the six chapters and the
abstract, invoked by `\bodywordcount` at `main.tex:255-257` and written to
`main-words.sum`. That macro, not `wordcount.py`, is what the declaration prints.
`declaration.tex` scopes it: "The body of this dissertation, comprising the
abstract and Chapters 1 to 6 … That count excludes the bibliography and the
appendices, and the permitted maximum is 20,000 words."

**`main-words.sum` = 19,993. Margin = 7 words.**

That figure carries one caveat and it is the caveat this project has been bitten
by before. `texcount` is not installed on this machine. `which texcount` fails
and a filesystem search finds no binary, so the number could not be recomputed
here. Its mtime is 2026-08-13 21:10:29, thirty seconds before the HEAD commit at
21:10:59 and after every chapter's mtime, so it is current with respect to the
working tree; but `main.log`, `main.aux` and `main.pdf` all date from 2026-08-12
22:24, which means no local compile produced it. **Treat 19,993 as
UNVERIFIED-LOCALLY and re-read it from the next Overleaf compile before acting on
a seven-word margin.**

The independent breakdown, from `brain/scripts/wordcount.py` (a different
tokenizer with two documented over-reads, so its totals are not interchangeable
with texcount's):

| File | Body | Artefact | Marker | Floats | Caption words |
|---|---|---|---|---|---|
| `abstract.tex` | 321 | 0 | 321 | 0 | 0 |
| `introduction.tex` | 1,176 | 7 | 1,169 | 0 | 0 |
| `literature_review.tex` | 3,493 | 10 | 3,483 | 1 | 51 |
| `methodology.tex` | 4,798 | 113 | 4,685 | 5 | 234 |
| `results.tex` | 4,805 | 28 | 4,777 | 14 | 799 |
| `discussion.tex` | 2,572 | 7 | 2,565 | 1 | 37 |
| `conclusion.tex` | 1,875 | 10 | 1,865 | 0 | 0 |
| **sum** | **19,040** | **175** | **18,865** | **21** | **1,121** |

`wordcount.py` charges captions to a separate 1,200-word line; texcount counts
them inline. 19,040 + 1,121 = 20,161 against texcount's 19,993, a 168-word gap
consistent with the artefact over-read of 175. The two instruments agree to
within their known difference, which is the most that can be said without
texcount present.

### Item 17: minimum word delta per correction

**Rung-4 citation.** Three options, costed with the same tokenizer:

| Repair | Δ | Correct? |
|---|---|---|
| Swap `ansari_chronos_2024` → `ansari_chronos-2_2025`, change nothing else | **0** | No. Leaves the Bolt arm cited to a Chronos-2 paper |
| Name all three arms with both keys (draft below) | **+5** | Yes |
| Keep both keys, name only the two Chronos-2 arms and drop the Bolt mention | 0 to +2 | Partial; the appendix already tables Bolt |

The word-neutral swap is available and it is wrong, because §1.1 item 4
establishes that `ansari_chronos_2024` is the *correct* citation for Chronos-Bolt.
The five-word repair reads:

> Rung 4 is a pretrained time-series foundation model, zero-shot and without
> per-venue training, in a Chronos-2 univariate arm, a Chronos-2 arm conditioned
> on the exogenous set of Section~\ref{sec:exo} \citep{ansari_chronos-2_2025},
> and a Chronos-Bolt univariate arm \citep{ansari_chronos_2024}; its served point
> forecast is the median quantile clipped at zero.

**45 words against 40. Δ = +5, against a margin of 7.** It fits, and it consumes
five sevenths of the margin, so it should be the last of the three to be applied,
or paired with a five-word saving found elsewhere in the same paragraph.

**Closure-guard scope.** Can be made **word-neutral**. The paragraph currently
spends 12 words on the unqualified claim; replacing it with a scoped claim of the
same length costs nothing, for example:

> A repeated alarm on either production detector would have violated that
> behaviour.

That is 12 words for 12. A version that also discloses the unguarded primitive
cannot be word-neutral and costs roughly **+18 to +25**, which the margin does not
currently hold. If the flag in §2 is the disclosure of record, the neutral scoping
is sufficient for the document.

**Realism qualifier.** Costs **+3**, inserting "at two venues" or "Ellel excluded"
into `results.tex:760`:

> Measured against a realistic arm of $120$ paired injections at the two
> continuously-trading venues, re-derived under the production refit policy …

**Total for all three at the minimum correct form: +8 words against a margin of
7.** One word over. Taking the neutral closure repair and the +3 realism
qualifier costs 3, leaving 4 for the citation, which needs 5. The cheapest
resolution is a single one-word saving anywhere in the six counted chapters, and
the second cheapest is the partial citation repair at +0 to +2 with the Bolt arm
left to the appendix, which already names it.

---

## 1.5 · Withdrawn-source sweep

### Item 18: arXiv:2303.03995

**Absent and uncited.** `grep -rn "2303.03995\|Ardeshir" ref.bib chapters/ appendix/`
returns nothing. Deng, Ardeshir and Hsu do not appear in the bibliography under
any spelling.

### Item 19: every arXiv entry, and the entry count

**`ref.bib` holds 124 entries** (`grep -c "^@"` = 124, and an independent regex
parse of `@type{key,` also yields 124).

**The earlier figure of 111 was right when it was taken, and is now stale.**
Counted at each revision that touched the file:

| commit | date | entries |
|---|---|---|
| 88070cc | 2026-07-01 | 79 |
| 5561c97 | 2026-07-20 | 105 |
| 6c4ddb4 | 2026-07-20 | 108 |
| **296d595** | **2026-07-27** | **111** |
| be6d430 | 2026-07-30 | 112 |
| 5cbf80d | 2026-08-01 | 113 |
| c9643c4 | 2026-08-01 | 114 |
| 3257569 | 2026-08-03 | 118 |
| 9174a2d → 922e97e | 2026-08-06 | 120 → 121 |
| a8fe565 | 2026-08-11 | 122 |
| 60a5efd, 762a028, eb0c110 | 2026-08-12 | 124 |

Thirteen entries were added between 2026-07-27 and 2026-08-12. No entry was lost.

**arXiv sweep.** Forty entries carry an `eprint` field or mention arXiv; thirty-nine
distinct identifiers were queried against the arXiv API in two batches. **All
thirty-nine resolved. None is withdrawn.** No entry's comment or abstract contains
a withdrawal notice.

Four entries have a published version the bibliography does not yet reflect:

| Key | arXiv | Published version now on record | Cited? |
|---|---|---|---|
| `norton_tailored_2025` | 2501.16325 | *Science Advances* **12**(29), eady7216, 2026-07-17, DOI `10.1126/sciadv.ady7216`, confirmed independently against CrossRef | **no** |
| `thakur_judging_2025` | 2406.12624 v6 | Proc. Fourth Workshop on Generation, Evaluation and Metrics (GEM²) 2025 | **no** |
| `mohammadi_evaluation_2025` | 2507.21504 | GEM² 2025; the entry already carries DOI `10.1145/3711896.3736570` but is typed `@misc` | **no** |
| `staufer_2025_2026` | 2602.17753 | "To be published at ACM FAccT 2026"; forthcoming, so `@misc` is defensible | **no** |

None of the four is cited anywhere in the live text, so none reaches the printed
bibliography and none is urgent.

Version drift was checked for every entry cited for a specific claim. The one that
matters is `hoo_tables_2026` (2501.02945), now at **v4**, from which
`literature_review.tex:53-55` quotes verbatim. **The entry already handles this**,
carrying `note = {v4, 26 January 2026; arXiv identifier is the January 2025 first
posting}`. No other cited entry quotes or paraphrases a version-sensitive claim
from an entry at v3 or later.

### Unrequested finding: the bibliography carries 35 unprinted entries

Two independent instruments agree:

- A parse of every `\cite`-family macro across `main.tex`, `chapters/` and
  `appendix/`, with whole-line comments stripped, finds **89 distinct keys cited**
  and **35 of the 124 entries uncited**.
- `main.bbl` from the last compile contains **89 `\entry{` blocks**.

There is no `\nocite` anywhere. **Zero keys are cited but missing from `ref.bib`**,
so nothing is broken and nothing prints wrong; the 35 are inert weight. Among
them are `tibshirani_conformal_2019`, `truong_ruptures_2018`, `ye_closer_2025`
and `athanasopoulos_forecast_2024`, four entries whose subjects are close enough
to this dissertation's argument that their being uncited may be an omission rather
than a leftover. Recorded for the author's judgement; no action taken.

---

## Scope of every check in this report

| Check | Instrument | Population |
|---|---|---|
| Word counts of spans | `brain/scripts/wordcount.py:count` | the quoted span only |
| Chapter totals | `brain/scripts/wordcount.py` | 6 chapters + abstract |
| Declared total | `main-words.sum`, read not recomputed | texcount's population |
| `is_closed` sweep | `rg -n`, then `grep -c` per file in `signals/` | repo minus `.venv*`, `graphify-out/` |
| Endpoint enumeration | `rg` on `@app.` decorators in `service/app.py` | that file only |
| The 14 fires | `signals.residual.build_residual_stream` + `signals.deviation._classify` | Two River Taps L1, live store |
| Briefing suppression | `signals.briefing.collect` + `briefing_runs` query | Two River Taps, live store |
| Fatigue decomposition | `eval.agent_eval.fatigue_metrics` + `surface` | three venues, live store |
| Realism counts | `json.load` on `eval/injection_realism.json` | all 120 records |
| arXiv withdrawal | arXiv API `id_list`, 2 batches, 39 ids | every eprint in `ref.bib` |
| Norton publication | CrossRef `api.crossref.org/works` | one bibliographic query |
| Cited-vs-uncited | regex parse + `main.bbl` `\entry{` count | `main.tex`, `chapters/`, `appendix/` |

**Nothing was fixed.** `signals/deviation.py` is unmodified, no `.tex` file was
written, `ref.bib` is unmodified, and no numbered decision-log row was edited.
