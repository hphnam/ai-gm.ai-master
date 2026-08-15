# 95 · S20, Mondrian × AgACI: can adaptive calibration repair a misspecified partition?

Package S20. Instrument: `brain/eval/mondrian_aci.py`. Artefact:
`brain/eval/mondrian_aci.json`. Tests: `brain/tests/test_mondrian_aci.py` (26 tests,
all passing).

**HEAD SHA at start: `8f1d86c60279f5471d32cd03ec4521d803ab8294`.**
**HEAD SHA at end: recorded in §11.**

Store ceiling asserted **2026-07-07** before and after every pass. Level 0.90,
warmup pool 140, point model `rung2_ets` at all three venues, γ grid
`(0.005, 0.01, 0.02, 0.05, 0.1)`. Environment `.venv-forecast`, python 3.12.13,
Darwin arm64. Total wall **32.9 s** over three venues; no arm approached the
thirty-minute threshold (§9).

**Nothing in this package enters the dissertation.** No `.tex` file was touched, no
reduction was made, no word was spent, and **no placement recommendation is made
here**. The verdict on placement is taken elsewhere, after these numbers exist.

**The composition is prior art.** Bharti, Pal, Teneggi and Sulam, *Parameter-Free and
Group Conditional Online Conformal Prediction*, arXiv:2606.00419 (v1 2026-05-29, v4
2026-07-07; **no journal-ref and no peer-reviewed venue of record**), introduce POGO
and claim it is *"the first parameter-free algorithm for group-conditional online
conformal prediction"*. Report 84 §A.3 records that POGO's stock experiment already
defines Mondrian groups by *"calendar-year markers such as day-of-week"*. **A
calendar-defined group-conditional online conformal arm is therefore not novel and
nothing here claims it is.** This is an empirical measurement on one estate.

---

## 0 · The pre-registration, and the proof it came first

Decision log **row 112**, committed **`6348a082`** at **2026-08-15T17:33:52+01:00**.
The instrument's first commit is **`d76abf7c`** at **2026-08-15T17:40:22+01:00**,
six minutes and thirty seconds later. Ordering is checkable from `git log`; no
prediction below was written or revised after any output was seen.

Quoted from row 112(j):

> **P1.** At the Beer Hall, cell coverage for scheduled-closed-but-traded rises from
> 0.489 under arm B toward nominal under arm D.
> **P2.** At the Beer Hall, mean interval width in the calendar-closed group increases
> under arm D relative to arm B. Adaptation pays for the cell out of the group.
> **P3.** At the Beer Hall, arm D does not overtake arm A.
> **P4.** At Ellel, arm D's adaptation is dominated by the group whose mass is zeros …
> and the calendar-open group's bands widen without conditional coverage improving
> proportionally.
> **P5.** The misgrouping counts are unchanged across all arms: **94, 21, 65**.

---

## 1 · Refuted predictions, first

### 1.1 · P4 is REFUTED, and the width moved in the opposite direction

P4 predicted that at Ellel the calendar-open group's **bands widen**. They **narrowed**,
and coverage fell with them.

| Ellel, calendar-OPEN group | n | coverage | Clopper-Pearson | mean width |
|---|---|---|---|---|
| B, Mondrian fixed | 1,185 | 0.9257 | [0.909, 0.940] | **713.31** |
| D, Mondrian × AgACI | 1,185 | 0.8852 | [0.866, 0.903] | **703.77** |

Width **−9.55** (−1.34 %), coverage **−0.0405**, both read from the artefact's
`b_to_d_group_deltas` at full precision rather than differenced from the rounded display
values above. The prediction was that adaptation would buy
width in this group and fail to convert it into conditional coverage. What happened is
that adaptation **sold** width and lost coverage as well. The prediction's mechanism —
that the zero-dominated group drags the adaptation — is not what the numbers show;
the group simply got tighter and worse on both counts.

**Stated without softening: the width limb of P4 is wrong in sign, and the coverage
limb is wrong about the reason.** The two CIs do not overlap, so the coverage move is
not a reading artefact.

### 1.2 · P1 is REFUTED in substance; its sign held and nothing else did

| Beer Hall, `closed_traded` cell | n | coverage | Clopper-Pearson |
|---|---|---|---|
| B, Mondrian fixed | **94** | 0.4894 | [0.385, 0.595] |
| D, Mondrian × AgACI | **94** | 0.5213 | [0.416, 0.625] |

The cell rose by **+0.0319** against a gap to nominal of **0.4106** — it travelled
**7.8 per cent** of the distance P1 said it would travel. Arm D's interval
[0.416, 0.625] **excludes nominal 0.900 by 0.275**, and the two arms' intervals overlap
across almost their entire length.

