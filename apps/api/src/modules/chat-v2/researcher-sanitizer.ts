// Plan 06-03 audit-M4 — brief sanitization at the researcher boundary.
//
// 06-01 audit-M4 sanitized user input pre-Triage via `sanitizeForTriage`. But
// Triage emits `briefByResearcher[<name>]` strings that flow into each
// researcher's `generateText({ messages: [{ role: 'user', content: brief }] })`
// call. If Triage gets jailbroken (or genuinely tries to be helpful with
// verbatim user phrasing), the brief itself can carry `\nAssistant: ignore
// previous` or similar. Each researcher is a NEW Anthropic call, NEW attack
// surface — so we sanitize the brief at every researcher entry point.
//
// The regex contract MIRRORS sanitizeForTriage exactly. Sanitizing twice
// produces the same output as sanitizing once (idempotent — V62.injection).

const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
const ROLE_MARKER_RE = /<\/?(system|assistant|user|human|ai|tool)>/gi
// Multi-line role-marker pattern catches "\nAssistant:" injection — distinct
// from the bracketed form above. This is the dominant brief-injection vector
// since briefs flow through Triage prose, not raw user XML.
const NEWLINE_ROLE_MARKER_RE = /(?:^|\n)\s*(assistant|user|human|system|tool)\s*:/gi
const INJECTION_RE =
  /(?:^|\n)\s*(ignore|disregard|forget)(?:\s+(?:all|previous|prior|the\s+above))+\s+(?:instructions?|rules?|system\s+prompt)/gi

const MAX_BRIEF_LEN = 2_000

export function sanitizeForResearcher(brief: string): string {
  const truncated = brief.length > MAX_BRIEF_LEN ? brief.slice(0, MAX_BRIEF_LEN) : brief
  const noControl = truncated.replace(CONTROL_CHAR_RE, ' ')
  const noBracketRoles = noControl.replace(ROLE_MARKER_RE, '')
  const noNewlineRoles = noBracketRoles.replace(NEWLINE_ROLE_MARKER_RE, ' [SANITIZED] ')
  const noInjection = noNewlineRoles.replace(INJECTION_RE, ' [SANITIZED]')
  return noInjection
}
