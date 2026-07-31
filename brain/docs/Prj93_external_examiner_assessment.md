# PRJ93 "Proactive Brain": Complete External Examiner Examination Record

**Assessor stance:** external examiner on an MSc AI and Data Science programme, assessing the
experimental approach and methodology as if at the viva.
**Assessment date:** 2026-07-14.
**Document status:** complete examination record, not a summary. Every claim, data point, finding,
correction and citation raised during the examination appears here with its evidence.

**Scope of the examination:**

1. Research question and hypothesis: falsifiability, and whether the design tests it.
2. Data: provenance, leakage, splits, class balance, preprocessing.
3. Method: appropriateness against alternatives, and whether the choice is justified or merely convenient.
4. Baselines and ablations: honest or strawmen.
5. Evaluation: metrics, statistical validity, variance across folds, over-claiming from single runs.
6. Reproducibility: seeds, environment, config management.
7. Threats to validity not acknowledged.
8. The Related Work chapter (`Related_Work_Chapter.tex`).
9. Novelty: routes to a stronger contribution.
10. Methodology deviation and literature reconciliation: would you still choose this method and cite
    this literature, given what the data actually turned out to be.
11. Independent verification of every cited source, using the candidate's own NotebookLM library.

---

## 0. VERIFICATION BASIS

### 0.1 Sources, in priority order

1. `PRJ93_Master_State_Log.md` (current project state, decisions, rationale).
2. `Student_Documentation_-_MSc_DS_-_Dissertation_Submission.md` (marking criteria, Appendix B).
3. `PRJ93.md` (original project brief) and `Project_Specification.md` (the candidate's own aims).
4. `Related_Work_Chapter.tex`.
5. The live repository: `github.com/hphnam/ai-gm.ai-master`, branch `brain-construction`.
6. NotebookLM notebook `d565d5f0-9ad6-446f-9573-2316a2f8c0ca` ("Dissertation"), the candidate's own
   claim-verification library, used for independent source verification.

No claim below rests on memory of earlier sessions. Where the state log and the code disagree, the
code wins and the conflict is recorded. Where evidence needed for judgement is absent, the phrase
**NOT EVIDENCED** is used rather than an assumption.

### 0.1a VERIFICATION CURRENCY: the baseline this record was built on has since moved

**Read this before any number below.** The body of this record was verified against repository tip
`45588f1` (10 July 2026) and a data store whose ceiling was 2026-05-31. On 2026-07-20 the project
stands at tip **`d40dea7`**, with two further work cycles landed (G15, reports 36 to 39; G16, reports
40 to 41), a store ceiling of **2026-07-07**, and a **third** pre-registered confrontation window
(8 to 14 July). The diff across that span is 427 files, 21,218 insertions and 42,095 deletions.

Every claim in this record has been re-checked at `d40dea7`. The re-check is recorded in Section 10.9
and the revision log at Appendix J. Findings verified as still live at the current tip are marked
**[STANDS AT d40dea7]**. Quantitative appendices computed on the seed-only frame are labelled as such.

### 0.2 What was executed, not merely read

The repository was cloned at the branch tip and the pipeline rebuilt from the committed seed CSV in a
clean Linux container.

| Step | Command | Result |
|---|---|---|
| Repo tip | GitHub commits API | `45588f1` ("PRJ93 G12.18: rewrite AI-sounding comments and docstrings in plain engineer voice"). **Matches the state log.** |
| Ingest | `python -m ingest.normalise` | **PASS.** 92,329 source rows, 92,329 kept, 0 dropped. Date span 2025-06-04 to 2026-05-31. Venue counts match: `beer_hall` 47,644, `two_river_taps` 33,993, `ellel` 10,489, `events` 203. Null rates 0.0 across qty, net_sales, gross_sales, discounts, tax, ts. Net GBP by venue: beer_hall 202,087.69; ellel 44,282.75; events 1,438.74; two_river_taps 171,970.12. Reconciles True. |
| Warehouse | `python -m store.warehouse` | **PASS.** L1 round-trip 270 rows, L2 1,607 rows, L3 7,922 rows. Beer Hall L1 net ex-VAT GBP 202,087.69 against an audit figure of GBP 202,491, delta **GBP 403.31**. |
| Features | `python -m features.build_features` | **PASS.** 22 feature columns, adopted exo: none (ablation verdict). Leak-free True. Exo seam present, calendar populated, 9 columns. Calendar coverage full. |
| Ladder | Re-run of `evaluate_rolling` for all three venues, all non-Chronos rungs, with per-fold dispersion | See Appendix A. |
| Fold enumeration | `harness.rolling_origin(n_folds=6, horizon_days=7, min_train_days=120)` | See Appendix B. |
| MASE scales | Recomputation of the seasonal-naive denominator under both `fill_calendar` settings | See Appendix C. |
| Demand-pattern classification | ADI and CV-squared on the calendar basis, using the candidate's own ADI >= 1.32 cutoff | See Appendix E. |
| Test suite | `python -m pytest` | **258 passed, 12 skipped, 0 failed** in 117 seconds. |

Chronos-2 itself was not re-run (weight download). All Chronos rungs are reported from the
candidate's own committed artefacts, taken at face value.

**On the test-suite count.** The state log claims "269 passed / 1 skipped" in `.venv-forecast` and
"262 passed / 8 skipped" in `.venv`. The clean container returns 258 passed / 12 skipped / 0 failed,
the difference being the absence of Chronos, statsforecast and prophet. **The green-suite claim is
substantially verified.** This is not a finding.

### 0.3 Environment used for re-verification

Python 3.12; statsmodels 0.14.6; scikit-learn 1.8.0; pandas 3.0.2; numpy 2.4.4; duckdb; holidays;
pyarrow; pytest; fastapi; httpx. Chronos, statsforecast and prophet absent.

**This environment difference is itself a finding.** See Finding 3.

---

## 1. VERDICT

The engineering is well above the median MSc project and the evaluation discipline (pre-registered
freezes proven by commit order, leakage guards that actually fire, self-leaks found and reported
against the candidate's own interest) is Distinction-grade in intent. But the headline empirical
claim, that the served forecast beats its own backtest at the serving horizon, is an artefact of two
different MASE denominators: `sim/confront_july.py` scales by a trading-days-only seasonal-naive
error while the backtest and the June confrontation scale by a calendar-filled one, and on the
correct ruler the July result is 0.836, above the 0.745 it is claimed to beat. Combined with the fact
that the research question names an LLM-based agent and no LLM exists anywhere in the served system,
the work as it currently stands is a **Good Pass / Merit, provisionally 63**, not a Distinction.

---

## 2. PROVISIONAL MARK

**Provisional: 63/100 (Good Pass / Merit).** Scored against each band of Appendix B of the marking
guide.

| Band | Met? | Evidence |
|---|---|---|
| **0-19 Fail** | Cleared | Not applicable. Substantial, sustained, documented work. |
| **20-39 Fail** | Cleared | Not applicable. No major omissions of the kind this band describes. |
| **40-49 Fail** ("no MSc-level techniques, or the research question has not been answered sufficiently well") | Cleared on techniques; **partially triggered on the research question** | Chronos-2, split conformal with a Mondrian variant, MinT WLSv, CUSUM and BOCPD, LOVO and a 644-injection sensitivity grid are unambiguously MSc-level and correctly implemented. But the research question as written ("an LLM-based agent ... intervenes proactively") is not answered, because no LLM participates in any decision the system makes. |
| **50-59 Pass** | Met | Coherent, structured, correct. The ladder gate, the `eval/harness.py` splits and leakage assertions, and the conformal band are applied and interpreted correctly, and the concepts are demonstrably understood: the MinT top-preservation error was found and corrected against the candidate's own earlier plan (state log section 9). |
| **60-69 Good Pass** | Met | Technique well beyond the taught modules (foundation-model zero-shot forecasting, conformal prediction, hierarchical reconciliation, sensitivity curves in the spirit of VUS-PR). The full pipeline from sourcing to validation is present. The June-to-July arc reads as a genuine data-science loop, and negative results (Croston loses, MPS is slower than CPU, tighter cadence buys nothing, transfer dies past 14 days) are reported rather than buried. |
| **70-79 Distinction** | **Not met** | Distinction requires that "the research question should be answered logically and completely" and "a discussion of why the approach taken is better than alternatives that could have been used". The headline out-of-sample result inverts once the denominator is made consistent (Finding 1); the served-model choices sit inside their own fold-level noise and one of them flips on a library version bump (Finding 3); and the alternative-comparison is a point-estimate league table with no dispersion and no significance test. |
| **80-100 Outstanding Distinction** | Not met | Not publishable as it stands. The central experimental claim does not survive a re-derivation of its own metric. |

The mark is 63 rather than 55 because the failures are of statistical rigour and scope alignment, not
of understanding, and every one of them is cheaply fixable from code that already exists in the
repository.

**The mark was re-tested after the full literature verification pass (Section 10) and it stands at
63.** Verification added one Major (the Related Work chapter misstates its own key theorem) and one
credit (the candidate's refusal of the ERA5 weather basis exceeds published 2026 practice). These
offset.

---

## 3. FINDINGS

Ordered by severity. Fatal = invalidates the conclusions. Severities marked **[REVISED]** were
changed by the literature-verification pass in Section 10.

| # | Severity | Finding | Evidence (file, section, code path) | What a strong project would have done |
|---|---|---|---|---|
| 1 | **Fatal** | **Three defects, compounding. [SUBSTANTIALLY REVISED, Section 10.8]** **(1a)** The July headline MASE uses a different seasonal-naive denominator from the backtest it is compared against. `confront_july._seasonal_scale` runs raw SQL over `l1_daily`, a view grouped by trading date, so closed days are absent and the lag-7 differences are taken across a compressed index. The backtest and the June confrontation both use `read_series(..., fill_calendar=True)`. Beer Hall July MAE is GBP 243.5, so the reported 0.386 becomes **0.836** on the backtest's own ruler, that is, **above** 0.745. **(1b) Neither denominator is a valid seasonal-naive scale.** The calendar-filled scale is deflated by structural zeros: on Beer Hall **21.1% of the lag-7 differences are exactly zero** (closed day against closed day) and on Ellel **72.8% are**. Hewamalage et al. (2023) name this pitfall directly. The trading-only scale misaligns the weekday: Beer Hall trades 5.22 days a week, so lag-7 on the compressed index reaches back 1.34 weeks, to a **different day of the week**. The correct seasonal naive for Beer Hall is lag-5 on the trading index (scale 408.1). The four candidate rulers give July MASE of **0.836 / 0.399 / 0.597 / 0.672**, a spread of over 2x. **(1c) MASE is the wrong metric for these series and no denominator fixes it.** MASE optimises for the **median**; Ellel's median daily revenue is GBP 0 (82% of days). Hewamalage: *"On intermittent series, measures that optimize for the median are problematic since they consider constant zeros as the best prediction."* | `sim/confront_july.py:42-56` against `sim/confront_june.py:56-66`; `store/warehouse.py:46-58`; `features/build_features.py:105`; state log sections 2 and 14; `sim/july2026_confront_result.json`. All four scales recomputed from the rebuilt store: Appendix C. Hewamalage et al. (2023) verified in Section 10.8. | Reported **RMSSE**, which the M5 competition adopted for exactly this reason (73% of its 42,840 retail series are intermittent). RMSSE uses squared scaled errors, optimises for the **mean**, and does not reward a flatline. Then one scale function, imported from `eval.harness`, used by the ladder and both confrontations. The single most important number in the dissertation should not have a second implementation, and it should not be computed with a metric that pays a near-zero forecast for being near-zero. |
| 2 | **Fatal** | The research question and Objective 3 both name an LLM-based agent that "decides which issues are worth raising, when, and in what tone". There is no LLM in the system. The only Anthropic import in the whole `brain/` tree is `eval/judge.py`, an evaluator, and report 09 records that it never ran (no API key, `JUDGE_LIVE` unset, zero kappa). The reasoning and surfacing layer is `briefing._score`, a product of six constants hard-coded in `config.py`. | `grep -rn "anthropic" brain/*.py` returns only `eval/judge.py`; `signals/briefing.py:113-116`; `config.py:306-320` (`BRIEFING_SOURCE_WEIGHT`, `SEVERITY_MULT`, `NOVELTY_FACTOR`, `BASELINE_TRUST`, recency, direction bump); `brain/log/09_Agent_Eval_Report.md` section 5; `Project_Specification.md` section 2, Objective 3. | Either instantiated the agent (even thinly: one call that takes the ranked candidate list plus context and returns raise or stay-silent with a confidence), or rewritten the research question before the viva to the question the artefact actually answers. Doing neither leaves the examiner reading a forecasting dissertation against an agent-design research question. |
| 3 | **Major** | Model selection is a bare argmin of a 6-fold mean with no dispersion and no test, and it is not stable. Clean-room rerun of the deterministic rungs: Beer Hall ETS mean 0.829 with fold SD **0.226** (SEM 0.092), against a 0.054 gap to the served Chronos-2-exo (0.745). Ellel robust-DOW mean 0.572 with fold SD **0.524**, against a 0.009 gap to Chronos-2 (0.581). The committed Two River Taps table serves ETS (0.597) over GBM (0.602) on a 0.005 gap, with `>=` bounds and no lockfile behind it. **[CORRECTED, S4 Part 5]** An earlier claim that this selection flips on a library bump is withdrawn: retested under the same resolution, ETS scores 0.597 and still wins. The defect is that the selection was unverifiable, not that it was demonstrated to move. The candidate's own committed artefact confirms the point without any rerun: `eval/chronos2_covariate_probe.md` gives Chronos-2 univariate per-fold MASE of 0.641 / 0.825 / 0.490 / 1.015 / 0.785 / 1.001, mean 0.793, **SD 0.204**, so the 0.048 margin the served exo model holds over it is well inside one standard error. **[REVISED, Section 10]** At n=6 folds and a 7-day horizon, the Harvey-Leybourne-Newbold correction factor is **exactly zero**, so no Diebold-Mariano variant is even computable. See Appendix F. | `models/ladder.py:400-424` (`select_best` = `min(..., key=MASE)`); `evaluate_rolling` computes and then discards `per_fold_mase`; `models/ladder_results_L1_*.md` report means only; `brain/requirements*.txt` all use `>=`; `eval/chronos2_covariate_probe.md`. Appendices A and F. | Reported mean plus SD per fold, run a **Model Confidence Set** (Hansen, Lunde & Nason 2011), stated plainly that at n=6 the top three Beer Hall entrants are indistinguishable, and pinned dependencies with `==` plus a committed lockfile. |
| 4 | **Major** | Every served-model decision rests on 42 consecutive days. `rolling_origin(n_folds=6, horizon_days=7)` on a 362-day series yields test folds covering **2026-04-20 to 2026-05-31 only**: six adjacent, non-independent spring weeks. The model is then deployed into June and July. The state log itself records that on June-inclusive refits the exogenous edge reverses (robust-DOW 1.23 against Chronos-exo 1.37), and the served model was not changed. That is the winner's curse surfacing in production and being noted rather than acted on. | Fold dates enumerated from `eval/harness.py:76-99` (Appendix B); state log section 17 ("Fixture-day-specific covariate re-evaluation"); state log section 14 (June cold 1.64). | Blocked or seasonally stratified folds spanning the year. With 362 calendar days, `min_train_days=120` and a 7-day horizon, roughly **34 rolling origins** are available across the full year, and they cost minutes. Six weeks is not a backtest, it is a sample. |
| 5 | **Major** | The 644-injection evaluation, which is the strongest part of the work, perturbs the **residual z stream**, not revenue. `_apply_z` adds `dz` to `z` and back-solves `actual = expected + z * scale`, holding `expected` fixed. But production refits every 7 days (`RETRAIN_CADENCE_DAYS = 7`, plus `RETRAIN_ON_CHANGEPOINT`) and recalibrates the conformal band on rolling 7-day blocks, both of which chase a sustained shift and deflate z within roughly a week. The 0.996 regime-shift recall and the 2-to-6-day latencies are therefore measured against a forecaster that cannot adapt by construction. They are upper bounds, and the report does not say so. | `eval/inject.py:123-127` and its docstring lines 3 to 5 ("held-out copies of the standardised residual stream"); cadence constants in `config.py`; rolling recalibration in `conformal/wrap.py`; `brain/log/11_Scaled_Eval_Report.md` section 2, which acknowledges the spike recency window but not this. | Injected the shift into the raw revenue series, re-run the forecaster and the conformal recalibration on the perturbed history, then detected. That is the only version of the experiment that measures the system rather than one component of it. |
| 6 | **Major** | Objective 4 promised precision, recall, **calibration**, and structured manager feedback. Human anchor: **N = 0 labels**. LLM judge: never run, no kappa. Calibration: **no ECE, reliability diagram, or temperature scaling exists anywhere in the codebase**, yet state log section 16 lists "Calibration (agent eval) / Guo et al. 2017 / ECE binned formula, temperature scaling" as a method *in the build*. That is a direct state-log-versus-code conflict. VUS-PR is also recorded as not computed (dependency unavailable). | `grep -rni "ece\|expected calibration"` over `brain/` returns nothing outside conformal recalibration; `brain/log/09_Agent_Eval_Report.md` section 5 ("N=0 labelled items"); state log section 16, table row 9; `brain/log/11_Scaled_Eval_Report.md` section 2.1. | Twenty labelled days is an afternoon. The instrument (`eval/labels.py`: stratified sampler, two-pass protocol, pre-registered definition) is **already built and is good**. It was never run. That is the most expensive unforced error in the project. |
| 7 | **Major** | Weather covariates are trained and backtested on the `hindcast` basis, and `config.py:231` asserts this "matches serving". For a past date the historical-forecast API returns the most recent model run covering that date, that is, a short-lead, near-analysis forecast; at serving time, day 7 of the horizon has a 7-day-lead forecast, which is materially worse. The exogenous entrant's entire margin (0.745 against 0.793 univariate) is the covariates. The correct basis, `leadmatched`, **is already implemented and unused**, and `WEATHER_LEAD_DAYS` is set to 3, not 7. **[CREDIT ADDED, Section 10]** The candidate's refusal of the observed/ERA5 basis is *more rigorous than published 2026 practice*. See Section 10.5. | `config.py:229-235`; `ingest/exog_weather.py:39-41` and `95-118` (`fetch_leadmatched`, the previous-runs API); `models/foundation.py:72-76` and `306-313` (raises `MissingCovariateError` if the basis is `observed`). | Run the ladder with `WEATHER_TRAIN_BASIS="leadmatched"` and `WEATHER_LEAD_DAYS=7`, and report the honest exogenous margin next to the optimistic one. The code is written. It has never been switched on. |
| 8 | **Major** | Rhythm is learned from sales only. The specification names four domains (sales, stock movements, checklist completions, chat-log volume). `briefing.collect` pulls deviation, change-point, stock and checklist; `CHECKLIST_LIVE = False`; `signals/chatlog_kb_gap.py` is never imported by the briefing. The brief's own second worked example (three staff ask about the fryer reset, so flag a missing SOP) is built as a module and never surfaces to anyone. | `signals/briefing.py:102-120`; `config.py:304`; no import of `chatlog_kb_gap` outside its own tests; state log section 1 ("This is the only measured signal the brain learns from"); `Project_Specification.md` section 3.2. | Wired the KB-gap signal into `collect()` behind its `sop` source weight (which is already defined in `BRIEFING_SOURCE_WEIGHT`) and evaluated it on the 735-message chat log that is already sitting in `brain/data/`. Two of the four domains are blocked on other people. The chat log is not. |
| 9 | **Major** **[NOW FORMALLY GROUNDED, Round 3]** | Band coverage of 1.00 is reported as a success in the headline. **This is not merely over-wide, it violates the stated guarantee.** Verified from Angelopoulos and Bates: split conformal bounds coverage on **both** sides, `1 - alpha <= P(Y in C) <= 1 - alpha + 1/(n+1)`, the upper bound holding when the scores have a continuous joint distribution. A reported 1.00 against a 0.90 nominal exceeds the upper bound unless the calibration set is smaller than about ten points. The candidate is therefore not being conservative; the band is mis-calibrated, or n is too small to support the claim, and neither is reported. State log section 6 sets the coverage gate at nominal plus or minus 3 percentage points; 1.00 against a 90% nominal is 10 points of **over**-coverage, which means the band is too wide, which is the standard criticism of a conformal interval. `eval/harness.py` already computes `winkler` and `mean_width`; neither confrontation reports either. On n=7 days coverage can only take values k/7, so the number carries almost no information anyway. | State log section 14; `sim/july2026_confront_result.json` (`band_coverage: 1.0`); `eval/harness.py:170-207`; the coverage gate in `conformal/wrap.py`. | Reported the Winkler score and mean width alongside coverage, so that over-wide bands are penalised rather than celebrated. Ellel is the giveaway: coverage 1.00 on a band wide enough to contain a forecast that missed 87% of the revenue. |
| 10 | **Major** **[REVISED from Minor]** | Multi-venue transfer, which the brief calls "the interesting research", is tested with a donor day-of-week shape heuristic, wins on 2 of 3 venues at a 14-day cold start, loses at every window from 21 days onward, and is used by **no served model**. The stated gate, "transfer beats naive on the **data-rich** held-out venues", excludes exactly the venue where it lost (Two River Taps, n_test = 317, which is not data-poor). Whether that wording was pre-registered is **NOT EVIDENCED**. **Upgraded to Major** because Chronos-2, the model already in production, natively implements cross-series in-context learning and the code disables it by passing a group of size one. See Finding 13. | `brain/transfer/transfer_results.md`; `eval/harness.py:100-105` (LOVO scaffold); `models/foundation.py:319` (`id = "l1"`). | Pre-registered the gate wording, or dropped the gate and reported the crossover curve as the finding, which is what it honestly is. And used the transfer mechanism that was already in the served model. |
| 11 | Minor | Beer Hall net sales reconcile to the host's audit figure only to within GBP 403.31 on GBP 202,491 (`RECONCILE_TOL = 0.01`). The delta passes the gate and is never explained. | `store/warehouse.py:305-318`; `config.py:129-131` (`EXPECTED_TOTAL_ROWS = 92329`, `BH_NET_SALES_TOTAL = 202491.0`, `RECONCILE_TOL = 0.01`); reproduced (GBP 202,087.69 against GBP 202,491). | Traced the 0.2%. A tolerance is not an explanation. |
| 12 | Minor **[REWRITTEN ON EVIDENCE, Section 10.9]** | **The Two River Taps VAT assumption is correct. The method used to resolve it was not.** The deflator treats TRT `Net Sales` as VAT-inclusive and divides by 1.2. That is right, and it is now confirmed: across 80 items sold at both TRT and Beer Hall with at least 30 units each, the median ratio of the TRT recorded price to the Beer Hall **gross** price is **1.0000** (51 of 80 within 2%), against 1.2000 for the rival hypothesis that TRT is already ex-VAT (5 of 80). Beer Hall taxed rows carry `tax/net = 0.2000` exactly and `Gross = Net + Tax` to the penny; TRT books **zero tax on all 33,993 rows**. The finding is therefore not that the number is wrong. It is that **a question decidable from the project's own committed seed CSV in under an hour was classified as stakeholder-blocked and left open for months** as "Owner to confirm" in `FLAGS.md`, and that the state log then declared it "moot" while both the code and the flag ledger still said otherwise. | Verified this examination: `ingest/normalise.py:160` applies `vat_deflator`; the result flows `net_sales_exvat` to `store/warehouse.py:92,111,126` as `revenue_exvat`, which is the column every forecast and every MASE is computed on. `config.py:148-152` still labels it "a working assumption pending owner confirmation"; `FLAGS.md:43-45` still reads "**Owner to confirm.**" Cross-venue price table at Section 10.9. | Run the comparison. The evidence was in the till export from day one. Ask which open questions are actually external before waiting on anyone.|
| 13 | **Major** **[NEW, Section 9]** | The L1 series are intermittent, and the entire L1 stack (model and metric) assumes continuous demand. On the calendar basis the L1 forecast and its MASE actually use, and applying the candidate's **own** ADI >= 1.32 cutoff: Beer Hall ADI 1.35 / CV-sq 0.57 (**lumpy**), Ellel ADI 5.63 / CV-sq 0.98 (**lumpy**), Two River Taps ADI 1.18 / CV-sq 0.61 (erratic). The intermittency diagnostic was only ever run at **L3**. Croston and SBA are imported only in `hierarchy/reconcile.py:34`, gated on `intermittent_nodes(venue, top_k)`, an L3 function. **Croston has never been run at L1**, where all three served models live. No hurdle, two-part, zero-inflated or occurrence model exists anywhere. | Trading density recomputed from the store: BH 270/362 = 74.6%, Ellel **64/349 = 18.3%**, TRT 280/331 = 84.6%. Appendix E. `eval/intermittency_diagnostic.md` (30 Beer Hall L3 item nodes, 20 intermittent). `grep -rni "hurdle|two-part|zero-inflat|occurrence"` over `brain/` returns nothing. | Modelled the occurrence process. The Mondrian variant in `conformal/wrap.py` already splits active days from structural-zero days, so the candidate diagnosed the zero-inflation **in the band** and never carried it into the **point forecast** or the **metric**. |
| 14 | **Major** **[NEW, Section 9]** | Chronos-2 is called with `id = "l1"`, a single series, one venue at a time. Chronos-2's defining architecture is a **group attention mechanism whose purpose is in-context learning across a group of related series**. The group being passed has size one. The brief's named research interest is natively supported by the served model and switched off by one string literal. | `models/foundation.py:318-325` (`context_df` built with `"id": "l1"`); Ansari et al. (2025) as verified in Section 10.3. | Passed the three venues (and optionally the L2/L3 nodes) as one group and measured cross-learning against per-venue univariate. |
| 15 | **Major** **[NEW, Section 9]** | Ellel's model has **zero information about whether it will trade tomorrow**, on a series where 82% of days are zero. `is_ellel_event` was correctly neutralised to constant 0 on Ellel's own frame to kill a self-leak. That fix was right, but it left the occurrence signal empty, and the venue's forward booking diary exists in the real world and is not in the dataset. | `features/build_features.py:130-140`. Ellel trading density 18.3%. | Asked the venue for its booking diary and used it as a known-future occurrence covariate. This is a data-acquisition gap, not a modelling gap, and it is the highest-value input available to the project. |
| 16 | **Major** **[NEW, Section 10]** | The Related Work chapter **misstates the theorem of its own key source**. It claims Sun & Yu (2025) CPTC gives "a band whose coverage is **guaranteed** even as the venue's regime shifts". CPTC proves no such thing: exact finite-sample coverage **only under exchangeability** (Prop 4.1), which a change point violates by definition; **asymptotic time-averaged** validity under Assumption 1 (a stationary distribution of states) (Thm 4.2); and **faster convergence than ACI** after a shift, explicitly permitting "shorter miscoverage periods" (Thm 4.4). It never claims valid coverage at or immediately after a change point. | `Related_Work_Chapter.tex`, deviation section. Sun & Yu (2025), NeurIPS 2025, verified in full in Section 10.2. | Read the theorem. This is on the chapter's most load-bearing sentence and an examiner can check it in ninety seconds. |
| 17 | **Major** **[NEW, Section 10]** | The Related Work synthesis paragraph claims an unoccupied intersection that **PRISM (Fu et al. 2026) already occupies**. PRISM uses an asymmetric miss-to-false-alarm cost ratio to set an adaptive intervention threshold, and it is the only one of nine proactive-agent papers that reports **Expected Calibration Error** and Brier scores on the agent's probability estimates. PRISM is sitting in the candidate's own notebook. | `Related_Work_Chapter.tex`, synthesis section. Fu et al. (2026), verified in Section 10.4. | Positioned against PRISM by name. Claiming an empty intersection when the occupying paper is in your own library is the fastest route to a viva you cannot defend. |
| 18 | Minor **[NEW, Section 10]** | Citation key error. The chapter cites `faw_-context_2025`. The paper is **Das, Faw, Sen & Zhou (2024)**, dated 1 November 2024, and the authors are listed **in alphabetical order**, so "Faw et al." is not a legitimate short form. Wrong first author, wrong year. | Verified from the PDF in the candidate's notebook, Section 10.3. | Checked the Zotero entry. |
| 19 | Minor **[NEW, Section 10.8]** | The intermittency diagnostic uses the wrong boundary constants. `eval/intermittency_diagnostic.md` classifies on ADI >= **1.32** and CV-squared >= **0.49**. Both numbers are arithmetic errors in Syntetos, Boylan and Croston, and **Kostenko and Hyndman (2006) corrected them twenty years ago**: the limiting value is **p = 4/3 = 1.3333** (*"not 1.32 as given by SBC"*) and the maximum CV-squared is **0.5** (*"not 0.49 as given by SBC"*). The correcting paper is now in the candidate's own notebook. **[UPGRADED, Round 3: on the current frame a venue DOES reclassify.]** Beer Hall's ADI is now **1.3256**, which falls between SBC's erroneous 1.32 and the correct 4/3 = 1.3333. Under the constant the candidate uses it is lumpy; under the corrected constant it is erratic. The wrong arithmetic now decides the classification of the anchor venue. Kostenko and Hyndman also give the exact Croston-versus-SBA rule the diagnostic should be using: **use SBA whenever v < 2 - (3/2)p**. **[REVIEWEE CORRECTION 2026-07-31: this inequality is inverted. The paper's own sentence is "use SBA whenever v > 2 - (3/2)p" — verified in `ledger/citation_audit.md` row `kostenko_note_2006`. The implementation in `select_sba` inherited the reversed form from this finding and consequently reported that no node in the estate selects SBA, which is the opposite of the truth. Under the published rule every intermittent node selects SBA, necessarily so: `2 - (3/2)(4/3) = 0` exactly, so the threshold is non-positive at or above the intermittency cutoff. The substance of Finding 19 — that the constants were wrong and must be corrected — stands and is accepted.]** | `eval/intermittency_diagnostic.md`; Kostenko and Hyndman (2006), verified in Section 10.8. | Cited the paper that corrects the constants, rather than the paper that got them wrong. |

### 3.1 Sound, and not dwelt on

The leakage architecture (`assert_no_leakage` on every fold, and it demonstrably fires); the
`is_ellel_event` self-leak caught and the inflated GBM win retracted; the MinT top-preservation error
found and corrected against the candidate's own specification; the observed/ERA5 weather basis
explicitly refused as a backtest leak (and see Section 10.5: this **exceeds** published 2026
practice); the liveness gate, which fixed a GBP 5,329 overcount; the taxonomy-drift diagnosis; and the
pre-registration by commit ordering (Origin B, frozen while the target week was still in the future,
is the strongest form of it). The test suite runs clean from a fresh clone: 258 passed, 12 skipped.
That is real work and it should be foregrounded.

---

## 4. THE THINGS TO FIX FIRST

Ranked by marks gained per hour of work. **This list was revised twice**: once by the methodology
diagnosis (Section 9) and once by the literature verification (Section 10). The revisions are marked.

### 1. Add a `step_days` parameter to `rolling_origin` and set it to 1. **[SUBSTANTIALLY REVISED, Section 10.8]**
**2 to 3 hours. Kills two Majors (Findings 3 and 4) with one parameter, and it is a bigger parameter than previously stated.**

At n = 6 folds and a 7-day horizon, the Harvey-Leybourne-Newbold small-sample correction factor is
**exactly zero** (Appendix F). No Diebold-Mariano variant is computable. The original, uncorrected
test rejects a *true* null of equal accuracy **72.4% of the time** at n = 8, h = 7, nominal 10%. You
have no test, and you cannot get one at six folds.

**The code caps you at 34 origins, and it does not have to.** `eval/harness.py:76-99` steps the origin
by `horizon_days`, so test windows never overlap and 362 calendar days with `min_train_days = 120`
yields at most **34** origins. Add a `step_days` argument and set it to 1, and the same series yields
**236** rolling origins.

| origins | HLN factor at h = 7 | inside Hansen et al.'s studied range? |
|---|---|---|
| 6 (current) | **0.0000, degenerate** | No |
| 34 (step = 7) | 0.8087 | No. Below their smallest simulated n = 50. |
| **236 (step = 1)** | **0.9725** | **Yes.** Their main simulation runs at n = 250. |

At 236 origins both the modified Diebold-Mariano test **and** the Model Confidence Set become valid.
The overlapping test windows induce serial correlation in the loss differentials, which is exactly
what the MCS's **moving-block bootstrap** exists to handle (Hansen et al. use block length l = 2 and
B = 1,000; use a block length of at least the horizon, so l >= 7). Chronos-2 is 120M parameters and
runs in 0.6 seconds on CPU; 236 origins by ten models by three venues is about 7,000 fits, roughly an
hour on CPU and minutes on the A2000.

**Then report mean plus SD per fold and a Model Confidence Set, and pre-register alpha at 0.10 or
0.25**, which are the two levels Hansen et al. themselves use in their applications. Do not use 0.05;
at these sample sizes the procedure will have no power and you will be accused of choosing the level
after seeing the answer.

**Be ready for the MCS to be wide, and present that as the finding.** Hansen et al.: *"uninformative
data yield a MCS with many models, whereas informative data yield a MCS with only a few models"*, and
of the low-power case they say plainly: *"We view this as a strength of the MCS procedure."* A 90% MCS
at Beer Hall that contains Chronos-2-exo, Chronos-2, ETS and Chronos-Bolt is not a failed experiment.
It is the honest answer, and it is the one sentence that converts this criterion from a fail into a
Distinction. See Section 11.6.

This single change also fixes Finding 4, because rolling across the year replaces the 42-day spring
block with seasonal coverage.

### 2. Switch the headline metric to RMSSE, and unify the scale function. **[SUBSTANTIALLY REVISED, Section 10.8]**
**3 to 4 hours. Removes a Fatal.**

The original advice was "make July use the backtest's denominator." **That advice was incomplete.
Neither denominator is valid** (Finding 1b), and even the correct denominator would not save MASE on
these series (Finding 1c).

**Do three things, in order.**

**(a) Report RMSSE as the headline.** RMSSE = sqrt( (1/n) sum_t q-dagger_t ) where
q-dagger_t = e_t^2 / [ (1/(T-1)) sum (y_t - y_{t-1})^2 ]. Squared scaled errors optimise for the
**mean**, so a flatline forecast is not rewarded. This is the M5 competition's own metric, chosen for
retail series of which **73% are intermittent**, which is the same problem you have. Keep MASE as a
secondary, clearly labelled, with the structural-zero caveat stated.

**(b) Delete `_seasonal_scale` from `sim/confront_july.py`.** One scale function, imported from
`eval.harness`, used by the ladder and by both confrontations, truncated at the freeze cutoff. State
which basis it uses and why. If you keep a MASE at all, the defensible scale for Beer Hall is
**lag-5 on the trading index** (same weekday, no structural zeros: scale 408.1), not lag-7 on either
index.

**(c) Restate the July result honestly.** Under the four candidate rulers the same forecast scores
0.836, 0.399, 0.597 or 0.672. Say that, show the table, and rewrite state log section 14 to withdraw
the claim that the served forecast beats its own backtest. Add a decision-log row naming the bug.
Then add `winkler` and `mean_width` to the July output, both of which `eval/harness.py` already
computes and `confront_july.py` drops (Finding 9). **Kaas et al. (2026) is the reporting template**:
MAE, RMSE, R-squared, pinball loss, Winkler score, interval width and empirical coverage, all in one
table. That is the set you are missing.

Finding your own metric bug and reporting it is worth more marks than the inflated number was ever
going to be. Finding that your metric was wrong *in kind*, and citing the two peer-reviewed papers
that say so, is worth more still.

### 3. Pin the environment
**1 hour. Part of Finding 3.**

Freeze `requirements*.txt` to `==` at the exact versions used, commit `uv.lock`, and pin the Chronos-2
Hugging Face weights to a revision SHA, not just a model id. You currently cannot reproduce your own
Two River Taps selection: the committed table serves ETS (0.597) over GBM (0.602), and a clean-room
rerun on statsmodels 0.14.6 and sklearn 1.8.0 gives ETS 0.617 and GBM 0.601, so the served model
flips.

### 4. Instantiate the agent, run the labels, compute the calibration number
**8 to 10 hours (down from 10 to 12: PRISM supplies the method). Converts a Fatal and the unmet Objective 4.**

Write `signals/agent.py`: a single Anthropic call that takes the ranked `BriefingItem` list plus the
day's numbers, the attribution candidates and the venue context, and returns for each item a
`raise | stay_silent` decision with a probability. Set the acceptance threshold from an **asymmetric
miss-to-false-alarm cost ratio elicited from Elliot**, following PRISM's method (Fu et al. 2026, which
sweeps the ratio over a grid from roughly 1:4 to 1.2:1). Score that binary decision against the
644-injection corpus you already have: precision, recall, **ECE and Brier**, which are the missing
terms of Objective 4.

