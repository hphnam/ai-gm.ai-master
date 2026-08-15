# Report 84 — Method-source verification audit (v2)

**Supersedes nothing; extends `brain/log/83_novelty_feasibility_audit.md`.** Report 83 decided
what exists on disk. This report decides whether the literature supports the six candidates that
survived it.

**Mode: read-only on the dissertation and on `ref.bib`.** This session wrote two files:
this report and `brain/ledger/staged_references.bib`. It edited no `.tex` file, added no citation,
touched `ref.bib` not at all, ran no third-party code, and pushed nothing.

---

## Section 0 — Session frame, and two live document defects

| | |
|---|---|
| HEAD SHA at start (`ai-gm.ai-master`) | `e7fae52efe9d0aff8d4e27ad72839dbed4e02e5d` |
| HEAD SHA at end (`ai-gm.ai-master`) | `e7fae52efe9d0aff8d4e27ad72839dbed4e02e5d` |
| Match | **Yes** |
| Overleaf clone HEAD, read only | `99ee32b` — *"Clear the AI-writing pre-flight on this session's prose"* |

### 0.1 — LIVE CITATION DEFECT (item 8.3). The rung-4 citation names the wrong paper, and the arm it names cannot do what the sentence says.

**`chapters/methodology.tex`:357, quoted whole:**

> Rung 4 is a pretrained time-series
> foundation model \citep{ansari_chronos_2024}, zero-shot and without per-venue training, in a
> univariate arm and in an arm conditioned on the exogenous set of Section~\ref{sec:exo}; its
> served point forecast is the median quantile clipped at zero.

**What `ansari_chronos_2024` resolves to**, read from `ref.bib`:844–855 — *"Chronos: Learning the
Language of Time Series"*, Ansari et al., **Transactions on Machine Learning Research**, 2024-05-09,
`openreview.net/forum?id=gerNCVqqtR`. Its own abstract, quoted from the entry, describes a model
that *"tokenizes time series values using scaling and quantization into a fixed vocabulary"* — a
**univariate** T5-family model.

**What rung 4 actually loads**, quoted from source. `models/ladder.py`:327–329 registers three
entrants:

```python
    PREDICTORS.append(("rung4_chronos_bolt", 4, chronos_bolt_predict, True))
    PREDICTORS.append(("rung4_chronos2",     4, chronos2_predict,     True))
    PREDICTORS.append(("rung4_chronos2_exo", 4, chronos2_exo_predict, True))
```

`models/ladder.py`:596–598 maps them to model ids:

```python
_RUNG4_MODEL_IDS = {"rung4_chronos2": CHRONOS2_MODEL_ID,
                    "rung4_chronos_bolt": CHRONOS_MODEL_ID,
                    "rung4_chronos2_exo": CHRONOS2_MODEL_ID}
```

`models/foundation.py`:49–50 — `CHRONOS_MODEL_ID = "amazon/chronos-bolt-small"`,
`CHRONOS2_MODEL_ID = "amazon/chronos-2"`.

**Do the two agree? No, and the disagreement is load-bearing rather than cosmetic.**

| Sentence's claim | What is true |
|---|---|
| "in a univariate arm and in an arm conditioned on the exogenous set" | Those two arms are `rung4_chronos2` and `rung4_chronos2_exo`. **Both are `amazon/chronos-2`.** |
| cited to `ansari_chronos_2024` (Chronos, TMLR 2024) | Chronos is univariate and **has no covariate-conditioning mechanism at all**. The covariate arm cannot be the cited model. |
| — | Chronos-2 is a different paper with a different architecture: `ansari_chronos-2_2025` in `ref.bib`:1841–1855, arXiv 2510.15821, whose abstract in that entry says it *"employs a group attention mechanism"* and handles *"covariate-informed forecasting tasks"*. |

**The correct entry is already in `ref.bib` and is already cited elsewhere.**
`ansari_chronos-2_2025` is cited once, at `chapters/literature_review.tex`:50, as *"a 2025
preprint"*. So the bibliography is complete and the Methods sentence simply points at the wrong one
of two adjacent entries.

**Severity.** The served Beer Hall model is `rung4_chronos2_exo`. So the paper's Methods chapter
attributes the **served** model to a paper that describes a different architecture and could not
produce the covariate arm the same sentence describes. This is the attribution-drift failure mode
section 0 of the prompt names, in the document, today.

**Not repaired here** — this session is read-only on `.tex`. The repair is a citation change at
`methodology.tex`:357 and is a human gate.

**One nuance to carry into the repair, not to smooth over.** `rung4_chronos_bolt` loads
`amazon/chronos-bolt-small`, which is a later Amazon release in the Chronos line and is *not*
described by either paper's architecture section. If Methods is to name all three arms accurately,
`ansari_chronos_2024` remains the right citation for the Bolt arm and `ansari_chronos-2_2025` is
right for the other two. A single-citation sentence cannot be made correct.

### 0.2 — Version-1-versus-version-2 sweep (item 8.3.4). One further pair, and it is clean.

`ref.bib` carries three other model-version pairs: TabPFN-3 / TabPFN-v2 (:19, :35, :496),
Moirai 2.0 (:1826), and Chronos / Chronos-2 (above). Of these only `liu_moirai_2026` is cited in
the chapters, at `literature_review.tex`:41, inside a survey list of foundation models supporting
the sentence *"Time-series foundation models pretrain on large heterogeneous corpora and forecast
unseen series zero-shot"*. That claim holds for Moirai 2.0, no Moirai model is loaded anywhere in
the ladder, and there is no version mismatch to report. **Scope: the sweep covered every `@`-entry
in `ref.bib` whose title matched `chronos|moirai|timesfm|lag-llama|timegpt|moment|tabpfn|-2|v2|2.0`,
cross-checked against every `\cite*` key appearing in `chapters/*.tex`.**

### 0.3 — Realism-check coverage (item 8.4.5). Qualified in two places, unqualified in one.

`injection_realism.json` holds 0 of 120 records for Ellel (report 83, §10.4).

**Qualified — Methods.** `chapters/methodology.tex`:622–624:

> The paired comparison runs on a stratified subsample of $n_{\mathrm{sub}} = 120$ under a recorded
> seed, because the realistic arm re-runs the forecaster for every event; Ellel is excluded, its
> occurrence label being inert without the booking diary.

**Qualified — Appendix.** `appendix/robustness.tex`:39–40:

> Ellel is excluded for the reason
> Section~\ref{sec:res-injection} gives, that without the booking diary its occurrence label is

**Unqualified — Results.** `chapters/results.tex`:759–762, quoted whole:

> Section~\ref{sec:injection} expected the detection figures below to be upper bounds, the corpus
> perturbing the standardised residual stream while holding the forecast expectation fixed. They
> were not. Measured against a realistic arm of $120$ paired injections
> re-derived under the production refit policy (Appendix~\ref{app:injection-pipelines}), the
> discount was zero for every event kind, at a paired interval of $[0.0, 0.0]$

This sentence describes the realistic arm as *"$120$ paired injections"* with **no venue-coverage
qualifier**. It cross-references the appendix, which carries the qualifier, so a reader following
the reference reaches it. Reported as asked; **not edited**. Whether a cross-reference discharges
the qualification is an editorial judgement and is not this session's to take.

### 0.4 — Two River Taps after closure (item 8.4.6). The document makes a claim about closure behaviour, and it is true of the surfaces it describes and false of one it does not.

**What the document says.** `appendix/robustness.tex`:437–440:

> the onset
> was dated to 8 May 2026 and the alarm raised on 16 May, eight trading days later. The closure flag
> then made monitoring dormant, so the run of structural zeros that followed raised nothing further.
> **A repeated alarm on a known-closed venue would have violated that behaviour.**

`chapters/results.tex`:866–870 makes the same point in the chapter, with no statement about
post-closure firing.

**What report 83 measured.** Two River Taps fired **14 times between 2026-05-09 and 2026-07-03**,
every one on an `actual` of zero, all after the 8 May closure.

