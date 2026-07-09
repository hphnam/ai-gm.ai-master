// 01-02 Invitations service.
// This plan deliberately does NOT enable better-auth's organization plugin — it uses
// manual NestJS controllers + service for consistency with 01-01's manual org-creation
// pattern (databaseHooks). Enabling the plugin mid-stream would risk regressing the
// atomic sign-up contract (01-01 M2).
//
// Response matrix (audit-added M6):
// | status      | accept returns       | preview returns      | revoke returns       |
// | pending     | 200 + accept         | 200 + preview        | 200 + ok             |
// | accepted    | 409 already-accepted | 200 + preview        | 409 already-accepted |
// | revoked     | 404 not-found        | 404 not-found        | 404 not-found        |
// | expired     | 410 expired          | 410 expired          | 404 not-found        |
// | not-found   | 404 not-found        | 404 not-found        | 404 not-found        |

import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import {
  type InvitationDTO,
  type InvitationPreview,
  type InvitationStatus,
  type InviteRoleType,
  MAX_PENDING_INVITATIONS_PER_ORG,
} from '../../types'
import { isVenueScoped, type VenueScope } from '../auth/venue-scope'
import { isPhoneTempEmail } from '../phone/consume-phone-invite'
export type InvitationErrorCode =
  | 'invitation-not-found'
  | 'invitation-expired'
  | 'invitation-already-accepted'
  | 'invitation-email-mismatch'
  | 'invalid-invitation-role'
  | 'invitation-limit-reached'
  | 'already-a-member'
  | 'email-not-verified'
  | 'invalid-venue-scope'

export class InvitationError extends Error {
  constructor(
    public readonly code: InvitationErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code)
    this.name = 'InvitationError'
  }
}

export type MemberActionErrorCode =
  | 'member-not-found'
  | 'cannot-remove-self'
  | 'cannot-remove-owner'
  | 'insufficient-role-for-target'

export class MemberActionError extends Error {
  constructor(public readonly code: MemberActionErrorCode) {
    super(code)
    this.name = 'MemberActionError'
  }
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16)
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((x) => set.has(x))
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
}

