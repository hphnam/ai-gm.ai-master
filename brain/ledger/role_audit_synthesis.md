# Synthesis of the six role critiques — ordered repair list

**2026-08-08.** The fourth call, per `autoresearchclaw/SKILL.md` §2, over the six independent
critiques in [`role_audit_ch4_ch5.md`](role_audit_ch4_ch5.md). Instruction obeyed: strongest
elements taken rather than compromised, disagreements preserved rather than flattened, discards
declared.

**STATUS: NOTHING IS REPAIRED.** Every item below is reported. Repairs touch composed chapters and
reach Overleaf, which is a human gate.

---

## Block 0 — contradictions. §5 mandates these before any other revision

The synthesis corrected the audit's framing here: **§5's rule is written about the class, not about
X1.** Four further findings are two sections stating incompatible things about one quantity, so
they lead as a block.

| # | What | Where | Edit | Gate |
|---|---|---|---|---|
| **R1** | Ch4 says the numpy regeneration leaves every mean, coverage and limb *identical*; Ch5 says coverage moves ≤0.004 and a Winkler mean moves 25 points on 1814. Ch4 is false. | `results.tex:693-695` | Transcribe `log/78`'s figures, which `discussion.tex:277-280` already carries | in-chapter |
| **R2** | The MCS ran at B = 1000, not 10,000 | `discussion.tex:268-269` + trace `:286` | `$B=1000$`, MCSE `$0.0124$`, "about **twelve** times". **`tab:winkler`'s `B=1000` caption is CORRECT — do not touch** | in-chapter |
| **R3** | Ch4 contradicts itself and its own `% Trace:` on recall/precision | `results.tex:825` vs `:774` | Set to the traced pair — **after R4** | blocked by R4 |
| **R4** | One confusion matrix from two denominators. 644 events, 124 misses, 8 FP ⇒ precision 0.985; the printed 0.871 implies ≈76 FP. Two roles converged plus the load-bearing gate test | `results.tex:817-818`, `:823-825` → `discussion.tex:112-113` | Recompute on one stated denominator | **RE-RUN** |
| **R5** | Fold counts mapped to the wrong venues; HLN factors confirm only the mapping is wrong | `results.tex:46` | Reorder or name venues inline | in-chapter |
| **R6** | Ch3 and Ch4 disagree on the gate's loss and denominator; Results is the accurate one | `methodology.tex:310-312` ↔ `results.tex:33-36` | Correct Methods; add Ellel's basis disclosure | in-chapter |

**Sequencing consequence, worth stating so a partial close does not read as a close:** R1, R2, R5
and R6 can be honoured now with no gate. R3/R4 is the one contradiction that cannot close this pass.

## Block 1 — the defect makes a stated number false

**R7** the occurrence gate lowers the mean by **0.0130**, not 0.016 (the printed figure coincides
with the unrelated weather gap 0.0163, plausibly its origin) · **R8** Ellel's 0.572 carries a MASE
label where no MASE exists for that venue · **R9** "thirty-one paired differences" against a
generator emitting **37** *(re-run)* · **R10** four weather exclusions, not three, one at an
unnamed venue · **R11** `p = 0.10` where the artefact says **0.103**, which as printed sits on α
and no longer supports its own retention claim · **R12** the 340-figure audit's parts sum to
**337** · **R13** the 0.004 movement attributed to the wrong table, arm and level · **R14** "closest
to nominal" is the **furthest**, because the cell's nominal is 0.80 not 0.90 · **R15** "1.8 paired
standard errors" against an interval implying **1.61**.

## Block 2 — the defect makes a claim unsupported

