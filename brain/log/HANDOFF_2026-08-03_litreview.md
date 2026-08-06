# Handoff — literature review closed, 2026-08-03

Read this first next session. It is the whole state; nothing else needs
reconstructing from transcript.

---

## Where the chapter stands

`chapters/literature_review.tex` is **pushed and verified on Overleaf**.

    bytes    67,389
    sha256   4e6e62188045880873f24736de4a0ed1f82cc452a0a2f184fd2b10d809285417
    local    brain/drafts/literature_review.tex   (byte-identical, same sha)

Verified by readback diff after the push, not by assuming the write landed.
If the chapter needs editing again, start from the local copy — it IS the
remote as of this handoff — but **re-read the remote first**, because Phuong
edits directly in Overleaf between sessions (they did so twice on 2026-08-03).

Structure: one figure (`fig:gap-map`), one `\ref`, one `\label`, braces
balanced.

## T8 is CLOSED

Every factual claim about every cited work has been checked against source
text. All 90 citation keys, across two passes on 2026-08-03.

    pass 1   ~30 keys   4 errors found (Ancker, ProActor, Chae, M5)
    pass 2   ~60 keys   1 error found  (Hertel rounding)

The Hertel error: the chapter rounded 3.55% → "about 4%" and 2.74% → "about
3%", widening a 0.8-point gap to 1 point in the direction that suited the
sentence. Phuong fixed it in Overleaf themselves as 3.6%/2.7%; their wording
was kept over mine.

**Standing caution, third session running:** NotebookLM's first answer on a
specific claim is often wrong. It returned NOT IN SOURCES or a false verdict
on six claims that are fully supported — Kim 2022, Parasuraman & Riley 1997,
Kolassa 2020, Chronos-2 group attention, Conformal PID, PoisonedRAG. Zotero
full text confirmed all six verbatim. **Treat NotebookLM as a search index,
not an oracle. Zotero full text is the authority.** Phuong's instruction to
fall back to Zotero is what caught these; keep doing it unprompted.

One error was mine, not the chapter's: I probed Kolassa 2023 with "MAE- or
MAPE-optimal forecasts are never coherent." The paper says MAPE-optimal never,
MAE-optimal usually not. The chapter already said "usually not". No change.

## The figure

Two earlier figures (`sbc_plane`, `hln_correction`) were **dropped**, not
revised. Each illustrated a formula the prose already gives — textbook work,
not synthesis. They existed largely because T12 asks for figures, which is a
*whole-thesis* rule doing a *chapter's* thinking for it. Phuong caught this.
Same category of error as the venue-data one they caught earlier.

Replaced by one synthetic figure, `fig:gap-map`. Rows = intervention policy,
columns = what the decision is finally scored against (ordered by how directly
that grounding is a real person's judgement). Both axes are lifted verbatim
from `sec:rw-synthesis`'s own sentences, so the figure asserts nothing the
prose does not. Nine surveyed systems sit bottom-left; the top-right cell is
empty and that emptiness IS the gap claim.

    generator   brain/drafts/figures/make_litreview_figures.py
    output      brain/drafts/figures/gap_map.{pdf,png}
    provenance  brain/drafts/figures/INSERTION.md

Peer-review status is deliberately not encoded — the chapter marks preprints
per-citation but leaves liu_proactiveeval, yang_contextagent and
yang_fingertip unmarked, so a filled/hollow encoding would assert a status
the chapter has not established.

## Open items — Phuong's, not the agent's

None are blocking. All three need a human because the agent cannot do them.

1. **Delete `figures/sbc_plane.pdf` and `figures/hln_correction.pdf` from
   Overleaf.** Nothing references them after the push. Flagged before the
   push; not confirmed done. (`write_file` is text-only — the agent cannot
   touch binaries.)
2. **Delete the junk NotebookLM source** `416b583d-07f2-4f3c-8109-f4dcd5e566ad`,
   titled "Checking your browser - reCAPTCHA", ingested by accident while
   trying to add Ancker.
3. `ancker_effects_2017` europepmc source sits at status 3 in the notebook
   (BMC auth-wall, PMC reCAPTCHA). Not worth fixing — the claim was verified
   by direct EuropePMC REST retrieval of PMC5387195 instead.

Stale local files: `brain/drafts/figures/sbc_plane.*` and `hln_correction.*`
are dead — the generator no longer produces them. Left in place rather than
deleted unasked.

## Loose thread

Phuong's message on 2026-08-03 was truncated mid-sentence: *"It will match
the…"*. The ending was never supplied. It may hold an unaddressed requirement
about the figure. **Ask before assuming it was immaterial.**

## Hard-won operational rules

- **Never hand-assemble a whole-file write.** On 2026-08-03 my first
  `mcp__overleaf__write_file` call carried only the chapter's opening
  paragraph. `write_file` is whole-file, so it would have truncated 67,889
  bytes to ~600. The permission classifier blocked it. Read the prepared file
  and pass it entire. Second such incident — see
  `brain/ledger/overleaf_incident_2026-07-31.md`.
- Push protocol that worked: build the whole file locally → assert
  figure/ref/label counts + brace balance → sha256 → push → read back → diff.
- `write_section` is banned by project rule. Reconstruct and write whole.
- The Overleaf git token is in `~/.claude.json` as `OVERLEAF_GIT_TOKEN`.
  Inlining it into a shell command is blocked by the classifier — do not
  retry. `git push` from the local clone is blocked by a protected-branch
  hook. Overleaf MCP `write_file` is the only push route.
- Never re-export `ref.bib` via Better BibTeX — key format differs, breaks
  ~60 citations.
- `angelopoulos_conformal_2023` (Gentle Introduction, ref.bib:185) and
  `angelopoulos_conformal_2023-1` (Conformal PID, ref.bib:659) are distinct
  legitimate papers, NOT a BBT duplicate. Checked; leave them.
- **Human gate:** never push any file to Overleaf without explicit approval.
  One gate per question, never batched.

## Next

Nothing is queued. Phuong said in an earlier session "then we close this
session and move to next part" but has not repeated it. **Do not start
another chapter unprompted** — ask which one.
