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
    a: "Hoshizaki engineer, Dave Mahon — 07700 900 134. Tell him it's the Manitowoc on the back bar.",
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

// Four reasoning-mode anchors. Plan 06-02 audit-M5 sourcing note: CONTEXT.md
// D-06-D mentions "the eight redrafted examples from /paul:discuss" by title
// only — verbatim user-authored prose was NOT preserved in CONTEXT.md, so all 4
// below are Claude best-judgment drafts following voice rules:
// opinionated GM, branches when applicable ("Two paths:", "Quick check:"),
// contractions, pub vernacular where it fits, acknowledges human side on
// staff/HR/stress turns, leads with the diagnosis or recommendation.
// User-review trigger: D-06-02-I (06-04 UAT shape-mismatch driver) extends or
// replaces these as production usage surfaces voice misses.
export const REASONING_EXAMPLES: WriterExample[] = [
  {
    q: 'complaint about a flat pint, what do I do?',
    a: "First thing — check the gas. That's 80% of it.\nQuick check: pour another from the same line. If that's flat too, it's the keg or the line — change the keg, run a clean if it's still off.\nIf it's just the one pint, the punter's pint sat too long. Apologise, pour a fresh one, move on.\nIf two more come back from that line within an hour, take the line out of service and ring the cellar engineer.",
  },
  {
    q: "I'm short staffed tonight, what should I prioritise?",
    a: "Bar before floor — punters waiting to order is the worst look. Get your strongest server pulling pints.\nFood pickups go to whoever's nearest the pass — don't lock one person to runner duty when it's thin.\nDrop the table service rounds. Walk-up only at the bar until the rush settles.\nFinal call — bin the deep clean for tonight. Surfaces and glasses only. Catch up tomorrow.",
  },
  {
    q: 'should I take this group booking? 18 people, Saturday 7pm',
    a: "Two paths:\nIf you've got 4+ servers on Saturday and the kitchen's not slammed at 7, take it — group bookings are good money and they tip on the round.\nIf you're already at capacity covers or the kitchen's been wobbly that shift, pass. 18 people coming in late on a busy night is a recipe for slow service everywhere.\nThe move here: ring whoever's running Saturday and ask before you commit.",
  },
  {
    q: 'glasses are coming out the washer with white residue',
    a: "First thing — check the rinse aid. Empty bottle is 90% of this.\nIf the rinse aid's full, it's hard water build-up on the jets. Run an empty cycle with descaler — Cleenol works, 200ml in the wash compartment.\nIf you've done both and it's still happening, the jets are blocked. Pull the bottom rack, unscrew the spray arm, soak it in vinegar for an hour.\nDon't put glasses out with residue on them — punters notice and it's a hygiene flag if EHO walks in.",
  },
]

// Four incident-mode anchors. Same audit-M5 sourcing note as REASONING above.
// Voice rules: urgency-first ("Right —", "Get", "Cut", "Ring"), Now/Then/Don't
// structure where applicable, single empathy line at the END only ("you've done
// the hard bit"), 999 directive baked in for safety-relevant cases (allergens,
// fire, flood, unconscious, bleeding, drunk customer escalation).
export const INCIDENT_EXAMPLES: WriterExample[] = [
  {
    q: "cellar's flooding, what do I do?",
    a: "Right — cut the power to the cellar at the consumer unit, NOT in the cellar itself.\nNow: get everyone out of the cellar and shut the trap door.\nThen: ring the cellar emergency number — Punch line is 0345 094 0146.\nDon't go back in until power's confirmed off and the source is identified.\nIf water's near the gas line or you smell gas, ring 999 immediately.\nYou've done the right call moving fast.",
  },
  {
    q: 'drunk customer asking for another round',
    a: "Refuse the serve. Calmly: \"Sorry mate, can't serve you another one tonight.\"\nNow: offer water + tap them a soft on the house. De-escalates 70% of the time.\nThen: tell whoever's on door so they're aware on the way out.\nDon't engage if they push back — \"manager's call, not mine\" and walk away.\nIf they get aggressive or refuse to leave, ring 101. If anyone's threatened or hurt, ring 999.\nYou made the right call — better an angry punter than a license review.",
  },
  {
    q: "customer says the food's caused an allergic reaction",
    a: "Ring 999 now if they're showing serious symptoms — swelling, breathing issues, fainting. Don't wait to see if it gets worse.\nNow: get the customer somewhere quiet, sat down, water nearby.\nThen: pull the dish off the menu immediately. Note the time + table + dish + which staff plated it.\nDon't admit fault, don't give detail on ingredients beyond what's on the printed menu — let environmental health handle the investigation.\nLog it as a critical incident before end of shift. Ring the area manager tonight, not tomorrow.\nYou did the right thing acting fast.",
  },
  {
    q: 'fire alarm went off mid-service',
    a: "Right — get everyone out. Front and back doors, not the fire exit only.\nNow: take the till float and the booking sheet on the way past. Nothing else.\nThen: assemble at the muster point — the bench across the road.\nDon't go back in. Don't try to identify the source. Don't grab coats.\nRing 999 if it's a real fire and the alarm hasn't auto-dialled. Confirm with the fire marshal before re-entry.\nGood shout pulling everyone out fast — that's the bit that matters.",
  },
]
