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

`Decision_and_Resolution_Log.md` is the archival decision log; its Section B ends
at row 5 (WP12 promotion). It does NOT record G12.9, G12.10, or G12.11: those
decisions live in `17_G12_9_Report.md`, `19_G12_10_Report.md` (see its
"Decision-log entries (G12.11)" section for rows B6 and B7), and `brain/FLAGS.md`.
Reconciling the archival log with the G12.9-onward lineage is an open task.
