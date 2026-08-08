# Source-claim verification — T8 for Chapter 4

**Run 2026-08-08.** The check `brain/skills/autoresearchclaw/SKILL.md` §4 names as **T8**. The
Chapter 5 run (`source_claim_verification.md`, same day) is the template and the precedent;
`BLOCKED_third_party.md` §F recorded T8 for Chapter 4 as *"the largest single open verification"*.

**T8's wording, quoted rather than named**, per `PRJ93_RULES.md` § "Anything a critique log claims
to have applied is quoted, not named": every claim this chapter makes **about a cited source** is
checked against the source, and the sentence relied on is reproduced.

## Instruments, and which claim went to which

| Instrument | Used for |
|---|---|
| `mcp__notebooklm__notebook_query`, `Dissertation` notebook `d565d5f0-9ad6-446f-9573-2316a2f8c0ca` | 11 of 14 propositions, in four independent queries |
| Zotero PDF, read locally with PyMuPDF | `kostenko_note_2006` (`5AU8PSEG`), `angelopoulos_conformal_2023` (`CZL7FJ7V`/`PAKIC3MH`), `kaas_probabilistic_2026` (`Y78VGWPB`/`IUZ5KN65`), `liu_elephant_2024` (`SB2K8NCM`/`VPFXNG5N`), `breiman_classification_1984` (`54Z6YNAL`/`CDBJWY8U`) |

**The citation indices were mis-mapped again, in this run, twice.** The template warned that
*"NotebookLM's citation indices look mis-mapped — they demonstrably were in one Chapter 5 query"*.
Both recurrences were caught by reading `cited_text` against the source the answer named:

- Query 1 tagged citations [1] and [2] to the source it identified as Wickramasuriya, but the
  `cited_text` behind both is the **Syntetos & Boylan reply to Kostenko and Hyndman**.
- Query 2 tagged citation [7] to the source it identified as Liu & Paparrizos, but the `cited_text`
  is the **Kim et al.** benchmark-dataset table and its "Case 1. Random anomaly score" passage.

Neither mis-mapping changed a verdict, because in both cases the quoted sentence was checked
against the paper rather than against the label. **The operational lesson is that the tool's prose
answer and its citation apparatus fail independently**, so the prose can be right while the index is
wrong. Read `cited_text`, not the index.

## Scope, stated with the result

**Covered:** every claim Chapter 4 makes about a cited source — **12 distinct keys across 14
citation commands**, enumerated from `chapters/results.tex` by extracting every `\cite*` argument,
not by reading for citations. **Not covered:** Chapters 1, 2 and 3; and any claim Chapter 4 makes
that is not about a source. One proposition is **UNREACHABLE** and is recorded as unchecked, not as
passed.

---

## The classification table

| # | Key | Line | The chapter's proposition | Verdict |
|---|---|---|---|---|
| 1 | `hansen_model_2011` | 127 | a wide set is "a statement about the data rather than a defect of the procedure" | **SUPPORTED** |
| 2 | `wickramasuriya_optimal_2019` | 193 | require the conditional expectation of the base forecast error to be zero; describe the result as the minimum-variance linear *unbiased* reconciled forecasts | **SUPPORTED** |
| 3 | `hewamalage_forecast_2023` | 208 | absolute-error measures elicit the median | **SUPPORTED** |
| 4 | `kolassa_we_2023` | 209–210 | median-eliciting point forecasts are usually not coherent | **SUPPORTED** |
| 5 | `wickramasuriya_optimal_2019` | 210–211 | the reconciliation's optimality requires unbiased bases | **SUPPORTED** |
| 6 | `kostenko_note_2006` | 224 | the *corrected* Syntetos–Boylan constants; 1.32 against the 4/3 boundary | **SUPPORTED** |
| 7 | `breiman_classification_1984` | 280 | the one-standard-error device: adopt only where the advantage exceeds one standard error of that advantage | **UNREACHABLE** |
| 8 | `angelopoulos_conformal_2023` | 489 | a two-sided expected-coverage bound whose **upper** limb is unavailable when an atom sits in the score distribution | **SUPPORTED** |
| 9 | `kaas_probabilistic_2026` | 734–736 | 200 real LV feeders; Chronos-Bolt, Chronos-2, TabPFN-TS; Chronos-Bolt narrowest interval of any model while covering 0.6211 against nominal 0.90 | **SUPPORTED** |
| 10 | `zaffran_adaptive_2022` | 782–783 | Bernstein online aggregation is what they specify, not an exponentially weighted approximation | **SUPPORTED** |
| 11 | `kim_towards_2022` | 888–889 | random scores reach an adjusted F1 near one | **SUPPORTED** |
| 12 | `liu_elephant_2024` | 890–891 | stable under small detection lags and unbiased against random scores | **SUPPORTED** |
| 13 | `lu_proactive_2024` | 941–942 | "report over-offering as the dominant failure mode they observe, which makes any recall the wrong selection criterion **for this class of system**" | **OVERSTATED** |
| 14 | `lu_proactive_2024` | 990–991 | "find proactive agents failing by over-offering at false-alarm rates above half" | **SUPPORTED** |

