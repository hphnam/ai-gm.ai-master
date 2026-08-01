# A7 · Onboarding-transfer (leave-one-venue-out)

Cold-start window: **14 days** (used only to anchor the held-out venue's level). Forecast = donor DOW shape × own level. Baseline = per-venue seasonal-naïve on the same cold window. Within a venue both share the same denominator, so each per-venue comparison is scale-fair. Each venue is trimmed to its active trading span (TRT's closure tail excluded).

Each fold is scored on consecutive 7-day blocks, so the comparison carries dispersion: an MCS 90% set and a paired moving-block bootstrap CI on transfer − naïve, not a win count (ledger M23).

**Venues do not share a ruler (G2).** Ellel admits no defensible scaled error, so it is scored on unscaled MAE in pounds and is reported on its own; the other two are scored on MASE at the basis the estate ruled for them. The `loss` column names the unit of each row, and rows in different units are not comparable to one another.

| Held-out venue | Donors | loss | blocks | transfer | naïve | Δ [90% CI] | 90% MCS set |
|---|---|---|---|---|---|---|---|
| The Beer Hall | Two River Taps, Ellel Village Hall | MASE | 55 | 1.242 | 1.771 | -0.529 [-0.557, -0.496] | transfer |
| Two River Taps | The Beer Hall, Ellel Village Hall | MASE | 45 | 1.184 | 0.700 | +0.486 [+0.442, +0.529] | naive |
| Ellel Village Hall | The Beer Hall, Two River Taps | MAE (£) | 53 | 282.002 | 401.539 | -113.434 [-148.618, -91.282] | transfer |

**At the 14-day cold-start, transfer beats per-venue-naïve on 1 of the 2 venues that admit a scaled error.** Each per-venue verdict is decisive in its own right: the CI excludes zero and the MCS retains a single method. Ellel is reported in the table on unscaled MAE and is deliberately absent from this count.

**Both scaled rows now exceed MASE 1.** On `calendar_lag7_active`, the basis the estate ruled for these venues, transfer scores 1.242 at the Beer Hall against 0.872 on the `calendar_lag7` basis this module used to hard-code. A value above one is worse than the seasonal-naïve reference the denominator is built from, so shape-transfer beating the cold-window baseline is a statement about that baseline being poorer still, not about transfer being good. The old figure read as beating the benchmark and the corrected one does not; the denominator changed, the forecasts did not.

**That tally is not a majority verdict and must not be read as one.** The estate has 3 venues and only 2 of them can enter a scaled comparison, so the count runs over a pool of two, one of which (Two River Taps) was closing at the point of measurement and is the fold this gate has always excused on those grounds. A count over two venues carries no majority and the gate's original ≥2-of-3 criterion is not evaluable on it. What the evidence supports is the per-venue rows, individually; the estate-level claim is withdrawn, not weakened.

**Pooled over the scaled venues, the two are not distinguishable.** Over 100 blocks the mean difference is -0.072 MASE with a 90% CI of [-0.295, +0.154], and the 90% model confidence set retains transfer, naive. The earlier three-venue pool reported this same null while averaging Ellel's pounds-denominated blocks together with two dimensionless MASE series, so its null was arrived at by an inadmissible route even though the direction of the conclusion is unchanged.

## Crossover — transfer wins fall away as history accrues (2 venues)
| Cold-start window | Transfer wins |
|---|---|
| 14 days | 1/2 |
| 21 days | 0/2 |
| 28 days | 0/2 |
| 42 days | 0/2 |
| 56 days | 0/2 |

The partial-pooling story this sweep was built to tell is that transfer wins while the venue is data-poor and hands over to its own seasonal-naïve as history accrues. The shape of the sweep is still consistent with it, but over two scaled venues the table can no longer carry that claim: at every window the denominator is 2, so the descent is a sequence of counts out of two and is equally consistent with one venue's behaviour plus noise. It is reported as a description of these two venues, not as evidence for a cold-start regime.

## Foundation-model rung (adoption by held-out rolling MASE)
- available: False
- DROPPED: no backbone installed, so an unjustified pretrained backbone is not adopted. The criterion is beating rung3_global_gbm on held-out rolling MASE; Tan et al. (2024) motivates scepticism toward unjustified backbones but its ablations target LLM-backbone forecasters, not pretrained time-series models. Global GBM (A4) remains the pooling baseline.

## In-context fine-tuning (Das et al. 2025) — forward note
The shape-transfer here is the hand-built analogue of conditioning a held-out venue on the donor's shape. A foundation backbone with in-context fine-tuning would condition on the donor series directly; the LOVO harness above is exactly the test it must pass to be adopted.


Gate (transfer beats naïve on a majority of the data-rich held-out venues AND foundation beats global GBM or is dropped): **NOT EVALUABLE**. The transfer clause needs three venues admitting a scaled error and the estate supplies 2, so no majority exists to test. This is a withdrawal of the estate-level claim on the grounds that the evidence base was never admissible, not a failed test.