**These do not contradict each other, and the reason matters.** The dormancy guard exists on two
paths and not on a third:

| Path | Closure guard | Evidence |
|---|---|---|
| Change-point (`signals/change_point.py`) | **Yes** | `:173-184` — `if is_closed(venue, con=con):` … note *"closure (structural break) — monitoring dormant after"* |
| Briefing feed (`signals/briefing.py`) | **Yes** | `:459-460` — `if is_closed(venue, con=con): notes.append(f"{venue} closed; closure dormant, no routine deviation items")` |
| **Point deviation (`signals/deviation.py`)** | **No** | `grep -c "is_closed" signals/deviation.py` → **0**. The module imports only `attribute` and `build_residual_stream` from `signals.residual` (`:34`). |

So the appendix's claim is **true for the two detectors it names** — the cumulative-sum scheme and
the four-of-seven persistence gate — and **true for the ranked briefing a manager sees**. The 14
fires are on the point-deviation primitive, which has no closure guard and is reachable directly:
`service/app.py`:249 `@app.post("/deviation/check")` and `:277` `@app.post("/deviation/scan")`
both call into `signals.deviation` (`:258`, `:281`) without passing through the briefing filter.

**Is the 14-fire behaviour described anywhere in the document? No.** Scope of that negative: `grep`
over `chapters/*.tex` and `appendix/*.tex` for `closure|closed|Two River` intersected with
`detect|alarm|deviat|fire|post-clos|after.*clos|dormant|standby` returned five hits, all read; the
only one addressing post-closure firing is `robustness.tex`:440 quoted above, and it asserts the
opposite for the paths it covers. Nothing describes the point primitive's behaviour.

**Consequence, recorded per the prompt's instruction regardless of the C3 verdict.** This is a live
system defect: `/deviation/check` on a venue that stopped trading two months ago returns a
deviation record with a band computed from a day-of-week median that still remembers a trading
venue. Any C3 instrument that reads the point stream estate-wide inherits it, and 14 of the
estate's 23 chattering fires come from it. **A venue-status guard is a precondition of C3, not a
refinement of it.**

---

## Section 1 — Read-state convention

Three states, per the brief. A fourth qualifier is used because it is the honest description of
most of this session's work:

- **FULL TEXT** — the complete text was retrieved and queried. Where the retrieval was via
  `WebFetch` over publisher or arXiv HTML rather than page-by-page reading by me, the row says
  **FULL TEXT (queried)**. Every content claim from such a source is a targeted extraction, not a
  reconstruction of the paper's argument.
- **ABSTRACT ONLY** — only the abstract, listing metadata or a search summary was available.
- **UNOBTAINABLE** — could not be retrieved at all. The reason is recorded.

Every answer below carries its state.

---

## Section A — Group-conditional conformal prediction (candidate C7)

### A.1 Metadata resolution

| # | Resolved | Read-state | Confirming sources |
|---|---|---|---|
| **A1** | Bharti, Pal, Teneggi, Sulam. *Parameter-Free and Group Conditional Online Conformal Prediction*. arXiv:2606.00419. v1 2026-05-29, v2 06-02, v3 06-08, **v4 2026-07-07**. **No journal-ref, no comments field, no peer-reviewed venue.** | **FULL TEXT (queried)**, v3 HTML | (i) arXiv abstract page; (ii) arXiv HTML full text |
| **A2** | Deng, Ardeshir, Hsu. *Group conditional validity via multi-group learning*. arXiv:2303.03995. v1 2023-03-07, v2 2023-03-19. **WITHDRAWN.** | **ABSTRACT ONLY** (withdrawal notice) | (i) arXiv abstract page; (ii) search index |
| **A3** | Gibbs, Candès. *Adaptive conformal inference under distribution shift*. NeurIPS 2021. Already `gibbs_adaptive_2021`. | **NOT RE-VERIFIED** this session | — |
| **A4** | Zaffran, Féron, Goude, Josse, Dieuleveut. *Adaptive conformal predictions for time series*. ICML 2022, PMLR 162. Already `zaffran_adaptive_2022`. | **NOT RE-VERIFIED** this session | — |
| **A5** | **Vovk, Lindsay, Nouretdinov, Gammerman (2003), *Mondrian confidence machine*, Technical Report, Royal Holloway, University of London**; formalised in **Vovk, Gammerman, Shafer (2005), *Algorithmic Learning in a Random World*, §4.5 "Mondrian conformal predictors"**. | **ABSTRACT ONLY** / bibliographic | (i) Royal Holloway Research Portal record; (ii) MAPIE theoretical documentation, which attributes the taxonomy to *"Vovk et al. (2005), Section 4.5"* |

**A2 is a REFUSAL.** It was withdrawn by Daniel Hsu. The arXiv comments field reads, verbatim:

> "Valid prediction intervals constructed by proposed method do not appear to be any shorter than
> those constructed by baseline methods"

**Do not cite A2 anywhere.** It is not a preprint awaiting a venue; it is a retracted claim, and
the author's own stated reason is that the method did not deliver. It is omitted from the staged
bibliography.

**A5 caveat, stated because it will bite.** The name comes from a 2003 technical report; the
book is the citable formalisation. The book has a **second edition (2022)**, and the §4.5 section
number is confirmed for the edition the secondary sources cite. **If the second edition is used,
re-check the section number before writing it into Methods.** The taxonomy is named for the painter
Piet Mondrian, after the grid structure the partition function induces.

### A.2 The decisive question — availability versus occurrence

**Framing.** Our Mondrian group is a day-of-week structural-closure calendar. It encodes
**availability** (could this venue have traded). The residual distribution is governed by
**occurrence** (did it). At Ellel those diverge on 1,037 of 1,300 calendar-open pairs.

**Question 1: does any group-conditional conformal paper distinguish a partition variable encoding
availability from one encoding occurrence?**

**Answer: not in any source reached this session. Scope of that negative is stated in full below,
because it is a negative that opens work rather than closing it.**

**A1, FULL TEXT (queried).** Groups enter as given objects, not as an object to be validated. The
paper's own words:

> "consider a collection 𝒞={cⱼ:𝒳→[0,1]∣j∈[k]} of *soft* indicator functions, such that cⱼ(X)
> represents the likelihood of input X belonging to group j"

The soft indicator is a *membership likelihood*, not a statement about whether the group tracks the
score distribution. Asked directly whether the paper discusses group misspecification, partition
misspecification, within-group heterogeneity, zero-inflation, or availability-versus-occurrence:
**not present**.

Its first-claim, quoted:

> "We introduce the first parameter-free algorithm for group-conditional online conformal
> prediction, that we dub Portfolios for Online Group Conformal (POGO)."

**Note what that claim is and is not.** It is a claim to be first at being *parameter-free* — at
removing a learning-rate or step-size choice. It is not a claim about group construction.

**The zero-inflation literature exists and does not cover our case.** Li, Diaz-Rincon, Shickel,
Zhang, Bhattacharya, Liang, *Classification-Powered Conformal Inference for Zero-inflated
Outcomes*, arXiv:2605.04219v1, 2026-05-05 (**FULL TEXT (queried)**). It identifies the right
symptom — standard scores *"may fail to adequately capture structural features of the outcome
distribution, for example the presence of excessive zeros"* — but the remedy partitions on the
**outcome**: a classifier separates zero from non-zero, then conformal inference runs on the
non-zero subset. Asked directly whether it discusses group membership defined by a calendar or
availability variable independent of the outcome: **not present**. It also states that
*"class-conditional coverage is often unnecessary when marginal coverage suffices"* — i.e. it
declines the Mondrian framing our design uses.

**The group-specification literature exists and frames the problem differently.** Berthier, Shokry,
Moreaud, Ramelet, Dieuleveut, *Self-Organized Conformal Prediction: Reducing Regional Coverage Gaps
with Unsupervised Group Discovery*, arXiv:2606.29403v1, 2026-06-28 (**FULL TEXT (queried)**). It
does address the inadequacy of hand-specified groups, but as a **granularity and sample-size**
problem:

