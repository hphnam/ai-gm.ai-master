import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import type { WhatsAppOutboundResult } from '../../types'
import { assertAuthEnv } from '../auth/assert-auth-env'

// 03-06 Twilio Conversations API adapter (replaces 03-04 Infobip adapter).
// Public surface (sendText / sendTypingIndicator → WhatsAppOutboundResult) is
// preserved so callers don't move. Internals:
//   - resolveConversationForPhone(phone) → ConversationSid
//       Lookup WhatsappConversation by phone, create-if-missing via
//       POST /v1/Services/{ServiceSid}/Conversations then add the phone as a
//       Participant. Persist the mapping.
//   - sendText posts to /v1/Conversations/{Sid}/Messages.
//   - sendTypingIndicator posts to /v1/Services/{Sid}/Conversations/{Sid}/Typing.
//
// Auth: Basic base64(accountSid:authToken). Timeouts: 10s per call.
// Phone format: callers pass either "+E164" or bare digits; we normalize.

const TWILIO_API_TIMEOUT_MS = 10_000
const CONVERSATIONS_BASE = 'https://conversations.twilio.com/v1'
const E164_DIGITS_RE = /^[0-9]{6,20}$/
type DriverMode = 'live' | 'console' | 'disabled'

function sha256Prefix(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16)
}

function normalizeToE164Plus(to: string): string | null {
  // Accept "+E164", "E164" bare digits, or "whatsapp:+E164".
  if (to.startsWith('whatsapp:+')) {
    const rest = to.slice('whatsapp:+'.length)
    return E164_DIGITS_RE.test(rest) ? `+${rest}` : null
  }
  if (to.startsWith('+')) {
    return E164_DIGITS_RE.test(to.slice(1)) ? to : null
  }
  return E164_DIGITS_RE.test(to) ? `+${to}` : null
}

@Injectable()
export class WhatsAppAdapter {
  private readonly logger = new Logger(WhatsAppAdapter.name)
  private readonly baseMode: 'live' | 'console'
  private readonly liveCreds?: {
    accountSid: string
    authToken: string
    serviceSid: string
    sender: string // whatsapp:+E164
    basicAuth: string
  }

  constructor() {
    const env = assertAuthEnv()
    const override = env.twilio?.driverOverride
    if (override === 'console' || !env.twilio || !env.twilio.sender) {
      this.baseMode = 'console'
      return
    }
    const { accountSid, authToken, conversationsServiceSid, sender } = env.twilio
    if (!accountSid || !authToken || !conversationsServiceSid || !sender) {
      throw new Error(
        'WhatsAppAdapter: live mode requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_CONVERSATIONS_SERVICE_SID + TWILIO_WHATSAPP_SENDER',
      )
    }
    this.baseMode = 'live'
    this.liveCreds = {
      accountSid,
      authToken,
      serviceSid: conversationsServiceSid,
      sender,
      basicAuth: Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
    }
  }

  private resolveMode(): DriverMode {
    if (process.env.TWILIO_DRIVER_OVERRIDE === 'disabled') return 'disabled'
    if (process.env.TWILIO_DRIVER_OVERRIDE === 'console') return 'console'
    return this.baseMode
  }

