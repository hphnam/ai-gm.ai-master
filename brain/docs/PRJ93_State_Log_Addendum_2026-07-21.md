# PRJ93 Master State Log: addendum for 2026-07-20 to 2026-07-21

**Supersedes nothing. Merge into `PRJ93_Master_State_Log.md`.** The 2026-07-20 edition at tip
`d40dea7` remains correct for everything it covers. This addendum records the four days of
remediation work that followed and the external-assessment activity around it.

**Tip at time of writing:** `8525395` on `brain-construction`, pushed. Working tree clean.
**Store:** ceiling 2026-07-07, 25 June days, 7 July W1 days, 0 held-out rows. 8 to 14 July still absent.
**Suites:** `.venv` 474 passed 8 skipped. `.venv-forecast` 481 passed 1 skipped. Both now run in
parallel without colliding on the store.

---

## 1. Commits since `d40dea7`

| Commit | Package | Content |
|---|---|---|
| `0b302ec` | S1 | Report 42. One scale ruler, the July headline restated |
| `fccf017` | S1 follow-ups | RMSSE on both readings, two corrections |
| `91f4a9c` | S2 | Report 43. Fold count 6 to 273 / 260 / 205, served winners tested |
| `34a1779` | S2 follow-ups | Ellel decision rule pre-registered, frame-span off-by-one corrected |
| `8525395` | S3 | Report 44. Model confidence set, environment pinning, store durability |

---

## 2. The metric ruler, and the two-coordinate finding

The seasonal-naive denominator existed in **four** implementations, three of them private to `sim/`
scripts reading the trading-days-only `l1_daily` view. `eval.harness.seasonal_naive_scale` is now the
only one, with a required `basis` argument taking `calendar_lag7`, `trading_lag7`,
`trading_same_weekday` or `calendar_lag7_active`. No default; an unrecognised value raises.

**The published July W1 figure of 0.386 reproduced at 0.385 on `trading_lag7`.** That confirms the
diagnosis by reproduction rather than inference. On the backtest's own basis the same forecast scores
**0.772** against a backtest of 0.745, so it came in slightly worse than its backtest class. The claim
that it beat the backtest does not survive on any consistent ruler.

**A scaled metric needs two coordinates, not one: a stated basis and a stated `as_of`.** The in-sample
denominator grows with the store, so the original June-versus-July comparison was confounded on both
axes. `venue_ruler(as_of=)` reconstructs the committed June figures exactly. Two River Taps, closed
since 2026-05-08, is a frozen natural control that reproduces identically at any ceiling; it now
isolates store growth from code change as a standing technique.

Structural zeros deflate the calendar basis: 78 of 392 lag-7 differences are exactly zero at Beer
Hall, 284 of 385 at Ellel. RMSSE is now emitted on two readings, Winkler and mean width on every
confrontation.

---

## 3. Fold count, and the demonstration that six folds misled

`rolling_origin` gained `step_days`. With it `None`, behaviour is byte-identical to before, proven
three ways: twelve-configuration structural equivalence against a verbatim copy of the old function,
Two River Taps exact at the live ceiling, and every deterministic rung exact at the seed ceiling.

At `h = 7` the Harvey-Leybourne-Newbold factor is **algebraically zero at n = 6**, so the served-model
selection never had a significance test, weak or otherwise. Origins now 273 / 260 / 205 with factors
0.976 / 0.975 / 0.968.

**Beer Hall is the demonstration.** At the current ceiling the 42-day six-fold window selects
`rung1_robust_dow` and ranks the served `rung4_chronos2_exo` fifth. At 273 origins `chronos2_exo`
returns to first. The small sample gave the wrong answer and the large sample recovered the served
one. This belongs in the Discussion.

**Ellel frame is 386 rows, not 392.** `trim_to_active` discards six leading rows: the 2025-06-08
sale-and-reversal mis-ring plus five dead days, first active 2025-06-14. Origins 260.

---

## 4. Model confidence set: every served model is retained

Pre-registered before running (row 33): loss MASE primary and RMSSE secondary, statistic `T_R`,
elimination `e_R`, moving-block bootstrap at l = 7 with sensitivity across {2, 7, 14, 21}, B = 1000
with a 5000 stability check, alpha 0.10 primary and 0.25 secondary. Not 0.05.

