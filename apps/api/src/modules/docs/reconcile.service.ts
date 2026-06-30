import { Injectable, Logger } from '@nestjs/common'

import { Prisma, prisma } from '../../database/prisma'
import { MemoryReconcileTrigger } from '../organization/memory-reconcile.trigger'
import { RealtimeGateway } from '../realtime/realtime.gateway'

// Cosine-similarity gate for auto-supersede. A genuine new version of the same
// document (opening checklist v1 → v2) sits very high (~0.9); two different docs
// sharing a DocumentType (opening vs closing checklist) sit well below. 0.86 is
// the conservative cut so a near-miss never archives the wrong doc.
const RECONCILE_AUTO_CONFIDENCE = 0.86

// Same DocumentType + venue + high cosine is not sufficient on its own: distinct
// docs of one class legitimately coexist (two staff certs of the same type are
// near-identical templates differing only by name/date). The title must also
// substantially overlap — a real new version keeps the subject ("Opening
// Checklist" → "Opening Checklist 2026"), while different instances diverge
// ("…Alice" vs "…Bob", "Bar…" vs "Kitchen…"). Jaccard over title tokens.
const RECONCILE_TITLE_MIN_OVERLAP = 0.6

type Candidate = {
  id: string
  version: number
  title: string | null
  similarity: number
}

@Injectable()
export class ReconcileService {
  private readonly logger = new Logger(ReconcileService.name)

  constructor(
    private readonly realtime: RealtimeGateway,
    private readonly memoryReconcile: MemoryReconcileTrigger,
  ) {}

  // Detect whether the just-ingested doc is a newer version of an existing live
  // doc and, above the confidence gate, archive the predecessor in place. Runs
  // fire-and-forget from enrichInBackground — never throws into the upload path.
  // Returns the superseded predecessor (or null when nothing crossed the bar).
  async detectAndSupersede(args: {
    newItemId: string
    orgId: string
    venueId: string | null
    documentTypeId: string | null
    title: string | null
  }): Promise<{ supersededId: string; similarity: number } | null> {
    // A confirmed DocumentType is the cheap, conservative scoping key — without
    // it we can't tell "new version" from "unrelated doc that reads similarly".
    if (!args.documentTypeId) return null

    const candidate = await this.findPredecessor(args)
    if (!candidate || candidate.similarity < RECONCILE_AUTO_CONFIDENCE) {
      this.logger.log(
        JSON.stringify({
          event: 'docs.reconcile_no_match',
          knowledgeItemId: args.newItemId,
          orgId: args.orgId,
          topSimilarity: candidate?.similarity ?? null,
        }),
      )
      return null
    }

    // Guard 1 — titles must overlap. Catches different-instance docs of the same
    // type (staff certs by name, bar vs kitchen checklists) that read alike.
    if (titleOverlap(args.title, candidate.title) < RECONCILE_TITLE_MIN_OVERLAP) {
      this.logger.log(
        JSON.stringify({
          event: 'docs.reconcile_skipped_title',
          knowledgeItemId: args.newItemId,
          candidateId: candidate.id,
          orgId: args.orgId,
          similarity: candidate.similarity,
        }),
      )
      return null
    }

    // Guard 2 — never auto-archive a doc that owns an active compliance/expiry
    // track. Silently dismissing the wrong renewal reminder is unacceptable, so
    // expiry-bearing docs (cert renewals etc.) are left for human review.
    const activeExpiry = await prisma.expiryRecord.count({
      where: { knowledgeItemId: candidate.id, status: 'active' },
    })
    if (activeExpiry > 0) {
      this.logger.log(
        JSON.stringify({
          event: 'docs.reconcile_skipped_compliance',
          knowledgeItemId: args.newItemId,
          candidateId: candidate.id,
          orgId: args.orgId,
          activeExpiry,
        }),
      )
      return null
    }

    const archived = await this.supersede(candidate.id, args.newItemId, args.orgId)
    if (!archived) {
      // A concurrent reconcile already resolved this pair — nothing to do.
      this.logger.log(
        JSON.stringify({
          event: 'docs.reconcile_race_skipped',
          knowledgeItemId: args.newItemId,
          candidateId: candidate.id,
          orgId: args.orgId,
        }),
      )
      return null
    }

    this.logger.log(
      JSON.stringify({
        event: 'docs.reconcile_superseded',
        knowledgeItemId: args.newItemId,
        supersededId: candidate.id,
        orgId: args.orgId,
        similarity: candidate.similarity,
      }),
    )

    return { supersededId: candidate.id, similarity: candidate.similarity }
  }

