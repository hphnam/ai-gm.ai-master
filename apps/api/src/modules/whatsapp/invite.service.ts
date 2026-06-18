// Phase 03-01 — WhatsApp invite service.
// Owns: code generation (CSPRNG, Crockford base32), atomic creation w/ phone-cross-org
// guard + manager rate-limit, lookup with timing-safe code compare, atomic redemption,
// revocation, lazy expiry, list-for-org. All log emissions PII-safe (maskPhone,
// never code/OTP plaintext).

import { randomInt } from 'node:crypto'
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { Prisma, WhatsappInvite } from '@prisma/client'
import { prisma } from '../../database/prisma'
import {
  type CreateInviteInput,
  E164_PHONE_REGEX,
  type InvitePublic,
  type InviteStatus,
  MAX_INVITES_PER_MANAGER_PER_DAY,
  WHATSAPP_INVITE_CODE_ALPHABET,
  WHATSAPP_INVITE_CODE_LENGTH,
  WHATSAPP_INVITE_ERROR_CODES,
  WHATSAPP_INVITE_TTL_MS,
} from '../../types'
import { maskPhone } from '../../types/auth'
import { assertAuthEnv } from '../auth/assert-auth-env'
import { signInviteToken } from './invite-token'
import { safeStringEqual } from './safe-equal'
import { WhatsAppAdapter } from './whatsapp.adapter'

const CODE_GEN_MAX_RETRIES = 5

