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
