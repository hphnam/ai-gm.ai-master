import { z } from 'zod'

export const FEEDBACK_KINDS = ['up', 'down', 'regenerate'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export const RETAG_REASONS = ['thumbs-down', 'regeneration', 'low-similarity'] as const
export type ReTagReason = (typeof RETAG_REASONS)[number]

export const RETAG_STATUSES = ['queued', 'processing', 'processed', 'failed'] as const
export type ReTagStatus = (typeof RETAG_STATUSES)[number]

export const MAX_RETAG_ATTEMPTS = 3
export const MAX_ENQUEUE_PER_FEEDBACK = 10
export const DRAIN_SOFT_DEADLINE_MS = 60_000
export const LOW_SIM_THRESHOLD = 0.45
export const MAX_DRAIN_LIMIT = 50

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const CaptureFeedbackInputSchema = z.object({
  messageId: z.string().regex(UUID_RE, 'invalid uuid'),
  kind: z.enum(FEEDBACK_KINDS),
  userFeedback: z.string().max(2000).optional(),
})
export type CaptureFeedbackInput = z.infer<typeof CaptureFeedbackInputSchema>

export const EnqueueReTagInputSchema = z.object({
  knowledgeItemId: z.string().regex(UUID_RE, 'invalid uuid'),
  reason: z.enum(RETAG_REASONS),
  sourceMessageId: z.string().regex(UUID_RE, 'invalid uuid').optional(),
})
export type EnqueueReTagInput = z.infer<typeof EnqueueReTagInputSchema>
