# Phase state

Appended at the end of every session, per `brain/PRJ93_RULES.md`.

---

## 2026-07-30 — Phase: grounding + MCS smoke test

**Completed**
- Objective A: grounded on project state from `docs/` (6 files),
  `log/Decision_and_Resolution_Log.md` (ordering only), `log/` filenames, and a
  live read-only Overleaf file listing.
- Objective B: one live call per MCP connector, plus follow-ups to characterise
  the Zotero failure.

**Artifacts written**
- `brain/knowledge/00_state_brief.md` — sections 1–3 only (chapter state; 55
  numbered examiner weaknesses with chapter + severity + open/closed status;
  experiments run vs implied). Sections 1–3 body = 180 lines, at the ceiling.
  **The 120-line target was not achievable** without gutting the weakness list:
  55 weaknesses stated specifically enough to act on cost ~55 lines alone, and
  the instruction was to keep specifics over narrative. Narrative was cut
  instead — premise, strengths, and the results-skeleton note are all
  compressed to the minimum that still carries facts.
- `brain/knowledge/00_marking_criteria.md` (414 lines, no cap) — 70 hard
  mechanical constraints (HC1–HC70) in their own section at the top, then
  R1–R136 rubric decomposition, D1–D17 distinction/outstanding, T1–T3 threshold
  discriminators, structure template. One criterion per line, none merged.
  Includes an explicit "NOT SPECIFIED in these documents" list so a later
  session knows which mechanical rules are unverified rather than absent.
- `brain/ledger/tooling_verdict.md` — MCP smoke-test verdict (all four PASS).
- `brain/PRJ93_RULES.md` — written in the prior session, followed here.
- Superseded and deleted: `knowledge/01_marking_checklist.md`.

**Token discipline observed**
- Read at full length by me: `PRJ93_RULES.md` only (1 file, under the 3-file cap).
- All bulk doc reading delegated to 3 subagents, each capped at 400 lines of
  findings. No `.tex` file was opened; Overleaf was listed, never read.
- **graphify lives at the repo ROOT** (`graphify-out/`), not under `brain/`,
  which holds only `cache/stat-index.json`. **The root graph covers `brain/`
  well:** 3,258 of 7,959 nodes brain-scoped, 271 brain files including every
  `.py` package and the `.md` reports. Use it as the first move for any
  code question, per root `CLAUDE.md`. Built at `dbcc525`, one commit behind
  tip — run `graphify update .` before relying on it. Do not build a second
  graph inside `brain/`.
  **Correction:** an earlier entry this session claimed 0 brain-scoped nodes.
  That was an artifact of filtering on guessed node keys (`file`/`path`/`id`)
  when the real key is `source_file`. The lesson is generalisable and worth
  keeping: **a null result from a guessed schema is not evidence of absence.**
  Inspect the keys before trusting a count, and verify a negative more than one
  way before writing it down as fact.
- **`graphify query`/`explain` hang** (no output at 100s+); `--version` is
  instant. `graph.json` reads in 0.008s but `json.load` on it exceeds 5 min.
  Background the CLI or grep `graph.json` / `GRAPH_REPORT.md` instead. Detail
  in `tooling_verdict.md`.

**Findings that change the record**
- `chapters/methodology.tex` AND `chapters/results.tex` are BOTH on Overleaf.
  `FLAG-METHODOLOGY-OVERLEAF` and examiner finding 44 are stale.
- No `chapters/discussion.tex` — Discussion confirmed absent, not merely draft.
- Zotero failed on first probe (desktop app closed), **passed on retest once
  started**. All four connectors now green. The failure mode is recorded in
  `tooling_verdict.md` because it is silent: with the app closed,
  `zotero_search_items` returns `Untitled` / `Type: unknown` rather than
  erroring, and `list_libraries` still succeeds off SQLite — so neither is
  proof of life. Probe with `get_item_metadata` on a known key instead.
- Source-count mismatch unreconciled: NotebookLM 106, Zotero My Library 122,
  Zotero group `scc452` 109. Diebold & Mariano was added 2026-07-27, so part
  of the surplus is recent additions closing examiner weakness 54.

**Unstarted**
- Whether the Overleaf `methodology.tex` / `results.tex` hold real prose or
  stubs — needs a bounded `grep -n` + line-range read, not a full read.
- Re-measurement of the words-remaining figure now that finding 44 is stale.
- Reconciliation of the 106 / 122 / 109 source counts, and establishing which
  Zotero library actually backs the Overleaf `ref.bib`.
- Confirming Better BibTeX is loaded, against a real citation key from the
  chapter (the smoke test used a guessed key).
- Everything in `00_state_brief.md` §4 "implied but NOT run".
- The scientific-writing / statistical-reporting / scientific-visualisation
  skills named in `PRJ93_RULES.md` do not exist in `.claude/skills/`; the
  writing-standard rule is unenforceable until they do.

---

## 2026-07-30 — Phase: AutoResearchClaw distillation

**Completed**
- Distilled `github.com/aiming-lab/AutoResearchClaw` (23 stages, 8 phases,
  ~84k lines) into a stage reference with a gate-leverage ranking.
- No PRJ93 file was read. Nothing was pushed to Overleaf.

**Artifacts written**
- `brain/knowledge/01_autoresearchclaw_reference.md` — stage table (23 rows),
  per-stage prose on the reasoning/critique layer, gates ranked by leverage,
  README-vs-code mismatch table, and a PRJ93 adopt/avoid list.

**Token discipline observed**
- README + `docs/integration-guide.md` fetched directly (2 WebFetch calls).
- Source reading delegated to 6 subagents by stage cluster, each capped at 400
  lines. Five returned. The stage 16–19 cluster **failed — its own sub-agents
  hit the monthly spend limit** — and was filled in by hand with bounded
  `grep -n` plus three line-range reads (`_review_publish.py:138-374`,
  `prompts/ml.py:946-1160`, `_paper_writing.py` two ranges). No file was read
  end-to-end by me.
- Repo cloned to the session scratchpad, not into the project tree.
- **graphify was not consulted and could not be.** The root graph indexes the
  `ai-gm` repo; a freshly cloned external repo has no nodes in it. The Bash
  hook fired its graphify-first mandate on every command in this session — the
  mandate is sound for project code and inapplicable here. Stated rather than
  silently skipped, per the rule recorded in `tooling_verdict.md`.

**Findings that change the record**
- `arc/.claude/skills/` ships working `scientific-writing`,
  `statistical-reporting`, `scientific-visualization`, `literature-search` and
  `hypothesis-formulation` SKILL.md files — **the exact five that
  `PRJ93_RULES.md` flags as missing.** They are a drafting reference for
  authoring ours under `brain/skills/`. `.claude/` stays out of bounds.
- The `PRJ93_RULES.md` Overleaf gate is better justified than when it was
  written: ARC's `OverleafSync.push_paper` pulls, then unconditionally
  `shutil.copy2`s local files over the remote working tree, and its conflict
  resolver defaults to keeping the AI's version. Keep that gate unconditional.

**Unstarted**
- Two gate analogues the ranking suggests `PRJ93_RULES.md` lacks: a gate on the
  evidence base before reading effort is spent (ARC stage 5), and one on the
  research question before the methodology that serves it (ARC stage 8).
  Not added — changing the gate list is itself a human decision.
- Three "no call site found" claims about ARC's HITL intelligence layer
  (InterventionLearner, QualityPredictor, EscalationTracker) are unverified
  negatives from subagent greps. Flagged as such in the reference; not
  independently confirmed.
- The clone is in the session scratchpad and will not persist.

---

## 2026-07-30 — Phase: autoresearchclaw SKILL.md

**Completed**
- Turned the ARC reference into an operating manual. No PRJ93 file was read;
  nothing pushed to Overleaf.

**Artifacts written**
- `brain/skills/autoresearchclaw/SKILL.md` (276 lines, under the 400 cap) —
  frontmatter + human gates, the loop, 3 review roles with critique
  dimensions, T1–T14 pass/fail tests, 8 failure/pivot signals with actions,
  anti-patterns, adopted drafting rules, and an explicit "what this file
  cannot do" section.
- `brain/skills/autoresearchclaw/references/drafting-rules.md` (146 lines) —
  43 long-form writing rules, not needed for the loop. Venue-specific ones
  (word counts, reference counts) are marked as such rather than presented as
  PRJ93 requirements.
- Replaced the `SKILL.md` stub written in the scaffold session.

**Token discipline observed**
- Zero files read at full length. `PRJ93_RULES.md` and
  `01_autoresearchclaw_reference.md` were both already in context from earlier
  in this session; re-reading would have spent the 3-file budget for nothing.
  One `wc -l` to verify the cap.

**Findings that change the record**
- The self-sufficiency bar is met for the loop but NOT for marking. SKILL.md
  has no PRJ93 section word targets — the source system's are NeurIPS
  conference budgets and do not transfer — so section-balance checking needs
  `00_marking_criteria.md`. Stated in SKILL.md §4 and §8 rather than padded
  with invented numbers.
- SKILL.md §1 lists the five authoritative gates from `PRJ93_RULES.md` and
  carries the two candidate gates as explicitly NOT adopted, with an
  instruction to ask rather than enforce. The gate list is still Phuong's to
  change.

**Unstarted**
- The three review roles are adapted from a system whose own review stage was
  its weakest component, and have never been run against a PRJ93 chapter.
  SKILL.md §8 says to treat the first use as a trial and log what they missed.
- T7's ban on `---` as a placeholder collides with the source system's own
  sanitiser, which *writes* `---` over unverified numbers. If we ever adopt
  that sanitiser, the two rules need reconciling.
- Nothing yet verifies T8/T9 (NotebookLM and Zotero checks) mechanically —
  they are stated as tests but rely on the session actually running the
  queries.

---

## 2026-07-30 — Phase: PRJ93 pipeline spec

**Completed**
- Adapted the ARC 23-stage pipeline to PRJ93. Table and gate list presented in
  chat first and approved before anything was written. Nothing pushed to
  Overleaf.

**Artifacts written**
- `brain/knowledge/02_prj93_pipeline_spec.md` — disposition of all 23 stages
  (18 keep/adapt, 5 drop), per-stage spec for the kept ones (artefact,
  verification check, working-vs-Overleaf destination, critique roles,
  acceptance test, gate), the 9-gate list G1–G9 with decision dates, a 6-phase
  order A–F, the dependency conflicts, and what the spec does not settle.

**Token discipline observed**
- One file read at full length: `00_state_brief.md` (191 lines), needed because
  the chapter-order conflict could not be identified without it.
  `PRJ93_RULES.md`, `01_autoresearchclaw_reference.md` and `SKILL.md` were
  already in context from earlier in this session. Under the 3-file cap.
- No `.tex` file was opened. Overleaf was not touched.

**Findings that change the record**
- **The stated chapter order does not hold.** Literature review cannot settle
  before methodology in three places: the contribution claim (W24) depends on
  S8b, which is blocked on Ryan's key; the four broken promises (W25–W28) each
  need a methodology decision before the lit-review edit; and G1/G2 change the
  headline metric, which changes the lit review's metric paragraph. Recorded in
  §5 rather than reordered silently. The lit review now settles in TWO passes,
  Phase A and Phase E.
- ARC stage 13 (ITERATIVE_REFINE) is dropped **deliberately**, not for cost:
  refit-until-better would retroactively invalidate the pre-registration by
  commit ordering, which the examiner record calls the strongest thing in the
  project. Reasoning kept in §5.4 so a later session does not "restore" it.

**Unstarted**
- Everything in the spec. Phase A and B both open as of now.
- Four things §6 flags as unsettled: no per-chapter word budgets exist; whether
  `methodology.tex`/`results.tex` hold prose or stubs is still unverified; the
  106/122/109 source-count reconciliation still blocks a trustworthy stage-23
  key check; and Round 5 adversarial review has no phase because its placement
  depends on whether Phase C produces new code.
- G1, G2, G3 are due before Phase B and have not been put to Phuong yet.

---

## 2026-07-30 — Phase: citation audit (pipeline stage 23 + stage 6)

**Completed**
- Audited all 84 unique `\cite*` keys across `literature_review.tex`,
  `methodology.tex` and `results.tex` against `ref.bib` and against the sources
  themselves via NotebookLM. Six batches, appended after each.
- **Nothing was changed.** Read-only audit, as instructed. Nothing pushed to
  Overleaf.

**Artifacts written**
- `brain/ledger/citation_audit.md` — per-key table (key, title, claim location,
  claim as written, NotebookLM evidence, verdict, suggested fix), uncited-entry
  list, and a ranked summary.
- Result: SUPPORTED 65, OVERSTATED 7, UNSUPPORTED 0, WRONG-SOURCE 1,
  MISSING-KEY 0, UNVERIFIED 11.

**Token discipline observed**
- `literature_review.tex` read once in full — it was the subject of the task.
  `methodology.tex` and `results.tex` were never read by me: extraction was
  delegated to subagents returning key + claim + context only. `ref.bib` (1,702
  lines) likewise inventoried by subagent.
- Four files read at full length (`SKILL.md`, `00_state_brief.md`,
  `02_prj93_pipeline_spec.md`, `literature_review.tex`) — **over the 3-file cap
  in `PRJ93_RULES.md`**, on explicit instruction naming all four. Recorded
  rather than silently absorbed.
- graphify not consulted: the corpus here is `.tex` and `.bib` prose on
  Overleaf, not indexed project code. The Bash hook's mandate fired anyway.

**Findings that change the record**
- **`brain/ledger/citation_audit.md` did not exist** before this session, and
  there is **no `chapters/ref.bib`** in the Overleaf project — one `ref.bib`,
  111 entries, no duplicate keys. **W47's duplicate-key hazard is already gone.**
- **Neither `methodology.tex` nor `results.tex` is a stub.** Methodology ~573
  lines with 3 tables, results ~780 lines with 12 populated tables. This closes
  the open question in `02_prj93_pipeline_spec.md` §6 and confirms W44 stale.
- **W20 (CPTC) is genuinely closed.** Every limb of the restated theorem now
  checks to the proposition number: Prop 4.1, Thm 4.2 + Assumption 1, Thm 4.3,
  Thm 4.4.
- **W48 (the `angelopoulos_conformal_2023` repoint) left no wrong claim behind.**
  The key resolves to the Gentle Introduction, and the Gentle Introduction is the
  correct source for the two-sided bound the chapters cite it for.
- **W6 is confirmed by arithmetic.** The Harvey-Leybourne-Newbold factor is
  $[(n + 1 - 2h + n^{-1}h(h-1))/n]^{1/2}$; at $n=6$, $h=7$ the numerator is
  exactly 0.
- **`kolassa_we_2023` is overstated in a way that hides support for G1.** The
  paper establishes that squared-error measures are coherence-compatible and
  MASE is not; the chapter generalises this into "coherence and minimal error
  cannot both be optimised", arguing away its own case for RMSSE.
- **`fu_prism_2026` is overstated in the synthesis paragraph.** PRISM calibrates
  an acceptance probability; it does not report that probability's calibration.
  Correcting this widens the opening the contribution claim needs.
- **The §rw-evaluation human-factors cluster is the least verifiable section of
  the chapter.** Meyer, Lee & See, Parasuraman & Riley, Hancock and Guo are all
  in the notebook as reference-list fragments rather than full texts. This is the
  section carrying the project's central cost-asymmetry argument.
- **`hyndman_another_2006` and `syntetos_categorization_2005` are not in the
  NotebookLM notebook at all** — the two citations that govern the metric and the
  intermittency cutoffs. Note the collision risk: `syntetos_accuracy_2005` and
  `syntetos_categorization_2005` are different 2005 papers and only the first is
  loaded.
- **The W54 gap papers were acquired but never cited.** `haben_short_2019`,
  `hertel_explainable_2026`, `brigato_there_2025`, `kolassa_evaluating_2016`,
  `meyer_rethinking_2026`, `kaas_probabilistic_2026`, `norton_tailored_2025` all
  sit uncited in `ref.bib`. W54's charge is that no citation *governs* the metric,
  the selection procedure or the weather covariates — acquisition does not close
  it, and the two weather-governing papers are cited nowhere.
- `noauthor_full_nodate` is a malformed Zotero web-capture duplicate of
  `koutsandreas_selection_2022`. Uncited, so harmless today; should be deleted.

**Unstarted**
- Every suggested fix. **Nothing was applied** — the audit was read-only and
  edits to a cited paper's treatment are `PRJ93_RULES.md` gate 2 anyway.
- The eleven-document notebook reload that would convert 11 UNVERIFIED into
  checked results. Until it happens, the W34 header sentence cannot be restored,
  and pipeline-spec stage 6 cannot report a complete pass.
- Zotero was not queried directly this session — `ref.bib` served as the key/
  title/author authority. The 106/122/109 source-count reconciliation is still
  open, and it is now sharper: the notebook is demonstrably missing at least two
  sources that `ref.bib` has.
- G1, G2, G3 still not put to Phuong. The audit strengthens the G1 and G2 cases
  (`kolassa_we_2023`, `chatfield_all-zero_2007`, `hewamalage_forecast_2023`).

---

## 2026-07-30 — Phase: citation re-verification + fix drafting

**Completed**
- Re-verified all 11 UNVERIFIED keys, plus `hancock_meta-analysis_2011`, against
  **full text in Zotero** rather than re-querying NotebookLM. All 11 resolved.
- Drafted replacement text for all 9 OVERSTATED and the 1 WRONG-SOURCE.
- **Nothing applied. Nothing pushed to Overleaf.**

**Artifacts written**
- `brain/ledger/citation_fixes.md` — 10 fixes, each with the current sentence
  verbatim, the replacement, and the evidence forcing it. Plus three optional
  tightenings and one code-check item.
- `brain/ledger/citation_audit.md` — appended a Revision section superseding the
  first pass's counts. First pass left intact for the audit trail.

**Revised totals: SUPPORTED 74, OVERSTATED 9, UNSUPPORTED 0, WRONG-SOURCE 1,
MISSING-KEY 0, UNVERIFIED 0.**

**Token discipline observed**
- Zero papers read by me. `zotero_get_item_fulltext` warns 10k+ tokens per
  paper; 12 papers were delegated to 5 subagents returning verdict + quotes
  only, each capped at 250 lines.
- No `.tex` file opened this session.

**Findings that change the record**
- **`hyndman_another_2006` does not define the seasonal MASE.** The 2006 IJF
  paper scales by the in-sample MAE of the **plain naive (random-walk, lag-1)**
  method: $q_t = e_t / [\frac{1}{n-1}\sum_{i=2}^{n}|Y_i - Y_{i-1}|]$. It contains
  no seasonal-naive denominator and no seasonal variant; the only generalisation
  it offers is multi-step. The seasonal lag-$m$ form is from the later Hyndman &
  Athanasopoulos formulation. **`methodology.tex` cites the 2006 paper for a
  definition it does not give — on the exact topic of Fatal 1 and Fatal 2.**
  This is the most consequential finding of either pass.
- Same paper, unused and directly useful: MASE is the only measure in its tables
  usable on intermittent series, and it is undefined only "when all historical
  observations are equal" — Hyndman & Koehler's own statement of the boundary
  G2 is about.
- **`meyer_conceptual_2004` never claims misses erode reliance.** He ties
  reliance to sensitivity ($d'$) and operator experience. The compliance /
  false-alarm half is confirmed verbatim. His term is "cry-wolf **syndrome**".
  This is the anchor of §rw-evaluation and of the cost-asymmetry framing.
- **`wickramasuriya_optimal_2019` optimality is conditional on unbiasedness** —
  BLUE-type, "best (minimum variance) linear unbiased reconciled forecasts". On
  an 82%-zero series with a median-optimising metric the base forecasts have
  every reason to be biased, so MinT's guarantee may not hold for this estate.
  Bears on the MinT 0.662 vs disaggregation 0.734 result.
- **`hancock_meta-analysis_2011` was mis-marked in the first pass.** The full
  text does split robot factors into performance ($\bar r = +0.34$) and
  attribute ($\bar r = +0.03$) subcategories. Verdict corrected to SUPPORTED.
- **`guo_calibration_2017` yielded the ECE implementation spec** needed for G3:
  $\text{ECE} = \sum_{m=1}^{M}\frac{|B_m|}{n}\left|\mathrm{acc}(B_m) -
  \mathrm{conf}(B_m)\right|$, equally-spaced bins $I_m = ((m-1)/M, m/M]$,
  **M = 15** in the paper's experiments, plus the reliability-diagram
  definition. G3 no longer needs a design step.
- **`park_generative_2023` reflection is importance-triggered, not periodic** —
  fires when summed importance of recent events exceeds 150, "roughly two or
  three times a day". The chapter says "periodic". A threshold trigger is a
  closer analogue to a band breach than a clock, which helps W28.
- **The first pass's framing was wrong in one respect.** The 11 claims were not
  unverifiable — they were verifiable in Zotero but not in NotebookLM. The
  notebook gap is a tooling gap. But the sources that could not be checked were
  hiding three real defects, so the gap was not harmless.
- **Potential implementation bug, not a citation issue.** Per
  `syntetos_categorization_2005`, $v$ is the squared CV of demand sizes
  **conditional on demand occurring**, not of the raw zero-inclusive series —
  the subagent names computing it zero-inclusive "a very common
  misimplementation". If the project's ADI/CV² figures (BH 1.35/0.57, Ellel
  5.63/0.98, TRT 1.18/0.61) were computed zero-inclusive, every intermittency
  classification moves, and W23 already turns on BH's 1.3256 sitting between the
  SBC and Kostenko constants. **Not checked** — a code question, outside this
  task. Goes to `code_vs_paper.md` if confirmed.
- Also from that paper: cutoffs are strict ($p > 1.32$, $v > 0.49$); the
  chapters write $\ge$.

**Unstarted**
- ~~All ten fixes. None applied.~~ **Gate 5 APPROVED and NINE OF TEN PUSHED
  2026-07-30.** Five `write_section` calls, targeted — no whole-file overwrite,
  each its own commit:
  - `literature_review.tex` §rw-rhythm — fixes 1 (Schmidt), 2 (Tan/TimesFM
    misattribution), 3 (Kolassa coherence scope), 4 (M5 metric attribution),
    10 (MinT unbiasedness). Also renamed Moirai 2.0 so the 1.0/2.0 lineage
    reads correctly.
  - `literature_review.tex` §rw-surfacing — fix 5 (τ-bench 35.2%).
  - `literature_review.tex` §rw-evaluation — fixes 6a (JUDGE-BENCH), 9 (Meyer
    compliance/reliance). Added Hancock's $\bar r$ figures while in there,
    since the re-verification supplied them.
  - `literature_review.tex` §rw-synthesis — fix 7 (PRISM). The corrected
    version now names the unmeasured-calibration gap as part of what the
    contribution addresses.
  - `methodology.tex` §sec:agent — fix 6b (JUDGE-BENCH, second occurrence).
- ~~Fix 8 HELD.~~ **PUSHED 2026-07-30** once Phuong added FPP3 to Zotero and
  synced `hyndman_forecasting_2021` into `ref.bib`. **All ten fixes are now
  applied.** Reading §sec:ruler confirmed the defect was real and not merely
  loose wording: Equation~\ref{eq:mase} defines the denominator at lag $m$ with
  $m=7$ — unambiguously seasonal — while attributing it to the paper that
  defines only the lag-1 form.
- **OPEN — authorship renders wrong.** The synced entry catalogues FPP3 as
  `author = {Hyndman, Rob J.}` with `editora = {Athanasopoulos, George}` /
  `editoratype = {collaborator}`. FPP3 is genuinely co-authored; this is a
  library-catalogue artefact. As it stands the citation prints as
  "Hyndman (2021)", not "Hyndman & Athanasopoulos (2021)" — which is not what
  gate 2 approved. Contained for now because fix 8 uses `\citep`, so no author
  name appears in the prose; the mismatch is confined to the parenthetical and
  the bibliography. Fix in Zotero by promoting Athanasopoulos to a second
  Author and re-syncing, or hand-edit to
  `author = {Hyndman, Rob J. and Athanasopoulos, George}` and drop the two
  `editora*` fields.
- **Post-sync integrity check: CLEAN.** Phuong's Zotero→Overleaf sync was
  verified against the pre-sync key inventory. **111 → 112 entries, and the only
  addition is `hyndman_forecasting_2021`.** No key missing, no key added beyond
  that one, no duplicates, still exactly one `.bib` file. `angelopoulos_conformal_2023`
  still resolves to "Conformal Prediction: A Gentle Introduction"
  (Angelopoulos & Bates) and `angelopoulos_conformal_2023-1` still to "Conformal
  PID Control" — **the W48 repoint did not recur.** Twelve spot-checked titles
  all match what the audit recorded. The 84-key verification therefore still
  stands after the sync; it did not need redoing.
  **Recorded because the caution below was not vindicated by the outcome:** a
  targeted single-entry sync did not drift the file. That is evidence about this
  workflow, not proof it is always safe — W48 happened on a full refresh of a
  linked file, which is a different operation from adding one item.
- ~~**`ref.bib` NOT touched, and a refresh is NOT recommended.**~~ Superseded by
  the clean result above; retained for the reasoning. W48 records that
  a Zotero-linked refresh silently repointed `angelopoulos_conformal_2023` and
  the document still compiled clean. **This audit has just verified that that
  key currently resolves correctly** (Gentle Introduction, which is the right
  source for the two-sided bound it is cited for). A refresh now risks
  re-breaking the one key already known to be fragile, and would put all 84
  verified keys back in doubt. Recommendation on file: hand-insert the single
  `hyndman_forecasting_2021` entry, do not regenerate. Entry prepared in
  `citation_fixes.md`.
- ~~Gate 2 open on fix 8.~~ **RESOLVED: Phuong approved option B** — cite
  Hyndman & Athanasopoulos (FPP3, 2021) for the seasonal MASE denominator,
  defined in its §5.8. Fix 8 updated to option B.
  **But the Zotero push failed.** `zotero_add_by_isbn` returned "Cannot perform
  write operations in local-only mode. Add ZOTERO_API_KEY and ZOTERO_LIBRARY_ID
  to enable hybrid mode." `PRJ93_RULES.md` requires the agent to push new papers
  to Zotero rather than hand them over; **that mechanism does not currently
  exist.** The BibTeX entry (`hyndman_forecasting_2021`, written in the file's
  own `author_firstword_year` convention) is in `citation_fixes.md` for manual
  addition to both Zotero and the Overleaf `ref.bib`. Do NOT regenerate
  `ref.bib` — the Better BibTeX re-export hazard breaks ~60 citations.
  `tooling_verdict.md` amended: **the Zotero PASS covers reads only.**
- The CV² zero-inclusive code check.
- Notebook reload for `hyndman_another_2006` and `syntetos_categorization_2005`,
  still absent from it. Lower priority now that Zotero has served, but the
  106/122/109 reconciliation is still open and now demonstrably asymmetric.
- G1, G2, G3 still not put to Phuong. Fix 8 and fix 3 both sharpen G1; fix 10
  adds a second reason it propagates.

---

## Session 2026-07-30/31 — numerical-claim audit

Phase: pipeline stage 17 (repo result-file trace on every number) + stage 14.
**Audit only. Nothing changed on Overleaf, no number corrected.**

Artefact written: `brain/ledger/numbers_audit.md` — 340 numerical claims from
`methodology.tex` (15 sections) and `chapters/results.tex` (23 sections), each
traced to a `brain/log/` report or a code constant. Six parallel extractors, one
per chapter slice; chapters pulled section by section, never end-to-end.

**Counts: MATCHES 309 · STALE 2 · MISMATCH 17 · UNTRACEABLE 9 · split 3.**

Four MISMATCHes change a conclusion: the served model ranks *second* of nine on
the six-fold window, not fifth (report 43's own prose contradicts its own
table); "273 origins reject" is false — the model sits in the 90% MCS at p=0.11;
the Ellel flip is a store-ceiling effect, not a fold-count effect; and a scored
rung (0.728) is printed `n/a`.

**Two open items closed by this audit.**

1. **The CV² zero-inclusive check — PASSED.** `eval/intermittency_diagnostic.py`
   takes `sizes = size[occ]` before the coefficient of variation, i.e.
   conditional on demand occurring, which is the SBC definition. No
   classification moves. Remove this from the open list.
2. **No stale figure survived into either chapter** despite G15 → G16 → G17a–j.
   The correction passes propagated cleanly.

**New for `code_vs_paper.md` (not yet written):** `select_sba` implements
`cv2 < 2.0 - 1.5*adi`; the published Kostenko–Hyndman rule is *v > 2 − (3/2)p*.
The chapter states the correct rule, so the chapter's SBA result currently has
no repo artefact behind it. Fix the code and re-run, or the claim is unevidenced.

**Two source-level corrections needed in the repo, not the chapters:**
report 43's "ranks fifth" prose, and the reversed SBA inequality in
`docs/Prj93_external_examiner_assessment.md` (:153, :1277, :2154).

**Largest single reporting gap:** `tab:ladder` — 27 six-fold means, bolded
winners, no dispersion, no n. Report 43 §3 holds sd/se/n for every cell. Same
pattern in `tab:bases` and the weather table. The remedy is transcription from
committed result files, not new work.

**Spec defect found.** `02_prj93_pipeline_spec.md` defines the repo result-file
trace against `brain/log/*result*.md`. **No file matches that glob.** Correct the
spec to `brain/log/*.md`.

Unstarted: G1, G2, G3 still not put to Phuong — now overdue, both are "before
Phase B". G1 is further sharpened: `eval/mcs_L1_results.json` already holds
`mcs_secondary_rmsse` for every venue, so the RMSSE-vs-MASE decision can be made
against computed numbers rather than in the abstract. Also unstarted: the
`code_vs_paper.md` entry above; the three optional citation tightenings; W54 gap
papers acquired but uncited; the 106/122/109 notebook reconciliation; the FPP3
`editora` field, which still renders "Hyndman (2021)".

## Session 2026-07-31 (cont.) — audit resolution

Artefact: `brain/ledger/numbers_audit_resolutions.md`. STALE 2/2 resolved,
MISMATCH 16/17, UNTRACEABLE 7/9.

**Method correction that matters for every future trace.** The numbers audit
searched `brain/log/*.md` and the code only. There is a SECOND result corpus of
~30 per-script `.md`/`.json` artefacts beside the code they were produced by.
**They are primary; `log/NN_*.md` are narrative syntheses and lose on
disagreement.** This corrected one audit finding outright (the chat-log cluster
band, where the chapter was right and report 51 was vague) and supplied exact
values for a dozen others. Update the spec's verification vocabulary.

**Code changed (uncommitted): `eval/intermittency_diagnostic.py:89`.** The
Kostenko-Hyndman rule was implemented as `cv2 < 2 - 1.5*adi`; the published rule
is `v > 2 - (3/2)p`. Reversed. Now fixed. **Every SBA/Croston selection in the
repo inverts** — all six L1 venue/definition rows select SBA, not Croston, so the
chapter's claim was right and now has repo backing. At least 21 of 32 L3 nodes
also flip. Recomputed arithmetically from committed ADI/CV2 (deterministic, no
model run needed).

**Still to do on it:** regenerate `eval/intermittency_L1.md` + the L3 report
(both carry a wrong "KH selects" column and the L1 header states the rule
backwards), and correct report 45 §1d, which states the SBA condition and then
concludes Croston in the same sentence. **Blocked in this checkout: no
virtualenv exists and duckdb/holidays/pandas are not installed**, so the
generator could not be run. Regenerate the L3 report deliberately — it is
store-ceiling-dependent and will otherwise confound the constant correction with
data drift.

