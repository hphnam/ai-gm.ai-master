# Lune Brew — Deck Brand Kit

Everything an AI agent (e.g. Claude Code) needs to build on-brand Lune Brew decks.
Feed this whole folder to the agent. The spec is the source of truth; the assets are what it injects.

## Files

```
LuneBrew_Deck_Guide_for_Agents.md   ← THE SPEC. Read first. Tokens, rules, 25 templates, checklist.
LuneBrew_Brand_and_Deck_Guide.html  ← Visual reference for humans (rendered look & feel).
assets/
  logo-black.svg     Vector wordmark, fill #111 — use on LIGHT backgrounds.
  logo-white.svg     Vector wordmark, fill #fff — use on DARK backgrounds.
  logo.svg           Vector wordmark, fill=currentColor — recolour via CSS `color:`.
  logo-black.png     Raster fallback (transparent bg), ~1375px — for PPTX / non-SVG.
  logo-white.png     Raster fallback (transparent bg), ~1375px — for PPTX / non-SVG.
  lunebrew-tokens.css   Import first: colours, fonts, slide shells, chrome, pill,
                        tab-card, wave, stadium, code, table, chart helpers.
  lunebrew-motifs.html  Copy-paste snippets for every motif + the persistent chrome.
```

## How to use (HTML decks — recommended)

1. `Read LuneBrew_Deck_Guide_for_Agents.md` and follow it. It is prescriptive.
2. In each deck HTML: `<link rel="stylesheet" href="assets/lunebrew-tokens.css">`.
3. Build slides as `<section class="slide dark|light|data"> … </section>`.
4. Inject the logo with `<img src="assets/logo-white.svg">` (dark) or `logo-black.svg` (light).
5. Paste motifs from `assets/lunebrew-motifs.html`. Keep **≥1 brand marker per slide** (spec §3).
6. Run the pre-flight checklist (spec §14) before export. Export to PDF via headless Chromium.

## How to use (PPTX via the `pptx` skill)

- Set slide size 13.333 × 7.5 in (16:9). Map theme colours to the tokens (§1.1).
- Place the logo from `logo-white.png` / `logo-black.png` (or convert the SVG to EMF for vector).
- Recreate motifs as native shapes, or drop pre-rendered SVGs. Keep code & charts as real text.
- Fonts: Poppins / Archivo Narrow / Inter / JetBrains Mono (embed or install).

## Non-negotiables (the 30-second version)

- **Ink #111 + Paper #EFF0EB + ONE flavour accent.** Gold #E5A83D = the one thing that matters per slide.
- **Assertion headlines** (a finding), evidence below. Not topic-bullets.
- **≥1 motif per slide** (ribbon / stadium band / tab-card / LB pill / wave) — sized to the slide's job.
- Reading text is **ink-on-light or white-on-ink only** (gold fails contrast for small text).
- Headlines: Poppins (sentences) or Archivo Narrow caps (labels). Body: Inter. Code: JetBrains Mono.

## Notes

- Logos are traced vectors of the supplied wordmark — scale freely, recolour via `logo.svg`.
- Display/headline fonts are free stand-ins for the custom wordmark face. If you have the
  brewery's real brand fonts, swap them in `lunebrew-tokens.css` (`--f-display`, `--f-head`).
