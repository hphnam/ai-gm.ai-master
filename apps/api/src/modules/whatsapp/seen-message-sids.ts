import { SEEN_SID_MAX_ENTRIES, SEEN_SID_TTL_MS } from '../../types'

const seen = new Map<string, number>()

export function markAndCheckSid(messageSid: string, nowMs: number = Date.now()): { seen: boolean } {
  const prev = seen.get(messageSid)
  if (prev !== undefined && nowMs - prev < SEEN_SID_TTL_MS) {
    return { seen: true }
  }
  seen.set(messageSid, nowMs)
  if (seen.size > SEEN_SID_MAX_ENTRIES) {
    // Drop oldest ~20% by iteration order (Map preserves insertion order).
    const dropCount = Math.floor(SEEN_SID_MAX_ENTRIES * 0.2)
    let dropped = 0
    for (const k of seen.keys()) {
      if (dropped >= dropCount) break
      seen.delete(k)
      dropped++
    }
  }
  return { seen: false }
}

export function __resetForTest(): void {
  seen.clear()
}