**Report 43:127 needs correcting at source.** "chronos2_exo ranks fifth" — the
table above it makes it second. The sentence swapped its subject: fifth belongs
to robust_dow at 273 origins. Only instance in the repo.

Two items genuinely unresolvable by re-running: **ECE** (needs S8b's ~644 live
calls behind the missing API key — this is G3/G4, still open) and the **power
calculation** in the interval-calibration section, which does not exist in any
form; the section is titled "Measured with power" but holds only a 0.90^7
window probe. The coverage n (1750/1659/1274) makes a real one cheap.

Nothing pushed to Overleaf. Gate 5 untouched. G1/G2/G3 still not put to Phuong.

## 2026-07-31 — Overleaf restore closed; methodology corrections landed

- **Incident closed.** The compile error `Reference 'sec:res-demonstration'
  undefined on input line 770` was the last symptom of the five subsections I
  destroyed with `write_section`. Both remaining subsections restored;
  `get_sections` returns **22 headings** and the label set matches the pristine
  `af6eea9`. See `overleaf_incident_2026-07-31.md`.
- **Method that worked:** abandon `write_section` entirely, rebuild the file off
  current remote HEAD, verify by label-set diff, push once with `write_file`.
  Never patch a damaged file section by section.
- **`git push` from the local Overleaf clone is blocked** by a protected-branch
  hook. The Overleaf MCP `write_file` is the only push route.
- **methodology.tex corrections pushed** — 5.92 trading days; 735 total / 376
  staff messages; five rungs and nine scored entrants; fifteen covariates;
  injection subsample n=120 seed 95 with Ellel excluded; per-venue
  Angelopoulos–Bates bound.
- **New finding, not from the audit:** the results ladder table was missing
  `rung4_chronos_bolt` (0.796 / 0.612 / 0.601) — a model in every MCS retained
  set. Row added; "ninth entrant" → "tenth". No served model changes. Recorded
  in `numbers_audit_resolutions.md`.

### Still open
- G1, G2, G3 have never been put to the user and are all past "before Phase B".
  G1 is ready to decide: `eval/mcs_L1_results.json` already holds
  `mcs_secondary_rmsse` for every venue.
- ECE remains blocked on S8b's ~644 live calls behind the missing API key (G3/G4).
- `eval/intermittency_L1.md` and the L3 report still carry the reversed-K&H
  "Croston" column. The code fix in `eval/intermittency_diagnostic.py` is
  uncommitted; regeneration is blocked (no virtualenv; duckdb/holidays absent).
- Report 45 §1d and report 43:127 still carry the errors the chapters no longer do.
- `docs/Prj93_external_examiner_assessment.md` states the SBA inequality
  reversed at :153, :1277, :2154.

## 2026-07-31 (second entry) — flagged items resolved

Committed `5f77591` (brain/ paths only; `.claude/settings.json` was left alone —
it shows as modified by the graphify hook, not by this work).

- **SBA rule fixed and its origin identified.** The reversed inequality came
  from Finding 19 of the external examiner assessment, which misquotes it at
  three sites; annotated there rather than rewritten. Script header strings
  fixed too — they would have reintroduced it on regeneration.
- **L3 verdict derived**: 20 of 20 intermittent nodes select SBA, and the
  unanimity is structural (`2 - (3/2)(4/3) = 0`), so classified-intermittent
  entails selects-SBA. Both chapters now state this as geometry, not evidence.
- **Regeneration blocker is worse than recorded**: `store/brain.duckdb` is
  absent, so the script cannot run here at all. Derived columns recomputed
  arithmetically from committed ADI/CV2 (exact), disclosed in each file.
- **Report 43 rank prose fixed at source** (second of nine, 1.312 vs 1.267).
- **G1 measured**: RMSSE agrees with MASE on every retention decision at
  alpha = 0.10. One disagreement at alpha = 0.25 at Two River Taps, where the
  served ETS is eliminated under RMSSE and the rank order inverts. Written up
  as `sec:res-rmsse`.
- **Overleaf**: 23 headings on results (new `sec:res-rmsse`), 15 on methodology,
  verified after every write. `write_section`'s parameter is `newContent`, and
  it is safe when the replacement includes any nested subsections in full —
  used that way for all three results edits.

### Still open
- **G1 and G2 need your decision** — evidence is now assembled for both; neither
  has been put to you. G1's motivation is partly dissolved by G2's answer, which
  is why they should be taken together in that order.
- ECE/S8b unchanged: blocked on live calls behind the missing key (G3/G4).
- End-to-end regeneration of the intermittency artefacts needs the warehouse.

## 2026-07-31 (third entry) — warehouse restored, artefacts regenerated

- Store restored but **five weeks stale** (ceiling 2026-05-31 vs 2026-07-07).
  `assert_store_ceiling` caught it; `sim.restore_clock` fixed it. Held-out
  8-14 July window verified still absent afterwards.
- **L1 regenerated identical** to the hand-derived correction — confirms
  `5f77591` with real provenance.
- **L3 moved** (store-ceiling dependent, as report 45 warned): 32 nodes /
  285 days / 21 intermittent / 31 of 32 select SBA. Now agrees with report 45's
  own node counts. Chapters updated 20 -> 21.
- Three generator defects fixed so the report cannot go stale again (hardcoded
  worked example pointing at a departed node; unformatted cutoff; missing
  structural note). Committed `1641dbc`.
- **`.venv-run` now exists** (Python 3.14 + duckdb/pandas/numpy/sklearn/
  statsmodels) and the warehouse is live, so previously blocked re-runs are
  possible. Backup of the pre-restore_clock warehouse at `/tmp/brain.duckdb.bak`.

### Still open
- **G2 needs your decision** (Ellel scale basis) — the last gate that is not
  blocked on anything.
- ECE/S8b still blocked on live calls behind the missing key (G3/G4).

## 2026-07-31 (fourth entry) — store ceiling durability, verified not asserted

The database now holds June (25 days) and July W1 (7 days); ceiling 2026-07-07;
held-out 8-14 July still empty. Verified on the working store AND on a
from-scratch rebuild at a throwaway path — both land on identical counts.

**The durability machinery already existed and is sound.** `store/build.py` is
the one command (normalise -> warehouse -> restore_clock -> assert); every
result-producing script calls `assert_store_ceiling()`; both ingest sources
(`sim/june2026_actuals_l3_raw.json`, `sim/july2026_actuals_l3_raw.json`) and all
three scripts are committed, so the ceiling is reconstructible offline forever.

**What actually failed was not the design.** A backup was restored from a
snapshot taken before the clock was last advanced, and nothing re-ran it. The
file looked healthy; `assert_store_ceiling` caught it. That is the system
working.

**Deliberately NOT done: folding June/July into the CSV seed.** It would make a
bare `warehouse.build()` land at 0707 and remove the extra step — but it would
destroy the provenance split the manifest keeps between till-export rows and the
`june2026_ingest` block ("MCP-SIM aggregate, no intraday or tax breakdown").
On a project that argues provenance this hard, collapsing two sources into one
seed to save a command is the wrong trade.

Committed `f8bcf1f`: the docstrings blamed pytest, which conftest's throwaway
`BRAIN_DUCKDB_PATH` made untrue — a reader chasing that would have looked in the
wrong place. Error message now names `python -m store.build` (the whole chain)
rather than `sim.restore_clock` (one of its three steps).

**Honest limit:** the ceiling can still be cracked — by a manual rebuild or a
stale backup. It cannot be cracked *silently*, and repair is one idempotent
command. That is the guarantee available; "impossible to crack" is not.

---

## Session 2026-07-31 (5) — released-code comparison, stage 6/23 verification

Wrote `ledger/code_vs_paper.md`: 21 external methods audited against the paper
and, where released, the authors' code. Four HIGH findings, all in
`hierarchy/reconcile.py` and `conformal/methods.py`; details in that file.

Verification routes and their strength are tabulated at the head of the artefact.
Two things worth carrying forward independently of the findings:

- **`graphify query` worked on this run** (421 nodes, located every method entry
  point asked for). `ledger/tooling_verdict.md` records it as hanging
  indefinitely. That entry is now contradicted and should be re-tested rather
  than trusted.
- **NotebookLM does not hold the M5 RMSSE definition.** It answered from outside
  its sources and said so. Any statement about M5's denominator is currently
  unevidenced by anything this project holds — see M8. Adding the M5 evaluator
  or competitors' guide to the notebook is a G7 addition.

Unstarted: G2 (Ellel scale basis), still the last gate not blocked on the
missing key. Not opened, per the one-gate-at-a-time rule.

---

## Session 2026-07-31 (7) — A6 selection correction, render defect closed

Phase S7 G17i. Closes the last two HIGH rows of `ledger/code_vs_paper.md` and the
defect report 52 recorded as found-and-not-fixed.

**Completed.**

- **M1 CLOSED.** `_croston_comparison` no longer selects on the test block. The
  estimator is chosen ex ante by `select_sba(adi, cv2)`; whether it displaces the
  DOW-median is a MASE contest on a validation block (last `TEST_WEEKS` of
  training), winner refitted on the whole training span. Adoption went 0 of 16 to
  1 of 16; L2/L3 band coverage fell 3 to 6 points. Isolated from an unrelated
  39 -> 41 node-set move by re-running the pre-change code on the same store.
- **M4 CLOSED.** MinT trust weight now takes the variance of the SIGNED residual;
  absolute values feed the conformal scores only. The M4 claim that
  `Var(|e|) < Var(e)` always is corrected in the ledger: it holds only where
  residuals change sign.
- **`render()` KeyError CLOSED.** `arm_metrics` emits string `per_step` keys, so
  the in-process and JSON-round-trip paths index alike. Render-only run reproduces
  `interval_calibration.md` byte-identical, so report 52's numbers are untouched.

**Artifacts written.** `log/53_G17i_A6_Selection_Correction.md` (new);
`log/14_Fidelity_Corrections_Build_Report.md` (D7 bullet annotated in place, not
rewritten); `ledger/code_vs_paper.md` (M1 + M4 resolutions, summary table);
`hierarchy/reconciliation_forecast.md` (regenerated); six new tests in
`tests/test_a6_reconcile.py`.

**Two findings to carry.** The Kostenko-Hyndman rule is degenerate over this
trigger set (at ADI >= 4/3 the cutoff is already <= 0, so SBA is always selected).
And the single adoption wins validation by 0.4% then loses on test, which is
visible evidence that validation selection at this series length is noisy.

**Unstarted.** The written path: `results.tex` and `methodology.tex` still carry
the M1/M4 remedy as "outstanding rather than presented as done", which is now
false and needs restating. NOT pushed to Overleaf; gate 5 not put to the author
yet. Also open: M23 (LOVO dispersion), M24 (ablation dispersion), M26 (ECE bin
edges, before the G3 ECE run), M8 (docstring + M5 source into NotebookLM), M11
(statsforecast cross-check on 3.12), M16 (temperature scaling unimplemented), and
G2 (Ellel scale basis).

**Gate 5 (Overleaf) taken 2026-07-31.** Two sections pushed: `Classifying the demand
pattern` (methodology.tex) and `Demand classification under corrected constants`
(results.tex). Both now record M1/M4 as done rather than outstanding, state the
validation-block rule, and report the node-level coverage the earlier text withheld.
No new citation keys. The third target named before the gate, a reconciliation coverage
table in results.tex, does not exist: the chapter withheld those figures entirely because
of this defect, so the correction unblocked them rather than restating them, and they are
now given in prose in that section.

---

## Session 2026-07-31 (8) — dispersion sweep and the calibration leg

Phase S7 G17j. Report 54. Closes M11, M16, M23, M24, M26 and the local half of M8.
The NotebookLM source addition (M8, G7) was excluded by instruction as the live-call item.

**Completed.** A7 and A14 now carry dispersion instead of a win count and a 1% threshold.
ECE moved to Guo's `(lo, hi]` edges and 15 bins BEFORE the G3 run, so nothing is
restated. Temperature scaling implemented and wired in. Croston/SBA verified against
statsforecast 2.1.1 on 3.12 at 1.3e-15. `rmsse_m5` docstring softened and made
basis-independent.

**Two findings that matter more than the closures.** A7's 2-of-3 majority gate passes,
but pooled across the estate transfer and naive are NOT distinguishable (90% CI
[-0.242, +0.036], both retained). The gate criterion was deliberately left unchanged.
And at six folds the moving-block bootstrap is DEGENERATE - `block_len` clamps to
`n_obs`, every resample is the sample, CIs come back zero-width and MCS p-values pinned
to 0/1. The first A14 run on that basis "shipped" a feature 6.5% worse than baseline.
Guarded by `_block_len` and by widening the grid to 39 disjoint folds.

**Artifacts.** `log/54_G17j_Dispersion_And_Calibration_Sweep.md`; regenerated
`transfer/transfer_results.md`, `signals/feature_ablation.md`,
`eval/intermittency_diagnostic.md`; ledger resolutions.

**Unstarted / carried.** The written path has NOT been updated for this sweep and no
Overleaf push was made: A14's numbers all moved (baseline MASE 1.5460 -> 0.9551) and the
A7 section needs the estate-level non-separation added. That is a gate-5 decision. Also
open: M8's NotebookLM source (G7), M2 (split-conformal on in-sample residuals, HIGH,
untouched), M5/M6/M7 (MEDIUM), and G2 (Ellel scale basis).

**Gate 5 (Overleaf) taken 2026-08-01, M8 consequence.** One section pushed:
`Measuring accuracy on a series with closed days` (methodology.tex). Records that the
lag-one RMSSE denominator was verified as `1/(n-1) sum_{i=2}^{n} (y_i - y_{i-1})^2`, that
the audit's own earlier n-vs-n-1 claim is withdrawn, and that M5's post-first-sale
restriction is both unevidenced by anything held here and inapplicable (each venue series
begins at its own first record). No new citation key was added - stating the source by
name would need gate 2, and the sentence is written to stand without it.

**Checked and NOT changed.** The two items flagged at the end of session 8 were verified
against the LIVE Overleaf files and neither needs a chapter edit: A7 (LOVO transfer) and
the A14 GBM feature ablation do not appear in either chapter. The only ablation in
results.tex is the five-arm weather-basis study from `eval/weather_basis.py`, which this
work did not touch. A local `git show HEAD:chapters/results.tex` scan suggested the same
but was INVALID as evidence - the tracked copy is stale at 239 lines and lacks sections
known to be live - so the conclusion rests on reading the Overleaf files directly.
Incidental cross-check: methodology already states the origin step lifts Beer Hall from 39
origins to 273, which matches the 39-at-step-7 grid session 8 moved A14 onto.

---

## Session 9 — 2026-08-01 — G17k: the last of the ledger

**Completed.** Every remaining row in `ledger/code_vs_paper.md` is now dispositioned; the
open column is empty for the first time.

**M2 (HIGH)** was the real one. A6's node bands were named "split-conformal" and were not:
the DOW median was scored against the span it was fitted on, so the quantile was of an
in-sample residual with no coverage guarantee. The reconciliation now walks back from the
calendar end in four spans (fit | validation | calibration | test), each doing one job, with
the forecaster fitted strictly before the calibration block and the SAME fit producing both
the calibration scores and the test forecasts. The WLS_v weights moved off in-sample
residuals for the same reason.

**M5** renamed the diagonal reconciler WLS_v throughout code and artefacts, per
Wickramasuriya et al.'s own convention; the persisted DB key `mint_dowmedian` is left alone
deliberately. **M6** killed the last live ADI 1.32 literal. **M7** made the conformal clamp
countable (`conformal_min_n`, tallied and reported; 0 of 60 on the Beer Hall). **M9** added
the band-units caveat to methodology's Detection section. **M19** stated that ETS means
ETS(A,A,A). **M22** turned out to be already written in both chapters and needed no edit.
M10/M12/M14/M17/M20 were "action: None" verification records; **M13 is carried into G2**.

**Two findings that outrank the closures.** First, the published direction of the M1/M4
correction was half wrong: category coverage RISES 77.6 to 85.1 at nominal ninety, it does
not fall. Only item coverage falls, 77.6 to 72.1. Four controls isolate it: shortening the
fit span is nearly free (1.5pp at L2, 0.1 at L3), the band is the whole story, and the band
change is asymmetric because the in-sample quantile spans 343 days against a 56-day
calibration block. Second, one node adopts on a 0.21% validation margin and is then 96%
worse on test, costing 8-9pp of item coverage and moving the keg order 1.09 to 1.39. The
adoption rule was deliberately NOT given a margin.

**Artifacts.** `log/55_G17k_Split_Conformal_And_Naming.md`; regenerated
`hierarchy/reconciliation_forecast.md` and `conformal/conformal_L1_beer_hall.md`; ledger
resolutions for M2/M5/M6/M7/M9/M22 plus disposition of the seven LOW rows. Overleaf: six
section pushes across both chapters.

**Caught, and worth carrying forward.** `write_section` replaces a section THROUGH TO THE
NEXT SAME-LEVEL HEADING, so it silently deletes nested subsections. It destroyed
`sec:exo` and `sec:occurrence`; both were detected by diffing `get_sections` against the
structure recorded before the push, and restored verbatim. Any future `write_section` on a
section containing subsections must include them in `newContent`. Also caught on read-back:
one dangling `\ref` that would have compiled to `??`, and an inherited overstatement ("every
one of the sixteen nodes" where the sixteenth has both scores undefined), now corrected in
both chapters and in report 55.

**A5's gate is FAILING and nobody would have noticed.** Regenerating the A5 artefact moved
every figure and flipped Mondrian@80% to 75.1 against a +/-3pp tolerance. A stash control
proves this session's edit changes no band: the committed artefact was simply never
regenerated after the warehouse restore of commit `1641dbc`. No published number is
affected (none of those figures appears in results.tex). **But the staleness sweep across
all other artefacts has NOT been done, and A5 was found by accident.** That is the highest-
value unstarted item.

**Unstarted / needs a human gate.**
- **Gate: the adoption margin** (one-standard-error rule vs the bare inequality). Evidence
  is in report 55 and now in both chapters; the decision is Phuong's.
- **Gate: G2**, the Ellel scale basis. Still the last gate not blocked on a missing key, and
  M13 now depends on it.
- **Gate: the citation key** for the M5 metric source (Hewamalage et al., arXiv 2108.03588).
- The artefact staleness sweep against the restored warehouse.
- G3's ECE run still needs `ANTHROPIC_API_KEY`.

## Session 9 addendum — 2026-08-01 — G17l: the adoption-margin gate

**Gate taken.** Phuong chose option 3: pre-register the one-standard-error margin, then
re-run. Specification committed at `1b649dc` before any implementing code existed; outcome
appended to the same file afterwards.

**Outcome.** The prediction held. `Lager - BH` criterion `+0.026`, adoption refused, **0 of
16 nodes now adopt**. Coverage moves to run D (L2 65.8 / 85.1, L3 60.0 / 72.1) and the keg
order to 0.72. The report states explicitly that the coverage gain is arithmetic, not
evidence for the rule, since it comes from removing a forecaster already measured worse.

**Two of my own errors, corrected rather than quietly fixed.** (1) The pre-registration's
"already measured" block gave the no-adoption keg order as 1.09; it is 0.72, and 1.09 was
the PRE-M2 artefact's figure. That error had already propagated into report 55 and the
results chapter; all three are corrected. (2) A test I wrote asserted that a challenger
winning "by a hair" must be refused. False: a uniformly tiny win has uniformly tiny
dispersion and correctly clears a one-SE rule. The rule refuses wins small RELATIVE TO
their variability. Test rewritten to pin both directions; the distinction is now stated in
both chapters.

**Two near-misses on the push, both caught mechanically.** An unresolvable
`\citet{breiman_classification_1984}` (not in ref.bib, and adding a cited paper is a gate)
and a markdown `**bold**` in LaTeX. A post-push integrity check is now standing procedure:
every `\cite*` key against ref.bib, every `\ref` against every `\label`, and a grep for
markdown. Both chapters currently clean on all three.

**Artifacts.** `log/56_G17l_Adoption_Margin.md`,
`ledger/prereg_adoption_margin_2026-08-01.md`, regenerated
`hierarchy/reconciliation_forecast.md`, new results subsection `sec:res-margin`.

**Still open, all needing a human decision or a key.**
- **Gate: citation keys.** Breiman et al. 1984 (one-SE rule) and Hewamalage et al. arXiv
  2108.03588 (M5 metric) are both described in prose with no `\cite`, because adding a
  cited paper is a gate. This is now the cheapest outstanding item.
- **Gate: G2**, the Ellel scale basis. M13 depends on it.
- The artefact staleness sweep against the restored warehouse. A5's failing gate was found
  by accident and the sweep has not been done. Highest-value unstarted work.
- G3's ECE run needs `ANTHROPIC_API_KEY`.

## Session 9 addendum 2 — 2026-08-01 — G17m: staleness sweep and G2

**G2 CLOSED, and M13 with it.** The decision was never actually open: `sec:res-basis`
already states it with evidence (Ellel's four bases give bootstrap widths 52.5/45.2/42.2/
65.6 per cent; the trading bases induce a spurious MASE of ~0.09) and cites
`chatfield_all-zero_2007`. Same failure mode as M22 — prose written, row not closed.
What WAS open was enforcement: the decision lived as a private dict duplicated in
`eval/group_icl.py` and `eval/weather_basis.py`. Hoisted to `config.VENUE_SCALE_BASIS` /
`VENUE_LOSS` / `is_scaled_venue`; both artefacts regenerate byte-identical, so no behaviour
changed.

**Staleness sweep done.** 5 artefacts genuinely stale, 5 reproduce, 3 excluded by design,
1 crashed, 1 false positive. **No published number affected** — every moved figure was
checked against the live results chapter and none appears there.

- **Two River Taps reproduces byte-for-byte**, which is the control that makes the
  diagnosis stick: the movement is recovered history, not a code regression.
- **The briefing was the worst**: committed as `as_of 2026-05-31`, 0 items, "quiet day
  nothing above threshold". Actually 11 continuing items. The flagship deliverable was on
  record showing nothing.
- **A real regression found only by regenerating**: `signals/weather_diagnostic.py` had
  been crashing since report 54's M24 change (`_eval_cols` gained a third return value,
  four call sites still unpacked two). Fixed, and the run then reproduced the committed
  artefact BYTE-IDENTICALLY, which verifies the repair restored prior behaviour rather
  than merely making the module terminate. The artefact was never stale; the generator
  was broken. (An earlier draft recorded this as unfinished; a first check had been run
  from the repo root, where the path does not exist, so git reported no diff on a file it
  could not see.)
- **One false positive kept honest**: `chatlog_kb_gap.md` was not stale, only produced at
  `--top 12` versus the default 5. Regenerating at the default would have silently
  truncated a committed artefact under the banner of fixing staleness.
- **The ladder was deliberately NOT re-run.** `tab:ladder` is the committed gate the
  chapter audits; re-running would replace the decision under audit, and this environment
  has no torch so rung 4 would be destroyed. Instead its caption now names its own per-venue
  ceiling, closing a real gap against the chapter's blanket "2026-07-07 unless stated".

**Citations.** `hewamalage_look_2021` now exists and is cited in the M8 paragraph, with a
sentence noting the source is a stability critique of the M5 setup, which strengthens the
project's practice of reporting a scaled error alongside an unscaled proper score.
**`breiman_classification_1984` was NOT added** — `ref.bib` has 113 entries and contains no
Breiman, Olshen, Stone or CART entry. The one-standard-error rule stays in prose.

**Open.**
- Breiman key still absent; add it and the `\citet` becomes a one-line follow-up.
- `transfer/lovo.py` scores Ellel on MASE and pools all three venues, violating G2 twice.
  Unpublished, so nothing is retracted, but fixing it means deciding what a pooled
  cross-venue statistic means when one venue admits no scale. Recommendation on file.
- `eval/chronos2_*` unverified against the restored warehouse: no torch here.
- G3's ECE run, parked by instruction.

---

## Session 9 addendum 3 (2026-08-01) — G17n: the environment closed, the artefact leak found

**Phase.** S9 G17n. Five requested items, all done, plus a sixth found while doing the
fourth which turned out to be its cause.

