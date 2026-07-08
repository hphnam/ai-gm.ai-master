import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { customSession, phoneNumber } from 'better-auth/plugins'
import { prisma } from '../../database/prisma'
import { sendPasswordResetEmail } from '../email/auth-email'
import {
  consumeInviteForVerifiedPhone,
  hasPendingInviteForPhone,
  isPhoneTempEmail,
  PHONE_TEMP_EMAIL_DOMAIN,
} from '../phone/consume-phone-invite'
import { sendPhoneOtp, verifyPhoneOtp } from '../phone/phone-otp'
import { assertAuthEnv } from './assert-auth-env'
import { generateOrgSlug, OrgSlugConflictError } from './generate-org-slug'

const env = assertAuthEnv()

// Active-org context the customSession plugin attaches to every session.
// Shared with OrgContextMiddleware so both sides agree on the shape.
export type SessionOrgContext = {
  activeOrganization: { id: string; name: string; slug: string } | null
  membership: { role: string } | null
}

const webOrigin = env.webOrigins[0]

// Cookie scope is derived from the auth base URL (not NODE_ENV) so it works
// identically in prod and behind https dev tunnels (api.<domain> + web.<domain>).
const authIsHttps = env.baseURL.startsWith('https://')
const cookieParentDomain = (() => {
  const labels = new URL(env.baseURL).hostname.split('.')
  return authIsHttps && labels.length > 2 ? `.${labels.slice(-2).join('.')}` : undefined
})()

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.secret,
  baseURL: env.baseURL,
  trustedOrigins: env.webOrigins,
  rateLimit: {
    customRules: {
      '/phone-number/send-otp': { window: 300, max: 3 },
      // Belt-and-braces with the per-code DB attempt cap: throttles distributed
      // brute-force of the 5-digit PIN even before the cap kicks in.
      '/phone-number/verify': { window: 300, max: 10 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // The phone temp-email domain is reserved for plugin-created passwordless
      // users. Block email/password signups to it so an attacker can't squat a
      // known invitee's future temp email.
      if (ctx.path === '/sign-up/email' && isPhoneTempEmail(ctx.body?.email)) {
        throw new APIError('BAD_REQUEST', { message: 'This email domain is not allowed.' })
      }
      // Phone OTP only sends/creates an account when there's a pending invite. A
      // phone with no account and no invite is rejected on both send-otp and
      // verify, so we never text a code to (or mint an org-less orphan from) a
      // random number. Existing users (re-login) pass through.
      const phone =
        ctx.path === '/phone-number/verify' || ctx.path === '/phone-number/send-otp'
          ? ctx.body?.phoneNumber
          : undefined
      if (typeof phone === 'string' && phone) {
        const existing = await prisma.user.findUnique({
          where: { phoneNumber: phone },
          select: { id: true },
        })
        if (!existing && !(await hasPendingInviteForPhone(phone))) {
          throw new APIError('FORBIDDEN', { message: 'You need an invite to sign in.' })
        }
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 12,
    maxPasswordLength: 72,
    sendResetPassword: async ({ user, token }) => {
      await sendPasswordResetEmail(user.email, `${webOrigin}/auth/reset-password?token=${token}`)
    },
  },
  session: {
    cookieCache: { enabled: false },
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    cookiePrefix: 'gm_ai',
    // Widen to the parent domain so a cookie set by api.<domain> is sent from
    // web.<domain>; sameSite:'none'+secure are required for cross-site https.
    crossSubDomainCookies: cookieParentDomain
      ? { enabled: true, domain: cookieParentDomain }
      : { enabled: false },
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: authIsHttps ? 'none' : 'lax',
      path: '/',
      secure: authIsHttps,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Phone-invited staff join an existing org via the invite callback —
          // they must not get a personal owner workspace.
          if (isPhoneTempEmail(user.email)) return
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
  plugins: [
    // Active-org membership + role, resolved once and carried IN the session —
    // so server guards (via auth.api.getSession) and the web client
    // (useSession) both read role with no extra request. Same resolution the
    // app used before: prefer session.activeOrganizationId, else oldest
    // membership. Returned fields spread over the base { user, session }.
    customSession(async ({ user, session }) => {
      const activeOrgId =
        (session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null
      const membership = await prisma.organizationMember.findFirst({
        where: activeOrgId ? { userId: user.id, organizationId: activeOrgId } : { userId: user.id },
        orderBy: activeOrgId ? undefined : { createdAt: 'asc' },
        select: {
          role: true,
          organization: { select: { id: true, name: true, slug: true } },
        },
      })
      const orgContext: SessionOrgContext = {
        activeOrganization: membership?.organization ?? null,
        membership: membership ? { role: membership.role } : null,
      }
      return { user, session, ...orgContext }
    }),
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone }) => {
        const { ok, rateLimited } = await sendPhoneOtp(phone)
        if (rateLimited) {
          throw new APIError('TOO_MANY_REQUESTS', {
            message: 'Too many codes sent to this number. Try again shortly.',
          })
        }
        if (!ok) throw new APIError('SERVICE_UNAVAILABLE', { message: 'Could not send the code.' })
      },
      verifyOTP: async ({ phoneNumber: phone, code }) => verifyPhoneOtp(phone, code),
      requireVerification: true,
      signUpOnVerification: {
        getTempEmail: (phone) => `ph+${phone.replace(/\D/g, '')}@${PHONE_TEMP_EMAIL_DOMAIN}`,
        getTempName: (phone) => phone,
      },
      callbackOnVerification: async ({ user, phoneNumber: phone }) => {
        await consumeInviteForVerifiedPhone(user.id, phone)
      },
    }),
  ],
})
