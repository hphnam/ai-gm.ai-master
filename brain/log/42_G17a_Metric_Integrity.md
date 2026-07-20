# Report 42 - S1 G17a: metric integrity, and what the July headline actually was

Date: 2026-07-20. Branch `brain-construction-local`, from tip `d40dea7`. Scope: make one
documented scale function the only L1 implementation in the repository, add RMSSE, report
interval width alongside coverage, and re-score all three confrontation windows on every
basis.

## Headline

**The published July W1 figure of 0.386 was computed on a different ruler from the backtest
it was compared against.** It reproduces exactly, at 0.385, on `trading_lag7`. On the
backtest's own basis it is **0.772**, against a backtest MASE of 0.745.

| Beer Hall, 1 to 7 July, MAE 243.5 | MASE |
|---|---|
| published | 0.386 |
| reproduced on `trading_lag7` | 0.385 |
| on the reported basis `calendar_lag7` | **0.772** |
| backtest, same basis | 0.745 |

The claim the number was carrying - that the live forecast beat its own backtest by nearly
half - does not survive. Nor is the replacement claim "it matched": 0.772 against 0.745 is
**slightly worse** than its backtest class, not equal to it. The defensible sentence is that
**performance at the serving horizon is consistent with the backtest**, which is a real and
reportable result, and the honest direction of the small residual is stated rather than rounded
away.

G3 was the load-bearing gate precisely because 0.385 reproducing 0.386 is what proves the
diagnosis is the ruler and not something else. It reproduced to three decimal places.

All six gates pass. Two findings beyond the spec are recorded in sections 5 and 6, and four
deviations in section 8.

---

# 1. The defect, confirmed

Four private implementations, not three. The spec named `sim/confront_july.py`,
`sim/confront_july_w2.py` and `sim/cadence_sweep.py`. A fourth, `_seasonal_naive_scale`, sat
in `sim/confront_june.py` and the G1 gate as originally written could not have caught it:
`grep "_seasonal_scale"` does not match `_seasonal_naive_scale`, because the substring is not
present. Raised before any edit and folded in as ordinary S1 work per the amended scope.

They disagreed because they read different views:

| implementation | series | basis |
|---|---|---|
| `sim/confront_july.py` | `l1_daily` raw | `trading_lag7` |
| `sim/confront_july_w2.py` | `l1_daily` raw | `trading_lag7` |
| `sim/confront_june.py` | `read_series(fill_calendar=True)` | `calendar_lag7` |
| `sim/cadence_sweep.py` | `read_series(fill_calendar=True)` | `calendar_lag7` |

`l1_daily` is grouped by trading date and therefore omits closed days, so a lag-7 difference
across it reaches back 1.34 calendar weeks at Beer Hall and lands on a different weekday.
`fill_calendar=True` fills closed days with zeros, so the differences are deflated by
zero-against-zero pairs. Neither is a correct seasonal naive, and the two errors push in
opposite directions.

# 2. The four scales

Store at ceiling 2026-07-07. All twelve G2 assertions pass within the 0.5 tolerance.

| venue | trading days | calendar days | trading/week | same-weekday lag | zero lag-7 diffs |
|---|---|---|---|---|---|
| `beer_hall` | 302 | 399 | 5.30 | 5 | 78 of 392 |
| `two_river_taps` | 280 | 331 | 5.92 | 6 | 44 of 324 |
| `ellel` | 68 | 392 | 1.21 | 1 | 284 of 385 |

| venue | `calendar_lag7` | `trading_lag7` | `trading_same_weekday` | `calendar_lag7_active` | spread |
|---|---|---|---|---|---|
| `beer_hall` | 315.7 | 631.8 | 456.5 | 386.9 | 2.00x |
| `two_river_taps` | 150.3 | 220.7 | 243.7 | 173.2 | 1.62x |
| `ellel` | 180.1 | 770.8 | 806.2 | 754.0 | 4.48x |

The spread is the defect made numerical. At Ellel the same forecast can be made to look
**4.5 times** better or worse by choice of denominator alone, and nothing in the previous code
recorded which had been used.

The two venues fail oppositely, which is why no single naive fix would have worked. Beer Hall
trades 5.3 days a week, so compressing out closed days barely shortens the index and
`trading_lag7` merely lands on the wrong weekday, roughly doubling the scale. Ellel trades
1.21 days a week, so 74 percent of its calendar lag-7 differences are zero against zero and
`calendar_lag7` collapses to a quarter of the honest value.

