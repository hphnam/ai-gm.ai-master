# Report 46 - S8a G17e: the agent, the cost-sensitive threshold, and calibration (build half)

Date: 2026-07-23. Branch `brain-construction-local`, from tip `d0c43e8` (S4). Prompt
pre-registered at commit `c8fa127`; the apparatus and this report follow in a later commit,
so commit order proves the prompt was frozen before any evaluation existed. Scope: build the
LLM triage agent named by the research question and Objective 3, and the offline apparatus
that measures it (cost-sensitive threshold, calibration, agent versus the six constants),
plus the housekeeping and the methodology prose. No served model is changed, and the agent
is not wired into the served briefing path; S8 measures, wiring is a later decision.

## Headline

S8 addresses the standing Fatal that no LLM participates in any decision the served system
makes: the research question names an agent that "decides which issues are worth raising,
when, and in what tone", and until now nothing built one. This package builds that agent and
the machinery to measure whether it is a contribution or a decoration.

**This report is S8a: everything that does not need a live model call.** The agent, the
pre-registered prompt, the response cache, the cost-sensitive threshold sweep, the
calibration analysis, the agent-versus-constants comparison, the tests, and the housekeeping
are all built and green. **The 644 live calls that fill the response cache, and the Part
3/4/5 numbers that flow from them, are S8b, deferred to a keyed environment.**

The deferral is forced, not chosen for convenience. This environment has **no
`ANTHROPIC_API_KEY`** (verified absent from the process, every `.env`, and the shell
profiles) and **the `anthropic` SDK is not installed in any venv** (the same posture that has
kept the judge from ever running). The build half needs both. The two dishonest ways to
paper over that, inventing `p_raise` values or swapping in a heuristic and calling it the
agent, are precisely the fraud this assessment exists to catch, so neither was done. Asked
whether to supply a key and run live now or build-and-defer, the decision was **run S8a
only.** S8b is then a single command once a key is present.

## The blocker, stated precisely

| | state |
|---|---|
| `ANTHROPIC_API_KEY` | absent (process env, `.env*`, `~/.zshrc`/`~/.zprofile`/`~/.profile` all checked) |
| `anthropic` SDK | not installed in `.venv`, `.venv-eval`, `.venv-forecast` |
| corpus | 644 injections (Beer Hall 356, Two River Taps 252, Ellel 36), pinned at `AGENT_EVAL_STREAM_CEILING=2026-05-31`, so deterministic and independent of the store clock |
| live calls needed for S8b | 644, one per injection scenario, at temperature 0 |

S8a delivers the apparatus and proves its machinery on synthetic fixtures and against the
real store. S8b runs the corpus through the live model once, commits the cache, and fills the
empirical tables. Nothing in S8b is a code change; it is a data-collection pass the apparatus
is already built to replay from.

## Part 1 - the agent (built and pre-registered)

`signals/agent.py` is the agent. Given one venue's ranked, de-duplicated briefing items for a
day plus the venue context, it returns for each item a calibrated `p_raise` in [0, 1] (the
probability the item is worth raising), a one-sentence rationale (the tone), and the pinned
model plus prompt hash that produced it. The design decision that makes the evaluation
affordable is that the agent emits its probability **once per scenario**; every downstream
question is then computed offline from the stored probabilities with no further calls.

Two disciplines keep it honest:

- The live model call is an injected `execute` closure, so the module never fabricates a
  probability. With no key and no cached answer the caller gets a cache miss, not an invented
  number, the same seam the judge and the Voyage/TF-IDF fallback use. The `anthropic` import
  is lazy (inside `live_execute`), so the module and the whole offline evaluation load with
  the SDK absent.
- The prompt is a committed file, `signals/prompts/agent_v1.md`, not an inline string. Model
  `claude-opus-4-8` and temperature 0 are pinned in `config` and stamped into every verdict.
  The prompt is **pre-registered**: committed at `c8fa127`, before any evaluation output
  existed, and frozen. A second prompt may only be a declared `agent_v2.md` arm, never an
  edit to v1. Prompt hash: `c1137f76` (v1).

