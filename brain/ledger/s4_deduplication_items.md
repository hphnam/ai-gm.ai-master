# S-4 — the cross-chapter de-duplication item list

**Built 2026-08-09. NOTHING APPLIED.** Per S-4's own gate: the item list plus per-item word costs
goes to Phuong **before** anything is applied, and Phuong rules **item by item**, not as a set.

## Headline, and it is a finding rather than a preamble

**S-4 as scoped cannot deliver ~6,100 words. The duplicated disclosure between Chapters 4 and 5 is
worth roughly 400–550 marker words, which is about 8 per cent of the target.**

The nine candidate spans in Chapter 5 total **992 raw words including the interpretive sentence
that stays in each**. Only the numeric restatement is available, so the realistic yield is under
half that. This is not an argument against running S-4; the items below are real duplication and
should go. It is an argument against believing S-4 closes the gap.

**Why the premise was wrong.** S-3's diagnosis was that *"the overrun is duplicated statistical
disclosure, not padding"*, and that diagnosis is **half right**. The same arguments genuinely are
stated twice. What does not follow is that the second statement is long. Chapter 5 restates a
number in a clause and spends its words on what the number means, which is its job. **The overrun
is not that Chapter 4 and Chapter 5 say the same thing twice; it is that four chapters written to a
20,000-word six-chapter document measure 23,151 on their own.**

Two consequences for how the remaining ~5,600 gets found, neither of which is a de-duplication
decision and neither of which is taken here:

- **A whole-section disposition in Chapter 4** — which is a composition change against an approved
  tree, i.e. an A-row reopening, not an S-4 item.
- **Accepting an overrun against HC1's 20,000** with a stated justification, which is a
  supervisor conversation.

Both are outside what this list can decide, and raising them is the point of measuring first.

## Method

Candidates were found **mechanically, not by reading for them**: every numeric token of the form
`\d+[.,]\d+` was extracted from both chapters with LaTeX comments stripped, and the intersection
taken. 42 tokens appear in both. Those cluster into 11 passages. Each was then opened and **the
quantity named**, per the rule that a value match is not an identity match.

**Two clusters were checked and are NOT items**, which is the check working:

- **`0.045`** (`results.tex`:60, `discussion.tex`:348) is the same quantity, but Chapter 5 uses it
  as the worked example of a gap found by recomputation, in the audit argument at 5.4. Different
  job, not a duplicate disclosure.
- **`1.8`** (`results.tex`:615, `discussion.tex`:37) is a **coincidence**: a standard-error multiple
  in one place and an unrelated figure in the other.

**On the word costs below.** They are **raw span counts from a scratch script and are orientation
figures only**, labelled as such per the rule that a number entering a decision comes from an
instrumented tool. The decision each one supports is *keep or cut*, which turns on custody rather
than on ±10 words. **The marker-equivalent cost of any approved item is measured with
`brain/scripts/wordcount.py` before and after it is applied**, and that is the number that reaches
any ledger.

---

## The items

Default custody, stated once so each row can say where it does **not** fit: **Chapter 4 keeps the
number and the measurement, Chapter 5 keeps the interpretation and cites back.**

---

### Item 1 — the coverage triple and its two corroborations

**Chapter 4**, `results.tex`:524–531, `sec:res-undercoverage`:

> The Beer Hall band covers $0.871$ against nominal $0.900$, a shortfall of about $3.6$ standard
> errors, and is below nominal at every horizon step; the served exogenous forecaster under-covers
> identically at $0.870$, interval $[0.853, 0.885]$, so this is a property of the construction and
> not of the point forecaster illustrating it.

**Chapter 5**, `discussion.tex`:88–100:

