# Numerical-claim audit — methodology.tex and results.tex

Date: 2026-07-30/31. Pipeline stage 17 (repo result-file trace on every number)
and stage 14 (result analysis), per `brain/knowledge/02_prj93_pipeline_spec.md`.
**Audit only — nothing changed on Overleaf, nothing changed in the repo except
this file.**

## Scope

The brief named `result.tex`. **The file on Overleaf is `chapters/results.tex`**
— there is no `result.tex` in the project. Audited: `chapters/methodology.tex`
(15 sections) and `chapters/results.tex` (23 sections), both pulled section by
section via `get_section_content` rather than read end-to-end, per the token
rule in `PRJ93_RULES.md`.

Every numeral in scope: percentages, metric values, **every cell of every
table**, counts (n, folds, seeds, venues, days, series, calls, labels),
p-values, confidence intervals, thresholds and design constants,
hyperparameters, and every statistical statement.

## Method

Six parallel extractors, one per slice of the two chapters. Each extracted the
numerals from its sections, then traced each one by `grep -rn` against:

1. `brain/log/*.md` — the 54 result reports. The spec's phrase is
   "`brain/log/*result*.md`"; **no file in `brain/log/` matches that glob**. The
   result files are named `NN_<study>_Report.md` (`42_G17a_Metric_Integrity.md`
   … `51_G17j_Chatlog_Signal.md`), plus `Decision_and_Resolution_Log.md` and
   `DISSERTATION_NOTES.md`. The spec's glob should be corrected to
   `brain/log/*.md` or the files renamed; as written, a literal reading of the
   verification rule matches nothing.
2. The code under `brain/` (`compute/`, `conformal/`, `eval/`, `models/`,
   `signals/`, `sim/`, `ingest/`, `store/`, `CONTRACT.md`, `FLAGS.md`) — for
   design constants, which are not results and have no result file by nature.

`graphify query` was not used for orientation despite the repo hook demanding
it: `brain/ledger/tooling_verdict.md` records it hanging indefinitely (>115s, no
exit code) on this graph. The graph artifacts were grepped directly instead.
Recorded rather than silently skipped.

## Verdict vocabulary

- **MATCHES** — the same value for the same quantity appears in a result file,
  or for a design constant, in the code.
- **STALE** — the value matches an *earlier* run; a later report supersedes it
  with a different value. Both values and both paths are given. This project ran
  successive correction passes (G15 → G16 → G17a–j), so a superseded figure
  surviving into the chapter is the most likely defect class.
- **MISMATCH** — the repo says something different and no report carries the
  chapter's value.
- **UNTRACEABLE** — no result file and no code path contains it.

## Statistical-reporting standard applied

`PRJ93_RULES.md` §53 names a `statistical-reporting` skill and then records, in
the same file, that **no such skill exists** in `.claude/skills/`. It still does
not exist, and `.claude/` is out of bounds for this project. The standard
applied here is therefore §2 of
`brain/skills/autoresearchclaw/references/drafting-rules.md`, rules 7–14, which
is the same material in the one place this project is permitted to keep it:

95% CI or dispersion with every point estimate · p-value on every comparison
claim, with an explicit "not statistically significant" where p ≥ 0.05 · no
superiority claim without significance · effect size alongside significance · n
(seeds/folds/splits) stated · success rates and both conditional and
unconditional metrics where any run failed · per-regime rather than
aggregate-only results.

Two project-specific tests were applied on top: whether an argmin over a
six-fold mean is reported bare (W5), and whether any Diebold–Mariano statistic
is reported at n=6, h=7, where the Harvey–Leybourne–Newbold correction factor is
exactly zero and no DM variant is computable (W6).

---

## Batch A — methodology.tex, sections 1-4

Design of the study - Reproducibility as a design constraint - Measuring
accuracy on a series with closed days - Classifying the demand pattern.

# Numerical audit — batch A (methodology.tex, 4 sections)

Repo root for all paths: `/Users/hapuna/Downloads/ai-gm.ai-master/brain/`

| # | Claim (verbatim) | Location | Repo source path | Repo value | Verdict | Fix |
|---|---|---|---|---|---|---|
| 1 | "The object of study is a three-venue hospitality estate in Lancashire" | methodology.tex § Design of the study | log/42_G17a_Metric_Integrity.md:65-67 | 3 venues (beer_hall, two_river_taps, ellel) | MATCHES | — |
| 2 | "Beer Hall & 399" (frame length) | § Design of the study | log/45_G17d_Intermittency_and_Occurrence.md:52; log/40_G16...md:55 | 399 | MATCHES | — |
| 3 | "Ellel & 386" (frame length) | § Design of the study | log/43_G17b_Fold_Count.md:57 ("frame is 386 rows, not 392"; 392 raw − 6 trimmed) | 386 after `trim_to_active` | MATCHES | Keep the "after trim_to_active" qualifier — raw calendar is 392 (log/48:110) |
| 4 | "Two River Taps & 331" (frame length) | § Design of the study | log/45...md:52; log/40...md (frame `b6339032a219213c`, 331) | 331 | MATCHES | — |
| 5 | "Beer Hall … 5.30" trading days/wk | § Design of the study | log/42_G17a_Metric_Integrity.md:65 | 5.30 | MATCHES | — |
| 6 | "Ellel … 1.21" trading days/wk | § Design of the study | log/42_G17a_Metric_Integrity.md:67 | 1.21 | MATCHES | — |
| 7 | "Two River Taps & 331 & 5.90" trading days/wk | § Design of the study | log/42_G17a_Metric_Integrity.md:66 | **5.92** | MISMATCH | Change 5.90 → 5.92 in Table~\ref{tab:venues} |
| 8 | "at store ceiling 2026-07-07" (frame caption) | § Design of the study | log/42_G17a_Metric_Integrity.md:61 "Store at ceiling 2026-07-07"; log/45...md:88 `as_of = 2026-07-07` | 2026-07-07 | MATCHES | — |
| 9 | "Two River Taps closed on 2026-05-08" | § Design of the study | log/42_G17a_Metric_Integrity.md:186; log/04_ChangePoint_A13_Report.md:54; log/20...md:34 | 2026-05-08 | MATCHES | — |
| 10 | "Closed 2026-05-08; frozen control series" (table cell) | § Design of the study | log/42_G17a_Metric_Integrity.md:186 "natural control … closed since 2026-05-08" | same | MATCHES | — |
| 11 | "three hierarchy levels: venue (L1), category (L2), and item (L3)" | § Design of the study | log/45...md (L1/L2/L3 throughout); hierarchy/ | 3 levels | MATCHES | — |
| 12 | "a corpus of 735 staff chat messages" | § Design of the study | log/51_G17j_Chatlog_Signal.md:8,33-34 | 735 messages = 376 user + 359 assistant | MATCHES (count) / MISMATCH (descriptor) | 735 is the total corpus incl. 359 assistant replies; only 376 are staff-authored. Say "735 chat messages (376 staff-authored)" |
| 13 | "Two further domains … stock movements and checklist completions, are not available" | § Design of the study | log/51...md:210 (`CHECKLIST_LIVE` false); FLAGS.md | 2 unavailable domains | MATCHES | — |
| 14 | "Three separate coordinates … pinned and recorded on every artefact" | § Reproducibility | Decision_and_Resolution_Log.md:1503-1513 (row 40); log/44_G17c...md | 3 coordinates (ceiling, library resolution, device) | MATCHES | — |
| 15 | "a minor library upgrade appeared to reverse a model-selection outcome … did not reproduce; it is withdrawn" | § Reproducibility | Decision_and_Resolution_Log.md:1503-1513; log/44_G17c_Model_Confidence_Set.md:84,231 | Refuted: rerun gives ETS 0.597-vs-GBM 0.601, "no flip"; scikit-learn 1.8.0 vs 1.9.0 effect real but does not flip selection | MATCHES | Consider naming the two library versions (1.8.0 / 1.9.0) and the 0.597/0.601 pair |
| 16 | "Accuracy figures here must be comparable across venues that trade on 1.2, 5.3 and 5.9 days a week" | § Measuring accuracy | log/42_G17a_Metric_Integrity.md:65-67 | 1.21 / 5.30 / 5.92 | MATCHES (rounded) | 5.9 rounds from 5.92 — fine in prose, but Table~\ref{tab:venues} must still read 5.92 |
| 17 | "with $m$ the seasonal lag, here $m=7$" | § Measuring accuracy | eval/intermittency_diagnostic.py / harness `seasonal_naive_scale(basis="calendar_lag7")`, log/45...md:118 | lag 7 | MATCHES | — |
| 18 | "A value below one beats the benchmark" | § Measuring accuracy | definitional (Hyndman & Koehler 2006) | 1.0 | MATCHES | — |
| 19 | "Four bases were therefore named explicitly and all four computed" | § Measuring accuracy | log/42_G17a_Metric_Integrity.md:69-73 | 4 bases | MATCHES | — |
| 20 | `calendar_lag7` Beer Hall "315.7 & 392" | § Measuring accuracy | log/45...md:97 (scale 315.7, n pairs 392); log/42...md:71 | 315.7 / 392 | MATCHES | log/45:89 prose wrongly says "315.7 on 276 active pairs"; the table (392) is the one the chapter follows — correct |
| 21 | `calendar_lag7` Ellel "180.1 & 385" | § Measuring accuracy | log/45...md:100; log/42...md:67 ("284 of 385") | 180.1 / 385 | MATCHES | 385 pairs implies the 392-row raw frame, not the 386-row trimmed frame in Table~\ref{tab:venues} — state which frame each table uses |
| 22 | `trading_lag7` Ellel "770.8 & 61" | § Measuring accuracy | log/45...md:101 | 770.8 / 61 | MATCHES | — |
| 23 | `trading_same_weekday` Ellel "806.2 & 67" | § Measuring accuracy | log/45...md:102 | 806.2 / 67 | MATCHES | — |
| 24 | `calendar_lag7_active` Beer Hall "386.9 & 276" | § Measuring accuracy | log/45...md:98; log/42...md:71 | 386.9 / 276 | MATCHES | — |
| 25 | `calendar_lag7_active` Ellel "754.0 & 28" | § Measuring accuracy | log/45...md:103 | 754.0 / 28 | MATCHES | — |
| 26 | Beer Hall `trading_lag7` and `trading_same_weekday` shown as "--" | § Measuring accuracy | log/42_G17a_Metric_Integrity.md:71 | 631.8 and 456.5 (both computed) | MATCHES (omission) | The values exist; the dashes read as "not computed". Either print them or say "not adopted; see report 42" |
| 27 | "At Ellel the scale ranges from 180 to 806 across the four bases" | § Measuring accuracy | log/45...md:100-103 | 180.1 … 806.2 | MATCHES | — |
| 28 | "the same forecast can be presented as four times better or worse" | § Measuring accuracy | log/42_G17a_Metric_Integrity.md:73,77 | spread **4.48x**, reported as "4.5 times" | MATCHES (rounded down) | Prefer "4.5 times" or "4.48×" to match report 42 |
| 29 | "Earlier implementations … held four separate private copies of the denominator" | § Measuring accuracy | log/42_G17a_Metric_Integrity.md §1 | 4 private copies | MATCHES | — |
| 30 | "at ceiling 2026-07-07 (report 45, function `bootstrap_scale`)" | § Measuring accuracy | log/45_G17d...md:87-88 (`bootstrap_scale`, `as_of = 2026-07-07`) | same | MATCHES | — |
| 31 | "the limiting interval as $p = 4/3$ rather than $1.32$" | § Classifying the demand pattern | log/45...md:47-49; ledger/citation_audit.md:190; eval/intermittency_diagnostic.py (`ADI_CUTOFF_SBC/KH`) | 4/3 = 1.3333 vs 1.32 | MATCHES | — |
| 32 | "the maximum squared coefficient of variation as $v = 0.5$ rather than $0.49$" | § Classifying the demand pattern | log/45...md:47-49; ledger/citation_audit.md:190; `CV2_CUTOFF_SBC/KH` | 0.5 vs 0.49 | MATCHES | — |
| 33 | "the two differ in the third decimal place and both fall inside the band at issue" | § Classifying the demand pattern | docs/Prj93_external_examiner_assessment.md:2811-2814 | 1.3256 (N/N_demand) vs 1.3267 (mean inter-demand); both in [1.32, 1.3333) | MATCHES | Quote both figures — "third decimal place" is vaguer than the record |
| 34 | Eq. \ref{eq:sba}: "prefer the approximation when $v > 2 - \tfrac{3}{2}p$" | § Classifying the demand pattern | ledger/citation_audit.md:190 (verified quote: "use SBA whenever $v > 2-(3/2)p$") | $v > 2-(3/2)p$ | MATCHES | Note docs/Prj93_external_examiner_assessment.md:153,1277,2154 states the **opposite** direction ($v<$); the citation audit is the later verified source. Say so explicitly or the examiner will read a contradiction |
| 35 | "The diagonal passes through the two limiting points … $(1, 0.5)$ and $(4/3, 0)$" | § Classifying the demand pattern | Derived from Eq. \ref{eq:sba}; constants at log/45...md:47-49 | $2-1.5(1)=0.5$; $2-1.5(4/3)=0$ | MATCHES (arithmetic) | — |
| 36 | "The implementation … was specified with the inequality reversed" | § Classifying the demand pattern | eval/intermittency_diagnostic.py:80-89 `return bool(cv2 < 2.0 - 1.5 * adi)` | code selects SBA when $v <$ threshold | MATCHES | Cite the file+line; the docstring at :81 also states the reversed rule |
| 37 | "the reported finding that no node in the estate selects the Syntetos-Boylan approximation" | § Classifying the demand pattern | log/45_G17d...md:71-75 | "No node selects SBA at either level" (L1 3/3, L3 0 of 32) | MATCHES | — |
| 38 | "every venue at L1 selects the approximation" (under corrected direction) | § Classifying the demand pattern | No report states this; derivable from log/45...md:56-61 | Not re-run anywhere in repo | UNTRACEABLE (derivation correct, unpublished) | Either re-run `select_sba` with the corrected inequality and publish a report, or mark the sentence as an arithmetic re-derivation from report 45 Table 1b |
| 39 | "squared coefficients of variation lie between 0.61 and 1.04" | § Classifying the demand pattern | log/45...md:56-61 | 0.61 (TRT) … 1.04 (Ellel) under *non-zero revenue*; 1.07 under *any till activity* | MATCHES (one demand-day definition) | Add "under the non-zero-revenue demand-day definition"; the alternative definition reaches 1.07 |
| 40 | "the corresponding thresholds $2-\tfrac{3}{2}p$ lie between $0.23$ and $-6.88$" | § Classifying the demand pattern | Derived from ADI 1.1828/1.3267/5.9231 at log/45...md:56-61 | 0.2258, 0.0099, −6.8846 | MATCHES (arithmetic) | Beer Hall's threshold is 0.010, well inside the quoted range — the range is correct but hides that the anchor venue is the near-miss |
| 41 | "at L3 … none of the 32 nodes" / "21 classify intermittent" (chapter: "The L3 verdict has not been re-derived") | § Classifying the demand pattern | log/45...md:73-74 | 32 nodes, 21 intermittent at ADI ≥ 4/3 | MATCHES (chapter correctly declines to re-derive) | — |
| 42 | "no L3 node has an ADI in the affected [1.32, 1.3333) band" (implied by "does not touch any L1 served model") | § Classifying the demand pattern | log/45...md:80-84 (nearest intermittent node 1.4129) | verified, trigger set byte-identical | MATCHES | Consider citing 1.4129 as the nearest node — it is the evidence for the "no served model changes" claim |

## Statistical reporting

Failures against the standard, one row each. All are omissions in the chapter relative to
evidence the repo already holds.

| # | Statistical claim | Standard failed | Repo has it? | Verdict | Fix |
|---|---|---|---|---|---|
| S1 | Table~\ref{tab:bases} scale point estimates (315.7 / 180.1 / 770.8 / 806.2 / 386.9 / 754.0) | 95% CI / dispersion not reported with any point estimate | Yes — log/45...md:97-103 gives bootstrap 95% intervals and widths for every cell ([270.0,365.0] 30.1%; [135.3,229.9] 52.5%; [604.3,952.7] 45.2%; [639.1,979.2] 42.2%; [332.1,446.4] 29.5%; [522.0,1016.4] 65.6%) | MISMATCH | Add an interval column. The Ellel `calendar_lag7_active` 65.6% width is the whole argument for "no basis is defensible at Ellel" and is currently invisible in the chapter |
| S2 | "the same forecast can be presented as four times better or worse" | Effect size given with no uncertainty; n of the resampling not stated | Yes — B = 10000 bootstrap, log/45...md:87-88 | MISMATCH | State B = 10000, the 95% percentile interval, and the pinned `as_of` in the caption |
| S3 | "the scale ranges from 180 to 806" presented as a range of point estimates | The induced-MASE consequence (0.096–0.411, i.e. the conclusion-reversal) is asserted qualitatively, no numbers, no CI | Yes — induced MASE with intervals at log/45...md:97-103 | MISMATCH | Quote induced MASE 0.411 [0.322,0.547] vs 0.096 [0.078,0.122]; that is the "reverse a conclusion" claim made numerical |
| S4 | "the admissible readings disagree by enough to reverse a conclusion" | A comparison claim with no test and no p-value; no statement that no test was run | No test exists for this in the repo (it is a bootstrap-interval argument, not a hypothesis test) | UNTRACEABLE | Reword as an interval-overlap argument, or state explicitly that no significance test is claimed |
| S5 | ADI/CV² values (1.3267, 0.62, 5.9231, 1.04 …) driving the lumpy→erratic reclassification | Point estimates with no dispersion; n (frame length per venue) not restated at the point of use | Partly — frame n at log/45...md:52; no CI on ADI/CV² anywhere in repo | UNTRACEABLE | Either bootstrap ADI/CV² (the machinery exists in `bootstrap_scale`) or state that the classification is a point-estimate verdict with no uncertainty quantified. The Beer Hall flip turns on 1.3267 vs 1.3333 — a 0.007 margin with no error bar |
| S6 | "every venue at L1 selects the approximation" (3 venues × 2 demand-day definitions = 6 comparisons) | Multiple comparisons made with no correction and no per-comparison figures | No | UNTRACEABLE | Report the six (p, v, threshold) triples, or scope the claim to the one demand-day definition used |
| S7 | Sections make no fold/seed-based comparison, so DM/HLN does not arise here | n/a — but note log/43_G17b_Fold_Count.md:50-54 records that at n=6, h=7 the evidence base is 42 days and "the test vanishes" | Yes — log/43_G17b_Fold_Count.md | n/a (no failure in this batch) | If any accuracy comparison is later added to §sec:ruler, the n=6/h=7 HLN-factor-zero constraint from report 43 must be cited rather than a DM p-value |

