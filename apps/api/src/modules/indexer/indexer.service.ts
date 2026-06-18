import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import { EmbeddingsService } from '../embeddings/embeddings.service'

export type EntityType =
  | 'knowledge_item'
  | 'checklist_step'
  | 'venue_contact'
  | 'mock_supplier'
  | 'venue_profile'
  | 'chat_message'

export type IndexUpsertInput = {
  organizationId: string
  venueId?: string | null
  entityType: EntityType
  entityId: string
  subKey?: string
  embeddingText: string
  /// Pass when the caller already produced a 1024-dim vector for the same text
  /// to skip a redundant embed call. Voyage embed cost is non-trivial at scale.
  precomputedEmbedding?: number[]
  tags?: string[]
  kind?: string | null
  title?: string | null
  summary?: string | null
  metadata?: Record<string, unknown>
}

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name)

  constructor(private readonly embeddings: EmbeddingsService) {}

  async upsert(input: IndexUpsertInput): Promise<void> {
    const subKey = input.subKey ?? ''
    const vec =
      input.precomputedEmbedding ?? (await this.embeddings.embedDocument(input.embeddingText))

    if (vec.length !== 1024) {
      throw new Error(`indexer.upsert: expected 1024-dim embedding, got ${vec.length}`)
    }

    await prisma.$transaction(async (tx) => {
      await tx.searchableEntity.upsert({
        where: {
          entityType_entityId_subKey: {
            entityType: input.entityType,
            entityId: input.entityId,
            subKey,
          },
        },
        create: {
          organizationId: input.organizationId,
          venueId: input.venueId ?? null,
          entityType: input.entityType,
          entityId: input.entityId,
          subKey,
          embeddingText: input.embeddingText,
          tags: input.tags ?? [],
          kind: input.kind ?? null,
          title: input.title ?? null,
          summary: input.summary ?? null,
          metadata: (input.metadata ?? {}) as object,
        },
        update: {
          organizationId: input.organizationId,
          venueId: input.venueId ?? null,
          embeddingText: input.embeddingText,
          tags: input.tags ?? [],
          kind: input.kind ?? null,
          title: input.title ?? null,
          summary: input.summary ?? null,
          metadata: (input.metadata ?? {}) as object,
        },
      })
      await tx.$executeRawUnsafe(
        `UPDATE "searchable_entities"
            SET embedding = $1::vector
          WHERE "entityType" = $2 AND "entityId" = $3 AND "subKey" = $4`,
        `[${vec.join(',')}]`,
        input.entityType,
        input.entityId,
        subKey,
      )
    })

    this.logger.log(
      JSON.stringify({
        event: 'indexer.upsert',
        entityType: input.entityType,
        entityId: input.entityId,
        subKey,
        embeddingTextLength: input.embeddingText.length,
        tagCount: input.tags?.length ?? 0,
        precomputedEmbedding: !!input.precomputedEmbedding,
      }),
    )
  }

  async deleteEntity(entityType: EntityType, entityId: string): Promise<number> {
    const result = await prisma.searchableEntity.deleteMany({
      where: { entityType, entityId },
    })
    this.logger.log(
      JSON.stringify({
        event: 'indexer.delete_entity',
        entityType,
        entityId,
        deleted: result.count,
      }),
    )
    return result.count
  }

  async deleteOne(entityType: EntityType, entityId: string, subKey: string): Promise<number> {
    const result = await prisma.searchableEntity.deleteMany({
      where: { entityType, entityId, subKey },
    })
    return result.count
  }
}
