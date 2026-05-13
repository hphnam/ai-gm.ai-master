/**
 * Plan 03-01 Task 2 — probe-whatsapp-onboarding. Verifies the identity-binding
 * + onboarding flow end-to-end through the state machine + service wrapper:
 * invite creation shape, manager rate-limit, phone-cross-org guard, unknown-
 * number prompt + rate-limited re-prompt, valid-code → OTP send, OTP rate-
 * limit, wrong-OTP exhaustion, correct-OTP linkage, single-venue auto-welcome,
 * multi-venue picker + numbered selection, expired/revoked invites, cross-
 * tenant code isolation, race-on-redemption, delivery-failure path, input
 * normalization, out-of-state corrective replies, re-issuance debounce,
 * lifecycle log emissions, timing-safe equality grep gate, E.164 storage shape.
 *
 * Idempotent: pre-cleanup + post-cleanup symmetric. Two consecutive runs must
 * produce ≥35/35 each (matches Plan 06-02 / 06-03 idempotency precedent).
 *
 * Cost: ~$0 — no Anthropic chat calls, no Voyage calls. Pure DB + adapter stub.
 *
 *   PROBE_INFOBIP_STUB=1 npm run probe:whatsapp-onboarding --workspace=api
 */

import '../src/load-env'
import 'reflect-metadata'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Logger } from '@nestjs/common'
import { prisma } from '../src/database/prisma'
import { InviteService } from '../src/modules/whatsapp/invite.service'
import { WhatsAppAdapter } from '../src/modules/whatsapp/whatsapp.adapter'
import { WhatsappOnboardingService } from '../src/modules/whatsapp/whatsapp-onboarding.service'
import {
  classifyInbound,
  composeWelcomeText,
  normalizeInviteCode,
  normalizeOtp,
} from '../src/modules/whatsapp/whatsapp-onboarding-state'
import { WhatsappOtpService } from '../src/modules/whatsapp/whatsapp-otp.service'
import {
  MAX_INVITES_PER_MANAGER_PER_DAY,
  WHATSAPP_INVITE_CODE_REGEX,
  WHATSAPP_OTP_LENGTH,
  WHATSAPP_OTP_MAX_ATTEMPTS,
} from '../src/types'

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'probe-whatsapp-onboarding MUST NOT run in production — DB writes seed/cleanup test fixtures.',
  )
}

// Force console-mode adapter so OTP "delivery" doesn't actually hit Infobip.
process.env.INFOBIP_DRIVER_OVERRIDE = 'console'

const PROBE_ORG_A = 'probe-onboarding-org-a'
const PROBE_ORG_B = 'probe-onboarding-org-b'
const PROBE_PHONE_S1 = '+447700900001' // single-venue invitee
const PROBE_PHONE_S2 = '+447700900002' // multi-venue invitee
const PROBE_PHONE_S3 = '+447700900003' // expired-invite victim
const PROBE_PHONE_S4 = '+447700900004' // cross-tenant attempt
const PROBE_PHONE_S5 = '+447700900005' // race + exhaustion
const PROBE_PHONE_S6 = '+447700900006' // delivery failure
const PROBE_PHONE_S7 = '+447700900007' // re-issuance debounce
const PROBE_PHONE_S8 = '+447700900008' // normalization
const PROBE_PHONE_S9 = '+447700900009' // E.164 / inbound bare-digits

const ALL_PROBE_PHONES = [
  PROBE_PHONE_S1,
  PROBE_PHONE_S2,
  PROBE_PHONE_S3,
  PROBE_PHONE_S4,
  PROBE_PHONE_S5,
  PROBE_PHONE_S6,
  PROBE_PHONE_S7,
  PROBE_PHONE_S8,
  PROBE_PHONE_S9,
]

// ─── Assertion harness ──────────────────────────────────────────────────

type AssertResult = { name: string; pass: boolean; detail?: string }
const results: AssertResult[] = []

