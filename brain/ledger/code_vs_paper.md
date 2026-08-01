# Code vs paper — released-code comparison

The verification check named in `knowledge/02_prj93_pipeline_spec.md` §"Verification
vocabulary": *released-code comparison — the paper's code matches its prose claims,
discrepancies to `brain/ledger/code_vs_paper.md`*. This file is that artefact,
extended in the direction the audit actually needed: **our** implementation against
the paper AND against the authors' released code, method by method.

Date: 2026-07-31. Store ceiling at time of audit: 2026-07-07.
**Second pass, same day** — closes the four rows the first pass left resting on
documented behaviour rather than source, and audits the five modules it located
but did not read. Changes are marked *(pass 2)*. Rows M22–M26 are new.

## How this was verified, and what that is worth

| Route | Used for | Strength |
|---|---|---|
| NotebookLM `notebook_query` on `d565d5f0-…` | Zaffran 2022, Wickramasuriya 2019, Hansen-Lunde-Nason 2011 | **Strong** — direct quotation from the source PDF, citations returned |
| NotebookLM, source absent | Makridakis M5 RMSSE formula | **None** — the notebook answered *from outside the sources* and said so. Recorded as UNVERIFIED, not as fact |
| WebFetch of the released repo | `arch.bootstrap.MCS` (Hansen's reference Python port) | **Strong** — source read this session |
| WebFetch attempted, truncated | Nixtla `statsforecast` Croston/SBA | superseded in pass 2 — see next row |
| **Local source read** (pass 2) | `statsforecast` 2.0.3 `models.py`, from the uv archive cache at `~/.cache/uv/archive-v0/-BWLyVrIqqhuDV_5/` | **Strong** — the released implementation itself, read line by line. Closes M11 |
| **WebFetch of the released repo** (pass 2) | Zaffran `AgACI/Script/acp_gamma.R`; `gpleiss/temperature_scaling/temperature_scaling.py` | **Strong** — source read this session. Closes M3 and M16 |
| Web search only, source not read | The M5 leading-zero denominator rule | **Weak** — a search-engine rendering of the M5 results paper's prose. NOT in the project's own sources; see M8 |
| Not fetched this session | `fable::min_trace` | **Weak** — reasoning from documented API only. Flagged inline where it is the sole basis |

`graphify query` was used for orientation and **worked** on this run (421 nodes,
located `cusum()`, `mase()`, `rmsse()`, `croston_*()`, `conformal_quantile()`).
This contradicts `ledger/tooling_verdict.md`, which records it as hanging
indefinitely; that entry should be re-tested rather than trusted.

Severity key: **HIGH** = changes a reported number or invalidates a stated
guarantee · **MEDIUM** = misstates the method in an artefact, or removes a
guarantee quietly · **LOW** = immaterial, or a documented deliberate departure.

---

## Summary

| id | Method | Severity |
|---|---|---|
| M1 | Croston/SBA node adoption in `hierarchy/reconcile.py` | **HIGH — CLOSED** 2026-07-31: selection moved to a validation block, A6 re-run |
| M2 | "Split-conformal" band in `hierarchy/reconcile.py::node_quantiles` | **HIGH — CLOSED** 2026-08-01: held-out calibration block, A6 re-run |
| M3 | AgACI (Zaffran et al. 2022) | **HIGH — CLOSED** 2026-07-31: fixed, re-run, numbers restated |
| M4 | MinT weight on Croston-adopted nodes | **HIGH — CLOSED** 2026-07-31: signed residual variance, A6 re-run |
| M5 | MinT naming (Wickramasuriya et al. 2019) | MEDIUM — **CLOSED** 2026-08-01: renamed WLS_v everywhere, reason for the diagonal stated |
| M6 | Superseded ADI 1.32 constant in the reconciliation report generator | MEDIUM — **CLOSED** 2026-08-01: last live literal now formatted from the constant |
| M7 | Conformal quantile clamp at small n | MEDIUM — **CLOSED** 2026-08-01: `conformal_min_n` + tally; 0 of 60 group bands clamped |
| M8 | `rmsse_m5` denominator, and an unverifiable M5 claim | MEDIUM — **CLOSED** 2026-07-31: verified against Hewamalage et al. eq. 5; divisor correct, leading-zero rule moot |
| M9 | CUSUM h/k transplanted from σ-units to band-units | MEDIUM — **CLOSED** 2026-08-01: methodology states the ARL tables do not transfer, empirical validation named as the warrant |
| M10 | Model Confidence Set (Hansen, Lunde & Nason 2011) | LOW — **CLOSED** 2026-08-01: verified faithful, recommended action was None |
| M11 | Croston (1972) / SBA (Syntetos & Boylan 2005) recursions | LOW — **CLOSED** 2026-07-31: run against statsforecast 2.1.1 on 3.12, max diff 1.3e-15 |
| M12 | ACI (Gibbs & Candès 2021) | LOW — **CLOSED** 2026-08-01: verified faithful, recommended action was None |
| M13 | MASE (Hyndman & Koehler 2006) and the `calendar_lag7_active` basis | LOW — **CLOSED** 2026-08-01 with G2: decision was already written in `sec:res-basis`; enforcement hoisted to `config.VENUE_SCALE_BASIS` |
| M14 | Basis-matched RMSSE | LOW — **CLOSED** 2026-08-01: departure stated wherever the number appears; action was None |
| M15 | Winkler / interval score, Clopper-Pearson, Angelopoulos-Bates bound | LOW — all exact |
| M16 | ECE (Guo et al. 2017) | LOW — **CLOSED** 2026-07-31: temperature scaling implemented |
| M17 | BOCPD (Adams & MacKay 2007) | LOW — **CLOSED** 2026-08-01: declared benchmark, not the production detector; action was None |
| M18 | Kostenko-Hyndman selection rule | LOW — fixed 2026-07-31 |
| M19 | ETS / STL / Prophet / GBM rungs | LOW — **CLOSED** 2026-08-01: methodology now states ETS means ETS(A,A,A), not the auto-selected family |
| M20 | Chronos-Bolt / Chronos-2 | LOW — **CLOSED** 2026-08-01: no discrepancy found; best-documented external interface in the project |
| M21 | Diebold-Mariano with the HLN correction | LOW — deliberately absent |
| M22 | Hurdle / occurrence gate (Cragg 1971, Mullahy 1986) | MEDIUM — **CLOSED** 2026-08-01: verified already written in BOTH chapters; row was stale, no edit needed |
| M23 | LOVO transfer gate decided without dispersion | MEDIUM — **CLOSED** 2026-07-31: block loss vectors + MCS + paired bootstrap, A7 re-run |
| M24 | Feature-ablation ship rule and weather-basis argmin, without dispersion | MEDIUM — **CLOSED** 2026-07-31: ship rule is now MCS-based, fold grid widened, A14 re-run |
| M25 | `group_icl` / `weather_basis` comparison instruments | LOW — clean |
| M26 | ECE bin-edge convention and bin count vs Guo et al. | MEDIUM — **CLOSED** 2026-07-31: `(lo, hi]` + 15 bins, before the G3 run |

---

## M1 · Croston/SBA node adoption — `hierarchy/reconcile.py:245-284` — **HIGH**

**Paper spec.** Kostenko & Hyndman (2006) prescribe an **ex-ante** selection
between Croston and SBA from the training series alone, via the (ADI, CV²) plane
and the rule `v > 2 − (3/2)p`. Nothing in Croston (1972) or Syntetos & Boylan
(2005) licenses choosing between the two by looking at the outcome.

**Official code behaviour.** `statsforecast` exposes `CrostonClassic` and
`CrostonSBA` as separate estimators; neither performs outcome-based selection.
Selection, where automated at all (`AutoCroston`), is by in-sample criterion.

**Our implementation.** `_croston_comparison` builds
`y_true = s.reindex(test_dates)` — the **held-out `TEST_WEEKS` block** — scores
`mase_dow` and `mase_sba` on it, and adopts SBA per node when
`mase_sba < mase_dow`. Adoption is not evaluation-only despite the docstring: it
overwrites `Ybase[i]`, `w[i]` and `node_q[(node, lvl)]` in place, and
`reconcile()` calls `mint_reconcile(Ybase, S, w)` **after** it. The reported A6
reconciliation, its conformal band and its persistence therefore all rest on a
per-node model choice made with knowledge of the test outcome.

**Discrepancy.** Test-set selection. Every A6 node-level accuracy and coverage
figure is optimistically biased by an unknown amount, and the bias grows with the
number of intermittent nodes offered the choice.

**Recommended action.** Replace the outcome-based adoption with the ex-ante
Kostenko-Hyndman rule already implemented and now correct —
`eval.intermittency_diagnostic.select_sba(adi, cv2)` — which is currently unused
by this module. Re-run A6 and restate the affected numbers. If the comparison
table is wanted for the report, keep it as a genuinely evaluation-only artefact
that does not write back into `Ybase`/`w`/`node_q`. This is a rerun, so
`PRJ93_RULES.md` gate 3.

**RESOLUTION — 2026-07-31, report 53. CLOSED.** Two decisions now separate.
`select_sba(adi, cv2)` picks the estimator ex ante, as recommended. Whether that
estimator displaces the DOW-median is **not** decided by the classification —
adopting on classification alone would have forced a forecaster onto all 16 nodes
that loses to the DOW-median on every one of them — but by a MASE contest on a
**validation block**, the last `TEST_WEEKS` of the training span, with both
forecasters fitted strictly before it and the winner refitted on the whole
training span. The test block is now reported and never selected on.

Two findings fall out. First, the Kostenko-Hyndman rule is **degenerate over this
trigger set**: at the gate ADI ≥ 4/3 the cutoff `2 − (3/2)·ADI` is already ≤ 0 and
CV² cannot be negative, so SBA is selected at every node A6 ever asks about. It is
applied on principle, not because it discriminates here (pinned by
`test_the_selection_rule_is_degenerate_over_the_intermittency_trigger_set`).
Second, the honest rule adopts **1 of 16** nodes (Sauvignon Blanc) on a validation
margin of 7.043 against 7.071 — 0.4% at a node where both forecasters are far
worse than seasonal-naive — and that node then *loses* on test, 3.993 against
3.136. Validation selection at this series length is noisy, and the artefact now
shows it instead of hiding it.

## M2 · "Split-conformal" band on in-sample residuals — `hierarchy/reconcile.py:146-168` — **HIGH**

**Paper spec.** Split (inductive) conformal prediction requires the calibration
scores to come from a set **disjoint from and exchangeable with** the fitting
set; that disjointness is the entire source of the finite-sample coverage
guarantee (Angelopoulos & Bates 2023, §1; Lei et al. 2018).

**Official code behaviour.** Every released implementation (MAPIE
`SplitConformalRegressor`, `crepes`, the Angelopoulos-Bates gentle-intro
notebooks) takes an explicit calibration split and refuses to calibrate on the
fitting residuals.

**Our implementation.** `node_quantiles` computes the DOW medians on `train`,
then scores `|actual − median|` **on that same `train`** and takes the conformal
quantile of it. There is no split. The docstring calls it "Split-conformal
quantile per non-VENUE node".

**Discrepancy.** The A6 node bands carry no coverage guarantee and are
optimistically narrow, because the median is fitted to the very points it is then
scored against. Note the contrast: the L1 path in `conformal/wrap.py:147-152`
does this correctly — residuals accumulated *strictly before* each block — so the
defect is local to `hierarchy/`, not systemic.

**Recommended action.** Either hold out a calibration span before `test_start`
and calibrate on it, or relabel the artefact honestly as an in-sample residual
band with no guarantee. Do not leave the word "split-conformal" on it.

## M3 · AgACI — `conformal/methods.py:140-193` — **HIGH**

**Paper spec** (Zaffran et al. 2022, verified by direct quotation from the source
PDF via NotebookLM):

1. *"We chose Φ to be the Bernstein Online Aggregation (BOA, Wintenberger, 2017)"*
   — and the paper explicitly contrasts BOA with plain Exponential Weighted
   Aggregation, which it attributes to Vovk (1990) and does **not** use.
2. *"At each step t, it performs **two independent aggregations** of the K-ACI
   intervals … one for each bound"*.
3. *"We use the pinball loss ρ_β … where the pinball parameter β is chosen to
   α/2 (resp. 1 − α/2) for the lower (resp. upper) bound"* — i.e. a separate loss
   per bound, not one summed interval score.

**Official code behaviour — source read in pass 2.** `AgACI/Script/acp_gamma.R`
in Zaffran's released repo makes **two separate `opera::mixture()` calls per
dataset**, one per bound, each with its own pinball τ:

```r
mlpol_grad_low  <- mixture(Y=..., experts=t(experts_low),  model = agg,
                           loss.gradient = T, loss.type = list(name="pinball", tau=alpha/2))
mlpol_grad_high <- mixture(Y=..., experts=t(experts_high), model = agg,
                           loss.gradient = T, loss.type = list(name="pinball", tau=1-alpha/2))
```

`agg` is the aggregation rule (BOA in the reported runs — the repo's `results/`
directory names its output files `Aggregation_BOA_Gradient`), and
`loss.gradient = TRUE` is the gradient trick. The released code therefore
confirms all three of the paper's prose claims exactly: BOA, two independent
aggregations, per-bound pinball at α/2 and 1−α/2. There is **no** divergence
between Zaffran's prose and Zaffran's code — the divergence is entirely ours.

**Our implementation, as audited in passes 1–2.** `AgACI._weights` computed
`w ∝ exp(−η(cumloss − min cumloss))` — plain EWA. One
weight vector per step was derived from `interval_pinball`, the **summed** two-sided
score, and was then applied to **both** bounds (`np.dot(w, los)` and
`np.dot(w, his)`).

**Correction to passes 1–2 on the learning rate.** Both earlier passes recorded
`η` as *"fixed at 1.0, a hard-coded constant with no stated justification"*.
**That was wrong**, and it was wrong because the audit read the dataclass default
without following the caller. `eta: float = 1.0` was only the default;
`eval/interval_calibration.py` computed the rate actually used per venue via
`_eta_for`, as `sqrt(8 ln K / T)` divided by the median absolute residual, and
passed it in. The first factor is the textbook EWA rate (Cesa-Bianchi & Lugosi,
*Prediction, Learning, and Games*, Thm 2.3). The real objection was narrower than
"unjustified constant": that bound is stated for a loss bounded on a **known
range** `B`, and the code substituted the median residual for `B` as a scale
proxy, on a summed two-sided interval score whose range is not the median
residual. So the rate was theory-shaped with a heuristic scale, not arbitrary —
and the artefact recorded it (`eta_agaci`). Recorded here because an audit that
overstates a defect is as damaging as one that misses it.

**Discrepancy.** Three independent departures, each verified against the paper's
own words **and now against the released R source**: EWA not BOA; one shared
aggregation not two independent ones; summed
interval loss not per-bound pinball. Additionally the paper's BOA sets its
learning rate adaptively, whereas `eta = 1.0` is a hard-coded constant with no
stated justification. The G arm of S7 G17h is therefore not the published AgACI,
and any sentence in the dissertation reading "AgACI (Zaffran et al. 2022)" as a
description of what was run is inaccurate.

**Resolution — pass 3, 2026-07-31. The full fix was taken, not the cheap one.**
All three departures are closed in code rather than papered over with a rename:

- `conformal/methods.py` gains a `BOA` class: a faithful port of `BOA()` in
  `dralliag/opera` `R/BOA.R` — the exact function Zaffran's `acp_gamma.R` calls —
  under `loss.gradient = TRUE` and `loss.type = list(name="pinball", tau=…)`.
  The port carries opera's own `eta_inv2 += 2.2·r²` rate calibration, its
  regularised regret `r − r²/√eta_inv2`, its log-domain weight
  `aux = −log(eta_inv2)/2 + log(w0) + R_reg/√eta_inv2`, and its uniform-`w0`
  cold-start branch.
- `AgACI` now holds **two** aggregators per horizon step, `agg_lo` at
  `τ = α/2` and `agg_hi` at `τ = 1 − α/2`, updated independently. The shared
  weight vector is gone.
- The linearised regret is evaluated at the aggregate that was actually emitted,
  so `band()` carries `(los, his, lo_pred, hi_pred)` forward — necessary because
  other origins update the same step between an interval's issue and its
  resolution.

**This is what closes the learning-rate question rather than relocating it.** BOA
calibrates `η_i,t` per expert from accumulated squared regret, so the arm now
contains **no tuned aggregation constant at all** — `_eta_for` is deleted, the
`eta` parameter is gone from `run_online` and `AgACI`, and the artefact key
`eta_agaci` is replaced by `agaci_aggregation`. Choosing a defensible η was never
possible here on published grounds, because every EWA bound requires a known loss
range; adopting the paper's own parameter-free rule dissolves the problem instead
of re-deriving a scale proxy.

**Verification.** `tests/test_interval_calibration.py` gains three BOA tests whose
expected weight vectors were derived by transcribing `R/BOA.R` and `R/loss.R`
**independently of our port** (scratch oracle, retained at
`scratchpad/boa_oracle.py`): uniform weights before any regret accrues,
`[0.79386788, 0.20613212]` after one round, `[0.92384867, 0.07615133]` after
three. A fourth test pins the property this fix exists to create — that the two
bounds end on different weight vectors. The pre-existing G4 reduction test (single
gamma ⇒ exactly ACI) still passes unchanged, which is the guard that the rewrite
did not disturb the degenerate case. 15/15 in the file; the three failures
elsewhere in the suite (`test_briefing`, `test_ingest_refresh`,
`test_promote_and_serve`) were confirmed identical with these edits stashed and
are `.venv-run` missing `pyarrow`/`pydantic`, not regressions.

**Re-run — authorised at the gate and executed 2026-07-31.** `PRJ93_RULES.md`
gate 1 (method change) and gate 3 (rerun of reported work) were both put to the
human and cleared. `eval/interval_calibration.py --build` re-run at the same
store ceiling 2026-07-07, ETS point model, CPU. Full record in
`log/52_G17h_AgACI_Correction.md`; report 49 annotated in place, not rewritten.

| Venue | G before | G after | Δ |
|---|---|---|---|
| Beer Hall | 1820.3 | 1836.6 | **+16.3** |
| Ellel | 1476.6 | 1479.6 | **+3.1** |
| Two River Taps | 675.0 | 692.6 | **+17.7** |

**The corrected method is worse, and that is the finding.** The three departures
had been flattering the arm, not handicapping it. Two controls make the result
trustworthy: P, D, S and A are unchanged **to the digit** across the two runs, so
the edit touched only its intended arm and the harness is deterministic; and the
G4 degenerate-grid test still passes untouched.

**No conclusion moves.** The 90% sets are identical (Beer Hall all five, Ellel
`{D}` alone, Two River Taps all five), adoption remains empty everywhere, and
Ellel still eliminates every alternative at `p ≤ 0.016`. Report 49's headline —
no method beats the incumbent Mondrian band at any venue — is unaffected, and is
now supported by a G arm that is actually the method it is named for.

**M3 is closed.** The only residue is documentary: `results.tex` Table
`tab:winkler` is restated to 1837 / 1480 / 693 with a trace comment, and
`methodology.tex` §`sec:conformal` gains the aggregation specification it was
missing. Both are staged behind G9 at the time of writing.

## M4 · MinT weight on Croston-adopted nodes — `hierarchy/reconcile.py:275` — **HIGH**

**Paper spec.** Wickramasuriya et al. (2019) are explicit and make a point of it:
*"W_h = E[ê_t(h)ê_t'(h)|I_t] is the variance-covariance matrix of the h-step-ahead
base forecast **errors**"*, and they criticise Hyndman et al. (2011) precisely for
having *"confused the forecast errors with the coherency errors"*.

**Official code behaviour.** `fable::min_trace()` and `hts::MinT()` estimate W
from the signed one-step residual matrix.

**Our implementation.** The DOW-median path is correct —
`_dow_median_forecast` returns `np.var(resid)` on **signed** residuals. The
Croston-adopted path is not: line 272 builds
`resid = np.abs(ytr − croston_fitted(...))` and line 275 sets
`w[i] = float(np.var(resid))` — the variance of the **absolute** residual.

**Discrepancy.** Var(|e|) = E[e²] − (E|e|)² < Var(e) for any non-degenerate
zero-centred e. Every Croston-adopted node is handed a systematically understated
error variance, so `winv = 1/w` over-weights exactly those nodes in the trace
minimisation. The two paths are also mutually inconsistent, which means the
relative weights across the hierarchy are wrong even in sign of the error.

**Recommended action.** One-line fix: keep the signed residual for the variance
and take absolute values only for the conformal scores, e.g.
`err = ytr − croston_fitted(...)`; `w[i] = np.var(err[np.isfinite(err)])`;
`resid = np.abs(err)`. Then re-run A6. Gate 3.

**RESOLUTION — 2026-07-31, report 53. CLOSED.** Applied as recommended:
`signed = ytr − croston_fitted(ytr, alpha=0.1, deflate=use_sba)` feeds
`w[i] = np.var(signed)`, and `np.abs(signed)` feeds the conformal scores only. The
two MinT paths now estimate the same quantity, so relative weights across the
hierarchy are comparable. Pinned by
`test_mint_weight_is_the_variance_of_the_signed_residual`. The claim that
`Var(|e|) < Var(e)` **always** is too strong and is corrected here: it holds only
where residuals change sign, and coincides exactly where they do not (a monotone
node has `|e| = e`). The defect is the inconsistency between the two paths, which
holds regardless.

## M5 · MinT naming — `hierarchy/reconcile.py:1-7, 137-143` — MEDIUM

**Paper spec** (verified by quotation). Wickramasuriya et al. propose five W
specifications and name them deliberately. Of the diagonal one they write: *"Set
W_h = k_h diag(Ŵ₁) … In this case, MinT can be described as a **WLS** estimator"*,
and they label it **WLS_v** throughout the results tables. They *"reserve the
MinT naming convention"* for **MinT(Sample)** and **MinT(Shrink)** — the full
off-diagonal estimators. Their own finding is that MinT(Shrink) beats WLS_v
substantially at h = 1.

**Our implementation.** The reconciliation formula
`S(S'W⁻¹S)⁻¹S'W⁻¹ŷ` in `mint_reconcile` is **exactly** the paper's Equation (11).
Only the naming is at issue: the module docstring, the report generator and the
methodology all call the diagonal variant "MinT".

**Discrepancy.** An examiner who knows the paper will read "MinT" as
MinT(Shrink) and find WLS_v. It also silently forgoes the paper's headline
recommendation.

**Recommended action.** Rename to "MinT(WLS_v)" or "WLS variance scaling
(Wickramasuriya et al. 2019)" everywhere, and add one sentence saying why the
diagonal was chosen — at 5–7 bottom nodes and a few hundred days the shrinkage
estimator is available and would be the paper's choice, so the reason should be
stated rather than left implicit.

## M6 · Superseded ADI 1.32 in the reconciliation report — `hierarchy/reconcile.py:186, 358, 369` — MEDIUM

**Paper spec.** Kostenko & Hyndman (2006) correct the Syntetos-Boylan-Croston
constant to p = 4/3 = 1.3333, not 1.32.

**Our implementation.** `eval/intermittency_diagnostic.py` is correct
(`ADI_INTERMITTENT_CUTOFF = ADI_CUTOFF_KH = 4.0/3.0`) and `intermittent_nodes`
uses it, so **the classification is right**. But `hierarchy/reconcile.py` states
`ADI >= 1.32` in a comment (:186) and — the part that matters — in two **report
generator strings** (:358, :369) that print into the published reconciliation
artefact.

**Discrepancy.** Exactly the defect class fixed in `intermittency_diagnostic.py`
on 2026-07-31 (commit `5f77591`): correct code, wrong constant in the prose the
code emits. Regenerating the reconciliation report reprints the superseded SBC
constant as if it were the operative cutoff. No number changes; a stated
methodology constant is wrong in an artefact.

**Recommended action.** Replace the three literals with
`ADI_INTERMITTENT_CUTOFF` formatted to 4 dp, as
`intermittency_diagnostic.py:238` now does. Regenerate the artefact.

## M7 · Conformal quantile clamp at small n — `conformal/wrap.py:71-78`, `conformal/methods.py:30-46` — MEDIUM

**Paper spec.** Split conformal takes the `⌈(n+1)(1−α)⌉`-th smallest score. When
`⌈(n+1)(1−α)⌉ > n` — i.e. n is too small for the requested level — the prediction
set is **infinite**; the guarantee is not available at that n.

**Official code behaviour.** MAPIE and `crepes` return ±∞ (or raise) in that
regime rather than substituting a finite value.

**Our implementation.** Both helpers do `k = min(ceil((n+1)*level), n)` and
return `scores[k-1]` — the largest observed residual.

**Discrepancy.** At n below `level/(1−level)` the band is finite and carries no
coverage guarantee, silently. In `methods.py` this is deliberate and documented
(ACI drives the level to the endpoints and an infinite band would be useless
there). In `wrap.py` it is undocumented, and `wrap.conformal_quantile` is the one
the per-group Mondrian bands call — where a sparse group can genuinely be small.

**Recommended action.** No behaviour change needed, but the clamp must be
countable: return the clamp alongside the quantile, or log/count how many
group-level bands were produced at n below the level's minimum, and report that
count. A guarantee that silently lapses on the sparsest groups is the worst place
for it to lapse.

## M8 · `rmsse_m5` denominator, and an unverifiable M5 claim — `eval/harness.py:369-393` — MEDIUM

**Paper spec — re-queried in pass 2, and the finding sharpens.** NotebookLM
still does **not** hold the M5 competition's own RMSSE definition: asked
directly, it answered *"the sources do NOT contain the exact sentence or
equation defining the RMSSE denominator's handling of leading zeros"*, and
confirmed the leading-zero rule *"is a fact that comes from outside these
provided text excerpts"*. But the same query surfaced what the notebook **does**
hold — Hewamalage et al. (2023)'s definition, cited by them to M5, quoted from
the source:

> q†ₜ = e²ₜ / [ (1/(T−1)) Σ_{t=2}^{T} (yₜ − yₜ₋₁)² ]

That is the only RMSSE definition the project can cite, and **our
implementation matches it exactly** — including the divisor, which pass 1 got
wrong (see below).

**Official code behaviour.** The Kaggle `WRMSSEEvaluator` was not fetched in
either pass. A web search returned the M5 results paper's prose — that the
denominator is computed *"only for the periods during which the examined
product(s) are actively sold, i.e. the periods following the first non-zero
demand"* — but as a search-engine rendering, not source read, and the paywalled
ScienceDirect HTML and the open PDF both failed to yield the passage directly.
Treat the leading-zero rule as **probably true and still unevidenced**.

**Our implementation.** `naive_squared_scale` takes `np.mean((y[1:] − y[:-1])**2)`
over the whole training array, with no leading-zero trim.

**Discrepancy — two, and pass 1 misstated one of them.**

1. *Corrected (pass 2).* Pass 1 recorded "1/n rather than 1/(n−1) on the
   difference count". **That was wrong.** `np.mean` over `y[1:] − y[:-1]`
   divides by the length of the difference array, which is exactly T−1. The
   divisor matches Hewamalage's equation. Nothing to fix.
2. *Stands, narrowed.* No leading-zero trim, against a rule the project cannot
   yet cite. The docstring's claim to be "RMSSE **exactly** as the M5
   competition defined it" is an over-claim regardless of how the rule resolves,
   because the project holds no source stating what M5 defined.

**Why this is unlikely to move a number.** Leading zeros only bite if a training
array starts with a zero run, and the L1/A7/A14 paths feed `trim_to_active`
output (`store/active_span.py`), which strips leading and trailing all-zero
stretches before evaluation. The exposure is therefore confined to any caller
that reaches `rmsse_m5` on an untrimmed series. Verify that once; do not assume
it.

**Recommended action.** (1) Soften the docstring to "lag-1 naive denominator per
Hewamalage et al. (2023) eq. 11" — a claim the project can actually support —
and drop "exactly as the M5 competition defined it" from code and dissertation
alike. (2) Add the M5 results paper's *methods* section to the NotebookLM
notebook so the leading-zero rule becomes checkable; that is a G7 addition.
(3) Confirm every `rmsse_m5` caller passes a trimmed series. `rmsse_m5` is a
secondary reported figure, so no headline number moves either way.

## M9 · CUSUM operating point — `signals/change_point.py:55-77`, `config.py:305-310` — MEDIUM

**Paper spec.** Page (1954) and the SPC literature that supplies the standard
`k = δ/2`, `h = 4` or `5` pairing derive their ARL and false-alarm properties for
a statistic accumulating **σ-standardised** deviations.

**Our implementation.** The recursions are exactly right —
`C⁺ = max(0, C⁺ + z − k)`, `C⁻ = max(0, C⁻ − z − k)`, alarm at `> h`, reset after
alarm, onset at the last index the relevant statistic was zero. But `z` is
`residual / conformal half-band at CP_LEVEL`, and a conformal half-band is a
(1−α) quantile of |residual|, **not** a standard deviation. `k = 0.5`, `h = 5.0`
are the textbook σ-unit values.

**Discrepancy.** The constants are transplanted from a unit in which they have a
known ARL to a unit in which they do not, so the textbook false-alarm rate cannot
be claimed for this detector. Mitigated — and this is why it is MEDIUM and not
HIGH — by `eval/change_point_eval.py`, which validates empirically against the
TRT closure and synthetic injections rather than resting on the tables.

**Recommended action.** No code change. State in the methodology that `h`/`k` are
band-units, that the SPC ARL tables therefore do not transfer, and cite the
empirical validation as what licenses the operating point. Cheap, and it forecloses
an easy examiner question.

## M10 · Model Confidence Set — `eval/mcs.py` — LOW

**Paper spec** (verified by quotation from HLN 2011). `T_{R,M} ≡ max_{i,j∈M}|t_ij|`;
elimination `e_{R,M} = arg max_{i∈M} sup_{j∈M} t_ij`; *"This justifies our use of
the **moving-block bootstrap**"*; MCS p-value `p̂_{e_Mj} ≡ max_{i≤j} P_{H0,Mi}`
with the last survivor taking `P ≡ 1` by convention.

**Official code behaviour** (`arch.bootstrap.MCS`, source read this session):
defaults to the **stationary** bootstrap with `block_size = √T`; estimates the
differential variance as `(bootstrapped_mean_losses**2).mean(axis=0)` **after**
centring by `-= loss_diffs`; p-value `(test_stat < simulated).mean()`, strict;
running maximum; survivor 1.0; inclusion test `Pvalue > size`.

**Our implementation.** Matches the **paper** on every load-bearing point: T_R
exact, e_R exact (`np.argmax(t.max(axis=1))`), moving-block bootstrap, running
maximum, survivor 1.0. Joint resampling across models is enforced (one index draw
applied to every model), which is the property that preserves the cross-model
correlation.

**Discrepancy.** Three immaterial deltas against `arch`: (a) moving-block vs
`arch`'s stationary default — ours follows the paper, `arch` does not, so this is
a divergence from the *code* in the direction of the *prose*; (b) variance about
the bootstrap mean with `ddof=1` vs `arch`'s mean-of-squares about the observed
mean — asymptotically identical; (c) `t_boot >= t_obs` and `p >= alpha` include
ties where `arch` uses strict `<` and `>`, which can differ only on exact ties.
Block length 7 is ours, not the paper's (HLN use l = 2 in simulation, l = 12
empirically, and give no selection rule); it is justified by the horizon in the
module docstring and swept in `BLOCK_LEN_SENSITIVITY`.

