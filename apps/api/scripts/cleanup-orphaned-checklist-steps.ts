/**
 * cleanup-orphaned-checklist-steps — one-off backfill for the pre-fix leak where
 * archiving a procedural doc left its per-step `checklist_step` SearchableEntity
 * rows behind (they're keyed by checklist id, not doc id, so the old
 * `archiveWithinTx` never deleted them). Those orphans stay retrievable in chat.
 *
 * `archiveWithinTx` now deletes them going forward; this cleans up docs archived
 * before that fix. Deletes only `checklist_step` SEs whose
 * `metadata.knowledgeItemId` points at a SUPERSEDED doc — live docs untouched.
 *
 * Dry-run by default (read-only). Pass --apply to delete.
 *
 *   npm run cleanup:orphaned-steps --workspace=api            # dry-run
 *   npm run cleanup:orphaned-steps --workspace=api -- --apply # delete
 */

import '../src/load-env'
import { Prisma } from '@prisma/client'
import { prisma } from '../src/database/prisma'

async function main(): Promise<number> {
  const apply = process.argv.includes('--apply')

  const superseded = await prisma.knowledgeItem.findMany({
    where: { supersededAt: { not: null } },
    select: { id: true },
  })
  if (superseded.length === 0) {
    console.log(
      JSON.stringify({ event: 'cleanup.orphaned_steps.skip', reason: 'no superseded docs' }),
    )
    return 0
  }
  const ids = superseded.map((d) => d.id)

  const orphans = await prisma.$queryRaw<Array<{ id: string; knowledgeItemId: string }>>(
    Prisma.sql`SELECT id, metadata->>'knowledgeItemId' AS "knowledgeItemId"
               FROM searchable_entities
               WHERE "entityType" = 'checklist_step'
                 AND metadata->>'knowledgeItemId' IN (${Prisma.join(ids)})`,
  )

  if (orphans.length === 0) {
    console.log(
      JSON.stringify({ event: 'cleanup.orphaned_steps.clean', supersededChecked: ids.length }),
    )
    return 0
  }

  const affectedDocs = [...new Set(orphans.map((o) => o.knowledgeItemId))]
  console.log(
    JSON.stringify({
      event: apply ? 'cleanup.orphaned_steps.deleting' : 'cleanup.orphaned_steps.dry_run',
      orphanRows: orphans.length,
      affectedDocs,
    }),
  )

  if (!apply) {
    console.log('Re-run with -- --apply to delete these rows.')
    return 0
  }

  const deleted = await prisma.searchableEntity.deleteMany({
    where: { id: { in: orphans.map((o) => o.id) } },
  })
  console.log(JSON.stringify({ event: 'cleanup.orphaned_steps.done', deleted: deleted.count }))
  return 0
}

main()
  .then(async (code) => {
    await prisma.$disconnect()
    process.exit(code)
  })
  .catch(async (err) => {
    console.error(JSON.stringify({ event: 'cleanup.orphaned_steps.error', message: String(err) }))
    await prisma.$disconnect()
    process.exit(1)
  })