**No between-arm significance test was pre-registered, so none is run**; row 112(i)
committed only to Clopper-Pearson per cell, and choosing an adjudicating test after
seeing the result is the move this package exists to avoid. On the instrument that was
pre-registered, the movement is not distinguishable from no movement.

**P1 does not hold.** Adaptation did not move the misgrouped cell toward nominal in any
degree this instrument can separate from zero. The sign was right and that is all.

---

## 2 · The reproduction checks

### 2.1 · R5 — arm B against C7's published Mondrian coverage. **PASS.**

Compared at **four decimal places**, the precision report 86 published in §§3.1–3.3.
The persisted full-precision floats are read from `eval/partition_contrast.json`, not
transcribed; the published literals are carried separately so a drift between the
artefact and the *report* would also fail.

| Venue | cell n | arm B measured | persisted (C7) | abs diff, full precision | published | verdict |
|---|---|---|---|---|---|---|
| beer_hall | 94 | 0.48936170212765956 | 0.48936170212765956 | **0.0** | 0.4894 | **MATCH** |
| ellel | 21 | 0.0 | 0.0 | **0.0** | 0.0000 | **MATCH** |
| two_river_taps | 38 | 0.7368421052631579 | 0.7368421052631579 | **0.0** | 0.7368 | **MATCH** |

Agreement is **exact at full precision**, not merely at four places. Arm B is the
baseline every comparison runs through, so this is the check that most matters, and it
holds.

### 2.2 · R4 — arm E against C7's published ORACLE coverage. **PASS.**

| Venue | cell n | arm E measured | persisted (C7) | abs diff | published | verdict |
|---|---|---|---|---|---|---|
| beer_hall | 94 | 0.925531914893617 | 0.925531914893617 | **0.0** | 0.9255 | **MATCH** |
| ellel | 21 | 1.0 | 1.0 | **0.0** | 1.0000 | **MATCH** |
| two_river_taps | 38 | 1.0 | 1.0 | **0.0** | 1.0000 | **MATCH** |

**Arm E is an ORACLE and is not deployable.** Occurrence is unknown at forecast time.

### 2.3 · P5 — membership invariance. **PASS**, exact, integer, no tolerance.

| Venue | persisted `n_calendar_closed_but_traded` | records frame | banded frame, every arm | identical across arms |
|---|---|---|---|---|
| beer_hall | 94 | **94** | 94 | **yes** |
| ellel | 21 | **21** | 21 | **yes** |
| two_river_taps | 65 | **65** | **38** | **yes** |

Checked across all ten banded arms (the five factorial arms plus the five fixed-γ ACI
arms). `verify_membership` raises on mismatch and has three tests, two of them in the
failing direction.

**Frame note, because the package brief conflates two populations.** 94 / 21 / 65 are
**record-frame** counts. On the **banded** frame, smaller because the first 140 pool
residuals are consumed by the warmup, Two River Taps' cell is **38, not 65** — and R5's
0.737 is a coverage over those 38. Both frames are given above; no coverage is quoted
against a frame it was not computed on.

---

## 3 · Coverage and width by arm, venue and cell

Nominal 0.900. Clopper-Pearson exact binomial, α = 0.05, pre-registered in row 112(i).
**Every coverage carries its cell size.**

### 3.1 · Beer Hall (banded n = 1,750; records n = 1,911)

| Cell | n | A cov | B cov | C cov | D cov | E ORACLE cov |
|---|---|---|---|---|---|---|
| open_traded | 1,229 | 0.8462 | 0.8926 | 0.8625 | 0.8942 | 0.8804 |
| open_took_nothing | 21 | 0.3333 | 0.3810 | 0.3333 | 0.5714 | 0.0000 |
| **closed_traded** | **94** | **0.9255** | **0.4894** | **0.9255** | **0.5213** | **0.9255** |
| closed_took_nothing | 406 | 1.0000 | 0.9212 | 1.0000 | 0.9039 | 0.8448 |
| **marginal** | 1,750 | **0.8800** | **0.8714** | **0.8914** | **0.8726** | **0.8640** |

| Cell | n | A width | B width | C width | D width | E ORACLE width |
|---|---|---|---|---|---|---|
| open_traded | 1,229 | 1067.31 | 1276.08 | 1144.43 | 1306.46 | 1216.57 |
| open_took_nothing | 21 | 1342.61 | 1460.41 | 1826.90 | 2039.79 | 137.72 |
| **closed_traded** | **94** | 699.79 | **187.69** | 849.20 | **238.92** | 805.80 |
| closed_took_nothing | 406 | 623.21 | 158.71 | 665.49 | 185.48 | 147.05 |
| **marginal** | 1,750 | **947.84** | **960.60** | **1025.65** | **997.85** | **933.43** |

