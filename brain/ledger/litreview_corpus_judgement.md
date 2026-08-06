# Literature review — corpus judgement (Step 1)

Written 2026-08-01. Inputs read: `brain/skills/autoresearchclaw/SKILL.md`,
`brain/knowledge/00_state_brief.md`, `brain/knowledge/02_prj93_pipeline_spec.md`,
`brain/ledger/citation_audit.md` (both passes), `brain/PRJ93_RULES.md`, and
`chapters/literature_review.tex` read once in full from Overleaf (authorised by
the phase prompt; `PRJ93_RULES.md` token discipline waived for the subject file
only, as in the citation audit).

**This is a gate document. Nothing has been added to Zotero, no chapter has been
modified, and nothing has been pushed to Overleaf.**

---

## 0. Tooling status — read this before trusting any verdict below

**NotebookLM verification was completed on the second attempt.** The first pass
failed on expired auth (a background `nlm login` timed out after 300s waiting on
an interactive browser sign-in). Phuong signed in; `refresh_auth` then validated,
and the candidates were loaded into notebook
`d565d5f0-9ad6-446f-9573-2316a2f8c0ca` and queried under an explicit
"say so plainly if the text does not establish it" instruction.

**Verification status per candidate — three classes, not one:**

| Candidate | NotebookLM | Primary source | Net |
|---|---|---|---|
| A1 Montero-Manso & Hyndman | **Verified, quoted to the sentence** | arXiv abstract | **SUPPORTED** |
| A2 Dixon, Wickens & McCarley | **Verified, full abstract incl. Applications line** | SAGE abstract | **SUPPORTED** |
| A4 Paleyes et al. | **Verified — but only the abstract, and it REFUSED the stronger claim** | arXiv abstract | **SUPPORTED, narrowed** |
| A3 Ancker et al. | **Could not be ingested** — PMC returned a reCAPTCHA wall, BMC / Springer / doi.org / EuropePMC all refused | PMC full text read directly, effect sizes quoted verbatim | **SUPPORTED (primary source, not notebook)** |
| A5 Wickens & Dixon | **Verified NEGATIVE** — notebook holds only a Taylor & Francis boilerplate landing page, no abstract, no body | T&F returned HTTP 403; Semantic Scholar empty | **UNVERIFIED** |

Two of these deserve to be read rather than skimmed.

**A4's narrowing is a real finding, not a formality.** I intended to cite Paleyes
et al. for the claim that benchmark research does not surface deployment
problems. NotebookLM's answer: "The provided text does **not** establish that
academic/benchmark research fails to surface these deployment problems… the
retrieved text consists only of the publisher landing page and the abstract."
The claim available is narrower — challenges catalogued from real case studies,
mapped to workflow stages, present at every stage. **The chapter will assert the
narrow version.** This is precisely the OVERSTATED failure mode the citation
audit found seven times, caught before it entered the draft.

**A5's negative is verified two ways**, which `SKILL.md` §6 requires before a
negative is recorded as fact: HTTP 403 at the publisher, and independently, the
notebook ingesting nothing but T&F navigation chrome. The 0.70 crossover figure
remains known to me only from search-engine snippets and is **not** citable.

The named skills `literature-search`, `literature-review-writer` and
`scientific-writing` **do not exist** in `.claude/skills/`, `~/.claude/skills/`
or `brain/skills/`. This is the same unresolved condition already recorded in
`PRJ93_RULES.md` §Writing standard. Gap-finding below was done by hand:
argument-by-argument audit of the chapter against the project's own results,
then targeted search for the missing warrant.

---

## 1. Verdict on the corpus as a whole

**The citation base is sound and the problem is not breadth.** 75 unique keys
across roughly 5,500 words is already dense for an MSc chapter, the citation
audit found zero MISSING-KEY and zero UNSUPPORTED across all 84 keys in the
three chapters, and the examiner record calls the chapter "the strongest artefact
in the project".

The defect is **distribution**, in three specific forms:

