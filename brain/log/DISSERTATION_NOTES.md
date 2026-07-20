# Dissertation notes: findings, framings, and things not to claim

Working notes for the PRJ93 evaluation chapter, written 2026-07-16 immediately after
the Step-C2 confrontation (report 31) and before the statelessness refactor starts
changing the engine that produced these numbers. Not a report: reports are dated
records of a step, this is the argument they add up to, plus the traps.

Every number here is reproducible at tag `prj93-research-frozen`. Where a claim is
bounded, the bound is stated, because the strongest thing this project has is that its
negative results are as well-evidenced as its positive ones.

---

## 1. The headline is the method, not the accuracy

The temptation is to lead with MASE 0.285. Resist it. The accuracy number is good but
it is one estate, one venue, five weeks of out-of-sample evidence. What is actually
defensible, and rare, is the **evaluation design**, and it earned its keep by killing a
hypothesis the project believed.

Lead with this: a pre-registered, two-pass, calendar-airtight design was run three times
and on the third run it **falsified a finding the project had already published in its
own reports**. That is the chapter.

The design:
- **Pass 1**: forecast from a cutoff, write to a committed artefact, commit. No actual read.
- **Pass 2**: pull held-out actuals, score. `git log` proves the freeze predates the pull.
- Two invariants: the forecast is frozen before any actual is seen; pulled actuals are
  evaluation-only and never enter the served store.

The July 8-14 window is the strongest form: both origins were frozen 2026-07-10, the
window closed 2026-07-14, the actuals were pulled 2026-07-16. The target dates were in
the **future** at freeze time, so the pre-registration is airtight **by calendar**, not
merely by commit ordering. A reader who distrusts git history entirely still cannot
attack it.

---

## 2. Results, with their bounds

### 2.1 Accuracy at the serving horizon (defensible, narrow)

| Window | Model | MASE | Coverage @90 |
|---|---|---|---|
| June, 30-day cold | rung4_chronos2_exo | 1.64 | - |
| July 1-7, 7-day | rung4_chronos2_exo | 0.386 | 1.00 |
| July 8-14, 7-day (Origin B) | rung4_chronos2_exo | **0.287** | **1.00** |
| July 8-14, 9-15 day (Origin A) | rung4_chronos2_exo | **0.285** | **1.00** |
| Backtest class (6-fold rolling) | rung4_chronos2_exo | 0.745 | - |

Claim: **at its serving horizon the forecast is accurate, and the band is honest.**
Both out-of-sample July windows beat the backtest class.

Do NOT claim the model is better than its backtest. Two 7-day windows on one venue is
not a distribution. The right sentence is "the serving-horizon claim survived two
independent out-of-sample tests," not "MASE improved to 0.285."

The June 1.64 is not a failure to bury. It is a deliberate stress test past the
operating range (30-day cold, unforecastable summer, World Cup, stale L3 menu) and it is
the contrast that makes the 7-day number mean something. Report both or neither.

### 2.2 The band is the quietly strong result

Coverage 1.00 on both July windows, and specifically: **on 11 July the point forecast
was wrong by +GBP 574 and the actual still landed inside the band.** The split-conformal
band did exactly the job it is there for, on the one day the point forecast failed
worst.

This is the best argument in the project for the conformal layer, and it is worth more
than the MASE. A general manager acting on the band would not have been misled on the
day the model was most wrong. Frame the band as the deliverable and the point forecast
as the input to it.

### 2.3 Simple beats complex on thin data (honest, keep)

Gate-selected served models: Beer Hall `rung4_chronos2_exo` (0.745), TRT `rung2_ets`
(0.597), Ellel `rung1_robust_dow` (0.572, Chronos a near-tie at 0.581). The ladder plus
a beat-both-baselines gate produced a foundation model on the data-rich venue and a
day-of-week median on the thin one, with no hand-picking. That is the ladder working,
and it is a result, not an embarrassment.

### 2.4 Cadence: two independent lines now agree (strengthened by C2)

Report 24's cadence sweep found Beer Hall error flat below weekly: tighter refresh buys
responsiveness, not accuracy. C2 corroborates this **from a completely different
direction**: Origin B (7-day-ahead, production-faithful, June+July in context) did not
beat Origin A (9-15 day-ahead, June only) — 0.287 vs 0.285, and worse on the window
total.

This matters more than it looks. The two results share no method: one is a sweep over
refresh intervals on historical folds, the other is two pre-registered blind forecasts
from different origins. Agreement across independent designs is the kind of evidence
worth foregrounding.

