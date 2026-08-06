# Literature conformance — the review's verdicts against PRJ93's method

Written 2026-08-05 under `brain/PRJ93_RULES.md`. Subject: the completed
`chapters/literature_review.tex` on Overleaf (revision 6, 67,389 bytes, SHA256
`4e6e6218…5417`, 90 citation keys) against the implementation under `brain/`.

**Inputs.** Extraction of 63 methodological verdicts →
`brain/knowledge/05_litreview_verdicts.md`. Implementation state from
`ledger/code_vs_paper.md` (M1–M26, all closed), `ledger/numbers_audit.md` +
`numbers_audit_resolutions.md`, `knowledge/04_supervisor_evidence_pack.md` §3.5,
`ledger/phase_state.md`, and direct source reads where a ledger row was
contested. Source verification via NotebookLM `d565d5f0` this session, seven
queries, verbatim quotation required.

**Local/remote check.** `brain/drafts/literature_review.tex` is byte-identical to
the Overleaf copy. No passage disagrees between them.

---

## 0. Verification corrections found this session

Three propositions the chapter treats as established by a source are **not in
that source**. All three are *mathematically correct extensions* the chapter
derived itself. The method is unaffected; the attribution is the defect. This is
a coherent pattern and it is new — neither T8 pass caught it, because both passes
checked *claims about papers* and these are *inferences from papers*.

| # | Chapter proposition | What the source actually says | Verdict |
|---|---|---|---|
| **V1** | R19 — constant-zero optimality under absolute error holds only for **p > 2** | `hewamalage_forecast_2023` states the **unconditional** version: *"On intermittent series, measures that optimize for the median are problematic since they consider constant zeros as the best prediction."* NotebookLM: **NOT SUPPORTED** for any threshold or condition | The p>2 condition is elementary (the median is zero iff more than half the observations are zero) and **correct**. It is the chapter's own derivation. Must be stated as such, not attributed |
| **V2** | R37 — an **observed** regime variable "removes the state-misclassification term" a latent-state method carries (`sun_conformal_2025`) | The paper defines `z_t` as *"the **unobserved** discrete mode"* by construction. The vanishing condition it gives is **Corollary A.2**, not Thm 4.3: *"If predicted state probabilities are accurate … then ε = 0."* NotebookLM: **NOT SUPPORTED** for the observed-vs-inferred framing | The inference is valid *a fortiori* (observed ⇒ ẑ=z ⇒ ε=0), and it is the strongest single argument for our Mondrian design. But it is **our extension of Corollary A.2**, and the theorem number currently cited is wrong |
| **V3** | R20 — a naive benchmark scoring exact zeros **"deflates the scaling denominator"** | Source wording is narrower: *"it can be problematic when benchmark errors have perfect predictions (zero errors), for example with the naïve method giving exact zeros on zero actual values"* | Supported in substance. "Deflates" is our word and quantifies a direction the source does not. Soften or own it |