Intervals on the two cells that carry the argument: `closed_traded` A [0.853, 0.970],
B [0.385, 0.595], C [0.853, 0.970], D [0.416, 0.625], E [0.853, 0.970].

### 3.2 · Ellel (banded n = 1,659; records n = 1,820)

| Cell | n | A cov | B cov | C cov | D cov | E ORACLE cov |
|---|---|---|---|---|---|---|
| open_traded | 240 | 0.6292 | 0.6917 | 0.6208 | 0.6833 | 0.7875 |
| open_took_nothing | 945 | 0.9439 | 0.9852 | 0.8952 | 0.9365 | 0.7820 |
| **closed_traded** | **21** | 0.6667 | **0.0000** | 0.6667 | **0.0000** | 1.0000 |
| closed_took_nothing | 453 | 1.0000 | 0.9249 | 1.0000 | 0.9382 | 0.9912 |
| **marginal** | 1,659 | **0.9102** | **0.9138** | **0.8813** | **0.8885** | **0.8427** |

| Cell | n | A width | B width | C width | D width | E ORACLE width |
|---|---|---|---|---|---|---|
| open_traded | 240 | 643.69 | 806.58 | 678.61 | 817.88 | 1323.19 |
| open_took_nothing | 945 | 596.15 | 689.63 | 572.74 | 674.78 | 175.87 |
| **closed_traded** | **21** | 510.97 | **0.00** | 478.12 | **12.49** | 1064.32 |
| closed_took_nothing | 453 | 497.57 | 14.33 | 490.62 | 35.49 | 133.24 |
| **marginal** | 1,659 | **575.03** | **513.42** | **564.44** | **512.54** | **341.45** |

### 3.3 · Two River Taps (banded n = 1,274; records n = 1,435)

| Cell | n | A cov | B cov | C cov | D cov | E ORACLE cov |
|---|---|---|---|---|---|---|
| open_traded | 903 | 0.9391 | 0.9646 | 0.8981 | 0.9347 | 0.9590 |
| open_took_nothing | 7 | 0.0000 | 0.5714 | 0.0000 | 0.0000 | 0.0000 |
| **closed_traded** | **38** | 0.8158 | **0.7368** | 0.8421 | **0.7632** | 1.0000 |
| closed_took_nothing | 326 | 1.0000 | 0.9939 | 1.0000 | 0.9448 | 0.9939 |
| **marginal** | 1,274 | **0.9458** | **0.9631** | **0.9176** | **0.9270** | **0.9639** |

| Cell | n | A width | B width | C width | D width | E ORACLE width |
|---|---|---|---|---|---|---|
| open_traded | 903 | 593.13 | 657.21 | 568.70 | 636.72 | 632.76 |
| open_took_nothing | 7 | 593.36 | 695.60 | 573.41 | 583.77 | 333.12 |
| **closed_traded** | **38** | 383.09 | 262.98 | 493.02 | 274.11 | 406.75 |
| closed_took_nothing | 326 | 338.55 | 224.85 | 319.47 | 193.27 | 213.42 |
| **marginal** | 1,274 | **521.73** | **535.02** | **502.70** | **512.14** | **517.07** |

### 3.4 · By Mondrian group, which is what P2 and P4 are claims about

Group 0 = calendar-open, group 1 = calendar-closed.

Δ columns are the artefact's `b_to_d_group_deltas` fields, computed in the instrument at
full precision — **not** differenced from the rounded widths in the same row. The two
disagree at Ellel (−9.55 instrumented against −9.54 by hand), which is why the field
exists.

| Venue | group | n | B cov | D cov | B width | D width | Δ cov | Δ width | Δ width % |
|---|---|---|---|---|---|---|---|---|---|
| beer_hall | open | 1,250 | 0.8840 | 0.8888 | 1279.18 | 1318.78 | +0.0048 | **+39.60** | +3.10 % |
| beer_hall | **closed** | **500** | 0.8400 | 0.8320 | **164.16** | **195.52** | −0.0080 | **+31.36** | **+19.10 %** |
| ellel | **open** | **1,185** | 0.9257 | 0.8852 | **713.31** | **703.77** | −0.0405 | **−9.55** | **−1.34 %** |
| ellel | closed | 474 | 0.8840 | 0.8966 | 13.69 | 34.47 | +0.0127 | +20.78 | +151.74 % |
| two_river_taps | open | 910 | 0.9615 | 0.9275 | 657.50 | 636.32 | −0.0341 | −21.18 | −3.22 % |
| two_river_taps | closed | 364 | 0.9670 | 0.9258 | 228.83 | 201.71 | −0.0412 | −27.12 | −11.85 % |