1. **The chapter cites nothing that governs the project's own methodological
   decisions.** W54's core charge — that no citation governs the choice of
   metric, the model-selection procedure, or the weather covariates — is only
   half-answered. The governing papers now exist in `ref.bib`, but every one of
   them is cited *only in the methodology chapter* or *nowhere at all*. A
   literature review that never sets up the decisions the methodology then
   makes is not doing the job the marking scheme pays for.
2. **The chapter does not predict its own negative results.** Three of the
   project's most defensible findings — S5 (group in-context learning does not
   help this estate), S2 (six folds ranked the served model fifth; 273 origins
   restored it to first), S6 (weather marginal) — arrive in the results chapter
   with no literature having anticipated them. W32 states the principle exactly:
   "A review that predicts its own negative result is a review that is doing
   work." Right now the review predicts the opposite in all three cases.
3. **The chapter asserts a contribution category it never supports.**
   §rw-synthesis concludes "The contribution is accordingly one of field
   instantiation rather than of method." No source is cited for field
   instantiation being a contribution at all. This is the weakest sentence in
   the chapter and it is the one carrying W24.

Everything below serves those three, plus two hygiene items.

---

## 2. Coverage gaps, with the evidence for each

**G-a. Local vs global forecasting.** §rw-rhythm argues throughout that
cross-series transfer relieves scarcity, citing `das_-context_2025`,
`zhou_context-driven_2025`, `liu_generative_2024` and `ansari_chronos-2_2025`'s
group-attention mechanism. S5 found cross-series learning does **not** help this
estate. The chapter has no theory of when globality pays, so the negative result
reads as a failure rather than as a prediction. The governing paper is absent.

