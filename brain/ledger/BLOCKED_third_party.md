# Blocked on a third party — the retrieval point

**Status as of 2026-08-06.** Every conformance row that this project can close on its own
is closed. What remains is listed here, one row per blocker, with what unblocks it, what
already exists, and what to run the moment it does. Nothing below needs new design.

This file is the single retrieval point. A future session should read it before planning
anything, and should not re-derive the blocked list from `literature_conformance.md`,
which records history rather than state.

Related: `brain/PRJ93_RULES.md` (invariants, and the session-lifecycle rule that says to
read THIS file first), `brain/log/Decision_and_Resolution_Log.md` (rows 1–106),
`brain/ledger/literature_conformance.md` §14–§17.

**This file owns current state and nothing else.** It is rewritten rather than appended.
For how something came to be true, read the decision log; for cross-session recall, query
agentmemory. Do not restate a fact from those here, or it will drift.

---

## A · Blocked on an Anthropic API key

The key gates three rows. One key unblocks all three, and they share an apparatus.

### D-U1 — expected calibration error on the agent's output

- **Blocker** `ANTHROPIC_API_KEY`, no other dependency.
- **Already exists** the ECE instrument is implemented and has never been run.
- **Why it matters** `sec:rw-evaluation` names ECE as the instrument that carries a
  coverage guarantee through from the band to what the agent says. Without it the chain
  from calibrated interval to calibrated statement is asserted rather than measured.
- **On unblock** run the ECE pass over a response cache, then write the result into the
  results chapter beside the coverage section.

### D-U4 — judge validation

- **Blocker** the key **and** Elliot. Both, not either.
- **Already exists** the judging apparatus, frozen.
- **Note** the human limb is the harder one. One rater is currently the author, which is
  disclosed in `sec:conclusion-limitations` as a threat to internal validity rather than
  mitigated. A second rater changes what can be claimed.

### D-U7 — leg two of the contribution

- **Blocker** the key.
- **Why it matters** this is the largest single gap between what the dissertation set out
  to do and what it reports, and `sec:res-agent` says so plainly. The intervention layer
  is built, frozen and unmeasured.
- **On unblock** three of the four terms of the objective compute as soon as a response
  cache exists. Only the operator-judgement term needs Elliot as well.

---

## B · Blocked on Elliot (the operator)

### D-U2 — the surfacing cost ratio

- **Blocker** one elicitation: the relative cost of a false alarm against a miss.
- **Already exists** `sec:res-costsweep` reports a sweep over $\beta$ and selects no
  operating point from it.
- **Watch for** the sweep is degenerate for a second and independent reason, and that
  reason is a result rather than a gap: the detector produces 8 false alarms against 124
  misses, which inverts the failure mode `lu_proactive_2024` documents. An elicited ratio
  would be pushed the opposite way to the one the literature guards against. Do not quietly
  drop that point when the number arrives.

### D-U3 — the Ellel booking diary  **(now the highest-value of the blocked rows)**

