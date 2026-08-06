# 78 — `eval/interval_calibration` regenerated in both venvs: the numerics regime is characterised

Run 2026-08-07 under `brain/PRJ93_RULES.md`, on approval to regenerate and to characterise
rather than merely avoid the environment sensitivity recorded in `log/61`.

## What was asked, and the framing condition attached to it

Two runs, not one. `.venv-forecast` to confirm the committed artefacts reproduce and to give
them a provenance stamp; `.venv-eval` to measure the sensitivity `log/61` observed by
accident, so its magnitude can be stated rather than left as a footnote about a near miss.

The condition on how the result is reported was set before the run and is honoured below:
**`.venv-forecast` is the regime `log/61` INFERRED, not one recorded on the artefact.** A
clean reproduction there confirms consistency with the inferred regime. It does not
independently establish that the committed numbers were produced there. The phrasing
throughout is "reproduces under the regime `log/61` identifies as committed", never "the
regime question is closed".

One piece of on-disk corroboration did turn up, and it is weaker than a stamp but real: the
committed `interval_calibration.md` **already carried a `## Runtime identity` block naming
`.venv-forecast`**. `stamp_lines()` had been wired into the markdown writer before
`runtime_stamp()` was wired into the JSON payloads, so the report was stamped and the three
JSONs were not. The inference in `log/61` is therefore corroborated by an independent
artefact rather than resting on reasoning alone.

## Provenance

| Field | Value |
|---|---|
| Command | `.venv-forecast/bin/python -m eval.interval_calibration --build`, then the same under `.venv-eval` |
| Wall clock | 29.2 s (`.venv-forecast`), 43.1 s (`.venv-eval`) |
| Code change | `eval/interval_calibration.py` — `provenance` added to the MCS and power payloads (instrumentation only; the vector payload already carried it) |
| Committed state | `.venv-forecast` output, restored and verified by inspecting the artefact |

## Part 1 — `.venv-forecast` reproduces the committed artefacts exactly

Diff against the committed files, provenance and wall-clock excluded: **empty**. Every
coverage figure, every Clopper–Pearson limb, every Winkler value, every ACI clamp count,
every MCS p-value and every bootstrap interval reproduces.

The whole diff is: three new `provenance` blocks, one new `interpreter` line in the markdown
stamp, and the wall-clock line.

So `tab:coverage` and `tab:winkler` stand on numbers that reproduce under the regime
`log/61` identifies as committed, and those numbers now say so on their face.

## Part 2 — `.venv-eval` reproduces `log/61`'s deltas, and then some

`log/61` reported three moves from its accidental `.venv-eval` run. All three reproduce:

| Quantity | `.venv-forecast` | `.venv-eval` | `log/61` |
|---|---|---|---|
| Beer Hall arm A Winkler @ 0.05 | 1814.3 | 1839.6 | 1814.3 → 1839.6 ✓ exact |
| Beer Hall ACI clamps, arm A | 46 | 76 | 46 → 76 ✓ exact |
| Beer Hall ACI clamps, arm G | 339 | 337 | not reported |

**Both quoted deltas reproduce exactly**, a year of intervening work notwithstanding — the
ruler migration of decision row 87 did not disturb this pipeline.

*A correction to my own first pass at this comparison.* I initially read a per-level clamp
counter out of the JSON (`A: 6 → 9`, `G: 66 → 57`) and concluded the counts had drifted
because the frame had changed. They had not. `log/61` quotes the report's **headline**
sweep-level clamp count, which is a different counter in the same artefact, and it
reproduces to the digit. The lesson is the one this session keeps relearning: two numbers
with the same name in the same file are not the same number, and the resolution was to open
the markdown rather than reason about why the JSON disagreed.

**Coverage moves are small.** Beer Hall D marginal coverage 0.7937 → 0.7931; step-1 0.7208 →
0.7216; step-7 0.9760 → 0.9720. Mean widths move in the third significant figure. Nothing at
this level would change a sentence.

## Part 3 — the finding that matters, and it is not the one we went looking for

**The coverage and Winkler point estimates are resolution-stable to three significant
figures. The Model Confidence Set decisions built on top of them are not.**

Five significance verdicts flip between regimes, and one model-adoption recommendation
appears out of nothing.

### Beer Hall — two paired-bootstrap intervals lose their exclusion of zero