**G-b. Ranking instability under small evaluation setups.** S2's headline —
six folds ranked the served Beer Hall model fifth, 273 origins restored it to
first — is a rank-stability finding. `hewamalage_look_2021` (*A Look at the
Evaluation Setup of the M5 Forecasting Competition*) is in `ref.bib`, uncited,
and proposes exactly the measure ("Rank Stability", "evaluates how much the
rankings of an experiment differ in between similar datasets, when the models
and errors are constant"). It also finds that "the main drivers of instability
are hierarchical aggregation and scaling" and that "scale normalization of the
M5 error measure results in less stability than other scale-free errors" — a
caution on RMSSE that bears directly on **G1**, and which the chapter currently
does not know exists while citing M5 approvingly for RMSSE two sentences away.

**G-c. Weather and exogenous covariates.** The chapter has no passage on
weather at all, yet S6 is a whole results section and W37 concerns a covariate
probe that reported a null as positive. `haben_short_2019` and
`hertel_explainable_2026` sit in `ref.bib`, cited nowhere, and are named in the
citation audit as "the two that would govern the weather-covariate choice".

**G-d. Intermittency is set up in the wrong chapter.** §rw-rhythm gives Croston
and the SBA correction a single subordinate clause. The classification
constants (`syntetos_categorization_2005`), their correction
(`kostenko_note_2006`), the hurdle/two-part models (`cragg_statistical_1971`,
`mullahy_specification_1986`) and the all-zero/cost argument
(`chatfield_all-zero_2007`) are all cited **only in the methodology**. Two of
the four Fatal/Major intermittency findings (W17, W23, W49) therefore land with
no prior warrant. `kolassa_evaluating_2016` (*Evaluating predictive count data
distributions in retail sales forecasting*) is in `ref.bib`, uncited, and is the
density-forecast counterpart to the whole argument.

**G-e. The asymmetric-cost claim rests on a source that does not make it.**
§rw-evaluation's load-bearing sentence attributes the compliance/reliance
asymmetry to Meyer. The citation audit's second pass found: "**Meyer never says
misses erode reliance.** He ties reliance to sensitivity ($d'$) and to operator
experience." The chapter's central conceptual claim — that false alarms are the
dominant cost — currently has no source that tests it. There is an empirical
paper that does, and it is not cited.

**G-f. No warrant for the contribution category.** As above. The chapter needs
a source establishing that deploying a method into a real operational setting
surfaces problems the benchmark literature does not, otherwise "field
instantiation" is an unsupported self-description.

---

## 3. PROPOSED ADDITIONS — 5 papers (4 verified, 1 conditional)

Each row: what it is, what job it does, exact verification evidence, and which
weakness it closes. **None is in Zotero** (checked by search).

### A1 — Montero-Manso & Hyndman (2021), *Principles and algorithms for forecasting groups of time series: locality and globality*, International Journal of Forecasting 37(4):1632–1653. DOI 10.1016/j.ijforecast.2021.03.004

- **Job.** Supplies the theory §rw-rhythm is missing and lets the review predict
  S5. The paper's point is not that global models fail — it is that globality is
  **not a similarity assumption**: "Global methods are not more restrictive than
  local methods, both can produce the same forecasts without any assumptions
  about similarity of the series." Globality is a complexity/regularisation
  trade whose payoff scales with the size of the group. On an estate of three
  series there is no group to exploit, so S5's negative becomes the predicted
  outcome of a stated principle rather than a disappointment.
- **Verified in NotebookLM**, quoted to the sentence, plus "For groups of
  similar time series, global methods outperform the more established local
  methods" and "Global models can succeed in a wider range of problems than
  previously thought." **The decisive sentence, which the first pass missed and
  the notebook surfaced:** "The complexity of local methods grows with the size
  of the set while it remains constant for global methods. **In large datasets**,
  a global algorithm can afford to be quite complex and still benefit from
  better generalization." The generalisation benefit is explicitly a
  *large-dataset* argument. Three venues is not a large dataset, so S5's null is
  what the authors' own bound predicts — a much stronger and more honest use
  than the first pass had.
- **Closes.** G-a; gives W54 a citation governing the transfer design; converts
  S5 from an unexplained null into a predicted one.
- **Refereed journal, not a preprint** — improves the density figure in §6.

### A2 — Dixon, Wickens & McCarley (2007), *On the independence of compliance and reliance: are automation false alarms worse than misses?*, Human Factors 49(4):564–572. DOI 10.1518/001872007X215656

- **Job.** Supplies the empirical asymmetry §rw-evaluation asserts and Meyer does
  not establish. This is the paper that tests the claim.
- **Verified in NotebookLM**, verbatim: "False alarm—prone automation hurt
  overall performance more than miss-prone automation. False alarm—prone
  automation also clearly affected both operator compliance and reliance,
  whereas miss-prone automation appeared to affect only operator reliance."
  Conclusion: "Compliance and reliance do not appear to be entirely independent
  of each other." Method: "Thirty-two undergraduate students". **The notebook
  also surfaced the Applications line, which is the most quotable sentence in
  the paper for this chapter:** "False alarms appear to be more damaging to
  overall performance than misses, and designers must take the
  compliance-reliance constructs into consideration."
- **Closes.** G-e, and it **repairs the OVERSTATED verdict on
  `meyer_conceptual_2004`** rather than papering over it: Meyer keeps the
  compliance/false-alarm limb he does support, Dixon et al. carries the
  asymmetry, and the independence caveat is stated honestly.
- **Caveat to carry into the prose.** n = 32 undergraduates on a synthetic
  monitoring task. The chapter must not present this as a field result.

### A3 — Ancker, Edwards, Nosal, Hauser, Mauer & Kaushal (2017), *Effects of workload, work complexity, and repeated alerts on alert fatigue in a clinical decision support system*, BMC Medical Informatics and Decision Making 17:36. DOI 10.1186/s12911-017-0430-8

- **Job.** Turns alert fatigue from an assertion into a measured quantity, in a
  deployed professional setting rather than a lab. §rw-evaluation currently
  sources alert fatigue to `tang_proagentbench_2026`, a 2026 preprint stating it
  as a design motivation, not a measurement.
- **Verified at primary source, NOT in NotebookLM.** PMC5387195 full text read
  directly, verbatim: "Likelihood of reminder acceptance dropped by 30% for each
  additional reminder received per encounter, and by 10% for each five
  percentage point increase in proportion of repeated reminders." Retrospective
  cohort, 112 ambulatory primary care clinicians, January 2010 – June 2013.
  **Notebook ingestion failed on all five routes tried** (PMC → reCAPTCHA wall;
  BMC, Springer, doi.org, EuropePMC → refused). Recorded as a tooling limit, in
  the same class as the eleven keys the citation audit's second pass had to take
  to Zotero because the notebook could not surface them. If the notebook copy is
  wanted for the verification log, the PDF must be fetched to Zotero first and
  uploaded as a file source.
- **Closes.** G-e; gives the cost-asymmetry argument a real effect size; and it
  is a **field** measurement, which supports G-f by example.
- **Caveat.** Different domain (clinical). Must be cited as a transferable
  mechanism, not as a hospitality result.

### A4 — Paleyes, Urma & Lawrence (2022), *Challenges in deploying machine learning: a survey of case studies*, ACM Computing Surveys 55(6), Article 114. DOI 10.1145/3533378

- **Job.** Supplies the warrant for the contribution category. The chapter claims
  field instantiation is a contribution; this survey is the source establishing
  that deployment surfaces problems benchmark work does not.
- **Verified in NotebookLM — and narrowed by it.** Abstract confirmed verbatim:
  the survey "reviews published reports of deploying machine learning solutions
  in a variety of use cases, industries and applications", and "practitioners
  face issues at each stage of the deployment process". **But the notebook
  explicitly refused the stronger claim I wanted:** "The provided text does not
  establish that academic/benchmark research fails to surface these deployment
  problems." Only the abstract and landing page are retrievable, not the body.
  **The chapter must therefore claim only the narrow version** — that deployment
  challenges are catalogued from real case studies and occur at every workflow
  stage — and must not assert that benchmark work is blind to them.
- **Note.** The two sources disagree on the volume/article number (ACM DL renders
  55(6) art. 114; one secondary listing says 55(11) art. 242). **Resolve against
  the DOI before this goes in `ref.bib`.**
- **Closes.** G-f, and it is the single most direct answer to W24 — it converts
  "field instantiation" from self-description into a recognised contribution
  type with a citation behind it.

### A5 (CONDITIONAL) — Wickens & Dixon (2007), *The benefits of imperfect diagnostic automation: a synthesis of the literature*, Theoretical Issues in Ergonomics Science 8(3):201–212. DOI 10.1080/14639220500370105

- **Job.** Would give §rw-evaluation a hard threshold: a synthesis reporting a
  reliability "crossover point" of 0.70 below which unreliable automation is
  worse than no automation. That is a directly quotable bar for the project's
  own agent.
- **NOT VERIFIED — and the negative is confirmed two independent ways**, which is
  what `SKILL.md` §6 requires before a negative is recorded as fact. (i) Taylor &
  Francis returned HTTP 403 to a direct fetch and Semantic Scholar returned an
  empty page. (ii) Loaded into NotebookLM, the source yielded **only** T&F
  navigation chrome and copyright boilerplate — "There is no retrievable body or
  abstract text for this source in the provided notebook." The junk source was
  deleted from the notebook rather than left to pollute future queries.
- The 0.70 figure and the "20 studies / 35 data points" basis are known to me
  **only from search-engine snippets**. Not citable.
- **Recommendation.** Approve *acquisition* only, or defer entirely. It goes into
  Zotero, its full text is read there, and it is cited **only if the 0.70 figure
  verifies against the PDF**. If it does not verify it is dropped and nothing in
  the chapter depends on it. **A2 and A3 already carry the argument without it**,
  so this is an enhancement, not a dependency.

---

## 4. PROPOSED ACTIVATIONS — papers already in `ref.bib` doing no work

These are not acquisitions. They are already in the library; the proposal is to
**cite them in the literature review**, which is still gate 2 ("adding a cited
paper"). Ranked by consequence.

| Key | Status now | Job in the rewritten chapter | Closes |
|---|---|---|---|
| `hewamalage_look_2021` | in `ref.bib`, **uncited anywhere** | Rank stability; aggregation and scaling as the drivers of ranking instability; the caution on RMSSE's scale normalisation | G-b, G1 evidence, predicts S2 |
| `haben_short_2019` | in `ref.bib`, **uncited anywhere** | Governs the weather-covariate choice at low aggregation | G-c, W54 |
| `hertel_explainable_2026` | in `ref.bib`, **uncited anywhere** | Covariate-informed TSFMs; the weather-attribution counterpart | G-c, W37 |
| `kolassa_evaluating_2016` | in `ref.bib`, **uncited anywhere** | Proper scoring rules for low-count retail demand | G-d, G1/G2 |
| `syntetos_categorization_2005` | methodology only | The ADI/CV² classification the whole L1 argument turns on | G-d, W17 |
| `kostenko_note_2006` | methodology only | The corrected constants and the SBA selection rule | G-d, W23 |
| `chatfield_all-zero_2007` | methodology only | Lowest error ≠ lowest cost on lumpy demand; the all-zero result | G-d, **G2** |
| `hansen_model_2011` | methodology only | Model confidence sets; "uninformative data yield a MCS with many models" | W36 — the stated reason Distinction is "Not met" |
| `diebold_comparing_1995` + `harvey_testing_1997` | methodology only | Comparison testing and its small-sample degeneracy | W6, W36 |
| `cragg_statistical_1971`, `mullahy_specification_1986` | methodology only | Two-part/hurdle models for the occurrence gate | G-d, W19 |
| `brigato_there_2025` | in `ref.bib`, **uncited anywhere** | Slight changes to experimental setup shift what looks like state of the art | G-b |
| `tibshirani_conformal_2019` | in `ref.bib`, **uncited anywhere** | Weighted conformal under covariate shift — sits between Barber and the exchangeability discussion | optional |

**Note on `hansen_model_2011`, `diebold_comparing_1995`, `harvey_testing_1997`.**
Activating these three in the literature review is the single highest-value move
on the list against the marking criteria, because W36 names the absent
alternative-comparison as the explicit reason Distinction is not met, and the
chapter currently contains no passage at all on how competing forecasts should
be compared.

---

## 5. PROPOSED DEMOTIONS AND DROPS — currently cited, doing no argumentative work

The chapter's own prose concedes most of these. Recommendation is **demote**
(keep the key, fold into a single grouped citation with no individual claim
attached) rather than delete, except where marked DROP.

| Keys | Where | What they currently do | Recommendation |
|---|---|---|---|
| `garza_timegpt-1_2024`, `rasul_lag-llama_2024`, `goswami_moment_2024`, `woo_unified_2024`, `liu_moirai_2026` | §rw-rhythm ¶3 | Five citations for one sentence that "fill[s] out the design space without changing the central premise" | **Demote** to one grouped citation. Also fixes the audit's presentation defect: Moirai 1.0 is cited unnamed as "masked-encoder" while the name attaches to the 2.0 paper |
| `liu_proactiveeval_2025`, `yang_contextagent_2025`, `yang_fingertip_2025` | §rw-surfacing ¶3 | The chapter itself says they "map the landscape without supplying a precedent" | **Demote** to one grouped citation, one clause |
| `schick_toolformer_2023`, `shinn_reflexion_2023` | §rw-surfacing ¶1 | Explicitly declared "not where the open problem lies" | **Demote**; keep `yao_react_2022` as the named primitive |
| `koutsandreas_selection_2022` **or** `kolassa_why_2020` | §rw-rhythm ¶7 | Identical claim, stated twice back to back | **Drop one.** Recommend keeping `kolassa_why_2020` (the audit found it exact and it names the mean/median/(−1)-median trio) |
| `gim_evaluation_2023` | §rw-deviation ¶2 | One clause, subordinate to `bhattacharya_towards_2024` making the same point | **Demote** into the same parenthesis |
| `truong_ruptures_2018` | §rw-deviation ¶1 | Software citation only | **Move to methodology**, where the library is actually used |
| `hossain_comparative_2025` **or** `chae_value_2024` | §rw-rhythm ¶2 | Both establish "simple methods are hard to beat" | **Keep both** — they argue it from opposite directions and the paragraph says so. No change. |

**One deletion, not a demotion — the WRONG-SOURCE clause.** "TimesFM itself
beats language-model prompting by a wide margin" sits inside a
`tan_are_2024`-attributed passage. Tan does not evaluate TimesFM. In the current
Overleaf text the clause already carries `\citep{das_decoder-only_2024}`, so the
audit's fix appears to have landed. **Verify this in the rewrite and leave it
attributed to Das.**

---

## 6. Hygiene — three items, no gate needed

1. **`noauthor_full_nodate` should be deleted from `ref.bib`.** Title "Full
   article: On the selection of forecasting accuracy measures", no author, no
   year, `@online`; it is a Zotero web-capture duplicate of
   `koutsandreas_selection_2022`. Uncited, so it breaks nothing today, but it
   would compile as "[n.d.]".
2. **`ding_proactor_2026` is typed `@article` with no `journaltitle`** — only an
   OpenReview forum URL. It will render as a journal article with no venue.
   ProActor is cited in §rw-surfacing as a substantive result. Given W35, retype
   it honestly (`@misc`/`@unpublished` with the OpenReview URL) or confirm the
   venue. Several other entries use `eventtitle` where biblatex expects
   `booktitle` — cosmetic, but check the rendered bibliography once.
3. **Preprint density (W35), measured.** `ref.bib` now holds **114 entries**
   (111 at the 07-30 audit). Of the **75 keys the literature review cites, 19
   are arXiv-only `@misc` entries, and 11 of those are dated 2025 or 2026**:
   `staufer_2025_2026`, `hoo_tables_2026`, `trinh_hil-bench_2026`,
   `hu_memory_2026`, `gulati_ask_2026`, `fu_prism_2026`,
   `liu_proactiveeval_2025`, `tang_proagentbench_2026`, `stocker_gentle_2025`,
   `liu_moirai_2026`, `ansari_chronos-2_2025`. W35's charge — "ten or more
   load-bearing citations… are 2025–26 preprints" — **verifies exactly at 11**,
   and the chapter flags it once, in a subordinate clause in §rw-surfacing ¶3.
   The rewrite should state the figure, not the impression. Four of the five
   proposed additions are refereed journal or ACM-survey work, which moves the
   ratio in the right direction.

---

## 7. What is NOT proposed, and why

- **No conformal additions** (Lei et al. 2018, Romano et al. 2019 CQR, Vovk
  2005). The conformal section is the best-sourced in the chapter — the audit
  called `xu_conformal_2021` "unusually precise paraphrase" and W20 genuinely
  closed. Adding here is padding.
- **No sports-fixture / events literature**, despite the 11 July England QF
  falsification being the project's central result. Searched; what exists is
  about stadium-adjacent trade and televised-match footfall, none of it close
  enough to a three-venue rural estate to bear weight. Recording this as a
  **deliberate non-addition with a stated reason**, not an oversight — the
  falsification is better defended as an honest negative than propped on a
  distant analogue.
- **No new weather paper** (Badorf & Hoberg 2020 was the candidate).
  `haben_short_2019` and `hertel_explainable_2026` are already owned and are the
  papers W54 names. Acquiring a third before the two on the shelf are cited
  would repeat exactly the failure the audit identified: "Acquisition alone does
  not close it."
- **No cull of the 27 uncited `ref.bib` entries** beyond `noauthor_full_nodate`.
  Uncited entries are inert; deleting them costs time and risks the `ref.bib`
  hazard in W48 for no marks.
- **No change to the Chronos-2, CUSUM, PRISM or CPTC passages.** W20, W21, W30
  and W31 are recorded closed and the audit verified them to theorem numbering.
  Leave them.

---

## 8. Net effect if all of §3 and §4 are approved

| | Before | After |
|---|---|---|
| Keys cited in the literature review | 75 | ~86 (+5 new, +12 activations, −1 duplicate claim) |
| 2025–26 arXiv-only preprints among them | 11 | 11 (unchanged in count, lower in share) |
| Refereed journal/survey sources | — | +4 |
| Project decisions with a governing citation *in the review* | metric ✗, selection ✗, weather ✗ | metric ✓, selection ✓, weather ✓ |
| Negative results the review anticipates | 0 of 3 | 3 of 3 (S5, S2, S6) |
| Contribution category with a source behind it | ✗ | ✓ |

---

*Step 1 complete. Awaiting the gate. No Zotero write, no chapter edit, no
Overleaf push has been made.*
