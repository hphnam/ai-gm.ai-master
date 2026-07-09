# PRJ93 G12.10 Implementation Report

TRT coordinate fix, `is_ellel_event` leak fixed at source, full exo factor set
for the Chronos-2 entrant, Neon adapter wiring, World Cup 2026 fixtures, store
persistence flags. Branch: `brain-construction`. Implements
`PRJ93_Spec_G12_10.md` gates G12.10a, a2, b, c, d, e, f.

Verified against three venvs: `.venv-eval` (torch/chronos present, test suite +
code checks), `.venv-forecast` (the real `models.ladder --all-venues` run), and
the runtime `.venv` (no chronos, confirms byte-identical behaviour where the
backend is absent). Execution order followed the spec: a → a2 → c → d → e → b → f.

## Summary of changes

| File | Change |
|---|---|
| `config.py` | G12.10a: `WEATHER_CELLS["two_river_taps"] = "two_river_taps"`, `WEATHER_CELL_COORDS["two_river_taps"] = (53.875094426896766, -2.759934558207991)`, `preston` removed. G12.10f: `STORE_DIR` reads a `BRAIN_STORE_DIR` env override (default unchanged). |
| `features/build_features.py` | G12.10a2: `is_ellel_event` set to constant 0 on the Ellel frame (leak fix at source), genuine spillover elsewhere. G12.10d: `wc_*` covariates attached per venue per date, excluded from the GBM feature set. |
| `ingest/world_cup.py` (new) | G12.10d: raw-schedule loader, `venue_trading_hours` deriver (robust per-DOW envelope from real transaction timestamps), four `wc_*` features by kickoff-vs-trading-hours overlap, and `coincident_fixtures` for attribution. |
| `ingest/world_cup_schedule.md` (Nam) | Raw 104-match calendar (already on the branch). |
| `models/foundation.py` | G12.10b: `CHRONOS2_EXO_COLS` is now the full known-future universe (calendar + `is_ellel_event` inert-not-excluded + civic events + World Cup + weather); resolver `chronos2_exo_cols(venue)` returns it for all venues (G12.9d Ellel special-case removed); weather-basis assertion (raises on `observed`) + runtime-info line; optional `exo_cols` override for the G12.10e ablation. |
| `ingest/sources/base.py` | G12.10c: `NeonAdapter.latest_available_date`/`fetch_transactions` implemented against `brain_txn` (read-only, `psycopg` imported inside the method, DSN from `BRAIN_NEON_DSN`), inert until `LIVE_INGEST=1`; `_to_txn_schema` maps `brain_txn` → `TXN_COLUMNS`. |
| `signals/residual.py` | G12.10d: `attribute` names the specific coincident World Cup fixture (strictly coincidence). |
| `models/ladder.py` | G12.10b: Rung-4 report line records the exo weather basis. |
| `ingest/exog_weather.py` | G12.10a: docstring updated (cells keyed by venue name). |
| `eval/worldcup_fixture_probe.py` (new) | G12.10e: report-only with/without-`wc_*` MASE probe; defers cleanly when June is absent. |
| `FLAGS.md` | FLAG-FE-TRTLOC resolved (G12.10a); FLAG-FE3 corrected; FLAG-INGEST-NEON + ingestion rule (G12.10c); FLAG-STORE-ENV + FLAG-STORE-SOR (G12.10f). |
| `models/ladder_results_L1_*.md` | Regenerated on the new weather basis + leak fix + full exo set. |
| `tests/*` | New/updated tests for every gate (`test_world_cup.py` new; `test_config_store_env.py` new; `test_foundation.py`, `test_a3_features.py`, `test_ingest_refresh.py`, `test_attribution_weather.py` updated). |

## Gate-by-gate