## Counts

MATCHES 36 · STALE 0 · MISMATCH 2 (rows 7, 12-descriptor) + 3 statistical (S1, S2, S3) · UNTRACEABLE 1 (row 38) + 3 statistical (S4, S5, S6) · rows total 42 claim rows + 7 statistical rows.

---

## Batch C - methodology.tex, sections 10-15

Interval forecasts - Detection - Occurrence, and why the hurdle here is not
estimated - Evaluating detection: the injection protocol - The knowledge-gap
signal - The intervention layer and its evaluation.

# Numerical audit — batch C (methodology.tex, 6 sections)

| # | Claim (verbatim) | Location | Repo source path | Repo value | Verdict | Fix |
|---|---|---|---|---|---|---|
| 1 | "the half-width at level $1-\alpha$ is the $k$-th smallest absolute residual with $k = \lceil (n+1)(1-\alpha) \rceil$" | methodology.tex § Interval forecasts | brain/conformal/methods.py:45 | `k = min(int(math.ceil((n + 1) * level)), n)` | MATCHES | none (the `min(...,n)` clamp is unstated but harmless) |
| 2 | "Calibration is refreshed on rolling seven-day blocks using residuals strictly earlier than the block" | methodology.tex § Interval forecasts | brain/log/33_G14_De_Lune_Report.md:21; 35_For_Ryan…:37; config.py:192 | "walks the series in 7-day blocks"; "re-fits the model once per 7-day block" | MATCHES | none |
| 3 | "expected coverage as at most $1-\alpha + 1/(n+1)$" | methodology.tex § Interval forecasts | brain/log/49_G17h_Interval_Calibration.md:58-60 | "at most nominal + 1/(n_calib+1) … upper bound is 0.9005 to 0.9007" | MATCHES | none |
| 4 | "Interval methods are compared on the Winkler score as primary, with coverage and mean width reported beside it" | methodology.tex § Interval forecasts | brain/log/49_G17h…:31-32 | "Primary metric the Winkler score; coverage and width reported beside it" | MATCHES | none |
| 5 | "$w_t^{(90)}$ the conformal half-width at 90 per cent" | methodology.tex § Detection | brain/config.py:316 | `CP_LEVEL = 0.90` | MATCHES | none |
| 6 | "so that $\lvert z_t \rvert = 1$ sits exactly on the interval edge" | methodology.tex § Detection | brain/config.py:326 | `DEV_BAND_K = 1.0  # |z| > 1 → outside the 90% conformal band` | MATCHES | none |
| 7 | "$S^{+}_t = \max(0, S^{+}_{t-1} + z_t - k)$ with $k = 0.5$ alarms at $S^{+} > 5$, two-sided" | methodology.tex § Detection | brain/config.py:305,310; signals/change_point.py:55 | `CP_CUSUM_K = 0.5`, `CP_CUSUM_H = 5.0`, two-sided | MATCHES | none |
| 8 | "a single day at $z=3$ contributes only $2.5$" | methodology.tex § Detection | arithmetic from k=0.5 | 3 − 0.5 = 2.5 | MATCHES | none |
| 9 | "ten consecutive days near $z=1$ accumulate to the threshold" | methodology.tex § Detection | arithmetic | 10 × (1 − 0.5) = 5.0 = `CP_CUSUM_H` | MATCHES | none |
| 10 | "alarms on four same-direction breaches within seven trailing trading days" | methodology.tex § Detection | brain/config.py:311-312 | `CP_RUN_M = 4`, `CP_RUN_N = 7` | MATCHES | none |
| 11 | "Bayesian online change-point detection … implemented as a benchmark only, validated against the real Two River Taps closure" | methodology.tex § Detection | brain/log/22_G12_13b…:130; signals/change_point.py (`bocpd_prob`) | "the 8 May Two River Taps closure" | MATCHES | none |
| 12 | "$\hat{y}_t = P(\text{trade at }t)\cdot \mathrm{E}[y_t\mid\text{trade at }t]$" | methodology.tex § Occurrence | brain/log/42_G17a_Metric_Integrity.md:234 | "yhat = P(trade) x E[revenue \| trade]" | MATCHES | none |
| 13 | "must be able to represent $P = 1$ with $\mathrm{E}[\cdot] = 0$" | methodology.tex § Occurrence | brain/log/45_G17d…:203 | "G4 P(trade)=1, E=0 representable … PASS" | MATCHES | none |
| 14 | "three days in the record carry till activity and exactly zero net revenue" | methodology.tex § Occurrence | brain/log/42_G17a…:218-231 | 3 days: beer_hall 2025-12-23, ellel 2025-06-08, ellel 2026-01-10 | MATCHES | none |
| 15 | "the other two are a sale reversed on the spot and a batch of twenty voided lines" | methodology.tex § Occurrence | brain/log/42_G17a…:227,232; Decision_and_Resolution_Log.md:1271 | ellel 2026-01-10 = "batch of 20 voided lines" (20 lines, 21 units) | MATCHES | none |
| 16 | "One is a fully comped day at a venue that was open and serving" | methodology.tex § Occurrence | brain/log/42_G17a…:226,233 | beer_hall 2025-12-23, 13 lines / 14 units, discounts −56.60, net 0.00 | MATCHES | none |
| 17 | "The first is a trading day with zero revenue" | methodology.tex § Occurrence | brain/log/42_G17a…:236-243 vs 45_G17d…:143-146 | 42 **recommends** "trading means non-zero net revenue" (comped day = NON-trading, 301/66 count); 45 **adopts** comped open day = trading day (occurrence 1, amount 0) | STALE (superseded, resolved in favour of the text) | none needed; the chapter follows the later report. If the earlier count (301/66) is quoted elsewhere, reconcile |
| 18 | "a corpus of 644 synthetic events injected into the history" | methodology.tex § Injection protocol | brain/log/09_Agent_Eval_Report.md:100,104; 46_G17e…:39; 50_G17i…:53 | N=644 (Beer Hall 356, Two River Taps 252, Ellel 36) | MATCHES | none |
| 19 | "sustained regime shifts, single-day spikes, stock drawdowns, and events coincident with an exogenous factor" | methodology.tex § Injection protocol | brain/eval/inject.py:5,45,131 | four kinds: regime_shift \| spike \| stock_drawdown \| exo_coincident | MATCHES | none |
| 20 | "Production … refits weekly, refits again on a confirmed change point, and recalibrates the interval on rolling seven-day blocks" | methodology.tex § Injection protocol | brain/log/50_G17i…:11-12 | "`RETRAIN_CADENCE_DAYS` / `RETRAIN_ON_CHANGEPOINT`", "SAME rolling-block conformal-recalibration discipline" | MATCHES | none |
| 21 | "Injections land only on trading days, using the occurrence definition of Section~\ref{sec:occurrence}" | methodology.tex § Injection protocol | brain/eval/inject_realistic.py:90-105 | `OccurrenceViolation` guard, G2 | MATCHES (realistic arm only) | say the guard is in the realistic arm; Ellel is excluded from that arm (`REALISTIC_VENUES`, line 78) |
| 22 | "The project specification names four domains the system should learn from" | methodology.tex § Knowledge-gap signal | brain/log/51_G17j…:148; knowledge/ spec | sales / stock / checklist / chat | MATCHES | none |
| 23 | "a cluster is surfaced only when its density of unanswered questions exceeds an empirically measured baseline for ordinary traffic" | methodology.tex § Knowledge-gap signal | brain/log/51_G17j…:33,101-103 | `CHATLOG_FAILURE_BASELINE = 0.189` (18.9% observed, 68/359); gate = density > 0.189 AND ≥ 2 failures | MATCHES | consider stating the 0.189 baseline and the ≥2-failure conjunct — the methodology omits both |
| 24 | "two available alternatives that would require a network service or a downloaded model. Three backends produce three different clusterings" | methodology.tex § Knowledge-gap signal | brain/log/51_G17j…:9,41-43 | pinned `backend="tfidf"`; Voyage (key+network) and a local model reachable only via `backend="auto"` | MATCHES | none |
| 25 | "ranks candidate items with a product of six constants" | methodology.tex § Intervention layer | brain/log/06_Proactive_Briefing_Report.md:94; 46_G17e…:125 | `SOURCE_WEIGHT · SEVERITY_MULT · recency · novelty · baseline_trust · direction_bump` = 6 | MATCHES | none |
| 26 | "Temperature is zero and the model identifier is pinned" | methodology.tex § Intervention layer | brain/config.py:448; log/46_G17e…:64,224 | `AGENT_TEMPERATURE = 0.0`; model `claude-opus-4-8` pinned | MATCHES | none |
| 27 | "committed to version control in a commit that provably precedes the commit introducing any evaluation code" | methodology.tex § Intervention layer | brain/log/46_G17e…:224 | "committed at `c8fa127` before any evaluation output" | MATCHES | none |
| 28 | "the ratio of the cost of a missed problem to the cost of a false alarm is swept over a pre-registered grid" | methodology.tex § Intervention layer | brain/config.py:456; log/46_G17e…:89 | `AGENT_COST_RATIOS = (0.25, 0.5, 1.0, 2.0, 4.0)` — "spanning 1:4 to 4:1" | MATCHES | consider naming the five grid points |
| 29 | "against a random baseline at the matched base rate … with a paired bootstrap on the resulting decision quality" | methodology.tex § Intervention layer | brain/log/46_G17e…:126-128 | "random baseline at the same base rate"; "paired bootstrap (B=10000, `AGENT_BOOTSTRAP_SEED=93`)" | MATCHES | state B=10000 and the seed for reproducibility |
| 30 | "the measurement is reported as pending in Section~\ref{sec:res-agent}" | methodology.tex § Intervention layer | brain/log/46_G17e…:21,200,238 | "S8b deferred (no key, no SDK)"; the 644 live calls unmade | MATCHES | none |
| 31 | (implied) "For each candidate item the agent returns a probability … the evaluation replays from that cache with no service calls" — no ECE value anywhere | methodology.tex § Intervention layer | brain/tests/test_agent_calibration.py:44,143,178; log/46_G17e…:101,119,172 | only hand-computed unit-test ECEs (0.05, 0.4); "The real ECE, Brier and reliability diagram are S8b" | **UNTRACEABLE** (no measured ECE exists) | see Statistical reporting below |

## Statistical reporting

**1. Expected Calibration Error — the unkept promise persists, and the methodology now hides it.**
No result file in `brain/log/` reports a measured ECE. The only ECE numbers in the repo are
hand-computed fixtures in `brain/tests/test_agent_calibration.py` (0.05, 0.4) that exist to test the
binning code, plus report 46's own statement that "The real ECE, Brier and reliability diagram are
S8b" (deferred: no API key, no SDK, the 644 live calls never made). `brain/ledger/citation_audit.md:172`
records the exposure explicitly: "the chapter ends its evaluation section on Guo and ECE as the
loop-closing guarantee, and **no ECE exists in the codebase**" (W26); `knowledge/02_prj93_pipeline_spec.md:139-147`
still lists ECE as unrun work. My six assigned sections **do not specify an ECE procedure at all** —
they specify only that the agent "returns a probability" and that "the calibration this apparatus
measures is *detection* calibration". So the methodology does not create a new unfulfilled promise,
but it also never discharges the one the literature review makes. **Action: either add an explicit
ECE/reliability-diagram procedure here and run it, or add one sentence naming ECE as specified-but-unrun
and cross-referencing the pending-measurement admission.** Leaving the lit review's ECE thread with no
methodological pickup is the single most exposed gap in this batch.