> Against a nominal ninety per cent the served band covers $0.871$ at the Beer Hall, $0.914$ at
> Ellel and $0.963$ at Two River Taps (Table~\ref{tab:coverage}), and the departures run in opposite
> directions. […] what carries the Beer Hall result is less the interval than two things that do not
> share the assumption: the served exogenous forecaster under-covers identically at $0.870$, so this
> is not a property of the point forecaster, and ranking each banded residual inside its own
> calibration pool returns implied coverages of $0.870$, $0.913$ and $0.962$, within $0.002$ of the
> measured figures (Table~\ref{tab:exchangeability}).

**Survivor: Chapter 4**, default fits. Chapter 5 keeps *"It does not, and the property is
exchangeability"* and the RQ answer, and cites `tab:coverage`.

**What the survivor must absorb.** Chapter 5 carries a qualification Chapter 4 states **differently
and more weakly**: Ch5's *"Those tests treat indicators from overlapping origins as independent,
which Section~\ref{sec:disc-limitations} records they are not"* against Ch4:520–522's *"these
intervals are mildly optimistic"*. **Ch5's is the sharper statement and must not be lost with the
numbers around it.** Also Ch5's *"The second is a decomposition of the same indicators rather than
an independent measurement, so it locates the departure … without adding precision to its size"* —
a limit on the corroboration that appears **only** in Chapter 5. Both are qualifiers, both protected.

**Span 179 raw. Available: yes, an estimated 90–110.**

---

### Item 2 — the traded-day decomposition

**Chapter 4**, `results.tex`:581–589 (`sec:res-traded`) reports 0.892 / 0.692 / 0.964, the 240 and
945 counts, the seven-standard-error shortfall and the 0.983 false-open figure.

**Chapter 5**, `discussion.tex`:104–112:

> On the days each venue traded, coverage is $0.892$ at the Beer Hall, $0.692$ at Ellel and $0.964$
> at Two River Taps (Table~\ref{tab:coverage-traded}). The venue whose band fails in the unsafe
> direction is Ellel, whose marginal figure is a weighted average of $0.983$ over $945$ days it took
> nothing with $0.692$ over the $240$ it traded

**Survivor: Chapter 4.** **NOT AVAILABLE on the Chapter 4 side** — `sec:res-traded`'s relocation is
already ruled and closed (§F, 2026-08-08) and this pass does not reopen it. The Chapter 5 copy is
available.

**What the survivor must absorb.** Nothing from Ch5's numbers, but Ch5's *"What changes is the
subject of the finding rather than the finding"* and the trading-day mean-rank prediction
(0.5199 / 0.8127 / 0.4786) are interpretation and stay. **Terminology constraint:** both copies were
rewritten on 2026-08-08 out of `active` into *trading-day* / *calendar-open*. Any edit here is
re-exposed to the three-population trap and must be re-read against the generator.

**Span 150 raw. Available: yes on the Ch5 side only, an estimated 60–80.**

---

### Item 3 — the numerics-sensitivity disclosure

**Chapter 4**, `results.tex`:850–858:

> Regenerating under numpy 1.26.4 rather than the committed 2.5.1 moves coverage figures by at most
> $0.004$ and the largest Winkler mean by $25$ points on $1814$ […] At Two River Taps per-step
> calibration is eliminated as its $p$ falls from $0.191$ to $0.036$, and pooled split conformal
> rises from $0.209$ to $1.000$, displacing the incumbent as the surviving arm and returning an
> adoption candidate where the committed regime returns none; Ellel is stable in every verdict.

**Chapter 5**, `discussion.tex`:296–302:

> Regenerating the interval-calibration arms under \texttt{numpy} 1.26.4 in place of the committed
> 2.5.1 moves two verdicts at Two River Taps. Per-step calibration is retained under the committed
> regime and eliminated under the other, its exclusion $p$-value falling from $0.191$ to $0.036$;
> and pooled split conformal rises from $0.209$ to $1.000$, displacing the incumbent as the
> surviving arm and appearing as an adoption candidate where the committed regime returns none.

**This is the closest thing to verbatim duplication in the two chapters.** Survivor: **Chapter 4**,
default fits.

