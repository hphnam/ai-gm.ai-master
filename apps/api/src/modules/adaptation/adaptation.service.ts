import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import {
  type CaptureFeedbackInput,
  CaptureFeedbackInputSchema,
  DRAIN_SOFT_DEADLINE_MS,
  type EnqueueReTagInput,
  EnqueueReTagInputSchema,
  type FeedbackKind,
  LOW_SIM_THRESHOLD,
  MAX_DRAIN_LIMIT,
  MAX_ENQUEUE_PER_FEEDBACK,
  MAX_RETAG_ATTEMPTS,
} from '../../types'
import { IngestService } from '../ingest/ingest.service'

const ACTIVE_STATUSES = ['queued', 'processing'] as const

export type CaptureFeedbackResult =
  | {
      ok: true
      feedbackId: string
      enqueuedCount: number
      dedupedCount: number
      exhaustedCount: number
    }
  | { ok: false; reason: 'invalid-input' | 'message-not-found' | 'not-assistant-message' }

export type EnqueueReTagResult =
  | { enqueued: true; queueItemId: string }
  | { enqueued: false; deduped?: boolean; exhausted?: boolean }

export type ProcessReTagQueueResult = {
  processed: number
  failed: number
  deduped: number
  remainingQueued: number
  elapsedMs: number
}

type FindKnowledgeHit = { id: string; similarity: number }

@Injectable()
export class AdaptationService {
  private readonly logger = new Logger(AdaptationService.name)

  constructor(private readonly ingestService: IngestService) {}

