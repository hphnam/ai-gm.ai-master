# Methodological verdicts extracted from `chapters/literature_review.tex`

Source: Overleaf project `6a11ac2180bb716e3c2491c4`, `chapters/literature_review.tex`,
67,389 bytes, SHA256 `4e6e6218…5417`. The local copy `brain/drafts/literature_review.tex`
is **byte-identical** (same SHA, same size) — verified this session, plus a spot readback of
`sec:rw-ruler` through `mcp__overleaf__get_section_content`. **No disagreement between the two
copies.**

Ranges read (token-discipline log, local file, 1,010 lines): 1–40, 40–139, 139–273, 273–425,
560–672, 673–770, 770–883, 884–1010. Lines 425–560 (`sec:rw-ruler`) were read from Overleaf via
`get_section_content`, not from the local file.

Verification column decodes as:
- **V-VERBATIM** — the ledger's T8 passes (`brain/ledger/litreview_critique.md`, 2026-08-03)
  name this specific claim as confirmed against verbatim source text.
- **V-CORRECTED** — the claim was found *wrong* in a T8 pass and rewritten; current wording is
  the corrected one.
- **T8-CLOSURE** — the key is inside the "all 90 keys checked" closure but this particular
  proposition is not individually named in the ledger. Lower confidence; worth a NotebookLM check.
- **GAP** — load-bearing claim whose key appears in no confirmed list. Check first.

---

## Section `sec:rw-framing` — decision support and delegated autonomy

**R1 · REQUIREMENT + PRIOR-WORK-LIMITATION**
Evaluation of a *deployed* agent counts as a contribution in its own right, and the evaluation
setting is a variable, not a constant: difficulties reported by deployments are drawn from a
different sample than difficulties reported by benchmarks. Prior work's shortfall: agentic
products ship with almost no disclosed safety/evaluation record.
> "documents systems acting with limited oversight, yet also finds that developers disclose
> almost nothing about their safety and evaluation, leaving no public information for 135 of 240
> safety fields." … "Principled evaluation of a deployed agent is a contribution in its own
> right, and the setting in which such an agent is evaluated is itself a variable, because the
> difficulties a deployment reports are drawn from a different sample than the difficulties a
> benchmark reports."
Keys: `staufer_2025_2026`, `paleyes_challenges_2022`, `kumar_agentic_2026`, `gorry_framework_1971`.
Implies: our evaluation must be run in the live estate, and the write-up must report deployment
difficulties, not only benchmark scores. Verification: V-VERBATIM (Staufer 135/240 confirmed
under challenge; Paleyes confirmed pass 2).

**R2 · REQUIREMENT**
An agent that acts unasked must hold an explicit internal model of what is *normal* for the venue;
an unprompted action is warranted only by a departure from expectation.
> "an agent acting unasked must hold an internal model of what is \emph{normal} for the venue it
> manages, because an unprompted action is warranted only by a departure from expectation."
Keys: `lu_proactive_2024`, `dixon_independence_2007`, `ancker_effects_2017`.
Implies: no alert may fire except as a function of a stated normality model; a heuristic trigger
with no normality model is out of scope. Verification: V-VERBATIM (Lu, Dixon confirmed;
Ancker V-CORRECTED).

---

## Section `sec:rw-rhythm` — learning the rhythm on short history

**R3 · REQUIREMENT (baseline selection)**
Classical statistical and linear models set the competitive bar on small seasonal hospitality
series. Any more elaborate method must beat them **on evidence**, not on architecture.
> "on small, seasonal hospitality series, classical statistical and linear models set a
> competitive bar that a more elaborate method must clear on evidence, not on architecture."
Keys: `chae_value_2024`, `hossain_comparative_2025`, `schmidt_machine_2022`,
`croston_forecasting_1972`.
Implies: the baseline ladder must contain ETS/seasonal-naive/Croston before any foundation model
is credited with a win. Verification: V-VERBATIM (Hossain, Schmidt sMAPE, Croston confirmed).

**R4 · PRIOR-WORK-LIMITATION (scope of an inherited claim)**
The "internal features are enough" result is **conditional on the trading period and the model
family**; the source's own conclusion is that external data *does* help, markedly for ML models.
Only the narrow practical recommendation transfers.
> "The finding is conditional on the period and on the model family, and their own conclusion is
> that external data does help, markedly so for the machine-learning models. What this work
> inherits is the narrower practical recommendation they draw from it, that a business without the
> resources to acquire external data can still forecast competitively from operational features
> alone."
Keys: `chae_value_2024`.
Implies: we may not argue "external data has low marginal value"; we may only argue that an
operational-feature-only forecaster is a defensible baseline under our resource constraint.
Verification: V-CORRECTED (this exact misrepresentation was found and fixed in T8 pass 1).

**R5 · REQUIREMENT (reporting standard)**
A separation of a fraction of a percentage point, on one venue, with no dispersion reported, is
an illustration and not evidence. Dispersion must accompany any comparative claim.
> "The separations at one week are a fraction of a percentage point on one venue with no
> dispersion reported, so this illustrates a possible horizon dependence without evidencing one."
Keys: `schmidt_machine_2022`, `hewamalage_look_2021`.
Implies: every horizon/model comparison we report carries a dispersion measure or is labelled an
illustration. Verification: V-VERBATIM.

**R6 · PRIOR-WORK-LIMITATION (two limits on the locality–globality result)**
The globality principle is a claim about **estimation** (the complexity budget of fitting a shared
function over a collection), not about inference-time conditioning of a frozen model; and it
supplies **no threshold** separating small from large collections.
> "It is a claim about \emph{estimation} … whereas the mechanism this work ultimately employs
> conditions a frozen pretrained model on sibling series at inference time, fitting nothing on the
> estate at all. And the formalism supplies no threshold. Nothing in it says that three series is
> small and forty is large."
Keys: `montero-manso_principles_2021`, `das_-context_2025`, `zhou_context-driven_2025`,
`liu_generative_2024`.
Implies: the "pooling over three venues will buy little" expectation must be carried as **our own
falsifiable conjecture**, tested, and never cited to Montero-Manso as an inherited result. The
falsifier is named: a positive transfer result on a target collection of a handful of series.
Verification: V-VERBATIM.

**R7 · REQUIREMENT (attribution of gains; baseline ladder)**
Gains from time-series foundation models come from time-series pretraining and patching, not from
language-model machinery. Treat any component justified by LM provenance alone with scepticism.
> "gains come from time-series pretraining and patching, not from language-model machinery." …
> "a disciplined baseline ladder: classical models first, then a transfer-based global model, with
> scepticism toward any component justified by language-model provenance alone."
Keys: `tan_are_2024`, `das_decoder-only_2024`, `ansari_chronos_2024`.
Implies: our model ladder is classical → transfer-based global; no LLM-backed forecaster enters
without an ablation. Verification: V-VERBATIM (Tan ablations and TimesFM ">25%" both confirmed
under challenge).

**R8 · REQUIREMENT (model-regime fit)**
Chronos-2 and TabPFN-TS are the two pretrained forecasters that admit exogenous covariates, and a
three-venue / one-year / handful-of-regressors estate sits **inside** their design regime and well
short of the scale the transformer literature assumes.
> "A single hospitality estate, with three venues, one year of trade and a handful of calendar and
> weather regressors, sits inside the regime these two models were designed for and well short of
> the scale the transformer literature usually assumes."
Keys: `ansari_chronos-2_2025`, `hoo_tables_2026`, `hollmann_accurate_2025`,
`hertel_explainable_2026`.
Implies: model choice is justified by regime fit, not by leaderboard rank. Verification:
V-VERBATIM (Chronos-2 group-attention quote, TabPFN 11M/10k rows, Hertel competitiveness).

