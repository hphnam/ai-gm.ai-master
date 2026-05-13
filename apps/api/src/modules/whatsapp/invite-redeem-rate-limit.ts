// 03-06 — public redeem endpoint throttle.
//
// Two independent token buckets keyed by:
//   - ip            (raw caller IP — catches brute-forcing across invite IDs)
//   - inviteId      (catches concentrated attempts against one known invite)
//
// In-memory only. Same pattern as unknown-number-rate-limit.ts; for multi-replica
// production deployments this should migrate to Redis (or be acceptable on the
// assumption that webhook + redeem traffic are both behind a single proxy).

const WINDOW_MS = 60 * 1000 // 1-minute rolling window
const MAX_PER_IP = 20 // per IP per minute (preview + complete combined)
const MAX_PER_INVITE = 10 // per invite per minute
const MAP_CAP = 10_000

type Bucket = { count: number; resetAt: number }
const ipBuckets = new Map<string, Bucket>()
const inviteBuckets = new Map<string, Bucket>()

function recordAndCheck(
  buckets: Map<string, Bucket>,
  key: string,
  limit: number,
  nowMs: number,
): { allowed: boolean; countInWindow: number } {
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + WINDOW_MS })
    capMap(buckets, nowMs)
    return { allowed: true, countInWindow: 1 }
  }
  existing.count++
  return { allowed: existing.count <= limit, countInWindow: existing.count }
}

function capMap(buckets: Map<string, Bucket>, nowMs: number): void {
  if (buckets.size <= MAP_CAP) return
  for (const [k, v] of buckets) {
    if (v.resetAt <= nowMs) buckets.delete(k)
  }
}

export function checkRedeemRateLimit(
  ip: string,
  inviteIdOrNull: string | null,
  nowMs: number = Date.now(),
): { allowed: boolean; reason?: 'ip' | 'invite' } {
  const byIp = recordAndCheck(ipBuckets, ip, MAX_PER_IP, nowMs)
  if (!byIp.allowed) return { allowed: false, reason: 'ip' }
  if (inviteIdOrNull) {
    const byInvite = recordAndCheck(inviteBuckets, inviteIdOrNull, MAX_PER_INVITE, nowMs)
    if (!byInvite.allowed) return { allowed: false, reason: 'invite' }
  }
  return { allowed: true }
}

export function __resetForTest(): void {
  ipBuckets.clear()
  inviteBuckets.clear()
}
