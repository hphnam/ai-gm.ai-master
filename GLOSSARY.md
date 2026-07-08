# Glossary — what the short codes mean

The PRJ93 reports, the `brain/` docs, and the git history use a handful of short
codes (`A6`, `Rung 3`, `WP9`, `G12.4`, `FLAG-CP1`, `L1`, `T2`). They were handy
while the work was being built but mean nothing to someone new to the repo. This
file is the decoder. Nothing here renames anything — the codes stay as they are;
this just says what each one points at.

If you add a new code, add a row here in the same pass.

## How to read a code

- **`A<n>`** — a step in the `brain/` forecasting pipeline (A0 first, A14 last).
  See the table below. Watch out: the web/API test specs under
  `.paul/phases/05-web-interface/` reuse `A<n>` for something unrelated (see
  ["The overloaded A prefix"](#the-overloaded-a-prefix)).
- **`Rung <n>`** — a tier of the forecasting model ladder (Rung 0 simplest,
  Rung 4 most complex).
- **`L1 / L2 / L3`** — hierarchy layers: venue / category / item.
- **`T1–T4`** — data-freshness tiers (how live a number is).
- **`WP<n>`** — a work package: one build increment, in order. Roughly one per
  git commit cluster.
- **`G<n>` / `G<n>.<m>`** — an acceptance gate (a pass/fail check). Mostly
  numbered locally inside one report, so `G1` in one report is not `G1` in
  another. The `G12.x` series is the exception (see WP12 below).
- **`FLAG-XX<n>`** — a standing flag or open question. The letters name the area
  (`CP` change-point, `FE` feature-enrichment, …). `brain/FLAGS.md` is the
  authoritative register.

## Brain pipeline steps (A0–A14b)

The pipeline runs top to bottom; each step gates the next. Canonical order and
the module that owns each step:

| Code | Step | Module |
|---|---|---|
| A0  | Ingest & normalise the Square export into a tidy long table | `ingest/normalise.py` |
| A1  | Build the DuckDB warehouse (L1/L2/L3 views + helpers) | `store/warehouse.py` |
| A2  | Evaluation harness: splits, MASE/coverage/Winkler, rolling-origin, LOVO | `eval/harness.py` |
| A3  | Build the leak-free L1 feature table | `features/build_features.py` |
| A4  | Model ladder: fit rungs 0–4 and pick a winner | `models/ladder.py` |
| A5  | Conformal band around the chosen forecast (the Objective 1 deliverable) | `conformal/wrap.py` |
| A6  | MinT hierarchy reconciliation + keg-consumption proxy (Beer Hall) | `hierarchy/reconcile.py` |
| A7  | Leave-one-venue-out onboarding transfer | `transfer/lovo.py` |
| A8  | Chat-log KB-gap detection (ranked SOP gaps) | `signals/chatlog_kb_gap.py` |
| A9  | Checklist completion-discipline detector | `signals/checklist_discipline.py` |
| A10 | The HTTP service (`/forecast`, `/briefing`, …) | `service/app.py` |
| A11 | Stock ingest & normalise (bar-stock panel) | `ingest/stock_normalise.py` |
| A12 | Stock days-of-cover reorder signal (reads A6) | `signals/stock_inventory.py` |
| A13 | Change-point / regime-shift detection on the residual stream | `signals/change_point.py` |
| A14 | Feature enrichment: weather, calendar, local events + adoption ablation | `ingest/*`, `signals/feature_ablation.py` |
| A14b | Weather/calendar diagnostic (checks the A14 null; adopts nothing) | `signals/weather_diagnostic.py` |

The matching tests are `brain/tests/test_a<n>_*.py` (e.g. `test_a6_reconcile.py`).

## Model ladder rungs (Rung 0–4)

| Rung | Model | Note |
|---|---|---|
| 0 | Seasonal-naïve (lag-7) | The MASE denominator |
| 1 | Robust day-of-week × seasonal index | The interpretable baseline |
| 2 | Classical decomposition (ETS / Prophet / STL) | |
| 3 | Gradient boosting (+ a global cross-venue pool) | The only rung that uses engineered features |
| 4 | Foundation models (Chronos-2, Chronos-2 + covariates, Chronos-Bolt) | Adopted only if it beats the lower rungs |

## Hierarchy layers (L1 / L2 / L3)

Standard bottom-up forecasting notation:

- **L1** — venue total (daily net sales for one site).
- **L2** — category within a venue.
- **L3** — individual item.

## Freshness tiers (T1 / T2 / T3 / T4)

How current a served number is, cheapest to most expensive:

- **T1** — live facts read on demand from Square and cached (~10 min); never stored.
- **T2** — append newly-closed trading days to the store (nightly).
- **T3** — conditional model re-fit (weekly boundary or a confirmed change-point).
- **T4** — recalibration after a change-point (the "relearn normal" step; partly future work).

## Work packages (WP1–WP12)

The fidelity-corrections and Chronos-2 build sequence. Each is one increment,
in order:

| WP | What it did |
|---|---|
| WP1  | Fidelity wording and citation corrections |
| WP2  | L3 intermittency diagnostic + conditional Croston/SBA |
| WP3  | Resolve FLAG-CP1 (the ARL₀ operating point) |
| WP4  | Rung 4 Chronos-Bolt zero-shot through the adoption gate |
| WP5  | Detector-level VUS-PR supplement (scaled run) |
| WP6  | ACI coverage across the TRT closure (report-only) |
| WP7  | Decision-log rows for the fidelity corrections |
| WP8  | Working eval venv + Croston initialisation settled by the oracle |
| WP9  | Rung-4 upgraded to Chronos-2 and actually run |
| WP10 | VUS-PR supplement computed in the eval venv |
| WP11 | Addendum closeout (LOVO D4, ADI note, decision log, reports) |
| WP12 | Nightly Chronos-2 promotion job (the G12.x gates below) |

## Acceptance gates (G-codes)

A `G<n>` is a pass/fail check in a report's gate table. Numbering is **local to
each report** — treat `G1`/`G2`/… as "gate 1, gate 2 of *this* document," not as
a repo-wide ID. When you see a bare `G7`, read it in the report you found it in.

The one repo-wide series is **`G12.x`**, the sub-gates of WP12:

| Gate | Check |
|---|---|
| G12.1 / G12.2 | `rung4_chronos2_exo` entrant added; gate confirms exogenous covariates win on Beer Hall |
| G12.3 | Forecast venv (the production nightly environment) |
| G12.4 | Refit + promotion environment guards (no silent demotion) |
| G12.5 | Exogenous coverage verified; assertion tests for the raise path |
| G12.6 / G12.7 | Actual Beer Hall promotion; deviation-sensitivity check (zero change) |
| G12.8 | Closeout (decision log, addendum section, dedicated report) |

## Standing flags (FLAG-XX)

Open questions and caveats that were flagged rather than silently coerced.
`brain/FLAGS.md` is the full register; this is just the prefix key:

| Prefix | Area |
|---|---|
| `FLAG-1`…`FLAG-8` | Data caveats and stock-integration flags |
| `FLAG-CP<n>` | Change-point detection (A13) |
| `FLAG-FE<n>` | Feature enrichment (A14) |
| `FLAG-WD<n>` | Weather/calendar diagnostic (A14b) |
| `FLAG-PD<n>` | Point-deviation signal |
| `FLAG-BR<n>` | Proactive briefing |
| `FLAG-LI<n>` | Live ingest / freshness |

## The overloaded A prefix

`A<n>` means two unrelated things depending on where you are:

- Under `brain/` and in the `PRJ93_*` reports, `A<n>` is a **forecasting
  pipeline step** (the table above).
- Under `.paul/phases/05-web-interface/`, `A<n>` (and `A8b`, `A16b`, plus `D<n>`)
  are **web/API acceptance-test case IDs** — e.g. "A16b: POST /feedback with a
  USER messageId returns 400." Same letter, different world.

If a code near a `/chat` or `/feedback` endpoint looks like a pipeline step, it
isn't — it's a test case.

## PRJ93 report index

The build/analysis reports at the repo root, and what each covers:

| File | Covers |
|---|---|
| `PRJ93_Phase2_Build_Report.md` | The Phase-2 brain build, end to end |
| `PRJ93_Phase2_Remediation_Report.md` | Fixes after the Phase-2 build |
| `PRJ93_Build_Report_Current.md` | Consolidated current-state build report |
| `PRJ93_ChangePoint_A13_Report.md` | A13 change-point detection build & analysis |
| `PRJ93_PointDeviation_Report.md` | The per-day point-deviation signal |
| `PRJ93_Proactive_Briefing_Report.md` | The briefing capstone that composes the signals |
| `PRJ93_Live_Ingest_Report.md` | Live ingest, freshness, conditional retrain |
| `PRJ93_LiveIngest_Fixes_Report.md` | Cross-venue append + dual-layer weather fixes |
| `PRJ93_Promote_And_Serve_Report.md` | Promote-and-serve (live ingest v2.1) |
| `PRJ93_Chronos2_Promotion_Report.md` | WP12 Chronos-2 promotion |
| `PRJ93_Scaled_Eval_Report.md` | Scaled evaluation run + labelling protocol |
| `PRJ93_Agent_Eval_Report.md` | Agent-evaluation (briefing usefulness) |
| `PRJ93_WorldCup_LiveProbe_Report.md` | June 2026 live probe on real data |
| `PRJ93_Fidelity_Corrections_Build_Report.md` | Fidelity-corrections build (WP1–WP7) |
| `PRJ93_Fidelity_Corrections_Addendum_Report.md` | Addendum build (WP8–WP12) |
| `PRJ93_Decision_and_Resolution_Log.md` | Running log of decisions and their resolutions |
| `PRJ93_Stock_Part2_Prefill_for_James.md` | Beer Hall keg → till-item mapping hand-off |

## External references (§)

Two documents live outside the repo and are cited by section number:

- **`methodology §<n>`** — the dissertation methodology chapter (e.g. `§2` conformal
  prediction, `§6` reconciliation).
- **`Data Audit Report §<n>`** — the data-audit document. `§8.3` (why Ellel is
  capped at Rung 1) is the one cited most.

If you have these two documents, keep them alongside the repo; the reports assume
the reader can reach them.
