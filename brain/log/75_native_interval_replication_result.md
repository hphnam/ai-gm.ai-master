# 75 — Replicating a published interval finding on this estate, and finding a third thing

`kaas_probabilistic_2026` reports empirical coverage beside interval width for Chronos-Bolt,
Chronos-2 and TabPFN-TS on 200 real low-voltage feeders. Two of those three models are rungs of
this study's ladder, so the claim is testable here rather than merely citable. It was tested.

The magnitude does not replicate. The ordering does, three venues out of three. And the probe
turned up a mechanism the published study does not name, plus an independent confirmation of
`log/74` on a band construction that shares nothing with the one `log/74` used.

Runtime `.venv-forecast`, store ceiling 2026-07-07. `eval/native_interval_probe.py`, artefact
`eval/native_interval_probe.json`. Same rolling origins, horizon, minimum training window and
step as `eval.interval_calibration`, so the pairs are the ones the committed conformal work is
built on. **No conformal band is fitted and no served artefact changes**: these are the models'
own quantiles, which both arms already computed and discarded.

## 1 · The mechanism: Chronos-Bolt cannot produce a 90 per cent interval

Found by running the probe, not by reading about it. Chronos-Bolt is trained on the deciles
$0.1 \dots 0.9$. Requesting $0.05$ and $0.95$ does not fail. The pipeline clamps to the nearest
trained level and emits a warning, so a nominal 90 per cent request silently returns the
**80 per cent** interval. Verified directly: both limbs come back numerically identical to the
decile limbs, and the two levels scored the same to every digit before the probe was corrected.
Chronos-2 answers $0.05/0.95$ natively, checked the same way.

`kaas_probabilistic_2026` evaluates every model at $0.05/0.95$. So some part of Chronos-Bolt's
published $0.6211$ coverage is an 80 per cent interval being scored against a 90 per cent
target. **Only some part.** An 80 per cent interval scored as 90 would land near $0.80$, not
$0.62$, so the clamp is a contributor and not the explanation. What can be said is that the
comparison is not like-for-like in the way a reader would assume, and that this is a property
of the model rather than of the study.

Consequence for this project: the 0.90 row is reported as **unavailable** for Chronos-Bolt
rather than as a coverage failure. Reporting it would be measuring the clamp.

## 2 · The magnitude does not replicate

Nominal 80 per cent, the level both models support natively. Lower limb clipped at zero, which
matches `mondrian_band` and the point path, and which can only raise measured coverage.

| venue | arm | n | coverage | mean width | interval pinball |
|---|---|---|---|---|---|
| beer_hall | chronos_bolt | 1911 | 0.8158 | 611.8 | 137.56 |
| beer_hall | chronos2 | 1911 | **0.8226** | 627.7 | **120.53** |
| ellel | chronos_bolt | 1820 | 0.8615 | 232.4 | 97.25 |
| ellel | chronos2 | 1820 | **0.8956** | 296.0 | **74.53** |
| two_river_taps | chronos_bolt | 1435 | 0.7721 | 326.2 | 57.42 |
| two_river_taps | chronos2 | 1435 | **0.8237** | 344.8 | **53.81** |

Chronos-Bolt does not collapse here. Against a nominal $0.80$ it covers $0.816$, $0.862$ and
$0.772$. Only Two River Taps under-covers and the shortfall is $0.028$, not the $0.28$ the
published figure would suggest. **The estate does not reproduce the published magnitude, and
that is reported as the first result rather than buried under the part that did replicate.**

## 3 · The ordering replicates, three venues out of three

Everything Kaas et al. say about the *relationship* between the two models holds here:

- **Chronos-2 is better calibrated at every venue**, by $0.007$, $0.034$ and $0.052$.
- **Chronos-2 wins on interval pinball at every venue**, $120.5 < 137.6$, $74.5 < 97.3$,
  $53.8 < 57.4$.
- **Chronos-Bolt is narrower at every venue**, $612 < 628$, $232 < 296$, $326 < 345$.

That is the same trade the published study identifies, sharper intervals bought with worse
calibration, at a fraction of the severity. A rank agreement of three from three on a different
domain, a different country, a different scale and a different sampling frequency is worth more
than the magnitude would have been, because magnitudes are what should not transfer.

