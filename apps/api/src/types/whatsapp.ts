import { z } from 'zod'

// 03-04 Infobip migration (2026-04-20). Replaces 03-01/02/03 Twilio contract.
// Source: Infobip WhatsApp API community patterns + https://www.infobip.com/docs/whatsapp
// UAT-VERIFY: signature header name + encoding + exact field presence confirmed at APPLY-time UAT.
// The plan's <output> section enumerates the 12-step Portal UAT runbook used to validate these assumptions.

// Infobip inbound webhook payload — `results[]` array pattern used across Infobip channels.
// Expected delivery: POST /webhooks/infobip/whatsapp with Content-Type: application/json
// and a single result per inbound (batching empirically rare on WhatsApp channel but schema
// tolerates multiple via InfobipInboundWebhookSchema.results array).
const InfobipInboundMessageSchema = z
  .object({
    // Message type enum — Infobip WhatsApp documented types.
    // UAT-VERIFY: expand/tighten after first inbound sample if enum values differ.
    type: z.enum([
      'TEXT',
      'IMAGE',
      'AUDIO',
      'VIDEO',
      'DOCUMENT',
      'LOCATION',
      'STICKER',
      'CONTACT',
      'UNSUPPORTED',
    ]),
    text: z.string().max(8000).optional(),
    caption: z.string().max(8000).optional(),
    // Present when type is IMAGE / AUDIO / VIDEO / DOCUMENT / STICKER — authenticated media URL.
    url: z.string().url().optional(),
  })
  .passthrough()

const InfobipInboundResultSchema = z
  .object({
    messageId: z.string().min(1).max(128),
    // Bare E.164 — Infobip delivers digits only (no `whatsapp:` or `+` prefix).
    from: z.string().regex(/^[0-9]{6,20}$/),
    to: z.string().regex(/^[0-9]{6,20}$/),
    receivedAt: z.string().min(1),
    integrationType: z.string().optional(),
    // Contact block — `name` is low-entropy PII; see whatsapp.service.ts audit M5 (contact name
    // NEVER logged). Schema tolerates presence but service-layer drops it from all log lines.
    contact: z
      .object({ name: z.string().optional() })
      .passthrough()
      .optional(),
    message: InfobipInboundMessageSchema,
  })
  .passthrough()

export const InfobipInboundWebhookSchema = z
  .object({
    results: z.array(InfobipInboundResultSchema).min(1),
    messageCount: z.number().int().nonnegative().optional(),
    pendingMessageCount: z.number().int().nonnegative().optional(),
  })
  .passthrough()

export type InfobipInboundWebhook = z.infer<typeof InfobipInboundWebhookSchema>
export type InfobipInboundResult = z.infer<typeof InfobipInboundResultSchema>
export type InfobipInboundMessage = z.infer<typeof InfobipInboundMessageSchema>

// Outbound result contract — shape unchanged from Twilio era so whatsapp.service.ts
// consumer paths don't need updates beyond constructor/config swaps.
export type WhatsAppOutboundResult =
  | { ok: true; mode: 'live' | 'console' | 'disabled'; messageId?: string }
  | {
      ok: false
      reason:
        | 'whatsapp-driver-disabled'
        | 'whatsapp-service-unavailable'
        | 'whatsapp-invalid-to'
    }

// --- Operational constants (unchanged from 03-03 unless noted) ---

export const ONBOARDING_COOLDOWN_MS = 60 * 60 * 1000
export const VERIFIED_SENDER_LIMIT_PER_HOUR = 30
export const VERIFIED_SENDER_WINDOW_MS = 60 * 60 * 1000
export const CHAT_TIMEOUT_MS = 12_000
export const SEEN_SID_TTL_MS = 24 * 60 * 60 * 1000
export const SEEN_SID_MAX_ENTRIES = 10_000

// 03-03 Task 1: typing indicator re-fire cadence + hard cap.
export const TYPING_REFIRE_MS = 20_000
export const TYPING_MAX_REFIRES = 6

// 03-03 Task 2: proactive opener 24h session window.
export const PROACTIVE_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000

// 03-03 Task 3: image media download limits + SSRF allowlist + MIME allowlist.
export const MAX_IMAGE_DOWNLOAD_BYTES = 5 * 1024 * 1024
export const MEDIA_DOWNLOAD_TIMEOUT_MS = 5_000
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number]

// 03-04 audit-added S4 (G11): batch-processing soft deadline.
// Controller for-loop checks this BEFORE each handleInbound call so a slow batch doesn't
// starve Infobip's webhook retry window. Any result skipped at the deadline logs at debug
// with its messageId; the controller still returns 200 (partial-success > full-retry).
export const BATCH_DEADLINE_MS = 12_000

// 03-04 provider-neutral media host allowlist (renamed from DEFAULT_TWILIO_MEDIA_HOST_ALLOWLIST).
// Production-safe default; override via WHATSAPP_MEDIA_HOST_ALLOWLIST env.
// UAT-VERIFY: confirm Infobip's actual media CDN hostnames during first-image UAT and tighten.
export const DEFAULT_WHATSAPP_MEDIA_HOST_ALLOWLIST = ['*.infobip.com']