**R9 · PRIOR-WORK-LIMITATION (gap) + declared assumption**
No surveyed source separates a calendar covariate channel from a weather channel in a way that
would establish the split. The chapter's preference for known-future calendar covariates is an
**assumption**, recorded so it can be disputed.
> "This dissertation assumes, without demonstrating, that the covariates most worth conditioning
> on in hospitality are known-future calendar variables … No source surveyed here separates a
> calendar channel from a weather channel in a way that would establish the split, and the
> assumption is recorded so that it can be disputed."
Keys: (none — an explicit absence claim)
Implies: a forecaster must **not** be selected on covariate capability alone, since the next
subsection discounts the weather covariate. Verification: T8-CLOSURE (absence claim, no key to
check; a NotebookLM sweep could still falsify it).

**R10 · REQUIREMENT (estimator choice on intermittent series)**
On intermittent series, exponential smoothing is biased; model the inter-demand interval and the
demand size separately (Croston), and apply the $1-\alpha/2$ bias correction (SBA), because the
expectation of a ratio is not the ratio of expectations.
> "\citet{croston_forecasting_1972} observed that exponential smoothing applied to an intermittent
> series produces biased estimates" … "Croston's estimator is nonetheless biased, because the
> expectation of a ratio is not the ratio of expectations, and proposed the approximately unbiased
> estimator that scales Croston's by $1-\alpha/2$".
Keys: `croston_forecasting_1972`, `syntetos_accuracy_2005`.
Implies: SBA, not raw Croston, is the intermittent baseline. Verification: V-VERBATIM.

**R11 · CONTRADICTION (resolved) — the SBC cutoffs**
Syntetos & Boylan's published classification cutoffs (1.32, 0.49) contain arithmetic errors;
Kostenko & Hyndman correct them to $p=4/3$, $v=0.5$. Separately, the estimator-*selection* rule is
a **diagonal** $v > 2-\tfrac{3}{2}p$ in the $(p,v)$ plane, not a threshold on $p$.
> "They show the published cutoffs contain arithmetic errors, correcting them to $p = 4/3$ and
> $v = 0.5$ in place of 1.32 and 0.49. Separately, they propose a simpler and more accurate rule
> for choosing between the two estimators, dividing the quadrant diagonally".
Keys: `syntetos_categorization_2005`, `kostenko_note_2006`.
**Adjudication:** the chapter comes down for Kostenko, on the ground that the correction is an
arithmetic fix to a published error, and it keeps the two limbs apart. Consequence it draws: the
correction moves the *label* a venue receives but not the *estimator choice* for any venue with
appreciable $v$, because "for $p > 4/3$ the quantity $2 - \tfrac{3}{2}p$ is negative and the
bias-corrected estimator is preferred at every $v$".
Implies: our method uses 4/3 and 0.5 for classification and the diagonal for estimator selection;
we must not report a "near-boundary, estimator choice finely balanced" story.
Verification: V-VERBATIM (Kostenko constants **and** the diagonal both confirmed).

**R12 · PRIOR-WORK-LIMITATION / self-declared limitation**
An inter-demand interval $p$ estimated from one year of a single venue's trade carries sampling
uncertainty the chapter does not quantify.
> "A $p$ estimated from one year of a single venue's trade also carries sampling uncertainty that
> this chapter does not quantify."
Keys: `kostenko_note_2006`, `syntetos_categorization_2005`.
Implies: classification labels reported without an interval on $p$ must be presented as point
labels with the uncertainty flagged, especially for the venue nearest a boundary.
Verification: T8-CLOSURE (a statement about our own analysis, not about a source).

**R13 · PRIOR-WORK-LIMITATION (data, not method)**
A hurdle / two-part model is only as good as its occurrence signal; where that signal lives
outside the dataset the two-part structure buys nothing.
> "A hurdle model is only as good as the occurrence signal available to it, and where that signal
> lives outside the dataset the two-part structure buys nothing."
Keys: `cragg_statistical_1971`, `mullahy_specification_1986`.
Implies: do not fit a hurdle model on the booking-led venue while its occurrence signal (bookings)
is absent from the dataset; the negative result there is a data limitation and must be reported
as one. Verification: V-VERBATIM (both keys confirmed pass 2).

**R14 · CONTRADICTION (resolved to a weakened position) — weather**
Load forecasting finds temperature often unhelpful and sometimes detrimental at low voltage,
because it duplicates a seasonality the model already encodes. But the transfer to hospitality is
contestable: pubs respond to weather through outdoor trade and footfall, a channel with no such
duplication.
> "temperature was not an important factor in the accuracy of their low-voltage forecasts: often
> it had little to no effect, and in many cases including temperature was actually detrimental to
> accuracy." … "Electricity demand responds to temperature through heating and cooling, which is
> exactly the channel that duplicates seasonality. A public house responds to weather through
> outdoor trade and footfall, a channel with no such duplication and a plausible claim to
> independent information."
Keys: `haben_short_2019`, `hertel_explainable_2026`.
**Adjudication:** the chapter refuses the strong reading. It comes down on a weaker position:
"It is that a single site is not a region, that weather competes with a strong recurring weekly
pattern at this level of aggregation, and that a weather covariate must be shown to earn its place
before it is granted one." It further records that our own weather experiment returns a null which
"neither confirms nor refutes the position taken here".
Implies: weather enters the model only if it demonstrably improves accuracy; the null must be
reported as a null with its power limitation, not as confirmation.
Verification: V-VERBATIM (Haben "often detrimental" confirmed pass 2).

**R15 · REQUIREMENT (evidence type)**
An attribution share is not an out-of-sample contribution. Attribution methods split credit among
collinear inputs close to arbitrarily — the exact condition at issue — so an accuracy result, not
an attribution, must carry a covariate argument.
> "An attribution share measures how a fitted model distributes credit, not what a covariate
> contributes out of sample, and attribution methods divide credit among collinear inputs close to
> arbitrarily … The accuracy result, not the attribution, is what carries the argument."
Keys: `hertel_explainable_2026`, `haben_short_2019`.
Implies: no SHAP/attribution figure may be used as evidence for or against including a covariate;
only held-out accuracy may. Verification: V-CORRECTED (Hertel's shares were rounded in a
flattering direction and were restated exactly: 89% / 3.6% / 2.7%).

**R16 · REQUIREMENT + PRIOR-WORK-LIMITATION (conformal upper bound)**
Split-conformal coverage is bounded below by the nominal level and above by that level plus
$O(1/n)$; **the upper bound additionally requires conformity scores to be almost surely distinct**,
a condition that fails on a series of mostly zeros where tied scores are the norm.
> "coverage is bounded below by the nominal level and above by that level plus a term of order one
> over the calibration-set size. Both bounds are on \emph{marginal} coverage, in expectation over
> the calibration draw, and the upper bound additionally requires the conformity scores to be
> almost surely distinct. That last condition needs stating plainly, because it fails on precisely
> the data this work is concerned with."
Keys: `angelopoulos_conformal_2023`.
Implies: we may not diagnose over-coverage on an intermittent venue by appeal to the upper bound.
Verification: V-VERBATIM (two-sided bound confirmed pass 2).

