// Plan 06-01 Task 3 — get_checklist shaped tool.
//
// Pure function (NOT an AI SDK tool). The Docs researcher calls this directly
// because it's a deterministic database lookup — model-mediation buys nothing.
//
// Strategy: TOP 1 by similarity (NOT top-K). This is the structural fix for
// the dual-checklist interleaving bug — a single Checklist row carries the
// FULL ordered steps list as JSON, so returning one row eliminates both
// fragmentation (steps from one list) and merge-confusion (steps from two).
//
// audit-M1 — orgId is positional, sourced from session/auth context only.
// Never from request body. Cross-tenant boundary regression-tested by V13.

import type { PrismaClient } from '@prisma/client'
import { fail, ok, type ToolResult } from '../../../types'
import { chatCoreLogger, hashId, hashQuery } from '../log-helpers'

export type ChecklistStepLite = { index: number; content: string }

export type ChecklistResult = {
  checklistId: string
  knowledgeItemId: string
  title: string
  steps: ChecklistStepLite[]
}

const SIMILARITY_THRESHOLD = 0.3

// Lightweight intent → checklist matcher. Uses substring + token overlap on
// title + KB doc kind. Voyage embedding similarity is overkill for the small
// per-org checklist count and would burn an embed call per turn; the v1
// behavior (a tactical checklist-merge fix in commit 90f57d2) already used
// title-based heuristics. Keeping that here, with TOP 1 selection.
const OPENING_TOKENS = ['open', 'opening', 'start of day', 'before service']
const CLOSING_TOKENS = ['close', 'closing', 'end of day', 'after service']
const PROCEDURE_TOKENS = ['procedure', 'process', 'steps to']

export async function getChecklist(
  intent: string,
  orgId: string,
  venueId: string | null,
  prisma: PrismaClient,
): Promise<ToolResult<ChecklistResult>> {
  const t0 = Date.now()
  const normIntent = intent.trim().toLowerCase()
  if (normIntent.length === 0) {
    return fail('invalid-input', 'intent is empty')
  }

  // Cross-tenant guard — orgId positional, source of truth is session/auth ctx.
  // Checklist is org-scoped via organizationId; venueId is informational only at
  // this surface (no direct column on Checklist), passed through to log payload.
  const candidates = await prisma.checklist.findMany({
    where: { organizationId: orgId },
    select: { id: true, title: true, knowledgeItemId: true, steps: true, organizationId: true },
    take: 50,
  })

  if (candidates.length === 0) {
    chatCoreLogger.info('tool.get_checklist', {
      orgId: hashId(orgId),
      intent: hashQuery(normIntent),
      hitCount: 0,
      latencyMs: Date.now() - t0,
    })
    return fail('no-data', 'no checklists in organization')
  }

  // Score each candidate. Substring-on-title + intent-bucket boost.
  const scored = candidates.map((c) => ({ c, score: scoreCandidate(normIntent, c.title) }))
  scored.sort((a, b) => b.score - a.score)
  const top = scored[0]

  if (!top || top.score < SIMILARITY_THRESHOLD) {
    chatCoreLogger.info('tool.get_checklist', {
      orgId: hashId(orgId),
      intent: hashQuery(normIntent),
      hitCount: 0,
      latencyMs: Date.now() - t0,
    })
    return fail('no-data', 'no checklist matched intent above threshold')
  }

  const rawSteps = Array.isArray(top.c.steps) ? (top.c.steps as unknown[]) : []
  const steps: ChecklistStepLite[] = rawSteps.map((s, i) => {
    const obj = (s ?? {}) as Record<string, unknown>
    const idx = typeof obj.index === 'number' ? obj.index : i
    const text =
      typeof obj.text === 'string' ? obj.text : typeof obj.content === 'string' ? obj.content : ''
    return { index: idx, content: text }
  })

  // Suppress venueId in output but keep parameter for cross-tenant audit logs.
  void venueId

  chatCoreLogger.info('tool.get_checklist', {
    orgId: hashId(orgId),
    intent: hashQuery(normIntent),
    hitCount: 1,
    checklistId: top.c.id,
    latencyMs: Date.now() - t0,
  })

  return ok({
    checklistId: top.c.id,
    knowledgeItemId: top.c.knowledgeItemId,
    title: top.c.title,
    // TOP 1 result — full ordered step list, no top-K, no fragmentation. LIMIT 1
    // discipline expressed structurally (we sort + take first) so downstream
    // can never receive interleaved steps from two checklists.
    steps,
  })
}

function scoreCandidate(intent: string, title: string): number {
  const t = title.toLowerCase()
  let score = 0
  if (t.includes(intent)) score += 0.9
  for (const tok of intent.split(/\s+/)) {
    if (tok.length > 2 && t.includes(tok)) score += 0.15
  }
  if (OPENING_TOKENS.some((k) => intent.includes(k)) && OPENING_TOKENS.some((k) => t.includes(k))) {
    score += 0.6
  }
  if (CLOSING_TOKENS.some((k) => intent.includes(k)) && CLOSING_TOKENS.some((k) => t.includes(k))) {
    score += 0.6
  }
  if (PROCEDURE_TOKENS.some((k) => intent.includes(k))) score += 0.1
  return Math.min(score, 1)
}
