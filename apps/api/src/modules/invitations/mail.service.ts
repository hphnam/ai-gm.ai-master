import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { getMailMode, type MailMode, sendMail } from '../email/mailer'
import { renderInvitationEmail } from './invitation-email'

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

  async sendInvitationEmail(input: {
    to: string
    inviteUrl: string
    organizationName: string
    inviterName: string | null
    expiresAt: Date
  }): Promise<SendResult> {
    const subject = buildSubject(input.organizationName)

    if (getMailMode() === 'console') {
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
    const res = await sendMail({ to: input.to, subject, html, text })
    if (res.ok) return { ok: true, mode: 'smtp', messageId: res.messageId }
    this.logger.error(JSON.stringify({ event: 'mail.send_failed', to: hashEmail(input.to) }))
    return { ok: false, reason: 'mail-send-failed' }
  }
}
