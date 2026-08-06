# R7 result — staleness of the `eval/chronos2_*` artefacts

Run 2026-08-05. Category (c) — the set report 57's staleness sweep could not classify.

## Why this was open

Report 57 swept 15 artefacts against the warehouse-restore mechanism and classified
`eval/chronos2_*.md` as **"blocked, no torch in this environment"**. `.venv-forecast`
carries chronos 2.3.1 and torch 2.12.1, so the exclusion no longer holds. Report 57's own
lesson is the reason to bother: *"a stale artefact hides a broken generator"* — cashed in
once already when regenerating `signals/weather_diagnostic.md` revealed the module had
been crashing since report 54 and nobody had noticed.

## The set is exactly two artefacts

| Artefact | Verdict |
|---|---|
| `eval/chronos2_covariate_probe.md` | **STALE AND WRONG.** Regenerated under R2 — see `log/64_R2_covariate_probe_result.md`. Six folds → 39, wrong basis corrected, and its stated conclusion ("covariates HELP") retracted as a null |
| `eval/chronos2_promotion_sensitivity.md` | **Not staleness-eligible.** Reproduces byte-identical |

## The promotion-sensitivity classification was imprecise, not wrong

`eval/chronos2_promotion_sensitivity.py` takes **two JSON snapshots as CLI arguments**
(`python -m eval.chronos2_promotion_sensitivity <before.json> <after.json>`). It never
reads the warehouse. It therefore cannot drift with the store ceiling, which is the only
mechanism report 57's sweep was testing. It belongs with `sim/*_frozen.md` in the
"excluded by design" row, not in the "blocked, no torch" row.

Re-run and diffed against the committed copy: **byte-identical**.

Recorded because the distinction matters for the next sweep: an artefact that is a pure
function of committed inputs needs a different staleness test (do its inputs still hash the
same?) from one generated against a moving store.

## One torch-gated generator remains outside every sweep

`eval/worldcup_fixture_probe.py` is torch-gated and **writes no artefact at all**, so it
cannot be stale — but G17o recorded that it still scores Ellel on `calendar_lag7`, which
under G2 is a violation twice over (Ellel admits no scaled error, and the estate rules
`calendar_lag7_active` where it does). It appears in neither chapter, so nothing is
retracted by leaving it.

**Not repaired here.** Deciding what a cross-venue statistic means when one venue admits no
scale is a methodology decision, not a bug fix, and it was not in this gate's
authorisation. It is the same fault R2 fixed in the covariate probe and G17o fixed in
`transfer/lovo.py` — this is the **third** file to carry it, which is itself the finding:
the hard-coded basis was copied, and a fourth copy should be assumed until someone greps
for it.

## Net

Of the three "blocked, no torch" rows report 57 left open, one was genuinely stale and
carried a wrong conclusion (fixed), one was misclassified and is fine, and the third is a
generator with no artefact that carries a known open defect.
