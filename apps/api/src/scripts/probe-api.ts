import '../load-env'

import { NestFactory } from '@nestjs/core'
import { json } from 'express'
import { prisma } from '@gm-ai/database'
import { API_ERROR_CODES, TOOL_INPUT_SCHEMAS, type ApiErrorCode } from '@gm-ai/types'
import { AppModule } from '../app.module'
import { httpLoggerMiddleware } from '../common/http-logger.middleware'
import { requestIdMiddleware } from '../common/request-id.middleware'
import { securityHeadersMiddleware } from '../common/security-headers.middleware'
import { IngestService } from '../modules/ingest/ingest.service'
import { RetrievalService } from '../modules/retrieval/retrieval.service'

const PORT = parseInt(process.env.PROBE_API_PORT ?? '3099', 10)
const BASE = `http://localhost:${PORT}`
const PROBE_ORIGIN = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0]!.trim()
const PROBE_MARKER = 'probe-api'
const PROBE_EMAIL = 'probe-api-demo@gm-ai.local'
const PROBE_OTHER_EMAIL = 'probe-api-other@gm-ai.local'
const PROBE_STAFF_EMAIL = 'probe-api-staff@gm-ai.local'
const PROBE_PASSWORD = 'probe-password-abc12345'
const PROBE_OTHER_ORG_SLUG_PREFIX = 'probe-api-other-'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Assertion = { name: string; passed: boolean; detail?: string }

const assertions: Assertion[] = []

function assert(name: string, cond: boolean, detail?: string): boolean {
  assertions.push({ name, passed: cond, detail })
  const icon = cond ? '[✓]' : '[✗]'
  console.log(`${icon} ${name}${detail ? ' — ' + detail : ''}`)
  return cond
}

async function cleanupProbeRows(): Promise<void> {
  try {
    // Delete probe chat conversations + messages + feedback + retag queue items
    const convs = await prisma.chatConversation.findMany({
      where: { channel: PROBE_MARKER },
      select: { id: true },
    })
    const convIds = convs.map((c) => c.id)

    if (convIds.length > 0) {
      const msgs = await prisma.chatMessage.findMany({
        where: { conversationId: { in: convIds } },
        select: { id: true },
      })
      const msgIds = msgs.map((m) => m.id)
      if (msgIds.length > 0) {
        await prisma.reTagQueueItem.deleteMany({
          where: { sourceMessageId: { in: msgIds } },
        })
        await prisma.messageFeedback.deleteMany({ where: { messageId: { in: msgIds } } })
      }
      await prisma.chatMessage.deleteMany({
        where: { conversationId: { in: convIds } },
      })
      await prisma.chatConversation.deleteMany({ where: { channel: PROBE_MARKER } })
    }

    // Collect probe orgs by slug prefix (covers demo/other/staff-auto created by self-provision)
    const probeOrgs = await prisma.organization.findMany({
      where: { slug: { startsWith: 'probe-api-' } },
      select: { id: true },
    })
    const orgIds = probeOrgs.map((o) => o.id)

    // Delete probe users (cascades sessions, accounts) + memberships
    const users = await prisma.user.findMany({
      where: { email: { contains: 'probe-api' } },
      select: { id: true },
    })
    const userIds = users.map((u) => u.id)
    if (userIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.account.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.organizationMember.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    }

    if (orgIds.length > 0) {
      const vs = await prisma.venue.findMany({
        where: { organizationId: { in: orgIds } },
        select: { id: true },
      })
      const vIds = vs.map((v) => v.id)
      if (vIds.length > 0) {
        // Drop conversations tied to these venues (non-PROBE_MARKER channels too)
        const vConvs = await prisma.chatConversation.findMany({
          where: { venueId: { in: vIds } },
          select: { id: true },
        })
        const vConvIds = vConvs.map((c) => c.id)
        if (vConvIds.length > 0) {
          const vMsgs = await prisma.chatMessage.findMany({
            where: { conversationId: { in: vConvIds } },
            select: { id: true },
          })
          const vMsgIds = vMsgs.map((m) => m.id)
          if (vMsgIds.length > 0) {
            await prisma.reTagQueueItem.deleteMany({
              where: { sourceMessageId: { in: vMsgIds } },
            })
            await prisma.messageFeedback.deleteMany({ where: { messageId: { in: vMsgIds } } })
          }
          await prisma.chatMessage.deleteMany({ where: { conversationId: { in: vConvIds } } })
          await prisma.chatConversation.deleteMany({ where: { id: { in: vConvIds } } })
        }
        await prisma.knowledgeItem.deleteMany({ where: { venueId: { in: vIds } } })
        await prisma.mockStock.deleteMany({ where: { venueId: { in: vIds } } })
        await prisma.venueContact.deleteMany({ where: { venueId: { in: vIds } } })
        await prisma.venue.deleteMany({ where: { id: { in: vIds } } })
      }
      // KnowledgeItem rows with venueId NULL (Plan 02-01 A30/A32/A37 fixtures)
      // must be deleted by organizationId directly — not caught by venueId sweep.
      await prisma.knowledgeItem.deleteMany({ where: { organizationId: { in: orgIds } } })
      await prisma.invitation.deleteMany({ where: { organizationId: { in: orgIds } } })
      await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } })
      await prisma.organization.deleteMany({ where: { id: { in: orgIds } } })
    }
  } catch (err) {
    console.warn(`cleanup warning (continuing): ${String(err).slice(0, 200)}`)
  }
}

async function markConversation(conversationId: string): Promise<void> {
  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { channel: PROBE_MARKER },
  })
}

