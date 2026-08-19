# 107 · S35 · Rulings applied, the two stale sites repaired, the exogenous limitation drafted

**Package:** S35, apply then measure then draft, continuing on `feedback-hansi` with the cap suspended.
**Predecessor:** S34, `brain/log/106_hansi_items_drafted.md`, branch at `0d87d8a`.
**Regime:** nothing pushed, `main` not touched, no API call, no credential, no change to the brain codebase, store, ceiling, served models or frozen artefacts.

---

## 0 · State at both ends

| | V0 (start) | V7 (end) |
|---|---|---|
| Overleaf clone branch | `feedback-hansi` at `0d87d8a` | `feedback-hansi`, six files modified |
| local `main` SHA | `019f1354794db20a6f70375de65b4cecdaea17b2` | `019f1354794db20a6f70375de65b4cecdaea17b2` |
| `git ls-remote origin` HEAD | `019f1354794db20a6f70375de65b4cecdaea17b2` | `019f1354794db20a6f70375de65b4cecdaea17b2` |
| `git ls-remote origin` refs/heads/main | `019f1354794db20a6f70375de65b4cecdaea17b2` | `019f1354794db20a6f70375de65b4cecdaea17b2` |
| **store ceiling**, `max(date)` on `l1_daily` through `.venv-forecast`, read-only | **2026-07-07** | **2026-07-07** |
| `config.EXPECTED_STORE_CEILING` | 2026-07-07 | 2026-07-07 |
| counted body | **20,085** | **20,206** |
| appendices | 10,631 | **10,689** |
| `latexcheck main.tex --shell-escape` | PASS, 116 pages | PASS, **117 pages** |
| undefined references / citations / floats lost | 0 / 0 / 0 | 0 / 0 / 0 |
| overfull / underfull boxes | 4 / 14 | 4 / 14 |
| `venueordercheck.py chapters abstract.tex` | PASS | PASS |
| Ryan's clone (read-only, S33) | `cc93b6fa123791863072ec594dc3162208fa6812`, `master` | unchanged; `git status --porcelain` empty, reflog holds the clone and nothing else |
| ai-gm repo HEAD | `40c97697` | this report |

**`origin/main` did not move. The branch is 206 words over the cap.** Expected under the suspension.

### 0.1 · Per file

| file | S34 `0d87d8a` | S35 | delta |
|---|---:|---:|---:|
| `abstract.tex` | 320 | 321 | **+1** |
| `chapters/introduction.tex` | 1,205 | 1,224 | **+19** |
| `chapters/literature_review.tex` | 3,606 | 3,606 | 0 |
| `chapters/methodology.tex` | 4,919 | 4,958 | **+39** |
| `chapters/results.tex` | 5,566 | 5,566 | 0 |
| `chapters/discussion.tex` | 2,634 | 2,663 | **+29** |
| `chapters/conclusion.tex` | 1,835 | 1,868 | **+33** |
| **counted body** | **20,085** | **20,206** | **+121** |
| `appendix/pseudocode.tex` | 3,486 | 3,544 | **+58** |
| **appendices** | **10,631** | **10,689** | **+58** |

---

## 1 · V1 · The six ruled items, applied

| item | forecast | **measured** | file |
|---|---:|---:|---|
| **V3-restore**, spans a, b and d; c refused | +19 | **+19** | `discussion.tex` |
| **V1-1a**, abstract with the triple kept | +1 | **+1** | `abstract.tex` |
| **P1-min**, static-regime outcome | +15 | **+16** | `methodology.tex` |
| **P2-full**, ceiling plus Winkler, with its split | +33 | **+33** | `conclusion.tex` |
| **P3**, what the knowledge-gap signal does | +23 | **+23** | `methodology.tex` |
| **P4**, name the three catalogued divergences | +10 | **+10** | `discussion.tex` |
| **total** | **+101** | **+102** | |

