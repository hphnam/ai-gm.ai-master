import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '../../database/prisma'
import { assertAuthEnv } from './assert-auth-env'
import { generateOrgSlug, OrgSlugConflictError } from './generate-org-slug'

const env = assertAuthEnv()
const isProd = process.env.NODE_ENV === 'production'

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
    // In prod web (ai-gm.ai) and api (api.ai-gm.ai) live on different
    // subdomains. Without crossSubDomainCookies the auth cookie set by
    // the API would be scoped to api.ai-gm.ai only and never sent on
    // requests originating from ai-gm.ai → fetches fail auth, sign-in
    // bounces back to /sign-in. Widening to the parent domain fixes it.
    // Pair with sameSite:'none'+secure:true (required for cross-site
    // cookies in modern browsers).
    crossSubDomainCookies: isProd ? { enabled: true, domain: '.ai-gm.ai' } : { enabled: false },
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
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
                onboardingStartedAt: new Date(),
              },
            })
          } catch (err) {
            // audit-added M2: atomic rollback — delete the just-created User so
            // no zombie auth rows exist without an Organization/Membership.
            await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined)
            if (err instanceof OrgSlugConflictError) throw err
            throw err
          }
        },
      },
    },
  },
})
