import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  AcceptTypeRequestSchema,
  AnswerGapRequestSchema,
  AudienceSchema,
  ChecklistStepSchema,
  CreateDocRequestSchema,
  DocumentTypeKindSchema,
  ProposedDocTypeSchema,
  ScheduleSchema,
  UUID_RE,
} from '@gm-ai/types'

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