> "the difficulty is granularity, since meaningful groups often have too few calibration examples
> for stable thresholds"

Asked directly whether it uses the terms *group misspecification* or *partition misspecification*:
**it does not**; it frames the issue as a bias–variance tradeoff.

**Question 2: is there existing terminology for this failure?** Searched separately on *group
misspecification*, *partition misspecification*, and *zero-inflation in conformal prediction*.
**No established term was found for a partition variable that is correct about availability and
wrong about the score distribution.** The nearest named concepts are (a) zero-inflation, which is
outcome-side, and (b) group granularity / small-group variance, which is sample-size-side.

**Question 3: is this just ordinary zero-inflation that everyone knows?**

**No, and the distinction is precise enough to state.** Ordinary zero-inflation is a property of the
*outcome*: the response is zero with positive probability. Our defect is a property of the
*partition*: the grouping function is measurable, deterministic and correct about the thing it
encodes, and it assigns 79.8 % of Ellel's calendar-open observations to a group whose score
distribution they do not belong to. A zero-inflation remedy (classify zero, conformalise non-zero)
would in fact repair our case — but it repairs it by **abandoning the availability partition**,
which is a different claim from the one C7 would make, and no source reached says so.

**What A1 does have that is directly on point, and it cuts both ways.** Its stock-market
experiment defines groups by *"market-indicators such as volatility relative to a rolling median,
calendar-year markers such as day-of-week"*. **Calendar-defined Mondrian groups are therefore not
novel** — a day-of-week partition is already in the literature. What is unaddressed is what
happens when the calendar is right and the outcome does not follow it.

**Consequence for C7.** The contribution is real but must be stated narrowly: not *"group-conditional
conformal ignores misspecified partitions"* (too broad, and A1's day-of-week groups would refute
the flavour of it), but *"a partition encoding availability is assumed to track the score
distribution, and at an intermittent venue it does not"*. State the scope of the negative in the
sentence, per the project's own rule.

### A.3 A1 — other questions

- **Real datasets, FULL TEXT (queried).** Two. **MIMIC-IV** length-of-stay, ~26,000 test samples,
  groups by *"self-reported race, insurance status, and biological sex"*. **Stock market** (Apple,
  Delta, Boeing), ~2,500 trading days per stock, groups by volatility relative to a rolling median
  and by day-of-week.
- **Groups defined by a calendar or availability variable?** **Yes for calendar** (day-of-week, the
  stock experiment). **No for availability.**
- **Code.** `github.com/beepulbharti/pogo`, stated in the paper. **Not inspected this session** —
  licence and commit SHA unverified, recorded as an open item.

### A.4 A4 — AgACI, and whether our implementation matches

**NOT RE-VERIFIED this session, and this is a gap.** Report 83 established that our
`eval/interval_calibration_L1.json` records `agaci_aggregation: "BOA (Wintenberger 2017), per bound,
no tuned rate"` and an `aci_gamma_sweep` over five γ values. The two questions the brief asks —
what AgACI aggregates over, and how the paper handles **infinite intervals** where our
`conformal_quantile` clamps to the largest observed residual (`conformal/wrap.py`:90–106) — were
**not answered**, because the session's budget went to the decisive question above and to the
refusal conditions in groups C, E and F.

**This matters and is not cosmetic.** `conformal/wrap.py`:98 documents the clamp as carrying **no
coverage guarantee** below `conformal_min_n`, and report 83 §4.12 established the clamp fires **0
times of 158 group bands** on the serving path. So the like-for-like comparison the brief asks for
is probably favourable — but it is **unestablished**, and the OPERA / expert-aggregation
reference implementation was not inspected. Recorded as UNRESOLVED, not as clean.

---

## Section B — Murphy diagrams and forecast dominance (candidate C1)

### B.1 Metadata resolution — and the prompt's page range is wrong

| # | Resolved | Read-state | Confirming sources |
|---|---|---|---|
| **B1** | Ehm, Gneiting, Jordan, Krüger. *Of Quantiles and Expectiles: Consistent Scoring Functions, Choquet Representations and Forecast Rankings*. **JRSS Series B, 78(3), 505–562, 2016.** DOI `10.1111/rssb.12154`. Publisher of record now Oxford University Press. Open access. | **FULL TEXT (queried)**, OUP HTML | (i) **CrossRef API** `api.crossref.org/works/10.1111/rssb.12154`; (ii) **OUP publisher page** `academic.oup.com/jrsssb/article/78/3/505/7040984`. Both return 78(3), 505–562, 2016, four authors, identical title. |
| **B4** | **Patton. *Comparing Possibly Misspecified Forecasts*. Journal of Business & Economic Statistics, 38(4), 796–809, 2020.** DOI `10.1080/07350015.2019.1585256`. | **ABSTRACT ONLY** | (i) **CrossRef API** bibliographic query; (ii) Patton's institutional publication page (Duke) |
| B2 | Gneiting, *Making and evaluating point forecasts*, JASA 106, 2011 | **NOT VERIFIED** this session | — |
| B3 | Gneiting, *Quantiles as optimal point forecasts*, IJF 27, 2011 | **NOT VERIFIED** this session | — |

**B1's metadata conflict is resolved and the prompt's alternative is refuted.** The "pages 1 to 29"
form appears nowhere in either confirming source. **78(3), 505–562** is correct at both. The
"1–29" form is the signature of an early-view or author-manuscript pagination and must not be
staged.

**B4 is an attribution-drift finding against this prompt.** The prompt gives the title as *"On the
sensitivity of forecast rankings to the choice of scoring function"*. **No paper of that title
exists** in either CrossRef or Patton's own publication list. The paper the description matches is
*Comparing Possibly Misspecified Forecasts* (JBES 38(4), 2020). A second, adjacent paper —
Barendse & Patton, *Comparing Predictive Accuracy in the Presence of a Loss Function Shape
Parameter*, JBES 40(3), 1057–1069, 2022 — also matches part of the description and is **not** the
same work. The prompt's title is a paraphrase that has hardened into a citation. Staged under its
real title.

### B.2 The decisive question

> When two forecasts are compared under a scoring function consistent for a functional that neither
> targets, what does the paper say the ranking means?

**Answer, FULL TEXT (queried): B1 says nothing, because it assumes the case away.** Asked directly
whether the paper discusses forecasters targeting one functional while being evaluated under a
scoring function consistent for a different one, the answer from the full text is that it **does
not**: the framework assumes alignment throughout — forecasters *"follow the directive"* and are
evaluated under scoring functions chosen to be consistent for **that** directive.

**So the answer to the second half — can a Murphy diagram be drawn at the quantile functional for
forecasts selected under a mean-consistent loss — is: mechanically yes, and B1 gives no licence to
interpret the result as a correction of the earlier selection.** The diagram would be a valid
dominance statement *under the median directive*. The MCS is a valid statement *under the mean
directive*. B1 supplies no bridge, and inventing one is precisely the move this project's rules
forbid.

**This is the single most important finding in Group B and it changes what C1 can claim.** C1 is
not "the MCS used the wrong loss". C1 is at most "the estate's forecasters emit medians; here is
what dominance looks like when they are evaluated under a directive they actually follow, and it
is not the directive the selection used."

### B.3 Other questions — all FULL TEXT (queried)

**The class of scoring functions and what the mixture is over.** For quantiles at level
α ∈ (0,1), the class 𝒮ᵅ_Q of all consistent scoring functions has the form

> "S(x,y)={1(y<x)−α}{g(x)−g(y)}, where g is non-decreasing"

and every member admits the Choquet representation

> "S(x,y)=∫_{−∞}^∞ S_{α,θ}^Q(x,y)dH(θ)"

**The mixture is over a threshold parameter θ on the real line**, and the elementary (extremal)
score is

> "S_{α,θ}^Q(x,y)={1−α, y≤θ<x; α, x≤θ<y; 0, otherwise}"

