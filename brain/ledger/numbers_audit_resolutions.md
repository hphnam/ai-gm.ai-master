# Numerical-audit resolutions

Companion to `numbers_audit.md`. Resolves the 2 STALE, 17 MISMATCH and 9
UNTRACEABLE findings. Date 2026-07-31.

**What changed the picture.** The first pass searched `brain/log/*.md` and the
code. It missed a **second result corpus**: ~30 per-script markdown artefacts
sitting next to the code they were produced by — `eval/group_icl.md`,
`eval/interval_calibration.md`, `eval/weather_basis.md`,
`eval/intermittency_L1.md`, `models/ladder_results_L1_*.md`,
`signals/chatlog_kb_gap.md`, `conformal/conformal_L1_*.md`, and the JSON beside
them. Several claims graded UNTRACEABLE against `log/` resolve exactly against
these. **The `log/NN_*.md` reports are narrative syntheses; the per-script `.md`
and `.json` files are the primary artefacts, and they win on disagreement.**

Add this corpus to the spec's *repo result-file trace* definition, which
currently names only `brain/log/*result*.md` — a glob that matches nothing.

---

## 1. Resolved in the chapter's favour — the audit was wrong

### 1.1 "The remaining eight fall in a band from zero to 0.18 density" — CORRECT

Graded MISMATCH on report 51's prose ("the non-gap clusters include *several*
with a low-but-nonzero failure rate (0.0-0.18)"). The primary artefact
`signals/chatlog_kb_gap.md:17-28` has the full twelve-cluster table. Clusters
5–12 are exactly eight, with densities **0.18, 0.15, 0.143, 0.143, 0.111, 0.0,
0.0, 0.0**. The chapter is precisely right and is the *more* accurate of the two;
report 51's "several" is the vaguer statement.

**Verdict: MATCHES. No change.** This is the clearest demonstration that the
per-script artefacts, not the narrative reports, are the ground truth.

### 1.2 "Every venue at L1 selects the approximation" — CORRECT, and it exposed a code bug

See §4. The chapter states the published rule correctly; the repo had it
backwards.

---

## 2. Resolved with an exact replacement value

| # | Claim as written | Correct value | Primary source |
|---|---|---|---|
| 1 | Two River Taps 5.90 trading days/week | **5.92** | `log/42:66` |
| 2 | `rung3_global_gbm` at Two River Taps = `n/a` | **0.728**, 6 folds | `models/ladder_results_L1_two_river_taps.md:16` |
| 3 | Ellel MCS p = 0.575 in the 260-fold row | **0.579** (0.575 is the 246-fold `common_fold` value) | `eval/mcs_L1_results.json` |
| 4 | "Fourteen covariates in four families" | **Fifteen** (4 calendar + 1 event + 6 World Cup + 4 weather) | `models/foundation.py:103-113`; `tests/test_exog_supplied.py:98` asserts 15 |
| 5 | "a ladder of seven rungs" | **Rungs 0–4, five rungs, nine scored entrants** (only `rung2_prophet` unscored, backend not installed) | `models/ladder.py`; `models/ladder_results_L1_*.md` |
| 6 | "735 staff chat messages" | **735 total; 376 staff-authored**, 359 assistant | `signals/chatlog_kb_gap.md`; `log/51:8` |
| 7 | Beer Hall half-width "near 490 to 515" | **482 to 515** (505, 515, 498, 486, 482, 482, 504) | `eval/interval_calibration.md:40` |
| 8 | Angelopoulos–Bates bound 0.9005 for three calibration sizes | **Three distinct bounds: 0.9005 / 0.9006 / 0.9007** (n_calib 1883 / 1792 / 1407; `level + 1/(n+1)`) | `eval/interval_calibration_power.json:20-32`; formula `eval/interval_calibration.py:308` |
| 9 | Spike median latency "same day" | **"n/a (point event)" — never measured** | `log/50:33` |
| 10 | "61 to 63 per cent of sampled sustained shifts" | **61% of regime_shift pairs, 63% of exo_coincident pairs**; 54 of 88 overall. `exo_coincident` is a different injection kind, not a sustained shift | `log/50:21-22, 157` |
| 11 | "a six-day lookback … accounts for exactly fourteen affected windows" | The 14 is right; the mechanism is not. **A nine-day interior weather hole**; origins whose train or target window intersects it, bounded to 14 because Ellel's active span ends 2026-07-04 | `log/48:83-90` |
| 12 | "Three claims withdrawn in this chapter", then four listed | Count and enumeration disagree — **chapter-internal, fix by counting** | — |

