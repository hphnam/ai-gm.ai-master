// Plan 06-01 Task 2 — chat-core type contract.
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

// Plan 06-04 hot-fixes 2026-05-02 — real-Anthropic UAT surfaced that
// generateObject + structured output is genuinely slow on Anthropic
// (Triage on Haiku ~5-12s, Analyser on Sonnet ~15s+ timed out). Hot-fixes:
//   1. Triage uses regex fast-path before Anthropic; LLM Triage timeout 5s→12s.
//   2. Analyser + Critic switched from generateObject to generateText with
//      manual JSON parse (drops the structured-output overhead).
//   3. Timeouts bumped: ANALYSER 15s→30s, CRITIC 4s→8s.
//   4. TOTAL_TURN_TIMEOUT_MS bumped to 60s to stay ahead of worst-case
//      reasoning turn (Triage 12s + Researchers 15s parallel + Analyser 30s
//      + Writer 20s streaming + Critic 8s = ~85s sequential, ~50-65s with
//      parallel researcher fan-out and overlapping Writer streaming).
export const TRIAGE_TIMEOUT_MS = 12_000
export const RESEARCHER_TIMEOUT_MS = 15_000
export const WRITER_TIMEOUT_MS = 20_000
export const TOTAL_TURN_TIMEOUT_MS = 60_000
export const MAX_USER_MESSAGE_LEN = 4_096

// Plan 06-04 hot-fix — Analyser timeout 15s → 30s; Critic 4s → 8s. Real-mode
// generateText is faster than generateObject but Sonnet on the Analyser
// prompt + 5 researcher findings still lands 5-15s realistically.
export const ANALYSER_TIMEOUT_MS = 30_000
export const CRITIC_TIMEOUT_MS = 8_000

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
// Plan 06-03 — researcher-breadth constants.
// audit-M1: cap KnowledgeItem.metadata mention scan in get_person to 3 hits;
// adversarial names cannot trigger full-table scan.
// audit-S2: orchestrator + Triage prompt cap dispatch list to 4 researchers
// (defends cost discipline against prompt-confused dispatch).
// audit-M5: stub-clock anchor for "now-X" boundaries (last 24h / next 4h);
// stubClock() returns this constant when PROBE_CHAT_CORE_STUB=1, otherwise
// Date.now(). Two probe iterations spaced milliseconds apart produce
// byte-identical "now-anchored" data.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_PERSON_MENTIONS_PER_QUERY = 3
export const MAX_RESEARCHERS_PER_TURN = 4
export const FROZEN_STUB_NOW_MS = 1782000000000

// Stable order for dispatch truncation when Triage exceeds the cap.
// First-N wins; venue is highest priority because of the always-on contract for
// reasoning + incident (CONTEXT.md D-06-B).
export const RESEARCHER_PRIORITY_ORDER: ResearcherName[] = [
  'venue',
  'docs',
  'ops',
  'people',
  'tabular',
]

// ─────────────────────────────────────────────────────────────────────────────
// Plan 06-03 — Tool result data shapes for new researcher-owned tools.
// Re-exported from MockOpsService where applicable (CutoffSummary).
// ─────────────────────────────────────────────────────────────────────────────

export type VenueContactSummary = {
  name: string
  role: string
  phone: string | null
  email: string | null
  isEmergencyContact: boolean
}

export type IncidentSummary = {
  id: string
  severity: string
  summary: string
  createdAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// Triage output — Zod schema + inferred type. .strict() rejects unknown keys
// (audit-S4: emergent attack-surface keys cannot pollute downstream routing).
// ─────────────────────────────────────────────────────────────────────────────

export const ChatModeEnum = z.enum(['lookup', 'reasoning', 'incident'])
export const ResearcherNameEnum = z.enum(['docs', 'ops', 'people', 'tabular', 'venue'])

// Plan 06-04 hot-fix 2026-05-02 — replaced `z.partialRecord(ResearcherNameEnum,...)`
// with an explicit-keys object. Anthropic's structured-output API rejects the
// JSON-schema `propertyNames` constraint that Zod 4 emits for partialRecord
// over an enum (`output_config.format.schema: For 'object' type, property
// 'propertyNames' is not supported`). The explicit-keys form serializes to
// standard JSON-schema `properties` which Anthropic accepts. Same runtime
// shape: each researcher key carries an optional non-empty string brief.
export const TriageOutputSchema = z
  .object({
    mode: ChatModeEnum,
    researchersToDispatch: z.array(ResearcherNameEnum),
    briefByResearcher: z
      .object({
        docs: z.string().min(1).optional(),
        ops: z.string().min(1).optional(),
        people: z.string().min(1).optional(),
        tabular: z.string().min(1).optional(),
        venue: z.string().min(1).optional(),
      })
      .strict(),
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

export const SuggestedShapeEnum = z.enum(['recommendation', 'diagnosis', 'sequence', 'branching'])
export type SuggestedShape = z.infer<typeof SuggestedShapeEnum>

// Plan 06-04 hot-fix 2026-05-02 — `z.number().min(0).max(1)` emits JSON
// schema with `minimum: 0, maximum: 1` which Anthropic's structured-output
// API rejects ("For 'number' type, properties maximum, minimum are not
// supported"). Use a plain `z.number()` and clamp post-parse via .transform().
// Same runtime contract: evidenceSufficiency ∈ [0, 1].
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
    evidenceSufficiency: z.number().transform((v) => Math.max(0, Math.min(1, v))),
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
// Errors thrown by the pipeline. Caller (chat-core.service) is responsible for
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
  constructor(role: 'triage' | 'researcher' | 'writer' | 'analyser' | 'critic', timeoutMs: number) {
    super(`${role} exceeded ${timeoutMs}ms hard timeout`)
    this.name = 'RoleTimeoutError'
    this.role = role
  }
}
