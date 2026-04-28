import type { AgentMode, AgentTier } from './gm-agent'

const SIMPLE_LOOKUP_PATTERNS = [
  /^(who|what|where|when|how much|how many|which)\b/i,
  /\b(supplier|phone|number|cutoff|par level|stock level|opening hours)\b/i,
  /\b(below par|out of stock)\b/i,
]

// Capture / save / multi-step trigger words — never use Haiku for these.
const COMPLEX_TRIGGERS = [
  /\b(save|add|store|remember|capture|record|create) (an? )?(sop|procedure|q.?a|note|doc|knowledge)\b/i,
  /\b(walk me through|explain step by step|teach me|train me|step.?by.?step)\b/i,
  /\b(why|because|reason)\b/i,
  /\?[^?]*\?/, // multi-question messages
]

/// Phase E (Task #13) — heuristic tier router.
///
///  - non-default mode (incident / handover / training) → always Sonnet.
///  - obvious capture / why / multi-question → Sonnet.
///  - short factual lookups ("who supplies our beer?", "stock below par at the Crown")
///    → Haiku.
///  - everything else → Sonnet (safe default).
///
/// All routing decisions are message-level — nothing about prior history overrides
/// these rules. Cheap (regex only, no API call), reversible (just change the tier
/// on the next turn).
export function pickTier(message: string, mode: AgentMode): AgentTier {
  if (mode !== 'default') return 'sonnet'
  const text = message.trim()
  if (text.length === 0) return 'sonnet'
  if (text.length > 240) return 'sonnet'

  for (const re of COMPLEX_TRIGGERS) {
    if (re.test(text)) return 'sonnet'
  }

  for (const re of SIMPLE_LOOKUP_PATTERNS) {
    if (re.test(text)) return 'haiku'
  }

  return 'sonnet'
}