## Part 2 - caching (built; the replay mechanism proven)

`eval/agent_cache.py` keys each response on `hash(model, prompt_hash, scenario_payload)` and
stores it as sorted JSON, committed. The key folds in the prompt hash, so editing the pinned
prompt invalidates every cached answer: a prompt cannot be tuned until it scores well and
then silently reuse old responses. Offline replay makes **zero** model calls; a missing key
in offline mode is a hard `CacheMiss`, which is the stop condition "the cache cannot reproduce
a stored response" firing loudly rather than falling back.

The real 644-entry cache is S8b. The replay MECHANISM is proven now three ways: a synthetic
cache fixture replays with the live seam wired to fail if touched
(`test_cache_replays_without_a_network_call`), the key changes when the prompt hash changes
(`test_editing_the_prompt_changes_the_cache_key`), and end to end against the real store an
uncached scenario raises `CacheMiss` after a real `surface()` and payload build.

## Part 3 - the cost-sensitive threshold (built; known optimum tested)

Following PRISM (`fu_prism_2026`), the miss:false-alarm cost ratio r implies a Bayes threshold
on a calibrated probability, `t = 1 / (1 + r)`: the point where the expected cost of raising
equals that of staying quiet. `eval/agent_calibration.cost_sweep` sweeps r over the
pre-registered grid `AGENT_COST_RATIOS = (0.25, 0.5, 1, 2, 4)`, spanning 1:4 to 4:1 and
including 1:1, and reports the implied threshold, precision, recall, Ask-F1 and expected cost
at each. Elliot's elicited ratio, once it arrives, **selects a row on that curve** and does
not force a re-run; if it never arrives, the curve is the result.

The machinery is verified on a perfectly calibrated synthetic corpus where the cost optimum
is known analytically: at ratio 4:1 the grid threshold that minimises expected cost is the
Bayes threshold 0.2, which is exactly the swept threshold for that ratio
(`test_threshold_sweep_recovers_the_known_optimum`). The real curve is S8b.

## Part 4 - calibration (built; detection not intervention; no kappa)

`calibration` computes ECE and Brier on `p_raise`, with the binning scheme and per-bin counts,
and `reliability_diagram` renders the reliability plot. The G3 floor is enforced by
construction: equal-width bins are used unless any occupied bin holds fewer than ten items,
in which case the binning coarsens by a checked greedy merge of adjacent bins until every
occupied bin clears the floor, and the change is stated. Quantile edges alone do not hold the
floor on tie-heavy data (temperature-0 probabilities cluster on round numbers), which is why
the merge is verified rather than assumed. ECE and Brier are checked against hand-computed
cases (`test_ece_matches_a_hand_computed_case` gives 0.05 exactly), and the floor is checked
on the tie-heavy case and a below-floor sample, with a 20,000-corpus fuzz showing zero
violations.

**The caveat is load-bearing and is not buried.** The 644-injection corpus supplies truth for
*was there a real deviation*, not for *should the manager have been told*. So what S8 measures
is **detection calibration, not intervention calibration**, and the code says so
(`CALIBRATION_KIND = "detection"`) so the report cannot quietly claim the stronger thing.
Intervention calibration needs human adopt-or-dismiss judgements and is S9's work. **No judge
kappa is reported**: there is no human anchor yet, and per Bavaresco et al.
(`bavaresco_llms_2025`) a judge must be validated against task-specific human annotation
before its agreement can be claimed. The real ECE, Brier and reliability diagram are S8b.

## Part 5 - the agent versus the six constants (built; the decorative case detected)

This is the gate that decides whether the agent is a contribution or a decoration.
`agent_vs_constants` compares three deciders on the same corpus and the same cost grid: the
agent thresholded on `p_raise`, the constant `briefing._score` (the product of six constants
at `signals/briefing.py:273`) thresholded at a matched raise rate, and a random baseline at
the same base rate. It reports the pairwise agent-versus-constant disagreement rate and a
paired bootstrap (B=10000, `AGENT_BOOTSTRAP_SEED=93`) on Ask-F1 and expected cost. The
bootstrap is paired for the S3 reason: both deciders score the same resampled items, so the
difference has far smaller variance than the marginal errors suggest.