**2. Interval calibration and the seven-point window.** The methodology's Interval forecasts section
states that both coverage directions "are therefore tested against that bound" but **states no
calibration-set size, no window length, and no power caveat**. The seven-point window that produced the
1.00 coverage figure is a *results*-chapter artefact (report 49 §Part 1: "seven points cannot resolve
coverage to better than…"; the Clopper-Pearson interval "contains the nominal 0.90 and a great deal
else"), and the methodology correctly does not repeat that number. But the Detection section forward-refers
to "the under-coverage reported in Section~\ref{sec:res-coverage}" as an established finding. That
under-coverage (Beer Hall 0.87, CP [0.855, 0.887], report 49:14) IS properly powered, so the reference is
sound — **provided the results chapter keeps the seven-point figure and the powered figure separate.**
Recommend the methodology add one clause stating the minimum calibration-set size the coverage test
requires, so a reader cannot attach the test to the seven-point window.

**3. n, CIs and dispersion.** Where the methodology quotes counts (644 events, 3 zero-revenue days,
4-of-7 persistence) the underlying reports carry n and 95% intervals (report 09: recall 0.803 [0.77, 0.83];
report 49: Clopper-Pearson throughout; report 50: paired bootstrap B=10000 with [CI] per kind). The
methodology itself states no interval alongside any number, which is appropriate for a methods chapter,
but it **does not state that intervals will be reported** — worth one sentence, since report 50's
headline finding is a null (recall difference 0.0 [0.0, 0.0]) whose interpretability depends entirely on
the interval being shown.

**4. Null results and p ≥ 0.05.** The injection-protocol section says the realism gap's size "is an
empirical question rather than a matter for assertion" and the intervention section pre-declares that
agent/constant agreement "is to be reported as a negative result rather than reframed". Both are correct
pre-registration practice. **No p-values appear anywhere in these six sections**, and the underlying
reports use bootstrap CIs and Clopper-Pearson rather than significance tests — appropriate for
proportions and paired differences on small n. No correction for multiple comparisons is specified,
and report 49 tests coverage at 7 horizon steps × 2 states × 3 venues without one; the methodology
should say whether the per-step coverage comparisons are exploratory or corrected.

**5. Power gap in the realistic-arm claim.** The methodology describes the realistic arm as though it
runs on the full corpus. Report 50 runs it on a **stratified paired subsample n=120** (64 regime_shift,
32 spike, 24 exo_coincident, sample seed 95), not 644, and excludes Ellel entirely. The methodology
should state the subsample and its reason (compute budget, report 50 §"A substitution, stated up front"),
otherwise the results chapter's n=120 will read as an unexplained shrinkage.

## Counts
MATCHES 29 · STALE 1 · MISMATCH 0 · UNTRACEABLE 1 · total claims audited 31

---

## Batch B - methodology.tex, sections 5-9

The forecasting ladder and its gate - Exogenous covariates and the lead at
which they are available - Selecting among models when the series is short -
The model confidence set.

# Numerical audit — methodology.tex, batch B

Sections audited: "The forecasting ladder and its gate", "Exogenous covariates and the lead at
which they are available", "Selecting among models when the series is short", "The model
confidence set". Repo root for all paths: `/Users/hapuna/Downloads/ai-gm.ai-master/brain/`.

| # | Claim (verbatim) | Location | Repo source path | Repo value | Verdict | Fix |
|---|---|---|---|---|---|---|
| 1 | "a ladder of seven rungs of increasing capacity" | methodology.tex § The forecasting ladder and its gate | `/Users/hapuna/Downloads/ai-gm.ai-master/brain/models/ladder.py:137-346`; `/Users/hapuna/Downloads/ai-gm.ai-master/brain/README.md:112` | Rungs 0–4 = **five** rungs ("ladder rungs 0–4"); nine scored *entrants* (rung0, rung1, rung2_ets, rung2_stl, rung3_gbm, rung3_global_gbm, rung4_chronos2_exo, rung4_chronos_bolt, rung4_chronos2) | MISMATCH | Neither 5 nor 9 is 7, and the chapter's own text then enumerates only rungs 1–4 plus the benchmark. Write "five rungs" (or "nine entrants across five rungs") |
| 2 | "beats both the seasonal-naive benchmark and a robust day-of-week baseline on rolling-origin MASE" | § ladder | `models/ladder.py:501`, `README.md:157` | gate = "beats seasonal-naive AND robust DOW" | MATCHES | — |
| 3 | "a per-weekday median scaled by a monthly index clipped to $[0.5, 2.0]$" | § ladder | `models/ladder.py:150-154` | `.clip(0.5, 2.0)` on month median / overall median | MATCHES | — |
| 4 | "and a bank-holiday factor, and fits nothing" | § ladder | `models/ladder.py:155-162` | bank-holiday ratio median, applied only when `len(bh_train) >= 3`, else 1.0 | MATCHES | Undisclosed constant: the factor is suppressed below **3** bank-holiday observations. Worth one clause |
| 5 | "exponential smoothing with additive trend and additive seasonality at period 7" | § ladder | `models/ladder.py:190-193`; `config.py:183` | `trend="add", seasonal="add", seasonal_periods=SEASONAL_PERIOD`; `SEASONAL_PERIOD = 7` | MATCHES | — |
| 6 | "a robust seasonal-trend decomposition at the same period" | § ladder | `models/ladder.py:176` (`rung2_stl`) | present, period 7 | MATCHES | Omission: `rung2_prophet` (`models/ladder.py:199, 286`) is a third rung-2 entrant and is unmentioned |
| 7 | "Rung 3 is histogram gradient boosting forecasting recursively on its own lag features" | § ladder | `models/ladder.py:42, 211-214, 242` | `HistGradientBoostingRegressor` | MATCHES | — |
| 8 | "the served point forecast is the median quantile clipped at zero" | § ladder | `models/foundation.py:186-187, 276-278` | `quantiles[...,1]` = 0.5 quantile, `np.clip(median, 0.0, None)` | MATCHES | — |
| 9 | "refitted weekly, with an additional refit triggered by a confirmed change point" | § ladder | `config.py:382-383` | `RETRAIN_CADENCE_DAYS = 7`; `RETRAIN_ON_CHANGEPOINT = True` | MATCHES | — |
| 10 | "Fourteen covariates in four families condition the exogenous arm" | methodology.tex § Exogenous covariates and the lead at which they are available | `models/foundation.py:103-113`; `tests/test_exog_supplied.py:98` | `CHRONOS2_EXO_COLS` = 4 calendar + 1 event + 6 World Cup + 4 weather = **15**; test asserts `len(CHRONOS2_EXO_COLS) == 15` | MISMATCH | Change "Fourteen" to "Fifteen". The chapter's own four families (3 calendar/event + 6 fixture + 4 weather + 2 term) also sum to 15 |
| 11 | "six code-derived football-fixture features" | § exo | `models/foundation.py:107-109`; `features/build_features.py:102` | `_WORLD_CUP_EXO` = 6 | MATCHES | — |
| 12 | "four weather features" | § exo | `models/foundation.py:110` | `_WEATHER_EXO` = 4 | MATCHES | — |
| 13 | "a robust first-to-ninety-ninth-percentile interval of first and last transaction times per weekday" | § exo | `ingest/world_cup.py:16, 205, 219` | `quantile_cont(..., 0.01)` / `quantile_cont(..., 0.99)`, per DOW | MATCHES | — |
| 14 | "testing whether a kickoff time overlaps a venue's trading-hours envelope" | § exo | `ingest/world_cup.py:43` | overlap uses a stated assumed match duration constant | MATCHES | Undisclosed constant: the assumed match-duration window is not given in the chapter |
| 15 | "a forecast made at origin $t$ requires weather for $t+1,\dots,t+7$" | § exo | `CONTRACT.md:220`; `models/ladder.py:614` | 7-day horizon throughout | MATCHES | — |
| 16 | "horizon step 7 must be conditioned on a seven-day-ahead weather forecast" | § exo | `log/48_G17g_Weather_Basis.md:115-117` | `horizon_matched_target` hands step $h$ the lead-$h$ value | MATCHES | — |
| 17 | "Five weather arms are therefore specified and compared" | § exo | `log/48_G17g_Weather_Basis.md:24, 34` | arms N / O / H / F / M = 5 | MATCHES | Note report 48 line 150 says "the four weather arms" — that is the four *with* weather; not a conflict |
| 18 | "historical forecast archived near the valid time, which is the basis every previously published figure in this project used" | § exo | `log/48_G17g_Weather_Basis.md:34` | H = hindcast, "what every exo number used" | MATCHES | — |
| 19 | "a fixed three-day lead" | § exo | `log/48_G17g_Weather_Basis.md:34, 122, 225` | F = "fixed lead 3 days", read from the pinned `ecmwf_ifs025` store | MATCHES | — |
| 20 | "gives a single date up to seven different values, one per lead" | § exo | `log/48_G17g_Weather_Basis.md:117` | "under horizon matching a date carries up to [seven] values" | MATCHES | — |
| 21 | "tested by planting a short-lead value and confirming the guard fires" | § exo | `log/48_G17g_Weather_Basis.md:129`; `tests/test_weather_basis.py::test_lead_gate_fires_on_planted_short_lead_at_step_7` | gate fires; 16 tests in that file | MATCHES | — |
| 22 | "compared rung means over six rolling origins covering 42 consecutive days, and adopted the argument-minimum" | methodology.tex § Selecting among models when the series is short | `log/43_G17b_Fold_Count.md:53`; `log/Decision_and_Resolution_Log.md:1290-1291`; `README.md:48` | "six disjoint 7-day windows are 42 days"; "gate-selected on 6-fold rolling MASE" | MATCHES | This is the project's known argmin-over-six-fold-mean-with-no-dispersion defect (Major 3 / Major 4). The chapter names it as a defect — correct treatment |
| 23 | "multiplies the statistic by $[(n + 1 - 2h + n^{-1}h(h-1))/n]^{1/2}$" | § selection | `log/43_G17b_Fold_Count.md:40` | `n + 1 - 14 + 42/n` at h=7 — algebraically identical | MATCHES | — |
| 24 | "At $n=6$ and $h=7$ ... $6 + 1 - 14 + 7 = 0$, so the correction factor is exactly zero" | § selection | `log/43_G17b_Fold_Count.md:40-46`; `Decision_and_Resolution_Log.md:1291` | HLN = **0.0000** at 6 folds, all three venues; "exactly zero ... an algebraic zero" | MATCHES | — |
| 25 | "lifts the Beer Hall from 39 origins to 273" | § selection | `log/43_G17b_Fold_Count.md:260`; `:112` | "Beer Hall 39/273 ... exact" | MATCHES | — |
| 26 | "raises Equation~\ref{eq:hln} to 0.976" | § selection | `log/43_G17b_Fold_Count.md:12, 46`; `log/44_G17c_Model_Confidence_Set.md:241` | 0.9762 (Beer Hall); 0.9750 Ellel, 0.9683 TRT | MATCHES | — |
| 27 | "consecutive seven-day windows at a one-day step share six of seven observations" | § selection | `log/44_G17c_Model_Confidence_Set.md:146` | "consecutive origins share six of seven days" | MATCHES | — |
| 28 | "Primary loss & per-fold MASE" (Table 1) | methodology.tex § The model confidence set | `log/44_G17c_Model_Confidence_Set.md:144-145`; `Decision_and_Resolution_Log.md:1371-1373` | per-fold MASE primary | MATCHES | — |
| 29 | "Secondary loss & per-fold RMSSE" | § MCS | `log/44_G17c_Model_Confidence_Set.md:145` | RMSSE secondary | MATCHES | — |
| 30 | "Statistic & range statistic $T_R = \max_{i,j}\lvert t_{ij}\rvert$" | § MCS | `log/44_G17c_Model_Confidence_Set.md:145`; `Decision_and_Resolution_Log.md:1374-1375` | `T_R` = range, `max_{i,j} \|t_ij\|` | MATCHES | — |
| 31 | "Elimination rule & $e_R = \arg\max_i \sup_j t_{ij}$" | § MCS | `log/44_G17c_Model_Confidence_Set.md:145-146`; `Decision_and_Resolution_Log.md:1375` | `e_R = argmax_i sup_j t_ij` | MATCHES | — |
| 32 | "Bootstrap & moving block" | § MCS | `log/44_G17c_Model_Confidence_Set.md:146` | moving block bootstrap | MATCHES | — |
| 33 | "Block length & $\ell = 7$ primary, sensitivity across $\{2, 7, 14, 21\}$" | § MCS | `log/44_G17c_Model_Confidence_Set.md:147-148, 175-177, 243` | `l = 7` primary, sweep {2, 7, 14, 21}; `l = 2` narrow, {7,14,21} stable | MATCHES | — |
| 34 | "Replications & $B = 1000$ primary, $B = 5000$ as a stability check" | § MCS | `log/44_G17c_Model_Confidence_Set.md:148, 177, 208-209` | B = 1000 primary, repeated at 5000; B negligible except one boundary model | MATCHES | — |
| 35 | "Levels & $\alpha = 0.10$ primary, $0.25$ secondary; $0.05$ excluded for lack of power" | § MCS | `log/44_G17c_Model_Confidence_Set.md:148-149`; `Decision_and_Resolution_Log.md:1381` | "alpha 0.10 primary and 0.25 secondary, never 0.05 (no power at these n)" | MATCHES | — |
| 36 | "the parameters were fixed and written to the project's decision log before the procedure was run" | § MCS | `Decision_and_Resolution_Log.md` row 33 (line ~1364); `log/44_G17c_Model_Confidence_Set.md:142-144` | pre-registration row 33, written before the set was computed | MATCHES | — |
| 37 | "the 0.25 set is a subset of the 0.10 set" (implicit in "Levels" row / conservativeness text) | § MCS | `log/44_G17c_Model_Confidence_Set.md:154-155, 248` | nested by construction, one elimination sequence thresholded at each alpha | MATCHES | Chapter does not state the nesting is structural rather than empirical. Worth a clause |
| 38 | "the variance of a paired loss differential can be far smaller than the marginal standard errors ... suggest" | § MCS | `log/44_G17c_Model_Confidence_Set.md:161-172` | paired/independent sd ratio 0.06–0.45; paired se ~0.004–0.016 vs marginal ~0.029; "three to ten times smaller" | MATCHES (qualitatively) | Effect size is measured in the repo but omitted from the chapter. Insert the ratio range and the 3–10x figure |
| 39 | Bootstrap seed — **absent from the chapter's pre-registration table** | § MCS | `log/44_G17c_Model_Confidence_Set.md:149, 181` | seed fixed at **93** | UNTRACEABLE (in chapter — omission, not an error) | Add a "Seed" row to Table `tab:mcs-config`; a pre-registration table that omits the seed is not reproducible |
| 40 | Candidate-set size — **absent from the chapter** | § MCS | `log/43_G17b_Fold_Count.md:116-124`; `log/44_G17c_Model_Confidence_Set.md:184-187` | 9 entrants enter the MCS | UNTRACEABLE (in chapter — omission) | State the candidate-set size; it governs how severe the multiplicity control is |
| 41 | Common-fold restriction — **absent from the chapter** | § MCS | `log/44_G17c_Model_Confidence_Set.md:124, 181, 200-209` | Ellel scored on 246 of 260 folds for the exo entrant; sets reported at both 246 and 260 | UNTRACEABLE (in chapter — omission) | The chapter says "common-fold" nowhere; the n actually used at Ellel is not 260 |

## Statistical reporting

Checked against: n stated, effect size with significance, 95% CI / dispersion with every point
estimate, p-value per comparison, explicit statement where p >= 0.05, multiple-comparison
correction, test appropriateness.

1. **DM/HLN appropriateness — PASS, and this is the critical one.** The chapter does *not* claim
   a Diebold–Mariano test at n=6, h=7. It states the correction factor is exactly zero there and
   concludes "no corrected statistic is computable on any data whatsoever". That matches
   `log/43_G17b_Fold_Count.md:40-46` verbatim (HLN 0.0000 at all three venues). No MISMATCH.
2. **Argmin over a six-fold mean with no dispersion — correctly flagged, not committed.** The
   chapter presents the six-origin argmin as the *defect under audit* (§ selection, para 1), not
   as a result it relies on. No occurrence of the defect in these four sections.
3. **MCS is presented as multiple-comparison control — PASS on substance.** "conservative by
   construction, controlling error across the whole candidate set" is the right framing, and the
   bootstrap/block/alpha/elimination-rule quadruple is described exactly as executed. **FAIL on
   completeness:** the candidate-set size (9) is never stated, so the reader cannot judge the
   severity of the multiplicity being controlled (row 40). **FAIL:** the seed is missing from a
   table billed as a pre-registration (row 39).
4. **Effect size without magnitude — FAIL.** § MCS closing paragraph asserts that paired
   differential variance "can be far smaller" than marginal and that this "is what determines
   whether the procedure can discriminate at all", but reports no number. The repo has them
   (paired/independent sd ratio 0.06–0.45, paired se ~0.004–0.016 against marginal ~0.029,
   "three to ten times smaller", `log/44_G17c_Model_Confidence_Set.md:161-172`). Fix: state the
   ratio range and the 3–10x factor.
5. **No dispersion attached to the HLN factors — acceptable.** 0.976 / 0.9762 is a deterministic
   function of n and h, not an estimate; no CI is owed.
6. **§ ladder states a selection gate with no n and no dispersion — FAIL (scoping).** "adopted
   only if it beats both ... on rolling-origin MASE" gives neither the fold count nor any
   dispersion. § selection later repairs this, but the ladder section as written reproduces the
   bare-mean framing. Fix: forward-reference § selection at the gate, or state n there.
7. **§ exo, "it biases the apparent value of the exogenous path upward" — asserted a priori,
   and the project's own measurement does not support it at the served venue.** Report 48
   (`log/48_G17g_Weather_Basis.md:150-152, 181-182, 201-202`) finds every paired CI across the
   four weather arms spans zero at Beer Hall, and that M's edge over N (0.0163) is at least H's
   edge over N (0.0143) — "no measurable optimism at the served venue". Fix: mark the upward-bias
   claim as the *a priori expectation being tested*, and note it is not borne out at Beer Hall.
   No p-value or CI accompanies the claim as written.
8. **No 95% CI appears anywhere in these four sections.** Defensible here — these sections carry
   design constants rather than point estimates — but rows 38 and 7 are places where the repo has
   an interval and the chapter has none.
9. **Alpha choice.** 0.10 primary with 0.05 excluded for lack of power is unorthodox but
   pre-registered and justified in the repo (`Decision_and_Resolution_Log.md:1381`); the chapter
   states the reason. Acceptable.

## Counts

MATCHES 34 · STALE 0 · MISMATCH 2 · UNTRACEABLE 3 (all three are chapter omissions of values
that exist in the repo, not fabricated numbers) · Statistical-reporting failures 5 (items 3, 4,
6, 7, 8 above).

---

## Batch E - results.tex, sections 6-14

The denominator, and where the scaled error fails - Restating the headline
out-of-sample figure - Demand classification under corrected constants - The
occurrence gate - Cross-series in-context learning does not pay at this estate
- A library property that would have inverted this result - Weather, and the
lead at which it is available - A covariate gap that was an ingest defect.

# Numerical audit — batch E (results.tex, 8 sections)

Repo root for paths below: `/Users/hapuna/Downloads/ai-gm.ai-master/brain/`

| # | Claim (verbatim) | Location | Repo source path | Repo value | Verdict | Fix |
|---|---|---|---|---|---|---|
| 1 | "$B = 10\,000$, 95 per cent percentile interval, ruler pinned at as-of 2026-07-07" | § denominator | log/45_G17d_Intermittency_and_Occurrence.md:89,202 | B = 10000, 95% percentile, as_of 2026-07-07 | MATCHES | — |
| 2 | Table bootstrap, row BH calendar_lag7, cols = 315.7 / [270.0, 365.0] / 30.1% / 0.571 [0.494, 0.668] | § denominator | log/45:97 | identical | MATCHES | — |
| 3 | Table bootstrap, row BH calendar_lag7_active = 386.9 / [332.1, 446.4] / 29.5% / 0.466 [0.404, 0.543] | § denominator | log/45:98 | identical | MATCHES | — |
| 4 | Table bootstrap, row TRT calendar_lag7_active = 173.2 / [148.6, 202.1] / 30.9% / n/a | § denominator | log/45:99 | identical ("n/a (dormant)") | MATCHES | — |
| 5 | Table bootstrap, row Ellel calendar_lag7 = 180.1 / [135.3, 229.9] / 52.5% / 0.411 [0.322, 0.547] | § denominator | log/45:100 | identical | MATCHES | — |
| 6 | Table bootstrap, row Ellel trading_lag7 = 770.8 / [604.3, 952.7] / 45.2% / 0.096 [0.078, 0.122] | § denominator | log/45:101 | identical | MATCHES | — |
| 7 | Table bootstrap, row Ellel trading_same_weekday = 806.2 / [639.1, 979.2] / 42.2% / 0.092 [0.076, 0.116] | § denominator | log/45:102 | identical | MATCHES | — |
| 8 | Table bootstrap, row Ellel calendar_lag7_active = 754.0 / [522.0, 1016.4] / 65.6% / 0.098 [0.073, 0.142] | § denominator | log/45:103 | identical | MATCHES | — |
| 9 | "adequately sampled, at 276 and 268 admissible pairs" | § denominator | log/45:98-99; log/42:139-140 | 276 (BH), 268 (TRT) | MATCHES | — |
| 10 | "The active basis rests on 28 pairs" | § denominator | log/45:103; log/42:141 | 28 | MATCHES | — |
| 11 | "interval width near 30 per cent" | § denominator | log/45:97-99 | 30.1 / 29.5 / 30.9% | MATCHES | — |
| 12 | "induced MASE running from $0.322$ to $0.547$" | § denominator | log/45:100 | [0.322, 0.547] | MATCHES | — |
| 13 | "denominator inflates to between 770 and 806 ... induced MASE falls to about $0.09$" | § denominator | log/45:101-102,116 | 770.8–806.2; ~0.09 | MATCHES | — |
| 14 | "reaches back nearly six weeks" / "1.2 trading days a week" | § denominator | log/45:113-116; log/42:67 (1.21) | 1.21 trading days/wk | MATCHES | — |
| 15 | "reported a Beer Hall July out-of-sample MASE of $0.386$ against a backtest class of $0.745$" | § headline | log/42_G17a_Metric_Integrity.md:10-19 | 0.386 published, backtest 0.745 | MATCHES | — |
| 16 | "a single mean absolute error of $\pounds 243.5$" | § headline | log/42:103 | MAE 243.5 | MATCHES | — |
| 17 | "scores $0.772$, $0.385$, $0.534$ and $0.629$" | § headline | log/42:103 | 0.772 / 0.385 / 0.534 / 0.629 | MATCHES | — |
| 18 | "The published $0.386$ reproduces at $0.385$ on trading_lag7" | § headline | log/42:11,17,28-29 | reproduces at 0.385 | MATCHES | — |
| 19 | "the same forecast scores $0.772$ against a backtest of $0.745$, marginally worse" | § headline | log/42:12,22-26 | 0.772 vs 0.745, "slightly worse" | MATCHES (supersedes the 0.386-vs-0.745 reading) | — |
| 20 | "SBC constants are $p \geq 1.32$, $v \geq 0.49$" | § classification | eval/intermittency_diagnostic.py:48-49; log/45:47 | ADI_CUTOFF_SBC=1.32, CV2_CUTOFF_SBC=0.49 | MATCHES | — |
| 21 | "corrected constants of Kostenko … are $p \geq 4/3$, $v \geq 0.5$" | § classification | eval/intermittency_diagnostic.py:50-51; ledger/citation_audit.md:190 | 4/3, 0.5; citation verified verbatim | MATCHES | — |
| 22 | Table intermittency, Beer Hall non-zero revenue = 1.3267 / 0.62 / lumpy / erratic | § classification | log/45:56 | identical | MATCHES | — |
| 23 | Table intermittency, Beer Hall any till activity = 1.3223 / 0.63 / lumpy / erratic | § classification | log/45:57 | identical | MATCHES | — |
| 24 | Table intermittency, Two River Taps (both rows) = 1.1828 / 0.61 / erratic / erratic | § classification | log/45:58-59 | identical | MATCHES | — |
| 25 | Table intermittency, Ellel non-zero revenue = 5.9231 / 1.04 / lumpy / lumpy | § classification | log/45:60 | identical | MATCHES | — |
| 26 | Table intermittency, Ellel any till activity = 5.8333 / 1.07 / lumpy / lumpy | § classification | log/45:61 | identical | MATCHES | — |
| 27 | "band between the incorrect cutoff of $1.32$ and the correct value of $4/3 = 1.3333$" | § classification | log/45:49,82 | [1.32, 1.3333) | MATCHES | — |
| 28 | "the nearest intermittent node having $p = 1.4129$" | § classification | log/45:83; eval/intermittency_diagnostic.py:54-56 | 1.4129 | MATCHES | — |
| 29 | "every venue at L1 selects the approximation" | § classification | log/45:73-75 says **no node selects SBA**; ledger/citation_audit.md:190 confirms published rule is $v > 2-\tfrac32 p$; eval/intermittency_diagnostic.py:89 codes `cv2 < 2 - 1.5*adi` | report 45: none; chapter: all three | **STALE (report 45 superseded) + repo code still wrong** | Chapter is correct. Report 45 lines 73-75 and `select_sba` (eval/intermittency_diagnostic.py:81-89) still carry the reversed inequality — fix the code and note the correction, or the chapter's claim has no repo artefact backing it |
| 30 | "squared coefficients of variation lying between $0.61$ and $1.04$" | § classification | log/45:56-61 | 0.61 (TRT) – 1.04 (Ellel) | MATCHES | — |
| 31 | "against thresholds $2 - \tfrac{3}{2}p$ between $0.23$ and $-6.88$" | § classification | derived from log/45 ADIs (1.1828→0.2258; 5.9231→−6.885) | 0.226 / 0.010 (BH) / −6.885 | MATCHES (range is correct; BH's own threshold 0.010 lies inside) | optional: state it is the range across venues |
| 32 | "compared with the unconditional forecast on the same 273 origins" | § occurrence gate | log/45:147-149 | 273 step-1 origins | MATCHES | — |
| 33 | Table occurrence, Gated (hurdle) = 0.787 / 1.000 / yes | § occurrence gate | log/45:153 | identical | MATCHES | — |
| 34 | Table occurrence, Unconditional = 0.803 / 0.391 / yes | § occurrence gate | log/45:154 | identical | MATCHES | — |
| 35 | "The gate lowers the mean by $0.016$" | § occurrence gate | log/45:156 | 0.016 | MATCHES | — |
| 36 | "the Beer Hall trades roughly 75 per cent of days" | § occurrence gate | log/45:158; log/42:65 (302/399 = 75.7%) | ~75% | MATCHES | — |
| 37 | Table group, BH: MASE $n{=}260$, U 0.6091, G2 0.6166, G3 0.6185, set {U,G2,G3}, U lower excl. 0 | § group ICL | log/47_G17f_Group_ICL.md:18 | identical | MATCHES | — |
| 38 | Table group, Ellel: MAE $n{=}260$, 110.85 / 110.53 / 110.21, {G3,G2,U}, group lower spans 0 | § group ICL | log/47:19 | identical | MATCHES | — |
| 39 | Table group, TRT: MASE $n{=}203$, U 0.6263, G2 n/a, G3 0.6406, {U}, U lower excl. 0 | § group ICL | log/47:20 | identical | MATCHES | — |
| 40 | "a grouped forecast differs from the univariate one by roughly $\pounds 40$" | § group ICL | log/47 (searched: only GBP 44.8, and that is the *batch-merge* probe at :58) | no £40 figure anywhere | **UNTRACEABLE** | Either cite the real quantity or drop; risks being read as the £44.8 batch figure double-counted |
| 41 | "$\text{G3} < \text{G2} < \text{U}$ ... but the interval spans zero" | § group ICL | log/47:19,150-154 (U−G3 mean +0.64, CI [−0.71, +1.93]) | confirmed | MATCHES | quote the CI |
| 42 | "shift forecasts by roughly $\pounds 45$" (oversized batch) | § library property | log/47:58 | GBP 44.8 | MATCHES | — |
| 43 | "five tests fire on planted leaks" | § library property | log/47:178 | "Five tests, each proving the guard fires on a planted leak" | MATCHES | — |
| 44 | "batch size is pinned to the number of venues ... origin-major order" | § library property | log/47:56-59 | confirmed (pipeline default 256 rejected) | MATCHES | — |
| 45 | "complete at every lead from one to seven days for all three cells ... at 399, 392 and 331 days" | § weather | log/48_G17g_Weather_Basis.md:109-111 | 399/399, 392/392, 331/331 | MATCHES | — |
| 46 | "Pinning a high-resolution local model ... only one valid day at lead five and none at lead seven" | § weather | log/48:97-99 | ukmo_seamless L5=1, L7=0 | MATCHES | — |
| 47 | Table weather, Beer Hall MASE = 0.6005 / 0.5865 / 0.5862 / 0.5860 / 0.5842 | § weather | log/48:26,149 | identical | MATCHES | — |
| 48 | Table weather, Ellel MAE = 110.85 / 110.88 / 110.78 / 111.02 / 111.00 | § weather | log/48:27 | identical | MATCHES | — |
| 49 | Table weather, Two River Taps MASE = 0.6260 / 0.6233 / 0.6261 / 0.6246 / 0.6232 | § weather | log/48:28,173 | identical | MATCHES | — |
| 50 | "All five arms are retained in the 90 per cent set at every venue" | § weather | log/48:11-13,149,161,173 | confirmed | MATCHES | — |
| 51 | "historical-forecast and horizon-matched arms are statistically inseparable at the Beer Hall" | § weather | log/48:152-153 (H vs M +0.0020, CI [−0.0019, +0.0066]) | confirmed | MATCHES | quote the CI |
| 52 | "at Ellel, the archived basis beats the horizon-matched one with an interval excluding zero" | § weather | log/48:164-166 (H beats M by 0.22 MAE, CI [−0.42, −0.033]) | confirmed | MATCHES | quote effect + CI |
| 53 | "gap from no weather to the best weather arm is $0.0163$ MASE at the Beer Hall" | § weather | log/48:153 (N vs M +0.0163, CI [+0.0004, +0.0337]) | 0.0163 | MATCHES | CI omitted in chapter; lower bound 0.0004 is borderline and should be stated |
| 54 | "roughly seven times the $0.0023$ spread across the four weather bases" | § weather | derived from log/48:149 (0.5865 − 0.5842 = 0.0023); 0.0163/0.0023 = 7.1 | 0.0023, ratio 7.1 | MATCHES | — |
| 55 | "about $1.8$ paired standard errors" | § weather | log/44_G17c_Model_Confidence_Set.md:167 (BH paired se ~0.007–0.011); 0.0163/0.009 = 1.81 | consistent | MATCHES (derived, not stated) | cite the se band |
| 56 | "the difference between it and the horizon-matched arm is $0.0023$, roughly a third of a paired standard error" | § weather | log/48:149; log/44:167 | 0.0023; 0.0023/0.007 = 0.33 (0.21 at se 0.011) | MATCHES at the low end of the se band | say "a quarter to a third" or fix the se used |
| 57 | "The fixed-lead arm falling between the archived and horizon-matched arms" | § weather | log/48:149 (M 0.5842 < F 0.5860 < H 0.5862) | confirmed | MATCHES | — |
| 58 | "could not be scored on fourteen consecutive folds at Ellel" | § covariate gap | log/48:84-91 | 14 folds | MATCHES | — |
| 59 | "a nine-day hole in the weather record, 2026-06-21 to 2026-06-29" | § covariate gap | log/48:52 | identical dates | MATCHES | — |
| 60 | "Refetching the span returns complete data on all nine days across all three bases" | § covariate gap | log/48:58-59 | 9 of 9 non-null, all three bases | MATCHES | — |
| 61 | "takes Ellel from 246 to 260 scoreable origins" | § covariate gap | log/48:84-90,217 | 246 → 260 | MATCHES | — |
| 62 | "a six-day lookback, truncated by the frame end, accounts for exactly fourteen affected windows" | § covariate gap | log/48:85-87 (windows 2026-06-15..2026-07-04, train_end 2026-06-14..2026-06-27; bounded to 14 by Ellel's active span ending 2026-07-04) | 14, cause stated but "six-day lookback" not named | MATCHES (count); lookback length UNTRACEABLE as phrased | either drop "six-day lookback" or cite the window arithmetic in log/48:85-87 |
| 63 | "reproduce the committed figures to within $1.4\times10^{-6}$ and $1.6\times10^{-6}$ respectively" | § covariate gap | log/48:216 (G3: N max delta 8.3e-7 / 7.8e-7 / **1.4e-6** BH/Ellel/TRT; H 1.6e-6 / 4.8e-7 / 5.8e-7) | Ellel's own values are 7.8e-7 and 4.8e-7 | MATCHES only as an across-venue max, in a paragraph that is otherwise about Ellel | say "across all three venues" or quote Ellel's 7.8e-7 / 4.8e-7 |

## Statistical reporting

- **n stated**: group table (260/260/203) and occurrence (273) yes. Intermittency table gives **no n** (repo: n = 399 / 331 / 386, log/45:52). Weather table gives **no n** (repo: BH 273, Ellel 260, TRT 205, log/48:26-28). Bootstrap table gives no per-basis pair counts except 276/268/28 in prose (repo also has 392, 385, 61, 67 at log/45:97-103). **Add n to both table captions.**
- **Dispersion with every point estimate**: violated in three places. (a) The group table reports "excl. 0 / spans 0" as words while the repo has the intervals (U−G2 0.0075 [0.0009, 0.0153]; U−G3 0.0094 [0.0018, 0.0183]; TRT U−G3 0.0144 [0.0041, 0.0254]; Ellel U−G3 +0.64 [−0.71, +1.93]) — log/47:143,154,164. (b) The weather table carries five point estimates per venue and **no** interval; every paired CI exists at log/48:152-176. (c) The occurrence table reports a 0.016 mean difference with an MCS p but **no interval on the difference itself**.
- **p-values**: MCS p reported for the occurrence arms only. The group and weather sections give set membership but not p (repo has BH G2/G3 p=0.129, TRT G3 p=0.035, BH N p=0.459 — log/47:141,161; log/48:153).
- **Explicit "not statistically significant"**: present in substance ("both arms are retained", "spans zero", "inseparable") but never as the phrase, and never with the p that would license it. The occurrence null in particular is asserted from set membership alone.
- **Multiple-comparison correction**: correctly handled and correctly explained — the MCS is the corrected instrument and the chapter says so explicitly in the group section ("the confidence set controls error across the whole candidate set"). The weather section's N-vs-M claim leans on an **uncorrected** paired CI whose lower bound is 0.0004 (log/48:153, which flags exactly this); the chapter reports 0.0163 without that caveat. **Add it.**
- **Test appropriateness**: MCS (Hansen–Lunde–Nason), moving-block bootstrap block 7 with a documented sensitivity sweep (log/44:172-179), paired resampling of folds jointly — all appropriate and well specified in the repo; the chapter simply under-reports the parameters (B, block length, seed).
- **Bare argmin over a six-fold mean, no dispersion**: **no occurrence in this slice.** Every comparison here is adjudicated by MCS and/or paired bootstrap. The nearest defect is § "Restating the headline out-of-sample figure", where 0.772 / 0.745 / 0.385 / 0.534 / 0.629 are all single-window point estimates on **n = 7** (log/42:103) with no dispersion at all, and the § denominator induced-MASE column inherits that n = 7 numerator while varying only the denominator. The chapter should state n = 7 and that the comparison is not a significance test.

## CV^2 definition check

**The repo uses the correct Syntetos–Boylan–Croston definition: CV² is computed on demand sizes conditional on demand occurring (non-zero periods only).**

`_pattern` in `eval/intermittency_diagnostic.py:90-110`:

```
sizes = size[occ]
cv2 = (float((sizes.std(ddof=1) / sizes.mean()) ** 2) ...)
```

`occ` is the demand-occurrence mask, `sizes = size[occ]` selects demand periods only, and the docstring states "CV-squared is taken over demand-day sizes". The module header (line 16) likewise: "CV2 squared coefficient of variation of **non-zero** demand sizes". ADI is `mean(diff(flatnonzero(occ)))`, i.e. the mean interval between successive demand days — also correct. Sample sd (`ddof=1`) is used. **No classification moves; the chapter's table is safe on this axis.**

One definitional note the chapter does not carry: the "any till activity" demand-day reading counts a comped-to-zero open day as a demand day with **size 0**, so that row's CV² is taken over a size vector containing zeros (log/42:217-240 documents the three such days; log/45:145-146 rules the comped day occurrence 1, amount 0). This is a deliberate, documented choice, but it means the "any till activity" rows are *not* strictly SBC-conditional. Worth one sentence.

**SBC vs Kostenko–Hyndman constants**: the chapter uses both, correctly labelled, and the venue in the band (Beer Hall, p = 1.3267) is exactly the case that separates them. `eval/intermittency_diagnostic.py:48-56` carries both constant pairs and sets the served trigger `ADI_INTERMITTENT_CUTOFF = ADI_CUTOFF_KH`, so chapter and repo agree that the corrected constants are the operative ones. **The one place they disagree is the SBA selection rule (row 29): the chapter has the published direction ($v > 2-\tfrac32 p$, confirmed verbatim in `ledger/citation_audit.md:190`), the code at line 89 still has it reversed, and log/45:73-75 still publishes the reversed conclusion.**

## Counts

63 claims audited — MATCHES 60, STALE 1 (row 29), MISMATCH 0, UNTRACEABLE 2 (rows 40, 62-partial). Sections covered: 8 of 8.

---

## Batch D - results.tex, sections 1-5

The ladder, and what the original gate could not establish - A case where the
small sample selected the wrong model - Which models the data cannot separate -
Why the test can discriminate at all - The reported library-induced flip,
tested and withdrawn.

# Numerical audit — batch D (results.tex, 5 sections)

| # | Claim (verbatim) | Location | Repo source path | Repo value | Verdict | Fix |
|---|---|---|---|---|---|---|
| 1 | Table ladder, row 0 seasonal-naive, col Beer Hall = 1.006 | § The ladder | brain/models/ladder_results_L1_beer_hall.md:10 | 1.006 | MATCHES | — |
| 2 | Table ladder, row 1 robust DOW, col Beer Hall = 1.029 | § The ladder | brain/models/ladder_results_L1_beer_hall.md:11 | 1.029 | MATCHES | — |
| 3 | Table ladder, row 2 exp smoothing, col Beer Hall = 0.799 | § The ladder | brain/models/ladder_results_L1_beer_hall.md:12 | 0.799 | MATCHES | — |
| 4 | Table ladder, row 2 STL, col Beer Hall = 1.125 | § The ladder | brain/models/ladder_results_L1_beer_hall.md:14 | 1.125 | MATCHES | — |
| 5 | Table ladder, row 3 HistGBM, col Beer Hall = 0.927 | § The ladder | brain/models/ladder_results_L1_beer_hall.md:15 | 0.927 | MATCHES | — |
| 6 | Table ladder, row 3 global GBM, col Beer Hall = 0.920 | § The ladder | brain/models/ladder_results_L1_beer_hall.md:16 | 0.920 | MATCHES | — |
| 7 | Table ladder, row 4 foundation univariate, col Beer Hall = 0.793 | § The ladder | brain/models/ladder_results_L1_beer_hall.md:17 | 0.793 | MATCHES | — |
| 8 | Table ladder, row 4 foundation exogenous, col Beer Hall = **0.745** | § The ladder | brain/models/ladder_results_L1_beer_hall.md:18 | 0.745 | MATCHES | — |
| 9 | Table ladder, row 0, col Two River Taps = 0.673 | § The ladder | brain/models/ladder_results_L1_two_river_taps.md:10 | 0.673 | MATCHES | — |
| 10 | Table ladder, row 1, col Two River Taps = 0.737 | § The ladder | brain/models/ladder_results_L1_two_river_taps.md:11 | 0.737 | MATCHES | — |
| 11 | Table ladder, row 2 exp smoothing, col Two River Taps = **0.597** | § The ladder | brain/models/ladder_results_L1_two_river_taps.md:12 | 0.597 | MATCHES | — |
| 12 | Table ladder, row 2 STL, col Two River Taps = 0.829 | § The ladder | brain/models/ladder_results_L1_two_river_taps.md:14 | 0.829 | MATCHES | — |
| 13 | Table ladder, row 3 HistGBM, col Two River Taps = 0.602 | § The ladder | brain/models/ladder_results_L1_two_river_taps.md:15 | 0.602 | MATCHES | — |
| 14 | Table ladder, row 3 global gradient boosting, col Two River Taps = n/a | § The ladder | brain/models/ladder_results_L1_two_river_taps.md:16; brain/log/43_G17b_Fold_Count.md:181 | 0.728 (6 folds, scored) | **MISMATCH** | Replace `n/a` with 0.728. The rung scored normally at TRT; only `rung2_prophet` is unscored (backend not installed) and it is not in the chapter table. |
| 15 | Table ladder, row 4 foundation univariate, col Two River Taps = 0.636 | § The ladder | brain/models/ladder_results_L1_two_river_taps.md:17 | 0.636 | MATCHES | — |
| 16 | Table ladder, row 4 foundation exogenous, col Two River Taps = 0.612 | § The ladder | brain/models/ladder_results_L1_two_river_taps.md:18 | 0.612 | MATCHES | — |
| 17 | Table ladder, row 0, col Ellel = 0.924 | § The ladder | brain/models/ladder_results_L1_ellel.md:8 | 0.924 | MATCHES | — |
| 18 | Table ladder, row 1 robust DOW, col Ellel = **0.572** | § The ladder | brain/models/ladder_results_L1_ellel.md:9 | 0.572 | MATCHES | — |
| 19 | Table ladder, row 2 exp smoothing, col Ellel = 0.825 | § The ladder | brain/models/ladder_results_L1_ellel.md:10 | 0.825 | MATCHES | — |
| 20 | Table ladder, row 2 STL, col Ellel = 0.629 | § The ladder | brain/models/ladder_results_L1_ellel.md:12 | 0.629 | MATCHES | — |
| 21 | Table ladder, row 3 HistGBM, col Ellel = 0.813 | § The ladder | brain/models/ladder_results_L1_ellel.md:13 | 0.813 | MATCHES | — |
| 22 | Table ladder, row 3 global GBM, col Ellel = 0.936 | § The ladder | brain/models/ladder_results_L1_ellel.md:14 | 0.936 | MATCHES | — |
| 23 | Table ladder, row 4 foundation univariate, col Ellel = 0.581 | § The ladder | brain/models/ladder_results_L1_ellel.md:15 | 0.581 | MATCHES | — |
| 24 | Table ladder, row 4 foundation exogenous, col Ellel = 0.591 | § The ladder | brain/models/ladder_results_L1_ellel.md:16 | 0.591 | MATCHES | — |
| 25 | "used six rolling origins at a seven-day horizon" | § The ladder | brain/log/43_G17b_Fold_Count.md:40-54; ladder_results_L1_*.md ("6 held-out folds") | n=6, h=7 | MATCHES | — |
| 26 | "the Harvey-Leybourne-Newbold correction factor is exactly zero at those settings" | § The ladder | brain/log/43_G17b_Fold_Count.md:40-42 | HLN(6,7)=0 exactly | MATCHES | — |
| 27 | Table folds, row Beer Hall, col Origins step 7 = 39 | § The ladder | brain/log/43_G17b_Fold_Count.md:260 | 39 | MATCHES | — |
| 28 | Table folds, row Beer Hall, col Origins step 1 = 273 | § The ladder | brain/log/43_G17b_Fold_Count.md:46 | 273 | MATCHES | — |
| 29 | Table folds, row Beer Hall, col Correction factor = 0.9762 | § The ladder | brain/log/43_G17b_Fold_Count.md:46 | 0.9762 | MATCHES | — |
| 30 | Table folds, row Ellel, col Origins step 7 = 38 | § The ladder | brain/log/43_G17b_Fold_Count.md:260 | 38 | MATCHES | — |
| 31 | Table folds, row Ellel, col Origins step 1 = 260 | § The ladder | brain/log/43_G17b_Fold_Count.md:47,56-64 | 260 (spec's 266 is an erratum) | MATCHES | — |
| 32 | Table folds, row Ellel, col Correction factor = 0.9750 | § The ladder | brain/log/43_G17b_Fold_Count.md:47 | 0.9750 | MATCHES | — |
| 33 | Table folds, row Two River Taps, col Origins step 7 = 30 | § The ladder | brain/log/43_G17b_Fold_Count.md:260 | 30 | MATCHES | — |
| 34 | Table folds, row Two River Taps, col Origins step 1 = 205 | § The ladder | brain/log/43_G17b_Fold_Count.md:48 | 205 | MATCHES | — |
| 35 | Table folds, row Two River Taps, col Correction factor = 0.9683 | § The ladder | brain/log/43_G17b_Fold_Count.md:48 | 0.9683 | MATCHES | — |
| 36 | "At six folds the factor is identically zero and no corrected statistic exists" | § The ladder (caption) | brain/log/43_G17b_Fold_Count.md:40-42 | identical | MATCHES | — |
| 37 | "on the original six folds, the gate selects the robust day-of-week baseline" | § wrong model | brain/log/43_G17b_Fold_Count.md:120,126-129 (6f@0707 robust_dow 1.267 = lowest) | robust_dow wins | MATCHES | — |
| 38 | "ranks the served foundation model fifth of nine" | § wrong model | brain/log/43_G17b_Fold_Count.md:116-124 (6f@0707 column: 1.267, **1.312**, 1.368, 1.412, 1.466, 1.519, 1.553, 1.561, 1.773) | rank **2** of 9 | **MISMATCH** | The repo table ranks `rung4_chronos2_exo` second at 6f@0707, not fifth. Report 43's own prose says "fifth" but its table contradicts it. Recompute the rank from the fold vectors and state it; do not inherit the prose error. |
| 39 | "Evaluated on 273 origins over the same frame, the served model returns to first" | § wrong model | brain/log/43_G17b_Fold_Count.md:116; brain/eval/mcs_L1_results.json (mean_loss beer_hall: exo 0.7163 lowest) | first at 273 origins | MATCHES | — |
| 40 | "the univariate arm reproduces the committed ladder to within $1.4\times10^{-6}$ over 738 folds" | § wrong model | brain/log/47_G17f_Group_ICL.md:170-171,179 | max per-fold delta 1.4e-6, 738 folds | MATCHES | Report 47 reproduces the **step-1** means (0.7342/0.6023/0.6709), not the committed six-fold ladder; wording "committed ladder" is loose. |
| 41 | Table mcs, row Beer Hall, col Set = 5/9 | § cannot separate | brain/eval/mcs_L1_results.json venues.beer_hall.mcs_primary_mase.common_fold.set_sizes["0.1"] = 5 | 5 | MATCHES | — |
| 42 | Table mcs, row Beer Hall, col MCS p = 1.000 | § cannot separate | same, mcs_pvalue.rung4_chronos2_exo = 1.0 | 1.000 | MATCHES | — |
| 43 | Table mcs, row Beer Hall, col Alignment = 273 origins | § cannot separate | same, n_folds = 273 | 273 | MATCHES | — |
| 44 | Table mcs, row Two River Taps, col Set = 4/9 | § cannot separate | brain/eval/mcs_L1_results.json two_river_taps (set 0.1 has 4 members) | 4 | MATCHES | — |
| 45 | Table mcs, row Two River Taps, col MCS p = 1.000 | § cannot separate | same, mcs_pvalue.rung2_ets = 1.0 | 1.000 | MATCHES | — |
| 46 | Table mcs, row Two River Taps, col Alignment = 205 origins | § cannot separate | same, n_folds = 205 | 205 | MATCHES | — |
| 47 | Table mcs, row Ellel (246), col Set = 5/9 | § cannot separate | brain/eval/mcs_L1_results.json ellel.mcs_primary_mase.common_fold.set_sizes["0.1"] = 5 | 5 | MATCHES | — |
| 48 | Table mcs, row Ellel (246), col MCS p = 0.575 | § cannot separate | same, mcs_pvalue.rung1_robust_dow = 0.575 | 0.575 | MATCHES | — |
| 49 | Table mcs, row Ellel (246), col Alignment = 246 common folds | § cannot separate | same, n_folds = 246 | 246 | MATCHES | — |
| 50 | Table mcs, row Ellel (260), col Set = 3/9 | § cannot separate | brain/eval/mcs_L1_results.json ellel...full_excluding_short.set_sizes["0.1"] = 3 | 3 | MATCHES | — |
| 51 | Table mcs, row Ellel (260 folds, exo rung excluded), col MCS p = **0.575** | § cannot separate | brain/eval/mcs_L1_results.json ellel.mcs_primary_mase.full_excluding_short.mcs_pvalue.rung1_robust_dow = **0.579** | 0.579 | **MISMATCH** | Change to 0.579. The chapter has copied the 246-fold p-value into the 260-fold row; the two runs give different p-values (0.575 vs 0.579). Report 44 quotes only the 246-fold figure, so the error is the chapter's. |
| 52 | Table mcs caption: "Model confidence set at $\alpha = 0.10$" | § cannot separate | brain/eval/mcs_L1_results.json alphas; log/44:148-149 | alpha 0.10 primary, 0.25 secondary | MATCHES | — |
| 53 | "cannot be scored on fourteen folds affected by the covariate gap" | § cannot separate (caption) | brain/log/43_G17b_Fold_Count.md:161-166; log/44:123-124 (folds 246-259) | 260-246 = 14 | MATCHES | — |
| 54 | "at the Beer Hall five of nine rungs are retained" | § cannot separate | brain/eval/mcs_L1_results.json beer_hall set_sizes["0.1"]=5 | 5 of 9 | MATCHES | — |
| 55 | "Ellel had been the one venue where the argument-minimum moved **when the fold count rose**" | § cannot separate | brain/log/43_G17b_Fold_Count.md:147-154 | flip is a **ceiling** effect, present already at 6 folds @0707; fold count did NOT move it | **MISMATCH** (causal attribution) | Report 43 §3 decomposes it explicitly: `committed -> 6f@0707` flips robust_dow→chronos_bolt (store growth); `6f@0707 -> step1@0707` is stable. Reword to attribute the flip to the store ceiling, not the fold count. |
| 56 | "on a gap of $0.008$ MASE" | § cannot separate | brain/log/43_G17b_Fold_Count.md:200 | 0.0084 | MATCHES | — |
| 57 | "against a per-fold standard deviation of $0.71$" | § cannot separate | brain/log/43_G17b_Fold_Count.md:198-199 | winner sd 0.743, served sd 0.710 | MATCHES | 0.71 is the served model's sd; the winner's is 0.743. Say which. |
| 58 | "that is $0.18$ standard errors" | § cannot separate | brain/log/43_G17b_Fold_Count.md:200 | 0.18 se | MATCHES | — |
| 59 | "The incumbent is retained under both alignments and under the secondary loss" | § cannot separate | brain/log/44_G17c_Model_Confidence_Set.md:198-202,226-231 | retained in 246-fold, 260-fold, and RMSSE | MATCHES | — |
| 60 | "marginal standard errors of the rung means at the Beer Hall are near $0.029$" | § discriminate | brain/log/43_G17b_Fold_Count.md:116-124 (se column 0.027-0.032) | 0.029 typical | MATCHES | — |
| 61 | "against gaps at the top of the ladder near $0.036$" | § discriminate | brain/eval/mcs_L1_results.json beer_hall mean_loss (0.7163 exo vs 0.7524 ets = 0.0361) | 0.036 | MATCHES | — |
| 62 | "ratio of paired to independent standard deviation lies between $0.16$ and $0.27$" | § discriminate | brain/eval/mcs_L1_results.json beer_hall.paired_variance_top4 (0.162, 0.219, 0.222, 0.228, 0.272, 0.274) | 0.162–0.274 | **NO LONGER LIVE — 2026-08-09.** The verdict was MATCHES on a **containment** claim checked at the precision of its own display: the true maximum 0.274 lies **outside** the stated $[0.16, 0.27]$, so it was the same defect as X1. **It is not repairable, because the claim is not in the document.** Searched `chapters/*.tex`, `appendix/*.tex` and `abstract.tex` for the phrasing and for both endpoints: zero occurrences of "paired to independent", "0.162" or "0.274". `methodology.tex`:382 now reads *"that quantity is measured rather than assumed, and Appendix~\ref{app:robustness} reports it with a block-length sweep"*, carrying no numeric range. Composed out during 8C-3. **The live defect this surfaced instead: Appendix C contains no paired-variance material and no block-length sweep, so that sentence promises content that does not exist.** See `ledger/reduction_plan.md` §7 | — |
| 63 | "implying a paired standard error near $0.007$ to $0.011$" | § discriminate | same, se_paired 0.0066–0.0110 | 0.0066–0.011 | MATCHES | — |
| 64 | "roughly a third of the marginal figure" | § discriminate | 0.0066–0.011 vs 0.029 | ratio 0.23–0.38 | MATCHES | — |
| 65 | "differential autocorrelation decays to approximately zero by lag seven" | § discriminate | brain/eval/mcs_L1_results.json beer_hall acf_lag1_10; log/44:174-176 | lag-7 values at BH: 0.183, -0.038, 0.194, 0.075, -0.138, -0.121 | MATCHES (report), weakly supported by data | Two of six Beer Hall pairs are still ~0.18-0.19 at lag 7. Soften to "decays substantially by lag seven" or report the range. |
| 66 | "$\ell = 2$ is too short and produces spuriously narrow sets" | § discriminate | brain/eval/mcs_L1_results.json beer_hall.sensitivity_mase_common (l=2 → 3/1; l=7 → 5/3) | confirmed | MATCHES | — |
| 67 | "$\ell \in \{7, 14, 21\}$ and $B \in \{1000, 5000\}$ are stable" | § discriminate | same sensitivity sweep (set_size 0.1 = 5 at l=7,14,21 for both B) | stable | MATCHES | — |
| 68 | "an Ellel rung at the boundary leaves the set between $B=1000$ and $B=5000$, changing the set size from five to four" | § discriminate | brain/log/44_G17c_Model_Confidence_Set.md:207-212; mcs_L1_results.json ellel common_fold mcs_pvalue.rung0_seasonal_naive = 0.103 | 5 → 4 | MATCHES | — |
| 69 | "the served model sits at $p = 0.575$, far from the boundary" | § discriminate | brain/eval/mcs_L1_results.json ellel common_fold mcs_pvalue.rung1_robust_dow | 0.575 | MATCHES | — |
| 70 | "the committed table, scored under scikit-learn 1.9.0, serves exponential smoothing at a MASE of $0.597$" | § flip | brain/log/44_G17c_Model_Confidence_Set.md:88-98; models/ladder_results_L1_two_river_taps.md:12 | 0.597, sklearn 1.9.0 | MATCHES | — |
| 71 | "ahead of gradient boosting at $0.602$" | § flip | brain/models/ladder_results_L1_two_river_taps.md:15 | 0.602 | MATCHES | — |
| 72 | "a rerun under scikit-learn 1.8.0 was reported to give $0.617$ and $0.601$" | § flip | brain/log/45_G17d_Intermittency_and_Occurrence.md:183; docs/Prj93_external_examiner_assessment.md:253 | 0.617 / 0.601 | MATCHES | — |
| 73 | Table flip, row Committed (scikit-learn 1.9.0) = 0.597 / 0.602 / Exp. smoothing | § flip | brain/log/45_G17d_Intermittency_and_Occurrence.md:182 | 0.597 / 0.602 / ETS | MATCHES | — |
| 74 | Table flip, row External claim (scikit-learn 1.8.0) = 0.617 / 0.601 / Gradient boosting | § flip | brain/log/45_G17d_Intermittency_and_Occurrence.md:183 | 0.617 / 0.601 / GBM | MATCHES | — |
| 75 | Table flip, row This test (scikit-learn 1.8.0) = 0.597 / 0.601 / Exp. smoothing | § flip | brain/log/45_G17d_Intermittency_and_Occurrence.md:184 | 0.597 / 0.601 / ETS | MATCHES | — |
| 76 | "statsmodels held at 0.14.6 throughout" | § flip | brain/log/45_G17d:176-178; log/44:98 | 0.14.6 | MATCHES | — |
| 77 | "The gradient-boosting figure does move by one thousandth, $0.602$ to $0.601$" | § flip | brain/log/45_G17d_Intermittency_and_Occurrence.md:186-188 | 0.001 movement | MATCHES | — |
| 78 | "reruns Two River Taps at six folds on the seed ceiling" | § flip | brain/log/45_G17d_Intermittency_and_Occurrence.md:178 | 6 folds, frozen frame (TRT closed 2026-05-08) | MATCHES | — |

## Statistical reporting

**Fatal / high-severity**

1. **No Diebold-Mariano statistic is reported at n=6, h=7** — correct. The chapter states plainly that HLN is exactly zero there and that no significance test was available. This is handled properly and prominently (§ The ladder). No violation found.
2. **Bare argmin over a six-fold mean with no dispersion.** Table `tab:ladder` is exactly that — nine rung means per venue, six folds each, no SD, no SE, no n column, no interval, and bold marking a "winner" chosen by minimum. The chapter's surrounding prose criticises the practice but the table still presents the selection instrument without dispersion. Report 43 §3 has per-rung `sd`, `se` and `n` for every rung at every venue and report 44 has per-fold vectors; there is no reason the table cannot carry SD. **Fix: add an SD (or SE) column, or a footnote giving the fold SD range (Beer Hall 0.452–0.526, Ellel 0.653–0.996, TRT 0.310–0.447 at step 1).** Occurrence count: 27 cells (all of `tab:ladder`).
3. **Two ranking/attribution errors** (rows 38 and 55) both make the fold-count argument stronger than the repo supports. Row 38 ("fifth of nine") overstates how badly the six-fold gate did; the repo's own table puts the served model second. Row 55 attributes the Ellel argmin flip to the fold count when report 43 explicitly decomposes it as a store-ceiling effect. Both should be corrected before submission — an examiner reading report 43 §3 will find the contradiction.

**MCS reporting completeness**

- alpha = 0.10 — **stated** (table caption). Secondary alpha 0.25 not mentioned; the chapter does not need it but the nested-by-construction property is a defensible point being left on the table.
- Bootstrap replicates B — **not stated in § cannot separate**; appears only obliquely in § discriminate as a sensitivity range `B ∈ {1000, 5000}`. The primary is B = 1000 (`mcs_L1_results.json: n_boot_primary`). **Fix: state "moving-block bootstrap, B = 1000, block length ℓ = 7, seed 93" in the `tab:mcs` caption.**
- Block length ℓ — same: only in the sensitivity sentence, never declared as the primary in the MCS section. Primary ℓ = 7.
- Bootstrap seed 93 (`mcs_L1_results.json: seed`) — **not stated anywhere in the slice.**
- Statistic and elimination rule (range statistic T_R with e_R) — **not stated in the chapter.** Report 44 §4a pre-registers both. This matters because the range statistic is what makes the sets wide; the chapter attributes the width to the data alone without naming the multiplicity correction that produces it.
- Multiple-comparison correction — the MCS *is* the correction (it controls FWE over 9 rungs), and the chapter cites Hansen et al. correctly, but never says so explicitly. **Fix: one clause stating the MCS controls family-wise error over the nine rungs.**
- Test appropriateness — correct. Overlapping step-1 origins make an iid bootstrap invalid; a moving-block bootstrap is used and the block length is justified empirically from the differential ACF rather than by appeal to the horizon. This is done well.
- **"Every served model survives its own confidence set"** — an inclusion result, not a significance result. The chapter reads it correctly (as non-contradiction, not as evidence of superiority) and explicitly declines the superiority claim. Good.
- **No point estimate in `tab:mcs` carries dispersion.** MCS p-values are given without any interval; given the documented B-instability at the margin, a note that p-values at the 0.10 boundary are unstable to ±1 set member would be honest. § discriminate does say this for Ellel, but the table itself is bare.
- **§ discriminate quotes ranges (0.16–0.27, 0.007–0.011) without saying they are pairwise ranges over the top-four rungs** (six pairs). A reader may take them for a CI. **Fix: name them as the range across the six top-four pairs.**
- **`p >= 0.05` disclosure:** no comparison in this slice is asserted as significant, and the "cannot separate" framing is the correct negative statement. Two River Taps has `rung0_seasonal_naive` and `rung3_gbm` at exactly p = 0.05 (eliminated); not reported in the chapter, not required.
- n is stated for every MCS row (273 / 205 / 246 / 260) — good. n is **not** stated in `tab:ladder` (it is 6 for every cell; the caption does not say so, only the surrounding prose does).

**Library-flip section** — statistically clean. It reports a refutation with the mechanism (statsmodels invariance by construction) rather than a p-value, and correctly narrows the surviving claim from "the defect moved a result" to "the selection was unverifiable". No dispersion is needed for a reproducibility check. No defect found.

## Counts

MATCHES 74 · STALE 0 · MISMATCH 4 · UNTRACEABLE 0 (78 claims audited)

---

## Batch F - results.tex, sections 15-23

Interval calibration - A seven-point window cannot support a miscalibration
claim - Measured with power, one venue under-covers - No interval method
displaces the incumbent on the Winkler score - Detection performance is not an
artefact of the injection design - The realism gap is real and lies elsewhere -
A second learning domain reaches the output - The intervention layer: apparatus
complete, measurement pending - A common pattern across the studies.

# Numerical audit — batch F (`chapters/results.tex`, 9 sections)

Repo root for sources: `/Users/hapuna/Downloads/ai-gm.ai-master/brain/log/`

Note: `results.tex § Interval calibration` is a bare `\section` + `\label` with no body text and no
numerals; its numeric content lives in the two subsections below it.

| # | Claim (verbatim) | Location | Repo source path | Repo value | Verdict | Fix |
|---|---|---|---|---|---|---|
| 1 | "covering 100 per cent of observations at a nominal 90 per cent" | § A seven-point window | /Users/hapuna/Downloads/ai-gm.ai-master/brain/log/49_G17h_Interval_Calibration.md:47-48 | 1.00 coverage, C2 confrontation, Beer Hall L1, 8-14 July | MATCHES | — |
| 2 | "It was computed on seven observations." | § A seven-point window | 49_G17h:50 | n = 7 (`power_analysis`) | MATCHES | — |
| 3 | "$0.90^7 = 0.478$" | § A seven-point window | 49_G17h:51 | 0.478 | MATCHES | — |
| 4 | "Clopper-Pearson 95 per cent interval on an observed $7/7$ is $[0.590, 1.000]$" | § A seven-point window | 49_G17h:53 | [0.590, 1.000] (`clopper_pearson`) | MATCHES | — |
| 5 | "contains the nominal $0.90$" | § A seven-point window | 49_G17h:54 | contains 0.90 | MATCHES | — |
| 6 | "between 1274 and 1750 interval-observation pairs per venue" | § Measured with power | 49_G17h:176 | 1750 / 1659 / 1274 (BH/Ellel/TRT) | MATCHES | — |
| 7 | Table coverage, caption, "Angelopoulos-Bates expected-coverage bound at these calibration sizes is $0.9005$" | § Measured with power | 49_G17h:58-60 | "upper bound is 0.9005 to 0.9007" (n_calib 1883/1792/1407) | MISMATCH | Caption says "at these calibration sizes" (plural) but gives one value; write "0.9005 to 0.9007" |
| 8 | Table coverage, row Beer Hall, col Pairs = 1750 | § Measured with power | 49_G17h:176 | 1750 | MATCHES | — |
| 9 | Table coverage, row Beer Hall, col Empirical coverage = 0.871 | § Measured with power | 49_G17h:25,74 | 0.871 | MATCHES | — |
| 10 | Table coverage, row Beer Hall, col 95% interval = [0.855, 0.887] | § Measured with power | 49_G17h:25,74 | [0.855, 0.887] | MATCHES | — |
| 11 | Table coverage, row Ellel, col Pairs = 1659 | § Measured with power | 49_G17h:176 | 1659 | MATCHES | — |
| 12 | Table coverage, row Ellel, col Empirical coverage = 0.914 | § Measured with power | 49_G17h:26,84 | 0.914 | MATCHES | — |
| 13 | Table coverage, row Ellel, col 95% interval = "at nominal" | § Measured with power | 49_G17h:26,84 | [0.899, 0.927] | MISMATCH | Caption promises CP intervals; the cell substitutes a verdict. Print [0.899, 0.927] |
| 14 | Table coverage, row Two River Taps, col Pairs = 1274 | § Measured with power | 49_G17h:176 | 1274 | MATCHES | — |
| 15 | Table coverage, row Two River Taps, col Empirical coverage = 0.963 | § Measured with power | 49_G17h:27,88 | 0.963 | MATCHES | — |
| 16 | Table coverage, row Two River Taps, col 95% interval = "over-covers, closed venue" | § Measured with power | 49_G17h:27 | [0.951, 0.973] | MISMATCH | Print [0.951, 0.973] |
| 17 | "covers $0.871$ against a nominal $0.900$" | § Measured with power | 49_G17h:74 | 0.871 vs 0.90 | MATCHES | — |
| 18 | "a shortfall of about $3.6$ standard errors" | § Measured with power | — (3 greps: "3.6", "standard error", "se"; report gives no z) | not stated; recomputes to 3.62 from 0.871/1750 | UNTRACEABLE | Derivable and consistent, but state the SE and the arithmetic, or cite the CP interval instead |
| 19 | "it is below nominal at every horizon step" | § Measured with power | 49_G17h:76 | per-step 0.85,0.86,0.88,0.88,0.88,0.88,0.87 | MATCHES | Per-step values (and the +/-3pp tolerance breach at step 1) are dropped from the chapter |
| 20 | "served exogenous forecaster under-covers identically at $0.870$, interval $[0.853, 0.885]$" | § Measured with power | 49_G17h:80-83 | 0.870, CP [0.853, 0.885], chronos2_exo | MATCHES | — |
| 21 | "a band advertised as 90 per cent delivers 87 per cent" | § Measured with power | 49_G17h:14 | 0.87 | MATCHES | — |
| 22 | "Five interval methods were compared" (P, D, S, A, G) | § No interval method displaces | 49_G17h:29-32 | five arms P/D/S/A/G | MATCHES | — |
| 23 | Table winkler, row Beer Hall, col P = 1940 | § No interval method displaces | 49_G17h:132 | 1940 | MATCHES | — |
| 24 | Table winkler, row Beer Hall, col D = 1807 | § No interval method displaces | 49_G17h:132 | 1807 (best) | MATCHES | — |
| 25 | Table winkler, row Beer Hall, col S = 1928 | § No interval method displaces | 49_G17h:132 | 1928 | MATCHES | — |
| 26 | Table winkler, row Beer Hall, col A = 1814 | § No interval method displaces | 49_G17h:132 | 1814 | MATCHES | — |
| 27 | Table winkler, row Beer Hall, col G = 1820 | § No interval method displaces | 49_G17h:132 | 1820 | MATCHES | — |
| 28 | Table winkler, row Beer Hall, col 90% set = "several retained" | § No interval method displaces | 49_G17h:132-133 | all five in the 90% set {D,A,G,S,P} | MATCHES | "several" understates: it is all five. Prefer the explicit set |
| 29 | Table winkler, row Ellel, col D = 1262 | § No interval method displaces | 49_G17h:135 | 1262 | MATCHES | — |
| 30 | Table winkler, row Ellel, col 90% set = "\{D\} alone" | § No interval method displaces | 49_G17h:135-136 | {D} alone | MATCHES | — |
| 31 | Table winkler, row Two River Taps, col D = 646 | § No interval method displaces | 49_G17h:137 | 646 (best) | MATCHES | — |
| 32 | Table winkler, row Two River Taps, col 90% set = "several retained" | § No interval method displaces | 49_G17h:137-138 | all five in the set | MATCHES | Same understatement as #28 |
| 33 | Table winkler, rows Ellel / Two River Taps, cols P, S, A, G = "--" | § No interval method displaces | 49_G17h:135-138 | Winkler means for P/S/A/G at Ellel and TRT were computed (MCS ran over five arms per venue, G5) | MISMATCH | The dashes read as "not measured"; the values exist. Either print them or state they are omitted for space |
| 34 | "Adaptive conformal inference does restore Beer Hall coverage to $0.895$" | § No interval method displaces | 49_G17h:146 | 0.895 | MATCHES | — |
| 35 | "it advertises 90 per cent and delivers $87.1$ per cent" | § No interval method displaces | 49_G17h:25,74 | 0.871 | MATCHES | — |
| 36 | "recorded per-step half-widths growing from 181 to 224" | § No interval method displaces | 49_G17h:101-102 | contract predicted 181 to 224 | MATCHES | — |
| 37 | "the Beer Hall per-step half-width is flat, near 490 to 515 for the illustrative forecaster" | § No interval method displaces | 49_G17h:104 | 505, 515, 498, 486, 482, 482, 504 (range 482 to 515) | MISMATCH | Range is 482-515, not 490-515 |
| 38 | "and 466 to 483 for the served one" | § No interval method displaces | 49_G17h:105 | 466 to 483 | MATCHES | — |
| 39 | "an artefact of roughly 26 observations per step" | § No interval method displaces | 49_G17h:102 | 26-point-per-step De Lune measurement (report 33) | MATCHES | — |
| 40 | "capping the horizon at seven days" | § No interval method displaces | 49_G17h:40 | MAX_HORIZON_DAYS = 7 | MATCHES | — |
| 41 | "measure the gap on 120 paired injections" | § Detection performance | 50_G17i:11-12 | n=120 | MATCHES | — |
| 42 | "stratified 64 sustained shifts, 32 spikes and 24 exogenous-coincident events" | § Detection performance | 50_G17i:12 | 64 regime_shift / 32 spike / 24 exo_coincident, seed 95 | MATCHES | Sample seed 95 not stated in chapter |
| 43 | "drawn from the Beer Hall and Two River Taps" | § Detection performance | 50_G17i:66-70 | beer_hall + two_river_taps; Ellel excluded (inert occurrence label) | MATCHES | Chapter omits why Ellel is excluded |
| 44 | Table injection, caption, "bootstrap interval of $[0.0, 0.0]$" | § Detection performance | 50_G17i:15-17, 32-34 | 0.0 [0.0, 0.0], B=10000 | MATCHES | B and bootstrap seed not stated in chapter |
| 45 | Table injection, row Sustained shift, col n = 64 | § Detection performance | 50_G17i:32 | 64 | MATCHES | — |
| 46 | Table injection, row Sustained shift, col Control = 1.000 | § Detection performance | 50_G17i:32 | 1.000 [0.944, 1.000] | MATCHES | CP interval dropped |
| 47 | Table injection, row Sustained shift, col Realistic = 1.000 | § Detection performance | 50_G17i:32 | 1.000 [0.944, 1.000] | MATCHES | CP interval dropped |
| 48 | Table injection, row Sustained shift, col Median latency = "4 days" | § Detection performance | 50_G17i:32 | 4d [IQR 3,6] both arms | MATCHES | IQR dropped |
| 49 | Table injection, row Spike, col n = 32 | § Detection performance | 50_G17i:33 | 32 | MATCHES | — |
| 50 | Table injection, row Spike, col Control = 0.906 | § Detection performance | 50_G17i:33 | 0.906 [0.750, 0.980] | MATCHES | CP interval dropped |
| 51 | Table injection, row Spike, col Realistic = 0.906 | § Detection performance | 50_G17i:33 | 0.906 [0.750, 0.980] | MATCHES | CP interval dropped |
| 52 | Table injection, row Spike, col Median latency = "same day" | § Detection performance | 50_G17i:33 | "n/a (point event)" | MISMATCH | Source records no spike latency; "same day" asserts a measured value that was not measured |
| 53 | Table injection, row Exogenous coincident, col n = 24 | § Detection performance | 50_G17i:34 | 24 | MATCHES | — |
| 54 | Table injection, row Exogenous coincident, col Control = 1.000 | § Detection performance | 50_G17i:34 | 1.000 [0.858, 1.000] | MATCHES | CP interval dropped |
| 55 | Table injection, row Exogenous coincident, col Realistic = 1.000 | § Detection performance | 50_G17i:34 | 1.000 [0.858, 1.000] | MATCHES | CP interval dropped |
| 56 | Table injection, row Exogenous coincident, col Median latency = "3 days" | § Detection performance | 50_G17i:34 | 3d [IQR 2,5] both arms | MATCHES | IQR dropped |
| 57 | "verified numerically identical between arms to $10^{-6}$" | § Detection performance | 50_G17i:127-130 | 1e-6 (G3 test) | MATCHES | — |
| 58 | "reproduces the committed corpus results to within three percentage points on every event kind" | § Detection performance | 50_G17i:138 | every kind within 3pp of the committed snapshot | MATCHES | — |
| 59 | "the headline sustained-shift recall of $0.996$ exact" | § Detection performance | 50_G17i:136 | regime_shift 0.996 vs committed 0.996, exact | MATCHES | — |
| 60 | "median latencies of three and four days sit comfortably inside the seven-day refit cadence" | § Detection performance | 50_G17i:32-34, 95-96 | 3d/4d medians; RETRAIN_CADENCE_DAYS 7-day cadence | MATCHES | — |
| 61 | "fires on 61 to 63 per cent of sampled sustained shifts" | § The realism gap | 50_G17i:21-22, 157 | 61% of regime_shift pairs, 63% of exo_coincident pairs; combined 54/88 = 61% | MISMATCH | Exo-coincident is not a "sustained shift"; the 63% figure belongs to a different kind. Restate per kind |
| 62 | "measurably suppresses continuation alerts in 16 per cent of checked cases" | § The realism gap | 50_G17i:23-24, 158-159 | 14 of 88 = 16% (26% of the 54 that fired) | MATCHES | n=88 and the 26%-of-fired denominator not stated in the chapter |
| 63 | "intervals of $[-0.011, 0.000]$ on sustained shifts" | § The realism gap | 50_G17i:147-148 | [-0.011, 0.000] regime_shift precision diff | MATCHES | Point estimates (0.854 vs 0.859) omitted |
| 64 | "and $[-0.035, 0.000]$ on exogenous-coincident events" | § The realism gap | 50_G17i:147-148 | [-0.035, 0.000] exo_coincident | MATCHES | Point estimates (0.765 vs 0.784) omitted |
| 65 | "The precision difference between arms is marginal" | § The realism gap | 50_G17i:146-149 | source calls these "borderline-significant but practically negligible" | MATCHES | Chapter softens "borderline-significant" to "marginal"; acceptable but note the interval touches zero |
| 66 | "real chat corpus of 735 messages" | § A second learning domain | 51_G17j:8, 33 | 735 rows | MATCHES | — |
| 67 | "376 from staff and 359 from the assistant" | § A second learning domain | 51_G17j:8, 33-34 | 376 user, 359 assistant | MATCHES | Source calls the corpus "single-owner product-testing chat (Elliot's export)"; "staff" is a characterisation the source does not support |
| 68 | "spanning 2026-04-29 to 2026-06-12" | § A second learning domain | 51_G17j:8, 34 | 2026-04-29 10:33:46 to 2026-06-12 08:49:34 | MATCHES | — |
| 69 | "across 25 active days" | § A second learning domain | 51_G17j:8, 34 | 25 active days | MATCHES | — |
| 70 | "rate of unanswered questions in ordinary traffic is 18.9 per cent, matching the configured baseline exactly" | § A second learning domain | 51_G17j:34, 101 | 68/359 = 18.9%, exact to CHATLOG_FAILURE_BASELINE = 0.189 | MATCHES | Chapter never states the 68/359 numerator/denominator |
| 71 | "Of twelve clusters, four clear the above-baseline threshold" | § A second learning domain | 51_G17j:11, 102-103 | 4 of 12 | MATCHES | — |
| 72 | "against a pre-registered stop condition at roughly ten" | § A second learning domain | 51_G17j:11, 117 | roughly-ten-gap stop condition, not fired | MATCHES | — |
| 73 | "The remaining eight fall in a band from zero to $0.18$ density" | § A second learning domain | 51_G17j:113-115 | "the non-gap clusters include several with a low-but-nonzero failure rate (0.0-0.18)" | MISMATCH | Source says "several", not all eight; the chapter generalises a partial statement to the whole set |
| 74 | "The strongest cluster, at a density of $0.600$ and a score of $1.800$" | § A second learning domain | 51_G17j:107 | density 0.600, score 1.800 | MATCHES | — |
| 75 | "asked five times with three instances unanswered" | § A second learning domain | 51_G17j:107 | size 5, failed 3 | MATCHES | — |
| 76 | "at a source weight of $0.35$" | § A second learning domain | 51_G17j:147 | sop weight 0.35 (checklist 0.40) | MATCHES | — |
| 77 | "producing an item of severity high and score $0.328$" | § A second learning domain | 51_G17j:20-22 | severity high, score 0.328, all three venues | MATCHES | — |
| 78 | "a gap broadcasts to all three venues" | § A second learning domain | 51_G17j:12, 20-22 | broadcast to every BRIEFING_VENUES member; three rows | MATCHES | Chapter omits that one of the four gap clusters (brewery) was excluded, so three reach the briefing, not four |
| 79 | "Two of the four specified learning domains are now live" | § A second learning domain | 51_G17j:229; Decision_and_Resolution_Log.md:1770 | two of four live (sales, chat-log) | MATCHES | — |
| 80 | "the incumbent six-constant score" | § The intervention layer | 46_G17e:125, 133 | `briefing._score`, product of six constants | MATCHES | — |
| 81 | "Three of the four terms of the intervention objective, calibration error, Brier score and the decision-quality curve, are computable as soon as the cache exists." | § The intervention layer | 46_G17e:101, 119 | ECE/Brier machinery built; "the real ECE, Brier and reliability diagram are S8b" | MATCHES | No ECE/Brier VALUE is asserted anywhere in this slice — the known unkept ECE promise is not violated here |
| 82 | "a fallback protocol using repeated self-annotation with an intra-rater agreement statistic is specified" | § The intervention layer | 11_Scaled_Eval_Report.md:147 (nearest); not in 46_G17e | intra-rater figure mentioned for the label anchor, not as an S8 fallback protocol | UNTRACEABLE | Non-numeric; cite where the fallback protocol is specified |
| 83 | "chose a model that 273 origins reject" | § A common pattern | 43_G17b:112-131; 44_G17c:183-186 | at 273 origins the six-fold pick `rung1_robust_dow` ranks 5th (0.803) but IS RETAINED in the 90% Model Confidence Set at p = 0.11 | MISMATCH | "reject" is false at alpha 0.10. It is eliminated only at alpha 0.25. Rewrite as "that 273 origins demote from first to fifth" |
| 84 | "an artefact of 26 observations per step and is flat at power" | § A common pattern | 49_G17h:102-105 | 26-point-per-step; flat 482-515 | MATCHES | — |
| 85 | "The 100 per cent coverage ... was seven observations, an outcome with probability $0.478$ under the null" | § A common pattern | 49_G17h:50-51 | n=7, P = 0.478 | MATCHES | — |
| 86 | "The library-induced flip ... did not reproduce and was traced to a reconstruction of the evaluation harness" | § A common pattern | 45_G17d:30-34, 183-189 (supersedes 44_G17c:82-86) | ETS 0.597 not 0.617; "the 0.617 was a harness artefact of the external rerun" | MATCHES | Chapter correctly uses the later report; report 44 alone would give the opposite reading |
| 87 | "Three claims withdrawn in this chapter" but four are then listed | § A common pattern | — | four items enumerated (six-fold selection, half-width growth, 100% coverage, library flip) | MISMATCH | Count/enumeration disagree: say four, or exclude one from the count |

## Statistical reporting

**Power (§ Measured with power).** The section title claims a power argument but reports no power
analysis: no alpha, no target effect size, no achieved power, no n-required. What is supplied is a
null-probability calculation (0.478) and CP interval widths in the preceding subsection. Those
justify "seven is too few" but do not constitute the power calculation the heading advertises.
Source report 49 also contains no power computation beyond `power_analysis`'s null probability, so
this is a chapter framing problem, not a lost number. **Recommend retitling or adding the
calculation.**

**Coverage CIs (§ Measured with power).** REPORTING FAILURE. The table caption states "with
Clopper-Pearson 95 per cent intervals", but only one of three rows carries one. Ellel (0.914) and
Two River Taps (0.963) are point estimates with verdict prose in the interval column, even though
the source supplies [0.899, 0.927] and [0.951, 0.973]. Rows 13 and 16 above. The under-coverage
claim itself (Beer Hall) DOES carry its CI, correctly.

**Winkler negative result (§ No interval method displaces).** This is a negative result across five
methods at three venues (15 arm-venue comparisons) and the chapter reports **no p-value, no
confidence interval on any Winkler mean, and no named correction procedure**. The source does
better: report 49 lines 126-138 use the Hansen-Lunde-Nason Model Confidence Set at alpha 0.10 over
the five arms per venue on per-origin Winkler vectors, with a moving-block paired bootstrap (block
7, B = 10000, seed 94), plus pairwise paired CIs (D beats S and P with CIs excluding zero; D vs A
and D vs G span zero). The MCS **is** the multiple-comparison control, and the chapter drops its
name, its alpha, and its bootstrap parameters, leaving the "90% set" column unexplained. The
chapter also never writes an explicit "not statistically significant": "no method both enters the
confidence set and improves on the incumbent's mean" is a decision-rule statement, not a
significance statement. **Fix: name the MCS + block bootstrap in the caption, give the alpha, and
state that D vs A and D vs G are not statistically distinguishable (paired CIs span zero).**
No method is claimed better than the incumbent without a p-value, so the specific failure mode
warned about does not occur — but 1807 vs 1814 vs 1820 are printed bare and invite exactly that
reading.

**Injection comparison (§ Detection performance).** n is stated per row (64/32/24) and the paired
bootstrap CI is in the caption, but: per-cell Clopper-Pearson intervals exist in the source and are
dropped from all six recall cells; B = 10000 and the two seeds (sample 95, bootstrap) are not
stated; there is no correction across the three kind-wise comparisons; and the strong-null /
equivalence claim ("The null here is of the strong kind rather than the underpowered kind") is made
without an equivalence margin. The mechanistic argument (identical events, identical perturbation
to 1e-6) does carry it, but the statistical form is an equivalence test that is never specified.

**Realism gap (§ The realism gap is real).** "61 to 63 per cent" and "16 per cent" are reported
with no n and no CI in the chapter text; the source has n = 88 pairs, 54 fired, 14 suppressed. A
proportion of 14/88 with no interval is a reporting failure at this sample size. The precision
intervals ARE given, correctly, but without their point estimates.

**Chat-log signal (§ A second learning domain).** 18.9 per cent, densities (0.600), and scores
(1.800, 0.328) are all point estimates with no dispersion anywhere. Twelve clusters are each tested
against a baseline threshold with no multiple-comparison adjustment and no stated per-cluster n
beyond the strongest (5). "Matching the configured baseline exactly" is a coincidence between an
observed rate and a constant calibrated from that same corpus — circular, and worth stating as
such rather than as corroboration.

**Intervention layer (§ apparatus complete, measurement pending).** CLEAN. The section reports
**zero outcome metrics** — no ECE value, no Brier value, no decision-quality figure, no adoption
rate. This is consistent with the project record (no real manager outcomes; Track B blocked). The
only numerals are structural ("six-constant", "three of the four terms"). No MISMATCH here.

**ECE specifically.** Searched the whole slice: no ECE VALUE is reported in any of the nine
sections. The only ECE numeral anywhere in the repo logs is a hand-computed fixture (0.05) used to
check the binning code (46_G17e:172), and report 46 line 119 states plainly "The real ECE, Brier
and reliability diagram are S8b". The known unkept ECE promise is therefore **not** violated in
this slice.

## Counts

87 numeral-bearing claims extracted. MATCHES 76 · STALE 0 · MISMATCH 9 · UNTRACEABLE 2.

---

# Summary

## Counts

340 numerical claims audited across the two chapters.

| Verdict | Count |
|---|---|
| MATCHES | 309 |
| STALE | 2 |
| MISMATCH | 17 |
| UNTRACEABLE | 9 |
| Split verdict (matches on the number, fails on the descriptor) | 3 |

Per batch: A 42 · B 39 · C 31 · D 78 · E 63 · F 87.

Statistical-reporting failures are counted separately below, because most are
failures to report something the repo already holds rather than wrong numbers.

**The tracing rate is high and that is the real headline.** 309 of 340 numbers
resolve to a committed result file or a code constant, most of them exactly. The
project's pre-registration-by-commit discipline is doing what it was meant to
do. The defects below are concentrated in prose *about* the numbers, not in the
numbers.

## The four MISMATCHes that change a conclusion

**1 — "ranks the served foundation model fifth of nine" is second of nine.**
`results.tex` § A case where the small sample selected the wrong model.
Report 43's Beer Hall `6f@0707` column is 1.267, 1.312, 1.368, 1.412, 1.466,
1.519, 1.553, 1.561, 1.773. `rung4_chronos2_exo` at 1.312 is **rank 2**, 0.045
behind `rung1_robust_dow`. *Report 43's own prose says "fifth" and contradicts
its own table* (`log/43_G17b_Fold_Count.md:130`); the chapter inherited the
prose error rather than reading the table.

The section's argument survives — the six-fold window does pick the wrong
winner, and 273 origins do restore the served model to first. But "fifth of
nine" dramatises a 0.045 gap into a collapse. The honest version is *narrowly
second, and the ordering is inside noise* — which is also the version consistent
with the MCS section three pages later. Fix report 43 as well as the chapter, or
the error will be re-inherited.

**2 — "chose a model that 273 origins reject" is false.** `results.tex` § A
common pattern across the studies. At 273 origins `rung1_robust_dow` sits in the
90% model confidence set at p = 0.11 (`log/44_G17c_Model_Confidence_Set.md:183`).
It is demoted from first to fifth; it is not rejected. It is eliminated only at
alpha 0.25. "Reject" is a term of art and this is the chapter's own closing
synthesis, so the misuse is costly. Rewrite as "demote from first to fifth,
while remaining inside the 90% confidence set".

**3 — the Ellel flip is attributed to the wrong cause.** `results.tex` § Which
models the data cannot separate says the argument-minimum moved *when the fold
count rose*. Report 43 §3 decomposes it the other way: the flip
`robust_dow → chronos_bolt` has already happened at six folds when only the
store ceiling moves, and the `6f@0707 → step1@0707` step is stable. Store
growth, not fold count, unseats `robust_dow`. As written the chapter offers the
wrong mechanism for its own central small-sample argument.

**4 — a table cell reports "n/a" for a rung that scored.** `results.tex` §
The ladder, row `rung3_global_gbm`, column Two River Taps. The repo has 0.728
over 6 folds (`models/ladder_results_L1_two_river_taps.md:16`). An `n/a` in a
results table asserts that a measurement was not obtained.

## The remaining thirteen MISMATCHes

Factual, none load-bearing on a conclusion:

- "Fourteen covariates in four families" — `CHRONOS2_EXO_COLS` is **fifteen**
  (4 calendar + 1 event + 6 World Cup + 4 weather); `test_exog_supplied.py:98`
  asserts 15. The chapter's own four families also sum to 15.
- "a ladder of seven rungs" — the code has **rungs 0–4**, five rungs, nine
  scored entrants. Neither number is seven, and the chapter then enumerates
  rungs 1–4 plus the benchmark.
- Two River Taps trading days per week **5.90 → 5.92** (`log/42:66`).
- Ellel MCS p-value **0.575 → 0.579**: the 246-fold `common_fold` value has been
  copied into the row labelled 260 folds. `eval/mcs_L1_results.json` holds both.
- "a corpus of 735 **staff** chat messages" — 735 is the whole corpus; **376**
  are staff-authored, 359 are assistant replies (`log/51:8`).
- Spike median latency "same day" — report 50 records **"n/a (point event)"**.
  The chapter asserts a value that was not measured.
- "fires on 61 to 63 per cent of sampled sustained shifts" — 61% is
  `regime_shift`, 63% is `exo_coincident`, which is not a sustained shift.
- Beer Hall per-step half-width "near 490 to 515" — the seven values run
  **482 to 515**.
- "The remaining eight fall in a band from zero to 0.18 density" — report 51
  says *several* of the non-gap clusters, not all eight.
- Coverage table, Ellel and Two River Taps: the 95% interval cells carry prose
  ("at nominal", "over-covers, closed venue") where the caption promises
  Clopper–Pearson intervals. Both exist: [0.899, 0.927] and [0.951, 0.973].
- Coverage caption gives one Angelopoulos–Bates bound, 0.9005, for three
  different calibration sizes; the report gives **0.9005 to 0.9007**.
- Winkler table, Ellel and Two River Taps rows: dashes across four arms whose
  means were computed (`log/49:135`). A dash reads as "not measured".
- "Three claims withdrawn in this chapter", followed by four.

## STALE — 2, both benign

Neither carries a superseded number into the chapter. Both are cases where the
chapter is right and an *earlier report* is wrong:

- The trading-day definition: report 42 recommends non-zero-net-revenue, report
  45 supersedes it with comped-open-day = trading day. The chapter follows 45.
  If report 42's 301/66 count appears anywhere else it must be reconciled to
  302/68.
- The SBA selection direction: report 45:73 says no node selects the
  approximation; the chapter says every venue at L1 does. The chapter is right —
  `citation_audit.md:190` verified the published Kostenko–Hyndman rule as
  *v > 2 − (3/2)p* — but see the code discrepancy below.

**This is worth stating plainly: on a project that ran G15 → G16 → G17a–j
correction passes, not one superseded figure survived into either chapter.**
That was the defect class most likely to be found and it is absent.

## UNTRACEABLE — 9

The one that matters: **"a grouped forecast differs from the univariate one by
roughly £40"** (`results.tex` § Cross-series in-context learning). No £40 figure
exists in report 47. The nearest is £44.8, and that is the *batch-merge* probe at
`log/47:58` — a different quantity, which the chapter already cites correctly as
~£45 two sections later. As written it invites being read as the same number
counted twice.

The others are omissions rather than inventions: values that exist in the repo
but are not printed, plus "six-day lookback", which is not named anywhere
(the fourteen affected windows it explains *are* confirmed at `log/48:85`).

## Statistical reporting

Assessed against `drafting-rules.md` §2 rules 7–14. **The two project-specific
tests both pass, and they were the ones most likely to fail:**

- **No Diebold–Mariano statistic is reported at n=6, h=7.** The methodology
  states the Harvey–Leybourne–Newbold factor is exactly zero there and no
  corrected statistic is computable. That is W6 handled openly, in the text,
  rather than worked around.
- **CV² is computed correctly.** `eval/intermittency_diagnostic.py:90-110` takes
  `sizes = size[occ]` before the coefficient of variation — conditional on
  demand occurring, which is the Syntetos–Boylan–Croston definition, with sample
  sd (ddof=1). The zero-inclusive error that would have moved every
  classification **did not happen**. This closes the open check carried in
  `citation_fixes.md`. One caveat: the "any till activity" demand-day rows count
  a comped-to-zero open day as a demand day of size 0, so those particular rows
  are not strictly conditional. One sentence in the chapter would settle it.

The failures are uniform in kind — **the repo computed the uncertainty and the
chapter printed the point estimate alone**:

- `tab:ladder` is 27 cells of six-fold means with bolded winners, no dispersion,
  no n column. Report 43 §3 holds sd, se and n for every rung in it. This is W5
  exactly, and it is the single largest reporting gap in either chapter.
- `tab:bases` prints six scale point estimates; report 45:97-103 holds bootstrap
  95% intervals for all six. The Ellel `calendar_lag7_active` interval is 65.6%
  wide — that width *is* the argument that no scale basis is defensible at
  Ellel, and it is currently invisible.
- The weather table carries fifteen point estimates and zero intervals, though
  every paired CI is in report 48. The 0.0163 N-vs-M claim omits that its CI
  lower bound is 0.0004 and is uncorrected for multiplicity — a caveat
  `log/48:153` makes about itself.
- The MCS subsection never states B = 1000, block length 7, seed 93, the
  statistic, or the elimination rule, all pre-registered in report 44 §4a. Nor
  does it say that the MCS *is* the multiple-comparison correction over the nine
  rungs — which is the whole reason it is the right procedure.
- § Measured with power reports no power calculation: no alpha, no effect, no
  achieved power.
- The Winkler negative result drops the procedure name, alpha and bootstrap spec,
  and never writes the explicit "not statistically significant" that rule 8
  requires for D vs A and D vs G, whose paired CIs span zero. No method is
  claimed better without a p-value, so the more serious failure does not occur.
- Bootstrap CIs and Clopper–Pearson are used throughout instead of p-values.
  That is appropriate for this data and should stay; rule 8's p-value demand is
  satisfied in substance by an interval that excludes zero, provided the text
  says so.

**The remedy is almost entirely transcription.** Nearly every missing interval
already exists in a committed result file. This is a cheap, high-yield pass
against the marking criteria.

## Three items for other ledgers

1. **`code_vs_paper.md`** — `select_sba` at
   `eval/intermittency_diagnostic.py:89` implements `cv2 < 2.0 - 1.5 * adi`. The
   published Kostenko–Hyndman rule, verified in `citation_audit.md:190`, is
   *v > 2 − (3/2)p*. The docstring states the reversed direction as if it were
   the published rule. The chapter's claim is correct and the code is wrong, so
   the chapter's SBA result has **no repo artefact backing it** — no report 46–51
   records the correction. Either fix the code and re-run, or the claim is
   unevidenced.
2. **Report 43 needs correcting at source** — the "ranks fifth" prose
   contradicts the table directly above it.
3. **`docs/Prj93_external_examiner_assessment.md`** states the SBA inequality in
   the reversed direction in three places (:153, :1277, :2154). The chapter is
   departing from the examiner's stated direction on the citation audit's
   authority, and should say so explicitly rather than silently.

## What this audit did not do

No chapter was read end-to-end; both were pulled section by section. No number
was corrected — this is an audit, and every fix column is a proposal. Nothing was
pushed to Overleaf. `PRJ93_RULES.md` gate 5 has not been approached.

---

# RESOLUTIONS — see `numbers_audit_resolutions.md`

All 2 STALE, 16 of 17 MISMATCH and 7 of 9 UNTRACEABLE are resolved there
(2026-07-31). **The audit above searched only `brain/log/*.md` and the code, and
missed the ~30 per-script result artefacts sitting beside the code**
(`eval/group_icl.md`, `eval/interval_calibration.md`, `eval/weather_basis.md`,
`signals/chatlog_kb_gap.md`, `models/ladder_results_L1_*.md`, and the JSON beside
them). Those are the primary artefacts; the `log/NN_*.md` reports are narrative
syntheses over them and lose on disagreement.

Two corrections to the audit above:

- **Finding "the remaining eight fall in a band from zero to 0.18" was wrong.**
  `signals/chatlog_kb_gap.md` has the full twelve-cluster table; clusters 5–12
  are exactly eight, densities 0.18/0.15/0.143/0.143/0.111/0/0/0. The chapter is
  right and is more precise than report 51's "several". Verdict → MATCHES.
- **The `£40` grouped-forecast figure is confirmed untraceable**, and so is the
  `GBP 44.8` batch-merge figure it appears to derive from — 44.8 survives only
  as prose in report 47 with no artefact. The real grouped-vs-univariate
  difference, computed from the committed per-origin MAE vectors, is £4.27–£10.94.

---

# ADDENDUM 2026-08-06 — the two floats the audit never covered

`tab:exchangeability` and `tab:vuspr` postdate the original audit batches A–F and were
never assessed. They entered the figure programme as a **known unknown**, which is not the
same as a pass. Both are audited here against regenerated sources (R0 sweep, `log/76`).

## `tab:exchangeability` — source `eval/exchangeability_diagnostic.json`

Store ceiling 2026-07-07, full `provenance` block present. Three venues, no fourth.

| # | Claim | Source | Value | Verdict |
|---|---|---|---|---|
| X1 | Beer Hall implied coverage reproduces published coverage "to a thousandth" | `venues.beer_hall.rank_uniformity.frac_above_nominal_quantile` = 0.129714, against `interval_calibration_L1.json` arm D `marginal.coverage` = 0.8714286 | implied **0.870286** against published **0.871429**, difference **0.001143** | **REVERSED 2026-08-09 → REFUTED.** Previously graded MATCHES on *"implied 0.8703 against published 0.871"*, difference 0.0007. **That compared a full-precision value against a rounded one**, and the rounding hid the defect. Exact published is $1525/1750 = 0.8714286$. A thousandth is not met. **Compared at: both sides full precision from artefact.** See `log/72` §7 |
| X2 | Ellel implied coverage | `venues.ellel.rank_uniformity`, against arm D `marginal.coverage` = 0.9138035 | implied **0.912598** (n_banded 1659), difference **0.001206** | **MATCHES** as a value. **Compared at: both sides full precision.** Does **not** support the "to a thousandth" claim — see X1 |
| X3 | Two River Taps implied coverage | `venues.two_river_taps.rank_uniformity`, against arm D `marginal.coverage` = 0.9631083 | implied **0.961538** (n_banded 1274), difference **0.001570** | **MATCHES** as a value. **Compared at: both sides full precision.** Does **not** support the "to a thousandth" claim — see X1 |
| X4 | Ellel drift sits on calendar-open non-trading days | `drift_decomposition.composition.drift_false_open_only` | n = **1037**, ρ = **+0.3672**, p = **1.88e-34** | **MATCHES** `BLOCKED_third_party.md` D-U3 (ρ = +0.367, p = 1.9e-34, n = 1037) |
| X5 | ...and not on its trading days | `drift_traded_only` (ellel) | n = 263, ρ = 0.0939, **p = 0.129** | **MATCHES** — not significant, which is the decomposition's whole point. State the p-value; a null limb carries the argument here |
| X6 | Beer Hall false-open limb runs the other way | `drift_false_open_only` (beer_hall) | n = **21**, ρ = **−0.472**, p = 0.031 | **MATCHES** — but n = 21. Do not report this as a per-venue symmetry of Ellel's n = 1037 limb without stating both n |

**Verdict: no MISMATCH, no STALE, no UNTRACEABLE.** One reporting instruction (X6): the two
false-open limbs differ in n by a factor of ~50 and must not be presented as a matched pair.

## `tab:vuspr` — source `log/PRJ93_Agent_Eval_Report.md` §S6b, now also `eval/agent_eval.json`

Regenerated 2026-08-06 in `.venv-eval` (TSB-AD 1.5 present). Report reproduces the committed
version **exactly**, apart from the newly appended runtime stamp.

| # | Claim | Value | Verdict |
|---|---|---|---|
| V1 | VUS-PR by kind × venue, 7 cells | exo_coincident/BH 0.932 (48); exo_coincident/TRT 0.996 (36); regime_shift/BH 0.934 (144); regime_shift/TRT 0.972 (108); spike/BH 0.760 (144); spike/ellel 0.704 (36); spike/TRT 0.912 (108) | **MATCHES** |
| V2 | `stock_drawdown` excluded from the VUS-PR table | "no z signature" | **MATCHES** — and the exclusion must be stated in the caption, or the table reads as a missing measurement |
| V3 | Source library | TSB-AD **1.5**, never reimplemented | **MATCHES** |
| V4 | Overall detection | N = 644, recall **0.807** [0.78, 0.84], precision **0.872**, F1 0.839 | **MATCHES** |
| V5 | Cost sweep is degenerate | misses **124**, false alarms **8**, constant across all four ratios; only weighted cost moves (132.0 / 256.0 / 628.0 / 1248.0) | **MATCHES** — confirmed constant, so it is not plottable. See `07_figure_programme.md` F6 |

**Verdict: no MISMATCH, no STALE, no UNTRACEABLE.**

**One defect found and fixed while auditing, which the audit itself would not have caught.**
`eval/agent_eval.py` wrote its report to `config.REPORT_ROOT.parent` — the **repo root** —
while the cited artefact lives in `brain/log/`. A re-run therefore produced a fresh report
where nobody reads it and left the cited copy untouched. Recorded in `log/60`, now fixed;
the module also emits `eval/agent_eval.json`, so `tab:vuspr` no longer stands on a markdown
table alone.

**And one trap worth recording.** The first regeneration was run in `.venv-forecast`, which
does **not** carry TSB-AD. The script degraded gracefully rather than failing — it wrote
*"VUS-PR: not computed, dependency unavailable"* and silently replaced the entire seven-cell
table. Every other number in the report was unaffected, so a diff that skimmed the totals
would have passed it. **The venv is part of an artefact's identity, and running the right
script in the wrong one is a live way to lose a headline result.** This is exactly what the
runtime stamp added in `log/69` §4 exists to make visible, and it is why the stamping was
extended to this generator before the regeneration, not after.

---

# ADDENDUM 2026-08-06 (2) — `functional_pair` frame correction, before and after

**Recorded so 8C composes Results 4.1 from the corrected figures rather than the current
draft's.** `eval/functional_pair.py` scored Ellel on the **untrimmed 392-row** frame
(`build_features`) where every other L1 package uses the **trimmed 386-row** frame
(`ladder._load_feats` = `build_features` then `trim_to_active`). Diagnosed as a defect rather
than a design choice because the module's own `STEP` comment states it is producing
"273/260/205 origins" while it produced 273/**266**/205. Fixed and re-run (832.3 s,
`.venv-forecast`). Full reasoning in `log/77`.

| venue | quantity | BEFORE (untrimmed) | AFTER (trimmed) |
|---|---|---|---|
| beer_hall | n origins | 273 | **273 — unchanged** |
| beer_hall | paired_absolute Δ | +0.0092 [−0.0093, 0.0277], p = 0.327 | **identical** |
| beer_hall | paired_squared Δ | −0.0056 [−0.0216, 0.0103], p = 0.488 | **identical** |
| two_river_taps | n origins | 205 | **205 — unchanged** |
| two_river_taps | paired_absolute Δ | +0.0057 [−0.0189, 0.0303], p = 0.649 | **identical** |
| two_river_taps | paired_squared Δ | −0.0015 [−0.0166, 0.0137], p = 0.850 | **identical** |
| **ellel** | **n origins** | **266** | **260** |
| **ellel** | paired_absolute Δ (£, unscaled) | +60.664 [50.384, 70.944], p = 1.70e-25 | **+63.397 [52.462, 74.332], p = 1.01e-24** |
| **ellel** | paired_squared Δ (£) | +69.619 [49.584, 89.655], p = 5.41e-11 | **+72.028 [50.676, 93.379], p = 1.80e-10** |

**Only Ellel moves, and only Ellel could**: it is the one venue with a leading dead span for
`trim_to_active` to remove (the 2025-06-08 sale-and-reversal mis-ring plus five dead days to
2025-06-13, `log/43:55-59`). Beer Hall and Two River Taps reproduce **identically**, which is
the check that the fix touched the frame and nothing else.

**The R9 conclusion is unaffected.** `crossing_venues` remains **`[beer_hall,
two_river_taps]`** and Ellel's `crossing_observed` remains **False**. Ellel's magnitudes rise
about 4.5 per cent and its p-values remain overwhelming (1e-24 and 1.8e-10), so every
statement the chapter makes about the minimal pair survives with corrected numbers.

**Use the AFTER column.** The BEFORE column is recorded only so a reader of the current draft
can tell which figure they are looking at.

---

## ADDENDUM 2026-08-07 — the `tab:winkler` 90% set column is sensitive to the numerics regime

Source: `log/78`. `eval/interval_calibration` regenerated in both venvs on approval.

**Scope first, because this is narrower than it sounds.** Every Winkler mean, every coverage
figure and every Clopper–Pearson limb **reproduces exactly** under `.venv-forecast`, the
regime `log/61` identifies as the committed one, and those artefacts now carry a provenance
stamp naming it. `tab:coverage` is clear in full. Ellel is stable in every verdict. What
moves is the **"90% set" column of `tab:winkler`** (rows 28, 30, 32 of this audit) and the
paired-bootstrap significance beneath it.

**This is NOT about `tab:mcs`.** `tab:mcs` is the ladder MCS over nine forecasting candidates
(`eval/mcs_L1_results.json`); `tab:winkler` is the conformal-arms comparison
(`interval_calibration_mcs.json`). Only the latter was exercised. An earlier note in this
session misattributed the finding to `tab:mcs`; it is corrected here rather than above.

| Venue | `.venv-forecast` (committed) | `.venv-eval` (numpy 1.26.4) |
|---|---|---|
| beer_hall | set `[D, A, G, S, P]`, adoption `[]` | same set, adoption `[]` — but P−A and S−A bootstrap intervals lose their exclusion of zero |
| ellel | set `[D]`, adoption `[]` | identical verdicts |
| **two_river_taps** | set `[D, P, S, A, G]`, adoption `[]` | set **`[P, D, A, G]`** (S eliminated, p 0.191 → 0.036), adoption **`['P']`** |

**Compose from the `.venv-forecast` column.** It is the committed regime and the one every
other reported figure was produced under.

**Corroborates row 579 from an independent direction.** That row already warned MCS p-values
near α = 0.10 are unstable to ±1 set member under bootstrap-B variation, and asked the table
to say so. The same boundary now moves under library resolution instead of replicate count.
Two independent perturbations, one conclusion.

**Two River Taps specifically, and this is why it is a finding rather than a computing
accident.** It has the fewest origins (205 against 273 and 260) and the tightest spread
between arms, so it has the least margin to absorb a threshold crossing. The sensitivity
tracks sample size.

**Required in 5.3** — see the drafted note in `ledger/blocker_clearance_package.md` §5.3.
Lead with non-separability as the finding; the quantification is the support.

**Known bounded gap:** `tab:mcs` is an MCS too and inherits the amplification mechanism by
construction. `mcs_L1_results.json` is unstamped; `log/70` records its Gate A regeneration
running in `.venv-forecast`, so it is consistent with every other committed number, but it
has never been run across the gap. Testing it means regenerating the ladder, which the
approved `tab:ladder` disposition puts out of scope. Demonstrated for the conformal arms;
plausible, untested, for the ladder.

---

## ADDENDUM 2026-08-07 (2) — Beer Hall P−A and S−A are marginal verdicts

Source: `log/78` Part 3. Set membership at Beer Hall is unchanged across regimes, so this
does not reach the `tab:winkler` set column — but the underlying paired-bootstrap verdicts
do move, and if either difference is quoted in 4.1 prose as established, the qualification
belongs with it.

| Pair | `.venv-forecast` | `.venv-eval` |
|---|---|---|
| P − A | +125.36 [16.46, 250.66] **excludes zero** | +97.40 [−16.58, 225.81] does not |
| S − A | +113.80 [11.94, 227.07] **excludes zero** | +83.87 [−22.68, 200.86] does not |

Lower limbs of +16.5 and +11.9 on intervals roughly 235 wide: the verdict rests on the last
few per cent of its own interval. **Do not write either as a clean separation.** The
defensible phrasing is that A's advantage over P and S at Beer Hall is directionally
consistent but not robust — which is the same conclusion the empty adoption list reaches.

## Sweep — MATCHES verdicts that compared an exact value against a rounded one (2026-08-09)

Run after X1 was reversed, to answer whether the same mechanism graded anything else. **Scope:
every `MATCHES` row in this file (335 of them), machine-scanned for a pair of numeric tokens
where the longer-precision one rounds to the shorter and the two are not equal.** It does not
cover claims whose two sides are in different files, claims carrying no digits, or rows where
the rounding is on the repo side rather than the document side.

**Raw count: 15 rows.** But the count that matters is smaller, because rounding one side is only
a defect when the **claim is about agreement** — a tolerance, a bound, a containment. Where the
document simply reports a rounded figure, the rounding is a display convention and the verdict is
unaffected. Splitting on that:

| Class | Count | Rows |
|---|---|---|
| **Tolerance or containment claim — rounding can move the verdict** | **2** | **X1** (reversed above), **62** |
| Ordinary display rounding — verdict unaffected | 12 | 16, 28, 32, 40, 26, 14, 31, 55, 56, 61, 63, 65, X4 |
| False positive of the scan | 1 | V4 — the two tokens are F1 0.839 and a recall CI bound 0.84, different quantities |

**The one live instance, not repaired this session per instruction — listed only.**

**Row 62.** The document reads *"ratio of paired to independent standard deviation lies between
$0.16$ and $0.27$"*. `eval/mcs_L1_results.json` `beer_hall.paired_variance_top4` holds 0.162,
0.219, 0.222, 0.228, 0.272, **0.274**. The upper bound is stated at two places; the true maximum
is 0.274 and **lies outside the stated interval**. Graded MATCHES against the rounded 0.27. Same
mechanism as X1: a containment claim checked at the precision of its own display. Direction is
narrowing — the document reports a tighter spread than the data carries. Magnitude 0.004.
**Owner: unassigned. Not repaired here.**

**On the twelve.** Each states or implies its rounding (*"MATCHES (rounded)"*, *"(rounded down)"*,
*"(derived, not stated)"*, *"near"*), and none of their claims turn on the digits dropped. They
are now non-conforming to the new precision rule in `PRJ93_RULES.md` in form — the rule asks each
row to name the precision it compared at — but not in substance. Bringing them into form is
bookkeeping, not correction.

---

## ADDENDUM 2026-08-19 (S35 V2) — row 26 has gone STALE, and the sentence it graded is rewritten

**Row 26 is not edited.** It was correct when written and its verdict is preserved. This row
records what changed under it.

**Row 26, verbatim, at `ledger/numbers_audit.md:187`:**

> `| 26 | "Temperature is zero and the model identifier is pinned" | methodology.tex § Intervention layer | brain/config.py:448; log/46_G17e…:64,224 | AGENT_TEMPERATURE = 0.0; model claude-opus-4-8 pinned | MATCHES | none |`

**Three things drifted, and only one of them is the substantive one.**

1. **The document sentence is no longer true of the call, which is the substantive change.** S32
   removed the `temperature` argument from `signals/agent.py`'s `live_execute`. The docstring
   there now records why, verbatim: *"No `temperature` is sent: sampling parameters were removed
   on Opus 4.7 and later and now 400, so passing `config.AGENT_TEMPERATURE` failed on call one
   against the pinned `claude-opus-4-8`."* **`config.AGENT_TEMPERATURE = 0.0` still exists and is
   still 0.0; it is simply not sent.** The pin half of the sentence still holds:
   `config.AGENT_MODEL = "claude-opus-4-8"` is passed on every call.

2. **The trace line has moved.** Row 26 cites `brain/config.py:448`. `AGENT_TEMPERATURE` is now at
   `config.py:514`. The constant is unchanged; the file grew.

3. **The document site has moved.** Row 26 cites *"methodology.tex § Intervention layer"*. The
   sentence lived at `appendix/pseudocode.tex` under `app:agent-apparatus` at the time of this
   correction, and `grep` over `abstract.tex`, `chapters/` and `appendix/` finds it in that one
   place only.

**The sentence as rewritten 2026-08-19**, replacing *"Temperature is zero and the model identifier
is pinned."*:

> The model identifier is pinned and no sampling parameters are sent, because the pinned model
> rejects them: decoding is therefore not fixed by a temperature setting, and a repeated call is
> not guaranteed to return the same response. What makes the numbers reproducible is the cache and
> not the decode.

**THE DETERMINISM CLAIM IS NOT SMUGGLED BACK IN, AND THE DISTINCTION MATTERS.** Two different
things were being carried by one sentence:

- **Cache-key stability**, which is intact and is what `live_execute`'s docstring means by *"The
  determinism the pre-registration relies on is unaffected"*. The key is
  `hash(model, prompt_hash, scenario_payload)` and temperature was never a term in it, so the 644
  injections still collapse to 420 distinct calls exactly as `ledger/agent_eval_numbers.md`
  records.
- **Decode determinism**, which is **no longer secured by anything.** Nothing in the apparatus now
  fixes the sampled output of a live call. The rewritten text says so, and says that replay from
  the on-disk cache is what makes the reported numbers reproducible, while a second live run is a
  new measurement rather than a repeat.

`config.AGENT_TEMPERATURE` stays in `config.py`. S32's reasoning holds: deleting a constant a trace
points at would falsify the trace, and this addendum is the trace.

**Not repaired here, and named so it is not lost:** `config.py:508` still comments *"Model +
temperature + prompt VERSION are pinned and stamped into every"*, which carries the same stale
half. It is a code comment rather than a document claim, and editing the brain codebase was out of
scope for S35.

---

## ADDENDUM 2026-08-19 (S37 V9.1) — three corrections from S36, appended, no numbered row edited

Each row below corrects a figure or a belief that a previous package carried. The numbered
rows above are left exactly as written; these are the forward pointers.

### C-S37-1 · The service surface is **12 endpoints, not 8**

Measured by counting `@app.{get,post,put,patch,delete}("…")` across `brain/service/*.py`:
**ten in `service/app.py`, two in `service/compute.py`.** The S36 package specification
expected 8; that figure matches nothing in the tree and no artefact here ever produced it.

**Cause of the drift, and it runs the other way from a stale count.** `brain/README.md`
listed **eleven** routes for `service/app.py`, one more than exist, because it still carried
`POST /refresh`. That route was deleted under M1 and `service/app.py:510` says so verbatim:
*"The POST /refresh route is gone (M1): it was unauthenticated, unbounded"*. **Fixed in this
package**, along with a second note lower in the same file that described `/refresh` as the
reason to bind to localhost — the live-top-up write behind `GET /forecast?freshness=live` is
what makes that advice true now.

The invariant worth carrying forward is not the count. **It is the route list**: twelve can
stay twelve while a path or a verb changes underneath it.

### C-S37-2 · The suite is **678 collected with one failure**, not 676 with none

Measured in `.venv-run`: **1 failed, 669 passed, 8 skipped**. Two parts:

- 678 rather than 676 because S32 added `tests/test_agent_cache_checkpoint.py`.
- The failure is
  `tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`,
  and **it fails at the baseline**, before any package touched anything.

**The belief that it was a network test is wrong.** S27 and S32 deselected it by node id on
the record that it *"falls back to downloading Chronos weights from Hugging Face
unauthenticated"*. It fails in `.venv-run`, which has neither `torch` nor `chronos`, so no
download is reachable. The exception is
`eval.harness.UnknownBasisError: unknown scale basis 'unscaled'`, raised in
`harness._scale_pairs` **after** prediction: `config.VENUE_SCALE_BASIS["ellel"] == "unscaled"`
reaches `harness.point_metrics` at `models/ladder.py:405` before the two places the same file
handles that basis (`_score` `:440`, `loss_names` `:449`).

**A deselection is a claim, and this one masked a defect for two packages.** Consequence:
`evaluate_static("ellel")` cannot complete, so the Ellel static-regime table in
`models/ladder_results_L1_ellel.md` is not regenerable from this code — and it prints a MASE
column for the one venue `methodology.tex:259` rules has no defensible scaled basis. See
§V9.2 of `brain/log/109_remote_purge.md` for which document claims that touches.

### C-S37-3 · A pre-push secret scan of the **diff** cannot see what is already tracked

S35's pre-push scan reported clean and was correct about what it examined: the diff being
pushed carried no `olp_`, no `sk-`, no DSN, and no `.xlsx` or `.csv`. It reported clean
**indefinitely**, because the twenty-one venue-data files were added in `58e9b792` on
2026-06-25 and appear in no later diff.

**The scan's scope was never stated alongside its verdict, which is what made it read as a
guarantee.** Any future pre-push check must say what it scanned. A diff scan answers *"does
this push add a secret"*; it does not answer *"does this repository contain one"*, and only
the second question protects a public remote. The second is
`git rev-list --objects --all` over full history, which is what found the exposure S37
removed.