The expectile class 𝒮ᵅ_E is the analogue with `S(x,y)=|1(y<x)−α|{φ(y)−φ(x)−φ'(x)(y−x)}` for convex
φ, and elementary score `S_{α,θ}^E(x,y)={(1−α)|y−θ|, y≤θ<x; α|y−θ|, x≤θ<y; 0, otherwise}`.

**The associated test, and what it assumes about serial dependence.** This is the answer that
matters most for our design, and it is favourable. The paper supplements the diagram with

> "confidence intervals based on Diebold and Mariano (1995) tests with a heteroscedasticity and
> auto-correlation robust variance estimator (Newey and West, 1987)"

**So a HAC correction is native to the method, not an adaptation we would have to invent.** Our
origins overlap (273 / 260 / 205 per venue, step 1, horizon 7) and `eval/fold_vectors_L1_*.json`
carries an explicit `independence_warning` saying an iid bootstrap or plain t-test over those folds
is invalid. Newey–West is the standard answer to exactly that, and it is the one B1 uses. On tests
more generally the paper is permissive:

> "Tests thus could be based on any functional T defined on the paths of the stochastic process
> θ↦D_n(θ) that is monotone"

**B1's own empirical data.** Three applications, from the experimental section:

| Application | Series | n | Frequency |
|---|---|---|---|
| Inflation | SPF vs Michigan survey, annual US CPI | **129** | quarterly, Q3 1982 – Q3 2014 |
| Recession probability | SPF vs probit | **186** | quarterly |
| Wind speed | 90 % quantile, Stateline wind centre | **5,136** | daily |

**The smallest result B1 reports is n = 129.** Our fold counts are 273 / 260 / 205 — all above it.
This is the one group where our regime sits **inside** the demonstrated range at every venue.

### B.4 Reference implementations

| | `murphydiagram` (R, CRAN) | `scores` (Python) |
|---|---|---|
| Version / date | **0.12.2, published 2019-12-06** | **NOT OBTAINED** |
| Authors | Alexander Jordan, Fabian Krueger | — |
| Maintainer | Fabian Krueger | — |
| **Licence, verbatim** | **`GPL-3`** | — |
| Stated reference | Ehm, Gneiting, Jordan and Krueger, JRSS-B 2016, DOI 10.1111/rssb.12154 | — |
| Confidence band | Built from Diebold–Mariano with Newey–West, per B1 §above | — |
| HAC / lag correction available | **Yes** — it is the paper's own method | — |
| Last published | **2019-12-06 — roughly seven years stale** | — |

**Not run.** Read from the CRAN package page only; the source was not inspected line by line, so
"the elementary score matches B1's definition" is **asserted by the package's own stated reference,
not verified by me against the code**. Recorded honestly rather than claimed.

**On the GPL-3 licence.** This is **not** a refusal condition as the brief defines it — GPL-3 does
not prohibit use, and reading an implementation to check an equation triggers nothing. It *would*
matter if code were copied or translated into this project, because GPL-3 is copyleft and would
propagate. **The safe path is to implement the elementary score from B1's equations, quoted above,
and not from the package.** Flagged so the decision is made deliberately rather than discovered.

**`scores` (Python) was NOT OBTAINED.** `pypi.org/project/scores/` returned a page whose content
failed to load. Licence, version and whether its Murphy tutorial matches B1 are all **UNRESOLVED**.
No claim is made about it.

### B.5 The freeze-risk decision — recorded, not taken

**Not taken in this session, as instructed.** The outstanding decision: if a Murphy diagram at the
median functional shows a different rung dominating, that contradicts a frozen served model and a
pre-registered MCS with submission on 21 August.

**One fact from this session bears on it and should be in front of whoever takes it.** Per B.2, B1
supplies **no bridge** between a dominance statement under the median directive and a selection
made under a mean-consistent loss. So the contradiction may not be a contradiction at all — it may
be two statements about different directives, which is reportable as a declared scope difference
rather than as a reversal. That framing is available and is weaker (and more defensible) than
"the selection was wrong". It does not make the decision, and the decision remains outstanding.

---

## Section C — Conformal test martingales (candidate C6)

### C.1 Metadata resolution — and the prompt's author order is wrong

| # | Resolved | Read-state | Confirming sources |
|---|---|---|---|
| C1 | Vovk, Nouretdinov, Gammerman. *Testing exchangeability on-line*. ICML 2003. | **NOT VERIFIED** this session | — |
| C2 | Fedorova, Gammerman, Nouretdinov, Vovk. *Plug-in martingales*. ICML 2012. | **NOT VERIFIED** this session | — |
| **C3** | **Volkhonskiy, Nouretdinov, Gammerman, Vovk, Burnaev.** *Inductive Conformal Martingales for Change-Point Detection*. arXiv:1706.03415, submitted 2017-06-11. Comments: *"22 pages, 9 figures, 5 tables"*. PMLR COPA v60 (2017) per the prompt, **not re-verified**. | **ABSTRACT ONLY** | (i) arXiv abstract page; (ii) search index |
| C4 | Vovk et al. *Retrain or not retrain*. PMLR COPA v152, 2021. arXiv:2102.10439. | **NOT VERIFIED** this session | — |
| C5 | Vovk. *Testing randomness online*. Statistical Science 2021. | **NOT VERIFIED** — volume and pages remain **UNRESOLVED** | — |
| **C6p** | **Shaer, Bar, Prinster, Romano.** *Testing For Distribution Shifts with Conditional Conformal Test Martingales*. arXiv:2602.13848. v1 2026-02-14, **v2 2026-06-12**. No journal-ref. | **ABSTRACT ONLY** (full abstract quoted) | (i) arXiv abstract page; (ii) search index |

**C3 author order is a finding against this prompt.** The prompt lists *"Volkhonskiy, Burnaev,
Nouretdinov, Gammerman, Vovk"* — Burnaev second. arXiv gives **Denis Volkhonskiy, Ilia Nouretdinov,
Alexander Gammerman, Vladimir Vovk, Evgeny Burnaev** — Burnaev **last**. Staged in the arXiv order.

**C6p authors resolved:** Shalev Shaer, Yarin Bar, Drew Prinster, Yaniv Romano. The prompt recorded
them as unknown.

### C.2 The ties question — the decisive one, and it is adverse

**Why it is decisive.** Report 83 established that our ranks are computed with **mid-rank**
tie-breaking, `eval/exchangeability_diagnostic.py`:132–136:

```python
            # Mid-rank, so exact ties (structural-closure zeros) do not bias the fraction
            # in either direction.
            below = float((grp < row["res"]).sum())
            equal = float((grp == row["res"]).sum())
            ranks.append((below + 0.5 * equal) / grp.size)
```

and that at Ellel **1,037 of 1,300 calendar-open pairs took nothing**, so the near-zero residual
population that produces exact ties is 79.8 % of that group, not a corner case.

**What the requirement actually is.** From the `nonconform` documentation
(`oliverhennhoefer.github.io/nonconform/user_guide/exchangeability_martingales/`,
**FULL TEXT (queried)**), stating the classical condition:

> "under exchangeability, the sequential conformal p-values used by the martingale are valid and,
> with **proper randomized tie-breaking in the classical construction**, i.i.d. `Uniform(0, 1)`."

**Mid-rank is not randomized tie-breaking.** Mid-rank is a deterministic convention that assigns
every tied observation the same value; randomized (smoothed) tie-breaking draws a uniform variate
to place each tied observation independently within the tied block. The first produces a p-value
sequence with atoms; the second is what makes the sequence uniform. A power martingale
`r_n = ε·p_n^(ε−1)` accumulated over a sequence with a 79.8 %-mass atom is not accumulating
evidence about exchangeability — it is accumulating the atom.

**This is fixable, which is why C6 is not refused.** The fix is to emit randomized ranks alongside
the mid-ranks. It is a small change at the same site report 83 identified. But it is **not** what
the existing diagnostic computes, and the existing `mean_rank` figures cannot be reused for a
martingale.

**Temporal dependence, same source:**

> "If temporal dependence is strong, p-value validity can degrade; monitor model and data
> assumptions alongside evidence statistics."

