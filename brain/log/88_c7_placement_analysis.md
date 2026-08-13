# 88 · Can the C7 result enter the document by displacement

Package S13, Part 4. Read-only on every `.tex` file. No reduction made, no edit
applied. HEAD at start `35f6fb42`. Store ceiling `2026-07-07` before and after.

Companion to `log/87_correction_costing.md`, which carries the recomputed word
count (**19,993**, margin **+7**) and the correction set this report costs against.

---

## 0 · Three results, before the passage inventory

**1. The document already contains the C7 finding's population, its size, its
rate, and its mechanism. What it does not contain is the coverage number.**
`results.tex:606` reports "at the Beer Hall $94$ of $546$ calendar-closed days, or
$17.2$ per cent, actually traded." The C7 artefact reports `closed_traded` at the
Beer Hall as `n = 94` and `closed_group_traded_rate = 0.17216117216117216`. Same
cell, same size, same rate, computed by a different instrument.

**2. The instrument reproduces the published Chapter 4 coverage table row for
row**, which is what makes a displacement admissible at all:

| Venue | `tab:coverage` pairs | C7 availability `n` | `tab:coverage` coverage | C7 availability coverage |
|---|---|---|---|---|
| Beer Hall | 1750 | **1750** | 0.871 | **0.8714** |
| Ellel | 1659 | **1659** | 0.914 | **0.9138** |
| Two River Taps | 1274 | **1274** | 0.963 | **0.9631** |

The `fig:drift` caption's three populations reproduce too: "21 of 1,365
calendar-open days at the Beer Hall, 1,037 of 1,300 at Ellel and 7 of 1,025 at Two
River Taps" against C7's contingency counts of `open_took_nothing` 21 / 1,037 / 7
over calendar-open groups of 1,365 / 1,300 / 1,025. **The occurrence arm is
therefore a like-for-like counterfactual against the band the chapter reports, not
a separate computation that happens to be nearby.**

**3. The C7 numbers refute a sentence the document currently prints, and the
repair is three words shorter than the over-claim.** `results.tex:608-609` says the
94 misgrouped days "are misses by construction." They are not. Their measured
coverage is **0.489**, so 46 of the 94 are covered. The direction is right and the
absolute is wrong. Section 4 below costs the swap at **Δ −3**.

Item 19 asked whether any existing passage could say something shorter and more
specific with the C7 numbers in it. **It can, and it is also currently wrong.**

---

## Item 17 · Every passage on the exchangeability violation, the closure calendar, the Mondrian group, or coverage conditional on trading

Word counts by `texcount -0 -sum -merge -total` on the extracted span.