It also happens to support the incumbent. The estate serves Chronos-2, and the arm it serves is
the better-calibrated of the two on its own data as well as on the published benchmark.

## 4 · The third thing: Ellel's pooled coverage is an artefact of its zeros

Not what the probe was built to find. Splitting each venue's pairs by whether the venue actually
traded:

| venue | zero rate | pooled coverage | **active-only coverage** | active n |
|---|---|---|---|---|
| beer_hall | 0.247 | 0.8226 | 0.7789 [0.757, 0.800] | 1438 |
| two_river_taps | 0.245 | 0.8237 | 0.8153 [0.791, 0.838] | 1083 |
| ellel | **0.844** | 0.8956 | **0.4472 [0.388, 0.507]** | **284** |

Chronos-2 at nominal 80 per cent. At nominal 90 Ellel is $0.9445$ pooled against $0.6514$
active; Chronos-Bolt at nominal 80 is $0.8615$ pooled against $0.3169$ active.

Ellel's pooled coverage looks like the best of the three venues and is the worst by a distance.
On the days the venue actually trades, its native interval covers $0.447$ against a nominal
$0.80$. The pooled figure is carried entirely by the 84 per cent of rows where the answer is
zero, the forecast is near zero, and any interval containing zero is correct for free.

The pooled-minus-active gap tracks the zero rate across all three venues: $0.247 \to 0.044$,
$0.245 \to 0.008$, $0.844 \to 0.448$.

**This independently confirms `log/74` on a construction that shares nothing with it.** `log/74`
found Ellel's exchangeability violation using conformal residuals, a Mondrian partition and an
ETS point model. This probe uses none of those: it is a foundation model's own predictive
quantiles with no calibration layer at all. Same venue, same direction, same cause, different
instrument. A finding that survives a change of instrument that complete is not an artefact of
how the band was built.

## 5 · One observation held back from being a recommendation

Chronos-2's native 90 per cent interval covers $0.9178$ at the Beer Hall, where the served
ETS-plus-Mondrian conformal band covers $0.871$. It is tempting to read that as an argument for
serving the native interval instead.

It is not one, and the reason is stated so the temptation is closed rather than ignored. The two
differ in point model AND in band construction AND in whether any calibration layer exists, so
the comparison identifies nothing. Whether the native interval is better than a conformal band
around a different point model is not a question this probe asks. It is recorded as a Further
Work item with its own gate, alongside the others.

## 6 · Compute was never the reason the TabPFN rung did not run

Worth recording while the numbers exist. This probe ran both foundation arms across all three
venues and all 738 origins in minutes. `kaas_probabilistic_2026` measures TabPFN-TS at 1607.9 ms
per forecast against Chronos-2's 81.6 ms, eight hours against twenty-five minutes over their 200
feeders. At this estate's scale that ratio is tens of minutes, not days.

So the abort recorded in `sec:ladder` cannot be attributed to compute, and the write-up should
not leave a reader free to supply that explanation. The reason was, and remains, that the data
may not leave the machine.

## 7 · What may and may not be claimed

**May.** The published ordering between Chronos-2 and Chronos-Bolt replicates on this estate at
every venue and on every reported metric. Chronos-Bolt cannot emit a 90 per cent interval and
clamps silently. Ellel's pooled interval coverage is an artefact of its zero mass, confirmed
independently of `log/74`'s instrument.

**May not.** The published magnitude does not replicate, and nothing here explains the gap
between $0.62$ there and $0.77$–$0.86$ here. Domain, frequency, scale and clipping all differ
and the probe does not separate them.

**May not.** No claim that Chronos-2's native interval should replace the served band.

**May not.** Nothing here bears on TabPFN-TS, which was not run.

## 8 · Row status

| Item | Status |
|---|---|
| Chronos-Bolt overconfidence | **Ordering replicated, magnitude not.** Both reported |
| Chronos-Bolt 90 per cent interval | **Unavailable by construction.** New finding |
| Ellel zero-mass masking | **Confirmed on a second, independent instrument** |
| Native-vs-conformal interval | New Further Work item, gated |
