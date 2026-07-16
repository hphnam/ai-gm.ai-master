# Report 31 - G12.17c Step C2: confronting both 8 to 14 July origins

Date: 2026-07-16. Scope: the second July window, Pass 2. Scores the two committed
Pass-1 freezes against reality and reports the two-case England anticipation and the
England-minus-generic gap that report 29 pre-registered.

## Pre-registration status

Both freezes were produced 2026-07-10; the window closed 2026-07-14; actuals were
pulled 2026-07-16. Every target date was in the future at freeze time, so this is
airtight **by calendar**, the strongest form available, not merely by commit ordering.

| Origin | Artefact | Commit | Cutoff | Horizon |
|---|---|---|---|---|
| A | `july2026_w2_forecast_frozen` | `a590f91` | 2026-06-30 | 9 to 15 day-ahead |
| B | `july2026_w2b_forecast_frozen` | `9dd9028` | 2026-07-07 | 7 day-ahead (production-faithful) |

Both artefacts are byte-identical to their Pass-1 state (`git status` clean). Actuals
live only in `sim/july2026_w2_actuals_l1_raw.json` and were never written to the served
store; the confront asserts the store ceiling is still 2026-07-07 with zero rows in the
held-out window before it scores anything, and that assert passed.

## Stage 1: L1 accuracy

Per-day MASE against the same seasonal-naive ruler as the 1 to 7 July confront, so
these are directly comparable to that window's 0.386.

| Origin | Venue | MASE | Coverage @90 | Window forecast | Window actual | Error |
|---|---|---|---|---|---|---|
| A | beer_hall | **0.285** | 1.00 | 4292.65 | 3722.36 | +570.29 (over 15.3%) |
| B | beer_hall | **0.287** | 1.00 | 4468.93 | 3722.36 | +746.57 (over 20.1%) |
| A/B | two_river_taps | dormant | - | no forecast | 0.00 | no false alarm |
| A/B | ellel | 0.096 | 0.857 | 56.30 | 574.63 | -518.33 (under 90.2%) |

Three findings.

**The serving-horizon claim holds again, and strengthens.** Beer Hall 0.285 beats the
1 to 7 July window (0.386) and sits far below the 0.745 backtest class. Band coverage
was 1.00: every day, including the 11 July miss of +573.66, stayed inside the 90%
conformal band. The band did its job precisely where the point forecast did not.

**Origin B did not beat Origin A (0.287 vs 0.285).** The production-faithful 7-day-ahead
forecast is a statistical tie with the 9-to-15-day-ahead one, and marginally worse on
the window total. This is a null result, and it is consistent with report 24's cadence
sweep: Beer Hall error is flat below weekly, so a fresher origin buys responsiveness,
not accuracy. Two independent lines of evidence now say the same thing.

**Ellel's 0.096 is a MASE artefact and must not be reported as accuracy.** The model
forecast GBP 56.30 and the venue took GBP 574.63, a 90.2% under-forecast that breached
the band. MASE looks excellent only because Ellel's booking-driven series has a large
seasonal-naive scale, which flatters small absolute errors. The honest statement is that
the Ellel forecast failed on this window; the scaled metric hides it. This is a
limitation of MASE on intermittent series, not a result.

## Stage 2: the two-case England anticipation - the pre-registered claim FAILS

Report 27's in-context-learning finding was a single case. This is the second, and it
goes the other way.

| Case | Kickoff | DOW baseline | Forecast | Anticipated | Actual | Realised | Direction |
|---|---|---|---|---|---|---|---|
| 1 Jul R32 (report 27) | 17:00 | 296.00 | 487.00 | +191.00 | 746.99 | **+450.99** | correct |
| 11 Jul QF (Origin A) | 22:00 | 1253.62 | 1565.19 | +311.57 | 984.62 | **-269.00** | **wrong** |
| 11 Jul QF (Origin B) | 22:00 | 1249.40 | 1558.28 | +308.88 | 984.62 | **-264.78** | **wrong** |

Both origins anticipated an England uplift of roughly +GBP 310 and reality delivered a
GBP 265 to 269 **shortfall below the day-of-week baseline**. The anticipation was wrong
in sign, not merely in magnitude. `generalises: false`.

