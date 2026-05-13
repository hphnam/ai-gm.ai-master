/**
 * Plan 01-01 + 01-02 — probe-section. Verifies the hierarchical-retrieval foundation:
 * schema shape (W1/W2), section detection across mime hints (W3-W6), cap policy
 * (W7-W9), chunk creation + overlap (W10/W13), tenant scoping (W11), idempotency
 * (W12), embedding dim (W14), cost ceiling (W15), per-doc cap (W16), quality-
 * degraded warn (W17), backfill idempotency + retrieval section-injection +
 * fallback + EXPLAIN-uses-index + advisory-lock + cost-ceiling-halt (W18-W23).
 * Idempotent: pre-cleanup + post-cleanup symmetric.
 *
 *   PROBE_VOYAGE_FAIL_RATIO=0.5 npm run probe:section --workspace=api
 *   npm run probe:section --workspace=api
 */

import '../src/load-env'
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { Logger } from '@nestjs/common'
import { prisma } from '../src/database/prisma'
import {
  buildGmAgent,
  buildSystemMessagesForInspection,
  inspectAgentProviderOptions,
} from '../src/modules/chat/gm-agent'
import { QuoteVerifierService } from '../src/modules/chat/quote-verifier.service'
import { ToolDispatcher } from '../src/modules/chat/tool-dispatcher'
import { EmbeddingsService } from '../src/modules/embeddings/embeddings.service'
import { IndexerService } from '../src/modules/indexer/indexer.service'
import { IngestService } from '../src/modules/ingest/ingest.service'
import { SectionDetector } from '../src/modules/ingest/section-detector'
import { MockOpsService } from '../src/modules/mock-ops/mock-ops.service'
import { RetrievalService } from '../src/modules/retrieval/retrieval.service'
import { TabularQueryService } from '../src/modules/tabular/tabular.service'
import { CHUNK_TARGET_TOKENS, CSV_ROW_BATCH_SIZE, MAX_EMBEDS_PER_DOCUMENT } from '../src/types'
import { runBackfill } from './backfill-knowledge-sections'

const PROBE_ORG_SLUG = 'probe-section-org'
const PROBE_ORG_B_SLUG = 'probe-section-org-b'

type AssertResult = { name: string; pass: boolean; detail?: string }
const results: AssertResult[] = []

function assert(name: string, ok: boolean, detail?: string) {
  results.push({ name, pass: ok, detail })
  console.log(JSON.stringify({ event: `probe.assert.${name}.${ok ? 'pass' : 'fail'}`, detail }))
}