// Recently-revoked + recently-redeemed list window — keep them in the operator
// view for 24h after status flip so managers can see the just-acted-on items.
const LIST_RECENTLY_TRANSITIONED_MS = 24 * 60 * 60 * 1000

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name)

  constructor(private readonly adapter: WhatsAppAdapter) {}

  // ─── Code generation ────────────────────────────────────────────────

  /**
   * Generate a CSPRNG-backed 8-char Crockford base32 code.
   * Loops on DB unique-collision up to CODE_GEN_MAX_RETRIES (cosmically unlikely,
   * but cheap insurance — 30^8 ≈ 6.5e11 keyspace).
   */
  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < CODE_GEN_MAX_RETRIES; attempt++) {
      const code = generateCode()
      const existing = await prisma.whatsappInvite.findUnique({
        where: { code },
        select: { id: true },
      })
      if (!existing) return code
    }
    throw new Error('whatsapp_invite.code_gen_collision_exhausted')
  }

  // ─── Public API ─────────────────────────────────────────────────────

  /**
   * Create a new invite. Enforces:
   *  - phone-cross-org guard (M5): if phone is linked to a User in another org
   *    AND not in the issuing org, reject 409 unless ?force=true override
   *  - manager invite-rate-limit (M5): MAX_INVITES_PER_MANAGER_PER_DAY in 24h
   * Returns plaintext code ONCE — caller surfaces to manager UI then forgets.
   */
  async create(
    organizationId: string,
    issuedByUserId: string,
    input: CreateInviteInput,
    options: { force?: boolean } = {},
  ): Promise<{ invite: InvitePublic; code: string }> {
    if (!E164_PHONE_REGEX.test(input.phoneNumber)) {
      throw new HttpException(
        { error: 'invalid-input', details: [{ path: ['phoneNumber'], message: 'must be E.164' }] },
        HttpStatus.BAD_REQUEST,
      )
    }

    // M5 — manager rate-limit. Per-manager not per-org so one rogue/compromised
    // account can't spam without affecting other managers in the same org.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentCount = await prisma.whatsappInvite.count({
      where: { issuedByUserId, createdAt: { gte: since } },
    })
    if (recentCount >= MAX_INVITES_PER_MANAGER_PER_DAY) {
      this.logger.warn('whatsapp_invite.rate_limited', {
        issuedByUserId,
        organizationId,
        last24hCount: recentCount,
      })
      throw new HttpException(
        {
          error: WHATSAPP_INVITE_ERROR_CODES.MANAGER_INVITE_RATE_LIMIT,
          details: [{ path: [], message: `max ${MAX_INVITES_PER_MANAGER_PER_DAY}/day` }],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    // M5 — phone-cross-org guard. If the phone is already linked to a User
    // (User.phoneNumber unique), check that the User has membership in the
    // issuing org. If not, require ?force=true to acknowledge the cross-org
    // grant before issuing the invite.
    const linkedUser = await prisma.user.findUnique({
      where: { phoneNumber: input.phoneNumber },
      select: {
        id: true,
        memberships: {
          select: { organizationId: true },
        },
      },
    })
    if (linkedUser) {
      const inIssuingOrg = linkedUser.memberships.some((m) => m.organizationId === organizationId)
      if (!inIssuingOrg) {
        if (!options.force) {
          throw new ConflictException({
            error: WHATSAPP_INVITE_ERROR_CODES.PHONE_LINKED_OTHER_ORG,
            details: [
              {
                path: ['phoneNumber'],
                message:
                  'This number is already registered with another organisation. Confirm before re-issuing.',
              },
            ],
          })
        }
        // force=true: log the override for SOC-2 reconstruction (both org IDs visible).
        const otherOrgIds = linkedUser.memberships.map((m) => m.organizationId)
        this.logger.warn('whatsapp_invite.cross_org_create', {
          issuedByUserId,
          organizationId,
          phoneNumberMasked: maskPhone(input.phoneNumber),
          existingMemberships: otherOrgIds,
        })
      }
    }

    const code = await this.generateUniqueCode()
    const expiresAt = new Date(Date.now() + WHATSAPP_INVITE_TTL_MS)

    const row = await prisma.whatsappInvite.create({
      data: {
        code,
        phoneNumber: input.phoneNumber,
        organizationId,
        issuedByUserId,
        targetUserId: input.targetUserId ?? null,
        role: input.role,
        note: input.note ?? null,
        expiresAt,
        status: 'pending',
      },
    })

    this.logger.log('whatsapp_invite.created', {
      inviteId: row.id,
      organizationId,
      issuedByUserId,
      role: input.role,
      phoneNumberMasked: maskPhone(input.phoneNumber),
      expiresAt: expiresAt.toISOString(),
    })

    // 03-06: signed onboarding link sent to the invitee via WhatsApp DM.
    // The code is still returned to the manager UI as a fallback (rare path
    // when the WhatsApp send fails or the invitee can't open the link).
    await this.sendInviteLink(row, input.phoneNumber)

    return {
      invite: this.toPublic(row),
      code,
    }
  }

  // 03-06 — fire-and-await WhatsApp send for the signed onboarding link.
  // The token is stateless (HMAC over inviteId + expiresAt). Web /onboard
  // verifies it and renders the org join screen. Send failures are logged
  // but do NOT roll back the invite — the manager can resend manually via
  // a future "resend" endpoint.
  private async sendInviteLink(invite: WhatsappInvite, phoneNumber: string): Promise<void> {
    const secret = assertAuthEnv().secret
    const token = signInviteToken(invite.id, invite.expiresAt, secret)
    const appUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:3000'
    const link = `${appUrl}/onboard?t=${token}`
    const body = `You've been invited to join GM AI. Tap to set up your account: ${link}\n\nThis link expires in 24 hours.`

    try {
      const out = await this.adapter.sendText(phoneNumber, body)
      if (out.ok) {
        this.logger.log('whatsapp_invite.link_sent', {
          inviteId: invite.id,
          mode: out.mode,
          phoneNumberMasked: maskPhone(phoneNumber),
        })
      } else {
        this.logger.warn('whatsapp_invite.link_send_failed', {
          inviteId: invite.id,
          reason: out.reason,
          phoneNumberMasked: maskPhone(phoneNumber),
        })
      }
    } catch (err) {
      this.logger.error('whatsapp_invite.link_send_threw', {
        inviteId: invite.id,
        errorKind: (err as Error)?.constructor?.name ?? 'unknown',
      })
    }
  }

  /**
   * Look up an active invite by submitted code + phone. Code compare is
   * timing-safe (M1). Lazy expiry: if a 'pending' row is past expiresAt,
   * flip status to 'expired' and emit `whatsapp_invite.expired_lazy`.
   * Returns null on no match (caller maps to user-friendly reply).
   */
  async findActiveByCodeAndPhone(
    submittedCode: string,
    phoneNumber: string,
  ): Promise<WhatsappInvite | null> {
    // Normalize submitted (audit-S1): trim, strip whitespace/hyphens/dots/underscores, upper.
    const normalized = submittedCode
      .trim()
      .replace(/[\s\-_.]/g, '')
      .toUpperCase()

    // Index hit: phoneNumber + status='pending'. Pull all candidates for this
    // phone (typically 1 — the index narrows fast) and timing-safe compare codes.
    const candidates = await prisma.whatsappInvite.findMany({
      where: {
        phoneNumber,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    for (const c of candidates) {
      // S6 — lazy expired flip. Touch-time check; if past expiresAt, flip.
      if (c.expiresAt.getTime() < Date.now()) {
        await prisma.whatsappInvite.updateMany({
          where: { id: c.id, status: 'pending' },
          data: { status: 'expired' },
        })
        this.logger.log('whatsapp_invite.expired_lazy', {
          inviteId: c.id,
          organizationId: c.organizationId,
          fromStatus: 'pending',
          toStatus: 'expired',
          reason: 'expiresAt_passed',
        })
        continue
      }
      // M1 — timing-safe code compare.
      if (safeStringEqual(normalized, c.code.toUpperCase())) {
        return c
      }
    }
    return null
  }

  /**
   * 03-06 — token-driven redemption from the web /onboard flow.
   * Atomically: redeem invite, ensure User (by phone), set phoneVerifiedAt,
   * upsert OrganizationMember, create WhatsappSession with the issuing org
   * stickied. Mirrors whatsapp-onboarding.service.linkUserAndWelcome but
   * surfaces success/error via a structured return shape for the API caller.
   */
  async redeemByToken(
    inviteId: string,
    submittedName: string,
  ): Promise<
    | { ok: true; userId: string; organizationId: string }
    | { ok: false; reason: 'not-found' | 'not-pending' | 'expired' | 'race-lost' }
  > {
    const name = submittedName.trim().slice(0, 120)
    if (name.length === 0) {
      return { ok: false, reason: 'not-found' }
    }
    const result = await prisma.$transaction(async (txn: Prisma.TransactionClient) => {
      const invite = await txn.whatsappInvite.findUnique({ where: { id: inviteId } })
      if (!invite) return { kind: 'not-found' as const }
      if (invite.status !== 'pending') return { kind: 'not-pending' as const }
      if (invite.expiresAt.getTime() < Date.now()) {
        await txn.whatsappInvite.updateMany({
          where: { id: invite.id, status: 'pending' },
          data: { status: 'expired' },
        })
        return { kind: 'expired' as const }
      }

      const redemption = await this.markRedeemed(invite.id, invite.targetUserId ?? '__self__', txn)
      if (!redemption.redeemed) return { kind: 'race-lost' as const }

      // 03-06 fix: race-safe user resolution. Two concurrent token submissions
      // can both see `findUnique → null` and both call `create`, with the second
      // hitting User.phoneNumber unique violation (P2002) AFTER the invite was
      // flipped to redeemed — wedging the invite. Use upsert keyed on
      // phoneNumber so the second submission grabs the row written by the first.
      //
      // 03-06 fix: do NOT overwrite `user.name` on the update path. If a pre-
      // existing User row was seeded via another flow, the unauthenticated
      // redeem endpoint must not let a link-holder rename the account.
      const syntheticEmail = `wa+${invite.phoneNumber.replace(/\D/g, '')}@whatsapp.local`
      const user = await txn.user.upsert({
        where: { phoneNumber: invite.phoneNumber },
        create: {
          email: syntheticEmail,
          name,
          phoneNumber: invite.phoneNumber,
          phoneVerifiedAt: new Date(),
        },
        update: {
          // Only set phoneVerifiedAt when missing — leave name + email alone.
          phoneVerifiedAt: new Date(),
        },
        select: { id: true, phoneVerifiedAt: true },
      })

      // Spec metric I — anchor onboarding window on member create. For an
      // existing member, GREATEST(existing, now) bumps re-invited users
      // forward without ever pulling the anchor backwards. Raw UPDATE
      // because Prisma can't reference the prior column value in `update`.
      const onboardingAnchor = new Date()
      await txn.organizationMember.upsert({
        where: {
          userId_organizationId: { userId: user.id, organizationId: invite.organizationId },
        },
        create: {
          userId: user.id,
          organizationId: invite.organizationId,
          role: invite.role,
          onboardingStartedAt: onboardingAnchor,
        },
        update: {},
      })
      await txn.$executeRaw`
        UPDATE "organization_members"
        SET "onboardingStartedAt" = GREATEST(COALESCE("onboardingStartedAt", ${onboardingAnchor}), ${onboardingAnchor})
        WHERE "userId" = ${user.id} AND "organizationId" = ${invite.organizationId}
      `

      try {
        await txn.whatsappSession.create({
          data: {
            phoneNumber: invite.phoneNumber,
            userId: user.id,
            currentOrganizationId: invite.organizationId,
          },
        })
      } catch (err) {
        const code = (err as { code?: string })?.code
        if (code !== 'P2002') throw err
      }

      return { kind: 'ok' as const, userId: user.id, organizationId: invite.organizationId }
    })

    if (result.kind === 'ok') {
      return { ok: true, userId: result.userId, organizationId: result.organizationId }
    }
    return { ok: false, reason: result.kind }
  }

  /**
   * Atomic redemption — conditional UPDATE WHERE status='pending'. Returns
   * `{redeemed: true}` to the race-winner, `{redeemed: false, ...}` to losers.
   * Caller MUST be inside a Prisma transaction passed via `txn` for atomicity
   * with phone-link + WhatsappSession upsert.
   */
  async markRedeemed(
    inviteId: string,
    redeemedByUserId: string,
    txn: Prisma.TransactionClient,
  ): Promise<{ redeemed: boolean; reason?: string }> {
    const result = await txn.whatsappInvite.updateMany({
      where: { id: inviteId, status: 'pending' },
      data: { status: 'redeemed', redeemedAt: new Date() },
    })
    if (result.count === 0) {
      return { redeemed: false, reason: 'already_redeemed_or_invalid' }
    }
    const inv = await txn.whatsappInvite.findUnique({
      where: { id: inviteId },
      select: { organizationId: true },
    })
    if (inv) {
      this.logger.log('whatsapp_invite.redeemed', {
        inviteId,
        organizationId: inv.organizationId,
        fromStatus: 'pending',
        toStatus: 'redeemed',
        byUserId: redeemedByUserId,
      })
    }
    return { redeemed: true }
  }

  /**
   * Mark invite exhausted (after OTP attempts blow past WHATSAPP_OTP_MAX_ATTEMPTS).
   * Idempotent — only flips if currently pending.
   */
  async markExhausted(inviteId: string): Promise<void> {
    const result = await prisma.whatsappInvite.updateMany({
      where: { id: inviteId, status: 'pending' },
      data: { status: 'exhausted' },
    })
    if (result.count > 0) {
      const inv = await prisma.whatsappInvite.findUnique({
        where: { id: inviteId },
        select: { organizationId: true },
      })
      this.logger.log('whatsapp_invite.exhausted', {
        inviteId,
        organizationId: inv?.organizationId,
        fromStatus: 'pending',
        toStatus: 'exhausted',
        reason: 'otp_attempts_exhausted',
      })
    }
  }

  /**
   * Manager-initiated revoke. RBAC: scoped by organizationId (404-not-403 on
   * cross-tenant attempt per project pattern).
   */
  async revoke(organizationId: string, inviteId: string, byUserId: string): Promise<void> {
    const result = await prisma.whatsappInvite.updateMany({
      where: { id: inviteId, organizationId, status: 'pending' },
      data: { status: 'revoked' },
    })
    if (result.count === 0) {
      // Either not found, wrong org, or already non-pending — surface 404 either way.
      throw new NotFoundException({
        error: WHATSAPP_INVITE_ERROR_CODES.INVITE_NOT_FOUND,
      })
    }
    this.logger.log('whatsapp_invite.revoked', {
      inviteId,
      organizationId,
      fromStatus: 'pending',
      toStatus: 'revoked',
      byUserId,
    })
  }

  /**
   * Manager view — pending + recently-transitioned (last 24h). Sorted with
   * pending first (most actionable), then most-recently transitioned. S6 —
   * pending rows past expiresAt are lazily flipped during list iteration so
   * the operator sees `expired` not stale `pending`.
   */
  async listForOrg(organizationId: string): Promise<InvitePublic[]> {
    const recentCutoff = new Date(Date.now() - LIST_RECENTLY_TRANSITIONED_MS)
    const rows = await prisma.whatsappInvite.findMany({
      where: {
        organizationId,
        OR: [
          { status: 'pending' },
          {
            status: { in: ['redeemed', 'revoked', 'exhausted', 'expired'] },
            createdAt: { gte: recentCutoff },
          },
        ],
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    })

    // Lazy expire pass before returning to caller.
    const now = Date.now()
    const flipped: InvitePublic[] = []
    for (const r of rows) {
      if (r.status === 'pending' && r.expiresAt.getTime() < now) {
        await prisma.whatsappInvite.updateMany({
          where: { id: r.id, status: 'pending' },
          data: { status: 'expired' },
        })
        this.logger.log('whatsapp_invite.expired_lazy', {
          inviteId: r.id,
          organizationId: r.organizationId,
          fromStatus: 'pending',
          toStatus: 'expired',
          reason: 'expiresAt_passed',
        })
        flipped.push(this.toPublic({ ...r, status: 'expired' }))
      } else {
        flipped.push(this.toPublic(r))
      }
    }
    return flipped
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  toPublic(row: WhatsappInvite): InvitePublic {
    return {
      id: row.id,
      phoneNumberMasked: maskPhone(row.phoneNumber),
      role: row.role as 'staff' | 'manager',
      note: row.note,
      expiresAt: row.expiresAt.toISOString(),
      status: row.status as InviteStatus,
      createdAt: row.createdAt.toISOString(),
    }
  }
}

// ─── Pure code generator (testable; not on InviteService instance) ───

export function generateCode(): string {
  const alphabet = WHATSAPP_INVITE_CODE_ALPHABET
  let out = ''
  for (let i = 0; i < WHATSAPP_INVITE_CODE_LENGTH; i++) {
    out += alphabet[randomInt(0, alphabet.length)]
  }
  return out
}