  async captureFeedback(
    input: CaptureFeedbackInput,
    orgId: string,
  ): Promise<CaptureFeedbackResult> {
    const parsed = CaptureFeedbackInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, reason: 'invalid-input' }
    }
    const { messageId, kind, userFeedback } = parsed.data

    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        conversation: { venue: { organizationId: orgId } },
      },
      select: { id: true, role: true, retrievedItemIds: true },
    })
    if (!message) return { ok: false, reason: 'message-not-found' }
    if (message.role !== 'assistant') return { ok: false, reason: 'not-assistant-message' }

    const existing = await prisma.messageFeedback.findUnique({
      where: { messageId },
      select: { id: true, kind: true },
    })
    const isKindTransition = existing !== null && existing.kind !== kind

    const feedback = await prisma.messageFeedback.upsert({
      where: { messageId },
      create: { messageId, kind, userFeedback: userFeedback ?? null },
      update: { kind, userFeedback: userFeedback ?? null },
      select: { id: true },
    })

    this.logger.log(
      JSON.stringify({
        event: 'adaptation.feedback_captured',
        messageId,
        kind,
        userFeedbackLength: userFeedback?.length ?? 0,
        isKindTransition,
      }),
    )

    let enqueuedCount = 0
    let dedupedCount = 0
    let exhaustedCount = 0

    if (kind === 'down' || kind === 'regenerate') {
      const total = message.retrievedItemIds.length
      const targets = message.retrievedItemIds.slice(0, MAX_ENQUEUE_PER_FEEDBACK)
      if (total > MAX_ENQUEUE_PER_FEEDBACK) {
        this.logger.warn(
          JSON.stringify({
            event: 'adaptation.feedback_enqueue_capped',
            messageId,
            total,
            enqueued: MAX_ENQUEUE_PER_FEEDBACK,
          }),
        )
      }
      const reason = kind === 'down' ? 'thumbs-down' : 'regeneration'
      for (const knowledgeItemId of targets) {
        const result = await this.enqueueReTag({
          knowledgeItemId,
          reason,
          sourceMessageId: messageId,
        })
        if (result.enqueued) enqueuedCount += 1
        else if (result.deduped) dedupedCount += 1
        else if (result.exhausted) exhaustedCount += 1
      }
    }

    return { ok: true, feedbackId: feedback.id, enqueuedCount, dedupedCount, exhaustedCount }
  }

  async enqueueReTag(input: EnqueueReTagInput): Promise<EnqueueReTagResult> {
    const parsed = EnqueueReTagInputSchema.safeParse(input)
    if (!parsed.success) return { enqueued: false }
    const { knowledgeItemId, reason, sourceMessageId } = parsed.data

    const knowledge = await prisma.knowledgeItem.findUnique({
      where: { id: knowledgeItemId },
      select: { id: true },
    })
    if (!knowledge) {
      this.logger.warn(
        JSON.stringify({
          event: 'adaptation.retag_missing_knowledge',
          knowledgeItemId,
          reason,
        }),
      )
      return { enqueued: false }
    }

    const lastFailed = await prisma.reTagQueueItem.findFirst({
      where: { knowledgeItemId, status: 'failed' },
      orderBy: { updatedAt: 'desc' },
      select: { attempts: true, lastError: true },
    })
    if (lastFailed && lastFailed.attempts >= MAX_RETAG_ATTEMPTS) {
      this.logger.warn(
        JSON.stringify({
          event: 'adaptation.retag_attempts_exhausted',
          knowledgeItemId,
          attempts: lastFailed.attempts,
          lastError: lastFailed.lastError?.slice(0, 100) ?? null,
        }),
      )
      return { enqueued: false, exhausted: true }
    }

    const active = await prisma.reTagQueueItem.findFirst({
      where: { knowledgeItemId, status: { in: [...ACTIVE_STATUSES] } },
      select: { id: true },
    })
    if (active) {
      this.logger.log(
        JSON.stringify({
          event: 'adaptation.retag_deduped',
          knowledgeItemId,
          existingId: active.id,
          reason,
        }),
      )
      return { enqueued: false, deduped: true }
    }

    const created = await prisma.reTagQueueItem.create({
      data: {
        knowledgeItemId,
        reason,
        status: 'queued',
        attempts: 0,
        sourceMessageId: sourceMessageId ?? null,
      },
      select: { id: true },
    })
    this.logger.log(
      JSON.stringify({
        event: 'adaptation.retag_enqueued',
        queueItemId: created.id,
        knowledgeItemId,
        reason,
        sourceMessageId: sourceMessageId ?? null,
      }),
    )
    return { enqueued: true, queueItemId: created.id }
  }

  async captureRetrievalOutcome(input: {
    assistantMessageId: string
    toolCallLog: unknown[]
    retrievedItemIds: string[]
  }): Promise<void> {
    try {
      const { assistantMessageId, toolCallLog, retrievedItemIds } = input

      const findKnowledgeEntries = toolCallLog.filter((e) => {
        if (!e || typeof e !== 'object') return false
        const entry = e as Record<string, unknown>
        return entry.tool === 'find_knowledge'
      })
      if (findKnowledgeEntries.length === 0) return

      let topSimilarity: number | null = null
      for (const e of findKnowledgeEntries) {
        const entry = e as Record<string, unknown>
        const result = entry.result
        if (!result || typeof result !== 'object') continue
        const r = result as Record<string, unknown>
        if (r.ok !== true) continue
        if (!Array.isArray(r.data) || r.data.length === 0) continue
        const first = r.data[0] as Partial<FindKnowledgeHit> | undefined
        if (!first || typeof first.similarity !== 'number') continue
        topSimilarity = first.similarity
        break
      }

      if (topSimilarity === null) {
        const firstEntry = findKnowledgeEntries[0] as Record<string, unknown>
        this.logger.warn(
          JSON.stringify({
            event: 'adaptation.retrieval_outcome_shape_unknown',
            assistantMessageId,
            entryCount: toolCallLog.length,
            unexpectedKeys: Object.keys(firstEntry ?? {}).slice(0, 10),
          }),
        )
        return
      }

      if (topSimilarity >= LOW_SIM_THRESHOLD) return

      const targets = retrievedItemIds.slice(0, MAX_ENQUEUE_PER_FEEDBACK)
      let enqueuedCount = 0
      let dedupedCount = 0
      let exhaustedCount = 0
      for (const id of targets) {
        const result = await this.enqueueReTag({
          knowledgeItemId: id,
          reason: 'low-similarity',
          sourceMessageId: assistantMessageId,
        })
        if (result.enqueued) enqueuedCount += 1
        else if (result.deduped) dedupedCount += 1
        else if (result.exhausted) exhaustedCount += 1
      }

      this.logger.log(
        JSON.stringify({
          event: 'adaptation.low_similarity_captured',
          messageId: assistantMessageId,
          topSimilarity,
          itemCount: targets.length,
          enqueuedCount,
          dedupedCount,
          exhaustedCount,
        }),
      )
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          event: 'adaptation.capture_error',
          assistantMessageId: input.assistantMessageId,
          error: String(err).slice(0, 200),
        }),
      )
    }
  }

  async processReTagQueue(
    opts: { limit?: number; deadlineMs?: number } = {},
  ): Promise<ProcessReTagQueueResult> {
    const limit = Math.max(1, Math.min(MAX_DRAIN_LIMIT, opts.limit ?? 10))
    const deadlineMs = opts.deadlineMs ?? DRAIN_SOFT_DEADLINE_MS
    const startedAt = Date.now()

    let processed = 0
    let failed = 0
    let deduped = 0

    const claimed = await prisma.reTagQueueItem.findMany({
      where: { status: 'queued' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: { id: true, knowledgeItemId: true },
    })

    for (const row of claimed) {
      if (Date.now() - startedAt >= deadlineMs) {
        this.logger.warn(
          JSON.stringify({
            event: 'adaptation.drain_deadline_reached',
            elapsedMs: Date.now() - startedAt,
            processed,
            failed,
            deduped,
          }),
        )
        break
      }

      const claim = await prisma.reTagQueueItem.updateMany({
        where: { id: row.id, status: 'queued' },
        data: { status: 'processing', updatedAt: new Date() },
      })
      if (claim.count !== 1) {
        deduped += 1
        continue
      }

      const knowledge = await prisma.knowledgeItem.findUnique({
        where: { id: row.knowledgeItemId },
        select: { id: true, content: true, venueId: true, organizationId: true },
      })
      if (!knowledge) {
        await prisma.reTagQueueItem.update({
          where: { id: row.id },
          data: {
            status: 'failed',
            attempts: { increment: 1 },
            lastError: 'knowledge-item-not-found',
            updatedAt: new Date(),
          },
        })
        failed += 1
        this.logger.error(
          JSON.stringify({
            event: 'adaptation.retag_failed',
            id: row.id,
            knowledgeItemId: row.knowledgeItemId,
            error: 'knowledge-item-not-found',
          }),
        )
        continue
      }

      try {
        await this.ingestService.ingest({
          id: knowledge.id,
          content: knowledge.content,
          organizationId: knowledge.organizationId,
          venueId: knowledge.venueId,
        })
        await prisma.reTagQueueItem.update({
          where: { id: row.id },
          data: { status: 'processed', updatedAt: new Date() },
        })
        processed += 1
        this.logger.log(
          JSON.stringify({
            event: 'adaptation.retag_processed',
            id: row.id,
            knowledgeItemId: row.knowledgeItemId,
          }),
        )
      } catch (err) {
        await prisma.reTagQueueItem.update({
          where: { id: row.id },
          data: {
            status: 'failed',
            attempts: { increment: 1 },
            lastError: String(err).slice(0, 500),
            updatedAt: new Date(),
          },
        })
        failed += 1
        this.logger.error(
          JSON.stringify({
            event: 'adaptation.retag_failed',
            id: row.id,
            knowledgeItemId: row.knowledgeItemId,
            error: String(err).slice(0, 200),
          }),
        )
      }
    }

    const remainingQueued = await prisma.reTagQueueItem.count({ where: { status: 'queued' } })
    const elapsedMs = Date.now() - startedAt

    this.logger.log(
      JSON.stringify({
        event: 'adaptation.drain_summary',
        processed,
        failed,
        deduped,
        remainingQueued,
        elapsedMs,
        limit,
        deadlineMs,
      }),
    )

    return { processed, failed, deduped, remainingQueued, elapsedMs }
  }
}

export type { FeedbackKind }
