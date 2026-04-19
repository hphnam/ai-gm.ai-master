import { z } from 'zod'

export type Role = 'owner' | 'manager' | 'staff'

export const ROLES: readonly Role[] = ['owner', 'manager', 'staff'] as const

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
