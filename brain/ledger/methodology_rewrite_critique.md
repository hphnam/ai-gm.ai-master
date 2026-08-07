# Chapter 3 (Methods) rewrite — critique record

Five rounds over the composed draft: the three `autoresearchclaw` roles, plus the two this
phase adds — descriptive-versus-critical per `ds-writing`, and process-versus-result. Roles
were run independently over the draft and its cited result files, then synthesised. Findings
are tagged `blocking` or `advisory`.

**Outcome: 12 blocking, all fixed. 7 advisory, dispositions recorded.** No role vetoed.

---

## Round 1 — Role A, Methodologist

| # | Tag | Finding | Disposition |
|---|---|---|---|
| A1 | **blocking** | **R74 (outlier removal) was unmet by silence.** The draft stated trimming to the active span and the zero-revenue adjudication, and said nothing about outliers. On a chapter whose subject is deviation detection, silence reads as an omission rather than as a decision. | **Fixed.** 3.1 now states that no revenue observation is discarded as an outlier, with the reason: extreme days are the object of study, and removing them would remove the deviations 3.8 exists to find. That converts an unmet criterion into a justified design decision (R83). |
| A2 | **blocking** | **3.5's gate named no ruler.** "A rung is adopted only if it beats both baselines on rolling-origin error" — after 743 words establishing that the basis reverses conclusions and that Ellel has none. This is precisely the unnamed-ruler failure 3.2 exists to prevent, committed two sections later. | **Fixed.** The gate now names root mean squared scaled error at the basis ruled in 3.2, and the unscaled equivalent at Ellel. |
| A3 | **blocking** | **3.6 invited the common-fold confusion `blocker_clearance_package.md` B5 warns of.** The draft gave 273/260/205 and then said the confidence set "runs on the folds common to all nine entrants", inviting the reader to pair the two. B5: *"a reader will otherwise pair the 273/260/205 origins with an MCS that did not use all of them."* | **Fixed.** The text now says the common folds need not be the full origin counts and are recorded per venue in `tab:mcs-config`. |
| A4 | advisory | 3.3 forward-references `fig:blocks`, which sits in 3.7. | **Accepted as written.** The alternative is duplicating the partition in prose, which is the saving 3.7 exists to book. The sentence is intelligible without the figure. |
| A5 | advisory | 3.10 cites "a recorded seed" without its value. | **Accepted.** Seed and stratification are in Appendix D under A9; R68 is met by the pointer. |

## Round 2 — Role B, Statistician

| # | Tag | Finding | Disposition |
|---|---|---|---|
| B1 | **blocking** | **Venue order mismatch.** 3.1 introduces "Beer Hall, Ellel and Two River Taps"; 3.2 opened "venues trading on 1.2, 5.3 and 5.9 days a week". A reader maps positionally and attributes 1.2 days a week to the Beer Hall — the anchor venue — inverting the entire design. | **Fixed.** Reordered to 5.3, 1.2 and 5.9, with "respectively". |
| B2 | **blocking** | **`tab:bases` was referenced and never defined**, so the evidence for the chapter's most consequential ruling was asserted rather than shown. | **Fixed.** Table added in body with the 95 per cent interval, pairs and induced-MASE columns from `blocker_clearance_package.md` B4. The Ellel `calendar_lag7_active` row — 28 pairs, 65.6 per cent width — is visible, and the pairs count is emboldened. `tab:venues` was missing on the same check and is also added. |
| B3 | **blocking** | Three numbers carried no result-file trace: the 735-message corpus, the 399-day frame, and `tab:venues`'s frame lengths. | **Fixed.** Trace comments added for all three. |
| B4 | advisory | The induced-MASE pair quoted in prose (0.411 against 0.092) is stated without its intervals. | **Accepted.** The table carries them one line below, and the prose sentence already names the dispersion that matters — the 65.6 per cent width on 28 pairs. Repeating four intervals inline would cost 25 words to restate the float. |
| B5 | advisory | $\alpha = 0.25$ secondary and the exclusion of $0.05$ for want of power are not in the body. | **Accepted.** Appendix C under A9; the five values that matter are in the body per §2.7. |

## Round 3 — Role C, Claim auditor

| # | Tag | Finding | Disposition |
|---|---|---|---|
| C1 | **blocking** | **3.7 reported a result in Methods.** *"adaptive conformal inference performed worse there than the band it would have replaced"* is a finding, stated in the methods chapter, pre-empting Results 4.4. The same rule that stripped 38 PRJ93 results from Chapter 2 applies here. | **Fixed, and the warrant preserved.** The text now states that both methods were implemented and measured rather than ruled out by argument, that the served band is the one that outscored the others, and names `sec:res-winkler` as where the comparison is reported. R83 is still discharged — the design rests on a measurement — without the outcome being stated twice. |
| C2 | **blocking** | **3.11 had no forward pointer.** Every other section says where its output is reported. 3.11 serves no research question (A17) and is the one section a reader could take for an orphan. | **Fixed.** Added a pointer to `sec:res-chatlog`. Per `06_research_questions.md` §10 this is *not* flagged as a defect and no question is constructed for it. |
| C3 | advisory | Verb strength audited sentence by sentence. `entails` in 3.3 is a geometric entailment and exact; `motivates the choice and does not certify it` in 3.7 is calibrated to what `sun_conformal_2025` proves; `agree to $7.6\times10^{-5}$` is measured. | No change. |
| C4 | advisory | 3.12's closing paragraph states limitations inside Methods, which Role C's rule discourages. | **Accepted.** These are bounds on what the apparatus can establish, which is a methodological property; §5's rubric map assigns R82 to 3.12 precisely for this. |

