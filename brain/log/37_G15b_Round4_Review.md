# Report 37 - G15b: round 4, the review that had not been run

Date: 2026-07-19. Scope: the round-3 fixes, committed in `872eb6c` and after, reviewed
against the method that caught the previous three. Report 34 recorded them as unreviewed
and called it a real residual risk rather than a formality. It was right.

## Verdict

**Round 4 is not clean.** Two defects, one of them severe, plus three lesser findings.

The severe one is the same shape as the three that preceded it: a fix that was correct
in its reasoning, documented at length, tested, and **measured only against the case
that motivated it**. It did not survive being measured against anything else.

| # | Defect | Verdict | Evidence |
|---|---|---|---|
| D1 | Isolation guard applied to POOLED request dates, not per venue | **CONFIRMED, severe** | identical typo REJECTED at 1 venue, ACCEPTED at 2; 64 sibling rows defeat it |
| D2 | `_CALIB_BLOCK_DAYS` guard asymmetric | **CONFIRMED** | raising the other symbol changes the banding method with no raise |
| D3 | `MIN_SEGMENT_DAYS` false-rejects legitimate venues | **CONFIRMED, left open** | reopening at 13 days REJECT, pop-up REJECT |
| D4 | Isolation message calls legitimate data a typo | **CONFIRMED, fixed** | "a mistyped year, not a trading period" |
| D5 | `PriorState` bounds the LIST, not the CONTENT | **CONFIRMED, not implemented** | 100 MB `briefing_chain` accepted, echoed verbatim |
| D6 | Decision log's `MAX_SALES_ROWS` figure stale | **CONFIRMED, documentation** | log says "now 200k", code and report 34 say 547,500 |
| - | `country` per-venue amplification | **NO DEFECT** | bounded by the venue cap, as claimed |
| - | `MAX_FUTURE_DAYS` under a non-UK caller | **NO DEFECT** | 7 days absorbs every real offset |
| - | `event_venue_dates` hoisting | **NO DEFECT** | once per request, as claimed |

**Four rounds, four rounds with hits.** The yield curve has not turned over. That is the
finding this report exists to record, and it is worth more than any individual defect
below: the project cannot yet claim its fixes are converging.

---

## D1. The isolation guard did not fire on any real org

**Severity: severe.** This is the round-3 fix's headline defect, and it means the guard
built to stop a poisoned forecast **did not operate on Lune's own estate**.

### The reasoning, and where it stopped

Every word of the round-3 argument is about one venue's history:

> "it becomes `active_trading_start` and buries the real history under years of
> fabricated zeros, and a robust per-DOW median over that is 0.00"

That is right, and the harm really is per-venue: `read_series`, the calendar fill,
`trim_to_active` and the whole feature build run on **one venue's series**. But the check
was applied to `sorted({r.date for r in self.sales_daily})` - **the dates of the whole
request, pooled across every venue.** `_segments` never reads `row.venue`.

### Measured

The identical typo row, an otherwise clean 200-day history, varying only what else is in
the request:

| Request | Verdict |
|---|---|
| single venue + one 2016-typo row | **REJECT** (the fix works) |
| + a sibling venue spanning 2016 to today | **ACCEPT** (the fix is gone) |
| + a sibling of **one row every 60 days**, 64 rows total | **ACCEPT** |

Directly on the helper, same typo:

```
_segments on the venue's own dates : 2 segments, sizes [1, 200]   -> caught
_segments on the pooled dates      : 1 segment,  size  [3852]     -> invisible
```

**Sixty-four rows defeat it**, and they do not have to be real trading - only enough to
keep every individual gap under `MAX_DATA_GAP_DAYS`. Any multi-venue org gets this for
free from its own normal data. Lune has three venues; the contract allows 25.

So the round-3 fix protected exactly one configuration: a single-venue org. Report 34
closed it as measured and tested, and both were true, against that one configuration.

### Fixed, and the fix's own blast radius measured

`_reject_implausible_dates` now segments **per venue**, which is the grain the harm has.