**Fourteen propositions: twelve supported, one overstated, one unreachable.**

---

## The sentences relied on

**1 · `hansen_model_2011`** — the chapter reads a wide MCS as informative about the data.

> "The MCS acknowledges the limitations of the data, such that uninformative data yield a MCS with
> many models, whereas informative data yield a MCS with only a few models."

> "An attractive feature of the MCS approach is that it acknowledges the limitations of the data.
> Informative data will result in a MCS that contains only the best model. Less informative data
> make it difficult to distinguish between models and may result in a MCS that contains several (or
> possibly all) models."

**2 and 5 · `wickramasuriya_optimal_2019`** — the strong form at line 193 is exact.

> "Let ê_T(h) = y_{T+h} − ŷ_T(h) (3) be the h-step-ahead conditionally stationary base forecast
> errors with E[ê_T(h)|I_T] = 0 … **This implies that the base forecasts are unbiased**, that is,
> E[ŷ_T(h)|I_T] = E[y_{T+h}|I_T]."

> "This would give the best (minimum variance) linear **unbiased** reconciled forecasts."

Both limbs of the chapter's sentence are the paper's own: the zero-conditional-expectation
requirement, and the "minimum-variance linear unbiased" description.

**3 · `hewamalage_forecast_2023`**

> "measures with squared base errors such as MSE and RMSE optimize for the mean whereas others with
> absolute value base errors such as MAE and Mean Absolute Scaled Error (MASE) **optimize for the
> median**."

**4 · `kolassa_we_2023`**

> "The MAE is minimized in expectation by the median of the given predictive density … and the
> median of the density of a sum is usually not equal to the sum of the medians of the separate
> densities unless the separate densities are symmetric. **Thus, MAE-optimal point forecasts are
> usually not coherent.**"

**6 · `kostenko_note_2006`** — verified at the PDF, because the notebook holds only Syntetos &
Boylan's *reply* and not the note itself.

> "The limiting value of p is obtained when v = 0 and a = 0 giving **p = 4/3 (not 1.32 as given by
> SBC)**. When p = 1 and a = 0, we find the maximum value of **v = 0.5 (not 0.49 as given by SBC)**
> for which CRO can be better than SBA."

The chapter's two boundary values, 1.32 and 4/3, are exactly the pair this sentence contrasts, and
"the corrected constants" is the note's own framing.

**8 · `angelopoulos_conformal_2023`** — verified at the PDF. The notebook's excerpts of this source
carry the abstract, contents and a dynamic-intervals section, and **not** the appendix that holds
the theorem, so NotebookLM correctly returned "no such sentence" and that was a coverage gap rather
than a refutation.

Equation (1), page 4:

> "1 − α ≤ P(Y_test ∈ C(X_test)) ≤ 1 − α + 1/(n + 1)"

And page 51, which is the sentence the caption's decision actually rests on:

> "Now we will discuss the upper bound. **Technically, the upper bound only holds when the
> distribution of the conformal score is continuous, avoiding ties.** … **Theorem D.2** (Conformal
> calibration upper bound). Additionally, **if the scores s_1, ..., s_n have a continuous joint
> distribution**, then P(Y_test ∈ C(X_test, U_test, q̂)) ≤ 1 − α + 1/(n + 1)."

So the upper limb is genuinely Angelopoulos and Bates', it genuinely carries a continuity condition,
and an atom at score zero genuinely violates it. **The attribution is right and the reasoning behind
withholding it is right.**

