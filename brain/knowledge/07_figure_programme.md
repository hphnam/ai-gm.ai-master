# 07 · Figure programme — specification for the dissertation's floats

**Status: SPECIFICATION ONLY. Nothing built, nothing run, nothing pushed to Overleaf.**
Every item below is a gate item awaiting Phuong's approval of chart types and reruns
(`PRJ93_RULES.md`, Human gates: "choosing final figure types", "rerunning any experiment").

Written 2026-08-06 under `PRJ93_RULES.md`. Basis: `knowledge/05_paper_architecture.md`
(float dispositions §2.7, caption convention §3.6, approvals §7 including U1/U2),
`knowledge/06_research_questions.md` (RQ1–RQ5 and the §10 prompt blocks),
`ledger/numbers_audit.md` + `numbers_audit_resolutions.md`, `ledger/code_vs_paper.md`,
the Phase 6 result files `log/60`–`log/75`, and the ~30 per-script artefacts beside the
code. Corpus conventions verified by three NotebookLM queries against notebook
`d565d5f0-9ad6-446f-9573-2316a2f8c0ca` on 2026-08-06.

**Estate: three venues — Beer Hall, Ellel, Two River Taps.** Every per-venue figure is
three panels, facets or series. See §5 for a fourth location found on disk and NOT acted on.

---

## 0. The float-slot arithmetic, and a correction to how the headroom was read

`05_paper_architecture.md` §2.1 budgets **1,200 caption words for 20 body floats**. §3.6
(approved as A6) caps **every** caption at a 15-word title plus a ≤45-word body — 60 words,
with no exception written for any float.

§4.4 then records that the thirteen surviving body floats consume about 780 words, leaving
**~420 words of headroom** reserved for "the figure R69 requires" and for converting a
demoted table into a figure.

**That headroom is seven float slots at 60 words each, not one 420-word caption.**
420 ÷ 60 = 7, and 13 + 7 = 20, which reproduces §2.1's "20 floats" line exactly. Reading it
as a single oversized caption for the R69 figure would breach A6 and would spend the entire
headroom on one float. This programme therefore specifies **exactly seven new body floats**
and treats the budget as closed at twenty.

| | Floats | Caption words |
|---|---|---|
| Existing body floats (§2.7 dispositions) | 13 | 780 |
| New body floats (this programme) | **6** | **360** |
| **Body total** | **19** | **1,140** |
| **Caption reserve, unassigned** | — | **60** |
| **Against the budget line** | | **1,200** |
| Appendix floats | unlimited | **0 counted** (appendices are outside HC1, §0 of 05) |

### Why nineteen and not twenty — the reserve decision

Twenty floats at exactly 1,200 words assumes **every** caption lands precisely on the 60-word
cap. One caption needing 61 words would force a compensating cut somewhere else, and that
negotiation would land late in 8C when the floats are already built.

**Decision: nineteen body floats, with the twentieth slot held as a 60-word caption reserve.**
The reserve is not assigned to any float and is not available to prose. It absorbs the
overruns that a 45-word caption body will produce on the two or three most technical floats —
`tab:coverage` and `fig:blocks` being the likeliest, since both must name a basis, a sample
size and a withheld limb.

This is a second line of defence, not the only one: §2.1 already carries a separate
**200-word document-level Reserve** for abstract and caption overrun. Spending the caption
reserve first keeps that 200 intact for the abstract, which is composed last and is the item
most likely to need it.

**The float demoted is F2, the rolling-origin schematic**, moved to Appendix C at zero cost.
It is the cheapest of the seven to lose: it was the only one with a net word cost of roughly
zero (+5), so demoting it saves no prose either way, and R69 remains satisfied twice over in
the Methods body by F1 and F3, plus three pseudocode floats in Appendix C. Its content —
120-day minimum train, one-day step, seven-day horizon, overlapping windows — compresses to a
sentence in 3.6 with a pointer, and the reader who needs the geometry is the reader auditing
reproducibility, who is already in Appendix C.

**Consequence that shapes everything below: appendix space is free and body space is full.**
Pseudocode, the screening flow, the deployment architecture and every robustness float go to
appendices at zero cost against HC1. Only work that must be read to follow the argument
competes for the seven body slots.

---

## 1. The thirteen existing body floats — presentation confirmed

These are approved and not reopened. Recorded here only to state the presentation each
carries and to fix its caption cost at 60.

| Float | Ch | RQ | Presentation | Status |
|---|---|---|---|---|
| `fig:gap-map` | 2 | — (gap) | Categorical grid, systems by intervention policy × grounding of the score | Built (`drafts/figures/gap_map.pdf`) |
| `tab:venues` | 3.1 | — | Table, 3 rows | Live on Overleaf, post-audit values (Ellel 386, TRT 5.92) |
| `tab:bases` | 3.2 | RQ2 | Table, 4 bases | Needs bootstrap CIs added — see §4 blocker B4 |
| `fig:ladder` | 4.1 | RQ1 | Per-fold loss distribution, 3 panels, box + IQR + 5–95 whisker + mean diamond, colour = MCS retention | **Built** (`drafts/figures/make_ladder_figure.py`) |
| `tab:mcs` | 4.1 | RQ1 | Table, retention per venue | Data complete |
| `tab:intermittency` | 4.2 | RQ2 | Table, p and v under two constant sets | Data complete |
| `tab:group` | 4.3 | RQ3 | Table, paired intervals | **Blocked** — see B1 |
| `tab:weather` | 4.3 | RQ3 | Table, 5 arms × 3 venues | **Blocked** — see B3 |
| `tab:coverage` | 4.4 | RQ4 | Table, coverage + Clopper–Pearson + power | **Blocked** — see B2 |
| `tab:exchangeability` | 4.4 | RQ4 | Table, implied vs published coverage | Data complete, never audited |
| `tab:winkler` | 4.4 | RQ4 | Table, 5 methods vs incumbent | Data complete |
| `tab:vuspr` | 4.5 | RQ5 | Table, event kind × venue | Data complete (markdown only) |

