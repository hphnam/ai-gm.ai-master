import { createHash } from 'node:crypto'
import { Logger } from '@nestjs/common'
import { getMailMode, sendMail } from './mailer'

const logger = new Logger('AuthEmail')

function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16)
}

function renderPasswordResetEmail(resetUrl: string): { html: string; text: string } {
  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;background:#fff;">
    <h2 style="margin:0 0 16px 0;font-size:20px;">Reset your password</h2>
    <p style="font-size:15px;line-height:1.5;margin:0 0 16px 0;">
      We received a request to reset the password for your GM AI account.
    </p>
    <p style="margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;">Reset password</a>
    </p>
    <p style="font-size:13px;color:#555;line-height:1.5;margin:0 0 8px 0;">Or paste this link in your browser:</p>
    <p style="font-size:13px;color:#555;word-break:break-all;margin:0 0 24px 0;">${resetUrl}</p>
    <p style="font-size:12px;color:#888;margin:24px 0 0 0;border-top:1px solid #eee;padding-top:16px;">
      If you didn't request this, ignore this email — your password won't change.
    </p>
  </body>
</html>`
  const text = `Reset your password\n\nWe received a request to reset the password for your GM AI account.\n\nReset it here: ${resetUrl}\n\nIf you didn't request this, ignore this email — your password won't change.`
  return { html, text }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (getMailMode() === 'console') {
    logger.log(
      JSON.stringify({ event: 'mail.console_fallback', kind: 'password_reset', to, resetUrl }),
    )
    return
  }
  const { html, text } = renderPasswordResetEmail(resetUrl)
  // Fire-and-forget: awaiting would leak account existence via response timing.
  void sendMail({ to, subject: 'Reset your GM AI password', html, text })
    .then((res) => {
      if (!res.ok) {
        logger.error(
          JSON.stringify({ event: 'mail.send_failed', kind: 'password_reset', to: hashEmail(to) }),
        )
      }
    })
    .catch((err) => {
      logger.error(
        JSON.stringify({
          event: 'mail.send_failed',
          kind: 'password_reset',
          to: hashEmail(to),
          error: String(err).slice(0, 200),
        }),
      )
    })
}
