# A6 · Hierarchical reconciliation (Beer Hall, units)

Nodes: 39 (30 bottom item nodes). Base forecasts: robust DOW-median per node. Reconciliation: MinT (diagonal WLS).

**Scope:** A6 (L2/L3 hierarchy reconciliation) is run for the Beer Hall only. It is intentionally not extended to Two River Taps (closed) or Ellel (booking-driven, ~64 trading days) — their category/item splits would be sparser than the Beer Hall's already-under-covering item bands. Revisit if/when those venues' L1 forecasts prove operationally useful.

## Base forecaster (scope decision)
Base forecasts at L2/L3 use robust DOW-median only — the rung-climbing discipline applied at L1 (A4) was deliberately **not** repeated here, because (a) the ~30 item-level series are individually too sparse to support ETS/GBM fitting without overfitting, and (b) MinT's coherence guarantee depends only on the *summing matrix*, not on the base forecaster's sophistication — a better base forecaster would tighten the bands, not change the coherence result. This is a considered scope decision, not an oversight; revisit if item-level band sharpness becomes operationally important.

## Coherence (Σ item = category = venue)
- max venue discrepancy: 0.00e+00
- max category discrepancy: 0.00e+00
- **coherent: True**

## Reconciled-band coverage (the SAME band the /forecast API serves)
Each band is `reconciled ŷ ± split-conformal quantile of the node's DOW-median residuals` — one band-construction path, used for both this coverage check and persistence (no separate parametric band).

| Layer | 80% coverage | 90% coverage |
|---|---|---|
| L2 (category) | 70.8% | 82.5% |
| L3 (top item) | 60.5% | 77.6% |

Item (L3) series are sparse and noisy, so their bands under-cover — an honest, expected limitation of conformal at this grain; category (L2) bands are tighter to nominal.

## Intermittency: Croston/SBA vs DOW-median (WP2)
Intermittent L3 nodes (ADI >= 1.32) scored on the held-out TEST_WEEKS block. croston_sba is adopted as a node's base forecast only when it beats DOW-median on MASE (same seasonal-naive denominator); otherwise DOW-median stands. MinT coherence is preserved either way.

**0 of 17** intermittent nodes adopted croston_sba.

| Node | MASE DOW | MASE SBA | MAE DOW | MAE SBA | Adopted |
|---|---|---|---|---|---|
| ITEM::Beer::Lager - BH | 1.056 | 1.662 | 10.140 | 15.960 | no |
| ITEM::Beer::Caravan of Love | 1.216 | 2.223 | 6.509 | 11.899 | no |
| ITEM::Spirits::SMIRNOFF | 0.616 | 0.767 | 3.035 | 3.776 | no |
| ITEM::Spirits::Whitley Neil | 0.351 | 0.529 | 0.702 | 1.056 | no |
| ITEM::Soft Drinks::Cordial & Soda | 1.384 | 1.549 | 1.807 | 2.022 | no |
| ITEM::Soft Drinks::Fruit Shoot | 1.033 | 1.322 | 1.193 | 1.526 | no |
| ITEM::Wine::Discovery Beach Zinfandel | 0.570 | 0.920 | 0.789 | 1.276 | no |
| ITEM::Wine::Alpino Pinot Grigio | 0.000 | 0.641 | 0.000 | 0.645 | no |
| ITEM::Wine::Aperol Spritz | 1.843 | 1.878 | 1.614 | 1.645 | no |
| ITEM::Uncategorised::Centennial Summer Pale | 0.000 | 0.265 | 0.000 | 0.597 | no |
| ITEM::Happy Hour::£4 Lager/Cider | 0.709 | 1.425 | 2.175 | 4.370 | no |
| ITEM::Happy Hour::£3.50 Cask | 0.748 | 1.869 | 1.649 | 4.120 | no |
| ITEM::Happy Hour::£15 FIZZ | 0.840 | 1.308 | 0.158 | 0.246 | no |
| ITEM::Food::Nuts | 0.347 | 0.782 | 0.439 | 0.990 | no |
| ITEM::Merchandise::Lunebrew T Shirt | 0.000 | 3.468 | 0.000 | 0.186 | no |
| ITEM::Merchandise::Hire Fee | 0.654 | 1.150 | 0.035 | 0.062 | no |
| ITEM::Merchandise::Pool Table deposit | 1.426 | 1.720 | 0.053 | 0.063 | no |

## Stock-consumption proxy
- line: **Lager - BH** (2 node(s))
- reconciled 7-day forecast: **90.6 pints**
- @ 88 pints/keg → **1.03 kegs** to order for the week.

## Inventory-aware reorder (A12 stock-cover join)
The demand-only proxy above becomes a true reorder signal once the physical on-hand position (A12 `stock_cover`) is joined: `days_of_cover = on_hand_pints / forecast_daily_pints`. Lines whose brand is not a forecast A6 node are omitted here (NULL demand, not guessed).

| Product | L1 | On-hand kegs | Forecast pints/day | Days cover | Reorder | Suggest kegs |
|---|---|---|---|---|---|---|
| lunebrew caravan of love | Draught | 0.0 | 5.22 | **0.0** | ⚠ YES | 1 |