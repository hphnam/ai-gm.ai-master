# 86 · C7, the availability partition against the occurrence partition

Package S12, Part 3. Instrument: `brain/eval/partition_contrast.py`. Artefact:
`brain/eval/partition_contrast.json`. Tests: `brain/tests/test_partition_contrast.py`
(15 tests, all passing). Pre-registration: decision log **row 108**, committed
`b8da68cb` at 2026-08-13T23:27:48+01:00, strictly before the instrument's first
line was authored.

Store ceiling asserted at build: **2026-07-07**. Level 0.90. Warmup pool 140.
Mondrian arm `D` of `interval_calibration.run_online`. Point model `rung2_ets` at
all three venues. Environment `.venv-forecast`, python 3.12.13, Darwin arm64.

---

## 0 · Two things contradict the framing, and they go first

### 0.1 · The framing's headline number is right against a denominator it does not name

Part 3's opening states:

> At a booking-driven venue these diverge in **79.8% of calibration observations**,
> and the divergence is invisible in the direction the instrument currently computes.

The instrument reproduces 79.8% exactly, and it is **not** a share of calibration
observations. It is the share of Ellel's **calendar-open group alone** that took
nothing: 1,037 of 1,300, **0.7977**. Divergence over all of Ellel's calibration
observations is **0.5813** (1,058 of 1,820).

The two differ by 21.6 points, and the sentence as written attaches the larger
number to the smaller quantity. Both are now computed by `derived_rates` at both
population grains, so a future claim has to name which denominator it means.

| Venue | Divergence over all observations | Calendar-open group that took nothing | Calendar-closed group that traded |
|---|---|---|---|
| Beer Hall | 0.0602 | 0.0154 (21 / 1,365) | 0.1722 (94 / 546) |
| **Ellel** | **0.5813** | **0.7977 (1,037 / 1,300)** | 0.0404 (21 / 520) |
| Two River Taps | 0.0502 | 0.0068 (7 / 1,025) | 0.1585 (65 / 410) |

The right-hand column reproduces `_partition_fidelity`'s `rate` field to four
decimal places at all three venues, which is a second independent agreement
beyond the reproduction check proper.

The framing's directional claim survives this. Its number does not survive being
quoted as a share of the calibration set.

### 0.2 · My Beer Hall prediction is refuted

Row 108 predicted, for the Beer Hall:

> Predicted `Δ ≈ 0` on every populated cell, and no cell materially off nominal
> under either partition. If the Beer Hall shows an Ellel-sized effect, the
> mechanism claimed above is wrong, because the Beer Hall has no
> availability/occurrence gap to speak of.

**Wrong.** The Beer Hall's `closed_traded` cell (n = 94) has availability coverage
**0.489**, Clopper-Pearson [0.385, 0.595], against a nominal 0.900. The interval
excludes nominal by a wide margin. `Δ` there is **−0.4362**, not near zero. A
second cell, `open_took_nothing` (n = 21), sits at 0.381 [0.181, 0.616] under
availability and 0.000 [0.000, 0.161] under occurrence: both catastrophic, on a
cell of twenty-one.

I predicted flatness at the Beer Hall from its low aggregate disagreement rate
(6.0%). The aggregate rate was the wrong statistic. What matters is not how often
the two variables disagree but what happens on the days they do, and 94
misgrouped days out of 1,750 are enough to carry three quarters of the venue's
headline shortfall (§4).

**The refutation is partial and it is worth being exact about which part.** Row
108's refutation criterion 2 was "`Δ` at the Beer Hall is of the same magnitude as
at Ellel". It did **not** fire: on `closed_traded` the Beer Hall is −0.4362 and
Ellel is −1.0000, a factor of 2.3. So the mechanism is not falsified. What is
falsified is my per-venue expectation that a venue with a small disagreement rate
would show a small effect.

---

## 1 · The reproduction check

Item 29's gate. `verify_reproduction` compares integers with no tolerance and
raises on mismatch; `build()` cannot produce an artefact without passing it.

| Venue | Persisted `n_calendar_closed_but_traded` | Measured `closed_traded` | Match |
|---|---|---|---|
| beer_hall | 94 | 94 | **exact** |
| ellel | 21 | 21 | **exact** |
| two_river_taps | 65 | 65 | **exact** |

Compared as Python integers, `int(got) == int(want)`, no rounding and no
tolerance. The persisted values are read at run time from
`eval/exchangeability_diagnostic.json`, not transcribed.

