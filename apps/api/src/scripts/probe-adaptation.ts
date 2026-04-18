import '../load-env'

import { NestFactory } from '@nestjs/core'
import { prisma } from '@gm-ai/database'
import { AppModule } from '../app.module'
import { AdaptationService } from '../modules/adaptation/adaptation.service'
import { VENUE_CROWN } from '../modules/seed/seed-data'

type ProbeResult = { name: string; ok: boolean; detail?: string }

async function runProbe(): Promise<{ ok: boolean }> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    abortOnError: false,
    logger: false,
  })
  const adaptation = app.get(AdaptationService)

  const checks: ProbeResult[] = []
  const fixtureConversationIds: string[] = []
  const fixtureMessageIds: string[] = []
  const touchedKnowledgeIds = new Set<string>()

  try {
    const knowledge = await prisma.knowledgeItem.findMany({
      take: 3,
      orderBy: { createdAt: 'asc' },
      select: { id: true, updatedAt: true },
    })
    if (knowledge.length < 3) {
      throw new Error(`probe requires >=3 seeded knowledge_items, found ${knowledge.length}`)
    }
    const [K1, K2, K3] = knowledge
    const initialUpdatedAt = new Map<string, Date>([
      [K1.id, K1.updatedAt],
      [K2.id, K2.updatedAt],
    ])

    const initialFeedbackCount = await prisma.messageFeedback.count()
    const initialQueueCount = await prisma.reTagQueueItem.count()
    const initialMessageCount = await prisma.chatMessage.count()
    const initialConversationCount = await prisma.chatConversation.count()

    const conv = await prisma.chatConversation.create({ data: { venueId: VENUE_CROWN } })
    fixtureConversationIds.push(conv.id)

    const m1 = await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        role: 'assistant',
        content: 'probe assistant reply (m1)',
        retrievedItemIds: [K1.id, K2.id],
        toolCallLog: [
          {
            tool: 'find_knowledge',
            result: {
              ok: true,
              data: [
                { id: K1.id, similarity: 0.38 },
                { id: K2.id, similarity: 0.32 },
              ],
            },
          },
        ] as unknown as object,
      },
    })
    fixtureMessageIds.push(m1.id)

    const m2 = await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        role: 'assistant',
        content: 'probe assistant reply (m2)',
        retrievedItemIds: [K1.id, K2.id],
        toolCallLog: [] as unknown as object,
      },
    })
    fixtureMessageIds.push(m2.id)

    checks.push({
      name: '1. Bootstrap creates conv + 2 assistant msg fixtures with retrievedItemIds=[K1,K2]',
      ok: m1.retrievedItemIds.length === 2 && m2.retrievedItemIds.length === 2,
      detail: `m1=[${m1.retrievedItemIds.length}] m2=[${m2.retrievedItemIds.length}]`,
    })

    const r2 = await adaptation.captureFeedback({ messageId: m1.id, kind: 'down' })
    const feedback1 = await prisma.messageFeedback.findUnique({ where: { messageId: m1.id } })
    checks.push({
      name: '2. captureFeedback({kind:down}) persists MessageFeedback',
      ok: r2.ok === true && feedback1?.kind === 'down',
      detail: `ok=${r2.ok} kind=${feedback1?.kind}`,
    })

    const queueAfterDown = await prisma.reTagQueueItem.findMany({
      where: { sourceMessageId: m1.id, reason: 'thumbs-down' },
      select: { knowledgeItemId: true, status: true },
    })
    const ids3 = new Set(queueAfterDown.map((q) => q.knowledgeItemId))
    touchedKnowledgeIds.add(K1.id)
    touchedKnowledgeIds.add(K2.id)
    checks.push({
      name: "3. captureFeedback({kind:down}) enqueues exactly 2 rows reason='thumbs-down'",
      ok:
        queueAfterDown.length === 2 &&
        ids3.has(K1.id) &&
        ids3.has(K2.id) &&
        queueAfterDown.every((q) => q.status === 'queued'),
      detail: `${queueAfterDown.length} rows`,
    })

    const beforeSecond = await prisma.reTagQueueItem.count({ where: { sourceMessageId: m1.id } })
    await adaptation.captureFeedback({ messageId: m1.id, kind: 'down' })
    const afterSecond = await prisma.reTagQueueItem.count({ where: { sourceMessageId: m1.id } })
    checks.push({
      name: '4. Second captureFeedback({kind:down}) is deduped (count unchanged)',
      ok: beforeSecond === afterSecond,
      detail: `${beforeSecond} → ${afterSecond}`,
    })

    await prisma.reTagQueueItem.deleteMany({
      where: { knowledgeItemId: { in: [K1.id, K2.id] }, status: { in: ['queued', 'processing'] } },
    })
    const lowSimAssistantId = m2.id
    const beforeLowSim = await prisma.reTagQueueItem.count({
      where: { sourceMessageId: lowSimAssistantId, reason: 'low-similarity' },
    })
    await adaptation.captureRetrievalOutcome({
      assistantMessageId: lowSimAssistantId,
      toolCallLog: [
        {
          tool: 'find_knowledge',
          result: { ok: true, data: [{ id: K1.id, similarity: 0.38 }] },
        },
      ],
      retrievedItemIds: [K1.id, K2.id],
    })
    const afterLowSim = await prisma.reTagQueueItem.count({
      where: { sourceMessageId: lowSimAssistantId, reason: 'low-similarity' },
    })
    checks.push({
      name: '5. captureRetrievalOutcome(topSim=0.38) enqueues low-similarity rows',
      ok: afterLowSim === 2 && beforeLowSim === 0,
      detail: `${beforeLowSim} → ${afterLowSim} (expected 0 → 2)`,
    })

    const highSimFakeMsg = fixtureMessageIds[1]
    const beforeHighSim = await prisma.reTagQueueItem.count({
      where: { sourceMessageId: highSimFakeMsg, reason: 'low-similarity' },
    })
    await adaptation.captureRetrievalOutcome({
      assistantMessageId: highSimFakeMsg,
      toolCallLog: [
        {
          tool: 'find_knowledge',
          result: { ok: true, data: [{ id: K3.id, similarity: 0.65 }] },
        },
      ],
      retrievedItemIds: [K3.id],
    })
    const afterHighSim = await prisma.reTagQueueItem.count({
      where: { sourceMessageId: highSimFakeMsg, reason: 'low-similarity' },
    })
    checks.push({
      name: '6. captureRetrievalOutcome(topSim=0.65) does NOT enqueue (above threshold)',
      ok: afterHighSim === beforeHighSim,
      detail: `${beforeHighSim} → ${afterHighSim}`,
    })

    const upConv = await prisma.chatConversation.create({ data: { venueId: VENUE_CROWN } })
    fixtureConversationIds.push(upConv.id)
    const upMsg = await prisma.chatMessage.create({
      data: {
        conversationId: upConv.id,
        role: 'assistant',
        content: 'probe up',
        retrievedItemIds: [K1.id],
        toolCallLog: [] as unknown as object,
      },
    })
    fixtureMessageIds.push(upMsg.id)
    const beforeUp = await prisma.reTagQueueItem.count({ where: { sourceMessageId: upMsg.id } })
    const upRes = await adaptation.captureFeedback({ messageId: upMsg.id, kind: 'up' })
    const afterUp = await prisma.reTagQueueItem.count({ where: { sourceMessageId: upMsg.id } })
    checks.push({
      name: "7. captureFeedback({kind:up}) persists feedback but does NOT enqueue",
      ok: upRes.ok === true && beforeUp === afterUp && afterUp === 0,
      detail: `ok=${upRes.ok} queue ${beforeUp}→${afterUp}`,
    })

    const regenConv = await prisma.chatConversation.create({ data: { venueId: VENUE_CROWN } })
    fixtureConversationIds.push(regenConv.id)
    const regenMsg = await prisma.chatMessage.create({
      data: {
        conversationId: regenConv.id,
        role: 'assistant',
        content: 'probe regen',
        retrievedItemIds: [K3.id],
        toolCallLog: [] as unknown as object,
      },
    })
    fixtureMessageIds.push(regenMsg.id)
    await adaptation.captureFeedback({ messageId: regenMsg.id, kind: 'regenerate' })
    const regenRows = await prisma.reTagQueueItem.findMany({
      where: { sourceMessageId: regenMsg.id },
      select: { reason: true, knowledgeItemId: true },
    })
    touchedKnowledgeIds.add(K3.id)
    checks.push({
      name: "8. captureFeedback({kind:regenerate}) enqueues with reason='regeneration'",
      ok:
        regenRows.length === 1 &&
        regenRows[0].reason === 'regeneration' &&
        regenRows[0].knowledgeItemId === K3.id,
      detail: `${regenRows.length} rows, reason=${regenRows[0]?.reason}`,
    })

    const missing = await adaptation.captureFeedback({
      messageId: '00000000-0000-0000-0000-000000000000',
      kind: 'down',
    })
    checks.push({
      name: '9. captureFeedback({messageId:missing}) returns ok:false and does not throw',
      ok: missing.ok === false,
      detail: `ok=${missing.ok}`,
    })

    const drain = await adaptation.processReTagQueue({ limit: 2 })
    checks.push({
      name: '10. processReTagQueue({limit:2}) transitions exactly 2 rows queued → processed',
      ok: drain.processed === 2,
      detail: `processed=${drain.processed} failed=${drain.failed} remaining=${drain.remainingQueued}`,
    })

    const processedAfter = await prisma.knowledgeItem.findMany({
      where: { id: { in: [K1.id, K2.id] } },
      select: { id: true, updatedAt: true },
    })
    const advanced = processedAfter.filter((k) => {
      const before = initialUpdatedAt.get(k.id)
      return before ? k.updatedAt.getTime() > before.getTime() : false
    })
    checks.push({
      name: '11. After processing, KnowledgeItem.updatedAt advanced for processed items',
      ok: advanced.length >= 1,
      detail: `${advanced.length}/${processedAfter.length} advanced`,
    })

    const concurrentConv = await prisma.chatConversation.create({
      data: { venueId: VENUE_CROWN },
    })
    fixtureConversationIds.push(concurrentConv.id)
    const concurrentMsg = await prisma.chatMessage.create({
      data: {
        conversationId: concurrentConv.id,
        role: 'assistant',
        content: 'probe concurrent',
        retrievedItemIds: [K1.id, K2.id],
        toolCallLog: [] as unknown as object,
      },
    })
    fixtureMessageIds.push(concurrentMsg.id)
    await prisma.reTagQueueItem.deleteMany({
      where: { knowledgeItemId: { in: [K1.id, K2.id] } },
    })
    await Promise.all([
      adaptation.captureFeedback({ messageId: concurrentMsg.id, kind: 'down' }),
      adaptation.captureFeedback({ messageId: concurrentMsg.id, kind: 'down' }),
    ])
    const concurrentRows = await prisma.reTagQueueItem.count({
      where: { knowledgeItemId: { in: [K1.id, K2.id] }, reason: 'thumbs-down' },
    })
    checks.push({
      name: '13. Concurrent captureFeedback×2 via Promise.all → exactly 2 queue rows (dedupe holds)',
      ok: concurrentRows === 2,
      detail: `${concurrentRows} rows`,
    })

    await prisma.reTagQueueItem.deleteMany({ where: { knowledgeItemId: K3.id } })
    await prisma.reTagQueueItem.create({
      data: {
        knowledgeItemId: K3.id,
        reason: 'thumbs-down',
        status: 'failed',
        attempts: 3,
        lastError: 'probe-fixture',
      },
    })
    const exhausted = await adaptation.enqueueReTag({
      knowledgeItemId: K3.id,
      reason: 'thumbs-down',
    })
    checks.push({
      name: '14. Max-attempts: failed+attempts=3 → enqueueReTag returns {exhausted:true}',
      ok: exhausted.enqueued === false && exhausted.exhausted === true,
      detail: `enqueued=${exhausted.enqueued} exhausted=${(exhausted as { exhausted?: boolean }).exhausted}`,
    })

    const malformedConv = await prisma.chatConversation.create({
      data: { venueId: VENUE_CROWN },
    })
    fixtureConversationIds.push(malformedConv.id)
    const malformedMsg = await prisma.chatMessage.create({
      data: {
        conversationId: malformedConv.id,
        role: 'assistant',
        content: 'probe malformed',
        retrievedItemIds: [K1.id],
        toolCallLog: [] as unknown as object,
      },
    })
    fixtureMessageIds.push(malformedMsg.id)
    const beforeMalformed = await prisma.reTagQueueItem.count({
      where: { sourceMessageId: malformedMsg.id },
    })
    await adaptation.captureRetrievalOutcome({
      assistantMessageId: malformedMsg.id,
      toolCallLog: [{ tool: 'find_knowledge', garbage: 'x' }] as unknown[],
      retrievedItemIds: [K1.id],
    })
    const afterMalformed = await prisma.reTagQueueItem.count({
      where: { sourceMessageId: malformedMsg.id },
    })
    checks.push({
      name: '15. Malformed-shape defense: no throw + NO queue rows created',
      ok: beforeMalformed === afterMalformed,
      detail: `${beforeMalformed} → ${afterMalformed}`,
    })

    await prisma.messageFeedback.deleteMany({ where: { messageId: { in: fixtureMessageIds } } })
    await prisma.reTagQueueItem.deleteMany({
      where: {
        OR: [
          { sourceMessageId: { in: fixtureMessageIds } },
          { knowledgeItemId: { in: Array.from(touchedKnowledgeIds) } },
        ],
      },
    })
    await prisma.chatConversation.deleteMany({ where: { id: { in: fixtureConversationIds } } })

    const finalFeedbackCount = await prisma.messageFeedback.count()
    const finalQueueCount = await prisma.reTagQueueItem.count()
    const finalMessageCount = await prisma.chatMessage.count()
    const finalConversationCount = await prisma.chatConversation.count()

    checks.push({
      name: '12. Probe teardown: counts return to baseline',
      ok:
        finalFeedbackCount === initialFeedbackCount &&
        finalQueueCount === initialQueueCount &&
        finalMessageCount === initialMessageCount &&
        finalConversationCount === initialConversationCount,
      detail: `feedback ${initialFeedbackCount}→${finalFeedbackCount}, queue ${initialQueueCount}→${finalQueueCount}, msg ${initialMessageCount}→${finalMessageCount}, conv ${initialConversationCount}→${finalConversationCount}`,
    })
  } finally {
    await app.close().catch(() => {})
  }

  const ordered = [...checks].sort((a, b) => {
    const num = (n: string) => parseInt(n.split('.')[0], 10) || 0
    return num(a.name) - num(b.name)
  })
  let failed = 0
  for (const c of ordered) {
    console.log(`${c.ok ? '\u2713' : '\u2717'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
    if (!c.ok) failed += 1
  }
  console.log('')
  if (failed === 0) {
    console.log(`probe-adaptation PASSED (${ordered.length}/${ordered.length})`)
  } else {
    console.error(`probe-adaptation FAILED (${ordered.length - failed}/${ordered.length})`)
  }
  return { ok: failed === 0 }
}

async function main() {
  let ok = false
  try {
    const res = await runProbe()
    ok = res.ok
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
  if (!ok) process.exit(1)
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