### G12.10a: TRT coordinate fix
- `WEATHER_CELLS["two_river_taps"] = "two_river_taps"` (uniform venue-name keying with BH/Ellel); `WEATHER_CELL_COORDS["two_river_taps"] = (53.875094426896766, -2.759934558207991)`, the Nam-confirmed venue coordinate; the `preston` cell/coord removed. BH and Ellel coords untouched.
- `FLAG-FE-TRTLOC` marked RESOLVED, with the G12.9 "north of Preston is wrong" language removed (the point was the venue's real location; only the label was ever the issue). `EVENT_SCOPE["two_river_taps"] = ("preston",)` left as-is (separate mapping, cosmetic while TRT is closed) with the isolation rule intact.
- Re-pulled TRT weather on the new coordinate (`python -m ingest.exog_weather`; the `two_river_taps` cell now covers TRT's full pre-closure span to 2026-05-08, zero weather NaN) and regenerated the TRT features + ladder report. **Note:** the committed TRT ladder numbers are unchanged from G12.9 because TRT's winner (`rung2_ets`) consumes no weather, and under the calendar-only exo entrant the coordinate fed no modelled rung; the coordinate now does feed the fat exo entrant (G12.10b), where TRT's `rung4_chronos2_exo` moved 0.623 → 0.612.

### G12.10a2: `is_ellel_event` leak fixed at source
- In `build_features`, `is_ellel_event` is set to constant **0** on the Ellel frame (column kept for schema/`ENRICH_FEATURES` stability); for every other venue it remains the genuine spillover signal derived from Ellel's trading days. This protects **every** Ellel rung that reads the feature frame (the GBM rungs, not just the Chronos entrant, the reason the fix had to move from the entrant (G12.9d) to the source now that Ellel is uncapped).
- Leak-guard tests added (`test_a3_features.py`): `build_features("ellel")["is_ellel_event"]` is identically 0; `build_features("beer_hall")["is_ellel_event"]` still fires on real Ellel dates.
- **Material finding.** Removing the leak dropped Ellel's rolling `rung3_gbm` from a leakage-inflated **0.533** (G12.9c) to an honest **0.813**, and `rung3_global_gbm` to 0.936. What was a leak artifact is the `rung3_gbm` Ellel win *specifically* (the GBM consumed the leaked `is_ellel_event` feature); that single inflated result is correctly retired. What SURVIVES is the G12.9c core hypothesis that a foundation model competes on a sparse venue without per-venue training: after the fix `rung4_chronos2` is 0.581, essentially tied with the baseline, not collapsed like the GBM. See **G12.10b** for the consequent milestone reading.

### G12.10c: adapter-only ingestion rule + Neon adapter
- `NeonAdapter.latest_available_date`/`fetch_transactions(since)` implemented against `brain_txn` over a **read-only** connection whose `psycopg` (v3) driver is imported **inside** the method (the brain imports no DB client at load); DSN from `BRAIN_NEON_DSN`; `since` is parameterised (never string-built). `_to_txn_schema` maps `brain_txn` rows onto `TXN_COLUMNS`, deriving only config-known columns (`venue_label`, `net_sales_exvat` via the VAT rule, `excluded=False`), never fabricating transaction facts. Inert while `LIVE_INGEST=0` (`latest_available_date` returns None; `fetch_transactions` raises `NotProvisionedError`); raises loudly, never silently, if live-but-unprovisioned (DSN unset or driver missing).
- **Not integration-tested against live Neon:** this build has no Neon DSN or `brain_txn` schema access (Ryan owns them). Per the spec, **no June rows were simulated** to pass a test; the deliverable is the adapter implementation + `FLAG-INGEST-NEON`. Unit tests cover the inert-raise and the `_to_txn_schema` mapping.
- `FLAGS.md` records: committed-seed ceiling **2026-05-31**; June-onward data lives in Ryan's Neon via the Square MCP pull; CSV is bootstrap-only and **manual injection is retired**; the World-Cup-after-ceiling dependency is stated.

### G12.10d: World Cup fixtures, code-derived relevance
- `ingest/world_cup.py`: `read_world_cup_schedule()` parses all **104** matches from `world_cup_schedule.md`, matching columns by meaning (the committed headers are `Match #`/`Group`/`Date (London)`/`Time (London)`/`Home Team`/`Away Team`, normalised), tracking `##` section headings as the stage, tolerating separators/blank lines/repeated headers, and skipping a genuinely malformed row with a logged reason (no crash). Required fields: date, kickoff, two team names.
- `derive_trading_hours()` computes each venue's per-DOW window from real transaction timestamps as a robust **1st/99th-percentile** envelope (not raw min/max, which after-midnight stray transactions poison), this matches the spec's own example (BH Saturday ≈ 12:00–23:30) and is persisted to `venue_trading_hours`. DOW is Monday=0 (via DuckDB `isodow()-1`, aligned with pandas).
- Four raw, un-ranked `wc_*` covariates per venue per date by kickoff-window (2h assumed duration, stated) vs the venue's derived window: `wc_match_in_hours`, `wc_england_in_hours` (England derived from home/away), `wc_n_matches_in_hours`, `wc_any_match` (control). No hand-set rank, no fixed hour cap, a 02:00 kickoff is excluded automatically because no venue trades then. Scope: BH + Ellel; TRT and any other venue get all-zero. Absent file → all-zero with a logged note. The `wc_*` columns are kept out of the GBM feature set (like all exo per FLAG-FE10); only the Chronos exo entrant consumes them (G12.10b).
- `signals.residual.attribute` now names the specific coincident fixture ("coincides with England vs Croatia, 21:00 kickoff, within trading hours"), strictly coincidence, grounded in the same overlap the forecast features use.
- Acceptance assertions verified: **2026-06-17 England vs Croatia 21:00** → `wc_england_in_hours = 1` for BH (Wednesday window 15.3–23.5 reaches 21:00); a **02:00-only date (2026-07-12)** → `wc_match_in_hours = 0` for all venues.
- **On the committed store the `wc_*` features are all 0**, because the tournament (11 Jun – 19 Jul 2026) is entirely after the 2026-05-31 seed ceiling, the honest forward-looking state the spec anticipates. They fire once June-onward rows arrive.

### G12.10e: June forecast vs World Cup probe
- `eval/worldcup_fixture_probe.py` (report-only): precondition-checks the local watermark (`MAX(date)` for beer_hall). On this store it reaches **2026-05-31 only**, so the probe reports **"June not present in this store, test deferred"** and fabricates nothing. When June is present it compares the exo entrant with vs without the `wc_*` set (per-fold + tournament-restricted mean MASE), runs a per-feature ablation (base + `wc_england_in_hours` only vs full set) via the new `exo_cols` override, prints a per-match-date descriptive table naming England fixtures, and states the one-June power caveat. Touches no production path.
- **G12.11 Part B re-attempt (deferred again):** re-checked the local store's watermark per G12.11d. The active DuckDB (the only `.duckdb` on disk; `BRAIN_STORE_DIR` unset) still ends **2026-05-31** for Beer Hall (Ellel 2026-05-22, TRT 2026-05-08), and the CSV seed is the same bootstrap file. June-onward transactions are not in the active store here (they live in Ryan's Neon per FLAG-INGEST-NEON, or a separate local file not loaded into this DuckDB). Per the stop condition, Part B did not run and nothing was fabricated. The probe is complete and correct for when a June-inclusive store is available; the fixture-effect question remains open pending that data.

### G12.10b: full exo factor set for the Chronos-2 entrant
- `CHRONOS2_EXO_COLS` is now the full known-future universe: calendar (`is_bank_holiday`, `exo_is_school_term`, `exo_is_uni_term`), `is_ellel_event` (inert-not-excluded, safe for all venues via the G12.10a2 source fix, informative for BH, constant-0 for Ellel), civic events (`exo_fixture_nearby`), World Cup (`wc_match_in_hours`, `wc_england_in_hours`, `wc_n_matches_in_hours`, `wc_any_match`), and weather (`exo_temp_c`, `exo_rain_mm`, `exo_sunshine_hrs`, `exo_is_dry`). The resolver `chronos2_exo_cols(venue)` returns this for every venue (no Ellel special-case; the G12.9d entrant-level exclusion removed, source fix is the single point of truth). A constant covariate does not raise (the guard checks missing/NaN, not zero variance).
- Weather is known-future **only** on a forecast serving basis; the entrant raises if `WEATHER_TRAIN_BASIS == "observed"` (would leak the ERA5 upper bound into the backtest) and records the basis (`hindcast`) in the runtime-info + report line. `raise-never-impute` extends to the full set (any missing/NaN needed covariate raises loudly).
- **Ladder rerun (all venues, real chronos), MASE against the calendar-only number it replaces:**

  | Venue | `rung4_chronos2_exo` thin (G12.9) | fat (G12.10b) | rolling winner | gate |
  |---|---|---|---|---|
  | beer_hall | 0.779 | **0.745** (better) | `rung4_chronos2_exo` (0.745) | **PASS** |
  | two_river_taps | 0.623 | 0.612 (≈neutral) | `rung2_ets` (0.597) | PASS |
  | ellel | 0.570 | 0.591 (worse) | `rung1_robust_dow` (0.572); `rung4_chronos2` 0.581 near-tie | serves Rung 1 (DOW marginally best; foundation rung ties, does not fail) |

  **Honest outcome, gate-decided:** the fuller factor set **helps the anchor** (BH 0.779 → 0.745), is roughly neutral for TRT, and slightly worsens the exo entrant on the sparse Ellel series (0.570 → 0.591). On Ellel, **robust DOW narrowly wins the milestone at 0.572**; the three Chronos entrants are the closest challengers (`rung4_chronos2` **0.581**, within 1.6% of the baseline, a near-tie on a 64-day sparse venue and zero-shot; `rung4_chronos2_exo` 0.591; `rung4_chronos_bolt` 0.601), while the classical and ML rungs trail (STL 0.629, GBM 0.813, ETS 0.825). So Ellel serves Rung 1 because the cheap baseline is *marginally best here*, **not** because the foundation models failed: Chronos does not beat DOW, it ties it. Ellel's milestone gate does not adopt a rung above DOW, so Rung 1 is served, but the finding is a near-tie at the top between DOW and the foundation rung, with only the classical/ML rungs genuinely behind. This is a valid gate outcome, and it vindicates uncapping Ellel (G12.9c): the foundation rung stays competitive on sparse data while the classical/ML rungs do not. The BH milestone (the run's exit gate) passes, so the ladder run exits 0.