**`fig:ladder` does not regenerate `tab:ladder`.** They are different objects on different
data: `fig:ladder` reads `eval/fold_vectors_L1_*.json` at 273/260/205 origins on the ruled
basis; `tab:ladder` is the historical six-fold committed gate on the superseded basis, going
to Appendix E unregenerated under A11. No figure in this programme depends on a re-run
ladder.

---

## 2. The seven new body floats

Each carries: the RQ it serves, the reader's takeaway, the chart type, the rejected
alternative and why, the corpus grounding, the medium, and its caption and prose cost.

### F1 · `fig:blocks` — the four-block split · **highest priority**

- **Section** Methods 3.7 (the split is described in `sec:intermittency` today; §2.1 assigns
  it to 3.7 and §2.7 demotes its *mechanics prose* to Appendix C — the figure is what makes
  that demotion survivable)
- **RQ** RQ2 and RQ4 (it is the leakage discipline both rest on)
- **Takeaway** Four disjoint spans walking back from the calendar end in eight-week blocks —
  fit, validate, calibrate, test — and which job each block does exactly once. The forecaster
  is fitted strictly before the calibration block, and that same fitted forecaster produces
  both the calibration residuals and the test forecasts. That disjointness is the source of
  the conformal guarantee, not a technicality.
- **Chart type** Horizontal timeline bar, one row per block, time on the x-axis with real
  dates, annotated with n per block and with the job each block performs. A second row above
  shows the superseded two-way split so the reader sees what changed and why two of the four
  jobs were previously done on data the forecaster had already seen.
- **Rejected alternative** *Nested boxes / a flowchart.* Rejected because the defect being
  fixed is **temporal** — the old design let a block do two jobs, and only a time axis shows
  that the calibration block sits strictly after the fit span. A flowchart shows dependency
  but not ordering, which is the entire content of the correction.
- **Corpus grounding** Kaas et al. (2026), *Probabilistic Low-Voltage Peak Load Forecasting*,
  **Fig. 6** — a horizontal block diagram with time on the x-axis distinguishing training,
  ignored and unseen test spans. Also Hewamalage et al. (2023), *Forecast Evaluation for Data
  Scientists*, **Fig. 10**, which contrasts two partitioning strategies as two stylised
  horizontal timelines — precisely the before/after construction used here.
- **Medium** TikZ. It is a schematic of a design with no measured quantity on either axis
  beyond dates; TikZ typesets in the document's own font and keeps the labels selectable, and
  there is no data series for matplotlib to draw.
- **Caption** 60 words. **Prose** Replaces ~250 words in `sec:intermittency` (the four-span
  paragraph and the leakage post-mortem) with a ~25-word cross-reference. **Net −165 words
  against HC1.**

### F2 · `fig:origins` — the rolling-origin evaluation protocol · **DEMOTED to Appendix C**

**Moved out of the body by the reserve decision at §0.** Specification retained in full — the
figure is still built, still to publication standard, and its caption no longer counts.
Methods 3.6 carries a one-sentence statement of the protocol constants plus a pointer.

- **Section** ~~Methods 3.6~~ → **Appendix C** · **RQ** RQ1
- **Takeaway** The L1 ladder is evaluated on an expanding-window rolling origin at a one-day
  step: 120-day minimum train, seven-day horizon, 273/260/205 origins by venue, windows
  overlapping. The overlap is why the block bootstrap uses a block length of seven and why
  the origins are not independent observations.
- **Chart type** Staircase of horizontal bars — successive training windows expanding to the
  right, each followed by its seven-day forecast block, with the origin count per venue
  annotated and the overlap made visible by drawing consecutive origins.
- **Rejected alternative** *A table of the protocol constants.* Rejected because the
  non-independence of overlapping windows is a geometric fact that a constants table states
  and a staircase shows; the block-bootstrap justification in 3.6 currently has to be argued
  in prose because nothing depicts the overlap.
- **Corpus grounding** Meyer et al. (2026), *Rethinking Evaluation in the Era of Time Series
  Foundation Models*, **Fig. 1(a)** — the rolling-origin scheme as a staircase of stacked
  timelines with training windows shifting right and forecast targets immediately following.
- **Medium** TikZ, for the same reason as F1. The per-fold boundaries are real and read from
  `eval/fold_vectors_L1_*.json` `folds[]`, so the drawing is to scale rather than schematic.
- **Caption** 60 words. **Prose** Replaces ~80 words of protocol narration in 3.6.
  **Net ≈ +5 words.** Justified on R69 and on the block-bootstrap argument, not on budget.

### F3 · `fig:pipeline` — the method pipeline

- **Section** Methods 3.1 · **RQ** All five (it is the map of the chapter)
- **Takeaway** How a Square export becomes an intervention: daily revenue frame → feature
  construction with the availability lead → the model ladder and its gate → the model
  confidence set → the conformal band → the deviation detector → the intervention layer,
  with the four-block split and the rolling origin marked where each applies.
- **Chart type** Box-and-arrow process diagram, left to right, with the Methods subsection
  number printed in each block so the figure doubles as the chapter's structure.
