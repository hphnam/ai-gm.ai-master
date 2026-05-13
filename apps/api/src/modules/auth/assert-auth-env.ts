export type AuthEnv = {
  secret: string
  baseURL: string
  webOrigins: string[]
  // 01-02 audit-added: Resend config; undefined when dev console fallback is used
  resend?: { apiKey: string; mailFrom: string }
  // 03-06 Twilio Conversations API. Auth token doubles as webhook signing key
  // (HMAC-SHA1 over PUBLIC_WEBHOOK_URL + sorted form params). publicWebhookUrl
  // must match the URL configured in the Twilio console — Twilio signs the
  // URL it was given, not the inbound URL we see (proxies can rewrite host).
  twilio?: {
    accountSid: string
    authToken: string
    conversationsServiceSid: string
    sender: string // "whatsapp:+E164"
    publicWebhookUrl: string
    driverOverride: 'live' | 'console' | 'disabled' | undefined
  }
  // Phase 6 — Reducto extraction layer. Required for any document upload other
  // than image MIMEs (which still go through Claude vision). REDUCTO_BASE_URL
  // optional; defaults to the documented production endpoint.
  reducto: {
    baseUrl: string
    apiKey: string
  }
}

// Name <addr@domain> format per RFC 5322 shorthand — required by Resend's from field
const MAIL_FROM_RE = /^.+<[^@\s]+@[^@\s]+>$/

export function assertAuthEnv(): AuthEnv {
  const secret = process.env.BETTER_AUTH_SECRET
  const baseURL = process.env.BETTER_AUTH_URL
  const webOriginRaw = process.env.WEB_ORIGIN
  const resendKey = process.env.RESEND_API_KEY
  const mailFrom = process.env.MAIL_FROM
  // 03-06: phone-verify driver override stays — gates console-mode vs live in
  // WhatsappVerifyService independently of TWILIO_DRIVER_OVERRIDE so the OTP
  // path can be kill-switched without disabling chat send.
  const phoneVerifyOverrideRaw = process.env.PHONE_VERIFY_DRIVER_OVERRIDE

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
  // 01-02 audit-added: MAIL_FROM required when RESEND_API_KEY is set
  if (resendKey && !mailFrom) {
    errs.push('MAIL_FROM is required when RESEND_API_KEY is set (format: "Name <addr@domain>")')
  }
  if (resendKey && mailFrom && !MAIL_FROM_RE.test(mailFrom)) {
    errs.push(`MAIL_FROM has invalid format: got "${mailFrom}". Expected: "Name <addr@domain>"`)
  }

  const phoneVerifyOverride: 'live' | 'console' | 'disabled' | undefined =
    phoneVerifyOverrideRaw === 'live' ||
    phoneVerifyOverrideRaw === 'console' ||
    phoneVerifyOverrideRaw === 'disabled'
      ? phoneVerifyOverrideRaw
      : undefined
  if (phoneVerifyOverrideRaw && !phoneVerifyOverride) {
    errs.push(
      `PHONE_VERIFY_DRIVER_OVERRIDE must be one of live|console|disabled, got "${phoneVerifyOverrideRaw}"`,
    )
  }

  const isProd = process.env.NODE_ENV === 'production'

  // 03-06 Twilio Conversations env block — runs alongside Infobip during the
  // migration window. Cutover commit removes Infobip; this block becomes the
  // sole WhatsApp transport config.
  const twAcct = process.env.TWILIO_ACCOUNT_SID
  const twToken = process.env.TWILIO_AUTH_TOKEN
  const twServiceSid = process.env.TWILIO_CONVERSATIONS_SERVICE_SID
  const twSender = process.env.TWILIO_WHATSAPP_SENDER
  const twPublicUrl = process.env.PUBLIC_WEBHOOK_URL
  const twOverrideRaw = process.env.TWILIO_DRIVER_OVERRIDE
  const twOverride: 'live' | 'console' | 'disabled' | undefined =
    twOverrideRaw === 'live' || twOverrideRaw === 'console' || twOverrideRaw === 'disabled'
      ? twOverrideRaw
      : undefined
  if (twOverrideRaw && !twOverride) {
    errs.push(`TWILIO_DRIVER_OVERRIDE must be one of live|console|disabled, got "${twOverrideRaw}"`)
  }
  if (isProd && twOverride === 'console') {
    errs.push(
      'TWILIO_DRIVER_OVERRIDE=console is not allowed in production (WhatsApp OTP + invite delivery requires live Twilio)',
    )
  }
  // Twilio block validates when SENDER is set; matches Infobip's gating pattern.
  const twCredsOptional = twOverride === 'console' || twOverride === 'disabled'
  if (twSender) {
    if (!/^whatsapp:\+[0-9]{6,20}$/.test(twSender)) {
      errs.push(
        `TWILIO_WHATSAPP_SENDER must be "whatsapp:+E164" (e.g. whatsapp:+14155238886), got "${twSender}"`,
      )
    }
    if (!twCredsOptional) {
      if (!twAcct || !/^AC[0-9a-fA-F]{32}$/.test(twAcct)) {
        errs.push(
          'TWILIO_ACCOUNT_SID must be set (AC + 32 hex chars) when TWILIO_WHATSAPP_SENDER is set',
        )
      }
      if (!twToken || twToken.length < 32) {
        errs.push('TWILIO_AUTH_TOKEN must be set (≥32 chars) when TWILIO_WHATSAPP_SENDER is set')
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
  }

  const webOrigins = webOriginRaw!
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // 03-06: phoneVerifyOverride feeds WhatsappVerifyService; consumed via
  // process.env at call-time, but referenced here to keep the validator above
  // active. Marking unused void to satisfy lint without disabling the rule.
  void phoneVerifyOverride

  // 03-06: twilio block populated when SENDER is set or console override is explicit.
  const twPopulated = !!twSender || twOverride === 'console'
  const twilio = twPopulated
    ? {
        accountSid: twAcct ?? '',
        authToken: twToken ?? '',
        conversationsServiceSid: twServiceSid ?? '',
        sender: twSender ?? '',
        publicWebhookUrl: twPublicUrl ?? '',
        driverOverride: twOverride,
      }
    : undefined

  // Phase 6 — Reducto extraction. REDUCTO_API_KEY required at boot; the
  // extractor path won't function without it. Same fail-fast posture as the
  // other Phase-1+ env requirements (no soft fallbacks — if the key isn't
  // there, uploads silently fail later, which is worse than refusing to start).
  const reductoApiKey = process.env.REDUCTO_API_KEY
  if (!reductoApiKey) {
    errs.push(
      'REDUCTO_API_KEY missing — required for document extraction (CSV / XLSX / PDF / DOCX / PPTX). Get a key at https://reducto.ai',
    )
  }
  const reductoBaseUrl = process.env.REDUCTO_BASE_URL ?? 'https://platform.reducto.ai'

  return {
    secret: secret!,
    baseURL: baseURL!,
    webOrigins,
    resend: resendKey ? { apiKey: resendKey, mailFrom: mailFrom! } : undefined,
    twilio,
    reducto: { baseUrl: reductoBaseUrl, apiKey: reductoApiKey ?? '' },
  }
}
