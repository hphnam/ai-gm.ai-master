# R3 result — the conformal upper bound, gated on the condition it rests on

Run 2026-08-05. Closes **D-F1**. Conformance row **R16**.

## Provenance

| Field | Value |
|---|---|
| Command | `.venv-forecast/bin/python -m eval.interval_calibration --build` |
| Venv | `.venv-forecast` — Python 3.12.13, statsmodels 0.14.6, pandas 3.0.3, numpy 2.5.1 |
| Store ceiling | 2026-07-07; device cpu; seed 93 |
| Wall clock | **31 s** |
| Code | `eval/interval_calibration.py` — new `score_ties()`, wired through `power_analysis()` and the report writer |
| Tests | 3 added to `tests/test_interval_calibration.py`; 18/18 pass in both `.venv-eval` and `.venv-forecast` |

## The source condition, verified this session

Angelopoulos & Bates give the two-sided result as Equation (1),
`1 − α ≤ P(Y ∈ C(X)) ≤ 1 − α + 1/(n+1)`. The upper limb is **Theorem D.2**, and it is
conditional. Verbatim, from the paper:

> "Technically, the upper bound only holds when the distribution of the conformal score is
> continuous, avoiding ties."

> "Theorem D.2 (Conformal calibration upper bound). Additionally, **if the scores
> s₁, ..., sₙ have a continuous joint distribution**, then ..."

The paper offers a remedy — *"the user can always add a vanishing amount of random noise
to the score"* — and it is important to say why that does not apply here. It addresses
**incidental** ties. Our score is `|actual − forecast|`, and on a structurally closed day
both terms are zero, so the score distribution carries a genuine **atom at 0**. No
vanishing noise recovers continuity from a point mass; it only hides it.

The lower bound is unaffected. Its proof handles ties, and it is the limb every
under-coverage claim in this project rests on.

## Result — the bound is unavailable at ALL THREE venues

Not only at Ellel, which is what the audit predicted.

| venue | n_calib | distinct scores | tie fraction | largest atom | atom at | bound quotable? |
|---|---|---|---|---|---|---|
| beer_hall | 1883 | 1581 | 0.160 | 0.152 | score 0 | **no** |
| ellel | 1792 | 734 | 0.590 | 0.556 | score 0 | **no** |
| two_river_taps | 1407 | 1149 | 0.183 | 0.173 | score 0 | **no** |

The values that were being published, and are now withheld: 0.9005, 0.9006, 0.9007.

## Control — nothing else moved

Diffed against the committed artefact: **every other number reproduces exactly**. The only
changes are the new bound block and the wall-clock line.

## A determinism finding, and it is the more important one

The first attempt ran in `.venv-eval` and moved numbers my edit could not touch — Beer Hall
P coverage 0.880 → 0.884, arm A Winkler 1814.3 → 1839.6, ACI clamps A=46 → 76. My change is
purely additive and read-only.

Diagnosed rather than assumed:

- **Deterministic within a venv.** Re-running in `.venv-eval` reproduced its own output
  byte-for-byte apart from the wall-clock line. Not randomness.
- **The delta is environmental.** `.venv-eval` carries numpy 1.26.4 / pandas 2.3.3;
  `.venv-forecast` carries numpy 2.5.1 / pandas 3.0.3; statsmodels is identical at 0.14.6.
  Re-running in `.venv-forecast` reproduced the committed artefact exactly.

So `eval/interval_calibration` is **environment-sensitive**, the committed artefact was
produced under numpy 2.x, and nothing on the artefact said so. This is precisely the gap
`provenance.py` was created to close on 2026-08-01, and this artefact does not carry the
stamp. **Recommendation: stamp it.** Any future regeneration from the wrong venv would
silently restate every coverage and Winkler figure in `tab:winkler`.

## Consequence for the write-up

The coverage caption currently quotes one Angelopoulos–Bates bound across three calibration
sizes (`numbers_audit.md` flagged the arithmetic). The deeper point is that none of the
three is quotable at all. The sentence should state the two-sided result, then note that
the upper limb requires continuity, that a venue with structural closures violates it by
construction, and that the project therefore claims only the lower bound — which is the
limb the Beer Hall under-coverage argument needs.