The comparison is made on the **full record frame**, which is the population
`_partition_fidelity` runs on. Coverage below is computed on the **banded**
frame, which is smaller because the first 140 pool residuals are consumed by the
warmup. Both contingencies are reported so the difference is visible rather than
assumed away, and at Two River Taps it matters: 65 records-level
`closed_traded` days become 38 banded ones.

---

## 2 · The contingency, all four cells

Availability = `org_profile.structural_zero_dow`, the served grouping.
Occurrence = `1{y <= 0}`, matching `_partition_fidelity`'s `y > 0` split.

### 2.1 · Full record frame (the reproduction population)

| Venue | open+traded | open+took nothing | closed+traded | closed+took nothing | n | disagreeing |
|---|---|---|---|---|---|---|
| Beer Hall | 1,344 (0.7033) | 21 (0.0110) | **94** (0.0492) | 452 (0.2365) | 1,911 | 115 (0.0602) |
| Ellel | 263 (0.1445) | **1,037** (0.5698) | **21** (0.0115) | 499 (0.2742) | 1,820 | 1,058 (0.5813) |
| Two River Taps | 1,018 (0.7094) | 7 (0.0049) | **65** (0.0453) | 345 (0.2404) | 1,435 | 72 (0.0502) |

### 2.2 · Banded frame (the coverage population)

| Venue | open+traded | open+took nothing | closed+traded | closed+took nothing | n | disagreeing |
|---|---|---|---|---|---|---|
| Beer Hall | 1,229 (0.7023) | 21 (0.0120) | 94 (0.0537) | 406 (0.2320) | 1,750 | 115 (0.0657) |
| Ellel | 240 (0.1447) | 945 (0.5696) | 21 (0.0127) | 453 (0.2731) | 1,659 | 966 (0.5823) |
| Two River Taps | 903 (0.7088) | 7 (0.0055) | 38 (0.0298) | 326 (0.2559) | 1,274 | 45 (0.0353) |

**No cell is empty at any venue**, so the empty-cell path (which reports `n: 0,
empty: true, coverage: null` and never substitutes a marginal) is exercised by
test rather than by data. The smallest live cell is seven observations, at Two
River Taps.

---

## 3 · Coverage and width

Nominal 0.900. Coverage intervals are **Clopper-Pearson exact binomial**, chosen
in row 108 before any figure was seen, because several cells sit at 0 or n
successes where a Wald interval is degenerate and Wilson still misbehaves. Every
figure carries its cell size. `Δ` is availability minus occurrence.

### 3.1 · Beer Hall

| Cell | n | avail coverage | avail CI | occur coverage | occur CI | Δ cov | avail width | occur width | Δ width |
|---|---|---|---|---|---|---|---|---|---|
| open+traded | 1,229 | 0.8926 | [0.874, 0.909] | 0.8804 | [0.861, 0.898] | +0.0122 | 1276.09 | 1216.57 | +59.52 |
| open+took nothing | 21 | 0.3810 | [0.181, 0.616] | 0.0000 | [0.000, 0.161] | +0.3810 | 1460.41 | 137.72 | +1322.69 |
| **closed+traded** | **94** | **0.4894** | **[0.385, 0.595]** | **0.9255** | **[0.853, 0.970]** | **−0.4362** | **187.69** | **805.80** | **−618.11** |
| closed+took nothing | 406 | 0.9212 | [0.891, 0.945] | 0.8448 | [0.806, 0.879] | +0.0764 | 158.71 | 147.05 | +11.66 |
| **overall** | 1,750 | 0.8714 | [0.855, 0.887] | 0.8640 | [0.847, 0.880] | +0.0074 | 960.60 | 933.43 | +27.17 |
| unpartitioned | 1,750 | 0.8800 | [0.864, 0.895] | | | | 947.84 | | |

### 3.2 · Ellel

| Cell | n | avail coverage | avail CI | occur coverage | occur CI | Δ cov | avail width | occur width | Δ width |
|---|---|---|---|---|---|---|---|---|---|
| open+traded | 240 | 0.6917 | [0.629, 0.749] | 0.7875 | [0.730, 0.837] | −0.0958 | 806.58 | 1323.19 | −516.61 |
| open+took nothing | 945 | 0.9852 | [0.975, 0.992] | 0.7820 | [0.754, 0.808] | +0.2032 | 689.63 | 175.87 | +513.76 |
| **closed+traded** | **21** | **0.0000** | **[0.000, 0.161]** | **1.0000** | **[0.839, 1.000]** | **−1.0000** | **0.00** | **1064.32** | **−1064.32** |
| closed+took nothing | 453 | 0.9249 | [0.897, 0.947] | 0.9912 | [0.978, 0.998] | −0.0662 | 14.33 | 133.24 | −118.91 |
| **overall** | 1,659 | 0.9138 | [0.899, 0.927] | 0.8427 | [0.824, 0.860] | +0.0711 | 513.42 | 341.45 | +171.97 |
| unpartitioned | 1,659 | 0.9102 | [0.895, 0.924] | | | | 575.03 | | |

