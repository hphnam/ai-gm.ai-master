# PRJ93 Live-Ingest Fixes: Cross-Venue Append and Exact Dual-Layer Weather: Report (v1)

**Status: BUILT.** Both defects the June 2026 World Cup live probe surfaced are fixed, tested, and verified on `main`. Part A is a data-integrity fix to the T2 append. Part B makes the incremental weather pull real, lands exact weather into both the modelling and reasoning seams, and makes a missing-weather span a loud, visible state instead of a silent gap that fooled the honesty check.

This report is honest about what changed, what the fix proved, and where the original spec's framing needed correcting against the actual code (section 7).

---

## Part A: the cross-venue append bug

**Defect (confirmed).** `refresh._append_transactions(con, venue, rows)` filtered candidate rows by date only (`rows[rows["date"] > cur_max]`), not by venue. When `rows` carried more than one venue, or the store was fresh with venues at different date ceilings, one venue's rows passed through gated by another venue's ceiling and could be inserted under the wrong watermark or duplicated. The probe had to work around this by driving the append through a single venue.

**Fix.** Scope the candidate rows to the target venue before the date filter:

```python
if "venue" in rows.columns:
    rows = rows[rows["venue"] == venue]
cur_max = ...MAX(date) WHERE venue=?...
new = rows[rows["date"] > cur_max] if cur_max is not None else rows
```

The append is now strictly venue-local and idempotent regardless of what `rows` contains. The per-venue `cur_max` is unchanged.

**Regression test (`tests/test_append_cross_venue.py`, closes the coverage gap).** The earlier idempotence gate (G-live-d) only exercised the single-venue path. The new test lands a two-venue frame into a store whose venues sit at different ceilings (beer_hall at 2026-05-31, ellel at 2026-05-20) and asserts:
- appending the lower-ceiling venue (ellel) does **not** pull the other venue's new-dated row;
- each venue receives only its own rows;
- a second pass is a clean no-op with no duplicates.

The first assertion is exactly the bug: before the fix, appending ellel (ceiling 2026-05-20) would insert a beer_hall 2026-06-01 row because that date is beyond ellel's ceiling.

---

## Part B: exact incremental weather, into both layers, failing loudly

### B0/B1. Incremental pull (`exog_weather.build`)

**Defect (confirmed, and a correctness bug not a transient).** `build()` skipped any already-populated basis table (`if exists and not force: continue`). Once `exog_weather_observed / _hindcast / _leadmatched` existed, it never extended them to new dates, so every T2 `_auto_exog` after the first was a silent no-op. The probe's consequence: the brain returned "no coincident weather signal" for the June spikes while holding no June weather, so that null was true by construction, not a real check.

**Fix.** `build()` is now INCREMENTAL by default. Per (cell, basis) it reads the table's current max date and pulls only the gap from there to the store's data max (via `_cell_span`, not a fixed constant), then appends. `force=True` remains the full drop-and-rebuild repair hatch. Sources per basis are unchanged: `observed` = ERA5 archive (realized closed-day weather), `hindcast` = historical-forecast (train/serve-consistent), `leadmatched` = previous-runs (forecast as issued). Added helpers `coverage()`, `_required_ends()`, and `weather_gap()`.

Verified on the probe's June-augmented store: each basis extended by 29 rows (2026-06-01 to 06-29) for the `lancaster` cell; `weather_gap` cleared from three entries to empty. The closed `trt_south` cell (required end 2026-05-08) was correctly left untouched (already covered, no pull).

### B2. Both seams populated for the new dates

- **Reasoning / attribution seam** (`exog_weather_leadmatched`, read by `residual.attribute`): after B1 it covers the new dates, so attribution on a new day is a real check.
- **Modelling / features seam** (`hindcast`, read by `features.build_features._attach_exog`): after B1 the join carries real `exo_temp_c`/`exo_rain_mm` for the new span. Verified: Beer Hall June features now carry non-null weather on all 29 June trading rows.

### B3. Loud gaps, and "no coincidence" distinct from "unavailable"

