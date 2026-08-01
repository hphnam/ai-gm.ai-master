# PRJ93 — state brief

Written 2026-07-30 under `brain/PRJ93_RULES.md`, from the six `docs/` files,
`log/Decision_and_Resolution_Log.md` (ordering only), `log/` filenames, and a
live read-only Overleaf listing. **No source files and no `.tex` bodies were
read.** Marking criteria are a separate artifact: `00_marking_criteria.md`.

Estate: Beer Hall (anchor, 399 rows), Ellel (sparse, booking-led, ~390), Two
River Taps (closed May 2026, structural break), Events (excluded, 203 rows /
2 dates). Body target 17,300 words; build window closes 2026-08-21; submission
2026-09-04 16:00.

## 1. Chapter state

Overleaf holds one project (`6a11ac2180bb716e3c2491c4`), 14 files: `main`,
`title_page`, `declaration`, `abstract`, `acknowledgements`, `publications`,
`chapters/{introduction,literature_review,methodology,results,conclusion}.tex`,
`appendix/introduction.tex`, `tables/…`. **No `chapters/discussion.tex`.**

| Chapter | Exists | Provisional | Missing |
|---|---|---|---|
| Introduction | `chapters/introduction.tex` on Overleaf | completeness not stated in docs | — |
| Literature review | `chapters/literature_review.tex`, edited + pushed in 2 commits; CPTC theorem restated correctly, PRISM named, CUSUM grounded in Page (1954), Chronos-2 promoted to its own paragraph, metric paragraph added; 75 cite keys, 108 `ref.bib` entries, 0 undefined citations | — | search-protocol appendix; second preprint-density flag |
| Methodology | `chapters/methodology.tex` **is on Overleaf** (see cross-check). Written: metric ruler (S1), fold count (S2), MCS (S3), scale basis (S4), Beer Hall fold-count demonstration (S8a) | partial | intermittency constants; occurrence-gate spec; group-ICL method; weather method |
| Results | `chapters/results.tex` **is on Overleaf**. In: group ICL (S5), weather (S6), interval calibration (S7), injection realism (S10) | partial | fold-count + MCS served-model results; intermittency/occurrence results; **the entire Objective 3 agent section** (blocked on S8b/S8c) |
| Discussion | — | — | **MISSING ENTIRELY.** Named highest writing priority |
| Conclusion | `chapters/conclusion.tex` on Overleaf | completeness not stated in docs | — |

**Cross-check that supersedes the docs.** The addendum
(`FLAG-METHODOLOGY-OVERLEAF`) and examiner finding 44 both state methodology
and results do not exist on Overleaf and are stranded in the repo. The live
listing shows **both are on Overleaf** — those records are STALE. Treat the flag
as provisionally closed and the "7,000–8,000 missing words" figure as needing
re-measurement. **Not verified:** whether they hold prose or stubs. No
per-chapter word counts exist anywhere; the only stated figure is 17,300.

Intended results skeleton (master log, 7 parts, only partly instantiated in
`.tex`): evaluation design; ladder and gate; serving-horizon accuracy; the
falsification and its two failed rescues; operational results; limitations;
fidelity audit.

Standing hazards: a Zotero `ref.bib` refresh silently repointed
`angelopoulos_conformal_2023` from Conformal PID Control to the Gentle
Introduction and the document still compiled clean; never re-export via Better
BibTeX (key format differs, breaks ~60 citations). A duplicate
`chapters/ref.bib` stub for `chatfield_all-zero_2007` risks a duplicate key.

## 2. Weaknesses flagged by the examiner assessment

Document: self-styled "External Examiner Examination Record", **AI-assisted
examiner persona, not real institutional feedback**; assessed 2026-07-14,
re-verified at tip `d40dea7` 2026-07-20, remediation to 2026-07-23; it logs
eight of its own errors. Register at close: **2 Fatal, 14 Major, 3 Minor**;
mark **63/100 (Good Pass / Merit)**, unchanged through every remediation round;
Distinction "Not met". `[C]` closed, `[O]` open, `[W]` withdrawn.

