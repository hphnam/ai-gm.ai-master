# PRJ93 — supervisor evidence pack

Consolidated, source-verified project state. Written 2026-08-04 under
`brain/PRJ93_RULES.md`. Read once, by the deck session — no length cap.

**Method.** Artifacts were read before raw sources, in the order
`00_state_brief.md` → `00_marking_criteria.md` → `02_prj93_pipeline_spec.md` →
the five ledgers → `docs/PRJ93.md` → the examiner assessment. The graphify map
oriented the component survey. `brain/store/` was then inspected **directly**
— DuckDB opened read-only, parquet and CSV counted in code — rather than
described from the brief or from memory; every store figure below is a live
query result, not a quotation. Individual run logs were consulted only for
numbers the ledgers do not carry, and paired result JSON was preferred over any
log's prose summary.

**Amended 2026-08-05.** Section 3, "Literature foundation and methodological
justification", was inserted and Sections 3–6 renumbered to 4–7. **Re-verified
against the Overleaf remote the same day**, which turned out to differ
materially from both the local drafts and the ledgers; §3 now measures the
remote, and the differences are recorded as L1 and L10–L14. The literature
work justifies the methodology and must precede it. No existing section was
rewritten. Counts marked **measured** in §3 were computed first-hand from
`brain/drafts/literature_review.tex` and the live Zotero library this session.

**Standing hazard carried from `00_state_brief.md:188-191`** — do not quote in
the deck: Ellel MASE 0.096; "England +130%" without its row-21 pointer; pooled
Ellel spillover £500.18; the frame-hash prefixes in reports 33–35; any ruff
delta; and the claim that the July forecast beat its backtest.

---

## 1. Delta against the brief

Source of requirements: `brain/docs/PRJ93.md`. Infrastructure and data
provision are first-class rows, not footnotes to the deliverables, because the
principal deviation from the specification is on the input side, not the output
side.

### 1.1 Infrastructure and data provision (host-side obligations)

| Brief requirement | Status | Evidence path | Note |
|---|---|---|---|
| "From day one they get read access to a dedicated research schema in the production database" | **Not started** (host-side; never provisioned) | `brain/store/manifest.json:56` `"mode": "MCP-SIM aggregate (Neon not provisioned)"`; `brain/sim/ingest_june_actuals.py:3,126`; `FLAGS.md:321-345` | No NeonDB instance and no research schema has existed at any point in the placement. See §2. |
| "PostgreSQL with pgvector (NeonDB)" as the working substrate | **Reduced → compensated** | `brain/store/brain.duckdb` (16.0 MB, 24 tables); `brain/store/warehouse.py`; `brain/store/build.py` | A local DuckDB + parquet warehouse was built from source exports to stand in. Cost: every result rests on a self-assembled corpus (§5). |
| "a documented set of tool interfaces" | **Delivered — by me, not to me** | `brain/CONTRACT.md` (23 KB, "implemented (Phase 3)") | The interface contract was authored on the brain side, including twelve caller obligations. It has never been exercised by a real connector (§2.4). |
| Live Square integration ("Tool integrations to Xero, Square … are the co-founder's job") | **Blocked / partially self-served** | `FLAGS.md:350`; `brain/sim/june2026_actuals_l1_raw.json` provenance block | Brain-side Square access is Ryan-gated. June–7 July data was pulled by me through the Square MCP connector as a workaround. |
| Xero integration | **Not started** | — | Never provisioned; no financial-system data exists in the corpus. |
| Checklist completion instrumentation | **Not started** (Ryan) | `brain/data/opening_and_closing_checklist.md`; `brain/signals/checklist_discipline.md:3` | The signal runs `synthetic_log()`. See §2.2d. |
| Stock ↔ menu item mapping | **Blocked** (James) | `brain/config.py:291` `STOCK_A6_NODE_MAP` — one entry; `brain/signals/stock_inventory.md:14` | 1 of 14 core keg lines carries a demand forecast. See §2.2b. |
| Manager qualitative feedback channel (Elliot) | **Not started** | `00_state_brief.md:174-175`; §3.3 of `02_prj93_pipeline_spec.md` | S9 needs 60–100 adopt-or-dismiss labels by 2026-08-14. |
| Anthropic API access for the agent leg ("Track B") | **Blocked** (Ryan) | `FLAGS.md:998-1016`; `00_state_brief.md:111,169` | The single highest-consequence block in the project. Chase date 2026-08-04 — **now passed**. |

### 1.2 Deliverable 1 — the proactive brain

| Brief requirement | Status | Evidence path | Note |
|---|---|---|---|
| "Learn the rhythm … from sales, stock movements, checklist completions, and chat-log volume" — sales | **Delivered** | `brain/models/ladder.py`; `store.forecasts` (4,262 rows), `store.bands` (8,524 rows) | Seven-rung ladder R0–R4, conformal bands at 0.80/0.90, three venues. |
| … stock movements | **Reduced** | `brain/signals/stock_inventory.md` | Built and honest about its own scope: exact where demand is known, silent where it is not. Beer Hall only. |
| … checklist completions | **Testable only in principle** | `brain/signals/checklist_discipline.md` | Template parser + criticality weighting built; runs against a synthetic log because no completion events exist. |
| … chat-log volume | **Delivered** | `brain/signals/chatlog_kb_gap.md`; wired as the fifth briefing source (S11) | 4 real SOP gaps found on the 735-message corpus. |
| "multi-venue transfer learning" as "the interesting research" | **Delivered, then claim withdrawn** | `brain/transfer/lovo.py`; `phase_state.md:949-951,1060,1080-1097` | LOVO built and corrected three times; verdict now **NOT EVALUABLE** — a majority test needs 3 scaled venues, the estate has 2. This is an honest negative, not a failure to build. |
| "Notice deviation … anomaly and change-point detection" | **Delivered** | `brain/signals/deviation.py`, `brain/signals/change_point.py`; `store.change_points` (4 rows) | CUSUM production + BOCPD benchmark, persistence gating, attribution strings. |
| "Reason and surface … an LLM-based agent" | **Built, never run live** | `brain/eval/agent_eval.py`, `brain/eval/judge.py`; `FLAGS.md:998-1016` | Prompt frozen at `c8fa127` before any run — pre-registration by commit ordering. The measurement half (S8b) is blocked on Ryan's key. **This is examiner Fatal 4.** |
| "decides what's worth raising with the manager, when, and in what tone" | **Delivered (heuristic), pending LLM** | `brain/signals/briefing.py`; `store.briefing_runs` (55 rows) | Ranked, de-duplicated, attributed daily feed with honesty gates. Surfacing is currently `briefing._score`, six hard-coded constants. |
| "prototype the brain in Python or TypeScript … against the read-only research schema" | **Extended beyond brief** | `brain/service/app.py` (9 FastAPI endpoints); `apps/api/src/modules/proactive-brain/` | Not just a prototype — a running service, wired into the production NestJS API as 8 agent tools, registered in `apps/api/src/app.module.ts:81`. See §1.5. |

### 1.3 Deliverable 2 — evaluation framework with results

| Brief requirement | Status | Evidence path | Note |
|---|---|---|---|
| "quantitative measures (precision, recall, calibration)" | **Delivered, and extended** | `brain/eval/` — 17 result JSONs; §5 below | 644-injection detection grid, Model Confidence Set, split-conformal calibration, bootstrap scale selection. |
| "qualitative manager feedback" | **Not started — blocked (Elliot)** | `00_state_brief.md:170` | A stated contract deliverable with no data. Fallback (self-labelling with intra-rater kappa, trigger 2026-08-11) recovers only 3 of Objective 4's 4 terms. |
| "how the agent's prompts performed against real signals" | **Blocked** | `FLAGS.md:1000` | Cannot be answered without S8b. |
| Baseline comparison / model selection discipline | **Extended beyond brief** | `brain/eval/mcs.py`, `mcs_L1_results.json`; `brain/eval/scale_bootstrap_L1.json` | Model Confidence Set (Hansen–Lunde–Nason) rather than bare argmin; bootstrap-selected scale basis. Not asked for by the brief. |
| Reproducibility | **Extended beyond brief** | `brain/provenance.py`; `phase_state.md:968-983` | Four-venv layout, 614 tests / 0 failures across three venvs, per-artefact provenance stamps (venv, device, 7 library versions, store ceiling). |

### 1.4 Deliverable 3 — dissertation

Covered in full in §6. Summary: literature review closed and pushed;
methodology and results partial and on Overleaf; **discussion chapter does not
exist**; the entire Objective 3 agent results section is blocked behind S8b.

### 1.5 Built beyond the original specification — where supervisory credit sits

The brief scoped "the brain: the reasoning layer". Six things were built that
it did not ask for, each because a specified input failed to arrive.

1. **A complete data warehouse.** The brief promised a research schema. In its
   absence I assembled `brain/store/brain.duckdb` — 24 tables, 93,400
   transaction rows, a weather exogenous stack (12,173 rows across four bases),
   a stock panel, a trading-hours table and a curated local-events table — from
   raw CSV and Excel exports plus live Square MCP pulls. **Justification:** with
   no schema there is no project; every downstream result depends on this.
   **Cost:** external validity is untested (§5.5).
2. **A live HTTP service and production integration.** `brain/service/app.py`
   exposes nine endpoints; `apps/api/src/modules/proactive-brain/` consumes them
   as eight registered agent tools with a shared-secret auth path
   (`brain.client.ts:207-212`). **Justification:** the brief says the student
   "will see their work go live"; making the brain callable was the only way to
   test that claim without waiting on the connector team.
3. **A formal interface contract with twelve caller obligations.**
   `brain/CONTRACT.md`. **Justification:** the brief promised "a documented set
   of tool interfaces" and none arrived, so the brain documented its own side
   and enumerated exactly what a caller must guarantee.
4. **A research-process methodology, adopted and pre-registered.** The
   AutoResearchClaw distillation (§4.2), nine human gates, pre-registration by
   commit ordering, and an adversarial critique loop that has run four rounds
   and logged 28 defects. **Justification:** the examiner assessment named
   pre-registration by commit ordering "the strongest thing in the project".
5. **A self-audit apparatus.** Five ledgers totalling ~350 KB
   (`citation_audit`, `numbers_audit`, `code_vs_paper`, `litreview_critique`,
   `phase_state`) plus `FLAGS.md`. **Justification:** the audit trail is itself
   evidence of rigour; several published findings were overturned by it (§4.1),
   including one where the audit found that the committed foundation-model
   adoption gate **had never actually been implemented**
   (`phase_state.md:1069-1072`).
6. **A taxonomy alignment layer.** `brain/ingest/taxonomy_map.md` — a
   human-editable map from Square's live item and category names to the brain's
   forecast nodes, so a live pull can be scored against a frozen forecast.
   **Justification:** required to score the MCP-sourced June/July data against
   forecasts built on the CSV export.

---

## 2. Data provision: specified versus actual

### 2.1 The principal deviation, stated plainly

**The brief specifies read access to a dedicated NeonDB PostgreSQL research
schema in the production database, from day one. It was never provisioned. No
NeonDB instance and no research schema has been available at any point in this
placement.**

The evidence is unambiguous and appears in three independent places:

- `brain/store/manifest.json:56,70` — every post-May ingest is stamped
  `"mode": "MCP-SIM aggregate (Neon not provisioned)"`.
- `brain/sim/ingest_june_actuals.py:3` — the module docstring reads "MCP-SIM
  fallback path (Neon not provisioned)".
- `FLAGS.md:321-345` — `INGEST_SOURCE=csv`, `LIVE_INGEST=0`, and the
  `NeonAdapter` is "wired and inert, provisioning-gated".

This is also a recorded contradiction in the project's own paperwork. The state
log claims "the brain works against Ryan's read-only Neon research schema";
the code says otherwise. The examiner logged it as weakness 42
(`00_state_brief.md:98`, examiner item 42).

**The training corpus in `brain/store/` was assembled and built by me from
source exports.** Everything in §2.2 is my construction, not a provisioned
input. This is the origin of most of the asks in §7.

### 2.2 Every data source, verified against the store

All figures below are live query results against
`brain/store/brain.duckdb` (read-only) and the raw files, run 2026-08-04.

#### a. Square sales item transactions

**Table:** `line_items` — **93,400 rows**, 16 columns
(`transaction_id, category, item, price_point, channel, venue, venue_label,
qty, net_sales, gross_sales, discounts, tax, ts, date, net_sales_exvat,
excluded`). Derived views: `l1_daily`, `l2_category_daily`, `l3_item_daily`.
Parquet mirror: `brain/store/line_items.parquet` (2.93 MB).

Per-venue coverage and date continuity:

| Venue | Rows | First | Last | Trading days | Calendar span | Missing days | Units | Net sales |
|---|---|---|---|---|---|---|---|---|
| beer_hall | 48,644 | 2025-06-04 | 2026-07-07 | 302 | 399 | 97 | 63,742 | £233,582.08 |
| two_river_taps | 33,993 | 2025-06-12 | 2026-05-08 | 280 | 331 | 51 | 38,444 | £171,970.12 |
| ellel | 10,560 | 2025-06-08 | 2026-07-04 | 68 | 392 | **324** | 13,286 | £47,065.86 |
| events | 203 | 2026-05-30 | 2026-05-31 | 2 | 2 | 0 | 270 | £1,438.74 |

Ellel trades **1.21 days per week** (`eval/scale_bootstrap_L1.json`,
`trading_days_per_week`); Beer Hall 5.30; Two River Taps 5.92. Two River Taps
has been closed since 2026-05-08 — a structural break, correctly detected
(`store.change_points`, onset 2026-05-08, magnitude −71.3%, detector `both`).
The `events` location is excluded from all modelling (`excluded = true` on all
203 rows) and is a stated non-test.

**The export-to-MCP boundary is a real discontinuity, and it is material.**
The CSV export runs to 2026-05-31; June to 7 July was pulled through the Square
MCP connector. The two paths do **not** produce identical schemas or
granularity:

| Property | CSV export (to 2026-05-31) | Square MCP pull (2026-06-01 → 2026-07-07) |
|---|---|---|
| Rows | 92,329 | 1,071 |
| Grain | one line per till transaction line | one line per venue/date/category/item |
| Distinct clock times | 26,483 | **1** (every row stamped 12:00:00) |
| `transaction_id` | real Square ids (51,705 distinct) | synthetic (`JUN2026-beer_hall-2026-06-01-0`), 1:1 with rows |
| `price_point` | 99.6% populated | **100% null** |
| `tax` | populated (43.5% zero) | **100% zero** |
| Distinct items / categories | 409 / 10 | 128 / 8 |
| Venues | 4 | 2 (beer_hall, ellel) |

**What this costs.** Intraday analysis, price-point analysis, and any VAT
treatment stop at 31 May. Anything requiring transaction-level granularity —
basket composition, per-order value, dayparting — cannot be extended past that
date. The forecast layer is unaffected because it operates at daily grain, but
this is a hard ceiling on any future intraday work.

**A naming point that must not be misread.** The label "MCP-SIM" in
`manifest.json` and the sim scripts does **not** mean the data is simulated.
The provenance blocks carry a real merchant id (`ML1FFAGJMQBTZ`), a real Square
view name (`ProductMixReport` / `SalesUK`) and real refresh timestamps
(`2026-07-09T21:46:48Z`, `2026-07-10T01:10:50Z`) —
`brain/sim/june2026_actuals_l1_raw.json:2-9`. "SIM" denotes the connector
standing in for the unprovisioned Neon schema. Say this explicitly in the deck;
the label invites exactly the wrong inference.

Watermark state: `store.data_watermark` — beer_hall L1 to 2026-07-07, ellel L1
to 2026-07-04, both sourced `mcp-sim-aggregate-july2026-w1`.

#### b. Stock data (Excel)

**What it covers.** 18 workbooks in `brain/data/stock/`, resolving to two
distinct datasets:

- **Bar stock** → `store.stock_panel` (1,407 rows) and
  `store.stock_product_master` (238 products). **Beer Hall only** — 10 monthly
  snapshots, 2025-09-01 to 2026-06-01, one per month with no gaps
  (`days_since_prev` 28–31 throughout). Product mix: Spirits 79, Canned/Bottled
  35, Wine 34, Draught 33, Soft Drinks/Mixers 25, Cask 20, Snacks 8, Postmix 4.
  Inventory value ranges £4,524 (2026-01) to £11,457 (2026-06), mean £6,803,
  CV 0.34.
- **Brewery inventory** → `store.brewery_inventory` (1,002 rows), 5 snapshots,
  a separate Lune Brew entity. **Three of the five carry a null
  `snapshot_date`** — they are not time-orderable and cannot enter a panel.

**No Two River Taps or Ellel stock sheets exist at all**
(`brain/signals/stock_inventory.md:3`, `FLAG-5`). Stock coverage is therefore
one venue of three.

**Quantifying the join gap.** The mapping between stock item names and menu
item names is incomplete; James has been asked to fill it. Measured directly:

| Measure | Value |
|---|---|
| Distinct stock products (`stock_product_master`) | 238 |
| Distinct sales items (`line_items`) | 440 |
| Exact case/whitespace-normalised name matches | **26** |
| Share of total net sales touched by the matched set | **6.38%** (of £454,056.80) |
| Share of total units touched by the matched set | **4.64%** |
| Entries in the hand-authored map `STOCK_A6_NODE_MAP` (`config.py:291`) | **1** |
| Core keg/cask lines in `stock_cover` | 14 |
| …of which carry a demand forecast | **1** (`lunebrew caravan of love`) |
| …of which carry NULL demand | **13** |

**What the gap prevents.** Days-of-cover can be computed for exactly one
product. The reorder signal — the brief's "drafts supplier purchase orders" and
"next week's keg order should go up" — is demonstrable on a single SKU and
silent on the other thirteen. The signal is deliberately honest about this: it
reports on-hand only and never guesses a cover figure
(`brain/signals/stock_inventory.md:14`). Working capital analysis (mean £6,803
tied up, kegs on hand swinging 11 → 66 with no trend) is available and is the
inefficiency the signal targets, but the actionable per-SKU output is not.

Two further blockers sit behind the mapping: **supplier lead times** are a
working assumption (lead 3 + safety 2 days, `FLAG-3`, "owner to confirm per
beer") and **keg sizes** are inferred (30 L → 52.8 pints, 50 L/unknown → 88,
`FLAG-4`).

#### c. Conversational data

**The only material available is the original Elliot-to-AIGM conversation
export.** No further chat logs have been provided. Verified directly against
`brain/data/Elliot's AI-GM Questions - Query result.csv`:

| Measure | Value |
|---|---|
| Messages | **735** (376 user, 359 assistant) |
| Conversations | 66 |
| Date range | 2026-04-29 → 2026-06-12 |
| Distinct active days | **25** |
| Channel | **`web` — 735 of 735 (100%)** |
| Assistant replies that failed to produce an answer | 68 |
| Failure rate | **18.9%** |

These reconcile exactly with `brain/signals/chatlog_kb_gap.md` — an independent
confirmation that the committed signal report is traceable to its source.

**What this permits.** A KB-gap detector: cluster the questions, find clusters
failing above the 18.9% corpus baseline, rank them as candidate missing SOPs.
This works and found 4 real gaps (`chatlog_kb_gap.md`), including a gas-cannister
question at 0.6 failure density. It is wired into the briefing as the fifth
source (S11) and is one of only two of the brief's four learning domains that
are live on real data.

**What it cannot support.** Four things, each worth naming:

1. **Nothing about WhatsApp.** The brief's premise is an assistant that "is on
   WhatsApp all shift". 100% of this corpus is the `web` channel. Any claim
   about WhatsApp staff behaviour is unevidenced. `chatlog_kb_gap.md` flags this
   as a "brief mismatch".
2. **No per-venue signal.** The stream is single-owner and estate-wide; venue is
   inferred from message content only. Of 12 clusters, 10 tag `estate`.
3. **No longitudinal or volume-trend analysis.** 25 active days over a 45-day
   window is not a time series. The brief's "chat-log volume" as a rhythm input
   is not achievable on this corpus.
4. **No staff-population inference.** One owner's questions are not a staff
   body's questions. The brief's motivating example — "three staff have asked
   about the fryer reset this month" — cannot be reproduced, because there are
   not three staff in the data.

#### d. Checklist completion data

