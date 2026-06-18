import { z } from 'zod'

// 03-06 Twilio Conversations API contract.
// Webhook delivery: POST /webhooks/twilio/conversations
// Content-Type: application/x-www-form-urlencoded
// Twilio fires one event per request; signature is HMAC-SHA1(URL + sorted form params).

// Outbound result contract — provider-agnostic.
export type WhatsAppOutboundResult =
  | { ok: true; mode: 'live' | 'console' | 'disabled'; messageId?: string }
  | {
      ok: false
      reason: 'whatsapp-driver-disabled' | 'whatsapp-service-unavailable' | 'whatsapp-invalid-to'
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

// 03-06 provider-neutral media host allowlist — Twilio media CDN.
// Production-safe default; override via WHATSAPP_MEDIA_HOST_ALLOWLIST env.
// Twilio Conversations media is served from mcs.<region>.twilio.com (us1, ie1,
// au1, sg1, br1, jp1). `*.twilio.com` covers the entire surface; we used to
// also list *.media.twiliocdn.com but that's the SDK CDN, not the media path,
// and including it widened SSRF risk without functional benefit.
export const DEFAULT_WHATSAPP_MEDIA_HOST_ALLOWLIST = ['*.twilio.com']

// 03-06 Twilio Conversations webhook — fired on every Conversation event
// (onMessageAdded, onConversationAdded, onParticipantAdded, deliveryReceipts).
// We only act on onMessageAdded; others 200-ack and drop.
//
// Body is application/x-www-form-urlencoded; NestJS surfaces it as a flat
// Record after urlencoded parser middleware. Keys are case-sensitive PascalCase.
//
// Media: when NumMedia > 0, MediaUrl0/MediaContentType0, MediaUrl1/MediaContentType1, …
//   The URLs require Basic-auth (account SID + auth token) to fetch.
const NumericString = z
  .string()
  .regex(/^[0-9]+$/)
  .transform((s) => Number.parseInt(s, 10))

export const TwilioConversationsEventSchema = z
  .object({
    EventType: z.string().min(1).max(64),
    ConversationSid: z.string().regex(/^CH[0-9a-fA-F]{32}$/),
    MessageSid: z
      .string()
      .regex(/^IM[0-9a-fA-F]{32}$/)
      .optional(),
    // Author is whatsapp:+E164 for inbound from the participant, "system" for our own sends.
    Author: z.string().min(1).max(128).optional(),
    Body: z.string().max(8000).optional(),
    Source: z.string().optional(),
    ParticipantSid: z.string().optional(),
    NumMedia: NumericString.optional(),
    DateCreated: z.string().optional(),
  })
  .passthrough()

export type TwilioConversationsEvent = z.infer<typeof TwilioConversationsEventSchema>

// Normalized inbound message that the existing whatsapp.service handler consumes.
// Shape mirrors the previous InfobipInboundResult so the service body needs minimal change.
export type WhatsappInboundResult = {
  messageId: string
  conversationSid: string
  // E.164 with leading "+" (normalized from Twilio's "whatsapp:+…" Author).
  from: string
  message: {
    type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'UNSUPPORTED'
    text?: string
    url?: string
    mediaContentType?: string
  }
}