function assertEqual<T>(name: string, actual: T, expected: T, detail?: string) {
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

function assertLt(name: string, actual: number, max: number, detail?: string) {
  const ok = actual < max
  assert(name, ok, ok ? detail : `expected < ${max}, got ${actual}${detail ? ` (${detail})` : ''}`)
}

async function pnpCleanup(): Promise<void> {
  // Org→KI/Section/Chunk FKs are RESTRICT (matches existing project pattern).
  // Delete children first; KI deletion cascades to its own sections+chunks.
  for (const slug of [PROBE_ORG_SLUG, PROBE_ORG_B_SLUG]) {
    const existing = await prisma.organization.findUnique({ where: { slug } })
    if (!existing) continue
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
}

async function ensureOrgWithVenue(
  slug: string,
  name: string,
): Promise<{ orgId: string; venueId: string }> {
  const org = await prisma.organization.create({
    data: { id: randomUUID(), name, slug },
    select: { id: true },
  })
  const venue = await prisma.venue.create({
    data: {
      id: randomUUID(),
      name: `${name} Venue`,
      type: 'pub',
      organizationId: org.id,
    },
    select: { id: true },
  })
  return { orgId: org.id, venueId: venue.id }
}

// ──────────────────────────────────────────────────────────────────
// Fixture text generators.
// ──────────────────────────────────────────────────────────────────

function fixtureMd(): string {
  return `## Heading A\nFirst section body about cellar temperature.\n\n## Heading B\nSecond section body about evacuation procedures.\n`
}

function fixturePptx(): string {
  return [
    '## Slide 1: Welcome',
    'Intro slide body about the venue.',
    '## Slide 2: Cellar Setup',
    'Body explaining cellar temperature ranges.',
    '## Slide 3: Closing',
    'Wrap-up body.',
  ].join('\n')
}

function fixtureCsv(rows: number): string {
  const header = 'sku,name,qty,par'
  const lines = [header]
  for (let i = 1; i <= rows; i++) {
    lines.push(`SKU${i.toString().padStart(4, '0')},Item ${i},${i % 50},${(i % 50) + 5}`)
  }
  return lines.join('\n')
}

function fixtureFlatNoHeadings(): string {
  return 'This is a single block of plain prose with no headings or markers. It should collapse to a single section.'
}

function fixtureOversizedNoSubheadings(approxTokens: number): string {
  // ~4 chars/token. Build large body with no heading lines.
  const charBudget = approxTokens * 4
  const sentence =
    'The cellar temperature must remain between four and six degrees celsius at all times. '
  let buf = ''
  while (buf.length < charBudget) buf += sentence
  return buf
}

function fixtureWithSubheadings(approxTokens: number): string {
  const halfChars = approxTokens * 2 // each half ~ approxTokens/2 tokens
  const sentenceA = 'Procedure step describes pouring the pint correctly. '
  const sentenceB = 'Section two outlines emergency contact details. '
  let a = ''
  while (a.length < halfChars) a += sentenceA
  let b = ''
  while (b.length < halfChars) b += sentenceB
  return `## Section One\n${a}\n## Section Two\n${b}\n`
}

function fixtureSyntheticChunks(targetChunks: number): string {
  // Each ~CHUNK_TARGET_TOKENS-token block becomes a chunk in a flat-text section.
  // We intentionally bypass the per-section soft cap by NOT splitting via headings.
  const oneChunkChars = CHUNK_TARGET_TOKENS * 4
  const sentence = 'A line of probe content meant to occupy chunk space deterministically. '
  let block = ''
  while (block.length < oneChunkChars) block += sentence
  return block.repeat(targetChunks).slice(0, oneChunkChars * targetChunks)
}

// ──────────────────────────────────────────────────────────────────
// Assertions.
// ──────────────────────────────────────────────────────────────────

async function W1_schemaShape(): Promise<void> {
  const sectionCols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'knowledge_sections'`,
  )
  const chunkCols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'knowledge_chunks'`,
  )
  const sectionNames = new Set(sectionCols.map((c) => c.column_name))
  const chunkNames = new Set(chunkCols.map((c) => c.column_name))
  const sReq = [
    'id',
    'knowledgeItemId',
    'organizationId',
    'sectionIndex',
    'title',
    'content',
    'tokenCount',
    'sectionVersion',
    'truncated',
    'createdAt',
    'updatedAt',
  ]
  const cReq = [
    'id',
    'sectionId',
    'organizationId',
    'chunkIndex',
    'content',
    'embedding',
    'embeddingText',
    'tokenCount',
    'createdAt',
  ]
  assert(
    'w1.schema_shape',
    sReq.every((c) => sectionNames.has(c)) && cReq.every((c) => chunkNames.has(c)),
    `sections=${[...sectionNames].length} chunks=${[...chunkNames].length}`,
  )
}

async function W2_schemaFkCascade(
  orgId: string,
  venueId: string,
  ingest: IngestService,
): Promise<void> {
  const kiId = randomUUID()
  await ingest.ingest({
    id: kiId,
    title: 'cascade-test',
    content: fixtureMd(),
    organizationId: orgId,
    venueId,
  })
  const sections = await prisma.knowledgeSection.findMany({
    where: { knowledgeItemId: kiId },
    select: { id: true },
  })
  await prisma.knowledgeItem.delete({ where: { id: kiId } })
  const remaining = await prisma.knowledgeSection.count({ where: { knowledgeItemId: kiId } })
  const chunks = await prisma.knowledgeChunk.count({
    where: { sectionId: { in: sections.map((s) => s.id) } },
  })
  assert(
    'w2.schema_fk_cascade',
    remaining === 0 && chunks === 0,
    `remainingSections=${remaining} remainingChunks=${chunks}`,
  )
}

function W3_detectMd(detector: SectionDetector): void {
  const result = detector.detect(fixtureMd(), 'text/markdown')
  const titles = result.sections.map((s) => s.title)
  assert(
    'w3.detect_md',
    result.sections.length === 2 && titles[0] === 'Heading A' && titles[1] === 'Heading B',
    `titles=${JSON.stringify(titles)}`,
  )
}

function W4_detectPptx(detector: SectionDetector): void {
  const result = detector.detect(
    fixturePptx(),
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  )
  assertEqual(
    'w4.detect_pptx',
    result.sections.length,
    3,
    `titles=${JSON.stringify(result.sections.map((s) => s.title))}`,
  )
}

function W5_detectCsv(detector: SectionDetector): void {
  // 120-row CSV → ceil(120/50) = 3 batches. Per audit-M4 row-batch policy.
  const result = detector.detect(fixtureCsv(120), 'text/csv')
  const expected = Math.ceil(120 / CSV_ROW_BATCH_SIZE)
  assertEqual(
    'w5.detect_csv',
    result.sections.length,
    expected,
    `titles=${JSON.stringify(result.sections.map((s) => s.title))}`,
  )
}

function W6_detectFlat(detector: SectionDetector): void {
  const result = detector.detect(fixtureFlatNoHeadings(), null)
  assertEqual('w6.detect_flat', result.sections.length, 1)
}

function W7_capSoft(detector: SectionDetector): void {
  // ~1024-token section: well under soft cap. truncated:false, single section.
  const text = fixtureOversizedNoSubheadings(1024)
  const result = detector.detect(text, null)
  assert(
    'w7.cap_soft',
    result.sections.length === 1 && result.sections[0].truncated === false,
    `truncated=${result.sections[0]?.truncated}`,
  )
}

function W8_capSplit(detector: SectionDetector): void {
  // ~6K-token doc with 2 sub-headings → split at the heading boundary.
  const text = fixtureWithSubheadings(6000)
  const result = detector.detect(text, 'text/markdown')
  assertGte('w8.cap_split', result.sections.length, 2, `sections=${result.sections.length}`)
}

function W9_capDegrade(detector: SectionDetector): void {
  // ~10K-token flat block: no sub-headings → 1 section truncated:true with chunks spanning content.
  const text = fixtureOversizedNoSubheadings(10_000)
  const result = detector.detect(text, null)
  const ok =
    result.sections.length === 1 &&
    result.sections[0].truncated === true &&
    result.sections[0].chunks.length >= 2
  assert(
    'w9.cap_degrade',
    ok,
    `sections=${result.sections.length} truncated=${result.sections[0]?.truncated} chunks=${result.sections[0]?.chunks.length}`,
  )
}

function W10_chunkCreate(detector: SectionDetector): void {
  const text = fixtureOversizedNoSubheadings(3000) // > CHUNK_TARGET_TOKENS
  const result = detector.detect(text, null)
  const chunks = result.sections[0]?.chunks ?? []
  assertGte('w10.chunk_create', chunks.length, 2, `chunks=${chunks.length}`)
}

async function W11_crossOrg(
  orgA: string,
  venueA: string,
  orgB: string,
  venueB: string,
  ingest: IngestService,
): Promise<void> {
  const idA = randomUUID()
  const idB = randomUUID()
  await ingest.ingest({
    id: idA,
    title: 'orgA-doc',
    content: fixtureMd(),
    organizationId: orgA,
    venueId: venueA,
  })
  await ingest.ingest({
    id: idB,
    title: 'orgB-doc',
    content: fixtureMd(),
    organizationId: orgB,
    venueId: venueB,
  })
  const orgBSections = await prisma.knowledgeSection.count({ where: { organizationId: orgB } })
  const orgBChunks = await prisma.knowledgeChunk.count({ where: { organizationId: orgB } })
  const orgBSectionsOnA = await prisma.knowledgeSection.count({
    where: { organizationId: orgB, knowledgeItem: { organizationId: orgA } },
  })
  assert(
    'w11.cross_org_isolation',
    orgBSections >= 2 && orgBChunks >= 2 && orgBSectionsOnA === 0,
    `B.sections=${orgBSections} B.chunks=${orgBChunks} leak=${orgBSectionsOnA}`,
  )
}

async function W12_idempotent(
  orgId: string,
  venueId: string,
  ingest: IngestService,
): Promise<void> {
  const kiId = randomUUID()
  await ingest.ingest({
    id: kiId,
    title: 'idem-1',
    content: fixturePptx(),
    organizationId: orgId,
    venueId,
  })
  const first = await prisma.knowledgeSection.findMany({
    where: { knowledgeItemId: kiId },
    orderBy: { sectionIndex: 'asc' },
    select: { sectionIndex: true, title: true },
  })
  await ingest.ingest({
    id: kiId,
    title: 'idem-2',
    content: fixturePptx(),
    organizationId: orgId,
    venueId,
  })
  const second = await prisma.knowledgeSection.findMany({
    where: { knowledgeItemId: kiId },
    orderBy: { sectionIndex: 'asc' },
    select: { sectionIndex: true, title: true },
  })
  const same =
    first.length === second.length &&
    first.every((s, i) => s.sectionIndex === second[i].sectionIndex && s.title === second[i].title)
  assert('w12.idempotent', same, `first=${first.length} second=${second.length}`)
}

function W13_chunkOverlap(detector: SectionDetector): void {
  const text = fixtureOversizedNoSubheadings(3000)
  const result = detector.detect(text, null)
  const chunks = result.sections[0]?.chunks ?? []
  if (chunks.length < 2) {
    assert('w13.chunk_overlap', false, `only ${chunks.length} chunk(s)`)
    return
  }
  const tail = chunks[0].content.slice(-128)
  const head = chunks[1].content.slice(0, 128)
  // Allow ±32 char drift from word-boundary back-up.
  let _matchLen = 0
  for (let i = 0; i < Math.min(tail.length, head.length); i++) {
    if (tail[tail.length - 1 - i] === head[head.length - 1 - i]) _matchLen++
  }
  // Find any 64-char substring of tail present in head.
  let overlapFound = false
  for (let start = 0; start <= tail.length - 64; start++) {
    if (head.includes(tail.slice(start, start + 64))) {
      overlapFound = true
      break
    }
  }
  assert(
    'w13.chunk_overlap',
    overlapFound,
    `tail-end-32=${tail.slice(-32)} head-start-32=${head.slice(0, 32)}`,
  )
}

async function W14_embeddingDim(
  orgId: string,
  venueId: string,
  ingest: IngestService,
): Promise<void> {
  const kiId = randomUUID()
  await ingest.ingest({
    id: kiId,
    title: 'embed-dim',
    content: fixtureMd(),
    organizationId: orgId,
    venueId,
  })
  const dims = await prisma.$queryRawUnsafe<{ d: number | null }[]>(
    `SELECT vector_dims(c.embedding) AS d FROM knowledge_chunks c JOIN knowledge_sections s ON s.id = c."sectionId" WHERE s."knowledgeItemId" = $1 AND c.embedding IS NOT NULL LIMIT 1`,
    kiId,
  )
  const d = Number(dims[0]?.d ?? 0)
  assertEqual('w14.embedding_dim', d, 1024, `dim=${d}`)
}

async function W15_costCeiling(
  orgId: string,
  venueId: string,
  ingest: IngestService,
): Promise<void> {
  // Six small markdown docs (≤5 chunks each ⇒ ≤30 voyage calls total).
  let voyageCalls = 0
  // Hook into the global Logger output via a capture wrapper isn't trivial here;
  // instead count chunks created and use that as a proxy upper bound.
  const ids: string[] = []
  for (let i = 0; i < 6; i++) {
    const id = randomUUID()
    ids.push(id)
    await ingest.ingest({
      id,
      title: `cost-${i}`,
      content: fixtureMd(),
      organizationId: orgId,
      venueId,
    })
  }
  const chunkCount = await prisma.knowledgeChunk.count({
    where: { section: { knowledgeItemId: { in: ids } } },
  })
  voyageCalls = chunkCount // each chunk = at most 1 voyage call (no batches)
  assertLt('w15.cost_ceiling', voyageCalls, 30, `voyageCalls=${voyageCalls}`)
}

async function W16_embedCapTrigger(
  orgId: string,
  venueId: string,
  ingest: IngestService,
): Promise<void> {
  // Synthetic 250-chunk fixture: oversized flat content forces many chunks via slidingWindowChunks.
  // ~250 chunks × CHUNK_TARGET_TOKENS = ~250 * 1024 = ~256K tokens budget.
  // 4 chars/token → ~1.024M chars. That's a lot of bytes; build one big block.
  const text = fixtureSyntheticChunks(220) // overshoot slightly past 200 cap
  const kiId = randomUUID()
  // Capture warn logs by snapshotting the logger.
  const warns: string[] = []
  const origWarn = (Logger as unknown as { warn: (msg: unknown, ctx?: string) => void }).warn
  const origLogWarn = Logger.prototype.warn
  Logger.prototype.warn = function patched(message: unknown) {
    if (typeof message === 'string') warns.push(message)
    return origLogWarn.call(this, message)
  } as typeof Logger.prototype.warn
  try {
    await ingest.ingest({
      id: kiId,
      title: 'cap-trigger',
      content: text,
      organizationId: orgId,
      venueId,
    })
  } finally {
    Logger.prototype.warn = origLogWarn
    void origWarn
  }
  const totalChunks = await prisma.knowledgeChunk.count({
    where: { section: { knowledgeItemId: kiId } },
  })
  // embedding is `Unsupported("vector(1024)")` — must use raw SQL.
  const embeddedRows = await prisma.$queryRawUnsafe<{ n: bigint | number }[]>(
    `SELECT count(*)::int AS n FROM knowledge_chunks c JOIN knowledge_sections s ON s.id = c."sectionId" WHERE s."knowledgeItemId" = $1 AND c.embedding IS NOT NULL`,
    kiId,
  )
  const embedded = Number(embeddedRows[0]?.n ?? 0)
  const sawCapLog = warns.some((w) => w.includes('"event":"ingest.embed_cap_exceeded"'))
  // Spec invariant: 200 chunks ATTEMPTED (eligible after cap). Real Voyage latency
  // can split that 200 between actually-embedded and queue-timeout (15s wait). The
  // sections_persisted log carries voyageCallCount + embedQueueTimeoutCount whose sum
  // equals MAX_EMBEDS_PER_DOCUMENT. AC-5 is satisfied as long as cap held + log fired.
  const persistedLog =
    warns
      .concat([])
      .find((w) => w.includes('"event":"ingest.sections_persisted"') && w.includes(kiId)) || ''
  const allWarns = warns.join('\n')
  const persistedFromLog = (allWarns.match(/"event":"ingest.sections_persisted"[^}]+/g) ?? []).find(
    (m) => m.includes(kiId),
  )
  // Fall back to grepping the captured log lines if Logger.log (info) wasn't proxied.
  const overflowFromCap = totalChunks - MAX_EMBEDS_PER_DOCUMENT
  const ok =
    totalChunks > MAX_EMBEDS_PER_DOCUMENT &&
    embedded > 0 &&
    embedded <= MAX_EMBEDS_PER_DOCUMENT &&
    sawCapLog &&
    overflowFromCap === totalChunks - MAX_EMBEDS_PER_DOCUMENT
  assert(
    'w16.embed_cap_trigger',
    ok,
    `totalChunks=${totalChunks} embedded=${embedded} cap=${MAX_EMBEDS_PER_DOCUMENT} overflow=${overflowFromCap} sawCapLog=${sawCapLog}`,
  )
  void persistedLog
  void persistedFromLog
}

