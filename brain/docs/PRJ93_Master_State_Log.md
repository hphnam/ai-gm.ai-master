# PRJ93 Proactive Brain: Master Project State and Technical Handoff Log

Purpose. This is the single authoritative state record for the PRJ93 Proactive Brain as of
2026-07-20, written so a later session (a new Claude instance, or a person picking the
project up cold) can understand the whole system, every method chosen and why, every
deviation from the original plan, the locked literature and its fidelity verdicts, and the
current open items, without re-deriving any of it. It consolidates the 41 build reports, the
append-only decision log, the dissertation notes, the contract, and the flag ledger into one
place. Where a claim is verifiable, the source report or file is named.

Supersedes the 2026-07-19 edition (tip `44a0f08`). This edition is written at tip
`d40dea7`. Two work cycles landed since: G15 (reports 36 to 39, four packages independent of
contract open decision 6) and G16 (reports 40 to 41, corrections plus one measurement).

**Read this first if you read nothing else.** The previous edition's section 20 presented
three training-frame hashes as the gate proving the multi-tenant refactor moved no research
number. Those hashes were never reproducible by anyone, including their author, because the
script that produced them was never committed. That gap is now closed, the de-Lune is
verified portably, and it holds. Section 20 is rewritten from scratch.

Conventions: no em-dashes; MASE is mean absolute scaled error, where below 1 beats a
seasonal-naive forecast and lower is better; L1/L2/L3 are the venue, category and item levels
of the hierarchy; "served" means the model whose output the app actually reads; "research
path" means the engine run unbound, against Lune's own constants and its own DuckDB store,
which is the configuration every dissertation number was produced in; "compute path" means
the stateless per-request service.

---

## 1. Project context

Nam Hoang, MSc AI at Lancaster University, placement at AI General Manager Ltd. Dissertation
PRJ93 builds a forecasting and anomaly-detection layer, the "Proactive Brain," over an
existing LLM-based digital general manager for a small Lancashire hospitality estate, Lune
Brew Co.

Venues:
- Beer Hall: the anchor, richest data, 399 rows in the training frame. Where the forecast is
  strongest and every method is tested first.
- Ellel Village Hall: sparse, booking-driven, 66 trading days in the current frame. The hard
  case that keeps methods honest on thin data.
- Two River Taps (TRT): closed since May 2026, modelled as a structural break, skipped by the
  liveness gate.
- Events: a fourth Square location, excluded from forecasting. 203 line items across 2
  distinct dates in the whole seed history, both in the final two days of the window. Too
  sparse for any analysis (section 15).

Data: Square till exports, ex-VAT daily sales per venue, per category, per item. The committed
seed CSV (`data/items-2024-01-01-2026-06-01.csv`, utf-16, tab-separated, 92,329 rows,
2025-06-04 to 2026-05-31) is the bootstrap. June and 1 to 7 July actuals have been ingested
from held-out evaluation artefacts to advance the operational clock to 2026-07-07.

Stakeholders:
- Ryan Helmn: technical co-founder, industrial supervisor. Owns Track B (NestJS, Neon
  Postgres, Prisma, pgvector, Square POS). Author of `BRAIN_PRODUCTION_INTEGRATION_BRIEF.md`
  (2026-07-16). Holds report 35 and its addendum, report 41.
- Dr Hansi Hettiarachchi: academic supervisor at Lancaster.
- James: operations. Owes the menu-item-to-stock-name mapping and supplier lead times.
- Elliot Horner: estate owner and primary end user.

Repository: `github.com/hphnam/ai-gm.ai-master`, working branch `brain-construction`. All
commits authored by `hapuna-namhoang` with no Claude trailer. Tip: `d40dea7` (2026-07-20).

Remote divergence, unchanged and still live. This clone carries `brain/log/` (41 reports plus
the decision log) that the `andpro` remote does not. Nothing is pushed to `andpro`. A sync is
a coordinated conversation, not a `git push`, because Ryan's planned PII history rewrite
(`git filter-repo` plus force-push) against the wrong clone would either clobber the log
history or resurrect the PII on whichever remote was not rewritten. Sequence it: agree which
clone is canonical, rewrite there, force-push both remotes in lockstep, everyone re-clones.

Two tracks. Track A (this project) is a standalone Python brain on the research path and
stateless compute on the production path. Track B (Ryan's NestJS app on Neon) owns persistence
and tenancy. The seam is `POST /compute` and the dataset/bundle contract, not a shared
database.

---

## 2. Current state snapshot (2026-07-20)

Built and working on the research path: a seven-rung forecasting ladder with a formal gate,
per-venue served models, a split-conformal band with a Mondrian variant, a z-score deviation
detector, a CUSUM-plus-persistence change-point detector with a BOCPD benchmark, a MinT
hierarchical reconciliation, a multiplicative briefing score with a new/continuing/resolved
novelty chain, a liveness gate, an event-aware refresh policy, and a Square-to-brain taxonomy
map. Three pre-registered live simulation windows complete and confronted (June, 1 to 7 July,
8 to 14 July), and the third one falsified a project belief.

Built and working on the compute path: a hardened HTTP surface with bearer auth, a per-request
scratch store bound through a ContextVar, an injected per-org profile that replaces Lune's
constants, a strict dataset/bundle contract, a forward forecaster that produces dates after
the supplied history, and a per-venue date-isolation guard. Adversarially reviewed four times.

Served models (final, gate-selected per venue by 6-fold rolling MASE), unchanged since G12.16:
- Beer Hall: `rung4_chronos2_exo` (Chronos-2 with the full exogenous set), MASE 0.745.
- Two River Taps: `rung2_ets`, MASE 0.597. Dormant via the liveness gate.
- Ellel: `rung1_robust_dow`, MASE 0.572 (Chronos-2 a near-tie at 0.581).

Headline out-of-sample result: Beer Hall July 8 to 14 L1 MASE 0.285 (Origin A) and 0.287
(Origin B), band coverage 1.00, against the 1 to 7 July window's 0.386 and the 0.745 backtest
class.

Headline negative result: the home-nation fixture anticipation was pre-registered and
falsified, and both testable explanations for the failure have since come back negative too.
The 11 July shortfall survives diagnosis and remains unexplained by the covariate set.
Sections 15 and 16.

Tests: `.venv` (Python 3.14) **391 passed / 8 skipped**; `.venv-forecast` (Python 3.12) **398
passed / 1 skipped**. The 8 skips are Chronos, absent from the non-forecast venv. The
integration and review arc added 84 and 84 from the Phase 3 starting point.

Lint: **70 errors under ruff 0.15.22**, measured at `c008651` via `uvx ruff check .` from
`brain/`. This figure is now version-pinned and quotable. The historical 71 start point is not
re-measurable and should not be quoted as a delta. 263 `print()` calls, deferred.

Training-frame baseline (the gate, now portable and committed):

| Venue | rows x cols | sha256[:16] |
|---|---|---|
| `beer_hall` | 399 x 40 | `8c8a8be9d8dc5791` |
| `two_river_taps` | 331 x 40 | `b6339032a219213c` |
| `ellel` | 392 x 40 | `ea28bcacbf1825e4` |

Reports: 41, numbered in `brain/log/`, indexed by `brain/log/README.md`. Decision log:
`brain/log/Decision_and_Resolution_Log.md`, append-only, 29 numbered rows plus Sections A/B/C.
Dissertation argument: `brain/log/DISSERTATION_NOTES.md`. Integration contract and the
canonical caller obligations: `brain/CONTRACT.md`. Live flag ledger: `brain/FLAGS.md`.

Store ceiling: 2026-07-07, with the 8 to 14 July held-out window verified empty.

---

## 3. Architecture: two paths, one engine

Three stages, identical on both paths.

LEARN. Chronos-2 produces the L1 forecast per venue. Split conformal wraps it in an 80% and
90% band. The forecast is made at three hierarchy levels on the research path, and MinT
reconciles them so the levels sum coherently, with the served venue top kept pure.

DETECT. The z-score deviation check compares each day against the band. CUSUM plus a
persistence rule detect a sustained shift; BOCPD benchmarks them. The liveness gate skips a
dormant venue. Attribution proposes coincident causes for a flagged day.

SURFACE. A multiplicative briefing score ranks every candidate signal; a
new/continuing/resolved novelty chain suppresses standing items; the output is a ranked daily
note.

What differs is where the data lives and which constants the analytics read.

Research path (unbound). CSV to DuckDB at `store/brain.duckdb`, Lune's constants in
`config.py`, the CLIs and `sim/` scripts and the test suite. This is the configuration that
produced every number in the dissertation, and section 20 now proves portably that the
multi-tenant refactor left it untouched.

Compute path (bound). `POST /compute` receives a dataset, `compute/engine.run()` opens a
temporary DuckDB, `compute/loader` turns the daily aggregate back into the line-grain rows the
L1/L2/L3 views expect, the existing analytics run unchanged, the bundle is drained, the store
is deleted. Two ContextVars carry the request: the scratch store path and the org profile.
Nothing persists.

Design principle (enforced): the statistical detection layer is blind and returns null where it
has no feed for a cause; it never misattributes. The reasoning and attribution layer, on
meeting a flagged null, pulls candidate factors and reports coincidences with evidence, keeping
coincidence strictly separate from causation. Enrichment never rewrites detection. Section 15
is where this principle paid out: the honest output is "unexplained by the covariate set," and
two rounds of diagnosis have now failed to change it.

---

## 4. Forecasting methodology: the ladder and the gate

Seven rungs. A rung is adopted only if it beats BOTH seasonal-naive AND the robust-DOW
baseline on 6-fold rolling MASE. No hand-picking.

Full committed ladder MASE (`models/ladder_results_L1_*.md`):

| Rung / model | Beer Hall | Two River Taps | Ellel |
|---|---|---|---|
| 0 seasonal-naive | 1.006 | 0.673 | 0.924 |
| 1 robust DOW median | 1.029 | 0.737 | **0.572** |
| 2 ETS (add trend + add seasonal, period 7) | 0.799 | **0.597** | 0.825 |
| 2 STL (period 7, robust) | 1.125 | 0.829 | 0.629 |
| 3 HistGBM (recursive) | 0.927 | 0.602 | 0.813 |
| 3 global GBM | 0.920 | n/a | 0.936 |
| 4 Chronos-2 (univariate) | 0.793 | 0.636 | 0.581 |
| 4 Chronos-2 + exogenous | **0.745** | 0.612 | 0.591 |

Bold marks the served winner. prophet is not installed.

Model mechanics (`models/ladder.py`):
- Rung 1 robust DOW: per-day-of-week median, scaled by a monthly index (month median over
  overall median) clipped to [0.5, 2.0], times a bank-holiday factor. No fitting.
- Rung 2 ETS: statsmodels ExponentialSmoothing, trend='add', seasonal='add',
  seasonal_periods=7.
- Rung 2 STL: period 7, robust=True.
- Rung 3 HistGBM: max_iter 400, learning_rate 0.05, max_leaf_nodes 31, min_samples_leaf 10,
  l2_regularization 1.0. Forecasts recursively on its own lag features.
- Rung 4 Chronos-2: amazon/chronos-2 via Chronos2Pipeline, in the Python 3.12
  `.venv-forecast` (chronos-forecasting 2.3.1, hard-pinned as the reproducibility anchor).
  Zero-shot, no per-venue training. Returns q10/q50/q90; the served point is q50 clipped at 0.

Cadence: RETRAIN_CADENCE_DAYS = 7, plus a change-point trigger. INGEST_STALENESS_DAYS = 1.
CP_RELEARN_MIN_DAYS = 28.

Verdict: Chronos-2-exo is the go-live Beer Hall L1 model. TRT and Ellel keep their simpler gate
winners. Simple-beats-complex on the two thin venues is a real result, honestly served.

Caution for the compute path, unchanged and still the most important open coordination item:
the ladder never re-runs there. `bundle.ladder_selection` comes back empty on every call,
verified against the engine rather than assumed. Section 18 and contract open decision 6.

---

## 5. Exogenous covariates (15, the CHRONOS2_EXO_COLS set)

Four families, all nominally known-future. Counted directly from `models/foundation.py`:
`_CALENDAR_EXO` 4, `_EVENT_EXO` 1, `_WORLD_CUP_EXO` 6, `_WEATHER_EXO` 4.

Calendar (4): `is_bank_holiday`, `is_ellel_event`, `exo_is_school_term`, `exo_is_uni_term`.

Event (1): `exo_fixture_nearby`, curated Lancaster anchors.

World Cup, code-derived (6): `wc_match_in_hours`, `wc_england_in_hours`,
`wc_scotland_in_hours`, `wc_home_nation_in_hours`, `wc_n_matches_in_hours`, `wc_any_match`.
Raw and un-ranked; the model weighs them.

Weather, per-venue forecast basis (4): `exo_temp_c`, `exo_rain_mm`, `exo_sunshine_hrs`,
`exo_is_dry`. WEATHER_TRAIN_BASIS = hindcast, WEATHER_FORECAST_MAX_DAYS = 16. The
observed/ERA5 basis is never used for training, because it would leak into the backtest.

Derivation principle: the World Cup schedule (`ingest/world_cup_schedule.md`, Nam-authored,
all 104 matches raw) is raw input. The code derives relevance by checking whether a kickoff
(London time) overlaps the venue's data-derived trading-hours envelope (a robust 1st/99th
percentile envelope per day of week, not literal min/max). Nothing is hard-coded as important.

