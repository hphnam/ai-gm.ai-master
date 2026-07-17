# Report 33 - G14: de-Lune, and the forecast that was not there

Date: 2026-07-17. Scope: Phase 3, the de-Lune pass report 32 §6 deferred. Follows report
32 (`2cc97e7`).

Phase 2 made compute stateless: dataset in, bundle out, per-request scratch store,
isolation that survived an adversarial review. Phase 3's brief was narrower and duller -
replace the Lune constants frozen in `config.py` with the injected `OrgProfile`, wire the
covariates the engine was accepting and reporting as ignored, and stop asserting against
one brewery's audited totals.

Building it turned up something that changes what Phase 2 actually delivered, so this
report leads with that rather than with the seam.

---

## 1. The headline: compute did not forecast

`compute/engine._forecast_venue` called `conformal.wrap.evaluate(venue, served)` and
drained the `forecasts` / `bands` rows it wrote into the scratch store. That looks right
and it is not. `evaluate` is a **backtest**: it walks the series in 7-day blocks, bands
each block from residuals accumulated strictly before it, and persists the last
`TEST_WEEKS` as its deliverable. It is the coverage evidence behind report 31's gate and
the Objective-1 deliverable. It is not a prediction.

Measured on the Phase 2 engine, 200 days of history ending 2026-07-19:

```
last day of supplied history : 2026-07-19
forecast target_date min     : 2026-05-24
forecast target_date max     : 2026-07-19
n forecast rows              : 57
rows for dates AFTER history : 0
rows for dates <= history    : 57
```

**Fifty-seven rows, none of them about the future.** An API persisting that bundle would
have been storing predictions for days that had already happened, under a `served_model`
name, with conformal bands, indistinguishable at the row level from a real forecast.

The Phase 2 diagnostic said `horizon_days` was "supplied but NOT honoured; the analytics
emit their own horizon". That sentence is true and it is misleading, which is the exact
failure `_report_unconsumed` was written to prevent. The analytics did not emit a
different horizon. They emitted no horizon. The field asking for a 7-day forecast
addressed a code path that produced none, and the diagnostic's wording made that sound
like a units mismatch.

Worth being precise about how this survived: the Phase 2 tests asserted
`{f.venue for f in bundle.forecasts} == {"ghost_bar"}` and
`{b.level for b in bundle.bands} == {0.80, 0.90}`. Both pass on a backtest. Nothing
asserted a `target_date` was in the future, because "the forecast is about the future"
is the kind of thing that feels too obvious to test.

`compute/forward.py` is the fix. After:

```
forecast target_date min     : 2026-07-20   (history + 1)
forecast target_date max     : 2026-07-26
rows for dates AFTER history : 7
rows for dates <= history    : 0
```

and `horizon_days=14` yields 14 days. It reuses the validated pieces rather than
inventing a second forecaster: the same `rolling_point_forecasts` residual stream
`evaluate` builds, the same Mondrian grouping, the same `conformal_quantile`, and - after
review caught the first cut hand-rolling its own - the same `calendar_features` and
`_attach_exog` that build the training frame (§7).

---

## 2. The seam: unbound is Lune, bound is total

`org_profile.py` (164 lines). One ContextVar, bound per request beside the scratch store,
plus accessors that the analytics read instead of `config`.

```
UNBOUND -> config.py (Lune)      BOUND -> the profile, entirely
```

Unbound is **not** a per-field fallback. It is the research path: the CLIs, `sim/` and the
test suite bind nothing and resolve to Lune's constants, which is what keeps report 31's
pre-registered result reproducible from shipped code after the engine went multi-tenant.

Bound is **total**, and this is the load-bearing half. A bound profile with
`structural_zero_dow=[]` means *this venue has no closed days*, not "unset, use Mon/Tue".
A per-field fallback would hand Lune's Monday/Tuesday closure to a tenant that trades
seven days, and it would reach the **Mondrian conformal grouping**, so the damage would
surface as a quietly miscalibrated band rather than as an error. Both halves are pinned
by `tests/test_org_profile.py`.

