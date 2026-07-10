# 26 - G12.17a (Pass 1 of 2): advance to end-June, refresh, freeze the July forecast

Spec: `PRJ93_Spec_G12_17a_July_Pass1.md`. Branch `brain-construction`, `.venv-forecast`.
This pass advances the operational clock one period: it ingests June as observed
history, adds the liveness gate and the taxonomy refresh the June confront proved
necessary, refits on June-inclusive data, then FREEZES and COMMITS a blind forecast
for 1 to 7 July 2026 at all levels. No July actual is seen here; the commit is the
pre-registration proof. The June frozen artefact (`1d966be`) is untouched.

Committed under Nam only. This report and the frozen July artefact land in the same
pre-registration commit; its SHA is recorded in the decision log and cited by Pass 2.

## 17a-0: advance the clock, ingest June as observed history

MCP-SIM aggregate path (Neon not provisioned). The held-out June item pull
(`sim/june2026_actuals_l3_raw.json`, G12.16) was ingested into the served store's
`line_items` at aggregate grain (one line per venue/date/category/item), which is the
daily modelling grain the L1/L2/L3 views read; the manifest labels June rows
aggregate-sourced with no intraday or tax breakdown (`store/manifest.json`).

- 867 rows inserted (Beer Hall + Ellel; Two River Taps closed all June, Events out of
  scope). Store ceiling 2026-06-29 (no venue traded the 30th; the operational as-of
  and watermark are 2026-06-30).
- Reconciliation: Ellel store L1 equals the SalesUK pull to GBP 0.00; Beer Hall store
  L1 (item-sum) tracks SalesUK within GBP 180 over the month (about GBP 6/day, the
  ProductMix-vs-SalesUK gap), and its L1-vs-L3 delta of GBP 23 is exactly the two
  null-item Square residual rows (in L1/L2, not L3, by view definition). L1/L2/L3 are
  mutually coherent because all three are rebuilt from the one item pull.
- Weather: the exogenous tables were extended over June (and July 1 to 7) so the
  June-inclusive training frame has no NaN weather (Chronos raises on any NaN exo) and
  the July freeze can use a real forecast basis rather than climatology.

Deviation: the store ceiling is 2026-06-29, not 2026-06-30 as the spec's checklist
phrased it, because no venue traded on the 30th; the as-of/watermark is 2026-06-30.

## 17a-1: liveness gate (a dark venue is not forecast)

`active_span.is_dormant(venue, as_of, days=config.DORMANCY_LOOKBACK_DAYS=21)`: dormant
when a venue has zero trading for the last N days ending at the as-of date, judged
against a fixed recent window (distinct from `is_closed`, which compares to the
dataset-global max) and applied to every venue uniformly (no event-venue exemption).
Reactivation is automatic on the next trading day.

- At 2026-06-30: Two River Taps DORMANT (last trade 2026-05-08), Beer Hall and Ellel
  LIVE. Reactivation verified (TRT is live at an as-of when it traded).
- `tests/test_liveness_gate.py` (4 tests, monkeypatched store read for a deterministic
  window boundary): recent trade is live, no recent trade is dormant, reactivation on
  the window boundary is live, never-traded is dormant.
