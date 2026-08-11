# PRJ93: project status and contingency options

**To:** Simon Tomlinson, Academic Coordinator
**Dissertation supervisor:** Dr Hansi Hettiarachchi
**Host organisation:** AI General Manager Ltd, in partnership with Lune Brew Co.
**Date:** 10 August 2026
**Submission deadline:** 4 September 2026 · **Poster session:** 11 September 2026

---

## 1. Position

The dissertation asks whether an operational estate of three hospitality venues holds enough data
to support a proactive intervention layer: whether venue demand can be forecast well enough to
establish what is normal, whether the uncertainty around that forecast can be calibrated per venue,
and whether departures from it can be detected under a cost asymmetry that favours silence over
noise. All six chapters are written, the experimental programme has run, and every one of the five
stated research questions is answered in the text with a measurement behind it. One dependency is
outstanding. The final component is an LLM-based agent that triages the detected deviations and
decides which are worth raising. It is specified and frozen, and has never been run against live
model inference. Filling the response cache it needs requires 644 model calls and an API
credential that this project has never held. A second, separate dependency on the host operator
blocks the human-judgement half of the same evaluation.

## 2. What is complete

The corpus covers three trading venues (the Beer Hall, Ellel, and Two River Taps, the last of which
ceased trading on 8 May 2026 and is carried thereafter as a frozen control series). Each answer
below rests on a committed result file and is reported with an interval.

**RQ1: can forecasting approaches be separated at this data volume, and does origin count change
the selection?** Mostly they cannot, and it does. Ninety per cent model confidence sets retain five
of nine scored entrants at the Beer Hall, four at Two River Taps and six at Ellel; six evaluation
origins place the served Beer Hall model second of nine and 273 origins return it to first.
*Evidence class: out-of-sample accuracy comparison with a small-sample correction and a model
confidence set.*

**RQ2: do intermittency and hierarchy admit the standard estimand and reconciliation?** The data
does not admit the reconciliation. The unbiasedness precondition fails at 22 of the Beer Hall
hierarchy's 41 nodes, 19 of them with a positive mean residual, so no minimum-variance optimality
may be claimed. The estimand survives, qualified. *Evidence class: precondition test on the served
hierarchy plus demand-pattern classification.*

**RQ3: do weather or cross-series pooling improve accuracy?** Neither is separable from a venue's
own trading history. The ninety per cent set retains all five weather arms at every venue,
and grouping performs no better than forecasting each venue alone, and at two venues worse. One Beer Hall
contrast excludes zero as a marginal detection the confidence set does not sustain. *Evidence class:
controlled ablation at venue-total aggregation, arms separated by availability lead.*

**RQ4: does a split-conformal interval hold nominal coverage, and if not, why?** It does not, and
the property responsible is exchangeability. The served band misses nominal at all three venues in
opposite directions; decomposing the marginals changes which venue fails, with Ellel covering 0.692
on the days it actually traded. *Evidence class: per-venue calibration audit with an exchangeability
diagnostic that predicts each venue's coverage in sign and rough size.*

**RQ5: does deviation detection justify surfacing under an asymmetric cost?** Not as the question
poses it. The detection evaluation ran on an exhaustive, deterministic corpus of 644 injected events
(recall 0.807, 95% CI [0.78, 0.84]; precision 0.872; F1 0.839), with detection weakest on point
events and strongest on regime shifts. The cost sweep selects no operating point, and the reason is
itself a result: misses dominate false alarms at every ratio tested, which inverts the failure mode
the proactive-agent literature guards against. *Evidence class: pre-registered injection corpus with
a threshold-free ranking measure and bootstrap intervals.*

## 3. What is blocked, and why

The unmeasured element is the sixth condition rather than one of the five questions. The project
specification's evaluation deliverable names quantitative measures *plus* qualitative manager
feedback. The design scoped one condition out of the research questions on purpose and carries it instead as a
contribution at reduced strength: whether the intervention layer's judgements agree with an
operator's own accept-or-dismiss decisions. That way the document states no question it cannot
answer.
The dissertation says, in the Introduction, the Results, the Discussion and the Conclusions, that
this apparatus is "specified and frozen and has not been run", and names it the largest gap between
the architecture and the evidence for it. The text declares the position rather than working around
it.

The apparatus is complete and the measurement is pending. The triage agent, its prompt (frozen
before any evaluation output existed, so the commit order proves it was not tuned against results),
the response cache with its zero-call offline replay, the cost-sensitive threshold sweep, the
calibration analysis and the agent-versus-baselines comparison are all built and tested. What is
missing is data: 644 live model calls, one per injection scenario, filling a cache the rest of the
pipeline replays from. Nothing in that step is a code change.

