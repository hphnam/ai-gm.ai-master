# Report 34 - G14b: defect closure, with a verdict

Date: 2026-07-17. Scope: commit `872eb6c` and the round that followed it, closing the
defects raised against Phase 3 (`52a3864`, report 33). Report 33 is the narrative; this is
the ledger and the verdict.

---

## Verdict

**Every defect raised is closed and the closure is measured, not asserted. But the number
to take away is not the count of defects — it is that THREE consecutive rounds of my own
fixes each contained a defect as bad as the one being fixed, and review found all three.**

| | |
|---|---|
| Defects raised across four review rounds | **22** |
| Closed, re-measured | **20** |
| Closed but only checkable by reading (a doc, a symbol split) | 2 |
| Open **by design**, as a research work package | **1** (FLAG-BAND-HORIZON) |
| Handed to the caller as a contract obligation | **1** (ingress body limit) |
| **Fix rounds that contained a wrong fix** | **3 of 3 reviewed** |
| Rounds where the wrong fix was *worse* than the original | **2 of 3** |

The three:

1. **The `exo_is_dry` fix** made train and serve agree — on the wrong value.
2. **The DoS fix** turned a 17-minute hang into a 0.4-second wrong answer.
3. **The guard for *that*** rejected `2202` and accepted `2027`. Replacing it with an
   absolute future bound then rejected every forward typo and accepted **every backward
   one** — and a backward typo is worse: `2026 → 2016` makes `rung1_robust_dow` return
   **£0.00 across the horizon**, banded, with the served model's name on it, no error.

Each fix was plausible, confidently documented, tested, and **measured only against the
case that motivated it**. §2.3 of this report named that signature — and the third
instance was committed in the same commit as the diagnosis.

The system that worked was not care. It was **review, run against the fixes rather than
the code**, and **measurement of the fix's own blast radius** rather than of the case that
prompted it.

---

## 1. The ledger

Re-measured against the tree, not recalled — every wrong fix below passed its own tests.

| ID | Defect | Verdict | Evidence |
|---|---|---|---|
| C1 | `exo_is_dry` inverted between train and serve | **CLOSED** | `train=[1.0] serve=[1.0]`, and 0.0mm rain now reads dry |
| C2 | band calibrated on ≤7 steps, applied to day 30 | **CLOSED BY REFUSAL** | `8, 30 → 422`; `7 → 7 days`. Method limit stays open, §3 |
| C3 | forward frame omitted 13 columns; `rung3_gbm` raised `KeyError` | **CLOSED** | 7 rows |
| C4 | `exo_enabled` gated the horizon frame only | **CLOSED** | `train wc=0 serve wc=0` |
| C5 | calibration floor checked on the pool, then Mondrian-split | **CLOSED** | `Mondrian group(s) [1] have fewer than 30 residuals; those days fall back to the marginal band`, and 14 bands still issued |
| C6 | bound profile + unknown slug fell back to Lune's Mon/Tue | **CLOSED** | raises `KeyError`, naming the profile |
| C7 | future-dated typo silently moved the forecast origin | **CLOSED** | `+1y / +5y / +10y / +176y / whole-export` all refused |
| C8 | unbounded history span → unbounded re-fits | **CLOSED** | 12 predictor calls, 0.1s (was ~9,272 / 17min+) |
| C9 | caller-controlled dimensions unbounded | **CLOSED** | `PriorState` / `country` / `venues` capped; `"IE"` still valid |
| C10 | fields nothing reads (`timezone`, `currency`, `vat_*`) | **CLOSED** | all → 422 |
| C11 | `ServedRow.rung` always `None` | **CLOSED** | `rungs=[0, 1, 2]` |
| C12 | unknown-covariate diagnostic unbounded | **CLOSED** | 642 chars (was 3,384 and rising with input) |
| C13 | exception internals on the 200 path | **CLOSED** | hardened → `forecast failed (ValueError)` |
| C14 | `MAX_HORIZON_DAYS` aliased as both serving cap and calibration block | **CLOSED** | split to `_CALIB_BLOCK_DAYS`, guarded by a `raise` |
| C15 | `event_venue_dates` recomputed per venue (venue-independent) | **CLOSED** | computed once per request and passed |
| C16 | `MAX_SALES_ROWS` set above the failure point | **CLOSED (partial)** | 547,500, derived from `MAX_VENUES`; the real guard is ingress — §3 |
| C17 | report §9/§10 contradicted §7 of the same report | **CLOSED** | reconciled |
| C18 | **past**-dated typo silently zeroed the forecast | **CLOSED** | `-1y / -5y / -10y / -176y` all refused; §2.4 |
| C19 | `MAX_SALES_ROWS` and `MAX_VENUES` contradicted by 10x | **CLOSED** | derived from one another: 25 venues x 730d x 30 rows |
| C20 | `assert` guarding the band cap vanishes under `python -O` | **CLOSED** | `raise RuntimeError` |
| C21 | poisoned `prior_state.watermark` round-tripped for ever | **CLOSED** | validated even when `sales_daily` is empty |
| C22 | truncation marker fired on any list of 10 | **CLOSED** | flag set only when the cap actually bit |

