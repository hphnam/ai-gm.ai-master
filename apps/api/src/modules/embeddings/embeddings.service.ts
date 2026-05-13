import { Injectable, type OnModuleInit } from '@nestjs/common'
import { VoyageAIClient } from 'voyageai'
import { VOYAGE_EMBED_MODEL } from '../../types/section'

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private client!: VoyageAIClient

  onModuleInit() {
    const apiKey = process.env.VOYAGE_API_KEY
    if (!apiKey) {
      throw new Error('VOYAGE_API_KEY is not set — add it to .env at repo root')
    }
    this.client = new VoyageAIClient({ apiKey })
  }

  async embedText(text: string): Promise<number[]> {
    const response = await this.client.embed({
      model: VOYAGE_EMBED_MODEL,
      input: text,
      inputType: 'query',
    })
    return response.data![0].embedding!
  }

  async embedDocument(text: string): Promise<number[]> {
    // Plan 01-01 audit-M7 — synthetic-fail hook for probe-section W17 (embed_quality_degraded warn).
    // Gated by NODE_ENV !== 'production'; assertAuthEnv prod-fail backstops misuse.
    if (process.env.NODE_ENV !== 'production') {
      const ratio = Number(process.env.PROBE_VOYAGE_FAIL_RATIO ?? '0')
      if (ratio > 0 && Math.random() < ratio) {
        throw new Error('PROBE_VOYAGE_FAIL_RATIO synthetic failure')
      }
    }
    const response = await this.client.embed({
      model: VOYAGE_EMBED_MODEL,
      input: text,
      inputType: 'document',
    })
    return response.data![0].embedding!
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const response = await this.client.embed({
      model: VOYAGE_EMBED_MODEL,
      input: texts,
      inputType: 'document',
    })
    return response.data!.map((d) => d.embedding!)
  }

  /// Rerank a candidate set against a query using Voyage rerank-2.
  /// Returns indices into `documents` plus relevance scores, sorted by score desc.
  /// Indices stay aligned with the caller's array.
  async rerank(
    query: string,
    documents: string[],
    topK?: number,
  ): Promise<{ index: number; relevanceScore: number }[]> {
    if (documents.length === 0) return []
    const response = await this.client.rerank({
      model: 'rerank-2',
      query,
      documents,
      topK,
    })
    return (response.data ?? []).map((d) => ({
      index: d.index!,
      relevanceScore: d.relevanceScore!,
    }))
  }
}
