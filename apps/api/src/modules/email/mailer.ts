import { createTransport, type Transporter } from 'nodemailer'
import { MAIL_SEND_TIMEOUT_MS } from '../../types'
import { assertAuthEnv } from '../auth/assert-auth-env'

let transporter: Transporter | null = null

function getTransport(): Transporter {
  const smtp = assertAuthEnv().smtp
  if (!transporter) {
    transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      // Force STARTTLS upgrade so a MITM can't strip it and read creds in clear.
      requireTLS: true,
      auth: { user: smtp.user, pass: smtp.pass },
      connectionTimeout: MAIL_SEND_TIMEOUT_MS,
      greetingTimeout: MAIL_SEND_TIMEOUT_MS,
      socketTimeout: MAIL_SEND_TIMEOUT_MS,
    })
  }
  return transporter
}

export type SendMailInput = { to: string; subject: string; html: string; text: string }

export type SendMailResult =
  | { ok: true; messageId?: string }
  | { ok: false; reason: 'mail-send-failed' }

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const transport = getTransport()
  const from = assertAuthEnv().smtp.from
  try {
    const info = await transport.sendMail({
      to: input.to,
      from,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
    return { ok: true, messageId: info.messageId }
  } catch {
    return { ok: false, reason: 'mail-send-failed' }
  }
}
