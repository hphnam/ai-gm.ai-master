import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
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