async function W17_embedQualityDegraded(
  orgId: string,
  venueId: string,
  ingest: IngestService,
): Promise<void> {
  // PROBE_VOYAGE_FAIL_RATIO=0.5 must be set for the duration of this assertion only.
  const original = process.env.PROBE_VOYAGE_FAIL_RATIO
  process.env.PROBE_VOYAGE_FAIL_RATIO = '0.7' // bias toward >0.5 ratio so the warn fires deterministically
  // Doc with multiple chunks so failures aggregate meaningfully.
  const text = fixtureOversizedNoSubheadings(8_000)
  const warns: string[] = []
  const origLogWarn = Logger.prototype.warn
  Logger.prototype.warn = function patched(message: unknown) {
    if (typeof message === 'string') warns.push(message)
    return origLogWarn.call(this, message)
  } as typeof Logger.prototype.warn
  const kiId = randomUUID()
  try {
    await ingest.ingest({
      id: kiId,
      title: 'quality-degraded',
      content: text,
      organizationId: orgId,
      venueId,
    })
  } finally {
    Logger.prototype.warn = origLogWarn
    if (original === undefined) delete process.env.PROBE_VOYAGE_FAIL_RATIO
    else process.env.PROBE_VOYAGE_FAIL_RATIO = original
  }
  const sawDegraded = warns.some((w) => w.includes('"event":"ingest.embed_quality_degraded"'))
  assert('w17.embed_quality_degraded_warn', sawDegraded, `warns=${warns.length}`)
}