**Arm D widens a calendar group at exactly one venue-group of the six: the Beer Hall's
calendar-closed group, which is P2's.** At the other five it either barely moves the
width or narrows it.

---

## 4 · Degenerate intervals by arm and group

Per row 112(g) these are **results, not diagnostics**. Three kinds, each with the scope
it is exact over. At level 0.90 the attainable minimum is **n = 9**.

### 4.1 · Zero-width intervals (`hi − lo == 0`), attributed by the AVAILABILITY group for every arm

| Venue | A | B | C | **D** | E ORACLE |
|---|---|---|---|---|---|
| beer_hall | 0 | 20 (all group 1) | 0 | **18 (all group 1)** | 83 (all group 1) |
| ellel | 0 | **308** (all group 1) | 0 | **294 (all group 1)** | 181 (111 open / 70 closed) |
| two_river_taps | 0 | 0 | 0 | **0** | 0 |

Every zero-width interval in arms B and D sits in the **calendar-closed** group at both
venues where any occurs. Arms A and C, which do not partition, produce none anywhere.

### 4.2 · Level-excursion clamps (effective α leaving [0,1], counted by `ACI.clamps`)

Adaptive arms only; fixed arms cannot excurse.

| Venue | C (ungrouped) | **D, group 0 (open)** | **D, group 1 (closed)** |
|---|---|---|---|
| beer_hall | 339 | **192** | **96** |
| ellel | 127 | **50** | **10** |
| two_river_taps | 124 | **29** | **0** |

### 4.3 · Attainability clamps — the group's calibration slice too small for the level

**Fixed Mondrian arms, counted in rows, with the scope of the scan stated** (a zero over
an unexamined loop would be UNKNOWN, not clean):

| Venue | arm B clamped rows | (origin, group) events examined | smallest group slice seen |
|---|---|---|---|
| beer_hall | **0** | 500 | 39 |
| ellel | **0** | 474 | 40 |
| two_river_taps | **0** | 364 | 37 |

| Venue | arm E ORACLE clamped rows | events examined | smallest slice |
|---|---|---|---|
| beer_hall | **0** | 497 | 39 |
| ellel | **0** | 409 | 21 |
| two_river_taps | **0** | 351 | 14 |

Arm E's groups are **occurrence** groups, which is what it bands on. Arm A is ungrouped
and its pool is never below the 140 warmup, so the level is always attainable.

**Arm D, counted in `safe_conformal_quantile` CALLS** (not rows — arm D's quantile is
drawn per expert per step per group, so calls and rows are not commensurable):

| Venue | total calls | group 0 attainability | group 0 max-residual | group 1 attainability | group 1 max-residual | degenerate share |
|---|---|---|---|---|---|---|
| beer_hall | 8,750 | 64 | 218 | **260** | 96 | **7.3 %** |
| ellel | 8,295 | 14 | 52 | **111** | 10 | **2.3 %** |
| two_river_taps | 6,370 | 10 | 42 | **110** | 0 | **2.5 %** |

`group_pool_empty` fired **0 times at every venue**: no group was ever absent from the
pool at a banding origin, so the documented fallback to the whole pool was never taken.

**Scope limit, stated rather than left as a gap.** Arm C's attainability clamps are not
separately attributable. Its bands are produced inside `run_online`, which computes
every arm in one pass, so a tap installed there would count calls belonging to arms P,
D, S and the five fixed-γ arms as well — and `run_online` is reused unmodified per the
build constraint. Arm C's level-excursion count (§4.2) is reported in its place.

---

## 5 · Did each prediction hold?

| Prediction | Outcome |
|---|---|
| **P1** BH `closed_traded` rises from 0.489 toward nominal under D | **REFUTED in substance.** 0.4894 → 0.5213, +0.0319 of a 0.4106 gap. D's CI [0.416, 0.625] excludes nominal by 0.275 and overlaps B's across almost its whole length. Sign held; nothing else did |
| **P2** BH calendar-closed group width increases under D vs B | **HELD.** 164.16 → 195.52, **+31.36 (+19.1 %)**, n = 500 |
| **P3** BH arm D does not overtake arm A | **HELD.** A 0.8800 [0.864, 0.895] at width 947.84; D 0.8726 [0.856, 0.888] at width 997.85. D is further from nominal **and** wider |
| **P4** Ellel calendar-open group's bands widen without proportional coverage gain | **REFUTED.** Width **fell** 713.31 → 703.77 and coverage **fell** 0.9257 → 0.8852, CIs disjoint. Wrong in sign on width |
| **P5** misgrouping counts unchanged across all arms: 94, 21, 65 | **HELD**, exactly, as integers, across all ten banded arms |

