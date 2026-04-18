import { config } from 'dotenv'
import { resolve } from 'node:path'
config({ path: resolve(__dirname, '../../../.env') })

import { prisma } from '@gm-ai/database'

async function main() {
  const [venueN, supplierN, catN, stockN, sopN, contactN] = await Promise.all([
    prisma.venue.count(),
    prisma.supplier.count(),
    prisma.stockCategory.count(),
    prisma.stockItem.count(),
    prisma.sopDocument.count(),
    prisma.venueContact.count(),
  ])

  const [stockEmbedded, sopEmbedded, sopSummarised, sopTagged] = await Promise.all([
    prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM "StockItem" WHERE embedding IS NOT NULL`,
    ),
    prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM "SopDocument" WHERE embedding IS NOT NULL`,
    ),
    prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM "SopDocument" WHERE "aiSummary" IS NOT NULL AND length("aiSummary") > 0`,
    ),
    prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*)::bigint AS n FROM "SopDocument" WHERE array_length("aiTags", 1) >= 1`,
    ),
  ])

  const checks: ReadonlyArray<readonly [string, boolean]> = [
    ['venues = 2', venueN === 2],
    ['suppliers = 5', supplierN === 5],
    ['stock_categories = 7', catN === 7],
    ['stock_items >= 20', stockN >= 20],
    ['sop_documents = 6', sopN === 6],
    ['venue_contacts >= 3', contactN >= 3],
    ['every stock_item has embedding', Number(stockEmbedded[0].n) === stockN],
    ['every sop_document has embedding', Number(sopEmbedded[0].n) === sopN],
    ['every sop_document has aiSummary', Number(sopSummarised[0].n) === sopN],
    ['every sop_document has aiTags', Number(sopTagged[0].n) === sopN],
  ]

  let failed = 0
  for (const [name, ok] of checks) {
    console.log(ok ? `\u2713 ${name}` : `\u2717 ${name}`)
    if (!ok) failed++
  }
  console.log(
    `\nrow counts: venues=${venueN} suppliers=${supplierN} cats=${catN} stock=${stockN} sops=${sopN} contacts=${contactN}`,
  )
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