Then run `python -m eval.labels --label` on the stratified sample for one afternoon, get 60 to 100
item-level judgements, have Ryan label a 25-item overlap for an inter-rater kappa, and run
`eval/judge.py` for the judge-versus-human kappa. Benchmark it against PRISM's LLM-judge ensemble,
which reported **89.1% agreement with human annotators**.

Every piece of this tooling is already written and tested. The only thing missing is that nobody has
run it.

---

## 5. METHOD CHALLENGE

**The core choice under challenge:** serving Beer Hall's L1 forecast with zero-shot Chronos-2
conditioned on 14 exogenous covariates, selected by a rolling-MASE gate.

**The strongest alternative: a partially pooled hierarchical model with explicit event and weather
terms** (a Bayesian hierarchical state-space model or a dynamic regression with venue-level random
effects; or at minimum an ETS or robust-DOW backbone with a fixture and weather regressor and
shrinkage across venues).

### 5.1 Why the alternative might be better

1. It is the method the brief actually asked for: "the interesting research is in multi-venue
   transfer learning: each venue is small on its own, but together they offer a richer signal."
2. Your own numbers do not support the foundation model over the simple alternatives. 0.745 against
   ETS at 0.799 is inside one standard error of the fold mean, and at Ellel the "simple beats
   complex" result you present as a finding is a 0.009 gap against a fold SD of 0.52, which is not a
   finding, it is a coin toss.
3. The product requirement is causal explanation. The brief's worked example is "Friday lunch sales
   are running 30% above forecast, so raise next week's keg order." A hierarchical model with an
   England-fixture coefficient and a credible interval hands the manager exactly that number.
4. Reproducibility. A fitted model with pinned data is reproducible forever. A call to
   `amazon/chronos-2` is reproducible until Amazon reuploads the weights, and you have not pinned a
   revision.

### 5.2 The counter-argument to defend the choice at the viva

1. The gate is a floor, not a significance claim, and Chronos-2-exo clears it in a regime where the
   local baselines fail outright: Beer Hall's robust-DOW scores 1.029, **worse than seasonal-naive**,
   so the "simple model" alternative is empirically dead at the anchor venue.
2. The host's actual problem is cold start ("external operators onboarding next"), and your own LOVO
   experiment shows in-estate transfer stops paying past 14 days of history. Zero-shot inference is
   the only method here that gives a new venue a forecast on day one.
3. Inference costs 0.6 seconds on CPU, which is what makes the event-aware refresh cadence feasible at
   all. A refit-per-refresh hierarchical model would not be.
4. Interpretability was deliberately architected out of the forecaster and into the enrichment layer,
   precisely so that statistical detection stays blind and honest and never misattributes.

That defence holds. What it does **not** survive is being asked for a p-value, so fix number 1 above
is the price of using it.

### 5.3 CORRECTION to Section 5, issued after the literature verification

**Argument (1) in Section 5.1 contained a factual error, and it is withdrawn.**

I wrote: *"Chronos-2 zero-shot shares nothing between your three venues."*

**That is false.** Chronos-2's group attention **is** a cross-series information-sharing mechanism.
Verified from the paper (Section 10.3): a group may be *"a set of time series with shared source or
metadata: this grouping enables the model to perform cross learning across items by making joint
predictions for related time series (also referred to as few-shot learning) instead of generating
univariate forecasts by solely taking the histories of individual time series into account. Sharing
information between related time series could be especially helpful when all or some (cold start
scenario) time series have short histories and when the characteristics of the downstream dataset
differ considerably from the training data distribution."*

That sentence was written for a three-venue Lancashire pub estate with 270 days of history.

Chronos-2 shares nothing between the venues **only because the code passes it one venue at a time**
(`models/foundation.py:319`, `id = "l1"`).

**Reconciliation, and it strengthens the candidate's position rather than weakening it.** The right
answer to "why not a hierarchical pooled model?" is no longer defensive. It becomes:

> *"Partial pooling is the right instinct, and I tested it. Rather than fit a separate hierarchical
> model, I exercised the pooling mechanism inside the served model: Chronos-2's group attention
> performs in-context learning across related series without gradient updates. I measured per-venue
> univariate against three-venue group ICL on the same folds and the same gate. Here is the result."*

That is a better answer than the original, and it is only available if the group-ICL run is done. The
hierarchical alternative moves from *instead of* Chronos-2 to *inside* Chronos-2.

---

## 6. QUESTIONS THE WORK IS LEAST ABLE TO ANSWER

The five viva questions this work currently cannot answer.

1. Your backtest MASE is 0.745 and your July MASE is 0.386. Show me the denominator in each. Which
   one is the in-sample seasonal-naive scale, and what is the July number when you use the same ruler
   as the backtest?
2. You selected Chronos-2-exo at 0.745 over ETS at 0.799 across six folds. What is the standard
   deviation of ETS across those folds? On six paired observations, can you reject the hypothesis that
   those two models are equally good, and if not, on what basis is one of them in production?
   *(Follow-up, added after verification: what is the Harvey-Leybourne-Newbold correction factor at
   n = 6 and h = 7?)*
3. Your research question is "how can an **LLM-based agent** learn a venue's rhythm and intervene
   proactively". Point me at the LLM in the served system. What decision does it make, and what
   happens to your research question if the answer is "none"?
4. Your regime-shift recall is 0.996 with a two-day median latency. The injection adds a step to the
   standardised residual while holding `expected` fixed, but production refits every seven days and
   recalibrates the conformal band on rolling seven-day blocks. What happens to that recall and that
   latency when the forecaster is allowed to chase the shift, as it will in production?
5. Your specification promised precision, recall, calibration, and structured manager feedback. How
   many manager judgements are in your evaluation, and what is your expected calibration error? If the
   answers are zero and "not computed", what is the evidential basis for any claim that this system's
   judgement is good?

**Two further questions added by the verification pass:**

6. Your Related Work chapter says Sun and Yu guarantee coverage "even as the venue's regime shifts".
   Read me Proposition 4.1 and Theorem 4.2. Under what assumption does each hold, and does either of
   them apply at a change point?
7. Chronos-2's group attention exists to share information across related series. How many series are
   in the group when you call it?

---

## 7. EVALUATION OF `Related_Work_Chapter.tex`

**Summary: this is the strongest artefact in the project and the most dangerous one.**

It is a good literature review: concept-centric as the marking guide demands, argumentative rather
than descriptive, and critical in the right places (Tan et al. deflating the language-model premise;
Kim et al. destroying point-adjusted F1; the Wang, Panickssery and Bavaresco trio disciplining
LLM-as-judge). The four threads announced in the opening paragraph are actually threaded, and each
subsection does consume the previous one. On its own it reads like a 75.

It is dangerous because **it is the literature review for a project that was not built**, and it makes
four promises the rest of the submission currently breaks, plus two claims that its own sources do not
support.

**Provisional mark for this chapter in isolation: 72.** It would be a 78 if it argued for the system
that exists.

### 7.1 The synthesis paragraph is the single most exposed sentence in the dissertation

> "No prior work assembles a transfer-borrowed per-venue rhythm, calibrated deviation detection on
> real hospitality data, and a proactive managerial agent whose interventions are evaluated on **real
> manager adopt-or-dismiss outcomes**. That intersection, occupied for the first time and evaluated in
> a live multi-venue setting, is the contribution this dissertation makes."

Three legs, three failures:

| Claimed leg | Actual state |
|---|---|
| transfer-borrowed per-venue rhythm | Transfer is a donor day-of-week shape heuristic, wins at a 14-day cold start, loses from 21 days, and **is used by no served model** (`transfer/transfer_results.md`). |
| proactive managerial **agent** | No LLM participates in any decision. `signals/briefing.py` is a product of six constants. |
| evaluated on **real manager adopt-or-dismiss outcomes** | **N = 0** (`log/09_Agent_Eval_Report.md` section 5). |

**And a fourth failure, found in verification (Finding 17):** the intersection is not unoccupied.
**PRISM (Fu et al. 2026) already does cost-sensitive intervention thresholding and reports ECE**, and
PRISM is in the candidate's own notebook.

An examiner reads the synthesis first and checks it last. As written, this paragraph is a contribution
claim that cannot be substantiated, and claiming a contribution you did not make is the fastest way to
convert a Merit into an argument about integrity. Either the artefact moves to meet the chapter or the
chapter moves to meet the artefact. Do not submit them as they stand.

### 7.2 Four promises the chapter makes that the results chapter cannot keep

