import { z } from 'zod'

// Web-side auth form schemas. Auth is handled server-side by better-auth's
// passthrough — it doesn't expose a NestJS controller for sign-in/up — so
// these aren't part of the OpenAPI surface that orval generates from. The
// constraints here mirror the better-auth backend config and our previous
// shared @gm-ai/types schemas.
export const EmailSchema = z.string().email().max(254).trim().toLowerCase()

export const PasswordSchema = z
  .string()
  .min(12, 'password must be at least 12 characters')
  .max(72, 'password must be at most 72 characters (bcrypt truncation boundary)')

export const NameSchema = z.string().min(1).max(80).trim()
