import { createHmac, timingSafeEqual } from 'node:crypto'

// 03-06 — stateless signed onboarding token.
// Format: `<inviteId>.<expEpochSec>.<sigB64url>`
// where sig = HMAC-SHA256(BETTER_AUTH_SECRET, `${inviteId}:${expEpochSec}`)
//
// Why HMAC over JWT?
//   - One bound use-case (this invite); no need for JWT's standard claims.
//   - No third-party crypto dep; node:crypto only.
//   - Replay protection is at the DB layer — invite.status flips to 'redeemed'
//     atomically; second use loses the race. Token TTL is a soft fence.
//
// TRUST MODEL — IMPORTANT:
//   The token does NOT bind to the recipient's phone. Anyone holding the
//   signed link can complete onboarding and end up linked to the invite's
//   target phone within the issuing org. That is intentional (this matches
//   the standard WhatsApp signed-link onboarding pattern) but it means
//   *forwarding the link = forwarding the org seat*. Mitigations:
//     1. Short TTL (WHATSAPP_INVITE_TTL_MS) limits the window.
//     2. Single-use (markRedeemed atomic flip) prevents replay.
//     3. Manager rate-limit + cross-org guard at invite creation.
//   For higher-trust orgs, add a phone-OTP step-up before redemption.

// Maximum permitted TTL of a token. The server can issue tokens with any
// expiresAt, but a forged/typo'd Date in the far future is rejected here as
// defense-in-depth. Picked at 2× the documented WHATSAPP_INVITE_TTL_MS (24h).
const MAX_TOKEN_TTL_SEC = 48 * 60 * 60

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Buffer {
  const padded = s
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(s.length + ((4 - (s.length % 4)) % 4), '=')
  return Buffer.from(padded, 'base64')
}

export function signInviteToken(inviteId: string, expiresAt: Date, secret: string): string {
  const expEpochSec = Math.floor(expiresAt.getTime() / 1000).toString(36)
  const payload = `${inviteId}:${expEpochSec}`
  const sig = createHmac('sha256', secret).update(payload).digest()
  return `${inviteId}.${expEpochSec}.${b64url(sig)}`
}

export type VerifiedToken =
  | { ok: true; inviteId: string }
  | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' }

export function verifyInviteToken(token: string, secret: string): VerifiedToken {
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, reason: 'malformed' }
  const [inviteId, expEpochB36, sigStr] = parts
  if (!inviteId || !expEpochB36 || !sigStr) return { ok: false, reason: 'malformed' }

  const payload = `${inviteId}:${expEpochB36}`
  const expected = createHmac('sha256', secret).update(payload).digest()
  let received: Buffer
  try {
    received = b64urlDecode(sigStr)
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (received.length !== expected.length) return { ok: false, reason: 'bad-signature' }
  if (!timingSafeEqual(received, expected)) return { ok: false, reason: 'bad-signature' }

  const expEpochSec = Number.parseInt(expEpochB36, 36)
  if (!Number.isFinite(expEpochSec)) return { ok: false, reason: 'malformed' }
  const nowSec = Math.floor(Date.now() / 1000)
  if (expEpochSec < nowSec) return { ok: false, reason: 'expired' }
  // 03-06 fix 7: cap absolute TTL even for HMAC-valid tokens. A server-issued
  // token with a typo'd far-future expiresAt would otherwise live "forever".
  if (expEpochSec > nowSec + MAX_TOKEN_TTL_SEC) return { ok: false, reason: 'malformed' }

  return { ok: true, inviteId }
}
