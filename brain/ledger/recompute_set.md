# The recompute set — split by arithmetic against a committed artefact, or a run

**2026-08-08.** Owner: Phuong. Scope: R4, R9, R16, R22, R24, R30 from
[`role_audit_synthesis.md`](role_audit_synthesis.md), plus `tab:intermittency`'s missing
dispersion. Each item below names the artefact and shows the working, so the answer can be
checked rather than taken.

Every figure here was read from a committed artefact in this session. Where a number is
inferred rather than read, it says so.

---

## A · Arithmetic on committed artefacts — no run needed

### R9 — settled. The count is 37, not thirty-one

Closed in the previous session against the generator. No further work.

### R16 — confirmed. `tab:winkler`'s A column is per-venue oracle-tuned

`brain/eval/interval_calibration_L1.json`, `venues.*.aci_gamma_sweep`:

| Venue | γ sweep (0.005 / 0.01 / 0.02 / 0.05 / 0.1) | argmin γ | min | printed A | G |
|---|---|---|---|---|---|
| Beer Hall | 1929.5 · 1920.7 · 1902.9 · **1814.3** · 1822.1 | 0.05 | 1814.29 | 1814 | 1836.62 |
| Ellel | **1422.4** · 1438.2 · 1485.3 · 1541.8 · 1687.2 | 0.005 | 1422.45 | 1422 | 1479.63 |
| Two River Taps | **671.2** · 676.5 · 681.5 · 720.3 · 761.3 | 0.005 | 671.24 | 671 | 692.64 |

**Each printed A value IS that venue's own argmin, and each venue picks a different γ.** A beats
G at all three, which is what the A-vs-G contrast is used to conclude — and the contrast exists
precisely to remove the tuning choice that A has been given. Nothing to recompute; the repair is
disclosure. Note the order here is BH/ELL/TRT, matching the synthesis's `0.05/0.005/0.005`.

### R4 — resolved, and neither role's framing was right. The two numbers measure different things

Sources: `brain/log/PRJ93_Agent_Eval_Report.md` line 43, line 100, S2 (line ~104), S6 (line ~241).

The report's own overall triple is **internally consistent**: N = 644, recall 0.807,
precision 0.872, F1 0.839 — and 2·0.807·0.872/(0.807+0.872) = 0.8382, so F1 checks out.

Reconstructing the counts from it:

- TP = 0.807 × 644 = 519.7 → **520**; FN = 644 − 520 = **124** ✓ (the chapter's figure)
- precision 0.872 with TP 520 ⇒ FP = 520/0.872 − 520 = **76.3**

**So the report's own precision implies about 76 false positives on the injection corpus, not 8.**
Line 43 says what the 8 actually is: *"Surfacing rate on un-injected windows (an upper bound on
weekly false-alarms — on real data these may be genuine): 0.667/week (8 items across 3 venues)."*
Line 18 and line 100 both state the rule explicitly — *"real-window background feeds the fatigue
rate, **not the FP count**."*

**The chapter's sentence at `results.tex:857-858` — "8 false alarms against 124 misses on the
644-event corpus" — combines a weekly fatigue upper bound with an injection-corpus miss count and
presents them as one confusion matrix.** The defect did not originate in the chapter: the report's
own S6 cost sweep (lines 241–244) makes the same combination, and the chapter transcribed it
faithfully. Fixing the sentence without fixing S6 leaves the next reader to re-derive this.

**And this settles the 0.871-versus-0.872 discrepancy, which is a rounding boundary on an integer
nobody printed:** TP = 520 with FP = 76 gives 520/596 = 0.8725 → 0.872; with FP = 77 it gives
520/597 = 0.8710 → 0.871. The two figures are one quantity at two roundings of an unstated count.
**The repair is to print the counts, not the ratio** — which is what R4 asked for in the first
place, arrived at from the other end.

*What survives:* misses still exceed false alarms at 124 : 76, so "inverting the failure mode the
literature guards against" holds in direction. It is much less lopsided than 124 : 8, and **the
cost-sweep figures 132 / 256 / 628 / 1248 are computed from the mixed pair and all four change.**

