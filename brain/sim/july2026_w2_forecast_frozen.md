# Frozen July 8 to 14 2026 forecast (pre-registration, second window)

As-of cutoff 2026-06-30; horizon 2026-07-08 to 2026-07-14. produced 2026-07-10 before any 8 to 14 July 2026 actual existed; 11 to 14 July are genuinely in the future, so the pre-registration is airtight by calendar. Weather is the real hindcast forecast basis for 8 to 14 July, is_ellel_event=0 forward, wc_* from the fixed fixture calendar

Liveness gate dormant: ['two_river_taps']. Sibling window: the 1 to 7 July freeze (7d103aa).

## beer_hall  (model rung4_chronos2_exo, L2/L3 mint)
Expected Jul 8 to 14 L1 total GBP 4,293; 11 Jul (England QF, Saturday) point GBP 1,565.

Forward expectation (stated before any actual):
- 2026-07-11 england_qf_in_hours: yhat GBP 1,565 lifts ABOVE the weekday baseline GBP 1,254 (delta GBP +312)
- 2026-07-09 generic_france_morocco: yhat GBP 735 lifts ABOVE the weekday baseline GBP 658 (delta GBP +78)
- 2026-07-10 generic_spain_belgium: yhat GBP 1,021 lifts ABOVE the weekday baseline GBP 838 (delta GBP +183)

| date | yhat | lo | hi | reason |
|---|---|---|---|---|
| 2026-07-08 | 383 | 0 | 1,129 | weekday |
| 2026-07-09 | 735 | 0 | 1,481 | World Cup match(es) in trading hours (France v Morocco); weekday |
| 2026-07-10 | 1,021 | 275 | 1,767 | World Cup match(es) in trading hours (Spain v Belgium); weekday |
| 2026-07-11 | 1,565 | 819 | 2,311 | England fixture in trading hours (Norway v England 22:00); expect uplift; weekend |
| 2026-07-12 | 499 | 0 | 1,245 | weekend |
| 2026-07-13 | 38 | 0 | 784 | weekday |
| 2026-07-14 | 51 | 0 | 797 | World Cup match(es) in trading hours (Winner Match 97 v Winner Match 98); weekday |

## two_river_taps: DORMANT - no trading in the 21 days to 2026-06-30; liveness gate withholds a positive forecast

## ellel  (model rung1_robust_dow, L2/L3 disaggregation)
Expected Jul 8 to 14 L1 total GBP 56; 11 Jul (England QF, Saturday) point GBP 56.

Forward expectation (stated before any actual):
- 2026-07-11 england_qf_in_hours: yhat GBP 56 does NOT lift above the weekday baseline GBP 853 (delta GBP -797)
- 2026-07-09 generic_france_morocco: yhat GBP 0 does NOT lift above the weekday baseline GBP 702 (delta GBP -702)
- 2026-07-10 generic_spain_belgium: yhat GBP 0 does NOT lift above the weekday baseline GBP 215 (delta GBP -215)

| date | yhat | lo | hi | reason |
|---|---|---|---|---|
| 2026-07-08 | 0 | 0 | 275 | weekday |
| 2026-07-09 | 0 | 0 | 275 | World Cup match(es) in trading hours (France v Morocco); weekday |
| 2026-07-10 | 0 | 0 | 275 | World Cup match(es) in trading hours (Spain v Belgium); weekday |
| 2026-07-11 | 56 | 0 | 331 | England fixture in trading hours (Norway v England 22:00); expect uplift; weekend |
| 2026-07-12 | 0 | 0 | 275 | weekend |
| 2026-07-13 | 0 | 0 | 275 | weekday |
| 2026-07-14 | 0 | 0 | 275 | weekday |

