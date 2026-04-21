import { createHash } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { assertAuthEnv } from '../auth/assert-auth-env'
// Plan 04-01 audit-M2: sanitiseError factored to shared util; preserved behaviour + redaction contract.
import { sanitiseError } from '../../common/sanitise-error'

type DriverMode = 'console' | 'live' | 'disabled'

type StartResult =
  | { ok: true; mode: DriverMode }
  | {
      ok: false
      reason: 'phone-service-unavailable' | 'phone-invalid-format'
      details?: { reason?: string; infobipCode?: string | null; infobipStatus?: number | null }
    }

type CheckResult =
  | {
      ok: true
      approved: boolean
      mode: DriverMode
      details?: { reason?: string }
    }
  | {
      ok: false
      reason: 'phone-service-unavailable'
      details?: { reason?: string; infobipCode?: string | null; infobipStatus?: number | null }
    }

const INFOBIP_TIMEOUT_MS = 10_000

// Source: https://github.com/infobip/infobip-api-java-client/blob/master/src/main/java/com/infobip/api/TfaApi.java · verified 2026-04-20
// Infobip 2FA PIN default expiry is configured per-Application on the Portal (typical 2-15 min).
// 15 min = the longest documented default; cache entries older than this are ALWAYS stale.
const INFOBIP_PIN_TTL_MS = 900_000

// audit-S12: deterministic FIFO eviction cap. Map preserves insertion order.
const MAX_PIN_CACHE_ENTRIES = 1024

function hashPhone(phoneNumber: string): string {
  return createHash('sha256').update(phoneNumber).digest('hex').slice(0, 16)
}

function consoleCodeFor(phoneNumber: string): string {
  // Deterministic for dev/probe runs — last 6 digits of the phone number.
  const digits = phoneNumber.replace(/\D/g, '')
  return `PROBE-${digits.slice(-6)}`
}

// audit-M4/M5: `sanitiseError` moved to apps/api/src/common/sanitise-error.ts (Plan 04-01 audit-M2).
// Imported above; behaviour preserved. Shared with new docs image-extractor.

// audit-M5: Infobip error text regularly contains the submitted phone number verbatim
// (e.g. "Number +447... is not valid"). Redact before capturing into any log payload.
function sanitiseInfobipText(text: unknown): string {
  return String(text ?? '').replace(/\+?\d{10,15}/g, '[PHONE]').slice(0, 200)
}

// audit-M3 shape-based pin-state mapping.
// Source: https://github.com/infobip/infobip-api-java-client/blob/master/src/main/java/com/infobip/model/TfaVerifyPinResponse.java · verified 2026-04-20
// Infobip returns HTTP 2xx with { verified: false, pinError: <string> } for pin-state errors
// (expired / wrong / blocked). We classify by the presence of pinError, not by enumerating
// the exact string values (which are not publicly documented in machine-readable form).
function classifyPinError(pinError: string | undefined | null): 'pin-expired' | 'pin-blocked' | 'pin-not-found' | 'pin-verification-failed' {
  if (!pinError) return 'pin-verification-failed'
  const normalised = pinError.toUpperCase()
  if (normalised.includes('EXPIRED')) return 'pin-expired'
  if (normalised.includes('BLOCKED') || normalised.includes('ATTEMPTS_EXCEEDED') || normalised.includes('NO_MORE')) return 'pin-blocked'
  if (normalised.includes('NOT_FOUND') || normalised.includes('MISSING')) return 'pin-not-found'
  return 'pin-verification-failed'
}

type LogOpts = { requestId?: string }

@Injectable()
export class InfobipVerifyService {
  private readonly logger = new Logger(InfobipVerifyService.name)
  // baseMode captures console-vs-live decision at boot; 'disabled' is read per-call
  // from PHONE_VERIFY_DRIVER_OVERRIDE so the ops kill-switch takes effect without a redeploy.
  private readonly baseMode: 'console' | 'live'

  private readonly baseUrl?: string
  private readonly apiKey?: string
  private readonly applicationId?: string
  private readonly messageId?: string

  // audit-M2 + audit-S12: TTL-bounded + FIFO-capped in-memory pinId cache.
  private readonly pinCache = new Map<string /* phoneHash */, { pinId: string; issuedAt: number }>()

  constructor() {
    const env = assertAuthEnv()
    const override = process.env.PHONE_VERIFY_DRIVER_OVERRIDE
    if (override === 'console' || !env.infobip2fa) {
      this.baseMode = 'console'
      return
    }
    this.baseMode = 'live'
    this.baseUrl = env.infobip2fa.baseUrl
    this.apiKey = env.infobip2fa.apiKey
    this.applicationId = env.infobip2fa.applicationId
    this.messageId = env.infobip2fa.messageId
  }

  // 'disabled' wins over everything else and is read at call time so the kill-switch
  // takes effect without restarting the process.
  get mode(): DriverMode {
    if (process.env.PHONE_VERIFY_DRIVER_OVERRIDE === 'disabled') return 'disabled'
    return this.baseMode
  }

