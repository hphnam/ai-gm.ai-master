# Report 103 · S30 · What is 644?

**Package:** S30, read-only audit. **No API call was made and the credential was not used.**
No `.tex` file was edited; counted body words spent: **zero**.
**Predecessor:** S29, `brain/log/102_post_push_free_repairs.md`.

## 0 · State

| | |
|---|---|
| date | 2026-08-19 |
| ai-gm `brain-construction-local` | local `0db56339` = remote `0db56339`, 0 unpushed |
| ai-gm working tree | 1 entry, `?? .claude/skills/remove-ai-marks/` (out of bounds, PRJ93_RULES Scope boundary) |
| prj93-overleaf `main` | local `019f1354` = remote `019f1354`, 0 unpushed |
| store ceiling, before | `l1_daily` max date **2026-07-07** |
| store ceiling, after | `l1_daily` max date **2026-07-07** — unchanged |
| interpreter | `brain/.venv-forecast/bin/python` (duckdb is not importable from system python3) |
| store opened | `read_only=True` on every pass |

---

## 1 · The headline

**644 is a measured quantity, and it measures something other than the thing being budgeted.**

644 is the size of the **injection corpus** — the exhaustive venue × kind × magnitude ×
onset × fold × direction grid in `eval/agent_eval.build_scaled_corpus`. It is not an
estimate, it has never been an estimate, and it reproduces exactly from the frozen
configuration. The premise the package was given — that 644 is a Claude Code estimate — is
**not what the repository shows**, and I could find nothing anywhere that supports it.

But the number that has been carried into the funding request is **the count of live API
calls**, and *that* number has never been derived. It was taken to equal the corpus size on
the assumption of "one call per injection scenario". Measured against the frozen apparatus,
it is not 644.

**It is 420.**

The direction of the discrepancy is the good one: the allocation is **over**-provisioned by
224 calls, 35 per cent of the asserted volume. There is no budget shortfall. The run cannot
exhaust its allocation partway on volume grounds.

---

## 2 · V1 — Provenance

`644` appears 50+ times across both repositories. The hits fall into three classes, and
conflating them is the whole of the confusion:

**Class A — the corpus size (correct, derived).** Introduced at commit **`76a8f033`,
2026-07-06, "scaled eval"**, which is the earliest occurrence of 644 as this quantity. It
appears *with its working*: the same report prints the per-kind decomposition that sums to
it. `brain/log/11_Scaled_Eval_Report.md:35`, verbatim:

> `build_scaled_corpus` replaces the fixed four-event smoke set with a **venue × kind ×
> magnitude × onset × fold × direction** grid — **N=644** injections, exhaustive and
> deterministic.

Presented as **measured**. Correctly so.

(Note: earlier commits from 2026-06-19 match a `-S644` search, but those are `47,644`, the
Beer Hall row count in `config.py:207`. Different number, coincident digits. A `git log -S`
on a bare numeral does not distinguish them, and the June dates are not the origin of this
quantity.)

**Class B — the call count (asserted, never derived).** The earliest is commit **`64e6fc40`,
2026-07-23, report 46**, at `brain/FLAGS.md:1130`, verbatim:

> The empirical half needs 644 live model calls to fill the response cache, and **this
> environment has neither an `ANTHROPIC_API_KEY` nor the `anthropic` SDK**

The number appears **already formed**. No working is shown, and the step from "644
injections" to "644 calls" is not argued at that site or at any later one. The clearest
statement of the assumption is `brain/ledger/run_plan_2026-08-05.md:86` (commit `e84c42e8`,
2026-08-06), verbatim:

> **Runtime** ~644 injections, one call per scenario, temperature 0.

and `brain/docs/simon_status_report.md:123` (commit `f489afe2`, 2026-08-11), verbatim:

> 644 calls, one per injection scenario. The number is fixed by the corpus, which is
> exhaustive over the venue × event-kind × magnitude × onset × fold × direction grid and
> carries no random element.

That last sentence is the one to watch. Everything it says about *the corpus* is true. The
inference it invites — that the call count is therefore also fixed at 644 — does not follow,
and §4 shows why.