**Completed.**
- **Breiman placed.** `ref.bib` now has 114 entries and `breiman_classification_1984`
  resolves. Cited in `sec:res-margin` (`\citep`) and `sec:intermittency` (`\citet`, "the
  device introduced for tree pruning by"). Section counts unchanged, 15 and 25, so the
  report-55 `write_section` subsection-deletion failure did not recur.
- **The 8 failures were never schema or version problems.** `requirements.txt` declares
  pyarrow, pydantic, fastapi and openpyxl; the venv had none installed. Installing the
  file took the suite from 8 failed + 16 collection errors to 602 passed / 0 failed. No
  source change, no pin moved. The documented four-venv layout did not exist on this box;
  a single ad-hoc `.venv-run` had been partially populated and was not even gitignored.
- **torch resolved via the documented route.** `.venv-forecast` built on 3.12 from
  `requirements-forecast.lock.txt`: torch 2.12.1 and chronos 2.3.1 exactly. The lock
  header's flip warning was checked, not assumed — it names sklearn 1.8.0 and the lock
  pins 1.9.0, so the resolution is not the flipping combination. All 7 previously-skipped
  `test_foundation.py` tests pass; rung 4 is runnable here for the first time.
- **`requirements-eval.txt` was never resolvable.** It pinned `vus>=1.0` and vus has never
  published a 1.0 (PyPI tops out at 0.0.6), so `.venv-eval` could not be built from its own
  spec by anyone. Corrected to `>=0.0.6`. No number moves: WP10 computes VUS-PR from the
  pinned TSB-AD 1.5 and this fallback has never supplied the metric. With the venv built,
  the G2.2 Croston/SBA statsforecast cross-check **runs in band for the first time** (it
  carried a comment recording an out-of-band pass on statsforecast 2.1.1; that is the
  version it now passes on in band).
- **`warehouse.build()` signals at write time.** It always lands 5 weeks short, not
  sometimes, because the parquet seed permanently ends 2026-05-31. It now returns its
  ceiling and warns to stderr naming the fix. A warning not an exception, because
  `store.build` restores the clock on the next line and the hand-run sequence is
  legitimate; quiet on scratch/overridden stores so it does not fire 17 times per suite
  run. `config.SEED_CEILING` added — the date had been living in prose comments in four
  modules, the same duplication G2 removed for the scale basis. 4 new tests.
- **The truncating default is gone.** `DEFAULT_TOP` is now tied to `DEFAULT_CLUSTERS` so
  they cannot drift. The bare `python -m signals.chatlog_kb_gap` reproduces the committed
  `.md` and `.json` byte-identically. No Makefile exists, so code plus the two documented
  command sites is the standardisation.

**The sixth finding, which supersedes report 57's briefing diagnosis.**
- Report 57 listed `signals/briefing.md` as regenerated. **It was not** — last commit
  `dbcc525`, working tree identical to it. That was an overstatement, corrected here.
- The real cause: **a `pytest` run overwrites committed artefacts in the working tree.**
  conftest isolates the DATABASE and its docstring claims it "isolates every store write";
  that is true of DuckDB writes and false of artefact writes, because 23 modules resolved
  output paths from `STORE_DIR.parent`, which is the checkout regardless of
  `BRAIN_DUCKDB_PATH`. Demonstrated: `pytest tests/test_briefing.py` alone flips the
  artefact from `as_of 2026-07-07 / 11 continuing` back to `2026-05-31 / 0`. The committed
  "quiet day" briefing was **test output**, not a briefing against a short store.
  Regenerating it, report 57's proposed fix, would have been undone by the next pytest run.
- An mtime sweep over 32 tracked artefacts names exactly three the suite rewrote:
  `signals/briefing.md`, `eval/deviation_eval.md`, `eval/judge_prompts.md`.
- **Fix:** `config.REPORT_ROOT` (where artefacts are WRITTEN, overridable by
  `BRAIN_REPORT_ROOT`) separated from `STORE_DIR` (where the store is READ). The one-line
  alternative of redirecting `BRAIN_STORE_DIR` does not work — `line_items.parquet` and the
  parquet fixtures live under it, so it breaks every read. 30 call sites across 23 modules,
  all 24 affected modules import-checked. `signals/agent.py` corrected back to `BRAIN_DIR`:
  its `PROMPTS_DIR` is a committed INPUT (the frozen agent prompt) that had shared the
  artefact idiom by accident and would otherwise have vanished into tmp, breaking the
  freeze-before-evaluation guarantee `sec:agent` rests on.
- Verified in order: refactor behaviour-preserving (chatlog artefact byte-identical);
  suite touches zero tracked artefacts (mtime sweep); suite still green; **the regenerated
  briefing survives a full suite run**.

**Artifacts written.** `log/58_G17n_Environment_And_Artefact_Isolation.md`; regenerated
`signals/briefing.md` (as_of 2026-07-07, 11 continuing items); `.venv-forecast` and
`.venv-eval` built.

**Suite.** 614 tests in every venv, zero failures and zero collection errors in all three:
`.venv-run` 606 passed / 8 skipped (torch+chronos x7, statsforecast x1), `.venv-forecast`
613 / 1, `.venv-eval` **614 / 0**. Each venv now skips exactly what its own requirements
file excludes, and nothing else.

**Unstarted / open.**
- `eval/deviation_eval.md` and `eval/judge_prompts.md` are the other two artefacts the suite
  was overwriting, so both committed copies are test output. Now isolated and safe, but
  neither regenerated from its real entrypoint nor verified. Report 57 separately called
  `deviation_eval.md` orphaned, which contradicts the suite writing it; unresolved.
- Latent, recorded not fixed: artefact writers assume their output directory exists. The
  suite mirrors the checkout's directory names into its tmp root, which is scaffolding. A
  fresh deployment writing to an empty report root would still raise `FileNotFoundError`.
- The methodology chapter header comment still says "111 entries" and lists neither
  `hewamalage_look_2021` nor `breiman_classification_1984`. It sits outside any section so
  `write_section` cannot reach it; correcting it needs a whole-file push.
- **Gate: `lovo.py`'s pooled statistic** under G2, unchanged, recommendation on file.
- `eval/chronos2_*` now runnable (torch present) but not re-run against the warehouse.
- G3's ECE run, parked by instruction.

## Session 9 addendum 4 (2026-08-01) - G17o

Phase: artefact provenance closed, LOVO audited. Report
`log/59_G17o_Artefact_Provenance_And_The_LOVO_Audit.md`.

Completed:
- `eval/deviation_eval.md` regenerated from `python -m signals.deviation` at ceiling
  2026-07-07. Was test output at the seed ceiling; the committed copy had Ellel at
  z +6.22 "deviation up" on 2026-05-16, which is gone at the true ceiling.
- `eval/judge_prompts.md` regenerated from `python -m eval.judge`, byte-identical. It was
  never stale: the corpus is pinned by `config.AGENT_EVAL_STREAM_CEILING` so the injection
  oracle cannot slide into the live World Cup. Offline emit-prompts seam, no live calls.
- Report 57's "deviation_eval.md orphaned, its module no longer exists" corrected. Both
  clauses false; `signals/deviation.py` exists and owns the artefact.
- Report 58's "both committed copies are test output" corrected. True of one, not the other.
- LOVO audited. Confirmed unpublished in both live chapters (five search terms, zero hits).

Artefacts written: `eval/deviation_eval.md`, `log/59_*.md`; corrections in `log/57_*.md`
and `log/58_*.md`.

Unstarted / open:
- **Gate: `lovo.py` pooled statistic under G2.** Ellel on `calendar_lag7` plus a pooled
  MASE. Pooled headline is ALREADY null (-0.119 MASE, 90% CI [-0.242, +0.036]), so no
  positive claim is retracted; what changes is the 2-of-3 tally and the crossover table.
- **Gate: `lovo.py` foundation rung (NEW).** The gate's PASS was contingent on torch being
  absent. With chronos present `foundation_ok` evaluates False, because the
  `available: True` branch returns an instruction and no `beats_global_gbm` key. The
  zero-shot-vs-global-GBM evaluation was never implemented. Committed PASS not reliable.
- Two River Taps reports a post-closure trading day (2026-07-05, actual 0.0) in the
  deviation stream. Pre-existing, recorded not repaired.
- `signals/deviation.py` writes without `mkdir(parents=True)`; `eval/judge.py` does one.
- `eval/worldcup_fixture_probe.py` still scores Ellel on `calendar_lag7`.
- `chapters/methodology.tex` header comment still says "111 entries".
- G3's ECE run, parked by instruction.

### G2 LOVO gate CLOSED (2026-08-01, supervisor decision)

Decision: report Ellel on unscaled MAE, pool only the two scaled venues, state the reduced
pool. Narrative cost was stated before the call and accepted. Implemented in
`transfer/lovo.py` against `config.VENUE_SCALE_BASIS` / `VENUE_LOSS` / `is_scaled_venue`.

Consequences, all now in `transfer/transfer_results.md`:
- A THIRD fault surfaced: lovo hard-coded `calendar_lag7` where the estate rules
  `calendar_lag7_active`, so the basis was wrong even for the scaled venues. Beer Hall
  transfer moves 0.872 -> 1.242, i.e. ACROSS 1.0. On the ruled basis shape-transfer does
  not beat the benchmark at the anchor venue; it beats a worse cold-window baseline
  (1.771). TRT unchanged (its active trim makes the two bases coincide).
- Win count and pool now 1 of 2 scaled venues. Pooled -0.072 MASE, 90% CI
  [-0.295, +0.154], MCS retains both.
- Gate verdict is NOT EVALUABLE, not FAIL: a majority needs three scaled venues and the
  estate has two. Regaining it needs a third venue admitting a scaled error.
- `test_transfer_wins_majority_at_cold_start` encoded the withdrawn claim and was replaced
  by four behaviour tests, not relaxed. Suite 609 passed / 8 skipped / 0 failed.

STILL OPEN: the foundation-rung gate (see G17o report). The `available: True` branch
returns an instruction and no `beats_global_gbm` key, so the comparison it names was never
implemented and the committed PASS was contingent on torch being absent.

### Foundation-rung gate CLOSED (2026-08-01, instructed: implement it)

`transfer/lovo.py` `_foundation_adoption` now runs the criterion the gate always named:
zero-shot Chronos-2 vs the global GBM on held-out rolling MASE, paired within fold over
the ladder's 6-fold rolling origin at horizon 7. Previously the `available: True` branch
returned an instruction string and no `beats_global_gbm` key, so the gate's PASS was
contingent on no backbone being importable.

Result: ADOPTED. Beer Hall 1.180 vs 1.250; Two River Taps 0.559 vs 0.641. Scored only on
venues admitting a scaled error (G2); adoption requires a win at EVERY such venue, since
two venues carry no majority and unanimity is the conservative bar for adopting a
pretrained backbone over an existing fitted baseline. Note the Beer Hall figure is above
1.0 on the ruled basis: the rung beats the GBM while both remain worse than seasonal-naive
there. The clause is a GBM comparison and is met; it is not a benchmark claim.

DEFECT FOUND AND FIXED IN THE NEW CODE: the first run emitted zero-width CIs
(-0.070 [-0.070, -0.070]). `mcs.BLOCK_LEN` is 7 against 6 folds, so the moving-block
bootstrap had one admissible block and the percentile interval collapsed to a point mass
(measured: 1 distinct resample of 200 at n=6, vs 200 of 200 at n=45/55). `_dispersion` now
returns `insufficient` at or below the block length and the report prints "no dispersion"
with an explicit paragraph. Transfer folds carry 45-55 blocks so no existing number moves.

The gate is now reported as TWO clauses so neither hides the other: transfer NOT
EVALUABLE, foundation PASS (adopted), overall NOT EVALUABLE governed by the transfer
clause.

Coverage: the adoption branch had NO tests, which is why it survived. Five added, stubbing
the per-venue comparison so they run in every venv.

NOTE: the committed artefact now depends on whether a backbone is importable. It is
generated from `.venv-forecast` (chronos 2.3.1, torch 2.12.1) and stamps `available: True`.
Regenerating from `.venv-run` will flip the foundation clause to "PASS (dropped)".

### Three follow-ups (2026-08-01, instructed)

1. **Runtime identity stamped.** New root module `provenance.py` (beside `config.py` /
   `org_profile.py`) reporting venv, compute device, the seven libraries that have moved a
   number here, and the store ceiling. Best-effort, never raises. Stamped into the LOVO
   artefact and the ladder tables. It immediately surfaced that the two venvs differ:
   pandas 3.0.5 vs 3.0.3, duckdb 1.5.5 vs 1.5.4, Python 3.14 vs 3.12. Nothing on any
   artefact said so before.

2. **Foundation window widened 6 -> 24 folds** (largest round count both scaled venues
   supply in full; well above `mcs.BLOCK_LEN` so the bootstrap has resampling freedom).
   Beer Hall 0.643 vs 0.760, CI [-0.139, -0.073]; TRT 0.595 vs 0.811, CI [-0.361, -0.158].
   BOTH CIs EXCLUDE ZERO, so the adoption is now supported with dispersion.
   **This OVERTURNED a finding.** At 6 folds Beer Hall read 1.180, above 1.0, and report 59
   recorded that the rung beat the GBM while both stayed worse than seasonal-naive. At 24
   folds it is 0.643. The six-fold mean was not merely imprecise, it pointed the wrong way
   on a qualitative question while looking like a clean pass. Caveat withdrawn.

3. **`ladder.evaluate_rolling` aligned to `VENUE_SCALE_BASIS`.** Scaled venues now use
   `calendar_lag7_active`; Ellel (ruled `unscaled`) scores unscaled MAE/RMSE. Verified
   BEFORE changing anything, because `ingest/refresh.py` selects the SERVED model through
   this function: selection is IDENTICAL at all three venues under both the basis switch
   and Ellel's move to MAE. Magnitudes move (BH 1.267->1.021, TRT 0.597->0.524, Ellel
   ->74.141 GBP), ordering does not. `metrics["MASE"]` replaced by a key named for the
   quantity in it, plus `loss`/`basis` and a `primary_loss()` accessor; 20 read sites
   updated across `ladder.py` and `refresh.py`. `refresh.py` had
   `metrics.get("MASE", inf)`, which for an MAE venue would have compared inf to inf and
   adopted nothing.

Suite: 617 passed / 8 skipped / 0 failed (`.venv-run`).

OPEN, needs a human call: `tab:ladder` and the committed frozen tables were computed on
`calendar_lag7` (TRT ETS 0.597); the aligned code produces 0.524. Frozen tables
deliberately NOT regenerated per report 57. Ordering and adopted model unchanged, so no
conclusion moves, but the thesis quotes magnitudes the code no longer reproduces and the
caption needs to state its basis. Overleaf pushes are gated.

### tab:ladder caption CLOSED (2026-08-01, authorised Overleaf push)

Added an explicit basis note to the `tab:ladder` caption in `chapters/results.tex`: every
figure uses the historical `calendar_lag7` denominator, the estate now rules
`calendar_lag7_active` (BH, TRT) and unscaled (Ellel), the table is deliberately left on
the historical basis so it remains the decision under audit, and recomputing moves
magnitudes only.

Verified AT THE COMMITTED CEILINGS (2026-05-31 / 2026-05-22 / 2026-05-08), not the current
frame, because the caption is about the table it sits under:
- Reconstruction reproduces the committed figures exactly for the six statistical rungs
  (BH ETS 0.799, Ellel robust-DOW 0.572, TRT ETS 0.597).
- With the backbone present so all NINE entrants score, ordering is IDENTICAL under
  `calendar_lag7`, `calendar_lag7_active` and unscaled MAE at all three venues, and the
  served model is unchanged.
- NOT claimed, because not true: rung-4 magnitudes do not reproduce to the digit (BH
  exogenous 0.755 here vs committed 0.745). Device/resolution dependence per sec:repro,
  now visible via provenance.py. The caption's claim is confined to ordering + served model.

Push mechanics: `write_section` replaces through to the next SAME-level heading, so
`sec:res-demonstration` was re-appended in the same write. Verified after: 25 section
entries before and after, subsection present exactly once, downstream indices +1193.

Frozen ladder artefacts still NOT regenerated. No thesis number changed.

---

## 2026-08-03 — Phase: literature review closed

**Completed**
- T8 closed. All 90 citation keys checked against source text across two
  passes today. One error found this pass (Hertel rounding, 4%/3% → 3.6%/2.7%);
  Phuong applied their own wording in Overleaf and it was kept over mine.
- Both pedagogical figures dropped; one synthetic figure (`fig:gap-map`)
  designed, generated, and pushed. Its axes are lifted from the chapter's own
  synthesis sentences, so it asserts nothing the prose does not.
- `chapters/literature_review.tex` pushed and verified byte-identical,
  67,389 bytes, sha256 `4e6e6218…85417`.

**Artifacts written**
- `brain/log/HANDOFF_2026-08-03_litreview.md` — full session handoff.
- `brain/drafts/figures/make_litreview_figures.py` — rewritten, single figure.
- `brain/drafts/figures/gap_map.{pdf,png}`, `INSERTION.md`.
- `brain/drafts/literature_review.tex` — synced to the pushed remote.
- `brain/ledger/litreview_critique.md` — three appends (T8 close, figure
  rationale, push record).

**Findings that change the record**
- NotebookLM is unreliable as a sole verifier — wrong or NOT-IN-SOURCES on six
  claims that Zotero full text confirms verbatim. Third session running.
  Zotero full text is the authority; NotebookLM is a search index.
- T12 (figures must be referenced) is a whole-thesis rule and was allowed to
  drive a chapter's content. Two figures existed only to satisfy it. A
  whole-thesis rule must not decide a chapter-level question.
- Second near-miss on a hand-assembled `write_file` that would have truncated
  the chapter. Blocked by the classifier. Rule now recorded in two places.

**Open — human only**
- Delete `figures/sbc_plane.pdf` + `figures/hln_correction.pdf` from Overleaf.
- Delete junk NotebookLM source `416b583d-07f2-4f3c-8109-f4dcd5e566ad`.
- Phuong's truncated message ("It will match the…") never completed; ask
  before assuming it was immaterial.

---

## 2026-08-05 — Phase: supervisor evidence pack (consolidation, no new experiments)

**Completed**
- Read in artifact-first order per instruction: state brief, marking criteria,
  pipeline spec, the five ledgers, `docs/PRJ93.md`, examiner register. Three
  subagents delegated the heavy ledger reads under the token-discipline rule
  (results verification, writing state, methodology trajectory), each returning
  under 400 lines.
- `brain/store/` inspected **directly** rather than described: DuckDB opened
  read-only (24 tables), parquet and the two raw CSV/xlsx sets counted in code.
  New first-hand measurements, none previously recorded in one place:
  - `line_items` 93,400 rows; per-venue trading days 302 / 280 / 68 / 2;
    missing-day counts 97 / 51 / 324 / 0.
  - **Export→MCP discontinuity quantified**: 92,329 CSV rows (26,483 distinct
    clock times, real txn ids, tax present) vs 1,071 MCP rows (1 clock time,
    100% null `price_point`, 100% zero `tax`, synthetic ids). Intraday, price
    point and VAT granularity stop at 2026-05-31.
  - **Stock join gap quantified**: 238 stock products vs 440 sales items, 26
    exact name matches, **6.38% of net sales / 4.64% of units**.
  - Chat corpus reproduced from source: 735 messages / 66 conversations / 25
    days / 100% web / 18.9% failure — reconciles exactly with
    `signals/chatlog_kb_gap.md`.
  - Checklist artefact confirmed a **blank template** (27 open + 32 close, zero
    completion events, zero timestamps).
- graphify used for orientation and **did not hang this session** (contradicting
  `tooling_verdict.md:119-133`); it returns a truncated 486-node subgraph in
  seconds. The `timeout` binary is absent on this shell — that was the earlier
  apparent hang, not graphify.

**Artifacts written**
- `brain/knowledge/04_supervisor_evidence_pack.md` — 1,343 lines / ~16k words.
  Six sections plus a closing "Unverified or conflicting" register of **35
  items** (10 value conflicts, 5 untraceable numbers, 7 ledger
  self-contradictions, 4 flag-roster disagreements, 9 unperformable checks).

**Findings that change the record**
- **`brain/log/*result*.md` matches no file, and never has.**
  `PRJ93_RULES.md:31-34` makes that path the number-tracing convention. It was
  specified and never instantiated; traces in practice go to `log/NN_*.md` and
  to per-script `.md`/`.json`. The rule is the thing that is wrong.
- **"MCP-SIM" is not simulated data.** Provenance carries merchant id
  `ML1FFAGJMQBTZ`, real Square view names and real refresh timestamps. The label
  should be renamed before anyone external reads it.
- **Examiner W27 is contradicted by the artefact.** W27 charges a flat Ask-F1
  cost of 8.0 at every ratio; `log/PRJ93_Agent_Eval_Report.md:141-148` reports
  126 misses vs 8 false alarms and cost 134.0 / 260.0 / 638.0 / 1268.0. Do not
  repeat W27 without re-checking.
- **Agent memory returned zero results** on two queries. Nothing is recoverable
  from memory that is not already in a file.
- 3 of 5 `brewery_inventory` snapshots carry a null `snapshot_date` (607 of
  1,002 rows) — not time-orderable, not flagged anywhere previously.
- `brain/drafts/literature_review_condensed.tex` (7,481 w, written 2026-08-04)
  is recorded in no ledger, and is 2,363 words shorter than the byte-locked
  remote.

**Open — human only**
- Everything in §6 of the pack: 5 asks to Ryan, 3 to Elliot, 4 to James, 6 to
  the supervisor. The Track B key chase date (2026-08-04) has passed.
- `knowledge/03_*` does not exist; the pack is numbered 04 per instruction.

**Unstarted**
- Phase C in full. Phase D, E, F. G1 and G3. Nothing was run, rerun or pushed
  this session; no Overleaf write was made, per instruction.

## 2026-08-05 — Phase: supervisor evidence pack, §3 literature foundation

Enrichment pass on `knowledge/04_supervisor_evidence_pack.md`. No slides, no
Overleaf write, no chapter edit, no Zotero write.

**Completed.** Inserted a new `## 3. Literature foundation and methodological
justification` before the methodology trajectory, and renumbered §3→4, §4→5,
§5→6, §6→7 with every internal cross-reference updated. No existing section was
rewritten. Seven sub-sections: 3.1 search and screening protocol, 3.2 corpus
composition, 3.3 corpus revision under critique, 3.4 synthesis and critical
position, 3.5 evidence-to-method traceability (29-row matrix + two exception
lists), 3.6 sequencing, 3.7 standing limitations. Pack now 1,993 lines /
~25,050 words.

**Measured first-hand this session** (not copied from a ledger):
- `drafts/literature_review.tex`: **133 citation occurrences, 86 unique keys**;
  first-appearance by section framing 6 / rhythm 34 / ruler 10 / deviation 10 /
  surfacing 11 / evaluation 10 / synthesis 5; 13 keys cited 3+ times, 55 cited
  exactly once; year span 1954–2026, 2024–26 share 37/86 = 43%.
- Zotero: **118 items**, PDF coverage 112/118. Collections D1 3, D2 5, D3 58,
  D4 9, D5 9, D6 10, D7 10, D8 14 — sums to 118, so nothing unfiled.
- `eval/mcs.py:52-56` — `BLOCK_LEN = 7`, `N_BOOT = 1000` (sensitivity
  1000/5000), `SEED = 93`, block sensitivity (2,7,14,21). Earlier prose
  elsewhere in my own notes said B = 10,000; **1000 is what the code says.**
- `config.py:358-363` — `CP_CUSUM_K = 0.5`, `CP_CUSUM_H = 5.0`,
  `CP_ARL0_EMPIRICAL_LB = 400` right-censored at the simulation length.

**Findings that change the record.**
1. **The search protocol was never written and never pre-registered.**
   `appendix/` does not exist; no `search_protocol.tex` anywhere. ARC stage 3
   specifies it (`02_prj93_pipeline_spec.md:70-79`) and Phase A scheduled it to
   2026-08-04, now passed. Role A raised "no search protocol" in critique
   iteration 1 (`litreview_critique.md:72`) and it is **the one finding from
   that round never repaired** across revisions 2–6. §3.1 states this plainly
   rather than implying a protocol.
2. **Breiman et al. 1984 is in Zotero (`54Z6YNAL`) and cited in no chapter.**
   The one-standard-error adoption rule — the project's showcase
   pre-registration — currently rests on an uncited warrant. This is exactly the
   W54 failure mode the audit named ("acquisition alone does not close it"), and
   it is a one-line fix.
3. **No resampling literature exists in the corpus at all.** Künsch and
   Politis & Romano are absent from Zotero and from the review, yet the
   moving-block bootstrap is the inference engine behind every CI in the
   results. Logged as exception A3, class *gap*.
4. **The four papers added on 2026-08-01 are four of the six Zotero items with
   no stored PDF**, and four of the thirteen doing the heaviest argumentative
   load. Their verification cannot be re-checked offline. Most fixable item in
   §3.7: fetch four PDFs.
5. **All four 2026-08-01 additions were filed into D3** regardless of theme
   (Dixon and Ancker belong in D8, Paleyes in D1), so the collection counts are
   not a clean thematic census.
6. **`citation_audit.md:387-389` still reads "None has been applied"** while the
   critique log records at least nine of those corrections as fixed. The
   canonical defect ledger was never updated. Recorded, not edited.
7. **`hyndman_another_2006` remains the highest-priority unresolved citation
   defect** — the 2006 paper has no seasonal-naive denominator and the
   methodology chapter cites it for one, while the project's whole ruler is
   seasonal-naive. Unverifiable here: `methodology.tex` is not in the working
   tree. Same for the second `bavaresco_llms_2025` occurrence.
8. **Cited-key count is 86, not 90.** The ledger says 90 in three places and the
   pack's own §6.3 says both 90 and ~86. Not reconciled.
9. **Zotero is 118 today, not the 122 recorded**, and the three-way
   reconciliation the spec asks for (NotebookLM / My Library / `scc452`) is
   still open — I queried one library only.

**Exception lists produced.** A (method decisions with no literature backing):
12 items, 6 pragmatic, 3 exploratory, **3 genuine gaps — A3 bootstrap,
A5 Breiman, A6 the six hard-coded surfacing constants**. B (literature findings
the methodology does not act on): 13 items, of which **B4, B6, B7, B8 are
blocked by data provision** — booking diary and operator labels and cost
elicitation (Elliot), cross-tenant data plus privacy sign-off (Ryan). Those four
are the strongest evidence that scope reduction was externally imposed.

**Register.** "Unverified or conflicting" grew 35 → **44 items** (new L1–L9).

**Artifacts written.** `knowledge/04_supervisor_evidence_pack.md` (amended),
this entry. Backup of the pre-edit pack in the session scratchpad.

**Unstarted / open.** `appendix/search_protocol.tex` (W33, free marks, still
unwritten). Cite Breiman. Acquire two resampling references (gate 2). Fetch
four PDFs into Zotero. Update `citation_audit.md` to record the applied fixes.
Check `hyndman_another_2006` and `bavaresco_llms_2025` in `methodology.tex`.
Record dispositions for `tibshirani_conformal_2019` and Wickens & Dixon.
Upload `gap_map.pdf` and delete the two dead figure PDFs from Overleaf.
Experiment gap closure (Phase C) still not started.

### Same session, second pass — re-verified §3 against Overleaf, not the drafts

The operator directed that all written-state claims be checked on Overleaf, since
everything is pushed there. Done, read-only: `list_files`, `status_summary`,
`get_sections`, and full reads of `chapters/literature_review.tex` and
`chapters/methodology.tex`. **No write.** The remote differs materially from both
the local drafts and the ledgers, and §3 was corrected throughout.

**The remote lit review is the condensed draft, and that is in no ledger.**
52,435 bytes / ~7,111 words, matching `drafts/literature_review_condensed.tex`
(52,431 bytes) to within whitespace. `litreview_critique.md:747-750` records the
remote as `push6.tex`, 67,389 bytes, SHA256 `4e6e6218…`. A ~2,400-word
condensation was pushed after the critique record closed, with no gate entry and
no acceptance-test re-run. It preserved all 86 keys but **rolled back three
repairs**: the T13 consolidated limitations inventory (recorded CLOSED 08-03) is
gone; the whole scope paragraph is gone, taking the author-as-rater
internal-validity statement with it; the per-section preprint accounting
(1 + 3 + 7 = 11) is reduced to a bare total. The in-text search-boundary
sentence ("No systematic search for a small-collection counterexample…") is also
gone. Fifth instance of the every-fix-ships-a-defect pattern, and the first
outside the loop built to catch it.

**Key count RESOLVED: 86.** Remote has 128 occurrences / 86 unique; local draft
133 / same 86. Ledger's 90 is stale. Load-bearing set is 10 keys at 3+ on the
remote, not 13 — `haben_short_2019`, `hewamalage_forecast_2023` and
`barber_conformal_2023` each lost a repeat in the condensation. Cited-once 57.

**Two defects I called unrepaired this morning are fixed on Overleaf.**
`hyndman_another_2006` now carries only the original lag-1 definition, with
`hyndman_forecasting_2021` (Zotero `K45PBRM3`) added for the seasonal form —
closing what I had called the project's highest-priority citation defect.
`bavaresco_llms_2025` is corrected in the methodology as well as the review.

**One exception-list entry of mine was wrong.** A5 claimed Breiman was owned but
uncited. **The remote methodology cites `breiman_classification_1984`** in
`sec:intermittency`, with estimator, sub-block rationale and fail-closed
conditions. Corrected in place rather than deleted. Genuine A-list gaps fall
from three to two: A3 (no resampling citation behind the moving-block bootstrap)
and A6 (the six surfacing constants, which is Fatal 2, not a citation problem).
A1 and A10 also softened — the methodology explicitly disclaims the CUSUM ARL
warrant and justifies the pinned chat-log backend.

**Three B-list entries softened.** B1: RMSSE **is** computed, on the same four
bases as MASE and as the MCS secondary loss — G1 is a headline choice, not a
missing computation. B3: `hewamalage_look_2021` is cited twice in methodology and
is the stated warrant for reporting a scaled error beside an unscaled proper
score. B10: the Mondrian variant is implemented on an **observed** regime
variable specifically to remove Sun & Yu's state-misclassification term.

**The real finding: the methodology chapter is better warranted than the ledgers
record, and no ledger records it.** New citations, two audit defects closed, a
pre-registered MCS configuration table, and a withdrawn finding — none of it in
`citation_audit.md`, `litreview_critique.md`, `FLAGS.md` or here until now. Two
keys in active use (`hyndman_forecasting_2021`, `breiman_classification_1984`)
sit outside every verification record.

**Undocumented defect disclosed by the remote.** The SBA selection inequality was
implemented **reversed**, quoted from the external review rather than checked
against Kostenko & Hyndman, and the published "no node selects SBA" finding is
withdrawn as an artefact of it. Under the correct rule every node selects SBA —
and the chapter then proves the rule non-informative at the cutoff, since
2 − (3/2)(4/3) = 0 exactly and v ≥ 0 always, so classification entails selection.
Good result, no ledger entry. **Not checked: whether `models/intermittent.py` was
fixed or only the prose.**

**Figures: nearly closed.** `figures/gap_map.pdf` is on the remote, one
`\includegraphics`, one `\ref`; `hln_correction.pdf` deleted. **`sbc_plane.pdf`
is still orphaned at the project root** and should be deleted.

**Register** grew 44 → **49 items** (L10–L14 added). Pack now 2,148 lines /
~27,390 words.

**Newly unstarted / open from this pass.** Restore the three condensation
rollbacks (T13 inventory, scope paragraph, preprint accounting) — cheap, no gate,
since restoring deleted text adds no citation. Delete `sbc_plane.pdf` from the
remote. Verify `hyndman_forecasting_2021` and `breiman_classification_1984`
resolve in `ref.bib`. Check whether the SBA inequality is fixed in code. Update
`citation_audit.md` to record the methodology repairs. Read `results.tex` to
verify the AgACI re-run's effect on the Winkler figures (L14). `ref.bib` entry
count remains uncountable under token discipline.

#### Consistency sweep after the Overleaf pass

Closing check over §3 for claims still resting on the local draft after the
remote re-verification. Six fixed:

- The register sub-heading still read "(9)"; it holds L1–L14. Now "(14)".
- §3.1's "no protocol passage" row cited a grep over the local draft; re-pointed
  to the remote, where the search was actually run.
- §3.4's stance quotation was the local wording ("takes a position on each
  instead of surveying opinion"); the remote reads "rather than surveying
  opinion". Replaced, with the source named as Overleaf.
- §3.4's three contribution quotations (methodological novelty conceded, "field
  instantiation, not of method", the PRISM-preprint exposure) had bare local line
  refs. All three verified verbatim on the remote and re-attributed; the
  preprint-exposure sentence is now quoted in the remote's own words.
- §3.4's operator-grounding quotation was the local long form; replaced with the
  remote's shorter "and none against the decisions of the operator whose work it
  is intervening in".
- §3.6 and §3.4 both quoted "a tension inherited from artefacts frozen before
  that case was assembled". **That sentence is not on the remote** — it sat in
  the deleted scope paragraph. Replaced with the remote's wording ("the reasons
  are ones of comparability with artefacts frozen before this argument was
  assembled"), with the deletion noted.

Two deliberate local-draft references remain in §3, both contrastive: the
byte/word comparison establishing that the remote is the condensed draft, and
the search-boundary row recording that the sentence exists only locally.
Remaining bare `:NNN` refs in §3 resolve to `litreview_critique.md` and
`citation_audit.md`, which is correct in context.

**Final state.** `knowledge/04_supervisor_evidence_pack.md` — 2,160 lines /
~27,517 words / 370 table rows; seven sections plus a 49-item register.
`ledger/phase_state.md` — 1,467 lines. No Overleaf write, no chapter edit, no
Zotero write at any point in this session.

---

## Phase DECK — supervisor briefing deck and teaching script (2026-08-05)

**Ruleset.** `brain/PRJ93_RULES.md` named and followed. No Overleaf write, no
chapter edit, no Zotero write, no experiment rerun, no methodology change. No
human gate was reached, so none was put.

**Sources read.** `knowledge/04_supervisor_evidence_pack.md` (full, the sole
content source); `docs/LuneBrew_Brand_Kit/` in full (guide, tokens, motifs,
README, logo assets); the `wip-technical-briefing` skill (SKILL.md, deck-build,
script-teaching, plain-language-glossary, deck_helpers.js) extracted to the
session scratchpad. No other project file was opened.

**Artefacts written** — all under `brain/deck/`, none under `chapters/`:

| File | What it is |
|---|---|
| `PRJ93_briefing_deck.html` | 50-slide deck, 1280x720, Lune Brew brand |
| `PRJ93_briefing_script.md` | teaching-level spoken script, 50 sections + preamble + 15 Q&A entries |
| `speaker_notes.md` | per-slide notes, generated from the build |
| `build.js`, `qa.js`, `shoot.js`, `lib/*.js` | deck source, geometry audit, capture |
| `qa/s01..s50.png`, `qa/sheet1..5.png` | rendered inspection set |

**Brand conformance.** Built to the kit, not to the skill's palette. The
skill's `assets/deck_helpers.js` constants (DARK/AMBER/TEAL/GREEN/RED/INK/MUTE/
TINT/ICE/CODEBG) and its Cambria/Calibri/Courier stack are explicitly overridden
and unused; the override is recorded in `lib/chrome.js`. Kit tokens, type scale,
motif kit, chrome and the assertion-headline rule are followed throughout. One
flavour accent (teal) across the deck.

**Kit extensions made (E1-E9, marked in `lib/deck.css.js`)** — for folding back
into the guide: status chip; dependency/status matrix; node-and-edge diagram
primitives; typeset formula block; annotated chart frame; provisional stamp;
two-column split with centre rule; screening-flow box; card grid. Status-token
mapping for provision states: absent=ruby, insufficient=mango, unjoinable=choc,
delivered=teal, focal=gold, every use doubled by a text label.

**QA.** Geometry audited programmatically over every slide (elements leaving the
1280x720 frame, clipped overflow) to zero findings, plus visual inspection of all
50 renders across five passes. Defects found and fixed included a flex bug that
grew the column divider into a 40px band, overlapping architecture cards, and
value labels colliding in the dot-and-interval charts. AI-writing audit run on
both deliverables and the build strings: zero em-dashes, zero flagged vocabulary
in prose, zero hollow intensifiers.

**Content discipline.** Nothing on a slide that is not in the evidence pack.
Provisional values are stamped on the slide. Every figure carries its source path
in the speaker notes. The pack's six forbidden figures appear nowhere. One
fabricated sample size (n=64 on a near-threshold recall row) was introduced
during layout work and removed the same session.

**Corrected during the build.** The capability matrix merged two row pairs, which
changed its counts; the headline and both narratives were corrected from "seven
of fifteen" to "six of thirteen held by another party" rather than left stale.

**Unstarted.** Everything in the evidence pack's section 7 remains as recorded:
Phase C not started, the discussion chapter unwritten, the search-protocol
appendix unwritten, ECE not computed.

## Phase DECK-R — briefing restructured as a research pipeline (2026-08-05)

**Trigger.** Supervisor-facing review of the first build: the deck read as a log
of actions rather than as an account of research conduct; internal verification
apparatus was on slides; the literature section presented counts rather than
papers and arguments; project-internal shorthand was unglossed; text was
unreadable on two slides.

**Reordering.** Slide modules split at section boundaries into `lib/sec-01…08`
and required in pipeline order in `build.js`: position → literature → method the
literature licensed → architecture → results → what is blocked and why → writing
state → plan and asks. Data provision moved from second to sixth, because its
role in the briefing is to explain which results could not be produced. LB
section numbers and divider chrome renumbered to match. 50 slides → 51.

**Removed from slides and notes (internal apparatus, not research content).**
Overleaf remote comparisons and byte counts; NotebookLM and Zotero verification
statements; citation-audit verdict tallies; critique-loop iteration and finding
counts; ledger paths in on-slide SOURCE lines; the corpus-revision timeline
slide in full. Speaker-note provenance paths retained — those are the
requirement, not the defect.