| venue | served | in its 90 percent set | set size | MCS p |
|---|---|---|---|---|
| Beer Hall | `rung4_chronos2_exo` | yes | 5 of 9 | 1.000 |
| Two River Taps | `rung2_ets` | yes | 4 of 9 | 1.000 |
| Ellel | `rung1_robust_dow` | yes | 5 of 9 at 246 folds, 3 of 9 at 260 | 0.575 |

**The pre-registered Ellel rule (row 32) resolved cleanly.** The set contains `robust_dow` in both
alignments and under RMSSE, so it stays served, no confrontation is re-scored, and the S2 argmin flip
to `chronos_bolt` (gap 0.008, 0.18 se) is confirmed as noise.

**Paired variance is why the test discriminates.** Marginal standard errors near 0.029 made 0.036 gaps
look untestable; the paired-to-independent ratio is 0.16 to 0.27 at Beer Hall, implying a paired
standard error near 0.007 to 0.011. Differential autocorrelation decays to about zero by lag 7.

The wide sets are the finding. The data separates the clearly worse rungs and cannot separate the
foundation models from the served incumbents.

---

## 5. Flags

| Flag | Status |
|---|---|
| `FLAG-MASE-RULER` | Opened S1. The published July figure was on `trading_lag7`. |
| `FLAG-L2-DENOMINATOR` | Opened S1, deferred to S4. `cadence_sweep.py:87` computes a per-category denominator inline on an undocumented basis. |
| `FLAG-STORE-DURABILITY` | **Closed S3.** Guard, `BRAIN_DUCKDB_PATH` suite isolation, `store.build` entrypoint, `store_ceiling` stamped on artefacts. Proven by mtime and by two concurrent full suites leaving the store intact. |
| `FLAG-ELLEL-JUNE-EXO` | Opened S3. **Upstream data gap, not a join defect.** Nine-day weather hole 2026-06-21 to 06-29 for Ellel across all three bases; Beer Hall has those days through the identical join. Nine days plus a six-day lookback, truncated by the frame end, gives exactly the fourteen missing folds. Fetch-layer repair is S6's. |
| TRT VAT basis | **Closed on internal evidence.** 80 items sold at both venues, median TRT price equals Beer Hall gross at a ratio of 1.0000 against 1.2000 for the rival hypothesis. TRT books zero tax on all 33,993 rows. `vat_deflator` is correct. Modelling target remains `revenue_exvat`. |

**Correction to decision 13.** "VAT removed from the brain entirely" is true of the **compute path
only**. `config.py:148-152` retains `VAT_RATE`, `VAT_INCLUSIVE_VENUES` and `vat_deflator`;
`ingest/normalise.py:160` calls it on the research path. The item was not moot.

---

## 6. Environment and reproducibility

Per-venv lockfiles with full `==` pins, exact torch pin, Chronos revision pin. The shared
`requirements.txt` could not take `==` without breaking `.venv-eval` under its documented
`numpy<2.0` constraint, so per-venv lockfiles were substituted as the stronger mechanism.

**Recorded resolution under which the committed six-fold tables reproduce to the digit:**
`statsmodels 0.14.6`, `scikit-learn 1.9.0`, `pandas 3.0.3`, `numpy 2.5.1`.

Open: an external rerun on the same `statsmodels` version produced Two River Taps ETS 0.617 against
the committed 0.597, which would flip the served model. Both cannot be right. S4 Part 5 settles it by
bumping two libraries in a throwaway environment.

---

## 7. Literature and the Related Work chapter

Notebook at 106 sources. `ref.bib` refreshed from 79 to 108 entries through Overleaf's Zotero
integration.

**Never re-export `ref.bib` from Better BibTeX.** The project uses a full-library import whose keys
come from Zotero's web API; a desktop export produces a different key format and would break roughly
sixty citations at once. Use the Refresh button.

**Standing hazard:** a refresh can silently repoint an existing key. Adding Angelopoulos and Bates
moved `angelopoulos_conformal_2023` to the Gentle Introduction and pushed Conformal PID Control to
`angelopoulos_conformal_2023-1`. The chapter cited the former for PID control, **compiled cleanly, and
raised no warning.** After every refresh, check any key whose stem matches a newly added work.

Chapter edits pushed to `chapters/literature_review.tex` in two commits: the CPTC guarantee stated
correctly with the observed-versus-inferred-regime consequence drawn; the synthesis repositioned
against PRISM by name with the contribution restated as field instantiation; CUSUM added and grounded
in Page (1954) with its average run length linked forward to the evaluation chapter; Chronos-2 given
its own paragraph; a metric paragraph added; reconciliation and adaptive conformal given their costs.
75 cite keys, 108 entries, zero undefined citations.