- **Blocker** the diary itself. `ELLEL_DIARY_LIVE = False`.
- **Already exists** the module, written so the circular substitute (deriving occurrence
  from Ellel's own trading history) is unreachable by any code path. A test asserts it.
- **Why it is now the highest value** `log/74` measured its cost. 1037 of Ellel's 1300
  calendar-open days did not trade; that venue's entire residual drift sits on those days
  and none of it on the 263 days it traded; and on them the residual equals the forecast by
  identity. The missing diary is not a gap in a covariate. It is the whole of one venue's
  exchangeability violation, and it is the Ellel half of the partition defect that the Beer
  Hall shows in the opposite direction.
- **On unblock** re-run `eval/exchangeability_diagnostic.py` with the diary live. The
  prediction is specific and falsifiable: the false-open rate collapses, and with it the
  `drift_false_open_only` statistic (currently $\rho = +0.367$, $p = 1.9\times10^{-34}$ on
  $n = 1037$). If it does not, the account in `log/74` §5 is wrong.

### D-U5 — compliance and reliance

- **Blocker** Elliot.
- **Note** an observational limb, not a run.

---

## C · Blocked on a vendor account

### D-D5 residue — TabPFN-TS as a ladder rung

- **Blocker** two of them, and the second does not yield to a credential. Re-verified
  2026-08-06 against `grinsztajn_tabpfn-3_2026` and the two PriorLabs repositories.
- **Hard constraint 1, do not work around** the library's default entry point still
  transmits the series to a hosted service ("uses the cloud client by default"). The
  estate's revenue data must not leave the machine, which is why `CLIENT` mode was
  refused outright. A token is only useful with a local-weights path.
- **Hard constraint 2, NEW and larger** the current weights carry a licence permitting
  "testing, evaluation, and internal benchmarking" and prohibiting commercial or
  production use, naming **"using model outputs as inputs to internal commercial
  decision-making"** among the prohibitions. This estate is a trading business with an
  operating decision layer. So **evaluating the rung is licensed and serving it is not**,
  on terms no credential or compute changes. Do not let a future session record this row
  as "unblocked by an env var" again.
- **Which backend to pin, if it is ever run** the version `hoo_tables_2026` describes and
  benchmarks is the earlier one, distributed permissively. The library's current default
  is a later checkpoint requiring an account. Running the later one and citing that paper
  would be citing a paper for a model it does not evaluate.
- **Not the blocker** compute. `kaas_probabilistic_2026` measures 1607.9 ms per forecast,
  which at this estate's 738 origins is tens of minutes. `log/75` ran a probe of
  comparable cost to completion. Do not let the write-up leave that explanation open.
- **Already exists** the evaluator is committed, pre-registered, and runs unchanged.
- **Why it matters twice** it is the one candidate surveyed that exposes a genuine
  predictive mean, so it bears directly on the median-under-a-mean's-name limitation as
  well as on the ladder.
- **Adding it now is not free** a new entrant after the fact re-opens model selection and
  needs its own pre-registered gate under the commit-ordering discipline.

---

## D · Not blocked, and deliberately not done

### D-U8 — clarification urgency by what is missing

Declared out of scope at five weeks. That declaration stands and is recorded in
`sec:further-work` as the smallest of the seven extensions. It is a scope decision, not a
blocked row, and a future session should not treat it as work waiting to be picked up
unless Phuong reopens it.

---

## E · Three Further Work items that are gated rather than blocked

All three are changes to a **served artefact**, so none can be executed inside this
dissertation without its own pre-registered gate. None is waiting on a person.

1. **Mondrian groups from observed trading rather than the weekday.** Repairs both
   directions of the partition defect: the Beer Hall's 94 of 546 calendar-closed days that
   traded, and Ellel's 1037 of 1300 calendar-open days that did not. Cheapest and best
   evidenced of the eight extensions.
2. **A per-venue windowed calibration pool.** Measured, not assumed. It brings Two River
   Taps from 0.963 to 0.909 while narrowing the band, recovers about a quarter of the Beer
   Hall shortfall at 7 per cent width, and moves Ellel away from nominal. What it needs is a
   rule for setting the length fixed before the coverage it is tuned against is seen.
3. **A native model interval against a conformal one** (`log/75` §5). Chronos-2's own 90
   per cent interval covers 0.9178 at the Beer Hall where the served band covers 0.871.
   That identifies NOTHING as it stands, because point model, band construction and the
   presence of a calibration layer all differ at once. Holding the point model fixed and
   varying only the interval source would identify it.

---

## F · State to carry forward

**What §F holds, ruled 2026-08-07.** **If a fact is cheaply derivable from an instrument, this
section holds a pointer to the instrument and not a copy of the fact.** A hand-maintained copy of
something a tool reports for free will drift, and it drifts *towards confidence*: the register of
dangling references below survived three stale rows precisely because nobody re-derived them, and
each reading of it made it look more settled. The rows below are marked with the instrument that
owns them; a session quoting one runs the instrument first.

The test does not apply to everything. A floor costs a run to re-derive and is under active
decision, so its value is held here *and* its command named. A tier-3 item is not derivable at
all — it needs a person at a browser. Those rows keep their values.

**The compile command for this document is
`brain/scripts/latexcheck.py main.tex --shell-escape --outdir <scratch>`, and the
`--shell-escape` is not optional.** `\quickwordcount` in `main.tex` uses `\write18` to generate
`main-words.sum`, which `declaration.tex` then `\input`s. Without the flag the file is never
written and the build dies at an emergency stop on the first pass. **A run that omits the flag
passes only because a stale `main-words.sum` is sitting in the working clone** — which is what
every previous run in this project did, including 8C-3's own pre-push check. Same verdict, wrong
reason, and it would not have survived a clean checkout. Found by cloning the pushed state fresh.

**Units, fixed 2026-08-07.** Every word count in this section is **marker-equivalent** — the
`wordcount.py` Marker column, which is Raw minus the artefact the counter charges to prose and a
marker does not. Raw follows in parentheses where it is useful. This row exists because §F
previously quoted Chapter 2 in Raw and Chapter 3 in Marker while presenting the two for
comparison, and the two floors were being held against each other for exactly that comparison.

| Quantity | Value |
|---|---|
| SHOULD-FIX conformance rows | 0 |
| Unadjudicated contradictions | 0 |
| Open rows not blocked on a third party | **2** — S-1 and S-3, both self-closable, both below. *(Was 3. S-2 closed and is struck below.)* |
| DIVERGES — UNRESOLVED rows | 7, every one listed above |
| Dangling cross-references across the chapter files | **0** — verified by compile, not by register. *(This row read **5**. That was wrong: three of the five were already placed by 8C-F and the register was never re-read against a build. See the corrected register below.)* |
| Chapters composed to the approved tree | **5 of 6 as of 2026-08-09** — Chapter 2 (8C-1), Chapter 3 (8C-2), Chapter 4 (8C-3), Chapter 5 (8C-4), **Chapter 6 (8C-5)**. Only the Introduction remains, and it is 8C-6. *(Was 4 of 6.)* *Instrument: `git log` on the clone* |
| **Unpushed commits on the Overleaf clone — DO NOT COPY A SHA INTO THIS ROW** | **This row holds an instrument, not a value.** Run `git -C /Users/hapuna/Downloads/prj93-overleaf rev-list --count origin/main..HEAD` for the count and `git ls-remote --heads origin` for what the remote actually holds. **The Overleaf remote branch is `main`, not `master`.** *Ruled 2026-08-09, after this row had asserted "SEVEN COMMITS AWAIT A PUSH … `origin/main` is `fe7bd9a`" through seven pushes that had already landed.* The pointer-not-copy test at the head of §F always covered this and was not applied, because a SHA reads like state when it is a **measurement with a timestamp**. It is the `phase_state.md`-is-not-state defect recurring one level up, inside the state store, which is the third variant on record. **What does not change and is worth holding here:** `git push` is refused by a PreToolUse hook (protected branch) in every session since 8C-3, so **Phuong pushes**, and routing around the guard is not authorised. Pre-flight evidence belongs with the compile row below, not here |
| ~~**SEVEN COMMITS AWAIT A PUSH — the agent cannot land them**~~ **STALE, corrected 2026-08-09** | ~~2026-08-08. `origin/main` is `fe7bd9a`; local `main` is `dc43250` plus the schema commit. Contents: the composed abstract, X1, the Chapter 4 and Chapter 5 repair batch, the Mondrian reattribution and the Vovk bibliography entry. **`git push origin main` is refused by a PreToolUse hook** — *"Blocked: push to protected branch 'main'. Use a feature branch and open a PR."* This has now happened in 8C-3, 8C-4 and this session, so it is a standing feature of the workflow, not an incident. A feature branch and PR is meaningless against an Overleaf remote, and the rule is to hand it over rather than route around it. **Phuong pushes.** Until then Overleaf holds a document with a boilerplate abstract and a Chapter 4 that contradicts Chapter 5. *Pre-flighted: latexcheck PASS, 127 pages, 0 errors, 0 undefined references, 0 undefined citations, 0 floats lost*~~ **All seven were pushed between 2026-08-08 and 2026-08-09. This row was read as current state on 2026-08-09 and was wrong by seven commits.** The lesson is the one the file already carries about `phase_state.md`, now demonstrated inside `BLOCKED_third_party.md` itself: **a row naming a specific remote SHA is a measurement with a timestamp, not a state.** Re-run `git ls-remote --heads origin` before quoting any row in this table that names a commit; do not read one forward |
| Chapters composed **and pushed** — CURRENT ROW, 2026-08-09 | **5 of 6.** `origin/main` is **`49b8f01`**, verified by `git ls-remote --heads origin` after the push and **not** from the push's exit code; `origin/main..HEAD` is empty. Chapter 6 is on the remote. **Only the Introduction is unwritten**, and it is 8C-6's. The history below is kept; do not read any SHA in it forward |
| ~~Chapters composed **and pushed**~~ **SUPERSEDED by the row above** | **4 of 6.** `origin/main` is **`12f8cc7`** as of **2026-08-09**, verified by `git ls-remote --heads origin`. *(This row read `fe7bd9a` and was seven commits stale; the abstract, X1, the Chapter 4/5 repair batch, the Mondrian reattribution, the Vovk entry, the C3 reordering and the `active`/`traded` sweep are all now on the remote.)* Formerly: `fe7bd9a` (pushed manually 2026-08-08 after the protected-branch guard refused the agent's push a second time — the guard is now a standing feature of this workflow, not an incident). *Instrument: `git ls-remote --heads origin`; never assume from a push's exit code.* **8C-4 supplies the counter-example that makes this row load-bearing:** the first manual push of 8C-4 reported success and moved nothing, because the work was still uncommitted — `git ls-remote` returned `f903214` while `chapters/discussion.tex` was untracked. *"I pushed"* and *"the remote holds it"* are different claims |
| Chapter files live on Overleaf with prose in them | **5** — Chapters 2–5 plus `conclusion.tex`. ~~the last still composed to a *pre-tree* five-chapter shape~~ **SUPERSEDED 2026-08-09: `conclusion.tex` is now composed to the approved tree** (6.1 Objectives revisited, 6.2 Contributions, 6.3 Further work, 6.4 Closing; `sec:conclusion-claims` renamed from *"What the work establishes"* under §3.5 N1/N6). **This is composed LOCALLY and is NOT on the remote — `origin/main` still holds the pre-tree shape until Phuong pushes.** `introduction.tex` is an empty template stub and is 8C-6's |
| Measured word floors — HISTORY, no longer held against per-section budgets (S-3) | **RE-MEASURED 2026-08-08 after the repair batch.** Ch 2 **4,938** · Ch 3 **5,526** · Ch 4 **6,706** (was 6,247, **+459**) · Ch 5 **4,713** (was 4,646, **+67**) · abstract **298**. The repairs add words because most of them replace an assertion with a qualified statement, which is longer: a non-rejection reported as non-separation costs more than one reported as an affirmed null. **S-4 must decide custody on these numbers, not the pre-repair ones.** The budgets they were once measured against are this project's own allocation under A10; only HC1's 20,000 total is mechanical. *Instrument: `brain/scripts/wordcount.py <file> <key>`* |
| Measured word floors — SUPERSEDES the row above | **RE-MEASURED 2026-08-08 after the C3 reordering and the `active` sweep.** Ch 4 **7,587** (was 6,706, **+881**) · Ch 5 **4,873** (was 4,713, **+160**) · abstract **299**. Chapter 4's growth is `sec:res-traded` (the four-limb reconciliation behind the reordered headline), the 4.4.3 correction disclosure, and the native-interval corroboration at nominal ninety. **All of it is measurement replacing assertion**, which is the same mechanism the row above records and the reason the count keeps rising through a repair phase |
| Measured word floors — SUPERSEDES the two rows above | **RE-MEASURED 2026-08-09 after S-4 pass one. TWO FIGURES IN THIS ROW ARE WRONG — corrected at the row beginning "TWO OF THE FIVE FLOORS": Ch 3 is 5,569 not 5,526, Ch 4 is 7,701 not 7,712.** Ch 2 **4,938** · Ch 3 ~~5,526~~ **5,569** · Ch 4 ~~7,712~~ **7,701** · Ch 5 **4,870** · abstract **299**. **Four-chapter total ~~23,046~~ 23,078** against the **15,800** those four budgets sum to (4,000 + 4,200 + 5,200 + 2,400, `05_paper_architecture.md` §2.1:273–303). Projection **~26,000 against HC1's 20,000**. **S-4 pass one moved 105 words net**, which is the finding: see `ledger/s4_deduplication_items.md`. Chapter 4 GREW by 61 because item 1's condition migrated Chapter 5's sharper overlapping-origins caveat and its corroboration limit into the survivor, which is a strengthening bought with words. **De-duplication is not the instrument for the remaining ~5,600** — ruled 2026-08-09: write the two unwritten chapters, measure, and take the reallocation decision on six real floors rather than four plus a forecast; if the total still lands materially over, the answer is an accepted overrun with a stated justification and NOT a cut to reconciled measurement. *Prior reading this session: Ch 4 7,651 · Ch 5 5,036.* Earlier: Ch 4 **7,588** (was 7,587) · Ch 5 **4,993** (was 4,873) · abstract **299**. **Four-chapter total 23,151** against the **15,800** those four budgets sum to (4,000 + 4,200 + 5,200 + 2,400, `05_paper_architecture.md` §2.1:273–303), over by **7,351**. Projection **~26,100 against HC1's 20,000**, so **~6,100** is the number S-4 must find, and it is set by the **20,000 total** — the per-chapter budgets were ruled this project's own allocation under A10 and are not a rubric requirement (S-3). *Intermediate readings this session: 7,588 / 4,993 after R24+T8, then +63 / +43 for the Two River Taps dependence disclosure.* Earlier in this row: Ch 4 **7,588** (was 7,587, **+1**) · Ch 5 **4,993** (was 4,873, **+120**) · abstract **299**. Chapter 5 carries all but one word of the change: the R24 rewording replaces a false one-sentence assertion that a correction cancels with the computed correction, its two budget-conditional values and the venue-dependence of its sign. **Same mechanism as the two rows above and now four times running: measurement replacing assertion costs words.** Four-chapter total **23,045**; projection **~26,000 against HC1's 20,000**. *Instrument: `brain/scripts/wordcount.py <file> <key>`* |
| Four-chapter total, post-repair | **21,883** against the 15,800 those four budgets sum to. With the abstract and the two unwritten chapters the projection is **~24,800 against HC1's 20,000**, up from ~24,150. S-4's de-duplication is now carrying more, not less. **UPDATE 2026-08-08:** four chapters now measure **22,924**; projection **~25,900 against 20,000** |
| Relocation of `sec:res-traded` — RULED, do not revisit | **Ruled against relocating it out of Chapter 4** (Phuong, 2026-08-08), against the standing rule that an overrun is tested for relocation before a cut is costed. The test was run and returned NO. Reasons, recorded because the same argument will be offered again for other Chapter 4 sections: it is **the evidence for the corrected headline, and Chapter 4 is where evidence lives**; Chapter 5 carrying a shorter version is **the correct relationship, not duplication** — interpretation there, measurement here; and relocating would leave 4.4 asserting a verdict whose four-limb reconciliation sits two chapters away, **which is the structure 8A.1 flagged when `sec:res-basis` was reported as a result**. The +881 is answered at S-4, on all four chapters, not by moving the passage that makes the claim defensible |
| Four-chapter total against the budgets they share | **21,357 / 15,800**, over by **5,557 (+35 %)**. At budget for the unwritten three the document lands near **24,150 against HC1's 20,000** |
| Chapters still unmeasured | 2 — Introduction (**nothing written**) and Conclusions (composed, but to the pre-tree shape and 1,423 words lighter after 8C-4's excision). Budgeted **2,400** between them plus the abstract, and **composed rather than compressed**, so their floors cannot be inferred from the four measured ones |
| Chapters still unmeasured — **SUPERSEDES the row above for Conclusions** | **1, the Introduction. Conclusions is MEASURED, 2026-08-09: 1,460 marker words** (opener 75 · *What the work establishes* 307 · *Further work* **926** · *Closing* 152) against a 1,100 budget. **Neither figure previously in circulation was usable** — `05_paper_architecture.md`:1092's 2,672 predates 8C-4's excision, and 1,100 is an allocation S-3 retired as a constraint, which is why the row above was right that the floor could not be inferred and wrong to leave it uncounted. **6.1 does not exist at all** and is budgeted 400, so the pre-compression floor is about **1,860**; *Further work* at 926 against 400 is the only section holding real slack, and 6.2's strings are fixed and not S-4 material. *Instrument: `brain/scripts/wordcount.py chapters/conclusion.tex`* |
| **Conclusions floor — SUPERSEDES the 1,460 row above. Measured 2026-08-09 after 8C-5** | **2,328 marker words** (opener 85 · **6.1** 429 · **6.2** 962 · **6.3** 690 · **6.4** 162) against the retired 1,100 allocation. **6.3 was compressed 926 → 690** by returning its per-venue numbers to the sections that own them. **6.2 grew 307 → 962** and that is the finding, not the overrun: the four-claim version omitted **C2** (the weather and pooling pair) *and* **RQ2's reconciliation and estimand result**, both negative results, and about 180 further words are qualifiers the five-role critique added in place of over-claims — the power clause, "calibrated band", "to a thousandth", "both returned nulls", the missing population, the misdescribed selection protocol. **This is measurement replacing assertion costing words for the fifth recorded time.** Displacement recorded at `05_paper_architecture.md` §4.5, which had **no Chapter 6 row at all** before this session. *Instrument: `brain/scripts/wordcount.py chapters/conclusion.tex`* |
| **Six-chapter position, 2026-08-09** | **TWO FIGURES CORRECTED — see the row beginning "TWO OF THE FIVE FLOORS".** Five chapters measured: Ch 2 4,938 · Ch 3 ~~5,526~~ **5,569** · Ch 4 ~~7,712~~ **7,701** · Ch 5 4,870 · Ch 6 2,328 = ~~25,374~~ **25,406**, plus abstract 299. **SUPERSEDED 2026-08-09 by the six-chapter row below** — the Introduction is now measured at 2,023 and the abstract at 300, so the document total is **27,729**, not a projection. The reallocation ruling's six-floor precondition is **discharged** |
| ~~8C-5 readiness — the two blockers, both RULED 2026-08-09~~ **DISCHARGED 2026-08-09 — 8C-5 is composed** | **OPEN AS COMPOSITION, CLOSED AS BLOCKERS.** (1) **6.1 revisits the three Student deliverables** of `docs/PRJ93.md`, recorded as unlock **U6** in `05_paper_architecture.md` §7 with two binding conditions: an unmet part is named in the same sentence as the delivered part, and the cause is cross-referenced to 5.5 under HC59 rather than re-argued. The cell it replaces presupposed a list the project does not have — `docs/PRJ93.md` read end to end, **"objective" 0, "aim" 0, "goal" 0, "outcome" 0, "deliverable" 1**. (2) **Five contributions**, `06_research_questions.md` §6 now the single source for 1.4 and 6.2. **The four/five disagreement was stale, not live** — `05`:271, `05`:1317 and §11 already read five; the two surviving "four"s are correct as *inventory* of a document 8C-5 is what changes. **The finding the count concealed: the live `sec:conclusion-claims` maps to C1, C3, C4, C5 and contains no occurrence of *weather*, *pooling* or *covariate*. C2 is not a fifth claim appended to four good ones — it is an omitted contribution, and it is the pair of nulls.** The gap runs in the direction this project guards against, a null dropped from the summary while four positive-sounding claims survive. *Instrument: `ledger/8c5_conclusions_input.md`* |
| Document builds, and every figure a build reports | **VERIFIED ON A FRESH CLONE OF THE PUSHED STATE `fe7bd9a`**, cloned from `git.overleaf.com` and not from the working clone (`main-words.sum` confirmed ABSENT): **125 pages, 0 errors, 0 undefined references, 0 undefined citations, 0 floats lost**, 8 overfull boxes (largest 182.80 pt, `search_screening_body.tex`), 33 underfull. *Instrument: the command at the head of this section. Do not copy these numbers forward — re-run it.* **Tier 2 only:** TeX Live 2026 locally, which is not Overleaf's until T3-1 closes |
| Open tier-3 (Overleaf-only) items | **2** — T3-1 and T3-2 below |
| **Tier 2 needs three things set, and none of them is on the default PATH** | **CORRECTED 2026-08-08. An earlier version of this row said TeX was absent and that no push could be pre-flighted. That was WRONG** — TeX Live 2026 is installed at **`~/texlive/2026/bin/universal-darwin`** and works. The row was written after searching `/usr/local/texlive`, `/Library/TeX`, `/opt` and `$PATH`, finding nothing, and recording a definitive negative without looking in the home directory. That is the **"absence by grep as proof"** anti-pattern SKILL.md §6 names, committed straight to the state store. A negative gets verified more than one way before it is written down. **The working invocation, all three parts required:** `export PATH="$HOME/texlive/2026/bin/universal-darwin:$PATH"`, then `latexcheck.py <tex> --shell-escape --outdir <scratch>`, with **`TEXINPUTS`** pointing at a scratch directory holding the `svg.sty` stub for T3-2. **The stub is the fragile part:** it is scratch-only, never committed, and has been re-created under a different directory name in each of the last three sessions (`stub/`, `texshim/`, `texstub/`), so a new session's compile fails at `title_page.tex:7` until it is rebuilt. Same class as the stale `main-words.sum`: a build that passes because of a file sitting in a working directory. *Instrument: `command -v latexmk` after the PATH export* |
| `abstract.tex` | **WRITTEN 2026-08-08, committed locally, NOT YET PUSHED — `origin/main` still carries the boilerplate.** 298 marker words against the 300 cap. It had survived every push and two fresh-clone compiles because **a compile verifies that a document builds, not that a section was written**, and no instrument here asks the latter. **The general form is worth keeping after this row closes:** every check this project runs is a check on the artefact's *form*, and none on whether its content exists. *Instrument: open the file; `wordcount.py` for the count* |
| T8, source-claim verification | **DISCHARGED FOR CHAPTERS 4 AND 5. Chapter 4's run is 2026-08-09, `ledger/source_claim_verification_ch4.md`:** 12 keys / 14 citation commands, **12 SUPPORTED, 1 OVERSTATED, 1 UNREACHABLE**. The overstatement is `lu_proactive_2024` at `results.tex`:941, the **unrepaired half of role-audit V4** — V4 softened `establish` to `report` and left "for this class of system", which promotes eight evaluated LLM agents into a class; NotebookLM returns no sentence in which the authors characterise a failure mode at all, so the repair substitutes the number their table carries (all eight above a half on false alarms). **REPAIRED, unpushed.** `breiman_classification_1984` is **UNREACHABLE and recorded as unchecked, not passed**: the 1-SE rule was not found in the notebook (a table-of-contents fragment only) nor in Zotero `CDBJWY8U` (a 31-page partial, zero occurrences of "standard error"); closing it needs the full CART text, which is an acquisition and therefore a human gate, and is NOT raised as one because nothing in the chapter is known to be wrong. `angelopoulos_conformal_2023` and `kaas_probabilistic_2026` were verified **at the PDF** and both load-bearing claims hold: A&B Theorem D.2 carries the continuity condition that justifies withholding the upper coverage limb, and Chronos-Bolt's 8.652 is the smallest interval width of all twelve rows of Kaas Table 3. **NotebookLM's citation indices were mis-mapped twice again in this run** and both were caught by reading `cited_text` rather than the index. *Instrument: the two `source_claim_verification*.md` files* — the Chapter 5 history follows: **DISCHARGED FOR CHAPTER 5, WAS OPEN FOR CHAPTER 4.** `ledger/source_claim_verification.md` holds the run of 2026-08-08 against the `Dissertation` notebook (118 sources), covering all 21 keys / 28 citation commands in Chapter 5: **16 supported, 2 refuted, 2 unreachable** because the source is not in the notebook. The two refutations are **H12-1** (the Mondrian construction attributed to `barber_conformal_2023`, whose sole related-work mention of it disclaims the connection and credits Vovk, Gammerman & Shafer 2005 — **absent from both `.bib` files**; originates at `methodology.tex`:442, inherited at `discussion.tex`:214) and **H12-2** (`stocker_gentle_2025` over-attributed a group-conditional guarantee at `discussion.tex`:215, where `methodology.tex`:443 is careful — a Chapter 5 compression error). Chapter 2's two uses of `barber_conformal_2023` are **correct** and must not be touched. **H12-1 and H12-2 are REPAIRED 2026-08-08** (unpushed): the Mondrian construction is reattributed to `vovk_algorithmic_2005`, re-verified independently against the Barber PDF this session — both `Mondrian` occurrences sit in one Related Work passage crediting Vovk, Gammerman & Shafer and closing *"These works involve very different ideas from those presented in the current paper"* — and that source is now in Zotero (`VUUU2K66`, key pinned in both `citationKey` and `Extra`) and in `ref_additions.bib`. **T8 FOR CHAPTER 4 REMAINS UNRUN**, and it is the largest single open verification: Chapter 4 carries twelve cited works whose claims have never been checked against NotebookLM. *Instrument: `ledger/source_claim_verification.md` is the Chapter 5 template* |
| Role-critique findings against Chapters 4 and 5 | **TEXT REPAIRS APPLIED 2026-08-08 IN SIX COMMITS, PRE-FLIGHTED, NOT PUSHED.** X1 first per SKILL.md §5, then §4.1–§4.5 and Chapter 5. `role_audit_synthesis.md` holds the list and marks which items are text and which need a number recomputed. **STILL OPEN — the recompute set, all owner Phuong:** R4 (the confusion matrix on one denominator; the digits and the denominator split are disclosed in the chapter but the single-basis figure does not exist), R30 (Ellel traded-only served-band coverage — Role A recorded this as a check that *could not be completed*, which is not a pass), R9 (31 against 37 paired differences), R22 (uncertainty for `tab:weather`, `tab:exchangeability`, `tab:intermittency`), ~~R24 (marginal ACFs)~~ **R24 is CLOSED 2026-08-09 — see the row below**, R16 (ACI γ at one fixed value; the disclosure half is applied). **D3 also stays live** — Role A and Role B reached opposite verdicts on `tab:coverage` and R30 is the evidence that settles it. *Instrument: `ledger/role_audit_synthesis.md`* |
| **R24 — CLOSED 2026-08-09. The cancellation assumption FAILS** | The 6.2 pairing defence assumed a dependence correction "cancels in their ratio". Both marginal ACFs are now computed (`brain/eval/marginal_acf.py`, self-tested, reproduces `mcs_L1_results.json` `paired_variance_top4[0]` cell by cell before reporting; artefact `brain/eval/marginal_acf_L1.json`; ledger `ledger/r24_marginal_acf.md`). **They do not cancel, and at Ellel the correction is ADVERSE.** Lag 1: differential 0.811, marginals **0.873** and **0.868**. Lag 10: differential still **0.241**, marginals **−0.129** and **−0.195** — the marginals carry the venue's weekly cycle and lose it at the week; the differential has that cycle subtracted out and keeps a slow level component. Bartlett VIF is therefore larger on the **differential** (9.74 against 7.11 / 6.19) and the corrected ratio **falls**: 6.37 / **5.82** / 5.14 / 4.10 / 2.53 at lag budgets 2 / **7 (pre-registered `BLOCK_LEN`)** / 10 / 14 / 21, **below the uncorrected 6.205 at every budget of seven or more**. **The sign is venue-dependent** and reverses at Beer Hall (5.46 → 9.71) and Two River Taps (8.33 → 10.36), where the leading contrast is between near-identical foundation models so the differential is near-white and the marginals persist. So "cancels in their ratio" is **false in general**, not merely unverified. **Text reworded, not renumbered** (`discussion.tex`): 6.2 is relabelled an uncorrected figure and an upper bound on the pairing gain, the corrected value at the pre-registered block length is given, and the venue-dependence is the stated reason it cannot be assumed away. **The qualitative claim survives; the quantitative bound loosens by about a factor of three** (the £1.91 sits at 0.16 of a corrected paired SE rather than 0.50, and a 95 % interval widens from ±£7.5 to ±£23 against a mean loss near £238) |
| ~~**OPEN REPAIR for 8D — "to a thousandth" is FALSE and is live at TWO sites in the pushed document**~~ **CLOSED 2026-08-09 — repaired at NINE sites, root first. The root was `log/72`:69, a result file. See `log/72` §7.** | **The claim:** that ranking each banded residual inside its own calibration pool reproduces the measured coverage "to a thousandth". **The refutation:** `ledger/discussion_rewrite_critique.md` **B13** measures the implied-versus-measured agreement at **0.00114 / 0.00121 / 0.00157**, so a thousandth is **not met at any venue**. **Both live sites, verified by grep on the pushed state 2026-08-09:** `chapters/results.tex`**:650** *"The implied and measured columns agree to a thousandth at all three venues"*, and `chapters/discussion.tex`**:93** *"reproduces the measured coverages to a thousandth"*. **B13 recorded only one site** (as `results.tex`:526, since shifted), so the second was never carried forward. **What B13's repair actually did, and this is the lesson:** it fixed the *inference* at both sites (both now carry "That agreement does not add precision… it decomposes the same indicators rather than measuring them independently") and **left the false precision figure standing at both**. A repair that corrects what a number means does not correct the number. **The Conclusions no longer says it** and carries a LaTeX comment recording why. **Owner: 8D.** Replace with the decomposition statement, or quote the measured agreement |
| **A new failure mode for the trace check, recorded because T1 does not catch it** | Role B verified "to a thousandth" as **MATCHES** — against `results.tex`:650, which carries the same wrong claim. **That is a match of prose to prose, not of prose to a measurement**, and T1 as written ("every number traces to a `brain/log/*result*.md` file") does not distinguish them, because a claim can trace to a chapter that traces to nothing. `PRJ93_RULES.md`'s *"a value match is not an identity match"* covers the numeric form of this; the textual form is new: **two sentences agreeing is not evidence when both descend from the same unrepaired source.** When verifying a claim, the terminal node must be an artefact or a result file, never another `.tex` file |
| **Upstream sweep for the three inherited Chapter 6 defects — RUN 2026-08-09, and it is uneven** | The three claims found in Chapter 6 were swept across **`chapters/` (all five), `abstract.tex` and `appendix/`**. **Result: one of the three is live upstream, two are clean.** (1) ~~**"to a thousandth" — LIVE at two sites**, the row above.~~ **CLOSED 2026-08-09.** And the sweep's own scope was the finding: it covered `chapters/`, `abstract.tex` and `appendix/`, and the claim's ROOT was in neither — `log/72`:69, a result file. **Two sites was an undercount by seven.** (2) **Power language — CLEAN.** The only hit is `results.tex`:872 *"flat at power"*, which is **a different quantity in a different sense**: it quotes no power value and is audited **MATCHES** at `numbers_audit.md` row 84 against `log/49_G17h`:102–105. It does not violate `results.tex`:518's refusal to quote achieved power, and it is **not** to be "repaired" — this is the `field name is not a definition` caution firing in the sweep's favour. (3) **The B17 sample-size claim — CLEAN.** Zero occurrences anywhere outside the explanatory comment in `conclusion.tex`; it was struck from `discussion.tex` and existed at only one other site, which 8C-5 fixed. **Also checked and clean:** every "calibrated band / calibrated interval" hit in Chapters 2 and 5 is **definitional or quotes RQ5's own wording**, not an assertion that this estate's served band is calibrated. **Scope of this clean result:** three named claims, seven files. It says nothing about any other inherited claim |
| **Two protocol findings in Further work, both caught by the roles reading for content** | **(1) Protocol leakage, ranked closest to executable.** The Mondrian repair proposed grouping on **whether the venue traded**, which is known only *after* the target date, so it would condition the calibration group on the realised outcome. It sat first in a list ordered by executability and was described as "mechanical". Rewritten to group on a **predicted** occupancy signal, whose input is the booking diary D-U3 blocks, and moved into the blocked group. **(2) Further work that cannot be done.** The Two River Taps rung item waited on "a live trading series" at a venue that **ceased trading 2026-05-08 and whose history cannot grow** (`methodology.tex`:41–42) — the frozen-control property the design depends on. Reframed as a rule fixed in advance for a live venue. **Neither is a writing defect and neither would be caught by any instrument here.** A Further Work item is a methodological proposal and gets audited as one |
| **The 20,000 overrun needs a justification ASSEMBLED, not assumed** | Ruled 2026-08-09. The projection is **~27,100 against HC1's 20,000** with only the Introduction unmeasured, and **~7,100 is not coming from de-duplication** — S-4 pass one moved 105 words net across four chapters, which measured the instrument and found it. So the reallocation decision at 8C-6 is **an accepted overrun with a stated justification**, and the justification is a deliverable to be built deliberately rather than a sentence written at the end. **What belongs in it, first entry:** 6.2 growing **307 → 962** to carry two omitted negative results (C2 and RQ2's limb) plus ~180 words of qualifiers replacing over-claims. That is the shape of the whole overrun — five recorded instances of measurement replacing assertion — and the justification is strongest as a *measured* claim about what the words buy, not as an apology. Assemble it from the §F rows that already record each instance |
| Root knowledge graph | **STALE.** `graphify-out/graph.json` stands at **13,618 nodes** with **six large files recorded stale**. No refresh, update or re-extraction was run in 8C-3 or 8C-4 by instruction: the graph is a convenience index, those sessions navigated by path and grep, and a refresh would have spent heavily for no marginal value. The two refusals of 2026-08-07 are unresolved and `brain/scripts/graph_write_guard.py` brackets any future run. In 8C-4 the hook demanded a refresh on **every** read and grep, including inside all six critique subagents; declined every time. **Nothing in 8C-1/2/3/4 was blocked by the staleness, and nothing was unfindable** |
| **Six-chapter position — SUPERSEDES the 2026-08-09 row above. All six chapters composed, 8C-6** | **Ch 1 2,023 · Ch 2 4,938 · Ch 3 5,569 · Ch 4 7,701 · Ch 5 4,870 · Ch 6 2,328 = 27,429**, plus abstract **300**. **Document total 27,729 against HC1's 20,000, over by 7,729 (+39 %).** **The reallocation ruling's precondition is DISCHARGED** — six real floors, all re-derived with `wordcount.py` on `49b8f01` this session, none quoted forward. The ruling itself is 8D's and was not taken here |
| **TWO OF THE FIVE FLOORS IN THE ROW ABOVE-ABOVE WERE WRONG, and the row's own instrument line named the fix** | **Ch 3 read 5,526 and measures 5,569 (+43); Ch 4 read 7,712 and measures 7,701 (−11).** Chapter 3's has been stale since **`12f8cc7`**, the *active/traded terminology sweep* — measured across commits, `methodology.tex` is 5,526 at `fe7bd9a` and 5,569 at `12f8cc7` and unmoved since. The sweep rewrote `active` to *calendar-open* or *trading-day* in Chapter 3 as well as Chapter 4, and **three subsequent "RE-MEASURED" rows re-ran the instrument on Chapters 2, 4 and 5 and copied Chapter 3's figure forward**. Chapter 4's is a plain transcription error: `results.tex` is 7,701 at `29016e7`, the commit the figure was taken from, and 7,712 at no commit in the range. **The five-chapter total 25,374 was understated by 32; it is 25,406.** *This is the pointer-not-copy rule at the head of §F failing inside the row that names `wordcount.py` as its instrument.* |
| **"To a thousandth" reaches FURTHER than the two-site sweep found, and one of the new sites is a RESULT FILE** | The 2026-08-09 sweep scoped itself to *"`chapters/` (all five), `abstract.tex` and `appendix/`"* and said in terms that it says nothing about any other claim. **`knowledge/` and `log/` were never swept, and the claim is live there as an ASSERTION, not as a record of its refutation:** `05_paper_architecture.md`**:220** (*"**Headline.** Reproduces measured coverage to a thousandth at all three venues"*), **:470** (`tab:exchangeability`'s float description), **:1110** (§4.5, *"What must survive at full strength is the rank statistic reproducing published coverage to a thousandth"* — a **binding composition instruction**), `ledger/literature_conformance.md`**:922**, and **`log/72_DU6_exchangeability_result.md`:69**. **The last is the root.** It is a `*result*.md`, which is T1's terminal node, and `discussion.tex` and `conclusion.tex` both cite it as their trace. So the claim traced correctly to a result file that itself asserts it, and T1 passed on it every time. ~~**Owner: 8D, and the repair set is now nine sites, not two**~~ **CLOSED 2026-08-09. All nine repaired, `log/72` first**, because repairing the downstream copies of a claim whose source still asserts it just reseeds them. `log/72` §7 records the correction, and two rules are written from it in `PRJ93_RULES.md`: *a terminal node is only terminal if it was COMPUTED*, and *a MATCHES verdict compares at equal precision* |
| **Why "to a thousandth" also survived the NUMBERS AUDIT, verified this session** | `numbers_audit.md` **X1** grades it **MATCHES**, on *"implied **0.8703** against published **0.871**"*, difference 0.0007. **The published figure is rounded and the implied one is not.** The exact Beer Hall served-band coverage is **1525/1750 = 0.8714286**, against implied 0.870286, difference **0.0011428** — which is B13's 0.00114 to five places. **The audit compared a full-precision value against a three-decimal one, and the rounding hid the defect it existed to catch.** Three independent audit paths failed on this claim in three different ways: T1 (traced to a result file that asserts it), Role B (matched prose to prose), and the numbers audit (matched full precision to rounded). Recorded because the *mechanism* generalises past this claim |
| **`log/PRJ93_Agent_Eval_Report.md` CONTRADICTS ITSELF on the cost sweep, and one of the two tables is the pre-fix output** | Found by Role C, **verified independently**. **§3** (lines 40–52) carries a cost table reading **0 misses / 0 spurious / weighted cost 0.0 / dominant: false-alarms** at all four ratios. **S6** (lines 240–250) carries **124 / 75 / 199–1315 / dominant: misses**. Both sit under near-identical header text and the same formula line. §3 is the **pre-fix `cost_curve` output** and was not regenerated when the fix landed on 2026-08-08. **A verifier landing on §3 rather than S6 refutes C4 in Chapters 1, 5 and 6 and would report the corrected number as the defect.** This is the most reachable trap in the trace set. **Owner: 8D** |
| **HC4 was FAILING and no instrument here could see it — REPAIRED 2026-08-09** | `00_marking_criteria.md`:32, *"HC4. The abstract is a single paragraph"*, and `05_paper_architecture.md` §5 names it against the abstract. **`abstract.tex` had been four paragraphs since composition on 2026-08-08.** `latexcheck` reads the build, `completenesscheck` reads presence, `venueordercheck` reads triples, `wordcount` reads length: **none asks whether a section meets a criterion it is named against.** Same class as the issued-template abstract, in a new place. Now one paragraph at zero word cost |
| **Two MANDATORY/hard-constraint document items, neither of them Chapter 1's, both verified on the build** | **HC54 is UNMET:** *"The project specification prepared at the start of the project period is included as an appendix"* — there is no such appendix. `main.tex`'s appendix block holds four chapters and none is the specification. **HC57 is VIOLATED:** *"Appendices are placed after the References section"* — the build puts appendices at pages 99–115 and References at 116. **Owner: 8D**, and HC54 needs Phuong (the document is an acquisition) |
| **The appendices were RE-LETTERED by a second writer and `main.tex`'s comment still warns against it** | `4e2d209` (*"Update on Overleaf."*, 2026-08-08) removed the template stub `\chapter{Introduction}` / `appendix/introduction` from the appendix block. That is an **Overleaf web-UI commit**, and the adopted rule is that the web UI is *"for compiling and reading only"*. **Nothing broke, and the reason is worth keeping:** every appendix reference in the document is a `\ref{app:…}`, so the letters followed automatically. Verified on the build (`main.toc`, `main.aux`): **A Corpus search and screening · B Method specifications and pseudocode · C Robustness and protocol detail · D Full ladder and confidence-set tables.** **What was stale is `main.tex`:257–262**, which still described an Appendix A stub that no longer exists and warned against a re-lettering that had already happened, and **:273**, which called the last appendix *"E"*. §F's own references to *"Appendix E"* for `tab:ladder` and the four demoted floats mean **Appendix D**; the one at the Tier-3 heading below is corrected. **CLOSED 2026-08-09.** Both comments rewritten, and the letters re-verified on the build after the HC57 reordering: **A Corpus search and screening · B Method specifications and pseudocode · C Robustness and protocol detail · D Full ladder and confidence-set tables · E Project specification** (`main.toc`, pages 113 / 117 / 125 / 127 / 130). **E is now a real appendix**, added for HC54, so *"Appendix E"* meaning D would from today collide with a live letter rather than merely dangle |
| **`06_research_questions.md` carries three stale cells that the composed chapters have already departed from** | Found by Roles B and C while auditing against the spec. (1) **§5's RQ4 string** reads *"accounts for the **shortfall**"* and §2 (:83) the same; the band misses nominal at all three venues in **both** directions, so the word presupposes an answer the evidence contradicts. `discussion.tex`:86 already writes *"departure"* and Chapter 1 now does too, so **1.3 and 5.1 agree and the spec is the outlier**. (2) **§5's rationale note (:195)** still reads *"the answer is that it fails at one venue"* — the identical presupposition the C3 amendment struck one section later. **A repair that fixed §6 and left §5 is this project's "fix the verb, leave the scope" pattern.** (3) **§6's C4 strength cell** still reads *"8 false alarms against 124 misses"*, the pair R4 withdrew. **Owner: 8D.** Chapter 1 departed from all three deliberately and records why |
| **Three inherited claims found while composing Chapter 1, each verified at an artefact, none repaired** | (1) **"The served forecaster returns a median"** over-generalises: `log/62` establishes the median bias for the Beer Hall hierarchy's **base** forecaster, and of the three served models only Ellel's is a day-of-week median. Live at `discussion.tex`:62, `discussion.tex`:352, `conclusion.tex`:116. Chapter 1 states it as 5.4 does, a property of the **measures** plus this deployment. (2) **R30's z values are Wald statistics** on the observed proportion; under the null variance they are **−0.96 / −10.76 / +6.36** rather than −0.93 / −6.99 / +10.16. Every sign and verdict survives, Ellel's departure is understated by about 35 per cent. (3) **`eval/interval_calibration_L1.json` carries top-level `"device": "cpu"` and `provenance.device: "mps"` in the same file**, and the generator makes the run a function of device placement. Bears on Chapter 3's reproducibility statement |
| **T8 is UNRUN for Chapter 1 and that is a declared advisory FAIL, not a pass** | Nine citation keys are used in 1.1–1.2 and **none was re-checked against NotebookLM this session**. All nine claims are restatements of Chapter 2's, whose T8 run is discharged, and the two carrying most weight were confirmed at Zotero source metadata. **A restatement inheriting a discharged check is not the same as a check**, so this is recorded as a failed advisory gate rather than mitigated into a pass. **Owner: 8D.** T9 by contrast **passes**: all nine confirmed by title lookup, and `montero-manso_principles_2021` returned a null from `zotero_search_by_citation_key` before being found at `257UK8GY`, which is the fifth recorded instance of that tool's null being meaningless |
| **The three self-closable rows are S-1 and S-4, not S-1 and S-3** | The count row at the head of this table reads *"**2** — S-1 and S-3"*. **S-3 is struck below as CLOSED AS SUPERSEDED (Phuong, 2026-08-08) and S-4 is its live replacement**, so the count of 2 is right and one of the two identifiers is wrong. Corrected here rather than in the row above, so the original stays visible |

| **HC54 MET — the mandatory project-specification appendix existed nowhere and now exists** | `00_marking_criteria.md`:94 and :386 make it **mandatory**: *"The project specification prepared at the start of the project period is included as an appendix."* It had never been present. Added 2026-08-09 as **Appendix E**, reproducing `brain/docs/PRJ93.md` with exactly two declared departures (four characters transliterated for the toolchain; the two EMPTY "Applications email" fields omitted). Cross-referenced both ways with `sec:disc-specification`, which declares the six divergences. Appended after D so A–D keep their letters — and relettering was **verified safe anyway**: zero hardcoded "Appendix «letter»" strings in prose, all 22 references are `\ref{app:…}`. **Verified on the build, not the source:** Appendix E at page 130 (`main.toc`). This was free marks lost on an artefact already in the repo |
| **HC57 MET — References now precede the appendices** | `00_marking_criteria.md`:97. The build put appendices at 99–115 and References at 116. `\printbibliography` now sits before `\begin{appendices}`. **Verified on the build:** References 99, Appendices A–E at 113 / 117 / 125 / 127 / 130. biblatex collects every `\cite` regardless of where the bibliography is printed, so appendix-side citations still resolve — checked, not assumed: **0 undefined citations, 0 undefined references** on a fresh-clone compile |
| **The front matter was shipping the issued template's INSTRUCTION TEXT, and no one had looked** | `acknowledgements.tex` carried, live and uncommented, *"Acknowledgements you may want to make. **(this is not required when submitting your thesis before your viva…)**"* — template scaffolding addressed to the author, in PhD wording an MSc dissertation has no viva for, printing in the front matter. **This is the issued-template-abstract defect a second time**, in the file next to it. Found by `completenesscheck.py`'s TEMPLATE rule, which is precisely what it was built for. Commented out; **the acknowledgements content is Phuong's to write and was not drafted on their behalf**. `publications.tex` declared `% INTENTIONALLY EMPTY:`. **`completenesscheck` now PASSES for the first time in the project's history — 26 files.** It has read FAIL 7, then FAIL 5, since it was written |
| **`figurecheck` was passing NARROWLY, and widening the scan found a standing false positive** | 8C-6 reported *"figurecheck PASS (19 sources)"*. Re-run over the whole clone it scans **26** and reported **FAIL 1**: `\printbibliography[heading=bibintoc,title=References]` matched the pgfplots `title=` rule. **Confirmed pre-existing** by compiling the pushed baseline `eebf3e9`, which produces the identical finding at the old line 280 — so it is not a regression, it is a check that had been scoped past `main.tex`. This is *a check that examined nothing must not report clean* in its weaker form: **a check that examined a narrower set passes narrowly.** The instrument is fixed (`TITLE_KEY_FALSE_POSITIVES` excludes the biblatex/tocloft `title=` key) and **exercised in both directions** before use, plus its own `--self-test`. Left unfixed it would fire on every future run of any document with a bibliography, which is the case the module docstring warns gets a guard silenced |
| **A generator bug: a 0-versus-0 tie was printed as a verdict** | `eval/agent_eval.py`'s `cost_curve` resolved `"misses" if r * fn > fa else "false-alarms"`, so **every tie fell through to "false-alarms"** — including the 0/0 tie a clean run produces. That is why `log/PRJ93_Agent_Eval_Report.md` §3 printed *"dominant: false-alarms"* on zero misses and zero spurious, pointing the **opposite way** from S6's "misses" on the same estate. Fixed to emit `"none"` on a tie. **No artefact regenerated and none needs to be:** the citable S6 run is 124 against 75, no tie, and its published table reproduces exactly (199 / 323 / 695 / 1315, all "misses") |
| **§3 of the agent-eval report is SUPERSEDED, and the supersession was already written — a hundred lines downstream** | §§1–3 are the **N=4 plumbing smoke run**; the citable run is the **N=644** grid at S1–S6. S1 said so, in one sentence, *inside the superseding section*, below the sections it supersedes. **A reader arriving at §3 to check C4 never reached it and would refute the contribution.** §3 and S6 carry near-identical headings, an identical table schema and an identical framing sentence. Resolved as **superseded in place, not deleted** — a smoke run is a real record, and removing it would hide that the pipeline was self-tested before it was scaled. Banner added above §1, per-section markers on §1 and §3. **The transferable rule: a supersession marker belongs in the SUPERSEDED text, not in the superseding text.** Every reader of the stale section is exactly the reader who will not see it otherwise |
| **THE RELOCATION LEVER IS CURRENTLY DISCONNECTED — `declaration.tex` says the opposite of the supervisor's ruling** | Phuong's 8C-7 ruling is that *"appendices and references do not count toward the 20,000, confirmed by my supervisor"*. **`declaration.tex` states, in the document: *"This thesis does not exceed the maximum permitted word length of 20,000 words INCLUDING APPENDICES and footnotes, but excluding the bibliography."*** and prints `\quickwordcount{main}` beside it, which runs `texcount -0 -sum -merge main.tex` and **counts the appendices exactly as the sentence says**. It currently resolves to **32,208**. Two consequences: (1) under the declaration as written, relocating a paragraph from `chapters/` to `appendix/` changes the declared number by **zero**, so every item on the candidate list is an accounting exercise; (2) the declaration is **self-refuting on its own line** — it declares compliance with 20,000 and prints 32,208 next to the claim. **Deliberately NOT edited**: amending the terms of a signed academic declaration is not an agent's call. **Owner: Phuong, and it is the precondition for the whole relocation pass.** See `ledger/relocation_candidates.md` §0 |
| **Six-chapter position after 8C-7, and the two instruments disagree by ~970** | `wordcount.py` marker: Ch1 **2,023** · Ch2 **4,938** · Ch3 **5,569** · Ch4 **7,701** · Ch5 **4,920** · Ch6 **2,328** · abstract **300** = **27,779**. `texcount` (what the declaration prints): chapters **28,429** + abstract **321** = **28,750**, appendices **3,355**, whole document less bibliography **32,208**. The gap is captions, which `wordcount.py` charges to a separate all-chapter line (901) and `texcount` charges to the body. **`texcount` is the binding number, because it is the one printed on the declaration page.** Ch 5 moved 4,870 → 4,920 this session on the "to a thousandth" repair: **measurement replacing assertion costing words, for the sixth recorded time** |
| **The relocation candidate list is PREPARED and NOT EXECUTED, and it does not reach 20,000** | `ledger/relocation_candidates.md`, built 2026-08-09 under item 6. Per chapter, each item with what it is, why the body does not need it inline, what the body retains, its measured marker cost, and available-or-protected. **Defensible total ≈4,695 against a 7,779 gap — roughly 60 per cent.** Reported rather than padded: the list could be made to sum only by moving reconciled measurement, which the brief rules out in the same sentence that authorises the lever. **Protected, with reasons:** the four-limb reconciliation (~1,973), `sec:res-traded` (373, the precedent already ruled against), RQ2's unbiasedness null (294), C2's weather and pooling evidence (841), the MCS and origin-count sections that discharge D7 (553), 5.1 (R8), 5.4 (§4.5 rules it the one section that grows), and Ch 6's 6.2. **Highest single yield is `discussion.tex` 5.3 ¶2 at 394**, which restates Ch 4's paired standard errors. **Phuong rules item by item, as with S-4** |
| **A note on what §4.5's "Displaced:" entries are, because they read like an offer and are not** | They record displacements **already executed during composition**, not remaining options. Every chapter is at a floor that has absorbed them. So every candidate on the relocation list is a **second-order cut against a considered decision**, which is why the available total is smaller than the overrun and why the protected column is long |

### Tier-3 items — verifiable only on Overleaf, not unchecked

The assertion boundary in `PRJ93_RULES.md` has three tiers: generator, local compile,
Overleaf. These two sit in tier 3 and **cannot be closed from here**. They are open items with
a named owner and a named action, not gaps.

#### T3-1 — Overleaf's TeX Live year is unknown

- **Why it cannot be read from here.** The MCP bridge exposes only file read/write
  (`list_files`, `read_file`, `get_sections`, `status_summary`) — **no settings tool** — and
  the year is not stored anywhere in the git repo.
- **Local is TeX Live 2026** (`scheme-full`, `~/texlive/2026`).
- **Action, owner Phuong:** read Menu → Settings → TeX Live version in the Overleaf UI and
  record it here.
- **What binds until then:** `PRJ93_RULES.md` § "Compile and push", clause 4 — tier-2/tier-3
  agreement is **UNVERIFIED**, so no local compile result may be stated as a claim about the
  target render. Write "compiles under TeX Live 2026 locally", never "compiles".
- **Why it matters rather than being pedantry:** this project has already been bitten by an
  environment split of exactly this shape — numpy 1.26 against 2.5, `log/78`.

#### T3-2 — the title page is not locally verifiable

- `title_page.tex` line 7 calls `\includesvg[scale=0.6]{figures/lu-logo.svg}`. The `svg`
  package shells out to **Inkscape, which is not installed locally**, so the local build
  routes through a **scratch-only `svg.sty` stub** that draws a placeholder box.
- **Everything downstream of the title page IS locally verified.** The title page itself is
  **not**, and no local run may be reported as covering it.
- **This is a standing tier-3-only item, not a defect and not an omission.** Overleaf has
  Inkscape, so the target render is expected to be correct; "expected" is the operative word
  until someone looks at page i of the Overleaf PDF.
- **Closing it would require** installing Inkscape locally, which buys one page of coverage —
  not obviously worth it while tier 3 is a browser tab away.

### 8C-3 input — the caption short-title deliverable · **DISCHARGED 2026-08-07**

> **Closed.** All nine surviving body floats carry a `\caption[short]{short. body}` at the 15/45
> rule, and the four demoted to Appendix ~~E~~ **D** plus `tab:window` in Appendix ~~D~~ **C**
> carry them too. *(Letters corrected 2026-08-09 and verified on the build: `tab:ladder` is
> **D.1**, `tab:window` is **C.1**. Both were written before `4e2d209` removed the template
> stub, so BOTH shift by one, not only the E.)*
> Measured on the build: the **224.47 pt overfull vbox in `main.lot` is gone**, the List of
> Tables is **30 entries** against six pages, and the document's largest overfull box is now
> `search_screening_body.tex` at 182.80 pt. Chapter-4 caption words fell **1,537 → 619**.
> The section below is kept for the specification it records.

**This is a named deliverable of 8C-3, not a compile byproduct.** It is recorded here because
it was found by the first document compile and would otherwise live only in a log.

**The defect.** `chapters/results.tex` carries **17 `\caption` commands and zero
`\caption[short]{long}`**. Every Chapter-4 float therefore prints its entire multi-sentence
caption into the List of Tables and List of Figures, which:

- runs the **List of Tables to six pages** (PDF pages 8–13), and
- produces the document's largest overfull box, a **224.47 pt overfull vbox in `main.lot`**,
  plus most of its underfull vboxes.

The six short titles written for the methodology, literature-review and appendix floats all
work correctly and none split at the wrong point, so the pattern is proven — it simply was
never applied to Results.

**The count is NOT 17. Nine body floats survive.** Verified against `results.tex`, not
inferred: all 17 labels enumerated, and all eight named for removal confirmed present exactly
once.

| | Floats | Disposition |
|---|---|---|
| Demoted to appendices | `tab:ladder`, `tab:bootstrap`, `tab:recon-decomp`, `tab:native-interval`, `tab:window` | **5** |
| Absorbed into prose | `tab:folds`, `tab:occurrence`, `tab:injection` | **3** |
| **Surviving body floats** | `fig:ladder`, `tab:mcs`, `tab:intermittency`, `tab:group`, `tab:weather`, `tab:coverage`, `tab:exchangeability`, `tab:winkler`, `tab:vuspr` | **9** — 8 tables + 1 figure |

**What 8C-3 writes:** a short title at the **15/45 rule** via `\caption[short]{short. body}`
for **each of the 9 surviving body floats** — the short title repeated as the opening sentence
of the body so the list entry and the caption's first clause do not drift apart.

> **Related obligation, deliberately not folded into the 9.** The 5 floats demoted to
> appendices still print into the LoT/LoF from wherever they land, so they need short titles
> too — but under the appendix's float programme, not Results'. Tracked here so the count
> "9" is not later mistaken for "all captions needing work".

Mirrored in `knowledge/05_paper_architecture.md` § Results.

### The register of other state stores — ruled 2026-08-07

**This file is the single retrieval point, and that obligation is to point at every store,
not to hold every row.** Rows are not migrated here: two copies of a row drift, and the
owning file is where the detail belongs. What §F owes a reader is the guarantee that reading
it reveals what exists.

| Store | Owns | Status as of 2026-08-07 |
|---|---|---|
| `knowledge/07_figure_programme.md` §4 | Float blockers **B0–B7** — the numbers and sources a float may not be built without | **All eight closed.** Verified against the live `results.tex` and against `log/76`/`log/77`, not against the table, which was stale on seven rows. Correction appended there |
| `knowledge/07_figure_programme.md` §8 | Run list **R0–R4**, presented under the rerun gate | All five run. R0 → `log/76`; R1, R2, R4 → `log/77`; R3 → `log/76` §11 (`eval/agent_eval.json` created) |
| `ledger/numbers_audit.md` | MISMATCH / STALE / UNTRACEABLE verdicts on every number in two chapters | Resolutions in `numbers_audit_resolutions.md`; the 2026-08-06 addendum closes the two floats the audit never covered. **Three items are explicitly handed to other ledgers and are not tracked here** — see §"Three items for other ledgers", of which the `select_sba` code/chapter direction conflict is live |
| `ledger/code_vs_paper.md` | Released-code comparison rows **M1–M24+** | Consulted by `07` §4; no independent open list |
| `ledger/literature_conformance.md` | SHOULD-FIX conformance rows | Summarised by the first row of the table above — this one *is* already reachable from §F |
| `knowledge/05_paper_architecture.md` §7 | Approvals **A1–A17** and the items-reopened **U-rows** | Closed document; reopened only by a U-row |

**Why the ruling was needed.** `07` §4 held four rows recorded as open, and a session
following the stated retrieval discipline exactly would not have learned they existed. It
turned out they were all closed, so the cost was the opposite of the one feared — a
carry-forward that told the next session to re-raise work already done. A store nobody
points at goes wrong in both directions.

> **Namespace hazard, and it is one this file created.** `background_argument_skeleton.md`'s
> arguments were renamed A1–A16 → **B1–B16** on 2026-08-07 to escape a four-way `A`
> collision. `B` was not free: `07` §4's float blockers are **B0–B7**, and two more files use
> `B`-prefixed ids for critique-round findings (`background_rewrite_critique.md` B1–B5,
> `methodology_rewrite_critique.md` B1–B4). For one day this section used **B1, B3 and B6 in
> two different senses about forty lines apart**. Fixed below by never writing a bare `B`-id:
> every one now carries its owner. The collision is retiring on its own as `07` §4 closes,
> and renaming a dead namespace would be churn — but the lesson is not: **a rename escapes a
> collision only if the destination was checked, and it was not.**

### The three self-closable rows

None is blocked on anyone. S-1 was opened by the Chapter 2 composition, S-3 by Chapter 3's. S-2
is struck: it was closed before it was last read, and the strike is kept rather than deleted so
the correction is visible. The reasoning is in `phase_state.md` (entries of 2026-08-07) and in
the argument skeletons.

> **Namespace note, applied 2026-08-07.** `background_argument_skeleton.md`'s arguments were
> renamed **A1–A16 → B1–B16** because three other live namespaces use `A`: approval rows
> (`05_paper_architecture.md` §7), appendix floats (`07_figure_programme.md` §3, `A-F1…A-F7`),
> and July's citation-audit exception ids in `phase_state.md`. Methods' skeleton is `M1–M14`.
> Rows below use the new `B` ids. `phase_state.md` is append-only and still carries the old
> `A` ids in its 2026-08-07 entries; a correction entry there points here.

| # | Row | What closes it |
|---|---|---|
| **S-1** | **Chapter 2 is 948 words over its 4,000 budget (4,948, provisional).** Held, not accepted — a 24 % overrun repeated across six chapters lands the document near 24,800 against HC1's 20,000. *(Corrected from 4,893/893 on 2026-08-07: the counter mis-stripped escaped `\%`. Use `brain/scripts/wordcount.py`.)* | **The boundary check is RUN and the answer is (c).** Not "Methods can carry them", not "Methods cannot" — **Methods can and is itself over budget**, so relocation moved the overrun rather than resolving it. The two derivations answered **differently**, which is the evidence the boundary rule was applied rather than assumed: **background argument B3** (median-versus-mean functional argument) **stays in Chapter 2** — it is a claim about where two literatures stop, which is Chapter 2's job by definition; Methods 3.2 cites it and spends ~60 words on the application to Ellel's revenue estimand, which R84 requires there anyway. Chapter 2 saves **nothing** from it. **Background argument B6** (recorded-regime extension) **moves to Methods 3.7**, where it already lived in the superseded prose and where it carries its limit and the D-D4 three-way attribution that Chapter 2 cannot hold; Chapter 2 keeps a ~25-word limb sentence for gap limb 4. Net **−85 to Chapter 2**, taking the overrun to ~863. **What closes S-1 is now budget reallocation, and that is deliberately not decided yet** — see S-3. |
| ~~**S-2**~~ | ~~`\ref{app:search}` is plain `Appendix~B` text in `literature_review.tex` §2.1.~~ | **CLOSED, and it had been closed for some time before this row was read.** Appendix B exists as `\chapter{Corpus search and screening}` in `main.tex`, `\label{app:search}` is defined at `appendix/search_screening.tex:15`, and `literature_review.tex:26` reads `Appendix~\ref{app:search}` — not plain text. Found 2026-08-07 by 8C-3 when it was told to *create* Appendix B on the strength of this row. **Creating it would have added a second `\chapter` inside `\begin{appendices}` and relettered C, D and E, silently invalidating every by-letter appendix reference in Chapters 2 and 3** — a document-wide failure with no `??` to reveal it, which is the exact hazard `main.tex:254` warns about. The lesson is the one the register below carries: a row asserting something is missing is checked against a **build**, not against another row. |
| ~~**S-3**~~ | ~~**Chapter 3 is 1,326 words over its 4,200 budget (5,526 marker-equivalent, 5,618 raw), pushed 2026-08-07.** Held PROVISIONAL on the same terms as S-1, and for the same reason: an unmarked overrun compounds. **This is a measured floor, not a first draft** — the smallest count at which every criterion named against the chapter in `05_paper_architecture.md` §5 is still met, reached after two compression passes and five critique rounds. Worst sections: **3.7** 740 against 440 (carries RQ4's whole methodological premise plus D-D4 plus R69/R70/R71/D3/D6), **3.2** 707 against 640 (the §2.8a mandatory six-item ordering), **3.3** 477 against 390. Only 3.5 lands near budget.~~ **CLOSED AS SUPERSEDED 2026-08-08 by Phuong's ruling. Do not reallocate.** The deferral condition was met, and the answer is that **reallocation is the wrong instrument.** Two findings retire it. (1) `00_marking_criteria.md`:411–414 records the guidance stating explicitly that *"there is no word count for each section"* and that section balance is agreed with the supervisor, so §2.1's per-chapter budgets are **this project's own allocation under A10, not a rubric requirement** — reallocation was solving a self-imposed problem. Only **HC1's 20,000 total** is mechanical, and the real number is **~24,150 against 20,000**. (2) The overrun is **duplicated statistical disclosure, not padding**, so moving words between chapters closes none of the 4,150. **What replaces it: a cross-chapter de-duplication pass** (row **S-4** below), stating each argument once where the number is first reported and citing it from the other chapter. Phuong's prior: Chapter 4 keeps the number and the measurement, Chapter 5 keeps the interpretation and cites back, decided per item. The measured floors stay recorded above as history; they are no longer held against per-section budgets. | ~~**Budget reallocation — and it is deliberately NOT decided yet.** Two floors are not enough to decide on. **Results is the chapter that determines whether there is anything to reallocate**: 14,580 against 5,200, and the only chapter where large compression is genuinely plausible, since thirty sections of run narrative collapse into five. Ruling now risks handing Methods words that Results needs more. **Measure Results first**; that puts 32,510 of the current 37,471 measured. Do not quote 4,948 or 5,526 as final in the interim. **UPDATE 2026-08-08, 8C-4 — the precondition is DISCHARGED and this row is now decidable.** Results measured at **6,247** and Discussion at **4,646**, so the deferral's own condition ("Results is the chapter that determines whether there is anything to reallocate") is met, and the answer is that there is **less than hoped**: Results compressed 14,580 → 6,247, a 2.3:1 ratio against the 2.8:1 the budget implied, and it is already a floor. Four chapters now measure **21,357 against 15,800**. The projection is **~24,150 against HC1's 20,000** — the same figure S-1 warned about, now measured rather than extrapolated. **Two things changed the shape of the question.** (1) `00_marking_criteria.md`:411–414 records the guidance stating explicitly that *"there is no word count for each section"* and that section balance is agreed with the supervisor: the §2.1 budgets are **this project's own allocation (A10), not a rubric requirement**, so only HC1's 20,000 total is mechanical. (2) The overruns are not padding but **duplicated statistical disclosure** — the same non-separation, numerics-sensitivity and pairing arguments are stated once in Chapter 4 and again in Chapter 5. **Recommendation (agent, 8C-4): move each disclosure once into Chapter 4 where the number is first reported, and have Chapter 5 cite it.** Not executed, because it edits 8C-3's approved composition. **Owner Phuong.**~~ **Ruled: do not reallocate. Superseded by S-4.** |
| **S-4** | **The document projects ~24,150 marker against HC1's 20,000, and the excess is duplicated statistical disclosure across Chapters 4 and 5.** The same non-separation, numerics-sensitivity and pairing arguments are each stated once where the number is reported and again where it is interpreted. Replaces S-3: the constraint is the 20,000 total, which is mechanical, and not the per-section budgets, which are this project's own. | **A cross-chapter de-duplication pass, as its own gated session.** It edits approved compositions in Chapters 4 and 5, so the item list plus per-item word costs goes to Phuong **before** anything is applied. Phuong's prior, to be tested per item: **Chapter 4 keeps the number and the measurement, Chapter 5 keeps the interpretation and cites back** — some items will go the other way. **Ordering is not free** (see the sequencing note below): `role_audit_ch4_ch5.md` X1 is a live contradiction between the two chapters about the same number, and SKILL.md §5 makes it *"Blocking. Resolve before any other revision."* De-duplicating a disclosure whose two copies disagree would preserve whichever copy the pass happened to keep. **X1 first, then Chapter 4's numeric repairs, then de-duplication.** H11, H13 and H8 fold into this session, all three touching material the pass handles. **CONSTRAINT ADDED 2026-08-08 — qualifiers are protected, not trimmed.** Four instances are now on record of a length pass widening a claim by deleting the clause that scoped it, the last of them in the abstract, where cutting one word from *"the only weather contrast excluding zero"* made the sentence false. A qualifier is grammatically optional and semantically load-bearing, so **no instrument in this project can see the damage** — the compile passes, the count improves, `completenesscheck` sees prose above the floor. S-4 is a length pass across four chapters and is therefore this failure's largest available surface. The pass reads each surviving sentence whole and asks what it now asserts; where that is broader than the evidence, the words go back and the length is found elsewhere. See `PRJ93_RULES.md`, *Compression is not allowed to touch a qualification*. **The `sec:res-traded` relocation row above is settled and is not reopened by this pass.** |

---

### Sequencing note — what must happen before the de-duplication pass, and why

Ruled 2026-08-08. **The de-duplication pass is not the next action, and the reason is a constraint
the pass itself creates.**

De-duplication decides, for each duplicated disclosure, which chapter keeps it. That decision is
only safe when both copies say the same thing. **They do not.** `role_audit_ch4_ch5.md` X1 records
`results.tex`:693–695 saying a numpy regeneration leaves every Winkler mean *"identical"* while
`discussion.tex`:277–280 says coverage figures shift and the largest Winkler movement is 25 points
on 1814. `log/78` Part 2 and `interval_calibration_L1.json` support the Discussion; **Chapter 4 is
the false copy.** A de-duplication pass run first would resolve that by whichever copy it chose to
keep, and would have a fifty per cent chance of promoting the false one into the sole surviving
statement. SKILL.md §5 already forbids this ordering for its own reason: *"Contradiction · Blocking.
Resolve before any other revision — a contradiction is worse than either version alone."*

**The order, therefore:**

1. **X1**, and any other cross-chapter contradiction found with it. Mandated first by §5.
2. **Chapter 4's numeric repairs.** T1, T2 and T3 fail on it, and `role_audit_ch4_ch5.md` carries
   26 blocking findings against it — including a fold-count-to-venue mis-mapping, a per-venue
   oracle-tuned column presented against an untuned one, a 41-way uncorrected multiplicity, and
   four floats with no uncertainty at all. A de-duplication pass that hands Chapter 4 custody of
   *"the number and the measurement"* is handing custody to the chapter that currently has the
   wrong numbers.
3. **T8 for Chapter 4.** `source_claim_verification.md` discharged it for Chapter 5 only, and V4
   already shows one `lu_proactive_2024` over-claim in the unswept set.
4. **The de-duplication pass**, with its item list and word costs brought to Phuong first.

**Two items sit outside this chain and are cheap.** The unwritten `abstract.tex` on `origin/main`
needs no other work to precede it. And the H12-1 repair needs a bibliography entry for Vovk,
Gammerman & Shafer (2005), which is a reference-list change and is best made once, before either
chapter's prose is touched.

---

### What 8C-3 (Results) inherits — recorded 2026-08-07, not in the 8C template

Two items, plus a correction to how they were handed over.

1. **Report the floor in `Raw / Artefact / Marker` form.** `brain/scripts/wordcount.py` now
   emits all three, so Results' floor is comparable with Methods' **5,618 raw / 92 artefact /
   ~~5,526~~ 5,569 marker** *(marker corrected 2026-08-09; the 5,526 predates `12f8cc7`)*.
   Quote **Marker** against the 5,200 budget; compare revisions on **Raw**,
   where the artefact cancels. Results is equation-light, so its artefact will be small and
   almost all label keys — do not assume Methods' 92 transfers.

2. **The float exposures 4.1 and 4.3 must meet while composing, rather than leave to 8D.**
   The hand-off named `tab:vuspr`, `tab:group` and `tab:weather` as carrying "the
   unstamped-MCS exposure". **Verified against the owning files, and it resolves into three
   different exposures on three different floats — they are not one item:**

   | Float | Section | Actual exposure | Owner |
   |---|---|---|---|
   | `tab:mcs` | **4.1** | **W2, the unstamped-MCS exposure proper.** It is an MCS too, so a perturbation too small to move a point estimate can still cross α and delete a set member. `eval/mcs_L1_results.json` carries **no provenance stamp**; testing it means regenerating the ladder, which is out of scope. **The gap stays open and is not to be closed by assertion** — if 4.1 states ladder set membership as a finding, say in a clause that W1 applies to it by construction. | `05` §2.7b |
   | `tab:group` | **4.3** | **Figure blocker B1 — CLOSED, and the correction is already live.** *"Roughly £40"* was untraceable; `results.tex` now carries £9.99 and £10.94 per origin at the Beer Hall, £4.27 and £4.68 at Ellel, £5.84 at Two River Taps, reaching £185 at the widest single origin. **8C-3 must carry these forward** — it recomposes from evidence, so an applied correction living only in the superseded prose is a correction it can silently undo | `07` §4; `blocker_clearance_package.md` |
   | `tab:weather` | **4.3** | **Figure blocker B3 — CLOSED by measurement.** `log/77` verified `eval/weather_basis_L1.json` is post-M24 *and* post-Gate-A, with an independent cross-check. Nothing to confirm while composing | `log/77`; `code_vs_paper.md` M24 |
   | `tab:vuspr` | **4.5, not 4.1 or 4.3** | **Audited after all.** It postdated the numbers audit and was recorded as a known unknown; `numbers_audit.md`'s ADDENDUM 2026-08-06 audits it against the R0-regenerated source. `07` §4's *"never been audited"* sentence stood for a day after the audit that answered it | `numbers_audit.md` |

   `tab:exchangeability` (4.4) was audited in the same addendum.

3. **Two body corrections are live on Overleaf and are not in any skeleton.** Figure blockers
   **B2** and **B5** were applied on 2026-08-07 and 8C-3 will meet neither unless it looks:
   `sec:res-power` states *"No achieved power or minimum detectable effect is quoted anywhere
   in this chapter, and the omission is deliberate"* — a justified decision replacing a
   removed column, and the kind of sentence a recomposition drops as unnecessary; and
   `tab:mcs`'s caption carries seed 93, $B = 1000$, block length 7 and the common-fold
   caveat. **Figure blocker B4** is discharged twice over — applied to `results.tex`, and
   re-shipped in 8C-2's `tab:bases`.

4. ~~**Five dangling cross-references, and 8C-3 owns two of them.**~~ **CORRECTED 2026-08-07
   against a build. There were two, not five, and this register was wrong on three rows.**

   The register was assembled by reading files. A `latexcheck` run on the pre-8C-3 state
   reported **exactly two** undefined references. The three rows below that claimed to dangle
   had already been placed by 8C-F, and the register was never re-read against a compile.

   | Reference | Register said | Build said | Now |
   |---|---|---|---|
   | `tab:mcs-config` | dangles; "Appendix C does not exist" | **dangled** | **Closed.** Appendix C *does* exist (`\chapter{Method specifications and pseudocode}`, `\label{app:pseudocode}`). The float genuinely had no body anywhere; 8C-3 authored it from `eval/mcs_L1_results.json` |
   | `fig:nulls` | dangles | **dangled** | **Closed.** F7 placed in Results 4.3 at first reference |
   | `fig:blocks` | "never compiled, never inserted" | **resolved** | Placed by 8C-F. Register stale |
   | `fig:pipeline` | "never compiled, never inserted" | **resolved** | Placed by 8C-F. Register stale |
   | `fig:origins` | "lives in Appendix C, which does not exist" | **resolved** | `\label{fig:origins}` at `appendix/pseudocode.tex:60`. Register stale on both halves |

   **The transferable failure.** Three rows asserted a reference was broken, and a build would
   have contradicted all three in seconds. A dangling reference is the one class of defect that
   is *free* to check — it prints `??` and `latexcheck` names it by label — so a register of
   them that is maintained by hand is strictly worse than the compile that supersedes it.
   **This register is retired.** The row in the §F table above is now sourced from the build,
   and any future claim that a reference dangles is checked by running `latexcheck` first.

   **Two new ones were created and closed in the same session, and they are not in this table
   because they never reached a build.** `conclusion.tex` referenced `sec:res-agent` and
   `sec:res-pattern`; approval A5 relocates both sections out of Results, so 8C-3 converted both
   to plain text with the owner recorded at each site. **Owner: 8C-4/8C-5**, which must restore
   a `\ref` once Discussion 5.3 and 5.4 exist as labelled sections. The same applies to §2.7b's
   W3 forward clause in Results 4.1, which is prose without a `\ref` for the same reason.

5. **The floor is not the only thing unmeasured, and the deficit runs the other way.**
   `chapters/introduction.tex` is an **empty template stub** — Chapter 1 is 0 words against a
   1,400 budget. `chapters/conclusion.tex` is composed, substantial, and shaped to a
   *five-chapter* document that predates the approved tree: it carries the Discussion's
   "Divergences from the reviewed literature" and "Limitations" material inside a chapter
   budgeted as Conclusions, and `main.tex` has no `\chapter{Discussion}` at all. Both bear on
   the reallocation question that S-3 defers, and both push it the same way: there is a real
   1,400-word hole to fund before any of Methods' or Chapter 2's overrun is forgiven.

6. **Two artefacts feeding 4.3 carry no provenance stamp, and the sweep recorded them as
   stamped.** `eval/chronos2_covariate_probe.json` and `eval/group_icl_calibration.json` are
   listed in `log/76` §2 Tier 1 under *"every one carries `store_ceiling = 2026-07-07`"*.
   Read directly, neither carries a `store_ceiling`, a `provenance` block, or any generation
   stamp. They belong in Tier 3, unstamped and therefore unverifiable, so the sweep's Tier 1
   is 18 of 22 and its Tier 3 is 10. The covariate probe carries `mcs_pvalue`, `set_90` and
   `mean_loss` for the Chronos-2 exogenous arms; the calibration file carries the batch-size
   timings behind the batch-merge probe. **This is a known unknown, not a defect** — the same
   status `tab:vuspr` held before its addendum. Regenerating them is a run decision and has
   not been taken.

---

## G · Zotero — RESOLVED 2026-08-06, with one caveat

Credentials supplied and written to `~/.claude.json` at `mcpServers.zotero.env`
(`ZOTERO_API_KEY`, `ZOTERO_LIBRARY_ID=20198714`, `ZOTERO_LIBRARY_TYPE=user`;
`ZOTERO_LOCAL` left at `true`, since local + key + id is what the server calls hybrid mode).
A timestamped backup of the config was taken first.

**Caveat: the MCP server reads its env at process start, so the `mcp__zotero__*` write tools
still fail in THIS session.** They will work from the next session. The three fixes were
therefore applied directly against the Zotero Web API and are already live:

| Item | Action | Result |
|---|---|---|
| ~~`K73XDLEQ`~~ **`8UI7QJCU`** Ye et al. | **`K73XDLEQ` turned out to be a TRASHED DUPLICATE.** The live record `8UI7QJCU` already carried the full title, date 2025 and the NeurIPS `proceedingsTitle`; only the pinned citation key was missing, and it has been added. The trashed duplicate has been de-keyed so BBT cannot resolve to it | verified on read-back |
| `665AJ6CH` Hoo et al. | Extra records the cited version (v4, 2026-01-26) against the Jan-2025 arXiv id; `Citation Key: hoo_tables_2026` | HTTP 204, verified |
| `KG8QMUJV` Judd et al. | **created**, journalArticle, J. Applied Statistics 53(2) 372–390, doi 10.1080/02664763.2025.2519136, CC BY 4.0, `Citation Key: judd_forecasting_2025` | HTTP 200, verified |

Citation keys are pinned in BOTH the native `citationKey` field and an Extra
`Citation Key:` line, so a Better BibTeX re-export now reproduces the keys the chapters
use instead of clobbering them. **The ref.bib fixes are no longer at risk from a re-export.**

**Semantic search database: DONE**, via the CLI rather than the MCP tool, so it did not have
to wait for a restart:
`zotero-mcp update-db` with the env exported inline. 20 changed items processed, 17 added,
3 updated, 0 errors, 1 stale document deleted. Index went 105 → **121 documents against 121
top-level items, i.e. full coverage** (the API's 322 counts attachments and notes, which are
not indexed as documents). All four TabPFN-era items appear by name in the indexing log.
Note `zotero-mcp db-inspect` lists only 20 of 121, so a grep over its output is not evidence
of absence.

Next session, one check only: confirm `mcp__zotero__zotero_update_item` now succeeds. The
config is correct and verified; it is the running MCP process that holds the stale env.
**Still unrun as of 2026-08-07** — the Chapter 2 session needed no Zotero write, so the check
had no natural occasion. Not counted in §F because it verifies a fix already applied and
read-back-verified, not outstanding work.

**`zotero_search_by_citation_key` returns false negatives — found 2026-08-07.** In hybrid
mode it resolves a key only by scanning `Extra` for a `Citation Key:` line, so it finds
**only** the keys pinned by hand in the repair above and returns "No item found" for every
other item, present or not. Four live keys came back null in one session —
`montero-manso_principles_2021`, `fu_prism_2026`, `meyer_conceptual_2004`,
`hewamalage_forecast_2023` — and all four were confirmed present by `zotero_search_items`
title lookup. **A null from that tool is not evidence of absence**, and a clean sweep with it
proves only that the pinned subset is pinned. The rule is in `PRJ93_RULES.md` under
Verification rules. `citation_audit.md` was checked against this and is unaffected: its
MISSING-KEY verdict is defined against `ref.bib`, not the library, and no verdict in that
file was produced by this tool.

### Zotero hygiene, checked 2026-08-06

121 live top-level items, 23 trashed. The trash holds **five** captures of the Ye paper, which
is how the duplicate above was mistaken for the real record.

**Trap to avoid repeating:** `zotero_search_items` returns items even when they are trashed.
An item key taken from a search result must have its `deleted` flag checked before it is
edited. The raw Web API does not volunteer trashed status unless the field is inspected.

Six trashed items have no live counterpart by title and **none breaks a citation**: three are
duplicate captures of Hyndman's *Forecasting: Principles and Practice* (live `K45PBRM3`), one
is a webpage variant of CART (live book `54Z6YNAL`), one is *Algorithmic Learning in a Random
World* which the chapters never cite, and one is an unrelated stray capture. **No citation in
any chapter is backed only by a trashed item.**

**Security note.** The API key was pasted into a chat transcript, which is stored in plain
text under `~/.claude/projects/`. It grants library and file write on the user library and
all groups. Rotate it at zotero.org/settings/keys when convenient and update
`~/.claude.json`; nothing in the project depends on that specific key.

### Two papers deliberately NOT cited, so they are not rediscovered

Both are on-topic for the weather channel and both are **closed access with no repository
full text** (OpenAlex `any_repository_has_fulltext: false`), so neither can enter NotebookLM
and the no-claim-without-a-NotebookLM-query rule forbids citing them from an abstract:

- Bujisic, Bogicevic, Parsa, *The effect of weather factors on restaurant sales*,
  J. Foodservice Business Research 20(3) 350–370, doi `10.1080/15378020.2016.1209723`.
- Badorf and Hoberg, *The impact of daily weather on retail sales*,
  J. Retailing and Consumer Services 52:101921, doi `10.1016/j.jretconser.2019.101921`.

If institutional access appears, these are worth adding: they are the two daily-resolution
weather-and-sales studies the hospitality argument currently lacks.