---

## 3. The central finding: a pre-registered claim, falsified

This is the chapter's spine.

**Report 27 (July 1)**: the model anticipated the England R32 fixture. Baseline GBP 296,
frozen forecast GBP 487 (+GBP 191), actual GBP 747. It under-shot the magnitude but
moved the right way for the right reason. Report 27 called it single-case and
directional, which was correct and disciplined.

**Report 29 pre-registered the next test explicitly**, including the expected direction:
Origin B would not sharpen the England anticipation (+GBP 309 vs +GBP 312) but would
raise generic-match anticipation, narrowing the premium. That expectation was written
down before the data existed. **It was confirmed** at the expectation level (+181 to
+134).

**Report 31 (July 11)**: reality inverted it. Both origins expected roughly +GBP 310 for
the England quarter-final; the realised lift was **-GBP 265, below the day-of-week
baseline**. Wrong in sign. The realised England-minus-generic premium was **negative**
(-GBP 316 / -GBP 299) against a pre-registered +GBP 181 / +GBP 134.

Two-case record: **1 for 2**. The in-context fixture anticipation is **not established**.

### 3.1 The refuted explanation is the methodological set-piece

Write this up in full, because it is the most instructive thing in the project.

The obvious explanation for 11 July is kickoff time: Norway v England kicked off 22:00
against a Saturday trading envelope closing 23:27, leaving ~1.5 hours in hours, versus a
17:00 prime-slot kickoff on 1 July. It is mechanistic, it fits, and it is wrong.

**27 June refutes it.** Panama v England: also a Saturday, also a 22:00 kickoff, and it
returned the **largest home-nation lift on record**, +234% over its DOW median.

| Date | Fixture | Kickoff | DOW | Actual | DOW median | Lift |
|---|---|---|---|---|---|---|
| 17 Jun | England v Croatia | 21:00 | Wed | 607.09 | 271.15 | +124% |
| 23 Jun | England v Ghana | 21:00 | Tue | 334.93 | 120.77 | +177% |
| **27 Jun** | **Panama v England** | **22:00** | **Sat** | **3081.50** | **921.47** | **+234%** |
| 1 Jul | England v DR Congo | 17:00 | Wed | 758.54 | 336.83 | +125% |
| **11 Jul** | **Norway v England** | **22:00** | **Sat** | **984.62** | - | **-21%** |

Day of week and kickoff hour are held constant across the two Saturday cases and the
outcomes invert. Neither explains 11 July.

The chapter should say plainly: **the shortfall is unexplained by the covariate set**,
and it stays unexplained after the diagnostics were actually run.

Report 36 (2026-07-19) tested the two ranked hypotheses. Everything in it is **post
hoc**: the 11 July actual was seen before the hypotheses were specified, so it may
explain and may not confirm, and it must never appear beside the pre-registered results
without that label on the same page.

| Hypothesis | Status after report 36 | Evidence |
|---|---|---|
| (1) weather | **refuted** | 11 Jul was warmer (25.2 vs 23.1 C), sunnier (16.13 vs 15.23 hrs) and equally dry. The better Saturday underperformed. |
| (2a) Ellel substitution | **tested, real, insufficient** | Effect exists and is consumed: GBP 27.50 of a GBP 573.66 over-forecast, 4.8%. |
| (2b) Events booking | **untestable** | 203 rows over 2 dates in the whole seed history. |
| (3) tournament stage | still untested | n=2 stages; the same n problem. |

Hypothesis (2a) is still the most publishable part, but the honest version is sharper
and less flattering than the original framing. The claim is **not** that the model has
no cross-venue term. It has one, `is_ellel_event`, it is served, and the model uses it.
The claim is that the term is **structurally impoverished at exactly the moment it
matters**: binary rather than magnitude-carrying, and **pinned to 0 on every forecast
horizon** because a forecaster at the cutoff does not know the event venue's future
bookings. So the model is fit on a covariate it can never observe when it serves. That
is a train/serve asymmetry of the same species as report 33's `exo_is_dry` defect, and
the difference, that this one is documented rather than hidden, is worth stating,
because a documented asymmetry is still an asymmetry.

