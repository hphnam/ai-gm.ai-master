# AutoResearchClaw — stage reference

Source: `github.com/aiming-lab/AutoResearchClaw`, shallow clone of `main`,
2026-07-30. Distilled for PRJ93 to locate where human gates buy the most
output quality.

**Method.** README + `docs/integration-guide.md` fetched directly. The 84k-line
source was read by six delegated subagents (one per stage cluster + one for the
cross-cutting HITL layer), each capped at 400 lines of findings, per
`brain/PRJ93_RULES.md`. The stage 16–19 subagent died on a spend limit; that
cluster was filled in by hand with bounded `grep -n` + line-range reads of
`_paper_writing.py`, `_review_publish.py:138-374`, and `prompts/ml.py:946-1160`.

**Confidence.** Line references were reported by subagents and spot-checked, not
re-verified line by line. Stage 18/19 findings below are first-hand. Where a
subagent could not find a call site it said so; those are marked *unverified
negative* — per the graphify lesson in `ledger/phase_state.md`, absence found by
grep is weaker evidence than presence.

**Prompt banks are per-domain.** `prompts/ml.py`, `prompts/hep.py`,
`prompts/biology.py` are the live source of truth, selected by
`PromptManager.__init__`. The repo-root `prompts.default.yaml` is a stale
`export_yaml()` snapshot and disagrees with `ml.py` in several places — do not
read it as "the prompt".

---

## 1. Stage table

`GATE` = hard human gate. Word "LLM-asserted" means the criterion exists only as
prompt text with no code check.