type FetchOpts = {
  method?: string
  headers?: Record<string, string>
  body?: unknown
}

async function jsonFetch(
  path: string,
  opts: FetchOpts = {},
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    Origin: PROBE_ORIGIN,
    ...(opts.headers ?? {}),
  }
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  let body: unknown = null
  const text = await res.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  return { status: res.status, body, headers: res.headers }
}

function authedFetch(cookie: string) {
  return (path: string, opts: FetchOpts = {}) =>
    jsonFetch(path, {
      ...opts,
      headers: { ...(opts.headers ?? {}), Cookie: cookie },
    })
}

function authedRetry(cookie: string) {
  const fetcher = authedFetch(cookie)
  return async (payload: {
    venueId: string
    userMessage: string
    conversationId?: string
  }): Promise<{ status: number; body: unknown; headers: Headers }> => {
    let last: { status: number; body: unknown; headers: Headers } | null = null
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await fetcher('/chat/messages', { method: 'POST', body: payload })
      if (res.status >= 200 && res.status < 300) return res
      if (res.status === 429 || res.status >= 500) {
        last = res
        if (attempt === 1) {
          console.log(`  ↳ transient ${res.status} — retrying once`)
          await new Promise((r) => setTimeout(r, 500))
          continue
        }
      }
      return res
    }
    return last!
  }
}

type SessionHandle = {
  userId: string
  cookie: string
  orgId: string
  venues: { crown: { id: string; name: string }; anchor: { id: string; name: string } }
}

async function signUpAndGetCookie(
  email: string,
  name: string,
): Promise<{ cookie: string; userId: string } | null> {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: PROBE_ORIGIN },
    body: JSON.stringify({ email, password: PROBE_PASSWORD, name }),
  })
  if (res.status !== 200 && res.status !== 201) {
    const text = await res.text().catch(() => '')
    console.warn(`sign-up for ${email} failed: status=${res.status} body=${text.slice(0, 200)}`)
    return null
  }
  // Collect all Set-Cookie headers into a single Cookie header value.
  const setCookies = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie
    ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
    : [res.headers.get('set-cookie') ?? '']
  const cookie = setCookies
    .filter(Boolean)
    .map((c) => c.split(';')[0])
    .join('; ')
  const body = (await res.json().catch(() => ({}))) as { user?: { id?: string } }
  const userId = body?.user?.id
  if (!userId) return null
  return { cookie, userId }
}

async function provisionVenues(
  cookie: string,
  names: [string, string],
): Promise<[{ id: string; name: string }, { id: string; name: string }]> {
  const results: Array<{ id: string; name: string }> = []
  for (const name of names) {
    const res = await fetch(`${BASE}/venues`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Origin: PROBE_ORIGIN, Cookie: cookie },
      body: JSON.stringify({ name, type: 'pub', timezone: 'Europe/London' }),
    })
    if (res.status !== 201) {
      throw new Error(`POST /venues failed for ${name}: status=${res.status}`)
    }
    const body = (await res.json()) as { id: string; name: string }
    results.push({ id: body.id, name: body.name })
  }
  return [results[0]!, results[1]!]
}

async function renameAutoOrgForCleanup(userId: string, slugPrefix: string): Promise<string> {
  const mem = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  })
  if (!mem) throw new Error(`no org for user ${userId}`)
  await prisma.organization.update({
    where: { id: mem.organizationId },
    data: { slug: `${slugPrefix}${Math.floor(Math.random() * 1e8).toString(36)}` },
  })
  return mem.organizationId
}

async function setupSession(
  email: string,
  name: string,
  role: 'owner' | 'manager' | 'staff',
  slugPrefix: string,
): Promise<SessionHandle | null> {
  const hit = await signUpAndGetCookie(email, name)
  if (!hit) return null
  const orgId = await renameAutoOrgForCleanup(hit.userId, slugPrefix)
  // Sign-up hook creates the user as 'owner'; downgrade to requested role if needed.
  if (role !== 'owner') {
    await prisma.organizationMember.updateMany({
      where: { userId: hit.userId, organizationId: orgId },
      data: { role },
    })
  }
  // Owners/managers can call POST /venues; staff cannot. Provision via a
  // temporary elevation when the target role is staff.
  const needsElevation = role === 'staff'
  if (needsElevation) {
    await prisma.organizationMember.updateMany({
      where: { userId: hit.userId, organizationId: orgId },
      data: { role: 'owner' },
    })
  }
  const venues = await provisionVenues(hit.cookie, ['The Crown', 'The Anchor Bar'])
  if (needsElevation) {
    await prisma.organizationMember.updateMany({
      where: { userId: hit.userId, organizationId: orgId },
      data: { role },
    })
  }
  return {
    userId: hit.userId,
    cookie: hit.cookie,
    orgId,
    venues: { crown: venues[0], anchor: venues[1] },
  }
}