The envelope reads `line_items.ts`, so six World Cup covariates depend on per-transaction
detail. Ryan's brief asserted nothing in the pipeline reads intraday detail; that is false, and
the aggregate-only grain it proposed would have silently zeroed those covariates and served a
degraded Chronos-2 model under its full name. The resolution keeps the clean aggregate grain:
the API supplies `trading_hours` as a first-class contract field. Caller obligation 6.

On the compute path the exo set is gated by family. A new tenant defaults to weather plus
calendar; sports and events are opt-in per profile. Unbound resolves to all on.

Contract hole found and closed. `ExogenousRow.values` is a free `dict[str, float]`, so
`extra="forbid"` does not reach inside it, and a caller sending `exo_tempc` passed validation
and received a univariate forecast wearing the exo model's name. Unknown keys are now checked
against `ingest.exog_supplied.KNOWN_EXO_COLS` and reported in `diagnostics`, capped at 10 names
plus a marker. `KNOWN_EXO_COLS` is a literal rather than an import (importing `models` from
`ingest` inverts the layering) with a test asserting the two agree.

### 5.1 `is_ellel_event` is a train/serve asymmetry (G15a, report 36)

This was in no report before G15 and it changes how the cross-venue limitation is written up.

On the Beer Hall frame, `is_ellel_event` is a binary "did the booking-led venue trade that day"
flag, populated from observed trading (`features/build_features.py:189`, via
`event_venue_dates()`, which reads the store). On **every** forecast horizon it is **pinned to
0**. `compute/forward.py:125` documents the convention deliberately and
`sim/build_frozen_forecast.py` uses the same one, on the sound reasoning that a forecaster
standing at the cutoff does not know the event venue's future bookings.

So the served Beer Hall model is fit on a covariate informative on **66 of its 399 training
days** and constant at 0 on every day it ever forecasts. Train and serve disagree on a column
the model was fit on. That is the same species as report 33's `exo_is_dry` defect, with one
difference: this one is documented rather than hidden. Documented is better. It is not
harmless, and nobody had measured it.

The measurement is section 15.2. In short: the effect is real, correctly signed, consumed by
the served model, and far too small to carry the 11 July miss.

FLAG-CROSS-VENUE-BLIND, open, structural.

---

## 6. Conformal prediction (the normal-range band)

Split conformal. Source: `conformal/wrap.py`.

`q = k-th smallest of |residual|`, `k = ceil((n+1) * level)`, `band = yhat +/- q`.
Distribution-free, finite-sample coverage, no Gaussian assumption. CONFORMAL_LEVELS = (0.80,
0.90). Recalibrated per 7-day rolling block on residuals strictly before it, so no leakage.

Mondrian variant: group-conditional quantiles split active days from structural-zero days, so
a closed venue's near-zero residuals do not shrink a busy day's band.

Coverage gate: empirical coverage within plus or minus 3 percentage points of nominal.

The band is valid to 7 days and nowhere further. FLAG-BAND-HORIZON. Every residual is at most
a 7-step error, so applied unchanged past that the quantile understates the interval. Measured
on a drifting weekly series, 900 days, `rung1_robust_dow`, 26 residuals per step:

| step | 1 | 7 | 14 | 21 | 30 |
|---|---|---|---|---|---|
| pooled 90% coverage | 100.0% | 96.2% | 84.6% | 88.5% | **80.8%** |
| per-step 90% coverage | 96.2% | 96.2% | 96.2% | 96.2% | **96.2%** |

Direction decides it. At 7 days or below the band over-covers, split conformal's safe failure
mode. Past 7 it under-covers silently. Per-step calibration fixes it and is deliberately NOT
adopted, because it changes the banding method and this project adopts a method only when it
beats a gate on held-out folds. So `contract.MAX_HORIZON_DAYS = 7` and a longer ask is a 422.
Nothing evidenced is lost: every result in reports 26, 28 and 31 is a 7-day horizon.

Two latent defects the integration exposed, both fixed: the Mondrian grouping was written on
the literal `(0, 1)` rather than `config.STRUCTURAL_ZERO_DOW`, making the config value
decorative on the path that matters most; and the calibration floor was checked on the pooled
residual count before the Mondrian split, so a group of 4 could silently become a "90%
quantile" through `conformal_quantile`'s `k=min(..., n)` clamp. The floor is now per group,
with a marginal-quantile fallback that says so in diagnostics.

A third defect found at round 4 and fixed: the guard protecting the banding method was
asymmetric. Section 19, D2.

Fidelity: implemented in the temporally robust spirit of EnbPI (Xu and Xie 2021). A citation
conflating EnbPI with SPCI (Xu and Xie 2023) was corrected; SPCI's quantile-random-forest step
is NOT built.

---

## 7. Point-deviation detection

`signals/deviation.py`. `z_t = (actual_t - DOW_median_t) / max(half_band_90, eps)`.
DEV_BAND_K = 1.0, DEV_SEVERE_K = 2.0. Sign gives direction. The denominator is the conformal
half-band at 90%, so a z of 1 sits exactly on the band edge and a deviation is by definition a
band breach, tying detection to coverage.

Worked check: DOW median GBP 300, half-band GBP 150, actual GBP 450 gives z = +1.0. The 1 July
England match came in at z = 0.78, inside the band, correctly not flagged.

---

## 8. Change-point detection

`signals/change_point.py`. Three mechanisms.

CUSUM (production): `S+_t = max(0, S+_{t-1} + z_t - k)`, CP_CUSUM_K = 0.5, alarm when
S+ > CP_CUSUM_H = 5.0. Two-sided. Catches sustained drift, ignores a one-off spike.

Persistence (production): CP_RUN_M = 4 same-direction band breaches within CP_RUN_N = 7
trailing trading days.

BOCPD (benchmark): Adams and MacKay 2007, Normal-inverse-gamma, hazard 1/60, CP_LEVEL = 0.90.
Validated against the real TRT closure. Benchmark only.

Closure dormancy: after a confirmed closure, monitoring goes dormant for that venue.

Compute path: `change_point_state` is in the bundle and honoured from `prior_state`; without
it, closure dormancy would reset every run and a closed venue would re-alarm daily. The
detectors are still echoed rather than advanced on the compute path, which is Phase 2's
position and has not changed.

---

## 9. Hierarchy, reconciliation, and the taxonomy decision

`hierarchy/reconcile.py`. Levels: L1 venue total, L2 category, L3 top-k items per category plus
an OTHER residual.

MinT (Wickramasuriya, Athanasopoulos and Hyndman 2019), diagonal WLS:
`ytilde = S (S^T W^-1 S)^-1 S^T W^-1 yhat`, W = diag(per-node residual variance). Coherent to
1e-6.

Locked correction: standard MinT ADJUSTS all levels, so it does NOT preserve the base top. An
earlier plan wrongly asserted the reconciled venue would equal the served L1. MinT's "at least
as good" guarantee assumes UNBIASED base forecasts, and the L2/L3 base is DOW-median which is
biased, so the guarantee does not formally hold. Top-down was rejected on the paper's own
grounds (Hyndman et al. 2011).

Verdict: serve the venue total as PURE Chronos-2-exo, never reconciled downward. For the L2/L3
item split, the choice is measured, not assumed: on the June cycle, Beer Hall MinT 0.662 versus
disaggregation 0.734, TRT 0.810 versus 0.910, Ellel 0.746 versus 0.730. The frozen June
forecast used disaggregation (the pre-registration stands); MinT is the recommendation for the
go-live re-freeze.

### 9.1 Taxonomy drift: decided, and the answer is DO NOT WIRE (report 38)

The previous edition carried this as an ambiguity the dissertation could not afford. It is now
resolved, and the resolution is more interesting than either expected answer.

Confirmed first: it is not wired. `build_hierarchy` takes `since=` and the freeze scripts pass
it; `reconcile()` does not and no caller anywhere does.

Measured blind, cutoff 2026-05-31, June held out, DOW-median-on-revenue base in both arms so
the only thing differing is the node set:

**Beer Hall**

| lookback | capture % | new-item % | MASE all | MASE named | nodes changed |
|---|---|---|---|---|---|
| **whole history (standing)** | **19.3** | 12.6 | **0.852** | **0.742** | - |
| 56 d | 31.8 | 12.6 | 1.160 | 1.073 | 20 |
| 90 d | 28.5 | 12.6 | 1.081 | 1.000 | 17 |
| 120 d | 29.0 | 12.6 | 1.160 | 1.073 | 17 |
| 180 d | 24.9 | 12.6 | 1.160 | 1.073 | 15 |

Ellel moves the opposite way on capture (31.3% down to 15.3%). Do not read Ellel's MASE column;
FLAG-MASE-INTERMITTENT applies.

Three independent grounds for not wiring, and the third decided it:

1. It makes the gated metric worse: Beer Hall L3 revenue MASE 0.852 to 1.08-1.16, from beating
   seasonal-naive to losing to it.
2. It moves the two venues in opposite directions on capture.
3. **It does not fix the symptom it was prescribed for.** `LuneBrew Pilsner`, report 25's
   smoking gun, the GBP 3,484 item dropped into OTHER, is **never selected at any lookback by
   either ranking**. Best rank achieved is 5th, at the shortest window tested, against
   `top_k = 3`.

So the open question had a false premise. The binding constraint is `top_k`, not the ranking
window. Wiring `since=` would have raised Beer Hall capture ten points, read as progress, and
left the named item in OTHER. That would not have been found by wiring it and re-running an
aggregate, which is exactly what "confirm it is wired" would have produced.

Why refreshing degrades MASE, and why that is a metric finding rather than a tuning problem:
refreshing swaps out long-history stable lines and swaps in recent ones. A recently-ranked item
has a short, noisy pre-cutoff history, so its DOW-median base is worse **and** its
seasonal-naive denominator is smaller. MASE is punished twice. `Lager - BH` forecasts
beautifully and is commercially uninteresting. **The node set that scores best is the node set
that matters least, and MASE cannot see the difference.**

That is a genuine limitation of the ruler and it is sibling to FLAG-MASE-INTERMITTENT: there,
MASE flattered a 90% under-forecast; here, it rewards forecasting the wrong items well. Both are
the same underlying point, that the gate the whole ladder is scored on is blind to relevance,
and together they are worth a short methodological subsection rather than two scattered caveats.

A `top_k` change was NOT made. It is the correctly identified next experiment, it needs its own
gate and a cost measurement, and the L3 MASE evidence suggests widening it would make MASE worse
again.

Kept separate: the new-item problem. Held-out revenue from items never sold before the cutoff is
**12.6% (Beer Hall) and 42.7% (Ellel)**. Such an item has no history, cannot be selected by any
ranking window, lands in OTHER by design, and is irreducible. For Ellel that is nearly half the
held-out revenue, so most of Ellel's OTHER bucket is not a drift problem at all.

Report 25's capture figures (26% / 15%) and report 38's (19.3% / 31.3%) are **different
hierarchies, not a before and after**. Report 25 measured the frozen, revenue-ranked node set;
report 38 the standing, units-ranked one. Units versus revenue ranking was checked directly and
is negligible here (ranks agree within one or two places). Never present 26% to 19.3% as
movement.

Compute path emits L1 only, verified. Contract open decision 7.