The measured direction is **substitution, not spillover**, which inverts Lune's own
stated hypothesis that an Ellel function night lifts the Beer Hall next door
(`features/build_features.py`). That is a fourth refuted belief, and it arrived with a
methodological trap attached: the **pooled** comparison reads **+GBP 500** and the
day-of-week-matched one reads **-GBP 23**. Ellel books weekends and the Beer Hall is
busiest at weekends, so the naive pooled estimate reports the day-of-week effect with
the wrong name and the wrong sign. Write that up: it is a compact, self-contained
confounding example and it nearly confirmed a false finding.

### 3.2 What this supersedes

Report 24's home-nation finding (**England +130%, Scotland +116%, generic within noise
of no-match**) does not survive as stated. It was n=3 England dates and it was labelled
directional — the caveat was right. The fourth and fifth England dates split, and on the
July 8-14 window the ordering **reverses**: the generic Friday fixture beat its baseline
(+GBP 300) while the England Saturday fell below it.

Decision log row 15(b) carries the forward pointer to row 21. Do not quote "England
+130%" anywhere in the dissertation without that pointer.

### 3.3 How to frame it

Do not frame this as a model failure. Frame it as the design working.

The honest arc: a plausible effect was observed (n=3, June), it was labelled directional
rather than established, a specific numeric expectation was pre-registered, and the test
falsified it. The alternative — the counterfactual worth stating explicitly — is that
without pre-registration the "+130% home-nation uplift" would have entered the
dissertation as a finding, because it was real in every window that had been looked at
when it was written.

That counterfactual is the argument for the method. Make it.

---

## 4. Traps: things that look like findings and are not

### 4.1 Ellel's MASE is an artefact (FLAG-MASE-INTERMITTENT)

C2 scores Ellel at **MASE 0.096**, which looks like the best number in the project. It
is hiding a **90.2% under-forecast**: the model said GBP 56.30, the venue took GBP
574.63, and the band was breached.

Both are correct. Ellel's seasonal-naive denominator (mean |y_t - y_{t-7}|) is large on
a series that is mostly zero with occasional event spikes, so genuine absolute errors
divide down to nearly nothing. **MASE flatters intermittent series.**

Never quote Ellel's MASE alone. Never rank Ellel against Beer Hall on MASE — the
denominators are different rulers. Report absolute error and coverage alongside. This is
worth a short methodological subsection: the metric the whole ladder is gated on has a
known failure mode on exactly the venue type the project claims to handle.

### 4.2 The A14 ablation does not govern the served model

`signals/feature_ablation.md` says "no exogenous feature is adopted." That binds the
**Rung-3 GBM only**. The served Beer Hall model is `rung4_chronos2_exo` and it consumes
all 15 `CHRONOS2_EXO_COLS`, weather included. Different model, different mechanism: the
GBM consumes engineered columns and lost to its own autoregressive lags; Chronos-2
conditions zero-shot through the context/future frames and earned its rung at the gate.
The exo entrant was widened at G12.10b, **after** the ablation was written.

The two results do not conflict, and the dissertation must not let them look like they
do. This claim escaped into downstream planning (the gm-ai integration brief read
weather as "attribution-only") because `FLAGS.md` carried the unscoped version for a
week after the reports were corrected. Both are fixed now.

### 4.3 Taxonomy drift is fixed in the freeze, NOT in the standing build

Checked 2026-07-16. `hierarchy.build_hierarchy` takes a `since=` argument that ranks
top-k nodes from recent rows; the freeze scripts pass it; **`hierarchy.reconcile()` — the
standing service path — does not, and no caller anywhere does.**

Measurable consequence: the standing path still selects `Lager - BH` (two years of
history, GBP 14.86 in June) over `LuneBrew Pilsner` (GBP 3,484 in June) and drops the
latter into OTHER. That is the exact item report 25 named as the smoking gun.

Ingesting June and July did **not** fix this and partly masks it: node counts move, so a
count check reads as progress while membership is still wrong.

**Decided 2026-07-19 (report 38): the limitation is stated, not fixed.** The gated
before/after was run and the answer is do-not-wire. State it in the dissertation in
these terms, because the sharp version is better than the original framing:

- **Refreshing degrades the metric.** Beer Hall L3 revenue MASE, blind, one ruler:
  **0.852 standing to 1.08-1.16 refreshed**, crossing from beating seasonal-naive to
  losing to it. The two venues also move in opposite directions on capture (Beer Hall
  19.3% to 29.0%, **Ellel 31.3% down to 15.3%**).