### G12.10f: production persistence flags
- **FLAG-STORE-ENV (implemented):** `STORE_DIR` now reads `BRAIN_STORE_DIR` (default identical to the in-repo `brain/store`), so the live service can point its DuckDB at a mounted persistent volume; `DUCKDB_PATH`/`MANIFEST_PATH` follow. Test added (`test_config_store_env.py`, subprocess-based since config reads env at import). Default verified unchanged.
- **FLAG-STORE-SOR (documented only):** the brain DuckDB (derived store) vs Ryan's Neon (transaction SOR) relationship, with the preferred topology (Neon SOR + brain DuckDB seeded via `NeonAdapter`, not a heavier "brain Neon" copy) named as a Ryan decision. No code beyond the FLAG note.

## Deviations from the spec

1. **Ellel milestone adopts Rung 1 on a marginal baseline win, a near-tie at the top, not a foundation-model failure.** The spec framed G12.10b around "more covariates can help or add noise… the gate decides adoption as always" and G12.10a2 around fixing a leak. Reading the combined result precisely: robust DOW narrowly wins (0.572) with `rung4_chronos2` a near-tie (0.581, within 1.6%), the exo entrant 0.591, and only the classical/ML rungs genuinely behind. The leak fix retired an *incidental GBM artifact* (the `rung3_gbm` win specifically, 0.533 → 0.813), **not** the G12.9c decision: uncapping Ellel was not a mistake driven by a bug, it surfaced the latent GBM leak AND showed the foundation rung stays competitive on sparse data while the classical/ML rungs do not. So G12.9c is vindicated (foundation rungs are worth admitting on sparse venues), Rung 1 is served because it is marginally best, and only the GBM win was spurious. Recorded here and in the decision log as the honest post-leak finding.
2. **`venue_trading_hours` uses a robust 1st/99th-percentile envelope, not literal first/last transaction.** The spec says "first-transaction and last-transaction time". Raw min/max is heavily contaminated by after-midnight stray transactions (BH Saturday raw min 00:39, max 23:59), which would make almost every kickoff "in hours". The 1%/99% envelope (BH Saturday 12.9–23.5) is robust and matches the spec's OWN stated example ("BH Saturday roughly 12:00 to 23:30"), so I read this as the intended meaning of "envelope" and used quantiles. Documented in the code.
3. **Neon adapter not integration-tested (no provisioning in this build).** Per the spec's explicit branch: no Neon DSN/`brain_txn` schema is available here, so the deliverable is the adapter implementation + `FLAG-INGEST-NEON`, with unit tests for the inert-raise and schema mapping. No June rows were simulated.
4. **G12.10e defers (June not in the local store).** The run environment's DuckDB watermark is 2026-05-31 (the committed seed), not June, contrary to the spec's assumption that "Nam's local DuckDB already contains June". Per the precondition, the probe reports "June not present, test deferred" and fabricates nothing. The probe is complete and correct for when June arrives; it simply has no June data to run on here.
5. **Static-regime `rung4_chronos2_exo` still reports `error: ValueError`** in all three ladder reports. This is pre-existing (identical in the G12.9 committed reports, calendar-only set) and confined to the single-block static stress regime; the rolling regime (the milestone gate) works for all venues. Not introduced by G12.10 and out of scope; noted for honesty.
6. **`is_ellel_event` weather-note comment in `foundation.py` rewritten.** The old G12.5 comment claimed the entrant "never" reads weather; that is no longer true (G12.10b adds it as known-future on the forecast basis), so the comment was replaced with the full-universe rationale.