---

## 8. Open dependencies

| Item | Owner | Blocks | Date |
|---|---|---|---|
| Ellel booking diary | Elliot | Occurrence gate at Ellel | Asked 2026-07-21 |
| 60 to 100 adopt-or-dismiss labels | Elliot | Agent evaluation, Objective 4 | Needed by 2026-08-14 |
| Cost ratio, 20 minutes | Elliot | Threshold selection | Decoupled via swept grid |
| Keg mapping and lead times | James | Stock signal | Excel form sent 2026-07-21 |
| Escalate to Ryan | Nam | Label fallback | 2026-08-04 |
| Self-label with intra-rater kappa | Nam | Label fallback | 2026-08-11 |

---

## 9. Largest open risk

**There is no methodology chapter and no results chapter.** Overleaf holds `introduction`,
`literature_review` and `conclusion`. On a 17,300-word body the two missing chapters are typically 40
to 50 percent, so roughly 7,000 to 8,000 words do not exist, against a build window closing
2026-08-21.

Mitigation, now a standing deliverable in every remaining package: forty-five minutes at the end of
each package converting that package's report into `chapters/methodology.tex` while it is fresh.
Reports 42, 43 and 44 are already most of three subsections.

---

## 10. Next actions

1. Run S4: intermittency constants, scale basis bootstrap, L2 denominator, occurrence gate, flip test.
2. Then S8, promoted ahead of S5 to S7 because it addresses a Fatal and its build half needs nothing
   from Elliot. Build the agent with a **swept** cost ratio, as PRISM does; Elliot's number selects a
   point on that curve later.
3. Then S5 group in-context learning, S6 lead-matched weather, S7 four-way conformal.
4. S9 when labels arrive, or the self-label fallback from 2026-08-11.

---

## 11. SCOPE CONSTRAINT on S8 (recorded 2026-07-21)

**S8 needs live Anthropic calls. Nam's scope is the Track A brain and does not include running the
live-LLM path. Nam must not substitute a personal API key.** The served LLM integration is Ryan's
Track B. S8 therefore splits:

- **S8a (Nam, offline):** build `signals/agent.py`, freeze `signals/prompts/agent_v1.md` by commit
  order, build the offline evaluator, cost sweep, calibration, and agent-versus-constants comparison,
  all runnable on a cached or mocked response set. Ship a synthetic fixture cache so the harness is
  testable end to end with zero live calls. This is most of the work.
- **S8b (Ryan, live):** run the frozen agent over the 644-item corpus against the Track B key once,
  temperature 0, return the committed cache.
- **S8c (Nam, offline):** replay the cache, produce calibration and cost curves.

Pre-registration survives: the prompt is frozen before Ryan runs anything, and Ryan running it is
stronger evidence of a frozen prompt than Nam running it.

**Dependency register gains a row:** Ryan runs S8b. It sits on the S9 critical path. Chase on
2026-08-04 alongside the label escalation.


---

## 12. S8a complete, S8b pending Ryan (2026-07-23)

Commit `64e6fc4` (apparatus), `c8fa127` (frozen prompt), both pushed. Suites `.venv` 503 passed 8
skipped, `.venv-forecast` 510 passed 1 skipped. Store at 2026-07-07.

`c8fa127` is a proven git ancestor of `64e6fc4` and contains only the prompt, agent and config, so
pre-registration is established by commit order. `signals/agent.py` never fabricates a probability
(injected `execute` closure, lazy SDK import, cache miss on no key). Offline evaluator has no
live-call path. `CALIBRATION_KIND = "detection"` pinned. Code review caught and fixed a bin-floor bug
that would have fired on the temperature-0 corpus.

**S8b, reserved for Ryan against the Track B key, one command:**
`ANTHROPIC_API_KEY=... python -m eval.agent_calibration --build`. Roughly 644 calls, temperature 0,
writes and commits the response cache. Then `python -m eval.agent_calibration` replays offline.

S8b is the empirical headline (agent versus the six constants) and sits on the S9 critical path.
Chase Ryan on 2026-08-04 with the label escalation.

**Manual step outstanding:** move `chapters/methodology.tex` to Overleaf and delete the repo copy.
S8a wrote the fold-count argument and the Beer Hall demonstration into it but could not confirm the
canonical Overleaf copy, so did not delete.

---

## 13. Packages S5 to S11 complete (2026-07-23)