**R17 · REQUIREMENT (reporting standard for coverage)**
Expected coverage and realised coverage on a finite window are different objects. Coverage must be
reported **with the interval width that produced it and with the number of points it was measured
on**.
> "the guarantee is on coverage in expectation over the calibration draw while realised coverage on
> a finite window is a random variable around it. … Coverage reported without the width that
> produced it, and without the number of points it was measured on, conceals both facts at once."
Keys: `angelopoulos_conformal_2023`, `kolassa_evaluating_2016`.
Implies: every coverage number in our results chapter is a triple (coverage, mean width, n).
Verification: V-VERBATIM.

**R18 · REQUIREMENT (adaptivity has a price)**
Trading data has no particular reason to be exchangeable, so online conformal variants are
available; but adaptive updating degrades efficiency increasingly with step size on exchangeable
scores, so a method that adapts to a shift that never arrives is worse than one that does not
adapt at all.
> "on exchangeable scores the adaptive update degrades efficiency increasingly with its step size,
> so a method that adapts to a shift that never arrives is worse than one that does not adapt at
> all."
Keys: `zaffran_adaptive_2022`, `gibbs_adaptive_2021`, `xu_conformal_2021`, `xu_sequential_2023`,
`angelopoulos_conformal_2023-1`, `stocker_gentle_2025`.
Implies: adaptive calibration must be justified by an observed shift, and a static band is the
control it is scored against. Verification: V-VERBATIM (Zaffran, Xu, Conformal PID all confirmed).

---

## Section `sec:rw-ruler` — error measures and model selection

**R19 · REQUIREMENT (precision of a threshold condition)**
Absolute-error measures optimise for the median, which makes a constant zero look best — but the
condition under which that is *exactly* true is $p > 2$ (zero periods outnumber trading periods),
**stronger than the $p > 4/3$ intermittency cutoff**.
> "Measures built on absolute errors optimise for the median, which on intermittent series makes a
> constant zero look like the best available prediction, and the condition under which that is
> exactly true is stronger than intermittency as classified above: the minimising constant is zero
> only once zero periods outnumber trading periods, that is for $p > 2$, not merely $p > 4/3$."
Keys: `hewamalage_forecast_2023`.
Implies: the zero-forecast degeneracy argument may only be made for venues with $p > 2$; for
$4/3 < p \le 2$ we must not claim it. Verification: **GAP** —
`hewamalage_forecast_2023` is named in no T8 confirmed list, and this is a load-bearing
statistical threshold that a reviewer flagged as *wrong* in the prior draft. Check first.

**R20 · PRIOR-WORK-LIMITATION (denominator hazard)**
Benchmark-scaled measures are deflated by a naive benchmark that scores exact zeros on zero
actuals; both failure modes bite hardest on the venue most in need of a metric.
> "a naive benchmark scoring exact zeros on zero actuals deflates the denominator those measures
> divide by. Both failure modes bite hardest on the venue this estate most needs a metric for, one
> whose median trading day takes nothing."
Keys: `hewamalage_forecast_2023`.
Implies: MASE on the sparse venue is not defensible; an unscaled absolute error is the fallback,
and the reason must be stated. Verification: **GAP** (same key).

**R21 · REQUIREMENT (metric = target)**
Selecting an error measure is selecting which functional of the predictive distribution is wanted,
not merely a scale. Squared base errors elicit the mean; absolute errors elicit the median. The
argument on this estate favours a **mean-eliciting, squared-scaled** measure.
> "selecting a measure is selecting a target rather than merely a scale." … "Those strands make a
> case for a mean-eliciting, squared-scaled measure on this estate."
Keys: `kolassa_why_2020`, `hewamalage_forecast_2023`, `makridakis_m5_2022`.
Implies: RMSSE is the measure the chapter argues for. Verification: V-VERBATIM for
`kolassa_why_2020` (functionals quote) and V-CORRECTED for `makridakis_m5_2022` (the 73%/17% =
90% figures were wrong at 77.3% and were restated).