### R22 — two of the four floats are arithmetic, two need a run

The four floats carrying no uncertainty (role audit B15/B16/B25/B26):

| Float | Status | Working |
|---|---|---|
| `tab:exchangeability` | **arithmetic — done below** | a mean-rank test needs only n |
| `tab:weather` | **transcription** | `weather_basis_mcs.json` already carries `mean_delta`, `ci_lo`, `ci_hi` per contrast. The intervals exist and are not printed |
| `tab:vuspr` | **run** — see section B | VUS-PR is not a rate; a per-window bootstrap is needed |
| `tab:intermittency` | **run** — see section B | p and v need dispersion from a resampled daily series |

**`tab:exchangeability`, computed here.** Under exchangeability the rank is Uniform(0,1), so the
mean has SE = 1/√(12n). From `exchangeability_diagnostic.json`:

| Venue | n | mean rank | SE | z |
|---|---|---|---|---|
| Beer Hall | 1750 | 0.5544 | 0.00690 | **+7.89** |
| Ellel | 1659 | 0.5538 | 0.00709 | **+7.59** |
| Two River Taps | 1274 | 0.4574 | 0.00809 | **−5.27** |

The verdict does not rest on "0.554 against 0.500 with no test" once the test is written down: all
three reject decisively, and **Two River Taps rejects in the opposite direction**, which is the
estate acting as its own control exactly as the diagnostic's docstring claims it should.

**Watch the collision:** Beer Hall is 0.5544 and Ellel is 0.5538, and *both* round to 0.554. Any
prose quoting "0.554" is ambiguous between two venues. This is the value-match rule in
`PRJ93_RULES.md` firing on the document's own numbers.

**The 90 % / 95 % level mix.** `tab:coverage` is the only float carrying a 95 % interval
(Clopper–Pearson); every bootstrap contrast and the MCS run at 90 %. Restating `tab:coverage` at
90 % is arithmetic from the (n, k) pairs already in the table. Whether to restate or to disclose
is an editorial call, not a computation.

### R24 — arithmetic, and the assumption is already falsified by a committed number

The 6.2 pairing factor's defence assumes the dependence correction cancels in the ratio of the
differential to the marginal series, which needs both to carry the same serial dependence.
Lag-1 on the differential is **0.811** and **no ACF exists for either marginal** (role audit A3).
The cancellation therefore cannot be checked, let alone asserted. Computing the two marginal ACFs
is arithmetic on the fold vectors (`brain/eval/fold_vectors_L1_*.json`); until they exist the
claim is unsupported rather than wrong.

**STATUS 2026-08-09: DONE. The assumption FAILS, and adversely at Ellel.** Full working in
[`r24_marginal_acf.md`](r24_marginal_acf.md); artefact `brain/eval/marginal_acf_L1.json`;
instrument `brain/eval/marginal_acf.py`. Marginal lag-1 ACFs are **0.873** (`chronos_bolt`) and
**0.868** (`robust_dow`) against the differential's 0.811, so the three series differ at lag 1 —
but the decision is not made at lag 1. The marginals cross to **negative** by the seventh or eighth
fold while the differential is still at **0.241** at lag 10, so the Bartlett variance inflation is
larger on the **differential** (9.74 against 7.11 and 6.19) and the corrected ratio **falls** to
**5.82** at the pre-registered `BLOCK_LEN = 7` and **2.53** at 21, against 6.205 uncorrected. The
sign **reverses** at the other two venues. The 6.2 becomes an uncorrected upper bound on the
pairing gain; the sentence is reworded rather than renumbered.

**The prediction recorded before the run got the level right and the direction wrong**, which is
the part worth carrying: both marginal lag-1 values landed inside the predicted 0.85–0.93 interval
and above 0.811 as predicted, and the predicted *consequence* (correction larger on the marginals,
so the ratio rises) was backwards. **A variance inflation is a sum over lags, so it is settled by
decay, not by level.** Anchoring on lag 1 is what produced the wrong sign.

