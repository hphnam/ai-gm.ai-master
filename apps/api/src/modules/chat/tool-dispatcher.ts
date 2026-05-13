import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import {
  AGGREGATE_SECTION_TOKEN_BUDGET,
  fail,
  formatSectionPayload,
  TOOL_INPUT_SCHEMAS,
  type ToolName,
  type ToolResult,
} from '../../types'
import { ChatV2Service } from '../chat-v2/chat-v2.service'
import { IngestService } from '../ingest/ingest.service'
import { MockOpsService } from '../mock-ops/mock-ops.service'
import type { RetrievalHit } from '../retrieval/retrieval.service'
import { RetrievalService } from '../retrieval/retrieval.service'
import { TabularQueryService } from '../tabular/tabular.service'
import { QuoteVerifierService } from './quote-verifier.service'

export type DispatchContext = {
  orgId: string
  userId: string
  userRole: string
}

@Injectable()
export class ToolDispatcher {
  private readonly logger = new Logger(ToolDispatcher.name)

  constructor(
    private readonly retrieval: RetrievalService,
    private readonly mockOps: MockOpsService,
    private readonly ingest: IngestService,
    private readonly verifier: QuoteVerifierService,
    private readonly tabular: TabularQueryService,
    private readonly chatV2: ChatV2Service,
  ) {}

