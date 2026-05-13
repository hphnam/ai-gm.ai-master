// Phone verification service.
//
// Sends a 6-digit OTP via WhatsApp using the existing Infobip WhatsApp adapter
// (the same one Plan 03-01 uses for staff invites). OTP generated CSPRNG-side,
// hashed with sha256, stored in-process with TTL + attempts, verified timing-safe.
//
// History: this used to send via Infobip's 2FA SMS API (own Application+Message
// credentials, separate product). We replaced that with WhatsApp delivery so
// the platform has one channel for verification + chat + invites — no separate
// Portal setup required.

import { createHash, randomInt } from 'node:crypto'
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { safeBufferEqual } from '../whatsapp/safe-equal'
import { WhatsAppAdapter } from '../whatsapp/whatsapp.adapter'

type DriverMode = 'console' | 'live' | 'disabled'

type StartResult =
  | { ok: true; mode: DriverMode }
  | {
      ok: false
      reason: 'phone-service-unavailable' | 'phone-invalid-format'
      details?: { reason?: string; infobipCode?: string | null; infobipStatus?: number | null }
    }

type CheckResult =
  | {
      ok: true
      approved: boolean
      mode: DriverMode
      details?: { reason?: string }
    }
  | {
      ok: false
      reason: 'phone-service-unavailable'
      details?: { reason?: string; infobipCode?: string | null; infobipStatus?: number | null }
    }

const PIN_LENGTH = 6
const PIN_TTL_MS = 10 * 60 * 1000
const PIN_MAX_ATTEMPTS = 3
const MAX_PIN_CACHE_ENTRIES = 1024
const SWEEP_INTERVAL_MS = 60 * 1000

type PinEntry = {
  hashedCode: string
  expiresAt: number
  attemptsRemaining: number
}

type LogOpts = { requestId?: string }