| # | Location | Words | What it does |
|---|---|---|---|
| P1 | `methodology.tex:511-516` | 62 | **Defines the Mondrian group.** "A Mondrian variant computes group-conditional quantiles separating calendar-open from structural-zero days, so a closed venue's near-zero residuals cannot shrink a trading day's interval" |
| P2 | `methodology.tex:517-524` | 97 | **Justifies the partition variable.** "The Mondrian partition is an observed calendar variable rather than an inferred regime, and that is the decision needing a reason: a method obliged to infer its regime pays a coverage penalty scaling with its state-prediction error \citep{sun_conformal_2025}, which a known calendar does not pay" |
| P3 | `results.tex:419-422` | 60 | Marginal coverage caveat: "These are marginal figures over a mixture of trading and non-trading days, and Section~\ref{sec:res-traded} shows that which venue failed in the unsafe direction depended on whether the days a venue took no money are counted" |
| P4 | `results.tex:436-440` (`tab:coverage`) | table | 0.871 / 0.914 / 0.963 with Clopper-Pearson intervals |
| P5 | `results.tex:460-470` | 165 | The 0.871 shortfall, and the closing inference: "Split conformal cannot under-cover under exchangeability, so exchangeability is violated in these residuals" |
| P6 | `results.tex:472-517` (`sec:res-traded`) | ~420 | **Coverage conditional on trading status.** "Read on the days each venue actually traded, the estate inverted" |
| P7 | `results.tex:519-530` | 145 | `sec:res-exchangeability` opening: the drift account and the three per-venue correlations |
| P8 | `results.tex:532-577` (`tab:exchangeability`) | table | Rank uniformity against measured coverage, all pairs and trading days only |
| P9 | `results.tex:584-599` | ~200 | Drift cause: deflation dissolves the Beer Hall and TRT drift; Ellel does not follow; the 263-against-1037 split |
| **P10** | **`results.tex:601-611`** | **~124** | **The closure-calendar misgrouping.** Carries the 94-of-546 sentence and the "misses by construction" claim |
| P11 | `results.tex:612-620` (`fig:drift` caption) | 67 | The three populations, "on those days the residual equals the forecast by identity" |
| P12 | `discussion.tex:139-146` | 96 | "The served band missed nominal at all three venues with the departures running in opposite directions ... The exchangeability account survives that decomposition and is sharpened by it" |
| **P13** | **`discussion.tex:365-371`** | **104** | **The partition can be wrong in either direction.** Carries the 17.2 and 79.8 per cent pair |
| P14 | `discussion.tex:200-203` | ~55 | Zaffran on exchangeable scores and the adaptive update |
| P15 | `conclusion.tex:157-161` | 60 | "The mechanism is exchangeability, located rather than sized (Section~\ref{sec:res-exchangeability})" |
| P16 | `conclusion.tex:191-194` | ~55 | The Mondrian partition "which Section~\ref{sec:res-exchangeability} then had to diagnose rather than assume" |
| **P17** | **`conclusion.tex:215-222`** | **100** | **Further Work: "Mondrian groups drawn from predicted occupancy."** |

Three passages are load-bearing for this question and are quoted in full below.

**P13, `discussion.tex:365-371`, verbatim:**

> Five assumptions carry the results and each has a stated consequence if it fails. Exchangeability
> of the conformity scores is assumed by the interval construction and fails the coverage test at two
> of three venues, which is one of this work's findings. Day of week stands in for occurrence, and
> its cost is that the Mondrian partition can be wrong in either direction: this estate supplies one
> venue of each, at $17.2$ per cent of the Beer Hall's calendar-closed days having traded against
> $79.8$ per cent of Ellel's calendar-open days not having.

**Note what this settles.** The S12 package's framing said 79.8 per cent was "of
calibration observations". The document does not say that. It says "of Ellel's
calendar-open days", which is the correct denominator and is exactly what C7
measured as `open_group_took_nothing_rate = 1037/1300 = 0.7977`. **The document was
right and the framing was loose.** No correction is owed here.

**P17, `conclusion.tex:215-222`, verbatim:**

> \textbf{Mondrian groups drawn from predicted occupancy.} A partition specified on the closure
> calendar misgroups observations at all three venues and in opposite directions
> (Section~\ref{sec:res-drift-cause}). The repair is not to group on whether the venue traded, which
> is known only after the target date and would condition the calibration group on the realised
> outcome; it is to group on an occupancy signal available before it, and the covariate that would
> supply one is the booking diary Section~\ref{sec:disc-limitations} records as never received. That
> is the second change this work would make to its own method, and it is blocked rather than
> mechanical.

**P10, `results.tex:604-609`, verbatim:**

> The
> within-group exchangeability the Mondrian partition buys holds only so far as its closure calendar
> is right, and at the Beer Hall $94$ of $546$ calendar-closed days, or $17.2$ per cent, actually
> traded, with an absolute residual averaging $238.0$ against $32.21$ on genuinely closed days: they
> are drawn from the trading distribution and banded against a group of near-zero residuals, so they
> are misses by construction. Two River Taps carries a similar rate and Ellel a lower one.

The clause from "and at the Beer Hall" to "misses by construction" is **49 words**.

---

## Item 18 · What D-U6 set out to establish, and what the document reports

**From the decision log**, `Decision_and_Resolution_Log.md:2605`, the open-item
sweep:

> **D-U6** (the Beer Hall exchangeability violation is still unidentified, analysis, never third-party blocked)