  async dispatch(
    toolName: string,
    input: unknown,
    ctx?: DispatchContext,
  ): Promise<ToolResult<unknown>> {
    if (!(toolName in TOOL_INPUT_SCHEMAS)) {
      return fail('not-supported', `tool: ${toolName}`)
    }
    const schema = TOOL_INPUT_SCHEMAS[toolName as ToolName]
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return fail(
        'error',
        `invalid input for ${toolName}: ${parsed.error.issues[0]?.message ?? 'zod error'}`,
      )
    }
    try {
      switch (toolName as ToolName) {
        case 'find_knowledge': {
          if (!ctx) {
            return fail('error', 'find_knowledge requires an authenticated context')
          }
          const i = parsed.data as {
            query: string
            venueId?: string
            limit?: number
            minSimilarity?: number
            entityTypes?: Array<
              | 'knowledge_item'
              | 'checklist_step'
              | 'venue_contact'
              | 'mock_supplier'
              | 'venue_profile'
              | 'chat_message'
            >
            tags?: string[]
            recencyDays?: number
            kinds?: string[]
            includePending?: boolean
            crossVenue?: boolean
          }
          const result = await this.retrieval.find(i.query, {
            orgId: ctx.orgId,
            venueId: i.venueId,
            limit: i.limit,
            minSimilarity: i.minSimilarity,
            entityTypes: i.entityTypes,
            tags: i.tags,
            recencyDays: i.recencyDays,
            kinds: i.kinds,
            includePending: i.includePending,
            crossVenue: i.crossVenue,
          })
          if (!result.ok) return result
          const expanded = await this.expandChecklistStepHits(result.data, ctx.orgId)
          return this.applyFindKnowledgeFormat(expanded, ctx.orgId)
        }
        case 'get_stock_below_par':
          return await this.mockOps.getStockBelowPar((parsed.data as { venueId: string }).venueId)
        case 'get_stock_by_name': {
          const i = parsed.data as { venueId: string; name: string }
          return await this.mockOps.getStockByName(i.venueId, i.name)
        }
        case 'get_supplier_by_name':
          return await this.mockOps.getSupplierByName((parsed.data as { name: string }).name)
        case 'get_upcoming_cutoffs': {
          const i = parsed.data as { venueId: string; withinHours?: number }
          return await this.mockOps.getUpcomingCutoffs(i.venueId, i.withinHours)
        }
        case 'log_incident': {
          if (!ctx) {
            return fail('error', 'log_incident requires an authenticated context')
          }
          const i = parsed.data as {
            venueId: string
            summary: string
            severity: 'minor' | 'major' | 'critical'
            details?: Record<string, unknown>
          }
          const venue = await prisma.venue.findFirst({
            where: { id: i.venueId, organizationId: ctx.orgId },
            select: { id: true },
          })
          if (!venue) return fail('error', 'venue not found in your organisation')
          const incident = await prisma.incidentLog.create({
            data: {
              organizationId: ctx.orgId,
              venueId: i.venueId,
              loggedByUserId: ctx.userId,
              severity: i.severity,
              summary: i.summary,
              details: (i.details ?? {}) as object,
              status: 'open',
            },
            select: { id: true, severity: true, createdAt: true },
          })
          this.logger.warn(
            JSON.stringify({
              event: 'chat.log_incident',
              incidentId: incident.id,
              orgId: ctx.orgId,
              venueId: i.venueId,
              userId: ctx.userId,
              severity: incident.severity,
              summaryLength: i.summary.length,
            }),
          )
          return {
            ok: true,
            data: {
              id: incident.id,
              severity: incident.severity,
              createdAt: incident.createdAt.toISOString(),
            },
          }
        }
        case 'update_stock': {
          if (!ctx) {
            return fail('error', 'update_stock requires an authenticated context')
          }
          const i = parsed.data as {
            venueId: string
            name: string
            setQty?: number
            deltaQty?: number
            note?: string
          }
          if (i.setQty === undefined && i.deltaQty === undefined) {
            return fail('error', 'either setQty or deltaQty is required')
          }
          const venue = await prisma.venue.findFirst({
            where: { id: i.venueId, organizationId: ctx.orgId },
            select: { id: true },
          })
          if (!venue) return fail('error', 'venue not found in your organisation')
          const matches = await prisma.mockStock.findMany({
            where: {
              venueId: i.venueId,
              name: { contains: i.name, mode: 'insensitive' },
            },
            select: { id: true, name: true, currentQty: true, parLevel: true, unit: true },
            take: 2,
          })
          if (matches.length === 0) {
            return fail('no-data', `no stock item at this venue matching "${i.name}"`)
          }
          if (matches.length > 1) {
            return fail(
              'no-data',
              `ambiguous match for "${i.name}" — be more specific (e.g. add brand)`,
            )
          }
          const target = matches[0]
          const current = Number(target.currentQty)
          const par = Number(target.parLevel)
          const newQty =
            i.setQty !== undefined ? i.setQty : Math.max(0, current + (i.deltaQty ?? 0))
          await prisma.mockStock.update({
            where: { id: target.id },
            data: { currentQty: newQty },
          })
          this.logger.log(
            JSON.stringify({
              event: 'chat.update_stock',
              orgId: ctx.orgId,
              venueId: i.venueId,
              userId: ctx.userId,
              stockId: target.id,
              previous: current,
              next: newQty,
              delta: newQty - current,
              note: i.note ?? null,
            }),
          )
          return {
            ok: true,
            data: {
              id: target.id,
              name: target.name,
              previousQty: current,
              newQty,
              parLevel: par,
              unit: target.unit,
              belowPar: newQty < par,
            },
          }
        }
        case 'add_supplier_note': {
          if (!ctx) {
            return fail('error', 'add_supplier_note requires an authenticated context')
          }
          if (ctx.userRole !== 'owner' && ctx.userRole !== 'manager') {
            return fail('error', 'only managers or owners can add supplier notes')
          }
          const i = parsed.data as { supplierName: string; note: string }
          const matches = await prisma.mockSupplier.findMany({
            where: { name: { contains: i.supplierName, mode: 'insensitive' } },
            select: { id: true, name: true, notes: true },
            take: 2,
          })
          if (matches.length === 0)
            return fail('no-data', `no supplier matching "${i.supplierName}"`)
          if (matches.length > 1) {
            return fail('no-data', `ambiguous match for "${i.supplierName}" — be more specific`)
          }
          const target = matches[0]
          const stamp = new Date().toISOString().slice(0, 10)
          const appended = `[${stamp}] ${i.note.trim()}`
          const newNotes = target.notes ? `${target.notes}\n${appended}` : appended
          await prisma.mockSupplier.update({
            where: { id: target.id },
            data: { notes: newNotes },
          })
          this.logger.log(
            JSON.stringify({
              event: 'chat.add_supplier_note',
              orgId: ctx.orgId,
              userId: ctx.userId,
              supplierId: target.id,
              noteLength: i.note.length,
            }),
          )
          return {
            ok: true,
            data: { id: target.id, name: target.name, notes: newNotes },
          }
        }
        case 'verify_quote': {
          if (!ctx) {
            return fail('error', 'verify_quote requires an authenticated context')
          }
          const i = parsed.data as { draft: string; sourceIds: string[] }
          const result = await this.verifier.verify(i.draft, i.sourceIds, ctx.orgId)
          return { ok: true, data: result }
        }
        case 'record_kb_gap': {
          if (!ctx) {
            return fail('error', 'record_kb_gap requires an authenticated context')
          }
          const i = parsed.data as {
            question: string
            tentativeAnswer?: string
            venueId: string | null
          }
          if (i.venueId) {
            const venue = await prisma.venue.findFirst({
              where: { id: i.venueId, organizationId: ctx.orgId },
              select: { id: true },
            })
            if (!venue) {
              return fail('error', 'venue not found in your organisation')
            }
          }
          const result = await this.ingest.recordGap({
            question: i.question,
            tentativeAnswer: i.tentativeAnswer ?? null,
            organizationId: ctx.orgId,
            venueId: i.venueId,
            askedByUserId: ctx.userId,
            sourceMessageId: null,
          })
          this.logger.log(
            JSON.stringify({
              event: 'chat.record_kb_gap',
              gapId: result.id,
              orgId: ctx.orgId,
              venueId: i.venueId,
              userId: ctx.userId,
              askCount: result.askCount,
              dedupedFromExisting: result.dedupedFromExisting,
            }),
          )
          return { ok: true, data: result }
        }
        case 'save_knowledge_doc': {
          if (!ctx) {
            return fail('error', 'save_knowledge_doc requires an authenticated context')
          }
          if (ctx.userRole !== 'owner' && ctx.userRole !== 'manager') {
            return fail('error', 'only managers or owners can save knowledge docs')
          }
          const i = parsed.data as {
            title: string
            content: string
            venueId: string | null
          }
          if (i.venueId) {
            const venue = await prisma.venue.findFirst({
              where: { id: i.venueId, organizationId: ctx.orgId },
              select: { id: true },
            })
            if (!venue) {
              return fail('error', 'venue not found in your organisation')
            }
          }
          const result = await this.ingest.ingest({
            title: i.title,
            content: i.content,
            organizationId: ctx.orgId,
            venueId: i.venueId,
          })
          const tags = Array.isArray(result.metadata.tags)
            ? (result.metadata.tags as unknown[]).filter((t): t is string => typeof t === 'string')
            : []
          const docType =
            typeof result.metadata.docType === 'string' ? result.metadata.docType : null
          this.logger.log(
            JSON.stringify({
              event: 'chat.save_knowledge_doc',
              docId: result.id,
              venueId: i.venueId,
              userId: ctx.userId,
              orgId: ctx.orgId,
              titleLen: i.title.length,
              contentLen: i.content.length,
            }),
          )
          return {
            ok: true,
            data: {
              id: result.id,
              summary: result.aiSummary,
              tags,
              docType,
            },
          }
        }
        case 'query_document_table': {
          if (!ctx) {
            return fail('error', 'query_document_table requires an authenticated context')
          }
          // TabularQueryService re-validates the input against TabularQueryInputSchema
          // (defence-in-depth — chat-tools.ts schema is the agent-facing contract;
          // tabular.service is the canonical security boundary). It also enforces
          // the cross-org guard via knowledge_items JOIN.
          const queryInput = parsed.data as {
            docId?: string
          } & Record<string, unknown>

          // Resolve a starting docId. The agent may omit docId when it doesn't
          // know which tabular doc holds the answer — pick the most recent
          // tabular doc and let auto-widen iterate the rest if it misses.
          let startingDocId = queryInput.docId
          if (!startingDocId) {
            const seed = await prisma.knowledgeItem.findFirst({
              where: {
                organizationId: ctx.orgId,
                tabularColumns: { some: {} },
              },
              select: { id: true },
              orderBy: { updatedAt: 'desc' },
            })
            if (!seed) {
              return fail('not-found', 'no tabular documents available in this organization')
            }
            startingDocId = seed.id
          }

          // Auto-widen — if the chosen doc has no matching rows or doesn't even
          // carry the referenced columns, try other tabular docs in the org.
          // Bounded at 10 candidates. Result selection priority:
          //   1. ok with rows > 0 (the answer)  → return immediately
          //   2. ok with rows = 0               → keep as fallback
          //   3. fail invalid-input / not-supported → only if nothing better
          // Prevents a stray column-mismatch on one doc from being surfaced
          // when another doc returned a clean empty result.
          const others = await prisma.knowledgeItem.findMany({
            where: {
              organizationId: ctx.orgId,
              id: { not: startingDocId },
              tabularColumns: { some: {} },
            },
            select: { id: true },
            orderBy: { updatedAt: 'desc' },
            take: 10,
          })
          const candidateDocs = [startingDocId, ...others.map((d) => d.id)]

          type TabularResult = Awaited<ReturnType<typeof this.tabular.query>>
          let hit: TabularResult | null = null
          let cleanMiss: TabularResult | null = null
          let firstFailure: TabularResult | null = null
          let resolvedDocId = startingDocId
          let attempts = 0

          for (const docId of candidateDocs) {
            attempts += 1
            const r = await this.tabular.query(ctx.orgId, { ...queryInput, docId })
            if (r.ok && r.data.rowCount > 0) {
              hit = r
              resolvedDocId = docId
              break
            }
            if (r.ok && r.data.rowCount === 0 && !cleanMiss) {
              cleanMiss = r
              resolvedDocId = docId
              continue
            }
            if (!r.ok && !firstFailure) {
              firstFailure = r
            }
          }

          const result: TabularResult =
            hit ??
            cleanMiss ??
            firstFailure ??
            fail('not-found', 'no tabular documents available in this organization')

          this.logger.log(
            JSON.stringify({
              event: 'tool_dispatcher.query_document_table',
              ok: result.ok,
              orgIdHash: createHash('sha256').update(ctx.orgId).digest('hex').slice(0, 12),
              userId: ctx.userId,
              // PII-safe: counts only — never row content / column names.
              rowsReturned: result.ok ? result.data.rowCount : 0,
              truncated: result.ok ? result.data.truncated : false,
              reason: result.ok ? null : result.reason,
              attempts,
              fellBack: resolvedDocId !== startingDocId,
              docIdSupplied: !!queryInput.docId,
            }),
          )
          return result
        }
        case 'deep_research': {
          if (!ctx) {
            return fail('error', 'deep_research requires an authenticated context')
          }
          const i = parsed.data as { venueId: string; question: string }
          // Cross-tenant guard mirrors find_knowledge: confirm venue belongs to ctx.orgId
          // before invoking the chat-v2 pipeline (it does its own check too).
          const venue = await prisma.venue.findFirst({
            where: { id: i.venueId, organizationId: ctx.orgId },
            select: { id: true },
          })
          if (!venue) return fail('error', 'venue not found in your organisation')
          try {
            // Use chat-v2's full multi-agent pipeline as a sub-call. We
            // intentionally don't pass conversationId — the deep_research turn is
            // ephemeral; its output becomes a tool result the parent agent
            // composes into its final reply. Persistence + cost tracking happen
            // inside ChatV2Service against an isolated conversation row.
            const result = await this.chatV2.sendMessage(
              { venueId: i.venueId, userMessage: i.question },
              {
                orgId: ctx.orgId,
                userId: ctx.userId,
                userRole: ctx.userRole,
                userIdentity: { name: null, email: '' },
              },
            )
            this.logger.log(
              JSON.stringify({
                event: 'tool_dispatch.deep_research.complete',
                orgId: ctx.orgId,
                venueId: i.venueId,
                questionLength: i.question.length,
                contentLength: result.assistantMessage.content.length,
                retrievedItemCount: result.retrievedItemIds.length,
              }),
            )
            return {
              ok: true,
              data: {
                synthesis: result.assistantMessage.content,
                retrievedItemIds: result.retrievedItemIds,
              },
            }
          } catch (err) {
            const message = (err as Error).message ?? 'deep_research pipeline error'
            this.logger.warn(
              JSON.stringify({
                event: 'tool_dispatch.deep_research.failed',
                orgId: ctx.orgId,
                venueId: i.venueId,
                message,
              }),
            )
            return fail('error', `deep_research failed: ${message}`)
          }
        }
      }
    } catch (err) {
      const message = (err as Error).message ?? 'unknown dispatcher error'
      this.logger.error(JSON.stringify({ event: 'tool_dispatch.error', tool: toolName, message }))
      return fail('error', message)
    }
  }

  /**
   * Tactical fix pass — when find_knowledge surfaces individual checklist_step
   * hits, top-K truncation drops sibling steps and similarity-ordering across
   * sibling docs causes two checklists to interleave. Both make the model
   * hallucinate gaps and mix sources. This collapses step hits into ONE
   * synthesized "full checklist" hit per turn:
   *   1. Group step hits by metadata.checklistId
   *   2. Pick the winning checklist (most hits, tie-break by max score)
   *   3. Fetch the parent Checklist from DB (org-scoped) for ordered steps
   *   4. Emit a single knowledge_item-typed hit carrying the whole list
   *   5. Drop ALL other checklist_step hits (winning + losing)
   * Non-checklist_step hits pass through untouched.
   */
  private async expandChecklistStepHits(
    hits: RetrievalHit[],
    orgId: string,
  ): Promise<RetrievalHit[]> {
    const stepHits = hits.filter((h) => h.entityType === 'checklist_step')
    if (stepHits.length === 0) return hits

    const byChecklist = new Map<string, RetrievalHit[]>()
    for (const h of stepHits) {
      const cid = h.metadata.checklistId as string | undefined
      if (!cid) continue
      const arr = byChecklist.get(cid) ?? []
      arr.push(h)
      byChecklist.set(cid, arr)
    }
    if (byChecklist.size === 0) return hits

    let winnerId = ''
    let winnerHits: RetrievalHit[] = []
    let winnerMaxScore = -Infinity
    for (const [cid, arr] of byChecklist) {
      const maxScore = Math.max(...arr.map((h) => h.score))
      const beats =
        arr.length > winnerHits.length ||
        (arr.length === winnerHits.length && maxScore > winnerMaxScore)
      if (beats) {
        winnerId = cid
        winnerHits = arr
        winnerMaxScore = maxScore
      }
    }

    const checklist = await prisma.checklist.findFirst({
      where: { id: winnerId, organizationId: orgId },
      select: { id: true, title: true, steps: true, knowledgeItemId: true },
    })
    if (!checklist) {
      this.logger.warn(
        JSON.stringify({
          event: 'tool_dispatcher.checklist_expand_missing',
          checklistIdHash: createHash('sha256').update(winnerId).digest('hex').slice(0, 16),
        }),
      )
      return hits.filter((h) => h.entityType !== 'checklist_step')
    }

    const steps = Array.isArray(checklist.steps)
      ? (checklist.steps as Array<Record<string, unknown>>)
      : []
    const ordered = [...steps].sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0))
    const lines = ordered.map((s) => {
      const idx = Number(s.index) || 0
      const text = String(s.text ?? '').trim()
      const hint =
        typeof s.hint === 'string' && s.hint.trim().length > 0 ? ` (${s.hint.trim()})` : ''
      return `${idx + 1}. ${text}${hint}`
    })
    const content = `${checklist.title}\n\n${lines.join('\n')}`

    const synthesized: RetrievalHit = {
      id: `synth-checklist-${checklist.id}`,
      entityType: 'knowledge_item',
      entityId: checklist.knowledgeItemId,
      subKey: '',
      content,
      title: checklist.title,
      summary: null,
      tags: winnerHits[0]?.tags ?? [],
      kind: 'checklist',
      metadata: {
        checklistId: checklist.id,
        knowledgeItemId: checklist.knowledgeItemId,
        synthesizedFrom: 'checklist_step',
        stepCount: ordered.length,
        contributingHits: winnerHits.length,
      },
      aiSummary: null,
      similarity: Math.max(...winnerHits.map((h) => h.similarity)),
      score: winnerMaxScore,
      matchedBy: winnerHits[0]?.matchedBy ?? ['vector'],
    }

    this.logger.log(
      JSON.stringify({
        event: 'tool_dispatcher.checklist_expanded',
        stepCount: ordered.length,
        contributingHits: winnerHits.length,
        droppedSiblingChecklists: byChecklist.size - 1,
        orgIdHash: createHash('sha256').update(orgId).digest('hex').slice(0, 16),
      }),
    )

    return [synthesized, ...hits.filter((h) => h.entityType !== 'checklist_step')]
  }

  /**
   * Plan 01-03 — wrap find_knowledge hits with the byte-stable section payload
   * prefix (audit-S7 from 01-02 release) and aggregate-token telemetry (audit-M3).
   * Returns a NEW ToolResult; does not mutate the input array.
   *
   * Sort order: similarity DESC, sectionId ASC tie-break (within-run deterministic).
   * Hits without metadata.sectionId pass through unchanged (AC-5 fallback path
   * from 01-02 — pre-backfill KIs continue to surface ki.content without prefix
   * so the prefix presence signals "section was injected" to consumers).
   */
  private applyFindKnowledgeFormat(
    hits: RetrievalHit[],
    orgId: string,
  ): ToolResult<RetrievalHit[]> {
    // ECMAScript Array.sort has been stable since ES2019. similarity DESC,
    // tie-break sectionId ASC — round to 6 decimals so Voyage 5th-decimal
    // drift doesn't reshuffle order on byte-identical re-runs.
    const sorted = [...hits].sort((a, b) => {
      const aSim = Math.round(a.similarity * 1_000_000)
      const bSim = Math.round(b.similarity * 1_000_000)
      if (aSim !== bSim) return bSim - aSim
      const aId = (a.metadata.sectionId as string | undefined | null) ?? ''
      const bId = (b.metadata.sectionId as string | undefined | null) ?? ''
      return aId.localeCompare(bId)
    })

    let sectionInjectedHits = 0
    let kiContentFallbackHits = 0
    let aggregateSectionTokens = 0

    const formatted: RetrievalHit[] = sorted.map((hit) => {
      const sectionId = hit.metadata.sectionId as string | undefined | null
      const sectionTitle = hit.metadata.sectionTitle as string | undefined | null
      const sectionTokenCount =
        typeof hit.metadata.sectionTokenCount === 'number' ? hit.metadata.sectionTokenCount : 0

      if (sectionId) {
        sectionInjectedHits++
        aggregateSectionTokens += sectionTokenCount
        return {
          ...hit,
          content: formatSectionPayload({
            sectionId,
            sectionTitle: sectionTitle ?? null,
            content: hit.content,
          }),
        }
      } else if (hit.entityType === 'knowledge_item') {
        kiContentFallbackHits++
      }
      return hit
    })

    const orgIdHash = createHash('sha256').update(orgId).digest('hex').slice(0, 16)

    this.logger.log(
      JSON.stringify({
        event: 'tool_dispatcher.find_knowledge_formatted',
        totalHits: formatted.length,
        sectionInjectedHits,
        kiContentFallbackHits,
        aggregateSectionTokens,
        deterministicSortKey: 'similarity_desc_sectionId_asc',
        orgIdHash,
      }),
    )

    if (aggregateSectionTokens > AGGREGATE_SECTION_TOKEN_BUDGET) {
      this.logger.warn(
        JSON.stringify({
          event: 'tool_dispatcher.section_budget_exceeded',
          aggregateSectionTokens,
          budget: AGGREGATE_SECTION_TOKEN_BUDGET,
          hitCount: formatted.length,
          orgIdHash,
        }),
      )
    }

    return { ok: true, data: formatted }
  }
}