**Recommended action.** None. If a reviewer asks why not `arch`, the answer is
that `arch`'s default bootstrap departs from the paper and ours does not — worth
one footnote.

## M11 · Croston and SBA recursions — `models/intermittent.py` — LOW

**Paper spec.** Croston (1972): smooth demand size `z` and inter-demand interval
`p` separately by SES, forecast `ẑ/p̂` per period, flat over the horizon.
Syntetos & Boylan (2005): multiply by `(1 − α/2)`.

**Official code behaviour — source read in pass 2**, from `statsforecast` 2.0.3
`models.py` in the local uv archive cache. The three load-bearing helpers:

```python
def _intervals(x):                 # models.py:1844
    nonzero_idxs = np.where(x != 0)[0]
    return np.diff(nonzero_idxs + 1, prepend=0).astype(x.dtype)

def _ses_forecast(x, alpha):       # models.py:1815
    fitted[0] = x[0]
    for i in range(1, len(x)):
        fitted[i] = alpha * x[j] + (1 - alpha) * fitted[j]   # j = i-1

def _croston_classic(y, h, fitted):    # models.py:3772
    ydp, ydf = _ses_forecast(_demand(y), 0.1)
    yip, yif = _ses_forecast(_intervals(y), 0.1)
    mean = ydp / yip if yip != 0.0 else ydp

def _croston_sba(y, h, fitted):        # models.py:4114
    out = _croston_classic(...); out["mean"] *= 0.95
```

