# PRJ93 log folder

Consolidated build reports, experiment reports, and the decision log for the
Proactive Brain (Track A). Two provenances are gathered here:

- **Archival set** (originally at repo root on `feat/chronos2-promotion`, brought
  in verbatim): the WP1 to WP12 reports and the decision log.
- **Working-trunk set** (authored on `brain-construction`): the G12.9 and G12.10
  reports and the downstream rerun matrix.

## Build and experiment reports

| File | Scope |
|---|---|
| `PRJ93_Build_Report_Current.md` | Current consolidated build report |
| `PRJ93_Phase2_Build_Report.md` | Phase 2 build |
| `PRJ93_Phase2_Remediation_Report.md` | Phase 2 remediation |
| `PRJ93_Fidelity_Corrections_Build_Report.md` | Fidelity corrections build |
| `PRJ93_Fidelity_Corrections_Addendum_Report.md` | Fidelity corrections addendum |
| `PRJ93_ChangePoint_A13_Report.md` | A13 change-point detection |
| `PRJ93_PointDeviation_Report.md` | Point-deviation primitive |
| `PRJ93_Proactive_Briefing_Report.md` | Proactive briefing capstone |
| `PRJ93_Agent_Eval_Report.md` | Agent evaluation framework |
| `PRJ93_Scaled_Eval_Report.md` | Scaled evaluation |
| `PRJ93_Live_Ingest_Report.md` | Live-ingest / freshness / conditional retrain |
| `PRJ93_LiveIngest_Fixes_Report.md` | Live-ingest fixes |
| `PRJ93_Promote_And_Serve_Report.md` | Promote-and-serve (v2.1) |
| `PRJ93_Chronos2_Promotion_Report.md` | WP12 Chronos-2 promotion |
| `PRJ93_WorldCup_LiveProbe_Report.md` | June 2026 live probe vs the withheld World Cup (run on the archival branch's June-landed store) |
| `PRJ93_Stock_Part2_Prefill_for_James.md` | Stock Part 2 prefill (handoff) |
| `DOWNSTREAM.md` | G12.9g downstream rerun matrix |
| `PRJ93_G12_9_Report.md` | G12.9: fold unification, Ellel uncap, weather precision |
| `PRJ93_G12_10_Report.md` | G12.10: TRT coord, is_ellel_event leak, full exo set, World Cup, Neon adapter; plus the G12.11 Ellel narrative correction and decision-log rows |

## Decision log coverage

`PRJ93_Decision_and_Resolution_Log.md` is the archival decision log; its Section B
ends at row 5 (WP12 promotion). It does NOT record G12.9, G12.10, or G12.11: those
decisions live in `PRJ93_G12_9_Report.md`, `PRJ93_G12_10_Report.md` (see its
"Decision-log entries (G12.11)" section for rows B6 and B7), and `brain/FLAGS.md`.
Reconciling the archival log with the G12.9-onward lineage is an open task.