  async sendTypingIndicator(conversationSid: string): Promise<WhatsAppOutboundResult> {
    if (!conversationSid || !/^CH[0-9a-fA-F]{32}$/.test(conversationSid)) {
      return { ok: false, reason: 'whatsapp-invalid-to' }
    }
    const mode = this.resolveMode()
    if (mode === 'disabled') {
      return { ok: false, reason: 'whatsapp-driver-disabled' }
    }
    if (mode === 'console' || !this.liveCreds) {
      this.logger.log('whatsapp.console_typing_indicator', { conversationSid })
      return { ok: true, mode: 'console' }
    }

    const url = `${CONVERSATIONS_BASE}/Services/${this.liveCreds.serviceSid}/Conversations/${conversationSid}/Typing`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.liveCreds.basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(TWILIO_API_TIMEOUT_MS),
      })
      if (!res.ok) {
        return { ok: false, reason: 'whatsapp-service-unavailable' }
      }
      return { ok: true, mode: 'live' }
    } catch {
      return { ok: false, reason: 'whatsapp-service-unavailable' }
    }
  }

  async sendText(to: string, body: string): Promise<WhatsAppOutboundResult> {
    const phone = normalizeToE164Plus(to)
    if (!phone) {
      return { ok: false, reason: 'whatsapp-invalid-to' }
    }
    const mode = this.resolveMode()
    if (mode === 'disabled') {
      this.logger.warn('whatsapp.outbound_skipped_killswitch', {
        to: sha256Prefix(phone),
        bodyLength: body.length,
      })
      return { ok: false, reason: 'whatsapp-driver-disabled' }
    }
    if (mode === 'console' || !this.liveCreds) {
      this.logger.log('whatsapp.console_outbound', {
        to: sha256Prefix(phone),
        bodyLength: body.length,
      })
      return { ok: true, mode: 'console' }
    }

    const startedAt = Date.now()
    let conversationSid: string
    try {
      conversationSid = await this.resolveConversationForPhone(phone)
    } catch (err) {
      this.logger.warn('whatsapp.conversation_resolve_failed', {
        to: sha256Prefix(phone),
        errorKind: (err as Error)?.constructor?.name ?? 'unknown',
      })
      return { ok: false, reason: 'whatsapp-service-unavailable' }
    }

    const url = `${CONVERSATIONS_BASE}/Conversations/${conversationSid}/Messages`
    const form = new URLSearchParams({
      Author: 'system',
      Body: body,
    })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.liveCreds.basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: form.toString(),
        signal: AbortSignal.timeout(TWILIO_API_TIMEOUT_MS),
      })
      const rawBody = await res.text()
      if (!res.ok) {
        this.logger.warn('whatsapp.twilio_error', {
          to: sha256Prefix(phone),
          status: res.status,
          body: rawBody.slice(0, 500),
          latencyMs: Date.now() - startedAt,
        })
        return { ok: false, reason: 'whatsapp-service-unavailable' }
      }
      let json: { sid?: string } = {}
      try {
        json = JSON.parse(rawBody)
      } catch {
        /* leave json empty */
      }
      this.logger.log('whatsapp.outbound', {
        to: sha256Prefix(phone),
        mode: 'live',
        messageId: json.sid,
        conversationSid,
        latencyMs: Date.now() - startedAt,
      })
      return { ok: true, mode: 'live', messageId: json.sid }
    } catch (err) {
      this.logger.warn('whatsapp.twilio_error', {
        to: sha256Prefix(phone),
        errorKind: (err as Error)?.constructor?.name ?? 'unknown',
        latencyMs: Date.now() - startedAt,
      })
      return { ok: false, reason: 'whatsapp-service-unavailable' }
    }
  }

  // ─── Conversation find-or-create ────────────────────────────────────

  private async resolveConversationForPhone(phoneE164: string): Promise<string> {
    if (!this.liveCreds) throw new Error('twilio.no_live_creds')

    const existing = await prisma.whatsappConversation.findUnique({
      where: { phoneNumber: phoneE164 },
      select: { conversationSid: true },
    })
    if (existing) return existing.conversationSid

    const conv = await this.createConversation(phoneE164)
    await this.addParticipant(conv, phoneE164)

    try {
      await prisma.whatsappConversation.create({
        data: { phoneNumber: phoneE164, conversationSid: conv },
      })
    } catch (err) {
      // P2002 = a parallel request created the row first. Re-read and use that.
      const code = (err as { code?: string })?.code
      if (code === 'P2002') {
        const row = await prisma.whatsappConversation.findUnique({
          where: { phoneNumber: phoneE164 },
          select: { conversationSid: true },
        })
        if (row) return row.conversationSid
      }
      throw err
    }
    return conv
  }

  private async createConversation(phoneE164: string): Promise<string> {
    if (!this.liveCreds) throw new Error('twilio.no_live_creds')
    const url = `${CONVERSATIONS_BASE}/Services/${this.liveCreds.serviceSid}/Conversations`
    // UniqueName lets us recover gracefully if the DB row is missing but the
    // remote Conversation exists (re-run create returns 409 → we read by name).
    const uniqueName = `wa-${sha256Prefix(phoneE164)}`
    const form = new URLSearchParams({
      UniqueName: uniqueName,
      FriendlyName: `WhatsApp ${phoneE164}`,
    })
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.liveCreds.basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(TWILIO_API_TIMEOUT_MS),
    })
    if (res.status === 409) {
      // UniqueName collision — fetch by name.
      const fetchUrl = `${CONVERSATIONS_BASE}/Services/${this.liveCreds.serviceSid}/Conversations/${uniqueName}`
      const r2 = await fetch(fetchUrl, {
        headers: {
          Authorization: `Basic ${this.liveCreds.basicAuth}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(TWILIO_API_TIMEOUT_MS),
      })
      if (!r2.ok) throw new Error(`twilio.conversation_lookup_failed:${r2.status}`)
      const j = (await r2.json()) as { sid?: string }
      if (!j.sid) throw new Error('twilio.conversation_lookup_no_sid')
      return j.sid
    }
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`twilio.conversation_create_failed:${res.status}:${body.slice(0, 200)}`)
    }
    const j = (await res.json()) as { sid?: string }
    if (!j.sid) throw new Error('twilio.conversation_create_no_sid')
    return j.sid
  }

  private async addParticipant(conversationSid: string, phoneE164: string): Promise<void> {
    if (!this.liveCreds) throw new Error('twilio.no_live_creds')
    const url = `${CONVERSATIONS_BASE}/Services/${this.liveCreds.serviceSid}/Conversations/${conversationSid}/Participants`
    const form = new URLSearchParams({
      'MessagingBinding.Address': `whatsapp:${phoneE164}`,
      'MessagingBinding.ProxyAddress': this.liveCreds.sender,
    })
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.liveCreds.basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(TWILIO_API_TIMEOUT_MS),
    })
    // 03-06 fix 11: 409 can mean either "participant already exists" (which we
    // want to swallow as idempotent retry) or "MessagingBinding.Address already
    // bound to another Conversation" (which we MUST surface — silently swallowing
    // would leave us writing into a conversation Twilio won't deliver from).
    // Twilio's error body distinguishes via code: 50433 = participant exists,
    // 50416 = address-already-bound. Read the body and route.
    if (res.status === 409) {
      const body = await res.text()
      try {
        const parsed = JSON.parse(body) as { code?: number; message?: string }
        if (parsed.code === 50433) return // participant exists — idempotent
        // Any other 409 (typically 50416) — propagate so resolveConversationForPhone fails fast.
        throw new Error(
          `twilio.participant_add_failed:409:${parsed.code ?? 'unknown'}:${parsed.message ?? body.slice(0, 200)}`,
        )
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.startsWith('twilio.')) throw parseErr
        throw new Error(`twilio.participant_add_failed:409:${body.slice(0, 200)}`)
      }
    }
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`twilio.participant_add_failed:${res.status}:${body.slice(0, 200)}`)
    }
  }
}
