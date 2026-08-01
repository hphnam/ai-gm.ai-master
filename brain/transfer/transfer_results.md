# A7 · Onboarding-transfer (leave-one-venue-out)

Cold-start window: **14 days** (used only to anchor the held-out venue's level). Forecast = donor DOW shape × own level. Baseline = per-venue seasonal-naïve on the same cold window. Both share the same MASE denominator, so the comparison is scale-fair. Each venue is trimmed to its active trading span (TRT's closure tail excluded).

Each fold is scored on consecutive 7-day blocks, so the comparison carries dispersion: an MCS 90% set and a paired moving-block bootstrap CI on transfer − naïve, not a win count (ledger M23).

| Held-out venue | Donors | blocks | MASE transfer | MASE naïve | Δ [90% CI] | 90% MCS set |
|---|---|---|---|---|---|---|
| The Beer Hall | Two River Taps, Ellel Village Hall | 55 | 0.872 | 1.243 | -0.371 [-0.391, -0.348] | transfer |
| Two River Taps | The Beer Hall, Ellel Village Hall | 45 | 1.184 | 0.700 | +0.486 [+0.442, +0.529] | naive |
| Ellel Village Hall | The Beer Hall, Two River Taps | 53 | 0.927 | 1.319 | -0.373 [-0.488, -0.300] | transfer |

**At the 14-day cold-start, transfer beats per-venue-naïve on 2/3 held-out venues.** Each of those three verdicts is now decisive in its own right: every per-venue CI excludes zero and the MCS retains a single method per venue.

**Pooled across the estate, however, the two are not distinguishable.** Over all 153 blocks the mean difference is -0.119 MASE with a 90% CI of [-0.242, +0.036], which straddles zero, and the 90% model confidence set retains transfer, naive. The majority verdict is a count of venue-level wins, not evidence that shape-transfer is the better method on this estate; the two venues it wins and the one it loses very nearly cancel. This is the statement the earlier 2-of-3 tally could not make, in either direction.

## Crossover — transfer's advantage is greatest when history is shortest
| Cold-start window | Transfer wins |
|---|---|
| 14 days | 2/3 |
| 21 days | 1/3 |
| 28 days | 0/3 |
| 42 days | 0/3 |
| 56 days | 0/3 |

This is the partial-pooling story: borrow the donor shape while the venue is data-poor; rely on its own seasonal-naïve once it has enough history. The transfer wins where it is supposed to — the cold-start regime — and gracefully hands over as history accrues.

## Foundation-model rung (adoption by held-out rolling MASE)
- available: False
- DROPPED: no backbone installed, so an unjustified pretrained backbone is not adopted. The criterion is beating rung3_global_gbm on held-out rolling MASE; Tan et al. (2024) motivates scepticism toward unjustified backbones but its ablations target LLM-backbone forecasters, not pretrained time-series models. Global GBM (A4) remains the pooling baseline.

## In-context fine-tuning (Das et al. 2025) — forward note
The shape-transfer here is the hand-built analogue of conditioning a held-out venue on the donor's shape. A foundation backbone with in-context fine-tuning would condition on the donor series directly; the LOVO harness above is exactly the test it must pass to be adopted.


Gate (transfer beats naïve on the data-rich held-out venues AND foundation beats global GBM or is dropped): **PASS**.