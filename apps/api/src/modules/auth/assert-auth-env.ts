export type AuthEnv = {
  secret: string
  baseURL: string
  webOrigins: string[]
  smtp: { host: string; port: number; user: string; pass: string; from: string; secure: boolean }
  // 03-06 Twilio Conversations API. Auth token doubles as webhook signing key
  // (HMAC-SHA1 over PUBLIC_WEBHOOK_URL + sorted form params). publicWebhookUrl
  // must match the URL configured in the Twilio console — Twilio signs the
  // URL it was given, not the inbound URL we see (proxies can rewrite host).
  twilio?: {
    accountSid: string
    authToken: string
    conversationsServiceSid: string
    sender: string // "whatsapp:+E164"
    verifyServiceSid: string // "VA..." — empty when Verify not configured
    smsSender: string // "+E164" — empty when SMS not configured
    publicWebhookUrl: string
  }
  // Phase 6 — Reducto extraction layer. Required for any document upload other
  // than image MIMEs (which still go through Claude vision). REDUCTO_BASE_URL
  // optional; defaults to the documented production endpoint.
  reducto: {
    baseUrl: string
    apiKey: string
  }
}

// Name <addr@domain> format per RFC 5322 shorthand — the SMTP From header value
const MAIL_FROM_RE = /^.+<[^@\s]+@[^@\s]+>$/

