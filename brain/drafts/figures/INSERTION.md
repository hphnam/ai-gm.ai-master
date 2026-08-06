# Literature-review figure — what to upload, what to delete

Superseded 2026-08-03. The two earlier figures (`sbc_plane`, `hln_correction`)
were **dropped**: each illustrated a formula the prose already gives, which is
textbook work, not synthesis. They said nothing about the literature as a body.
One synthetic figure replaces them.

## On Overleaf

Upload:

    figures/gap_map.pdf

Delete (no longer referenced by any chapter):

    figures/sbc_plane.pdf
    figures/hln_correction.pdf

The `.tex` change is prepared whole in the session scratchpad as `push6.tex`:
both figure environments and both `\ref` sentences removed, and the new figure
placed in `sec:rw-synthesis` immediately after the paragraph ending "...the
absence of an operator-grounded evaluation across the systems just enumerated
would remain."

## What the figure claims, and where each claim comes from

Rows are the intervention policy; columns are what the decision is finally
scored against, ordered by how directly the grounding is a real person's
judgement. Both axes are the chapter's own argument, not a new taxonomy:

- Columns come verbatim from the `sec:rw-synthesis` sentence enumerating how
  the surveyed systems are evaluated (annotated corpora / simulated or scripted
  users / a language model as judge), plus the fourth category the same
  paragraph says is empty: "None of those just enumerated is scored against the
  decisions of the operator whose work it is intervening in."
- Rows come from the PRISM paragraph: PRISM is "the one that gates on a
  calibrated acceptance probability rather than on accuracy alone", and "reports
  the gate's effect but not the calibration of the probability the gate depends
  on". The top row is what the chapter says none of them does.

Peer-review status is deliberately NOT encoded — see the generator docstring.

Regenerate with `python brain/drafts/figures/make_litreview_figures.py`.
