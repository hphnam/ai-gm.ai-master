# 29 - G12.17c-b (Corrected C1): production-faithful 7-day-cadence freeze of 8 to 14 July

Spec: `PRJ93_Spec_G12_17cb_Corrected_Freeze.md`. Branch `brain-construction`, `.venv-forecast`.
Corrects a horizon inconsistency Nam caught in the first C1 (report 28). It advances the
operational clock through 7 July (ingesting the 1 to 7 July week as observed history)
and re-freezes 8 to 14 July from the 7 JULY cutoff: the true 7-day-ahead forecast the
live system actually serves, with the 1 July England fixture and its observed uplift in
the model context. The first freeze (Origin A, `a590f91`) stands committed and
untouched; this adds a second, production-faithful origin.

Committed under Nam only.

## The inconsistency this corrects

The first C1 conditioned on data through 29 June and forecast 8 to 14 July, a 9 to 15
day-ahead forecast, "for comparability" with the 1 to 7 window. But the live AIGM
refreshes every 7 days (`RETRAIN_CADENCE_DAYS = 7`): by 8 July it would have ingested 1
to 7 July as observed history and forecast 8 to 14 July from a 7 July cutoff, a true
7-day-ahead forecast, WITH the 1 July England fixture already observed. Origin A denied
the model exactly the context the in-context test is meant to measure, and compared two
different horizons from one origin. Origin B fixes both.

## Why re-freezing is still admissible pre-registration

The target dates 8 to 14 July are still in the future (today 2026-07-10; 11 to 14 July
have not happened), so a new freeze from a 7 July cutoff is genuinely blind to the
outcome. This is admissible precisely because the outcome does not exist yet, unlike the
June case where re-freezing would have been post-hoc. No 8 to 14 July actual was read.

## The experiment this creates (two origins, one target)

Keeping both origins turns the correction into a measurement. Two blind forecasts of the
SAME target (8 to 14 July), from two cutoffs, differing ONLY in cutoff (same standing
gate winners, same config, no model re-selection):

- **Origin A** (`a590f91`, report 28): cutoff 29 June, 9 to 15 day-ahead, no July
  fixture in context.
- **Origin B** (this pass): cutoff 7 July, true 1 to 7 day-ahead, the 1 July England
  fixture and its observed uplift in context, exactly as production would run.

Step C2 (after 2026-07-14) scores BOTH against the held-out 8 to 14 July actuals, so it
can measure how much the extra week of context improves the 11 July England anticipation
and the accuracy, at a fixed target.

## G12.17c-b-1: advance the operational clock through 7 July

Store verified June-inclusive first (ceiling 2026-06-29, 867 June rows). Ingested 1 to 7
July as observed history from the held-out eval files (`sim/july2026_actuals_l3_raw.json`)
into `line_items` at the same labelled aggregate daily grain the June ingest used
(`sim/ingest_july_w1_actuals.py`), watermark advanced to 2026-07-07. All seven July days
present; reconciliation to the held-out SalesUK pull: Ellel GBP 0.00, Beer Hall +GBP
29.36 (the known ProductMix-vs-SalesUK gap, report 27); L1/L2/L3 mutually coherent.
This is legitimate: 1 to 7 July are past and were already scored held-out in G12.17b, so
they are now observed history, and this pass forecasts FORWARD from them. The 1 to 7 July
frozen artefact (`7d103aa`) is untouched. Weather for 8 to 14 July already existed
(extended in the first C1) and reaches 14 July with no NaN.

## G12.17c-b-2: re-freeze 8 to 14 July from the 7 July cutoff (Origin B)

`sim/build_july_w2b_forecast.py`, same standing winners and config as Origin A:

- **Beer Hall** `rung4_chronos2_exo` + MinT, train ceiling 2026-07-07, expected 8 to 14
  July L1 GBP 4,469 (11 Jul GBP 1,558).