# 3. MASE on every basis, per window, with RMSSE

Columns (a) to (d) are `calendar_lag7`, `trading_lag7`, `trading_same_weekday`,
`calendar_lag7_active`. Bold is the reported basis. Full table also in
`sim/ruler_comparison.md`.

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
| `beer_hall` (A) | 180.3 | **0.571** | 0.285 | 0.395 | 0.466 | 0.440 | 7 |
| `ellel` (A) | 74.0 | **0.411** | 0.096 | 0.092 | 0.098 | 0.285 | 7 |
| `beer_hall` (B) | 181.4 | **0.575** | 0.287 | 0.397 | 0.469 | 0.444 | 7 |
| `ellel` (B) | 74.0 | **0.411** | 0.096 | 0.092 | 0.098 | 0.285 | 7 |

**Independent confirmation that the reimplementation is faithful.** The committed W2 artefact
records 0.285 / 0.096 / 0.287 / 0.096. The `trading_lag7` column above reproduces all four
**exactly**, which is what a correct reimplementation of the old private function on its own
basis must do.

### Why `calendar_lag7` is the reported basis

It is not the best of the four. It is the only one on which **both** the ladder backtest and
all three confrontations already exist, and S1 is forbidden from re-running the ladder.
Reporting `calendar_lag7_active` today would leave the backtest on one ruler and the
confrontations on another, which is the defect this package exists to remove, in a new place.

`calendar_lag7_active` is the methodologically preferred successor: it is the only basis that
is simultaneously weekday-aligned (it keeps the calendar index, so lag 7 is genuinely the same
weekday) and free of structural-zero deflation. `trading_same_weekday` is weekday-approximate
by construction and degenerates at Ellel, where 1.21 trading days per week rounds to lag 1 and
"same weekday" becomes "yesterday", which is not a seasonal naive at all. Adopting
`calendar_lag7_active` belongs in S4, where the ladder can be re-scored alongside it.

**With one caveat S4 must weigh, and it is not small.** Being weekday-aligned and undeflated
costs sample size, because a pair survives only when both endpoints are trading days:

| venue | total lag-7 pairs | kept by `calendar_lag7_active` | share |
|---|---|---|---|
| `beer_hall` | 392 | 276 | 70.4% |
| `two_river_taps` | 324 | 268 | 82.7% |
| `ellel` | 385 | **28** | **7.3%** |

At Beer Hall the active basis is a mild filter. At Ellel it estimates the denominator from
**28 differences**, because a venue trading 1.21 days a week almost never has two trading days
exactly seven days apart. So the basis that is cleanest in principle is also the noisiest in
practice at precisely the venue whose intermittency motivated it. S4 should not adopt it at
Ellel on methodological grounds alone; it needs a variance argument, and the honest answer may
be a different basis per venue, stated as such.

This count is now published as `active_lag7_pairs` on every metric row, and it is deliberately
**not** derivable from the other two diagnostics. A difference is zero when both endpoints are
closed **or** when two trading days happen to be equal, while the active basis drops a pair
when **either** endpoint is closed, so `total_lag7_diffs - zero_lag7_diffs` is not the active
sample size. At Ellel that subtraction suggests 101 pairs where the truth is 28. The
docstrings say so and a test pins it.

The constant is `harness.REPORTED_BASIS`, one place to change it.

# 4. Coverage now travels with width

Coverage was previously reported without the width that bought it. July W1 covered 7 of 7 days
at both venues:

| venue | coverage | mean width | Winkler |
|---|---|---|---|
| `beer_hall` | 1.000 | 1207.3 | 1207.3 |
| `ellel` | 1.000 | 283.0 | 283.0 |

Beer Hall's mean daily actual over that window is roughly 700, so the band is about 1.7 times
the level being predicted. Winkler equalling width exactly is the arithmetic signature of a
band no observation escaped: it earns no miss penalty and is scored purely on width. Full
coverage at that width is not evidence of calibration, and the previous output could not have
shown the difference.

# 5. Finding: a basis does not pin a scale, the store ceiling is the other half

Not in the spec, found while re-scoring June. The June figures do not reproduce from today's
store, and the cause is not the basis.

| venue | scale behind committed June | `calendar_lag7` today | June MASE then | now |
|---|---|---|---|---|
| `beer_hall` | 291.2 | 315.7 | 1.643 | 1.515 |
| `two_river_taps` | 150.3 | 150.3 | 1.182 | **1.182** |
| `ellel` | 181.4 | 180.1 | 0.485 | 0.489 |

