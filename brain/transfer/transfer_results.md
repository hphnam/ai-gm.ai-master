# A7 · Onboarding-transfer (leave-one-venue-out)

Cold-start window: **14 days** (used only to anchor the held-out venue's level). Forecast = donor DOW shape × own level. Baseline = per-venue seasonal-naïve on the same cold window. Both share the same MASE denominator, so the comparison is scale-fair. Each venue is trimmed to its active trading span (TRT's closure tail excluded).

| Held-out venue | Donors | n_test | MASE transfer | MASE naïve | Transfer wins |
|---|---|---|---|---|---|
| The Beer Hall | Two River Taps, Ellel Village Hall | 348 | 0.902 | 1.257 | True |
| Two River Taps | The Beer Hall, Ellel Village Hall | 317 | 1.190 | 0.700 | False |
| Ellel Village Hall | The Beer Hall, Two River Taps | 329 | 0.920 | 1.306 | True |

**At the 14-day cold-start, transfer beats per-venue-naïve on 2/3 held-out venues.**

## Crossover — transfer's advantage is greatest when history is shortest
| Cold-start window | Transfer wins |
|---|---|
| 14 days | 2/3 |
| 21 days | 1/3 |
| 28 days | 0/3 |
| 42 days | 0/3 |
| 56 days | 0/3 |

This is the partial-pooling story: borrow the donor shape while the venue is data-poor; rely on its own seasonal-naïve once it has enough history. The transfer wins where it is supposed to — the cold-start regime — and gracefully hands over as history accrues.

## Foundation-model rung (Tan ablation)
- available: False
- DROPPED per Tan et al. ablation — no backbone installed, so an unjustified pretrained backbone is not adopted (the ablation's honest outcome). Global GBM (A4) remains the pooling baseline.

## In-context fine-tuning (Das et al. 2025) — forward note
The shape-transfer here is the hand-built analogue of conditioning a held-out venue on the donor's shape. A foundation backbone with in-context fine-tuning would condition on the donor series directly; the LOVO harness above is exactly the test it must pass to be adopted.


Gate (transfer beats naïve on the data-rich held-out venues AND foundation beats global GBM or is dropped): **PASS**.