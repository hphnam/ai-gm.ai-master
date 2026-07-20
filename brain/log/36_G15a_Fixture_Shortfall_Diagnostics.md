# Report 36 - G15a: the 11 July shortfall, diagnosed

Date: 2026-07-19. Branch `brain-construction`, from tip `44a0f08`. Scope: the three
named-but-untested hypotheses behind report 31's falsification, plus one finding that
was not in any report and that changes how hypothesis 2 has to be written up.

> ## Every finding in this report is POST HOC and EXPLORATORY
>
> The 11 July actual was pulled 2026-07-16 and scored in report 31. Every hypothesis
> below was specified **after** that. A post-hoc diagnostic may **explain**; it may not
> **confirm**. Nothing here is pre-registered, nothing here has a held-out test, and
> none of it may appear beside the pre-registered results of reports 27, 29 and 31
> without this distinction on the same page.
>
> The pre-registered result is unchanged and stands whatever this report shows:
> **MASE 0.285 / 0.287, coverage 1.00, `generalises: False`.**

## Headline

Both testable hypotheses were tested. **Both are negative.** The 11 July shortfall
survives diagnosis and remains unexplained by the covariate set.

| Hypothesis (report 31 ranking) | Verdict | The number |
|---|---|---|
| (1) weather across the two Saturdays | **refuted** | 11 Jul was 2.1 C warmer, 0.9 hrs sunnier, equally dry. The better Saturday underperformed. |
| (2a) Ellel estate substitution | **tested; real, consumed, insufficient** | closes GBP 27.50 of a GBP 573.66 over-forecast (**4.8%**) |
| (2b) Events booking | **untestable** | 203 rows over **2 distinct dates** in the whole seed history |
| (3) tournament stage | still untested | n=2 stages; same n problem as (2b) |

Three things were found that are not in any report and that matter more than the
verdicts:

1. **`is_ellel_event` is a train/serve asymmetry** of the same species as report 33's
   `exo_is_dry` defect: the served model is fit on a covariate that is informative on 66
   training days and pinned to 0 on every horizon day it ever serves. Documented, not
   hidden - but a documented asymmetry is still an asymmetry.
2. **Lune's own spillover hypothesis is refuted.** The measured direction is
   **substitution**, not complement. That is the fourth belief this project has killed.
3. **The naive version of that measurement gets the sign wrong by GBP 523.** Pooled
   reads **+GBP 500**, day-of-week-matched reads **-GBP 23**. Section 2.1.

---

## 1. Weather across the two Saturdays (G15a.1)

27 June (+234%, the largest home-nation lift on record) and 11 July (-21%, the
shortfall) hold day of week and kickoff hour constant, so weather was the one exogenous
family report 31 named and did not compare.

Two questions, which produce a wrong answer if merged:

- **what the model saw** - the `hindcast` basis **as persisted**. For 27 June that is a
  closed historical forecast inside the training frame. For 11 July it is a **forward
  forecast retrieved 2026-07-10**, when both freezes were built, for a date that had not
  happened. Dissertation-notes limitation 9. The store is the only record of it; a
  re-fetch cannot recover it.
- **what occurred** - the `observed` (ERA5 reanalysis) basis, retrievable now.

A third column was pulled that the spec did not ask for: the hindcast **as the API
answers it today**. Without it, "the model was handed a bad forecast" and "the archive
was later revised" are not separable.

### The four-cell table (plus the revision control), `beer_hall` cell

| Date | View | `exo_temp_c` | `exo_rain_mm` | `exo_sunshine_hrs` | `exo_is_dry` |
|---|---|---|---|---|---|
| 27 Jun | model saw | 25.6 | 0.1 | 15.000 | 1 |
| 27 Jun | **occurred** | **23.1** | **0.5** | **15.232** | **1** |
| 27 Jun | hindcast today | 25.6 | 0.1 | 15.000 | 1 |
| 11 Jul | model saw | 27.2 | 0.0 | 15.086 | 1 |
| 11 Jul | **occurred** | **25.2** | **0.0** | **16.133** | **1** |
| 11 Jul | hindcast today | 27.3 | 0.0 | 15.131 | 1 |

