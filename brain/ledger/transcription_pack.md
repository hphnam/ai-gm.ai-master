# Transcription pack — the writing-only rows, with the numbers already in them

Every figure below is lifted from a committed artefact and carries its source path, so Phase 8
is transcription, not derivation. Nothing here has been written into a chapter, and nothing has
been pushed to Overleaf.

Closes the *data* half of **D-F3**, **D-F4**, **D-F5** and **D-F6**. The remaining half of each
is prose plus a gated Overleaf push.

---

## D-F3 · `tab:winkler` — every dash filled, with the promised Clopper-Pearson intervals

Source: `eval/interval_calibration_L1.json` (now `provenance`-stamped, `log/69`).
The intervals were **already computed and stored** as `cp_lo` / `cp_hi` — the caption promised
them and the table simply never printed them.

Arms: P plain split · **D Mondrian (the incumbent, and the served band)** · S per-step · A ACI ·
G AgACI/BOA.

| venue | level | arm | mean Winkler | coverage | 95% Clopper-Pearson | mean width | n |
|---|---|---|---|---|---|---|---|
| beer_hall | 0.8 | plain split | **1465.6** | 0.7766 | [0.7563, 0.7959] | 558.7 | 1750 |
| beer_hall | 0.8 | Mondrian (incumbent) | **1410.5** | 0.7446 | [0.7235, 0.7649] | 612.0 | 1750 |
| beer_hall | 0.8 | per-step | **1461.9** | 0.7817 | [0.7616, 0.8009] | 570.1 | 1750 |
| beer_hall | 0.8 | ACI | **1453.0** | 0.7937 | [0.7740, 0.8125] | 625.3 | 1750 |
| beer_hall | 0.8 | AgACI/BOA | **1442.3** | 0.7886 | [0.7687, 0.8075] | 581.0 | 1750 |
| beer_hall | 0.9 | plain split | **1939.7** | 0.8800 | [0.8638, 0.8949] | 947.8 | 1750 |
| beer_hall | 0.9 | Mondrian (incumbent) | **1807.0** | 0.8714 | [0.8548, 0.8868] | 960.6 | 1750 |
| beer_hall | 0.9 | per-step | **1928.1** | 0.8897 | [0.8741, 0.9040] | 992.2 | 1750 |
| beer_hall | 0.9 | ACI | **1814.3** | 0.8954 | [0.8801, 0.9094] | 1041.5 | 1750 |
| beer_hall | 0.9 | AgACI/BOA | **1836.6** | 0.8914 | [0.8759, 0.9056] | 1025.6 | 1750 |
| ellel | 0.8 | plain split | **1124.7** | 0.7661 | [0.7450, 0.7863] | 153.6 | 1659 |
| ellel | 0.8 | Mondrian (incumbent) | **1006.2** | 0.7908 | [0.7705, 0.8102] | 222.2 | 1659 |
| ellel | 0.8 | per-step | **1115.9** | 0.7746 | [0.7537, 0.7945] | 163.5 | 1659 |
| ellel | 0.8 | ACI | **1091.6** | 0.8059 | [0.7860, 0.8247] | 239.2 | 1659 |
| ellel | 0.8 | AgACI/BOA | **1070.2** | 0.7667 | [0.7456, 0.7869] | 198.2 | 1659 |
| ellel | 0.9 | plain split | **1435.3** | 0.9102 | [0.8954, 0.9235] | 575.0 | 1659 |
| ellel | 0.9 | Mondrian (incumbent) | **1262.5** | 0.9138 | [0.8993, 0.9269] | 513.4 | 1659 |
| ellel | 0.9 | per-step | **1367.2** | 0.9234 | [0.9096, 0.9358] | 630.3 | 1659 |
| ellel | 0.9 | ACI | **1422.4** | 0.9114 | [0.8967, 0.9246] | 587.9 | 1659 |
| ellel | 0.9 | AgACI/BOA | **1479.6** | 0.8813 | [0.8647, 0.8964] | 564.4 | 1659 |
| two_river_taps | 0.8 | plain split | **536.6** | 0.8305 | [0.8087, 0.8507] | 341.1 | 1274 |
| two_river_taps | 0.8 | Mondrian (incumbent) | **535.7** | 0.8462 | [0.8252, 0.8655] | 369.3 | 1274 |
| two_river_taps | 0.8 | per-step | **538.2** | 0.8328 | [0.8112, 0.8529] | 347.1 | 1274 |
| two_river_taps | 0.8 | ACI | **539.1** | 0.8281 | [0.8062, 0.8484] | 344.4 | 1274 |
| two_river_taps | 0.8 | AgACI/BOA | **541.4** | 0.8179 | [0.7956, 0.8387] | 338.0 | 1274 |
| two_river_taps | 0.9 | plain split | **654.2** | 0.9458 | [0.9320, 0.9576] | 521.7 | 1274 |
| two_river_taps | 0.9 | Mondrian (incumbent) | **646.4** | 0.9631 | [0.9512, 0.9728] | 535.0 | 1274 |
| two_river_taps | 0.9 | per-step | **670.3** | 0.9553 | [0.9424, 0.9659] | 555.8 | 1274 |
| two_river_taps | 0.9 | ACI | **671.2** | 0.9403 | [0.9259, 0.9527] | 522.5 | 1274 |
| two_river_taps | 0.9 | AgACI/BOA | **692.6** | 0.9176 | [0.9011, 0.9321] | 502.7 | 1274 |