Why a ContextVar rather than an argument: threading a profile down to
`is_structural_zero` means changing every predictor signature in `models/ladder.PREDICTORS`
- the ~157-call-site rewrite Phase 2 declined for the store. Same problem, same seam,
already reviewed.

### 2.1 A latent bug the seam exposed

`conformal/wrap.py` grouped the Mondrian conformal band on the **literal** `(0, 1)`, in
two places, not on `config.STRUCTURAL_ZERO_DOW`:

```python
"is_zero": int(r["date"].dayofweek in (0, 1))
```

So Lune's own constant never reached the grouping it defines. Editing
`STRUCTURAL_ZERO_DOW` would have moved the `is_structural_zero` *feature* and left the
*band* calibrated on Monday/Tuesday - a silent divergence between two things named after
the same fact. Not a live bug (the literal happens to equal the constant), but it means
the config value was decorative on the path that matters most.

---

## 3. What was de-Luned

| Constant | Was | Now | Reached from compute? |
|---|---|---|---|
| `STRUCTURAL_ZERO_DOW` | `frozenset({0,1})` | per-venue `structural_zero_dow` | yes - feature + **Mondrian grouping** |
| `EVENT_ONLY_VENUES` | `frozenset({"ellel"})` | per-venue `is_event_driven` | yes - `is_closed`, spillover |
| `FORECAST_VENUES` | 3 Lune slugs | `org_profile.venues()` | yes - `dataset_max_date` |
| `WEATHER_CELLS` | slug→cell map | `lat`/`lon` presence | yes - weather join |
| `EVENT_SCOPE` | Lancaster/Preston | `{"all"}` for tenants | yes - event join |
| bank holidays | `UnitedKingdom(subdiv="England")` | `country_holidays(profile.country)` | yes |
| `_ellel_event_dates` | hardcoded `"ellel"` slug | any `is_event_driven` venue | yes |

After the pass, the only `STRUCTURAL_ZERO_DOW` left under `features/ conformal/ store/
compute/ models/` is inside a comment. The remaining `FORECAST_VENUES` are all CLI
`--all-venues` defaults.

Two of these were **silent wrongness, not crashes**, which is why nothing caught them:

- `dataset_max_date` iterated Lune's three slugs. Inside a tenant's scratch store every
  read missed, `.max()` returned `NaT`, and `NaT` poisons `max()` into an arbitrary
  answer rather than an error - so `is_closed` returned `False` for every tenant venue by
  accident rather than by reasoning. It now filters `NaT` and raises when no venue has any
  data, because "today" has no defensible value then and `is_dormant` would otherwise
  subtract its lookback from a sentinel and overflow.
- `_ellel_event_dates` read the literal slug `"ellel"`, so a tenant's spillover covariate
  was permanently zero. It now reads whichever venues the profile marks event-driven.

### 3.1 A landmine, disarmed

`models.ladder.global_gbm_predict` pooled `FORECAST_VENUES` and called `build_features(v)`
on each. It is **not** reachable from compute today - `rung3_global_gbm` is not in
`PREDICTORS`, so `_predictor` rejects it - but it is the tripwire under open decision 6:
the moment the ladder re-fit is wired in, it would call `build_features("beer_hall")`
inside a tenant's store and pool three empty frames. Changed to `org_profile.venues()`
now, while it is a one-line change and provably inert.

---

## 4. Exogenous, and the hole under `extra="forbid"`

Report 32 made much of the contract being strict: extra fields are rejected, so a caller
cannot believe it sent something it did not. That guard stops at the model boundary.

```python
values: dict[str, float]
```

`ExogenousRow.values` is a free dict. A caller sending `exo_tempc` passes validation
cleanly and gets **nothing** - a univariate forecast wearing the exo model's name. The
same failure the strict contract legislates against, one level down, wearing better
manners. Unknown keys are now checked against `ingest.exog_supplied.KNOWN_EXO_COLS` and
reported in `diagnostics`.

