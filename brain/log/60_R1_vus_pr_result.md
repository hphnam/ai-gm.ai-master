# R1 result — VUS-PR detector supplement

Run 2026-08-05. Authorised at the literature-conformance gate. Closes **D-F2** and
weakness **W25**. Ruleset `brain/PRJ93_RULES.md`.

## Provenance

| Field | Value |
|---|---|
| Command | `.venv-eval/bin/python -m eval.agent_eval --scaled` |
| Venv | `.venv-eval` — Python 3.12.13, numpy 1.26.4, pandas 2.3.3 |
| Metric library | **TSB-AD 1.5** (pinned; the metric is never reimplemented here) |
| Store ceiling | 2026-07-07 |
| Wall clock | **75 s** (23:12:00Z → 23:13:15Z) |
| Code change | **none** |

## Why this could run at all

Report 11 recorded VUS-PR as *"not computed, dependency unavailable"*, and that entry
is why W25 stayed open. The dependency is present: `.venv-eval` imports both `vus` and
`TSB_AD`. `.venv-run` and `.venv-forecast` import neither, which is why the blocker kept
reading as real. Nothing needed installing.

## Reproducibility control

Overall scaled recall came back **0.807**, against report 50's independently recorded
0.807 (*"overall recall 0.807 (vs committed 0.803)"*, `log/50:135`). The corpus is
N=644, deterministic, no seed. The run reproduces the committed instrument before adding
anything to it.

Note for anyone reading the headline: **0.996 is the regime_shift recall (N=252)**, not
an overall figure. Overall recall is 0.807 and always has been.

## Result — VUS-PR by (kind, venue)

`stock_drawdown` is excluded: it has no z signature. 624 windows across 7 cells.

| kind / venue | VUS-PR | N windows |
|---|---|---|
| exo_coincident / two_river_taps | 0.996 | 36 |
| regime_shift / two_river_taps | 0.972 | 108 |
| regime_shift / beer_hall | 0.934 | 144 |
| exo_coincident / beer_hall | 0.932 | 48 |
| spike / two_river_taps | 0.912 | 108 |
| spike / beer_hall | 0.760 | 144 |
| spike / ellel | 0.704 | 36 |

## What it says

The detector separates cleanly on **sustained** structure and poorly on **point** events.
Regime shift and exogenous coincidence sit at 0.93–1.00; spikes sit at 0.70–0.91 and are
the weak class at every venue. That ordering is corroborated independently inside the same
run by the near-threshold sensitivity cells, where magnitude-1 spikes are caught at 0.375
(BH), 0.500 (Ellel) and 0.333 (TRT) against 0.958–1.000 for regime shifts.

This is the metric the review committed to. `liu_elephant_2024` verbatim: *"VUS-PR emerges
as the most robust (less sensitive to lags), accurate (unbiased and effective across
different scenarios), and fair (consistent under similar cases) evaluation measure."* It is
lag-tolerant, which matters here because the detector's own persistence gate delays an
alarm by construction, and point-wise F1 would charge that delay as error.

## Consequence for the write-up

The Results chapter can stop leading on a recall figure. `lu_proactive_2024` establishes
that the dominant failure mode of proactive agents is over-offering, which disqualifies a
recall-led headline (conformance row R42 / **D-F8**). VUS-PR is now available as the
headline detection statistic, per cell, with the spike weakness stated rather than
averaged away.

## Defect found in passing, not repaired

`REPORT_MD` resolves to `config.REPORT_ROOT.parent / "PRJ93_Agent_Eval_Report.md"` — the
**repository root**. The canonical copy of that report has been moved to
`brain/log/PRJ93_Agent_Eval_Report.md`, and the generator does not know. Running it
recreates a stray file at the repo root, which is what happened here. Same class as the
artefact-path defect report 58 found in the test suite. Recorded, not fixed: changing an
artefact path is not in this gate's authorisation.
