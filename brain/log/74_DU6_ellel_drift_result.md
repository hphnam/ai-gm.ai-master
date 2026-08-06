# 74 — D-U6 final: where Ellel's drift lives, and why it is D-U3 wearing a different coat

`log/73` §5 recorded one thing as out of reach: *"Ellel's drift is unexplained. The diagnostic
rules out the level of trade there and offers no substitute."* That was the last open item on
this project that was not blocked on a third party. It is now located, and the location turns it
into a row that already exists.

Runtime `.venv-forecast`, store ceiling 2026-07-07, point model `rung2_ets`.
`eval/exchangeability_diagnostic.py` extended with `_drift_decomposition`; artefact
`eval/exchangeability_diagnostic.json` regenerated. No served band changed.

## 1 · Four candidates, three of which had to be able to fail

The test was designed so it could come back negative on everything. Four mechanisms are
separable on the committed store, and each predicts a different pattern.

| Candidate | What it predicts | Outcome at Ellel |
|---|---|---|
| **composition** — the mix of day types changes | drift confined to one subgroup | **confirmed** |
| **dispersion** — the level is flat but the spread widens | deflating by a trailing standard deviation removes it | rejected: $+0.182 \to +0.138$, $p = 1.3 \times 10^{-6}$ |
| **tail** — a growing handful of large days | drift disappears below the venue's median take | rejected: below-median drift is the *whole* of it |
| **shape** — a break, not a trend | large gap between halves, weak trend inside each | partly: halves 131.4 $\to$ 229.3, within-half $\rho = +0.044$ and $+0.114$ |

## 2 · The drift is in one subgroup, and it is 80 per cent of the group

| Ellel, calendar-open days | n | mean \|res\| | drift $\rho$ | $p$ |
|---|---|---|---|---|
| the venue traded | 263 | 516.3 | $+0.094$ | **0.129** |
| the venue did not trade | **1037** | **95.2** | $+0.367$ | $1.9\times10^{-34}$ |

On days Ellel actually trades there is **no significant drift**. All of it sits on days the
calendar calls open and the venue did not trade, and those are **79.8 per cent of the group**
(rising across time quartiles 0.695, 0.852, 0.785, 0.858; trend $\rho = +0.090$, $p = 0.001$).

The subgroup result is not a coincidence of where the median fell. The `tail` test and the
`composition` test return the identical statistic ($\rho = +0.367$ on $n = 1037$) because
Ellel's median calendar-open day takes nothing at all.

## 3 · On those days the residual is the forecast, as an identity

Verified rather than argued: on every one of the 1037 false-open rows, $y = 0$, the forecast is
non-negative (minimum 0.0), and $|y - \hat y| = \hat y$ holds exactly. So what drifts is not the
venue's error scale. It is **what the point model predicts for a day the venue does not open**,
and the mean of that prediction roughly doubles across the window (quartile means 68.0, 74.1,
121.4, 117.3).

## 4 · Two deflators, both rejected

`log/73` deflated by a trailing mean over all calendar-open days. That is the wrong denominator
here, because a group that is 80 per cent zeros has a level that barely moves ($\rho = +0.067$).
Re-running with a trailing mean over **traded days only** fixes the denominator and does not fix
the result: the traded-day level rises hard ($\rho = +0.799$) while deflation moves the drift
only from $+0.186$ to $+0.157$, and on the false-open subgroup from $+0.230$ to $+0.203$.

Both level accounts are therefore rejected at Ellel, and rejected on the stronger of the two
denominators rather than on the weaker one that happened to be available in `log/73`.

## 5 · What is left is D-U3

The model has no occurrence signal at Ellel. Whether that venue trades on a given day is settled
by a booking diary this work never received, and the module is written so the circular
substitute is unreachable by any code path. A forecaster that cannot condition on occurrence
emits a level for every calendar-open day, and every non-trading day hands that level straight
back as error. As the takings on Ellel's trading days rose, so did the level, and so did the
error on the four days in five that were never going to trade.

That is not a new mechanism. It is **D-U3, measured**. The open row closes into a row that was
already declared, already blocked on a named third party, and already carried as a limitation.

## 6 · One partition defect, two directions

Setting Ellel beside the Beer Hall finishes the account, because they are the same defect:

| venue | the calendar says | the venue did | rate |
|---|---|---|---|
| beer_hall | closed | **traded** | 94/546 = 0.172 |
| ellel | open | **did not trade** | 1037/1300 = 0.798 |

A day-of-week calendar standing in for an occurrence signal fails in both directions, and the
estate supplies one venue of each. The Further Work item already recorded — derive the Mondrian
groups from observed trading rather than from the weekday — addresses both, and at Ellel it is
the same fix as the missing diary.

## 7 · Why this costs Ellel no coverage

Worth stating so the finding is not oversold. Ellel has the strongest raw drift of the three
venues and its coverage is the closest to nominal (0.914; rank tail 0.087 against 0.100). There
is no contradiction: the drift lives in the subgroup whose residuals average 95.2 against 516.3
on traded days, so a proportional change there moves the 90th percentile of the pooled group
very little. **Ellel's drift is real, strongly significant, and operationally inert.** That is
also why the windowed pool of `log/73` §3 made Ellel worse: it re-weights toward a recent period
in which the inert subgroup's residuals are larger, and buys nothing for it.

## 8 · What may and may not be claimed

**May.** Ellel's drift is localised to calendar-open non-trading days, where the residual equals
the forecast by identity; the level of trade is rejected as its cause on both available
denominators; and the residue is the absence of an occurrence signal, which is D-U3.

**May not.** No claim that the drift is fully modelled. The account says what the drifting
quantity *is* and rules out two candidates for what moves it; it does not fit the movement.

**May not.** No claim that anything was repaired. The served band is untouched.

## 9 · Row status

| Item | Status |
|---|---|
| **D-U6** | **CLOSED at all three venues.** Beer Hall and Two River Taps by level, Ellel by composition |
| `log/73` §5 "Ellel's drift is unexplained" | **Superseded** by §2–§5 above |
| Ellel residue | Folded into **D-U3**, third-party blocked, already declared |
| Open rows not blocked on a third party | **None** |
