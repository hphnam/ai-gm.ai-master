import { createHash } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import type { WhatsAppOutboundResult } from '@gm-ai/types'
import { assertAuthEnv } from '../auth/assert-auth-env'

type DriverMode = 'live' | 'console' | 'disabled'

const TWILIO_API_TIMEOUT_MS = 10_000
const TO_RE = /^whatsapp:\+[0-9]{6,20}$/

function sha256Prefix(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16)
}

@Injectable()
export class WhatsAppAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name)
  // baseMode captured at boot; 'disabled' is read per-call from env so the
  // kill-switch takes effect without redeploy (mirrors 01-03 TwilioVerifyService).
  private readonly baseMode: 'live' | 'console'
  private readonly liveCreds?: {
    accountSid: string
    authToken: string
    fromNumber: string
  }

  constructor() {
    const env = assertAuthEnv()
    const override = env.whatsapp?.driverOverride
    // Console override OR missing whatsapp/twilio block → console mode.
    if (override === 'console' || !env.whatsapp || !env.twilio) {
      this.baseMode = 'console'
      return
    }
    // Live mode fail-fast: any missing cred is a boot error (audit-added M6).
    const accountSid = env.twilio.accountSid
    const authToken = env.twilio.authToken
    const fromNumber = env.whatsapp.fromNumber
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        'WhatsAppAdapter: live mode requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM',
      )
    }
    this.baseMode = 'live'
    this.liveCreds = { accountSid, authToken, fromNumber }
  }

  private resolveMode(): DriverMode {
    if (process.env.TWILIO_WHATSAPP_DRIVER_OVERRIDE === 'disabled') return 'disabled'
    if (process.env.TWILIO_WHATSAPP_DRIVER_OVERRIDE === 'console') return 'console'
    return this.baseMode
  }

  async sendText(to: string, body: string): Promise<WhatsAppOutboundResult> {
    if (!TO_RE.test(to)) {
      return { ok: false, reason: 'whatsapp-invalid-to' }
    }
    const mode = this.resolveMode()
    if (mode === 'disabled') {
      this.logger.warn('whatsapp.outbound_skipped_killswitch', {
        to: sha256Prefix(to),
        bodyLength: body.length,
      })
      return { ok: false, reason: 'whatsapp-driver-disabled' }
    }
    if (mode === 'console' || !this.liveCreds) {
      this.logger.log('whatsapp.console_outbound', {
        to: sha256Prefix(to),
        bodyLength: body.length,
      })
      return { ok: true, mode: 'console' }
    }

    const startedAt = Date.now()
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.liveCreds.accountSid}/Messages.json`
    const basic = Buffer.from(
      `${this.liveCreds.accountSid}:${this.liveCreds.authToken}`,
    ).toString('base64')
    const form = new URLSearchParams({
      From: this.liveCreds.fromNumber,
      To: to,
      Body: body,
    })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        signal: AbortSignal.timeout(TWILIO_API_TIMEOUT_MS),
      })
      if (!res.ok) {
        this.logger.warn('whatsapp.twilio_error', {
          to: sha256Prefix(to),
          status: res.status,
          latencyMs: Date.now() - startedAt,
        })
        return { ok: false, reason: 'whatsapp-service-unavailable' }
      }
      const json = (await res.json()) as { sid?: string }
      this.logger.log('whatsapp.outbound', {
        to: sha256Prefix(to),
        mode: 'live',
        sid: json.sid,
        latencyMs: Date.now() - startedAt,
      })
      return { ok: true, mode: 'live', sid: json.sid }
    } catch (err) {
      this.logger.warn('whatsapp.twilio_error', {
        to: sha256Prefix(to),
        errorKind: (err as Error)?.constructor?.name ?? 'unknown',
        latencyMs: Date.now() - startedAt,
      })
      return { ok: false, reason: 'whatsapp-service-unavailable' }
    }
  }
}

export { sha256Prefix }