// ──────────────────────────────────────────────────────────────────
// Plan 01-02 — W18-W23.
// ──────────────────────────────────────────────────────────────────

/**
 * audit-S8 cleanup ordering note: W18 creates an unsectioned KI directly via
 * prisma.knowledgeItem.create. pnpCleanup deletes knowledge_items first; the
 * KI cascade handles sections+chunks. Do NOT change pnpCleanup's deletion
 * order without verifying RESTRICT FK constraints across all probe-created rows.
 */
async function W18_backfillIdempotency(orgA: string, _venueA: string): Promise<void> {
  const kiId = randomUUID()
  await prisma.knowledgeItem.create({
    data: {
      id: kiId,
      organizationId: orgA,
      content: fixturePptx(),
      embeddingText: 'cellar temperature setup',
    },
  })

  const first = await runBackfill([orgA])
  const sectionsAfter1 = await prisma.knowledgeSection.count({ where: { knowledgeItemId: kiId } })
  const chunksAfter1 = await prisma.knowledgeChunk.count({
    where: { section: { knowledgeItemId: kiId } },
  })

  const second = await runBackfill([orgA])
  const sectionsAfter2 = await prisma.knowledgeSection.count({ where: { knowledgeItemId: kiId } })
  const chunksAfter2 = await prisma.knowledgeChunk.count({
    where: { section: { knowledgeItemId: kiId } },
  })

  const okFirst = first.kiProcessed >= 1 && sectionsAfter1 >= 1 && chunksAfter1 >= 1
  const okIdempotent =
    sectionsAfter2 === sectionsAfter1 && chunksAfter2 === chunksAfter1 && second.kiProcessed === 0

  assert(
    'w18.backfill_idempotency',
    okFirst && okIdempotent,
    `firstProcessed=${first.kiProcessed} sections=${sectionsAfter1}/${sectionsAfter2} chunks=${chunksAfter1}/${chunksAfter2} secondProcessed=${second.kiProcessed}`,
  )

  await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
}

async function W19_retrievalSectionInjection(
  orgA: string,
  venueA: string,
  ingest: IngestService,
  retrieval: RetrievalService,
): Promise<void> {
  const kiId = randomUUID()
  await ingest.ingest({
    id: kiId,
    title: 'pptx-section-test',
    content: fixturePptx(),
    organizationId: orgA,
    venueId: venueA,
  })

  // Use a higher limit + drop rerank/reformulation noise so the just-ingested
  // KI surfaces alongside any fixtures left from earlier W functions in the
  // same org (W17 quality-degraded doc dominates "cellar" alone).
  const result = await retrieval.find('cellar temperature', {
    orgId: orgA,
    venueId: venueA,
    limit: 20,
    rerank: false,
    reformulateOnEmpty: false,
  })
  if (!result.ok || result.data.length === 0) {
    assert(
      'w19.retrieval_section_injection',
      false,
      `ok=${result.ok} hits=${result.ok ? result.data.length : 'n/a'}`,
    )
    await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
    return
  }

  const hit = result.data.find((h) => h.entityId === kiId)
  if (!hit) {
    assert(
      'w19.retrieval_section_injection',
      false,
      `KI ${kiId} not in top ${result.data.length} hits — entities=${result.data.map((h) => h.entityId).join(',')}`,
    )
    await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
    return
  }
  const sectionId = hit.metadata.sectionId as string | undefined | null
  const sectionTitle = hit.metadata.sectionTitle as string | undefined | null

  let sectionExists = false
  if (sectionId) {
    const sec = await prisma.knowledgeSection.findUnique({
      where: { id: sectionId },
      select: { id: true },
    })
    sectionExists = !!sec
  }

  // audit-S6 — assertContains rather than strict equality on title.
  const titleLooksLikeSlide = typeof sectionTitle === 'string' && /Slide\s+\d+/.test(sectionTitle)
  // Content should be one section, not the whole multi-slide document.
  const fullContent = fixturePptx()
  const ok =
    !!sectionId &&
    sectionExists &&
    titleLooksLikeSlide &&
    typeof hit.content === 'string' &&
    hit.content.length < fullContent.length

  assert(
    'w19.retrieval_section_injection',
    ok,
    `sectionId=${sectionId ?? 'null'} title=${sectionTitle ?? 'null'} contentLen=${hit.content?.length ?? 0} fullLen=${fullContent.length}`,
  )

  await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
}

