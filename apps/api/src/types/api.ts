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
  // v0.2 Phase 1 — Phone linking (Plan 01-03; append-only)
  'phone-invalid-format',
  'phone-invalid-code',
  'phone-already-linked',
  'phone-change-requires-unlink',
  'phone-verification-failed',
  'phone-rate-limited',
  'phone-service-unavailable',
  // v0.2 Phase 2 — Document upload (Plan 02-02; append-only)
  'file-too-large',
  'unsupported-file-type',
  'extraction-failed',
  // v0.2 Phase 4 — Document taxonomy (Plan 04-02; append-only)
  'type-proposal-missing',
  'type-name-conflict',
  // v0.2 Phase 4 — Procedural doc model (Plan 04-03; append-only)
  // Reserved for the future retry-extract endpoint (D-04-03-F); no current endpoint returns this.
  'checklist-extraction-failed',
  // AI suggest-name button — classifier returned 'none' (low signal).
  'category-suggestion-unavailable',
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

// Streaming endpoint — same contract as SendChatMessageRequest. Kept as a
// separate type so its payload can evolve (e.g. rich message parts) without
// breaking the WhatsApp-path POST /chat/messages schema.
export const StreamChatMessageRequestSchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
  userMessage: userMessageField,
  conversationId: z.string().regex(UUID_RE, 'invalid uuid').optional(),
})
export type StreamChatMessageRequest = z.infer<typeof StreamChatMessageRequestSchema>

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

/// Phase D — structured venue operational profile. All fields optional so
/// owners can fill incrementally. The agent reads this on every conversation
/// (auto-loaded into prompt context) so it knows fire escapes, hours,
/// alarm policy, etc. without spending a tool call.
export const VenueProfileSchema = z
  .object({
    layoutNotes: z.string().trim().max(2_000).optional(),
    fireEscapes: z.array(z.string().trim().min(1).max(240)).max(10).optional(),
    firstAidPoints: z.array(z.string().trim().min(1).max(240)).max(10).optional(),
    keySafePolicy: z.string().trim().max(500).optional(),
    alarmPolicy: z.string().trim().max(500).optional(),
    openingHours: z.string().trim().max(500).optional(),
    what3words: z.string().trim().max(60).optional(),
    accessibilityNotes: z.string().trim().max(500).optional(),
    deliveryNotes: z.string().trim().max(500).optional(),
    /// Optional KnowledgeItem id pointing to an uploaded floor-plan image
    /// (use the existing /docs upload flow with documentType=floor_plan).
    floorPlanKnowledgeItemId: z.string().regex(UUID_RE, 'invalid uuid').nullable().optional(),
  })
  .strict()
export type VenueProfile = z.infer<typeof VenueProfileSchema>

export const UpdateVenueProfileSchema = VenueProfileSchema.partial()
export type UpdateVenueProfile = z.infer<typeof UpdateVenueProfileSchema>

export type VenueDetail = VenueListItem & {
  profile: VenueProfile
  /// Mapping to the connected POS integration's location (Square Location.id).
  /// Null when no POS is connected or no mapping has been assigned yet.
  squareLocationId: string | null
}

export type ChatMessageDto = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  retrievedItemIds: string[]
  followUps?: string[]
  /** Extended thinking text (adaptive reasoning). Null for user messages. */
  reasoning?: string | null
  /**
   * UIMessage content parts snapshot — arbitrary JSON matching the AI SDK
   * `UIMessage['parts']` shape. Used to faithfully replay assistant turns
   * with reasoning + tool chips in order.
   */
  parts?: unknown
  /**
   * Legacy tool-call log entries. Only populated on older assistant rows
   * that pre-date the `parts` snapshot; used client-side to synthesise tool
   * chips for historical replay.
   */
  toolCallLog?: unknown[]
  /** Persisted feedback for this assistant message, if any. */
  feedbackKind?: 'up' | 'down' | 'regenerate' | null
}

export type SendChatMessageResponse = {
  conversationId: string
  assistantMessage: { id: string; content: string; followUps: string[] }
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