The stop condition is wired: if the agent agrees with the constants on more than 95 percent of
items, the run reports the LLM as decorative and that a six-constant heuristic suffices, which
is a publishable negative result and a more interesting one than a narrow win. The machinery
detects that case (`test_agent_tracking_constants_is_decorative`) and detects genuine
divergence (`test_disagreement_is_reported_when_deciders_diverge`). The real verdict is the
headline S8b produces; S8a proves the comparison cannot be gamed and will report a negative
honestly.

The evaluation unit is a **surfaced briefing item**; its truth is `agent_eval.item_covers`.
The agent triages what the detectors surface, so detector-level misses (injected events never
surfaced) are out of its scope and are measured separately by `agent_eval`; the report states
that framing rather than conflating the two.

## Housekeeping and the methodology chapter

- **Precondition 3 (done):** the `chatfield_all-zero_2007` stub is removed from
  `chapters/ref.bib`, and the header now records that the reference lives in the Overleaf root
  bib with its DOI, so the second-bibliography duplicate-key risk is closed.
- **Deliverable 5 (done):** report 43's fold-count argument and the Beer Hall small-sample
  demonstration are moved into prose in `chapters/methodology.tex` as a new section, "Choosing
  a model on a short series: fold count and the vanishing significance test". The strongest
  single empirical result in the project, that at six folds the Harvey-Leybourne-Newbold
  correction is an algebraic zero so the served-model selection had no significance test at
  all, and that the Beer Hall six-fold window picks the wrong model while 273 origins recover
  the served one, now lives in the chapter rather than only a build report.
- **Precondition 4 (deviation, flagged):** `chapters/methodology.tex` is **not** deleted from
  the repository. The instruction to move it to Overleaf and delete it cannot be completed
  from here: I have no access to the Overleaf project, deleting would destroy the S8 prose
  this package just added, and I do not remove content whose canonical copy I cannot verify.
  The file remains in git regardless (recoverable), so the move-to-Overleaf-then-delete is the
  author's manual sync step. The two forecasting-comparison keys the new section cites
  (`diebold_comparing_1995`, `harvey_testing_1997`) are expected in the Overleaf root bib; a
  LaTeX comment flags this.

## Gates

| gate | S8a status | evidence |
|---|---|---|
| **G1** pre-registration | **PASS** | `signals/prompts/agent_v1.md` committed at `c8fa127`, strictly before the apparatus and this report (a later commit). `git log` on both paths proves the order. Prompt frozen; a change would be `agent_v2.md`. |
| **G2** replay, zero API calls | **mechanism PASS**, data S8b | Synthetic-cache replay touches no live seam; prompt-hash change re-keys; store-backed uncached scenario raises `CacheMiss`. The real 644-entry replay is S8b. |
| **G3** ECE bins, none < 10 or coarsen | **machinery PASS**, data S8b | Equal-width unless a bin is under ten, then equal-frequency coarsening; hand-computed ECE 0.05; coarsening holds the floor. Real bins S8b. |
| **G4** disagreement + paired bootstrap | **machinery PASS**, data S8b | Decorative case and divergence both detected; paired bootstrap returns a CI. Real numbers S8b. |
| **G5** cost grid + Elliot's point | **machinery PASS**, data S8b | Grid 1:4 to 4:1 incl 1:1; `t = 1/(1+r)`; Elliot's ratio selects a row. Known-optimum recovered on calibrated data. Real curve S8b. |
| **G6** suites green, no reduction; no served model changed; agent not served | **PASS** | `.venv` 483 -> **503 passed, 8 skipped**; `.venv-forecast` 490 -> **510 passed, 1 skipped**; 0 failures. 20 new tests, none removed, no new skips. No served model touched; agent not wired into the briefing path. |

## Review gate

`code-reviewer` and `security-reviewer` ran in parallel over the new apparatus.