**The one divergence is P1-min, and it is the ruling's own wording, not drift.** S34 priced P1-min
as the day-of-week comparison in words: *"on a single static block the day-of-week baseline is not
defeated at the Beer Hall"*, +15. The ruling replaced that with the no-forecast outcome, because
`_CHRONOS2["api"]` is last-write-wins within a process and so it is **not established that both
static-block arms were scored by the same call path**, a qualification that stays in Appendix B.13.
The applied clause is *"on a single eight-week static block the served exogenous arm produces no
forecast at any venue"*, **+16**. Both forms were measured against the same base
(`0d87d8a:chapters/methodology.tex`, 4,919): the S34 form returns 4,934 and the ruled form 4,935,
so the +1 is one word of wording and nothing else. **The 0.704 / 0.721 pair is not named in the
body.**

The no-forecast half carries no such caveat. B.13's call-path disclosure is about *"whether the
univariate arm's static figure was produced by the same dataframe call as its rolling figures"*,
which is the 0.721. The exogenous arm's `ValueError` at all three venues is not a scoring
comparison at all.

### 1.1 · P2-full and its split

The forecast was that P2-full would take the Further Work sentence to **66 words**, four longer
than the 62 that V6 #19 repaired. It is applied with its own split:

| | words |
|---|---:|
| before V6 #19 (one sentence) | 62 |
| after V6 #19 | 33 |
| after P2-full **without** a split (forecast) | 66 |
| **after P2-full with its split, sentence 1** | **28** |
| **after P2-full with its split, sentence 2** | **38** |

The repair and its blocked covariate stay in one sentence; the ceiling measurement becomes its own.
Both are under 40 words, so V6 #19's gain is kept.

### 1.2 · The abstract at 300 of 300

`wordcount.py` returns **300** marker words for the abstract section against the 300 regulation cap.
`texcount` on the file moves 320 to 321. `venueordercheck.py` PASS. The one word of headroom is now
spent and none remains. The revision, its reasoning and the reason the 399 / 386 / 331 triple stays
are recorded in the file's own comment block, where it has recorded every previous revision.

---

## 2 · V2 · The stale temperature sentence

### 2.1 · The sentence as it stood, quoted verbatim from `appendix/pseudocode.tex`

> For each candidate item the agent returns a probability that the item is worth raising, with a
> rationale and the hash of the prompt that produced it. **Temperature is zero and the model
> identifier is pinned.** Every response is cached on disk keyed on prompt, model and item payload,
> and the evaluation replays from that cache without service calls, so a reader without a credential
> can reproduce every number.

`grep` over `abstract.tex`, `chapters/` and `appendix/` for `Temperature is zero` returns **one**
hit, `appendix/pseudocode.tex:302`. It is not in the counted body.

### 2.2 · The sentence as rewritten

> For each candidate item the agent returns a probability that the item is worth raising, with a
> rationale and the hash of the prompt that produced it. **The model identifier is pinned and no
> sampling parameters are sent, because the pinned model rejects them: decoding is therefore not
> fixed by a temperature setting, and a repeated call is not guaranteed to return the same response.
> What makes the numbers reproducible is the cache and not the decode.** Every response is cached on
> disk keyed on prompt, model and item payload, and the evaluation replays from that cache without
> service calls, so a reader without a credential can reproduce every number, **while a second live
> run would be a new measurement rather than a repeat of this one.**

**Appendix delta +58. Counted body delta 0.**

### 2.3 · The determinism claim, addressed rather than reworded

The old sentence carried two different things under one word, and only one of them survives.

- **Cache-key stability is intact.** `live_execute`'s docstring states it: the key is
  `hash(model, prompt_hash, scenario_payload)` and *"temperature was never a term in it"*. The 644
  injections still collapse to 420 distinct calls exactly as `ledger/agent_eval_numbers.md` records,
  and the frozen prompt hash `c1137f76` is unaffected. **This is what that docstring means by "the
  determinism the pre-registration relies on is unaffected".**
- **Decode determinism is secured by nothing.** No sampling parameter is sent, so the sampled output
  of a live call is not pinned by anything in the apparatus. The rewritten text says so in terms: it
  names the cache as what makes the reported numbers reproducible, and states that a second live run
  is a new measurement.

