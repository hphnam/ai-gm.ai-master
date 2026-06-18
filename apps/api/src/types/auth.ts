import { z } from 'zod'
import { UUID_RE } from './api'

export type Role = 'owner' | 'manager' | 'staff'

export const ROLES: readonly Role[] = ['owner', 'manager', 'staff'] as const

// 01-02 audit-added M4: owner is NOT invitable. Only manager/staff can be minted by invitation.
// Owners are self-minted at sign-up (01-01 databaseHooks) or promoted via separate flow.
export const InviteRole = z.enum(['manager', 'staff'])
export type InviteRoleType = z.infer<typeof InviteRole>

// 01-02 audit-added M5: explicit status enum — prevents silent drift between service + schema.
export const InvitationStatusSchema = z.enum(['pending', 'accepted', 'revoked', 'expired'])
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>

// 01-02 audit-added M7: per-org pending-invite cap (mirrors v0.1 MAX_RETAG_ATTEMPTS pattern)
export const MAX_PENDING_INVITATIONS_PER_ORG = 50

// 01-02 audit-added M1: Resend fetch timeout ceiling (5s); prevents indefinite hang on API downtime
export const MAIL_SEND_TIMEOUT_MS = 5000

export type AuthUser = {
  id: string
  email: string
  emailVerified: boolean
  name: string | null
  image: string | null
  phoneNumber: string | null
  createdAt: string
  updatedAt: string
}

export type AuthSession = {
  id: string
  userId: string
  token: string
  expiresAt: string
  activeOrganizationId: string | null
  ipAddress: string | null
  userAgent: string | null
}

export type AuthOrganization = {
  id: string
  name: string
  slug: string
}

export type AuthMembership = {
  organizationId: string
  role: Role
}

// audit-added S1+S2: password min 12, max 72 (bcrypt byte ceiling)
export const EmailSchema = z.string().email().max(254).trim().toLowerCase()
export const PasswordSchema = z
  .string()
  .min(12, 'password must be at least 12 characters')
  .max(72, 'password must be at most 72 characters (bcrypt truncation boundary)')
export const NameSchema = z.string().min(1).max(80).trim()
export const OrgNameSchema = z.string().min(1).max(80).trim()

// audit-added S4: kebab-case slug with no consecutive dashes
export const OrgSlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric or dash')
  .refine((s) => !s.includes('--'), 'slug may not contain consecutive dashes')
  .refine((s) => !s.startsWith('-') && !s.endsWith('-'), 'slug may not start or end with dash')

export const SignUpBodySchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: NameSchema,
})
export type SignUpBody = z.infer<typeof SignUpBodySchema>

export const SignInBodySchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
})
export type SignInBody = z.infer<typeof SignInBodySchema>

// --- 01-02 Invitations (audit-hardened) ---

export const InviteBodySchema = z.object({
  email: EmailSchema,
  role: InviteRole,
})
export type InviteBody = z.infer<typeof InviteBodySchema>

export const InvitationIdParamSchema = z.object({
  id: z.string().regex(UUID_RE, 'invalid uuid'),
})

// audit-added S1: paginated list contract. Schema allows up to 10000 to avoid
// DoS via huge values; service layer (invitations.service.ts) clamps to 100.
export const ListInvitationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListInvitationsQuery = z.infer<typeof ListInvitationsQuerySchema>

export type InvitationDTO = {
  id: string
  email: string
  organizationId: string
  organizationName: string
  role: InviteRoleType
  status: InvitationStatus
  inviterId: string
  inviterName: string | null
  expiresAt: string
  createdAt: string
}

// audit-added S8: reissued flag distinguishes new row from returned-existing-pending
export type CreateInvitationResponse = {
  invitation: InvitationDTO
  inviteUrl: string
  warning?: 'mail-send-failed'
  reissued?: boolean
}

export type ListInvitationsResponse = {
  invitations: InvitationDTO[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Unauth preview — only what the invitee needs to decide to accept.
// No inviter PII; email is masked.
export type InvitationPreview = {
  id: string
  email: string // masked: first 2 chars + *** + @domain
  organizationName: string
  role: InviteRoleType
  status: InvitationStatus
  expiresAt: string
}

export type AcceptInvitationResponse = {
  activeOrganization: { id: string; name: string; slug: string }
}

// --- 01-03 Phone linking (audit-hardened) ---

// ITU-T E.164: + then 7–14 digits after a non-zero country-code digit
export const E164_RE = /^\+[1-9]\d{7,14}$/

// audit-added M6: strip whitespace server-side before regex so users can paste
// "+44 7700 900 123" without a false-positive phone-invalid-format.
export const PhoneNumberSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s+/g, ''))
  .pipe(z.string().regex(E164_RE, 'phone-invalid-format'))

export const SendPhoneCodeBodySchema = z.object({
  phoneNumber: PhoneNumberSchema,
})
export type SendPhoneCodeBody = z.infer<typeof SendPhoneCodeBodySchema>

export const VerifyPhoneCodeBodySchema = z.object({
  phoneNumber: PhoneNumberSchema,
  code: z.string().regex(/^[A-Z0-9-]{6,12}$/, 'phone-invalid-code'),
})
export type VerifyPhoneCodeBody = z.infer<typeof VerifyPhoneCodeBodySchema>

export type SendPhoneCodeResponse = { ok: true; expiresInSeconds: number }
export type VerifyPhoneCodeResponse = {
  ok: true
  phoneNumber: string
  phoneVerifiedAt: string
}
export type PhoneStatusResponse = {
  phoneNumber: string | null
  phoneVerifiedAt: string | null
}

// Twilio Verify default code TTL
export const VERIFY_CODE_TTL_SECONDS = 600

// audit-added M1: pending-verification map TTL matches Twilio's 10-min code TTL
export const PENDING_VERIFICATION_TTL_MS = 10 * 60_000

// audit-added M10: add MAX_SENDS_PER_IP for per-IP defence-in-depth rate limit
export const PhoneRateLimit = {
  WINDOW_MS: 15 * 60_000,
  MAX_SENDS_PER_USER: 5,
  MAX_SENDS_PER_NUMBER: 3,
  MAX_SENDS_PER_IP: 20,
} as const

// audit-added S1: shared phone masker — used by controller response serializer AND UI
// status card. Keeps display logic single-source between backend and frontend.
export function maskPhone(phoneNumber: string): string {
  // Expect E.164 — "+44 7*** ***123" style: country code + space + masked middle + last 3
  if (phoneNumber.length < 6) return '***'
  const cc = phoneNumber.slice(0, 3) // "+44"
  const tail = phoneNumber.slice(-3)
  return `${cc} *** ***${tail}`
}
