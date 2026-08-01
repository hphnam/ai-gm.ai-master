# Drafting rules

Long-form writing guidance referenced from `SKILL.md` §7. **Not needed to run
the critique-revise loop** — load this only when drafting or substantially
rewriting prose.

Adapted from the AutoResearchClaw stage-17 and stage-19 prompt banks. Those
targets are NeurIPS/ICML conference conventions; where a rule encodes a
conference norm rather than a general writing principle, it is marked
**[venue-specific]** and should be checked against
`brain/knowledge/00_marking_criteria.md` before being applied to PRJ93.

---

## 1. Evidence bounding — the full rule set

1. Every claim in a title, abstract or conclusion must be directly supported by
   a specific metric that appears in a result file.
2. Where the experiment covers only some conditions, the title must not make a
   global causal claim. Use "Toward…", "Investigating…", "An empirical study
   of…" rather than "X outperforms Y".
3. Before writing the title, list the conditions actually tested and their
   metric values. The title may claim only what those numbers show.
4. Where a metric is a single scalar with no condition labels, do not make any
   comparative claim between methods or strategies from it.
5. Distinguish "we propose and validate" (full results exist) from "we propose
   and present preliminary evidence" (partial results). Use the weaker phrasing
   where the evidence is weaker.
6. Never approximate a number from memory. If it is not in a result file, it
   does not go in the text.

## 2. Statistical reporting

7. Every result table reports 95% confidence intervals — `mean ± CI` or
   `[low, high]`.
8. Every comparison claim cites a p-value. Where p ≥ 0.05, write explicitly:
   "the difference is not statistically significant."
9. Where the proposed approach does not significantly outperform a baseline, do
   not claim superiority. Reframe as comparable, competitive, or a negative
   result.
10. Report an effect size alongside significance. A significant difference of
    negligible magnitude is a finding about sample size, not about the method.
11. State the number of seeds, folds or splits. n = 1 is reportable only with
    the limitation stated in the same breath.
12. Where any run failed or diverged, report success rates per method and the
    inclusion/exclusion criteria, then report both conditional metrics
    (successful runs only) and unconditional metrics (failures as worst case).
    Without both, comparative claims are biased by survivorship.
13. Where runs showed instability — divergence, NaNs, crashes — the limitations
    section must discuss reliability, not only accuracy.
14. Report results per regime (per noise level, per problem size, per period)
    with separate tables or subsections. Aggregate-only results cannot support
    a claim about robustness or generality.

## 3. Method sections

15. The method section must contain everything needed for reimplementation:
    algorithm description or pseudocode, every hyperparameter, the data
    representation, the objective, and any stability mechanism used
    (regularisation, normalisation, clipping).
16. For learning-based methods, specify architecture, training procedure
    (iterations, epochs, batching) and initialisation.
17. For baselines, specify the exact configuration and any tuning performed to
    make the baseline competitive. A baseline reported without tuning effort is
    a strawman and will be read as one.
18. Never use generic labels — `baseline_1`, `variant_2` — in the text. Use
    descriptive names that say what the method does. Generic labels make a
    results section uninterpretable.

## 4. Experimental setup

19. Fully specify the evaluation setting: the data, the split procedure, the
    period covered, any randomisation, and the evaluation metric's exact
    definition including its denominator.
20. State preprocessing in enough detail that a reader can reproduce the input,
    not merely the model.
21. Where a metric has variants in common use, name which variant and cite it.

## 5. Structure and length

22. Limitations: one section, 200–400 words, three to five concrete points. Do
    not scatter limitation disclaimers through other sections.
23. State each limitation once. Repeating "due to computational constraints"
    across sections reads as evasion.
24. Roughly 80% of the text should cover what was done and what was found, not
    what could not be done. Positive contribution should dominate.
25. Section balance: no main body section should dwarf the others by more than
    roughly 3×. A results section shorter than the related work is a signal
    that the contribution is thin.
26. **[venue-specific]** The source system targets a 5,000–6,500 word body
    across Introduction, Related Work, Method, Experiments, Results,
    Discussion, Limitations, Conclusion. PRJ93 word counts are governed by
    `00_marking_criteria.md`, not by this.

## 6. Prose quality

27. Body sections are prose, not bullet lists. Bullets are acceptable only in
    the contributions paragraph of the introduction and in limitations.
28. Do not add hedging that was not in the original draft. Hedging added during
    revision usually signals the reviser doubted a claim but did not check it —
    check it instead.
29. Match verb strength to evidence strength: "demonstrates" needs a
    significant result across conditions; "suggests" fits a single condition;
    "is consistent with" fits a non-significant trend.
30. Avoid restating the same point in the introduction, the discussion and the
    conclusion in near-identical words. Each should do different work:
    motivate, interpret, and situate respectively.

## 7. Citation practice

31. Cite the original paper that introduced a technique, not a survey or a
    later paper that used it.
32. Citations must appear in Method, Experiments and Discussion — not only in
    the introduction and related work. Citations clustered at the front signal
    that the related work was written separately from the contribution.
33. Cite only directly relevant work. Padding with tangential references is
    visible and counts against.
34. **[venue-specific]** The source system asks for 25–40 unique references with
    at least 15 in related work. Check PRJ93's expectation in
    `00_marking_criteria.md` rather than adopting these numbers.

## 8. Figures and tables

35. Reference every figure by `\ref{}` from the text. A figure never referenced
    is a figure the examiner does not know why they are looking at.
36. Do not write bold standalone captions like "**Figure 1.**" adjacent to a
    figure environment — let the caption command do it.
37. Never use a placeholder value in a table cell. If a metric is unavailable,
    write "N/A" or drop the row.
38. Every table must be justified against a chart alternative. Per
    `PRJ93_RULES.md`, a plain table is a defect unless the precise values
    matter more than the comparison.

## 9. Revision-specific

39. If the results do not support the original claim, update the title. An
    accurate title on a negative result marks better than an aspirational one
    the evidence contradicts.
40. Rewrite the abstract to reflect what was found, not what was hoped. The
    abstract's numbers must match the results section's numbers exactly.
41. The conclusion must match actual results. No aspirational claims.
42. When a critique asks for an analysis that was not run, state that it was not
    conducted. Never synthesise a figure to close the gap.
43. When revising, copy sections with no critique findings verbatim. A revision
    pass is targeted repair, not a rewrite — rewriting untouched sections is how
    content and citations get silently lost.