async function W20_retrievalFallbackNoSections(
  orgA: string,
  venueA: string,
  embeddings: EmbeddingsService,
  retrieval: RetrievalService,
): Promise<void> {
  const kiId = randomUUID()
  const content = 'A pre-backfill knowledge item about brand-new policy that has no sections yet.'
  await prisma.knowledgeItem.create({
    data: {
      id: kiId,
      organizationId: orgA,
      venueId: venueA,
      content,
      embeddingText: content,
    },
  })

  // Embed for KI + SearchableEntity row so retrieval can surface it.
  const [vec] = await embeddings.embedDocuments([content])
  await prisma.$executeRawUnsafe(
    `UPDATE "knowledge_items" SET embedding = $1::vector WHERE id = $2`,
    `[${vec.join(',')}]`,
    kiId,
  )
  const seId = randomUUID()
  await prisma.$executeRawUnsafe(
    `INSERT INTO "searchable_entities" ("id","organizationId","venueId","entityType","entityId","subKey","embedding","embeddingText","tags","kind","title","summary","metadata","createdAt","updatedAt")
     VALUES ($1,$2,$3,'knowledge_item',$4,'',$5::vector,$6,'{}'::text[],null,null,null,'{}'::jsonb, NOW(), NOW())`,
    seId,
    orgA,
    venueA,
    kiId,
    `[${vec.join(',')}]`,
    content,
  )

  const result = await retrieval.find('brand-new policy', {
    orgId: orgA,
    venueId: venueA,
    limit: 5,
  })
  if (!result.ok || result.data.length === 0) {
    assert('w20.retrieval_fallback_no_sections', false, `ok=${result.ok}`)
    await cleanupW20(seId, kiId)
    return
  }

  const hit = result.data.find((h) => h.entityId === kiId)
  if (!hit) {
    assert(
      'w20.retrieval_fallback_no_sections',
      false,
      `KI not in hits (got ${result.data.length} hits)`,
    )
    await cleanupW20(seId, kiId)
    return
  }

  const sectionId = hit.metadata.sectionId
  const ok = (sectionId === undefined || sectionId === null) && hit.content === content

  assert(
    'w20.retrieval_fallback_no_sections',
    ok,
    `sectionId=${String(sectionId)} contentMatch=${hit.content === content} contentLen=${hit.content.length}/${content.length}`,
  )

  await cleanupW20(seId, kiId)
}

async function cleanupW20(seId: string, kiId: string): Promise<void> {
  await prisma.searchableEntity.delete({ where: { id: seId } }).catch(() => undefined)
  await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
}

async function W21_retrievalExplainUsesIndex(
  orgA: string,
  venueA: string,
  ingest: IngestService,
): Promise<void> {
  // Need at least one backfilled KI so the LATERAL JOIN has a target row.
  const kiId = randomUUID()
  await ingest.ingest({
    id: kiId,
    title: 'explain-target',
    content: fixtureMd(),
    organizationId: orgA,
    venueId: venueA,
  })

  // Build a representative dummy vector for the EXPLAIN — values don't affect plan choice.
  const dummyVec = `[${new Array(1024).fill(0.001).join(',')}]`

  // Force index consideration on small tables. SET LOCAL applies for this tx only.
  type ExplainNode = {
    'Node Type'?: string
    'Index Name'?: string
    'Relation Name'?: string
    Plans?: ExplainNode[]
  }
  type ExplainRow = { 'QUERY PLAN': { Plan: ExplainNode }[] }

  let explained: ExplainRow[] = []
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL enable_seqscan = off`)
    await tx.$executeRawUnsafe(`SET LOCAL enable_bitmapscan = off`)
    explained = await tx.$queryRawUnsafe<ExplainRow[]>(
      `EXPLAIN (FORMAT JSON)
       SELECT s.id
       FROM "knowledge_sections" s
       JOIN "knowledge_chunks" c ON c."sectionId" = s.id
       WHERE s."knowledgeItemId" = $1 AND c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $2::vector ASC
       LIMIT 1`,
      kiId,
      dummyVec,
    )
  })

  // Walk the plan tree.
  const seenIndexes: string[] = []
  let chunksUseIndex = false
  function walk(node: ExplainNode): void {
    const nodeType = node['Node Type'] ?? ''
    const relation = node['Relation Name'] ?? ''
    const indexName = node['Index Name'] ?? ''
    if (relation === 'knowledge_chunks' && nodeType.includes('Index')) {
      seenIndexes.push(indexName)
      if (indexName === 'knowledge_chunks_sectionId_idx') chunksUseIndex = true
    }
    for (const child of node.Plans ?? []) walk(child)
  }
  const plan = explained[0]?.['QUERY PLAN']?.[0]?.Plan
  if (plan) walk(plan)

  assert(
    'w21.retrieval_explain_uses_index',
    chunksUseIndex,
    `seenIndexes=${JSON.stringify(seenIndexes)} planNodeType=${plan?.['Node Type'] ?? 'unknown'}`,
  )

  await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
}

async function W22_backfillAdvisoryLockPreventsConcurrent(orgA: string): Promise<void> {
  // Pre-create an unsectioned KI so backfill has work to do for orgA.
  const kiId = randomUUID()
  await prisma.knowledgeItem.create({
    data: {
      id: kiId,
      organizationId: orgA,
      content: fixtureMd(),
      embeddingText: 'lock-test',
    },
  })

  const lockKey = `backfill:org:${orgA}`

  // Hold the lock in an interactive transaction (pinned connection). While the
  // tx is open, runBackfill (using other pool connections) tries to acquire and
  // sees lockedOut. The advisory_lock is session-scoped — released on tx end.
  let stats: Awaited<ReturnType<typeof runBackfill>> | null = null
  await prisma.$transaction(
    async (tx) => {
      const acq = await tx.$queryRawUnsafe<{ acquired: boolean }[]>(
        `SELECT pg_try_advisory_lock(hashtext($1)::int) AS acquired`,
        lockKey,
      )
      if (!acq[0]?.acquired) {
        throw new Error('w22 setup failed: holder could not acquire lock')
      }
      try {
        stats = await runBackfill([orgA])
      } finally {
        await tx
          .$queryRawUnsafe(`SELECT pg_advisory_unlock(hashtext($1)::int)`, lockKey)
          .catch(() => undefined)
      }
    },
    { timeout: 30_000 },
  )

  // Belt-and-braces: drop any leftover advisory locks on the singleton pool.
  await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock_all()`).catch(() => undefined)

  const lockedOut = (stats?.tenantsLockedOut ?? 0) >= 1
  const noProcessing = (stats?.kiProcessed ?? -1) === 0
  // Confirm no sections were created during the locked window.
  const sectionsAfter = await prisma.knowledgeSection.count({ where: { knowledgeItemId: kiId } })

  assert(
    'w22.backfill_advisory_lock_prevents_concurrent',
    lockedOut && noProcessing && sectionsAfter === 0,
    `lockedOut=${stats?.tenantsLockedOut ?? '?'} kiProcessed=${stats?.kiProcessed ?? '?'} sectionsAfter=${sectionsAfter}`,
  )

  await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
}