---

## 10. Briefing and surfacing

`signals/briefing.py`. Multiplicative score:
`score = source_weight * severity_mult * recency_factor * novelty_factor * baseline_trust * direction_bump`.

BRIEFING_SOURCE_WEIGHT: change_point 1.00, stock 0.85, deviation 0.60, checklist 0.40,
sop 0.35. SEVERITY_MULT: critical/high 1.5, medium 1.0, low 0.6, ok 0.0. NOVELTY_FACTOR: new
1.25, continuing 0.80, resolved 0.50. DIRECTION_BUMP: down 1.10, up 1.00.
BASELINE_TRUST_SPARSE 0.5. RECENCY_FLOOR 0.5.

Novelty is the false-alarm control. `briefing.run()` persists the `briefing_runs` chain and
diffs new/continuing/resolved; `briefing.build()` does not persist. The June sim used `build`
per day (fatigue was an un-suppressed upper bound); the July sim used the persisted chain and
reported the real number: 0 new items across the July week, 8 standing items all correctly
suppressed.

Compute path: `briefing_chain` is carried both ways in the contract. Omit it and every standing
item re-fires daily, removing the false-alarm control entirely. Ryan's Prisma sketch covers
`served_model` and `watermark` but not the chain; it needs a home if the briefing signal is
wired. It is also unbounded in content, which is FLAG-PRIORSTATE-CONTENT-UNBOUNDED (section 19,
D5).

---

## 11. Liveness gate

`store.active_span`, consulted by the serving path. A venue is dormant if it has had zero
trading for N consecutive days (default 21) or reports an authoritative inactive status.
Distinct from the staleness `is_closed`. A dormant venue gets no forecast and a dormant marker,
not a positive projection. Reactivation resumes forecasting automatically. Generic rule, not a
TRT special-case.

This fixed June's concrete miss: a GBP 5,329 forecast for a venue that recorded GBP 0. It has
held three times: June, 1 to 7 July, and 8 to 14 July.

It is also the reason D3 (section 19) is left open. Every candidate fix for the reopening
false-reject exempts a dormant venue plus one mistyped recent row, which relights a dead venue
and reproduces the GBP 5,329 failure through the front door.

---

## 12. Data architecture and cadence

Research path. One store: the brain's DuckDB (`store/brain.duckdb`, gitignored), rebuilt from
the committed CSV seed, holding `l1_daily`, `l3_item_daily`, `forecasts`, `bands`,
`served_forecast`. Disposable and rebuildable. `CsvAdapter` remains as the research bootstrap.
`BRAIN_STORE_DIR` overrides the path, and G16a used it to point two different trees at one
store copy (section 20).

Production path. The brain holds no database connection at all. `NeonAdapter`, `SquareAdapter`,
`_InertLiveAdapter`, `_to_txn_schema` and the psycopg path are deleted, not disabled
(`ingest/sources/base.py` went from 245 to 109 lines). `INGEST_SOURCE=neon` now fails loudly
rather than silently serving the committed CSV seed while an operator believes they are live.
Removing the code also retired security finding L3 (a real latent `NameError`) rather than
fixing a path that should not exist.

This retires FLAG-STORE-SOR as a question. The API owns persistence; the brain owns compute. The
research DuckDB is a local artefact of the dissertation, not a system of record.

Cadence (section 4). Event-aware refresh policy: inside a flagged high-volatility window the
cadence tightens (EVENT_REFRESH_CADENCE_DAYS, default 1 to 3), owner-controllable,
calendar-triggered. Inference-only, so tightening costs seconds not a training run. Honest
finding, doubly evidenced: Beer Hall error is flat below weekly (7-day 1.45), so tighter refresh
buys responsiveness, NOT accuracy, on a strong-seasonality zero-shot model. Section 14 gives the
second, independent line.

Cadence on the compute path is not wired. `_should_refit`, `RETRAIN_CADENCE_DAYS` and the
event-aware tightening still read the research store's watermark rather than the injected
`prior_state.watermark`. This remains the most important gap for Ryan's nightly cron
orchestration. Section 18.

Simulation channel, unchanged. The Claude Code Square MCP connector on Nam's machine is a
separate read-only OAuth channel used to pull actuals for simulation. It stands in for, but does
not exercise, any production ingest path. A stated dissertation limitation.

---

## 13. Live-simulation methodology (pre-registration)

Two-pass design, the backbone of the evaluation.
- Pass 1 (freeze): generate the forecast from data up to a cutoff, write it to a committed
  artefact, commit. No actual read.
- Pass 2 (confront): pull held-out actuals, score, run the full brain. `git log` proves the
  freeze commit predates the pull.

Two hard invariants: the forecast is frozen before any actual is seen; pulled actuals are
evaluation-only and never written to the served store.

Leak boundary: during a pre-registration test the target month is held out. Once the test is
complete and frozen, that month becomes observed history and may be ingested to advance the
operational clock. Frozen artefacts are never re-touched.

Three windows complete:
- June (G12.13a/b): frozen commit `1d966be`, confronted. Airtight by commit ordering.
- July 1 to 7 (G12.17a/b): frozen `7d103aa`, confronted. The served operational cycle.
- July 8 to 14 (G12.17c): TWO origins frozen 2026-07-10, window closed 2026-07-14, actuals
  pulled 2026-07-16. Origin A (`a590f91`, June-30 cutoff, 9 to 15 day-ahead). Origin B
  (`9dd9028`, July-7 cutoff, production-faithful 7 day-ahead).

The July 8 to 14 window is the strongest form available: every target date was in the future at
freeze time, so it is airtight by CALENDAR, not merely by commit ordering. A reader who
distrusts git history entirely still cannot attack it. Both frozen artefacts were byte-identical
to their Pass-1 state at confront time, and `sim/confront_july_w2.py` asserts the store ceiling
is 2026-07-07 with zero rows in the held-out window before it scores anything. That assert is
not decorative: it is what stopped C2 scoring July forecasts against a May-seed store when
FLAG-STORE-DURABILITY fired mid-session.

Actuals provenance: `sim/july2026_w2_actuals_l1_raw.json`, Square MCP-SIM, pulled 2026-07-16,
merchant ML1FFAGJMQBTZ, view SalesUK, measure `net_sales_minus_auto_gratuity`, ex-VAT.

**This artefact carries a false claim and it is deliberately not corrected.** Its prose credits
the Events exclusion to `config.EXCLUDED_VENUES`, which never performed any exclusion (section
15.3). Editing prose inside a pre-registration evidence artefact, even to make the project look
more correct, is a worse failure than the stale claim. The artefact remains an accurate record
of what was believed on 2026-07-16, which is what an evidence artefact is for. The correction
lives in report 36, `FLAGS.md` and the decision log.

Reproduction: `.venv-forecast/bin/python -m sim.confront_july_w2`.

---

## 14. Experimental results (locked)

Forecast accuracy (Beer Hall L1):

| Window | Horizon | MASE | Coverage @90 |
|---|---|---|---|
| June, cold | 30-day | 1.64 (weekly-rolling 1.47) | not scored |
| July 1 to 7 | 7-day | 0.386 | 1.00 |
| July 8 to 14, Origin B | 7-day | **0.287** | **1.00** |
| July 8 to 14, Origin A | 9 to 15 day | **0.285** | **1.00** |
| Backtest class | 6-fold rolling | 0.745 | not applicable |

Claim that survives: at its serving horizon the forecast is accurate and the band is honest.
Claim that does NOT survive scrutiny and must not be made: that the model is better than its
backtest. Two 7-day windows on one venue is not a distribution.

The band is the quietly strong result. Coverage 1.00 on both July windows, and on 11 July the
point forecast was wrong by plus GBP 574 and the actual still landed inside the band. The
split-conformal layer did its job precisely where the point forecast failed worst. A general
manager acting on the band would not have been misled on the day the model was most wrong. Frame
the band as the deliverable and the point forecast as its input.

Origin B does not beat Origin A. 0.287 versus 0.285, and worse on the window total. An honest
null. It corroborates report 24's cadence sweep from a completely different direction: one is a
sweep over refresh intervals on historical folds, the other is two pre-registered blind
forecasts from different origins. They share no method and agree.

Ellel is a trap, not a result. C2 scored Ellel at MASE 0.096, which looks like the best number in
the project. It hides a 90.2% under-forecast: the model said GBP 56.30 and the venue took GBP
574.63, breaching the band. Ellel's seasonal-naive denominator is large on a series that is
mostly zero with occasional event spikes, so real absolute errors divide down to nearly nothing.
FLAG-MASE-INTERMITTENT. Never quote Ellel's MASE alone, never rank Ellel against Beer Hall on
MASE, always report absolute error and coverage alongside.

Operational results:
- Liveness gate: June's GBP 5,329 forecast for a dead venue became no forecast and no alarm, and
  held again in both July windows.
- Briefing fatigue: 0 new items per week with the persisted chain, 8 standing items suppressed.
- MPS versus CPU: MPS is SLOWER than CPU for these small single-series forecasts (about 3.2s
  versus 0.6s); transfer overhead dominates. Parity exact (GBP 0.0002). Run on CPU. Confirmed
  independently by Ryan's Docker CPU-only call.

New, and worth its own line. **Forecast generation is reproducible from the store, to the
penny.** G15a's control arm reproduced the committed Origin B 11 July forecast at GBP 1558.28
with a gap of 0.00. This is the first evidence in the project that the generation path is
reproducible at all, and report 33 was explicit that the C2 confront re-scores a frozen artefact
and therefore never proved it. It is deliberately NOT called bit-reproducible: what was measured
is agreement to the penny on one venue-day. The stronger claim needs full-precision output over
seven horizon days and three venues, which nobody has run.

Home-nation fixture effect (report 24, June, directional, 3 England plus 2 Scotland dates):
England plus 130%, Scotland plus 116%, other match plus 57%, no-match plus 55%. THIS DOES NOT
SURVIVE AS STATED. Sections 15 and 16. Decision log row 15(b) carries a forward pointer to row
21. Do not quote "England plus 130%" anywhere without that pointer.

---

## 15. The falsification: the central finding

This is the spine of the evaluation chapter, and the reason the evaluation design is the
contribution rather than the accuracy number.

Report 27 (1 July, England round of 32). The model anticipated the fixture. DOW baseline GBP
296.00, frozen forecast GBP 487.00 (lifted plus GBP 191.00), actual GBP 746.99 (realised plus
GBP 450.99). It under-shot the magnitude and moved the right way for the right reason. Report 27
called it single-case and directional, which was correct and disciplined.