**R16** `tab:winkler`'s A column is per-venue oracle-tuned (γ = 0.05/0.005/0.005, each its own
argmin; the printed 1814/1422/671 *are* those minima) and the A-vs-G contrast it feeds exists
precisely to remove that choice · **R17** the window remedy quotes three venues at three different
$W$, states $W$ nowhere, two at their best cell and **Ellel at its worst**; the sweep is already
`tab:window`, so this is transcription, not a re-run · **R18** "better calibrated at all three
venues" is one of three · **R19** a $p=0.047$ that is 1 of **41 uncorrected** tests, where Ch5
already carries the correct framing one chapter away · **R20** five sites of pattern (b), below ·
**R21** the `lu_proactive_2024` verb, settled by the chapter's own correct formulation 46 lines
later · **R22** four floats with no uncertainty at all, plus an unexplained 90%/95% level mix ·
**R23** a second regime-dependent verdict Ch4 omits — pooled split conformal 0.209 → 1.000,
"appearing as an adoption candidate", which `log/78` calls that session's most consequential
finding · **R24**–**R28** the pairing-factor independence assumption, the "two venues" instrument
miscount, the post-hoc designation defended by a falsified argument, the ablation reported only in
its disfavouring half, the unnamed gate base model · **R29**/**R30** below.

## Block 3 — outside the two chapters

**R0** — `abstract.tex` is unfilled template boilerplate on `origin/main`. **The synthesis rates it
the single highest-value repair in the project** and places it outside the numbering because it
belongs to no chapter. Does not block chapter revision; proceed in parallel.
**R31** duplicate bib key. **R32** the `n_boot` schema ambiguity — *fix the schema, not only the
sentence.*

---

## Genuine disagreements, preserved

**D1 — resolved.** Roles A and B proposed opposite repairs for the bootstrap size. Role A is right
(`mcs.py:53`, `interval_calibration.py:275`, `n_boot_primary`), with Role B/Ch4 concurring from the
other chapter. **What survives is not the sentence but R32:** the disagreement, not either position,
located the schema defect, and neither role's remit covered it.

**D2 — LIVE.** Is `discussion.tex:107-108` under-claimed or over-claimed? Role C says *too weak* —
the only finding in the run pointing that way — because 7 of 7 cells order identically and the
near-threshold cells reproduce it. Role B and the T3 gate say `tab:vuspr` has no uncertainty on any
cell, so the ordering is a ranking of point estimates. **They cannot both be right about one
sentence.** Settled by whether the near-threshold corroboration is an *independent* partition or a
*re-partition of the same 644 windows* — determinable from `log/60` plus the generator in one read,
and **nobody has checked it.** Cheapest unblocking action in the whole list.

**D3 — LIVE.** Role B certifies `tab:coverage` as the one float that **passes** ("rare and
exemplary"). Role A says one of its six rows is an artefact of 1037 of 1300 calendar-open days not
trading — the defect the chapter itself diagnoses 100 lines later — and is never audited for it.
Reconcilable only on the narrow reading that B checked arithmetic reproduction and A checked
interpretability, and a float with an uninterpretable row does not pass. **The settling evidence
does not exist**; R30 produces it. **Consequence: repair R29 as a withdrawal of the claim, not a
reversal of it** — the chapter contradicts itself on its own printed numbers either way, but the
repaired sentence must not assert a direction for Ellel until R30 lands.

---

## Discarded, declared

1. **Role B/Ch5's position on the bootstrap size.** Wrong; acting on it would have written a false
   $B$ into the dissertation. **Recorded rather than deleted, because a careful reviewer reaching
   it is the evidence for R32.**
2. **The `---`-as-placeholder suspicion.** Already correct in the document; T7 passes. Recorded so
   it is not re-raised.
3. **"Consistently signed" at `discussion.tex:72`** — downgraded, not dropped. The charge holds
   outright in Ch4; in Ch5 the sentence follows one that localises to the Beer Hall and its own
   trace cites the BH figure, so it is **ambiguous by proximity, not false**. Neither role drew
   this distinction and it changes the Ch5 severity.
4. **A10/Ch4** narrowed: Methods *does* carry the caveat; the defect is a missing cross-reference.
5. **A6/Ch4 explicitly NOT discarded** — Role A recorded it as *check could not be completed*, and
   **an incomplete check is not a pass.** Reclassified to re-run (R30).

---

## Cross-cutting patterns

**(a) One venue's number stated of the estate — supported, weaker than the audit framed it.** The
audit called this Beer-Hall-specific; one of the three sites is an *Ellel* figure generalised (the
6.2 pairing factor, where the artefact carries 5.5 and 8.3 at the others). Two of three sites are
one claim restated across chapters, so it is two independent generalisations, not three.

**(b) Non-rejections converted into affirmed nulls — strongly supported, the dominant defect in
Chapter 4.** Five sites, two roles sharing no context, in a chapter that **states the correct
standard itself** and applies it correctly to Ellel 80 lines from where it breaks it. **Not five
errors — one habit, and an asymmetric one:** the strict standard falls on unwelcome nulls, the
loose one on convenient nulls. Repair as a single sweep under a single stated rule. **Chapter 5
does not exhibit it.**

**(c) A swept or multiply-tested quantity reported at one setting, without the sweep — named by
the synthesis, by no individual role.** Four instances: the oracle-tuned γ, the three-different-$W$
window remedy, the 1-of-41 uncorrected $p$, the post-hoc headline designation. Every one is a
selection among alternatives where only the selected value is printed. **No role names it as a
class because it straddles Role A's protocol-leakage remit and Role B's multiplicity remit** — the
same seam the D1 disagreement exposed. Three of its four instances are load-bearing for a stated
conclusion.

Patterns (b) and (c) account for eleven of the blocking findings.

---

## What this synthesis does not establish

Every finding concerns Chapters 3–5 and the abstract. Six role calls and a fourteen-test gate, all
scoped to two chapters, found the unwritten abstract only because one call looked outside its remit.
**Nothing here is evidence about Chapters 1, 2, 6 or the appendices, and the absence of findings
there is an absence of looking.**