- `_auto_exog` now returns `(dates_added, weather_gap)` and records a structured `weather_gap` (basis, cell, covered_through, required_through) in the refresh summary. A genuine network failure produces a loud gap, not a swallowed "skipped" note, and still does not crash the refresh.
- `freshness()` (and the `/freshness` endpoint, plus the compact per-envelope freshness block) now carry the venue's `weather_gap`, so a stale weather seam is a visible currency state, not silent.
- `residual.attribute` distinguishes two cases on a flagged day:
  - weather present in the window and no anomaly → "no coincident calendar/weather/event/promo signal" (the weather **was** checked);
  - no weather for the date → "no coincident calendar/event/promo signal; **weather unavailable for this date, not checked**", and the caveat is appended when other coincidences exist.
  The briefing carries the distinction automatically because its item reason flows from `attribute`.

Verified (`tests/test_attribution_weather.py`): with no weather table the reason reads "weather unavailable for this date, not checked" and does not claim a weather check; with flat weather present the reason reads the real null and never says "unavailable".

### B4. June backfill and adoption re-check on exact weather

- **Backfill:** June 2026 realized weather backfilled into all three bases (observed/hindcast/leadmatched, +29 lancaster rows each), repairing the probe's gap.
- **Probe weather-axis result, now a real check:** with June weather present, `attribute` still returns the honest null for the two World Cup opening-weekend spikes (06-06 and 06-13) — now a genuine weather check, not true by construction — and names a genuine warm spell (~24°C vs the ~13°C series mean) for 06-27 only, where late June was actually warm. So the brain names weather only where it genuinely coincides, and still declines to explain the World Cup spikes.
- **Adoption re-run under the existing guard (no forced adoption):** baseline GBM MASE 1.4858; the weather feature block scored MASE 1.6130 (−8.56%, i.e. worse), and nothing ships beyond baseline. Weather stays reasoning-only. The "forecast-neutral while the adopted exo set is empty" claim holds and is evidence-based. The train/serve study is unchanged in direction (leadmatched training closest to the forecast-served reality).

---

## Gates and acceptance

| Gate | Pass condition | State |
|---|---|---|
| FA1 append scope | `_append_transactions` filters by venue and date; multi-venue fresh-store regression green; re-run a clean no-op. | **PASS** (`test_append_cross_venue.py`, 2 tests). |
| FB1 incremental exog | `exog_weather` extends populated basis tables to new dates; ERA5 archive for realized weather; `force` rebuild retained. | **PASS** (`test_exog_incremental.py`, 4 tests; June backfill +29/basis). |
| FB2 both seams | attribution seam and the `features` `exo_temp_c`/`exo_rain_mm` seam both populated for the new span. | **PASS** (29/29 non-null June feature rows). |
| FB3 loud gaps | structured `weather_gap` in the refresh summary and `/freshness`; `attribute` distinguishes "unavailable, not checked" from "no coincident weather"; briefing carries it. | **PASS** (`test_attribution_weather.py`, 2 tests; weather_gap in summary + freshness). |
| FB4 backfill + adoption | June weather backfilled; probe weather-axis restated as a real check; adoption re-run on exact weather, honest outcome, no forced adoption. | **PASS** (adoption negative; weather reasoning-only). |
| G-suite | new tests green; full brain suite green; report + decision-log row. | **PASS** (see section 6). |

---

## 6. Test suite

New tests: `test_append_cross_venue.py` (2), `test_exog_incremental.py` (4), `test_attribution_weather.py` (2). Two existing stubs were updated to the new `_auto_exog` signature (it now returns `(added, weather_gap)`, not an int): `test_ingest_refresh.py` and `test_promote_and_serve.py`.

