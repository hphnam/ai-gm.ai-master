// Plan 06-01 Task 3 — chat-v2 orchestrator.
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

import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { prisma } from '../../database/prisma'
import {
  ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD,
  type AnalyserOutput,
  CRITIC_REASONING_CONFIDENCE_THRESHOLD,
  type ChatMode,
  MAX_RESEARCHERS_PER_TURN,
  type ResearcherFinding,
  type ResearcherName,
  RERESEARCH_COST_CEILING_USD,
  RESEARCHER_PRIORITY_ORDER,
  type StreamPhaseEvent,
  TOTAL_TURN_TIMEOUT_MS,
  type TriageOutput,
} from '../../types'
import type { SendMessageInput, SendMessageResult } from '../chat/chat.service'
import { AnalyserService } from './analyser.service'
import { CostTracker } from './cost-tracker.service'
import { CriticService } from './critic.service'
import { sanitizeForTriage } from './input-sanitizer'
import { chatV2Logger, hashId, sanitizeError } from './log-helpers'
import { sanitizeForResearcher } from './researcher-sanitizer'
import type { Researcher } from './researcher.interface'
import { DocsResearcher } from './researchers/docs.researcher'
import { OpsResearcher } from './researchers/ops.researcher'
import { PeopleResearcher } from './researchers/people.researcher'
import { TabularResearcher } from './researchers/tabular.researcher'
import { VenueResearcher } from './researchers/venue.researcher'
import { TriageService } from './triage.service'
import { WriterService } from './writer.service'

export type ChatV2DispatchContext = {
  orgId: string
  userId: string
  userRole: string
  userIdentity: { name: string | null; email: string }
}

// audit-M6: lowConfidence flag persistence on chat_messages.toolCallLog (no
// metadata column exists in schema; toolCallLog is Json[] and unused for
// chat-v2 turns from 06-01). Sentinel entry shape:
const LOW_CONFIDENCE_FLAG_ENTRY = {
  round: -1,
  toolUseId: 'chat-v2-low-confidence',
  tool: 'low_confidence_flag',
  input: null,
  result: { value: true },
} as const

@Injectable()
export class ChatV2Service {
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
    ctx: ChatV2DispatchContext,
  ): Promise<SendMessageResult> {
    const t0 = Date.now()

    // Cross-tenant guard (audit-M1) — venue must belong to ctx.orgId.
    const venue = await prisma.venue.findFirst({
      where: { id: input.venueId, organizationId: ctx.orgId },
      select: { id: true },
    })
    if (!venue) throw new Error(`venue ${input.venueId} not found in org ${ctx.orgId}`)

    const conversationId =
      input.conversationId ??
      (
        await prisma.chatConversation.create({
          data: { venueId: venue.id, userId: ctx.userId, channel: 'web' },
          select: { id: true },
        })
      ).id

    // Persist raw user message (audit trail). Strip NUL only — Postgres TEXT
    // encoding invariant.
    const auditTrailContent = input.userMessage.replace(/\x00/g, '')
    await prisma.chatMessage.create({
      data: { conversationId, role: 'user', content: auditTrailContent },
    })

    const sanitized = sanitizeForTriage(input.userMessage)
    const tracker = new CostTracker()
    const conversationIdHash = hashId(conversationId)
    const orgIdHash = hashId(ctx.orgId)

    // audit-M5 phase event emitter — seq monotonic from 0 + Date.now timestamp.
    let seq = 0
    const emitPhase = (phase: StreamPhaseEvent, mode: ChatMode | null): void => {
      chatV2Logger.info('chat_v2.phase_event', {
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
        chatV2Logger.warn('chat_v2.dispatch_capped', {
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
      let parentBudgetExhausted = false
      const parentTimer = setTimeout(() => {
        parentAbort.abort()
        parentBudgetExhausted = true
        chatV2Logger.warn('chat_v2.turn_budget_exhausted', {
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
            chatV2Logger.warn('chat_v2.researcher_failed', {
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
        chatV2Logger.info('chat_v2.analyser_confidence_observed', {
          mode: triageOutput.mode,
          suggestedShape: analyserResult.output.suggestedShape,
          evidenceSufficiency: analyserResult.output.evidenceSufficiency,
          conversationIdHash,
        })

        // Re-research circuit-breaker: low confidence → second pass with
        // refined brief, BUT only if running cost still under ceiling.
        if (analyserResult.output.evidenceSufficiency < ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD) {
          // Probe-only fake running cost override (V30) — production uses real total.
          const fakeRunningCost = Number(process.env.PROBE_CHAT_V2_FAKE_RUNNING_COST_USD ?? '0')
          const runningCost = fakeRunningCost > 0 ? fakeRunningCost : tracker.total().totalUsd

          if (runningCost < RERESEARCH_COST_CEILING_USD) {
            const refinedBrief = composeRefinedBrief(brief, analyserResult.output.openQuestions)
            chatV2Logger.info('chat_v2.reresearch_dispatched', {
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
            chatV2Logger.info('chat_v2.analyser_confidence_observed', {
              mode: triageOutput.mode,
              suggestedShape: analyserResult.output.suggestedShape,
              evidenceSufficiency: analyserResult.output.evidenceSufficiency,
              conversationIdHash,
              afterReresearch: true,
            })
          } else {
            chatV2Logger.info('chat_v2.reresearch_skipped_cost_ceiling', {
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
        const citationCount = new Set(
          analyserResult.output.citations.map((c) => c.knowledgeItemId),
        ).size
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
            chatV2Logger.warn('chat_v2.critic_writer_retry_dispatched', {
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
      const citationsToPersist =
        analyserOutput?.citations ?? findings.flatMap((f) => f.citations)
      const retrievedItemIds = Array.from(
        new Set(citationsToPersist.map((c) => c.knowledgeItemId)),
      )

      // audit-S6 — triage_dispatch entry persisted on toolCallLog for SOC-2
      // incident reconstruction. Brief content is hashed (PII-safe), not raw.
      const triageDispatchEntry = {
        round: -2,
        toolUseId: 'chat-v2-triage-dispatch',
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

      chatV2Logger.info('chat_v2.turn_complete', {
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
        chatV2Logger.error('chat_v2.turn_failed_persist_error', {
          orgId: orgIdHash,
          conversationIdHash,
          persistError: sanitizeError(persistErr),
        })
      }
      chatV2Logger.error('chat_v2.turn_failed', {
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