**Superseded status line, kept per the corrections-are-appended rule — 2026-08-08: APPROVED and NOT DONE. It is the first item of the next session, by Phuong's
instruction, and the reason is worth keeping.** It was the last approved item in a long batch and
was stopped rather than rushed — *"right to stop rather than rush it"*. Everything it needs is
committed: the fold vectors, and the 0.811 it is compared against. Nothing blocks it and nothing
depends on it, which is exactly what makes it easy to defer twice. **The section it edits (6.2's
pairing defence) was not touched by the C3 reordering**, so the hold that batched it with the
4.4 items has expired.

Related, and worth stating because it looks like a defect and is not: **`tab:group`'s caption
`B = 10{,}000` is CORRECT.** `weather_basis_mcs.json` carries `n_boot = 10000` for the paired CI,
while the MCS uses `mcs.N_BOOT = 1000`. That is the exact distinction the `bootstrap_b_note` added
in the last session records. R2 applies to the MCS sentence only.

---

## B · Needs a run

### R30 — Ellel's traded-only served-band coverage. **A run, and here is why the shortcut fails**

**The near-miss, recorded because it is convincing and wrong.** `exchangeability_diagnostic.json`
carries `rank_uniformity.active_only` at every venue, which reads exactly like traded-only
coverage:

| Venue | all banded | "active only" | implied non-active |
|---|---|---|---|
| Beer Hall | 1750 → 0.8703 | 1250 → 0.8832 | 500 → 0.838 |
| Ellel | 1659 → 0.9126 | 1185 → **0.9241** | 474 → 0.884 |
| Two River Taps | 1274 → 0.9615 | 910 → 0.9604 | 364 → 0.964 |

Read naively this **falsifies Role A**: restricting Ellel to "active" days moves coverage *up*, not
down. It does not, because `active` is not traded. `exchangeability_diagnostic.py:141` is
`active = a[st == 0]` — Mondrian state 0, meaning **calendar-open** — and line 249 of the same file
splits `traded = active[active["y"] > 0]` from `false_open = active[active["y"] <= 0]` *inside* it.
The 1185 "active" pairs at Ellel are the calendar-open ones and **still contain all 1037 false-open
days**. The 474 excluded are calendar-*closed*.

**So R30 is confirmed not derivable, and now with the specific reason: every committed split is by
calendar state, never by traded.** The one artefact that does split on traded — the drift
decomposition — reports residual means and Spearman ρ, not coverage indicators.

**The bound from committed numbers is uninformative.** Ellel's calendar-open pairs are ~79.8 %
false-open (`false_open_rate = 0.7977`), so of the 1185 pairs roughly 945 are false-open and 240
traded, against 90 total misses. If every miss fell on a false-open day, traded coverage is 1.000;
if every miss fell on a traded day, it is 0.625. **[0.625, 1.000] settles nothing.**

**The direction, however, is now evidenced, and it favours Role A.** From
`exchangeability_scores.csv` (the per-observation frame, already persisted), Ellel's calendar-open
rows split:

| | n | mean abs residual | median | p90 |
|---|---|---|---|---|
| traded | 263 | **516.3** | 213.4 | 1582.2 |
| false-open | 1037 | **95.2** | 0.0 | 410.0 |

against a served-band half-width of about **257** (arm D `mean_width` 575.0 ÷ 2). Scored against a
*constant* half-width — an illustration, not a measurement, because the real band is an expanding
Mondrian quantile that moves at every origin — the same split gives Ellel traded 0.555 against
false-open 0.852. The other two venues, where false-open days are 1.5 % and 0.7 % of the frame,
show no such gap.

**Verdict on D3, which can be reached now.** Role B's certification of `tab:coverage` as the one
float that passes cannot survive: a row whose value is set by 1037 non-trading days is not
interpretable as a coverage claim about the venue, whatever its arithmetic reproduces. Role A is
right about the *defect*. The *number* still needs R30, so **the synthesis's consequence stands
unchanged — repair R29 as a withdrawal of the claim, not a reversal of it.**