1. **VUS-PR.** The deviation section states: "detection on hospitality data will be reported with a
   lag-tolerant, random-robust measure in the spirit of VUS-PR, and point-adjusted F1 is rejected as a
   headline metric." Report 11 section 2.1 records VUS-PR as **"not computed, dependency
   unavailable"**. Kim et al. and Liu and Paparrizos are set up beautifully and the metric they
   motivate is never run. Either get TSB-AD to build on the 3.12 evaluation venv (it does not build on
   3.14, which is the candidate's problem, and the fix is one venv) or rewrite the commitment to what
   is actually reported.
2. **Calibration and ECE.** The evaluation section ends on Guo et al. and expected calibration error
   as the loop-closing guarantee. There is no ECE anywhere in the codebase.
3. **Ask-F1 against real dismissals.** The chapter adapts Trinh et al.'s HiL-Bench to
   "adopt-versus-dismiss outcomes". The Ask-F1 sweep has zero misses and a flat cost of 8.0 at every
   ratio from 1:1 to 10:1, which means the sweep is degenerate and measures nothing.
4. **Memory.** The chapter's self-declared "central conceptual move" is that the learned rhythm *is*
   the agent's memory, via Park et al.'s recency, relevance and importance stream and Hu et al.'s
   self-evolving state. There is no memory stream, no reflection, and no retrieval. A reader arrives
   at the Methods chapter expecting a memory architecture and finds a recency multiplier with a floor
   of 0.5.

### 7.3 The conformal arc argues for a conclusion the candidate's own data refutes, AND misstates its source

The deviation section builds toward Sun and Yu's CPTC as "the cleanest statement of the position this
chapter has been building toward: a deviation is a point that falls outside a band whose coverage is
**guaranteed even as the venue's regime shifts**."

**Part one: the data.** The candidate's own `eval/aci_closure_probe.md`, committed to the repository:

| Policy | pre-closure | post-closure (28d) | overall |
|---|---|---|---|
| static split conformal at 0.90 | 0.944 | **0.529** | 0.918 |
| ACI, gamma = 0.005 | 0.932 | **0.471** | 0.903 |
| ACI, gamma = 0.01 | 0.928 | **0.412** | 0.896 |
| ACI, gamma = 0.02 | 0.920 | **0.471** | 0.892 |

Counts: 251 pre-closure, 17 in the 28 days post-closure, 268 evaluated overall.

At the one real regime change in the data, coverage collapses to roughly half of nominal, and
**adaptive conformal is worse than the static baseline**.

**Part two: the source.** Verified in Section 10.2, CPTC claims none of what the chapter says it
claims. This is Finding 16.

**Part three, and it changes the conclusion:** verified in Section 10.2 and 10.6, the candidate's
liveness gate is a **two-state CPTC with a perfectly observed state**, and Zaffran's Theorem 3.1
*predicts in advance* that ACI would underperform static CP here. The result is not an embarrassment
and it is not an anti-conformal finding. It is a confirmation of two published theorems, and the
candidate has the fix half-built and never connected it. See Section 11, Correction 1.

### 7.4 Where the chapter is structurally under-built

- **Chronos-2 is the served model and it is cited once, inside a parenthetical pile** ("probabilistic
  or industrial entrants \cite{ansari_chronos-2_2025, rasul_lag-llama_2024, garza_timegpt-1_2024}").
  TimesFM and Chronos-1 get full paragraphs. The chapter never argues for the model that ships, and it
  never engages at all with **covariate-conditioned** foundation forecasting, which is the one
  interesting technical choice made. The marking guide requires the Background chapter to "clearly
  elicit the gap that your novel method fills". The gap it elicits is not the one the method fills.
- **CUSUM, the production detector, is absent from the chapter entirely. [NEW, Round 3]** The state
  log's own fidelity audit records **"CUSUM / Page 1954 / Faithful, production detector"** and
  **"BOCPD / Adams & MacKay 2007 / Faithful, benchmark only."** The chapter inverts this. It gives
  Adams and MacKay a full treatment, describing BOCPD as "suited to abrupt regime shifts such as a
  venue's permanent closure", then covers the Truong survey, `ruptures` and SPOT. **CUSUM is not
  mentioned once.** A reader finishes the chapter expecting BOCPD to be the detector, reaches the
  Methods chapter, and meets CUSUM with no literature grounding behind it. Page (1954) is the
  originating citation and it is uncontroversial; the gap is the argument, not the reference. This is
  the same defect as the Chronos-2 bullet above, and the two should be fixed together, because between
  them they mean **the chapter does not argue for either of the two methods that actually ship.**

- **Croston.** The chapter positions Croston and Syntetos-Boylan as "the relevant reference" for sparse
  demand and frames it as an L3 concern. The L1 series are lumpy too (Finding 13). And Croston was
  tested at L3 and lost to a day-of-week median, so the chapter reads as a set-up for adoption and the
  result is non-adoption. Say so, forward-referenced. A review that predicts its own negative result is
  a review that is doing work.
- **No search protocol.** The guide asks for "a systematic review using a concept-centric structure".
  The concept-centric structure is delivered; the systematic part is not: no databases, no query
  strings, no inclusion or exclusion criteria, no count of screened against retained. That is a
  half-page appendix and it is free marks.
- **Verification log.** The chapter header asserts "Every empirical claim below was verified against
  the full paper texts in NotebookLM; see the accompanying verification log." That log is **NOT
  EVIDENCED** in anything supplied. If an examiner asks to see it and it does not exist as an artefact,
  that header is a liability. Either produce it as an appendix or delete the sentence. **Note:** the
  verification in Section 10 of this record found the chapter misstating CPTC's theorem, which is
  itself evidence that the claimed verification pass was not thorough.
- **Preprint density.** Ten or more of the load-bearing citations in the surfacing and evaluation
  sections are 2025 to 2026 preprints (Kumar, Staufer, Hu, Ding, Tang, Fu, Gulati, Trinh). The chapter
  flags this once, honestly. Flag it again in the synthesis, because the "unoccupied intersection"
  claim rests substantially on unrefereed work. **All ten were verified as real in Section 10.1.**

---

## 8. NOVELTY

### 8.0 Constraints

The candidate's constraint block arrived with placeholders unfilled. The following were used and
confirmed:

- **Deadline:** dissertation PDF, Friday 4 September 2026, 16:00 (Student Documentation, page 2). That
  is **7 weeks and 3 days** from 2026-07-14. Viva 2 to 3 weeks after; poster 11 September.
- **Compute:** Mac (CPU / MPS) **plus an Ubuntu host with an NVIDIA RTX A2000, 12GB VRAM**. Chronos-2
  is **120M parameters** and TabPFN-TS is **11M**. The A2000 has enormous headroom for both.
  **Compute is not a binding constraint for anything in Tiers 0 to 2.** The candidate's report-24
  finding that MPS is slower than CPU (3.2s against 0.6s) is now partly obsolete: CUDA on the A2000
  will beat both, and it matters once a 200-cell ablation grid is run rather than one forecast. This
  warrants a one-line decision-log update.
- **Data:** Square sales obtainable. Neon blocked on Ryan. Stock-to-menu mapping blocked on James. The
  735-message chat log already sits in `brain/data/`. **The Ellel booking diary and manager labels are
  obtainable by asking.** This is the hinge of everything below.

### 8.A The cost-calibrated silence policy, scored against the operator who pays for the false alarm

**The idea in one sentence.** Instantiate the missing agent as an explicit cost-sensitive
speak-or-stay-silent policy whose acceptance threshold is set by a miss-to-false-alarm cost ratio
**elicited from Elliot himself**, then evaluate that policy with ECE and Ask-F1 against real manager
adopt-or-dismiss judgements on real surfaced briefings.

**Novelty, as originally claimed:** that no one has operationalised Meyer's compliance-and-reliance
asymmetry as a threshold on a deployed alerting system using the cost ratio the operator states for
himself.

**Novelty, AS CORRECTED BY VERIFICATION (Section 10.4). This is Correction 3 and it matters.**

PRISM (Fu et al. 2026) **already does two of the three things claimed as novel**:
- It **uses an asymmetric miss-to-false-alarm cost ratio to set an adaptive decision threshold**. It
  sweeps the ratio over a grid, roughly 1:4 to 1.2:1.
- It is **the only one of nine proactive-agent papers that reports Expected Calibration Error**, plus
  Brier scores, on the agent's probability estimates of user need and user acceptance.

**The method is therefore not novel. PRISM is the method.**

What survives, and it is confirmed across all nine papers in the candidate's notebook (full table at
Section 10.4):
- **Not one of the nine** uses real humans making real accept-or-dismiss decisions in their own
  workplace as evaluation ground truth. All use annotated corpora, simulated users, or LLM judges.
- **Not one of the nine** elicits the cost ratio from the person who bears the cost.

**The surviving novelty is a field-deployment novelty, not a method novelty, and the candidate must
say so.** The honest claim:

> *PRISM's risk-sensitive, calibration-aware intervention policy, instantiated for the first time with
> a cost ratio elicited from the operator who bears the cost, and evaluated against that operator's own
> adopt-or-dismiss decisions on live signals from his own business, rather than against an annotated
> corpus, a simulated user, or an LLM judge.*

**This is good news operationally.** The method does not have to be invented. PRISM supplies it:
cost-sensitive threshold, ECE, Brier. Build cost falls from 12-18 hours to roughly 8-12. And PRISM
gives a free benchmark for judge validation: their LLM-judge ensemble (DeepSeek-R1, GPT-4o, Claude 3.5
Sonnet, majority vote) reported **89.1% agreement with human annotators**.

**Cost.** 8 to 12 hours. Compute negligible. New data: one 20-minute call with Elliot to elicit the
cost ratio, plus roughly 2 hours of his and/or Ryan's time labelling 60 to 100 surfaced items. The
labelling instrument (`eval/labels.py`: stratified sampler, pre-registered "worth surfacing"
definition, two-pass ordering to stop the labeller anchoring on the system's output) is **already
built and already tested and has never been run**.

**Risk if it fails.** The binding risk is human: Elliot does not label. Mitigate by sending the ask
today, not in August. Fallback ladder: (1) Elliot labels, best case, a real operator; (2) Ryan labels,
still an industry practitioner, still defensible, state the limitation; (3) the candidate labels with
a second pass after a gap, reports intra-rater kappa, and states plainly in the Discussion that he
labelled his own system's output. Even at rung 3 there is an agent, an ECE, and a non-degenerate Ask-F1
curve, which is three of Objective 4's four terms recovered. **The downside is bounded and the technical
work is useful regardless.**

**Marks upside.** This is the only idea that removes a **Fatal**. The missing agent is a *ceiling*, not
a deduction: no quantity of statistical polish reaches 70 while the object of the research question is
absent from the system. This moves **63 into the low 70s**, and it is the only route to 80+.

### 8.B Conformal coverage does not survive a structural break: publish the negative result already in hand

**The idea in one sentence, AS ORIGINALLY STATED:** promote the ACI closure probe from a report-only
appendix into a first-class finding, showing that neither split conformal nor adaptive conformal
maintains nominal coverage through a real venue closure, so structural state must be modelled *outside*
the conformal framework.

**CORRECTED BY VERIFICATION. This is Correction 1 and it is the most important correction in the
record.** The claim that the fix lives outside the conformal family is **wrong**. See Section 11.1.

**The idea, corrected:** run a **four-way** comparison, framed by two published theorems that predict
the result in advance:

| Policy | Prediction, and the theorem that makes it |
|---|---|
| Static split conformal | Baseline. Post-closure 0.529. |
| ACI, gamma swept | **Worse than static.** Zaffran et al. (2022) Theorem 3.1: on exchangeable scores, ACI degrades efficiency linearly in gamma compared to standard non-adaptive CP. A permanent structural zero offers nothing to adapt to, so ACI contributes only update noise. Measured: 0.412 to 0.471. |
| **AgACI** (parameter-free expert aggregation over K values of gamma) | The paper's own answer to "which gamma?", which the candidate swept manually, which Zaffran says you should not do. |
| **State-conditional conformal keyed on the observed liveness state** | **Recovers coverage.** This is CPTC (Sun & Yu 2025) with the state-misclassification rate epsilon = 0, because the closure date is known exactly rather than inferred. By CPTC Theorem 4.3, the miscoverage bound is epsilon times max delta, which is **zero**. |

**And the vacuity is computable.** ACI's only guarantee is the asymptotic bound
|miscoverage - alpha| <= 2 / (gamma * T). On the 28-day post-closure window (T = 17 evaluated points):

| gamma | bound on \|miscoverage - 0.10\| |
|---|---|
| 0.005 | **23.5** |
| 0.01 | **11.8** |
| 0.02 | **5.9** |

A miscoverage deviation cannot exceed 1 by definition. **Every one of these bounds is vacuous by an
order of magnitude.** The candidate can now state, with arithmetic rather than assertion, that the
guarantee the chapter leans on says literally nothing about the window a manager lives through.

**The methodological punchline, corrected:** *when the regime variable is directly observable rather
than inferred, state-conditional conformal recovers nominal coverage through a structural break where
the adaptive-quantile family cannot. The operational lesson is to spend effort observing the state
rather than inferring it.* This elevates the liveness gate from an engineering hack that saved GBP
5,329 of nonsense into a stated methodological position with two supporting theorems.

**Cost.** 6 to 10 hours, almost entirely writing plus one extra policy arm. The static and ACI arms are
done and committed (`eval/aci_closure_probe.py`, `eval/aci_closure_probe.md`, coverage plot included).
Compute nil. New data none.

**Risk if it fails.** Near zero. The numbers exist. The only attack is "n = 1 closure", which is true,
which the candidate says first, and which does not damage the argument because the claim is existential
(there exists a real structural break at which the adaptive guarantee is vacuous), not distributional.

**Marks upside.** Moves the weakest criterion in the submission. The 70-79 band explicitly demands "a
discussion of why the approach taken is better than alternatives that could have been used". Right now
there is a league table with no dispersion, which is not that discussion. This **is** that discussion,
backed by an experiment, on methods that were rejected. Worth **+4 to +6**, and it repairs the
conformal arc of the Related Work chapter.

### 8.C Is the covariate channel of a foundation forecaster real, or is it a weather-lead artefact?

**The idea in one sentence.** Run the lead-matched ablation already coded and never switched on
(`WEATHER_TRAIN_BASIS="leadmatched"`, lead 1 through 7, crossed with the covariate families: calendar,
fixtures, weather, all), with per-fold MASE and a proper selection procedure, to establish how much of
Chronos-2-exo's apparent margin is real exogenous signal and how much is the backtest being fed better
weather than serving will ever have.

**Novelty, and it is now much sharper after verification (Section 10.5).**

Hertel et al. (2026), a paper from KIT on covariate-informed TSFMs, benchmarks **Chronos-2 and
TabPFN-TS** and uses **ERA5 reanalysis weather as "perfect forecasts"**, stating explicitly that
reanalysis data is not available at prediction time and that their **"reported results represent an
upper bound on operational accuracy."**

**The candidate's code refuses to do this.** `models/foundation.py:306-313` raises
`MissingCovariateError` if `WEATHER_TRAIN_BASIS == "observed"`, on the stated grounds that the ERA5
basis "would leak into the backtest".

**The candidate is being more rigorous on this exact point than a 2026 paper from KIT.** That is a
checkable claim and it should be foregrounded at the viva. It reframes the weather handling from a
flaw into a strength that is merely incomplete: the candidate sits *above* Hertel's upper bound and
*below* a true ex-ante evaluation. **The lead-matched ablation would put the work ahead of the
published state of the art.** Idea C is therefore not a repair. It is a contribution.

**And the candidate's own null result is vindicated three times over. [STRENGTHENED, Section 10.8]**

1. **Hertel's SHAP importances:** past load **89%** (Chronos-2) and 87% (TabPFN-TS); holiday 4.51% /
   6.46%; temperature 3.55% / 3.79%; irradiance 2.74% / 2.70%. In a domain where weather is a primary
   demand driver, weather covariates carry about **6%** of total importance.
2. **Haben et al. (2019), at the low-voltage level, verified numbers:** ARWD scores MAPE **14.65 with no
   temperature**, 20.17 with forecast temperature and 20.03 with actual. *"the inclusion of temperature
   (either actual or forecast) has minimal effect ... In fact for ARWD, ARWDY and CKD-W,* **including the
   temperature is detrimental** *to the forecast accuracy."* Their conclusion: *"there is* **not a strong
   causal link between demand and temperature. Seasonality is a stronger driver**."
3. **Kaas et al. (2026):** removing weather covariates costs Chronos-2 about 1 kW of MAE (3.839 to
   4.813), but *"the univariate TSFMs are* **still relatively good** *... which demonstrates their
   robustness."*

The candidate's own probe found calendar covariates moving MASE from 0.793 to 0.779, three folds better
and three worse, mean delta minus 0.014. **That null result is consistent with the published evidence.
The report's conclusion "Outcome: covariates HELP" is not.** Rewrite it, and cite Haben.

**Kaas et al. also settles the model choice from the outside.** On 200 real low-voltage feeders,
**Chronos-2 beats Chronos-Bolt, TabPFN-TS, XGBoost+, TFT, PatchTST and a weekly naive on every point
metric** (MAE 3.839), has the best Winkler score (22.18), and has the empirical coverage closest to the
90% nominal (0.8975). That is independent external support for the served model, from a group the
candidate has never met, on a covariate-informed forecasting problem. **Use it.**

**Cost.** 8 to 12 hours. Compute: roughly 200 Chronos-2 inference calls at 0.6s on CPU, minutes on the
A2000. New data: one open-meteo previous-runs API pull, free, and `fetch_leadmatched` is already
written and unused.

**Risk if it fails.** Moderate but survivable, and "fails" has two meanings. If the exogenous margin
*survives* the honest weather basis, the served model is vindicated and a null result is reported,
which still earns the marks because the question was asked and answered. If it *collapses*, a different
Beer Hall model is served, which is a config change plus a re-run of the July confrontation, not a
rebuild, and the candidate reports that he caught his own optimistic backtest. **That second outcome is
worth more marks than the first, not fewer.**

**Marks upside.** Moves the 70-79 criterion "an appropriate substantial body of methodology beyond that
of the MSc modules". Repairs Finding 7 and pre-answers viva question 5. Worth **+3 to +5**.

**Bonus, and it is large.** Hertel et al.'s SHAP algorithm uses **temporal and covariate masking**,
exploiting the fact that TSFMs tolerate arbitrary context lengths and missing covariates, so it computes
exact Shapley values **with no background-data sampling**. It runs directly on Chronos-2 with the exo
columns the candidate already has. That gives the manager a principled per-day attribution ("Saturday
ran GBP 300 above forecast; the England fixture contributed +GBP 180") instead of a coincidence list.
**The candidate has been architecting an attribution layer from scratch. It is published, it is
efficient, and it is designed for the exact model he serves.**

### 8.1 Ranking, and the override

| | Marks | Risk | Hours | Ratio (marks / (risk x hours)) |
|---|---|---|---|---|
| **B** conformal collapse | +5 | 0.1 | 8 | **6.3** |
| **C** covariate and weather-lead ablation | +4 | 0.3 | 10 | **1.3** |
| **A** cost-calibrated silence policy | +8 | 0.5 | 15 (now 8-12) | **1.1** |

The raw ratio says B, then C, then A. **Do not follow it.**

A is bottom of the ratio and top of the priority list, because it is the only one that removes a
**ceiling**. Fixing Majors raises the mark within a band; the missing agent caps the band. Six marks of
Major-repair on top of a Fatal still leaves the work under 70. A ceiling is not commensurable with a
marginal.

A also has the longest lead time and the only external dependency. Therefore:

- **Today.** Send Elliot and Ryan the labelling ask, the Ellel booking-diary ask, and book the
  20-minute cost-elicitation call. That is a 15-minute email and it starts the clock on the only thing
  that cannot be compressed.
- **This week, while waiting.** Do **B**. Mostly writing, risk-free, and it repairs the Related Work
  chapter's conformal arc, which has to be touched anyway.
- **Next.** Build the agent and the ECE for **A**, useful whether or not a human ever labels anything.
- **If time remains after the labels come back.** Do **C**.

The three repairs in Section 4 and the three contributions here are not in competition. Fix 1 (the fold
count) and Fix 2 (the denominator) must happen before any of A, B or C, because every downstream number
depends on them.

### 8.2 Rejected ideas

Rejected because they would only make the project sound fancier without changing what it can conclude.

- **Add TimesFM, Moirai or MOMENT to the ladder.** Adds rows to a league table whose existing rows are
  already inside one standard error of each other.
- **Implement SPCI or conformal PID.** More conformal machinery on a dataset whose one real regime
  change already defeats the adaptive-quantile family. **Admissible only as an arm of idea B**, where
  it strengthens the result.
- **HiGP or graph-based reconciliation across the estate.** Three nodes is not a graph. **Confirmed by
  the paper itself** (Section 10.7): Cini et al. (2024) is built for hundreds of nodes (their datasets
  have 207, 325, 437 and 485), with intermediate layers of 20 to 100 supernodes, and the exact
  reconciliation step is "practical for up to a few thousand nodes". **Rejection stands, now evidenced.**
- **Fine-tune anything on ProactiveBench.** No compute, no time, and it answers a question about a
  benchmark rather than about this estate.
- **RAG over the SOP corpus with pgvector.** That is Ryan's Track B, it is a retrieval demo, and it
  produces no finding.

---

## 9. METHODOLOGY DEVIATION AND LITERATURE RECONCILIATION

The question: *given what is now known about the data and what actually happened, would you still
choose this method and cite this literature, or is the current approach a case of the method being
chosen for the brief rather than for the data?*

### 9.1 STEP 1: DIAGNOSIS

**Yes. There is hard evidence in the data itself that the L1 method and metric are a poor fit. Three
mismatches, all verified from source. One candidate mismatch dismissed.**

#### Mismatch 1: the L1 series are intermittent, and the entire L1 stack assumes continuous demand

Recomputed from the rebuilt store, on the calendar basis the L1 forecast and its MASE actually operate
on, using the candidate's **own** intermittency cutoff (ADI >= 1.32, from
`eval/intermittency_diagnostic.md`, Syntetos-Boylan-Croston with the Kostenko-Hyndman boundary):

| venue | trading days | calendar days | density | ADI | CV-squared | class |
|---|---|---|---|---|---|---|
| beer_hall | 270 | 362 | 74.6% | 1.35 | 0.57 | **lumpy** |
| ellel | 64 | 349 | **18.3%** | **5.63** | 0.98 | **lumpy** |
| two_river_taps | 280 | 331 | 84.6% | 1.18 | 0.61 | erratic |

Every L1 series clears or nearly clears the intermittency boundary. Ellel is not "sparse"; it is an
18%-density lumpy process.

Yet:

- **The intermittency diagnostic was only ever run at L3.** `eval/intermittency_diagnostic.md`
  classifies 30 Beer Hall *item* nodes and finds 20 intermittent (17 non-OTHER). `grep` confirms
  Croston and SBA are imported **only** in `hierarchy/reconcile.py:34`, gated on
  `intermittent_nodes(venue, top_k)`, which is an L3 function. **Croston has never been run at L1**,
  where all three served models live.
- **No occurrence model exists anywhere.** `grep -rni "hurdle|two-part|zero-inflat|occurrence"` over
  `brain/` returns nothing.
- **The candidate half-diagnosed this and stopped.** The Mondrian variant in `conformal/wrap.py`
  explicitly splits active days from structural-zero days so that closed-day residuals do not shrink
  the band. That is a zero-inflation correction applied **to the band** and never carried into **the
  point forecast** or **the metric**.

The consequences are visible in the candidate's own results and were misread as successes:

- **Ellel July: frozen GBP 56 against actual GBP 445, reported MASE 0.07, band coverage 1.00.** This is
  the flatline pathology. On highly intermittent series a flat or near-zero forecast is frequently
  "best" under scaled absolute-error measures. The model was rewarded for predicting almost nothing on
  a series that is almost always nothing.
- **The MASE denominator ambiguity (Finding 1) IS the zero-inflation.** Beer Hall's seasonal-naive
  scale is 291.2 calendar-filled and 610.4 trading-only. Ellel's is 181.3 and 780.6, a **4.31x** ratio.
  The two rulers differ by exactly the amount of structural zero you choose to count. That is not a
  coding slip in isolation; it is what happens when a scaled continuous-demand metric is applied to a
  lumpy process without deciding what a zero means.

#### Mismatch 2: the exogenous covariates are backtested ex-post and served ex-ante

- `config.py:233`: `WEATHER_TRAIN_BASIS = "hindcast"`, and the comment at line 231 asserts hindcast
  "matches serving". For a past date the historical-forecast API returns the most recent model run
  covering that date, that is, a short-lead, near-analysis forecast. At serving time, day 7 of the
  horizon carries a 7-day-lead forecast.
- `fetch_leadmatched` (previous-runs API) is **written and unused**, at `WEATHER_LEAD_DAYS = 3`, not 7.
  `WEATHER_FORECAST_MAX_DAYS = 16` covers the horizon.
- The margin at stake is the whole exogenous case. `eval/chronos2_covariate_probe.md` puts
  *calendar-only* covariates at 0.779 against 0.793 univariate, which is three folds better, three
  folds worse, mean delta minus 0.014. So **everything** between 0.779 and the served 0.745 is weather
  plus fixtures, and the weather half of it is scored on a basis serving will never have.
- The state log already records the exogenous edge reversing on June folds (robust-DOW 1.23 against
  Chronos-exo 1.37) and did not act on it.

This is the ex-ante versus ex-post confusion, a named and documented failure in short-term load
forecasting. Much of the literature develops models under ex-post settings, where actual weather is
used in the forecast period, aiming to measure the impact of a hypothetically ideal weather forecast;
in real-world use the ex-post setup is not realistic because actual values are not known a priori.

#### Mismatch 3: the method is called in a way that disables the capability the brief asked for

`models/foundation.py:318-325` builds `context_df` with **`id = "l1"`**. One series. One venue at a
time.

Chronos-2's architecture is a **group attention mechanism whose entire purpose is in-context learning
across a group of related series**. The target-plus-covariates channel is being used. **The cross-series
channel, which is the multi-venue transfer learning the brief calls "the interesting research", is
switched off by a single string literal.** It requires no training, no new model, and no new data.

And the Ellel case is worse than a modelling gap. `features/build_features.py:130-140` correctly
neutralises `is_ellel_event` to constant 0 on Ellel's own frame, because deriving it from Ellel's own
trading days was a self-leak. That fix was right. But it leaves Ellel's model with **zero information
about whether it will trade tomorrow**, on a series where 82% of days are zero. The venue *knows* its
bookings weeks in advance. The booking diary exists in the world and is not in the dataset. **That is a
data-acquisition gap, not a modelling gap**, and it is the highest-value input available.

#### What is NOT a mismatch, said plainly

- **The leakage architecture, the rolling-origin protocol, and split conformal are appropriate.**
  Distribution-free with no Gaussian assumption is the right call on skewed sales. The coverage collapse
  at the Two River Taps closure is a known limitation of the adaptive-quantile family, not evidence of a
  bad choice. (**And see Correction 1: the fix is state-conditional conformal, which is inside the
  family.**)
- **Chronos-2 as a zero-shot cold-start forecaster is well-motivated** for a 270-day series with new
  venues onboarding. Do not swap it.

**Verdict on Step 1: a deviation IS methodologically necessary, but the necessary deviations sit at
Tier 1 and Tier 2. The core method survives. What fails is the metric, the covariate basis, the calling
convention, and the missing occurrence model.**

### 9.2 STEP 2: LITERATURE GAP CHECK

Which citations justify the method under the *brief's* assumptions rather than the *actual* data, and
what replaces or supplements them. Every replacement was verified (authors, venue, year). Full verified
reference list at Appendix G.

| # | Citation currently doing the work | What it justifies, under the brief's assumptions | What the actual data shows | Replacement or addition |
|---|---|---|---|---|
| 1 | `ansari_chronos-2_2025`, cited **once**, inside a parenthetical pile of "probabilistic or industrial entrants" | Nothing. The served model has no argument in the chapter. | The served model's group-attention ICL is its defining feature and is unused. | **Ansari, A.F., Shchur, O., Küken, J., Auer, A., Han, B., Mercado, P., Rangapuram, S.S., Shen, H., Stella, L., Zhang, X., et al. (2025). "Chronos-2: From Univariate to Universal Forecasting." arXiv:2510.15821.** Promote to a full paragraph. It is also the citation that proves Mismatch 3. |
| 2 | `croston_forecasting_1972`, `syntetos_accuracy_2005` | Sparse demand is an **L3** concern. | **L1 is lumpy too** (ADI 1.35 / 5.63 / 1.18). | **Kostenko & Hyndman (2006)**, SBC boundary refinement. **Kolassa, S. (2023). "All Hail the Flatline Forecast!" Foresight 70, 62-63.** **Cragg, J.G. (1971). "Some Statistical Models for Limited Dependent Variables with Application to the Demand for Durable Goods." Econometrica 39(5), 829-844.** **Mullahy, J. (1986). "Specification and testing of some modified count data models." Journal of Econometrics 33(3), 341-365.** (The two-part / hurdle framing, which is what a closed pub actually is.) |
| 3 | **No citation at all governs the choice of MASE.** | Implicitly, that MASE is safe. | MASE on an 18%-density series returns 0.07 for a forecast that missed 87% of revenue. **And 72.8% of Ellel's seasonal-naive denominator terms are exactly zero.** | **Hewamalage, H., Ackermann, K. & Bergmeir, C. (2023). "Forecast evaluation for data scientists: common pitfalls and best practices." Data Mining and Knowledge Discovery 37(2), 788-832.** **Kolassa, S. (2020). "Why the 'best' point forecast depends on the error or accuracy measure." International Journal of Forecasting 36(1), 208-211.** **Koutsandreas, D., Spiliotis, E., Petropoulos, F. & Assimakopoulos, V. (2022). "On the selection of forecasting accuracy measures." Journal of the Operational Research Society 73(5), 937-954.** **Makridakis, S., Spiliotis, E. & Assimakopoulos, V. (2022). "The M5 competition." International Journal of Forecasting 38(4), 1325-1336** (RMSSE). |
| 4 | **No citation at all governs model selection.** The "beats both baselines" gate is uncited and untested. | Implicitly, that argmin of a 6-fold mean is a decision. | Gaps of 0.005 to 0.05 MASE against fold SDs of 0.20 to 0.52. ~~One selection flips on a library bump~~ **(withdrawn, S4 Part 5: the flip was an examiner artefact).** **No DM variant is computable at n=6, h=7. And Hansen et al. state that pairwise-p-value model comparison is not valid inference at any n.** | **Hansen, P.R., Lunde, A. & Nason, J.M. (2011). "The Model Confidence Set." Econometrica 79(2), 453-497.** Uninformative data yield a confidence set with many models; informative data yield one with few. **Harvey, D., Leybourne, S. & Newbold, P. (1997). "Testing the equality of prediction mean squared errors." International Journal of Forecasting 13(2), 281-291.** **Brigato, L., Morand, R., Strømmen, K.J., Panagiotou, M., Schmidt, M. & Mougiakakou, S. (2026). "There are no Champions in Supervised Long-Term Time Series Forecasting." Transactions on Machine Learning Research. arXiv:2502.14045.** |
| 5 | `tan_are_2024` | Be sceptical of LLM-backbone forecasters; prefer a ladder. | The risk is not the model, it is the evaluation. | **Bergmeir, C. (2024). "Fundamental limitations of foundational forecasting models: the need for multimodality and rigorous evaluation." Invited talk, NeurIPS 2024 Workshop on Time Series in the Age of Large Models** (a talk, not a paper: flag it as such). **Meyer, M., Kaltenpoth, S., Zalipski, K. & Müller, O. (2025). "Rethinking Evaluation in the Era of Time Series Foundation Models: (Un)known Information Leakage Challenges." arXiv:2510.13654** (preprint). |
| 6 | `gibbs_adaptive_2021`, `xu_sequential_2023`, `angelopoulos_conformal_2023`, **`sun_conformal_2025` (CPTC)** | "A band whose coverage is **guaranteed** even as the venue's regime shifts." | Post-closure coverage 0.53 static, **0.41 to 0.47 with ACI**. Adaptive conformal is *worse*. And **CPTC does not claim what the chapter says it claims** (Finding 16). | **Barber, R.F., Candès, E.J., Ramdas, A. & Tibshirani, R.J. (2023). "Conformal prediction beyond exchangeability." Annals of Statistics 51(2), 816-845.** Weighted quantiles introduce robustness against distribution drift and **bound the coverage loss** rather than promising recovery. **Zaffran, M. et al. (2022). "Adaptive Conformal Predictions for Time Series." ICML.** Theorem 3.1 predicts the candidate's ACI failure in advance. **Tibshirani, R.J., Barber, R.F., Candès, E.J. & Ramdas, A. (2019). "Conformal prediction under covariate shift." NeurIPS 32.** And **re-read Sun & Yu (2025) correctly**: it is the *right* framework, it just does not say what the chapter says. |
| 7 | **No citation at all governs the weather covariates.** | Implicitly, that hindcast weather is a legitimate backtest input. | It is an ex-post input scored against an ex-ante deployment. | **Haben, S., Giasemidis, G., Ziel, F. & Arora, S. (2019). "Short term load forecasting and the effect of temperature at the low voltage level." International Journal of Forecasting 35(4), 1469-1484.** **Hertel, M., Nikoltchovska, A., et al. (2026). "Explainable Load Forecasting with Covariate-Informed Time Series Foundation Models."** (Chronos-2 and TabPFN-TS, ERA5 as "perfect forecasts", explicitly an upper bound.) **Kaas, B., Treutlein, M., Gerber, H.B., Neumann, O., Phatthanakhuha, C., Resch, O., Mikut, R. & Hagenmeyer, V. (2026). "Probabilistic Low-Voltage Peak Load Forecasting with Time Series Foundation Models Evaluated on Application-Oriented Metrics." arXiv:2607.01966.** |
| 8 | `wickramasuriya_optimal_2019` (MinT) | Reconciliation improves coherence. | The candidate's A-versus-B measurement found MinT better at Beer Hall and Two River Taps, disaggregation better at Ellel. | **Athanasopoulos, G., Hyndman, R.J., Kourentzes, N. & Panagiotelis, A. (2024). "Forecast reconciliation: A review." International Journal of Forecasting 40(2), 430-456.** **Kolassa, S. (2023). "Do we want coherent hierarchical forecasts, or minimal MAPEs or MAEs? (We won't get both!)." International Journal of Forecasting 39(4), 1512-1517.** The second says in its title what the experiment found. |
| 9 | `das_decoder-only_2024`, `ansari_chronos_2024`, `woo_unified_2024`, `faw_-context_2025` | Foundation models solve cold start. | 270 days. Small-N is the regime, and none of the cited models is a small-N specialist. | **Hoo, S.B., Müller, S., Salinas, D. & Hutter, F. (2025). "The Tabular Foundation Model TabPFN Outperforms Specialized Time Series Forecasting Models Based on Simple Features." arXiv:2501.02945, NeurIPS 2024 Workshop.** 11M parameters, supports covariates, pretrained **solely on artificial data**, so no benchmark-contamination risk, and designed for small N. The Chronos-2 paper names TabPFN-TS as one of only two other covariate-capable baselines. It runs on the A2000 in seconds. **And fix the cite key: the ICF paper is Das, Faw, Sen & Zhou (2024).** |
| 10 | Nothing in the chapter addresses short-series meta-learning. | | 270 / 64 / 280 trading days. | **Norton et al. (2025). "Tailored Forecasting from Short Time Series via Meta-learning" (METAFORS).** **Already in the candidate's notebook and unused.** See Section 10.7. |

### 9.3 STEP 3: DEVIATION PATHWAY

| Tier | Change | What triggers this being necessary | New citation(s) supporting it | Engineering effort | Compute cost | Retrain / re-eval? | Risk to timeline if it fails | Marks impact and band moved |
|---|---|---|---|---|---|---|---|---|
| **0** | **No architecture change.** Reframe the existing choices with the correct literature. Defend split conformal via Barber et al. (bounds the loss). **Correct the CPTC sentence, which misstates its own source.** **Rewrite the synthesis paragraph to position against PRISM by name.** Defend the ladder gate as a **floor**, not a discriminator, and report a **Model Confidence Set**. Promote Chronos-2 to a proper paragraph. Rewrite the Croston passage to forward-reference its own non-adoption. Add the ex-ante versus ex-post distinction as a stated limitation. Add METAFORS. Fix the Das/Faw cite key. | **Always necessary.** Every mismatch is at minimum a *literature* problem, and the chapter currently misstates a theorem and claims an occupied intersection. | Hansen/Lunde/Nason 2011; Harvey et al. 1997; Barber et al. 2023; Zaffran et al. 2022; Sun & Yu 2025 (read correctly); Hewamalage et al. 2023; Kolassa 2020, 2023a, 2023b; Ansari et al. 2025; Bergmeir 2024; Meyer et al. 2025; Fu et al. 2026; Norton et al. 2025 | **8 to 12 h** (writing, plus a 30-line MCS script) | **Nil** | **No** | **Low.** Nothing can break. | **+4 to +6.** Moves 60-69 to 70-79 on "why the approach taken is better than alternatives", the criterion currently failed outright. |
| **1** | **Preprocessing and evaluation basis, same method family.** (a) **Change `n_folds` from 6 to about 34**, which is the *only* way to get a computable test. (b) Fix the MASE denominator: one scale function, calendar-filled, truncated at the freeze origin. (c) Report **RMSSE and trading-day-conditional MASE alongside**, and state that a flatline scores well on scaled absolute error. (d) Flip `WEATHER_TRAIN_BASIS="leadmatched"`, `WEATHER_LEAD_DAYS=7`, rebuild features, re-run the ladder. (e) **Get the Ellel booking diary from Elliot** and add it as a known-future occurrence covariate. (f) Add an explicit occurrence gate: `yhat = P(trade) x E[revenue | trade]`, where `P(trade)` is the known calendar for Beer Hall and the diary for Ellel. | **Mismatches 1 and 2, both evidenced.** Ellel MASE 0.07 on a forecast that missed 87% of revenue. Weather scored ex-post, served ex-ante. n=6 folds makes any significance test degenerate. All three currently inflate the headline. | Kolassa 2023a (flatline); Hewamalage et al. 2023; Makridakis et al. 2022 (RMSSE); Cragg 1971 / Mullahy 1986 (two-part); Haben et al. 2019 (ex-ante/ex-post); Hertel et al. 2026; Kaas et al. 2026; Hansen et al. 2011; Harvey et al. 1997 | **16 to 22 h**. (e) is one email plus a CSV. | **Trivial.** Roughly 1,000 Chronos-2 fits for the 34-fold ladder, minutes on the A2000. | **Partial.** Ladder re-run, July confront re-scored. Frozen artefacts stay untouched: they are re-*scored*, not re-*built*, so the pre-registration chain survives. | **Low to Medium.** Worst case: the exogenous margin collapses and Beer Hall re-serves ETS or Chronos-2 univariate. That is a config change plus a re-run, and it is a **reportable finding**, not a failure. The booking diary might not arrive; if not, (a) to (d) still stand alone. | **+8 to +11** (upgraded from +6 to +9 after verification). Moves 60-69 to 70-79. Removes Findings 1, 3, 4, 7, 9, 13, 15. **And it carries a domain contribution**: the hospitality forecasting literature does not model the occurrence process at all (Section 10.7). |
| **2** | **Swap the calling convention, same complexity class.** (a) **Pass all three venues as one group to Chronos-2** (`id_column` with three ids, or the full-cross-learning mode), enabling the group-attention cross-series ICL that the model exists to do. Measure against the current per-venue univariate, LOVO-style, and against the existing donor-DOW-shape transfer heuristic. (b) Optionally add **TabPFN-TS** as a small-N, covariate-capable, contamination-free comparator. (c) Optionally implement **Hertel's SHAP with covariate masking** as the attribution layer. | **Mismatch 3, evidenced by code.** `id = "l1"` in `foundation.py:319`. The brief's headline research interest is natively supported by the served model and disabled by one string. | Ansari et al. 2025 (group attention, ICL, covariates subset gains); Hoo et al. 2025 (TabPFN-TS); Kaas et al. 2026; Hertel et al. 2026 (SHAP for covariate-informed TSFMs); Norton et al. 2025 (METAFORS, the meta-learning sibling) | **12 to 18 h** for (a). **+8 h** for (b). **+8 h** for (c). | **Trivial.** Both models fit the A2000 with room to spare (120M and 11M parameters). | **Yes**, a new ladder rung and a new gate row. Existing rungs untouched. | **Medium.** If group-ICL loses, a negative result on multi-venue transfer is reported **using the model's own mechanism**, which is a stronger and more publishable finding than the current DOW-shape heuristic result. **The dissertation cannot be lost here.** The real risk is the hours. | **+6 to +10.** Moves 60-69 to 70-79, and is the credible route to 80+. This is the only change that lets the candidate truthfully write "multi-venue transfer" in the contribution claim. |
| **3** | **Architecture change with new baselines and ablations.** A full two-part hurdle: a logistic occurrence model P(trade > 0) with its own covariates and calibration, times a zero-truncated conditional-revenue model, with a joint proper scoring rule (CRPS or pinball) replacing MASE, plus new baselines (Croston, SBA, TSB) run **at L1**, and a new coherence story for the hierarchy. | **Would be triggered if** the occurrence process were a stochastic process. **It is not.** Beer Hall's closed days are a known weekly calendar. Ellel's are a booking diary the venue holds. The hurdle is nearly deterministic once the diary is requested. | Cragg 1971; Mullahy 1986; Kolassa 2020; Makridakis et al. 2022 | **50 to 80 h** | Low, but irrelevant | **Yes, entirely.** New baselines, new ablations, new metric, new frozen artefacts. | **High.** Destabilises every frozen artefact and the entire pre-registration chain, which is the candidate's single strongest asset. Seven weeks is not enough to rebuild the evaluation from scratch and write 20,000 words. | **+2 to +4 at best, and negative if unfinished.** A Tier-1 known-future covariate achieves most of what this achieves, for a fifth of the cost. |
| **4** | **Full re-architecture / new data pipeline.** Neon system-of-record, live ingest, hierarchical Bayesian estate model, LLM agent, live manager A/B. | **Would be triggered by** Neon provisioning landing and a decision to abandon the CSV-to-DuckDB path. | n/a | **150 h+**, and it is **blocked on Ryan and James**, neither of whom the candidate controls | Moderate | Yes, everything | **Fatal to the submission.** A half-built pipeline and no dissertation. | **Negative. Reject.** |

### 9.4 STEP 4: RECOMMENDATION

**Recommended: Tier 1, executed in full, plus the single Tier-2 item that is a calling-convention
change (multi-venue group ICL).**

Tier 0 is not a choice; it is homework, and it must happen regardless.

**Why Tier 1 plus Tier-2(a), and not more.** The evidence in Step 1 justifies exactly this and no
further. Mismatches 1 and 2 are metric-and-basis failures, which Tier 1 fixes without touching a single
model. Mismatch 3 is a **calling-convention** failure, not an architectural one: Chronos-2 already
implements the multi-venue pooling the brief demanded. Changing `id = "l1"` to real venue ids and
passing three series is not a new architecture. It is using the architecture already deployed.

The A2000 makes this cheap in a way it would not have been on CPU alone. A 120M-parameter encoder and
an 11M tabular model, across a grid of four covariate families by three weather bases by 34 folds by
three venues plus group-ICL variants, is **minutes** of GPU. Compute has stopped being the constraint.
The constraints are now purely the 7 weeks and 3 days, and the two humans (Elliot for the booking diary
and the labels; Ryan for Neon) whom the candidate does not control.

**The single highest-return action in this entire record is an email.** Ask Elliot for the Ellel forward
booking diary. It converts an 18%-density lumpy series with no occurrence signal into a nearly
deterministic hurdle, and it costs him five minutes.

**Explicitly rejected, even though it is tempting: Tier 3.**

Tier 3 is the intellectually correct answer to Mismatch 1. A hurdle model *is* what a pub with closing
days is. It would read beautifully in a Methods chapter. **Reject it anyway, for four reasons:**

1. **The occurrence process is knowable, not stochastic.** Beer Hall's zeros are a fixed weekly
   calendar. Ellel's are a booking diary. Tier 3 would spend 60 hours *estimating* a quantity that a
   Tier-1 covariate already *knows*.
2. **It destroys the best asset.** The pre-registration chain (frozen commits, Origin B airtight by
   calendar) is the single most defensible thing in this project. Tier 3 requires new frozen artefacts,
   which means re-running the pre-registration, which means one cycle instead of three and no time to
   confront it.
3. **New baselines and ablations, in week five of seven, with 20,000 words unwritten.** No.
4. **The marks are not there.** It moves within the same band Tier 1 already reaches, at five times the
   cost and with a real chance of arriving unfinished, which is worse than not starting.

**Reject Tier 4 without discussion.**

---

## 10. INDEPENDENT SOURCE VERIFICATION

Every citation flagged as unverified was checked against the candidate's own NotebookLM library
(notebook `d565d5f0-9ad6-446f-9573-2316a2f8c0ca`, "Dissertation"). The notebook held **79 sources** at
first inspection and **82** after the candidate added the three missing papers. **Nothing remains
unverified.**

### 10.1 Existence check: every flagged citation, resolved

| Item | Status | Source |
|---|---|---|
| `sun_conformal_2025` (CPTC) | ✅ **Real, and stronger than assumed: NeurIPS 2025**, peer-reviewed, not a preprint | Sun & Yu (2025), *Conformal Prediction for Time-series Forecasting with Change Points* |
| `kumar_agentic_2026` | ✅ Real | Kumar et al. (2026), *Agentic AI as a new frontier in information systems* |
| `staufer_2025_2026` | ✅ Real | Staufer et al. (2026), *The 2025 AI Agent Index* |
| `hu_memory_2026` | ✅ Real | Hu et al. (2026), *Memory in the Age of AI Agents* |
| `ding_proactor_2026` | ✅ Real | Ding et al. (2026), *ProActor* |
| `tang_proagentbench_2026` | ✅ Real | Tang et al. (2026), *ProAgentBench* |
| `fu_prism_2026` | ✅ Real | Fu et al. (2026), *PRISM: Festina Lente Proactivity* |
| `gulati_ask_2026` | ✅ Real | Gulati et al. (2026), *Ask Early, Ask Late, Ask Right* |
| `trinh_hil-bench_2026` | ✅ Real | Trinh et al. (2026), *HiL-Bench* |
| `liu_moirai_2026` | ✅ Real | Liu et al. (2026), *Moirai 2.0* |
| `zhou_context-driven_2025` | ✅ Real | Zhou et al. (2025), *Context-driven cold-start Web traffic forecasting* |
| **`faw_-context_2025`** | ⚠️ **Real paper, wrong cite key.** Paper is **Das, Faw, Sen & Zhou (2024)**, dated 1 November 2024, **authors listed in alphabetical order**. "Faw et al. (2025)" is wrong on first author **and** year. Should be **Das et al. (2024)**. | *In-Context Fine-Tuning for Time-Series Foundation Models* |
| **Zaffran et al. (2022), AgACI** | ✅ Real, ICML. **And it explains the candidate's ACI result theoretically.** | *Adaptive Conformal Predictions for Time Series* |
| **Harvey, Leybourne & Newbold (1997)** | ✅ Real, IJF 13, 281-291. **And it ends the model-selection argument.** | *Testing the equality of prediction mean squared errors* |
| **Hertel et al. (2026)** | ✅ Real. Hertel, Nikoltchovska et al. (equal contribution), KIT. **And it is a gift.** | *Explainable Load Forecasting with Covariate-Informed Time Series Foundation Models* |

**Note on the candidate's reading gaps.** None of the recommended additions (Hansen/Lunde/Nason,
Hewamalage/Bergmeir, Kolassa, Barber et al. 2023, Haben et al., Cragg, Mullahy, Kostenko & Hyndman,
Athanasopoulos et al. 2024, TabPFN-TS, Meyer et al., Brigato et al., Makridakis et al. 2022) was in the
notebook. The gaps identified in Section 9.2 are genuine gaps in the candidate's reading, not oversights
in the assessment.

