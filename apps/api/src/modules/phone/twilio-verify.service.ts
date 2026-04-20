import { createHash } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { assertAuthEnv } from '../auth/assert-auth-env'

type DriverMode = 'console' | 'live' | 'disabled'

type StartResult =
  | { ok: true; mode: DriverMode; sid?: string }
  | {
      ok: false
      reason: 'phone-service-unavailable' | 'phone-invalid-format'
      details?: { reason?: string; twilioCode?: number; twilioStatus?: number }
    }

type CheckResult =
  | { ok: true; approved: boolean; mode: DriverMode }
  | {
      ok: false
      reason: 'phone-service-unavailable'
      details?: { reason?: string }
    }

const TWILIO_TIMEOUT_MS = 10_000

function hashPhone(phoneNumber: string): string {
  return createHash('sha256').update(phoneNumber).digest('hex').slice(0, 16)
}

function consoleCodeFor(phoneNumber: string): string {
  // Deterministic for probe runs — last 6 digits of the phone number.
  const digits = phoneNumber.replace(/\D/g, '')
  return `PROBE-${digits.slice(-6)}`
}

@Injectable()
export class TwilioVerifyService {
  private readonly logger = new Logger(TwilioVerifyService.name)
  // baseMode captures console-vs-live decision at boot; 'disabled' is read per-call
  // from TWILIO_DRIVER_OVERRIDE so the ops kill-switch takes effect without a redeploy.
  private readonly baseMode: 'console' | 'live'

  private readonly accountSid?: string
  private readonly authToken?: string
  private readonly verifyServiceSid?: string

  constructor() {
    const env = assertAuthEnv()
    const override = process.env.TWILIO_DRIVER_OVERRIDE
    if (override === 'console' || !env.twilio) {
      this.baseMode = 'console'
      return
    }
    this.baseMode = 'live'
    this.accountSid = env.twilio.accountSid
    this.authToken = env.twilio.authToken
    this.verifyServiceSid = env.twilio.verifyServiceSid
  }

  // audit-added M3: 'disabled' wins over everything else and is read at call time
  // so the kill-switch takes effect without restarting the process.
  get mode(): DriverMode {
    if (process.env.TWILIO_DRIVER_OVERRIDE === 'disabled') return 'disabled'
    return this.baseMode
  }

  async startVerification(phoneNumber: string): Promise<StartResult> {
    const phoneHash = hashPhone(phoneNumber)

    if (this.mode === 'disabled') {
      this.logger.warn(
        JSON.stringify({
          event: 'phone.driver_disabled',
          phoneHash,
          path: 'send',
        }),
      )
      return {
        ok: false,
        reason: 'phone-service-unavailable',
        details: { reason: 'disabled' },
      }
    }

    if (this.mode === 'console') {
      this.logger.log(
        JSON.stringify({
          event: 'phone.console_fallback',
          phoneHash,
          code: consoleCodeFor(phoneNumber),
        }),
      )
      return { ok: true, mode: 'console' }
    }

    // audit-added S2: send-attempted log BEFORE the fetch so "Twilio never responded at all" is still observable
    this.logger.log(
      JSON.stringify({ event: 'phone.send_attempted', phoneHash }),
    )

    // audit-added M4: Twilio Verify REST is form-encoded, never JSON
    const body = new URLSearchParams({
      To: phoneNumber,
      Channel: 'sms',
    }).toString()
    const authHeader =
      'Basic ' +
      Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')

    try {
      const res = await fetch(
        `https://verify.twilio.com/v2/Services/${this.verifyServiceSid}/Verifications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: authHeader,
          },
          body,
          signal: AbortSignal.timeout(TWILIO_TIMEOUT_MS),
        },
      )
      if (res.status >= 200 && res.status < 300) {
        const json = (await res.json().catch(() => ({}))) as { sid?: string }
        this.logger.log(
          JSON.stringify({ event: 'phone.send_succeeded', phoneHash }),
        )
        return { ok: true, mode: 'live', sid: json.sid }
      }
      const json = (await res.json().catch(() => ({}))) as {
        code?: number
        message?: string
      }
      this.logger.error(
        JSON.stringify({
          event: 'phone.service_unavailable',
          phoneHash,
          twilioStatus: res.status,
          twilioCode: json.code ?? null,
          twilioMessage: (json.message ?? '').slice(0, 200),
          timedOut: false,
        }),
      )
      if (res.status === 400 && json.code === 60200) {
        return { ok: false, reason: 'phone-invalid-format' }
      }
      return {
        ok: false,
        reason: 'phone-service-unavailable',
        details: { twilioCode: json.code, twilioStatus: res.status },
      }
    } catch (err) {
      const name = (err as { name?: string } | null)?.name
      const timedOut = name === 'AbortError' || name === 'TimeoutError'
      this.logger.error(
        JSON.stringify({
          event: 'phone.service_unavailable',
          phoneHash,
          twilioStatus: null,
          twilioCode: null,
          twilioMessage: String(err).slice(0, 200),
          timedOut,
        }),
      )
      return { ok: false, reason: 'phone-service-unavailable' }
    }
  }

  async checkVerification(
    phoneNumber: string,
    code: string,
  ): Promise<CheckResult> {
    const phoneHash = hashPhone(phoneNumber)

    if (this.mode === 'disabled') {
      this.logger.warn(
        JSON.stringify({
          event: 'phone.driver_disabled',
          phoneHash,
          path: 'verify',
        }),
      )
      return {
        ok: false,
        reason: 'phone-service-unavailable',
        details: { reason: 'disabled' },
      }
    }

    if (this.mode === 'console') {
      return {
        ok: true,
        approved: code === consoleCodeFor(phoneNumber),
        mode: 'console',
      }
    }

    const body = new URLSearchParams({
      To: phoneNumber,
      Code: code,
    }).toString()
    const authHeader =
      'Basic ' +
      Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')

    try {
      const res = await fetch(
        `https://verify.twilio.com/v2/Services/${this.verifyServiceSid}/VerificationCheck`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: authHeader,
          },
          body,
          signal: AbortSignal.timeout(TWILIO_TIMEOUT_MS),
        },
      )
      if (res.status === 404) return { ok: true, approved: false, mode: 'live' }
      if (res.status >= 200 && res.status < 300) {
        const json = (await res.json().catch(() => ({}))) as { status?: string }
        return {
          ok: true,
          approved: json.status === 'approved',
          mode: 'live',
        }
      }
      const json = (await res.json().catch(() => ({}))) as {
        code?: number
        message?: string
      }
      this.logger.error(
        JSON.stringify({
          event: 'phone.service_unavailable',
          phoneHash,
          twilioStatus: res.status,
          twilioCode: json.code ?? null,
          twilioMessage: (json.message ?? '').slice(0, 200),
          timedOut: false,
        }),
      )
      return { ok: false, reason: 'phone-service-unavailable' }
    } catch (err) {
      const name = (err as { name?: string } | null)?.name
      const timedOut = name === 'AbortError' || name === 'TimeoutError'
      this.logger.error(
        JSON.stringify({
          event: 'phone.service_unavailable',
          phoneHash,
          twilioStatus: null,
          twilioCode: null,
          twilioMessage: String(err).slice(0, 200),
          timedOut,
        }),
      )
      return { ok: false, reason: 'phone-service-unavailable' }
    }
  }
}