**Added.** Slide 2, a definitions slide (the four objectives, the examiner
severity classes, the nine human gates, the twelve interface obligations, and
the three status words), so nothing later stops to gloss itself. Slide 13, the
review's three predictions set against the experiment verdicts that tested them
(pooling, ranking stability, weather) — the literature-to-method-to-result
hinge, replacing the process timeline. Load-bearing citations now named
(Montero-Manso & Hyndman, Fu, Ding, Ansari, Hertel, Park, Dixon & Wickens,
Ancker) rather than described by role.

**Jargon made explicit.** "Fatal N" → the graded severity class plus its
substance. "Objective 4" → the usefulness objective and its four terms.
"CONTRACT.md:328-335" → obligation 10 of 12, who runs model selection. Gates
G1/G2/G3 → the decision each holds open.

**Render defects found and fixed.** (1) `.hl` is a full-line highlight
(`display:inline-block;width:100%`); two code blocks put a trailing comment
outside it, which pushed the comment off the rendered line — slide 17 lost
`): # no default`, slide 20 lost both constant comments. Whole line now wrapped.
(2) Two `<figure class="code">` were never closed, so the following `note()` was
swallowed into the dark code box and rendered grey-on-black (slide 20).
(3) `hbar` placed value labels at the bar end and tags a fixed offset beyond,
so long bars drove their own number into the annotation (slide 37 unreadable).
Rewritten with reserved value and tag gutters, plot width reduced accordingly.
(4) A flex child holding the boundary arrow stretched full height and reached
the source line; switched to `align-self:flex-start`.

**QA.** New `overlap.js` reports intersecting text-bearing leaf boxes across all
slides; final state is zero. `qa.js` geometry audit reports only the intentional
ribbon bleed and full-bleed divider panels. All 51 slides re-captured and
inspected on contact sheets plus full-size checks of 17, 20, 37, 45.

**Script.** `PRJ93_briefing_script.md` reordered to match, renumbered, all nine
internal cross-references remapped, two new sections written, and the log-flavour
passages rewritten as research argument. AI-writing audit clean: zero em-dashes,
zero flagged vocabulary in prose (`robust` remains only as the identifier
`robust_dow`), zero hollow intensifiers.

**Not done.** No Overleaf write, no chapter edit, no Zotero write, no experiment
rerun, no gate reached.

## Litreview verdict extraction — 2026-08-05

**Phase.** Extraction-only pass over `chapters/literature_review.tex` (Overleaf
rev, 67,389 bytes, SHA256 `4e6e6218…5417`; local `brain/drafts/literature_review.tex`
confirmed byte-identical, so no source disagreement to report).

**Completed.** 63 methodological verdicts extracted (requirements, prior-work
limitations, contradictions), each with a checkable proposition, verbatim anchor,
citation keys and operational consequence. 12-row contradictions register with
the chapter's adjudication and which side to follow. Per-row T8 verification
status assigned from `ledger/litreview_critique.md`.

**Artifact.** `brain/knowledge/05_litreview_verdicts.md`.

**Ranges read** (token discipline): local file lines 1–40, 40–139, 139–273,
273–425, 560–672, 673–770, 770–883, 884–1010; `sec:rw-ruler` (425–560) read via
`mcp__overleaf__get_section_content` rather than locally.

**Unstarted.** No NotebookLM verification run (parent agent owns it). Two
contradictions remain UNRESOLVED-IN-CHAPTER by R-Zero design (ranking-reversal
direction, adaptive calibration at the regime change) and are a downstream
obligation on the discussion chapter, not a chapter defect.

## 2026-08-05 — Phase LITCONF: literature conformance audit, six runs executed

**Ruleset.** `brain/PRJ93_RULES.md` named and followed. No Overleaf write, no
chapter edit, no Zotero write. Gate 3 (rerun) was put and cleared for six runs;
gate 1 (methodology change) was NOT taken — TabPFN-TS was excluded from the
authorisation and remains open.

**Sources read.** `PRJ93_RULES.md`, `knowledge/00_state_brief.md`,
`knowledge/02_prj93_pipeline_spec.md` (full), `ledger/litreview_critique.md`
(full), `ledger/code_vs_paper.md` (full, two pages), `ledger/numbers_audit.md`
(§Summary, lines 767–988), `ledger/phase_state.md` (tail + lines 1045–1200),
`knowledge/04_supervisor_evidence_pack.md` (§3.5 lines 791–915, §6.7–§7 lines
1759–1868). Source files read only where a ledger row was contested:
`eval/agent_calibration.py`, `eval/agent_cache.py`, `eval/agent_eval.py`,
`eval/interval_calibration.py`, `eval/chronos2_covariate_probe.py`,
`hierarchy/reconcile.py`, `config.py`. `graphify query` used for orientation.

**Verification.** Seven NotebookLM queries against `d565d5f0`, verbatim quotation
required, on: Kolassa coherence, Hewamalage median/scaling, Hansen MCS, Guo ECE,
Barber Thm 2, Harvey correction, Diebold small-sample size, M5 rank stability,
Brigato, Dixon, Chatfield, Ansari, Kim, Liu, Zheng, Bavaresco, Montero-Manso,
Angelopoulos–Bates Thm D.2, Wickramasuriya unbiasedness. **Three chapter
propositions returned NOT SUPPORTED as attributed** (decision 66). NotebookLM's
citation indices were scrambled in two of seven responses while the quoted text
was correct — third session running; the "search index, not oracle" rule holds.

**Artefacts written.**

| File | What it is |
|---|---|
| `knowledge/05_litreview_verdicts.md` | 63 extracted verdicts + 12-row contradictions register (subagent) |
| `ledger/literature_conformance.md` | full classification, §8 post-run status |
| `ledger/run_plan_2026-08-05.md` | consolidated run plan, categories (a)–(d) |
| `log/60_R1_vus_pr_result.md` … `log/65_R7_chronos2_staleness_result.md` | six paired result files |
| `eval/metric_ordering.py` + `.md` + `.json` | NEW module, R4 |

**Code changed.** `eval/interval_calibration.py` (`score_ties`, wired through
`power_analysis` and the report writer); `hierarchy/reconcile.py`
(`unbiasedness_check`, wired into payload and report);
`eval/chronos2_covariate_probe.py` (per-fold vectors, MCS, paired bootstrap,
widened fold grid, ruled basis). Three tests added to
`tests/test_interval_calibration.py`.

**Regenerated.** `eval/interval_calibration.{md,json}` (control: every
pre-existing number reproduces exactly in `.venv-forecast`),
`hierarchy/reconciliation_forecast.md` (control: diff is additions only),
`eval/chronos2_covariate_probe.md`, `brain/log/PRJ93_Agent_Eval_Report.md`.

**Tests.** Full suite in `.venv-forecast`: **627 passed, 1 skipped, 0 failed**
(26m44s). The three touched modules re-verified separately at 54/54
(`test_interval_calibration`, `test_a6_reconcile`, `test_a2_mcs`). Against the
last recorded figure (617 passed / 8 skipped at G17o) the suite has gained 10
tests and 7 previously-skipped tests now run, because `.venv-forecast` carries
torch/chronos where `.venv-run` does not.

**Conformance movement.** 24 → **28** CONFORMS; 8 → **4** DIVERGES–SHOULD FIX
(all four now writing-only); 5 DIVERGES–DEFENSIBLE unchanged (human's, none
decided by the agent); 8 DIVERGES–UNRESOLVED unchanged (all blocked on a third
party).

**Findings not in the plan.** (i) The conformal upper bound fails at all three
venues, not only Ellel. (ii) `eval/interval_calibration` is environment-sensitive
and carries no `provenance.py` stamp — a regeneration from the wrong venv would
silently restate `tab:winkler`. (iii) The hard-coded `calendar_lag7` basis is in
its third file. (iv) **ECE is NOT unblocked** — `eval/agent_calibration.py` is
complete and correct, but `run()` needs `eval/agent_cache.json`, which does not
exist and requires `--build` with an Anthropic key. The pipeline spec, the state
brief and the evidence pack all record ECE as cheap and unblocked; all three are
wrong. The compensating half is that S8b, S8c and ECE are one command, not three
experiments.

**Unstarted.** Phase C still not started and still blocked on Ryan's key
(R8 in the run plan). The Discussion chapter, the search-protocol appendix, and
the four writing-only SHOULD-FIX rows (`D-F3` `tab:winkler` and coverage
intervals, `D-F4` `tab:ladder` dispersion, `D-F5` the Ask-F1 degeneracy
instance, `D-F6` the retrieval threat model) are all unblocked and unwritten.
The five DIVERGES–DEFENSIBLE decisions await the human, D-D1 first.

### Addendum — R9, the functional minimal pair (2026-08-06)

Gate 1 (methodology change) was put and cleared for a new REPORTED-ONLY rung. Pre-registered
at decision-log row 77, commit `c098fba`, **before any code was touched**; result row 78;
D-D1 resolved at row 79. Full record `log/66_R9_functional_pair_result.md`.

**Written.** `models/ladder.py::rung1_mean_dow` + shared `_dow_profile`;
`eval/functional_pair.py` + `eval/functional_pair.{md,json}`;
`log/66_R9_functional_pair_result.md`; `ledger/literature_conformance.md` §9.

**Controls.** `rung1_robust_dow` bit-identical after the refactor (max abs diff 0.0).
Ladder tests 41/41. Report prose corrected and re-emitted **from stored JSON, no re-run**.

**Outcome.** Crossing observed at both scaled venues in the predicted orientation, **all
four paired intervals containing zero** — a direction, not an effect. Two of five
pre-registered predictions failed: Two River Taps refutes the right-skew mechanism (median
arm biased negative, mean arm worse), and Ellel inverts the argument (DOW mean decisively
worse on both metrics at ~82% zero days). The load-bearing finding is the **concealment**:
at Beer Hall the functional swap removes two-thirds of the bias while moving MASE by 0.009.

**D-D1 DECIDED: RMSSE headline, MASE labelled secondary.** Four of the five
DIVERGES–DEFENSIBLE rows remain open — D-D2, D-D3, D-D4, D-D5 — and none has been decided
by the agent.

**Still unstarted.** Phase C (blocked on Ryan's key); the Discussion chapter; the
search-protocol appendix; and the four writing-only SHOULD-FIX rows D-F3, D-F4, D-F5, D-F6.
No Overleaf write and no chapter edit this session.

### D-D2 addendum — 2026-08-06

D-D2 decided: **accept the divergence, argued from the estimand.** Chatfield & Hayya's cost
is an inventory-system cost (`ordering + holding + shortage`) whose parameters price a stock
position that a revenue-in-pounds estimand does not have, so the remedy is undefined here
rather than declined. Three corrections to the §4 row recorded (parameter count two -> three;
the §2.3 / ask-6 cross-reference removed as a misattribution — that elicitation is the
`F_beta` surfacing cost ratio, not inventory cost rates; primary argument moved from missing
parameters to estimand mismatch). A second, previously unused verbatim support for G2 found
in the same paper: its own denominator-bearing measures degrade on zeros. Cost-objective limb
moved to Further Work, scoped to A12 at Beer Hall. Full record at
`ledger/literature_conformance.md` §10 and decision-log row 80. **Remaining defensible rows:
D-D3, D-D4, D-D5.**

### D-D3 / D-D4 / D-D5 addendum — 2026-08-06

All five DIVERGES — DEFENSIBLE rows are now decided.

- **D-D3** — accept and **reclassify toward CONFORMS**. The row's premise was false:
  `p_trade` returns `E[occurrence | DOW]`, a saturated nonparametric estimator, not a 0/1
  constant. Verified numerically (`log/67_DD3_hurdle_saturation_result.md`): the saturated
  logit MLE reproduces the groupby cell frequencies to 7.61e-05, and the deterministic cells
  show complete separation (|coef| 11.46, diverging). Surviving limitation is covariate
  poverty (DOW only), cross-referenced to D-U3.
- **D-D4** — accept the design; attribution **re-homed across three sources**, and the §4
  recommendation rejected because it would have been a fresh misattribution: Cor A.2 and
  Thm 4.3 are results about **CPTC**, which `conformal/wrap.py:8-9` states is "noted, not
  wired". `barber_conformal_2023` for what the procedure is, `stocker_gentle_2025` for what
  it guarantees, `sun_conformal_2025` Thm 4.3 as motivation only. No new paper, no gate.
  **V2 CLOSED.**
- **D-D5** — R5 attempted and **aborted on a pre-registered condition**: `tabpfn` 8.2.0 gates
  local weights behind a vendor account + `TABPFN_TOKEN`, and the library's cloud default
  transmits the series. Prediction (i) salvaged — 392 / 324 / 385 max training rows against a
  10,000 limit, so the regime claim is quantified. (ii)-(iv) NOT TESTED. Evaluator committed
  and runs unchanged given a token.

Full records at `ledger/literature_conformance.md` §11-§13 and decision-log rows 81-84.
**No DIVERGES — DEFENSIBLE rows remain open.** No chapter text written this session.

### Basis audit addendum — 2026-08-06

Write-up-pack items 8 and 9 closed. Item 8: `eval/interval_calibration` artefacts now carry
`provenance` (stamp verified purely additive, no number moved). Item 9: the "third file,
assume a fourth" note was **wrong** — `harness.REPORTED_BASIS = "calendar_lag7"` is the
documented project standard across ~45 sites and there is no fourth file; the real defect
class is a scaled metric at Ellel, and the single instance
(`eval/worldcup_fixture_probe.py`) is fixed and re-run, having never published a number in
its life. **New open item, not resolved:** `harness.REPORTED_BASIS` and
`config.VENUE_SCALE_BASIS` are two live rulers disagreeing by **1.2417x at Beer Hall** and
1.1361x at TRT, unevenly distributed across chapters. Methodology decision, human gate.
Full record: `log/69_basis_audit_and_ruler_conflict_result.md`, decision-log row 85.

---

## Session close — 2026-08-06 (TabPFN literature, D-U6 closure, chapter audit)

**Overleaf head `27df1af`. Brain head recorded below. Decision-log rows 96–102.**

### Analysis produced this session

- **`log/74` — D-U6 closed at the third venue.** Ellel's residual drift is confined to
  calendar-open days the venue did not trade (rho +0.367, p 1.9e-34, n=1037) with no
  significant drift on the 263 days it traded (rho +0.094, p 0.129). Those days are 79.8 per
  cent of the group, and on every one of them |y - yhat| = yhat as a verified identity. The
  level of trade is REJECTED on both denominators, including a trailing mean over traded days
  only. The residue is the missing occurrence signal, i.e. **D-U3**. Beer Hall and Ellel show
  the SAME partition defect in opposite directions (94/546 closed-but-traded; 1037/1300
  open-but-not-traded).
- **`log/75` — a published interval finding replicated.** `kaas_probabilistic_2026`'s ORDERING
  between Chronos-2 and Chronos-Bolt reproduces at all three venues on all reported metrics;
  the MAGNITUDE does not (Bolt covers 0.816/0.862/0.772 at nominal 0.80, not 0.62). New
  finding: **Chronos-Bolt cannot emit a 90 per cent interval** — trained on deciles 0.1–0.9, a
  0.05/0.95 request clamps silently. Third finding, unsought: Ellel's pooled coverage 0.896
  against **active-only 0.447**, independently confirming `log/74` on an instrument sharing
  none of its apparatus (native model quantiles, no conformal band, no Mondrian partition).

### Chapters

`sec:res-native-interval` added. `sec:res-drift-cause` and `sec:conclusion-limitations`
carry the Ellel account. `sec:exo` gained the known-future covariate precondition. `sec:ladder`
and `sec:further-work` rewritten for the TabPFN licence. Literature review took the TabPFN
v2/v3 line plus a corrected weather argument. Eight Further Work extensions, three gated.

### Chapter audit — three defects found, two of them pre-existing

1. **My own overreach (introduced then corrected in-session).** The review asserted the
   calendar-over-weather assumption "fails", contradicting `sec:res-weather`, which retains all
   five arms including no-weather at every venue. Corrected, and the correction is logged rather
   than silently applied.
2. **R-Zero violation, pre-existing.** The review stated "This dissertation's own weather
   experiment returns a null" — a later chapter's result reported in the review, AND the exact
   overstatement `sec:res-weather` warns against. Replaced with a forward pointer.
3. **Preprint count wrong, pre-existing.** "eleven works ... had not completed peer review ...
   each is marked at its citation" was false: nineteen, eight unmarked. Now nineteen with
   fourteen marked and the remaining five identified as exemplar-list entries where a per-item
   marker is unavailable.

Also resolved: a primary/secondary loss collision between the review and `tab:mcs-config`, and
a direct quotation carrying no citation.

### New source

**`judd_forecasting_2025`** (J. Applied Statistics 53(2) 372–390, CC BY 4.0). Corroborates all
three weather findings and supplies the mechanism: weather is significant per product category
and "not significant for total sales" because the signs cancel; "hour and site are better
proxies for footfall than temperature and daypart". **This study forecasts venue totals (L1),
the level at which the effect vanishes, and the estate HAS L2 category data** — the cancellation
account is testable here and is untested. Candidate Further Work, not claimed.

### Open items carried forward

- **`brain/ledger/BLOCKED_third_party.md` is the retrieval point.** Seven third-party rows,
  three gated Further Work items, and a §G manual list.
- **Zotero is local-only**, so three metadata fixes cannot be written back and a Zotero
  re-export will clobber them. Needs `ZOTERO_API_KEY` + `ZOTERO_LIBRARY_ID`.
- **Unchanged from before this session:** `harness.REPORTED_BASIS` vs `config.VENUE_SCALE_BASIS`
  still disagree by 1.2417x at Beer Hall. Methodology decision, human gate. Not touched.

### Session close, second half — 2026-08-06 (Zotero enabled, three corrections)

**Overleaf head `922e97e`, clean and fully pushed. Brain continues below. Rows 103–106.**

#### Zotero writes enabled and used

Credentials written to `~/.claude.json` at `mcpServers.zotero.env` after a timestamped backup
(`ZOTERO_LOCAL` deliberately left `true`, since local + key + id is what the server calls hybrid
mode). **An MCP server reads its env at process start**, so the write tools stayed blocked until
Phuong reconnected; the work was done against the Web API in the meantime and the reconnect was
then verified (a tag write succeeded, and semantic search returns Judd at 0.624).

Semantic index rebuilt via the `zotero-mcp update-db` CLI rather than the MCP tool, so it did not
have to wait: 20 changed items, 17 added, 3 updated, 1 stale document deleted, 0 errors.
**121 documents against 121 live top-level items, full coverage.**

#### Three corrections, in increasing order of how wrong I was

1. **Ye et al. is peer-reviewed, not a preprint.** NeurIPS 2025. I inferred preprint status from
   an arXiv record without checking whether the paper had been accepted. Reverted in Zotero,
   `ref.bib` (`@misc` to `@inproceedings`) and the chapter, where the preprint census moved
   **nineteen to eighteen** (18 unpublished cited, 13 marked, 5 inside exemplar lists).
2. **The rule gap that allowed it.** "No factual claim about a cited paper without a NotebookLM
   query" covers CONTENT. Every content claim this session was verified and held. Venue, date and
   peer-review status are not covered, and they are what an examiner checks first. **A
   bibliographic claim now needs the venue of record, not the arXiv page.**
3. **I had been editing a trashed duplicate.** `K73XDLEQ` carries `deleted=1`. The trash holds
   FIVE captures of the Ye paper; the live record `8UI7QJCU` **already had** the correct title,
   date and proceedings. The defect reported earlier was a property of a discarded row, not of the
   library. `zotero_search_items` returns trashed items, and the raw Web API does not volunteer
   the flag unless inspected. **Check `deleted` before editing any item reached via search.**

#### Library integrity audit, run because of (3)

121 live top-level items, 23 trashed. Six trashed items have no live counterpart and **none breaks
a citation** (three Hyndman FPP duplicates against live `K45PBRM3`, a CART webpage variant against
live `54Z6YNAL`, one work cited zero times, one unrelated stray). **No citation in any chapter is
backed only by a trashed item.** Citation keys for `ye_closer_2025`, `hoo_tables_2026` and
`judd_forecasting_2025` are pinned on the LIVE records in both the native field and Extra, so a
Better BibTeX re-export reproduces them.

#### Outstanding

- **Rotate the Zotero API key.** It arrived in a chat transcript, which persists in plain text
  under `~/.claude/projects/`, and it grants library and file write on the user library and all
  groups. Nothing in the project pins that specific key.
- Unchanged: `harness.REPORTED_BASIS` vs `config.VENUE_SCALE_BASIS` disagree by 1.2417x at Beer
  Hall. Methodology decision, human gate, deliberately not touched.
- `brain/ledger/BLOCKED_third_party.md` remains the single retrieval point.

### State at close — verified, 2026-08-06

Recorded as facts a next session can check rather than as narrative.

| | |
|---|---|
| Overleaf head | `922e97e`, working tree clean, 0 ahead / 0 behind |
| Repo head | `c9ba53cb`, `brain/` clean |
| Decision-log rows this session | 96–106 |
| New result logs | `log/74` (D-U6 at Ellel), `log/75` (native interval replication) |
| New analysis code | `eval/native_interval_probe.py`; `eval/exchangeability_diagnostic.py` extended |
| New artefacts | `eval/native_interval_probe.json`, `eval/exchangeability_diagnostic.json` |
| Knowledge graph | 13,299 nodes, 24,656 edges, 884 communities |
| Chapter references | zero dangling, zero citations unresolved against `ref.bib` |
| Conformance rows open and NOT third-party blocked | **0** |
| DIVERGES — UNRESOLVED | 7, every one blocked on a named third party |
| Further Work extensions | 8, of which 3 are gated served-artefact changes |
| Zotero | 121 live top-level items, 23 trashed; semantic index 121 documents, full coverage; MCP writes verified |

Caveat on the graph: `graphify` reports the community set shifted, so 649 communities are
currently named by their hub rather than by an LLM label. Run `graphify label` when the names
matter; nothing depends on them today.

### Where to start next session

The full opening sequence is specified under **Session lifecycle** in
`brain/PRJ93_RULES.md` (recall, graphify, then the state file) and is not repeated here.
What is specific to THIS handover:

1. **Read `brain/ledger/BLOCKED_third_party.md` first.** It is the state; this file is history.
2. **Two chores, both small.** Rotate the Zotero API key. Confirm nothing else regressed by
   recompiling on Overleaf.
3. **One decision waiting on Phuong, not on data.** `harness.REPORTED_BASIS` against
   `config.VENUE_SCALE_BASIS`, 1.2417x apart at the Beer Hall, unevenly distributed across
   chapters. Deliberately untouched across two sessions now because it is a methodology call.
4. **The one genuinely new thread, and it is testable here.** `judd_forecasting_2025` explains a
   weather null as category-level cancellation: significant per product category, "not
   significant for total sales" because the signs oppose. This study forecasts venue totals at
   L1, which is the level at which the effect vanishes, and **the estate holds L2 category
   data**. Nothing has tested whether the cancellation account reproduces here. It would need a
   pre-registered gate before it touched anything served, but as an analysis it is unblocked and
   it bears directly on `sec:res-weather`.

Nothing in the list above is blocked on the agent.

### Rules amended at close — 2026-08-06

`PRJ93_RULES.md` gained a **Session lifecycle** section: agentmemory recall plus a graphify
query at the START, a save the moment a result lands rather than deferred to the end, and
save + `graphify update` + this file + a clean commit at the CLOSE. It also fixes which store
owns which fact, so the three cannot drift.

Three consistency defects were found and fixed while writing it, all of them instances of the
problem the new rule describes:
- The rules file's own "Where the open work is" section carried a stale count ("two gated
  Further Work items" when there are three). Counts now live only in the owning file.
- The `phase_state` end-of-session requirement was stated in two sections. Now stated once.
- Two rules this session proved insufficient were logged in the decision log but never written
  into the rules: that the NotebookLM rule covers a paper's CONTENT and not its venue or
  peer-review status (row 104), and that a Zotero key must be confirmed live and not trashed
  (row 106). Both now in Verification rules.

Nothing under `.claude/` was touched; the Scope boundary holds.

---

## Session — research questions derived and approved, 2026-08-06

Phase 8A. One deliverable, one gate, closed in the same session. No dissertation prose
changed, nothing written to Overleaf, no experiment run.

### What was completed

**`brain/knowledge/06_research_questions.md` written and APPROVED.** Five numbered
research questions derived from the seven gap limbs at `05_paper_architecture.md` §2.10,
the project specification, and the Results inventory. Each question cleared three
admission constraints: entailed by the gap Chapter 2 establishes from prior work alone,
answerable by a result this project holds, and stated at a grain Chapter 5 can answer
directly.

The set maps **one-to-one onto the five Results sections** of the approved target tree.
That was a design constraint rather than an outcome: R8 is a trace criterion, and one
question / one Results section / one answer paragraph in Discussion 5.1 / one objective
judgement in Conclusions 6.1 makes the trace mechanical for a marker instead of an
argument they must reconstruct.

### The three decisions taken at the gate

1. **Gap limb 7 — operator-grounded evaluation — is scoped OUT of the research questions**
   and carried as contribution C5 at graded strength. It is NOT an RQ6 answered
   negatively. R8 and D12 are trace criteria and a stated question with no answer fails
   both by construction; HC59 already mandates the divergence appear in Discussion 5.5,
   so an RQ6 would state the same fact once where the rubric asks for it and once where
   it penalises it. Limb 7 remains visible in five places. **Reversible in one direction
   only:** if `ANTHROPIC_API_KEY` and Elliot both arrive, the result reports under RQ5,
   never as a new RQ6 — adding a question after the evidence is seen is the ordering
   defect the pre-registration discipline exists to prevent.

2. **Introduction 1.4 moves from four contributions to five.** C5 is limb 7's frozen
   apparatus and folding it into another claim would conceal the thing graded strength
   exists to disclose.

3. **`sec:res-chatlog` (348 words, the knowledge-gap signal) is a substantial result
   answering no research question, and cannot be made to answer one.** The seven gap
   limbs contain no prior-work claim about knowledge-gap detection, so an RQ6 here would
   need an eighth limb built from literature the review does not survey. Reported instead
   as a specification-level deliverable in Results 4.5, revisited in Conclusions 6.1
   against objective 1, with no contribution line. Demonstrated, not established.

### The estate size, verified rather than assumed

The aim says *three-venue estate* and RQ1 and RQ3 both turn on estate size, so it was
checked before the gate closed. **Confirmed correct: Beer Hall, Ellel, Two River Taps.**
The specification's *"live across 4 Lune Brew Co venues"* describes the platform
deployment, not the study. Do not "correct" three to four anywhere — the number is
load-bearing in the abstract, 1.1, 2.3, 3.1 and two answers, because limbs 1 and 2 are
small-estate claims.

Two HC59 divergences the 5.5 list did not have were found in the process and added: the
three-venue estate against the specification's four, and the NeonDB research schema never
provided. 5.5 goes from four declared divergences to six, budget unchanged at 300.

### New mechanism — the unlock trail

`05_paper_architecture.md` §7 gained an **"Items reopened after approval"** table. A
closed-approvals section edited without a trail stops being useful, so a reopening now
carries a U-row with its authority, its date and its reason. Two rows so far: **U1**
(Introduction 1.4, four → five contributions) and **U2** (Discussion 5.5, four → six
divergences). This is the corrections-are-appended rule applied to approvals rather than
to findings. A future session amends an approved item by adding a U-row, never silently.

### Artefacts written

| Path | Change |
|---|---|
| `brain/knowledge/06_research_questions.md` | **New.** The aim, five RQs, the mapping table, the limb-7 recommendation and reasoning, the exact Introduction 1.3 and 1.4 strings, the two structural-defect checks, the rubric trace, the estate verification, and two pre-recorded session prompt blocks. |
| `brain/knowledge/05_paper_architecture.md` | §2.1 Introduction 1.4 cell (U1) and Discussion 5.5 cell (U2); §7 approvals A15–A17 plus the new reopened-items table. |

### Unstarted

- **8B and 8C** — the restructure itself. Both now have fixed questions to work to.
- **Why the estate is three venues rather than four.** Nothing in `brain/` records whether
  the fourth venue was excluded during the work or was never in scope. An exclusion made
  after seeing data needs a stated criterion in Methods 3.1 under R83; a boundary needs
  one sentence in 5.5. **Owned by 8D, but Phuong may know it offhand — cheaper now than
  later.**
- Everything in `BLOCKED_third_party.md` is unchanged. No blocker cleared this session.

### Verified end state

| Quantity | Value |
|---|---|
| Research questions, fixed | 5 |
| Gap limbs with no question | 1 (limb 7, by approved decision) |
| Results sections with no question | 1 (`sec:res-chatlog`, by approved decision) |
| Questions with no result | 0 |
| Approvals in `05` §7 | A1–A17 |
| Reopened items | U1, U2 |
| Declared HC59 divergences in 5.5 | 6 |
| Dissertation prose changed | 0 |
| Files pushed to Overleaf | 0 |

### Where to start next session

Opening sequence per **Session lifecycle** in `brain/PRJ93_RULES.md`, and
`BLOCKED_third_party.md` first — it is the state, this file is history. Everything in the
previous handover's start list still stands and none of it was touched this session.

Specific to THIS handover: `06_research_questions.md` is now the second closed document
alongside `05_paper_architecture.md`. Both are approved and neither is reopened without a
U-row. The two prompt blocks in `06` §10 — the Chapter 5 5.1 discipline and the Methods
3.11 exception — must reach the sessions they name, or those sessions will rediscover the
problems they were written to prevent.

---

## 2026-08-07 — Phase: numerics regime, blocker clearance, first figures

**Completed**

- `eval/interval_calibration` regenerated in **both** venvs (`log/78`). `.venv-forecast`
  reproduces every committed number exactly and the artefacts now carry a provenance stamp;
  `.venv-eval` reproduces `log/61`'s deltas to the digit (Winkler 1814.3 → 1839.6, ACI clamps
  46 → 76).
