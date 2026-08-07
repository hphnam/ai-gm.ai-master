# Results argument skeleton — R1–R13, 8C-3

**What this file is.** The derivations that existed only in the superseded Chapter 4 prose and
nowhere in the evidence files. A recomposition reads the result logs and rebuilds the chapter; a
derivation that lives only in the prose being replaced is silently destroyed by that process
unless it is extracted first. Numbered `R` to stay clear of the approval (`A1–A17`), background
(`B1–B16`), Methods (`M1–M14`), figure (`A-F1–A-F7`) and float-blocker (`B0–B7`) namespaces.

Each row: the derivation, whether it survives in the composed chapter, and where.

| # | Derivation | Disposition | Where in the composed chapter |
|---|---|---|---|
| **R1** | **Two rulers, deliberately.** The served model is the argument-minimum at none of three venues under the squared loss; a set selected under one ruler was never chosen to minimise the other, so the aggregate is a property of the design and not three venues disagreeing with their own served models. | **SURVIVES**, compressed from ~140 words to ~70 | 4.1, `sec:res-mcs-functional`, opening paragraph |
| **R2** | **Thirty-six contrasts.** Nine rungs generate thirty-six pairwise contrasts per venue, so naming a tournament winner without adjustment is the error the MCS prevents. Arithmetic plus the argument it licenses. | **SURVIVES**, one sentence | 4.1, `sec:res-mcs` |
| **R3** | **The occurrence gate is degenerate.** Closed weekdays are a fixed set, so $\mathrm{E}[O \mid \text{dow}] \in \{0,1\}$ and the gate reduces to a mask that is a function of a variable the baseline already carries; a null is therefore the expected geometry rather than a measurement about the venue. | **SURVIVES** in full — without it the null reads as evidence about the estate | 4.2, `sec:res-occurrence` |
| **R4** | **One mechanism, three signs.** The drift account is testable in a stronger form than one venue can supply because it predicts a *sign* at each of three, so one mechanism must produce three different answers or be abandoned. | **SURVIVES** | 4.4, `sec:res-exchangeability` |
| **R5** | **The calendar is wrong in both directions.** A day-of-week calendar standing in for occurrence can fail either way, and the estate supplies one venue of each: the Beer Hall calls 546 days closed and 94 traded; Ellel calls 1300 open and 1037 did not. Synthesis across `log/73` and `log/74`, in neither. | **SURVIVES** | 4.4, `sec:res-drift-cause` |
| **R6** | **Instrument independence.** The Ellel zero-inflation finding arrives through an apparatus sharing nothing with the conformal one — no residuals, no Mondrian partition, no exponential-smoothing point model — so it is not a property of how the band was built. | **SURVIVES**, compressed | 4.4, `sec:res-native-interval`, closing |
| **R7** | **The spike weakness is the design.** CUSUM accumulates evidence across observations, so a spike is its worst case; a point-wise measure would charge the detector's own persistence gate as error and return a number about the gate. | **SURVIVES** | 4.5, `sec:res-vuspr` |
| **R8** | **The cost sweep inverts the literature.** Sources predict over-offering above fifty per cent false alarms; this system returns 8 false alarms against 124 misses, so an elicited cost ratio would push the threshold opposite to the direction the review's sources guard against. | **SURVIVES** | 4.5, `sec:res-costsweep` |
| **R9** | **Two River Taps triangulated.** Weakest retention at $p = 0.220$, elimination at the secondary level, and a retention that depends on the bootstrap's block length — three independent indications of thin evidence at one venue. | **SURVIVES**, compressed to one sentence | 4.1, `sec:res-mcs-functional`, closing |
| **R10** | **What the margin refuses.** A win small *relative to its own variability*, not a win that is small: a consistent modest advantage has little dispersion and is adopted; the refused case draws its advantage from large gains nearly cancelled by large losses. | **SURVIVES** | 4.2, `sec:res-margin` |
| **R11** | **The coverage gain is arithmetic.** Removing a forecaster already measured worse on the block being reported necessarily improves that block, so the post-margin coverage is a consequence and not confirmation. | **SURVIVES** | 4.2, `sec:res-margin` |
| **R12** | **The remedy tracks the mechanism.** The windowed pool repairs the venue whose drift is cleanest, does little where the shortfall is mostly misspecification, and harms the venue with no problem — and that per-venue tracking is itself confirmation of the diagnosis. | **SURVIVES** | 4.4, `sec:res-drift-cause` |
| **R13** | **The asymmetry could not be argued from the defect.** An in-sample band is optimistic on the same sample, but the two quantiles are not on the same sample (343-day fitting span against a 56-day calibration block), so correcting the defect *narrows* sparse item bands. | **SURVIVES** | 4.2, `sec:res-margin` |

**Thirteen extracted, thirteen survive.** No derivation was cut, which is worth stating plainly
rather than presenting as a target met: the 2.5:1 compression fell almost entirely on restatement,
on run narrative, and on the eight floats the approved dispositions remove, not on reasoning. The
three subsections CUT by approval A7/§3.4 (the seven-point window, the restated headline figure,
the ingest-defect covariate gap) carried no derivation in this list.

## Deliberate cuts brought with their word cost

| Cut | Words | Why |
|---|---|---|
| The pairing-variance exposition — why paired standard errors, the $178.00 \to 26.94$ factor of $6.6$ at Ellel, and why a $\pounds 1.55$ gap is measurable at all | ~330 | Demoted to Appendix D with `tab:window`'s sibling material by approval A9 (§2.7, "pairing variance, block-length sweep"). The composed 4.1 keeps the block-length sensitivity, which is the part that reaches a served decision, and drops the tutorial on why pairing works. **The $6.6$ factor is not currently restated anywhere**, and that is the single largest thing this compression loses. |
| The two-alignment Ellel caveat and its retirement | ~60 | Repair chronology. The rung now scores all 260 folds; a reader needs the 260, not its history. |
| The keg-order misattribution correction ($1.09$ against $0.72$) | ~75 | Chronology of the project's own arithmetic, not a result. The surviving figure is $0.72$. |
| The undefined-score node that disappeared before the margin applied | ~90 | A correct non-event. Reporting it costs 90 words to establish that nothing happened. |
| "Adopting on the classification alone was considered and rejected" — the fifteen-of-sixteen losing nodes | ~110 | Methods-side rule design. Belongs to 3.3, not to a report of what was measured. |