**Reading notes for the prose.**
- The two intervals the D-F3 row quoted are here: Ellel 0.9 Mondrian **[0.8993, 0.9269]** and
  Two River Taps 0.9 Mondrian **[0.9512, 0.9728]**. Both confirmed against the artefact.
- Beer Hall at 0.9 **under-covers**: Mondrian 0.8714, CP **[0.8548, 0.8868]**, which excludes
  0.90. That is a real finding and the interval is what makes it sayable.
- Two River Taps at 0.9 **over-covers**: 0.9631, CP [0.9512, 0.9728], excluding 0.90 — the
  closed-venue effect the prose already describes, now with an interval instead of a phrase.
- Ellel at 0.9 sits **at nominal**: 0.9138, CP [0.8993, 0.9269], which contains 0.90.
- Winkler is the adoption metric and D wins it at all three venues (1807.0 / 1262.5 / 646.4 at
  the 0.9 level), which is why no candidate replaced it (`log/49`).

---

## D-F4 · `tab:ladder` — the dispersion that exists and is not printed (W36)

Source: `log/43_G17b_Fold_Count.md` §3. `sd`, `se` and `n` are on the page for every rung.
**W36 is the single named reason Distinction is "Not met", and the statistics were never
missing.**

### Beer Hall — step-1 rolling origin, n = 273

| rung | MASE | sd | se | n |
|---|---|---|---|---|
| **rung4_chronos2_exo** (served) | **0.716** | 0.471 | 0.029 | 273 |
| rung4_chronos_bolt | 0.732 | 0.464 | 0.028 | 273 |
| rung4_chronos2 | 0.734 | 0.492 | 0.030 | 273 |
| rung2_ets | 0.752 | 0.452 | 0.027 | 273 |
| rung1_robust_dow | 0.803 | 0.472 | 0.029 | 273 |
| rung3_global_gbm | 0.865 | 0.464 | 0.028 | 273 |
| rung2_stl | 0.871 | 0.484 | 0.029 | 273 |
| rung3_gbm | 0.883 | 0.526 | 0.032 | 273 |
| rung0_seasonal_naive | 0.938 | 0.512 | 0.031 | 273 |

### Ellel — step-1 rolling origin, n = 260 (`chronos2_exo` on **246**)

| rung | MASE | sd | se | n |
|---|---|---|---|---|
| rung4_chronos_bolt | **0.575** | 0.743 | 0.046 | 260 |
| rung4_chronos2_exo | 0.583 | 0.707 | 0.045 | **246** |
| **rung1_robust_dow** (served) | 0.585 | 0.710 | 0.044 | 260 |
| rung4_chronos2 | 0.602 | 0.715 | 0.044 | 260 |
| rung2_ets | 0.728 | 0.653 | 0.041 | 260 |
| rung2_stl | 0.731 | 0.720 | 0.045 | 260 |
| rung0_seasonal_naive | 0.869 | 0.996 | 0.062 | 260 |
| rung3_gbm | 0.912 | 0.731 | 0.045 | 260 |
| rung3_global_gbm | 0.920 | 0.770 | 0.048 | 260 |

### Two River Taps — step-1 rolling origin, n = 205

| rung | MASE | sd | se | n |
|---|---|---|---|---|
| **rung2_ets** (served) | **0.648** | 0.346 | 0.024 | 205 |
| rung4_chronos_bolt | 0.659 | 0.377 | 0.026 | 205 |
| rung4_chronos2_exo | 0.670 | 0.346 | 0.024 | 205 |
| rung4_chronos2 | 0.671 | 0.322 | 0.022 | 205 |
| rung0_seasonal_naive | 0.718 | 0.341 | 0.024 | 205 |
| rung3_gbm | 0.741 | 0.385 | 0.027 | 205 |
| rung2_stl | 0.781 | 0.366 | 0.026 | 205 |
| rung1_robust_dow | 0.835 | 0.310 | 0.022 | 205 |
| rung3_global_gbm | 0.897 | 0.447 | 0.031 | 205 |

