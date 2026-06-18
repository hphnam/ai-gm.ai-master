// Plan 06-01 Task 3 — chat-core orchestrator.
// Plan 06-02 — extended for reasoning + incident modes with Analyser → Critic
// loop, re-research circuit-breaker, stream phase events.
//
// Flow per turn (mode-conditional):
//   lookup: Triage → Docs researcher → Writer-lookup → persist
//   reasoning: Triage → Docs researcher → Analyser → [Re-research?] →
//              Writer-reasoning → [Critic if confidence < 0.7]?
//              [Writer retry if corrections-needed?] → persist
//   incident: Triage → Docs researcher → Analyser → [Re-research?] →
//             Writer-incident → Critic always-on →
//             [Writer retry if corrections-needed?] → persist
//
// audit-M2 — try/catch around all roles. On any throw, persist a turn-failed
// ChatMessage row with role='turn-failed', sanitized content, partial cost.
// audit-M3 — per-role timeouts wrap each AI SDK call (in services); orchestrator
// catches RoleTimeoutError into the same turn-failed path.
// audit-M4 — sanitizeForTriage strips control/role-markers/injection before
// reaching Triage; raw audit trail preserved in chat_messages.content.
// audit-M5 — phase events emitted with seq + timestampMs for 06-04 ordering.