**The claim is not smuggled back in under other words.** The rewrite adds the negative explicitly
(*"a repeated call is not guaranteed to return the same response"*) rather than leaving a reader to
infer it from an absence.

### 2.4 · The correction row

Appended to `brain/ledger/numbers_audit.md` as **ADDENDUM 2026-08-19 (S35 V2)**. Row 26 at `:187` is
quoted verbatim there and **not edited**. Three drifts are recorded: the substantive one above; the
trace line, since row 26 cites `config.py:448` and `AGENT_TEMPERATURE` is now at `config.py:514`;
and the document site, since row 26 cites *"methodology.tex § Intervention layer"* and the sentence
now lives in the appendix.

`config.AGENT_TEMPERATURE = 0.0` **stays in `config.py`**, per the ruling and per S32's reasoning:
deleting a constant a trace points at would falsify the trace, and the addendum is the trace.

**Named so it is not lost, not repaired here:** `config.py:508` still comments *"Model + temperature
+ prompt VERSION are pinned and stamped into every"*. It is a code comment rather than a document
claim, and the brain codebase was out of scope.

---

## 3 · V3 · The four-against-three antecedent

### 3.1 · The mapping, established before any prose was touched

**The three requirements, quoted from `chapters/introduction.tex`:**

> Such a layer needs three things a forecast alone does not give it. It needs **a model of what is
> normal at each venue**, **an honest measure of the uncertainty around that model**, and **a rule
> for deciding when a departure is worth an operator's attention given that interrupting them has a
> cost.**

**The four qualifications, quoted from `sec:intro-gap` as S34 left them:**

1. *"Pooling pays on collections far larger than three venues \citep{montero-manso_principles_2021}."*
2. *"Weather is recommended more often than it is tested and vanishes at the venue total where it has been tested \citep{judd_forecasting_2025}."*
3. *"A conformal band's two-sided guarantee rests on a condition a trading calendar violates by construction \citep{angelopoulos_conformal_2023}."*
4. *"And an alert can be weighed against the asymmetric cost of a false one \citep{meyer_conceptual_2004} though never at a threshold fixed to a particular operator's stated preferences."*

**The mapping, and it IS correct:**

| requirement | qualifications | why |
|---|---|---|
| R1, a model of what is normal | **1 and 2** | Pooling and weather are the two ways of improving that model beyond a venue's own history. They are the two limbs of RQ3, which asks exactly that: *"Does weather, or cross-series pooling across venues, improve forecast accuracy beyond what a venue's own trading history supports?"* |
| R2, an honest measure of the uncertainty | **3** | The conformal band is the uncertainty measure, and RQ4 is its coverage. |
| R3, a rule for when a departure is worth attention | **4** | The asymmetric-cost threshold, which is RQ5. |

**Four qualifications over three requirements, two of them on the first. No content defect.** The
mapping was never stated, and the antecedent *"those three requirements"* pointed back across a
`\section` boundary into the previous section.

### 3.2 · The repair, and its price

Two moves, and the second removes the counting problem at almost no cost.

1. **The antecedent is discharged in its own sentence**, so nothing is carried across the heading:
   *"Those three requirements are a model of what is normal, a measure of its uncertainty, and a
   rule for raising a departure. Each has been met somewhere in the literature, in isolation and in
   domains distant from hospitality operations, and each carries a qualification
   Chapter~\ref{chap:litreview} argues rather than inherits."*
2. **The two qualifications that serve R1 are joined into one sentence.** Four qualification
   sentences become three, in the order of the three requirements, so a reader counts three against
   three. Cost: one word, replacing a full stop with *", and"*.

**Measured +19.** Sentence lengths after the repair: 23 and 28 for the opener pair, then 32, 16 and
27 for the three qualifications. None over 40, so V6's distribution work is not undone.

---

## 4 · V4 · The exogenous feature set, measured on our side

