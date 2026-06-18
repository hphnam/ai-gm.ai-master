// Plan 06-04 Task 1 — relocated from chat-v1 chat.service.ts during migration.
// Types are now owned by `apps/api/src/types/chat-message.ts`. chat-v1's
// chat.service.ts re-exports them transitionally; chat-core imports from here
// directly. After 06-04 Task 7 deletes chat-v1, the re-export shim disappears.
//
// Schema: SendMessageInput (Zod) + SendMessageResult / ToolCallLogEntry (TS).
// Identical contract to the prior chat-v1 surface — call-site shape preserved
// for both ChatService.sendMessage and ChatCoreService.sendMessage.

import { z } from 'zod'

const MAX_USER_MESSAGE_CHARS = 8000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const SendMessageInputSchema = z.object({
  conversationId: z.string().regex(UUID_RE, 'invalid uuid').optional(),
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
  userMessage: z.string().min(1).max(MAX_USER_MESSAGE_CHARS),
  // 03-03 Task 3 / 06-04: optional image attachment for multimodal turns.
  // Used by both web /chat/messages/with-image (06-04 Task 1) and WhatsApp
  // inbound (whatsapp.service.ts after 06-04 Task 4 migration).
  attachment: z
    .object({
      mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
      base64: z.string().min(1),
      // audit S2: channel-specific source ref (e.g. Infobip inbound messageId) for forensics.
      sourceRef: z.string().min(1).max(64).optional(),
    })
    .optional(),
})

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>

export type ToolCallLogEntry = {
  round: number
  toolUseId: string
  tool: string
  input: unknown
  result: unknown
}

export type SendMessageResult = {
  conversationId: string
  assistantMessage: { id: string; content: string; followUps: string[] }
  toolCallLog: ToolCallLogEntry[]
  retrievedItemIds: string[]
}