### 10.2 Sun & Yu (2025), CPTC: what it actually proves

Verified against the PDF. **This is the source the Related Work chapter misstates (Finding 16).**

| Guarantee | Exact condition |
|---|---|
| **Proposition 4.1: exact finite-sample coverage** | **Only under exchangeability.** A change point violates exchangeability by definition. |
| **Theorem 4.2: asymptotic validity** | The **time-averaged** miscoverage converges to alpha as T tends to infinity. Requires **Assumption 1: a stationary distribution of states** (both the true states and the predicted states have stationary distributions). |
| **Theorem 4.3: robustness to imperfect state prediction** | Miscoverage bounded by **epsilon times max delta**, where **epsilon = P(predicted state != true state)** is the state misclassification rate. |
| **Theorem 4.4: behaviour at a change point** | **Faster convergence than ACI**, at a stated ratio. The paper explicitly says this permits **"shorter miscoverage periods"**. It concedes a transient miscoverage window. |

**CPTC never claims valid coverage at or immediately after a change point.** The word "guaranteed" in
the chapter is a citation-fidelity error, and it sits on the chapter's most load-bearing sentence.

**And the paper's own experiments replicate the candidate's finding.** On the hourly Electricity
demand dataset, CPTC reaches coverage 91.22 (SD 1.29) against a 90% nominal, while ACI over-covers at
night and under-covers at change points.

**The constructive consequence, which is Correction 1.** CPTC is **state-conditional conformal**: it
maintains a separate miscoverage target alpha_z for each predicted state z. The candidate's **liveness
gate plus Mondrian band is a two-state CPTC** (state = {live, dormant}) **with a perfectly observed
state**. Sun and Yu must *infer* the regime with a switching dynamical model. The candidate **knows the
Two River Taps closure date exactly**, so his **epsilon is zero**. By CPTC's own Theorem 4.3, his
miscoverage bound from state error is therefore **zero**, which is precisely why the liveness gate works
and ACI does not.

### 10.3 Ansari et al. (2025), Chronos-2: the mechanism the code disables

Verified against the PDF in the candidate's own notebook.

**Group attention.** A group attention layer alternates with standard time attention layers in the
transformer stack. Time attention aggregates across patches within a single series; **group attention
aggregates across all series within a group at each patch index**. Group IDs (a vector of length B for a
batch of size B) are mapped to a two-dimensional attention mask so that aggregation occurs only within
groups. Positional embeddings are omitted in the group layer, because series within a group have no
natural ordering.

**A group may be, verbatim from the paper:**
- a single time series (univariate, independent prediction);
- **"a set of time series with shared source or metadata: this grouping enables the model to perform
  cross learning across items by making joint predictions for related time series (also referred to as
  few-shot learning) instead of generating univariate forecasts by solely taking the histories of
  individual time series into account. Sharing information between related time series could be
  especially helpful when all or some (cold start scenario) time series have short histories and when
  the characteristics of the downstream dataset differ considerably from the training data
  distribution."**
- a set of variates with shared dynamics (multivariate);
- a set of targets plus past-only and known covariates.

There is also a **"full cross learning mode"** in which every item in the batch is assigned the same
group ID regardless of whether it is a target or a covariate, so the model shares information across all
items and makes joint predictions for the entire batch.

**Measured ICL gains on fev-bench, covariates subset:**

| Metric | Univariate mode | With ICL |
|---|---|---|
| Probabilistic skill score (SQL) | 40.0% | **47.0%** |
| Point-forecast skill score (MASE) | 29.1% | **37.9%** |

**"In the univariate mode, each time series in the batch is forecast independently, and covariates, if
present, are ignored."**

Besides Chronos-2, **only TabPFN-TS and COSMIC support covariates**, and Chronos-2 outperforms both by a
wide margin on the covariates subset. Chronos-2 is a **120M-parameter, encoder-only** model producing 21
quantiles including the 0.01 and 0.99 extremes.

**The candidate's code (`models/foundation.py:318-325`) passes `id = "l1"`. The group has size one. The
cross-series channel is off.** That paragraph in the paper was written for a three-venue estate with
short histories in a domain far from the pretraining distribution.

### 10.4 The nine proactive-agent papers: what the novelty claim actually rests on

Verified against all nine PDFs in the candidate's notebook. **This corrects the novelty claim of idea A
(Correction 3).**

| Paper | Ground truth for "should it have spoken?" | Elicits a cost ratio from the real user? | Reports a calibration metric (ECE)? |
|---|---|---|---|
| **PRISM (Fu et al. 2026)** | **LLM-judge ensemble** (DeepSeek-R1, GPT-4o, Claude 3.5 Sonnet, majority vote) on the offline ProactiveBench dataset. Validated at **89.1% agreement with human annotators**. | **No.** It *uses* an asymmetric miss/false-alarm cost ratio to set an adaptive threshold, but **sweeps it over a grid** (roughly 1:4 to 1.2:1). It does not elicit it from users. | **Yes. The only one of the nine.** Reports **ECE and Brier scores** on the agent's probability estimates of user need and user acceptance. |
| HiL-Bench (Trinh et al. 2026) | Simulated user: an `ask_human()` tool backed by a frozen Llama-3.3-70B-Instruct, checked against an offline registry of human-validated blockers. | No. Penalises over-asking via Ask-F1 (harmonic mean of question precision and blocker recall). | No. |
| ProAgentBench (Tang et al. 2026) | Annotated corpus: over 500 hours of offline logs of real human computer usage, auto-annotated with a vision-language model plus rules. | No. | No. |
| Proactive Agent (Lu et al. 2024) | LLM judge: a fine-tuned reward model trained on human annotations. | No. | No. |
| ProactiveEval (Liu et al. 2025) | LLM-as-judge, reference-based, scoring 1 to 10 against offline reference targets. | No. | No. |
| CaRT (Liu et al. 2025) | Annotated corpus: optimal termination point labelled offline against an oracle diagnostic model (medical) or empirical success (math). | No. | No. |
| Gulati et al. (2026) | Annotated corpus / simulated user: ground-truth removed segments injected, or a simulated user returning the missing text. | No. | No. |
| ContextAgent (Yang et al. 2025) | Annotated corpus: human annotators assign ground-truth "proactive scores" 1 to 5 and target tool chains. | No. The intervention threshold is described as a "user-adjustable parameter" but is never elicited. | No. (Reports RMSE against the 1-to-5 score, not a probabilistic calibration metric.) |
| FingerTip 20K (Yang et al. 2025) | Annotated corpus plus LLM judge: 20,000 offline human demonstrations from real mobile usage; text similarity against recorded intent plus an LLM judge. | No. | No. |

**Two facts, both decisive:**

1. **Not one of the nine** deploys its agent so that **real humans make real accept-or-dismiss decisions
   in their own workplace** as the evaluation ground truth. All use annotated corpora, simulated users,
   or LLM judges.
2. **Not one of the nine** elicits the miss-to-false-alarm cost ratio **from the person who bears the
   cost**.

**Consequence.** The *method* (cost-sensitive threshold plus ECE) is **not novel**: PRISM is the method.
The surviving novelty is a **field-deployment** novelty: the elicited operator cost ratio and the real
workplace adopt-or-dismiss ground truth. That is genuine, defensible, and *cheaper to build*, because
PRISM supplies the method.

### 10.5 Hertel et al. (2026): a credit the candidate did not know he had, and a gift

Verified against the PDF.

**Setup.** Two TSFMs: **Chronos-2 and TabPFN-TS**. Data: electrical load of the German TSO TransnetBW
from the ENTSO-E Transparency Platform, January 2015 to September 2025, hourly. Covariates: **outside
temperature, solar irradiance, and a holiday indicator** (Sundays and public holidays grouped).

**THE CREDIT.** Weather is taken from the **ERA5 reanalysis model**, that is, **observed / historically
reconstructed** weather. The authors state plainly:

> *"In practice, the reanalysis data is not available at prediction time, but it is a common approach to
> use weather data as perfect forecasts in the absence of historical weather forecasts."*
>
> *"Note that all models benefit from ERA5 reanalysis weather inputs, which represent historically
> reconstructed rather than forecasted conditions, so reported results represent an upper bound on
> operational accuracy."*

**The candidate's code refuses to do this.** `models/foundation.py:306-313` raises
`MissingCovariateError` if `WEATHER_TRAIN_BASIS == "observed"`, with the comment that the ERA5 upper
bound "would leak into the backtest".

**The candidate is more rigorous on this exact point than a 2026 KIT paper.** This is checkable, it is
true, and it should be said at the viva. It reframes the weather handling from a flaw into a strength
that is merely incomplete: the candidate is *above* Hertel's upper bound and *below* a true ex-ante
evaluation. **The lead-matched ablation would put the work ahead of published practice.**

**Covariate ablation.** Adding covariates improves MAE by **27.0% for Chronos-2** and **31.5% for
TabPFN-TS**. Chronos-2 achieves slightly lower errors than TabPFN-TS across all metrics in the
covariate-informed setting. Both TSFMs beat a Transformer trained on one year of data (TabPFN-TS by
23.5% MAE, Chronos-2 by 26.8%); a Transformer trained on the full data beats the TSFMs, but only by a
small margin.

**SHAP feature importance (percentage of absolute SHAP values over the test set):**

| Feature group | Chronos-2 | TabPFN-TS |
|---|---|---|
| Past load, long-term (weeks <= -5) | 23.64% | 29.15% |
| Past load, intermediate (weeks -4 to -2) | 23.39% | 18.67% |
| Past load, short-term (days -7 to -2) | 19.88% | 18.63% |
| Past load, last day (day -1) | 22.30% | 20.60% |
| **Past load, total** | **89%** | **87%** |
| Holiday | 4.51% | 6.46% |
| Temperature | 3.55% | 3.79% |
| Irradiance | 2.74% | 2.70% |

**The warning, and it vindicates the candidate's own null result.** In a domain where weather is a primary
demand driver, weather covariates carry about **6% of total SHAP importance**. The candidate's own probe
found calendar covariates moving MASE from 0.793 to 0.779, three folds better and three worse, mean
delta minus 0.014. **The candidate's null result is consistent with the published evidence. His report's
conclusion "Outcome: covariates HELP" is not.**

**THE GIFT.** The SHAP algorithm uses **temporal and covariate masking**, exploiting the fact that TSFMs
are flexible in context length and tolerate missing covariates, which allows evaluation on subsets of the
data **without sampling absent features from a background dataset**. It computes exact Shapley values
efficiently and it runs directly on Chronos-2 with the exogenous columns the candidate already has.
**The candidate has been architecting an attribution layer from scratch. It is published, it is
efficient, and it is designed for the exact model he serves.**

### 10.6 Zaffran et al. (2022): the theory that predicts the candidate's ACI failure

Verified against the PDF.

**What AgACI is.** Online Expert Aggregation on ACI: a **parameter-free** method that runs K ACI experts
concurrently with different step sizes gamma and aggregates them with an optimal weighted mean (pinball
loss), one aggregation per interval bound. It exists because ACI's performance is **highly sensitive to
gamma**, and picking the wrong gamma causes either severe undercoverage or uninformative, infinite
intervals. Computationally it is nearly free, because the fitted model and calibration set are shared
across the experts.

**The gamma trade-off.** Larger gamma adapts faster and improves coverage when temporal dependency is
high, but produces a **higher frequency of infinite intervals**. Smaller gamma keeps intervals tight but
causes severe undercoverage under shift. The optimal gamma is **non-monotonic** in the strength of the
temporal dependency.

**No guarantee during an abrupt break.** ACI's validity is **asymptotic only**, and the paper states the
bound explicitly:

**(1/T) sum 1{y not in C} - alpha <= 2 / (gamma * T)**

**Theorem 3.1, and this is the decisive one.** On exchangeable scores with a perfectly estimated quantile
function, **ACI degrades efficiency linearly in gamma compared to standard, non-adaptive conformal
prediction.** In the authors' words, such adaptive algorithms **may actually hinder performance if the
data does not have any temporal dependency**, and a small gamma is preferable.

**This predicts the candidate's result in advance.** His ACI runs (post-closure coverage 0.471, 0.412,
0.471 at gamma 0.005, 0.01, 0.02) are all **worse** than static split conformal (0.529). A permanent
structural zero offers ACI nothing to adapt *to*, so all it contributes is update noise. The candidate's
probe is not an anomaly. It is a confirmation.

**And the vacuity is computable on the candidate's own window.** Post-closure T = 17 evaluated points:

| gamma | 2 / (gamma * T) | Interpretation |
|---|---|---|
| 0.005 | **23.5** | Vacuous. A miscoverage deviation cannot exceed 1. |
| 0.01 | **11.8** | Vacuous. |
| 0.02 | **5.9** | Vacuous. |

The guarantee the Related Work chapter leans on says **literally nothing** about the 28 days a manager
lives through. This can now be stated with arithmetic rather than assertion.

### 10.7 Three further verifications

**(a) The hospitality forecasting literature does not model the occurrence process at all.** This raises
the value of Tier 1 from a bug fix to a domain contribution.

| Paper | Closed days / structural zeros? | Accuracy metric |
|---|---|---|
| **Chae et al. (2024)** | **Ignores the issue entirely.** MAPE is mathematically undefined when actual sales are zero, and the authors never discuss how zeros or closures are handled. | MAPE |
| **Hossain & Parvin (2025)** | **Croston at product level only** (Rice, Soup). Venue-level closures and zero-inflation **ignored**: they state their 15-month dataset had "no missing values" and therefore "no data preprocessing was necessary". | RMSE and MAPE |
| **Schmidt et al. (2022)** | **The only one that engages.** Handles 63 days of closure by **listwise deletion in exact multiples of 7 days** (deliberately expanding a 58-day gap to 63 and a 5-day gap to 7) so that weekly seasonality survives. Uses sMAPE because plain MAPE is undefined at the three zero-sale instances, and computes gMAE by **adding a small amount of noise whenever the calculated error is exactly 0**. | MAE, sMAPE, gMAE |

**Schmidt's solution to a closed venue is to delete the weeks. Nobody in the candidate's domain
literature models the occurrence process.** Fixing this properly is an open contribution that costs a
weekend and an email.

**(b) Norton et al. (2025), METAFORS: a paper the candidate owns and does not use.** Meta-learning for
Tailored Forecasting using Related Time Series. It solves forecasting when the series from the system of
interest is **too short to train a standalone ML model**, and specifically the cold-start problem for
memory-based models. Two-level learning: first, train separate forecasters (reservoir computers) on
longer, **related** series and record both their parameters and their "cold-start" memory vectors; then
train a **signal mapper** that maps a short cue signal from a new system directly to tailored model
parameters plus a cold-start vector. It works from test signals of **5 iterations, 2 iterations, and in
the fully-observed case just one data point**. This is the meta-learning sibling of Chronos-2's
cross-learning, it is the correct intellectual framing for the cold-start and multi-venue transfer
chapter, and it is sitting unused in the candidate's notebook.

**(c) Cini et al. (2024), HiGP: the rejection of graph-based hierarchical forecasting is confirmed by
the paper itself.** The method is designed for and evaluated on **medium-sized sensor networks (hundreds
of nodes)**: Metr-LA 207 nodes, PeMS-Bay 325, AQI 437, CER-E 485. The hierarchical pooling architectures
compress these into intermediate layers of **20, 50 or 100 supernodes**, implying the starting count must
be meaningfully larger than the cluster sizes. The exact reconciliation step requires a matrix inversion
"practical for up to a few thousand nodes". The authors themselves note that "the number of time series
usually considered in graph-based forecasting is higher than those considered in standard hierarchical
forecasting benchmarks". **Three venues is not a graph. The rejection stands, now evidenced.**

### 10.8 Final verification round: the twenty-one added sources

The candidate added the full expansion set. The notebook now holds **103 sources**. Every
recommendation in Sections 4, 8 and 9 was re-verified against the actual PDFs. **Six items changed.**

#### (a) Hansen, Lunde and Nason (2011), the Model Confidence Set: verified, and it disciplines the recommendation

| Item | What the paper actually says |
|---|---|
| Test statistics | **T_max,M = max_i t_i-dot** and the range statistic **T_R,M = max_{i,j in M} \|t_ij\|**. (The semi-quadratic T_SQ that appears in later software packages is **not in the paper**; an earlier version had T_D and T_Q.) |
| Elimination rules | **e_max,M = argmax_i t_i-dot**, which *"removes the model that contributes most to the test statistic ... the largest standardized excess loss relative to the average"*. And **e_R,M = argmax_i sup_j t_ij**. |
| Bootstrap | **Moving-block bootstrap**, block length **l = 2**, **B = 1,000** resamples in their simulations. |
| Smallest n studied | **n = 50** (Simulation Experiment II). The main loss simulation runs at **n = 250**, which they say *"approximates sample sizes often available for model selection exercises in macroeconomics."* |
| Behaviour on weak data | *"uninformative data yield a MCS with many models, whereas informative data yield a MCS with only a few models."* And: *"Less informative data make it difficult to distinguish between models and may result in a MCS that contains several (or possibly all) models."* And, decisively: *"The lack of power causes the procedure to terminate too early (on average), and the MCS will contain a large number of models, including several inferior models.* **We view this as a strength of the MCS procedure.**" |
| Why it beats the alternative | *"the MCS procedure makes it possible to make statements about significance that are valid in the traditional sense, a property that is* **not satisfied by the commonly used approach of reporting p-values from multiple pairwise comparisons**." |
| alpha in their applications | **0.10 and 0.25** (they report M-hat*_90% and M-hat*_75%). |

**Consequence.** At n = 6 the MCS bootstrap is not credible either, so the MCS is **a consequence of
raising the fold count, not an alternative to it**. The fix order in Section 4 holds. And the last
quote above is the authority that kills the candidate's league table of means outright: it is not
merely underpowered, it is **not a valid inferential procedure**.

#### (b) The rolling-origin step: the code caps the fold count and does not have to

`eval/harness.py:76-99` steps the origin by `horizon_days`, so test windows never overlap.

| origins | how | HLN factor at h = 7 | verdict |
|---|---|---|---|
| 6 | current config | **0.0000** | Degenerate. No test exists. |
| 34 | `n_folds=34`, step 7 | 0.8087 | Computable. Below Hansen et al.'s smallest simulated n (50). |
| **236** | add `step_days=1` | **0.9725** | **Valid.** Inside their main simulation range (n = 250). |

The overlapping windows induce serial correlation in the loss differentials, which is precisely what
the moving-block bootstrap is for. Use a block length of at least the horizon (l >= 7).

#### (c) Hewamalage, Ackermann and Bergmeir (2023): this rewrites Finding 1

| Claim | Verified text |
|---|---|
| MASE denominator | **1/(T-1) sum_{t=2}^{T} \|y_t - y_{t-1}\|**, and Table 9 classifies MASE's scaling as **"In-Sample, Per Series"**. |
| MASE optimises the median | *"measures with absolute value base errors such as MAE and Mean Absolute Scaled Error (MASE) optimize for the median."* |
| **The flatline pathology** | *"On intermittent series, measures that optimize for the median are problematic since they* **consider constant zeros as the best prediction**." |
| **The denominator pathology** | *"With measures that scale based on benchmark errors on intermittent series, it can be problematic when* **benchmark errors have perfect predictions (zero errors), for example with the naive method giving exact zeros on zero actual values**." |
| RMSSE | q-dagger_t = e_t^2 / [ 1/(T-1) sum (y_t - y_{t-1})^2 ]; RMSSE = sqrt( (1/n) sum q-dagger_t ). |
| The five pitfalls | 3.1 Benchmarks. 3.2 Datasets. 3.3 Evaluation measures. 3.4 Forecast plots. **3.5 Data leakage.** |

**The denominator pathology is the candidate's exact situation, and it is measurable.** On the
calendar-filled basis the seasonal-naive benchmark predicts zero on a closed day and the actual is
zero, so the difference is **exactly zero**, and those zeros are averaged into the denominator:

| venue | lag-7 differences that are exactly zero |
|---|---|
| beer_hall | **75 of 355 (21.1%)** |
| ellel | **249 of 342 (72.8%)** |

The backtest denominator is therefore **deflated by a fifth at Beer Hall and by nearly three quarters
at Ellel**. Both served MASE figures (0.745 and 0.572) are computed against it.

#### (d) Kostenko and Hyndman (2006): the candidate's cutoff constants are wrong

Verbatim: *"The limiting value of p is obtained when v = 0 and alpha = 0 giving* **p = 4/3 (not 1.32 as
given by SBC)**." And: *"we find the maximum value of* **v = 0.5 (not 0.49 as given by SBC)**."

The candidate's `eval/intermittency_diagnostic.md` uses **1.32 and 0.49**, which are the two arithmetic
errors this paper exists to correct. No venue reclassifies (Beer Hall's ADI of 1.35 clears 4/3 as well
as 1.32), so no result changes. The constants must still be fixed. The paper also gives the exact rule
the diagnostic should be applying: **use SBA whenever v < 2 - (3/2)p**. This is Finding 19.

> **REVIEWEE CORRECTION 2026-07-31.** The inequality is inverted here and at the two other
> sites where this finding states it. The paper's sentence is **`use SBA whenever v > 2 - (3/2)p`**
> (verified, `ledger/citation_audit.md`). `select_sba` was implemented from the reversed form
> given here, which is why the diagnostic reported that no node selects SBA. The correction
> reverses that verdict at every node. Finding 19's substantive charge — wrong constants — is
> accepted and actioned.

#### (e) Chatfield and Hayya (2007): the bridge from Finding 13 to Idea A

Verified from the abstract and the conclusions:

- *"all-zero forecasts yield the lowest cost when lumpiness is high."* Ellel's ADI is **5.63**.
- **The load-bearing sentence:** *"We also find that* **the lowest forecasting error does not
  necessarily lead to the lowest system cost**."
- *"the best forecasts in terms of MAPE, MSE, or Theil's U, do not necessarily translate into the
  lowest cost inventory system, and that other metrics should be utilized for determining forecasting
  methods to use when demand is lumpy."*
- *"several of the existing ones such as MAPE ... and GRMSE are not suitable, and that specific ones
  need to be developed to* **account for zero demands or zero forecasting errors**."

This is the peer-reviewed decision-theoretic argument that **accuracy is not the objective, cost is**.
It connects the flatline artefact (Finding 13) to the cost-elicited intervention policy (Idea A) in one
citation, and it does so from 2007.

#### (f) Makridakis, Spiliotis and Assimakopoulos (2022), the M5

- Of the 42,840 product-store series, **5,206 are lumpy (17%), 883 erratic (3%), 2,062 smooth (7%)**.
  **73% are intermittent.**
- The Accuracy competition used **WRMSSE**, which *"evaluated the deviation of the point forecasts
  around the* **mean** *of the realized values"*. Squared errors, so no flatline reward.
- And an independent endorsement of the group-ICL recommendation: *"The series of the data set were
  grouped and highly correlated, thus enabling the utilization of multivariate and* **"cross-learning"**
  *methods."*

#### (g) TabPFN-TS and Chronos-2: **there is no dispute. I was wrong. See Correction 7.**

| | Hoo et al. (2026), TabPFN-TS v4 | Ansari et al. (2025), Chronos-2 |
|---|---|---|
| Benchmark subset | **28** fev-bench tasks: only those *"where covariates are available in both the historical and future horizons"* (30 qualify, 2 time out) | **42** fev-bench tasks: *"that include at least one past-only or known covariate"* |
| Baselines | TiRex, Toto-1.0, TimesFM-2.0, Moirai-2.0, Sundial, **Chronos-Bolt**. **Chronos-2 is not among them.** | TabPFN-TS, COSMIC, and others |
| Result | TabPFN-TS *"achieves the strongest results, outperforming all other models"*. fev-bench covariates: rel-WQL **0.503**, rel-MASE **0.666**. GIFT-Eval: rel-WQL 0.460, rel-MASE 0.692. | Chronos-2 wins by a wide margin, and *"Unsurprisingly, the second spot is taken by TabPFN-TS."* |

**The two claims are entirely reconcilable.** TabPFN-TS was state of the art among the models available
before its September 2025 literature cutoff; Chronos-2 then beat it. My "live dispute the estate could
adjudicate" was an over-claim and it is withdrawn.

**But something more useful survives.** TabPFN-TS **requires covariates in both the history and the
future**: *"When future covariates are missing, the model cannot properly condition its forecasts."*
The candidate's covariates (calendar, fixtures, weather) are **all known-future**. TabPFN-TS is not a
league-table filler here; it is the one other model whose covariate requirement his data exactly meets.
Add **Hollmann et al. (2025), Nature**: TabPFN yields *"dominant performance for datasets with up to
10,000 samples and 500 features"* and *"In 2.8 s, TabPFN outperforms an ensemble of the strongest
baselines tuned for 4 h"*, a speedup of **5,140x (classification) and 3,000x (regression)**. The
candidate has **362 daily observations**. He is two orders of magnitude inside TabPFN's design regime,
and it is 11M parameters.

#### (h) Barber, Candes, Ramdas and Tibshirani (2023): the verbatim replacement for the misstated CPTC sentence

**Theorem 2:** P{ Y_{n+1} in C-hat_n(X_{n+1}) } >= **1 - alpha - sum_i w-tilde_i . d_TV( R(Z), R(Z^i) )**

**Coverage gap <= [ sum_i w_i . d_TV( R(Z), R(Z^i) ) ] / [ 1 + sum_i w_i ]**

- The coverage gap is defined as *"the loss in coverage compared to what is achieved under
  exchangeability."*
- It depends on the total variation distance between **swapped residual vectors**, *"and not the
  swapped raw data vectors"*, which is strictly tighter.
- **It holds** *"with no assumptions whatsoever on the underlying joint distribution of the data."*
- The weights *"are required to be fixed rather than data-dependent, and can compensate for* **unknown**
  *violations of the exchangeability assumption, as long as the violations are small."*
- Contrast with **Tibshirani et al. (2019)**, where *"the covariate shift assumption must hold, and the
  ... likelihood ratio must be known exactly or well approximated."*

This is what the chapter should say instead of "coverage is guaranteed even as the venue's regime
shifts." Conformal prediction under drift **bounds the loss**. It does not promise recovery.

#### (i) Haben et al. (2019): the weather null, vindicated with numbers

MAPE at the low-voltage level, four-day-ahead, by temperature basis:

| Method | No temperature | **Forecast** temperature (ex-ante) | **Actual** temperature (ex-post) |
|---|---|---|---|
| ARWD | **14.65** | 20.17 | 20.03 |
| ARWDY | **14.64** | 15.36 | 15.16 |
| ST | 15.42 | **15.16** | 15.39 |
| SnT | 15.66 | **15.48** | 15.66 |
| CKD-W | **16.54** | 17.16 | 17.02 |

- *"the inclusion of temperature (either actual or forecast) has* **minimal effect** *on the forecast
  accuracy. In fact for ARWD, ARWDY and CKD-W,* **including the temperature is detrimental** *to the
  forecast accuracy."*
- *"there is* **not a strong causal link between demand and temperature. Seasonality is a stronger
  driver** *of the demand."*
- And they name the field-wide failure the candidate avoided: *"ex-ante are the practical way to create
  true forecasts since the actual temperature data is not available ahead of time. However, we include
  the ex-post forecasts here for comparison since* **much of the literature is based on these forms of
  forecast**."

**The candidate's weather null result is not a disappointment. It is a replication.**

#### (j) Kaas et al. (2026): the covariate ablation, and the reporting template

Weather-covariate ablation on 200 real low-voltage feeders. Starred rows are covariate-free:

| Model | MAE (kW) | Pinball | Winkler | Coverage |
|---|---|---|---|---|
| **Chronos-2** | **3.839** | **0.5545** | **22.18** | **0.8975** |
| Chronos-2, no covariates | 4.813 | 0.6193 | 24.77 | 0.8844 |
| TabPFN-TS | 4.137 | 0.5767 | 23.07 | 0.9269 |
| TabPFN-TS, no covariates | 4.996 | 0.6726 | 26.90 | 0.9105 |
| Chronos-Bolt | 4.110 | 0.8746 | 34.98 | 0.6211 |
| Chronos-Bolt, no covariates | 5.118 | 1.044 | 41.78 | 0.6388 |
| XGBoost+ | 4.184 | 0.6219 | 24.88 | 0.8090 |
| WeekNaive | 5.315 | 1.083 | 43.32 | 0.5810 |

- *"running the TSFMs as univariate models by removing covariates significantly reduces performance.
  Nevertheless, the univariate TSFMs are* **still relatively good** *... which demonstrates their
  robustness."* Prediction intervals widen by **1.5 to 1.961 kW** without covariates.
- **Chronos-2 is the best of the three on every point metric, and its empirical coverage of 0.8975 is
  the closest to the 0.90 nominal in the table.** That is direct external support for the candidate's
  model choice, from an independent group, on a covariate-informed forecasting problem.
- **This table is the reporting template the candidate is missing** (Finding 9): MAE, RMSE, R-squared,
  pinball, **Winkler**, interval width, **and** empirical coverage, side by side. Coverage alone, as
  currently reported, tells you nothing.

#### (k) Cragg (1971) and Mullahy (1986): the hurdle specification, stated correctly