**Not instrumented. Nothing is being recorded.** Verified directly against
`brain/data/opening_and_closing_checklist.md` (64 lines): the artefact is a
**blank template**. Its header row is
`OPENING CHECKLIST - WEEK COMM: | MON | TUE | WED | THU | FRI | SAT | SUN` —
columns for a human to tick on paper. It contains 27 opening steps and 32
closing steps and **zero completion events, zero timestamps, and zero
identities**. The only completion-adjacent content is step 27 ("Initial when all
tasks are completed") and step 32 — instructions to a person, not records.

The signal that consumes it (`brain/signals/checklist_discipline.py`) is
therefore in **template-only mode against `synthetic_log()`**
(`brain/signals/checklist_discipline.md:3`). Everything downstream — the
criticality weighting (5 critical / 3 high / 1 normal / 0 conditional), the
severity ladder, the five detected scenarios in that report — is a demonstration
on fabricated input. `CHECKLIST_LIVE = False`.

**Recording is Ryan's task and has not started.** The dependency is recorded as
standing: "replace `synthetic_log()` with rows from Ryan's new mobile
checklist-capture system once it is producing data".

### 2.3 Mapping: intended brain function → data requirement → status

Statuses are deliberately distinguished. **Built and validated** = runs on real
provisioned data. **Built, validated only on self-assembled data** = runs on
real data, but data I assembled, so external validity is untested.
**Buildable but not yet built** = no blocker but no artefact. **Testable only in
principle** = code exists, input is synthetic. **Blocked outright** = cannot
proceed.

| Brain function | Data required | What exists against it | Status | Owner of the gap |
|---|---|---|---|---|
| Learn the rhythm — daily revenue (L1) | Daily sales per venue, ≥1 season | 93,400 rows, 3 modelled venues, 302/280/68 trading days | **Built, validated only on self-assembled data** | — |
| Learn the rhythm — category (L2) | Category-grain sales | 752 forecast rows, Beer Hall only | **Built, validated only on self-assembled data** | — |
| Learn the rhythm — item (L3) | Item-grain sales | 3,060 forecast rows, Beer Hall only; taxonomy drift degrades MASE 0.852 → 1.08–1.16, `DO NOT WIRE` (`FLAGS.md:453`) | **Built, not adopted** | — |
| Learn the rhythm — stock movements | Stock flows joined to demand | Monthly *levels*, one venue, 1 of 14 lines joinable | **Blocked — unjoinable** | **James** |
| Learn the rhythm — checklist completions | Completion events with timestamps | Nothing | **Blocked — absent entirely** | **Ryan** |
| Learn the rhythm — chat-log volume | Multi-day, multi-user message stream | 735 messages, 25 days, one user, web only | **Blocked — too sparse and too coarse** | **Elliot** |
| Multi-venue transfer (the brief's "interesting research") | ≥3 comparable venues | 2 scaled venues + 1 unscalable (Ellel at 1.21 trading days/wk) | **Built; verdict NOT EVALUABLE** (`phase_state.md:1080-1097`) | Structural — the estate is too small |
| Notice deviation — point anomalies | Residual stream + labels | 644-injection grid; realism discount measured at zero (`FLAGS.md:1073-1086`) | **Built and validated** (on injected labels) | — |
| Notice deviation — change points | Long daily series | CUSUM + BOCPD; 4 detected change points | **Built, validated only on self-assembled data** | — |
| Notice deviation — Ellel occurrence gate | Booking diary | Scaffold only; diary exists in the world, not the dataset | **Blocked — absent entirely** (`FLAG-ELLEL-DIARY`) | **Elliot** |
| Reason and surface — LLM agent | Live Anthropic calls (~644, temp 0) | Agent built, prompt frozen `c8fa127`, evaluator built, zero runs | **Blocked outright** (`FLAGS.md:998-1016`) | **Ryan** |
| Reason and surface — judgement quality | 60–100 manager adopt/dismiss labels | Zero | **Blocked — absent entirely** | **Elliot** |
| Reason and surface — ranking/de-dup/honesty gates | Signals + prior state | 55 briefing runs, chain-based suppression working (July: 0 new / 8 continuing) | **Built, validated only on self-assembled data** | — |
| Reason and surface — SOP gap detection | Chat corpus | 4 gaps on 735 messages | **Built, validated only on self-assembled data** | — |
| Calibration guarantee (ECE / reliability / temperature scaling) | Nothing external — needs a run | Nothing exists in the codebase | **Buildable but not yet built** | **Me** (gate G3; also cited as blocked on a key) |
| Search-protocol appendix (W33) | Nothing external | Nothing | **Buildable but not yet built** | **Me** |
| Cross-tenant cold start | Anonymised cross-org shape library | Nothing | **Blocked — absent entirely** | **Ryan + privacy sign-off** |

**On why no proxy is adequate, for each blocked function:**

- **Checklist completions.** A synthetic log can exercise the parser and the
  weighting; it cannot establish a base rate, a distribution of miss types, or a
  false-alarm rate. Those are exactly the quantities the evaluation framework
  must report. There is no defensible way to simulate operational discipline.
- **Manager labels.** Self-labelling is the recorded fallback, but it recovers
  only 3 of Objective 4's 4 terms and substitutes intra-rater kappa for
  inter-rater agreement — a strictly weaker claim, and one the examiner will
  see through.
- **The live LLM run.** The agent's judgement cannot be measured by anything
  other than the agent running. This is the object of the research question.
- **Stock mapping.** Fuzzy string matching was not adopted, and should not be:
  a wrong keg→menu join produces a *confidently wrong* reorder quantity, which
  is worse operationally than silence. The signal's current honesty (NULL
  demand rather than a guess) is the correct behaviour, and it is why the
  mapping must come from James rather than from an algorithm.
- **Ellel booking diary.** Ellel is 82% zero days. Its forecast problem is an
  occurrence problem, not a magnitude problem, and occurrence is entirely
  determined by whether a booking exists. No sales-side proxy can recover it.

### 2.4 Scope note — the brain versus the connectors

**This project is the AIGM brain. The Square and NeonDB connectors and adapters
are Ryan's responsibility.** They matter here because the brain must be callable
through them in practice.

The brain exposes nine HTTP endpoints (`brain/service/app.py`): `/health`,
`/forecast`, `/deviation/check`, `/deviation/scan`, `/deviation/changepoint`,
`/sop-gaps`, `/stock/cover`, `/checklist/discipline`, `/briefing`,
`/freshness`. The production API consumes them as eight registered agent tools
(`apps/api/src/modules/proactive-brain/brain.tools.ts`), over
`BRAIN_BASE_URL` with a `BRAIN_SHARED_SECRET`
(`brain.client.ts:207-212`), registered at `apps/api/src/app.module.ts:81`.

`brain/CONTRACT.md` enumerates twelve caller obligations. **These are the
interface assumptions the brain makes, and none of them has been verified
against a working connector.** The ones that will bite:

| Assumption | Why it is unverified | Consequence if wrong |
|---|---|---|
| `org_id` is server-set and trusted as given; compute never resolves or widens it | No multi-tenant caller has ever called it | Tenant isolation is asserted, not demonstrated |
| Sales arrive **ex-VAT** at `venue × date × category × item` grain | Only ever fed from my own warehouse | Silent 20% error in every forecast |
| Weather arrives on a **hindcast** basis | "An API that supplies ERA5 will not error — it will score better than it deserves" (`CONTRACT.md:168-170`). There is no mechanical check | Backtest flattery, undetectable |
| `exogenous` spans training history **plus the full horizon**, all 15 columns | Never supplied by a caller | The exo entrant raises |
| `trading_hours` is supplied (not derivable from sales) | Never supplied by a caller | Six World Cup covariates become underivable |
| `horizon_days ≤ 7` | Contract previously advertised `le=30`; per-step coverage decays to 80.8% at step 30 | Silent under-coverage |
| Caller sets an ingress request-size limit | `PriorState` contents are validated for shape but not size — a 100 MB `briefing_chain` is accepted and echoed back verbatim (measured, `FLAGS.md:714`) | DoS surface |
| Caller never starts a bare thread inside compute | Per-request store and profile are ContextVars; a bare `threading.Thread` starts with an empty context and **falls back to Lune's real database inside a tenant's request** | Cross-tenant data leak |
| Caller decides how to handle a reopening venue | `FLAG-SEGMENT-FALSE-REJECT` is open **by design**; the G15b fix made it *more* likely — measured: accepted at 21 days back, rejected at 13, rejected at day 1 | One reopening venue takes down the forecast for every sibling in the same call |
| Someone runs the ladder | **`ladder_selection` returns `[]` on every call**, and `_should_refit` reads the *research store's* watermark, not the injected `prior_state` (`CONTRACT.md:328-335`) | **A tenant's served model is whatever it started as, for ever.** The most serious open item. |
| `stock_enabled` does something | Accepted and reported as **unhonoured** in `diagnostics`; the stock pipeline reads spreadsheets off disk | Caller believes a feature is on that is off |
| L2/L3 available per tenant | Compute emits **L1 only**; the A-vs-B reconciliation split is `GATE_WINNER`-keyed by Lune slug with no per-tenant equivalent | Category and item forecasts do not exist for a new tenant |

Four contract decisions are formally open and are Ryan-side: transport format
(JSON vs NDJSON/Arrow — no real-volume request has ever been measured), cold
start for a single-venue org, who runs the ladder, and L2/L3 on the compute path
(`CONTRACT.md:318-338`).

---

## 3. Literature foundation and methodological justification

This section sits before the methodology trajectory because the corpus is what
licenses the methods. Where a method decision has a source behind it, that source
is named here; where it does not, it is named here too. Section 3.5 is the load-
bearing part — the matrix and, more importantly, the two exception lists under it.

Counts marked **measured** in this section were computed first-hand this session
from **the Overleaf remote** — `chapters/literature_review.tex` and
`chapters/methodology.tex` read through the Overleaf MCP — and from the live
Zotero library, not copied from a ledger and not from the local drafts. That
distinction matters: **the remote is not the local draft.**
`brain/drafts/literature_review.tex` is 67,389 bytes / ~9,475 words; the remote
is 52,435 bytes / ~7,111 words and is byte-for-byte the *condensed* draft
(`brain/drafts/literature_review_condensed.tex`, 52,431 bytes), which is
recorded in no ledger. Both carry the same 86 keys. Where a measurement disagrees with a ledger, both are
given and the conflict is recorded in "Unverified or conflicting".

### 3.1 Search and screening protocol

**State it plainly: the search was not pre-registered, and no protocol document
exists.** A supervisor will ask whether the search was systematic or
opportunistic. The defensible answer is that it was thematically organised and
retrospectively auditable, but it was not conducted under a protocol written in
advance, and the screening counts a PRISMA-style account would require were
never recorded at the time.

The evidence for that is on file rather than inferred:

| Fact | Evidence |
|---|---|
| A search-protocol appendix is a named, specified deliverable | `02_prj93_pipeline_spec.md:70-79` — ARC stage 3, artefact `appendix/search_protocol.tex`, acceptance "Databases named, query strings reproduced, inclusion and exclusion criteria stated, screened-vs-retained counts given. W33 closed" |
| It was scheduled into Phase A (now → 2026-08-04) | `02_prj93_pipeline_spec.md:325-331` |
| It does not exist | No `appendix/` directory and no `search_protocol.tex` anywhere in the working tree (checked) |
| The chapter itself contains no protocol passage | Searched on the **remote** `chapters/literature_review.tex` for search / screening / inclusion / exclusion / database terms: no protocol passage, and the one sentence that did disclose a search limit was removed in the condensation (next table) |
| The critique loop found this and it is the one finding never repaired | Role A, iteration 1, listed among 12 findings: "no search protocol" (`litreview_critique.md:72`). Iteration 2 records A confirming A1, A3, A4, A5, A7, A8 fixed (`:145`); the search-protocol finding is not among them and is not addressed in revisions 2, 3, 4, 5 or 6 |

The examiner note behind W33 calls it "a half-page appendix and it is free marks"
(`02_prj93_pipeline_spec.md:33`). It is still unwritten as of 2026-08-05, with
the build window closing 2026-08-21.

**What the search actually was, reconstructed.** This is an honest
reconstruction from the artefacts, offered as such:

- **Sources queried.** Zotero (local library, the working store — 118 items
  today, **measured**); NotebookLM notebook `d565d5f0-9ad6-446f-9573-2316a2f8c0ca`
  as a semantic index over the ingested corpus; and per-paper direct retrieval
  where those two failed — arXiv, ACM Digital Library, EuropePMC / PMC,
  Semantic Scholar, Taylor & Francis, SAGE, publisher DOI resolution, and in one
  case an author's own institutional page (`sas.upenn.edu` for Diebold &
  Mariano, `litreview_critique.md:556-557`). No structured query was run against
  Scopus, Web of Science or Google Scholar, and no query string was preserved.
- **Query construction.** Not recorded. Gap-finding for the 2026-08-01 corpus
  round was explicitly done by hand and the method is stated:
  "argument-by-argument audit of the chapter against the project's own results,
  then targeted search for the missing warrant"
  (`litreview_corpus_judgement.md:54-56`). That is a defensible method for a
  *revision* round. It is not a search protocol for the original corpus, which
  predates any of these ledgers.
- **Inclusion criteria, as practised.** Three, inferable from what was accepted
  and rejected: the source must bear on one of the eight thematic areas below;
  its specific claim must be verifiable against retrievable full text or a
  quotable abstract; and it must govern a decision the project actually makes,
  rather than fill out a landscape. The third criterion is the one the corpus
  round enforced hardest — five foundation-model citations were demoted to a
  single grouped citation precisely because they "fill out the design space
  without changing the central premise" (`litreview_corpus_judgement.md:303`).
- **Exclusion criteria, as practised.** Unverifiable claims are excluded
  outright, with the negative confirmed two independent ways before it is
  recorded as fact (`litreview_corpus_judgement.md:248-254`, the Wickens & Dixon
  case). Acquisition without a job is excluded: "Acquisition alone does not
  close it" (`citation_audit.md:238`).
- **Stage counts.** No screened-versus-retained count exists at any stage, and
  it is not recoverable now. The only defensible counts are terminal, and they
  are given in 3.2.

**Search boundary — what was deliberately out of scope, and why.** Four
non-additions are recorded with reasons on file
(`litreview_corpus_judgement.md:348-371`), and one boundary is stated inside the
chapter itself:

| Out of scope | Reason on file |
|---|---|
| Sports-fixture and event-footfall literature | Searched. What exists concerns stadium-adjacent trade and televised-match footfall, none close enough to a three-venue rural estate. Recorded as a deliberate non-addition, not an oversight — "the falsification is better defended as an honest negative than propped on a distant analogue". Note the cost: the 11 July England quarter-final falsification is the project's central result and it is uncited on both sides |
| Further conformal-prediction sources (Lei et al. 2018, Romano et al. 2019 CQR, Vovk 2005) | The conformal section is already the best-sourced in the chapter; adding would be padding |
| A third weather paper (Badorf & Hoberg 2020 was the candidate) | The two papers W54 names are already owned and were uncited; acquiring a third before citing those two repeats the failure the audit identified |
| A cull of the 27 uncited `ref.bib` entries | Inert; deleting risks the W48 `ref.bib` hazard for no marks |
| A small-collection counterexample to the globality argument | Stated in the chapter, in the one place it matters — **but only in the local draft.** "No systematic search for a small-collection counterexample was undertaken, and none is claimed" (`drafts/literature_review.tex:173-174`) is **absent from the Overleaf remote**, dropped in the unrecorded condensation. The one honest in-text search-boundary statement the chapter had is no longer in the submitted file |

That last line was the model for what the appendix should say about everything
else. It is now the model for what the chapter has lost: the condensation
removed the only sentence in which the review disclosed a limit on its own
searching. Restoring it is one line and should be done with the appendix.

### 3.2 Corpus composition

All figures in this sub-section are **measured** this session.

**Cited corpus.** The Overleaf `chapters/literature_review.tex` carries **128
citation occurrences across 86 unique keys** (the local draft carries 133
occurrences across the *same* 86 keys — the condensation cut five repeat
citations, no key). The `litreview_critique.md` header records 90 keys (`:18`,
and again at `:313` and `:505`); the pack's own §6.3 records both "75 → 90" and
"75 → ~86". **86 is what the submitted file contains**, verified on the remote. The likely
account is the revision-6 figure swap plus the recorded drops, and four keys
verify as absent from the review today: `koutsandreas_selection_2022` (dropped in
favour of `kolassa_why_2020`), `truong_ruptures_2018` (moved to methodology),
`hyndman_another_2006` (methodology only), and `tibshirani_conformal_2019`
(proposed as an optional activation, never actioned). The discrepancy is logged
rather than assumed away.

**By section, on first appearance of each key:**

| Section | Keys introduced |
|---|---|
| `sec:rw-framing` — decision support and delegated autonomy | 6 |
| `sec:rw-rhythm` — learning a rhythm on short history | 34 |
| `sec:rw-ruler` — error measures and model selection | 10 |
| `sec:rw-deviation` — from a calibrated band to a signal | 10 |
| `sec:rw-surfacing` — agents that act unasked | 11 |
| `sec:rw-evaluation` — judging the agent's judgement | 10 |
| `sec:rw-synthesis` — what the literature leaves open | 5 |
| **Total unique** | **86** |

The distribution is the argument's shape: `sec:rw-rhythm` carries 40% of the
corpus because it is where the forecasting ladder, the foundation models, the
intermittency treatment and the conformal band are all set up.

**By theme, from the Zotero library** (8 collections, every one of the 118 items
filed in exactly one — 3+5+58+9+9+10+10+14 = 118, so there are no unfiled items):

| Collection | Items |
|---|---|
| D3 — Forecasting under data scarcity | 58 |
| D8 — Evaluating agentic judgement & human–AI alerting | 14 |
| D6 — Proactive & self-initiated agents | 10 |
| D7 — RAG & long-term agent memory | 10 |
| D4 — Anomaly & change-point detection | 9 |
| D5 — LLM agents: tool use, planning, reasoning | 9 |
| D2 — Hospitality demand modelling | 5 |
| D1 — Managerial decision support | 3 |

Two observations a supervisor is likely to make first. **D2 is the smallest
substantive collection in the library** — the domain the dissertation is *about*
is the thinnest-covered theme in its corpus, at five items. That is honest
(hospitality demand modelling is a thin literature) but it should be stated
before it is asked about. And **all four papers added in the 2026-08-01 round
were filed into D3** regardless of theme: Dixon belongs in D8, Ancker in D8,
Paleyes in D1. Filing hygiene, not a substantive defect, but the collection
counts above should not be read as a clean thematic census.

**By methodological contribution** (grouping the 86 cited keys by what they
supply to the argument):

| Contribution | Approximate share |
|---|---|
| Forecasting method and foundation models | ~25 keys — the ladder's rungs and their design space |
| Evaluation measures, scoring rules, model comparison | ~14 keys — the ruler argument, MCS, DM/HLN, rank stability |
| Conformal prediction and calibration | ~10 keys |
| Change-point and anomaly detection, and their metrics | ~10 keys |
| Proactive agents and agent architecture | ~13 keys |
| Human factors: trust, compliance, reliance, alert fatigue | ~9 keys |
| Framing: decision support, agentic AI, deployment | ~5 keys |

**By publication date.** The corpus spans 1954 to 2026:

| Period | Keys | Share |
|---|---|---|
| 1954–1999 (foundational) | 8 | 9% |
| 2000–2015 | 9 | 10% |
| 2016–2023 | 32 | 37% |
| 2024–2026 (frontier) | 37 | 43% |

The eight foundational works are load-bearing rather than ceremonial: Page 1954
(the CUSUM scheme the production detector implements), Cragg 1971 and Mullahy
1986 (the hurdle framing behind the occurrence gate), Gorry & Scott Morton 1971
(the structured/unstructured decision framing the whole chapter opens on),
Croston 1972, Diebold & Mariano 1995, Parasuraman & Riley 1997, and Harvey,
Leybourne & Newbold 1997 (whose correction factor is what proves the DM test
uncomputable on this design). A 43% frontier share is the honest consequence of
writing about proactive agents in 2026, and the chapter states its own preprint
exposure rather than leaving it to be discovered: **11 of the 86 had not
completed peer review at the time of writing, all arXiv 2024–2026, each marked
at the point of citation.** Note a regression here too. The local draft gave the
per-section accounting (1 + 3 + 7 = 11), which is what makes the disclosure
checkable and which critique iterations 2 and 3 spent findings on getting right.
**The remote states only the total.** The arithmetic the disclosure exists to
support is no longer in the submitted chapter.

**The papers doing the real argumentative load.** On the remote, **ten** keys are
cited three or more times and **57 of 86 are cited exactly once**. (In the
longer local draft it is thirteen and fifty-five; `haben_short_2019`,
`hewamalage_forecast_2023` and `barber_conformal_2023` each lost a repeat
citation in the condensation, which is worth knowing because all three are
load-bearing on the metric and coverage arguments.) The load-bearing set,
**measured** on the remote:

| Key | × | What it carries |
|---|---|---|
| `montero-manso_principles_2021` | 4 | The locality/globality adjudication — the chapter's central conjecture and the reason S5's null is a prediction rather than a disappointment |
| `fu_prism_2026` | 4 | The nearest prior system; the gap claim is defined against it, and priority on cost-sensitive intervention is conceded to it |
| `lu_proactive_2024` | 4 | The proactive-agent baseline and its false-alarm figures |
| `das_-context_2025`, `zhou_context-driven_2025`, `liu_generative_2024` | 3 each | The three transfer demonstrations the globality argument must answer |
| `hertel_explainable_2026` | 3 | The weather covariate must earn its place (with `haben_short_2019`, now at 2) |
| `park_generative_2023` | 3 | The memory-stream anchor of the "rhythm as memory" move |
| `dixon_independence_2007`, `ancker_effects_2017` | 3 each | The asymmetric-cost claim, empirically |

Everything else is context. That distinction matters for the viva: six of these
ten were either added or activated in the 2026-08-01 round, which is the
measure of how much the corpus round changed the argument rather than decorating
it.

### 3.3 Corpus revision under critique

The add / drop / demote table with per-paper justification and gate status is at
§6.3 and is not repeated. What follows is what §6.3 does not carry: **how the
argument moved across the three iterations**, which is the part a supervisor is
actually assessing.

The loop ran 2026-08-01/02 under three independent role calls plus a synthesiser
(A methodologist, B statistician, C claim auditor), none seeing the others'
work; twelve disputed claims were settled at source before any revision rather
than adjudicated between reviewers (`litreview_critique.md:39-56`).

**Iteration 1 → revision 2: the chapter stopped vouching for itself.** The
synthesiser's headline finding was that **four of the five checkable claims the
chapter made about itself were false**, in the one paragraph whose function is
to establish that the chapter can be trusted (`:105-107`). Both self-praise
sentences and the pre-registration appeal were deleted. Substantively, the
transfer argument changed category: Montero-Manso had been applied to
inference-time attention when the paper governs estimation, so the extension to
a three-venue estate was recast as **the chapter's own conjecture, stated so it
can fail** (`:121`). The rank claim was restated as directionless. Two contrary
results the chapter had omitted were added. Ancker was corrected from
probability changes to odds ratios.

**Iteration 2 → revision 3: a defect generator was identified and a rule
imposed.** This is the most useful single output of the loop. The synthesiser
named the mechanism producing the defects rather than the defects:

> When the chapter cannot resolve a claim, it adds a sentence about how the
> claim will be handled. (`:173-174`)

The evidence was that repairs kept re-instantiating the defect elsewhere — one
protocol-leakage sentence removed, another appeared; one unearned assurance
removed, five appeared; an uncited high-modality paragraph removed, the defect
relocated; and the preprint repair broke the very arithmetic the disclosure
exists to make checkable. The generator was located in two project facts (no
discussion chapter exists, and three argumentative arcs terminate in facts the
chapter would not state) and the prescription was **R-Zero**, adopted verbatim:

> The chapter may state what the literature says and what the project's design
> assumes, and nothing about what any later chapter will do. (`:181-183`)

The synthesiser's verdict without it was that the draft was **thrashing, not
converging**. Under R-Zero the ECE abstention became the plain fact that ECE is
not computed, and the MASE-versus-RMSSE tension was disclosed in `sec:rw-ruler`
as a limitation of the work rather than deferred to a later chapter.

**Iteration 3 → the final revision: three statements were statistically wrong,
not imprecise.** All three were introduced or left standing by iteration 2's own
repairs, which is why the third round earned its cost over the manual's two-round
cap (`:32-35`). (i) Coverage was said to degrade "in proportion to" the state
misclassification rate where Sun & Yu and Barber give an upper *bound*.
(ii) Absolute-error measures were said to make a constant zero optimal on
"intermittent" series, which holds only once zeros outnumber trading days
(p > 2), not at the chapter's own p > 4/3 threshold. (iii) The chapter endorsed
Ask-F1 — an **equally weighted** harmonic mean — as the template for a metric the
same sentence requires to be **asymmetrically cost-weighted**. That third one is
a methodological correction, not a prose one: Ask-F1 was replaced by an
`$F_\beta$` with `$\beta$` fixed from the elicited cost ratio, and the symmetry
problem is now stated as the reason.

**Net movement of the argument across the three iterations**, which is the
summary a supervisor should be given:

