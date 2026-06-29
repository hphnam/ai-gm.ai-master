# PRJ93 — Point-Deviation Signal: Build & Analysis Report

**Date:** 2026-06-29
**Phase:** Point deviation — the per-day primitive (+ shared-foundation refactor)
**Branch:** `feat/proactive-brain` (uncommitted)
**Status:** complete. **128 brain pytest** + **26 proactive-brain TS specs** green; 0
new type errors; no forecast/ladder change (additive only).

Companion to the consolidated [PRJ93_Build_Report_Current.md](PRJ93_Build_Report_Current.md)
and the A13 change-point report [PRJ93_ChangePoint_A13_Report.md](PRJ93_ChangePoint_A13_Report.md).
This records the build, the validation evidence, and the analysis points for the
dissertation.

---

## 1. What this adds (and the dependency it corrects)

A13 change-point was built first, so the shared machinery — the standardised
conformal residual stream, the band scale, and the A14-seam attribution — ended
up living inside `change_point.py`. But the pipeline order is **deviation → then →
change-point**: point deviation is the *primitive* (is one day outside its band?),
change-point the *higher-order* signal that accumulates the **same** per-day
evidence into a *sustained* shift. The dependency must therefore flow
change-point → foundation, never deviation → change-point.

This phase (a) **extracts the foundation** into `signals/residual.py` so both
signals import it and neither imports the other, and (b) **builds the per-day
point-deviation signal** (`signals/deviation.py`) on that foundation.

```
                signals/residual.py
        build_residual_stream · attribute · _table
              ▲                         ▲
              │                         │
   signals/deviation.py        signals/change_point.py
   (per-day: |z| > 1)          (sustained: CUSUM + 4-of-7 persistence)
```

The two signals share a **scale**: point-deviation severity (band multiples of
`z`) and change-point evidence are read off the same yardstick, so "today is 1.4
bands above" and "9 of the last 13 days below band" are commensurable.

---

## 2. Method (one paragraph)

For a venue, build the leakage-free standardised residual stream
`z_t = (actual_t − DOW-median_t) / conformal-half-band@90%` (expanding
one-step-ahead, trading days only). `check_point(venue, as_of=…)` classifies a
single day: `|z| ≤ 1` → **normal** (inside the 90% band); `|z| > 1` →
**deviation** with direction (`z`-sign) and severity (`|z| > 2` → **high**, else
**medium**). A deviating day is **attributed** against the A14 exogenous seam
(correlational — "coincides with …", never "caused by"; weather weighted to
draught layers per A14b). `scan(venue, window=14)` returns the last N classified
days — the daily-briefing feed and the bridge into change-point: a *run* of
`deviation` days is exactly what the persistence detector escalates.

The band-multiple severity rule is **deliberately distinct** from change-point's
persistence-aware severity (a point has no run length — **FLAG-PD2**).

---

## 3. Latest classification (current data)

From [deviation_eval.md](brain/eval/deviation_eval.md):

| Venue | Date | Status | Dir | z | Actual | Reason (top) |
|---|---|---|---|---|---|---|
| The Beer Hall | 2026-05-31 | normal | — | −0.25 | £342 | — |
| Ellel Village Hall | 2026-05-16 | **deviation** | up | **+6.22** | 2018 | no coincident calendar/weather/event/promo signal — likely operational |
| Two River Taps | 2026-05-31 | normal | — | −0.66 | 0 | — |

Two analysis points fall straight out of this table:

- **Ellel fires only on a genuine trading day (FLAG-PD1).** Ellel is
  booking-driven; most calendar days are structural zeros. Because the shared
  stream excludes non-trading days, the per-day check never raises a false
  deviation on an empty Monday — it fires on the 16 May booking (a +6.2-band
  spike), and the attributor honestly says it finds no coincident calendar/
  weather/event signal (a lead to investigate, not a fabricated cause).
- **The closed venue reads "normal" weeks into closure — and that is correct.**
  Two River Taps' latest stored day is a zero, yet `z = −0.66` (normal). The
  memoryless point check is *not* meant to keep flagging a long-running closure:
  by late May the expanding DOW-median baseline has already absorbed the zeros.
  Catching the *sustained* drop at its **onset** is change-point's job (A13
  detected it at 2026-05-08). This is the complementary split working as designed.

---

## 4. Validation — acceptance gates (G0–G9)

| Gate | Check | Result |
|---|---|---|
| G0 | Post-refactor, the full suite passes unchanged; `change_point` imports the foundation from `signals.residual` | PASS — 128 pytest |
| G1 | `deviation` imports the foundation from `signals.residual` and **not** from `signals.change_point` (asserted via AST import inspection) | PASS |
| G2 | Latest day at its DOW-median → `normal`, `|z| ≤ 1` | PASS |
| G3 | Injected large +deviation → `deviation/up/high`; −deviation → `down` | PASS |
| G4 | Band edge: cutoff is exactly `DEV_BAND_K` (0.99 → normal, 1.01 → deviation) | PASS |
| G5 | Leakage-free `as_of`: the row at `d` is unchanged when later days are appended | PASS |
| G6 | A flagged day in a known structural-break window returns a coincident "coincides with …" reason | PASS (TRT closure window) |
| G7 | Robustness: non-trading `as_of` / empty stream → `None`, no raise | PASS |
| G8 | `scan(window=N)` returns the last N trading days, date-ordered, fully populated | PASS |
| G9 | `run()` / CLI writes the report and lists every venue in `VENUES_FOR_DEVIATION` | PASS |

