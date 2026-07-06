# PRJ93 — Scaled Evaluation Run & Labelling Protocol: Build & Analysis Report

**Date:** 2026-07-06
**Phase:** Scaled injection run (Part A) + labelling protocol tooling (Part B)
**Branch:** `main`
**Status:** complete. **207 brain pytest** (+14) green; the scaled run is a 6-second
offline CLI (`python -m eval.agent_eval --scaled`) producing the extended §S1–S7 of
[PRJ93_Agent_Eval_Report.md](PRJ93_Agent_Eval_Report.md). Read-only over the briefing
and signals; `LIVE_INGEST` off.

Companion to [PRJ93_Agent_Eval_Report.md](PRJ93_Agent_Eval_Report.md) (the tables) and
to the framework build report. This is the focused analysis.

---

## 0. Why this run

The smoke run reported F1 = 1.0 on **N=4** injections with a Wilson interval of
**[0.51, 1.00]** — four correct catches cannot distinguish a strong detector from a
mediocre one. Two things were needed before a detection number could be cited: enough
injections across a range of event sizes that the interval tightens **and** describes a
sensitivity floor, and a human-labelled anchor so the "useful to act on" axis rests on
real judgment. Part A delivers the first; Part B builds the instrument for the second
(the human labelling is Nam's to run).

The scientific core is **not** a single higher F1. It is the **detection-rate-versus-
event-size curve**: how subtle an event the brain catches before it misses. That floor
is the honest, defensible result.

---

## 1. Part A — the scaled grid

`build_scaled_corpus` replaces the fixed four-event smoke set with a **venue × kind ×
magnitude × onset × fold × direction** grid — **N=644** injections, exhaustive and
deterministic. Venue constraints are respected: Beer Hall carries all four kinds; Two
River Taps is closed, so only its **pre-closure** folds are injected (net-sales kinds,
no stock); Ellel is booking-driven and sparse, so its single short held-out fold can
only test a **spike**, not a sustained shift (flagged, not silently scored). Every fold
is a leakage-checked `harness.rolling_origin` window (G-eval-e holds at scale).

Each injection is scored exactly as the smoke run: the real detectors (CUSUM /
persistence / classify) and the real briefing synthesis surface items, precision is
judged on **injection-attributable** items (a clean-window diff), recall on the truth.

---

## 2. The headline: the sensitivity floor

| Kind | N | Recall | 95% CI | Near-threshold (smallest magnitude) |
|---|---|---|---|---|
| **regime_shift** | 252 | **0.996** | [0.98, 1.00] | z=1 → 0.96 (BH), 1.00 (TRT) |
| **exo_coincident** | 84 | **0.988** | [0.94, 1.00] | z=1 → 1.00 (BH), 0.83 (TRT) |
| **stock_drawdown** | 20 | 1.000 | [0.84, 1.00] | (injected reorder — trivially surfaced) |
| **spike** | 288 | **0.566** | [0.51, 0.62] | z=1 → 0.38 (BH), 0.33 (TRT), 0.50 (Ellel) |

**Overall recall 0.803 [0.77, 0.83]** — no longer a flattering 1.0. The scale exposes a
clear, defensible structure:

- **Sustained shifts are caught down to the band edge.** Regime and exo-coincident
  shifts hit ~0.96–1.0 catch rate even at the near-threshold z=1, because persistence
  accumulates evidence across days — the detector is *designed* for exactly this and the
  scaled run confirms it.
- **The spike is the sensitivity floor.** A single-day excursion carries no persistence,
  so a near-threshold spike is caught only ~0.33–0.50 of the time. The Beer Hall spike
  curve rises monotonically and then **plateaus at ~0.67 even at z=4**:

  | spike magnitude (Beer Hall) | z=1 | z=1.25 | z=1.5 | z=2 | z=3 | z=4 |
  |---|---|---|---|---|---|---|
  | catch rate | 0.375 | 0.458 | 0.542 | 0.583 | 0.667 | 0.667 |

  The plateau below 1.0 is not a detector miss — it is the **daily feed's recency
  window**. The briefing's point-deviation feed scans only the trailing 14 trading days
  (`DEV_SCAN_WINDOW`), so a spike injected **early** in a 20-day held-out window has
  already scrolled out of the feed by the window's "as-of" day. Roughly the early third
  of spike positions are therefore invisible to the *daily* briefing regardless of size.
  This is a real, honest operating characteristic: the brain surfaces an **ongoing**
  shift reliably, but a one-off spike that is no longer recent is old news the daily feed
  does not resurface. It is exactly the kind of limit the magnitude-and-onset sweep was
  built to expose, and it is worth stating plainly rather than hiding behind a pooled
  average that the strong regime numbers would have flattered.

**Latency falls with magnitude** (regime/exo, median days onset→surfaced):

| magnitude bin | N | median delay | IQR |
|---|---|---|---|
| large (\|z\|>2) | 112 | **2 d** | [1, 3] |
| mid (1.25<\|z\|≤2) | 94 | 3 d | [3, 5] |
| near-threshold (\|z\|≤1.25) | 64 | **6 d** | [3, 11] |

Bigger shifts detect faster; a near-threshold shift takes a median of 6 days for the
persistence detector to accumulate enough evidence. The curve, not a single number.

**Ranking** holds at scale: over **N=7** synthetic multi-event days, mean NDCG **1.000**
and Spearman **1.000** — a sustained shift is ranked above a coincident one-day spike
every time. **Fatigue** upper bound **0.667 surfaced items/week** on un-injected windows.

---

## 3. Part B — the labelling protocol

Part B answers the supervisor's question — can an LLM judge stand in for manager
feedback — by building the instrument for a defensible human anchor. Claude Code builds
the tools; **Nam runs the labelling**.

### 3.1 The tooling (built)

- **Stratified sampler** — `labels.sample_days(n_per_stratum, seed)` draws a deterministic
  sample of (day, venue) across **quiet / deviation / change-point / stock** strata,
  crossed with venue, so the labelled set is neither all quiet nor all noise. Sparse
  strata return fewer than requested; the achieved N per stratum is reported, not padded.
- **Two-pass instrument** — `labels.label_day` (CLI `python -m eval.labels --label`) shows
  the **raw day first** and captures any insight the briefing failed to raise (a `missing`
  label — this pass finds false negatives), and only **then** reveals the briefing's items
  for `keep` / `drop` + a `priority_rank`. The order is deliberate: judging the briefing's
  items before forming an independent view of the day biases the labeller toward agreeing
  with it. Writes to the existing `eval_labels` table.
- **Judge calibration** — `judge.evaluate_labelled` surfaces the briefing's items for the
  same days the human labelled, scores them (offline emit-prompts by default; guarded live
  API), and reports the judge-versus-human Cohen's kappa against the pre-registered
  threshold (0.6). Honest no-op until labels exist.

### 3.2 The protocol (Nam executes; pre-registered here to meet methodological standard)

- **Operational definition, pre-registered:** *"worth surfacing" means a duty manager
  would want to know this before the shift.* Fixed before labelling so it is not adjusted
  to fit results.
- **Sample size:** aim for ~100–200 item-level judgments across the sampled days; report
  what is actually achieved (the estate is small).
- **Inter-rater reliability:** a second labeller (e.g. Ryan) labels a 20–30 item overlap so
  an inter-rater Cohen's kappa can be reported, showing the labels are reliable before
  anything is measured against them. If no second labeller is available, Nam re-labels the
  overlap after a gap for an intra-rater figure, and the single-rater limitation is stated
  plainly.
- **Bias acknowledgement:** the researcher is labelling their own system's output. The
  two-pass instrument, the pre-registered definition, and the second rater are the
  mitigations; the residual risk is stated in the Discussion. The likely and publishable
  finding is that the judge tracks humans well on correctness and clarity but less well on
  actionability — that split, reported honestly, is the answer to the supervisor's question.

---

## 4. Deviations from the spec (called out, per the request)

1. **`run_scaled` takes no `seed`.** The spec's kickoff says `run_scaled(seed=...)`. The
   grid is **exhaustive and deterministic** — it uses no RNG — so a seed would govern
   nothing, and a parameter that does nothing is exactly the "misleading dead constant" a
   prior review flagged. Reproducibility comes from the exhaustive enumeration; the seed
   lives in `sample_days` (Part B), where sampling actually uses randomness. GA1's "seed
   fixed" is satisfied more strongly by determinism.
2. **The fixed set is `build_corpus`, not `_corpus`.** The framework already named the
   smoke set `build_corpus`; the grid is added as `build_scaled_corpus` alongside it (the
   N=4 smoke run stays as the quick self-test, as the spec intends).
3. **Ellel is spike-only.** The spec lists "deviation and sparse kinds" for Ellel. Its
   residual stream leaves a **single 4-row held-out fold** — too short to test a sustained
   shift or the k-of-n persistence window — so regime/exo are excluded as **not evaluable**
   (a data limit, flagged), and Ellel is injected with spikes only. Reporting a 0% regime
   rate on an untestable window would be misleading; omitting it with a caveat is honest.
4. **The sensitivity curve is delivered as tables, not a PNG figure.** Magnitude → catch
   rate with N and a Wilson interval per (kind, venue) is the curve in tabular form, and
   keeps the report text-reviewable with no binary artefacts. A plotted figure is a
   trivial downstream step from these tables if the dissertation wants one.
5. **Attribution is stubbed during the scaled detection run.** Attribution is a
   per-DB-query cost and a strong sustained injection makes CUSUM re-alarm many times, so
   attribution dominated the runtime. **No scaled metric reads the attribution reason**
   (detection, latency, ranking, and fatigue use onset / direction / severity only — the
   attribution top-1 axis is measured in the smoke run), so stubbing it is **exact** for
   every scaled number and cut the run from ~15 minutes to ~6 seconds. This is a
   performance optimisation with zero effect on the reported results.

---

## 5. Gates

| Gate | Result |
|---|---|
| GA1 grid | `build_scaled_corpus` = venue × kind × magnitude × onset × fold × direction; leakage guard on every fold; deterministic (no RNG) |
| GA2 sensitivity | catch-rate-vs-magnitude per kind × venue, near-threshold operating point called out; spike floor surfaced, not hidden in a pooled F1 |
| GA3 intervals | every aggregate carries N + a Wilson interval; TRT (closed) and Ellel (sparse) flagged small-N |
| GA4 latency + ranking | regime/exo latency distribution by magnitude bin; NDCG/Spearman over N=7 multi-event days |
| GB1 sampler | `sample_days` deterministic + stratified across quiet/deviation/change-point/stock × venue; achieved N reported |
| GB2 instrument | two-pass CLI (raw day → briefing) writing keep/drop/missing/priority to `eval_labels` |
| GB3 protocol | pre-registered definition, sampling, inter-rater plan, bias note documented (§3) |
| GB4 judge calibration | `judge.evaluate_labelled` wired against the pre-registered 0.6 rule; honest no-op until labels exist |
| G-suite | +14 tests (`test_scaled_eval.py`) green; **207** full brain suite green; `eval_labels` dropped clean by tests; reports + decision-log row written |

Honesty gates from the framework carry through unchanged: synthetic never scored as real,
sparse scored on actionability, the judge always reported with its human-agreement number,
every metric reported with its N and interval.

---

## 6. Decision-log row (paste into PRJ93_Decision_and_Resolution_Log.md, §A)

> Scaled evaluation run and labelling protocol completed. The injection oracle was
> expanded from the four-event smoke set to a venue × kind × magnitude × onset × fold ×
> direction grid (N=644), so detection precision/recall/F1 are reported with tight Wilson
> intervals and, more importantly, as a detection-rate-versus-event-magnitude sensitivity
> curve per kind and venue. The headline is the sensitivity floor: sustained shifts
> (regime, exo-coincident) are caught to ~0.96–1.0 down to the band edge, while a
> single-day spike floors at ~0.38 near-threshold and plateaus at ~0.67 (a one-off spike
> older than the daily feed's 14-day window is not resurfaced) — the honest limit a pooled
> F1 would have hidden. Regime/exo latency falls monotonically with magnitude (near-
> threshold median 6 d → large 2 d); ranking holds at NDCG/Spearman 1.0 over many
> multi-event days. A stratified day sampler and a two-pass labelling instrument (raw day
> first for misses, then the briefing for keep/drop/priority) were built under a
> pre-registered definition of "worth surfacing", with an inter-rater kappa planned on an
> overlap subset; the LLM-judge is wired to calibrate against that anchor (judge-vs-human
> kappa against the pre-registered 0.6). All aggregates reported with N and intervals;
> sparse-venue cells caveated (TRT pre-closure only, Ellel spike-only). Read-only, offline,
> `LIVE_INGEST` off; attribution stubbed in the scaled detection run (no scaled metric
> reads it), which is exact and cut runtime from ~15 min to ~6 s.

---

## 7. Review gate

`code-reviewer` and `security-reviewer` ran in parallel over the scaled grid, the
aggregation maths, the sampler, and the labelling instrument.

- **security — no findings**: every DuckDB statement is parameterised (including the
  free-text `missing::` label and notes); the layer is read-only except the dedicated
  `eval_labels` table; `_StubAttribution` restores the real `attribute` even on exception;
  the judge surface stays triple-gated; `LIVE_INGEST` untouched.
- **code — no HIGH; 1 MEDIUM + 1 LOW, both fixed**:
  - **MEDIUM (precision understated) — fixed.** The scaled clean-baseline was surfaced over
    the *full* stream while the injected streams are fold-truncated, so for non-final folds
    genuine background inside the fold window was not subtracted and was miscounted as
    spurious — understating **precision** in the cited run (recall, the sensitivity curve,
    latency, and ranking were unaffected). Fixed by truncating the clean baseline at the
    fold's as-of (`_clean`), and, for consistency, truncating the stock injection's stream
    to the fold too. Overall precision corrected **0.68 → 0.87** (spike 0.51 → 0.87); the
    headline recall/sensitivity numbers are unchanged.
  - **LOW (near-threshold semantics) — fixed.** The "near-threshold operating point" picked
    the smallest magnitude, which for stock (`days_of_cover`) is the *most* out-of-cover
    (easiest), not the hardest; now the hard end is per kind (smallest |z| for shifts, the
    largest days-of-cover for stock).
  - Verified clean by the reviewer: `_StubAttribution` cannot change any scaled result (no
    metric reads the attribution reason), no leaked patch, `sample_days` determinism, the
    closure fold-filter, and the `_cell`/latency maths.

No blocking findings remain; the full suite (**207**) is green after the fixes.
