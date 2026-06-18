// Phase 03-01 — WhatsApp onboarding state machine.
// PURE module: no DB access, no async, no I/O. Owns the state-shape, intent
// classification (with audit-S1 normalization + audit-S2 state-aware out-of-state
// messages), and transitions returning declarative outbound + side-effect tags.
// The DB-shaped wrapper is whatsapp-onboarding.service.ts.

import { WHATSAPP_INVITE_CODE_REGEX, WHATSAPP_OTP_REGEX } from '../../types'

// ─── State shape ─────────────────────────────────────────────────────────

export type OnboardingState =
  | { kind: 'unknown'; phoneNumber: string }
  | { kind: 'otp_pending'; phoneNumber: string; inviteId: string }
  | { kind: 'linked_no_venue'; phoneNumber: string; userId: string }
  | { kind: 'linked'; phoneNumber: string; userId: string; organizationId: string }

// ─── Intent shape ────────────────────────────────────────────────────────

export type InboundIntent =
  | { kind: 'invite_code'; code: string }
  | { kind: 'otp_code'; otp: string }
  | { kind: 'venue_index'; index: number }
  | { kind: 'ambiguous_text'; raw: string }

// ─── Outbound + side-effect shape ────────────────────────────────────────

export type OnboardingSideEffect = 'lookup_invite' | 'verify_otp' | 'select_venue' | null

export type OnboardingOutbound = { kind: 'reply'; text: string } | null

export type Transition = {
  nextState: OnboardingState
  outbound: OnboardingOutbound
  sideEffect: OnboardingSideEffect
}

// ─── Pure normalisation + classifier (audit-S1) ──────────────────────────

/** Normalise an invite-code submission: trim, strip whitespace/hyphens/dots/underscores, upper. */
export function normalizeInviteCode(raw: string): string {
  return raw
    .trim()
    .replace(/[\s\-_.]/g, '')
    .toUpperCase()
}