---

## 2. Three of the fixes were wrong

This is the part worth reading.

### 2.1 The DoS fix made the bug more dangerous

The security review framed the typo'd year as a denial of service: ~9,272 model re-fits
from a two-row request, 17 minutes. Bounding the calibration walk fixed exactly that, and
in doing so turned a **17-minute hang into a 0.4-second wrong answer**.

`trim_to_active` trims only *zero* endpoints, so a nonzero row dated 2202 survives,
becomes `feats["date"].max()`, and takes the forecast origin with it:

```
real history ends : 2026-07-19
ONE typo'd row at : 2202-01-15
forecast is for   : 2202-01-16 .. 2202-01-22
watermark returned: 2202-01-15
```

Seven banded, model-named rows for January 2202. A hang gets investigated. This gets
persisted.

### 2.2 The guard for *that* was also wrong — and both reviewers found it independently

I added a check on the history **span**, and wrote in its docstring: *"This is not a size
check wearing a date's clothing."* It was precisely that.

| typo | span guard | result |
|---|---|---|
| `2026 → 2027` | **accepted** | forecasts 2027-01-16..22, watermark 2027-01-15 |
| `2026 → 2036` | **accepted** | forecasts 2036-01-16..22, watermark 2036-01-15 |
| `2026 → 2202` | rejected | — |
| whole export stamped 2202 (span 199 days) | **accepted** | forecasts 2202-07-20..26 |

It caught the single case it had been measured against and missed the likelier ones. A
one-digit slip is one keystroke; `2202` is two. And a *systematically* mis-stamped export
— every row shifted, span a perfectly ordinary 199 days — is invisible to a span check
**by construction**.

Span is a relative measure of a failure that is absolute. The right invariant was sitting
in the contract the whole time: **`sales_daily` is closed history**, so any row dated
after today is a typo whatever the span. `MAX_FUTURE_DAYS` (7 days' slack for
business-date/UTC boundaries) catches all four; `MAX_HISTORY_DAYS` is demoted to the cost
knob it always was.

It compounds, which is why it earns this much text: the API persists the poisoned
watermark and hands it back as `prior_state.watermark` next call, so the cadence stays
wrong after the bad row is gone.

### 2.3 And the guard for *that* was one-sided

The absolute future bound was right about the instrument and wrong about the scope. My
own argument — *"a one-digit slip is likelier than 2202"* — is **symmetric**. The fix was
not. `2026 → 2016` is exactly as much a one-keystroke slip, spans 3,653 days, sits under
the 7,320-day cost knob, and **postdates nothing**.

Measured, one such row added to an otherwise clean 200-day history:

