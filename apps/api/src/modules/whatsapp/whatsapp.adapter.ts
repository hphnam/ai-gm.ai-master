import { createHash } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import type { WhatsAppOutboundResult } from '../../types'
import { assertAuthEnv } from '../auth/assert-auth-env'

// 03-04 Infobip WhatsApp adapter (replaces Twilio WhatsApp adapter from 03-01).
// Source: Infobip WhatsApp API community patterns · UAT-VERIFY: outbound response shape
// + error status codes confirmed on first live Portal send.
type DriverMode = 'live' | 'console' | 'disabled'

const INFOBIP_API_TIMEOUT_MS = 10_000
// Bare E.164 — Infobip delivers + expects digits only (no `whatsapp:` or `+` prefix).
const TO_RE = /^[0-9]{6,20}$/

function sha256Prefix(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16)
}

@Injectable()
export class WhatsAppAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name)
  // baseMode captured at boot; 'disabled' is read per-call from env so the kill-switch
  // takes effect without redeploy (mirrors the Phase 1 phone-verify pattern).
  private readonly baseMode: 'live' | 'console'
  private readonly liveCreds?: {
    baseUrl: string
    apiKey: string
    sender: string
  }

  constructor() {
    const env = assertAuthEnv()
    const override = env.infobip?.driverOverride
    // Console override OR missing infobip block → console mode.
    if (override === 'console' || !env.infobip) {
      this.baseMode = 'console'
      return
    }
    // Live mode fail-fast: any missing cred is a boot error.
    const baseUrl = env.infobip.baseUrl
    const apiKey = env.infobip.apiKey
    const sender = env.infobip.sender
    if (!baseUrl || !apiKey || !sender) {
      throw new Error(
        'WhatsAppAdapter: live mode requires INFOBIP_BASE_URL + INFOBIP_API_KEY + INFOBIP_WHATSAPP_SENDER',
      )
    }
    this.baseMode = 'live'
    this.liveCreds = { baseUrl, apiKey, sender }

    // D-03-04-F: Infobip WhatsApp has no public typing-indicator endpoint.
    // One-time boot WARN when live is configured so ops know typing is console-only.
    this.logger.warn(
      '[whatsapp] Infobip WhatsApp has no typing-indicator endpoint; console-mode-only (D-03-04-F)',
    )
  }

  private resolveMode(): DriverMode {
    if (process.env.INFOBIP_DRIVER_OVERRIDE === 'disabled') return 'disabled'
    if (process.env.INFOBIP_DRIVER_OVERRIDE === 'console') return 'console'
    return this.baseMode
  }

  // 03-03 Task 1: typing indicator — console-mode only under Infobip (D-03-04-F).
  // Signature preserved (takes inbound messageId) so typing-indicator-timers module is untouched.
  async sendTypingIndicator(inboundMessageId: string): Promise<WhatsAppOutboundResult> {
    if (!inboundMessageId || !/^[A-Za-z0-9_-]{1,128}$/.test(inboundMessageId)) {
      return { ok: false, reason: 'whatsapp-invalid-to' }
    }
    const mode = this.resolveMode()
    if (mode === 'disabled') {
      return { ok: false, reason: 'whatsapp-driver-disabled' }
    }
    // Both 'live' and 'console' log the event and return — Infobip has no live endpoint.
    this.logger.log('whatsapp.console_typing_indicator', { messageId: inboundMessageId })
    return { ok: true, mode: 'console' }
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
    const url = `${this.liveCreds.baseUrl}/whatsapp/1/message/text`
    const requestBody = {
      from: this.liveCreds.sender,
      to,
      content: { text: body },
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `App ${this.liveCreds.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(INFOBIP_API_TIMEOUT_MS),
      })
      const rawBody = await res.text()
      // TEMP DEBUG — full Infobip response body so we can see why messages
      // don't arrive despite 2xx. Remove once shape is locked.
      this.logger.log('whatsapp.infobip_raw_response', {
        to: sha256Prefix(to),
        status: res.status,
        contentType: res.headers.get('content-type'),
        body: rawBody.slice(0, 2000),
        latencyMs: Date.now() - startedAt,
      })

      if (!res.ok) {
        this.logger.warn('whatsapp.infobip_error', {
          to: sha256Prefix(to),
          status: res.status,
          latencyMs: Date.now() - startedAt,
        })
        return { ok: false, reason: 'whatsapp-service-unavailable' }
      }

      // Infobip success response shape: { messages: [{ messageId, status: {...} }] }.
      let json: { messages?: Array<{ messageId?: string; status?: unknown }>; messageId?: string } = {}
      try {
        json = JSON.parse(rawBody)
      } catch {
        /* leave json empty — log already captured raw body */
      }
      const messageId = json.messages?.[0]?.messageId ?? json.messageId
      const messageStatus = json.messages?.[0]?.status
      this.logger.log('whatsapp.outbound', {
        to: sha256Prefix(to),
        mode: 'live',
        messageId,
        messageStatus,
        latencyMs: Date.now() - startedAt,
      })
      return { ok: true, mode: 'live', messageId }
    } catch (err) {
      this.logger.warn('whatsapp.infobip_error', {
        to: sha256Prefix(to),
        errorKind: (err as Error)?.constructor?.name ?? 'unknown',
        latencyMs: Date.now() - startedAt,
      })
      return { ok: false, reason: 'whatsapp-service-unavailable' }
    }
  }
}

export { sha256Prefix }