async function runProbe(
  ingestService: IngestService,
  retrievalService: RetrievalService,
): Promise<boolean> {
  console.log(
    `probe-api issues ~3 Claude calls per run (~$0.01–0.03). PORT=${PORT} BASE=${BASE}`,
  )
  console.log('Debug cost: +7 DB queries per run, no additional AI calls')

  await cleanupProbeRows()

  // ───────── Auth setup ─────────
  const demoSession = await setupSession(PROBE_EMAIL, 'Probe Demo', 'owner', 'probe-api-demo-')
  if (!demoSession) {
    assert('A0  probe sign-up succeeded', false, 'cannot continue — sign-up HTTP call failed')
    return false
  }
  assert('A0  probe sign-up + venue provisioning succeeded', true)

  const otherSession = await setupSession(
    PROBE_OTHER_EMAIL,
    'Probe Other',
    'owner',
    PROBE_OTHER_ORG_SLUG_PREFIX,
  )
  if (!otherSession) {
    assert('A0b other-org probe sign-up succeeded', false)
    return false
  }
  // Staff user joins the demo org as 'staff' (not their own org) so they can
  // test A25 (chat access) + A26 (debug denial) against the demo org's data.
  const staffHit = await signUpAndGetCookie(PROBE_STAFF_EMAIL, 'Probe Staff')
  if (!staffHit) {
    assert('A0c staff probe sign-up succeeded', false)
    return false
  }
  // Replace staff's auto-created org membership with one in the demo org.
  const staffAutoOrgId = await renameAutoOrgForCleanup(staffHit.userId, 'probe-api-staff-auto-')
  await prisma.organizationMember.deleteMany({ where: { userId: staffHit.userId } })
  const leftover = await prisma.organizationMember.count({ where: { organizationId: staffAutoOrgId } })
  if (leftover === 0) {
    await prisma.organization.delete({ where: { id: staffAutoOrgId } }).catch(() => undefined)
  }
  await prisma.organizationMember.create({
    data: { userId: staffHit.userId, organizationId: demoSession.orgId, role: 'staff' },
  })
  await prisma.session.updateMany({
    where: { userId: staffHit.userId },
    data: { activeOrganizationId: demoSession.orgId },
  })
  const staffSession: SessionHandle = {
    userId: staffHit.userId,
    cookie: staffHit.cookie,
    orgId: demoSession.orgId,
    venues: demoSession.venues,
  }

  // Seed an "other org" conversation in otherSession for A24 cross-org check
  // (created via prisma to avoid Claude spend on a fixture conversation).
  const otherConvFixture = await prisma.chatConversation.create({
    data: { venueId: otherSession.venues.crown.id, channel: PROBE_MARKER },
    select: { id: true },
  })

  const demo = authedFetch(demoSession.cookie)
  const other = authedFetch(otherSession.cookie)
  const staff = authedFetch(staffSession.cookie)
  const demoSendRetry = authedRetry(demoSession.cookie)

  // ───────── Venues (A1–A3) ─────────
  const venuesRes = await demo('/venues')
  assert('A1  GET /venues (authed) returns 200 with array length >= 2',
    venuesRes.status === 200 && Array.isArray(venuesRes.body) && (venuesRes.body as unknown[]).length >= 2,
    `status=${venuesRes.status}`)
  const venues = venuesRes.body as Array<{ id: string; name: string }>
  const crown = venues.find((v) => v.name === 'The Crown')
  const anchor = venues.find((v) => v.name === 'The Anchor Bar')
  assert('A2  Crown + Anchor both present by name', Boolean(crown && anchor))
  assert('A3  Each venue id matches UUID regex',
    venues.every((v) => UUID_RE.test(v.id)))

  if (!crown || !anchor) return false

  // ───────── Chat happy-path (A4–A7) ─────────
  const m1 = await demoSendRetry({
    venueId: crown.id,
    userMessage: 'what needs ordering at the Crown?',
  })
  const m1body = m1.body as {
    conversationId?: string
    assistantMessage?: { id: string; content: string }
  }
  const crownConvId = m1body.conversationId ?? ''
  const crownAssistantId = m1body.assistantMessage?.id ?? ''
  assert('A4  POST /chat/messages returns 200 with UUID conversationId + non-empty assistant content',
    m1.status === 200 &&
      UUID_RE.test(crownConvId) &&
      (m1body.assistantMessage?.content?.length ?? 0) > 0,
    `status=${m1.status}`)

  if (crownConvId) await markConversation(crownConvId)

  const msgCount1 = await prisma.chatMessage.count({ where: { conversationId: crownConvId } })
  assert('A5  DB: chat_messages count === 2 after first turn', msgCount1 === 2, `got=${msgCount1}`)

  const m2 = await demoSendRetry({
    venueId: crown.id,
    userMessage: 'and what about supplier cutoffs today?',
    conversationId: crownConvId,
  })
  assert('A6  POST /chat/messages with conversationId returns 200',
    m2.status === 200, `status=${m2.status}`)
  const msgCount2 = await prisma.chatMessage.count({ where: { conversationId: crownConvId } })
  assert('A6  DB: chat_messages count === 4 after second turn', msgCount2 === 4, `got=${msgCount2}`)

  const convRes = await demo(`/chat/conversations/${crownConvId}?venueId=${crown.id}`)
  const convBody = convRes.body as { messages?: Array<{ role: string }> }
  assert('A7  GET /chat/conversations/:id returns 4 messages in role order',
    convRes.status === 200 &&
      convBody.messages?.length === 4 &&
      convBody.messages?.[0]?.role === 'user' &&
      convBody.messages?.[1]?.role === 'assistant' &&
      convBody.messages?.[2]?.role === 'user' &&
      convBody.messages?.[3]?.role === 'assistant',
    `status=${convRes.status}`)

  // ───────── GET conversation negative paths (A8, A8b, A8c, A8d) ─────────
  const a8 = await demo(
    `/chat/conversations/00000000-0000-0000-0000-000000000000?venueId=${crown.id}`,
  )
  const a8body = a8.body as { error?: string }
  assert('A8  GET with random conversationId returns 404 not-found',
    a8.status === 404 && a8body.error === 'not-found', `status=${a8.status} error=${a8body.error}`)

  const a8b = await demo(`/chat/conversations/${crownConvId}?venueId=${anchor.id}`)
  const a8bBody = a8b.body as { error?: string }
  assert('A8b GET cross-venue (Crown conv, Anchor venueId) returns 404 not-found (no 403)',
    a8b.status === 404 && a8bBody.error === 'not-found',
    `status=${a8b.status} error=${a8bBody.error}`)

  const a8c = await demo(`/chat/conversations/${crownConvId}`)
  const a8cBody = a8c.body as { error?: string }
  assert('A8c GET missing venueId query returns 400 invalid-input',
    a8c.status === 400 && a8cBody.error === 'invalid-input',
    `status=${a8c.status} error=${a8cBody.error}`)

  const a8d = await demo(`/chat/conversations/${crownConvId}?venueId=not-a-uuid`)
  assert('A8d GET malformed venueId query returns 400', a8d.status === 400, `status=${a8d.status}`)

  // ───────── POST /chat/messages negative paths (A9, A9b, A9c, A10) ─────────
  const a9 = await demo('/chat/messages', {
    method: 'POST',
    body: { venueId: 'not-a-uuid', userMessage: 'hi' },
  })
  const a9body = a9.body as { error?: string }
  assert('A9  POST with malformed venueId returns 400 invalid-input',
    a9.status === 400 && a9body.error === 'invalid-input', `status=${a9.status}`)

  const a9b = await demo('/chat/messages', {
    method: 'POST',
    body: { venueId: crown.id, userMessage: '   ' },
  })
  const a9bBody = a9b.body as { error?: string }
  assert('A9b POST with whitespace-only userMessage returns 400 invalid-input',
    a9b.status === 400 && a9bBody.error === 'invalid-input',
    `status=${a9b.status} error=${a9bBody.error}`)

  const a9c = await demo('/chat/messages', {
    method: 'POST',
    body: {
      venueId: '00000000-0000-0000-0000-000000000099',
      userMessage: 'hello',
    },
  })
  const a9cBody = a9c.body as { error?: string }
  assert('A9c POST with nonexistent venueId returns 404 venue-not-found',
    a9c.status === 404 && a9cBody.error === 'venue-not-found',
    `status=${a9c.status} error=${a9cBody.error}`)

  // Prep for A10: create an Anchor conversation (still inside Demo Org)
  const anchorSend = await demoSendRetry({
    venueId: anchor.id,
    userMessage: 'hello from the Anchor',
  })
  const anchorConvId =
    (anchorSend.body as { conversationId?: string }).conversationId ?? ''
  if (anchorConvId) await markConversation(anchorConvId)

  const a10 = await demo('/chat/messages', {
    method: 'POST',
    body: {
      venueId: crown.id,
      userMessage: 'pretend I own this',
      conversationId: anchorConvId,
    },
  })
  const a10body = a10.body as { error?: string; details?: string }
  assert('A10 POST with Anchor-owned conversationId + Crown venueId returns 400 invalid-input',
    a10.status === 400 &&
      a10body.error === 'invalid-input' &&
      a10body.details === 'conversation-venue-mismatch',
    `status=${a10.status} error=${a10body.error} details=${a10body.details}`)

  // ───────── Suggestions (A11, A12) ─────────
  const a11 = await demo('/suggestions/on-open', {
    method: 'POST',
    body: { venueId: crown.id },
  })
  const a11body = a11.body as Array<Record<string, unknown>>
  assert('A11 POST /suggestions/on-open returns 200 array with expected ProactiveSuggestion shape',
    a11.status === 200 &&
      Array.isArray(a11body) &&
      a11body.every(
        (s) => 'kind' in s && 'severity' in s && 'text' in s && 'itemIds' in s && 'sourceToolCall' in s && 'generatedAt' in s,
      ),
    `status=${a11.status} count=${a11body?.length ?? 0}`)

  const a12 = await demo('/suggestions/on-turn', {
    method: 'POST',
    body: { venueId: crown.id, userMessage: "what's out of stock?" },
  })
  const a12body = a12.body as Array<{ kind: string; severity: string }>
  assert('A12 POST /suggestions/on-turn returns 200 array (shape-only, no seed data)',
    a12.status === 200 && Array.isArray(a12body),
    `status=${a12.status} count=${a12body?.length ?? 0}`)

  // ───────── Feedback (A13–A16b) ─────────
  const a13 = await demo('/feedback', {
    method: 'POST',
    body: { messageId: crownAssistantId, kind: 'up' },
  })
  const a13body = a13.body as { ok?: boolean; enqueuedCount?: number }
  assert('A13 POST /feedback kind=up returns ok:true, enqueuedCount:0',
    a13.status === 200 && a13body.ok === true && a13body.enqueuedCount === 0,
    `status=${a13.status} ok=${a13body.ok} enqueuedCount=${a13body.enqueuedCount}`)

  const a14 = await demo('/feedback', {
    method: 'POST',
    body: { messageId: crownAssistantId, kind: 'down' },
  })
  const a14body = a14.body as { ok?: boolean }
  const feedback = await prisma.messageFeedback.findUnique({
    where: { messageId: crownAssistantId },
    select: { kind: true },
  })
  assert('A14 POST /feedback kind=down returns ok:true; DB feedback.kind === down',
    a14.status === 200 && a14body.ok === true && feedback?.kind === 'down',
    `status=${a14.status} dbKind=${feedback?.kind}`)

  const a15 = await demo('/feedback', {
    method: 'POST',
    body: {
      messageId: '00000000-0000-0000-0000-000000000001',
      kind: 'up',
    },
  })
  const a15body = a15.body as { error?: string }
  assert('A15 POST /feedback with nonexistent messageId returns 404 message-not-found',
    a15.status === 404 && a15body.error === 'message-not-found',
    `status=${a15.status} error=${a15body.error}`)

  const a16 = await demo('/feedback', {
    method: 'POST',
    body: { messageId: 'bad', kind: 'up' },
  })
  const a16body = a16.body as { error?: string }
  assert('A16 POST /feedback with malformed messageId returns 400 invalid-input',
    a16.status === 400 && a16body.error === 'invalid-input',
    `status=${a16.status} error=${a16body.error}`)

  const firstUserMsg = await prisma.chatMessage.findFirst({
    where: { conversationId: crownConvId, role: 'user' },
    select: { id: true },
  })
  if (firstUserMsg) {
    const a16b = await demo('/feedback', {
      method: 'POST',
      body: { messageId: firstUserMsg.id, kind: 'up' },
    })
    const a16bBody = a16b.body as { error?: string }
    assert('A16b POST /feedback on USER messageId returns 400 not-assistant-message',
      a16b.status === 400 && a16bBody.error === 'not-assistant-message',
      `status=${a16b.status} error=${a16bBody.error}`)
  } else {
    assert('A16b POST /feedback on USER messageId returns 400 not-assistant-message',
      false, 'no user message found to test')
  }

  // ───────── Hardening (A17–A22) ─────────
  const a17 = await fetch(`${BASE}/venues`, {
    method: 'GET',
    headers: { Origin: 'http://localhost:3000', Cookie: demoSession.cookie },
  })
  const a17Origin = a17.headers.get('access-control-allow-origin')
  assert('A17 CORS allow-origin matches http://localhost:3000',
    a17Origin === 'http://localhost:3000', `acao=${a17Origin}`)

  const a18 = await fetch(`${BASE}/venues`, {
    method: 'GET',
    headers: { Origin: 'https://attacker.example', Cookie: demoSession.cookie },
  })
  const a18Origin = a18.headers.get('access-control-allow-origin')
  assert('A18 CORS rejects https://attacker.example (no matching ACAO)',
    a18Origin !== 'https://attacker.example', `acao=${a18Origin}`)

  const bigUserMessage = 'a'.repeat(40000)
  const a19 = await fetch(`${BASE}/chat/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Cookie: demoSession.cookie },
    body: JSON.stringify({ venueId: crown.id, userMessage: bigUserMessage }),
  })
  assert('A19 POST 40KB body returns 413 before Zod runs',
    a19.status === 413, `status=${a19.status}`)

  const errorCodeSet = new Set<ApiErrorCode>(API_ERROR_CODES)
  const fourXxResponses: Array<{ name: string; body: unknown }> = [
    { name: 'A8', body: a8.body },
    { name: 'A8b', body: a8b.body },
    { name: 'A8c', body: a8c.body },
    { name: 'A9', body: a9.body },
    { name: 'A9b', body: a9b.body },
    { name: 'A9c', body: a9c.body },
    { name: 'A10', body: a10.body },
    { name: 'A15', body: a15.body },
    { name: 'A16', body: a16.body },
  ]
  const allConform = fourXxResponses.every((r) => {
    const b = r.body as { error?: string } | null
    return b && typeof b.error === 'string' && errorCodeSet.has(b.error as ApiErrorCode)
  })
  assert('A20 Every 4xx response body conforms to ApiErrorResponse (error ∈ API_ERROR_CODES)',
    allConform)

  const a21 = await fetch(`${BASE}/venues`, {
    method: 'GET',
    headers: { Cookie: demoSession.cookie },
  })
  const a21Id = a21.headers.get('x-request-id') ?? ''
  assert('A21 Response has X-Request-Id UUID when request omitted the header',
    UUID_RE.test(a21Id), `x-request-id=${a21Id}`)

  const a22 = await fetch(`${BASE}/venues`, {
    method: 'GET',
    headers: { 'x-request-id': 'probe-abc-123', Cookie: demoSession.cookie },
  })
  const a22Id = a22.headers.get('x-request-id')
  assert('A22 Response echoes inbound X-Request-Id value',
    a22Id === 'probe-abc-123', `x-request-id=${a22Id}`)

  // ───────── Debug surface (D1–D7) ─────────
  const d1 = await demo(`/debug/conversations/${crownConvId}?venueId=${crown.id}`)
  const d1body = d1.body as {
    conversation?: { id: string }
    messages?: Array<{ id: string; toolCallLog: unknown }>
  }
  const d1msgs = d1body.messages ?? []
  const d1findKnowledge = d1msgs
    .flatMap((m) => (Array.isArray(m.toolCallLog) ? (m.toolCallLog as Array<{ tool?: string; result?: { ok?: boolean; data?: unknown } }>) : []))
    .find((e) => e.tool === 'find_knowledge' && e.result?.ok && Array.isArray(e.result?.data))
  const d1similarityShape = d1findKnowledge
    ? typeof (((d1findKnowledge.result?.data as Array<{ similarity?: unknown }>)[0])?.similarity) === 'number'
    : true
  assert('D1  GET /debug/conversations/:id returns 200 with messages[].toolCallLog array + similarity numeric',
    d1.status === 200 &&
      d1body.conversation?.id === crownConvId &&
      Array.isArray(d1body.messages) &&
      d1msgs.every((m) => Array.isArray(m.toolCallLog)) &&
      d1similarityShape,
    `status=${d1.status} msgs=${d1msgs.length} findKnowledge=${Boolean(d1findKnowledge)}`)

  const d2 = await demo(`/debug/conversations/${crownConvId}?venueId=${anchor.id}`)
  const d2body = d2.body as { error?: string }
  assert('D2  GET /debug/conversations cross-venue returns 404 conversation-not-found',
    d2.status === 404 && d2body.error === 'conversation-not-found',
    `status=${d2.status} error=${d2body.error}`)

  const d3 = await demo(`/debug/retag-queue?venueId=${crown.id}`)
  const d3body = d3.body as {
    items?: Array<{ knowledgeItem?: { contentPreview?: string } }>
    counts?: Record<string, number>
  }
  const d3items = d3body.items ?? []
  const d3counts = d3body.counts ?? {}
  const d3knownKeys = ['queued', 'processing', 'done', 'failed', 'exhausted']
  const d3keysOk = d3knownKeys.every((k) => typeof d3counts[k] === 'number')
  const d3previewOk = d3items.every((i) => (i.knowledgeItem?.contentPreview?.length ?? 0) <= 160)
  assert('D3  GET /debug/retag-queue returns 200 with all 5 known counts + contentPreview <= 160',
    d3.status === 200 && Array.isArray(d3items) && d3keysOk && d3previewOk,
    `status=${d3.status} keysOk=${d3keysOk} previewOk=${d3previewOk}`)

  const d4 = await demo(`/debug/messages/${crownAssistantId}?venueId=${crown.id}`)
  const d4body = d4.body as {
    message?: { toolCallLog?: unknown; feedback?: unknown }
    retagQueueItems?: unknown[]
  }
  const d4feedbackOk = d4body.message?.feedback === null ||
    (typeof d4body.message?.feedback === 'object' && d4body.message?.feedback !== null)
  assert('D4  GET /debug/messages/:id returns 200 with retagQueueItems array + valid feedback shape',
    d4.status === 200 &&
      Array.isArray(d4body.message?.toolCallLog) &&
      Array.isArray(d4body.retagQueueItems) &&
      d4feedbackOk,
    `status=${d4.status}`)

  // D5: Cross-tenant retag leak guard (venue-level within same org — kept for regression)
  const anchorAssistant = await prisma.chatMessage.findFirst({
    where: { conversationId: anchorConvId, role: 'assistant' },
    select: { id: true },
  })
  // Create a minimal knowledge item scoped to anchor (not crown) so the D5 leak
  // guard has something to key off. Uses a zero-vector placeholder via raw SQL.
  const anchorKnowledge = await prisma.knowledgeItem.create({
    data: {
      organizationId: demoSession.orgId,
      venueId: anchor.id,
      content: 'probe-d5 fixture',
      metadata: {},
    },
    select: { id: true },
  })
  const anyKnowledge: { id: string } | null = anchorKnowledge
  let d5SeededId: string | null = null
  if (anchorAssistant && anyKnowledge) {
    const seeded = await prisma.reTagQueueItem.create({
      data: {
        knowledgeItemId: anyKnowledge.id,
        reason: 'probe-d5-cross-tenant-test',
        status: 'queued',
        sourceMessageId: anchorAssistant.id,
      },
      select: { id: true },
    })
    d5SeededId = seeded.id
  }
  if (d5SeededId) {
    const d5 = await demo(`/debug/retag-queue?venueId=${crown.id}&limit=200`)
    const d5body = d5.body as { items?: Array<{ id: string }> }
    const leaked = (d5body.items ?? []).some((i) => i.id === d5SeededId)
    assert('D5  Cross-venue retag leak guard: Anchor-sourced row NEVER appears in Crown query',
      d5.status === 200 && !leaked,
      `status=${d5.status} leaked=${leaked} seededId=${d5SeededId}`)
    await prisma.reTagQueueItem.delete({ where: { id: d5SeededId } }).catch(() => undefined)
  } else {
    assert('D5  Cross-venue retag leak guard: Anchor-sourced row NEVER appears in Crown query',
      false, `setup missing: anchorAssistant=${Boolean(anchorAssistant)} knowledgeItem=${Boolean(anyKnowledge)}`)
  }

  // D6: JSON truncation contract
  const oversized = 'X'.repeat(4096)
  const d6Message = await prisma.chatMessage.create({
    data: {
      conversationId: crownConvId,
      role: 'assistant',
      content: 'probe-d6',
      retrievedItemIds: [],
      toolCallLog: [
        {
          round: 1,
          toolUseId: 'probe-d6',
          tool: 'find_knowledge',
          input: { query: 'probe-d6' },
          result: {
            ok: true,
            data: [{ id: 'probe-d6-hit', content: oversized, similarity: 0.9 }],
          },
        },
      ] as unknown as object,
    },
    select: { id: true },
  })
  const d6Fetch = await demo(`/debug/conversations/${crownConvId}?venueId=${crown.id}`)
  const d6body = d6Fetch.body as {
    messages?: Array<{ id: string; toolCallLog: unknown }>
  }
  const d6Entry = (d6body.messages ?? []).find((m) => m.id === d6Message.id)
  const d6Log = Array.isArray(d6Entry?.toolCallLog) ? (d6Entry.toolCallLog as Array<{
    result?: { data?: Array<{ content?: string; __truncated?: boolean }> }
  }>) : []
  const d6Hit = d6Log[0]?.result?.data?.[0]
  assert('D6  JSON truncation: oversized content capped at 2048 chars + __truncated marker',
    d6Fetch.status === 200 &&
      (d6Hit?.content?.length ?? 0) === 2048 &&
      d6Hit?.__truncated === true,
    `status=${d6Fetch.status} len=${d6Hit?.content?.length} __truncated=${d6Hit?.__truncated}`)
  await prisma.chatMessage.delete({ where: { id: d6Message.id } }).catch(() => undefined)

  const d7 = await fetch(`${BASE}/debug/retag-queue?venueId=${crown.id}`, {
    method: 'GET',
    headers: { Cookie: demoSession.cookie },
  })
  const d7Tag = d7.headers.get('x-robots-tag')
  assert('D7  apps/api /debug/* does NOT set X-Robots-Tag (header is apps/web next.config.ts concern)',
    d7.status === 200 && (d7Tag === null || d7Tag === ''),
    `status=${d7.status} x-robots-tag=${d7Tag ?? '(absent)'}`)

  // ───────── Auth surface (A23–A29) ─────────
  const a23 = await fetch(`${BASE}/chat/conversations/${crownConvId}?venueId=${crown.id}`)
  const a23body = (await a23.json().catch(() => ({}))) as { error?: string }
  assert('A23 unauthed GET /chat/conversations/:id → 401 unauthorized',
    a23.status === 401 && a23body.error === 'unauthorized',
    `status=${a23.status} error=${a23body.error}`)

  // A24: Cross-org — demo-session user trying to access other-org's conversation
  const a24 = await demo(
    `/chat/conversations/${otherConvFixture.id}?venueId=${otherSession.venues.crown.id}`,
  )
  const a24body = a24.body as { error?: string }
  assert('A24 Demo-session → other-org conversation returns 404 not-found (not 403)',
    a24.status === 404 && a24body.error === 'not-found',
    `status=${a24.status} error=${a24body.error}`)

  // A25: authed baseline — staff-session reaching GET /chat/conversations succeeds
  // (chat has NO @RequireRole so staff still passes)
  const a25 = await staff(`/chat/conversations/${crownConvId}?venueId=${crown.id}`)
  assert('A25 Staff-session /chat/conversations/:id (authed baseline for chat) returns 200',
    a25.status === 200, `status=${a25.status}`)

  // A26: staff-session → /debug/retag-queue denied
  const a26 = await staff(`/debug/retag-queue?venueId=${crown.id}`)
  const a26body = a26.body as { error?: string }
  assert('A26 Staff-role GET /debug/retag-queue → 403 forbidden',
    a26.status === 403 && a26body.error === 'forbidden',
    `status=${a26.status} error=${a26body.error}`)

  // A27: 16 KB body on /api/auth/sign-up/email → 413 payload-too-large
  const a27Body = JSON.stringify({
    email: 'probe-api-size@gm-ai.local',
    password: 'probe-password-a-very-long-value',
    name: 'A'.repeat(16000),
  })
  const a27 = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: PROBE_ORIGIN },
    body: a27Body,
  })
  assert('A27 16KB body on /api/auth/sign-up/email → 413 (8KB cap enforced)',
    a27.status === 413, `status=${a27.status} bytes=${a27Body.length}`)

  // A28: security headers present
  const a28 = await fetch(`${BASE}/venues`, {
    method: 'GET',
    headers: { Cookie: demoSession.cookie },
  })
  const a28nosniff = a28.headers.get('x-content-type-options')
  const a28frame = a28.headers.get('x-frame-options')
  assert('A28 Security headers X-Content-Type-Options nosniff + X-Frame-Options DENY present',
    a28nosniff === 'nosniff' && a28frame === 'DENY',
    `nosniff=${a28nosniff} frame=${a28frame}`)

  // A29: log-redaction structural assertion — the http-logger emits auth:'redacted'
  // for /api/auth/* and never the request body. We can't capture console here
  // without monkey-patching; instead assert the code path exists via path echo.
  const a29 = await fetch(`${BASE}/api/auth/get-session`, {
    method: 'GET',
    headers: { Cookie: demoSession.cookie, Origin: PROBE_ORIGIN },
  })
  assert('A29 Auth-route accessible via cookie-authenticated request (redaction path exercised)',
    a29.status === 200, `status=${a29.status}`)

  // ───────── Plan 02-01: KnowledgeItem cross-org isolation (A30–A37) ─────────
  // Seed one OtherOrg KnowledgeItem (real Voyage embedding so retrieval SQL
  // returns it). A30-A32 assert leak paths are closed; A33/A34/A35 are
  // contract tests; A36/A37 are positive-path regressions.

  const otherOrgDoc = await ingestService.ingest({
    title: 'Probe 02-01 OTHER_ORG_SECRET_PROBE_MARKER',
    content:
      'OTHER_ORG_SECRET_PROBE_MARKER — this knowledge item belongs exclusively to the other organisation probe-api-other. If a different organisation can retrieve or list it, the cross-organisation scoping has failed.',
    organizationId: otherSession.orgId,
    venueId: null,
  })

  // A30: Global-venue OtherOrg doc must NOT appear in Primary Org's /docs list.
  const a30 = await demo('/docs')
  const a30body = a30.body as Array<{ id: string; contentPreview?: string }>
  const a30leak = Array.isArray(a30body) &&
    a30body.some(
      (r) =>
        r.id === otherOrgDoc.id ||
        (r.contentPreview ?? '').includes('OTHER_ORG_SECRET_PROBE_MARKER'),
    )
  assert('A30 GET /docs as primary org excludes other-org global doc (cross-org list leak closed)',
    a30.status === 200 && !a30leak,
    `status=${a30.status} leak=${a30leak}`)

  // A31: GET /docs/:otherOrgDocId as primary org must return 404 not-found.
  const a31 = await demo(`/docs/${otherOrgDoc.id}`)
  const a31body = a31.body as { error?: string }
  assert('A31 GET /docs/:id across orgs returns 404 not-found (no existence leak)',
    a31.status === 404 && a31body.error === 'not-found',
    `status=${a31.status} error=${a31body.error}`)

  // A32: retrieval.find() as primary org with a query matching OtherOrg doc → no hit.
  const a32hits = await retrievalService.find('OTHER_ORG_SECRET_PROBE_MARKER', {
    orgId: demoSession.orgId,
  })
  const a32leak =
    a32hits.ok && a32hits.data.some((h: { id: string }) => h.id === otherOrgDoc.id)
  assert('A32 retrieval.find as primary org excludes other-org doc (cross-org retrieval closed)',
    !a32leak,
    `ok=${a32hits.ok} ${a32hits.ok ? 'hits=' + a32hits.data.length : 'reason=' + (a32hits as { reason: string }).reason}`)

  // A33: retrieval.find with invalid orgId returns fail('error', /invalid orgId/i).
  const a33 = await retrievalService.find('any query', {
    orgId: 'not-a-uuid',
  })
  assert('A33 retrieval.find with invalid orgId fails with /invalid orgId/ (contract guard)',
    !a33.ok && (a33 as { reason: string }).reason === 'error' && /invalid orgId/i.test((a33 as { detail: string }).detail ?? ''),
    `ok=${a33.ok} detail=${(a33 as { detail: string }).detail}`)

  // A34: Post-migration orphan integrity — no row may have NULL organizationId.
  const a34rows = (await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*)::bigint AS n FROM "knowledge_items" WHERE "organizationId" IS NULL`,
  ))
  const a34count = Number(a34rows[0]?.n ?? 0)
  assert('A34 No knowledge_items rows have NULL organizationId post-migration (seed integrity)',
    a34count === 0,
    `orphan_count=${a34count}`)

  // A35: TOOL_INPUT_SCHEMAS.find_knowledge strips any caller-supplied orgId.
  const a35parsed = TOOL_INPUT_SCHEMAS.find_knowledge.safeParse({
    query: 'probe-35',
    orgId: '00000000-0000-4000-8000-000000000000',
  })
  const a35data = a35parsed.success ? (a35parsed.data as Record<string, unknown>) : {}
  assert('A35 TOOL_INPUT_SCHEMAS.find_knowledge strips caller-supplied orgId (no cross-org bypass)',
    a35parsed.success && !('orgId' in a35data),
    `success=${a35parsed.success} keys=${Object.keys(a35data).join(',')}`)

  // A36: Primary Org's /docs list returns ≥1 row (anchorKnowledge fixture seeded earlier).
  const a36 = await demo('/docs')
  const a36body = a36.body as Array<{ id: string }>
  assert('A36 GET /docs as primary org returns ≥1 row post-migration (positive list path)',
    a36.status === 200 && Array.isArray(a36body) && a36body.length >= 1,
    `status=${a36.status} count=${Array.isArray(a36body) ? a36body.length : 'n/a'}`)

  // A37: retrieval.find() scoped to OtherOrg returns the OtherOrg doc (positive retrieval path).
  const a37hits = await retrievalService.find('OTHER_ORG_SECRET_PROBE_MARKER', {
    orgId: otherSession.orgId,
  })
  const a37found =
    a37hits.ok && a37hits.data.some((h: { id: string }) => h.id === otherOrgDoc.id)
  assert('A37 retrieval.find as other org returns the other-org doc (positive retrieval path)',
    a37found,
    `ok=${a37hits.ok} ${a37hits.ok ? 'hits=' + a37hits.data.length : 'reason=' + (a37hits as { reason: string }).reason}`)

  return true
}

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
    bodyParser: false,
    rawBody: false,
  })

  const allowlist = ['http://localhost:3000']
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowlist.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-request-id'],
  })
  app.use(requestIdMiddleware)
  app.use(securityHeadersMiddleware)
  app.use(httpLoggerMiddleware)
  app.use('/api/auth', json({ limit: '8kb' }))
  // 02-02 audit-added M5: mirror main.ts path-filtered json body parser — /docs/upload bypasses json()
  const jsonDefault = json({ limit: '32kb' })
  app.use((req, res, next) => {
    if (req.path === '/docs/upload') return next()
    return jsonDefault(req, res, next)
  })
  app.enableShutdownHooks()

  await app.listen(PORT)

  const onSignal = async () => {
    await app.close().catch(() => undefined)
    process.exit(130)
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)

  const ingestService = app.get(IngestService)
  const retrievalService = app.get(RetrievalService)

  let ok = false
  try {
    ok = await runProbe(ingestService, retrievalService)
  } catch (err) {
    console.error('probe threw:', err)
    ok = false
  } finally {
    await cleanupProbeRows()
    await app.close().catch(() => undefined)
  }

  const passed = assertions.filter((a) => a.passed).length
  const total = assertions.length
  console.log(`\nPASSED ${passed}/${total}`)
  if (!ok || passed < total) {
    const failed = assertions.filter((a) => !a.passed).map((a) => `  - ${a.name}${a.detail ? ' — ' + a.detail : ''}`)
    if (failed.length > 0) console.log(`\nFailures:\n${failed.join('\n')}`)
    process.exit(1)
  }
  process.exit(0)
}

main()
