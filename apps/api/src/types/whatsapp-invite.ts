// Phase 03-01 — WhatsApp Conversational UX
// Identity binding + onboarding flow types.
// Schemas surface as zod for boundary validation; constants are operator-tunable
// values exported single-source so the same threshold can't drift between
// service / controller / probe / UI.

import { z } from 'zod'

// ─── Operator-tunable constants ────────────────────────────────────────

export const WHATSAPP_INVITE_CODE_LENGTH = 8
export const WHATSAPP_INVITE_TTL_MS = 24 * 60 * 60 * 1000 // 24h
export const WHATSAPP_OTP_LENGTH = 6
export const WHATSAPP_OTP_TTL_MS = 10 * 60 * 1000 // 10min
export const WHATSAPP_OTP_MAX_ATTEMPTS = 3
export const WHATSAPP_OTP_RATE_LIMIT_PER_HOUR = 3
// audit-added M5: per-manager invite-spam ceiling — 50 invites per 24h.
export const MAX_INVITES_PER_MANAGER_PER_DAY = 50
// audit-added S3: re-issuance debounce — within 30s of issuing, do not send another OTP.
export const WHATSAPP_OTP_REISSUE_DEBOUNCE_MS = 30 * 1000
// audit-added S8: in-memory rate-limit map TTL sweep cadence.
export const WHATSAPP_OTP_RATE_LIMIT_SWEEP_MS = 60 * 1000

// Crockford base32 alphabet (no I, L, O, U, 0, 1) — collision-resistant + human-readable.
export const WHATSAPP_INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
export const WHATSAPP_INVITE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{8}$/i
export const WHATSAPP_OTP_REGEX = /^\d{6}$/
export const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/

// ─── Schemas ────────────────────────────────────────────────────────────

export const InviteWhatsappRoleSchema = z.enum(['staff', 'manager'])
export type InviteWhatsappRole = z.infer<typeof InviteWhatsappRoleSchema>

export const InviteStatusSchema = z.enum(['pending', 'redeemed', 'revoked', 'exhausted', 'expired'])
export type InviteStatus = z.infer<typeof InviteStatusSchema>

export const CreateInviteInputSchema = z.object({
  phoneNumber: z.string().regex(E164_PHONE_REGEX, 'phoneNumber must be E.164'),
  role: InviteWhatsappRoleSchema,
  note: z.string().max(120).optional(),
  targetUserId: z.string().uuid().optional(),
})
export type CreateInviteInput = z.infer<typeof CreateInviteInputSchema>

export const InvitePublicSchema = z.object({
  id: z.string().uuid(),
  phoneNumberMasked: z.string(),
  role: InviteWhatsappRoleSchema,
  note: z.string().nullable(),
  expiresAt: z.string().datetime(),
  status: InviteStatusSchema,
  createdAt: z.string().datetime(),
})
export type InvitePublic = z.infer<typeof InvitePublicSchema>

export const CreateInviteResponseSchema = z.object({
  invite: InvitePublicSchema.extend({
    code: z.string().regex(WHATSAPP_INVITE_CODE_REGEX),
  }),
  oneTimeDisplay: z.literal(true),
})
export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>

export const ListInvitesResponseSchema = z.object({
  invites: z.array(InvitePublicSchema),
})
export type ListInvitesResponse = z.infer<typeof ListInvitesResponseSchema>

// ─── Error codes ────────────────────────────────────────────────────────

// audit-added M5: distinct error codes for cross-org-phone + manager rate-limit.
// Surfaced via ApiErrorResponse `error` field; UI maps via map-api-error.ts.
export const WHATSAPP_INVITE_ERROR_CODES = {
  PHONE_LINKED_OTHER_ORG: 'phone_linked_other_org',
  MANAGER_INVITE_RATE_LIMIT: 'manager_invite_rate_limit',
  INVITE_NOT_FOUND: 'invite_not_found',
} as const