Three things this settles. (i) `prepend=0` makes the **first** interval equal
`i0 + 1` — periods up to and including the first demand — exactly as pass 1
guessed. (ii) SES is initialised at the first observation of each vector, so
`zhat₀ = y[i0]` and `phat₀ = i0 + 1`. (iii) The SBA deflator is the **hard-coded
literal `0.95`**, correct only because α is pinned at 0.1.

**Our implementation.** `_croston_core` initialises `zhat = y[i0]`,
`phat = i0 + 1` (periods to the first demand — matches the counter semantics),
updates only on demand periods, resets `q = 1`, and returns `factor * zhat/phat`
flat. `croston_fitted` assigns before updating, so `fitted[t]` is a function of
`y[:t]` only — genuinely leak-free.

**Discrepancy.** **None** — and pass 2 upgrades that from "none found by
inspection" to "none, against the released source line by line". Our
`phat = i0 + 1` matches `_intervals`' `prepend=0` convention; our
`zhat ← zhat + α(y[t] − zhat)` is algebraically the same recursion as
`fitted[i] = αx[i−1] + (1−α)fitted[i−1]`; our `q` reset-to-1 reproduces
`np.diff` on the non-zero index positions.

Three notes, none of them defects: (i) `fitted[i0]` is NaN as
well as everything before it, marginally wider than the docstring's "entries
before the first non-zero demand are NaN"; (ii) a single α is used for both the
size and interval recursions, which matches `statsforecast` but is a restriction
of the general Croston formulation; (iii) our SBA deflator is the
**parameterised** `1 − α/2` where `statsforecast` hard-codes `0.95`. At the
shared default α = 0.1 these agree exactly, and ours is the more faithful
rendering of Syntetos & Boylan — a divergence from the *code* in the direction
of the *paper*, like M10's bootstrap choice.