### Coverage intervals — print these instead of prose

The chapter's coverage table substitutes verdicts ("at nominal", "over-covers,
closed venue") for two of three interval cells, though its own caption promises
Clopper–Pearson intervals. All three exist, arm D (the incumbent) at level 0.90:

| venue | n pairs | coverage | CP 95% |
|---|---|---|---|
| Beer Hall | 1750 | 0.871 | **[0.855, 0.887]** |
| Ellel | 1659 | 0.914 | **[0.899, 0.927]** |
| Two River Taps | 1274 | 0.963 | **[0.951, 0.973]** |

`eval/interval_calibration.md:26,53,80`; full precision in
`eval/interval_calibration_L1.json`. **n differs per venue** — the chapter must
not quote a single n.

### Winkler table — the dashes hide computed values

Five arms, not four: **P** plain pooled split conformal · **D** Mondrian by
active/structural-zero state (the incumbent, the served band) · **S** per-step
calibration · **A** per-step ACI (Gibbs–Candès) · **G** per-step AgACI (Zaffran).
Mean Winkler, `eval/interval_calibration_mcs.json`:

| venue | P | D (incumbent) | S | A | G |
|---|---|---|---|---|---|
| beer_hall | 1939.65 | **1806.97** | 1928.10 | 1814.29 | 1820.32 |
| ellel | 1435.30 | **1262.54** | 1367.21 | 1422.45 | 1476.57 |
| two_river_taps | 654.22 | **646.37** | 670.31 | 671.24 | 674.96 |

MCS outcome (90% set = p ≥ 0.10): beer_hall (n_folds 250) retains all five,
75% set {D, A, G}; **ellel (237) retains D alone** — every other arm eliminated
at p ≤ 0.016; two_river_taps (182) retains all five, 75% set {D}. Adoption
candidates: **none at any venue**. The negative result is real and the incumbent
is not displaced.

### Weather — fifteen point estimates, zero intervals

Every paired interval exists at `eval/weather_basis.md`. Beer Hall, arms
**N** no weather · **O** observed ERA5 · **H** hindcast (committed default) ·
**F** fixed lead 3d · **M** horizon-matched:

mean loss N 0.6005 · O 0.5865 · H 0.5862 · F 0.5860 · M 0.5842; 90% MCS retains
all five. Of ten pairwise comparisons **only N–M excludes zero: +0.0163, 90% CI
[+0.0004, +0.0337]** — lower bound 0.0004, i.e. barely. Uncorrected for ten
comparisons. **These are 90% intervals, not 95%** — the chapter must say so.

---

## 3. Genuinely untraceable — no source exists

### 3.1 "a grouped forecast differs from the univariate one by roughly £40"

**No £40 figure exists anywhere in the repo.** Report 47's only pound value is
**GBP 44.8** (`log/47:58`), and that is the *batch-merge probe* — the amount an
oversized `batch_size` shifts a forecast by merging origins into one
cross-learning group. It is a different quantity from grouped-vs-univariate, and
the chapter already cites it correctly as ~£45 two subsections later. Using it
here would be the same number counted twice for two different purposes.

Worse, **the 44.8 itself has no artefact** — it survives only as prose in report
47. `eval/group_icl_calibration.json` holds the batch-equality probe, whose
deltas are 0.0 (grouped) and ≤ 0.00092 (independent).

