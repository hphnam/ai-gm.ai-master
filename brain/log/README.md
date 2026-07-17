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
| 30 | `30_G12_18_Comment_Rewrite_Report.md` | 2026-07-10 | G12.18: edit-in-place pass over `brain/**/*.py` comments and docstrings via the avoid-ai-writing skill (technical voice). Vocabulary already clean; the one tell at scale was the em-dash separator. 212 spaced dashes rewritten to punctuation across 53 files (comments + docstrings only); 159 runtime-string dashes and all unspaced numeric/gate ranges preserved; 0 non-py files touched; both suites green. No confirmed stale notes; glossary drafted with a placement question |
| 31 | `31_G12_17c_C2_Confront_Report.md` | 2026-07-16 | G12.17c (Step C2): confront BOTH 8-14 July origins with held-out actuals (pulled 2026-07-16, after the window closed - airtight by calendar). Accuracy holds: BH L1 per-day MASE 0.285 (A) / 0.287 (B), beating the 1-7 July 0.386, band coverage 1.00 (the 11 Jul +GBP 574 miss stayed in-band). Origin B does NOT beat Origin A - an honest null corroborating report 24's cadence sweep. **The pre-registered England anticipation FAILS:** both origins expected ~+GBP 310 on the 11 Jul QF; realised -GBP 265, wrong in sign, so the two-case record is 1 for 2. The kickoff-time explanation is REFUTED by 27 Jun (same Sat, same 22:00, +234%, the largest lift on record); the shortfall is unexplained by `CHRONOS2_EXO_COLS`. Supersedes report 24's "England +130%, generic within noise". TRT dormant, no false alarm (3rd confirmation). Caveat: Ellel's 0.096 MASE is an artefact hiding a 90.2% under-forecast |

| 32 | `32_G13_Production_Integration_Report.md` | 2026-07-16 | G13: prepare the engine to run as a per-org service inside gm-ai. Ryan's integration brief verified claim-by-claim: its central call (stateless compute, API owns persistence) is right and adopted; three claims are wrong, and the worst one traces to THIS project's stale `FLAGS.md`, not the reader — `7d8bfbd` scoped the A14 verdict everywhere except the live ledger, and the brief read the ledger. Hardening: bearer auth (bytes compare — the str form 500s on a non-ASCII token), secure-by-default posture after the first cut **failed open** on a typo, `/docs` nulled, `POST /refresh` deleted (honest remainder: `?freshness=live` still writes, now bounded). Stateless compute built on a per-request scratch seam rather than rewriting ~157 call sites; Neon/Square adapters + psycopg **deleted, not disabled** (retiring finding L3 by removal). The isolation claim survived an adversarial review that could not falsify it. Two bugs found by building: an org with no sales 503'd (the first thing a new tenant hits), and the contract accepted covariates then dropped them silently. Suites 307/8 and 314/1; **C2 reproduces bit-for-bit** |
| 33 | `33_G14_De_Lune_Report.md` | 2026-07-17 | G14 (Phase 3): the de-Lune pass report 32 §6 deferred — but the headline is what building it found. **Compute did not forecast.** `_forecast_venue` drained `conformal.wrap.evaluate`, which is a BACKTEST: 57 rows returned, 57 for dates already inside the supplied history, **0 after it**; the API would have persisted banded, model-named predictions about days that had already happened. Phase 2's own diagnostic ("horizon_days NOT honoured; the analytics emit their own horizon") was true and misleading — there was no horizon — the exact failure `_report_unconsumed` exists to prevent. `compute/forward.py` fixes it. The seam (`org_profile.py`): UNBOUND = Lune's `config.py` so the research path reproduces; BOUND = the profile **entirely**, since a per-field fallback would hand Lune's Mon/Tue closure to a seven-day tenant *through the Mondrian grouping* — a miscalibrated band, not an error. Exposed a latent bug: the grouping read the **literal** `(0, 1)`, so `STRUCTURAL_ZERO_DOW` never reached the band it defines. Two Lune reads were silent wrongness not crashes (`NaT` poisoning `max()` made `is_closed` False for every tenant **by accident**; the hardcoded `"ellel"` slug zeroed a tenant's spillover). Closed the hole under `extra="forbid"`: `values` is a free dict, so `exo_tempc` validated and did nothing. Three CONTRACT.md claims corrected — incl. `is_event_driven` never capping the rung (stale by a fortnight; same species as Ryan's error, this time in our own contract) — and the weather decision **reversed against the contract's own recommendation**. Honest correction: C2 **re-scores a frozen artefact**, so report 32's "reproduces bit-for-bit" never proved forecast generation; the real gate is the training-frame hash, byte-identical on all three venues. **Review found seven defects and three were this module breaking its own stated rule** — both reviewers independently found the worst first: `exo_is_dry` **inverted between train and serve**, feeding Lune's flagship served entrant a covariate that read 0 in training and 1 at serving, silently. Plus: a band calibrated on ≤7-step errors applied to day 30 (a caveat `sim/` documents and the port dropped), 13 columns missing so `rung3_gbm` raised KeyError, `exo_enabled` gating only half the pipeline, and (security, HIGH) one typo'd year in a POS export → **~9,272 re-fits from a 2-row request**. All fixed and re-measured. Suites 356/8 and 363/1 |

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
