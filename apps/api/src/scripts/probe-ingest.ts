import '../load-env'

import { NestFactory } from '@nestjs/core'
import { IngestModule } from '../modules/ingest/ingest.module'
import { IngestService } from '../modules/ingest/ingest.service'
import { prisma } from '@gm-ai/database'

const PROBE_ID = 'f0000000-0000-4000-8000-000000000001'
const STARTER_KEYS = new Set(['summary', 'tags', 'docType', 'category', 'crossRefs'])

async function runProbe(): Promise<boolean> {
  const app = await NestFactory.createApplicationContext(IngestModule, { logger: false })
  const ingest = app.get(IngestService)

  await prisma.knowledgeItem.deleteMany({ where: { id: PROBE_ID } })

  const input = {
    id: PROBE_ID,
    title: 'Friday Night Menu Pairing Notes',
    category: 'menu',
    content: `These are unofficial pairing suggestions for the Friday pub-quiz crowd at The Crown.

        When guests order the steak special, recommend the Merlot (house red) — full-bodied, cuts through the fat. Do not recommend the Pinot Grigio with steak.

        For the fish and chips, steer toward a Neck Oil Session IPA or an Aspall Cider if they prefer not ale. Avoid heavy red wines.

        Vegetarian guests asking for pairings: Pinot Grigio (house white) with the halloumi skewers; Prosecco if they're celebrating.

        Bar staff: if a guest asks and you're unsure, refer to the weekly ordering supplier list or ask Sarah Mitchell (Head Bartender).`,
    venueId: null,
  }

  let result = await ingest.ingest(input)
  const md0 = (
    await prisma.knowledgeItem.findUnique({ where: { id: PROBE_ID }, select: { metadata: true } })
  )?.metadata as Record<string, unknown> | null
  const failSoftDetected =
    (!md0 || !Array.isArray(md0?.tags) || (md0.tags as unknown[]).length === 0) &&
    result.aiSummary === null
  if (failSoftDetected) {
    console.warn('WARN: first ingest hit fail-soft — retrying once before failing probe')
    await prisma.knowledgeItem.deleteMany({ where: { id: PROBE_ID } })
    result = await ingest.ingest(input)
  }

  const row = await prisma.knowledgeItem.findUnique({
    where: { id: PROBE_ID },
    select: { id: true, metadata: true, aiSummary: true },
  })
  const embeddedCount = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(*)::bigint AS n FROM "knowledge_items" WHERE id = $1 AND embedding IS NOT NULL`,
    PROBE_ID,
  )
  const hasEmbedding = Number(embeddedCount[0].n) === 1

  const md = (row?.metadata ?? {}) as Record<string, unknown>
  const tags = Array.isArray(md.tags) ? (md.tags as string[]) : []
  const crossRefs = Array.isArray(md.crossRefs)
    ? (md.crossRefs as Array<{ id?: string; ref?: string }>)
    : []
  const emergentKeys = Object.keys(md).filter((k) => !STARTER_KEYS.has(k))
  const agenticProof = crossRefs.length > 0 || emergentKeys.length > 0

  const checks: ReadonlyArray<readonly [string, boolean]> = [
    ['row persisted', !!row],
    [
      'metadata.summary non-empty',
      typeof md.summary === 'string' && (md.summary as string).length > 0,
    ],
    ['metadata.tags length >= 3', tags.length >= 3],
    [
      'metadata.docType non-empty',
      typeof md.docType === 'string' && (md.docType as string).length > 0,
    ],
    ['metadata.crossRefs is array', Array.isArray(md.crossRefs)],
    ['embedding IS NOT NULL', hasEmbedding],
    ['agentic emergence proven (crossRefs OR emergent keys)', agenticProof],
  ]

  let failed = 0
  for (const [name, ok] of checks) {
    console.log(ok ? `\u2713 ${name}` : `\u2717 ${name}`)
    if (!ok) failed++
  }
  console.log(`\ningested id: ${result.id}`)
  console.log(`docType: ${md.docType}`)
  console.log(`tags: ${tags.join(', ')}`)
  console.log(`crossRefs: ${JSON.stringify(crossRefs)}`)
  console.log(`emergent keys: ${emergentKeys.join(', ') || '(none)'}`)

  await app.close()
  return failed === 0
}

async function main() {
  let ok = false
  try {
    ok = await runProbe()
  } finally {
    await prisma.knowledgeItem.deleteMany({ where: { id: PROBE_ID } }).catch(() => {})
    await prisma.$disconnect().catch(() => {})
  }
  if (!ok) {
    console.error('\nIngest probe FAILED')
    process.exit(1)
  }
  console.log('\nIngest probe passed')
}

main().catch(async (err) => {
  console.error(err)
  await prisma.knowledgeItem.deleteMany({ where: { id: PROBE_ID } }).catch(() => {})
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