**The real quantity, computed from the committed per-origin MAE vectors in
`eval/group_icl_L1.json`** (no model re-run; arithmetic on stored results):

| venue | pair | n | mean abs difference | median | max |
|---|---|---|---|---|---|
| beer_hall | U vs G2 | 260 | **£9.99** | £7.07 | £171.82 |
| beer_hall | U vs G3 | 260 | **£10.94** | £7.87 | £185.17 |
| ellel | U vs G2 | 260 | **£4.27** | £3.75 | £14.14 |
| ellel | U vs G3 | 260 | **£4.68** | £2.69 | £47.78 |
| two_river_taps | U vs G3 | 203 | **£5.84** | £3.92 | £65.30 |

So the grouped path *is* genuinely different from the univariate one — which is
the point the sentence is making — but the magnitude is **£4 to £11 on average**,
not £40. Recommend replacing with the Beer Hall figure (£9.99 mean, £172 max
per-origin), which supports the "capability is real, not a no-op" claim with a
number that exists.

### 3.2 Expected Calibration Error — blocked, not resolvable

No ECE on real data exists anywhere. The only ECE numerals in the repo are
hand-computed unit-test fixtures. `log/46:119` defers the real ECE, Brier and
reliability diagram to S8b, which needs ~644 live model calls behind an API key
that has not landed. **This cannot be resolved by re-running.** It is G3 and G4,
and it stays open. Neither chapter currently reports an ECE value, so no false
claim exists — the exposure is the lit review's unkept promise (W26).

### 3.3 The power calculation

The section is titled "Measured with power, one venue under-covers". There IS a
`power_analysis` (`eval/interval_calibration.py:289-310` →
`eval/interval_calibration_power.json`), but it contains only the seven-point
window's `p_all_in_if_calibrated` = 0.90⁷ = **0.4783**, its Clopper–Pearson
**[0.590, 1.0]**, and `supports_miscalibration: false`.

**No test alpha, no effect size, no minimum detectable effect, no achieved
power (1−β), no sample-size justification exists anywhere.** "Power" in this
section means "enough pairs to measure", not a formal power calculation. Either
rename the section or compute the real thing — the coverage n (1750/1659/1274)
makes a genuine power calculation cheap.

---

## 4. A code defect the audit found — FIXED

`eval/intermittency_diagnostic.py:89` implemented the Kostenko–Hyndman selection
rule as `cv2 < 2.0 - 1.5 * adi`. **The published rule, verified against the
paper's text in `citation_audit.md`, is "use SBA whenever v > 2 − (3/2)p".** The
inequality was reversed, and the docstring stated the reversed form as if it were
the published rule.

**Fixed 2026-07-31** — the comparison is now `>`, with a note recording the
error. No test pinned the old direction.

**Consequence — every SBA/Croston selection in the repo inverts.** Recomputed
arithmetically from the committed ADI/CV² in `eval/intermittency_L1.md` (the
selection is a deterministic function of two stored numbers, so this needs no
model re-run):

| venue | demand day | ADI | CV² | 2 − 1.5·ADI | published (was) | correct (is) |
|---|---|---|---|---|---|---|
| beer_hall | nonzero_revenue | 1.3267 | 0.62 | 0.0099 | Croston | **SBA** |
| beer_hall | any_till_activity | 1.3223 | 0.63 | 0.0166 | Croston | **SBA** |
| two_river_taps | nonzero_revenue | 1.1828 | 0.61 | 0.2258 | Croston | **SBA** |
| two_river_taps | any_till_activity | 1.1828 | 0.61 | 0.2258 | Croston | **SBA** |
| ellel | nonzero_revenue | 5.9231 | 1.04 | −6.8847 | Croston | **SBA** |
| ellel | any_till_activity | 5.8333 | 1.07 | −6.7500 | Croston | **SBA** |

**All six select SBA. The chapter's "every venue at L1 selects the approximation"
is correct and now has repo backing.**