| Argument | Before the loop | After |
|---|---|---|
| Cross-venue transfer | An inherited result, borrowed from Montero-Manso and applied to the wrong mechanism | The chapter's own falsifiable conjecture, with the failure condition stated. The contribution sentence now describes a **per-venue** rhythm, with pooling named as a hypothesis examined and not adopted |
| Asymmetric cost of a false alarm | Attributed to Meyer, who does not establish it | Carried by Dixon (n=32, synthetic task, caveat in prose) and Ancker (field measurement, clinical domain, cited as a transferable mechanism). Meyer keeps only the compliance limb he does support |
| Contribution category | "Field instantiation rather than method", self-described, uncited | Warranted by Paleyes — and **narrowed** by the verification step, which refused the stronger claim that benchmark work is blind to deployment problems |
| The metric | Silent on the tension | States that the chapter's own argument runs against the measure the results chapter reports. A judgement call made by the agent and flagged for the human (`:364-367`) |
| PRISM and novelty | Claimed PRISM *reports* the calibration of its acceptance probabilities | Corrected to *gates on* a calibrated probability. This widened the gap rather than narrowing it — the unreported calibration is the opening the contribution claim needs |
| Register | Forward-looking promises throughout | R-Zero: no sentence about what a later chapter will do |

**A fourth revision happened after the loop closed, and it is in no ledger.**
The last entry in `litreview_critique.md` records the remote as byte-identical to
`push6.tex` at **67,389 bytes**, SHA256 `4e6e6218…`, pushed 2026-08-03. The
remote today is **52,435 bytes** and matches
`brain/drafts/literature_review_condensed.tex` (52,431 bytes, written
2026-08-04). A condensation of roughly 2,400 words was pushed after the critique
record closed, with no gate entry, no acceptance-test re-run and no ledger line.
It preserved all 86 citation keys — which is the thing most likely to break — but
it **rolled back three repairs the loop had made**:

1. The consolidated limitations inventory that closed acceptance test T13 on
   2026-08-03 (250 words, "genuinely consolidated, which is what T13 asks for")
   is **gone**. The remote has a three-limitation sentence in its place. T13 is
   reopened.
2. The scope paragraph is **gone entirely** — with it the estate description, the
   excluded fourth location, the single-seasonal-cycle limit, and the
   author-as-rater non-independence statement that revision 3 added specifically
   to answer Role A. That statement named a threat to *internal validity*, not
   merely a limit on precision, and it was the chapter's strongest piece of
   self-audit.
3. The per-section preprint accounting is **gone**, as noted in 3.2.

This is the fifth instance of the pattern the state brief already records — every
fix round shipping a fresh defect — and the first where the regression happened
*outside* the loop that was built to catch it. All three are cheap to restore and
none requires a gate, since restoring deleted text adds no citation.

**Where a paper was dropped, what now carries the weight.** `koutsandreas_selection_2022`
carried the "measure encodes a choice of functional" claim; `kolassa_why_2020`
now carries it alone, chosen because the audit found it exact and it names the
mean / median / (−1)-median trio. `truong_ruptures_2018` carried a software
citation in the review; it moved to methodology where the library is used. The
Bregman generalisation clause was **dropped rather than cited** — the argument
does not need it and adding a source would have been an unapproved gate-2
citation (`:273-275`). Wickens & Dixon was never acquired; Dixon 2007 and Ancker
2017 already carry the asymmetry without it, so nothing depends on the
unverifiable 0.70 crossover. Two figures were dropped for a stated reason worth
repeating: `sbc_plane` and `hln_correction` "each illustrated a formula the prose
already states; neither said anything about the literature as a body. They
existed largely because T12 asked for figures, which is a whole-thesis rule doing
a chapter's thinking for it" (`:719-724`). They were replaced by one synthetic
figure, `fig:gap-map`, whose empty top-right cell *is* the gap claim.

### 3.4 Synthesis and critical position

The review takes a position rather than surveying opinion, and says so in its
second paragraph. Quoting the **remote**: "Four arguments run through the whole,
and this review takes a position on each rather than surveying opinion"
(`chapters/literature_review.tex`, Overleaf). The four debates and the
adjudications:

| Debate | Where the literature disagrees | How the review adjudicates |
|---|---|---|
| Does borrowing a rhythm across series pay when there are only three? | Three demonstrations say cross-series transfer relieves scarcity (`das_-context_2025`, `zhou_context-driven_2025`, `liu_generative_2024`); Montero-Manso & Hyndman establish that globality is **not** a similarity assumption but a complexity trade whose generalisation benefit is explicitly a large-dataset argument | **For Montero-Manso, by analogy, and the analogy is labelled the chapter's own conjecture with its falsification condition given.** All three demonstrations are on collections far larger than a three-venue estate, and the chapter says so |
| What should a forecast be scored on? | `hewamalage_forecast_2023` and `kolassa_why_2020`: absolute-error measures optimise the median, so a constant zero looks best on intermittent series; `kolassa_we_2023`: only squared-error measures are coherence-compatible, MASE is not; M5 scores on squared scaled errors | **For squared-scaled** — and then discloses that the project's own headline figures are mean-absolute-scaled, "the reasons are ones of comparability with artefacts frozen before this argument was assembled" (remote). A review that argues against its own results chapter's metric |
| Does a calibrated band survive a regime change? | `sun_conformal_2025` (Thm 4.3) and `barber_conformal_2023` bound the loss; the adaptive line (`gibbs_adaptive_2021`, `zaffran_adaptive_2022`) offers to recover it, at a cost linear in the step size | **Bounded, not eliminated.** And the chapter marks its own contrary observation — adaptive calibration performed *worse* than static at this estate's one real regime change |
| What is a proactive alert worth? | `meyer_conceptual_2004` frames compliance and reliance; `dixon_independence_2007` tests the asymmetry and finds false-alarm-prone automation worse; `ancker_effects_2017` measures the fatigue; `fu_prism_2026` and `trinh_hil-bench_2026` operationalise it | **The asymmetry is empirical, not assumed** — stated as such in the opening, verified on the remote. The cost of a false alarm is what the metric must encode |

**The gap established.** Nine surveyed proactive systems are evaluated against
annotated corpora, simulated or scripted users, or an LLM judge. "None of those
just enumerated is scored against the decisions of the operator whose work it is
intervening in" — the remote's shorter form is "and none against the decisions
of the operator whose work it is intervening in". `fig:gap-map` places them on intervention policy
against what their decisions are scored against; the top-right cell —
operator-elicited cost ratio with measured gate calibration, scored against the
operator's own accept-or-dismiss judgements — is empty, and the emptiness is the
claim.

**The stance, and its honesty.** The chapter concedes priority rather than
inflating novelty: "No claim of methodological novelty in cost-sensitive
intervention is therefore available to this dissertation, and none is made"
— verbatim on the remote. The contribution is declared as **field instantiation,
not of method**, warranted by Paleyes. And it states the exposure plainly: "The
positioning rests on a 2026 preprint: if PRISM's results do not survive review
the gap is differently shaped, though the absence of an operator-grounded
evaluation would remain." All three quotations verified against
`chapters/literature_review.tex` on Overleaf.
It **did** name the author-as-rater non-independence as a threat to internal
validity rather than a limit on precision — but that sentence, and the scope
paragraph carrying it, are absent from the remote (see 3.3). On the submitted
chapter the stance is intact and the self-audit is not.

Three of those four adjudications are also **predictions of the project's own
negative results** — S5 (pooling does not help), S2 (a ranking on few origins
carries little information), S6 (weather marginal). Before the corpus round the
review anticipated none of the three and in all three cases implied the opposite
(`litreview_corpus_judgement.md:80-83, 383`).

### 3.5 Evidence-to-method traceability

Thirty-one rows, verified against the **Overleaf** `literature_review.tex` and
`methodology.tex`. "Reported" cites the chapter and section label; `lit` =
`literature_review.tex`, `meth` = `methodology.tex`, `res` = `results.tex`.
"Verdict" is from `citation_audit.md` — two passes, 84 keys, final totals
SUPPORTED 74 / OVERSTATED 9 / WRONG-SOURCE 1 / UNSUPPORTED 0 / MISSING-KEY 0 /
UNVERIFIED 0 (`:331-340`). Keys added or activated after 2026-07-30 were not in
that audit's scope and are marked accordingly.

| # | Literature claim or finding | Citation key(s) | Method / parameter / design it licenses | Implemented | Reported | Verdict |
|---|---|---|---|---|---|---|
| 1 | Globality is not a similarity assumption but a complexity trade; the generalisation benefit is a large-dataset argument | `montero-manso_principles_2021` | Per-venue models served; cross-venue pooling framed as a hypothesis, not a component | `brain/models/group_forecast.py`, `brain/eval/group_icl.py` | lit `sec:rw-rhythm`, `sec:rw-synthesis` | Post-audit (added 2026-08-01); verified to the sentence in NotebookLM, `litreview_corpus_judgement.md:163-172` |
| 2 | Absolute-error measures optimise the median; a constant zero looks best on intermittent series; a naive benchmark scoring exact zeros deflates the scaling denominator | `hewamalage_forecast_2023` | The whole ruler argument; motivates RMSSE (G1) and the Ellel loss decision (G2) | `brain/eval/harness.py::seasonal_naive_scale`, `brain/config.py` `VENUE_SCALE_BASIS` / `VENUE_LOSS` / `is_scaled_venue` | lit `sec:rw-ruler`; meth `sec:ruler`; res `sec:res-basis` | SUPPORTED — "the strongest single citation in the project for the G1/G2 case" (`citation_audit.md:113`) |
| 3 | Only squared-error measures (and monotonic functions of weighted sums of them) have coherent minimising point forecasts; MASE is a scaled MAE and is not coherence-compatible | `kolassa_we_2023` | Argues for RMSSE as the headline metric | **Implemented, but not as headline.** The methodology computes RMSSE "on the same four bases as Equation~\ref{eq:mase} rather than on M5's lag-one denominator, so that the two measures share a single ruler and differ only in loss function", with a lag-one variant reported beside it; RMSSE is also the MCS *secondary* loss (`tab:mcs-config`). G1 is a choice of headline, not a missing computation | lit `sec:rw-ruler`; meth `sec:ruler`, `sec:mcs` | OVERSTATED on first pass (the chapter generalised a MAPE/MAE-specific result); the current text says "usually not coherent", which the source supports |
| 4 | Lowest forecast error does not deliver lowest system cost on lumpy demand; all-zero forecasts win at high lumpiness | `chatfield_all-zero_2007` | G2: Ellel scored on unscaled MAE with no scale basis at all | `brain/config.py` `VENUE_LOSS` / `is_scaled_venue` | lit `sec:rw-ruler`; meth `sec:no-basis`; res `sec:res-basis` | SUPPORTED — "the load-bearing source for G2" (`citation_audit.md:196`) |
| 5 | Corrected intermittency constants: p = 4/3 (not 1.32), v = 0.5 (not 0.49); SBA selected whenever v > 2 − (3/2)p | `kostenko_note_2006`, `syntetos_categorization_2005` | Classification cutoffs and estimator selection. Beer Hall's ADI 1.3267 falls **between** the two cutoff pairs, so the correction changes its label | `brain/eval/intermittency_diagnostic.py::_pattern` — CV² taken conditional on occurrence (`sizes = size[occ]`), as Syntetos & Boylan specify; checked clean, no `code_vs_paper.md` entry. **But the selection inequality was implemented reversed**, quoted from the external review rather than checked against the paper | lit `sec:rw-rhythm`; meth `sec:intermittency`; res `tab:intermittency` caption | SUPPORTED / SUPPORTED (second pass). The methodology now states the error openly, withdraws the "no node selects SBA" finding as an artefact of it, and adds a result no ledger carries: since 2 − (3/2)(4/3) = 0 exactly and v ≥ 0 always, **classification as intermittent entails selection of SBA**, so the rule carries no information for the nodes it is meant to govern |
| 6 | Croston models the gap between demand events; SBA applies the bias correction | `croston_forecasting_1972`, `syntetos_accuracy_2005` | The intermittent rung | `brain/models/intermittent.py` | lit `sec:rw-rhythm`; meth | SUPPORTED — both re-verified verbatim in critique iteration 1, clearing two "weak evidence" grades |
| 7 | Two-part / hurdle: a binary model governs whether the outcome is positive, a second governs the amount | `cragg_statistical_1971`, `mullahy_specification_1986` | The occurrence gate | `brain/signals/occurrence.py`, `brain/eval/occurrence_gate.py` | meth `sec:occurrence` | SUPPORTED / SUPPORTED |
| 8 | Split conformal coverage is two-sided: 1−α ≤ P ≤ 1−α + 1/(n+1) | `angelopoulos_conformal_2023` | The band; and the inference that Beer Hall's under-coverage means exchangeability is violated | `brain/conformal/methods.py`, `brain/conformal/wrap.py::conformal_quantile` | lit `sec:rw-rhythm`; res | SUPPORTED — closes W48 for this occurrence |
| 9 | Coverage loss beyond exchangeability is bounded by a weighted sum of TV distances, with no assumption on the joint distribution | `barber_conformal_2023` | Frames the Beer Hall under-coverage as a bound question rather than a short-window artefact | `brain/conformal/` | lit `sec:rw-deviation`, `sec:rw-synthesis` | SUPPORTED |
| 10 | ACI degrades efficiency linearly in γ on exchangeable scores; adapting to a shift that never arrives is worse than not adapting | `zaffran_adaptive_2022`, `gibbs_adaptive_2021` | Licenses testing ACI / AgACI and publishing the negative | `brain/eval/aci_closure_probe.py` | lit `sec:rw-rhythm`; res | SUPPORTED / SUPPORTED |
| 11 | Per-state calibration; coverage degrades bounded by the state misclassification rate (Thm 4.3), with asymptotic validity resting on Assumption 1 | `sun_conformal_2025` | The Mondrian / per-state conformal arm | `brain/eval/interval_calibration.py` | lit `sec:rw-deviation` | SUPPORTED — "precise to the theorem numbering"; W20 genuinely closed |
| 12 | CUSUM: act when Sₙ − min Sᵢ ≥ h. ARL measures false-alarm expense under stability and delay under a real change | `page_continuous_1954` | The production detector and its two-sided cost framing | `brain/signals/change_point.py::cusum`, `::persistence`; `brain/config.py:358-363` | lit `sec:rw-deviation`, `sec:rw-evaluation` | SUPPORTED |
| 13 | Posterior over run length since the last change point | `adams_bayesian_2007` | The BOCPD benchmark detector | `brain/signals/change_point.py::bocpd` | lit `sec:rw-deviation` | SUPPORTED |
| 14 | Point-adjustment is so generous that random scores reach F1 near 1 and overturn most SOTA; VUS-PR is lag-robust and unbiased; balanced adjustment penalises false positives | `kim_towards_2022`, `liu_elephant_2024`, `bhattacharya_towards_2024`, `gim_evaluation_2023` | Rejects point-adjusted F1; commits the project to a VUS-PR-style lag-tolerant metric | `brain/eval/change_point_eval.py` | lit `sec:rw-deviation` | SUPPORTED ×4 — but the commitment is only partly delivered (W25 open; see exception list B) |
| 15 | Reconciliation is minimum-variance **among unbiased** linear reconciliations | `wickramasuriya_optimal_2019` | The WLS_v reconciler, and the rename away from "MinT" | `brain/hierarchy/reconcile.py` | lit `sec:rw-rhythm`; res A6 | OVERSTATED (second pass) — "guaranteed minimum error variance" was unqualified; the unbiasedness condition was added |
| 16 | A model confidence set contains the best model at a given level; uninformative data yield a set with many models | `hansen_model_2011` | MCS replaces bare-argmin selection; 5-of-9 retained is a valid outcome, not a weak finding | `brain/eval/mcs.py::model_confidence_set` | lit `sec:rw-ruler`; meth `sec:mcs`; res `sec:res-mcs` | SUPPORTED — the paper's own sentence is quotable and better than the paraphrase |
| 17 | DM is oversized in small samples; the HLN factor is [(n + 1 − 2h + n⁻¹h(h−1))/n]^½ | `diebold_comparing_1995`, `harvey_testing_1997` | The original 6-origin gate had **no test at all**, not a weak one: at n = 6, h = 7 the numerator is 6 + 1 − 14 + 7 = 0. Adding a one-day origin step lifts the Beer Hall to 273 origins and the factor to **0.976**, which is what makes the MCS computable | `brain/eval/fold_vectors.py` (the step parameter); the degeneracy is stated, not worked around | meth `sec:selection` | SUPPORTED / SUPPORTED — the formula independently confirms W6 by arithmetic |
| 18 | Rankings are unstable under small evaluation setups; hierarchical aggregation and scaling are the main drivers; scale normalisation of the M5 measure reduces stability | `hewamalage_look_2021`, `brigato_there_2025` | Fold count raised 6 → 273 / 260 / 205 rolling origins | `brain/eval/fold_vectors.py`, `brain/models/ladder.py` | lit `sec:rw-rhythm`, `sec:rw-synthesis` | Post-audit (activated 2026-08-02) — uncited anywhere at the time of the audit |
| 19 | Temperature is often detrimental at low aggregation in short-term load forecasting | `haben_short_2019` | The weather covariate must earn its place; the hindcast training basis; the 15-covariate exogenous arm | `brain/models/weather_basis.py`, `brain/eval/weather_basis.py`, `brain/config.py` `WEATHER_TRAIN_BASIS` / `WEATHER_LEAD_DAYS` | lit `sec:rw-rhythm` | SUPPORTED (second pass) — activated 2026-08-02, previously in `ref.bib` and uncited |
| 20 | Chronos-2 attribution: load history 89%, temperature 3.55%, irradiance 2.74% | `hertel_explainable_2026` | Weak corroboration for weather marginality, with the collinearity objection stated | `brain/eval/weather_basis_L1.json` | lit `sec:rw-rhythm` | Corrected 2026-08-03 — the chapter had rounded 3.55→4 and 2.74→3, widening a 0.8-point gap in the direction that suited the sentence |
| 21 | Group attention aggregates across all series in a group at each patch index; short histories and cold starts are the named beneficiaries | `ansari_chronos-2_2025` | The served rung-4 model. The `id="l1"` group-of-one defect (W18) is precisely a violation of this mechanism | `brain/models/foundation.py`, `brain/models/group_forecast.py` | lit `sec:rw-rhythm` | SUPPORTED — "the strongest-sourced passage in the chapter, and it is the served model" |
| 22 | False-alarm-prone automation harms overall performance more than miss-prone automation, and affects both compliance and reliance | `dixon_independence_2007` | The asymmetric miss-to-false-alarm cost ratio behind the surfacing gate | `brain/signals/agent.py`, `brain/eval/agent_eval.py` (cost sweep) | lit `sec:rw-evaluation`, `sec:rw-synthesis` | Post-audit (added 2026-08-01); verified verbatim in NotebookLM including the Applications line |
| 23 | Reminder acceptance drops 30% per additional reminder per encounter (incident rate ratio, clinician-level negative binomial) | `ancker_effects_2017` | Fatigue penalty and de-duplication in the briefing ranker | `brain/signals/briefing.py` | lit `sec:rw-evaluation` | Post-audit; verified at primary source PMC5387195 after five ingestion routes failed. **Corrected 2026-08-03** — the chapter had called them odds ratios from an alert-level model |
| 24 | Intervention gated on a calibrated acceptance probability exceeding a threshold derived from asymmetric costs; 66.47→86.61 F1, 50.22→22.94 false alarm (percentage points) | `fu_prism_2026` | The cost-ratio threshold sweep and the gap claim | `brain/eval/agent_eval.py::_score_injection`, `::scaled_ranking` | lit `sec:rw-surfacing`, `sec:rw-synthesis` | OVERSTATED (limb c) — corrected from "reports the calibration of" to "gates on a calibrated". A silent points→relative conversion was also found and fixed |
| 25 | Ask-F1: harmonic mean of question precision and blocker recall, penalising both over-asking and silent wrong guessing | `trinh_hil-bench_2026` | Originally the metric template; **replaced in revision 3** by F_β with β fixed from the elicited cost ratio, because Ask-F1 is equally weighted and the argument requires asymmetry | `brain/eval/agent_eval.py` (Ask-F1 sweep exists and is degenerate — W27) | lit `sec:rw-evaluation` | SUPPORTED — the source is right; the design decision it licensed was retracted on statistical grounds |
| 26 | Modern networks are overconfident; temperature scaling restores calibration; ECE is the primary empirical metric (CIFAR-100 ResNet-110, 16.53% → 1.26%) | `guo_calibration_2017` | ECE, reliability diagram, temperature scaling | **Not implemented anywhere in the codebase** (W10 / W26; gate G3 open) | lit `sec:rw-evaluation` | UNVERIFIED first pass → SUPPORTED second pass |
| 27 | Deployment challenges are catalogued from real case studies and occur at every workflow stage | `paleyes_challenges_2022` | The warrant for "field instantiation" as a contribution category | n/a — an argument, not a component | lit `sec:rw-synthesis` | Post-audit (added 2026-08-01); **narrowed at verification** — the notebook refused the stronger claim that benchmark research fails to surface these problems, so the chapter asserts only the narrow version |
| 28 | LLM judges: 85% agreement without ties vs 81% human–human; positional bias can reverse a verdict; judges favour their own generations; agreement varies by task and by text provenance | `zheng_judging_2023`, `wang_large_2024`, `panickssery_llm_2024`, `bavaresco_llms_2025` | The LLM-judge protocol and the requirement to validate it against human annotation | `brain/eval/judge.py`, `brain/eval/judge_prompts.md` — **never run, no key, zero kappa** | lit `sec:rw-evaluation`; meth `sec:agent` | Zheng UNVERIFIED → SUPPORTED. **`bavaresco_llms_2025` was OVERSTATED in both chapters and is now FIXED in both.** The remote methodology reads "agreement … varies substantially across models and datasets, and … depends on whether the text being judged is human- or model-generated" — variability by provenance, no directional bias, and no "task-specific". Verified on the remote |
| 29 | MASE in its **seasonal** form: the denominator is the in-sample MAE of the seasonal-naive method at lag m, not the one-step random walk | `hyndman_forecasting_2021` (Hyndman & Athanasopoulos, *Forecasting: principles and practice*) | The project's entire ruler, at m = 7, across four named denominator bases | `brain/eval/harness.py::seasonal_naive_scale` with a mandatory `basis` argument and no default | meth `sec:ruler`, Eq. (1) | **Not in the 84-key audit and not in the methodology header's 2026-07-25 key list** — added later. Zotero `K45PBRM3`, confirmed this session. This is the key that **repairs the `hyndman_another_2006` defect**: the 2006 paper is now cited only for the original definition it does give |
| 30 | The one-standard-error margin, introduced for tree pruning | `breiman_classification_1984` | The intermittent estimator displaces the DOW median only when its mean advantage exceeds one SE of that advantage, paired over disjoint 7-day validation sub-blocks; fails closed on <2 sub-blocks, non-finite differentials, or zero dispersion | `brain/eval/` intermittent adoption path; spec pre-registered at commit `1b649dc` before any implementing code | meth `sec:intermittency`; res `sec:res-margin` | **Not in the 84-key audit and not in the methodology header's key list.** Zotero `54Z6YNAL`, confirmed this session |
| 31 | Agent memory is a persistent self-evolving cognitive state, categorically more than retrieval; the memory stream retrieves on recency + relevance + importance with periodic reflection | `park_generative_2023`, `hu_memory_2026` | The "learned rhythm as the agent's model of normality" move | `brain/signals/residual.py` — which W28 establishes is **a recency multiplier with a floor of 0.5**. No memory stream, no reflection, no retrieval | lit `sec:rw-surfacing` | UNVERIFIED → SUPPORTED (both). The citation is sound; **the implementation does not do what the citation licenses**, and the chapter has been rewritten to claim only a bounded version |

