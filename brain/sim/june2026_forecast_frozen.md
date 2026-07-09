# Frozen June 2026 forecast (pre-registered, reasoned)

Rendered from the committed artefact `june2026_forecast_frozen.parquet`; no
forecast was regenerated. This is the pre-registered prediction, blind to
June actuals. Created 2026-07-09T21:39:17.224549+00:00.

L2/L3 method: forecast-proportion disaggregation of pure L1 by recent 120-day ex-VAT revenue share; L3 = top-3 items/category + OTHER.

## What the brain expects for June, per venue

- Beer Hall: elevated on the England fixture dates within trading hours (17 Jun v Croatia, 23 Jun v Ghana, 27 Jun v Panama); weekends carry the month; Mondays and Tuesdays near-zero (structurally closed). Cold 30-day horizon, so magnitudes are conservative.
- Two River Taps: ETS projects continued trade from a 2026-05-08 ceiling; NO liveness signal, so a closure would not be reflected (flagged as the go-live risk).
- Ellel: sparse event venue; robust-DOW predicts low baseline. Private events are unknowable in advance, so any large night will be under-forecast by design.

## Beer Hall (L1, model `rung4_chronos2_exo`, band +/- 627.35)

| date | dow | yhat | lo | hi | reason |
|---|---|---|---|---|---|
| 2026-06-01 | Mon | 32 | 0 | 659 | weekday |
| 2026-06-02 | Tue | 31 | 0 | 658 | weekday |
| 2026-06-03 | Wed | 291 | 0 | 918 | weekday |
| 2026-06-04 | Thu | 681 | 54 | 1308 | weekday |
| 2026-06-05 | Fri | 936 | 309 | 1563 | weekday |
| 2026-06-06 | Sat | 1081 | 454 | 1708 | weekend |
| 2026-06-07 | Sun | 456 | 0 | 1084 | weekend |
| 2026-06-08 | Mon | 18 | 0 | 645 | weekday |
| 2026-06-09 | Tue | 31 | 0 | 658 | weekday |
| 2026-06-10 | Wed | 327 | 0 | 955 | weekday |
| 2026-06-11 | Thu | 664 | 36 | 1291 | World Cup match(es) in trading hours (Mexico v South Africa); weekday |
| 2026-06-12 | Fri | 911 | 284 | 1539 | World Cup match(es) in trading hours (South Korea v Czech Republic; Canada v Bosnia and Herzegovina); weekday |
| 2026-06-13 | Sat | 1130 | 502 | 1757 | World Cup match(es) in trading hours (United States v Paraguay; Qatar v Switzerland; Brazil v Morocco); weekend |
| 2026-06-14 | Sun | 482 | 0 | 1109 | World Cup match(es) in trading hours (Haiti v Scotland; Australia v Turkey; Germany v Curaçao; Netherlands v Japan); weekend |
| 2026-06-15 | Mon | 26 | 0 | 654 | World Cup match(es) in trading hours (Ivory Coast v Ecuador; Sweden v Tunisia; Spain v Cape Verde; Saudi Arabia v Uruguay; Belgium v Egypt); weekday |
| 2026-06-16 | Tue | 21 | 0 | 648 | World Cup match(es) in trading hours (Iran v New Zealand; France v Senegal; Iraq v Norway); weekday |
| 2026-06-17 | Wed | 300 | 0 | 927 | England fixture in trading hours (Argentina v Algeria 02:00; Austria v Jordan 05:00; England v Croatia 21:00; Portugal v DR Congo 18:00); expect uplift; weekday |
| 2026-06-18 | Thu | 670 | 43 | 1297 | World Cup match(es) in trading hours (Ghana v Panama; Uzbekistan v Colombia; Czech Republic v South Africa; Switzerland v Bosnia and Herzegovina; Canada v Qatar); weekday |
| 2026-06-19 | Fri | 869 | 242 | 1496 | World Cup match(es) in trading hours (Mexico v South Korea; Scotland v Morocco); weekday |
| 2026-06-20 | Sat | 1056 | 429 | 1683 | World Cup match(es) in trading hours (Brazil v Haiti; Turkey v Paraguay; United States v Australia; Germany v Ivory Coast; Netherlands v Sweden); weekend |
| 2026-06-21 | Sun | 435 | 0 | 1063 | World Cup match(es) in trading hours (Ecuador v Curaçao; Tunisia v Japan; Spain v Saudi Arabia; Uruguay v Cape Verde; Belgium v Iran); weekend |
| 2026-06-22 | Mon | 36 | 0 | 664 | World Cup match(es) in trading hours (New Zealand v Egypt; France v Iraq; Argentina v Austria); weekday |
| 2026-06-23 | Tue | 39 | 0 | 667 | England fixture in trading hours (Norway v Senegal 01:00; Jordan v Algeria 04:00; England v Ghana 21:00; Portugal v Uzbekistan 18:00); expect uplift; weekday |
| 2026-06-24 | Wed | 309 | 0 | 936 | World Cup match(es) in trading hours (Panama v Croatia; Colombia v DR Congo; Scotland v Brazil; Morocco v Haiti; South Africa v South Korea; Czech Republic v Mexico; Bosnia and Herzegovina v Qatar; Switzerland v Canada); weekday |
| 2026-06-25 | Thu | 653 | 26 | 1281 | World Cup match(es) in trading hours (Curaçao v Ivory Coast; Ecuador v Germany; Paraguay v Australia; Turkey v United States; Japan v Sweden; Tunisia v Netherlands); weekday |
| 2026-06-26 | Fri | 853 | 225 | 1480 | World Cup match(es) in trading hours (Senegal v Iraq; Norway v France; Egypt v Iran; New Zealand v Belgium; Cape Verde v Saudi Arabia; Uruguay v Spain); weekday |
| 2026-06-27 | Sat | 1083 | 455 | 1710 | England fixture in trading hours (Panama v England 22:00; Croatia v Ghana 22:00; Algeria v Austria 22:00; Jordan v Argentina 22:00; Colombia v Portugal 22:00; Congo DR v Uzbekistan 22:00); expect uplift; weekend |
| 2026-06-28 | Sun | 459 | 0 | 1086 | World Cup match(es) in trading hours (South Africa v Canada); weekend |
| 2026-06-29 | Mon | 12 | 0 | 639 | World Cup match(es) in trading hours (Germany v Paraguay; Netherlands v Morocco; Brazil v Japan); weekday |
| 2026-06-30 | Tue | 26 | 0 | 654 | World Cup match(es) in trading hours (France v Sweden; Ivory Coast v Norway; Mexico v Ecuador); weekday |

