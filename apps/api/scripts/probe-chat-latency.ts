/**
 * probe-chat-latency — where does a web-chat turn's wall-clock actually go?
 *
 * Drives the REAL web agent (buildGmAgent + a real ToolDispatcher wired with the
 * real retrieval / tabular / ops read services) against a real org, timing each
 * phase: read-only preamble, then per-round model time vs per-tool dispatch time
 * across the agentic loop. Answers "why does 'who is Elliot Horner' take 20s"
 * with numbers instead of inference.
 *
 * WRITE-FREE by construction:
 *   - Never calls ChatService.sendMessage → nothing persisted, no socket emit.
 *   - Only read tools are allowed (ALLOW below); every other tool is blocked at
 *     the dispatcher boundary, so a mis-routed model call can't write AND can't
 *     reach a stubbed service.
 *   - Built WITHOUT Nest DI (the existing probes do the same): bootstrapping the
 *     full AppModule under tsx trips an `import type` + emitDecoratorMetadata gap
 *     in a BullMQ processor. We construct the shallow read graph by hand instead.
 *
 * Reads prod data; spends a little Anthropic + Voyage.
 *
 *   PROBE_ORG_ID=<uuid> PROBE_RUNS=2 npm run probe:chat-latency --workspace=api
 */

import '../src/load-env'
import 'reflect-metadata'
import { performance } from 'node:perf_hooks'
import type { ModelMessage } from 'ai'
import { prisma } from '../src/database/prisma'
import {
  buildGmAgent,
  type VenueContactSummary,
  type VenueProfileContext,
  type VenueSnapshot,
} from '../src/modules/chat/gm-agent'
import { ToolDispatcher } from '../src/modules/chat/tool-dispatcher'
import { EmbeddingsService } from '../src/modules/embeddings/embeddings.service'
import { IntegrationRegistry } from '../src/modules/integrations/integration-registry'
import { MockOpsService } from '../src/modules/mock-ops/mock-ops.service'
import { loadOrganizationProfile } from '../src/modules/organization/organization.service'
import { RetrievalService } from '../src/modules/retrieval/retrieval.service'
import { TabularQueryService } from '../src/modules/tabular/tabular.service'
import { fail, VenueProfileSchema } from '../src/types'

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'probe-chat-latency reads prod data + spends tokens — refuse to run with NODE_ENV=production',
  )
}

// Only these tools run for real (all reads, all backed by services we construct).
// Everything else is blocked → guarantees no write and no stubbed-service call.
const ALLOW = new Set<string>([
  'find_knowledge',
  'find_person',
  'query_document_table',
  'get_stock_below_par',
  'get_stock_by_name',
  'get_supplier_by_name',
  'get_upcoming_cutoffs',
])

type ToolTiming = { tool: string; ms: number; blocked: boolean }
type TurnCollector = { toolTimings: ToolTiming[]; stepAtMs: number[] }

const DEFAULT_QUERIES = [
  'hi', // baseline: no tools — pure thinking floor
  'who is Elliot Horner', // find_person path
  'how do I change a keg', // find_knowledge (Voyage embed + rerank) path
  'what stock is below par right now', // structured ops lookup path
]

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

// Read-only replica of ChatService.buildVenueContext (private) — same queries.
async function buildVenueContext(venue: {
  id: string
  name: string
  timezone: string
  address: string | null
  type: string
  profile: unknown
}) {
  const parsed = VenueProfileSchema.safeParse(venue.profile ?? {})
  const profile: VenueProfileContext | null = parsed.success
    ? {
        layoutNotes: parsed.data.layoutNotes ?? null,
        fireEscapes: parsed.data.fireEscapes ?? null,
        firstAidPoints: parsed.data.firstAidPoints ?? null,
        keySafePolicy: parsed.data.keySafePolicy ?? null,
        alarmPolicy: parsed.data.alarmPolicy ?? null,
        openingHours: parsed.data.openingHours ?? null,
        what3words: parsed.data.what3words ?? null,
        accessibilityNotes: parsed.data.accessibilityNotes ?? null,
        deliveryNotes: parsed.data.deliveryNotes ?? null,
      }
    : null
  const contacts: VenueContactSummary[] = await prisma.venueContact.findMany({
    where: { venueId: venue.id },
    select: { name: true, role: true, phone: true, email: true, isEmergencyContact: true },
    orderBy: [{ isEmergencyContact: 'desc' }, { role: 'asc' }, { name: 'asc' }],
    take: 12,
  })
  return { ...venue, profile, contacts }
}