function toDTO(row: {
  id: string
  email: string
  organizationId: string
  role: string
  venueIds: string[]
  status: string
  inviterId: string
  expiresAt: Date
  createdAt: Date
  organization: { name: string }
  inviter: { name: string | null } | null
}): InvitationDTO {
  return {
    id: row.id,
    email: row.email,
    organizationId: row.organizationId,
    organizationName: row.organization.name,
    role: row.role as InviteRoleType,
    venueIds: row.venueIds,
    status: row.status as InvitationStatus,
    inviterId: row.inviterId,
    inviterName: row.inviter?.name ?? null,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

// Reduce a caller-supplied venue selection to a validated scope for the target
// `role`. Semantics (fail-closed — an empty result only ever means "all venues"
// when the caller actually asked for all):
//   - Owner target ⇒ always [] (owners see everything).
//   - Empty request ⇒ "all venues". If the ACTOR is themselves venue-scoped,
//     "all" collapses to everything the actor can see (a scoped manager can't
//     grant access they don't have).
//   - Non-empty request ⇒ keep only ids in the org AND (for a scoped actor)
//     within the actor's own scope. If that intersection is empty, the request
//     was entirely un-grantable — throw rather than silently widening to "all".
export async function sanitizeVenueScope(
  organizationId: string,
  role: string,
  venueIds: string[],
  actorScope?: VenueScope,
): Promise<string[]> {
  if (role === 'owner') return []
  const actorScoped = actorScope ? isVenueScoped(actorScope) : false

  if (venueIds.length === 0) {
    return actorScoped ? [...(actorScope as VenueScope).venueIds] : []
  }

  const rows = await prisma.venue.findMany({
    where: { organizationId, id: { in: venueIds } },
    select: { id: true },
  })
  let allowed = rows.map((v) => v.id)
  if (actorScoped) {
    const actorSet = new Set((actorScope as VenueScope).venueIds)
    allowed = allowed.filter((id) => actorSet.has(id))
  }
  if (allowed.length === 0) throw new InvitationError('invalid-venue-scope')
  return allowed
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name)

  // Lazy GC — called at the start of createInvitation, listInvitations, and acceptInvitation
  // paths. Keeps the list view + cap count honest without a scheduler.
  async expireStaleInvitations(scope?: { organizationId?: string }): Promise<number> {
    const where: {
      status: string
      expiresAt: { lt: Date }
      organizationId?: string
    } = { status: 'pending', expiresAt: { lt: new Date() } }
    if (scope?.organizationId) where.organizationId = scope.organizationId

    const result = await prisma.invitation.updateMany({
      where,
      data: { status: 'expired' },
    })
    if (result.count > 0) {
      this.logger.log(
        JSON.stringify({
          event: 'invitation.expired_batch',
          organizationId: scope?.organizationId ?? null,
          count: result.count,
        }),
      )
    }
    return result.count
  }

  async createInvitation(input: {
    organizationId: string
    email: string
    role: InviteRoleType
    venueIds: string[]
    inviterId: string
    actorScope?: VenueScope
  }): Promise<{ row: InvitationDTO; reissued: boolean }> {
    // Defence-in-depth — zodPipe already blocks owner; service boundary re-asserts (M4)
    // InviteRoleType is 'manager'|'staff' so a non-matching string would already fail TS;
    // runtime check catches direct callers / malformed casts.
    if (input.role !== 'manager' && input.role !== 'staff') {
      throw new InvitationError('invalid-invitation-role')
    }

    const email = input.email.trim().toLowerCase()
    const venueIds = await sanitizeVenueScope(
      input.organizationId,
      input.role,
      input.venueIds,
      input.actorScope,
    )

    // Lazy GC before count — ensures cap counts only TRULY pending rows
    await this.expireStaleInvitations({ organizationId: input.organizationId })

    // M7: per-org pending-invite cap
    const pendingCount = await prisma.invitation.count({
      where: { organizationId: input.organizationId, status: 'pending' },
    })
    if (pendingCount >= MAX_PENDING_INVITATIONS_PER_ORG) {
      this.logger.warn(
        JSON.stringify({
          event: 'invitation.limit_reached',
          organizationId: input.organizationId,
          pending: pendingCount,
          limit: MAX_PENDING_INVITATIONS_PER_ORG,
        }),
      )
      throw new InvitationError('invitation-limit-reached', {
        pending: pendingCount,
        limit: MAX_PENDING_INVITATIONS_PER_ORG,
      })
    }

    // M9: already-a-member (distinct from sign-up email-already-registered)
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: input.organizationId,
        user: { email: { equals: email, mode: 'insensitive' } },
      },
      select: { id: true },
    })
    if (existingMember) {
      throw new InvitationError('already-a-member')
    }

    // S8: idempotent reissue — return existing pending invitation instead of duplicating
    const existingPending = await prisma.invitation.findFirst({
      where: {
        organizationId: input.organizationId,
        email,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    })
    if (existingPending) {
      // Refresh the venue scope so re-inviting with a changed selection wins.
      const refreshed = arraysEqual(existingPending.venueIds, venueIds)
        ? existingPending
        : await prisma.invitation.update({
            where: { id: existingPending.id },
            data: { venueIds },
            include: {
              organization: { select: { name: true } },
              inviter: { select: { name: true } },
            },
          })
      this.logger.log(
        JSON.stringify({
          event: 'invitation.reissued',
          invitationId: refreshed.id,
          organizationId: input.organizationId,
        }),
      )
      return { row: toDTO(refreshed), reissued: true }
    }

    const row = await prisma.invitation.create({
      data: {
        email,
        organizationId: input.organizationId,
        role: input.role,
        venueIds,
        status: 'pending',
        inviterId: input.inviterId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
      include: {
        organization: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    })

    this.logger.log(
      JSON.stringify({
        event: 'invitation.created',
        invitationId: row.id,
        organizationId: input.organizationId,
        inviterId: input.inviterId,
        role: input.role,
        toHash: hashEmail(email),
      }),
    )

    return { row: toDTO(row), reissued: false }
  }

  async listInvitations(input: { organizationId: string; limit: number; offset: number }): Promise<{
    invitations: InvitationDTO[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }> {
    await this.expireStaleInvitations({ organizationId: input.organizationId })

    // Defence-in-depth clamp even with zodPipe
    const limit = Math.min(Math.max(input.limit, 1), 100)
    const offset = Math.max(input.offset, 0)

    // withOrgScope's generic carrier strips `include` type-inference; the explicit
    // where + count below is equivalent defence (org-scoped in one place, explicitly).
    // Compile-time safety covered by Prisma's WhereInput constraint.
    const [rows, total] = await Promise.all([
      prisma.invitation.findMany({
        where: { organizationId: input.organizationId },
        orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
        take: limit,
        skip: offset,
        include: {
          organization: { select: { name: true } },
          inviter: { select: { name: true } },
        },
      }),
      prisma.invitation.count({ where: { organizationId: input.organizationId } }),
    ])

    return {
      invitations: rows.map(toDTO),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    }
  }

  /**
   * Surface every accepted member of the active org. Used by /org/members so
   * the Organisation settings page can show the actual team — not just
   * pending invitations. Owners + managers only (gated at the controller).
   */
  async listMembers(input: { organizationId: string; currentUserId: string }): Promise<{
    members: Array<{
      userId: string
      name: string | null
      email: string | null
      phoneNumber: string | null
      role: string
      venueIds: string[]
      isSelf: boolean
      joinedAt: string
    }>
  }> {
    // Sort by role in the DB so the take-cap doesn't truncate owners/managers
    // when an org grows past the limit. The JS sort below reorders within each
    // role bucket and resolves the role-string ordering (manager < owner
    // alphabetically) to the operator-meaningful one (owner > manager > staff).
    // For v1 a hard cap is acceptable; if a single org passes ~800 members,
    // add cursor pagination mirroring listInvitations.
    const rows = await prisma.organizationMember.findMany({
      where: { organizationId: input.organizationId },
      select: {
        userId: true,
        role: true,
        venueIds: true,
        createdAt: true,
        user: { select: { name: true, email: true, phoneNumber: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      take: 1000,
    })
    const ROLE_ORDER: Record<string, number> = { owner: 0, manager: 1, staff: 2 }
    const members = rows
      .map((m) => ({
        userId: m.userId,
        name: m.user.name,
        // Suppress the synthetic phone placeholder — the UI shows phoneNumber
        // for those members instead.
        email: isPhoneTempEmail(m.user.email) ? null : m.user.email,
        phoneNumber: m.user.phoneNumber,
        role: m.role,
        venueIds: m.venueIds,
        isSelf: m.userId === input.currentUserId,
        joinedAt: m.createdAt.toISOString(),
      }))
      .sort((a, b) => {
        const ra = ROLE_ORDER[a.role] ?? 99
        const rb = ROLE_ORDER[b.role] ?? 99
        if (ra !== rb) return ra - rb
        return (a.name ?? a.phoneNumber ?? a.email ?? '').localeCompare(
          b.name ?? b.phoneNumber ?? b.email ?? '',
        )
      })
    return { members }
  }

  /// Fully remove a member. Permission matrix (RoleGuard already ensured the
  /// actor is owner/manager): owner may remove managers + staff; manager may
  /// remove staff only; nobody removes an owner or themselves here. When this
  /// was the member's LAST org the account is hard-deleted (sessions cascade →
  /// instant logout, phone freed for re-invite); if they're in another org only
  /// the membership goes. The three invite FKs that would block a user delete
  /// (WhatsappInvite.targetUserId/issuedByUserId — NoAction; Invitation.inviterId
  /// — Restrict) are detached first; every other User relation is Cascade/SetNull.
  async removeMember(input: {
    organizationId: string
    actorUserId: string
    actorRole: string
    targetUserId: string
  }): Promise<{ deletedUser: boolean }> {
    if (input.targetUserId === input.actorUserId) {
      throw new MemberActionError('cannot-remove-self')
    }
    const key = {
      userId_organizationId: {
        userId: input.targetUserId,
        organizationId: input.organizationId,
      },
    }
    const target = await prisma.organizationMember.findUnique({
      where: key,
      select: { role: true },
    })
    if (!target) throw new MemberActionError('member-not-found')
    if (target.role === 'owner') throw new MemberActionError('cannot-remove-owner')
    if (input.actorRole !== 'owner' && target.role !== 'staff') {
      throw new MemberActionError('insufficient-role-for-target')
    }

    const deletedUser = await prisma.$transaction(
      async (tx) => {
        await tx.organizationMember.delete({ where: key })
        const remaining = await tx.organizationMember.count({
          where: { userId: input.targetUserId },
        })
        if (remaining > 0) return false
        // Detach the invite FKs that would block the user delete. Invites the
        // removed user ISSUED are REASSIGNED to the actor (not deleted) so their
        // recipients' pending onboarding links keep working; the null-out only
        // applies to invites that TARGETED the removed user.
        await tx.whatsappInvite.updateMany({
          where: { targetUserId: input.targetUserId },
          data: { targetUserId: null },
        })
        await tx.whatsappInvite.updateMany({
          where: { issuedByUserId: input.targetUserId },
          data: { issuedByUserId: input.actorUserId },
        })
        await tx.invitation.updateMany({
          where: { inviterId: input.targetUserId },
          data: { inviterId: input.actorUserId },
        })
        await tx.user.delete({ where: { id: input.targetUserId } })
        return true
      },
      // The user delete cascades across many tables; a long-tenured account can
      // exceed the 5s default and roll back. Give the cascade room.
      { timeout: 20_000 },
    )

    this.logger.log(
      JSON.stringify({
        event: 'org_member.removed',
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId,
        deletedUser,
      }),
    )
    return { deletedUser }
  }

  /// Update a member's venue scope. Permission mirrors removeMember: owner may
  /// edit managers + staff; manager may edit staff only; owners are never
  /// venue-scoped (they always see all venues) and nobody scopes themselves.
  /// Unknown/cross-tenant venue ids are dropped by sanitizeVenueScope; an empty
  /// result means "all venues".
  async updateMemberVenues(input: {
    organizationId: string
    actorUserId: string
    actorRole: string
    actorScope?: VenueScope
    targetUserId: string
    venueIds: string[]
  }): Promise<{ venueIds: string[] }> {
    if (input.targetUserId === input.actorUserId) {
      throw new MemberActionError('cannot-remove-self')
    }
    const key = {
      userId_organizationId: {
        userId: input.targetUserId,
        organizationId: input.organizationId,
      },
    }
    const target = await prisma.organizationMember.findUnique({
      where: key,
      select: { role: true },
    })
    if (!target) throw new MemberActionError('member-not-found')
    if (target.role === 'owner') throw new MemberActionError('cannot-remove-owner')
    if (input.actorRole !== 'owner' && target.role !== 'staff') {
      throw new MemberActionError('insufficient-role-for-target')
    }

    const venueIds = await sanitizeVenueScope(
      input.organizationId,
      target.role,
      input.venueIds,
      input.actorScope,
    )
    await prisma.organizationMember.update({ where: key, data: { venueIds } })

    this.logger.log(
      JSON.stringify({
        event: 'org_member.venues_updated',
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        targetUserId: input.targetUserId,
        venueCount: venueIds.length,
      }),
    )
    return { venueIds }
  }

  async getInvitationPreview(id: string): Promise<InvitationPreview> {
    const row = await prisma.invitation.findUnique({
      where: { id },
      include: { organization: { select: { name: true } } },
    })
    if (!row) throw new InvitationError('invitation-not-found')

    // Enumeration-safe: revoked looks-like-never-existed
    if (row.status === 'revoked') throw new InvitationError('invitation-not-found')

    // M6: expired — mutate to expired status if still "pending past deadline", then 410
    if (row.status === 'expired' || (row.status === 'pending' && row.expiresAt < new Date())) {
      if (row.status === 'pending') {
        await prisma.invitation.update({ where: { id }, data: { status: 'expired' } })
      }
      throw new InvitationError('invitation-expired')
    }

    return {
      id: row.id,
      email: maskEmail(row.email),
      organizationName: row.organization.name,
      role: row.role as InviteRoleType,
      status: row.status as InvitationStatus,
      expiresAt: row.expiresAt.toISOString(),
    }
  }

  async revokeInvitation(input: {
    id: string
    organizationId: string
    revokerUserId: string
  }): Promise<void> {
    const row = await prisma.invitation.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
      select: { id: true, status: true },
    })
    // Cross-tenant → null → 404 (enumeration-safe)
    if (!row) throw new InvitationError('invitation-not-found')

    if (row.status === 'accepted') throw new InvitationError('invitation-already-accepted')
    // revoked / expired → 404 (not-found; don't leak state)
    if (row.status !== 'pending') throw new InvitationError('invitation-not-found')

    await prisma.invitation.update({
      where: { id: input.id },
      data: { status: 'revoked' },
    })

    this.logger.log(
      JSON.stringify({
        event: 'invitation.revoked',
        invitationId: input.id,
        organizationId: input.organizationId,
        revokerUserId: input.revokerUserId,
      }),
    )
  }

  async acceptInvitation(input: {
    id: string
    currentUser: { id: string; email: string; emailVerified: boolean }
    sessionId: string
  }): Promise<{ activeOrganization: { id: string; name: string; slug: string } }> {
    // M2: emailVerified gate with dev bypass
    const isProd = process.env.NODE_ENV === 'production'
    if (!input.currentUser.emailVerified) {
      if (isProd) {
        this.logger.warn(
          JSON.stringify({
            event: 'invitation.blocked_unverified',
            acceptorUserId: input.currentUser.id,
            invitationId: input.id,
          }),
        )
        throw new InvitationError('email-not-verified')
      }
      process.stderr.write(
        '[WARN] email-not-verified gate bypassed in dev mode — NEVER deploy to staging/prod without enabling requireEmailVerification in better-auth AND an actual email-verification flow\n',
      )
      this.logger.warn(
        JSON.stringify({
          event: 'invitation.dev_bypass_unverified',
          acceptorUserId: input.currentUser.id,
          invitationId: input.id,
        }),
      )
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        email: true,
        organizationId: true,
        role: true,
        venueIds: true,
        status: true,
        expiresAt: true,
      },
    })
    if (!invitation) throw new InvitationError('invitation-not-found')

    if (invitation.email.toLowerCase() !== input.currentUser.email.toLowerCase()) {
      throw new InvitationError('invitation-email-mismatch')
    }

    // M6: response matrix
    if (invitation.status === 'accepted') {
      throw new InvitationError('invitation-already-accepted')
    }
    if (invitation.status === 'revoked') {
      throw new InvitationError('invitation-not-found')
    }
    if (invitation.status === 'expired') {
      throw new InvitationError('invitation-expired')
    }
    if (invitation.status === 'pending' && invitation.expiresAt < new Date()) {
      await prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'expired' } })
      throw new InvitationError('invitation-expired')
    }

    // M5: optimistic-lock + single-transaction accept
    const org = await prisma.$transaction(async (tx) => {
      const flipped = await tx.invitation.updateMany({
        where: { id: invitation.id, status: 'pending' },
        data: { status: 'accepted' },
      })
      if (flipped.count === 0) {
        // Another request won the race
        throw new InvitationError('invitation-already-accepted')
      }
      // Spec metric I — anchor onboarding window on first join. GREATEST
      // protects against pulling the anchor backwards if this user already
      // belongs (idempotent invitation accept).
      const onboardingAnchor = new Date()
      await tx.organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: input.currentUser.id,
            organizationId: invitation.organizationId,
          },
        },
        create: {
          userId: input.currentUser.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
          venueIds: invitation.venueIds,
          onboardingStartedAt: onboardingAnchor,
        },
        update: {},
      })
      await tx.$executeRaw`
        UPDATE "organization_members"
        SET "onboardingStartedAt" = GREATEST(COALESCE("onboardingStartedAt", ${onboardingAnchor}), ${onboardingAnchor})
        WHERE "userId" = ${input.currentUser.id} AND "organizationId" = ${invitation.organizationId}
      `
      // M8: update ONLY this request's session — not all user sessions
      await tx.session.update({
        where: { id: input.sessionId },
        data: { activeOrganizationId: invitation.organizationId },
      })
      return tx.organization.findUnique({
        where: { id: invitation.organizationId },
        select: { id: true, name: true, slug: true },
      })
    })

    if (!org) {
      // Shouldn't happen — FK onDelete:Cascade keeps invitations consistent
      throw new InvitationError('invitation-not-found')
    }

    // S4: audit-defensible access-grant event
    this.logger.log(
      JSON.stringify({
        event: 'invitation.accepted',
        invitationId: invitation.id,
        acceptorUserId: input.currentUser.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
        acceptorEmailHash: hashEmail(input.currentUser.email),
      }),
    )

    return { activeOrganization: org }
  }

  // Fetch the DB-fresh User for emailVerified check (AuthedRequest doesn't carry it)
  async getAcceptorUser(
    userId: string,
  ): Promise<{ id: string; email: string; emailVerified: boolean } | null> {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    })
    return u
  }

  // For building invite URLs + email content
  async getInvitationForEmail(id: string): Promise<{
    id: string
    email: string
    organizationName: string
    inviterName: string | null
    expiresAt: Date
  } | null> {
    const row = await prisma.invitation.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true } },
        inviter: { select: { name: true } },
      },
    })
    if (!row) return null
    return {
      id: row.id,
      email: row.email,
      organizationName: row.organization.name,
      inviterName: row.inviter?.name ?? null,
      expiresAt: row.expiresAt,
    }
  }
}
