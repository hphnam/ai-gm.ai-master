import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { DebugIdParamSchema, DebugQuerySchema, DebugRetagQueueQuerySchema } from '../../../types'

export class DebugIdParamDto extends createZodDto(DebugIdParamSchema) {}
export class DebugQueryDto extends createZodDto(DebugQuerySchema) {}
export class DebugRetagQueueQueryDto extends createZodDto(DebugRetagQueueQuerySchema) {}

const DebugFeedbackSchema = z.object({
  kind: z.string(),
  userFeedback: z.string().nullable(),
  createdAt: z.string(),
})

const DebugMessageSchema = z.object({
  id: z.string(),
  role: z.string(),
  content: z.string(),
  createdAt: z.string(),
  retrievedItemIds: z.array(z.string()),
  toolCallLog: z.unknown(),
  feedback: DebugFeedbackSchema.nullable(),
})

const DebugRetagQueueItemSchema = z.object({
  id: z.string(),
  knowledgeItemId: z.string(),
  reason: z.string(),
  status: z.string(),
  attempts: z.number(),
  lastError: z.string().nullable(),
  sourceMessageId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  knowledgeItem: z.object({
    id: z.string(),
    contentPreview: z.string(),
    venueId: z.string().nullable(),
  }),
})

export const DebugConversationResponseSchema = z.object({
  conversation: z.object({
    id: z.string(),
    venueId: z.string(),
    channel: z.string(),
    createdAt: z.string(),
  }),
  messages: z.array(DebugMessageSchema),
})
export class DebugConversationResponseDto extends createZodDto(DebugConversationResponseSchema) {}

export const DebugMessageResponseSchema = z.object({
  message: DebugMessageSchema,
  retagQueueItems: z.array(DebugRetagQueueItemSchema),
  conversation: z.object({
    id: z.string(),
    venueId: z.string(),
    channel: z.string(),
  }),
})
export class DebugMessageResponseDto extends createZodDto(DebugMessageResponseSchema) {}

export const DebugRetagQueueResponseSchema = z.object({
  items: z.array(DebugRetagQueueItemSchema),
  counts: z.object({
    queued: z.number(),
    processing: z.number(),
    done: z.number(),
    failed: z.number(),
    exhausted: z.number(),
  }),
})
export class DebugRetagQueueResponseDto extends createZodDto(DebugRetagQueueResponseSchema) {}