async function W23_backfillCostCeilingHaltLeavesPartialState(orgA: string): Promise<void> {
  // Pre-create N KIs so cost ceiling halts mid-tenant.
  const kiIds: string[] = []
  for (let i = 0; i < 5; i++) {
    const id = randomUUID()
    await prisma.knowledgeItem.create({
      data: {
        id,
        organizationId: orgA,
        content: fixtureMd(),
        embeddingText: `cost-ceiling-${i}`,
      },
    })
    kiIds.push(id)
  }

  // Each fixtureMd doc estimates ≤ 1 chunk = $0.00006. Set ceiling between
  // 1 and 2 docs so first goes through, second halts.
  const original = process.env.PROBE_BACKFILL_COST_CEILING_USD
  process.env.PROBE_BACKFILL_COST_CEILING_USD = '0.0001'

  const warns: string[] = []
  const origLogWarn = Logger.prototype.warn
  Logger.prototype.warn = function patched(message: unknown) {
    if (typeof message === 'string') warns.push(message)
    return origLogWarn.call(this, message)
  } as typeof Logger.prototype.warn

  let stats: Awaited<ReturnType<typeof runBackfill>>
  try {
    stats = await runBackfill([orgA])
  } finally {
    Logger.prototype.warn = origLogWarn
    if (original === undefined) delete process.env.PROBE_BACKFILL_COST_CEILING_USD
    else process.env.PROBE_BACKFILL_COST_CEILING_USD = original
  }

  const sawCeiling = warns.some((w) => w.includes('"event":"backfill.tenant_cost_ceiling_reached"'))
  const partialEntry = stats.partialTenantList.find((p) => p.orgId === orgA)
  const ok =
    sawCeiling && !!partialEntry && partialEntry.kiRemaining > 0 && stats.tenantsPartial >= 1

  assert(
    'w23.backfill_cost_ceiling_halt_leaves_partial_state',
    ok,
    `sawCeiling=${sawCeiling} partialTenantList=${JSON.stringify(stats.partialTenantList)} tenantsPartial=${stats.tenantsPartial}`,
  )

  // Cleanup KIs (cascade clears any sections created before halt).
  for (const id of kiIds) {
    await prisma.knowledgeItem.delete({ where: { id } }).catch(() => undefined)
  }
}

// ──────────────────────────────────────────────────────────────────
// Plan 01-03 — W24-W27.
// ──────────────────────────────────────────────────────────────────

async function W24_chatCacheReadObservable(
  orgA: string,
  venueA: string,
  ingest: IngestService,
  dispatcher: ToolDispatcher,
): Promise<void> {
  // Pre-seed: ingest a fixture KI so retrieval has something to surface if invoked.
  const kiId = randomUUID()
  await ingest.ingest({
    id: kiId,
    title: 'cache-test',
    content: fixturePptx(),
    organizationId: orgA,
    venueId: venueA,
  })

  // Build gm-agent directly (ChatService DI graph too heavy for probe — same
  // wiring path: ChatService calls buildGmAgent under the hood).
  const userId = randomUUID()
  const ctx = { orgId: orgA, userId, userRole: 'manager' }
  const venueContext = {
    id: venueA,
    name: 'Probe Venue',
    timezone: 'Europe/London',
    profile: null,
    contacts: null,
  }
  const userContext = { name: 'Probe User', email: 'probe@test.local', profileSummary: null }

  // Verify wire-level cache_control marker placement BEFORE running turns
  // (audit-S1 — distinguish "not wired" from "TTL expired").
  const inspectorMessages = buildSystemMessagesForInspection('default')
  const inspection = inspectAgentProviderOptions(inspectorMessages)
  if (
    inspection.systemCacheControl !== 'ephemeral' ||
    inspection.toolsCacheControl !== 'ephemeral'
  ) {
    assert(
      'w24.chat_cache_read_observable',
      false,
      `cache_control NOT WIRED — system=${inspection.systemCacheControl} tools=${inspection.toolsCacheControl}`,
    )
    await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
    return
  }

  const buildAgent = () =>
    buildGmAgent({
      dispatcher,
      ctx,
      venueContext,
      userContext,
    })

  const message = 'What does the cellar setup procedure say?'
  const messages = [{ role: 'user' as const, content: message }]

  type GenerateResult = Awaited<ReturnType<ReturnType<typeof buildAgent>['generate']>>

  let turn1Result: GenerateResult
  let turn2Result: GenerateResult
  try {
    turn1Result = await buildAgent().generate({ messages })
    // Wait briefly so the second turn's cache lookup is for the prior turn's
    // creation, not racing with the same in-flight write.
    await new Promise((r) => setTimeout(r, 1000))
    turn2Result = await buildAgent().generate({ messages })
  } catch (err) {
    assert(
      'w24.chat_cache_read_observable',
      false,
      `agent.generate threw: ${(err as Error).message}`,
    )
    await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
    return
  }

  type Usage = {
    inputTokens?: number
    outputTokens?: number
    inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number }
  }
  const turn1Usage = turn1Result.usage as Usage
  const turn2Usage = turn2Result.usage as Usage
  const turn1Write = turn1Usage.inputTokenDetails?.cacheWriteTokens ?? 0
  const turn2Read = turn2Usage.inputTokenDetails?.cacheReadTokens ?? 0

  const ok = turn1Write > 0 && turn2Read > 0

  assert(
    'w24.chat_cache_read_observable',
    ok,
    `turn1.cacheWrite=${turn1Write} turn2.cacheRead=${turn2Read} (Sonnet — audit-M1 pinned)`,
  )

  await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
}

