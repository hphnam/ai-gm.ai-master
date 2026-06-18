import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ReportSpecSchema } from '../../../types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

export const ReportSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  venueId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdByName: z.string().nullable(),
  title: z.string(),
  summary: z.string().nullable(),
  spec: ReportSpecSchema,
  createdAt: z.string(),
})
export class ReportDto extends createZodDto(ReportSchema) {}

export const ReportListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  venueId: z.string().nullable(),
  createdAt: z.string(),
})

export const ReportListResponseSchema = z.object({
  reports: z.array(ReportListItemSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nonnegative().nullable(),
})
export class ReportListResponseDto extends createZodDto(ReportListResponseSchema) {}

export const ReportIdParamSchema = z.object({ id: UUID })
export class ReportIdParamDto extends createZodDto(ReportIdParamSchema) {}

export const ListReportsQuerySchema = z.object({
  venueId: UUID.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
})
export class ListReportsQueryDto extends createZodDto(ListReportsQuerySchema) {}

export const CreateReportBodySchema = z.object({
  venueId: UUID.nullable().optional(),
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().max(500).optional(),
  spec: ReportSpecSchema,
})
export class CreateReportBodyDto extends createZodDto(CreateReportBodySchema) {}