- Consulted at serving: the July freeze marks TRT dormant and withholds a positive
  forecast (the direct fix of June's GBP 5,329-vs-0 miss).

## 17a-2: taxonomy refresh (fix the drift the June confront found)

`build_hierarchy` gained a `since` window so the top-k ITEM ranking and category
ordering are computed from recent data, not the whole-history top sellers; the July
freeze selects nodes from the recent 120-day window ending at the cutoff. The refresh
diff (`sim/july2026_taxonomy_diff.json`):

- Beer Hall 29 to 32 nodes: `Beer::LuneBrew Pilsner` is now TRACKED (June's GBP 3,484
  top seller that sat entirely in OTHER in the June-frozen set), along with Aperol
  Spritz, Espresso Martini, Caravan T-shirt, Galway Irish Stout, Pop Can; the stale
  `Beer::Caravan of Love`, Gordon's Pink, Ascension Cider, Malbec drop out of top-k.
- Ellel 17 to 19: LuneBrew Pilsner, Breeze Pale Ale, Morgan's Spiced added.

Honesty boundary: refreshing top-k fixes the STALE-node problem (items that existed
but were untracked). It cannot fix the NEW-item problem (an item first appearing after
the cutoff has no history and belongs in OTHER by design); that residual is
irreducible. The two are separated in the report and Pass 2 measures the first.

## 17a-3: refit the gate on June-inclusive data

The 6-fold unified rolling-origin gate (`models.ladder.evaluate_rolling`, horizon 7)
was re-run for the live venues (`sim/refit_june_inclusive.py`,
`sim/july2026_refit_result.json`); TRT is dormant and not refit.

| venue | served winner | refit winner | refit MASE | Chronos-exo MASE | exo margin vs best non-foundation |
|---|---|---|---|---|---|
| beer_hall | rung4_chronos2_exo | rung1_robust_dow | 1.228 | 1.375 | -0.147 |
| ellel | rung1_robust_dow | rung4_chronos_bolt | 0.608 | 0.645 | -0.038 |

Finding: with June's World Cup volatility in the eval window, the robust-DOW baseline
edges Chronos-exo at Beer Hall (Chronos-exo falls to 4th) and the exo set's measured
margin turns NEGATIVE (the exo covariates no longer add net value on these folds).
Ellel's Chronos-bolt edges robust-DOW by 0.025.

Decision (adoption gate): both changes are marginal, single-refit deltas over a
uniquely volatile month, so they are RECORDED flagged-not-adopted, not served. A
promoted model (Chronos-exo, WP12) is not hot-swapped on that, mirroring the store's
`ladder_selection` adoption discipline. Serving the standing Chronos-exo winner at
Beer Hall also keeps the served model fixture-aware, so Pass 2's in-context test is
meaningful rather than trivially null against a DOW baseline. Conformal recalibration
is June-inclusive automatically (the band half-width is the recent rolling-residual
quantile, now over June).

## 17a-4: freeze the blind July 1 to 7 forecast

`sim/build_july_forecast.py` serves each live venue's standing gate winner over a
7-day forward horizon from the cutoff (the reliable regime, unlike June's 30-day cold
freeze). L2/L3 use the measured split (report 23): MinT for Beer Hall (the VENUE row
pinned so the reconciled nodes sum exactly to the served L1), revenue-share
disaggregation for Ellel, both on the refreshed nodes. Known-future covariates:
calendar, term, bank-holiday, World Cup wc_* incl. home-nation flags, is_ellel_event 0
forward, and REAL hindcast forecast-basis weather for Jul 1 to 7.

- Beer Hall (Chronos-exo + MinT): Jul 1 to 7 L1 GBP 3,917; 1 Jul point GBP 487, which
  sits above the historical Wednesday median of GBP 296. Whether that is genuine
  fixture anticipation is exactly the Pass 2 test.
- Ellel (robust-DOW + disaggregation): Jul 1 to 7 L1 GBP 56 (a sparse booking venue;
  1 Jul is a Wednesday with a 0 DOW-median).
- Two River Taps: DORMANT, marked not-forecast by the liveness gate.
- Fixture-flag assertion PASSED: 1 Jul England v DR Congo (17:00) fires
  `wc_england_in_hours = wc_home_nation_in_hours = 1` for Beer Hall (open at 17:00) and
  for no other July date; Ellel (shut at 17:00) does not fire it; the 6 Jul England
  match (02:00) does not fire in-hours.
- All levels coherent (L1 = sum L2 = sum L3 on every venue/date). 462 rows
  (L1 14, L2 91, L3 357). Artefact: `sim/july2026_forecast_frozen.{parquet,json,md}`.

Per-venue expectation: Beer Hall expects a mid-week 1 Jul lift for the England
fixture (the served forecast places 1 Jul above its Wednesday baseline), building to
the Fri/Sat weekend; Ellel expects near-zero unless a booking lands (blind
is_ellel_event 0). Whether the 1 Jul lift materialises and was anticipated is the
Pass 2 payoff.

## Deviations from the spec

1. **Store ceiling 2026-06-29, not 2026-06-30** (no trading on the 30th); as-of and
   watermark are 2026-06-30.
2. **Weather is the real hindcast forecast basis**, retrieved into the store, rather
   than being already present; the archived historical-forecast may reflect issues a
   few days before each date rather than strictly at the cutoff (a minor caveat noted
   in the artefact).
3. **Refit winners recorded but not adopted** (adoption-gate decision above); the
   served models are the standing gate winners.
4. **Agent-eval seasonal weather baseline.** Advancing the store into the live summer
   moved the injection oracle's sliding window and inflated the whole-year weather
   baseline, masking a real spring anomaly and flipping one attribution. Two
   consequent fixes, both genuine improvements: the injection oracle is pinned to its
   calibration window (`config.AGENT_EVAL_STREAM_CEILING`, the controlled-experiment
   principle), and the weather-anomaly attribution now normalises against a recent
   SEASONAL trailing window rather than the annual mean (a warm spell is an anomaly
   against the current season). Full suite green after both.
5. **Report numbered 26** per the log index.

## Airtight invariant held

The July forecast is generated only from data with date on or before 2026-06-30. No
July sales observation was read in this pass (July WEATHER, a known-future covariate,
was retrieved; July SALES actuals are Pass 2 only). The frozen July artefact is a
non-gitignored file committed before any July actual is pulled, so its commit
timestamp is the pre-registration evidence. The June frozen artefact (`1d966be`) and
`stock_inventory.py` are untouched. Both suites green (`.venv-forecast` 269 passed 1
skipped).