### C.3 C6p's contamination argument — and it hits our design, not a neighbouring one

The brief asks whether C6p's argument applies to a fixed rolling calibration window or only to a
growing reference pool, because that determines whether it wounds us. **It applies to the growing
pool, and the growing pool is ours.**

C6p's abstract, quoted:

> "Existing CTM detectors construct test martingales by continually growing a reference set with
> each incoming sample, using it to assess how atypical the new sample is relative to past
> observations. While this design yields anytime-valid type-I error control, it suffers from
> **test-time contamination**: after a change, post-shift observations enter the reference set and
> dilute the evidence for distribution shift, increasing detection delay and reducing power. In
> contrast, our method avoids contamination by design by comparing each new sample to a fixed null
> reference dataset."

**Our pool is the growing kind.** `eval/exchangeability_diagnostic.py`:117–120 appends every
newly-observed residual into `pool_res` / `pool_state` as its target date passes, and the file's own
header (`:9`) records *"The band's calibration pool is EXPANDING"*.

**So: C6p wounds our design and is not irrelevant to it.** The consequence is concrete — Two River
Taps' closure is a genuine, dated distribution shift on 8 May 2026, and every post-closure zero
enters the growing pool and dilutes the very evidence a martingale would be accumulating about it.
That is the failure mode C6p names, on the one change point in this corpus whose onset is fixed
independently of any detector.

**Read-state honesty: this is ABSTRACT ONLY.** The abstract states the mechanism unambiguously and
is quoted rather than paraphrased. The full text was not read, so no claim is made here about the
*size* of the contamination effect, only about which design it applies to.

### C.4 C3's assumption and evaluation data — partial

**ABSTRACT ONLY.** The abstract states the method *"requires only the independence and identical
distribution of observations"*, which is the exchangeability condition, and describes comparison
against CUSUM, Shiryaev–Roberts and change-point oracles. **The abstract does not name the
datasets.** The brief's request for series type, length, number of change points, and whether the
change points were real or injected is therefore **UNRESOLVED for C1 through C4**. The fixed-versus-
growing calibration question for C3 specifically ("inductive" implies a fixed calibration set) was
**not** confirmed from the text and must not be asserted from the title.

### C.5 Reference implementation — `nonconform`

| Field | Value |
|---|---|
| Repository | `github.com/OliverHennhoefer/nonconform` |
| **Licence** | **BSD-3-Clause** |
| Commit SHA inspected | **None — the repository page was read, no commit was pinned.** 535 commits on `main`; **last commit date not displayed and therefore not recorded** |
| Latest release | **Not displayed; unresolved** |
| Associated paper | Hennhöfer, Kirsch, Preisach (2026), *Conformal Anomaly Detection in Python: Moving Beyond Heuristic Thresholds with 'nonconform'*, arXiv:2605.13642 |
| Power martingale formula | `r_n = ε · p_n^(ε−1)` for `ε ∈ (0,1]` — **matches the classical Vovk construction** as documented; **not verified against C1's text**, which was not read |
| Ville threshold | `Pr(sup_t M_t ≥ λ) ≤ 1/λ`; the example uses `restarted_ville_threshold=100.0`, ≈1 % anytime false-alarm probability |
| Documented caveat — ties | *"proper randomized tie-breaking in the classical construction"* required; **no implementation detail given beyond the requirement** |
| Documented caveat — dependence | *"If temporal dependence is strong, p-value validity can degrade"* |
| Documented caveat — calibration reuse | *"If you reuse a fixed calibration ECDF to score a stream, treat alarms as monitoring signals unless you have separately justified the resulting p-value sequence"*; reused fixed calibration gives p-values that are *"marginally valid but share calibration-induced dependence"*; and **"Do not attach a Ville anytime guarantee to this path unless the resulting p-value sequence has a separate conditional validity argument."** |

**Not run. Documentation read only; the source was not inspected.** So "the power martingale
formula matches C1" is a match between the package's documentation and the standard form, **not**
a verification against C1's text, which was not obtained.

**Licence is clear: BSD-3-Clause is permissive and is not a refusal condition.**

**The three-way squeeze on C6, stated plainly.** The growing pool is contaminated (C6p); a fixed
pool loses the Ville guarantee without a separate argument (`nonconform` docs, quoted above); and
either way the ties must be randomized, which our diagnostic does not do. None of the three is
fatal alone. Together they mean C6 is a research task with a real chance of terminating in "the
guarantee does not attach", and that should be priced in before the build, not discovered in it.

---

## Section D — Forecastability (candidate C2)

### D.1 Primary source for the measure

**Resolved. FULL TEXT NOT read; bibliographic and secondary sources only.**

**Goerg, Georg M. (2013), *Forecastable Component Analysis*, Proceedings of the 30th International
Conference on Machine Learning, PMLR / JMLR W&CP 28(2), 64–72.** Confirmed by (i) the PMLR
proceedings PDF listing `proceedings.mlr.press/v28/goerg13.pdf` and (ii) the ACM Digital Library
record for ICML 2013 vol. 28. The prompt's "believed ICML 2013" is **correct**, and the
volume/pages are now resolved.

The measure: **Ω(y_t), the forecastability of a series, defined from the spectral entropy of the
spectral density f_y(λ)** — high entropy, low forecastability. Ω = 0 for white noise, Ω = 1 (or
100 %) for a pure sinusoid. Implemented in the R package **`ForeCA`** (Goerg).

**This is the primary source, not the textbook.** Hyndman & Athanasopoulos' *FPP* and the
`tsfeatures` package both use the measure; neither introduces it. Cite Goerg.

### D.2 The load-bearing question — and the answer is adverse to the framing, not to the candidate

> Is there any peer-reviewed source establishing a relationship between a forecastability measure
> and the **separability of competing models**?

**Answer: no source establishing that was found, and the closest peer-reviewed source reports the
opposite of what would be needed.**

**Ponce-Flores, Frausto-Solís, Santamaría-Bonfil, Pérez-Ortega, González-Barbosa (2020), *Time
Series Complexities and Their Relationship to Forecasting Performance*, Entropy 22(1):89,
DOI `10.3390/e22010089`. FULL TEXT (queried).** This is the nearest peer-reviewed work: it
evaluates spectral entropy alongside permutation entropy and 2-regimes entropy against forecasting
error.

**What it does establish — a relationship to the ERROR LEVEL:**

> "when the complexity measures are higher, the log(MASE) value is higher too"

**What it explicitly does not establish — separability of competing methods:**

> "there are no specific regions in which any of the tested methods obtain better performance than
> the rest, which is consistent with the *No-Free Lunch* theorem"

That is a statement that complexity does **not** carve the feature space into regions where
different methods win. It is about method-versus-method comparison and it reports a null.

**So the sentence C2 could write changes, exactly as the brief anticipated.** Not *"as the
literature predicts, low forecastability explains a flat MCS"* — the literature predicts a higher
error level, not a flatter comparison. The defensible sentence is *"we observe"*, with the
Ponce-Flores null available as a consistent-but-not-confirming neighbour.

**A second caveat, and it is a regime caveat.** Ponce-Flores et al. applied a **minimum threshold of
250 observations**; its synthetic series carry 10,000 observations each and it uses 22,610 M4
series. **Ellel has 66 trading days.** Even the null result was not measured anywhere near our
smallest venue.

**A third source exists and was not obtained:** Rui Wang (AWS), *Time Series Forecastability
Measures*, arXiv:2507.13556, surfaced in search and **not read**. It may bear directly on this
question. Recorded as an unexamined lead, not as evidence.

---

## Section E — Alarm management (candidate C3)

### E.1 The standards themselves

| # | Document | State |
|---|---|---|
| E1 | EEMUA Publication 191, 4th edition | **UNOBTAINABLE** — purchase-only. The EEMUA product page confirms existence and the 4th-edition release; **no contents were read.** |
| E2 | ANSI/ISA-18.2 | **UNOBTAINABLE** — paywalled |
| E3 | IEC 62682:2023 | **UNOBTAINABLE** — paywalled |

