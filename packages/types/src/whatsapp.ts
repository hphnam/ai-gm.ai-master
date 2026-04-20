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