**Two River Taps is a natural control.** It has been closed since 2026-05-08, so not one row
entered its series between the two runs, and both its scale and its MASE reproduce to the digit.
The other two moved because the store grew by five weeks of higher-variance summer trading and
the denominator grew with it. This simultaneously proves the reimplementation faithful and
isolates the movement to store growth rather than code.

The consequence is that "MASE on `calendar_lag7`" is still not a complete specification of a
number. It needs an as-of date. `harness.venue_ruler` now accepts `as_of` for this, unused by
default because S1's gates are defined on the full store, so nothing changes silently.

**The pin was verified to reconstruct the historical ruler exactly.** Pinning to the June
cutoff reproduces all three committed June figures to three decimal places:

| venue | scale implied by the committed figure | `as_of='2026-05-31'` | June MASE committed | reproduced |
|---|---|---|---|---|
| `beer_hall` | 291.2 | 291.2 | 1.643 | **1.643** |
| `two_river_taps` | 150.3 | 150.3 | 1.182 | **1.182** |
| `ellel` | 181.4 | 181.3 | 0.485 | **0.485** |

Getting Ellel to reproduce exposed a real edge in the semantics, worth stating because S3 will
hit it. `read_series(fill_calendar=True)` spans the venue's **own** first to last row, not the
store ceiling. Ellel's last trading day precedes 2026-05-31, so naively filtering the filled
calendar to the cutoff appends a tail of structural zeros that the original run never saw, and
the pinned scale came out at 183.0 rather than 181.3. `venue_ruler` therefore trims back to the
last trading day at or before `as_of`. An as-of pin is a statement about the data that existed
that day, not a slice of today's calendar.

**Pinning the confrontations to their own cutoffs is S3's environment work**, and this is the
concrete requirement, plus a working mechanism and a three-venue reproduction to check it
against.

# 6. The three zero-revenue trading days

The two ways of counting trading days differ by one Beer Hall day and two Ellel days: 302 and
68 rows in `l1_daily` against 301 and 66 days of non-zero net revenue. These are the three days
in the gap, and none is a data fault.

| venue | date | dow | lines | units | gross | discounts | net | cause |
|---|---|---|---|---|---|---|---|---|
| `beer_hall` | 2025-12-23 | Tue | 13 | 14 | 0.00 | -56.60 | 0.00 | every line fully comped |
| `ellel` | 2025-06-08 | Sun | 2 | 0 | 0.00 | 0.00 | 0.00 | one sale and its exact reversal |
| `ellel` | 2026-01-10 | Sat | 20 | 21 | 0.00 | 0.00 | 0.00 | every line item suffixed `(Voided)` |

They are three different things. Beer Hall 2025-12-23 is a **genuinely open trading day** - 14
units left stock and were served - whose revenue was comped to zero, two days before Christmas.
Ellel 2025-06-08 is a single Pale Ale rung at GBP 4.30 and immediately reversed at -GBP 4.30,
which is a mis-ring, not trade. Ellel 2026-01-10 is a batch of 20 voided lines: the till was
open, nothing was sold.

**Recommended definition for S4's occurrence gate: trading means non-zero net revenue**, the
301 / 66 count. The gate is `yhat = P(trade) x E[revenue | trade]`, and the conditional
expectation is undefined on a day with zero revenue whatever the cause, so a comped or voided
day is a non-event for the revenue hurdle even when staff were pouring. The cost is that Beer
Hall 2025-12-23 is classified as a non-trading day despite being open; at 1 of 302 days that is
acceptable, and it should be stated rather than hidden.

**This matters more at Ellel than the raw count suggests: 2 of 66 is 3.0 percent of the
series**, against 1 of 301 at Beer Hall. On a series that is already only 16.8 percent dense,
a 3 percent definitional wobble in the occurrence target is not negligible, and S4 should
resolve it explicitly rather than inherit whichever count the first query happens to return.

Note that S1's own `trading_lag7` and `trading_same_weekday` scales are computed on the 302 /
68 row-count series, which is what reproduces the G2 reference values. S4 may want the other
definition; if it switches, the trading-basis scales move and this report is the record of
which was used.

# 7. What changed

**One ruler.** `eval/harness.py` now holds the only L1 implementation:
`seasonal_naive_scale(y, *, basis, n_calendar_days=None)` with a required `basis` over four
documented values, no default, and `UnknownBasisError` on anything else. `same_weekday_lag`
derives the lag from the data rather than hard-coding it. `seasonal_naive_squared_scale`,
`rmsse`, `structural_zero_diffs`, a `VenueRuler` dataclass and `venue_metric_row` complete the
surface.

