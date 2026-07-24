# Report 51 - S11 G17j: the chat-log gap signal, wired into the briefing

Date: 2026-07-24. Branch `brain-construction-local`, from tip `64980d0` (S10). Device CPU. Style: no
em-dashes, plain prose, loud failures, verify before asserting.

## Headline

**Corpus: 735 messages (376 user, 359 assistant), 2026-04-29 to 2026-06-12, 25 active days, single
channel (web).** Embedder: pinned to the keyless TF-IDF path (`backend="tfidf"`, the new default;
never attempts Voyage or sentence-transformers regardless of what is in the environment). On the real
corpus: **4 of 12 clusters clear the above-baseline gap threshold**, well under the roughly-ten-gap stop
condition. One of the four (brewery-tagged, no occurrence definition, out of `BRIEFING_VENUES` scope)
is excluded; the other three (all "no venue named" clusters) broadcast to every briefing venue. The
briefing's own de-duplication then folds the three close-onset gaps into one item per venue, headed by
the strongest (the gas-cannister cluster, score 1.8). **The briefing now ranks a `sop` item alongside
sales items at every venue on this corpus.** No stop condition fired.

| venue | status | severity | score | headline |
|---|---|---|---|---|
| beer_hall | new | high | 0.328 | repeated question suggests a missing SOP, "gas cannister..." (3/5 unanswered) |
| two_river_taps | new | high | 0.328 | repeated question suggests a missing SOP, "gas cannister..." (3/5 unanswered) |
| ellel | new | high | 0.328 | repeated question suggests a missing SOP, "gas cannister..." (3/5 unanswered) |

## Preconditions (verified, not assumed)

- Tip `64980d0`, confirmed equal to `origin/brain-construction` (`git rev-parse HEAD` ==
  `git rev-parse origin/brain-construction`).
