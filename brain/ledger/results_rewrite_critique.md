# Results rewrite — critique log, 8C-3, 2026-08-07

Five rounds: the three standing roles plus the two named for this phase. Each round names what it
found, what was changed, and what it deliberately left.

---

## Round A — rubric coverage (`00_marking_criteria.md`, `05` §5)

**Found.**

- **A1. RQ2's classification limb did not reach its question.** `sec:res-intermittency` reported
  the reclassification and stopped, so the paragraph was two descriptive sentences and one
  judgement with no bearing on whether the demand structure admits the estimand. **Fixed:** the
  boundary-effect sentence now says what the verdict routes, and that both readings of a demand
  day agree so nothing turns on the definition. Net cost 34 words, paid for out of the same
  paragraph.
- **A2. Every RQ has a section and every section has an RQ.** Checked against
  `06_research_questions.md` §3: 4.1→RQ1, 4.2→RQ2, 4.3→RQ3, 4.4→RQ4, 4.5→RQ5.
  `sec:res-chatlog` answers none and is reported as the second signal reaching the output under
  approval **A17**, not flagged and not given a constructed question.
- **A3. No result answering no question survived by accident.** `sec:res-agent` and
  `sec:res-pattern` left the chapter under §3.4. See Round C for what that broke.

## Round B — numbers and traceability

**Found.**

- **B1. `tab:mcs` verified cell by cell against `eval/mcs_L1_results.json`, not against the
  superseded chapter.** Set sizes 5/9, 4/9, 6/9 and MCS $p$ of $0.990$, $0.220$, $0.912$ all
  reproduce. So do the two claims resting on the secondary level: the Two River Taps
  $\alpha = 0.25$ set is exactly the three foundation arms, and the same rung *is* retained at
  $\alpha = 0.25$ under the secondary absolute-error loss.
- **B2. `blocker_clearance_package.md` B5 is wrong on one row, and the error was about to be
  copied into a new float.** B5 states that "the n actually used at Ellel is not 260". Read from
  the artefact, `common_fold.n_folds` is **273, 260 and 205 — identical to the headline origin
  counts at all three venues**, Ellel included. The restriction is real as a mechanism and binds
  nothing at these settings. `tab:mcs-config` states it as a fact about the procedure, with the
  correction appended in a comment beside it rather than applied silently.
- **B3. Every number in the chapter carries a `% Trace:` comment naming its result file.**
  Sixteen trace comments across five sections.
- **B4. The three unstamped-artefact exposures were met while composing, not deferred.** `tab:mcs`
  carries the W2 clause in 4.1; `tab:group` carries the B1-cleared per-origin figures
  (£9.99, £10.94, £185, £4.27, £4.68, £5.84) rather than the untraceable "roughly £40";
  `tab:weather` needed nothing, `log/77` having verified its artefact post-M24 and post-Gate-A.

## Round C — structure and the Results/Discussion boundary

**Found.**

- **C1. The approved relocations break two live cross-references, and nothing in the hand-off
  said so.** `conclusion.tex` referenced `sec:res-agent` and `sec:res-pattern`; §3.4 moves both
  out of Results. Both were converted to plain text with a comment naming the owner (8C-6/7) and
  the section that will carry the label. **Ten other external references were preserved by
  holding the original `sec:res-*` label on the renamed subsection** rather than minting new ones.
- **C2. Interpretation stayed out.** The reading of *why* the ranking reversal runs against the
  cited work, and the four-withdrawn-claims pattern, are Discussion 5.2 and 5.3 and are not
  restated here. `sec:res-basis` is not restated: 4.1 cites `sec:ruler-functional` for the ruling
  and reports no basis argument of its own.
- **C3. W3 honoured, and one part of it cannot be honoured yet.** The numerics sensitivity appears
  in 4.1 as a single clause qualifying `tab:mcs` by construction, not as a second answer to RQ1.
  **The forward pointer to Discussion 5.3 is written as prose without a `\ref`**, because 5.3 does
  not exist as a labelled section and a forward reference to it would print `??`. Recorded for
  8C-6/7 rather than faked.

## Round D — knowledge-telling against critical writing (`ds-writing` §1)

The Results-chapter form of the distinction is not "add interpretation" — that would cross the
boundary Round C polices. It is that **every reported number is followed by what it licenses and
what it does not.**

**Found.**

- **D1. Sampled three subsections and labelled every sentence.** `sec:res-mcs` runs 6 descriptive
  to 5 critical; `sec:res-drift-cause` 11 to 7; `sec:res-intermittency` was **3 to 1 before A1**
  and is 4 to 2 after. The chapter is not knowledge-telling, and the one place it was is fixed.
