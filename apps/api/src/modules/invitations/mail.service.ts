import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { MAIL_SEND_TIMEOUT_MS } from '../../types'
import { assertAuthEnv } from '../auth/assert-auth-env'
import { renderInvitationEmail } from './invitation-email'

type MailMode = 'console' | 'resend'

type SendResult =
  | { ok: true; mode: MailMode; messageId?: string }
  | { ok: false; reason: 'mail-send-failed' }

// 01-02 audit-added M3: strip CR/LF from subject to prevent email-header injection
// via malicious organization names (e.g. "Evil Corp\r\nBcc: attacker@example.com")
function buildSubject(organizationName: string): string {
  const clean = organizationName.replace(/[\r\n]/g, '')
  return `You've been invited to ${clean} on GM AI`
}

function hashEmail(email: string): string {
  // sha256-prefix-16 — stronger than v0.1's prefix-8 for audit forensics (S7)
  return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16)
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  readonly mode: MailMode

  private readonly resendKey?: string
  private readonly mailFrom?: string

  constructor() {
    const env = assertAuthEnv()
    // 01-02 audit-added M10: MAIL_DRIVER_OVERRIDE forces console mode for probe runs
    // even if operator has RESEND_API_KEY in .env
    const override = process.env.MAIL_DRIVER_OVERRIDE
    if (override === 'console' || !env.resend) {
      this.mode = 'console'
      return
    }
    this.mode = 'resend'
    this.resendKey = env.resend.apiKey
    this.mailFrom = env.resend.mailFrom
  }

  async sendInvitationEmail(input: {
    to: string
    inviteUrl: string
    organizationName: string
    inviterName: string | null
    expiresAt: Date
  }): Promise<SendResult> {
    const subject = buildSubject(input.organizationName)

    if (this.mode === 'console') {
      this.logger.log(
        JSON.stringify({
          event: 'mail.console_fallback',
          to: input.to,
          inviteUrl: input.inviteUrl,
          organizationName: input.organizationName,
          inviterName: input.inviterName,
          expiresAt: input.expiresAt.toISOString(),
        }),
      )
      return { ok: true, mode: 'console' }
    }

    const { html, text } = renderInvitationEmail(input)
    try {
      // 01-02 audit-added M1: AbortSignal.timeout prevents indefinite hang on Resend downtime
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.mailFrom,
          to: [input.to],
          subject,
          html,
          text,
        }),
        signal: AbortSignal.timeout(MAIL_SEND_TIMEOUT_MS),
      })
      if (res.status >= 200 && res.status < 300) {
        const body = (await res.json().catch(() => ({}))) as { id?: string }
        return { ok: true, mode: 'resend', messageId: body.id }
      }
      const errText = await res.text().catch(() => '')
      this.logger.error(
        JSON.stringify({
          event: 'mail.send_failed',
          to: hashEmail(input.to),
          status: res.status,
          error: errText.slice(0, 200),
          timedOut: false,
        }),
      )
      return { ok: false, reason: 'mail-send-failed' }
    } catch (err) {
      const name = (err as { name?: string } | null)?.name
      this.logger.error(
        JSON.stringify({
          event: 'mail.send_failed',
          to: hashEmail(input.to),
          error: String(err).slice(0, 200),
          timedOut: name === 'AbortError' || name === 'TimeoutError',
        }),
      )
      return { ok: false, reason: 'mail-send-failed' }
    }
  }
}