// Read-only replica of ChatService.buildVenueSnapshot (private) — same $queryRaw.
async function buildVenueSnapshot(orgId: string, venueId: string): Promise<VenueSnapshot> {
  const rows = await prisma.$queryRaw<
    { id: string; content: string; aiSummary: string | null; metadata: unknown }[]
  >`
    SELECT id, left(content, 4000) AS content, "aiSummary", metadata
    FROM "knowledge_items"
    WHERE "organizationId" = ${orgId}
      AND ("venueId" = ${venueId} OR "venueId" IS NULL)
      AND "answerStatus" = 'answered'
      AND "supersededAt" IS NULL
    ORDER BY "updatedAt" DESC
    LIMIT 48
  `
  const topKnowledge: VenueSnapshot['topKnowledge'] = []
  const recentlyAnswered: VenueSnapshot['recentlyAnswered'] = []
  const tabularDocs: VenueSnapshot['tabularDocs'] = []
  let orgChartDoc: VenueSnapshot['orgChartDoc']
  for (const r of rows) {
    const meta = (r.metadata ?? {}) as Record<string, unknown>
    const docType = typeof meta.docType === 'string' ? meta.docType : null
    const docPurpose = typeof meta.docPurpose === 'string' ? meta.docPurpose : null
    const title =
      typeof meta.title === 'string' && meta.title.trim().length > 0
        ? meta.title.trim()
        : r.content.replace(/\s+/g, ' ').trim().slice(0, 80)
    const summary = (r.aiSummary ?? r.content).replace(/\s+/g, ' ').trim().slice(0, 240)
    if (docPurpose === 'org_chart' && !orgChartDoc) {
      const stripped = r.content.replace(/^Context from uploader: [\s\S]*?\n\n---\n\n/, '')
      orgChartDoc = { id: r.id, title, content: stripped.trim().slice(0, 2000) }
      continue
    }
    if (docType === 'tabular') {
      if (tabularDocs.length < 16) tabularDocs.push({ id: r.id, title })
      continue
    }
    if (meta.isGap === true) {
      const tentative = typeof meta.tentativeAnswer === 'string' ? meta.tentativeAnswer : null
      const answer = r.aiSummary && r.aiSummary.trim().length > 0 ? r.aiSummary : tentative
      if (answer && recentlyAnswered.length < 10) {
        recentlyAnswered.push({
          question: r.content.replace(/\s+/g, ' ').trim().slice(0, 200),
          answer: answer.replace(/\s+/g, ' ').trim().slice(0, 320),
        })
      }
      continue
    }
    if (topKnowledge.length < 20) topKnowledge.push({ id: r.id, title, summary })
  }
  return { topKnowledge, recentlyAnswered, tabularDocs, orgChartDoc }
}