June L1 total: GBP 13,917. Band beyond day 8 is extrapolated past its 7-day calibration (uncertain, wider than shown).

## Two River Taps (L1, model `rung2_ets`, band +/- 239.41)

| date | dow | yhat | lo | hi | reason |
|---|---|---|---|---|---|
| 2026-06-01 | Mon | 399 | 160 | 639 | weekday |
| 2026-06-02 | Tue | 160 | 0 | 399 | weekday |
| 2026-06-03 | Wed | 0 | 0 | 239 | weekday |
| 2026-06-04 | Thu | 0 | 0 | 239 | weekday |
| 2026-06-05 | Fri | 169 | 0 | 409 | weekday |
| 2026-06-06 | Sat | 261 | 21 | 500 | weekend |
| 2026-06-07 | Sun | 439 | 200 | 679 | weekend |
| 2026-06-08 | Mon | 374 | 135 | 614 | weekday |
| 2026-06-09 | Tue | 135 | 0 | 374 | weekday |
| 2026-06-10 | Wed | 0 | 0 | 239 | weekday |
| 2026-06-11 | Thu | 0 | 0 | 239 | weekday |
| 2026-06-12 | Fri | 145 | 0 | 384 | weekday |
| 2026-06-13 | Sat | 236 | 0 | 475 | weekend |
| 2026-06-14 | Sun | 414 | 175 | 654 | weekend |
| 2026-06-15 | Mon | 349 | 110 | 589 | weekday |
| 2026-06-16 | Tue | 110 | 0 | 350 | weekday |
| 2026-06-17 | Wed | 0 | 0 | 239 | weekday |
| 2026-06-18 | Thu | 0 | 0 | 239 | weekday |
| 2026-06-19 | Fri | 120 | 0 | 359 | weekday |
| 2026-06-20 | Sat | 211 | 0 | 450 | weekend |
| 2026-06-21 | Sun | 389 | 150 | 629 | weekend |
| 2026-06-22 | Mon | 325 | 85 | 564 | weekday |
| 2026-06-23 | Tue | 85 | 0 | 325 | weekday |
| 2026-06-24 | Wed | 0 | 0 | 239 | weekday |
| 2026-06-25 | Thu | 0 | 0 | 239 | weekday |
| 2026-06-26 | Fri | 95 | 0 | 334 | weekday |
| 2026-06-27 | Sat | 186 | 0 | 426 | weekend |
| 2026-06-28 | Sun | 365 | 125 | 604 | weekend |
| 2026-06-29 | Mon | 300 | 60 | 539 | weekday |
| 2026-06-30 | Tue | 61 | 0 | 300 | weekday |

June L1 total: GBP 5,329. Band beyond day 8 is extrapolated past its 7-day calibration (uncertain, wider than shown).

## Ellel (L1, model `rung1_robust_dow`, band +/- 402.55)

