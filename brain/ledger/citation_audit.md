# Citation audit

Every `\cite*` key in `chapters/literature_review.tex`, `chapters/methodology.tex`
and `chapters/results.tex`, checked against `ref.bib` and against the source
itself via NotebookLM (`d565d5f0-9ad6-446f-9573-2316a2f8c0ca`).

Started 2026-07-30. **Read-only audit — no chapter was modified.**

## Method

- Keys extracted from the three chapters. Lit review read once in full (it is
  the subject of the wider task); methodology and results extracted by subagent
  so no `.tex` body entered the auditing context whole.
- `ref.bib` inventoried in full: **111 entries, one file**. There is no
  `chapters/ref.bib` — the duplicate-key hazard recorded as W47 no longer
  exists in the project.
- Every key is checked three ways: exists in `ref.bib` with the right title and
  authors; the sentence it sits in is captured verbatim; NotebookLM is asked
  whether the source supports *that specific claim*, with exact figures.

## Surface

| Chapter | Occurrences | Unique keys |
|---|---|---|
| `literature_review.tex` | ~95 | 75 |
| `methodology.tex` | 22 | 20 |
| `results.tex` | 4 | 4 |
| **Union** | — | **84** |

Neither `methodology.tex` nor `results.tex` is a stub. Both are continuous
finished prose with populated tables — methodology ~573 lines with three
tables, results ~780 lines with twelve. This closes the open question in
`02_prj93_pipeline_spec.md` §6 and confirms W44 is stale.

`ref.bib` holds 111 entries against 84 keys in use, so **27 entries are
uncited**. Not a defect in itself; listed in the final batch for completeness.

## Verdict vocabulary

- **SUPPORTED** — the source says what the sentence says it says.
- **OVERSTATED** — directionally right, but the sentence claims more than the
  source establishes (scope, strength, or generality).
- **UNSUPPORTED** — the source does not establish the claim.
- **WRONG-SOURCE** — the claim is true of some paper, but not this one.
- **MISSING-KEY** — cited but absent from `ref.bib`.

One tag was added after the audit began, because the brief's five verdicts
could not express what kept happening:

- **UNVERIFIED** — the source is listed in the notebook, but NotebookLM could
  not retrieve its text and answered from outside the sources (it says so, with
  an external-knowledge disclaimer). The claim is *not* checked. Recording these
  as SUPPORTED would reproduce exactly the failure W34 flags: asserting a
  verification pass that did not happen.

---

## Batch 1 — literature review, §rw-framing and §rw-rhythm (keys 1–15)

| Key | Title (ref.bib) | Claim location | Claim as written | NotebookLM evidence | Verdict | Suggested fix |
|---|---|---|---|---|---|---|
| `gorry_framework_1971` | Gorry & Scott Morton 1971, *A framework for management information systems* | §rw-framing ¶1 | Structured vs unstructured decisions via Simon's intelligence/design/choice phases; DSS assist managers on unstructured cases rather than replace them | Confirmed verbatim. "A fully structured problem is one in which all three phases—intelligence, design, and choice—are structured"; systems for unstructured decisions classified as DSS; "the human decision maker must provide judgment and evaluation" | **SUPPORTED** | none |
| `kumar_agentic_2026` | Kumar et al. 2026, *Agentic artificial intelligence as a new frontier in information systems* | §rw-framing ¶1 | Agentic AI defined by delegated autonomy — initiate actions, make decisions, coordinate toward a goal with little prompting; agency distributed across people and machines | Confirmed verbatim: "characterized by delegated autonomy… distributing agency across humans and machines rather than locating it with users or managers" | **SUPPORTED** | none |
| `staufer_2025_2026` | Staufer et al. 2026, *The 2025 AI Agent Index* | §rw-framing ¶1 | Index of thirty widely used agentic products; no public information for 135 of 240 safety fields | Both figures exact: "we index 30 highly agentic and widely used products"; "most safety-related fields (135/240) have no public information available" | **SUPPORTED** | none |
| `chae_value_2024` | Chae et al. 2024, *The value of data, machine learning, and deep learning in restaurant demand forecasting* | §rw-rhythm ¶2 | Deep models on internal operational/calendar features alone match or outperform ML models given external macroeconomic and health data | Confirmed: "DL models either closely match or outperform traditional ML models… With the addition of MH features… DL models still moderately outperform or match ML models" | **SUPPORTED** | none |
| `hossain_comparative_2025` | Hossain et al. 2025, *A comparative study of various statistical and machine learning models for predicting restaurant demand* | §rw-rhythm ¶2 | MLP and random forest rank highest; exponential smoothing and Croston outperform a gradient-boosted baseline that fails to capture seasonality without hand-built features | Confirmed on all three limbs, including the attribution: "XGBOOST lacks inherent mechanisms to recognize long-term seasonal variations unless explicitly engineered" | **SUPPORTED** | none |
| `croston_forecasting_1972` | Croston 1972, *Forecasting and Stock Control for Intermittent Demands* | §rw-rhythm ¶2 (twice) | Models the gap between sales events rather than assuming continuous demand | Confirmed — but **from notebook conversation history, not a fresh read of the source text**; NotebookLM stated the PDF was not loaded into its context for this turn | **SUPPORTED** *(weak evidence)* | re-verify directly before the chapter is signed off; the claim is uncontroversial but the evidence is indirect |
| `syntetos_accuracy_2005` | Syntetos & Boylan 2005, *The accuracy of intermittent demand estimates* | §rw-rhythm ¶2 | "the bias correction" to Croston | Confirmed as the SBA bias-correction factor — again **from conversation history, not a fresh source read** | **SUPPORTED** *(weak evidence)* | as above |
| `schmidt_machine_2022` | Schmidt et al. 2022, *Machine Learning Based Restaurant Sales Forecasting* | §rw-rhythm ¶2 | Across 20+ models the best one-day-ahead is a linear kernel-ridge model at 19.6% sMAPE, recurrent and ensemble narrowly behind; gap widens against simple models only at one week | Figures exact: 23 models + 2 baselines; best one-day is kernel ridge at sMAPE 19.6%. At one week, "non-RNN models performed poorly… worse than 20% error", RNN best 19.5% | **OVERSTATED** (minor) | the paper says "kernel ridge", not *linear* kernel-ridge — drop "linear" unless the kernel is confirmed. Also "recurrent… narrowly behind" understates the one-week reversal the same paper reports |
| `das_decoder-only_2024` | Das et al. 2024, *A decoder-only foundation model for time-series forecasting* | §rw-rhythm ¶3 | Patched decoder predicting the next patch autoregressively; near-supervised zero-shot accuracy at 200M parameters | Exact: "pretraining a decoder style attention model with input patching"; "auto-regressive decoding"; "200M parameters… comes close to the accuracy of fully-supervised approaches" | **SUPPORTED** | none |
| `ansari_chronos_2024` | Ansari et al. 2024, *Chronos: Learning the Language of Time Series* | §rw-rhythm ¶3 | Scales and quantises real values into a fixed token vocabulary for an off-the-shelf LM architecture; comparable or superior zero-shot across 42 datasets | Exact: "tokenizes time series values using scaling and quantization into a fixed vocabulary"; "42 datasets"; "comparable and occasionally superior zero-shot performance" | **SUPPORTED** | none |
| `woo_unified_2024` | Woo et al. 2024, *Unified Training of Universal Time Series Forecasting Transformers* | §rw-rhythm ¶3 | "Masked-encoder" | Confirmed: "Masked EncOder-based UnIveRsAl TIme Series Forecasting Transformer (MOIRAI)" | **SUPPORTED** | see the note on `liu_moirai_2026` — this paper *is* Moirai 1.0 and the text never says so |
| `liu_moirai_2026` | Liu et al. 2026, *Moirai 2.0: When Less Is More for Time Series Forecasting* | §rw-rhythm ¶3 | "quantile variants such as Moirai" | Confirmed quantile-based: "replaces masked-encoder training, multi-patch inputs, and mixture-distribution outputs with a simpler decoder-only architecture, single patch, and quantile loss" | **SUPPORTED** *(presentation defect)* | the sentence attaches the name "Moirai" to the 2.0 paper while the preceding clause cites Moirai 1.0 unnamed as "masked-encoder". A reader cannot tell they are the same lineage. Name them "Moirai" and "Moirai 2.0" |
| `goswami_moment_2024` | Goswami et al. 2024, *MOMENT: a family of open time-series foundation models* | §rw-rhythm ¶3 | "the masked-reconstruction family" | Confirmed: "pre-trained using a masked time series prediction task"; reconstruction via a lightweight head | **SUPPORTED** | none |
| `rasul_lag-llama_2024` | Rasul et al. 2024, *Lag-Llama: Towards Foundation Models for Probabilistic Time Series Forecasting* | §rw-rhythm ¶3 | "probabilistic … entrants" | Confirmed: "a general-purpose foundation model for univariate probabilistic time series forecasting" | **SUPPORTED** | none |
| `garza_timegpt-1_2024` | Garza & Mergenthaler-Canseco 2024, *TimeGPT-1* | §rw-rhythm ¶3 | "industrial entrants" | Supported, but **not from the TimeGPT paper itself** — the characterisation as closed/commercial comes from Woo et al. describing it: "first presented a closed-source model… available to their beta users" | **SUPPORTED** | none needed for "industrial"; do not escalate this citation to any performance claim, as the notebook has no independent evaluation of it |

