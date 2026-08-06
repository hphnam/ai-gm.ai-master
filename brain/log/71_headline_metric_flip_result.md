# 71 — Flipping the headline metric from MASE to RMSSE

Operator-approved this session (decision row 92). Closes D-D1's recorded decision, which the
chapters had not implemented.

Runtime `.venv-forecast`. **No model was re-run and no set was recomputed for the swap.** Both
losses have been computed and stored on every fold since the first MCS run; the change is one of
designation, applied to artefacts already on disk.

## 1 · Pre-registration status — declared, not absorbed

The MCS procedure was pre-registered (decision row 33) with **MASE as the reported headline**.
That designation is now changed after the sets were computed. This must be written up as a
declared deviation, and three facts bound it:

- The argument for RMSSE is D-D1's, from the estimand and the functional a measure elicits. It
  does not depend on which way any result came out.
- Both losses were computed and reported from the first run. Nothing was run to obtain the
  swap, and no set changed value.
- **No served decision changes.** The pre-registered rule (incumbent stays if retained) returns
  the incumbent at all three venues under the new headline as under the old.

`eval/mcs_L1_results.json` now carries `"headline_designation_changed_post_hoc": true` so the
artefact states this without relying on the prose.

## 2 · Code changes

`eval/mcs_report.py` — the artefact keys were `mcs_primary_mase` / `mcs_secondary_rmsse`, which
bake a *designation* into a key a later decision can falsify. This is the same defect class as
the hard-coded basis literal of report 70. Renamed to `mcs_rmsse` / `mcs_mase` (loss-named,
designation-free), with `HEADLINE_LOSS` / `SECONDARY_LOSS` module constants and a top-level
`headline_loss` field a consumer indexes with. `top4_by_mean_mase` → `top4_by_mean_headline`,
`sensitivity_mase_common` → `sensitivity_headline_common`, both now driven off `HEADLINE_LOSS`.
Added `headline_loss_at_venue` / `secondary_loss_at_venue`, because at Ellel the `rmsse` vector
holds an RMSE in currency.

`drafts/figures/make_ladder_figure.py` — reads `headline_loss` from the artefact instead of
naming a metric, so a future designation change moves the figure with the tables.

49 tests pass.

## 3 · The confidence sets under the new headline

| venue | headline | set @0.10 | set @0.25 | served | served p | retained |
|---|---|---|---|---|---|---|
| beer_hall | RMSSE | 5/9 | 3/9 | foundation, exo | 0.990 | yes |
| two_river_taps | RMSSE | 4/9 | 3/9 | ETS | **0.220** | yes |
| ellel | RMSE (GBP) | 6/9 | 4/9 | robust DOW | 0.912 | yes |

Set membership at α=0.10 is unchanged at the Beer Hall and Two River Taps. At Ellel the headline
set is **wider** than the MASE set was — six rungs rather than four, admitting STL and ETS.

## 4 · The substantive change: the served model is the argument-minimum nowhere

Under MASE the served model was the argument-minimum at the Beer Hall and at Two River Taps, and
Ellel was described in the chapter as *"the one venue where the argument-minimum sits away from
the served model"*. **Under RMSSE that sentence is false at all three venues.**

| venue | served | rank | argument-minimum | paired gap | paired se | in se |
|---|---|---|---|---|---|---|
| beer_hall | foundation, exo (0.5681) | 2 | Chronos-Bolt (0.5680) | 0.0001 | 0.0060 | **0.02** |
| two_river_taps | ETS (0.4924) | **4** | Chronos-2 (0.4614) | 0.0311 | 0.0095 | **3.27** |
| ellel | robust DOW (240.16) | 2 | Chronos-Bolt (238.25) | 1.91 | 3.81 | **0.50** |

The Beer Hall and Ellel gaps are inside one standard error, as they were before. **Two River
Taps is not.** Its served ETS drops from first under MASE to fourth under RMSSE, behind all
three foundation arms, and the pairwise contrast against the argument-minimum is 3.27 standard
errors.

