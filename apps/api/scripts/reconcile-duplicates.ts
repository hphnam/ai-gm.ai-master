/**
 * Backfill: find and (optionally) reconcile pre-existing duplicate documents —
 * the corpus that predates automatic on-upload reconciliation.
 *
 *   tsx apps/api/scripts/reconcile-duplicates.ts                 # dry run (report only)
 *   tsx apps/api/scripts/reconcile-duplicates.ts --apply         # supersede the safe pairs
 *   tsx apps/api/scripts/reconcile-duplicates.ts --org=<uuid>    # scope to one org
 *   tsx apps/api/scripts/reconcile-duplicates.ts --threshold=0.85
 *   tsx apps/api/scripts/reconcile-duplicates.ts --apply --include-compliance
 *
 * Pairs are same-org, same-DocumentType, same-venue, both live, cosine ≥ threshold
 * (default 0.80). The older row is the predecessor, the newer is the kept version.
 *
 * --apply only supersedes pairs that clear the SAME guards as the automatic path
 * (title overlap ≥ 0.6, predecessor has no active expiry record). Everything else
 * is reported but skipped — reconcile those by hand via POST /docs/:id/supersede.
 * --include-compliance relaxes only the expiry guard (still requires title overlap)
 * for operators who have reviewed the report. Idempotent: re-runs are safe — the
 * locked archive bails on any pair already resolved.
 */

import '../src/load-env'
import { prisma } from '../src/database/prisma'
import { archiveWithinTx, titleOverlap } from '../src/modules/docs/reconcile.service'

const TITLE_MIN_OVERLAP = 0.6

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const INCLUDE_COMPLIANCE = args.includes('--include-compliance')
const ORG = args.find((a) => a.startsWith('--org='))?.slice('--org='.length) ?? null
const THRESHOLD = Number(
  args.find((a) => a.startsWith('--threshold='))?.slice('--threshold='.length) ?? '0.80',
)

type PairRow = {
  pred_id: string
  pred_title: string | null
  pred_created: Date
  succ_id: string
  succ_title: string | null
  succ_created: Date
  similarity: number | string
  pred_active_expiry: number
}

async function orgIds(): Promise<string[]> {
  if (ORG) return [ORG]
  const rows = await prisma.$queryRawUnsafe<{ organizationId: string }[]>(
    `SELECT DISTINCT "organizationId" FROM "knowledge_items"
     WHERE "documentTypeId" IS NOT NULL AND "supersededAt" IS NULL`,
  )
  return rows.map((r) => r.organizationId)
}

async function candidatePairs(orgId: string): Promise<PairRow[]> {
  return prisma.$queryRawUnsafe<PairRow[]>(
    `
    SELECT a.id AS pred_id, a.metadata->>'title' AS pred_title, a."createdAt" AS pred_created,
           b.id AS succ_id, b.metadata->>'title' AS succ_title,
           b."createdAt" AS succ_created,
           1 - (a.embedding <=> b.embedding) AS similarity,
           (SELECT count(*)::int FROM "expiry_records" er
              WHERE er."knowledgeItemId" = a.id AND er.status = 'active') AS pred_active_expiry
    FROM "knowledge_items" a
    JOIN "knowledge_items" b
      ON a."organizationId" = b."organizationId"
     AND a."documentTypeId" = b."documentTypeId"
     AND (a."venueId" IS NOT DISTINCT FROM b."venueId")
     -- Older row (by createdAt, id as tiebreak) is the predecessor. The id
     -- tiebreak keeps same-millisecond duplicates from being silently skipped.
     AND (a."createdAt" < b."createdAt"
          OR (a."createdAt" = b."createdAt" AND a.id < b.id))
    WHERE a."organizationId" = $1
      AND a."answerStatus" = 'answered' AND b."answerStatus" = 'answered'
      AND a."supersededAt" IS NULL AND b."supersededAt" IS NULL
      AND a."documentTypeId" IS NOT NULL
      AND a.embedding IS NOT NULL AND b.embedding IS NOT NULL
      AND 1 - (a.embedding <=> b.embedding) >= $2
    ORDER BY similarity DESC
    `,
    orgId,
    THRESHOLD,
  )
}