**Class C — downstream restatements.** `numbers_audit_resolutions.md:143`,
`phase_state.md:552,585`, `PRJ93_State_Log_Addendum_2026-07-21.md:196,221`,
`tests/test_agent_calibration.py:5`, `docs/simon_status_report.md:21,81`. All inherit Class
B. Several hedge with "~" or "roughly", which is the right instinct applied to the wrong
number: the corpus size is exact, and it is the *call* count they should have hedged.

**Answer to the question as put: 644 has been derived, with working, as a corpus size. As a
call count it has only ever been asserted.**

---

## 3 · V2 — The frozen apparatus

**Specification.** `brain/signals/agent.py` (the agent), `brain/signals/prompts/agent_v1.md`
(the pre-registered system prompt, frozen at commit `c8fa127`, hash `c1137f76`),
`brain/eval/agent_cache.py` (the cache), `brain/eval/agent_calibration.py` (the measurement),
`brain/eval/agent_eval.py` + `brain/eval/inject.py` (the corpus). Report 46,
`brain/log/46_G17e_Agent_and_Calibration.md`, is the narrative specification.

**The four terms of the agent objective.** Stated at
`brain/ledger/numbers_audit.md:690`, verbatim:

> Three of the four terms of the intervention objective, calibration error, Brier score and
> the decision-quality curve, are computable as soon as the cache exists.

So: (1) expected calibration error, (2) Brier score, (3) the cost-sensitive decision-quality
curve, (4) agreement with operator accept-or-dismiss judgements.

**Which terms the calls feed.** The specification *does* say. Terms 1–3 are fed by the run;
term 4 is not, and cannot be. Report 46 is explicit and the code enforces it —
`CALIBRATION_KIND = "detection"`. Verbatim, `46_G17e_Agent_and_Calibration.md:110`:

> The 644-injection corpus supplies truth for *was there a real deviation*, not for *should
> the manager have been told*. So what S8 measures is **detection calibration, not
> intervention calibration**

Term 4 needs human labels, of which **N = 0**. `chapters/conclusion.tex:85-86` says the same
in the document, verbatim:

> Three of the objective's four terms would compute as soon as a response cache exists; the
> fourth requires operator judgements, of which none were recorded.

**Conditions, arms, repetitions, stopping rule.** The corpus is exhaustive and deterministic
(temperature 0, no RNG, no seed for Part A), so there are **no repetitions and no arms**:
one pass over the grid. The prompt file states the only declared second arm, verbatim:

> A second prompt may be introduced only as a declared `agent_v2.md` arm, never as an edit
> to this file.

No such arm exists. **No stopping rule is stated anywhere.** The run terminates by
exhausting the corpus. §5.5 is where that absence bites.

---

## 4 · V3 — The query population

Measured directly from `brain/data/Elliot's AI-GM Questions - Query result.csv`.

*(Filename note: the package names it `Elliots AIGM Questions  Query result.csv` at the
project root. The actual path is `brain/data/Elliot's AI-GM Questions - Query result.csv`.
Searching for the given spelling returns nothing; the file is present.)*

| V3 | measured | package's figure |
|---|---|---|
| total rows | **735** | 735 ✓ |
| distinct `conversationId` | **66** | 66 ✓ |
| role split | **376 user / 359 assistant** | 376 / 359 ✓ |
| channel | **735 of 735 `web`** | — |
| date range | **2026-04-29 10:33:46 → 2026-06-12 08:49:34** | ✓ |
| distinct days | **25** | 25 ✓ |
| conversations opening with `assistant` | **0** (all 66 open `user`) | 0 ✓ — confirmed independently |
| distinct user messages, exact | **359** | — |
| distinct user messages, normalised | **355** | — |

Normalisation for the second figure: lowercase, whitespace collapsed, trailing `.?!,;:`
stripped. Both are reported; neither is picked.

**V3.5 — what the user turns are.** Rule, applied in this order, first match wins:

1. **pasted bulk** — ≥ 400 characters or ≥ 4 newlines
2. **continuation** — not the conversation's first user turn, and contains a back-reference
   (`that|this|it|them|those|these|above`, `point N`, `you said`, `your last`, `expand`,
   `elaborate`, `more detail`, `again`)
3. **instruction to record** — opens with an imperative (`add|log|record|update|save|remove|
   delete|change|set|put|make|note|create`)
