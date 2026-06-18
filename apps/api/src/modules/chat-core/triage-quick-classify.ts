// Plan 06-04 hot-fix 2026-05-02 — fast-path Triage classifier.
//
// Real-Anthropic Triage on Haiku 4.5 with generateObject + the structured
// schema is genuinely 10-15s on cold start. For obvious lookup/incident
// patterns (the bulk of operator queries — "what's below par?", "Bibendum
// cutoff?", "cellar's flooding") spending 10s on classification is wrong.
//
// quickClassify runs deterministic regex branches BEFORE Anthropic. On a
// high-confidence match: returns a synthesized TriageOutput in <1ms with no
// API call. On no match: returns null and the caller falls back to Anthropic
// generateObject for the genuinely ambiguous case.
//
// The branches mirror stubClassify in triage.service.ts so probe assertions
// stay green. The KEY difference: quickClassify does NOT have the catch-all
// "default to docs lookup" fallback that stubClassify uses for probe
// completeness. Unknown queries fall through to the LLM, which is the right
// place for genuine classification.

import { MAX_RESEARCHERS_PER_TURN, type ResearcherName, type TriageOutput } from '../../types'

const VENUE_BRIEF =
  'Briefing for current shift context: profile, layout, active incidents in last 24h, upcoming cutoffs in next 4h.'

function build(
  mode: TriageOutput['mode'],
  dispatch: ResearcherName[],
  briefs: Partial<Record<ResearcherName, string>>,
  safetySignal: boolean,
): TriageOutput {
  const capped = dispatch.slice(0, MAX_RESEARCHERS_PER_TURN)
  const briefsOut: TriageOutput['briefByResearcher'] = {}
  for (const r of capped) {
    if (briefs[r]) briefsOut[r] = briefs[r]
  }
  return {
    mode,
    researchersToDispatch: capped,
    briefByResearcher: briefsOut,
    safetySignal,
  }
}

// Returns a high-confidence TriageOutput for known patterns, or null when the
// query is genuinely ambiguous and the LLM should classify.
export function quickClassify(userMessage: string): TriageOutput | null {
  const lower = userMessage.toLowerCase()

  // ── Priority 1: SAFETY / INCIDENT ─────────────────────────────────────────
  if (
    /pint.*sick|sick.*pint|tasted off.*sick|sick.*tasted off|allergen|allergy|allergic reaction/i.test(
      userMessage,
    )
  ) {
    return build(
      'incident',
      ['venue', 'docs', 'people'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch allergen handling procedure + incident logging requirements.',
        people: 'Fetch duty manager + GP/A&E emergency contacts.',
      },
      true,
    )
  }
  if (/cellar.*flood|flooding|burst pipe/i.test(userMessage)) {
    return build(
      'incident',
      ['venue', 'docs', 'people'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch cellar emergency procedure + power-isolation steps.',
        people: 'Fetch maintenance + duty manager contacts.',
      },
      true,
    )
  }
  if (/\b(fire|fire alarm|alarm went off)\b/i.test(userMessage)) {
    return build(
      'incident',
      ['venue', 'docs', 'people'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch fire evacuation procedure + muster point + 999 protocol.',
        people: 'Fetch duty manager + fire warden contacts.',
      },
      true,
    )
  }
  if (
    /\b(drunk customer|drunk patron|unconscious|bleeding|injury|fainting|choking)\b/i.test(
      userMessage,
    )
  ) {
    return build(
      'incident',
      ['venue', 'docs', 'people'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch refusal-of-service / injury / safety procedure.',
        people: 'Fetch duty manager + first-aider contacts.',
      },
      true,
    )
  }

  // ── Priority 2: REASONING ─────────────────────────────────────────────────
  if (/flat pint|complaint about/i.test(userMessage)) {
    return build(
      'reasoning',
      ['venue', 'docs', 'ops'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch keg/line troubleshooting steps that inform a multi-path diagnosis.',
        ops: 'Fetch keg + line state + supplier cutoffs that may bear on the diagnosis.',
      },
      false,
    )
  }
  if (/short[- ]staffed|short staff/i.test(userMessage)) {
    return build(
      'reasoning',
      ['venue', 'ops', 'people'],
      {
        venue: VENUE_BRIEF,
        ops: 'Fetch operational priorities and stock state for understaffed shifts.',
        people: 'Fetch duty manager + on-call staff contacts.',
      },
      false,
    )
  }
  if (/group booking|should i take|should i accept/i.test(userMessage)) {
    return build(
      'reasoning',
      ['venue', 'ops'],
      {
        venue: VENUE_BRIEF,
        ops: 'Fetch capacity + staffing + stock state that affect the booking decision.',
      },
      false,
    )
  }
  if (/glass.*residue|residue|washer/i.test(userMessage)) {
    return build(
      'reasoning',
      ['venue', 'docs', 'ops'],
      {
        venue: VENUE_BRIEF,
        docs: 'Fetch glass-wash troubleshooting + descaler procedure + EHO flags.',
        ops: 'Fetch detergent stock + last-clean state.',
      },
      false,
    )
  }

  // ── Priority 3: LOOKUP — single specialist by domain ──────────────────────
  if (lower.includes('below par')) {
    return build(
      'lookup',
      ['ops'],
      { ops: 'Find current stock levels and which items are at or below par.' },
      false,
    )
  }
  if (lower.includes('open up') || lower.includes('opening') || lower.includes('checklist')) {
    return build(
      'lookup',
      ['docs'],
      { docs: 'Fetch the relevant venue checklist and surface its full ordered steps.' },
      false,
    )
  }
  if (lower.includes('bibendum') || lower.includes('cutoff') || lower.includes('supplier')) {
    return build(
      'lookup',
      ['ops'],
      { ops: 'Find the supplier cutoff time / supplier details.' },
      false,
    )
  }
  if (
    lower.includes('top 3') ||
    lower.includes('top selling') ||
    lower.includes('total revenue') ||
    lower.includes('sales last') ||
    lower.includes('heineken')
  ) {
    return build(
      'lookup',
      ['tabular'],
      { tabular: 'Run an aggregate query over the relevant tabular doc.' },
      false,
    )
  }
  if (
    lower.includes('ice machine') ||
    lower.includes('engineer') ||
    lower.includes('who do i call')
  ) {
    return build('lookup', ['people'], { people: 'Look up the engineer / contact details.' }, false)
  }

  // Genuinely ambiguous — caller falls back to LLM Triage.
  return null
}