**Per this project's governing rule, no claim about what any of the three argues is made anywhere
in this report.** One bibliographic relationship is recorded because two independent sources state
it and it is not a claim about contents: ISA-18.2 and IEC 62682 are aligned with EEMUA 191, and
IEC 62682 is a lightly-modified adoption of the ISA standard.

### E.2 The search for a citable peer-reviewed substitute — partial, and honestly so

The brief's instruction is exact: find a peer-reviewed survey **that states the KPIs and thresholds
with attribution**; if one exists it becomes the citable source; if none states the numbers, record
that C3 cannot be supported and say so.

**Three peer-reviewed candidates were identified. None was read. The numbers were not confirmed
from any of them.**

| Candidate | Why it is a candidate | State |
|---|---|---|
| Wang, Yang, Chen, Shah (2016), *An overview of industrial alarm systems: main causes for alarm overloading, research status, and open problems*, IEEE Transactions on Automation Science and Engineering | The field's standard overview; free author copy at `ece.ualberta.ca/~tchen/papers/WangJD_YangF_TASE_2016April.pdf` | **UNOBTAINABLE this session.** The PDF was fetched (2 MB) and **failed to parse** — the extractor returned only PDF structural metadata and font data, no text. Volume, issue, pages and DOI therefore **unconfirmed**. |
| Naghoosi, Izadi, Chen (2011), *Estimation of alarm chattering*, Journal of Process Control 21(9), 1243–1249 | Directly on the chattering KPI | **NOT OBTAINED.** Citation seen only in a search summary; **not confirmed from CrossRef or publisher.** |
| Kondaveeti, Izadi, Shah et al. (2013), *Quantification of alarm chatter based on run length distributions*, Chemical Engineering Research and Design 91(12), 2550–2558 | **Run-length distributions** — the exact statistic report 83 measured (longest run 4) | **NOT OBTAINED.** Same status. |

**The numeric thresholds that surfaced — a stale alarm as one persisting beyond 24 hours, a
chattering alarm as one exceeding roughly 2 activations per second — came from vendor and
consultancy material.** The brief forbids characterising the standards from those sources, and this
report does not use them. They are named here only so a later session does not rediscover them and
mistake them for evidence.

### E.3 The two questions, answered as far as the evidence permits

**Question 1 — is there a defined KPI for an alarm that continues to annunciate after the monitored
equipment has been taken out of service?** **UNRESOLVED.** No peer-reviewed source stating a term
and a recommended handling was read. Terms that would be searched next — *shelving*,
*out-of-service state*, *state-based alarming*, *designed suppression* — were surfaced but not
confirmed against a readable peer-reviewed source. Note also a substantive concern: the "stale
alarm" concept, as far as the unreadable material suggests, describes an alarm that **remains in
the alarm state**, which is not quite our case. Two River Taps' alarm **clears and re-fires** every
Friday and Saturday. That is closer to chattering-on-decommissioned-equipment than to staleness, and
which KPI applies is itself unresolved.

**Question 2 — the defined term and threshold for a chattering alarm, and how a run is
distinguished from a genuine persistent condition?** **UNRESOLVED** from any citable source, for
the same reason. Kondaveeti et al. (2013) is the paper most likely to answer it, since run-length
distributions are precisely the discriminator the question asks for, and it was not obtained.

### E.4 What this means for C3

**Verdict: UNRESOLVED, not UNSUPPORTABLE.** The brief anticipated a clean kill and this session
cannot deliver one honestly. What it establishes is narrower and should be stated as such:

- The three standards are **UNOBTAINABLE** and no claim about their contents may be written.
- A peer-reviewed literature that quantifies alarm chattering by run-length distribution
  **demonstrably exists**; three specific papers are named above.
- **None of the three was read**, so whether any states a citable threshold is **not established
  in either direction**.

**What would close it, precisely: obtain Kondaveeti et al. (2013), ChERD 91(12), 2550–2558 and
Naghoosi et al. (2011), JPC 21(9), 1243–1249, and read whether either states a run-length threshold
with attribution to EEMUA 191 or ISA-18.2.** That is one library request. Until it is done, C3 is
open, and a session that reports it as either supported or killed is reporting past its evidence.

**Independent of C3's fate, and recorded per instruction:** §0.4's finding stands. The Two River
Taps post-closure firing is a live defect, belongs in Limitations whether or not C3 is ever built,
and any C3 instrument needs a venue-status guard from the first line or its estate-wide statistics
are contaminated by 14 of 23 chattering fires.

---

## Section F — Surveillance algorithms (candidate C9)

### F.1 The decisive question — minimum history

> What is the minimum history the Farrington family requires, and does the baseline window draw on
> same-period-in-previous-years data?

**Answer: both halves are adverse, and the second is structurally fatal rather than merely tight.**

**ABSTRACT ONLY / secondary sources.** The reconstruction that follows comes from search summaries
over the Noufaily 2013 implementation literature and the `surveillance` package documentation; the
primary papers F1–F4 were **not read**.

- **Recommended baseline: 5 years.** Attributed to Noufaily et al. (2013).
- **Minimum baseline: 3 years** — *"to ensure that there are enough data points to fit the
  regression model"*, described as the minimum for robust estimation.
- **The baseline window is explicitly same-period-in-previous-years.** The algorithm uses historic
  values from a window of size **2w+1** centred on the same period, taken **b periods back in
  time**, with weekly data and 52 weeks per year. Typical settings are b=3, w=3.

**We hold roughly 51.6 weeks per venue** — beer_hall 2025-06-04 to 2026-07-07, ellel 2025-06-08 to
2026-07-04, two_river_taps 2025-06-12 to 2026-05-08 (report 83 §2.2).

**The structural problem is not that one year is short of three. It is that b is undefined at
b ≥ 1.** The baseline window asks for the same calendar weeks in previous years. **We have no
previous year.** There is no tuning of w that recovers it, and no amount of additional daily
granularity substitutes for a second annual cycle. This is not a power problem; the estimator has
no data to read.

### F.2 The named exception — exists, and could not be read

> If a daily adaptation exists that works on under two years, name it and state its requirements.

**Named: Yoneoka et al. (2021), *Geographically weighted generalized Farrington algorithm for rapid
outbreak detection over short data accumulation periods*, Statistics in Medicine (DOI
`10.1002/sim.9182`).** Its title is precisely the exception the brief asks about.

**UNOBTAINABLE.** The Wiley full-text URL returned **HTTP 402 Payment Required**. Its minimum
accumulation period, its target frequency, and its evaluation data are all **UNRESOLVED**.

**One thing is legible from the title alone and it is not encouraging: the method is
*geographically weighted*, which borrows strength across sites.** We have three venues, of which one
has been closed since 8 May 2026 and one trades 1.2 days a week. Whether three venues is enough to
weight across is not knowable without the paper — but it is a second requirement stacked on top of
the first, not a relaxation of it.

### F.3 Reweighting of past outbreaks

**UNRESOLVED.** The brief asks whether the Farrington reweighting step, which down-weights past
outbreak periods when fitting the baseline, has an analogue in our rolling calibration. Our design
has none — report 83 established that the pool is expanding with no down-weighting
(`exchangeability_diagnostic.py`:117–120) — but **the mechanism was not read from F1 or F2**, so no
claim about what it does is made here.

### F.4 Reference implementation

**`surveillance` (R). NOT INSPECTED.** Salmon, Schumacher & Höhle (2016), JSS, is the accompanying
paper (F3) and was **not obtained**. Licence, implemented algorithms and per-algorithm input
requirements are **UNRESOLVED**.

### F.5 Verdict driver

**Per the brief's own instruction — "If the method structurally requires multiple years, record C9
as BLOCKED on history length and stop" — C9 stops here.** The one named exception is real, is
correctly identified, and is paywalled; obtaining it is a library request, not a build task.

---

## Section G — Regime comparison table (item 8.1)

**Scope: every method whose paper's experimental section was reachable this session. Methods whose
evaluation data could not be read are listed below the table as UNRESOLVED rather than estimated.**
Every row is from the paper's **experimental** section, not its introduction.

