# Acronyms, notation, and the paper-named-symbol sweep — 2026-08-10

Built for the front-matter tables. This file owns the inventory, the verification scope and
the defect list; the two `.tex` files own what the reader sees.

---

## 0. The word-count assumption — VERIFIED EMPIRICALLY, both directions

The governing instrument is `texcount -0 -sum -merge -total` over **seven explicitly listed
files** (`chapters/*.tex` ×6 plus `abstract.tex`), invoked by `\bodywordcount` in `main.tex:137`.
A front-matter file is not in that list, and none of the seven `\input`s anything but two figure
bodies — so on inspection it should be outside the counted set. Inspection is not the check.

**The test.** A probe file of exactly 2,001 words was wired in at the intended position (after
`\listoffigures`, before `\pagenumbering{arabic}`) and both counts re-run.

| Measurement | Without probe | With probe | Delta |
|---|---|---|---|
| **Governing count** (7 listed files) | 19,894 | **19,894** | **0** |
| Whole document (`-merge` over `main.tex`) | 27,470 | 29,471 | **+2,001** |

**The second row is the control and it is the point.** It proves the probe was genuinely
reachable by `-merge` from `main.tex`. Without it, an unchanged governing count would be
consistent with the probe never having been wired in at all — a clean result over an empty
scan, which is the failure mode `PRJ93_RULES.md` requires every check here to rule out.

**Conclusion: front matter is outside the counted population. The tables cost zero counted
words.** Probe removed, `main.tex` restored (`git diff` clean before any deliverable landed).

---

## 1. Sweep scope

Acronyms and symbols were enumerated over the **26 files reachable by `\input` from
`main.tex`**, resolved recursively in document order (4,548 lines). This matters: a first pass
scoped to the obvious 20 files silently missed `appendix/search_screening_body.tex`, which
carries six acronyms nothing else in the document uses.

Method: capitalised-run regex plus a second mixed-case pass (to reach `TabPFN-TS`, `GPT-4o`),
then direct greps for ~35 expected-but-absent acronyms to bound the negatives. Comment
stripping uses `(?<!\\)%` so an escaped `\%` does not truncate the line.

**Confirmed absent** from `abstract.tex`, `chapters/*.tex`, `appendix/*.tex`, `figures/*.tex`:
ACI, CQR, ECE, CRPS, ACF, ARIMA, ETS, RMSE, sMAPE, MAPE, SKU, EPOS, POS, GPU, MPS, ROC, AUC,
SD, ARMA, GARCH, ADF. Each is spelled out in prose or not used. `RMSSE` appears only in a
LaTeX label and a comment — never in reader-facing text.

---

## 2. Verification scope for the acronym expansions

The brief scopes this deliberately: standard, uncontested expansions are **not** fact-checked.

**Taken as standard, not verified** (24): MAE, CI, VAT, SQL, API, SDK, LLM, ML, AI, IP, DS,
MSc, SOP, DOI, ACM, PRISMA, RAG, MCP, FAISS, GPT-4o, NotebookLM, CUSUM, ADI, CV.

**Verified at source** (NotebookLM `d565d5f0`, plus Zotero for bibliographic identity), because
each originates in a specific cited paper or varies across the literature:

| Acronym | Verdict | Evidence |
|---|---|---|
| **PRISM** | **System name, NOT an initialism.** Zotero `WZR9K8QL`: *"PRISM: Festina Lente Proactivity — Risk-Sensitive, Uncertainty-Aware Deliberation for Proactive Agents"*. The paper's own title does not expand it | NotebookLM returned *"Proactive Risk Sensitive Intervention with a Slow mode Margin"* with a verbatim-looking quote — **its `cited_text` is about CPTC and DtACI baselines and contains no such sentence.** A mis-mapped citation index, the failure mode already on record. Contradicted by the real title and **discarded** |
| **VUS-PR** | Expansion **not stated in any held source**. Recorded as used in that literature: volume under the surface, precision–recall | Liu & Paparrizos, Zotero `SB2K8NCM`, *"The Elephant in the Room"* — uses the measure, never expands it |
| **CPTC** | **Not expanded in its source.** Sun & Yu 2025 use it unexpanded throughout | `cited_text` confirms unexpanded use alongside DtACI/ECI/L-ARC |
| **TSB-AD** | **Not expanded in its source.** Sibling suite TSB-UAD expands as *"an end-to-end benchmark suite for univariate time-series anomaly detection"* | Paparrizos et al. 2022 bibliography entry, quoted |
| **TabPFN-TS** | Tabular prior-fitted network; the TS suffix is **not** expanded in Hoo et al., whose title is *"From Tables to Time: Extending TabPFN-v2 to Time Series Forecasting"* | NotebookLM NOT SUPPORTED on the suffix |

