# Report 38 - G15c: taxonomy drift, measured and decided

Date: 2026-07-19. Scope: whether `hierarchy.reconcile()` should pass `since=` to
`build_hierarchy`, closing the open question the previous state log carried as "confirm
it is wired into the standing build".

It is not wired. `build_hierarchy` takes `since=` and the freeze scripts pass it;
`reconcile()` calls `build_hierarchy(venue, top_k)` and no caller anywhere passes it. So
the served L2/L3 node set is still ranked over the whole history. That much of the state
log is confirmed.

## Decision: DO NOT WIRE

Recorded as a standing limitation, not a fix. Three independent grounds, any one of
which would be enough, and the third is the one that matters:

1. **It makes the metric worse.** Beer Hall L3 revenue MASE moves from **0.852 to 1.08 -
   1.16** across every lookback tested: from beating seasonal-naive to losing to it.
2. **It moves the two venues in opposite directions.** Beer Hall revenue capture rises
   19.3% to 29.0%; Ellel's **falls** 31.3% to 15.3%.
3. **It does not fix the symptom it was prescribed for.** `LuneBrew Pilsner` - report
   25's smoking gun, the GBP 3,484 item dropped into OTHER - **is not selected at any
   lookback tested**, by units or by revenue. The binding constraint is `top_k = 3`, not
   the ranking window.

The G15c stop condition says "the measurement is ambiguous, do not wire on an ambiguous
result". The measurement is worse than ambiguous: on the named test case it is negative.

---

## 1. What the standing path selects today

`reconcile()` as it stands, with June and July in the store, `top_k = 3`:

| Venue | nodes | bottom nodes | named item nodes |
|---|---|---|---|
| `beer_hall` | 33 | 32 | **24** |
| `ellel` | 22 | 21 | **16** |

## 2. Before and after, blind

Node selection and the base forecaster see only rows on or before the **cutoff
2026-05-31**; **June is the held-out block**. Ranking on data that includes the scored
window would make refreshing win by construction, which is the mistake this measurement
exists to avoid.

The base forecaster is DOW-median on revenue in **both** arms, the same one `reconcile`
uses, so the only thing that differs is the **node set**.

### Beer Hall

| lookback | capture % | to OTHER | new-item % | MASE all | MASE named | nodes changed |
|---|---|---|---|---|---|---|
| **whole history (standing)** | **19.3** | 21,821.36 | 12.6 | **0.852** | **0.742** | - |
| 56 d | 31.8 | 18,439.92 | 12.6 | 1.160 | 1.073 | 20 |
| 90 d | 28.5 | 19,334.87 | 12.6 | 1.081 | 1.000 | 17 |
| 120 d | 29.0 | 19,199.42 | 12.6 | 1.160 | 1.073 | 17 |
| 180 d | 24.9 | 20,302.31 | 12.6 | 1.160 | 1.073 | 15 |

### Ellel

| lookback | capture % | to OTHER | new-item % | MASE all | MASE named | nodes changed |
|---|---|---|---|---|---|---|
| **whole history (standing)** | **31.3** | 1,607.39 | 42.7 | 0.224 | 0.167 | - |
| 56 d | 16.6 | 1,949.49 | 42.7 | 0.233 | 0.202 | 11 |
| 90 d | 15.3 | 1,979.48 | 42.7 | 0.175 | 0.133 | 13 |
| 120 d | 15.3 | 1,979.48 | 42.7 | 0.175 | 0.133 | 13 |
| 180 d | 15.3 | 1,979.48 | 42.7 | 0.141 | 0.116 | 13 |

**Do not read Ellel's MASE column.** FLAG-MASE-INTERMITTENT: Ellel's booking-driven
series has a large seasonal-naive denominator, so genuine absolute errors divide down to
nearly nothing. Those numbers are not accuracy and are printed only so the table is not
selectively truncated.

## 3. The lookback choice, and why it is not the interesting knob

