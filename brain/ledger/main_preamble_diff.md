# `main.tex` preamble additions — PREPARED, NOT APPLIED

**Nothing has been written to `main.tex`.** This is a gate item: an edit to `main.tex`
needs approval like any other Overleaf change, and unlike a chapter edit a bad preamble
breaks the whole build rather than one section.

**These are not optional.** No appendix float compiles without them. A-F2, A-F3 and A-F4 all
require `algorithm2e`; F3, A-F5, A-F6 and A-F7 all require TikZ libraries `main.tex` does not
load.

## The diff

`main.tex` currently has, at lines 43–46 of the package block:

```latex
\usepackage{amsmath}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
```

Proposed:

```latex
\usepackage{amsmath}
\usepackage{amssymb}                                   % NEW
\usepackage{tikz}
\usetikzlibrary{positioning,arrows.meta,fit,backgrounds,decorations.pathreplacing}  % EXTENDED
\usepackage[ruled,vlined,linesnumbered]{algorithm2e}   % NEW
```

## What each is for, and which float fails without it

| Addition | Required by | What breaks without it |
|---|---|---|
| `positioning` | F3, A-F5, A-F6 | `right=of`, `below=8mm of` — F3's entire layout is relative rather than coordinate-based |
| `fit` | F3 | the two dashed evaluation groups that enclose the ladder/MCS boxes and the band |
| `backgrounds` | F3 | `on background layer`, without which the dashed groups paint over the boxes they enclose |
| `decorations.pathreplacing` | F1 | the brace over the superseded split |
| `arrows.meta` | all TikZ floats | already present; kept |
| `algorithm2e` | A-F2, A-F3, A-F4 | all three algorithm floats; there is no fallback |
| `amssymb` | A-F4 only, and only if the `\mathbb{1}` form is wanted | nothing — see below |

## `amssymb` is the one genuine choice

A-F4 currently uses `\mathbf{1}` for the indicator, which needs no package. `\mathbb{1}` is
the conventional indicator and `amssymb` is a one-line, near-zero-risk addition, so taking it
while the preamble is open is reasonable — **but it is a preference, not a requirement**, and
it is the only line here that is. If it goes in, A-F4 changes one line:

```latex
$b_t \leftarrow \mathbf{1}[z_t>1] - \mathbf{1}[z_t<-1]$      % current
$b_t \leftarrow \mathbb{1}[z_t>1] - \mathbb{1}[z_t<-1]$      % with amssymb
```

Recommend taking it. `\mathbb{1}` is what a reader of this literature expects, and the
substitution exists only because the package was absent.

## Options for `algorithm2e`, since it is the one with real load-order risk

`algorithm2e` defines `\algorithm` and can clash with `algorithm`/`float` packages. `main.tex`
loads neither, so there is no known conflict. It does interact with `hyperref`, which
`main.tex` does load: load `algorithm2e` **after** `hyperref` (as proposed above, since the
package block sits below the `hyperref` setup) to avoid the known `\theHalgorithm` warning.

The `[ruled,vlined,linesnumbered]` options are chosen to match how the three floats are
written: `linesnumbered` is required, because A-F2 and A-F3 cross-reference specific lines
(`\ref{ln:sub}`, `\ref{ln:fc1}`–`\ref{ln:fc3}`) and those references print as `??` without it.

## Verification route

The nine-page `figure_proof.tex` already carries exactly this preamble and is the test of it.
**If the proof compiles, the additions are proven against the real document geometry before
`main.tex` is touched at all** — which is the point of having built the proof against
`main.tex`'s own class, size, leading and margins rather than against a convenient setup.

Apply to `main.tex` only after the proof compiles clean.