There is structure worth stating in the chapter: **for any ADI ≥ 4/3 the
threshold 2 − (3/2)·ADI is non-positive, and CV² ≥ 0 always, so every
intermittent node selects SBA automatically.** The K&H diagonal only discriminates
in the low-ADI region. That also settles L3 without a re-run: report 45 records
21 of 32 nodes at ADI ≥ 4/3 "but their CV-squared all exceed 2 − (3/2)ADI" —
which *is* the SBA condition. **At least 21 of 32 L3 nodes select SBA.**

Report 45 §1d states the SBA condition and then concludes Croston in the same
sentence. That is the bug, visible in the prose.

### Still to do on this defect

- **Regenerate `eval/intermittency_L1.md` and the L3 report.** Both carry a
  "KH selects: Croston" column that is now wrong, and the L1 header states the
  rule in its reversed form. They are generated files and were **not**
  hand-edited. Regeneration needs the Python stack (`duckdb`, `holidays`,
  pandas/numpy); **no virtualenv exists in this checkout and the deps are not
  installed**, so the generator could not be run here. The arithmetic above is
  exact and the generator will reproduce it.
- **Correct report 45 §1d.**
- The L3 `.md` is store-ceiling-dependent (report 45 warns its top-k and n_days
  drift with history), so regenerate deliberately, not incidentally, or the
  constant correction will be confounded with data drift.

---

## 5. A second repo defect — report 43's rank error, diagnosed

`log/43_G17b_Fold_Count.md:127`: "the 42-day six-fold window picks
**`rung1_robust_dow`** as the winner - the served `chronos2_exo` ranks fifth on
that window."

The table immediately above it gives the Beer Hall `6f@0707` column. Sorted:
**1.267** robust_dow, **1.312 chronos2_exo**, 1.368 bolt, 1.412 ets, 1.466
chronos2, 1.519 stl, 1.553 global_gbm, 1.561 gbm, 1.773 seasonal_naive.
`chronos2_exo` is **second**, 0.045 behind.

**The sentence swapped its subject.** "Fifth" belongs to `rung1_robust_dow` at
**273 origins** (0.803, fifth in the `step1@0707` column) — the six-fold winner
demoted once the sample grows. The prose attached robust_dow's rank at 273
origins to chronos2_exo at 6 folds.

Correct statement: *the six-fold window picks `robust_dow`; the served
`chronos2_exo` is second on that window, 0.045 behind. At 273 origins the
ordering reverses — `chronos2_exo` first, `robust_dow` fifth.* The
small-sample argument survives intact and is in fact cleaner this way.

"fifth" appears **once** in the repo outside the audit ledgers, at `log/43:127`.

---

## 6. Two further conclusion-level corrections (no new data needed)

- **"chose a model that 273 origins reject"** — false. `rung1_robust_dow` sits
  in the 90% MCS at **p = 0.11** (`log/44:183`); eliminated only at alpha 0.25.
  Write "demote from first to fifth, while remaining inside the 90% confidence
  set".
- **The Ellel flip is a ceiling effect, not a fold-count effect.** `log/43` §3
  decomposes it: `committed → 6f@0707` flips robust_dow→chronos_bolt (store
  growth); `6f@0707 → step1@0707` is stable. The chapter attributes it to the
  fold count, which is the wrong mechanism for its own central argument.

---

## 7. The two STALE items — both benign, confirmed

- **Trading-day definition.** Report 42 recommends non-zero-net-revenue; report
  45 supersedes it (comped open day = trading day, occurrence 1 amount 0), pinned
  by `test_occurrence_gate.py` G4. The chapter follows 45. Correct. If report
  42's 301/66 count appears elsewhere it must be reconciled to 302/68.
- **SBA direction.** Resolved in §4 — the chapter was right, the repo was wrong.

---

## 8. Status