### The refutation criteria

| Criterion | Fired? |
|---|---|
| **R1** P1 holds and P2 does not ⇒ adaptation repaired misspecification, C7 framing wrong | **NO.** The reverse: P2 held and P1 did not. The group paid the width and the cell did not collect |
| **R2** D beats A at BH on both coverage and width ⇒ C7's "partition does not pay here" reverses | **NO.** D beats A on neither |
| **R3** Ellel marginal coverage improves under D without the oracle ⇒ sparse-venue account needs rewriting | **NO.** B 0.9138 [0.899, 0.927] → D 0.8885 [0.872, 0.903]. Absolute distance to nominal moves 0.0138 → 0.0115, a change roughly a tenth the width of either interval, and **D crosses from over-coverage to under-coverage** |
| **R4** arm E must reproduce 0.926 / 1.000 / 1.000 | **PASS**, exact at full precision (§2.2) |
| **R5** arm B must reproduce 0.489 / 0.000 / 0.737 | **PASS**, exact at full precision (§2.1) |

**No refutation criterion fired, and two of the five predictions were wrong.** The C7
framing survives: adaptation changed the level, did not change membership, and did not
repair the misgrouped cell.

### Is the result null?

Row 112(l) pre-committed a null verdict if arms B, C and D were indistinguishable within
their intervals. **The answer differs by venue and the clause is therefore partially
engaged**, which is worth stating precisely rather than resolving one way.

| Venue | B marginal | C marginal | D marginal | which pairs have disjoint intervals |
|---|---|---|---|---|
| beer_hall | 0.8714 [0.855, 0.887] | 0.8914 [0.876, 0.906] | 0.8726 [0.856, 0.888] | **none — all three overlap pairwise** |
| ellel | 0.9138 [0.899, 0.927] | 0.8813 [0.865, 0.896] | 0.8885 [0.872, 0.903] | B/C only |
| two_river_taps | 0.9631 [0.951, 0.973] | 0.9176 [0.901, 0.932] | 0.9270 [0.911, 0.941] | B/C and B/D |

**At the Beer Hall — the venue this package is centred on — arms B, C and D are
marginally indistinguishable**, and row 112(l)'s null verdict applies there: on marginal
coverage, this venue's data cannot separate the three calibration strategies. That sits
**alongside** the existing Model Confidence Set result rather than against it. It does
**not** extend to the other two venues, where B separates from C at both and from D at
Two River Taps, nor to the per-cell contrasts, where the `closed_traded` separations in
§3 are wide and unambiguous. What is null at the Beer Hall is the **marginal**; what is
refuted everywhere is the **repair**.

---

## 6 · Every fixed-γ arm, reported in full

Row 112(f) requires that if any fixed-γ arm runs, **every** γ in the pre-registered grid
is reported including ones that perform badly, and that no γ is selected on results.
These arms are ungrouped, so their `closed_traded` figure is the unpartitioned one.

| Venue | γ = 0.005 | 0.01 | 0.02 | 0.05 | 0.1 |
|---|---|---|---|---|---|
| beer_hall marginal | 0.8897 | 0.8880 | 0.8880 | 0.8954 | 0.8977 |
| beer_hall width | 986.22 | 992.68 | 1021.08 | 1041.49 | 1175.68 |
| ellel marginal | 0.9114 | 0.9066 | 0.9030 | 0.9017 | 0.8999 |
| ellel width | 587.85 | 573.46 | 544.80 | 575.94 | 667.72 |
| ellel `closed_traded` (n=21) | 0.6667 | 0.6667 | 0.6667 | 0.7619 | 0.7143 |
| two_river_taps marginal | 0.9403 | 0.9294 | 0.9152 | 0.9050 | 0.9003 |
| two_river_taps width | 522.47 | 504.46 | 493.99 | 505.21 | 525.67 |
| two_river_taps `closed_traded` (n=38) | 0.7895 | 0.7895 | 0.7895 | 0.8158 | 0.8684 |

Beer Hall `closed_traded` is **0.9255 at every γ** (n = 94). **No γ is selected and none
is recommended.** Note that Ellel's `closed_traded` is not monotone in γ (0.6667 at three
rates, 0.7619 at 0.05, 0.7143 at 0.1) on a cell of twenty-one, which is what a
twenty-one-observation cell looks like.

---