Swept rather than assumed. Had one been adopted it would have been **120 days**, because
that is `SHARE_WINDOW_DAYS` in `sim/build_frozen_forecast.py`, already used by the freeze
scripts for the L2/L3 revenue-share mix - one knob governing L2/L3 recency rather than
two that can silently disagree. The tradeoff is the expected one and the sweep shows it:
56 days tracks the menu hardest (Beer Hall capture 31.8%, the best of any arm) and is the
least stable (20 of 24 nodes change); 180 days is steadier and captures least.

But the sweep also shows the knob does not matter, because **every** setting lands in the
same place on MASE (1.08 to 1.16) and none of them selects the item the exercise was
about. Tuning it would have been fitting the answer to the example.

## 4. The finding that decided it

Report 25 named one item. The prescription was tested against it directly rather than
against an aggregate, and it fails:

**`LuneBrew Pilsner`, Beer category, `top_k = 3`**

| lookback | units rank | revenue rank | selected? |
|---|---|---|---|
| whole history | 21 | 19 | no |
| 56 d | **5** | 6 | **no** |
| 90 d | 9 | 10 | no |
| 120 d | 10 | 10 | no |
| 180 d | 13 | 12 | no |

**Never selected, at any lookback, by either ranking.** The shortest window tested lifts
it from 21st to 5th and it is still outside a top-3.

So the open question in the state log had a false premise. "Confirm `since=` is wired
into the standing build" assumed wiring it was the fix; the item lands in OTHER because
**only three items per category are ever named**, and it is fifth at best. The drift is
real - refreshing does raise Beer Hall capture by ten points - but it is not what put
report 25's GBP 3,484 in OTHER. `top_k` did.

