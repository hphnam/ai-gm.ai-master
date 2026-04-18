import '../src/load-env'

import { prisma } from '@gm-ai/database'

type KnowledgeMetadata = {
  docType?: unknown
  tags?: unknown
  category?: unknown
}

async function main() {
  const start = Date.now()

  const [venueN, supplierN, catN, stockN, knowledgeN, contactN] = await Promise.all([
    prisma.venue.count(),
    prisma.mockSupplier.count(),
    prisma.mockStockCategory.count(),
    prisma.mockStock.count(),
    prisma.knowledgeItem.count(),
    prisma.venueContact.count(),
  ])

  const [stockEmbedded, knowledgeEmbedded, knowledgeRows] = await Promise.all([
    prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM "mock_stock" WHERE embedding IS NOT NULL`,
    ),
    prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM "knowledge_items" WHERE embedding IS NOT NULL`,
    ),
    prisma.knowledgeItem.findMany({ select: { id: true, metadata: true } }),
  ])

  const latencyMs = Date.now() - start

  const knowledgeWithTagsArray = knowledgeRows.filter((k) => {
    const md = (k.metadata ?? {}) as KnowledgeMetadata
    return Array.isArray(md.tags)
  }).length

  const knowledgeWithDocType = knowledgeRows.filter((k) => {
    const md = (k.metadata ?? {}) as KnowledgeMetadata
    return typeof md.docType === 'string' && md.docType.length > 0
  }).length

  const STARTER_KEYS = new Set(['summary', 'tags', 'docType', 'category', 'crossRefs'])
  const agenticRows = knowledgeRows.filter((k) => {
    const md = (k.metadata ?? {}) as Record<string, unknown>
    const hasEmergent = Object.keys(md).some((key) => !STARTER_KEYS.has(key))
    const crossRefs = Array.isArray(md.crossRefs) ? (md.crossRefs as unknown[]) : []
    return hasEmergent || crossRefs.length > 0
  }).length

  const strictChecks: ReadonlyArray<readonly [string, boolean]> = [
    ['venues = 2', venueN === 2],
    ['mock_suppliers = 5', supplierN === 5],
    ['mock_stock_categories = 7', catN === 7],
    ['mock_stock = 24', stockN === 24],
    ['every mock_stock has embedding', Number(stockEmbedded[0].n) === stockN],
    ['knowledge_items = 6', knowledgeN === 6],
    ['every knowledge_item has embedding', Number(knowledgeEmbedded[0].n) === knowledgeN],
    ['every knowledge_item has metadata.tags array', knowledgeWithTagsArray === knowledgeN],
    [`venue_contacts >= 3 (got ${contactN})`, contactN >= 3],
    [`probe latency < 5000ms (got ${latencyMs}ms)`, latencyMs < 5000],
  ]

  const softDocTypeOk = knowledgeWithDocType >= 5 && knowledgeWithDocType >= knowledgeN - 1
  const hardDocTypeFail = knowledgeN - knowledgeWithDocType > 1

  let failed = 0
  for (const [name, ok] of strictChecks) {
    console.log(ok ? `\u2713 ${name}` : `\u2717 ${name}`)
    if (!ok) failed++
  }

  if (hardDocTypeFail) {
    console.log(`\u2717 >1 knowledge_items missing metadata.docType (got ${knowledgeN - knowledgeWithDocType})`)
    failed++
  } else if (softDocTypeOk) {
    if (knowledgeWithDocType === knowledgeN) {
      console.log(`\u2713 all ${knowledgeN} knowledge_items have metadata.docType`)
    } else {
      console.warn(
        `WARN: ${knowledgeN - knowledgeWithDocType} knowledge_item missing metadata.docType (soft-threshold tolerated — ensure an enrichment.failsafe log line matches)`,
      )
    }
  } else {
    console.log(`\u2717 knowledge_items with metadata.docType below soft threshold (got ${knowledgeWithDocType}/${knowledgeN})`)
    failed++
  }

  if (agenticRows < 2) {
    console.log(`\u2717 agentic emergence: only ${agenticRows}/${knowledgeN} rows have emergent keys or crossRefs`)
    failed++
  } else if (agenticRows < 3) {
    console.warn(`WARN: agentic emergence low — ${agenticRows}/${knowledgeN} rows (soft threshold is 3+); Claude may be getting conservative`)
  } else {
    console.log(`\u2713 agentic emergence: ${agenticRows}/${knowledgeN} rows have emergent keys or crossRefs`)
  }

  console.log(
    `\nrow counts: venues=${venueN} mock_suppliers=${supplierN} mock_stock_categories=${catN} mock_stock=${stockN} knowledge_items=${knowledgeN} venue_contacts=${contactN}`,
  )
  console.log(`latency: ${latencyMs}ms`)

  if (failed) {
    console.error(`${failed} check(s) failed`)
    await prisma.$disconnect()
    process.exit(1)
  }
  console.log('\nSeed probe passed')
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
