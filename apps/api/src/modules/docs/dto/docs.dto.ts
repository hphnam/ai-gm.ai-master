import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  AcceptTypeRequestSchema,
  AnswerGapRequestSchema,
  AudienceSchema,
  ChecklistStepSchema,
  CreateDocRequestSchema,
  DocPurposeSchema,
  DocumentTypeKindSchema,
  ProposedDocTypeSchema,
  ScheduleSchema,
  UpdateDocRequestSchema,
  UUID_RE,
} from '../../../types'

// Inputs
export const DocIdParamSchema = z.object({
  id: z.string().regex(UUID_RE, 'invalid uuid'),
})
export class DocIdParamDto extends createZodDto(DocIdParamSchema) {}

export class CreateDocRequestDto extends createZodDto(CreateDocRequestSchema) {}
export class AcceptTypeRequestDto extends createZodDto(AcceptTypeRequestSchema) {}
// ClassifyDocRequestSchema is a z.union — createZodDto can't extend unions.
// The controller validates this body manually via zodPipe(ClassifyDocRequestSchema).
export class AnswerGapRequestDto extends createZodDto(AnswerGapRequestSchema) {}
export class UpdateDocRequestDto extends createZodDto(UpdateDocRequestSchema) {}

// Response shapes — derived from @gm-ai/types TS definitions.
const DocumentTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  schema: z.record(z.string(), z.unknown()),
  kind: DocumentTypeKindSchema,
})
export class DocumentTypeDto extends createZodDto(DocumentTypeSchema) {}

const ChecklistSchema = z.object({
  id: z.string(),
  knowledgeItemId: z.string(),
  title: z.string(),
  steps: z.array(ChecklistStepSchema),
  schedule: ScheduleSchema,
  audience: AudienceSchema,
  extractedAt: z.string(),
})
export class ChecklistDto extends createZodDto(ChecklistSchema) {}

const ProcessingStatusSchema = z.enum(['processing', 'ready', 'failed'])

export const DocListItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  contentPreview: z.string(),
  venueId: z.string().nullable(),
  venueName: z.string().nullable(),
  summary: z.string().nullable(),
  tags: z.array(z.string()),
  docType: z.string().nullable(),
  documentType: DocumentTypeSchema.nullable(),
  pendingTypeProposal: ProposedDocTypeSchema.nullable(),
  isProcedural: z.boolean(),
  processingStatus: ProcessingStatusSchema,
  processingError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export class DocListItemDto extends createZodDto(DocListItemSchema) {}

export const CreateDocResponseSchema = z.object({
  id: z.string(),
  summary: z.string().nullable(),
  tags: z.array(z.string()),
  docType: z.string().nullable(),
  failSoft: z.boolean(),
  documentType: DocumentTypeSchema.nullable(),
  pendingTypeProposal: ProposedDocTypeSchema.nullable(),
  checklist: ChecklistSchema.nullable(),
  processingStatus: ProcessingStatusSchema,
})
export class CreateDocResponseDto extends createZodDto(CreateDocResponseSchema) {}

export const DocDetailSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  venueId: z.string().nullable(),
  venueName: z.string().nullable(),
  summary: z.string().nullable(),
  tags: z.array(z.string()),
  docType: z.string().nullable(),
  documentType: DocumentTypeSchema.nullable(),
  pendingTypeProposal: ProposedDocTypeSchema.nullable(),
  checklist: ChecklistSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()),
  docPurpose: DocPurposeSchema.nullable(),
  processingStatus: ProcessingStatusSchema,
  processingError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export class DocDetailDto extends createZodDto(DocDetailSchema) {}

const KbGapAskerSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
})

export const KbGapSchema = z.object({
  id: z.string(),
  question: z.string(),
  tentativeAnswer: z.string().nullable(),
  askCount: z.number(),
  askedByUserIds: z.array(z.string()),
  askedBy: z.array(KbGapAskerSchema),
  venueId: z.string().nullable(),
  venueName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastAskedAt: z.string().nullable(),
})
export class KbGapDto extends createZodDto(KbGapSchema) {}

export const NoDataQuerySchema = z.object({
  query: z.string(),
  askCount: z.number(),
  lastAskedAt: z.string(),
})
export class NoDataQueryDto extends createZodDto(NoDataQuerySchema) {}

// Body for promote + dismiss endpoints. We pass the verbatim query string —
// the service lower-cases it for matching against `dismissed_no_data_queries`.
// Min length 5 mirrors recordGap's floor so the promote path can't 500 on a
// service-level validation that the DTO would have caught.
export const NoDataQueryActionSchema = z.object({
  query: z.string().trim().min(5, 'query too short').max(500),
})
export class NoDataQueryActionDto extends createZodDto(NoDataQueryActionSchema) {}

export const NoDataQueryPromoteResponseSchema = z.object({
  gapId: z.string(),
  askCount: z.number(),
  dedupedFromExisting: z.boolean(),
})
export class NoDataQueryPromoteResponseDto extends createZodDto(NoDataQueryPromoteResponseSchema) {}

export const CategorySuggestionSchema = z.object({
  name: z.string(),
  kind: DocumentTypeKindSchema,
  description: z.string().nullable(),
  existing: z.boolean(),
})
export class CategorySuggestionDto extends createZodDto(CategorySuggestionSchema) {}

const GapKbMatchSchema = z.object({
  docId: z.string(),
  title: z.string().nullable(),
  snippet: z.string(),
  similarity: z.number(),
})
export class GapKbMatchDto extends createZodDto(GapKbMatchSchema) {}

// Library list pagination + server-side filters. Cursor is opaque base64; the
// service decodes it. Limit is clamped server-side (default 20, max 50).
export const DocListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z
    .union([z.literal('all'), z.literal('unclassified'), z.string().regex(UUID_RE)])
    .optional(),
  venue: z.union([z.literal('all'), z.literal('global'), z.string().regex(UUID_RE)]).optional(),
  status: z.enum(['all', 'ready', 'processing', 'attention']).optional(),
  sort: z.enum(['recent', 'oldest', 'name']).optional(),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})
export class DocListQueryDto extends createZodDto(DocListQuerySchema) {}

export const DocListResponseSchema = z.object({
  items: z.array(DocListItemSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
})
export class DocListResponseDto extends createZodDto(DocListResponseSchema) {}