**From the decision log**, row 96, the extension that closed it (`log/73`):

> 96. **D-U6 extended: the drift has a cause, there is a second violation, and the remedy does not do what report 72 implied.**
>
> *A second violation, larger at the anchor venue.* The Mondrian partition groups by a day-of-week closure calendar, and **94 of 546 Beer Hall calendar-closed days actually traded (17.2%)**, mean |residual| 238.0 against 32.21 on genuinely closed days, a factor of 7.4. **Those are misses by construction**, and they are why the committed artefact shows that venue's closure group covering 0.840 against 0.884 for its active group. Distinct from the drift: non-stationarity inside a correct group versus a group specified wrongly.
>
> *The remedy, tested.* Two River Taps 0.9631 to **0.9089** at W=120 and mean width DROPS 535 to 469 ... Beer Hall recovers only 0.007 of a 0.029 shortfall and pays 7% width. **Ellel is made worse**, 0.9138 to 0.9265, widening 18%. So the honest report is a NON-UNIFORM remedy that tracks the mechanism venue by venue, which is confirmation of the diagnosis and a refusal of the estate-wide fix.

**From the document**, the outcome as currently reported:

- `conclusion.tex:159-161`: "The mechanism is exchangeability, **located rather than
  sized** (Section~\ref{sec:res-exchangeability})."
- `results.tex:609-611`: "The drift is non-stationarity inside a correctly specified
  group; **this is a group specified wrongly**, and no recency weighting repairs
  it."
- `discussion.tex:144-146`: "The exchangeability account survives that decomposition
  and is sharpened by it, trading-day mean ranks predicting each venue's
  trading-day coverage in sign and rough size."

**"Located rather than sized" is the document's own statement of what D-U6 did not
achieve, and sizing the misgrouped cell is precisely what C7 does.** That phrase,
in the Conclusions, is the strongest single argument that C7 belongs in the
document, and it is also a phrase that would have to change if C7 entered, since
the cell would then be sized.

One number in row 96 is worth separating from C7's. Row 96's **0.840** is the whole
closed group at the Beer Hall, 94 misgrouped days plus 452 genuinely closed ones.
C7's **0.489** is the misgrouped 94 alone, with the genuinely closed 406 banded
observations at 0.921 beside it. The two do not conflict; the second decomposes the
first.

---

## Item 19 · The displacement question

### 19.1 · The one passage that asserts something C7 settles

**P10's closing clause. It asserts, and the assertion is wrong.**

| | |
|---|---|
| **What it currently says** | "they are drawn from the trading distribution and banded against a group of near-zero residuals, **so they are misses by construction**" |
| **What C7 measures** | availability coverage on that cell is **0.4894**, Clopper-Pearson 95 per cent interval **[0.385, 0.595]**, against nominal 0.900. `n = 94` |
| **Verdict** | The direction is right, the absolute is wrong. **46 of the 94 are covered.** "Misses by construction" over-claims by roughly half the cell |

The mechanism the sentence gives is sound: a trading-distribution residual banded
against a near-zero group misses more often than nominal. What the sentence cannot
support is the word "construction", which asserts that the grouping makes the miss
inevitable. C7's own numbers show why it is not inevitable: the availability band
on that cell has mean width **187.7**, non-zero, so it catches the smaller trading
residuals and loses the larger ones.

**The replacement, and it is shorter:**

> and at the Beer Hall $94$ of $546$ calendar-closed days, or $17.2$ per cent, actually
> traded: drawn from the trading distribution and banded against a group of near-zero residuals,
> they cover $0.489$ against a nominal $0.900$ and carry $77$ per cent of the venue's coverage
> shortfall.

**49 words becomes 46. Δ −3**, measured in situ on a scratch copy of
`results.tex`. It drops the "$238.0$ against $32.21$" mean-residual pair, which was
the qualitative proxy for exactly the quantity the coverage number now states
directly, and it drops "misses by construction".

**What is lost:** the 7.4-factor residual contrast, which is in `log/73` and in
decision-log row 96 but would leave the document. **What is gained:** a measured
coverage against nominal, and the shortfall share, in place of an assertion that
the measurement refutes.