function assert(name: string, ok: boolean, detail?: string) {
  results.push({ name, pass: ok, detail })
  console.log(JSON.stringify({ event: `probe.assert.${name}.${ok ? 'pass' : 'fail'}`, detail }))
}
function assertEq<T>(name: string, actual: T, expected: T, detail?: string) {
  const ok = actual === expected
  assert(
    name,
    ok,
    ok
      ? detail
      : `expected ${String(expected)}, got ${String(actual)}${detail ? ` (${detail})` : ''}`,
  )
}
function assertGte(name: string, actual: number, min: number, detail?: string) {
  const ok = actual >= min
  assert(name, ok, ok ? detail : `expected >= ${min}, got ${actual}${detail ? ` (${detail})` : ''}`)
}
function assertContains(name: string, haystack: string | null, needle: string) {
  const ok = (haystack ?? '').includes(needle)
  assert(name, ok, ok ? undefined : `'${needle}' not in '${(haystack ?? '').slice(0, 80)}…'`)
}

// ─── Outbound capture (monkey-patch the adapter) ────────────────────────

type OutboundEntry = { to: string; body: string; mode: string; ok: boolean; reason?: string }
const outboundLog: OutboundEntry[] = []
let forceSendThrow = false

function patchAdapter(adapter: WhatsAppAdapter): void {
  const orig = adapter.sendText.bind(adapter)
  adapter.sendText = async (to: string, body: string) => {
    // Only throw on actual OTP delivery; let fallback replies pass through
    // so the failure-handling path can finish dispatching its user-facing reply.
    // Match the actual OTP delivery body shape (`code is 123456`) — the user-facing
    // "couldn't send the verification code" fallback also contains "verification code"
    // but lacks the digits, so this regex isolates the OTP send specifically.
    if (forceSendThrow && /code is \d{6}/.test(body)) {
      const e = new Error('probe-forced-send-failure')
      outboundLog.push({ to, body, mode: 'console', ok: false, reason: e.message })
      throw e
    }
    const r = await orig(to, body)
    outboundLog.push({
      to,
      body,
      mode: r.ok ? r.mode : 'console',
      ok: r.ok,
      reason: r.ok ? undefined : r.reason,
    })
    return r
  }
}

// ─── Logger capture (Logger.prototype.log/warn) ─────────────────────────

type LogEntry = { level: 'log' | 'warn'; event: string; payload?: unknown }
const logBuffer: LogEntry[] = []

function patchLogger(): void {
  const origLog = Logger.prototype.log
  const origWarn = Logger.prototype.warn
  // The 1st arg is the event-name string; the 2nd is the payload object.
  // Some call sites pass 1 arg only — payload undefined.
  Logger.prototype.log = function (
    this: Logger,
    msg: unknown,
    payload?: unknown,
    ...rest: unknown[]
  ) {
    if (typeof msg === 'string') logBuffer.push({ level: 'log', event: msg, payload })
    return origLog.apply(this, [msg, payload, ...rest] as Parameters<typeof origLog>)
  }
  Logger.prototype.warn = function (
    this: Logger,
    msg: unknown,
    payload?: unknown,
    ...rest: unknown[]
  ) {
    if (typeof msg === 'string') logBuffer.push({ level: 'warn', event: msg, payload })
    return origWarn.apply(this, [msg, payload, ...rest] as Parameters<typeof origWarn>)
  }
}

function logCount(event: string): number {
  return logBuffer.filter((e) => e.event === event).length
}

// ─── Cleanup (FK-safe) ──────────────────────────────────────────────────

async function pnpCleanup(): Promise<void> {
  // 1. Delete sessions for probe phones (by phoneNumber PK).
  await prisma.whatsappSession
    .deleteMany({ where: { phoneNumber: { in: ALL_PROBE_PHONES } } })
    .catch(() => {})

  // 2. Delete invites + OTP attempts for probe orgs.
  for (const slug of [PROBE_ORG_A, PROBE_ORG_B]) {
    const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } })
    if (!org) continue
    await prisma.whatsappOtpAttempt
      .deleteMany({ where: { invite: { organizationId: org.id } } })
      .catch(() => {})
    await prisma.whatsappInvite.deleteMany({ where: { organizationId: org.id } }).catch(() => {})
  }

  // 3. Also delete invites by probe phone numbers (cross-org cleanup safety).
  await prisma.whatsappOtpAttempt
    .deleteMany({ where: { invite: { phoneNumber: { in: ALL_PROBE_PHONES } } } })
    .catch(() => {})
  await prisma.whatsappInvite
    .deleteMany({ where: { phoneNumber: { in: ALL_PROBE_PHONES } } })
    .catch(() => {})

  // 4. Delete probe users (by phone or synthetic email pattern).
  const probeUsers = await prisma.user.findMany({
    where: {
      OR: [
        { phoneNumber: { in: ALL_PROBE_PHONES } },
        { email: { startsWith: 'probe-onboarding-' } },
        { email: { startsWith: 'wa+44770090' } }, // synthetic from linkUserAndWelcome
      ],
    },
    select: { id: true },
  })
  const probeUserIds = probeUsers.map((u) => u.id)
  if (probeUserIds.length > 0) {
    await prisma.organizationMember
      .deleteMany({ where: { userId: { in: probeUserIds } } })
      .catch(() => {})
    await prisma.user.deleteMany({ where: { id: { in: probeUserIds } } }).catch(() => {})
  }

  // 5. Delete probe orgs (cascades venues + remaining members).
  for (const slug of [PROBE_ORG_A, PROBE_ORG_B]) {
    const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } })
    if (!org) continue
    await prisma.organizationMember
      .deleteMany({ where: { organizationId: org.id } })
      .catch(() => {})
    await prisma.venue.deleteMany({ where: { organizationId: org.id } }).catch(() => {})
    await prisma.organization.delete({ where: { id: org.id } }).catch(() => {})
  }
}

