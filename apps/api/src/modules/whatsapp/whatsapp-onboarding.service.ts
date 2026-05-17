// Phase 03-01 — WhatsApp onboarding service.
// DB-shaped wrapper around the pure state machine. Owns: state hydration from
// User + WhatsappSession + active OTP, atomic side-effect handling (lookup →
// OTP send, verify → redeem + link + session create, venue pick), outbound
// dispatch via WhatsAppAdapter. Returns the user-visible reply text for ack
// logging in the calling whatsapp.service.handleInbound.

import { Injectable, Logger } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { maskPhone } from '../../types/auth'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { InviteService } from './invite.service'
import { WhatsAppAdapter } from './whatsapp.adapter'
import {
  classifyInbound,
  composeWelcomeText,
  type InboundIntent,
  type OnboardingState,
  REPLIES,
  transition,
} from './whatsapp-onboarding-state'
import { WhatsappOtpService } from './whatsapp-otp.service'

export type RunTransitionResult = {
  outboundText: string | null
  nextStateKind: OnboardingState['kind']
  /** True when the inbound was consumed by onboarding (caller MUST NOT pass through to chat). */
  consumed: boolean
}

@Injectable()
export class WhatsappOnboardingService {
  private readonly logger = new Logger(WhatsappOnboardingService.name)

  constructor(
    private readonly invites: InviteService,
    private readonly otps: WhatsappOtpService,
    private readonly adapter: WhatsAppAdapter,
    private readonly realtime: RealtimeGateway,
  ) {}

  // ─── State hydration ────────────────────────────────────────────────