- `python -m store.build`: "store already at ceiling 2026-07-07; nothing to do".
- Suites green before any change, at the S10 counts (588 tests once the baseline is recomputed fresh;
  see Suites below for the exact before/after since the spec's remembered S10 counts, 575/8 and 575/1,
  predate this session's own fresh run).
- The chat-log data is present at `config.chat_csv()`. `signals.chatlog_kb_gap.load_turns()` reports
  735 rows: 359 assistant replies (68 unproduceable, failure rate 18.9%, exact to the `CHATLOG_FAILURE_BASELINE`
  constant), span 2026-04-29 10:33:46 to 2026-06-12 08:49:34, 25 active days, channel `{'web': 735}`.
  Confirmed by reading the file through the module's own loader, not assumed from the spec's "understood
  to be 735 messages".

## Part 1: the embedder is pinned, not merely defaulted (G2)

The three-tier degrade (Voyage key present -> Voyage; else sentence-transformers if installed; else
TF-IDF) is real and still reachable, but only via an explicit `backend="auto"` opt-in, documented in
`chatlog_kb_gap.embed()`'s docstring as an exploratory, noted, never-committed path (the Ryan-side
richer-embedder comparison the spec allows for but does not ask this package to run). `backend="tfidf"`
is the new default for `embed()`, `rank_gaps()`, and `gap_report()` (the cached accessor `briefing.py`
calls): it routes straight to `_embed_tfidf`, which never reads `VOYAGE_API_KEY` and never imports
`voyageai`, so a developer machine that happens to have a key set produces the identical, reproducible
clustering as a clean CI checkout with no key and no network. **Verified, not asserted**:
`test_pinned_backend_ignores_a_present_key_and_touches_no_network` sets a fake `VOYAGE_API_KEY` AND
blocks `voyageai` from being imported at all (`sys.modules["voyageai"] = None`, which makes any
`import voyageai` raise `ImportError`); the tfidf path completes without touching that branch. Every
artefact this package produces is stamped `embedder_backend` and `store_ceiling`
(`signals/chatlog_kb_gap.json`, and the `embedder_backend` key on every `sop` Signal's payload).

## Part 2: wiring the signal into the briefing (G1)

`signals/briefing.py` gained a fifth collector, `_collect_sop(venue)`, called from `collect()` on the
same footing as the other four: it reads `chatlog_kb_gap.gap_report()` (process-cached, since the chat
corpus is a static historical export and the clustering is deterministic, `random_state=0`), filters to
`is_gap` clusters, and for each one:

1. **Attribution.** `_sop_target_venues(venue_tags)` decides which briefing venue(s) the cluster
   belongs to. A cluster tagged to a real venue (content named it) attaches only to the majority-tagged
   one. A cluster with no venue named at all is broadcast to every `BRIEFING_VENUES` member rather than
   guessed at or silently dropped, because `chatlog_kb_gap`'s own "estate" fallback conflates two
   different things: a genuine cross-venue mention and simply not naming a venue, and this corpus is
   single-owner product-testing chat (Elliot's AI-GM Questions export), so the latter is the common
   case, not the exception. A cluster tagged only to a name that is not a `BRIEFING_VENUES` member
   ("brewery") is excluded: there is no occurrence definition to gate it against, and surfacing it
   ungated would be dishonest given every other signal respects the occurrence gate. Both narrowings
   are stated in `briefing.py`'s module docstring, not silent.
2. **Occurrence gate (G4, below).**
3. **Normalisation.** A `Signal("sop", venue, onset, "na", severity, score, payload)`, `onset` being the
   date of the FIRST failing turn in the cluster (when the gap first showed up, matching every other
   source's onset semantics, never the most recent), `severity` from `_sop_severity(score)` (>=1.0
   high, >=0.5 medium, else low; no "critical"/"ok", every cluster reaching here already cleared the
   gap threshold so it is real by construction), and `payload` carrying the cluster id, size, failure
   count/density, score, embedder backend, and the truncated example question.

`_reason()` gained a `source == "sop"` branch that builds its sentence from the cluster's own evidence
("N of M similar questions went unanswered, density X vs baseline Y") instead of routing through
`signals.residual.attribute` (the revenue exogenous-attribution seam every other source uses): a
repeated chat question has no revenue-side cause to attribute, and running it through that seam risked
attaching an unrelated coincidental "cause" (a school-term transition, say) to a chat gap, exactly the
invented-cause failure mode the spec forbids. `_headline()` gained a matching branch: "{venue}: repeated
question suggests a missing SOP, '{example}' (N/M unanswered)".

**Additive by construction, verified.** `sop` signals carry direction `"na"`; `_cluster()` buckets
signals strictly by exact direction string before ever looking at onset proximity, so a `sop` signal can
never enter the same cluster as a `"down"`/`"up"` sales or stock signal, and therefore can never change
which signal `_pick_head` selects for an existing sales item. `test_wiring_sop_does_not_change_non_sop_briefing_items`
runs `briefing.build()` twice against the real store, once with `_collect_sop` live and once
monkeypatched to `[]`, and asserts every non-sop item in the output is identical between the two runs.

**G1 demonstrated.** `test_a_known_repeated_question_cluster_becomes_a_ranked_briefing_item` constructs
a known repeated-question cluster (the spec's own worked shape), pins it to `beer_hall` on a trading
day, and asserts it produces a `BriefingItem` headed by the `sop` signal with a positive score, i.e. it
ranks alongside the sales items rather than being reported through a side channel.

## Part 3: the noise guard (G3)

`CHATLOG_FAILURE_BASELINE = 0.189` reproduces exactly against the real corpus (18.9% observed). On the
real corpus, **4 of 12 clusters clear the above-baseline gap threshold** (density above 0.189 AND at
least 2 failures):

| rank | size | failed | density | score | venue tags | example |
|---|---|---|---|---|---|---|
| 1 | 5 | 3 | 0.600 | 1.800 | estate (broadcast) | "Why is this gas cannister not connecting and gas is coming out of the gas tap handle?" |
| 2 | 12 | 4 | 0.333 | 1.333 | estate (broadcast) | "Pretend I'm a new user for the first time..." / "What grant funding can I get for AI-GM to launch?" |
| 3 | 18 | 4 | 0.222 | 0.889 | brewery (excluded, no occurrence definition) | "No probs, can I upload documents into this chat?" |
| 4 | 6 | 2 | 0.333 | 0.667 | estate (broadcast) | "How do I open up?" / "How do I open the bar?" |

This is a small real estate with a genuine handful of gaps, not an over-sensitive threshold: none of the
gaps is a trivial acknowledgement or generic pleasantry (they are all substantive operational or
product questions), and the non-gap clusters include several with a low-but-nonzero failure rate
(0.0-0.18) that the threshold correctly leaves alone. **The prediction recorded before the run ("few
genuine gap clusters, low single digits") is confirmed**: 3 gaps reach the briefing after the
out-of-scope brewery exclusion, comfortably inside the roughly-ten-gap stop condition.

**The guard is proven discriminating, not asserted from the threshold formula.** Per the spec's own
instruction to meet S10's negative-control standard: `test_ordinary_non_repeating_chatter_is_not_flagged_as_a_gap`
and `test_a_repeated_operational_question_is_flagged_as_a_gap` run a REAL `rank_gaps()` clustering pass
(TF-IDF + KMeans, not a shortcut) over 12 constructed "ordinary chatter" messages (1 failure) and 6
near-identical "fryer reset" repeated questions (6 failures): the clustering separates them into
distinct clusters, the ordinary cluster's density (0.1) stays below baseline and is never flagged, and
the repeated-question cluster's density (1.0) clears it and is flagged. This is the discriminating pair
S10's G1 rewrite established as the standard, not a tautology that would pass regardless of whether the
guard works.

## Part 4: the occurrence gate (G4)

`_collect_sop` gates every candidate signal's onset date against `signals.occurrence.occurrence_label`
(the S4 definition), exactly as the spec asks, and exactly as S10's occurrence guard treated the same
two cases: a definite structural closure (label `0.0`) drops the signal (`test_a_gap_cannot_be_surfaced_on_a_structural_zero_day`,
constructed on a Monday, a structural-zero day for the calendar venues); a trading day keeps it
(`test_a_gap_is_surfaced_on_a_trading_day`, a Wednesday); Ellel's inert label (`NaN`, no booking diary)
is never gated in either direction (`test_ellels_inert_occurrence_never_gates_a_gap`), matching the
"never fabricate, never silently pass" convention. On the real corpus this gate is not empirically
load-bearing (the three surfaced gaps' onset dates, 2026-04-29/04-30, are both Wednesdays/Thursdays,
never a Monday/Tuesday), so its discriminating power is demonstrated by the constructed tests rather
than by an exclusion that happens to fire on this particular corpus, the same honest framing S10 used
for its own G2.

## Errors and fixes (this session)

- **First cut of the module docstring update conflated two different weight buckets.** An early edit
  claimed the `sop` source weight was "shared by checklist and the chat-log gap signal", which is
  wrong: `checklist` (0.40) and `sop` (0.35) are separate, independently-weighted sources in
  `BRIEFING_SOURCE_WEIGHT`; only the checklist path stays inert on Ryan's export. Caught on a
  self-review pass before committing and corrected in the docstring.
- **The G0 dependency-direction test initially failed after adding the new import.** `from signals
  import chatlog_kb_gap` records as module `"signals"` under `ast.ImportFrom`, not `"signals.chatlog_kb_gap"`,
  so `test_briefing_composes_the_five_signals_one_way`'s set check failed. Fixed by importing the
  specific accessor (`from signals.chatlog_kb_gap import gap_report as chatlog_gap_report`), matching
  the existing convention every other signal import in this module already follows
  (`from signals.change_point import detect as changepoint_detect`, etc).

## Acceptance gates

| gate | verdict | evidence |
|---|---|---|
| G1 briefing emits gap items ranked among sales items | PASS | `test_a_known_repeated_question_cluster_becomes_a_ranked_briefing_item`; real corpus produces 3 live `sop` items (headline table above) |
| G2 embedder pinned, stamped, no key/network needed | PASS | `test_pinned_backend_ignores_a_present_key_and_touches_no_network`, `test_rank_gaps_defaults_to_the_pinned_backend`; `chatlog_kb_gap.json` stamps `embedder_backend`/`store_ceiling` |
| G3 noise guard discriminates | PASS | `test_ordinary_non_repeating_chatter_is_not_flagged_as_a_gap`, `test_a_repeated_operational_question_is_flagged_as_a_gap`, real run over TF-IDF+KMeans |
| G4 occurrence gate applies | PASS | `test_a_gap_cannot_be_surfaced_on_a_structural_zero_day`, `test_a_gap_is_surfaced_on_a_trading_day`, `test_ellels_inert_occurrence_never_gates_a_gap` |
| G5 real-corpus output listed, inspectable | PASS | table above, `signals/chatlog_kb_gap.json` |
| G6 suites green, no served model changed, no frozen artefact modified, artefacts stamped | PASS | Suites below; only `signals/chatlog_kb_gap.py`, `signals/briefing.py`, tests, and doc/log files changed |

## Suites

Fresh full runs after all changes (this session's own baseline, since the spec's remembered S10 counts
predate this run and the standing instruction is to derive counts from the code, not memory):

- `.venv`: 588 passed, 8 skipped, 0 failures, 0 errors (13 new tests: `tests/test_chatlog_briefing.py`).
- `.venv-forecast`: 588 passed, 1 skipped, 0 failures, 0 errors.

No reduction in either suite. No served forecasting model changed. No frozen artefact modified
(`eval/injection_realism.json`, `sim/*` frozen forecasts, etc, untouched). `signals/chatlog_kb_gap.json`
is a new, S11-owned artefact, not a modification of an existing one.

## Review gate

`code-reviewer` and `security-reviewer` ran in parallel over the new/changed files.

**Security: no High/Critical findings.** `VOYAGE_API_KEY` is only ever read into a local variable
and passed to the SDK client, never logged or written to a report/artefact; the pinned `tfidf`
path never touches `os.environ` at all. String building in the new `sop` branches of `_reason`/
`_headline` is plain f-string interpolation of numeric fields and a pre-sanitised example string,
no `eval`/format-from-user-input pattern. One Medium/informational note: this is the first
composed signal to carry free-form chat text (a truncated, `|`-escaped example question) into the
`GET /briefing` response and the `brain_daily_briefing` agent tool, where the other four sources
are numeric/derived-only; worth telling the agent that quoted text in a briefing item is data
describing what was asked, not an instruction, before this pipeline runs against a live, growing
corpus rather than a static historical one. **Fixed**: added one sentence to
`brain_daily_briefing`'s tool description (`apps/api/src/modules/proactive-brain/brain.tools.ts`)
stating exactly that.

**Code: four findings, three fixed, one recorded.** (1) `write_artefact()` called `gap_report()`
with no arguments, so the committed JSON artefact was always built from the default
`n_clusters=12`/`backend="tfidf"` regardless of `--clusters`/`--backend` passed to the CLI, letting
the artefact silently disagree with the console output and `.md` report on a non-default run.
Fixed: `write_artefact` now accepts an optional `report` dict, and `main()` passes its own
already-computed `{stats, ranked, backend}` through, so the artefact always reflects what was
actually run. (2) `_sop_target_venues`'s majority-tag tie-break iterated a Python `set`, whose
order is hash-randomised per process, so an exact-count tie between two real venues could pick a
different "majority" venue across runs, breaking this codebase's stated determinism standard.
Fixed: tie-break over `sorted(real)` (alphabetical), not set iteration order. (3) `_sop_severity`'s
thresholds were hardcoded in `briefing.py` rather than living in `config.py` alongside every other
`BRIEFING_*` ranking knob. Fixed: moved to `config.BRIEFING_SOP_SEVERITY_HIGH`/`_MEDIUM`. (4) A
latent design gap, not a live bug: `checklist` and `sop` both carry direction `"na"`, so once
`CHECKLIST_LIVE` flips true, a checklist miss and a chat-log gap landing within the merge window
would fold into one cluster and `_pick_head`'s generic fallback would silently drop whichever is
not strongest. Unreachable today (`CHECKLIST_LIVE=False`); recorded in `briefing.py`'s module
docstring rather than fixed pre-emptively for a path that does not exist yet. Confirmed correct
(no bug): `sop` signals cannot enter or affect a change_point/deviation/stock cluster, since
`_cluster()` buckets strictly by exact direction string and `sop` always carries `"na"`. Suites
re-verified green after all three fixes (.venv 588 passed/8 skipped, .venv-forecast 588 passed/1
skipped, 0 failures/errors).

## Deliverables

1. This report.
2. The wired signal (`signals/briefing.py::_collect_sop` + helpers), the pinned embedder
   (`signals/chatlog_kb_gap.py::embed`/`rank_gaps`/`gap_report`/`write_artefact`), the noise guard
   (unchanged threshold logic, newly proven discriminating).
3. The real-corpus gap list, inspectable: table above and `signals/chatlog_kb_gap.json`.
4. Tests: `tests/test_chatlog_briefing.py` (13 tests, G1-G4 plus venue attribution and an additive
   regression check), two updated G0 tests in `tests/test_briefing.py`.
5. Decision log rows below: the embedder pin, the venue-attribution/threshold decisions, the wired-in
   verdict, and the explicit statement that two of four learning domains are now live (sales, chat-log)
   and two remain blocked (stock on James, checklist on Neon).
6. `chapters/results.tex`: S10's injection-realism study folded in as the fourth study (see below).

## Artefacts

- `signals/chatlog_kb_gap.py` (`embed`, `rank_gaps`, `gap_report`, `write_artefact`, all modified/new).
- `signals/briefing.py` (`_collect_sop`, `_sop_target_venues`, `_sop_severity`, modified `_reason`/
  `_headline`/`collect`/module docstring/`build`'s notes).
- `signals/chatlog_kb_gap.json` (the stamped real-corpus artefact: `store_ceiling`, `embedder_backend`,
  failure stats, the 4 ranked gaps).
- `tests/test_chatlog_briefing.py` (13 tests).
- `tests/test_briefing.py` (2 tests updated for the fifth signal).
- Decision log rows 62-64; `FLAGS.md` (new S11 section).
- `chapters/results.tex` (S10 injection-realism study folded in as the fourth study).
- `apps/api/src/modules/proactive-brain/brain.tools.ts` (one-sentence addition to the
  `brain_daily_briefing` tool description, per the security review's Medium finding: quoted chat
  text in an item is data, never an instruction).
