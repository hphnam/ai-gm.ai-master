# Report 41 - Addendum to the integration brief response, post-G15

Date: 2026-07-20. For Ryan. Written for a reader who has
`35_For_Ryan_Integration_Brief_Response.md` and nothing else.

**This replaces nothing.** Report 35 stands as the record of 2026-07-19. Four things in it
are now out of date and three of them affect what you build. In its idiom: Adopted,
Deviated, Yours.

---

## 1. The trust gate you were given was not runnable

Report 35's results section leads with three training-frame hashes as the reason to trust
the de-Lune, and calls them "the gate that lets you trust all of the above".

**Those three values exist in no script in any commit.** Nobody could re-measure them,
including their author. The `ellel` row count in that table is also six rows short of the
canonical store. You made a decision on evidence that could not be reproduced, and you
should know that before anything else in this document.

**The conclusion held.** G16a rebuilt the check portably: both trees measured against one
copied store through one interpreter, by a shim that was validated to reproduce the current
gate before it was trusted with anything unknown.

| | `beer_hall` | `two_river_taps` | `ellel` |
|---|---|---|---|
| `2cc97e7`, before the de-Lune | `8c8a8be9d8dc5791` 399 x 40 | `b6339032a219213c` 331 x 40 | `ea28bcacbf1825e4` 392 x 40 |
| `c008651`, current | identical | identical | identical |

The two trees differ by 1,072 inserted lines across the feature path, including 205 changed
lines in `features/build_features.py` and the entire 199-line profile seam, and
`org_profile.py` does not exist in the earlier one. Two hundred lines of change to the
feature builder, zero movement in any frame.

So the claim you were asked to accept is now true on better evidence than it was when you
accepted it. Anyone can re-run it: `sim/g16a_portable_baseline.py`. Full account in report
40.

**What this does not cover:** it says the research path is unchanged. It says nothing about
whether a bound tenant profile behaves correctly, which is a different body of tests.

---

## 2. Round 4 was run, and it was not clean

Report 35 told you three rounds, three with hits, and to treat the round-3 fixes as a real
residual risk because they were unreviewed. That was right.

**It is now four rounds, four with hits.** The one you need:

> **The round-3 isolation guard was applied to the POOLED dates of the whole request rather
> than per venue, so it did not fire on any multi-venue org.**

Every line of its reasoning is per-venue and all the harm is per-venue, but it validated
the union of dates across every venue in the request. The identical typo'd row is rejected
in a single-venue request and **accepted** whenever any sibling venue happens to trade
across the gap. Measured: **64 sibling rows are enough to defeat it.**

Lune has three venues and the contract allows 25. **It protected exactly the configuration
nobody runs.** Fixed in G15b, and the fix's own blast radius was measured rather than
assumed, which is item 3.

Two further items from that round, for completeness:

- The band-calibration guard was asymmetric (`>` where `!=` belonged), so raising the
  calibration block instead of the horizon changed the banding method silently and toward
  over-coverage. Fixed.
- A false-reject in the same validator was found and **deliberately left open**. That is
  item 3.

---

## 3. A new availability behaviour, and it is yours to handle

**A venue that reopens after a long closure is refused, and the whole request fails with
it.** The validator raises on `ComputeDataset`, so one reopening venue takes down the
forecast for every sibling in the same call. Measured: accepted at 21 days back into trade,
**rejected at 13**, rejected on day 1.

This is **FLAG-SEGMENT-FALSE-REJECT**, and it is **open by design**, not by neglect. Every
discriminator tried reopens a worse hole. The obvious one, exempting the trailing segment
since a reopening is always at the end of the history, also exempts a dormant venue plus
one mistyped recent row, which relights a dead venue and poisons the forecast origin. On
four rounds of four with hits, a fifth fix on reasoning alone is the failure mode, so it is
pinned by a test and documented rather than patched.

**And the G15b fix made this more likely, not less.** Before it, a sibling venue trading
through the gap accidentally masked the refusal. Removing the mask was correct, because the
mask was hiding true positives too, but the consequence is that legitimate reopenings now
fail where they previously slipped through. **From where you stand that is a regression**,
and it would be dishonest to present it as anything else.

**Yours to decide:** per-venue requests, retry-minus-the-offender, or surfacing the refusal
to the operator. It is an availability decision, which is your layer, not ours. It is now
obligation 12 in `CONTRACT.md`.

---

## 4. Two contract-sync inputs, not changes

Both hit a stop condition deliberately. Neither is implemented. Both need the sync.

- **`PriorState` content is unbounded.** The shape is validated, the contents are not: a
  100 MB `briefing_chain` is accepted and echoed back verbatim, measured. Not fixed here on
  purpose, because `PriorState` is state your API round-trips from its own store, and a
  size rule invented on this side could reject your own legitimate persisted state.
- **`_reject_implausible_dates` depends on wall-clock.** It calls `date.today()`, so a
  fixed dataset changes verdict as days pass and there is no frozen-clock seam. This will
  bite your regression tests and recorded fixtures before it bites production.

---

## 5. What did not change

You should not have to infer this.

- **No dissertation number moved.** C2 still re-scores BH L1 MASE **0.285 / 0.287**, band
  coverage **1.00**, `generalises: False`.
- **The served models are unchanged.** Nothing in G15 or G16 touched a model, a fit, or a
  frozen artefact.
- **Decision 6 is still open and still yours to answer before the nightly cron.** The
  re-fit cadence is wired to the research store's watermark, not to the injected
  `prior_state`, and `ladder_selection` still comes back `[]` on every call. A cron built
  on an "always learning" assumption will loop and persist an unchanged selection.
- **The exogenous, `trading_hours` and `expected_totals` obligations from report 35 all
  stand**, unchanged.
- **One additive, optional field arrived**: `org_profile.price_change_dates`, defaulting to
  `[]`. Omit it and nothing changes. It exists because a hardcoded Lune repricing date was
  reaching every tenant's feature frame.

**Build against `CONTRACT.md`, not against report 35's handshake list.** The obligations now
live there as the canonical list, because a report is a dated snapshot and the contract is
the joint item. Report 35's list is still accurate for 2026-07-19; it is one obligation
short of today.

---

## 6. One judgement, marked as a judgement

Everything above is a fact with a measurement behind it. This is not:

> **On four rounds of four with hits, the honest read is that this codebase's fixes are not
> converging.** The yield curve has not turned over: every round of review since round 1 has
> found a defect, and three of those rounds found a defect *in the previous round's fix*.
> The G15b fixes described in items 2 and 3 have not themselves been reviewed, and on this
> evidence you should treat them as unreviewed rather than as settled. I would not tell you
> the current round is the clean one, because that has been wrong four times.

The reason to say it rather than let you discover it: the defects found so far have all
been the kind that produce a plausible wrong number rather than an error, and that class
does not announce itself in your logs.