## Verification

- `.venv-eval/bin/python -m pytest`: **258 passed** (full suite incl. all new/updated tests).
- `.venv/bin/python -m pytest` (runtime, no chronos): **250 passed, 8 skipped** (chronos-gated), confirming byte-identical behaviour where the backend is absent.
- `.venv-forecast/bin/python -m models.ladder --all-venues`: beer_hall PASS (exit gate), two_river_taps PASS, ellel serves Rung 1 (DOW 0.572 marginally best, `rung4_chronos2` 0.581 near-tie, not a foundation failure); reports committed.
- World Cup loader: 104 matches parsed; assertion dates confirmed (2026-06-17 England → in-hours=1; 02:00-only → 0).
- Weather re-pulled for the corrected TRT coordinate; zero exo NaN across every venue's active span.
- `eval.worldcup_fixture_probe`: defers cleanly (June absent), no fabrication.

## Files touched (for review)

Modified: `config.py`, `features/build_features.py`, `models/foundation.py`,
`models/ladder.py`, `ingest/sources/base.py`, `ingest/exog_weather.py`,
`signals/residual.py`, `FLAGS.md`, `models/ladder_results_L1_beer_hall.md`,
`models/ladder_results_L1_ellel.md`, `models/ladder_results_L1_two_river_taps.md`,
`tests/test_foundation.py`, `tests/test_a3_features.py`,
`tests/test_ingest_refresh.py`, `tests/test_attribution_weather.py`.

