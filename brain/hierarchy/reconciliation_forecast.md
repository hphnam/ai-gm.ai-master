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

## Stock-consumption proxy
- line: **Lager - BH** (2 node(s))
- reconciled 7-day forecast: **90.6 pints**
- @ 88 pints/keg → **1.03 kegs** to order for the week.

## Inventory-aware reorder (A12 stock-cover join)
The demand-only proxy above becomes a true reorder signal once the physical on-hand position (A12 `stock_cover`) is joined: `days_of_cover = on_hand_pints / forecast_daily_pints`. Lines whose brand is not a forecast A6 node are omitted here (NULL demand, not guessed).

| Product | L1 | On-hand kegs | Forecast pints/day | Days cover | Reorder | Suggest kegs |
|---|---|---|---|---|---|---|
| lunebrew caravan of love | Draught | 0.0 | 5.32 | **0.0** | ⚠ YES | 1 |