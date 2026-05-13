/**
 * Plan 01-02 — backfill KnowledgeSection + KnowledgeChunk rows for every
 * existing KnowledgeItem that doesn't yet have them (idempotent).
 *
 *   npm run backfill:sections --workspace=api
 *
 * Per-tenant safety:
 *   - pg_try_advisory_lock per organizationId prevents concurrent runs on the
 *     same tenant violating @@unique([knowledgeItemId, sectionIndex]).
 *   - Cost ceiling halts processing for the tenant (not the whole run) when
 *     the per-org Voyage spend would cross BACKFILL_TENANT_COST_CEILING_USD.
 *   - Voyage 429-backoff (audit-S4): pause 30s after 3 consecutive failures.
 *
 * Re-runs are no-ops on KIs whose MAX(KnowledgeSection.sectionVersion) ≥
 * CURRENT_SECTION_VERSION. Bump CURRENT_SECTION_VERSION + re-run to migrate.
 *
 * Probe override: PROBE_BACKFILL_COST_CEILING_USD env var (NODE_ENV != prod;
 * assertAuthEnv prod-fail backstop) overrides the ceiling for W23 cheap tests.
 */

import '../src/load-env'
import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { prisma } from '../src/database/prisma'
import { EmbeddingsService } from '../src/modules/embeddings/embeddings.service'
import { IndexerService } from '../src/modules/indexer/indexer.service'
import { IngestService } from '../src/modules/ingest/ingest.service'
import { SectionDetector } from '../src/modules/ingest/section-detector'
import {
  BACKFILL_TENANT_COST_CEILING_USD,
  BACKFILL_VOYAGE_BACKOFF_MS,
  CURRENT_SECTION_VERSION,
  VOYAGE_DOC_USD_PER_CALL,
} from '../src/types'
import { detectMimeFromContent } from './detect-mime-from-content'

const logger = new Logger('Backfill')

export type BackfillStats = {
  tenantsProcessed: number
  tenantsPartial: number
  tenantsLockedOut: number
  kiTotal: number
  kiProcessed: number
  kiSkipped: number
  totalSections: number
  totalChunks: number
  totalEmbedded: number
  docsWithDegradedEmbedQuality: number
  docsWithNoEmbeddings: number
  totalVoyageCalls: number
  estUsdSpend: number
  partialTenantList: {
    orgId: string
    kiProcessed: number
    kiRemaining: number
    estUsdSpend: number
  }[]
}

type TargetKi = { id: string; content: string; organizationId: string }

function effectiveCeiling(): number {
  const probeOverride = process.env.PROBE_BACKFILL_COST_CEILING_USD
  if (probeOverride !== undefined && process.env.NODE_ENV !== 'production') {
    const n = Number(probeOverride)
    if (Number.isFinite(n) && n >= 0) return n
  }
  return BACKFILL_TENANT_COST_CEILING_USD
}

function estimateDocSpend(content: string): number {
  // Conservative: assume ≤200 chunks/doc cap (per MAX_EMBEDS_PER_DOCUMENT).
  // ~4 chars/token, ~1024 tokens/chunk → ~4096 chars/chunk.
  // Each chunk → 1 Voyage call → VOYAGE_DOC_USD_PER_CALL.
  const approxChunks = Math.max(1, Math.min(200, Math.ceil(content.length / 4096)))
  return approxChunks * VOYAGE_DOC_USD_PER_CALL
}