1. July headline MASE 0.386 used a different seasonal-naive denominator from the backtest it claims to beat (`confront_july._seasonal_scale` raw SQL, trading days only, no calendar fill); on the backtest ruler it is 0.836 > 0.745. Defect propagated to a third private copy at `confront_july_w2.py:87`. Results. **Fatal** — "invalidates the conclusions". `[C]` S1 — 0.772 vs 0.745.
2. Neither denominator is a valid seasonal-naive scale: calendar-filled is deflated by structural zeros (BH 21.1% of lag-7 diffs exactly zero, Ellel 72.8%); trading-only misaligns weekday (5.22-day week ⇒ lag-7 reaches back 1.34 weeks). Four rulers span 0.836/0.399/0.597/0.672. Methodology. **Fatal**. `[C]` S1.
3. MASE optimises the median; Ellel's median day is £0 (82% zeros), so a near-zero flatline is rewarded (July: forecast £56 vs actual £445, MASE 0.07). Methodology/Results. **Fatal**. `[O]` — RMSSE remedy not adopted.
4. **No LLM exists in the served system.** The only Anthropic import is `eval/judge.py` (never run, no key, zero kappa); surfacing is `briefing._score`, six hard-coded constants. Cross-cutting. **Fatal**, explicit ceiling: "no quantity of statistical polish reaches 70 while the object of the research question is absent". `[O]` — S8a built, S8b/S8c pending.
5. Model selection is a bare argmin of a 6-fold mean, no dispersion, no significance test: BH ETS SD 0.226 vs a 0.054 gap; Ellel SD 0.524 vs 0.009; TRT served on 0.005. Methodology/Results. **Major**. `[C]` S2/S3.
6. At n=6, h=7 the Harvey-Leybourne-Newbold factor is exactly zero — no DM variant computable at all; pairwise-p league tables invalid at any n per Hansen et al. Methodology. **Major**. `[O]` per K.11.
7. Dependencies unpinned (all `>=`, no lockfile, Chronos-2 weights pinned by model id not revision SHA) — the selection was unverifiable. Methodology. **Major**. `[C]` S3.
8. Every served-model decision rests on 42 consecutive days (2026-04-20 to 05-31) — six adjacent non-independent spring weeks from a 362-day series, then deployed into June/July; exogenous edge reversed on June-inclusive refits and the served model was not changed. Methodology/Results. **Major**. `[C]` S2 → 273/260/205 origins.
9. The 644-injection eval perturbs the residual z stream, not revenue, holding `expected` fixed, so the forecaster cannot adapt by construction; 0.996 recall and 2–6 day latencies are upper bounds, not declared as such. Methodology/Results. **Major**. `[W]` S10 — discount measured at zero.
10. Objective 4 unmet on 3 of 4 terms: N=0 human labels; judge never run, no kappa; **no ECE, reliability diagram or temperature scaling anywhere in the codebase** while the state log lists calibration "in the build". Results. **Major** — "the most expensive unforced error in the project". `[O]`.
11. Weather trained/backtested on `hindcast` while `config.py:231` asserts it "matches serving"; serving day 7 carries a 7-day-lead forecast. `fetch_leadmatched` implemented and unused; `WEATHER_LEAD_DAYS` is 3 not 7. The entire exo margin (0.745 vs 0.793) is the covariates. Methodology/Results. **Major**. `[C]` S6 — no optimism found, weather marginal.
12. Rhythm learned from sales only; the spec names four domains. `CHECKLIST_LIVE = False`; `signals/chatlog_kb_gap.py` never imported by the briefing, so the brief's own fryer-reset example surfaces to no one on a 735-message log already committed. Methodology/Results. **Major**. `[C]` S11 — chat-log live; stock/checklist still externally blocked.
13. Band coverage 1.00 vs 0.90 nominal reported as a headline success; split conformal bounds coverage on both sides, and the project's own gate is ±3pp. `harness.py` computes `winkler` and `mean_width`; neither confrontation reports them. Results. **Major**. `[W]` S7 — 1.00 on 7 points is not miscalibration; real BH under-coverage 0.871 found instead.
14. Multi-venue transfer — which the brief calls "the interesting research" — is a donor DOW-shape heuristic, wins 2 of 3 venues at 14-day cold start, loses from 21 days on, and is used by **no served model**; the stated gate excludes exactly the venue where it lost (TRT, n_test=317, not data-poor) and pre-registration of that wording is NOT EVIDENCED. Results/Discussion. **Major** (revised from Minor). `[O]`.
15. Beer Hall net sales reconcile to the host audit only to within £403.31 on £202,491; passes `RECONCILE_TOL`, never explained. Methodology. Minor — "a tolerance is not an explanation". `[O]`.
16. The TRT VAT question, decidable from the committed seed CSV in under an hour, was classified stakeholder-blocked and left "Owner to confirm" for months while the state log called it moot. Methodology/Discussion (process). Minor. `[C]` on internal evidence; assumption confirmed correct.
17. L1 series are intermittent/lumpy but the entire L1 stack — model and metric — assumes continuous demand (BH 1.35/0.57 lumpy; Ellel 5.63/0.98, 18.3% density; TRT 1.18/0.61 erratic). The diagnostic was only ever run at L3; Croston/SBA are gated on an L3 function and have never run at L1; no hurdle, two-part or zero-inflated model exists. Methodology/Results. **Major [NEW]**. `[C]` S4 — narrowed; occurrence gate does not help BH; Ellel blocked on diary.
18. Chronos-2 called with `id="l1"` — a group of size one — disabling the group-attention cross-series in-context learning that is the model's defining architecture and the brief's named research interest. Switched off by one string literal. Methodology/Results. **Major [NEW]**. `[C]` S5 — negative result.
19. Ellel's model has zero information about whether it will trade tomorrow on an 82%-zero series: `is_ellel_event` was correctly neutralised to kill a self-leak, leaving the occurrence signal empty; the booking diary exists in the real world but not the dataset. Methodology. **Major [NEW]** — "the highest-value input available to the project". `[O]` blocked on Elliot.
20. The lit review misstates the theorem of its own key source — claims Sun & Yu (2025) CPTC gives coverage "guaranteed even as the venue's regime shifts"; CPTC proves exact coverage only under exchangeability (Prop 4.1), asymptotic time-averaged validity under a stationary state distribution (Thm 4.2), and merely faster post-shift convergence than ACI (Thm 4.4). Lit review. **Major [NEW]** — "an examiner can check it in ninety seconds". `[C]` — replaced with Barber et al. (2023).
21. The synthesis paragraph claims an unoccupied intersection that PRISM (Fu et al. 2026) already occupies — cost-ratio-driven adaptive thresholds plus ECE/Brier — and PRISM sits in the candidate's own notebook. Lit review + contribution claim. **Major [NEW]** — "the fastest route to a viva you cannot defend". `[C]` — repositioned as field-deployment novelty.
22. Citation key `faw_-context_2025` is wrong on both author and year — the paper is Das, Faw, Sen & Zhou (2024), authors in alphabetical order. Lit review/references. Minor [NEW]. `[C]`.
23. Intermittency cutoffs use SBC's arithmetic errors (ADI ≥ 1.32, CV² ≥ 0.49) rather than Kostenko & Hyndman's corrections (4/3, 0.5); BH's ADI of 1.3256 falls **between** the two, so the wrong constant decides the anchor venue's classification. Methodology/Results. Minor [NEW] → **UPGRADED Major, Round 3**. `[C]` S4.
24. "The literature review for a project that was not built" — all three legs of its contribution claim fail (transfer used by no served model; no LLM agent; N=0 real manager outcomes). Lit review vs Results. "The strongest artefact in the project and the most dangerous one"; risks "convert[ing] a Merit into an argument about integrity". `[O]` — "Do not submit them as they stand."
25. Broken promise: the chapter commits to a lag-tolerant VUS-PR-style detection metric and rejects point-adjusted F1; Report 11 records VUS-PR "not computed, dependency unavailable". Lit review vs Results. High (inferred). `[O]`.
26. Broken promise: the evaluation section ends on Guo et al. and ECE as the loop-closing guarantee; no ECE exists in the codebase. Lit review vs Results. High (inferred). `[O]`.
27. Broken promise: Ask-F1 adapted from Trinh et al.'s HiL-Bench, but the sweep has zero misses and a flat cost of 8.0 at every ratio 1:1 to 10:1 — degenerate, measures nothing. Results/Lit review. High (inferred). `[O]`.
28. Broken promise: the self-declared "central conceptual move" is that the learned rhythm *is* the agent's memory (Park's recency/relevance/importance stream, Hu's self-evolving state). "There is no memory stream, no reflection, and no retrieval" — a recency multiplier with a floor of 0.5. Lit review vs Methodology. High (inferred). `[O]`.
29. The conformal arc argues toward a conclusion the committed data refutes: at the one real regime change coverage collapses to ~half nominal (static 0.529; ACI 0.412–0.471) — **adaptive conformal is worse than static**. Lit review/Results. High (inferred). `[C]` S7 executed the calibration work.
30. Chronos-2 is the served model and is cited once inside a parenthetical pile, while TimesFM and Chronos-1 get full paragraphs; the chapter never argues for the model that ships nor engages with covariate-conditioned foundation forecasting, so "the gap it elicits is not the one the method fills". Lit review. High (inferred). `[C]`.
31. CUSUM, the production detector, is absent from the chapter entirely while BOCPD (benchmark only) gets full treatment — the chapter argues for neither method that actually ships. Lit review. High (inferred), [NEW Round 3]. `[C]` — grounded in Page (1954).
32. The Croston passage is framed as an L3 concern and reads as a set-up for adoption when the result was non-adoption (Croston lost to a DOW median), and L1 is lumpy too. Lit review. Medium (inferred). `[O]` — "A review that predicts its own negative result is a review that is doing work."
33. **No search protocol** — no databases, query strings, inclusion/exclusion criteria, or screened-vs-retained counts, though the concept-centric structure is delivered. Lit review. Medium — "a half-page appendix and it is free marks". `[O]`.
34. The chapter header asserts every empirical claim was verified against full paper texts in NotebookLM "see the accompanying verification log" — that log is NOT EVIDENCED, and the CPTC misstatement is itself evidence the pass was not thorough. Lit review/front matter. Medium-high — "a liability". `[C]` sentence withdrawn.
35. Ten or more load-bearing citations in the surfacing and evaluation sections are 2025–26 preprints, and the "unoccupied intersection" claim rests substantially on unrefereed work; flagged once only. Lit review. Medium (inferred). `[O]`.
36. **The alternative-comparison the 70–79 band requires is absent** — what exists is "a point-estimate league table with no dispersion and no significance test". Discussion/Results. Explicitly the stated reason Distinction is "Not met". `[O]` — partially served by S3's MCS.
37. `eval/chronos2_covariate_probe.md` concludes "Outcome: covariates HELP" when the result is 3 folds better, 3 worse, mean delta −0.014 against per-fold SD ~0.20, paired sign test p = 1.0 — a null reported as positive, and inconsistent with Hertel (weather ≈6% SHAP) and Haben (temperature detrimental). Results/Discussion. **Major**. `[O]`.
38. The horizon claim (June 1.64 → July 0.386 proves accuracy at the serving horizon) is confounded — horizon length, origin recency, taxonomy refresh and the liveness gate all changed at once, and the candidate's own weekly-rolling June number (1.47) shows cadence is not the driver. n = 1 month per condition. Results/Discussion. High (inferred, part of Fatal 1). `[O]`.
39. The served model is regime-fragile: on the committed static-regime stress test **Chronos-2-exo errors out with a ValueError and cannot produce a forecast at all**, and robust-DOW (0.704) beats Chronos-2 (0.721). Its superiority is specific to the 7-day rolling setting. Results/Discussion. High (inferred). `[O]`.
40. The `events` location (203 rows, £1,438.74) is a fourth location dropped from all modelling; immaterial by value but never stated in the dissertation. (The `EXCLUDED_VENUES` constant never executed.) Methodology. Low. `[O]`.
41. No single global seed policy — `EVAL_SCALED_SEED=93`, `random_state=0`, `default_rng(13)` scattered; GBM rungs single-seed. Methodology. Low — examiner: "the reproducibility failure is dependency pinning, not seeds". `[O]`.
42. State-log-vs-code conflict: "the brain works against Ryan's read-only Neon research schema", but `INGEST_SOURCE=csv`, `LIVE_INGEST=0`, and the NeonAdapter is wired and inert. Methodology/front matter. Minor. `[O]`.
43. State-log decision 13 claims VAT removal "closes the TRT VAT item by making it moot"; removal is true of the compute path only — the research path, where every dissertation number was produced, still applies `vat_deflator`, and `FLAGS.md` still reads "Owner to confirm". Methodology/hygiene. Minor — "the log's own named failure mode recurring". `[O]`.
44. No methodology or results chapter exists in Overleaf; ~7,000–8,000 words missing against a window closing 2026-08-21. Cross-cutting. "The largest schedule risk is not Elliot"; later "the binding constraint, larger than any external dependency". **STALE — both files are on Overleaf as of 2026-07-30.**
45. No discussion chapter exists; the strongest available methodological argument (small-sample claims that fail at power — the six-fold selection, the library-flip artefact, the `contract.py` half-width growth) is unwritten. Discussion. High (inferred) — "highest writing priority". `[O]` — confirmed today, no `discussion.tex`.
46. Verified material lives in build reports, not the dissertation: fold-count/MCS served-model results, intermittency and occurrence-gate results, and the four ablations (group composition, weather, band methods, injection control-vs-realistic) should be first-class results, not appendices. Results. High (inferred). `[O]`.
47. Two sources of truth for methodology (repo vs Overleaf), and `chatfield_all-zero_2007` stubbed into a second `chapters/ref.bib` though the entry already exists in the Overleaf root — duplicate-key risk. Front matter/hygiene. Low-medium (inferred). Chapter half `[C]`; stub `[O]`.
48. Standing bibliography hazard: refreshing the Zotero-linked `ref.bib` silently repointed `angelopoulos_conformal_2023` and the document compiled with no warning. Front matter/references. Medium (inferred). `[O]`.
49. At Ellel **no MASE scale basis is defensible at all** — 28 pairs, 66% interval; the deflated calendar basis spans MASE 0.32–0.55 on scale uncertainty alone; trading bases reach back ~six weeks giving a spurious 0.09. At 1.2 trading days a week the seasonal-naive concept has no purchase. Methodology/Results. High (inferred, from S4). `[O]` — remedy is unscaled or cost-weighted error (Chatfield & Hayya 2007).
50. Change-point-triggered refit fires on 61–63% of sustained shifts and, when it fires, **suppresses continuation alerts** on the still-ongoing shift in ~16% of checked cases — a tool that detects a shift, refits to accommodate it, and stops reminding the manager it is live. Results/Discussion. High (inferred). `[O]` `FLAG-CONTINUATION-ALERT-SUPPRESSION`.
51. Measured on ~1,750 pairs, Beer Hall's band **under-covers at 0.871 against 0.90 nominal, 3.6 SEs low, at every horizon step** and identically on the served exo model — a property of the band, not the point forecaster; falling below the Angelopoulos-Bates lower guarantee is itself evidence exchangeability is violated. Results. High (inferred). `[O]` `FLAG-BAND-UNDERCOVERAGE-BH`.
52. Ingest bug: an incremental build accepted a short HTTP 200 with no completeness check and stepped the watermark past an interior hole, producing a nine-day Ellel weather gap and fourteen missing folds. Methodology. Medium (inferred). `[C]` S6.
53. Latent library hazard: under `cross_learning=True` Chronos mixes every series in a batch, so **the batch is the cross-learning group**; an oversized batch merged origins and moved numbers by £45. Without the catch the S5 negative result would have been a false positive. Methodology/Results. High (inferred) — "load-bearing discovery". `[C]` S5.
54. Genuine reading gaps — none of Hansen/Lunde/Nason, Hewamalage/Bergmeir, Kolassa, Barber et al. 2023, Haben et al., Cragg, Mullahy, Kostenko & Hyndman, Athanasopoulos et al. 2024, TabPFN-TS, Meyer et al., Brigato et al. or Makridakis et al. 2022 was in the notebook. **No citation at all governed the choice of MASE, the model-selection procedure, or the weather covariates.** Lit review/Methodology. High (inferred). `[O]` partially — Diebold & Mariano added 2026-07-27.
55. Delivery risk: S8 requires live Anthropic calls the candidate has no authority to run (Track B is Ryan's), so the agent's empirical headline depends on another party. Cross-cutting. High (inferred) — "the gate between contribution and decoration". `[O]`.

**Strengths — do not change.** `assert_no_leakage` fires on every fold; the
`is_ellel_event` self-leak and the MinT top-preservation error both caught
against own interest; refusal of the ERA5/observed weather basis ("more rigorous
than a 2026 KIT paper" — foreground at viva); the liveness gate (£5,329
overcount, formally a two-state CPTC with ε=0); **pre-registration by commit
ordering — "the strongest thing in the project"**, extended by S8a's prompt
freeze at `c8fa127`; negative results reported not buried; MSc-level technique
present and correct (Chronos-2, split + Mondrian conformal, MinT WLSv, CUSUM,
BOCPD, LOVO, the 644-injection grid); `eval/labels.py` "already built and is
good"; the lit review alone "reads like a 75". "Do not swap" Chronos-2.

## 3. Experiments — run vs implied

**Run (52 recorded).** Pre-G17: WP2 Croston/SBA at L3 (lost to DOW-median); WP6
ACI closure probe / CUSUM ARL0 (`CP_CUSUM_H = 5.0` retained); VUS-PR via pinned
TSB-AD + statsforecast cross-check; Rung-4 Chronos-2 zero-shot + covariate probe
+ promotion; full 7-rung ladder, 6-fold, 3 venues (BH 0.745, TRT 0.597, Ellel
0.572); G12.9 fold-count unification; G12.10 `is_ellel_event` leak fixed at
source + exogenous widened to 15 covariates; G12.12 go-live STOP at gate a;
G12.13a June freeze (`1d966be`); G12.13b June confront (cold MASE 1.64,
weekly-rolling 1.47; liveness gate turned a £5,329 forecast for a dead venue
into none); G12.13 canonical reconciliation (MinT 0.662 vs disaggregation
0.734); G12.15 cadence sweep + MPS-vs-CPU (MPS slower, 3.2s vs 0.6s, parity
£0.0002) + home-nation; G12.16 taxonomy reconciliation (capture 26% BH / 15%
Ellel); G12.17a July W1 freeze (`7d103aa`); G12.17b July 1–7 confront (BH 0.386,
coverage 1.00, 1 Jul England fixture anticipated +191 vs +451 realised, briefing
0 new / 8 suppressed); G12.17c window-2 freezes A (`a590f91`) / B (`9dd9028`);
G12.18 comment de-AI rewrite; **G12.17c C2 confront — the central result** (BH
0.285 / 0.287, and the 11 July England QF anticipation FALSIFIED: expected
+£310, realised −£265, `generalises: false`); G13 production integration +
adversarial isolation review; G14 de-Lune multi-tenancy (+ the discovery that
the compute path returned a backtest, not a forecast) and G14b closure verdict;
G15a shortfall diagnostics (weather REFUTED — 11 Jul was 2.1 °C warmer, 0.9 hrs
sunnier, equally dry; Ellel substitution real at −£23.40 DOW-matched, ceiling
4.8% of the error; generation reproduces to the penny); G15b adversarial round 4
(6 findings, 2 confirmed defects, D3/D5 left open); G15c taxonomy drift (DO NOT
WIRE; L3 MASE 0.852 → 1.08–1.16; `top_k` is the binding constraint); G15d
price-regime seam; G16a portable frame-hash baseline (3 hashes identical across
the de-Lune) + G16b four precision corrections. G17: S1 metric integrity (four
denominators collapsed to one with a required `basis`); S2 fold count (6 →
273/260/205 origins; **six folds ranked the served BH model fifth, 273 restored
it to first**); S3 Model Confidence Set (every served model retained in its 90%
set: BH 5/9 p=1.000, TRT 4/9 p=1.000, Ellel 5/9 p=0.575); S4 intermittency
constants + occurrence gate + scale basis by bootstrap + refutation of the
examiner's TRT ETS flip as a harness artefact; S8a agent build, frozen prompt
`c8fa127`, offline evaluator, swept cost-ratio threshold; S5 group ICL
(negative — cross-series learning does not help this estate); S6 weather basis
(no serving optimism; weather marginal; Ellel June gap fixed); S7 interval
calibration ("Major 9" withdrawn — 1.00 was 7 coin flips; BH under-covers at
0.871; FLAG-BAND-HORIZON closed, cap stays 7); S10 injection realism (discount
zero, published 0.996 stands; continuation-alert suppression found instead);
S11 chat-log signal (wired as fifth briefing source `sop`; 4 real gaps on 735
messages). Plus 4 adversarial rounds / 28 defects; frame-hash gate; tests
503 passed / 8 skipped and 510 passed / 1 skipped.

**Implied but NOT run — the gaps.**
1. **S8b — the live-LLM agent run** (~644 calls, temperature 0): agent versus the six constants. Blocked on Ryan's Track B key; chase 2026-08-04. **This is Fatal 2's measurement half.** **S8c**, the offline replay producing calibration and cost curves, is blocked behind it — as is the whole Objective 3 section of `results.tex`.
2. **S9 — manager-label evaluation.** Needs 60–100 adopt-or-dismiss labels from Elliot by 2026-08-14; fallback is self-labelling with intra-rater kappa (trigger 2026-08-11), recovering only 3 of Objective 4's 4 terms.
3. **ECE / reliability diagram / temperature scaling** — promised in the lit review via Guo et al., exists nowhere in the codebase. Cheap, unblocked, and closes weaknesses 10 and 26.
4. **Round 5 adversarial review** — the round-4 fixes (D1 per-venue isolation, D2 equality guard) are unreviewed, on a four-for-four record that every fix round shipped a fresh defect.
5. **RMSSE as headline metric** — the examiner's Fatal-3 remedy, not adopted.
6. **Ellel occurrence gate** — scaffold only (`FLAG-ELLEL-DIARY`); **the booking diary is named the highest-value input available and is one request away.**
7. **Full-precision generation reproducibility** over 7 horizon days × 3 venues — "nobody has run" it; only one venue-day agreement to the penny exists.
8. Deliberately deferred with reasons on file: `top_k` at L3 (needs its own gate and a cost measurement); per-step conformal (measured, would breach gate discipline; now a named research work package); group-plus-covariates ICL (`FLAG-GROUP-EXO`); the tournament-stage hypothesis (n=2 stages); a magnitude-carrying cross-venue term (needs the API to feed forward booking values); the Events arm (203 rows / 2 dates — a stated non-test, not a result); cross-tenant cold start (needs privacy sign-off); the stock signal (blocked on James's keg mapping and supplier lead times); Minor 11, the £403.31 delta.
9. **Manager qualitative feedback** — a stated contract deliverable, not recorded as run anywhere in the docs.
10. Compute-path, Ryan-side (contract open decisions 4–7): transport threshold (JSON vs NDJSON/Arrow); cross-tenant cold start; **who runs the ladder** — `ladder_selection` comes back `[]` on every call and `_should_refit` still reads the research store's watermark, so a tenant's served model is whatever it started as, for ever; L2/L3 on the compute path (compute emits L1 only).
11. Production readiness, none done: mypy/pyright CI gate, pydantic-settings migration, uv lockfile, structured logging, A8 embeddings on shared Voyage/pgvector, the 263 `print()` calls.

**Open flags:** BAND-UNDERCOVERAGE-BH, CONTINUATION-ALERT-SUPPRESSION,
ELLEL-DIARY, GROUP-EXO, TRT-CONSTRUCTED-ZEROS, MASE-RULER, L2-DENOMINATOR,
FIXTURE-ANTICIPATION, CROSS-VENUE-BLIND, MASE-INTERMITTENT, SEGMENT-FALSE-REJECT,
PRIORSTATE-CONTENT-UNBOUNDED, VALIDATOR-WALL-CLOCK, DEAD-CONSTANT,
TAXONOMY-DRIFT. **Closed:** STORE-DURABILITY, ELLEL-JUNE-EXO, BAND-HORIZON,
INJECTION-REALISM-DISCOUNT, STORE-SOR, TRT VAT. **Stale:** METHODOLOGY-OVERLEAF.

**Forbidden to quote:** Ellel MASE 0.096; "England +130%" without the row-21
pointer; pooled Ellel spillover £500.18; the three frame-hash prefixes in reports
33–35; any ruff delta; and — per S1 — **the claim that the July forecast beat
its backtest.**
