# PRJ93 — Live Ingest, Freshness & Conditional Retrain: Build & Analysis Report

**Date:** 2026-07-01
**Phase:** Live-ingest / freshness / conditional-retrain (the three-tier model)
**Branch:** `main`
**Status:** complete. **157 brain pytest** + **32 proactive-brain TS specs** green; 0
new type errors; endpoint count 9 → 11; Track-B tools 7 → 8. Inert by default
(`LIVE_INGEST=False`, `INGEST_SOURCE=csv`): no forecast/ladder change today.

Companion to [PRJ93_Build_Report_Current.md](PRJ93_Build_Report_Current.md). This is
the focused analysis of the freshness layer.

---

## 1. The design driver: what the owner actually asks

The layer is shaped by Elliot's chat log (66 conversations, 376 owner messages).
Current partial-period facts dominate ("how are sales doing tonight?", "staff cost
this week Mon to now?", "who is on now?"). Three consequences: (1) freshness must
reach intraday, which a nightly-only pull cannot serve; (2) the full P&L answer is
composed from live facts plus the brain's learned context, not from the brain
alone; (3) the pull can be on demand and cached, not always on.

---

## 2. The three-tier freshness and cost model (the centrepiece)

Reading a fresh fact and re-learning the model are different jobs at different
costs. Separating them is the contribution: a transaction never touches the
expensive tier.

| Tier | Job | Trigger | Cost | Serves |
|---|---|---|---|---|
| **T1 live facts** | current sales/labour/COGS as-of now | owner asks; cached per venue+metric for `LIVE_CACHE_TTL_MIN` (10 min) | one Square read (miss); zero (hit) | "tonight", "this week Mon-now", "who is on" |
| **T2 incremental store** | append closed days + rebuild affected features + pull exo for the new span | new closed day; nightly cron | cheap append | forecast / deviation / change-point / stock / briefing |
| **T3 re-learn** | ladder re-fit + rung re-select | weekly boundary or confirmed change-point | expensive backtest | forecast accuracy / model currency |

**The cost guarantee (the "never retrain on one transaction" rule).** A transaction
only ever reaches T2, a cheap append. T2 triggers T3 only on a weekly cadence
boundary or a confirmed change-point since the last fit — never per transaction,
never per single day. This is enforced in `_should_refit`: `auto` returns False
when the last fit is unknown or no cadence boundary/new change-point has occurred,
and is covered by a gate test (`test_single_new_day_does_not_trigger_t3`).

**The owner's answer composes at T1 + T2, no T3.** "How are we doing tonight and is
that normal?" = tonight's live figure (T1) + the brain's expected band, forecast,
and deviation status (T2) + the attribution reason (T2). The model never re-fits to
answer a question.

---

## 3. What reaches DuckDB, and what never does (the point most likely to be misread)

- **Square data DOES reach the brain and IS warehoused**, through T2: the adapter's
  `fetch_transactions(since)` pulls closed-day rows and `refresh()` appends them into
  `line_items` and advances the `data_watermark`. Every module learns from that
  warehoused history. Square → DuckDB is a first-class path, not a dead end.
- **The T1 intraday figure is NEVER warehoused.** "Tonight so far" is read live,
  cached ~10 minutes, and discarded. Appending "£3,000 at 8pm Friday" as a completed
  day would corrupt the baseline. The unit of warehousing is the **completed trading
  day**; `_append_transactions` only ever adds days beyond the current ceiling.

**Default-state caveat.** All of this is inert while the shipped default
`LIVE_INGEST=False` / `INGEST_SOURCE=csv` holds: today the brain warehouses from the
CSVs. The switch is Ryan provisioning Square/Neon access and flipping the two env
vars. Until then `refresh()` is a genuine no-op (the CSV adapter's latest date
equals the warehouse ceiling), and the Square/Neon adapters are guarded stubs that
import no DB/HTTP client at load — so the brain stays standalone and DB-free.

---

## 4. Honest scope: what the brain owns, and what it borrows

- **The brain owns rhythm** — sales baseline, deviation, change-point, near-term
  forecast, stock cover, and the "why" (attribution). These it warehouses and learns.
- **The brain borrows facts** — live COGS, labour, and **net profit come from the
  existing Square tools on Track B**, not from the brain. For a full P&L-with-reason
  answer the agent reads those Square facts (T1) and the brain supplies "is that
  normal, what's the forecast, and why" (T2). *Net profit and labour are
  Square-sourced, not brain-computed* — stated plainly so no answer overclaims.

---

## 5. Architecture: one learned store, many readers; live facts on the side

Every module reads one DuckDB store, and appends are leak-free, so keeping that one
store fresh (T2) propagates to all readers without touching them. Live facts (T1)
sit beside it, read on demand and cached, composed with the learned context at
answer time.

- **Adapter seam** (`ingest/sources/`): `SourceAdapter` with `CsvAdapter` (default,
  working), `NeonAdapter` (intended primary), `SquareAdapter` (fallback). Selection
  is `INGEST_SOURCE`, config never model. Going live is a config swap.
- **T2 orchestrator** (`ingest/refresh.py`): append closed days → advance
  `data_watermark` → auto-exog for the new span → rebuild affected features →
  conditional T3.
- **T3 guard + audit**: re-fit via `ladder.evaluate_rolling` + `select_best` under
  the Tan adoption guard (adopt only if it beats the classical baselines); every
  re-fit writes a `ladder_selection(old_rung, new_rung, old_mase, new_mase, adopted,
  reason, ts)` row. No silent rung swap — this table is the dissertation's record of
  when and why the forecaster changed.

A smoke re-fit on the Beer Hall selected **rung2_ets** (MASE 0.844), adopted over
the seasonal-naive and robust-DOW baselines, and logged the selection — the audit
path works end-to-end.

---

## 6. Serving surface

- `GET /freshness?venue=<all|slug>` → per venue `{as_of, last_ingested_at, source,
  is_live, stale, staleness_days, last_refit, incumbent_rung}`.
- `POST /refresh?venue=&force=&refit=` → operator / cron only; runs T2 (+ conditional
  T3). **Not on the model surface.**
- **Freshness block** `{source, is_live, stale, staleness_days}` on `/forecast`,
  `/deviation/*`, `/briefing`, `/stock/cover` — so no answer is served without
  stating its own currency; a stale answer says so.
- `freshness="cached"|"live"` on the read endpoints; `live` performs a capped T2
  top-up (append closed days since the watermark), **never a T3 re-fit** (decision
  D1). Inert and a no-op while the CSV adapter sits at the ceiling.

**Track B** (additive, existing pattern): read-only `brain_data_freshness` (8th
tool) reports currency and never triggers work; an optional `freshness` flag is
threaded onto `brain_forecast_sales` / `brain_check_deviation` / `brain_daily_briefing`.
No refresh/mutation tool is exposed to the model; refresh rides the operator/cron
surface. `FreshnessCard` renders per-venue currency. No forbidden-file edits;
`orgId` from `DispatchContext`.

---

## 7. Honesty gates

| Gate | Guarantee |
|---|---|
| G-live-a no false live | `LIVE_INGEST=False` → whole layer on `CsvAdapter`; freshness `source=csv, is_live=false`; `live_facts` returns the inert envelope. |
| G-live-b exo honesty | auto-exog fills exactly the new span; recorded as reasoning-serving and forecast-neutral while the adopted exo set is empty. |
| G-live-c no silent rung swap | adopt only if beating the baselines; every re-fit logs `ladder_selection`. |
| G-live-d cost guarantee | `refresh()` no-op with no new data; a single new day never triggers T3. |
| G-live-e cache correctness | TTL honoured, keyed per venue+metric+window, force bypasses. |
| G-live-f no Neon dependency | brain runs with Neon/Square inert; no DB import at load; `CHECKLIST_LIVE=False`. |

---

## 8. Acceptance gates (G0–G9)

| Gate | Result |
|---|---|
| G0 direction (composes; nothing imports refresh back) | PASS |
| G1 adapter (csv default; neon/square inert, no DB import at load) | PASS |
| G2 watermark (fresh store not falsely stale on the CSV ceiling) | PASS |
| G3 T2 ingest (append + advance + idempotent, no full rebuild) | PASS |
| G4 auto-exog (fills the new span; honesty note present) | PASS |
| G5 T3 guard (cadence + change-point fire; a single day does not; never/force honoured) | PASS |
| G6 beat-the-rung (rung re-selected by MASE under the adoption guard; `ladder_selection` row) | PASS |
| G7 T1 + cache (inert while off; TTL + key + force-bypass) | PASS |
| G8 service + tool (`/freshness`, `/refresh`; freshness block; `freshness=live` capped top-up; 8th tool; card; typecheck clean) | PASS |
| G9 suite green (157 pytest + 32 TS specs; endpoints 11) | PASS |

---

## 9. Honest limitations & open dependencies (Ryan-gated)

1. **Neon system-of-record for T2 history.** `NeonAdapter` + DDL sketch ship inert;
   standing it up is Ryan's task. Swap: `INGEST_SOURCE=neon`, `LIVE_INGEST=True`.
2. **Square access to the brain env** for T1 live facts + the `SquareAdapter`
   fallback, separate from Track-B's credential store. Until then T1 is inert and the
   agent uses its own Square tools. `live_facts._fetch_metric` is the single swap-in.
3. **Checklist stays on Neon** (`CHECKLIST_LIVE=False`); flip once the read path and
   access exist.
4. **Stock is mock**; live stock rhythm needs Square inventory via the adapter.
5. **Cron ownership.** Nightly `refit=auto` (T2 + freshness) and weekly `refit=force`
   (T3) ride Track-B BullMQ (additive hook), Ryan sign-off like the other additive
   touch-points.
6. **Intraday-expectation curve** (for "is tonight-so-far unusual") is a bounded next
   step, not built here: it would store end-of-day snapshots of Square's hourly
   profile per closed day (still closed-day history at hourly grain, never a live
   moving figure), so the brain learns "expected sales by this hour on a Friday".

---

## 10. Owner action (outside the repo)
- **Decision-log row** for `PRJ93_Decision_and_Resolution_Log.md` (§B → built) — see
  paste-ready text below.
- Provision Neon / Square access and flip `LIVE_INGEST=True` (+ `INGEST_SOURCE`).
- Wire the nightly/weekly BullMQ ticks to `POST /refresh` (operator surface).

### Decision-log row (paste into §B)
> Live-ingest / freshness / conditional-retrain layer built on a three-tier cost
> model grounded in the owner's real query behaviour. T1 live facts (Square
> sales/labour/COGS, cached `LIVE_CACHE_TTL_MIN=10`, inert while `LIVE_INGEST=False`)
> answer "tonight / this week so far"; T2 `refresh()` appends closed days, advances
> `data_watermark`, auto-pulls exogenous for the new span, and rebuilds affected
> features leak-free; T3 re-fits the ladder and re-selects the rung by MASE under the
> adoption guard, only on a weekly boundary or a confirmed change-point, logging
> `ladder_selection`. A transaction never triggers T3. Owner answers compose T1 live
> fact + T2 learned band/forecast/reason, with net profit and labour stated as
> Square-sourced (the brain owns rhythm, not P&L). Pluggable `SourceAdapter` (`csv`
> default; `neon` primary and `square` fallback, inert behind `LIVE_INGEST`). `GET
> /freshness`, `POST /refresh` (operator/cron), freshness block on serving envelopes,
> `freshness="live"` capped top-up on read tools (never a re-fit), and a read-only
> Track-B `brain_data_freshness` tool (8th). Brain stays standalone and DB-free at
> import; Neon not stood up here; checklist stays `CHECKLIST_LIVE=False`; exogenous
> forecast-neutral while the adopted set is empty, and documented as such.
