// Plan 06-03 audit-M5 — frozen-clock helper for stub-mode idempotency.
//
// Researchers + tools that compute "now-X" boundaries (last 24h, next 4h) MUST
// import stubClock() instead of Date.now(). In production, stubClock() returns
// Date.now() — zero behaviour change. Under PROBE_CHAT_CORE_STUB=1, stubClock()
// returns FROZEN_STUB_NOW_MS, a fixed Unix ms timestamp.
//
// This guarantees two probe iterations spaced milliseconds apart produce
// byte-identical payloads at the 24h/4h window boundary — V63.idempotent
// asserts JSON.stringify(briefing_run1) === JSON.stringify(briefing_run2).

import { FROZEN_STUB_NOW_MS } from '../../types/chat-core'

export function stubClock(): number {
  return process.env.PROBE_CHAT_CORE_STUB === '1' ? FROZEN_STUB_NOW_MS : Date.now()
}