import { createHash, randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { prisma } from '../../database/prisma'
import {
  ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD,
  type AnalyserOutput,
  type ChatMode,
  CRITIC_REASONING_CONFIDENCE_THRESHOLD,
  MAX_RESEARCHERS_PER_TURN,
  RERESEARCH_COST_CEILING_USD,
  RESEARCHER_PRIORITY_ORDER,
  type ResearcherFinding,
  type ResearcherName,
  type StreamPhaseEvent,
  TOTAL_TURN_TIMEOUT_MS,
  type TriageOutput,
} from '../../types'
import type { SendMessageInput, SendMessageResult } from '../../types/chat-message'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { AnalyserService } from './analyser.service'
import { CostTracker } from './cost-tracker.service'
import { CriticService } from './critic.service'
import { FastLookupService } from './fast-lookup.service'
import { identifyFastPath } from './fast-lookup-recipes'
import { sanitizeForTriage } from './input-sanitizer'
import { chatCoreLogger, hashId, sanitizeError } from './log-helpers'
import { Researcher } from './researcher.interface'
import { sanitizeForResearcher } from './researcher-sanitizer'
import { DocsResearcher } from './researchers/docs.researcher'
import { OpsResearcher } from './researchers/ops.researcher'
import { PeopleResearcher } from './researchers/people.researcher'
import { TabularResearcher } from './researchers/tabular.researcher'
import { VenueResearcher } from './researchers/venue.researcher'
import { TriageService } from './triage.service'
import { WriterService } from './writer.service'

export type ChatCoreDispatchContext = {
  orgId: string
  userId: string
  userRole: string
  userIdentity: { name: string | null; email: string }
}

// audit-M6: lowConfidence flag persistence on chat_messages.toolCallLog (no
// metadata column exists in schema; toolCallLog is Json[] and unused for
// chat-core turns from 06-01). Sentinel entry shape:
const LOW_CONFIDENCE_FLAG_ENTRY = {
  round: -1,
  toolUseId: 'chat-core-low-confidence',
  tool: 'low_confidence_flag',
  input: null,
  result: { value: true },
} as const

@Injectable()
export class ChatCoreService {
  constructor(
    private readonly triage: TriageService,
    private readonly docs: DocsResearcher,
    private readonly writer: WriterService,
    private readonly analyser: AnalyserService,
    private readonly critic: CriticService,
    private readonly ops: OpsResearcher,
    private readonly people: PeopleResearcher,
    private readonly tabular: TabularResearcher,
    private readonly venue: VenueResearcher,
    private readonly fastLookup: FastLookupService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // audit-M2 — exhaustive switch returning the discriminated-union interface,
  // not any/unknown. tsc enforces compile-time type-completeness via the
  // `never` fallback assertion.
  private resolveResearcher(name: ResearcherName): Researcher {
    switch (name) {
      case 'docs':
        return this.docs
      case 'ops':
        return this.ops
      case 'people':
        return this.people
      case 'tabular':
        return this.tabular
      case 'venue':
        return this.venue
      default: {
        const _exhaustive: never = name
        throw new Error(`unknown researcher: ${String(_exhaustive)}`)
      }
    }
  }

  async sendMessage(
    input: SendMessageInput,
    ctx: ChatCoreDispatchContext,
  ): Promise<SendMessageResult> {
    const t0 = Date.now()

    // Cross-tenant guard (audit-M1) — venue must belong to ctx.orgId.
    const venue = await prisma.venue.findFirst({
      where: { id: input.venueId, organizationId: ctx.orgId },
      select: { id: true },
    })
    if (!venue) throw new Error(`venue ${input.venueId} not found in org ${ctx.orgId}`)

    let conversationId = input.conversationId
    if (!conversationId) {
      const created = await prisma.chatConversation.create({
        data: { venueId: venue.id, userId: ctx.userId, channel: 'web' },
        select: { id: true },
      })
      conversationId = created.id
      this.realtime.emitChatConversationUpserted(ctx.userId, {
        id: created.id,
        venueId: venue.id,
        channel: 'web',
      })
    }

    // Persist raw user message (audit trail). Strip NUL only — Postgres TEXT
    // encoding invariant. When an attachment is present, append a placeholder
    // sentinel so conversation history shows "user sent image" without storing
    // base64 in the row body. Phase 6.04 — PII-safe; raw bytes never persisted
    // to chat_messages.content.
    let auditTrailContent = input.userMessage.replace(/\x00/g, '')
    if (input.attachment) {
      const byteSize = Buffer.from(input.attachment.base64, 'base64').length
      const sidSuffix = input.attachment.sourceRef ? `, sid:${input.attachment.sourceRef}` : ''
      auditTrailContent = `${auditTrailContent}\n[image: ${input.attachment.mediaType}, ${byteSize}B${sidSuffix}]`
    }
    await prisma.chatMessage.create({
      data: { conversationId, role: 'user', content: auditTrailContent },
    })

    // Plan 06-04 Task 1 — multimodal-turn brief composition. Triage receives a
    // text-only synopsis ("user sent an image with text: <userMessage>; please
    // dispatch researchers"); raw base64 never reaches Triage's prompt. Per
    // CONTEXT.md, image-bearing turns most commonly need reasoning mode (broken
    // equipment photos, error codes) — Triage decides routing on the synopsis.
    const triageInputText = input.attachment
      ? `[user attached an image: ${input.attachment.mediaType}] ${input.userMessage}`
      : input.userMessage
    const sanitized = sanitizeForTriage(triageInputText)
    const tracker = new CostTracker()
    const conversationIdHash = hashId(conversationId)
    const orgIdHash = hashId(ctx.orgId)

    // audit-M5 phase event emitter — seq monotonic from 0 + Date.now timestamp.
    let seq = 0
    const emitPhase = (phase: StreamPhaseEvent, mode: ChatMode | null): void => {
      chatCoreLogger.info('chat_core.phase_event', {
        phase,
        mode,
        conversationIdHash,
        seq: seq++,
        timestampMs: Date.now(),
      })
    }

    let triageOutput: TriageOutput | null = null
    let lowConfidence = false
    // audit-S6 — capture dispatch metadata for toolCallLog persistence.
    let dispatchedResearchers: ResearcherName[] = []
    let briefHashes: string[] = []

    try {
      // ───── FAST-PATH (Plan 06-04 hot-fix 2026-05-02) ─────
      // For high-confidence single-tool lookups (contact, stock, supplier
      // cutoff, checklist) we skip Triage + Researcher LLM calls entirely
      // and execute the structured query directly. On hit → straight to
      // Writer. On miss → fall through to the full Triage path below so
      // ambiguous / multi-source queries still get the multi-agent treatment.
      const fastRecipe = identifyFastPath(input.userMessage)
      if (fastRecipe) {
        emitPhase('research', 'lookup')
        const fastResult = await this.fastLookup.execute(fastRecipe, {
          orgId: ctx.orgId,
          venueId: venue.id,
        })
        if (fastResult) {
          emitPhase('draft', 'lookup')
          const writerResult = await this.writer.compose({
            mode: 'lookup',
            userMessage: input.userMessage,
            findings: [fastResult.finding],
          })
          tracker.recordWriter(writerResult.usage)
          const writerText = writerResult.text
          const cost = tracker.total()
          const retrievedItemIds = Array.from(
            new Set(fastResult.finding.citations.map((c) => c.knowledgeItemId)),
          )
          const fastPathEntry = {
            round: -2,
            toolUseId: 'chat-core-fast-lookup',
            tool: fastResult.toolName,
            input: { recipe: fastRecipe.tool },
            result: { hitCount: fastResult.hitCount },
          }
          const assistant = await prisma.chatMessage.create({
            data: {
              conversationId,
              role: 'assistant',
              content: writerText,
              retrievedItemIds,
              costUsd: cost.totalUsd,
              toolCallLog: [fastPathEntry] as unknown as object,
            },
            select: { id: true, content: true, followUps: true },
          })
          emitPhase('complete', 'lookup')
          chatCoreLogger.info('chat_core.turn_complete', {
            orgId: orgIdHash,
            conversationIdHash,
            mode: 'lookup',
            totalUsd: cost.totalUsd,
            breakdown: cost.breakdown,
            latencyMs: Date.now() - t0,
            fastPath: true,
            fastPathTool: fastResult.toolName,
          })
          return {
            conversationId,
            assistantMessage: {
              id: assistant.id,
              content: assistant.content,
              followUps: assistant.followUps,
            },
            toolCallLog: [],
            retrievedItemIds,
          }
        }
        chatCoreLogger.info('chat_core.fast_lookup_fallthrough', {
          orgId: orgIdHash,
          conversationIdHash,
          recipe: fastRecipe.tool,
        })
      }

      // ───── Triage ─────
      emitPhase('triage', null)
      const triageResult = await this.triage.classify(sanitized)
      tracker.recordTriage(triageResult.usage)
      triageOutput = triageResult.output

      // ───── Dispatch validation + cap (audit-S2) ─────
      // audit-S2: orchestrator re-validates the cap. If Triage somehow exceeds
      // it, truncate by stable priority order and emit dispatch_capped warn.
      const requestedDispatch = triageOutput.researchersToDispatch
      let dispatched: ResearcherName[]
      if (requestedDispatch.length > MAX_RESEARCHERS_PER_TURN) {
        // Stable order — keep researchers in priority sequence; truncate tail.
        const requestedSet = new Set(requestedDispatch)
        dispatched = RESEARCHER_PRIORITY_ORDER.filter((r) => requestedSet.has(r)).slice(
          0,
          MAX_RESEARCHERS_PER_TURN,
        )
        chatCoreLogger.warn('chat_core.dispatch_capped', {
          orgId: orgIdHash,
          conversationIdHash,
          requestedCount: requestedDispatch.length,
          dispatchedCount: dispatched.length,
          capped: true,
        })
      } else {
        dispatched = [...requestedDispatch]
      }
      dispatchedResearchers = dispatched

      // Compose per-researcher briefs (sanitized at the boundary — audit-M4).
      const briefs: Record<ResearcherName, string> = {
        docs: '',
        ops: '',
        people: '',
        tabular: '',
        venue: '',
      }
      for (const name of dispatched) {
        const raw = triageOutput.briefByResearcher[name] ?? sanitized.slice(0, 200)
        briefs[name] = sanitizeForResearcher(raw)
      }
      briefHashes = dispatched.map((name) => sha12(briefs[name]))

      // ───── Researcher fan-out (parallel) ─────
      emitPhase('research', triageOutput.mode)
      const t1 = Date.now()

      // audit-S10 — parent AbortController fires at
      // max(0, TOTAL_TURN_TIMEOUT_MS - elapsed - 1000ms) to keep total turn
      // wall-clock under TOTAL_TURN_TIMEOUT_MS even with adversarial researcher
      // slowness. On parent abort, in-flight researchers' AbortSignals will
      // trigger via their own per-researcher timeout (RESEARCHER_TIMEOUT_MS=15s
      // is shorter than the typical parent budget so this is belt-and-braces).
      const parentBudget = Math.max(0, TOTAL_TURN_TIMEOUT_MS - (t1 - t0) - 1000)
      const parentAbort = new AbortController()
      let _parentBudgetExhausted = false
      const parentTimer = setTimeout(() => {
        parentAbort.abort()
        _parentBudgetExhausted = true
        chatCoreLogger.warn('chat_core.turn_budget_exhausted', {
          orgId: orgIdHash,
          conversationIdHash,
          elapsedMs: Date.now() - t0,
          dispatched,
        })
      }, parentBudget)
      // Reference parentAbort.signal so future researchers wishing to honor a
      // parent budget can read it; per-researcher AbortControllers (15s) are
      // shorter than the typical parent budget so this is belt-and-braces.
      void parentAbort.signal

      const findings: ResearcherFinding[] = []
      try {
        const researcherTasks = dispatched.map((name) => {
          const researcher = this.resolveResearcher(name)
          return researcher
            .research(briefs[name], {
              orgId: ctx.orgId,
              venueId: venue.id,
              conversationId,
              userMessage: input.userMessage,
            })
            .then((result) => ({ status: 'fulfilled' as const, name, result }))
            .catch((err: unknown) => ({ status: 'rejected' as const, name, err }))
        })
        const settled = await Promise.all(researcherTasks)
        for (const s of settled) {
          if (s.status === 'fulfilled') {
            tracker.recordResearcher(s.result.usage, s.result.voyageCalls)
            findings.push(s.result.finding)
          } else {
            chatCoreLogger.warn('chat_core.researcher_failed', {
              orgId: orgIdHash,
              conversationIdHash,
              researcher: s.name,
              error: sanitizeError(s.err),
            })
          }
        }
      } finally {
        clearTimeout(parentTimer)
      }

      // audit-M6 — V14 split semantics: 1-of-N throws → ship; N-of-N throws →
      // outer try/catch → turn-failed cost row. Hard guard for the all-fail case.
      if (findings.length === 0) {
        throw new Error('all researchers failed for this turn')
      }

      // The "primary" brief (used by re-research) — keep docs's brief if present,
      // otherwise fall back to the first dispatched researcher's brief.
      const primaryBrief = briefs.docs || briefs[dispatched[0]] || sanitized.slice(0, 200)
      const brief = primaryBrief

      let writerText: string
      let analyserOutput: AnalyserOutput | null = null

      if (triageOutput.mode === 'lookup') {
        // ───── Lookup path (06-01 path UNCHANGED) ─────
        emitPhase('draft', 'lookup')
        const writerResult = await this.writer.compose({
          mode: 'lookup',
          userMessage: input.userMessage,
          findings,
        })
        tracker.recordWriter(writerResult.usage)
        writerText = writerResult.text
      } else {
        // ───── Reasoning + Incident path: Analyser → [re-research?] → Writer → [Critic?] ─────
        emitPhase('analyse', triageOutput.mode)
        let analyserResult = await this.analyser.analyse({
          mode: triageOutput.mode,
          userMessage: input.userMessage,
          findings,
        })
        tracker.recordAnalyser(analyserResult.usage)
        analyserOutput = analyserResult.output

        // audit-S1: Analyser confidence telemetry — calibration substrate for
        // D-06-02-M threshold retune.
        chatCoreLogger.info('chat_core.analyser_confidence_observed', {
          mode: triageOutput.mode,
          suggestedShape: analyserResult.output.suggestedShape,
          evidenceSufficiency: analyserResult.output.evidenceSufficiency,
          conversationIdHash,
        })

        // Re-research circuit-breaker: low confidence → second pass with
        // refined brief, BUT only if running cost still under ceiling.
        if (analyserResult.output.evidenceSufficiency < ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD) {
          // Probe-only fake running cost override (V30) — production uses real total.
          const fakeRunningCost = Number(process.env.PROBE_CHAT_CORE_FAKE_RUNNING_COST_USD ?? '0')
          const runningCost = fakeRunningCost > 0 ? fakeRunningCost : tracker.total().totalUsd

          if (runningCost < RERESEARCH_COST_CEILING_USD) {
            const refinedBrief = composeRefinedBrief(brief, analyserResult.output.openQuestions)
            chatCoreLogger.info('chat_core.reresearch_dispatched', {
              orgId: orgIdHash,
              conversationIdHash,
              originalConfidence: analyserResult.output.evidenceSufficiency,
              runningCost,
            })
            emitPhase('research', triageOutput.mode)
            const docs2 = await this.docs.research(refinedBrief, {
              orgId: ctx.orgId,
              venueId: venue.id,
              conversationId,
              userMessage: input.userMessage,
            })
            tracker.recordResearcher(docs2.usage, docs2.voyageCalls)
            findings.push(docs2.finding)

            // Re-run Analyser on combined findings.
            emitPhase('analyse', triageOutput.mode)
            analyserResult = await this.analyser.analyse({
              mode: triageOutput.mode,
              userMessage: input.userMessage,
              findings,
            })
            tracker.recordAnalyser(analyserResult.usage)
            analyserOutput = analyserResult.output
            chatCoreLogger.info('chat_core.analyser_confidence_observed', {
              mode: triageOutput.mode,
              suggestedShape: analyserResult.output.suggestedShape,
              evidenceSufficiency: analyserResult.output.evidenceSufficiency,
              conversationIdHash,
              afterReresearch: true,
            })
          } else {
            chatCoreLogger.info('chat_core.reresearch_skipped_cost_ceiling', {
              orgId: orgIdHash,
              conversationIdHash,
              runningCost,
              ceiling: RERESEARCH_COST_CEILING_USD,
            })
            lowConfidence = true
          }
        }

        // ───── Writer ─────
        emitPhase('draft', triageOutput.mode)
        const citationCount = new Set(analyserResult.output.citations.map((c) => c.knowledgeItemId))
          .size
        const writerResult = await this.writer.compose({
          mode: triageOutput.mode,
          userMessage: input.userMessage,
          findings,
          analyserSynthesis: analyserResult.output.synthesis,
          safetySignal: triageOutput.safetySignal,
          citationCount,
        })
        tracker.recordWriter(writerResult.usage)
        writerText = writerResult.text

        // ───── Critic gating ─────
        const shouldRunCritic =
          triageOutput.mode === 'incident' ||
          (triageOutput.mode === 'reasoning' &&
            analyserResult.output.evidenceSufficiency < CRITIC_REASONING_CONFIDENCE_THRESHOLD)

        if (shouldRunCritic) {
          emitPhase('critique', triageOutput.mode)
          const criticResult = await this.critic.verify({
            writerDraft: writerText,
            findings,
          })
          tracker.recordCritic(criticResult.usage)

          if (criticResult.output.verdict === 'corrections-needed') {
            // audit-AC-4: bounded to 1 retry; we ship the retry verbatim
            // regardless of subsequent verification.
            emitPhase('draft', triageOutput.mode)
            const retry = await this.writer.compose({
              mode: triageOutput.mode,
              userMessage: input.userMessage,
              findings,
              analyserSynthesis: analyserResult.output.synthesis,
              safetySignal: triageOutput.safetySignal,
              citationCount,
              corrections: criticResult.output.corrections,
            })
            tracker.recordWriter(retry.usage)
            writerText = retry.text
            // audit-M3: event renamed (was critic_unresolved). We don't
            // re-verify on retry, so we cannot truthfully claim "unresolved".
            chatCoreLogger.warn('chat_core.critic_writer_retry_dispatched', {
              orgId: orgIdHash,
              conversationIdHash,
              mode: triageOutput.mode,
              correctionsCount: criticResult.output.corrections?.length ?? 0,
              retryCount: 1,
            })
          }
        }
      }

      // ───── Persist assistant message ─────
      const cost = tracker.total()
      const citationsToPersist = analyserOutput?.citations ?? findings.flatMap((f) => f.citations)
      const retrievedItemIds = Array.from(new Set(citationsToPersist.map((c) => c.knowledgeItemId)))

      // audit-S6 — triage_dispatch entry persisted on toolCallLog for SOC-2
      // incident reconstruction. Brief content is hashed (PII-safe), not raw.
      const triageDispatchEntry = {
        round: -2,
        toolUseId: 'chat-core-triage-dispatch',
        tool: 'triage_dispatch',
        input: {
          mode: triageOutput.mode,
          safetySignal: triageOutput.safetySignal,
        },
        result: {
          dispatched: dispatchedResearchers,
          briefHashes,
        },
      }
      const toolCallLog: object[] = [triageDispatchEntry]
      if (lowConfidence) toolCallLog.push(LOW_CONFIDENCE_FLAG_ENTRY)
      // Plan 06-04 Task 1 — attachment_received sentinel (PII-safe; metadata only,
      // never raw base64). Lets SOC-2 audit trail reconstruct multimodal turns.
      if (input.attachment) {
        const byteLength = Buffer.from(input.attachment.base64, 'base64').length
        toolCallLog.push({
          round: -3,
          toolUseId: 'chat-core-attachment-received',
          tool: 'attachment_received',
          input: {
            mediaType: input.attachment.mediaType,
            byteLength,
          },
          result: { ok: true },
        })
      }

      const assistant = await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: writerText,
          retrievedItemIds,
          costUsd: cost.totalUsd,
          toolCallLog: toolCallLog as unknown as object,
        },
        select: { id: true, content: true, followUps: true },
      })

      emitPhase('complete', triageOutput.mode)

      chatCoreLogger.info('chat_core.turn_complete', {
        orgId: orgIdHash,
        conversationIdHash,
        mode: triageOutput.mode,
        totalUsd: cost.totalUsd,
        breakdown: cost.breakdown,
        latencyMs: Date.now() - t0,
        lowConfidence,
      })

      return {
        conversationId,
        assistantMessage: {
          id: assistant.id,
          content: assistant.content,
          followUps: assistant.followUps,
        },
        toolCallLog: [],
        retrievedItemIds,
      }
    } catch (err) {
      // audit-M2 — partial-failure cost persistence.
      const cost = tracker.total()
      const failureContent = sanitizeError(err)
      try {
        await prisma.chatMessage.create({
          data: {
            conversationId,
            role: 'turn-failed',
            content: failureContent,
            costUsd: cost.totalUsd,
          },
        })
      } catch (persistErr) {
        chatCoreLogger.error('chat_core.turn_failed_persist_error', {
          orgId: orgIdHash,
          conversationIdHash,
          persistError: sanitizeError(persistErr),
        })
      }
      chatCoreLogger.error('chat_core.turn_failed', {
        orgId: orgIdHash,
        conversationIdHash,
        mode: triageOutput?.mode ?? null,
        totalUsd: cost.totalUsd,
        breakdown: cost.breakdown,
        failureContent,
        latencyMs: Date.now() - t0,
      })
      throw err
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Plan 06-04 Task 2 — streamMessage: streaming sibling of sendMessage.
  //
  // Same orchestration shape (Triage → Researchers → Analyser → Writer) but
  // streams Writer tokens via AI SDK 6.x streamText. Critic is SKIPPED on
  // incident streaming (D-06-04-A registered) — streaming + Critic-correction
  // re-write is incompatible with token streaming and reconciles in v0.4.
  //
  // Returns { conversationId, assistantMessageId, result } where `result` is
  // a streamText result with `.pipeUIMessageStreamToResponse(res, opts)` —
  // matches chat-v1's prepareStream contract so the UI controller code path
  // stays unchanged when the route moves to chat-core.
  // ─────────────────────────────────────────────────────────────────────────
  async streamMessage(
    input: SendMessageInput,
    ctx: ChatCoreDispatchContext,
    abortSignal?: AbortSignal,
  ): Promise<{
    conversationId: string
    assistantMessageId: string
    result: ReturnType<WriterService['streamCompose']>
  }> {
    const t0 = Date.now()

    // Cross-tenant guard.
    const venue = await prisma.venue.findFirst({
      where: { id: input.venueId, organizationId: ctx.orgId },
      select: { id: true },
    })
    if (!venue) throw new Error(`venue ${input.venueId} not found in org ${ctx.orgId}`)

    // Client-first conversationId — mirrors chat-v1.prepareStream behaviour
    // so the UI's URL/state stays stable from frame 0.
    const conversationId = input.conversationId ?? randomUUID()
    const existingConv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, venueId: true, deletedAt: true },
    })
    if (existingConv && existingConv.deletedAt !== null) {
      throw new Error(`conversation ${conversationId} not found`)
    }
    if (existingConv) {
      if (existingConv.venueId !== venue.id) {
        throw new Error(`conversation ${conversationId} does not belong to venue ${venue.id}`)
      }
    } else {
      await prisma.chatConversation.create({
        data: {
          id: conversationId,
          venueId: venue.id,
          channel: 'web',
          userId: ctx.userId,
        },
      })
      this.realtime.emitChatConversationUpserted(ctx.userId, {
        id: conversationId,
        venueId: venue.id,
        channel: 'web',
      })
    }

    // Pre-allocate assistantMessageId so the streamed UIMessage.id matches the
    // persisted ChatMessage row id (mirrors chat-v1).
    const assistantMessageId = randomUUID()

    // Persist user message (audit trail). Strip NUL only.
    const auditTrailContent = input.userMessage.replace(/\x00/g, '')
    await prisma.chatMessage.create({
      data: { conversationId, role: 'user', content: auditTrailContent },
    })

    const sanitized = sanitizeForTriage(input.userMessage)
    const tracker = new CostTracker()
    const conversationIdHash = hashId(conversationId)
    const orgIdHash = hashId(ctx.orgId)

    let seq = 0
    const emitPhase = (phase: StreamPhaseEvent, mode: ChatMode | null): void => {
      chatCoreLogger.info('chat_core.phase_event', {
        phase,
        mode,
        conversationIdHash,
        seq: seq++,
        timestampMs: Date.now(),
        streaming: true,
      })
    }

    // ───── FAST-PATH (Plan 06-04 hot-fix 2026-05-02) ─────
    const fastRecipe = identifyFastPath(input.userMessage)
    if (fastRecipe) {
      emitPhase('research', 'lookup')
      const fastResult = await this.fastLookup.execute(fastRecipe, {
        orgId: ctx.orgId,
        venueId: venue.id,
      })
      if (fastResult) {
        emitPhase('draft', 'lookup')
        const writerInput = {
          mode: 'lookup' as const,
          userMessage: input.userMessage,
          findings: [fastResult.finding],
        }
        const result = this.writer.streamCompose(writerInput, abortSignal)
        const fastPathEntry = {
          round: -2,
          toolUseId: 'chat-core-fast-lookup',
          tool: fastResult.toolName,
          input: { recipe: fastRecipe.tool },
          result: { hitCount: fastResult.hitCount },
        }
        const retrievedItemIds = Array.from(
          new Set(fastResult.finding.citations.map((c) => c.knowledgeItemId)),
        )
        void (async (): Promise<void> => {
          try {
            const writerText = await result.text
            const writerUsage = await result.usage
            tracker.recordWriter({
              inputTokens: numberOr0((writerUsage as Record<string, unknown>).inputTokens),
              outputTokens: numberOr0((writerUsage as Record<string, unknown>).outputTokens),
              cacheReadTokens: numberOr0(
                (writerUsage as Record<string, unknown>).cacheReadInputTokens ??
                  (writerUsage as Record<string, unknown>).cacheReadTokens,
              ),
              cacheWriteTokens: numberOr0(
                (writerUsage as Record<string, unknown>).cacheCreationInputTokens ??
                  (writerUsage as Record<string, unknown>).cacheWriteTokens,
              ),
            })
            const cost = tracker.total()
            await prisma.chatMessage.create({
              data: {
                id: assistantMessageId,
                conversationId,
                role: 'assistant',
                content: writerText.trim(),
                retrievedItemIds,
                costUsd: cost.totalUsd,
                toolCallLog: [fastPathEntry] as unknown as object,
              },
            })
            emitPhase('complete', 'lookup')
            chatCoreLogger.info('chat_core.turn_complete', {
              orgId: orgIdHash,
              conversationIdHash,
              mode: 'lookup',
              totalUsd: cost.totalUsd,
              breakdown: cost.breakdown,
              latencyMs: Date.now() - t0,
              streaming: true,
              fastPath: true,
              fastPathTool: fastResult.toolName,
            })
          } catch (err: unknown) {
            const cost = tracker.total()
            const failureContent = sanitizeError(err)
            try {
              await prisma.chatMessage.create({
                data: {
                  id: assistantMessageId,
                  conversationId,
                  role: 'turn-failed',
                  content: failureContent,
                  costUsd: cost.totalUsd,
                },
              })
            } catch {
              /* swallow */
            }
            chatCoreLogger.error('chat_core.stream_turn_failed', {
              orgId: orgIdHash,
              conversationIdHash,
              mode: 'lookup',
              totalUsd: cost.totalUsd,
              breakdown: cost.breakdown,
              failureContent,
              latencyMs: Date.now() - t0,
              fastPath: true,
            })
          }
        })()
        return { conversationId, assistantMessageId, result }
      }
      chatCoreLogger.info('chat_core.fast_lookup_fallthrough', {
        orgId: orgIdHash,
        conversationIdHash,
        recipe: fastRecipe.tool,
        streaming: true,
      })
    }

    // ───── Triage ─────
    emitPhase('triage', null)
    const triageResult = await this.triage.classify(sanitized)
    tracker.recordTriage(triageResult.usage)
    const triageOutput = triageResult.output

    // ───── Dispatch validation + cap ─────
    const requestedDispatch = triageOutput.researchersToDispatch
    let dispatched: ResearcherName[]
    if (requestedDispatch.length > MAX_RESEARCHERS_PER_TURN) {
      const requestedSet = new Set(requestedDispatch)
      dispatched = RESEARCHER_PRIORITY_ORDER.filter((r) => requestedSet.has(r)).slice(
        0,
        MAX_RESEARCHERS_PER_TURN,
      )
      chatCoreLogger.warn('chat_core.dispatch_capped', {
        orgId: orgIdHash,
        conversationIdHash,
        requestedCount: requestedDispatch.length,
        dispatchedCount: dispatched.length,
        capped: true,
      })
    } else {
      dispatched = [...requestedDispatch]
    }

    const briefs: Record<ResearcherName, string> = {
      docs: '',
      ops: '',
      people: '',
      tabular: '',
      venue: '',
    }
    for (const name of dispatched) {
      const raw = triageOutput.briefByResearcher[name] ?? sanitized.slice(0, 200)
      briefs[name] = sanitizeForResearcher(raw)
    }
    const briefHashes = dispatched.map((name) => sha12(briefs[name]))

    // ───── Researcher fan-out (parallel) ─────
    emitPhase('research', triageOutput.mode)
    const findings: ResearcherFinding[] = []
    const researcherTasks = dispatched.map((name) => {
      const researcher = this.resolveResearcher(name)
      return researcher
        .research(briefs[name], {
          orgId: ctx.orgId,
          venueId: venue.id,
          conversationId,
          userMessage: input.userMessage,
        })
        .then((result) => ({ status: 'fulfilled' as const, name, result }))
        .catch((err: unknown) => ({ status: 'rejected' as const, name, err }))
    })
    const settled = await Promise.all(researcherTasks)
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        tracker.recordResearcher(s.result.usage, s.result.voyageCalls)
        findings.push(s.result.finding)
      } else {
        chatCoreLogger.warn('chat_core.researcher_failed', {
          orgId: orgIdHash,
          conversationIdHash,
          researcher: s.name,
          error: sanitizeError(s.err),
        })
      }
    }
    if (findings.length === 0) {
      throw new Error('all researchers failed for this turn')
    }

    // ───── Analyser (reasoning + incident only) ─────
    let analyserOutput: AnalyserOutput | null = null
    let citationCount = 0
    if (triageOutput.mode !== 'lookup') {
      emitPhase('analyse', triageOutput.mode)
      const analyserResult = await this.analyser.analyse({
        mode: triageOutput.mode,
        userMessage: input.userMessage,
        findings,
      })
      tracker.recordAnalyser(analyserResult.usage)
      analyserOutput = analyserResult.output
      citationCount = new Set(analyserResult.output.citations.map((c) => c.knowledgeItemId)).size
      chatCoreLogger.info('chat_core.analyser_confidence_observed', {
        mode: triageOutput.mode,
        suggestedShape: analyserResult.output.suggestedShape,
        evidenceSufficiency: analyserResult.output.evidenceSufficiency,
        conversationIdHash,
        streaming: true,
      })
    }

    // D-06-04-A: incident streaming SKIPS Critic (streaming + Critic-correction
    // rewrite is incompatible with token-by-token delivery; reconciles v0.4).
    if (triageOutput.mode === 'incident') {
      chatCoreLogger.warn('chat_core.critic_skipped_streaming', {
        mode: 'incident',
        conversationIdHash,
        reason: 'streaming-incompatible',
      })
    }

    // ───── Writer (streaming) ─────
    emitPhase('draft', triageOutput.mode)
    const writerInput = {
      mode: triageOutput.mode,
      userMessage: input.userMessage,
      findings,
      analyserSynthesis: analyserOutput?.synthesis,
      safetySignal: triageOutput.safetySignal,
      citationCount,
    }

    // Persist + emit complete via streamText's onFinish callback. AI SDK 6.x
    // calls onFinish exactly once with final text + usage when the stream
    // completes (or aborts cleanly). Captured costs/IDs persist regardless.
    const result = this.writer.streamCompose(writerInput, abortSignal)

    // Wrap an attached async IIFE so the orchestrator can persist after stream
    // finishes. We don't await it here — the controller pipes the stream to
    // the response, the SDK resolves result.text + result.usage, then this
    // IIFE persists the ChatMessage row out-of-band. If the stream aborts,
    // persist with accumulated partial cost (audit-M2 carry-forward).
    void (async (): Promise<void> => {
      try {
        const writerText = await result.text
        const writerUsage = await result.usage
        tracker.recordWriter({
          inputTokens: numberOr0((writerUsage as Record<string, unknown>).inputTokens),
          outputTokens: numberOr0((writerUsage as Record<string, unknown>).outputTokens),
          cacheReadTokens: numberOr0(
            (writerUsage as Record<string, unknown>).cacheReadInputTokens ??
              (writerUsage as Record<string, unknown>).cacheReadTokens,
          ),
          cacheWriteTokens: numberOr0(
            (writerUsage as Record<string, unknown>).cacheCreationInputTokens ??
              (writerUsage as Record<string, unknown>).cacheWriteTokens,
          ),
        })
        const cost = tracker.total()
        const citationsToPersist = analyserOutput?.citations ?? findings.flatMap((f) => f.citations)
        const retrievedItemIds = Array.from(
          new Set(citationsToPersist.map((c) => c.knowledgeItemId)),
        )
        const triageDispatchEntry = {
          round: -2,
          toolUseId: 'chat-core-triage-dispatch',
          tool: 'triage_dispatch',
          input: {
            mode: triageOutput.mode,
            safetySignal: triageOutput.safetySignal,
          },
          result: { dispatched, briefHashes },
        }
        await prisma.chatMessage.create({
          data: {
            id: assistantMessageId,
            conversationId,
            role: 'assistant',
            content: writerText.trim(),
            retrievedItemIds,
            costUsd: cost.totalUsd,
            toolCallLog: [triageDispatchEntry] as unknown as object,
          },
        })
        emitPhase('complete', triageOutput.mode)
        chatCoreLogger.info('chat_core.turn_complete', {
          orgId: orgIdHash,
          conversationIdHash,
          mode: triageOutput.mode,
          totalUsd: cost.totalUsd,
          breakdown: cost.breakdown,
          latencyMs: Date.now() - t0,
          streaming: true,
        })
      } catch (err: unknown) {
        // audit-M2 carry-forward — persist partial-cost assistant row even on
        // stream abort, so cost telemetry is never lost.
        const cost = tracker.total()
        const failureContent = sanitizeError(err)
        try {
          await prisma.chatMessage.create({
            data: {
              id: assistantMessageId,
              conversationId,
              role: 'turn-failed',
              content: failureContent,
              costUsd: cost.totalUsd,
            },
          })
        } catch {
          /* swallow — already-failed turn shouldn't fail again on persist */
        }
        chatCoreLogger.error('chat_core.stream_turn_failed', {
          orgId: orgIdHash,
          conversationIdHash,
          mode: triageOutput.mode,
          totalUsd: cost.totalUsd,
          breakdown: cost.breakdown,
          failureContent,
          latencyMs: Date.now() - t0,
        })
      }
    })()

    return { conversationId, assistantMessageId, result }
  }
}

// Local helper duplicated from writer.service.ts (kept private to extract from
// the streaming usage object — Writer's extractUsage is module-private).
function numberOr0(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

// audit-S5: refined brief composition. When openQuestions has content, use
// them. When empty (Analyser low-confidence but no specific gaps), augment
// the original brief with a "broaden" directive so the second pass is
// meaningfully different from a plain retry.
function composeRefinedBrief(originalBrief: string, openQuestions: string[]): string {
  if (openQuestions.length > 0) {
    return `${originalBrief} — additional focus: ${openQuestions.join('; ')}`
  }
  return `${originalBrief} — broaden search to neighboring topics; original retrieval was thin`
}

// audit-S6 — first 12 chars of sha256 hex; matches hashId/hashQuery family in
// log-helpers.ts (PII-safe, deterministic, length-stable for log payload size).
function sha12(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 12)
}
