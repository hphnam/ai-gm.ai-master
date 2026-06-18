// Phase 03-01 — WhatsApp OTP service.
// Owns: OTP generation (CSPRNG, sha256 hash), in-channel WhatsApp delivery via
// WhatsAppAdapter.sendText, timing-safe verification, in-memory per-phone
// rate-limit (3/hour) with TTL sweep, re-issuance debounce (30s).

import { createHash, randomInt } from 'node:crypto'
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { WhatsappInvite, WhatsappOtpAttempt } from '@prisma/client'
import { prisma } from '../../database/prisma'
import {
  WHATSAPP_OTP_LENGTH,
  WHATSAPP_OTP_MAX_ATTEMPTS,
  WHATSAPP_OTP_RATE_LIMIT_PER_HOUR,
  WHATSAPP_OTP_RATE_LIMIT_SWEEP_MS,
  WHATSAPP_OTP_REISSUE_DEBOUNCE_MS,
  WHATSAPP_OTP_TTL_MS,
} from '../../types'
import { maskPhone } from '../../types/auth'
import { safeBufferEqual } from './safe-equal'
import { WhatsAppAdapter } from './whatsapp.adapter'

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1h, matches WHATSAPP_OTP_RATE_LIMIT_PER_HOUR semantic.

export type RequestOtpResult =
  | { ok: true; attempt: WhatsappOtpAttempt }
  | {
      ok: false
      reason: 'rate_limited' | 'send_failed' | 'debounced'
      attempt?: WhatsappOtpAttempt
    }

export type VerifyOtpResult =
  | { ok: true; attempt: WhatsappOtpAttempt }
  | { ok: false; reason: 'wrong' | 'exhausted' | 'expired' | 'no_active_attempt' }

