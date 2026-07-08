import { Logger } from '@nestjs/common'
import { maskPhone } from '../../types/auth'
import { assertAuthEnv } from '../auth/assert-auth-env'

const MESSAGES_BASE = 'https://api.twilio.com/2010-04-01'
const TIMEOUT_MS = 10_000

const logger = new Logger('TwilioVerify')

function basicAuth(): string {
  const tw = assertAuthEnv().twilio!
  return Buffer.from(`${tw.accountSid}:${tw.authToken}`).toString('base64')
}

export async function sendSms(to: string, body: string): Promise<{ ok: boolean }> {
  const tw = assertAuthEnv().twilio
  if (!tw?.smsSender || !tw.accountSid) {
    logger.error(`SMS send failed — TWILIO_SMS_SENDER not configured (to ${maskPhone(to)})`)
    return { ok: false }
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