- **Rejected alternative** *Two separate figures — a system/deployment architecture and a
  method pipeline.* Rejected on cost: they share most of their boxes, and two floats would
  spend 120 caption words to draw one flow twice. The **deployment** architecture (Postgres,
  the agent runtime, WhatsApp delivery) is product engineering rather than research method,
  so it goes to **Appendix C at zero cost** (A-F3) and the body carries the method only.
- **Corpus grounding** Schmidt et al. (2022), *Machine Learning Based Restaurant Sales
  Forecasting*, **Fig. 8** — a box-and-arrow pipeline running raw collected data → scaling →
  feature test → model training → operational testing. It is the closest analogue in the
  corpus: same domain, same object. For the intervention limb, Lu et al. (2024) *Proactive
  Agent* and Fu et al. (2026) *PRISM* both draw the same block-diagram convention.
- **Medium** TikZ (`positioning`, `arrows.meta`). A process diagram with no data.
- **Caption** 60 words. **Prose** Saves ~60 words of orientation in 3.1. **Net ≈ 0.**

### F4 · `fig:drift` — residual-scale drift and the exchangeability violation

- **Section** Results 4.4 · **RQ** RQ4, second limb ("what property of the data accounts for
  the shortfall")
- **Takeaway** The conformity scores are not exchangeable, and the mechanism differs by
  venue. At Ellel the drift sits almost entirely on calendar-open days that did not trade —
  1,037 of 1,300 — where the residual equals the forecast by identity. That decomposition is
  the cause identification, and it is currently prose with no float at all.
- **Chart type** Three panels, one per venue, plotting the conformity score against time with
  a rolling median and the calibration quantile overlaid; Ellel's panel additionally
  distinguishes traded from false-open days by marker, which is where the decomposition
  becomes visible.
- **Rejected alternative** *A bar chart of the four time-quartile means.* Rejected because
  four bars per venue cannot separate a drift in level from a change in composition, and
  composition is the finding — `drift_false_open_only` at ρ = +0.367 against
  `drift_traded_only` is a decomposition, not a trend.
- **Corpus grounding** Zaffran et al. (2022), *Adaptive Conformal Predictions for Time
  Series*, **Appendix A.5 and Fig. 11**, which explicitly prescribes plotting the intervals
  around the **conformity scores** rather than the observed values, on the grounds that "the
  scores are what truly determine the conformal behaviour". Xu & Xie (2023), *Sequential
  Predictive Conformal Inference*, **Fig. A.2**, supplies the PACF companion diagnostic for
  serial dependence in the scores.
- **Medium** matplotlib. Real measured series, three panels, independent y-axes.
- **Caption** 60 words. **Prose** Lets 4.4 compress the drift-cause narrative by ~150 words —
  4.4 is the worst-squeezed section in the chapter at 1,400 against 4,275 current.
  **Net −90 words.**
- **REQUIRES A RUN** — R2. Per-day conformity scores are not persisted; the finest grain on
  disk is a four-bucket time quartile.

### F5 · `fig:validity-efficiency` — coverage against interval width

- **Section** Results 4.4 · **RQ** RQ4
- **Takeaway** Why no interval method displaces the incumbent: the five methods trade
  coverage against width along a frontier rather than dominating one another. The Winkler
  table gives the verdict; this gives the reason.
- **Chart type** Scatter of empirical coverage (x) against mean interval width (y), one
  marker per method, faceted by venue, with a vertical rule at the nominal 0.90 and the
  incumbent Mondrian arm marked. Methods of the same family joined so the reader can track
  the adaptive pair against the static pair.
- **Rejected alternative** *A grouped bar chart of Winkler scores.* Rejected because Winkler
  is already `tab:winkler` and a bar chart of the same scalars adds ink without adding a
  reading; the scatter shows the two components the score compounds, which the score itself
  conceals.
- **Corpus grounding** Zaffran et al. (2022), **Figs. 6, 15 and 16** — "in order to
  simultaneously assess validity and efficiency, we represent on the same graph the empirical
  coverage and average median length", with a vertical dotted line at the target miscoverage
  rate and markers of one method joined. This is the corpus's own prescribed chart for
  exactly this comparison.
- **Medium** matplotlib, three facets.
- **Caption** 60 words. **Prose** Lets 4.4 drop ~100 words of per-method width commentary.
  **Net −40 words.**
- **Data sufficient** — `eval/interval_calibration_L1.json` carries `coverage`, `cp_lo`,
  `cp_hi` and `mean_width` per venue × level × method. No run.

### F6 · `fig:sensitivity` — detection catch rate against deviation magnitude

- **Section** Results 4.5 · **RQ** RQ5
- **Takeaway** Detection performance is a dose–response, not a scalar. Catch rate rises with
  the magnitude of the deviation, and the operating point that matters to an operator is
  where the curve crosses a usable rate — which a single VUS-PR figure cannot express.
- **Chart type** Catch rate against injected magnitude z ∈ {1, 1.25, 1.5, 2, 3, 4}, one line
  per event kind, faceted by venue, with 95 per cent intervals as bands and n annotated per
  point.
- **Rejected alternative** *A line plot of the cost sweep over β.* Rejected on the data: the
  sweep is degenerate in a way that makes a chart actively misleading. Misses (124) and false
  alarms (8) are **constant across all four ratios** because the detector runs at a fixed
  threshold; only the weighted cost moves, so the "sweep" plots a linear reweighting of two
  constants. `transcription_pack.md` §D-F5 says so explicitly. The degeneracy stays a
  reported sentence, per §7.1 of 06, and is not dressed as a curve.
- **Corpus grounding** Bhattacharya et al. (2024), *Towards Unbiased Evaluation of Time-series
  Anomaly Detector*, **Figs. 5 and 6** — metric behaviour plotted against precision and recall
  in faceted panels binned to hold data cardinality roughly equal, which is the convention for
  detection performance under sparse positives. Siffer et al. (2017), **Fig. 7**, supplies the
  practice of printing the swept parameter value at each plotted point.
- **Medium** matplotlib, three facets.
- **Caption** 60 words. **Prose** Adds a finding rather than replacing prose. **Net +60
  words.** Justified on RQ5: the chapter's answer to "does detection perform well enough to
  justify surfacing" currently rests on one scalar per cell.
- **REQUIRES A RUN** — R3. `eval/agent_eval.py` emits markdown only; there is no JSON in the
  entire detection family.

### F7 · `fig:nulls` — paired differences for the weather and pooling arms

- **Section** Results 4.3 · **RQ** RQ3
- **Takeaway** RQ3's answer is no on both limbs, and the nulls are measured rather than
  merely unfound: every paired difference's interval straddles zero. This is the figure that
  stops a null reading as an absence of effort.
- **Chart type** Forest plot of paired mean differences with 90 per cent bootstrap intervals,
  faceted by venue, with a rule at zero, covering the weather arm pairs and the pooling arm
  pairs in one figure with a family separator. Intervals excluding zero — if any — marked.
- **Rejected alternative** *Two grouped bar charts of mean loss, one per experiment.* Rejected
  because bars of near-identical means invite the reader to rank them by eye, which is the
  exact error the null is asserting cannot be made; and because bar charts of small-n
  summaries are the practice `scientific-visualization` and Brigato et al. both warn against.
- **Corpus grounding** Ansari et al. (2025), *Chronos-2*, **Figs. 12–19** — pairwise
  comparisons with 95 per cent confidence intervals printed against each estimate and cells
  whose interval straddles the no-difference boundary shaded neutrally, so equivalence is
  communicated as a result. Hollmann et al. (2025), **Fig. 4c/d**, does the same with explicit
  error bars and printed test p-values. Brigato et al. (2025) §4.4 supplies the warning
  against shared absolute scales that motivates faceting by venue rather than pooling.
- **Medium** matplotlib, three facets, shared x (paired difference is a difference in the same
  unit within a venue; the facet keeps venues from being compared across).
- **Caption** 60 words. **Prose** Lets 4.3 stop narrating fifteen near-identical numbers;
  saves ~180 words. **Net −120 words.**
- **Data sufficient** — `eval/weather_basis_mcs.json` and `eval/group_icl_mcs.json` both carry
  `paired_bootstrap[]` = `{pair, mean_delta, ci_lo, ci_hi, excludes_zero}`. No run, **subject
  to blocker B3.**

---

## 3. Appendix floats — free against HC1

Captions in appendices do not count (05 §0). These are specified because R65 and HC56 are
free marks, not because they compete for space.

| # | Float | Appendix | Purpose | Medium | Grounding |
|---|---|---|---|---|---|
| A-F1 | Corpus screening flow | **B** | **R65, currently unmet.** Records identified → screened → excluded with reasons → included | TikZ | **Corpus is silent** — see §6 |
| A-F2 | `alg:conformal` — split conformal with the Mondrian variant and the small-n substitution | C | HC56 (pseudocode preferred), R69 | `algorithm2e` | Angelopoulos & Bates Alg. 1–2; Zaffran et al. Alg. 2; Sun & Yu Alg. 1; Siffer et al. Alg. 1–2 |
| A-F3 | `alg:adoption` — the one-standard-error adoption rule and its three fail-closed conditions | C | The rule is pre-registered and its failure modes are load-bearing | `algorithm2e` | As above |
| A-F4 | `alg:detection` — band breach, standardised residual, CUSUM | C | R69 for 3.8 | `algorithm2e` | Siffer et al. Alg. 1 (SPOT) |
| A-F5 | Deployment architecture | C | The field-instantiation contribution; displaced from F3 | TikZ | Lu et al. (2024); Fu et al. (2026) PRISM |
| A-F6 | Injection protocol schematic | D | Control vs realistic arms drawn rather than narrated | TikZ | Liu & Paparrizos (2024) Figs. 4–5 |
| A-F7 | `fig:origins` — rolling-origin schematic (**demoted from the body**, §0) | C | R69, and the block-bootstrap overlap argument in 3.6 | TikZ, to scale from `folds[]` | Meyer et al. (2026) Fig. 1(a) |

**Methods 3.11, the knowledge-gap signal.** Serves no research question by approved decision
A17, and 06 §10 pre-records that it is not to be flagged as a defect. Disposition: **no body
float.** A body float would spend 60 of the twenty counted caption words on material that
answers nothing, and 4.5's 800 words already carry it as a specification-level deliverable.
If a float is wanted it would be a twelve-clusters-by-density chart in Appendix C, free
against HC1. Recommended: none.

**Numbering correction, 2026-08-07.** This paragraph previously assigned that hypothetical
float the label **A-F7**, which the §3 table had already given to the demoted rolling-origin
schematic. Two different floats, one identifier, in one file. It surfaced because F3's
annotation cross-references the rolling-origin figure and the reference had to be resolved to
something. **A-F7 is the rolling-origin schematic.** The 3.11 float is not recommended and
carries no number, because a number reserved for a float nobody is building is a number that
gets reused. In the chapter the reference is `\ref{fig:origins}` — a LaTeX label, not a
printed identifier — so nothing downstream depends on the appendix ordering.

---

## 4. Blockers — resolved before a figure is built, not after

From `numbers_audit.md`, `numbers_audit_resolutions.md` and `code_vs_paper.md`.

| # | Blocker | Verdict | Affects | What clears it |
|---|---|---|---|---|
| ~~**B0**~~ | ~~Two live rulers disagree by 1.2417× at the Beer Hall, 1.1361× at TRT~~ | **CLOSED — see the correction below. Not a blocker.** | — | Already ruled and executed |

### Correction, appended — B0 was never open

**B0 as first presented was wrong, and the error is recorded here rather than deleted**
(`PRJ93_RULES.md`, corrections-are-appended).

The ruler conflict was **ruled by Phuong and executed on 2026-08-06**, before this session
began. `log/Decision_and_Resolution_Log.md` row **87** records *"BOTH GATES APPROVED AND
EXECUTED — Gate A, the ruler. `config.VENUE_SCALE_BASIS` is now the single authority.
`harness.REPORTED_BASIS` demoted to a documented FALLBACK for venues absent from the map."*
`log/70_ruler_migration_rescore_result.md` records the computational half completing: fold
vectors regenerated across all three venues (2,511 s of Chronos), the MCS re-run, and
`tab:ladder` re-scored. Live code already reflects it —
`models/ladder.py:407` reads `config.VENUE_SCALE_BASIS.get(venue, harness.REPORTED_BASIS)`,
authority first, fallback second.

**How the error happened, because the failure mode is the reusable part.** The finding came
from `ledger/phase_state.md:1794-1804`, which records the conflict as open. That file is
**history, not state** — `PRJ93_RULES.md` §"The three stores must agree" says so explicitly,
and `BLOCKED_third_party.md` §F, which *does* own current state, already read
**"Open rows not blocked on a third party: 0"**. Row 87 was appended to the decision log
after the phase_state entry, and the phase_state "unchanged" lines at 1870/1919/1955 all
predate it. Reading an append-only history file as current state is precisely the trap the
rules were written to prevent, and it was walked into anyway.

**Consequence.** Nothing waits on a ruler ruling. R0 has no upstream dependency, and
`fig:ladder` is already built on the ruled basis.

### Ellel frame length — also not open

392 and 386 are **two different objects, both correct**. 392 is the raw calendar frame under
`fill_calendar=True` (2025-06-08 to 2026-07-04); 386 is that frame after `trim_to_active`.
`log/43_G17b_Fold_Count.md:55-59` gives the six discarded rows precisely: the 2025-06-08
sale-and-reversal mis-ring from report 42 §6, plus five genuinely dead days 2025-06-09 to
2025-06-13, so the first active day is 2025-06-14 and 392 − 6 = 386.
`ledger/numbers_audit.md:90` audited the live `tab:venues` value against exactly this source
and returned **MATCHES**. The table's caption already carries the necessary qualifier
("as returned by `build_features` after `trim_to_active`"). **No change.**

An earlier and *superseded* explanation survives at
`docs/PRJ93_Master_State_Log.md:1194-1198`, which attributes the six rows to a store-ceiling
effect ("386 implies a 2026-06-28 ceiling … almost certainly FLAG-STORE-DURABILITY firing").
That entry is hedged in its own wording and predates `log/43`. It is noted here so a future
session does not reopen the question from it.

**One live sub-item, folded into B4 rather than raised as new.**
`numbers_audit.md:108` (row 21) observes that Ellel's `calendar_lag7` cell in `tab:bases`
reports *"180.1 & 385"*, and 385 pairs implies the **392-row raw** frame, not the 386-row
trimmed frame that `tab:venues` publishes. The audit's guidance is to state which frame each
table uses. That is a `tab:bases` annotation, handled with B4.

| # | Remaining blockers | Verdict | Affects | What clears it |
|---|---|---|---|---|
| **B1** | `tab:group` "roughly £40" is untraceable; the real value is £4.27–£10.94 | UNTRACEABLE, **open** | `tab:group`, F7's prose surround | Replace the number. Values computed in the resolutions file |
| **B2** | `tab:coverage` "measured with power" has no α, no effect size, no MDE, no achieved power | UNTRACEABLE, **open** | `tab:coverage` | Either compute the power calculation or rename the section |
| **B3** | `tab:weather` must source the **post-M24** fold grid. M24 moved every A14 MASE (baseline 1.5460 → 0.9551) when the grid widened from 6 folds | code_vs_paper M24, closed but consequential | `tab:weather`, **F7** | Confirm `eval/weather_basis_L1.json` is the post-M24 artefact before F7 is drawn |
| **B4** | `tab:bases` S1/S2/S3 — six point estimates with no dispersion; the Ellel 65.6 % width "is the whole argument for no defensible basis at Ellel and is currently invisible" | MISMATCH, values known, chapter unedited | `tab:bases` | Transcribe the bootstrap intervals from `log/45:97-103` |
| **B5** | `tab:mcs-config` omits seed (93), candidate-set size (9) and the common-fold restriction | UNTRACEABLE ×3, **open** | `tab:mcs-config` (App C) | Write the three values in. It is a pre-registration table; the omissions are the defect |
| **B6** | `tab:recon-decomp` must be built only from the post-M2 re-run (category coverage 77.6 → 85.1, item 77.6 → 72.1 — "the published direction is half wrong") | code_vs_paper M2, closed | `tab:recon-decomp` (App E) | Source the post-M2 artefact |
| **B7** | **Artefact staleness sweep never done.** Regenerating A5 after the warehouse restore `1641dbc` "moved every figure in it and flipped the Mondrian 80 per cent gate to FAIL (78.5 → 75.1)"; other artefacts may be stale for the same reason | Flagged in passing, sweep **not run** | Potentially every figure | Run R0 below |

`tab:exchangeability` and `tab:vuspr` were introduced after the numbers audit and have
**never been audited**. That is not the same as clean, and it is recorded here as a known
unknown rather than as a pass.

---

## 5. The fourth location — RULED: boundary, not exclusion

**Ruled by Phuong, 2026-08-06, closing the question `06` §9 left open and assigned to 8D.**

> **`events` was never a venue. The estate is three venues by BOUNDARY, not by exclusion.**

**Consequences, and they are deliberately small:**

1. **No R83 criterion is needed in Methods 3.1.** R83 asks that decisions be justified;
   a boundary on the unit of analysis is a definition, not a decision taken against data.
   There is no threshold here and none was ever set.
2. **One sentence in Discussion 5.5**, under HC59, recording the three-venue estate against
   the specification's four.
3. **A footnote on any figure drawn off `store/manifest.json` or `line_items.parquet`** —
   F3 among them — stating that a fourth Square location exists in the ingested warehouse
   and is not a trading venue. A footnote, never a silent filter.

### The recording trap, and the fix applied

The ruling exposed a defect in how the boundary was written down. `config.py:110-115`
justified the allowlist on **volume** — 203 line items across 2 distinct dates against
47,644 for `beer_hall`. That is the shape of a **data-driven exclusion threshold**, and it
is exactly the shape that triggers R83: an examiner reading either the code or the Methods
sees a cut-off and asks when it was set and against what.

The actual reason is **categorical**. The unit of analysis is a trading venue — a fixed site
with an opening calendar, against which a daily rhythm can be learned and a deviation from
normal defined. `events` is a Square location booking off-site event transactions: no site,
no opening calendar, therefore no rhythm to learn, **however many rows it carries**.

**Applied.** `config.py:110-127` now leads with the categorical reason, states explicitly
that this is a boundary rather than a threshold, and demotes the volume figure to
corroboration with an instruction not to restate it as the reason. Methods 3.1 must be
written the same way round when 8C composes it.

---

## 5a. What was found on disk — the evidence behind the ruling

A fourth location exists in the ingested warehouse. Under the standing instruction it is
reported rather than filtered, because it bears on the exclusion question `06` §9 leaves
open and assigns to 8D.

**What is on disk.** `store/manifest.json` `per_venue_counts` =
`{beer_hall: 47644, two_river_taps: 33993, ellel: 10489, events: 203}`, with
`net_sales_total_by_venue.events = 1438.74`. `store/line_items.parquet` (92,329 rows) carries
four distinct values in its `venue` column.

**What excludes it.** `config.py:110-124` — `FORECAST_VENUES = ("beer_hall",
"two_river_taps", "ellel")`, an allowlist, with the stated reason that `events` "is not a
trading venue in the usual sense — 203 line items across 2 distinct dates in the whole seed
window, against 47,644 for `beer_hall` (G15a.3)". A sibling `EXCLUDED_VENUES` denylist was
removed in G15a.3 having been read by nothing, after
`sim/july2026_w2_actuals_l1_raw.json` had already credited it with an exclusion it never
performed.

**Why this is 8D's and not this session's.** `06` §9 asks whether the estate is three rather
than the specification's four by **exclusion** (a methodological decision needing a stated
criterion in Methods 3.1) or by **boundary** (never in scope). The material above is evidence
for that adjudication and does not settle it, because two readings survive:

