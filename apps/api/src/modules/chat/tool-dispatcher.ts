import { createHash } from 'node:crypto'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import {
  AGGREGATE_SECTION_TOKEN_BUDGET,
  fail,
  formatSectionPayload,
  ok,
  type ReportSpec,
  TOOL_INPUT_SCHEMAS,
  type ToolName,
  type ToolResult,
} from '../../types'
import { ChatCoreService } from '../chat-core/chat-core.service'
import { IncidentsService } from '../incidents/incidents.service'
import { IngestService } from '../ingest/ingest.service'
import { IntegrationRegistry } from '../integrations/integration-registry'
import { MockOpsService } from '../mock-ops/mock-ops.service'
import { PricingRecommendationsService } from '../pricing-recommendations/pricing-recommendations.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { ReportsService } from '../reports/reports.service'
import type { RetrievalHit } from '../retrieval/retrieval.service'
import { RetrievalService } from '../retrieval/retrieval.service'
import { ScheduledReportsService } from '../scheduled-reports/scheduled-reports.service'
import { TabularQueryService } from '../tabular/tabular.service'
import { TasksService } from '../tasks/tasks.service'
import { QuoteVerifierService } from './quote-verifier.service'

export type DispatchContext = {
  orgId: string
  userId: string
  userRole: string
  /// Where the turn originated. Threaded through to Notification.source on
  /// any rows we write from tool calls (currently leave_note_for_user). Defaults
  /// to 'chat' when the caller omits it — only WhatsApp-originated turns should
  /// override to 'whatsapp'. NOTE 2026-05-13: WhatsApp inbound currently flows
  /// through ChatCoreService, which uses its own tool pipeline — it never reaches
  /// this dispatcher today. Field kept so the contract is correct when/if a
  /// WhatsApp turn does route through chat-v1, and so the type forces future
  /// integrators to think about provenance.
  source?: 'chat' | 'whatsapp'
}

// In-memory sliding-window throttle for the leave_note_for_user tool. Single
// process / single node — sufficient for the current Nest server. If we scale
// horizontally swap this for a Redis token bucket. Kept module-scoped so the
// state survives request lifecycles.
const LEAVE_NOTE_WINDOW_MS = 60_000
const LEAVE_NOTE_LIMIT_PER_WINDOW = 5
const leaveNoteRateLimit = (() => {
  const buckets = new Map<string, number[]>()
  return {
    allow(authorUserId: string): boolean {
      const now = Date.now()
      const cutoff = now - LEAVE_NOTE_WINDOW_MS
      const recent = (buckets.get(authorUserId) ?? []).filter((t) => t > cutoff)
      if (recent.length >= LEAVE_NOTE_LIMIT_PER_WINDOW) {
        buckets.set(authorUserId, recent)
        return false
      }
      recent.push(now)
      buckets.set(authorUserId, recent)
      return true
    },
  }
})()

// Mirror of the controller-level throttle for the agent tool path so a
// jailbroken model can't bypass it by going through chat.
const SCHEDULE_REPORT_WINDOW_MS = 60_000
const SCHEDULE_REPORT_LIMIT_PER_WINDOW = 5
const scheduleReportRateLimit = (() => {
  const buckets = new Map<string, number[]>()
  return {
    allow(userId: string): boolean {
      const now = Date.now()
      const cutoff = now - SCHEDULE_REPORT_WINDOW_MS
      const recent = (buckets.get(userId) ?? []).filter((t) => t > cutoff)
      if (recent.length >= SCHEDULE_REPORT_LIMIT_PER_WINDOW) {
        buckets.set(userId, recent)
        return false
      }
      recent.push(now)
      buckets.set(userId, recent)
      return true
    },
  }
})()

@Injectable()
export class ToolDispatcher {
  private readonly logger = new Logger(ToolDispatcher.name)

