# Citation fixes — proposed replacement text

Corrections for the WRONG-SOURCE and OVERSTATED findings in
`brain/ledger/citation_audit.md`. Drafted 2026-07-30.

> **STATUS: ALL TEN APPLIED — 2026-07-30.** Gate 5 approved by Phuong; gate 2
> approved for fix 8. Pushed as six targeted `write_section` calls (no
> whole-file overwrite), each its own commit:
> `literature_review.tex` §rw-rhythm (fixes 1, 2, 3, 4, 10), §rw-surfacing
> (5), §rw-evaluation (6a, 9), §rw-synthesis (7); `methodology.tex` §sec:agent
> (6b), §sec:ruler (8).
> `ref.bib` now holds `hyndman_forecasting_2021`, added by Phuong via Zotero
> sync and verified clean afterwards — 111→112 entries, no drift, no repoint.
> **One open item:** the FPP3 entry catalogues Athanasopoulos as
> `editora`/`collaborator` rather than a second author, so the citation renders
> as "Hyndman (2021)". See the note under fix 8.

The text below is kept as the record of what changed and why.

`literature_review.tex` and `methodology.tex` exist only on Overleaf, and every
Overleaf push is `PRJ93_RULES.md` gate 5 / spec G9 — unconditional.

**No paper is added or dropped.** Every citation used below is already in
`ref.bib` and already cited elsewhere in the chapter, so gate 2 is not engaged.
The one new `\citep` (fix 2) points at `das_decoder-only_2024`, cited two
sentences earlier.

Each fix gives the current sentence verbatim, the replacement, and the evidence
that forces the change.

---

## Fix 1 — `schmidt_machine_2022` (OVERSTATED)

**Location.** §rw-rhythm ¶2.

**Current.**
> \citet{schmidt_machine_2022} sharpen the same point on a single
> restaurant's sales: across more than twenty models, the best one-day-ahead
> result is a linear kernel-ridge model at 19.6\% sMAPE, with recurrent and
> ensemble models only narrowly behind, and the gap widens against the simple
> models only at the one-week horizon.

**Replacement.**
> \citet{schmidt_machine_2022} sharpen the same point on a single
> restaurant's sales: across twenty-three models and two baselines, the best
> one-day-ahead result is a kernel-ridge model at 19.6\% sMAPE. At the one-week
> horizon the ordering reverses — every non-recurrent model degrades past 20\%
> error while the best recurrent model holds 19.5\% — so the competitiveness of
> simple models is horizon-dependent rather than general.