`build()` was **not** called. Only the explicit-range `fetch_observed` / `fetch_hindcast`
helpers were used and the result went to `sim/g15a_weather_compare.json`; calling
`build()` would have persisted and extended coverage, writing the held-out window's
weather into the served store.

### Question 1: can observed weather carry a swing from +234% to -21%?

**Magnitude, not verdict.** 11 July minus 27 June, on what actually occurred:

- temperature **+2.1 C** (25.2 vs 23.1)
- sunshine **+0.90 hrs** (16.13 vs 15.23)
- rain **-0.5 mm** (0.0 vs 0.5)
- `exo_is_dry` **0** - both days dry, both sides of the threshold, no contrast at all

Both Saturdays were warm, dry and sunny, and **11 July was the better of the two on
every axis**. For weather to explain the swing it would have to act in the direction
opposite to its sign on all three continuous covariates simultaneously.

**Refuted.** This is now the second obvious explanation for 11 July to be refuted by the
27 June control, after kickoff time. Both were refuted the same way: by a case that
holds the proposed cause constant and inverts the outcome.

### Question 2: did the conditioning weather for 11 July differ from what occurred?

Yes, and this is a **distinct failure mode** from the fixture effect, so it is named
separately rather than folded in.

| Covariate | model saw | occurred | error |
|---|---|---|---|
| `exo_temp_c` | 27.2 | 25.2 | **+2.0 C over-forecast** |
| `exo_sunshine_hrs` | 15.086 | 16.133 | **-1.05 hrs under-forecast** |
| `exo_rain_mm` | 0.0 | 0.0 | 0.0 |
| `exo_is_dry` | 1 | 1 | 0 |

This is a **forecast-of-a-covariate error**: the model was conditioned on a warmer,
duller 11 July than the one that happened. The temperature error is in the direction
that would **inflate** a revenue forecast, so it is a named contributor to the
over-forecast, of unquantified and probably small size.

It is not the explanation, for two reasons. It is 2 C on a day the model over-forecast
by GBP 574; and it is a **routine** magnitude, not an anomaly - the same 2 C gap
between forecast and reanalysis sits on 27 June (25.6 saw, 23.1 occurred), the day the
model got right.

**The revision control earns its place.** `hindcast today` reproduces `model saw`
almost exactly (27 Jun identical to three decimals; 11 Jul 27.3 vs 27.2). The archive
was **not** revised. So the gap is genuinely forecast-versus-reanalysis - the real
serving condition - and not an artefact of a later data correction. Limitation 9 is
confirmed as stated and now has a measured size.

**No model was fitted.** n=5 fixture dates does not support a regression of revenue on
weather and the project does not report what n cannot carry.

---

## 2. The `is_ellel_event` train/serve asymmetry (G15a.2)

The highest-value item in the package, and the one that was not in any report.

### The asymmetry

`is_ellel_event` is one of the 15 served `CHRONOS2_EXO_COLS`. On the Beer Hall frame it
is a binary "did the booking-led venue trade that day" flag populated from observed
trading (`features/build_features.py:189`, from `event_venue_dates()`, which reads the
store). On **every** forecast horizon it is **pinned to 0** - `compute/forward.py:125`
documents the convention deliberately and `sim/build_frozen_forecast.py` uses the same
one, on the sound reasoning that a forecaster standing at the cutoff does not know the
event venue's future bookings.

The consequence is that the served Beer Hall model is **fit on a covariate that is
informative on 66 of its 399 training days and constant at 0 on every day it ever
forecasts.** Train and serve disagree on a column the model was fit on.

That is the same species as report 33's finding 1 (`exo_is_dry` inverted between train
and serve). The difference is that this one is documented rather than hidden, which is
better - but "documented" is not "harmless", and nobody had measured it.

