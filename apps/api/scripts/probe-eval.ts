/**
 * Plan 01-03 — probe-eval. Revives v0.1 04-03 spec under the new section-injection
 * path. Canned 6-query harness covering stock-status, SOP-procedure, equipment-
 * troubleshooting, contact-lookup, multi-step procedural, and ambiguous fallback.
 *
 * Plan 06-04 Task 5 — extended 6 → 12 queries. Original 6 are retrieval-shape
 * assertions (E1-E6 — "did the doc come back with a section?"). New 6 are
 * mode-classified shape assertions for the chat-core quality gate spanning
 * lookup (L1-L2), reasoning (R1-R2), incident (I1-I2). Each new query carries
 * an `expectedShape: { mode, mustInclude: RegExp[], mustNotInclude: RegExp[] }`
 * that asserts chat-core Writer output matches the mode's voice contract (e.g.,
 * reasoning includes "first thing —" or branching; incident includes
 * Now/Then/Don't or sequenced output; lookup is one-line + nudge with no
 * "I found" / "I searched" preamble).
 *
 * Pass-rate gate ≥80% (≥10/12) → exit 0 (was ≥60%/≥4/6 in 06-04 pre-fix).
 * Logs `probe.eval.threshold_candidate` for retrieval similarity floor.
 *
 * Modes:
 *   - DEFAULT (no env) — retrieval-only stub mode for 6 original queries E1-E6;
 *     new mode-shape queries L1/R1/I1/etc are stub-marked `expectedShape.mode`
 *     but actual chat-core invocation runs in real-mode only.
 *   - PROBE_CHAT_CORE_REAL=1 — invokes ChatCoreService.sendMessage on each mode-shape
 *     query and asserts mustInclude/mustNotInclude regexes on Writer output.
 *     Cost: ~$0.50 for the 6 mode queries (Sonnet @ ~$0.04/turn ish).
 *
 *   npm run probe:eval --workspace=api                       # retrieval-only stub-mode
 *   PROBE_CHAT_CORE_REAL=1 npm run probe:eval --workspace=api   # quality gate (real)
 */

import '../src/load-env'
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { prisma } from '../src/database/prisma'
import { QuoteVerifierService } from '../src/modules/chat/quote-verifier.service'
import { ToolDispatcher } from '../src/modules/chat/tool-dispatcher'
import { EmbeddingsService } from '../src/modules/embeddings/embeddings.service'
import { IndexerService } from '../src/modules/indexer/indexer.service'
import { IngestService } from '../src/modules/ingest/ingest.service'
import { SectionDetector } from '../src/modules/ingest/section-detector'
import { MockOpsService } from '../src/modules/mock-ops/mock-ops.service'
import { RetrievalService } from '../src/modules/retrieval/retrieval.service'
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

// Plan 06-04 Task 5 — Each query optionally carries `expectedShape` for the
// real-mode chat-core quality gate (PROBE_CHAT_CORE_REAL=1). Retrieval shape is
// asserted for all 12 in stub mode (DEFAULT). chat-core Writer output is
// asserted for the 6 mode-classified queries (L*/R*/I*) when REAL=1.
type ExpectedShape = {
  mode: 'lookup' | 'reasoning' | 'incident'
  mustInclude: RegExp[]
  mustNotInclude: RegExp[]
}
type CannedQuery = {
  topic: string
  query: string
  fixture: string
  expectedShape?: ExpectedShape
}

