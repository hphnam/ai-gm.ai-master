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
}

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
  readonly role: 'triage' | 'researcher' | 'writer'
  constructor(role: 'triage' | 'researcher' | 'writer', timeoutMs: number) {
    super(`${role} exceeded ${timeoutMs}ms hard timeout`)
    this.name = 'RoleTimeoutError'
    this.role = role
  }
}
