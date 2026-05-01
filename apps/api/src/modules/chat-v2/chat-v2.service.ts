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
import { prisma } from '../../database/prisma'
import {
  ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD,
  type AnalyserOutput,
  CRITIC_REASONING_CONFIDENCE_THRESHOLD,
  type ChatMode,
  type ResearcherFinding,
  RERESEARCH_COST_CEILING_USD,
  type StreamPhaseEvent,
  type TriageOutput,
} from '../../types'
import type { SendMessageInput, SendMessageResult } from '../chat/chat.service'
import { AnalyserService } from './analyser.service'
import { CostTracker } from './cost-tracker.service'
import { CriticService } from './critic.service'
import { sanitizeForTriage } from './input-sanitizer'
import { chatV2Logger, hashId, sanitizeError } from './log-helpers'
import { DocsResearcher } from './researchers/docs.researcher'
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
  ) {}

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

    try {
      // ───── Triage ─────
      emitPhase('triage', null)
      const triageResult = await this.triage.classify(sanitized)
      tracker.recordTriage(triageResult.usage)
      triageOutput = triageResult.output

      // ───── Researcher (Docs) ─────
      emitPhase('research', triageOutput.mode)
      const brief = triageOutput.briefByResearcher.docs ?? sanitized.slice(0, 200)
      const docsResult = await this.docs.research(brief, {
        orgId: ctx.orgId,
        venueId: venue.id,
        conversationId,
      })
      tracker.recordResearcher(docsResult.usage, docsResult.voyageCalls)
      const findings: ResearcherFinding[] = [docsResult.finding]

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

      const toolCallLog = lowConfidence ? [LOW_CONFIDENCE_FLAG_ENTRY] : []

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
