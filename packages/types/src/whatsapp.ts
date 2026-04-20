import { z } from 'zod'

export const TwilioWebhookPayloadSchema = z
  .object({
    MessageSid: z.string().min(1).max(64),
    AccountSid: z.string().min(1).max(64),
    From: z.string().regex(/^whatsapp:\+[0-9]{6,20}$/),
    To: z.string().regex(/^whatsapp:\+[0-9]{6,20}$/),
    Body: z.string().max(8000).default(''),
    NumMedia: z
      .string()
      .regex(/^\d+$/)
      .default('0'),
    MediaContentType0: z.string().optional(),
    // 03-03: MediaUrl0 is the first media attachment URL (Twilio populates when NumMedia>=1).
    MediaUrl0: z.string().url().optional(),
    ProfileName: z.string().optional(),
    WaId: z.string().optional(),
  })
  .passthrough()

export type TwilioWebhookPayload = z.infer<typeof TwilioWebhookPayloadSchema>

export type WhatsAppOutboundResult =
  | { ok: true; mode: 'live' | 'console' | 'disabled'; sid?: string }
  | {
      ok: false
      reason:
        | 'whatsapp-driver-disabled'
        | 'whatsapp-service-unavailable'
        | 'whatsapp-invalid-to'
    }

export const ONBOARDING_COOLDOWN_MS = 60 * 60 * 1000
export const VERIFIED_SENDER_LIMIT_PER_HOUR = 30
export const VERIFIED_SENDER_WINDOW_MS = 60 * 60 * 1000
export const CHAT_TIMEOUT_MS = 12_000
export const SEEN_SID_TTL_MS = 24 * 60 * 60 * 1000
export const SEEN_SID_MAX_ENTRIES = 10_000

// 03-03 Task 1: typing indicator re-fire cadence + hard cap.
export const TYPING_REFIRE_MS = 20_000
export const TYPING_MAX_REFIRES = 6 // ~2min max so runaway timers can't live forever.

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
// Production-safe default allowlist for Twilio media hosts (api.twilio.com + S3 redirect target).
export const DEFAULT_TWILIO_MEDIA_HOST_ALLOWLIST = [
  'api.twilio.com',
  '*.s3.amazonaws.com',
  'media.twiliocdn.com',
]