**R22 · REQUIREMENT (coherence of reconciliation)**
Point forecasts minimising MAE/MASE are **usually not coherent**, because the median of a sum is
not the sum of the medians; coherence follows when the measure is minimised by the conditional
mean. This is the condition under which estate reconciliation is coherent with the fitted
objective. MinT's optimality additionally requires unbiased base forecasts — not innocuous on a
series of mostly zeros.
> "point forecasts minimising MAE, or MASE, which is a scaled MAE, are usually not coherent,
> whereas coherence follows when the measure is minimised by the conditional mean." … "That
> optimality holds only if the base forecasts are themselves unbiased, a condition
> Section~\ref{sec:rw-ruler} shows is not innocuous on a series of mostly zeros."
Keys: `kolassa_we_2023`, `wickramasuriya_optimal_2019`, `cini_graph-based_2024`,
`athanasopoulos_forecast_2024`.
Implies: if we reconcile venue forecasts to an estate total, the base forecaster must be fitted
to a mean-eliciting loss, and the unbiasedness precondition must be checked and reported.
Verification: V-VERBATIM (`kolassa_we_2023` — the ledger explicitly records that "usually not
coherent" is the correct wording; MinT minimum-trace confirmed pass 2).

**R23 · CONTRADICTION (self-disclosed, resolved as a limitation)**
The chapter's own argument runs **against** the measure the results chapter reports.
> "This dissertation's headline accuracy figures are mean-absolute-scaled, with an unscaled
> absolute error at the venue where no scale basis proved defensible, so the argument assembled
> here runs against the measure the results chapter reports. The reasons are ones of comparability
> with artefacts frozen before this argument was assembled, and the tension is a limitation of the
> work rather than a point in its favour."
Keys: (chapter's own; supported by `hewamalage_forecast_2023`, `kolassa_why_2020`)
**Adjudication:** the chapter comes down on **disclosure, not repair** — it keeps MASE for
comparability with frozen artefacts and books the mismatch as a limitation, restated in
`sec:rw-synthesis`.
Implies: our method reports MASE as the headline, and both the methodology and the limitations
inventory must carry the RMSSE argument and the comparability reason. Recomputing on RMSSE would
close it but is a methodology change (gate 1). Verification: T8-CLOSURE (a claim about our own
artefacts, verifiable against `brain/log/*result*.md`, not against a paper).

**R24 · REQUIREMENT (metric is not the objective)**
The lowest forecasting error does not necessarily give the lowest system cost; at high lumpiness
all-zero forecasts yield the lowest cost. Where a series is lumpy enough, change the objective
rather than keep tuning against the measure.
> "the lowest forecasting error does not necessarily lead to the lowest system cost, and … all-zero
> forecasts yield the lowest cost when lumpiness is high; where a series is lumpy enough the right
> response is to change the objective rather than keep tuning against a measure that has stopped
> tracking what matters."
Keys: `chatfield_all-zero_2007`.
Implies: on the lumpiest venue, a forecast-accuracy target is the wrong target; the decision the
forecast feeds must be scored instead. Verification: V-VERBATIM (settled at source in iteration 1
against a reviewer challenge, and re-confirmed in T8).

**R25 · REQUIREMENT (score the distribution, not the point)**
For count and intermittent demand the point forecast may be the wrong object; characterise the
whole predictive distribution with a proper scoring rule, which assesses calibration and sharpness
together. A band reported by coverage alone is scored on calibration with sharpness suppressed.
> "the emphasis on point forecasts misses the mark for count and intermittent demand, and that one
> should characterise the entire predictive distribution. His instrument is the proper scoring
> rule, which assesses calibration and sharpness together … a band reported by its coverage alone
> is scored on calibration with sharpness suppressed."
Keys: `kolassa_evaluating_2016`, `angelopoulos_conformal_2023`.
Implies: coverage must always be paired with a sharpness/width statistic (this is the same
requirement as R17, reached from the other side). Verification: V-VERBATIM.

**R26 · REQUIREMENT (pairwise comparison procedure)**
A difference of means is not a finding. Use the Diebold–Mariano test of equal predictive accuracy
with the Harvey finite-sample correction — and note the correction factor **vanishes when the
evaluation window is as short as the horizon**, leaving a computable but wholly uninformative
statistic.
> "Declaring one model better than another on a difference of means is not a finding." …
> "showed the statistic is seriously over-sized in moderate samples, supplying a finite-sample
> correction whose factor vanishes when the evaluation window is as short as the horizon, leaving a
> corrected statistic that is computable but carries no information whatever."
Keys: `diebold_comparing_1995`, `harvey_testing_1997`.
Implies: every model comparison carries a corrected DM statistic, and any comparison where
window ≈ horizon must be declared uninformative rather than reported as a result.
Verification: Harvey correction formula V-VERBATIM; `diebold_comparing_1995` was **absent from the
NotebookLM notebook entirely** and was added this session — its specific claim is T8-CLOSURE at
best. Worth a check.

**R27 · REQUIREMENT (multi-model comparison)**
For more than two models use a model confidence set, which contains the set of superior models
with asymptotic probability at least $1-\alpha$. A retained set containing nearly every candidate
is a statement about the evidence available, **not** a finding of equivalence.
> "a model confidence set contains the set of superior models with asymptotic probability at least
> $1 - \alpha$ and, in their formulation, acknowledges the limitations of the data … A retained set
> containing nearly every candidate is therefore a statement about the evidence available rather
> than a finding of equivalence."
Keys: `hansen_model_2011`.
Implies: if our MCS retains most models, we report "the data are uninformative", never "the models
are equivalent". Verification: V-VERBATIM.

**R28 · REQUIREMENT (evaluation-origin count; rank instability)**
Rankings are fragile: slight changes to setup or metric shift the state-of-the-art belief, and the
main drivers of rank instability are hierarchical aggregation and scaling — with the M5 scale
normalisation **less stable than other scale-free errors**. Three consequences: the number of
evaluation origins is not a free parameter; the case for a squared scaled error is strong but not
costless; and this literature predicts that a ranking *may move*, not which way.
> "The number of evaluation origins is not a free parameter. The case for a squared scaled error is
> strong but not costless, since the scale normalisation it depends on is itself a documented
> source of rank instability. And these results predict that a ranking may move, not which way."
Keys: `brigato_there_2025`, `hewamalage_look_2021`.
Implies: the number of evaluation origins must be pre-specified and justified, and any ranking we
report must be accompanied by a rank-stability statement. Verification: V-VERBATIM (Brigato
8/14/~5000 and Hewamalage rank stability both confirmed).

**R29 · CONTRADICTION — literature vs this project's observation (#1 of 2), UNRESOLVED-IN-CHAPTER**
> "This is the first of two places where the literature and this project's observations point in
> different directions: the reversal this dissertation reports on increasing its evaluation origins
> moved in the direction that favoured the model already in production, and no work cited here
> predicts that direction."
Keys: `hewamalage_look_2021`, `brigato_there_2025`.
**Adjudication: none.** The chapter states the divergence and stops, by design — the R-Zero rule
forbids it from saying what a later chapter will do. Flagged at the end of this file.
Implies: the results/discussion chapter must explain the direction of the reversal, or explicitly
decline to. Verification: T8-CLOSURE (a claim about our own runs).

---

## Section `sec:rw-deviation` — from a band to a deviation signal

**R30 · REQUIREMENT (detector taxonomy)**
Change-point detection answers *when the regime moved*; point-anomaly detection answers *is this
observation extreme*. Conflating the two is a modelling error.
> "a sudden quiet Saturday is a point anomaly against the band, a venue closure is a change point,
> and conflating the two is a modelling error."
Keys: `adams_bayesian_2007`, `truong_selective_2020`, `siffer_anomaly_2017`,
`page_continuous_1954`.
Implies: our pipeline runs two distinct detectors with two distinct triggers, and never scores one
on the other's ground truth. Verification: V-VERBATIM (Truong, Siffer, Page, Adams all
confirmed pass 2).

**R31 · REQUIREMENT (detector choice and scoring criterion)**
CUSUM is the production detector — cheap per observation, no posterior over run length, sensitive
to small sustained shifts — with BOCPD retained as the offline benchmark. The criterion for
judging such a detector is the **average run length**, which is two-sided: the expense of false
alarms under stable conditions against the delay before a real change is acted on.
> "the cumulative-sum scheme is the detector this work puts into production, with Bayesian online
> change-point detection retained as the offline benchmark it is scored against." … "The average
> run length, which he defines as the expected number of observations before action is taken,
> measures the expense of false alarms when conditions are stable and the delay before a real
> change is acted on when they are not."
Keys: `page_continuous_1954`, `adams_bayesian_2007`, `truong_selective_2020`.
Implies: detector evaluation reports both limbs of the ARL trade, and this is the same asymmetric
cost the agent evaluation reaches independently (see R50). Verification: V-VERBATIM.

**R32 · PRIOR-WORK-LIMITATION (firm, negative)**
Point-adjusted F1 cannot serve as a headline detection metric: the protocol is generous enough
that **randomly generated anomaly scores reach an adjusted F1 near one and overturn most
state-of-the-art results**.
> "the point-adjustment protocol … is so generous that randomly generated anomaly scores reach an
> adjusted F1 near one and overturn most state-of-the-art results." … "point-adjusted F1 cannot
> serve as a headline detection metric, because it would flatter a detector that has learned
> nothing."
Keys: `kim_towards_2022`, `liu_elephant_2024`.
Implies: no F1-PA number appears as a headline in our results. Verification: V-VERBATIM
(NotebookLM failed on this; Zotero full text settled it — the chapter's "most state-of-the-art
results" is exactly right).

**R33 · CONTRADICTION-ADJACENT, adjudicated: firm negative, weak positive**
The replacement metric (a lag-tolerant, random-robust measure in the spirit of VUS-PR) rests on a
benchmark whose series are not hospitality series, so it is adopted as the **best available
default and not as a settled requirement**.
> "What the literature establishes is negative and firm … What it recommends in its place, a
> lag-tolerant, random-robust measure in the spirit of VUS-PR, is weaker, since it rests on a
> benchmark whose series are not hospitality series, and it is adopted here as the best available
> default and not as a settled requirement."
Keys: `liu_elephant_2024`, `bhattacharya_towards_2024`, `gim_evaluation_2023`.
**Adjudication:** the chapter grants the negative finding full force and explicitly downgrades the
positive recommendation. Follow the negative strictly, the positive as a default.
Implies: use VUS-PR (or equivalent) but do not defend it as required by the literature.
Verification: V-VERBATIM (TSB-AD 1070 series confirmed under challenge).

**R34 · REQUIREMENT (baseline lesson, repeated)**
Simpler statistical detectors often beat elaborate neural ones.
> "finding along the way that simpler statistical detectors often beat elaborate neural ones, which
> echoes the baseline lesson of Section~\ref{sec:rw-rhythm}."
Keys: `liu_elephant_2024`.
Implies: a statistical detector must be in the comparison set. Verification: V-VERBATIM.

**R35 · REQUIREMENT (state the guarantee precisely; a bound is not a prediction)**
Exact finite-sample coverage holds only under exchangeability, which a change point violates by
construction. What survives a regime shift is time-averaged asymptotic validity resting on a
stationary state distribution, plus faster post-shift convergence, and the coverage loss is
**bounded** by a term growing with the state misclassification rate — a bound, not a prediction.
> "Exact finite-sample coverage holds only under exchangeability, which a change point violates by
> construction. What survives a regime shift is time-averaged asymptotic validity … the loss of
> coverage is bounded by a term that grows with the rate at which the state is misclassified. That
> is a bound, not a prediction, so it constrains how bad coverage can get without implying that it
> must degrade at all."
Keys: `sun_conformal_2025`, `barber_conformal_2023`.
Implies: we may never write "coverage degrades in proportion to the misclassification rate".
Verification: V-VERBATIM (both confirmed pass 2; this exact proportionality-vs-bound error was
caught by Role B in iteration 3 and fixed).

**R36 · REQUIREMENT (interpreting an observed coverage shortfall)**
Distinguish a short-window sampling artefact from a real shortfall. A handful of points says
nothing; a shortfall that is **several standard errors wide, persists at every horizon step and
reproduces on a second model** is not sampling noise, and Barber et al. — not sampling noise — is
the frame in which it should be read.
> "A shortfall that is several standard errors wide, persists at every horizon step and reproduces
> on a second model is not explained that way, and \citet{barber_conformal_2023} rather than
> sampling noise is the frame in which it should be read".
Keys: `barber_conformal_2023`.
Implies: our anchor-venue under-coverage is presented as a finding requiring explanation, with the
three qualifying criteria evidenced (SE width, per-horizon persistence, second-model
reproduction). Verification: V-VERBATIM (Barber's TV-distance bound, no assumption on the joint
distribution, confirmed pass 2).

**R37 · REQUIREMENT (design consequence — the sharpest operational verdict in the chapter)**
Prefer a regime variable that is **observed** over one that is **inferred**, because an observed
state drives the misclassification term, and therefore the coverage-loss bound, to zero.
> "prefer a regime variable that is observed over one that is inferred, because whether a venue is
> trading is recorded in the till rather than hidden in the residuals, and an observed state drives
> the misclassification term, and so the bound, to zero."
Keys: `sun_conformal_2025`, `barber_conformal_2023`.
Implies: the trading/closed state must be read from the till record, never inferred from
residuals; per-state conformal calibration keys on the observed state.
Verification: V-VERBATIM (derived from R35's confirmed bound).

**R38 · CONTRADICTION — literature vs this project's observation (#2 of 2), UNRESOLVED-IN-CHAPTER**
The guarantees for online adaptation concern rates of convergence after a shift; none promises an
adaptive procedure will beat a static one on any particular series.
> "This is the second of the two places where the literature and this project's observations
> diverge. At the one genuine regime change in this estate's data, adaptive calibration performed
> \emph{worse} than leaving the band alone, which the framing of this section would not have led a
> reader to expect."
Keys: `zaffran_adaptive_2022`, `gibbs_adaptive_2021`, `sun_conformal_2025`.
**Adjudication: partial.** The chapter pre-empts the divergence by noting Zaffran's efficiency
penalty "runs the other way", but it does not claim that explains the observation. Flagged at the
end.
Implies: report the adaptive-vs-static comparison as a negative result with the efficiency penalty
offered as a candidate explanation, not a demonstrated one. Verification: T8-CLOSURE.

---

## Section `sec:rw-surfacing` — agents that act without being asked

**R39 · PRIOR-WORK-LIMITATION**
Tool-use plumbing is mature and is not where the open problem lies; reliability, not capability, is
the binding constraint — a frontier model completes only 35.2% of airline-domain τ-bench tasks
single-attempt, **before** proactivity enters.
> "even GPT-4o completing only 35.2\% of airline-domain tasks on a single-attempt basis, so
> reliability, not capability, is the binding constraint even before proactivity enters."
Keys: `yao_-bench_2024`, `yao_react_2022`, `schick_toolformer_2023`, `shinn_reflexion_2023`.
Implies: our contribution must not be framed as a tool-use advance; reliability under proactivity
is the measured object. Verification: V-VERBATIM.

**R40 · REQUIREMENT (bounded claim)**
A learned rhythm does the work of the **retrieval half** of a memory stream and nothing more:
there is no reflection step abstracting episodes into higher-level inferences, and no store of the
agent's own past interventions.
> "The claim made here is accordingly the narrow one: the rhythm serves as the agent's model of
> normality, not as a full memory system in the sense \citet{hu_memory_2026} and
> \citet{park_generative_2023} describe."
Keys: `hu_memory_2026`, `park_generative_2023`, `lewis_retrieval-augmented_2020`.
Implies: we may not claim a memory architecture. Verification: V-VERBATIM (Hu, Park
importance-sum threshold both confirmed pass 2).

**R41 · REQUIREMENT (security)**
A retrieval store over live operational data is an attack surface once populated from production
traffic.
> "such stores are an attack surface, as PoisonedRAG \citep{zou_poisonedrag_2025} demonstrates,
> which matters once the memory is populated from production traffic."
Keys: `zou_poisonedrag_2025`.
Implies: any production-populated store in our system needs a stated threat model.
Verification: V-VERBATIM (Zotero settled it after NotebookLM failed).

**R42 · PRIOR-WORK-LIMITATION (the central one)**
The dominant documented failure of proactive agents is **over-offering**, not under-offering:
every strong proprietary model exceeds a 50% false-alarm rate on the proportion of predictions
that were not needed (51.85% GPT-4o to 64.73% GPT-4o-mini). "The headline finding is not that
proactivity is hard to produce but that it is hard to *restrain*."
Keys: `lu_proactive_2024`.
Implies: our headline metric must penalise over-offering; a recall-led framing is disqualified.
Verification: V-VERBATIM (all of Lu's figures — 6790/233/51.85/64.73/66.47/91.80 — confirmed;
the per-prediction denominator was settled at source in iteration 2 against a reviewer challenge).

**R43 · REQUIREMENT (numeric reporting standard)**
Do not report to a precision the test set cannot resolve. On a 233-event test set an agreement
rate has ~2 percentage points of sampling uncertainty, and an F1 — whose sampling distribution is
not that of a simple proportion — is no better resolved.
> "Both are quoted to four significant figures in the source and are reported to two here. If the
> agreement rate was measured on the same 233-event test set, its sampling uncertainty is around
> two percentage points, and the F1, whose sampling distribution is not that of a simple
> proportion, is no better resolved."
Keys: `lu_proactive_2024`.
Implies: our agent metrics are reported to a precision justified by n, with n stated, and F1 does
**not** get a binomial standard error. Verification: V-VERBATIM.

**R44 · REQUIREMENT (timing objective)**
Timing should be modelled as a **window of valid moments**, not a single labelled point;
penalising any deviation from one rigid timestamp is the wrong objective.
Keys: `ding_proactor_2026`.
Implies: our timing evaluation admits a tolerance window. Verification: V-CORRECTED — the ledger
records this key was **wrongly marked as a preprint**; it is published at ACL 2026, Vol. 1 Long
Papers, pp. 18257–18303, and the marker was removed. The claim itself is T8-CLOSURE.

**R45 · REQUIREMENT (intervention policy)**
Formulate intervention as a **cost-sensitive decision**: speak only when a *calibrated acceptance
probability* clears a threshold set by the asymmetric costs of false alarms and misses. The
precision gain and the false-alarm reduction follow from the same gate and must be read as **one
result, not two**.
> "the agent speaks only when calibrated acceptance probability clears a threshold set by the
> asymmetric costs of false alarms and misses." … "Both movements follow from the same gating
> threshold and should be read as one result, not two."
Keys: `fu_prism_2026`, `lu_proactive_2024`, `tang_proagentbench_2026`.
Implies: our gate is a calibrated-probability threshold derived from a cost ratio; we report the
paired movement as one effect. Verification: V-VERBATIM (PRISM 66.47→86.61 and 50.22→22.94
confirmed; the baseline-identity doubt was resolved at source — Qwen2-7B-Proactive *is* Lu's best
fine-tuned agent).

**R46 · REQUIREMENT (urgency is not uniform)**
The urgency of a clarifying question depends on what is missing: goal clarification retains
near-oracle value only if asked very early, while input clarification remains recoverable through
roughly half of execution. A single uniform urgency for every kind of missing information is wrong.
Keys: `gulati_ask_2026`.
Implies: if our agent asks, the urgency/threshold must vary by what is missing.
Verification: V-VERBATIM (10% / ~50% figures confirmed pass 2).

---

## Section `sec:rw-evaluation` — judging the agent's judgement

**R47 · REQUIREMENT (LLM-judge protocol)**
An automated judge is usable only as an **instrumented, bias-audited proxy**, with the real target
being human adopt-or-dismiss outcomes on actual surfaced insights. Judges must be validated
against human judgments before use.
> "The position this work takes is to use an automated judge only as an instrumented, bias-audited
> proxy, with the real target being human adopt-or-dismiss outcomes on actual surfaced insights."
Keys: `zheng_judging_2023`, `wang_large_2024`, `panickssery_llm_2024`, `bavaresco_llms_2025`.
Implies: any judge in our harness gets a position-swap audit and a self-preference check, and its
scores are never the headline. Verification: V-VERBATIM (all four confirmed).

**R48 · REQUIREMENT (interpretation of agreement rates)**
The judge-vs-human and human-vs-human agreement rates (85% and 81%) are computed over different
pairings and are not a paired comparison; the defensible reading is that the judge performs about
as well as a human annotator, **not better**.
Keys: `zheng_judging_2023`.
Implies: we may not claim superhuman judging. Verification: V-VERBATIM (85 vs 81 confirmed).

**R49 · REQUIREMENT (the loss function's structure)**
Compliance (response to a warning) and reliance (response to its absence) are governed by
**different** detector properties — compliance by the response criterion, reliance by sensitivity.
> "\emph{compliance} is the operator's response to a warning, \emph{reliance} the response to its
> absence, and crucially the two are governed by different properties of the detector."
Keys: `meyer_conceptual_2004`.
Implies: two separate measurements; a single accuracy number cannot carry both.
Verification: V-VERBATIM.

**R50 · REQUIREMENT (asymmetry), with an explicit strength ceiling**
False alarms are more damaging to overall performance than misses; false-alarm-prone automation
degrades **both** compliance and reliance while miss-prone automation appears to affect only
reliance. The evidence is a 32-participant lab study reported as a direction without an effect
size, and the asymmetry is asserted at that strength and no higher.
> "Their stated implication for design is the premise this dissertation's loss function encodes:
> false alarms are more damaging to overall performance than misses. The evidence is a laboratory
> study of thirty-two participants … reported as a direction without an effect size, and the
> asymmetry is asserted here at that strength and no higher".
Keys: `dixon_independence_2007`, `meyer_conceptual_2004`.
Implies: our loss is asymmetric in the false-alarm direction, but the *magnitude* must come from
operator elicitation, not from Dixon. Verification: V-VERBATIM (32 participants confirmed).

**R51 · REQUIREMENT (alert fatigue is cumulative; and a statistic-type constraint)**
The cost of an unnecessary alert is not paid by that alert but by the next one. The field magnitude
is an **adjusted incident rate ratio** (0.70 and 0.90) from a multivariable negative binomial model
of **clinician-level** acceptance rates — a proportional change in a rate, closer to a relative
risk than an odds ratio, and **not** an absolute change in percentage points. The numbers do not
transfer; the mechanism does.
Keys: `ancker_effects_2017`, `page_continuous_1954`.
Implies: our alert-budget argument cites the mechanism, never the magnitude, and must not restate
IRRs as odds ratios or as percentage-point changes. Verification: **V-CORRECTED** — this was one of
the four errors found in T8 pass 1 (the chapter had said "odds" and "alert-level"); the current
wording is the fix and was verified by direct EuropePMC retrieval of PMC5387195, because the
NotebookLM source for this key is non-ready.

**R52 · REQUIREMENT (which half of a meta-analysis to quote)**
Quote the trust ordering from the **correlational** half only: performance-based factors
$\bar r = +0.34$ [+0.25, +0.43] against attribute-based $\bar r = +0.03$ [−0.09, +0.15],
non-overlapping, five studies a side. The experimental half rests the performance estimate on two
studies against eight for attributes.
Keys: `hancock_meta-analysis_2011`, `lee_trust_2004`, `parasuraman_humans_1997`,
`parasuraman_complacency_2010`.
Implies: trust claims we make are scoped to the correlational analysis and cite k.
Verification: V-VERBATIM (the correlational/experimental split and both k values retrieved at
source in iteration 2).

**R53 · REQUIREMENT (the headline agent metric)**
The right metric is **calibrated precision against real dismissals, weighted by the asymmetric cost
of an interruption** — not an undifferentiated F1.
> "the right metric is calibrated precision against real dismissals, weighted by the asymmetric
> cost of an interruption, and not an undifferentiated F1."
Keys: `trinh_hil-bench_2026`, `fu_prism_2026`, `dixon_independence_2007`.
Implies: this is the single most binding metric verdict in the chapter. Verification: V-VERBATIM
for the component keys.

**R54 · CONTRADICTION (resolved) — Ask-F1's symmetry against the section's asymmetry**
HiL-Bench's Ask-F1 is the **unweighted** harmonic mean of question precision and blocker recall,
which weights precision and recall equally — exactly the symmetry the section has just rejected.
> "an unweighted harmonic mean weights precision and recall equally, which is exactly the symmetry
> this section has just rejected, so the adapted measure must be an $F_\beta$ whose $\beta$ is
> fixed from the operator's elicited miss-to-false-alarm cost ratio, not left at unity."
Keys: `trinh_hil-bench_2026`, `dixon_independence_2007`, `meyer_conceptual_2004`,
`ancker_effects_2017`.
**Adjudication:** the chapter comes down **against Ask-F1 as-is** and for an $F_\beta$ with $\beta$
fixed from the operator's elicited miss-to-false-alarm cost ratio. Grounds: the asymmetry is
empirically supported (R50, R51) while Ask-F1's symmetry is an unargued default of its coding
domain.
Implies: our method elicits the cost ratio from the operator, derives $\beta$ from it, and reports
$F_\beta$ — not Ask-F1, not $F_1$. The elicitation instrument becomes a required methodology
artefact. Verification: V-VERBATIM (`gulati_ask_2026` and `trinh_hil-bench_2026` both confirmed
pass 2). NOTE: this replaced a prior draft's endorsement of Ask-F1, which Role B called
statistically wrong in iteration 3.

**R55 · REQUIREMENT (degeneracy condition on the metric)**
$F_\beta$ (or any cost-ratio sweep) is informative only where the evaluation contains **both**
failure modes. A sweep in which one side never occurs is degenerate by construction whatever value
it returns, and an accept-or-dismiss record from a system that alerts rarely and is rarely wrong
when silent will have that shape.
Keys: `trinh_hil-bench_2026`.
Implies: before reporting a cost-ratio sweep we must show both failure modes occur in the record;
otherwise the sweep is reported as degenerate. Verification: T8-CLOSURE (general condition, stated
by the chapter rather than quoted; the chapter deliberately does **not** assert our own sweep's
result — see the R-Zero note).

**R56 · REQUIREMENT + self-declared limitation (calibration must be measured)**
Modern networks are overconfident; temperature scaling restores calibration as measured by
**expected calibration error**, which is the natural instrument for an agent's stated confidence
and the one that would carry the coverage guarantee through to the agent's output. It is not
computed in this dissertation.
> "That instrument is identified by this chapter and is not computed in this dissertation, which is
> a limitation of the work."
Keys: `guo_calibration_2017`.
Implies: ECE is the named instrument; its absence is a stated limitation, restated in the
`sec:rw-synthesis` inventory. Computing it would close R56 and strengthen R45/R53.
Verification: V-VERBATIM for Guo; the non-computation is T8-CLOSURE (a fact about our work).

---

## Section `sec:rw-synthesis` — what the literature leaves open

**R57 · REQUIREMENT (each established result carries a qualification)**
Four results stand established, each qualified: rhythm can be borrowed but every demonstration is
on a far larger collection and the theory is about large collections; a deviation is a band breach
whose coverage loss under regime change is **bounded, not eliminated**; an agent's learned rhythm
is a model of normality but **not a full memory architecture**; and the worth of an action is
measurable against an asymmetry that is **empirically tested, not merely assumed**. All four were
demonstrated in isolation, in domains distant from hospitality.
Keys: `das_-context_2025`, `zhou_context-driven_2025`, `liu_generative_2024`,
`montero-manso_principles_2021`, `sun_conformal_2025`, `barber_conformal_2023`,
`liu_elephant_2024`, `lu_proactive_2024`, `hu_memory_2026`, `park_generative_2023`,
`meyer_conceptual_2004`, `dixon_independence_2007`, `ancker_effects_2017`, `fu_prism_2026`,
`trinh_hil-bench_2026`.
Implies: each of our four claims must be stated with its qualification attached.
Verification: V-VERBATIM across the constituent keys.

**R58 · PRIOR-WORK-LIMITATION + a novelty constraint on us**
PRISM already sets an intervention threshold from an asymmetric miss-to-false-alarm cost ratio and
gates on a calibrated acceptance probability. **No claim of methodological novelty in
cost-sensitive intervention is available to this dissertation, and none is made.** What PRISM
leaves undone is reporting the *calibration* of the probability its gate depends on.
> "It reports the gate's effect but not the calibration of the probability the gate depends on. No
> claim of methodological novelty in cost-sensitive intervention is therefore available to this
> dissertation, and none is made."
Keys: `fu_prism_2026`.
Implies: our novelty claim is field instantiation only. Any sentence claiming a novel policy is a
defect. Verification: V-VERBATIM.

**R59 · REQUIREMENT (the three-part gap our method must fill)**
Three things, jointly, that no surveyed system does: (i) fix the cost ratio to the **stated
preferences of the person who bears the cost**; (ii) **measure the calibration** of the acceptance
probability that ratio is applied to; (iii) **score the resulting decisions against that same
person's accept-or-dismiss judgements on signals drawn from their own business**.
Keys: `fu_prism_2026`, `lu_proactive_2024`, `tang_proagentbench_2026`, `yang_contextagent_2025`,
`yang_fingertip_2025`, `yao_-bench_2024`, `liu_proactiveeval_2025`, `gulati_ask_2026`,
`ding_proactor_2026`.
Implies: all three legs must be delivered or the contribution claim collapses. Leg (ii) is
currently **not delivered** (ECE not computed, R56); leg (iii) is threatened by the author-as-rater
problem (R62). Verification: V-VERBATIM for the evaluation-mode attribution of the nine systems
(the enumeration was extended to all nine in the final revision after Role C found it covered
seven).

**R60 · PRIOR-WORK-LIMITATION (the gap claim itself)**
The nine surveyed proactive systems are evaluated against annotated corpora, simulated/scripted
users, or an LLM judge. **None is scored against the decisions of the operator whose work it is
intervening in.**
Keys: as R59. Figure `fig:gap-map` encodes this; the empty top-right cell *is* the gap claim.
Implies: our evaluation instrument must produce operator accept/dismiss decisions on real signals.
Verification: V-VERBATIM.

**R61 · REQUIREMENT (the rhythm is per-venue)**
The delivered rhythm is deliberately per-venue. Cross-venue pooling is **tested and not adopted**;
borrowing across venues is a hypothesis examined, not a component of the system delivered, and the
contribution must not be read as resting on it.
> "The rhythm is deliberately per-venue: cross-venue pooling is tested here and is not adopted …
> Borrowing across venues is therefore a hypothesis this work examines, not a component of the
> system it delivers".
Keys: `montero-manso_principles_2021`.
Implies: the served model is per-venue; group ICL appears in the results as a negative result.
Verification: T8-CLOSURE (a claim about our own system).

**R62 · PRIOR-WORK-LIMITATION / design threat (scope)**
Single estate, single operator ⇒ at most one rater of accept-or-dismiss outcomes and therefore no
inter-rater reliability; and where the rater is the author rather than the operator, the judgement
is **not independent of the system being judged**, which is a threat to *internal validity*, not
merely a limit on precision. Plus: one anchor venue, one sparse booking-led venue whose occurrence
signal is absent, one venue closing mid-period (a structural break), a fourth location excluded,
and a single seasonal cycle so **no year-over-year seasonality is estimable at all**. Findings are
"existence proofs and failure modes, not estimates that generalise".
Keys: (chapter's own; `paleyes_challenges_2022` supports the field-instantiation framing)
Implies: every generalisation verb in our results must be checked against this; author-labelled
outcomes must be declared as such. Verification: T8-CLOSURE.

**R63 · PRIOR-WORK-LIMITATION (positioning risk)**
The contribution positioning rests on a 2026 preprint; if PRISM's results do not survive review the
gap is differently shaped, though the absence of an operator-grounded evaluation across the nine
enumerated systems would remain.
Keys: `fu_prism_2026`.
Implies: the contribution statement must carry this conditional. Verification: V-VERBATIM
(peer-review status of every marked work re-checked; the marker count is 11 = 1 + 3 + 7).

---

# Contradictions register

| # | Contradiction | Sides | Adjudication | Follow |
|---|---|---|---|---|
| C1 | SBC classification cutoffs | `syntetos_categorization_2005` 1.32/0.49 vs `kostenko_note_2006` 4/3, 0.5 | **RESOLVED for Kostenko** — the correction is an arithmetic fix to a published error; the chapter additionally separates classification from the $v>2-\tfrac32 p$ selection diagonal | Use 4/3 and 0.5; use the diagonal for estimator selection |
| C2 | Apparent contradiction: LM machinery adds nothing (`tan_are_2024`) vs foundation models transfer (`das_decoder-only_2024`, `ansari_chronos_2024`) | — | **RESOLVED as not a contradiction** — "This does not contradict TimesFM and Chronos so much as locate the value precisely"; gains come from TS pretraining and patching | Credit patching/TS-pretraining, discount LM provenance |
| C3 | Internal features suffice vs external data helps (`chae_value_2024`) | within one source | **RESOLVED as period-conditional** — DL-beats-ML holds in the turbulent period only; the source's own conclusion is that external data helps | Inherit only the resource-constraint recommendation |
| C4 | Weather: load-forecasting detriment (`haben_short_2019`) vs the hospitality outdoor-trade channel | cross-domain transfer | **RESOLVED to a weakened position** — not "weather will not help" but "a weather covariate must be shown to earn its place"; grounds: the electricity mechanism (seasonality duplication) does not obviously transfer | Include weather only on demonstrated held-out gain |
| C5 | Hertel's attribution shares vs the accuracy result | `hertel_explainable_2026` vs `haben_short_2019` | **RESOLVED for the accuracy result** — attribution divides credit among collinear inputs arbitrarily, which is the very condition at issue | Never argue covariate inclusion from attribution |
| C6 | The chapter's squared-scaled argument vs the dissertation's reported MASE | internal | **RESOLVED as disclosure, not repair** — comparability with frozen artefacts; booked as a limitation of the work | Report MASE; carry the tension in methodology + limitations |
| C7 | MAE/MASE-optimal forecasts vs hierarchical coherence and MinT unbiasedness | `kolassa_we_2023` vs `wickramasuriya_optimal_2019` | **RESOLVED conditionally** — coherence follows from mean-eliciting measures; MinT's optimality "holds only if the base forecasts are themselves unbiased, a condition … not innocuous on a series of mostly zeros" | If reconciling, fit to a mean-eliciting loss and check unbiasedness |
| C8 | F1-PA's firm negative vs VUS-PR's weak positive | `kim_towards_2022`/`liu_elephant_2024` | **RESOLVED asymmetrically** — negative finding taken as firm, positive recommendation adopted as best-available default only (its benchmark is not hospitality) | Never headline F1-PA; use VUS-PR as a default, not as a requirement |
| C9 | Ask-F1's equal weighting vs the established false-alarm asymmetry | `trinh_hil-bench_2026` vs `dixon_independence_2007`/`ancker_effects_2017`/`meyer_conceptual_2004` | **RESOLVED against Ask-F1** — replaced by $F_\beta$ with $\beta$ from the operator's elicited miss-to-false-alarm cost ratio | Elicit the ratio; derive $\beta$; report $F_\beta$ |
| C10 | Agent memory ≠ retrieval (`hu_memory_2026`) vs the chapter's rhythm-as-memory framing | | **RESOLVED by narrowing the claim** — the rhythm does the retrieval half only | Do not claim a memory architecture |
| C11 | **Literature vs project observation #1** — direction of the ranking reversal on increasing evaluation origins | `hewamalage_look_2021`, `brigato_there_2025` | **UNRESOLVED-IN-CHAPTER** (by design, under R-Zero) | The results/discussion chapter owes an explanation |
| C12 | **Literature vs project observation #2** — adaptive calibration performed *worse* than a static band at the estate's one regime change | `zaffran_adaptive_2022`, `gibbs_adaptive_2021`, `sun_conformal_2025` | **UNRESOLVED-IN-CHAPTER** — Zaffran's efficiency penalty is noted as running the same way, but is not claimed to explain it | Report as a negative result with the efficiency penalty as a candidate, unproven, explanation |

## Writing defects flagged

Both unresolved contradictions (C11, C12) are **deliberate**, not accidental. The chapter's own
`litreview_critique.md` Synthesis 2 records the **R-Zero rule** adopted verbatim: "The chapter may
state what the literature says and what the project's design assumes, and nothing about what any
later chapter will do." So the chapter is *correct* to declare the divergence and stop. The defect
is therefore not the chapter's — it is a **downstream obligation**: if no discussion chapter picks
up C11 and C12, they become genuine unadjudicated contradictions in the thesis as a whole. The
chapter has already advertised them twice each (at the site and in `sec:rw-synthesis`'s closing
paragraph), so an examiner will look for the resolution.

One further deliberate omission worth tracking, from the same ledger: the chapter states the
$F_\beta$ **degeneracy condition** (R55) in general but declines to assert that *this project's*
sweep is degenerate, because that would import a results claim. That is a correct R-Zero call, but
it means R55 is stated without its instance — the results chapter must supply it.

## Rows most in need of a NotebookLM check

Priority order for the parent agent's verification pass:

1. **R19, R20, R21** — `hewamalage_forecast_2023`. The $p>2$ vs $p>4/3$ threshold and the
   naive-benchmark denominator hazard. This key appears in **no** T8 confirmed list, and the
   $p>2$ claim was a Role-B "statistically wrong" finding in iteration 3, so the current wording is
   a repair that was never independently source-checked. **Highest priority.**
2. **R26** — `diebold_comparing_1995`. Absent from the notebook until this session; the "formalised
   the test of equal predictive accuracy" attribution is not in a confirmed list.
3. **R9** — the absence claim ("no source surveyed here separates a calendar channel from a weather
   channel"). No key to check; falsifiable only by a sweep.
4. **R30, R31** — `truong_selective_2020` and `page_continuous_1954` are confirmed pass 2, but the
   chapter's specific ARL-as-two-sided-cost reading and the "reduces the whole family to a choice
   of cost function, search method and penalty" paraphrase are chapter-authored syntheses.
5. **R44** — `ding_proactor_2026`. Its *venue* was corrected this session; its *content* claim
   (timing as a window of valid moments, turn-level RL) is T8-CLOSURE only. Note the bib entry is
   still `@article` with no `journaltitle` — an open hygiene item.
6. **R57** — `athanasopoulos_forecast_2024`, `gibbs_adaptive_2021`, `xu_sequential_2023`,
   `stocker_gentle_2025`, `lewis_retrieval-augmented_2020`, `yao_react_2022`,
   `schick_toolformer_2023`, `shinn_reflexion_2023`, and the six-model design-space citation
   cluster (`woo_unified_2024`, `liu_moirai_2026`, `goswami_moment_2024`, `rasul_lag-llama_2024`,
   `garza_timegpt-1_2024`) are cited for framing and appear in no confirmed list. Low risk (no
   number attached) but they complete the sweep.

Everything else carries V-VERBATIM or V-CORRECTED status from the two T8 passes of 2026-08-03,
which the ledger records as **T8: CLOSED**.