| Class | Count | Resolved | Remaining |
|---|---|---|---|
| STALE | 2 | 2 | 0 |
| MISMATCH | 17 | 16 | 1 (chapter-internal count, §2 row 12) |
| UNTRACEABLE | 9 | 7 | 2 (ECE, blocked on S8b; power calculation, needs computing) |

Nothing has been pushed to Overleaf — `PRJ93_RULES.md` gate 5 is untouched. One
code file changed: `eval/intermittency_diagnostic.py`, uncommitted.

---

## Addendum, 2026-07-31 — a table omission found while pushing the corrections

Not in the original audit, because the audit compared claims that were *made*
against their sources and this is a claim that was *missing*.

**`rung4_chronos_bolt` was absent from the results ladder table.** The committed
per-venue artefacts (`models/ladder_results_L1_*.md`) score **ten** entrants, of
which nine score at every venue and only `rung2_prophet` fails on a missing
backend. The chapter's Table~\ref{tab:ladder} listed eight, called the unscored
rung "a ninth entrant", and asserted "every other rung scored at every venue" —
which was false while a scored model was missing from the table.

The omitted model is not a marginal one. `rung4_chronos_bolt` is in
`top4_by_mean_mase` at all three venues and in **every** MCS retained set in
`eval/mcs_L1_results.json`, at both losses and both levels. A reader could not
reconcile a table of eight rows with sets reported as `5/9`, `4/9`, `3/9`.

| venue | committed MASE, 6 folds |
|---|---|
| Beer Hall | 0.796 |
| Two River Taps | 0.612 |
| Ellel | 0.601 |

**No served model changes.** The minimum at each venue is unmoved: Beer Hall
0.745 (`chronos2_exo`), Two River Taps 0.597 (`ets`), Ellel 0.572
(`robust_dow`). The bolding in the table stands as printed.

Fixed on Overleaf: row added, "ninth entrant" → "tenth entrant", and the
sentence now states explicitly that the nine scored entrants are the nine
candidates the confidence sets range over. `sec:res-pattern` gained this as a
third instance of its own pattern.

### Methodology corrections pushed the same day

| Claim | Was | Now |
|---|---|---|
| Two River Taps trading intensity | 5.90 | **5.92** |
| Chat corpus | "735 staff chat messages" | **735 total, 376 staff-authored, 359 assistant** |
| Ladder size | "seven rungs" | **five rungs (0–4), nine scored entrants, tenth unscored** |
| Exogenous covariates | "Fourteen … in four families" | **Fifteen** (4 calendar incl. term boundaries + 1 event + 6 fixture + 4 weather) |
| Injection protocol n | 644 implied throughout | 644 is the **full corpus**; the paired realism comparison runs a **stratified subsample, n=120, sample seed 95** (64/32/24), **Ellel excluded** because its occurrence label is inert without the booking diary |

Also added to `sec:conformal`: the Angelopoulos–Bates bound is evaluated per
venue, since it depends on calibration-set size — previously the chapter printed
one bound for three different sizes.

---

## Addendum 2, 2026-07-31 — flagged items resolved

### The reversed SBA rule: origin found, verdict inverted, code committed

`select_sba` implemented `CV2 < 2 - (3/2)ADI`. The published rule is
`CV2 > 2 - (3/2)ADI` (verified in `citation_audit.md` against the paper's own
sentence). **The reversed form was not invented in the code** — it is how
Finding 19 of `docs/Prj93_external_examiner_assessment.md` quotes the rule, at
all three sites where it appears. The implementation followed the review
without checking it against the source. Those three sites are now annotated
with a reviewee correction rather than rewritten, so the record of what was
said stays intact.

Committed as `5f77591`. Two report-header strings inside the script also stated
the rule backwards and would have reintroduced it on any regeneration; both fixed.

**Verification of the fix:** the corrected predicate reproduces the paper's two
limiting points, `(p,v) = (1, 0.5)` and `(4/3, 0)`, on the Croston side — strict
`>` puts on-the-line cases with Croston, which is what "the maxima at which
Croston can still be preferred" requires.