**Recommended action.** The remaining gap is the runtime oracle, not the code:
`tests/test_intermittent.py::test_matches_statsforecast_on_bernoulli_gap_series`
is the oracle cross-check against the released implementation and it is
**currently skipped** — `statsforecast` does not build on the Python 3.14 forecast
venv (scipy/numba). Run it once in a Python 3.12 venv and record the result, so
the strongest available check on this module is actually exercised rather than
merely present.

## M12 · Adaptive Conformal Inference — `conformal/methods.py:89-135` — LOW

**Paper spec.** Gibbs & Candès (2021): `α_{t+1} = α_t + γ(α − err_t)` with
`err_t = 1{Y_t ∉ Ĉ_t(α_t)}`.

**Our implementation.** `self.eff[step] += self.gamma * (self.alpha_target - err)`
— exact. The clamp of the effective α to [0,1] is a deviation from the unbounded
paper recursion, but it is counted (`clamps`) with the excursion extremes
recorded, so a degenerate γ is visible in the artefact rather than silent. That
is better practice than the paper's own handling.

**Discrepancy.** None material.

**Recommended action.** None.

## M13 · MASE and the `calendar_lag7_active` basis — `eval/harness.py:286-338` — LOW

**Paper spec.** Hyndman & Koehler (2006): scale by the mean in-sample absolute
error of the naive (seasonal naive at lag m) forecast, over the training series.