  private cachePinId(phoneHash: string, pinId: string) {
    // audit-S12: FIFO eviction at cap boundary.
    if (this.pinCache.size >= MAX_PIN_CACHE_ENTRIES) {
      const oldest = this.pinCache.keys().next().value
      if (oldest !== undefined) this.pinCache.delete(oldest)
    }
    this.pinCache.set(phoneHash, { pinId, issuedAt: Date.now() })
  }

  async startVerification(phoneNumber: string, opts?: LogOpts): Promise<StartResult> {
    const phoneHash = hashPhone(phoneNumber)
    const requestId = opts?.requestId ?? null

    if (this.mode === 'disabled') {
      this.logger.warn(
        JSON.stringify({ event: 'phone.driver_disabled', phoneHash, path: 'send', requestId }),
      )
      return { ok: false, reason: 'phone-service-unavailable', details: { reason: 'disabled' } }
    }

    if (this.mode === 'console') {
      this.logger.log(
        JSON.stringify({
          event: 'phone.console_fallback',
          phoneHash,
          code: consoleCodeFor(phoneNumber),
          requestId,
        }),
      )
      return { ok: true, mode: 'console' }
    }

    // Send-attempted log BEFORE fetch so "Infobip never responded at all" is observable.
    this.logger.log(JSON.stringify({ event: 'phone.send_attempted', phoneHash, requestId }))

    // Source: https://github.com/infobip/infobip-api-java-client/blob/master/src/main/java/com/infobip/api/TfaApi.java · verified 2026-04-20 (POST /2fa/2/pin + JSON body + App-auth)
    const url = `${this.baseUrl}/2fa/2/pin`
    // Source: https://github.com/infobip/infobip-api-java-client/blob/master/src/main/java/com/infobip/model/TfaStartAuthenticationRequest.java · verified 2026-04-20 (fields: applicationId, messageId, to)
    const body = JSON.stringify({
      applicationId: this.applicationId,
      messageId: this.messageId,
      to: phoneNumber,
    })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          // Source: https://www.infobip.com/docs/essentials/api-authentication · verified via 03-04 implementation 2026-04-20
          Authorization: `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body,
        signal: AbortSignal.timeout(INFOBIP_TIMEOUT_MS),
      })

      const json = (await res.json().catch(() => ({}))) as {
        pinId?: string
        smsStatus?: string
        ncStatus?: string
        requestError?: { serviceException?: { messageId?: string; text?: string } }
      }

      if (res.status >= 200 && res.status < 300) {
        // audit-M1: shape-validate on 2xx before trusting the response.
        // Source: https://github.com/infobip/infobip-api-java-client/blob/master/src/main/java/com/infobip/model/TfaStartAuthenticationResponse.java · verified 2026-04-20 (pinId non-empty string on success)
        if (typeof json.pinId !== 'string' || json.pinId.length === 0) {
          this.logger.error(
            JSON.stringify({
              event: 'phone.send_unexpected_response',
              phoneHash,
              infobipStatus: res.status,
              bodyPreview: sanitiseInfobipText(JSON.stringify(json).slice(0, 200)),
              requestId,
            }),
          )
          return {
            ok: false,
            reason: 'phone-service-unavailable',
            details: { reason: 'invalid-response' },
          }
        }
        this.cachePinId(phoneHash, json.pinId)
        this.logger.log(
          JSON.stringify({ event: 'phone.send_succeeded', phoneHash, requestId }),
        )
        return { ok: true, mode: 'live' }
      }

      // Non-2xx. Infobip typically wraps errors in requestError.serviceException.
      const svcMessageId = json.requestError?.serviceException?.messageId ?? null
      const svcText = sanitiseInfobipText(json.requestError?.serviceException?.text)
      this.logger.error(
        JSON.stringify({
          event: 'phone.send_failed',
          phoneHash,
          infobipStatus: res.status,
          infobipCode: svcMessageId,
          infobipText: svcText,
          requestId,
        }),
      )
      // Format-related error classification. Infobip does not publish a fixed messageId
      // enum, so we use the HTTP status (400) + message-shape as the signal.
      if (
        res.status === 400 &&
        (svcText.toLowerCase().includes('invalid') ||
          svcText.toLowerCase().includes('format') ||
          svcText.toLowerCase().includes('msisdn'))
      ) {
        return { ok: false, reason: 'phone-invalid-format' }
      }
      return {
        ok: false,
        reason: 'phone-service-unavailable',
        details: { infobipStatus: res.status, infobipCode: svcMessageId },
      }
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          event: 'phone.send_failed',
          phoneHash,
          infobipStatus: null,
          infobipError: sanitiseError(err),
          requestId,
        }),
      )
      return {
        ok: false,
        reason: 'phone-service-unavailable',
        details: { reason: 'network' },
      }
    }
  }

  async checkVerification(
    phoneNumber: string,
    code: string,
    opts?: LogOpts,
  ): Promise<CheckResult> {
    const phoneHash = hashPhone(phoneNumber)
    const requestId = opts?.requestId ?? null

    if (this.mode === 'disabled') {
      this.logger.warn(
        JSON.stringify({ event: 'phone.driver_disabled', phoneHash, path: 'verify', requestId }),
      )
      return { ok: false, reason: 'phone-service-unavailable', details: { reason: 'disabled' } }
    }

    if (this.mode === 'console') {
      const approved = code === consoleCodeFor(phoneNumber)
      this.logger.log(
        JSON.stringify({
          event: 'phone.check_result',
          phoneHash,
          verified: approved,
          mode: 'console',
          requestId,
        }),
      )
      return { ok: true, approved, mode: 'console' }
    }

    // audit-M2 + audit-S6: resolve pinId, treating absence or TTL-expiry as approved:false
    // (user-remediable state, NOT a transport failure). Controller's !check.approved branch
    // maps this to phone-verification-failed so the user just re-requests a new code.
    const entry = this.pinCache.get(phoneHash)
    if (!entry || Date.now() - entry.issuedAt > INFOBIP_PIN_TTL_MS) {
      if (entry) this.pinCache.delete(phoneHash)
      this.logger.log(
        JSON.stringify({
          event: 'phone.pin_cache_miss',
          phoneHash,
          reason: entry ? 'ttl-expired' : 'absent',
          requestId,
        }),
      )
      return {
        ok: true,
        approved: false,
        mode: 'live',
        details: { reason: 'pin-cache-miss' },
      }
    }

    this.logger.log(JSON.stringify({ event: 'phone.check_attempted', phoneHash, requestId }))

    // Source: https://github.com/infobip/infobip-api-java-client/blob/master/src/main/java/com/infobip/api/TfaApi.java · verified 2026-04-20 (POST /2fa/2/pin/{pinId}/verify)
    const url = `${this.baseUrl}/2fa/2/pin/${entry.pinId}/verify`
    // Source: https://github.com/infobip/infobip-api-java-client/blob/master/src/main/java/com/infobip/model/TfaVerifyPinRequest.java · verified 2026-04-20 (single field: pin)
    const body = JSON.stringify({ pin: code })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body,
        signal: AbortSignal.timeout(INFOBIP_TIMEOUT_MS),
      })

      const json = (await res.json().catch(() => ({}))) as {
        pinId?: string
        msisdn?: string
        verified?: boolean
        attemptsRemaining?: number
        pinError?: string
        requestError?: { serviceException?: { messageId?: string; text?: string } }
      }

      if (res.status >= 200 && res.status < 300) {
        // audit-M1: shape-validate the verified boolean.
        // Source: https://github.com/infobip/infobip-api-java-client/blob/master/src/main/java/com/infobip/model/TfaVerifyPinResponse.java · verified 2026-04-20
        if (typeof json.verified !== 'boolean') {
          this.logger.error(
            JSON.stringify({
              event: 'phone.check_unexpected_response',
              phoneHash,
              infobipStatus: res.status,
              bodyPreview: sanitiseInfobipText(JSON.stringify(json).slice(0, 200)),
              requestId,
            }),
          )
          return {
            ok: false,
            reason: 'phone-service-unavailable',
            details: { reason: 'invalid-response' },
          }
        }

        const attemptsRemaining = typeof json.attemptsRemaining === 'number' ? json.attemptsRemaining : null
        this.logger.log(
          JSON.stringify({
            event: 'phone.check_result',
            phoneHash,
            verified: json.verified,
            attemptsRemaining,
            pinError: json.pinError ?? null,
            mode: 'live',
            requestId,
          }),
        )

        if (json.verified) {
          // Single-use invariant: successful PIN → drop cache entry so it can't be replayed.
          this.pinCache.delete(phoneHash)
          return { ok: true, approved: true, mode: 'live' }
        }

        // audit-M3: verified=false with pinError set → user-remediable state, NOT outage.
        const reason = classifyPinError(json.pinError)
        // Drop cache on terminal pin states (expired/blocked) so user MUST re-request.
        if (reason === 'pin-expired' || reason === 'pin-blocked' || reason === 'pin-not-found') {
          this.pinCache.delete(phoneHash)
        }
        return {
          ok: true,
          approved: false,
          mode: 'live',
          details: { reason },
        }
      }

      // Non-2xx: transport/auth/unknown failure. Distinct from pin-state.
      const svcMessageId = json.requestError?.serviceException?.messageId ?? null
      const svcText = sanitiseInfobipText(json.requestError?.serviceException?.text)
      this.logger.error(
        JSON.stringify({
          event: 'phone.check_failed',
          phoneHash,
          infobipStatus: res.status,
          infobipCode: svcMessageId,
          infobipText: svcText,
          requestId,
        }),
      )
      return {
        ok: false,
        reason: 'phone-service-unavailable',
        details: { infobipStatus: res.status, infobipCode: svcMessageId },
      }
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          event: 'phone.check_failed',
          phoneHash,
          infobipStatus: null,
          infobipError: sanitiseError(err),
          requestId,
        }),
      )
      return {
        ok: false,
        reason: 'phone-service-unavailable',
        details: { reason: 'network' },
      }
    }
  }
}