| Pair | `.venv-forecast` | `.venv-eval` |
|---|---|---|
| P − A | +125.36 [16.46, 250.66] **excludes zero** | +97.40 [−16.58, 225.81] does not |
| S − A | +113.80 [11.94, 227.07] **excludes zero** | +83.87 [−22.68, 200.86] does not |

Both were marginal — a lower limb at +16.5 and +11.9 on intervals ~235 wide is a verdict
resting on the last few per cent of its own interval. That is exactly the class of decision a
third-significant-figure perturbation can move, and it did.

MCS p-values move with them: A 0.941 → 0.842, G 0.725 → 0.842, P and S 0.126 → 0.141. The
**90% set is unchanged** at `[D, A, G, S, P]`.

### Ellel — stable

Set `[D]` in both regimes; adoption empty in both. P and S p-values move (0.008 → 0.022,
0.016 → 0.029) but stay far inside α = 0.10, so no verdict changes. Ellel's separation is
wide enough that numerics cannot reach it.

### Two River Taps — the set changes membership and an adoption candidate appears

| | `.venv-forecast` | `.venv-eval` |
|---|---|---|
| 90% set | `[D, P, S, A, G]` — all five | `[P, D, A, G]` — **S eliminated** |
| adoption candidates | `[]` | **`['P']`** |
| p(P) | 0.209 | **1.000** |
| p(D) | 1.000 | 0.619 |
| p(S) | 0.191 | **0.036** |
| p(A) | 0.191 | 0.104 |
| p(G) | 0.191 | 0.275 |

Under one numerics regime Two River Taps has an undifferentiated five-model set and nothing
to adopt. Under the other, S is eliminated at α = 0.10 and **P displaces the incumbent D as
the p = 1.0 survivor and is returned as an adoption candidate**. Three paired-bootstrap
verdicts flip in the process (P−S gains exclusion, P−G and D−G lose it).

**This is a recommendation to change the served model that exists in one venv and not the
other.** It is the single most consequential thing found in this session.

### Why the MCS amplifies what coverage absorbs

The MCS is an elimination procedure over bootstrap p-values, and elimination is a threshold
crossing. A coverage figure that moves in its third significant figure stays the same
coverage figure. A p-value of 0.191 that moves to 0.036 crosses α and deletes a model from
the set. The MCS does not average the perturbation away; it decides on it. Two River Taps is
the venue with the fewest origins (205) and the tightest spread between arms, so it has the
least margin to absorb any of this.

## Part 4 — what this obliges the write-up to say

### Correction: the float at risk is `tab:winkler`, not `tab:mcs`

My first report of this named `tab:mcs`. That was wrong and the difference matters, because
the two floats are fed by different artefacts and only one of them was tested here.

- **`tab:mcs`** (5×3, body 4.1, the float D7 rests on) is the **ladder** MCS over the nine
  forecasting candidates, from `eval/mcs_L1_results.json`. **It was not exercised by this
  run and nothing here is evidence about it.**
- **`tab:winkler`** (7×3, body 4.4) is the **conformal-arms** comparison — five interval
  methods against incumbent D — from `interval_calibration_mcs.json`, and it carries a
  **"90% set" column** (`numbers_audit.md` rows 28, 30, 32). That column is the quantity that
  moves.

So the split within `tab:winkler` is: **its Winkler point estimates reproduce exactly; the
set-membership column built on top of them does not.** `tab:coverage` is clear throughout.

### The ladder MCS inherits the mechanism without inheriting the evidence

`tab:mcs` is an MCS too, so the amplification argument in Part 3 applies to it by
construction — and `eval/mcs_L1_results.json` is **unstamped**. Its regime is recoverable
from `log/70`, which records the Gate A regeneration running in `.venv-forecast`, so it is
at least consistent with every other committed number. It has never been run across the gap.
Testing it would mean regenerating the ladder, which is out of scope under the approved
`tab:ladder` disposition. **Recorded as a known, bounded gap rather than closed** — the
honest position is that the sensitivity is demonstrated for the conformal arms and merely
plausible for the ladder.

**The `tab:winkler` set column is not safe as bare membership.** Reporting Two River Taps' 90%
set without saying that its membership is contingent on library resolution would state as a
finding something that is partly an artefact of the environment. Three options, and only one
of them is honest:

1. **Report the `.venv-forecast` set and add a validity note** stating that the Two River
   Taps set is sensitive to numerics, quantified — S eliminated under numpy 1.26.4, retained
   under 2.5.1 — and that the estate-wide conclusion (no venue produces a decisive adoption
   candidate under the committed regime) is what the section claims. **Recommended.**