**The lesson worth carrying:** four of the five acronyms this document borrows from cited papers
are **not expanded by the papers themselves**. An acronym table that invents expansions for them
would be manufacturing scholarship. Each is entered as what it is — a system, benchmark or
measure name — with the convention noted.

---

## 3. Acronyms used before they are expanded — FINDINGS

The table does not excuse a missing first-use expansion. These are the sites.

| Acronym | Uses | First use | Status |
|---|---|---|---|
| **MASE** | **24** | `abstract.tex:200` | **Never expanded anywhere in the document.** Zero hits for "mean absolute scaled error" across all 20 reader-facing files. The most-used acronym in the dissertation, introduced in the abstract, never spelled out |
| **BH** / **TRT** | 3 / 2 | `results.tex:266` / `:268` | **Never expanded.** Worse, `tab:group` mixes conventions in one column: `BH`, `Ellel`, `TRT` — two abbreviated, one spelled out |
| **CI** | 2 | `results.tex:264` | Never expanded ("confidence interval": 0 hits) |
| **SBC** | 1 | `results.tex:183` | Never expanded. Used once, in a table header, for the Syntetos–Boylan–Croston classification |
| **VUS-PR** | 5 | `literature_review.tex:181` | Never expanded (and its source does not expand it either — §2) |
| **CPTC** | 1 | `literature_review.tex:187` | Never expanded |
| **VAT** | 1 | `methodology.tex:69` | Never expanded (`ex-VAT`) |
| **SOP**, **API**, **IP**, **MCP** | 2/2/2/1 | Appendix E, `fig_deployment` | Never expanded. All sit in the reproduced project specification and the deployment figure |
| **CUSUM** | 8 | `figures/alg_detection.tex:37` (Appendix B) | `methodology.tex:397` spells out *"a cumulative sum"* in words but **never introduces the acronym**; the token first appears in an appendix float caption. Expansion and acronym never meet |

**Defined properly at first use, no action:** ADI and CV² (`literature_review.tex:86–87`),
`G2`/`G3`/`U` (`results.tex:250–251`), `L2`/`L3` (`appendix/tables.tex:79`), `I1`–`I3`/`E1`–`E3`
(screening criteria, defined in their own table), MCS (expanded by its section heading).

**Also found, out of scope, reported not fixed:** `appendix/project_specification.tex:38` reads
`\section*{Project PRJ93-AIG-AIG}` — the suffix is doubled. Also at line 5 in a comment.

---

## 4. Notation defects — REPORTED, NOT FIXED. Phuong rules on the repairs

### 4a. One symbol, two or more meanings

| Symbol | Meaning A | Meaning B (and C) | Severity |
|---|---|---|---|
| **`h`** | forecast **horizon** — `eq:mase`, `eq:hln`, `h = 7` at `methodology.tex:293` | CUSUM **decision threshold**, `h = 5` at `methodology.tex:409`, `h=5.0` in `alg_detection` | **Highest.** Both live in Chapter 3, ~120 lines apart, and both are *documented* — `alg_detection`'s `\Notation` block says "$h$ CUSUM decision threshold" while `eq:hln` says "at horizon $h$". A reader meets `h = 7` and `h = 5` in one chapter meaning different things |
| **`n`** | in-sample length (`eq:rmsse-m5`), forecast comparisons (`eq:hln`, `n = 6`), calibration-set size (`methodology.tex:330`) | persistence **window in trading days**, `n = 7` in `alg_detection`; also `n = 120` training length, `n{=}260` origin counts | **Four distinct meanings** |
| **`m`** | **seasonal period**, `m = 7` (`eq:mase`) | number of **test points** (`alg_conformal`, `x_{1:m}`); **breach count** `m = 4` in the persistence rule (`alg_detection`) | Three meanings |
| **`k`** | conformal **rank index**, `k = \lceil (n+1)(1-\alpha)\rceil` | CUSUM **slack**, `k = 0.5` | Two, same chapter |
| **`s`** | MASE **denominator scale** (`eq:mase`) | **conformity score** `s_i` (`alg_conformal`) | Two — and **both match their own source conventions** (§5), so the collision is structural, not an error of transcription |
| **`S`** | CUSUM statistic `S^{+}`, `S^{-}` | the **set** of scores `S^{(g)}` | Two |
| **`p`** | average **inter-demand interval** (`literature_review.tex:86`, `results.tex:183`) | **p-value** (`tab:mcs`, `results.tex:93`) | Two |
| **`B`** | bootstrap **replicate count** (`B = 1000`, `B = 10{,}000`) | number of validation **sub-blocks**, `B = \lvert\mathcal{B}\rvert` (`alg_adoption`) | Two |
| **`d`** | paired loss **differential** `d_b` (`alg_adoption`) | **direction** indicator `d \in \{+1,-1\}` (`alg_detection`) | Two |
| **`q`** | conformal **half-width** `\hat q` | the 0.90 **quantile of the rank statistic**, `q_{0.90}` (`results.tex:493`) | Two |
| **`\beta`** | **F-measure weight** `F_\beta` (`literature_review.tex:270`) | regression **coefficient** `\lvert\hat\beta\rvert` (`appendix/pseudocode.tex:231`) | Two, far apart |