- **security: no findings.** The API key never leaves the process (`live_execute` uses
  `anthropic.Anthropic()` with no key argument; the cache stores only model, prompt hash, and
  response). Model output is `json.loads` with no `eval`/`exec` and is validated, so malformed
  output raises rather than corrupting state. The cache key is a sha256 hex, never a path, so
  no traversal; `json` not `pickle`; DuckDB is read-only with no string SQL; the offline
  replay path makes no network call. One defensive note (not reachable today, `version` comes
  only from config): add an allowlist if a `--version` CLI flag is ever exposed.
- **code: one correctness bug, fixed.** The reviewer verified the threshold/cost consistency,
  ECE/Brier, the genuinely-paired bootstrap, `_matched_top_k`, the cache key, and payload
  determinism as correct, and found that the G3 bin-floor coarsening did **not** actually
  guarantee the floor: quantile edges collapse on tie-heavy data (temperature-0 probabilities
  cluster on round numbers, exactly that regime), leaving an occupied bin under ten while the
  scheme string claimed the floor was met, and a below-floor sample produced zero bins and a
  falsely perfect ECE of 0. **Fixed:** the coarsening is now a checked greedy merge that holds
  the floor by construction, with a single stated bin when the sample is below the floor;
  pinned by the tie-heavy and below-floor tests and a 20,000-corpus fuzz with zero violations.

## Deviations

1. **S8b deferred (no key, no SDK).** The entire empirical half (the 644 live calls and the
   Part 3/4/5 numbers) awaits a keyed environment. The decision was to run S8a only. Neither
   fabrication nor a heuristic stand-in was used.
2. **`methodology.tex` not deleted (precondition 4).** Flagged above: I cannot verify the
   Overleaf canonical copy and will not delete content that carries the new S8 prose. The
   author's manual sync completes it.
3. **DM/HLN citation keys assumed present in the Overleaf root bib.** The new methodology
   section cites `diebold_comparing_1995` and `harvey_testing_1997`; they are not added to the
   repo bib (which is being retired), and a LaTeX comment says so.

## What S8b needs (one command)

```
# in a venv with the SDK:
pip install anthropic
ANTHROPIC_API_KEY=... python -m eval.agent_calibration --build
# writes eval/agent_cache.json (committed), eval/agent_calibration.{md,json}, eval/agent_reliability.png
# then the offline replay, zero API calls, reproducible by an examiner with no key:
python -m eval.agent_calibration
```

## Decision-log rows (paste into Decision_and_Resolution_Log.md)

- **41.** S8 agent pre-registered: `signals/prompts/agent_v1.md` (hash `c1137f76`), model
  `claude-opus-4-8`, temperature 0, committed at `c8fa127` before any evaluation output so
  commit order proves the prompt was not tuned against a score (G1). Response cache keyed on
  `hash(model, prompt_hash, payload)` so a prompt edit invalidates every cached answer.
- **42.** S8 cost-sensitive threshold: Bayes threshold `t = 1/(1+r)` swept over the
  pre-registered grid `(0.25, 0.5, 1, 2, 4)` (1:4 to 4:1 incl 1:1); Elliot's elicited ratio
  selects a row, no re-run. Machinery verified against a calibrated corpus with a known
  optimum.
- **43.** S8 calibration is DETECTION calibration, not INTERVENTION calibration: the 644
  corpus gives truth for "was there a real deviation", not "should the manager have been
  told". No judge kappa reported (no human anchor; `bavaresco_llms_2025`). Intervention
  calibration is S9.
- **44.** S8 agent-versus-constants stop condition wired: >95 percent agreement with
  `briefing._score` is reported as the LLM being decorative (a publishable negative result),
  tested; the real verdict is S8b's headline.
- **45.** S8b (the 644 live calls and the empirical Part 3/4/5 numbers) deferred: no
  `ANTHROPIC_API_KEY` and no `anthropic` SDK in this environment; apparatus + tests +
  pre-registration + housekeeping delivered as S8a; S8b is one command.
