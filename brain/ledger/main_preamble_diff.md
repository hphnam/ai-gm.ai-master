# `main.tex` preamble additions — APPLIED 2026-08-07

**Status: applied to `main.tex` on Overleaf, and the prepared diff it replaces was wrong.**

The earlier version of this file (prepared, unapplied) claimed three additions were needed.
It was written from a stale reading of `main.tex`'s package block. Reading the file directly
before applying found that **two of its three lines were already there**.

## What the prepared diff got wrong

| Claimed | Actual |
|---|---|
| `\usepackage{amssymb}` is NEW | **Already loaded.** The `\mathbf{1}` substitution in A-F4 existed to work around a package that was never absent. |
| `\usepackage[ruled,vlined,linesnumbered]{algorithm2e}` is NEW | **Already loaded** — as `\usepackage[algo2e]{algorithm2e}`, alongside `algorithm` and `algpseudocode`. |
| TikZ libraries need extending | Correct. This was the one accurate line. |

## The defect the stale reading concealed

`main.tex` loads `algorithm2e` with the **`algo2e` option**, which exists precisely so the
package can coexist with the `algorithm` package loaded on the line above it. That option
**renames the environment to `algorithm2e`**.

A-F2, A-F3 and A-F4 all opened `\begin{algorithm}`. In `main.tex` that would have opened the
*other* package's float, and every `algorithm2e` body command inside it — `\SetKwInOut`,
`\KwIn`, `\lIf`, `\tcp*`, the line numbering — would have failed.

**The compile proof would not have caught it.** `figure_proof.tex` loaded `algorithm2e`
alone, with no `algorithm` package and no `algo2e`, so `\begin{algorithm}` resolved to
algorithm2e's own environment and the page would have compiled clean. A proof that passes
while the document fails is worse than no proof: it converts an open question into a false
answer. This is the same failure as the F1 geometry retrofit — *assert against the target,
not the harness* — one layer up, in the package block rather than the class options.

## What was actually applied to `main.tex`

Additive only; nothing removed or reordered.

```latex
% was: \usetikzlibrary{arrows.meta}
\usetikzlibrary{positioning,arrows.meta,fit,backgrounds,decorations.pathreplacing}

% new, immediately after the existing \usepackage[algo2e]{algorithm2e}
\RestyleAlgo{ruled}
\LinesNumbered
```

| Addition | Required by | What breaks without it |
|---|---|---|
| `positioning` | F3, A-F5, A-F6 | `right=of`, `below=8mm of` — F3's layout is relative, not coordinate-based |
| `fit` | F3 | the two dashed evaluation groups enclosing the ladder/MCS boxes and the band |
| `backgrounds` | F3 | `on background layer`; without it the dashed groups paint over what they enclose |
| `decorations.pathreplacing` | F1 | the brace over the superseded split |
| `\LinesNumbered` | A-F2, A-F3 | **not cosmetic** — `\ref{ln:sub}`, `\ref{ln:fc1}`–`\ref{ln:fc3}` print `??` |
| `\RestyleAlgo{ruled}` | A-F2/3/4 | the floats fall back to the plain style |

The command forms were used rather than package options so the existing `[algo2e]` option is
left untouched — changing that option would break the coexistence with `algorithm`.

## Corresponding float changes

- A-F2, A-F3, A-F4 now open `\begin{algorithm2e}`, in both `figures/out/` and the proof.
- A-F4 uses `\mathbb{1}`, since `amssymb` was there all along.
- `figure_proof.tex` is at **revision 7** and its preamble now reproduces `main.tex`'s
  package block, not only its class, size, leading and margins.

## Still outstanding

The compile. Everything above is a static reading of the two preambles; whether the nine
floats typeset inside 150 mm is what the PDF is for.
