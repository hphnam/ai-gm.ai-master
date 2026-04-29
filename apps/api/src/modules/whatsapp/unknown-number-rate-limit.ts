import { ONBOARDING_COOLDOWN_MS } from '../../types'

const lastReplyAt = new Map<string, number>()
const MAX_ENTRIES = 10_000

export function recordAndCheckOnboardingReply(
  phoneHash: string,
  nowMs: number = Date.now(),
): { shouldReply: boolean } {
  const prev = lastReplyAt.get(phoneHash)
  if (prev === undefined || nowMs - prev > ONBOARDING_COOLDOWN_MS) {
    lastReplyAt.set(phoneHash, nowMs)
    if (lastReplyAt.size > MAX_ENTRIES) {
      const cutoff = nowMs - 2 * ONBOARDING_COOLDOWN_MS
      for (const [k, v] of lastReplyAt) {
        if (v < cutoff) lastReplyAt.delete(k)
      }
    }
    return { shouldReply: true }
  }
  return { shouldReply: false }
}

export function __resetForTest(): void {
  lastReplyAt.clear()
}