- **The finding**: coverage and Winkler point estimates are resolution-stable; the confidence
  set built on them is not. Two River Taps loses a set member and gains an adoption candidate
  between numpy minor versions. Corrected float attribution — this is **`tab:winkler`**'s set
  column, not `tab:mcs`. Binding notes in `05_paper_architecture.md` **§2.7b (W1/W2/W3)`.
- B1, B2, B4, B5 applied to Overleaf. B2 removed the power and MDE columns and the prose that
  quoted them; B4 added the pairs column and the frame paragraph; B5 added seed, candidate-set
  size and folds. 5.3 carries the numerics validity note. 4.3 states and resolves the Beer
  Hall N−M exception.
- Four body figures built, rendered and viewed: F4, F5, F6, F7, under `figures/`.
- Two rules added to `PRJ93_RULES.md`: verify a fix by inspecting the artefact, never the exit
  code; and report a clean result with the scope of the check that produced it.

**Verified end state**

- Working tree clean, committed. Overleaf carries `figure_proof.tex` at the project root
  (isolated, not `\input` by `main.tex`).
- `figures/out/`: four PDFs + `fig_blocks.tex`, `fig_pipeline.tex`, `figure_proof.tex`.
- Block spans: fit 230 / validate 56 / calibrate 56 / test 57, Beer Hall calendar 399 days.

**Unstarted / open**

- **F1 and F3 have never been compiled.** No TeX toolchain here; verification is by Overleaf
  compile, and the PDF must be looked at rather than the log. A-F1..A-F7 not started.
- **Three unstamped artefact clusters contain a model confidence set**: `group_icl_mcs.json`,
  `weather_basis_mcs.json`, `mcs_L1_results.json`. After `log/78` this is a **known-shape
  exposure, not an unknown one** — an MCS is an elimination procedure over bootstrap p-values,
  so a perturbation too small to move a point estimate can still cross α and delete a set
  member, and none of the three records the environment that produced it. `mcs_L1_results`
  is `.venv-forecast` by `log/70`'s record only. `tab:mcs`, `tab:weather` and `tab:group` all
  read from these. Closing it means re-running all three; regenerating the ladder is out of
  scope under the approved `tab:ladder` disposition.
- `tab:mcs` bounded gap: recorded at `05` §2.7b W2, deliberately left open.

### Carried out of 2026-08-07 — read this before touching a figure

**F1 and F3 are at revision 4, authored, and have NEVER been compiled.** There is no TeX
toolchain on this machine; verification is by Overleaf compile, which is the stronger route
because Overleaf is the environment that actually builds the document. `figure_proof.tex`
sits at the Overleaf project root — isolated, not `\input` by `main.tex`, so a TikZ error
cannot reach the chapters. (Root rather than `scratch/` because the bridge will not create a
directory.) Set it as the compile target, build, and **look at the PDF** — the log answers a
different question.

Six-item check list, in the file's own preamble:

1. adjacent below-bar labels separated — arithmetic says 1.23 mm; confirm no glyphs touch
2. nothing left of the picture origin
3. **no label descends into the time axis or the date labels** — the one the generator
   cannot check
4. no overfull `hbox` on that page
5. **KNOWN OPEN, cosmetic.** The disjointness label is ~6 cm of text over a 1.9 cm arrow. If
   it reads as floating rather than attached it needs a leader line or a shorter phrase. It
   was deliberately **not** guessed at: whether it reads as detached is a judgement that
   needs the render, and the three revisions before it all failed by predicting instead of
   looking.
6. `adopted` reads as a tag for the whole row, not as part of the `fit` label

**So F1 is not finished.** It is one known cosmetic away, and that is the state to inherit.

**A-F1 through A-F7 are not started**, blocked on the same gap. Whoever builds them applies
the six-item list per float **and the assertion boundary from the start** — that boundary is
the transferable output of four revisions on one figure and is written up in `PRJ93_RULES.md`:

| Property | Verified by |
|---|---|
| horizontal spans, overlap, origin placement | generator assertion, every run |
| vertical extent, overfull boxes, glyph collision | the compile, and only the compile |

The failure mode it prevents: **when a fix moves an object, re-derive every constraint the
object was subject to, not the one that prompted the move.** Rev 1 fixed vertical overflow
and left horizontal overlap; rev 2 fixed the overlap and pushed vertical extent back through
the axis. Each was checked against the defect that prompted it.

**The three unstamped MCS clusters** are recorded above with their mechanism, not as a
filename list — an elimination procedure over bootstrap p-values, where a perturbation too
small to move a point estimate can still cross α and delete a set member. 8C reads that while
composing `tab:group` and `tab:weather`.

### Next session is finishing 8B, not starting 8C

The figure programme is incomplete and 8C's chapter sessions take the built manifest as an
input. Outstanding: the F1/F3 compile, A-F1 through A-F7, and the manifest.

**Recommended sequencing: build the appendix floats first and hold the compile for all nine
at once.** They are independent of F1's open cosmetic, it is one review pass instead of two,
and it tests the assertion boundary against seven new floats rather than one. The alternative
— compile first, fix F1, then build — is only better if the compile happens immediately.

---

## 2026-08-07 — Phase 8B: appendix floats built, programme closed to the compile

**Completed**

All nine floats are authored. Nothing in 8B is outstanding except the compile itself.

- **A-F1 Appendix B** — criteria table plus prose, *not* a PRISMA flow (U3). Both conditions
  discharged in the appendix text: non-pre-registration declared there rather than only in
  the ledger, and a paragraph before the counts table stating every figure in the subsection
  is terminal and they do not form a funnel. **No identified/screened/excluded counts appear**
  — they do not exist and were not constructed.
- **A-F2, A-F3, A-F4 Appendix C** — `alg:conformal`, `alg:adoption`, `alg:detection` in
  `algorithm2e`, each with a `\Notation` block defining every symbol on first use, and
  departures from the cited source stated by line number.
- **A-F5, A-F6, A-F7 Appendix C/D** — TikZ, assertions applied from the first draft rather
  than after a defect. A-F5 is the deployment architecture and does **not** restate F3's
  method pipeline. A-F7 is F2 demoted; its grounding was re-examined and survives.
- `figures/_tikz_assert.py` — shared geometry assertions, exercised against five deliberate
  violations before being relied on.
- `figure_proof.tex` at **revision 6**, nine pages, one per uncompiled float, each carrying
  its own numbered check list with generator-uncheckable items marked as such. Its preamble
  matches `main.tex` exactly. Nothing was written to `main.tex`.

**Two corrections that propagated**

- **Siffer is a convention source, not a method source.** This project implements no part of
  SPOT — no GPD fit, no Grimshaw estimate, no EVT threshold. The wrong premise lived only in
  `07_figure_programme.md`'s grounding column and is fixed at source. Methods 3.8 does not
  cite Siffer at all and the literature review already drew the distinction, so it was
  contained. An unverified grounding claim of my own (Siffer Fig. 7, on F6) was dropped in
  the same pass — the figure as built does not use the convention.
- **F1's clearances were first computed against the compile harness, not the document.**
  Authored under `article`/11pt/landscape/15 mm; the target is `report`/twoside/12pt/
  `\linespread{1.5}`/150 mm. Horizontal clearances are unaffected — they derive from figure
  coordinates. **The vertical clearance is 2.2 mm, not the 3.3 mm reported: wrong by a third.**
  The axis is now derived (`LABEL_TOP_Y - LABEL_H_CM - AXIS_MARGIN_CM`) and `LABEL_H_CM`
  records that it is an estimate from base size, `\scriptsize` ratio and `\linespread` — not
  a measurement, and wrong if any of those three change.

**Open — the single outstanding 8B item**

**The compile.** `figure_proof.tex` must be set as the Overleaf compile target, built, and
the rendered PDF inspected. This cannot be done from here: the Overleaf MCP writes and reads
files and has no compile tool or PDF read-back.

**Review order when the PDF comes back**, most consequential first:

1. **F1 item 5** — the disjointness label, ~6 cm of text over a 1.9 cm arrow. Deliberately
   left unguessed; needs a leader line or a shorter phrase if it reads as floating.
2. **The three items no generator could check** — F1's vertical extent (2.2 mm clearance),
   algorithm line overflow on A-F2 to A-F4, and A-F7's inset legibility.

Everything else on the nine check lists is either asserted by a generator or cosmetic.

**Then**: apply `brain/ledger/main_preamble_diff.md` to `main.tex` — **approved, to be applied
after the proof compiles clean, not before**. `amssymb` is taken, so A-F4 uses `\mathbb{1}`.
The proof carries exactly this preamble, so a clean compile proves the additions before
`main.tex` is touched. 8B closes at that point and the next session is **8C-1, Chapter 2**.

### Correction appended at close — the preamble gate found a defect, not a formality

Applying the preamble diff meant reading `main.tex` rather than the ledger note describing
it. **Two of the diff's three lines were wrong**: `amssymb` and `algorithm2e` were both
already loaded.

The stale reading hid a real defect. `main.tex` loads `\usepackage[algo2e]{algorithm2e}`
**alongside `algorithm` and `algpseudocode`** — that option exists to stop the two clashing
and it **renames the environment**. A-F2, A-F3 and A-F4 all opened `\begin{algorithm}`,
which in `main.tex` opens the other package's float and fails every algorithm2e body command
inside it.

**`figure_proof.tex` would not have caught this.** Loading `algorithm2e` alone, with no
`algorithm` package, `\begin{algorithm}` resolved correctly and those three pages would have
compiled clean while the document broke. *A proof that passes where the document fails is
worse than no proof: it converts an open question into a false answer.* Same shape as the F1
geometry retrofit — assert against the target, not the harness — one layer up, in the package
block rather than the class options. **The package block is part of the target's geometry.**

Applied to `main.tex` (additive, nothing removed or reordered): the four TikZ libraries,
`\RestyleAlgo{ruled}` and `\LinesNumbered`. Command forms, so the `[algo2e]` option that
makes the coexistence work is untouched. Read back and verified. A-F2/3/4 open
`\begin{algorithm2e}`; A-F4 uses `\mathbb{1}`. `figure_proof.tex` is at **revision 7** with a
preamble reproducing `main.tex`'s package block.

**Not verified, stated rather than glossed:** the proof pushed to Overleaf was assembled from
verbatim reads of the local file but was not byte-diffed afterwards — the MCP cannot diff, and
re-reading 40 kB to compare by eye is not a check. `figures/out/figure_proof.tex` is
authoritative. A transcription slip would very likely surface as an error on the page being
inspected, but that is a likelihood argument, not a verification.

**Known drift hazard for 8C:** each float exists twice — in `figures/out/*.tex` and inlined
in the proof. Collapse to `\input` when the appendix files go to Overleaf.

**8B state at close: unchanged in substance — the compile is still the single outstanding
item**, but it now tests the preamble the document actually has. Review order as recorded
above: F1 item 5 first, then the three generator-uncheckable items, plus one new check per
algorithm page (the float opens `algorithm2e` and the body is line-numbered).

---

## Session 2026-08-07 — Phase 8C: Chapter 2, Background and related work

**Completed.** `chapters/literature_review.tex` recomposed from the evidence base and
pushed to Overleaf. Verified on the remote: `get_sections` returns **10 sections**, exact
approved headings from `05_paper_architecture.md` §2.1, in order.

**Artefacts written**
- `ledger/background_argument_skeleton.md` — the 16 load-bearing arguments extracted from
  the current prose before composing, with the four §8.3 names in full, plus the costed
  deliberate-cut table. This is the D7 protection step.
- `ledger/background_rewrite_critique.md` — five critique rounds (ARC roles A/B/C plus
  descriptive-vs-critical and process-vs-result). 6 blocking findings, all fixed; 9 advisory
  with dispositions.
- `chapters/literature_review.tex` on Overleaf, whole-file `write_file` (not
  `write_section`, per the 2026-07-31 incident).

**Verified end state**
- 8,592 → **4,893 words** against a 4,000 budget. **Over by 893 (22 %).** Not closed; the
  costed cut-list is in the hand-off and the four candidate cuts each remove a load-bearing
  derivation.
- **No new citation keys.** 14 dropped for space, all still in `ref.bib`:
  `athanasopoulos_forecast_2024`, `bhattacharya_towards_2024`, `cini_graph-based_2024`,
  `gim_evaluation_2023`, `hancock_meta-analysis_2011`, `hertel_explainable_2026`,
  `kolassa_why_2020`†, `lee_trust_2004`, `makridakis_m5_2022`†,
  `parasuraman_complacency_2010`, `parasuraman_humans_1997`, `ye_closer_2025`,
  `zou_poisonedrag_2025`. († restored after round 3 — R66 needs the headline metric's
  external warrant.) 80 keys used, every one present in `ref.bib`.
- **Labels: all seven pre-existing preserved** (`sec:rw-framing`, `-rhythm`, `-ruler`,
  `-deviation`, `-surfacing`, `-evaluation`, `-synthesis`) so no inbound cross-reference from
  methodology/results/conclusion breaks. Three added for the previously unlabelled
  subsections: `sec:rw-pooling`, `sec:rw-intermittent`, `sec:rw-conformal`.
- **Zero dangling `\ref`.** Every target resolves inside the file. `\ref{app:search}` was
  written and then replaced with plain `Appendix~B`, because Appendix B does not exist and
  the ref would have compiled to `??`.
- All 38 PRJ93-result passages dispositioned per §2.9. No forward reference into Methods or
  Results survives.
- AI-writing pre-flight clean: 0 em dashes, 0 flagged vocabulary, 0 vague attributions, 0
  superficial `-ing` analyses. One negative parallelism was found by the round-4 read, not by
  the regex sweep, and fixed.

**Findings that change the record**
- **`05_paper_architecture.md` §2.1 and §3.2 disagree on one heading.** §2.1's tree gives
  *"Demand forecasting on short hospitality series"*; §3.2's rename table gives *"Demand
  periodicity under short histories"*. **Both are approved** (A2/A10 and A5). Resolved in
  favour of §2.1 because the prompt names the tree as the source for headings and because
  §2.1's form is parallel with its siblings under N3. Reported, not reconciled silently.
- **`zotero_search_by_citation_key` returns false negatives in web mode.** It scans `Extra`
  for a `Citation Key:` line, so it finds only the three keys pinned during the 2026-08-06
  repair and misses every key whose BBT key is unpinned. Four keys reported "not found" were
  confirmed live by title lookup. **A null from that tool is not evidence of absence.**
  `BLOCKED_third_party.md` §G's one remaining check (whether `zotero_update_item` now
  succeeds) was not run — no write was needed.
- **`brain/drafts/literature_review_condensed.tex` exists** (2026-08-04, 7,481 words) and is
  superseded: it predates the live revision 6 and is itself 87 % over the 4,000 budget. Not
  used. The template did not anticipate it.

**Unstarted / carried**
- The 893-word overrun. Escalated rather than closed, per §7's fixed-budget rule.
- `Appendix~B` is plain text; convert to `\ref{app:search}` when Appendix B lands.
- R66 has one known gap by approved decision: the knowledge-gap signal (Methods 3.11) is
  argued for nowhere in Chapter 2, because `06_research_questions.md` §7.2 rules out
  building an eighth gap limb for it. Recorded in the critique file so it is not "fixed".

---

## 2026-08-07 — 8C-1 hand-off adjudicated (Phuong). Overrun held PROVISIONAL.

Ruling on the five items carried out of the composition session. Appended, not merged into
the entry above.

**1. The 893-word overrun is provisional, pending a boundary check. It is not accepted.**
None of the four costed cuts is made. **A4** (Meyer's compliance/reliance distinction) and
the **limb-by-limb decomposition** are ruled not cuttable — A4 is a claim about prior work so
Chapter 2 is its home, and the decomposition is what discharges **R63**, a marking criterion.
**A3** and **A6** are neither cut nor kept: they are tested for **relocation to Methods 3.2
and 3.7**, whose rulings they already underwrite, as the **first step of 8C-2**. If Methods
can carry them, ~200 words leave Chapter 2 with no argumentative move lost. If not, the
residue is irreducible and the decision moves to budget reallocation — by which point
Methods' real floor is known, which it is not today. Reasoning and the boundary rule in
`background_argument_skeleton.md`, final section.

> **4,893 is not a precedent.** An unmarked 22 % overrun compounds: six chapters at that rate
> land the document at 24,400 against HC1's 20,000. Any later session quoting this figure
> quotes it as provisional or not at all.

**2. The live word count is 4,893, not 4,856.** `background_rewrite_critique.md`'s verdict
carried 4,856, measured before the round-3 R66 restorations and the round-4/5 fixes and never
re-measured. **Verified on the artefact:** `chapters/literature_review.tex` re-read from
Overleaf and fingerprinted paragraph by paragraph against the local copy — 10 sections, 40
body paragraphs, one figure environment, identical openers and closers in identical order.
Correction appended to the critique file with the per-section table. One section figure in
the hand-off was also wrong: **2.8 is 421, not 433**; the sections sum to 4,893 only with 421.
The total was right.

**3. The heading conflict is closed as U4, not left open.** `05_paper_architecture.md` §7 now
carries **U4**: §3.2's rename-table rows for 2.2 and 2.3 are **superseded by §2.1**. §3.2
itself is struck through at those rows and carries a pointer, so a reader arriving there sees
it rather than finding it only in §7. **A second conflict was found while writing the U-row
and was not in the hand-off:** §3.2 also renames 2.3 to *"Cross-series pooling and global
models"* while its own row 5 (the weather MERGE) names the merged section *"Cross-series
pooling and exogenous covariates"* — §3.2 contradicts itself, and the shipped chapter uses
the §2.1 / row-5 form.

**4. The Zotero false-negative is now a rule, and `citation_audit.md` is cleared.**
`PRJ93_RULES.md` Verification rules now states that a null from
`zotero_search_by_citation_key` is not evidence of absence, with the four keys that
demonstrated it and the instruction to confirm by title lookup before acting. **The audit is
unaffected, and definitionally so:** its MISSING-KEY verdict is defined against `ref.bib`,
not against the library, and rests on the full 111-entry inventory recorded in its Method
section. `zotero_search_by_citation_key` produced no verdict in that file; Zotero appears
there only as a full-text source, which is a positive result and cannot be a false negative.
Both MISSING-KEY totals stand at 0. Scope of the check: the MISSING-KEY column only.

**5. Venue names stay out of 2.3.** Confirmed. Naming Beer Hall, Ellel and Two River Taps is
a study fact with no prior-work function; 3.1 owns it. *"An estate of three venues"* carries
the load-bearing property, which is the size.

**Carried forward — do not lose these two**

- **`\ref{app:search}`.** `chapters/literature_review.tex` §2.1 closes with plain
  `Appendix~B records the search and screening procedure behind this corpus`. It is plain
  text because Appendix B does not exist yet and `\ref` would compile to `??`. **Convert to
  `\ref{app:search}` when Appendix B lands**, and define that label there. Recorded here as
  well as in `background_rewrite_critique.md` C6, because a carry-forward living only in a
  critique record is a carry-forward that gets missed.
- **The Chapter 2 / Chapter 3 boundary check** is the first step of 8C-2, before any Methods
  composition. Its outcome decides whether Chapter 2's overrun closes or moves to
  reallocation.

### Correction, same day — the word counter was defective. **Chapter 2 is 4,948, not 4,893.**

The counter used all session stripped LaTeX comments with `%.*`, which also matches an
**escaped** `\%`. Every line quoting a percentage was truncated at the percent sign and its
remainder never counted. Found while moving the counter into `brain/scripts/wordcount.py`,
when the rebuilt tool disagreed with the figure reported hours earlier.

| | Buggy `%` | Corrected |
|---|---|---|
| Live Chapter 2 (12 `\%` lines) | 4,893 | **4,948** (+55) |
| Pre-rewrite Chapter 2 (23 `\%` lines) | 8,592 | **8,696** (+104) |

Isolated one regex at a time: the escaped-percent fix accounts for the whole difference.
**The "calibrated to 0.14 %" claim made earlier in this file is withdrawn** — it compared a
single aggregate against a single aggregate, which cannot detect a defect that moves both the
same way. The corrected counter reads 8,696 against the architecture's measured 8,604, ~1.1 %
high and unexplained; the direction of the fix is certain regardless, since a marker counts
the truncated words and the old counter did not.

**Sections changed: 2.5 → 352, 2.8 → 457, 2.9 → 570. The overrun is 948, not 893.** The
2026-08-07 ruling is unaffected — relocating A3 and A6 (~200 words) was never going to close
893 either — but S-1 in `BLOCKED_third_party.md` §F now reads 948 and every later quotation
takes that figure. Full corrected table in `background_rewrite_critique.md`.

**What this says about the earlier verification.** The artefact was checked correctly and
exhaustively: Chapter 2's text was fingerprinted paragraph by paragraph against the Overleaf
copy, and nothing was wrong with the text. The defect was in the instrument doing the
measuring, and it survived a check that only ever compared one total to one other total.

`brain/scripts/wordcount.py` now replaces the scratchpad counter. It carries the §2.1 budgets
for all six chapters, emits the per-section table as **paste-ready markdown with a Δ**, and
warns when a heading in the `.tex` is absent from the approved tree or vice versa. Two
transcription errors in two hand-offs (2.8 as 433, then 421) came from copying rows by hand;
there is now nothing to copy.

### Session-close checks, 2026-08-07 — agentmemory was NOT capturing

Three stores checked at close. Two were fine; one was not, and the failure had been silent
for at least two days.

| Store | State |
|---|---|
| `phase_state.md` | **updated** — the 8C-1 adjudication entry and the counter correction above |
| graphify | **updated** — `graphify update .` re-extracted 844 files and rebuilt to 13,598 nodes / 25,027 edges / 906 communities. `brain/scripts/wordcount.py` is now in the graph. Two standing warnings unrelated to this session: 56 `.sql` files need `pip install "graphifyy[sql]"`, and community labels drifted (879 saved against 906 now) so `graphify label` would refresh them |
| agentmemory | **NOT capturing.** See below |

**The agentmemory worker is down and has been since at least 2026-08-05.** `agentmemory
status` reports "Not running — no response at http://localhost:3111", and per
`.claude/rules/memory.md` the MCP tools then fall back silently to a flat
`~/.agentmemory/standalone.json` where nothing is indexed for recall.

**Root cause, which `agentmemory doctor` does not detect.** The `iii` engine (PID 67158,
started Wed 19:00) still **holds** port 3111 — `lsof` shows it LISTENing — but answers
nothing; `curl http://localhost:3111/health` returns **http 000**. So the port is occupied by
a hung process: `status` sees no response and reports "not running", while a fresh
`npx @agentmemory/agentmemory` dies with *"address 127.0.0.1:3111 is already in use"*. Doctor
reports only the generic "Server reachable ✗". Two duplicate `agentmemory` node workers
(PIDs 67147, 67949) are also live from the same evening.

**Fix, not applied — it kills processes on Phuong's machine and was not authorised:**
`kill 67158 67147 67949` then `npx @agentmemory/agentmemory`. Verify with
`agentmemory status` **and** a `curl` to `/health`, because status alone cannot tell a hung
listener from a dead one.

**Nothing from this session is lost.** All four `memory_save` calls returned real ids and
landed in `~/.agentmemory/standalone.json` (5 entries, including a round-trip probe dated
2026-08-05 that shows how long this has been broken). More importantly the durable facts were
also written to the file-based store at
`~/.claude/projects/-Users-hapuna-Downloads-ai-gm-ai-master/memory/` — five memories plus
`MEMORY.md` — which is a separate system and is intact.

**Two lessons, and the second is the same one this session already learned once.**
`memory_save` returning `{"saved":"mem_…"}` is not evidence of capture; it returns an id for
the fallback write too. That is the third instance today of a success-shaped return standing
in for a verified outcome, after the Overleaf push (checked properly) and the word counter
(not checked). And `.claude/rules/memory.md` already says to check the worker **at the start**
of a session — this session checked at the end, which is why four saves went to the fallback
before anyone noticed.

---

## 2026-08-07 — Phase 8C-2: Chapter 3, Methods. Composed, pushed, floor measured.

**Completed.** `chapters/methodology.tex` recomposed from the evidence base and pushed to
Overleaf. Verified on the remote: `get_sections` returns **12 sections**, the exact approved
headings from `05_paper_architecture.md` §2.1, in order.

**Artefacts written**
- `ledger/methods_argument_skeleton.md` — 14 load-bearing derivations (`M1`–`M14`) extracted
  from the superseded prose BEFORE composing. Nine exist nowhere else. This is the D7
  protection step, and it carries the post-composition confirmation that all 14 survived.
- `ledger/methodology_rewrite_critique.md` — five rounds (ARC roles A/B/C plus
  descriptive-vs-critical and process-vs-result). 12 blocking, all fixed; 7 advisory with
  dispositions.
- `chapters/methodology.tex` on Overleaf, whole-file `write_file`, per the 2026-07-31 incident.
- `drafts/methodology_8C2.tex` — local working copy.

**Verified end state**
- 9,385 → **5,618 raw / 5,526 marker-equivalent** against a 4,200 budget. **Over by 1,326.**
  Recorded as **S-3** in `BLOCKED_third_party.md` §F, PROVISIONAL on the same terms as
  Chapter 2's 948. **This is a measured floor**, not a first draft: two compression passes and
  five critique rounds, and every further hundred words costs a criterion named in §5.
- **All 25 labels** from the superseded revision preserved; no inbound `\ref` from
  `results.tex` or `conclusion.tex` breaks. `sec:repro`, `sec:mcs`, `sec:ruler-functional` and
  `sec:ruler-ellel` no longer head sections and sit on the passages carrying their content.
  `tab:mcs-config` is the sole label released, moving to Appendix C under A9.
- **28 citation keys, no new key and none dropped.** Every one already used by the superseded
  revision, so all resolve in `ref.bib`. Four load-bearing keys re-confirmed live in Zotero by
  TITLE lookup, per the false-negative rule; none carries `deleted`.
- AI-writing pre-flight clean: **0 em dashes** (from 9), 0 negative parallelisms, 0 flagged
  vocabulary. Three `-ing` and five rule-of-three hits inspected individually and kept as real
  enumerations.
- Outbound refs owed by other files: `fig:blocks`, `fig:pipeline`, `fig:origins`,
  `tab:mcs-config`, `sec:conclusion-limitations`, `sec:further-work`, `sec:res-chatlog`,
  `sec:res-winkler`. The last four exist today; 8D inherits the obligation to preserve them
  when Results and Conclusions are recomposed.

**The boundary check — RUN, and the two derivations answered DIFFERENTLY.**
Answer **(c)**: Methods can carry them and is itself over budget, so relocation moved the
overrun rather than resolving it. **B3** (median-versus-mean functional argument) stays in
Chapter 2 — a claim about where two literatures stop, which is Chapter 2's job by definition;
Chapter 2 saves nothing. **B6** (recorded-regime extension) moves to Methods 3.7, where it
already lived and where it carries a limit and a three-way attribution Chapter 2 cannot hold;
Chapter 2 keeps a ~25-word limb sentence, net −85. Detail in `background_argument_skeleton.md`
and §F S-1.

**Reallocation is NOT decided, deliberately.** Two floors are not enough. Results — 14,580
against 5,200 — is the chapter that determines whether there is anything to reallocate, and
it is the one where compression is genuinely plausible, since thirty sections of run narrative
collapse into five. Ruling now risks handing Methods words Results needs more. Measuring
Results puts **32,510 of the current 37,471** measured.

### Findings that change the record

- **U5 added to `05_paper_architecture.md` §7.** The Methods chapter opener had **40 words**
  — the arithmetic remainder of twelve section budgets, never designed as an allocation — and
  **R86 cannot be discharged in 40**, requiring purpose, materials background and aim. Raised
  as an A10 escalation and ruled to **75**, so it is a corrected approval rather than an
  unexplained overrun a later session re-litigates. The 35 words are inside S-3, not additional.
- **The `A` namespace collided FOUR ways, not three.** The fourth surfaced only while applying
  the fix: this file's July entries use `A3`, `A5`, `A6` as **citation-audit exception ids**
  (`A3` = no resampling citation behind the moving-block bootstrap; `A6` = the six hard-coded
  surfacing constants). **Fixed structurally in the files that could still move:**
  `background_argument_skeleton.md`'s arguments renamed **A1–A16 → B1–B16** (33 replacements,
  each reviewed), with §F updated to match. Approvals keep `A1…A17`, appendix floats keep
  `A-F1…A-F7`, Methods keeps `M1…M14`. **This file is append-only and keeps its old `A` ids** —
  anything reading an `A`-number out of it must check the entry's date and section before
  mapping it to an approval. The map is `05_paper_architecture.md` §7.
- **`wordcount.py` now reports Raw, Artefact and Marker.** Two over-reads, both systematic and
  both scaling with equation density: a displayed math environment leaves the literal token of
  its own name twice plus its label, and every `\label` leaves its key. Methods carries **92**
  such words. Compare two revisions on **Raw**, where the artefact cancels; quote **Marker**
  against a budget. The new column was verified against the same hand-counted fixture
  (24/6/18, exact) and the tree-divergence guard was exercised against a tampered heading and
  seen to raise. **Correction to the 8C-2 report: the artefact is 92, not 98** — the ad-hoc
  script double-counted the 6 label words that sit inside equation environments.
- **The stale calibration claim was still live in the instrument.** `wordcount.py`'s docstring
  asserted "calibrated to 0.14 %" — a claim this file withdrew hours earlier. Replaced with
  the fixture record. A withdrawal recorded in a ledger and not in the tool is a withdrawal
  the next reader does not see.

### agentmemory — recovered, backfilled, and the loss window characterised

The hung `iii` process holding port 3111 **had already exited**, so the recorded fix
(`kill 67158 67147 67949`) was unnecessary and was not run; the port was simply free.
`npx @agentmemory/agentmemory` brought the worker up: **v0.9.28, healthy, 17 sessions**.

**The loss was narrower than feared and is now closed.** `~/.agentmemory/standalone.json`
held **5** entries, not three days of work: one round-trip probe (2026-08-05) and **four**
durable saves, all from the morning of 2026-08-07. Two were superseded by this session's own
indexed save of the resolved boundary check. The other two — the governance defects (U4 and
the Zotero false negative) and the word-counter defect with its calibration lesson — were
**backfilled into the live index and verified by retrieval**, not by the returned id: both
now return as indexed `decision` records under a keyword recall.

**Independently, the file store was confirmed to carry everything the memories did**, which is
the check that matters, since the files are the real store: the boundary-check framing is in
`background_argument_skeleton.md` and §F S-1; U4 is in `05_paper_architecture.md` §7; the
Zotero rule is in `PRJ93_RULES.md`; the counter correction is in this file and in
`wordcount.py`. No durable fact existed only in the unindexed store.

### Session close addendum, 2026-08-07 — conventions recorded, runtime store untracked

Three rules added to `PRJ93_RULES.md`, each from a defect this session hit rather than from
principle:

1. **`brain-construction-local` is local; Overleaf is the publication target.** `git push` on
   explicit instruction only. The branch has run whole phases ahead of `origin` by intent, and
   that had been re-inferred once a session.
2. **A number entering a decision comes from an instrumented tool with a fixture, never an
   ad-hoc script.** Two ad-hoc counters have now been wrong, both in the direction of the
   number about to be acted on, and both caught only by building the real tool and watching it
   disagree: the `%.*` escaped-percent defect (4,893 for 4,948) and the artefact double-count
   (98 for 92). The fixture's expected value is derived by hand, cell by cell, before the tool
   runs.
3. **A withdrawal is retracted everywhere the claim was ASSERTED, not only where it was
   RECORDED.** The "calibrated to 0.14 %" claim was withdrawn in this file and left standing in
   `wordcount.py`'s docstring, which is where the next reader would actually meet it.

**agentmemory's runtime store untracked** (`data/state_store.db/`, `data/stream_store/`, 29
files). Binary, rewritten on every save, never present in a brain commit. Removed with
`git rm --cached` rather than deleted, so the memories backfilled earlier today survive;
verified after the fact — worker healthy, 4 memories, backfill still returned by recall.
Working tree now clean.

### 8C-3 carry-forward — the hand-off named three floats and it resolves into four exposures

Recorded in `BLOCKED_third_party.md` §F. **Verified against the owning files rather than
transcribed**, and the mapping did not survive the check:

- `tab:vuspr` is a **4.5** float in both `05` §2.7 and `07` §1, not 4.1 or 4.3, and its
  exposure is **not** the unstamped MCS — it and `tab:exchangeability` were introduced after
  the numbers audit and have **never been audited**, which `07` §4 states *"is not the same as
  clean"*.
- The unstamped-MCS exposure proper is **W2 on `tab:mcs` (4.1)**.
- `tab:group` (4.3) carries **B1, open** — the untraceable "roughly £40". `tab:weather` (4.3)
  carries **B3** — must source the post-M24 fold grid.
- **B4 is discharged by this session** and should not be re-raised: `tab:bases` shipped with
  its intervals, n-pairs and induced-MASE columns. **B5 remains open**, since `tab:mcs-config`
  is an Appendix C float and Appendix C does not exist.

**A gap in `BLOCKED_third_party.md`'s own remit was found while writing this.**
`07_figure_programme.md` §4 holds a **fourth state store**: a seven-row blocker table whose
open rows (**B1, B2, B5, B7**) are not reflected in §F, while §F claims to be the single
retrieval point. B7 is an artefact-staleness sweep that was never run and *"potentially
affects every figure"*. Not reconciled here — 8C-3 either folds those rows into §F or §F
states that `07` §4 owns them. Reported, not silently merged.

**8C-3 was not conducted.**

---

## 2026-08-07 (3) — Phase: state-store register, and the sweep that retracted the last entry

Governance session ruled by Phuong before 8C-3: §F owns pointers to every state store, not
only conformance rows; sweep for other stores; resolve B7's status. **8C-3 was not conducted.**

**The previous entry in this file is wrong and is retracted here rather than edited.** It
records figure blockers **B1, B2, B5, B7 as open** and B7 as *"an artefact-staleness sweep
that was never run"*. Every one of those four is closed, and three were closed before that
entry was written. It was transcribed from `07_figure_programme.md` §4 without checking the
files §4 itself points at — the same failure the entry above it was reporting.

**All eight float blockers are closed.**

- **B0** never open (`log/76` correction).
- **B1, B2, B4, B5 applied to Overleaf on 2026-08-07** — recorded in this file at the
  2026-08-07 (1) entry, five hundred lines above the entry that called them open. Verified in
  the live `results.tex`, not in the ledger: £9.99/£10.94/£4.27/£4.68/£5.84 and £185 widest
  for B1; *"No achieved power or minimum detectable effect is quoted anywhere in this
  chapter, and the omission is deliberate"* for B2; seed 93, $B = 1000$, block length 7 and
  the common-fold caveat in `tab:mcs`'s caption for B5.
- **B3** cleared by measurement, `log/77`: post-M24 **and** post-Gate-A with an independent
  cross-check.
- **B6** cleared by `log/76` §7 — L2 @90 % = 85.1 %, L3 = 72.1 %, the post-M2 figures.
- **B7 ran in full.** `log/76` Part 1 triaged 22 JSON artefacts by stamp; **Part 2** stamped
  seven generators, regenerated the eight unstamped artefacts and diffed them — six exact,
  two confirmed stale on the superseded ruler and corrected. Part 2 is a numerics check, so
  the *"it answered freshness, not numerics"* reading holds for Part 1 only and B7 needs no
  run decision.

**One residual, found by reading artefacts rather than the sweep's own report.** `log/76` §2
lists `eval/chronos2_covariate_probe.json` and `eval/group_icl_calibration.json` in Tier 1,
*"every one carries `store_ceiling = 2026-07-07`"*. Neither carries a `store_ceiling`, a
`provenance` block, or any stamp. Tier 1 is 18 of 22, Tier 3 is 10 of 22, and the error runs
in the reassuring direction. Both feed Results 4.3. Recorded as a known unknown; regenerating
them is a run decision and was not taken.

**Five dangling cross-references, against a §F row reading zero.** `tab:mcs-config`
(methodology + results), `fig:blocks`, `fig:pipeline`, `fig:origins` (methodology),
`fig:nulls` (results). All print `??`. Four were created by 8C-2 and the row was not updated.
`fig:nulls` is the cheapest: F7 is built and rendered, and only the float placement is
missing.

**Two chapter-file facts §F did not carry.** `chapters/introduction.tex` is an empty template
stub — Chapter 1 is 0 words against 1,400. `chapters/conclusion.tex` is composed to a
*five-chapter* shape predating the approved tree, carrying the Discussion's divergences and
limitations material; `main.tex` has no `\chapter{Discussion}`. Both bear on the reallocation
S-3 defers, and both push the same way — there is a real 1,400-word hole to fund.

**The B-namespace collision was self-inflicted by the previous session.** A1–A16 → B1–B16 was
a rename into a prefix already carrying `07` §4's float blockers B0–B7 and two files' round-B
critique ids. For one day §F used B1/B3/B6 in two senses forty lines apart. Fixed by naming
the owner beside every `B`-id that leaves its own file; not fixed by a second rename, since
the float-blocker namespace is now closed. Map extended in `05_paper_architecture.md` §7.

**Also retracted: `07` §11's *"Not made — nothing was written to `main.tex`"*.** The live
`main.tex` carries the extended `\usetikzlibrary`, `algorithm2e` (as `[algo2e]`, with
`\RestyleAlgo{ruled}` and `\LinesNumbered`) and `amssymb`. `ledger/main_preamble_diff.md`
recorded the application and recorded that two of the three claimed additions were never
missing; §11 and the header comment of the live `chapters/methodology.tex` are the copies
that were never retracted. The methodology header is **not** fixed here — editing Overleaf is
a human gate and no grant covers this session.

**Verified end state**

- `07` §4 carries an appended status correction; §11 carries a superseded marker.
- §F carries the state-store register, a corrected dangling-reference count, corrected
  8C-3 carry-forward rows, and the two chapter-file facts.
- `05` §7's namespace map extended with the `B` collision.
- Nothing pushed to Overleaf. Nothing regenerated. No run taken.

---

## 2026-08-07 (4) — Phase: 8C-F float migration, CHECKPOINT A

Migrating the figure programme out of the isolated harness into the chapters that own it.
Composes no prose. Checkpoint A is preamble + appendix skeletons only; stopped for a compile.

**Checkpoint A step 1 was a no-op, and the form specified in the prompt would have broken the
build.** The preamble additions are already in the live `main.tex` — extended
`\usetikzlibrary`, `\usepackage[algo2e]{algorithm2e}` with `\RestyleAlgo{ruled}` and
`\LinesNumbered`, and `amssymb`. `main_preamble_diff.md` records the application. The prompt
asked for `algorithm2e` loaded with `[ruled,vlined,linesnumbered]`; `main.tex` loads
`algorithm` and `algpseudocode` on the two lines above it, and the `[algo2e]` option is the
thing that renames the environment so all three coexist. Swapping the option set drops
`algo2e` and collides with `algorithm` — which is exactly why the approved diff used the
command forms and left the option alone. **Nothing in the preamble was changed.**

**Applied and pushed to Overleaf**

- `appendix/search_screening.tex` — Appendix B skeleton, defines `\label{app:search}`.
- `appendix/pseudocode.tex` — Appendix C skeleton, `\label{app:pseudocode}`.
- `appendix/robustness.tex` — Appendix D skeleton, `\label{app:robustness}`.
  All three are structural: a label and a header comment naming what Checkpoint B hosts.
- `main.tex` — the `appendices` block only. Three `\chapter` + `\input` pairs added after the
  inherited template stub, which is **kept deliberately**: chapters 2 and 3 reference
  Appendices B, C and D by letter, so removing Appendix A would reletter all three and
  invalidate every reference silently.
- `chapters/literature_review.tex` §2.1 — plain `Appendix~B` converted back to
  `Appendix~\ref{app:search}`. **This closes S-2.** Written with `write_section`, not
  `write_file`, so no other prose was in the write path; the neighbouring section was read
  back afterwards and is intact.

**Methods has no Appendix~B reference.** The prompt expected a carry-forward in both chapters;
`methodology.tex` references Appendices C and D only, in nine places, all plain text. Those
are now convertible since the labels exist, but converting them is a chapter edit and was not
in this checkpoint.

**Three float-body classes, and one architecture rule cannot cover them.** Recorded before
Checkpoint B acts on it:

| Class | Files | Correct handling |
|---|---|---|
| Bare `tikzpicture`, no caption, no label | `fig_blocks`, `fig_pipeline`, `a_f5_deployment`, `a_f6_injection`, `a_f7_origins` | Chapter supplies the float env, `\input`, caption, label — the rule as written |
| **Complete `algorithm2e` floats** already carrying their own caption and label | `a_f2_alg_conformal` (`alg:conformal`, `ln:sub`), `a_f3_alg_adoption` (`alg:adoption`, `ln:fc1`–`ln:fc3`), `a_f4_alg_detection` (`alg:detection`) | `\input` directly. Wrapping nests a float in a float and duplicates every label |
| **Not a float at all** | `a_f1_screening.tex` — a `\section` with `\label{app:screening}` plus three complete table floats | It is Appendix B's body. `\input` it under the chapter |

**Two Checkpoint B items are not migrations and need a ruling.** `tab:mcs-config` has **no
body anywhere** — authoring it from `blocker_clearance_package.md` B5 is composition, not
migration. `tab:window` is defined today inside `results.tex`; moving it to Appendix D edits
prose 8C-3 is about to delete.

**Verified end state**

- Overleaf carries 18 `.tex` files; the three new appendix files are present.
- `main.tex` read back after the write: preamble identical, appendices block as intended.
- Nothing under `figures/` moved yet. `figure_proof.tex` still present, retirement pending
  both compiles.
- One cosmetic defect introduced and not fixed: a `LOad-BEARING` typo in the new `main.tex`
  comment. Left rather than retransmit 250 lines of a file about to be compiled.

---

## 2026-08-07 (5) — Phase: 8C-F float migration, CHECKPOINT B

Every float with a home now lives in the chapter that owns it. Composed no prose beyond the
three float captions the architecture requires. Stopped for the second compile.

**Migrated and pushed — bodies under `figures/`, environments in the owning file**

| Float | Body on Overleaf | Environment lives in | Label |
|---|---|---|---|
| F1 | `figures/fig_blocks.tex` | `methodology.tex` §3.7 | `fig:blocks` |
| F3 | `figures/fig_pipeline.tex` | `methodology.tex` §3.1 | `fig:pipeline` |
| A-F2 | `figures/alg_conformal.tex` | **direct `\input`, Appendix C** | `alg:conformal`, `ln:sub` |
| A-F3 | `figures/alg_adoption.tex` | **direct `\input`, Appendix C** | `alg:adoption`, `ln:fc1`–`ln:fc3` |
| A-F4 | `figures/alg_detection.tex` | **direct `\input`, Appendix C** | `alg:detection` |
| A-F5 | `figures/fig_deployment.tex` | Appendix C | `fig:deployment` |
| A-F7 | `figures/fig_origins.tex` | Appendix C | `fig:origins` |
| A-F6 | `figures/fig_injection.tex` | Appendix D | `fig:injection` |
| A-F1 | `appendix/search_screening_body.tex` | **not a float** — Appendix B's body | 3 table labels |

Bodies were pushed **byte-identical to the generator output**, so a later diff against
`figures/out/` is a real check rather than a formality.

**Three captions authored, because a float environment cannot exist without one.** F1, F3 and
A-F7 used the captions already drafted at `07` §10. A-F5 and A-F6 had none anywhere — the
proof harness gave them `\section*` headings rather than captions — so both were written to
the 15/45 rule from `07` §3's own purpose and grounding lines. Appendix captions are uncounted
against HC1 (`05` §0), so neither costs budget. `tab:venues` and `tab:bases` were checked and
are already compliant: 13/34 and 13/36.

**A-F1's two structural changes, made deliberately and recorded in the file.** Its opening
`\section{Corpus search and screening}` was removed — `main.tex` issues a `\chapter` of the
same title, so it reproduced the chapter heading one level down. Its `\label{app:screening}`
was removed: `app:search` is what Chapter 2 references, two labels on one appendix is how a
reference ends up pointing at the wrong one, and `app:screening` was referenced nowhere. Its
starred subsections were promoted to `\section*` so the chapter does not skip a level.

**Held, and each for a stated reason**

- `tab:mcs-config` — no body exists anywhere; placing it means authoring a pre-registration
  table from `blocker_clearance_package.md` B5. **It is the only reference this migration does
  not resolve**, and it is live in both `methodology.tex` and `results.tex`.
- `tab:window` — defined inside `results.tex`; moving it edits prose 8C-3 will delete.
- F4, F5, F6, F7 — Results floats. Their PDFs already carry final names
  (`fig_drift`, `fig_validity_efficiency`, `fig_sensitivity`, `fig_nulls`) in
  `figures/out/`. **They could not be pushed**: the Overleaf bridge's `write_file` takes
  string content, so a binary PDF cannot go through it, and pushing a corrupted one would be
  worse than a missing one. `figures/gap_map.pdf` and `figures/ladder.pdf` are already in the
  project, so the path exists — it is just not this one. Manual upload, then 8C-3 writes four
  `\includegraphics` environments.
- The Methods plain-text `Appendix~C`/`Appendix~D` conversion — ten occurrences across seven
  sections. **Deliberately all-or-nothing and deliberately after the compile**: converting
  half leaves a chapter mixed, and `\ref{app:pseudocode}` only renders "C" if the appendix
  lettering survives, which the compile has not yet confirmed. Doing it first would be
  asserting against the harness rather than the target.

**Verified end state**

- 108 labels in the compiled document, **no duplicates**, checked mechanically rather than by
  eye. `figure_proof.tex` redefines nine of them but is not `\input` by `main.tex`, so it does
  not participate — that is the retirement case, not a live clash.
- Every `\ref` in Chapters 2 and 3 resolves **except `tab:mcs-config`**. `results.tex` still
  carries `fig:nulls` dangling, held by design.
- `methodology.tex` read back from the remote after both writes; both floats present, both
  neighbouring sections intact.
- Two stale comments knowingly left, both deferred rather than fixed, because each would cost
  a full-file retransmit of a chapter immediately before a compile: `main.tex`'s `LOad-BEARING`
  typo, and `methodology.tex`'s header, which still claims `main.tex` lacks the preamble
  packages, still gives the wrong `[ruled,vlined,linesnumbered]` form, and still points at
  `out/` paths that no longer feed the document. The header is the one that matters.

---

## 2026-08-07 (6) — Phase: 8C-F, the first document compile failed and was repaired

Checkpoint B produced no PDF. No compile log was available and there is no TeX toolchain on
this machine, so the repair was made from a static reading of the pushed files. **The fix is
inferred, not confirmed** — the next compile is what establishes it.

**Root cause, with the reason it is the leading candidate.** `main.tex` loaded `algorithm`,
`algpseudocode` and `algorithm2e` together. `algpseudocode` (algorithmicx) and `algorithm2e`
both define `\For`, `\ForEach`, `\If`, `\ElseIf`, `\Return` and `\KwTo` — every command the
three appendix algorithm floats use. The `[algo2e]` option resolves only the *environment*
clash with `algorithm`; it does nothing about the command clash.

**Checkpoint A proved the preamble loads and nothing more.** A contained no `algorithm2e`
environment at all, so it exercised none of those commands. Checkpoint B introduced the first
three in the project's history alongside eight other new things. The staging that existed to
prevent exactly this was applied to the preamble and not to the riskiest content.

**Verified before removing anything:** zero occurrences of `\begin{algorithm}`, an
`algorithmic` environment, `\State`, `\Procedure` or `\listofalgorithms` in any chapter or
appendix. Both packages were template leftovers.

**Four changes pushed**

| File | Change |
|---|---|
| `main.tex` | `\usepackage{algorithm}` and `\usepackage{algpseudocode}` **removed**. `[algo2e]` kept — it names the environment the floats open, so dropping it would break all three. Comment rewritten to record why. `LOad-BEARING` typo fixed |
| `figures/alg_detection.tex` | `\tcp*[f]{...}` sat on its own line after two `\lIf` lines; `\lIf` terminates its own line, so the end-of-line comment had no line to attach to. Now a `\tcc{}` full-line comment placed before the conditionals |
| `figures/alg_detection.tex` | `\If{...}{...}` was followed by `\ElseIf{...}{...}`. `\If` closes its block, orphaning the `\ElseIf`. Now `\uIf` + `\ElseIf`, which is algorithm2e's chaining form |
| all three `alg_*.tex` | `\SetAlgoLined` removed. It set the lined style per float and overrode the `\RestyleAlgo{ruled}` main.tex sets globally, which would have rendered one appendix's three algorithms in two styles |

`\textbf{and}` inside the Detector~B condition became `\textnormal{and}`, and the pooled
fallback line in `alg:conformal` was rewritten to name the pooled $\hat q$ rather than reuse
an undefined symbol.

**Not touched, deliberately.** `methodology.tex`'s stale header. It is comments only, so it
cannot affect a build, and retransmitting ~600 lines of a chapter while the build is still
unverified adds transcription risk to a diagnosis. It is scheduled for after the compile
passes, together with retiring `figure_proof.tex`.

**Verified end state**

- `main.tex` read back from the remote: package block as intended, appendices block intact,
  `\begin{document}`/`\end{document}` balanced.
- `figure_proof.tex` is still in the project and still not `\input` by `main.tex`, so it is
  not contributing to the failure — and it remains the only place those three algorithm
  floats can be exercised in isolation.
- Expected `??` after a successful compile is unchanged: `tab:mcs-config` and `fig:nulls`
  only.

---

## 2026-08-07 (7) — Phase: 8C-F, static audit of the whole project, second repair

**The compile log is not retrievable and this is now established rather than assumed.** The
Overleaf MCP is a **git clone of the project source** in a temp directory; Overleaf keeps
`output.log` and `output.pdf` on its compile server and never commits them. Probed three
ways: `list_files` with `.log` returns nothing, `read_file output.log` returns ENOENT, and
`find` over the clone turns up only the two committed figure PDFs. **No tool in this bridge
can read a compile log. Stop looking for one.**

**What the clone does allow is a real static audit** over the actual input graph rather than
inference. Written and run this session:

| Check | Result |
|---|---|
| `\input` graph reachable from `main.tex` | 25 files, every target exists |
| `\begin`/`\end` balance per file | all balanced |
| `\includegraphics` targets | both exist (`figures/gap_map`, `figures/ladder`) |
| Labels / duplicates | 109, **no duplicates** |
| Dangling `\ref` | exactly 2 — `fig:nulls`, `tab:mcs-config`, both expected |
| Unpaired `$` | none |
| Unescaped specials outside math | none (all hits were `_` inside `\input`/`\citet`/`\label` args, `&` in tabular, `#` in macro bodies) |
| Cite keys in the new captions vs `ref.bib` + `ref_additions.bib` | all 8 resolve |

Structure is clean, which is itself the finding: **the fault is package-level, not
structural**, and the audit surfaced the defect that explains the failure exactly.

**`\SetKwInOut` was declared three times.** Each of `\Input`, `\Output` and `\Notation` was
declared inside all three appendix algorithm floats. `\SetKwInOut` builds its macro with
`\newcommand`, so the first `\input` defines them and the second dies with *"Command
`\Input` already defined"*. **This can only fire once a document holds two or more
`algorithm2e` floats**, which is precisely what Checkpoint B created for the first time and
precisely why the isolated proof harness never caught it — `figure_proof.tex` was never
compiled either, so nothing had ever exercised two of them together.

Declared once in `main.tex` now; removed from all three floats.

**Repairs pushed across both passes**

| # | Defect | Fix |
|---|---|---|
| 1 | `algorithm` + `algpseudocode` + `algorithm2e` all loaded; the first two define `\For`, `\ForEach`, `\If`, `\ElseIf`, `\Return`, `\KwTo` | Both removed — verified zero uses of `\begin{algorithm}`, `algorithmic`, `\State`, `\Procedure`, `\listofalgorithms` anywhere. `[algo2e]` kept: it names the environment the floats open |
| 2 | `\SetKwInOut` ×3 → `\newcommand` collision | Declared once in the preamble |
| 3 | `\tcp*[f]` orphaned after two self-terminating `\lIf` lines | Now a `\tcc{}` line before the conditionals |
| 4 | `\If` followed by `\ElseIf` — `\If` closes its block | `\uIf` + `\ElseIf` |
| 5 | `\SetAlgoLined` per float overrode the global `\RestyleAlgo{ruled}` | Removed from all three |

**Verified after the second push**, by re-running the audit against the clone: live
`\SetKwInOut` declarations = 3, all in `main.tex`; no live `\SetAlgoLined`; 25 files, all
environments balanced, 109 labels, no duplicates, the same two expected dangling refs.

**Still inferred, not confirmed.** Every defect above is real and each would break a build,
but without a log there is no proof that the *first* one to fire has been removed. The next
compile is the test.

**Method note worth keeping.** The clone path leaked out of an ENOENT error message. The
audit it made possible found in one pass what two rounds of reading files in context did
not — because it ran over the *real* input graph rather than over the files I remembered
pushing. Prefer a mechanical sweep of the resolved graph to re-reading what you believe you
wrote.

---

## Session 2026-08-07 — Phase 8C-F: local compile, git write path, queue cleared

**The single outstanding 8B item is closed. The document compiles.**

### Stage 1 — TeX Live and the first real compile

**TeX Live 2026**, `scheme-full`, installed to `~/texlive/2026` via `install-tl` with a
profile and **no `sudo`** (binaries land in `bin/universal-darwin`, not `aarch64-darwin`).
`latexmk` 4.88, `biber` 2.21. Doc and source files were skipped (`tlpdbopt_install_docfiles`
/`srcfiles = 0`) — no package is omitted by that, only their documentation.

**Overleaf's TeX Live year is UNRESOLVED and could not be read from here.** The MCP bridge
exposes only file read/write — no settings tool — and the year is not stored in the repo.
Local is 2026. **These are not assumed equal.** Same class of risk as numpy 1.26 vs 2.5
(`log/78`); Phuong must read Menu → Settings → TeX Live.

**`brain/scripts/latexcheck.py`** — the instrumented tool. Runs `latexmk -pdf
-interaction=nonstopmode -halt-on-error`, parses the log into a table (undefined refs BY
LABEL NAME, undefined citations by key, lost floats, over/underfull boxes with location and
overflow in pt, missing characters, package errors), prints page count and output path, and
exits non-zero on any error class and on undefined references. Sets `max_print_line` so TeX
does not wrap label names across log lines and silently truncate the parse.

Verified against a fixture carrying a deliberate undefined `\ref`, a bad citation key and an
overfull hbox — **in both directions**: exit 1 on the broken fixture, exit 0 on a clean one.

**The instrument was wrong on its first real run, and the artefact caught it.** It printed
`VERDICT: PASS` over a build that produced no PDF. Two causes: with `-file-line-error` errors
are emitted as `<file>:<line>: Package X Error:`, matching neither the `!` nor the `^Package`
form; and the string is `Fatal error occurred, no output PDF file produced`, not `No pages of
output`. Fixed; VERDICT now also fails on a missing output PDF and a non-zero latexmk exit.
This is the exit-code rule catching the tool written to enforce it.

### The compile, against the checklist

| # | Check | Result |
|---|---|---|
| a | Does it build? | **YES — 139 pages, 0 errors.** But not at first |
| b | Appendix lettering B/C/D | **CONFIRMED** — A p112, B p113, C p117, D p124 |
| c | Undefined refs = exactly two | **CONFIRMED** — `tab:mcs-config`, `fig:nulls`. No third |
| d | Line refs print numbers | **CONFIRMED** — `ln:sub`→9, `ln:fc1`→2, `ln:fc2`→5, `ln:fc3`→9. No `??` |
| e | A-F7 placement | **No floats lost anywhere.** A-F7 sits on p120 with A-F5 |
| f | Overfull boxes | 10 → 9 after fixes. Algorithm pages are NOT the exposure: `pseudocode.tex` overfulls by only 2.54 pt |
| g | LoF / LoT short titles | **The six new short titles all work.** The defect is elsewhere — see below |

**(a) THE SUSPECTED CAUSE IS EXONERATED.** The `[algo2e]` / two-`\lIf`-then-`\tcp*[f]`
arrangement in `alg:detection` was already repaired on 2026-08-07 (four fixes recorded in the
file header) and `algorithm`/`algpseudocode` were removed from `main.tex`. It did not die in
Appendix C. **The real first fatal was `figures/fig_pipeline.tex` (F3, in Methods):** its
TikZ node style was named `out`, which collides with TikZ's built-in `/tikz/out` key —
declared value-required, so a `.style` redefinition never takes effect. Error: *"The key
'/tikz/out' requires a value"*. Renamed to `outb`. **Do not name a TikZ style after a TikZ
key.** This would have failed on Overleaf identically.

**(g) `chapters/results.tex` has 17 `\caption` commands and ZERO `\caption[short]{long}`.**
Every Chapter-4 table plus Figure 4.1 therefore dumps its entire multi-sentence caption into
the lists — the List of Tables runs to **six pages** and carries a 224 pt overfull vbox. The
six new short titles (methodology ×4, litreview ×1, appendix B/C/D) are all correct and none
split at the wrong point. **Writing 17 short titles is 8C-3 work and was deliberately not
done this session.**

### Stage 1.4 — resolved by LOOKING, not by predicting

Pages rasterised at 200–500 dpi and viewed. Four defects, all of them downstream of line
breaking and all invisible to every generator assertion. **All fixed in the GENERATORS**
(`figures/fig_blocks.py`, `figures/fig_appendix_tikz.py`), regenerated, copied, recompiled
and re-inspected.

- **F1 item 3 — FAILED.** The time axis printed **through** the `n=230` glyphs. `LABEL_H_CM`
  was a derived estimate of 0.72 cm carrying its own *"THIS IS AN ESTIMATE, NOT A
  MEASUREMENT"* warning. **Measured off the render: 1.05 cm** — short by 0.21 cm, almost
  exactly the 2.2 mm it was supposed to be leaving. Axis 0.04 → −0.29. **Measured clearance
  after the fix: 6.29 pt = 2.22 mm**, matching `AXIS_MARGIN_CM`.
- **F1 item 5 — read as detached.** ~6 cm of text over a 1.9 cm arrow, midway between two
  rows and tied to neither. Added leader lines from each arrow end to the adopted row at the
  fit-end and calibrate-start coordinates. Wording kept: *strictly* is the strict inequality.
- **F1 item 6 — NO DEFECT.** "adopted" reads as a row tag, parallel to *superseded:*.
- **A-F7 inset — the overlap IS legible, but the title was destroyed.** "three consecutive
  origins, magnified" was painted over by the first forecast block (blocks are emitted after
  the title node; gap 0.34 cm against a ~0.40 cm descender). Gap now 0.78 cm.
- **A-F6 — sub-caption printed straight through the `realistic arm` box** and overfull'd by
  9.56 pt. Moved to y=−2.6 with a wrapping width. That overfull box is now gone.
- **A-F5 and F3 — clean** once F3 compiled at all.

**Local environment gaps, stated rather than glossed.** `\includesvg` in `title_page.tex`
needs Inkscape, which is not installed locally; a **scratch-only** `svg.sty` stub routes past
it, so **the title page is NOT locally verified**. `\quickwordcount` needs `-shell-escape`
(emits `main-words.sum`, now gitignored). Overleaf has both.

### Stage 1.5 — the assertion boundary is now THREE tiers

`PRJ93_RULES.md` assigned vertical extent, overfull boxes and glyph collision to *"the
compile, and only the compile"* — which, while no local compiler existed, silently meant
*"Phuong's Overleaf run"*. Now: **tier 1 generator** (horizontal geometry, origin placement),
**tier 2 local compile** (everything downstream of line breaking), **tier 3 Overleaf** (the
target render). Tier 2 licenses a push; it does **not** license a claim about what a marker
sees, and where the two disagree Overleaf wins and the disagreement is the finding.

### Stage 2 — the git write path

**The document exists ONLY on Overleaf.** There is no `main.tex` in this repo, so Stage 1.3
could not run before Stage 2.1 supplied the source. Resolved by cloning **read-only** first
(a clone migrates nothing) and holding write-path adoption until the build passed.

Clone: **`/Users/hapuna/Downloads/prj93-overleaf`** — a sibling, separate history, not a
submodule or subtree. **The Overleaf branch is `main`, not `master`.**

**2.2 verified, no divergence.** All 27 `.tex` the bridge lists are present; 12 methodology
sections and 10 literature-review sections match exactly; the three appendix skeletons are
B `app:search`, C `app:pseudocode`, D `app:robustness`; `figures/` holds `gap_map.pdf` and
`ladder.pdf`. The clone additionally holds 7 binaries the bridge does not list (it returns
text files only) — a bridge display filter, not a divergence. Note: the bridge reports a
`chapter` "Methods" for methodology.tex that is a `%`-commented line — it does not skip
comments.

**2.3 recorded in `PRJ93_RULES.md`:** all edits via git; the web UI for compiling and reading
only; verification by `git diff`/`git status`, not remote read-back; the MCP bridge retained
for reading and status; a reported `latexcheck` run before every push. `write_section`'s
2026-07-31 hazard stops mattering once writes are diffs — a silent nested-subsection deletion
becomes a visible `-` block.

### Stage 3 — the queue

- **3.1** methodology.tex header replaced. It instructed a future reader to apply an
  already-applied preamble diff in a form (`[ruled,vlined,linesnumbered]`) that **would break
  the build** by dropping `[algo2e]`, and pointed at `out/` paths that are the generator's
  local output directory and were never what the document reads.
- **3.2 ALREADY DONE — not a task.** `LOad-BEARING` was corrected in commit `7a1c47f`. No
  occurrence survives anywhere. Reported rather than re-fixed, per the verify-before-
  reporting-open rule.
- **3.3** `figure_proof.tex` retired (743 lines). Nothing `\input` it. It held the second
  pasted copy of nine floats that would drift, and it could not have caught the defect that
  mattered: loading `algorithm2e` alone, `\begin{algorithm}` resolved fine there while the
  document broke.
- **3.4** The ten Appendix C/D prose references converted to `\ref` in one batch, targeting
  the labels that already existed. **Verified in the rendered PDF: all ten print as the
  letters C and D**, not numbers.
- **3.5** F4–F7 PDFs added to `figures/` — the binary path the bridge could not take. Float
  environments remain for 8C-3; **not** placed in `results.tex`.

### PUSH IS BLOCKED — the one thing not delivered

Two commits sit local and **unpushed** in the clone: `d246333` (Stage 1 figure fixes) and
`24887e2` (Stage 3 queue). `git push` is refused by an environment branch-protection guard:
*"push to protected branch 'main'. Use a feature branch and open a PR."* **Overleaf's git
bridge is single-branch and has no PR mechanism**, so that guard cannot be satisfied from
here and was not worked around. Phuong must push, or the guard must be relaxed for this
remote. **Until then Overleaf still has the broken `fig_pipeline` and will not compile.**

### Verified end state

- Local build: **139 pages, 0 errors, 0 undefined citations, 0 floats lost**, 9 overfull
  boxes, undefined refs exactly `tab:mcs-config` + `fig:nulls`.
- `ai-gm.ai-master` commit `e410203e`; clone commits `d246333`, `24887e2` (unpushed).
- 8C-3 is **not** started. No prose was composed.

### Stage 3.6 — ROOT graph refresh: ATTEMPTED, REFUSED BY THE SHRINK GUARD

**Node count before: 13,618 (25,047 links). Node count after: 13,618 — UNCHANGED.**
Confirmed ROOT (`graphify-out/graph.json`), not `brain/graphify-out/`, which stayed at
5,495 nodes throughout.

`detect_incremental` found **127 changed files** (54 code, 64 document, 3 paper, 6 image).
AST extraction succeeded: 726 nodes, 1,661 edges. Semantic extraction was dispatched as four
parallel subagents; **only two of the four returned** (chunk 2: 254 nodes/404 edges; chunk 3:
189 nodes/253 edges). Chunks 1 and 4 never wrote their files.

The merge of AST + the two returned chunks into the existing graph produced **13,312 nodes**
— a net **−306** against the live 13,618, because the 37 re-extracted files yielded fewer
nodes than their previous extraction while the 36 files behind the two missing chunks
contributed nothing. **graphify's shrink guard (#479) refused to overwrite `graph.json`**,
which is exactly what it exists to do. **The guard was not forced.** Forcing it would have
let a half-complete run degrade a good graph — the same failure shape as the `eval/agent_eval.py`
incidents in the rules: a green-looking run that quietly damages the artefact.

**One real inconsistency was created and repaired.** `save_manifest` had already stamped the
37 successfully-extracted files as current, while their nodes were never written to
`graph.json` — so the next `--update` would have SKIPPED them and left the graph permanently
stale for those files. The manifest was restored from git (`git checkout -- graphify-out/manifest.json`),
so manifest and graph agree again. The 37 files' extractions ARE in the semantic cache, so a
re-run replays them without re-dispatching subagents; the other 36 were left unstamped by
design and will be re-queued.

**To finish this properly:** re-run the graphify skill so all four chunks land, or run a full
rebuild. Do NOT pass `force=True` to `to_json` to push the smaller graph through.

**A stale-artefact hazard was also found and cleared:** `graphify-out/` still held four
`.graphify_chunk_*.json` files dated **2026-08-04** from an earlier run whose Step 9 cleanup
never ran, including a `chunk_05` that this run's four agents would never have overwritten.
Merging them would have silently folded three-day-old extraction into today's graph. Deleted
before the merge. Check for stale chunk files before any future graphify merge.

---

## Session 2026-08-07 (second run) — 8C-F follow-up: push verified, rules hardened, graph refused again

### The push landed, and the PUSHED state was compiled

Phuong pushed `d246333` and `24887e2` by hand. Verified three ways, because "I ran `git push`"
and "the remote holds a document that builds" are different claims:

1. **Remote ref** — `git ls-remote` head is `24887e2`; `origin/main..HEAD` empty; clone clean.
2. **Content at `origin/main`**, read from the fetched ref rather than the working tree — the
   `out`→`outb` rename with no `[out,` survivors, all four regenerated float bodies carrying
   their new coordinates, `figure_proof.tex` absent, **ten** converted references, all four
   F4–F7 PDFs. **Nothing present locally is absent on the remote.**
3. **Independently through the MCP bridge**, a different path from git: it now lists **26
   files, not 27** — `figure_proof.tex` is gone from Overleaf's own project view, so the push
   reached the project and not merely the git bridge.

**Then a FRESH CLONE of the pushed state was compiled from scratch**: 139 pages, 0 errors, 0
undefined citations, 0 floats lost, 9 overfull boxes, undefined refs exactly `tab:mcs-config`
and `fig:nulls`. Baseline recorded at `24887e2`.

### The push block was never git

No hooks in the clone, `core.hooksPath` unset at every level, no git protection config. It is
`.claude/hooks/block-dangerous-commands.sh`, a **Claude Code `PreToolUse` Bash hook** wired in
this repo's `.claude/settings.json`. It reads the **command string only**, so a guard
configured for `ai-gm.ai-master` blocked a push to `prj93-overleaf` — a different repository.
Phuong's own terminal push of the identical command succeeded, which is what rules out a git
hook. Diagnosis and a **proposed, unapplied** fix are in `ledger/push_guard_proposal.md`; it
discriminates on the resolved **remote URL**, never the branch name, and was tested both ways
(Overleaf exempt, this repo's GitHub origin still guarded). Unapplied because `.claude/` is
out of bounds under the Scope boundary and shared with a collaborator.

### latexcheck's fixture tested the author's imagination; now it does not

Extended from 3 warning classes to **seven cases**, and it now drives the **real CLI as a
subprocess and checks the actual process exit code** — the previous self-test asserted the
internal `fatal` flag, one step removed from the guarantee callers depend on.

| case | exit | pdf |
|---|---|---|
| clean-control | 0 | yes |
| warnings-ref-cite-box | 1 | yes |
| missing-end-document | 1 | no |
| undefined-control-seq | 1 | no |
| missing-environment | 1 | no |
| missing-package-file | 1 | no |
| runaway-open-brace | 1 | no |

The clean control is not decoration: without it the table cannot distinguish a working guard
from one that fails on everything.

**The new cases earned their place immediately.** `undefined-control-seq` was caught **only**
by the no-PDF check — under `-file-line-error` a primitive TeX error prints as
`<file>:<line>: Undefined control sequence` with no `" Error:"` marker, so the parser never
classified it. Fixed with an explicit `TEX_FATAL_PHRASES` list rather than by treating every
`file:line:` line as fatal. Regression-checked on the live document: still 0 errors, 139
pages, no false positives.

### The ROOT graph refresh was refused AGAIN — and my earlier hypothesis was wrong

**Before 13,618 nodes / 25,047 links. After: 13,618 — UNCHANGED.** ROOT
(`graphify-out/graph.json`) confirmed; `brain/graphify-out/` untouched at 5,495 throughout.

All chunks landed this time (13 + 84 + 74 semantic nodes, plus 639 replayed from cache and 727
AST = 1,535 extracted). The merge still came to **13,329 against 13,618, net −289**, and the
shrink guard refused again. **It was not forced.**

**This disproves the previous entry's explanation.** That entry attributed the −306 shrink to
two of four semantic chunks failing to return. With every chunk landing the deficit is
essentially unchanged at −289, so the missing chunks were never the cause.

**The real cause is extraction depth, and it is mine.** Per-file deltas against the old graph:

| file | old → new | delta |
|---|---|---|
| `docs/Prj93_external_examiner_assessment.md` | 142 → 64 | **−78** |
| `ledger/literature_conformance.md` | 82 → 12 | **−70** |
| `ledger/phase_state.md` | 77 → 19 | **−58** |
| `knowledge/04_supervisor_evidence_pack.md` | 59 → 12 | **−47** |
| `ledger/citation_audit.md` | 43 → 7 | **−36** |
| `knowledge/05_paper_architecture.md` | 63 → 28 | **−35** |

34 files lose nodes, 36 gain, net −292 across the changed set. The losses land almost exactly
on the **largest documents** — which are the files I told the agents to read "in bounded
ranges", targeting "15–25 nodes per file", because two earlier agents had been killed by
timeouts and one by a mid-response API error. **The budget instruction that made the agents
survive is the same instruction that under-extracted the big files.** The guard is protecting
the graph from my own prompt, which is exactly its job.

**What actually closes this:** a full rebuild (`/graphify .`), or a re-extract of the ~6 large
documents at proper depth with a generous time budget and no node-count target. **Do not pass
`force=True`** — the smaller graph is a real loss of content, not a dedup artefact.

**Both earlier repairs re-verified after this run:**
- `save_manifest` again stamped every dispatched file as current while the graph write was
  refused. Restored from git again — `graphify-out/manifest.json` is clean against HEAD, so
  the manifest and the graph agree and the next `--update` re-queues rather than skips.
- No `.graphify_chunk_*.json` remain on disk and **zero are tracked in git**, so the
  2026-08-04 contamination hazard has not reappeared. The late-landing chunk from the previous
  run was converted into a **content-addressed semantic cache entry** before deletion, so its
  19 files replay by hash rather than sitting as a positional file no later run would overwrite.

### Recorded this session

- `PRJ93_RULES.md` — new **"Compile and push"** lifecycle section: a clean `latexcheck` is the
  precondition for a push; local-green-but-unpushed leaves Overleaf broken; both halves get
  reported; tier 2 may not speak for tier 3 while the TeX Live year is unknown; and a push is
  verified against the remote, with a fresh-clone compile as the strong form.
- `BLOCKED_third_party.md` §F — **T3-1** (Overleaf TeX Live year, Phuong to read) and **T3-2**
  (title page not locally verifiable, no Inkscape) as owned tier-3 items; plus the document's
  compile state.
- The **caption defect as a named 8C-3 deliverable** in §F and in
  `05_paper_architecture.md`'s Results block. **Nine** surviving body floats, not seventeen —
  five demoted to appendices, three absorbed into prose. Verified by enumerating all 17 labels
  in `results.tex`; the architecture doc independently already read "one figure and eight
  tables".

### Verified end state

- Overleaf remote at `24887e2`; pushed state compiles (139 pages) under **local TeX Live 2026**
  — a tier-2 claim only, until T3-1 closes.
- ROOT graph unchanged at 13,618 / 25,047. `brain/graphify-out` unchanged at 5,495.
- 8C-3 **not** started. No prose composed.

## Session 2026-08-07 (8) — Phase 8C-3: Results composed to the tree; push BLOCKED

**Completed.**

1. **Embedded-title sweep, estate-wide.** 33 figure sources scanned, rendered PDFs read back by
   pulling literal show-strings out of the content streams. Five generators carried titles in the
   image body. F4 `fig_drift.py` was the real defect: a *finding sentence* per panel, the
   false-open counts, painted into the raster with no caption, no LoF entry and no traceable
   comment. F5/F6/`fig:ladder` carried venue names; F7 also repeated the unit its own x-axis
   label already showed. Fixed at the generator in all five — venue into the panel label, finding
   and unit into the caption. `fig_drift.py` now prints the three counts so the caption quotes
   them from the run. All five regenerated; rendered text and PNGs re-inspected.

2. **`brain/scripts/figurecheck.py`**, a sibling of `latexcheck.py` because the defect lives in
   generator source before any compile. Verified in **both** directions before use (4 fixtures,
   clean ones carrying a commented-out `set_title(` and a `title=` inside a TeX comment) and then
   against the five real pre-fix sources via `git show HEAD:`, where it flagged all five. Its
   scope boundary — API constructs yes, bare TikZ nodes reading as titles no — is now recorded in
   `PRJ93_RULES.md` alongside the three-tier boundary it generalises.

3. **`figures/ladder.pdf` on Overleaf was the pre-`b1faf683` MASE build** while `results.tex`
   line 156 introduced it as RMSSE. Found by the sweep, not by the register. Rung *ordering*
   differed too. Replaced with the committed build; panels also reordered Beer Hall / Ellel /
   Two River Taps to match F4–F7, on Phuong's approval.

4. **Chapter 4 recomposed from the result files**, not shortened. 13 sections + 15 subsections →
   5 sections. **13,072 → 6,247 marker-equivalent**, 2.1:1. Section labels HELD where
   `methodology.tex`/`conclusion.tex` reference them, so ten external refs keep resolving. Nine
   body floats, every one with a 15/45 short title. F4/F5/F7 placed at first reference, F6 in
   4.5. Appendix E created for the four demoted tables; `tab:window` → D; `tab:mcs-config`
   authored in C from the artefact.

5. **Ledgers.** `figure_title_sweep.md`, `results_argument_skeleton.md` (R1–R13, all survive),
   `results_rewrite_critique.md` (rounds A–F).

**Verified end state.**

- `latexcheck` on the clone at `f903214`, TeX Live 2026: **PASS**. 115 pages, 0 errors,
  **0 undefined references** (was 2), 0 undefined citations, 0 floats lost, 8 overfull boxes.
- The **224.47 pt `main.lot` overfull vbox is gone**; List of Tables 30 entries against six pages.
- `figurecheck.py` clean over 33 sources, exit 0.
- Floors, marker-equivalent: Ch 2 **4,938**, Ch 3 **5,526**, Ch 4 **6,247**. Total
  **16,711 / 13,400**, +25 %.

**PUSH BLOCKED, and this is the one thing 8C-4 must not assume away.** `git push origin main`
is refused by a protected-branch guard. `origin/main` still holds **`24887e2`**. Verified
read-only after the refusal: the remote's `figures/ladder.pdf` still reads **MASE**, so the live
document's Figure 4.1 still contradicts its own body text, and `tab:mcs-config` and `fig:nulls`
still print `??` on Overleaf. **Local green plus unpushed equals a broken document.** Handed to
Phuong; not routed around.

**Corrections made to other stores.**

- **§F repaired in three places** and normalised to marker-equivalent throughout. S-2 struck as
  already closed; the dangling-reference register retired after a build showed **2** undefined
  references against its claimed 5, with three rows stale; graphify staleness row added.
- **`blocker_clearance_package.md` B5** asserts Ellel's MCS n "is not 260". The artefact says
  `common_fold.n_folds` = 273 / 260 / 205, equal to the headline counts at all three venues.
  Correction appended beside `tab:mcs-config`, not applied silently. Third instance of a package
  number wrong against its own source.

**Unstarted / handed on.**

- **8C-4 Discussion**, not conducted this session by instruction.
- **Reallocation deliberately NOT decided.** Phuong's ruling: three unmeasured chapters are
  budgeted at 4,800 and are composed rather than compressed, so deciding now allocates from a
  pool whose other half is unmeasured. Reallocate across all six after 8C-4 and 8C-5.
- **The pairing factor of 6.6** ($178.00 \to 26.94$ at Ellel) is the largest thing the
  compression drops. Ruled into **Discussion 5.3**, not lost — hand-off written into
  `results_argument_skeleton.md`.
- **Three `\ref`s owed** once Discussion 5.3/5.4 exist: `sec:res-agent`, `sec:res-pattern`, and
  §2.7b's W3 forward clause.
- **Graph not refreshed**, by instruction. Still 13,618 nodes, six files stale. Nothing in 8C-3
  was blocked by it.

### 8C-3 addendum — push landed manually; fresh-clone compile corrected the instrument

**Push verified against the remote, not assumed.** Phuong pushed manually after the
protected-branch guard refused the agent. `git ls-remote --heads origin` returns
`f903214…  refs/heads/main`; `origin/main..main` is empty. The remote's `figures/ladder.pdf`
now extracts as **RMSSE / RMSE (£)** with panels **(A) Beer Hall · (B) Ellel · (C) Two River
Taps**, so the Figure 4.1 contradiction is closed on the artefact a marker opens. All four
F4–F7 PDFs are byte-identical between remote and local.

**The stronger check found a defect in the check itself, not in the document.** Cloning the
pushed state fresh and compiling it FAILED at an emergency stop: `declaration.tex` `\input`s
`main-words.sum`, which `\quickwordcount` generates via `\write18`, which is disabled without
`--shell-escape`. Re-run **with** the flag on the same fresh clone: **PASS, 115 pages, 0 errors,
0 undefined references, 0 undefined citations, 0 floats lost, 8 overfull, 26 underfull** —
identical to the working-clone figures.

Confirmed **pre-existing, not introduced by 8C-3**: `24887e2` fails the same way from a fresh
checkout. So the finding is about the instrument's invocation. **Every `latexcheck` run in this
project before now omitted `--shell-escape` and passed only because a stale `main-words.sum` sat
in the working clone**, including 8C-3's own pre-push run. Right verdict, wrong reason, and it
would not have survived a clean checkout. Recorded in `PRJ93_RULES.md` under the compile-and-push
lifecycle and at the head of `BLOCKED_third_party.md` §F.

**§F further repaired on the pointer-not-copy test** (Phuong's ruling, generalising the retired
dangling-reference register): where a fact is cheaply derivable from an instrument, §F names the
instrument instead of holding the value. Applied to the composed/pushed rows (git), the build row
(latexcheck, now folded together with the undefined-reference row it duplicated), and the floors
(wordcount.py, values retained because a floor costs a run and is under active decision). Tier-3
rows keep their values because no instrument can derive them.

**Also surfaced:** `brain/scripts/graph_write_guard.py` is untracked. It brackets the graphify
run and rolls back the manifest stamps when the shrink guard refuses — the repair that was needed
by hand twice on 2026-08-07. Untracked means nobody else gets it and a fresh clone of this repo
has no guard at all. It is not 8C-3's file; flagged to its author rather than committed.

---

## 8C-4 — Chapter 5, Discussion, composed 2026-08-08

**Completed.** Chapter 5 did not exist. `main.tex` had no `\chapter{Discussion}` at all and the
material was sitting inside `conclusion.tex` in a pre-tree five-chapter shape. Composed to the
`05_paper_architecture.md` §2.1 tree from the evidence base, not compressed from prose.

**Artefacts written**
- `chapters/discussion.tex` (new, on the Overleaf clone), 453 lines
- `brain/drafts/discussion_8C4.tex` (the drafting copy)
- `brain/ledger/discussion_argument_skeleton.md` — D1–D19, nineteen extracted, nineteen discharged
- `brain/ledger/discussion_rewrite_critique.md` — two iterations, three independent role calls each

**Files changed on the clone** `main.tex` (Discussion chapter inserted between Results and
Conclusions), `chapters/conclusion.tex` (1,423 words excised, two reference debts discharged),
`chapters/results.tex` (W3 forward `\ref`), `chapters/methodology.tex` and
`appendix/search_screening_body.tex` (inbound `\ref`s repointed), `chapters/literature_review.tex`
(`\label{chap:litreview}` added).

**Verified end state**
- Local commit **`fe7bd9a`**. `git ls-remote --heads origin` = **`f903214`**. **NOT PUSHED.**
- Working clone compile: PASS, 125 pages, 0 errors, 0 undefined refs, 0 undefined citations,
  0 floats lost, 8 overfull, 29 underfull.
- **Fresh clone of `fe7bd9a` compiled with no stale `main-words.sum` present: PASS**, 125 pages,
  same error/reference/citation counts, 33 underfull. Tier 2 only; T3-1 and T3-2 unchanged.
- Chapter 5 floor **4,646 marker** (raw 4,653 / artefact 7) against 2,400. Per section:
  5.1 **962**/500 · 5.2 **1,157**/500 · 5.3 **1,031**/400 · 5.4 **906**/700 · 5.5 **591**/300.
