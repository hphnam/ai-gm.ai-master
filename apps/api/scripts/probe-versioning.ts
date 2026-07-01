/**
 * probe-versioning — asserts archived (superseded) SOPs have left retrieval.
 *
 * Chat retrieval excludes superseded docs by DELETING their derived rows during
 * archival (reconcile `archiveWithinTx`): SearchableEntity, knowledge sections
 * (chunks cascade), tabular rows/columns, and checklists. Reconcile is
 * best-effort — a partial failure would leave residual rows that leak an
 * archived version back into chat answers. This probe verifies the invariant
 * holds across real data: for every `supersededAt IS NOT NULL` KnowledgeItem,
 * none of those derived rows should exist.
 *
 * Read-only — never writes. Safe to run against production.
 *
 *   npm run probe:versioning --workspace=api
 *
 * Exit 0 = clean (or nothing to check). Exit 1 = residual rows found.
 */

import '../src/load-env'
import { Prisma } from '@prisma/client'
import { prisma } from '../src/database/prisma'

type Residual = { label: string; count: number; docIds: string[] }

async function main(): Promise<number> {
  const superseded = await prisma.knowledgeItem.findMany({
    where: { supersededAt: { not: null } },
    select: { id: true },
  })

  if (superseded.length === 0) {
    console.log(
      JSON.stringify({ event: 'probe.versioning.skip', reason: 'no superseded documents' }),
    )
    return 0
  }

  const ids = superseded.map((d) => d.id)

  const [se, sections, tabRows, tabCols, checklists, checklistSteps] = await Promise.all([
    prisma.searchableEntity.findMany({
      where: { entityType: 'knowledge_item', entityId: { in: ids } },
      select: { entityId: true },
    }),
    prisma.knowledgeSection.findMany({
      where: { knowledgeItemId: { in: ids } },
      select: { knowledgeItemId: true },
    }),
    prisma.tabularRow.findMany({ where: { docId: { in: ids } }, select: { docId: true } }),
    prisma.tabularColumn.findMany({ where: { docId: { in: ids } }, select: { docId: true } }),
    prisma.checklist.findMany({
      where: { knowledgeItemId: { in: ids } },
      select: { knowledgeItemId: true },
    }),
    // Per-step SEs are keyed by checklist id, not the doc — they carry the doc in
    // metadata.knowledgeItemId. Match on that so we catch orphans even after the
    // Checklist row itself is gone.
    prisma.$queryRaw<Array<{ knowledgeItemId: string }>>(
      Prisma.sql`SELECT DISTINCT metadata->>'knowledgeItemId' AS "knowledgeItemId"
                 FROM searchable_entities
                 WHERE "entityType" = 'checklist_step'
                   AND metadata->>'knowledgeItemId' IN (${Prisma.join(ids)})`,
    ),
  ])

  const residuals: Residual[] = [
    { label: 'searchable_entities', count: se.length, docIds: distinct(se.map((r) => r.entityId)) },
    {
      label: 'knowledge_sections',
      count: sections.length,
      docIds: distinct(sections.map((r) => r.knowledgeItemId)),
    },
    { label: 'tabular_rows', count: tabRows.length, docIds: distinct(tabRows.map((r) => r.docId)) },
    {
      label: 'tabular_columns',
      count: tabCols.length,
      docIds: distinct(tabCols.map((r) => r.docId)),
    },
    {
      label: 'checklists',
      count: checklists.length,
      docIds: distinct(checklists.map((r) => r.knowledgeItemId)),
    },
    {
      label: 'searchable_entities(checklist_step)',
      count: checklistSteps.length,
      docIds: distinct(checklistSteps.map((r) => r.knowledgeItemId)),
    },
  ]

  const offending = residuals.filter((r) => r.count > 0)

  if (offending.length === 0) {
    console.log(
      JSON.stringify({
        event: 'probe.versioning.pass',
        supersededChecked: superseded.length,
      }),
    )
    return 0
  }

  for (const r of offending) {
    console.error(
      JSON.stringify({
        event: 'probe.versioning.residual',
        table: r.label,
        rows: r.count,
        docIds: r.docIds,
      }),
    )
  }
  console.error(
    JSON.stringify({
      event: 'probe.versioning.fail',
      supersededChecked: superseded.length,
      leakingDocs: distinct(offending.flatMap((r) => r.docIds)).length,
    }),
  )
  return 1
}

function distinct(values: string[]): string[] {
  return [...new Set(values)]
}

main()
  .then(async (code) => {
    await prisma.$disconnect()
    process.exit(code)
  })
  .catch(async (err) => {
    console.error(JSON.stringify({ event: 'probe.versioning.error', message: String(err) }))
    await prisma.$disconnect()
    process.exit(1)
  })