**The served Beer Hall arm `rung4_chronos2_exo` consumes fifteen columns**, defined at
`brain/models/foundation.py:103-113` as
`CHRONOS2_EXO_COLS = _CALENDAR_EXO + _EVENT_EXO + _WORLD_CUP_EXO + _WEATHER_EXO`.
`chronos2_exo_predict` (`foundation.py:293-308`) **requires every one of them on both the context
and the future frame and raises on a missing column or a NaN**, so all fifteen are consumed rather
than merely offered. The research path runs unbound, and `org_profile.exo_families()`
(`brain/org_profile.py:188-199`) returns all four families when unbound.

### 4.1 · Every column, its supplying symbol, and its provenance

| # | column | supplying file and symbol | provenance |
|---:|---|---|---|
| 1 | `is_bank_holiday` | `features/build_features.py:177`, from `_bank_holidays(years, org_profile.country(venue))` at `:84`, via the `holidays` package with `subdiv="England"` for GB | **country code** |
| 2 | `exo_temp_c` | `ingest/exog_weather.py:108`, Open-Meteo, no API key, CC BY 4.0, keyed on `config.WEATHER_CELL_COORDS` | **coordinate, public keyless feed** |
| 3 | `exo_rain_mm` | same | **coordinate, public keyless feed** |
| 4 | `exo_sunshine_hrs` | same | **coordinate, public keyless feed** |
| 5 | `exo_is_dry` | same | **coordinate, public keyless feed** |
| 6 | `wc_match_in_hours` | `ingest/world_cup.py:54` `WC_FEATURE_COLS`, from `ingest/world_cup_schedule.md` (104 matches, hand-authored, no hand-picking) crossed with `derive_trading_hours()` | **fixed 2026 fixture calendar × this venue's own POS-derived trading window** |
| 7 | `wc_england_in_hours` | same | same |
| 8 | `wc_scotland_in_hours` | same | same |
| 9 | `wc_home_nation_in_hours` | same | same |
| 10 | `wc_n_matches_in_hours` | same | same |
| 11 | `wc_any_match` | same | same |
| 12 | `exo_is_school_term` | `ingest/calendar_sources.py`, `SCHOOL_HOLIDAYS`, hard-coded intervals; header records the source as *"Lancashire County Council school term dates 2024/25--2027/28 (operator-supplied, matches LCC published calendar)"* | **curated for this catchment** |
| 13 | `exo_is_uni_term` | `ingest/calendar_sources.py`, `UNI_TERMS`; header records 2025-26 to 2027-28 from lancaster.ac.uk and *"2024-25 operator-supplied"* | **curated for this catchment** |
| 14 | `exo_fixture_nearby` | `ingest/local_events.py`, `_CURATED`, written to the `local_events` table; PredictHQ optional and unused | **curated for this catchment** |
| 15 | `is_ellel_event` | `features/build_features.py:178-188`, a spillover flag: on a non-event venue's frame it is 1 on days the event-driven sibling took money | **structural to this estate; needs a second venue** |

### 4.2 · The split, as counts

| class | columns | n |
|---|---|---:|
| derivable from a **country code** | `is_bank_holiday` | **1** |
| derivable from a **coordinate** through a public keyless feed | the four weather columns | **4** |
| **fixed 2026 fixture calendar** crossed with the venue's own POS trading window | the six `wc_*` | **6** |
| **curated by hand for this catchment** | school term, university term, local event anchors | **3** |
| **structural to this estate**, not reconstructible for a lone venue | `is_ellel_event` | **1** |
| | | **15** |

**Reconstructible for any venue from open sources alone: 5 of 15**, the four weather columns plus
the bank-holiday flag. The six `wc_*` are reconstructible for the 2026 window given a public fixture
list and the venue's own transactions, but they are one tournament rather than a standing source.
**Four of 15 are not reconstructible without the same curation or a sibling venue.**

### 4.3 · How live each one is on the served frame, measured read-only against the store

The Beer Hall frame in `l1_daily` is **302 rows spanning 399 calendar days**, 2025-06-04 to
2026-07-07.