1. `events` **is** the specification's fourth venue, in which case this is an exclusion, the
   criterion is on the record in `config.py`, and Methods 3.1 must state it under R83.
2. `events` is a Square *location* used for off-site trading and the specification's fourth
   venue is a different site absent from the export altogether, in which case the three-venue
   figure is a boundary and `events` is a data-hygiene footnote.

Nothing in `brain/` distinguishes these. **Every Phase 6 evaluation artefact inspected is
three-venue clean**, so no result in the dissertation is affected either way. The exposure is
confined to any Methods or data figure drawn from `store/manifest.json` or
`line_items.parquet` — F3 among them — which would show four locations unless `events` is
handled explicitly. **The honest handling is a footnote, not a silent filter**, and which
footnote depends on 8D's answer.

**Second, smaller discrepancy, also not acted on.** Ellel's frame length is **392** in
`docs/PRJ93_Master_State_Log.md:120` and **386** in `eval/intermittency_L1.md`. The live
`tab:venues` on Overleaf carries 386. Beer Hall (399) and Two River Taps (331) agree across
both sources.

---

## 6. Where the corpus is silent

Per the standing requirement, a convention traceable to a cited work is stated as such and a
convention that is not is declared.

**The corpus contains no PRISMA flow diagram or equivalent.** Verified by direct query: the
survey papers in the notebook present their selections as "dense matrices, hierarchical trees,
and tables", and no source reports records identified / screened / excluded-with-reasons /
included. A-F1 is therefore justified **from reporting standards rather than from corpus
convention** — the PRISMA 2020 statement, and R65's own wording, which asks for the search and
screening protocol to be recorded. This is the one float in the programme with no corpus
precedent, and the caption should not imply otherwise.