### 4b. One quantity, two symbols

| Quantity | Symbols | Sites |
|---|---|---|
| Squared coefficient of variation of demand sizes | **`v`** and **`CV^2`** | `literature_review.tex:87`, `methodology.tex:187`, `eq:sba` use `v`; `appendix/robustness.tex:125` uses `CV^2`. `v` is the source convention (Kostenko & Hyndman, verified §5) |
| The conformal half-width | **`w_t^{(90)}`** (`eq:z`) and **`\hat q^{(g)}` / `q`** (`alg_conformal`) | Same object under two names in Chapter 3 and Appendix B |

### 4c. Symbols used but never defined

| Symbol | Site | Note |
|---|---|---|
| **`\varepsilon`** | `eq:z`, `methodology.tex:390` | Occurs **exactly once in the document** and is never defined. It is the floor in `\max(w_t^{(90)}, \varepsilon)` — a guard constant whose value is never given |
| **`\gamma`** | `results.tex:615`, `tab:winkler` caption | Occurs **exactly once**, inside a caption, as *"that venue's own minimum over the $\gamma$ sweep"*. Never defined. Prose elsewhere calls it "step size" without the symbol |
| **`\hat y_t`, `y_t`** | `eq:mase` | Conventional and inferable, but the equation is the document's first display and neither is named |
| **`\phi`** | `alg_detection:71` | Defined only by an inline `\tcp*` comment ("suppresses re-firing"), not in the `\Notation` block |

### 4d. Confusable, not wrong

- **`l`** (block length, `appendix/robustness.tex:200`) against **`\ell_j`** (lower interval
  bound, `alg_conformal`). Different glyphs, near-identical at reading size.
- **`\tau`** is an onset index in `alg_detection` and part of the benchmark *name*
  `$\tau$-bench` at `literature_review.tex:207`. A proper noun set in maths italic.

---

## 5. Symbol conventions verified against source papers

All via NotebookLM `d565d5f0`, reading `cited_text` rather than the summary prose.