| # | Stage | Goal | Inputs | Outputs | Method / skill | Advance criterion | Failure → pivot | Unattended? |
|---|---|---|---|---|---|---|---|---|
| 1 | TOPIC_INIT | SMART research goal | config only | `goal.md`, `hardware_profile.json` | 1 LLM call + `detect_hardware` (nvidia-smi → MPS → CPU) | file written non-empty | `max_retries=0` | yes |
| 2 | PROBLEM_DECOMPOSE | goal → sub-questions | `goal.md` | `problem_tree.md`, `topic_evaluation.json` | 1 LLM call; 2nd call scores novelty/specificity/feasibility 1–10 | file written | score <5 logs a warning **only** | yes |
| 3 | SEARCH_STRATEGY | plan queries | `problem_tree.md` | `search_plan.yaml`, `sources.json`, `queries.json` | LLM plan + deterministic fallback query builder | ≥1 query survives; auto-supplements to 8 | silent fallback, logged | yes |
| 4 | LITERATURE_COLLECT | fetch candidates | `queries.json` | `candidates.jsonl`, `references.bib` | OpenAlex → Semantic Scholar → arXiv, per-source try/except + disk cache; dedup DOI > arXiv id > fuzzy title | `candidates.jsonl` non-empty | `max_retries=2`; ultimate fallback fabricates `[Placeholder] Study N` rows | yes |
| 5 | **LITERATURE_SCREEN** `GATE` | filter to shortlist | `candidates.jsonl` | `shortlist.jsonl` | keyword pre-filter (≥1 hit) then 1 LLM relevance+quality call | shortlist ≥15 after supplementation | model rejects all → `PAUSED`; gate reject → rollback to **4** | **no** |
| 6 | KNOWLEDGE_EXTRACT | structured cards | `shortlist.jsonl` | `cards/` | 1 LLM call, json mode | `cards/` non-empty | empty shortlist → `PAUSED` (backstop for `--auto-approve`) | yes |
| 7 | SYNTHESIS | cluster + find gaps | `cards/` (first 24) | `synthesis.md` | 1 LLM call | unconditional DONE | none | yes |
| 8 | HYPOTHESIS_GEN | falsifiable hypotheses | `synthesis.md` | `hypotheses.md`, `novelty_report.json` | **3 role agents, 1 round each, + 4th synthesiser call** | unconditional DONE | novelty `abort` recommendation is **written but never read** | yes |
| 9 | **EXPERIMENT_DESIGN** `GATE` | plan with baselines | `hypotheses.md` | `exp_plan.yaml` | LLM + 6-deep YAML parse cascade + condition cap (8/12/20 by budget) | ≥1 of baselines/methods/ablations non-empty | all three empty → `PAUSED`; gate reject → rollback to **8** | **no** |
| 10 | CODE_GENERATION | experiment code | `exp_plan.yaml` | `experiment/`, `experiment_spec.md` | LLM + AST security validator + immutable harness | no `error`-severity issues after ≤5 repairs | else `FAILED`; `max_retries=2` | yes (gated only on `hep_ph`) |
| 11 | RESOURCE_PLANNING | GPU/time estimate | `exp_plan.yaml` | `schedule.json` | 1 LLM call, template fallback | always DONE | none | yes |
| 12 | EXPERIMENT_RUN | execute | `schedule.json`, `experiment/` | `runs/`, `results.json` | subprocess / Docker / SSH / Colab / simulated | ≥1 real finite metric | **3 hard fabrication guards** → `FAILED` | yes |
| 13 | ITERATIVE_REFINE | self-heal + improve | `runs/`, `experiment/` | `refinement_log.json`, `experiment_final/` | LLM rewrite → validate → repair → re-run, ≤10 iters | best metric improves | 2 no-improve iters → converged; 3 no-metric iters → stop. Always DONE | yes |
| 14 | RESULT_ANALYSIS | quantify + critique | `runs/`, `exp_plan.yaml` | `analysis.md`, `experiment_summary.json`, `charts/` | **3 role agents + synthesiser**; bootstrap CI, paired t-test in code | always DONE | partial role failure degrades silently | yes |
| 15 | RESEARCH_DECISION | PROCEED/PIVOT/REFINE | `analysis.md` | `decision.md` | 1 LLM call + 3 deterministic hint injections | keyword parsed from output | no keyword → `PAUSED`; `MAX_DECISION_PIVOTS=2` then **forced PROCEED** | yes |
| 16 | PAPER_OUTLINE | section plan | `analysis.md`, `decision.md` | `outline.md` | 1 LLM call; 3 candidate titles rated 1–5 on 3 axes | file written | none | yes |
| 17 | PAPER_DRAFT | full draft | `outline.md` | `paper_draft.md`, `draft_quality.json` | **3 sequential LLM calls** + deterministic `_validate_draft_quality` | always DONE | failed call → literal `[PLACEHOLDER]` text in draft | yes |
| 18 | PEER_REVIEW | simulated review | `paper_draft.md`, evidence | `reviews.md` | **1 LLM call role-playing 3 reviewers** | always DONE | none — no score, no threshold | yes |
| 19 | PAPER_REVISION | address reviews | `paper_draft.md`, `reviews.md` | `paper_revised.md` | 1 LLM call + length-guard retry | always DONE | both attempts short → revert to original draft | yes |
| 20 | **QUALITY_GATE** `GATE` | score the paper | `paper_revised.md` | `quality_report.json` | 1 LLM call scoring 1–10 + `VerifiedRegistry` zero-value hard block | `score >= threshold` (default 5.0) | `FAILED`, or `degraded` if `graceful_degradation`; gate reject → rollback to **16** | **no** |
| 21 | KNOWLEDGE_ARCHIVE | retrospective | `paper_revised.md` | `archive.md`, `bundle_index.json` | 1 LLM call | always DONE | only `NONCRITICAL` stage — its failure never aborts | yes |
| 22 | EXPORT_PUBLISH | LaTeX + PDF | `paper_revised.md`, `references.bib` | `paper.tex`, `paper.pdf`, `charts/` | regex md→tex converter (stdlib only), `pdflatex` ×3 passes | always DONE | compile failure → warning comment prepended, still DONE | yes |
| 23 | CITATION_VERIFY | fact-check refs | `references.bib`, `paper_final.md` | `verification_report.json`, `references_verified.bib` | DOI/CrossRef+DataCite → OpenAlex → arXiv → S2; word-overlap similarity | always DONE | **no FAILED path exists**; >50% stripped → restore original bib | yes |

---

## 2. Per-stage reasoning and critique layer

### 1–2 · Scoping
The novelty demand is entirely rhetorical: *"Check: would a reviewer say 'this is
already well-known'? If so, find a sharper angle."* (`prompts/ml.py:151-157`).
Paired with an anti-fabrication instruction — *"Do NOT fabricate specific paper
titles or citations — actual papers will be retrieved in the literature search
stage"* (`ml.py:180-183`) — which is the right sequencing instinct.