This does not overturn report 27, which scored what it scored. It bounds it: one case
in the right direction, one case in the wrong one. The in-context fixture anticipation
is not established.

### The obvious explanation is refuted

The natural reading is kickoff time: Norway v England kicked off 22:00 and the Beer
Hall's derived Saturday envelope closes 23:27, so only about 1.5 hours fell in hours,
against a full prime-slot overlap on 1 July (17:00). The data refuses it.

| Date | Fixture | Kickoff | DOW | Actual | DOW median | Lift |
|---|---|---|---|---|---|---|
| 17 Jun | England v Croatia | 21:00 | Wed | 607.09 | 271.15 | +124% |
| 23 Jun | England v Ghana | 21:00 | Tue | 334.93 | 120.77 | +177% |
| **27 Jun** | **Panama v England** | **22:00** | **Sat** | **3081.50** | **921.47** | **+234%** |
| 1 Jul | England v DR Congo | 17:00 | Wed | 758.54 | 336.83 | +125% |
| **11 Jul** | **Norway v England** | **22:00** | **Sat** | **984.62** | - | **-21%** |

27 June and 11 July hold day-of-week and kickoff hour constant and invert the outcome:
the same Saturday-22:00 England configuration produced the **largest lift on record**
(+234%) and then a shortfall (-21%). Kickoff time does not explain 11 July, and neither
does day of week.

The 11 July shortfall is therefore **unexplained by the covariates in
`CHRONOS2_EXO_COLS`**. Named next diagnostics, in order: weather on 11 July (the one exo
family not yet compared across the two Saturdays, and absent from the feature frame
because the date is held out); estate cannibalisation (11 July also carries an Events
booking of GBP 779.94 and an Ellel event of GBP 385.12, both absent on 27 June); and
tournament-stage effects. None is tested here; they are hypotheses, and the last time an
obvious explanation was assumed rather than tested it was wrong within the hour.

## Stage 3: England-minus-generic - expectation confirmed, reality inverted

Report 29 pre-registered that Origin B would not sharpen the England anticipation
(+308.88 vs A's +311.57, delta -2.69) but would raise generic-match anticipation,
narrowing the premium at the expectation level. **That expectation is confirmed**: the
expected premium fell from +181.36 (A) to +134.22 (B).

Reality inverted the sign for both.

| Origin | Expected premium | Realised premium |
|---|---|---|
| A | +181.36 | **-315.66** |
| B | +134.22 | **-299.23** |

Per generic match, the picture is mixed rather than uniformly wrong: 9 Jul (France v
Morocco) was over-called by both (expected +77.58/+109.20, realised -207.15/-207.08),
while 10 Jul (Spain v Belgium) was **under**-called (expected +182.84/+240.11, realised
+300.48/+275.98) - the one date where Origin B's raised generic anticipation helped.

This corrects report 24's home-nation finding (England +130%, generic within noise of
no-match). On this window the ordering reverses: the generic Friday fixture beat its
baseline while the England Saturday fell below it. Report 24's finding came from three
June England dates and was labelled directional; it does not survive as stated.

## Verdicts

1. The serving-horizon accuracy claim holds: Beer Hall L1 MASE 0.285 at 7-day, coverage 1.00.
2. Origin B does not beat Origin A. Null result, consistent with the report-24 cadence sweep.
3. The liveness gate held a third time: TRT dormant, no forecast, no false alarm.
4. The conformal band held where the point forecast failed: the 11 July miss stayed in-band.
5. **The England anticipation does not generalise.** One case right, one wrong in sign.
6. **The home-nation premium is not established** and report 24's version does not survive.
7. Ellel's MASE flatters a 90.2% under-forecast; do not quote it as accuracy.
8. The 11 July shortfall is an open question, with kickoff time and day-of-week refuted.

## Reproduction

```
.venv-forecast/bin/python -m sim.confront_july_w2      # writes july2026_w2_confront_result.json
```

Actuals: `sim/july2026_w2_actuals_l1_raw.json` (Square MCP-SIM, pulled 2026-07-16,
merchant ML1FFAGJMQBTZ, view SalesUK, measure `net_sales_minus_auto_gratuity`, ex-VAT).
`sim/confront_july_w2.py` refuses to run if the store ceiling is not 2026-07-07 or if any
row exists in the held-out window.