**Every call site now states its basis.** `mase`, `rmsse` and `point_metrics` take a required
keyword `basis`, so the twelve call sites across `models/ladder.py`, `hierarchy/reconcile.py`,
`transfer/lovo.py`, `signals/feature_ablation.py`, `eval/worldcup_fixture_probe.py`,
`eval/chronos2_covariate_probe.py`, `sim/score_l3.py`, `sim/g15c_taxonomy_drift.py` and
`sim/ab_split_measured.py` were updated to `basis="calendar_lag7"`. That is numerically
identical to what each computed before - `mean|y_t - y_{t-7}|` on the series it already passed
- so **no figure anywhere moves as a result of this change**. It was done rather than leaving a
hidden default inside `mase`, because a hidden default is the defect this package removes.

**Four private copies deleted**, all three confrontations emit the full metric set, and the
re-scores are written to **new** files (`*_confront_rescored.json`) so the pre-registered
`*_confront_result.json` records stay byte-identical (G5).

# 8. Deviations

**(a) The corrected G1 gate does not do what it says, in both directions.** The amended gate
`grep -rniE "def [_a-z]*(scale|denom)" brain/sim/ brain/eval/` returns five false positives in
`eval/agent_eval.py` (`build_scaled_corpus`, `scaled_detection`, `scaled_ranking`, `run_scaled`,
`_write_scaled_report` - agent-evaluation functions, nothing to do with denominators), and it
**misses the one function it was written to acknowledge**: `[_a-z]*` cannot match through the
digit in `_l2_actuals_and_scale`. Run as specified it would report a clean sweep that silently
excludes the flagged function. The gate actually run, and recommended as the standing one:

```
grep -rniE "def [A-Za-z0-9_]*(scale|denom)[A-Za-z0-9_]*\(" --include="*.py" .
```

which returns four definitions in `eval/harness.py`, `_l2_actuals_and_scale` in
`sim/cadence_sweep.py` (known, flagged, out of scope) and the five `agent_eval.py` names. A
`def`-based gate also cannot see an inline denominator, so it was paired with a search for the
lag-difference expression itself, which found exactly one, the flagged L2 one at
`sim/cadence_sweep.py:86`. No fifth implementation exists.

**(b) RMSSE is emitted twice, on both readings of a contradictory instruction.** The spec gives
the M5 formula, whose denominator is `(y_t - y_{t-1})`, and in the next clause requires the
denominator to be "computed in-sample on the same basis as the MASE scale". Those are different
instructions, so both are now reported and labelled. `rmsse` is primary and uses the basis's own
pairs, squared, because the argument being made is that MASE and RMSSE differ in **loss
function**, and that only holds if the ruler is shared. `rmsse_m5` is the literal M5 statistic,
so the examiner's question "is this M5's RMSSE" answers itself.

They are not close, and the gap is informative:

| venue, July W1 | `rmsse` (shared ruler) | `rmsse_m5` (lag 1) |
|---|---|---|
| `beer_hall` | 0.498 | 0.399 |
| `ellel` | 0.209 | 0.185 |

The M5 figure is the flattering one at both venues, because on a series with closed days the
lag-1 denominator is inflated by every open-to-closed transition, and a bigger denominator makes
the forecast look better. That is the same deflation pathology as `calendar_lag7`, arriving by a
different route, which is the reason it is the secondary figure and not the primary one.

**(c) `confront_june.stage2` cannot run and this predates S1.** It fails inside Chronos with a
future-frame timestamp mismatch. Verified to fail identically at `d40dea7` with the changes
stashed, so it is not introduced here. Cause: once the clock advanced to 2026-07-07 the June
rows became observed history, so `build_features` returns a frame that already contains the
target dates. S1 converts the vendor error into a stated precondition and records stage 2 as
`{"unavailable": "store-ceiling-advanced-past-forecast-origin"}` rather than emitting a wrong
number. Stage 1, the pre-registered cold forecast, is unaffected and re-scored in full. Logged
as FLAG-JUNE-STAGE2-UNRUNNABLE; it needs the pinned store from S3.