**And Ellel traded on 11 July** (GBP 385.12, 55 orders, from the evaluation-only actuals
pull; the date is held out of the store by design). Both frozen forecasts were
conditioned on `is_ellel_event = 0` for that date.

### 2.1 The unconditional association, and the trap in it

Beer Hall revenue on Ellel-active days against Ellel-quiet days, **matched on day of
week**, across the committed history. n = **66 active / 333 quiet**.

| DOW | n act | n quiet | mean act | sd act | mean quiet | sd quiet | diff (mean) | diff (median) |
|---|---|---|---|---|---|---|---|---|
| Mon | 2 | 55 | 0.0 | 0.0 | 125.0 | 460.3 | -125.0 | 0.0 |
| Tue | 2 | 55 | 0.0 | 0.0 | 24.2 | 89.6 | -24.2 | 0.0 |
| Wed | 0 | 57 | - | - | 359.4 | 285.2 | not estimable | - |
| Thu | 4 | 53 | 753.2 | 420.5 | 673.3 | 250.2 | +79.9 | +24.4 |
| Fri | 15 | 42 | 865.9 | 371.4 | 992.3 | 518.1 | -126.4 | +61.6 |
| Sat | 30 | 27 | 1406.0 | 713.9 | 1440.9 | 938.1 | -34.9 | +41.7 |
| Sun | 13 | 44 | 615.9 | 298.5 | 509.9 | 241.8 | +105.9 | +120.7 |

**Day-of-week-matched effect: GBP -23.40**, weighting each day of week by its
active-day count (the estimand is the effect on a day Ellel actually trades, not on a
uniform week).

**Sign: negative. Substitution, not complement.**

That refutes Lune's own stated hypothesis, which is written into the source: "Lune's
hypothesis is that an Ellel function night lifts the Beer Hall next door"
(`features/build_features.py`). It is the fourth belief this project has killed, after
the home-nation uplift, the kickoff-time explanation, and the Origin-B sharpening.

**The trap, and it is worth a subsection of the dissertation on its own.** The
**pooled** comparison - the one anybody would write first - reads:

| | pooled | DOW-matched |
|---|---|---|
| effect | **+GBP 500.18** | **-GBP 23.40** |
| reading | strong complement | weak substitution |

A **GBP 523 swing, and a sign inversion, from the choice of estimator alone.** Ellel
books weekends (30 of 66 active days are Saturdays, 45 of 66 are Fri/Sat/Sun) and the
Beer Hall's revenue is strongly day-of-week driven (Saturday mean GBP 1,406 against
Tuesday GBP 24). The pooled estimate reports the **day-of-week effect** under the name
"spillover" and with the wrong sign. It is a compact, self-contained confounding example
sitting inside the project's own data, and the naive version would have **confirmed the
hypothesis the matched version refutes**.

The estimate is weak and should be reported as weak: -23.40 against within-cell standard
deviations of 300 to 900, and the medians disagree with the means on Fri/Sat (the
distribution is skewed by event nights). The honest statement is **"small, negative,
poorly determined"**, not "cannibalisation measured at GBP 23".

### 2.2 Does the served model use it?

Not inert. Measured by running the served `rung4_chronos2_exo` entrant over the 8 to 14
July horizon from the 2026-07-07 cutoff, identical but for the flag.

**Two arms were measured, and this is a deviation from the spec that changes the
answer.** The spec asked for the flag forced to 1 and then to 0 **across the horizon**.
Chronos-2 conditions on the whole future covariate path, so "1 on every horizon day" is
a **constant column over the horizon** - a different conditioning regime, carrying no
within-horizon contrast - while a real Ellel booking presents as a **spike on one day**.
Measuring only the arm as specified would have reported **the wrong sign for the
operative case**.

| Arm | 11 Jul delta | window / mean delta | max abs daily delta |
|---|---|---|---|
| constant (flag = 1 on all 7 days, as specified) | **+47.37** | -80.16 over the window | 47.37 |
| **spike (flag = 1 on one day, isolated)** | **-27.50** | -31.68 mean | 38.70 |