Closes the hole:

| | before | after |
|---|---|---|
| single venue + typo | REJECT | **REJECT** |
| + full sibling | ACCEPT | **REJECT** |
| + 60-day bridge sibling | ACCEPT | **REJECT** |

**What my fix made possible, stated rather than discovered later.** Pooling was also
giving intermittent venues accidental cover. Removing it removes that too:

| | before | after |
|---|---|---|
| pop-up venue + a continuous sibling | ACCEPT | **REJECT** (regression) |
| reopened venue + a continuous sibling | ACCEPT | **REJECT** (regression) |

Both regressions are instances of D3 below, which is open. The fix does not create a new
class of false reject; it removes an accidental mask from an existing one, and the mask
was masking the true positives too.

Nothing else moved:

| Case | Verdict |
|---|---|
| clean single venue | ACCEPT |
| clean multi venue | ACCEPT |
| seasonal, two 120-day blocks 380 days apart | ACCEPT |
| cold start, 10 days, one segment | ACCEPT |
| three venues, all clean, staggered starts | ACCEPT |

Cost at the contract cap (547,500 rows across 25 venues): **0.31 s, 5 MB peak**. The
extra pass is one dict-of-sets build over rows already materialised.

Tests: `test_a_mistyped_year_is_still_refused_when_a_sibling_venue_spans_the_gap`,
`test_a_sparse_sibling_is_enough_to_have_defeated_the_pooled_guard`,
`test_the_isolation_error_names_the_venue_it_is_judging`. All three **fail against the
pre-fix code and pass after** - verified by stashing the fix and re-running.

---

## D2. The band-calibration guard was asymmetric, exactly as the spec predicted

**Severity: moderate.** The round-3 fix split `_CALIB_BLOCK_DAYS` from
`MAX_HORIZON_DAYS` precisely so that raising the serving cap could not silently change
the banding method. The guard it shipped with:

```python
if MAX_HORIZON_DAYS > _CALIB_BLOCK_DAYS:
```

| Path | Check | Result |
|---|---|---|
| `MAX_HORIZON_DAYS` 7 to 30 (the path that was tested) | `30 > 7` | raises |
| `_CALIB_BLOCK_DAYS` 7 to 30 (the symmetric path) | `7 > 30` | **no raise** |

On the second path `rolling_point_forecasts(horizon=30)` rebuilds the residual stream
from 30-day blocks, so every residual becomes a 30-step error and **the banding method
changes under an unchanged 7-day horizon** - the exact side effect the split was created
to make impossible, reached from the other symbol.

It is the quieter of the two directions: the drift is toward **over**-coverage, split
conformal's safe failure mode, so no test fails, no coverage gate trips, and nothing
looks wrong. A method change that announces itself is a smaller problem than one that
does not.

**Fixed** to `!=`. The two symbols are only in a defensible state when they agree, and
equality has no asymmetric case to miss. Test: `test_the_band_calibration_guard_is_symmetric`
probes both `original + 1` and `original - 1`; it fails against the pre-fix guard on the
`- 1` arm.

---

## D3. The guard refuses businesses that are neither a season nor a speck

**Severity: moderate. Left OPEN deliberately.**

The round-3 argument rests on "a season leaves two large blocks, a fat finger leaves a
speck and a continent". The spec asked for the shape that is neither. There are at least
two, and both are ordinary hospitality:

| Shape | Verdict |
|---|---|
| reopened after 8 months with 21 days of trade | ACCEPT |
| **reopened after 8 months with 13 days of trade** | **REJECT** |
| **reopened after 8 months, day 1 back** | **REJECT** |
| **pop-up trading 4 days a quarter** | **REJECT** |

A venue that genuinely reopens is refused for its first 13 trading days, **and the whole
org's request fails with it** - the validator raises on `ComputeDataset`, so one
reopening venue takes down the forecast for every sibling in the request.

The cold-start carve-out does not help: it is `if len(segments) == 1`, and a reopening
venue has two by construction.