The deterministic gates (G2–G5) monkeypatch a synthetic residual stream so the
classification is fully determined by the injected `z`; the attribution /
robustness / scan gates (G6–G9) run against the built store.

---

## 5. The API migration (the one substantive design decision)

The spec names `POST /deviation/check` as the home for the new residual-stream
check. **That path already hosted a working, tested endpoint** — a band-breach
detector taking `{venue, layer, level, observations[]}` and returning
`{n_checked, n_breaches, breaches[]}`, wired through to `brain_check_deviation`
and the web `DeviationCard`. The spec's Step 4 ("*if* `brain_check_deviation` is a
stub…") shows the author was unsure of its state; it was not a stub.

**Decision: I migrated `/deviation/check` to the residual-stream `check_point`**
(and added `/deviation/scan`), rather than keeping the old band-breach detector
or adding a second, overlapping deviation tool. Rationale:

1. The spec's whole thesis is **one shared scale** for point-deviation and
   change-point; keeping the band-breach variant would have defeated it and left
   the agent with two near-duplicate "is today unusual" tools.
2. The `build_residual_stream` docstring already *claimed* `/deviation/check`
   used the conformal half-band — the migration makes the code match the claim.

**Capability delta (recorded honestly):**

- **Gained:** standardised-`z` severity shared with change-point; per-day
  attribution ("coincides with …"); a clean `scan` briefing feed.
- **Lost:** the old "check these caller-supplied `observations`" path. The new
  check reads stored actuals at a date (`as_of`) or the latest day. In practice
  the agent almost always checks stored trading, which `as_of`/latest covers; the
  arbitrary-observations path was unused by any caller. **FLAG-PD4** records this
  for the owner; reverting is a localised change if a caller ever needs it.

`/deviation/check` returns a **200 `found:false` envelope** (not a 404 / 204)
when the requested day isn't a trading day — matching the codebase's existing
"stable envelope, never error" pattern (`/stock/cover`, `/deviation/changepoint`)
and keeping the shared Track-B HTTP client simple.

---

## 6. Integration surface

- **Track A:** `signals/residual.py` (foundation), `signals/deviation.py`
  (primitive). `change_point.py` and `change_point_eval.py` repointed to import
  the foundation from `residual`. No forecast/ladder change.
- **API:** `POST /deviation/check` (per-day check_point), `POST /deviation/scan`
  (last-N feed). `/deviation/changepoint` and `/forecast` untouched.
- **Track B:** `brain_check_deviation` schema migrated to
  `{ venue, layer?, as_of? }` (`.strict()`); client/service/`DeviationCard`
  updated to the check_point shape. Self-registered via the existing
  `IntegrationRegistry` seam — **no forbidden touch-points** (`chat-tools.ts`,
  `tool-dispatcher.ts`, `ai-sdk-tools.ts`, `gm-agent.ts`, `system-prompt.ts`).
  `orgId` still comes from `DispatchContext`, never the model.

---

## 7. Honest limitations & flags

1. **FLAG-PD1 — Ellel sparsity.** Point deviation fires only on genuine trading
   days; a booking lull is not a deviation. (Ellel trading-day count is recorded
   by the stream length; the latest booking is the only recent non-zero day.)
2. **FLAG-PD2 — band-multiple severity.** Point severity uses `DEV_BAND_K` /
   `DEV_SEVERE_K`, distinct from change-point's persistence-aware severity.
3. **FLAG-PD3 — correlational attribution.** Inherits the change-point caveats:
   coincident ≠ causal; A14b draught weighting; the seasonal-baseline limitation
   (the "cold snap" wording compares to the annual mean).
4. **FLAG-PD4 — API migration.** `/deviation/check` replaced a band-breach
   detector; the caller-supplied-`observations` path was dropped (see §5).
5. **Additive-band cosmetics.** On a very low-expected day the band's lower bound
   (`expected − scale`) can be negative (e.g. BH 31 May: −£71–£1,038). The `z`
   classification is unaffected; only the displayed lower edge looks odd. Not
   clamped, to stay faithful to the symmetric residual band.

---

## 8. Owner action (outside the repo)
- **Decision-log row** for `PRJ93_Decision_and_Resolution_Log.md` (§B → built):
  point-deviation primitive on the shared conformal residual stream; foundation
  extracted to `signals.residual` so deviation and change-point share a scale and
  neither imports the other; `/deviation/check` migrated from band-breach to the
  residual-stream check_point (+`/deviation/scan`); Track-B `brain_check_deviation`
  re-shaped. No forecast changes.
- **Confirm FLAG-PD4** — accept dropping the caller-supplied-`observations` path,
  or request it be kept alongside the new check.
- Branch `feat/proactive-brain` remains **uncommitted**.
