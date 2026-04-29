/**
 * Plan 01-03 — probe-eval. Revives v0.1 04-03 spec under the new section-injection
 * path. Canned 6-query harness covering stock-status, SOP-procedure, equipment-
 * troubleshooting, contact-lookup, multi-step procedural, and ambiguous fallback.
 *
 * Pass rate ≥60% (4/6) → exit 0. Logs `probe.eval.threshold_candidate` with the
 * observed similarity floor across the 6 queries — operator decision is whether
 * to update RetrievalOpts default minSimilarity (0.3 today; new floor TBD).
 *
 * Retrieval-only this plan (audit-M2) — no chat-path Anthropic calls. Cost
 * ceiling: 6-54 ingest Voyage calls + 6 query-side Voyage calls
 * ≈ $0.0008-$0.0034 total. probe-eval cost banner asserts.
 *
 *   pnpm --filter api probe:eval
 */

import '../src/load-env'
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { prisma } from '../src/database/prisma'
import { EmbeddingsService } from '../src/modules/embeddings/embeddings.service'
import { IndexerService } from '../src/modules/indexer/indexer.service'
import { IngestService } from '../src/modules/ingest/ingest.service'
import { SectionDetector } from '../src/modules/ingest/section-detector'
import { RetrievalService } from '../src/modules/retrieval/retrieval.service'
import { ToolDispatcher } from '../src/modules/chat/tool-dispatcher'
import { MockOpsService } from '../src/modules/mock-ops/mock-ops.service'
import { QuoteVerifierService } from '../src/modules/chat/quote-verifier.service'
import { TabularQueryService } from '../src/modules/tabular/tabular.service'

const PROBE_ORG_SLUG = 'probe-eval-org'

type Outcome = { name: string; pass: boolean; topSimilarity: number | null; detail?: string }
const results: Outcome[] = []

function record(name: string, pass: boolean, topSimilarity: number | null, detail?: string) {
  results.push({ name, pass, topSimilarity, detail })
  console.log(
    JSON.stringify({
      event: `probe.eval.${name}.${pass ? 'pass' : 'fail'}`,
      topSimilarity,
      detail,
    }),
  )
}

async function pnpCleanup(): Promise<void> {
  const existing = await prisma.organization.findUnique({ where: { slug: PROBE_ORG_SLUG } })
  if (!existing) return
  const orgId = existing.id
  await prisma.searchableEntity.deleteMany({ where: { organizationId: orgId } }).catch(() => {})
  await prisma.knowledgeItem.deleteMany({ where: { organizationId: orgId } }).catch(() => {})
  await prisma.documentType.deleteMany({ where: { organizationId: orgId } }).catch(() => {})
  await prisma.checklist.deleteMany({ where: { organizationId: orgId } }).catch(() => {})
  await prisma.incidentLog.deleteMany({ where: { organizationId: orgId } }).catch(() => {})
  await prisma.searchAnalytics.deleteMany({ where: { organizationId: orgId } }).catch(() => {})
  await prisma.invitation.deleteMany({ where: { organizationId: orgId } }).catch(() => {})
  await prisma.organizationMember.deleteMany({ where: { organizationId: orgId } }).catch(() => {})
  await prisma.venue.deleteMany({ where: { organizationId: orgId } }).catch(() => {})
  await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
}

async function ensureOrgWithVenue(): Promise<{ orgId: string; venueId: string }> {
  const org = await prisma.organization.create({
    data: { id: randomUUID(), name: 'Probe Eval Org', slug: PROBE_ORG_SLUG },
    select: { id: true },
  })
  const venue = await prisma.venue.create({
    data: {
      id: randomUUID(),
      name: 'Probe Eval Venue',
      type: 'pub',
      organizationId: org.id,
    },
    select: { id: true },
  })
  return { orgId: org.id, venueId: venue.id }
}

// 6 canned fixtures — content shape mirrors v0.1 04-03 corpus topics.
const CANNED: { query: string; fixture: string; topic: string }[] = [
  {
    topic: 'E1.stock_status',
    query: 'what beers are below par at the venue',
    fixture: `## Stock par levels
The cellar should hold 4 kegs of Carlsberg Lager and 3 kegs of Guinness at all times.
When stock drops below par, raise an order with the brewery rep.

## Reorder triggers
Below par on Carlsberg → call the rep.
Below par on Guinness → call the rep.`,
  },
  {
    topic: 'E2.sop_procedure',
    query: 'how do I open the cellar in the morning',
    fixture: `## Opening checklist
1. Turn on the cellar lights at the panel by the door.
2. Check the cellar temperature is between 4°C and 6°C.
3. Check the line cleaner reservoir is full.
4. Check the CO2 cylinder pressure is above 50 bar.
5. Walk the lines and confirm flow on each tap.`,
  },
  {
    topic: 'E3.equipment_troubleshooting',
    query: 'the ice machine error code E4',
    fixture: `## Ice machine troubleshooting
Error E4: water inlet fault. Check the supply valve under the bar is open.
Error E2: temperature sensor fault. Power-cycle the unit; if persistent call the supplier.
Error E1: low water pressure. Check the filter cartridge — replace if older than 6 months.`,
  },
  {
    topic: 'E4.contact_lookup',
    query: 'who is the brewery rep for Carlsberg',
    fixture: `## Supplier contacts
Carlsberg brewery rep: Dave Thompson, phone 07700 900123, email dave@carlsberg.co.uk
Guinness rep: Sarah O'Connor, phone 07700 900456, email sarah@diageo.com
Wine supplier: Bibendum, phone 020 7440 2000`,
  },
  {
    topic: 'E5.multi_step_procedural',
    query: 'weekly stocktake steps',
    fixture: `## Weekly stocktake procedure
Step 1: count all bottles in the storeroom — record on the stocktake sheet.
Step 2: count all kegs in the cellar — record connected vs spare.
Step 3: count spirit bottles behind the bar — measure partial bottles to nearest 0.1.
Step 4: enter all counts into the spreadsheet.
Step 5: variance check against the previous week — flag any item with > 10% variance.`,
  },
  {
    topic: 'E6.ambiguous_fallback',
    query: 'the thing about the keg returns',
    fixture: `## Keg return procedure
Empty kegs go to the cask-return area near the rear delivery door.
Stack them upright, label-side out, ready for the brewery to swap on the next drop.
Do NOT crush or damage kegs — the brewery charges for damage.`,
  },
]

