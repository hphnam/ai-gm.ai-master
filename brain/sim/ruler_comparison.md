# Ruler comparison: one forecast, four denominators

**The dissertation reports `calendar_lag7`**, because it is the only basis on which both the
ladder backtest and all three confrontations already exist, and a pre-registration chain is
worth more than a better ruler applied to only half of it. It is not the best of the four: it
is deflated by structural zeros, and `calendar_lag7_active` is the intended successor once S4
re-scores the ladder alongside it, subject to the sample-size caveat in section 1 (that basis
rests on 28 pairs at Ellel).

Generated from the three re-scored artefacts at store ceiling 2026-07-07, restored via
`python -m sim.restore_clock`:

- `sim/june2026_confront_rescored.json` -> `stage1.l1`
- `sim/july2026_confront_rescored.json` -> `stage1.l1`
- `sim/july2026_w2_confront_rescored.json` -> `stage1_l1_accuracy.<origin>.venues`

The committed `*_confront_result.json` files are the pre-registered scoring records and are
untouched.

---

## 1. The four scales

Computed on the served store at ceiling 2026-07-07.

| venue | trading days | calendar days | trading/week | same-weekday lag | zero lag-7 diffs | pairs kept by `_active` |
|---|---|---|---|---|---|---|
| `beer_hall` | 302 | 399 | 5.30 | 5 | 78 of 392 | 276 (70.4%) |
| `two_river_taps` | 280 | 331 | 5.92 | 6 | 44 of 324 | 268 (82.7%) |
| `ellel` | 68 | 392 | 1.21 | 1 | 284 of 385 | **28 (7.3%)** |

The last two columns count different populations and must not be subtracted from one another.
A difference is zero when both endpoints are closed **or** when two trading days happen to be
equal; the active basis drops a pair when **either** endpoint is closed. At Ellel the
subtraction suggests 101 surviving pairs where the truth is 28.

| venue | `calendar_lag7` | `trading_lag7` | `trading_same_weekday` | `calendar_lag7_active` | spread |
|---|---|---|---|---|---|
| `beer_hall` | 315.7 | 631.8 | 456.5 | 386.9 | 2.00x |
| `two_river_taps` | 150.3 | 220.7 | 243.7 | 173.2 | 1.62x |
| `ellel` | 180.1 | 770.8 | 806.2 | 754.0 | 4.48x |

The spread is the whole defect. At Ellel the same forecast can be made to look **4.5 times**
better or worse purely by choice of denominator, and nothing in the previous code recorded
which one had been used.

Note the two venues fail in opposite directions. Beer Hall trades 5.3 days a week, so
`trading_lag7` reaches back only 1.34 calendar weeks and lands on the wrong weekday, roughly
doubling the denominator. Ellel trades 1.21 days a week, so 74 percent of its calendar lag-7
differences are zero-against-zero and `calendar_lag7` is deflated to a quarter of the others.

## 2. MASE on each basis, per window

Columns (a) to (d) are `calendar_lag7`, `trading_lag7`, `trading_same_weekday`,
`calendar_lag7_active`.

### June 2026, cold 30-day pre-registered forecast

| venue | MAE | (a) | (b) | (c) | (d) | RMSSE | n |
|---|---|---|---|---|---|---|---|
| `beer_hall` | 478.4 | **1.515** | 0.757 | 1.048 | 1.236 | 1.422 | 30 |
| `two_river_taps` | 177.6 | **1.182** | 0.805 | 0.729 | 1.025 | 0.883 | 30 |
| `ellel` | 88.0 | **0.489** | 0.114 | 0.109 | 0.117 | 0.781 | 30 |

### July 2026 W1, 1 to 7 July

| venue | MAE | (a) | (b) | (c) | (d) | RMSSE | n |
|---|---|---|---|---|---|---|---|
| `beer_hall` | 243.5 | **0.772** | 0.385 | 0.534 | 0.629 | 0.498 | 7 |
| `ellel` | 55.5 | **0.308** | 0.072 | 0.069 | 0.074 | 0.209 | 7 |