The two arms **disagree in sign on 11 July**. The spike arm is the operative one and it
is strikingly consistent: **every** horizon day moves negative, in a tight band of
**-25.52 to -38.70**.

| Date | baseline | spike | delta |
|---|---|---|---|
| 08 Jul | 364.05 | 329.83 | -34.21 |
| 09 Jul | 766.89 | 732.75 | -34.14 |
| 10 Jul | 1103.00 | 1067.84 | -35.15 |
| **11 Jul** | **1558.28** | **1530.78** | **-27.50** |
| 12 Jul | 513.66 | 474.96 | -38.70 |
| 13 Jul | 44.95 | 19.43 | -25.52 |
| 14 Jul | 118.10 | 91.57 | -26.53 |

**Not inert, and the sign agrees with section 2.1.** The served model has learned a
small negative Beer Hall response to an Ellel trading day, and it applies it
consistently. Two independent measurements - a matched historical comparison and a
served-model perturbation - agree on the sign and on the order of magnitude (GBP -23
against GBP -32).

### 2.3 The 11 July counterfactual

Origin B's configuration, `is_ellel_event = 1` on 11 July only, everything else
identical. **A counterfactual on a frozen artefact, not a re-freeze**: written to a new
file, with `sim/july2026_w2b_forecast_frozen.*` and
`sim/july2026_w2_confront_result.json` untouched and `git status` clean on both.

**The control arm reproduces the committed Origin B forecast to the penny: 1558.28, gap
0.00.** That matters more than the counterfactual. It is the first evidence in this
project that the forecast **generation** path is reproducible from the store at all, and
report 33 was explicit that the C2 confront re-scores a frozen artefact and therefore
never proved this. The delta below is trustworthy because of it.

> **Scope of that claim, corrected 2026-07-20 (G16b.1).** What was measured is agreement
> to the penny on **one venue-day**, `beer_hall` on 11 July. It is not bit-level
> reproduction of a generation path, and this report originally called it
> "bit-reproducible", which is the same species of over-claim report 33 corrected report
> 32 for. The stronger claim needs full-precision output across all seven horizon days and
> all three venues, which is a measurement nobody has run, not an edit. Substance
> unchanged: the reproduction is real and it is what makes the GBP 27.50 delta readable.

| | forecast | residual vs GBP 984.62 actual |
|---|---|---|
| frozen Origin B (committed) | 1558.28 | **+573.66** |
| control, flag = 0 (reproduction) | **1558.28** | +573.66 |
| **counterfactual, flag = 1** | **1530.78** | **+546.16** |

**The counterfactual closes GBP 27.50 of a GBP 573.66 over-forecast: 4.8%.**

The mechanism is real, it is correctly signed, the served model consumes it, and it is
**an order of magnitude too small to matter**. Had the model been told the truth about
Ellel on 11 July, it would still have over-forecast by GBP 546.

**The bound, stated immediately as the spec requires.** This is one date, chosen after
the failure was known, with the explanation constructed afterwards, and the effect
being estimated is 4.8% of the error against within-cell dispersion of several hundred
pounds. It is a **hypothesis with weak supporting evidence and a measured ceiling**, not
a confirmed cause. The ceiling is the useful part: it does not merely fail to confirm
the hypothesis, it **bounds how much of the miss the hypothesis could ever have
carried**, and the answer is "almost none".

---

## 3. Scoping the Events arm (G15a.3)

Report 31 names a GBP 779.94 Events booking on 11 July as part of hypothesis 2.
Confirmed independently from the committed seed export
(`data/items-2024-01-01-2026-06-01.csv`, utf-16 / tab, canonicalised through
`ingest.normalise.canonical_venue`), over 2025-06-04 to 2026-05-31:

