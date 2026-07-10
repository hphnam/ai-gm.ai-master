# 30 - G12.18: rewrite AI-sounding comments and docstrings in plain engineer voice

Spec: `PRJ93_Spec_G12_18_Comment_Rewrite.md`. Branch `brain-construction`. An edit-in-place
pass over `brain/**/*.py` comments and docstrings, governed by the avoid-ai-writing skill
in `edit` mode, voice `technical`. Code, runtime strings, and every non-`.py` file are left
untouched. Zero em-dashes in the edits or in this report.

Committed under Nam only.

## Method

The skill defines the tells and the edit discipline; this pass applies it. In this codebase
the vocabulary is already clean, so the audit found essentially one tell at scale: the
em-dash / en-dash as a prose separator in comments and docstrings, the top formatting tell
and a pattern the project already bans in its own reports. The `technical` voice prefers
plain punctuation and one idea per sentence, so each flagged dash became a comma (the safe
default for the appositive and list uses that dominate here), a period where it joined two
independent clauses, or nothing where it trailed a clause.

To keep the excluded surfaces safe, every occurrence was first classified by token role
(comment / docstring / runtime-string / code) with the Python tokenizer and AST. Only
comment and docstring tokens were edited. The 159 em-dashes inside `print` / `log` / `raise`
/ warning strings and other literals were identified and left byte-for-byte unchanged
(re-verified after the pass: still 159). Numeric and gate ranges use UNSPACED dashes
(`16:00-22:00`, `9-12 Oct`, `G0-G9`), so restricting edits to SPACED separators preserved
every number, threshold, and range as required by A18.2.

## Census

| Metric | Value |
|---|---|
| `.py` files scanned (`brain/**/*.py`, excluding `.venv*`) | 106 |
| Files edited | 53 |
| Files with no edits | 53 |
| Lines changed | 212 (212 insertions, 212 deletions) |
| Non-`.py` files touched | 0 |
| Runtime-string / code em-dashes changed | 0 (159 preserved) |

Editable em-dashes by role at the start: 52 in comments, 169 in docstrings (221 lines).
212 were rewritten; the 9 not rewritten were unspaced numeric or gate ranges left intact as
facts (for example `local_events.py` `6-8 Nov`, the test gate ranges `G0-G9`).

Edits by directory: eval 53, signals 41, ingest 40, tests 22, root (`config.py`) 18,
models 11, store 6, features 5, transfer 5, hierarchy 4, service 4, conformal 3.

Clean files (no edits), by area: all 18 `sim/` scripts (authored under the no-em-dash rule,
so nothing to fix), 15 `tests/`, 5 `eval/`, 3 `models/`, 3 `ingest/`, and one each in
transfer, store, signals, service, ingest/sources, hierarchy, features, conformal, plus
`__init__.py`. The complete before/after record is Appendix A and the commit diff.

## Non-mechanical edits (called out)

Three edits are not the plain dash-to-comma substitution:

1. `ingest/local_events.py:37` REWRITE. The em-dash led a comment continuation line
   (`# - 9-12 Oct 2025, ...` continuing the event named on line 36). A blind comma gave
   `#, 9-12 Oct`, so it was hand-set to `# 9-12 Oct 2025, ...` (the date continues the
   description). Fact preserved (`9-12 Oct` untouched).
2. `signals/change_point.py:17` and `signals/residual.py:18` REWRITE. The identical line
   `This module changes no forecast - it reads existing store data only.` is two independent
   clauses, so it became two sentences: `This module changes no forecast. It reads existing
   store data only.` rather than a comma splice.

## What the audit did NOT find

The vocabulary is clean: no Tier-1 filler (`delve`, `tapestry`, `showcasing`, `leverage` as
a verb in prose), no copula avoidance (`serves as` / `acts as` in a comment or docstring),
no significance inflation, no `Let's` openers, no chatbot artifacts, no rule-of-three
padding worth cutting. `harness` and `robust` appear only as the eval-harness concept and
the `rung1_robust_dow` model name (code identifiers, never edited). So the pass is
deliberately narrow: it removed the one pervasive formatting tell and left the already-human
prose alone, per the skill's rule against over-editing.

## FLAG (stale) - for Nam to confirm, not edited

The stale-note search (TODO/FIXME/HACK markers; `superseded` / `deprecated` / `no longer` /
`pending` scans; FLAG references cross-checked against `FLAGS.md`; known-renamed terms such
as the TRT coordinate placeholder and the MAX_RUNG cap) surfaced NO confirmed stale comment.
The comments that mention change all describe the CURRENT state correctly (for example
`test_promote_and_serve.py:179` and `conformal/wrap.py:60` correctly say Ellel is no longer
Rung-1 capped now that `MAX_RUNG` is empty; `config.py:224` carries the confirmed TRT
coordinate, not the old placeholder).

Two comments are open-by-design rather than stale, flagged only so Nam can decide whether
they still need confirming:

- `config.py:136` (`VAT_RULE` note): TRT Net Sales treated as VAT-inclusive is "a working
  assumption pending owner confirmation". Still pending, so still accurate; listed in case
  the owner has since confirmed.
- `config.py:178` (`STOCK_LEAD_TIME_DAYS` / safety stock): "working assumptions pending"
  Ryan/James confirmation (FLAG-3). Same status.

Neither was edited or deleted.

## GLOSSARY ADD - drafted, placement question for Nam

There is no glossary file today. The spec says not to create one; these are drafted for Nam
to place. Candidates are the internal abbreviations and project nouns a new reader cannot
resolve from the code alone (usage counts in parentheses):