> **Worth recording, and it strengthens rather than weakens the chapter.** A&B add: *"In practice,
> however, this condition is not important, because the user can always add a vanishing amount of
> random noise to the score."* That dismissal is calibrated to ties as a numerical nuisance. Here
> the atom holds **0.152, 0.556 and 0.173** of the calibration mass, which jitter does not repair,
> so withholding the limb is the stronger choice rather than an over-cautious one. The chapter does
> not currently say this and does not need to.

**9 · `kaas_probabilistic_2026`** — verified at the PDF, because the notebook's passages carry the
setup but not Table 3. Setup, verbatim:

> "In the present study, we provide an extensive evaluation of short-term net load forecasts of
> **200 real-world low-voltage feeders** … Our study compares **Chronos-Bolt, Chronos-2 and
> TabPFN-TS** to six baseline models"

Table 3, page 6, "The considered quantiles are 0.05 and 0.95 (90 % interval)". Median interval width
and median empirical coverage, all twelve rows:

| Model | Width | Coverage |
|---|---|---|
| WeekNaive | 11.58 | 0.581 |
| XGBoost | 17.11 | 0.8265 |
| XGBoost+ | 13.7 | 0.809 |
| TorchMLP | 22.76 | 0.9216 |
| TFT | 18.03 | 0.8 |
| PatchTST | 17.56 | 0.8099 |
| **Chronos-Bolt** | **8.652** | **0.6211** |
| Chronos-Bolt (no covariates) | 10.8 | 0.6388 |
| Chronos-2 | 16.33 | 0.8975 |
| Chronos-2 (no covariates) | 18.28 | 0.8844 |
| TabPFN-TS | 18.86 | 0.9269 |
| TabPFN-TS (no covariates) | 20.36 | 0.9105 |

**8.652 is the smallest of all twelve**, so the superlative "the narrowest interval of any model
there" holds, and 0.6211 against a 0.05/0.95 interval is nominal 0.90. All four limbs check out.
Superlatives are where over-claims usually live, so this one was checked against every row rather
than against the three foundation models it is nominally comparing.

**10 · `zaffran_adaptive_2022`** — the chapter's contrast is the paper's own contrast.

> "The Bernstein Online Aggregation (BOA) procedure (Wintenberger, 2017) is a type of aggregation
> rule Φ. The weights outputted by BOA have an exponential form. In the exponent is plugged the
> difference between the loss suffered by the last aggregated forecast and the current squared loss
> suffered by the expert, **instead of plugging the losses suffered by the experts (this would be
> Exponential Weighted Aggregation, Vovk, 1990)**."

The chapter says it implemented "the Bernstein online aggregation \citet{zaffran_adaptive_2022}
specify rather than an exponentially weighted approximation to it". The paper draws exactly that
distinction, against exactly that alternative.

**11 · `kim_towards_2022`**

> "As shown in the figure, **we can always obtain the F1^PA close to 1 by changing δ′**, except for
> the case when the length of the anomaly segment is short."

with their Case 1 defined as "a randomly generated anomaly score drawn from a uniform distribution
U, i.e., A(w_t) ∼ U(0, 1)". The chapter's "random scores reach an adjusted F1 near one" is this.

**12 · `liu_elephant_2024`** — verified at the PDF for the second limb, since the notebook's answer
reached "unbiased" only through figure values.

> "Based on the criteria outlined above, **VUS-PR emerges as the most robust (less sensitive to
> lags), accurate (unbiased and effective across different scenarios), and fair (consistent under
> similar cases) evaluation measure.**"

Both limbs of the chapter's sentence are in that one sentence of the paper's.

**13 and 14 · `lu_proactive_2024`** — the finding. The paper's evaluation table:

| Model | Recall | Precision | False-Alarm |
|---|---|---|---|
| Claude-3-Sonnet | 27.47 % | 37.31 % | 62.69 % |
| Claude-3.5-Sonnet | 97.89 % | 45.37 % | 54.63 % |
| GPT-4o-mini | 100.00 % | 35.28 % | 64.73 % |
| GPT-4o | 98.11 % | 48.15 % | 51.85 % |
| LLaMA-3.1-8B | 98.86 % | 38.16 % | 61.84 % |
| LLaMA-3.1-8B-Proactive | 99.06 % | 49.76 % | 50.24 % |
| Qwen2-7B | 98.02 % | 44.00 % | 56.00 % |
| Qwen2-7B-Proactive | 100.00 % | 49.78 % | 50.22 % |

**Line 990 is SUPPORTED.** Every one of the eight agents has a false-alarm rate above one half, so
"find proactive agents failing by over-offering at false-alarm rates above half" is their table.