| Venue | line items | distinct dates | span |
|---|---|---|---|
| `beer_hall` | **47,644** | 270 | 2025-06-04 to 2026-05-31 |
| `two_river_taps` | 33,993 | 280 | 2025-06-12 to 2026-05-08 |
| `ellel` | 10,489 | 64 | 2025-06-08 to 2026-05-22 |
| **`events`** | **203** | **2** | **2026-05-30 to 2026-05-31** |

The spec's figures are confirmed exactly: **203 rows across 2 distinct dates**, against
47,644 for the Beer Hall. Both Events dates are the **last two days of the seed window**,
so the location has no history at all before 2026-05-30.

**The Events arm is not testable. This is a stated non-test, not a result.** A
comparison built on n=2 would be theatre. Recorded as `DISSERTATION_NOTES.md`
limitation 10 with the row count as its evidence.

### `EXCLUDED_VENUES` was dead, and it had already misled a committed artefact

Confirmed by grep: `config.EXCLUDED_VENUES = frozenset({"events"})` had **exactly one
occurrence in the entire tree - its own definition.** Nothing read it. The real
exclusion is `config.FORECAST_VENUES`, an explicit three-venue allowlist.

It was worse than dormant. `sim/july2026_w2_actuals_l1_raw.json` carries, in a committed
evidence artefact, the claim:

> "config.EXCLUDED_VENUES excludes it from forecasting, so the confront drops it"

That is **false**. The constant performed no exclusion; `FORECAST_VENUES` did. This is
the third constant on this project to look authoritative and govern nothing, after
`vat_inclusive`, `timezone` and `currency` on the contract - and the first one caught
actively propagating a false claim into an artefact.

**Resolved by deletion**, with the real mechanism documented at `FORECAST_VENUES`. It
was not wired in, and the reason is a design argument rather than convenience: a
denylist **fails open** (a location added upstream and forgotten is silently forecast),
an allowlist **fails closed**. `FORECAST_VENUES` was already the right shape.

**The false claim in the actuals artefact was deliberately NOT corrected in place.**
`sim/july2026_w2_actuals_l1_raw.json` is pre-registration evidence and hard invariant 2
routes every 8 to 14 July actual through it; editing it, even its prose, to make the
project look more correct is the wrong instinct on an artefact whose whole value is that
it has not been touched since the pull. The correction is recorded here, in `FLAGS.md`
and in the decision log instead. The artefact remains an accurate record of what was
**believed** on 2026-07-16, which is what an evidence artefact is for.

Frame hashes unchanged after the deletion.

---

## 4. Limitation 4 corrected (G15a.4)

`DISSERTATION_NOTES.md` limitation 4 read:

> "No cross-venue substitution term. Venues are modelled independently."

On the evidence in section 2 that is **overstated and wrong**. A cross-venue term
exists, it is in the served exo set, and the served model demonstrably consumes it.

An overstated limitation is as much a defect as an overstated finding, and it fails in a
particularly bad way at viva: a reader who greps the source finds `is_ellel_event` in
`CHRONOS2_EXO_COLS` in about thirty seconds and the limitation reads as either careless
or evasive. The corrected version is also **more useful**, because "the term exists but
is blind on the horizon" names a fixable defect where "there is no term" names an
architectural absence.

Rewritten to what is true: the term is **present but impoverished** - it carries
presence rather than magnitude, it is pinned to 0 across every forecast horizon, and no
term of any kind exists for the Events location. Section 3.1 of the notes was rewritten
with the post-hoc status table, the substitution finding, and the pooled-vs-matched
trap. Limitations 10 and 11 added; limitation 9 now carries the measured conditioning
error.

---

## 5. Acceptance gates