```
rung1_robust_dow   clean       yhat=[300.0, 350.0, 400.0, 100.0, 150.0, 200.0, 250.0]
rung1_robust_dow   2016 typo   yhat=[  0.0,   0.0,   0.0,   0.0,   0.0,   0.0,   0.0]
```

Seven rows of £0.00, fourteen conformal bands, the right watermark, the served model's
name on them, and no error. **Worse than the future case**, which at least announces
itself with an absurd date: this is a plausible zero for a live venue — the "£5,329 for a
dead venue" failure the liveness gate exists for, running backwards. `rung1_robust_dow`
is not hypothetical; it is Ellel's served model.

Mechanism: `read_series(fill_calendar=True)` densifies 2016–2026 into ~3,840 daily rows,
~3,450 of them fabricated zeros. `trim_to_active` trims to *first-nonzero..last-nonzero*
— and the typo row **is** nonzero, so it becomes the start and the zeros sit in the
*middle* of the frame, where nothing trims them. A robust per-DOW median over a span
that is 90% zeros is zero. My own commit message states the premise ("trim_to_active
trims only ZERO endpoints") and then applies it in one direction only.

### 2.4 Why the third fix is not a fourth mistake

The obvious repair — reject long holes — is the same error again, and the tests caught it
twice:

- **The 365-day near-miss.** `2026 → 2025` is the likeliest past slip of all and produces
  a gap of *exactly* 365 days. It slipped a `> 365` threshold by one day. Tuning the
  number would have been fitting the guard to the example in front of me for the third
  time.
- **The seasonal venue.** A beach bar shuts for six months every year. For *it* the
  calendar-filled zeros are **correct** — it really did take nothing in February, and a
  model that learns that is right. Any rule refusing year-long holes refuses a whole
  business model to catch a fat finger.
- **The cold start.** An earlier cut applied a minimum-segment size to a dataset with one
  segment, and refused a brand-new tenant's ten days of data as "stranded from the rest of
  the history" — where it *was* the history. That is the first thing a new org hits.

What actually separates a typo from a season is **isolation**: a season leaves two large
blocks; a fat finger leaves a speck and a continent. The dataset is split into segments at
gaps wider than a quarter, and a segment too small to be a trading period is the fault.
Verified across both directions and the three legitimate patterns:

| case | verdict |
|---|---|
| typo +1y / +5y / +10y / +176y | refused |
| typo −1y / −5y / −10y / −176y | refused |
| whole export mis-stamped | refused |
| clean 200d · clean 2 years | accepted |
| new tenant, 10 days | accepted |
| refurb (60d gap) · seasonal (2×150d, 215d apart) | accepted |

### 2.5 The shape they share

All three wrong fixes had the same signature:

- **plausible**, and confidently documented — one docstring denied the exact flaw it had;
- **tested**, and the tests passed;
- **measured against only the case that motivated them** — 2202, never 2027; forward,
  never backward.

The `exo_is_dry` fix is the cleanest specimen. It made train and serve agree — on `0.0`
for 0.0mm rain, which is *wrong*. A test asserting `train == serve` passes both before
and after. That is why `test_dry_weather_actually_reads_as_dry` now sits beside it: the
first test checked the property I had reasoned about, not the property that mattered.

---

## 3. Deliberately not closed

**FLAG-BAND-HORIZON — open, as a research work package.** The band is calibrated on
7-day rolling blocks, so every residual is a ≤7-step-ahead error. Measured, pooled 90%
band applied across steps:

| step | 1 | 7 | 14 | 21 | 30 |
|---|---|---|---|---|---|
| pooled coverage | 100.0% | 96.2% | 84.6% | 88.5% | **80.8%** |
| per-step coverage | 96.2% | 96.2% | 96.2% | 96.2% | **96.2%** |

Per-step calibration demonstrably fixes it. It is **not adopted**, and that is the
verdict rather than an omission: it changes the banding *method*, and this project adopts
a method only when it beats a gate on held-out folds. Inventing one inside an integration
phase is the move the ladder exists to prevent. `horizon_days` is capped at 7 — what
every result here evidences — so the defect is closed *operationally* while the
methodological limit stays open, measured, and named.

**The ingress body limit — the caller's.** A row cap bounds model construction — measured,
pydantic 2.13.4 builds `max_length + 1` and stops — but not the body: the JSON is parsed
into a list of dicts before any model exists. The cap is now low enough to mean something
(547,500 rows — derived as 25 venues × 2 years × 30 rows/venue-day, measured at 29.2 on
this project's own store), but the real guard is a request-size limit at the ingress.
Contract obligation 9.

---

## 4. What the rounds cost

| round | reviewed | defects found | of which: a previous fix was wrong |
|---|---|---|---|
| 1 | Phase 3 (`52a3864`) | 7 code + 3 security | — |
| 2 | round-1 fixes | 4 code + 4 security | **2** (span guard; band diagnostic) |
| 3 | round-2 fixes (`872eb6c`) | 5 code | **1** (the one-sided date bound) |
| 4 | round-3 fixes | not yet run | — |

Yield is not falling as fast as it should. Three observations worth keeping:

- **Reviewing the fixes mattered more than reviewing the code.** Round 2 found a defect
  (the span guard) that was strictly worse than the one it replaced, because the
  replacement looked like diligence.
- **Two of the sharpest findings came from neither the code nor the review, but from
  asking what the *fix* made possible.** Capping `values` at 64 keys made a multi-gigabyte
  diagnostic reachable; the report's own §9/§10 went stale the moment §7 was written.

---

## 5. Evidence

**The research path is untouched.** Training frames hashed with contents *and* column
order (tree split ties break on feature index), before and after, on the restored store:

| Venue | rows | cols | sha256[:16] |
|---|---|---|---|
| `beer_hall` | 399 | 40 | `59c83586f06c8359` |
| `two_river_taps` | 331 | 40 | `fb388ce32d02fdab` |
| `ellel` | 386 | 40 | `a3c110bbc72be722` |

Identical to the pre-Phase-3 baseline. Nothing in three rounds of fixes moved a Lune
number.

**C2 re-scores clean** (store at 2026-07-07, held-out window 0 rows): BH L1 MASE
**0.285** (A) / **0.287** (B), coverage 1.00, `generalises: False`. Recorded with the
standing caveat from report 33 §8: `confront_july_w2` re-scores a **frozen artefact** and
does not regenerate the forecast, so it validates the store and the scoring — the frame
hashes are what cover generation.

**Suites:** `.venv` **379 passed / 8 skipped**; `.venv-forecast` **386 / 1** (from 307/8
and 314/1 at the start of Phase 3). `.venv-eval` still imports the seam. Tree ruff **70** (from 71);
the new files are clean. A `ruff --fix` over `tests/` briefly showed 62 by fixing seven
files Phase 3 has no business in — reverted, and 70 is the honest number.

---

## 6. What a reader must not conclude

- **Not** that the engine is multi-tenant-ready. Compute emits **L1 only**, the ladder
  **never re-runs** (`ladder_selection` is `[]` on every call, so a tenant's served model
  is whatever it started as), and `stock_enabled` is accepted and reported unhonoured.
  Contract open decisions 4-7.
- **Not** that "13 closed" means the code is correct. It means thirteen specific claims
  were measured. Both wrong fixes in this work package passed their own tests — and C5
  sat in the first draft of this table marked CLOSED **with no test at all**, on my
  inspection alone, which is the same error this report is about. It has one now.
- **Not** that the band is valid past a week. It is refused past a week, which is a
  different and weaker statement.
- **Not** that the isolation claim rests on tests. It rests on compute holding no
  connection — and, as review noted, on an **absence**: there is no `ThreadPoolExecutor`
  or `multiprocessing` anywhere in the analytics, and a bare `threading.Thread` would
  start with an empty context and fall back to Lune's real store.
