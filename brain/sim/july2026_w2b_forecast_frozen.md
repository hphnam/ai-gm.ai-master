# Frozen July 8 to 14 2026 forecast (pre-registration, Origin B: 7 July cutoff)

As-of cutoff 2026-07-07 (production 7-day cadence); horizon 2026-07-08 to 2026-07-14, a true 7-day-ahead forecast. produced 2026-07-10 before any 8 to 14 July 2026 actual existed; 11 to 14 July are in the future. Cutoff 2026-07-07 (production 7-day cadence), so the 1 July England fixture and its observed uplift are IN the model context. Weather is the real hindcast forecast basis for 8 to 14 July, is_ellel_event=0 forward, wc_* from the fixed fixture calendar

Corrects report 28's Origin A (a590f91, 29-June cutoff, 9 to 15 day-ahead), which stands untouched. Liveness gate dormant: ['two_river_taps'].

## Sharpening hypothesis (Beer Hall, 11 July England QF)

Origin A lifted 11 July GBP +312 over the Saturday baseline; Origin B lifts it GBP +309. Origin B does NOT sharpen the England anticipation with the extra week of context (delta GBP -3). C2 scores both against the actual.

## beer_hall  (model rung4_chronos2_exo, L2/L3 mint, ceiling 2026-07-07)
Expected Jul 8 to 14 L1 total GBP 4,469; 11 Jul (England QF, Saturday) point GBP 1,558.

Pre-registered expectation, Origin B vs Origin A (yhat lift over weekday baseline):

| date | fixture | B yhat | B lift | A lift | B - A |
|---|---|---|---|---|---|
| 2026-07-11 | england_qf_in_hours | 1,558 | +309 | +312 | -3 |
| 2026-07-09 | generic_france_morocco | 767 | +109 | +78 | +32 |
| 2026-07-10 | generic_spain_belgium | 1,103 | +240 | +183 | +57 |

| date | yhat | lo | hi | reason |
|---|---|---|---|---|
| 2026-07-08 | 364 | 0 | 1,082 | weekday |
| 2026-07-09 | 767 | 49 | 1,485 | World Cup match(es) in trading hours (France v Morocco); weekday |
| 2026-07-10 | 1,103 | 385 | 1,821 | World Cup match(es) in trading hours (Spain v Belgium); weekday |
| 2026-07-11 | 1,558 | 840 | 2,277 | England fixture in trading hours (Norway v England 22:00); expect uplift; weekend |
| 2026-07-12 | 514 | 0 | 1,232 | weekend |
| 2026-07-13 | 45 | 0 | 763 | weekday |
| 2026-07-14 | 118 | 0 | 836 | World Cup match(es) in trading hours (Winner Match 97 v Winner Match 98); weekday |

## two_river_taps: DORMANT - no trading in the 21 days to 2026-07-07; liveness gate withholds a positive forecast

## ellel  (model rung1_robust_dow, L2/L3 disaggregation, ceiling 2026-07-04)
Expected Jul 8 to 14 L1 total GBP 56; 11 Jul (England QF, Saturday) point GBP 56.

Pre-registered expectation, Origin B vs Origin A (yhat lift over weekday baseline):

| date | fixture | B yhat | B lift | A lift | B - A |
|---|---|---|---|---|---|
| 2026-07-11 | england_qf_in_hours | 56 | -776 | -797 | +21 |
| 2026-07-09 | generic_france_morocco | 0 | -431 | -702 | +270 |
| 2026-07-10 | generic_spain_belgium | 0 | -215 | -215 | +0 |

| date | yhat | lo | hi | reason |
|---|---|---|---|---|
| 2026-07-08 | 0 | 0 | 259 | weekday |
| 2026-07-09 | 0 | 0 | 259 | World Cup match(es) in trading hours (France v Morocco); weekday |
| 2026-07-10 | 0 | 0 | 259 | World Cup match(es) in trading hours (Spain v Belgium); weekday |
| 2026-07-11 | 56 | 0 | 316 | England fixture in trading hours (Norway v England 22:00); expect uplift; weekend |
| 2026-07-12 | 0 | 0 | 259 | weekend |
| 2026-07-13 | 0 | 0 | 259 | weekday |
| 2026-07-14 | 0 | 0 | 259 | weekday |