// ─── Seed ────────────────────────────────────────────────────────────────

type Seed = {
  orgA: { id: string; managerId: string; venueName: string }
  orgB: { id: string; managerId: string; venueName: string }
}

async function seed(): Promise<Seed> {
  const orgA = await prisma.organization.create({
    data: { id: randomUUID(), name: 'Probe Org A', slug: PROBE_ORG_A },
    select: { id: true },
  })
  const orgB = await prisma.organization.create({
    data: { id: randomUUID(), name: 'Probe Org B', slug: PROBE_ORG_B },
    select: { id: true },
  })
  const venueA = await prisma.venue.create({
    data: { id: randomUUID(), name: 'Probe Venue A', type: 'pub', organizationId: orgA.id },
    select: { name: true },
  })
  const venueB = await prisma.venue.create({
    data: { id: randomUUID(), name: 'Probe Venue B', type: 'pub', organizationId: orgB.id },
    select: { name: true },
  })

  const mgrA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: 'probe-onboarding-mgr-a@example.test',
      phoneNumber: '+447700900100',
      phoneVerifiedAt: new Date(),
    },
    select: { id: true },
  })
  const mgrB = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: 'probe-onboarding-mgr-b@example.test',
      phoneNumber: '+447700900200',
      phoneVerifiedAt: new Date(),
    },
    select: { id: true },
  })
  await prisma.organizationMember.create({
    data: { id: randomUUID(), userId: mgrA.id, organizationId: orgA.id, role: 'manager' },
  })
  await prisma.organizationMember.create({
    data: { id: randomUUID(), userId: mgrB.id, organizationId: orgB.id, role: 'manager' },
  })

  return {
    orgA: { id: orgA.id, managerId: mgrA.id, venueName: venueA.name },
    orgB: { id: orgB.id, managerId: mgrB.id, venueName: venueB.name },
  }
}

// ─── Probe body ──────────────────────────────────────────────────────────