4. **question** — contains `?` or opens with an interrogative/auxiliary
5. **other statement** — everything else

| category | count |
|---|---|
| pasted bulk | 16 |
| continuation | 93 |
| instruction to record | 10 |
| **question** | **132** (129 distinct normalised) |
| other statement | 125 |
| total | 376 |

A continuation is not standalone-issuable, and neither is a pasted price list nor "Save". Of
376 user turns, **132 are questions**, and that is the largest population that could be
issued as standalone queries.

**V3.6 — does the log predate the Neon input change?** **Cannot be established from material
in the repository.** Every Neon record here (`FLAGS.md:331-354,406-408`, `README.md:216`)
concerns the **sales transaction** system of record and the `INGEST_SOURCE=neon` swap. I
found no record of a change to the `ChatMessage` input and no date for one. Searching for
"input change" and its variants across `brain/` returned **no hits at all** — that is a
measured empty result, not an unchecked box.

**V3.7, unasked but load-bearing: this population is not what 644 counts.** The 735-row log
is the corpus behind the **chat-log knowledge-gap signal** (S11,
`brain/signals/chatlog_kb_gap.py`, `brain/log/51_G17j_Chatlog_Signal.md`), which is already
delivered and makes **no model calls** — its only credential is `VOYAGE_API_KEY` for
embeddings. Only two files in `brain/` contain a live model seam at all
(`signals/agent.py`, `eval/judge.py`), and neither reads this CSV. **No apparatus in this
repository issues API calls over the 735-row log.** If a run over operator queries is
intended, it is a new instrument that does not exist yet, and 644 was never its budget.

---

## 5 · V4 — Derivation and reconciliation

### 5.1 The corpus, from first principles

From `config.py` and `agent_eval._SCALED_VENUE_KINDS`:

- `EVAL_INJECT_Z_GRID` = 6 magnitudes `(1.0, 1.25, 1.5, 2.0, 3.0, 4.0)`
- `EVAL_SCALED_ONSETS` = 3 positions `(early, mid, late)`
- `EVAL_STOCK_COVER_GRID` = 5 values
- directions = 2 (`up`, `down`), except stock drawdown

Per fold, per venue:

- `regime_shift` = 6 × 3 × 2 = **36**; `spike` = 6 × 3 × 2 = **36**
- `exo_coincident` = 6 × 2 = **12** (no onset sweep)
- `stock_drawdown` = **5** (no direction, no onset)

Usable folds differ by venue — Two River Taps is closed, so only pre-closure folds are
injected; Ellel is sparse and has one short fold:

| venue | kinds | per fold | folds | total |
|---|---|---|---|---|
| beer_hall | all four | 36+36+12+5 = 89 | 4 | **356** |
| two_river_taps | no stock | 36+36+12 = 84 | 3 | **252** |
| ellel | spike only | 36 | 1 | **36** |
| | | | | **644** |

Cross-check by kind: spike 36×(4+3+1) = **288**; regime_shift 36×(4+3) = **252**;
exo_coincident 12×(4+3) = **84**; stock 5×4 = **20**. Sum **644**.

Measured by executing `build_scaled_corpus` against the store: `{beer_hall: 356,
two_river_taps: 252, ellel: 36}` and `{spike: 288, regime_shift: 252, exo_coincident: 84,
stock_drawdown: 20}`. **The derivation and the apparatus agree exactly.**

So 644 *does* decompose, and the package's candidate decompositions are all beside the
point: it is 4×89 + 3×84 + 1×36, and it is a function of the injection grid, not of 376,
66, 735 or 359.

### 5.2 The call count, from the same apparatus

One unit of API call is **one scenario**, not one injection and not one item.
`agent.score_scenario` builds a single payload carrying *all* items for that scenario and
issues **one** `messages.create`. Two things then reduce the count below 644:

1. **Injections that surface nothing are skipped.** `build_scenarios` does
   `if not items_obj: continue`. **Measured: 0 injections surface nothing.** This reduction
   is real in the code but empty in practice, and I record it as measured rather than
   assumed.
2. **The cache is keyed on the payload, so identical payloads collapse.**
   `ResponseCache.key` hashes `(model, prompt_hash, payload)` and `execute` increments
   `calls` only on a miss. Injections whose surfaced items are byte-identical therefore
   share one call.