| Method | Paper's own evaluation data | Series length (obs/series) | Frequency | Target type | Regime changes | Group / partition structure | Smallest series with a reported result |
|---|---|---|---|---|---|---|---|
| **POGO** — group-conditional OCP (A1) | MIMIC-IV ICU length-of-stay; stock returns (AAPL, DAL, BA) | MIMIC ~26,000 test samples; stocks ~2,500 trading days per stock | daily (stocks); per-admission (MIMIC) | continuous | not reported as a designed factor | MIMIC: 3 attributes (race, insurance, sex). Stocks: volatility-vs-rolling-median, **day-of-week** | **~2,500** (stocks), §Experiments |
| **Murphy diagrams** (B1) | SPF vs Michigan inflation; SPF vs probit recession; Stateline wind speed | **129**; **186**; **5,136** | quarterly; quarterly; daily | continuous; probability; continuous (90 % quantile) | none designed | none — no group structure | **129** (inflation), §Empirical |
| **Zero-inflated conformal** (Li et al. 2026, background for A) | Simulation; UCI Air Quality | 1,000–5,000 (sim); **9,358** (real) | hourly (real) | zero-inflated continuous | none | partition on the **outcome** (zero / non-zero), 2 cells | **1,000** (simulation) |
| **Self-organized CP** (Berthier et al. 2026, background for A) | 5 regression + 3 classification UCI/vision sets (Bio-CASP, Bike Sharing, California Housing, Concrete, Auto MPG; CIFAR-10, Covertype, MNIST) | not reported as one figure; Concrete and Auto MPG flagged as *"limited-calibration"* | not time series | continuous / categorical | none | **discovered**, not specified — Self-Organizing Maps | not stated numerically |
| **Complexity vs forecast error** (Ponce-Flores et al. 2020, the D-group evidence) | 215 synthetic series; 22,610 M4 series | 10,000 (synthetic); M4 varies, **minimum threshold 250 applied** | yearly → daily | continuous | none | none | **250** (the applied floor) |
| **Conformal test martingales** (C1–C4) | **UNRESOLVED** — abstracts do not name datasets and full texts were not obtained | — | — | — | — | — | — |
| **Farrington family** (F1–F4) | **UNRESOLVED** — papers not obtained | — | — | **count** (required) | — | site / stratum | — |
| **Alarm-management KPIs** (E1–E3) | **UNRESOLVED** — standards unobtainable | — | — | — | — | — | — |

**Our three venues, on the same axes.** Note that the origin counts and the observation counts are
different quantities and both are given; report 83's §7.21 established the trading-day figures.

| Venue | Rolling origins | Trading days (`revenue_exvat > 0`) | Frame length after calendar fill | Frequency | Target type | Regime changes | Partition structure |
|---|---|---|---|---|---|---|---|
| `beer_hall` | **273** | **301** | 399 | daily | continuous (£, ex-VAT); count target available (`n_transactions`) | none dated | Mondrian, 2 groups (calendar-open / calendar-closed) |
| `two_river_taps` | **205** | **280** | 331 | daily | as above | **1 real, dated 2026-05-08** (closure) | as above |
| `ellel` | **260** | **66** | 392 | daily | as above | none dated | as above |

**The correction to this prompt's own numbers.** The brief states *"beer_hall 273, two_river_taps
260, ellel 205"*. Report 83 §3.6 measured, from `eval/fold_vectors_L1_*.json`, **beer_hall 273,
ellel 260, two_river_taps 205**. The last two are transposed in the brief. Corrected above.

### Where Ellel sits, per method, stated as a number

- **Murphy diagrams (B1).** Ellel's 260 origins sit **inside** the demonstrated range: B1's smallest
  reported result is n = 129. **Ellel is not the constraint for C1.** Its 66 trading days are,
  however, the population any median-functional statement would rest on, and that is below 129.
- **POGO (A1).** Ellel is **outside** by roughly an order of magnitude: A1's smallest real-data
  experiment is ~2,500 observations per series against Ellel's 66 traded days. Its MIMIC groups
  carry thousands of members each; our Ellel calendar-closed group carries 520 pairs and its
  calendar-open group is 79.8 % zeros.
- **Complexity vs error (Ponce-Flores).** Ellel is **outside**: the study applied a 250-observation
  floor and Ellel has 66. The floor is explicit, so this is a stated exclusion rather than an
  inference.
- **Farrington family.** Every venue is outside, on history length rather than on n. See §F.
- **Conformal test martingales.** **Cannot be stated** — the evaluation data was not obtained.
  Recorded as unknown rather than assumed adverse.

---

## Section H — Bibliography cross-check (item 8.2)

**`ref.bib` holds 124 entries, not the 111 previously recorded.** Command:
`grep -c "^@" ref.bib` over `/Users/hapuna/Downloads/prj93-overleaf/ref.bib` at clone HEAD `99ee32b`.
Breakdown by type: 52 `@article`, 35 `@misc`, 33 `@inproceedings`, 3 `@book`, 1 `@online`.

**The 111 figure is stale by 13 and should be corrected in whichever store carries it.** Not
corrected here; this session writes no ledger.

Per-paper status:

| # | Paper | In `ref.bib`? | Key | Metadata mismatch |
|---|---|---|---|---|
| A1 | Bharti et al., POGO | **No** | — | staged |
| A2 | Deng et al. | **No** | — | **do not add — withdrawn** |
| A3 | Gibbs & Candès | **Yes** | `gibbs_adaptive_2021` | not re-verified this session |
| A4 | Zaffran et al. | **Yes** | `zaffran_adaptive_2022` | not re-verified this session |
| A5 | Vovk et al., Mondrian | **No** | — | staged (both the 2003 report and the 2005 book) |
| B1 | Ehm et al. | **No** | — | staged, 78(3) 505–562 |
| B2 | Gneiting 2011 JASA | **Not checked** | — | not verified this session |
| B3 | Gneiting 2011 IJF | **Not checked** | — | not verified this session |
| B4 | Patton 2020 | **No** | — | staged **under its real title**; the brief's title does not exist |
| C1–C5 | Vovk martingale line | **Not checked** | — | not verified this session |
| C3 | Volkhonskiy et al. | **No** | — | staged, **author order corrected** |
| C6p | Shaer et al. | **No** | — | staged |
| — | Hennhöfer et al., `nonconform` | **No** | — | staged |
| D | Goerg 2013 | **No** | — | staged |
| D | Ponce-Flores et al. 2020 | **No** | — | staged |
| A-bg | Li et al. 2026 | **No** | — | staged |
| A-bg | Berthier et al. 2026 | **No** | — | staged |
| E1–E3 | EEMUA / ISA / IEC | **Not checked** | — | **not staged — unobtainable** |
| E | Wang, Naghoosi, Kondaveeti | **No** | — | **not staged — metadata unconfirmed** |
| F1–F4 | Farrington family | **Not checked** | — | **not staged — not obtained** |

**Nothing was added to `ref.bib`.** Everything staged is in
`brain/ledger/staged_references.bib`, which no `.tex` file inputs.

---

## Section I — Verdict table

