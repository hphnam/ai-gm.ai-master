import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@gm-ai/database'
import { DEMO_ORG_ID } from '../seed/seed-data'
import { assertAuthEnv } from './assert-auth-env'
import { generateOrgSlug, OrgSlugConflictError } from './generate-org-slug'

const env = assertAuthEnv()
const isProd = process.env.NODE_ENV === 'production'

const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL?.toLowerCase() ?? ''

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.secret,
  baseURL: env.baseURL,
  trustedOrigins: env.webOrigins,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 12,
    maxPasswordLength: 72,
  },
  session: {
    cookieCache: { enabled: false },
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    cookiePrefix: 'gm_ai',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isProd,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const email = (user.email ?? '').toLowerCase()

            // Demo user claims the pre-seeded Demo Organization on first sign-up.
            if (DEMO_USER_EMAIL && email === DEMO_USER_EMAIL) {
              const demoOrg = await prisma.organization.findUnique({
                where: { id: DEMO_ORG_ID },
                select: { id: true },
              })
              if (demoOrg) {
                await prisma.organizationMember.create({
                  data: {
                    userId: user.id,
                    organizationId: DEMO_ORG_ID,
                    role: 'owner',
                  },
                })
                return
              }
              // Demo org doesn't exist (e.g. fresh dev DB pre-seed) — fall through
              // to create a new org so the demo user is never stranded.
            }

            const base =
              (typeof user.name === 'string' && user.name.trim()) ||
              email.split('@')[0] ||
              'workspace'
            const slug = await generateOrgSlug(base)

            const org = await prisma.organization.create({
              data: {
                name:
                  typeof user.name === 'string' && user.name.trim()
                    ? `${user.name.trim()}'s workspace`
                    : `${base}'s workspace`,
                slug,
              },
              select: { id: true },
            })
            await prisma.organizationMember.create({
              data: {
                userId: user.id,
                organizationId: org.id,
                role: 'owner',
              },
            })
          } catch (err) {
            // audit-added M2: atomic rollback — delete the just-created User so
            // no zombie auth rows exist without an Organization/Membership.
            await prisma.user
              .delete({ where: { id: user.id } })
              .catch(() => undefined)
            if (err instanceof OrgSlugConflictError) throw err
            throw err
          }
        },
      },
    },
  },
})
