import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

export const StarterQuestionSchema = z.object({
  /// The clickable prompt — phrased the way a GM / shift lead would ask it,
  /// not a marketing tagline. 6-160 chars.
  text: z.string().min(6).max(160),
  /// Tag used by the UI for grouping or icons. Free-form; common values:
  /// 'compliance', 'stock', 'rota', 'supplier', 'sop', 'incident', 'general'.
  category: z.string().min(1).max(32).optional(),
})
export type StarterQuestion = z.infer<typeof StarterQuestionSchema>

export const ChatStartersPayloadSchema = z.object({
  venueId: z.string(),
  questions: z.array(StarterQuestionSchema).min(1).max(8),
  /// Where this payload came from — used by the UI for a subtle freshness
  /// indicator and by tests to assert that lazy fallbacks work.
  source: z.enum(['generated', 'fallback']),
  /// ISO timestamp the AI generator produced these. NULL for fallback.
  generatedAt: z.string().nullable(),
})
export class ChatStartersPayloadDto extends createZodDto(ChatStartersPayloadSchema) {}

export const ChatStartersQuerySchema = z.object({
  venueId: UUID,
})
export class ChatStartersQueryDto extends createZodDto(ChatStartersQuerySchema) {}