**Why.** The paper says "kernel ridge algorithm", never *linear* kernel ridge.
And the current sentence understates its own evidence: at one week the simple
models do not merely lose ground, they are beaten outright by the RNNs
("non-RNN models performed poorly, giving results worse than 20% error. RNN
models extended better… giving 19.5% in the best result"). The corrected version
is both more accurate and more useful — it establishes that horizon length
governs whether a simple baseline is competitive, which is the argument the
serving-horizon results need later.

---

## Fix 2 — `tan_are_2024` (WRONG-SOURCE)

**Location.** §rw-rhythm ¶3, final sentence.

**Current.**
> …they find that removing the language model or replacing it with a single
> attention layer leaves accuracy unchanged or better, at a fraction of the
> compute, and that the language model helps neither sequence modelling nor the
> few-shot regime. This does not contradict TimesFM and Chronos so much as
> locate the value precisely: gains come from time-series pretraining and
> patching, not from language-model machinery, and indeed TimesFM itself beats
> language-model prompting by a wide margin.

**Replacement.**
> …they find that removing the language model or replacing it with a basic
> attention layer leaves accuracy unchanged or better while cutting training and
> inference time by up to three orders of magnitude, and that the language model
> helps neither sequence modelling nor the few-shot regime. This does not
> contradict TimesFM and Chronos so much as locate the value precisely: gains
> come from time-series pretraining and patching, not from language-model
> machinery. TimesFM reaches the same conclusion from the other direction,
> improving on language-model prompting by more than 25\%
> \citep{das_decoder-only_2024}.

**Why.** This is the only WRONG-SOURCE finding in the audit. Tan et al. ablate
OneFitsAll, Time-LLM and CALF — **they do not evaluate TimesFM at all.** The
comparative claim belongs to Das et al. 2024 ("improves on llmtime's performance
by more than 25%"), and as written it carried no citation of its own inside a
Tan-attributed passage. An unsourced comparative number in prose is the T1
failure mode.

Two smaller corrections ride along: the paper says "basic attention layer", and
"a fraction of the compute" is vaguer than the paper's own "three orders of
magnitude".

---

## Fix 3 — `kolassa_we_2023` (OVERSTATED — highest consequence)

**Location.** §rw-rhythm ¶5.

**Current.**
> Reconciliation is not free of tension, and \citet{kolassa_we_2023} states the
> cost in his title: coherence and minimal error cannot both be optimised, so
> the choice between them is a decision the analyst makes rather than a property
> the method supplies.

**Replacement.**
> Reconciliation is not free of tension, and \citet{kolassa_we_2023} states the
> cost in his title — though the incompatibility is narrower, and more useful,
> than the title suggests. Because the median of a sum is not generally the sum
> of the medians, point forecasts minimising MAE, or MASE, which is a scaled
> MAE, are usually not coherent. The exception is the instructive part: the only
> error measures whose minimising point forecasts are coherent are the squared
> error and monotonic functions of weighted sums of squared errors, because the
> expectation is additive. The conflict is a property of absolute-error
> measures, not of error minimisation as such, and a squared-error measure
> dissolves it rather than trading against it.

**Why.** The paper explicitly does *not* claim a general incompatibility.
NotebookLM, strictly: "it does not claim that coherence and minimal error *in
general* are incompatible… only applies to specific error metrics like MAPE and
MAE." The paper's own sentence is the opposite of the generalisation: "The
**only** error measures whose minimizing point forecasts are coherent are the
squared error and monotonic functions of weighted sums of squared errors… the
expectation is additive." It also names MASE as "just scaled MAEs".

**This is the fix that matters most.** As written, the chapter argues away its
own strongest case for RMSSE. Corrected, the same citation becomes an argument
*for* the G1 remedy: a squared scaled error is simultaneously the fix for the
median-optimisation problem at Ellel and the only family compatible with the
MinT reconciliation the estate already uses. Two open problems, one decision.

---

## Fix 4 — `makridakis_m5_2022` (OVERSTATED)

**Location.** §rw-rhythm ¶7.

**Current.**
> The M5 competition \citep{makridakis_m5_2022} answered this by scoring on
> squared scaled errors, which optimise for the mean, across a retail corpus in
> which most series were intermittent, and \citet{koutsandreas_selection_2022}
> and \citet{kolassa_why_2020} argue more generally that…

**Replacement.**
> The M5 competition \citep{makridakis_m5_2022} answered this by scoring on the
> root mean squared scaled error across a retail corpus in which 77.3\% of
> series had an average inter-demand interval above $4/3$; squared base errors
> optimise for the mean rather than the median
> \citep{hewamalage_forecast_2023}. \citet{koutsandreas_selection_2022} and
> \citet{kolassa_why_2020} argue more generally that…

**Why.** Two of the sentence's three limbs belong to a different paper. The M5
text establishes the intermittency of the corpus but, per NotebookLM, "does
*not* establish the exact metric name (RMSSE) or that it optimizes for the
mean" — both come from Hewamalage et al., which is already cited in the
preceding sentence.

The replacement also puts M5's own 77.3% figure to work in place of the vague
"most series were intermittent". **Note what that figure is measured against:**
M5 categorises using the thresholds "0.5 and 4/3" — the Kostenko-corrected
constants, not SBC's 0.49 and 1.32. That is independent, competition-scale
support for the W23 correction, and it is currently uncited in that argument.

---

## Fix 5 — `yao_-bench_2024` (OVERSTATED)

**Location.** §rw-surfacing ¶1.

**Current.**
> $\tau$-bench \cite{yao_-bench_2024} places agents in multi-turn
> tool-and-user interactions and finds frontier models succeed on under half of
> tasks, with eight-trial consistency falling below 25\%, so reliability rather
> than capability is the binding constraint even before proactivity enters.

**Replacement.**
> $\tau$-bench \cite{yao_-bench_2024} places agents in multi-turn
> tool-and-user interactions and finds frontier models far from solving them:
> on the airline domain even GPT-4o completes only 35.2\% of tasks. Reliability
> rather than capability is the binding constraint even before proactivity
> enters.

**Why.** Neither number in the current sentence is traceable. NotebookLM: the
text "does **not** explicitly state that models succeed on 'under half of tasks'
overall, nor does it explicitly report the 'eight-trial consistency (pass^8)
below 25%' figure." What it does state is "even gpt-4o solves only **35.2%** of
the tasks" on τ-airline — a sharper number than the one it replaces.

**Open choice for Phuong.** The pass^8 claim is not necessarily false; a pass^k
chart exists (Figure 4) but carries no quoted threshold. Either read the value
off that figure and cite it as `Figure 4`, or leave it out. The replacement
above leaves it out, because a number read off someone else's chart is weak
evidence to put in a dissertation. Say if you want it restored.

---

## Fix 6 — `bavaresco_llms_2025` (OVERSTATED — appears twice)

### 6a — literature review, §rw-evaluation ¶1

**Current.**
> JUDGE-BENCH \cite{bavaresco_llms_2025} finds agreement with humans varying
> widely across tasks and a standing bias toward machine-generated text,
> concluding that judges must be validated against task-specific human
> annotation before deployment.

**Replacement.**
> JUDGE-BENCH \cite{bavaresco_llms_2025} finds substantial variance in
> agreement across models and datasets, with agreement depending on the property
> being evaluated, the expertise of the human judges, and whether the text being
> judged is human- or model-generated, concluding that judges must be carefully
> validated against human judgments before they are used as evaluators.

### 6b — methodology, §sec:agent

**Current.**
> \citet{bavaresco_llms_2025} find that agreement between language-model judges
> and human annotators varies widely by task and that such judges carry a
> systematic preference for machine-generated text, concluding that a judge must
> be validated against task-specific human annotation before it is relied upon.

**Replacement.**
> \citet{bavaresco_llms_2025} find that agreement between language-model judges
> and human annotators varies substantially across models and datasets, and that
> it depends on whether the text being judged is human- or model-generated,
> concluding that a judge must be validated against human judgments before it is
> relied upon.

**Why.** The paper reports that agreement *varies depending on* text provenance.
The chapters assert a *directional preference for* machine-generated text. Those
are different claims and only the weaker one is supported. "Task-specific" is
also an addition — the paper's conclusion is "LLMs should be carefully validated
against human judgments before being used as evaluators", without that
qualifier.

The correction costs nothing argumentatively: provenance-dependent agreement is
just as strong a reason to treat the judge as an instrumented proxy rather than
a ground truth, which is the position both chapters take.

---

## Fix 7 — `fu_prism_2026` (OVERSTATED — synthesis paragraph)

**Location.** §rw-synthesis ¶2.

**Current.**
> PRISM \cite{fu_prism_2026} sets its intervention threshold from an asymmetric
> miss-to-false-alarm cost ratio, and among the proactive systems surveyed here
> it is the one that reports the calibration of its own acceptance probabilities
> rather than accuracy alone.

**Replacement.**
> PRISM \cite{fu_prism_2026} sets its intervention threshold from an asymmetric
> miss-to-false-alarm cost ratio, and among the proactive systems surveyed here
> it is the one that gates on a calibrated acceptance probability rather than on
> accuracy alone. It reports the gate's effect — a 22.78\% reduction in false
> alarms and a 20.14\% gain in F1 — but not the calibration of the probability
> the gate depends on.

**Why.** PRISM *calibrates* an acceptance probability; it does not *report the
calibration of* that probability. NotebookLM is explicit: the text "does **not**
report the actual calibration metrics of its own probabilities (such as
Expected Calibration Error/ECE or Brier score)", only that $p_{accept}$ is
"estimated… via a small calibrator trained on held-out judgments".

**This correction helps the contribution claim rather than hurting it.** W21
holds that PRISM already occupies the intersection the synthesis paragraph
claims is unoccupied. It does — but it leaves the calibration of its own gate
unmeasured. An unreported calibration on the decisive quantity is a real gap,
and it is one this project is positioned to fill, since ECE on the acceptance
probability is exactly what G3 would build. The corrected sentence names that
gap without overclaiming.

**Consequence worth noting.** This makes the G3 decision larger than it looked.
Running ECE would no longer only close W10 and W26 (the unkept Guo promise) — it
would supply the one measurement the nearest competing system does not report.

---

## Fix 8 — `hyndman_another_2006` (OVERSTATED on re-verification — highest consequence in the audit)

**Location.** methodology §sec:ruler, opening sentence.

**Current.**
> The mean absolute scaled error of \citet{hyndman_another_2006} divides the
> forecast's mean absolute error by the in-sample mean absolute error of a
> seasonal-naive benchmark,

**Replacement (option A — no new citation, no gate).**
> The mean absolute scaled error of \citet{hyndman_another_2006} divides the
> forecast's mean absolute error by the in-sample mean absolute error of a naive
> benchmark. The original definition scales by the one-step random-walk error,
> $q_t = e_t / \left[\frac{1}{n-1}\sum_{i=2}^{n}|Y_i - Y_{i-1}|\right]$; the
> seasonal form used throughout this work replaces that denominator with the
> in-sample mean absolute error of the seasonal-naive method at lag $m$, a
> standard extension the 2006 paper does not itself define.

**Why this is the most consequential finding in the audit.** The 2006 paper
defines MASE against the **plain naive (random-walk, lag-1)** benchmark. It
contains **no seasonal-naive denominator and no seasonal MASE variant
anywhere.** The only generalisation it offers is to multi-step naive forecasts,
not seasonal ones. The seasonal lag-$m$ denominator comes from the later
Hyndman & Athanasopoulos formulation, not from the cited source.

The chapter has therefore been citing Hyndman & Koehler (2006) for a definition
that paper does not give — **on the single topic where this project is most
exposed.** Fatal 1 and Fatal 2 in the examiner record are both about which
seasonal-naive denominator is legitimate; S1 collapsed four rulers into one and
made `basis` a required argument. That remediation is sound, but its governing
citation does not support the seasonal construction it governs. An examiner
checking the metric definition against its source finds a mismatch in the one
place the project has already been marked Fatal twice.

**Gate 2 — RESOLVED 2026-07-30. Phuong approved option B: cite Hyndman &
Athanasopoulos.** Option A above is retained only as the record of what was
rejected. **Use option B below.**

**Replacement (option B — APPROVED).**
> The mean absolute scaled error of \citet{hyndman_another_2006} divides the
> forecast's mean absolute error by the in-sample mean absolute error of a naive
> benchmark. The original definition scales by the one-step random-walk error,
> $q_t = e_t / \left[\frac{1}{n-1}\sum_{i=2}^{n}|Y_i - Y_{i-1}|\right]$; the
> seasonal form used throughout this work replaces that denominator with the
> in-sample mean absolute error of the seasonal-naive method at lag $m$
> \citep{hyndman_forecasting_2021}.

### Blocked: the Zotero write could not be made

`PRJ93_RULES.md` requires new papers to be pushed to Zotero by the agent, never
handed to the user. **That could not be done.** The Zotero MCP connector is in
local-only mode and refused the write:

> `Cannot perform write operations in local-only mode. Add ZOTERO_API_KEY and
> ZOTERO_LIBRARY_ID to enable hybrid mode.`

This is new information about the tooling. `brain/ledger/tooling_verdict.md`
records Zotero as PASS, but that verdict was established on **reads only** —
`list_libraries`, `search_items`, `get_item_metadata`. Writes are unavailable
until those two environment variables are set. Every "agent pushes to Zotero"
step in the pipeline spec is blocked the same way, not just this one.

So the entry is handed over below, against the rule, because the rule's
mechanism does not currently exist. The alternative — silently skipping the
Zotero step and adding only the `ref.bib` entry — would leave the library and
the bibliography out of sync, which is the condition that produced the W48
repoint hazard in the first place.

**Item to add:** Hyndman, R.J. & Athanasopoulos, G. (2021). *Forecasting:
Principles and Practice*, 3rd edition. OTexts, Melbourne. `https://otexts.com/fpp3/`
ISBN 978-0-9875071-3-6. The seasonal MASE denominator is defined in **§5.8,
"Evaluating point forecast accuracy"**.

**`ref.bib` entry**, written in the style of the existing 111 entries (biblatex
fields — `date`, `location`, `urldate` — matching e.g. `angelopoulos_conformal_2023`):

```bibtex
@book{hyndman_forecasting_2021,
	title = {Forecasting: principles and practice},
	edition = {3rd},
	url = {https://otexts.com/fpp3/},
	isbn = {978-0-9875071-3-6},
	shorttitle = {Forecasting},
	publisher = {OTexts},
	location = {Melbourne, Australia},
	author = {Hyndman, Rob J. and Athanasopoulos, George},
	urldate = {2026-07-30},
	date = {2021},
}
```

**Add this by hand to the Overleaf `ref.bib`. Do not regenerate the file.** The
standing hazard applies: re-exporting `ref.bib` via Better BibTeX produces a
different key format and breaks roughly sixty existing citations. The key
`hyndman_forecasting_2021` above already follows the file's own
`author_firstword_year` convention, so a hand-inserted entry stays consistent
with the other 111 without touching them.

**Bonus, and it is directly useful.** The paper says of intermittent series:
"Of the measures in Table 1, Table 2, Table 3, only the MASE can be used for
these series due to the occurrence of infinite and undefined values. These three
series are not degenerate or unusual—intermittent demand data often contain
zeros." It also states the failure condition precisely: the measure is undefined
"when all historical observations are equal." That is Hyndman & Koehler's own
statement of the boundary at which the Ellel scale basis breaks — relevant to G2,
and currently unused.

---

## Fix 9 — `meyer_conceptual_2004` (OVERSTATED on re-verification)

**Location.** §rw-evaluation ¶2.

**Current.**
> \cite{meyer_conceptual_2004} draws the distinction that sets the loss
> function: \emph{compliance} is the operator's response to a warning,
> \emph{reliance} the response to its absence, and crucially these decay
> differently, with frequent false alarms eroding compliance, the cry-wolf
> effect, so operators stop acting on alerts, while misses erode reliance.

**Replacement.**
> \cite{meyer_conceptual_2004} draws the distinction that sets the loss
> function: \emph{compliance} is the operator's response to a warning,
> \emph{reliance} the response to its absence, and crucially the two are
> governed by different properties of the detector. Compliance depends on the
> response criterion — responses to warnings become "less likely when the
> probability for an unjustified warning was high", the cry-wolf syndrome in
> which operators cease or slow their response. Reliance depends instead on the
> system's sensitivity, and therefore on what it fails to catch.

**Why.** Two errors. First, **Meyer never states that misses erode reliance.**
He ties reliance to sensitivity ($d'$) and to operator experience. The
misses-erode-reliance claim is a reasonable inference from his framework but is
not his assertion, and the chapter presents it as his. Second, his term is
"cry-wolf **syndrome**" (citing Breznitz 1983), not "cry-wolf effect".

The replacement keeps the asymmetry the argument needs — the two responses are
driven by different detector properties — while attributing to Meyer only what
he says. The final clause now signals the inference as the chapter's own.

**This matters because of where it sits.** Meyer is the anchor of §rw-evaluation
and of the project's entire cost-asymmetry framing. It is the citation that
licenses the asymmetric loss function, which is in turn the basis of the
contribution claim.

---

## Fix 10 — `wickramasuriya_optimal_2019` (OVERSTATED on re-verification)

**Location.** §rw-rhythm ¶5.

**Current.**
> MinT \citep{wickramasuriya_optimal_2019} adjusts independent forecasts so that
> venue-level predictions sum coherently to the estate total with guaranteed
> minimum error variance

**Replacement.**
> MinT \citep{wickramasuriya_optimal_2019} adjusts independent forecasts so that
> venue-level predictions sum coherently to the estate total, minimising the
> trace of the reconciled error covariance among all linear reconciliations that
> preserve unbiasedness — an optimality that holds only if the base forecasts
> are themselves unbiased

**Why.** MinT's guarantee is BLUE-type and explicitly conditional. The paper:
"Our approach minimizes the mean squared error of the coherent forecasts across
the entire collection of time series **under the assumption of unbiasedness**";
"This would give the best (minimum variance) linear unbiased reconciled
forecasts." The unbiasedness-preservation constraint $SPS = S$ is what the
minimisation is subject to. "Guaranteed minimum error variance", unqualified, is
a stronger claim than the paper makes.

**Worth carrying into the Discussion.** The condition is not academic here. On
an 82%-zero series with a median-optimising metric, the base forecasts have every
reason to be biased — and if they are, MinT's optimality does not hold for this
estate. That is a real limitation of the reconciliation result (MinT 0.662 vs
disaggregation 0.734) and it is currently unstated. It is also a second,
independent reason the G1 metric decision propagates further than it looks.

---

## Not a fix — `hancock_meta-analysis_2011` is SUPPORTED after all

The audit marked this OVERSTATED on the strength of what NotebookLM could
retrieve. **The full text supports the sentence as written**, and the earlier
verdict was wrong.

The paper does parse robot-related factors into performance-based and
attribute-based subcategories, and reports them separately: "it was determined
that performance factors were more strongly associated ($\bar r = +0.34$) with
trust development and maintenance. However, in contrast, robot attributes had
only a relatively small associated role ($\bar r = +0.03$)."

**No change needed.** One optional tightening: in the *experimental* analysis
attributes are not negligible ($\bar d = +0.47$ against performance's $+0.71$),
and the performance estimate there rests on only two studies. If you want the
sentence bulletproof, "with robot performance ($\bar r = +0.34$) far exceeding
robot attributes ($\bar r = +0.03$)" pins it to the correlational analysis where
the contrast is unambiguous.

---

## Not a citation fix — a code check for `code_vs_paper.md`

Re-verification of `syntetos_categorization_2005` confirms the chapter's use,
with two precision notes, one of which is a potential implementation bug rather
than a writing issue:

1. The paper's cutoffs are **strict** inequalities — $p > 1.32$, $v > 0.49$ —
   and the region $p \le 1.32$ **and** $v \le 0.49$ is explicitly assigned to
   Croston as "the area of indecision". The chapters write $\ge$.
2. **$v$ is the squared coefficient of variation of demand sizes *conditional on
   demand occurring*** — "the mean and variance, respectively, of the demand
   sizes, when demand occurs" — not of the raw zero-inclusive series. The
   subagent flags computing it on the raw series as "a very common
   misimplementation."

Point 2 needs checking against the code that produced the reported ADI/CV²
figures (BH 1.35/0.57, Ellel 5.63/0.98, TRT 1.18/0.61). If $v$ was computed
zero-inclusive, every intermittency classification in the project moves — and
W23 already turns on BH's ADI of 1.3256 sitting *between* the SBC and
Kostenko constants. Per `PRJ93_RULES.md`, any discrepancy found goes to
`brain/ledger/code_vs_paper.md`. **I have not run this check** — it is a code
question, not a citation one, and was outside this task.

---

## Optional tightenings — three claims that re-verified as SUPPORTED

None of these needs changing. Each is a place where the source is slightly more
specific than the chapter, and the specificity is free.

**`park_generative_2023`** — confirmed in full: memory stream, retrieval scored
as a weighted combination of exactly recency, relevance and importance
(min-max normalised, all three weights set to 1; recency decay 0.995;
importance an LLM-rated 1–10 poignancy), and recursive reflection. One nuance:
reflection is **importance-triggered, not periodic** — fired when summed
importance of recent events exceeds 150, "roughly two or three times a day".
The chapter says "periodic reflection". If W28 is going to be argued over — and
it is, since this is the anchor of the self-declared central conceptual move —
"importance-triggered reflection" is the accurate phrase and the more useful
one, because a threshold-triggered mechanism is a closer analogue to a
band-breach trigger than a clock is.

**`zheng_judging_2023`** — the 85% and 81% figures are exact and verbatim: "The
agreement under setup S2 (w/o tie) between GPT-4 and humans reaches 85%, which
is even higher than the agreement among humans (81%)." Optional: those two
numbers are MT-bench, GPT-4 pairwise, ties excluded, first turn. The "over 80%"
headline covers both MT-bench and Chatbot Arena. Naming the condition costs
five words.

**`gulati_ask_2026`** — confirmed with figures the chapter does not use: goal
clarification injected at 10% recovers near-oracle performance (pass@3 0.78 vs
oracle 0.80, no-clarification 0.40) and is at baseline by 70%; input is
recoverable through roughly 50%. One wording note: "a blanket ask-early rule is
wrong" is the paper's rhetorical framing, not its measurement — asking early is
never shown to be *harmful*, and Inj-10 is in fact the maximum for both
dimensions. What differs is the decay rate. "So a uniform urgency for every kind
of missing information is wrong" is what the data support.

---

## Summary of this pass

| | Before re-verification | After |
|---|---|---|
| SUPPORTED | 65 | **74** |
| OVERSTATED | 7 | **9** |
| UNSUPPORTED | 0 | 0 |
| WRONG-SOURCE | 1 | 1 |
| MISSING-KEY | 0 | 0 |
| UNVERIFIED | 11 | **0** |

All eleven UNVERIFIED keys were resolved against full text in Zotero rather than
re-queried in NotebookLM. Eight became SUPPORTED; three became OVERSTATED
(`hyndman_another_2006`, `meyer_conceptual_2004`,
`wickramasuriya_optimal_2019`). One prior OVERSTATED
(`hancock_meta-analysis_2011`) was wrong and is now SUPPORTED.

Ten fixes are drafted above and cover every OVERSTATED and the one
WRONG-SOURCE. **None has been applied.**

**One item needs your decision before its fix can be finished:** fix 8 option B
would cite Hyndman & Athanasopoulos for the seasonal MASE denominator. That is a
new cited paper and therefore gate 2.
