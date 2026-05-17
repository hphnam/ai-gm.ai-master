import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  ConversationIdParamSchema,
  GetConversationQuerySchema,
  SendChatMessageRequestSchema,
  StreamChatMessageRequestSchema,
  UUID_RE,
} from '../../../types'

// Inputs
export class SendChatMessageRequestDto extends createZodDto(SendChatMessageRequestSchema) {}
export class StreamChatMessageRequestDto extends createZodDto(StreamChatMessageRequestSchema) {}
export class ConversationIdParamDto extends createZodDto(ConversationIdParamSchema) {}
export class GetConversationQueryDto extends createZodDto(GetConversationQuerySchema) {}

export const ListConversationsQuerySchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid').optional(),
  /// Opaque keyset cursor returned by the previous page. Encodes the last
  /// row's (updatedAt, id) so pagination is stable even when rows are
  /// inserted/updated mid-scroll.
  cursor: z.string().min(1).max(200).optional(),
  /// Page size. Clamped server-side to [1, 100].
  limit: z.coerce.number().int().min(1).max(100).optional(),
  /// Free-text search across venue name and first user message content.
  /// Compiles to Postgres ILIKE on both columns. Minimum length is 2 to keep
  /// 1-character wildcard scans off the table (the message-content path is
  /// unindexed today); trim + 100-char cap bounds pattern size.
  q: z.string().trim().min(2).max(100).optional(),
})
export class ListConversationsQueryDto extends createZodDto(ListConversationsQuerySchema) {}

// Response schemas — derived here because @gm-ai/types currently exposes
// these as plain TS types only. Swagger needs runtime schemas.
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.string(),
  retrievedItemIds: z.array(z.string()),
  followUps: z.array(z.string()).optional(),
  reasoning: z.string().nullable().optional(),
  parts: z.unknown().optional(),
  toolCallLog: z.array(z.unknown()).optional(),
  feedbackKind: z.enum(['up', 'down', 'regenerate']).nullable().optional(),
  /// Wave-C auto-verify state. NULL on user rows and pre-Wave-C assistant
  /// rows. UI renders a small "verified" or "couldn't verify N specifics"
  /// badge based on the status; hides for null/skipped/pending/error.
  verifyStatus: z.enum(['pending', 'clean', 'issues', 'skipped', 'error']).nullable().optional(),
  verifyIssueCount: z.number().int().nullable().optional(),
})
export class ChatMessageDto extends createZodDto(ChatMessageSchema) {}

export const ConversationResponseSchema = z.object({
  id: z.string(),
  venueId: z.string(),
  userId: z.string().nullable(),
  channel: z.string(),
  visibility: z.enum(['private', 'org']),
  messages: z.array(ChatMessageSchema),
})
export class ConversationResponseDto extends createZodDto(ConversationResponseSchema) {}

export const UpdateConversationVisibilitySchema = z.object({
  visibility: z.enum(['private', 'org']),
})
export class UpdateConversationVisibilityDto extends createZodDto(
  UpdateConversationVisibilitySchema,
) {}

export const UpdateConversationVisibilityResponseSchema = z.object({
  id: z.string(),
  visibility: z.enum(['private', 'org']),
})
export class UpdateConversationVisibilityResponseDto extends createZodDto(
  UpdateConversationVisibilityResponseSchema,
) {}

export const SendChatMessageResponseSchema = z.object({
  conversationId: z.string(),
  assistantMessage: z.object({
    id: z.string(),
    content: z.string(),
    followUps: z.array(z.string()),
  }),
  toolCallLog: z.array(z.unknown()),
  retrievedItemIds: z.array(z.string()),
})
export class SendChatMessageResponseDto extends createZodDto(SendChatMessageResponseSchema) {}

export const ListConversationItemSchema = z.object({
  id: z.string(),
  venueId: z.string(),
  venueName: z.string(),
  lastMessageAt: z.string(),
  preview: z.string().nullable(),
})
export class ListConversationItemDto extends createZodDto(ListConversationItemSchema) {}

export const ListConversationsPageSchema = z.object({
  items: z.array(ListConversationItemSchema),
  /// Opaque cursor for the next page, or null if this is the final page.
  nextCursor: z.string().nullable(),
})
export class ListConversationsPageDto extends createZodDto(ListConversationsPageSchema) {}