## 7 · Unsolicited findings

### 7.1 · The package brief names the wrong module, and following it would have refuted R5

Build constraint 10 states that `signals/residual.py` supplies the residual stream and
group assignment. **It does not.** Report 86 §8 recorded this in S12:

> `signals/residual.py` was read and is **NOT** the right foundation here: it supplies
> the deviation detector's stream, a different object from the conformal calibration
> pass, and importing it would have measured the wrong band.

Constraint 10 and Part 3.1's requirement that arm B reuse C7's path are in direct
conflict. The reuse requirement won, and R5 then reproduced exactly. This is recorded in
row 112(d) as a design decision taken **before** the run, not as a discovery after it.

### 7.2 · Adaptation cannot manufacture a residual the group has never seen — Ellel is the limit case

| Ellel `closed_traded`, n = 21 | coverage | CI | mean width | median width |
|---|---|---|---|---|
| B, Mondrian fixed | **0.0000** | [0.000, 0.161] | **0.00** | 0.00 |
| D, Mondrian × AgACI | **0.0000** | [0.000, 0.161] | **12.49** | 0.00 |

Twenty-one days on which the venue traded, banded against a calendar-closed group whose
residual pool is essentially all zeros. Arm D drove the group's effective level up and
the mean width moved from a literal point interval to **12.49** — and **covered not one
of the twenty-one**. 294 of arm D's 1,659 rows at Ellel are exactly zero-width.

**This is the mechanism's hard limit and it is the finding the package was built to
get.** ACI adapts the *level*; the quantile it takes that level of is drawn from the
group's own residuals. When a group's residuals are all near zero, **every** quantile of
them is near zero, and no level in [0,1] widens the band to reach a day that took £322.
Adaptation is powerless against misgrouping in exactly the case where misgrouping is
worst.

### 7.3 · At the Beer Hall the UNPARTITIONED band already matches the ORACLE on the misgrouped cell

| Beer Hall `closed_traded`, n = 94 | coverage | CI |
|---|---|---|
| A, unpartitioned fixed | **0.9255** | [0.853, 0.970] |
| C, AgACI unpartitioned | **0.9255** | [0.853, 0.970] |
| E, occurrence **ORACLE** | **0.9255** | [0.853, 0.970] |
| B, Mondrian fixed | 0.4894 | [0.385, 0.595] |
| D, Mondrian × AgACI | 0.5213 | [0.416, 0.625] |

Three arms land on **87 of 94**, identically. **Not partitioning at all is exactly as
good as knowing the answer** on the cell the partition breaks. This sharpens C7 §6.3,
which observed only that the ungrouped band beats both Mondrian arms marginally: the
agreement here is on the specific cell, at the same coverage as an oracle that cannot be
built. The partition is what breaks the cell, and both ways of not having that partition
— dropping it, or replacing it with the truth — arrive at the same place.

### 7.4 · Composing AgACI with Mondrian divides the calibration pool twice, and manufactures a degeneracy the partition alone does not have

AgACI in this codebase is **per horizon step**. Mondrian is **per group**. Composing them
slices the pool on both axes at once, so arm D's quantiles are drawn from
(group × step) slices roughly a seventh the size of arm B's group slices.

The consequence is measured. Arm B recorded **zero** attainability clamps at all three
venues over 500 / 474 / 364 examined (origin, group) events, and the smallest group slice
it ever saw at any venue was **37** (Two River Taps; 39 at the Beer Hall, 40 at Ellel) —
comfortably above the attainable minimum of 9. Arm D recorded
**324 attainability clamps at the Beer Hall alone** (7.3 per cent of its 8,750 quantile
calls degenerate, counting both kinds).

**This is a property of the composition, not of this estate.** Any deployment composing a
per-step adaptive method with a group partition inherits it, and the cost scales with the
product of the two granularities.

### 7.5 · At Ellel arm D crosses from over-coverage to under-coverage, which is the unsafe direction — and at Two River Taps it does the opposite

`CONTRACT.md` (Bundle out) records over-coverage as split conformal's **safe** failure
mode and under-coverage as the one that is not. Marginal coverage against nominal 0.900:

| Venue | B marginal | side | D marginal | side | verdict |
|---|---|---|---|---|---|
| beer_hall | 0.8714 [0.855, 0.887] | under | 0.8726 [0.856, 0.888] | under | no crossing; both under |
| **ellel** | 0.9138 [0.899, 0.927] | over | 0.8885 [0.872, 0.903] | **under** | **crosses to the unsafe side** |
| two_river_taps | 0.9631 [0.951, 0.973] | over | 0.9270 [0.911, 0.941] | over | **moves toward nominal and stays safe** |