| Candidate | Verdict | The one fact that drove it |
|---|---|---|
| **C7** — Mondrian group misspecification | **SUPPORTED-WITH-CAVEAT** | The availability-versus-occurrence distinction is made nowhere in the sources reached. A1 takes groups as given soft indicators and does not discuss misspecification at all; the zero-inflation remedy (Li et al. 2026) partitions on the **outcome** and explicitly declines class-conditional coverage; the group-discovery work (Berthier et al. 2026) frames bad partitions as **granularity**, not as the partition variable tracking the wrong quantity. **Caveat that must be written into the claim:** A1's stock experiment already uses **day-of-week** groups, so calendar-defined Mondrian groups are not novel — only the mismatch is. |
| **C1** — Murphy diagram / dominance | **SUPPORTED-WITH-CAVEAT** | B1 is resolved, open access, its elementary quantile score is quoted, its test is Diebold–Mariano with **Newey–West HAC** — which is the native answer to our overlapping origins — and its smallest empirical result is n = 129, below all three venues' origin counts. **The caveat is the crux:** B1 *"does not discuss"* evaluating forecasts under a functional they do not target; the framework assumes the directive and the score agree. So the diagram is a statement under the **median** directive and the MCS is one under the **mean** directive, and B1 supplies **no bridge** between them. |
| **C6** — Conformal test martingale | **SUPPORTED-WITH-CAVEAT** | Three documented conditions bite at once. Validity needs *"proper randomized tie-breaking"*; our ranks are **mid-rank** over a population that is **79.8 % zeros at Ellel**. C6p's contamination argument applies to a *"continually growing reference set"*, which is exactly our expanding pool, and Two River Taps' 8 May closure is the shift that would be diluted. And a fixed reference instead forfeits the Ville guarantee *"unless the resulting p-value sequence has a separate conditional validity argument"*. Each is fixable; all three together make a terminating-in-null outcome a real possibility that should be priced before the build. `nonconform` is **BSD-3-Clause** — no licence bar. |
| **C2** — Forecastability ceiling | **SUPPORTED-WITH-CAVEAT** | Goerg (2013), PMLR 28(2) 64–72, is confirmed as the primary source for the spectral-entropy measure Ω. But the **separability** claim has no support: the nearest peer-reviewed work (Ponce-Flores et al. 2020, Entropy 22(1):89) relates complexity to **error level** and reports *"there are no specific regions in which any of the tested methods obtain better performance than the rest"*. The sentence becomes **"we observe"**, not "as the literature predicts". Second caveat: that study applied a **250-observation floor**; Ellel has 66. |
| **C3** — Alarm-management KPIs | **UNRESOLVED** | All three standards are **UNOBTAINABLE** (purchase-only / paywalled) and no claim about their contents is made. A peer-reviewed literature quantifying alarm chatter **by run-length distribution** demonstrably exists — Kondaveeti et al. (2013) ChERD 91(12) 2550–2558 and Naghoosi et al. (2011) JPC 21(9) 1243–1249 — and **none of it was read**; the Wang et al. (2016) IEEE T-ASE overview PDF fetched at 2 MB and **failed to parse to text**. Whether a citable threshold exists is not established **in either direction**. One library request closes it. |
| **C9** — Farrington / surveillance | **UNSUPPORTABLE** | The baseline window draws **same-period-in-previous-years** data at b periods back (typically b=3, w=3), minimum **3 years**, recommended **5**. We hold **≈51.6 weeks per venue**. This is not a power shortfall — at b ≥ 1 the estimator has no data to read, and no choice of w recovers it. The one named exception, Yoneoka et al. (2021) Stat. Med. `10.1002/sim.9182`, is **UNOBTAINABLE** (HTTP 402) and is *geographically weighted*, which stacks a multi-site requirement on top rather than relaxing the history one. **BLOCKED on history length, per the brief's own stopping rule.** |

**Two of six killed or stopped (C9 outright, C3 pending one library request), four supported only
with caveats that change what each may claim.** No candidate came back clean.

### Note on the Group B freeze-risk decision

**The decision recorded at §3 of the brief — whether a median-functional dominance result that
contradicts the frozen served model and the pre-registered MCS is reportable as a declared tension
or is unmanageable three weeks from submission — was NOT taken in this session, as instructed.** It
remains outstanding. §B.5 records the one fact from this session that bears on it.

---

## Section J — Unsolicited findings

Findings that contradict this prompt's asserted metadata are listed first, because the brief asks
to be contradicted.

**J.1 — B1's page range in the brief is wrong.** The brief offers "pages 1 to 29" as one of two
candidates. It is neither the publisher's nor CrossRef's. Both give **78(3), 505–562**. The 1–29
form is early-view or author-manuscript pagination and would have gone into `ref.bib` uncorrected.

**J.2 — B4 does not exist under the title the brief gives it.** *"On the sensitivity of forecast
rankings to the choice of scoring function"* returns nothing in CrossRef or on Patton's own
publication list. The work described is **Patton, *Comparing Possibly Misspecified Forecasts*, JBES
38(4), 796–809, 2020**. A second, genuinely different paper (Barendse & Patton, JBES 40(3), 2022)
matches part of the same description. This is the attribution-drift failure mode the brief's §0
names, arriving inside the brief itself.

**J.3 — A2 is withdrawn, and withdrawn for a reason that matters.** Daniel Hsu withdrew
arXiv:2303.03995 with the comment *"Valid prediction intervals constructed by proposed method do not
appear to be any shorter than those constructed by baseline methods"*. Had it been cited on the
strength of its abstract, this project would have attributed a group-conditional result to a paper
its own author retracted for not delivering one.

**J.4 — C3's author order in the brief is wrong.** The brief lists Burnaev second; arXiv lists him
**last** (Volkhonskiy, Nouretdinov, Gammerman, Vovk, Burnaev).

**J.5 — The origin counts in the brief's §8.1 transpose two venues.** The brief says
"beer_hall 273, two_river_taps 260, ellel 205". The measured values (report 83 §3.6, from
`eval/fold_vectors_L1_*.json`) are **beer_hall 273, ellel 260, two_river_taps 205**. Ellel — the
venue every small-sample argument in this audit turns on — is credited with the *larger* of the two
counts in the brief, which flatters exactly the case that needs the most care.

**J.6 — `ref.bib` is 124 entries, not 111.** Whichever store records 111 is stale by 13.

**J.7 — The Methods rung-4 citation defect (§0.1) has a second limb nobody has named.** Even after
`ansari_chronos_2024` is corrected to `ansari_chronos-2_2025`, the sentence remains wrong for the
third arm: `rung4_chronos_bolt` loads `amazon/chronos-bolt-small`, whose architecture is described
by neither paper. A single-citation sentence covering three arms cannot be made correct; the repair
needs two citations and a note, or a narrower sentence.

**J.8 — The dormancy guard is on two detector paths and not on the third, and the document's claim
is scoped to the two that have it.** §0.4 in full. `signals/deviation.py` contains zero occurrences
of `is_closed`, while `signals/change_point.py`:173 and `signals/briefing.py`:459 both guard. The
appendix sentence *"A repeated alarm on a known-closed venue would have violated that behaviour"* is
true as written and would be false if the point primitive were in its scope. `POST /deviation/check`
puts it in a caller's scope.

**J.9 — GPL-3 on `murphydiagram` is a decision, not a blocker, and it should be taken
deliberately.** Reading it to check an equation triggers nothing. Translating its code into this
project's Python would propagate copyleft. B1's equations are quoted in §B.3 and are sufficient to
implement from; that is the path that avoids the question entirely.

**J.10 — `murphydiagram` was last published 2019-12-06.** Roughly seven years without a release. Not
disqualifying for a reference implementation of a 2016 paper's equations, but worth knowing before
depending on it.

**J.11 — The `nonconform` documentation is unusually candid about its own limits, and two of its
warnings are aimed squarely at designs like ours.** *"Do not attach a Ville anytime guarantee to
this path unless the resulting p-value sequence has a separate conditional validity argument"* and
*"marginally valid but share calibration-induced dependence"* are both statements a vendor
implementation had no obligation to make. They are the best evidence in this report that C6's
guarantee is contingent rather than automatic, and they came from the implementation rather than
from any paper.

**J.12 — What was not done, stated so it is not mistaken for clean.** B2, B3, C1, C2, C4, C5, A3 and
A4 were **not verified this session**. A4's AgACI aggregation rule and infinite-interval handling —
which the brief asks be compared like-for-like against our clamp — are **UNRESOLVED**, and the
OPERA reference implementation was not inspected. The `scores` Python package page failed to load
and nothing is claimed about it. F1–F4 were not obtained. The Farrington reweighting mechanism was
not read. Every one of these is an open item, and none of them is reported above as anything else.

---

*End of report 84. Staged bibliography: `brain/ledger/staged_references.bib`.*
