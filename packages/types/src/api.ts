import { z } from 'zod'

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const API_ERROR_CODES = [
  'invalid-input',
  'not-found',
  'venue-not-found',
  'conversation-not-found',
  'message-not-found',
  'not-assistant-message',
  // v0.2 Phase 1 — Auth + Organizations (append-only; never reorder)
  'unauthorized',
  'forbidden',
  'email-already-registered',
  'invalid-credentials',
  'organization-not-found',
  'member-not-found',
  'invalid-redirect',
  'payload-too-large',
  'organization-slug-conflict',
  // v0.2 Phase 1 — Invitations (Plan 01-02; append-only)
  'invitation-not-found',
  'invitation-expired',
  'invitation-already-accepted',
  'invitation-email-mismatch',
  'mail-send-failed',
  // 01-02 audit-added (M4, M7, M9, M2)
  'invalid-invitation-role',
  'invitation-limit-reached',
  'already-a-member',
  'email-not-verified',
] as const
export type ApiErrorCode = (typeof API_ERROR_CODES)[number]
export type ApiErrorResponse = { error: ApiErrorCode; details?: unknown }

const userMessageField = z
  .string()
  .trim()
  .min(1, 'userMessage must not be empty or whitespace-only')
  .max(8000, 'userMessage exceeds 8000 chars')

export const SendChatMessageRequestSchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
  userMessage: userMessageField,
  conversationId: z.string().regex(UUID_RE, 'invalid uuid').optional(),
})
export type SendChatMessageRequest = z.infer<typeof SendChatMessageRequestSchema>

export const SuggestionsOnOpenRequestSchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
})
export type SuggestionsOnOpenRequest = z.infer<typeof SuggestionsOnOpenRequestSchema>

export const SuggestionsOnTurnRequestSchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
  userMessage: userMessageField,
  conversationId: z.string().regex(UUID_RE, 'invalid uuid').optional(),
})
export type SuggestionsOnTurnRequest = z.infer<typeof SuggestionsOnTurnRequestSchema>

export const ConversationIdParamSchema = z.object({
  id: z.string().regex(UUID_RE, 'invalid uuid'),
})

export const GetConversationQuerySchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
})

export type VenueListItem = {
  id: string
  name: string
  address: string | null
  type: string
  timezone: string
}

export const CreateVenueBodySchema = z.object({
  name: z.string().trim().min(1, 'name required').max(120, 'name too long'),
  type: z.string().trim().min(1, 'type required').max(40, 'type too long'),
  address: z.string().trim().max(240, 'address too long').optional().or(z.literal('')),
  timezone: z.string().trim().min(1, 'timezone required').max(64),
})
export type CreateVenueBody = z.infer<typeof CreateVenueBodySchema>

export type ChatMessageDto = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  retrievedItemIds: string[]
}

export type SendChatMessageResponse = {
  conversationId: string
  assistantMessage: { id: string; content: string }
  toolCallLog: unknown[]
  retrievedItemIds: string[]
}

export type ConversationResponse = {
  id: string
  venueId: string
  channel: string
  messages: ChatMessageDto[]
}

export type FeedbackResponse = {
  ok: true
  feedbackId: string
  enqueuedCount: number
  dedupedCount: number
  exhaustedCount: number
}
