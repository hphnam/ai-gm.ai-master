// Plan 06-01 Task 2 audit-M4 — sanitize user input BEFORE Triage receives it.
//
// Raw user message is persisted to chat_messages.content (audit trail). Only the
// SANITIZED copy is passed to Triage. This is defense-in-depth against prompt
// injection: a stray "<system>ignore previous instructions</system>" cannot
// reach the model as a fresh role marker, and instruction-injection cliches get
// flagged so Triage sees `[SANITIZED]` instead of imperative-mood overrides.

import { MAX_USER_MESSAGE_LEN } from '../../types/chat-core'

// Control-character class: nulls, BEL, backspace, FF, ESC, etc. Keep \n (0x0A)
// and \t (0x09) so multi-line questions / pasted text survive intact.
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

// Conversation role markers. Case-insensitive, opening or closing tags.
const ROLE_MARKER_RE = /<\/?(system|assistant|user|human|ai|tool)>/gi

// Instruction-injection cliches. Allows one or more modifiers between the verb
// and the noun: "ignore all instructions", "ignore previous instructions",
// "ignore all previous instructions", "disregard the above rules", etc.
const INJECTION_RE =
  /(?:^|\n)\s*(ignore|disregard|forget)(?:\s+(?:all|previous|prior|the\s+above))+\s+(?:instructions?|rules?|system\s+prompt)/gi

export function sanitizeForTriage(raw: string): string {
  const truncated = raw.length > MAX_USER_MESSAGE_LEN ? raw.slice(0, MAX_USER_MESSAGE_LEN) : raw
  const noControl = truncated.replace(CONTROL_CHAR_RE, ' ')
  const noRoleMarkers = noControl.replace(ROLE_MARKER_RE, '')
  const noInjection = noRoleMarkers.replace(INJECTION_RE, ' [SANITIZED]')
  return noInjection
}
