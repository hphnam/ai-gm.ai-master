import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

const FrequencySchema = z.enum(['daily', 'weekly', 'monthly'])
const StatusSchema = z.enum(['active', 'paused', 'cancelled'])

export const ScheduledReportSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  venueId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdByName: z.string().nullable(),
  title: z.string(),
  summary: z.string().nullable(),
  frequency: FrequencySchema,
  hourOfDay: z.number().int(),
  dayOfWeek: z.number().int().nullable(),
  dayOfMonth: z.number().int().nullable(),
  timezone: z.string(),
  prompt: z.string().nullable(),
  status: StatusSchema,
  nextRunAt: z.string(),
  lastRunAt: z.string().nullable(),
  lastReportId: z.string().nullable(),
  runCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export class ScheduledReportDto extends createZodDto(ScheduledReportSchema) {}

export const ScheduledReportListResponseSchema = z.object({
  schedules: z.array(ScheduledReportSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nonnegative().nullable(),
})
export class ScheduledReportListResponseDto extends createZodDto(
  ScheduledReportListResponseSchema,
) {}

export const ScheduledReportIdParamSchema = z.object({ id: UUID })
export class ScheduledReportIdParamDto extends createZodDto(ScheduledReportIdParamSchema) {}

export const ListScheduledReportsQuerySchema = z.object({
  status: z.union([StatusSchema, z.literal('all')]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
})
export class ListScheduledReportsQueryDto extends createZodDto(ListScheduledReportsQuerySchema) {}

// We enforce frequency-conditional shape (weekly needs dayOfWeek; monthly needs
// dayOfMonth) here at the boundary AND in the service so direct-service callers
// (the agent tool path) get the same guarantees.
export const CreateScheduledReportBodySchema = z
  .object({
    venueId: UUID.nullable().optional(),
    title: z.string().trim().min(3).max(200),
    summary: z.string().trim().max(500).optional(),
    frequency: FrequencySchema,
    hourOfDay: z.number().int().min(0).max(23).optional(),
    dayOfWeek: z.number().int().min(1).max(7).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    prompt: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.frequency !== 'weekly' || typeof v.dayOfWeek === 'number', {
    message: 'weekly schedule requires dayOfWeek (1=Mon..7=Sun)',
    path: ['dayOfWeek'],
  })
  .refine((v) => v.frequency !== 'monthly' || typeof v.dayOfMonth === 'number', {
    message: 'monthly schedule requires dayOfMonth (1-28)',
    path: ['dayOfMonth'],
  })
export class CreateScheduledReportBodyDto extends createZodDto(CreateScheduledReportBodySchema) {}