- **MASE** (287): mean absolute scaled error, the forecast accuracy metric, scaled by the
  seasonal-naive (lag-7) in-sample error. Below 1 beats seasonal-naive.
- **MinT** (68): minimum-trace hierarchical reconciliation, makes L1/L2/L3 forecasts sum
  coherently.
- **DOW** (199): day of week.
- **ADI** (26): average demand interval, the intermittency measure gating sparse L3 nodes.
- **CUSUM / BOCPD / ARL0** (37 / 18 / 9): cumulative-sum change detector; Bayesian online
  change-point detection; average run length to first false alarm (the change-point
  calibration target).
- **NDCG** (16): normalised discounted cumulative gain, the briefing ranking metric.
- **LOVO** (16): leave-one-venue-out, the onboarding-transfer evaluation.
- **conformal / Mondrian** (146 / 15): split-conformal prediction bands; Mondrian =
  group-conditional conformal (per venue/level).
- **rung / ladder** (139): the model-complexity ladder (Rung 0 seasonal-naive up to Rung 4
  foundation models); the served model is the adopted rung.
- **exo** (exogenous, e.g. `exo_temp_c`): known-future covariates (weather, calendar, World
  Cup flags) fed to the forecaster.
- **hindcast / leadmatched / observed** (62 / 25): the three weather bases; hindcast is the
  historical-forecast product that matches serving, observed is ERA5 reanalysis, leadmatched
  is the forecast as issued N days ahead.