async function main() {
  const t0 = Date.now()
  await pnpCleanup()
  const { orgId, venueId } = await ensureOrgWithVenue()

  // Manual DI — same pattern as probe-section.ts.
  const embeddings = new EmbeddingsService()
  embeddings.onModuleInit()
  const indexer = new IndexerService(embeddings)
  const detector = new SectionDetector()
  const ingest = new IngestService(embeddings, indexer, detector)
  ingest.onModuleInit()
  const retrieval = new RetrievalService(embeddings)
  retrieval.onModuleInit()
  const mockOps = new MockOpsService()
  const verifier = new QuoteVerifierService()
  verifier.onModuleInit()
  // Plan 05-01 Task 4 — TabularQueryService threaded into dispatcher (5th arg).
  const tabular = new TabularQueryService()
  const dispatcher = new ToolDispatcher(retrieval, mockOps, ingest, verifier, tabular)

  console.log(
    JSON.stringify({
      event: 'probe.eval.cost_banner',
      note: '6-query canned harness · retrieval-only (audit-M2) · ~6-54 ingest Voyage + 6 query Voyage calls @ $0.00006 each ≈ $0.0008-$0.0034 total. NO Anthropic chat calls.',
    }),
  )

  // Ingest fixtures.
  for (const c of CANNED) {
    await ingest.ingest({
      id: randomUUID(),
      title: c.topic,
      content: c.fixture,
      organizationId: orgId,
      venueId,
    })
  }

  // Run each canned query.
  const ctx = { orgId, userId: randomUUID(), userRole: 'manager' }
  const similarities: { topic: string; topSim: number | null }[] = []

  for (const c of CANNED) {
    const r = await dispatcher.dispatch(
      'find_knowledge',
      { query: c.query, venueId, limit: 5 },
      ctx,
    )
    if (!r.ok) {
      record(c.topic, false, null, `outcome=fail reason=${r.reason}`)
      similarities.push({ topic: c.topic, topSim: null })
      continue
    }
    const hits = r.data as Array<{ similarity: number; metadata: { sectionId?: string | null } }>
    const top = hits[0] ?? null
    const topSim = top?.similarity ?? null
    const hasSection = top?.metadata?.sectionId != null
    const pass = hits.length >= 1 && hasSection
    record(c.topic, pass, topSim, `hits=${hits.length} sectionInjected=${hasSection}`)
    similarities.push({ topic: c.topic, topSim })
  }

  const passes = results.filter((r) => r.pass).length
  const passRate = passes / results.length

  // Threshold candidate — observed similarity floor across the 6.
  const sims = similarities
    .map((s) => s.topSim)
    .filter((s): s is number => s !== null)
    .sort((a, b) => a - b)
  const min = sims[0] ?? null
  const max = sims[sims.length - 1] ?? null
  const median = sims.length > 0 ? sims[Math.floor(sims.length / 2)] : null

  console.log(
    JSON.stringify({
      event: 'probe.eval.threshold_candidate',
      similarities: similarities.map((s) => ({
        topic: s.topic,
        topSim: s.topSim,
      })),
      min,
      max,
      median,
      currentDefaultMinSimilarity: 0.3,
      recommendation:
        min !== null && min > 0.35
          ? 'Consider raising default minSimilarity from 0.3 toward observed floor (operator review — D-01-03-D2)'
          : 'Keep default minSimilarity=0.3; observed floor does not warrant flip',
    }),
  )

  await pnpCleanup()
  await prisma.$disconnect()

  console.log('\n────────── probe-eval summary ──────────')
  console.log(`pass: ${passes} / ${results.length} (${(passRate * 100).toFixed(0)}%)`)
  console.log(`elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  if (passes < results.length) {
    console.log('FAIL:')
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  ${r.name}: ${r.detail ?? '(no detail)'}`)
    }
  }

  // Pass-rate gate ≥60%.
  process.exit(passRate >= 0.6 ? 0 : 1)
}

main().catch((err) => {
  console.error('probe-eval crashed:', err)
  process.exit(1)
})
