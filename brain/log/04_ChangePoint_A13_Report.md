# PRJ93 — A13 Change-Point Detection: Build & Analysis Report

**Date:** 2026-06-25
**Phase:** A13 — change-point / regime-shift detection (+ attribution)
**Branch:** `feat/proactive-brain` (uncommitted)
**Status:** complete. **112 brain pytest** + **24 Track-B specs** green; 0 typecheck
errors; no forecast/ladder change (additive only).

This is the focused analysis report for A13 (companion to the consolidated
[PRJ93_Build_Report_Current.md](PRJ93_Build_Report_Current.md)). It records what
was built, the validation evidence, and the analysis points worth taking into the
dissertation.

---

## 1. What A13 adds (and why now)

`/deviation/check` (shipped) is a **per-day point-anomaly** detector — memoryless,
so a one-off spike and the first day of a permanent shift look identical. A13 adds
the second half of "detect meaningful deviations": **sustained regime shifts**,
dated to an onset and **attributed** to coincident real-world signals.

Crucially this is where the A14/A14b enrichment **pays off**. A14b proved the exo
features are *explanatorily real but predictively inert* (a weak, significant
temperature signal that the forecaster can't exploit). Change-point **attribution
is explanatory, not predictive** — so the populated exo seam finds its proper home
here: it can't improve the forecast, but it can explain *why a regime shifted*. The
enrichment that didn't earn a place in the ladder earns one in the proactive layer.

---

## 2. Method (one paragraph)

Detect on the **standardised conformal residual stream**
`z_t = (actual_t − DOW-median_t) / conformal-half-band@90%` — the same yardstick
`/deviation/check` uses, so point-anomaly severity and change-point evidence share
a scale. The stream is leakage-free (expanding one-step-ahead) over each venue's
active span, trading days only. Two **production** detectors run on `z_t`:
**two-sided CUSUM** (gradual drift; `k=0.5`, `h=5`) and **k-of-n persistence**
(abrupt sustained shift; 4-of-7). **BOCPD** (Adams–MacKay, NIG conjugate) is the
principled **benchmark**, not the production signal — a manager acts on "9 of 13
days below band since 12 May", not a run-length posterior. For closed venues the
post-closure zero run is appended so the closure is a detectable abrupt drop;
`is_closed` then makes monitoring dormant.

---

## 3. Detected change points (current data)

| Venue | Onset | Detector | Dir | Mag (band/%) | Severity | Top attribution |
|---|---|---|---|---|---|---|
| The Beer Hall | 2025-12-27 | persistence | down | −0.68 / −29% | medium | coincides with a cold snap (~6 °C vs 13 °C avg) |
| Two River Taps | 2025-11-01 | cusum | down | −0.58 | low | coincides with a school term↔holiday transition |
| Two River Taps | 2026-05-08 | **both** | down | −1.12 | medium | **coincides with TRT's closure (structural break)** |
| Ellel Village Hall | — | — | — | — | — | (no change points; persistence-only, sparse) |

Each row carries `recalibration_needed=TRUE` (the learned "normal" is stale from the
onset). All attribution is **correlational** ("coincides with", never "caused by").

---

## 4. Validation — honest characterisation (not asserted success)

Per the project's prove-don't-assume standard ([change_point_eval.md](brain/eval/change_point_eval.md)):

### 4.1 TRT closure (ground-truth structural break) — G4
Detected **2026-05-16** for an onset of **2026-05-08** → **8 trading-day delay**,
fired by **both** detectors, then `is_closed` dormant (no repeat alarms on the zero
run). The structural break is recovered.

### 4.2 Negative control — empirical ARL₀ on the BH stable span — G5
ARL₀ **exceeds the 400-day simulation horizon at every `h` tested** (right-censored):
the standardised-residual noise sits below the CUSUM slack `k=0.5`, so the default
operating point produces **essentially no false alarms** (ARL₀ ≫ target 75). The
binding constraint here is **detection delay, not false-alarm rate** — a deliberately
conservative operating point, honest for a small single-venue sample.

### 4.3 Synthetic injection — delay vs false alarms — G6
| δ (band units) | detect rate | mean delay | false pre-onset |
|---|---|---|---|
| 0.5 | 33–56% | 65–82 days | 0.00 |
| 1.0 | **100%** | **~8–11 days** | 0.00 |
| 2.0 | **100%** | **~2–4 days** | 0.00 |

A δ=0.5 shift is near the noise floor and detects slowly (honest limit); δ≥1 detects
reliably and fast with zero false pre-onset alarms. The TRT closure (−1.12 units,
8-day delay) sits exactly on the δ=1 curve — internally coherent.

### 4.4 BOCPD benchmark — G7
BOCPD run on the same stream; its peak P(changepoint) and onset are reported
alongside the simple detectors. Kept as the benchmark; CUSUM+persistence stay the
production signal for manager-actionability.

---

## 5. Attribution analysis (the A14-seam payoff)

The attributor scans the A14 exogenous seam in a ±7-day window around each onset and
returns a ranked, correlational list. Observations:

- **The BH post-Christmas dip (27 Dec) attributes to a cold snap** (~6 °C vs 13 °C
  average) — a genuine coincident weather signal, surfaced only after the stock
  attribution was correctly **gated by `as_of` proximity** (an early version
  mis-credited a June reorder flag to a December dip; fixed).
- **Weather is weighted higher for draught layers** (A14b: the weather signal is
  draught-specific), lower at L1.
- **The TRT closure is attributed to the structural break itself** (highest-confidence
  rank), not to a coincidental calendar/weather signal.
- When nothing coincides, the attributor says so ("likely an operational or
  competitive change worth investigating") — a lead, not a verdict.

This is the concrete demonstration that the predictively-inert enrichment is
explanatorily useful.

---

## 6. Recalibration loop (T4) — the proactive payoff

A confirmed shift sets `recalibration_needed=TRUE` and surfaces a stale-baseline note
("the forecast baseline pre-dates this and is likely stale"). The minimum behaviour
shipped is the **flag + degraded-confidence note** until `CP_RELEARN_MIN_DAYS=28`
post-change days accrue; **automatic re-fit** on the post-change window is future work
(FLAG-CP3). This closes the loop: *learn rhythm → detect deviation → reason → surface
→ flag the model itself as stale.*

---

## 7. Integration surface

- **DuckDB:** `change_points` table (idempotent on `(venue, layer, key, onset_date)`).
- **API:** `POST /deviation/changepoint` (typed JSON; excluded/short-history venues →
  200 stable envelope, never 500). `/deviation/check` untouched.
- **Track B:** 6th self-registered tool `brain_check_change_point` (tools→client→
  service→provider→web `ChangePointCard`), via the existing IntegrationRegistry seam.
  **No forbidden touch-points** (`chat-tools.ts`, `tool-dispatcher.ts`,
  `ai-sdk-tools.ts`, `gm-agent.ts`, `system-prompt.ts`) edited.

---

## 8. Acceptance gates

| Gate | Result |
|---|---|
| G1 residual stream (leakage-free, conformal scale) | PASS |
| G2 CUSUM (fires on step, quiet on noise) | PASS |
| G3 persistence (4-of-7 fires, ignores isolated) | PASS |
| G4 TRT closure ground truth (delay reported) | PASS — 8 trading-days, `both` |
| G5 negative control ARL₀ | PASS — ARL₀ ≫ target (censored >400) |
| G6 injection delay-vs-FAR curve | PASS |
| G7 BOCPD benchmark | PASS |
| G8 attribution (ranked, A14 seam, draught-weighted, correlational) | PASS |
| G9 no regression (forecasts unchanged; 112 pytest) | PASS |
| G10 API + Track B (typed JSON; 6th tool; 0 type errors; specs) | PASS |
| G11 scope guards (Ellel persistence-only; recalibration flag; spillover) | PASS |
| G12 recalibration loop (flag + degraded confidence, documented) | PASS |

---

## 9. Honest limitations & flags (for the dissertation Discussion)

1. **Conservative operating point (FLAG-CP1).** On ~1 year of one venue the detector
   essentially never false-alarms but is slow on sub-1-band shifts — the right trade
   for a manager-facing alert (false alarms erode trust), but state it.
2. **Single-venue / short history.** ARL₀ is right-censored; the injection curve is the
   more informative sensitivity evidence. More venues / longer history would let ARL₀
   be measured directly and `CP_CUSUM_H` tuned to the target.
3. **Gradual-decline blind spot.** An expanding baseline adapts to a slow drift, so a
   gradual closure is detected late (TRT's earlier Nov decline was caught at low
   severity). The abrupt zero-run append is what makes the final closure crisp.
4. **Attribution is correlational (FLAG-CP4).** Coincident ≠ causal; the ranked list is
   a lead for the manager, never a stated cause.
5. **Ellel (FLAG-CP2).** Persistence-only, currently no change points — sparse,
   booking-driven; stated, not silently omitted.

---

## 10. Owner action (outside the repo)
- **Decision-log row** for `PRJ93_Decision_and_Resolution_Log.md` (§B → built): A13
  change-point detection on the conformal residual stream (CUSUM + persistence + BOCPD),
  validated against the TRT closure + synthetic injection, attributed against the A14
  seam (draught-weighted), `recalibration_needed` flag (auto re-fit future work).
  Endpoint `/deviation/changepoint`; Track-B tool `brain_check_change_point`. No
  forecast changes.
- Branch `feat/proactive-brain` remains **uncommitted**.
