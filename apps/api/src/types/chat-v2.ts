// Plan 06-01 Task 2 — chat-v2 type contract.
//
// Single source of truth for the multi-agent pipeline shape. Stable across 06-01
// (lookup mode + Docs researcher only) and 06-02 (full Analyser/Critic + 4 more
// researchers + reasoning/incident modes). 06-02 expands DATA (writer-examples,
// triage prompt, orchestrator stages) — this file's TYPES stay frozen so the
// compiler enforces the cross-plan contract.

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Mode + researcher discriminated unions
// ─────────────────────────────────────────────────────────────────────────────

export type ChatMode = 'lookup' | 'reasoning' | 'incident'

// 06-01 only implements 'docs'. The full union is declared here so Triage's
// structured output type is stable across plans (06-02 wires the other four).
export type ResearcherName = 'docs' | 'ops' | 'people' | 'tabular' | 'venue'

// ─────────────────────────────────────────────────────────────────────────────
// Hard wall-clock timeouts (audit-M3) and input length cap (audit-M4)
// ─────────────────────────────────────────────────────────────────────────────

export const TRIAGE_TIMEOUT_MS = 5_000
export const RESEARCHER_TIMEOUT_MS = 15_000
export const WRITER_TIMEOUT_MS = 20_000
export const TOTAL_TURN_TIMEOUT_MS = 35_000
export const MAX_USER_MESSAGE_LEN = 4_096

// Plan 06-02 — Analyser + Critic timeouts (audit-S3 — Critic tightened from 8s
// to 4s; Haiku verification with no tools is 200-500ms typical, 4s is generous).
export const ANALYSER_TIMEOUT_MS = 15_000
export const CRITIC_TIMEOUT_MS = 4_000

// Plan 06-02 — pipeline thresholds.
// ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD: below this, orchestrator triggers a
// second-pass research call (with Analyser-authored refined brief) provided the
// running turn cost is under RERESEARCH_COST_CEILING_USD. Aligned with project
// $0.01-0.02/turn target — at $0.05 we've already 2-3x'd the budget.
export const ANALYSER_RERESEARCH_CONFIDENCE_THRESHOLD = 0.6
export const RERESEARCH_COST_CEILING_USD = 0.05

// CRITIC_REASONING_CONFIDENCE_THRESHOLD: above this, Critic skipped on reasoning
// turns (cost discipline). Incident mode is always-on regardless of threshold.
export const CRITIC_REASONING_CONFIDENCE_THRESHOLD = 0.7

// CRITIC_MAX_WRITER_RETRIES: hard cap on Writer retry loop after Critic returns
// corrections-needed. We deliberately don't re-verify on retry — ship the
// retry's draft verbatim to avoid infinite loops.
export const CRITIC_MAX_WRITER_RETRIES = 1

// ─────────────────────────────────────────────────────────────────────────────
// Triage output — Zod schema + inferred type. .strict() rejects unknown keys
// (audit-S4: emergent attack-surface keys cannot pollute downstream routing).
// ─────────────────────────────────────────────────────────────────────────────

export const ChatModeEnum = z.enum(['lookup', 'reasoning', 'incident'])
export const ResearcherNameEnum = z.enum(['docs', 'ops', 'people', 'tabular', 'venue'])

export const TriageOutputSchema = z
  .object({
    mode: ChatModeEnum,
    researchersToDispatch: z.array(ResearcherNameEnum),
    briefByResearcher: z.partialRecord(ResearcherNameEnum, z.string().min(1)),
    safetySignal: z.boolean(),
  })
  .strict()

export type TriageOutput = z.infer<typeof TriageOutputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Researcher output + Writer input shapes (consumed by Task 3)
// ─────────────────────────────────────────────────────────────────────────────

export type ResearcherCitation = {
  knowledgeItemId: string
  sectionId?: string
}

export type ResearcherFinding = {
  researcher: ResearcherName
  summary: string
  citations: ResearcherCitation[]
}

export type WriterInput = {
  mode: ChatMode
  userMessage: string
  findings: ResearcherFinding[]
  // Plan 06-02 additions:
  // analyserSynthesis — present on reasoning + incident; Writer prefers this over
  // raw findings.summary because Analyser already reconciled overlaps.
  analyserSynthesis?: string
  // safetySignal — threaded from Triage; Writer-incident bakes 999 directive
  // when true (audit-M2).
  safetySignal?: boolean
  // corrections — present only on Critic-corrections retry; Writer rewrites with
  // these specifics fixed; voice unchanged (AC-4).
  corrections?: string[]
  // citationCount — count of unique citation knowledgeItemIds for 06-04 general-
  // advice badge logic (audit-S4 — Writer does NOT receive raw citation arrays
  // or content; count only, prevents Writer leaking IDs as meta-narration).
  citationCount?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan 06-02 — Analyser output. Reconciles researcher findings, decides answer
// shape, self-rates evidence sufficiency (drives re-research circuit-breaker).
// ─────────────────────────────────────────────────────────────────────────────

export const SuggestedShapeEnum = z.enum([
  'recommendation',
  'diagnosis',
  'sequence',
  'branching',
])
export type SuggestedShape = z.infer<typeof SuggestedShapeEnum>

export const AnalyserOutputSchema = z
  .object({
    synthesis: z.string().min(1),
    citations: z.array(
      z.object({
        knowledgeItemId: z.string().uuid(),
        sectionId: z.string().uuid().optional(),
      }),
    ),
    openQuestions: z.array(z.string()),
    suggestedShape: SuggestedShapeEnum,
    evidenceSufficiency: z.number().min(0).max(1),
  })
  .strict()
export type AnalyserOutput = z.infer<typeof AnalyserOutputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Plan 06-02 — Critic output. Verifies specifics in Writer draft against
// researcher finding summaries (audit-M1: NOT bare citation IDs).
// ─────────────────────────────────────────────────────────────────────────────

export const CriticOutputSchema = z
  .object({
    verdict: z.enum(['approved', 'corrections-needed']),
    corrections: z.array(z.string()).optional(),
  })
  .strict()
export type CriticOutput = z.infer<typeof CriticOutputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Plan 06-02 — Stream phase events. Emitted by orchestrator at each role
// transition. seq + timestampMs (audit-M5) enable 06-04 frontend to reconstruct
// order from out-of-order Pino batched/buffered logs.
// ─────────────────────────────────────────────────────────────────────────────

export const StreamPhaseEventEnum = z.enum([
  'triage',
  'research',
  'analyse',
  'draft',
  'critique',
  'complete',
])
export type StreamPhaseEvent = z.infer<typeof StreamPhaseEventEnum>

// ─────────────────────────────────────────────────────────────────────────────
// Errors thrown by the pipeline. Caller (chat-v2.service) is responsible for
// turning these into a turn-failed ChatMessage row with partial cost (audit-M2).
// ─────────────────────────────────────────────────────────────────────────────

export class TriageClassificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TriageClassificationError'
  }
}

export class RoleTimeoutError extends Error {
  readonly role: 'triage' | 'researcher' | 'writer' | 'analyser' | 'critic'
  constructor(
    role: 'triage' | 'researcher' | 'writer' | 'analyser' | 'critic',
    timeoutMs: number,
  ) {
    super(`${role} exceeded ${timeoutMs}ms hard timeout`)
    this.name = 'RoleTimeoutError'
    this.role = role
  }
}