function hashPhone(phoneNumber: string): string {
  return createHash('sha256').update(phoneNumber).digest('hex').slice(0, 16)
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function generatePin(): string {
  return String(randomInt(0, 10 ** PIN_LENGTH)).padStart(PIN_LENGTH, '0')
}

@Injectable()
export class WhatsappVerifyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappVerifyService.name)
  private readonly baseMode: 'console' | 'live'
  private readonly pinCache = new Map<string /* phoneHash */, PinEntry>()
  private sweepHandle?: NodeJS.Timeout

  constructor(private readonly adapter: WhatsAppAdapter) {
    const override = process.env.PHONE_VERIFY_DRIVER_OVERRIDE
    this.baseMode = override === 'console' ? 'console' : 'live'
  }

  onModuleInit(): void {
    this.sweepHandle = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS)
    if (this.sweepHandle.unref) this.sweepHandle.unref()
  }

  onModuleDestroy(): void {
    if (this.sweepHandle) clearInterval(this.sweepHandle)
  }

  // 'disabled' wins at call-time so the kill-switch takes effect without restart.
  get mode(): DriverMode {
    if (process.env.PHONE_VERIFY_DRIVER_OVERRIDE === 'disabled') return 'disabled'
    return this.baseMode
  }

  async startVerification(phoneNumber: string, opts?: LogOpts): Promise<StartResult> {
    const phoneHash = hashPhone(phoneNumber)
    const requestId = opts?.requestId ?? null

    if (this.mode === 'disabled') {
      this.logger.warn(
        JSON.stringify({ event: 'phone.driver_disabled', phoneHash, path: 'send', requestId }),
      )
      return { ok: false, reason: 'phone-service-unavailable', details: { reason: 'disabled' } }
    }

    const code = generatePin()
    this.cachePin(phoneHash, sha256Hex(code))

    if (this.mode === 'console') {
      this.logger.log(
        JSON.stringify({ event: 'phone.console_fallback', phoneHash, code, requestId }),
      )
      return { ok: true, mode: 'console' }
    }

    // Live — send via WhatsApp adapter. Infobip wants bare digits (no `+`).
    this.logger.log(JSON.stringify({ event: 'phone.send_attempted', phoneHash, requestId }))
    const to = phoneNumber.replace(/^\+/, '')
    const body = `Your GM AI verification code is ${code}. It expires in 10 minutes.`

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
      this.pinCache.delete(phoneHash)
      this.logger.error(
        JSON.stringify({
          event: 'phone.send_failed',
          phoneHash,
          reason: sendResult.reason,
          requestId,
        }),
      )
      return {
        ok: false,
        reason: 'phone-service-unavailable',
        details: { reason: sendResult.reason },
      }
    }

    this.logger.log(
      JSON.stringify({
        event: 'phone.send_succeeded',
        phoneHash,
        mode: sendResult.mode,
        requestId,
      }),
    )
    return { ok: true, mode: 'live' }
  }

  async checkVerification(phoneNumber: string, code: string, opts?: LogOpts): Promise<CheckResult> {
    const phoneHash = hashPhone(phoneNumber)
    const requestId = opts?.requestId ?? null

    if (this.mode === 'disabled') {
      this.logger.warn(
        JSON.stringify({ event: 'phone.driver_disabled', phoneHash, path: 'verify', requestId }),
      )
      return { ok: false, reason: 'phone-service-unavailable', details: { reason: 'disabled' } }
    }

    const entry = this.pinCache.get(phoneHash)
    if (!entry) {
      this.logger.log(
        JSON.stringify({
          event: 'phone.pin_cache_miss',
          phoneHash,
          reason: 'absent',
          requestId,
        }),
      )
      return { ok: true, approved: false, mode: this.mode, details: { reason: 'pin-not-found' } }
    }

    if (entry.expiresAt < Date.now()) {
      this.pinCache.delete(phoneHash)
      this.logger.log(
        JSON.stringify({
          event: 'phone.pin_cache_miss',
          phoneHash,
          reason: 'ttl-expired',
          requestId,
        }),
      )
      return { ok: true, approved: false, mode: this.mode, details: { reason: 'pin-expired' } }
    }

    // Normalise submitted digits — tolerate "123 456" / "123-456" copy-paste.
    const normalised = code.replace(/\D/g, '')
    if (normalised.length !== PIN_LENGTH) {
      const newRemaining = entry.attemptsRemaining - 1
      if (newRemaining <= 0) {
        this.pinCache.delete(phoneHash)
        return { ok: true, approved: false, mode: this.mode, details: { reason: 'pin-blocked' } }
      }
      this.pinCache.set(phoneHash, { ...entry, attemptsRemaining: newRemaining })
      return {
        ok: true,
        approved: false,
        mode: this.mode,
        details: { reason: 'pin-verification-failed' },
      }
    }

    const submittedHash = sha256Hex(normalised)
    const matches = safeBufferEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(entry.hashedCode, 'hex'),
    )

    if (matches) {
      this.pinCache.delete(phoneHash)
      this.logger.log(
        JSON.stringify({
          event: 'phone.check_result',
          phoneHash,
          verified: true,
          mode: this.mode,
          requestId,
        }),
      )
      return { ok: true, approved: true, mode: this.mode }
    }

    const newRemaining = entry.attemptsRemaining - 1
    if (newRemaining <= 0) {
      this.pinCache.delete(phoneHash)
      this.logger.log(
        JSON.stringify({
          event: 'phone.check_result',
          phoneHash,
          verified: false,
          attemptsRemaining: 0,
          mode: this.mode,
          requestId,
        }),
      )
      return { ok: true, approved: false, mode: this.mode, details: { reason: 'pin-blocked' } }
    }

    this.pinCache.set(phoneHash, { ...entry, attemptsRemaining: newRemaining })
    this.logger.log(
      JSON.stringify({
        event: 'phone.check_result',
        phoneHash,
        verified: false,
        attemptsRemaining: newRemaining,
        mode: this.mode,
        requestId,
      }),
    )
    return {
      ok: true,
      approved: false,
      mode: this.mode,
      details: { reason: 'pin-verification-failed' },
    }
  }

  // ─── Internals ──────────────────────────────────────────────────────

  private cachePin(phoneHash: string, hashedCode: string): void {
    // FIFO eviction at cap boundary.
    if (this.pinCache.size >= MAX_PIN_CACHE_ENTRIES) {
      const oldest = this.pinCache.keys().next().value
      if (oldest !== undefined) this.pinCache.delete(oldest)
    }
    this.pinCache.set(phoneHash, {
      hashedCode,
      expiresAt: Date.now() + PIN_TTL_MS,
      attemptsRemaining: PIN_MAX_ATTEMPTS,
    })
  }

  private sweep(): void {
    const now = Date.now()
    for (const [k, v] of this.pinCache.entries()) {
      if (v.expiresAt <= now) this.pinCache.delete(k)
    }
  }
}