/** Normalise an OTP submission: digits-only. */
export function normalizeOtp(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * Classify a raw inbound message into an intent. State-aware: when the
 * caller is `expectingOtp`, a 6-digit shape wins over an invite-code shape
 * even if both regex match (trivially true for digits-only — they don't —
 * but kept as a future-proof guard).
 *
 * Order:
 *   1. Pure-numeric venue index (1-9) — only meaningful in linked_no_venue
 *      but we classify it here and let transition() decide whether to honour
 *   2. OTP shape (6 digits, after digit-only normalize)
 *   3. Invite-code shape (8 chars Crockford base32, after normalize)
 *   4. Fall through to ambiguous_text
 *
 * State decides which intents are honoured — `unknown` + otp_code → out-of-state
 * corrective reply, NOT a silent drop (audit-S2).
 */
export function classifyInbound(raw: string, expectingOtp: boolean): InboundIntent {
  const trimmed = raw.trim()

  // Single-digit venue picker — short-circuits invite-code regex (which would
  // require 8 chars anyway, so no real ambiguity).
  if (/^[1-9]$/.test(trimmed)) {
    return { kind: 'venue_index', index: Number.parseInt(trimmed, 10) }
  }

  const otpNorm = normalizeOtp(trimmed)
  const inviteNorm = normalizeInviteCode(trimmed)

  if (expectingOtp) {
    if (WHATSAPP_OTP_REGEX.test(otpNorm)) {
      return { kind: 'otp_code', otp: otpNorm }
    }
    if (WHATSAPP_INVITE_CODE_REGEX.test(inviteNorm)) {
      return { kind: 'invite_code', code: inviteNorm }
    }
  } else {
    if (WHATSAPP_INVITE_CODE_REGEX.test(inviteNorm)) {
      return { kind: 'invite_code', code: inviteNorm }
    }
    if (WHATSAPP_OTP_REGEX.test(otpNorm)) {
      return { kind: 'otp_code', otp: otpNorm }
    }
  }

  return { kind: 'ambiguous_text', raw: trimmed }
}

// ─── Reply templates (single-source for probe assertions) ────────────────

export const REPLIES = {
  unknown_prompt:
    "Welcome to GM AI. Reply with the 8-character invite code your manager sent you. If you don't have one, ask them to invite you from the team page.",
  unknown_received_otp: "I haven't sent you a code yet. Reply with your invite code first.",
  invite_invalid:
    "That code didn't match. Check it with your manager — codes are 8 characters and expire after 24 hours.",
  invite_expired: 'That invite has expired. Ask your manager to issue a new one.',
  invite_revoked: 'That invite is no longer active. Ask your manager to issue a new one.',
  otp_pending_invite_resubmitted:
    'Please enter the 6-digit code from the message above. If you want to use a different invite, wait 10 minutes for this one to expire.',
  otp_wrong: (remaining: number) =>
    `That code didn't match. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`,
  otp_exhausted: 'Too many wrong codes. Ask your manager to issue a new invite.',
  otp_expired: 'That code has expired. Ask your manager to issue a new invite.',
  otp_send_failed: "Couldn't send the verification code right now. Try again in a minute.",
  otp_rate_limited: "You've requested too many codes. Try again in an hour.",
  otp_debounced: 'I just sent you a code. Check your messages.',
  linked_no_venue_unexpected:
    "You're already verified. Reply with the venue number from the list to continue.",
  invalid_venue_index:
    "That isn't a valid venue number. Reply with the number from the list above.",
} as const

// Pure-function welcome composer, exposed for probe coverage (V_welcome_*).
export function composeWelcomeText(
  userName: string | null,
  memberships: { organizationId: string; organizationName: string; venueName: string | null }[],
): string {
  const greeting = userName ? `Hi ${userName.split(' ')[0]} —` : 'Hi —'

  if (memberships.length === 1) {
    const m = memberships[0]
    const where = m.venueName ? `${m.organizationName} (${m.venueName})` : m.organizationName
    return `${greeting} you're verified for ${where}. Ask me anything about stock, procedures, or contacts.`
  }

  const lines: string[] = [`${greeting} you're verified across ${memberships.length} venues:`, '']
  memberships.forEach((m, i) => {
    const where = m.venueName ? `${m.organizationName} (${m.venueName})` : m.organizationName
    lines.push(`${i + 1}. ${where}`)
  })
  lines.push('')
  lines.push('Reply with the number to start.')
  return lines.join('\n')
}

// ─── Transition function ─────────────────────────────────────────────────

export type TransitionCtx = {
  /** Number of memberships the just-verified user has. Drives single-vs-multi welcome. */
  membershipCount?: number
}

/**
 * Pure transition. Given current state + classified intent, returns the next
 * state, declarative outbound (reply text or null), and a side-effect tag for
 * the wrapping service to act on (DB lookup/verify/redeem).
 *
 * The state machine ONLY owns unverified states + multi-venue picker. Once a
 * user reaches `linked`, this transition returns `nextState: linked` and
 * `sideEffect: null` for any input — chat dispatch is the wrapping service's
 * responsibility (this plan stops at "linked"; chat passthrough preserved).
 */
export function transition(
  state: OnboardingState,
  intent: InboundIntent,
  _ctx: TransitionCtx = {},
): Transition {
  switch (state.kind) {
    case 'unknown': {
      if (intent.kind === 'invite_code') {
        return { nextState: state, outbound: null, sideEffect: 'lookup_invite' }
      }
      if (intent.kind === 'otp_code') {
        // audit-S2: out-of-state OTP shape → corrective reply, not silent drop.
        return {
          nextState: state,
          outbound: { kind: 'reply', text: REPLIES.unknown_received_otp },
          sideEffect: null,
        }
      }
      // ambiguous_text or venue_index in `unknown` → re-prompt.
      return {
        nextState: state,
        outbound: { kind: 'reply', text: REPLIES.unknown_prompt },
        sideEffect: null,
      }
    }

    case 'otp_pending': {
      if (intent.kind === 'otp_code') {
        return { nextState: state, outbound: null, sideEffect: 'verify_otp' }
      }
      if (intent.kind === 'invite_code') {
        // audit-S2: invite-code shape while waiting on OTP → corrective reply.
        return {
          nextState: state,
          outbound: { kind: 'reply', text: REPLIES.otp_pending_invite_resubmitted },
          sideEffect: null,
        }
      }
      return {
        nextState: state,
        outbound: { kind: 'reply', text: REPLIES.otp_pending_invite_resubmitted },
        sideEffect: null,
      }
    }

    case 'linked_no_venue': {
      if (intent.kind === 'venue_index') {
        return { nextState: state, outbound: null, sideEffect: 'select_venue' }
      }
      if (intent.kind === 'invite_code' || intent.kind === 'otp_code') {
        // audit-S2: don't re-trigger onboarding for a verified user.
        return {
          nextState: state,
          outbound: { kind: 'reply', text: REPLIES.linked_no_venue_unexpected },
          sideEffect: null,
        }
      }
      // ambiguous_text → reply with picker hint.
      return {
        nextState: state,
        outbound: { kind: 'reply', text: REPLIES.linked_no_venue_unexpected },
        sideEffect: null,
      }
    }

    case 'linked': {
      // Outer service handles chat passthrough — this state machine emits null.
      return { nextState: state, outbound: null, sideEffect: null }
    }
  }
}