Report 29 pre-registered the next test explicitly, including the expected direction and
magnitude: Origin B would not sharpen the England anticipation (plus GBP 308.88 versus Origin
A's plus GBP 311.57) but would raise the generic-match anticipation, narrowing the
England-minus-generic premium from plus GBP 181.36 to plus GBP 134.22. Written down before the
data existed.

Report 31 (11 July, England quarter-final). The expectation was confirmed at the expectation
level and reality inverted the sign.

| Case | Kickoff | DOW baseline | Forecast | Anticipated | Actual | Realised | Direction |
|---|---|---|---|---|---|---|---|
| 1 Jul R32 | 17:00 | 296.00 | 487.00 | +191.00 | 746.99 | **+450.99** | correct |
| 11 Jul QF (Origin A) | 22:00 | 1253.62 | 1565.19 | +311.57 | 984.62 | **-269.00** | **wrong** |
| 11 Jul QF (Origin B) | 22:00 | 1249.40 | 1558.28 | +308.88 | 984.62 | **-264.78** | **wrong** |

Realised England-minus-generic premium: minus GBP 315.66 (A) and minus GBP 299.23 (B), against
a pre-registered plus GBP 181.36 and plus GBP 134.22. Two-case record: 1 for 2. The in-context
fixture anticipation is bounded, not established. `generalises: false`.

The refuted explanations are the methodological set-piece. There are now two of them.

**Refutation 1, kickoff time (report 31).** Norway v England kicked off 22:00 against a Beer
Hall Saturday envelope closing 23:27, so about 1.5 hours fell in hours, against a full prime-slot
overlap at 17:00 on 1 July. Mechanistic, fits, and the data refuses it:

| Date | Fixture | Kickoff | DOW | Actual | DOW median | Lift |
|---|---|---|---|---|---|---|
| 17 Jun | England v Croatia | 21:00 | Wed | 607.09 | 271.15 | +124% |
| 23 Jun | England v Ghana | 21:00 | Tue | 334.93 | 120.77 | +177% |
| **27 Jun** | **Panama v England** | **22:00** | **Sat** | **3081.50** | **921.47** | **+234%** |
| 1 Jul | England v DR Congo | 17:00 | Wed | 758.54 | 336.83 | +125% |
| **11 Jul** | **Norway v England** | **22:00** | **Sat** | **984.62** | - | **-21%** |

27 June and 11 July hold day of week and kickoff hour constant and invert the outcome.

**Refutation 2, weather (report 36, G15a.1).** The one exogenous family report 31 named and did
not compare. Pulled on two separate bases for both Saturdays, plus a revision control the spec
did not ask for.

| Date | View | `exo_temp_c` | `exo_rain_mm` | `exo_sunshine_hrs` | `exo_is_dry` |
|---|---|---|---|---|---|
| 27 Jun | model saw | 25.6 | 0.1 | 15.000 | 1 |
| 27 Jun | **occurred** | **23.1** | **0.5** | **15.232** | **1** |
| 27 Jun | hindcast today | 25.6 | 0.1 | 15.000 | 1 |
| 11 Jul | model saw | 27.2 | 0.0 | 15.086 | 1 |
| 11 Jul | **occurred** | **25.2** | **0.0** | **16.133** | **1** |
| 11 Jul | hindcast today | 27.3 | 0.0 | 15.131 | 1 |

On what actually occurred, 11 July was **2.1 C warmer, 0.90 hrs sunnier, and equally dry**. Both
Saturdays were warm, dry and sunny, and 11 July was the better of the two on every axis. For
weather to explain the swing it would have to act opposite to its sign on all three continuous
covariates simultaneously. **Refuted, by the same 27 June control that killed kickoff time.**

A distinct failure mode was found and named separately rather than folded in. The model was
conditioned on a **warmer, duller** 11 July than the one that happened: 27.2 C against 25.2
(+2.0 over-forecast), 15.086 hrs against 16.133 (-1.05 under-forecast). That is a
forecast-of-a-covariate error, in the direction that would inflate a revenue forecast, so it is a
named contributor of unquantified and probably small size. It is not the explanation: 2 C on a
day the model over-forecast by GBP 574, and the same 2 C gap sits on 27 June, the day the model
got right. The revision control earns its place: `hindcast today` reproduces `model saw` almost
exactly, so the archive was NOT revised and the gap is forecast-versus-reanalysis, the
real serving condition. Dissertation-notes limitation 9 is confirmed as stated and now has a
measured size.

No model was fitted on n=5 fixture dates. The project does not report what n cannot carry.

### 15.2 Estate substitution: real, correctly signed, and far too small

Hypothesis 2 turned out to be sharper than report 31 stated, because the cross-venue term
already exists (section 5.1). Three measurements, in order.

**The unconditional association, day-of-week matched.** Beer Hall revenue on Ellel-active days
against Ellel-quiet days, n = **66 active / 333 quiet** (which sums to the 399-row frame).

**Day-of-week-matched effect: GBP -23.40.** Sign: **negative. Substitution, not complement.**

That refutes Lune's own stated hypothesis, written into the source: "Lune's hypothesis is that
an Ellel function night lifts the Beer Hall next door" (`features/build_features.py`). It is the
fourth belief this project has killed, after the home-nation uplift, the kickoff-time
explanation, and the Origin-B sharpening.

**The estimator trap, and it deserves a dissertation subsection of its own.** The pooled
comparison, the one anybody would write first:

| | pooled | DOW-matched |
|---|---|---|
| effect | **+GBP 500.18** | **-GBP 23.40** |
| reading | strong complement | weak substitution |

A **GBP 523 swing and a sign inversion from the choice of estimator alone**. Ellel books
weekends (30 of 66 active days are Saturdays, 45 of 66 are Fri/Sat/Sun) and the Beer Hall is
strongly day-of-week driven (Saturday mean GBP 1,406 against Tuesday GBP 24). The pooled
estimate reports the **day-of-week effect** under the name "spillover" and with the wrong sign.
It is a compact, self-contained confounding example sitting inside the project's own data, and
the naive version would have **confirmed the hypothesis the matched version refutes**.

Report the matched estimate as weak: -23.40 against within-cell standard deviations of 300 to
900, with medians disagreeing with means on Fri/Sat. The honest statement is "small, negative,
poorly determined", not "cannibalisation measured at GBP 23".

**Does the served model use it?** Not inert, and the measurement needed two arms rather than the
one specified. Chronos-2 conditions on the whole future covariate path, so "flag = 1 on every
horizon day" is a constant column carrying no within-horizon contrast, while a real booking
presents as a spike on one day.

| Arm | 11 Jul delta | window | max abs daily delta |
|---|---|---|---|
| constant (flag = 1 on all 7 days) | **+47.37** | -80.16 | 47.37 |
| **spike (flag = 1 on one day)** | **-27.50** | -31.68 mean | 38.70 |

The arms **disagree in sign on 11 July**. The spike arm is the operative one and it is
strikingly consistent: every horizon day moves negative, in a tight band of -25.52 to -38.70.
Two independent measurements, a matched historical comparison and a served-model perturbation,
agree on sign and order of magnitude (GBP -23 against GBP -32).

**The 11 July counterfactual.** Origin B's configuration, `is_ellel_event = 1` on 11 July only,
written to a new file with the frozen artefacts untouched.

| | forecast | residual vs GBP 984.62 |
|---|---|---|
| frozen Origin B (committed) | 1558.28 | +573.66 |
| control, flag = 0 (reproduction) | **1558.28** | +573.66 |
| **counterfactual, flag = 1** | **1530.78** | **+546.16** |

**Closes GBP 27.50 of a GBP 573.66 over-forecast: 4.8%.** The mechanism is real, correctly
signed, consumed by the served model, and an order of magnitude too small to matter. Told the
truth about Ellel, the model would still have over-forecast by GBP 546.

The bound is the useful part. This is one date, chosen after the failure was known, with the
explanation constructed afterwards. It does not merely fail to confirm the hypothesis, it
**bounds how much of the miss the hypothesis could ever have carried**, and the answer is almost
none.

### 15.3 The Events arm is untestable, and a dead constant was lying about it

Report 31 named a GBP 779.94 Events booking on 11 July as part of hypothesis 2. The committed
seed export carries **203 Events line items across 2 distinct dates** (2026-05-30 and
2026-05-31, the final two days of the window), against 47,644 for the Beer Hall. The location
has no history at all before 2026-05-30.

**Untestable. A stated non-test, not a result.** A comparison built on n=2 would be theatre.

While scoping it, `config.EXCLUDED_VENUES` was found to have **exactly one occurrence in the
entire tree, its own definition**. Nothing read it. The real exclusion is
`config.FORECAST_VENUES`, an explicit allowlist. Worse than dormant: the committed actuals
artefact credits the exclusion to it, so a dead constant had propagated a false claim into
pre-registration evidence. This is the third constant on this project to look authoritative and
govern nothing, after `vat_inclusive`, `timezone` and `currency`, and the first caught actively
misleading an artefact.

Resolved by deletion, with the real mechanism documented at `FORECAST_VENUES`, and deliberately
not wired in: a denylist fails open (a location added upstream and forgotten is silently
forecast), an allowlist fails closed. FLAG-DEAD-CONSTANT, closed for this instance, pattern open.

### 15.4 Where the falsification now stands

| Hypothesis (report 31 ranking) | Verdict | The number |
|---|---|---|
| (1) weather across the two Saturdays | **refuted** | 11 Jul warmer, sunnier, equally dry |
| (2a) Ellel estate substitution | **real, consumed, insufficient** | 4.8% of the error |
| (2b) Events booking | **untestable** | 203 rows, 2 dates |
| (3) tournament stage | still untested | n=2 stages, same problem as (2b) |

**Both testable hypotheses came back negative. The 11 July shortfall survives diagnosis and
remains unexplained by the covariate set.**

How to frame the whole thing. Not as a model failure. As the design working. A plausible effect
was observed (n=3, June), labelled directional rather than established, a specific numeric
expectation was pre-registered, and the test falsified it. Then two rounds of post-hoc diagnosis
failed to rescue it, and said so. State the counterfactual explicitly: without pre-registration,
the "plus 130% home-nation uplift" would have entered the dissertation as a finding, because it
was real in every window that had been looked at when it was written.

Every G15a finding is **post hoc and exploratory**. The 11 July actual was pulled 2026-07-16 and
scored in report 31; every hypothesis above was specified afterwards. A post-hoc diagnostic may
explain; it may not confirm. None of it may appear beside the pre-registered results of reports
27, 29 and 31 without that distinction on the same page.

Consequence for the exo set: no change made. The covariates stay raw and un-ranked, which is the
decision that let the model be wrong in a legible way.

---

## 16. What remains unexplained, and the one hypothesis worth building for

Three named candidates remain for the 11 July shortfall, and after G15a only one is both
untested and structurally interesting.

1. **Tournament stage.** Group-stage dead rubber against knockout. n=2 stages in the data.
   Untestable on the same grounds as the Events arm.
2. **A cross-venue term with magnitude rather than presence.** `is_ellel_event` is binary, so it
   cannot distinguish a GBP 385 Ellel event from a GBP 3,000 one, and it is pinned to 0 on every
   horizon regardless. The 4.8% ceiling was measured with the binary flag; a magnitude-carrying,
   horizon-populated term is a different experiment. It needs the API to feed forward booking
   values, which is a Track B dependency, not a brain change.
3. **Something outside the covariate set entirely.** The honest default, and currently the
   leading position.

The publishable framing is unchanged and now better evidenced: the architecture models venues
independently apart from one binary presence flag, and the estate has at least one substitution
channel that flag cannot express. That is a structural limitation of the whole design rather
than a covariate gap, and it would be invisible to any single-venue evaluation. Flag it as
future work with a named mechanism and a measured ceiling.

---

## 17. The stateless compute contract

The brief's central call: the brain stops touching a database and becomes pure compute. Adopted,
and it deleted more work than it created.

The seam. The obvious reading is "refactor the compute functions to take injected frames", about
157 call sites across roughly 25 modules. The brief's own section 4.1 says otherwise and is
right: keep the embedded engine as ephemeral per-request scratch. Load the supplied rows,
compute, emit, discard. Then the call sites do not change at all.

That needed exactly one thing. `connect()` must resolve its database at CALL time. It could not,
because `from config import DUCKDB_PATH` binds at import.

The override is a ContextVar, not a module global. Load-bearing. A module global makes
`test_a_thread_without_a_scratch_sees_the_real_store` fail with a background thread reading a
request's scratch path, which is precisely the cross-request leak. Starlette runs sync endpoints
in a threadpool, so this is not hypothetical.

```
API  -> dataset {org_profile, sales_daily, trading_hours, exogenous, prior_state} -> compute
API  <- bundle  {forecasts, bands, served, watermark, dormant, chains, diagnostics} <- compute
```

The contract (`compute/contract.py`, `brain/CONTRACT.md`) is strict: unknown top-level fields are
rejected. It carries three pieces the brief's sketch omitted and the engine needs back:
`served_model` (or promotion restarts every run), `watermark` (or the refit cadence collapses),
and `briefing_chain` (or every standing item re-fires daily).

Isolation was attacked, not asserted. A security review was told to assume the claim false and
prove it, across six angles including live execution against the real store. It could not be
falsified. Eight concurrent sync-endpoint requests kept distinct scratch paths across a forced
150ms overlap with zero cross-mutation. A bare `_SCRATCH_DB.set()` with no reset, on a provably
reused anyio worker thread, did not survive, because anyio does `copy_context()` per submit.
`duckdb.connect` appears exactly once outside tests. A fabricated `ATTACKER_ORG` run returned
only its own venue, left the served store byte-identical, and left zero scratch residue.

The caveat is now a caller obligation: isolation holds by ABSENCE. There is no
`ThreadPoolExecutor`, `joblib` or `multiprocessing` anywhere in the analytics, and a bare
`threading.Thread` started inside compute begins with an empty context and falls back to
`config.DUCKDB_PATH`, which is Lune's real store.

**The headline defect, still the single most important thing for anyone wiring persistence.**
The Phase 2 compute path returned a BACKTEST, not a forecast. `_forecast_venue` called
`conformal.wrap.evaluate()` and drained the rows it wrote. `evaluate` walks the series in 7-day
blocks and persists the last `TEST_WEEKS` as its deliverable. It is the coverage evidence behind
report 31. It is not a prediction. Measured on 200 days ending 2026-07-19: 57 forecast rows, 0
for dates after the history, 57 for dates already past, all banded and `served_model`-named. A
`brain_forecasts` table would have filled with predictions for the past.

It survived because the Phase 2 tests asserted the venue set and the band levels, both of which
pass on a backtest. Nothing asserted a `target_date` was in the future, because "the forecast is
about the future" felt too obvious to test.

`compute/forward.py` is the fix, reusing validated pieces rather than inventing a second
forecaster: the same `rolling_point_forecasts` residual stream, the same Mondrian grouping, the
same `conformal_quantile`, the same `calendar_features` and `_attach_exog`.

Two more bugs found by building rather than planning. An org with no sales returned 503, because
an empty `line_items` frame carries no dtypes, DuckDB infers `date` as INTEGER, and the L1 view
fails to bind `dayofweek()`. That is the first thing a brand-new tenant would hit. And the
contract committed the failure it legislates against, inverted: `extra="forbid"` stops a caller
believing it sent an unknown field, while `exogenous`, `horizon_days`, `exo_enabled` and the
per-venue profile all validated cleanly and were dropped on the floor, precisely because they
passed. Each unconsumed field now reports itself in the bundle.

`expected_totals` is not a translation of Lune's asserts. Those live on the CSV bootstrap and
never reach compute, so Phase 3's stated task of deleting them had nothing to delete. The field
was repurposed to catch the CALLER's failure: a paged sales query that silently drops rows hands
compute a short series, and a short series does not error, it forecasts low. Mismatch beyond 1%
is a diagnostic rather than a refusal.

Weather fetch, decided by building it. CONTRACT.md section 4 recommended compute keep one
outbound call. Refuted: compute's store is a per-request scratch DB, so there is no cache to
amortise against. It is one synchronous Open-Meteo round trip per venue per request, in a route
with no concurrency cap, against a rate-limited public API. The API supplies weather instead, on
the hindcast basis.

### 17.1 Caller obligations are now canonical in CONTRACT.md

Before G16c the numbered list existed in reports 33 and 35 and **nowhere else**. `CONTRACT.md`
had one prose mention of the weather obligation and no list. Reports are dated snapshots by this
project's own convention, so Ryan's obligations lived in two documents that are records of a
step, while the document he builds against had nothing. The content was right and it was in the
wrong file.

`CONTRACT.md` section "Caller obligations" is now canonical. Reports 33 and 35 keep their copies
as the dated record and point at it. Twelve obligations:

1. `bundle.org_id` is echoed, never an authorization statement. Assert it matches and persist
   under the orgId already authorized.
2. Weather must be hindcast basis. ERA5 will not error; it will flatter the backtest.
3. `sales_daily` must be ex-VAT. The brain applies no VAT rule.
4. `exogenous` must span training history AND the full horizon, or the exo entrant raises rather
   than degrading to univariate.
5. `structural_zero_dow=[]` means no closed days. There is no "unset".
6. Supply `trading_hours`. Compute cannot derive it from a daily aggregate, and six World Cup
   covariates depend on it.
7. `sales_daily` dates are closed history. A row after today is refused; it would otherwise
   become the forecast origin and the watermark, and the poisoned watermark compounds through
   `prior_state`.
8. `horizon_days` is at most 7. A longer ask is a 422, not a wide band.
9. Set a request-size limit at the ingress. Compute's row caps fire only after pydantic
   materialises every row, so they bound absurdity, not memory.
10. Do not start a bare thread inside compute. Propagate with `contextvars.copy_context()` or do
    not thread.
11. Read `diagnostics`. Absent weather, unknown covariates, a dataset that does not reconcile, a
    cold-started model, a thin Mondrian group and an unhonoured `stock_enabled` are reported
    there and nowhere else.
12. **NEW (G16c).** Decide how to handle a reopening venue, because it fails the whole request. A
    venue reopening after a long closure is refused for its first `MIN_SEGMENT_DAYS` of trade,
    and since the validator raises on `ComputeDataset`, one reopening venue takes down the
    forecast for every sibling in the same call. Options: per-venue requests,
    retry-minus-the-offender, or surfacing the refusal. That is an availability decision and it
    is the caller's. **The G15b fix made this more likely, not less** (section 19, D1), and from
    the caller's side that reads as a regression, because in availability terms it is one.

A concurrency cap on `/compute` belongs in the deployment. anyio's default is 40 concurrent,
each holding Chronos and several GB.

---

## 18. De-Lune and multi-tenancy (Phase 3)

`org_profile.py`, 199 lines. One ContextVar, bound per request beside the scratch store, plus
accessors the analytics read instead of `config`.

```
UNBOUND -> config.py (Lune)      BOUND -> the profile, entirely
```

Unbound is NOT a per-field fallback. It is the research path: the CLIs, `sim/` and the test
suite bind nothing and resolve to Lune's constants, which is what keeps report 31's
pre-registered result reproducible from shipped code after the engine went multi-tenant.

Bound is TOTAL, and this half is load-bearing. A bound profile with `structural_zero_dow=[]`
means this venue has no closed days, not "unset, use Mon/Tue". A per-field fallback would hand
Lune's closure to a tenant that trades seven days, and it reaches the Mondrian conformal
grouping, so the damage would surface as a quietly miscalibrated band rather than as an error.
Both halves are pinned by `tests/test_org_profile.py`.

What was de-Luned:

| Constant | Was | Now | Reaches compute? |
|---|---|---|---|
| `STRUCTURAL_ZERO_DOW` | `frozenset({0,1})` | per-venue | yes, feature AND Mondrian grouping |
| `EVENT_ONLY_VENUES` | `frozenset({"ellel"})` | per-venue `is_event_driven` | yes |
| `FORECAST_VENUES` | 3 Lune slugs | `org_profile.venues()` | yes |
| `WEATHER_CELLS` | slug to cell map | `lat`/`lon` presence | yes |
| `EVENT_SCOPE` | Lancaster/Preston | `{"all"}` for tenants | yes |
| bank holidays | `subdiv="England"` | `country_holidays(profile.country)` | yes |
| `_ellel_event_dates` | hardcoded `"ellel"` | `event_venue_dates()` | yes |
| `PRICE_REGIME_BREAK` | hardcoded `2025-07-01` | `price_change_dates()` (G15d) | yes |

Two were silent wrongness rather than crashes. `dataset_max_date` iterated Lune's three slugs, so
inside a tenant's scratch store every read missed, `.max()` returned `NaT`, and `NaT` poisons
`max()` into an arbitrary answer rather than an error, so `is_closed` returned `False` for every
tenant venue by accident. And `_ellel_event_dates` read the literal slug, so a tenant's
event-spillover covariate was permanently zero.

One landmine disarmed: `models.ladder.global_gbm_predict` pooled `FORECAST_VENUES`. Not reachable
from compute today, but it is the tripwire under contract open decision 6: the moment the ladder
re-fit is wired in, it would call `build_features("beer_hall")` inside a tenant's store.

### 18.1 The price-regime seam (G15d, report 39)

`PRICE_REGIME_BREAK = "2025-07-01"` was a Lune-specific fact (a Q2-2025 step change in
`Lager - BH` pricing) stamped into every org's feature frame. Not a crash; a plausible wrong
number, and a free split point for the GBM.

Now `price_change_dates`, a per-org optional list, and the feature generalised from a flag to a
**count of price changes preceding each row**. A list of dates and a binary column cannot both be
honoured (two changes have three regimes), and the counter degenerates exactly to the old column
at n=1, which is why the frame hashes hold. Column name and dtype unchanged.

Additive and optional: `default_factory=list`, bounded at `MAX_PRICE_CHANGE_DATES = 100`. Absent
means no behaviour change and the API need do nothing. Unbound resolves to Lune's single date;
bound-with-empty produces a flat 0, verified end to end through `calendar_features` rather than
only at the accessor, because "empty means none, not unset" is the rule the whole seam rests on.

Removing the flip left `PRICE_REGIME_BREAK` imported into `build_features` and used by nothing, a
dead import created by the very change that closed a dead constant. Removed in the same commit.

### 18.2 What is NOT multi-tenant-ready

Stated plainly so a reader does not conclude otherwise.

- Compute emits L1 only.
- **The ladder never re-runs.** `bundle.ladder_selection` is `[]` on every call, so a tenant's
  served model is whatever it started as, for ever. Promotion is continuous (compute honours
  `prior_state.served_model` and cold-starts on `default_model`) but the "re-learn on a weekly
  boundary or a confirmed change-point" behaviour the brief describes is not there.
  `_should_refit` and `RETRAIN_CADENCE_DAYS` still read the research store's watermark.
- `stock_enabled` is accepted and reported as unhonoured. The pipeline reads monthly bar-stock
  spreadsheets off disk with no injected path.
- Cross-tenant cold start is not built. `transfer/lovo.py` borrows day-of-week shape from donor
  venues WITHIN one estate, and a new single-venue org has no in-org donor. A cross-tenant
  library must be assembled and anonymised by the API, never by compute reaching across orgs, and
  needs privacy sign-off. Contract open decision 5.

The re-fit gap remains the most important thing for Ryan's orchestration. Building a nightly cron
on the assumption that re-fit already happens produces a cron that loops, calls compute, and
persists an unchanged selection every night. Two options: treat the served model as
fixed-after-cold-start for v1, or wire `_should_refit` to the injected `prior_state` and surface
`ladder_selection` before the cron is built.

Remaining production-readiness gaps: mypy and pyright not run, no type-check CI gate; env-var
config not migrated to pydantic-settings; no uv lockfile (ceilings only, because `.venv-eval`
pins `numpy<2.0` for TSB-AD and `scipy<1.16` for statsforecast, so raising floors makes the venv
behind the pinned VUS-PR numbers unresolvable); structured logging not done; A8 embeddings not
moved to shared Voyage/pgvector.

---

## 19. Four rounds, four rounds with hits

The most instructive finding of the whole arc, and it belongs in the dissertation's reflective
material as well as in Ryan's awareness.

Across four adversarial review rounds, 28 defects have been raised. The number to take away is
not the count. It is that **every round of fixes has contained a defect as bad as the one being
fixed**, and review found them all. Two of the four were worse than the original.

| Round | Reviewed | Wrong fixes found |
|---|---|---|
| 1 | Phase 2 contract | 1 |
| 2 | round-1 fixes | 1 |
| 3 | round-2 fixes | 1 |
| **4 (G15b)** | **round-3 fixes** | **2** |

The yield curve has not turned over. This project cannot claim its fixes converge.

Rounds 1 to 3, briefly, because the pattern matters more than the particulars:

1. The `exo_is_dry` fix made train and serve AGREE, on the wrong value. A test asserting only
   `train == serve` passes both times. The placeholder is now `np.nan` specifically so "derived"
   stays distinguishable from "the caller supplied 0". This one matters most because `exo_is_dry`
   is one of the 15 `CHRONOS2_EXO_COLS` and fed Lune's flagship served entrant.
2. The DoS fix turned a 17-minute hang into a 0.4-second wrong answer. `trim_to_active` trims only
   ZERO endpoints, so a nonzero row dated 2202 survives and takes the forecast origin with it. A
   hang gets investigated; this gets persisted and compounds through `prior_state`.
3. The guard for that was one-sided. A check on the history SPAN whose docstring said "this is
   not a size check wearing a date's clothing" was exactly that: it ACCEPTED `2026 -> 2027` and
   `2026 -> 2036`, and a wholly mis-stamped export (every row at 2202, span an ordinary 199 days)
   was invisible by construction. Replacing it with an absolute FUTURE bound then rejected every
   forward typo and accepted every backward one, and backward is worse: `2026 -> 2016` produces
   seven rows of GBP 0.00 from `rung1_robust_dow`, the right watermark, the served model's name,
   and no error. The final answer segments the data at gaps wider than a quarter, because what
   separates a typo from a season is ISOLATION: a season leaves two large blocks, a fat finger
   leaves a speck and a continent.

### 19.1 Round 4 (G15b, report 37)

Six findings, two confirmed defects, three no-defects honestly reported.

**D1, severe. The round-3 isolation guard did not fire on any real org.** Every word of the
round-3 argument is about one venue's history, and the harm really is per-venue: `read_series`,
the calendar fill, `trim_to_active` and the whole feature build run on one venue's series. But
the check was applied to `sorted({r.date for r in self.sales_daily})`, **the pooled dates of the
whole request**. `_segments` never read `row.venue`.

| Request | Verdict |
|---|---|
| single venue + one 2016-typo row | **REJECT** (the fix works) |
| + a sibling venue spanning 2016 to today | **ACCEPT** (the fix is gone) |
| + a sibling of one row every 60 days, 64 rows total | **ACCEPT** |

**Sixty-four rows defeat it**, and they need not be real trading. Any multi-venue org gets this
free from its own normal data. Lune has three venues; the contract allows 25. So the guard
protected exactly one configuration: a single-venue org. Report 34 closed it as measured and
tested, and both were true, against that one configuration.

Fixed: `_reject_implausible_dates` now segments per venue. Cost at the contract cap (547,500 rows
across 25 venues) is 0.31 s and 5 MB peak. The fix's own blast radius was measured and reported
rather than discovered later: pooling had also been giving intermittent venues accidental cover,
so removing it converts two previously-accepted shapes into rejects. Both are instances of D3.

**D2, moderate. The band-calibration guard was asymmetric**, exactly as the spec predicted.
`if MAX_HORIZON_DAYS > _CALIB_BLOCK_DAYS` fires on the tested path (raising the cap to 30) and
not on the symmetric one (raising `_CALIB_BLOCK_DAYS` to 30 gives `7 > 30`, no raise), where
`rolling_point_forecasts(horizon=30)` rebuilds the residual stream from 30-day blocks and **the
banding method changes under an unchanged 7-day horizon**. The drift is toward over-coverage,
split conformal's safe direction, so no test fails and nothing looks wrong. Fixed to `!=`: the
two symbols are only defensible when they agree, and equality has no asymmetric case to miss.

**D3, moderate, LEFT OPEN by design.** The guard refuses businesses that are neither a season nor
a speck: a venue reopening after a long closure is refused for its first 13 trading days, and the
whole org's request fails with it. The cold-start carve-out does not help, because it is
`if len(segments) == 1` and a reopening venue has two by construction.

Not fixed, and the reasoning is the point. The obvious repair, exempting the trailing segment
since a reopening is always at the end, also exempts a venue whose real history ended months ago
plus one mistyped recent row. That restores forecast-origin poisoning and **relights a dormant
venue**, which is the GBP 5,329 failure the liveness gate exists for, arriving through the front
door. A day-1 reopening is indistinguishable from a typo from inside a single request:
the information that separates them, whether this venue keeps trading tomorrow, is not in the
dataset. Any discriminator built here would be the fourth version of the same mistake.
FLAG-SEGMENT-FALSE-REJECT, pinned by a test that asserts current behaviour and states what would
be required to change it. Now caller obligation 12.

**D4, fixed.** The round-3 message told a legitimately reopening venue that its data was "a
mistyped year, not a trading period", which is false and unactionable. It now names the venue it
is judging, says "most often this is a mistyped year" rather than asserting it, and states the
reopening limitation as a limitation.

**D5, CONFIRMED, deliberately NOT implemented.** `PriorState` bounds the LIST, not the CONTENT.
`briefing_chain` is capped at 1,000 entries and `change_point_state` at 25 venues, but the
elements are `dict` with no bound at all: a 100 MB `briefing_chain` is accepted, held, and echoed
verbatim into `ComputeBundle`, whose fields carry no `max_length`. Same shape as round 3's
sharpest finding, which came from asking what a fix made possible. Not implemented because
`PriorState` is state the API round-trips from its own store, so a new size rule could reject
Ryan's own persisted state. FLAG-PRIORSTATE-CONTENT-UNBOUNDED, recorded as contract-sync input.

**D6, documentation.** Decision-log row 22(k) says `MAX_SALES_ROWS` "is now 200k"; the code says
547,500, re-derived as `MAX_VENUES x 730 x 30`. Corrected by a forward-pointer row, not an edit.
Measured so the cap carries a number: `SalesRow` costs 1,105 B constructed, so the cap admits
about 0.60 GB of models.

**Three findings did not survive contact**, recorded because a review that only reports hits is
not a review: `country` per-venue amplification is bounded by the venue cap as claimed (worst case
50 characters); `MAX_FUTURE_DAYS` survives a non-UK caller (7 days of slack against a real maximum
offset of about one day); `event_venue_dates` really is hoisted to once per request. One
observation short of a defect: the validator calls `date.today()`, so a fixed dataset changes
verdict over wall-clock time and there is no frozen-clock seam for a replayed request or a
recorded fixture. FLAG-VALIDATOR-WALL-CLOCK.

### 19.2 The shape all of them share

Plausible, confidently documented (one docstring denied the exact flaw it had), tested with
passing tests, and **measured only against the case that motivated them**. 2202 and never 2027.
Forward and never backward. Single-venue and never multi-venue.

What worked was not care. It was review run against the FIXES rather than the code, and
measurement of each fix's own blast radius rather than of the case that prompted it. Two of the
sharpest findings came from neither the code nor the review but from asking what the FIX made
possible: capping `values` at 64 keys made a multi-gigabyte diagnostic reachable, and report 33's
own sections 9 and 10 went stale the moment its section 7 was written.

**Round 5 has not been run.** The G15b fixes are unreviewed on a four-for-four record. Treat that
as a real residual risk rather than a formality, which is exactly what report 34 said about round
4 and was right.

---

## 20. The verification gate: rebuilt, and now portable

**This section replaces the previous edition's section 20 entirely. Read the first two
paragraphs even if you skip the rest.**

The previous edition presented three training-frame sha256 prefixes as the gate proving the
multi-tenant refactor moved no research number, and reports 33, 34 and 35 all published them as
such. **Those values were never reproducible.** `git log --all -S` finds them in four markdown
documents and **in no script, in any commit**. The gate the project leaned on could not be run by
anyone, including its author. That is the same failure mode as a document outliving its code,
applied to the check built to catch that failure mode.

Compounding it, `ellel`'s published dimensions were wrong: reports said 386 x 40, the canonical
store gives 392 x 40. Not a hashing convention, six rows. Ellel's series runs 2025-06-08 to
2026-07-04 (392 calendar days under `fill_calendar=True`); 386 implies a 2026-06-28 ceiling, and
the six-day difference is exactly the two July W1 Ellel rows (2026-07-02, 2026-07-04), both
legitimately inside the 2026-07-07 ceiling. Almost certainly FLAG-STORE-DURABILITY firing
unnoticed during report 33's session. `beer_hall` and `two_river_taps` reproduce exactly.

### 20.1 What was done about it

G15a committed `sim/frame_hash.py` with the procedure written down and re-baselined against the
canonical store. G16a then closed the gap report 36 had treated as permanently lost: the
pre-de-Lune tree is still in git and the store is restorable, so the comparison can be made
portable rather than session-local.

`sim/g16a_portable_baseline.py` measures the three hashes against **any** tree in the
repository's history. It carries its own copy of the hashing function (the old tree has no
`sim/frame_hash` to import from) and dispatches on the `build_features` signature it finds,
because Phase 3 introduced `event_venue_dates` where `2cc97e7` had the private
`_ellel_event_dates` with a different signature, and `org_profile.py` did not exist at all.

