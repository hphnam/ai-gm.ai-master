# PRJ93 log folder

Consolidated build reports, experiment reports, and the decision log for the
Proactive Brain (Track A). Files are numbered in order of implementation, traced
by each report's first-commit date across the project history. The `PRJ93_`
prefix has been dropped. Two provenances are gathered here:

- **Archival set** (originally at repo root on `feat/chronos2-promotion`): the
  WP1 to WP12 reports and the decision log.
- **Working-trunk set** (authored on `brain-construction`): the G12.9 / G12.10
  reports and the downstream rerun matrix.

## Reports, in implementation order

| # | File | First commit | Scope |
|---|---|---|---|
| 01 | `01_Phase2_Build_Report.md` | 2026-06-19 | Phase 2 build |
| 02 | `02_Phase2_Remediation_Report.md` | 2026-06-22 | Phase 2 remediation |
| 03 | `03_Build_Report_Current.md` | 2026-06-25 | Consolidated current build report |
| 04 | `04_ChangePoint_A13_Report.md` | 2026-06-29 | A13 change-point detection |
| 05 | `05_PointDeviation_Report.md` | 2026-06-29 | Point-deviation primitive |
| 06 | `06_Proactive_Briefing_Report.md` | 2026-07-01 | Proactive briefing capstone |
| 07 | `07_Live_Ingest_Report.md` | 2026-07-01 | Live-ingest / freshness / conditional retrain |
| 08 | `08_Promote_And_Serve_Report.md` | 2026-07-01 | Promote-and-serve (v2.1) |
| 09 | `09_Agent_Eval_Report.md` | 2026-07-03 | Agent evaluation framework |
| 10 | `10_Stock_Part2_Prefill_for_James.md` | 2026-07-03 | Stock Part 2 prefill (handoff) |
| 11 | `11_Scaled_Eval_Report.md` | 2026-07-06 | Scaled evaluation |
| 12 | `12_WorldCup_LiveProbe_Report.md` | 2026-07-06 | June 2026 live probe vs the withheld World Cup |
| 13 | `13_LiveIngest_Fixes_Report.md` | 2026-07-07 | Live-ingest fixes |
| 14 | `14_Fidelity_Corrections_Build_Report.md` | 2026-07-07 | Fidelity corrections build |
| 15 | `15_Fidelity_Corrections_Addendum_Report.md` | 2026-07-08 | Fidelity corrections addendum |
| 16 | `16_Chronos2_Promotion_Report.md` | 2026-07-08 | WP12 Chronos-2 promotion |
| 17 | `17_G12_9_Report.md` | 2026-07-08 | G12.9: fold unification, Ellel uncap, weather precision |
| 18 | `18_DOWNSTREAM.md` | 2026-07-08 | G12.9g downstream rerun matrix |
| 19 | `19_G12_10_Report.md` | 2026-07-08 | G12.10: TRT coord, is_ellel_event leak, full exo set, World Cup, Neon adapter; plus the G12.11 Ellel narrative correction and decision-log rows |
| 20 | `20_G12_12_GoLive_Forecast_Report.md` | 2026-07-09 | G12.12: go-live forecast attempt; clean STOP at gate a (June absent from store, Neon not provisioned) |
| 21 | `21_G12_13a_Frozen_Forecast_Report.md` | 2026-07-09 | G12.13a (Pass 1): forward June 2026 forecast frozen and pre-registered, blind to actuals |
| 22 | `22_G12_13b_June_Simulation_Report.md` | 2026-07-09 | G12.13b (Pass 2): frozen forecast confronted with real held-out June actuals (MCP-SIM); full brain run over June; leak-free |
| 23 | `23_G12_13_Canonical_Reconciliation_Report.md` | 2026-07-09 | G12.13 reconciled against the canonical Pass-1/Pass-2 specs; measured A-vs-B split closed (MinT wins BH/TRT L2/L3); provenance + reasoned .md added |
| 24 | `24_G12_15_Report.md` | 2026-07-10 | G12.15: Chronos on MPS (parity, CPU faster for small runs), home-nation fixture flags (Scotland matters), cadence sweep (BH 7-day sweet spot), event-aware refresh policy, stock flagged |
| 25 | `25_G12_16_Report.md` | 2026-07-10 | G12.16: Square-to-brain taxonomy map (`ingest/taxonomy_map.md`); mapped L2 re-score (unchanged); item-grain June pull (reconciles GBP 0.00); first real L3 item MASE (BH median 1.33, Ellel 0.24); finding is taxonomy drift not name misalignment (FLAG-TAXONOMY-DRIFT) |
| 26 | `26_G12_17a_July_Pass1_Report.md` | 2026-07-10 | G12.17a (Pass 1): advance clock (June ingested), liveness gate (TRT dormant), taxonomy refresh (LuneBrew Pilsner now tracked), June-inclusive refit (robust-DOW edges Chronos-exo, not adopted), frozen blind July 1-7 forecast committed as pre-registration |
| 27 | `27_G12_17b_July_Pass2_Report.md` | 2026-07-10 | G12.17b (Pass 2): July 1-7 confronted (BH L1 MASE 0.39, beats backtest class); in-context test (1 Jul lifted above baseline in anticipation, single-case); drift decomposition (Ellel named coverage +38pp); brain over July (0 new-items/week fatigue, TRT no alarm spam, liveness gate confirmed vs reality) |
| 28 | `28_G12_17c_July_Window2_Freeze_Report.md` | 2026-07-10 | G12.17c (Step C1): freeze a second blind July window (8-14 July) from the same June-inclusive cutoff, carrying the England QF (11 Jul, in-hours) + two generic matches; airtight-by-calendar pre-registration (11-14 Jul still future); BH lifts every match date, England most (+GBP 312 vs generics); flags asserted; deviation: Ellel's late Saturday window fires its 11 Jul England flag (inert, robust-DOW reads no wc). Step C2 (confront) awaits after 2026-07-14 |
| 29 | `29_G12_17cb_Corrected_Freeze_Report.md` | 2026-07-10 | G12.17c-b (Corrected C1): advance the clock through 7 July (ingest 1-7 July as observed history) and re-freeze 8-14 July from the 7-July cutoff (Origin B, true 7-day horizon) alongside the untouched Origin A; same models, differ only in cutoff. Honest null: the extra week does NOT sharpen the 11 Jul England anticipation (+GBP 309 vs A's +312) but RAISES the generic-match anticipation (9 Jul +32, 10 Jul +57), narrowing the home-nation premium; C2 scores both origins after 2026-07-14 |

`Decision_and_Resolution_Log.md` is intentionally un-numbered: it is a
cross-cutting, append-only record spanning WP1 to WP12, not a single
implementation step.

## Ordering caveats

The order is by first-commit date, which mostly matches logical implementation
order but diverges in a few late-committed docs (several reports for earlier work
were committed in a burst on 2026-07-06 to 08). Notably, `12_WorldCup_LiveProbe`
is commit-dated before `16_Chronos2_Promotion` even though the live probe builds
on the promoted Chronos-2 model. Re-order by hand if a strict work-package
sequence is preferred over commit date.

## Decision log coverage

`Decision_and_Resolution_Log.md` is the continuous WP1-to-present decision log.
Section A covers the fidelity corrections, Section B the WP8 to WP12 addendum and
Chronos-2 closeout (rows 1 to 5), and Section C the post-WP12 milestones: G12.9 to
G12.11 (rows 6 to 10, reconciled in from `17_G12_9_Report.md` and
`19_G12_10_Report.md`), G12.12 (row 11), the G12.13 June confrontation (row 12
G12.13a pre-registration, row 13 G12.13b out-of-sample result), and the G12.17 July
work (row 17 G12.17a Pass-1 freeze, row 18 G12.17b Pass-2 confront, row 19 G12.17c
Step-C1 second-window freeze, row 20 G12.17c-b corrected 7-day-cadence re-freeze).
The three G12.11
rows the G12.10 report labels B6/B7/B8 are Section C rows 8, 9, and 10.
`brain/FLAGS.md` remains the live flag ledger.