- **Cragg:** *"a decision first has to be made about whether to consider a change or not. Then a
  decision on the amount of the change is taken."* Part one is a **probit** on the zero outcome:
  f(Y_t = 0 | X) = C(-X'_1t beta). Part two is a regression on the amount, *"truncat[ed] ... at zero"*
  to guarantee non-negativity.
- **Mullahy:** *"a binomial probability model governs the binary outcome of whether a count variate has
  a zero or a positive realization. If the realization is positive, the 'hurdle' is crossed, and the
  conditional distribution of the positives is governed by a* **truncated-at-zero** *count data model."*
  P(cross) = Phi_1(theta_1); conditional positives = phi_2(y, theta_2) / Phi_2(theta_2).

This is the correct written form of the Tier-1 occurrence gate: **yhat = P(trade) x E[revenue | trade]**.
Beer Hall's P(trade) is a known weekly calendar. Ellel's is a booking diary. Both are **observed, not
estimated**, which is exactly why Tier 3 is rejected and Tier 1 is not.

### 10.9 Re-verification at tip `d40dea7` (2026-07-20)

The repository was advanced from `45588f1` to `d40dea7` in a clean detached worktree and every
code-dependent finding re-checked. **No finding was withdrawn. One was rewritten, one strengthened,
and two supporting statements were corrected against the candidate's own interest.**

#### (a) The TRT VAT basis: assumption confirmed, resolution method criticised

The question was decidable from the committed seed CSV. Raw till export, by location:

| Location | rows | net GBP | tax GBP | tax/net | rows with tax > 0 |
|---|---|---|---|---|---|
| The Beer Hall | 47,644 | 202,087.69 | 35,936.17 | 0.18 | 42,249 |
| Two River Taps | 33,993 | 171,970.12 | **0.00** | **0.00** | **0** |
| Ellel Village hall | 10,489 | 44,282.75 | 8,077.20 | 0.18 | 9,588 |
| Events | 203 | 1,438.74 | 287.76 | 0.20 | 199 |

On Beer Hall's **taxed rows only**, `tax/net = 0.2000` exactly, and `Gross = Net + Tax` holds to the
penny. The blended 0.18 reflects zero-rated lines, not a different VAT rate.

Decisive test. For the 80 items sold at both Two River Taps and Beer Hall with at least 30 units at
each, compare the median unit price:

| Item | BH net | BH **gross** | TRT recorded |
|---|---|---|---|
| Lager - BH | 4.17 | **5.00** | **5.00** |
| Paulaner Helles Lager | 4.75 | **5.70** | **5.70** |
| Lune Valley Gold | 3.50 | **4.20** | **4.20** |
| Caravan of Love | 4.58 | **5.50** | **5.50** |
| Poretti | 4.83 | **5.80** | **5.80** |
| Pale (or Peaches) | 4.00 | **4.80** | **4.80** |

| Hypothesis | median ratio | items within 2% |
|---|---|---|
| **TRT price = BH gross** (TRT is VAT-inclusive) | **1.0000** | **51 / 80** |
| TRT price = BH net (TRT already ex-VAT) | 1.2000 | 5 / 80 |

The customer pays the same price at both venues. Two River Taps books the whole payment as `Net Sales`
because that location has no tax configured in Square. **`vat_deflator` is correct.** The roughly 29
items outside the 2% band are genuine venue price differences (Postmix 3.00 against 2.00, Session IPA
5.50 against 4.50), not VAT artefacts.

The chain is live, not dead code: `ingest/normalise.py:160` maps `vat_deflator` over the venue column
to build `net_sales_exvat`; `store/warehouse.py:92, 111, 126` aggregate that into `revenue_exvat`;
that column is the target of every forecast and the basis of every MASE in the dissertation.

**Flag status, recorded on the candidate's confirmation of 2026-07-20: CLOSED ON INTERNAL EVIDENCE.**
The basis decision is also confirmed: the modelling target remains `revenue_exvat`.

#### (b) A new state-log-versus-code conflict, and it is the log's own named failure mode

State log decision 13 reads: *"VAT removed from the brain entirely rather than made per-org. This also
closes the long-standing 'TRT VAT basis pending confirmation' item by making it moot."*

**Removal is true of the compute path only.** `compute/contract.py:221-223` states there is
deliberately no `vat_inclusive` or `vat_rate` on the contract and that `sales_daily` is ex-VAT by
contract. But the **research path**, which the state log itself defines as "the configuration every
dissertation number was produced in", still applies the rule: `config.py:148-152` retains `VAT_RATE`,
`VAT_INCLUSIVE_VENUES` and `vat_deflator`, and still describes it as "a working assumption pending
owner confirmation (standing flag, see FLAGS.md)". `FLAGS.md:43-45` still reads "**Owner to confirm.**"

So the word "entirely" is an over-claim, and the item was not moot. This is the failure mode the state
log names in its own lessons section: *"Documents outlive the code they describe... When a correction
lands, ask which document downstream actually reads."* FLAGS.md is the ledger it identifies as the one
downstream reads, and the correction did not land there. Recorded as a new row in Appendix D.

#### (c) Findings re-confirmed at `d40dea7`

| Finding | Evidence at the current tip |
|---|---|
| **1 (Fatal)** | **Strengthened.** `sim/confront_july_w2.py:87` defines a **third** private `_seasonal_scale`, and line 92 reads `l1_daily` again with no calendar fill. Its output at line 152 is `mase_per_day`, the new 0.285 / 0.287 headline for the 8 to 14 July window. The defect did not merely persist, it **propagated into new code**, and the state log now compares three windows scored on inconsistent rulers: "0.285 ... against the 1 to 7 July window's 0.386 and the 0.745 backtest class." |
| **3, 4** | **Stand.** `eval/harness.py:78` still declares `n_folds: int = 4` with no `step_days` parameter. The 236-origin ceiling of Appendix I remains unrealised. |
| **6** | **Stands, and is now older.** No ECE, reliability diagram or temperature scaling anywhere in the tree, while state log section 22 still lists "Calibration (agent eval) / Guo et al. 2017 / ECE binned formula, temperature scaling" as a method in the build. |
| **14** | **Stands.** `models/foundation.py:228, 319, 325` all still pass `"id": "l1"`. Group size remains one. |

#### (e) `eval/agent_eval.py` settled: Finding 2 STANDS AT `d40dea7`, unchanged in substance

Verified by tracing every caller rather than by reading the file's name.

| Check | Result |
|---|---|
| What is it? | An **evaluation orchestrator**, 1,035 lines. Its own docstring: *"Answers 'is the proactive briefing USEFUL?', not 'is the forecast accurate?'... It runs the REAL detectors... and the REAL briefing synthesis... then scores what the briefing surfaces against the injection truth."* And: *"Read-only over the briefing and signals; invents no detection maths."* |
| Who imports it? | `tests/test_agent_eval.py`, `tests/test_scaled_eval.py`, `eval/judge.py:219`, `eval/labels.py:119`. **All inside `eval/` or `tests/`.** |
| Does the served path touch it? | **No.** A grep across `signals/*.py`, the API modules and `compute/*.py` returns only the English words "judged" and "judgement" in prose and a docstring. **The served path contains no LLM call of any kind.** |
| Does it import the Anthropic SDK? | **No.** The two occurrences of the string are report prose at lines 974-975. |
| Is `briefing._score` still constants? | **Yes.** `signals/briefing.py:273-279` remains a pure product of six configured constants: source weight, severity multiplier, recency factor, novelty factor, baseline trust, direction bump. |
| Has the judge ever run? | **No.** Triple-gated at `eval/judge.py:114` on `JUDGE_LIVE=1` plus the SDK being importable plus an API key. Report 09 records "**N=0 labelled items**", "no API key / JUDGE_LIVE unset", and "No kappa is claimed until the judge is run and calibrated against the anchor." |

**Verdict: Finding 2 stands in full.** No LLM participates in any decision the served system makes.

**Two credits arise from this check and belong in the record.**

First, the anti-fabrication design is better than the finding implies. The judge is deliberately
triple-gated so that, in the words of the generated report, *"the offline seam cannot fabricate a
score"*, and report 09 states the N=0 position as *"the honest state, not a fabricated number"*. A
weaker project would have reported a judge score with no human anchor behind it.

Second, `tests/test_agent_eval.py:124` contains
`test_agent_eval_imports_briefing_and_signals_one_way`, a test that **pins the dependency direction**
so the evaluator can never be pulled into the thing it evaluates. That is the same clean-dependency
discipline the record already credits in `signals/residual.py`, and it is rarer than it should be.

**This sharpens rather than softens Finding 6.** The evaluation instrument is not merely built, it is
carefully built, gated against self-deception, and pinned by tests. It has never been run. That
remains the single most expensive unforced error in the project.

#### (d) Two statements in this record corrected against the examiner's own interest

1. **Finding 2's supporting sentence was correct, and the examiner's "correction" of it was wrong.
   Both errors are recorded.** This record stated that "the only Anthropic import in the whole
   `brain/` tree is `eval/judge.py`". Round 3 initially flagged that as false on the grounds that a
   recursive grep for the string `anthropic` returned two files. **That grep was the error.** The two
   hits in `eval/agent_eval.py` are at lines 974 and 975, and they are **prose inside a
   report-generating f-string** describing the judge's gating, not an import. `eval/judge.py` is
   indeed the only file that imports the SDK. The original sentence stands; the correction is
   withdrawn. Searching for a word is not the same as finding an import, which is the same class of
   mistake as reading a constant and assuming it executes (item 2 below). Full verification at
   Section 10.9e.
2. **Appendix H asserted a constant that no longer exists and never worked.** This record listed
   `EXCLUDED_VENUES = frozenset({"events"})` as an active preprocessing decision. It was deleted at
   G15a.3, and `config.py:90-95` now records that the constant **never performed the exclusion** and
   had "propagated a false claim into a committed evidence artefact." This record propagated that same
   false claim. Correction pending the appendix decision.

---

---

## 11. CORRECTIONS TO THE EXAMINER'S OWN PRIOR ADVICE

Seven corrections were issued during this examination. All seven are recorded here because a record
that hides its own revisions is worth nothing. Corrections 6 and 7 came from the final verification
round (Section 10.8) and one of them **withdraws a claim I made in Section 8.C**.

### 11.1 Correction 1: conformal prediction. The fix is INSIDE the framework, not outside it.

**What was said** (Section 8.B as originally drafted, and the Section 9 reconciliation): *"a structural
zero is not a distribution shift, and no amount of quantile adaptation will treat it as one"*, and *"the
fix that works lives outside the conformal family"*.

**Wrong.** CPTC is **state-conditional conformal**: a separate miscoverage target alpha_z per predicted
state z, with Theorem 4.3 bounding miscoverage by **epsilon times max delta**, where epsilon is the state
**misclassification** rate.

The candidate's liveness gate plus Mondrian band **is a two-state CPTC with a perfectly observed state**.
Sun and Yu must *infer* the regime. The candidate **knows the closure date**. His **epsilon is zero**, so
by CPTC's own theorem his miscoverage bound from state error is **zero**.

**Revised experiment:** a **four-way** comparison (static split conformal, ACI with gamma swept, AgACI,
and state-conditional conformal keyed on the observed liveness state), framed as CPTC with epsilon = 0,
with the outcome predicted in advance by Zaffran Theorem 3.1 and CPTC Theorem 4.3. The conclusion becomes:
*when the regime variable is directly observable rather than inferred, state-conditional conformal
recovers nominal coverage through a structural break where the adaptive-quantile family cannot; the
operational lesson is to spend effort observing the state rather than inferring it.* Stronger claim, same
cost.

### 11.2 Correction 2: the chapter does not merely argue against the data. It misstates its own source.

Upgraded from "the chapter argues for a conclusion the data refutes" to **Finding 16: the chapter
misstates CPTC's theorem**. Full detail at Section 10.2. This is worse than a gap, and an examiner can
check it in ninety seconds.

### 11.3 Correction 3: the novelty claim of idea A is partly occupied, by PRISM.

**What was said:** the cost-calibrated silence policy with ECE was novel.

**Over-claimed.** PRISM (Fu et al. 2026) already uses an asymmetric cost ratio to set an adaptive
intervention threshold and is the only one of nine proactive-agent papers to report **ECE and Brier**.
The *method* is not novel.

**What survives**, and it is confirmed across all nine papers (Section 10.4): **not one** uses real humans
making real accept-or-dismiss decisions in their own workplace, and **not one** elicits the cost ratio
from the person who bears the cost. The surviving novelty is a **field-deployment** novelty, not a method
novelty, and the candidate must say so. **Build cost falls**, because PRISM supplies the method.

### 11.4 Correction 4: Tier 1 is worth more than stated, because the structural-zero problem is an open gap in the candidate's own domain literature.

Chae et al. ignore it and use MAPE. Hossain and Parvin ignore venue closures. Schmidt deletes whole weeks.
**Nobody in the hospitality forecasting literature models the occurrence process.** Tier 1's marks upside
is revised from **+6 to +9** up to **+8 to +11**. Full detail at Section 10.7(a).

### 11.5 Correction 5: the Diebold-Mariano recommendation is WITHDRAWN. It is mathematically unavailable.

**What was said** (original "three things to fix first", item 2): *"run a paired Diebold-Mariano (or
Wilcoxon) on the six per-fold MASE differences"*.

**Withdrawn.** The Harvey-Leybourne-Newbold modified statistic is

**S1\* = [ (n + 1 - 2h + h(h-1)/n) / n ]^(1/2) x S1**, compared against Student's t with (n-1) degrees of
freedom.

At the candidate's configuration, **n = 6 folds and h = 7 days**:

**6 + 1 - 14 + (7 x 6)/6 = 6 + 1 - 14 + 7 = 0**

**The correction factor is exactly zero. S1\* = 0 x S1 = 0, identically, for any data whatsoever. The
test is degenerate.** (n = 7 gives zero too.) See Appendix F for the full table.

And the uncorrected test is no escape. Harvey et al.'s own simulation, nominal 10% level, percentage of
rejections of a **true** null:

| | h = 1 | h = 2 | h = 7 |
|---|---|---|---|
| **Original DM at n = 8** | 16.7% | 30.0% | **72.4%** |
| Original DM at n = 16 | 13.5% | 20.3% | 39.4% |
| Modified DM (t critical values) at n = 8 | 8.4% | 16.4% | 9.9% |
| Modified DM (t critical values) at n = 16 | 9.6% | 14.2% | 18.2% |

The candidate is at **n = 6, h = 7**: below the smallest sample Harvey et al. study (n = 8) and at the
worst horizon in their table. The authors describe the modified test's apparently acceptable size at
n = 8 as possibly **"fortuitous"** and its power there as **"relatively poor"** (because it is
under-sized at that sample size), and they note that Morgan-Granger-Newbold is more powerful at the
smallest sample sizes.

**The replacement is better and cheaper: change one parameter.** `n_folds = 6` gives 42 test days from
one spring block. With 362 calendar days, `min_train_days = 120` and a 7-day horizon, roughly **34
rolling origins** are available spanning the full year, and the HLN factor at n = 34 is 0.81. Their table
shows size settling near nominal from about n = 32.

**This single parameter change kills Finding 3 and Finding 4 simultaneously**, and it is the highest-value
line of code in this entire assessment.

### 11.6 Correction 6: the MCS recommendation stands, but it is a CONSEQUENCE of raising the fold count, not an alternative, and the honest outcome is a WIDE set.

**What was said** (Section 4, fix 1, and Section 9.2 row 4): use a Model Confidence Set instead of the
impossible Diebold-Mariano test.

**The recommendation survives, but three things were unstated and one was wrong.**

1. **The MCS is bootstrap-based and it is not credible at n = 6 either.** Hansen, Lunde and Nason's
   smallest simulated sample is **n = 50**; their main experiment runs at **n = 250**. The MCS does not
   rescue six folds. It is a **consequence** of raising the fold count, not a substitute for doing so.
   The fix order in Section 4 was right by luck rather than by argument, and it is now right by
   argument.
2. **The fold ceiling is higher than I said.** `rolling_origin` steps by the horizon, so 34 is the cap
   at step 7. Adding `step_days = 1` yields **236 origins** and an HLN factor of **0.9725**, which puts
   the candidate inside Hansen et al.'s studied range rather than below it. **Take the 236.**
3. **Use the moving-block bootstrap**, block length at least the horizon, and **pre-register alpha at
   0.10 or 0.25**, the two levels Hansen et al. use in their own applications. At 0.05 the procedure has
   no power at these sample sizes.
4. **Expect a wide set, and say so in advance.** *"Uninformative data yield a MCS with many models."*
   *"The lack of power causes the procedure to terminate too early ... and the MCS will contain a large
   number of models, including several inferior models.* **We view this as a strength of the MCS
   procedure.**"

**The wide set is the finding.** If the 90% MCS at Beer Hall contains Chronos-2-exo, Chronos-2, ETS and
Chronos-Bolt, the correct sentence is:

> *"On 236 rolling origins, the 90% Model Confidence Set at Beer Hall contains four models. The estate's
> data cannot distinguish them on accuracy. Chronos-2-exo was served on grounds of cold-start capability
> and inference cost, not demonstrated accuracy superiority, and this dissertation does not claim
> otherwise."*

An examiner cannot attack that. An examiner **can** attack "0.745 beats 0.799", and will.

And Hansen et al. supply the authority for why the current approach is not merely underpowered but
**invalid**: the MCS *"makes it possible to make statements about significance that are valid in the
traditional sense, a property that is* **not satisfied by the commonly used approach of reporting
p-values from multiple pairwise comparisons**." A league table of six-fold means is weaker still than
that.

### 11.7 Correction 7: the TabPFN-TS versus Chronos-2 "dispute" does not exist. WITHDRAWN.

**What was said** (in the pre-patch discussion of Idea C and Tier 2b): that TabPFN-TS v4 claims
state-of-the-art on covariate-informed forecasting while Chronos-2 claims it beats TabPFN-TS by a wide
margin on the same benchmark, that both cannot be right, and that the candidate's estate could
adjudicate an open dispute in the current literature.

**Over-claimed, and withdrawn.** Verified from both PDFs (Section 10.8g):

- **Hoo et al. do not benchmark against Chronos-2 at all.** Their foundation-model baselines are TiRex,
  Toto-1.0, TimesFM-2.0, Moirai-2.0, Sundial and **Chronos-Bolt**, all *"publicly available before
  September 2025, our literature cutoff date."*
- **Chronos-2 explicitly concedes TabPFN-TS was the prior best:** *"Unsurprisingly, the second spot is
  taken by TabPFN-TS."*
- The subsets differ: Hoo uses **28** tasks (covariates in **both** history and future); Ansari uses
  **42** (at least one past-only **or** known covariate).

There is no contradiction. TabPFN-TS was SOTA; Chronos-2 superseded it.

**What survives is better-founded than what it replaces.** TabPFN-TS *requires* covariates present in
both the history and the forecast horizon, which is the exact shape of the candidate's covariate set
(calendar, fixtures, weather: all known-future). And Hollmann et al. (2025, **Nature**) establish that
TabPFN is *"dominant ... for datasets with up to 10,000 samples and 500 features"* and beats a 4-hour-
tuned GBDT ensemble in **2.8 seconds**. The candidate has **362 observations**. TabPFN-TS is therefore
not league-table padding but the single best-motivated second entrant available, on small-N grounds, at
11M parameters. **Keep it in Tier 2b; change the reason.**

---

## 12. FINAL VERDICT

**Mark: 63/100 (Good Pass / Merit). It stands after full verification.**

The verification pass added one Major (Finding 16: the Related Work chapter misstates its own key
theorem) and one credit (the candidate's refusal of the ERA5 weather basis exceeds published 2026
practice). These offset.

**But the distance to 72+ is now measurably shorter than it appeared at the start of the examination,
because four of the things the candidate was told to build already exist and are implementable.**

| What the candidate was told to build | What he actually has to do now |
|---|---|
| A significance test on 6 folds | **Impossible.** The HLN factor is zero at n=6, h=7. Add `step_days=1` to `rolling_origin`: **236 origins**, HLN factor 0.97, valid MCS. One parameter. Kills two Majors. |
| A cost-sensitive silence policy with ECE | **PRISM already did it.** Implement their method. Novelty narrows to elicited operator costs and real workplace ground truth, which none of nine papers has. |
| An attribution layer | **Hertel already did it.** SHAP with temporal and covariate masking, on Chronos-2, no background sampling. |
| A conformal framing for the closure | **CPTC already did it.** The liveness gate is CPTC with epsilon = 0. Run the four-way. |
| Multi-venue transfer | **Chronos-2 already does it.** Change `id = "l1"` to three group IDs. |
| A metric that survives structural zeros | **The M5 already chose it.** RMSSE. Squared scaled error, optimises the mean, no flatline reward. |
| A full reporting table for the bands | **Kaas et al. already built it.** MAE, RMSE, R2, pinball, Winkler, width, coverage. |

### 12.1 Final severity register

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | **Fatal** | July MASE denominator inconsistent; **and neither denominator is valid; and MASE is the wrong metric** | **Substantially strengthened (10.8c)** |
| 2 | **Fatal** | The research question names an LLM-based agent; no LLM exists in the system | **Re-verified at `d40dea7` (10.9e).** Served path LLM-free; `briefing._score` still six constants; judge never run |
| 3 | **Major** | Model selection: no dispersion, no test, and demonstrably unstable | **Strengthened.** No DM variant computable at n=6,h=7; and Hansen et al. state that pairwise p-value league tables are **not valid inference** at any n. |
| 4 | **Major** | 42 consecutive days is the entire evidence base for every served-model decision | **Same fix as Finding 3, and the ceiling is 236 origins, not 34.** |
| 5 | **Major** | Injections perturb the residual z stream, bypassing the refit and recalibration loop | Unchanged |
| 6 | **Major** | Objective 4 unmet on three of four terms: N=0 human labels, no judge run, no ECE | Unchanged |
| 7 | **Major** | Weather covariates trained ex-post, served ex-ante; `leadmatched` built and unused | **Credit added:** the ERA5 refusal exceeds published practice |
| 8 | **Major** | Rhythm learned from sales only; three of four spec domains unused | Unchanged |
| 9 | **Major** | Band coverage of 1.00 reported as a success against a 90% nominal | Unchanged |
| 10 | **Major** | Multi-venue transfer used by no served model | **Upgraded from Minor.** Chronos-2 supports it natively. |
| 11 | Minor | GBP 403.31 reconciliation delta unexplained | Unchanged |
| 12 | Minor | TRT VAT basis: assumption **confirmed correct** on internal evidence; the finding is now the resolution method, not the number | **Rewritten (10.9)** |
| 13 | **Major** | L1 series are lumpy; the entire L1 stack assumes continuous demand | **New** |
| 14 | **Major** | Chronos-2 called with a group of size one, disabling cross-series ICL | **New** |
| 15 | **Major** | Ellel has no occurrence signal on an 18%-density series; the booking diary exists and is not in the data | **New** |
| 16 | **Major** | The Related Work chapter misstates Sun & Yu's theorem | **New** |
| 17 | **Major** | The synthesis paragraph claims an intersection PRISM occupies | **New** |
| 18 | Minor | Cite key `faw_-context_2025` is wrong on first author and year | **New** |
| 19 | **Major** | Intermittency cutoffs 1.32 / 0.49 are SBC's arithmetic errors. **On the current frame Beer Hall (ADI 1.3256) reclassifies between the wrong cutoff and the right one** | **New (10.8d), upgraded Round 3 (App E.2)** |

**Totals: 2 Fatal, 14 Major, 3 Minor.** (Finding 19 upgraded Minor to Major in Round 3.)

### 12.2 Final order of work

1. **Today.** Email Elliot: the **Ellel booking diary**, and the **labelling ask**. Book the 20-minute
   cost-elicitation call. Both are five minutes of his time and neither can be compressed later.
2. **This week.** Add `step_days=1` to `rolling_origin` and re-run the ladder on **236 origins**. Report
   mean plus SD and a **Model Confidence Set** with a moving-block bootstrap, alpha pre-registered at
   0.10 or 0.25. Expect a wide set and present it as the finding.
3. **Same week.** Switch the headline metric to **RMSSE** and unify the scale function. Fix the CPTC
   sentence and the synthesis paragraph in the chapter. Fix the `faw_-context_2025` key and the
   1.32 / 0.49 cutoffs. Pin the environment.
4. **Next.** Group-ICL across the three venues. Lead-matched weather. The four-way conformal comparison.
5. **When the labels arrive.** PRISM's policy, the operator's elicited costs, ECE, Brier, Ask-F1.

### 12.3 The honest contribution claim

Every clause below is true, every clause is cheap, and every clause is backed by a paper the candidate
already owns.

> *PRISM's risk-sensitive intervention policy and Hertel's covariate SHAP, instantiated on a live
> three-venue hospitality estate; evaluated against the operator's own adopt-or-dismiss decisions and his
> own elicited cost ratio rather than an annotated corpus, a simulated user, or an LLM judge; with an
> ex-ante weather basis that exceeds current published practice; a demonstration that adaptive conformal
> prediction fails at a real structural break exactly as Zaffran's Theorem 3.1 predicts, while
> state-conditional conformal with a directly observed regime variable does not; and a treatment of
> venue-level structural zeros that the restaurant-demand literature does not currently attempt.*

---

# APPENDICES

## Appendix A: re-run ladder with per-fold dispersion

Clean container, statsmodels 0.14.6, scikit-learn 1.8.0, pandas 3.0.2, numpy 2.4.4. Chronos rungs absent.
6 folds, 7-day horizon, `min_train_days = 120`.

### Beer Hall

| model | mean | sd | min | max | per-fold |
|---|---|---|---|---|---|
| rung2_ets | 0.829 | 0.226 | 0.450 | 1.109 | 0.45, 0.97, 0.72, 1.11, 0.88, 0.85 |
| rung3_gbm | 0.936 | 0.260 | 0.469 | 1.195 | 0.47, 1.01, 1.11, 1.20, 0.83, 1.01 |
| rung3_global_gbm | 0.956 | 0.186 | 0.666 | 1.222 | 0.87, 1.04, 1.01, 1.22, 0.67, 0.92 |
| rung0_seasonal_naive | 1.006 | 0.115 | 0.824 | 1.168 | 1.05, 1.17, 0.97, 1.05, 0.82, 0.97 |
| rung1_robust_dow | 1.029 | 0.596 | 0.281 | 2.004 | 0.28, 0.77, 2.00, 1.38, 0.77, 0.97 |
| rung2_stl | 1.125 | 0.314 | 0.675 | 1.637 | 0.67, 1.11, 1.64, 1.23, 1.08, 1.01 |

**Committed values for comparison:** ETS 0.799, GBM 0.927, global GBM 0.920, seasonal-naive 1.006,
robust-DOW 1.029, STL 1.125, Chronos-2 0.793, **Chronos-2-exo 0.745 (SERVED)**, Chronos-Bolt 0.796.

The deterministic rungs (seasonal-naive, robust-DOW, STL) reproduce **exactly**. The fitted rungs (ETS,
GBM) **drift with library version**.

**Chronos-2 univariate per-fold, from the candidate's own committed `eval/chronos2_covariate_probe.md`:**
0.641, 0.825, 0.490, 1.015, 0.785, 1.001. Mean 0.793, **SD 0.204, SEM 0.083**. The served exo model's
margin over it is **0.048**, well inside one standard error.

**Calendar-covariate variant, same file:** 0.485, 0.855, 0.526, 1.049, 0.777, 0.984. Mean 0.779. **Three
folds better, three folds worse. Mean delta minus 0.014.** A paired sign test on 3 of 6 gives p = 1.0.
The report's conclusion is "Outcome: covariates HELP".

**Static-regime stress test (committed):** Chronos-2-exo **errors out with a ValueError** and cannot
produce a forecast at all. Robust-DOW (0.704) beats Chronos-2 (0.721). The served model's superiority is
regime-specific to the 7-day rolling setting and it cannot produce a long-horizon forecast.

### Ellel

| model | mean | sd | min | max | per-fold |
|---|---|---|---|---|---|
| rung1_robust_dow | 0.572 | 0.524 | 0.299 | 1.636 | 0.31, 0.30, 0.38, 0.37, 0.44, 1.64 |
| rung2_stl | 0.629 | 0.492 | 0.236 | 1.609 | 0.24, 0.43, 0.50, 0.55, 0.45, 1.61 |
| rung3_gbm | 0.813 | 0.430 | 0.046 | 1.223 | 0.05, 1.22, 0.66, 1.18, 0.84, 0.94 |
| rung2_ets | 0.853 | 0.340 | 0.509 | 1.452 | 0.90, 0.89, 0.83, 0.51, 0.54, 1.45 |
| rung3_global_gbm | 0.885 | 0.430 | 0.427 | 1.639 | 0.43, 0.73, 0.87, 1.06, 0.58, 1.64 |
| rung0_seasonal_naive | 0.924 | 0.845 | 0.106 | 2.487 | 2.49, 0.52, 0.51, 0.72, 0.11, 1.21 |

**Committed:** robust-DOW **0.572 (SERVED)**, Chronos-2 0.581, seasonal-naive 0.924. Gap **0.009** against
a fold SD of **0.524**. The "simple beats complex" claim is not supported: it is a coin toss. One fold
(1.64) dominates the robust-DOW mean.

### Two River Taps

| model | mean | sd | min | max | per-fold |
|---|---|---|---|---|---|
| rung3_gbm | 0.601 | 0.158 | 0.395 | 0.763 | 0.73, 0.58, 0.43, 0.40, 0.70, 0.76 |
| rung2_ets | 0.617 | 0.196 | 0.366 | 0.876 | 0.44, 0.57, 0.37, 0.67, 0.78, 0.88 |
| rung0_seasonal_naive | 0.673 | 0.281 | 0.328 | 1.040 | 0.68, 0.51, 0.51, 0.33, 1.04, 0.97 |
| rung1_robust_dow | 0.737 | 0.302 | 0.416 | 1.147 | 0.54, 0.90, 0.47, 0.42, 0.95, 1.15 |
| rung3_global_gbm | 0.743 | 0.265 | 0.416 | 1.161 | 0.76, 1.16, 0.42, 0.53, 0.89, 0.70 |
| rung2_stl | 0.829 | 0.453 | 0.400 | 1.498 | 0.76, 0.66, 0.40, 0.40, 1.25, 1.50 |

**Committed:** **ETS 0.597 (SERVED)**, GBM 0.602, Chronos-2-exo 0.612, Chronos-Bolt 0.612.
**Rerun:** ETS 0.617, GBM 0.601.

**WITHDRAWN. The examiner's rerun was wrong and the flip does not exist.** Tested directly in S4
Part 5 under the rerun's own resolution (scikit-learn 1.8.0, statsmodels 0.14.6): Two River Taps ETS
scores **0.597, not 0.617**, and still wins. The GBM does move, 0.602 to 0.601, which is a real
scikit-learn effect of one thousandth and nowhere near enough to flip anything. ETS is a statsmodels
model and statsmodels was 0.14.6 in both runs, so ETS is identical by construction and 0.617 was not
obtainable from any library difference. It was an artefact of the examiner's reconstruction of
`evaluate_rolling`, most likely a different MASE denominator or different fold boundaries, which is
the same error class as the three frame-definition errata at Appendix K.4.

**What survives.** Unpinned `>=` bounds with no lockfile were a real reproducibility defect, and S3
fixed it with per-venv lockfiles and a recorded resolution. What does not survive is the vivid
illustration. The honest statement is that the selection was **unpinned and therefore unverifiable**,
not that it was **demonstrably unstable**.

## Appendix B: what the model-selection gate actually saw

`harness.rolling_origin(feats, n_folds=6, horizon_days=7, min_train_days=120)` on Beer Hall
(series span 2025-06-04 to 2026-05-31, n = 362 calendar days):

