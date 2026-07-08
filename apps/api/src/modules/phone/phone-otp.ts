// Self-owned phone OTP (5-digit PIN) for the better-auth phoneNumber plugin.
// Unlike Twilio Verify, we generate the code ourselves so it can be embedded in
// the invite SMS alongside the onboarding link (one message, link + PIN). One
// live row per phone — re-issuing (resend / new invite) replaces the prior code.

import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { PhoneRateLimit } from '../../types'
import { maskPhone } from '../../types/auth'
import { createRedisRateLimiter } from '../integrations/rate-limit'
import { sendSms } from './twilio-verify'

export const PHONE_OTP_LENGTH = 5
export const PHONE_OTP_MAX_ATTEMPTS = 5
// On-demand sends (resend button, returning-user login). Invite-seeded PINs use
// the invite's own 24h TTL so link + code expire together.
export const PHONE_OTP_TTL_MS = 15 * 60 * 1000

const logger = new Logger('PhoneOtp')

// Same prefix + window as PhoneService's linking-flow limiter so both send
// paths draw from one per-number budget. failClosed: a Redis outage must not
// turn this into an open SMS relay.
const sendPerNumberLimit = createRedisRateLimiter(
  PhoneRateLimit.WINDOW_MS,
  PhoneRateLimit.MAX_SENDS_PER_NUMBER,
  'phone-send-number',
  { failClosed: true },
)

function generatePin(): string {
  return String(randomInt(0, 10 ** PHONE_OTP_LENGTH)).padStart(PHONE_OTP_LENGTH, '0')
}

// HMAC (not bare sha256) keyed on the auth secret so a leaked `phone_otps` table
// can't be reversed offline against the tiny 5-digit preimage space.
function hashPin(code: string): string {
  return createHmac('sha256', process.env.BETTER_AUTH_SECRET ?? '')
    .update(code)
    .digest('hex')
}

/**
 * Generate + persist a fresh PIN for `phone`, invalidating any prior codes.
 * Returns the plaintext for the caller to deliver (SMS body). Does NOT send.
 */
export async function issuePhoneOtp(
  phone: string,
  ttlMs: number = PHONE_OTP_TTL_MS,
): Promise<{ code: string }> {
  const code = generatePin()
  await prisma.$transaction([
    prisma.phoneOtp.deleteMany({ where: { phoneNumber: phone } }),
    prisma.phoneOtp.create({
      data: {
        phoneNumber: phone,
        codeHash: hashPin(code),
        attemptsLeft: PHONE_OTP_MAX_ATTEMPTS,
        expiresAt: new Date(Date.now() + ttlMs),
      },
    }),
  ])
  return { code }
}

/** Issue + deliver a code-only SMS. Used by better-auth sendOTP (resend/login). */
export async function sendPhoneOtp(phone: string): Promise<{ ok: boolean; rateLimited?: boolean }> {
  const phoneHash = createHash('sha256').update(phone).digest('hex').slice(0, 16)
  const limit = await sendPerNumberLimit.check(phoneHash)
  if (!limit.ok) {
    logger.warn(
      JSON.stringify({ event: 'phone_otp.rate_limited', phone: maskPhone(phone), phoneHash }),
    )
    return { ok: false, rateLimited: true }
  }
  const { code } = await issuePhoneOtp(phone)
  const { ok } = await sendSms(
    phone,
    `Your GM AI verification code is ${code}. It expires in 15 minutes.`,
  )
  logger.log(
    JSON.stringify({
      event: ok ? 'phone_otp.sent' : 'phone_otp.send_failed',
      phone: maskPhone(phone),
    }),
  )
  return { ok }
}

/**
 * Verify the live PIN for `phone`. The attempt is consumed atomically BEFORE the
 * compare — a single conditional UPDATE decrements `attemptsLeft` and returns the
 * row, so concurrent guesses can't race past the cap (each request serializes on
 * the row lock; once attemptsLeft hits 0 the WHERE matches nothing). Compare is
 * timing-safe; a correct guess then flips consumedAt atomically.
 */
export async function verifyPhoneOtp(phone: string, submitted: string): Promise<boolean> {
  const code = submitted.trim()
  const rows = await prisma.$queryRaw<{ id: string; codeHash: string }[]>`
    UPDATE "phone_otps"
    SET "attemptsLeft" = "attemptsLeft" - 1
    WHERE "id" = (
      SELECT "id" FROM "phone_otps"
      WHERE "phoneNumber" = ${phone}
        AND "consumedAt" IS NULL
        AND "expiresAt" > now()
        AND "attemptsLeft" > 0
      ORDER BY "createdAt" DESC
      LIMIT 1
    )
    RETURNING "id", "codeHash"
  `
  const row = rows[0]
  if (!row) return false

  const expected = Buffer.from(row.codeHash, 'hex')
  const actual = Buffer.from(hashPin(code), 'hex')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false

  const consumed = await prisma.phoneOtp.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  })
  return consumed.count > 0
}
