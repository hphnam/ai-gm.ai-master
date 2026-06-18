import { z } from 'zod'
import { UUID_RE } from './api'

export const RETENTION_90D_MS = 90 * 24 * 60 * 60 * 1000
export const DEBUG_CONTENT_TRUNCATE = 2048
export const DEBUG_JSON_UI_CAP = 65536

export const DebugQuerySchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
})
export type DebugQuery = z.infer<typeof DebugQuerySchema>

export const DebugRetagQueueQuerySchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
  limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
})
export type DebugRetagQueueQuery = z.infer<typeof DebugRetagQueueQuerySchema>

export const DebugIdParamSchema = z.object({
  id: z.string().regex(UUID_RE, 'invalid uuid'),
})

export type DebugFeedback = {
  kind: string
  userFeedback: string | null
  createdAt: string
}

export type DebugMessage = {
  id: string
  role: string
  content: string
  createdAt: string
  retrievedItemIds: string[]
  toolCallLog: unknown
  feedback: DebugFeedback | null
}

export type DebugConversationResponse = {
  conversation: {
    id: string
    venueId: string
    channel: string
    createdAt: string
  }
  messages: DebugMessage[]
}

export type DebugMessageResponse = {
  message: DebugMessage
  retagQueueItems: DebugRetagQueueItem[]
  conversation: {
    id: string
    venueId: string
    channel: string
  }
}

export type DebugRetagQueueItem = {
  id: string
  knowledgeItemId: string
  reason: string
  status: string
  attempts: number
  lastError: string | null
  sourceMessageId: string | null
  createdAt: string
  updatedAt: string
  knowledgeItem: {
    id: string
    contentPreview: string
    venueId: string | null
  }
}

export type DebugRetagQueueCounts = {
  queued: number
  processing: number
  done: number
  failed: number
  exhausted: number
}

export type DebugRetagQueueResponse = {
  items: DebugRetagQueueItem[]
  counts: DebugRetagQueueCounts
}