| Gate | Status |
|---|---|
| Four-cell weather table from explicit-range fetches, `build()` not called | PASS (section 1; plus a revision control the spec did not ask for) |
| The two weather questions answered separately, with magnitudes | PASS |
| Ellel effect with sign, dispersion, n on both sides | PASS (-23.40, n 66/333, per-DOW sd reported) |
| Served-model sensitivity measured, including the null case | PASS, **two arms** - the spec's arm alone gives the wrong sign |
| 11 July counterfactual with and without, against GBP 984.62 | PASS (1558.28 to 1530.78; residual 573.66 to 546.16) |
| Frozen artefacts byte-identical, `git status` clean | PASS |
| Events arm tested or untestable, with its row count | PASS (untestable; 203 rows / 2 dates) |
| `EXCLUDED_VENUES` resolved | PASS (deleted; `FORECAST_VENUES` documented) |
| Every claim labelled post hoc | PASS |
| Limitation 4 corrected or confirmed | PASS (corrected) |
| Frame hashes unchanged | PASS - see the deviation in section 6 |
| No dissertation number moved | PASS (C2 re-scored at the end of G15) |

## 6. Deviations

**(a) The published frame hashes could not be reproduced, because the script that
produced them was never committed.** Hard invariant 3 pins three sha256 prefixes.
`git log -S` finds them in reports 33, 34, 35 and the decision log, and **in no script,
in any commit.** The gate the project leans on for "did this change move a Lune number"
was not runnable by anyone, including its author. This is the same failure mode as a
document outliving its code, applied to the check built to catch that failure mode.

Compounding it, the **`ellel` dimensions do not reproduce either**: the reports say
386 x 40, the canonical restored store gives **392 x 40**. That is not a hashing
convention - it is six rows. Ellel's series runs 2025-06-08 to 2026-07-04 (392 days);
386 implies a ceiling of 2026-06-28, i.e. report 33's measurement was taken against a
store **without the July W1 Ellel rows** (2026-07-02 and 2026-07-04, both legitimately
inside the 2026-07-07 ceiling). Most likely FLAG-STORE-DURABILITY firing a fourth time,
unnoticed, in the session that wrote report 33. The `beer_hall` and `two_river_taps`
dimensions reproduce exactly.

Resolved by committing `sim/frame_hash.py` with the procedure written down and a
baseline re-measured against the canonical store at tip `44a0f08`:

| Venue | rows x cols | sha256[:16] |
|---|---|---|
| `beer_hall` | 399 x 40 | `8c8a8be9d8dc5791` |
| `two_river_taps` | 331 x 40 | `b6339032a219213c` |
| `ellel` | **392** x 40 | `ea28bcacbf1825e4` |

**These are a new baseline, not a contradiction of report 33.** Report 33's claim was
before-vs-after **within one session**, and that claim is unaffected. What is now
established is that its published values are not portable and were never reproducible,
so the hashes quoted in reports 33 to 35 should be read as session-local. Every gate in
G15 runs against the table above.

**(b) The serving-sensitivity measurement was run two ways, not one.** Section 2.2. The
arm the spec specified reports **+47.37** on 11 July; the arm the counterfactual
actually needs reports **-27.50**. Running only the specified arm would have put a
wrong-signed number in the dissertation. Both are reported.

**(c) The false claim in `sim/july2026_w2_actuals_l1_raw.json` was left in place.**
Section 3. Correcting prose inside a pre-registration evidence artefact is a worse
failure than the stale claim; the correction lives here, in `FLAGS.md` and in the
decision log.

**(d) No `--apply`-style change was made to the actuals or freeze paths at all.** The
package added four files under `sim/` and deleted one dead constant. Everything else is
documentation.

## 7. Reproduction

```
.venv-forecast/bin/python -m sim.restore_clock              # ceiling must be 2026-07-07
.venv-forecast/bin/python -m sim.frame_hash                 # the gate, now committed
.venv-forecast/bin/python -m sim.g15a_weather_compare       # G15a.1 (network: open-meteo)
.venv-forecast/bin/python -m sim.g15a_ellel_counterfactual  # G15a.2 (chronos-2)
```

Artefacts: `sim/g15a_weather_compare.json`, `sim/g15a_ellel_counterfactual.json`,
`sim/frame_hash_baseline.json`. Store ceiling verified 2026-07-07 with 0 rows in
2026-07-08 to 2026-07-14 at both the start and the end of this package.