  // Archive `predecessorId` in favour of `successorId` and fan out the realtime
  // events. Returns false when a concurrent run already resolved the pair (the
  // loser bails inside the locked transaction). Shared by the automatic
  // detection path above and the manual reconcile path (DocsService).
  async supersede(predecessorId: string, successorId: string, orgId: string): Promise<boolean> {
    const archived = await prisma.$transaction((tx) =>
      archiveWithinTx(tx, predecessorId, successorId),
    )
    if (!archived) return false
    this.realtime.emitDocUpdated(orgId, { id: predecessorId, status: 'superseded' })
    this.realtime.emitDocUpdated(orgId, { id: successorId, status: 'ready' })
    // KB changed (a doc was replaced) — debounce-trigger a memory reconcile.
    this.memoryReconcile.onKbChanged(orgId)
    return true
  }

  // Reverse a supersede: clear the predecessor's archive stamps, flip it back to
  // 'processing' (the caller re-ingests to rebuild its dropped retrieval rows),
  // and roll the successor's display version back to the predecessor's. Returns
  // false when the predecessor is no longer archived (already restored / lost a
  // race). Mirrors supersede()'s locked-tx + realtime-fanout shape.
  async unsupersede(predecessorId: string, successorId: string, orgId: string): Promise<boolean> {
    const restored = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT id FROM "knowledge_items" WHERE id IN ($1, $2) ORDER BY id FOR UPDATE`,
        predecessorId,
        successorId,
      )
      const rows = await tx.knowledgeItem.findMany({
        where: { id: { in: [predecessorId, successorId] }, organizationId: orgId },
        select: { id: true, version: true, supersededAt: true },
      })
      const pred = rows.find((r) => r.id === predecessorId)
      const succ = rows.find((r) => r.id === successorId)
      // Bail if the predecessor isn't archived anymore (race) or the successor
      // vanished / is cross-org. The org filter above makes this self-defending
      // rather than trusting the caller's invariant. Don't require the successor
      // to still be live — a longer chain shouldn't block restoring one of its links.
      if (!pred?.supersededAt || !succ) return false

      await tx.knowledgeItem.update({
        where: { id: predecessorId },
        data: {
          supersededAt: null,
          supersededById: null,
          processingStatus: 'processing',
          processingError: null,
        },
      })
      // version is display-only; reverse the +1 bump archiveWithinTx applied.
      // Best-effort for fan-in chains (a successor folding several predecessors).
      await tx.knowledgeItem.update({
        where: { id: successorId },
        data: { version: pred.version },
      })
      return true
    })
    if (!restored) return false
    this.realtime.emitDocUpdated(orgId, { id: predecessorId, status: 'processing' })
    this.realtime.emitDocUpdated(orgId, { id: successorId, status: 'ready' })
    // KB changed (a doc came back) — debounce-trigger a memory reconcile.
    this.memoryReconcile.onKbChanged(orgId)
    return true
  }

  // Closest live doc of the same DocumentType in the same venue scope, ranked by
  // cosine against the new item's stored embedding (no re-embed — the row is
  // already embedded by the time ingest returns). The incoming item is pinned to
  // the same org as the candidates so tenant isolation holds regardless of caller.
  private async findPredecessor(args: {
    newItemId: string
    orgId: string
    venueId: string | null
    documentTypeId: string | null
  }): Promise<Candidate | null> {
    const rows = await prisma.$queryRawUnsafe<
      { id: string; version: number; title: string | null; similarity: number | string }[]
    >(
      `
      SELECT cand.id,
             cand.version,
             cand.metadata->>'title' AS title,
             1 - (cand.embedding <=> incoming.embedding) AS similarity
      FROM "knowledge_items" cand
      JOIN "knowledge_items" incoming
        ON incoming.id = $1 AND incoming."organizationId" = $2
      WHERE cand.id <> $1
        AND cand."organizationId" = $2
        AND cand."documentTypeId" = $3
        AND cand."answerStatus" = 'answered'
        AND cand."supersededAt" IS NULL
        AND cand.embedding IS NOT NULL
        AND incoming.embedding IS NOT NULL
        AND (cand."venueId" IS NOT DISTINCT FROM $4)
      ORDER BY cand.embedding <=> incoming.embedding ASC
      LIMIT 1
      `,
      args.newItemId,
      args.orgId,
      args.documentTypeId,
      args.venueId,
    )
    const top = rows[0]
    if (!top) return null
    return {
      id: top.id,
      version: top.version,
      title: top.title,
      similarity: Number(top.similarity),
    }
  }
}

// Archive in place: stamp supersede pointers, drop the predecessor's heavy
// derived rows (search index, sections/chunks, tabular, checklist) so it leaves
// retrieval and reclaims embedding storage, and dismiss its now-duplicate active
// expiry records (active is the only schedulable state). The KnowledgeItem row +
// content stay for version history.
//
// Both rows are locked FOR UPDATE in id order before the supersede check, so two
// concurrent supersedes of the same pair can't cross-archive each other (or
// re-stamp an already-superseded predecessor) — the loser re-reads, sees a
// non-null supersededAt, and bails. Returns false when nothing was archived.
//
// Exported (and transaction-client-scoped) so the backfill script can reuse the
// exact same locked logic without standing up the Nest container.
export async function archiveWithinTx(
  tx: Prisma.TransactionClient,
  predecessorId: string,
  successorId: string,
): Promise<boolean> {
  await tx.$executeRawUnsafe(
    `SELECT id FROM "knowledge_items" WHERE id IN ($1, $2) ORDER BY id FOR UPDATE`,
    predecessorId,
    successorId,
  )
  const rows = await tx.knowledgeItem.findMany({
    where: { id: { in: [predecessorId, successorId] } },
    select: { id: true, version: true, supersededAt: true },
  })
  const pred = rows.find((r) => r.id === predecessorId)
  const succ = rows.find((r) => r.id === successorId)
  // Bail if either side is already superseded (lost the race) or missing.
  if (!pred || pred.supersededAt || !succ || succ.supersededAt) return false

  await tx.knowledgeItem.update({
    where: { id: predecessorId },
    data: { supersededAt: new Date(), supersededById: successorId },
  })
  await tx.knowledgeItem.update({
    where: { id: successorId },
    data: { version: pred.version + 1 },
  })
  await tx.searchableEntity.deleteMany({
    where: { entityType: 'knowledge_item', entityId: predecessorId },
  })
  // Chunks cascade off sections via FK.
  await tx.knowledgeSection.deleteMany({ where: { knowledgeItemId: predecessorId } })
  await tx.tabularRow.deleteMany({ where: { docId: predecessorId } })
  await tx.tabularColumn.deleteMany({ where: { docId: predecessorId } })
  await tx.checklist.deleteMany({ where: { knowledgeItemId: predecessorId } })
  await tx.expiryRecord.updateMany({
    where: { knowledgeItemId: predecessorId, status: 'active' },
    data: { status: 'dismissed' },
  })
  return true
}

// Jaccard similarity over alphanumeric title tokens. Returns 0 when either title
// is missing — an untitled doc can't be confidently matched as a new version.
export function titleOverlap(a: string | null, b: string | null): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let intersection = 0
  for (const t of ta) if (tb.has(t)) intersection++
  const union = ta.size + tb.size - intersection
  return union === 0 ? 0 : intersection / union
}

function tokenize(s: string | null): Set<string> {
  if (!s) return new Set()
  return new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? [])
}