Ellel's `closed+traded` cell is the mechanism in its undiluted form: twenty-one
days on which the venue traded, banded against a group of near-zero residuals, at
**zero width and zero coverage**. Not one of the twenty-one is covered, and the
interval is a point.

### 3.3 · Two River Taps

| Cell | n | avail coverage | avail CI | occur coverage | occur CI | Δ cov | avail width | occur width | Δ width |
|---|---|---|---|---|---|---|---|---|---|
| open+traded | 903 | 0.9646 | [0.950, 0.976] | 0.9590 | [0.944, 0.971] | +0.0055 | 657.21 | 632.76 | +24.45 |
| open+took nothing | 7 | 0.5714 | [0.184, 0.901] | 0.0000 | [0.000, 0.410] | +0.5714 | 695.60 | 333.12 | +362.48 |
| **closed+traded** | **38** | **0.7368** | **[0.569, 0.866]** | **1.0000** | **[0.907, 1.000]** | **−0.2632** | **262.98** | **406.75** | **−143.77** |
| closed+took nothing | 326 | 0.9939 | [0.978, 0.999] | 0.9939 | [0.978, 0.999] | 0.0000 | 224.85 | 213.42 | +11.43 |
| **overall** | 1,274 | 0.9631 | [0.951, 0.973] | 0.9639 | [0.952, 0.973] | −0.0008 | 535.02 | 517.07 | +17.96 |
| unpartitioned | 1,274 | 0.9458 | [0.932, 0.958] | | | | 521.73 | | |

---

## 4 · What the misgrouping costs at the venue that under-covers

`shortfall_attribution` is defined only where the availability arm under-covers
overall, because a ratio against a negative denominator would invent a shortfall
that is not there. It is applicable at the Beer Hall alone; Ellel (0.9138) and
Two River Taps (0.9631) over-cover, and the artefact says so in words rather than
returning a number.

Beer Hall, excess misses defined as `n × (0.900 − coverage)`:

| Cell | n | excess misses | share of the venue's shortfall |
|---|---|---|---|
| open+traded | 1,229 | 9.10 | 0.182 |
| open+took nothing | 21 | 10.90 | 0.218 |
| **closed+traded** | **94** | **38.60** | **0.772** |
| closed+took nothing | 406 | −8.60 | −0.172 |
| **total** | 1,750 | **50.00** | 1.000 |

**Ninety-four days, 5.4 per cent of the banded population, account for 77.2 per
cent of the Beer Hall's coverage shortfall.** The occurrence partition repairs
that cell from 0.489 to 0.926, an interval that contains nominal.

This is the connection to the dissertation's existing result. `sec:res-undercoverage`
reports the served Mondrian band at 0.871 against 0.900 and D-U6 sets out to find
the exchangeability violation behind it. The violation has a name and a size: the
partition is wrong about ninety-four days, and those ninety-four days are most of
the gap.

---

## 5 · Did the prediction hold?

Quoting row 108 clause by clause.

| Pre-registered claim | Outcome |
|---|---|
| **Ellel**, traded cell, `Δ < 0` | **HELD.** open+traded −0.0958, closed+traded −1.0000 |
| **Ellel**, availability traded-cell coverage below nominal | **HELD.** 0.6917 and 0.0000, both CIs exclude 0.900 |
| **Ellel**, took-nothing cell, `Δ > 0` | **HELD on the cell that carries the mass** (open+took nothing, n=945, +0.2032). Not held on closed+took nothing (n=453, −0.0662), where both arms sit above nominal |
| **Ellel**, availability coverage saturating on took-nothing | **HELD.** 0.9852 [0.975, 0.992] |
| **Ellel**, availability width narrower on traded, wider on took-nothing | **HELD, both signs.** −516.61 and −1064.32 on the traded cells, +513.76 on open+took nothing |
| **Beer Hall**, `Δ ≈ 0` on every populated cell, nothing materially off nominal | **REFUTED.** closed+traded Δ = −0.4362, coverage 0.489 |
| **Two River Taps**, `Δ` nonzero, concentrated in an off-diagonal cell | **HELD.** closed+traded −0.2632, every other cell within ±0.006 except a seven-observation one |
| **Two River Taps**, `Δ` smaller in magnitude than Ellel's | **HELD.** −0.2632 against −1.0000 on the same cell |

