import type { Logger } from '@nestjs/common'
import { TYPING_MAX_REFIRES, TYPING_REFIRE_MS } from '../../types'

type TypingSender = {
  sendTypingIndicator: (conversationSid: string) => Promise<unknown>
}

type Entry = {
  timer: NodeJS.Timeout | null
  refireCount: number
  startedAt: number
  status: 'active' | 'exhausted'
  conversationSid: string
}

const MAP_CAP = 1_000
const timers = new Map<string, Entry>()

function capMap(): void {
  if (timers.size <= MAP_CAP) return
  // Drop oldest ~20% by startedAt order (Map preserves insertion order — startedAt is monotonic).
  const dropCount = Math.floor(MAP_CAP * 0.2)
  let dropped = 0
  for (const [k, v] of timers) {
    if (dropped >= dropCount) break
    if (v.timer) clearTimeout(v.timer)
    timers.delete(k)
    dropped++
  }
}

export function startTypingRefire(
  messageSid: string,
  conversationSid: string,
  adapter: TypingSender,
  logger: Logger,
): void {
  if (timers.has(messageSid)) return // idempotent
  const entry: Entry = {
    timer: null,
    refireCount: 0,
    startedAt: Date.now(),
    status: 'active',
    conversationSid,
  }
  timers.set(messageSid, entry)
  capMap()

  // 03-03 APPLY deviation: probe-only refire-interval override so timing-dependent
  // tests can fire faster than the 12s CHAT_TIMEOUT_MS budget. Production uses
  // the constant. NODE_ENV !== 'production' gates the read.
  const refireMs =
    process.env.NODE_ENV !== 'production' && process.env.PROBE_TYPING_REFIRE_MS
      ? Math.max(50, Number(process.env.PROBE_TYPING_REFIRE_MS))
      : TYPING_REFIRE_MS

  const schedule = (): void => {
    entry.timer = setTimeout(() => {
      const cur = timers.get(messageSid)
      if (!cur || cur.status !== 'active') return
      cur.refireCount++
      logger.log('whatsapp.typing_indicator_refired', {
        messageSid,
        round: cur.refireCount,
      })
      // Best-effort: errors are swallowed; the refire itself is fire-and-forget.
      // 03-06: typing indicator hits Twilio's Conversations Typing endpoint
      // which is per-Conversation, not per-Message. We keep the timer keyed by
      // MessageSid (so concurrent inbound messages from the same phone don't
      // collide on clear) but the API call uses the conversationSid stashed
      // on the entry.
      adapter.sendTypingIndicator(cur.conversationSid).catch(() => {})

      if (cur.refireCount >= TYPING_MAX_REFIRES) {
        // audit-added AC-16/M6: retain the entry with status='exhausted' so clearTypingRefire
        // still returns the accurate refireCount instead of null.
        cur.status = 'exhausted'
        cur.timer = null
        logger.log('whatsapp.typing_indicator_exhausted', {
          messageSid,
          refireCount: cur.refireCount,
        })
        return
      }
      schedule()
    }, refireMs)
  }
  schedule()
}

export function clearTypingRefire(messageSid: string): { refireCount: number } | null {
  const entry = timers.get(messageSid)
  if (!entry) return null
  if (entry.timer) clearTimeout(entry.timer)
  timers.delete(messageSid)
  return { refireCount: entry.refireCount }
}

export function __resetForTest(): void {
  for (const [, v] of timers) {
    if (v.timer) clearTimeout(v.timer)
  }
  timers.clear()
}