| column | days on which it fires | of |
|---|---:|---:|
| `exo_is_school_term` | 240 | 302 |
| `exo_is_uni_term` | 184 | 302 |
| the four weather columns | 302 (full coverage) | 302 |
| `is_ellel_event` | 62 | 302 |
| `wc_*` | 87 fixture days fall inside the frame | 302 |
| `is_bank_holiday` | **5** | 302 |
| `exo_fixture_nearby` | **7** | 302 |

**`local_events` holds seven rows and two distinct events**, *Love Lancaster Live* and *Light Up
Lancaster*, all `venue_scope = 'lancaster'`, all `source = 'curated'`, spanning 2025-10-09 to
2025-11-08. **There are no Preston anchors at all**, so despite `local_events.py` documenting a
Preston scope for Two River Taps, that venue receives a constant-zero column. `promo_calendar` is
empty, 0 rows.

**Store ceiling asserted at 2026-07-07 before and after**, read-only through `.venv-forecast`. No
model was loaded, no refit and no rescore was run.

---

## 5 · V5 · Ryan's side, pinned to `cc93b6fa`

Clone at `<scratchpad>/ryan-aigm`, `cc93b6fa123791863072ec594dc3162208fa6812`, branch `master`.
**Nothing was written**: `git status --porcelain` empty, and the reflog holds one entry, the clone.
No credential was read, copied, quoted or used.

### 5.1 · `EXO_ENABLED` on the tenant path

**`apps/api/src/modules/proactive-brain/brain-dataset.service.ts:23`:**

```
const EXO_ENABLED: string[] = []
```

Passed at `:133` as `exo_enabled: EXO_ENABLED` inside the `OrgProfile` payload, and re-exported at
`:236`. On his side `org_profile.exo_families()` (`brain/org_profile.py:202-204`) returns
`frozenset(_require().exo_enabled)`, so **the empty list means no covariate family is live for a
tenant.** On our research path the same function returns
`frozenset({"calendar", "weather", "sports", "events"})` when unbound, which is what produced the
0.745 figure.

### 5.2 · His stated reason, verbatim, at `brain-dataset.service.ts:15-22`

> /// No covariate families. Every one the engine can derive on its own is curated for
> /// the estate it was built for — a single county's school calendar, two cities' event
> /// anchors, one World Cup — and none of them can be derived from a POS feed and a
> /// venue profile, so enabling one buys a column of zeros and a diagnostic saying so.
> /// Bank holidays are not a family: they resolve from `country` and are always on.
> /// When we have a real per-venue source (weather, a local events feed) it arrives as
> /// `exogenous` rows, which take precedence over anything the engine derives.

*(His file, quoted as found. The dashes are his.)*

### 5.3 · No per-tenant branch supplies exogenous features from a location, and here is what was searched

**The venue profile his service builds carries no location at all**, `brain-dataset.service.ts:127-128`:

```
lat: null,
lon: null,
```

Searched across `apps/api/src/modules/proactive-brain/` and `apps/api/src/modules/sales/` for
`postcode`, `latitude`, `longitude`, `lat,`, `open-meteo`, `openmeteo`, `predicthq` and
`PREDICTHQ`. **Zero hits**, other than one unrelated match in `brain-persistence.spec.ts:67`.

### 5.4 · Where his statement and our measurement agree, and where they differ

They agree on the mechanism and differ on the count, and the difference is his inputs rather than a
contradiction.

- **Agreement on bank holidays.** He excludes them from the families, *"they resolve from `country`
  and are always on"*, which is our class 1 exactly.
- **Agreement on the curated three.** *"a single county's school calendar, two cities' event
  anchors"* names our columns 12 to 14. Our measurement adds that the event anchors are **seven rows
  and two events, Lancaster only**, with no Preston rows at all.
- **The difference is weather.** He writes that none of the families *"can be derived from a POS feed
  and a venue profile"*. Ours are derived from a coordinate, and **his venue profile supplies
  `lat: null, lon: null`**, so his statement is true of his inputs and ours is true of ours. The four
  weather columns are the 4 of 15 that a coordinate would unlock on his path.