#### Exception list A — method decisions with no literature backing

Twelve, re-checked against the Overleaf methodology. **One entry from my first
pass this session was wrong and is corrected below** (A5 — Breiman *is* cited).
Each is marked **pragmatic** (a defensible engineering choice that does not need
a source), **exploratory** (settled empirically by this project's own probe), or
**gap** (it should carry a citation and does not).

| # | Decision | Value / location | Class | Note |
|---|---|---|---|---|
| A1 | CUSUM decision threshold and slack | `CP_CUSUM_H = 5.0`, `CP_CUSUM_K = 0.5` (`brain/config.py:358-363`) | **Pragmatic, and explicitly disclaimed** | Better handled than I credited before reading the remote. The methodology states that the textbook constants and their ARL tables are derived for a statistic standardised by a *standard deviation*, that Eq. (z) divides by a conformal half-width instead, that "the constants are therefore transplanted into a unit in which their published false-alarm properties are not defined", and that **no ARL claim is made on their authority**. What licenses the operating point is the empirical validation against the real Two River Taps closure and the injection corpus — "a weaker warrant than a closed-form run-length, and it is the honest one." The alternative (restandardise and recover the tables) is stated and rejected with a reason |
| A2 | Persistence gating before a change point is confirmed | `brain/signals/change_point.py::persistence`; realised delays 7 / 8 / 16 / 63 days in `change_points` | **Pragmatic** | No citation anywhere for the persistence rule. It is the mechanism behind `FLAG-CONTINUATION-ALERT-SUPPRESSION`, which is open, so it is the uncited decision with a known defect attached |
| A3 | Moving-block bootstrap: block length 7 | `BLOCK_LEN = 7`, sensitivity `(2, 7, 14, 21)`, `B = 1000` primary / 5000 check (`brain/eval/mcs.py:52-56`) | **Gap — but pre-registered** | The remote methodology puts all of it in `tab:mcs-config`, "recorded before execution", with the reason stated ("moving block, to respect the serial correlation the one-day step induces"). That is stronger than an unexamined default. It remains the only inference engine behind every CI in the results with **no resampling citation anywhere**: Künsch (1989) and Politis & Romano (1994) are absent from Zotero (checked) and from both chapters |
| A4 | Bootstrap replicates and seed | `N_BOOT = 1000` (sensitivity 1000 / 5000), `SEED = 93` | **Pragmatic** | Reported with the results, which is what matters |
| A5 | One-standard-error adoption rule | `ledger/prereg_adoption_margin_2026-08-01.md`; spec committed at `1b649dc` before any implementing code | **NOT A GAP — my first pass this session was wrong** | I checked only the literature review, found zero occurrences, and concluded the warrant was uncited. **The Overleaf methodology cites it**: `\citet{breiman_classification_1984}`, in `sec:intermittency`, with the estimator, the sub-block rationale and the fail-closed conditions all stated. Matrix row 30. Recording the correction rather than deleting the row, because the near-miss is instructive: a key can be absent from the review and present in methodology, and no ledger carries the methodology's key list |
| A6 | Surfacing / ranking policy | Six hard-coded constants in the briefing ranker (W4) | **Gap** | The most consequential entry in this list. `sec:rw-evaluation` is an extended argument about how an intervention decision should be governed, and the served decision is six literals — neither fitted nor cited |
| A7 | Weather lead time and training basis | `WEATHER_LEAD_DAYS = 3`, `WEATHER_TRAIN_BASIS = "hindcast"`, `WEATHER_HORIZON_MODEL = "ecmwf_ifs025"` | **Exploratory** | Settled by the five-arm weather-basis probe (`eval/weather_basis_L1.json`), not by a source. Defensible as such, and the probe is reported |
| A8 | Serving horizon capped at 7 days | `CONTRACT.md:218-238` | **Pragmatic** | Driven by the measured per-step coverage decay (100 / 96.2 / 84.6 / 88.5 / 80.8% at steps 1/7/14/21/30), which is a stronger justification than a citation would be |
| A9 | Spike / discount detection share | `SPIKE_DISCOUNT_SHARE = 0.95` (`brain/config.py`) | **Pragmatic** | A data-cleaning threshold |
| A10 | Chat-log gap-cluster rule | "a cluster failing above the 18.9% corpus baseline (≥2 failures)", TF-IDF backend (`signals/chatlog_kb_gap.md:13-14`) | **Exploratory, with the backend justified** | The remote methodology gives a reproducibility argument for pinning the keyless term-frequency backend — three backends give three clusterings, so a configurable one would be unreproducible — and states the precision-over-recall tuning. **The threshold itself is still uncited and still empirical**, and the signal is live in the briefing, so it is a served decision |
| A11 | Venue exclusion by materiality | `events` excluded, 203 rows, all `excluded = true` | **Pragmatic** | Stated in the chapter's scope paragraph |
| A12 | VAT treatment: TRT deflated by 1/1.2 | `store/manifest.json` | **Pragmatic** | An accounting correction, not a method choice, but it moves every TRT figure and should be stated in methodology |

**After checking the remote, the count of genuine gaps falls from three to two.**
Six entries are pragmatic and need nothing; three are exploratory and already
reported as probes; A5 was my error and is not a gap at all. What remains:

- **A3, the bootstrap.** The only real citation gap. It is pre-registered and
  sensitivity-swept, but the moving-block bootstrap underwrites every confidence
  interval in the results and the corpus contains no resampling literature.
  Acquiring Künsch and Politis & Romano is a gate-2 decision, so I have not.
- **A6, the six surfacing constants.** Not a citation problem. `sec:rw-evaluation`
  is an extended argument about how an intervention decision should be governed
  and the served decision is six literals — the methodology says so itself ("no
  model participates in any served decision, so the question is not addressed by
  the artefact"). That is Fatal 2 in another guise, and it closes with S8b, not
  with a reference.

The general lesson from A1, A3, A5 and A10 together: **the methodology chapter is
considerably better warranted than the ledgers record.** Four of the twelve
entries softened or vanished on contact with the remote. No ledger carries the
methodology's citation list, which is why this was not visible before.

#### Exception list B — literature findings the review establishes but the methodology does not act on

Thirteen, re-checked against the Overleaf methodology. **Three entries softened
on contact with the remote** (B1, B3, B10) — the methodology acts on more of the
corpus than the ledgers record. Reason is **out of scope** (a considered
decision), **blocked by data provision** (cross-referenced to §2 — the specified
input never arrived), or **outstanding work** (mine, unblocked, not done).

| # | Finding established in the review | Not acted on because | Cross-ref |
|---|---|---|---|
| B1 | Squared-error measures are coherence-compatible; MASE is not (`kolassa_we_2023`, `hewamalage_forecast_2023`) | **Partly acted on.** RMSSE *is* computed, on the same four bases as MASE so the two share a ruler, and it is the MCS secondary loss. What is open is only which one is **headline** — G1. The review discloses the tension against its own results chapter rather than resolving it | §4.1 row "RMSSE as headline metric"; matrix row 3 |
| B2 | ECE with temperature scaling is the instrument that carries a calibration guarantee to the output (`guo_calibration_2017`) | **Outstanding work.** Cheap, unblocked, specified as ARC stage 10, not done. Gate G3 | §4.1; W10 / W26 |
| B3 | Rank stability degrades with scale normalisation of the M5 measure (`hewamalage_look_2021`) | **Acted on — I had this wrong before reading the remote.** The methodology cites it twice: once to source the M5 lag-one scale (correcting an internal audit claim that was itself wrong and is withdrawn), and once as "a direct argument for the practice adopted here of reporting a scaled error alongside an unscaled proper score rather than resting a conclusion on the scaled one alone". The tension with B1 is not merely noted, it is what the two-instrument practice answers | §3.4 |
| B4 | Hurdle / two-part models for zero-inflated demand (`cragg_statistical_1971`, `mullahy_specification_1986`) | **Blocked by data provision — and the methodology handles the block unusually well.** The first factor of the hurdle is *observed* rather than estimated, so Cragg and Mullahy are cited for the framework the design instantiates and the arm "cannot be read as a test of hurdle modelling as such". Where the diary is unavailable — Ellel, throughout — the gate is "reported as untestable at that venue rather than approximated", and the tempting circular approximation (deriving occurrence from Ellel's own trading days) is **made impossible by construction**: the diary function takes no revenue parameter and a test asserts no such branch exists. The blocker is Elliot's booking diary | **§2.3**, "data absent entirely" |
| B5 | Proper scoring rules for low-count retail demand (`kolassa_evaluating_2016`) | **Out of scope by decision.** Activated as a citation in the corpus round; no count-density forecast is produced. Reporting a density here would require B1 settled first | §3.3 |
| B6 | The intervention threshold should be fixed from the operator's own elicited cost ratio (`fu_prism_2026`, `trinh_hil-bench_2026`) | **Blocked by data provision.** The elicitation never happened. β in the F_β that replaced Ask-F1 has no value because no cost ratio has been elicited from the operator — Elliot | **§2.3**, "data absent entirely" |
| B7 | The asymmetry of false-alarm cost is empirically testable against real operator responses (`dixon_independence_2007`, `ancker_effects_2017`) | **Blocked by data provision.** Zero operator accept-or-dismiss labels exist (S9, target 60–100 by 2026-08-14) — Elliot. The documented fallback is author self-labelling, which the chapter now names as a threat to internal validity | **§2.3**; §6.6 |
| B8 | Globality pays at scale, so the real test of the transfer argument is a larger collection (`montero-manso_principles_2021`) | **Blocked by data provision.** The larger collection would be cross-tenant, which needs both the data and a privacy sign-off — Ryan. The estate has two scaled venues, so LOVO is **NOT EVALUABLE for structural reasons**, not for want of effort | **§2.3**; §4.1 "Multi-venue transfer / LOVO" |
| B9 | Agent memory as a persistent self-evolving state with reflection (`park_generative_2023`, `hu_memory_2026`) | **Outstanding work — and the claim has been narrowed rather than the code extended.** W28: the implementation is a recency multiplier with a floor of 0.5 | §4.1 "Rhythm as agent memory" |
| B10 | Per-state / Mondrian conformal calibration shortens post-shift miscoverage (`sun_conformal_2025`) | **Acted on, by deliberate divergence.** The methodology specifies a Mondrian variant splitting active from structural-zero days, and says it "deliberately uses an *observed* regime variable rather than an inferred one, which removes the state-misclassification term that a latent-state conditional method carries". That is reasoning *from* Sun & Yu's Thm 4.3 to a design that sidesteps its error term. What remains outstanding is per-**step** calibration, which was measured and not adopted | §5.3 |
| B11 | VUS-PR is the lag-tolerant detection metric and point-adjusted F1 should be rejected (`liu_elephant_2024`, `kim_towards_2022`) | **Outstanding work.** W25 is open: the project record is ambiguous on whether VUS-PR was computed — report 11 says the dependency was unavailable, the run list says it was run via pinned TSB-AD | §4.1; the register below |
| B12 | Deployment challenges recur at identifiable workflow stages (`paleyes_challenges_2022`) | **Outstanding work.** Nothing maps this project's own failures onto Paleyes' stages. It is cheap and it would strengthen the Discussion, which does not yet exist | §6.1 |
| B13 | Weighted conformal under covariate shift (`tibshirani_conformal_2019`) | **Out of scope by decision** — proposed as an optional activation and never actioned. But the disposition was never recorded, which puts it in the same class as Wickens & Dixon | Register below |

**Net after checking the remote:** B1, B3 and B10 are acted on rather than
outstanding. Seven remain genuinely outstanding (B2 ECE, B5, B9, B11, B12, B13,
and per-step calibration inside B10), and four are blocked.

**The four blocked entries are the point of this list.** B4, B6, B7 and B8 are
each a method the literature supports, that this project argues for in its own
review, and that could not be run because a specified input never arrived. Two
are controlled by Elliot (the booking diary, the operator labels and the cost
elicitation), one by Ryan (cross-tenant data plus privacy sign-off), and one is
structural in the estate itself. **That is the strongest available evidence that
the scope reduction was externally imposed rather than chosen**: the reduced
methods are precisely the ones the corpus was extended to justify.

### 3.6 Sequencing, and why this order

The working rule is recorded in advance, not reconstructed:

> Literature review settles before methodology, methodology before any
> experiment rerun. **The second half holds without exception. The first half is
> inverted for three specific items, recorded here rather than quietly
> reordered.** (`02_prj93_pipeline_spec.md:334-337`)

The literature review was completed and critique-hardened on 2026-08-01/02
(three critique rounds, three revision passes), pushed 2026-08-02, then style-
passed and re-figured on 2026-08-03 — **before** methodology revision closed and
**before** experiment gap closure, which has not started at all. Phase C
(2026-08-04 → 08-14, the blocked experiments) is not moving.

**Why that order.** The corpus determines which baselines and comparators are
defensible, so settling it first prevents running experiments against the wrong
benchmark. Two concrete instances, both checkable:

- Activating `hansen_model_2011` + `diebold_comparing_1995` + `harvey_testing_1997`
  in the review is what made the Model Confidence Set the comparison procedure
  instead of bare argmin. The corpus judgement names this "the single
  highest-value move on the list against the marking criteria", because W36
  cites the absent alternative-comparison as the explicit reason Distinction is
  not met (`litreview_corpus_judgement.md:286-291`). Had the comparison been run
  before the corpus settled, it would have been argmin.
- Activating `chatfield_all-zero_2007` is what licensed the G2 decision to drop
  scaled error at Ellel entirely. Without it the natural move would have been to
  pick a better scale basis — and the bootstrap shows all four bases are
  indefensible at 1.21 trading days per week.

**Where the order is deliberately inverted, and it is on file.** Three items,
recorded as dependency conflicts rather than reordered silently
(`02_prj93_pipeline_spec.md:339-361`):

| Inversion | Why |
|---|---|
| The contribution claim settles **after** the results | W24 holds that all three legs fail against what was built; leg two resolves only when S8b runs, and S8b is blocked on a third-party key. The review therefore settles in **two passes** — result-independent repairs in Phase A, the contribution claim in Phase E. A single settlement point is not achievable on this dependency graph |
| The four broken promises (W25 VUS-PR, W26 ECE, W27 Ask-F1, W28 memory) | Each closes either by running the thing or by amending the promise, and choosing between those is a **methodology** decision that must precede the lit-review edit. This inverts the stated order for four items |
| G1 and G2 are three-way | Adopting RMSSE changes the headline metric, the results chapter *and* the review's metric paragraph simultaneously. Methodology-before-experiment holds; lit-review-before-methodology cannot |

**Modelling work proceeded in parallel throughout, by design.** Phases A
(literature) and B (methodology) were scheduled concurrently "because B's
decisions are prerequisites for E, and serialising them behind A wastes the only
slack in the schedule" (`02_prj93_pipeline_spec.md:330-331`). What was
provisional as a result, and is flagged as such:

- **Every MASE headline figure**, frozen before the ruler argument existed. The
  chapter says so itself. The remote's wording: the headline figures "are
  mean-absolute-scaled, with an unscaled absolute error at the venue where no
  scale basis proved defensible, so the argument assembled here runs against the
  measure the results chapter reports. The reasons are ones of comparability with
  artefacts frozen before this argument was assembled."
  (The local draft's shorter "a tension inherited from artefacts frozen before
  that case was assembled" sat in the scope paragraph, which the condensation
  deleted.)
- **`tab:ladder`**, deliberately not re-run under the corrected basis; the
  caption was amended to state its historical basis instead, because the table
  is the decision under audit.
- **The contribution claim**, which cannot settle until Phase E.
- **The review's own status as a post-hoc argument**, disclosed in the opening.
  Quoting the **remote**: "this review was written after the experimental work it
  introduces, so where the literature anticipates an outcome in this estate that
  anticipation is an argument the reader can check against the source, not a
  record of what was believed beforehand" (`chapters/literature_review.tex`,
  Overleaf). That disclosure is what keeps the three anticipated negatives
  (S5, S2, S6) honest rather than retrofitted, and it survived the condensation.

### 3.7 Standing limitations of the literature work

**Outstanding `citation_audit.md` verdicts.** The second pass closed all 11
UNVERIFIED but raised the OVERSTATED count to 9, plus 1 WRONG-SOURCE. The audit
file's own closing line reads: "Proposed corrections for all nine OVERSTATED and
the one WRONG-SOURCE are in `brain/ledger/citation_fixes.md`. **None has been
applied**" (`:387-389`). The critique loop subsequently fixed at least nine of
them (Ancker, ProActor, Chae, M5, Hertel, PRISM limb c, Kolassa, Wickramasuriya,
Hancock — Hancock's first-pass verdict was itself found wrong on the second
pass). **The audit ledger was never updated to record those closures**, so the
canonical defect ledger still reads as if nothing was fixed. That is a ledger
hygiene failure, not an open defect, and it is in the register below.

**The two I expected to find unrepaired are both fixed on Overleaf.** This is the
single most useful outcome of reading the remote rather than the drafts, and it
reverses what I wrote earlier today.

- **`hyndman_another_2006` is repaired.** The audit found the 2006 paper defines
  MASE against the plain lag-1 random walk and gives no seasonal variant
  (`citation_audit.md:362`), while the project's whole ruler is seasonal-naive.
  The remote methodology now splits the citation exactly as it should: Hyndman &
  Koehler for the original definition, and **`hyndman_forecasting_2021`**
  (Hyndman & Athanasopoulos, *Forecasting: principles and practice*, Zotero
  `K45PBRM3`, confirmed this session) for the seasonal form at lag m. What I
  called the highest-priority unresolved citation defect is closed.
- **`bavaresco_llms_2025` is repaired in both places.** The remote methodology
  reads "agreement … varies substantially across models and datasets, and … 
  depends on whether the text being judged is human- or model-generated" —
  variability by provenance, no directional bias, no "task-specific".

**What that implies about the ledgers, and it is the real finding.** Neither
repair is recorded anywhere. `citation_audit.md` still says none of its proposed
corrections has been applied; `litreview_critique.md` covers the review only and
states that `methodology.tex` was never revised. **The methodology chapter has
been substantially revised — new citations added, two audit defects closed, a
reversed inequality caught and withdrawn, a pre-registered MCS configuration
table written — and no ledger carries any of it.** Two of the keys it now uses
(`hyndman_forecasting_2021`, `breiman_classification_1984`) appear in no audit
and in no key list, including the chapter's own header comment, which still
records a 20-key check dated 2026-07-25 against a 111-entry `ref.bib`. The
verification apparatus is pointed at one chapter while a second chapter changes
underneath it.

**One defect the remote methodology discloses that no ledger carries.** The SBA
selection inequality (Eq. `sba`) "was specified with the inequality reversed",
quoted from the external review rather than checked against Kostenko & Hyndman,
"and the reported finding that no node in the estate selects the Syntetos-Boylan
approximation is a consequence of that error rather than a property of the data."
Under the published rule every node selects SBA. The chapter then shows the rule
is **non-informative** at the intermittency cutoff — 2 − (3/2)(4/3) = 0 exactly
and v ≥ 0 always, so classification as intermittent entails selection — which is
a genuinely good result and belongs in the deck.

**Methodological positions resting on a single source.** Five, and each should be
answerable in a viva:

| Position | Single source | Exposure |
|---|---|---|
| Pooling will not pay at three venues | `montero-manso_principles_2021` | The whole adjudication of debate 1, extended by analogy to a case the paper does not cover. The chapter labels it a conjecture, which is the right mitigation |
| "Field instantiation" is a contribution category | `paleyes_challenges_2022` | And the claim was **narrowed at verification** — the notebook refused the stronger version. The narrow version is what the contribution rests on |
| The gap exists | `fu_prism_2026` | A 2026 preprint. The chapter states what changes if it does not survive review, which is the correct disclosure |
| ECE is the loop-closing instrument | `guo_calibration_2017` | And it is not computed (B2) |
| The CUSUM scheme and its ARL cost framing | `page_continuous_1954` | Uncontroversial, but the operating constants are uncited (A1) |

**Coverage gaps knowingly accepted.** No sports-fixture or event literature, at
the cost of leaving the project's central falsification uncited on both sides.
No resampling/bootstrap literature at all (A3). No hospitality-specific
intermittency work — D2 holds five items, the thinnest collection in the library
for the domain the dissertation is about.

**Verifiability of the newest evidence.** Zotero PDF coverage is 112 of 118
(**measured**). Four of the six items without a stored PDF are
`montero-manso_principles_2021`, `dixon_independence_2007`, `ancker_effects_2017`
and `paleyes_challenges_2022` — **the four papers added in the corpus round, and
four of the thirteen doing the heaviest argumentative load**. Their verification
rests on NotebookLM abstracts plus one primary-source fetch and cannot currently
be re-checked offline. This is the most fixable item in this sub-section: fetch
four PDFs.

**T8 (every factual claim checked against source text) is recorded CLOSED** after
two passes on 2026-08-03 covering all keys, which found five errors in total
(Ancker, ProActor, Chae, M5 in the first ~30; Hertel in the remaining ~60). The
closure is recorded against 90 keys; the remote today has 86. **T13 is a
different matter: it was recorded CLOSED on 2026-08-03 and the unrecorded
condensation reopened it** — the 250-word consolidated limitations inventory is
gone from the remote, replaced by a three-limitation sentence, and the scope
paragraph that carried the estate description and the author-as-rater threat is
gone entirely. See 3.3.

**Bibliography.** Both `ref.bib` and `ref_additions.bib` are present on the
remote, confirming the two-resource approach shipped. `ref.bib`'s entry count
could not be checked — it is ~190 KB and `read_file` returns whole files only,
which `PRJ93_RULES.md` token discipline puts out of reach; the methodology
header records 111 entries as of 2026-07-25 against
`litreview_corpus_judgement.md`'s 114. **Two hygiene items are still open**,
because both require editing `ref.bib` itself and the corpus round deliberately
used a second bib resource to avoid round-tripping that file through a
whole-file MCP write:
`noauthor_full_nodate` (malformed, uncited, would compile as "[n.d.]") and
`ding_proactor_2026` (typed `@article` with no `journaltitle`, so it renders as a
journal article with no venue while being cited as a substantive result — and it
is now known to be **published at ACL 2026, Vol. 1 Long Papers, pp. 18257–18303**,
so the retype is a factual correction, not cosmetics).

**Figures — largely done, one orphan left.** The ledger's outstanding manual step
has been taken: `figures/gap_map.pdf` **exists on the remote**, the chapter
carries exactly one `\includegraphics` and one `\ref{fig:gap-map}`, and
`hln_correction.pdf` has been deleted. One item remains: **`sbc_plane.pdf` is
still sitting at the project root**, unreferenced by any chapter — a dead file
that should be deleted. No build risk (nothing includes it), purely tidiness
before submission.

**A methodological note worth carrying into the viva.** Across three sessions,
NotebookLM's *first* answer on a specific numeric or attributive claim was wrong
or NOT-IN-SOURCES on claims Zotero full text then confirmed verbatim — six such
cases in one pass alone. It also retracted two wrong answers when pushed for
verbatim text. **Zotero full text is the authority; NotebookLM is a search
index.** Two of the five citation errors found in the T8 passes would have been
missed had the notebook's first answer been accepted.

---

## 4. Methodology trajectory

### 4.1 Modelling methods

Verdicts are: **adopted**, **upgraded**, **corrected**, **discarded**. Every row
carries the trigger that forced the change — the trajectory is the evidence of
method, not an apology for it.

| Method | Verdict | Trigger | Replacement / outcome | Evidence |
|---|---|---|---|---|
| Seven-rung ladder (R0 seasonal-naive → R4 foundation) | **Adopted**; selection procedure **corrected twice** | (a) served model chosen by bare argmin of a 6-fold mean, no dispersion (W5); (b) all selection rested on 42 adjacent spring days (W8) | Fold count 6 → 273/260/205 rolling origins. **Six folds ranked the served Beer Hall model fifth; 273 origins restored it to first** | `00_state_brief.md:61,64,152-155`; `models/ladder.py:284-302` |
| Rung-4 foundation model (Chronos-2) | **Adopted**; its adoption *criterion* **corrected — it had never been implemented** | G17o audit found `lovo.py._foundation_adoption` returned an instruction string with no `beats_global_gbm` key; the committed PASS was contingent only on torch being absent | Criterion implemented (zero-shot Chronos-2 vs global GBM, paired within fold, rolling MASE h=7). ADOPTED: BH 0.643 vs 0.760, TRT 0.595 vs 0.811, both CIs exclude 0 | `phase_state.md:1069-1072,1103-1134` |
| Foundation-rung evidence window | **Upgraded** 6 → 24 folds | Zero-width CIs at 6 folds (`mcs.BLOCK_LEN`=7 > 6 folds ⇒ one admissible bootstrap block) | **Overturned a published finding**: BH 1.180 ("worse than seasonal-naive") became 0.643; the caveat was withdrawn. `_dispersion` now returns `insufficient` at or below block length | `phase_state.md:1118-1123,1146-1152` |
| Group ICL / cross-series in-context learning | **Corrected, then discarded — published as a negative result** | Chronos-2 was called with `id="l1"`, a group of size one, switching off the model's defining group-attention by one string literal (W18) | Run properly, cross-series learning does not help this estate. Kept as a negative. Group-plus-covariates variant deferred (`FLAG-GROUP-EXO`) | `00_state_brief.md:74,158`; `FLAGS.md:1027-1046` |
| — latent hazard found beneath it | **Corrected** | `cross_learning=True` makes *the batch* the cross-learning group; an oversized batch merged origins and moved numbers by £45 | Without the catch, the negative result would have been a **false positive**. Recorded as a "load-bearing discovery" | `00_state_brief.md:109` |
| Multi-venue transfer / LOVO | **Corrected three times; claim withdrawn** | (1) used by no served model, gate wording not pre-registered (W14); (2) scored Ellel on MASE and pooled all three venues, violating G2 twice; (3) hard-coded `calendar_lag7` where the estate rules `calendar_lag7_active` | Ellel on unscaled MAE, pool = 2 scaled venues. BH transfer moved 0.872 → **1.242 (CI across 1.0)**. Pooled −0.072 MASE, 90% CI [−0.295, +0.154], MCS retains both. Verdict **NOT EVALUABLE**. The majority-win test was deleted and replaced by four behaviour tests | `phase_state.md:949-951,1080-1097` |
| MASE as the metric ruler | **Corrected** (four rulers → one) | Examiner Fatal 1: July MASE 0.386 used a different seasonal-naive denominator from the backtest it claimed to beat; four private denominators span 0.836/0.399/0.597/0.672 | Collapsed to one denominator with a required `basis` field. 0.772 vs 0.745 on the common ruler. **It is now forbidden to claim the July forecast beat its backtest** | `00_state_brief.md:57-58,190-191`; `FLAGS.md:853-923` |
| RMSSE as headline metric | **NOT adopted — open gate G1** | Examiner Fatal 3: MASE optimises the median; Ellel's median day is £0 on an 82%-zero series, so a flatline is rewarded (July £56 forecast vs £445 actual, MASE 0.07) | Still MASE. Live human gate, due before Phase B closes | `00_state_brief.md:59,173` |
| Ellel scale basis | **Discarded scaled error entirely → unscaled MAE** (G2 CLOSED, supervisor decision) | At 1.21 trading days/week no MASE scale is defensible; four bases give bootstrap widths 52.5 / 45.2 / 42.2 / 65.6%, and trading bases induce a spurious ~0.09 | Unscaled MAE per Chatfield & Hayya (2007), enforced via `config.VENUE_SCALE_BASIS` / `VENUE_LOSS` / `is_scaled_venue` | `00_state_brief.md:105`; `phase_state.md:907-914` |
| Ladder scoring basis | **Upgraded** `calendar_lag7` → `calendar_lag7_active` | G2 enforcement, plus the discovery that `refresh.py` had `metrics.get("MASE", inf)` — for an MAE venue that compares inf to inf and adopts nothing | Magnitudes move (BH 1.267→1.021, TRT 0.597→0.524, Ellel →£74.141) but **served-model selection is identical at all three venues** — verified before anything changed | `phase_state.md:1154-1163` |
| Frozen `tab:ladder` table | **Deliberately NOT re-run; caption corrected instead** | Aligned code produces TRT ETS 0.524 vs the committed 0.597, and the table is the decision under audit | Caption now states its historical basis. Ordering and served model verified identical under all three bases. **Not claimed**: that rung-4 magnitudes reproduce to the digit (BH exo 0.755 here vs 0.745 committed) | `phase_state.md:936-939,1167-1196` |
| Intermittency (Croston / SBA) | **Discarded at L3** (lost to DOW median); **narrowed at L1**; constants **corrected** | Cutoffs used SBC's arithmetic errors (ADI≥1.32, CV²≥0.49) rather than Kostenko & Hyndman's (4/3, 0.5) — Beer Hall's ADI 1.3256 falls **between the two** (W23) | Corrected constants adopted. Occurrence gate does not help BH; **Ellel blocked on the booking diary**. No hurdle / two-part / zero-inflated model exists | `00_state_brief.md:73,79,126`; `phase_state.md:820` |
| Intermittent-estimator adoption rule | **Upgraded**: bare inequality → one-standard-error rule (Breiman et al. 1984), **pre-registered** | One node adopted on a 0.21% validation margin (1.418 vs 1.421) and was then **96% worse on test** (1.749 vs 0.891), costing 8–9pp item coverage | Spec committed at `1b649dc` **before any implementing code**; the recorded prediction ("it rejects") held — criterion +0.026, **0 of 16 nodes adopt** | `ledger/prereg_adoption_margin_2026-08-01.md:1-182` |
| Split conformal / interval calibration | **Corrected — the bands were not split-conformal at all** | G17k M2 (HIGH): A6's node bands scored the DOW median against the span it was fitted on — an in-sample residual quantile with no coverage guarantee | Four disjoint spans (fit / validation / calibration / test); the same fit produces calibration scores and test forecasts; WLS_v weights moved off in-sample residuals; conformal clamp made countable | `phase_state.md:810-821` |
| Reported coverage direction | **Corrected — the published direction was half wrong** | Regeneration under the M1/M4 fix | Category coverage **rises** 77.6 → 85.1 at nominal 90; only item coverage falls 77.6 → 72.1. Asymmetry because the in-sample quantile spans 343 days vs a 56-day calibration block | `phase_state.md:826-831` |
| Headline "coverage 1.00 vs 0.90 nominal" | **Withdrawn** — and a real defect found in its place | 1.00 on 7 points is 7 coin flips, not miscalibration (W13) | Withdrawn. Instead: **Beer Hall under-covers at 0.871 on ~1,750 pairs, 3.6 SEs low, at every horizon step**, identically on the served exo model — a property of the band, not the forecaster. `FLAG-BAND-UNDERCOVERAGE-BH` **OPEN** | `00_state_brief.md:69,107,161`; `FLAGS.md:745-769` |
| Adaptive conformal (ACI / AgACI) | **Discarded — negative result, kept** | At the one real regime change, coverage collapses to ~half nominal: static 0.529, ACI 0.412–0.471 | Adaptive conformal is **worse than static** here. The lit review's conformal arc was rewritten toward this finding | `00_state_brief.md:85`; `eval/aci_closure_probe.md` |
| Per-step conformal | **Discarded for now — logged as a research work package** | Pooled 90% band gives 100 / 96.2 / 84.6 / 88.5 / **80.8**% at steps 1/7/14/21/30 | `horizon_days` **capped at 7**. Per-step calibration was measured but adopting it mid-integration would breach gate discipline | `CONTRACT.md:218-238`; `FLAGS.md:745-769` |
| ECE / reliability diagram / temperature scaling | **Promised, never built** | The lit review ends on Guo et al. and ECE as the loop-closing guarantee; no ECE exists anywhere in the codebase (W10 / W26) | Gate G3: run it, or amend the promise | `00_state_brief.md:66,171` |
| Hierarchical reconciliation (MinT → WLS_v) | **Adopted**; **renamed**; a top-preservation error **self-caught** | MinT 0.662 vs disaggregation 0.734 at G12.13. Then G17k M5: the diagonal reconciler was misnamed MinT | Renamed **WLS_v** throughout, per Wickramasuriya et al.'s own convention; the persisted DB key `mint_dowmedian` deliberately left alone | `00_state_brief.md:133-134`; `phase_state.md:818-819` |
| Change-point detection (CUSUM production, BOCPD benchmark) | **Adopted**; a behavioural defect found and left open | ARL0 probe retained `CP_CUSUM_H = 5.0` | Refit fires on 61–63% of sustained shifts and, when it fires, **suppresses continuation alerts on the still-live shift in ~16% of cases**. `FLAG-CONTINUATION-ALERT-SUPPRESSION` OPEN. Lit review corrected: CUSUM had been absent entirely while BOCPD got full treatment; now grounded in Page (1954) | `00_state_brief.md:87,106`; `FLAGS.md:212-235` |
| Anomaly injection evaluation | **Withdrawn as an overclaim, then re-measured and reinstated** | The 644-injection eval perturbs the residual z stream, not revenue, holding `expected` fixed, so the forecaster cannot adapt by construction (W9) | Realism discount measured at **zero**; the published 0.996 recall stands. `FLAG-INJECTION-REALISM-DISCOUNT` CLOSED | `00_state_brief.md:65,162`; `FLAGS.md:1073-1086` |
| Detection metric (VUS-PR vs point-adjusted F1) | **Promised, partly delivered — still open** | The chapter commits to a lag-tolerant VUS-PR-style metric and rejects point-adjusted F1; Report 11 recorded "not computed, dependency unavailable" (W25) | Later computed via pinned TSB-AD 1.5 + statsforecast cross-check. `requirements-eval.txt` was **never resolvable** (pinned `vus>=1.0`; PyPI tops out at 0.0.6) — corrected; no number moves. W25 still open | `00_state_brief.md:81,127`; `phase_state.md:977-983` |
| Weather / exogenous covariates | **Corrected**, then **downgraded to marginal**; a "covariates HELP" overclaim still open | Trained and backtested on `hindcast` while `config.py` asserted it "matches serving"; `fetch_leadmatched` implemented and unused (W11). Separately, `chronos2_covariate_probe.md` concludes "covariates HELP" on 3 folds better / 3 worse, mean delta −0.014 against per-fold SD ~0.20, sign test **p=1.0** (W37) | **No serving optimism found**; weather is marginal. Ellel's nine-day June gap fixed. Exo widened to 15 covariates. W37 remains open | `00_state_brief.md:67,93,130,160`; `FLAGS.md:128-195` |
| Weather sourcing | **Discarded compute-side fetch → caller-supplied** | Building it refuted the recommendation: compute's store is a per-request scratch DB, so "one outbound call" is really one Open-Meteo round trip per venue per request against a rate-limited API | Weather is now a **caller obligation**, hindcast basis | `CONTRACT.md:155-176` |
| Ingest completeness | **Corrected** | An incremental build accepted a short HTTP 200 with no completeness check and stepped the watermark past an interior hole ⇒ nine-day Ellel weather gap, fourteen missing folds | Fixed under S6 | `00_state_brief.md:108` |
| Model comparison procedure | **Upgraded** — MCS adopted; Diebold–Mariano declared **uncomputable** | Bare argmin (W5); and at n=6, h=7 the Harvey–Leybourne–Newbold factor is exactly zero, so **no DM variant is computable at all** (W6) | Model Confidence Set: every served model retained in its 90% set (BH 5/9 p=1.000, TRT 4/9 p=1.000, Ellel 5/9 p=0.575). The HLN degeneracy is to be **stated openly, not worked around** | `00_state_brief.md:61-62,154` |
| Agent evaluation + LLM judge | **Built, never run — the project's Fatal 2** | No LLM exists in the served system; the only Anthropic import is `eval/judge.py`, never run, no key, zero kappa; surfacing is six hard-coded constants (W4) | Agent built with prompt frozen at `c8fa127`, offline evaluator, swept cost-ratio threshold. S8b blocked on Ryan's key | `00_state_brief.md:60,158,169` |
| Ask-F1 / HiL-Bench cost sweep | **Degenerate — open** | The sweep has zero misses and a flat cost of 8.0 at every ratio 1:1 to 10:1 (W27) | It measures nothing | `00_state_brief.md:83` |
| "Rhythm as agent memory" | **Claim refuted by its own code — open** | The self-declared central conceptual move (Park's memory stream, Hu's self-evolving state) is in fact "a recency multiplier with a floor of 0.5" (W28) | No memory stream, no reflection, no retrieval | `00_state_brief.md:84` |
| Chat-log / KB-gap signal | **Adopted** (S11) | `signals/chatlog_kb_gap.py` was never imported by the briefing, so the brief's own fryer-reset example surfaced to no one on a 735-message committed log (W12) | Wired as the fifth briefing source (`sop`). Two of four learning domains now live | `00_state_brief.md:68,163-164` |
| Dependency pinning / reproducibility | **Corrected** | All `>=`, no lockfile, Chronos-2 pinned by model id not revision SHA — the selection was unverifiable (W7) | Pinned. Four-venv layout built; `.venv-forecast` (torch 2.12.1, chronos 2.3.1) makes rung 4 runnable for the first time; 614 tests, 0 failures across three venvs | `00_state_brief.md:63`; `phase_state.md:968-983` |
| Artefact provenance discipline | **Corrected — a whole class of results was test output** | 23 modules resolved output paths from `STORE_DIR.parent`, so **a `pytest` run overwrote committed artefacts in the working tree** | `config.REPORT_ROOT` separated from `STORE_DIR` across 30 call sites. The committed "quiet day, 0 items" briefing was test output; the true artefact has 11 continuing items. `signals/weather_diagnostic.py` had been crashing since report 54 unnoticed | `phase_state.md:849-855,996-1019` |

### 4.2 Research-process methodology (the AutoResearchClaw distillation)

The project adopted a *research process*, not just modelling methods. Source:
`brain/knowledge/01_autoresearchclaw_reference.md` (ARC repo distilled 2026-07-30
by six delegated subagents, each capped at 400 lines); applied through
`brain/knowledge/02_prj93_pipeline_spec.md`, approved 2026-07-30.

ARC's 23 stages were **dispositioned, not imported**: 5 dropped, 12 adapted, 6
kept, every drop with a reason (`02_prj93_pipeline_spec.md:29-53`).

| Adopted | How it is applied here | Evidence |
|---|---|---|
| The **immutable-harness** pattern — a file the generating model cannot edit, sole writer of the canonical results artefact | Became the project's hardest verification rule: trace every number to a result file, cite the path in a LaTeX comment beside the number | `01_autoresearchclaw_reference.md:184-194`; `PRJ93_RULES.md:31-34` |
| **Three independent role calls plus a synthesiser** (ARC stages 8/14) — and explicit **rejection** of ARC's stage-18 single-call multi-persona review | Roles A (methodologist), B (statistician), C (claim auditor). "Three independent calls plus a synthesiser; never one call producing three voices." Disagreements preserved, not flattened | `02_prj93_pipeline_spec.md:11-13,212-221` |
| **Evidence-bounding and statistical-honesty prompt rules** | Dispersion reported with every point estimate; MCS or DM wherever a comparison is claimed; no superiority claim without a test — reframe as comparable, or as a negative result | `02_prj93_pipeline_spec.md:168-172` |
| **Deterministic checks feeding the critique**, rather than hoping the model notices | Four-item verification vocabulary: Zotero key check, NotebookLM content check, released-code comparison (→ `code_vs_paper.md`), repo result-file trace | `02_prj93_pipeline_spec.md:15-20` |
| **Gate placement by leverage** | Nine gates G1–G9. G9 (every Overleaf push) is **unconditional** — explicitly because ARC's own `push_paper` does `git pull` then overwrites the remote with conflict strategy `"ours"` | `02_prj93_pipeline_spec.md:281-294` |
| **Rejected: ITERATIVE_REFINE (ARC stage 13)** | Dropped deliberately — "refit-until-better is p-hacking on a dissertation". Pre-registration by commit ordering is the project's strongest asset and the loop would retroactively invalidate it. Disappointing results go to stage 15 as negatives | `02_prj93_pipeline_spec.md:43,343-349` |
| **Rejected: graceful degradation on the quality stop** | "No graceful-degradation path: a failed HC item is a failed HC item" | `02_prj93_pipeline_spec.md:239-242` |
| **Practised, not merely specified** | The one-SE adoption rule was written and committed (`1b649dc`) **before any implementing code existed**, with its prediction recorded in advance — the same device as the agent prompt freeze at `c8fa127` | `ledger/prereg_adoption_margin_2026-08-01.md:1-24,93-113` |

Discarded from the ARC template with reasons on file: topic initialisation and
problem decomposition (fixed by the brief), hypothesis generation
(re-hypothesising five weeks from submission is scope creep), resource planning
(subsumed by the phase order), and iterative refinement (above).


---

## 5. Results and their verification status

### 5.0 Two things to state at the top

**a. The audit's scope is narrower than it looks.** `numbers_audit.md` does not
audit result files. It audits the **340 numeral-bearing claims in
`chapters/methodology.tex` and `chapters/results.tex`** — so a "verified"
verdict exists only for the subset of result-file numbers that a chapter
happened to quote. Roughly **31 of the ~215 catalogued values carry an explicit
audit verdict; ~184 carry none.** They are marked NOT AUDITED below rather than
given an invented one. This is a limitation of the audit, not evidence against
the numbers.

**b. Experiment gap closure has not run.** There is no artefact, gate, report or
code path by that name anywhere in the repository — an exhaustive search across
`brain/` and the repo root for `experiment gap`, `gap closure`,
`experiment-gap`, `gap-closure`, `experiment_gap` returns exactly one hit, and
it is a different thing: `02_prj93_pipeline_spec.md:69`, "Reading-gap closure",
a *literature* gap. The blocked-experiment set — **S8b** (live LLM, ~644 calls),
**S8c** (offline replay), **S9** (manager labels), the **Ellel booking diary**,
**G3/ECE**, and **round-5 adversarial review** — has not started. Phase C, whose
window opened 2026-08-04, is not moving.

**Precedence rule applied throughout** (`numbers_audit_resolutions.md:6-14`):
the per-script `.md`/`.json` beside the code is primary; `brain/log/NN_*.md`
narratives lose on disagreement.

### 5.1 L1 ladder — point accuracy

Rolling origin, expanding window, **6 folds**, h=7, MASE against in-sample
seasonal-naïve m=7. Baseline: rung0 seasonal-naïve + rung1 robust-DOW (the
gate). **No significance test, no MCS, no multiple-comparison handling at this
instrument** — these are bare 6-fold means, and the tables carry no dispersion
and no n column (`numbers_audit.md:783-784` counts this as the largest single
statistical-reporting failure: `tab:ladder`, 27 cells).

| Rung | Beer Hall | Ellel | Two River Taps | Audit verdict |
|---|---|---|---|---|
| rung0 seasonal-naive | 1.006 | 0.924 | 0.673 | NOT AUDITED |
| rung1 robust_dow | 1.029 | **0.572** ← served | 0.737 | Ellel MATCHES · `numbers_audit.md:499` |
| rung2 ets | 0.799 | 0.825 | **0.597** ← served | BH MATCHES `:484`; TRT MATCHES `:492,551,554` |
| rung2 stl | 1.125 | 0.629 | — | NOT AUDITED |
| rung3 gbm | 0.927 | 0.813 | — | NOT AUDITED |
| rung3 global_gbm | 0.920 | 0.936 | 0.728 | TRT MISMATCH → **resolved** (chapter printed `n/a`) · `:825-828` |
| rung4 chronos2 | 0.793 | 0.581 | 0.636 | NOT AUDITED |
| rung4 chronos2_exo | **0.745** ← served | 0.591 | 0.612 | BH MATCHES · `:489` |
| rung4 chronos_bolt | 0.796 | 0.601 | 0.612 | MATCHES · `numbers_audit_resolutions.md:296-300` |

Source: `brain/models/ladder_results_L1_{beer_hall,ellel,two_river_taps}.md`.
**Ellel gate met: False** (`ladder_results_L1_ellel.md:40`).

**Verification caveat that must be shown, not hidden.** These files are
**frozen by design** and were deliberately not regenerated in the 2026-08-01
staleness sweep (`log/57_G17m:19-41`). `ladder.evaluate_rolling` was
subsequently corrected to read `config.VENUE_SCALE_BASIS`, so the committed
tables carry `calendar_lag7`-based MASE while `lovo.py` now uses
`calendar_lag7_active`. Report 59 verifies **ordering is invariant across all
three rulers** and that 0.799 / 0.572 / 0.597 match `tab:ladder` exactly — so
the *selection* is unaffected, but ~90 of the values are basis-dependent. The
caption now states this. This is the correct handling of a frozen decision
artefact under audit, and should be presented that way.

Spillover check: permutation importance of `is_ellel_event` in the Beer Hall
Rung-3 GBM, 10 repeats, held-out fold = **−0.0459, rank 22 of 22**
(`ladder_results_L1_beer_hall.md:43`).

Environment robustness: sklearn 1.9.0 vs 1.8.0, TRT ETS/GBM 0.597/0.602 vs
0.597/0.601 — **no flip**, refuting the examiner's claimed instability
(`numbers_audit.md:102,551-556,695`, MATCHES).

### 5.2 Model Confidence Set — the multiple-comparison correction

Instrument `eval/mcs_L1_results.json`. Pre-registered in `log/44_G17c §4a`: B,
block length 7, seed 93, elimination rule, all fixed before the sets were
computed. **The MCS is the multiple-comparison handling** over the nine rungs —
and `numbers_audit.md:925-928` records that the chapter never says so, nor
states B/block/seed. That is a writing defect, not a methodological one.

| Result | Value | Source | Verdict |
|---|---|---|---|
| Served model retained in its 90% set | BH 5/9 p=1.000 · TRT 4/9 p=1.000 · Ellel 5/9 p=0.575 | `eval/mcs_L1_results.json` | Ellel: 0.575 is the 246-fold `common_fold` value; the 260-fold row is **0.579** — MISMATCH → resolved · `numbers_audit.md:841-842` |
| `rung1_robust_dow` MCS p at 273 origins | **0.11** — in the 90% set, eliminated only at α=0.25 | `log/44_G17c:183` | **MISMATCH, conclusion-level** — the chapter said "273 origins reject" · `:809-815` |
| BH rung ordering at 6 folds | robust_dow 1.267, **chronos2_exo 1.312 (rank 2, gap 0.045)**, then 1.368 … 1.773 | `log/43_G17b:127` | **MISMATCH, conclusion-level** — "fifth of nine" is **second of nine** · `:794-807` |
| `robust_dow` rank at 273 origins | 0.803, **fifth** | `log/43_G17b` | resolved `resolutions.md:229-232` |
| Marginal se of BH rung means | ~0.029 (range 0.027–0.032) | `log/43_G17b:116-124` | MATCHES · `:541` |
| Paired vs independent sd ratio | 0.06–0.45; paired se 0.004–0.016 vs marginal ~0.029 (3–10×) | `log/44_G17c:161-172` | MATCHES qualitatively · `:302` |
| G1 secondary loss (RMSSE vs MASE) at α=0.10 | Agree everywhere; served-model RMSSE p = 0.991 / 0.201 / 0.956 / 0.837 | `resolutions.md:383-387` | Ledger-internal; no separate artefact |
| G1 **disagreement** at α=0.25, TRT n=205 | MASE: ets 0.6478 (1st) · RMSSE: **chronos2 0.4817 (1st)**, ets 0.5139 (4th) | `resolutions.md:393-398` | **OPEN condition, recorded not resolved** · `:402` |

The "second of nine, not fifth" correction is worth foregrounding: the
project's own audit caught and reversed a headline claim **against its own
interest**, and then pushed the correction to Overleaf
(`overleaf_incident_2026-07-31.md:76-84`).

### 5.3 Interval calibration — five arms (S7 G17h)

Scoring: **mean Winkler** at primary level 0.90; **marginal coverage with
Clopper–Pearson 95% intervals**; **90% MCS (p ≥ 0.10) over five arms**; paired
**moving-block bootstrap, block 7, B = 10 000, seed 93** (bootstrap seed 94),
incumbent D. Arms: P plain pooled split conformal · **D Mondrian (served)** ·
S per-step · A per-step ACI (Gibbs–Candès) · G per-step AgACI (Zaffran, BOA
aggregation, no tuned rate).

| Venue | n | Coverage (arm D) | CP95 | Winkler P / D / S / A / G | 90% MCS set |
|---|---|---|---|---|---|
| Beer Hall | 1750 | **0.871** | [0.855, 0.887] | 1939.7 / **1807.0** / 1928.1 / 1814.3 / 1836.6 | all five (75% set {D,A,G}) |
| Ellel | 1659 | 0.914 | [0.899, 0.927] | 1435.3 / **1262.5** / 1367.2 / 1422.4 / 1479.6 | **{D} alone** |
| Two River Taps | 1274 | 0.963 | [0.951, 0.973] | 654.2 / **646.4** / 670.3 / 671.2 / 692.6 | all five |

`brain/eval/interval_calibration.md:24-29,52-56,79-83`; MCS
`eval/interval_calibration_mcs.json`. **Adoption candidates: none at any
venue.** Coverage MATCHES at all three (`numbers_audit.md:618,621,624,626,644`);
the Ellel and TRT CP cells carried prose instead of the interval — a **split
verdict**, number right, descriptor wrong (`:853-855`).

Paired bootstrap, Beer Hall: P−D **+132.7 [+30.3, +241.9]**; D−S **−121.1
[−216.1, −28.9]**; D−A −7.3 [−153.1, +136.6]; D−G −29.7 [−164.8, +96.2]. The
last two straddle zero and the chapter never says so (`:931-934`). Ellel: all
four exclude zero. TRT: P−D +7.8 [−4.0, +14.6] only; the other three exclude
zero.

Per-step, Beer Hall, arm D at level 0.90 (from
`eval/interval_calibration_L1.json`): coverage 0.852 / 0.864 / 0.876 / 0.884 /
0.880 / 0.876 / 0.868 at steps 1–7, n=250 each — **under-covering at every
step**, not at one. Per-state: 0.884 (n=1250) vs 0.840 (n=500). Arm S
half-widths 505, 515, 498, 486, 482, 482, 504 → range **482–515** (chapter said
"490 to 515": MISMATCH → resolved, `:849-850`).

Angelopoulos–Bates finite-sample bounds: 0.9005 / 0.9006 / **0.9007** for
n_calib 1883 / 1792 / 1407 — one bound had been printed for three sizes
(MISMATCH → resolved, `:856-857`).

**The withdrawn headline, and what replaced it.** The published "coverage 1.00
vs 0.90 nominal" was withdrawn: at n=7, P(all 7 inside | calibrated) =
**0.4783**, CP95 **[0.590, 1.000]**, `supports_miscalibration: false`
(`eval/interval_calibration_power.json`). In its place the audit found a real
defect — Beer Hall under-covers at 0.871 on ~1,750 pairs. **The "3.6 standard
errors" figure recomputes correctly (3.62) from 0.871 and n=1750, but no z is
stated in any report — UNTRACEABLE** (`numbers_audit.md:627`). **And "measured
with power" has no power calculation behind it** — no α, no effect size, no MDE,
no 1−β, no sample-size justification (`resolutions.md:148-160`). UNTRACEABLE and
OPEN (`:929-930`).

### 5.4 A5 bands, A6 reconciliation, and the rest

**A5 conformal bands** (per venue, pooled held-out; gate = ±3.0pp two-sided on
the Mondrian band; regenerated 2026-08-01):

| Venue | n | plain@80 | **mondrian@80** | plain@90 | mondrian@90 | Gate |
|---|---|---|---|---|---|---|
| Beer Hall | 209 | 78.0% | **75.1%** | 88.5% | 87.6% | **FAIL** |
| Ellel | 196 | 80.1% | 82.1% | 93.9% | 92.3% | pass |
| Two River Taps | 141 | 80.9% | 83.0% | 95.0% | 95.7% (over-covers) | pass |

`brain/conformal/conformal_L1_*.md`. BH widths / Winkler / pinball across the
four cells: 672·1687·84 / 660·1538·77 / 1315·2332·58 / 1018·1950·49. Conformal
clamp countable and **0 of 60 (BH) / 0 of 56 (Ellel) / 0 of 42 (TRT)** at both
levels (`code_vs_paper.md:48`, M7 closure). The BH gate FAIL was **found by
accident** during a provenance audit — the artefact had never been regenerated
after the warehouse restore, and the gate flipped 78.5 → 75.1
(`code_vs_paper.md:1124-1131`). None of these figures appears in any chapter, so
none carries an audit verdict.

**A6 hierarchical reconciliation** (Beer Hall only; WLS_v, Wickramasuriya 2019
Eq. 11 diagonal W; 41 nodes, 32 bottom): max venue and category coherence
discrepancy **0.00e+00** both. L2 category coverage **65.8% @80 / 85.1% @90**;
L3 top-item **60.0% / 72.1%**. Intermittent-estimator adoptions **0 of 16**
under the pre-registered one-SE margin — the Lager-BH criterion is **+0.026**
(positive ⇒ refused), where the naïve rule would have adopted on a 0.21%
validation margin (1.421 vs 1.418) and then been 96% worse on test (0.891 vs
1.749). `brain/hierarchy/reconciliation_forecast.md:11-13,21-22,28,32`;
pre-registration `ledger/prereg_adoption_margin_2026-08-01.md`. All NOT AUDITED.

**Group ICL** (S5): reproduction of the committed ladder is exact — BH 0.7342 vs
0.7342, Ellel 0.6023 vs 0.6023, TRT 0.6709 vs 0.6709, **max Δ 0.0000**. Arms
U / G2 / G3 at BH (n=260, `calendar_lag7_active`): **0.6091** / 0.6166 / 0.6185,
MCS p 1.000 / 0.129 / 0.129, all three retained (MATCHES, `:410`). TRT (n=203):
U **0.6263** vs G3 0.6406, p 1.000 / 0.035, **90% set {U} only**. Ellel on
unscaled MAE: 110.85 / 110.53 / 110.21, all retained. Paired bootstrap BH U−G2
−0.0075 [−0.0153, −0.0009]. `brain/eval/group_icl.md`.

**Weather / exogenous ablation** (S6, arms N/O/H/F/M, horizon model
`ecmwf_ifs025`, seed 93, 90% MCS + paired moving-block bootstrap block 7
B=10 000): BH n=273 → 0.6005 / 0.5865 / 0.5862 / 0.5860 / **0.5842**, all five in
the 90% set. **The only pairwise CI excluding zero is N−M, +0.0163 [+0.0004,
+0.0337]** — and the chapter omitted both the lower bound and the multiplicity
caveat. **Ten pairwise comparisons per venue, uncorrected for multiplicity**
(`numbers_audit.md:921-924`). Spread across the four weather bases is 0.0023,
i.e. the on/off effect is 7.1× the choice-of-basis effect. Weather coverage is
complete: 399/399, 392/392, 331/331 across L1–L7.

**Feature ablation A14** (Rung-3 GBM, 39 disjoint folds; ship rule = the 90% MCS
must exclude the baseline AND coverage must not degrade >3pp): baseline GBM
**0.9551 / 87.9%**. Best candidate `weather (T+rain+sun)` 0.9120, Δ −0.0431
[−0.1243, +0.0243]. **Nothing ships** — the baseline is retained in the 90% set.
Forecast skill at 3-day lead, n=399: temperature MAE **0.86 °C**, precipitation
MAE **3.55 mm**. Served BH exogenous column count is **15** (chapter said
fourteen: MISMATCH → resolved, `:834-836`), and the ladder is **five rungs, nine
scored entrants** (chapter said "seven rungs": MISMATCH → resolved, `:837-839`).

**LOVO transfer** (regenerated 2026-08-01; per-venue 90% MCS + paired
moving-block bootstrap; per-venue ruler from `config.VENUE_SCALE_BASIS`):

| Venue | Blocks | Transfer | Naïve | Δ [90% CI] | MCS retains |
|---|---|---|---|---|---|
| Beer Hall | 55 | 1.242 MASE | 1.771 | −0.529 [−0.557, −0.496] | transfer |
| Two River Taps | 45 | 1.184 MASE | 0.700 | +0.486 [+0.442, +0.529] | naïve |
| Ellel | 53 | £282.002 MAE | £401.539 | −113.434 [−148.618, −91.282] | transfer |
| **Pooled (2 scaled venues)** | 100 | — | — | **−0.072 MASE [−0.295, +0.154]** | both |

Crossover: transfer wins 1 of 2 at 14 days, 0 of 2 at 21 / 28 / 42 / 56.
**Gate verdict: transfer clause NOT EVALUABLE** (a majority test needs three
scaled venues; the estate has two); **foundation clause PASS (adopted)** — BH
chronos 0.643 vs global GBM 0.760, Δ −0.117 [−0.139, −0.073]; TRT 0.595 vs
0.811, Δ −0.216 [−0.361, −0.158], both over 24 folds. Overall **NOT EVALUABLE**.
`brain/transfer/transfer_results.md:11-13,21,24-30,42-43,49-54`. Runtime
identity stamped: `.venv-forecast`, Python 3.12.13, Darwin arm64, device **mps**,
numpy 2.5.1 / pandas 3.0.3 / sklearn 1.9.0 / statsmodels 0.14.6 / duckdb 1.5.4 /
torch 2.12.1 / chronos-forecasting 2.3.1, ceiling 2026-07-07. **Nothing about
LOVO appears in either chapter.**

**Change-point detection**: empirical ARL₀ **> 400 at every h ∈ {3,4,5,6,8,10}**
(right-censored at the 400-day simulation horizon); shipped h=5.0, k=0.5. TRT
ground-truth break onset 2026-05-08 → detected 2026-05-16, **delay 8
trading-days**, detector `both`. Injection δ=0.5: 64% / 46% / 36% detect at
h=4/5/6, mean delay 62.4 / 77.8 / 73.5 days; δ=1.0: 100% at all h, delay 7.8 /
9.6 / 11.4; δ=2.0: 100%, delay 2.1 / 2.8 / 3.6. **False pre-onset rate 0.00 at
every setting.** BOCPD max P(changepoint) on BH is only **0.02**.
`brain/eval/change_point_eval.md:8-35,45`.

**Detection battery** (N=644, Wilson 95% CIs) — **no paired `.md` result
artefact exists**; only `eval/injection_realism.json` and the narrative
`log/PRJ93_Agent_Eval_Report.md`. Overall recall **0.804 [0.77, 0.83]**,
precision 0.871, F1 0.836. By kind: exo_coincident (84) recall 1.000
[0.96, 1.00]; **regime_shift (252) 0.996 [0.98, 1.00]**; spike (288) **0.566
[0.51, 0.62]**; stock_drawdown (20) 1.000 [0.84, 1.00]. By venue: BH 0.815 /
Ellel 0.639 / TRT 0.813. Near-threshold (z=1) spike catch **0.375 [0.21, 0.57]**
at BH. Latency: large |z|>2 median 2d IQR[1,3]; near-threshold median **6d
[3,11]**, max 21. Ranking on 7 multi-event days: NDCG **1.000**, Spearman
**1.000**. Alert fatigue: false-alarm upper bound **0.667/week**; 126 misses vs
8 false alarms; cost **134.0 / 260.0 / 638.0 / 1268.0** at 1:1 / 2:1 / 5:1 /
10:1 — note this **contradicts** the examiner's W27 charge of "a flat cost of
8.0 at every ratio"; do not repeat W27 without re-checking. **VUS-PR: not
computed** (TSB-AD dependency unavailable). The paired realism comparison is a
**stratified subsample n=120, seed 95, Ellel excluded** — not the full 644,
which the chapter previously implied.

**Chat-log signal**: 359 assistant replies / 68 unproduceable / **18.9%**, equal
to the configured `CHATLOG_FAILURE_BASELINE = 0.189` (MATCHES,
`:184,679,743`) — and independently reproduced from the raw CSV in §2.2c.
Rolling-7-day max **88.9%**. Top gap cluster size 5, 3 failed, density 0.6,
score 1.8. Corpus is **735 total / 376 staff-authored / 359 assistant** — the
chapter had said "735 staff" (MISMATCH → resolved, `:843-844`). The non-gap
cluster densities were a MISMATCH **overturned in the chapter's favour**
(`:981-984`).

### 5.5 The validation limitation, stated plainly

**Every result above rests on the corpus I assembled, not on the research schema
the brief specified. External validity against the host's production data is
untested.** Three consequences:

1. Every forecast, band, change point and detection figure is computed over
   `brain/store/brain.duckdb`, built by me from CSV exports and Square MCP pulls
   (§2). **No number in this project has ever been produced from a provisioned
   host database.**
2. The held-out windows (June 2026, 1–7 July, 8–14 July) are genuinely
   out-of-sample and genuinely pre-registered by commit ordering — but
   out-of-sample **within my corpus**, and at a coarser grain than the training
   data (§2.2a).
3. The interface through which the host would actually call the brain has never
   been exercised (§2.4). Twelve caller obligations are asserted, not verified.

**None of this is presented as settled.** The provisional numbers above are
provisional. The audit trail — 340 claims checked, 17 mismatches found (4
conclusion-changing), two Fatals closed, two headline claims withdrawn by the
project against its own interest — **is itself the evidence of rigour** and
should be shown as such, not apologised for.

**One finding to put in front of a supervisor unprompted**
(`numbers_audit.md:876-878`): across G15 → G16 → G17a–j, **not one superseded
figure survived into either chapter**. The defect class most likely to be found
was absent. The defects that were found sit in the prose *about* the numbers,
and the remedy is described as "almost entirely transcription" of intervals that
already exist in committed files (`:940-942`).

---

## 6. Writing state

### 6.1 Per chapter

| Chapter | State | Words | Evidence |
|---|---|---|---|
| Front matter (title, declaration, abstract, acknowledgements, publications) | On Overleaf; completeness never assessed | unknown | `00_state_brief.md:15-17` |
| Introduction | On Overleaf; "completeness not stated in docs" | unknown | `00_state_brief.md:22` |
| **Literature review** | **Closed and verified.** Pushed 2026-08-03, byte-identical readback, 67,389 bytes, sha256 `4e6e6218…85417` | **9,844** (`wc -w`); ledger records 9,553 then 9,449 | `log/HANDOFF_2026-08-03_litreview.md:10-14` |
| — condensed variant | **Unrecorded.** `literature_review_condensed.tex` written 2026-08-04 17:02; drops 3 `\citeauthor` uses; no ledger, handoff or phase-state entry mentions it | 7,481 | `brain/drafts/literature_review_condensed.tex` |
| Methodology | On Overleaf, **partial**. Local `chapters/methodology.tex` deleted from working tree (uncommitted; still in HEAD at 3,212 w / 270 lines) | 3,212 (stale fork) | `00_state_brief.md:24`; `git ls-tree HEAD chapters/` |
| Results | On Overleaf, **partial** (758–840 lines / 22 headings). Local copy is a stale fork, also deleted from the working tree | 2,948 (stale fork) | `00_state_brief.md:25` |
| **Discussion** | **DOES NOT EXIST** | 0 | `00_state_brief.md:26`; examiner W45 |
| Conclusion | On Overleaf; completeness unstated | unknown | `00_state_brief.md:27` |

The three deleted files (`methodology.tex`, `results.tex`, `ref.bib`) were
removed from the working tree and **never committed** —
`git checkout HEAD -- chapters/` recovers them. Nothing in any ledger records
the deletion. They are the stranded repo fork the examiner's W44 described,
superseded by the Overleaf copies, but the two-sources-of-truth question (W47)
deserves a decision rather than a stray `rm`.

**Overleaf incident (2026-07-31) — CLOSED.** `write_section` on a `\section`
silently deleted five nested subsections of `results.tex`; all five were
restored. `write_section` is now banned project-wide; reconstruct-and-write-whole
is the rule (`ledger/overleaf_incident_2026-07-31.md:27-31`). Two content
corrections rode along: `sec:res-demonstration` "second of nine" not fifth, and
`sec:res-suppression` rewritten to 39/64 sustained shifts + 15/24
exogenous-coincident.

### 6.2 What the critique loop changed in the literature review

Three-role loop (Methodologist / Statistician / Claim auditor — **separate calls
plus a synthesiser**, per §4.2), 2026-08-01/02. **36 findings, 27 blocking**
(`litreview_critique.md:38-55,61,74,86`). Twelve disputed claims were settled at
source rather than by adjudication. Five revisions:

- **Revision 2** (`:117-127`) — deleted both self-praise sentences and the
  pre-registration appeal; recounted preprints; recast Montero-Manso as the
  chapter's own conjecture, stated so it can fail; added the
  electricity-vs-hospitality channel disagreement; resolved the covariate
  contradiction; restated the rank claim as directionless; deleted the six-fold
  sentence; corrected the Hansen MCS statement; corrected Ancker to odds ratios;
  dropped a false uniqueness claim; added the no-ties condition; fixed the M5
  attribution; named metrics and denominators throughout; **added two contrary
  results the chapter had omitted**; added a scope paragraph naming the closed
  venue and the excluded fourth location.
- **Revision 3** (`:207-217`) — preprint accounting recounted mechanically from
  the file; the ECE abstention replaced by the plain fact that it is not
  computed; **the MASE-vs-RMSSE tension disclosed in `sec:rw-ruler` as a
  limitation of the work** — the chapter concedes its own argument runs against
  the metric its results chapter reports; argument-from-absence replaced by
  three positive checkable facts; Kostenko rewritten with the (p,v) geometry;
  under-coverage reattributed to expectation-vs-realisation; PRISM's figures
  corrected to percentage points; Schmidt downgraded to illustration.
- **Revision 4** (`:261-277`) — three *statistically wrong* statements
  corrected: proportionality → bound in both places, and the p>2 condition
  stated and distinguished from p>4/3. **Ask-F1 replaced by F_β with β fixed
  from the elicited cost ratio**, symmetry problem stated as the reason.
  Under-coverage rewritten to distinguish a short-window artefact from a
  multi-SE shortfall, naming Barber et al. as the frame. **Contribution sentence
  rewritten to describe a per-venue rhythm**, with pooling named as a hypothesis
  examined and not adopted. The Bregman clause was **dropped rather than
  cited**, because adding a source would have been an ungated citation addition.
- **Revision 5, style pass** (`:399-415`) — em dashes 48 → 0; "rather than"
  56 → 9; median sentence 30 → 25 words; sentences >45 words 58 → 31; <12 words
  38 → 53; 9,553 → 9,449 words; **90 of 90 citation keys preserved**.
- **Rejections that mattered** (`:129-134,219-224,279-295`) — the statistician's
  HLN "negative not zero" (arithmetically wrong), the Chatfield reversal (the
  abstract contradicts it), the claim that 4/3 is only an SBA constant; the
  methodologist's Lu per-intervention framing (the source defines the rate
  exactly that way) and the VUS-PR symmetry request; two claim-auditor findings
  that mis-located what they objected to. **Disagreements were preserved, not
  flattened** — the ARC rule in action.

**T8 verification, two passes on 2026-08-03, all 90 keys — five factual errors
found and fixed in the live chapter**: `ancker_effects_2017` (incident rate
ratios, not odds ratios; clinician-level, not alert-level);
`ding_proactor_2026` (published at ACL 2026 pp.18257-18303, not a preprint —
cutting the preprint count 12 → 11); `chae_value_2024` (**the chapter had the
conclusion backwards**; DL-beats-ML holds in the turbulent period only);
`makridakis_m5_2022` (77.3% ADI>4/3 matches nothing; product-store 90%,
all-series 77.9%); `hertel_explainable_2026` (3.55%/2.74% rounded to "4%/3%",
widening a 0.8-point gap to 1 point **in the direction that suited the
sentence**).

**Figures.** Both pedagogical figures (`sbc_plane`, `hln_correction`) were
**dropped** — each illustrated a formula the prose already states and said
nothing about the literature as a body. They were replaced by one synthetic
figure, `fig:gap-map`: nine surveyed systems on intervention policy × grounding
of the score, where **the empty top-right cell is the gap claim**. Its axes are
lifted verbatim from the chapter's own synthesis sentences, so the figure
asserts nothing the prose does not. Recorded lesson: T12 ("figures must be
referenced") is a whole-thesis rule that had been allowed to drive a
chapter-level question — two figures existed only to satisfy it.

**A methodological finding worth carrying to the deck**: NotebookLM was wrong or
returned NOT-IN-SOURCES on six claims that Zotero full text confirms verbatim,
for the third session running. **Zotero full text is the authority; NotebookLM
is a search index** (`phase_state.md`, 2026-08-03 entry).

### 6.3 Corpus add and drop decisions

`PRJ93_RULES.md:38-48` makes adding or dropping a cited paper a **human gate,
one question per decision, never batched**. The Step 1 corpus gate and the
Step 5 push gate were both approved (`litreview_critique.md:5-6,374`).

**Additions**

| Paper | Justification | Gate | Actioned |
|---|---|---|---|
| Montero-Manso & Hyndman 2021, IJF 37(4) | Globality is not a similarity assumption but a complexity trade whose payoff scales with group size — so **S5's null becomes a predicted outcome, not a disappointment**. Closes gap G-a; gives W54 a transfer-design citation. Refereed, improves the preprint ratio | Approved | **Yes** — Zotero `257UK8GY`, cited 4× |
| Dixon, Wickens & McCarley 2007, Human Factors 49(4) | Supplies the false-alarm/miss asymmetry the evaluation section asserts and Meyer does not establish; **repairs the OVERSTATED verdict on `meyer_conceptual_2004`** rather than papering over it. Caveat carried into the prose: n=32 undergraduates, synthetic task | Approved | **Yes** — Zotero `P4WGCXET`, cited 3× |
| Ancker et al. 2017, BMC MIDM 17:36 | Turns alert fatigue from an assertion into a measured quantity in a deployed setting. **Verified at primary source (PMC5387195), not NotebookLM** — five ingestion routes failed. Caveat: clinical domain, cited as a transferable mechanism | Approved | **Yes** — Zotero `LYYQFLFG`, cited 3× |
| Paleyes, Urma & Lawrence 2022, ACM CSUR 55(6) | Warrant for the "field instantiation" contribution category — the most direct answer to W24. **Narrowed by the notebook**, which refused the stronger claim; the chapter may claim only the narrow version | Approved | **Yes** — Zotero `BQPDVMEJ`, cited 2× |
| Wickens & Dixon 2007, TIES 8(3) | Would supply a 0.70 reliability crossover threshold. **NOT VERIFIED** — negative confirmed two independent ways (T&F HTTP 403 + Semantic Scholar empty); NotebookLM ingested only navigation chrome. The 0.70 figure is known only from search-engine snippets, so **not citable** | **Never put** | **No** — absent from `ref_additions.bib` and the chapter. Disposition unrecorded |

**Activations** — 12 keys already in `ref.bib`, promoted to citation:
`hewamalage_look_2021`, `haben_short_2019`, `hertel_explainable_2026`,
`kolassa_evaluating_2016`, `syntetos_categorization_2005`, `kostenko_note_2006`,
`chatfield_all-zero_2007`, `hansen_model_2011`, `diebold_comparing_1995` +
`harvey_testing_1997`, `cragg_statistical_1971` + `mullahy_specification_1986`,
`brigato_there_2025`, `tibshirani_conformal_2019` (optional). Highest value is
the **Hansen / DM / HLN trio**, because W36 names the absent
alternative-comparison as the explicit reason Distinction is not met and the
chapter contained no passage on comparing competing forecasts. Approved as part
of the Step 1 gate and actioned — key count went **75 → 90**.

**Demotions and drops** (`litreview_corpus_judgement.md:301-316`): five
foundation-model citations demoted to one grouped citation (they "fill out the
design space without changing the central premise"; this also fixes Moirai 1.0
cited unnamed); three proactive-agent citations grouped;
`schick_toolformer_2023` + `shinn_reflexion_2023` demoted while
`yao_react_2022` is kept; **`koutsandreas_selection_2022` dropped** in favour of
`kolassa_why_2020` (identical claim stated twice back to back; the audit found
Kolassa exact and it names the mean/median/(−1)-median trio);
`gim_evaluation_2023` demoted to a parenthesis; `truong_ruptures_2018` moved to
methodology as a software citation; a "TimesFM beats LM prompting" clause
deleted from a `tan_are_2024` passage because **Tan does not evaluate TimesFM**.
`hossain_comparative_2025` / `chae_value_2024` deliberately both kept — they
argue from opposite directions and the paragraph says so.

**Deliberate non-additions with reasons on file** (`:348-371`): no conformal
additions (that section is already the best-sourced; more would be padding);
**no sports-fixture or events literature** despite the 11 July England QF
falsification being the project's central result — searched, nothing close
enough to a three-venue rural estate, recorded as a deliberate non-addition; no
new weather paper (Badorf & Hoberg rejected — the papers W54 actually names are
already owned, and "acquisition alone does not close it"); no cull of the 27
uncited `ref.bib` entries.

**Net corpus effect** (`litreview_corpus_judgement.md:377-384`): 75 → ~86 cited
keys; **three governing citations acquired** (metric, selection, weather, all
✗→✓ — W54's core charge was that none was governed); negative results the review
anticipates went **0 of 3 → 3 of 3** (S5, S2, S6); the contribution category now
has a source behind it.

### 6.4 Defect counts — closed against outstanding

**`citation_audit.md`** — 84 keys, two passes:

| Verdict | Pass 1 | Pass 2 (revised) |
|---|---|---|
| SUPPORTED | 65 | **74** |
| OVERSTATED | 7 | **9** |
| UNSUPPORTED | 0 | 0 |
| WRONG-SOURCE | 1 | 1 |
| MISSING-KEY | 0 | 0 |
| UNVERIFIED | 11 | **0** |

Movement: 8 UNVERIFIED → SUPPORTED; `hancock_meta-analysis_2011` OVERSTATED →
SUPPORTED (the first-pass verdict was itself wrong); **three new OVERSTATED the
first pass could not see** — `hyndman_another_2006`, `meyer_conceptual_2004`,
`wickramasuriya_optimal_2019`. **Total defects: 10** (9 OVERSTATED + 1
WRONG-SOURCE). **Unresolved verdicts at audit close: 0.** One caveat:
`parasuraman_humans_1997` is a scanned image PDF with no OCR layer, so its
verdict rests on the Zotero abstract.

**`citation_fixes.md`** — **10 drafted, all 10 applied 2026-07-30**, via six
targeted section writes. `ref.bib` 111 → 112 entries. **1 outstanding**: the
FPP3 entry catalogues Athanasopoulos as `editora`/`collaborator` rather than
second author, so the citation renders "Hyndman (2021)".

**`litreview_critique.md`** — 36 findings, 27 blocking. **Prose defects
outstanding: none** (`:337-342`) — every blocking finding was either applied or
explicitly rejected with a recorded reason, and the final mechanical sweep found
no rule violation, no unresolved key, no placeholder, and exact preprint
accounting. Acceptance tests T1–T14: **PASS 3** (T4, T7, T11), **FAIL 1** (T12,
advisory, later resolved by `fig:gap-map`), **PARTIAL 3** (T8, T9, T13), **N/A
7**. Since closed: **T13** (inventory rebuilt to 250 words, inside the 200–400
target), **T8** (all 90 keys, two passes), **T12** (figure replacement).
**Still outstanding: T9 PARTIAL** — all 90 keys resolve in `ref.bib` and the
four new ones are confirmed in Zotero, but full Zotero ↔ `ref.bib`
reconciliation remains open (NotebookLM 106 / My Library 122 / group `scc452`
109).

**Five defects editing cannot reach** (`:344-360`) — all facts about the project
rather than the prose: no live-LLM agent run; N=0 operator labels; transfer used
by no served model and group ICL a negative result; ECE not computed and the
Ask-F1 sweep degenerate; Beer Hall band under-coverage. **The chapter now states
each rather than asserting otherwise.** That is the correct handling and should
be presented as such.

### 6.5 Position against the marking criteria

| Criterion group | Position | Gap |
|---|---|---|
| **HC1–HC5** length (≤20,000 words; abstract ~300 w) | Body target 17,300. The lit review alone is 9,844 — **57% of the body target for one chapter**, with methodology, results and discussion unwritten | Word budget is the live risk. The unrecorded 7,481-word `_condensed` variant looks like an unrecorded response to exactly this. Abstract compliance unverified |
| **HC6–HC34** typesetting, tense, spelling, refs | LaTeX in use; cross-refs verified after every push | **Full mechanical sweep never run.** HC32 (past tense throughout) unverified |
| **HC35–HC49** figures and tables | Lit review has one figure with `\ref` + `\label`, braces balanced; `tab:ladder` caption carries basis provenance | **`gap_map.pdf` may not be on Overleaf** — the agent cannot push binaries. Two dead PDFs may still be on the remote. If the upload never happened, `\includegraphics` fails the build |
| **HC50–HC53** referencing | Two bib resources; 90 keys resolve, 0 undefined | `ding_proactor_2026` renders venueless; FPP3 renders "Hyndman (2021)"; the duplicate `chapters/ref.bib` stub is a live duplicate-key risk (W47) |
| **HC54** project specification as appendix (**mandatory**) | Not evidenced anywhere | **Unaddressed** |
| **HC59–HC61** scope divergence + ethics in Discussion (**mandatory**) | Discussion does not exist | **Unaddressed — and load-bearing.** Scope divergence is substantial: no live agent, N=0 labels, transfer unadopted |
| **HC62–HC70** submission logistics | Deadline 2026-09-04 16:00; build window closes 2026-08-21 | Poster (A1 landscape, 11 Sept), viva scheduling and the supervisor draft (HC65) all unevidenced |
| **R1–R4** structure | Logical | R3: the Objective 3 agent section is absent from Results |
| **R5–R6** MSc-level technique | **Met** — examiner: "present and correct" (Chronos-2, split + Mondrian conformal, MinT WLS_v, CUSUM, BOCPD, LOVO, the 644-injection grid) | — |
| **R7–R8** RQ stated and answered | Stated | **R8 at risk** — W4: no LLM exists in the served system, with the explicit ceiling "no quantity of statistical polish reaches 70 while the object of the research question is absent" |
| **R9–R23** Pass band | Comfortably met | R15/R16 (relevant figures and tables) thin outside Results |
| **R24–R40** Good Pass | **This is the achieved band — 63/100, unchanged through every remediation round** | R38–R40 blocked while Objective 3 is empty |
| **R41–R49** title and abstract | Abstract exists; content never assessed | R47 (specific statistical detail in the abstract) unverified, and the forbidden-to-quote list constrains what may appear |
| **R50–R56** Introduction | Exists, completeness unstated | R56 (chapter-by-chapter overview) unverified |
| **R57–R67** Background / Related Work | **The strongest chapter.** Concept-centric ✓, critical ✓, gap elicited and now figured ✓, R66 largely repaired by the 12 activations, R67 met — preprint count stated as a number (11), not an impression | **R65 (search protocol) NOT MET** — W33, "a half-page appendix and it is free marks". R63 only partly repaired |
| **R68–R86** Methods | Partial | Missing intermittency constants, occurrence-gate spec, group-ICL method, weather method. R78 (library versions) served by the S3 pinning work |
| **R87–R102** Results | Partial | Missing fold-count/MCS served-model results, intermittency/occurrence results, **the whole Objective 3 section**. R99–R101 partly served by S3's MCS |
| **R103–R108** Discussion | **Nothing written** | Every one unmet, plus mandatory HC59 lives here |
| **R109–R116** Conclusions | Exists, completeness unstated | R110/R111 cannot be satisfied honestly until Objectives 3 and 4 resolve |
| **R117–R136** source integration and criticality | Lit review measured against these in revision 5 (em dashes 0, median sentence 25 w, no patchwork found) | Other chapters never assessed |
| **D1–D12 Distinction** | **NOT MET.** D7 — explicit discussion of why the approach beats rejected alternatives — is the examiner's named reason (W36: "a point-estimate league table with no dispersion and no significance test") | **D7 is the single named blocker.** S3's MCS supplies the statistics; they are **not written up**. D12 blocked by W4 |
| **D13–D17 Outstanding Distinction** | Not in reach | — |

### 6.6 Position against each examiner weakness

The register is 55 numbered weaknesses (`00_state_brief.md:48-111`). **Tally:
21 addressed `[C]`, 3 withdrawn `[W]`, 30 not addressed `[O]`, 1 stale.**
Note for the deck: the formal severity count is "**2 Fatal, 14 Major, 3
Minor**" = 19 graded items; the other 36 carry "(inferred)" severities. The
document is a self-styled examiner persona — **AI-assisted, not real
institutional feedback** — and it logs eight of its own errors.

**The four Fatals.** W1 and W2 (metric ruler) **closed** by S1. W3 (MASE
optimises the median at Ellel) **open** — the RMSSE remedy is gate G1, untaken.
W4 (**no LLM in the served system**) **partial** — S8a built the apparatus,
S8b/S8c are blocked, and this carries the explicit sub-70 ceiling.

**Closed (21):** W1, W2, W5 (bare argmin → S2/S3), W7 (pinning → S3), W8 (42
spring days → 273/260/205 origins), W11 (weather serving basis → S6), W16 (TRT
VAT), W18 (group attention off by one string literal → S5), W20 (CPTC theorem →
Barber et al. 2023), W21 (PRISM occupies the claimed gap → repositioned as
field-deployment novelty), W22 (wrong citation key), W23 (SBC vs
Kostenko–Hyndman constants → S4), W29 (conformal arc → S7), W30 (Chronos-2
undercited), W31 (CUSUM absent → Page 1954), W34 (unevidenced verification log
→ withdrawn, then genuinely closed by T8), W35 (preprint density → stated as
11), W48 (bibliography hazard → neutralised by the separate-bib route), W52
(ingest watermark bug → S6), W53 (batch cross-learning hazard → S5). W12 and
W17 partially.

**Withdrawn (3):** W9 (injection realism — discount measured at **zero**, the
0.996 stands), W13 (coverage 1.00 — seven coin flips, with a real
under-coverage defect found in its place), W44 (methodology/results absent from
Overleaf — **stale**, both are there).

**The 30 open ones, grouped by what unblocks them:**

- **Blocked on S8b / Ryan:** W4 (measurement half), W55 (delivery risk).
- **Blocked on Elliot:** W19 (Ellel booking diary — "the highest-value input
  available and one request away").
- **Unblocked, cheap, unstarted:** W10 + W26 (ECE / reliability diagram /
  temperature scaling), W33 (search-protocol appendix — "free marks").
- **A methodology decision I owe:** W3 (RMSSE, gate G1), W49 (Ellel scale basis
  — G2 closed on the code side, the write-up outstanding), W6 (state the HLN
  degeneracy openly).
- **A write-up owed against work already done:** **W36** (the
  alternative-comparison — S3's MCS exists but is not in the chapters; the
  single named Distinction blocker), W46 (verified material stranded in build
  reports), W45 (**the discussion chapter**).
- **Known open defects with flags:** W50 (continuation-alert suppression), W51
  (Beer Hall band under-coverage 0.871).
- **Open overclaims to correct or withdraw:** W37 ("covariates HELP" on a null,
  sign test p=1.0), W27 (degenerate Ask-F1 sweep — **but see the §5.4 conflict:
  the artefact shows cost 134/260/638/1268, not flat 8.0**), W28 (rhythm-as-
  memory refuted by its own code), W38 (June→July horizon claim confounded),
  W39 (regime fragility — Chronos-2-exo throws on the static-regime test).
- **Hygiene and disclosure:** W15 (£403.31), W32 (Croston framing), W40
  (`events` location never stated), W41 (seed policy), W42 (Neon-vs-code
  conflict — **§2.1 of this pack is the disclosure**), W43 (VAT removal scope),
  W47 (duplicate `ref.bib` stub), W54 (reading gaps — largely closed; TabPFN-TS
  and Athanasopoulos et al. 2024 not evidenced as cited).
- **Partially repaired in the lit review only:** W24 (contribution claim — "do
  not submit them as they stand"; the sentence now describes a per-venue rhythm
  and Paleyes supplies the field-instantiation warrant, but **the agent leg
  still has no empirical half**), W25 (VUS-PR — the normative prescription was
  removed from the chapter rather than the metric delivered).

### 6.7 What remains before submission

**Agent-executable, blocking**

1. Write `chapters/discussion.tex`. Does not exist; highest writing priority
   (W45); carries mandatory HC59.
2. **Write up the alternative comparison** (MCS + dispersion) in Results and
   Discussion. W36 is the single named reason Distinction is Not met, and the
   statistics already exist — transcription, not new work.
3. Complete Methodology: intermittency constants, occurrence-gate spec,
   group-ICL method, weather method.
4. Complete Results: fold-count + MCS served-model results, intermittency and
   occurrence results, and the Objective 3 agent section (blocked on S8b).
5. Promote the four ablations from build reports into first-class results (W46).
6. Write the search-protocol appendix (W33 / R65). Half a page, unblocked.
7. Compute ECE / reliability diagram / temperature scaling (W10, W26).
8. Resolve the unrecorded `_condensed` lit-review variant — adopt, discard, or
   record why it exists. The remote is byte-locked to the long version.
9. Restore or intentionally discard `chapters/{methodology,results,ref.bib}` and
   settle W47.
10. Correct `citation_fixes.md:563`, which contradicts its own header.
11. Reconcile Zotero ↔ `ref.bib` (T9).
12. Full mechanical HC1–HC58 sweep.

**Human-only (Phuong)**

13. **Upload `gap_map.pdf` to Overleaf** and delete `sbc_plane.pdf` +
    `hln_correction.pdf`. The agent cannot push binaries; flagged before the
    push and **not confirmed done**. If it never happened, `\includegraphics`
    fails the build.
14. Retype `ding_proactor_2026` (`@misc`/`@unpublished` with the OpenReview URL).
15. Delete `noauthor_full_nodate` from `ref.bib`.
16. Fix the FPP3 entry so Athanasopoulos is a second author.
17. Decide A5 (Wickens & Dixon 2007) — the gate was never put.
18. Answer the truncated 2026-08-03 message, *"It will match the…"*.
19. Delete junk NotebookLM source `416b583d-07f2-4f3c-8109-f4dcd5e566ad`.
20. Include the project specification as an appendix (HC54, mandatory).

**Third-party** — items 21–23 are §7's asks.

**Deliverables.** Single PDF via DS591 Moodle by **2026-09-04 16:00**. Build
window closes **2026-08-21**. Poster in **A1 landscape only**; Poster Conference
11 September, Infolab. Viva to be arranged with both markers. Draft to
supervisor as early as possible (HC65).

---

## 7. Forward plan and asks

### 7.1 Remaining phases and their dependencies

| Phase | Window | Status | Depends on |
|---|---|---|---|
| **A** — unblocked lit-review repair | → 2026-08-04 | **Substantially closed 2026-08-03**; search-protocol appendix (W33) and the verification-log artefact (W34) still unwritten | — |
| **B** — unblocked methodology (G1, G2, G3) | → 2026-08-07 | **Partial.** G2 **closed** (Ellel → unscaled MAE, supervisor decision). **G1 untaken; G3/ECE never run** | G1 needs a supervisor decision; G3 needs an API key or a decision to amend the promise |
| **C** — blocked experiments | 2026-08-04 → 08-14 | **NOT STARTED.** This is the frontier and it is not moving | S8b ← Ryan's key · S9 ← Elliot's labels · Ellel gate ← Elliot's diary |
| **D** — Discussion + absent results sections | 08-14 → 08-21 | **NOT STARTED.** The build window closes at the end of it | Partly on C; **the Discussion itself is not blocked and can start now** |
| **E** — contribution-claim settlement (G6) + lit-review pass 2 | 08-21 → 08-27 | **NOT STARTED** | Leg two cannot settle before S8b — recorded dependency conflict, `02_prj93_pipeline_spec.md:320-328` |
| **F** — critique-revise, mark against criteria, final push | 08-27 → 09-04 | **NOT STARTED** | Everything |

**The critical path runs through Ryan.** S8b → S8c → the Objective 3 results
section → the contribution claim (Phase E) → the Conclusion. Four deliverables
sit behind one API key.

**What is not on that path, and should start immediately regardless:** the
Discussion chapter, the alternative-comparison write-up (W36 / D7), the
search-protocol appendix, and ECE. Those four together move the marking position
more than anything else available, and none of them needs another party.

### 7.2 Asks — Ryan (technical co-founder)

| Ask | What is blocked | What is needed | Consequence if it does not arrive |
|---|---|---|---|
| **1. Anthropic API access (Track B key)** | S8b (~644 live calls, temperature 0), S8c, the entire Objective 3 results section, leg two of the contribution claim, and G3/ECE | One API key, or authorisation to spend against an existing one | **The research question goes unanswered.** The examiner's explicit ceiling: "no quantity of statistical polish reaches 70 while the object of the research question is absent". The chase date was 2026-08-04 and has now passed |
| **2. Checklist completion capture** | The checklist learning domain — one of the brief's four | Completion events with timestamps and identity, from the mobile capture system. Even two weeks at one venue converts a synthetic demonstration into a result | One of four rhythm inputs stays synthetic, and the dissertation must report it as untested |
| **3. NeonDB research schema, or a formal statement that it will not be provisioned** | External validity of every result | Either read access, or written confirmation that the corpus I assembled is the accepted substrate | §5.5's limitation stands unresolved, and the state log's claim that "the brain works against Ryan's read-only Neon research schema" remains a live contradiction with the code (W42) |
| **4. Contract decisions 4–7** | Production correctness of the brain (not the dissertation) | Decisions on transport format, cold start for a single-venue org, **who runs the ladder**, and L2/L3 on the compute path | **`ladder_selection` returns `[]` on every call and `_should_refit` reads the research store's watermark — so a tenant's served model is whatever it started as, for ever.** A live production defect |
| **5. One end-to-end connector call against the contract** | Verification of twelve caller obligations (§2.4) | A single real request through the connector with real data | Twelve interface assumptions stay asserted rather than demonstrated, including ex-VAT grain, hindcast weather basis, and tenant isolation |

### 7.3 Asks — Elliot

| Ask | What is blocked | What is needed | Consequence if it does not arrive |
|---|---|---|---|
| **6. 60–100 adopt-or-dismiss labels on briefing items** | S9, and Objective 4 | 60–100 judgements by **2026-08-14** | Fallback is self-labelling with intra-rater kappa, triggering **2026-08-11**, which recovers **only 3 of Objective 4's 4 terms** and substitutes a strictly weaker claim with a non-independent rater. "Qualitative manager feedback" is a stated contract deliverable with, at present, zero data |
| **7. The Ellel booking diary** | The Ellel occurrence gate; the honest forecastability of an 82%-zero venue | The diary in any machine-readable form | Recorded as "**the highest-value input available to the project and one request away**". Without it, Ellel's forecast problem is misdiagnosed as a magnitude problem when it is an occurrence problem, and no sales-side proxy can recover it |
| **8. Further chat logs, ideally WhatsApp** | The chat-log rhythm input beyond gap detection | Any staff-authored WhatsApp traffic | The corpus is 735 messages, one user, 25 days, **100% web**. The brief's premise is a WhatsApp assistant; nothing about WhatsApp staff behaviour is evidenced, and the brief's own "three staff asked about the fryer reset" example cannot be reproduced because there are not three staff in the data |

### 7.4 Asks — James

| Ask | What is blocked | What is needed | Consequence if it does not arrive |
|---|---|---|---|
| **9. The stock-item → menu-item mapping** | The stock rhythm input, days-of-cover, and the reorder signal — the brief's "monitors stock, drafts supplier purchase orders" | A mapping for the **13 unmapped core keg/cask lines**; ideally the wider 238-product set. Today `STOCK_A6_NODE_MAP` has **one** entry, and matched names touch only **6.38% of net sales** | The reorder signal stays demonstrable on **one SKU**. It cannot be fuzzy-matched: a wrong keg→menu join produces a confidently wrong order quantity, which is operationally worse than the current honest silence |
| **10. Supplier lead times, per beer** | The reorder rule's threshold | Real lead times to replace the working assumption (lead 3 + safety 2 days, `FLAG-3`) | Every reorder date is an assumption the dissertation must caveat |
| **11. Keg sizes per product** | Keg→pints conversion | Confirmation of the 30 L → 52.8 / 50 L → 88 inference (`FLAG-4`) | On-hand pints, and therefore days of cover, carry an unquantified error |
| **12. Stock sheets for Two River Taps and Ellel, if they exist** | Multi-venue stock coverage | Any sheets at all | Stock coverage stays one venue of three (`FLAG-5`) |

### 7.5 Asks — my supervisor

| Ask | What is blocked | What is needed | Consequence if it does not arrive |
|---|---|---|---|
| **13. Gate G1 — adopt RMSSE as the headline metric, or keep MASE and defend it** | The metric paragraph in the lit review, the whole results chapter, and the honest treatment of Ellel | A decision. Examiner Fatal 3 is that MASE optimises the median and Ellel's median day is £0, so a flatline scores 0.07 against a 90% under-forecast. Adopting RMSSE changes the headline everywhere; keeping MASE needs the limitation written up as the chapter already concedes it | The headline metric stays contested through submission and Fatal 3 stays open |
| **14. Ruling on the validation limitation** | How §5.5 is framed in the Discussion | Guidance on whether the self-assembled corpus is presented as an accepted substrate with stated limits, or as a deviation requiring a defence | Determines whether the Discussion opens with a limitation or a justification, and how the viva question is answered |
| **15. Ruling on the two-pass contribution claim** | Phase E | Confirmation that settling in two passes — result-independent repairs now, the agent leg after S8b — is acceptable, since a single settlement point is not achievable on this dependency graph | Either the claim is settled early on incomplete evidence, or too late to survive a critique round |
| **16. Guidance on the S9 fallback** | Objective 4 | A ruling on whether self-labelling with intra-rater kappa is acceptable if Elliot's labels do not arrive by 2026-08-11 | Objective 4 is answered on 3 of 4 terms with a non-independent rater, and the non-independence must be disclosed |
| **17. A word budget** | Scope of the Discussion and Results | Per-chapter targets. **None exists anywhere**; the only figure is 17,300 for the body, and the lit review alone is 9,844 | The 7,481-word condensed lit-review variant exists because of this vacuum, and nothing records why |
| **18. Escalation on Ryan's key** | Everything in ask 1 | Supervisory escalation, if a chase from me is not sufficient | The chase date has passed. This is the difference between a project that answers its research question and one that does not |

---

## Unverified or conflicting

Everything below could not be verified from a paired result file or a ledger
row, or is recorded in two places with different values. **None of it appears in
the body above as a settled claim.** Count: **49 items** — 35 from the
2026-08-04 pass, plus 14 added by the literature section on 2026-08-05 (L1–L9
from the draft pass, L10–L14 from the Overleaf re-verification the same day).

### Conflicting values — recorded, not resolved (10)

1. **AgACI (arm G) mean Winkler, all three venues.**
   `numbers_audit_resolutions.md:84-86` gives BH **1820.32** / Ellel **1476.57**
   / TRT **674.96**; `eval/interval_calibration.md:29,56,83` and
   `eval/interval_calibration_mcs.json` give **1836.6** / **1479.6** / **692.6**.
   `log/52_G17h_AgACI_Correction.md:71` states the correction (1820 → 1837,
   delta +16.3) and says it "supersedes the G column of report 49 and nothing
   else" — but the resolutions ledger still carries the superseded column
   **without annotation**.
2. **Beer Hall LOVO transfer at 14-day cold start.**
   `transfer/transfer_results.md:11` gives transfer **1.242** / naïve 1.771 /
   Δ −0.529; `log/59_G17o:82-88` gives **0.872** / 1.243 / Δ −0.371. The
   artefact acknowledges both in one sentence (`:17`) — it is a basis change,
   `calendar_lag7_active` vs `calendar_lag7` — but a reader of either file alone
   gets one number.
3. **Ellel LOVO row: unit change under the same label.**
   `transfer/transfer_results.md:13` = **MAE £282.002** vs £401.539;
   `log/59_G17o:86` = **MASE 0.927** vs 1.319.
4. **Pooled LOVO statistic.** `transfer/transfer_results.md:21` = **100 blocks,
   −0.072 MASE, [−0.295, +0.154]** (two scaled venues); `log/59_G17o:92-93` =
   **153 blocks, −0.119 MASE, [−0.242, +0.036]** (all three).
5. **Beer Hall foundation MASE.** 6 folds → **1.180**; 24 folds → **0.643**.
   Both live. The 24-fold figure is the corrected one and it overturned a
   published finding, but the pair must be presented together, not swapped
   silently.
6. **Beer Hall keg order from the A6 proxy — three values in circulation.**
   `hierarchy/reconciliation_forecast.md:52` = **0.72 kegs**; `log/56_G17l:48` =
   **1.39** (adopted) vs 0.72 (refused); `log/55_G17k:84` originally printed
   **1.09**, corrected in place.
7. **Weather train/serve pair: table contradicts prose in the same file.**
   `signals/feature_ablation.md:36-38` (table) = observed 0.8788, hindcast
   0.8884, leadmatched 0.9102, oracle 0.9005. `signals/feature_ablation.md:50`
   (prose) = "lead-matched beats clean-reanalysis, **0.82 vs 0.97**". The prose
   pair appears in no table and its **direction is the reverse** of the table's.
   No source path exists for 0.82 or 0.97.
8. **Beer Hall Chronos-2 univariate MASE — three values, no stated
   reconciliation.** `ladder_results_L1_beer_hall.md:15` = **0.793** (6 folds);
   `eval/group_icl.md:11` = **0.7342** (n=273, `calendar_lag7`);
   `eval/group_icl.md:22` = **0.6091** (`calendar_lag7_active`). Fold count and
   basis explain it, but nothing in a single file says so.
9. **Beer Hall and Ellel trading-day counts.** `eval/intermittency_L1.md:10-11`
   carries 301/302 (BH) and 66/67 (Ellel); `numbers_audit.md:867-870` and
   `resolutions.md:261` both instruct that these must reconcile to **302/68**
   under report 45's definition. **Unactioned.** My own query against the store
   returns **302 and 68**.
10. **L3 intermittent node count.** `eval/intermittency_diagnostic.md:42` = 21 of
    32 intermittent, 16 non-OTHER; `hierarchy/reconciliation_forecast.md:28` =
    "0 of 16"; `resolutions.md:350` = "all **20** intermittent L3 nodes select
    SBA, 29 of 30"; `resolutions.md:468-474` = a regenerated 32/285/21/16
    superseding a committed 30/260/20/17. Addendum 3 supersedes Addendum 2, but
    both are live in the same file and the 16-vs-21 split is never stated.

### Numbers with no traceable source (5)

11. **"3.6 standard errors"** (the Beer Hall under-coverage shortfall).
    Recomputes correctly to 3.62 from 0.871 and n=1750, but **no z is stated in
    any report** (`numbers_audit.md:627`).
12. **"Measured with power."** No power calculation exists anywhere — no α, no
    effect size, no MDE, no 1−β, no sample-size justification
    (`resolutions.md:148-160`, `numbers_audit.md:929-930`). OPEN.
13. **Group-ICL "roughly £40"** and the **£44.8** it derives from. The chapter's
    figure exists nowhere; £44.8 is artefact-less prose at `log/47:58`. The
    computed values from `eval/group_icl_L1.json` are £9.99 mean / £7.07 median
    / £171.82 max (`resolutions.md:125-131`).
14. **The entire injection-realism battery (~60 values).** No paired `.md`
    result artefact exists for `eval/injection_realism.py` — only the JSON and
    the narrative `log/PRJ93_Agent_Eval_Report.md`. Every detection number in
    §5.4 comes from a log, not a per-script artefact.
15. **One `numbers_audit` MISMATCH remains unresolved** — a chapter-internal
    count ("three claims withdrawn", then four listed), `resolutions.md:271`.

### Ledger self-contradictions (7)

16. **`citation_fixes.md` contradicts itself.** `:6` reads "STATUS: ALL TEN
    APPLIED"; `:563` in the same file reads "None has been applied"; `:565-567`
    requests a gate-2 decision that `:7` records as granted. The header is
    corroborated by the phase record and the audit state, so `:563` is stale —
    but it must be corrected before a supervisor reads the file.
17. **Literature-review word count — three figures.**
    `litreview_critique.md:15` = 9,553; `:415` = 9,449 after the style pass;
    `wc -w` on the file that is byte-identical to the remote = **9,844**. No
    ledger states which counting method applies.
18. **Draft word counts in the critique table run low against the files** —
    v1 7,145 vs 7,220; v2 8,865 vs 8,943; v3 9,200 vs 9,336.
19. **T8 status recorded three ways in one file** — `:314` PARTIAL, `:614`
    "ADVANCED, NOT CLOSED", `:704` "CLOSED". Chronological rather than
    contradictory, but a reader of the acceptance-test table alone gets the
    stale answer.
20. **Examiner register arithmetic.** `00_state_brief.md:53` says "2 Fatal, 14
    Major, 3 Minor" = 19, against a register of **55** entries. The 19 are the
    formally graded severities; the other 36 are "(inferred)". State this
    explicitly before a supervisor reads either number.
21. **Weakness 44 marked STALE, but the gap may be real and merely relocated.**
    Both chapters are on Overleaf, so the "no chapters exist" charge is stale —
    but **nobody has verified whether they hold prose or stubs**, and no
    per-chapter word count exists anywhere (`00_state_brief.md:33-35`).
22. **`PRJ93_RULES.md:50-59` self-flags a rule it cannot honour** — the writing
    standard requires scientific-writing, statistical-reporting and
    visualisation skills that did not exist in `.claude/skills/`. Three now do
    (`avoid-ai-writing`, `humanizer`, `literature-review-writer`) and were
    applied in revision 5. The rule text was never updated.

### Open-flag roster disagreements between `FLAGS.md` and the state brief (4)

23. **`FLAG-MASE-RULER`** — "RESOLVED for L1" at `FLAGS.md:855`, listed open in
    the brief. The L2 residual is real (`FLAG-L2-DENOMINATOR`, re-scoped not
    resolved, `FLAGS.md:895`).
24. **`FLAG-TAXONOMY-DRIFT`** — "the DOWNGRADED remainder" at `FLAGS.md:453`,
    open in the brief.
25. **`FLAG-METHODOLOGY-OVERLEAF`** — OPEN at `FLAGS.md:1017`, **stale** per the
    live Overleaf listing.
26. **`FLAG-TRT-CONSTRUCTED-ZEROS`** — open in the brief; `FLAGS.md:1029`
    records it RESOLVED by a stronger check, kept for provenance.

### Verification I could not perform this session (9)

27. **Agent memory returned zero results** on two queries (the NeonDB / data
    provision question, and a general project-decision query). No decision was
    recoverable from memory that is not already in a file. If decisions exist
    only in conversation, they are captured nowhere I can reach.
28. **`brain/log/*result*.md` matches no file.** `PRJ93_RULES.md:31-34` requires
    every dissertation number to trace to a `brain/log/*result*.md` file with the
    path cited in a LaTeX comment. **No file of that name has ever existed.** The
    convention was specified and never instantiated; in practice traces go to
    `brain/log/NN_*.md` reports and to per-script `.md`/`.json` artefacts. The
    rule and the repo disagree, and the rule is the one that is wrong.
29. **Whether `methodology.tex` and `results.tex` on Overleaf hold prose or
    stubs.** Not read — the session instruction was not to write to Overleaf and
    reading was not requested. This gates Phase D scoping.
30. **Whether `gap_map.pdf` was uploaded to Overleaf**, and whether the two dead
    PDFs were deleted. The agent cannot push binaries; flagged, never confirmed.
    If the upload did not happen, the build fails.
31. **Three of five `brewery_inventory` snapshots carry a null `snapshot_date`**
    (`Stock Lune Brew April.xlsx`, `Stock Take lune brew March.xlsx`,
    `Stock Take lune brew 1 June 26 final SA.xlsx` — 607 of 1,002 rows). They
    are not time-orderable and cannot enter a panel. Not flagged anywhere I
    found.
32. **A5 (Wickens & Dixon 2007) — the human gate was never put** and the
    disposition is unrecorded. The paper is absent from `ref_additions.bib` and
    the chapter.
33. **The `chapters/` deletion is uncommitted and unrecorded in any ledger.**
    All three blobs remain in HEAD.
34. **`eval/chronos2_covariate_probe.md` and
    `eval/chronos2_promotion_sensitivity.md` are flagged BLOCKED**
    (`log/57_G17m:29`) — never verified against the restored warehouse, no torch
    in that environment. Both still date 2026-07-30. **W37's disputed
    "covariates HELP" conclusion lives in one of them.**
35. **The LOVO artefact is environment-dependent.** Generated from
    `.venv-forecast` (`available: True`); regenerating from `.venv-run` flips the
    foundation clause to "PASS (dropped)" and **drops the whole evidence table**
    — every figure in `transfer/transfer_results.md:34-43`, including 0.643 /
    0.760 / 0.595 / 0.811 and both CIs.

### Literature-work items — added with §3, 2026-08-05 (14)

**L1. Cited-key count: 86 or 90 — RESOLVED to 86 on the remote.** The Overleaf
`chapters/literature_review.tex` contains **128 citation occurrences across 86
unique keys**; the local draft has 133 occurrences across the same 86. `litreview_critique.md` records 90 at three
separate points (`:18`, `:313`, `:505`), and this pack's own §6.3 records both
"75 → 90" (activations) and "75 → ~86" (net effect) two paragraphs apart. Four
keys verify as absent from the review today — `koutsandreas_selection_2022`,
`truong_ruptures_2018`, `hyndman_another_2006`, `tibshirani_conformal_2019` —
which is consistent with 86 but does not by itself account for a gap of four
from 90. **86 is the measurement; 90 is the ledger. Not reconciled.**

**L2. Zotero library size: 118 or 122.** `zotero_library_coverage` over the
active library returns **118 items** today, summing exactly across the eight
D1–D8 collections. `02_prj93_pipeline_spec.md:360` records "Zotero My Library
122". The same line names two other populations — NotebookLM 106 sources and
group library `scc452` 109 — and calls the reconciliation open. I queried one
library only and did not switch to `scc452`, so **the three-way reconciliation
the spec asks for is still not done.**

**L3. NotebookLM source count: 106, 113 or 118.** `02_prj93_pipeline_spec.md:360`
says 106; `litreview_critique.md:544` says 113 at the T8 pass; `tooling_verdict.md`
records 106. Three artefacts, three numbers, and at least one junk source
(a reCAPTCHA page ingested as a document) was identified for deletion and may or
may not have been deleted. Not checked this session.

**L4. `ref.bib` entry count: 111 or 114.** `citation_audit.md:15` inventories
111; `litreview_corpus_judgement.md:333` says 114 ("111 at the 07-30 audit").
Both are plausibly correct on their dates. **Neither is checkable now** —
`chapters/ref.bib` is deleted from the working tree and exists only on Overleaf,
and it is 190 KB, which the token discipline in `PRJ93_RULES.md` puts out of
reach for a whole-file read.

**L5. The citation ledger says no correction was applied; the critique log says
nine were.** `citation_audit.md:387-389` closes with "Proposed corrections for
all nine OVERSTATED and the one WRONG-SOURCE are in
`brain/ledger/citation_fixes.md`. **None has been applied.**"
`litreview_critique.md` then records Ancker, ProActor, Chae, M5, Hertel, PRISM
limb c, Kolassa, Wickramasuriya and Hancock as fixed across revisions 2–6.
**The canonical defect ledger was never updated.** Recorded as a ledger hygiene
failure; I did not edit either file.

**L6. `hyndman_another_2006` correction status — RESOLVED: repaired.** The remote
methodology cites Hyndman & Koehler for the original lag-1 definition and
`hyndman_forecasting_2021` for the seasonal form at lag m. `bavaresco_llms_2025`
is repaired in the methodology too. Neither repair is recorded in any ledger,
which is item L10.

**L7. Local draft versus the Overleaf remote — RESOLVED, and they differ.** The
remote is **52,435 bytes / ~7,111 words** and matches
`drafts/literature_review_condensed.tex` (52,431 bytes) to within whitespace,
not `drafts/literature_review.tex` (67,389 bytes / ~9,475 words), which is what
`litreview_critique.md:747-750` records as the remote state. A condensation was
pushed after the critique record closed and is in no ledger. Consequences at
3.3: T13 reopened, the scope paragraph deleted, the preprint accounting reduced
to a total, and the search-boundary sentence removed.

**L8. Two proposed corpus decisions have no recorded disposition.**
`tibshirani_conformal_2019` was proposed as an optional activation
(`litreview_corpus_judgement.md:284`) and has zero occurrences in the chapter;
Wickens & Dixon 2007 was proposed conditionally and was never acquired. Neither
has a recorded gate outcome. Under `PRJ93_RULES.md:38-48` adding or dropping a
cited paper is a human gate, so **a proposal that quietly lapses leaves no
audit trail either way.**

**L9. Screened-versus-retained counts are not recoverable.** No record of query
strings, databases queried, or records screened at any stage exists in any
artefact. The `appendix/search_protocol.tex` that ARC stage 3 specifies
(`02_prj93_pipeline_spec.md:70-79`) has not been written. Terminal counts (118
held, 86 cited) are measurable; **stage counts are not, and reconstructing them
now would be fabrication.** §3.1 says so in the body rather than implying a
protocol that did not exist.

**L10. The methodology chapter has been revised and no ledger records it.**
`citation_audit.md:387-389` still reads "None has been applied";
`litreview_critique.md` covers the review only and states the methodology was
never revised. The remote methodology contains at least: the split
`hyndman_another_2006` / `hyndman_forecasting_2021` citation, the corrected
`bavaresco_llms_2025` sentence, a `breiman_classification_1984` citation for the
one-SE rule, `hewamalage_look_2021` activated twice, a pre-registered
`tab:mcs-config`, and a withdrawn SBA finding. **Who made these changes and
when is not recorded**, and the chapter's own header comment still describes a
20-key check dated 2026-07-25. I did not edit either the chapter or the ledgers.

**L11. Two citation keys in use are outside every verification record.**
`hyndman_forecasting_2021` and `breiman_classification_1984` appear in the remote
methodology, in neither pass of `citation_audit.md` (84 keys), and in neither the
methodology header's own 20-key list nor the review's 86. Both resolve in Zotero
(`K45PBRM3`, `54Z6YNAL`, confirmed this session). **Whether they resolve in
`ref.bib` is unverified** — see L4; if either does not, the build has an
undefined citation.

**L12. `ref.bib` entry count remains unverifiable.** 111 per the methodology
header (2026-07-25) and per `citation_audit.md:15`; 114 per
`litreview_corpus_judgement.md:333`. The file is on the remote at roughly 190 KB
and `mcp__overleaf__read_file` returns whole files only, which the token
discipline in `PRJ93_RULES.md` puts out of reach. **Not counted, in either
direction.**

**L13. The SBA inequality defect has no ledger entry.** The remote methodology
discloses that the selection rule was implemented with the inequality reversed,
that it was taken from the external review rather than the paper, and that "the
reported finding that no node in the estate selects the Syntetos-Boylan
approximation is a consequence of that error rather than a property of the
data." That is a withdrawn published finding. It appears in no `FLAGS.md` entry,
no `phase_state.md` line and no `code_vs_paper.md` row that I found. **Whether
the implementation has been corrected, or only the chapter, is unverified** —
`brain/models/intermittent.py` was not checked against the published inequality
this session.

**L14. The AgACI aggregation defect and its re-run are undocumented in §4.1.**
The remote methodology states that the first implementation departed from
Zaffran et al. on all three points — separate per-bound aggregation, Bernstein
rather than exponentially weighted, pinball at α/2 and 1−α/2 — and that "the
departure, the re-run that corrected it and its effect on the reported figures"
are in `sec:res-winkler`. §4.1's row for adaptive conformal records the negative
result but not this correction, and I did not read `results.tex` this session, so
**the effect on the reported Winkler figures is unverified here.**

### Two things I verified that contradict a received claim

- **"MCP-SIM" does not mean simulated data.** The provenance blocks carry
  merchant id `ML1FFAGJMQBTZ`, real Square view names (`ProductMixReport`,
  `SalesUK`) and real refresh timestamps. The label invites the wrong inference
  and should be renamed.
- **The Ask-F1 sweep is not flat at 8.0.** Examiner W27 charges "zero misses and
  a flat cost of 8.0 at every ratio". `log/PRJ93_Agent_Eval_Report.md:141-148`
  reports **126 misses vs 8 false alarms** and cost **134.0 / 260.0 / 638.0 /
  1268.0** at 1:1 / 2:1 / 5:1 / 10:1. Either the sweep was rerun after the
  examiner saw it, or W27 describes a different artefact. **Do not repeat W27 in
  the deck without re-checking.**
