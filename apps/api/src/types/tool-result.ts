import { z } from 'zod'

// Plan 05-01 Task 3 — additive: 'not-found' (doc id mismatched org guard;
// 404-style per Phase 1 enumeration-leak decision) and 'invalid-input'
// (Zod schema fail / unknown column / aggregate-on-non-numeric).
export const TOOL_RESULT_REASONS = [
  'no-data',
  'not-supported',
  'error',
  'not-found',
  'invalid-input',
] as const
export type ToolResultReason = (typeof TOOL_RESULT_REASONS)[number]

export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ToolResultReason; detail?: string }

export function ok<T>(data: T): ToolResult<T> {
  return { ok: true, data }
}

export function fail(reason: ToolResultReason, detail?: string): ToolResult<never> {
  return { ok: false, reason, detail }
}

export function toolResultSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), data: dataSchema }),
    z.object({
      ok: z.literal(false),
      reason: z.enum(TOOL_RESULT_REASONS),
      detail: z.string().optional(),
    }),
  ])
}