  /**
   * Resolve the current onboarding state for a phone number.
   *
   * Order:
   *  1. linked + venue selected      → `linked`
   *  2. linked + no venue selected   → `linked_no_venue`  (multi-venue user mid-pick)
   *  3. active OTP attempt pending   → `otp_pending`
   *  4. otherwise                    → `unknown`
   */
  async loadState(phoneNumber: string): Promise<OnboardingState> {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true, phoneVerifiedAt: true },
    })

    if (user?.phoneVerifiedAt) {
      const session = await prisma.whatsappSession.findUnique({
        where: { phoneNumber },
        select: { currentOrganizationId: true },
      })
      if (session?.currentOrganizationId) {
        return {
          kind: 'linked',
          phoneNumber,
          userId: user.id,
          organizationId: session.currentOrganizationId,
        }
      }
      return { kind: 'linked_no_venue', phoneNumber, userId: user.id }
    }

    // No verified user — check for an active OTP attempt against any pending
    // invite issued to this phone.
    const pendingOtp = await prisma.whatsappOtpAttempt.findFirst({
      where: {
        status: 'pending',
        expiresAt: { gt: new Date() },
        invite: { phoneNumber, status: 'pending' },
      },
      select: { inviteId: true },
      orderBy: { createdAt: 'desc' },
    })

    if (pendingOtp) {
      return { kind: 'otp_pending', phoneNumber, inviteId: pendingOtp.inviteId }
    }

    return { kind: 'unknown', phoneNumber }
  }

  // ─── Transition runner ──────────────────────────────────────────────

  /**
   * Classify, transition, perform side-effect, dispatch outbound. Returns the
   * reply text emitted (for ack-logging) and the resolved next-state kind.
   *
   * `consumed: true` means onboarding handled the inbound — the caller must
   * NOT fall through to chat. `consumed: false` means the state machine yields
   * to chat dispatch (only for `linked` state).
   */
  async runTransition(state: OnboardingState, raw: string): Promise<RunTransitionResult> {
    const expectingOtp = state.kind === 'otp_pending'
    const intent = classifyInbound(raw, expectingOtp)
    const t = transition(state, intent, {})

    // Pure-reply path — emit and return.
    if (t.sideEffect === null) {
      if (state.kind === 'linked') {
        return { outboundText: null, nextStateKind: 'linked', consumed: false }
      }
      const text = t.outbound?.kind === 'reply' ? t.outbound.text : null
      if (text) await this.sendOutbound(state.phoneNumber, text)
      return { outboundText: text, nextStateKind: t.nextState.kind, consumed: true }
    }

    // Side-effect dispatch.
    switch (t.sideEffect) {
      case 'lookup_invite':
        return this.handleLookupInvite(state, intent)
      case 'verify_otp':
        return this.handleVerifyOtp(state, intent)
      case 'select_venue':
        return this.handleSelectVenue(state, intent)
    }
  }

  // ─── Side-effect handlers ───────────────────────────────────────────

  private async handleLookupInvite(
    state: OnboardingState,
    intent: InboundIntent,
  ): Promise<RunTransitionResult> {
    if (intent.kind !== 'invite_code' || state.kind !== 'unknown') {
      return this.replyOnly(state.phoneNumber, REPLIES.unknown_prompt, state.kind)
    }

    const invite = await this.invites.findActiveByCodeAndPhone(intent.code, state.phoneNumber)
    if (!invite) {
      return this.replyOnly(state.phoneNumber, REPLIES.invite_invalid, state.kind)
    }

    // Issue OTP. Service applies rate-limit + debounce + send-failure handling.
    const result = await this.otps.requestOtp(invite, state.phoneNumber)
    if (result.ok) {
      return this.replyOnly(
        state.phoneNumber,
        // The OTP plaintext is in the OTP message itself (sent by otps.requestOtp);
        // here we just confirm in-channel that something will arrive.
        // Keeping the outbound minimal — Infobip sent the code separately.
        null,
        'otp_pending',
      )
    }

    // Failure modes — surface helpful reply.
    let text: string
    switch (result.reason) {
      case 'rate_limited':
        text = REPLIES.otp_rate_limited
        break
      case 'debounced':
        text = REPLIES.otp_debounced
        break
      case 'send_failed':
        text = REPLIES.otp_send_failed
        break
    }
    // Even on debounce/rate-limit/send-failed, the OTP attempt row exists with
    // a known invite — state advances to otp_pending so the user can submit
    // the (already-sent or about-to-arrive) code without re-entering the invite.
    const nextKind = result.reason === 'send_failed' ? 'unknown' : 'otp_pending'
    return this.replyOnly(state.phoneNumber, text, nextKind)
  }

  private async handleVerifyOtp(
    state: OnboardingState,
    intent: InboundIntent,
  ): Promise<RunTransitionResult> {
    if (intent.kind !== 'otp_code' || state.kind !== 'otp_pending') {
      return this.replyOnly(state.phoneNumber, REPLIES.unknown_prompt, state.kind)
    }

    // Resolve the invite row that the active OTP belongs to.
    const invite = await prisma.whatsappInvite.findUnique({ where: { id: state.inviteId } })
    if (!invite || invite.status !== 'pending') {
      return this.replyOnly(state.phoneNumber, REPLIES.invite_invalid, 'unknown')
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      return this.replyOnly(state.phoneNumber, REPLIES.invite_expired, 'unknown')
    }

    const verify = await this.otps.verifyOtp(invite, intent.otp)
    if (!verify.ok) {
      switch (verify.reason) {
        case 'wrong': {
          const remaining = await this.peekRemainingAttempts(invite.id)
          return this.replyOnly(state.phoneNumber, REPLIES.otp_wrong(remaining), 'otp_pending')
        }
        case 'exhausted':
          await this.invites.markExhausted(invite.id)
          return this.replyOnly(state.phoneNumber, REPLIES.otp_exhausted, 'unknown')
        case 'expired':
          return this.replyOnly(state.phoneNumber, REPLIES.otp_expired, 'unknown')
        case 'no_active_attempt':
          return this.replyOnly(state.phoneNumber, REPLIES.invite_invalid, 'unknown')
      }
    }

    // Success path — atomic redeem + phone-link + session creation.
    return this.linkUserAndWelcome(invite, state.phoneNumber)
  }

  private async handleSelectVenue(
    state: OnboardingState,
    intent: InboundIntent,
  ): Promise<RunTransitionResult> {
    if (intent.kind !== 'venue_index' || state.kind !== 'linked_no_venue') {
      return this.replyOnly(state.phoneNumber, REPLIES.unknown_prompt, state.kind)
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: state.userId },
      orderBy: { createdAt: 'asc' },
      select: {
        organizationId: true,
        organization: { select: { name: true } },
      },
    })

    if (intent.index < 1 || intent.index > memberships.length) {
      return this.replyOnly(state.phoneNumber, REPLIES.invalid_venue_index, state.kind)
    }

    const chosen = memberships[intent.index - 1]
    await prisma.whatsappSession.update({
      where: { phoneNumber: state.phoneNumber },
      data: { currentOrganizationId: chosen.organizationId, lastActivityAt: new Date() },
    })

    this.logger.log('whatsapp_session.venue_selected', {
      userId: state.userId,
      organizationId: chosen.organizationId,
      phoneNumberMasked: maskPhone(state.phoneNumber),
    })

    const text = `Got it — you're in ${chosen.organization.name}. Ask me anything.`
    await this.sendOutbound(state.phoneNumber, text)
    return { outboundText: text, nextStateKind: 'linked', consumed: true }
  }

  // ─── Atomic linkage on successful OTP verify ─────────────────────────

  private async linkUserAndWelcome(
    invite: {
      id: string
      organizationId: string
      phoneNumber: string
      role: string
      targetUserId: string | null
    },
    phoneNumber: string,
  ): Promise<RunTransitionResult> {
    const result = await prisma.$transaction(async (txn: Prisma.TransactionClient) => {
      // Redeem first — short-circuits the race winner.
      const redemption = await this.invites.markRedeemed(
        invite.id,
        invite.targetUserId ?? '__self__',
        txn,
      )
      if (!redemption.redeemed) {
        return { kind: 'race_lost' as const }
      }

      // Locate or create the User the invite is for.
      let user = await txn.user.findUnique({
        where: { phoneNumber },
        select: { id: true, name: true, email: true, phoneVerifiedAt: true },
      })

      if (!user) {
        // Invite-issued numbers without an existing better-auth user need a
        // shell User row. Email is synthesised from the phone for uniqueness;
        // managers can edit it on the team page later.
        const syntheticEmail = `wa+${phoneNumber.replace(/\D/g, '')}@whatsapp.local`
        user = await txn.user.create({
          data: {
            email: syntheticEmail,
            phoneNumber,
            phoneVerifiedAt: new Date(),
          },
          select: { id: true, name: true, email: true, phoneVerifiedAt: true },
        })
      } else if (!user.phoneVerifiedAt) {
        await txn.user.update({
          where: { id: user.id },
          data: { phoneVerifiedAt: new Date() },
        })
      }

      // Ensure membership in the issuing org. Spec metric I anchors the
      // 14-day onboarding window on member create. For an existing member,
      // GREATEST(existing, now) handles the re-invite case without ever
      // pulling the anchor BACKWARDS (raw SQL because Prisma's update
      // payload can't reference the column's prior value).
      const now = new Date()
      await txn.organizationMember.upsert({
        where: {
          userId_organizationId: { userId: user.id, organizationId: invite.organizationId },
        },
        create: {
          userId: user.id,
          organizationId: invite.organizationId,
          role: invite.role,
          onboardingStartedAt: now,
        },
        update: {},
      })
      await txn.$executeRaw`
        UPDATE "organization_members"
        SET "onboardingStartedAt" = GREATEST(COALESCE("onboardingStartedAt", ${now}), ${now})
        WHERE "userId" = ${user.id} AND "organizationId" = ${invite.organizationId}
      `

      // Pull all memberships now (so we can decide single-vs-multi welcome).
      const memberships = await txn.organizationMember.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        select: {
          organizationId: true,
          organization: { select: { name: true } },
        },
      })

      // Single-membership users get auto-set; multi-membership users get
      // currentOrganizationId=null and a numbered picker reply.
      const isSingle = memberships.length === 1

      try {
        await txn.whatsappSession.create({
          data: {
            phoneNumber,
            userId: user.id,
            currentOrganizationId: isSingle ? memberships[0].organizationId : null,
          },
        })
      } catch (err) {
        // Race: a parallel verification already created the session. Treat as
        // graceful no-op per audit-M2 idempotency.
        const code = (err as { code?: string })?.code
        if (code !== 'P2002') throw err
      }

      // Hydrate venue names for welcome composition (single-org or multi-org).
      const richMemberships = await Promise.all(
        memberships.map(async (m) => {
          const venue = await txn.venue.findFirst({
            where: { organizationId: m.organizationId },
            orderBy: { createdAt: 'asc' },
            select: { name: true },
          })
          return {
            organizationId: m.organizationId,
            organizationName: m.organization.name,
            venueName: venue?.name ?? null,
          }
        }),
      )

      this.logger.log('whatsapp_invite.linked_user', {
        inviteId: invite.id,
        organizationId: invite.organizationId,
        userId: user.id,
        membershipCount: memberships.length,
        phoneNumberMasked: maskPhone(phoneNumber),
      })

      return {
        kind: 'redeemed' as const,
        userName: user.name,
        memberships: richMemberships,
        isSingle,
        userId: user.id,
        phoneVerifiedAt: (user.phoneVerifiedAt ?? new Date()).toISOString(),
      }
    })

    if (result.kind === 'race_lost') {
      // Another inbound already redeemed this invite. Acknowledge gracefully.
      return this.replyOnly(phoneNumber, REPLIES.linked_no_venue_unexpected, 'linked_no_venue')
    }

    // Post-commit fanout. Issuer's invites list (org-scoped) sees the row
    // flip to redeemed; the newly-linked user's own tabs see the phone
    // verified flag flip so their settings page updates without a refresh.
    this.realtime.emitWhatsappInviteUpdated(invite.organizationId, {
      id: invite.id,
      status: 'redeemed',
    })
    this.realtime.emitPhoneStatusChanged(result.userId, {
      phoneNumber,
      phoneVerifiedAt: result.phoneVerifiedAt,
    })

    const welcome = composeWelcomeText(result.userName, result.memberships)
    await this.sendOutbound(phoneNumber, welcome)
    return {
      outboundText: welcome,
      nextStateKind: result.isSingle ? 'linked' : 'linked_no_venue',
      consumed: true,
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private async peekRemainingAttempts(inviteId: string): Promise<number> {
    const a = await prisma.whatsappOtpAttempt.findFirst({
      where: { inviteId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: { attemptsRemaining: true },
    })
    return a?.attemptsRemaining ?? 0
  }

  private async sendOutbound(phoneNumber: string, text: string): Promise<void> {
    // 03-06: Twilio adapter normalizes E.164 with or without leading `+`. Pass
    // through as-is — phoneNumber is canonical (User.phoneNumber stores with `+`).
    await this.adapter.sendText(phoneNumber, text)
  }

  private async replyOnly(
    phoneNumber: string,
    text: string | null,
    nextKind: OnboardingState['kind'],
  ): Promise<RunTransitionResult> {
    if (text) await this.sendOutbound(phoneNumber, text)
    return { outboundText: text, nextStateKind: nextKind, consumed: true }
  }
}
