# 28 - G12.17c (Step C1 of 2): freeze a second blind July window (8 to 14 July)

Spec: `PRJ93_Spec_G12_17c_July_Extension.md`. Branch `brain-construction`, `.venv-forecast`.
Pre-registers a forecast for 8 to 14 July 2026 from the same June-inclusive store cutoff
the 1 to 7 July freeze used, and commits it before any 8 to 14 July actual exists. The
window carries the England quarter-final (Norway v England, 11 Jul 22:00 London,
in-hours for the Beer Hall) plus two in-hours non-home-nation matches (France v Morocco
9 Jul, Spain v Belgium 10 Jul), so Step C2 can add a second England fixture to the
in-context evidence and test the home-nation-vs-generic distinction forward on held-out
dates. This report covers Step C1 (the freeze) only.

Committed under Nam only.

## Why this is Step C1 and not a same-session confront

Today is 2026-07-10. The 8 to 14 July window is PARTLY IN THE FUTURE: 11 Jul (the
England QF) and 12 to 14 Jul have not happened. So this cannot be a freeze-and-confront
in one session. It is split by design:

- **Step C1 (this report, run now):** pre-register the 8 to 14 July forecast from data
  through the current store cutoff and commit it before those actuals exist. Because
  the key dates are genuinely in the future, the pre-registration is airtight by
  CALENDAR, not only by commit ordering - stronger than the 1 to 7 run, whose dates
  had already passed at freeze time.
- **Step C2 (a later session, strictly after 2026-07-14):** pull 8 to 14 July actuals
  held-out and score the frozen forecast; combine the 11 Jul England QF with the 1 Jul
  England R32 into a two-date in-context table; run the home-nation-vs-generic forward
  check; run the full brain over the window.

No 8 to 14 July actual was read in this pass. Confronting before the dates pass would
mean fabricating them, which the spec forbids and this pass did not do.

## Precondition: store June-inclusive (verified)

Report 27 logged that the June ingest into the served store is not durable across
`warehouse.build()`. Per the spec this pass verified the store ceiling before freezing:
`MAX(date)` on `line_items` is **2026-06-29** with **867 June rows** - June-inclusive,
no re-ingest needed. Verified again after freezing: still 2026-06-29, zero July rows.

## What was frozen

`sim/build_july_w2_forecast.py` serves the SAME standing gate winners, config and
cutoff as the 1 to 7 freeze, so the two windows are directly comparable (no
re-selection):

- **Beer Hall** `rung4_chronos2_exo` + MinT, train ceiling 2026-06-29.
- **Ellel** `rung1_robust_dow` + revenue-share disaggregation, train ceiling 2026-06-20.
- **Two River Taps** dormant (liveness gate, no trading in the 21 days to 2026-06-30) -
  not forecast.

Known-future covariates match the 1 to 7 freeze: calendar / term / bank-holiday and the
World Cup `wc_*` (incl. home-nation flags) computed forward; `is_ellel_event = 0`
forward (blind); weather on the real hindcast forecast basis, retrieved into the store
for 8 to 14 July (a genuine forward forecast pulled 2026-07-10, 22 to 29 C, dry).
Because the cutoff is end-June, this is a 9 to 15 day-ahead horizon - longer than the
reliable 7-day regime, chosen for comparability with the 1 to 7 window, not for
accuracy. L2/L3 use the measured split (report 23): MinT for the Beer Hall, disaggregation
for Ellel. All levels coherent (L1 = sum L2 = sum L3 every day); 462 rows
(14 L1, 91 L2, 357 L3). Artefacts `sim/july2026_w2_forecast_frozen.{parquet,json,md}`,
non-gitignored, committed.

## Fixture flags (A17c.1)

Computed code-derived from each venue's trading window; asserted in the build:

| date | match (kickoff) | Beer Hall flags | correct |
|---|---|---|---|
| 9 Jul | France v Morocco 21:00 | match-in-hours=1, England=0, home=0 | yes (generic) |
| 10 Jul | Spain v Belgium 20:00 | match-in-hours=1, England=0, home=0 | yes (generic) |
| 11 Jul | Norway v England 22:00 | match-in-hours=1, **England=1, home=1** | yes (home nation) |
| 12 Jul | Argentina v Switzerland 02:00 | all flags 0 | yes (out of hours) |