**(d) Two process errors of mine, recorded because they cost time and could recur.** First, the
two environment suites were launched concurrently, and DuckDB is single-writer, so both aborted
with IOExceptions and the counts were void. They must be run sequentially. Second, and worse,
that first run silently reset the store ceiling from 2026-07-07 to 2026-05-31 **between** my
verification of the reference scales and my next query, which is exactly the
FLAG-STORE-DURABILITY hazard already on record. It was caught only because the row counts moved
between two reads minutes apart. Every number in this report was taken after
`python -m sim.restore_clock` confirmed the clock, and the gate runs at the end were done on a
verified ceiling. The standing rule holds and deserves restating: **a full-suite run is a store
reset, so restore the clock before measuring anything.**

**(e) The spec's report-back block runs its steps in an order that invalidates its own
output.** It calls `python -m sim.restore_clock` and then `python -m pytest -q`, but a
full-suite run **is** a store reset, so the block restores the clock and then immediately
breaks it again, leaving the store at the 2026-05-31 seed and any subsequent reading wrong.
Run here in the opposite order: suites first, restore last, so the store is left at 2026-07-07.
Separately, `pytest -q` prints no summary line in this repo, because `pyproject.toml` already
sets `addopts = "-q"` and the second `-q` suppresses it; counts here were taken from
`--junitxml` instead, which is also how the 391/8 and 398/1 baselines were confirmed at HEAD
before any edit.

**(f) A review pass caught a real defect in the first cut of this package, and it is recorded
because the number it produced was wrong in the direction that flatters the recommendation.**
`scale_block` published `zero_lag7_diffs` and `total_lag7_diffs` side by side, which invites
the reader to subtract them for the active basis's sample size. That subtraction is wrong, and
at Ellel it overstates the sample by a factor of 3.6 (101 implied against 28 actual) - on the
very basis section 3 recommends S4 adopt. Fixed by publishing `active_lag7_pairs` directly,
documenting in both docstrings that the two populations differ, and pinning it with a test that
constructs a series where subtraction and the true count diverge. The same pass also removed
four imports left unused by the basis switch, renamed `n_trading` to `n_trading_horizon` in
`confront_june` (302 venue-history days and 25 June-horizon days were sitting one character
apart in the same flat dict), and dropped `band_coverage_at_90` from the W2 rescore, where it
duplicated `empirical_coverage` exactly.

**(g) `brain/store/manifest.json` was restored to HEAD twice.** `restore_clock` rewrites its
`ingested_at` timestamps and reformats two JSON arrays on every run, while `rows_inserted`,
the ceilings and the venue lists stay identical. It is not a frozen artefact and does not trip
G5, but committing timestamp churn would add noise to a diff whose whole subject is
reproducibility.

# 9. Gates

| gate | result | evidence |
|---|---|---|
| **G1** | PASS | `grep -rn "_seasonal_scale" sim/` returns nothing; anchored sweep returns only `harness` plus the flagged L2 function; inline sweep finds only `cadence_sweep.py:86` |
| **G2** | PASS | 12 of 12 assertions: eight scales within 0.5, both same-weekday lags, both structural-zero counts (78/392, 284/385) |
| **G3** | PASS | 0.772 / 0.385 / 0.534 / 0.629 against 0.771 / 0.385 / 0.533 / 0.629, max delta 0.001, tolerance 0.005 |
| **G4** | PASS | `.venv` 391 -> **415** passed, 8 skipped unchanged; `.venv-forecast` 398 -> **422** passed, 1 skipped unchanged. 24 new tests, none removed |
| **G5** | PASS | `git status --porcelain` matches nothing on `frozen`, `origin_a`, `origin_b` or `*_confront_result.json` |
| **G6** | PASS | ceiling 2026-07-07, 25 June days, 7 July W1 days, 0 held-out rows |

No stop condition fired. The fourth-implementation condition was raised before any edit and the
scope was amended before work began.

# 10. What this hands forward

- **S3** gets a concrete requirement: pin each confrontation's ruler to its own cutoff via
  `venue_ruler(as_of=...)`. Section 5 is the evidence that an unpinned scale is not
  reproducible, and Two River Taps is the control that isolates the cause.
- **S4** gets two: adopt `calendar_lag7_active` as the reported basis once the ladder can be
  re-scored on it (section 3), and resolve the definition of "trading" for the occurrence gate,
  where 2 of Ellel's 66 days are in dispute (section 6). FLAG-L2-DENOMINATOR is also assigned
  there.
- **The dissertation** must not quote 0.386 as live outperformance. The defensible sentence is
  that the pre-registered July W1 forecast scored 0.772 against a backtest of 0.745 on one
  stated ruler, and that all three windows are now scored on all four bases so the reader can
  see what the choice is worth.
