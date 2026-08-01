# A6 · Hierarchical reconciliation (Beer Hall, units)

Nodes: 41 (32 bottom item nodes). Base forecasts: robust DOW-median per node. Reconciliation: **WLS_v** (Wickramasuriya et al. 2019 Eq. 11 with a diagonal W; those authors reserve "MinT" for the off-diagonal Sample/Shrink estimators, so this artefact does not use that name).

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
| L2 (category) | 65.8% | 85.1% |
| L3 (top item) | 60.0% | 72.1% |

Item (L3) series are sparse and noisy, so their bands under-cover — an honest, expected limitation of conformal at this grain; category (L2) bands are tighter to nominal.

## Intermittency: Croston/SBA vs DOW-median (WP2)
For each intermittent L3 node (ADI >= 4/3), Kostenko-Hyndman `cv2 > 2 - (3/2) adi` picks the estimator and a MASE contest on the VALIDATION block (the third TEST_WEEKS block back from the end of the calendar, both forecasters fitted strictly before it) decides whether it displaces the DOW-median, under a ONE-STANDARD-ERROR margin: the estimator must beat the DOW-median by more than one standard error of the paired differential over disjoint 7-day sub-blocks (`1-SE crit` column, adopt when negative), not merely by any amount. The margin was pre-registered in `ledger/prereg_adoption_margin_2026-08-01.md` before implementation, AFTER observing that the bare inequality adopted a node on a 0.21% margin which then scored 96% worse on test; that ordering is stated rather than concealed. An adopted estimator is then refitted on everything before the CALIBRATION block, which supplies its band and its weight. The TEST columns are therefore reported, never selected on. WLS_v coherence is preserved either way.

**0 of 16** intermittent nodes adopted an intermittent estimator (0 SBA, 0 Croston).

| Node | ADI | CV2 | Est. | val MASE DOW | val MASE est | 1-SE crit | Adopted | test MASE DOW | test MASE est |
|---|---|---|---|---|---|---|---|---|---|
| ITEM::Beer::Lager - BH | 1.589 | 0.836 | sba | 1.421 | 1.418 | 0.026 | no | 0.891 | 1.749 |
| ITEM::Beer::Lune Valley Gold | 1.560 | 0.695 | sba | 0.736 | 0.969 | 0.291 | no | 0.917 | 1.238 |
| ITEM::Spirits::SMIRNOFF | 1.709 | 2.245 | sba | 0.325 | 0.638 | 0.374 | no | 0.796 | 1.059 |
| ITEM::Spirits::Gordons | 2.242 | 1.989 | sba | 0.561 | 0.911 | 0.437 | no | 0.854 | 1.035 |
| ITEM::Soft Drinks::Cordial & Soda | 1.742 | 0.601 | sba | 0.918 | 1.081 | 0.223 | no | 1.207 | 1.466 |
| ITEM::Soft Drinks::Fruit Shoot | 2.491 | 0.758 | sba | 0.689 | 0.882 | 0.237 | no | 0.790 | 1.053 |
| ITEM::Wine::Discovery Beach Zinfandel | 2.097 | 0.722 | sba | 0.554 | 0.842 | 0.340 | no | 0.683 | 0.957 |
| ITEM::Wine::Aperol Spritz | 2.690 | 2.004 | sba | 0.722 | 1.018 | 0.332 | no | 3.153 | 3.353 |
| ITEM::Wine::Sauvignon Blanc | 1.500 | 0.606 | sba | n/a | n/a | n/a | no | 5.842 | 5.948 |
| ITEM::Uncategorised::Centennial Summer Pale | 3.718 | 0.882 | sba | 0.000 | 0.198 | n/a | no | 0.000 | 0.248 |
| ITEM::Happy Hour::£4 Lager/Cider | 2.765 | 0.633 | sba | 0.456 | 0.958 | 0.652 | no | 0.919 | 1.672 |
| ITEM::Happy Hour::£3.50 Cask | 2.938 | 0.551 | sba | 0.814 | 1.291 | 0.605 | no | 0.818 | 2.030 |
| ITEM::Food::Nuts | 1.486 | 0.648 | sba | 0.507 | 0.585 | n/a | no | 0.415 | 0.732 |
| ITEM::Merchandise::Lunebrew T Shirt | 23.727 | 0.239 | sba | 0.000 | 2.595 | n/a | no | 0.306 | 3.439 |
| ITEM::Merchandise::Hire Fee | 23.900 | 0.117 | sba | 0.000 | 0.556 | n/a | no | 1.748 | 2.346 |
| ITEM::Merchandise::Caravan T-shirt | 4.200 | 0.150 | sba | n/a | n/a | n/a | no | n/a | n/a |

## Stock-consumption proxy
- line: **Lager - BH** (2 node(s))
- reconciled 7-day forecast: **63.7 pints**
- @ 88 pints/keg → **0.72 kegs** to order for the week.

## Inventory-aware reorder (A12 stock-cover join)
The demand-only proxy above becomes a true reorder signal once the physical on-hand position (A12 `stock_cover`) is joined: `days_of_cover = on_hand_pints / forecast_daily_pints`. Lines whose brand is not a forecast A6 node are omitted here (NULL demand, not guessed).

| Product | L1 | On-hand kegs | Forecast pints/day | Days cover | Reorder | Suggest kegs |
|---|---|---|---|---|---|---|
| lunebrew caravan of love | Draught | 0.0 | 5.22 | **0.0** | ⚠ YES | 1 |