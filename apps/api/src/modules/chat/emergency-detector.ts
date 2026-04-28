/// Phase G3 — pre-agent emergency detector. Returns true when the user's
/// message indicates an in-progress critical emergency that should override
/// normal answering: bypass capture-mode rules, force incident-overlay
/// behaviour, surface 999 + emergency contacts immediately, and require
/// log_incident before the turn ends.
///
/// More aggressive than ConversationModeService's incident classifier:
/// matches only the unambiguously-critical signals, not e.g. someone asking
/// "what's our procedure for gas leaks" (which would be informational).

const CRITICAL_PATTERNS = [
  // Fire / smoke (in progress, not informational)
  /\b(there'?s|we'?ve got|i see|i smell)\s+(a\s+)?(fire|smoke|burning)\b/i,
  /\bfire\s+(alarm|in the|started|spreading|broke out)\b/i,
  /\bsmoke\s+(coming|filling|everywhere)\b/i,

  // Gas
  /\b(smell|smelling|smelt|leak)\s+(of\s+)?gas\b/i,
  /\bgas\s+(leak|leaking|smell)\b/i,

  // Medical
  /\b(unconscious|collapsed|fainted|seizure|stroke|heart attack|choking)\b/i,
  /\b(bleeding heavily|severe bleeding|won'?t stop bleeding)\b/i,
  /\b(can'?t breathe|stopped breathing|not breathing)\b/i,
  /\b(allergic reaction|anaphylactic|epi.?pen)\b/i,

  // Crime / violence in progress
  /\b(being\s+(robbed|attacked|assaulted))\b/i,
  /\b(theft\s+in\s+progress|just\s+stole|just\s+robbed)\b/i,
  /\b(armed|weapon|knife|gun)\s+(person|customer|guy|man|woman)\b/i,

  // Explicit emergency phrasing
  /\b(it'?s\s+an?\s+emergency|emergency\s+now|call\s+999|need\s+ambulance)\b/i,
]

export type EmergencyAdvisory = {
  triggered: boolean
  matched: string | null
}

export function detectEmergency(message: string): EmergencyAdvisory {
  const text = message.trim()
  if (text.length === 0) return { triggered: false, matched: null }
  for (const re of CRITICAL_PATTERNS) {
    const match = re.exec(text)
    if (match) {
      return { triggered: true, matched: match[0] }
    }
  }
  return { triggered: false, matched: null }
}