**None of the four refutation criteria fired.**

1. Ellel's traded-cell coverage under availability at or above nominal? No. 0.6917
   and 0.0000, both below, both CIs excluding 0.900.
2. Beer Hall `Δ` of the same magnitude as Ellel's? No. −0.4362 against −1.0000 on
   the same cell.
3. `Δ` on the traded cell positive at all three venues? No. Negative at all three:
   −0.4362, −1.0000, −0.2632.
4. Both off-diagonals empty or negligible at all three venues? No. 115, 1,058 and
   72 disagreeing observations respectively.

**So the framing survives its own refutation criteria, and one of its three
per-venue predictions was wrong.** The framing was written by someone who had not
seen the numbers, and it under-specified the mechanism: it located the effect at
the venue with the largest divergence RATE, when the effect is located at the
cell where the calendar is wrong, at every venue, in proportion to what happens
on those days rather than to how many of them there are.

---

## 6 · Three findings the pre-registration did not anticipate

### 6.1 · The defect is one cell, at all three venues

`closed+traded` is below nominal everywhere and repaired by the occurrence
partition everywhere:

| Venue | n | availability | occurrence |
|---|---|---|---|
| Beer Hall | 94 | 0.4894 [0.385, 0.595] | 0.9255 [0.853, 0.970] |
| Ellel | 21 | 0.0000 [0.000, 0.161] | 1.0000 [0.839, 1.000] |
| Two River Taps | 38 | 0.7368 [0.569, 0.866] | 1.0000 [0.907, 1.000] |

All three availability intervals exclude 0.900 below. Two of the three occurrence
intervals contain it; Two River Taps' [0.907, 1.000] excludes it **above**, so the
oracle over-covers there rather than being right. Stated because it is the sort of
thing a favourable reading would round to "repaired".

### 6.2 · The occurrence oracle is not uniformly better, and at Ellel it is worse overall

Ellel's overall coverage moves from 0.9138 under availability to **0.8427** under
occurrence, which is further from nominal, on the low side, by a wide margin. The
cause is visible in the table: the occurrence partition moves 945
open-but-took-nothing days into a tight zero-residual group, narrowing their band
from 689.63 to 175.87 and dropping their coverage from 0.9852 to 0.7820.

So the occurrence partition is better where the misgrouping bites and worse where
it does not. This matters for how C7 can be written: the claim that survives is
that the available partition **misgroups a specific identifiable cell**, not that
occurrence is the partition one should use. The latter is unavailable anyway, and
on this evidence would not be an unmixed improvement if it were.

### 6.3 · The calendar partition buys little over no partition at all

| Venue | availability | occurrence | unpartitioned |
|---|---|---|---|
| Beer Hall | 0.8714 | 0.8640 | **0.8800** |
| Ellel | **0.9138** | 0.8427 | 0.9102 |
| Two River Taps | **0.9631** | 0.9639 | 0.9458 |

At the Beer Hall the ungrouped band covers better than either Mondrian arm. At
Ellel the calendar partition beats it by 0.0036, inside the width of both
intervals. Only at Two River Taps does either partition clearly beat no partition,
and there both do. Recorded as measured; no verdict drawn, because the served
band's justification is conditional coverage rather than marginal coverage and
this table speaks only to the latter.

> **POINTER, appended 2026-08-15 (S22, decision row 115). The condition this refusal
> names has been met, and the refusal is discharged at the Beer Hall only.**
> `log/95_mondrian_aci.md` section 7.3 is the conditional-coverage measurement this
> table lacked. On the Beer Hall's `closed_traded` cell, **n = 94**, the unpartitioned
> arm, the AgACI unpartitioned arm and the occurrence **ORACLE** arm all land on **87 of
> 94, coverage 0.9255 [0.853, 0.970], identically**, against the served Mondrian arm's
> 0.4894 [0.385, 0.595]. So on the cell the partition is charged with breaking, not
> partitioning at all is exactly as good as knowing the answer.
>
> **Do not read this as a verdict in one direction.** `chapters/results.tex` Table
> `tab:winkler` has the partitioned arm beating the unpartitioned arm at all three
> venues (1807 against 1940, 1263 against 1435, 646 against 654), and the Winkler score
> is the criterion this project's adoption rule reads. Winkler penalises width; coverage
> on a cell does not. **The arbitration is unresolved and belongs to a served-band
> review**, and it is the same review that owns `FLAG-BAND-UNDERCOVERAGE-BH`. Full
> reasoning at `log/96_served_partition_and_c7_placement.md` section 2 and
> `log/97_degenerate_bands_and_honest_pricing.md`.