The comparability rules mattered more than the shim, and a comparison that breaks any of them is
worthless:

| Rule | How it was held |
|---|---|
| Same serialisation | One hashing function, byte-identical to `frame_hash.frame_hash` |
| Same float/NaN/dtype rendering | **One interpreter**: the working clone's `.venv-forecast` ran both trees |
| Same store bytes | **One copy**, `BRAIN_STORE_DIR` pointed at it from both runs |
| Shim believable | **Validated against the current tree first** |

The last rule is the one that makes the result mean anything. Before measuring anything unknown,
the shim was run against `c008651` and reproduced all three known prefixes exactly. A shim that
cannot reproduce a known answer cannot be believed about an unknown one, and a difference it
reported would be indistinguishable from its own bug. The third rule is not hypothetical: it is
precisely the rule that was not in force when report 33 measured `ellel` at 386 rows.

Isolation: a detached `git worktree` at `2cc97e7`, removed at the end. The working clone's tree
and store were never checked out or written to.

### 20.2 The result

| | `beer_hall` | `two_river_taps` | `ellel` |
|---|---|---|---|
| `2cc97e7` (pre-de-Lune) | `8c8a8be9d8dc5791` 399 x 40 | `b6339032a219213c` 331 x 40 | `ea28bcacbf1825e4` 392 x 40 |
| `c008651` (current) | identical | identical | identical |

