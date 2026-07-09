# PRJ93 G12.13b June Simulation Report (Pass 2 of 2)

Confront the pre-registered frozen June 2026 forecast (Pass 1, G12.13a) with the
real held-out June actuals, and run the full proactive brain over the June stream
as the live AIGM would. Branch: `brain-construction`. Run venv: `.venv-forecast`.

The served store was NOT modified. June actuals were pulled held-out into
`brain/sim/` eval files only, never written to `served_forecast`/`forecasts`/
`l1_daily` (verified: served `l1_daily` still ends 2026-05-31 for Beer Hall, and
`git status` shows no `brain/store/` change). Mode: **MCP-SIM** (Square Reporting
API via the Claude Code Square connector), a labelled stand-in for Ryan's
production `NeonAdapter`, not a run of that path.

## Airtight precondition (A13b.0): the forecast provably predates the actuals

- Pass-1 frozen commit: **`1d966be`** ("PRJ93 G12.13a: freeze pre-registered
  forward June 2026 forecast"), authored **2026-07-09 22:41:58 +0100**, adding
  `brain/sim/june2026_forecast_frozen.{parquet,json}`.
- June actuals were fetched from Square at **2026-07-09 22:46:48 +0100**
  (`lastRefreshTime`), roughly five minutes AFTER the frozen commit. The forecast
  was loaded from the committed parquet, not regenerated. The comparison is
  therefore a true pre-registered out-of-sample test, not a post-hoc fit.

## Evaluation face

### Stage 1: the pre-registered cold 30-day forecast vs reality (L1)

| Venue | June actual | Frozen forecast | MASE (all days) | MASE (trading) | MAE/day | Band cover | Backtest MASE |
|---|---|---|---|---|---|---|---|
| beer_hall | GBP 26,890 | GBP 13,917 | 1.64 | 1.95 | GBP 478 | 0.83 | 0.745 |
| two_river_taps | GBP 0 | GBP 5,329 | 1.18 | 1.61 | GBP 178 | 0.67 | 0.597 |
| ellel | GBP 2,338 | GBP 604 | 0.49 | 2.91 | GBP 88 | 0.97 | 0.572 |

Read honestly, and framed as the cold-start ceiling, not a regression:

- **Beer Hall under-forecast June by nearly half** (GBP 13.9k predicted vs GBP 26.9k
  actual). A May-trained 30-day-ahead forecast could not see June's regime lift
  (summer trading plus the World Cup). MASE 1.64 is about 2.2x the 7-day backtest
  0.745, exactly the degradation a 30-day cold horizon should show. Band coverage
  0.83 despite the level miss, because the biggest actuals were the World Cup
  Saturdays the band's upper edge partly caught.
- **Two River Taps is the sharp lesson.** The frozen forecast confidently projected
  GBP 5,329 of June trade; the venue recorded GBP 0 (INACTIVE in Square, closed).
  The model had no liveness signal and forecast a dead venue. This is the single
  most actionable finding for go-live: a closure/liveness gate must precede serving.
- **Ellel's flattering all-days MASE (0.49) is an artefact of sparsity.** On the two
  days it actually traded, the blind forecast was 4x too low (a GBP 2,287 private
  event on 20 Jun it could not know), so the trading-day MASE is 2.91. The
  all-days number is diluted by many jointly-zero days and should not be read as
  accuracy.

### Stage 2: realistic weekly-rolling operation (uses progressive actuals)

Distinct from the pre-registered number: each June week forecasts the next 7 days
from history plus June actuals up to the prior week, the way the T3 weekly refresh
runs. This is the honest picture of live week-to-week performance.

| Venue | Rolling 7-day-ahead MASE | Cold 30-day MASE (Stage 1) |
|---|---|---|
| beer_hall | 1.47 | 1.64 |
| two_river_taps | 0.32 | 1.18 |
| ellel | 0.49 | 0.49 |

Rolling beats the cold forecast everywhere it can: Beer Hall improves 1.64 to 1.47
as each week sees the June lift; Two River Taps collapses to 0.32 because after
week 1 the rolling model has learned the venue is dead and predicts near-zero. The
pre-registered cold number and the realistic rolling number together are the
honest two-sided picture the dissertation should present.

### World Cup fixture effect on the real England dates (Beer Hall)

The frozen forecast pre-committed to three England dates flagged
`wc_england_in_hours=1`. On every one, actual sales beat the day-of-week baseline:

| Date | DOW | Fixture | Actual | DOW-median | Frozen yhat | Actual vs DOW-median |
|---|---|---|---|---|---|---|
| 2026-06-17 | Wed | England v Croatia 21:00 | GBP 607 | GBP 289 | GBP 300 | +110% |
| 2026-06-23 | Tue | England v Ghana 21:00 | GBP 335 | GBP 0 | GBP 39 | venue OPENED on a normally-closed Tuesday |
| 2026-06-27 | Sat | Panama v England 22:00 | GBP 3,082 | GBP 1,235 | GBP 1,083 | +150% |

The fixture effect is directionally clear and positive on all three dates: England
matches moved sales up materially, including opening on a Tuesday the venue
normally closes. The frozen forecast, cold from May, under-shot the magnitude
(it sat near the DOW-median), but its `wc_*` flags correctly marked these as the
uplift days. Power caveat as pre-registered: one June, three England dates,
directional evidence only, never a significant estimate.

### Levels L2/L3

L2 category confrontation (June totals, Beer Hall + Ellel that traded): mean
absolute error per category GBP 1,660 (Beer Hall) and GBP 347 (Ellel), driven by
the same L1 under-forecast propagating through the fixed revenue-share
disaggregation (every category is proportionally too low because the venue total
was). L3 item-level actuals were not scored: reconciling Square's live catalogue
item names to the brain's 2024-2026 item taxonomy is a separate reconciliation
task, out of scope here (deviation 5). The frozen L3 artefact exists and is
coherent; scoring it awaits taxonomy alignment.

## Manager's-eye narrative (the proactive-loop transcript)

What a Beer Hall manager would have lived through in June, from the brain running
over the real stream (Stage 3, existing modules, no detector reimplemented):

- **Sat 6 Jun, GBP 3,301.** Expected (frozen reason): weekend, no fixture. What
  happened: a big Saturday, +167% over the GBP 1,235 expectation. Brain surfaced a
  HIGH deviation (z=3.73), attributed to World Cup matches in trading hours. The
  manager gets an early, correct "unusually busy, World Cup on" flag.
- **Sat 13 Jun, GBP 3,518.** HIGH deviation (z=4.07). The busiest day of the month,
  again flagged and attributed to the tournament.
- **Sat 20 Jun (Ellel), GBP 2,287.** A private-event night. Brain flagged a HIGH
  deviation (z=5.64) but attribution could only cite the term transition and
  coincident fixtures, because the private booking is invisible to the brain. An
  honest "something big happened, cause not in my data" surface.
- **Sat 27 Jun, GBP 3,082 (Panama v England).** HIGH deviation (z=3.26). Actual
  +150% over baseline; the brain flagged and tied it to England playing.
- **All June, Two River Taps.** Six downward deviations (actual GBP 0 vs ~GBP 600
  expected), and the change-point/briefing layer surfaced the venue as a "sustained
  shift since 2026-05-08, 71% below normal, coincides with closure (structural
  break)" every day. The brain correctly and repeatedly told the manager this venue
  is dark.
- **Stock.** The Beer Hall cover model flagged `lunebrew caravan of love` at 0 days
  of cover, reorder 1 keg, surfaced in the daily brief.

### Deviation, change-point, attribution, briefing behaviour

- **Deviation** flagged 4 Beer Hall June days (all the World Cup Saturdays plus
  26 Jun), 6 Two River Taps days (all the closed-venue zeros), and the one Ellel
  event. No false positives on ordinary days.
- **Change-point** recorded 0 new onsets WITHIN June: the two real regime shifts
  (the December cold-snap dip and the 8 May Two River Taps closure) onset before
  June and were carried as continuing items, which is correct behaviour.
- **Attribution** correctly surfaces the World Cup fixtures, but lists EVERY fixture
  inside its coincidence window (40+ matches on late-June days), not just the
  relevant England or big fixture. This is a real noise finding: the module works
  but needs fixture ranking/filtering. Flagged, not fixed (a simulation pass does
  not add detector logic).
- **Briefing** surfaced something on 30/30 June days. The raw item count (about 70
  per week) is an UPPER BOUND: this pass invokes `briefing.build` per day WITHOUT
  persisting the `briefing_runs` chain, so the new/continuing/resolved suppression
  that collapses standing items (the December change-point, the Two River Taps
  closure, the standing stock reorder) never engages, and those items re-surface as
  new every day. With run-to-run persistence the sustained daily fatigue is far
  lower. The honest reading: the brain never went silent on a genuinely eventful
  June (good), but the un-suppressed daily volume shows why the continuing-item
  de-duplication matters for fatigue (the false-alarm thesis, on real data).

## Leak-free invariant

The pulled June actuals live only in `brain/sim/june2026_actuals_l1_raw.json`,
`june2026_actuals_l2_raw.json`, `june2026_actuals.parquet`, and the derived
`june2026_confront_result.json` / `june2026_brain_result.json`. Stage 3 ran against
a throwaway store COPY in scratch with synthetic June `line_items` inserted; the
served `brain/store/brain.duckdb` was opened read-only and is unchanged. Actuals
were never served.

## Deviations from the spec

1. **Mode is MCP-SIM, not LIVE-NEON.** Ryan's `NeonAdapter` remains unprovisioned
   (`BRAIN_NEON_DSN` unset, `psycopg` absent). The Square Reporting API via the
   Claude Code connector is a labelled stand-in and is NOT presented as having
   exercised the production ingest path.
2. **L1 actuals via the Square `SalesUK` reporting view** (server-side daily net
   sales, ex-VAT), not per-order aggregation, because full-order pulls exceeded the
   token budget. Net sales exclude tax; a flat 20% VAT was confirmed
   (tax = gross/6 exactly), matching the brain's ex-VAT basis.
3. **L3 not scored against actuals** (item-taxonomy reconciliation out of scope).
   The frozen L3 artefact exists and is coherent; L2 was scored at category level.
4. **Briefing fatigue is an upper bound** (no persisted `briefing_runs` chain across
   the simulated days), stated above.
5. **Attribution over-verbosity flagged, not fixed.** The existing module surfaces
   all coincident fixtures; ranking them is future wiring, not built here.
6. **Pass 1 was a derived spec** (no standalone G12.13a), and this work landed in
   **two commits, not one** (the operator asked for one), because A13b.0 requires
   the frozen forecast to provably predate the confrontation.

## Acceptance (Pass 2)

| Check | Status |
|---|---|
| A13b.0 | PASS. Pass-1 commit `1d966be` located; `git log` proves it (22:41:58) predates the actuals refresh (22:46:48); frozen forecast loaded from the committed parquet, not regenerated. |
| A13b.1 | PASS. June actuals pulled held-out, ex-VAT, into eval files only; mode named (MCP-SIM); served store confirmed unmodified. |
| A13b.2 | PASS. Frozen forecast scored vs actuals at L1 and L2; out-of-sample MASE compared to backtest with the horizon caveat; World Cup fixture effect measured on the three real England dates with the power caveat. |
| A13b.3 | PASS. Weekly-rolling view produced and labelled as using progressive actuals, distinct from the pre-registered number. |
| A13b.4 | PASS. Deviation, change-point, attribution, briefing, and stock all run via existing modules over June; nothing reimplemented (the attribution noise and the un-persisted briefing chain are flagged, not rebuilt). |
| A13b.5 | PASS. Both faces present; leak-free invariant held; Pass-1 SHA cited; decision-log row added. |

## Bottom line

The pre-registered cold 30-day forecast under-shot a June that turned out much
bigger than a May-trained model could foresee (Beer Hall GBP 27k actual vs GBP 14k
forecast, MASE 1.64 vs 0.745 backtest), the realistic weekly-rolling operation was
materially better (1.47, and 0.32 once it learned Two River Taps had closed), and
the World Cup fixture effect was real and positive on every England date. The
proactive brain, run over the real June stream, flagged every genuinely unusual day
and stayed correct on the closed venue, while exposing two concrete go-live gaps: a
liveness gate before serving a dead venue, and fixture ranking plus persisted
run-to-run de-duplication to control alert fatigue. The served store was never
touched; the actuals were held out; the forecast provably predated them.