**This is the outcome item 19 said to look for, and it is available.**

### 19.2 · Passages that hedge or defer but that C7 does not settle

| Passage | Why C7 does not settle it |
|---|---|
| **P17**, Further Work, "the repair ... is to group on an occupancy signal available before it" | C7 measures a **realised-occurrence oracle**, which P17 explicitly rules out as a repair ("known only after the target date"). C7 confirms P17's diagnosis and cannot supply P17's remedy, because the booking diary was never received. **P17 stands as written** |
| **P15**, "located rather than sized" | C7 sizes one cell at one venue. Whether that discharges "sized" for the whole estate is a judgement, not a measurement, and at Ellel and TRT the shortfall attribution is inapplicable because both over-cover overall |
| **P13**, the 17.2 / 79.8 pair | Already correct, already carries both denominators. Nothing to settle |
| **P2**, the Sun citation on inferred-regime penalty | C7 measures no inferred-regime method. Untouched |
| **P6**, `sec:res-traded` | C7's cell decomposition is finer than the traded/non-traded split, but `sec:res-traded` makes no claim C7 contradicts |

**Reported honestly: exactly one displacement exists, it is P10, and it is the one
place the document over-claims.**

---

## Item 20 · The minimum honest statement of the C7 finding

Item 20 sets four requirements: the cell, its size, its coverage against nominal,
and **both counterweights**. The counterweights, from
`log/86_c7_partition_contrast.md` section 6:

1. The occurrence oracle makes Ellel's **overall** coverage worse, 0.9138 against
   0.8427.
2. At the Beer Hall an **unpartitioned** band covers 0.8800, above both Mondrian
   arms (availability 0.8714, occurrence 0.8640).

A statement that omits either is not a candidate, because either alone would let a
reader conclude that occurrence is the partition to use, which the estate's own
numbers refuse.

**The statement, as a displacement of P10, verbatim:**

> and at the Beer Hall $94$ of $546$ calendar-closed days, or $17.2$ per cent, actually
> traded: drawn from the trading distribution and banded against a group of near-zero residuals,
> they cover $0.489$ against a nominal $0.900$ and carry $77$ per cent of the venue's coverage
> shortfall. Regrouping on realised occurrence lifts them to $0.926$ but costs Ellel $0.914$ against
> $0.843$, and here an unpartitioned band covers $0.880$, above either.

| | `texcount` | Δ against the 49 words it replaces |
|---|---|---|
| P10 clause as it stands | 49 | baseline |
| Displacement, no counterweights (not a candidate) | 46 | **−3** |
| **Displacement with both counterweights** | **69** | **+20** |

**Verified in situ**, not on the snippet: applying it to a scratch copy of
`results.tex` alongside the Part 3 corrections gives a counted body of **20,015**.

Every requirement is met. The cell is named (`calendar-closed days that traded`),
its size is stated (`94 of 546`), its coverage carries its nominal (`0.489 against
a nominal 0.900`), and both counterweights are present with their numbers.

Two things the statement deliberately omits and why. The Clopper-Pearson interval
[0.385, 0.595] is left out because the cell size is stated beside the coverage,
which is the requirement Part 4 of the S12 brief set; adding the interval costs a
further 6 words and would be the first thing to restore if the margin allowed. And
the Ellel and TRT `closed_traded` cells (0.000 at `n = 21`, 0.737 at `n = 38`) are
left out because the sentence is about the Beer Hall, and the following sentence
"Two River Taps carries a similar rate and Ellel a lower one" already survives
unchanged.

---

## Item 21 · Does it fit

**Not at all, at either form of the Part 3 correction set. It is short by 15
words.**

The arithmetic, all from `texcount` in situ:

| Position | Counted body | Margin |
|---|---|---|
| Baseline | 19,993 | +7 |
| Part 3 recommended set (A1 citation, realism +2, closure 0, fatigue 0) | 19,995 | **+5** |
| Part 3 with the most specific citation (A2) | 20,000 | **0** |
| Recommended set **plus** the C7 displacement with both counterweights | **20,015** | **−15** |

