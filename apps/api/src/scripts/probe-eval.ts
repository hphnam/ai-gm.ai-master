import '../load-env'

import { NestFactory } from '@nestjs/core'
import { prisma } from '@gm-ai/database'
import { AppModule } from '../app.module'
import { ChatService } from '../modules/chat/chat.service'
import { VENUE_CROWN } from '../modules/seed/seed-data'

type ToolName =
  | 'find_knowledge'
  | 'get_stock_below_par'
  | 'get_stock_by_name'
  | 'get_supplier_by_name'
  | 'get_upcoming_cutoffs'

type EvalQuery = {
  name: string
  query: string
  venueId: string
  expectedKnowledgeContent?: string[]
  expectedTools?: ToolName[]
}

type EvalResult = {
  name: string
  retrieval_hit: boolean | null
  tool_hit: boolean | null
  topSim: number | null
  assistantMessageId: string
  conversationId: string
}

const MIN_PASS_RATE = 0.6

const QUERIES: EvalQuery[] = [
  {
    name: 'ice-machine-e2',
    query: 'How do I fix the ice machine if it shows error code E2?',
    venueId: VENUE_CROWN,
    expectedKnowledgeContent: ['Ice Machine'],
    expectedTools: ['find_knowledge'],
  },
  {
    name: 'closing-procedure',
    query: 'What is the closing procedure at The Crown?',
    venueId: VENUE_CROWN,
    expectedKnowledgeContent: ['Closing Procedure'],
    expectedTools: ['find_knowledge'],
  },
  {
    name: 'fire-emergency',
    query: 'If a fire breaks out what is the evacuation procedure?',
    venueId: VENUE_CROWN,
    expectedKnowledgeContent: ['Fire Emergency'],
    expectedTools: ['find_knowledge'],
  },
  {
    name: 'below-par',
    query: 'What stock is below par at the Crown right now?',
    venueId: VENUE_CROWN,
    expectedTools: ['get_stock_below_par'],
  },
  {
    name: 'supplier-cutoffs',
    query: 'Which supplier cutoffs are coming up this week?',
    venueId: VENUE_CROWN,
    expectedTools: ['get_upcoming_cutoffs'],
  },
  {
    name: 'ordering-guide',
    query: 'How should I plan the weekly order at The Crown?',
    venueId: VENUE_CROWN,
    expectedKnowledgeContent: ['Weekly Ordering'],
    expectedTools: ['find_knowledge'],
  },
]

type ToolCallEntry = {
  tool?: string
  result?: { ok?: boolean; data?: Array<{ similarity?: number }> }
}

function extractTopSimilarity(log: unknown[]): number | null {
  for (const raw of log) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as ToolCallEntry
    if (e.tool !== 'find_knowledge') continue
    const r = e.result
    if (!r || r.ok !== true || !Array.isArray(r.data) || r.data.length === 0) continue
    const first = r.data[0]
    if (first && typeof first.similarity === 'number') return first.similarity
  }
  return null
}

function toolNamesIn(log: unknown[]): Set<string> {
  const s = new Set<string>()
  for (const raw of log) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as ToolCallEntry
    if (typeof e.tool === 'string') s.add(e.tool)
  }
  return s
}

async function resolveExpectedKnowledgeIds(substrings: string[]): Promise<string[]> {
  const ids: string[] = []
  for (const substr of substrings) {
    const hit = await prisma.knowledgeItem.findFirst({
      where: { content: { contains: substr, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (hit) ids.push(hit.id)
  }
  return ids
}

async function runProbe(): Promise<{ ok: boolean }> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    abortOnError: false,
    logger: false,
  })
  const chat = app.get(ChatService)

  const results: EvalResult[] = []
  const createdConversationIds: string[] = []

  try {
    for (const q of QUERIES) {
      const expectedIds = q.expectedKnowledgeContent
        ? await resolveExpectedKnowledgeIds(q.expectedKnowledgeContent)
        : undefined

      const res = await chat.sendMessage({ venueId: q.venueId, userMessage: q.query })
      createdConversationIds.push(res.conversationId)

      const retrieval_hit = expectedIds
        ? expectedIds.some((id) => res.retrievedItemIds.includes(id))
        : null
      const toolNames = toolNamesIn(res.toolCallLog)
      const tool_hit = q.expectedTools
        ? q.expectedTools.every((t) => toolNames.has(t))
        : null
      const topSim = extractTopSimilarity(res.toolCallLog)

      results.push({
        name: q.name,
        retrieval_hit,
        tool_hit,
        topSim,
        assistantMessageId: res.assistantMessage.id,
        conversationId: res.conversationId,
      })
    }

    console.log('\nQuery                  retrieval_hit   tool_hit   topSim       pass')
    console.log('─────────────────────  ─────────────   ────────   ─────────    ────')
    for (const r of results) {
      const rh = r.retrieval_hit === null ? '   -   ' : r.retrieval_hit ? '   ✓   ' : '   ✗   '
      const th = r.tool_hit === null ? '   -   ' : r.tool_hit ? '   ✓   ' : '   ✗   '
      const sim = r.topSim === null ? '    -    ' : r.topSim.toFixed(3).padStart(8)
      const pass =
        (r.retrieval_hit === null || r.retrieval_hit) &&
        (r.tool_hit === null || r.tool_hit)
      console.log(
        `${r.name.padEnd(22)} ${rh}      ${th}    ${sim}    ${pass ? '✓' : '✗'}`,
      )
    }

    const scored = results.filter((r) => r.retrieval_hit !== null)
    const passed = scored.filter((r) => r.retrieval_hit === true).length
    const passRate = scored.length > 0 ? passed / scored.length : 1
    console.log(
      `\nretrieval_hit aggregate: ${passed}/${scored.length} = ${(passRate * 100).toFixed(1)}% (threshold ${MIN_PASS_RATE * 100}%)`,
    )

    const assistantIds = results.map((r) => r.assistantMessageId)
    const lowSimQueueCount = await prisma.reTagQueueItem.count({
      where: { reason: 'low-similarity', sourceMessageId: { in: assistantIds } },
    })
    console.log(`low-similarity side-effect: ${lowSimQueueCount} retag_queue_items created`)
    if (lowSimQueueCount === 0) {
      console.warn(
        '  (warn: 0 low-similarity rows — either all queries hit cleanly or ChatService→AdaptationService wiring may be silent. Not failing build on this alone.)',
      )
    }

    const toolHitFailed = results.filter((r) => r.tool_hit === false)
    if (toolHitFailed.length > 0) {
      console.log(
        `\ntool_hit misses: ${toolHitFailed.map((r) => r.name).join(', ')} (informational)`,
      )
    }

    await prisma.reTagQueueItem.deleteMany({
      where: { sourceMessageId: { in: assistantIds } },
    })
    await prisma.chatConversation.deleteMany({
      where: { id: { in: createdConversationIds } },
    })

    return { ok: passRate >= MIN_PASS_RATE }
  } finally {
    await app.close().catch(() => {})
  }
}

async function main() {
  let ok = false
  try {
    const res = await runProbe()
    ok = res.ok
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
  if (!ok) {
    console.error('\nprobe-eval FAILED — pass rate below threshold')
    process.exit(1)
  }
  console.log('\nprobe-eval PASSED')
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
