export type AuthEnv = {
  secret: string
  baseURL: string
  webOrigins: string[]
  // 01-02 audit-added: Resend config; undefined when dev console fallback is used
  resend?: { apiKey: string; mailFrom: string }
}

// Name <addr@domain> format per RFC 5322 shorthand — required by Resend's from field
const MAIL_FROM_RE = /^.+<[^@\s]+@[^@\s]+>$/

export function assertAuthEnv(): AuthEnv {
  const secret = process.env.BETTER_AUTH_SECRET
  const baseURL = process.env.BETTER_AUTH_URL
  const webOriginRaw = process.env.WEB_ORIGIN
  const resendKey = process.env.RESEND_API_KEY
  const mailFrom = process.env.MAIL_FROM

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
  }
}