Two dependencies are in play. The first is a paid API credential, which the project has never held
and which the host did not provision. The second is the host operator, Elliot, who was to supply
three things: the relative cost of a false alarm against a miss, a venue booking diary, and the
accept-or-dismiss judgements against which the agent would be scored. Communication broke down
during final testing. You contacted Elliot, who cited internal staffing issues and absence until
15 August, and did not provide access to Ryan Helmn, the named technical co-founder and line
manager. None of the three inputs has arrived.

A related divergence is already declared in the text. The specification offered read access to a dedicated
research schema in the production database from the first week. The host never provisioned one, so every result rests on a corpus
assembled from source exports into a local warehouse. The Discussion names this the divergence with
the widest consequence for external validity.

## 4. Remaining tasks

| Task | Depends on | Estimate |
|---|---|---|
| Front matter (acknowledgements) and a final proofread of the assembled document | nothing | 1 day |
| Final formatting and submission checks against the marking criteria | nothing | 1 day |
| Fill the response cache (644 scenarios), commit it, run the offline replay | the credential | 1-2 days |
| Write the calibration, threshold-curve and baseline-comparison results into Chapter 4 and update the contribution statements in Chapters 1, 5 and 6 | the run above | 3-4 days |
| Elicit the miss-to-false-alarm cost ratio; select an operating point on the existing sweep | the operator | 1 day, no re-run needed |
| Obtain accept-or-dismiss judgements and a second rater for the agreement statistic | the operator | 1-2 weeks, operator-dependent |

The first two are independent of any third party. The last two are outside the reach of the funded
run and are what Section 6 turns on.

## 5. The funded execution path

You have confirmed that the DSAIL-funded API route is the option to be taken, so this section
specifies it. Local execution on SCC GPU infrastructure was assessed against it and is recorded at
the end of the section for the file.

The route produces one artefact: a committed cache of 644 scored scenarios, from which every
downstream figure is computed offline with no credential.

| | |
|---|---|
| **Workflow** | 1. DSAIL authorises an API credential. 2. Install the vendor SDK; correct one parameter in the frozen call, which the current API version no longer accepts, and record the change. 3. Run the single build command. 4. Commit the cache; run the offline replay to reproduce every downstream number. |
| **Volume, and how derived** | 644 calls, one per injection scenario. The number is fixed by the corpus, which is exhaustive over the venue × event-kind × magnitude × onset × fold × direction grid and carries no random element. Output is capped at 4,096 tokens per call by the frozen configuration. |
| **Cost** | Bounded above by **$69.27**, and by **$34.64** on batch submission. The full basis is set out below. |
| **Wall-clock** | Hours. Sequential submission completes in an afternoon; batch submission typically completes within a day. The write-in of the results is 3-4 days. |
| **What it produces** | Expected calibration error, Brier score and a reliability diagram on the agent's raise-probabilities; the cost-sensitive threshold curve computed on real probabilities across the pre-registered ratio grid; and the comparison of the agent against fixed-probability baselines. |
| **What the dissertation could then claim** | That the chain from a calibrated prediction interval to a calibrated *statement* is measured rather than asserted. The review chapter names expected calibration error as the instrument carrying the guarantee through, and it has never been run here. That the LLM triage layer is a contribution rather than a decoration, or is not, on evidence. Contribution five moves from "specified and frozen and has not been run" to a measured result, and the declared divergence narrows from two unreached deliverables to one. |
| **Risks** | Access is external: DSAIL authorisation is not in hand. The pinned model must still be available at run time. Rate limits are tier-dependent and unknown until the credential exists; they affect duration, not feasibility. |

### Cost basis for the funding request

The model is **`claude-opus-4-8` (Claude Opus 4.8)**, pinned in the frozen configuration and stamped
into every record the run produces. Published list price is **$5.00 per million input tokens** and
**$25.00 per million output tokens**. Every quantity below is fixed by the committed configuration
rather than estimated.

| Line | Basis | Tokens | Cost |
|---|---|---|---|
| Output ceiling | 644 calls × 4,096 tokens, the per-call cap in the frozen configuration | 2,637,824 | $65.95 |
| Input, system prompt | 644 calls × the pinned 4,110-character prompt (≈1,030 tokens) | 663,320 | $3.32 |
| Input, per-scenario briefing payload | Varies with the number of ranked items on the venue-day; never measured, because the cache has never been built | not known | small relative to the above |
| **Ceiling, standard submission** | | | **$69.27** (£51.50) |
| **Ceiling, batch submission** | 50 per cent discount, and the run is not latency-sensitive | | **$34.64** (£25.76) |

