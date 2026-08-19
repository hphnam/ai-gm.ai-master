# Agent evaluation — the numbers

**Reference artefact, not a log entry.** Later packages read this file instead of
`brain/log/103_agent_eval_scope.md`, which is where these quantities were first measured and
which will be superseded and read selectively like any log.

**Every figure below was re-derived from the apparatus and the store on 2026-08-19 (S32 V1),
not transcribed from report 103.** The re-derivation script builds the corpus, surfaces every
injection, constructs every payload and hashes every cache key from
`eval/agent_eval.build_scaled_corpus`, `eval/agent_calibration.build_scenarios`,
`signals/agent.build_payload` and `eval/agent_cache.ResponseCache.key`. Store opened
`read_only=True`, ceiling asserted at **2026-07-07** before and after.

**One disagreement with report 103 was found and is flagged in §2.** Everything else matched.

---

## 1 · Corpus and calls

| quantity | value | derives from |
|---|---|---|
| injection corpus | **644** | `eval/agent_eval.build_scaled_corpus` |
| by venue | beer_hall **356**, two_river_taps **252**, ellel **36** | same |
| by kind | spike **288**, regime_shift **252**, exo_coincident **84**, stock_drawdown **20** | same |
| distinct API calls | **420** | `eval/agent_cache.ResponseCache.key` over every payload |
| payloads unique to one injection | **339** | same |
| shared payloads | **81** | same |
| largest shared group | **24** | same |
| injections surfacing nothing | **0** | `agent_calibration.build_scenarios`, the `if not items_obj: continue` branch |

**Decomposition of 644.** Per fold, per venue, from `config.EVAL_INJECT_Z_GRID` (6 magnitudes),
`config.EVAL_SCALED_ONSETS` (3 positions), `config.EVAL_STOCK_COVER_GRID` (5), 2 directions:

- `regime_shift` 6 × 3 × 2 = 36 · `spike` 6 × 3 × 2 = 36
- `exo_coincident` 6 × 2 = 12 (no onset sweep) · `stock_drawdown` 5 (no direction, no onset)

| venue | kinds | per fold | usable folds | total |
|---|---|---|---|---|
| beer_hall | all four | 36+36+12+5 = **89** | 4 | **356** |
| two_river_taps | no stock | 36+36+12 = **84** | 3 | **252** |
| ellel | spike only | **36** | 1 | **36** |
| | | | | **644** |

Cross-check by kind: 36×(4+3+1) = 288; 36×(4+3) = 252; 12×(4+3) = 84; 5×4 = 20. Sum **644**.

**Fold counts re-measured** (`agent_eval._usable_folds`): beer_hall 4 of 4, two_river_taps
**3 of 4** (closed — post-closure folds are dropped), ellel 1 of 1 (stream is 50 days, too
short for more). These 4 / 3 / 1 are the only reason the decomposition is not uniform.

**Why the collapse to 420 is legitimate.** The shared groups are the near-threshold injections
at z = 1.0 and 1.25 that the detectors **miss**. The injected event leaves no trace in the
detector output, so the briefing surfaces only the window's real background items, and those
are identical across injections sharing a fold. Identical input to a temperature-0 model must
produce identical output, so one call serving all of them is correct behaviour, not a
key defect. Group sizes: 339×1, 47×2, 20×3, 6×4, 2×13, 1×14, 2×15, 1×16, 1×17, 1×24.

> **644 is invariant to the detectors. 420 is not.**
> 420 is a function of what the detectors surface, so any change to the detectors, the grid,
> the injection ceiling or the store changes it. **It must be re-measured, never carried
> forward.** Quoting 420 against a modified apparatus is the same error this file exists to
> stop. See §6 for the specific store dependency.

---

## 2 · The one disagreement with report 103

Report 103 §5.4 says *"224 injections share a cached response"*. **That is wrong, and the
figure it should carry is 305.**

Re-measured: **305** injections sit in a shared group. Those 305 collapse into **81** payloads,
which is what saves 644 − 420 = **224 calls**. So 224 is the number of *calls avoided*, not the
number of *injections sharing*. The count of injections whose result is non-independent of
another's is 305, not 224 — larger, and it is the figure the independence limitation in §3
depends on.

Both numbers are recorded here. **Use 305 for the independence claim and 224 for the cost
saving.** Report 103 is not edited; this file supersedes it on this point.

---

## 3 · Calibration corpus

| quantity | value |
|---|---|
| records (one per surfaced item per injection) | **1,593** |
| positive records (`item_covers` true) | **534** |
| base rate | **0.335** |
| items carried by the 420 distinct payloads | **1,102** (median 2, mean 2.62, min 1, max 5) |
| payloads whose shared records disagree on truth | **3** |
| item slots carrying contradictory labels | **4** of 1,593 (**0.25 %**) |

**1,593 is the N in "ECE over N".** No document currently states it, and 644 is not it.

**The contradictory labels.** Truth is `item_covers(item, injection.truth)` — a property of the
item–injection **pair**, not of the item. A background item can fall inside one injection's
onset window and not another's, so the same cached prediction can enter the corpus once as a
hit and once as a miss. Four slots of 1,593. Counted, not diagnosed: which four is not
established.

**The independence limitation — declare it, do not defend it.** 305 injections share a cached
response with at least one other. The same predicted probability therefore enters the
calibration corpus more than once, and ECE and Brier over 1,593 records treat non-independent
observations as independent. This is a property of the design, it was not known when the
apparatus was frozen, and it belongs in the limitations before the run, not in a defence after
it.

---

## 4 · Construct — what the run measures