This is not a contradiction with §3, and the write-up must not present it as one. The pairwise
view asks one question; the confidence set controls the thirty-six contrasts the ladder
generates and still retains ETS at α=0.10 (p = 0.220, the weakest retention of the three). A
gap that is clear pairwise and absorbed by multiplicity control is exactly the situation the MCS
exists to arbitrate, and the pre-registered rule resolves it toward the incumbent.

The honest reading: the metric swap does not overturn a served choice, and it does surface a gap
at Two River Taps that the median-eliciting ruler was hiding. That is D-D1's own argument
appearing in this estate's data rather than in the literature — a squared measure separating two
forecasters an absolute measure could not.

## 5 · What this supersedes

- Report 70 §9 and §10, and the `tab:mcs` figures pushed from them. The Ellel argument-minimum
  paragraph (£1.55, 0.93 se) is a MASE-basis figure and is now the secondary reading.
- `sec:rw-ruler`'s closing concession that *"the argument assembled here runs against the measure
  the results chapter reports"*. That tension is resolved and the paragraph must be rewritten,
  not merely softened.
- `sec:ruler-functional`'s framing of the functional argument as running ahead of the artefact.
  It now leads the artefact. The chronos median-under-a-mean's-name limitation is **unchanged**
  and becomes more pointed, not less: the headline now elicits a mean the served model cannot
  emit.

## 6 · Not superseded

`tab:ladder` stays MASE. It is the frozen six-origin committed gate (row 89), and restating the
decision under audit on a ruler it did not use would replace it with a different decision.

---

## 7 · The α=0.25 check, and it flips

Asked after §4 was written, because `p = 0.220` sits close to the secondary pre-registered
level. Both levels (0.10 primary, 0.25 secondary) were fixed at decision row 33.

| venue | served | p | retained @0.10 | retained @0.25 | @0.25 under secondary loss |
|---|---|---|---|---|---|
| beer_hall | foundation, exo | 0.990 | yes | yes (3/9) | yes |
| two_river_taps | ETS | **0.220** | yes (4/9) | **NO — eliminated** | **yes** |
| ellel | robust DOW | 0.912 | yes | yes (4/9) | yes |

At α=0.25 the Two River Taps set contracts to the three foundation arms and **ETS is
eliminated**. It is the only served model at any venue failing to survive both pre-registered
levels.

The elimination is **specific, not general**: the same rung is retained at α=0.25 under the
secondary absolute-error loss. What removes it is the squared measure *at* the stricter level,
not the stricter level alone. Reporting it that precisely costs a clause and forecloses the
reading that the incumbent is fragile across the board.

The served model is unchanged, because the pre-registered rule is registered at the primary
level and the primary level retains it.

## 8 · The Two River Taps condition — why no operational cost attaches

Verifiable from the artefact rather than asserted: `fold_vectors_L1_two_river_taps.json` has a
last fold `test_end` of **2026-05-08** against a `store_ceiling` of **2026-07-07**. The series
stops two months before the ceiling because the venue closed on 8 May 2026.

The venue is frozen — no forecast served, no band issued, no operational decision downstream of
the rung in `tab:mcs`. **The cost of leaving a weaker model in place there is zero.** So what
§4 and §7 report is inferential restraint under a pre-registered rule, and NOT a judgement that
a 3.27-se gap would not matter to somebody running the venue.

**Counterfactual, written into the chapter and left to further work.** Had the venue been
trading, a rung retained at the primary level but eliminated at the secondary, at p = 0.220 and
carrying a >3-se pairwise gap against a foundation arm already served elsewhere in the estate,
is a candidate for revisiting on **operational** grounds rather than inferential ones. The
confidence set establishes that the evidence does not license a switch; it does not establish
that a manager should be indifferent to one, and conflating the two is the error the paragraph
exists to prevent.

## 9 · Claims corrected in the parent section

Three statements in `sec:res-mcs` asserted retention without naming a level, which §7
contradicts. All three now name it: the `tab:mcs` caption, the "two readings follow" paragraph,
and the closing pre-registered-rule paragraph, each pointing at `sec:res-mcs-functional`.