**What the survivor must absorb: nothing, and this is the row where that matters.** Chapter 5's
*next* sentences are the Monte Carlo argument — *"a $p$-value near $0.19$ carries a Monte Carlo
standard error of about $0.0124$, so a move of $0.155$ is about twelve times resampling noise and is
not explained by it"* — which is **interpretation, is not in Chapter 4, and is the reason the
paragraph exists.** Cutting the restatement must leave it standing and still legible, so the
survivor sentence has to name the two moves it is about even after it stops re-deriving them.

**Span 99 raw. Available: yes, an estimated 50–60.**

---

### Item 4 — the pairing factor and the R24 correction · **NOT AVAILABLE**

Chapter 5 5.3 carries the 6.2 ratio, the failed cancellation and the venue-dependence; Chapter 4
4.1 carries the three gap multiples and the Two River Taps dependence correction. **These are not
two copies of one argument. They are two different arguments** that happen to share a mechanism, and
they were written into their current split deliberately on 2026-08-09, including the explicit
decision not to repair Beer Hall's and Ellel's figures in both places.

**Flagged not available: newly created disclosure, already single-sited by construction.** Same
category as `sec:res-traded`. Re-merging it would undo a de-duplication rather than perform one.

---

### Item 5 — the weather contrast

**Chapter 4** `results.tex`:442–453. **Chapter 5** `discussion.tex`:70–75:

> One contrast does exclude zero, no weather against the horizon-matched basis at the Beer Hall at
> $+0.0163$ MASE with a ninety per cent interval of $[0.0004, 0.0337]$ […] the weather effect is
> consistently signed and roughly seven times the $0.0023$ spread among the four bases.

**Survivor: Chapter 4**, default fits. Chapter 5 keeps *"What is absent is separability and not a
mechanism"*.

**QUALIFIER ALERT, highest severity on this list.** This passage contains the exact clause whose
compression is on record in `PRJ93_RULES.md`: *"the only weather contrast excluding zero"* lost
`weather` during the abstract trim and became false, because Ellel carries three basis-versus-basis
contrasts excluding zero. **`weather` and `no weather against the horizon-matched basis` are
load-bearing and are not shortened.** If the cut cannot be made without touching them, it is not
made.

**Span 83 raw. Available: yes, an estimated 40–50, with the qualifier constraint binding.**

---

### Item 6 — grouping displacements

**Chapter 4** `results.tex`:378–379. **Chapter 5** `discussion.tex`:75–79 restates £4.27, £10.94 and
the £185 widest single origin.

**Survivor: Chapter 4**, default fits. Chapter 5 keeps *"Grouping likewise moves the forecast
without moving its accuracy"*, which is the sentence that answers RQ3.

**What the survivor must absorb.** Chapter 5 carries the normalisation Chapter 4 does not state in
the same breath — *"against each venue's own trailing level is between one and three per cent and is
largest at the venue with the smallest absolute figure"*. That inversion is the interesting part and
is interpretation; it stays, and Chapter 4 may need the trailing-level figures beside its
displacements so the surviving clause remains checkable.

**Span 57 raw. Available: yes, an estimated 30–40.**

---

### Item 7 — the VUS-PR cells

**Chapter 4** carries `tab:vuspr` (`results.tex`:916–922) and the prose at 928–929.
**Chapter 5** `discussion.tex`:119–123 restates 0.760, 0.704, 0.932 and 0.996.

**Survivor: Chapter 4**, default fits. Chapter 5 keeps *"Detection is weakest on point events"* and
the ten-of-twelve bootstrap-pair reading.

**What the survivor must absorb.** Chapter 5's *"the two that fail both involve Two River Taps' spike
cell, so the weakness on point events is established at two venues rather than as a partition of the
families"* is a **scope limit on the finding** and is protected.

**Span 90 raw. Available: yes, an estimated 35–45.**

---

### Item 8 — the recall figure and the cost sweep

**Chapter 4** `results.tex`:938–947. **Chapter 5** `discussion.tex`:123–129 restates 124 misses, 75
spurious items, the 644 corpus and recall 0.807 with its interval.

