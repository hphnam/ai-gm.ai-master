import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import { CaptureFeedbackInputSchema } from '../../../types'

export class CaptureFeedbackInputDto extends createZodDto(CaptureFeedbackInputSchema) {}

export const FeedbackResponseSchema = z.object({
  ok: z.literal(true),
  feedbackId: z.string(),
  enqueuedCount: z.number(),
  dedupedCount: z.number(),
  exhaustedCount: z.number(),
})
export class FeedbackResponseDto extends createZodDto(FeedbackResponseSchema) {}
