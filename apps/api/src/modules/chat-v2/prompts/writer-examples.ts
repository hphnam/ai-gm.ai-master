// Plan 06-01 Task 3 audit-S9 — Writer calibration corpus. SINGLE source of
// truth. Writer prompts cite examples by import — never inline copy.
//
// 06-02 will EXTEND (not replace) LOOKUP_EXAMPLES + populate REASONING_EXAMPLES
// + INCIDENT_EXAMPLES. Adding examples in 06-02 is a data change only — the
// prompt-loading code (`LOOKUP_EXAMPLES.map(...).join('\n')`) is stable across
// plans. This makes prompt-rule edits and corpus edits separately revertable.
//
// Tone reminder for any future curator: these are examples of the SHAPE we
// want — terse, lead-with-answer, no preamble, no meta-narration, no headings,
// optional 1-line nudge only on sharp time-pressure. Pub-vernacular friendly.

export type WriterExample = { q: string; a: string }

// Four lookup-mode anchors derived from CONTEXT.md D-06-D + the "lookup test"
// success criterion. Verbatim from /paul:discuss redrafts where preserved;
// otherwise written to satisfy the AC-3 ban list (no preamble, no meta, no
// headings, ≤3 short lines, optional 1-line cutoff nudge).
export const LOOKUP_EXAMPLES: WriterExample[] = [
  {
    q: "what's below par?",
    a: 'Four below: Heineken (8 left, 12 par), Guinness (5/10), Estrella (3/8), Aperol (1/4).\nBibendum cutoff is 16:00 — order before then or it slips a day.',
  },
  {
    q: 'who do I call for the ice machine?',
    a: 'Hoshizaki engineer, Dave Mahon — 07700 900 134. Tell him it\'s the Manitowoc on the back bar.',
  },
  {
    q: "what's the Bibendum cutoff?",
    a: '16:00 weekdays, 14:00 Saturdays. After that it ships next working day.',
  },
  {
    q: 'how did Heineken sell last week?',
    a: '142 pints, down 8% on the previous week. Friday was the dip — 18 vs ~30 normal.',
  },
]

// 06-02 populates these. Empty arrays today so the import shape is stable;
// REASONING/INCIDENT prompt files (also 06-02) will iterate the same way.
export const REASONING_EXAMPLES: WriterExample[] = []
export const INCIDENT_EXAMPLES: WriterExample[] = []