- **The prescription does not fix the named symptom.** `LuneBrew Pilsner` is **never
  selected at any lookback**, by units or revenue: it is 5th at best under a 56-day
  window and only three items per category are ever named. **The binding constraint is
  `top_k`, not the ranking window.** So the open question ("is `since=` wired?") had a
  false premise, and wiring it would have raised capture, read as progress, and left the
  named item in OTHER. That is worth writing up: it is the count-check trap one level
  deeper, found only by testing the fix against the specific case rather than the
  aggregate.
- **The metric finding underneath it.** Refreshing swaps stable long-history lines for
  recent ones; a recent item has a shorter noisier history, so its base forecast is
  worse **and** its seasonal-naive denominator is smaller, and MASE is punished twice.
  **The node set that scores best is the node set that matters least.** Pair this with
  4.1 in one methodological subsection: there MASE flattered a 90% under-forecast, here
  it rewards forecasting the commercially irrelevant items well. Both say the gate the
  whole ladder rests on is **blind to relevance**.
- **Most of Ellel's OTHER is not drift at all.** Held-out revenue from items never sold
  before the cutoff: **beer_hall 12.6%, ellel 42.7%**. Irreducible by any ranking window.
  Report 25's 15% Ellel capture must be read against that.

Report 25's 26% / 15% is updated to **19.3% / 31.3%** on a different basis: report 25
measured the frozen, revenue-ranked node set, this measures the standing, units-ranked
one. Two different hierarchies, never previously compared. Quote whichever you mean and
say which.

### 4.4 The L3 result and what MASE 1.33 means

Report 25's first real L3 revenue MASE (BH all-node median 1.33) is **above 1** — worse
than seasonal-naive. That is honest and should stay. The cause is drift, not the model:
frozen named nodes captured 26% (BH) / 15% (Ellel) of June revenue. Distinct from the
new-item problem (an item first sold after the cutoff has no history and lands in OTHER
by design; irreducible).

---

## 5. Limitations to state outright

State these; do not let a reader find them.

1. **One estate, one vertical.** Three venues, one hospitality group, one region. No
   claim generalises beyond it. The multi-tenant question is entirely untested.
2. **The thin venues are thin.** Ellel ~64 trading days, booking-driven. TRT closed. The
   Beer Hall (~302 days after the June/July ingest) is the only venue with a real series.
3. **Fixture effects are unstable and unexplained.** Section 3. The one out-of-sample
   test of the anticipation failed and the mechanism is unknown.