- **He does not name `is_ellel_event`**, which is the one column no per-venue source could supply.

**His codebase is his claim.** Nothing in V6 is written from it; V4's measurement is what V6 is
written from, and this section is corroboration.

---

## 6 · V6 · The exogenous limitation, drafted and priced. Neither applied.

**Site for both:** `chapters/discussion.tex`, `sec:disc-limitations`, appended to the *"Four are
properties of the problem"* paragraph, after *"...this estate's demand structure supplies two."* The
curation cost recurs for anyone attempting this on a comparable estate, so it is a property of the
problem rather than of the circumstances.

**Coupling to flag:** that paragraph opens *"Four are properties of the problem."* Applying either
sentence makes it five, so the opener's number has to move with it. That is a number change, and
this package applies neither sentence.

### Sentence A, the measured limitation. Two forms.

**A-full**, which names all four:

> The exogenous set the served arm consumes does not travel either: of its fifteen columns, four are
> curated for this catchment, a Lancashire school calendar, a Lancaster University term calendar,
> seven days of local event anchors and a sibling venue's trading days, and none of them exists for a
> venue nobody has curated.

**Measured +53, and it lands as a 53-word sentence**, above the 40-word line S34 cleared this
chapter down to. The sketch anticipated roughly 36.

**A-short**, which states the count and leaves the four to §4.1:

> The exogenous set the served arm consumes does not travel either: four of its fifteen columns are
> curated for this catchment or drawn from a sibling venue, and none of them exists for a venue
> nobody has curated.

**Measured +38, a 38-word sentence.** This is the form that matches the sketch and stays under 40.

### Sentence B, the forward claim

> Five of the fifteen, the four weather columns and the bank-holiday flag, are in principle
> reconstructible for any venue from a coordinate and a country code through open feeds, and closing
> the rest is left to further work.

**Measured +38, a 38-word sentence.**

**B is conditional and stays conditional.** *"In principle reconstructible"* and *"left to further
work"* are the load-bearing words: nothing in this work reconstructs a single feature for a venue it
was not curated for, and B does not say the system does. The five are named rather than left as a
fraction, because a fraction would depend on which class the six `wc_*` are put in, and B claims only
the two classes that survive any reading of that question.

**Neither sentence names a MASE improvement attributable to any feature group, and neither could.**
No ablation of `CHRONOS2_EXO_COLS` has been run on the served Chronos-2 arm, so the 0.745 against
0.793 gap cannot be apportioned. **It could be apportioned by an ablation**, since
`chronos2_exo_predict` takes the column list and `signals/feature_ablation.py` already carries the
family map; but that existing ablation is Rung-3 GBM only and returned an honest negative. **A
per-family leave-one-out on the Rung-4 exogenous arm is a further-work note, and it was not run
here.**

| draft | measured | resulting sentence |
|---|---:|---:|
| A-full | **+53** | 53w |
| **A-short** | **+38** | **38w** |
| B | **+38** | 38w |
| A-short + B | **+76** | 38w + 38w |
| A-full + B | +91 | 53w + 38w |

---

## 7 · V7 · Close

`latexcheck main.tex --shell-escape`: **PASS**. Zero errors, **zero undefined references**, **zero
undefined citations**, **zero floats lost**. Overfull 4 and underfull 14, unchanged in count and
location. **117 pages**, one more than S34's 116, which is the +121 body and +58 appendix words
landing.

**No float changed chapter, and none in the counted body moved at all.** Measured rather than
inferred: all **12 figures and 22 tables** carry identical float numbers and identical captions
before and after, and nine floats moved by exactly one page, all of them in Appendices B and C,
downstream of the +58 words added to Appendix A.

| | before | after |
|---|---|---|
| figures | 12, numbered across chapters 2, 3, 4, A and B | 12, identical numbers and captions; **1 moved a page** (`B.1`, 80 to 81) |
| tables | 22, numbered across chapters 3, 4, 5, A, B and C | 22, identical numbers and captions; **8 moved a page**, all `B.*` and `C.*` |