All self-contained build work is done, verified against the remote, and pushed. Remaining work
(S8b, S8c, S9) is external and recorded in sections 11 and 12 and in the dependency table.

| pkg | commit | one-line result |
|---|---|---|
| S5 group ICL | `5b95641` | Cross-series learning does not help this estate. Negative result, trustworthy. No served model changes. |
| S6 weather | `070f249` | No serving optimism in the exo path; weather marginal; observed no better than horizon-matched. Ellel gap fixed. |
| S7 intervals | `64d6b9f` | Major 9 withdrawn (1.00 on 7 points); Beer Hall under-covers at 0.871; no band method adopted. |
| S10 injection | `64980d0` | Recall/latency discount is zero; continuation-alert suppression found instead. |
| S11 chat-log | `dbcc525` | Chat-log gap signal wired; 4 real gaps on 735 messages; second learning domain live. |

**Resolved, do not re-run.** These questions are settled with numbers and should not be reopened:
- The scale basis is decided per venue (S4): `calendar_lag7_active` at Beer Hall and Two River Taps, no
  scaled basis at Ellel, which uses unscaled and Winkler.
- Cross-series grouping is measured and does not help (S5). The library fact that the batch is the
  cross-learning group under `cross_learning=True` is now known and guarded.
- Weather is marginal and carries no serving optimism (S6). Hindcast and horizon-matched inseparable at
  Beer Hall.
- The 1.00 coverage was seven coin flips, not miscalibration (S7). Beer Hall does under-cover,
  held in `FLAG-BAND-UNDERCOVERAGE-BH`.
- The injection recall discount is zero (S10). The published 0.996 and the latencies stand as accurate.
- The Two River Taps library flip was an examiner harness artefact, not a real instability (S4 Part 5).

**Flags after S11.**
- Closed: `FLAG-STORE-DURABILITY` (S3), `FLAG-ELLEL-JUNE-EXO` (S6), `FLAG-BAND-HORIZON` (S7),
  `FLAG-INJECTION-REALISM-DISCOUNT` (S10), `FLAG-L2-DENOMINATOR` re-scoped (S4).
- Open: `FLAG-BAND-UNDERCOVERAGE-BH` (served-band review, S7), `FLAG-CONTINUATION-ALERT-SUPPRESSION`
  (S10), `FLAG-ELLEL-DIARY` (S4, blocked on Elliot), `FLAG-GROUP-EXO` (S5, group-plus-covariates not run),
  `FLAG-TRT-CONSTRUCTED-ZEROS` (S5), `FLAG-METHODOLOGY-OVERLEAF` (the repo/Overleaf chapter split).

## 14. The writing is now the binding constraint

Build work that is Nam's is finished. The dissertation body is the critical path, with the window
closing 2026-08-21.

**`chapters/methodology.tex`** (partial): has the metric ruler, fold count, MCS, and scale-basis
sections. Still needs the intermittency constants, the occurrence-gate spec, and the group-ICL and
weather methods.

**`chapters/results.tex`** (created S7, four studies in): group ICL, weather, interval calibration,
injection realism. Still needs the fold-count and MCS served-model results and the intermittency and
occurrence results, plus the Objective 3 agent section once S8b/S8c land.

**Discussion chapter** (does not exist, highest priority): anchor on the recurring theme of small-sample
claims failing at power (six-fold selection, the examiner library flip, the half-width growth), the
measure-before-building principle, an honest account of where the brain adds value and where it is
decoration, and the self-silencing detection loop as an operational finding.

**Ablations as first-class results:** U/G2/G3, N/O/H/F/M, P/D/S/A/G, control-versus-realistic. Each
pre-registered, each with a discriminating guard, three of four returning negative or corrective results.

## 15. Next actions

1. **Write.** Methodology and results are largely assembled from reports 42 to 51; the discussion is not
   started. This is the only work that moves the submission now.
2. **Chase on 2026-08-04:** Ryan for S8b (the agent live run) and Elliot for the labels, together.
3. **Trigger on 2026-08-11:** the self-label fallback if Elliot's labels have not arrived, recovering
   three of Objective 4's four terms via intra-rater kappa.
4. **Manual:** move `chapters/methodology.tex` to Overleaf and delete the repo copy, closing
   `FLAG-METHODOLOGY-OVERLEAF`.
5. **Optional if time:** Minor 11, the 403.31 pound reconciliation delta, the only self-contained finding
   still open.