**Survivor: Chapter 4**, default fits. Chapter 5 keeps *"no operating point is available to select"*
and the asymmetry argument.

**Where the default is under strain.** Chapter 5's sentence is the answer to RQ5, and an answer that
says *"not as the question poses it"* has to show enough of the sweep to be legible. **Recommend
keeping the four ratios and the 1:1 to 10:1 range in Chapter 5** and cutting only the corpus counts,
which Chapter 4 owns.

**Span 105 raw. Available: partially, an estimated 30–40.**

---

### Item 9 — the Mondrian partition counts

**Chapter 4** `results.tex`:684 and 698 (79.8 per cent of Ellel's calendar-open group; 94 of 546, or
17.2 per cent, at the Beer Hall). **Chapter 5** `discussion.tex`:412–417 restates both inside the
five-assumptions structure.

**Survivor: default does NOT fit cleanly.** Chapter 5's Limitations section is built as *"Five
assumptions carry the results and each has a stated consequence if it fails"*, and an assumption
whose consequence is stated without its magnitude is not a limitation, it is a gesture. The two
rates are what make the limb asymmetry legible.

**Recommendation: keep both rates in Chapter 5, cut the supporting counts** (94, 546, 1300, 1037)
which Chapter 4 owns, and keep Chapter 5's *"The two limbs are not a matched pair. They differ by a
factor of eleven in their counts"*, which appears **only** in Chapter 5.

**Span 115 raw. Available: partially, an estimated 35–45.**

---

### Item 10 — the Winkler adoption result

**Chapter 4** `results.tex`:818–825. **Chapter 5** `discussion.tex`:177–183:

> Only at Ellel is the difference separable, every alternative eliminated at $p \le 0.016$; at the
> other two venues all five arms are retained. The adaptive arm also buys the Beer Hall's coverage
> back to $0.895$ at a width the Winkler score charges for

**Survivor: Chapter 4**, default fits. Chapter 5's job here is the divergence-from-literature
argument against Zaffran and Sun, which is genuinely interpretive and is not in Chapter 4.

**What the survivor must absorb.** Chapter 5's *"so the two measures disagree and the score is the
arbiter the adoption rule names"* is the sentence that makes the divergence a reasoned position
rather than a contradiction, and it depends on the reader knowing coverage improved while Winkler
worsened. **The 0.895 may have to stay** for that clause to parse.

**Span 114 raw. Available: partially, an estimated 40–50.**

---

## Totals

| | Raw span | Estimated available |
|---|---|---|
| Nine candidate items | 992 | **~410–520** |
| Item 4 (pairing / R24) | — | **0, not available** |
| **Against the S-4 target** | | **~6,100** |

**Coverage of target: roughly 8 per cent.**

## What is deliberately not proposed

- **Any cut to `sec:res-traded`** — ruled and closed.
- **Any cut to the R24 material** — created this session, single-sited by construction.
- **Any qualifier**, per the constraint written into the S-4 row. Where a cut cannot be made without
  a qualifier, the row says so and the cut is not made.
- **Whole-section disposition in Chapter 4** — that is a composition change against an approved
  tree and belongs to an A-row, not to S-4.

---

# PASS ONE APPLIED — 2026-08-09, ruled item by item by Phuong

| # | Ruling | Applied as |
|---|---|---|
| 1 | approve, conditional | Ch4 caveat upgraded + corroboration limit migrated in, **then** Ch5 cut |
| 2 | approve | Ch5 side only |
| 3 | approve | **PARTIAL, reported not trimmed** (below) |
| 4 | not available | closed, untouched |
| 5 | **DECLINE** | untouched; verified by diff that the span was never entered |
| 6 | approve | applied |
| 7 | approve | applied, scope limit preserved |
| 8 | approve partial | ratios kept, corpus counts cut |
| 9 | approve as scoped | both rates kept, supporting counts cut |
| 10 | approve partial | `0.895` kept, it is load-bearing for "the two measures disagree" |