async function listOrgsForBackfill(orgIdsFilter: string[] | null): Promise<string[]> {
  if (orgIdsFilter && orgIdsFilter.length > 0) {
    const rows = await prisma.organization.findMany({
      where: { id: { in: orgIdsFilter } },
      select: { id: true },
    })
    return rows.map((r) => r.id)
  }
  const rows = await prisma.organization.findMany({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((r) => r.id)
}

async function listKisNeedingBackfill(orgId: string): Promise<TargetKi[]> {
  const rows = await prisma.$queryRawUnsafe<TargetKi[]>(
    `SELECT ki.id, ki.content, ki."organizationId"
     FROM knowledge_items ki
     LEFT JOIN LATERAL (
       SELECT MAX(s."sectionVersion") AS v
       FROM knowledge_sections s
       WHERE s."knowledgeItemId" = ki.id
     ) s ON true
     WHERE ki."organizationId" = $1
       AND LENGTH(ki.content) > 0
       AND (s.v IS NULL OR s.v < $2)
     ORDER BY ki.id ASC`,
    orgId,
    CURRENT_SECTION_VERSION,
  )
  return rows
}

async function tryAcquireOrgLock(orgId: string): Promise<boolean> {
  const lockKey = `backfill:org:${orgId}`
  const result = await prisma.$queryRawUnsafe<{ acquired: boolean }[]>(
    `SELECT pg_try_advisory_lock(hashtext($1)::int) AS acquired`,
    lockKey,
  )
  return Boolean(result[0]?.acquired)
}

async function releaseOrgLock(orgId: string): Promise<void> {
  const lockKey = `backfill:org:${orgId}`
  await prisma
    .$queryRawUnsafe(`SELECT pg_advisory_unlock(hashtext($1)::int)`, lockKey)
    .catch(() => undefined)
}

export async function runBackfill(
  orgIds: string[] | null = null,
  opts?: { ceilingOverrideUsd?: number },
): Promise<BackfillStats> {
  const stats: BackfillStats = {
    tenantsProcessed: 0,
    tenantsPartial: 0,
    tenantsLockedOut: 0,
    kiTotal: 0,
    kiProcessed: 0,
    kiSkipped: 0,
    totalSections: 0,
    totalChunks: 0,
    totalEmbedded: 0,
    docsWithDegradedEmbedQuality: 0,
    docsWithNoEmbeddings: 0,
    totalVoyageCalls: 0,
    estUsdSpend: 0,
    partialTenantList: [],
  }

  const ceiling = opts?.ceilingOverrideUsd ?? effectiveCeiling()

  // Manual DI — same pattern as probe-section.ts (no @nestjs/testing).
  const embeddings = new EmbeddingsService()
  embeddings.onModuleInit()
  const indexer = new IndexerService(embeddings)
  const detector = new SectionDetector()
  const ingest = new IngestService(embeddings, indexer, detector)
  ingest.onModuleInit()

  const orgList = await listOrgsForBackfill(orgIds)
  for (const orgId of orgList) {
    const targets = await listKisNeedingBackfill(orgId)
    stats.kiTotal += targets.length

    if (targets.length === 0) {
      // Nothing to do; do not contend on the lock.
      continue
    }

    const acquired = await tryAcquireOrgLock(orgId)
    if (!acquired) {
      stats.tenantsLockedOut++
      logger.warn(
        JSON.stringify({
          event: 'backfill.tenant_lock_unavailable',
          orgId,
          lockKey: `backfill:org:${orgId}`,
        }),
      )
      continue
    }

    let tenantSpend = 0
    let kiProcessedThisTenant = 0
    let consecutive429s = 0
    let halted = false
    logger.log(
      JSON.stringify({
        event: 'backfill.tenant_started',
        orgId,
        kiCount: targets.length,
      }),
    )

    try {
      for (let i = 0; i < targets.length; i++) {
        const ki = targets[i]
        const docEst = estimateDocSpend(ki.content)
        if (tenantSpend + docEst > ceiling) {
          const remaining = targets.length - i
          logger.warn(
            JSON.stringify({
              event: 'backfill.tenant_cost_ceiling_reached',
              orgId,
              kiProcessed: kiProcessedThisTenant,
              kiRemaining: remaining,
              estUsdSpend: tenantSpend,
              ceiling,
            }),
          )
          logger.log(
            JSON.stringify({
              event: 'backfill.tenant_partial',
              orgId,
              kiProcessed: kiProcessedThisTenant,
              kiRemaining: remaining,
              estUsdSpend: tenantSpend,
            }),
          )
          stats.partialTenantList.push({
            orgId,
            kiProcessed: kiProcessedThisTenant,
            kiRemaining: remaining,
            estUsdSpend: tenantSpend,
          })
          stats.tenantsPartial++
          halted = true
          break
        }

        const inferredMime = detectMimeFromContent(ki.content)

        let result: Awaited<ReturnType<typeof ingest.persistSectionsAndEmbed>> | null = null
        try {
          result = await ingest.persistSectionsAndEmbed(
            ki.id,
            ki.content,
            inferredMime,
            ki.organizationId,
          )
        } catch (err) {
          logger.warn(
            JSON.stringify({
              event: 'backfill.ki_failed',
              orgId,
              knowledgeItemId: ki.id,
              error: (err as Error).message?.slice(0, 200) ?? 'unknown',
            }),
          )
          continue
        }

        // Aggregate quality fields (audit-M5).
        stats.totalSections += result.sectionCount
        stats.totalChunks += result.chunkCount
        stats.totalEmbedded += result.embeddedCount
        if (result.embedQualityDegraded) stats.docsWithDegradedEmbedQuality++
        if (result.embeddedCount === 0 && result.chunkCount > 0) stats.docsWithNoEmbeddings++

        const docVoyageCalls = result.chunkCount
        const docSpend = docVoyageCalls * VOYAGE_DOC_USD_PER_CALL
        tenantSpend += docSpend
        stats.totalVoyageCalls += docVoyageCalls
        stats.kiProcessed++
        kiProcessedThisTenant++

        // Voyage 429 backoff (audit-S4) — track consecutive failures with embed
        // failures > 0 as proxy for rate-limit pressure.
        if (result.embedFailedCount > 0) {
          consecutive429s++
          if (consecutive429s >= 3) {
            logger.warn(
              JSON.stringify({
                event: 'backfill.voyage_backoff',
                orgId,
                consecutiveFailures: consecutive429s,
                sleepMs: BACKFILL_VOYAGE_BACKOFF_MS,
              }),
            )
            await new Promise((r) => setTimeout(r, BACKFILL_VOYAGE_BACKOFF_MS))
            consecutive429s = 0
          }
        } else {
          consecutive429s = 0
        }

        logger.log(
          JSON.stringify({
            event: 'backfill.ki_processed',
            knowledgeItemId: ki.id,
            organizationId: ki.organizationId,
            sectionCount: result.sectionCount,
            chunkCount: result.chunkCount,
            embeddedCount: result.embeddedCount,
            inferredMime,
            embedQualityDegraded: result.embedQualityDegraded,
          }),
        )
      }

      stats.estUsdSpend += tenantSpend
      if (!halted) {
        logger.log(
          JSON.stringify({
            event: 'backfill.tenant_completed',
            orgId,
            kiProcessed: kiProcessedThisTenant,
            totalChunks: stats.totalChunks, // running aggregate; per-tenant slice below
            totalVoyageCalls: stats.totalVoyageCalls,
            estUsdSpend: tenantSpend,
          }),
        )
        stats.tenantsProcessed++
      }
    } finally {
      await releaseOrgLock(orgId)
    }
  }

  // kiSkipped: KIs we never targeted because their version was already current.
  // Reported by simply listing the count of KIs in the targeted orgs minus what we processed.
  stats.kiSkipped = Math.max(0, stats.kiTotal - stats.kiProcessed)

  logger.log(
    JSON.stringify({
      event: 'backfill.completed',
      tenantsProcessed: stats.tenantsProcessed,
      tenantsPartial: stats.tenantsPartial,
      tenantsLockedOut: stats.tenantsLockedOut,
      kiTotal: stats.kiTotal,
      kiProcessed: stats.kiProcessed,
      kiSkipped: stats.kiSkipped,
      totalSections: stats.totalSections,
      totalChunks: stats.totalChunks,
      totalEmbedded: stats.totalEmbedded,
      docsWithDegradedEmbedQuality: stats.docsWithDegradedEmbedQuality,
      docsWithNoEmbeddings: stats.docsWithNoEmbeddings,
      totalVoyageCalls: stats.totalVoyageCalls,
      estUsdSpend: stats.estUsdSpend,
      partialTenantList: stats.partialTenantList,
    }),
  )

  return stats
}

async function main(): Promise<void> {
  try {
    await runBackfill(null)
    await prisma.$disconnect()
    process.exit(0)
  } catch (err) {
    console.error('backfill-knowledge-sections crashed:', err)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  }
}

// Auto-run when executed directly (tsx scripts/backfill-knowledge-sections.ts).
// When imported by probe-section.ts, the named export `runBackfill` is used and
// main() is skipped.
const invokedDirectly = (() => {
  const argv1 = process.argv[1] ?? ''
  return (
    argv1.endsWith('backfill-knowledge-sections.ts') ||
    argv1.endsWith('backfill-knowledge-sections.js')
  )
})()
if (invokedDirectly) {
  void main()
}
