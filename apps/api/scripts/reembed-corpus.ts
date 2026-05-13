/**
 * Cold-cut re-embed of every embedded row to the current VOYAGE_EMBED_MODEL.
 *
 *   tsx apps/api/scripts/reembed-corpus.ts
 *
 * Walks knowledge_items, knowledge_chunks, and searchable_entities. For each
 * row with a non-null embeddingText, re-embeds via Voyage in `document` mode
 * and writes the new vector into the same column. mock_stock has the column
 * but no rows reference it today — included as a safety net in case future
 * code starts populating it before this script is retired.
 *
 * Idempotent: re-running just re-embeds again. Safe to interrupt — partial
 * progress is committed per-row. No schema change, no version marker; bumping
 * VOYAGE_EMBED_MODEL and re-running is the entire upgrade contract.
 */

import '../src/load-env'
import { VoyageAIClient } from 'voyageai'
import { prisma } from '../src/database/prisma'
import { VOYAGE_EMBED_MODEL } from '../src/types/section'

const BATCH_SIZE = 32

const apiKey = process.env.VOYAGE_API_KEY
if (!apiKey) throw new Error('VOYAGE_API_KEY not set')
const voyage = new VoyageAIClient({ apiKey })

type Target = {
  table: string
  // Tables in the schema use camelCase column names that pgvector treats
  // case-sensitively — must double-quote in raw SQL.
  idColumn: string
}

const TARGETS: Target[] = [
  { table: 'knowledge_items', idColumn: 'id' },
  { table: 'knowledge_chunks', idColumn: 'id' },
  { table: 'searchable_entities', idColumn: 'id' },
  { table: 'mock_stock', idColumn: 'id' },
]

async function embedDocuments(texts: string[]): Promise<number[][]> {
  const response = await voyage.embed({
    model: VOYAGE_EMBED_MODEL,
    input: texts,
    inputType: 'document',
  })
  return response.data!.map((d) => d.embedding!)
}

function vectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`
}

async function reembedTable(t: Target): Promise<{ rows: number; calls: number }> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; embeddingText: string }>>(
    `SELECT "${t.idColumn}" AS id, "embeddingText"
     FROM "${t.table}"
     WHERE "embedding" IS NOT NULL
       AND "embeddingText" IS NOT NULL
       AND length("embeddingText") > 0
     ORDER BY "${t.idColumn}"`,
  )
  if (rows.length === 0) {
    console.log(`[${t.table}] 0 rows to re-embed`)
    return { rows: 0, calls: 0 }
  }
  console.log(`[${t.table}] re-embedding ${rows.length} rows in batches of ${BATCH_SIZE}`)

  let calls = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const vectors = await embedDocuments(batch.map((r) => r.embeddingText))
    calls++
    for (let j = 0; j < batch.length; j++) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${t.table}" SET "embedding" = $1::vector WHERE "${t.idColumn}" = $2`,
        vectorLiteral(vectors[j]),
        batch[j].id,
      )
    }
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`)
  }
  process.stdout.write('\n')
  return { rows: rows.length, calls }
}

async function main() {
  console.log(`Cold-cut re-embed → ${VOYAGE_EMBED_MODEL}`)
  let totalRows = 0
  let totalCalls = 0
  for (const t of TARGETS) {
    const { rows, calls } = await reembedTable(t)
    totalRows += rows
    totalCalls += calls
  }
  const usd = totalCalls * 0.00006
  console.log(
    `\nDone. Rows re-embedded: ${totalRows}. Voyage calls: ${totalCalls}. Approx spend: $${usd.toFixed(4)}.`,
  )
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
