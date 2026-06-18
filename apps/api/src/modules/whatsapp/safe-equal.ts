// Phase 03-01 audit-added M1 — timing-safe equality helpers.
// All comparison of secret material (invite codes, OTP hashes) MUST go through
// these helpers to avoid timing-attack side channels. Plain `===` on user-supplied
// strings reveals position-of-first-mismatch via response-time correlation.

import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time string comparison. Returns false on length mismatch (no early-out
 * timing leak — the caller must treat any false the same regardless of length).
 *
 * Use for invite-code comparison (already hashed/normalized inputs are also fine).
 */
export function safeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Constant-time buffer comparison. Pre-condition: both buffers must be the same
 * length (e.g. both sha256 digests = 32 bytes). Throws if length mismatch — the
 * caller should always be comparing fixed-width hashes.
 */
export function safeBufferEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
