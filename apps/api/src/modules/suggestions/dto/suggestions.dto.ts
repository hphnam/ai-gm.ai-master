import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { SuggestionsOnOpenRequestSchema, SuggestionsOnTurnRequestSchema } from '../../../types'

export class SuggestionsOnOpenRequestDto extends createZodDto(SuggestionsOnOpenRequestSchema) {}
export class SuggestionsOnTurnRequestDto extends createZodDto(SuggestionsOnTurnRequestSchema) {}

export const ProactiveSuggestionSchema = z.object({
  kind: z.enum(['below-par', 'cutoff']),
  severity: z.enum(['info', 'warn']),
  text: z.string(),
  itemIds: z.array(z.string()),
  sourceToolCall: z.object({
    tool: z.string(),
    input: z.record(z.string(), z.unknown()),
  }),
  generatedAt: z.string(),
})
export class ProactiveSuggestionDto extends createZodDto(ProactiveSuggestionSchema) {}
