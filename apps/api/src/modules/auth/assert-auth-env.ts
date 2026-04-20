export type AuthEnv = {
  secret: string
  baseURL: string
  webOrigins: string[]
  // 01-02 audit-added: Resend config; undefined when dev console fallback is used
  resend?: { apiKey: string; mailFrom: string }
  // 01-03 audit-added: Twilio Verify config; undefined when console fallback is used
  twilio?: { accountSid: string; authToken: string; verifyServiceSid: string }
  // 03-01 audit-added: WhatsApp (Twilio) config + URL pin + dev-bypass gate
  whatsapp?: {
    fromNumber: string
    driverOverride: 'live' | 'console' | 'disabled' | undefined
    webhookPublicUrl: string
    allowDevBypass: boolean
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

  // 03-01 audit-added: WhatsApp (Twilio) env block — additive-only to 01-03 Verify.
  const waFrom = process.env.TWILIO_WHATSAPP_FROM
  const waOverrideRaw = process.env.TWILIO_WHATSAPP_DRIVER_OVERRIDE
  const waPublicUrl = process.env.WHATSAPP_WEBHOOK_PUBLIC_URL
  const waAllowDevBypassRaw = process.env.ALLOW_WEBHOOK_DEV_BYPASS
  const isProd = process.env.NODE_ENV === 'production'

  const waOverride: 'live' | 'console' | 'disabled' | undefined =
    waOverrideRaw === 'live' || waOverrideRaw === 'console' || waOverrideRaw === 'disabled'
      ? waOverrideRaw
      : undefined

  if (waOverrideRaw && !waOverride) {
    errs.push(
      `TWILIO_WHATSAPP_DRIVER_OVERRIDE must be one of live|console|disabled, got "${waOverrideRaw}"`,
    )
  }

  if (waFrom) {
    if (!/^whatsapp:\+[0-9]{6,20}$/.test(waFrom)) {
      errs.push(
        'TWILIO_WHATSAPP_FROM must match "whatsapp:+<digits>" format (e.g. whatsapp:+14155551234)',
      )
    }
    // audit-added S3: allow boot in console OR disabled mode without creds.
    const credsOptional = waOverride === 'console' || waOverride === 'disabled'
    if (!credsOptional && presentCount !== 3) {
      errs.push(
        'TWILIO_WHATSAPP_FROM requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN unless TWILIO_WHATSAPP_DRIVER_OVERRIDE in {console, disabled}',
      )
    }
    // audit-added M1: URL-pin is REQUIRED whenever live outbound is possible.
    if (waOverride !== 'console') {
      if (!waPublicUrl) {
        errs.push(
          'WHATSAPP_WEBHOOK_PUBLIC_URL required when TWILIO_WHATSAPP_FROM set and driver override != "console" — set to the exact https URL configured in Twilio Console (e.g. https://api.yourdomain.com/webhooks/twilio/whatsapp)',
        )
      } else if (!/^https:\/\/[^\s?#]+\/webhooks\/twilio\/whatsapp$/.test(waPublicUrl)) {
        errs.push(
          `WHATSAPP_WEBHOOK_PUBLIC_URL must be https:// and end with /webhooks/twilio/whatsapp, got "${waPublicUrl}"`,
        )
      }
    }
  }

  // audit-added M2: dev-bypass MUST NOT be enabled in production.
  if (isProd && waAllowDevBypassRaw === 'true') {
    errs.push(
      'ALLOW_WEBHOOK_DEV_BYPASS must not be set to "true" in production — remove before deploying',
    )
  }

  // 03-02 audit-added: ChatService test-mode knobs — probe-only, production-forbidden.
  const probeDelayRaw = process.env.PROBE_CHAT_SERVICE_DELAY_MS
  const probeDelayParsed = probeDelayRaw !== undefined ? Number(probeDelayRaw) : 0
  const probeStubRaw = process.env.PROBE_CHAT_SERVICE_STUB
  if (probeDelayRaw !== undefined) {
    if (!Number.isFinite(probeDelayParsed) || probeDelayParsed < 0 || !/^\d+$/.test(probeDelayRaw)) {
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
  }

  const webOrigins = webOriginRaw!
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // 03-01 audit-added: whatsapp block populated when FROM is set or console override is explicit.
  const waPopulated = !!waFrom || waOverride === 'console'
  const whatsapp = waPopulated
    ? {
        fromNumber: waFrom ?? '',
        driverOverride: waOverride,
        webhookPublicUrl: waPublicUrl ?? '',
        allowDevBypass: !isProd && waAllowDevBypassRaw === 'true',
      }
    : undefined

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
    whatsapp,
  }
}