The overlay itself (`ingest/exog_supplied.py`) is used by **both** the training frame and
the horizon frame, through the same function. That is deliberate and not tidiness: a
covariate meaning one thing in training and another at serving time is train/serve skew,
and skew in a column the model was fit on is invisible until the forecast is quietly
wrong. Precedence is one-directional - where the request and Lune's curated calendar both
have a value, the request wins, because the derived value is compute's guess about a
tenant it knows nothing about.

`KNOWN_EXO_COLS` is a literal rather than an import of `CHRONOS2_EXO_COLS`, because
`ingest` sits below `models` and importing upward inverts the layering. A test asserts
the two agree, so the duplication cannot drift silently.

---

## 5. `expected_totals` is not a translation

CONTRACT.md §1 said Lune's hard asserts (`EXPECTED_TOTAL_ROWS` 92329,
`BH_NET_SALES_TOTAL` 202491.0) "become `expected_totals`". Checking where they actually
live: `ingest/normalise.py`, `store.warehouse.check()`, and each module's `main()`. All
on the **CSV bootstrap**. None on the compute path. So Phase 3's stated task - "delete the
Lune asserts from the compute path" - had nothing to delete, and `expected_totals` was a
contract field with no job.

It has one now, and it is a different job. It catches **the caller's** failure: a paged
sales query that silently drops rows hands compute a short series, and a short series does
not error, it forecasts low. That is the "plausible wrong number" the bundle's diagnostics
exist to prevent. Mismatch beyond `RECONCILE_TOL` (1%) is a diagnostic rather than a
refusal, because the API is better placed than compute to judge its own extract. `None`
skips it: an org without audited totals must still build.

---

## 6. The contract was wrong in three places

Building against CONTRACT.md is what proved it. All three corrections are recorded in the
document itself rather than quietly edited.

| Claim | Reality |
|---|---|
| `is_event_driven` "capped at Rung 1" (§1) | It does not. That was `MAX_RUNG`, which **G12.9c emptied** (`config.py:101`); `EVENT_ONLY_VENUES` has never gated the ladder. The contract described a cap the code retired a fortnight earlier. |
| VAT **[OPEN]** (§2) | Closed: API sends ex-VAT, brain assumes nothing. `vat_inclusive`/`vat_rate` **removed** from `VenueProfile` - nothing read them, so a caller setting `vat_inclusive=True` would expect deflation, get none, and mix bases across venues. A field that validates and does nothing reintroduces exactly what `extra="forbid"` prevents. |
| Weather fetch **[OPEN]** (§4), recommending compute keep one outbound call | Refuted by building it. Compute's store is a per-request scratch DB, so there is no cache to amortise against: (a) is not "one call", it is a synchronous Open-Meteo round trip **per venue per request**, in a route with no concurrency cap, against a rate-limited public API. Decided (b): the API supplies it. |

The `is_event_driven` error is the same species as the one report 32 found in Ryan's
brief, and it is worth noting the symmetry: that one traced to this project's stale
`FLAGS.md`, and this one is a stale claim in this project's own contract. Both are
documents that outlived the code they described. The lesson generalises past either
individual mistake.

The weather decision has a cost, and it is now a **caller obligation rather than a hope**:
weather must be on the **hindcast** basis. The observed/ERA5 basis is an oracle and leaks
into the backtest. An API that supplies ERA5 will not error - it will score better than it
deserves.

---

## 7. What review found, and what that says about the first cut

Two reviewers (code, security) were run against the finished Phase 3 diff and asked to
falsify it. They found **seven** defects. Both independently found the same one first,
and it was the worst.

### 7.1 The module broke its own stated rule

`compute/forward.py`'s docstring says every covariate must be produced by the same
function that produced the training column of that name, because otherwise the model is
fit on one definition and served another. The first cut then **hand-rolled parallel
implementations** of the calendar, events, World Cup and weather columns. Three of the
seven findings are that rule already broken, in the module that states it.

