import '../load-env'

import { NestFactory } from '@nestjs/core'
import { prisma } from '@gm-ai/database'
import { ChatModule } from '../modules/chat/chat.module'
import { ChatService } from '../modules/chat/chat.service'

const VENUE_CROWN = 'a1000000-0000-0000-0000-000000000001'

type ProbeResult = { name: string; ok: boolean; detail?: string }

async function runConversation(
  chat: ChatService,
  userMessage: string,
): Promise<{
  conversationId: string
  reply: string
  toolCallLog: unknown[]
  retrievedItemIds: string[]
}> {
  const res = await chat.sendMessage({ venueId: VENUE_CROWN, userMessage })
  return {
    conversationId: res.conversationId,
    reply: res.assistantMessage.content,
    toolCallLog: res.toolCallLog,
    retrievedItemIds: res.retrievedItemIds,
  }
}

async function assertPersistence(
  conversationId: string,
): Promise<{ msgCount: number; roles: string[] }> {
  const conv = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, venueId: true },
  })
  if (!conv) throw new Error(`conversation ${conversationId} not persisted`)
  const msgs = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { role: true },
  })
  return { msgCount: msgs.length, roles: msgs.map((m) => m.role) }
}

const NO_DATA_RE =
  /don'?t have|no information|not in my|can'?t find|don'?t know|unable to|don'?t.*access|contact.*(manager|admin|IT)/i

async function runProbe(): Promise<{ ok: boolean; conversationIds: string[] }> {
  const app = await NestFactory.createApplicationContext(ChatModule, { logger: false })
  const chat = app.get(ChatService)

  const checks: ProbeResult[] = []
  const conversationIds: string[] = []

  const c1 = await runConversation(
    chat,
    'How do I fix the ice machine if it shows error code E2?',
  )
  conversationIds.push(c1.conversationId)
  const p1 = await assertPersistence(c1.conversationId)
  checks.push({
    name: 'c1 knowledge: 1 user + 1 assistant message persisted',
    ok: p1.msgCount === 2 && p1.roles[0] === 'user' && p1.roles[1] === 'assistant',
    detail: `${p1.msgCount} msgs [${p1.roles.join(',')}]`,
  })
  checks.push({
    name: 'c1 knowledge: >=1 find_knowledge tool call',
    ok: c1.toolCallLog.some((e: any) => e.tool === 'find_knowledge'),
    detail: `${c1.toolCallLog.length} tool calls`,
  })
  checks.push({
    name: 'c1 knowledge: retrievedItemIds non-empty',
    ok: c1.retrievedItemIds.length >= 1,
    detail: `${c1.retrievedItemIds.length} ids`,
  })
  checks.push({
    name: 'c1 knowledge: reply cites E2 or sensor',
    ok: /e2|sensor/i.test(c1.reply),
    detail: c1.reply.slice(0, 120),
  })

  const c2 = await runConversation(
    chat,
    'What stock is below par at the Crown right now?',
  )
  conversationIds.push(c2.conversationId)
  const p2 = await assertPersistence(c2.conversationId)
  checks.push({
    name: 'c2 ops: 1 user + 1 assistant message persisted',
    ok: p2.msgCount === 2,
    detail: `${p2.msgCount} msgs`,
  })
  checks.push({
    name: 'c2 ops: >=1 get_stock_below_par tool call',
    ok: c2.toolCallLog.some((e: any) => e.tool === 'get_stock_below_par'),
    detail: `${c2.toolCallLog.length} tool calls`,
  })
  checks.push({
    name: 'c2 ops: reply mentions a below-par product',
    ok: /carlsberg|guinness|neck oil|doom bar|hendricks|stella|heineken|lager|ale|ipa|gin|vodka|tonic/i.test(
      c2.reply,
    ),
    detail: c2.reply.slice(0, 120),
  })

  const c3 = await runConversation(
    chat,
    "What's the wifi password for The Crown's guest network?",
  )
  conversationIds.push(c3.conversationId)
  const p3 = await assertPersistence(c3.conversationId)
  checks.push({
    name: 'c3 no-data: 1 user + 1 assistant message persisted',
    ok: p3.msgCount === 2,
    detail: `${p3.msgCount} msgs`,
  })
  checks.push({
    name: 'c3 no-data: reply uses no-data phrasing',
    ok: NO_DATA_RE.test(c3.reply),
    detail: c3.reply.slice(0, 120),
  })

  for (const [label, returned] of [
    ['c1', c1],
    ['c2', c2],
    ['c3', c3],
  ] as const) {
    const persisted = await prisma.chatMessage.findFirst({
      where: { conversationId: returned.conversationId, role: 'assistant' },
      select: { toolCallLog: true, retrievedItemIds: true },
    })
    const persistedLog = (persisted?.toolCallLog as unknown as any[]) ?? []
    const persistedIds = (persisted?.retrievedItemIds as unknown as string[]) ?? []
    checks.push({
      name: `${label} DB: persisted toolCallLog length matches returned`,
      ok: persistedLog.length === returned.toolCallLog.length,
      detail: `db=${persistedLog.length} vs ret=${returned.toolCallLog.length}`,
    })
    checks.push({
      name: `${label} DB: persisted retrievedItemIds matches returned`,
      ok:
        persistedIds.length === returned.retrievedItemIds.length &&
        persistedIds.every((id) => returned.retrievedItemIds.includes(id)),
      detail: `db=[${persistedIds.length}] ret=[${returned.retrievedItemIds.length}]`,
    })
  }

  let failed = 0
  for (const c of checks) {
    console.log(`${c.ok ? '\u2713' : '\u2717'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
    if (!c.ok) failed++
  }
  await app.close()
  return { ok: failed === 0, conversationIds }
}

async function main() {
  let ok = false
  let conversationIds: string[] = []
  try {
    const res = await runProbe()
    ok = res.ok
    conversationIds = res.conversationIds
  } finally {
    if (conversationIds.length > 0) {
      await prisma.chatConversation
        .deleteMany({ where: { id: { in: conversationIds } } })
        .catch(() => {})
    }
    await prisma.$disconnect().catch(() => {})
  }
  if (!ok) {
    console.error('\nChat probe FAILED')
    process.exit(1)
  }
  console.log('\nChat probe passed')
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