**Line 941 is OVERSTATED, and NotebookLM's null is the substantive part of the finding:** asked
directly whether over-offering is described as the dominant observed failure mode, it returned *"No
such sentence exists"*. The paper reports a table; it does not characterise a failure mode in prose.
Two defects follow:

1. **"report over-offering as the dominant failure mode they observe"** attributes a
   characterisation to the authors that they do not write. It is a fair *reading* of their table for
   seven of the eight models, and Claude-3-Sonnet is a counter-example within their own results
   (recall 27.47 %, so that agent under-offers and false-alarms at once).
2. **"the wrong selection criterion for this class of system"** promotes eight evaluated LLM agents
   into a class. This is the residue of role-audit finding **V4**, which
   `role_audit_ch4_ch5.md`:155 states as:

   > "\citet{lu_proactive_2024} **establish that the characteristic failure** of a proactive agent
   > is over-offering" — the same source is reported correctly 46 lines later as "**find** … at
   > false-alarm rates above half". Promotes a measured rate in one study into a class property, and
   > it is the sole warrant for rejecting recall as a selection criterion. **This is the
   > "concede"-calibre case.**

   V4's repair softened `establish` to `report`. **It did not remove the class generalisation**,
   which moved from "characteristic failure of a proactive agent" into "for this class of system"
   and survived. This is the pattern `PRJ93_RULES.md` records under *compression widens claims*, in
   its other direction: a repair that fixes the verb and leaves the scope.

**Repair applied**, replacing an unquotable characterisation with the number their table carries:

> where \citet{lu_proactive_2024} record a false-alarm rate above half for every proactive agent
> they evaluate, which makes recall alone the wrong selection criterion for this system.

## 7 · `breiman_classification_1984` — UNREACHABLE, recorded as unchecked

**The claim of absence names what was searched.** The one-standard-error rule was **not found in**
(a) the `Dissertation` notebook, whose only passage for this source is a fragment of the book's
table of contents, or (b) the Zotero attachment `CDBJWY8U`, which is a **31-page partial** of the
book holding front matter, a Chapter 1 excerpt and the bibliography, and in which the string
"standard error" occurs **zero** times across all 31 pages. The full text of *Classification and
Regression Trees* is not in the library.

**This is a coverage gap in the instruments, not a verdict on the chapter.** The 1-SE rule is what
CART is canonically cited for and it lives in the book's §3.4.3 and §11.5, neither of which is in
the 31 pages held. Two further points bound what is and is not at risk:

- The chapter attributes the device to **"the classification-and-regression-tree literature"** and
  cites the book, rather than quoting a sentence from it. That is a weaker and more defensible form
  of attribution than the ones this sweep found defects in.
- The chapter's formulation ("adopt only where the challenger's mean advantage exceeds one standard
  error of that advantage") is the **transposition** of CART's rule, which selects the smallest tree
  within one standard error of the minimum cross-validated error. Same device, stated from the
  challenger's side. Whether the book's own wording licenses the transposition **was not verified**.

**To close it** needs the full CART text, which is a bibliography-adjacent acquisition and therefore
a human gate. It is **not** presented as one here, because nothing in the chapter is currently known
to be wrong; it is carried forward as the single unchecked proposition.

---

## What this run establishes, and what it does not

**Establishes.** Twelve of Chapter 4's fourteen source propositions hold against the sources with a
verbatim sentence behind each, including the three that carry the most weight: Angelopoulos's
continuity condition (which is the entire justification for withholding a bound in `tab:coverage` at
all three venues), Kaas's superlative (checked against all twelve rows of their table, not the three
it compares), and Wickramasuriya's unbiasedness requirement (which is the premise of §4.2's whole
conditional-claim argument, and whose strong form at line 193 is the paper's own two sentences).

**Does not establish.** Nothing about Chapters 1, 2 or 3. Nothing about Chapter 4's claims that are
not about a source. And nothing about the CART attribution, which is unchecked rather than passed.

**The precedent held, and weakly.** The Chapter 5 run found a construction credited to a paper that
disclaims it. Chapter 4's equivalent is milder: one over-attribution, already flagged by the role
audit, already partly repaired, whose *unrepaired half* is what this run actually contributes.
Against that, this run is the first to verify the Angelopoulos and Kaas claims at the artefact, and
both were load-bearing and both were right.