**Cost.** Small and bounded. Add a `y > 0` split to `rank_uniformity` in
`exchangeability_diagnostic.py`, which already has both `y` and `state` in the frame it builds,
then rerun `.venv-forecast/bin/python -m eval.exchangeability_diagnostic`. No band is re-fitted
and no model is re-trained beyond the same per-origin ETS the script already fits; the sibling
calibration study logs `wall_clock_s = 29.2`. **Expect single-digit minutes including the edit.**
Preconditions: `.venv-forecast`, and the store at ceiling `2026-07-07`.

### `tab:intermittency` — dispersion on p and v. A run, and the cheapest of the three

The Beer Hall reclassification turns on **1.3267 against the 4/3 = 1.3333 boundary — a gap of
0.0067 with no dispersion anywhere on the table**. Both Beer Hall rows sit on the same side of the
same knife edge, and the chapter already calls the reclassification "a boundary effect", which is
an uncertainty claim made without an uncertainty.

**Cost.** A moving-block bootstrap over the daily series, block length 7 to match the rest of the
project, B = 1000, over 3 venues × 2 demand-day definitions = 6 cells, recomputing p and v per
resample. Seconds of compute; the work is ~20 lines of resampler around the existing
`intermittency_diagnostic.py` and one decision on block length. **The deliverable is whether the
Beer Hall interval on p crosses 4/3** — if it does, the reclassification is a coin flip and the
sentence has to say so.

### `tab:vuspr` uncertainty — a run, and the heaviest

Seven cells, three of them resting on 36 windows, no interval on any. VUS-PR is not a rate, so
there is no closed form; it needs a bootstrap over the window grid through TSB-AD. **This is also
what settles D2** — Role C's "too weak" reading and Role B's "a ranking of point estimates" cannot
both stand once the cells carry intervals. Cost is dominated by TSB-AD re-scoring rather than by
the resampling, so estimate it from `log/60`'s wall clock before committing to a B.

---

## Sequencing, if it helps

R4 first: it is arithmetic, it is load-bearing for the chapter's headline detection claim, and it
turns out to fix the 0.871/0.872 discrepancy as a side effect. Then R30, because it gates D3 and
D3 gates R29's wording. `tab:intermittency` is cheap enough to run alongside either.

---

# RESULTS — 2026-08-08, same session

## R4 — closed. The artefact was fixed first, then the prose

`agent_eval.py` fixed at four points (`_cell` returns the counts; S2 prints them; `cost_curve`
takes both terms from the corpus; VUS-PR per-injection values persisted), then
`.venv-eval/bin/python -m eval.agent_eval --scaled` regenerated in **104 s**.

**The integers were predicted before the run and matched exactly.** From the committed
`precision = 0.8724489795918368 = 171/196` plus the per-venue cells — each an exact rational,
each yielding a minimal integer pair, all three summing consistently — the prediction was
**A = 588 surfaced attributable items, S = 75 spurious**. The regenerated run returns 588 and 75.
Cross-checked on the by-kind partition too (108 + 292 + 168 + 20 = 588; 18 + 36 + 21 + 0 = 75).

**Three populations, and they were being read as one:**

| Population | Size | Failures |
|---|---|---|
| injections | 644 | **124 missed** (recall 0.807) |
| surfaced attributable items | 588 | **75 spurious** (precision 0.872) |
| un-injected windows | 3 venues | 8 items, 0.667/week — a fatigue bound, not an FP count |

Cost sweep, both terms now from the corpus: **199 / 323 / 695 / 1315** (was 132 / 256 / 628 / 1248).
Misses dominate throughout; the two failures weigh equally near **0.6:1**, so false alarms would
dominate only if a miss were worth under three-fifths of a false alarm.

Prose repaired at `abstract.tex`, `results.tex` sec:res-costsweep (both paragraphs), and
`discussion.tex:112`. The abstract's detector sentence was **rewritten, not renumbered** — 124:8
reads as an inversion, 124:75 is a lean.