**Our implementation.** `seasonal_naive_scale` does exactly that at lag 7 on the
`calendar_lag7` basis. The additional `calendar_lag7_active` basis **drops any
lag pair with a zero at either endpoint** before averaging.

**Discrepancy.** No published MASE variant masks the denominator this way. It is a
project construct, and it is the live subject of **gate G2** (Ellel scale basis),
so it is a known open decision rather than an undetected divergence. It is
correctly labelled as one basis among four in `VenueRuler`, and the deflation
diagnostic `structural_zero_diffs` carries an explicit warning that its
population differs from the active basis's.

**Recommended action.** None here — carry it into G2, where the choice is already
queued for a decision.

## M14 · Basis-matched RMSSE — `eval/harness.py:302-366` — LOW

**Discrepancy.** `rmsse` uses the basis's own lag, not M5's lag 1, so MASE and
RMSSE share one ruler and differ only in loss function. This is a deliberate,
documented departure (report 42 §3), and the literal M5 statistic is reported
alongside as `rmsse_m5`. Both are labelled.

**Recommended action.** None. The departure is stated wherever the number appears;
keep it that way. See M8 for the separate problem with `rmsse_m5` itself.

## M15 · Winkler score, Clopper-Pearson, Angelopoulos-Bates bound — LOW, all exact

| Quantity | Paper form | Ours | Verdict |
|---|---|---|---|
| Interval score, `harness.winkler:564` | `(u−l) + (2/α)(l−y)1{y<l} + (2/α)(y−u)1{y>u}` (Winkler 1972; Gneiting & Raftery 2007) | identical, then averaged | **exact** |
| Clopper-Pearson, `interval_calibration.py:75` | `Beta(α/2; k, n−k+1)`, `Beta(1−α/2; k+1, n−k)`, endpoints 0/1 | identical | **exact** |
| Coverage upper bound, `interval_calibration.py:307` | `1−α ≤ E[coverage] ≤ 1−α + 1/(n+1)` (Angelopoulos & Bates 2023) | `level + 1/(n_calib+1)` | **exact** |

## M16 · Expected Calibration Error — `eval/agent_calibration.py:185-215` — LOW

**Paper spec.** Guo et al. (2017): `ECE = Σ_m (|B_m|/n)·|acc(B_m) − conf(B_m)|`,
M = 15 equal-width bins, binning by the model's **confidence** = max softmax
probability.

**Official code behaviour — source read in pass 2.**
`gpleiss/temperature_scaling`'s `_ECELoss`: `n_bins=15` by default, boundaries
from `torch.linspace(0, 1, n_bins + 1)`; confidence and prediction from
`torch.max(softmax(logits, dim=1), 1)`; bin membership
`confidences.gt(bin_lower) & confidences.le(bin_upper)` — i.e. **left-open,
right-closed `(lo, hi]`**; accumulation `|avg_confidence − accuracy| × prop_in_bin`
summed over bins. `set_temperature` fits the single scalar T by LBFGS
(`lr=0.01`, `max_iter=200`) minimising NLL on a held-out validation set.

**Our implementation.** The weighted-average formula is exact. Two departures:
(i) binning is on `p_raise` directly, not `max(p, 1−p)` — the standard binary
formulation (Naeini et al. 2015) rather than Guo's multiclass one, and the right
choice here since `p_raise` is a genuine P(y=1), not a max over classes;
(ii) equal-width bins are **coarsened** by greedy merge until every occupied bin
clears a count floor, with the scheme and per-bin counts reported.

**Discrepancy.** (ii) is a deliberate G3 decision and is the more defensible
choice at this n — a fixed 15-bin ECE on a few hundred temperature-0
probabilities is dominated by near-empty bins. Both departures are documented in
the code.

**Recommended action.** Name both in the methodology when the ECE result is
written up, and cite Naeini et al. alongside Guo et al. for the binary
formulation. Separately: **temperature scaling itself is not implemented**, only
ECE and the reliability diagram. Pipeline spec stage 10 lists all three. Either
implement it or narrow the stage-10 acceptance criterion — a G3 sub-decision.

## M17 · BOCPD — `signals/change_point.py:98-128` — LOW

**Paper spec.** Adams & MacKay (2007), Normal-inverse-gamma conjugate: predictive
is Student-t with `df = 2α`, `loc = μ`, `scale = √(β(κ+1)/(ακ))`; growth
`R·π·(1−H)`, changepoint mass `Σ R·π·H`; updates `μ ← (κμ+x)/(κ+1)`, `κ ← κ+1`,
`α ← α+½`, `β ← β + κ(x−μ)²/(2(κ+1))`.

**Our implementation.** All of the above, verbatim.

**Discrepancy.** Two cosmetic: normalisation is `/(sum + eps)` rather than `/sum`
(a negligible downward bias), and the run-length distribution is never pruned, so
its length grows linearly in t — a cost, not a correctness issue, at these n.

**Recommended action.** None. BOCPD is a declared benchmark, not the production
detector.

## M18 · Kostenko-Hyndman selection rule — `eval/intermittency_diagnostic.py` — LOW (fixed)

**Paper spec.** Kostenko & Hyndman (2006) correct the SBC constants to p = 4/3
(not 1.32) and v = 0.5 (not 0.49), with selection rule `v > 2 − (3/2)p` — prefer
SBA **above** the line.

**Our implementation.** Correct as of commit `5f77591` (2026-07-31). The
inequality had been implemented and stated in reverse; it was inherited verbatim
from Finding 19 of `docs/Prj93_external_examiner_assessment.md`, which misquotes
it at three sites (now annotated in place rather than rewritten).

**Discrepancy.** Resolved. Recorded here because the origin matters: the defect
entered from a *review document*, not from the code, and two report-generator
strings would have reintroduced it on the next regeneration.

**Recommended action.** None, beyond the standing structural caveat — since
`2 − (3/2)(4/3) = 0` exactly and CV² ≥ 0 always, classified-intermittent entails
selects-SBA by construction. Both chapters now present the unanimity as geometry,
not as a finding about the estate. Keep it that way.

## M19 · ETS / STL / Prophet / GBM rungs — `models/ladder.py:137-260` — LOW

Library calls, not reimplementations: `statsmodels` `ExponentialSmoothing` and
`STL`, `prophet`, `sklearn` `HistGradientBoostingRegressor`. Nothing to diverge
from a paper.

One methodological note worth stating rather than a discrepancy: `rung2_ets` pins
`trend="add", seasonal="add"` and does **not** run the Hyndman-Khandakar
automatic selection over the ETS family that `forecast::ets` / `AutoETS` would.
That is a defensible restriction at this series length, but it means "ETS" in the
results denotes ETS(A,A,A) specifically. Say so once in the methodology.

## M20 · Chronos-Bolt / Chronos-2 — `models/foundation.py` — LOW

The module docstring pins the exact API surface against the declared codebase
(`amazon-science/chronos-forecasting`), including the 2.x rename of `context` to
`inputs` and the Chronos-2 dataframe path, with the fallback behaviour and the
deliberate refusal to silently degrade the covariate arm to the univariate one.
Zero-shot, no fine-tuning, weights pinned by model id. This is the best-documented
external-code interface in the project; no discrepancy found.

## M21 · Diebold-Mariano with the HLN correction — LOW, deliberately absent

No DM implementation exists. This is correct and deliberate: at n = 6 folds and
h = 7 the Harvey-Leybourne-Newbold small-sample correction factor is exactly zero,
so no DM variant is computable at all — which is why S2 lifted the fold count and
S3 substituted the MCS. `eval/harness.py:92` and `eval/mcs.py:4` both record it.
Pipeline spec stage 14 requires the degeneracy be *stated openly rather than
worked around* (W6); it is.

**Recommended action.** None on the code. Confirm the degeneracy sentence survives
into the methodology chapter, since it is an examiner-facing strength, not a gap.

## M22 · Hurdle / occurrence gate — `signals/occurrence.py:84-118` — MEDIUM

**Paper spec.** Cragg (1971) and Mullahy (1986) specify a **two-part model**: a
*fitted* binary part — probit or logit — for P(y > 0 | x), and a conditional
amount part for E[y | y > 0, x], multiplied to give E[y | x]. The binary part
being a genuine estimated probability is what makes it a hurdle model rather
than a filter; the model's standard errors, its identification and its whole
econometric content live in that estimated first stage.

