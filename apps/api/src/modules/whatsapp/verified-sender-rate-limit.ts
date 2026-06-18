import { VERIFIED_SENDER_LIMIT_PER_HOUR, VERIFIED_SENDER_WINDOW_MS } from '../../types'

type Bucket = { timestamps: number[]; throttleReplyAt?: number }

const buckets = new Map<string, Bucket>()
const MAX_ENTRIES = 10_000

export function recordAndCheckVerifiedSender(
  phoneHash: string,
  nowMs: number = Date.now(),
): { allowed: boolean; countInWindow: number; shouldSendThrottleReply: boolean } {
  const cutoff = nowMs - VERIFIED_SENDER_WINDOW_MS
  let bucket = buckets.get(phoneHash)
  if (!bucket) {
    bucket = { timestamps: [] }
    buckets.set(phoneHash, bucket)
    if (buckets.size > MAX_ENTRIES) {
      for (const [k, b] of buckets) {
        if (b.timestamps.length === 0 || b.timestamps[b.timestamps.length - 1]! < cutoff) {
          buckets.delete(k)
        }
      }
    }
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff)

  if (bucket.timestamps.length >= VERIFIED_SENDER_LIMIT_PER_HOUR) {
    const shouldSendThrottleReply =
      bucket.throttleReplyAt === undefined ||
      nowMs - bucket.throttleReplyAt > VERIFIED_SENDER_WINDOW_MS / 2
    if (shouldSendThrottleReply) bucket.throttleReplyAt = nowMs
    return {
      allowed: false,
      countInWindow: bucket.timestamps.length,
      shouldSendThrottleReply,
    }
  }

  bucket.timestamps.push(nowMs)
  return {
    allowed: true,
    countInWindow: bucket.timestamps.length,
    shouldSendThrottleReply: false,
  }
}

export function __resetForTest(): void {
  buckets.clear()
}
