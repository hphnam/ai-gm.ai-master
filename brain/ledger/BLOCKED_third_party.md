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

| Quantity | Value |
|---|---|
| SHOULD-FIX conformance rows | 0 |
| Unadjudicated contradictions | 0 |
| Open rows not blocked on a third party | **3** — all self-closable, all listed below |
| DIVERGES — UNRESOLVED rows | 7, every one listed above |
| Dangling cross-references across the four chapter files | 0 |
| Chapters composed to the approved tree and pushed | **2 of 6** — Chapter 2 (8C-1), Chapter 3 (8C-2) |
| Measured word floors, both PROVISIONAL pending reallocation | Ch 2 **4,948**/4,000 · Ch 3 **5,526**/4,200 (marker-equivalent) |
| Chapters still unmeasured | 4 — Introduction, **Results**, Discussion, Conclusions |

### The three self-closable rows

None is blocked on anyone. S-1 and S-2 were opened by the Chapter 2 composition; S-3 by
Chapter 3's. The reasoning is in `phase_state.md` (entries of 2026-08-07) and in the two
argument skeletons.

> **Namespace note, applied 2026-08-07.** `background_argument_skeleton.md`'s arguments were
> renamed **A1–A16 → B1–B16** because three other live namespaces use `A`: approval rows
> (`05_paper_architecture.md` §7), appendix floats (`07_figure_programme.md` §3, `A-F1…A-F7`),
> and July's citation-audit exception ids in `phase_state.md`. Methods' skeleton is `M1–M14`.
> Rows below use the new `B` ids. `phase_state.md` is append-only and still carries the old
> `A` ids in its 2026-08-07 entries; a correction entry there points here.