## Round 4 — descriptive knowledge-telling against critical writing (`ds-writing`)

| # | Tag | Finding | Disposition |
|---|---|---|---|
| D1 | **blocking** | **3.5's rung enumeration was knowledge-telling.** "Rung 0 is… Rung 1 is… Rung 2 covers…" — a list of five facts with no argument, which `ds-writing` diagnoses as the classic Masters-level failure. R32 requires the specification; it does not require it to be inert. | **Fixed.** The paragraph now opens with the ladder's logic — each rung admits structure the one below cannot represent, so capacity is bought one property at a time — which makes the enumeration the evidence for a claim rather than a list. |
| D2 | **blocking** | **3.1 was nine facts in one paragraph** (export, levels, trimming, ceiling, versions, corpus, missing domains, zero days, figure) with no connective argument. | **Fixed.** Split into a provenance paragraph and a cleaning paragraph, and the missing-domains fact now carries its consequence — the system learns from two of the four specified domains — instead of being a bare absence. |
| D3 | advisory | 3.4's seven-member list has the same shape. | **Accepted.** The two paragraphs following it are wholly critical, and the list is what they argue about. |

## Round 5 — process reported rather than result

| # | Tag | Finding | Disposition |
|---|---|---|---|
| E1 | **blocking** | **"A second pipeline was built beside the first"** — project chronology, in the register the chapter is meant to have shed. | **Fixed.** Recast as a statement of what the two arms are. |
| E2 | **blocking** | **3.5 narrated an attempt.** *"was registered together with the conditions under which it would be abandoned and met one immediately"* is the chronology of a thing that did not happen. The permitted exception is a superseded approach that justifies the final one, and an aborted eleventh entrant does not justify the ladder — §2.7 sends it to Discussion 5.5 and Appendix C. | **Fixed.** Reduced to a scope statement: two entrants are specified and scored at no venue, for reasons outside the data, one being a data-egress constraint whose licensing half 6.3 carries. |
| E3 | advisory | 3.6 opens on the six-origin design. Checked: it is written as a general claim about any such design (*"is not a procedure this evidence supports"*), not as an audit of this project's own past — which is the permitted form, and it is the superseded approach that justifies the final one. | No change. |
| E4 | advisory | Swept for the four withdrawal passages the live chapter carried (the library-upgrade reversal, the $n$-against-$n-1$ audit claim, the reversed SBA inequality, the observed-first-stage claim). | **All four absent.** None was reintroduced. |

---

## Pre-flight — `humanizer` and `avoid-ai-writing`

| Pattern | Before | After | Note |
|---|---|---|---|
| Em dashes | 9 | **0** | Replaced with parentheses, colons or full stops. |
| Superficial `-ing` analysis | 3 | 3 | **False positives, inspected individually:** "by dividing the classification plane", "using the model confidence set", "using the occurrence definition". All are method descriptions, not vacuous participial commentary. |
| Negative parallelism | 0 | 0 | |
| Rule-of-three triples | 5 | 5 | **All are real enumerations** — "ordering, holding and shortage costs"; "venue, category and item level". Not rhetorical. |
| `robust` | 5 | 5 | **All technical:** the robust day-of-week baseline (a named rung), robust seasonal-trend decomposition (a named method), the "temporally robust" spirit of `xu_conformal_2021`, a robust scale estimate. Not vague praise. |
| `delve`, `crucial`, `leverage`, `showcase`, `underscore`, `comprehensive`, `holistic`, `seamless`, `realm`, `landscape`, `furthermore`, `moreover`, `it is important to note`, `not only … but also` | 0 | 0 | |

## Structural checks

- **Headings:** all twelve match `05_paper_architecture.md` §2.1 exactly. `wordcount.py` raised no tree-divergence warning in either direction.
- **Labels:** all 25 labels carried by the superseded revision are preserved, so no inbound `\ref` from `results.tex` or `conclusion.tex` breaks. The single exception is `tab:mcs-config`, which moves to Appendix C by approved decision A9. `sec:repro`, `sec:mcs`, `sec:ruler-functional` and `sec:ruler-ellel` no longer head sections and now sit on the passages carrying their content.
- **Citations:** 28 keys, every one already used by the superseded revision, so all resolve in `ref.bib`. **No new key introduced**, and none dropped that the chapter needs.
- **Preprint reliance (R67):** `stocker_gentle_2025` is a preprint and carries the "what Mondrian guarantees" limb. Flagged here for the R67 sweep; the claim it supports is a restatement of the standard split-conformal property, so the reliance is low-risk, but it is reliance.