**The Winkler width/penalty decomposition is never drawn in the corpus.** Kaas et al. (2026)
compare total scores only (Table 3, Table 7, Fig. 3, Fig. 7). F5 therefore shows coverage
against width — which Zaffran et al. *do* prescribe — rather than a decomposition chart that
would have no precedent and, per §7 of the inventory, no per-observation components on disk.

---

## 7. Space accounting

### Captions, against the 1,200 line

| | Floats | Words |
|---|---|---|
| Existing body floats | 13 | 780 |
| F1, F3, F4, F5, F6, F7 | 6 | 360 |
| **Body total** | **19** | **1,140** |
| **Caption reserve, unassigned** | — | **60** |
| **Budget line** | | **1,200** |
| Appendix floats A-F1…A-F7 (now incl. F2) | 7 | 0 counted |

Any later body float spends the reserve. A twentieth float is affordable only if every one
of the nineteen lands at or under the cap.

### Body prose, against the 15,900-word deficit

| Float | Prose replaced | Caption | Net |
|---|---|---|---|
| F1 four-block split | −250 (+25 cross-ref) | +60 | **−165** |
| F3 pipeline | −60 | +60 | 0 |
| F4 drift | −150 | +60 | **−90** |
| F5 validity–efficiency | −100 | +60 | **−40** |
| F6 detection sensitivity | 0 | +60 | +60 |
| F7 nulls | −180 | +60 | **−120** |
| *(F2 rolling origin → Appendix C)* | −80 (+25) | 0 counted | **−55** |
| **Total** | **−795** | **+360** | **−410** |