| # | Row | What closes it |
|---|---|---|
| **S-1** | **Chapter 2 is 948 words over its 4,000 budget (4,948, provisional).** Held, not accepted — a 24 % overrun repeated across six chapters lands the document near 24,800 against HC1's 20,000. *(Corrected from 4,893/893 on 2026-08-07: the counter mis-stripped escaped `\%`. Use `brain/scripts/wordcount.py`.)* | **The boundary check is RUN and the answer is (c).** Not "Methods can carry them", not "Methods cannot" — **Methods can and is itself over budget**, so relocation moved the overrun rather than resolving it. The two derivations answered **differently**, which is the evidence the boundary rule was applied rather than assumed: **B3** (median-versus-mean functional argument) **stays in Chapter 2** — it is a claim about where two literatures stop, which is Chapter 2's job by definition; Methods 3.2 cites it and spends ~60 words on the application to Ellel's revenue estimand, which R84 requires there anyway. Chapter 2 saves **nothing** from B3. **B6** (recorded-regime extension) **moves to Methods 3.7**, where it already lived in the superseded prose and where it carries its limit and the D-D4 three-way attribution that Chapter 2 cannot hold; Chapter 2 keeps a ~25-word limb sentence for gap limb 4. Net **−85 to Chapter 2**, taking the overrun to ~863. **What closes S-1 is now budget reallocation, and that is deliberately not decided yet** — see S-3. |
| **S-2** | **`\ref{app:search}` is plain `Appendix~B` text in `literature_review.tex` §2.1.** Written as a ref, replaced because Appendix B does not exist and it would compile to `??`. | Writing **Appendix B**: define `\label{app:search}` there and convert the plain text back to `\ref{app:search}`. Also carries U3's two binding conditions (`05_paper_architecture.md` §7). |
| **S-3** | **Chapter 3 is 1,326 words over its 4,200 budget (5,526 marker-equivalent, 5,618 raw), pushed 2026-08-07.** Held PROVISIONAL on the same terms as S-1, and for the same reason: an unmarked overrun compounds. **This is a measured floor, not a first draft** — the smallest count at which every criterion named against the chapter in `05_paper_architecture.md` §5 is still met, reached after two compression passes and five critique rounds. Worst sections: **3.7** 740 against 440 (carries RQ4's whole methodological premise plus D-D4 plus R69/R70/R71/D3/D6), **3.2** 707 against 640 (the §2.8a mandatory six-item ordering), **3.3** 477 against 390. Only 3.5 lands near budget. | **Budget reallocation — and it is deliberately NOT decided yet.** Two floors are not enough to decide on. **Results is the chapter that determines whether there is anything to reallocate**: 14,580 against 5,200, and the only chapter where large compression is genuinely plausible, since thirty sections of run narrative collapse into five. Ruling now risks handing Methods words that Results needs more. **Measure Results first**; that puts 32,510 of the current 37,471 measured. Do not quote 4,948 or 5,526 as final in the interim. |

---

### What 8C-3 (Results) inherits — recorded 2026-08-07, not in the 8C template

Two items, plus a correction to how they were handed over.

1. **Report the floor in `Raw / Artefact / Marker` form.** `brain/scripts/wordcount.py` now
   emits all three, so Results' floor is comparable with Methods' **5,618 raw / 92 artefact /
   5,526 marker**. Quote **Marker** against the 5,200 budget; compare revisions on **Raw**,
   where the artefact cancels. Results is equation-light, so its artefact will be small and
   almost all label keys — do not assume Methods' 92 transfers.

2. **The float exposures 4.1 and 4.3 must meet while composing, rather than leave to 8D.**
   The hand-off named `tab:vuspr`, `tab:group` and `tab:weather` as carrying "the
   unstamped-MCS exposure". **Verified against the owning files, and it resolves into three
   different exposures on three different floats — they are not one item:**

   | Float | Section | Actual exposure | Owner |
   |---|---|---|---|
   | `tab:mcs` | **4.1** | **W2, the unstamped-MCS exposure proper.** It is an MCS too, so a perturbation too small to move a point estimate can still cross α and delete a set member. `eval/mcs_L1_results.json` carries **no provenance stamp**; testing it means regenerating the ladder, which is out of scope. **The gap stays open and is not to be closed by assertion** — if 4.1 states ladder set membership as a finding, say in a clause that W1 applies to it by construction. | `05` §2.7b |
   | `tab:group` | **4.3** | **B1, open.** *"roughly £40"* is untraceable; the real value is £4.27–£10.94, and the resolution is **£9.99 mean / £172 max**. Transcription from a committed artefact, no re-run. | `07` §4; values in `blocker_clearance_package.md` B1 |
   | `tab:weather` | **4.3** | **B3, closed but consequential.** Must source the **post-M24** fold grid: M24 moved every A14 MASE (1.5460 → 0.9551) when the grid widened from six folds. Confirm `eval/weather_basis_L1.json` is the post-M24 artefact before composing. | `07` §4; `code_vs_paper.md` M24 |
   | `tab:vuspr` | **4.5, not 4.1 or 4.3** | **Neither of the above.** It was introduced *after* the numbers audit and has **never been audited** — a known unknown recorded as such, which `07` §4 is explicit *"is not the same as clean"*. | `07` §4 |

   `tab:exchangeability` (4.4) carries the same never-audited status as `tab:vuspr`.

3. **B4 is discharged by 8C-2 and should not be re-raised.** The `tab:bases` dispersion
   blocker asked for the 95 % intervals, n-pairs and induced-MASE columns; they are in the
   table pushed to `chapters/methodology.tex` on 2026-08-07, with the Ellel
   `calendar_lag7_active` cell (28 pairs, 65.6 % width) emboldened and visible. **B5 remains
   open**: the seed, candidate-set size and common-fold restriction are stated in the Methods
   body, but `tab:mcs-config` itself is an Appendix C float and Appendix C does not exist yet.

> **Finding, and it is a gap in this file's own remit.** `07_figure_programme.md` §4 carries a
> **fourth state store** — a seven-row blocker table (B1–B7) whose open rows are not reflected
> here, while this file claims to be the single retrieval point. They are a different register
> from conformance rows, so §F's *"SHOULD-FIX conformance rows: 0"* is not contradicted, but a
> session reading only §F would not learn that **B1, B2, B5 and B7 are open**, B7 being an
> artefact-staleness sweep that was never run and *"potentially affects every figure"*. 8C-3
> should either fold those rows into §F or state plainly that `07` §4 owns them.

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
