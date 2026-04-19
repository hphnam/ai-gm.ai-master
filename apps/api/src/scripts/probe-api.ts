import '../load-env'

import { randomUUID } from 'node:crypto'
import { NestFactory } from '@nestjs/core'
import { json } from 'express'
import { prisma } from '@gm-ai/database'
import { API_ERROR_CODES, type ApiErrorCode } from '@gm-ai/types'
import { AppModule } from '../app.module'
import { httpLoggerMiddleware } from '../common/http-logger.middleware'
import { requestIdMiddleware } from '../common/request-id.middleware'
import { VENUE_ANCHOR, VENUE_CROWN } from '../modules/seed/seed-data'

const PORT = parseInt(process.env.PROBE_API_PORT ?? '3099', 10)
const BASE = `http://localhost:${PORT}`
const PROBE_MARKER = 'probe-api'
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
    const convs = await prisma.chatConversation.findMany({
      where: { channel: PROBE_MARKER },
      select: { id: true },
    })
    const convIds = convs.map((c) => c.id)
    if (convIds.length === 0) return

    const msgs = await prisma.chatMessage.findMany({
      where: { conversationId: { in: convIds } },
      select: { id: true },
    })
    const msgIds = msgs.map((m) => m.id)

    if (msgIds.length > 0) {
      await prisma.reTagQueueItem.deleteMany({
        where: { sourceMessageId: { in: msgIds } },
      })
      await prisma.messageFeedback.deleteMany({
        where: { messageId: { in: msgIds } },
      })
    }
    await prisma.chatMessage.deleteMany({
      where: { conversationId: { in: convIds } },
    })
    await prisma.chatConversation.deleteMany({
      where: { channel: PROBE_MARKER },
    })
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