- Zero em dashes. 19 `% Trace:` comments. 21 citation keys, every one already cited elsewhere, so
  the chapter adds no paper to the printed bibliography and triggers no add-a-paper gate.

**Unstarted** the push, and the three items below that need Phuong.

### The push did not land, and the reason is worth recording precisely

Phuong reported pushing manually. At that moment **the work was entirely uncommitted** —
`chapters/discussion.tex` was untracked and six files were modified but unstaged — so the push had
nothing of 8C-4 to carry and the remote stayed at `f903214`. The agent then committed `fe7bd9a` and
attempted `git push origin main`; the **PreToolUse hook refused it**: *"Blocked: push to protected
branch 'main'. Use a feature branch and open a PR."* Same refusal as 8C-3. **Not routed around**,
per the rule that a blocked push is handed over rather than worked past.

**The generalisable part:** "I pushed" and "the remote holds it" are two claims, and the second is
the one that matters. `git ls-remote` answered it in one command. This is the compile-and-push
lifecycle rule applied to the human half of the loop as well as the agent's.

### Four of six chapters are now measured, and reallocation cannot be deferred further

| Chapter | Marker | Budget |
|---|---|---|
| 2 Background | 4,938 | 4,000 |
| 3 Methods | 5,526 | 4,200 |
| 4 Results | 6,247 | 5,200 |
| **5 Discussion** | **4,646** | **2,400** |
| **Measured four** | **21,357** | **15,800** (+35 %) |

