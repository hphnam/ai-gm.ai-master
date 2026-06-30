import Redis from 'ioredis'

import { parseRedisUrl } from '../../redis-connection'

/// In-process sliding-window rate limiter. Single node only; horizontal
/// scale-out wants Redis (see `createRedisRateLimiter` below). Still used for
/// low-stakes authenticated anti-spam guards (note replies, incident comments,
/// no-data-query actions) where per-node counting is acceptable.
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

/// Cross-node rate limiter backed by Redis (fixed-window counter via an atomic
/// Lua INCR+PEXPIRE). Use for per-org / per-user billing-and-abuse limits that
/// MUST hold across horizontally-scaled API instances — otherwise each of the N
/// nodes keeps its own counter and the effective limit becomes N×. Fixed-window
/// (not sliding): a caller can burst up to `limit` either side of a window
/// boundary, which is fine for these coarse guards. Fails OPEN (allows the
/// request) and logs if Redis is unreachable, so a cache outage degrades to the
/// old single-node behaviour rather than locking everyone out.
export type RateLimitResult = { ok: boolean; retryAfterSeconds: number }

export type RedisRateLimiter = {
  /// Record a hit and report whether it was within the limit.
  allow(key: string): Promise<boolean>
  /// Like `allow`, but also returns seconds until the window resets so callers
  /// can surface a Retry-After.
  check(key: string): Promise<RateLimitResult>
}

// Atomic: increment the window counter and, on the first hit, arm its expiry;
// then report the count plus remaining TTL so callers can compute retry-after.
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('PTTL', KEYS[1])}
`

let sharedClient: Redis | null = null
let warnedNoRedis = false

function getClient(): Redis | null {
  if (sharedClient) return sharedClient
  const url = process.env.REDIS_URL
  if (!url) {
    if (!warnedNoRedis) {
      warnedNoRedis = true
      console.warn(
        JSON.stringify({ event: 'rate_limit.no_redis_url', detail: 'distributed limits disabled' }),
      )
    }
    return null
  }
  const client = new Redis({
    ...parseRedisUrl(url),
    // Fail fast rather than queue commands while Redis is unreachable — the
    // limiter fails open on error and must not block the request path.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  })
  client.on('error', (err: Error) => {
    console.warn(JSON.stringify({ event: 'rate_limit.redis_error', message: err.message }))
  })
  sharedClient = client
  return client
}

export function createRedisRateLimiter(
  windowMs: number,
  limit: number,
  prefix: string,
): RedisRateLimiter {
  const check = async (key: string): Promise<RateLimitResult> => {
    const client = getClient()
    if (!client) return { ok: true, retryAfterSeconds: 0 }
    try {
      const [count, pttl] = (await client.eval(
        HIT_SCRIPT,
        1,
        `rl:${prefix}:${key}`,
        String(windowMs),
      )) as [number, number]
      if (count <= limit) return { ok: true, retryAfterSeconds: 0 }
      const ttl = pttl > 0 ? pttl : windowMs
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)) }
    } catch (err) {
      // Fail open — a limiter outage must not take down the endpoint.
      console.warn(
        JSON.stringify({
          event: 'rate_limit.check_failed',
          prefix,
          message: (err as Error).message,
        }),
      )
      return { ok: true, retryAfterSeconds: 0 }
    }
  }
  return {
    check,
    async allow(key: string): Promise<boolean> {
      return (await check(key)).ok
    },
  }
}