**Our implementation.** `hurdle()` computes `P(trade) × E[revenue | trade]`
correctly as a product. But `p_trade()` derives P(trade) as
`E[occurrence | day-of-week]`, a groupby-mean of the training labels — and
`occurrence_label()` returns those labels as a **pure deterministic function of
day-of-week**: `np.where(idx.dayofweek.isin(closed), 0.0, 1.0)`, where `closed`
is the static `org_profile.structural_zero_dow(venue)` frozenset. A groupby-mean
of a constant-within-group indicator returns that constant. **P(trade) is
therefore exactly 0 or exactly 1, never fractional, by construction**, and
`hurdle()` collapses to `np.where(closed_dow, 0.0, amount)` — a deterministic
calendar mask.

**Discrepancy.** The module is honest that P(trade) is *"observed, not
estimated"*, and that design choice is defensible and well argued (a known
closure calendar genuinely does dominate a fitted probit here). What is not
recorded anywhere is the stronger consequence: the estimand is **degenerate**,
so no probability is being modelled at all, and the "hurdle" contributes exactly
two things — zeroing structurally-closed days, and fitting the amount model on
trading days only (`trading = train[o_train > 0.5]`). Any sentence describing
this as a Cragg/Mullahy hurdle with an occurrence probability overstates it.

This is the same failure mode as **M18**: a result that is geometry rather than
a finding about the estate. There, classified-intermittent entails selects-SBA
because `2 − (3/2)(4/3) = 0` exactly. Here, `occurrence_gate.py`'s expected
verdict — *"the gate did NOT measurably help"* — is partly preordained, because
against a DOW baseline (`rung1_robust_dow`) the mask is a function of the very
variable the baseline already conditions on. The MCS comparison in
`eval/occurrence_gate.py` is itself sound (correct instrument, correct
rolling-origin, both arms scored on one ruler); it is the *interpretation* that
needs the caveat.

**Recommended action.** No code change — the design is right for the data.
Two prose fixes. (1) In the methodology, describe the Beer Hall gate as a
**degenerate hurdle**: the occurrence part is a deterministic calendar
indicator, not an estimated binary model, so Cragg/Mullahy are cited as the
*framework* the design instantiates, not as a model that was fitted. (2) When
the S4 Part 4b result is written up, state that a DOW-conditioned baseline
already encodes the mask, so a null result is the expected geometry — the same
sentence-shape M18 now uses. Note also that Ellel's arm remains genuinely inert
(`ELLEL_DIARY_LIVE = False`), so the gate has been measured on one venue only.

## M23 · LOVO transfer gate decided without dispersion — `transfer/lovo.py:87-166` — MEDIUM

**Spec violated.** Pipeline spec stage 14: *"Dispersion reported with every point
estimate — W5's bare argmin of a six-fold mean is the defect being closed. MCS
or DM wherever a comparison is claimed."*

**Our implementation.** `lovo_fold` produces **one** `mase_transfer` and **one**
`mase_naive` per held-out venue — a single train/test split, not a rolling
origin — and `run()` reduces the whole A7 capability claim to
`wins = sum(1 for f in folds if f["mase_transfer"] < f["mase_naive"])` over
three venues, gated at "majority, ≥2 of 3". There is no interval, no bootstrap,
no MCS, and no repetition from which dispersion could be estimated. The
`sweep` over `cold_days ∈ {14,21,28,42,56}` re-runs the same single-split
comparison at five window lengths and again reports only a win count.

**Discrepancy.** A comparison **is** claimed — shape-transfer beats
per-venue-naive, the stated A7 gate and an Objective-level result — on two
unreplicated point estimates per venue. The gate's own docstring already
concedes the fragility by carving out Two River Taps post hoc ("transfer 1.19 vs
naïve 0.70"), which is a 1-of-3 loss on a 3-sample comparison: with n = 3 and a
majority rule, the gate passes or fails on a single venue. This is W5's defect
at its least defensible n, in a module the first pass listed as "assumed to be a
harness over methods already audited" — the assumption was wrong.

**Recommended action.** The instrument already exists and is already used
correctly two modules away. Replace the single split with
`harness.rolling_origin` over the held-out venue's post-cold-start span, giving
a loss **vector** per venue, then run `mcs.model_confidence_set(["transfer",
"naive"], L)` exactly as `eval/occurrence_gate.py` does — that file is a
14-line template for this. Report the per-venue MCS set and the paired
bootstrap CI on the difference, and let the gate read off those rather than off
a win count. This is a rerun of reported work, so `PRJ93_RULES.md` gate 3.
If the schedule cannot absorb it, the minimum honest fallback is to state in the
results chapter that A7 rests on three unreplicated point comparisons and
carries no dispersion — but the rerun is cheap and the claim is load-bearing.

## M24 · Ablation ship rule and weather-basis argmin — `signals/feature_ablation.py:87-146` — MEDIUM

**Spec violated.** Stage 14 again, and this one is W5 verbatim: *"a bare argmin
of a six-fold mean"*.

**Our implementation.** `N_FOLDS, HORIZON, MIN_TRAIN = 6, 7, 120`.
`_eval_cols` returns `float(np.mean(mases))` — the six-fold mean, with the
per-fold vector discarded at the return. `ablation()` then sets

```python
gain = (base_mase - m) / base_mase
"ships": gain > SHIP_THRESHOLD and c >= base_cov - 0.03     # SHIP_THRESHOLD = 0.01
```

so a feature is **adopted** on a 1% improvement in a mean of six numbers whose
spread is never computed. `weather_study()` compounds it: `best = min(q2, key=…
["mase"])` is a literal argmin over three training bases, each a six-fold mean,
and `oracle_mase` is quoted as an upper bound from the same construction.

**Discrepancy.** Two adoption decisions and one "best basis" ranking rest on
undispersed six-fold means. A 1% threshold is well inside the fold-to-fold noise
of a 6-fold MASE at these series lengths, so the ship/no-ship flag is not
reliably distinguishable from a coin flip for any borderline candidate.
Mitigating, and the reason this is MEDIUM not HIGH: the generated report already
carries an unusually careful scope note (the ablation binds the Rung-3 GBM only,
not the served `rung4_chronos2_exo`), and the event feature's null is correctly
explained as constant-0 in the test folds rather than as a measurement. The
defect is the statistic, not the honesty.

**Recommended action.** Keep the six-fold vectors instead of collapsing them:
have `_eval_cols` return the array, report mean **and** its bootstrap CI in the
ships column, and put the candidate set through
`mcs.model_confidence_set` so "ships" means "excluded the baseline from the 90%
set" rather than "beat it by 1% on average". Same for `weather_study`'s three
bases — `eval/weather_basis.py` (M25) already does exactly this comparison
properly with a paired moving-block bootstrap, so the pattern to copy is in the
adjacent file. Until then, do not let the word "best" stand unqualified next to
`q2` in the dissertation.

## M25 · `group_icl` and `weather_basis` comparison instruments — LOW, clean

The first pass flagged these two as unread. They are the **counter-example** to
M23 and M24 and deserve recording as such: both score every arm on a per-fold
loss vector, run `mcs.model_confidence_set` at 90%, and add a moving-block
**paired** bootstrap on each arm-pair mean difference —
`eval/group_icl.py:302-356`, `eval/weather_basis.py:217-274` — reusing
`mcs.moving_block_indices` at `BLOCK_LEN = mcs.BLOCK_LEN = 7`, the
horizon-length block justified in report 44. The paired bootstrap draws from a
**deliberately distinct seed** (`PAIRED_BOOTSTRAP_SEED`) so its resample is
independent of the MCS's, and the artefact records both seeds, `n_boot`, and the
block length. `group_icl` additionally records per-venue loss metrics
(`VENUE_LOSS`) because S4's bootstrap found no defensible seasonal-naive basis
for Ellel at 1.2 trading days a week — the M13/G2 problem, handled explicitly
rather than papered over.

**Discrepancy.** None. No external formula is reimplemented here; both are
harnesses over MCS (M10) and the ladder models (M19, M20).

**Recommended action.** None on these files. Use them as the template for M23
and M24 — the gap between this pair and `lovo`/`feature_ablation` is the single
clearest internal inconsistency the audit found, and closing it is mechanical.

## M26 · ECE bin edges and bin count — `eval/agent_calibration.py:185-215`, `config.py:457-458` — MEDIUM

**Paper spec.** Guo et al. (2017) specify **M = 15** equal-width bins. The
released `_ECELoss` implements membership as `gt(bin_lower) & le(bin_upper)` —
intervals **`(lo, hi]`**, left-open and right-closed.

**Our implementation.** `AGENT_ECE_BINS = 10`, and membership is the mirror
image:

```python
mask = (p >= lo) & (p <= hi) if last else (p >= lo) & (p < hi)
```

— intervals **`[lo, hi)`**, left-closed and right-open, with the final bin
closed at both ends.

**Discrepancy.** Two, and the second is the one that bites. (i) 10 base bins,
not Guo's 15 — an undocumented departure additional to the two the first pass
recorded, and one that interacts with the `AGENT_MIN_BIN = 10` floor, since 10
bins each needing ≥10 observations demands n ≥ 100 before coarsening even
begins. (ii) The **edge convention is inverted relative to Guo's**, and with 10
equal-width bins the boundaries fall at 0.1, 0.2, … 0.9 — precisely the round
decimals a temperature-0 model emits when asked for a probability. Every
`p_raise` of 0.7 lands *on* an edge: Guo's code files it in `(0.6, 0.7]`, ours
in `[0.7, 0.8)`. Because `conf` and `acc` are computed as empirical means over
each bin's members, a mass of probabilities sitting exactly on the boundaries
regroups wholesale between the two conventions, and `ECE = Σ (nᵦ/n)|accᵦ − confᵦ|`
changes accordingly. This is not the usual immaterial tie-breaking: on this data
the ties are the *typical* case, not the edge case.

**Why now.** ECE has not yet been run — it is G3, and it is the figure that
closes W10 (*"the most expensive unforced error in the project"*) and W26. So
this costs nothing to fix today and would be expensive to discover after the
reliability diagram is in the chapter.

**Recommended action.** Before the G3 run: (1) flip the membership test to
Guo's `(lo, hi]` with the *first* bin closed at 0 rather than the last closed at
1 — a one-line change that makes the statistic comparable to every published ECE;
(2) either set `AGENT_ECE_BINS = 15` to match Guo, or state the choice of 10
alongside the coarsening rationale already documented; (3) note in the
methodology that at these n the reported ECE is dominated by the coarsening
scheme, and report the scheme string and per-bin counts with the figure — the
code already emits both, so this is a writing task, not a coding one.
Separately, the first pass's finding stands: **temperature scaling itself is
still not implemented**, only ECE and the reliability diagram, while pipeline
spec stage 10 names all three.

---

## What this audit did not cover

*Revised in pass 2. The first pass's two open items are now closed; what
replaces them is a shorter list.*

**Closed by pass 2.**

- The five modules listed as "located but not read" have been read. The
  first pass's assumption — that they are harnesses over already-audited methods
  and so carry no new external method — was **half wrong**. `group_icl` and
  `weather_basis` are exactly that and are clean (M25). But
  `eval/occurrence_gate.py` calls `signals/occurrence.py`, which implements a
  Cragg/Mullahy hurdle — an external method, from a paper on the W54 reading
  list, that the first pass never saw (M22). And `lovo` and `feature_ablation`
  turned out to carry the project's own stage-14 defect rather than an external
  one (M23, M24).
- Three of the four weakly-evidenced rows are now source-read: M11 against
  `statsforecast` 2.0.3 in the local uv cache, M3 against Zaffran's
  `acp_gamma.R`, M16 against `gpleiss/temperature_scaling`. M3's verdict is
  unchanged and better evidenced; M11 is confirmed defect-free; M16 gained a new
  finding (M26).

**Still open.**

- **M8's leading-zero rule.** The M5 competition's own definition is in neither
  the notebook nor any source read this session, and the official
  `WRMSSEEvaluator` was not fetched in either pass. The rule is probably true and
  is not yet citable. G7 addition proposed in M8.
- **`fable::min_trace` / `hts::MinT`** (M4, M5) were never read; those two rows
  still rest on the documented API. The paper quotations behind them are strong,
  so this is a low-value gap, but it is a gap.
- **The Chronos and TabPFN-TS papers** remain unqueried; only our API surface
  against the declared codebase was checked.
- **M11's oracle test** is still skipped —
  `tests/test_intermittent.py::test_matches_statsforecast_on_bernoulli_gap_series`
  needs a Python 3.12 venv where `statsforecast` builds. Pass 2 verified the
  released source by reading it, which is strong, but reading is not running:
  the numerical cross-check remains unexercised.
- **`signals/occurrence.py` was read; `models/group_forecast.py`,
  `eval/inject_realistic.py` and `signals/briefing.py` were surfaced by graphify
  in pass 2 and were not.** They are named here so the next pass does not have to
  rediscover them.


---

## Resolutions, 2026-07-31 (second sweep, report 54)

**M23 CLOSED.** `lovo_fold` now scores each held-out venue on consecutive 7-day blocks,
giving a paired loss vector where there had been one pooled number. `run` reports a
per-venue MCS 90% set and a paired moving-block bootstrap CI, and the report reads off
those. Pooled MASE per venue is unchanged to the digit, which is the control. The result
is more interesting than expected: each venue's verdict is now decisive (all three CIs
exclude zero, the MCS retains one method per venue), but **pooled across the estate the
two are not distinguishable** --- mean difference -0.119 MASE, 90% CI [-0.242, +0.036],
both methods retained. The 2-of-3 majority gate passed on a tally that the estate-level
evidence does not support. The pre-registered gate criterion was deliberately NOT changed
after seeing this; changing a gate on sight of its numbers is the defect this audit
exists to catch. The dispersion is reported alongside it.