Full brain suite: **green** (pytest exit 0, zero failures, 209 test functions in `tests/`), run on the canonical CSV corpus (see section 7 note 5). Before the store was restored to canonical, five tests were red: two from the changed `_auto_exog` signature (fixed via the stubs above) and three audit-total canaries that trip on any post-audit data (the probe's June sales), which cleared once the corpus was restored.

---

## 7. Deviations from the spec

Per the standing instruction to record every departure.

1. **B2 premise correction.** The spec says the feature exo seam is "currently present but unpopulated". That is inaccurate for history: the weather basis tables covered 2025-06-04 to 2026-05-31, and `build_features` already joined them, so historical feature rows carried real weather. Only the **new** dates (June) were missing. The incremental fix is still needed and correct; the framing is corrected here.

2. **B4 premise correction.** For the same reason, the enrichment adoption was **not** made against an empty weather seam: the historical seam was populated, and the A14b study already ran on real historical weather with a negative verdict. Backfilling June completes coverage but does not change the verdict (weather MASE 1.6130 vs 1.4858 baseline). The "forecast-neutral" claim was already evidence-based; it is now evidence-based with complete coverage. No adoption was forced.

3. **Attribution basis unchanged.** `residual.attribute` reads the `leadmatched` (forecast-as-issued) basis, which the spec's B1 does not single out (it emphasises the `observed` ERA5 archive for realized weather). The fix extends all three bases, so both the modelling seam (`hindcast`) and the attribution seam (`leadmatched`) are current; the choice of which basis attribution reads was left unchanged, to keep the fix scoped to coverage and loudness rather than re-deciding attribution semantics.

4. **weather_gap on the compact freshness block too.** Beyond the literal "refresh summary and `/freshness`", the gap is also surfaced on the compact freshness block stamped on every serving envelope, so a stale weather seam is visible on any answer, consistent with the "no answer without stating currency" rule.

5. **Store restored to canonical for the green suite.** The June probe deliberately landed June 2026 sales into the store; that data trips three audit-total canaries (`test_a1_warehouse`, `test_a3_features`, `test_a6_reconcile`), which assert the static CSV corpus (Beer Hall L1 = £202k) and legitimately fail against any post-audit data. B4's backfill and adoption re-run were performed and captured on that June-augmented store, after which the store was restored to the pre-probe backup so the audit canaries and the full suite are green. This is not a code regression: the canaries are corpus-static by design. June is re-landable at any time via the now-fixed refresh path (which will, as expected, trip those canaries again while it is present); scoping the canaries to the audit span so they survive live ingest is a reasonable separate follow-up, not done here.

7. **Ablation artifact reverted to canonical.** The B4 adoption re-run regenerated the `signals/feature_ablation.md` artifact against the June-augmented store; since the persistent store was then restored to canonical, that artifact was reverted to its committed (canonical-corpus) version so it matches the store. The B4 numbers quoted here (baseline MASE 1.4858, weather 1.6130) are from the exact-weather re-run and are the record of that check; the verdict (not adopted) is identical on the canonical corpus.

6. **A pre-existing attribution characteristic, observed not fixed.** The weather-anomaly baseline in `attribute` is the whole-series mean and standard deviation, so a genuinely warm summer day reads as a "warm spell" relative to the ~13°C annual mean. This is honest ("coincides with", not "caused by") and fired only for the warmest window (06-27, ~24°C), not for 06-06/06-13, so it discriminated correctly here; but the annual baseline is coarse. Out of scope for this fix; noted for a future refinement (a seasonal or day-of-year baseline).

---

## 8. Decision-log row (paste into section A)

> Live-ingest fixes from the June probe. (A) `refresh._append_transactions` filtered candidate rows by date only, not venue, so a multi-venue or fresh-store append could misplace or duplicate rows; fixed to filter by venue and date, with a multi-venue fresh-store regression test closing the gap the earlier single-venue idempotence check missed. (B) `exog_weather.build` skipped already-populated basis tables, so incremental auto-exog was a silent no-op and the brain held no weather for newly landed dates, which made the June probe's "no coincident weather" null true by construction rather than a real check; fixed to pull incrementally (extend coverage to the store data max, ERA5 archive for realized closed-day weather, `force` retained as the rebuild hatch), to keep both the reasoning attribution seam and the modelling `exo_temp_c`/`exo_rain_mm` feature seam current, and to surface a structured `weather_gap` loudly in the refresh summary and `/freshness` instead of a swallowed skip, with `residual.attribute` now distinguishing "weather unavailable, not checked" from "no coincident weather". June 2026 weather backfilled and the enrichment adoption re-run on exact weather under the existing guard (weather MASE 1.6130 vs 1.4858 baseline; not adopted, reasoning-only, no forced adoption), so the forecast-neutral claim is now evidence-based. Two framing corrections: the feature seam and the adoption were already on real historical weather (only the new dates were missing), not an empty seam; and the probe's June sales were rolled back to the canonical corpus so the audit-total canaries and full suite stay green (those canaries are corpus-static by design; June is re-landable via the fixed path).