**The programme is word-positive.** It returns about 410 words to the deficit while adding
six body floats and seven appendix floats, because five of the six body figures replace prose
that is doing a figure's job badly. F1 alone accounts for 165 of that, which is the
arithmetic behind 05's judgement that the four-block split is the hardest thing in the
chapter to follow in prose. Demoting F2 improved the total by 60, because an appendix float
keeps the prose saving and sheds the caption cost.

---

## 8. Run list

Presented for approval under the "rerunning any experiment" gate. Nothing runs until Phuong
approves. Ordered by dependency.

| # | Run | Purpose | RQ | Cost | Model calls | Writes |
|---|---|---|---|---|---|---|
| **R0** | **Artefact staleness sweep.** Regenerate every committed eval artefact against the restored warehouse `1641dbc` and diff. Closes B7 | Nothing in the dissertation should rest on an artefact that predates the warehouse restore. Precedent: the A5 regeneration moved every figure in it and flipped a gate | All | Hours, unattended | None | `log/76_staleness_sweep_result.md` |
| **R1** | **Emit the four-block boundaries.** Import `config.TEST_WEEKS` and the Beer Hall calendar; write the four span boundaries and row counts to JSON | F1 cannot be drawn to scale — the split is computed at runtime in `hierarchy/reconcile.py:271-280` and never persisted. Only `n=56` is ever printed | RQ2, RQ4 | Seconds | None | `hierarchy/block_spans.json` + `log/77_*result.md` |
| **R2** | **Re-run `eval/exchangeability_diagnostic.py` with per-day conformity scores persisted** | F4. Finest grain on disk is a four-bucket time quartile; a drift figure needs the series | RQ4 | Minutes | None | `eval/exchangeability_scores.json` + `log/78_*result.md` |
| **R3** | **Add JSON emission to `eval/agent_eval.py` and re-run the detection evaluation** | F6, and `tab:vuspr` itself. The entire detection family is markdown-only; no JSON exists. Also fixes the known defect that the generator writes to the repo root rather than `brain/log/` | RQ5 | Tens of minutes | **None** — detection is not the agent LLM | `eval/agent_eval.json` + `log/79_*result.md` |
| **R4** | **Count the corpus screening numbers** for A-F1 from `04_supervisor_evidence_pack.md` §3.1 and `litreview_corpus_judgement.md` | R65. The protocol is written; the counts have never been assembled | — | Under an hour | None | `log/80_*result.md` |