async function sendChatMessageWithRetry(payload: {
  venueId: string
  userMessage: string
  conversationId?: string
}): Promise<{ status: number; body: unknown; headers: Headers }> {
  let last: { status: number; body: unknown; headers: Headers } | null = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await jsonFetch('/chat/messages', { method: 'POST', body: payload })
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

async function runProbe(app: { close: () => Promise<void> }): Promise<boolean> {
  console.log(
    `probe-api issues ~3 Claude calls per run (~$0.01–0.03). PORT=${PORT} BASE=${BASE}`,
  )
  console.log('Debug cost: +7 DB queries per run, no additional AI calls')

  const venueCount = await prisma.venue.count()
  if (venueCount === 0) {
    console.error('No venues seeded. Run `pnpm seed` first.')
    return false
  }
  const belowParCount = await prisma.mockStock.count({
    where: { venueId: VENUE_CROWN },
  })
  if (belowParCount === 0) {
    console.error('No stock items for Crown. Run `pnpm seed` first.')
    return false
  }

  await cleanupProbeRows()

  // ───────── Venues (A1–A3) ─────────
  const venuesRes = await jsonFetch('/venues')
  assert('A1  GET /venues returns 200 with array length >= 2',
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
  const m1 = await sendChatMessageWithRetry({
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

  const m2 = await sendChatMessageWithRetry({
    venueId: crown.id,
    userMessage: 'and what about supplier cutoffs today?',
    conversationId: crownConvId,
  })
  assert('A6  POST /chat/messages with conversationId returns 200',
    m2.status === 200, `status=${m2.status}`)
  const msgCount2 = await prisma.chatMessage.count({ where: { conversationId: crownConvId } })
  assert('A6  DB: chat_messages count === 4 after second turn', msgCount2 === 4, `got=${msgCount2}`)

  const convRes = await jsonFetch(`/chat/conversations/${crownConvId}?venueId=${crown.id}`)
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
  const a8 = await jsonFetch(
    `/chat/conversations/00000000-0000-0000-0000-000000000000?venueId=${crown.id}`,
  )
  const a8body = a8.body as { error?: string }
  assert('A8  GET with random conversationId returns 404 not-found',
    a8.status === 404 && a8body.error === 'not-found', `status=${a8.status} error=${a8body.error}`)

  const a8b = await jsonFetch(`/chat/conversations/${crownConvId}?venueId=${anchor.id}`)
  const a8bBody = a8b.body as { error?: string }
  assert('A8b GET cross-tenant (Crown conv, Anchor venueId) returns 404 not-found (no 403)',
    a8b.status === 404 && a8bBody.error === 'not-found',
    `status=${a8b.status} error=${a8bBody.error}`)

  const a8c = await jsonFetch(`/chat/conversations/${crownConvId}`)
  const a8cBody = a8c.body as { error?: string }
  assert('A8c GET missing venueId query returns 400 invalid-input',
    a8c.status === 400 && a8cBody.error === 'invalid-input',
    `status=${a8c.status} error=${a8cBody.error}`)

  const a8d = await jsonFetch(`/chat/conversations/${crownConvId}?venueId=not-a-uuid`)
  assert('A8d GET malformed venueId query returns 400', a8d.status === 400, `status=${a8d.status}`)

  // ───────── POST /chat/messages negative paths (A9, A9b, A9c, A10) ─────────
  const a9 = await jsonFetch('/chat/messages', {
    method: 'POST',
    body: { venueId: 'not-a-uuid', userMessage: 'hi' },
  })
  const a9body = a9.body as { error?: string }
  assert('A9  POST with malformed venueId returns 400 invalid-input',
    a9.status === 400 && a9body.error === 'invalid-input', `status=${a9.status}`)

  const a9b = await jsonFetch('/chat/messages', {
    method: 'POST',
    body: { venueId: crown.id, userMessage: '   ' },
  })
  const a9bBody = a9b.body as { error?: string }
  assert('A9b POST with whitespace-only userMessage returns 400 invalid-input',
    a9b.status === 400 && a9bBody.error === 'invalid-input',
    `status=${a9b.status} error=${a9bBody.error}`)

  const a9c = await jsonFetch('/chat/messages', {
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

  // Prep for A10: create an Anchor conversation
  const anchorSend = await sendChatMessageWithRetry({
    venueId: anchor.id,
    userMessage: 'hello from the Anchor',
  })
  const anchorConvId =
    (anchorSend.body as { conversationId?: string }).conversationId ?? ''
  if (anchorConvId) await markConversation(anchorConvId)

  const a10 = await jsonFetch('/chat/messages', {
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
  const a11 = await jsonFetch('/suggestions/on-open', {
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

  const a12 = await jsonFetch('/suggestions/on-turn', {
    method: 'POST',
    body: { venueId: crown.id, userMessage: "what's out of stock?" },
  })
  const a12body = a12.body as Array<{ kind: string; severity: string }>
  assert('A12 POST /suggestions/on-turn returns >=1 below-par suggestion',
    a12.status === 200 && Array.isArray(a12body) && a12body.some((s) => s.kind === 'below-par'),
    `status=${a12.status} count=${a12body?.length ?? 0}`)

  // ───────── Feedback (A13–A16b) ─────────
  const a13 = await jsonFetch('/feedback', {
    method: 'POST',
    body: { messageId: crownAssistantId, kind: 'up' },
  })
  const a13body = a13.body as { ok?: boolean; enqueuedCount?: number }
  assert('A13 POST /feedback kind=up returns ok:true, enqueuedCount:0',
    a13.status === 200 && a13body.ok === true && a13body.enqueuedCount === 0,
    `status=${a13.status} ok=${a13body.ok} enqueuedCount=${a13body.enqueuedCount}`)

  const a14 = await jsonFetch('/feedback', {
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

  const a15 = await jsonFetch('/feedback', {
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

  const a16 = await jsonFetch('/feedback', {
    method: 'POST',
    body: { messageId: 'bad', kind: 'up' },
  })
  const a16body = a16.body as { error?: string }
  assert('A16 POST /feedback with malformed messageId returns 400 invalid-input',
    a16.status === 400 && a16body.error === 'invalid-input',
    `status=${a16.status} error=${a16body.error}`)

  // Fetch a user-role message from the Crown conversation
  const firstUserMsg = await prisma.chatMessage.findFirst({
    where: { conversationId: crownConvId, role: 'user' },
    select: { id: true },
  })
  if (firstUserMsg) {
    const a16b = await jsonFetch('/feedback', {
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
    headers: { Origin: 'http://localhost:3000' },
  })
  const a17Origin = a17.headers.get('access-control-allow-origin')
  assert('A17 CORS allow-origin matches http://localhost:3000',
    a17Origin === 'http://localhost:3000', `acao=${a17Origin}`)

  const a18 = await fetch(`${BASE}/venues`, {
    method: 'GET',
    headers: { Origin: 'https://attacker.example' },
  })
  const a18Origin = a18.headers.get('access-control-allow-origin')
  assert('A18 CORS rejects https://attacker.example (no matching ACAO)',
    a18Origin !== 'https://attacker.example', `acao=${a18Origin}`)

  const bigUserMessage = 'a'.repeat(40000)
  const a19 = await fetch(`${BASE}/chat/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
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

  const a21 = await fetch(`${BASE}/venues`, { method: 'GET' })
  const a21Id = a21.headers.get('x-request-id') ?? ''
  assert('A21 Response has X-Request-Id UUID when request omitted the header',
    UUID_RE.test(a21Id), `x-request-id=${a21Id}`)

  const a22 = await fetch(`${BASE}/venues`, {
    method: 'GET',
    headers: { 'x-request-id': 'probe-abc-123' },
  })
  const a22Id = a22.headers.get('x-request-id')
  assert('A22 Response echoes inbound X-Request-Id value',
    a22Id === 'probe-abc-123', `x-request-id=${a22Id}`)

  // ───────── Debug surface (D1–D7) ─────────
  const d1 = await jsonFetch(`/debug/conversations/${crownConvId}?venueId=${crown.id}`)
  const d1body = d1.body as {
    conversation?: { id: string }
    messages?: Array<{
      id: string
      toolCallLog: unknown
    }>
  }
  const d1msgs = d1body.messages ?? []
  const d1findKnowledge = d1msgs
    .flatMap((m) => (Array.isArray(m.toolCallLog) ? (m.toolCallLog as Array<{ tool?: string; result?: { ok?: boolean; data?: unknown } }>) : []))
    .find((e) => e.tool === 'find_knowledge' && e.result?.ok && Array.isArray(e.result?.data))
  const d1similarityShape = d1findKnowledge
    ? typeof (((d1findKnowledge.result?.data as Array<{ similarity?: unknown }>)[0])?.similarity) === 'number'
    : true // no find_knowledge this turn — not a failure
  assert('D1  GET /debug/conversations/:id returns 200 with messages[].toolCallLog array + similarity numeric',
    d1.status === 200 &&
      d1body.conversation?.id === crownConvId &&
      Array.isArray(d1body.messages) &&
      d1msgs.every((m) => Array.isArray(m.toolCallLog)) &&
      d1similarityShape,
    `status=${d1.status} msgs=${d1msgs.length} findKnowledge=${Boolean(d1findKnowledge)}`)

  const d2 = await jsonFetch(`/debug/conversations/${crownConvId}?venueId=${anchor.id}`)
  const d2body = d2.body as { error?: string }
  assert('D2  GET /debug/conversations cross-tenant returns 404 conversation-not-found',
    d2.status === 404 && d2body.error === 'conversation-not-found',
    `status=${d2.status} error=${d2body.error}`)

  const d3 = await jsonFetch(`/debug/retag-queue?venueId=${crown.id}`)
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

  const d4 = await jsonFetch(`/debug/messages/${crownAssistantId}?venueId=${crown.id}`)
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

  // D5: cross-tenant retag-queue leak guard
  // Seed a retag row with sourceMessageId pointing at an Anchor assistant message
  // Then assert GET retag-queue?venueId=<Crown> does NOT return it
  const anchorAssistant = await prisma.chatMessage.findFirst({
    where: { conversationId: anchorConvId, role: 'assistant' },
    select: { id: true },
  })
  const anyKnowledge = await prisma.knowledgeItem.findFirst({ select: { id: true } })
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
    const d5 = await jsonFetch(`/debug/retag-queue?venueId=${crown.id}&limit=200`)
    const d5body = d5.body as { items?: Array<{ id: string }> }
    const leaked = (d5body.items ?? []).some((i) => i.id === d5SeededId)
    assert('D5  Cross-tenant retag leak guard: Anchor-sourced row NEVER appears in Crown query',
      d5.status === 200 && !leaked,
      `status=${d5.status} leaked=${leaked} seededId=${d5SeededId}`)
    // Cleanup the seeded row
    await prisma.reTagQueueItem.delete({ where: { id: d5SeededId } }).catch(() => undefined)
  } else {
    assert('D5  Cross-tenant retag leak guard: Anchor-sourced row NEVER appears in Crown query',
      false,
      `setup missing: anchorAssistant=${Boolean(anchorAssistant)} knowledgeItem=${Boolean(anyKnowledge)}`)
  }

  // D6: JSON truncation contract
  // Insert a chatMessage directly with toolCallLog containing 4096-char content
  // Then fetch /debug/conversations and assert the returned entry is truncated to 2048 + __truncated:true
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
  const d6Fetch = await jsonFetch(`/debug/conversations/${crownConvId}?venueId=${crown.id}`)
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
  // Cleanup D6 seeded message
  await prisma.chatMessage.delete({ where: { id: d6Message.id } }).catch(() => undefined)

  // D7: negative check — apps/api does NOT set X-Robots-Tag (header is apps/web's job)
  const d7 = await fetch(`${BASE}/debug/retag-queue?venueId=${crown.id}`, { method: 'GET' })
  const d7Tag = d7.headers.get('x-robots-tag')
  assert('D7  apps/api /debug/* does NOT set X-Robots-Tag (header is apps/web next.config.ts concern)',
    d7.status === 200 && (d7Tag === null || d7Tag === ''),
    `status=${d7.status} x-robots-tag=${d7Tag ?? '(absent)'}`)

  return true
}

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] })

  const allowlist = ['http://localhost:3000']
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowlist.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-request-id'],
  })
  app.use(json({ limit: '32kb' }))
  app.use(requestIdMiddleware)
  app.use(httpLoggerMiddleware)
  app.enableShutdownHooks()

  await app.listen(PORT)

  const onSignal = async () => {
    await app.close().catch(() => undefined)
    process.exit(130)
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)

  let ok = false
  try {
    ok = await runProbe(app)
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