- **D2. The critical move is doing real work, not decorating.** Four places state the narrower
  claim in place of the attractive one: the confidence sets are wide, so the served choice rests
  on cold-start capability rather than demonstrated accuracy (R2); the occurrence null is expected
  geometry rather than a measurement (R3); the post-margin coverage gain is arithmetic (R11); the
  windowed pool is not an estate-wide fix (R12).
- **D3. Left deliberately.** 4.3's weather paragraph carries three findings in three sentences and
  reads as a list. It is a list of three parallel ablation outcomes and reads worse rewritten;
  the critical work is in the paragraph after it, which is where the marginal-detection
  qualification lives.

## Round E — process reported in place of result

**Found.**

- **E1. Twenty-two em dashes against a document convention of zero.** `literature_review.tex` and
  `conclusion.tex` carry none and `methodology.tex` one; the draft carried 22. Every one in prose
  was replaced with a colon, comma, semicolon or sentence break. The single remaining `---` is the
  no-value cell in `tab:group` and is not punctuation.
- **E2. Three chronology tells removed.** "The rule *now* carries" became "the rule that replaces
  it is"; "reproduced against the figure recorded independently at an *earlier gate*" became
  "reproducing an independent measurement of the same quantity on the same corpus"; "the set is
  the claim *this work makes*" became "the set governs".
- **E3. No withdrawal of the project's own earlier claims survives.** The superseded chapter
  opened by announcing four withdrawals and used "is therefore withdrawn" three times. The
  composed chapter reports the measurements and lets them stand: the $0.996$ is described as
  available and not the figure reported, with the reason, rather than as demoted.
- **E4. No session, phase, tooling or attempt-chronology reference anywhere.** Checked by grep for
  the whole family.
- **E5. Left deliberately, and it is the closest call in this log.** `sec:res-margin` still states
  that the one-standard-error margin was specified *after* the failure it addresses was observed,
  and that its pre-registration document was committed before any implementing code existed. That
  is chronology. It stays because it is a qualification on the strength of a claim rather than a
  narrative of the work, and removing it would upgrade a narrower guarantee into a claim of
  advance registration.

---

## Compression record

| Pass | Marker words | What moved |
|---|---|---|
| Superseded chapter | 13,072 | — |
| First composition from evidence | 6,645 | Recomposed to the five-section tree; 8 floats removed by approved disposition |
| Compression pass 1 | 6,420 | Redundant qualifiers, doubled explanations |
| Compression pass 2 | 6,305 | 4.4 hardest: drift cause, native intervals, Winkler |
| Critique rounds A–E | 6,368 | A1 added 34; E1–E2 net neutral |
| **Round F displacements** | **6,247** | §4.5's five unapplied rulings |

## Round F — the displacement list in `05` §4.5 was not fully applied

**Found, and this is the round that produced the floor.** §4.5 already rules on what leaves each
over-budget section. Five of its rulings were sitting unapplied in the draft, which meant the
chapter was carrying material an approval had already removed:

| §4.5 ruling | Was | Now |
|---|---|---|
| 4.1 — "the whole of the pairing and block-length material to Appendix D" | The full retained-set-size sweep, $3,5,4,4$ / $4,6,6,5$ / $3,4,4,3$, plus the replication-count null | The one consequence that reaches a served decision (Two River Taps retained at 7 and 14, eliminated at 2 and 21) plus a pointer to Appendix D |
| 4.1 — "the hypothetical in `sec:res-mcs-functional` about how a trading Two River Taps would have been handled" | Two sentences of counterfactual management advice | Cut; the forward pointer to Further Work remains |
| 4.4 — "the implementation-correction narrative in `sec:res-winkler`" | Three departures itemised, plus the $16/3/18$-point comparison against the departing implementation | One clause naming the aggregation actually used |
| 4.4 — "the per-venue detail of `sec:res-native-interval`" | Three coverage figures and three calibration deltas inline | The worst-venue shortfall and the three orderings; per-arm detail is Appendix E |
| Methods 3.3 — "the chronology of when the margin was specified"; the *fact* survives in one clause | "specified after that failure was observed and written to a pre-registration document committed before any implementing code existed" | "pre-registered before any implementing code existed, which is a narrower guarantee ... and is not claimed as more" |

This supersedes **E5** above, which had argued for keeping the margin chronology. §4.5 had already
ruled against it and E5 was reasoning from first principles about a settled question, which is the
failure `PRJ93_RULES.md` names for 8C: re-deriving what an approval already decided. The
qualification survives; the narrative does not.