With Introduction (1,400), Conclusions (1,100) and the abstract (300) at budget the document lands
near **24,150 against HC1's 20,000**. S-3 deferred reallocation on the grounds that two floors were
not enough to decide on and that Results would determine whether there was anything to reallocate.
Both conditions are now met.

**One rubric finding reframes the question.** `00_marking_criteria.md`:411–414 records that the
guidance *"states explicitly that 'there is no word count for each section', and section balance
should be agreed with the supervisor."* The §2.1 per-section budgets are therefore this project's
own approved allocation (A10), **not a rubric requirement**. HC1's total is the mechanical
constraint. So the live question is not whether 5.2 exceeds 500; it is which criteria or which
material the document sheds to reach 20,000.

**Why Chapter 5's floor is what it is.** Of its 4,646 words, **1,531 were added by the critique
loop**, every one of them closing a named blocking finding. `autoresearchclaw/SKILL.md` §4's T2, T3
and T6 require a p-value, an interval, a denominator and a survivorship disclosure on each claim,
and the chapter restates roughly thirty of Chapter 4's numbers. Compression will not recover them;
the apparatus belongs beside the number, whose first home is Chapter 4.

### Corrections this session makes to stores upstream of it

Appended rather than applied in place, per the corrections rule. **Four of these are errors the
chapter INHERITED rather than introduced**, which is the reason to record them here.

| Store | Correction |
|---|---|
| `results_argument_skeleton.md` hand-off | The Ellel pairing factor is **6.2** (£381.68 → £61.51, gap £1.91, 0.50 se) on the committed headline (unscaled RMSE), not the **6.6** (£178.00 → £26.94, £1.55) the hand-off names, which are `log/70` §10's **secondary MAE** figures. `numbers_audit.md` has no row for either triple |
| `conclusion.tex` | *"the aggregated adaptive arm is the worst of the five at every venue"* is **false at the Beer Hall**: `tab:winkler` gives P 1940 (worst), D 1807, S 1928, A 1814, G **1837**, so G is third. Owner 8C-5 |
| `log/78` Part 3 · `numbers_audit.md` ADDENDUM | Both attribute the interval-study instability to the **ladder's** 205 origins. The interval-calibration study runs **250 / 237 / 182** (`interval_calibration_mcs.json` `n_folds`) |
| `log/78` (internal) | Part 2's table records Beer Hall arm A's Winkler mean moving **1814.3 → 1839.6** across environments, while Part 3 says the point estimates are *"resolution-stable to three significant figures"* and Part 4 that they *"reproduce exactly"*. 1810 and 1840 differ at three significant figures, so the summaries overstate the table |
| `blocker_clearance_package.md` §5.3 | The **approved** note's *"Every Winkler mean, coverage figure and Clopper–Pearson limb reproduces exactly"* carries the same overstatement. The chapter states the measured bound instead: coverage shifts by at most 0.004, the largest Winkler movement is 25 points on 1814, stable to **two** significant figures |
| `results.tex` `tab:winkler` caption | States **B = 1000**; `interval_calibration_mcs.json` says `n_boot` = **10,000**. `tab:mcs`'s B = 1000 **is** correct (`n_boot_primary` = 1000) — two different bootstraps, one wrong caption. 5.3's stability argument depends on 10,000 |
| `results.tex` | Recall is **0.807** in `sec:res-vuspr` and **0.804** in `sec:res-costsweep`; precision **0.871** against audit V4's **0.872**. And 644 − 124 = 520 true positives against 8 false alarms is a precision of **0.985**, so the cost-sweep counts and the corpus precision are on **different bases** and cannot be reconciled from committed artefacts |
| `results.tex`:526 | *"agree to a thousandth"* — the implied-versus-measured coverage differences are 0.00114 / 0.00121 / 0.00157, so all three exceed 0.001 |

### Two items closed that other files carried as open

**`06_research_questions.md` §9 is answered, and its conditional does not fire.** §9 hands 8D the
question of *why* the estate is three venues rather than the specification's four, with a
conditional that Methods 3.1 owes an exclusion criterion if it was an exclusion. `config.py`:110–137
answers it in the required terms: the fourth Square location is `events`, an off-site
event-booking location with no site and no opening calendar, and *"this is a BOUNDARY on what the
study is about, not a threshold applied to data — so there is no cut-off here, and none was ever
set."* **Boundary, not exclusion. Methods 3.1 owes nothing.** The same comment forbids restating
the location's 203 line-items as the reason, and 5.5 does not.

**The specification's "4 venues" is a claim about the platform.** `docs/PRJ93.md` reads *"Currently
live across 4 Lune Brew Co venues"* inside a product description and nowhere specifies a
four-venue study.

### A near-miss worth recording, because it is 8C-3's lesson recurring

A reviewer advised that a list of six divergences containing one non-failure weakens the count, and
recommended demoting the venue-count item out of 5.5's list. **I accepted it, which dropped the
count from six to five and broke approved unlock U2** — whose stated defect mode is
*incompleteness*, and whose whole content is that 5.5 carries **six**. Caught on re-reading §7's
U-rows and restored. An approval I had already read losing to an argument constructed in-session,
which is exactly what 8C-3 recorded as its second durable conclusion.

### Reference debts

§F lists three owed to this session. There were **five**, and a sixth surfaced in the build.

| Debt | Resolution |
|---|---|
| `sec:res-agent` plain text in `conclusion.tex` | `\ref{sec:disc-limitations}` restored |
| `sec:res-pattern` plain text in `conclusion.tex` | `\ref{sec:disc-validity}` restored |
| Results 4.1's W3 forward clause | `\ref{sec:disc-validity}` added |
| **`methodology.tex`:204 → `sec:conclusion-limitations`** (not in §F) | Repointed at `sec:disc-limitations` |
| **`appendix/search_screening_body.tex`:39 → `sec:conclusion-limitations`** (not in §F) | Repointed |
| **`chap:litreview` was never defined** (found by the compile) | `\label{chap:litreview}` added; Chapter 2 was the only chapter file without one |

The last three would have printed `??`. The build is the instrument that owns this, not a register.

### Open, with owners

| # | Item | Owner |
|---|---|---|
| **H13** | **RQ5's premise was never instantiated.** The sweep runs miss-to-false-alarm ratios of 1:1 to 10:1, every one weighting a miss at least as heavily as a false alarm, while RQ5 posits the opposite asymmetry. The chapter declares it in 5.5 and folds it into the operator-feedback divergence rather than leaving a stated question half-unanswered, on the precedent `06` §4 set for limb 7. **Rewording an RQ is a methodology gate** | **Phuong** |
| **H11** | The Beer Hall coverage exclusion is conditional on an unquantified design effect (needs ICC < 0.39; at full within-origin dependence the interval includes nominal). Two River Taps survives either way. Mitigated by resting the result on the served model's identical 0.870 and the rank decomposition. **Computing the design effect is a rerun** | Phuong / 8D |
| **H12** | **T8 fails.** No NotebookLM check was run this session. Every cited-paper claim is inherited from Chapter 2 or `defensible_divergences_writeup_pack.md`, where it was verified at source, and was re-checked against those records — a documentary check, not the one the rule names | Phuong / 8D |
| **H8** | The pairing decomposition exists in **no float**. `appendix/robustness.tex` lacks the pairing-variance material `results.tex`:130 promises is there | 8C-3 / Phuong |
| **H3** | `conclusion.tex`: the adaptive-arm error above, extensions counted as eight/seven/six/nine across one section, and an unsourced *"three of four"* quantifier | 8C-5 |
| — | **The deliberate omission.** §4.5 displaces the `sec:res-winkler` implementation-correction narrative (the faithful-BOA AgACI arm scoring 16, 3 and 18 points **worse**). Not brought into 5.2, per the ruling. Brought to Phuong rather than smuggled in | Phuong |

**Graph not refreshed**, by instruction. Still 13,618 nodes, six files stale. The hook demanded a
refresh on every read and grep, including inside all six subagents; declined every time. Nothing
was unfindable and nothing in 8C-4 was blocked by the staleness.

---

## 2026-08-08 — 8C-4 closing addendum: the push is verified on the remote

The 8C-4 entry above closed with the push held at the protected-branch guard and handed to Phuong.
This addendum records the second half of the compile-and-push lifecycle, which that entry could not.

### The push landed, and the verification is not the same act as the push

| Instrument | Result |
|---|---|
| `git ls-remote --heads origin` | **`fe7bd9a1bbbeb772bd02a51bf95dc60082ea4d91  refs/heads/main`** |
| `git log --oneline origin/main..HEAD` after `git fetch` | **empty** — nothing local is unpushed |
| `git ls-files chapters/` in a clone taken **from `git.overleaf.com`** | `discussion.tex` present; `main.tex`:249–250 carries `\chapter{Discussion}` + `\input{chapters/discussion}` |

**This is the second push attempt of 8C-4, and the first one is the more instructive.** The first
was reported as done and had moved nothing: `git ls-remote` still read `f903214` while
`chapters/discussion.tex` was **untracked** and six files were modified but unstaged. The push was
real; it had nothing to carry. `PRJ93_RULES.md` § "Compile and push" already says a push is
verified against the remote and never against the exit code of `git push` — 8C-4 shows the rule
binds the **human** half of the loop identically, and that the failure is silent in both halves.
§F's "Chapters composed **and pushed**" row now carries this as its worked counter-example.

### The fresh-clone compile, re-run against the pushed state

The 8C-4 entry's fresh-clone PASS was taken on a clone of the **locally committed** `fe7bd9a`,
which at that moment existed nowhere else. That is a weaker check than it reads as: it proves the
commit is self-contained, not that the remote received it. Re-run on a clone pulled from
`git.overleaf.com`:

- `main-words.sum` confirmed **ABSENT** in the clone, so `--shell-escape` generated it. This is the
  precise defect that made every earlier PASS in this project right for the wrong reason.
- **PASS · 125 pages · 0 errors · 0 undefined references · 0 undefined citations · 0 floats lost ·
  8 overfull (largest 182.80 pt) · 33 underfull.**
- Chapter 5's floor re-measured from the pushed file: **4,646 marker (raw 4,653)** — 5.1 962 ·
  5.2 1,157 · 5.3 1,031 · 5.4 906 · 5.5 591. Identical to the working-clone measurement, which is
  the point of taking it twice.
- Hygiene on the pushed file: **0 em dashes**, 0 double-hyphen prose splices, five `\section`s
  matching the approved tree, five `sec:disc-*` labels.

**Still tier 2.** TeX Live 2026 locally is not Overleaf's until T3-1 closes, and the title page
routed through a scratch `svg.sty` stub, so T3-2 remains uncovered by any local run. No claim is
made about the Overleaf render.

### What this addendum changes in §F

Four rows were false the moment the push landed and are now updated in place, with the instrument
named in each: chapters composed (3 → **4 of 6**), chapters pushed (`f903214` → **`fe7bd9a`**),
chapter files live with prose (4 → **5**), and the build row (115 pages on `f903214` → **125 on
`fe7bd9a`**). The floors row gains Chapter 5 and the totals row becomes **21,357 / 15,800**.

**S-3 is now decidable and is left decided-by-Phuong, not decided by me.** Its deferral condition
was *"measure Results first"*; Results and Discussion are both measured, and the answer is that
Results was already a floor at 6,247, so there is less to reallocate than the deferral hoped. The
recommendation recorded there — relocate each duplicated statistical disclosure once into Chapter 4
and cite it from Chapter 5 — is not executed, because it edits an approved composition. The one
finding that reframes the whole question is in `00_marking_criteria.md`:411–414: **the guidance
states there is no per-section word count**, so §2.1's budgets are this project's own allocation
and only HC1's 20,000 is mechanical.

### The generalisable part

**A claim about a remote is verified on the remote, and a claim about a local commit is not a claim
about a remote.** 8C-3 learned that a working clone can pass on a stale artefact; 8C-4 adds that a
*fresh clone of a local commit* can pass while the remote holds nothing. Both are the same error at
different radii: checking the thing nearest to hand and reading the result as covering the thing
that actually matters. The fix in both cases is one command, and in both cases the command was
available the whole time.

---

## 2026-08-08 — Phase: critique-loop audit, and SKILL.md §8's trial record discharged

**Audit only. No chapter text was changed, nothing was composed, nothing was pushed.**

### What was found