### Why it is not fixed

The obvious fix is to exempt the **trailing** segment, since a reopening is always at the
end of the history. Measured against the case it would let through, it fails: a venue
whose real history ended months ago **plus one mistyped recent row** is also a one-day
trailing segment. Exempting it restores forecast-origin poisoning and, worse, **relights
a dormant venue** - the "GBP 5,329 forecast for a dead venue" failure the liveness gate
exists for, arriving through the front door.

A day-1 reopening is **genuinely indistinguishable from a typo from inside a single
request**. The information that separates them - does this venue keep trading tomorrow -
is not in the dataset. Any discriminator built here would be the fourth version of the
same mistake: fitting the guard to the example in front of me.

So it is recorded as a known limitation, pinned by a test that asserts the current
behaviour and says what would be required to change it
(`test_a_venue_reopening_after_a_long_closure_is_refused_a_known_limitation`), and
flagged as FLAG-SEGMENT-FALSE-REJECT. An honest open item beats a change that cannot be
defended.

## D4. The message told legitimate callers their data was wrong

**Fixed.** The round-3 message read:

> "A fragment that small and that far out is a mistyped year, not a trading period"

Shown to a venue that legitimately reopened, that is **false and unactionable**. The
message now names the venue it is judging (with 25 venues in a request, "somewhere in
`sales_daily`" is not a finding anyone can act on), says "most often this is a mistyped
year" rather than asserting it, and states the reopening limitation explicitly as a
limitation rather than a judgement about the caller's data.

## D5. `PriorState` bounds the list and not the content

**Severity: moderate. CONFIRMED but deliberately NOT implemented - stop condition.**

Round 3 bounded `PriorState` because `served_model` was one INSERT per key and
`briefing_chain` took 200,000 entries. The caps landed on the **containers**:

```python
briefing_chain: list[dict] = Field(max_length=MAX_BRIEFING_CHAIN)      # 1,000
change_point_state: dict[str, dict] = Field(max_length=MAX_VENUES)     # 25
```

The elements are `dict` with no bound at all. Measured:

| Payload | Verdict | Size accepted |
|---|---|---|
| `briefing_chain`, 1,000 entries x one 100 KB string | **ACCEPT** | **100.0 MB** |
| `change_point_state`, 25 venues x one 100 KB string | **ACCEPT** | 2.5 MB |

And `contract.py` states that both are **echoed verbatim into `ComputeBundle`**, whose
fields carry no `max_length` at all - so the payload is accepted, held, and handed back.

This is the same shape as the sharpest finding of round 3, which came from asking what a
fix made possible: capping `values` at 64 keys is what made a multi-gigabyte diagnostic
reachable. Bounding a list while leaving its elements free is that lesson half-applied.

**Not implemented, per the G15b stop condition.** `PriorState` is state the API
round-trips from its own store, so a new size rule could reject the API's own persisted
state - a change Ryan would have to build against, on a contract he has not built against
yet. A moving contract is worse than a known defect. Recorded here, in `FLAGS.md`
(FLAG-PRIORSTATE-CONTENT-UNBOUNDED) and in the decision log, as input to the contract
sync rather than a unilateral tightening.

## D6. The decision log's `MAX_SALES_ROWS` figure is stale

**Documentation only.** Decision-log row 22(k) says `MAX_SALES_ROWS` "is now 200k". The
code says **547,500** and report 34's C19 says it was subsequently re-derived as
`MAX_VENUES x 730 days x 30 rows/venue-day`. The derivation superseded the 200k figure
and the log row was never updated.

Measured, so the current cap has a number attached rather than an argument: `SalesRow`
costs **1,105 B** constructed, so the cap admits **~0.60 GB** of models. `contract.py`
already says the real guard is an ingress body limit and names it as the API's
obligation, so C16's "CLOSED (partial)" is honest. Row 24 of the decision log carries
the correction and a forward pointer; the original row is not edited.

## Findings that did not survive contact

Recorded because a review that only reports hits is not a review.

**`country` amplification is bounded by the venue cap, as claimed.** `country` is
`min_length=2, max_length=2` and is echoed once per venue in `_future_frame`'s
diagnostic; `_live_venues` iterates `dataset.org_profile.venues`, which is
`max_length=MAX_VENUES`. Worst case 2 x 25 = 50 characters. Both bounds enforced under
test. **No defect.**

**`MAX_FUTURE_DAYS` survives a non-UK caller.** Seven days of slack against a maximum
real business-date-versus-UTC offset of about one day. A UTC+13 caller's "today + 1" is
accepted, "today + 8" is refused. Removing `timezone` from the profile does not interact:
the brain works at date grain and the API resolves business dates before aggregating.
**No defect.** One observation, not a defect: the validator calls `date.today()`, so a
fixed dataset changes verdict over wall-clock time and there is no frozen-clock seam for
a replayed request or a recorded test fixture. Noted for the contract sync.

**`event_venue_dates` really is hoisted.** Computed once per request in `_compute` and
passed into `_forecast_venue`. **No defect.**

---

## Acceptance gates

| Gate | Status |
|---|---|
| Every finding re-measured, not asserted | PASS. Every verdict above has a measurement; the three D1 tests and the D2 test were verified to FAIL against the stashed pre-fix code |
| Any fix measured for blast radius before being called closed | PASS. D1's two regressions found and reported by the same method that found D1 |
| Both suites green | PASS. `.venv` **385 passed / 8 skipped** (was 379/8), `.venv-forecast` **392 / 1** (was 386/1). Delta **+6 / +6**, all six the new round-4 tests |
| Frame hashes unchanged | PASS (`8c8a8be9d8dc5791` / `b6339032a219213c` / `ea28bcacbf1825e4`) |
| C2 re-scores 0.285 / 0.287, coverage 1.00 | PASS, `generalises: False`, store ceiling 2026-07-07, 0 held-out rows |
| Round-4 row added to report 34's cost table | PASS |
| If round 4 finds nothing, say so plainly | N/A. It found two |

## Stop conditions applied

- **D5 hit "a finding requires changing the contract's shape in a way Ryan would have to
  rebuild against."** Recorded, not implemented.
- **Nothing landed in the re-fit path**, `_should_refit`, `RETRAIN_CADENCE_DAYS` or
  `ladder_selection`. Decision 6 untouched.
- **FLAG-BAND-HORIZON not touched.** D2 tightens the guard that keeps the banding method
  from changing; it does not change the method. Per-step conformal remains unadopted.

## Deviations

**(a) Two fixes were written, not zero.** G15b is framed as a review, and the safest
reading would have been to record and stop. D1 was implemented because the harm is
active rather than latent - the guard does not fire on any multi-venue org, which is
every real one - and because the change is validation logic behind an unchanged wire
shape, so it is not a contract change Ryan rebuilds against. D2 was implemented because
it is a strictly tighter guard on a symbol pair with no legitimate unequal state.

**(b) D3 was found and deliberately left broken.** The measurement is in hand and the
fix is not, because every candidate reopens a worse hole. Given three consecutive rounds
of fixes that were each worse than the defect, shipping a fourth on reasoning alone is
the failure mode, not the remedy.

**(c) FLAG-STORE-DURABILITY fired twice more during this package**, both times as
expected from running the full suites, both times restored and re-verified before any
gate was read. The narrowed trigger recorded in decision row 22(k) is accurate.

## Reproduction

```
.venv/bin/python -m pytest tests/test_compute_engine.py     # 52 passed
.venv/bin/python -m pytest                                  # 385 passed, 8 skipped
.venv-forecast/bin/python -m pytest                         # 392 passed, 1 skipped
.venv-forecast/bin/python -m sim.restore_clock              # the suites reset the clock
.venv-forecast/bin/python -m sim.frame_hash                 # PASS
.venv-forecast/bin/python -m sim.confront_july_w2           # 0.285 / 0.287, coverage 1.00
```