**Exactly two number changes in the whole document, both intended.** All four token classes
(`\ref`, `\label`, citation keys, numeric literals) were extracted from `git show 0d87d8a:` and from
each working file, comment-stripped and compared sorted:

- `abstract.tex` **loses** `1.2` and `5.9`, which is draft 1a moving the trading-rate range out of
  the method sentence.
- `chapters/conclusion.tex` **gains** `0.489` and `0.926`, which is P2-full's ceiling.

**No `\ref`, `\label` or citation key changed anywhere.**

`venueordercheck.py chapters abstract.tex`: **PASS**.

`git ls-remote origin` matches V0 on both refs. Local `main` is at `019f1354`, unmoved. Six files
modified on `feedback-hansi`, nothing pushed.

---

## 8 · The re-issued promotion table

**Applied** rows are on `feedback-hansi`. **Drafted** rows are measured on scratch copies and are in
no file.

| item | what it does | delta | state | coupling |
|---|---|---:|---|---|
| **V2** four abbreviation expansions | H-2 discharged | **+28** | applied (S34) | independent |
| **V4(a)** heading names the specification | H-6 answered | **+2** | applied (S34) | independent |
| **V4(b)** objectives stated in `sec:intro-aims` | H-6 answered, Appendix D deferral closed | **+33** | applied (S34) | discharges one H-A2 member |
| **V3** five questions quoted verbatim, ordinals kept | H-5 discharged | **+41** | applied (S34) | exclusive with V3-alt |
| **V6** nineteen sentence splits | H-8 worked on the twenty | **-4** | applied (S34) | independent |
| **V3-alt** same, ordinals dropped | H-5 discharged more cheaply | +26 | **declined** | would have saved 15 |
| **V3-restore a, b, d** | independent calibration leg, relocation statement, one level | **+19** | **applied (S35)** | span **c refused** by ruling |
| **V3-restore c**, the RQ5 operating-point clause | the answer paragraph's own conclusion | +8 | **refused** | fact survives at `results.tex:893` and `discussion.tex:342` |
| **V1-1a** abstract, triple kept | H-1 discharged, `venueordercheck` guard kept | **+1** | **applied (S35)** | **V1-1b declined**; abstract now 300 of 300 |
| **P1-min** static-regime outcome | H-A2 must-promote | **+16** | **applied (S35)** | P1-full declined; 0.704 / 0.721 stays in B.13 |
| **P2-full** ceiling plus Winkler, with its split | H-A2 must-promote | **+33** | **applied (S35)** | split applied, 28w + 38w |
| **P3** what the knowledge-gap signal does | H-A2 should-promote | **+23** | **applied (S35)** | independent |
| **P4** name the three catalogued divergences | H-A2 should-promote | **+10** | **applied (S35)** | independent |
| **S35 V3** §1.2 antecedent and the four against three | mapping made readable, count resolved | **+19** | **applied (S35)** | independent |
| **S35 V2** temperature sentence | appendix claim matches the code | **+58 appendix, 0 body** | **applied (S35)** | correction row appended to `numbers_audit.md` |
| **Exo A-short** the measured exogenous limitation | states what the set consists of and that it does not travel | **+38** | **drafted** | exclusive with A-full; needs *"Four"* to become *"Five"* in the same paragraph |
| **Exo A-full** same, naming all four | as above, names the four | **+53** | **drafted** | exclusive with A-short; lands as a 53-word sentence |
| **Exo B** the forward claim | five of fifteen reconstructible in principle, the rest to further work | **+38** | **drafted** | independent of which A form; same paragraph-number coupling |
| | **applied on the branch after S35** | body **20,206**, appendix **10,689** | | S34 tip was 20,085 and 10,631 |
| | **cheapest remaining set** (A-short plus B) | **+76** | | body would reach **20,282** |
| | **fullest remaining set** (A-full plus B) | **+91** | | body would reach **20,297** |