- **is_ellel_event** (87): the Ellel booking-day flag (a near-deterministic self-signal,
  dropped from Ellel's own entrant to avoid leakage).
- **T1 / T2 / T3** (24 / 46 / 81): the live-ingest tiers, live facts / history source /
  conditional re-fit.
- **ex-VAT** (45): net of value-added tax; the L1 revenue basis.
- **L1 / L2 / L3**: venue-total / category / item revenue levels of the hierarchy.
- **MCP-SIM** (30): the labelled Square-connector stand-in for the production `NeonAdapter`,
  used where Neon is not provisioned.

Placement question: should this live in a new `brain/GLOSSARY.md` (its own file, linked from
`brain/README` if one exists), a `## Glossary` section appended to an existing top-level
`brain` doc, or a docstring block in `config.py` (where many of the constants are defined)?
No file was created pending that decision.

## Verification

Every edited file re-parses (`ast.parse` across all 106). Both suites green with the same
counts as before the pass, confirming comments-only edits changed no behaviour:
`.venv-forecast` 269 passed 1 skipped; `.venv` 262 passed 8 skipped. The suite run rebuilt
the store to the May seed (report 27 durability caveat); it was re-ingested June- and
July-1-to-7-inclusive afterwards, so the ongoing July experiment state (ceiling 2026-07-07)
is preserved. No `.md`, log, report, `.json`, `.parquet`, or vendored file was modified.

## Appendix A: complete rewrite list (path, line, original, new)

Every applied REWRITE, grouped by file. Line numbers are pre-edit. This plus the commit diff
is the full audit trail.

```text

### config.py
  L4: so every module reads the same source of truth. No secrets — the Voyage key is
    -> so every module reads the same source of truth. No secrets, the Voyage key is
  L86: # Forecast targets — the three real venues.
    -> # Forecast targets, the three real venues.
  L104: # (Mon/Tue) but *any* zero-revenue day — they simply have no sales most days.
    -> # (Mon/Tue) but *any* zero-revenue day, they simply have no sales most days.
  L128: # The audit's Beer Hall L1 net-sales (ex-VAT) total — A1/A3 reconcile to this.
    -> # The audit's Beer Hall L1 net-sales (ex-VAT) total, A1/A3 reconcile to this.
  L137: # (standing flag — see FLAGS.md).
    -> # (standing flag, see FLAGS.md).
  L173: # Raw monthly bar-stock sheets live here (Beer Hall only — no TRT/Ellel sheets
    -> # Raw monthly bar-stock sheets live here (Beer Hall only, no TRT/Ellel sheets
  L181: STOCK_LEAD_TIME_DAYS = 3        # supplier lead time — CONFIRM with Ryan/James (FLAG-3)
    -> STOCK_LEAD_TIME_DAYS = 3        # supplier lead time, CONFIRM with Ryan/James (FLAG-3)
  L204: # and items A6 buckets into OTHER are not forecast — both are left unmapped so the
    -> # and items A6 buckets into OTHER are not forecast, both are left unmapped so the
  L243: # PredictHQ token is read from os.environ["PREDICTHQ_TOKEN"] at call time — never
    -> # PredictHQ token is read from os.environ["PREDICTHQ_TOKEN"] at call time, never
  L252: # is_spike_day threshold (Σdiscounts / Σgross_sales). Retrospective only — never
    -> # is_spike_day threshold (Σdiscounts / Σgross_sales). Retrospective only, never
  L256: # --- Weather/calendar diagnostic (A14b) — diagnostic only, adopts nothing ----
    -> # --- Weather/calendar diagnostic (A14b), diagnostic only, adopts nothing ----
  L284: # (distinct from change-point's persistence-aware severity — FLAG-PD2).
    -> # (distinct from change-point's persistence-aware severity, FLAG-PD2).
  L295: # feed. No new detection maths — every constant below is a knob on the synthesis
    -> # feed. No new detection maths, every constant below is a knob on the synthesis
  L301: # G5a — checklist/SOP data is template-only until Ryan's completion export lands.
    -> # G5a, checklist/SOP data is template-only until Ryan's completion export lands.
  L317: # G5b — a single-day deviation on a sparse (event-only) venue gets a narrow band
    -> # G5b, a single-day deviation on a sparse (event-only) venue gets a narrow band
  L364: EVAL_INJECT_SHIFT_Z = 1.6         # regime-shift step size (band-half units) — smoke run
    -> EVAL_INJECT_SHIFT_Z = 1.6         # regime-shift step size (band-half units), smoke run
  L365: EVAL_INJECT_SPIKE_Z = 3.0         # single-day spike/dip size (band-half units) — smoke run
    -> EVAL_INJECT_SPIKE_Z = 3.0         # single-day spike/dip size (band-half units), smoke run
  L367: # event the brain catches before it misses) — the headline result, not a pooled F1.
    -> # event the brain catches before it misses), the headline result, not a pooled F1.

### conformal/wrap.py
  L1: """A5 · Conformal wrapper — the deliverable of Objective 1 (methodology §2/§5).
    -> """A5 · Conformal wrapper, the deliverable of Objective 1 (methodology §2/§5).
  L149: # calibrated/validated against — the closure is a structural break.
    -> # calibrated/validated against, the closure is a structural break.
  L348: # Coverage is reported honestly — any miss here is over-coverage (the
    -> # Coverage is reported honestly, any miss here is over-coverage (the

### eval/agent_eval.py
  L3: Answers "is the proactive briefing USEFUL?" — not "is the forecast accurate?" (A2
    -> Answers "is the proactive briefing USEFUL?", not "is the forecast accurate?" (A2
  L10: * detection   — precision / recall / F1 on catching the injected event
    -> * detection, precision / recall / F1 on catching the injected event
  L11: * ranking     — NDCG + Spearman on a multi-event day (shift ranked above spike)
    -> * ranking, NDCG + Spearman on a multi-event day (shift ranked above spike)
  L12: * attribution — top-1 cause, INCLUDING the honest-null case (no planted cause)
    -> * attribution, top-1 cause, INCLUDING the honest-null case (no planted cause)
  L13: * latency     — days from injected onset to first surfaced (regime shift)
    -> * latency, days from injected onset to first surfaced (regime shift)
  L14: * fatigue     — surfacing rate on un-injected windows (a false-alarm upper bound)
    -> * fatigue, surfacing rate on un-injected windows (a false-alarm upper bound)
  L15: * cost        — Ask-F1 miss:false-alarm sweep (how the cost reading moves)
    -> * cost, Ask-F1 miss:false-alarm sweep (how the cost reading moves)
  L49: as `briefing.collect` does from the store — but over the perturbed stream."""
    -> as `briefing.collect` does from the store, but over the perturbed stream."""
  L116: at or after its onset (within tolerance on the early side) is the same event — its
    -> at or after its onset (within tolerance on the early side) is the same event, its
  L149: """Wilson score interval for a proportion — honest for the small n here."""
    -> """Wilson score interval for a proportion, honest for the small n here."""
  L179: sparse deviation window. Small by design (a ~270-day estate) — reported with N."""
    -> sparse deviation window. Small by design (a ~270-day estate), reported with N."""
  L191: """The same held-out window with the injection removed — the background the
    -> """The same held-out window with the injection removed, the background the
  L194: not the dataset end — otherwise non-final-fold background is not subtracted and
    -> not the dataset end, otherwise non-final-fold background is not subtracted and
  L203: judged only on INJECTION-ATTRIBUTABLE items — those absent from the same window
    -> judged only on INJECTION-ATTRIBUTABLE items, those absent from the same window
  L204: un-injected — so genuine real-data signals in the window are not miscounted as
    -> un-injected, so genuine real-data signals in the window are not miscounted as
  L238: attribution rightly down-weights weather below calendar structure — reported as
    -> attribution rightly down-weights weather below calendar structure, reported as
  L330: has a fixed operating point; what MOVES is which failure dominates the cost —
    -> has a fixed operating point; what MOVES is which failure dominates the cost
  L344: # per (kind, venue, magnitude) with N and a Wilson interval — not one pooled F1 that
    -> # per (kind, venue, magnitude) with N and a Wilson interval, not one pooled F1 that
  L362: ranking, and fatigue use onset / direction / severity only — attribution top-1 is an
    -> ranking, and fatigue use onset / direction / severity only, attribution top-1 is an
  L386: """Injection windows for a venue. For a closed venue, only PRE-closure folds — a
    -> """Injection windows for a venue. For a closed venue, only PRE-closure folds, a
  L501: """Regime/exo detection delay by magnitude bin — bigger shifts should detect
    -> """Regime/exo detection delay by magnitude bin, bigger shifts should detect
  L517: net-sales venue), with N — a shift should rank above a coincident spike."""
    -> net-sales venue), with N, a shift should rank above a coincident spike."""
  L657: """Append (idempotently) the scaled section to the report — truncates any prior
    -> """Append (idempotently) the scaled section to the report, truncates any prior
  L744: Analytic over the real `_score` — the shift is 'continuing'; the minor item is a
    -> Analytic over the real `_score`, the shift is 'continuing'; the minor item is a
  L771: clustered run keeps full weight — quantify that gap (G5b)."""
    -> clustered run keeps full weight, quantify that gap (G5b)."""

### eval/change_point_eval.py
  L1: """A13 · Change-point detector validation (spec §8) — honest characterisation.
    -> """A13 · Change-point detector validation (spec §8), honest characterisation.
  L4: 1. ARL0 calibration — sweep CUSUM h, measure mean trading-days between false
    -> 1. ARL0 calibration, sweep CUSUM h, measure mean trading-days between false
  L6: 2. TRT closure — detection delay against the ground-truth structural break.
    -> 2. TRT closure, detection delay against the ground-truth structural break.
  L7: 3. Synthetic injection — inject δ∈{0.5,1,2} band-unit shifts, measure detection
    -> 3. Synthetic injection, inject δ∈{0.5,1,2} band-unit shifts, measure detection
  L9: 4. BOCPD benchmark — same stream, compared to the simple detectors.
    -> 4. BOCPD benchmark, same stream, compared to the simple detectors.

### eval/harness.py
  L1: """A2 · Evaluation harness — built *before* any model (methodology §3).
    -> """A2 · Evaluation harness, built *before* any model (methodology §3).
  L7: guards are explicit — `assert_no_leakage` raises if any train fold contains a
    -> guards are explicit, `assert_no_leakage` raises if any train fold contains a
  L182: better — penalises width plus 2/alpha * miss distance."""
    -> better, penalises width plus 2/alpha * miss distance."""

### eval/inject.py
  L7: * regime_shift     — a step change in z from a known onset (sustained shift)
    -> * regime_shift, a step change in z from a known onset (sustained shift)
  L8: * spike            — a single-day |z| excursion (point anomaly, no persistence)
    -> * spike, a single-day |z| excursion (point anomaly, no persistence)
  L9: * stock_drawdown   — a keg line crossing the reorder threshold (days_of_cover ≤ 0)
    -> * stock_drawdown, a keg line crossing the reorder threshold (days_of_cover ≤ 0)
  L10: * exo_coincident   — a downward shift anchored on a real weather anomaly, so the
    -> * exo_coincident, a downward shift anchored on a real weather anomaly, so the
  L16: reads the store read-only and INVENTS NO DETECTION MATHS — it perturbs inputs; the
    -> reads the store read-only and INVENTS NO DETECTION MATHS, it perturbs inputs; the
  L51: #                           one-day spike), not raw z — the briefing's design intent
    -> #                           one-day spike), not raw z, the briefing's design intent
  L82: """Leakage-checked (train, test) folds from the harness — different historical
    -> """Leakage-checked (train, test) folds from the harness, different historical
  L107: (isolated), or late (the hard case — little room before the window ends)."""
    -> (isolated), or late (the hard case, little room before the window ends)."""
  L157: """A single-day |z| excursion — a point anomaly with no persistence."""
    -> """A single-day |z| excursion, a point anomaly with no persistence."""
  L215: more than one SD — the same anomaly the attribution scans for."""
    -> more than one SD, the same anomaly the attribution scans for."""
  L250: """A held-out-window date the attribution finds NO coincident signal for — the
    -> """A held-out-window date the attribution finds NO coincident signal for, the

### eval/intermittency_diagnostic.py
  L96: """Non-OTHER L3 nodes classified intermittent (ADI >= 1.32) — the trigger
    -> """Non-OTHER L3 nodes classified intermittent (ADI >= 1.32), the trigger

### eval/judge.py
  L5: decisive move — and the answer to the open supervisor question ("is LLM-as-judge
    -> decisive move, and the answer to the open supervisor question ("is LLM-as-judge
  L6: acceptable as a substitute for manager feedback?") — is to CALIBRATE the judge
    -> acceptable as a substitute for manager feedback?"), is to CALIBRATE the judge
  L11: constants below). The judge runs offline — an eval script calling the Anthropic
    -> constants below). The judge runs offline, an eval script calling the Anthropic
  L174: mode is the offline emit-prompts seam — no fabricated numbers."""
    -> mode is the offline emit-prompts seam, no fabricated numbers."""

### eval/labels.py
  L9: This is an OFFLINE label store, not a live manager A/B trial — no real managers are
    -> This is an OFFLINE label store, not a live manager A/B trial, no real managers are
  L182: Sparse strata return fewer than requested — the achieved N is reported, not padded."""
    -> Sparse strata return fewer than requested, the achieved N is reported, not padded."""
  L207: """Achieved N per stratum (sparse venues will be small — say so)."""
    -> """Achieved N per stratum (sparse venues will be small, say so)."""
  L219: briefing (pass 1) — the anti-anchoring half of the instrument."""
    -> briefing (pass 1), the anti-anchoring half of the instrument."""

### features/build_features.py
  L71: # held-out MASE on the operational rolling-origin window — calendar flags are
    -> # held-out MASE on the operational rolling-origin window, calendar flags are
  L93: """Dates on which Ellel traded — the spillover-hypothesis event calendar."""
    -> """Dates on which Ellel traded, the spillover-hypothesis event calendar."""
  L163: # Deterministic calendar — known in advance, safe at any horizon.
    -> # Deterministic calendar, known in advance, safe at any horizon.
  L168: # Weather — the chosen training basis for this venue's grid cell.
    -> # Weather, the chosen training basis for this venue's grid cell.
  L175: # Local events — only this venue's scope(s); fixture flag + max rank.
    -> # Local events, only this venue's scope(s); fixture flag + max rank.

### hierarchy/reconcile.py
  L7: coherent by construction — Σ(item) = category = venue exactly — which we verify.
    -> coherent by construction, Σ(item) = category = venue exactly, which we verify.
  L150: """Split-conformal quantile per non-VENUE node per level — the single band
    -> """Split-conformal quantile per non-VENUE node per level, the single band
  L290: exists. Returns [] when stock has not been ingested — keeping A6 headless."""
    -> exists. Returns [] when stock has not been ingested, keeping A6 headless."""
  L327: coverage reconcile() validates — `recon[i] ± node_q[(node, level)]` — so the
    -> coverage reconcile() validates, `recon[i] ± node_q[(node, level)]`, so the

### ingest/calendar_sources.py
  L1: """PRJ93 · A14 calendar sources — Lancashire school terms + Lancaster Uni terms.
    -> """PRJ93 · A14 calendar sources, Lancashire school terms + Lancaster Uni terms.
  L33: # Lancashire school HOLIDAYS — closed intervals [start, end] inclusive.
    -> # Lancashire school HOLIDAYS, closed intervals [start, end] inclusive.
  L79: # Lancaster University TERM intervals — open intervals [start, end] inclusive,
    -> # Lancaster University TERM intervals, open intervals [start, end] inclusive,
  L127: term are still term — the DOW features carry the weekend effect."""
    -> term are still term, the DOW features carry the weekend effect."""

### ingest/exog_weather.py
  L8: exog_weather_observed     ERA5 reanalysis (archive)            — ground truth / upper bound
    -> exog_weather_observed     ERA5 reanalysis (archive), ground truth / upper bound
  L9: exog_weather_hindcast     historical-forecast (matches serve)  — realistic training basis
    -> exog_weather_hindcast     historical-forecast (matches serve), realistic training basis
  L10: exog_weather_leadmatched  previous-runs, issued N days ahead   — forecast as actually issued
    -> exog_weather_leadmatched  previous-runs, issued N days ahead, forecast as actually issued

### ingest/live.py
  L1: """T1 live facts — current partial-period aggregates, read on demand and cached.
    -> """T1 live facts, current partial-period aggregates, read on demand and cached.
  L4: this week Mon to now" — partial-period figures a nightly-only pull cannot serve.
    -> this week Mon to now", partial-period figures a nightly-only pull cannot serve.
  L25: # Per-process, no external store — right for bursty single-conversation follow-ups.
    -> # Per-process, no external store, right for bursty single-conversation follow-ups.

### ingest/local_events.py
  L1: """A14 · Local-event anchors (curated; PredictHQ optional) — spec §3.4/§3.5.
    -> """A14 · Local-event anchors (curated; PredictHQ optional), spec §3.4/§3.5.
  L6: beer_hall/ellel; Preston anchors map to two_river_taps — never cross-applied.
    -> beer_hall/ellel; Preston anchors map to two_river_taps, never cross-applied.
  L11: verified by search — so the confirmed anchors here are autumn/winter civic
    -> verified by search, so the confirmed anchors here are autumn/winter civic
  L32: # Curated anchors — each row is one calendar date (multi-day events expanded).
    -> # Curated anchors, each row is one calendar date (multi-day events expanded).
  L37: # — 9–12 Oct 2025, city-centre live music. Source: beyond.radio / organisers.
    -> # 9–12 Oct 2025, city-centre live music. Source: beyond.radio / organisers.
  L43: # Light Up Lancaster 2025 — 6–8 Nov, light-art trail + fireworks finale 8 Nov
    -> # Light Up Lancaster 2025, 6–8 Nov, light-art trail + fireworks finale 8 Nov
  L62: is set. Kept minimal — the curated table is the default per the §3.5 decision
    -> is set. Kept minimal, the curated table is the default per the §3.5 decision

### ingest/normalise.py
  L6: coerced — anything that cannot be parsed is dropped *with a reason* and counted
    -> coerced, anything that cannot be parsed is dropped *with a reason* and counted
  L107: """Return (tidy_long_table, manifest_dict). Pure — does not write files."""
    -> """Return (tidy_long_table, manifest_dict). Pure, does not write files."""

### ingest/refresh.py
  L12: cadence boundary or a confirmed change-point since the last fit — never per
    -> cadence boundary or a confirmed change-point since the last fit, never per
  L129: chronos_bolt, and any future rung4_* addition) — the guard trigger."""
    -> chronos_bolt, and any future rung4_* addition), the guard trigger."""
  L135: stale on the CSV ceiling (G2) — a store with no watermark falls back to its
    -> stale on the CSV ceiling (G2), a store with no watermark falls back to its
  L140: and as of when — the surface distinguishes the two."""
    -> and as of when, the surface distinguishes the two."""
  L242: boundary or a confirmed change-point since the last recorded fit — so a single
    -> boundary or a confirmed change-point since the last recorded fit, so a single
  L278: incumbent read and the audit insert — so there is never a read↔write connection
    -> incumbent read and the audit insert, so there is never a read↔write connection
  L283: (no backtest run, no audit row written) — a chronos-less venv must never
    -> (no backtest run, no audit row written), a chronos-less venv must never
  L355: raise on the missing predictor) — the persisted band is left exactly as-is,
    -> raise on the missing predictor), the persisted band is left exactly as-is,
  L451: # Phase 1 — ingest (write connection only).
    -> # Phase 1, ingest (write connection only).
  L469: # Phase 2 — enrich (own connections), only when new closed days landed.
    -> # Phase 2, enrich (own connections), only when new closed days landed.
  L475: # Phase 3 — conditional T3 re-fit (each helper manages its own connection).
    -> # Phase 3, conditional T3 re-fit (each helper manages its own connection).
  L491: # Phase 4 — promote: regenerate the served forecast so /forecast and
    -> # Phase 4, promote: regenerate the served forecast so /forecast and
  L521: (G-live-b) — it serves reasoning/attribution, not the forecast. A missing-weather
    -> (G-live-b), it serves reasoning/attribution, not the forecast. A missing-weather

### ingest/sources/base.py
  L1: """Source adapters — the pluggable T2 history seam.
    -> """Source adapters, the pluggable T2 history seam.
  L75: in the `TXN_COLUMNS` schema. Only completed trading days — never a partial
    -> in the `TXN_COLUMNS` schema. Only completed trading days, never a partial

### ingest/spike_days.py
  L5: share of gross sales was discounted — a promo/event the model could not have
    -> share of gross sales was discounted, a promo/event the model could not have

### ingest/stock_normalise.py
  L6: directory but are a different entity — they are cleaned into a standalone
    -> directory but are a different entity, they are cleaned into a standalone
  L38: # Category (L1) header canonicalisation — the eight bar-sheet section headers.
    -> # Category (L1) header canonicalisation, the eight bar-sheet section headers.
  L77: """(snapshot_date, internal_date, file_date) — filename-primary (§5.2)."""
    -> """(snapshot_date, internal_date, file_date), filename-primary (§5.2)."""
  L247: # --- Brewery (out of scope; clean only — §9) ---------------------------------
    -> # --- Brewery (out of scope; clean only, §9) ---------------------------------
  L356: # advisory and 3 of them (Feb/Apr/May) are stale — line-item sums are
    -> # advisory and 3 of them (Feb/Apr/May) are stale, line-item sums are

### models/ladder.py
  L6: * **static**  — one forecast of the last 8 weeks, multi-step from the train
    -> * **static**, one forecast of the last 8 weeks, multi-step from the train
  L9: * **rolling** — expanding-window rolling-origin, 7-day horizon (methodology
    -> * **rolling**, expanding-window rolling-origin, 7-day horizon (methodology
  L15: Rung 0  seasonal-naive (lag-7)             — the MASE denominator
    -> Rung 0  seasonal-naive (lag-7), the MASE denominator
  L16: Rung 1  robust DOW x seasonal index        — the interpretable baseline
    -> Rung 1  robust DOW x seasonal index, the interpretable baseline
  L17: Rung 2  STL / ETS / Prophet                — classical decomposition
    -> Rung 2  STL / ETS / Prophet, classical decomposition
  L18: Rung 3  gradient boosting (+ global pool)  — non-linear, partial pooling
    -> Rung 3  gradient boosting (+ global pool), non-linear, partial pooling
  L19: Rung 4  foundation models                  — optional; adopted only if it
    -> Rung 4  foundation models, optional; adopted only if it
  L77: block — otherwise every model trivially 'wins' by predicting zero."""
    -> block, otherwise every model trivially 'wins' by predicting zero."""
  L210: # HistGradientBoosting is a native (libomp-free) GBM — the same family as
    -> # HistGradientBoosting is a native (libomp-free) GBM, the same family as
  L437: # 0)" — there is no higher rung that could beat Rung 1.
    -> # 0)", there is no higher rung that could beat Rung 1.
  L620: """FIX-8: permutation importance of is_ellel_event in the Beer Hall GBM —
    -> """FIX-8: permutation importance of is_ellel_event in the Beer Hall GBM

### service/app.py
  L1: """A10 · FastAPI service — exposes the brain to Track B (the AI-GM agent).
    -> """A10 · FastAPI service, exposes the brain to Track B (the AI-GM agent).
  L208: # NOTE: function-local import — defers the heavy pandas/signal graph off module
    -> # NOTE: function-local import, defers the heavy pandas/signal graph off module
  L352: Read-only — the daily `run()` (CLI/cron) is what persists `briefing_runs`.
    -> Read-only, the daily `run()` (CLI/cron) is what persists `briefing_runs`.
  L445: surface — the agent gets read-only freshness, never a way to trigger a re-fit.
    -> surface, the agent gets read-only freshness, never a way to trigger a re-fit.

### signals/briefing.py
  L1: """Proactive briefing — the synthesis capstone (PRJ93 briefing spec).
    -> """Proactive briefing, the synthesis capstone (PRJ93 briefing spec).
  L6: already exist — point deviation (`signals.deviation.scan`), change-point
    -> already exist, point deviation (`signals.deviation.scan`), change-point
  L8: checklist/SOP (`signals.checklist_discipline`) — into one ranked, non-redundant,
    -> checklist/SOP (`signals.checklist_discipline`), into one ranked, non-redundant,
  L19: - No delivery channel (no email/Slack/push) — a queryable artefact + agent tool.
    -> - No delivery channel (no email/Slack/push), a queryable artefact + agent tool.
  L20: - No new detection maths — compose existing signals only.
    -> - No new detection maths, compose existing signals only.
  L21: - No live checklist wiring — `CHECKLIST_LIVE=False` gates template data out (G5a).
    -> - No live checklist wiring, `CHECKLIST_LIVE=False` gates template data out (G5a).
  L22: - Stock is a single latest snapshot, not a daily series — "new reorder since
    -> - Stock is a single latest snapshot, not a daily series, "new reorder since
  L264: """0.5 for a single-day deviation on a sparse (event-only) venue — a narrow
    -> """0.5 for a single-day deviation on a sparse (event-only) venue, a narrow
  L456: (MAX(generated_at)) is this empty run — not the last run that still held the
    -> (MAX(generated_at)) is this empty run, not the last run that still held the

### signals/change_point.py
  L3: The shipped `/deviation/check` is a per-day point-anomaly detector — memoryless, so
    -> The shipped `/deviation/check` is a per-day point-anomaly detector, memoryless, so
  L7: signals using the A14 exogenous seam (its explanatory home — A14b showed those
    -> signals using the A14 exogenous seam (its explanatory home, A14b showed those
  L13: Two production detectors on z_t — two-sided **CUSUM** (drift) + **k-of-n persistence**
    -> Two production detectors on z_t, two-sided **CUSUM** (drift) + **k-of-n persistence**
  L14: (abrupt) — with **BOCPD** as a benchmark. Validated against the TRT closure
    -> (abrupt), with **BOCPD** as a benchmark. Validated against the TRT closure
  L17: This module changes no forecast — it reads existing store data only.
    -> This module changes no forecast. It reads existing store data only.
  L100: inverse-gamma conjugate predictive. Returns per-step P(run length resets) — a
    -> inverse-gamma conjugate predictive. Returns per-step P(run length resets), a

### signals/chatlog_kb_gap.py
  L8: cluster them, and rank clusters by *failure density × repeat-ask count* —
    -> cluster them, and rank clusters by *failure density × repeat-ask count*
  L149: # Cluster substantive turns only — trivial confirmations are a different
    -> # Cluster substantive turns only, trivial confirmations are a different

### signals/checklist_discipline.py
  L10: rows (standing dependency — see FLAGS.md; this supersedes the earlier assumption
    -> rows (standing dependency, see FLAGS.md; this supersedes the earlier assumption
  L28: # Criticality weights — high-consequence steps must outweigh "refill straws".
    -> # Criticality weights, high-consequence steps must outweigh "refill straws".
  L154: # 3) Non-Sunday close without step 31 — must NOT flag (Sunday rule).
    -> # 3) Non-Sunday close without step 31, must NOT flag (Sunday rule).
  L158: # 4) Sunday close without step 31 — must flag.
    -> # 4) Sunday close without step 31, must flag.

### signals/deviation.py
  L1: """Point-deviation signal — the per-day primitive (PRJ93 point-deviation spec).
    -> """Point-deviation signal, the per-day primitive (PRJ93 point-deviation spec).
  L12: The stream is leakage-free (expanding one-step-ahead), trading days only — so a
    -> The stream is leakage-free (expanding one-step-ahead), trading days only, so a
  L43: distinct from change-point's persistence-aware severity — a point has no run
    -> distinct from change-point's persistence-aware severity, a point has no run

### signals/feature_ablation.py
  L6: ablation is run on it (expanding-window, 6 folds, 7-day horizon — the operational
    -> ablation is run on it (expanding-window, 6 folds, 7-day horizon, the operational
  L130: # Q3 — forecast-vs-observed skill at the lead time (lancaster cell).
    -> # Q3, forecast-vs-observed skill at the lead time (lancaster cell).

### signals/residual.py
  L6: (`signals.change_point`). They live here so neither signal imports the other —
    -> (`signals.change_point`). They live here so neither signal imports the other
  L18: This module changes no forecast — it reads existing store data only.
    -> This module changes no forecast. It reads existing store data only.
  L57: half-band-width (level CP_LEVEL) of the training residuals — the shared scale
    -> half-band-width (level CP_LEVEL) of the training residuals, the shared scale
  L187: # Stock-out on a downward shift (BH) — only if the snapshot is near the
    -> # Stock-out on a downward shift (BH), only if the snapshot is near the

### signals/stock_inventory.py
  L1: """A12 · Stock inventory — days-of-cover reorder signal (spec §7).
    -> """A12 · Stock inventory, days-of-cover reorder signal (spec §7).
  L11: from the sales-side A6 forecast — never from stock differences (FLAG-2). Cover is
    -> from the sales-side A6 forecast, never from stock differences (FLAG-2). Cover is
  L146: """Non-core lines carrying value, or core lines that sit near-zero — the
    -> """Non-core lines carrying value, or core lines that sit near-zero, the

### signals/weather_diagnostic.py
  L1: """A14b · Weather/calendar signal diagnostic (spec A14b) — DIAGNOSTIC ONLY.
    -> """A14b · Weather/calendar signal diagnostic (spec A14b), DIAGNOSTIC ONLY.
  L9: A  L2 (+ draught L3) weather ablation   — is lift hidden by aggregation?
    -> A  L2 (+ draught L3) weather ablation, is lift hidden by aggregation?
  L10: B  physiology-matched weather features  — is raw temp too redundant with season?
    -> B  physiology-matched weather features, is raw temp too redundant with season?
  L11: C  transition-aware folds for calendar  — were the flags untestable in-window?
    -> C  transition-aware folds for calendar, were the flags untestable in-window?
  L12: D  residual-on-weather regression        — does weather explain variance beyond season?
    -> D  residual-on-weather regression, does weather explain variance beyond season?
  L56: Fragile on ~1 summer of data — FLAG-WD1; the threshold flag is the robust one."""
    -> Fragile on ~1 summer of data, FLAG-WD1; the threshold flag is the robust one."""
  L133: (Lager - BH, Cider - BH) — the on-target series for the weather hypothesis."""
    -> (Lager - BH, Cider - BH), the on-target series for the weather hypothesis."""
  L248: """value minus its in-sample day-of-week median — the season-stripped residual."""
    -> """value minus its in-sample day-of-week median, the season-stripped residual."""

### store/active_span.py
  L5: closed venue's last weeks of feature rows are **post-closure zero-padding** —
    -> closed venue's last weeks of feature rows are **post-closure zero-padding**
  L36: span — drops the leading/trailing all-zero stretches (e.g. TRT's closure)."""
    -> span, drops the leading/trailing all-zero stretches (e.g. TRT's closure)."""
  L43: """Latest L1 date seen across ALL forecast venues — the 'today' reference a
    -> """Latest L1 date seen across ALL forecast venues, the 'today' reference a
  L57: expected sparsity between bookings, not a closure — judging them against the
    -> expected sparsity between bookings, not a closure, judging them against the

### store/warehouse.py
  L6: lacks — the methodology's stated design contribution.
    -> lacks, the methodology's stated design contribution.
  L241: # Delete colliding rows, then append — a portable upsert.
    -> # Delete colliding rows, then append, a portable upsert.

### tests/test_a0_ingest.py
  L1: """A0 tests — ingest reconciles to the profiled audit figures, no leakage of
    -> """A0 tests, ingest reconciles to the profiled audit figures, no leakage of

### tests/test_a10_service.py
  L1: """A10 tests — every endpoint returns valid JSON and OpenAPI is served, and all
    -> """A10 tests, every endpoint returns valid JSON and OpenAPI is served, and all
  L79: """FIX-4: all three venues are forecast targets — /forecast must not 404."""
    -> """FIX-4: all three venues are forecast targets, /forecast must not 404."""

### tests/test_a14_enrichment.py
  L1: """A14 tests — feature enrichment: calendar correctness, event scoping, the
    -> """A14 tests, feature enrichment: calendar correctness, event scoping, the

### tests/test_a14b_diagnostic.py
  L1: """A14b tests — the weather/calendar diagnostic computes its pieces and adopts
    -> """A14b tests, the weather/calendar diagnostic computes its pieces and adopts

### tests/test_a1_warehouse.py
  L1: """A1 tests — store round-trips at all three layers, BH reconciles, forecast
    -> """A1 tests, store round-trips at all three layers, BH reconciles, forecast

### tests/test_a2_harness.py
  L1: """A2 tests — metrics behave correctly and the splits never leak."""
    -> """A2 tests, metrics behave correctly and the splits never leak."""

### tests/test_a3_features.py
  L1: """A3 tests — features reconcile, are leak-free, and carry the activated seam."""
    -> """A3 tests, features reconcile, are leak-free, and carry the activated seam."""

### tests/test_a4_ladder.py
  L1: """A4 tests — rung predictors and the milestone/selection logic (fast, on a
    -> """A4 tests, rung predictors and the milestone/selection logic (fast, on a
  L75: # A capped venue (cap=1) is adopted when Rung 1 beats Rung 0 — there is no
    -> # A capped venue (cap=1) is adopted when Rung 1 beats Rung 0, there is no

### tests/test_a5_conformal.py
  L1: """A5 tests — the conformal quantile is valid and Mondrian is group-conditional."""
    -> """A5 tests, the conformal quantile is valid and Mondrian is group-conditional."""

### tests/test_a6_reconcile.py
  L1: """A6 tests — MinT makes incoherent base forecasts coherent, and the persisted
    -> """A6 tests, MinT makes incoherent base forecasts coherent, and the persisted
  L69: """The band the /forecast API serves must equal recon ± node_q — NOT a
    -> """The band the /forecast API serves must equal recon ± node_q, NOT a

### tests/test_a7_transfer.py
  L1: """A7 tests — donor shape is unit-mean and transfer wins at cold-start."""
    -> """A7 tests, donor shape is unit-mean and transfer wins at cold-start."""

### tests/test_a8_kbgap.py
  L1: """A8 tests — failure detection, baseline reproduction, gap ranking."""
    -> """A8 tests, failure detection, baseline reproduction, gap ranking."""

### tests/test_a9_checklist.py
  L1: """A9 tests — template parse, weighting, conditional exclusion, Sunday rule."""
    -> """A9 tests, template parse, weighting, conditional exclusion, Sunday rule."""

### tests/test_append_cross_venue.py
  L4: multi-venue frame — or a fresh store where venues sit at different date ceilings —
    -> multi-venue frame, or a fresh store where venues sit at different date ceilings

### tests/test_change_point.py
  L1: """A13 tests — change-point detectors fire on real shifts, stay quiet on noise,
    -> """A13 tests, change-point detectors fire on real shifts, stay quiet on noise,

### tests/test_intermittent.py
  L6: importable — it does not build on this Python 3.14 venv);
    -> importable, it does not build on this Python 3.14 venv);

### tests/test_live_cache.py
  L4: envelope are exercised with an injected fake fetcher — no Square, no network.
    -> envelope are exercised with an injected fake fetcher, no Square, no network.

### tests/test_scaled_eval.py
  L7: a CLI, not run here (it is minutes of CPU) — these cover the enumeration and the
    -> a CLI, not run here (it is minutes of CPU), these cover the enumeration and the

### tests/test_stock_inventory.py
  L1: """A11/A12 tests — stock ingest, panel integrity, and the days-of-cover signal
    -> """A11/A12 tests, stock ingest, panel integrity, and the days-of-cover signal

### transfer/lovo.py
  L1: """A7 · Onboarding-transfer capability (methodology §2/§7) — the target outcome.
    -> """A7 · Onboarding-transfer capability (methodology §2/§7), the target outcome.
  L6: specific). We prove this with **leave-one-venue-out** — hold each venue out in
    -> specific). We prove this with **leave-one-venue-out**, hold each venue out in
  L46: """Trim leading/trailing all-zero stretches — e.g. Two River Taps' closure
    -> """Trim leading/trailing all-zero stretches, e.g. Two River Taps' closure
  L47: tail — so onboarding-transfer is judged on days the venue actually trades
    -> tail, so onboarding-transfer is judged on days the venue actually trades
  L138: (≥2 of 3) beating per-venue-naïve at the cold-start window — NOT unanimous.
    -> (≥2 of 3) beating per-venue-naïve at the cold-start window, NOT unanimous.

```