Only 11 Jul fires England / home-nation in-hours for the Beer Hall; the 02:00 match
fires nothing. Assertions pass in `build_july_w2_forecast._assert_fixture_flags`.

## Pre-registered expectations (the point of the freeze)

Stated in the artefact before any actual, per fixture date, as the model's yhat vs the
weekday (DOW-median) baseline:

| venue | 11 Jul England QF | 9 Jul generic | 10 Jul generic |
|---|---|---|---|
| Beer Hall | GBP 1,565 vs 1,254 base, **+312 (+25%)** | GBP 735 vs 658, +78 (+12%) | GBP 1,021 vs 838, +183 (+22%) |
| Ellel | GBP 56 vs 853 base, no lift | GBP 0, no lift | GBP 0, no lift |

The Beer Hall Chronos-exo model lifts EVERY in-hours match date above its weekday
baseline, and lifts the England QF the most in absolute terms (+GBP 312). This is the
forward, held-out test of the G12.15b home-nation prior: the model expects England to
beat a normal Saturday by more than the generic matches beat their weekdays, but it
does NOT expect generic matches to be inert - the `wc_match_in_hours` covariate carries
a positive learned effect too. Whether reality agrees, and whether England genuinely
out-lifts the generics, is exactly what Step C2 scores. The Beer Hall expected 8 to 14
July L1 total is GBP 4,293 (comparable to the 1 to 7 window's GBP 3,917).

Ellel, on robust-DOW, stays blind to bookings (is_ellel_event 0 forward): it does not
lift any fixture date, correctly, since it is a hall not a football pub and knows of no
booking. Its 11 Jul GBP 56 sits far below the DOW-median baseline (which is inflated by
Ellel's rare large Saturday events).

## Deviations from the spec

1. **Ellel's 11 Jul England flag fires; the spec assumed it would not.** The spec
   expected the 11 Jul England flag to fire only for a venue "open at 22:00 (Beer Hall
   yes; Ellel no)". But the flag window is code-derived from each venue's data, and
   Ellel's data-derived Saturday trading window runs to about 23:42 (its historical
   evening hall bookings), which overlaps the 22:00 match. So Ellel's
   `wc_england_in_hours` computes to 1 on 11 Jul, not 0. This is reported rather than
   hand-forced: overriding the generic window to match the spec's assumption would be
   fabricating hours. It is substantively inert - Ellel's served model is robust-DOW,
   which consumes no `wc_*` covariate, so the flag never touches Ellel's forecast (its
   11 Jul point is GBP 56 regardless). The shared `_reason` helper likewise prints an
   "expect uplift" note on Ellel's 11 Jul row from the same coincident-fixture logic;
   the actual yhat correctly shows no uplift, and the fixture-expectations block records
   "does NOT lift above baseline" honestly.
2. **A 9 to 15 day-ahead horizon, not 7-day.** Freezing from the end-June cutoff (for
   comparability with the 1 to 7 window) puts 8 to 14 July 9 to 15 days out, beyond the
   reliable 7-day regime. This is deliberate and disclosed in the artefact caveats; C2
   will read the accuracy honestly against it.
3. **Report numbered 28** per the log index.

## Leak-free and provenance

No 8 to 14 July sales actual was read. The served store's `line_items` max stays
2026-06-29 with zero July rows (verified before and after). The only served-store write
was extending the exogenous weather tables (hindcast + leadmatched) to 14 July - forecast
covariate input, not target actuals, exactly as the 1 to 7 freeze extended them to 7
July. The frozen June artefact (`1d966be`), the 1 to 7 July artefact (`7d103aa`) and
`stock_inventory.py` are untouched. Mode for the (later) C2 actuals will be MCP-SIM, a
labelled stand-in for the production `NeonAdapter`. Step C2 must run only after
2026-07-14 with this freeze's commit proven earlier by git log.