Two things make this a ceiling rather than a forecast. The output line assumes every one of the 644
responses returns the maximum 4,096 tokens; each is in fact a short JSON object carrying a
probability and a one-sentence rationale, so the realised figure will be a fraction of it. And the
run is deterministic and exhaustive, so it is executed once, not iterated to convergence.

**The request I would put to DSAIL is $150, which is £111.53.** It breaks down as follows.

| Component | Basis | USD | GBP |
|---|---|---|---|
| The run | 644 calls at the ceiling above, standard submission | $69.27 | £51.50 |
| One complete re-run | A partly-filled cache is not a usable artefact, so a failure part-way through is re-run whole rather than resumed | $69.27 | £51.50 |
| The unmeasured input line, both runs | Covers a briefing payload of up to about 1,780 tokens per scenario, roughly 1.7 times the size of the system prompt | $11.46 | £8.53 |
| **Total requested** | | **$150.00** | **£111.53** |

If the run is submitted as a batch rather than sequentially, the same $150 covers more than four
complete runs, so the request has headroom under either submission mode.

Sterling is converted at the European Central Bank reference rate for 7 August 2026, $1 = £0.74352.
A market rate of $1 = £0.741549 at 00:02 UTC on 10 August 2026 agrees with it to within a third of
one per cent, so the figures are not sensitive to which is used or to ordinary movement before the
run.

**A cheaper model tier is not a saving available here.** The model identifier is part of the
pre-registration and is stamped into every record, so substituting a lower-priced tier is the same
class of specification change as the local-execution route set aside below, for a saving of tens of
dollars.

**The route does not close the operator limb.** It produces *detection* calibration, meaning how well
the agent's probabilities track whether a deviation occurred. *Intervention* calibration, meaning
whether the manager should have been told, needs human accept-or-dismiss judgements, of which there
are currently none, and validating the automated scorer against a human anchor needs a second rater,
where at present the only rater is the author. That limitation is disclosed in the text as a threat
to internal validity rather than mitigated. Elliot's return on 15 August, or a substitute rater, is
the only route to it.

**Why local execution was set aside.** Running the same corpus against an open-weight model on SCC
GPU infrastructure would produce the same four outputs at no monetary cost. Two things count against
it. It substitutes a different model for the pinned one, which changes a pre-registered specification
and makes the result evidence about an open-weight agent rather than about the deployed system the
dissertation describes. And its timeline is dominated by account provisioning, allocation and
environment setup, on the order of one to two weeks against the funded route's hours. Against a
4 September deadline the second objection is the binding one.

## 6. Extension

**The inference run does not need an extension; the operator limb does.** Twenty-five days remain to
4 September. The funded run takes hours and its write-in 3-4 days, so provided the credential is in
hand by roughly 25 August, that limb lands inside the existing deadline. The operator limb cannot:
Elliot returns on 15 August, obtaining accept-or-dismiss judgements and a second rater is one to two
weeks of his time once contact resumes, and the agreement statistic and its write-in follow that. The
realistic landing for the operator work is 29 August to 5 September, which either overruns
4 September or leaves no margin for it to slip at all.

**An extension to 8 September absorbs that and protects the poster.** Four days past the current
deadline, inside the window you named, and leaving three clear days between submission and the poster
session on 11 September. Extending to 11 September itself is the outer bound of that window but makes
submission and the poster the same day, which works only if the poster content is frozen several days
in advance.

**The open question is whether an extension may run past 11 September.** It would matter for one
thing only. If the operator work starts late, or Elliot's availability after 15 August is partial, a
window past the poster is the difference between reporting the operator-grounded evaluation and
reporting the apparatus alone. The cost is that the poster would present a document whose final
chapter changes afterwards, so whether that is acceptable is a ruling rather than a scheduling
question. I would rather have it decided now than discover the answer in the first week of September.

**Without an extension**, the dissertation submits on 4 September as it currently stands, plus the
inference results if the credential arrives in time: five research questions answered on measured
evidence, an intervention layer specified, frozen and unmeasured on its operator limb, and the
divergence from the project specification declared in the Discussion as the marking criteria require.
That is a complete and internally consistent document. What it loses is the measurement that would
settle whether the reasoning layer, the component the project specification calls the student's job,
agrees with the judgement of the person it exists to serve.