| Convention | Source's form (quoted) | Document | Verdict |
|---|---|---|---|
| **RMSSE denominator** | Hewamalage et al. eq. 5: `1/(n−1) Σ_{i=2}^{n} (Y_i − Y_{i−1})^2` | `eq:rmsse-m5`, identical | **MATCHES verbatim**, including the `1/(n-1)` factor and the lag-one difference |
| **MASE denominator** | Hyndman & Koehler: `Q = (T − m)^{-1} Σ_{t=m+1}^{T} |y_t − y_{t−m}|` | `s = (1/\lvert\mathcal{D}\rvert) Σ_{t ∈ \mathcal{D}} \lvert y_t − y_{t−m}\rvert` | **Declared generalisation, not a mismatch.** The document replaces the `(T−m)` normaliser and the `{m+1..T}` range with an explicit index set because closed days make the range non-unique — and says so at `methodology.tex:114` and `:125–130` |
| **Seasonal period letter** | `m` | `m`, `m = 7` | MATCHES |
| **Horizon letter** | `h` (HLN, Hewamalage) | `h` | MATCHES — but see the `h` collision at §4a |
| **Sample-size letter** | `n` (HLN: *"errors (e1t, e2t); t = 1, …, n"*) | `n` | MATCHES |
| **HLN correction** | `S*_1 = [[n + 1 − 2h + n^{-1}h(h−1)]/n]^{1/2} S_1` | `eq:hln`, identical | **MATCHES verbatim** |
| **SBC letters** | *"p is the average inter-demand interval and v is the squared coefficient of variation of the demand when it occurs"* | `p`, `v` | **MATCHES** — which makes `CV^2` in Appendix C a departure from the document's own source |
| **SBA rule** | *"use SBA whenever v > 2 − (3/2)p"* | `eq:sba`, identical | MATCHES |
| **SBC cutoffs** | Source's analytic thresholds `p = 1.32`, `v = 0.49`; Kostenko–Hyndman corrections `4/3`, `0.5` | Document uses `4/3` and `0.5` **and names the originals it replaces** | MATCHES, correctly attributed |
| **Conformal rank index** | *"the ⌈(n+1)(1−α)⌉ th-smallest score as our quantile"* | `k = \lceil (n+1)(1-\alpha)\rceil` | MATCHES |
| **Conformal score / quantile letters** | `s` for the score, `\hat q` for the quantile | `s_i`, `\hat q^{(g)}` | MATCHES — the source convention, which is why the `s` collision is resolved on the MASE side |
| **CUSUM threshold letter** | Page 1954: *"Take action after the nth observation if S'n ≥ h"* | `h` | MATCHES |
| **CUSUM slack letter `k`** | **DOES NOT MATCH.** Page 1954 does not use `k` for slack or a reference value. In Page's two-sided Rule 4, `h` and `k` are the two **decision intervals**: *"Take action after the nth article sampled if either Sn − min Si ≥ h or max Si − Sn ≥ k"* | `alg_detection` `\Notation`: *"$k$ CUSUM slack, the smallest shift worth reacting to"*, cited to `page_continuous_1954` at `methodology.tex:397` | **REPORTED, NOT FIXED.** The slack/threshold `(k, h)` parameterisation is the later SPC convention, not Page's. This is a citation question and therefore a human gate. Note the document already discloses the *substantive* borrowing problem at `methodology.tex:407–412` (the ARL tables assume a standard-deviation denominator and `eq:z` divides by a conformal half-width) — the notation attribution is a separate, smaller point |

---

## 6. The rename — deliverable 3

**Renamed: exactly one symbol.**

`s_{\mathrm{M5}}` → **`s_{\mathrm{sq},1}`** at `chapters/methodology.tex:118`, the mean squared
lag-one difference. It is the only site in the document. Defined at first use with a
parenthetical naming the convention and its citation, and entered in the notation table.

**Swept for others of the same kind** — anything whose subscript or name is a paper, competition
or author rather than the quantity. Scope: all math spans in the 26 document-order files, plus
`figures/*.py` (9 generators), `figures/*.tex` (7 float bodies) and the 6 committed figure PDFs.

**Nothing else qualifies.** `T_R` / `e_R` are the *range* statistic and its rule; `\mathrm{MASE}_{\mathrm{est}}`
and `_{\mathrm{dow}}` name the estimator and the day-of-week incumbent; `P/D/S/A/G` in
`tab:winkler` are methods defined in the caption. `\tau`-bench, HiL-Bench and Ask-F1 are proper
nouns, not notation.

### Not renamed, reported instead

| Item | Why not |
|---|---|
| **`rmsse_m5`** | **A key in committed result artefacts** — `brain/sim/june2026_confront_rescored.json`, `july2026_confront_rescored.json`, `july2026_w2_confront_rescored.json`, and the emitting code at `brain/eval/harness.py:560`. Renaming breaks the trace from prose to artefact. The brief forbids it; recorded here instead |
| **`\label{eq:rmsse-m5}`** | A LaTeX label, not reader-facing notation, and it is referenced. The label still accurately names the M5 convention the equation states |
| **The `M5` acronym itself** | Names the competition, which is the correct referent — `literature_review.tex:137` *"the M5 competition"*. Only the *symbol* was opaque |

### Figure generators — checked, nothing to change

`figures/*.py` carry no `M5` in any axis label, title or annotation (their labels read
"Conformity score (£)", "Paired mean difference (MASE)", "Empirical coverage"). The six
committed PDFs were opened and their content streams decompressed: `fig_drift.pdf` returns 1,037
byte-matches for `M5` and `fig_sensitivity.pdf` 6, and **every one is `/M5 Do`** — a matplotlib
XObject name, not rendered text. A grep-only check would have reported a renamed symbol still
live on a chart axis. It is not.