**The sentence the dispersion buys, already computed at `log/43:206-209` (Ellel):**
winner mean 0.575 sd 0.743; served mean 0.585 sd 0.710; **gap winner-to-runner-up 0.0084 =
0.011 sd = 0.18 se**; gap winner-to-served 0.0102 = 0.014 sd = 0.23 se. A gap of one-fifth of a
standard error is not a result, and bolding a winner across it is the defect W36 names.

**Two cautions.**
- **Do not bold a winner without the MCS.** The retained-set language is the honest form.
- **SUPERSEDED — do not transcribe the cells above.** They are on the ladder's old
  `calendar_lag7` literal. Gate A made `config.VENUE_SCALE_BASIS` the single authority and the
  vectors were regenerated; the live cells are in **`log/70` section 5**. Ellel is now
  **MAE in GBP**, not a MASE, so the table carries two units. Whatever is printed must name its
  basis per venue.

---

## D-F5 · The Ask-F1 / cost sweep — the ledger row was wrong in BOTH limbs

Source: `log/PRJ93_Agent_Eval_Report.md` §S6 (regenerated by R1 on the scaled N=644 corpus).

The conformance row said our sweep has *"zero misses and a flat cost of 8.0 at every ratio"*,
repeating examiner charge **W27**. The evidence pack already warned *"do not repeat W27 without
re-checking"*. Re-checked against the artefact:

| miss : false-alarm | misses | false-alarms | weighted cost | dominant |
|---|---|---|---|---|
| 1 : 1 | 124 | 8 | 132.0 | misses |
| 2 : 1 | 124 | 8 | 256.0 | misses |
| 5 : 1 | 124 | 8 | 628.0 | misses |
| 10 : 1 | 124 | 8 | 1248.0 | misses |

False-alarm upper bound **0.667/week**.

- **"Zero misses" is false** — there are **124**.
- **"Flat cost of 8.0" is false** — cost rises **132.0 → 1248.0**.
- Note the evidence pack's own figures (126 misses; 134.0/260.0/638.0/1268.0) are now **stale**
  by two misses after the R1 re-run. Use the artefact, not either prose record.

**The degeneracy is real, and the direction is inverted.** The detector's threshold is fixed, so
misses and false alarms do not move with the ratio; **misses dominate at every ratio from 1:1 to
10:1**, the ordering never changes, and the sweep therefore selects no operating point. That is
a genuine one-sided degeneracy — but one-sided toward **misses**, not toward the over-offering
the row assumed.

**This changes D-F8 as well.** `lu_proactive_2024` is cited for the claim that the dominant
failure mode of proactive agents is over-offering, at >50% false-alarm rates. **This system does
the opposite** — 124 misses against 8 false alarms, precision 0.871, recall 0.804. That contrast
is a reportable finding rather than an embarrassment, and it means D-F8's proposed remedy
("demote recall, lead on precision") is aimed at the wrong limb: precision is the strong one
here. Re-derive D-F8 from these numbers before writing it.

---

## D-F6 · Threat model for the retrieval store — draft, not yet in the chapter

Key: `zou_poisonedrag_2025`. The relevant property of this system is concrete rather than
hypothetical: `signals/chatlog_kb_gap.py` is live in the briefing and is populated by
**staff-authored content**, so the retrieval corpus has a write path that is not the author's.

Draft, to be revised for prose quality before any push:

> The retrieval store is populated in part by staff-authored chat content, which makes it a
> write surface rather than a read-only artefact. Zou et al. show that a retrieval corpus
> admitting adversarial documents can be steered by a small number of injected passages, and
> the threat does not require a sophisticated adversary — only write access and patience. Three
> properties of this deployment bound the exposure. The corpus is single-tenant and scoped to
> one organisation, so an attacker must already be a member of staff. Retrieval feeds a
> briefing that a named human reads and acts on, rather than an autonomous actuator, so a
> poisoned passage produces a misleading sentence rather than an executed transaction. And the
> forecast path does not read the retrieval store at all: numbers come from the warehouse, so
> poisoning cannot move a forecast, a band or a deviation score. What it can do is corrupt the
> narrative layer, which is the layer the operator trusts most readily. No mitigation is
> implemented and none is claimed; the exposure is stated because an unstated one is worse.

---

## What remains after this pack

Prose drafting plus a **single gated Overleaf push** (PRJ93_RULES gate 5). Also outstanding:
whether `tab:ladder` becomes a chart (gate 4 — a plain table is a defect unless justified), and
the ruler decision at `log/69` (gate: methodology).
