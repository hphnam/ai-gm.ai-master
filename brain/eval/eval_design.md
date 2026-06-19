# A2 · Evaluation design

The harness is stood up **before** any model so every rung of the ladder is
scored identically (methodology §3). Nothing here is model-specific.

## Splits (no leakage)

- **Time-aware split** (`time_split`): hold out the **last 8 weeks** as test;
  the **4 weeks** before it are validation; everything earlier is train.
  Boundaries are by calendar date, never by row index, and the data is never
  shuffled. The split is leakage-checked at construction.
- **Rolling-origin / expanding-window** (`rolling_origin`): the train window
  grows; each fold's test is the next `horizon_days`. Honest multi-step error.
- **Leave-one-venue-out** (`leave_one_venue_out`): yields `(donor_venues,
  holdout)` for the transfer claim (A7) — train on the donors, forecast the
  held-out venue zero/few-shot.

Every fold passes through `assert_no_leakage`, which raises `LeakageError` if a
train fold's last date is on/after its test fold's first date.

## Metrics

| Aspect | Metric | Notes |
|---|---|---|
| Point accuracy | **MASE** (vs seasonal-naïve, m=7) + MAE/RMSE | MASE is scale-free; the seasonal-naïve denominator is computed **in-sample on the train fold**. |
| Point accuracy (caution) | sMAPE | Structural zeros (Mon/Tue) break percentage error, so they are **excluded by default** (`exclude_zeros=True`). |
| Interval validity | **empirical coverage** vs nominal | Does the 90% band actually contain 90%? |
| Interval sharpness | **Winkler** score, **mean pinball**, **mean width** | A band that always covers by being huge is useless — coverage *and* sharpness together. |

## What "PASS" means for A2

`python -m eval.harness` runs end-to-end on a dummy seasonal-naïve forecast of
the Beer Hall L1 series, prints **every** metric (point + interval at 80/90%),
produces ≥2 leakage-checked rolling-origin folds, lists the LOVO folds, and
demonstrates that the leakage guard actually fires on an overlapping split.

## Carried forward

This harness is reused unchanged by A4 (ladder), A5 (conformal coverage),
A6 (reconciliation tolerance), and A7 (LOVO transfer). It is Objective 4
(Evaluation) in miniature and is the single definition of "better" the ladder
discipline depends on.
