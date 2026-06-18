import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

export const WauQuerySchema = z.object({
  venueId: UUID,
  weeks: z.coerce.number().int().min(1).max(52).default(12),
})
export class WauQueryDto extends createZodDto(WauQuerySchema) {}

export const WauBucketSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  activeUsers: z.number().int().min(0),
  messageCount: z.number().int().min(0),
})

export const WauResponseSchema = z.object({
  venueId: z.string(),
  weeks: z.array(WauBucketSchema),
})
export class WauResponseDto extends createZodDto(WauResponseSchema) {}