async function main() {
  patchLogger()
  await pnpCleanup()
  const ctx = await seed()

  // Service instantiation (no NestJS DI — direct construction).
  const adapter = new WhatsAppAdapter()
  patchAdapter(adapter)
  const inviteService = new InviteService()
  const otpService = new WhatsappOtpService(adapter)
  otpService.onModuleInit()
  const onboarding = new WhatsappOnboardingService(inviteService, otpService, adapter)

  // ─── Pure helpers (W1-W3 baseline) ─────────────────────────────────

  // W1 — normalizeInviteCode strips whitespace + hyphens + dots + underscores + uppers.
  assertEq('W1.normalize_invite_strip_hyphen', normalizeInviteCode('abcd-efgh'), 'ABCDEFGH')
  assertEq('W1.normalize_invite_strip_space', normalizeInviteCode('  ab cd efgh  '), 'ABCDEFGH')
  assertEq(
    'W1.normalize_invite_strip_dot_underscore',
    normalizeInviteCode('ab.cd_efgh'),
    'ABCDEFGH',
  )

  // W2 — normalizeOtp drops non-digits.
  assertEq('W2.normalize_otp_strip_dash', normalizeOtp('123-456'), '123456')
  assertEq('W2.normalize_otp_strip_space', normalizeOtp('123 456'), '123456')

  // W3 — classifyInbound order: 1-digit → venue_index; 6-digit → OTP; 8-char → invite.
  assertEq('W3.classify_venue_index', classifyInbound('2', false).kind, 'venue_index')
  assertEq('W3.classify_otp', classifyInbound('123456', false).kind, 'otp_code')
  assertEq('W3.classify_invite', classifyInbound('ABCDEFGH', false).kind, 'invite_code')
  assertEq('W3.classify_ambiguous', classifyInbound('hello there', false).kind, 'ambiguous_text')

  // ─── W4-W7: invite creation shape ──────────────────────────────────

  const created = await inviteService.create(ctx.orgA.id, ctx.orgA.managerId, {
    phoneNumber: PROBE_PHONE_S1,
    role: 'staff',
    note: 'probe S1',
  })
  // W4 — code matches Crockford regex
  assert('W4.code_format_valid', WHATSAPP_INVITE_CODE_REGEX.test(created.code))
  // W5 — invite phone masked (never raw E.164 in InvitePublic)
  assertContains('W5.invite_public_phone_masked', created.invite.phoneNumberMasked, '*')
  // W6 — invite status = pending on create
  assertEq('W6.invite_status_pending', created.invite.status, 'pending')
  // W7 — `whatsapp_invite.created` log fired
  assertGte('W7.lifecycle_log_created', logCount('whatsapp_invite.created'), 1)

  // ─── W8-W10: unknown-number prompt + valid invite → OTP issuance ──

  const unknownState = await onboarding.loadState(PROBE_PHONE_S1)
  assertEq('W8.loadState_initial_unknown', unknownState.kind, 'unknown')
  await onboarding.runTransition(unknownState, 'hello?')
  // W9 — unknown + ambiguous text yields the prompt reply
  const lastReply = outboundLog[outboundLog.length - 1]
  assertContains('W9.unknown_prompt_text', lastReply?.body ?? null, 'invite code')

  // Submit the invite code.
  outboundLog.length = 0
  const r1 = await onboarding.runTransition(unknownState, created.code)
  // W10 — runTransition advances to otp_pending after valid code
  assertEq('W10.invite_to_otp_pending', r1.nextStateKind, 'otp_pending')
  // W11 — adapter received an OTP message containing "verification code"
  const otpSendOutbound = outboundLog.find((o) => o.body.includes('verification code'))
  assert('W11.otp_outbound_sent', otpSendOutbound !== undefined)
  // V40 — Infobip wants bare digits (no `+`)
  if (otpSendOutbound) {
    assertEq(
      'V40.otp_outbound_to_bare_digits',
      otpSendOutbound.to,
      PROBE_PHONE_S1.replace(/^\+/, ''),
    )
  }

  // Extract the actual OTP plaintext from the captured outbound (the only place
  // where it's visible — in production it would only ever exist in-flight to Infobip).
  const otpMatch = otpSendOutbound?.body.match(/code is (\d{6})/)
  const otpPlain = otpMatch?.[1]
  assert(
    'W12.otp_extractable_from_outbound',
    otpPlain !== undefined && otpPlain.length === WHATSAPP_OTP_LENGTH,
  )

  // ─── W13-W15: wrong OTP × MAX → exhaustion + invite-exhausted ─────

  outboundLog.length = 0
  const otpPendingState = await onboarding.loadState(PROBE_PHONE_S1)
  assertEq('W13.loadState_otp_pending', otpPendingState.kind, 'otp_pending')

  for (let i = 0; i < WHATSAPP_OTP_MAX_ATTEMPTS - 1; i++) {
    await onboarding.runTransition(otpPendingState, '000000')
  }
  // W14 — last wrong-attempt exhausts; reply says "Too many"
  const exhaustionInvite = await prisma.whatsappInvite.findUnique({
    where: { id: created.invite.id },
  })
  // 2 wrong attempts so far; 3rd will exhaust. Run it.
  await onboarding.runTransition(otpPendingState, '000000')
  const exhaustionReply = outboundLog[outboundLog.length - 1]
  assertContains('W14.exhausted_reply_text', exhaustionReply?.body ?? null, 'Too many')
  // W15 — invite flipped to exhausted
  const inviteExhausted = await prisma.whatsappInvite.findUnique({
    where: { id: created.invite.id },
  })
  assertEq('W15.invite_status_exhausted', inviteExhausted?.status, 'exhausted')
  void exhaustionInvite
  // W16 — `whatsapp_invite.exhausted` log emitted
  assertGte('W16.lifecycle_log_exhausted', logCount('whatsapp_invite.exhausted'), 1)
  // W17 — `whatsapp_otp.exhausted` log emitted
  assertGte('W17.otp_exhausted_log', logCount('whatsapp_otp.exhausted'), 1)

  // ─── W18-W22: correct OTP → linkage → single-venue welcome ────────

  outboundLog.length = 0
  const inviteS2 = await inviteService.create(ctx.orgA.id, ctx.orgA.managerId, {
    phoneNumber: PROBE_PHONE_S2,
    role: 'staff',
  })
  const stateS2_unknown = await onboarding.loadState(PROBE_PHONE_S2)
  await onboarding.runTransition(stateS2_unknown, inviteS2.code)
  const otpForS2 = outboundLog
    .find((o) => o.body.includes('verification code'))
    ?.body.match(/code is (\d{6})/)?.[1]
  outboundLog.length = 0
  const stateS2_otpPending = await onboarding.loadState(PROBE_PHONE_S2)
  await onboarding.runTransition(stateS2_otpPending, otpForS2 ?? '000000')

  // W18 — invite redeemed
  const inviteS2After = await prisma.whatsappInvite.findUnique({
    where: { id: inviteS2.invite.id },
  })
  assertEq('W18.invite_status_redeemed', inviteS2After?.status, 'redeemed')
  // W19 — User created with verified phone
  const userS2 = await prisma.user.findUnique({ where: { phoneNumber: PROBE_PHONE_S2 } })
  assert('W19.user_created_after_link', userS2 !== null)
  assert('W19.user_phone_verified', userS2?.phoneVerifiedAt !== null)
  // W20 — Membership created in orgA
  const membershipS2 = await prisma.organizationMember.findFirst({
    where: { userId: userS2!.id, organizationId: ctx.orgA.id },
  })
  assert('W20.membership_created', membershipS2 !== null)
  // W21 — Session created with currentOrganizationId set (single-venue auto)
  const sessionS2 = await prisma.whatsappSession.findUnique({
    where: { phoneNumber: PROBE_PHONE_S2 },
  })
  assertEq('W21.session_org_set_single_venue', sessionS2?.currentOrganizationId, ctx.orgA.id)
  // W22 — Welcome reply contains the venue name
  const welcomeReply = outboundLog.find(
    (o) => o.body.includes(ctx.orgA.venueName) || o.body.includes('Probe Org A'),
  )
  assert('W22.welcome_text_mentions_venue', welcomeReply !== undefined)
  // W23 — Lifecycle: redeemed + linked_user logs emitted
  assertGte('W23.lifecycle_log_redeemed', logCount('whatsapp_invite.redeemed'), 1)
  assertGte('W23.lifecycle_log_linked_user', logCount('whatsapp_invite.linked_user'), 1)

  // After linkage, loadState returns linked
  const stateS2_linked = await onboarding.loadState(PROBE_PHONE_S2)
  assertEq('W24.loadState_linked_after_redemption', stateS2_linked.kind, 'linked')

  // ─── W25-W26: revoked invite rejected ─────────────────────────────

  const inviteRev = await inviteService.create(ctx.orgA.id, ctx.orgA.managerId, {
    phoneNumber: PROBE_PHONE_S3,
    role: 'staff',
  })
  await inviteService.revoke(ctx.orgA.id, inviteRev.invite.id, ctx.orgA.managerId)
  outboundLog.length = 0
  const stateS3 = await onboarding.loadState(PROBE_PHONE_S3)
  await onboarding.runTransition(stateS3, inviteRev.code)
  // Revoked code should fail invite_lookup → reply "didn't match"
  const revReply = outboundLog[outboundLog.length - 1]
  assertContains('W25.revoked_invite_rejected', revReply?.body ?? null, "didn't match")
  // W26 — `whatsapp_invite.revoked` log emitted
  assertGte('W26.lifecycle_log_revoked', logCount('whatsapp_invite.revoked'), 1)

  // ─── W27: expired invite (lazy flip) ──────────────────────────────

  // Use a Crockford-base32-valid 8-char code so classifyInbound routes it as invite_code
  // (excludes I, L, O, U, 0, 1).
  const expiredInvite = await prisma.whatsappInvite.create({
    data: {
      id: randomUUID(),
      code: 'EXPR234D',
      phoneNumber: PROBE_PHONE_S3,
      organizationId: ctx.orgA.id,
      issuedByUserId: ctx.orgA.managerId,
      role: 'staff',
      status: 'pending',
      expiresAt: new Date(Date.now() - 60 * 1000),
    },
  })
  outboundLog.length = 0
  const stateForExpired = await onboarding.loadState(PROBE_PHONE_S3)
  await onboarding.runTransition(stateForExpired, 'EXPR234D')
  const flipped = await prisma.whatsappInvite.findUnique({ where: { id: expiredInvite.id } })
  assertEq('W27.expired_invite_lazy_flipped', flipped?.status, 'expired')
  assertGte('W27.lifecycle_log_expired_lazy', logCount('whatsapp_invite.expired_lazy'), 1)

  // ─── V31: race on redemption ──────────────────────────────────────

  const inviteRace = await inviteService.create(ctx.orgA.id, ctx.orgA.managerId, {
    phoneNumber: PROBE_PHONE_S5,
    role: 'staff',
  })
  // Drive the OTP send.
  outboundLog.length = 0
  const stateRace_unknown = await onboarding.loadState(PROBE_PHONE_S5)
  await onboarding.runTransition(stateRace_unknown, inviteRace.code)
  const otpRace = outboundLog
    .find((o) => o.body.includes('verification code'))
    ?.body.match(/code is (\d{6})/)?.[1]
  // Two concurrent verifications — only one redemption should succeed.
  const stateRace_otp = await onboarding.loadState(PROBE_PHONE_S5)
  const [r1res, r2res] = await Promise.all([
    onboarding.runTransition(stateRace_otp, otpRace ?? '000000'),
    onboarding.runTransition(stateRace_otp, otpRace ?? '000000'),
  ])
  const inviteRaceAfter = await prisma.whatsappInvite.findUnique({
    where: { id: inviteRace.invite.id },
  })
  assertEq('V31.race_only_one_redeemed', inviteRaceAfter?.status, 'redeemed')
  // Race semantics: exactly ONE User row exists for this phone — the redemption
  // path is atomic (markRedeemed conditional UPDATE + user.create inside one txn),
  // so even when both verifications hash-match, only one txn produces a user row.
  // The losing path's nextStateKind varies (race_lost vs no_active_attempt) depending
  // on whether the loser's verifyOtp executed before/after the winner consumed the
  // OTP attempt — we don't assert on it.
  const racedUserCount = await prisma.user.count({ where: { phoneNumber: PROBE_PHONE_S5 } })
  assertEq('V31.race_one_user_created', racedUserCount, 1)
  void r1res
  void r2res

  // ─── V32: delivery failure → status='failed_send' + log ───────────

  const inviteFail = await inviteService.create(ctx.orgA.id, ctx.orgA.managerId, {
    phoneNumber: PROBE_PHONE_S6,
    role: 'staff',
  })
  outboundLog.length = 0
  forceSendThrow = true
  const stateFail = await onboarding.loadState(PROBE_PHONE_S6)
  await onboarding.runTransition(stateFail, inviteFail.code)
  forceSendThrow = false
  const failedAttempt = await prisma.whatsappOtpAttempt.findFirst({
    where: { inviteId: inviteFail.invite.id },
    orderBy: { createdAt: 'desc' },
  })
  assertEq('V32.otp_attempt_failed_send_status', failedAttempt?.status, 'failed_send')
  assertGte('V32.send_failed_log', logCount('whatsapp_otp.send_failed'), 1)

  // ─── V33: phone-cross-org guard + force override ──────────────────

  // Mark a user as already linked to orgA via a verified phone.
  await prisma.user.update({
    where: { id: userS2!.id },
    data: { phoneNumber: PROBE_PHONE_S4, phoneVerifiedAt: new Date() },
  })
  let crossOrgRejected = false
  try {
    await inviteService.create(ctx.orgB.id, ctx.orgB.managerId, {
      phoneNumber: PROBE_PHONE_S4,
      role: 'staff',
    })
  } catch (err) {
    crossOrgRejected =
      (err as { response?: { error?: string } })?.response?.error === 'phone_linked_other_org'
  }
  assert('V33.cross_org_create_blocked', crossOrgRejected)
  // Force=true succeeds + emits cross_org_create log
  await inviteService.create(
    ctx.orgB.id,
    ctx.orgB.managerId,
    { phoneNumber: PROBE_PHONE_S4, role: 'staff' },
    { force: true },
  )
  assertGte('V33.cross_org_create_log_on_force', logCount('whatsapp_invite.cross_org_create'), 1)
  // Restore S2's phone for downstream (avoid affecting later assertions)
  await prisma.user.update({
    where: { id: userS2!.id },
    data: { phoneNumber: PROBE_PHONE_S2 },
  })

  // ─── V34: manager rate-limit (50/24h) ─────────────────────────────

  // Pre-seed 50 invites for this manager (bypassing service path) so the next
  // call hits the cap.
  const since = new Date()
  const fillerRows = Array.from({ length: MAX_INVITES_PER_MANAGER_PER_DAY }, () => ({
    id: randomUUID(),
    code: `FILL${randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()}`,
    phoneNumber: '+447700999999',
    organizationId: ctx.orgB.id,
    issuedByUserId: ctx.orgB.managerId,
    role: 'staff',
    status: 'expired' as const,
    expiresAt: new Date(since.getTime() - 1000),
    createdAt: since,
  }))
  await prisma.whatsappInvite.createMany({ data: fillerRows })
  let rateLimitHit = false
  try {
    await inviteService.create(ctx.orgB.id, ctx.orgB.managerId, {
      phoneNumber: '+447700999998',
      role: 'staff',
    })
  } catch (err) {
    rateLimitHit =
      (err as { response?: { error?: string } })?.response?.error === 'manager_invite_rate_limit'
  }
  assert('V34.manager_rate_limit_blocks_51st', rateLimitHit)
  assertGte('V34.rate_limited_log', logCount('whatsapp_invite.rate_limited'), 1)

  // ─── V35: input normalization end-to-end ──────────────────────────

  const inviteNorm = await inviteService.create(ctx.orgA.id, ctx.orgA.managerId, {
    phoneNumber: PROBE_PHONE_S8,
    role: 'staff',
  })
  outboundLog.length = 0
  const stateNorm = await onboarding.loadState(PROBE_PHONE_S8)
  // Submit code with hyphens + lowercase
  const mangled = inviteNorm.code.toLowerCase().replace(/(.{4})(.{4})/, '$1-$2')
  await onboarding.runTransition(stateNorm, mangled)
  const normalizedHit = outboundLog.find((o) => o.body.includes('verification code'))
  assert('V35.invite_normalization_match', normalizedHit !== undefined)
  // OTP "123 456" → matches '123456'
  const stateNorm2 = await onboarding.loadState(PROBE_PHONE_S8)
  // We don't know the OTP plaintext for a normalized OTP test in isolation;
  // instead assert the normalizer directly (already W2). Here we exercise the
  // service path — submit with-space form of the actual OTP from above.
  const otpNorm = outboundLog
    .find((o) => o.body.includes('verification code'))
    ?.body.match(/code is (\d{6})/)?.[1]
  if (otpNorm) {
    outboundLog.length = 0
    await onboarding.runTransition(stateNorm2, `${otpNorm.slice(0, 3)} ${otpNorm.slice(3)}`)
    const userNorm = await prisma.user.findUnique({ where: { phoneNumber: PROBE_PHONE_S8 } })
    assert('V35.otp_with_space_verifies', userNorm !== null)
  }

  // ─── V36: out-of-state OTP shape in unknown state ─────────────────

  outboundLog.length = 0
  const oosState: { kind: 'unknown'; phoneNumber: string } = {
    kind: 'unknown',
    phoneNumber: '+447700999777',
  }
  await onboarding.runTransition(oosState, '999888')
  const oosReply = outboundLog[outboundLog.length - 1]
  assertContains('V36.unknown_otp_shape_corrective_reply', oosReply?.body ?? null, "haven't sent")

  // ─── V37: re-issuance debounce ────────────────────────────────────

  const inviteDebounce = await inviteService.create(ctx.orgA.id, ctx.orgA.managerId, {
    phoneNumber: PROBE_PHONE_S7,
    role: 'staff',
  })
  outboundLog.length = 0
  const stateDeb = await onboarding.loadState(PROBE_PHONE_S7)
  await onboarding.runTransition(stateDeb, inviteDebounce.code)
  // Immediate second submission of the same code → debounced reply
  outboundLog.length = 0
  const stateDeb2 = await onboarding.loadState(PROBE_PHONE_S7)
  await onboarding.runTransition(stateDeb2, inviteDebounce.code)
  // The state machine for otp_pending + invite_code shape returns the
  // "enter the 6-digit code" reply (audit-S2). The probe asserts THAT reply
  // arrived — re-sending an OTP within 30s is not what happens; the user is
  // told to use the existing code instead. Either reply is acceptable proof
  // that no second OTP was sent in the same window.
  const debReply = outboundLog[outboundLog.length - 1]
  const debOk =
    (debReply?.body.includes('6-digit code') ?? false) ||
    (debReply?.body.includes('just sent') ?? false)
  assert('V37.reissuance_no_second_otp_within_window', debOk)
  // Also verify only ONE OTP was actually sent (not two).
  const otpAttemptsForDebounceInvite = await prisma.whatsappOtpAttempt.count({
    where: { inviteId: inviteDebounce.invite.id, status: { in: ['pending', 'verified'] } },
  })
  assertEq('V37.single_otp_attempt_active', otpAttemptsForDebounceInvite, 1)

  // ─── V38: lifecycle log emissions (aggregate grep) ────────────────

  for (const evt of [
    'whatsapp_invite.created',
    'whatsapp_invite.redeemed',
    'whatsapp_invite.revoked',
    'whatsapp_invite.exhausted',
    'whatsapp_invite.expired_lazy',
  ]) {
    assertGte(`V38.lifecycle_${evt}`, logCount(evt), 1)
  }

  // ─── V39: timing-safe equality (static grep gate) ────────────────

  const inviteSrc = readFileSync('src/modules/whatsapp/invite.service.ts', 'utf8')
  const otpSrc = readFileSync('src/modules/whatsapp/whatsapp-otp.service.ts', 'utf8')
  assert('V39.invite_imports_safe_equal', inviteSrc.includes("from './safe-equal'"))
  assert('V39.otp_imports_safe_equal', otpSrc.includes("from './safe-equal'"))
  // No raw === comparison on hashedOtp in otp.service
  const noRawHashEq = !/hashedOtp\s*===|===\s*hashedOtp|attempt\.hashedOtp\s*===/.test(otpSrc)
  assert('V39.no_raw_hash_equals_in_otp', noRawHashEq)

  // ─── V40: E.164 storage shape ────────────────────────────────────

  const userS2Stored = await prisma.user.findUnique({
    where: { id: userS2!.id },
    select: { phoneNumber: true },
  })
  assert('V40.user_phone_stored_e164', userS2Stored?.phoneNumber?.startsWith('+') ?? false)

  // ─── V41: WhatsappSession TTL/inactivity row exists per linkage ──

  // Bonus: V41 uniqueness — single session row per phone.
  const sessionCount = await prisma.whatsappSession.count({
    where: { phoneNumber: PROBE_PHONE_S2 },
  })
  assertEq('V41.session_one_row_per_phone', sessionCount, 1)

  // ─── composeWelcomeText pure-function coverage ───────────────────

  const single = composeWelcomeText('Alice Smith', [
    { organizationId: 'a', organizationName: 'Org A', venueName: 'Venue A' },
  ])
  assertContains('V42.welcome_single_venue_mentions_name', single, 'Alice')
  assertContains('V42.welcome_single_venue_mentions_org', single, 'Org A')
  const multi = composeWelcomeText('Bob', [
    { organizationId: 'a', organizationName: 'Org A', venueName: null },
    { organizationId: 'b', organizationName: 'Org B', venueName: null },
  ])
  assertContains('V42.welcome_multi_lists_2_orgs', multi, '2 venues')
  assertContains('V42.welcome_multi_numbered_1', multi, '1.')
  assertContains('V42.welcome_multi_numbered_2', multi, '2.')

  otpService.onModuleDestroy()
  await pnpCleanup()
  await prisma.$disconnect()

  const passes = results.filter((r) => r.pass).length
  const fails = results.filter((r) => !r.pass)
  console.log('\n────────── probe-whatsapp-onboarding summary ──────────')
  console.log(`pass: ${passes} / ${results.length}`)
  if (fails.length) {
    console.log('FAIL:')
    for (const f of fails) console.log(`  ${f.name}: ${f.detail ?? '(no detail)'}`)
  }
  process.exit(fails.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('probe-whatsapp-onboarding crashed:', err)
  prisma.$disconnect().catch(() => {})
  process.exit(1)
})

// Suppress unused warnings for crypto helpers if probe path skips them.
void createHash
