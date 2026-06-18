// Plan 06-01 Task 3 — search_docs shaped tool.
//
// Pure function. Wraps RetrievalService.find() (Phase 1 hybrid LATERAL JOIN
// section injection — preserved as a consumer, no edits to retrieval.service).
// Caps hits at 8 (lookup mode doesn't need 20). Filters by docType when
// provided. neighbors is ALWAYS [] in 06-01 — Phase 2 graph-readiness stub
// per CONTEXT.md D-06-H. Writer prompt references the field today; will be
// no-op until Phase 2 lands DocLink graph traversal.
//
// audit-M1 — orgId positional, from session/auth context. Never from body.
// audit-S8 — RetrievalService consumer contract preserved (runHybrid via
// public find() entry point; section injection byte-stable).

import { fail, ok, type ToolResult } from '../../../types'
import { RetrievalService } from '../../retrieval/retrieval.service'
import { chatCoreLogger, hashId, hashQuery } from '../log-helpers'

export type SearchDocsHit = {
  knowledgeItemId: string
  sectionId: string | null
  sectionTitle: string | null
  content: string
  similarity: number
}

export type SearchDocsResult = {
  hits: SearchDocsHit[]
  // Phase 2 graph-readiness stub (CONTEXT.md D-06-H). ALWAYS empty in 06-01.
  // When DocLink graph lands, populated from depth-1 traversal of hit docIds.
  // Writer prompt references this field today (will be no-op until then).
  neighbors: never[]
}

const MAX_HITS = 8

export async function searchDocs(
  query: string,
  filters: { docType?: string; venueId?: string },
  orgId: string,
  retrievalService: RetrievalService,
): Promise<ToolResult<SearchDocsResult>> {
  const t0 = Date.now()
  const trimmed = (query ?? '').trim()
  if (trimmed.length === 0) return fail('invalid-input', 'empty query')

  const result = await retrievalService.find(trimmed, {
    orgId,
    venueId: filters.venueId,
    limit: MAX_HITS,
    entityTypes: ['knowledge_item'],
    kinds: filters.docType ? [filters.docType] : undefined,
  })

  if (!result.ok) {
    chatCoreLogger.info('tool.search_docs', {
      orgId: hashId(orgId),
      query: hashQuery(trimmed),
      hitCount: 0,
      neighborCount: 0,
      latencyMs: Date.now() - t0,
      reason: result.reason,
    })
    return fail(result.reason, result.detail)
  }

  const hits: SearchDocsHit[] = result.data.map((h) => ({
    knowledgeItemId: h.entityId,
    sectionId: typeof h.metadata?.sectionId === 'string' ? (h.metadata.sectionId as string) : null,
    sectionTitle:
      typeof h.metadata?.sectionTitle === 'string' ? (h.metadata.sectionTitle as string) : h.title,
    content: h.content,
    similarity: h.similarity,
  }))

  chatCoreLogger.info('tool.search_docs', {
    orgId: hashId(orgId),
    query: hashQuery(trimmed),
    hitCount: hits.length,
    neighborCount: 0,
    latencyMs: Date.now() - t0,
  })

  // Phase 2 graph-readiness stub — neighbors: [] always. CONTEXT.md D-06-H.
  return ok({ hits, neighbors: [] as never[] })
}