| date | dow | yhat | lo | hi | reason |
|---|---|---|---|---|---|
| 2026-06-01 | Mon | 0 | 0 | 403 | weekday |
| 2026-06-02 | Tue | 0 | 0 | 403 | weekday |
| 2026-06-03 | Wed | 0 | 0 | 403 | weekday |
| 2026-06-04 | Thu | 0 | 0 | 403 | weekday |
| 2026-06-05 | Fri | 0 | 0 | 403 | weekday |
| 2026-06-06 | Sat | 151 | 0 | 554 | weekend |
| 2026-06-07 | Sun | 0 | 0 | 403 | weekend |
| 2026-06-08 | Mon | 0 | 0 | 403 | weekday |
| 2026-06-09 | Tue | 0 | 0 | 403 | weekday |
| 2026-06-10 | Wed | 0 | 0 | 403 | weekday |
| 2026-06-11 | Thu | 0 | 0 | 403 | World Cup match(es) in trading hours (Mexico v South Africa); weekday |
| 2026-06-12 | Fri | 0 | 0 | 403 | World Cup match(es) in trading hours (South Korea v Czech Republic; Canada v Bosnia and Herzegovina); weekday |
| 2026-06-13 | Sat | 151 | 0 | 554 | World Cup match(es) in trading hours (United States v Paraguay; Qatar v Switzerland; Brazil v Morocco); weekend |
| 2026-06-14 | Sun | 0 | 0 | 403 | World Cup match(es) in trading hours (Haiti v Scotland; Australia v Turkey; Germany v Curaçao; Netherlands v Japan); weekend |
| 2026-06-15 | Mon | 0 | 0 | 403 | World Cup match(es) in trading hours (Ivory Coast v Ecuador; Sweden v Tunisia; Spain v Cape Verde; Saudi Arabia v Uruguay; Belgium v Egypt); weekday |
| 2026-06-16 | Tue | 0 | 0 | 403 | weekday |
| 2026-06-17 | Wed | 0 | 0 | 403 | weekday |
| 2026-06-18 | Thu | 0 | 0 | 403 | World Cup match(es) in trading hours (Ghana v Panama; Uzbekistan v Colombia; Czech Republic v South Africa; Switzerland v Bosnia and Herzegovina; Canada v Qatar); weekday |
| 2026-06-19 | Fri | 0 | 0 | 403 | World Cup match(es) in trading hours (Mexico v South Korea; Scotland v Morocco); weekday |
| 2026-06-20 | Sat | 151 | 0 | 554 | World Cup match(es) in trading hours (Brazil v Haiti; Turkey v Paraguay; United States v Australia; Germany v Ivory Coast; Netherlands v Sweden); weekend |
| 2026-06-21 | Sun | 0 | 0 | 403 | World Cup match(es) in trading hours (Ecuador v Curaçao; Tunisia v Japan; Spain v Saudi Arabia; Uruguay v Cape Verde; Belgium v Iran); weekend |
| 2026-06-22 | Mon | 0 | 0 | 403 | World Cup match(es) in trading hours (New Zealand v Egypt; France v Iraq; Argentina v Austria); weekday |
| 2026-06-23 | Tue | 0 | 0 | 403 | World Cup match(es) in trading hours (Norway v Senegal; Jordan v Algeria; England v Ghana; Portugal v Uzbekistan); weekday |
| 2026-06-24 | Wed | 0 | 0 | 403 | weekday |
| 2026-06-25 | Thu | 0 | 0 | 403 | World Cup match(es) in trading hours (Curaçao v Ivory Coast; Ecuador v Germany; Paraguay v Australia; Turkey v United States; Japan v Sweden; Tunisia v Netherlands); weekday |
| 2026-06-26 | Fri | 0 | 0 | 403 | World Cup match(es) in trading hours (Senegal v Iraq; Norway v France; Egypt v Iran; New Zealand v Belgium; Cape Verde v Saudi Arabia; Uruguay v Spain); weekday |
| 2026-06-27 | Sat | 151 | 0 | 554 | England fixture in trading hours (Panama v England 22:00; Croatia v Ghana 22:00; Algeria v Austria 22:00; Jordan v Argentina 22:00; Colombia v Portugal 22:00; Congo DR v Uzbekistan 22:00); expect uplift; weekend |
| 2026-06-28 | Sun | 0 | 0 | 403 | World Cup match(es) in trading hours (South Africa v Canada); weekend |
| 2026-06-29 | Mon | 0 | 0 | 403 | World Cup match(es) in trading hours (Germany v Paraguay; Netherlands v Morocco; Brazil v Japan); weekday |
| 2026-06-30 | Tue | 0 | 0 | 403 | World Cup match(es) in trading hours (France v Sweden; Ivory Coast v Norway; Mexico v Ecuador); weekday |

June L1 total: GBP 604. Band beyond day 8 is extrapolated past its 7-day calibration (uncertain, wider than shown).
