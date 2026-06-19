# PRJ93 — Proactive Brain: Phase-2 Build Report

**Branch:** `feat/proactive-brain` · **Prepared:** 19 June 2026
**Scope:** Full execution of `PRJ93_Phase2_FullStack_Build_Plan_for_ClaudeCode.md`
**Status:** Track A complete (A0–A10, 59/59 tests pass). Track B complete (B1–B4, 18/18 tests pass). Nothing committed or pushed.

---

## 1. What was built

Two tracks, exactly as the plan specifies.

### Track A — the Python Proactive Brain (`brain/`)
A standalone forecasting & signals engine that runs entirely off the supplied CSVs with **no PostgreSQL**, persisting its own time-series memory to a local **DuckDB + Parquet** store (the methodology's stated design contribution). Maps 1:1 onto methodology Steps 2–8.

```
brain/
├─ config.py                         paths, venue map, VAT rule, constants
├─ requirements.txt / -optional.txt  core + optional (Prophet/GBM/Voyage/foundation)
├─ README.md  FLAGS.md  pyproject.toml
├─ ingest/normalise.py               A0  UTF-16 TSV → tidy long table + manifest
├─ store/warehouse.py                A1  DuckDB L1/L2/L3 views + read/write helpers
├─ eval/harness.py                   A2  splits, MASE/coverage/Winkler, rolling-origin, LOVO
├─ features/build_features.py        A3  leak-free L1 feature table + exogenous seam
├─ models/ladder.py                  A4  baseline ladder rungs 0–4
├─ conformal/wrap.py                 A5  split/Mondrian conformal band + coverage
├─ hierarchy/reconcile.py            A6  MinT reconciliation + keg consumption proxy
├─ transfer/lovo.py                  A7  leave-one-venue-out onboarding transfer
├─ signals/chatlog_kb_gap.py         A8  failure-rate monitor + ranked SOP gaps
├─ signals/checklist_discipline.py   A9  weighted missed-step detector
├─ service/app.py                    A10 FastAPI exposing the brain (127.0.0.1:8088)
└─ tests/                            59 pytest cases, one suite per module
```

### Track B — injection into the AI-GM agent (`apps/api/src/modules/proactive-brain/`)
A self-registering NestJS module that exposes four new agent tools through the codebase's own `IntegrationRegistry` seam — **no edits to `chat-tools.ts`, `tool-dispatcher.ts`, `ai-sdk-tools.ts`, `gm-agent.ts`, or any Square file**.

```
apps/api/src/modules/proactive-brain/
├─ brain.tools.ts            4 tool defs + Zod schemas (mirror SQUARE_TOOL_DEFINITIONS)
├─ brain.client.ts           typed HTTP client → FastAPI brain
├─ brain.service.ts          validate → dispatch → ToolResult<T> envelope
├─ brain.provider.ts         IntegrationProvider, self-registers onModuleInit
├─ proactive-brain.module.ts
├─ brain.service.spec.ts     12 unit tests (brain stubbed)
└─ brain.registration.spec.ts 6 unit tests (registration + dispatch routing)
apps/web/src/components/chat/tool-cards/brain-cards.tsx   forecast / deviation / SOP-gap cards
```

**The three additive touch-points (the only existing-file edits):**
1. `apps/api/src/app.module.ts` — one import + one `imports[]` entry.
2. `apps/web/src/components/chat/tool-cards/tool-card-router.tsx` — three `RENDERERS` entries.
3. `apps/api/prisma/seed-brain.sql` — one additive `Integration` row (`provider='brain'`, `status='active'`) per org.

---

## 2. Data, as ingested (A0)

| Venue | Line items | Expected | Match |
|---|---|---|---|
| The Beer Hall | 47,644 | 47,644 | ✅ |
| Two River Taps | 33,993 | 33,993 | ✅ |
| Ellel Village Hall | 10,489 | 10,489 | ✅ |
| Events (excluded) | 203 | 203 | ✅ |
| **Total** | **92,329** | **92,329** | ✅ |

- Date span: **2025-06-04 → 2026-05-31** (~12 months, 270 BH trading days).
- 0 dropped rows, 0 null rates on key numeric columns.
- VAT rule applied: TRT `Net Sales` treated as VAT-inclusive, deflated by 1/1.2 into `net_sales_exvat`.

---

## 3. Results by step (the §8 acceptance gates)

### A0/A1 — Ingest + DuckDB store → **PASS**
Counts reconcile exactly. Beer Hall L1 net (ex-VAT) = **£202,087.69** vs the audit's **£202,491** (Δ £403, **0.2%**, within the 1% tolerance — logged in FLAGS.md). All three layers (L1 venue-daily, L2 category, L3 item) round-trip from the store.

### A2 — Evaluation harness → **PASS**
Runs end-to-end on a dummy seasonal-naïve forecast and prints every metric (MASE, MAE, RMSE, sMAPE, coverage, Winkler, mean pinball, width). The `LeakageError` guard fires on an overlapping split. Provides the time-aware split, expanding-window rolling-origin backtest, and the LOVO scaffold reused by A4/A5/A7.

### A3 — L1 feature table → **PASS**
362 continuous daily rows, 22 leak-free features (DOW dummies, month/season, lag-7/14, rolling-4-week median, Happy-Hour flag, UK bank holidays, Ellel-event-night, price-regime). Reconciles to £202k; lag/rolling features verified to reference only strictly-past dates. The exogenous-join seam (`exo_temp_c`, `exo_rain_mm`, …) is present but unpopulated.

### A4 — Baseline ladder → **PASS** (milestone)
Evaluated in **two regimes**; the milestone gate is the operational rolling-origin one.

**Static 8-week held-out block (multi-step from origin) — MASE:**

| Rung | Model | MASE |
|---|---|---|
| 0 | seasonal-naïve | 1.944 |
| 1 | robust DOW × season | **0.704** |
| 2 | ETS | 0.806 |
| 2 | Prophet | 0.824 |
| 2 | STL | 0.847 |
| 3 | GBM (HistGB) | 0.852 |
| 3 | global GBM (pooled) | 0.979 |

**Operational 7-day rolling-origin (6 folds) — MASE [the milestone gate]:**

| Rung | Model | MASE |
|---|---|---|
| 0 | seasonal-naïve | 1.006 |
| 1 | robust DOW × season | 1.029 |
| 2 | **ETS** | **0.799** |
| 2 | **Prophet** | **0.799** |
| 2 | STL | 1.125 |
| 3 | GBM | 0.927 |
| 3 | global GBM | 0.905 |
| 4 | foundation | dropped (Tan ablation — no backbone installed) |

**Finding:** over a long static horizon the **robust DOW baseline is unbeatable** (0.704) — the methodology's own warning that a black box must earn its place. In the short-horizon regime the brief actually needs ("Friday running 30% above forecast → next week's keg order"), **ETS/Prophet (0.799) and both GBMs beat seasonal-naïve and robust DOW**. Milestone met.

### A5 — Conformal band → **PASS** (Objective 1 deliverable)
Split conformal calibrated on rolling-origin residuals (EnbPI-style), validated online and **pooled over 172 held-out points**. Model wrapped: ETS.

| Variant | 80% coverage | 90% coverage | Winkler @90 |
|---|---|---|---|
| plain | 81.4% | 89.5% | 1920 |
| **Mondrian (persisted)** | **78.5%** | **90.7%** | **1436** |

All within ±3pp of nominal. The Mondrian band (group-conditional on active vs structural-zero day) is both valid **and** sharper, and is the deployable deliverable persisted to DuckDB. This band is the input to Objective 2: *a deviation is an observation outside the band*.

### A6 — Hierarchy + MinT → **PASS**
39-node Beer Hall hierarchy (venue → 8 categories → 30 top-K item + OTHER nodes). MinT (diagonal WLS) reconciliation gives **exact coherence** (Σitem = category = venue, discrepancy 0.0). Item-level (L3) conformal bands reported honestly under-covering (80%→60.5%, 90%→77.6%) — expected for sparse item series. **Stock-consumption proxy:** reconciled `Lager - BH` forecast = **90.6 pints/week → 1.03 kegs** to order (at 88 pints/keg) — serving the ordering use-case with no real stock data.

### A7 — Onboarding transfer (LOVO) → **PASS** (target outcome)
Borrow the donor venues' normalised DOW shape, anchor on the held-out venue's own level (partial pooling). At a **14-day cold-start**:

| Held-out venue | MASE transfer | MASE per-venue-naïve | Transfer wins |
|---|---|---|---|
| The Beer Hall | 0.902 | 1.257 | ✅ |
| Two River Taps | 1.190 | 0.700 | ✗ |
| Ellel Village Hall | 0.920 | 1.306 | ✅ |

**2/3 venues** (majority gate). Crossover sweep shows transfer's advantage decays as own-history accrues (14d: 2/3 → 21d: 1/3 → 28d+: 0/3) — the partial-pooling onboarding story. Foundation-model rung **dropped per the Tan et al. ablation** (no backbone installed → an unjustified backbone is not adopted).

### A8 — Chat-log KB-gap detection → **PASS**
**Failure rate reproduced exactly: 18.9%** (68/359 assistant replies = "I couldn't produce an answer — please retry or rephrase"). Web channel (not WhatsApp), 25 active days, single-owner — all confirmed. TF-IDF embedding fallback (keyless), substantive-turn filtering, ranked by *failure-density × repeat-ask count*, gaps defined as clusters failing **above** the baseline. Top ranked SOP gaps:

| Gap | Failure density | Asks | Example |
|---|---|---|---|
| Gas cannister / gas safety | 60% | 3 | "Why is this gas cannister not connecting and gas is coming out of the gas tap handle?" |
| New-user onboarding | 33% | 4 | "Pretend I'm a new user… what is ai-gm…" |
| Document upload | 22% | 4 | "can I upload documents into this chat?" |
| Opening procedure | 33% | 2 | "How do I open up?" |

### A9 — Checklist completion-discipline → **PASS**
Templates parsed (opening 27 / closing 32). 8 conditional steps ("if needed / where needed") excluded from miss-scoring; 5 critical steps weighted (cash-up/safe, gas-off, lock-up). Synthetic-log scenarios (template-only mode pending Ryan's `ChecklistStepCompletion` export):

| Scenario | Severity |
|---|---|
| Mon open — all mandatory, conditionals skipped | ok (conditionals never raise) |
| Wed close — gas-off (#8) missed | **high** (weighted 5, critical) |
| Thu close — chairs-up (#31) absent on a weekday | ok (Sunday rule) |
| Sun close — chairs-up (#31) missed on Sunday | low (#31 expected) |
| Fri close — abandoned | **critical** (skipped) |

### A10 — FastAPI service → **PASS**
Live uvicorn smoke (warm store):

| Endpoint | Status | Latency |
|---|---|---|
| GET /health | 200 | 23 ms |
| GET /forecast | 200 | 9 ms |
| POST /deviation/check | 200 | 15 ms |
| GET /sop-gaps (warm) | 200 | 1 ms |
| POST /checklist/discipline | 200 | 1 ms |
| GET /docs, /openapi.json | 200 | <5 ms |

Store holds **2,223 persisted forecasts**. `/deviation/check` caught a **real breach**: 2026-05-15 actual £2,262 above the £1,550 band ceiling (severity medium) — the §6 breach rule working end-to-end.

---

## 4. Track B results

**18/18 unit tests pass** (`node --import tsx --test`). The proactive-brain module **typechecks clean (0 errors)**.

The four agent tools:

| Tool | Purpose | Maps to |
|---|---|---|
| `brain_forecast_sales` | Expected sales band for venue/layer/date-range | A5/A6 |
| `brain_check_deviation` | Is recent trading outside its band? severity? | A10 `/deviation` |
| `brain_find_sop_gaps` | Ranked missing-SOP clusters + failure rate | A8 |
| `brain_check_checklist` | Missed mandatory steps, weighted | A9 |

| Gate | Result |
|---|---|
| B2 — 4 tools validate input, call right endpoint, valid `ToolResult` | ✅ |
| B3 — self-registers (`providerId=brain`), 4 tools surface, dispatch resolves active provider | ✅ |
| B4 — UI cards render from fixtures; router edit additive-only | ✅ |

Tenant isolation confirmed: `orgId` comes from `DispatchContext`, never the model; `venue` is a closed enum; results use the `ToolResult<T>` envelope (`ok`/`fail(reason, detail)`).

### Review Gate
`code-reviewer` + `security-reviewer` run in parallel (project CLAUDE.md requirement).
- **Security:** no HIGH/MEDIUM. SSRF, query-injection, XSS, error-leak, seed-SQL, DoS-bounds, secret-logging, tenant-isolation all **PASS**. Two latent LOWs documented (multi-tenant venue scoping — already flagged pending; response not runtime-validated — cosmetic).
- **Code:** one **MEDIUM** — fixed (deviation card was formatting L2/L3 unit counts as £; now guards on `layer === 'L1'`). Also added the L2/L3 `key`-required Zod refine + 2 tests, and removed two unused loggers.

---

## 5. Verification state & deferrals

- **Track A:** fully runnable today. `cd brain && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`, then the pipeline in `brain/README.md`. `pytest` → 59 passed.
- **Track B unit tests:** 18 passed (brain stubbed, no network/Postgres).
- **Project-wide `tsc`:** 142 **pre-existing** errors in untouched files — `@prisma/client` isn't generated/resolvable in this environment (no Postgres). The proactive-brain module contributes **0**.
- **Live agent wiring** (agent actually calling the brain) needs Postgres + Redis up, `prisma generate`, and `seed-brain.sql` applied — deferred exactly as the plan specifies.

### Standing flags (see `brain/FLAGS.md`)
- TRT VAT basis — owner to confirm (working assumption: deflate 1/1.2).
- `ChecklistStepCompletion` export (Ryan) — A9 in template-only mode until then.
- xgboost/lightgbm couldn't load (macOS libomp) → sklearn `HistGradientBoostingRegressor` used.
- Voyage key absent → TF-IDF fallback for A8.
- Foundation models absent → Rung 4 dropped per the Tan ablation.

---

## 6. Per-step artefacts

| Step | Artefact |
|---|---|
| A0 | `brain/store/manifest.json` |
| A1 | `brain/store/brain.duckdb` |
| A2 | `brain/eval/eval_design.md` |
| A3 | `brain/store/bh_daily.parquet` |
| A4 | `brain/models/ladder_results_L1.md` |
| A5 | `brain/conformal/conformal_L1.md`, `brain/store/conformal_coverage.png` |
| A6 | `brain/hierarchy/reconciliation_forecast.md` |
| A7 | `brain/transfer/transfer_results.md` |
| A8 | `brain/signals/chatlog_kb_gap.md` |
| A9 | `brain/signals/checklist_discipline.md` |
| A10 | `brain/service/app.py`, `brain/README.md` |
| Flags | `brain/FLAGS.md` |