### The L3 verdict, previously "not re-derived"

Derived: **all 20 intermittent L3 nodes select SBA**; 29 of 30 nodes overall,
the exception being a non-intermittent node the rule does not govern.

**The unanimity is structural, not empirical**, and both chapters now say so.
The intermittency cutoff is ADI >= 4/3 and `2 - (3/2)(4/3) = 0` exactly, so the
selection threshold is non-positive at or above the cutoff while CV2 >= 0
always. Classified-intermittent *entails* selects-SBA. The rule is vacuous over
exactly the nodes it exists to govern. This matters editorially: the reversed
implementation had produced the mirror-image unanimity, and a unanimous result
in either direction invites a reader to hunt for a cause in the data when the
cause is in the geometry.

### Regeneration status — a harder blocker than "no virtualenv"

`store/brain.duckdb` **is absent from this checkout.** The intermittency script
cannot run here no matter what is installed; missing `duckdb`/`holidays` was the
lesser problem. The derived columns in `intermittency_L1.md` and
`intermittency_diagnostic.md` are therefore **recomputed arithmetically from the
ADI/CV2 already committed in those files**, which is exact because selection is a
deterministic function of those two numbers, and each file says so in place. Every
other column is untouched and keeps its original provenance. End-to-end
regeneration remains outstanding and needs the warehouse.

### Report 43's rank error, fixed at source

Corrected in `log/43_G17b_Fold_Count.md` with the ranks read off the report's own
table: at six folds `chronos2_exo` is **1.312** against `robust_dow` **1.267** —
second of nine, gap 0.045. Fifth is where `robust_dow` lands at 273 origins
(0.803). The demonstration is sharper for it: a gate separating first from second
by 0.045 is the more telling margin.

### G1 — the secondary loss, now measured rather than assumed

At the pre-registered primary level (alpha = 0.10) **RMSSE and MASE agree
everywhere**: every served model retained, identical set membership at Beer Hall
(5/9) and Two River Taps (4/9), wider under RMSSE at Ellel common-fold (7 vs 5),
identical at 3/9 on the 260-fold alignment. Served-model MCS p under RMSSE:
0.991 / 0.201 / 0.956 / 0.837.

**One disagreement, at the secondary level.** At alpha = 0.25 under RMSSE the
served exponential smoothing at Two River Taps is *eliminated*; the set collapses
to the three foundation variants. Under MASE it is retained in a set of four.

| Two River Taps, n=205 | MASE | RMSSE |
|---|---|---|
| rung2_ets (served) | **0.6478** (1st) | 0.5139 (4th) |
| rung4_chronos2 | 0.6709 | **0.4817** (1st) |
| rung4_chronos2_exo | 0.6705 | 0.4832 |
| rung4_chronos_bolt | 0.6590 | 0.4860 |

The rank inverts completely. ETS wins the ordinary days and loses the
exceptional ones. Written up as `sec:res-rmsse`; recorded as an open condition,
not smoothed into a null.

### G1 decided on the merits: MASE stays primary

Not on cost of change. The three reasons, in increasing order of weight:

1. **The pathology is absent where the metric is used.** Fatal-3's mechanism —
   absolute-error measures optimise for the median, so constant zeros look best —
   is real, is established in `hewamalage_forecast_2023`, and is demonstrated in
   this project's own suite (`test_mase_prefers_the_zero_forecast_on_an_intermittent_week`
   vs `test_rmsse_prefers_the_spread_forecast_on_the_same_week`). But of three
   venues exactly one is intermittent (Ellel, ADI 5.9, 83% zeros) and that one is
   already off scaled error entirely per G2. The two still on MASE have zero
   fractions 0.25 / 0.15 and classify **erratic**, not lumpy. Adopting the remedy
   where the disease is absent misapplies it.