## `tab:intermittency` — the Beer Hall reclassification is not separable

New tool `brain/eval/intermittency_intervals.py` (self-test passes: exact on two hand-derived
series, orders an irregular interval above a periodic one, refuses an interval on a degenerate
series, reproduces under seed). Moving-block, length 7, B = 10,000, seed 93. **5.6 s.**

| Venue | Demand day | $p$ | 90 % interval | Crosses 4/3? |
|---|---|---|---|---|
| Beer Hall | revenue | 1.3267 | [1.296, 1.368] | **yes** |
| Beer Hall | till activity | 1.3223 | [1.290, 1.363] | **yes** |
| Two River Taps | either | 1.1828 | [1.138, 1.231] | no |
| Ellel | revenue | 5.9231 | [5.041, 7.076] | no |

Both Beer Hall intervals span **1.32 and 4/3 alike**, so the venue is not separable from either
verdict under either constant set. The table and the prose now say so. Nothing downstream moves:
the adoption test refuses the intermittent estimator on its own evidence regardless.

## R30 — settled, and it reaches past Ellel

`rank_uniformity` now splits state 0 by `y > 0`. **54 s.** The rank proxy reproduces the served
band to within 0.002 at all three venues, so the splits are trustworthy.

| Venue | limb | n | coverage | z vs 0.90 |
|---|---|---|---|---|
| Beer Hall | all banded | 1750 | 0.8703 | −3.70 |
| | **traded** | 1229 | **0.8918** | **−0.93** |
| | false-open | 21 | 0.3810 | −4.90 |
| Ellel | all banded | 1659 | 0.9126 | +1.82 |
| | **traded** | 240 | **0.6917** | **−6.99** |
| | false-open | 945 | 0.9831 | +19.79 |
| Two River Taps | all banded | 1274 | 0.9615 | +11.42 |
| | **traded** | 903 | **0.9635** | **+10.16** |

**D3 is settled and Role A was right.** Ellel's `tab:coverage` row is a weighted average of 0.983
on 945 non-trading days and **0.692 on the 240 days the venue traded**. "Indistinguishable from
nominal" is a composition artefact. Role B's certification of the float does not survive.
Predicted 0.6–0.75 before the run from the residual/half-width comparison; observed 0.692.

**AND A SECOND FINDING, OUTSIDE R30's SCOPE AND ABOVE MY AUTHORITY TO ACT ON.** The Beer Hall's
under-coverage is *also* composition. On traded days it covers **0.8918, z = −0.93 — not
distinguishable from nominal.** The 0.871 headline is pulled down by 21 false-open days at 0.381
and by calendar-closed days at about 0.838.

**This reorders C3.** The chapter's strongest result is "the interval under-covers at the Beer
Hall, and the exchangeability violation responsible reproduces the measured coverage at all
three". On the days each venue actually trades, the picture is: **Beer Hall at nominal, Ellel
badly under-covering, Two River Taps badly over-covering.** The claim that the band is
miscalibrated survives intact and arguably strengthens — but **the venue that fails is Ellel, not
the Beer Hall**, and section 4.4, C3, the abstract's calibration sentence and 5.x all name the
Beer Hall.

**Not actioned. This is a headline reordering, not a repair.** The R16 disclosure, the
`tab:exchangeability` three-decimal fix and the `tab:weather` interval transcription are all
held with it, because they edit text that this ruling may rewrite.

## `tab:vuspr` — the gate is moot, the cost is now zero

Estimate requested: `log/60` records the whole scaled run, VUS-PR included, at **75 s** — it was
never the heavy item. It no longer needs a run at all: the regeneration above **persists the
per-injection VUS-PR values** (`agent_eval.json`, `vus_pr.by_cell[*].values`), so the interval is
a percentile bootstrap over stored numbers. Proposed **B = 10,000**, matching the paired-CI
convention. Cells run n = 36 to 144. One caveat to carry into the caption: injections sharing a
fold are not independent, so the interval is mildly optimistic.
