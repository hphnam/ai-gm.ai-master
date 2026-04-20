export type AuthEnv = {
  secret: string
  baseURL: string
  webOrigins: string[]
  // 01-02 audit-added: Resend config; undefined when dev console fallback is used
  resend?: { apiKey: string; mailFrom: string }
  // 01-03 audit-added: Twilio Verify config; undefined when console fallback is used
  twilio?: { accountSid: string; authToken: string; verifyServiceSid: string }
}

// Name <addr@domain> format per RFC 5322 shorthand — required by Resend's from field
const MAIL_FROM_RE = /^.+<[^@\s]+@[^@\s]+>$/

export function assertAuthEnv(): AuthEnv {
  const secret = process.env.BETTER_AUTH_SECRET
  const baseURL = process.env.BETTER_AUTH_URL
  const webOriginRaw = process.env.WEB_ORIGIN
  const resendKey = process.env.RESEND_API_KEY
  const mailFrom = process.env.MAIL_FROM
  // 01-03: Twilio Verify config — all-or-nothing. Partial config fails fast.
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioVerifySid = process.env.TWILIO_VERIFY_SERVICE_SID

  const errs: string[] = []
  if (!secret || !/^[0-9a-f]{64}$/i.test(secret)) {
    errs.push(
      'BETTER_AUTH_SECRET must be 64 hex chars (32 bytes). Generate: openssl rand -hex 32',
    )
  }
  if (!baseURL) errs.push('BETTER_AUTH_URL missing (e.g. http://localhost:3001)')
  if (!webOriginRaw) {
    errs.push(
      'WEB_ORIGIN missing (e.g. http://localhost:3000) — required for CORS + better-auth trustedOrigins',
    )
  }
  // 01-02 audit-added: MAIL_FROM required when RESEND_API_KEY is set
  if (resendKey && !mailFrom) {
    errs.push(
      'MAIL_FROM is required when RESEND_API_KEY is set (format: "Name <addr@domain>")',
    )
  }
  if (resendKey && mailFrom && !MAIL_FROM_RE.test(mailFrom)) {
    errs.push(
      `MAIL_FROM has invalid format: got "${mailFrom}". Expected: "Name <addr@domain>"`,
    )
  }

  // 01-03: Twilio all-or-nothing check + shape validation on the two SIDs
  const twilioPresentBits: Array<boolean> = [!!twilioSid, !!twilioToken, !!twilioVerifySid]
  const presentCount = twilioPresentBits.filter(Boolean).length
  if (presentCount !== 0 && presentCount !== 3) {
    errs.push(
      `Twilio config is all-or-nothing: got [SID?: ${!!twilioSid}, token?: ${!!twilioToken}, verifyServiceSid?: ${!!twilioVerifySid}] — set all three or none`,
    )
  }
  if (presentCount === 3) {
    // Twilio Account SIDs start with "AC"; API Keys (used as an alternative to
    // Account SID / Auth Token for Basic Auth) start with "SK". Both are 34 chars.
    if (!/^(AC|SK)[A-Za-z0-9]{32}$/.test(twilioSid!)) {
      errs.push('TWILIO_ACCOUNT_SID must start with AC or SK and be 34 chars')
    }
    if (!/^VA[A-Za-z0-9]{32}$/.test(twilioVerifySid!)) {
      errs.push('TWILIO_VERIFY_SERVICE_SID must start with VA and be 34 chars')
    }
  }

  if (errs.length) {
    process.stderr.write(
      `[auth] fail-fast startup:\n  - ${errs.join('\n  - ')}\n  See .env.example\n`,
    )
    process.exit(1)
  }

  const webOrigins = webOriginRaw!
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return {
    secret: secret!,
    baseURL: baseURL!,
    webOrigins,
    resend: resendKey ? { apiKey: resendKey, mailFrom: mailFrom! } : undefined,
    twilio:
      presentCount === 3
        ? {
            accountSid: twilioSid!,
            authToken: twilioToken!,
            verifyServiceSid: twilioVerifySid!,
          }
        : undefined,
  }
}
