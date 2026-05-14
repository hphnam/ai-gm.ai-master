/// In-process sliding-window rate limiter. Single node only; horizontal
/// scale-out wants Redis. The chat code already uses this exact shape for
/// leave_note_for_user / create_task (see tool-dispatcher.ts) — we mirror
/// it here so providers don't drag a Redis dep onto every integration.
///
/// `windowMs` is the bucket width; `limit` is the maximum hits inside it.
/// `allow(key)` returns false when the caller would breach the limit and
/// true otherwise (and records the hit). Stale buckets are evicted lazily
/// at read time so the Map doesn't grow unbounded.
export type RateLimiter = {
  allow(key: string): boolean
}

export function createRateLimiter(windowMs: number, limit: number): RateLimiter {
  const buckets = new Map<string, number[]>()
  return {
    allow(key: string): boolean {
      const now = Date.now()
      const cutoff = now - windowMs
      const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff)
      if (recent.length >= limit) {
        buckets.set(key, recent)
        return false
      }
      recent.push(now)
      buckets.set(key, recent)
      return true
    },
  }
}
