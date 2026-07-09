# PRJ93 G12.13a Frozen Forecast Report (Pass 1 of 2)

Pre-register the forward 1 to 30 June 2026 forecast, BLIND to June actuals, so
Pass 2 (G12.13b) can confront it against reality as a true out-of-sample test
rather than a post-hoc fit. Branch: `brain-construction`. Run venv:
`.venv-forecast` (Python 3.12, Chronos-2 present). Forecast-only: no actuals were
read, no served store was written.

This pass exists because the G12.13b airtight precondition (A13b.0) requires a
committed frozen forecast that provably predates the confrontation, and none
existed: G12.12 STOPped at its gate a and never produced one. There was no
standalone G12.13a spec; this pass was derived from the Pass-1 references inside
`PRJ93_Spec_G12_13b_Pass2_Confront.md` with the operator's authorisation
(recorded as deviation 1).

## What was produced

A single committed artefact pair under `brain/sim/`, built by
`sim/build_frozen_forecast.py`:

- `june2026_forecast_frozen.parquet` - 3030 rows: 90 L1 (30 June days x 3
  venues), 630 L2 (category), 2310 L3 (top-3 items per category + OTHER).
- `june2026_forecast_frozen.json` - metadata: creation timestamp, per-venue model
  and train ceiling, the blindness statement, the L2/L3 method, caveats, and a
  per-venue per-day frozen reason string.

## Method

Each venue serves its gate winner (V1, decision log Section C) PURE at L1, then
L2/L3 are disaggregated coherently from that pure L1 total:

| Venue | Model (L1) | Train ceiling | June L1 total | 90% band half-width |
|---|---|---|---|---|
| beer_hall | rung4_chronos2_exo | 2026-05-31 | GBP 13,917 | +/- 627 |
| two_river_taps | rung2_ets | 2026-05-08 | GBP 5,329 | +/- 239 |
| ellel | rung1_robust_dow | 2026-05-22 | GBP 604 | +/- 403 |

- **Known-future covariates** for the Beer Hall Chronos-2 exo winner: calendar,
  school/uni term, bank holiday, and the four `wc_*` World Cup fixture flags are
  computed forward (pure date functions plus the fixed fixture calendar).
  `is_ellel_event` is 0 forward (a 31 May forecaster does not know which June
  nights Ellel will trade). Weather is a climatological normal (prior-June mean
  per grid cell on the hindcast serving basis); beyond the ~16 day live
  weather-forecast horizon there is no skilful forecast, so climatology is the
  honest known-future prior rather than realised June weather, which would leak
  reality into a forecast. This is the day-8-to-30 extrapolation caveat.
- **Band**: split-conformal half-width from the served model's recent 90-day
  rolling 7-day-ahead residuals. Because the June horizon runs to 30 days ahead,
  the band is a nominal floor beyond day 8, not a calibrated 30-day interval.
- **L2/L3**: forecast-proportion disaggregation of the pure L1 total by recent
  120-day ex-VAT revenue share (category share of venue; item share of category,
  top-3 + OTHER). Coherent by construction: verified max |L1 - sum L2| = 0.0000
  at every venue, and sum L3 = sum L2 = L1. The served venue total stays pure L1,
  never reconciled downward (the G12.12 design invariant). The measured MinT
  vs disaggregation A-vs-B (G12.12c) is deferred; disaggregation is the frozen
  choice because it preserves the pure L1 top (deviation 4).

## World Cup fixtures the frozen forecast pre-commits to

Three England fixtures fall in June and are flagged `wc_england_in_hours=1` in the
frozen Beer Hall L1 rows, with their frozen reasons:

| Date | DOW | Frozen BH L1 yhat | Fixture (in hours) |
|---|---|---|---|
| 2026-06-17 | Wed | GBP 300 | England v Croatia 21:00 |
| 2026-06-23 | Tue | GBP 39 | England v Ghana 21:00 |
| 2026-06-27 | Sat | GBP 1,083 | Panama v England 22:00 |

These are the pre-registered dates Pass 2 will test the fixture effect on: whether
actual sales moved on real England dates, and whether the `wc_*` features improved
accuracy there. One June yields a handful of dates, so Pass 2 will report this as
directional evidence with the power caveat, never a significant estimate.

## Blindness statement

No June 2026 actual (revenue, units, orders, or weather) was read during this
pass. The forecast is a function only of data on or before each venue's store
ceiling (<= 2026-05-31), the fixed fixture calendar, deterministic calendar
functions, and prior-year climatology. The artefact is committed in this pass,
before Pass 2 opens any actuals channel, so `git log` proves the forecast predates
the confrontation (A13b.0).

## Deviations from the (derived) spec

1. **No standalone G12.13a spec existed.** Pass 1 was derived from the Pass-1
   references in the G12.13b spec, with operator authorisation. Scope kept
   minimal: produce and freeze the forward forecast, nothing else.
2. **Weather beyond the ~16 day horizon is climatology**, not a skilful forecast
   (there is no archived 30-day June forecast to draw on). Documented as the
   extrapolation caveat; blind to realised June.
3. **`is_ellel_event` = 0 forward** for all venues (the blind default), since June
   Ellel trading nights are unknown at forecast time.
4. **L2/L3 by revenue-share disaggregation, not MinT.** The measured A-vs-B
   (G12.12c) is deferred; disaggregation preserves the pure L1 top and is coherent.
5. **L3 scoped to top-3 items per category + OTHER**, not the full 125-to-280 item
   catalogue per venue, to keep the artefact meaningful and scoreable.
6. **two_river_taps is INACTIVE in Square** (a real closure). Its ETS horizon
   projects forward from a 2026-05-08 ceiling and may confront a closed or
   near-closed venue in June; the GBP 5,329 frozen total is retained deliberately
   as honest confrontation material, not corrected.
7. **Two commits, not one.** The operator asked to commit as one; A13b.0 requires
   the frozen forecast to provably predate the confrontation, so Pass 1 is its own
   commit here and Pass 2 follows in a separate commit. Necessary for admissibility.

## Acceptance (Pass 1 half of A13b.0)

| Check | Status |
|---|---|
| Frozen artefact exists | PASS - `brain/sim/june2026_forecast_frozen.{parquet,json}`, 3030 rows, all three venues, L1/L2/L3. |
| Coherent | PASS - L2 sums to L1 (max diff 0.0000), L3 sums to L2 at every venue. |
| Blind to actuals | PASS - no June actual read; covariates are calendar + fixtures + climatology only. |
| Committed to predate Pass 2 | Completed by this pass's commit; Pass 2 records the SHA and verifies via `git log`. |

## Bottom line

The pre-registered forward June forecast is frozen and committed. Pass 2 will pull
the real June actuals held-out, score this exact artefact against them at all
levels, measure the World Cup fixture effect on the three real England dates, add
the realistic weekly-rolling view, and run the full proactive brain over the June
stream. Nothing here was fit to June; that is the whole point.