The two trees really are different, which matters because "both trees agree" is also what a
harness accidentally running the same code twice would show. `org_profile.py` does not exist at
`2cc97e7`, and `git diff --stat 2cc97e7 c008651` over the seven files on the feature and compute
path gives **1,072 insertions and 153 deletions**, including **205 changed lines in
`features/build_features.py`** and the whole 199-line seam.

Two hundred changed lines in the feature builder, and not one byte of movement in any of the three
frames. That is the result.

### 20.3 What it licenses, and what it does not

**Licensed.** The de-Lune provably moved no Lune number, portably, by a procedure anyone can
repeat. That is a stronger claim than report 33 was ever able to make, and it is now the
load-bearing evidence for report 35's central assurance to Ryan.

**Not licensed.** It says nothing about whether the de-Lune is correct for a *tenant*. It says the
research path is unchanged. Bound-profile behaviour is covered by `tests/test_org_profile.py` and
by nothing here.

**Reports 33 to 35 keep their original numbers**, each now carrying a dated annotation pointing at
report 36 section 6(a) and report 40. The reports still read as records of what was believed at
the time, which is what a dated report is for. Report 35 gets the fullest treatment because it
went to Ryan and offered those hashes as the reason to trust a multi-tenant engine; its annotation
says plainly that the trust gate was not runnable when it was handed over, and then gives the
result that replaces it.

### 20.4 The other standing check

C2 re-scores clean through every change, with the store restored to 2026-07-07 and the held-out
window at 0 rows: Beer Hall L1 MASE 0.285 (A) and 0.287 (B), band coverage 1.00, England QF
`generalises: False`.

An honesty note on what that proves, which report 32 got wrong and report 33 corrected.
`sim/confront_july_w2.py` RE-SCORES a frozen artefact; it does not regenerate the forecast. So C2
reproducing validates the store and the scoring, not forecast generation. Report 32 leaned on "C2
reproduces bit-for-bit" as the gate for changes that could affect forecasts. That was over-claimed.
The frame hashes are the check it should have used, and G15a's control arm (section 14) is the
first evidence that generation reproduces at all.

---

## 21. Decisions, verdicts, and deviations from the original method

Locked verdicts carried forward:
- Serve gate-winner per venue: Beer Hall Chronos-2-exo, TRT ETS, Ellel robust-DOW.
- L1/L2/L3: serve pure L1 top; L2/L3 base is DOW-median; item split chosen by measured A-versus-B,
  with MinT recommended for the go-live re-freeze.
- Exogenous set: the full 15 covariates for Chronos-2-exo.
- CPU over MPS, on evidence, independently confirmed by the Docker CPU-only call.
- Weekly cadence is the sweet spot; the event-refresh override buys responsiveness only. Two
  independent lines of evidence.
- Pre-registration two-pass is the evaluation standard; frozen artefacts are immutable, including
  their prose when it is wrong.

Locked verdict RETIRED:
- Home-nation flag preferred over England-only, on evidence. The flag remains in the exo set and
  the model still weighs `wc_england_in_hours`, but the EFFECT it was preferred for does not
  generalise, and two rounds of diagnosis have failed to rescue it. Row 15(b) is superseded by row
  21.

Deviations and corrections, each a real change from the initial plan:

1. `is_ellel_event` self-leak on the Ellel frame neutralised at source (G12.10a2), exposing an
   earlier rung3_gbm Ellel "win" as leakage. Honest number 0.813.
2. MinT top-preservation: the plan wrongly assumed MinT preserves the base top. Corrected.
3. TRT weather cell corrected to `two_river_taps` at (53.8751, -2.7599).
4. Exogenous widening from 4 calendar flags to the full 15-covariate set at G12.10b, AFTER the A14
   ablation was written. This is why the two do not conflict.
