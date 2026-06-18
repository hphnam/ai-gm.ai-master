// Source: factored from apps/api/src/modules/phone/infobip-verify.service.ts (Plan 03-05 audit-M4/M5)
// on 2026-04-21 per Plan 04-01 audit-M2 — shared across phone module + new docs/extractors image path.
//
// Purpose: safely coerce an unknown error value (fetch errors, SDK errors, etc.) into a string
// suitable for log payloads. Prevents Authorization/x-api-key header leakage via the fetch-error
// serialization path (which is what String(err) / JSON.stringify(err) expose). Also redacts
// E.164-shaped phone patterns so server messages that echo the submitted phone verbatim don't
// bleed PII into persistent logs.
//
// Callers: InfobipVerifyService (phone SMS OTP), DocsExtractors/image-extractor (Claude vision).
// Future consumers: any fetch-based external integration that needs to log errors safely.

export function sanitiseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : 'unknown error'
  return msg.replace(/\+?\d{10,15}/g, '[PHONE]').slice(0, 200)
}