**M24 CLOSED, and it exposed a second defect.** `_eval_cols` returns the per-fold vector,
the ship rule is now "the 90% MCS set excludes the baseline and retains this candidate"
rather than "beat the baseline by 1% on a six-fold mean", and `weather_study` puts its
three training bases through the MCS instead of an argmin --- `best` is now `None` unless
the set narrows to one, and the report prints "lowest" with an explicit note that a
ranking is not a finding.

The second defect: **at six folds the moving-block bootstrap is degenerate.**
`mcs.moving_block_indices` clamps `block_len` to `n_obs`, so with `BLOCK_LEN = 7` and six
folds every resample IS the sample, in order. The first run produced zero-width CIs and
MCS p-values pinned to exactly 0.0 and 1.0, and on that basis "shipped" a weather feature
scoring 6.5% WORSE than the baseline. Had the MCS been added without checking the numbers
it returned, the defect would have been a worse one than the ship rule it replaced. Fixed
two ways: `_block_len` guards the clamp, and the fold grid was widened from a 6-fold cap
to the whole active span at a full-horizon step (39 disjoint folds), which is the remedy
`harness.rolling_origin`'s own docstring already recommends (report 43). Verdict after the
fix is unchanged --- **nothing ships** --- and the whole candidate set including the
baseline is retained, so nothing is separable from the baseline at all. Every A14 MASE
moved, because the fold grid moved: baseline 1.5460 -> 0.9551.

**M26 CLOSED**, before the G3 run as the row required. Bin membership is Guo's
`(lo, hi]` with the first bin closed at 0, and `AGENT_ECE_BINS` is 15 to match the paper.
Pinned by `test_a_probability_on_a_bin_edge_falls_in_the_lower_bin`.

**M16 CLOSED.** `fit_temperature` implements Guo §4.2: a single scalar fit by NLL on a
validation split, applied as `p' = sigmoid(logit(p) / T)`. Wired into the G3 payload and
report. Two properties are stated with it rather than left implicit --- the map is
strictly monotone so it cannot move any ranking, threshold sweep or AUC, and at this N the
fitted T is itself an estimate with real variance.

**M11 CLOSED.** Run out of band against statsforecast 2.1.1 on CPython 3.12.13, 200
Bernoulli-gap series: max absolute difference **1.3e-15** for both CrostonClassic and
CrostonSBA, and the leading-zero edge cases agree exactly. One limit recorded in the test:
at the default alpha = 0.1 our parameterised `1 - alpha/2` and their hard-coded `0.95`
coincide, so this run cannot discriminate them.

**M8 PARTLY CLOSED.** The docstring no longer claims "exactly as the M5 competition
defined it" --- nothing this project holds evidences M5's leading-zero convention. A
further defect was found while checking the callers: `Ruler.rmsse_m5` took the reported
basis and so silently switched to the trading-day series, which removes exactly the
closed-day transitions the lag-1 denominator exists to expose. It is now always computed
on the calendar series. Adding the M5 source to NotebookLM remains open (G7).


## M8 resolution, 2026-07-31 — CLOSED against the literature

The M5 sources were added to NotebookLM and queried source-restricted.

**Divisor: VERIFIED CORRECT.** Hewamalage et al., *A Look at the Evaluation Setup of the
M5 Forecasting Competition*, eq. 5, defines M5's RMSSE scale verbatim as

    |sq_t| = (Y_t - F_t)^2 / [ 1/(n-1) * sum_{i=2}^{n} (Y_i - Y_{i-1})^2 ]

with n *"the length of the observed period of the series"*. `naive_squared_scale` takes
`np.mean` over the n-1 first differences, which is that expression exactly. This is now
evidenced rather than reasoned, and it **confirms pass 2's withdrawal of pass 1's claim**
that we divided by n rather than n-1. Note the source is Hewamalage et al., the same
authors as the eq. 11 the project already cites for the general scaled-error form.