**Batch 1 counts** — SUPPORTED 14, OVERSTATED 1, UNSUPPORTED 0, WRONG-SOURCE 0, MISSING-KEY 0, UNVERIFIED 0.

---

## Batch 2 — literature review, §rw-rhythm continued (keys 16–30)

| Key | Title (ref.bib) | Claim location | Claim as written | NotebookLM evidence | Verdict | Suggested fix |
|---|---|---|---|---|---|---|
| `tan_are_2024` | Tan et al. 2024, *Are Language Models Actually Useful for Time Series Forecasting?* | §rw-rhythm ¶3 | Ablations on three LM-based forecasters: removing the LM or replacing it with a single attention layer leaves accuracy unchanged or better at a fraction of the compute; helps neither sequence modelling nor few-shot — "and indeed TimesFM itself beats language-model prompting by a wide margin" | Own claims confirmed verbatim: "removing the LLM component or replacing it with a basic attention layer does not degrade forecasting performance—in most cases, the results even improve"; "three orders of magnitude"; shuffling shows "LLMs do not have unique capabilities for representing sequential dependencies"; "do not even help forecasting in few-shot settings with 10%". **But NotebookLM is explicit: "Tan et al. (2024) does not report this" about the TimesFM clause. Tan evaluates OneFitsAll, Time-LLM and CALF — not TimesFM.** The finding is Das et al. 2024's: TimesFM "improves on llmtime's performance by more than 25%" | **WRONG-SOURCE** (final clause only) | The TimesFM clause carries no citation of its own and sits inside a Tan-attributed passage, so it reads as Tan's finding. Attach `\citep{das_decoder-only_2024}` to it, or delete it. A specific comparative claim with no source is the T1-class defect |
| `ansari_chronos-2_2025` | Ansari et al. 2025, *Chronos-2: From Univariate to Universal Forecasting* | §rw-rhythm ¶4 | Alternates time attention with a group attention layer aggregating across all series sharing a group identifier at each patch index; authors single out short histories and cold starts; covariates admissible as group members | All three confirmed verbatim, including "could be especially helpful when all or some (cold start scenario) time series have short histories" and "a set of target(s), past-only covariates and known covariates" | **SUPPORTED** | none — this is the strongest-sourced passage in the chapter, and it is the served model |
| `hoo_tables_2026` | Hoo et al. 2026, *From Tables to Time: Extending TabPFN-v2 to Time Series Forecasting* | §rw-rhythm ¶4 | An 11M-parameter tabular foundation model applied to forecasting through temporal featurisation | Exact: "combining lightweight temporal featurization with the pretrained TabPFN-v2"; "Despite its compact size (11M parameters)" | **SUPPORTED** | none |
| `hollmann_accurate_2025` | Hollmann et al. 2025, *Accurate predictions on small data with a tabular foundation model* | §rw-rhythm ¶4 | Design explicitly aimed at datasets of up to ten thousand rows | Confirmed: dominant performance on datasets "up to 10,000 samples and 500 features" — though drawn from conversation history rather than a fresh source read | **SUPPORTED** | none |
| `das_-context_2025` | Das et al. 2025, *In-Context Fine-Tuning for Time-Series Foundation Models* | §rw-rhythm ¶5 | Prompting with several related series so the model adapts at inference; up to 25% improvement; rivals a model explicitly fine-tuned on the target; no gradient updates | All four confirmed: "prompted (at inference time) with multiple time-series examples"; "at least 25% over other baselines"; "even slightly improves upon… specifically fine-tuned"; "without doing any gradient updates" | **SUPPORTED** | W22's author error is fixed — the key is now `das_` and the notebook confirms Das, Faw, Sen, Zhou. Note the notebook's copy is dated November 2024 while `ref.bib` says 2025; correct if the `inproceedings` venue year is not in fact 2025 |
| `zhou_context-driven_2025` | Zhou et al. 2025, *Context-driven cold-start Web traffic forecasting* | §rw-rhythm ¶5 | Retrieves traffic of semantically similar pages to forecast a new page with no series of its own | Confirmed: forecasts "when no historical data is available for the target new web page" using "historical traffic of semantically relevant pages, without relying on the target page's own history" | **SUPPORTED** | none |
| `liu_generative_2024` | Liu et al. 2024, *Generative Pretrained Hierarchical Transformer for Time Series Forecasting* | §rw-rhythm ¶5 | Pretrains on a mixed channel-independent corpus, cutting error by roughly 5.75% over training from scratch | Exact: "constructing a mixed dataset under the channel-independent assumption"; "pretraining results in an average MAE reduction of 5.75%" | **SUPPORTED** | none |
| `wickramasuriya_optimal_2019` | Wickramasuriya et al. 2019, *Optimal Forecast Reconciliation… Through Trace Minimization* | §rw-rhythm ¶5 | MinT adjusts independent forecasts so venue-level predictions sum coherently to the estate total "with guaranteed minimum error variance" | **NotebookLM could not retrieve the source text** and answered under an external-knowledge disclaimer. Source is in the notebook (source 92) but its text was not available | **UNVERIFIED** | Re-query or read the PDF directly. Separately, MinT's optimality is minimum variance *among unbiased* reconciled forecasts — the unconditional "guaranteed" should carry that condition |
| `cini_graph-based_2024` | Cini et al. 2024, *Graph-based time series clustering for end-to-end hierarchical forecasting* | §rw-rhythm ¶5 | HiGP folds coherence into an end-to-end model by projecting predictions onto the space of coherent forecasts | **NotebookLM explicitly declined**: the retrievable text establishes only "an exact forecast reconciliation step [that] requires a matrix inversion"; "the text does not strictly establish the specific projection phrasing you described". Answered from outside the sources | **UNVERIFIED** | Re-query or read directly before this sentence is relied on |
| `kolassa_we_2023` | Kolassa 2023, *Do we want coherent hierarchical forecasts, or minimal MAPEs or MAEs? (We won't get both!)* | §rw-rhythm ¶5 | "states the cost in his title: coherence and minimal error cannot both be optimised, so the choice between them is a decision the analyst makes" | **Contradicted as written.** NotebookLM: "it does not claim that coherence and minimal error *in general* are incompatible… only applies to specific error metrics like MAPE and MAE." The paper says the opposite of the generalisation: "The **only** error measures whose minimizing point forecasts are coherent are the squared error and monotonic functions of weighted sums of squared errors… the expectation is additive." It also names MASE as "just scaled MAEs" and therefore incoherent | **OVERSTATED** | Restrict the claim to absolute-error measures. **This matters beyond accuracy**: the paper establishes that squared-error measures *are* coherence-compatible while MASE is not — which is direct support for the RMSSE decision at G1, currently invisible because the sentence generalises it away |
| `athanasopoulos_forecast_2024` | Athanasopoulos et al. 2024, *Forecast reconciliation: A review* | §rw-rhythm ¶5 | "The review… maps the resulting design space" | Confirmed as "a comprehensive review of forecast reconciliation and an entry point for researchers and practitioners"; the phrase "design space" is the chapter's, not the paper's | **SUPPORTED** | none — acceptable paraphrase of a review's scope |
| `angelopoulos_conformal_2023` | Angelopoulos & Bates 2023, *Conformal Prediction: A Gentle Introduction* | §rw-rhythm ¶6 | Coverage bounded below by the nominal level and above by that level plus a term of order 1/(calibration-set size) | Exact, in both directions: "$1-\alpha \le P(Y_{test} \in C(X_{test})) \le 1-\alpha + \frac{1}{n+1}$", and confirmed as split conformal specifically — which is the variant this work uses | **SUPPORTED** | **none — and this closes W48 for this occurrence.** The key currently resolves to the Gentle Introduction, and the Gentle Introduction is the correct source for this two-sided claim. The silent repoint did not leave a wrong claim behind here. `angelopoulos_conformal_2023-1` remains a distinct key for Conformal PID Control |
| `gibbs_adaptive_2021` | Gibbs & Candès 2021, *Adaptive Conformal Inference Under Distribution Shift* | §rw-rhythm ¶6 | Adjusts the nominal level in response to realised coverage | Confirmed with the update rule: "decreasing (resp. increasing) our estimate of $\alpha^*_t$ if the prediction sets were historically under-covering (resp. over-covering)"; $\alpha_{t+1} := \alpha_t + \gamma(\alpha - err_t)$ | **SUPPORTED** | none |
| `xu_conformal_2021` | Xu & Xie 2021, *Conformal prediction interval for dynamic time-series* | §rw-rhythm ¶6 | EnbPI discards exchangeability, guarantees approximately valid marginal coverage under mixing conditions on the error process, calibrates by updating past residuals in a sliding window without refitting | All three confirmed verbatim, including "does not require data exchangeability", "approximately valid marginal coverage… with strongly mixing stochastic errors", and "updating past residuals using a sliding window of size T" | **SUPPORTED** | none — unusually precise paraphrase |
| `xu_sequential_2023` | Xu & Xie 2023, *Sequential Predictive Conformal Inference for Time Series* | §rw-rhythm ¶6 | "its successor makes the residual model explicit" | Confirmed: framed as an improvement over EnbPI; "SPCI replaces the empirical quantile with an estimate by a conditional quantile estimator"; QRF trained auto-regressively on residuals | **SUPPORTED** | none |

**Batch 2 counts** — SUPPORTED 11, OVERSTATED 1, UNSUPPORTED 0, WRONG-SOURCE 1, MISSING-KEY 0, UNVERIFIED 2.

---

## Batch 3 — literature review, §rw-rhythm close and §rw-deviation (keys 31–45)

| Key | Title (ref.bib) | Claim location | Claim as written | NotebookLM evidence | Verdict | Suggested fix |
|---|---|---|---|---|---|---|
| `angelopoulos_conformal_2023-1` | Angelopoulos et al. 2023, *Conformal PID Control for Time Series Prediction* | §rw-rhythm ¶6 | "recasts the adjustment as feedback control" | Exact: "treats the system for producing prediction sets as a proportional-integral-derivative (PID) controller… we apply corrections to $q_t$ based on the error of the output" | **SUPPORTED** | none — and this confirms the two `angelopoulos_*` keys are correctly separated |
| `stocker_gentle_2025` | Stocker et al. 2025, *A Gentle Introduction to Conformal Time Series Forecasting* | §rw-rhythm ¶6 | "The practical guidance is collected by…" | Confirmed: contribution (i) is "a practical and narrative synthesis of these baseline algorithms and their modern variants", plus a controlled empirical comparison of validity–efficiency–compute trade-offs | **SUPPORTED** | none |
| `zaffran_adaptive_2022` | Zaffran et al. 2022, *Adaptive Conformal Predictions for Time Series* | §rw-rhythm ¶6 | On exchangeable scores the adaptive update degrades efficiency in proportion to its step size, so adapting to a shift that never arrives is worse than not adapting | Exact: "ACI on exchangeable scores degrades the efficiency **linearly** with $\gamma$ compared to CP… such adaptive algorithms may actually hinder the performance if the data does not have any temporal dependency, and a small $\gamma$ is preferable" | **SUPPORTED** | none — "in proportion to" is a fair rendering of "linearly with $\gamma$" |
| `hewamalage_forecast_2023` | Hewamalage et al. 2023, *Forecast evaluation for data scientists: common pitfalls and best practices* | §rw-rhythm ¶7 | Absolute-error measures optimise for the median, making a constant zero look best on intermittent series; and a naive benchmark scoring exact zeros on zero actuals deflates the scaling denominator | Both exact: "measures with absolute value base errors such as MAE and Mean Absolute Scaled Error (MASE) optimize for the median"; "On intermittent series, measures that optimize for the median are problematic since they consider constant zeros as the best prediction"; "it can be problematic when benchmark errors have prefect predictions (zero errors), for example with the naïve method giving exact zeros on zero actual values" | **SUPPORTED** | none. **This is the strongest single citation in the project for the G1/G2 case** — it names MASE explicitly and states both failure modes the examiner raised as Fatal 2 and Fatal 3 |
| `makridakis_m5_2022` | Makridakis et al. 2022, *The M5 competition: Background, organization, and implementation* | §rw-rhythm ¶7 | "The M5 competition answered this by scoring on squared scaled errors, which optimise for the mean, across a retail corpus in which most series were intermittent" | Split. Intermittency **confirmed with a figure the chapter does not use**: "77.3% of the series display an ADI higher than 4/3". But NotebookLM is explicit that the M5 text "does *not* establish the exact metric name (RMSSE) or that it optimizes for the mean" — the RMSSE name and the optimises-for-the-mean property both come from Hewamalage et al. | **OVERSTATED** | Two limbs of a three-limb sentence rest on a different paper. Cite `hewamalage_forecast_2023` for "optimise for the mean", and quote M5's own 77.3% for the intermittency limb. Separately: **M5 categorises using 4/3 and 0.5** — the Kostenko-corrected constants, not SBC's 1.32/0.49. That is independent support for the W23 correction and is currently uncited in that argument |
| `koutsandreas_selection_2022` | Koutsandreas et al. 2022, *On the selection of forecasting accuracy measures* | §rw-rhythm ¶7 | The measure encodes an implicit choice of which functional of the predictive distribution is wanted | Concept confirmed, terminology not the paper's: "each measure is optimized in a different fashion, thus showing a preference for forecasting methods with different properties"; "the median minimizes the sum of the absolute errors… the mean minimizes the sum of the squares" | **SUPPORTED** | none — fair paraphrase |
| `kolassa_why_2020` | Kolassa 2020, *Why the "best" point forecast depends on the error or accuracy measure* | §rw-rhythm ¶7 | Same claim | Exact: "different PFEMs $e$ will be minimized in expectation by different ways of summarizing the predictive density"; names "the mean, the median and the (−1)-median" | **SUPPORTED** | none |
| `adams_bayesian_2007` | Adams & MacKay 2007, *Bayesian Online Changepoint Detection* | §rw-deviation ¶1 | Maintains a posterior over the run length since the last change | Exact: "estimating the posterior distribution over the current 'run length,' or time since the last changepoint, given the data so far observed" | **SUPPORTED** | none |
| `truong_selective_2020` | Truong et al. 2020, *Selective review of offline change point detection methods* | §rw-deviation ¶1 | Reduces the whole family to a choice of cost function, search method and penalty | Confirmed with one wording difference: the three elements are "a cost function, a search method and **a constraint on the number of changes**", which becomes "a complexity penalty" when the number of changes is unknown. The online-vs-offline distinction the methodology chapter leans on is also confirmed verbatim | **SUPPORTED** | none — "penalty" is the paper's own term for the unknown-count case, which is this project's case |
| `truong_ruptures_2018` | Truong et al. 2018, *ruptures: change point detection in Python* | §rw-deviation ¶1 | "its accompanying library" | Confirmed by the 2020 survey: "This article is linked with a Python scientific library called ruptures" | **SUPPORTED** | none |
| `page_continuous_1954` | Page 1954, *Continuous Inspection Schemes* | §rw-deviation ¶1, again §rw-evaluation ¶2 | Accumulates per-observation scores, signals when the total rises a fixed amount above its own running minimum; ARL defined as expected observations before action, measuring both false-alarm expense under stability and delay before a real change is acted on | Both exact: "Take action if $S_n - \min_{0 \le i < n} S_i \ge h$"; ARL is "the expected number of articles sampled before action is taken", and "When the quality of the output is satisfactory the A.R.L. is a measure of the expense incurred by the scheme when it gives false alarms… for constant poor quality the A.R.L. measures the delay" | **SUPPORTED** | none. The chapter's rhetorical move — that Page reached the two-sided cost structure seventy years before the proactive-agent literature — is exactly supported by the Type I / Type II sentence |
| `siffer_anomaly_2017` | Siffer et al. 2017, *Anomaly Detection in Streams with Extreme Value Theory* | §rw-deviation ¶1 | Fits a generalised Pareto tail via EVT, requiring only a risk level and assuming nothing about the distribution | Exact: "does not require to hand-set thresholds and makes no assumption on the distribution: the main parameter is only the risk, controlling the number of false positives" | **SUPPORTED** | none |
| `kim_towards_2022` | Kim et al. 2022, *Towards a Rigorous Evaluation of Time-Series Anomaly Detection* | §rw-deviation ¶2 | Point-adjustment is so generous that randomly generated anomaly scores reach adjusted F1 near one and overturn most state-of-the-art results | Exact: "we can always obtain the $F1_{PA}$ close to 1 by changing $\delta'$"; "random anomaly scores can overturn most state-of-the-art TAD methods" | **SUPPORTED** | none |
| `liu_elephant_2024` | Liu & Paparrizos 2024, *The Elephant in the Room: Towards A Reliable Time-Series Anomaly Detection Benchmark* | §rw-deviation ¶2 | TSB-AD, 1070 series; VUS-PR stays stable under small detection lags while unbiased against random scores; simpler statistical detectors often beat neural ones | All three exact: "1070 high-quality time series from a diverse collection of 40 datasets"; "VUS-PR emerges as the most robust (less sensitive to lags), accurate (unbiased and effective across different scenarios), and fair"; "simpler architectures and statistical methods often yield better performance". Bonus figure the chapter could use: under PA-F1 a random score ranks **26 of 32** detectors | **SUPPORTED** | none — optionally add the 26/32 figure, which is more damning than the prose |
| `bhattacharya_towards_2024` | Bhattacharya et al. 2024, *Towards Unbiased Evaluation of Time-series Anomaly Detector* | §rw-deviation ¶2 | Proposes a balanced adjustment penalising false positives the standard protocol ignores | Exact: "'Balanced Point Adjustment' (BA)… penalizes false positives and balances the adjustments made for true positives"; "$F1_{BA}$ is the only metric that penalizes false positive detection" | **SUPPORTED** | none |

**Batch 3 counts** — SUPPORTED 14, OVERSTATED 1, UNSUPPORTED 0, WRONG-SOURCE 0, MISSING-KEY 0, UNVERIFIED 0.

---

## Batch 4 — literature review, §rw-deviation close and §rw-surfacing (keys 46–60)

| Key | Title (ref.bib) | Claim location | Claim as written | NotebookLM evidence | Verdict | Suggested fix |
|---|---|---|---|---|---|---|
| `gim_evaluation_2023` | Gim & Min 2023, *Evaluation Strategy of Time-series Anomaly Detection with Decay Function* | §rw-deviation ¶2 | "a decay-weighted variant" | Confirmed: "PAdf… attenuates TP when the anomaly segments are discovered late" | **SUPPORTED** | none |
| `sun_conformal_2025` | Sun & Yu 2025, *Conformal Prediction for Time-series Forecasting with Change Points* | §rw-deviation ¶3 | Switching dynamical model + per-state calibration; exact finite-sample coverage only under exchangeability; time-averaged asymptotic validity resting on a stationary state distribution; faster post-shift convergence than ACI, shortening rather than removing miscoverage; coverage degrades in proportion to state misclassification | **Every limb confirmed with its theorem number.** Per-state: "we can factor the state transition probability from the conformal prediction process and do calibration for each of the K dynamics separately." Exchangeability: **Prop 4.1**. Asymptotic: **Thm 4.2** resting explicitly on **Assumption 1 (Stationary Distribution of States)**. Faster convergence: **Thm 4.4**, "accelerated adaptation allows for shorter miscoverage periods". Misclassification: **Thm 4.3**, bound $\le \epsilon \cdot \max_z \delta_{z,T}$ where $\epsilon = P(\hat z_t \ne z_t)$ | **SUPPORTED** | **none — W20 is genuinely closed.** The restated version is not merely defensible, it is precise to the theorem numbering. This is the passage an examiner was said to be able to check in ninety seconds, and it now checks out |
| `barber_conformal_2023` | Barber et al. 2023, *Conformal prediction beyond exchangeability* | §rw-deviation ¶3 | Bounds coverage loss under arbitrary departures from exchangeability by a weighted sum of total-variation distances between residual vectors, with no assumption on the joint distribution | Exact, including the bound: coverage gap $\le \frac{\sum_i w_i \cdot d_{TV}(R(Z), R(Z_i))}{1 + \sum_i w_i}$, and "we do not make any assumption on the joint distribution of the $n+1$ points" | **SUPPORTED** | none |
| `yao_react_2022` | Yao et al. 2022, *ReAct* | §rw-surfacing ¶1 | Interleaves reasoning traces with tool calls | Exact: "generate both reasoning traces and task-specific actions in an interleaved manner" | **SUPPORTED** | none |
| `schick_toolformer_2023` | Schick et al. 2023, *Toolformer* | §rw-surfacing ¶1 | Teaches a model to invoke APIs through self-supervision | Exact: "LMs can teach themselves to use external tools via simple APIs… in a self-supervised way" | **SUPPORTED** | none |
| `shinn_reflexion_2023` | Shinn et al. 2023, *Reflexion* | §rw-surfacing ¶1 | Adds verbal self-correction across attempts | Exact: "verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer… in subsequent trials" | **SUPPORTED** | none |
| `yao_-bench_2024` | Yao et al. 2024, *τ-bench* | §rw-surfacing ¶1 | Multi-turn tool-and-user interaction; "frontier models succeed on under half of tasks, with eight-trial consistency falling below 25%" | Split. The setting is confirmed. But NotebookLM is explicit that the text "does **not** explicitly state that models succeed on 'under half of tasks' overall, nor does it explicitly report the 'eight-trial consistency (pass^8) below 25%' figure." What it establishes: "even gpt-4o solves only **35.2%** of the tasks" on τ-airline. A pass^k figure appears only as a chart (Figure 4), with no 25% threshold quoted | **OVERSTATED** | Two numeric claims, neither traceable as written. Replace with the 35.2% τ-airline figure, which is stronger and quotable. **The "below 25%" figure must be read off Figure 4 and cited to it, or deleted** — an unsourced number in prose is the T1 failure mode |
| `lewis_retrieval-augmented_2020` | Lewis et al. 2020, *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* | §rw-surfacing ¶2 | Established grounding a generator in an external non-parametric store accessed by a learned retriever | Exact: "the non-parametric memory is a dense vector index of Wikipedia, accessed with a pre-trained neural retriever" | **SUPPORTED** | none |
| `hu_memory_2026` | Hu et al. 2026, *Memory in the Age of AI Agents* | §rw-surfacing ¶2 | Agent memory is categorically more than retrieval — a persistent, self-evolving cognitive state accumulating the agent's own experience, versus retrieval reading a static corpus per query | Exact on both sides: "maintaining a persistent and self-evolving cognitive state"; "Classical RAG techniques primarily augment an LLM with access to static knowledge sources… In contrast, agent memory systems are instantiated within an agent's ongoing interaction with an environment" | **SUPPORTED** | none |
| `park_generative_2023` | Park et al. 2023, *Generative Agents: Interactive Simulacra of Human Behavior* | §rw-surfacing ¶2 | Memory stream surfaced by a weighted combination of recency, relevance and importance, with periodic reflection abstracting raw records into higher-level inferences | **NotebookLM could not confirm from the notebook's copy**: "The provided text in the notebook does not establish the specific mechanism… nor does it explicitly mention 'reflection'." It then confirmed the claim from outside the sources, with a disclaimer | **UNVERIFIED** | The claim is very likely true of the paper — but it cannot be verified from the notebook, which suggests the Park source is partial. **This matters more than a routine gap:** W28 identifies Park's memory stream as the anchor of the chapter's self-declared "central conceptual move". Reload the full paper into the notebook and re-verify before that argument is defended |
| `zou_poisonedrag_2025` | Zou et al. 2025, *PoisonedRAG* | §rw-surfacing ¶2 | Retrieval stores are an attack surface | Confirmed, with agent-setting ASR of 0.72 / 0.58 / 0.52 on NQ / HotpotQA / MS-MARCO | **SUPPORTED** | none |
| `lu_proactive_2024` | Lu et al. 2024, *Proactive Agent* | §rw-surfacing ¶3 | ProactiveBench 6,790 train / 233 test from real human activity; strong proprietary models above 50% false alarm; best fine-tuned agent only 66.47% F1; reward model 91.80% agreement | **All four figures exact.** 6,790 / 233 confirmed. False alarm: Claude-3-Sonnet 62.69%, Claude-3.5-Sonnet 54.63%, GPT-4o-mini 64.73%, GPT-4o 51.85% — all above 50%. Best fine-tuned: Qwen2-7B-Proactive at 66.47%. Reward model 91.80% | **SUPPORTED** | none — the best-evidenced numeric passage in the chapter |
| `ding_proactor_2026` | Ding et al. 2026, *ProActor* | §rw-surfacing ¶3 | Reframes timing as a window of valid moments rather than a single labelled point; turn-level RL | Exact: existing work "treat[s] proactive timing as a single-answer problem, penalizing predictions that deviate from labels even when earlier timings represent valid proactive behavior"; "we generate reference action ranges and use turn-level optimization" | **SUPPORTED** | none |
| `tang_proagentbench_2026` | Tang et al. 2026, *ProAgentBench* | §rw-surfacing ¶3 | 28,000 events from 500+ hours of real sessions; low precision causes alert fatigue where excess false alarms drive users to ignore or disable the feature | Both exact: "over 28,000 events from 500+ hours of continuous working sessions"; "Low precision leads to alert fatigue, excessive false alarms causing users to ignore or disable assistance features" | **SUPPORTED** | none |
| `fu_prism_2026` | Fu et al. 2026, *PRISM: Festina Lente Proactivity* | §rw-surfacing ¶3 **and §rw-synthesis ¶2** | (a) Intervention as a cost-sensitive decision, speaking only when calibrated acceptance probability clears a threshold set by asymmetric costs; (b) 22.78% false-alarm reduction, 20.14% F1 gain; (c) **"among the proactive systems surveyed here it is the one that reports the calibration of its own acceptance probabilities rather than accuracy alone"** | (a) and (b) exact: "the agent intervenes only when a calibrated probability of user acceptance exceeds a threshold derived from asymmetric costs of missed help and false alarms"; "reduces false alarms by 22.78% and improves F1 by 20.14%". **(c) contradicted**: NotebookLM is explicit that the text "does **not** report the actual calibration metrics of its own probabilities (such as ECE or Brier score)". It reports only that $p_{accept}$ is "estimated… via a small calibrator trained on held-out judgments" | **OVERSTATED** (limb c) | PRISM *calibrates* a probability; it does not *report the calibration of* that probability. Those are different claims and the chapter asserts the stronger one. Rewrite to "the one that gates on a calibrated acceptance probability". **This sits in the synthesis paragraph W21 already flagged**, and it cuts toward the dissertation's own interest — an unreported calibration is a real gap PRISM leaves open, which is exactly the kind of opening the contribution claim needs. Correcting it strengthens the argument rather than weakening it |

**Batch 4 counts** — SUPPORTED 12, OVERSTATED 2, UNSUPPORTED 0, WRONG-SOURCE 0, MISSING-KEY 0, UNVERIFIED 1.

---

## Batch 5 — literature review, §rw-surfacing close and §rw-evaluation (keys 61–75)

| Key | Title (ref.bib) | Claim location | Claim as written | NotebookLM evidence | Verdict | Suggested fix |
|---|---|---|---|---|---|---|
| `gulati_ask_2026` | Gulati et al. 2026, *Ask Early, Ask Late, Ask Right* | §rw-surfacing ¶3 | Goal clarification must come early; input clarification is recoverable much later, so a blanket ask-early rule is wrong | The notebook's copy holds intro, references and figure captions only. The claim is **visually** supported by the "MCP-Atlas — VOI by Dimension" chart (Pass@3 against injection timing, Goal dropping steeply after 10%, Input degrading gently); the prose statement was supplied from outside the sources | **UNVERIFIED** | Reload the full paper. The chart backs the claim, so this is a source-completeness problem, not a correctness one |
| `liu_proactiveeval_2025` | Liu et al. 2025, *ProactiveEval* | §rw-surfacing ¶3 | "Adjacent systems for dialogue" | Exact: "a unified framework designed for evaluating proactive dialogue capabilities of LLMs" | **SUPPORTED** | none |
| `yang_contextagent_2025` | Yang et al. 2025, *ContextAgent* | §rw-surfacing ¶3 | "wearables" | Exact: "leveraging rich context from hands-free wearable sensors" | **SUPPORTED** | none |
| `yang_fingertip_2025` | Yang et al. 2025, *FingerTip 20K* | §rw-surfacing ¶3 | "mobile interfaces" | Exact from title and gap statement | **SUPPORTED** | none |
| `zheng_judging_2023` | Zheng et al. 2023, *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena* | §rw-evaluation ¶1 | Agreement above 80%, "reaching 85% without ties against 81% human-human agreement" | The notebook holds abstract and references only. It confirms "achieving **over 80%** agreement, the same level of agreement between humans". **The 85% and 81% figures are not in the retrievable text** and were supplied from outside | **UNVERIFIED** (85/81 limb) | Two specific figures in the prose that the verification pipeline cannot reach. Reload the full paper, or fall back to the abstract's "over 80%, the same level as between humans", which is quotable today |
| `wang_large_2024` | Wang et al. 2024, *Large Language Models are not Fair Evaluators* | §rw-evaluation ¶1 | Positional bias severe enough that swapping candidate order can reverse the verdict | Confirmed with a figure the chapter omits: "Vicuna-13B could beat ChatGPT on **66 over 80** tested queries" purely by reordering | **SUPPORTED** | The notebook dates this 2023 and `ref.bib` says 2024 — check the venue year. Consider adding the 66/80 figure |
| `panickssery_llm_2024` | Panickssery et al. 2024, *LLM Evaluators Recognize and Favor Their Own Generations* | §rw-evaluation ¶1 | Judges recognise and favour their own generations, with self-preference scaling with self-recognition | Exact: "a linear correlation between self-recognition capability and the strength of self-preference bias" | **SUPPORTED** | none |
| `bavaresco_llms_2025` | Bavaresco et al. 2025, *LLMs instead of Human Judges?* | §rw-evaluation ¶1 **and** methodology §sec:agent | "agreement with humans varying widely across tasks and **a standing bias toward machine-generated text**", concluding judges must be validated against **task-specific** human annotation | Variance confirmed: "substantial variance across models and datasets". But the bias claim is not what the paper says — it reports that agreement "display[s] substantial variability depending on… whether the language is human or model-generated". That is *variability by provenance*, not a *directional preference for* machine text. The conclusion is "LLMs should be carefully validated against human judgments", without "task-specific" | **OVERSTATED** | A directional bias is asserted where the paper reports only that provenance changes agreement. **This appears twice** — the methodology chapter says the judge carries "a systematic preference for machine-generated text". Both need the same correction |
| `meyer_conceptual_2004` | Meyer 2004, *Conceptual Issues in the Study of Dynamic Hazard Warnings* | §rw-evaluation ¶2 | Compliance is the response to a warning, reliance the response to its absence; they decay differently, false alarms eroding compliance (cry-wolf) and misses eroding reliance | **The notebook's copy contains only the paper's own bibliography.** No definitional text is retrievable. Confirmed from outside the sources | **UNVERIFIED** | **Highest-priority reload.** This is the anchor of §rw-evaluation and of the project's entire cost-asymmetry framing — the compliance/reliance distinction is what licenses the asymmetric loss function. It is currently the least verifiable load-bearing citation in the chapter |
| `lee_trust_2004` | Lee & See 2004, *Trust in Automation: Designing for Appropriate Reliance* | §rw-evaluation ¶2 | Appropriate reliance / calibrated trust where trust matches capability, with overtrust producing misuse and distrust producing disuse | Partial. "Appropriateness is shown as the relationship between the true capabilities of the agent and the level of trust" is retrievable; **the misuse/disuse mapping is not** and came from outside | **UNVERIFIED** (misuse/disuse limb) | Reload; the first half is fine as written |
| `parasuraman_humans_1997` | Parasuraman & Riley 1997, *Humans and Automation: Use, Misuse, Disuse, Abuse* | §rw-evaluation ¶2 | Ties disuse — inappropriate rejection of a capable aid — directly to high false-alarm rates | **The paper appears in the notebook only as an entry in other papers' bibliographies.** Its own text is absent. Confirmed from outside | **UNVERIFIED** | Reload. Same cluster as Meyer |
| `parasuraman_complacency_2010` | Parasuraman & Manzey 2010, *Complacency and Bias in Human Use of Automation* | §rw-evaluation ¶2 | Documents automation bias and complacency | Confirmed: "complacency and automation bias… induced by overtrust in the proper function of an automated system" | **SUPPORTED** | none |
| `hancock_meta-analysis_2011` | Hancock et al. 2011, *A Meta-Analysis of Factors Affecting Trust in Human-Robot Interaction* | §rw-evaluation ¶2 | "shows that **system performance, not surface attributes**, is the largest driver of trust" | The retrievable text does not establish that contrast. It establishes that **robot-related factors as a whole** (performance-based *and* attribute-based together) dominate **human-related** factors: $d = +.67$ against $d = -.02$. The performance-vs-attribute breakdown within robot factors came from outside the sources | **OVERSTATED** | As written the sentence draws a performance-vs-attribute contrast the retrievable evidence does not support. Either restate as "robot-related factors outweigh human-related ones ($d = +.67$ vs $d = -.02$)", which is quotable now, or verify the within-factor breakdown before keeping the current phrasing |
| `trinh_hil-bench_2026` | Trinh et al. 2026, *HiL-Bench: Do Agents Know When to Ask for Help?* | §rw-evaluation ¶2 | Ask-F1, the harmonic mean of question precision and blocker recall, penalising both over-asking and silent wrong guessing; adapted from its coding domain | All exact, including the formula and the two-sided penalty: "an agent that achieves high recall by asking fifty questions per task will be penalized by near-zero precision"; "an agent that never asks produces confidently wrong outputs". Domain confirmed as coding (SWE-Agent, SQL) | **SUPPORTED** | none — the "adapted from its coding domain" hedge is correctly placed |
| `guo_calibration_2017` | Guo et al. 2017, *On calibration of modern neural networks* | §rw-evaluation ¶2 | Modern networks are overconfident; temperature scaling restores calibration measured by expected calibration error | The notebook's copy holds calibration result tables and references only — **neither "overconfident" nor "temperature scaling" is in the retrievable text.** Confirmed from outside | **UNVERIFIED** | Reload. **This is the citation W26 turns on**: the chapter ends its evaluation section on Guo and ECE as the loop-closing guarantee, and no ECE exists in the codebase. Whichever way G3 goes, this source needs to be verifiable |

**Batch 5 counts** — SUPPORTED 7, OVERSTATED 2, UNSUPPORTED 0, WRONG-SOURCE 0, MISSING-KEY 0, UNVERIFIED 6.

**Pattern.** Five of the six UNVERIFIED results in this batch fall in one place: the human-factors and calibration cluster of §rw-evaluation (`meyer_conceptual_2004`, `lee_trust_2004`, `parasuraman_humans_1997`, `hancock_meta-analysis_2011`, `guo_calibration_2017`). These are older, paywalled journal articles rather than arXiv preprints, and the notebook appears to hold reference-list fragments rather than full texts. **The section carrying the project's central conceptual argument — that the cost of a false alarm is asymmetric and that this is what the metric must encode — is the section whose sources are least checkable.** It is also the section that has not been rewritten in any remediation round. Treat the cluster as one reload job, not five.

---

## Batch 6 — keys introduced by `methodology.tex`, plus the `results.tex` claims (keys 76–84)

The methodology chapter introduces nine keys the literature review does not use.
`results.tex` introduces none — all four of its keys appear above, but it makes
different claims of them, audited in the final rows.

| Key | Title (ref.bib) | Claim location | Claim as written | NotebookLM evidence | Verdict | Suggested fix |
|---|---|---|---|---|---|---|
| `hyndman_another_2006` | Hyndman & Koehler 2006, *Another look at measures of forecast accuracy* | methodology §sec:ruler | MASE divides the forecast's MAE by the in-sample MAE of a seasonal-naive benchmark | **NotebookLM: "This source is NOT in this notebook."** The definition was confirmed only through Hewamalage et al.'s rendering of it: $q_t = e_t / (\frac{1}{T-1}\sum_{t=2}^T |y_t - y_{t-1}|)$, denominator strictly in-sample | **UNVERIFIED** | **Add to the notebook.** W54's core charge was that no citation governed the choice of MASE. A citation now exists — but its source is not loadable in the verification pipeline, so the charge is only half answered |
| `syntetos_categorization_2005` | Syntetos et al. 2005, *On the categorization of demand patterns* | methodology §sec:intermittency | Intermittency decided on ADI $p$ and squared CV of demand sizes $v$, following SBC | **NotebookLM: "This source is NOT in this notebook"** — it flags that the notebook's Syntetos 2005 entry is the *different* paper (accuracy of intermittent demand estimates). Cutoffs 1.32 / 0.49 confirmed only from conversation history | **UNVERIFIED** | Add to the notebook. Note the near-collision: `syntetos_accuracy_2005` and `syntetos_categorization_2005` are two different 2005 Syntetos papers and the notebook holds only the first |
| `kostenko_note_2006` | Kostenko & Hyndman 2006, *A note on the categorization of demand patterns* | methodology §sec:intermittency (×2), results Table~\ref{tab:intermittency} caption | Corrects the constants to $p=4/3$ and $v=0.5$; also gives a Croston-vs-SBA selection rule dividing the classification plane diagonally | Both exact: "giving p=4/3 (not 1.32 as given by SBC)"; "we find the maximum value of v=0.5 (not 0.49 as given by SBC)". Selection rule confirmed: "use SBA whenever $v > 2 - (3/2)p$" | **SUPPORTED** | none. The diagonal rule is stated in the chapter without its inequality — consider quoting $v > 2 - \tfrac{3}{2}p$, since the project applies it |
| `hansen_model_2011` | Hansen, Lunde & Nason 2011, *The Model Confidence Set* | methodology §sec:mcs (×2), results §sec:res-mcs | Returns the set of models the data cannot separate; a large retained set is a valid outcome reflecting the data, not a defect of the test | Exact, and quotable: "A MCS is a set of models that is constructed such that it will contain the best model with a given level of confidence… **The MCS acknowledges the limitations of the data, such that uninformative data yield a MCS with many models, whereas informative data yield a MCS with only a few models**" | **SUPPORTED** | none — but the chapter paraphrases where the paper's own sentence is better. Quote it. It is the direct answer to the "5 of 9 retained" result reading as a weak finding |
| `diebold_comparing_1995` | Diebold & Mariano 1995, *Comparing Predictive Accuracy* | methodology §sec:selection | The DM test of equal predictive accuracy is oversized in small samples | **The DM paper itself is NOT in the notebook.** The oversizing claim is confirmed from Harvey et al., which is in fact its proper source: "the test was found to be quite seriously over-sized for moderate numbers of sample observations" | **SUPPORTED** | none — the sentence cites DM for the test and Harvey for the correction, which is correct attribution. Still worth adding DM to the notebook, since it was added to Zotero on 2026-07-27 to close part of W54 and the notebook was not updated to match |
| `harvey_testing_1997` | Harvey, Leybourne & Newbold 1997, *Testing the equality of prediction mean squared errors* | methodology §sec:selection | The correction multiplies the DM statistic by a factor | Exact: $S_1^* = \left[\frac{n + 1 - 2h + n^{-1}h(h-1)}{n}\right]^{1/2} S_1$ | **SUPPORTED** | none. **This independently confirms W6 by arithmetic**: at $n=6$, $h=7$ the numerator is $6 + 1 - 14 + \tfrac{1}{6}(7)(6) = 0$, so the factor is exactly zero and no DM variant is computable. The methodology chapter states this openly, and the formula now verifies it |
| `cragg_statistical_1971` | Cragg 1971, *Some Statistical Models for Limited Dependent Variables* | methodology §sec:occurrence | Two-part/hurdle: a binary model governs whether the outcome is positive, a second governs the amount | Exact: "the first equation applies when the dependent variable assumes a zero value and the second when a non-zero value occurs"; probit for purchase plus regression on log positive amounts | **SUPPORTED** | none |
| `mullahy_specification_1986` | Mullahy 1986, *Specification and testing of some modified count data models* | methodology §sec:occurrence | Same | Exact: "unrestricted hurdle models… separate ML estimation of a binary logit model estimated over the entire sample and a truncated-geometric model estimated on the sample having positive realizations" | **SUPPORTED** | none |
| `chatfield_all-zero_2007` | Chatfield & Hayya 2007, *All-zero forecasts for lumpy demand: a factorial study* | methodology §sec:no-basis, results §sec:res-basis | Where error is not a usable instrument, cost is the alternative; on sufficiently lumpy demand the lowest forecast error does not deliver the lowest system cost | Both exact: "the lowest forecasting error does not necessarily lead to the lowest system cost"; "all-zero forecasts yield the lowest cost when lumpiness is high; it is also best for mid-lumpiness, if the shortage cost is much higher than the holding cost" | **SUPPORTED** | none. **This is the load-bearing source for G2.** The all-zero finding is the sharper half and neither chapter uses it — on an 82%-zero series it is the direct statement of why a scaled error is the wrong instrument at Ellel |

### `results.tex` — the four claims, audited against their own sentences

| Key | Claim as written in results | Verdict | Note |
|---|---|---|---|
| `hansen_model_2011` | "that width is a statement about the data rather than a defect of the procedure, and the defensible claim is correspondingly modest" | **SUPPORTED** | Matches "uninformative data yield a MCS with many models" precisely |
| `chatfield_all-zero_2007` | "on sufficiently lumpy demand the lowest forecast error does not deliver the lowest system cost, and error is therefore the wrong objective to optimise" | **SUPPORTED** | First clause verbatim. "Error is therefore the wrong objective" is the chapter's inference from it, correctly signalled as such by "therefore" |
| `kostenko_note_2006` | Constants in the Table~\ref{tab:intermittency} caption: SBC $p \ge 1.32$, $v \ge 0.49$; corrected $p \ge 4/3$, $v \ge 0.5$ | **SUPPORTED** | Exact |
| `angelopoulos_conformal_2023` | "split conformal cannot under-cover under exchangeability, so exchangeability is violated in these residuals" | **SUPPORTED** | Follows from the verified lower bound $P \ge 1-\alpha$, and the source is confirmed as split-conformal-specific. The inference is valid |

**Batch 6 counts** — SUPPORTED 7, OVERSTATED 0, UNSUPPORTED 0, WRONG-SOURCE 0, MISSING-KEY 0, UNVERIFIED 2.

---

## Uncited `ref.bib` entries

111 entries, 84 keys in use, **27 uncited**. Not defects in themselves, but two
things in the list matter.

`kolassa_evaluating_2016`, `kolassa_all_2023`, `aksu_gift-eval_2024`,
`meyer_rethinking_2026`, `brigato_there_2025`, `tibshirani_conformal_2019`,
`kaas_probabilistic_2026`, `haben_short_2019`, `hertel_explainable_2026`,
`norton_tailored_2025`, `qin_toolllm_2023`, `liu_agentbench_2023`,
`packer_memgpt_2024`, `chhikara_mem0_2025`, `singh_agentic_2026`,
`edge_local_2025`, `yan_corrective_2024`, `asai_self-rag_2023`, `xi_rise_2023`,
`mohammadi_evaluation_2025`, `yehudai_survey_2026`, `thakur_judging_2025`,
`li_llms-as-judges_2024`, `gu_survey_2026`, `liu_cart_2025`,
`qian_userbench_2025`, `noauthor_full_nodate`.

**1. `noauthor_full_nodate` is malformed and should be deleted.** Title "Full
article: On the selection of forecasting accuracy measures" — no author, no
year, an `online` entry that duplicates `koutsandreas_selection_2022`. It is a
Zotero web-capture artefact. It is uncited, so it breaks nothing today, but it
would compile as "[n.d.]" if anyone ever cited it.

**2. Several W54 gap papers are in `ref.bib` but cited nowhere.** `haben_short_2019`
(Haben et al.), `brigato_there_2025`, `kolassa_evaluating_2016`,
`meyer_rethinking_2026`, `kaas_probabilistic_2026`, `hertel_explainable_2026`,
`norton_tailored_2025`. They were acquired but never put to work. **W54's charge
is not that the papers are absent from the library — it is that no citation
governs the choice of MASE, the model-selection procedure, or the weather
covariates.** Acquisition alone does not close it. `haben_short_2019` and
`hertel_explainable_2026` are the two that would govern the weather-covariate
choice, and neither is cited in `methodology.tex`.

---

## Summary — all 84 keys

| Verdict | Count |
|---|---|
| SUPPORTED | 65 |
| OVERSTATED | 7 |
| UNSUPPORTED | 0 |
| WRONG-SOURCE | 1 |
| MISSING-KEY | 0 |
| UNVERIFIED | 11 |
| **Total** | **84** |

**Zero MISSING-KEY and zero UNSUPPORTED.** Every key resolves in `ref.bib` with
the right title and authors, and no claim was found that its source contradicts.
The citation base is sound; the defects are of calibration and of verifiability.

### The seven OVERSTATED, ranked by consequence

1. **`kolassa_we_2023`** — generalises a MAPE/MAE-specific incompatibility to
   "minimal error". The paper says squared-error measures *are* coherence-
   compatible and MASE is not. Correcting it produces an argument for RMSSE the
   chapter currently argues away. **Bears directly on G1.**
2. **`fu_prism_2026`** — claims PRISM *reports* the calibration of its acceptance
   probabilities; it only *calibrates* them. Sits in the synthesis paragraph
   flagged by W21, and the correction widens rather than narrows the opening for
   the contribution claim.
3. **`hancock_meta-analysis_2011`** — asserts a performance-vs-attribute contrast
   the retrievable text does not support; what it supports is robot-factors vs
   human-factors, $d=+.67$ against $d=-.02$.
4. **`bavaresco_llms_2025`** — asserts a directional bias toward machine text
   where the paper reports variability by provenance. **Appears in both the
   literature review and the methodology chapter.**
5. **`yao_-bench_2024`** — two numeric claims ("under half of tasks", "below 25%")
   neither of which is traceable to retrievable text. The 35.2% τ-airline figure
   is available and stronger.
6. **`makridakis_m5_2022`** — two of three limbs belong to Hewamalage et al. M5's
   own 77.3%-intermittent figure goes unused, as does its use of the
   Kostenko-corrected 4/3 and 0.5 constants.
7. **`schmidt_machine_2022`** — "linear" kernel-ridge is unconfirmed; the
   one-week reversal is understated.

### The one WRONG-SOURCE

**`tan_are_2024`** — the clause "TimesFM itself beats language-model prompting by
a wide margin" sits inside a Tan-attributed passage. Tan does not evaluate
TimesFM at all. The finding is Das et al. 2024's (">25% over llmtime"). The
clause carries no citation of its own, which makes it an unsourced comparative
number in prose.

### The eleven UNVERIFIED, grouped

- **Human-factors and calibration cluster (5)** — `meyer_conceptual_2004`,
  `lee_trust_2004`, `parasuraman_humans_1997`, `guo_calibration_2017`, and
  `hancock_meta-analysis_2011` (also OVERSTATED). Older paywalled journal
  articles; the notebook holds reference-list fragments, not full texts.
- **Not in the notebook at all (2)** — `hyndman_another_2006`,
  `syntetos_categorization_2005`. Both are load-bearing methodology citations.
- **Partial sources (4)** — `park_generative_2023` (anchors the chapter's
  self-declared central conceptual move), `zheng_judging_2023`,
  `gulati_ask_2026`, plus `wickramasuriya_optimal_2019` and
  `cini_graph-based_2024` from batch 2.

None of these is evidence the claim is wrong. All are evidence that the chapter
header sentence withdrawn under W34 — asserting every empirical claim was
verified against full paper texts in NotebookLM — **still cannot be restored.**
Per `02_prj93_pipeline_spec.md` stage 6, restoring it requires a verification log
covering the chapter. This file is that log, and it shows 11 of 84 claims that
the notebook cannot currently support.

### What would close the gap

One reload job into notebook `d565d5f0-9ad6-446f-9573-2316a2f8c0ca`: the five
human-factors/calibration papers, the two absent methodology sources, and full
texts for the four partials. Eleven documents. That converts the audit from
"65 verified, 11 unverifiable" to a complete pass, and is the precondition for
the header sentence going back in.

*Audit complete: 84 of 84 keys. No chapter was modified.*

---

## Revision — 2026-07-30, second pass

The eleven UNVERIFIED keys above were re-verified **against full text in
Zotero**, not by re-querying NotebookLM. Zotero holds the PDFs the notebook
could not surface. The section above is left as written; this supersedes it.

### Revised totals

| Verdict | First pass | **Revised** |
|---|---|---|
| SUPPORTED | 65 | **74** |
| OVERSTATED | 7 | **9** |
| UNSUPPORTED | 0 | **0** |
| WRONG-SOURCE | 1 | **1** |
| MISSING-KEY | 0 | **0** |
| UNVERIFIED | 11 | **0** |

### Resolved to SUPPORTED (8)

| Key | Decisive evidence |
|---|---|
| `guo_calibration_2017` | "modern neural networks are no longer well-calibrated"; temperature scaling cuts CIFAR-100 ResNet-110 ECE from 16.53% to 1.26%; "We use ECE as the primary empirical metric" |
| `lee_trust_2004` | Fig. 2 verbatim: "Overtrust: Trust exceeds system capabilities, leading to misuse… Distrust: … leading to disuse" |
| `parasuraman_humans_1997` | "Disuse, or the neglect or underutilization of automation, is commonly caused by alarms that activate falsely" — a direct hit on the claim |
| `hancock_meta-analysis_2011` | Robot factors *are* split into performance and attribute subcategories: $\bar r = +0.34$ vs $\bar r = +0.03$. **The first-pass OVERSTATED verdict was wrong** |
| `syntetos_categorization_2005` | Cutoffs 1.32 / 0.49 exact; four categories confirmed (smooth / erratic / intermittent / lumpy) |
| `cini_graph-based_2024` | "a projection onto the space of coherent forecasts (i.e., the null space of Q)", $P = I - Q^\top(QQ^\top)^{-1}Q$ |
| `park_generative_2023` | Memory stream confirmed; retrieval is recency + relevance + importance, min-max normalised, weights all 1; recursive reflection confirmed |
| `zheng_judging_2023` | Verbatim: "The agreement under setup S2 (w/o tie) between GPT-4 and humans reaches 85%, which is even higher than the agreement among humans (81%)" |
| `gulati_ask_2026` | "goal clarification loses nearly all value after 10% of execution… while input clarification retains value through roughly 50%" |

*(Nine rows: `hancock_meta-analysis_2011` moved from OVERSTATED, the other eight from UNVERIFIED.)*

### Resolved to OVERSTATED (3 — all new defects the first pass could not see)

| Key | What the source actually says |
|---|---|
| `hyndman_another_2006` | **The 2006 paper defines MASE against the plain naive (random-walk, lag-1) benchmark. It contains no seasonal-naive denominator and no seasonal MASE variant.** The methodology chapter cites it for a seasonal-naive definition it does not give |
| `meyer_conceptual_2004` | **Meyer never says misses erode reliance.** He ties reliance to sensitivity ($d'$) and to operator experience. Compliance/false-alarm limb confirmed; his term is "cry-wolf *syndrome*", not "effect" |
| `wickramasuriya_optimal_2019` | Optimality is BLUE-type and conditional: "minimizes the mean squared error… **under the assumption of unbiasedness**"; "best (minimum variance) linear unbiased reconciled forecasts". "Guaranteed minimum error variance" is unqualified |

### Extraction note

`parasuraman_humans_1997` is a scanned ProQuest image PDF with no OCR — the body
could not be extracted and the verdict rests on the Zotero abstract, which
states the claim directly. Everything else extracted cleanly and in full.
**Nothing in this revision was confirmed from memory.**

### What the second pass changes about the first pass's conclusion

The first pass concluded that the W34 header sentence could not be restored
because 11 of 84 claims were unverifiable in NotebookLM. That framing was
wrong in one respect: the claims were verifiable, just not *there*. Zotero
reached all eleven.

The notebook gap is still real and still worth closing — `hyndman_another_2006`
and `syntetos_categorization_2005` are absent from it entirely — but it is a
tooling gap, not an evidence gap. **The substantive finding is the opposite of
what the first pass suggested: the sources that could not be checked were not
merely unchecked, they were hiding three real defects**, one of them on the
project's most exposed topic.

Proposed corrections for all nine OVERSTATED and the one WRONG-SOURCE are in
`brain/ledger/citation_fixes.md`. **None has been applied. No chapter was
modified in either pass.**