4. **The cross-venue term is present but impoverished, and blind on the horizon.**
   Corrected 2026-07-19 by report 36; the earlier wording ("no cross-venue substitution
   term, venues are modelled independently") was overstated and is wrong. What is
   actually true: `is_ellel_event` is a cross-venue term on the Beer Hall frame, it is
   one of the 15 served `CHRONOS2_EXO_COLS`, and the served entrant demonstrably
   consumes it (GBP -25 to -39 per lit day, measured). But it carries **presence, not
   magnitude** - a GBP 200 booking and a GBP 3,000 booking are the same 1 - it is
   **pinned to 0 across every forecast horizon** by design, so the model trains on an
   informative column and serves it constant, and **no term of any kind exists for the
   Events location**. The architecture can express estate substitution weakly in
   training and not at all at serving. See also the measured effect size in limitation
   10: the term is real and it is nowhere near large enough to carry the 11 July miss.
5. **MASE is the gate and it flatters intermittent series** (4.1). The gate is sound on
   Beer Hall and unreliable on Ellel.
6. **MinT's guarantee does not formally hold here.** "At least as good" assumes
   **unbiased** base forecasts; the L2/L3 base is DOW-median, which is biased. MinT is
   used because it measured better on two of three venues, not because the theorem
   applies. Say so.
7. **The production ingest path is unexercised.** Every June-onward number comes through
   MCP-SIM, a labelled Square-connector stand-in. `NeonAdapter` is wired and inert. The
   distinction is stated in every simulation report and must be stated here.
8. **The 11 July confront used an aggregate pull, not the item grain.** L1 only for the
   W2 window. The L2/L3 story for that window is not scored.
9. **Weather is a forecast product, not truth.** For 11-14 July the "hindcast" basis is
   the live forward forecast retrieved 2026-07-10. Real serving conditions, but not
   reanalysis. Report 36 quantified the gap for 11 July: the model was conditioned on
   27.2 C against 25.2 C observed and 15.09 sunshine hours against 16.13. Small, and in
   the direction that would inflate a forecast, so it is a named contributor and not an
   explanation.
10. **The Events arm of the cannibalisation hypothesis is untestable, not untested.**
    The committed seed carries **203 Events line items across 2 distinct dates**
    (2026-05-30, 2026-05-31) in the whole 2025-06-04 to 2026-05-31 history, against
    47,644 Beer Hall rows. The GBP 779.94 Events booking on 11 July has no comparison
    set. Report 31 named it as part of hypothesis 2; it cannot be scored at n=2 and the
    project does not report what n cannot carry.
11. **The 11 July shortfall remains unexplained after diagnosis.** Report 36 tested the
    two ranked hypotheses post hoc. Weather is refuted as an explanation (11 July was
    warmer, sunnier and equally dry). The Ellel substitution mechanism is real, is
    consumed by the served model, and closes GBP 27.50 of a GBP 573.66 over-forecast -
    4.8%. Both are honest negative results and neither rescues the fixture anticipation.

---

## 6. Numbers to quote, with their sources

| Claim | Number | Source |
|---|---|---|
| Serving-horizon accuracy | BH L1 MASE 0.285 / 0.287, coverage 1.00 | report 31 |
| Prior window | BH L1 MASE 0.386, coverage 1.00 | report 27 |
| Stress test | 30-day cold MASE 1.64 | report 22 |
| Backtest class | 0.745 (BH), 0.597 (TRT), 0.572 (Ellel) | `models/ladder_results_L1_*.md` |
| Band held on the worst day | 11 Jul error +GBP 574, in-band | report 31 |
| Cadence null | Origin B does not beat A (0.287 vs 0.285) | report 31 |
| Cadence sweep | BH flat below weekly (7-day 1.45) | report 24 |
| Fixture falsification | expected +GBP 310, realised -GBP 265 | report 31 |
| Refutation control | 27 Jun, Sat 22:00, +234% | report 31 |
| Liveness gate | GBP 5,329 forecast for a dead venue -> none | reports 22, 27, 31 |
| Briefing fatigue | 0 new items/week, 8 suppressed | report 27 |
| Taxonomy drift, frozen revenue-ranked nodes | captured 26% (BH) / 15% (Ellel) of June revenue | report 25 |
| Taxonomy drift, standing units-ranked nodes | captured 19.3% (BH) / 31.3% (Ellel) | report 38 |
| Irreducible new-item share of OTHER | BH 12.6%, Ellel 42.7% | report 38 |
| Ellel substitution effect on the Beer Hall | DOW-matched **-GBP 23.40** (n 66 active / 333 quiet) | report 36 |
| Ceiling on the 11 Jul substitution explanation | GBP 27.50 of GBP 573.66, **4.8%** | report 36 |
| MPS vs CPU | MPS slower (~3.2s vs ~0.6s), parity GBP 0.0002 | report 24 |

**The two taxonomy rows are different hierarchies and are not a before/after.** Report 25
measured the frozen, revenue-ranked node set; report 38 the standing, units-ranked one.
Section 4.3 carries the full account. Quote whichever you mean and name the basis on the
same line, and never present 26% -> 19.3% as movement.

Do not quote: Ellel MASE 0.096 (4.1); "England +130%" without the row-21 pointer (3.2);
"no exo feature adopted" as if it governed the served model (4.2); the **pooled** Ellel
spillover of +GBP 500.18, which is the day-of-week effect wearing a spillover label and
carries the opposite sign to the matched estimate (3.1, report 36).

---

## 7. Chapter skeleton

1. **Evaluation design** — pre-registration, the two invariants, why calendar-airtight
   beats commit-ordering. This is the contribution.
2. **The ladder and the gate** — beat-both-baselines, no hand-picking, and the
   simple-beats-complex outcome on thin venues as evidence the gate is real.
3. **Serving-horizon accuracy** — the three windows, the band, section 2.
4. **The falsification** — section 3, in full, including the refuted kickoff explanation.
   The set-piece.
5. **Operational results** — liveness gate, briefing fatigue, cadence.
6. **Limitations** — section 5, unhedged.
7. **Fidelity audit** — 24 papers, ~6 faithful / ~13 justified adaptations / the rest
   honest non-adoptions. The EnbPI-vs-SPCI correction and the Croston/SBA non-adoption
   are the evidence the audit was real and not a citation list.

The through-line: **the method is the contribution, and the negative results are the
proof it works.** A design that only ever confirmed its own hypotheses would be worth
less.