async function main() {
  const runs = Math.max(1, Number(process.env.PROBE_RUNS ?? '2'))
  const queries: string[] = process.env.PROBE_QUERIES
    ? (JSON.parse(process.env.PROBE_QUERIES) as string[])
    : DEFAULT_QUERIES

  const orgId =
    process.env.PROBE_ORG_ID ??
    (await prisma.venue.findFirst({ select: { organizationId: true } }))?.organizationId
  if (!orgId) throw new Error('no org found — set PROBE_ORG_ID')

  const venue = await prisma.venue.findFirst({
    where: {
      organizationId: orgId,
      ...(process.env.PROBE_VENUE_ID ? { id: process.env.PROBE_VENUE_ID } : {}),
    },
    select: { id: true, name: true, timezone: true, address: true, type: true, profile: true },
  })
  if (!venue) throw new Error(`no venue for org ${orgId}`)

  const member = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, role: { in: ['owner', 'manager'] } },
    select: { userId: true, role: true },
  })
  const userId = process.env.PROBE_USER_ID ?? member?.userId
  if (!userId) throw new Error(`no owner/manager in org ${orgId} — set PROBE_USER_ID`)
  const userRole = member?.role ?? 'owner'
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  // Real read services (shallow graph); write-backing deps stubbed — never
  // reached because only ALLOW tools dispatch.
  const stub = {} as never
  const retrieval = new RetrievalService(new EmbeddingsService())
  const tabular = new TabularQueryService()
  const mockOps = new MockOpsService()
  const integrations = new IntegrationRegistry(stub) // no providers registered → no pos_* tools
  const realDispatcher = new ToolDispatcher(
    retrieval,
    mockOps,
    stub /*ingest*/,
    stub /*verifier*/,
    tabular,
    stub /*chatCore*/,
    stub /*realtime*/,
    stub /*tasks*/,
    stub /*incidents*/,
    integrations,
    stub /*reports*/,
    stub /*pricing*/,
    stub /*scheduledReports*/,
  )

  let turn: TurnCollector = { toolTimings: [], stepAtMs: [] }
  const guarded = {
    dispatch: async (name: string, input: unknown, ctx: unknown) => {
      if (!ALLOW.has(name)) {
        turn.toolTimings.push({ tool: name, ms: 0, blocked: true })
        return fail('error', `blocked by probe (non-read tool: ${name})`)
      }
      const t = performance.now()
      try {
        // biome-ignore lint/suspicious/noExplicitAny: probe wrapper delegates verbatim
        return await (realDispatcher as any).dispatch(name, input, ctx)
      } finally {
        turn.toolTimings.push({ tool: name, ms: performance.now() - t, blocked: false })
      }
    },
  } as unknown as ToolDispatcher

  console.log(
    JSON.stringify({
      event: 'probe.target',
      orgId,
      venueId: venue.id,
      userRole,
      runs,
      queries: queries.length,
    }),
  )

  type Row = {
    query: string
    run: number
    preambleMs: number
    totalMs: number
    rounds: number
    toolMs: number
    modelMs: number
    tools: string
    inTok: number
    outTok: number
    cacheRead: number
    cacheWrite: number
    answer: string
  }
  const rows: Row[] = []

  for (const query of queries) {
    for (let run = 1; run <= runs; run++) {
      turn = { toolTimings: [], stepAtMs: [] }

      const p0 = performance.now()
      const [venueContext, venueSnapshot, businessProfile] = await Promise.all([
        buildVenueContext(venue),
        buildVenueSnapshot(orgId, venue.id),
        loadOrganizationProfile(orgId),
      ])
      const preambleMs = performance.now() - p0

      const agent = buildGmAgent({
        dispatcher: guarded,
        integrations,
        ctx: { orgId, userId, userRole },
        activeProviderIds: new Set(), // probe skips live integrations (no pos_* tools)
        businessProfile,
        integrationsSummary: [],
        memoryExecute: null, // write-free
        venueContext,
        mode: 'default',
        venueSnapshot,
        routingHint: null,
        userContext: { name: user?.name ?? null, email: user?.email ?? '', profileSummary: null },
        onStepFinish: () => {
          turn.stepAtMs.push(performance.now())
        },
      })

      const messages: ModelMessage[] = [{ role: 'user', content: query }]
      const ac = new AbortController()
      const killer = setTimeout(() => ac.abort(), 90_000)
      const g0 = performance.now()
      let answer = ''
      let usage: {
        inputTokens?: number
        outputTokens?: number
        inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number }
      } = {}
      try {
        const result = await agent.generate({ messages, abortSignal: ac.signal })
        answer = (result.text ?? '').trim()
        usage = (result.usage ?? {}) as typeof usage
      } catch (err) {
        answer = `<error: ${(err as Error).message}>`
      } finally {
        clearTimeout(killer)
      }
      const totalMs = performance.now() - g0
      const toolMs = turn.toolTimings.reduce((a, t) => a + t.ms, 0)

      const row: Row = {
        query,
        run,
        preambleMs: Math.round(preambleMs),
        totalMs: Math.round(totalMs),
        rounds: turn.stepAtMs.length,
        toolMs: Math.round(toolMs),
        modelMs: Math.round(totalMs - toolMs),
        tools: turn.toolTimings
          .map((t) => `${t.tool}${t.blocked ? '(blocked)' : `:${Math.round(t.ms)}ms`}`)
          .join(', '),
        inTok: usage.inputTokens ?? 0,
        outTok: usage.outputTokens ?? 0,
        cacheRead: usage.inputTokenDetails?.cacheReadTokens ?? 0,
        cacheWrite: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
        answer: answer.replace(/\s+/g, ' ').slice(0, 90),
      }
      rows.push(row)
      console.log(JSON.stringify({ event: 'probe.turn', ...row }))
    }
  }

  console.log(
    '\n──────── latency summary (ms) — model = thinking+generation, tool = dispatch ────────',
  )
  console.log(
    ['query', 'run', 'total', 'preamb', 'model', 'tool', 'rnds', 'outTok', 'cacheRd', 'tools'].join(
      '\t',
    ),
  )
  for (const r of rows) {
    console.log(
      [
        r.query.slice(0, 22),
        r.run,
        r.totalMs,
        r.preambleMs,
        `${r.modelMs}(${pct(r.modelMs, r.totalMs)})`,
        `${r.toolMs}(${pct(r.toolMs, r.totalMs)})`,
        r.rounds,
        r.outTok,
        r.cacheRead,
        r.tools,
      ].join('\t'),
    )
  }
  console.log(
    '\nRead: high `model` share + high `outTok` on a trivial lookup ⇒ thinking is the cost',
  )
  console.log(
    '(effort defaults to `high`; outTok counts thinking tokens even though display is omitted).',
  )
  console.log('Caveat: probe skips live integrations, so no pos_* tools / <integrations> block.')

  await prisma.$disconnect().catch(() => {})
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