  constructor(
    private readonly retrieval: RetrievalService,
    private readonly mockOps: MockOpsService,
    private readonly ingest: IngestService,
    private readonly verifier: QuoteVerifierService,
    private readonly tabular: TabularQueryService,
    private readonly chatCore: ChatCoreService,
    private readonly realtime: RealtimeGateway,
    private readonly tasks: TasksService,
    private readonly incidents: IncidentsService,
    private readonly integrations: IntegrationRegistry,
    private readonly reports: ReportsService,
    private readonly pricingRecommendations: PricingRecommendationsService,
    // forwardRef breaks the chat ↔ scheduled-reports module cycle:
    // ScheduledReportsModule's ReportGeneratorService injects ToolDispatcher,
    // and ToolDispatcher injects ScheduledReportsService. Both module imports
    // also use forwardRef.
    @Inject(forwardRef(() => ScheduledReportsService))
    private readonly scheduledReports: ScheduledReportsService,
  ) {}

  async dispatch(
    toolName: string,
    input: unknown,
    ctx?: DispatchContext,
  ): Promise<ToolResult<unknown>> {
    // Built-in tools live in the TOOL_INPUT_SCHEMAS map. Integration provider
    // tools (Square / future) live in IntegrationRegistry and require an
    // authenticated DispatchContext — they all read org-scoped data and we
    // never want a provider tool to slip through without an orgId.
    if (!(toolName in TOOL_INPUT_SCHEMAS)) {
      if (this.integrations.hasTool(toolName)) {
        if (!ctx) {
          return fail('error', `${toolName} requires an authenticated context`)
        }
        return this.integrations.dispatch(toolName, input, ctx)
      }
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
          // Telemetry only — surface a warning when the model fires find_knowledge
          // for a query that looks operational AND the org has at least one
          // active integration. The system prompt + tool description already
          // route those to pos_* tools; this log lets us track residual misroutes
          // without changing tool behaviour. No PII: orgId is hashed, query is
          // length-only.
          void this.flagPossibleIntegrationMisroute(i.query, ctx.orgId)
          const result = await this.retrieval.find(i.query, {
            orgId: ctx.orgId,
            userId: ctx.userId,
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
            select: { id: true, name: true },
          })
          if (!venue) return fail('error', 'venue not found in your organisation')
          const logger = await prisma.user.findUnique({
            where: { id: ctx.userId },
            select: { name: true },
          })
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
          // Fan-out to owners/managers. Awaited so a failure shows up in the
          // tool-call log; the service itself catches per-recipient errors so
          // a single bad bell delivery doesn't fail the whole tool call.
          await this.incidents.notifyEscalation({
            incidentId: incident.id,
            organizationId: ctx.orgId,
            venueId: i.venueId,
            venueName: venue.name,
            severity: i.severity,
            summary: i.summary,
            loggedByUserId: ctx.userId,
            loggedByName: logger?.name ?? null,
          })
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
          // before invoking the chat-core pipeline (it does its own check too).
          const venue = await prisma.venue.findFirst({
            where: { id: i.venueId, organizationId: ctx.orgId },
            select: { id: true },
          })
          if (!venue) return fail('error', 'venue not found in your organisation')
          try {
            // Use chat-core's full multi-agent pipeline as a sub-call. We
            // intentionally don't pass conversationId — the deep_research turn is
            // ephemeral; its output becomes a tool result the parent agent
            // composes into its final reply. Persistence + cost tracking happen
            // inside ChatCoreService against an isolated conversation row.
            const result = await this.chatCore.sendMessage(
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
        case 'leave_note_for_user': {
          if (!ctx) {
            return fail('error', 'leave_note_for_user requires an authenticated context')
          }
          const i = parsed.data as {
            recipientNameQuery?: string
            recipientUserId?: string
            body: string
          }
          // Per-author throttle. Prompt-injection from indexed knowledge could
          // otherwise drive the agent to mass-spam managers from a single
          // chat turn. Cap CREATE attempts (not lookups) at 5/min/author.
          if (!leaveNoteRateLimit.allow(ctx.userId)) {
            return fail(
              'error',
              'too many notes in a short window — slow down or compose from the bell menu',
            )
          }
          // Org-scoped member lookup. We resolve through OrganizationMember so a
          // cross-org User.id can't be addressed even if guessed. Name query
          // matches BOTH name and email so emails / last-name tokens work.
          const members = i.recipientUserId
            ? await prisma.organizationMember.findMany({
                where: { organizationId: ctx.orgId, userId: i.recipientUserId },
                select: {
                  userId: true,
                  role: true,
                  user: { select: { name: true, email: true } },
                },
                take: 1,
              })
            : await prisma.organizationMember.findMany({
                where: {
                  organizationId: ctx.orgId,
                  user: {
                    OR: [
                      { name: { contains: i.recipientNameQuery, mode: 'insensitive' } },
                      { email: { contains: i.recipientNameQuery, mode: 'insensitive' } },
                    ],
                  },
                },
                select: {
                  userId: true,
                  role: true,
                  user: { select: { name: true, email: true } },
                },
                take: 6,
              })
          if (members.length === 0) {
            return {
              ok: true,
              data: {
                status: 'no-match' as const,
                candidates: [] as Array<{ userId: string; name: string | null; role: string }>,
              },
            }
          }
          if (members.length > 1) {
            // Email intentionally NOT returned to the model: keeps the directory
            // enumeration primitive minimal. Name + role is enough for the user
            // to disambiguate; the agent re-calls with userId.
            return {
              ok: true,
              data: {
                status: 'needs-disambiguation' as const,
                candidates: members.map((m) => ({
                  userId: m.userId,
                  name: m.user.name,
                  role: m.role,
                })),
              },
            }
          }
          const target = members[0]
          // Don't let users leave notes for themselves via the agent — almost
          // always a misroute (the model misread "note to self" or echoed back
          // the speaker's own name).
          if (target.userId === ctx.userId) {
            return fail(
              'invalid-input',
              'cannot leave a note for yourself — confirm the intended recipient',
            )
          }
          const source = ctx.source ?? 'chat'
          const created = await prisma.notification.create({
            data: {
              organizationId: ctx.orgId,
              recipientUserId: target.userId,
              authorUserId: ctx.userId,
              source,
              category: 'chat',
              // Not automated — the user explicitly asked the assistant to
              // send this note on their behalf. The gm monogram in the
              // conversation view comes from `source === 'chat'` (viaAi),
              // not from this flag.
              automated: false,
              body: i.body,
            },
            select: {
              id: true,
              createdAt: true,
              author: { select: { id: true, name: true, email: true } },
              recipient: { select: { id: true, name: true, email: true } },
            },
          })
          this.logger.log(
            JSON.stringify({
              event: 'chat.leave_note_for_user',
              orgId: ctx.orgId,
              authorUserId: ctx.userId,
              recipientUserId: target.userId,
              notificationId: created.id,
              bodyLength: i.body.length,
            }),
          )
          const authorParty = created.author
            ? {
                id: created.author.id,
                name: created.author.name,
                email: created.author.email,
              }
            : null
          const recipientParty = {
            id: created.recipient.id,
            name: created.recipient.name,
            email: created.recipient.email,
          }
          const basePayload = {
            id: created.id,
            body: i.body,
            source,
            category: 'chat' as const,
            automated: false,
            reference: null,
            createdAt: created.createdAt.toISOString(),
            author: authorParty,
            recipient: recipientParty,
          }
          // Recipient gets the toast; author's other tabs/devices get a
          // silent refresh of their Sent view.
          this.realtime.emitNotificationCreated(target.userId, {
            ...basePayload,
            kind: 'received',
          })
          this.realtime.emitNotificationCreated(ctx.userId, {
            ...basePayload,
            kind: 'sent-confirmation',
          })
          return {
            ok: true,
            data: {
              status: 'created' as const,
              id: created.id,
              recipientName: target.user.name ?? target.user.email,
              recipientUserId: target.userId,
              createdAt: created.createdAt.toISOString(),
            },
          }
        }
        case 'create_task': {
          if (!ctx) {
            return fail('error', 'create_task requires an authenticated context')
          }
          const i = parsed.data as {
            body: string
            dueAt?: string
            assigneeNameQuery?: string
            assigneeUserId?: string
            category?: string
          }
          // Per-author throttle reuse — same window covers leave_note + tasks
          // since both are "agent writes a row addressed at another user". A
          // jailbroken prompt could otherwise drive the agent to spam tasks.
          if (!leaveNoteRateLimit.allow(ctx.userId)) {
            return fail(
              'error',
              'too many tasks in a short window — slow down or compose from the dashboard',
            )
          }
          // Role gate runs BEFORE the assignee membership lookup. Otherwise a
          // staff caller could probe membership by varying `assigneeUserId` and
          // comparing "not-a-member" (lookup fails) vs "staff-cannot-assign"
          // (role gate fails after a successful lookup). Wave 4 review-gate
          // fix. Self-assignment is the only allowed write for staff.
          const requestsCrossAssign =
            (i.assigneeUserId && i.assigneeUserId !== ctx.userId) ||
            i.assigneeNameQuery !== undefined
          if (requestsCrossAssign && ctx.userRole === 'staff') {
            return fail(
              'invalid-input',
              'staff can only set tasks for themselves — ask a manager or owner to assign someone else',
            )
          }
          // Resolve assignee. Default = self. Name-query may need disambiguation.
          let assigneeUserId = ctx.userId
          if (i.assigneeUserId) {
            const member = await prisma.organizationMember.findFirst({
              where: { organizationId: ctx.orgId, userId: i.assigneeUserId },
              select: { userId: true },
            })
            if (!member) {
              return fail('invalid-input', 'assigneeUserId is not a member of this organisation')
            }
            assigneeUserId = member.userId
          } else if (i.assigneeNameQuery) {
            const members = await prisma.organizationMember.findMany({
              where: {
                organizationId: ctx.orgId,
                user: {
                  OR: [
                    { name: { contains: i.assigneeNameQuery, mode: 'insensitive' } },
                    { email: { contains: i.assigneeNameQuery, mode: 'insensitive' } },
                  ],
                },
              },
              select: {
                userId: true,
                role: true,
                user: { select: { name: true, email: true } },
              },
              take: 6,
            })
            if (members.length === 0) {
              return {
                ok: true,
                data: {
                  status: 'no-match' as const,
                  candidates: [] as Array<{ userId: string; name: string | null; role: string }>,
                },
              }
            }
            if (members.length > 1) {
              return {
                ok: true,
                data: {
                  status: 'needs-disambiguation' as const,
                  candidates: members.map((m) => ({
                    userId: m.userId,
                    name: m.user.name,
                    role: m.role,
                  })),
                },
              }
            }
            assigneeUserId = members[0].userId
          }

          try {
            const row = await this.tasks.create(ctx.orgId, ctx.userId, {
              body: i.body,
              assigneeUserId,
              dueAt: i.dueAt ?? null,
              category: i.category ?? null,
              creatorRole:
                ctx.userRole === 'owner' || ctx.userRole === 'manager' || ctx.userRole === 'staff'
                  ? ctx.userRole
                  : null,
            })
            return {
              ok: true,
              data: {
                status: 'created' as const,
                id: row.id,
                body: row.body,
                dueAt: row.dueAt,
                status_value: row.status,
                assigneeName: row.assignee.name ?? row.assignee.email,
                assigneeUserId: row.assignee.userId,
              },
            }
          } catch (err) {
            const message = (err as Error).message ?? 'create_task failed'
            // Surface the role-gate failure as invalid-input with a clear
            // string so the agent can phrase it back: "you can only set
            // tasks for yourself — ask your manager to assign someone else".
            if (/staff-cannot-assign-to-others/.test(message)) {
              return fail(
                'invalid-input',
                'staff can only set tasks for themselves — ask a manager or owner to assign someone else',
              )
            }
            return fail('error', `create_task failed: ${message}`)
          }
        }
        case 'complete_task': {
          if (!ctx) {
            return fail('error', 'complete_task requires an authenticated context')
          }
          const i = parsed.data as { taskId: string }
          try {
            const row = await this.tasks.update(ctx.orgId, ctx.userId, i.taskId, {
              status: 'done',
            })
            return {
              ok: true,
              data: {
                id: row.id,
                status: row.status,
                completedAt: row.completedAt,
                body: row.body,
              },
            }
          } catch (err) {
            const message = (err as Error).message ?? 'unknown error'
            if (/task-not-found/.test(message)) return fail('not-found', 'task not found')
            if (/task-not-completable-by-creator/.test(message)) {
              return fail(
                'invalid-input',
                'only the assignee can mark a task done — you created it for someone else',
              )
            }
            if (/task-not-editable|task-not-visible/.test(message)) {
              return fail(
                'invalid-input',
                'you can only complete tasks assigned to you or that you created',
              )
            }
            return fail('error', `complete_task failed: ${message}`)
          }
        }
        case 'list_my_tasks': {
          if (!ctx) {
            return fail('error', 'list_my_tasks requires an authenticated context')
          }
          const i = parsed.data as {
            scope?: 'open' | 'overdue' | 'this_week' | 'all'
            limit?: number
          }
          const scope = i.scope ?? 'open'
          const limit = i.limit ?? 25
          // Pull the inbox via the service, then post-filter for overdue /
          // this_week so the service stays scope-agnostic.
          const result = await this.tasks.list(ctx.orgId, ctx.userId, {
            status: scope === 'all' ? 'all' : 'open',
            scope: 'mine',
            limit: 200,
          })
          const now = Date.now()
          const filtered = result.tasks.filter((t) => {
            if (scope === 'overdue') {
              return t.dueAt !== null && new Date(t.dueAt).getTime() < now
            }
            if (scope === 'this_week') {
              if (!t.dueAt) return false
              const due = new Date(t.dueAt).getTime()
              return due < now + 7 * 24 * 60 * 60 * 1000
            }
            return true
          })
          return {
            ok: true,
            data: {
              tasks: filtered.slice(0, limit).map((t) => ({
                id: t.id,
                body: t.body,
                dueAt: t.dueAt,
                status: t.status,
                category: t.category,
                assigneeName: t.assignee.name ?? t.assignee.email,
                creatorName: t.creator?.name ?? t.creator?.email ?? null,
                createdAt: t.createdAt,
              })),
              openCount: result.openCount,
              overdueCount: result.overdueCount,
              scope,
            },
          }
        }
        case 'generate_report': {
          if (!ctx) {
            return fail('error', 'generate_report requires an authenticated context')
          }
          const i = parsed.data as {
            venueId?: string | null
            title: string
            summary?: string
            spec: ReportSpec
          }
          try {
            const row = await this.reports.create({
              orgId: ctx.orgId,
              userId: ctx.userId,
              venueId: i.venueId ?? null,
              title: i.title,
              summary: i.summary ?? null,
              spec: i.spec,
            })
            return ok({
              id: row.id,
              title: row.title,
              summary: row.summary,
              venueId: row.venueId,
              spec: row.spec,
              createdAt: row.createdAt,
              url: `/reports/${row.id}`,
            })
          } catch (err) {
            const message = (err as Error).message ?? 'unknown'
            if (message === 'venue-not-in-org') {
              return fail('invalid-input', 'venue-not-in-org')
            }
            return fail('error', `generate_report failed: ${message}`)
          }
        }
        case 'schedule_report': {
          if (!ctx) {
            return fail('error', 'schedule_report requires an authenticated context')
          }
          if (!scheduleReportRateLimit.allow(ctx.userId)) {
            return fail('error', 'rate-limited: too many schedule creations — try again shortly')
          }
          const i = parsed.data as {
            venueId?: string | null
            title: string
            summary?: string
            frequency: 'daily' | 'weekly' | 'monthly'
            hourOfDay?: number
            dayOfWeek?: number | null
            dayOfMonth?: number | null
            timezone?: string
            prompt?: string
          }
          try {
            const row = await this.scheduledReports.create({
              orgId: ctx.orgId,
              userId: ctx.userId,
              venueId: i.venueId ?? null,
              title: i.title,
              summary: i.summary ?? null,
              frequency: i.frequency,
              hourOfDay: i.hourOfDay,
              dayOfWeek: i.dayOfWeek ?? null,
              dayOfMonth: i.dayOfMonth ?? null,
              timezone: i.timezone,
              prompt: i.prompt ?? null,
            })
            return ok({
              id: row.id,
              title: row.title,
              frequency: row.frequency,
              nextRunAt: row.nextRunAt,
              hourOfDay: row.hourOfDay,
              dayOfWeek: row.dayOfWeek,
              dayOfMonth: row.dayOfMonth,
              timezone: row.timezone,
              status: row.status,
            })
          } catch (err) {
            const message = (err as Error).message ?? 'unknown'
            if (message === 'venue-not-in-org' || message === 'invalid-timezone') {
              return fail('invalid-input', message)
            }
            if (message === 'schedule-cap-reached') {
              return fail(
                'invalid-input',
                'schedule-cap-reached: org has hit the 50 live-schedule limit — cancel one before adding another',
              )
            }
            // Log internally; the model should not see Prisma / driver text.
            this.logger.error(
              JSON.stringify({ event: 'schedule_report.error', message, orgId: ctx.orgId }),
            )
            return fail('error', 'schedule_report failed — please retry shortly')
          }
        }
        case 'list_scheduled_reports': {
          if (!ctx) {
            return fail('error', 'list_scheduled_reports requires an authenticated context')
          }
          const i = parsed.data as {
            status?: 'active' | 'paused' | 'cancelled' | 'all'
            limit?: number
          }
          const { items: rows } = await this.scheduledReports.list(ctx.orgId, {
            status: i.status ?? 'active',
            limit: i.limit ?? 25,
          })
          return ok({
            schedules: rows.map((r) => ({
              id: r.id,
              title: r.title,
              summary: r.summary,
              frequency: r.frequency,
              hourOfDay: r.hourOfDay,
              dayOfWeek: r.dayOfWeek,
              dayOfMonth: r.dayOfMonth,
              timezone: r.timezone,
              status: r.status,
              nextRunAt: r.nextRunAt,
              lastRunAt: r.lastRunAt,
              runCount: r.runCount,
              venueId: r.venueId,
            })),
          })
        }
        case 'pause_scheduled_report':
        case 'resume_scheduled_report':
        case 'cancel_scheduled_report': {
          if (!ctx) {
            return fail('error', `${toolName} requires an authenticated context`)
          }
          const i = parsed.data as { scheduleId: string }
          try {
            const row =
              toolName === 'pause_scheduled_report'
                ? await this.scheduledReports.pause(ctx.orgId, i.scheduleId)
                : toolName === 'resume_scheduled_report'
                  ? await this.scheduledReports.resume(ctx.orgId, i.scheduleId)
                  : await this.scheduledReports.cancel(ctx.orgId, i.scheduleId)
            return ok({
              id: row.id,
              title: row.title,
              status: row.status,
              nextRunAt: row.nextRunAt,
            })
          } catch (err) {
            const message = (err as Error).message ?? 'unknown'
            if (message === 'not-found') return fail('not-found', message)
            this.logger.error(
              JSON.stringify({ event: `${toolName}.error`, message, orgId: ctx.orgId }),
            )
            return fail('error', `${toolName} failed — please retry shortly`)
          }
        }
        case 'record_pricing_recommendation': {
          if (!ctx) {
            return fail('error', 'record_pricing_recommendation requires an authenticated context')
          }
          // Mirror the controller-level role gate. Pricing decisions are an
          // owner / manager activity; staff users shouldn't be able to seed
          // the review queue via the agent, even though the queue is read-only
          // surfacing on the dashboard.
          if (ctx.userRole !== 'owner' && ctx.userRole !== 'manager') {
            return fail('invalid-input', 'only managers or owners can log pricing recommendations')
          }
          // Reuse the per-author throttle so a jailbroken prompt can't flood
          // the review queue. Same window as leave_note / create_task.
          if (!leaveNoteRateLimit.allow(ctx.userId)) {
            return fail('error', 'too many pricing recommendations in a short window — slow down')
          }
          const i = parsed.data as {
            venueId: string
            sourceItemRef: string
            sourceItemLabel: string
            currentPriceCents: number
            recommendedPriceCents: number
            rationale: string
          }
          try {
            const row = await this.pricingRecommendations.create(ctx.orgId, {
              venueId: i.venueId,
              sourceItemRef: i.sourceItemRef,
              sourceItemLabel: i.sourceItemLabel,
              currentPriceCents: i.currentPriceCents,
              recommendedPriceCents: i.recommendedPriceCents,
              rationale: i.rationale,
            })
            // rationale + venueId in the response so the chat tool-card can
            // render the why and so adopt/dismiss mutations know which venue
            // cache to invalidate without an extra round-trip.
            return ok({
              id: row.id,
              status: row.status,
              venueId: row.venueId,
              sourceItemLabel: row.sourceItemLabel,
              currentPriceCents: row.currentPriceCents,
              recommendedPriceCents: row.recommendedPriceCents,
              rationale: row.rationale,
            })
          } catch (err) {
            const message = (err as Error).message ?? 'unknown'
            if (/invalid-venue/.test(message)) {
              return fail('invalid-input', 'venue-not-in-org')
            }
            return fail('error', `record_pricing_recommendation failed: ${message}`)
          }
        }
        case 'present_checklist': {
          if (!ctx) {
            return fail('error', 'present_checklist requires an authenticated context')
          }
          const i = parsed.data as { checklistId?: string; intent?: string }
          if (i.checklistId) {
            const row = await prisma.checklist.findFirst({
              where: { id: i.checklistId, organizationId: ctx.orgId },
              select: { id: true, title: true, steps: true, knowledgeItemId: true },
            })
            if (!row) return fail('not-found', 'checklist not found in this org')
            return ok({
              checklistId: row.id,
              knowledgeItemId: row.knowledgeItemId,
              title: row.title,
              steps: normaliseChecklistSteps(row.steps),
            })
          }
          // Intent fallback — reuse the chat-core fuzzy matcher.
          const { getChecklist } = await import('../chat-core/tools/get-checklist.tool')
          const result = await getChecklist(i.intent ?? '', ctx.orgId, null, prisma)
          if (!result.ok) return result
          return ok({
            checklistId: result.data.checklistId,
            knowledgeItemId: result.data.knowledgeItemId,
            title: result.data.title,
            steps: result.data.steps.map((s) => ({ index: s.index, content: s.content })),
          })
        }
      }
    } catch (err) {
      const message = (err as Error).message ?? 'unknown dispatcher error'
      this.logger.error(JSON.stringify({ event: 'tool_dispatch.error', tool: toolName, message }))
      return fail('error', message)
    }
  }

  /**
   * Surfaces residual integration-misroutes — when the agent fires
   * find_knowledge for a query that overlaps with what a connected integration
   * (Square / accounting / etc) could answer authoritatively. Telemetry-only:
   * the system prompt + tool description already steer toward pos_* tools, so
   * this never rewrites the call — it just logs so we can spot regressions in
   * source priority. PII-safe: org hashed, query length only. Fire-and-forget;
   * never blocks the user-facing tool.
   */
  private async flagPossibleIntegrationMisroute(query: string, orgId: string): Promise<void> {
    // Multi-word / high-signal phrases only. Bare single words like "stock"
    // ("stock take SOP"), "shift" ("shift handover"), "refund" ("refund
    // policy"), "gross" ("gross misconduct"), or "payment" ("card payment
    // SOP") all false-positive against legitimate KB intents — those drown
    // the warning channel. The phrases below are the ones a numeric/live
    // question actually uses; policy/procedure questions phrase differently.
    const OPS_PATTERN =
      /\b(takings|revenue|cogs|cost of goods|gross sales|net sales|order count|best ?sellers?|top items?|tender mix|cash vs card|average ticket|tips? (?:this|today|yesterday|last)|refund rate|refund total|labou?r cost|payroll|wages? (?:this|today|yesterday|last)|hourly breakdown|busiest hour|who(?:'?s| is) (?:on shift|working|clocked)|active shifts|stock (?:count|level|on hand|left)|inventory (?:count|level|on hand)|how much .{1,30} (?:do we have|left|in stock))\b/i
    if (!OPS_PATTERN.test(query)) return
    try {
      // Only POS-domain providers cover the keywords above today. When an
      // accounting / CRM domain provider lands with its own ops surface (Xero
      // for COGS, etc), extend the domain list. Without this filter, "stock"
      // queries on a Xero-only org would log a false misroute.
      const posProviderIds = this.integrations.listProviderIdsByDomain('pos')
      if (posProviderIds.length === 0) return
      const hit = await prisma.integration.findFirst({
        where: {
          organizationId: orgId,
          status: 'active',
          provider: { in: posProviderIds },
        },
        select: { provider: true },
      })
      if (!hit) return
      this.logger.warn(
        JSON.stringify({
          event: 'tool_dispatcher.integration_misroute_candidate',
          tool: 'find_knowledge',
          orgIdHash: createHash('sha256').update(orgId).digest('hex').slice(0, 16),
          activeProvider: hit.provider,
          queryLength: query.length,
        }),
      )
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'tool_dispatcher.misroute_check_failed',
          message: (err as Error).message,
        }),
      )
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
    let droppedForBudget = 0

    // Walk hits in relevance order and enforce AGGREGATE_SECTION_TOKEN_BUDGET.
    // Drop the lowest-ranked sections that would push the running total over
    // budget — keeps the model's input window predictable even when
    // TOP_SECTIONS_PER_KI=2 surfaces multiple long sections per doc. We always
    // keep at least one hit even if it busts the budget alone (better partial
    // context than none). Non-section hits (contacts, steps) cost a rough
    // content-length/4 token estimate.
    const formatted: RetrievalHit[] = []
    for (const hit of sorted) {
      const sectionId = hit.metadata.sectionId as string | undefined | null
      const sectionTitle = hit.metadata.sectionTitle as string | undefined | null
      const sectionTokenCount =
        typeof hit.metadata.sectionTokenCount === 'number' ? hit.metadata.sectionTokenCount : 0
      const estimatedCost = sectionId
        ? sectionTokenCount
        : Math.ceil((hit.content?.length ?? 0) / 4)

      const wouldExceed =
        formatted.length > 0 &&
        aggregateSectionTokens + estimatedCost > AGGREGATE_SECTION_TOKEN_BUDGET
      if (wouldExceed) {
        droppedForBudget++
        continue
      }

      aggregateSectionTokens += estimatedCost
      if (sectionId) {
        sectionInjectedHits++
        formatted.push({
          ...hit,
          content: formatSectionPayload({
            sectionId,
            sectionTitle: sectionTitle ?? null,
            content: hit.content,
          }),
        })
      } else {
        if (hit.entityType === 'knowledge_item') kiContentFallbackHits++
        formatted.push(hit)
      }
    }

    const orgIdHash = createHash('sha256').update(orgId).digest('hex').slice(0, 16)

    this.logger.log(
      JSON.stringify({
        event: 'tool_dispatcher.find_knowledge_formatted',
        totalHits: formatted.length,
        sectionInjectedHits,
        kiContentFallbackHits,
        aggregateSectionTokens,
        droppedForBudget,
        budget: AGGREGATE_SECTION_TOKEN_BUDGET,
        deterministicSortKey: 'similarity_desc_sectionId_asc',
        orgIdHash,
      }),
    )

    if (droppedForBudget > 0) {
      this.logger.warn(
        JSON.stringify({
          event: 'tool_dispatcher.section_budget_enforced',
          droppedForBudget,
          aggregateSectionTokens,
          budget: AGGREGATE_SECTION_TOKEN_BUDGET,
          keptHits: formatted.length,
          orgIdHash,
        }),
      )
    }

    return { ok: true, data: formatted }
  }
}

// Mirror of the step normalisation in chat-core/tools/get-checklist — the JSON
// blob on Checklist.steps may use { index, text } or { index, content }; we
// surface { index, content } to the client.
function normaliseChecklistSteps(raw: unknown): Array<{ index: number; content: string }> {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s, i) => {
      const obj = (s ?? {}) as Record<string, unknown>
      const index = typeof obj.index === 'number' ? obj.index : i
      const content =
        typeof obj.text === 'string' ? obj.text : typeof obj.content === 'string' ? obj.content : ''
      return { index, content }
    })
    .filter((s) => s.content.trim().length > 0)
    .sort((a, b) => a.index - b.index)
}