| fold | train | test |
|---|---|---|
| 1 | 2025-06-04 to 2026-04-19 (n=320) | 2026-04-20 to 2026-04-26 (n=7) |
| 2 | 2025-06-04 to 2026-04-26 (n=327) | 2026-04-27 to 2026-05-03 (n=7) |
| 3 | 2025-06-04 to 2026-05-03 (n=334) | 2026-05-04 to 2026-05-10 (n=7) |
| 4 | 2025-06-04 to 2026-05-10 (n=341) | 2026-05-11 to 2026-05-17 (n=7) |
| 5 | 2025-06-04 to 2026-05-17 (n=348) | 2026-05-18 to 2026-05-24 (n=7) |
| 6 | 2025-06-04 to 2026-05-24 (n=355) | 2026-05-25 to 2026-05-31 (n=7) |

**Total evidence base for every served-model decision: 42 consecutive days, 2026-04-20 to 2026-05-31.**
Six adjacent, non-independent spring weeks out of a 362-day series. The model is then deployed into June
and July.

**Available instead:** with `min_train_days = 120` and a 7-day horizon, (362 - 120) / 7 = **roughly 34
rolling origins spanning the full year.**

## Appendix C: the MASE rulers. **[EXPANDED, Section 10.8]**

### C.0 CURRENT FRAME, ceiling 2026-07-07, tip `d40dea7`. **[RECOMPUTED, Round 3]**

**Beer Hall** trades 5.30 days a week (301 trading days in 399 calendar days). **Ellel** trades 1.21
(66 in 392).

| # | Basis | BH scale | Ellel scale | Verdict |
|---|---|---|---|---|
| **(a)** | calendar-filled, lag-7 | **315.7** | **180.1** | **The backtest ruler.** Invalid: **78 of 392 (19.9%)** of Beer Hall's lag-7 differences are exactly zero, and **284 of 385 (73.8%)** of Ellel's. Structural zeros deflate the denominator. |
| **(b)** | trading-only, lag-7 | **631.8** | 770.8 | **The `confront_july` ruler.** Invalid: seven trading days back on a 5.30-day week is a different weekday. |
| **(c)** | trading-only, same-weekday lag | **456.5** (lag-5) | 806.2 (lag-1) | **The defensible seasonal naive** at Beer Hall. At Ellel's 1.21 trading days a week the concept does not survive at all. |
| **(d)** | calendar lag-7, structural-zero pairs excluded | 386.9 | 754.0 | Also defensible. |

**The same July 1 to 7 forecast (Beer Hall MAE GBP 243.5), scored four ways on the current frame:**

| Ruler | MASE |
|---|---|
| **(b) trading lag-7, as shipped** | **0.385** |
| (c) trading lag-5, defensible seasonal naive | 0.533 |
| (d) calendar lag-7, zeros excluded | 0.629 |
| **(a) calendar lag-7, the backtest's own ruler** | **0.771** |

**Ruler (b) reproduces the shipped 0.386 to within 0.001.** That is confirmation of the Finding 1
diagnosis rather than inference from it: the published July figure is scored on the trading-only lag-7
denominator, and no other candidate comes close to reproducing it.

The spread remains **2.0x** on one unchanged forecast. Every conclusion of Finding 1 survives the frame
change unaltered.

### C.1 Seed-only frame, ceiling 2026-05-31, retained as audit trail

Beer Hall trades **5.22 days a week** (270 trading days in 362 calendar days). Ellel trades **1.28 days
a week** (64 in 349).

**Beer Hall**

| # | Basis | Scale | Verdict |
|---|---|---|---|
| **(a)** | calendar-filled, lag-7 | **291.2** | **USED BY THE BACKTEST AND THE JUNE CONFRONTATION.** Invalid: **75 of 355 (21.1%)** of the lag-7 differences are **exactly zero** (closed day against closed day). The benchmark scores a perfect prediction on every structural zero, which **deflates the denominator** and inflates every MASE computed from it. Hewamalage et al. (2023) name this pitfall. |
| **(b)** | trading-only, lag-7 | **610.4** | **USED BY `confront_july.py`.** Invalid: on a 5.22-day trading week, seven trading days back is **1.34 weeks**, a **different day of the week**. This is not a seasonal naive. |
| **(c)** | trading-only, lag-5 | **408.1** | **The defensible one.** Five trading days back on a 5-day trading week is the **same weekday**, with no structural zeros in the denominator. |
| **(d)** | calendar lag-7, structural-zero pairs excluded | **362.5** | Also defensible. Same weekday, zeros removed. |

**Ellel**

| # | Basis | Scale | Verdict |
|---|---|---|---|
| (a) | calendar-filled, lag-7 | **181.3** | **USED BY THE BACKTEST.** **249 of 342 (72.8%)** of the differences are exactly zero. The denominator is deflated by nearly three quarters. |
| (b) | trading-only, lag-7 | 780.6 | Weekday misaligned. |
| (c) | trading-only, lag-1 | 783.6 | At 1.28 trading days a week, the seasonal-naive concept does not survive. |
| (d) | calendar lag-7, trading pairs only | 754.0 | |

### C.2 The same July forecast, scored four ways

Beer Hall July MAE = **GBP 243.5**.

| Ruler | MASE | |
|---|---|---|
| (b) trading lag-7, **as shipped** | **0.399** | The headline. Claimed to beat the 0.745 backtest. |
| (c) trading lag-5, **the defensible seasonal naive** | **0.597** | |
| (d) calendar lag-7, zeros excluded | **0.672** | |
| (a) calendar lag-7, **the backtest's own ruler** | **0.836** | **Above 0.745.** |

