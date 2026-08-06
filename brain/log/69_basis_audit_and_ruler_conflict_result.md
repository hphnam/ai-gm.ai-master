# The `calendar_lag7` audit — one real defect, and a live ruler conflict underneath it

Run 2026-08-06. Closes write-up-pack items 8 and 9. Two of the three findings here were not
what the ledger said they would be.

## 1. The audit criterion in the ledger was wrong

The standing note read: *"the hard-coded `calendar_lag7` basis is in its third file. G17o
fixed `transfer/lovo.py`; R2 fixed `eval/chronos2_covariate_probe.py`;
`eval/worldcup_fixture_probe.py` still carries it. Assume a fourth until someone greps."*

Someone grepped. There are **~45 sites**, and almost all of them are correct.
`eval/harness.py:205` defines

```python
REPORTED_BASIS = "calendar_lag7"
```

with an explicit, documented rationale — it is *"the basis the dissertation quotes"*, chosen
for comparability across the pre-registration chain. So a hard-coded `calendar_lag7` is the
**project standard**, not a bug, and a future session hunting them all would have "fixed"
forty correct call sites.

**The real defect class is narrower**: computing a *scaled* metric at a venue
`config.VENUE_SCALE_BASIS` rules `unscaled` — i.e. Ellel. That is what G17o and R2 actually
fixed. Re-audited on the correct criterion:

| Site | Venues | Verdict |
|---|---|---|
| `eval/worldcup_fixture_probe.py:62` | beer_hall, **ellel** | **DEFECT — fixed here** |
| `eval/group_icl.py:274` | G3 incl. ellel | **Correct, do not change.** A reproduction check against a committed artefact must use the basis that artefact used |
| `eval/weather_basis.py:295` | reproduction limb | **Correct, do not change.** Docstring says so: *"Score `forecasts` on the committed basis (calendar_lag7) and pair to the committed rung's per-fold MASE"* |
| `eval/occurrence_gate.py:32` | beer_hall only | Correct — scaled venue |
| `signals/feature_ablation.py:70` | single venue | Correct — scaled venue |
| `hierarchy/reconcile.py` (×6) | within-venue nodes | Correct |
| `tests/*` (×20) | fixed fixtures | Correct — pinning the ruler is the point |

**No fourth file.** The prediction that there would be one was wrong, and the reason it felt
true was that the audit criterion was miscopied.

## 2. The one real defect, fixed and re-run

`eval/worldcup_fixture_probe.py` scored **both** venues on a hard-coded `calendar_lag7`,
publishing a MASE for Ellel — the venue ruled `unscaled` precisely because at 1.2 trading
days a week no scale basis is defensible. `_fold_mase` is now `_fold_loss` and reads
`config.VENUE_SCALE_BASIS`, falling back to `harness.REPORTED_BASIS`.

**Nothing published depended on it.** Report 19 records that at the time this probe ran the
store reached only 2026-05-31, so it reported *"June not present in this store, test
deferred"* and produced no numbers. The defect was latent for its whole life. The numbers
below are the probe's **first**.

### A second, pre-existing bug the fix surfaced

The tournament-restricted arms truncated `te` **before** predicting, so the released
`chronos2` rejected the resulting non-contiguous horizon outright:

```
ValueError: future_df timestamps do not match the expected prediction timestamps
```

Those arms could not run at all. The intent is to restrict the *scoring* window, not what the
model is asked to forecast, so the probe now predicts the full horizon and masks for scoring.
This is a behaviour change and it is the correct semantics; it is recorded rather than folded
in silently.

### Results — first ever for this probe

| venue | ruler | with `wc_*` | without `wc_*` | tournament with | tournament without | england-only ablation |
|---|---|---|---|---|---|---|
| beer_hall | `calendar_lag7_active` (MASE) | **1.056** | 1.127 | 1.152 | 1.258 | 1.080 |
| ellel | `unscaled` (MAE, £) | 78.431 | **76.805** | 112.178 | **109.021** | 77.191 |

Folds: 6 overall, 4 tournament-restricted. Deterministic — two consecutive runs agreed to the
printed precision.

**Read directionally only, per the probe's own power caveat.** The fixture covariates help at
Beer Hall on both the overall and tournament windows, and are mildly *unhelpful* at Ellel on
both. One June yields a handful of England-match dates; no significance is claimed and none
is computed. Note the arms are not separated by any dispersion statistic, so even the Beer
Hall direction is a mean difference over 6 folds and nothing more.

## 3. The finding underneath — two live rulers that disagree by 24%

Fixing the probe to read `config.VENUE_SCALE_BASIS` moved Beer Hall off `calendar_lag7`,
which surfaced this:

| Authority | Beer Hall | Two River Taps |
|---|---|---|
| `harness.REPORTED_BASIS` | `calendar_lag7` | `calendar_lag7` |
| `config.VENUE_SCALE_BASIS` | **`calendar_lag7_active`** | **`calendar_lag7_active`** |

Both are live. They are not equivalent — measured on the same 6 folds:

| venue | mean scale, `calendar_lag7` | mean scale, `calendar_lag7_active` | ratio |
|---|---|---|---|
| beer_hall | 297.36 | 369.16 | **1.2417** |
| two_river_taps | 153.52 | 174.39 | **1.1361** |

**The same forecast scores 24% lower at Beer Hall on the active basis than on the plain one**
(active-basis MASE = 0.805 × plain-basis MASE; at TRT, 0.880 ×).

This matters because the two are unevenly distributed across the project. `models/ladder.py:405`
scores `tab:ladder` on `calendar_lag7`; R9's `functional_pair`, R2's covariate probe and now
this probe use `config.VENUE_SCALE_BASIS`. **A MASE quoted in this project without naming its
basis is ambiguous by up to 24%**, and MASE values from different chapters are not directly
comparable.

The `harness.py` comment says `calendar_lag7_active` is *"the intended successor, to be
adopted in S4 when the ladder can be re-scored alongside it"*, and gives the reason for the
delay as *"S1 is forbidden from re-running the ladder"*. That constraint no longer binds — the
ladder has been re-scored several times since.

This is exactly the FLAG-MASE-RULER failure report 42 was written to close: *"three private
copies of this denominator previously disagreed by up to a factor of two"*. The private
copies are gone; the disagreement moved up a level, into two public constants.

**Not resolved here.** Which basis the dissertation quotes is a methodology decision and a
human gate. It is recorded, quantified, and left open.

**Recommendation.** Adopt `config.VENUE_SCALE_BASIS` as the single authority and reduce
`harness.REPORTED_BASIS` to a fallback for venues absent from the map, then re-score
`tab:ladder`. It is the more defensible ruler (the plain basis is deflated by structural
zeros, report 42), it is what every post-G2 module already reads, and leaving two live
constants is the defect this project has already paid for once. It costs a ladder re-score
and it moves published MASE figures by ~20%, so it is the human's call, not the agent's.

This also strengthens D-D1's reporting rule from the other direction: a scaled metric needs
its basis **and** its `as_of` stated, because here the basis alone is worth 24%.

## 4. Provenance stamping — write-up-pack item 8

`eval/interval_calibration.py` now stamps `provenance.runtime_stamp()` into the vectors JSON
and `provenance.stamp_lines()` into the report footer. R3 found this artefact restating
coverages and Winkler scores under a different numpy/pandas resolution while the code was
untouched; store ceiling and device were already stamped, the library resolution was not, so
the two runs were indistinguishable on the page. Every figure in `tab:winkler` comes from
this artefact.