**Against the margin alone: no.** +20 against +5.

**Against the margin plus the Part 3 slack: yes, and only by executing a slack
item that is a human ruling.** 15 words is a small number against the menu in
report 87 section 3.4:

- Reversing the 8G refusal on §5.1's five question restatements releases **~57**,
  and the reduction register itself lists that reversal as one of three ways to
  restore a reserve. It was refused on readability, not on any criterion.
- Either located de-duplication (**~20** at `conclusion.tex:137-140`, **~13** at
  §5.4/§5.5) covers it alone or nearly alone.
- Relocating any ~15-word body clause to an appendix covers it exactly, and that
  lever is now connected (report 87, Part 1 item 6(ii)).

**None of those is mine to take, and none was taken.**

### The Further Work alternative, costed separately

If no slack is released, C7 becomes Further Work with a pointer. But the honest
pointer is not free either:

| Candidate | `texcount` | Notes |
|---|---|---|
| One-sentence pointer, no counterweights | **28** | "The cell that carries it is measured: the $94$ misgrouped Beer Hall days cover $0.489$ against $0.900$, and no partition tested here repairs the estate as a whole" |
| The same, appended to P17 | +28 | P17 is 100 words and already ends on "blocked rather than mechanical" |

**28 against a margin of 5 does not fit either.** So the two honest options are
identical in kind and differ only in size: 20 words with the full finding by
displacement, or 28 words with a pointer and no displacement saving. **The
displacement is the cheaper of the two and carries more.**

### The recommendation, stated as a ruling to be made rather than as a conclusion

**Three things are true at once and the ruling has to hold all three.**

1. **P10 is wrong as printed** and the correction is **−3 words**, independent of
   whether C7 enters. That saving is real and it is the only reduction in this
   whole package that also fixes a defect. It should be taken on its own merits
   even if C7 never appears.
2. **With the −3 taken, the corrected position is 19,992, margin 8**, and the C7
   counterweight sentence costs **+23** on top of the shortened clause. Still 15
   short. The number does not move.
3. **15 words is the whole gap between a measured finding entering the
   dissertation and not entering it**, and three separate slack items on file each
   cover it. That is Phuong's call, not an agent's.

**What is not in doubt:** the C7 result does not fit as an addition, it fits as a
displacement only if 15 words are released, and "Further Work with a pointer" is
the more expensive of the two, not the cheaper. **"Not at all" is the answer at the
current margin, and it costs 15 words to change.**

---

## Scope of every check in this report

| Check | Population | Instrument |
|---|---|---|
| Passage inventory | `chapters/*.tex` + `abstract.tex`, 7 files | grep over `exchangeab`, `Mondrian`, `conditional coverage`, `trading-day`, `trading day`, `structural-zero`, `structural zero`, then read in context |
| Passage word counts | extracted line spans | `texcount -0 -sum -merge -total` |
| Displacement costs | scratch copies of `results.tex`, whole file recounted | the same invocation, in situ |
| C7 numbers | `brain/eval/partition_contrast.json` | read, not recomputed |
| Reproduction against the document | `tab:coverage` rows, `fig:drift` caption, `results.tex:606` | compared value by value against the artefact |
| D-U6 statement | `log/Decision_and_Resolution_Log.md` rows at `:2605` and `:2636` | quoted |
| Store ceiling | `l1_daily` | `max(date)`, before and after: **2026-07-07** both times |

**Not checked:** whether the two counterweights are the only ones a reader would
need (report 86 section 6 lists three unanticipated findings; the third, TRT's
occurrence `closed_traded` interval excluding nominal from above, is omitted from
the proposed statement and its omission is a judgement). Whether `sec:res-traded`
would need a consequential edit if P10 changed. Whether a marker would read the
displaced sentence as clearer, which is not measurable here.

**Not edited:** every `.tex` file, `ref.bib`, every numbered decision-log row,
`eval/partition_contrast.py`, `eval/partition_contrast.json`, and every served
path. **No reduction was made.** Every figure above is a price, not an action.