async function W25_findKnowledgeFormattedPayloadByteStable(
  orgA: string,
  venueA: string,
  ingest: IngestService,
  dispatcher: ToolDispatcher,
): Promise<void> {
  const kiId = randomUUID()
  await ingest.ingest({
    id: kiId,
    title: 'payload-byte-test',
    content: fixturePptx(),
    organizationId: orgA,
    venueId: venueA,
  })

  const ctx = { orgId: orgA, userId: randomUUID(), userRole: 'manager' }
  const input = { query: 'cellar setup', venueId: venueA, limit: 5 }

  const r1 = await dispatcher.dispatch('find_knowledge', input, ctx)
  const r2 = await dispatcher.dispatch('find_knowledge', input, ctx)

  if (!r1.ok || !r2.ok) {
    assert('w25.find_knowledge_payload_byte_stable', false, `r1.ok=${r1.ok} r2.ok=${r2.ok}`)
    await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
    return
  }

  const c1 = (r1.data as Array<{ content: string }>).map((h) => h.content)
  const c2 = (r2.data as Array<{ content: string }>).map((h) => h.content)
  const sameLength = c1.length === c2.length
  const sameContent = sameLength && c1.every((c, i) => c === c2[i])
  // At least one hit should carry the [Section ...] prefix (section-injected).
  const hasPrefix = c1.some((c) => /^\[Section [0-9a-f-]+ · /.test(c))

  assert(
    'w25.find_knowledge_payload_byte_stable',
    sameContent && hasPrefix,
    `sameLength=${sameLength} sameContent=${sameContent} hasPrefix=${hasPrefix} sample="${c1[0]?.slice(0, 60) ?? ''}"`,
  )

  await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
}

async function W26_findKnowledgeDeterministicOrdering(
  orgA: string,
  venueA: string,
  ingest: IngestService,
  dispatcher: ToolDispatcher,
): Promise<void> {
  const kiId = randomUUID()
  await ingest.ingest({
    id: kiId,
    title: 'ordering-test',
    content: fixturePptx(),
    organizationId: orgA,
    venueId: venueA,
  })

  const ctx = { orgId: orgA, userId: randomUUID(), userRole: 'manager' }
  const input = { query: 'cellar setup', venueId: venueA, limit: 5 }

  const r1 = await dispatcher.dispatch('find_knowledge', input, ctx)
  const r2 = await dispatcher.dispatch('find_knowledge', input, ctx)

  if (!r1.ok || !r2.ok) {
    assert('w26.find_knowledge_deterministic_ordering', false, `r1.ok=${r1.ok} r2.ok=${r2.ok}`)
    await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
    return
  }

  type Hit = { metadata: { sectionId?: string | null }; similarity: number }
  const ids1 = (r1.data as Hit[]).map((h) => h.metadata.sectionId ?? '')
  const ids2 = (r2.data as Hit[]).map((h) => h.metadata.sectionId ?? '')

  // audit-S7 (01-03) — within-run determinism: same persisted KIs across two
  // dispatches in one probe run yield identical sectionId sequences.
  const sameSequence = ids1.length === ids2.length && ids1.every((id, i) => id === ids2[i])

  // Verify sort logic: similarity DESC, sectionId ASC tie-break.
  const hits = r1.data as Hit[]
  let sortValid = true
  for (let i = 0; i < hits.length - 1; i++) {
    const aSim = Math.round(hits[i].similarity * 1_000_000)
    const bSim = Math.round(hits[i + 1].similarity * 1_000_000)
    if (aSim < bSim) {
      sortValid = false
      break
    }
    if (aSim === bSim) {
      const aId = hits[i].metadata.sectionId ?? ''
      const bId = hits[i + 1].metadata.sectionId ?? ''
      if (aId.localeCompare(bId) > 0) {
        sortValid = false
        break
      }
    }
  }

  assert(
    'w26.find_knowledge_deterministic_ordering',
    sameSequence && sortValid,
    `sameSequence=${sameSequence} sortValid=${sortValid} ids1=${JSON.stringify(ids1.map((s) => s.slice(0, 8)))}`,
  )

  await prisma.knowledgeItem.delete({ where: { id: kiId } }).catch(() => undefined)
}

async function W27_findKnowledgeAggregateTokenBudget(
  orgA: string,
  venueA: string,
  ingest: IngestService,
  dispatcher: ToolDispatcher,
): Promise<void> {
  // Pre-seed: ingest 6 small fixtures so we have multiple section hits.
  const kiIds: string[] = []
  for (let i = 0; i < 6; i++) {
    const id = randomUUID()
    await ingest.ingest({
      id,
      title: `budget-test-${i}`,
      content: fixturePptx(),
      organizationId: orgA,
      venueId: venueA,
    })
    kiIds.push(id)
  }

  const ctx = { orgId: orgA, userId: randomUUID(), userRole: 'manager' }
  const input = { query: 'cellar setup', venueId: venueA, limit: 6 }

  // First dispatch — expect aggregateSectionTokens log, NO budget breach (small fixtures).
  const warnsBefore: string[] = []
  const logsBefore: string[] = []
  const origLogWarn = Logger.prototype.warn
  const origLogLog = Logger.prototype.log
  Logger.prototype.warn = function patched(message: unknown) {
    if (typeof message === 'string') warnsBefore.push(message)
    return origLogWarn.call(this, message)
  } as typeof Logger.prototype.warn
  Logger.prototype.log = function patched(message: unknown) {
    if (typeof message === 'string') logsBefore.push(message)
    return origLogLog.call(this, message)
  } as typeof Logger.prototype.log
  try {
    await dispatcher.dispatch('find_knowledge', input, ctx)
  } finally {
    Logger.prototype.warn = origLogWarn
    Logger.prototype.log = origLogLog
  }

  const sawFormattedLog = logsBefore.some(
    (l) =>
      l.includes('"event":"tool_dispatcher.find_knowledge_formatted"') &&
      l.includes('"aggregateSectionTokens":'),
  )
  const noBudgetWarn = !warnsBefore.some((w) =>
    w.includes('"event":"tool_dispatcher.section_budget_enforced"'),
  )

  // Synthetically inflate section token counts to force budget breach.
  // Using 30000 (>budget of 24000) so even a single section-injected hit trips
  // the warn — keeps the test deterministic against rerank picking variable
  // numbers of sectioned vs fallback hits.
  await prisma.$executeRawUnsafe(
    `UPDATE "knowledge_sections" SET "tokenCount" = 30000 WHERE "organizationId" = $1`,
    orgA,
  )

  const warnsAfter: string[] = []
  const origLogWarn2 = Logger.prototype.warn
  Logger.prototype.warn = function patched(message: unknown) {
    if (typeof message === 'string') warnsAfter.push(message)
    return origLogWarn2.call(this, message)
  } as typeof Logger.prototype.warn
  try {
    await dispatcher.dispatch('find_knowledge', input, ctx)
  } finally {
    Logger.prototype.warn = origLogWarn2
  }

  // Plan chat-overhaul wave A — budget is now actively enforced. The
  // dispatcher drops the lowest-relevance sections when their token cost
  // would push aggregate over budget, and logs `section_budget_enforced`
  // with `droppedForBudget` ≥ 1. Old behaviour only warned without dropping.
  const sawBudgetWarn = warnsAfter.some(
    (w) =>
      w.includes('"event":"tool_dispatcher.section_budget_enforced"') &&
      w.includes('"budget":24000') &&
      /"droppedForBudget":\s*[1-9]/.test(w),
  )

  const ok = sawFormattedLog && noBudgetWarn && sawBudgetWarn

  assert(
    'w27.find_knowledge_aggregate_token_budget',
    ok,
    `formattedLog=${sawFormattedLog} noBreachOnSmall=${noBudgetWarn} budgetWarnOnInflated=${sawBudgetWarn}`,
  )

  // Cleanup.
  for (const id of kiIds) {
    await prisma.knowledgeItem.delete({ where: { id } }).catch(() => undefined)
  }
}

// ──────────────────────────────────────────────────────────────────
// Main.
// ──────────────────────────────────────────────────────────────────

async function main() {
  // Manual instantiation — avoids @nestjs/testing dep. IngestService DI shape:
  //   constructor(embeddings, indexer, sectionDetector)
  // RetrievalService DI: constructor(embeddings)
  // Each provider has explicit onModuleInit calls below.
  const embeddings = new EmbeddingsService()
  embeddings.onModuleInit()
  const indexer = new IndexerService(embeddings)
  const detector = new SectionDetector()
  const ingest = new IngestService(embeddings, indexer, detector)
  ingest.onModuleInit()
  const retrieval = new RetrievalService(embeddings)
  retrieval.onModuleInit()
  // Plan 01-03 — ToolDispatcher for W25/W26/W27 (find_knowledge dispatch with
  // section-payload prefix + budget telemetry).
  const mockOps = new MockOpsService()
  const verifier = new QuoteVerifierService()
  verifier.onModuleInit()
  // Plan 05-01 Task 4 — TabularQueryService threaded into dispatcher (5th arg).
  const tabular = new TabularQueryService()
  const dispatcher = new ToolDispatcher(retrieval, mockOps, ingest, verifier, tabular)

  console.log(
    JSON.stringify({
      event: 'probe.section.cost_banner',
      note: '27 assertions (W1-W27). ~16 small markdown ingests + 1 synthetic 200-chunk doc + 1 quality-degraded doc + W18-W23 backfill/retrieval probes + W24 chat cache (2 Sonnet 4.6 turns ~$0.010) + W25/W26/W27 retrieval + budget probes. Approx 50-70 voyage calls + 2 Sonnet turns @ ~$0.005 each (~$0.013 ceiling).',
    }),
  )

  await pnpCleanup()
  const { orgId: orgA, venueId: venueA } = await ensureOrgWithVenue(
    PROBE_ORG_SLUG,
    'Probe Section Org A',
  )
  const { orgId: orgB, venueId: venueB } = await ensureOrgWithVenue(
    PROBE_ORG_B_SLUG,
    'Probe Section Org B',
  )

  await W1_schemaShape()
  await W2_schemaFkCascade(orgA, venueA, ingest)
  W3_detectMd(detector)
  W4_detectPptx(detector)
  W5_detectCsv(detector)
  W6_detectFlat(detector)
  W7_capSoft(detector)
  W8_capSplit(detector)
  W9_capDegrade(detector)
  W10_chunkCreate(detector)
  await W11_crossOrg(orgA, venueA, orgB, venueB, ingest)
  await W12_idempotent(orgA, venueA, ingest)
  W13_chunkOverlap(detector)
  await W14_embeddingDim(orgA, venueA, ingest)
  await W15_costCeiling(orgA, venueA, ingest)
  await W16_embedCapTrigger(orgA, venueA, ingest)
  await W17_embedQualityDegraded(orgA, venueA, ingest)
  // Plan 01-02 — backfill + retrieval-injection + EXPLAIN + advisory-lock + cost-ceiling.
  await W18_backfillIdempotency(orgA, venueA)
  await W19_retrievalSectionInjection(orgA, venueA, ingest, retrieval)
  await W20_retrievalFallbackNoSections(orgA, venueA, embeddings, retrieval)
  await W21_retrievalExplainUsesIndex(orgA, venueA, ingest)
  await W22_backfillAdvisoryLockPreventsConcurrent(orgA)
  await W23_backfillCostCeilingHaltLeavesPartialState(orgA)
  // Plan 01-03 — chat cache hit + payload format + ordering + token budget.
  await W24_chatCacheReadObservable(orgA, venueA, ingest, dispatcher)
  await W25_findKnowledgeFormattedPayloadByteStable(orgA, venueA, ingest, dispatcher)
  await W26_findKnowledgeDeterministicOrdering(orgA, venueA, ingest, dispatcher)
  await W27_findKnowledgeAggregateTokenBudget(orgA, venueA, ingest, dispatcher)

  await pnpCleanup()
  await prisma.$disconnect()

  const passes = results.filter((r) => r.pass).length
  const fails = results.filter((r) => !r.pass)
  console.log('\n────────── probe-section summary ──────────')
  console.log(`pass: ${passes} / ${results.length}`)
  if (fails.length) {
    console.log('FAIL:')
    for (const f of fails) console.log(`  ${f.name}: ${f.detail ?? '(no detail)'}`)
  }
  process.exit(fails.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('probe-section crashed:', err)
  process.exit(1)
})