**Only Ellel crosses.** Its absolute distance to nominal narrows slightly (0.0138 →
0.0115) while the *direction* of the error flips, so a summary ranking arms on
|coverage − nominal| alone would score that flip as an improvement. This matters for R3,
which is phrased as "improves": on the distance reading Ellel improves by 0.0023, a
change roughly a tenth the width of either interval; on the safety reading it gets worse.
**R3 does not fire on either reading**, but the readings disagree about why, and the
disagreement is worth carrying rather than resolving silently.

**Two River Taps is the one place arm D looks good and it is reported as such.** It moves
marginal coverage from 0.9631 to 0.9270, a genuine narrowing toward nominal on the safe
side of it, at a slightly smaller mean width (535.02 → 512.14). That is arm D's best
result anywhere in this grid. It is not a clean win either: at the same venue arm D lifts
the misgrouped `closed_traded` cell 0.7368 → 0.7632 (n = 38) while pushing
`closed_took_nothing` down 0.9939 → 0.9448 (n = 326), so the marginal gain is bought from
the larger cell (§7.6).

### 7.6 · Arm E over-covers at Two River Taps rather than being right, and arm D makes its safest cell worse

Arm E's `closed_traded` at Two River Taps is 1.0000 [0.907, 1.000], which excludes
nominal **above** — the oracle over-covers there rather than being correct, as report 86
§6.1 already noted. Separately, arm D degrades Two River Taps' `closed_took_nothing` cell
from 0.9939 [0.978, 0.999] (arm B) to 0.9448 [0.914, 0.967] on n = 326, and narrows the
calendar-closed group from 228.83 to 201.71. Adaptation there tightened a group that was
not in trouble.

### 7.7 · A defect in this instrument's own first reporting pass, found and fixed

The first version of §4.1 attributed zero-width intervals using each arm's **own** `state`
column. Arm E's rows carry the **occurrence** label, because that is what it bands on, so
its group split was on a different variable from the other four arms' and the row was not
comparable. Fixed by attributing every arm's zero-width count by the availability label,
with arm E's own banding groups reported separately under attainability. Recorded because
the first table looked entirely reasonable and nothing in it was flagged by any check.

---

## 8 · Artefact schema

`brain/eval/mondrian_aci.json`, 101,870 bytes, written by `eval.mondrian_aci.build()`.

| Key | Type | Meaning |
|---|---|---|
| `artefact` | str | `"mondrian_aci"` |
| `prior_art` | obj | `composition`, `reference` (POGO, arXiv:2606.00419), `claim_made_here`. Present so the arm cannot be quoted as a claimed method |
| `pre_registration` | obj | `ledger_row` 112, `commit`, `committed_at` |
| `store_ceiling` | str | value returned by `assert_store_ceiling()` at build |
| `level` / `gammas` / `warmup_pool` | float / list / int | 0.90, the pre-registered γ grid, 140 |
| `arms` | obj | arm key → one-line definition. Arm E's key and text both carry **ORACLE** |
| `reproduction_check` | obj | R5 and R4; `all_match` false is unreachable, a mismatch raises |
| `membership_check_P5` | obj | P5; a mismatch raises |
| `provenance` | obj | `provenance.runtime_stamp()` |
| `wall_seconds_total` | float | whole build |
| `venues.<venue>` | obj | the per-venue block below |

Per venue:

| Key | Meaning |
|---|---|
| `point_model` / `n_origins` | forecaster behind the residuals; rolling origins in the calibration pass |
| `contingency_records` / `contingency_banded` | C7's four-cell counts and shares over the FULL record frame and the BANDED frame |
| `arms.<arm>` | `overall`, `cells.<cell>`, `by_availability_group.<0\|1>` — **ten arms**: the five factorial arms plus `ACI_fixed_gamma_<γ>` for each pre-registered γ |
| `b_to_d_group_deltas.<group>` | `b_coverage`, `d_coverage`, `delta_coverage`, `b_mean_width`, `d_mean_width`, `delta_mean_width`, `relative_width_change` — the fields P2 and P4 are verdicts about |
| `degeneracy` | `attainable_min_n`, `zero_width_group_variable`, `scope_note`, and `arms.<arm>` |
| `wall_seconds` | `generate_records`, `run_online_availability_ABC`, `run_online_occurrence_E`, `arm_D_grouped_agaci` |
| `adaptive_clamps` | arm C's level-excursion total; arm D's per group |

