import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

/// Canonical category slugs surfaced by the extractor and the UI. The Prisma
/// column is open-text so the extractor can return a slug we haven't shipped
/// in the picker yet — but the dashboard groups and tone-of-voice rules key
/// off these. Adding a new category here is the contract change; the DB
/// requires no migration.
export const COMPLIANCE_CATEGORIES = [
  'food_hygiene',
  'personal_licence',
  'premises_licence',
  'pat',
  'gas_safety',
  'fire_risk',
  'insurance',
  'equipment_service',
  'other',
] as const
export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number]

export const EXPIRY_STATUSES = ['active', 'renewed', 'expired', 'dismissed'] as const
export type ExpiryStatus = (typeof EXPIRY_STATUSES)[number]

export const ExpiryRecordSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  venueId: z.string().nullable(),
  knowledgeItemId: z.string().nullable(),
  title: z.string(),
  category: z.string(),
  expiresAt: z.string(),
  personUserId: z.string().nullable(),
  personName: z.string().nullable(),
  assetName: z.string().nullable(),
  renewalCostGbp: z.number().nullable(),
  status: z.enum(EXPIRY_STATUSES),
  reminded30At: z.string().nullable(),
  reminded7At: z.string().nullable(),
  reminded1At: z.string().nullable(),
  remindedOverdueAt: z.string().nullable(),
  extractionConfidence: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export class ExpiryRecordDto extends createZodDto(ExpiryRecordSchema) {}

export const ListExpiryRecordsQuerySchema = z.object({
  status: z.enum(['active', 'renewed', 'expired', 'dismissed', 'all']).optional().default('active'),
  venueId: UUID.optional(),
  category: z.string().trim().min(1).max(64).optional(),
  /// Window filter — e.g. 30 days returns records expiring in the next 30 days
  /// INCLUDING already-overdue active ones. Omit for the unfiltered list.
  withinDays: z.coerce.number().int().min(1).max(3650).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
})
export class ListExpiryRecordsQueryDto extends createZodDto(ListExpiryRecordsQuerySchema) {}

export const ListExpiryRecordsResponseSchema = z.object({
  records: z.array(ExpiryRecordSchema),
  activeCount: z.number(),
  overdueCount: z.number(),
  within30dCount: z.number(),
})
export class ListExpiryRecordsResponseDto extends createZodDto(ListExpiryRecordsResponseSchema) {}

export const CreateExpiryRecordBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z.string().trim().min(1).max(64),
  expiresAt: z.string().datetime(),
  venueId: UUID.optional().nullable(),
  personUserId: z.string().min(1).max(64).optional().nullable(),
  personName: z.string().trim().min(1).max(120).optional().nullable(),
  assetName: z.string().trim().min(1).max(120).optional().nullable(),
  renewalCostGbp: z.number().nonnegative().max(1_000_000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
})
export class CreateExpiryRecordBodyDto extends createZodDto(CreateExpiryRecordBodySchema) {}

export const UpdateExpiryRecordBodySchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    category: z.string().trim().min(1).max(64).optional(),
    expiresAt: z.string().datetime().optional(),
    venueId: UUID.nullable().optional(),
    personUserId: z.string().min(1).max(64).nullable().optional(),
    personName: z.string().trim().min(1).max(120).nullable().optional(),
    assetName: z.string().trim().min(1).max(120).nullable().optional(),
    renewalCostGbp: z.number().nonnegative().max(1_000_000).nullable().optional(),
    status: z.enum(EXPIRY_STATUSES).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'at least one field must be provided' })
export class UpdateExpiryRecordBodyDto extends createZodDto(UpdateExpiryRecordBodySchema) {}

export const ExpiryRecordIdParamSchema = z.object({ id: UUID })
export class ExpiryRecordIdParamDto extends createZodDto(ExpiryRecordIdParamSchema) {}

export const SingleExpiryRecordResponseSchema = z.object({ record: ExpiryRecordSchema })
export class SingleExpiryRecordResponseDto extends createZodDto(SingleExpiryRecordResponseSchema) {}