**Measured: 644 injections → 420 distinct payloads.** 339 payloads are unique to one
injection; 81 are shared, with group sizes up to 24.

The collapse is genuine, not a key defect. Of the 81 shared groups, 62 span different event
*kinds*, 48 different *onsets*, 11 different *magnitudes*. That reads alarming until you see
which injections they are: they are the near-threshold ones (z = 1.0, 1.25) that the
detector **misses**, so the briefing surfaces only the window's real background items —
identical inputs, because the injection left no trace in the detector output. Identical
input to a temperature-0 model must produce identical output, so one call serving all of
them is correct, and the cache is behaving as designed.

### 5.3 The three numbers

| | value |
|---|---|
| derived minimum, one pass, no repetitions | **420 calls** |
| derived with the specification's conditions and repetitions | **420 calls** (the spec declares no repetitions and no second arm) |
| the asserted 644 | 644 |

**Direction and size: the derived figure is 224 calls BELOW the asserted one, 35 per cent
less. This is over-provision, not shortfall.** Nothing about the run's volume threatens the
allocation.

Two further measured quantities that the reconciliation needs, because they are the ones
that will appear in the write-up:

- **1,593 records** enter the calibration corpus (one per surfaced item per injection), not
  644. This is the N in "ECE over N", and no document currently states it.
- **1,102 items** are carried by the 420 distinct payloads; median 2, mean 2.62, max 5 items
  per call.

### 5.4 One thing the collapse does cost, measured

If 224 injections share a cached response with another injection, the same predicted
probability enters the calibration corpus several times. Those repeats are not independent
observations, and ECE/Brier over 1,593 records will treat them as though they were. That is
a limitation to declare, not a defect.

The sharper question is whether any *shared* payload is joined to **contradictory** truth
labels — the same prediction entering ECE once as a hit and once as a miss. I measured it
rather than assuming the collapse was clean:

| | |
|---|---|
| records in the calibration corpus | **1,593** |
| positive records (`item_covers` true) | **534** (base rate 0.335) |
| distinct payloads | 420 |
| **payloads whose shared records disagree on truth** | **3** |
| **item slots carrying contradictory labels** | **4** of 1,593 (**0.25 %**) |

Small, but not zero, and not previously recorded anywhere. The cause is that truth is
`item_covers(item, injection.truth)` — a property of the *pair*, not of the item — so a
background item can coincide with one injection's onset window and not another's. It does
not invalidate the run. It does mean the corpus is not a pure function of the payload, and
a write-up that describes it as one would be wrong.

---

## 6 · V5 — Price

### 6.1 Measured inputs

Every quantity below is measured from the frozen apparatus against the store, except where
marked as an estimate.

| term | measured |
|---|---|
| distinct calls | **420** |
| system prompt | **4,110 characters** (`agent_v1.md`, unchanged) |
| JSON schema | **376 characters** |
| payload per call | median **1,708**, mean **1,896**, min 809, max 3,464 characters |
| payload, all 420 calls | **796,455 characters** |
| items per call | median 2, mean 2.62, max 5 |

**This closes the one term the funding request could not price.**
`simon_status_report.md:137` records it, verbatim:

> Varies with the number of ranked items on the venue-day; **never measured, because the
> cache has never been built**

It is now measured, without building the cache and without a credential: the payload is a
deterministic function of the store and the frozen code, so it can be constructed offline
and its size read directly. The step that needed the key was the *response*, never the
request.

### 6.2 Tokens

**Estimator, stated: 4 characters per token.** No tokenizer is available offline — neither
`anthropic` nor `tiktoken` is installed in any of the four venvs, and installing one to
count tokens is out of scope here. These are therefore **estimates**, and they are the only
estimates in this report. The 4,110-character prompt at this estimator gives ≈1,030 tokens,
which is the figure `simon_status_report.md:139` already uses, so the two are on the same
basis and directly comparable.

| line | tokens | at $5/M in, $25/M out |
|---|---|---|
| input: system prompt, 420 × ≈1,028 | 431,760 | |
| input: schema, 420 × ≈94 | 39,480 | |
| input: payload, measured | 199,114 | |
| **input total** | **≈670,000** | **$3.35** |
| output, realistic (1,102 items × ≈48 tok + wrappers) | ≈55,000 | **$1.37** |
| output, ceiling (420 × 4,096) | 1,720,320 | **$43.01** |

