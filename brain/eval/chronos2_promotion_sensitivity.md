# WP12 G12.7 · deviation-sensitivity impact check (Beer Hall promotion)

Compares `signals.deviation.scan('beer_hall', window=28)` before and after promoting rung4_chronos2 as the served L1 forecaster.

**Finding: zero change, and it could not have been otherwise.** `signals.residual.build_residual_stream` (the shared foundation for both `signals.deviation` and `signals.change_point`) computes its own DOW-median baseline directly from `store.warehouse.read_series`; it never reads `served_forecast`, `forecasts`, or `bands`. Promoting a different served model therefore cannot change deviation z-scores, band half-width, or classifications - this contradicts the promotion spec's F6 premise ("the deviation z denominator is the conformal half-band of the served band"), which does not hold for this codebase. This check ran the literal before/after diff anyway, because the point is to observe and write it down, not assume it.

- rows compared: **28**
- classification diffs: **0**
- byte-identical: **True**

No row changed. Every date, status, direction, severity, z, actual, and expected value in the 28-day window is identical before and after the promotion.