**Leading-zero rule: NOT EVIDENCED, AND MOOT.** Asked across ALL sources in the notebook,
NotebookLM reports that none states the M5 denominator excludes the pre-launch period.
Four sources define or analyse RMSSE and none carries the rule; the M5 Competitors' Guide
URL is dead and resolves to a 404 page, so it contributes nothing. Web-search summaries do
assert the rule, but a search summary is not a source and is not admitted as evidence
here.

It does not matter for this project either way. `venue_ruler` builds the calendar series
with `fill_calendar`, which spans the venue's OWN first row to its last, so there is no
leading zero run to exclude. M5 needed the rule because its 42,840 products share a single
calendar beginning in 2011 and most launched later; a per-venue revenue series has no such
prefix. The convention is therefore unverifiable from what we hold AND inapplicable, which
is a stronger resolution than either half alone.

**A defect found while closing this.** `Ruler.rmsse_m5` took the reported basis and passed
`series_for(basis)`, so on a trading basis the M5 figure was computed on the
closed-days-removed series, stripping exactly the open-to-closed transitions the lag-1
denominator exists to expose. It now always uses the calendar series: a figure labelled M5
must mean one thing regardless of what sits beside it. The docstring no longer claims
"exactly as the M5 competition defined it"; it states what is verified and what is not.

---

## Resolution · M2, M5, M6, M7 — 2026-08-01 (report 55)

### M2 · the band is now genuinely split-conformal

`node_quantiles` fitted the DOW median on the training span and scored it against that
same span. The quantile was of an in-sample residual and carried no coverage guarantee
despite the name. Fixed by giving the calibration its own block: three disjoint
`TEST_WEEKS` blocks walk back from the end of the calendar (test | calibration |
validation | fit), the median is fitted strictly before `cal_start`, scored on
`[cal_start, test_start)`, and THAT SAME fitted median forecasts the test block, so the
guarantee transfers to the served band.

The MinT weights moved with it, for the same reason: W is the base-forecast error
covariance, and an in-sample residual understates it. Both paths, DOW and Croston, now
take `w` from the held-out calibration residual.

**Re-run, and the published direction is half wrong.** Decomposed over four controls
(report 55), at nominal ninety per cent: category coverage RISES 77.6 to 85.1, item
coverage falls 77.6 to 72.1. Shortening the fit span costs almost nothing (1.5pp at L2,
0.1pp at L3); the whole movement is the band, and it is asymmetric because the 343-day
in-sample span can yield a LARGER quantile than the 56-day calibration block at sparse
nodes. Control run A reproduces the published pre-correction figures exactly.

**A second finding, left unfixed on purpose.** One node, Lager - BH, adopts on a 0.21 per
cent validation margin (1.418 against 1.421) and is then 96 per cent worse on test (1.749
against 0.891), dragging item coverage 72.1 to 64.0 and the keg order 1.09 to 1.39. A
one-standard-error margin would reject it. Adding one after watching this adoption fail is
post-hoc criterion-editing and a methodology change, so it goes to a human gate instead.

Sauvignon Blanc's adoption correctly disappears: its first sale is ten days after
`val_start`, so the contest's fit span is all zeros, the scaled-error denominator is zero
and it declines rather than adopting on a NaN.

Coverage: `test_the_conformal_calibration_set_is_disjoint_from_the_fitting_set`,
`test_the_band_is_the_conformal_quantile_of_the_held_out_residual`,
`test_mint_weight_is_the_variance_of_the_held_out_signed_residual`.

### M5 · WLS_v, not MinT

Renamed in the module docstring, `mint_reconcile`'s docstring, the report generator, the
CLI banner and the A6 artefact. The paper's own convention: MinT is reserved for
MinT(Sample) and MinT(Shrink); the diagonal case is WLS_v. The reason for choosing the
diagonal is now stated rather than implied — at 41 nodes over 399 days the shrinkage
estimator would estimate a covariance with more entries than the calibration block has
rows. The persisted DB key `mint_dowmedian` is left alone deliberately: it is an
identifier joined on by `signals/stock_inventory.py`, not a claim in prose.

### M6 · the last 1.32

One live literal remained, in the empty-case branch of the A6 report generator. Now
formatted from `ADI_INTERMITTENT_CUTOFF` to 4 dp. The other two sites were already fixed
in commit `5f77591`.

### M7 · the clamp is now countable

`conformal_min_n(level)` gives the smallest calibration set at which a level is attainable
(4 at 80 per cent, 9 at 90). `evaluate` tallies how many group-conditional bands were
issued below it and both the CLI and the A5 report print the count. Behaviour unchanged —
the clamp is kept because an infinite band is useless to an operator — but it can no
longer lapse silently. On the Beer Hall: **0 of 60 group bands at both levels**.

A defect was found while writing it: the closed form `ceil(level/(1-level))` reports 5 and
10 rather than 4 and 9, because `0.8/(1-0.8)` is `4.000000000000001` in binary. The
boundary is now searched with the same expression `conformal_quantile` clamps on, and
asserted minimal and attainable.

### Found in passing, NOT a ledger row

Regenerating the A5 artefact moved every figure in it and flipped the Mondrian 80 per cent
gate to FAIL (78.5 to 75.1 against a +/-3pp tolerance). A stash control proves the M7 edit
changes no band: the committed artefact was never regenerated after the warehouse restore
of commit `1641dbc`. No published number is affected — none of those four figures appears
in results.tex, whose coverage table comes from the larger `interval_calibration` rolling-
origin instrument. But other artefacts may be stale for the same reason and that sweep has
not been done.

## Resolution · M9, M22 — 2026-08-01 (report 55)

### M9 · the CUSUM operating point is in band-units

No code change, as the row recommended. A paragraph added to methodology
`\section{Detection}` states that `k = 0.5`, `h = 5` and the average-run-length tables
behind them are derived for a statistic standardised by a STANDARD DEVIATION, that
Equation `eq:z` divides by a conformal half-width instead, that the ratio between the two
depends on the residual distribution's shape rather than being a constant, and therefore
that no ARL claim is made on that literature's authority. What licenses the operating point
is named instead: the empirical validation against the real Two River Taps closure and the
synthetic injections. The alternative (restandardise by a robust scale, recover the tables,
lose the coupling to the interval whose coverage is established) is stated and the
trade-off argued rather than left implicit.

One dangling cross-reference was caught on read-back before it could compile to `??`:
`sec:res-detection-eval` does not exist. Corrected to `sec:res-injection` and repushed.

### M22 · already written, row was stale

Checked against the LIVE Overleaf files rather than assumed, and both halves the row asked
for are already present:

- Methodology `\subsection{Occurrence, and why the hurdle here is not estimated}` states
  that the first factor "takes only the values 0 and 1, never an intermediate probability",
  that the specification is "instantiated rather than fitted", and that Cragg and Mullahy
  are "cited here for the framework the design instantiates, not for a binary model that
  was estimated".
- Results `\section{The occurrence gate}` states that against a DOW-conditioned baseline
  the mask "is a function of a variable the baseline already carries, so a null is the
  expected geometry rather than a measurement about the venue", explicitly parallels it to
  the M18 geometry argument, and narrows the surviving claim to the one thing the gate adds
  beyond the baseline's features.

No edit made. The ledger row had simply not been updated when the prose was written.

## Resolution · G2 and M13 — 2026-08-01 (report 57)

**The decision was never actually open.** `sec:res-basis` already states it, with evidence:
Ellel's four scaled bases give bootstrap interval widths of 52.5, 45.2, 42.2 and 65.6 per
cent, and the two trading bases reach back nearly six weeks so the denominator inflates to
about 800 and the induced MASE collapses to about 0.09. The chapter's conclusion is "a
change of instrument rather than a change of basis", with Ellel on unscaled error and the
Winkler score, supported by `chatfield_all-zero_2007`. Verified by reading the live
Overleaf file, not assumed. Same failure mode as M22: prose written, ledger row not closed.

**What was open was enforcement.** The decision existed as a private dict repeated verbatim
in `eval/group_icl.py` and `eval/weather_basis.py` — the exact defect the methodology
chapter condemns for the MASE denominator ("four separate private copies of the
denominator, none of which recorded which reading it used"). Now
`config.VENUE_SCALE_BASIS` / `config.VENUE_LOSS` / `config.is_scaled_venue`, with the
reasoning stated where the constant lives. Both modules read it, and both artefacts
regenerate BYTE-IDENTICAL, so the refactor changed no behaviour.

**Two unpublished violations, left as they stand.** `transfer/lovo.py` scores Ellel on
`calendar_lag7` MASE and pools all three venues into one statistic; under G2 that is two
faults, since Ellel admits no scaled error and a pooled MASE is meaningful only where MASE
is. `eval/worldcup_fixture_probe.py` does the same and writes no artefact at all. Neither
appears in either chapter, so nothing is retracted. Fixing `lovo.py` requires deciding what
a pooled cross-venue statistic means when one venue admits no scale, which is a methodology
decision and not a bug fix. Recommendation on file: report Ellel separately on unscaled MAE
and pool only the two scaled venues, stating the reduced pool.