| # | Defect | Measured |
|---|---|---|
| 1 | **`exo_is_dry` inverted between train and serve.** Training derived it BEFORE the supplied-covariate overlay, the horizon frame AFTER. A tenant supplying rain (the natural thing) trained on `NaN < 1.0` = `0.0` on **every row** and served the real flag. | `TRAIN [0.0]` vs `SERVE [1.0]` |
| 2 | **The band is calibrated on ≤7-step errors and applied unchanged to day 30.** | coverage 93% @ step 7 → **78.9% @ step 30**, nominal 90%, project gate ±3pp |
| 3 | **The forward frame omitted 13 training columns**, so `rung3_gbm` raised `KeyError` instead of forecasting. | `forecasts=0` |
| 4 | **`exo_enabled` gated the horizon frame only.** A tenant without `sports` trained on Lune's World Cup schedule (read off **disk**) and served zeros. | `TRAIN wc=35` vs `SERVE wc=0` |
| 5 | **The calibration floor was checked on the pooled count, then the residuals were Mondrian-split.** A group of 4 silently became a "90% quantile" via `conformal_quantile`'s `k=min(…, n)` clamp. | pooled 30 ✓ → group n=4 |
| 6 | **`structural_zero_dow(None)` fell back to Lune's Mon/Tue under a bound profile** — a fail-open on the one seam whose contract is "bound is total". | latent |
| 7 | **(security, HIGH) Unbounded history span → unbounded re-fits.** `horizon_days` is capped 1–30; `sales_daily` was capped at nothing. One typo'd year in a POS export (`2202` for `2022`) densifies to ~65k daily rows. | **~9,272 re-fits, 17min+** from a 2-row request |

Finding 1 is the one that matters most and it is the one that would never have been
caught by a test I would have written. `exo_is_dry` is excluded from the GBM's features by
the A14 ablation verdict — but it is one of the 15 `CHRONOS2_EXO_COLS`, so it fed
**Lune's own flagship served entrant** and nothing failed. Silent, plausible, wrong. The
exact failure mode this report's §4 congratulates the contract for preventing.

Finding 2 is worse than a bug, in a small way: `sim/build_frozen_forecast._band_halfwidth`
**documents this caveat in its own docstring** ("the band is a nominal floor (the
extrapolation caveat)"). The port copied the method and dropped the caveat.

Finding 7 is not a Phase 3 regression — Phase 2's `evaluate()` walked the same full span —
but Phase 3 re-asserted it in new code and made it the only reachable path.

### 7.2 Fixed, and re-measured

Every fix was verified by re-running the reviewer's own measurement, not by asserting it:

| # | After |
|---|---|
| 1 | `TRAIN [1.0] == SERVE [1.0]`, and 0.0mm rain now actually reads as dry. A caller-supplied `exo_is_dry` survives the derivation. |
| 2 | Diagnostic: `horizon_days=N exceeds the 7-day calibration blocks, so the band is a NOMINAL FLOOR beyond day 7`. Per-step conformal is the real fix and is a research change with its own gate, not something to invent inside an integration phase. |
| 3 | `rung0/1/2/3_gbm` all return 7 forecasts + 14 bands. |
| 4 | `TRAIN wc=0`, `SERVE wc=0` — a consistent off-switch. |
| 5 | Floor applied **per group**; a thin group falls back to the marginal quantile (a real quantile of a real sample) and says so. |
| 6 | A bound profile asked about an unknown slug now **raises**, naming the profile it checked. |
| 7 | Calibration bounded to `BAND_CALIB_DAYS` (90) via `first_target` — which is also the statistically right answer and the one the frozen research forecasts already use. **14 predictor calls, 0.4s** (was ~9,272 / 17min+); the normal case is unchanged at 12 calls. |