2. Report both sets. Doubles the float and invites the reader to ask which is right, which
   is a question with no answer.
3. Report one set silently. This is what the draft currently does, and it is the option the
   session exists to prevent.

Option 1 belongs in **5.3** as a validity note, alongside the reproducibility material in
`sec:repro` that motivated `provenance.py` in the first place. It costs roughly 60 words and
buys a defensible answer to the obvious viva question about why a confidence set is being
treated as a finding.

There is a stronger reading available and it should be stated plainly: **a model confidence
set whose membership depends on the numpy minor version is telling you the models are not
distinguishable on this data at this sample size.** That is the same conclusion the empty
adoption list already reaches under the committed regime, arrived at from a second
direction. It strengthens §4 rather than undermining it.

## Part 5 — one inconsistency noted, not a defect

The vector payload hard-codes `"device": "cpu"` while the provenance stamp reports
`compute device: mps` — the stamp reads the machine, the field records the intent. Nothing
in this pipeline touches torch (ETS via statsmodels), so no number is affected. Recorded so
that a later reader does not treat the disagreement as evidence of a wrong run. The
`--served-check` path sets `BRAIN_TORCH_DEVICE=cpu` explicitly and is unaffected.

## Verification, per the rules file

Both runs were checked by opening the artefacts, not by reading exit codes. After restoring
the `.venv-forecast` output the committed files were diffed again and confirmed to differ
from HEAD only by the provenance additions — the thing that was supposed to change, plus
confirmation that the numbers that were not supposed to change did not.

## Artefacts

- `eval/interval_calibration_L1.json` — regenerated, now stamped
- `eval/interval_calibration_mcs.json` — regenerated, now stamped
- `eval/interval_calibration_power.json` — regenerated, now stamped
- `eval/interval_calibration.md` — regenerated, stamp gains the `interpreter` line
- `eval/interval_calibration.py` — provenance added to two payloads

## Part 6 — the stamp-coverage sweep, re-run because its completeness is now load-bearing

The split found here — markdown stamped, JSON not — means an "unstamped artefact" count built
by looking at one output family under-reports. The sweep was redone across both families.

**No other generator has the split.** Four modules call `stamp_lines` and never
`runtime_stamp` (`conformal/wrap.py`, `hierarchy/reconcile.py`, `models/ladder.py`,
`transfer/lovo.py`), which looks like the same shape and is not: each writes **only**
markdown. There is no JSON beside them to be unstamped. `eval/interval_calibration.py` was
the sole genuine case, and it is closed.

**13 JSON artefacts remain unstamped**, none of them by the split mechanism — they are
scripts that have not been re-run since stamping was wired in:

| Cluster | Artefacts | Regime, and how it is known |
|---|---|---|
| ladder fold vectors + MCS | `fold_vectors_L1_{beer_hall,ellel,two_river_taps}.json`, `mcs_L1_results.json` | `.venv-forecast` — **by log record**, `log/70:6`, not by artefact |
| grouped in-context | `group_icl_L1.json`, `group_icl_calibration.json`, `group_icl_mcs.json` | unrecorded |
| weather basis | `weather_basis_L1.json`, `weather_basis_coverage.json`, `weather_basis_mcs.json` | unrecorded |
| other | `scale_bootstrap_L1.json`, `injection_realism.json`, `chronos2_covariate_probe.json`, `interval_calibration_served_check.json` | unrecorded |

**Seven markdown artefacts do carry a stamp**, and they are the recovery route for anything
sharing a generator: `interval_calibration.md`, `reconciliation_forecast.md`,
`transfer_results.md`, the three `conformal_L1_*.md`, all `.venv-forecast`; and
`chatlog_kb_gap.md`, `.venv-eval` — correct, since that path computes no floating-point
result that numerics could move.

`models/ladder_results_L1_*.md` carry **no** stamp despite `ladder.py` calling `stamp_lines`,
which is the expected consequence of the approved `tab:ladder` disposition: the ladder has
not been re-run since the stamp was added and deliberately will not be.

**Three of the four unrecorded clusters contain an MCS** (`group_icl_mcs`, `weather_basis_mcs`,
and `mcs_L1_results`). Given Part 3, that is where the residual risk sits — not in the
unstamped point estimates, which this run shows are stable to three significant figures, but
in any set-membership or exclusion verdict computed from them. Recorded, not resolved;
resolving it means re-running those three, which is a separate approval.