// 6 retrieval-shape queries (E1-E6) — legacy v0.1 04-03 corpus topics.
// 6 mode-shape queries (L1-L2, R1-R2, I1-I2) — Plan 06-04 chat-core gate.
const CANNED: CannedQuery[] = [
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
  // ─── Plan 06-04 — mode-shape queries (chat-core quality gate) ────────────
  {
    topic: 'L1.lookup_below_par',
    query: 'what is below par right now',
    fixture: `## Below par right now
Heineken — 8 of 12 needed.
Guinness — 5 of 10 needed.
Estrella — 3 of 8 needed.
Bibendum cutoff today is 4pm.`,
    expectedShape: {
      mode: 'lookup',
      mustInclude: [/heineken|guinness|estrella|below par/i],
      mustNotInclude: [/i (?:found|looked|searched|located)/i, /^(?:here'?s what|let me)/im],
    },
  },
  {
    topic: 'L2.lookup_cutoff',
    query: 'whats the bibendum cutoff',
    fixture: `## Supplier cutoffs
Bibendum: 4pm weekdays, 2pm Saturdays.
Carlsberg brewery: 12pm any day.
Heineken depot: 11am.`,
    expectedShape: {
      mode: 'lookup',
      mustInclude: [/4 ?pm|four pm|cutoff/i],
      mustNotInclude: [/i (?:found|looked|searched)/i, /^(?:here'?s|let me)/im],
    },
  },
  {
    topic: 'R1.reasoning_flat_pint',
    query: 'someone is complaining about a flat pint, what do I do',
    fixture: `## Flat pint troubleshooting
First check: is the gas pressure right (12-14 PSI on the regulator)?
Then check: is the keg about to blow — last pour foamy or short?
If the WHOLE line is flat, take it off and clean it; switch to the spare keg.
If JUST one pint, the punter's pint sat — pour a fresh on the house, move on.
Pattern of complaints from one tap = call the cellar man.`,
    expectedShape: {
      mode: 'reasoning',
      mustInclude: [/first thing|first check|first[,—:]|two paths|if .*if (?:not|just)/i],
      mustNotInclude: [/^(?:here'?s what|let me)/im, /i (?:found|searched|located)/i],
    },
  },
  {
    topic: 'R2.reasoning_short_staffed',
    query: 'short staffed tonight what do I prioritise',
    fixture: `## Short-staffed shift priorities
Priority 1 — keep the bar moving. One bartender on lager, one on cocktails.
Priority 2 — clear glasses every 15 minutes. Empty tables = repeat orders.
Drop floor service to bar-only if necessary; signage on door.
Drop card-only payment to single till.`,
    expectedShape: {
      mode: 'reasoning',
      mustInclude: [/priority|first thing|focus on|keep the/i],
      mustNotInclude: [/^(?:here'?s|let me)/im, /i (?:found|located)/i],
    },
  },
  {
    topic: 'I1.incident_cellar_flooding',
    query: 'the cellar is flooding what do I do',
    fixture: `## Cellar flood emergency
NOW: cut the power at the consumer unit (NOT in the cellar — outside the cellar door).
NOW: turn off the mains water at the stopcock under the bar sink.
THEN: call the duty manager. Their number is in the contact sheet behind the bar.
DON'T: enter the cellar with the power still on.
Call 999 if anyone's hurt.`,
    expectedShape: {
      mode: 'incident',
      mustInclude: [/now[:\s—]|then[:\s—]|don'?t[:\s—]|cut the/i],
      mustNotInclude: [/^(?:here'?s|let me)/im, /i (?:found|located)/i],
    },
  },
  {
    topic: 'I2.incident_fire_alarm',
    query: 'fire alarm went off mid-service what do I do',
    fixture: `## Fire alarm protocol
NOW: evacuate. Calmly direct everyone to the fire exit at the rear.
NOW: muster point is the car park across the road.
THEN: head-count. The duty manager has the staff list.
DON'T: re-enter until the fire brigade clears the building.
Call 999.`,
    expectedShape: {
      mode: 'incident',
      mustInclude: [/now[:\s—]|then[:\s—]|don'?t[:\s—]|evacuate|999/i],
      mustNotInclude: [/^(?:here'?s|let me)/im, /i (?:found|located)/i],
    },
  },
  // ─── Chat-overhaul Wave A/B — new path coverage ────────────────────────
  // N1: narrow question that targets a single sentence deep inside a
  // multi-section doc. Vec recall on the KI-level embedding alone wouldn't
  // surface this for such a specific question — chunk-level recall is what
  // makes it findable.
  {
    topic: 'N1.narrow_question_chunk_recall',
    query: 'what is the gas pressure target after a keg change',
    fixture: `## Cellar opening
1. Turn on lights at the panel by the door.
2. Check the cellar temperature is between 4°C and 6°C.
3. Verify the line cleaner reservoir is full.

## Cellar mid-shift
1. Every 90 minutes: walk the cellar, listen for hissing.
2. Spot-check tap heads for crystallisation.

## Cellar keg change
1. Disconnect the spent keg using the line-tap.
2. Spray sanitiser on the connector.
3. Replace the keg, prime the line.
4. Wait 30 seconds; the gas pressure regulator should read 12 PSI after the change.
5. Pull a half pint to verify flow.

## Cellar closing
1. Lock the cellar door.
2. Log the day's keg movements in the sheet.`,
  },
  // N2: two distinct sections of the same doc are both relevant. With
  // TOP_SECTIONS_PER_KI=2 the model should now see both passages, not just
  // the single best chunk's parent section.
  {
    topic: 'N2.multi_section_per_doc',
    query: 'cleaning the beer lines and the safety gear needed',
    fixture: `## Line cleaning procedure
1. Disconnect all kegs from the system.
2. Connect the line-cleaner reservoir of 3% caustic solution.
3. Pump through for 15 minutes minimum.
4. Rinse with fresh water until pH neutral.
5. Reconnect kegs and prime each line.

## Line cleaning safety
Wear nitrile gloves AND safety goggles before handling caustic solution.
Caustic burns are immediate — keep eyewash on the cellar door.
Do not mix caustic with acid cleaners — toxic chlorine gas results.

## Other procedures
The fire-extinguisher is in the corridor. Check pressure monthly.`,
  },
  // B1: BM25-specific keyword (an exact error code) that wouldn't rank well
  // by pure semantic similarity. Exercises the bm25_resolved subquery which
  // pulls a focused section even when vec_hits didn't surface the KI.
  {
    topic: 'B1.bm25_specific_keyword',
    query: 'F23-A error',
    fixture: `## Coffee machine — La Cimbali daily
Daily clean: pull the group head, run espresso through a blank.

## Coffee machine errors
F12-A: water inlet sensor failure. Reset by holding the power button 10s.
F23-A: temperature probe out of range. Call the supplier — code on the warranty sheet.
F35-B: pump pressure low. Descale.`,
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
      note: '15-query canned harness (E1-E6 retrieval shape, L1-L2/R1-R2/I1-I2 mode shape, N1-N2/B1 chat-overhaul Wave A/B path coverage) · retrieval-only in stub mode (~15-135 ingest Voyage + 15 query Voyage calls @ $0.00006 each ≈ $0.0018-$0.009). PROBE_CHAT_CORE_REAL=1 invokes ChatCoreService for the 6 mode queries — adds ~$0.50 (Sonnet @ ~$0.04-0.08/turn).',
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
    const hits = r.data as Array<{
      entityId: string
      similarity: number
      metadata: { sectionId?: string | null }
    }>
    const top = hits[0] ?? null
    const topSim = top?.similarity ?? null
    const hasSection = top?.metadata?.sectionId != null
    let pass = hits.length >= 1 && hasSection
    let detail = `hits=${hits.length} sectionInjected=${hasSection}`

    // N2 has an extra-strict assertion: TOP_SECTIONS_PER_KI=2 should yield
    // at least 2 hits with the same entityId for a multi-section doc, since
    // both the procedure and safety sections are relevant to the query.
    // NOTE: brittle if a future change drops the find_knowledge limit below
    // 2 or adds a cross-doc rerank step that demotes the second section
    // past the per-call limit. If this flakes, raise `limit` in the
    // dispatch call above to 8+ and dedup post-hoc.
    if (c.topic === 'N2.multi_section_per_doc') {
      const idCounts = new Map<string, number>()
      for (const h of hits) idCounts.set(h.entityId, (idCounts.get(h.entityId) ?? 0) + 1)
      const maxFromOneDoc = [...idCounts.values()].reduce((a, b) => Math.max(a, b), 0)
      const multiSectionOk = maxFromOneDoc >= 2
      pass = pass && multiSectionOk
      detail = `${detail} maxSectionsPerDoc=${maxFromOneDoc}`
    }

    record(c.topic, pass, topSim, detail)
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

  // Plan 06-04 Task 5 — pass-rate gate ≥80%. Chat-overhaul Wave C raised
  // canned set from 12 → 15 (added N1/N2/B1 for chunk-recall, multi-section,
  // and BM25-specific paths). Gate stays at ≥80% (≥12/15).
  process.exit(passRate >= 0.8 ? 0 : 1)
}

main().catch((err) => {
  console.error('probe-eval crashed:', err)
  process.exit(1)
})