**R2 is not the D-U3 run and must not be recorded as one.** `BLOCKED_third_party.md` D-U3
reserves a re-run of `exchangeability_diagnostic.py` **with the Ellel booking diary live**
(`ELLEL_DIARY_LIVE = False` today) as the falsification test for `log/74` §5. R2 re-emits the
current numbers at a finer grain with the diary still absent. It changes no statistic and
answers no blocked row.

**R3 is the only item that re-runs an experiment** in the sense the gate means. R0, R1, R2 and
R4 re-emit or re-derive; R3 recomputes detection performance. If the gate declines R3, F6 is
withdrawn and `tab:vuspr` stands on the markdown transcription, with the dose–response
finding staying in prose.

**No run in this list regenerates `tab:ladder`**, and no figure in this programme depends on
one. That demotion stands as approved and unregenerated under A11.

---

## 9. Build log — 2026-08-07

### Built, rendered and viewed

| Float | Script | Output | Status |
|---|---|---|---|
| F5 `fig:validity-efficiency` | `figures/fig_validity_efficiency.py` | `out/fig_validity_efficiency.pdf` | **done, viewed** |
| F7 `fig:nulls` | `figures/fig_nulls.py` | `out/fig_nulls.pdf` | **done, viewed — see the correction below** |
| F4 `fig:drift` | `figures/fig_drift.py` | `out/fig_drift.pdf` | **done, viewed** |
| F6 `fig:sensitivity` | `figures/fig_sensitivity.py` | `out/fig_sensitivity.pdf` | **done, viewed** |

Shared style in `figures/_style.py`: Okabe–Ito, colour never load-bearing on its own,
vector PDF at 6.0 in text width, Type 42 fonts, panel letters, units on every axis.
`assert_estate()` stops on a fourth venue rather than filtering it, and `load()` refuses
to draw from a missing artefact rather than substituting a default.

### Authored but NOT rendered — no TeX toolchain on this machine

| Float | Source | Status |
|---|---|---|
| F1 `fig:blocks` | `figures/fig_blocks.py` → `out/fig_blocks.tex` | generated to scale from `hierarchy/block_spans.json`; **never compiled** |
| F3 `fig:pipeline` | `out/fig_pipeline.tex` | hand-authored; **never compiled** |
| A-F1..A-F7 | not started | blocked on the same |

