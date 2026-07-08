import { Logger } from '@nestjs/common'
import { maskPhone } from '../../types/auth'
import { assertAuthEnv } from '../auth/assert-auth-env'

const MESSAGES_BASE = 'https://api.twilio.com/2010-04-01'
const TIMEOUT_MS = 10_000

const logger = new Logger('TwilioVerify')

type Mode = 'live' | 'console' | 'disabled'

function resolveMode(): Mode {
  const override = process.env.TWILIO_DRIVER_OVERRIDE
  if (override === 'disabled') return 'disabled'
  // Production never uses the console dev-code path (guarded at boot too).
  if (process.env.NODE_ENV === 'production') return 'live'
  if (override === 'console') return 'console'
  const tw = assertAuthEnv().twilio
  return tw?.accountSid ? 'live' : 'console'
}

function basicAuth(): string {
  const tw = assertAuthEnv().twilio!
  return Buffer.from(`${tw.accountSid}:${tw.authToken}`).toString('base64')
}

export async function sendSms(to: string, body: string): Promise<{ ok: boolean }> {
  const mode = resolveMode()
  if (mode === 'disabled') return { ok: false }
  const tw = assertAuthEnv().twilio
  if (mode === 'console' || !tw?.smsSender) {
    // Dev-only: the code lives only in this log line (no real SMS goes out), so
    // the body stays intact for local testing; the recipient is masked.
    logger.warn(`console mode — SMS to ${maskPhone(to)}: ${body}`)
    return { ok: mode === 'console' }
  }
  try {
    const res = await fetch(`${MESSAGES_BASE}/Accounts/${tw.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: tw.smsSender, Body: body }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}