### July 2026 W2, 8 to 14 July, both pre-registered origins

| venue | MAE | (a) | (b) | (c) | (d) | RMSSE | n |
|---|---|---|---|---|---|---|---|
| `beer_hall` (origin A) | 180.3 | **0.571** | 0.285 | 0.395 | 0.466 | 0.440 | 7 |
| `ellel` (origin A) | 74.0 | **0.411** | 0.096 | 0.092 | 0.098 | 0.285 | 7 |
| `beer_hall` (origin B) | 181.4 | **0.575** | 0.287 | 0.397 | 0.469 | 0.444 | 7 |
| `ellel` (origin B) | 74.0 | **0.411** | 0.096 | 0.092 | 0.098 | 0.285 | 7 |

## 3. What the July headline becomes

The published July W1 figure of **0.386 was a `trading_lag7` number**. On the basis the
backtest itself uses it is **0.772**.

| | Beer Hall July W1 |
|---|---|
| published | 0.386 |
| reproduced on `trading_lag7` | 0.385 |
| on the reported basis `calendar_lag7` | **0.772** |
| backtest MASE, same basis | 0.745 |

That is the substantive consequence. The headline was not "the live forecast beat the backtest
by nearly half"; it was that performance at the serving horizon is consistent with the
backtest, 0.772 against 0.745 - in fact slightly worse than its backtest class, not equal to
it. The apparent outperformance was a change of ruler, not a change of accuracy.

## 4. Coverage now travels with width

`empirical_coverage` was previously reported without the interval width that produced it. July
W1 covered 7 of 7 days at both venues, which reads as a success until the width is shown:

| venue | coverage | mean width | Winkler |
|---|---|---|---|
| `beer_hall` | 1.000 | 1207.3 | 1207.3 |
| `ellel` | 1.000 | 283.0 | 283.0 |

Beer Hall's mean daily actual over the window is roughly 700, so a band 1207 wide is about
1.7 times the level being predicted. Winkler equals width exactly here, which is the arithmetic
signature of a band no observation ever escaped: it earns no miss penalty and is scored purely
on how wide it is. Full coverage bought at that width is not evidence of calibration.

## 5. A denominator is not reproducible without an as-of date

The June figures do not reproduce from today's store, and the reason is not the basis.

| venue | scale behind the committed June figure | `calendar_lag7` today | June MASE then | now |
|---|---|---|---|---|
| `beer_hall` | 291.2 | 315.7 | 1.643 | 1.515 |
| `two_river_taps` | 150.3 | 150.3 | 1.182 | **1.182** |
| `ellel` | 181.4 | 180.1 | 0.485 | 0.489 |

Two River Taps is the control: it has been closed since 2026-05-08, so no row entered its
series between the two runs, and its scale and MASE reproduce exactly. The other two moved
because the store grew by five weeks of higher-variance summer trading and the denominator grew
with it.

So the basis alone does not pin a scale; the store ceiling is the second half of the
specification. `harness.venue_ruler` takes an `as_of` argument for this, unused by default
because S1's gates are defined on the full store.

Pinned to the June cutoff it reconstructs the historical ruler exactly, at all three venues:

| venue | `as_of='2026-05-31'` scale | June MASE committed | reproduced |
|---|---|---|---|
| `beer_hall` | 291.2 | 1.643 | **1.643** |
| `two_river_taps` | 150.3 | 1.182 | **1.182** |
| `ellel` | 181.3 | 0.485 | **0.485** |

One subtlety, since S3 will meet it: `fill_calendar` spans a venue's own first to last row, not
the store ceiling, so filtering a venue that stopped trading before the cutoff would append
structural zeros the original never saw. `venue_ruler` trims back to the last trading day at or
before `as_of`. Pinning the confrontations to their own cutoffs belongs with S3.