5. World Cup features code-derived from a raw schedule, not hard-coded; home-nation flags added
   after the England-only assumption was disproved, then bounded again by the C2 falsification.
6. Croston/SBA tested at L3, lost to DOW-median, logged as honest non-adoption.
7. `wrap.py` citation: EnbPI (2021) versus SPCI (2023) corrected; SPCI not built.
8. Horizon-faithful re-freeze: Origin B added. The result was a null.
9. Taxonomy drift re-diagnosed as drift, not name misalignment.
10. Comment de-AI pass (G12.18): 212 em-dash separators rewritten; 159 runtime-string dashes
    preserved byte for byte.
11. The fixture anticipation was pre-registered and falsified (report 31).
12. Production adapters deleted rather than disabled.
13. VAT removed from the brain entirely rather than made per-org. This also closes the long-standing
    "TRT VAT basis pending confirmation" item by making it moot.
14. `horizon_days` capped at 7 rather than diagnosed at 30. A method limit is answered by refusal,
    not by a warning buried in a diagnostics list.
15. The compute path returned a backtest and now returns a forecast (`compute/forward.py`).
16. **NEW (G15a).** Both testable explanations for the 11 July shortfall came back negative.
    Weather refuted by the 27 June control; estate substitution real, correctly signed, and bounded
    at 4.8% of the error. The Events arm is a stated non-test at n=2 dates.
17. **NEW (G15a).** Lune's own spillover hypothesis, written into the source, is refuted. The
    measured direction is substitution.
18. **NEW (G15a).** `EXCLUDED_VENUES` deleted as a dead constant that had propagated a false claim
    into a committed evidence artefact. The artefact is deliberately left unedited.
19. **NEW (G15a).** Dissertation limitation 4 ("no cross-venue substitution term") was overstated
    and is corrected. The term exists and is consumed; it carries presence rather than magnitude
    and is pinned to 0 on every horizon.
20. **NEW (G15c).** Taxonomy drift measured and the decision is DO NOT WIRE. The open question had
    a false premise: `top_k` is the binding constraint, not the ranking window.
21. **NEW (G15b).** Round 4 found the round-3 isolation guard did not fire on any multi-venue org.
    Fixed per venue, at the cost of a known availability regression that is now caller obligation 12.
22. **NEW (G15d).** The price-regime feature generalised from a binary flag to a count, because a
    list of dates and a binary column cannot both be honoured. Degenerates to the old column at n=1.
23. **NEW (G16a).** The frame-hash gate was never runnable and is now portable. Section 20.
24. **NEW (G16b).** "Bit-reproducible" corrected to "to the penny" in four locations. Same species
    of over-claim that report 33 corrected report 32 for, repeated one report later.

---

## 22. Literature review (locked) and fidelity audit

24 methodology papers audited against the source at a pinned commit. Each method carries a verdict:
faithful reproduction, justified adaptation, or honest non-adoption.

| Method in the build | Paper | Verdict |
|---|---|---|
| Chronos-2 forecaster | Ansari et al. 2024 | Faithful, served, gated |
| MinT diagonal WLS | Wickramasuriya, Athanasopoulos & Hyndman 2019 | Faithful plus top-preserve correction |
| Split conformal band | Vovk; Angelopoulos & Bates | Faithful; Mondrian group-conditional variant |
| Rolling calibration | EnbPI, Xu & Xie 2021 | Adapted; SPCI (2023) not built |
| BOCPD | Adams & MacKay 2007 | Faithful, benchmark only |
| CUSUM | Page 1954 | Faithful, production detector |
| Intermittent demand | Croston; Syntetos-Boylan | Tested at L3, lost to DOW-median, logged |
| Reflection/retrieval (agent) | Park et al. 2023 | Additive equal-weight recency/relevance/importance |
| Calibration (agent eval) | Guo et al. 2017 | ECE binned formula, temperature scaling |
| LLM-as-judge (agent eval) | Zheng et al. 2023 | GPT-4 85% non-tie versus 81% human-human |

About 6 faithful, about 13 justified adaptations, the rest honest non-adoptions or benchmarks. The
full audit is in `PRJ93_Methodology_Fidelity_Audit.md`.

Two entries belong in this audit that are not paper-derived and should be written up as fidelity
results rather than omissions:

- **FLAG-BAND-HORIZON.** The project measured a known limitation of block-calibrated split
  conformal, measured the fix, and declined to adopt it because adopting it would breach the
  project's own gate discipline.
- **The MASE relevance blindness** (section 9.1). Two independent demonstrations that the gate the
  whole ladder is scored on cannot see relevance: it flattered a 90% under-forecast on Ellel, and it
  rewards forecasting commercially irrelevant items well at L3. Worth a short methodological
  subsection rather than two scattered caveats.

Verification discipline: every paper claim traces to the NotebookLM notebook
(d565d5f0-9ad6-446f-9573-2316a2f8c0ca, 103 sources) via targeted section-specific queries; a single
negative retrieval is not proof of absence. Every code claim is verified by a fresh SHA-pinned
clone or a fresh full clone when the API is rate-limited.

---

## 23. Open items and flags

Open, brain side:
- **FLAG-BAND-HORIZON.** Per-step conformal calibration, with the measurement, the sample-size
  arithmetic, and the open question of how per-step interacts with the Mondrian grouping (both
  partition the same residuals; at H=7 they are confounded). Needs a coverage gate per step. A real
  research work package, not a bug fix.
- **FLAG-FIXTURE-ANTICIPATION.** Open, and now the honest negative twice over. Do not re-propose
  kickoff time or weather without new evidence. Section 16 names what is left.
- **FLAG-CROSS-VENUE-BLIND.** The cross-venue term carries presence, not magnitude, and is pinned
  to 0 on every horizon. Structural.
- **FLAG-MASE-INTERMITTENT.** Methodological, applies to every Ellel number, permanent. Now paired
  with the L3 relevance finding.
- **FLAG-STORE-DURABILITY.** Mitigated, not fixed. Section 24.
- **FLAG-TAXONOMY-DRIFT.** Restated as a standing limitation. Not wired, on measurement. The next
  experiment is `top_k`, with its own gate and a cost measurement.
- **FLAG-SEGMENT-FALSE-REJECT.** Open by design. Now caller obligation 12.
- **FLAG-PRIORSTATE-CONTENT-UNBOUNDED.** Contract-sync input, not a unilateral change.
- **FLAG-VALIDATOR-WALL-CLOCK.** Minor; no frozen-clock seam for replayed requests.
- **FLAG-DEAD-CONSTANT.** Instance closed, pattern open. Three instances found so far.
- Round 5 (review of the round-4 fixes) not run.
- 263 `print()` calls. The stated deferral reason has expired: Phase 3 was going to rewrite
  `ingest/` and `store/` and delete 54 of them, and it did not. Needs a new justification or a slot.
- mypy/pyright CI gate, pydantic-settings migration, uv lockfile: none done.

Open, contract (`brain/CONTRACT.md`):
- 4. Transport. JSON is simplest, but `exogenous` is now actually consumed (15 covariates times
  history plus horizon times venues) on top of the sales rows. Decide the NDJSON or Arrow threshold
  rather than discovering it.
- 5. Cold start. Cross-tenant shape library, API-assembled and anonymised, privacy sign-off.
- 6. **Who runs the ladder.** The re-fit wiring. Still the blocking item for Ryan's cron.
- 7. L2/L3 on the compute path.

Open, Ryan:
- PII purge (Phase 0), not started, and the two-remote sequencing.
- Docker, Coolify, Prisma models, endpoints, the venue-to-org gate at the Nest boundary.
- The `sales_events` pipeline and Square backfill.
- The ingress body-size limit and the `/compute` concurrency cap.
- The reopening-venue availability decision (obligation 12).
- The nightly cron decision that depends on contract open decision 6.

Open, James:
- Menu-item-to-stock-name mapping and supplier lead times. Real stock data exists and is no longer
  mock, but the item-forecast-to-reorder link is unwired without both.

Closed since the previous edition:
- The frame-hash gate. Was unrunnable; now portable and committed. Section 20.
- Taxonomy drift ambiguity. Decided: do not wire.
- The 11 July weather diagnostic. Refuted.
- The estate-cannibalisation scoping. Measured, bounded at 4.8%, and the Events arm ruled
  untestable.
- `EXCLUDED_VENUES`. Deleted.
- `PRICE_REGIME_BREAK` on the tenant path. Closed additively.
- Ruff counts. Measured at 70 under ruff 0.15.22; report 39's "environment gap" was an
  under-investigation, since `uvx` was present all along and report 33 section 9 says that is how
  the original counts were taken.
- Caller obligations location. Now canonical in `CONTRACT.md`.

Closed in the previous edition and still closed: FLAG-STORE-SOR (retired by architecture), TRT VAT
basis (moot), glossary placement (`brain/GLOSSARY.md` already existed), Neon provisioning
(superseded).

---

## 24. Known hazards (operational, recurring)

**FLAG-STORE-DURABILITY.** `warehouse.build()` rebuilds from the committed CSV seed, which ends
2026-05-31, so it silently drops the aggregate-ingested June and 1 to 7 July rows and resets the
operational clock five weeks. Nothing warns. The store does not break; it quietly becomes stale.

Measured trigger, narrower than the original wording: TWO modules call `warehouse.build()` in a
module-scoped autouse fixture, `tests/test_a10_service.py` and `tests/test_a1_warehouse.py`, so any
selection collecting either rebuilds. Targeted runs of `test_compute_engine.py`,
`test_org_profile.py` or `test_exog_supplied.py` leave the ceiling untouched.

It has now fired at least six times: twice on 2026-07-16, again on 2026-07-17, twice during G15b,
and, on the strongest available reading, once unnoticed during report 33's session, which is what
produced the 386-row `ellel` measurement that stood in three reports. It also nearly corrupted the
frame-hash verification built to catch this class of error. The one time it was caught only by a
guard was when `sim/confront_july_w2.py` refused to score, which is why that assert is not
decorative.

Mitigation: `sim/restore_clock.py` chains `ingest_june_actuals` then `ingest_july_w1_actuals` (that
order, because July W1 refuses against a June-less store), verifies ceiling 2026-07-07 with 7
July-W1 days, and asserts the held-out window is still empty. Idempotent, no network, reads
committed artefacts only, no-ops when the clock is already right. Run it after any full-suite run
and before reading any gate.

**Documents outlive the code they describe.** Five instances now: `FLAGS.md` against Ryan (the A14
scope correction that never reached the ledger downstream reads); `CONTRACT.md` against itself (a
stale "capped at Rung 1" claim describing a cap `config.py` had retired); report 33's own sections
9 and 10 against its section 7; the frame hashes in three reports against a script that never
existed; and the caller obligations living only in dated reports. When a correction lands, ask
which document downstream actually reads.

**Constants that govern nothing.** Three found: `vat_inclusive`/`timezone`/`currency` on the
contract, and `EXCLUDED_VENUES` in config, the latter having propagated a false claim into a
committed artefact. Grep for single-occurrence constants periodically.

**OneDrive sync interference.** The working clone lives under a OneDrive path, and sync has
reverted committed files, flipped mode bits, and created stash artefacts on at least three
occasions. Move the clone outside OneDrive, or pause sync during agent runs.

**CDN caching.** raw.githubusercontent and jsdelivr can serve stale branch-tip content for hours.
SHA-pin fetches; the commits API returns the true tip; a fresh clone is more reliable than either
when the API is rate-limited.

**Ruff counts are version-sensitive.** Quote "70 under ruff 0.15.22" or do not quote it. A
`ruff --fix` run outside the files a pass owns produces a flattering number; 67 and 62 were both
produced that way and both reverted. `sim/` is in `extend-exclude`, so scripts added there do not
move the tree count.

---

## 25. Report and provenance index

41 reports in `brain/log/`, numbered in implementation order (`README.md` indexes them):