That is the useful output of this package, and it would not have been found by wiring
`since=` and re-running an aggregate: capture would have risen, the change would have
looked like progress, and the named item would still have been in OTHER. It is the same
trap `DISSERTATION_NOTES.md` 4.3 already warns about ("node counts move, so a count check
reads as progress while membership is still wrong"), one level deeper.

**A `top_k` change was NOT made.** It widens the served node set far more aggressively
than a re-ranking, its cost is unmeasured here, and the L3 MASE evidence above says the
node set that is easiest to forecast is not the node set that matters commercially, so
widening it would very likely make MASE worse again. It is recorded as the correctly
identified next experiment, not smuggled in as a fix.

## 5. Why refreshing degrades MASE, and why that is a metric finding

The mechanism is visible in the membership diff. Refreshing swaps out long-history,
stable lines and swaps in recent ones:

| dropped | brought in |
|---|---|
| `Beer::Cider - BH` | `Beer::Paulaner Helles Lager` |
| `Uncategorised::Centennial Summer Pale` | `Uncategorised::Breeze Pale Ale` |
| `Wine::Discovery Beach Zinfandel` | `Wine::Sauvignon Blanc` |
| `Merchandise::Lunebrew T Shirt` | `Food::Pork Scratchings` |

A recently-ranked item has a short, noisy pre-cutoff history, so its DOW-median base
forecast is worse **and** its seasonal-naive denominator is smaller. MASE is punished
twice. A two-year line like `Lager - BH` forecasts beautifully and is commercially
uninteresting.

**So the node set that scores best is the node set that matters least, and MASE cannot
see the difference.** That is a genuine limitation of the ruler, sibling to
FLAG-MASE-INTERMITTENT (4.1): there, MASE flattered a 90% under-forecast; here, it
rewards forecasting the wrong items well. Both are the same underlying point - **the
gate the whole ladder is scored on is blind to relevance** - and together they are worth
a short methodological subsection rather than two scattered caveats.

This is also why the decision is "do not wire" rather than "refreshing is wrong".
Refreshing improves the thing a general manager cares about (capture) and degrades the
thing the project gates on (MASE). With no relevance-aware metric to adjudicate, wiring
it would be adopting a change this project cannot defend at viva on its own stated
criteria.

## 6. Kept separate: the new-item problem

Counted separately throughout, because conflating it would inflate the drift.

| Venue | held-out revenue from items never sold before the cutoff |
|---|---|
| `beer_hall` | **12.6%** |
| `ellel` | **42.7%** |

An item first sold after the cutoff has no history, cannot be selected by **any** ranking
window, lands in OTHER by design, and is irreducible. For Ellel that is **nearly half of
the held-out revenue**, so most of Ellel's OTHER bucket is not a drift problem at all and
no amount of re-ranking would touch it. Report 25's 15% Ellel capture figure should be
read against that.

Note also that `LuneBrew Pilsner` is **not** a new item - first sale 2025-06-21, GBP
1,337 before the cutoff. It is a genuine drift case. It is just not a case `since=` can
fix.

## 7. Report 25's figures, updated

Report 25 recorded named-node capture of **26% (Beer Hall) / 15% (Ellel)** of June
revenue. Measured here on the standing path: **19.3% / 31.3%**.

**Both differ, and the basis differs, so this updates rather than contradicts.** Report
25 measured the FROZEN forecast's node set, which is revenue-ranked through
`_revenue_hierarchy` in `sim/build_july_forecast.py`; this measures the STANDING
`reconcile()` set, which is **units**-ranked through `build_hierarchy`. They are two
different hierarchies and nobody had put their numbers side by side.

The units-versus-revenue difference was checked directly and is **negligible here** -
ranks agree within one or two places at every lookback (Pilsner 10 vs 10 at 120 days, 21
vs 19 on whole history). Reported as checked and small rather than promoted into a
finding it cannot carry.

## 8. Stop conditions and gates

| Gate | Status |
|---|---|
| Before/after node membership for both venues, with capture shares | PASS (sections 1, 2) |
| L3 MASE on both node sets, same ruler, held-out basis named | PASS. DOW-median on revenue, seasonal-naive scale, `SEASONAL_PERIOD` 7, degenerate-scale nodes excluded and counted (same rule as `sim/score_l3`); held out on June 2026 with a 2026-05-31 cutoff |
| Lookback justified rather than assumed | PASS (section 3, swept; 120 d would have been the choice, and why) |
| Decision recorded either way, with the measurement that drove it | PASS: **do not wire** |
| Served L1 unaffected | PASS and asserted in the artefact: `reconcile._persist` skips the VENUE node and writes layers L2/L3 only, never L1. **Nothing was wired, so the question is moot in the strongest way** |
| If not wired: FLAG-TAXONOMY-DRIFT restated, notes 4.3 updated | PASS |

**Stop condition "wiring `since=` changes the served L1 top by any amount"** was never
reached: no wiring was done, and `reconcile` cannot write L1 in any case.

**Stop condition "the measurement is ambiguous, do not wire"** was reached and honoured.

## 9. Deviations

**(a) The named test case was added to the measurement, and it changed the decision.**
The spec asked for node membership, capture shares and L3 MASE. Those three alone give an
ambiguous picture (capture up, MASE down, venues disagreeing) and would have supported a
weak "do not wire on ambiguity". Testing the prescription against report 25's actual
named item turned an ambiguous result into a clear one, and produced the finding that the
open question had a false premise. Aggregates would have hidden it.

**(b) `reconcile()` was not called.** It persists forecasts and bands via `_persist`. The
measurement reimplements `build_hierarchy`'s selection rule with an explicit upper cutoff
- which `build_hierarchy` does not have, so calling it directly would have ranked through
the scored window and leaked. `build_hierarchy` IS called, unmodified, for the
"standing membership today" figures in section 1, where leakage is not a concern because
no scoring depends on it.

**(c) Report 25's capture figures are updated, not corrected.** Different hierarchy,
different ranking basis. Section 7 states both rather than replacing one with the other.

## 10. Reproduction

```
.venv-forecast/bin/python -m sim.g15c_taxonomy_drift
```

Artefact: `sim/g15c_taxonomy_drift.json`. Read-only; the served store is untouched and no
forecast or band row is written.