Fixes 1, 3 and 4 came from deleting the parallel implementations: `calendar_features` was
extracted from `build_features` and `_attach_exog` is now called by both frames. The
forward frame is smaller than it was and does more.

**A bug in my own fix, caught by measuring it.** The first `exo_is_dry` fix looked correct
and passed its test — train and serve agreed. They agreed on `0.0` for 0.0mm rain, which
is *wrong*: the pre-overlay assignment produced `0.0` rather than `NaN`, so "preserve a
caller-supplied value" preserved a derived one. The placeholder is now `np.nan`
specifically so "derived" stays distinguishable from "the caller supplied 0". A test
asserting only train==serve would have passed both times, which is why
`test_dry_weather_actually_reads_as_dry` exists next to it.

### 7.3 What review cleared

Worth recording, because these are the load-bearing claims:

- **ContextVar bleed: clean**, verified empirically rather than read — six threads on
  copied contexts with alternating profiles each saw only their own. Caveat noted: the
  invariant holds *by absence* — there is no `ThreadPoolExecutor`/`joblib`/
  `multiprocessing` anywhere in the analytics, and a bare `threading.Thread` would start
  with an empty context and fall back to `config.DUCKDB_PATH`, i.e. Lune's real store.
- **Fallback-to-Lune reaches no Lune data**, for two independent reasons: every venue on
  the compute path originates from `dataset.org_profile.venues`, and the fallbacks hand
  over *constants*, never data — the scratch store holds no Lune tables and both
  `read_basis` and `read_events` return empty frames rather than reading disk.
- **No SQL injection in `exog_supplied`**, tested adversarially: column names are written
  as row **data**, not identifiers, behind an allowlist; `venue` is parameterised.
- **Nothing reads an observation inside the horizon.**

---

## 8. Evidence

**The research path is provably unchanged.** The strongest available check, and stronger
than the C2 re-score: hash the full training frame (contents *and* column order - tree
split ties depend on order) for each Lune venue, with and without Phase 3.

| Venue | rows | cols | sha256[:16] before | after |
|---|---|---|---|---|
| `beer_hall` | 399 | 40 | `59c83586f06c8359` | `59c83586f06c8359` |
| `two_river_taps` | 331 | 40 | `fb388ce32d02fdab` | `fb388ce32d02fdab` |
| `ellel` | 386 | 40 | `a3c110bbc72be722` | `a3c110bbc72be722` |

Byte-identical. The de-Lune changed no Lune number.

**C2 still reproduces** (store restored to 2026-07-07, held-out window intact, 0 rows):

| | Origin A | Origin B |
|---|---|---|
| BH L1 per-day MASE | **0.285** | **0.287** |
| band coverage @90 | 1.00 | 1.00 |
| England QF expected | +311.57 | +308.88 |
| England QF realised | **-269.00** | **-264.78** |
| realised premium | -315.66 | -299.23 |
| `generalises` | **False** | **False** |

An honesty note on what this proves: `sim/confront_july_w2.py` **re-scores a frozen
artefact**, it does not regenerate the forecast. So C2 reproducing validates the store and
the scoring, not the forecast generation - the frame hashes above are what cover that.
Report 32 leaned on "C2 reproduces bit-for-bit" as the gate for changes that could affect
forecasts; that was over-claimed, and the frame hash is the check it should have used.

**Suites** (both, full, after the review fixes):

| | before | after | delta |
|---|---|---|---|
| `.venv` (3.14) | 307 passed / 8 skipped | **356 / 8** | +49 |
| `.venv-forecast` (3.12) | 314 / 1 | **363 / 1** | +49 |

`.venv-eval` (the third venv, TSB-AD/statsforecast, numpy<2.0) still imports the seam and
resolves to Lune's venues - checked, because a previous pass broke it by changing
dependency floors without noticing it existed.