`CALIBRATION_KIND = "detection"`, set in code so the report cannot quietly claim the stronger
thing. `brain/log/46_G17e_Agent_and_Calibration.md:110`, verbatim:

> The 644-injection corpus supplies truth for *was there a real deviation*, not for *should
> the manager have been told*. So what S8 measures is **detection calibration, not
> intervention calibration**

**The run produces detection calibration.** Any later text saying "three of the four objective
terms are computed" without the word *detection* is wrong.

The four terms of the agent objective: (1) expected calibration error, (2) Brier score, (3) the
cost-sensitive decision-quality curve — all three fed by this run; (4) agreement with operator
accept-or-dismiss judgements, **N = 0**, unobtainable from any existing artefact because no
operator judgements were ever recorded.

---

## 5 · Price

Measured inputs, all from the frozen apparatus:

| term | value |
|---|---|
| system prompt | **4,110 characters** (`signals/prompts/agent_v1.md`) |
| JSON schema | **376 characters** |
| payload per call | median **1,708**, mean **1,896**, min **809**, max **3,464** characters |
| all 420 payloads | **796,455 characters** |

| | standard | batch (50 %) |
|---|---|---|
| realistic | **$4.72** | $2.36 |
| ceiling (every call returns the 4,096-token cap) | **$46.36** | $23.18 |

Recorded ask: **$150** (`docs/simon_status_report.md:151`), against a request ceiling of $69.27
computed on 644 calls. Not granted — DSAIL authorisation is not in hand.

**Three qualifications, all load-bearing:**

1. **Token figures rest on a 4-characters-per-token estimator**, because no tokenizer is
   installed in any of the four venvs. This is the same basis `docs/simon_status_report.md:139`
   uses (4,110 characters ≈ 1,030 tokens), so the two are directly comparable.
2. **The published rates were not re-verified.** $5.00/M input and $25.00/M output are the
   rates recorded in `docs/simon_status_report.md:132-133` on 2026-08-10.
3. This closes the one term the funding request could not price. It recorded that term as
   *"never measured, because the cache has never been built"* — but the payload is a
   deterministic function of the store and the frozen code, so it is constructible offline.
   **The step that needed the credential was the response, never the request.**

`AGENT_MODEL = "claude-opus-4-8"` (`config.py:513`). **The pin is a term in the cache key**, so
changing the model invalidates every cached response.

---

## 6 · The store dependency behind 644 and 420

The injection stream is capped at `config.AGENT_EVAL_STREAM_CEILING = "2026-05-31"`
(`eval/inject.base_stream`), **not** at the store ceiling of 2026-07-07, and the cap is
env-overridable via `BRAIN_AGENT_EVAL_CEILING`. Consequences, measured:

- Store growth **after** 2026-05-31 does **not** lengthen the injection streams, so it does not
  create folds by that route. Measured stream ends: beer_hall 2026-05-31, two_river_taps
  2026-05-31, ellel 2026-05-30.
- **But `_usable_folds` filters through `store.active_span.is_closed` and
  `active_trading_end`, which read the store UNCAPPED.** Measured today:
  `dataset_max_date` 2026-07-07; beer_hall active to 2026-07-07, not closed; two_river_taps
  active to **2026-05-08, closed**; ellel active to 2026-07-04, not closed.
- So if post-ceiling rows showed Two River Taps trading again, `is_closed` would flip, its
  fourth fold would become usable, and the corpus would grow from 644 to **728** — with 420
  changing by an unknown amount that only re-measurement could give.

**644 is therefore invariant to store growth through the stream and NOT invariant through the
closure filter.** Any package that adds data to the store must re-check this before quoting
either number.

---

## 7 · Two corrected beliefs

**(a) 644 was never a Claude Code estimate.** It was introduced *measured, with its working*, at
commit **`76a8f033`, 2026-07-06**, in `brain/log/11_Scaled_Eval_Report.md:35`, which prints the
per-kind decomposition summing to it. The belief that it was an estimate entered later, and
travelled through handoffs far enough to be written into S30's own specification as an
established fact.

What *was* asserted rather than derived is the **call count**. It first appears already-formed,
with no working, at `brain/FLAGS.md:1130` (commit `64e6fc40`, 2026-07-23), verbatim:

> The empirical half needs 644 live model calls to fill the response cache, and **this
> environment has neither an `ANTHROPIC_API_KEY` nor the `anthropic` SDK**

The corpus size and the call count are different quantities. They were never equal.

**(b) The 735-row conversation log is not the agent evaluation's query set.** It is the S11
chat-log knowledge-gap corpus (`brain/signals/chatlog_kb_gap.py`,
`brain/log/51_G17j_Chatlog_Signal.md`), already delivered, credentialed on `VOYAGE_API_KEY` for
embeddings, and **no apparatus in `brain/` issues model calls over it** — only
`signals/agent.py` and `eval/judge.py` hold a live model seam, and neither reads it.

Its correct path is `brain/data/Elliot's AI-GM Questions - Query result.csv`. The spelling used
in earlier specifications (`Elliots AIGM Questions  Query result.csv`, at the project root)
matches nothing; a search on it returns zero hits and reads as a missing file.

---

## 8 · Provenance

| | |
|---|---|
| first measured | S30, `brain/log/103_agent_eval_scope.md`, 2026-08-19 |
| re-derived from the apparatus | S32 V1, 2026-08-19 |
| store ceiling at re-derivation | 2026-07-07, asserted before and after |
| prompt hash at re-derivation | `c1137f76a76f…` |
| decision-log row | 123 |