export function assertAuthEnv(): AuthEnv {
  const secret = process.env.BETTER_AUTH_SECRET
  const baseURL = process.env.BETTER_AUTH_URL
  const webOriginRaw = process.env.WEB_ORIGIN
  const smtpPass = process.env.SMTP_PASSWORD || process.env.PLUNK_API_KEY
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPortRaw = process.env.SMTP_PORT
  const mailFrom = process.env.MAIL_FROM

  const errs: string[] = []
  if (!secret || !/^[0-9a-f]{64}$/i.test(secret)) {
    errs.push('BETTER_AUTH_SECRET must be 64 hex chars (32 bytes). Generate: openssl rand -hex 32')
  }
  if (!baseURL) errs.push('BETTER_AUTH_URL missing (e.g. http://localhost:3001)')
  if (!webOriginRaw) {
    errs.push(
      'WEB_ORIGIN missing (e.g. http://localhost:3000) — required for CORS + better-auth trustedOrigins',
    )
  }
  // No console fallback exists — SMTP is required everywhere so every email
  // path (password reset, invites, note digests) actually sends.
  const smtpPort = smtpPortRaw ? Number(smtpPortRaw) : NaN
  if (!smtpPass) errs.push('SMTP_PASSWORD (or PLUNK_API_KEY) is required — emails always send live')
  if (!smtpHost) errs.push('SMTP_HOST is required')
  if (!smtpUser) errs.push('SMTP_USER is required')
  if (!smtpPortRaw) errs.push('SMTP_PORT is required')
  else if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
    errs.push(`SMTP_PORT must be a valid port number, got "${smtpPortRaw}"`)
  }
  if (!mailFrom) {
    errs.push('MAIL_FROM is required (format: "Name <addr@domain>")')
  } else if (!MAIL_FROM_RE.test(mailFrom)) {
    errs.push(`MAIL_FROM has invalid format: got "${mailFrom}". Expected: "Name <addr@domain>"`)
  }

  const isProd = process.env.NODE_ENV === 'production'

  // 03-06 Twilio Conversations env block — the sole WhatsApp/SMS transport config.
  const twAcct = process.env.TWILIO_ACCOUNT_SID
  const twToken = process.env.TWILIO_AUTH_TOKEN
  const twServiceSid = process.env.TWILIO_CONVERSATIONS_SERVICE_SID
  const twSender = process.env.TWILIO_WHATSAPP_SENDER
  const twVerifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID
  const twSmsSender = process.env.TWILIO_SMS_SENDER
  const twPublicUrl = process.env.PUBLIC_WEBHOOK_URL
  // Phone OTP now delivers a self-generated PIN over SMS (see phone-otp.ts), so
  // prod needs a live SMS sender — without it sends silently fail and nobody can
  // onboard / log in by phone.
  if (isProd && !twSmsSender) {
    errs.push(
      'TWILIO_SMS_SENDER is required in production — phone OTP (invite onboarding + login) is delivered by SMS',
    )
  }
  const twAnyChannel = !!twSender || !!twVerifyServiceSid || !!twSmsSender
  if (twAnyChannel) {
    if (!twAcct || !/^AC[0-9a-fA-F]{32}$/.test(twAcct)) {
      errs.push('TWILIO_ACCOUNT_SID must be set (AC + 32 hex chars) when any Twilio channel is set')
    }
    if (!twToken || twToken.length < 32) {
      errs.push('TWILIO_AUTH_TOKEN must be set (≥32 chars) when any Twilio channel is set')
    }
  }
  if (twSender) {
    if (!/^whatsapp:\+[0-9]{6,20}$/.test(twSender)) {
      errs.push(
        `TWILIO_WHATSAPP_SENDER must be "whatsapp:+E164" (e.g. whatsapp:+14155238886), got "${twSender}"`,
      )
    }
    if (!twServiceSid || !/^IS[0-9a-fA-F]{32}$/.test(twServiceSid)) {
      errs.push(
        'TWILIO_CONVERSATIONS_SERVICE_SID must be set (IS + 32 hex chars) when TWILIO_WHATSAPP_SENDER is set',
      )
    }
    if (!twPublicUrl || !/^https:\/\/.+/.test(twPublicUrl)) {
      errs.push(
        'PUBLIC_WEBHOOK_URL must be set to the https URL configured in Twilio console (signature validation rebuilds the signing string from this URL, not req.url)',
      )
    }
  }
  if (twVerifyServiceSid && !/^VA[0-9a-fA-F]{32}$/.test(twVerifyServiceSid)) {
    errs.push(
      `TWILIO_VERIFY_SERVICE_SID must be "VA" + 32 hex chars (from Twilio Verify), got "${twVerifyServiceSid}"`,
    )
  }
  if (twSmsSender && !/^\+[0-9]{6,20}$/.test(twSmsSender)) {
    errs.push(`TWILIO_SMS_SENDER must be "+E164" (e.g. +447700900000), got "${twSmsSender}"`)
  }

  // 03-02 audit-added: ChatService test-mode knobs — probe-only, production-forbidden.
  const probeDelayRaw = process.env.PROBE_CHAT_SERVICE_DELAY_MS
  const probeDelayParsed = probeDelayRaw !== undefined ? Number(probeDelayRaw) : 0
  const probeStubRaw = process.env.PROBE_CHAT_SERVICE_STUB
  if (probeDelayRaw !== undefined) {
    if (
      !Number.isFinite(probeDelayParsed) ||
      probeDelayParsed < 0 ||
      !/^\d+$/.test(probeDelayRaw)
    ) {
      errs.push(
        `PROBE_CHAT_SERVICE_DELAY_MS must be a non-negative integer (milliseconds), got "${probeDelayRaw}"`,
      )
    } else if (isProd && probeDelayParsed > 0) {
      errs.push(
        'PROBE_CHAT_SERVICE_DELAY_MS must be 0 or unset in production — probe-only test-mode latency knob',
      )
    }
  }
  if (isProd && probeStubRaw === 'true') {
    errs.push(
      'PROBE_CHAT_SERVICE_STUB must not be set in production — probe-only ChatService skip switch',
    )
  }

  // Plan 01-02 audit-M3: probe-only backfill cost-ceiling override — production-forbidden.
  // Mirrors PROBE_VOYAGE_FAIL_RATIO + PROBE_CHAT_SERVICE_DELAY_MS pattern.
  const probeBackfillCeilingRaw = process.env.PROBE_BACKFILL_COST_CEILING_USD
  if (probeBackfillCeilingRaw !== undefined) {
    const parsed = Number(probeBackfillCeilingRaw)
    if (!Number.isFinite(parsed) || parsed < 0) {
      errs.push(
        `PROBE_BACKFILL_COST_CEILING_USD must be a non-negative number (USD), got "${probeBackfillCeilingRaw}"`,
      )
    } else if (isProd) {
      errs.push(
        'PROBE_BACKFILL_COST_CEILING_USD must not be set in production — probe-only backfill cost-ceiling override',
      )
    }
  }

  // Phase 6 — Reducto extraction. REDUCTO_API_KEY required at boot; the
  // extractor path won't function without it (no soft fallbacks — if the key
  // isn't there, uploads silently fail later, which is worse than refusing to
  // start).
  const reductoApiKey = process.env.REDUCTO_API_KEY
  if (!reductoApiKey) {
    errs.push(
      'REDUCTO_API_KEY missing — required for document extraction (CSV / XLSX / PDF / DOCX / PPTX). Get a key at https://reducto.ai',
    )
  }
  const reductoBaseUrl = process.env.REDUCTO_BASE_URL ?? 'https://platform.reducto.ai'

  if (errs.length) {
    process.stderr.write(
      `[auth] fail-fast startup:\n  - ${errs.join('\n  - ')}\n  See .env.example\n`,
    )
    process.exit(1)
  }

  // 03-02 audit-added S2: non-prod WARN logs so staging misconfig is visible.
  if (!isProd) {
    if (probeDelayParsed > 0) {
      process.stderr.write(
        `[chat] WARN: PROBE_CHAT_SERVICE_DELAY_MS=${probeDelayParsed} active (non-production only)\n`,
      )
    }
    if (probeStubRaw === 'true') {
      process.stderr.write(
        '[chat] WARN: PROBE_CHAT_SERVICE_STUB=true active — Claude calls skipped (non-production only)\n',
      )
    }
    if (probeBackfillCeilingRaw !== undefined) {
      process.stderr.write(
        `[backfill] WARN: PROBE_BACKFILL_COST_CEILING_USD=${probeBackfillCeilingRaw} active — overrides BACKFILL_TENANT_COST_CEILING_USD (non-production only)\n`,
      )
    }
    if (!twSmsSender) {
      process.stderr.write(
        '[phone] WARN: TWILIO_SMS_SENDER not set — phone OTP + invite SMS sends will fail (no console fallback exists)\n',
      )
    }
  }

  const webOrigins = webOriginRaw!
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const twilio = twAnyChannel
    ? {
        accountSid: twAcct ?? '',
        authToken: twToken ?? '',
        conversationsServiceSid: twServiceSid ?? '',
        sender: twSender ?? '',
        verifyServiceSid: twVerifyServiceSid ?? '',
        smsSender: twSmsSender ?? '',
        publicWebhookUrl: twPublicUrl ?? '',
      }
    : undefined

  return {
    secret: secret!,
    baseURL: baseURL!,
    webOrigins,
    smtp: {
      host: smtpHost!,
      port: smtpPort,
      user: smtpUser!,
      pass: smtpPass!,
      from: mailFrom!,
      secure: smtpPort === 465 || smtpPort === 2465,
    },
    twilio,
    reducto: { baseUrl: reductoBaseUrl, apiKey: reductoApiKey! },
  }
}