## Realised yield, measured rather than estimated

**`wordcount.py`, marker-equivalent: Ch 4 7,651 → 7,712 (+61). Ch 5 5,036 → 4,870 (−166). Net
−105.** Four-chapter total **23,151 → 23,046**.

**Against the orientation estimate of 370–470, this is a factor of ~3.5 short**, and both reasons
are worth keeping.

1. **#1's condition added words to Chapter 4 by design.** Replacing *"these intervals are mildly
   optimistic"* with the sharper statement, and migrating in Chapter 5's corroboration limit, cost
   +61. That was the price of the item rather than an overrun: the alternative was a downgrade
   wearing a cut's clothes.
2. **Every cut was made qualifier-first**, so the realised share of each span came in near half of
   what the span suggested. The estimate assumed the interpretive sentence was the only thing
   staying; in practice the scope limits stayed too.

**This is the fifth instance on record of an ad-hoc figure disagreeing with the instrumented one,
and the first where the ad-hoc figure was optimistic about a SAVING rather than about a result.**
The direction is the same in substance: the throwaway number flattered the thing about to be acted
on. The costs above are the instrumented ones.

## #3, reported rather than trimmed to target

The instruction was to stop and report if removing the restatement made the paragraph's reason
opaque. It would have. Chapter 5's Monte Carlo argument reads *"a $p$-value near $0.19$ carries a
Monte Carlo standard error of about $0.0124$, so a move of $0.155$ is about twelve times resampling
noise"*, and $0.155 = 0.191 - 0.036$. **Cutting `0.191 → 0.036` would have left the argument
referring to a move the reader can no longer see.** Only the second move (`0.209 → 1.000`), which
the Monte Carlo argument does not use, was cut.

## Unlooked-for side benefit

**`venueordercheck` falls 8 → 5**, all three removals in Chapter 5. Removing a positional venue
triple is exactly the remedy that instrument asks for, so de-duplicating Chapter 5's restatements
discharged three of its findings as a by-product.

## Instrument defect found and fixed during this pass

**`venueordercheck` printed `VERDICT: PASS` having scanned ZERO files.** The caller was zsh, where
an unquoted `$A` holding `"chapters abstract.tex"` does **not** word-split, so one invalid path was
passed and nothing matched. The verdict was true of what it examined and said nothing about the
document. It was caught only because the number disagreed with a run minutes earlier.

Both path-list checkers now **fail closed on an empty scan** (`venueordercheck.py`,
`figurecheck.py`), and both guards were **exercised against the violation before being trusted**:
empty scan → exit 1, bad path → non-zero, self-tests still pass, real runs unchanged.

**The general form, which is the reusable part:** *a check that examined nothing must not be able to
report a clean result.* Every guard in this project that takes a path list has this failure mode,
and the exit code is honest in exactly the way the rules warn about, reporting what the script
decided rather than what it covered.

## What pass one does NOT close

**~5,600 of the ~6,100 remains, and de-duplication is not the instrument for it.** Ruled by Phuong,
2026-08-09, and recorded here so it is not re-litigated:

- **Not a whole-section disposition in Chapter 4.** Cutting a section from an approved tree to hit a
  total would remove reconciled measurement, which is the material that survived four rounds of
  audit precisely because it is what makes the claims defensible.
- **Write the two unwritten chapters first and measure.** Introduction 1,400 + Conclusions 1,100 +
  abstract 300 = 2,800 budgeted, and the projection assumes they land at budget. Both are summaries
  of decisions taken elsewhere and may come in under. **The reallocation decision is taken on six
  real floors, not four plus a forecast.**
- **If the total still lands materially over 20,000, the answer is an accepted overrun with a stated
  justification**, and the justification is already assembled: the audits, the reconciliations, the
  restored qualifiers, and a scope that grew because externally-specified data never arrived.
  **Cutting the evidence to hit a number is not the answer.**