**A spread of 2.1x on the same forecast.** The headline conclusion in state log section 14 ("Below the
0.745 backtest class. The horizon claim holds") survives on **one** of the four rulers, and that is the
one that is wrong for two independent reasons.

**And correcting the denominator does not save the metric.** MASE optimises for the median. Ellel's
median daily revenue is **GBP 0** (82% of days). Any near-zero forecast scores well on MASE at Ellel
under **every** ruler in the table above. The metric has to change, not the divisor. See Finding 1c and
Section 4, fix 2.

### C.3 The original two-ruler comparison, retained for the record

| venue | scale, calendar-filled | scale, trading-days-only | ratio |
|---|---|---|---|
| beer_hall | **291.2** | **610.4** | **2.10** |
| ellel | **181.3** | **780.6** | **4.31** |

With June and July 1 to 7 actuals ingested (the store state at the July confrontation), the Beer Hall
trading-days-only scale rises to **631.7**.

Which code path uses which:

| Consumer | Call | Basis | Beer Hall scale |
|---|---|---|---|
| Ladder backtest | `features/build_features.py:105` calls `read_series(..., fill_calendar=True)` | calendar-filled | 291.2 |
| June confrontation | `sim/confront_june.py:61` calls `read_series(..., fill_calendar=True)` | calendar-filled | 291.2 |
| **July confrontation** | `sim/confront_july.py:42-52`, raw SQL on `l1_daily` | **trading-days-only** | **631.7** |

`l1_daily` (`store/warehouse.py:46-58`) is a view over `line_items` grouped by venue and date. It emits
one row per **trading** date only. No calendar fill.

**Implied denominators, back-solved from the committed results:**

- **June:** MAE 478.4 / MASE 1.643 = **291.2**. Consistent with the backtest. **The comparison is valid.**
- **July:** MAE 243.5 / MASE 0.386 = **630.8**. Inconsistent with the backtest by a factor of **2.17**.

**Corrected July figures, Beer Hall:**

| Basis | MASE | Note |
|---|---|---|
| As shipped (trading-days-only, seed + June + July) | 0.386 | The headline claim: "below the 0.745 backtest class". |
| Calendar-filled, seed only (the June comparator's ruler) | **0.836** | **Above 0.745.** |
| Calendar-filled, seed + June (data available at the freeze origin: the CORRECT ruler) | **0.784** | **At the backtest class, not below it.** |

**The headline conclusion in state log section 14 ("Below the 0.745 backtest class. The horizon claim
holds: at its serving horizon the forecast is accurate") does not survive on any consistent ruler.**

**The horizon claim is separately confounded.** June was a 30-day cold horizon from a 31 May origin; July
was a 7-day horizon from a 30 June origin. Horizon length, origin recency, the taxonomy refresh and the
liveness gate all changed at once. **The candidate's own June weekly-rolling number (1.47) shows that
changing only the cadence on June data moves 1.64 to 1.47**, so horizon length is not the driver. The
improvement to roughly 0.78 in July is a month or regime effect (June carried the World Cup and summer
volatility), not evidence that the model is accurate at its serving horizon in general. n = 1 month in
each condition.

**Ellel, same defect, worse:** reported July MASE **0.07** on a forecast of **GBP 56 against GBP 445
actual** (the model missed **87%** of the revenue). On the calendar ruler that number is approximately
**0.31**. MASE on a sparse, booking-driven series with a large seasonal-naive denominator is close to
degenerate, and reporting 0.07 as a success alongside a band coverage of 1.00 is the clearest single
illustration of Findings 1, 9 and 13 together.

## Appendix D: state log against code, conflicts recorded

| State log claim | Code reality | Severity |
|---|---|---|
| Section 16: "Calibration (agent eval) / Guo et al. 2017 / ECE binned formula, temperature scaling" listed as a method **in the build**. | No ECE, no reliability diagram, no temperature scaling anywhere in `brain/`. | Major (Finding 6) |
| Section 14: "July served, 7-day: MASE 0.386 ... Below the 0.745 backtest class." | Different denominator. Corrected value approximately 0.78 to 0.84. | Fatal (Finding 1) |
| `config.py:231`: the hindcast weather basis "matches serving". | For past dates the historical-forecast API returns short-lead, near-analysis forecasts. Serving day 7 carries a 7-day-lead forecast. | Major (Finding 7) |
| `eval/chronos2_covariate_probe.md`: "Outcome: covariates HELP". | Three folds better, three folds worse, mean delta minus 0.014, against a per-fold SD of about 0.20. | Major (Finding 3) |
| Section 20 / section 17: glossary "no file created". | `GLOSSARY.md` exists at the repository root (not at `brain/GLOSSARY.md`, which is what the recommendation specified). | Cosmetic |
| Section 2: tests "269 passed / 1 skipped" in `.venv-forecast`. | Clean container without Chronos, statsforecast or prophet: 258 passed, 12 skipped, 0 failed. **Substantially verified.** | None |
| Section 2: commit tip `45588f1`. | Confirmed against the GitHub commits API. | None |
| Section 4 ladder table. | Reproduces exactly for the deterministic rungs; ETS and GBM drift with library version, and the Two River Taps winner **flips**. | Major (Finding 3) |
| Section 12: "the brain works against Ryan's read-only Neon research schema". | `INGEST_SOURCE=csv`, `LIVE_INGEST=0`; the NeonAdapter is wired and inert. The state log does say this elsewhere; the two statements should be reconciled in the dissertation. | Minor |
| `Related_Work_Chapter.tex` header: "Every empirical claim below was verified against the full paper texts in NotebookLM". | The chapter misstates Sun & Yu's theorem (Finding 16). The claimed verification pass was not thorough. | Major |
| **[NEW, 10.9b]** State log decision 13: "VAT removed from the brain entirely... closes the long-standing 'TRT VAT basis pending confirmation' item by making it moot." | Removal is true of the **compute path only**. `config.py:148-152` retains `VAT_RATE`, `VAT_INCLUSIVE_VENUES` and `vat_deflator`; `ingest/normalise.py:160` calls it on the research path; `FLAGS.md:43-45` still reads "Owner to confirm." The item was not moot. | Minor, but it is the log's own named failure mode recurring |
| **[NEW, 10.9c]** State log section 2 headline compares "0.285 ... against the 1 to 7 July window's 0.386 and the 0.745 backtest class." | Three windows, three different seasonal-naive denominators. `sim/confront_july_w2.py:87` is a third private `_seasonal_scale` over `l1_daily`. | Fatal (Finding 1) |
| **[NEW, 10.9d]** This record's own Appendix H listed `EXCLUDED_VENUES` as an active preprocessing decision. | Deleted at G15a.3; `config.py:90-95` records it "never performed" the exclusion. **The examiner propagated the same false claim the candidate had already retracted.** | Examiner error, corrected |

## Appendix E: demand-pattern classification. **[RECOMPUTED ON THE CURRENT FRAME, Round 3]**

### E.1 Current frame, ceiling 2026-07-07, tip `d40dea7`

Computed on the calendar basis (the basis the L1 forecast and its MASE actually use). Frame
dimensions reproduce the state log's own training-frame table exactly (Beer Hall 399, Ellel 392,
Two River Taps 331), which independently verifies both.

| venue | calendar days | trading days | density | ADI | CV-squared | class, **SBC cutoffs** (1.32 / 0.49) | class, **Kostenko-Hyndman** (4/3 / 0.5) |
|---|---|---|---|---|---|---|---|
| beer_hall | 399 | 301 | 75.4% | **1.3256** | 0.62 | **lumpy** | **erratic** |
| ellel | 392 | 66 | **16.8%** | **5.94** | 1.04 | **lumpy** | **lumpy** |
| two_river_taps | 331 | 280 | 84.6% | 1.18 | 0.61 | erratic | erratic |

### E.2 Finding 19 is no longer cosmetic. Beer Hall now reclassifies.

At `45588f1` the corrected constants changed no verdict, and this record said so. **On the current
frame they do.**

```
1.3200  <  1.3256  <  1.3333
SBC's       Beer      Kostenko-Hyndman's
erroneous   Hall      correct value (4/3)
cutoff
```

Beer Hall's ADI has fallen from 1.35 to 1.3256 as June and July-W1 trading days were added, and it
now sits **inside the 0.0133-wide window between the wrong cutoff and the right one**. Using SBC's
1.32 it classifies as lumpy. Using Kostenko and Hyndman's 4/3, which is the value the correcting
paper exists to establish (*"p = 4/3 (not 1.32 as given by SBC)"*), it classifies as erratic.

**Consequence for Finding 19: upgraded from cosmetic to material.** The candidate's diagnostic uses a
constant that is arithmetically wrong, and on today's data that constant decides the classification of
the anchor venue.

### E.3 Consequence for Finding 13, stated against the examiner's own argument

Finding 13 asserted that "every L1 series clears or nearly clears the intermittency boundary." On the
current frame that is **too strong for Beer Hall** and must be narrowed:

- **Ellel is unambiguously lumpy** and has become more so, not less: ADI 5.63 to **5.94**, density
  18.3% to **16.8%**, CV-squared 0.98 to **1.04**. The occurrence-modelling argument holds at full
  strength here, and Ellel is the venue it was always really about.
- **Beer Hall is borderline** and its label depends on which cutoff you take. The honest statement is
  that it sits on the intermittency boundary, not that it is inside it.
- **Two River Taps is erratic, not intermittent**, on either cutoff. Unchanged.

The Finding 13 recommendation is unaffected, because the occurrence gate was always motivated by Ellel
and by the metric behaviour (Section 10.8c), not by Beer Hall's classification. But the sentence
"every L1 series" was an overreach and is withdrawn.

### E.4 Seed-only frame, ceiling 2026-05-31, tip `45588f1`, retained as audit trail

| venue | calendar days | trading days | density | ADI | CV-squared | class (SBC) |
|---|---|---|---|---|---|---|
| beer_hall | 362 | 269 | 74.6% | 1.35 | 0.57 | lumpy |
| ellel | 349 | 62 | 18.3% | 5.63 | 0.98 | lumpy |
| two_river_taps | 331 | 280 | 84.6% | 1.18 | 0.61 | erratic |

**Boundaries used:** ADI below cutoff and CV-squared below cutoff = smooth; ADI below and CV-squared
at or above = erratic; ADI at or above and CV-squared below = intermittent; both at or above = lumpy.

**The candidate's own L3 diagnostic** (`eval/intermittency_diagnostic.md`) classifies 30 Beer Hall item
nodes over 260 trading days and finds **20 intermittent** (17 non-OTHER), ADI from 1.00 to 26.11.
Croston lost on every node that classified as intermittent. **The diagnostic was never run at L1**, and
`grep` confirms Croston and SBA are imported only in `hierarchy/reconcile.py`, gated on an L3 function.

## Appendix F: the Harvey-Leybourne-Newbold correction factor at the project's configuration

**S1\* = [ (n + 1 - 2h + h(h-1)/n) / n ]^(1/2) x S1**, compared against Student's t with (n-1) degrees of
freedom.

Evaluated at h = 7 (the project's forecast horizon):

| n folds | inner term | factor | note |
|---|---|---|---|
| 4 | 0.3750 | 0.6124 | |
| 5 | 0.0800 | 0.2828 | factor < 0.5: statistic crushed toward zero, no power |
| **6** | **0.0000** | **undefined** | **EXACTLY ZERO. S1\* = 0. The test is DEGENERATE. This is the project's configuration.** |
| **7** | **0.0000** | **undefined** | **Also exactly zero.** |
| 8 | 0.0312 | 0.1768 | factor < 0.5: no power |
| 10 | 0.1200 | 0.3464 | factor < 0.5: no power |
| 12 | 0.2083 | 0.4564 | factor < 0.5: no power |
| 16 | 0.3516 | 0.5929 | |
| 20 | 0.4550 | 0.6745 | |
| 26 | 0.5621 | 0.7498 | |
| **32** | **0.6348** | **0.7967** | HLN table: size near nominal from here |
| **34** | **0.6540** | **0.8087** | **Available with `min_train_days=120` on 362 days** |
| 40 | 0.7013 | 0.8374 | |
| 52 | 0.7655 | 0.8749 | |

**At n = 6, h = 7: 6 + 1 - 14 + (7 x 6)/6 = 6 + 1 - 14 + 7 = 0.** The correction factor is exactly zero.
The modified Diebold-Mariano statistic is identically zero regardless of the data. **It cannot reject
anything, ever.**

**Harvey et al.'s simulated size, percentage of rejections of a TRUE null at a nominal 10% level:**

| Test | n=8 | n=16 | n=32 | n=64 | n=128 | n=256 | n=512 |
|---|---|---|---|---|---|---|---|
| Original DM, N(0,1), h=1 | 16.7 | 13.5 | 11.6 | 10.9 | 10.3 | 10.6 | 10.8 |
| Original DM, N(0,1), h=2 | 30.0 | 20.3 | 15.1 | 12.4 | 11.5 | 10.9 | 10.5 |
| **Original DM, N(0,1), h=7** | **72.4** | 39.4 | 28.8 | 20.8 | 15.7 | 12.7 | 12.0 |
| Modified DM, t(n-1), h=7 | 9.9 | 18.2 | 19.5 | 16.8 | 13.6 | 11.6 | 11.4 |

The authors state that the original test is **"seriously over-sized in small and moderate samples"**, that
this becomes **"particularly acute for longer forecast horizons"**, that the smallest sample they study is
**n = 8**, that the modified test's good size at n = 8 **"could be viewed as fortuitous"**, and that its
power there is **"relatively poor"** because it is under-sized at that sample size.

## Appendix G: complete verified reference list

Every entry below was verified this examination, either by web search with authors, venue and year
confirmed, or against the full PDF in the candidate's NotebookLM notebook. **Nothing in this list is
unverified.**

**All 86 entries below are now IN the candidate's NotebookLM notebook (103 sources) unless marked otherwise. Nothing in this list is unverified.**

### Model selection and forecast evaluation
1. **Hansen, P.R., Lunde, A. & Nason, J.M. (2011).** "The Model Confidence Set." *Econometrica* 79(2), 453-497. **[In notebook. Verified: T_max and T_R statistics; moving-block bootstrap, l = 2, B = 1,000; smallest simulated n = 50, main experiment n = 250; "uninformative data yield a MCS with many models"; alpha = 0.10 and 0.25 in their applications.]**
2. **Harvey, D., Leybourne, S. & Newbold, P. (1997).** "Testing the equality of prediction mean squared errors." *International Journal of Forecasting* 13(2), 281-291. **[In notebook]**
3. **Hewamalage, H., Ackermann, K. & Bergmeir, C. (2023).** "Forecast evaluation for data scientists: common pitfalls and best practices." *Data Mining and Knowledge Discovery* 37(2), 788-832. **[In notebook. Verified: MASE optimises the MEDIAN and therefore "consider[s] constant zeros as the best prediction" on intermittent series; benchmark-scaled measures break "when the naive method gives exact zeros on zero actual values". THIS IS FINDING 1's CITATION.]**
4. **Brigato, L., Morand, R., Strømmen, K.J., Panagiotou, M., Schmidt, M. & Mougiakakou, S. (2026).** "There are no Champions in Supervised Long-Term Time Series Forecasting." *Transactions on Machine Learning Research*. arXiv:2502.14045.
5. **Meyer, M., Kaltenpoth, S., Zalipski, K. & Müller, O. (2026).** "Rethinking Evaluation in the Era of Time Series Foundation Models: (Un)known Information Leakage Challenges." arXiv:2510.13654. **[In notebook]**
6. **Aksu, T., Woo, G., Liu, J., Liu, X., Liu, C., Savarese, S., Xiong, C. & Sahoo, D. (2024).** "GIFT-Eval: A Benchmark For General Time Series Forecasting Model Evaluation." arXiv:2410.10393. **[In notebook]**

**REMOVED from this list after verification.** *Bergmeir (2024), "Fundamental limitations of foundational forecasting models"*: it is an **invited talk**, not a paper, with no citable text, and it is redundant against Tan et al. (2024), Meyer et al. (2026) and Brigato et al. (2025), all of which are in the notebook. *Kolassa (2023), "All Hail the Flatline Forecast!", Foresight 70*: real but unobtainable (paywalled two-page practitioner column, no PDF), and its page numbers disagree across indexes (62-63 in Lancaster EPrints and RePEc, 43-44 elsewhere). **Chatfield and Hayya (2007) replaces it and is stronger.**

### Metrics, intermittency and structural zeros
7. **Chatfield, D.C. & Hayya, J.C. (2007).** "All-zero forecasts for lumpy demand: a factorial study." *International Journal of Production Research* 45(4), 935-950. DOI 10.1080/00207540600622480. **[In notebook. Verified: all-zero forecasts give the lowest cost at high lumpiness; "the lowest forecasting error does not necessarily lead to the lowest system cost".]**
8. **Kolassa, S. (2016).** "Evaluating predictive count data distributions in retail sales forecasting." *International Journal of Forecasting* 32(3), 788-803. DOI 10.1016/j.ijforecast.2015.12.004. **[In notebook]**
9. **Kolassa, S. (2020).** "Why the 'best' point forecast depends on the error or accuracy measure." *International Journal of Forecasting* 36(1), 208-211.
10. **Kolassa, S. (2023).** "Do we want coherent hierarchical forecasts, or minimal MAPEs or MAEs? (We won't get both!)." *International Journal of Forecasting* 39(4), 1512-1517.
11. **Koutsandreas, D., Spiliotis, E., Petropoulos, F. & Assimakopoulos, V. (2022).** "On the selection of forecasting accuracy measures." *Journal of the Operational Research Society* 73(5), 937-954.
12. **Makridakis, S., Spiliotis, E. & Assimakopoulos, V. (2022).** "The M5 competition: Background, organization, and implementation." *International Journal of Forecasting* 38(4), 1325-1336. (RMSSE.)
13. **Cragg, J.G. (1971).** "Some Statistical Models for Limited Dependent Variables with Application to the Demand for Durable Goods." *Econometrica* 39(5), 829-844. (The original two-part / hurdle model.)
14. **Mullahy, J. (1986).** "Specification and testing of some modified count data models." *Journal of Econometrics* 33(3), 341-365.
15. **Kostenko, A.V. & Hyndman, R.J. (2006).** "A note on the categorization of demand patterns." *Journal of the Operational Research Society*. **[In notebook. Verified: the limiting ADI is p = 4/3, "not 1.32 as given by SBC"; the maximum CV-squared is 0.5, "not 0.49"; use SBA whenever v < 2 - (3/2)p. THE CANDIDATE'S DIAGNOSTIC USES THE UNCORRECTED CONSTANTS.]** **[REVIEWEE CORRECTION 2026-07-31: the selection rule is misquoted — the paper reads `v > 2 - (3/2)p`. Constants claim accepted; inequality corrected.]**
16. **Croston, J.D. (1972).** "Forecasting and Stock Control for Intermittent Demands." *Operational Research Quarterly* 23(3), 289-303. **[In notebook]**
17. **Syntetos, A.A. & Boylan, J.E. (2005).** "The accuracy of intermittent demand estimates." **[In notebook]**

### Conformal prediction
18. **Sun, S. & Yu, R. (2025).** "Conformal Prediction for Time-series Forecasting with Change Points." *NeurIPS 2025*. **[In notebook. Verified in full: Prop 4.1, Thm 4.2, Thm 4.3, Thm 4.4.]**
19. **Zaffran, M., Féron, O., Goude, Y., Josse, J. & Dieuleveut, A. (2022).** "Adaptive Conformal Predictions for Time Series." *ICML*. **[In notebook. Verified in full: AgACI, Theorem 3.1, the 2/(gamma T) bound.]**
20. **Barber, R.F., Candès, E.J., Ramdas, A. & Tibshirani, R.J. (2023).** "Conformal prediction beyond exchangeability." *Annals of Statistics* 51(2), 816-845.
21. **Gibbs, I. & Candès, E.J. (2021).** "Adaptive conformal inference under distribution shift." *NeurIPS* 34, 1660-1672. **[In notebook]**
22. **Tibshirani, R.J., Barber, R.F., Candès, E.J. & Ramdas, A. (2019).** "Conformal prediction under covariate shift." *NeurIPS* 32.
23. **Xu, C. & Xie, Y. (2023).** "Sequential Predictive Conformal Inference for Time Series." **[In notebook]**
24. **Angelopoulos, A., Candès, E. & Tibshirani, R.J. (2023).** "Conformal PID Control for Time Series Prediction." **[In notebook]**
25. **Stocker, et al. (2025).** "A Gentle Introduction to Conformal Time Series Forecasting." **[In notebook]**

### Foundation models and covariates
26. **Ansari, A.F., Shchur, O., Küken, J., Auer, A., Han, B., Mercado, P., Rangapuram, S.S., Shen, H., Stella, L., Zhang, X., Goswami, M., Kapoor, S., Maddix, D.C., Guerron, P., Hu, T., Yin, J., Erickson, N., Mutalik Desai, P., Wang, H., Rangwala, H., Karypis, G., Wang, Y. & Bohlke-Schneider, M. (2025).** "Chronos-2: From Univariate to Universal Forecasting." arXiv:2510.15821. **[In notebook. Verified in full: group attention, cross learning, full cross learning mode, ICL gains.]** 120M parameters, encoder-only.
27. **Das, A., Faw, M., Sen, R. & Zhou, Y. (2024).** "In-Context Fine-Tuning for Time-Series Foundation Models." 1 November 2024. **Authors listed in alphabetical order.** **[In notebook. THE CANDIDATE'S CITE KEY `faw_-context_2025` IS WRONG ON BOTH FIRST AUTHOR AND YEAR.]**
28. **Hoo, S.B., Müller, S., Salinas, D. & Hutter, F. (2026).** "From Tables to Time: Extending TabPFN-v2 to Time Series Forecasting." **arXiv:2501.02945v4**, 26 January 2026. **[In notebook. VERSION-PIN THIS CITE.** The same arXiv ID carried three different titles: v1 (Jan 2025) "The Tabular Foundation Model TabPFN Outperforms Specialized Time Series Forecasting Models Based on Simple Features"; v3 (May 2025) "From Tables to Time: How TabPFN-v2 Outperforms..."; v4 (Jan 2026) the current title. Much of the literature still cites the old one. Verified: 11M parameters; requires covariates in **both** history and future horizon; SOTA on covariate-informed forecasting **against its own baseline set, which does not include Chronos-2**.**]**
28a. **Hollmann, N., Müller, S., Purucker, L., Krishnakumar, A., Körfer, M., Hoo, S.B., Schirrmeister, R.T. & Hutter, F. (2025).** "Accurate predictions on small data with a tabular foundation model." ***Nature*** **637(8045), 319-326.** DOI 10.1038/s41586-024-08328-6. **[In notebook. Verified: dominant up to 10,000 samples and 500 features; beats a 4-hour-tuned GBDT ensemble in 2.8 seconds; speedup 5,140x classification / 3,000x regression. THE SMALL-DATA CITATION. The candidate has 362 observations.]**
29. **Tan, M., et al. (2024).** "Are Language Models Actually Useful for Time Series Forecasting?" *NeurIPS*. **[In notebook]**
30. **Norton, D., et al. (2025).** "Tailored Forecasting from Short Time Series via Meta-learning" (METAFORS). **[In notebook. UNUSED BY THE CANDIDATE.]**
31. **Liu, et al. (2026).** "Moirai 2.0: When Less Is More for Time Series Forecasting." **[In notebook]**
32. **Das, A., Kong, W., Sen, R. & Zhou, Y. (2024).** "A decoder-only foundation model for time-series forecasting" (TimesFM). **[In notebook]**
33. **Woo, G., et al. (2024).** "Unified Training of Universal Time Series Forecasting Transformers" (Moirai). **[In notebook]**
34. **Ansari, A.F., et al. (2024).** "Chronos: Learning the Language of Time Series." **[In notebook]**
35. **Goswami, M., et al. (2024).** "MOMENT: a family of open time-series foundation models." **[In notebook]**
36. **Rasul, K., et al. (2024).** "Lag-Llama." **[In notebook]**
37. **Garza, A., et al. (2024).** "TimeGPT-1." **[In notebook]**

### Weather covariates, ex-ante versus ex-post, and applied TSFM work
38. **Haben, S., Giasemidis, G., Ziel, F. & Arora, S. (2019).** "Short term load forecasting and the effect of temperature at the low voltage level." *International Journal of Forecasting* 35(4), 1469-1484.
39. **Hertel, M., Nikoltchovska, A., et al. (2026).** "Explainable Load Forecasting with Covariate-Informed Time Series Foundation Models." **[In notebook. Verified in full: Chronos-2 + TabPFN-TS, ERA5 as perfect forecasts, +27.0% / +31.5% MAE from covariates, SHAP with temporal and covariate masking, past load 89% / 87% importance.]**
40. **Kaas, B., Treutlein, M., Gerber, H.B., Neumann, O., Phatthanakhuha, C., Resch, O., Mikut, R. & Hagenmeyer, V. (2026).** "Probabilistic Low-Voltage Peak Load Forecasting with Time Series Foundation Models Evaluated on Application-Oriented Metrics." arXiv:2607.01966. (KIT / Netze BW. 200 real LV feeders, Chronos-Bolt vs Chronos-2 vs TabPFN-TS, weather-covariate ablation.)

### Hierarchical reconciliation
41. **Wickramasuriya, S.L., Athanasopoulos, G. & Hyndman, R.J. (2019).** "Optimal Forecast Reconciliation for Hierarchical and Grouped Time Series Through Trace Minimization." **[In notebook]**
42. **Athanasopoulos, G., Hyndman, R.J., Kourentzes, N. & Panagiotelis, A. (2024).** "Forecast reconciliation: A review." *International Journal of Forecasting* 40(2), 430-456.
43. **Cini, A., et al. (2024).** "Graph-based time series clustering for end-to-end hierarchical forecasting." **[In notebook. Verified: designed for hundreds of nodes. Three venues is not a graph.]**

### Proactive agents, intervention and evaluation
44. **Fu, et al. (2026).** "PRISM: Festina Lente Proactivity. Risk-Sensitive, Uncertainty-Aware Deliberation for Proactive Agents." **[In notebook. Verified: cost-sensitive threshold swept over a grid; the ONLY one of nine to report ECE and Brier; LLM-judge ensemble at 89.1% agreement with human annotators.]**
45. **Trinh, et al. (2026).** "HiL-Bench: Do Agents Know When to Ask for Help?" **[In notebook. Verified: simulated user, no cost elicitation, no ECE.]**
46. **Tang, et al. (2026).** "ProAgentBench: Evaluating LLM Agents for Proactive Assistance with Real-World Data." **[In notebook. Verified: annotated corpus from 500h of logs, no cost elicitation, no ECE.]**
47. **Lu, et al. (2024).** "Proactive Agent: Shifting LLM Agents from Reactive Responses to Active Assistance." **[In notebook. Verified: LLM reward model, no cost elicitation, no ECE.]**
48. **Liu, et al. (2025).** "ProactiveEval: A Unified Evaluation Framework for Proactive Dialogue Agents." **[In notebook. Verified: LLM-as-judge, no cost elicitation, no ECE.]**
49. **Liu, et al. (2025).** "CaRT: Teaching LLM Agents to Know When They Know Enough." **[In notebook. Verified: annotated corpus with oracle, no cost elicitation, no ECE.]**
50. **Gulati, et al. (2026).** "Ask Early, Ask Late, Ask Right: When Does Clarification Timing Matter for Long-Horizon Agents?" **[In notebook. Verified.]**
51. **Yang, et al. (2025).** "ContextAgent: Context-Aware Proactive LLM Agents with Open-world Sensory Perceptions." **[In notebook. Verified: human-annotated 1-5 proactive scores, threshold "user-adjustable" but never elicited, no ECE.]**
52. **Yang, et al. (2025).** "FingerTip 20K: A Benchmark for Proactive and Personalized Mobile LLM Agents." **[In notebook. Verified.]**
53. **Kumar, et al. (2026).** "Agentic artificial intelligence as a new frontier in information systems." **[In notebook]**
54. **Staufer, et al. (2026).** "The 2025 AI Agent Index." **[In notebook]**
55. **Hu, et al. (2026).** "Memory in the Age of AI Agents." **[In notebook]**
56. **Ding, et al. (2026).** "ProActor: Timing-Aware Reinforcement Learning for Proactive Task Scheduling Agents." **[In notebook]**

### Calibration, trust and human factors
57. **Guo, C., Pleiss, G., Sun, Y. & Weinberger, K.Q. (2017).** "On calibration of modern neural networks." **[In notebook. CITED BY THE STATE LOG AS A METHOD IN THE BUILD. NO ECE EXISTS IN THE CODE.]**
58. **Meyer, J. (2004).** "Conceptual Issues in the Study of Dynamic Hazard Warnings." **[In notebook]**
59. **Lee, J.D. & See, K.A. (2004).** "Trust in Automation: Designing for Appropriate Reliance." **[In notebook]**
60. **Parasuraman, R. & Riley, V. (1997).** "Humans and Automation: Use, Misuse, Disuse, Abuse." **[In notebook]**
61. **Parasuraman, R. & Manzey, D.H. (2010).** "Complacency and Bias in Human Use of Automation." **[In notebook]**
62. **Hancock, P.A., et al. (2011).** "A Meta-Analysis of Factors Affecting Trust in Human-Robot Interaction." **[In notebook]**

### Anomaly detection evaluation
63. **Kim, S., et al. (2022).** "Towards a Rigorous Evaluation of Time-series Anomaly Detection." **[In notebook. The point-adjustment critique.]**
64. **Liu, Q. & Paparrizos, J. (2024).** "The Elephant in the Room: Towards A Reliable Time-Series Anomaly Detection Benchmark." **[In notebook. VUS-PR. RECORDED AS NOT COMPUTED.]**
65. **Bhattacharya, et al. (2024).** "Towards Unbiased Evaluation of Time-series Anomaly Detector." **[In notebook]**
66. **Gim & Min (2023).** "Evaluation Strategy of Time-series Anomaly Detection with Decay Function." **[In notebook]**
67. **Adams, R.P. & MacKay, D.J.C. (2007).** "Bayesian Online Changepoint Detection." **[In notebook]**
68. **Truong, C., Oudre, L. & Vayatis, N. (2020).** "Selective review of offline change point detection methods." **[In notebook]**
69. **Siffer, A., et al. (2017).** "Anomaly Detection in Streams with Extreme Value Theory." **[In notebook]**

### Hospitality and restaurant demand
70. **Chae, et al. (2024).** "The value of data, machine learning, and deep learning in restaurant demand forecasting." **[In notebook. Verified: MAPE, structural zeros ignored entirely.]**
71. **Schmidt, et al. (2022).** "Machine Learning Based Restaurant Sales Forecasting." *Machine Learning and Knowledge Extraction* 4. **[In notebook. Verified: listwise deletion in multiples of 7 days; MAE, sMAPE, gMAE; noise added when the error is exactly zero.]**
72. **Hossain & Parvin (2025).** "A comparative study of various statistical and machine learning models for predicting restaurant demand." **[In notebook. Verified: Croston at product level only; venue closures ignored; "no data preprocessing was necessary".]**

### LLM-as-judge
73. **Zheng, L., et al. (2023).** "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena." **[In notebook]**
74. **Wang, P., et al. (2023).** "Large Language Models are not Fair Evaluators." **[In notebook]**
75. **Panickssery, A., et al. (2024).** "LLM Evaluators Recognize and Favor Their Own Generations." **[In notebook]**
76. **Bavaresco, A., et al. (2025).** "LLMs instead of Human Judges." **[In notebook]**
77. **Thakur, et al. (2025).** "Judging the Judges." **[In notebook]**
78. **Gu, et al. (2026).** "A survey on LLM-as-a-judge." **[In notebook]**

### Agent architecture
79. **Park, J.S., et al. (2023).** "Generative Agents: Interactive Simulacra of Human Behavior." **[In notebook. The memory-stream citation. NO MEMORY STREAM EXISTS IN THE BUILD.]**
80. **Yao, S., et al. (2022).** "ReAct." **[In notebook]**
81. **Shinn, N., et al. (2023).** "Reflexion." **[In notebook]**
82. **Schick, T., et al. (2023).** "Toolformer." **[In notebook]**
83. **Packer, C., et al. (2024).** "MemGPT." **[In notebook]**
84. **Chhikara, et al. (2025).** "Mem0." **[In notebook]**

---

## Appendix H: full data provenance record

### H.0 CURRENT FRAME, ceiling 2026-07-07, tip `d40dea7`. **[RECOMPUTED, Round 3]**

The seed CSV is the bootstrap only. June and July-W1 actuals are ingested from committed held-out
evaluation artefacts by `sim/restore_clock.py`, which advances the operational clock to 2026-07-07 and
asserts the 8 to 14 July window is still empty. Reproduced in a clean worktree: ceiling 2026-07-07,
25 June days, 7 July-W1 days, **0 held-out rows**.

| venue | L1 rows (trading days) | net ex-VAT GBP | span |
|---|---|---|---|
| beer_hall | 302 | 233,582.08 | 2025-06-04 to 2026-07-07 |
| ellel | 68 | 47,065.86 | 2025-06-08 to 2026-07-04 |
| two_river_taps | 280 | 143,308.43 | 2025-06-12 to 2026-05-08 |

**On the reconciliation figure, stated carefully so it is not misread.** The `RECONCILE_TOL` gate runs
at ingest against the seed CSV alone and passes there at GBP 202,087.69 against an audit target of
202,491.00, a delta of **GBP 403.31** (Finding 11, unchanged). The 233,582.08 above is the
clock-advanced total and includes June and July-W1 trade. **These are two different quantities and the
audit target does not apply to the second.** No reconciliation failure is implied or claimed.

**Two River Taps net has moved** from 171,970.12 (raw, VAT-inclusive) to 143,308.43, which is the
deflated `revenue_exvat` figure: 171,970.12 / 1.2 = 143,308.43 exactly. That arithmetic is now
confirmed correct on evidence at Section 10.9a.

### H.1 Seed-only frame, retained as audit trail

**Source.** One Square POS CSV export, UTF-16LE, tab-separated. `brain/data/items-2024-01-01-2026-06-01.csv`.

| Property | Value |
|---|---|
| Source rows | 92,329 |
| Kept rows | 92,329 |
| Dropped rows | 0 |
| Date span | 2025-06-04 to 2026-05-31 |
| Null rates | 0.0 across qty, net_sales, gross_sales, discounts, tax, ts |

**Per-venue row counts (all match `EXPECTED_ROW_COUNTS`):**

| Venue | Rows | Net GBP |
|---|---|---|
| The Beer Hall (`beer_hall`) | 47,644 | 202,087.69 |
| Two River Taps (`two_river_taps`) | 33,993 | 171,970.12 |
| Ellel Village Hall (`ellel`) | 10,489 | 44,282.75 |
| Events (`events`) | 203 | 1,438.74 |

**Preprocessing decisions:**

- `EXCLUDED_VENUES = frozenset({"events"})`. The `events` location (203 rows, GBP 1,438.74) is flagged
  `excluded = True` in `ingest/normalise.py:162` and dropped from all modelling. This is a fourth
  location in the data that the project does not model. Immaterial by value, but it should be stated in
  the dissertation.
- `VAT_RATE = 0.20`; `VAT_INCLUSIVE_VENUES = frozenset({"two_river_taps"})`. Two River Taps net sales are
  divided by 1.2 to reach a common ex-VAT basis. **CONFIRMED CORRECT on internal evidence** (Section 10.9):
  TRT books zero tax on all 33,993 rows, and across 80 items sold at both venues the median TRT price equals
  the Beer Hall **gross** price at a ratio of 1.0000. The customer pays the same at both venues; TRT's till
  books the whole payment as Net Sales because that location has no tax configured. Beer Hall taxed
  rows give `tax/net = 0.2000` exactly. **Basis decision (confirmed by the candidate, 2026-07-20): the
  modelling target remains `revenue_exvat`.** Gross is not recoverable from an L1 ex-VAT forecast by a fixed
  multiplier, because Beer Hall's blended `tax/net` is 0.18 rather than 0.20 (zero-rated lines), so the
  correct factor moves with each day's taxable mix. If gross takings are wanted operationally they belong in
  the briefing display layer, derived from the `Tax` column at item grain, not in the target.
- `RECONCILE_TOL = 0.01`; `BH_NET_SALES_TOTAL = 202491.0`. Computed 202,087.69. **Delta GBP 403.31 (0.2%),
  passes the gate, never explained** (Finding 11).
- `EXPECTED_TOTAL_ROWS = 92329`. Matches exactly.
- Calendar fill: `read_series(..., fill_calendar=True)` inserts zeros for non-trading days. **The `l1_daily`
  view does not.** This is the origin of Finding 1.

**Splits.** Rolling origin, expanding window, `n_folds=6`, `horizon_days=7`, `min_train_days=120`. Test
folds cover 2026-04-20 to 2026-05-31 only (Appendix B). `assert_no_leakage` runs on every fold and
demonstrably fires.

**Class balance (detection).** There are **no real anomaly labels at all**. The injected corpus at scale
is N = 644: spike 288, regime shift 252, exogenous 84, stock 20. Human anchor: **N = 0**. The single real
change point in the data is the Two River Taps closure (n = 1), against which BOCPD was validated.

**Seeds.** `EVAL_SCALED_SEED = 93` for the day sampler; `random_state = 0` in the GBM and KMeans;
`default_rng(13)` in the change-point evaluation. No single global seed policy. Chronos-2 quantile
inference is deterministic, so multi-seed variance is largely not applicable to the forecaster. The
GBM rungs are single-seed only, but the gaps there (0.920 to 0.936 against 0.745) are large enough that
seed variance would not flip them. **Low severity. The reproducibility failure is dependency pinning, not
seeds** (Finding 3).

**Environment.** Three virtual environments (`.venv-forecast` on Python 3.12, `.venv` on 3.14, an eval
venv on 3.12). All requirements files use `>=` bounds. **No lockfile is committed.** The Chronos-2 model
*id* is pinned; the *weights revision* is not.

---

## Appendix I: the Model Confidence Set at this project's scale. **[NEW, Section 10.8]**

### I.1 What the MCS needs, from the paper

| Property | Hansen, Lunde and Nason (2011) |
|---|---|
| Statistics | T_max,M = max_i t_i-dot ; T_R,M = max_{i,j} \|t_ij\| |
| Elimination | e_max,M = argmax_i t_i-dot ; e_R,M = argmax_i sup_j t_ij |
| Bootstrap | **Moving-block**, l = 2, B = 1,000 in their simulations |
| Smallest n simulated | **50** |
| Main simulation n | **250** ("approximates sample sizes often available for model selection exercises in macroeconomics") |
| alpha used in applications | **0.10 and 0.25** |
| Behaviour on weak data | Returns **many** models. Explicitly framed as a strength. |

### I.2 What the candidate can reach

`eval/harness.py:76-99` steps the origin by `horizon_days`. Adding a `step_days` parameter changes the
ceiling:

| step | origins on 362 days (min_train 120, h 7) | HLN factor | Diebold-Mariano | Model Confidence Set |
|---|---|---|---|---|
| current config (`n_folds=6`) | **6** | **0.0000** | **Degenerate. Zero for any data.** | Bootstrap not credible |
| step = 7 (`n_folds=34`) | **34** | 0.8087 | Computable | Below their smallest simulated n (50) |
| **step = 1** | **236** | **0.9725** | **Valid** | **Valid. Inside their main simulation range.** |

Cost of the 236-origin ladder: about 7,000 Chronos-2 inference calls (10 models x 236 origins x 3
venues) at 0.6 seconds on CPU, so roughly an hour on the Mac and minutes on the A2000.

### I.3 The pre-registration the candidate should write before running it

1. Loss: **RMSSE** per origin (Section 4, fix 2), with MASE reported as a labelled secondary.
2. Statistic: **T_R** (range), which is the more conservative of the two.
3. Bootstrap: **moving-block**, block length **l >= 7** (the horizon, because the step-1 origins overlap
   and the loss differentials are serially correlated), **B = 1,000**.
4. Level: **alpha = 0.10**, with alpha = 0.25 reported alongside. **Pre-register both, before running.**
5. Predicted outcome, written down in advance: *the 90% MCS at Beer Hall will contain more than one
   model.*

Writing point 5 down before the run, and committing it, converts a wide confidence set from an
embarrassment into a confirmed prediction. That is the same pre-registration discipline the candidate
already applies to the forecast freezes, and it is the strongest thing in the project.

---

## Appendix J: verification and revision log

Every change made to this record after its first consolidation, with the evidence that forced it.
A record that does not log its own revisions cannot be audited.

### J.1 Revision rounds

| Round | Date | Trigger | Net effect |
|---|---|---|---|
| R1 | 2026-07-14 | First consolidation at tip `45588f1` | 18 findings, 5 examiner corrections, 84 references |
| R2 | 2026-07-14 | 21 papers added to NotebookLM (79 to 103 sources) | Finding 19 added; Findings 1, 3, 4 strengthened; Corrections 6 and 7 issued; Appendix I added; reference list to 86 |
| **R3** | **2026-07-20** | **State log 2026-07-20 edition retrieved; repo advanced to `d40dea7`** | **Finding 12 rewritten on evidence; new Appendix D rows; Section 10.9 added; two examiner errors self-corrected** |

### J.2 Round 3, item by item

| # | Item | Verdict | Evidence | Status |
|---|---|---|---|---|
| 1 | State log location | Not on the mounted filesystem; retrievable only through the project knowledge index | Direct `ls` and a filesystem-wide `find` both return nothing for `PRJ93_Master_State_Log.md` | Resolved, retrieved |
| 2 | Baseline currency | Record built at `45588f1` / ceiling 2026-05-31; project at `d40dea7` / ceiling 2026-07-07 | 427 files changed, 21,218 insertions, 42,095 deletions | Section 0.1a added |
| 3 | Finding 12, TRT VAT | **Assumption correct.** Finding rewritten to target the resolution method | 80-item cross-venue price comparison, median ratio 1.0000 against Beer Hall gross; TRT tax zero on 33,993 rows; Beer Hall taxed rows `tax/net = 0.2000` | Rewritten, Section 10.9a |
| 4 | Modelling basis | Target remains `revenue_exvat` | Confirmed by the candidate 2026-07-20. Gross is not recoverable from an L1 ex-VAT forecast by a fixed multiplier: Beer Hall blended `tax/net` is 0.18, not 0.20 | Closed |
| 5 | TRT flag status | **CLOSED ON INTERNAL EVIDENCE** | Candidate confirmation 2026-07-20 on the evidence at 10.9a | Closed |
| 6 | State log decision 13 | Over-claim. VAT removal is compute-path only | `config.py:148-152`, `ingest/normalise.py:160`, `FLAGS.md:43-45` against `compute/contract.py:221-223` | New Appendix D row |
| 7 | Finding 1 at current tip | **Strengthened.** Defect propagated into new code | `sim/confront_july_w2.py:87, 92, 152` | Section 10.9c |
| 8 | Findings 3, 4, 6, 14 | All stand at `d40dea7` | `eval/harness.py:78`; no ECE in tree; `models/foundation.py:228, 319, 325` | Section 10.9c |
| 9 | **Examiner error, then a second examiner error correcting the first** | Round 3 flagged Finding 2's "only Anthropic import" sentence as false. **The flag was wrong.** The grep matched report prose at `eval/agent_eval.py:974-975`, not an import. Original sentence reinstated | `eval/judge.py` is the only importer; verified by caller trace | **Correction withdrawn**, 10.9d item 1 |
| 9a | `eval/agent_eval.py` role | **Evaluator. Finding 2 STANDS.** Nothing in `signals/`, the API or `compute/` imports it; `briefing._score` is still six constants; judge triple-gated and never run (N=0, no kappa) | Section 10.9e | Closed |
| 9b | Two credits added | Judge anti-fabrication gating; `test_agent_eval_imports_briefing_and_signals_one_way` pins dependency direction | Section 10.9e | Applied |
| 10 | Examiner error: Appendix H | This record asserted `EXCLUDED_VENUES` is active; it was deleted and never worked | `config.py:90-95` | Corrected, 10.9d. Appendix edit pending |
| 11 | Appendices C, E, H | **Recomputed on the 2026-07-07 frame**, seed-frame tables retained as audit trail | Store rebuilt in a clean worktree at `d40dea7`; frame dimensions reproduce the state log exactly (BH 399, Ellel 392, TRT 331) | Applied, candidate decision (a) |
| 12 | **Finding 19 upgraded Minor to Major** | Beer Hall ADI is now **1.3256**, between SBC's 1.32 and the correct 4/3 | The wrong constant now decides the anchor venue's classification | Applied, Appendix E.2 |
| 13 | **Finding 13 narrowed against the examiner** | "Every L1 series clears or nearly clears the boundary" is too strong | Beer Hall is borderline; Ellel is unambiguously lumpy and has become more so (ADI 5.63 to 5.94) | Applied, Appendix E.3 |
| 14 | Finding 1 confirmed by reproduction | Ruler (b) yields MASE **0.385** against the published 0.386 | Confirms the published figure uses the trading-only lag-7 denominator | Applied, Appendix C.0 |

### J.3 Standing methodological note

Item 10 deserves to be stated plainly rather than buried. **This record reproduced a false claim that
the candidate had already found and retracted.** The examiner read `EXCLUDED_VENUES` in `config.py` at
tip `45588f1`, took it at face value as an active preprocessing step, and wrote it into a data
provenance appendix. The candidate had by then measured that the constant performed nothing, deleted
it, and recorded that it had propagated a false claim into a committed artefact.

The lesson generalises to the assessment method itself: reading a constant is not verifying that it
executes. The same discipline this record demands of the candidate in Finding 6, where the state log
lists ECE as a built method and no ECE exists, applies in reverse here.

### J.4 Open at the close of round 3

| # | Item | Blocking |
|---|---|---|
| 1 | ~~Recompute Appendices C, E, H~~ | **CLOSED.** Recomputed, Round 3 |
| 2 | Whether section 22 citation errors propagate to the Related Work chapter | Candidate decision |
| 3 | ~~Role of `eval/agent_eval.py`~~ | **CLOSED.** Evaluator. Finding 2 stands (10.9e) |
| 4 | Zotero local API disabled; `ref.bib` authorised as fallback, limitation recorded here | Environment |
| 5 | ~~Chapter verification-log sentence~~ | **CLOSED.** Withdrawn on candidate instruction, 2026-07-20 |
| 6 | ~~Section 22 fidelity-audit citations~~ | **CLOSED, NOT PURSUED.** See J.5 |

**Zotero limitation, recorded as instructed.** The Zotero local API returned HTTP 403 ("Local API is
not enabled") throughout round 3. Citation records were therefore checked against `ref.bib` in the
Overleaf project rather than against the Zotero library itself. `ref.bib` is an export, so any
divergence between the Zotero entry and the exported entry would not be detected by this pass.

### J.5 An examiner error of scope, and the rule adopted because of it

Round 3 raised four rows of the state log's section 22 fidelity audit as citation problems: Vovk and
Angelopoulos & Bates for split conformal, Xu & Xie (2021) for EnbPI, and Page (1954) for CUSUM, none
of which are in the NotebookLM notebook, against section 22's own statement that "every paper claim
traces to the NotebookLM notebook."

**Not pursued, and the raising of it was an error of scope.** Three reasons, and the candidate was
right to challenge it.

1. **The state log is an internal working document.** No examiner reads it. Holding its internal
   quality-control note to submission standard is a category error.
2. **All four attributions are substantively correct.** Vovk for split conformal, Angelopoulos and
   Bates for the standard introduction, Xu and Xie (2021) for EnbPI, Page (1954) for CUSUM. Nothing is
   misattributed. No examiner requires proof that a candidate holds the PDF of a 1954 *Biometrika*
   paper before citing it for the method it introduced. Requiring a notebook entry for a classic
   citation is a standard this examiner invented and then enforced.
3. **None of the four is cited in the chapter.** `chapters/literature_review.tex` uses
   `gibbs_adaptive_2021`, `xu_sequential_2023`, `angelopoulos_conformal_2023` and `stocker_gentle_2025`
   for conformal, and `adams_bayesian_2007`, `truong_selective_2020`, `truong_ruptures_2018` and
   `siffer_anomaly_2017` for change point. The submitted artefact is untouched by any of it.

One item of housekeeping survives with no marks attached: section 22 attributes Chronos-2 to Ansari et
al. **2024**, which is the Chronos-1 paper. Chronos-2 is Ansari et al. **2025**, arXiv:2510.15821. Both
papers are in the notebook. The chapter already cites `ansari_chronos-2_2025` correctly, so this is a
one-character fix in an internal file and is recorded here rather than raised as a finding.

**Rule adopted for the remainder of this assessment.** *A defect that cannot be seen by a reader of the
submitted dissertation is hygiene, not a finding, and will not be raised as a gate.* This rule is
recorded because the assessment had until this point been applying submission standards to internal
artefacts, and that inflates findings without informing the mark.

**What the check produced instead, and it is worth more than what it dropped:** section 22 records
CUSUM as the production detector and BOCPD as benchmark only, while the chapter treats BOCPD at length
and never mentions CUSUM. Added to Section 7.4.

### J.6 Overleaf propagation, 2026-07-20

Target confirmed as `chapters/literature_review.tex` (there is no file named
`Related_Work_Chapter.tex` in project `6a11ac2180bb716e3c2491c4`). Pushed in one commit:
"Related Work: correct CPTC guarantee statement, ground the production detector (CUSUM), and
reposition the synthesis against PRISM".

**Precondition resolved first.** `ref.bib` was found stale at 79 entries, holding none of the 21
papers added to Zotero and NotebookLM. The candidate refreshed it through Overleaf's Zotero
integration rather than re-exporting, which was the correct choice: the project uses a full-library
import whose keys are generated by Zotero's web API, and a Better BibTeX export would have produced a
different key format and broken roughly sixty existing citations at once. After refresh: **105
entries**, all 21 present.

| # | Finding | Edit made | Citations used |
|---|---|---|---|
| **16** | The chapter claimed CPTC gives "a band whose coverage is guaranteed even as the venue's regime shifts" | Replaced with what the paper proves: exact finite-sample coverage only under exchangeability, which a change point violates by construction; time-averaged asymptotic validity resting on a stationary distribution of states; faster post-shift convergence than ACI, described by the authors as shortening rather than removing the miscoverage period; and residual risk concentrated in the state-misclassification rate. A second paragraph draws the design consequence: prefer an observed regime variable over an inferred one, because a venue's trading status is recorded rather than latent, which drives the misclassification term to zero. This converts the passage from a false claim into the argument for the liveness gate. | `sun_conformal_2025`, `barber_conformal_2023` |
| **17** | The synthesis claimed an unoccupied intersection PRISM already occupies, and the section was titled "The Unoccupied Intersection" | Section retitled "What the Literature Leaves Open". PRISM is now named as prior art for cost-sensitive intervention and for reporting the calibration of its own acceptance probabilities, and the chapter states plainly that no claim of methodological novelty in cost-sensitive intervention is available to it. The contribution is restated as field instantiation: the cost ratio fixed to the stated preferences of the person who bears the cost, and the decisions scored against that person's own accept-or-dismiss judgements, which none of the surveyed systems attempts. | `fu_prism_2026`, `barber_conformal_2023` |
| **18** | Cite key `faw_-context_2025`, wrong first author | **Already resolved by the candidate** in Zotero before this pass. Key regenerated to `das_-context_2025` and both occurrences in the chapter now carry it. No examiner edit required. |
| **7.4** | CUSUM, the production detector, absent from the chapter | Added to the deviation section, positioned through the Truong reduction as the sequential counterpart to the offline cost functions, with BOCPD named as the offline benchmark it is scored against. Grounded in `truong_selective_2020` because Page (1954) is in neither Zotero nor the notebook. | `truong_selective_2020` |
| **7.4** | Chronos-2, the served model, cited once inside a parenthetical pile | Removed from the pile and given its own paragraph covering group attention, cross-series learning at inference, the cold-start and short-history conditions the authors identify, and covariate support. TabPFN-TS and TabPFN added as the small-N comparators, with the estate's scale placed explicitly inside TabPFN's stated regime. | `ansari_chronos-2_2025`, `hoo_tables_2026`, `hollmann_accurate_2025` |
| **1, 13** | Nothing in the chapter governed the choice of MASE | New closing paragraph in the rhythm section: absolute-error measures optimise for the median, which makes a constant zero look best on intermittent series; benchmark-scaled measures deflate when the naive benchmark scores exact zeros on zero actuals; M5 answered this with squared scaled errors. Pre-registers the metric argument the methodology chapter needs. | `hewamalage_forecast_2023`, `makridakis_m5_2022`, `koutsandreas_selection_2022`, `kolassa_why_2020` |
| **8.B** | Reconciliation and adaptive conformal presented without their costs | Two sentences added: coherence and minimal error cannot both be optimised, so the choice is the analyst's; and adaptive conformal degrades efficiency in proportion to its step size on exchangeable scores, so adapting to a shift that never arrives is worse than not adapting. | `kolassa_we_2023`, `athanasopoulos_forecast_2024`, `zaffran_adaptive_2022` |

**Post-write validation.** The chapter was read back and every citation checked against the refreshed
bibliography: **72 keys used, 105 entries available, zero undefined citations.** Eleven papers are
newly cited by this pass and all eleven resolve. Zero em-dashes and zero en-dashes in the added prose;
the writing standards grep passes.

**Not done, and why.** Page (1954) is absent from Zotero, so CUSUM is grounded in the Truong survey
rather than its originating paper. If the candidate adds Page to Zotero and refreshes, one sentence
should be re-pointed. This is the only item left open by the Overleaf pass.


### J.7 Second Overleaf pass, 2026-07-20

Three sources added by the candidate (Page 1954, Xu and Xie 2021, Angelopoulos and Bates 2023) and
`ref.bib` refreshed to **108 entries**. Vovk, Gammerman and Shafer could not be obtained and is not
cited. All three additions were verified through NotebookLM against the source PDFs before any text
was written, on the candidate's explicit instruction.

**A silent citation error was introduced by the refresh itself and is now fixed.** Adding Angelopoulos
and Bates caused Zotero to regenerate keys, with this result:

| key | resolves to |
|---|---|
| `angelopoulos_conformal_2023` | **"Conformal Prediction: A Gentle Introduction"** (the newly added paper) |
| `angelopoulos_conformal_2023-1` | **"Conformal PID Control for Time Series Prediction"** (the paper the chapter had been citing) |

The chapter's conformal paragraph cited `angelopoulos_conformal_2023` for PID control. After the
refresh that key pointed at a different paper. **The document still compiled and no warning was
raised**, because both keys resolve. Corrected to `angelopoulos_conformal_2023-1`.

This is worth recording as a standing hazard rather than a one-off. Refreshing a Zotero-linked
bibliography can silently repoint an existing key when a new entry collides with it, and the failure
is invisible to the compiler. **After every refresh, check any key whose stem matches a newly added
work.**

**Content verified before writing, with exact source text:**

| Source | Verified | Used for |
|---|---|---|
| **Page (1954)** | Cumulative score `S_n = sum x_k`; one-sided rule "Take action if `S_n - min S_i >= h`"; two-sided variant; and the ARL definition, "the expected number of articles sampled before action is taken", which "is a measure of the expense incurred by the scheme when it gives false alarms, i.e. Type I errors" under stable quality and "measures the delay ... before the rectifying action is taken, i.e. Type II errors" under poor quality | Grounds CUSUM as the production detector, and links the detection section to the evaluation section's asymmetric-cost argument |
| **Xu and Xie (2021), EnbPI** | "does not require data exchangeability"; "requires neither data-splitting nor training multiple ensemble estimators"; "finite-sample, approximately valid marginal coverage ... for time-series with strongly mixing stochastic errors"; calibration "by updating past residuals using a sliding window of size T" without refitting | Corrects the rolling-calibration citation, which previously pointed only at SPCI (2023), a method the project did not build |
| **Angelopoulos and Bates (2023)** | Four-step split conformal construction; two-sided guarantee `1 - alpha <= P(Y in C) <= 1 - alpha + 1/(n+1)`; holds under i.i.d. and "also holds if the observations satisfy the weaker condition of exchangeability"; upper bound requires continuous joint score distribution | Defines split conformal in the chapter for the first time, and supplies the upper bound that turns Finding 9 from a judgement into a violated theorem |

**One precision point recorded so it is not lost.** EnbPI explicitly avoids data splitting, and this
project uses split conformal. What was adapted is the **sliding-window residual update that
recalibrates without refitting**, not the bootstrap-ensemble construction. The chapter now says this
rather than implying the whole method was taken. State log section 22's verdict of "Adapted" is
correct; the chapter should not overstate it.

**Post-write validation.** 75 cite keys used, 108 entries available, **zero undefined citations**.
Zero em-dashes and zero en-dashes. Writing standards grep passes.

**Unresolved.** Vovk, Gammerman and Shafer (2022, second edition, DOI 10.1007/978-3-031-06649-8)
remains unobtainable. The chapter does not cite it and does not need to, since split conformal is now
defined through Angelopoulos and Bates. If the fidelity audit is submitted as an appendix, its "Split
conformal band / Vovk; Angelopoulos & Bates" row should be narrowed to the source actually held.

---

## Appendix K: remediation programme, status as at 2026-07-21

This appendix exists so that the record is self-sufficient for handoff. Everything below happened
after the assessment body was written, and it changes the status of several findings without changing
the findings themselves.

### K.1 Programme shape

Ten packages, four to six hours each, one package per sitting, each quality-checked against the
committed repository before the next begins. Deadline 2026-09-04 16:00. Build window closes about
2026-08-21 to leave fourteen days for writing.

| # | Package | Status | Commit |
|---|---|---|---|
| S0 | Three asks to Elliot, one to James | **Sent 2026-07-21** | n/a |
| S1 | Metric integrity: one scale function, RMSSE, Winkler, width | **Complete** | `0b302ec`, follow-ups `fccf017` |
| S2 | Fold count: `step_days`, ladder at 273 / 260 / 205 origins | **Complete** | `91f4a9c`, follow-ups `34a1779` |
| S3 | Model Confidence Set, environment pinning, store durability | **Complete** | `8525395` |
| S4 | Intermittency constants, scale basis bootstrap, occurrence gate | **Spec issued, not run** | |
| S8 | Agent, cost threshold, ECE and Brier | **Promoted ahead of S5 to S7** | |
| S5 | Multi-venue group in-context learning | Queued | |
| S6 | Lead-matched weather ablation | Queued | |
| S7 | Four-way conformal comparison | Queued | |
| S9 | Labels, judge, kappa | Blocked on Elliot | |

**S8 was promoted** because it addresses a Fatal while S5 to S7 address Majors, and because its build
half needs nothing from Elliot. PRISM itself sweeps the cost ratio over a grid rather than using a
single elicited value, so the agent can be built and evaluated across a swept threshold now, with
Elliot's number selecting a point on that curve if and when it arrives. That removes the only hard
scheduling dependency in the plan.

### K.2 Finding status after S1 to S3

| # | Severity | Status as at 2026-07-21 |
|---|---|---|
| 1 | Fatal | **Remediated.** One scale function in `eval.harness` with a required `basis` argument taking four documented values. Three private implementations deleted. The published July W1 figure of 0.386 reproduced at **0.385** on `trading_lag7`, confirming the diagnosis by reproduction rather than inference. On the backtest's own basis the same forecast is **0.772** against a backtest of 0.745, so it came in slightly worse than its backtest class, not better. |
| 2 | Fatal | **Open.** Re-verified at `d40dea7`: nothing in `signals/`, the API or `compute/` imports an evaluator; `briefing._score` remains a product of six constants; the judge is triple-gated and has never run. S8 addresses the build half, S9 the evidence half. |
| 3 | Major | **Remediated.** HLN correction factor lifted from exactly zero to 0.9762 / 0.9750 / 0.9683 at 273 / 260 / 205 origins. Model Confidence Set run with pre-registered parameters. **Every served model sits inside its own 90 percent set.** |
| 4 | Major | **Remediated.** Evidence base lifted from 42 consecutive days to 273 / 260 / 205 rolling origins. |
| 5 | Major | Open. Injection corpus still perturbs the residual stream. |
| 6 | Major | Open, and sharpened. The instrument is not merely built but gated against self-deception and pinned by tests, and has never been run. |
| 7 | Major | Open. Lead-matched weather remains unused. S6. |
| 8 | Major | Open. |
| 9 | Major | **Partly remediated.** Winkler and mean width now emitted on every confrontation. **Formally grounded**: Angelopoulos and Bates bound coverage on both sides, so the reported 1.00 exceeds the upper bound rather than merely being conservative. |
| 10 | Major | Open. S5. |
| 11 | Minor | Open. The GBP 403.31 delta is unexplained. |
| 12 | Minor | **Closed on internal evidence.** See Section 10.9a. |
| 13 | Major | **Narrowed.** Ellel is unambiguously lumpy and has become more so. Beer Hall is borderline. The "every L1 series" claim is withdrawn. S4 addresses the occurrence gate. |
| 14 | Major | Open. `"id": "l1"` still at three sites. S5. |
| 15 | Major | Open and **blocked**. The Ellel diary has not arrived. S4 builds an inert seam. |
| 16 | Major | **Remediated in the chapter.** |
| 17 | Major | **Remediated in the chapter.** |
| 18 | Minor | **Remediated by the candidate** before the examiner pass reached it. |
| 19 | Major | Open. S4. |

**Reproducibility, which was not numbered as a finding, is now closed.** Per-venv lockfiles with full
`==` pins, exact torch and Chronos revision pins, and a recorded resolution under which the committed
six-fold tables reproduce to the digit.

### K.3 New findings produced by the remediation

**A scaled metric needs two coordinates, not one.** S1 established that a MASE requires both a stated
basis and a stated `as_of`, because the in-sample denominator grows with the store. The original
June-versus-July comparison was confounded on **both** axes. `venue_ruler(as_of=)` now reconstructs
the committed June figures exactly. Two River Taps, closed since 2026-05-08 and therefore frozen, is
a natural control that reproduces identically at any ceiling, which isolates store growth from code
change. That control is now a standing technique in this project.

**The six-fold gate demonstrably gave the wrong answer, and the large sample recovered the served
one.** At the current ceiling the 42-day six-fold window at Beer Hall selects `rung1_robust_dow` and
ranks the served `rung4_chronos2_exo` fifth. At 273 origins `chronos2_exo` returns to first. This is
the cleanest empirical demonstration in the project: the methodology criticism lands in full and the
engineering decision is vindicated, with evidence for both. **It belongs in the Discussion.**

**Paired variance is why the test can discriminate at all.** The marginal standard errors near 0.029
made the 0.036 top-of-ladder gaps look untestable. The rungs are strongly correlated across folds, so
the paired differential standard deviation is far smaller: a ratio of 0.16 to 0.27 at Beer Hall,
implying a paired standard error near 0.007 to 0.011. Differential autocorrelation decays to
approximately zero by lag 7, which justifies the block length empirically. Sensitivity confirms l = 2
is too short and produces spuriously narrow sets.

**The Ellel June covariate gap is upstream, not a join defect (`FLAG-ELLEL-JUNE-EXO`).** A nine-day hole from 2026-06-21 to
06-29 exists across all three weather bases for Ellel and for no other venue through the identical
join. A nine-day hole plus a six-day lookback, truncated by the frame end, gives exactly the fourteen
missing folds observed. S6 owns the fetch-layer repair.

**The wide confidence sets are the result, not a failure.** At Beer Hall five of nine rungs are
retained at 90 percent, at Two River Taps four of nine, at Ellel five of nine on the common-fold
alignment and three of nine on the full one. The data separates the clearly worse rungs and cannot
separate the foundation models from the served incumbents. The defensible sentence is that the served
choice rests on cold-start capability and inference cost rather than demonstrated accuracy
superiority.

### K.4 Errors by the examiner, found during remediation

Recorded because a record that hides its own revisions is worth nothing.

| # | Error | Caught by |
|---|---|---|
| 1 | `EXCLUDED_VENUES` written into Appendix H as an active preprocessing step. It was deleted at G15a.3 and never performed the exclusion. The examiner reproduced a false claim the candidate had already retracted. | Round 3 re-verification |
| 2 | Finding 2's "only Anthropic import" sentence flagged as false. **The flag was wrong**: the grep matched report prose at `eval/agent_eval.py:974-975`, not an import. Correction withdrawn. | S3 caller trace |
| 3 | Section 22 fidelity-audit citations raised as findings. **Error of scope**: the state log is internal, no examiner reads it, and all four attributions are correct. Rule adopted at J.5. | Candidate challenge |
| 4 | S1 gate G2 quoted 301 / 66 trading days against the store's 302 / 68. Two definitions from two appendices of this record. | S1 |
| 5 | S2 gate G2 quoted 266 Ellel origins against 260. `read_series` calendar span rather than `build_features` after `trim_to_active`. Frame is 386, not 392. | S2 |
| 6 | S2's corrected G1 regex `def [_a-z]*(scale\|denom)` cannot cross the digit in `_l2_actuals_and_scale`, so it missed the function it was written to catch. | S2 |
| 7 | The S1 report-back block ordered `restore_clock` before `pytest`, leaving the store reset. | S1 |
| 8 | **Confirmed and withdrawn, S4 Part 5.** Appendix A claimed the Two River Taps winner flips on a library bump. Tested under the rerun's own resolution: ETS is **0.597, not 0.617**, and still wins. ETS is a statsmodels model and statsmodels was identical in both runs, so the claimed value was not obtainable from any library difference. A harness artefact. The reproducibility finding survives; the illustration does not. |

Errors 4, 5 and 6 are one pattern: gate figures reconstructed from the store rather than by calling
the function the code calls. Three definitions of frame length legitimately disagree in this
repository. From S4 onward every gate figure is derived by running the code's own function.

### K.5 Chapter edits pushed to Overleaf

Target confirmed as `chapters/literature_review.tex`. There is no file named
`Related_Work_Chapter.tex`. Two commits.

`ref.bib` was found stale at 79 entries holding none of the 21 papers added to Zotero and NotebookLM.
Refreshed through Overleaf's Zotero integration to 105, then to 108 after Page, Xu and Xie 2021, and
Angelopoulos and Bates were added. **The refresh must be done with the Refresh button, never a fresh
Better BibTeX export**: the project uses a full-library import whose keys come from Zotero's web API,
and a desktop export would produce a different key format and break roughly sixty citations at once.

**A silent citation error was introduced by the second refresh and fixed.** Adding Angelopoulos and
Bates caused key regeneration: `angelopoulos_conformal_2023` now resolves to the Gentle Introduction,
and `angelopoulos_conformal_2023-1` to Conformal PID Control. The chapter cited the former for PID
control. **The document still compiled and no warning was raised.** Standing hazard: after every
refresh, check any key whose stem matches a newly added work.

| Finding | Edit |
|---|---|
| 16 | CPTC's guarantee stated correctly: exact finite-sample coverage only under exchangeability, time-averaged asymptotic validity under a stationary state distribution, faster post-shift convergence that shortens rather than removes miscoverage, residual risk concentrated in the state-misclassification rate. A second paragraph draws the design consequence: prefer an observed regime variable over an inferred one, which drives that term to zero. This converts the passage from a false claim into the argument for the liveness gate. |
| 17 | Section retitled from "The Unoccupied Intersection". PRISM named as prior art, and the chapter states that no claim of methodological novelty in cost-sensitive intervention is available to it. Contribution restated as field instantiation. |
| 7.4 | CUSUM added, grounded in Page (1954), with its average run length linked forward to the evaluation chapter's asymmetric-cost argument. Chronos-2 removed from a parenthetical pile and given its own paragraph. TabPFN-TS and TabPFN added as small-N comparators. |
| 1, 13 | New metric paragraph: absolute-error measures optimise for the median, benchmark-scaled measures deflate on structural zeros, M5 answered with squared scaled errors. |
| 8.B | Reconciliation and adaptive conformal given their costs, via Kolassa, Athanasopoulos and Zaffran. |

Post-write validation: 75 cite keys, 108 entries, zero undefined citations.

### K.6 Open dependencies and dates

| Item | Owner | Blocks | Date |
|---|---|---|---|
| Ellel booking diary | Elliot | S4 Part 4c, Finding 15 | Sent 2026-07-21 |
| 60 to 100 adopt-or-dismiss labels | Elliot | **S9, Fatal 2 evidence half** | Needed by 2026-08-14 |
| Cost ratio elicitation, 20 minutes | Elliot | S8 threshold selection | Decoupled: swept grid until it arrives |
| Keg-line to till-button mapping, supplier lead times | James | Stock signal, FLAG-3 | Excel form sent 2026-07-21 |
| Escalate to Ryan for labels | Nam | fallback | **2026-08-04** |
| Self-label with intra-rater kappa | Nam | fallback | **2026-08-11** |

### K.7 The largest schedule risk is not Elliot

The Overleaf project holds `introduction`, `literature_review` and `conclusion`. **There is no
methodology chapter and no results chapter.** On a 17,300-word body those are typically 40 to 50
percent, so roughly 7,000 to 8,000 words do not exist, against a build window closing 2026-08-21 and
fourteen days after it.

Reports 42, 43 and 44 are already most of three methodology subsections. The mitigation, now a
deliverable in every remaining package, is forty-five minutes at the end of each package converting
that package's report into `chapters/methodology.tex` while it is fresh.

### K.8 Verdict

**Unchanged at 63.** Remediation has closed Majors 3 and 4 and the reproducibility hole, and has
corrected Fatal 1's metric. Fatal 2 remains open, and no quantity of statistical repair reaches 70
while the object of the research question is absent from the served system. S8 and S9 are the only
packages that move the band.

### K.8a SCOPE CONSTRAINT: S8 cannot run on Nam's side (recorded 2026-07-21)

**S8 requires live Anthropic API calls, and Nam's scope is the Track A brain only. Nam does not have
authority to run the live-LLM path, and should not use a personal API key to stand in for it.** The
served LLM integration lives in Ryan's Track B and the AI GM interface. S8's agent must therefore be
**built** by Nam as a self-contained module with a frozen prompt and an offline evaluation harness,
then **executed by Ryan against the Track B key**, with the response cache returned to Nam for the
offline analysis.

This is not a blocker on the build. It splits S8 into two halves with a handoff between them:

- **S8a, Nam, no API calls.** Write `signals/agent.py`, freeze `signals/prompts/agent_v1.md`, build
  the offline evaluator, the cost sweep, the calibration code, and the agent-versus-constants
  comparison. Every one of these runs on a **cached or mocked** response set. Ship a fixture cache of
  synthetic responses so the whole harness is testable end to end with zero live calls. This is most
  of the six hours.
- **S8b, Ryan, live.** Run the frozen agent over the 644-item corpus against the Track B key, once,
  and return the committed response cache. One batch, roughly 644 calls, deterministic at
  temperature 0.
- **S8c, Nam, no API calls.** Replay the returned cache offline and produce the calibration and
  cost-curve results.

The pre-registration discipline survives the split intact, because the prompt is frozen by commit
order in S8a **before** Ryan runs anything. The handoff is a feature here: Ryan running the agent is
stronger evidence of a frozen prompt than Nam running it, since Nam never touches the model between
freeze and score.

**Add to the dependency register:** Ryan must run S8b, and it should be scheduled the same way the
Elliot labels are, because it sits on the S9 critical path. S9 needs the agent's outputs, which come
from S8b, which needs Ryan. Chase it on the same 2026-08-04 date as the label escalation.

### K.8b S8a complete, S8b pending Ryan (2026-07-23, commit `64e6fc4`)

**The agent apparatus is built, green, and pre-registered. The live measurement is one command,
reserved for Ryan.**

Pre-registration is now a fact in git history and it is airtight. The prompt is committed at
`c8fa127`, which is a proven ancestor of the apparatus commit `64e6fc4`, and `c8fa127` contains only
the prompt, the agent and config, with no evaluation output. Commit order therefore proves the prompt
was frozen before any score existed. This is the defence against a "tuned until it scored" challenge,
and Ryan running S8b rather than Nam strengthens it further, since nobody touches the model between
freeze and score.

Design, verified in a clean worktree: `signals/agent.py` returns `p_raise` through an injected
`execute` closure with a lazy SDK import, so the module loads with `anthropic` absent and **never
fabricates a probability**, a missing key yields a cache miss rather than an invented number. The
offline evaluator has no live-call path. `CALIBRATION_KIND = "detection"` is pinned and stamped into
every record, so the report cannot claim intervention calibration it has not earned. A code review
caught a real bin-floor coarsening bug that would have fired on the temperature-0 corpus, now fixed
and fuzzed.

**S8b, one command, in a keyed Track B environment:**
`pip install anthropic` then `ANTHROPIC_API_KEY=... python -m eval.agent_calibration --build`, which
writes and commits `eval/agent_cache.json` and the report artefacts. Afterwards
`python -m eval.agent_calibration` replays every number with no key.

**S8b is the empirical headline and it is pending.** Whether the agent beats the six constants of
`briefing._score`, which is the gate between contribution and decoration, needs the live run. Until it
lands, Fatal 2's build half is done and its measurement half is not.

**Dependency register, S8b added:** Ryan runs one batch of roughly 644 calls at temperature 0 and
returns the committed cache. It sits on the S9 critical path, because S9's labels are judgements about
what the agent surfaced. Chase on 2026-08-04 alongside the label escalation.

### K.9 S4 outcome, 2026-07-21, commit `d0c43e8`

**Three questions the earlier packages could only defer are now closed with numbers.**

**The scale basis differs by venue, for a measured reason.** Bootstrap at B = 10000, ruler pinned at
`as_of = 2026-07-07`. `calendar_lag7_active` is adopted at Beer Hall (276 pairs, 30% interval) and
Two River Taps (268 pairs, 31%). **At Ellel no basis is defensible.** The active basis rests on 28
pairs with a 66% interval; the deflated calendar basis induces a MASE spanning 0.32 to 0.55 on scale
uncertainty alone; the trading bases reach back nearly six weeks and produce a spurious 0.09 off a
denominator near 780. At 1.2 trading days a week the seasonal-naive concept has no purchase. **Ellel
routes to unscaled or cost-weighted error**, which is where `chatfield_all-zero_2007` belongs in the
argument. The pre-registered prediction at Section K.3 is confirmed.

**Finding 19 is material and now demonstrated.** Under Kostenko-Hyndman the Beer Hall L1 series flips
from lumpy to erratic. Its ADI of **1.3267**, the mean inter-demand interval, sits inside the band
between the wrong cutoff and the right one, under both demand-day definitions. No L3 node lies in
that band, verified rather than asserted, so the Croston trigger and every served model are
byte-identical.

**A definitional correction to this record.** Appendix E quotes Beer Hall ADI as 1.3256, computed as
N over N_demand. The standard definition is the mean inter-demand interval, 398/300 = **1.3267**.
Both fall inside the band so no verdict changes, but the figure in Appendix E is the cruder one. This
is the fourth definitional slip of the same family recorded at K.4.

**The occurrence gate is built and it does not help at Beer Hall.** Gated 0.787 against ungated
0.803 across 273 origins, and **both sit inside the 90 percent Model Confidence Set**, so the gate
does not measurably help where the day-of-week features already carry the closures. Judged by the S3
confidence set rather than by a difference of means, which is the correct instrument and the reason
S3 was built before S4. At Ellel the gate is scaffold only behind `ELLEL_DIARY_LIVE = False`, and the
`is_ellel_event` self-leak is impossible by construction: `ellel_diary_occurrence` accepts a diary
map and has no revenue parameter at all.

**The L2 denominator is closed without moving a result.** The harness scale equals the old inline
computation to within 1e-9 across every L2 category at all three venues, so report 24's cadence
conclusion is untouched. It is also basis-invariant, since the denominator is constant across
cadences for a given category.

**Examiner error 8 is confirmed and withdrawn.** See K.4.

**Two items carried forward from this package.** `chatfield_all-zero_2007` was stubbed into a new
`chapters/ref.bib` in the brain repository, but the entry **already exists in the Overleaf root
`ref.bib`** with full metadata including its DOI, so the stub is redundant and should be removed
before it becomes a duplicate-key problem. And `chapters/methodology.tex` now exists in the brain
repository while the dissertation itself lives in Overleaf, which creates two sources of truth for
the same chapter. The chapter belongs in Overleaf.

### K.10 Packages S5, S6, S7, S10, S11 complete (2026-07-23)

All five self-contained packages are run, verified against the remote, and pushed. The build work that
is Nam's to run is finished. What remains (S8b, S8c, S9) belongs to Ryan or Elliot and is recorded in
K.8a, K.8b and K.6.

**S5 group in-context learning, commit `5b95641`. Negative result, trustworthy.** Chronos-2 can forecast
the three venues together, and a grouped forecast differs from the univariate one by about 40 pounds, so
the capability is real rather than a no-op. On this estate grouping is indistinguishable from or worse
than per-venue forecasting: at Beer Hall the univariate arm is significantly better on the paired
bootstrap while all three arms share the 90 percent set; at Ellel the group arm is nominally better in
the predicted direction but not significant; at Two River Taps grouping loses. No served model changes.
The load-bearing discovery is a library property: under `cross_learning=True` Chronos mixes every series
in a batch, so the batch **is** the cross-learning group. An oversized batch was demonstrated on the live
model to merge origins and move numbers by 45 pounds; the correct pinning keeps them isolated. Without
that catch the negative result would have been a false positive. The univariate arm reproduced the
committed ladder to 1.4e-6 over 738 folds, which is why running on CPU rather than switching device was
worth more than the time it saved.

**S6 lead-matched weather, commit `070f249`. The exogenous path carries no serving optimism, and weather
is marginal.** Five arms at Beer Hall (no weather, observed, hindcast, fixed-lead-3, horizon-matched).
The gap from no-weather to any weather arm is about 0.016 MASE, roughly seven times the spread among the
four weather arms, and all five sit in the 90 percent set. Hindcast and horizon-matched are statistically
inseparable at Beer Hall, so there is no covariate-quality optimism in the served numbers. The predicted
lead optimism appears only at Ellel, which is served by robust_dow, not the exogenous model. The sharpest
result: perfect knowledge of the forecast period's weather (observed) is no better than a seven-day-ahead
forecast of it (horizon-matched), the difference being about a third of a standard error. The Ellel June
gap was diagnosed as an ingest artefact, an incremental build inserting a short HTTP 200 with no
completeness check and stepping the watermark past an interior hole; fixed with a completeness assertion
on both branches, and the fourteen missing folds recovered exactly. `FLAG-ELLEL-JUNE-EXO` closed.

**S7 interval calibration, commit `64d6b9f`. Major 9 withdrawn, a real under-coverage found.** The
reported coverage of 1.00 came from seven points, on which perfect 90 percent calibration produces
all-inside with probability 0.478, and the Clopper-Pearson interval on that estimate contains nominal.
Major 9 does not support a claim of miscalibration and is withdrawn; this is the fourth correction to
this assessment. Measured properly on roughly 1,750 pairs, Beer Hall under-covers at 0.871 against
nominal 0.90, 3.6 standard errors low, at every horizon step, and identically on the served exo model, so
it is a property of the band not the point forecaster. Falling below the Angelopoulos-Bates lower
guarantee is itself the diagnostic that exchangeability is violated. Five band methods compared on
Winkler; the incumbent Mondrian band is Winkler-best or tied at every venue, and no method both enters
the Winkler set and beats the incumbent mean, so none is adopted. The `contract.py` prediction of
per-step half-width growth (181 to 224) is refuted at power, where it is flat; the growth was a
small-sample artefact. `FLAG-BAND-HORIZON` closed as a work package (per-step implemented, measured, not
adopted, cap stays seven); `FLAG-BAND-UNDERCOVERAGE-BH` opened as a served-band review.

**S10 injection realism, commit `64980d0`. Major 5 measured, discount is zero, real gap relocated.** A
realistic pipeline perturbs raw revenue and re-derives the forecast and band under the production
weekly-refit and change-point-refit policy, against the existing residual-stream pipeline as control, on
120 paired injections. Recall and latency are identical between arms for every event kind, the paired
bootstrap difference exactly 0.0 with a [0.0, 0.0] interval because the same injections are detected in
both, not because the sample is small. My pre-registered prediction of a discount concentrated in
sustained shifts is refuted; the published 0.996 recall and two-to-six-day latencies stand as accurate
rather than as upper bounds. The real gap lies elsewhere and is new: the change-point-triggered refit
fires on 61 to 63 percent of sustained shifts and, when it fires, suppresses continuation alerts on the
still-ongoing shift in about 16 percent of checked cases, though it never costs the original detection.
`FLAG-INJECTION-REALISM-DISCOUNT` closed; `FLAG-CONTINUATION-ALERT-SUPPRESSION` opened.

**S11 chat-log signal, commit `dbcc525`. A second learning domain is live.** The built-but-unwired
chat-log gap signal is connected to the briefing on the same footing as sales, using the `sop` weight of
0.35 already declared. The embedder is pinned to the keyless TF-IDF backend so an examiner reproduces it
with no key and no network, proven never to attempt the Voyage API even when a key is present. On the real
735-message corpus, 4 of 12 clusters clear the above-baseline threshold, under the stop condition of ten,
the strongest a gas-cannister safety question asked five times with three unanswered, which is a genuine
instance of the specification's own missing-SOP example found in real data. Wiring is proven additive:
every non-sop briefing item is byte-identical with the collector on or off. The occurrence gate and the
noise guard both proven discriminating. Two of four learning domains are now live (sales, chat-log); stock
remains blocked on James, checklists on Neon.

### K.11 Consolidated finding status after all self-contained packages

| # | Severity | Status |
|---|---|---|
| Fatal 1 | Fatal | **Remediated (S1).** Single ruler, published figure reproduced, headline restated. |
| Fatal 2 | Fatal | **Build half done (S8a), measurement half pending Ryan (S8b) and Elliot (S9).** The ceiling on the mark. |
| 3 | Major | **Remediated (S2, S3).** Test now computable; flip illustration withdrawn (examiner error 8). |
| 4 | Major | **Remediated (S2).** 42 days to 273/260/205 origins; Beer Hall demonstration is the strongest positive result. |
| 5 | Major | **Measured (S10). Discount is zero**; the finding was an over-statement, corrected. Continuation-alert suppression found instead. |
| 6 | Major | **Apparatus built (S8a), three of four Objective 4 terms pending S8b and S9.** |
| 7 | Major | **Remediated (S6). No serving optimism; weather marginal.** |
| 8 | Major | **Half remediated (S11). Sales and chat-log live; stock and checklist blocked externally.** |
| 9 | Major | **Withdrawn (S7).** 1.00 on seven points is not miscalibration. Beer Hall under-coverage found and flagged instead. |
| 10 | Major | **Remediated (S5). Cross-series learning does not help this estate**, reported as a measured negative. |
| 11 | Minor | Open. The 403.31 pound reconciliation delta is still unexplained. A short package if time allows. |
| 12 | Minor | Closed on internal evidence (VAT). |
| 13 | Major | **Narrowed (S4). Beer Hall borderline, flips to erratic under corrected constants; Ellel lumpy.** |
| 14 | Major | **Remediated (S5).** The hardcoded `"l1"` identifier replaced with venue-distinct group ids. |
| 15 | Major | **Scaffold built (S4), blocked on Elliot's diary.** |
| 16, 17 | Major | Remediated in the chapter. |
| 18 | Minor | Remediated by the candidate. |
| 19 | Major | **Demonstrated (S4).** Corrected constants flip Beer Hall lumpy to erratic. |
| repro | unnumbered | **Closed (S3).** Per-venv lockfiles, recorded resolution, store durability. |

Only Fatal 2, Finding 6, Finding 15 and Minor 11 remain, and every one of the first three is blocked on
an external party rather than on Nam.

### K.12 What to inject into the writing, by chapter

This is the material that has been generated and verified in the remediation and now needs to move from
build reports into the dissertation. It is the binding constraint, larger than any external dependency.

**Methodology chapter (`chapters/methodology.tex`, exists, partial).**
- The metric ruler: one seasonal-naive denominator, four documented bases, the two-coordinate
  `(basis, as_of)` argument, RMSSE and Winkler added, Two River Taps as a frozen control. From report 42,
  already moved.
- The fold-count argument: HLN correction zero at six folds, 273/260/205 origins, and the Beer Hall
  small-sample demonstration. From report 43, already moved.
- The Model Confidence Set: pre-registration, why alpha is 0.10 not 0.05, the paired-variance argument,
  wide sets as the honest result. From report 44, already moved.
- The scale-basis bootstrap: four bases, the 28-pair Ellel interval, no defensible basis at 1.2 trading
  days a week, routing to unscaled and cost-weighted error. From report 45, moved in S6.
- Still to move: the intermittency constants and the occurrence-gate specification (report 45), and the
  group-ICL and weather-ablation methods (reports 47, 48).

**Results chapter (`chapters/results.tex`, created in S7, four studies in).**
- Group in-context learning: the negative result with the batch-is-the-group leakage guard. In.
- Weather ablation: five arms, no serving optimism, observed no better than horizon-matched. In.
- Interval calibration: the Major 9 power correction, Beer Hall under-coverage, five-arm Winkler
  non-adoption. In (S10).
- Injection realism: zero recall discount as resilience, continuation-alert suppression as the relocated
  finding. In (S11).
- Still to add: the fold-count and MCS served-model results, and the intermittency and occurrence-gate
  results, once the agent evaluation gives the chapter its Objective 3 section.

**Discussion chapter (does not yet exist, highest writing priority).**
- The recurring theme, stated with three instances: small-sample claims that fail at power. The six-fold
  model selection, the examiner's library-flip (my artefact), and the `contract.py` half-width growth.
  Each caught by re-measuring, not by reasoning. This is the strongest methodological argument available
  and it should anchor the discussion.
- The measure-before-building principle, earned repeatedly: the weather optimism that was not there, the
  injection discount that was zero, the coverage alarm that was seven coin flips.
- Where the system's value is real and where it is decoration: weather marginal, cross-series learning
  unhelpful at this estate, the exogenous path honest at serving, the chat-log signal finding a genuine
  safety gap. An honest account of what a foundation-model brain does and does not buy a three-venue
  estate.
- The self-silencing detection loop (S10) as an operational design finding: a briefing tool that detects
  a shift, refits to accommodate it, and thereby stops reminding the manager it is still live.
- The four learning domains: two live, two blocked, and what the architecture would surface once stock
  and checklist data arrive.

**Ablations to present as first-class results, not appendices.** Group composition U/G2/G3; weather
N/O/H/F/M; band methods P/D/S/A/G; injection control-versus-realistic. Each was pre-registered, each
carries a leakage or noise guard proven to discriminate, and three of the four returned a negative or
corrective result reported at full prominence.

### K.13 Verdict, unchanged at 63

Nine packages have closed or corrected every finding that Nam can address alone. The mark is still capped
below 70 by Fatal 2, whose measurement half needs Ryan to run S8b and Elliot to supply labels for S9.
Nothing in the statistics moves the band further. The remaining risk is not analytical, it is that the
verified material still lives mostly in build reports with a build window closing 2026-08-21.