function wouldApply(row: PairRow): boolean {
  const overlap = titleOverlap(row.pred_title, row.succ_title)
  if (overlap < TITLE_MIN_OVERLAP) return false
  if (row.pred_active_expiry > 0 && !INCLUDE_COMPLIANCE) return false
  return true
}

async function main(): Promise<void> {
  const orgs = await orgIds()
  console.log(
    `reconcile-duplicates — ${APPLY ? 'APPLY' : 'DRY RUN'} | threshold=${THRESHOLD} | ` +
      `${INCLUDE_COMPLIANCE ? 'including' : 'excluding'} compliance | orgs=${orgs.length}\n`,
  )

  let totalCandidates = 0
  let totalApplied = 0
  let totalSkipped = 0

  for (const orgId of orgs) {
    const pairs = await candidatePairs(orgId)
    if (pairs.length === 0) continue
    totalCandidates += pairs.length

    // Build the action set: each predecessor → its NEWEST directly-similar
    // successor that clears the guards. Pairs that fail a guard are reported but
    // never applied; a predecessor's non-newest pairs are absorbed (it gets
    // archived once, to the newest). Applying oldest-predecessor-first means a
    // doc is always archived to a still-live target before that target itself is
    // archived — createdAt strictly increases along every pair — so a chain
    // (A→B, B→C) collapses fully and deterministically, and the report below is
    // exactly what --apply does, independent of cosine ordering.
    const actionByPred = new Map<string, PairRow>()
    const skipped: PairRow[] = []
    for (const p of pairs) {
      if (!wouldApply(p)) {
        skipped.push(p)
        continue
      }
      const prev = actionByPred.get(p.pred_id)
      if (!prev || p.succ_created > prev.succ_created) actionByPred.set(p.pred_id, p)
    }
    const actions = [...actionByPred.values()].sort(
      (a, b) =>
        a.pred_created.getTime() - b.pred_created.getTime() || (a.pred_id < b.pred_id ? -1 : 1),
    )

    console.log(
      `org ${orgId} — ${pairs.length} candidate pair(s), ${actions.length} supersede action(s):`,
    )
    for (const p of actions) {
      console.log(
        `  [${Number(p.similarity).toFixed(3)}] keep "${p.succ_title ?? p.succ_id}" ` +
          `⟵ archive "${p.pred_title ?? p.pred_id}"`,
      )
    }
    for (const p of skipped) {
      const overlap = titleOverlap(p.pred_title, p.succ_title)
      const reason =
        overlap < TITLE_MIN_OVERLAP
          ? `title overlap ${overlap.toFixed(2)}`
          : 'active expiry — needs review'
      console.log(
        `  · skip [${Number(p.similarity).toFixed(3)}] "${p.succ_title ?? p.succ_id}" ` +
          `⟵→ "${p.pred_title ?? p.pred_id}" (${reason})`,
      )
      totalSkipped++
    }

    if (APPLY) {
      for (const p of actions) {
        const archived = await prisma.$transaction((tx) =>
          archiveWithinTx(tx, p.pred_id, p.succ_id),
        )
        if (archived) {
          totalApplied++
          console.log(`  ✓ superseded ${p.pred_id} → ${p.succ_id}`)
        } else {
          console.log(`  · already resolved ${p.pred_id} (skipped)`)
        }
      }
    }
    console.log('')
  }

  console.log(
    `done — ${totalCandidates} candidate pair(s); ` +
      `${APPLY ? `${totalApplied} superseded, ` : ''}${totalSkipped} skipped/needs-review` +
      `${APPLY ? '' : ' (dry run — re-run with --apply)'}`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
