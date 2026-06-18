import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const ID = z.string().min(1).max(64)

const PartySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
})

/// One row per teammate the user has exchanged at least one chat-category
/// message with. The "latest" metadata drives the list-row preview; the
/// `unreadCount` powers the per-conversation badge in the sidebar.
export const ConversationSummarySchema = z.object({
  otherParty: PartySchema,
  latestPreview: z.string(),
  latestAt: z.string(),
  latestFromMe: z.boolean(),
  // Whether the most-recent message in this conversation was AI-composed via
  // the chat tool (source='chat' on a Notification authored by the user).
  // Drives the "gm" affordance on the preview row.
  latestViaAi: z.boolean(),
  unreadCount: z.number().int().nonnegative(),
})
export class ConversationSummaryDto extends createZodDto(ConversationSummarySchema) {}

export const ListConversationsResponseSchema = z.object({
  conversations: z.array(ConversationSummarySchema),
})
export class ListConversationsResponseDto extends createZodDto(ListConversationsResponseSchema) {}

/// A single unified message in a conversation. Synthesised on the server from
/// the union of (a) Notifications between the two participants, and (b) any
/// NotificationReplies on those notifications. The client doesn't need to
/// know which underlying row a message came from — it just renders bubbles
/// in chronological order.
export const ConversationMessageSchema = z.object({
  id: z.string(),
  // 'note'  — a top-level Notification (could be the start of the thread or a
  //           subsequent direct note)
  // 'reply' — a NotificationReply on one of the notifications in the thread
  kind: z.enum(['note', 'reply']),
  body: z.string(),
  sentAt: z.string(),
  fromMe: z.boolean(),
  // Author detail is needed even though `fromMe` discriminates the side —
  // multi-tab UIs can render the other party's name/email on their bubbles.
  author: PartySchema.nullable(),
  // 'gm' message: a chat-tool-authored Notification. The recipient sees this
  // as a regular message from the author with a small "gm" badge so it's
  // clear the assistant composed it.
  viaAi: z.boolean(),
  // For top-level Notifications only: whether the recipient has read it.
  // Always 'read' for replies (no read-tracking on replies in the model).
  status: z.enum(['unread', 'read']),
  // Whether the requesting user can hard-delete this message for everyone.
  // True iff fromMe AND sentAt is within the 5-minute window. Client uses
  // this to decide whether to show "Delete for everyone" in the menu.
  canDeleteForAll: z.boolean(),
})
export class ConversationMessageDto extends createZodDto(ConversationMessageSchema) {}

export const ListConversationMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  // Opaque cursor for older-page pagination. The same base64(createdAt|id)
  // shape used elsewhere; service decodes and applies a "messages strictly
  // older than this point" predicate.
  cursor: z.string().max(256).optional(),
})
export class ListConversationMessagesQueryDto extends createZodDto(
  ListConversationMessagesQuerySchema,
) {}

export const ListConversationMessagesResponseSchema = z.object({
  messages: z.array(ConversationMessageSchema),
  // The conversation's other party — duplicated here so the chat-view header
  // can render without a separate lookup.
  otherParty: PartySchema,
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
})
export class ListConversationMessagesResponseDto extends createZodDto(
  ListConversationMessagesResponseSchema,
) {}

export const SendMessageBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
})
export class SendMessageBodyDto extends createZodDto(SendMessageBodySchema) {}

export const ConversationParamSchema = z.object({ otherUserId: ID })
export class ConversationParamDto extends createZodDto(ConversationParamSchema) {}

export const SendMessageResponseSchema = z.object({
  message: ConversationMessageSchema,
})
export class SendMessageResponseDto extends createZodDto(SendMessageResponseSchema) {}

export const MarkConversationReadResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
})
export class MarkConversationReadResponseDto extends createZodDto(
  MarkConversationReadResponseSchema,
) {}

export const DeleteMessageParamSchema = z.object({
  otherUserId: ID,
  kind: z.enum(['note', 'reply']),
  messageId: ID,
})
export class DeleteMessageParamDto extends createZodDto(DeleteMessageParamSchema) {}

export const DeleteMessageQuerySchema = z.object({
  scope: z.enum(['self', 'all']).optional().default('self'),
})
export class DeleteMessageQueryDto extends createZodDto(DeleteMessageQuerySchema) {}
