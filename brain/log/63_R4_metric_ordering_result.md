# R4 result — does the headline metric change the ladder's decision? (G1 evidence)

Run 2026-08-05. Evidence for gate **G1** / conformance rows **R21–R23** / **D-D1**.
**This does not decide G1.** It supplies the measurement the decision should rest on.

## Provenance

| Field | Value |
|---|---|
| Command | `.venv-forecast/bin/python -m eval.metric_ordering` |
| Venv | `.venv-forecast` — Python 3.12.13, numpy 2.5.1 |
| New module | `eval/metric_ordering.py`; artefacts `eval/metric_ordering.md` + `.json` |
| Wall clock | **~1 s** |
| Refits | **none** — committed per-fold loss vectors re-read, same MCS instrument re-run under each loss |

Scope: only venues admitting a scaled error. Under G2 Ellel is ruled `unscaled`, so
neither MASE nor RMSSE is defined there and it is reported out of scope, not silently
included.

## The question, and why it is the right one

`kolassa_we_2023`, verbatim: *"The **only** error measures whose minimizing point forecasts
are coherent are the squared error and monotonic functions of weighted sums of squared
errors,"* and MASE is among those that *"are just scaled MAEs,"* hence *"usually not"*
coherent. `hewamalage_forecast_2023`: absolute-error measures *"optimize for the median"*.

That argument bites on a **decision** only if the two measures disagree about which model
wins. So: do they?

## Result — yes on the argmin, no on the confidence set

| venue | folds | winner under MASE | winner under RMSSE | winner changes | ordering identical | 90% MCS identical |
|---|---|---|---|---|---|---|
| beer_hall | 273 | `rung4_chronos2_exo` | `rung4_chronos_bolt` | **yes** | no | **yes** |
| two_river_taps | 205 | `rung2_ets` | `rung4_chronos2` | **yes** | no | **yes** |

Rank correlation between the two orderings: Beer Hall Spearman ρ = 0.950 (p = 8.76e-05),
Kendall τ = 0.833; Two River Taps ρ = 0.817 (p = 7.22e-03), τ = 0.611.

**Both 90% model confidence sets are identical under both losses:**

- beer_hall — `{robust_dow, ets, chronos2, chronos2_exo, chronos_bolt}` under each.
- two_river_taps — `{ets, chronos2, chronos2_exo, chronos_bolt}` under each.

### The two flips are not the same size

**Beer Hall is a coin-toss.** Under MASE, `chronos2_exo` 0.7163 beats `chronos_bolt`
0.7321. Under RMSSE they are 0.5902 and **0.5900** — a gap of 0.0002. The "flip" is two
models that are, on the squared measure, indistinguishable to four decimal places.

**Two River Taps is substantive.** `rung2_ets` goes from **rank 1 to rank 4**: MASE 0.6478
(first) against RMSSE 0.5139 (fourth), while `rung4_chronos2` goes from fourth to first
(0.6709 → 0.4817). The three Chronos rungs all overtake ETS when the loss stops eliciting
the median.

## What this establishes

1. **The argmin is metric-dependent at every scaled venue.** Kolassa's objection is not
   abstract here; it changes which model a bare argmin would ship, at both venues.
2. **The model confidence set is metric-invariant.** The set of models the data cannot
   separate is the same under either loss, at both venues.

Those two facts together are the finding, and they point the same way: **the only thing
the headline metric changes is the quantity this project already stopped relying on.** The
six-fold bare argmin was W5, and the MCS replaced it precisely because a point ranking at
this sample size is not evidence. R4 shows the ranking is unstable across a second axis —
the measure — while the inferential answer is not.

## Bearing on D-D1, stated against my own prior recommendation

I recommended keeping MASE on the expectation that the ordering would prove invariant. **It
is not**, and that reasoning does not survive. The defence changes shape rather than
collapsing:

- The weak defence ("the metric does not matter") is **refuted** — it changes the winner
  twice.
- The strong defence is available and is better: *the ranking is metric-dependent, which is
  exactly why no conclusion in this dissertation rests on a ranking; the model confidence
  set, which every conclusion does rest on, is identical under both.*

Adopting RMSSE as headline would restate magnitudes everywhere and change no MCS, no
retained set, and no reported conclusion. Keeping MASE costs the same. The decision is
therefore about which story the chapter tells, and the human owns it (D-D1).

One caveat that belongs with the decision: at Two River Taps the served model is `rung2_ets`,
and it is the rung RMSSE demotes furthest. Anyone arguing the served choice is
metric-robust should not use TRT as the example.