Verified correct and quotable this session, no change needed:
`kolassa_we_2023` (*"The **only** error measures whose minimizing point forecasts
are coherent are the squared error and monotonic functions of weighted sums of
squared errors"*; MAE *"usually not"*; MASE *"just scaled MAEs"*),
`hansen_model_2011` (*"uninformative data yield a MCS with many models"*; *"We
view this as a strength"*), `guo_calibration_2017` (*"We use ECE as the primary
empirical metric"*), `barber_conformal_2023` (Thm 2 bound, verbatim),
`harvey_testing_1997` (correction factor, verbatim),
`diebold_comparing_1995` (*"oversized in small samples"*),
`hewamalage_look_2021` (*"Scale normalization of the M5 error measure results in
less stability than other scale-free errors"*), `brigato_there_2025`,
`dixon_independence_2007` (*"False alarm—prone automation hurt overall
performance more than miss-prone automation"*), `chatfield_all-zero_2007`
(*"lowest cost when lumpiness is high; … also best for mid-lumpiness, if the
shortage cost is much higher than the holding cost"*), `ansari_chronos-2_2025`
(group attention + cold start), `kim_towards_2022`, `liu_elephant_2024`
(*"VUS-PR emerges as the most robust … accurate … and fair"*),
`bavaresco_llms_2025` (*"validating LLM judges against task-specific human
annotations before deploying"*), `montero-manso_principles_2021` (*"Global
methods are not more restrictive … without any assumptions about similarity"*;
*"In **large** datasets, a global algorithm can afford to be quite complex"*).

**NotebookLM reliability note, third session running.** Its citation *indices*
were scrambled in two of seven responses (quotes correct, reference numbers
pointing at the wrong source record). The verbatim text was right every time the
question demanded it. Search index, not oracle — the standing ledger rule holds.

---

## 1. Conformance summary

63 extracted verdicts. 18 are chapter-internal reporting standards with no
method surface (how the review must write about its own sources) and are marked
N/A below rather than padded into conformance. The remaining **45 bear on our
method**:

| Verdict | Count |
|---|---|
| **CONFORMS** | 24 |
| **DIVERGES — SHOULD FIX** | 8 |
| **DIVERGES — DEFENSIBLE** (human decision required) | 5 |
| **DIVERGES — UNRESOLVED** (declared limitation) | 8 |

Plus **2 contradictions the review identified and did not resolve** (§5), which
are writing defects as well as method questions.

---

## 2. CONFORMS — 24 rows

Recorded compactly; each cites the keys and the implementation path. These need
no action and several are viva assets.

| ID | Requirement | Keys | Implementation | Note |
|---|---|---|---|---|
| R3 | Classical/linear models set the bar; elaborate methods clear it on evidence | `chae_value_2024`, `hossain_comparative_2025`, `schmidt_machine_2022` | `models/ladder.py` rungs 0–4 | `rung1_robust_dow` is a real baseline, not a straw one — it wins at 6 folds |
| R5 | Dispersion with every point estimate | `schmidt_machine_2022`, `hewamalage_look_2021` | `eval/mcs.py`, paired moving-block bootstrap | Closed by M23/M24. W5 defect gone |
| R6 | Globality is an estimation-complexity trade with no size threshold; small-estate pooling is our own conjecture | `montero-manso_principles_2021` | `eval/group_icl.py` | **Asset.** S5 ran it, result was negative, negative is published. The chapter frames it as a falsifiable conjecture and it was falsified |
| R7 | Ladder classical → transfer global; gains from TS pretraining not LM machinery | `tan_are_2024`, `das_decoder-only_2024` | `models/ladder.py`, `models/foundation.py` | |
| R10 | Croston: model interval and size separately; SBA applies 1−α/2 | `croston_forecasting_1972`, `syntetos_accuracy_2005` | `models/intermittent.py` | M11 CLOSED — max abs diff **1.3e-15** vs statsforecast 2.1.1 on 200 series |
| R11 | Cutoffs 4/3 and 0.5, not SBC's 1.32/0.49; selection is the diagonal | `kostenko_note_2006`, `syntetos_categorization_2005` | `eval/intermittency_diagnostic.py` | M18 fixed at `5f77591`. Degeneracy over the trigger set stated as geometry |
| R13 | A hurdle is only as good as its occurrence signal | `cragg_statistical_1971`, `mullahy_specification_1986` | `signals/occurrence.py` | Beer Hall arm conforms; Ellel is UNRESOLVED (§4, D-U3) |
| R14 | Weather must be shown to earn its place | `haben_short_2019` | `eval/weather_basis.py` | S6: weather marginal, no serving optimism. MCS-based, not argmin |
| R15 | Attribution shares are not out-of-sample contribution | `hertel_explainable_2026` | `eval/weather_basis.py` | Hertel demoted to weak corroboration with the collinearity objection stated |
| R18 | Adaptivity costs efficiency; adapting to a shift that never arrives is worse | `zaffran_adaptive_2022`, `gibbs_adaptive_2021` | `conformal/methods.py`, `eval/interval_calibration.py` | M3 CLOSED — faithful BOA port, two independent aggregations, per-bound pinball |
| R20 | A naive benchmark scoring exact zeros distorts the scale | `hewamalage_forecast_2023` | `calendar_lag7_active` basis | See V3 on wording |
| R26 | DM with the Harvey correction; the factor vanishes at n≈h | `diebold_comparing_1995`, `harvey_testing_1997` | `eval/fold_vectors.py`; degeneracy stated not worked around | **Asset.** At n=6,h=7 the factor is exactly 0. 273 origins lift it to 0.976 |
| R27 | Use an MCS; a near-complete retained set is a statement about evidence | `hansen_model_2011` | `eval/mcs.py` | Faithful to the paper over `arch`'s default (moving-block, not stationary) |
| R28 | Origin count is not a free parameter | `brigato_there_2025`, `hewamalage_look_2021` | `eval/fold_vectors.py` | 6 → 273/260/205. Second limb (report unscaled alongside) met per §4.1 |
| R30 | Change-point ≠ point-anomaly | `adams_bayesian_2007`, `truong_selective_2020` | `signals/change_point.py` | |
| R31 | CUSUM in production, BOCPD as benchmark, ARL's two-sided cost | `page_continuous_1954` | `signals/change_point.py` | M9 CLOSED: methodology states the constants are band-units and makes **no ARL claim on that literature's authority** |
| R32 | Point-adjusted F1 cannot headline | `kim_towards_2022`, `liu_elephant_2024` | `eval/change_point_eval.py` | Conforms by avoidance — no F1-PA is reported anywhere |
| R34 | A simple statistical detector must be in the comparison set | `liu_elephant_2024` | CUSUM is the production detector | Conforms by construction |
| R35 | Coverage loss is **bounded**, not proportional | `sun_conformal_2025`, `barber_conformal_2023` | chapter + methodology | Corrected in revision 3 |
| R40 | The rhythm is the retrieval half only; claim no memory architecture | `hu_memory_2026`, `park_generative_2023` | `signals/residual.py` | Claim narrowed to what the code does (W28 handled by retreat, correctly) |
| R51 | Fatigue cost is paid by the next alert; magnitudes are clinician-level IRRs | `ancker_effects_2017` | `signals/briefing.py` de-dup + fatigue penalty | V-CORRECTED 2026-08-03 (was "odds ratios", alert-level) |
| R61 | The delivered rhythm is per-venue; pooling examined and not adopted | `montero-manso_principles_2021` | `config.VENUE_SCALE_BASIS`, per-venue serving | Contribution sentence rewritten to match |
| R62 | One rater ⇒ no IRR; author-as-rater is an internal-validity threat | — | disclosed in scope paragraph | |
| R2 | An agent acting unasked must hold an explicit normality model | `lu_proactive_2024`, `dixon_independence_2007` | the learned rhythm + conformal band | The band *is* the normality model, and it is calibrated |

---

## 3. DIVERGES — SHOULD FIX (8)

No defensible reason; each weakens the work; each closes with a run or an edit.
Ranked by marginal value to the dissertation.

### D-F1 · The Angelopoulos–Bates upper bound is applied at Ellel, where its condition fails
- **Requirement** R16: the split-conformal **upper** bound `1−α ≤ E[cov] ≤ 1−α+1/(n+1)` requires almost-surely distinct conformity scores; on a mostly-zero series the scores tie at zero and the upper limb does not hold.
- **Keys** `angelopoulos_conformal_2023`.
- **What we do** `eval/interval_calibration.py:309` computes the bound for **every** venue unconditionally. `eval/interval_calibration.md:16` reports `ellel: n_calib 1792, bound 0.9006` — on the venue that is **82% structural zeros**, where `|residual|` ties at 0 on the great majority of calibration points.
- **Why it is not defensible** The chapter states the no-ties condition itself, in its own words, after a reviewer raised it in iteration 2. Publishing a bound at the one venue where the chapter says it does not apply is the exact defect class the examiner assessment calls "an examiner can check it in ninety seconds".
- **Close it by** Either gating the bound on a tie fraction and printing "not available at this venue" for Ellel, or reporting it with the condition failure stated. Code change ~10 lines in `interval_calibration.py`; regenerate the artefact. **No conclusion moves** — the bound is not load-bearing for any claim, which is exactly why leaving it wrong is a pure loss.

### D-F2 · VUS-PR is committed to in the chapter and not computed — but the dependency is available
- **Requirement** R33 (+R32): the review rejects point-adjusted F1 and commits to a lag-tolerant VUS-PR-style measure.
- **Keys** `liu_elephant_2024`, `kim_towards_2022`, `bhattacharya_towards_2024`, `gim_evaluation_2023`.
- **What we do** `eval/agent_eval.py:563 vus_pr_supplement` is implemented and deliberately never reimplements the metric — it calls the pinned TSB-AD / VUS library. Report 11 records *"not computed, dependency unavailable"*. **That is stale.** `.venv-eval` has both `vus` and `TSB_AD` importable (verified this session); `.venv-run` and `.venv-forecast` do not. No committed `eval/agent_eval.json` exists carrying a VUS-PR number.
- **Why it is not defensible** W25 is a broken promise costing marks in the Lit-review-vs-Results consistency the examiner assessment weights heavily, and it is blocked on nothing. The state brief's claim that VUS-PR "ran" is unevidenced by any artefact.
- **Close it by** Running `eval.agent_eval` from `.venv-eval`. Offline, no API key, no model calls. Estimated **5–15 min**.

### D-F3 · The interval results print point estimates where the repo holds the dispersion
- **Requirement** R17 (report coverage with the width and the n that produced it), R25 (score the predictive distribution with a proper scoring rule; coverage alone suppresses sharpness).
- **Keys** `angelopoulos_conformal_2023`, `kolassa_evaluating_2016`.
- **What we do** `harness.winkler` is computed for every arm. `results.tex` `tab:winkler` carries **dashes** for Ellel and Two River Taps across four arms whose means exist at `log/49:135`. The coverage table carries prose ("at nominal", "over-covers, closed venue") where the caption promises Clopper–Pearson intervals that exist: `[0.899, 0.927]` and `[0.951, 0.973]`.
- **Why it is not defensible** A dash reads as "not measured". We measured it. This is the single largest reporting gap in the two chapters per `numbers_audit.md`, and the remedy is transcription.
- **Close it by** Transcription from committed artefacts. **No run needed.** Overleaf push (gate 5).

### D-F4 · `tab:ladder` is 27 cells of six-fold means with bolded winners and no dispersion
- **Requirement** R5, R27, R28.
- **Keys** `hansen_model_2011`, `brigato_there_2025`, `hewamalage_look_2021`.
- **What we do** Report 43 §3 holds sd, se and n for every rung in that table. The table prints none of them, and bolds a winner.
- **Why it is not defensible** This is W5 verbatim and W36 — *the single named reason Distinction is "Not met"*. The statistics exist.
- **Close it by** Transcription, plus a decision on whether the table becomes a chart (gate 4: a plain table is a defect unless justified). **No run needed.**

### D-F5 · The Ask-F1 sweep's degeneracy is stated as a general condition and never as our instance
- **Requirement** R55: F_β is informative only if both failure modes occur; a one-sided sweep is degenerate by construction.
- **Keys** `trinh_hil-bench_2026`.
- **What we do** Our sweep has **zero misses and a flat cost of 8.0 at every ratio 1:1 to 10:1**. The review states the general degeneracy condition and, by the R-Zero rule, withholds the instance. No results chapter states it either.
- **Why it is not defensible** The review sets up a condition our own data satisfies and nobody closes the loop. W27 open.
- **Close it by** One paragraph in Results. **No run needed** — the numbers exist.

### D-F6 · No threat model for the retrieval store
- **Requirement** R41: a production-populated retrieval store is an attack surface; state a threat model.
- **Keys** `zou_poisonedrag_2025`.
- **What we do** The chapter cites PoisonedRAG and the methodology states no threat model. The chat-log signal (`signals/chatlog_kb_gap.py`) is live in the briefing and is populated by staff-authored content.
- **Close it by** A short methodology paragraph. **No run needed.**

### D-F7 · The MinT/WLS_v unbiasedness precondition is never checked on the zero-heavy nodes
- **Requirement** R22: MinT optimality is *minimum variance among **unbiased** linear reconciliations*, and unbiasedness is not innocuous on zero-inflated series.
- **Keys** `wickramasuriya_optimal_2019`, `kolassa_we_2023`.
- **What we do** M5 CLOSED the naming (WLS_v, not MinT) and states why the diagonal was chosen. Nothing states or tests that the base forecasts are unbiased — and the Croston-adopted nodes are exactly where the median-eliciting base is expected to be biased low.
- **Close it by** Either a residual-mean check per node reported alongside A6 (cheap run, `hierarchy/reconcile.py`), or an explicit statement that the condition is assumed and not verified. Recommend the check — it is ~20 lines and it converts an assumption into a measurement.

### D-F8 · The headline detection number is a recall figure, against a literature that disqualifies recall-led metrics
- **Requirement** R42: the dominant failure mode of proactive agents is **over-offering** (>50% false-alarm rate on all strong models), so a recall-led metric is disqualified.
- **Keys** `lu_proactive_2024`.
- **What we do** The published detection headline is **0.996 recall** with 2–6 day latencies from the 644-injection grid.
- **Nuance, stated honestly** 0.996 is *detector*-level, not *intervention*-level, and S10 measured the injection-realism discount at zero, so the number itself stands. The defect is that it is the **headline** while the review argues the opposite selection criterion.
- **Close it by** Demoting recall to a supporting figure and leading on the precision/cost-weighted figure — which requires D-F2 (VUS-PR) and ideally the cost sweep. Partly a writing fix, partly waits on D-F2.

---

## 4. DIVERGES — DEFENSIBLE (5) — each is a human decision

**These are the viva rows.** Each is presented separately in the gate message with
a recommendation. Nothing here is decided by the agent.

### D-D1 · MASE remains the headline metric where the chapter's own argument favours RMSSE
- **Requirement** R21/R22/R23. `kolassa_we_2023`, verbatim and unambiguous: *"The **only** error measures whose minimizing point forecasts are coherent are the squared error and monotonic functions of weighted sums of squared errors"*, and MASE is *"just scaled MAEs"*, therefore *"usually not"* coherent. `hewamalage_forecast_2023`: absolute-error measures optimise the median.
- **What we do** RMSSE **is computed**, on the same four bases as MASE so the two share a ruler, and it is the MCS **secondary** loss (`tab:mcs-config`). MASE is the headline. This is gate G1, untaken.
- **The case that it transfers (bar is high — the review criticises this class)** Kolassa's coherence result is about **hierarchical** coherence, and our headline claims are L1 (venue-level), not hierarchical. The median-eliciting objection bites hardest at Ellel, and Ellel has already been moved **off scaled error entirely** (G2, `VENUE_LOSS`) — so the venue that motivates Fatal 3 no longer reports MASE at all.
- **The case against** The examiner names this Fatal 3 and it is `[O]`. Changing the headline changes every number in Results and the review's metric paragraph.
- **Evidence that would support the divergence** A stated demonstration that the served-model **ordering** is unchanged under MASE and RMSSE at both scaled venues. Partially in hand: report 44 already runs the MCS at both losses. Completing it is cheap.
- **Recommendation** **Keep MASE as headline, and defend it on the record** — but only after running the ordering-invariance check, so the defence is a measurement rather than a preference. See run R4.

### D-D2 · Ellel is scored on unscaled MAE, not on a cost function, where Chatfield's argument is explicitly about cost
- **Requirement** R24. `chatfield_all-zero_2007`, verbatim: all-zero forecasts *"yield the lowest cost when lumpiness is high; … also best for mid-lumpiness, if the shortage cost is much higher than the holding cost"*.
- **What we do** G2 moved Ellel to unscaled MAE + Winkler. Chatfield licenses *changing the objective*, and we changed the **instrument** (scale) rather than the **objective** (loss → cost).
- **The case that it transfers** The cost function Chatfield needs has two parameters — unit shortage cost `b` and unit holding cost `h` — and **neither has ever been elicited from the operator**. A cost-weighted objective with invented `b` and `h` would be a worse artefact than an honest MAE, because the conclusion would be a function of two numbers we made up. This is a property of the problem (no cost data), not convenience.
- **Evidence that would support it** The §2.3 data-provision record showing the elicitation never happened, cross-referenced to ask 6 (Elliot). This is already the strongest evidence in the project that scope reduction was externally imposed.
- **Recommendation** **Accept the divergence and argue it.** State that Chatfield's remedy is a cost objective, that its two parameters are unelicited, and that MAE is the honest degenerate case. Cost: one methodology paragraph.

### D-D3 · The occurrence gate is a degenerate hurdle: the binary part is a deterministic calendar mask, never an estimated probability
- **Requirement** R13. `cragg_statistical_1971`, `mullahy_specification_1986` specify a **fitted** binary part; the estimated first stage is where the econometric content lives.
- **What we do** `signals/occurrence.py::p_trade` returns exactly 0 or 1 by construction, so `hurdle()` collapses to a calendar mask (M22).
- **The case that it transfers** A **known closure calendar genuinely dominates a fitted probit** — there is no uncertainty to model about whether a venue is open on a day it is contractually closed. Fitting a probit to recover a constant would add variance and no information. The methodology already states this and cites Cragg/Mullahy *"for the framework the design instantiates, not for a binary model that was estimated"*.
- **The honest cost, already recorded** Against a DOW-conditioned baseline the mask is a function of a variable the baseline already carries, so the null result is **expected geometry, not a measurement about the estate**. Both chapters say so.
- **Recommendation** **Accept.** This is already argued in both chapters and argued well. No action beyond confirming the sentence survives into the final Results.

### D-D4 · Chronos-2 is called with an observed-state Mondrian split rather than an inferred latent state
- **Requirement** R37 / `sun_conformal_2025`. **See V2 — the source does not say what the chapter says it says.**
- **What we do** A Mondrian variant splitting active from structural-zero days, i.e. an **observed** regime variable.
- **The case that it transfers** The design is *better* than the paper's, not worse: Corollary A.2 gives ε = 0 under accurate state prediction, and an observed state achieves ε = 0 exactly rather than asymptotically. This is a genuine strength.
- **What must change** The citation currently points at Thm 4.3 and asserts a framing (`observed` vs `inferred`) the paper does not use, since the paper defines the state as unobserved by construction. Re-cite to **Corollary A.2** and present the observed-state case as **our extension**, derived in one line.
- **Recommendation** **Accept the design, fix the attribution.** This converts a checkable misstatement into a defensible contribution. Cost: two sentences.

### D-D5 · TabPFN-TS is named as regime-appropriate and never entered in the ladder
- **Requirement** R8: 3 venues / 1 year / few regressors sits *inside* the regime where Chronos-2 **and TabPFN-TS** are the licensed choices, and the model choice should be justified by regime fit.
- **Keys** `hoo_tables_2026`, `hollmann_accurate_2025` (11M params, up to 10,000 samples — verified).
- **What we do** The ladder runs rungs 0–4 with Chronos-Bolt / Chronos-2. TabPFN-TS is argued for and never tried.
- **The case that it transfers** Thin. The chapter makes a regime-fit argument that names two model families and tests one. "We ran out of time" is not a property of the problem.
- **The case for accepting anyway** Adding a rung this late re-opens model selection, and the pre-registration-by-commit discipline — *"the strongest thing in the project"* — means a new entrant after the fact needs its own pre-registered gate. There is a real methodological cost to adding it now, and it is not the convenience argument.
- **Recommendation** **Human call, and I lean toward running it** (see run R5) precisely because it is cheap and because a named-but-untested alternative is the easiest question an examiner asks. If not run, the review sentence must be narrowed to name only Chronos-2.

---

## 5. DIVERGES — UNRESOLVED (8) — declared limitations

Cannot close within remaining scope. Each becomes a written limitation.

| ID | Requirement | Keys | Why it cannot close | Blocker |
|---|---|---|---|---|
| D-U1 | R56 — ECE is the named calibration instrument | `guo_calibration_2017` | **Code exists and is correct** (`eval/agent_calibration.py`; M16/M26 CLOSED — Guo's `(lo,hi]` edges, 15 bins, `fit_temperature` per Guo §4.2). It cannot run: `collect_records` needs `eval/agent_cache.json`, **which does not exist**, and populating it requires live model calls | Anthropic key (Ryan) |
| D-U2 | R45/R53/R54 — gate on a calibrated acceptance probability against a threshold derived from the operator's **elicited** cost ratio | `fu_prism_2026`, `trinh_hil-bench_2026`, `dixon_independence_2007` | β in the F_β that replaced Ask-F1 **has no value** because no cost ratio has been elicited. The sweep produces a curve; the operator selects the point | Elliot (elicitation) |
| D-U3 | R13 at Ellel — the occurrence signal exists in the world and not in the dataset | `cragg_statistical_1971`, `mullahy_specification_1986` | `ELLEL_DIARY_LIVE = False`. The circular approximation (deriving occurrence from Ellel's own trading days) is **made impossible by construction** — the diary function takes no revenue parameter and a test asserts no such branch exists | Elliot (booking diary) |
| D-U4 | R47/R48 — an LLM judge is an instrumented, bias-audited proxy; the target is human adopt/dismiss | `zheng_judging_2023`, `bavaresco_llms_2025` | `eval/judge.py` never run, no key, **zero kappa**; N=0 operator labels | Key + Elliot |
| D-U5 | R49 — compliance and reliance are governed by different detector properties; measure **both** | `meyer_conceptual_2004`, `dixon_independence_2007` | Both constructs are defined over operator responses. With N=0 labels neither is measurable | Elliot |
| D-U6 | R36 — the Beer Hall under-coverage is several SEs wide and must be **explained**, not caveated | `barber_conformal_2023` | 0.871 vs 0.90 nominal, 3.6 SEs low, at every horizon step, identically on the served exo model. Declared; not explained. Explaining it means identifying the exchangeability violation | `FLAG-BAND-UNDERCOVERAGE-BH`. Analysis, not data — but it is genuine research, not a transcription |
| D-U7 | R58/R59/R60 — deliver all three legs of the contribution | `fu_prism_2026` + 8 system keys | Leg two (an agent that exists) resolves only at S8b | Key (Ryan) |
| D-U8 | R46 — clarification urgency varies by what is missing | `gulati_ask_2026` | Not implemented; a uniform urgency is used. Out of scope at five weeks | Scope |

---

## 6. The two contradictions the review left unresolved

Both are **writing defects as well as method questions**, exactly as the brief
anticipated. Both arise from the **R-Zero rule** adopted in critique synthesis 2
(*the chapter may state what the literature says and what the design assumes, and
nothing about what any later chapter will do*), so they are deliberate — but
R-Zero pushes the resolution downstream and **no downstream chapter currently
exists to receive it**.

### C11 · The ranking-reversal direction
- **The contradiction** The review establishes from `hewamalage_look_2021` and `brigato_there_2025` that rankings are unstable under small evaluation setups. It is careful — correctly, after critique iteration 1 — to state this as **directionless**. Our own result is directional: six folds ranked the served Beer Hall model second of nine (not fifth: `numbers_audit.md` MISMATCH 1 corrects report 43's own prose), and 273 origins restored it to first. The reversal **favoured the incumbent**.
- **Not adjudicated in-chapter** No cited work predicts a direction, so the review cannot license ours.
- **Where it must resolve** Discussion. The honest form: the literature predicts instability, not direction; our instance moved toward the served model, which is the direction that would be expected if the six-fold window were noise rather than evidence — and that is a claim about *our* sample, not a general one.
- **Risk if unwritten** The chapter advertises the divergence twice and nothing settles it. That is an unadjudicated contradiction sitting in the thesis.

### C12 · Adaptive conformal performed worse than a static band at the one real regime change
- **The contradiction** The review's conformal arc runs through `zaffran_adaptive_2022`, `gibbs_adaptive_2021` and `sun_conformal_2025` toward adaptivity. Our committed data refutes it at the one regime change we have: static 0.529, ACI 0.412–0.471 — **adaptive is worse than static**. S7 then found no method beats the incumbent Mondrian band at any venue, and the corrected (faithful BOA) AgACI is **worse** than the unfaithful version, which is itself the finding.
- **Not adjudicated in-chapter** R-Zero forbids the review from saying so.
- **Where it must resolve** Discussion, and it is a strong section: R18 is *already* the licensing requirement — Zaffran establishes that adapting to a shift that never arrives costs efficiency. Our estate has one shift in 362 days. The negative result is **predicted by the cited literature**, which is the best possible position to be in.
- **Recommendation** Write C12 first. It converts an apparent contradiction into a confirmed literature-led prediction.

---

## 7. Status of this ledger

Written before any run. §8 records the post-run status. No number in this file is
quoted into a chapter without the paired `brain/log/` result file the rules
require.

**Naming note for the rules.** `PRJ93_RULES.md` requires numbers to trace to
`brain/log/*result*.md`. **No file in `brain/log/` matches that glob** — the
convention in practice is `log/NN_<Gate>_<Name>.md` plus ~30 per-script artefacts
beside the code (`eval/*.md`, `models/ladder_results_L1_*.md`). The rule and the
repo disagree. Result files written after this gate use
`log/NN_<id>_result.md` so the glob resolves for the first time.

---

## 8. Post-run status — 2026-08-05

Six runs authorised at the gate and executed the same day. Total wall clock
**~2 minutes** of compute across all six; the cost was in the verification and
the instrumentation, not the runtime.

### Row status after the runs

| Row | Before | After | Evidence |
|---|---|---|---|
| **D-F1** — A–B upper bound applied where its condition fails | DIVERGES — SHOULD FIX | **CLOSED**, and larger than diagnosed: the bound is unavailable at **all three** venues, not just Ellel. Atom at score 0 in every case (tie fraction 0.160 / 0.590 / 0.183) | `log/61_R3_conformal_upper_bound_result.md` |
| **D-F2** — VUS-PR committed to, not computed | DIVERGES — SHOULD FIX | **CLOSED.** Computed for the first time, TSB-AD 1.5, 7 cells, 624 windows. W25 closed | `log/60_R1_vus_pr_result.md` |
| **D-F7** — WLS_v unbiasedness never tested | DIVERGES — SHOULD FIX | **CLOSED as a measurement, and the condition FAILS**: 22 of 41 nodes reject, 19 positive, VENUE itself +21.09 (p=0.047). Now a stated, evidenced limitation | `log/62_R6_wlsv_unbiasedness_result.md` |
| **D-F8** — recall-led headline | DIVERGES — SHOULD FIX | **UNBLOCKED.** VUS-PR now exists as the replacement headline; the remaining step is writing | `log/60` |
| **W37** — "covariates HELP" on a null | (category b/c) | **CLOSED.** At 39 folds on the ruled basis, delta −0.0002, 18/39 folds, paired CI contains zero, MCS retains both. False positive retracted | `log/64_R2_covariate_probe_result.md` |
| **D-D1** — MASE vs RMSSE headline | DIVERGES — DEFENSIBLE, undecided | **STILL THE HUMAN'S**, but now evidential. Winner changes at BOTH scaled venues; 90% MCS identical at both | `log/63_R4_metric_ordering_result.md` |
| **R5 / R27** — dispersion with every point estimate | CONFORMS | **CONFORMS more strongly.** The last file carrying a bare argmin (the covariate probe) now runs the MCS + paired bootstrap | `log/64` |
| **R16** — conformal upper bound needs distinct scores | DIVERGES — SHOULD FIX | **CONFORMS** | `log/61` |
| **R22** — MinT needs unbiased bases | DIVERGES — SHOULD FIX | **CONFORMS as a reported conditional** (the condition is measured and fails) | `log/62` |
| **R32 / R33** — reject point-adjusted F1, use VUS-PR | DIVERGES — SHOULD FIX | **CONFORMS** | `log/60` |

Unchanged and still open: **D-F3**, **D-F4**, **D-F5**, **D-F6** (all
transcription or prose, no run needed); **D-D2** to **D-D5** (human decisions);
every **DIVERGES — UNRESOLVED** row, all of which are blocked on a third party.

### Revised counts

| Verdict | Before | After |
|---|---|---|
| CONFORMS | 24 | **28** |
| DIVERGES — SHOULD FIX | 8 | **4** (all writing-only) |
| DIVERGES — DEFENSIBLE | 5 | 5 (unchanged — human's) |
| DIVERGES — UNRESOLVED | 8 | 8 (unchanged — blocked) |

### Three findings that were not in the plan

1. **The conformal upper bound fails everywhere, not just at Ellel.** Beer Hall
   carries a 15.2% atom at score 0 and Two River Taps 17.3%, because a
   structurally closed day makes forecast and actual both zero. The lower bound
   is unaffected, which is what the Beer Hall under-coverage argument needs.

2. **`eval/interval_calibration` is environment-sensitive and unstamped.** The
   first R3 attempt ran in `.venv-eval` (numpy 1.26) and restated coverages and
   Winkler scores that my purely additive edit could not have touched;
   `.venv-forecast` (numpy 2.5) reproduced the committed artefact exactly. The
   artefact carries no `provenance.py` stamp, so a future regeneration from the
   wrong venv would silently restate every figure in `tab:winkler`. **Stamp it.**

3. **The hard-coded `calendar_lag7` basis is in its third file.** G17o fixed
   `transfer/lovo.py`; R2 fixed `eval/chronos2_covariate_probe.py`;
   `eval/worldcup_fixture_probe.py` still carries it. Assume a fourth until
   someone greps.

### The empirical chain R6 completed

Each link verified at source this session, and the last one is new:

1. Absolute-error measures optimise the **median** — `hewamalage_forecast_2023`.
2. Median-eliciting point forecasts are *"usually not"* coherent, and MASE is
   *"just a scaled MAE"* — `kolassa_we_2023`.
3. MinT/WLS_v optimality requires **unbiased** bases —
   `wickramasuriya_optimal_2019`.
4. **Our DOW-median bases are biased on 22 of 41 nodes, including the venue
   total** — measured, `log/62`.

This is one of the few places where the project's own data supplies empirical
support for a theoretical objection its own literature review raises. It belongs
in the Discussion.

---

## 9. D-D1 resolved, and the minimal pair that resolved it — 2026-08-06

**D-D1 status: DECIDED — RMSSE adopted as headline**, argued from the estimand rather than
as a concession. Decision-log rows 77 (pre-registration), 78 (result), 79 (resolution).

### Why the row moved from "defensible divergence" to a decision

The pre-run framing of D-D1 was wrong in one respect and I said so before drafting: the
premise *"the brain serves a mean-like expectation"* is **false as built**. The serving
stack emits a median at every layer — `foundation.py:186` takes the 0.5 quantile,
`ladder.py` `rung1_robust_dow` is a DOW median, and `deviation.py:9` anchors the z-score on
a DOW median. The ladder is nonetheless **mixed**: ETS, Prophet, STL and both GBMs already
emit conditional means, so the mismatch is venue-specific, and Two River Taps (served by
`rung2_ets`) is already in the mean-served cell.

That re-points the argument rather than defeating it. Two defects were **mutually
concealing**: MASE elicits the median, the decision layer needs a mean, and a
median-eliciting ruler scoring a median-emitting estimator cannot see the gap.

### The measurement, on a controlled manipulation

`rung1_mean_dow` differs from `rung1_robust_dow` in the central-tendency aggregator and
nothing else — same features, folds, fit span and structure, one shared code path. The
median arm is **bit-identical** after the refactor. This is the only controlled
manipulation of the forecast functional available anywhere in the ladder; the ladder-wide
contrast is retained as a generalisation check and confounds the functional with family,
capacity, feature access and fit procedure.

| venue | median-arm bias | mean-arm bias | absolute metric | squared metric | crossing |
|---|---|---|---|---|---|
| beer_hall | +67.67 | **+24.65** | MASE 0.6578 / 0.6670 | RMSSE 0.6189 / **0.6132** | yes, n.s. |
| two_river_taps | −29.46 | −41.69 | MASE 0.7805 / 0.7862 | RMSSE 0.5574 / **0.5560** | yes, n.s. |
| ellel | +75.09 | −39.83 | MAE **105.98** / 166.64 | RMSE **236.89** / 306.51 | **no** |

**The headline is the concealment, not the crossing.** At Beer Hall the functional swap
removes roughly two-thirds of the bias while moving MASE by 0.009. A ruler nearly
indifferent between two forecasters whose bias differs threefold is the defect made
visible.

**The crossing is a direction, not an effect.** Observed at both scaled venues in the
predicted orientation; all four paired intervals contain zero. Report it at that strength.

**Two of five pre-registered predictions failed.** Two River Taps refutes the right-skew
mechanism outright — its median arm is biased *negative* and the mean arm is worse. Ellel
inverts the argument: at ~82% zero days the DOW mean is decisively worse on both metrics
(p 1.7e-25, 5.4e-11), because at extreme intermittency the mean is simply a bad forecaster
whatever the ruler. That is Chatfield's all-zero result in this estate's own data and it is
independent support for G2.

### Rows affected

| Row | Status |
|---|---|
| **D-D1** | **DECIDED.** RMSSE headline; MASE labelled secondary with the flatline and structural-zero caveats |
| **R21 / R23** | **CONFORMS.** The measure now elicits the functional the decision layer needs, and the tension is resolved rather than disclosed |
| **R22** | Strengthened — R6's bias result and R9's functional manipulation are the same finding at two levels of the hierarchy |
| **V1 / V2 / V3** | Unchanged — still writing fixes, still owed |

### Carried forward as declared limitations

1. **The served foundation model cannot emit a mean.** `chronos-forecasting` 2.3.1,
   `chronos/chronos2/pipeline.py`: the docstring at L786–787 documents *"mean (point)
   forecasts"* while L817–818 read `# NOTE: the median is returned as the mean here`. Framed
   as an **ecosystem observation** — a practitioner reading the signature would not know —
   not a defect claim against the maintainers. Quantile integration is the available remedy
   and was **declined on gate grounds**, recorded so the finding is not doing double duty as
   an excuse.
2. **Median-serving persists.** The remedy, its cost and the reason for deferral are all
   stated; the cost is now *measured* on a controlled pair rather than merely named.
3. **The right-skew mechanism is unexplained at Two River Taps.**

---

## 10. D-D2 resolved — 2026-08-06

**Decision: ACCEPT the divergence, and argue it from the estimand.** The recorded
recommendation at §4 stands, but source verification changed the *argument that carries it*,
and corrected three things in the row as written. No run; no code change; no chapter text
written this session.

### Verification, at source

NotebookLM against `chatfield_all-zero_2007` (notebook `d565d5f0`, source
`fe944ef5-4894-4143-8426-dac909838bad`), verbatim:

| Question | Verbatim from the paper |
|---|---|
| What cost? | `TotalCost = (ordering cost + holding cost + shortage cost)` over the horizon; `C1 = TotalCost / n`, `C2 = TotalCost / sum(X_t)` |
| Parameters | *"b Shortage cost per unit per unit time"*, *"h Holding cost per unit per unit time"*, *"Ordering cost, A"* |
| Where computed | *"We develop a simulation study of this inventory system"* — a stock-control simulation with a replenishment policy: *"The size of this replenishment order, Q, equals the demand forecast, y-hat_t+1, for the following period, plus any current backorders"* |
| Forecast target | Demand **in units**: *"a forecast for the demand in the following period must be made"*; *"non-zero demands ... normally distributed with mean of 100 units"* |
| Error vs cost | *"the lowest forecasting error does not necessarily lead to the lowest system cost"* |

### Three corrections to the row as written at §4

- **C1 — the parameter count was wrong.** The row said *"two parameters — unit shortage cost
  `b` and unit holding cost `h`"*. `TotalCost` has **three**: ordering cost `A`, holding cost
  `h`, shortage cost `b`. Ordering cost is not a rounding detail — it is what makes the
  policy trade order frequency against cover, and it is the one an operator is least likely
  to be able to state.
- **C2 — the evidence cross-reference was wrong, and would have been a checkable
  misattribution.** The row pointed at the §2.3 data-provision record and ask 6 (Elliot).
  The elicitation blocked there is **B6 — the surfacing cost ratio for `F_beta`**
  (`fu_prism_2026`, `trinh_hil-bench_2026`), a decision-threshold asymmetry. That is a
  **different cost from Chatfield's `A`/`h`/`b`**, which are inventory cost rates. Nothing in
  §2.3 records an inventory-cost elicitation, because none was ever specified. Citing §2.3
  here would have imported the externally-imposed-scope argument into a place it does not
  reach. Same class as V1/V2/V3 — an inference *from* a source, not a claim *about* one.
- **C3 — the primary argument is the estimand, not the missing parameters.** This is the
  substantive change and it makes the row much stronger.

### The argument that carries the decision

Chatfield & Hayya's cost is not a generic cost-weighted loss that any forecast could be
scored under. It is the cost of an **inventory system in which the forecast IS the
replenishment quantity** — over-order incurs `h` on the carried units, under-order incurs `b`
on the backorder, each order incurs `A`. The mechanism that converts forecast error into
system cost is the stock position.

Ellel's estimand has no stock position. The target is **`revenue_exvat` — daily revenue
ex-VAT, in pounds** (`store/warehouse.py:293`, `value = "revenue_exvat"`; L1 venue-daily is
documented as *"revenue ex-VAT (the spine)"*). Revenue is not held, not backordered and not
ordered. `A`, `h` and `b` are therefore not merely **unelicited** for this forecast — they
are **undefined**, because there is no unit whose carrying or shortage they price.

So the divergence is not a harder remedy declined. It is a remedy defined for a different
estimand. **That is a property of the problem**, which is the bar §4 sets.

### What Chatfield does license, and it is more than the row claimed

The transferable finding is the one at the level of the *instrument*, and the paper supports
it twice over:

1. *"the lowest forecasting error does not necessarily lead to the lowest system cost"* — the
   general warning that error is not automatically the right objective under lumpiness. This
   is what G2 already cites and it is correctly used.
2. **New, and directly on point.** Chatfield hit the zero problem *inside the error family*
   and had to work around it in both directions: MAPE had to be *"modified, because we cannot
   divide by a demand of zero"*, and GRMSE — *"touted by Syntetos and Boylan (2005: 308) as
   best for intermittent demand"* — was excluded because *"that multiplicative measure breaks
   down with forecast errors of zero"*. A paper whose own denominator-bearing measures
   degrade on zero-heavy demand is **direct support for dropping the denominator at an
   82%-zero venue**, which is exactly what `VENUE_SCALE_BASIS["ellel"] = "unscaled"` /
   `VENUE_LOSS["ellel"] = "mae"` does (`config.py:174-183`; `_score` in `models/ladder.py`
   returns unscaled MAE, or RMSE when squared, when `basis == "unscaled"`).

Limb 2 supports our actual choice more directly than the cost limb ever did, and it is not
currently used anywhere in either chapter. It should be, and it costs one sentence.

### The nuance that must not be smoothed over

A replenishment decision **does** exist in this system: A12 (`signals/stock_inventory.py`)
computes `days_of_cover = on_hand_pints / forecast_daily_pints` and flags a reorder when
cover falls below `lead_time + safety`. It does not rescue the cost objective, for three
reasons, all checkable:

- It runs at **Beer Hall only** — `A6_FORECAST_VENUE = "beer_hall"` (L40). Ellel has no stock
  panel, so the venue D-D2 is about has no replenishment decision at all.
- It consumes the **A6 reconciled product-node forecast in pints/day**
  (`A6_MODEL = "mint_dowmedian"`), not the venue-daily revenue series that D-D2 concerns.
- Its policy is **days-of-cover against a service level**, not a cost minimisation. No `A`,
  `h` or `b` appears anywhere in it.

Stating this is what keeps the argument honest: the claim is not "this project has no
inventory anywhere", it is "the forecast under discussion drives no replenishment decision,
and the one that does uses a different series, at a different venue, under a different rule".

### Where the unelicited-parameter argument survives

It moves to **Further Work**, correctly scoped and now concrete: a Chatfield-style cost
objective is definable for **A12 at Beer Hall** — a units/day forecast that already drives an
ordering decision — given elicited `A`, `h` and `b`. That names a real extension with a
named blocker, instead of a vague gesture at cost weighting.

### Post-decision status

| Item | Status |
|---|---|
| **D-D2** | **DECIDED — accept, argued from the estimand.** Not a run |
| R24 | **CONFORMS on the instrument limb.** The scaled-error drop at Ellel is what Chatfield licenses, now with a second verbatim support |
| Cost-objective limb | **Declared out of scope by estimand mismatch**, with the A12/Beer Hall extension named in Further Work |
| §4 D-D2 row | Superseded by this section on three points (C1 parameter count, C2 evidence pointer, C3 primary argument) |

### Owed to the writing, not written this session

1. One methodology paragraph: Chatfield's cost is an inventory-system cost whose parameters
   price a stock position this estimand does not have.
2. One sentence adding the modified-MAPE / GRMSE-breakdown support to the G2 justification.
3. Correct the §4 row's "two parameters" to three wherever it is carried forward.
4. Do **not** cite §2.3 or ask 6 in support of this row.

---

## 11. D-D3 resolved — 2026-08-06

**Decision: ACCEPT, and reclassify. The row's own premise was false, and correcting it moves
D-D3 from a defended divergence to substantial conformance.** No methodology change; one
verification module added (`eval/hurdle_saturation_check.py`), no experiment re-run.

### Verification, at source

NotebookLM against `cragg_statistical_1971` and `mullahy_specification_1986` (notebook
`d565d5f0`), verbatim:

| Source | First stage as specified |
|---|---|
| Cragg 1971 | *"All our models start from the probit analysis model where the probability that a particular event will occur at observation t, p(E_t), is given by ..."*; for the hurdle form, `f(y_t = 0 | X_1t, X_2t) = C(-X'_1t beta)` |
| Mullahy 1986 | *"The idea underlying the hurdle formulations is that a binomial probability model governs the binary outcome of whether a count variate has a zero or a positive realization"*; *"Parameterizing u_1t = exp(X_t beta_1), it is seen that the binomial probabilities (17) and (18) are identically those of a standard binomial logit model"* |
| Known/observed participation | **NOT SUPPORTED.** Neither author discusses a first stage that is a deterministic or known indicator rather than an estimated probability |
| What estimating it buys — Cragg | *"They differ from that model by allowing the determination of the size of the variable when it is not zero to depend on different parameters or variables from those determining the probability of its being zero"*; the motivation is friction — *"search, information, and transactions costs which inhibit the carrying out of desired plans"* |
| What estimating it buys — Mullahy | *"In standard count data models familiar to economists (e.g., the Poisson), these two processes are constrained to be identical"* |

### The correction that changes the row

The §4 row said `signals/occurrence.py::p_trade` *"returns exactly 0 or 1 by construction,
so `hurdle()` collapses to a calendar mask"*. **That is wrong.** `p_trade` returns
`E[occurrence | day-of-week]` — a groupby mean over the training labels
(`signals/occurrence.py:95-98`). It is a **saturated nonparametric estimator** of
`P(trade | DOW)`. It evaluates to 0 or 1 at Beer Hall because that venue's closure calendar
is deterministic, **not because the code forces it**; a venue trading on some Mondays and not
others returns a fraction, and the module is written to allow that.

**Verified numerically rather than asserted** (`log/67_DD3_hurdle_saturation_result.md`): for
a design matrix of DOW dummies, the saturated-logit MLE reproduces the groupby cell
frequencies to **max abs diff 7.61e-05** — BFGS tolerance, not a modelling difference. The
two are the same estimator.

And in the deterministic cells the fitted coefficients reach **|coef| = 11.46 and are still
diverging** at 2000 iterations: textbook complete separation, where the coefficient MLE does
not exist while the fitted probability converges to the cell frequency.

### The argument that carries the decision

Our first stage **is** Cragg's and Mullahy's first stage, with a single categorical covariate,
computed in its closed form. The closed form is not an avoidance of estimation — it is the
numerically stable route to identical fitted probabilities, and the probit/logit
*parameterisation*, not our design, is what fails on a deterministic calendar.

Both gains the sources name for a separate first stage are **structural**: Cragg's is that the
two decisions may depend on different variables and parameters; Mullahy's is that the binary
and positive processes need not be constrained identical. This design has that separation —
`hurdle_forecast` fits the amount model on trading days only, so it is *"not diluted by
structural-closure zeros"* (`signals/occurrence.py:107-109`). Neither gain requires the first
stage to be stochastic.

### The limitation that survives, and it is smaller than the row claimed

Our first stage conditions on **day-of-week alone**. Cragg's friction motivation — that
participation is uncertain *given desire* — has no purchase at a contractually closed venue,
but it would have purchase at an event-led one, which is exactly Ellel. That limitation is
already recorded and already blocked (D-U3, `ELLEL_DIARY_LIVE = False`), and the module
forecloses the circular fix by construction: the occurrence label is *"exogenous by
construction and never read from a venue's own revenue"*, with no code path able to fill it
from Ellel's trading days (`signals/occurrence.py:15-21`).

### The null result, and why its status is unchanged

The row's honest cost stands verbatim: against a DOW-conditioned baseline the gate is a
function of a variable the baseline already carries, so the null is **expected geometry, not
a measurement about the estate**. Nothing here weakens that, and both chapters already say it.

### Post-decision status

| Item | Status |
|---|---|
| **D-D3** | **DECIDED — accept; reclassify from DEFENSIBLE toward CONFORMS on the estimation limb** |
| R13 | **CONFORMS on specification.** The binary part is fitted, saturated, with one covariate |
| §4 D-D3 row | Superseded — "returns exactly 0 or 1 by construction" is factually wrong about the code |
| Residual limitation | Covariate poverty of the first stage (DOW only), not absence of estimation. Ellel's richer covariate is D-U3, blocked |

### Owed to the writing, not written this session

1. Replace "the binary part is observed, not estimated" framing with the accurate one: a
   saturated first stage whose closed form coincides with the MLE, evidenced by
   `log/67_DD3_hurdle_saturation_result.md`.
2. Add the complete-separation point — it converts an apparent shortcut into a numerical
   necessity, and it is the sentence that answers the obvious viva question.
3. Keep the null-result caveat exactly as it stands.
4. State the surviving limitation as covariate poverty, cross-referenced to D-U3.