The 8C-3 prompt said *"the SKILL.md roles"* without the path. Chapter 4's six critique rounds
(A–F) contain **none of `brain/skills/autoresearchclaw/SKILL.md` §3's three roles**. Rounds A, B, C
and F are rubric coverage, number-traceability, structural boundary and §4.5 approval compliance —
all real work, none of them Role A Methodologist, Role B Statistician or Role C Claim auditor. The
two phase-specific roles named *inline* in that prompt (D and E) were run correctly.

**The reference decayed in three steps and the artefact never revealed it:**

| File | Names the roles as |
|---|---|
| `litreview_critique.md`, `background_rewrite_critique.md` | the path, `SKILL.md` §3, headings `Role A, Methodologist` |
| `methodology_rewrite_critique.md` | the name, no path |
| `results_rewrite_critique.md` | *"the three standing roles"* — no name, no path, content replaced |
| `discussion_rewrite_critique.md` (first pass) | inherited the phrase verbatim |

By Chapter 4 the phrase referred to nothing but itself. **8C-4 caught this itself**, mid-phase, and
re-ran the roles properly — its own correction states the mechanism from the inside: *"It read the
round headings out of `results_rewrite_critique.md` … and treated them as the house roles."*

### SKILL.md §8's trial record — discharged, having stood Unstarted through three uses

§8 requires the first use of the roles to be treated as a trial with what they missed recorded here.
The item at `phase_state.md`:173–175 has carried it as **Unstarted** since 2026-07-30. It is now
discharged. Six conclusions, full evidence in `ledger/role_audit_ch4_ch5.md`:

1. **The roles find what the invented rounds structurally cannot.** Chapter 4's rounds were
   thorough and missed a number contradicting its own trace file, a per-venue oracle-tuned table
   column, a sweep quoted at three different settings, a 41-way uncorrected multiplicity and four
   floats carrying no uncertainty. Nothing else in the loop looks along those axes.
2. **The cause was the reference, not reluctance.** The inline-specified roles ran; the
   name-referenced ones did not, in one session. That control case is what isolates it, and it is
   why the remedy is a path written into `PRJ93_RULES.md` and `05_paper_architecture.md` §8.1a
   rather than an exhortation. A requirement living only in prompts drifts — the same lesson §4.5
   taught 8C-3.
3. **Independence is worth more than the roles' content**, and 8C-4 measured it: seven findings and
   zero blocking in one shared context, against **42 blocking** across three independent calls, same
   chapter, same day.
4. **The roles are NOT idempotent — this was not predicted.** A second independent Role A returned
   seven blocking findings on Chapter 5 *after* a correct three-role loop with two iterations had
   already run on it. A completed critique loop lowers the next pass's yield without emptying it, so
   "the loop has run" is not a certificate.
5. **Genuine disagreement is diagnostic.** Two roles proposed opposite repairs for one discrepancy;
   adjudicating located an ambiguity in the artefact schema (`n_boot` meaning two different things
   across four files, with the disambiguating note in only one of them) that neither role's remit
   covers and neither would have found alone. A synthesiser that compromised would have destroyed
   the finding. §2's "preserve genuine disagreements" earned its place.
6. **What the roles missed.** Six role calls and a fourteen-test gate, pointed at two chapters, and
   `abstract.tex` — unwritten template boilerplate, live on `origin/main` — was found only because
   one call looked outside its remit. **Scope a check narrowly and it will be clean narrowly.**

### Artefacts written

- `ledger/role_audit_ch4_ch5.md` — all six critiques, the two adjudicated cross-cutting items, and
  the §8 trial record in full.
- `PRJ93_RULES.md` — new section *"The critique loop — name the file, not the roles"*.
- `05_paper_architecture.md` §8.1a — the loop each composed chapter passes through.
- `results_rewrite_critique.md` — header corrected (it also claimed five rounds where six ran).
- `BLOCKED_third_party.md` §F — two rows added: the unwritten abstract, and the open findings.

### Unrepaired, and deliberately so

Every finding is REPORTED, NOT FIXED. Repairs touch composed chapters and reach Overleaf, which is
a human gate. Two carry ordering that is not discretionary: §5's contradiction signal (`results.tex`
and `discussion.tex` state incompatible things about the same regeneration) resolves **before any
other revision**, then T1's trace mismatch at `results.tex:825`.

### The generalisable part

**A name degrades where a path does not.** A path is either right or broken; a name is
re-derivable from context, which means it can be re-derived *wrongly* and still resolve to
something plausible. The substituted rounds were good work, which is exactly why nothing looked
wrong — **the absence of a check is invisible in an artefact that records only what was done.**
That is the same shape as the stale `main-words.sum` and the stale `ladder.pdf`: in all three the
instrument reported honestly on what it was pointed at, and nobody had checked what it was pointed
at.

---

## 2026-08-08 (later) — Phase: reconciliation, the abstract, and the repair batch

### Completed

**Reconciliation of the two-session period.** Governing files verified not doubled; two real
defects found and fixed, both bookkeeping. **The single-writer rule is now in `PRJ93_RULES.md`**
beside store-ownership, framed as the same failure at a different radius: that rule stops one fact
being written in three files, this one stops one file being written by two sessions, and git
catches neither because both sessions share a working tree.

**S-3/S-4 authority verified in the transcript, not inferred from the ledger.** Phuong's
recollection was that no ruling had been given; the closed session's transcript carries it
verbatim. **The transcript outranks recollection, and it is the only place this evidence lives** —
a ledger row saying *"closed on Phuong's ruling"* is a claim about a conversation.

**T8 = H12**, one gate under two numbering schemes. Chapter 5 discharged; **Chapter 4 never run**.

**The Barber misattribution re-verified at the PDF** and repaired, with `vovk_algorithmic_2005`
added to Zotero and the bibliography. Chapter 2's two uses are correct and untouched.

**`abstract.tex` composed** — it was template boilerplate with a `bit.ly` link, live in the PDF on
`origin/main`. 298 marker words.

**The repair batch: seven commits, per item, pre-flighted at 127 pages.** X1 first per §5, then
§4.1–§4.5 and Chapter 5.

### Three errors I made this session, all caught, all worth keeping

1. **I wrote a false negative into the state store.** Searched `/usr/local/texlive`, `/Library/TeX`,
   `/opt` and `$PATH`, found no TeX, and recorded *"absence, not a permissions artefact"* — a
   definitive negative from a partial search. TeX Live 2026 was in `~/texlive`. This is SKILL.md
   §6's **"absence by grep as proof"**, and the phrase "confirmed inside and outside the sandbox"
   made a narrow search sound broad. **A negative gets verified more than one way before it is
   written down**, and the more confident the phrasing the more that matters.
2. **The abstract carried four defects on its first draft**, one of them R5 — the venue-order
   mismatch — reproduced independently in my own prose while I was preparing to fix it in Chapter 4.
   **That is what makes it a class rather than a slip.** Another softened a pooling result that is
   *stronger* than a null, inherited from the Chapter 5 sentence the audit had already flagged as
   understating it. The abstract was about to launder a known defect into the section a marker
   reads first.
3. **Four hand counts wrong against `wordcount.py`** — 289, 304, 295, 302 — every one caught by the
   instrument and none by me. Third session running.

### Open, with owners

**Phuong pushes.** Seven commits; `git push` refused by the PreToolUse hook for the third phase
running. Overleaf still holds the boilerplate abstract and the Chapter 4 / Chapter 5 contradiction.

**Phuong recomputes** R4, R30, R9, R22, R24, R16. **R30 gates D3**, where two roles reached
opposite verdicts on `tab:coverage`.

**T8 for Chapter 4** — twelve cited works never checked.

**S-4 de-duplication** now decides on **21,883**, not 21,357: the repairs added 526 words, because
replacing an assertion with a qualified statement is longer. A non-rejection reported honestly
costs more words than one reported as an affirmed null, and that cost is the right one to pay.

### The generalisable part

**Every instrument in this project checks the artefact's form, and none checks whether its content
exists.** `latexcheck` proves the document builds; `wordcount.py` proves it is the right length;
`figurecheck.py` proves no title is painted into an image. An unwritten abstract passed all three
for the life of the project, because none of them asks whether a section says anything. The
critique roles are the only instrument that reads for meaning, which is why losing them for two
chapters cost as much as it did.

---

## 2026-08-08 · push landed, and where the abstract's repair actually lives

`origin/main` = local `main` = **`df47de3`**, zero divergence both directions, eight commits on
`fe7bd9a`. Content verified on the remote, not just the ref: the composed abstract, the X1
withdrawal, the Mondrian reattribution to `vovk_algorithmic_2005`, and the de-duplicated bib key.

**Findability note, because this project has already been bitten by a commit describing a subset of
what it carried: `abstract.tex`'s four corrections — the R5 venue-order swap, "field ten", the
scoped weather contrast, and the removed component count — are in `df47de3`, whose message is about
Chapter 5 and does not mention the abstract.** The resolving rebase folded them in. `git log -S"five,
six and four" -- abstract.tex` finds it; `git log --oneline` does not.

**A verification false alarm worth keeping.** `grep 0.871` on the remote `results.tex` returns four
hits and reads as the withdrawn precision figure surviving. It is the Beer Hall's conformal
coverage. The repair had landed. Rule written: *a value match is not an identity match*
(`PRJ93_RULES.md`).

## 2026-08-08 — the `active` sweep, and R24 deferred to the head of the next session

**Trigger.** The 4.4.3 finding from the C3 batch: the robustness check defending the
under-coverage result was itself computed on the calendar-open group and reported as trading
days (0.117 against the true 0.108). Phuong ruled a rules line: `active` means calendar-open,
never traded.

**The ruling could not be written as stated, and that is the finding.** `active` denotes THREE
populations in this repo, two of them under the identical field name `active_only` in the same
directory:

| Where | denotes | expression |
|---|---|---|
| `store/active_span.py` | a date span | first to last nonzero-revenue day; keeps non-trading days inside it |
| `eval/exchangeability_diagnostic.py` `active_only` | calendar-open | `state == 0` |
| `eval/native_interval_probe.py` `active_only` | **traded** | `df["y"] > 0` |

An absolute rule *"active means calendar-open"* would have been false at the third and would have
manufactured a new error at exactly the site the sweep was meant to protect. `interval_calibration_L1.json`
avoids the word and keys on `per_state` `0`/`1`, which is why nothing has gone wrong there.

**Written:** `PRJ93_RULES.md` gains *"`active` is three different populations in this repo — resolve
it at the generator, every time"* (comment the population at every use; keep the word out of prose)
and *"Compression is not allowed to touch a qualification"* (four instances, the last in the abstract).

**Document repairs, Overleaf `12f8cc7`, pre-flighted PASS / 130 pp / 0 errors / 0 undefined /
0 lost floats / 7 pre-existing overfull:**
- `results.tex` 4.4.2 `its active group` → `its calendar-open group`
- `results.tex` 4.5 `its active-only coverage` → `its trading-day coverage`, plus a POPULATION
  comment block naming the defining expression per the new rule
- `appendix/tables.tex` `tab:native-interval` column `Active only` → `Trading days`, caption
  restated against the calendar-open group
- **NEW, and it was already in the artefact:** at nominal ninety, Chronos-2's native band covers
  **0.904 / 0.651 / 0.935** on trading days against the served band's 0.892 / 0.692 / 0.964. An
  independent corroboration of the C3 reordering — no shared point model, calibration layer or
  partition, same venue fails, close to the same margin.
- Checked and left alone: the conclusion's `0.9178` is the ALL-PAIRS figure against the served
  band's all-pairs `0.871`, so that comparison is like for like.

**Generators stamped:** the cross-file warning now sits at both `active_only` definitions.

**Word floors re-measured:** Ch 4 **7,587** (+881 over the post-repair row), Ch 5 **4,873**,
abstract **299**. Four chapters **22,924**, projection **~25,900 against HC1's 20,000**.

**Rulings recorded in `BLOCKED_third_party.md`:**
- **`sec:res-traded` is NOT relocated.** The standing relocation test was run and returned NO:
  it is the evidence for the corrected headline and Chapter 4 is where evidence lives; Chapter 5's
  shorter version is the correct relationship, not duplication; relocating recreates the structure
  8A.1 flagged when `sec:res-basis` was reported as a result. Not reopened by S-4.
- **S-4 gains a constraint:** qualifiers are protected, not trimmed.

**Open, and it is the first item next session: R24.** Approved, not done — stopped rather than
rushed at the tail of a long batch. The fold vectors and the 0.811 it is compared against are
committed; 6.2's pairing defence was untouched by the C3 reordering, so the hold that batched it
with the 4.4 items has expired.

**Unpushed:** Overleaf `12f8cc7` and the brain commit below it. Push is human-only.

**Next session's order, ruled 2026-08-08.** **R24 first**, while it is not the tail of a batch,
then **T8 for Chapter 4** — twelve cited works never checked against NotebookLM, with Chapter 5's
Barber precedent as the prior for what that turns up. Both commits of this session pushed by
Phuong. The stale `build/` inside the Overleaf clone was removed and **deliberately not
gitignored**: builds belong outside the clone entirely, so a reappearing `build/` should stay
visible in `git status` rather than be silenced.

### Verified end state, 2026-08-08 close

| | |
|---|---|
| brain `HEAD` | `1843274b` — working tree clean except two untracked `.pyc` and seven stale graphify chunk parts (below) |
| Overleaf clone `HEAD` | `12f8cc7` |
| Overleaf `origin/main` | **`4e2d209`** — verified with `git ls-remote --heads origin`, not inferred |
| **Unpushed to Overleaf** | **THREE commits: `3a1c82f`, `f6c55d4`, `12f8cc7`** |
| Tier-2 pre-flight | PASS · 130 pp · 0 errors · 0 undefined refs · 0 undefined citations · 0 lost floats · 7 overfull, all pre-existing |
| Graph | 13,862 nodes / 25,344 edges / 925 communities; `graph_write_guard settle` rc=0, write confirmed |

**THE ONE THING THAT MATTERS AT THIS CLOSE.** `HEAD..origin/main` is empty, so nothing on the
remote is missing locally and there is no divergence — but the three commits above have **not
landed**. Verified by reading the remote's own files, not by inferring from the commit list:

- `git show origin/main:abstract.tex` still carries **"The detector returns 8 false alarms against
  124 misses, inverting the failure mode"** — the claim withdrawn under R4, and the sentence a
  marker reads first. It also still carries the origins triple `273, 260 and 205`.
- `git show origin/main:chapters/results.tex:456` still reads **"one venue fails in the unsafe
  direction"** with the Beer Hall named — the reading C3 reordered.

So the published document currently disagrees with this repo on two headline claims. Local green
plus unpushed equals a broken document, per the compile-and-push lifecycle rule; this is that rule's
second worked example.

**Left untracked deliberately, both flagged rather than acted on:**

- `graphify-out/.graphify_chunk_{01,05,06,07,08,09,12}.json.part01` — residue of the multi-part
  extraction the shrink guard refused twice. `84e25c42` cleared them once and they are back. A
  future run could read them as valid parts. **Not mine to delete a second time without a ruling
  on whether that extraction is being retried.**
- `figures/__pycache__/*.pyc` — regenerable bytecode; `__pycache__` is not in `.gitignore`, and
  `.gitignore` is shared with a collaborator, so the ignore rule is not added unilaterally.

**Owed before any label is read:** `graphify label`. The community set moved this run — 895 saved
labels against 925 communities, 180 renamed by hub — so the saved names are stale.

---

## 2026-08-09 — R24 (marginal ACFs) and T8 (Chapter 4 source claims)

**Scope as given:** two ledger-queue items, no composition beyond what they require. Graphify was
held at 13,618 with six files stale by instruction; navigation was by path and grep. The PreToolUse
hook demanded a refresh on essentially every read and grep and was declined every time, as in 8C-4.
**Nothing was unfindable.** One read-only `graphify query` was attempted to satisfy the hook without
refreshing; the shell has no `timeout` binary and the call was abandoned rather than retried, which
cost nothing because path-and-grep navigation was sufficient throughout.

### Completed

**R24 — the two marginal ACFs. The cancellation assumption FAILS.**

- New instrument `brain/eval/marginal_acf.py`, committed, `--self-test` passing on five fixtures
  including a deliberate-violation check on its own reproduction guard. It imports
  `eval.mcs._autocorr`, `common_loss_matrix` and `top_rungs_by_mean` rather than reimplementing
  them, and reproduces `mcs_L1_results.json` `paired_variance_top4[0]` **cell by cell** at all three
  venues before reporting anything new. Run under numpy **2.5.1**, the committed regime.
- Artefact `brain/eval/marginal_acf_L1.json`. Ledger `brain/ledger/r24_marginal_acf.md`.
- Ellel, `chronos_bolt` against `robust_dow`, RMSE unscaled, n = 260: lag-1 differential 0.811,
  marginals **0.873** and **0.868**; lag-10 differential **0.241**, marginals **−0.129** and
  **−0.195**. Bartlett VIF 9.74 / 7.11 / 6.19. Corrected ratio 6.37 / **5.82** / 5.14 / 4.10 / 2.53
  at lag budgets 2 / 7 / 10 / 14 / 21 against 6.205 uncorrected.
- **Verdict: fails, and adversely at this venue.** The sign reverses at the other two, where the
  leading contrast is between near-identical foundation models. So the assumption is false in
  general rather than unverified.
- `chapters/discussion.tex` reworded, not renumbered: 6.2 is relabelled an uncorrected upper bound,
  the corrected figure at the pre-registered block length is given, and the venue-dependence is the
  stated reason it cannot be assumed away.

**T8 for Chapter 4 — discharged.** `brain/ledger/source_claim_verification_ch4.md`. 12 keys, 14
citation commands: **12 SUPPORTED, 1 OVERSTATED, 1 UNREACHABLE.**

- One repair: `lu_proactive_2024` at `results.tex`:941, the **unrepaired half of role-audit V4**.
- `breiman_classification_1984` UNREACHABLE, recorded as unchecked rather than passed, with the
  search scope named in the same sentence as the claim.
- `angelopoulos_conformal_2023` and `kaas_probabilistic_2026` verified at the PDF; both
  load-bearing claims hold.

### Artefacts written

`brain/eval/marginal_acf.py`, `brain/eval/marginal_acf_L1.json`,
`brain/ledger/r24_marginal_acf.md`, `brain/ledger/source_claim_verification_ch4.md`;
`BLOCKED_third_party.md` §F and `recompute_set.md` updated.

### Verified end state

- **Overleaf clone `main` = `422c85d`, ONE commit ahead of `origin/main` = `12f8cc7`.** The push is
  Phuong's; the PreToolUse guard refuses it and routing around it was not attempted.
- **`origin/main` was `12f8cc7`, not the `fe7bd9a` §F recorded.** §F's "seven commits await a push"
  row was **seven commits stale** and has been struck with the correction appended. A row naming a
  remote SHA is a measurement with a timestamp; re-run `git ls-remote` before quoting one.
- latexcheck **PASS** on the working clone and again on a **fresh clone of the local commit** with
  `main-words.sum` confirmed absent: both **130 pages, 0 errors, 0 undefined references, 0 undefined
  citations, 0 floats lost**, 7 overfull, 32 underfull. TeX Live 2026 locally, which is tier 2 and
  says nothing about the target render while T3-1 is open. **The fresh clone was of the LOCAL
  commit, not the remote.**
- figurecheck 1, completenesscheck 7, venueordercheck 8 — **identical to the same three run against
  HEAD before the edits**, so this session introduced none of them. All three `--self-test` passed
  first.
- Word floors: Ch 4 **7,588** (+1), Ch 5 **4,993** (+120), four-chapter total **23,045**,
  projection **~26,000**.

### Not started, deliberately

S-4 and 8C-5, both out of scope by instruction. The recompute set still holds R4, R9, R16, R22 and
R30, and D3 stays live.

---

## 2026-08-09 (continued) — R24 addendum and S-4 pass one

### R24 reached further than 5.3

Raised by Phuong. Two corrections to the earlier report in this session: the passage already
repaired **is** 5.3, and **6.6 appears nowhere in reader-facing prose** (single occurrence is the
trace comment at `discussion.tex`:286).

The real exposure is **three** gap claims scaled by a paired standard error, and only two are their
venue's leading contrast. Two River Taps' is `rung2_ets` against `rung4_chronos2`, VIF **2.06**
against Ellel's 9.74. Corrected multiples at the pre-registered block length: Beer Hall 0.02 → 0.01,
Ellel 0.50 → 0.17, **Two River Taps 3.27 → 1.80** (2.28 at ten lags), straddling 1.96. **The MCS
elimination is unaffected**, being block-bootstrapped at the same length, so the repair went to the
gloss and not the verdict.

### S-4 pass one — applied, ruled item by item

Eight approved, #5 declined, #4 closed. **Net −105 marker words** (Ch 4 +61, Ch 5 −166) against an
orientation estimate of 370–470. Full record: `ledger/s4_deduplication_items.md`.

**The headline is that S-4 is not the instrument for the overrun.** Duplication between the two
chapters is worth ~400–550 gross; the excess is that four chapters measure 23,046 against a 20,000
six-chapter total. Ruled: write Introduction and Conclusions, measure, decide on six real floors; if
still materially over, accept the overrun with the justification already assembled.

### Instrument defect found and fixed

`venueordercheck` printed **PASS having scanned zero files** — zsh does not word-split an unquoted
variable holding several paths, so one invalid path reached it. Both path-list checkers now fail
closed on an empty scan, and **both guards were exercised against the violation before being
trusted**. General form: *a check that examined nothing must not be able to report a clean result.*

### Artefacts

`ledger/s4_deduplication_items.md` (new), `ledger/r24_marginal_acf.md` (addendum),
`eval/marginal_acf.py` (`--pair`), `scripts/venueordercheck.py` + `scripts/figurecheck.py`
(zero-scan guards), §F word row, this entry.

### Verified end state

- Overleaf clone `main` = **`29016e7`**, **two commits ahead** of `origin/main` = `422c85d`.
  **Phuong pushes.** Re-derive both with `git ls-remote --heads origin` and
  `git rev-list --count origin/main..HEAD`; do not read these SHAs forward.
- latexcheck **PASS** on the working clone and on a **fresh clone of the local commit**
  (`main-words.sum` confirmed absent): both **131 pages, 0 errors, 0 undefined references, 0
  undefined citations, 0 floats lost**, 7 overfull, 35 underfull. Tier 2 only; T3-1 open.
- figurecheck **1**, completenesscheck **7**, venueordercheck **5** (was 8 — the de-duplication
  discharged three ORDER findings in Chapter 5 as a by-product).
- Ch 4 **7,712** · Ch 5 **4,870** · four-chapter total **23,046** · projection **~26,000**.
- Every protected qualifier verified surviving **by name**; zero em dashes in the diff.

### Not started, deliberately

**8C-5 (Conclusions) is NOT begun**, by instruction. The recompute set still holds R4, R9, R16, R22
and R30; D3 stays live. S-4 pass two, if there is one, has no items left that this pass did not
either take, decline or rule unavailable.

---

## 2026-08-09 — the 8C-5 rulings, recorded. No composition.

**What this entry closes.** The two blockers raised at the 8C-5 discovery were ruled by Phuong and
are now written where a composing session will meet them, rather than in a report it will not read.

- **Ruling 1 — 6.1 revisits the three Student deliverables** of `docs/PRJ93.md`, one subsection
  each. Recorded as unlock **U6** in `05_paper_architecture.md` §7, and the §2.1 purpose cell for
  6.1 now carries the referent instead of the phrase *"Each objective, achieved or not"*, which
  presupposed a list this project does not have. **Two conditions bind the composer:** an unmet part
  is named in the same sentence as the delivered part, never in a later hedge; and the cause is
  cross-referenced to 5.5 under HC59 rather than re-argued, naming D-U1/D-U4/D-U7 and D-U2/D-U5.
- **Ruling 2 — five contributions.** `06_research_questions.md` §6 is now the single source for
  both 1.4 and 6.2. The stale *"Recommend updating §2.1"* note is replaced by a resolution record
  with every occurrence of "four" enumerated and dispositioned.

**The disagreement was stale, and the finding underneath it was not.** `05`:271, `05`:1317 and §11
already read five; the two surviving "four"s describe the document as it stands and are correct as
inventory. Reading the live `sec:conclusion-claims` end to end to establish that produced the real
result: its four claims map to **C1, C3, C4, C5**, and the section contains no occurrence of
*weather*, *pooling* or *covariate*. **C2 is not a fifth claim appended to four good ones — it is a
contribution the document omits, and it is the pair of nulls.** So the four/five gap runs in the
direction this project guards against: a null dropped from the summary while four positive-sounding
claims survive. This is the same shape as the abstract that passed every instrument while unwritten
— a count disagreement was the only visible symptom of a missing claim, and nothing here checks
whether a contribution is *present*, only whether the prose compiles.

**Conclusions measured rather than inherited.** 1,460 marker words (opener 75 · claims 307 ·
further work 926 · closing 152) against a 1,100 budget. Neither circulating figure was usable:
2,672 predates 8C-4's excision, 1,100 is an allocation S-3 retired. 6.1 does not exist and needs
400, so the pre-compression floor is about **1,860**; *Further work* at 926 against 400 holds the
only real slack.

### Verified end state

- **No `.tex` was touched.** Overleaf clone `main` = `29016e7` = `origin/main`, **ahead 0**,
  push confirmed independently with `git ls-remote`. The three document checkers had no new text to
  examine and were not re-run; the last run stands at figurecheck **1**, completenesscheck **7**,
  venueordercheck **5**.
- Four brain files changed: `05_paper_architecture.md`, `06_research_questions.md`,
  `ledger/8c5_conclusions_input.md`, `ledger/BLOCKED_third_party.md` §F.
- Ch 4 **7,712** · Ch 5 **4,870** · Ch 6 **1,460** · five measured chapters **24,506**.

### Next session

**8C-5, Conclusions.** The prompt is short now: `05`'s §1.4 inventory row and the Chapter 6 spec
block, `06` §6's fixed strings, U6 and its two conditions, and the standing pre-flight and push
discipline. Then 8C-6 (Introduction and Abstract, a revision against the finished document), then
the six-floor measurement and the reallocation ruling. The recompute set still holds R4, R9, R16,
R22 and R30; D3 stays live; T3-1 and T3-2 remain open.

---

## 8C-5 — Conclusions composed (2026-08-09)

**Session authority: all human gates overridden by explicit instruction.** Every gate that would
normally stop for Phuong was taken by the agent and recorded rather than raised. The one gate that
could not be taken is the push, because it is refused by a PreToolUse hook rather than by policy.

### Discovery, and what the instructions did not anticipate

1. **`origin/main` was `29016e7`, not the `12f8cc7` §F asserts.** Re-derived with
   `git ls-remote --heads origin`, per the rule that a §F row naming a SHA is a measurement with a
   timestamp. Three commits had landed since the row was written. Ahead-count 0, tree clean.
2. **`05_paper_architecture.md` §4.5 had NO Chapter 6 row.** The prompt asked for "this chapter's
   displacement row" and there was none. Its five rows are Results 4.4, Results 4.1, Methods 3.3,
   Background 2.3 and Discussion 5.4. The absence was the finding: §4.5 exists so a section that
   cannot meet its budget names the loss rather than exceeding it silently, and Chapter 6 was
   exceeding it with nothing recorded. Row now written.
3. **The chapter opener was stale and promised material the chapter no longer contained** — it
   announced that the chapter settles the two literature disagreements and closes on limitations,
   both of which 8C-4 relocated to Discussion 5.2 and 5.4. The header comment block said the same.
   Nothing had re-read the roadmap after the excision.
4. **`sec:conclusion-claims` still carried its pre-rename heading.** §3.5 renames *"What the work
   establishes"* to **Contributions** under N1 and N6, and the live document had never applied it.
5. **`sec:res-agent` does not exist as a label.** Anything inheriting a cross-reference to it would
   have produced an undefined reference.

### What was composed

`chapters/conclusion.tex` rewritten to the approved tree: **6.1 Objectives revisited** (composed
from nothing under U6, three subsections, one per student deliverable), **6.2 Contributions**
(renamed, five claims), **6.3 Further work** (eight extensions, count reconciled, reordered),
**6.4 Closing**.

**C2 was written in at its numbered place and nothing was renumbered.** The critique then found a
**second** omitted negative result: **RQ2's reconciliation and estimand failure had no contribution
statement either**. The pre-8C-5 chapter therefore covered **three of five research questions** in
the section that claims to state what the work establishes, and both omissions were negative results
while all four surviving claims were positive-sounding. RQ2's limb is carried inside C1, which
`06` §6 already maps to "RQ1, RQ2" — so the count stays at the five Phuong fixed.

### Critique loop — five independent calls, ~60 findings

Roles are the three at `brain/skills/autoresearchclaw/SKILL.md` §3 plus the §4 T1–T14 gate plus two
phase roles (knowledge-telling per `ds-writing` §1; process reported in place of result). Every remit
is **quoted from its owning file** in `ledger/conclusion_rewrite_critique.md`. Eight blocking defects
were found by two or more roles that could not see each other; **six of the eight were inherited
prose, not newly written**.

T1 and T4 **failed on the first pass** and were repaired: the composed draft carried no trace
comments at all, and C1 named no table or section. T3 and T14 are **not exercised** — this chapter
carries zero floats and zero tables, so it can neither pass nor fail them.

### Verified end state

- Overleaf clone `main` = **`49b8f01`**, one commit ahead of `origin/main` = `29016e7`.
  **NOT PUSHED — the push is Phuong's.**
- **Fresh-clone compile of the committed state, `main-words.sum` confirmed ABSENT before the run and
  generated by it:** PASS, **134 pages, 0 errors, 0 undefined references, 0 undefined citations,
  0 floats lost**, 7 overfull (down from 8), 35 underfull. Tier 2 only — TeX Live 2026 locally,
  which is not Overleaf's until T3-1 closes.
- Checkers, with the size examined: **figurecheck** 18 figure sources (24 with chapters), PASS.
  **completenesscheck** 25 files walked from `main.tex`, 7 findings, all pre-existing
  (`introduction.tex`, `publications.tex`, `acknowledgements.tex`), **none in `conclusion.tex`**.
  **venueordercheck** 6 files, 5 findings, **none in `conclusion.tex`** — the estate constraint held.
  All three self-tested clean first.
- AI-writing pass: **zero em dashes**, zero `---`, zero `--`; no Tier 1/Tier 2 vocabulary; no vague
  attribution; sentence-length stdev 16.3 (not metronomic).
- Ch 2 **4,938** · Ch 3 **5,526** · Ch 4 **7,712** · Ch 5 **4,870** · **Ch 6 2,328** · abstract 299.
  **Five chapters 25,374**; projection **~27,100 against HC1's 20,000**.

### Carried forward

- **`results.tex`:526/650 still carries "to a thousandth"**, which `discussion_rewrite_critique.md`
  B13 refuted at 0.00114/0.00121/0.00157. The Conclusions no longer says it. **Chapter 4's copy is
  live and is 8D's.**
- The recompute set still holds R4, R9, R16, R22, R30; D3 stays live; T3-1 and T3-2 remain open.
- **8C-6 (Introduction and Abstract) was NOT begun**, per instruction. The six-floor reallocation
  ruling is its precondition, not its task.
- **No graphify refresh, update or re-extraction was run**, per instruction. The hook demanded one on
  effectively every read and grep, including inside all five critique subagents; declined every time.
  Nothing was unfindable.