01-03 Phase 2 build and remediation; 04 change-point; 05 point-deviation; 06 briefing;
07 live-ingest; 08 promote-and-serve; 09 agent-eval; 10 stock prefill; 11 scaled eval; 12 World
Cup live probe; 13 live-ingest fixes; 14-15 fidelity corrections; 16 Chronos-2 promotion;
17 G12.9; 18 downstream; 19 G12.10; 20 G12.12 go-live STOP; 21 G12.13a frozen June; 22 G12.13b
June confront; 23 G12.13 reconciliation; 24 G12.15 cadence/MPS/home-nation; 25 G12.16 taxonomy;
26 G12.17a July Pass 1; 27 G12.17b July Pass 2; 28 G12.17c window-2 freeze; 29 corrected freeze;
30 G12.18 comment rewrite; 31 C2 confront; 32 G13 production integration; 33 G14 de-Lune;
34 G14b defect closure; 35 For Ryan, integration brief response; **36 G15a fixture shortfall
diagnostics; 37 G15b round 4; 38 G15c taxonomy drift decision; 39 G15d price-regime seam;
40 G16 portable baseline and corrections; 41 For Ryan, addendum post-G15**.

Starting points for a reader joining cold:
- **Track B side (Ryan):** report 35 then report 41. 35 walks his brief section by section
  labelling everything Adopted, Deviated or Yours; 41 carries the four things that changed since,
  including that the trust gate he was given was not runnable.
- **Evaluation and dissertation:** `DISSERTATION_NOTES.md`, then reports 31 and 36 for the
  falsification and its two failed rescues.
- **Engineering discipline:** report 34 for the ledger, report 37 for round 4, report 40 for the
  verification rebuild.

Companion documents:
- `DISSERTATION_NOTES.md`. The argument the reports add up to, the traps, the numbers to quote with
  their sources, the numbers NOT to quote, and a seven-part chapter skeleton.
- `Decision_and_Resolution_Log.md`. Append-only, Sections A/B/C plus 29 numbered rows. Rows 24 to
  27 are G15, rows 28 to 29 are G16. Every superseded decision carries a forward pointer, and no
  numbered row has ever been edited.
- `brain/CONTRACT.md`. The dataset/bundle contract, the canonical caller obligations, the closed
  Phase 3 decisions, and open decisions 4 to 7. The joint item with Ryan.
- `brain/FLAGS.md`. The live flag ledger. Downstream reads this, so a correction that does not land
  here has not landed.
- `brain/GLOSSARY.md`. Linked from FLAGS.md and README.md.

Key commits this cycle, oldest first: `af11c81` (report 36, G15a plus `sim/frame_hash.py`),
`fa51b72` (report 37, round 4), `6d98d77` (report 38, taxonomy), `c008651` (report 39, price-regime
seam), `d40dea7` (reports 40 and 41, portable baseline and corrections).

New code this cycle: `sim/frame_hash.py`, `sim/frame_hash_baseline.json`,
`sim/g15a_weather_compare.py`, `sim/g15a_ellel_counterfactual.py`, `sim/g15c_taxonomy_drift.py`,
`sim/g16a_portable_baseline.py`, plus 12 tests across `test_compute_engine.py` and
`test_org_profile.py`. G16 added no tests, because it changed no behaviour.

Toolchain: Python 3.12 (`.venv-forecast`) and 3.14 (`.venv`), DuckDB, Parquet, FastAPI, pytest.
Chronos-2 (chronos-forecasting 2.3.1). statsmodels, scikit-learn. A third `.venv-eval` for TSB-AD
and statsforecast at numpy<2.0. ruff via `uvx` (0.15.22). NotebookLM for literature. Square MCP
(read-only OAuth) for simulation pulls. Deck build: pptxgenjs with a build-rezip-soffice-pdftoppm
QA loop. Writing: the avoid-ai-writing and wip-technical-briefing skills.

---

## 26. Writing the dissertation: what the notes say

`DISSERTATION_NOTES.md` is the authoritative guide; this is its summary.

**The headline is the method, not the accuracy.** Resist leading with MASE 0.285. It is one estate,
one venue, five weeks of out-of-sample evidence. What is defensible and rare is the evaluation
design, and it earned its keep twice: once by falsifying a finding the project had already
published in its own reports, and again when two rounds of post-hoc diagnosis failed to rescue that
finding and said so.

Chapter skeleton:
1. Evaluation design. Pre-registration, the two invariants, why calendar-airtight beats
   commit-ordering. The contribution.
2. The ladder and the gate. Beat-both-baselines, no hand-picking, and simple-beats-complex on thin
   venues as evidence the gate is real.
3. Serving-horizon accuracy. The three windows and the band.
4. The falsification, and its two failed rescues. Section 15 in full. The set-piece.
5. Operational results. Liveness gate, briefing fatigue, cadence.
6. Limitations, unhedged.
7. Fidelity audit, including the two non-paper entries in section 22.

Limitations to state outright:
1. One estate, one vertical, one region. The multi-tenant question is entirely untested by the
   dissertation even though the code now supports it.
2. The thin venues are thin. Beer Hall is the only venue with a real series.
3. Fixture effects are unstable and unexplained. The one out-of-sample test failed, and both
   testable explanations came back negative.
4. **Corrected wording.** A cross-venue term exists and the served model consumes it, but it carries
   presence rather than magnitude, it is pinned to 0 across every forecast horizon, and no term of
   any kind exists for the Events location. (The previous "no cross-venue substitution term" was
   overstated and fails badly at viva, since a reader who greps the source finds `is_ellel_event` in
   thirty seconds.)
5. MASE is the gate and it is blind to relevance in two independent ways.
6. MinT's guarantee does not formally hold, because it assumes unbiased base forecasts and the
   L2/L3 base is DOW-median.
7. The production ingest path is unexercised. Every June-onward number comes through MCP-SIM.
8. The 11 July confront used an aggregate pull, not the item grain.
9. Weather is a forecast product, not truth, and the size is now measured: the model was conditioned
   on an 11 July 2.0 C warmer and 1.05 hrs duller than the one that happened. The archive was not
   revised, so this is forecast-versus-reanalysis.
10. **NEW.** The Events location is untestable at 203 rows across 2 dates.
11. **NEW.** Taxonomy drift is not wired into the standing build, on measurement rather than
    oversight, and `top_k` rather than the ranking window is the binding constraint.

Numbers to quote, with sources:

| Claim | Number | Source |
|---|---|---|
| Serving-horizon accuracy | BH L1 MASE 0.285 / 0.287, coverage 1.00 | report 31 |
| Prior window | BH L1 MASE 0.386, coverage 1.00 | report 27 |
| Stress test | 30-day cold MASE 1.64 | report 22 |
| Backtest class | 0.745 / 0.597 / 0.572 | `models/ladder_results_L1_*.md` |
| Band held on the worst day | 11 Jul error +GBP 574, in-band | report 31 |
| Cadence null | Origin B does not beat A (0.287 vs 0.285) | report 31 |
| Cadence sweep | BH flat below weekly (7-day 1.45) | report 24 |
| Fixture falsification | expected +GBP 310, realised -GBP 265 | report 31 |
| Refutation control (kickoff) | 27 Jun, Sat 22:00, +234% | report 31 |
| Refutation control (weather) | 11 Jul 2.1 C warmer, 0.9 hrs sunnier, equally dry | report 36 |
| Ellel substitution effect | DOW-matched **-GBP 23.40** (n 66 / 333) | report 36 |
| Ceiling on that explanation | GBP 27.50 of GBP 573.66, **4.8%** | report 36 |
| Generation reproduces | Origin B control, gap GBP 0.00, to the penny | report 36 |
| Liveness gate | GBP 5,329 forecast for a dead venue, then none | reports 22, 27, 31 |
| Briefing fatigue | 0 new items/week, 8 suppressed | report 27 |
| Taxonomy, frozen revenue-ranked | captured 26% (BH) / 15% (Ellel) of June revenue | report 25 |
| Taxonomy, standing units-ranked | captured 19.3% (BH) / 31.3% (Ellel) | report 38 |
| Irreducible new-item share of OTHER | BH 12.6%, Ellel 42.7% | report 38 |
| MPS vs CPU | MPS slower (3.2s vs 0.6s), parity GBP 0.0002 | report 24 |
| Band horizon limit | 96.2% @ step 7, 80.8% @ step 30 | reports 33, 34 |
| Research path intact | three frame hashes identical across the de-Lune, portably | report 40 |
| Lint | 70 errors under ruff 0.15.22 | report 40 |

**The two taxonomy rows are different hierarchies and are not a before and after.** Report 25
measured the frozen revenue-ranked node set; report 38 the standing units-ranked one. Quote
whichever you mean, name the basis on the same line, and never present 26% to 19.3% as movement.

Do NOT quote:
- Ellel MASE 0.096 (FLAG-MASE-INTERMITTENT).
- "England +130%" without the row-21 forward pointer.
- "No exo feature adopted" as if it governed the served model.
- **The pooled Ellel spillover of +GBP 500.18.** It is the day-of-week effect wearing a spillover
  label and it carries the opposite sign to the matched estimate. It is the single most quotable
  wrong figure this project has produced.
- The three frame-hash prefixes published in reports 33 to 35. Use the section 20 table.
- Any ruff delta, since the 71 start point is not re-measurable.

Two additions this edition suggests, both reflective material:

**The estimator trap.** A GBP 523 swing and a sign inversion from the choice of estimator alone, on
the project's own data, where the naive version confirms the hypothesis the matched version refutes.
It is compact, self-contained, and it sits inside a real finding rather than a toy example.

**Four rounds, four rounds with hits.** A measured, documented instance of a failure mode that is
well known in the abstract and rarely evidenced: fixes validated against the case that motivated
them, each passing its own tests, each shipped with confident documentation. Section 19. It pairs
with the stale-document count (five instances) as the engineering-discipline counterpart to the
pre-registration argument.

---

## 27. Immediate next steps

Discharged since the previous edition: the weather diagnostic (refuted), the
estate-cannibalisation scoping (bounded at 4.8%, Events arm untestable), round 4 of review (run,
not clean), the taxonomy-drift decision (do not wire), the `PRICE_REGIME_BREAK` de-Lune (closed
additively), the caller-obligations location (canonical in CONTRACT.md), the ruff figure
(measured), and the frame-hash gate (portable, and it holds).

In priority order:

1. **Answer contract open decision 6 with Ryan before he builds the nightly cron.** Unchanged and
   still the only item blocking his work. Either treat the served model as fixed-after-cold-start
   for v1, or wire `_should_refit` to the injected `prior_state` and surface `ladder_selection`.
2. **Get report 41 to Ryan.** It carries four things he does not have, one of which (the reopening
   availability behaviour, obligation 12) changes how he builds error handling, and one of which
   (the trust gate he was given was not runnable, now replaced) he made a decision on.
3. **Start writing chapter 4.** The falsification is now fully evidenced with two refuted
   explanations and a measured ceiling on the third. It will not get more complete by waiting, and
   the remaining hypotheses are either untestable at this n or need Track B data.
4. **Run round 5 against the round-4 fixes.** Four for four. The D1 per-venue fix and the D2
   equality guard are unreviewed.
5. **Scope the `top_k` experiment** if L3 is to be defended at all. Report 38 identified it
   correctly and declined to smuggle it in; it needs its own gate, a cost measurement, and an
   answer to the relevance-blindness problem, because widening the node set will probably make MASE
   worse while making the output more useful.
6. **Sequence the remote sync and the PII purge with Ryan.** Nothing is pushed to `andpro`. Agree
   the canonical clone, rewrite there, force-push both remotes in lockstep.
7. **Decide the `print()` question.** The deferral reason expired when Phase 3 did not rewrite
   `ingest/` and `store/`.
8. **When `org_id` reaches the serve surface, key the two `@lru_cache`es in the same edit.**

A standing instruction, earned twice in two cycles. **Where a spec states a mechanism as fact,
measure it before building on it.** G15c's decision changed when the prescription was tested against
report 25's named item rather than against aggregates. G16b's correction changed basis when the
tests were actually reverted and run: the spec asserted that the D3 pinning test "could never have
failed pre-fix", and measurement showed all six fail, four on behaviour and two on the error string
alone. The correction survived and is sharper for it, since a test that fails pre-fix on a message
string is not evidence a defect was fixed. Both times the assertion came from the spec, not the
code.

Before relying on any local state in a later session: verify the store ceiling reads 2026-07-07
with the 8 to 14 July window empty, run `sim/restore_clock.py` if it does not, and run
`sim/frame_hash.py` before reading any gate. Run both after any full-suite run.