**Lint:** tree ruff 71 -> **70** (one pre-existing `I001` fixed in `ladder.py`, which
Phase 3 touched anyway; the new files are clean). A `ruff --fix` over `ingest/` also
"fixed" three files Phase 3 has no business in - reverted, and the count above is after
that revert rather than the flattering 67 it produced. The tree count is version-sensitive - `uvx ruff` fetches latest - so it is
only comparable within a session.

**`print()`:** 263, unchanged. Phase 3 added none. Still deferred (report 32 §6).

**A near-miss worth recording.** The frame-hash check *appeared* to fail mid-pass
(`beer_hall` 399 rows -> 362, hash changed). It was not the code: re-running the full
suite had reset the store to the 2026-05-31 CSV seed, so the two sides were hashing
different data. FLAG-STORE-DURABILITY almost corrupted the verification built to catch
exactly this class of error. The flag has been narrowed as a result (below).

---

## 9. Not done

- **The ladder never re-runs** (new open decision 6). Verified against the engine, not
  assumed: `bundle.ladder_selection` comes back `[]` on every call and `ServedRow.rung` is
  always `None`. Compute honours `prior_state.served_model` and cold-starts on
  `default_model`, so promotion is *continuous* - but a tenant's served model is whatever
  it started as, for ever. The re-fit cadence (`_should_refit`, `RETRAIN_CADENCE_DAYS`,
  the event-aware tightening) is still wired to the research store's watermark, not to the
  injected `prior_state`.
- **L1 only** (new open decision 7). Verified: `{f.layer for f in bundle.forecasts} ==
  {"L1"}`. The measured A-vs-B split (report 23 - MinT for Beer Hall, revenue-share
  disaggregation for Ellel) lives in `sim/`, is `GATE_WINNER`-keyed by Lune slug, and has
  no per-tenant equivalent.
- **`stock_enabled`** is accepted and **reported as unhonoured**: the pipeline reads
  monthly bar-stock spreadsheets off disk (`config.STOCK_DIR`) and has no injected path.
- **`timezone` / `currency`** accepted and unread. The analytics are date-grain, so
  `timezone` is inert until an intraday path exists; `currency` is presentational.
- **The briefing and change-point detectors** are still echoed, not advanced (Phase 2's
  position, unchanged).
- The 227->263 `print()` calls, `sim/` -> `.dockerignore`, the PII purge (Ryan's), and
  taxonomy-drift wiring - all as report 32 §6.

---

## 10. Obligations handed to the caller

Carried forward from report 32 §7, plus Phase 3's:

1. **`bundle.org_id` is echoed, never an authorization statement.** Assert
   `bundle.org_id === expectedOrgId`; persist under the orgId you already authorized.
2. **Weather must be hindcast-basis.** ERA5 will not error; it will flatter the backtest.
3. **`sales_daily` must be ex-VAT.** The brain applies no VAT rule. Mixing bases across
   venues is unrecoverable downstream.
4. **`exogenous` must span training history AND the full horizon**, or the exo entrant
   raises rather than degrading to univariate.
5. **`structural_zero_dow=[]` means no closed days.** There is no "unset".
6. **Read `diagnostics`.** Absent weather, unknown covariates, a dataset that does not
   reconcile, a cold-started model, a band beyond its calibration and a thin Mondrian
   group are all reported there and nowhere else.
7. **`horizon_days > 7` gets a nominal-floor band**, not a calibrated interval. Compute
   reports it rather than pretending; coverage past a week is not gate-checked.
8. **`sales_daily` should carry a plausible date span.** Compute bounds its own
   calibration walk so a bad date cannot drive unbounded re-fits, but a typo'd year still
   densifies the feature frame and moves the forecast origin. The API is the only layer
   that can tell a typo from history.
9. **Do not start a bare thread inside compute.** The per-request store and profile are
   ContextVars; a `threading.Thread` starts with an empty context and would fall back to
   Lune's real database. Propagate with `contextvars.copy_context()` or do not thread.

---

## 11. Decision-log rows

Added as row 23 (`Decision_and_Resolution_Log.md`, Section C).
