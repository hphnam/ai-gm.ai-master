# PRJ93 — Consolidated Build Report (current state)

**Date:** 2026-06-25
**Branch:** `feat/proactive-brain` (uncommitted working tree on top of commit `b82172a`)
**Scope of this report:** the full Proactive Brain as it stands now — Phase-2 build
(A0–A10), the 9-fix remediation, the 5-patch follow-up, and the new Stock Data
Integration (A11/A12 + Track-B tool). Supersedes the per-phase reports
([PRJ93_Phase2_Build_Report.md](PRJ93_Phase2_Build_Report.md),
[PRJ93_Phase2_Remediation_Report.md](PRJ93_Phase2_Remediation_Report.md)) as the
single current-state view.

This report is the output of a **self-audit** run on 2026-06-25: every claim below
was re-verified against the running code, the DuckDB store, the API, and the test
suites (commands and results in §6).

---

## 1. Status at a glance

| Track | Result |
|---|---|
| **Track A** (`brain/`, Python) | A0–A14 + A13 change-point + point deviation + briefing capstone. **139 pytest passing** (17 files). Full pipeline runs end-to-end via `scripts/run_all_venues.sh`. |
| **Track B** (`apps/api` + `apps/web`, TS) | 7 self-registered agent tools. **29 specs passing, 0 new typecheck errors** in the proactive-brain module + web cards. No forbidden touch-points edited. |
| **Reviews** | Briefing capstone: code-reviewer 1 HIGH (empty-run re-resolve loop) + 2 LOW **all fixed**; security-reviewer **no findings**; doc-reviewer stale docs **fixed**. Point deviation: code **no HIGH/MEDIUM**; security 1 LOW **fixed**. Stock: security **no findings**; code 1 MEDIUM + 1 LOW **fixed**. |

**Overall: all acceptance gates pass (A0–A14 + A13 change-point + point deviation G0–G9 + briefing capstone G0–G9; stock G1–G10, enrichment, change-point G1–G12).**

---

## 2. Architecture & data flow (verified coherent)

```
CSV / XLSX sources
  items-…csv ─► A0 ingest ─► line_items (92,329) ─► A1 DuckDB store
                                                      ├─ l1_daily / l2_category_daily / l3_item_daily (views)
                                                      ├─ A3 features ─► A4 ladder ─► A5 conformal ─► forecasts(2365)/bands(4730)
                                                      ├─ A6 MinT reconcile ─► L2/L3 forecasts+bands ─► consumption proxy
                                                      └─ A7 LOVO transfer
  chat…csv ─────► A8 KB-gap        opening_and_closing_checklist.md ─► A9 discipline
  stock/*.xlsx ─► A11 stock ingest ─► stock_panel(1407) / stock_product_master(238) / stock_snapshot_agg(10)
                                       └─ brewery_inventory(1002)  [isolated, no join]
                                       │
  A6 forecasts ───────────────────────┴─► A12 stock cover ─► stock_cover(14) ─► (A6 re-run enriches its report)
                                                              │
  A10 FastAPI: /health /forecast /deviation/check /deviation/scan /deviation/changepoint /sop-gaps /checklist/discipline /stock/cover /briefing
                                                              │
  Track B (NestJS): BrainClient ─► BrainService ─► BrainProvider ─(IntegrationRegistry)─► AI-GM agent
                    7 tools: forecast_sales, check_deviation, find_sop_gaps, check_checklist, check_stock_cover, check_change_point, daily_briefing
                    Web: ForecastBandCard, DeviationCard, SopGapsCard, ChecklistCard, StockCoverCard, ChangePointCard, BriefingCard
```