Stage 2 runs a genuine self-assessment (`_topic.py:178-180`: *"Score 1-10 on: (a)
novelty, (b) specificity, (c) feasibility. If overall score < 5, suggest a
refined topic"*) and then throws it away: `if overall < 5: logger.warning(...)`.
The whole block is inside `try/except Exception: logger.debug` — it can fail
silently and nothing notices. **This is the template failure mode of the whole
system: compute a quality signal, write it to disk, never branch on it.**

There is also an internal contradiction — the contract's definition-of-done says
`">=3 prioritized sub-questions"` while the prompt asks for at least 4. Neither
is checked.

### 3–4 · Search
Query hygiene is unusually good and worth copying. Queries over 60 chars are
mechanically shortened to ≤6 keywords; if fewer than 5 unique queries survive,
keyword-window variants are synthesised up to 8. The prompt carries an explicit
ban list of schema keys the model tends to hallucinate (`ml.py:236-241`).

Source ordering is deliberate and documented in code: *"OpenAlex first (10K/day),
then S2 (1K/5min), then arXiv (1/3s) — least pressure on the most restrictive
API"* (`literature/search.py:34-36`). Dedup priority DOI > arXiv id > normalised
title, keeping the higher citation count on collision.

The dangerous part is the terminal fallback. If every source fails, stage 4
fabricates `[Placeholder] Study N on {topic}` rows flagged `is_placeholder:True`
and the pipeline continues. Nothing downstream is required to check that flag.

### 5 · LITERATURE_SCREEN (gate 1)
Two-phase. A deterministic keyword pre-filter with a documented history —
*"T2.2: Relaxed from ≥2 to ≥1 keyword hit — previous threshold was too
aggressive (94% rejection rate)"* (`_literature.py:678-681`) — then one LLM call
with a genuinely strict persona: *"You are a strict domain-aware reviewer with
zero tolerance for cross-domain false positives... A paper about 'normalization
in database systems' is NOT relevant to 'normalization in deep learning'"*
(`ml.py:263-272`).

The screening rules are the most transferable prompt in the repo
(`ml.py:283-298`): domain match, method relevance, cross-domain rejection,
recency preference *"but accept foundational papers (pre-2020) if they introduced
key techniques still in use today"*, a pre-vetted-seminal carve-out at
`relevance_score >= 0.7`, and a quality floor rejecting papers with no abstract,
no venue and no citation count.

Two soft spots. `quality_threshold` is interpolated into the prompt text and
never re-checked in code — there is no `if quality_score < threshold: drop`
anywhere. And `_MIN_SHORTLIST = 15` is enforced by *backfilling* from the
pre-filtered pool with synthetic descending scores (`0.75 - idx*0.02`) when the
model returns too few. A shortlist of 15 is therefore not evidence that 15
papers passed screening.

The one place the system refuses to paper over a problem: if the model rejects
everything, it returns `PAUSED` with *"consider rerunning SEARCH_STRATEGY with
refined queries before resuming"* rather than backfilling. Good instinct,
undercut by the gate wrapper — `executor.py:766-787` overwrites the status to
`BLOCKED_APPROVAL` unconditionally, clobbering the `rejected_all` semantics into
a generic approval prompt.

### 7–8 · Synthesis and hypothesis debate
Stage 8 is a real multi-agent structure and the cleanest thing in the codebase to
copy. Three roles from a domain bank — ML: `innovator` (bold/high-risk),
`pragmatist` (feasible/incremental), `contrarian` (devil's advocate); HEP:
theorist / phenomenologist / experimentalist. Each gets **one independent LLM
call with no visibility into the others**. One round only — no rebuttal.

Resolution is a fourth call with a "senior research director" persona whose
instruction is the interesting part (`prompts/shared.py:750-768`): *"The best
synthesis is not a compromise but takes the strongest elements from each
viewpoint. Preserve genuine disagreements — do not flatten controversy."* Its
task list requires it to *"Note unresolved disagreements between perspectives"*
and, per hypothesis, a *"rationale, measurable prediction, failure condition"*.

**No role can veto.** The synthesiser is free to discard the contrarian entirely.
"Falsifiable" appears only in prompt text and a DoD string — a repo-wide grep
found no code that counts, parses or judges falsifiability. Non-falsifiable
hypotheses advance without complaint.

The novelty check computes a real score with bands (`>=0.7` high, `>=0.45`
moderate, `>=0.25` low, else critical) and a recommendation including `abort`.
It is wrapped in a bare `except Exception` and its recommendation is never read
by control flow.

### 9 · EXPERIMENT_DESIGN (gate 2)
Most defended stage in the pipeline. The YAML parse cascade has six fallbacks —
fenced block → whole-response parse → regex key scrape → a strict retry
(*"Output ONLY valid YAML. No prose"*) → regex extraction from the hypotheses
text → a fully generic topic-derived placeholder plan.

The literal advance condition (`_experiment_design.py:346-382`):

```python
_required_any = ("baselines", "proposed_methods", "ablations")
if not any(_normalized.values()):
    return StageResult(..., status=PAUSED, decision="schema_deficient", ...)
```

Any **one** of the three non-empty passes. A plan with baselines but zero
ablations advances silently.

Budget-aware constraints get injected as hard prompt rules — under 3600s,
*"You MUST use ONLY classic control environments... Do NOT use MuJoCo"*; under
1800s, *"use ONLY CartPole-v1 or Pendulum-v1"*. Condition count is capped at
8/12/20 by time budget, trimming proposed methods first.

One real bug: the hardware profile fed to this stage's prompt is a hardcoded
string, `"- GPU: NVIDIA RTX 6000 Ada (49140 MB VRAM)"` (`:192-196`), not the
profile stage 1 detected. Stage 10 loads the real one. So the experiment is
*designed* against fictional hardware and *coded* against real hardware.

### 10 · Code generation
The security model is the strongest engineering in the repo and is transferable
wholesale. An `ast.NodeVisitor` blocks `os.system/popen/exec*`, `os.remove`,
`subprocess.*`, `shutil.rmtree`, the `eval`/`exec`/`compile`/`__import__`
builtins, and hard-bans importing `subprocess, shutil, socket, http, urllib,
requests, ftplib, smtplib, ctypes, signal` regardless of use.

The immutable harness (`experiment/harness_template.py:1-12`) is the key idea:

> *"This file is NOT editable by the LLM agent — it provides a trust boundary
> for metric reporting, inspired by karpathy/autoresearch's immutable
> prepare.py."*

It is injected verbatim into the sandbox, is the **sole writer** of the canonical
`results.json`, stops at 80% of the time budget, and `sys.exit(1)`s after five
non-finite metrics. Everything downstream that claims to be "verified data"
traces to this file. A generated experiment cannot report a number without going
through code the model never sees.

Repair loop: `max_repair = 5`, and only `error`-severity issues trigger repair —
warnings never block. Also a prompt-level anti-substitution rule worth stealing:
*"Do NOT replace the stated method with a deep-learning proxy (e.g. ResNet,
BERT, GPT, Gymnasium+SB3) unless the topic EXPLICITLY requires deep learning."*

### 12 · Execution — the only real fabrication firewall
Three hard guards (`_execution.py:498-567`), sandbox/docker modes only:

1. zero real metrics **and** run failed → `FAILED`, *"must not proceed to paper
   writing without experiment data"*
2. zero real metrics **and** stdout contains a traceback despite exit 0 → `FAILED`
3. completed, zero real metrics, elapsed < 30s → `FAILED` (*"likely a
   misclassified crash"*)

These are the only `FAILED` returns in the stage, and they are covered by real
tests that call the function rather than asserting on mocks. Note the asymmetry:
non-finite metrics are silently dropped at parse time (`parse_metrics` skips
NaN/Inf with a warning), so "zero real metrics" is the trigger, not "bad
metrics".

### 13 · Iterative refine
`max_iterations = max(1, min(requested, 10))`. Three independent stop conditions:
wall-clock cap (`1.5 ×` per-iteration budget), `consecutive_no_metrics >= 3`, and
the convergence rule `no_improve_streak >= 2` — where the streak only increments
when a real metric was produced but failed to beat the best. Improvement resets
it to zero.

Nice touch: a metric-saturation detector (last two metrics both ≥0.999 or ≤0.001,
or relative change <0.001) that does *not* stop the loop but injects a
difficulty-upgrade instruction into the next prompt — the system noticing it has
saturated its own benchmark and asking for a harder one.

Always returns DONE. An experiment that never works simply carries the stage-12
baseline forward.

### 14 · Result analysis — real statistics, real debate
Three roles, independent calls: `optimist`, `skeptic` (*"question the
significance of results with maximum rigor... statistical concerns
(significance, sample size, multiple comparisons)"*), `methodologist` (*"audit
internal/external validity, reproducibility, baseline fairness, evaluation
protocols... ablation completeness"*). Synthesiser instruction: *"Find the truth
— if the skeptic or methodologist raise valid concerns, acknowledge them. Do not
suppress criticism."* It must rate result quality 1–10 and give a
PROCEED/PIVOT/REFINE lean.

Computed **in code**, not asserted by the model:
- mean/std per condition, gated on ≥3 seeds
- bootstrap 95% CI, 1000 resamples, seeded `random.Random(42)`, percentile
  method, sanity-checked to contain the mean else replaced by `mean ± 1.96·SE`
- paired t-test vs the alphabetically-first baseline over common seeds, `scipy`
  if available else an erf approximation with a small-df correction — and it
  *prefers its own value* over the experiment code's `PAIRED:` stdout when those
  look suspiciously identical
- deterministic anomaly detectors: identical-across-conditions ablation failure,
  <1% near-identical warning, zero-variance detector, `n_seeds < 3` warning

Everything past that is LLM prose. There is **no post-hoc check that numbers in
`analysis.md` match `experiment_summary.json`** — only the prompt instruction
*"Use the ACTUAL quantitative values provided above — do NOT invent numbers."*
If one role's call throws it is dropped with a warning; below 2 of 3 surviving
it logs an error and proceeds anyway.

### 15 · Research decision
Three deterministic hints are injected before the LLM call, each encoding a
lesson about wasted loops:
- degenerate-refine: metrics all saturated or all identical → *"Further REFINE
  cycles CANNOT fix this... choose PROCEED with a quality caveat"*
- diagnosis: *"If the same issues persist after 2+ REFINE cycles, choose PROCEED
  with appropriate quality caveats"*
- ablation quality: >50% of ablations within 2% of baseline → *"STRONG
  RECOMMENDATION: Choose REFINE"*

Parsing degrades to "whichever keyword appears last in the text wins". No keyword
at all → `PAUSED, decision="undecided"`.

`MAX_DECISION_PIVOTS = 2`, then `"Max pivot attempts reached — forcing PROCEED"`
(`runner.py:807-809`). A quality warning is written to disk; the pipeline
proceeds to paper-writing regardless. **There is no terminal "this research
failed, do not write it up" state.** That decision is deferred entirely to gate 3.

### 16–17 · Outline and draft
Stage 17 is three sequential LLM calls, not one: (1) Title+Abstract+Intro+Related
Work, (2) Method+Experiments, (3) Results+Discussion+Limitations+Conclusion. HEP
uses a different split. A failed call writes literal `[PLACEHOLDER — LLM call
failed. Please regenerate this stage.]` into the draft and continues.

The `paper_draft` system prompt is 31 numbered rules and is the single most
reusable artifact in the repo for dissertation work. The evidence-bounding block
in particular:

> *"7. EVERY claim in the title, abstract, and conclusion MUST be directly
> supported by specific experimental metrics provided below. 8. If the experiment
> only covers partial conditions, the title MUST NOT make global causal claims.
> Use 'Toward...', 'Investigating...', or 'An Empirical Study of...' instead of
> 'X Dominates Y'. 9. BEFORE writing the title, list the conditions actually
> tested and their metric values."*

And the statistical block: every table carries 95% CIs; every comparison cites a
p-value or states non-significance; *"25. If the proposed method does NOT
statistically significantly outperform a baseline, do NOT claim superiority.
Reframe as 'comparable', 'competitive', or 'negative result'."* Plus
failure-aware reporting — report both conditional and unconditional metrics,
*"Without both, comparative claims are biased by survivorship."*

`_validate_draft_quality` is deterministic and runs after drafting: per-section
word counts against targets (warn below `0.7×lo`, above `1.3×hi`), bullet-density
per section (bullets tolerated only in Intro/Limitations/Abstract), and a
largest-to-smallest main-section balance ratio. It emits `overall_warnings` and
`revision_directives` into `draft_quality.json` — which stages 18 and 19 both
consume. This is the one quality signal in the system that is actually wired
into a downstream consumer.

### 18 · PEER_REVIEW — the biggest gap between architecture and marketing
Read `_review_publish.py:138-209` before trusting any description of this stage.

**It is one LLM call.** The prompt says *"Simulate peer review from at least 3
reviewer perspectives... Reviewer A (methodology expert), Reviewer B (domain
expert), and Reviewer C (statistics/rigor expert)"* — a single model writes all
three in one response. This is not the architecture used at stages 8 and 14,
which do issue independent per-role calls with a separate synthesiser. **The
review stage is the one place multi-agent structure would matter most, and it is
the one place it was not used.** Three personas from one model in one context
share every blind spot; they cannot disagree in any load-bearing sense.

Consequently:
- **How many roles:** 3, by prompt convention, in one call.
- **Disagreement resolution:** none exists. Nothing aggregates them.
- **Revision loop trigger:** none. Control flow is linear 18 → 19 → 20. Stage 19
  runs exactly once. There is no round counter and no "revise until acceptable".
- **Acceptance threshold:** none at this stage. `_execute_peer_review` returns
  `StageStatus.DONE` unconditionally; it produces no score.
- **Veto:** impossible. No role has any mechanism to halt anything.

What it does have is eight named checks (`ml.py:1100-1118`), and they are good —
topic alignment, per-claim evidence alignment, statistical validity (*"Are CIs or
error bars reported? Is n>1 (multiple seeds)?"*), completeness against a
5,000–6,500 word body, reproducibility, writing quality (bullets flagged in
Method/Results/Discussion, title ≤14 words), figures (*"Zero figures = desk
reject"*), and citation distribution (*"Are citations only in Intro/Related Work?
Method, Experiments, and Discussion MUST also cite"*). The "evidence consistency
check" the README advertises is check 2, plus the injection of stage 17's
automated warnings under the heading *"AUTOMATED QUALITY ISSUES (flag these in
your review)"* — i.e. deterministic findings are handed to the reviewer persona
to restate, rather than enforced.

With no LLM configured, the fallback `reviews.md` is a hardcoded two-reviewer
stub, so a keyless run produces a plausible-looking review file containing
nothing.

### 19 · Revision
One call. The interesting machinery is the length guard: if the revision is under
80% of the draft's word count it retries once with *"Your revision MUST be at
least {draft_word_count} words... Copy each section verbatim and ONLY make
targeted improvements."* If both attempts come back short it discards the
revision entirely, keeps the original draft, and files the revision text as
`revision_notes_internal.md`. A sound bias — losing content silently is worse
than not revising — but it means a run can report a completed revision stage
whose output is byte-identical to the input.

The revision system prompt carries the honesty rules that matter most:
*"After reviewing experimental evidence, UPDATE the title if results do not
support the original claim. If the proposed method does NOT beat baselines, use
a title like 'An Empirical Study of...', 'When X Falls Short: ...'... Rewrite the
abstract to accurately reflect what was FOUND, not what was hoped."*

Anti-fabrication is injected here too: *"Do NOT add new numbers that are not in
the experiment data above. If a reviewer asks for additional results you do not
have, state 'Due to computational constraints, this analysis was not conducted'
instead of fabricating data."*

### 20 · QUALITY_GATE (gate 3)
Two independent blocks. The LLM scores the paper 1–10 against
`config.research.quality_threshold or 5.0`; below it the stage returns `FAILED`
— unless `graceful_degradation` is set, in which case it returns DONE with
`decision="degraded"` and writes `degradation_signal.json`, which stage 22 turns
into a notice on the exported paper. **Graceful degradation converts the only
hard quality stop in the pipeline into a footnote.**

The block that cannot be degraded is the registry check
(`_review_publish.py:564-596`): if `VerifiedRegistry` holds zero real experiment
values and the experiment failed, the stage is force-`FAILED` regardless of the
LLM verdict — *"Paper contains no grounded data. Pipeline must not proceed to
export."*

Reject rolls back to **stage 16**, the largest rollback distance of any gate: a
full paper rewrite from the outline.

There is no rubric with weights anywhere. The quality report schema is free-form
JSON; the dimensions live in prompt text only.

### 21–23 · Finalisation
**Export (22)** converts markdown to LaTeX with a hand-rolled regex converter
(stdlib only, no pandoc) and compiles with `pdflatex` only — no tectonic or
xelatex fallback. If `pdflatex` is absent or compilation fails, the stage
prepends `% WARNING: Compilation failed` to the `.tex` and still returns DONE.
Every exception in the LaTeX block is swallowed. Charts do carry genuine 95% CI
error bars computed from per-seed data (`ax.errorbar` in `visualize.py:117-178`).

Anti-fabrication runs twice here. `_sanitize_fabricated_data` scans the markdown
and LaTeX tables and replaces any number not within 1% of a verified value with
`---` (small integers ≤20 and a hyperparameter allowlist exempted). Then
`verify_paper` re-checks against `VerifiedRegistry(best_only=True)`; on `REJECT`
it sanitises `paper.tex` in place.

**Citation verification (23)** is a four-source cascade — DOI via CrossRef with a
DataCite fallback for `10.48550/`/`10.5281/` prefixes, then OpenAlex title
search, then arXiv id, then Semantic Scholar. Matching is word-overlap, not edit
distance:

```python
return len(wa & wb) / max(len(wa), len(wb))     # verify.py:176-189
```

with `>= 0.80` VERIFIED, `>= 0.50` SUSPICIOUS, below that HALLUCINATED — except
for DOI and arXiv-id lookups, where a low-similarity match downgrades only to
SUSPICIOUS on the reasoning that the DOI may be real with wrong metadata.
Relevance scoring is a separate LLM pass, batched 30 at a time,
`RELEVANCE_THRESHOLD = 0.5`, `MAX_CITATIONS = 60`, unscored entries defaulting to
0.7. Only HALLUCINATED entries are dropped from the bib, and if more than 50% of
entries would be stripped the original bib is restored wholesale on the
assumption of rate-limiting false positives.

Two structural problems. `stages.py:146` carries the comment *"hallucinated
citations MUST block export"* — but `_execute_citation_verify` has **no `FAILED`
path on any branch**. And stage 23 runs *after* stage 22 has already written and
compiled `paper.tex`/`paper.pdf`, and never writes back to `stage-22/`. The
cleaned output is a separate `paper_final_verified.md`. **The LaTeX and PDF a
human would actually submit retain the hallucinated citations.**

**Overleaf sync is not wired into the pipeline at all** — `OverleafSync` is
referenced only by a standalone CLI command. `push_paper` does `git pull`, then
unconditionally `shutil.copy2`s local files over the remote working tree, then
commits and pushes. The conflict resolver defaults to `strategy="ours"`, keeping
the AI's version over human edits, and is never called automatically. Relevant to
PRJ93 only as a warning: this is exactly the design our own "never push to
Overleaf without a gate" rule exists to prevent.

---

## 3. Human gates ranked by leverage

Two independent gate mechanisms exist and do not talk to each other.
**Mechanism A** is the hardcoded `GATE_STAGES = {5, 9, 20}` frozenset producing
`BLOCKED_APPROVAL`; config can only *shrink* this set, never extend it, and
`--auto-approve` bypasses it entirely. **Mechanism B** is `HITLSession` policy,
fully config-driven per stage, unaffected by `--auto-approve`. A third path,
SmartPause, can fire anywhere. Default HITL state is `enabled=False`,
`mode="full-auto"`.

Ranked by how much final output quality the intervention actually protects:

**1. Stage 9 — EXPERIMENT_DESIGN.** Highest leverage. It is the only stage gated
by all three mechanisms at once, rejection discards the whole hypothesis (rollback
to 8, not merely a re-plan), and it sits upstream of every number the paper will
ever contain. Bad baselines or absent ablations here are unrecoverable
downstream — stage 14 can measure them honestly and stage 18 can complain about
them, but nothing can retrofit a control condition that was never run. Cheapest
possible place to spend human attention.

**2. Stage 20 — QUALITY_GATE.** Largest blast radius (rollback to 16 = full
rewrite) and the only place that can refuse to publish. But it fires after the
entire cost of stages 1–19, and `graceful_degradation` demotes it to a warning
label. Highest leverage per unit of output, lowest per unit of compute.

**3. Stage 5 — LITERATURE_SCREEN.** Determines the evidence base for every later
claim; a hollow screen makes the claim verifier and the related-work section
hollow too. Rollback is only to stage 4, so it is also the cheapest gate to
re-run — high leverage per cost even though its blast radius is smaller than 9's.

**4. Stage 8 — HYPOTHESIS_GEN.** Highest SmartPause criticality in the codebase
(0.9 — *"the idea itself"*), and it is where the research direction is actually
chosen. Ranked below the hard gates only because its protection is
mode-contingent: it is not in `GATE_STAGES`, so under `gate-only` mode it is
skipped entirely. Structurally it deserves rank 1 or 2; mechanically it can
vanish.

**5. Stage 12 — EXPERIMENT_RUN.** Not a human gate, but its three fabrication
guards are the only place the pipeline refuses to continue on evidentiary
grounds. Worth noting in a ranking of what protects quality, because it does more
protecting than most of the nominal gates.

**6. Cost-guard breach.** Wired live into the hot path at every stage (thresholds
at 0.5/0.8/1.0 of budget), but only `ABORT` is meaningfully interpreted — every
other response falls through. Protects spend, not correctness.

**7. SmartPause.** Fires when `overall_confidence < 0.7` on a weighted blend
(quality 0.30, confidence 0.25, novelty risk 0.15, history 0.10, criticality
0.20). Narrower in practice than it looks: `quality_score` defaults to 1.0 when
no `prm_score.json` exists, so for most stages it never fires on quality grounds
at all.

**Where I would place gates for PRJ93.** The ranking above maps onto dissertation
work as: (a) before methodology is fixed — the analogue of stage 9, and the one
gate that pays for itself; (b) before any number enters the chapter — the
analogue of stage 12's fabrication guard, which our "trace every number to
`brain/log/*result*.md`" rule already encodes; (c) before anything is pushed to
Overleaf — the analogue of stage 20, and the reason our existing Overleaf gate
should stay unconditional given what §2 shows `push_paper` does. Our current
gate list in `PRJ93_RULES.md` already covers (a) and (c). What it lacks is an
analogue of stage 5 — a gate on the evidence base itself, before reading effort
is spent — and an analogue of stage 8, on the research question before the
methodology that serves it.

---

## 4. README / code mismatches

Ordered by how much they would mislead someone reusing the design.

| Claim | Where | Reality |
|---|---|---|
| "PEER_REVIEW simulates 2+ reviewer perspectives" | README, integration-guide | One LLM call role-playing 3 reviewers in a single response. No independent calls, no aggregation, no score, no veto, no revision loop. Stages 8 and 14 *do* use real multi-agent; stage 18 does not. |
| "hallucinated citations MUST block export" | `stages.py:146` | `_execute_citation_verify` has no `FAILED` path on any branch. Hallucinated citations never abort anything. |
| "auto-removal of hallucinated references" | README | True for the bib and a separate markdown copy — but stage 23 runs after stage 22 compiled the PDF and never writes back, so the submittable `paper.tex`/`paper.pdf` keeps the bad `\cite{}`. |
| "4-layer citation integrity (arXiv, CrossRef, DataCite, LLM)" | README | Real cascade is CrossRef+DataCite → **OpenAlex** → arXiv → Semantic Scholar. OpenAlex is the primary title-search layer and is unlisted; the LLM never verifies existence, only scores relevance afterwards. |
| "Queries real APIs (arXiv-first, then Semantic Scholar)" | `docs/integration-guide.md:297,869` | Order is OpenAlex → S2 → arXiv, deliberately, per the code comment. The top-level README states it correctly; only the integration guide is wrong. |
| "[r] Reject and rollback" / "[b] Rollback to a specific stage" | HITL_GUIDE, CLI menu | Post-stage HITL reject **halts** the run (`REJECTED` → `break`), it does not roll back. `ROLLBACK` has no handler in `_run_hitl_post_stage` at all — `rollback_to_stage` is captured by the CLI and silently discarded. |
| "`--auto-approve` takes precedence over HITL settings" | HITL_GUIDE §14 | Only over Mechanism A. `HITLSession`/`StagePolicy` pauses are untouched by the flag. |
| "After 5+ runs the system adapts to your review style" | HITL_GUIDE §10 | `InterventionLearner` implements it — including auto-silencing gates at `intervention_rate < 0.1 and total_runs > 5` — but has zero call sites outside its own tests. *Unverified negative,* though it means the quality risk is currently inert rather than live. |
| Quality Predictor / Claim Verifier as live "Intelligence Layer" | HITL_GUIDE | Both compute real outputs; neither has a found call site that changes gate behaviour. *Unverified negative.* |
| Escalation tiers (30min Slack → 2h email → 24h auto-abort) | HITL_GUIDE | Policy matches the docs exactly, but no `EscalationTracker.check()` call site was found in the executor or runner. *Unverified negative.* |
| `researchclaw.copilot` module | source | Never imported outside its own package — entirely orphaned relative to the `hitl.InterventionMode` system the docs describe. |
| "3 LLM calls, 5,000–6,500 words" (stage 17) | integration-guide | Accurate — 3 sequential calls, split confirmed at `_paper_writing.py:333-360`. The word range appears as a peer-review check, not as an enforced budget. |
| Conference templates (neurips 2024/25, iclr 25/26, icml 25/26) | README | All present, plus undocumented physics journal templates (JHEP/PRD/PRL/PRX/EPJC) and a generic fallback. |
| "charts/ auto-generated with error bars" | README | Accurate — real 95% CIs from per-seed data. |
| Overleaf sync | README feature list | Not wired into the pipeline; CLI-only. Push overwrites the remote working tree unconditionally; conflict resolution defaults to keeping the AI's version. |

**Internal inconsistencies** (not README-facing, but they mislead code readers):
`prompts.default.yaml` at the repo root is a stale export and disagrees with the
live `prompts/ml.py` on several stage prompts. Stage 2's contract wants ≥3
sub-questions while its prompt asks for ≥4. Stage 9 designs against a hardcoded
GPU string while stage 10 loads the real hardware profile.

---

## 5. Relevance to PRJ93

Worth adopting:
- **The immutable harness pattern.** A file the generating model cannot edit, as
  the sole writer of the canonical results artifact. This is the structural form
  of our existing "trace every number to `brain/log/*result*.md`" rule.
- **The stage-17 evidence-bounding prompt block** (`ml.py:976-987`), especially
  the title rule: if the experiment covers partial conditions, the title must use
  "Toward…"/"Investigating…"/"An Empirical Study of…" rather than a global causal
  claim. Directly applicable to the dissertation's chapter and section titles.
- **The stage-25 statistical honesty rule:** no superiority claim without a
  p-value; reframe as "comparable"/"competitive"/"negative result" otherwise.
- **The stage-5 screening rules** as a template for a literature-screen gate.
- **Deterministic checks feeding the LLM's critique** (`draft_quality.json` →
  stage 18 → stage 19) rather than the LLM being asked to notice unaided.

Worth avoiding:
- **Computing a quality signal and never branching on it.** Stage 2's topic
  score, stage 8's novelty recommendation, and most of the HITL intelligence
  layer all do this. It produces the appearance of rigour with none of the
  effect.
- **Backfilling to hit a count.** `_MIN_SHORTLIST = 15` with synthetic scores
  means the number 15 carries no information.
- **Single-call multi-persona review.** If a critique step matters, the roles
  need separate calls; otherwise the personas share one context and one set of
  blind spots.
- **`graceful_degradation` on the only hard quality stop.**

Also relevant: `arc/.claude/skills/` contains working `scientific-writing`,
`statistical-reporting`, `scientific-visualization`, `literature-search` and
`hypothesis-formulation` SKILL.md files — the exact five that
`brain/PRJ93_RULES.md` currently flags as non-existent in our `.claude/skills/`.
They are a reference for authoring ours under `brain/skills/`. **Not** a licence
to write into `.claude/` — that remains out of bounds.