2. **RMSSE would not have rescued Ellel anyway.** Verified in code:
   `harness.rmsse(..., basis=...)` takes the same four-basis argument as
   `harness.mase`, and `seasonal_naive_squared_scale` is the squared analogue of
   the same denominator. RMSSE inherits the Ellel scale fragility identically.
   G1 and G2 are not substitutes — the Ellel problem is the *denominator*, and no
   choice of numerator touches it.

3. **Decisive: switching would break the audit.** The chapter's question is
   whether the original six-fold gate reached a defensible conclusion. That gate
   ran on MASE. Re-scoring it on another loss answers a different question — and
   switching *after* seeing that RMSSE changes the Two River Taps answer at
   alpha = 0.25 is post-hoc metric selection, precisely what pre-registration
   exists to prevent. The credibility of the entire selection argument rests on
   the configuration having been fixed before the sets were computed.

Both losses are reported at every comparison, which is what `kolassa_why_2020`
and `koutsandreas_selection_2022` actually recommend. The Two River Taps choice
is recorded as metric-dependent and open, with the note that the deviation
detector is a tail instrument and so does not share the criterion its own point
forecaster was selected on.

**Citation-audit side effect closed:** `hewamalage_forecast_2023` — which the
audit called "the strongest single citation in the project for the G1/G2 case",
noting neither chapter used it — is now cited in `sec:res-rmsse`. The
`makridakis_m5_2022` OVERSTATED finding is also respected: M5 is cited only for
its own 77.3 per cent figure, and the median/mean property is attributed to
Hewamalage.

---

## Addendum 3, 2026-07-31 — regenerated from the restored warehouse

The store was restored, so the intermittency artefacts now have genuine
end-to-end provenance rather than arithmetic derivation.

**The restored store sat five weeks stale.** `l1_daily` maxed at 2026-05-31,
not the 2026-07-07 the committed artefacts use, while `data_watermark` still
claimed 07-07. The project's own `assert_store_ceiling` caught it and named the
remedy; `sim.restore_clock` put it back (June 25 days, July W1 7 days, held-out
8-14 July correctly still absent). This is the store-ceiling discipline of
`sec:repro` working exactly as the chapter claims it does.

**L1 regenerated identical** to the values derived by hand in `5f77591` — every
ADI, CV2, class and SBA verdict matches to the digit. The only difference is the
`2-(3/2)ADI` threshold column, which was a hand annotation the generator does not
emit. The correction is confirmed.

**L3 moved**, exactly as report 45 warned it would, because the artefact is
store-ceiling dependent:

| | committed snapshot | regenerated at 0707 |
|---|---|---|
| nodes | 30 | **32** |
| n_days | 260 | **285** |
| intermittent | 20 (at SBC 1.32) | **21** (at KH 4/3) |
| non-OTHER intermittent | 17 | **16** |
| select SBA | — | **31 of 32; 21 of 21 intermittent** |

The 21-of-32 count now matches report 45's own figure, so the artefact and the
report agree for the first time. The single Croston node is
`ITEM::Happy Hour::£1 SHOTS`, zero_fraction 1.00 — it never sold, so ADI and CV2
are undefined and the rule does not govern it. **Supersedes the "20 of 20" figure
in Addendum 2**, which came from the stale snapshot; chapters updated to
twenty-one.

**Three generator defects fixed**, since a regenerated report should not be able
to go stale the way this one had:
- the ADI blind-spot worked example was hardcoded to `Lancashire crisps`, a node
  that had since left the hierarchy — the report was citing an item its own table
  no longer listed. Now derived from the data.
- the cutoff printed as `1.3333333333333333`.
- added a footer stating the unanimity is structural, so a reader of the artefact
  alone cannot mistake it for a finding about the estate.

Committed `1641dbc`. Environment: `.venv-run` (Python 3.14, duckdb 1.5.5,
pandas 3.0.5, numpy 2.5.1, sklearn, statsmodels) — within the bounds
`requirements.txt` declares. Warehouse backed up to `/tmp/brain.duckdb.bak`
before `restore_clock` mutated it.