**Connection points audited and confirmed working:**
- A12 reads the A6 forecast node and the join is numerically coherent — `forecast_daily_pints` for `Caravan of Love` = **5.32** on both sides (A6 `forecasts.yhat` avg and `stock_cover`).
- A6 runs **headless** when `stock_cover` is absent and **enriches** its report when present (verified by `test_a6_reconcile_runs_without_stock_table` + the pipeline's second reconcile pass).
- API: `/health` 200; `/forecast` returns 57 (BH L1) / 85 (TRT, incl. standby) / 57 (Ellel) rows; `/stock/cover?venue=beer_hall` → 14 lines / 1 reorder; non-stock venue → 200 with an explicit empty `note` envelope.
- Venue slug is **`beer_hall`** consistently across sales + stock (no stale `the_beer_hall` references remain in code).
- Track B tool is wired through every layer (tools→client→service→provider→web router) and **no edits** to `chat-tools.ts`, `tool-dispatcher.ts`, `ai-sdk-tools.ts`, `gm-agent.ts`, `system-prompt.ts`.

---

## 3. Component-by-component (A0–A12)

| Step | Module | Gate result (verified) |
|---|---|---|
| A0 ingest | `ingest/normalise.py` | PASS — 92,329 rows reconcile to per-venue audit counts |
| A1 store | `store/warehouse.py` | PASS — L1/L2/L3 views; BH L1 ex-VAT within 1% of £202,491 |
| A2 harness | `eval/harness.py` | PASS — MASE/coverage/Winkler, rolling-origin, leakage guard |
| A3 features | `features/build_features.py` | PASS — leak-free L1 feature table; A14 exo seam now populated (calendar/weather/events), adoption ablation-gated |
| A4 ladder | `models/ladder.py` | PASS — BH Prophet 0.799 < naïve 1.006; TRT ETS 0.597 < 0.673; Ellel (capped R1) 0.572 < 0.924 |
| A5 conformal | `conformal/wrap.py` | PASS — BH strict ±3pp; TRT/Ellel band persisted (conservative), TRT +28d standby band |
| A6 reconcile | `hierarchy/reconcile.py` | PASS — coherent Σ=cat=venue; L2 70.8%/82.5%, L3 60.5%/77.6%; consumption proxy + **stock-cover join** |
| A7 transfer | `transfer/lovo.py` | PASS — 2/3 cold-start transfer wins (majority gate); foundation dropped (Tan) |
| A8 KB-gap | `signals/chatlog_kb_gap.py` | PASS — 18.9% baseline reproduced; ranked SOP gaps |
| A9 checklist | `signals/checklist_discipline.py` | PASS — weighted misses, conditionals never raise, Sunday rule |
| **A11 stock ingest** | `ingest/stock_normalise.py` | PASS — 13 sheets → 10 snapshots / 1,407 rows; 238 products (**129 core**); date conflict flagged; brewery isolated |
| **A12 stock cover** | `signals/stock_inventory.py` | PASS — days-of-cover for the mapped core keg line; unmapped lines NULL (not guessed) |
| **A14 enrichment** | `features/build_features.py`, `ingest/exog_weather.py`, `ingest/local_events.py`, `ingest/spike_days.py`, `signals/feature_ablation.py` | PASS — exo seam populated (calendar/weather/events); ablation adopts **none** (honest null on BH); weather train/serve study delivered |
| **A14b diagnostic** | `signals/weather_diagnostic.py` | PASS — 4 tests find a **weak-but-significant** temperature signal in draught (Test D incr R²≈0.02, p<0.05) that the GBM can't convert to forecast lift; calendar genuinely uninformative; **adopts nothing** (`_ADOPTED_EXO` untouched), logged as a candidate |
| **A13 change-point** | `signals/change_point.py`, `eval/change_point_eval.py` | PASS — CUSUM + persistence + BOCPD on the conformal residual stream; **TRT closure recovered** (8-day delay, `both` detectors); injection δ=1→100%@~9d, δ=2→~3d, ~0 false alarms; each shift **attributed** against the A14 seam; 6th Track-B tool; no forecast change |
| **Point deviation** | `signals/residual.py` (shared foundation), `signals/deviation.py` | PASS (G0–G9) — per-day band primitive on the shared residual stream; foundation extracted so deviation and change-point share a scale and neither imports the other; `/deviation/check` migrated band-breach→check_point (+`/deviation/scan`); `brain_check_deviation` re-shaped; no forecast change |
| **Briefing capstone** | `signals/briefing.py`, `briefing_runs` table | PASS (G0–G9) — composes the four signals into one ranked, de-duplicated, attributed daily feed; change-point absorbs its deviation run + coincident stock; transparent config-driven score; new/continuing/resolved via `briefing_runs`; honesty gates (CHECKLIST_LIVE, sparse baseline_trust, closed-venue quiet); 7th Track-B tool; no new detection maths |
| A10 service | `service/app.py` | PASS — all endpoints return typed JSON |

---

## 4. Stock integration detail (the new work)

**What it adds.** The A6 consumption proxy was demand-only ("Lager-BH → 1.03 kegs/week").
A11 supplies the physical on-hand position from 13 monthly Beer-Hall bar-stock sheets;
A12 joins the two into an inventory-aware reorder signal:
`days_of_cover = on_hand_pints / forecast_daily_pints`, with a reorder flag and a
suggested order in kegs.

**Tables (DuckDB, verified row counts):** `stock_panel` 1,407 · `stock_product_master`
238 · `stock_snapshot_agg` 10 · `stock_cover` 14 · `brewery_inventory` 1,002 (isolated).

**Working-capital readout (matches the spec EDA exactly):** mean inventory £6,803
(min £4,524 Jan, max £11,457 Jun; CV 0.34); Draught £2,089 + Cask £807 the largest
block; total kegs swing 11 → 66 month-to-month (reactive bulk-ordering — the
inefficiency the signal targets).

**Track-B tool `brain_check_stock_cover`** — validates `venue` against the Zod enum,
calls `GET /stock/cover`, returns a `ToolResult` envelope (`no-data` for non-stock
venues). `StockCoverCard` renders reorder lines first. Self-registers via the
existing IntegrationRegistry seam.

---

## 4b. Feature enrichment detail (A14 — newest work)

**What it adds.** Activates the pre-built exogenous seam in `build_features` with
real data: deterministic calendar (Lancaster university + Lancashire school term,
from `ingest/calendar_sources.py`), Open-Meteo weather (three bases), and curated
local events. Every feature is gated by a rolling-origin ablation —
`signals/feature_ablation.py`.

**Tables / sources (verified):** `exog_weather_observed/hindcast/leadmatched` (693
rows each, real Open-Meteo pulls, cached to DuckDB) · `local_events` (7 curated
Lancaster anchor-days) · `spike_days` (614 venue×date, 1 retrospective spike) ·
empty `promo_calendar` forward hook.

**Headline result — an honest negative, established not assumed.** Against the
strong autoregressive GBM baseline (MASE **0.816**), the ablation **adopts no
exogenous feature**: calendar flags hurt slightly (school −2%, uni −6%), weather
overfits (−20%), events are null. Cause: the 6-week operational test folds sit
inside one term (calendar flags near-constant there) and the curated event anchors
fall outside the test window — and, verified by search, the two biggest recurring
Lancaster festivals (Music Festival, Highest Point) **did not run in the 2025-26
data window**. The seam is populated for **deviation attribution** and the study,
not adopted — so the live ladder is unchanged (no-regression).

**Weather train/serve consistency study (the methodological contribution).** Under
forecast serving, the **matched** training basis (lead-matched) beats the
**mismatched** clean-reanalysis basis (MASE 0.82 vs 0.97) — the direction the
train/serve-consistency principle predicts. But the best weather config only
*matches* the no-weather baseline and the oracle (perfect weather both ends, 0.93)
is no better, so on this ~270-day single-venue sample weather carries no net
forecast signal; the basis gaps are partly small-sample overfitting. Forecast
skill at 3-day lead: temp MAE 0.89 °C (accurate), rain MAE 3.48 mm (noisy). Full
write-up: [brain/signals/feature_ablation.md](brain/signals/feature_ablation.md).

`is_spike_day` (≥0.95 discount share) lives in its own table, **never joined to the
feature frame** — retrospective attribution only, not a forward regressor.

---

## 5. Honest call-outs (flagged, not coerced)

These are documented in [brain/FLAGS.md](brain/FLAGS.md) and surfaced at runtime — they
are deliberate, evidence-based decisions, not defects:

1. **Footer reconciliation is 7/10, not 8/10.** Three hand-typed `TOTAL CASH` footers
   (Feb/Apr/May) are stale; Feb was confirmed a stale footer (zero double-count), so the
   spec's "2 stale" was a miscount. Line-item sums are authoritative (FLAG-6); footer
   reconciliation is a diagnostic, not a hard gate.
2. **Only 1 of 14 core keg lines (`Caravan of Love`) maps to a forecast A6 node** at
   the default top-k — A6 buckets most branded items into OTHER and generic sales items
   ("Lager-BH") span several keg brands. Unmapped lines carry **NULL demand, never a
   guess** (spec §4.4/G5). The mechanism is proven end-to-end (it caught a stocked-out
   line with live demand → reorder). Raising A6 `--top-k` would map more; not done to
   preserve A6's default behaviour.
3. **Stock uses the canonical `beer_hall` slug** (not the spec's `the_beer_hall`) so it
   joins the sales forecasts and the Track-B venue enum without a translation seam.
4. **Brewery stocktakes are cleaned but isolated** (`brewery_inventory`, no FK/join);
   the vertical-integration link is future work (FLAG-8).
5. Carried Phase-2 flags still stand: VAT basis for TRT (owner to confirm), checklist
   capture pending Ryan's mobile system, Voyage→TF-IDF fallback, Rung-4 foundation
   models dropped per the Tan ablation.

---

## 6. Self-audit evidence (2026-06-25)

| Check | Command | Result |
|---|---|---|
| Track A modules | file existence sweep | 15/15 present |
| DuckDB tables | `information_schema.tables` | 7 tables + 3 views, all populated |
| A12↔A6 join | compare `forecasts.yhat` vs `stock_cover` | 5.32 == 5.32 (coherent) |
| API endpoints | FastAPI TestClient | all 200; row counts as §2 |
| Stale slugs | `grep the_beer_hall brain/**/*.py` | none |
| Track B wiring | grep across layers | tool present in tools/client/service/router/card |
| Forbidden touch-points | `git status` on chat-tools/dispatcher/ai-sdk/gm-agent | none touched |
| brain tests | `pytest` | **139 passed** (17 files; +9 A13 change-point, +14 point deviation, +11 briefing) |
| A14 weather reachability | Open-Meteo archive/hindcast/previous-runs | reachable; 3 bases cached (693 rows each) |
| A14 ablation verdict | rolling-origin GBM | no exo feature adopted (honest null); weather train/serve study computed |
| Track B tests | `node --test proactive-brain/*.spec.ts` | **29 passed** |
| Typecheck | `tsc --noEmit` (proactive-brain + cards) | **0 errors** |
| patch-v2 closure logic | `is_closed()` per venue | TRT True, Ellel/BH False |

---

## 7. Changed / new files since `b82172a`

**New (Track A):** `ingest/stock_normalise.py`, `signals/stock_inventory.py`,
`signals/stock_inventory.md`, `tests/test_stock_inventory.py`, `data/stock/` (18 xlsx).
**Modified (Track A):** `config.py`, `hierarchy/reconcile.py`,
`hierarchy/reconciliation_forecast.md`, `service/app.py`, `README.md`, `FLAGS.md`,
`requirements.txt`, `scripts/run_all_venues.sh`, `store/manifest.json`.
**Modified (Track B):** `brain.tools.ts`, `brain.client.ts`, `brain.service.ts`,
`brain.service.spec.ts`, `brain.registration.spec.ts`,
`tool-cards/brain-cards.tsx`, `tool-cards/tool-card-router.tsx`.

---

## 8. Outstanding (owner action — outside the repo)

1. **Decision-log update** (`PRJ93_Decision_and_Resolution_Log.md`, not in repo): move
   *"Real stock data"* §B → §A — integrated via A11/A12, Beer-Hall-only, brewery scoped
   out; plus the A7 majority-gate row from the earlier patch phase.
2. **Confirm working assumptions:** FLAG-1 (March snapshot is the March count),
   FLAG-3 (supplier lead/safety days), TRT VAT basis.
3. **Nothing is committed** — the working tree above sits uncommitted on
   `feat/proactive-brain`.
