export type AuthEnv = {
  secret: string
  baseURL: string
  webOrigins: string[]
  // 01-02 audit-added: Resend config; undefined when dev console fallback is used
  resend?: { apiKey: string; mailFrom: string }
  // 03-04 Infobip WhatsApp + 03-05 Infobip 2FA — Twilio fully removed.
  infobip?: {
    baseUrl: string
    apiKey: string
    sender: string
    webhookSecret: string
    driverOverride: 'live' | 'console' | 'disabled' | undefined
  }
  // 03-05: Infobip 2FA SMS OTP config (shares baseUrl + apiKey with whatsapp `infobip` block above).
  // Undefined when PHONE_VERIFY_DRIVER_OVERRIDE=console OR when the 2FA env block is absent.
  infobip2fa?: {
    baseUrl: string
    apiKey: string
    applicationId: string
    messageId: string
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
  // 03-05: Infobip 2FA SMS OTP config — all-or-nothing on the two IDs.
  // Reuses INFOBIP_BASE_URL + INFOBIP_API_KEY read in the 03-04 block below.
  const ib2faAppId = process.env.INFOBIP_2FA_APPLICATION_ID
  const ib2faMsgId = process.env.INFOBIP_2FA_MESSAGE_ID
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

  // 03-05: Infobip 2FA all-or-nothing — both IDs set or both absent.
  // audit-S5: Infobip does not document a fixed shape for these IDs (they appear as
  // 32-char hex strings in the customer portal, but this is not API-contracted).
  // Minimum-length floor only (id.length >= 16) — catches obvious typos without
  // over-specifying a shape Infobip may change.
  // Source: https://github.com/infobip/infobip-api-java-client/blob/master/src/main/java/com/infobip/model/TfaApplicationResponse.java · verified 2026-04-20 (applicationId typed as String without length/pattern annotations)
  const ib2faPresentCount = (ib2faAppId ? 1 : 0) + (ib2faMsgId ? 1 : 0)
  if (ib2faPresentCount === 1) {
    errs.push(
      `Infobip 2FA config is all-or-nothing: got [applicationId?: ${!!ib2faAppId}, messageId?: ${!!ib2faMsgId}] — set both or neither`,
    )
  }
  if (ib2faAppId && ib2faAppId.length < 16) {
    errs.push(
      `INFOBIP_2FA_APPLICATION_ID too short (${ib2faAppId.length} chars) — Infobip IDs are typically ≥16 chars; likely a typo`,
    )
  }
  if (ib2faMsgId && ib2faMsgId.length < 16) {
    errs.push(
      `INFOBIP_2FA_MESSAGE_ID too short (${ib2faMsgId.length} chars) — Infobip IDs are typically ≥16 chars; likely a typo`,
    )
  }
  // When live 2FA is configured, INFOBIP_API_KEY + INFOBIP_BASE_URL must also be set.
  if (ib2faPresentCount === 2) {
    if (!process.env.INFOBIP_API_KEY) {
      errs.push(
        'INFOBIP_API_KEY required when INFOBIP_2FA_APPLICATION_ID + INFOBIP_2FA_MESSAGE_ID are set',
      )
    }
    if (!process.env.INFOBIP_BASE_URL) {
      errs.push(
        'INFOBIP_BASE_URL required when INFOBIP_2FA_APPLICATION_ID + INFOBIP_2FA_MESSAGE_ID are set',
      )
    }
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

  // 03-04: Infobip WhatsApp env block.
  const ibBase = process.env.INFOBIP_BASE_URL
  const ibApiKey = process.env.INFOBIP_API_KEY
  const ibSender = process.env.INFOBIP_WHATSAPP_SENDER
  const ibSecret = process.env.INFOBIP_WEBHOOK_SECRET
  const ibOverrideRaw = process.env.INFOBIP_DRIVER_OVERRIDE
  const isProd = process.env.NODE_ENV === 'production'

  const ibOverride: 'live' | 'console' | 'disabled' | undefined =
    ibOverrideRaw === 'live' || ibOverrideRaw === 'console' || ibOverrideRaw === 'disabled'
      ? ibOverrideRaw
      : undefined

  if (ibOverrideRaw && !ibOverride) {
    errs.push(
      `INFOBIP_DRIVER_OVERRIDE must be one of live|console|disabled, got "${ibOverrideRaw}"`,
    )
  }

  // Phase 03-01 audit-M (closes D-03-04-G): INFOBIP_DRIVER_OVERRIDE=console MUST
  // NOT ship to production. OTP delivery in 03-01 materially depends on real
  // Infobip outbound; console-mode in prod = silent OTP loss + locked-out staff.
  if (isProd && ibOverride === 'console') {
    errs.push(
      'INFOBIP_DRIVER_OVERRIDE=console is not allowed in production (closes D-03-04-G — WhatsApp OTP delivery requires live Infobip)',
    )
  }

  if (ibSender) {
    if (!/^[0-9]{6,20}$/.test(ibSender)) {
      errs.push(
        'INFOBIP_WHATSAPP_SENDER must be bare E.164 digits only (e.g. 447860088970 — no + or whatsapp: prefix)',
      )
    }
    // Allow boot in console OR disabled mode without creds.
    const credsOptional = ibOverride === 'console' || ibOverride === 'disabled'
    if (!credsOptional) {
      if (!ibBase) {
        errs.push(
          'INFOBIP_BASE_URL required when INFOBIP_WHATSAPP_SENDER set and driver override != console|disabled',
        )
      }
      if (!ibApiKey) {
        errs.push(
          'INFOBIP_API_KEY required when INFOBIP_WHATSAPP_SENDER set and driver override != console|disabled',
        )
      }
      if (!ibSecret) {
        errs.push(
          'INFOBIP_WEBHOOK_SECRET required when INFOBIP_WHATSAPP_SENDER set and driver override != console|disabled (HMAC-SHA256 signing key for inbound webhooks)',
        )
      }
    }
  }

  // 03-04 audit-added S5 (G12): accept apex `https://api.infobip.com` AND tenant-subdomain forms.
  if (ibBase && !/^https:\/\/([a-z0-9-]+\.)*(api\.)?infobip\.com(\/.*)?$/.test(ibBase)) {
    errs.push(
      `INFOBIP_BASE_URL must be https://api.infobip.com or https://<tenant>.api.infobip.com or https://<tenant>.infobip.com, got "${ibBase}"`,
    )
  }

  // 03-04 audit-added M2 (G2): HMAC-SHA256 key strength floor — ≥32 chars; ≥64 recommended.
  if (ibSecret && ibSecret.length < 32) {
    errs.push(
      `INFOBIP_WEBHOOK_SECRET too short (${ibSecret.length} chars) — min 32 chars required for HMAC-SHA256 strength; ≥64 recommended`,
    )
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

  // 03-04: infobip block populated when SENDER is set or console override is explicit.
  const ibPopulated = !!ibSender || ibOverride === 'console'
  const infobip = ibPopulated
    ? {
        baseUrl: ibBase ?? '',
        apiKey: ibApiKey ?? '',
        sender: ibSender ?? '',
        webhookSecret: ibSecret ?? '',
        driverOverride: ibOverride,
      }
    : undefined

  // 03-05: infobip2fa populated only when both IDs + key + baseUrl are present AND
  // PHONE_VERIFY_DRIVER_OVERRIDE !== 'console'. Console override forces console-mode
  // at the service layer regardless of real creds.
  const ib2faPopulated =
    ib2faPresentCount === 2 &&
    !!process.env.INFOBIP_API_KEY &&
    !!process.env.INFOBIP_BASE_URL &&
    phoneVerifyOverride !== 'console'
  const infobip2fa = ib2faPopulated
    ? {
        baseUrl: process.env.INFOBIP_BASE_URL!,
        apiKey: process.env.INFOBIP_API_KEY!,
        applicationId: ib2faAppId!,
        messageId: ib2faMsgId!,
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
    infobip,
    infobip2fa,
    reducto: { baseUrl: reductoBaseUrl, apiKey: reductoApiKey ?? '' },
  }
}