`pdflatex`, `lualatex`, `xelatex`, `tectonic` and Homebrew are all absent. TikZ output
cannot be verified here, and the publication standard says render and view **every**
figure. Two known risks that only a compile would settle: node-text overflow in the three
narrow blocks of F1 (mitigated by moving every label outside the bar) and the
`positioning`/`fit`/`backgrounds` library requirements of F3.

### F7 — the specified takeaway is wrong, and the figure is what caught it

§2 F7 states the takeaway as *"every paired difference's interval straddles zero"*. Drawn,
**eight of the thirty-one paired intervals exclude zero**:

| Venue | Pairs excluding zero |
|---|---|
| Beer Hall | `N−M` $+0.0163$ $[0.0004, 0.0337]$; `U−G2` $-0.0075$; `U−G3` $-0.0094$ |
| Ellel | `O−F` $-0.137$; `H−F` $-0.236$; `H−M` $-0.220$ |
| Two River Taps | `O−H` $-0.0028$; `U−G3` $-0.0144$ |

**The claim survives where the chapter actually makes it, and only there.** At every venue
the 90 per cent confidence set retains **all five** weather arms, so the weather limb is
undifferentiated as a set. Every `N−*` pair — the contrast that asks whether weather beats
no weather — includes zero at Ellel and Two River Taps. The Ellel exclusions are all
*between* weather arms, which is a question about which covariate set, not about whether
weather pays.

**One exception needs stating rather than absorbing.** Beer Hall `N−M` excludes zero at
$+0.0163$ $[0.0004, 0.0337]$: the full weather arm beats no weather, and the lower limb sits
at four ten-thousandths. It is the thinnest possible exclusion and it points the opposite
way to RQ3's answer. The defensible sentence is that the weather limb is a null as a set at
all three venues, with one marginal pairwise contrast at the Beer Hall that a confidence set
does not sustain — which is the same conservative-set-against-pairwise-test tension §3.6
already tells the reader how to read.

The pooling exclusions (`U−G2`, `U−G3`) are **already correctly reported** in
`sec:res-group`: *"At the two data-rich venues grouping is a small loss that the paired test
detects."* No change needed there.

**Revised F7 takeaway:** neither limb of RQ3 separates as a set at any venue, while a
handful of pairwise contrasts are detectable and every one of them is marginal. That is a
stronger figure than the one specified, and it is the reason the float was worth building
before 4.3 was composed.

---

## 10. Captions — drafted 2026-08-07, to the 15-word title / 45-word body rule

Written as `\caption[title]{title. body}` so the list of figures carries the title alone.

**F1 `fig:blocks`** — *The four-block split, and the superseded two-way split it replaced.*
> Blocks are drawn to scale on the Beer Hall calendar. Each does one job once, and the fit
> span ends strictly before the calibration block, which is the source of the conformal
> guarantee rather than a technicality. **The $n = 56$ unbiasedness rows of
> Section~\ref{sec:res-reconciliation} are the calibration block.** *(41 words)*

The final sentence is required: `validation` and `calibration` are both 56 days, so a bare
"$n = 56$" is ambiguous between two blocks that do different jobs.

**F3 `fig:pipeline`** — *From a Square export to an intervention, with the Methods
subsection carrying each step.*
> The two evaluation disciplines are drawn where each applies: the rolling origin governs
> model selection, the held-out calibration block governs the band. Deployment detail is in
> Appendix~C. *(26 words)*

**F4 `fig:drift`** — *Conformity scores over time, with the calibration quantile and
Ellel's non-trading days marked.*
> Absolute residuals per venue with a 28-day rolling median. Ellel's drift sits on
> calendar-open days that did not trade — 1,037 of 1,300 — where the residual equals the
> forecast by identity. *(32 words)*

**F5 `fig:validity-efficiency`** — *Empirical coverage against mean interval width for five
conformal methods, by venue.*
> Horizontal bars are Clopper–Pearson 95 per cent intervals; the dashed rule marks nominal
> 0.90. No method dominates — coverage is bought with width. Both quantities reproduce
> exactly across numerics regimes; set membership does not (Section~\ref{sec:conclusion-limitations}).
> *(35 words)*

The last clause is the W1 propagation. F5 draws the two quantities that are regime-**stable**,
so without it the figure quietly implies the whole comparison is stable, which is the reading
5.3 exists to prevent.

**F6 `fig:sensitivity`** — *Detection catch rate against injected deviation magnitude, by
event kind and venue.*
> Bands are Wilson 95 per cent intervals; $n$ is injections per series. Spikes are the only
> kind whose catch rate depends on magnitude, saturating near 0.67 at the two data-rich
> venues. *(31 words)*

**F7 `fig:nulls`** — *Paired mean differences with 90 per cent bootstrap intervals, weather
and pooling arms.*
> Filled markers exclude zero. Axes are per venue: Beer Hall and Two River Taps in MASE,
> Ellel in pounds. Eight of thirty-one contrasts exclude zero, every one marginal, and no
> confidence set separates. *(34 words)*

### Compile verification — the exception and why it is not a waiver

F1 and F3 are TikZ and no TeX toolchain exists on this machine. **Verification is by Overleaf
compile rather than local render.** That is the stronger route, not a concession: Overleaf is
the environment that actually builds the document, and a second local distribution could
diverge from it. Pushed as `figure_proof.tex` at the project root — isolated, not `\input` by
`main.tex`, so a TikZ error cannot break the chapters mid-composition. (The Overleaf bridge
will not create a directory, so it sits at the root rather than under `scratch/`.)

**The compile log is not the verification.** F1's open question is whether three abutting
1.85 cm blocks carry their labels without collision, and a clean exit reports what the
compiler decided, not where the labels landed — the exit-code rule in `PRJ93_RULES.md`
applied to LaTeX. The PDF must be looked at.
