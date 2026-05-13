import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { UUID_RE } from '../../../types'

export const NudgeVenueIdParamSchema = z.object({
  venueId: z.string().regex(UUID_RE, 'invalid uuid'),
})
export class NudgeVenueIdParamDto extends createZodDto(NudgeVenueIdParamSchema) {}

export const RunNudgeResponseSchema = z.object({
  sent: z.boolean(),
  reason: z.string().optional(),
  preview: z.string().optional(),
})
export class RunNudgeResponseDto extends createZodDto(RunNudgeResponseSchema) {}