Cell and group stats carry `n`, `empty`, `coverage`, `ci` (Clopper-Pearson, α = 0.05),
`mean_width`, `median_width`. An empty cell returns `empty: true` with null coverage and
is never backfilled with a marginal. Cell keys are C7's: `open_traded`,
`open_took_nothing`, `closed_traded`, `closed_took_nothing`. Degeneracy arm blocks carry
`n_rows`, `zero_width_rows_total`, `zero_width_rows_by_availability_group`, plus
`attainability` (fixed arms) or `quantile_degeneracy_calls_by_group`,
`quantile_calls_total` and `group_pool_empty_rows` (arm D).

---

## 9 · Cost, constraints and what was not done

**Wall time**, total **32.9 s** for three venues. No arm came near the thirty-minute
threshold, so the full grid ran without a prior cost report being needed.

| Venue | `generate_records` (ETS rolling origins) | arms A/B/C | arm E | **arm D** |
|---|---|---|---|---|
| beer_hall | 11.00 s | 0.54 s | 0.61 s | **0.23 s** |
| ellel | 10.15 s | 0.49 s | 0.49 s | **0.28 s** |
| two_river_taps | 7.65 s | 0.39 s | 0.45 s | **0.17 s** |

The point-forecast pass dominates at 94 per cent of the total; every banding arm,
including the new one, is under a second per venue.

- **Nothing was reimplemented.** `interval_calibration.run_online`,
  `interval_calibration.generate_records`, `conformal.methods.AgACI`,
  `conformal.methods.mondrian_band` and `partition_contrast`'s cell definitions,
  Clopper-Pearson helper and alignment are all imported. **Only arm D's driver is new**,
  and it wraps `AgACI` unmodified.
- **This arm is a leaf.** `rg` over the repository finds `mondrian_aci` referenced in
  exactly two files: `eval/mondrian_aci.py` and `tests/test_mondrian_aci.py`. No signal,
  endpoint or evaluated path imports it.
- **Nothing served or evaluated was touched.** No `.tex` file, no frozen artefact, no
  numbered ledger row edited. The instrument writes one new file.
- **Loud failure, no silent fallback.** `verify_reproduction` and `verify_membership`
  raise. Arm alignment across ten arms is asserted, as is agreement between the
  reconstructed pool and the banded pass. Empty cells report `empty: true` and are never
  backfilled with a marginal.
- **Tests added, none removed.** 26 new tests in `tests/test_mondrian_aci.py`, all
  synthetic, no store and no network. Both HALT checks and P5 are exercised in the
  failing direction, and the shared-function restore that arm D's instrumentation depends
  on has its own test.
- **One instrumentation note.** Arm D's degeneracy counts come from a context-managed
  wrapper around `conformal.methods.safe_conformal_quantile` that delegates to the real
  function. It is installed only around arm D's banding, after arms A/B/C/E have already
  been computed, and its restore is tested.

**Suite scope.** See §10 — the suite is reported in its correctly scoped form and no bare
green is claimed.

---

## 10 · Test suite, scoped

`tests/test_mondrian_aci.py` alone: **26 passed**, in `.venv-forecast`.

The full `brain/tests/` suite carries one unmarked network-dependent test excludable
only by node id —
`tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`,
which falls back to downloading Chronos weights from Hugging Face unauthenticated — and
one venv-boundary skip. The scoped run is:

```
.venv-forecast/bin/python -m pytest tests/ -q \
    --deselect "tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted"
```

**Result: recorded below with its counts.** Nothing in this session imports or is
imported by the ladder.

---

## 11 · End state

Recorded at close of session; see the closing entry appended below.

---

## 12 · What this report does not claim

It does not claim the composition is novel; it is not, and §0 quotes the paper that owns
it. It does not claim any arm should be adopted. It does not claim arm E is available;
it is an oracle and cannot be built. It makes **no placement recommendation**, prices no
words, and does not consult `reduction_cost_register.md`.

It claims what was measured: **adapting the level, per group, on a partition that is
wrong about membership, bought a 19 per cent wider calendar-closed group at the Beer Hall
and moved the misgrouped cell 3 points of the 41 it needed — and at Ellel, where the
misgrouped group's residuals are all zeros, it moved the cell not at all.**

**FORWARD POINTER, placed here because this is where a reader arriving by grep stops.**
The placement question — whether any of this enters the dissertation — **is OPEN and has
not been decided by anyone.** The S20 package forbade taking it here and it was not taken.
The decision, when it is taken, belongs in a ledger row above **113**; row **113(k)**
records the question as live and notes the constraint it meets first, which is that row
**111(h)** puts the document at **+7 words against its own stated reserve floor of 250**.
Do not read this report's silence on placement as a verdict against inclusion; it is the
absence of a decision, not the presence of one.