@Injectable()
export class WhatsappOtpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappOtpService.name)
  // In-memory per-phone-number rate-limit map. Cluster-aware migration deferred
  // (D-03-01-A — single-instance only for now).
  private readonly rateLimitMap = new Map<string, number[]>()
  private sweepHandle?: NodeJS.Timeout

  constructor(private readonly adapter: WhatsAppAdapter) {}

  // S8 — TTL cleanup sweep. Drops timestamps older than 1h, removes empty entries.
  onModuleInit(): void {
    this.sweepHandle = setInterval(() => this.sweepRateLimitMap(), WHATSAPP_OTP_RATE_LIMIT_SWEEP_MS)
    if (this.sweepHandle.unref) this.sweepHandle.unref()
  }
  onModuleDestroy(): void {
    if (this.sweepHandle) clearInterval(this.sweepHandle)
  }

  private sweepRateLimitMap(): void {
    const now = Date.now()
    const cutoff = now - RATE_LIMIT_WINDOW_MS
    for (const [phone, ts] of this.rateLimitMap.entries()) {
      const fresh = ts.filter((t) => t > cutoff)
      if (fresh.length === 0) this.rateLimitMap.delete(phone)
      else if (fresh.length !== ts.length) this.rateLimitMap.set(phone, fresh)
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────

  /**
   * Issue an OTP for the given invite + phone. Enforces:
   *  - per-phone rate-limit (WHATSAPP_OTP_RATE_LIMIT_PER_HOUR=3 /h)
   *  - re-issuance debounce (S3 — within 30s of last pending OTP, return debounced)
   *  - send-failure handling (M4 — flips status='failed_send', logs, allows retry)
   * Rate-limit accounting increments BEFORE the send attempt — failed sends still
   * count, so an attacker can't induce send failures to bypass rate-limit.
   */
  async requestOtp(invite: WhatsappInvite, phoneNumber: string): Promise<RequestOtpResult> {
    // Rate-limit gate (M4 — count BEFORE sending).
    const ts = this.rateLimitMap.get(phoneNumber) ?? []
    const fresh = ts.filter((t) => t > Date.now() - RATE_LIMIT_WINDOW_MS)
    if (fresh.length >= WHATSAPP_OTP_RATE_LIMIT_PER_HOUR) {
      this.logger.warn('whatsapp_otp.rate_limited', {
        inviteId: invite.id,
        organizationId: invite.organizationId,
        phoneNumberMasked: maskPhone(phoneNumber),
        last1hCount: fresh.length,
      })
      return { ok: false, reason: 'rate_limited' }
    }

    // S3 — re-issuance debounce. If a pending OTP was issued within last 30s,
    // do not re-send; user is likely double-tapping.
    const debounceCutoff = new Date(Date.now() - WHATSAPP_OTP_REISSUE_DEBOUNCE_MS)
    const recentPending = await prisma.whatsappOtpAttempt.findFirst({
      where: {
        inviteId: invite.id,
        status: 'pending',
        createdAt: { gte: debounceCutoff },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (recentPending) {
      return { ok: false, reason: 'debounced', attempt: recentPending }
    }

    // S3 — invalidate any older pending attempts for this invite (status='expired_replaced').
    await prisma.whatsappOtpAttempt.updateMany({
      where: { inviteId: invite.id, status: 'pending' },
      data: { status: 'expired_replaced' },
    })

    // Generate OTP. CSPRNG randomInt is rejection-sampling, uniform.
    const plaintext = generateOtp()
    const hashedOtp = sha256Hex(plaintext)
    const expiresAt = new Date(Date.now() + WHATSAPP_OTP_TTL_MS)

    const attempt = await prisma.whatsappOtpAttempt.create({
      data: {
        inviteId: invite.id,
        hashedOtp,
        attemptsRemaining: WHATSAPP_OTP_MAX_ATTEMPTS,
        status: 'pending',
        expiresAt,
      },
    })

    // Rate-limit accounting — increment BEFORE the send attempt.
    fresh.push(Date.now())
    this.rateLimitMap.set(phoneNumber, fresh)

    // Send via adapter. Infobip wants bare digits (no +).
    const to = phoneNumber.replace(/^\+/, '')
    const body = `Your verification code is ${plaintext}. It expires in 10 minutes.`

    const startedAt = Date.now()
    let sendResult:
      | Awaited<ReturnType<typeof this.adapter.sendText>>
      | {
          ok: false
          reason: 'whatsapp-service-unavailable'
          thrown: string
        }
    try {
      sendResult = await this.adapter.sendText(to, body)
    } catch (err) {
      sendResult = {
        ok: false as const,
        reason: 'whatsapp-service-unavailable' as const,
        thrown: err instanceof Error ? err.message : String(err),
      }
    }

    if (!sendResult.ok) {
      // M4 — flip status='failed_send', log, return failed_send.
      await prisma.whatsappOtpAttempt.update({
        where: { id: attempt.id },
        data: { status: 'failed_send' },
      })
      this.logger.warn('whatsapp_otp.send_failed', {
        inviteId: invite.id,
        organizationId: invite.organizationId,
        otpAttemptId: attempt.id,
        reason: sendResult.reason,
        latencyMs: Date.now() - startedAt,
      })
      return { ok: false, reason: 'send_failed', attempt }
    }

    this.logger.log('whatsapp_otp.sent', {
      inviteId: invite.id,
      organizationId: invite.organizationId,
      otpAttemptId: attempt.id,
      attemptsRemaining: attempt.attemptsRemaining,
      latencyMs: Date.now() - startedAt,
      mode: sendResult.mode,
    })

    return { ok: true, attempt }
  }

  /**
   * Verify a submitted OTP. Timing-safe sha256 compare (M1). Decrements
   * attemptsRemaining on miss; flips status='verified' on success or 'exhausted'
   * after WHATSAPP_OTP_MAX_ATTEMPTS misses.
   */
  async verifyOtp(invite: WhatsappInvite, submitted: string): Promise<VerifyOtpResult> {
    // S1 — normalize OTP submission (digits-only). Tolerates "123 456" / "123-456".
    const normalized = submitted.replace(/\D/g, '')
    if (normalized.length !== WHATSAPP_OTP_LENGTH) {
      return { ok: false, reason: 'wrong' }
    }

    const attempt = await prisma.whatsappOtpAttempt.findFirst({
      where: {
        inviteId: invite.id,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!attempt) {
      return { ok: false, reason: 'no_active_attempt' }
    }

    if (attempt.expiresAt.getTime() < Date.now()) {
      await prisma.whatsappOtpAttempt.update({
        where: { id: attempt.id },
        data: { status: 'expired' },
      })
      return { ok: false, reason: 'expired' }
    }

    // M1 — timing-safe hash compare.
    const submittedHash = sha256Hex(normalized)
    const matches = safeBufferEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(attempt.hashedOtp, 'hex'),
    )

    if (matches) {
      const verified = await prisma.whatsappOtpAttempt.update({
        where: { id: attempt.id },
        data: { status: 'verified', verifiedAt: new Date() },
      })
      return { ok: true, attempt: verified }
    }

    // Wrong code — decrement attempts; flip exhausted if zero.
    const newRemaining = attempt.attemptsRemaining - 1
    if (newRemaining <= 0) {
      await prisma.whatsappOtpAttempt.update({
        where: { id: attempt.id },
        data: { attemptsRemaining: 0, status: 'exhausted' },
      })
      this.logger.warn('whatsapp_otp.exhausted', {
        inviteId: invite.id,
        organizationId: invite.organizationId,
        otpAttemptId: attempt.id,
      })
      return { ok: false, reason: 'exhausted' }
    }
    await prisma.whatsappOtpAttempt.update({
      where: { id: attempt.id },
      data: { attemptsRemaining: newRemaining },
    })
    return { ok: false, reason: 'wrong' }
  }
}

// ─── Pure helpers ────────────────────────────────────────────────────

export function generateOtp(): string {
  // 6-digit OTP; preserve leading zeros via string padding.
  const max = 10 ** WHATSAPP_OTP_LENGTH
  return String(randomInt(0, max)).padStart(WHATSAPP_OTP_LENGTH, '0')
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}