---

## 7 · Artefact schema

`brain/eval/partition_contrast.json`, written by `eval.partition_contrast.build()`.

| Key | Type | Meaning |
|---|---|---|
| `artefact` | str | `"partition_contrast"` |
| `store_ceiling` | str | value returned by `assert_store_ceiling()` at build |
| `level` | float | nominal coverage, 0.90 |
| `warmup_pool` | int | `interval_calibration.WARMUP_POOL`, 140 |
| `mondrian_arm` | str | the `run_online` arm read, `"D"` |
| `reproduction_check.per_venue.<venue>` | obj | `persisted`, `measured`, `match` |
| `reproduction_check.all_match` | bool | false is unreachable; a mismatch raises |
| `provenance` | obj | `provenance.runtime_stamp()` |
| `venues.<venue>.point_model` | str | forecaster behind the residuals |
| `venues.<venue>.n_origins` | int | rolling origins in the calibration pass |
| `venues.<venue>.contingency_records` | obj | four-cell counts, shares, disagreement over the FULL record frame |
| `venues.<venue>.contingency_banded` | obj | the same over the BANDED frame |
| `venues.<venue>.availability` | obj | `overall` and `cells.<cell>` for the served grouping |
| `venues.<venue>.occurrence` | obj | the same for the oracle grouping |
| `venues.<venue>.unpartitioned` | obj | the same for the ungrouped band |
| `venues.<venue>.deltas.<cell>` | obj | `n`, `delta_coverage`, `delta_mean_width`; null on an empty cell |
| `venues.<venue>.derived_rates.<scope>` | obj | divergence at both denominators |
| `venues.<venue>.shortfall_attribution` | obj | `applicable`, and where true, per-cell excess misses and shares |

Cell stats carry `n`, `empty`, `coverage`, `ci` (Clopper-Pearson, alpha 0.05),
`mean_width`, `median_width`. Cell keys are `open_traded`, `open_took_nothing`,
`closed_traded`, `closed_took_nothing`.

---

## 8 · Constraints, and what was not done

- **Nothing served was touched.** No band on any served path was refitted, no
  persisted result was overwritten, no artefact that feeds a reported number was
  modified. The instrument writes one new file.
- **Nothing was reimplemented.** `interval_calibration.run_online`,
  `conformal.methods.mondrian_band`, `interval_calibration.generate_records` and
  `interval_calibration.clopper_pearson` are imported. The only difference between
  the two arms is the `state` column. `signals/residual.py` was read and is NOT
  the right foundation here: it supplies the deviation detector's stream, a
  different object from the conformal calibration pass, and importing it would
  have measured the wrong band.
- **No existing signal imports this module.** Verified by construction; it is
  imported only by its own test.
- **No number in this report was computed ad hoc.** Every figure above is a field
  of the artefact. `derived_rates`, `cell_deltas` and `shortfall_attribution` were
  added to the instrument rather than calculated in the report, and they are
  backfillable onto a persisted artefact (`--backfill-deltas`) so a derived
  quantity does not force a refit of three rolling-origin ETS passes.
- **Loud failure, no silent fallback.** `verify_reproduction` raises. The two arms
  are checked to have banded identical `(origin, step)` sequences and raise if
  not. Empty cells return nulls and an `empty` flag.
- **Tests added, none removed.** 15 new tests in
  `tests/test_partition_contrast.py`, all synthetic, no store, no network. The
  reproduction check has four of its own, covering agreement with
  `_partition_fidelity`, a raise on mismatch, a pass on match, and a raise when a
  venue is absent from the persisted artefact.

**One pre-existing test failure, unrelated.**
`tests/test_a4_ladder.py::test_ellel_is_not_capped_and_higher_rungs_are_at_least_attempted`
fails in `.venv-eval`, which lacks the forecast stack and falls back to
downloading Chronos weights from Hugging Face unauthenticated. Nothing in this
session imports or is imported by the ladder. With that one test deselected the
whole `brain/tests/` suite exits 0. Recorded rather than fixed.

**What this report does not claim.** It does not claim the occurrence partition
should be adopted; it cannot be, and §6.2 shows it would not be an unmixed
improvement anyway. It does not claim a calendar-defined Mondrian partition is
novel; it is not, and A1's stock experiment already uses day-of-week groups. It
claims one thing: the variable the band can condition on and the variable that
governs its scores are different variables, the cell where they differ is
identifiable, and at the venue whose under-coverage the dissertation already
reports, that cell carries 77.2 per cent of the gap.