- **Ellel** `rung1_robust_dow` + disaggregation, ceiling 2026-07-04, GBP 56.
- **Two River Taps** dormant (liveness gate) - not forecast.

All levels coherent (L1 = sum L2 = sum L3), 462 rows. Fixture flags re-asserted: 11 Jul
fires England + home-nation in-hours for the Beer Hall, 9/10 Jul generic match-in-hours
only, the 12 Jul 02:00 match fires nothing. Ellel's data-derived Saturday window still
fires its 11 Jul England flag; still inert, since robust-DOW reads no `wc_*` covariate
(report 28 note carried forward). Artefacts `sim/july2026_w2b_forecast_frozen.{parquet,json,md}`,
non-gitignored, committed.

## Pre-registered expectations: Origin B vs Origin A (Beer Hall)

Per fixture date, yhat lift over the weekday (DOW-median) baseline, stated before any
actual:

| date | fixture | Origin B lift | Origin A lift | B - A |
|---|---|---|---|---|
| 11 Jul | England QF (in-hours) | +GBP 309 | +GBP 312 | **-GBP 3** |
| 9 Jul | France v Morocco (generic) | +GBP 109 | +GBP 78 | +GBP 32 |
| 10 Jul | Spain v Belgium (generic) | +GBP 240 | +GBP 183 | +GBP 57 |

**Origin B does NOT sharpen the England anticipation** (the 11 Jul lift is essentially
unchanged, -GBP 3). The naive hypothesis - that seeing the 1 July England fixture would
raise the 11 July England expectation - is not borne out at the expectation level,
because the model already carried June's World Cup fixtures in context; one more fixture
week added no England-specific signal.

What the extra week DID do is raise the GENERIC match-day anticipation (9 Jul +GBP 32,
10 Jul +GBP 57): the observed uplift across the 1 to 7 July match days taught the
`wc_match_in_hours` effect, lifting all match dates. So the home-nation PREMIUM narrows
at the expectation level - Origin A expected England (+312) to clearly out-lift the
generics (+78, +183); Origin B expects England (+309) only modestly above the 10 Jul
generic (+240). Whether reality shows England genuinely out-lifting generics, and which
origin is more accurate, is exactly what C2 scores. This is an honest null on the
sharpening hypothesis and a real, testable shift in the generic-vs-home-nation gap - a
better outcome than a confirmed prior, because it is measurable against the held-out
week. Ellel, on robust-DOW, stays blind to bookings and lifts nothing (correctly).

## Deviations from the spec

1. **Sharpening hypothesis not confirmed (reported, not forced).** The spec framed the
   hypothesis that Origin B's extra week sharpens the 11 July England anticipation. It
   does not (-GBP 3); instead it raises the generic-match anticipation. Reported plainly
   as an honest null with the mechanism, rather than presented as a confirmed effect.
2. **Ellel 11 Jul England flag fires** (carried forward from report 28): the data-derived
   Saturday window overlaps the 22:00 match; inert because robust-DOW reads no `wc_*`.
3. **Report numbered 29** per the log index.

## Leak-free and provenance

No 8 to 14 July sales actual was read. The served store now holds 1 to 7 July as observed
history (the intended clock advance) with `line_items` max 2026-07-07 and ZERO rows on or
after 8 July (verified). The only other served-store write was the exogenous weather
tables (forecast covariate input, not target actuals). Mode: MCP-SIM, a labelled
stand-in for the production `NeonAdapter`. Origin A (`a590f91`), the 1 to 7 July frozen
artefact (`7d103aa`), the June frozen artefact (`1d966be`) and `stock_inventory.py` are
untouched. Both suites green (`.venv-forecast` 269 passed 1 skip; `.venv` 262 passed 8
skip); the store was rebuilt to the May seed by the test run per report 27's durability
caveat, then re-ingested June- and July-1-to-7-inclusive to restore the advanced state.
Step C2 (after 2026-07-14) scores both origins against the held-out 8 to 14 July actuals.
