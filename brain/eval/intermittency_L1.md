# S4 Part 1 · L1 intermittency diagnostic (first run at venue level)

Store ceiling: **2026-07-07**. Per-venue frame is `_load_feats` (`build_features` then `trim_to_active`) - the same one the ladder and the Model Confidence Set score on, so `n_days` is the 399 / 331 / 386 those packages use. ADI is the mean interval between demand days; CV-squared is over demand-day revenue. Two demand-day definitions cross two cutoff sets, per the Kostenko-Hyndman correction (`kostenko_note_2006`): **SBC** ADI>=1.32, CV2>=0.49; **KH** ADI>=4/3=1.3333, CV2>=0.5. The SBA column is the KH selection rule `CV2 < 2 - (3/2)ADI`.


## beer_hall (n_days = 399)

| demand day | n_demands | zero_fraction | ADI | CV2 | SBC class | KH class | KH selects |
|---|---|---|---|---|---|---|---|
| nonzero_revenue | 301 | 0.25 | 1.3267 | 0.62 | lumpy | erratic | Croston |
| any_till_activity | 302 | 0.24 | 1.3223 | 0.63 | lumpy | erratic | Croston |

## two_river_taps (n_days = 331)

| demand day | n_demands | zero_fraction | ADI | CV2 | SBC class | KH class | KH selects |
|---|---|---|---|---|---|---|---|
| nonzero_revenue | 280 | 0.15 | 1.1828 | 0.61 | erratic | erratic | Croston |
| any_till_activity | 280 | 0.15 | 1.1828 | 0.61 | erratic | erratic | Croston |

## ellel (n_days = 386)

| demand day | n_demands | zero_fraction | ADI | CV2 | SBC class | KH class | KH selects |
|---|---|---|---|---|---|---|---|
| nonzero_revenue | 66 | 0.83 | 5.9231 | 1.04 | lumpy | lumpy | Croston |
| any_till_activity | 67 | 0.83 | 5.8333 | 1.07 | lumpy | lumpy | Croston |