New: `ingest/world_cup.py`, `eval/worldcup_fixture_probe.py`,
`tests/test_world_cup.py`, `tests/test_config_store_env.py`,
`ingest/world_cup_schedule.md` (Nam's raw calendar), this report.

## Decision-log entries (G12.11)

These are the decision-log rows G12.11c and G12.11e call for. **Placement note
(updated after the G12.11 log consolidation, see B8, and the subsequent
reconciliation):** the decision log now lives in-branch at
`brain/log/Decision_and_Resolution_Log.md` (brought over from
`feat/chronos2-promotion`, where it had been the archival home after commit
`c8bd2c9` removed it from `brain-construction`). It has since been made continuous:
a new "Section C: Post-WP12 milestones (G12.9 to G12.11)" appends the intervening
G12.9 and G12.10 rows plus the three G12.11 rows below, continuing the Section B
numbering as rows 6 to 10. The three G12.11 rows recorded here as B6 / B7 / B8 are
those log rows 8, 9, and 10 respectively; they remain reproduced below (self-
contained) because this report is the primary write-up, with the log as the
consolidated cross-cutting record.

**B6. Ellel milestone reading corrected; the a2 leak fix retired an incidental GBM
artifact, not the G12.9c decision.** After the G12.10a2 source fix neutralised the
`is_ellel_event` self-leak, Ellel's rolling `rung3_gbm` fell from a leakage-inflated
0.533 (G12.9c) to an honest 0.813 (`rung3_global_gbm` to 0.936). Reading the
corrected 6-fold milestone table: robust DOW wins at 0.572, with `rung4_chronos2`
a near-tie at 0.581 (within 1.6%, zero-shot, on a ~64-day sparse venue),
`rung4_chronos2_exo` 0.591, `rung4_chronos_bolt` 0.601; the classical/ML rungs
trail (STL 0.629, GBM 0.813, ETS 0.825). Conclusion: Ellel serves Rung 1 because
the cheap baseline is marginally best here, honestly, NOT because the foundation
models failed (Chronos ties DOW, it does not beat it). What was spurious is the
GBM win specifically; what survives G12.9c is the core hypothesis that a foundation
model competes on a sparse venue without per-venue training. Discussion point:
uncapping sparse venues is vindicated for foundation rungs (they stay competitive)
but not for classical/ML rungs, and the uncap also acted as a leak detector by
surfacing the latent GBM `is_ellel_event` dependency. Served models unchanged
(report-only correction).

**B7. World Cup fixture probe (G12.10e/G12.11d-e) deferred: no June in the local
store.** The `wc_*` fixture-effect question needs a June-inclusive store (the
tournament, 11 Jun to 19 Jul 2026, is entirely after the committed CSV seed
ceiling of 2026-05-31). Re-checked per G12.11d in Nam's local checkout: the active
DuckDB (the only store on disk; `BRAIN_STORE_DIR` unset) still ends 2026-05-31 for
Beer Hall (Ellel 2026-05-22, TRT 2026-05-08). June-onward rows are not in the
active store (they live in Ryan's Neon per FLAG-INGEST-NEON, or a local file not
loaded into this DuckDB). Per the stop condition the probe did not run and nothing
was fabricated; the retention decision for the `wc_*` features (kept in the served
exo covariate set, or dropped from the forecast and kept only for the
reasoning/attribution path) stays open pending that data. Served models unchanged.

**B8. PRJ93 reports + the decision log consolidated into `brain/log/`, numbered by
implementation order.** All 17 archival WP1 to WP12 reports and the decision log
(previously at repo root on `feat/chronos2-promotion`) plus this branch's G12.9,
G12.10, and DOWNSTREAM reports were gathered into `brain/log/` on
`brain-construction`, renamed with a two-digit implementation-order prefix (traced
by each report's first-commit date) and the `PRJ93_` prefix dropped
(`01_Phase2_Build_Report` through `19_G12_10_Report`; the cross-cutting
`Decision_and_Resolution_Log.md` left un-numbered). `brain/log/README.md` is the
authoritative index and states the ordering caveat (a few late-committed docs sit
by commit date, not strict work-package order, e.g. `12_WorldCup_LiveProbe`
predates `16_Chronos2_Promotion` though it builds on the promotion). Rationale: the
brain now carries one self-contained, up-to-date log folder rather than depending
on a diverging archival branch. Docs-only; no code, served model, or gate criteria
touched. Two follow-ups recorded: (a) the consolidated decision log needed the G12.9-onward
rows appended to become a continuous record: DONE, they are now Section C rows 6 to
10 of `Decision_and_Resolution_Log.md` (see the placement note above); (b) internal
cross-references inside the archival reports still use the old `PRJ93_*` filenames
(historical snapshots, left unaltered), so only the live `brain/FLAGS.md` link was
repointed (to `log/18_DOWNSTREAM.md`).