| | standard | batch (50 %) |
|---|---|---|
| **realistic total** | **$4.72** | $2.36 |
| **ceiling total** | **$46.36** | $23.18 |

Against the request's **$69.27** ceiling: the measured ceiling is **$46.36**, and the
realistic figure is **$4.72**. Recomputing the request's own basis at 644 calls but with the
payload term now measured gives **$71.08** — so the request was right to treat its
unmeasured input line as small, and its $150 ask has more headroom than it claimed, not
less.

**Rate provenance:** $5.00/M input and $25.00/M output are the rates recorded in
`simon_status_report.md:132-133` for `claude-opus-4-8`, sourced there on 2026-08-10. **I did
not re-verify them against a current price list** — doing so needs a network fetch, and the
reconciliation that matters here (420 against 644) is a ratio in which the rate cancels.

### 6.3 Which model

**The model is not unchosen.** `config.py:513` pins `AGENT_MODEL = "claude-opus-4-8"`, and
the pin is load-bearing: it is a term in the cache key, so changing it invalidates every
cached response. Pricing "the two most likely" would misdescribe the apparatus, which admits
one. What is genuinely open is whether that pinned model is still *servable*, which is the
next item.

### 6.4 The allocation, and what happens if the run fails

**The allocation is recorded.** `simon_status_report.md:151`, verbatim:

> **The request I would put to DSAIL is $150, which is £111.53.**

It is a request, not a granted budget — the same document lists "DSAIL authorisation is not
in hand" under Risks. So there is a costed, written ask; there is not yet money.

**Overrun and resume behaviour — this is the operationally important finding.**
`agent_calibration.run` calls `cache.save()` **only after `collect_records` returns**, i.e.
only after all 420 calls have succeeded. `agent_cache.ResponseCache` accumulates responses
in memory and writes nothing to disk until then. `agent.live_execute` has **no retry, no
backoff and no exception handling**.

Therefore: **a single transient failure at call 419 of 420 discards all 419 responses and
the entire spend.** The run cannot be resumed; it must be restarted from zero. The funding
request anticipated this outcome and covered it by asking for two full runs —
`simon_status_report.md:156`, verbatim:

> A partly-filled cache is not a usable artefact, so a failure part-way through is re-run
> whole rather than resumed

— which is the correct mitigation for a fault it correctly identified. Worth stating plainly
that the fault is one commit's work to remove (checkpoint the cache periodically), and that
doing so would be worth more than the second run's budget.

**And the run does not currently start at all.** `signals/agent.py:177` sends
`temperature=config.AGENT_TEMPERATURE` (0.0) to `claude-opus-4-8`. Sampling parameters were
removed on Opus 4.7 and later and now return a 400, so `--build` fails on call one **even
with a valid key**. This was recorded in report 94 §4.2 and re-verified at S19; it is
unrelated to volume and unaffected by everything above, but any plan that treats the run as
"one command once the credential lands" is still wrong. Deleting the argument is safe for
the pre-registration: temperature is not a term in the cache key, so the frozen prompt hash
`c1137f76` survives the edit.

---

## 7 · Limits of this audit

- **Token counts are estimates** at 4 characters/token (§6.2). Everything else in §5 and §6
  is measured.
- **Published rates were not re-verified** (§6.2).
- **420 is the count for the corpus as it stands today.** It is a function of what the
  detectors surface, so a change to the detectors, the store ceiling, or the grid changes it.
  The corpus size 644 is invariant to the detectors; the call count is not. This is exactly
  why the two numbers were never interchangeable.
- **Nothing was run that touches a model.** The credential was not used and no network call
  of any kind was made.
- **The 4 contradictory label slots (§5.4) were counted, not diagnosed.** I established the
  mechanism (`item_covers` is a property of the item–injection pair) but did not enumerate
  which four.

---

## 8 · Answer

**644 is a measured quantity that has been applied to the wrong thing: it is the exact,
reproducible size of the injection corpus, and it was carried into the funding request as a
call count without ever being derived as one — the apparatus makes 420 calls, not 644.**
