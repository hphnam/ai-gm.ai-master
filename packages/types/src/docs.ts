import { z } from 'zod'
import { UUID_RE } from './api'

export const CreateDocRequestSchema = z.object({
  title: z.string().trim().min(1, 'title required').max(200),
  content: z.string().trim().min(1, 'content required').max(50_000),
  venueId: z.union([z.string().regex(UUID_RE, 'invalid uuid'), z.null()]),
  // Optional uploader-supplied brief; prepended to content server-side so
  // the classifier + embedder + chat retrieval all see the user's intent hint.
  description: z.string().trim().max(1_000).optional(),
})
export type CreateDocRequest = z.infer<typeof CreateDocRequestSchema>

// Plan 04-03 Task 1 — DocumentType kind enum (shipped as TEXT + Zod; native enum
// avoided because tenant-owned taxonomy columns incur migration cost on every new value).
export const DocumentTypeKindSchema = z.enum(['reference', 'procedural'])
export type DocumentTypeKind = z.infer<typeof DocumentTypeKindSchema>

// Plan 04-02 Task 2 — per-tenant classifier output shape (owner-confirmable).
// `.passthrough()` on schema preserves emergent per-doc-type keys the classifier proposes
// (same agentic pattern as KnowledgeMetadataSchema — PROJECT.md Key Decision 2026-04-18).
// Plan 04-03 Task 1 — `kind` added; defaults to 'reference' when classifier omits it.
export const ProposedDocTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(400).nullable(),
    schema: z.record(z.string(), z.unknown()).default({}),
    confidence: z.number().min(0).max(1),
    kind: DocumentTypeKindSchema.default('reference'),
  })
  .passthrough()
export type ProposedDocType = z.infer<typeof ProposedDocTypeSchema>

export type DocumentTypeDto = {
  id: string
  name: string
  description: string | null
  schema: Record<string, unknown>
  kind: DocumentTypeKind
}

// Plan 04-03 Task 3 — accept-type body gains optional kind override.
// Absent = use proposal's kind; present = owner explicitly flips.
// Added: optional `name` override so an owner can rename the proposed category
// before it's saved (e.g. classifier said "Cellar Log" but the venue calls it
// "Cellar Diary" — no need to reject+reclassify just for a label).
export const AcceptTypeRequestSchema = z
  .object({
    kind: DocumentTypeKindSchema.optional(),
    name: z.string().trim().min(1).max(80).optional(),
  })
  .passthrough()
export type AcceptTypeRequest = z.infer<typeof AcceptTypeRequestSchema>
export type AcceptTypeResponse = DocumentTypeDto

// Manual classification for rows the classifier returned 'none' on. Caller picks
// an existing DocumentType by id OR creates a new one (name + kind).
export const ClassifyDocRequestSchema = z.union([
  z.object({
    typeId: z.string().regex(UUID_RE, 'invalid uuid'),
  }),
  z.object({
    name: z.string().trim().min(1).max(80),
    kind: DocumentTypeKindSchema,
  }),
])
export type ClassifyDocRequest = z.infer<typeof ClassifyDocRequestSchema>
export type ClassifyDocResponse = DocumentTypeDto

// Plan 04-03 Task 1 — Checklist entity contracts.
// Every shape uses `.passthrough()` so Claude-proposed emergent keys survive persistence.
export const ChecklistStepKindSchema = z.enum(['tick', 'numeric', 'photo', 'text'])
export type ChecklistStepKind = z.infer<typeof ChecklistStepKindSchema>

export const ChecklistStepSchema = z
  .object({
    index: z.number().int().min(0),
    text: z.string().trim().min(1).max(500),
    kind: ChecklistStepKindSchema.default('tick'),
    required: z.boolean().default(true),
    hint: z.string().trim().max(400).nullable().default(null),
  })
  .passthrough()
export type ChecklistStep = z.infer<typeof ChecklistStepSchema>

export const ScheduleCadenceSchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'shift-start',
  'shift-end',
  'ad-hoc',
  'unknown',
])
export type ScheduleCadence = z.infer<typeof ScheduleCadenceSchema>

export const ScheduleSchema = z
  .object({
    rawText: z.string().trim().max(200).default(''),
    cadence: ScheduleCadenceSchema.default('unknown'),
    timeOfDay: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .default(null),
    dayOfWeek: z.number().int().min(0).max(6).nullable().default(null),
    dayOfMonth: z.number().int().min(1).max(31).nullable().default(null),
    notes: z.string().trim().max(400).nullable().default(null),
  })
  .passthrough()
export type Schedule = z.infer<typeof ScheduleSchema>

export const AudienceRoleSchema = z.enum(['staff', 'manager', 'owner'])
export type AudienceRole = z.infer<typeof AudienceRoleSchema>

export const AudienceSchema = z
  .object({
    rawText: z.string().trim().max(200).default(''),
    roles: z.array(AudienceRoleSchema).max(3).default([]),
    notes: z.string().trim().max(400).nullable().default(null),
  })
  .passthrough()
export type Audience = z.infer<typeof AudienceSchema>

export type ChecklistDto = {
  id: string
  knowledgeItemId: string
  title: string
  steps: ChecklistStep[]
  schedule: Schedule
  audience: Audience
  extractedAt: string
}

// Plan 04-03 Task 1 (audit-M4) — instance-key format contract between this plan (schema shipper)
// and Plan 04-04 (scheduler writer). The @@unique([checklistId, instanceKey]) DB constraint only
// guarantees uniqueness; this schema guarantees format so lookups are deterministic.
export const CHECKLIST_INSTANCE_KEY_REGEX = {
  daily: /^\d{4}-\d{2}-\d{2}$/,
  weekly: /^\d{4}-W\d{2}$/,
  monthly: /^\d{4}-\d{2}$/,
  adhoc: /^ad-hoc-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
} as const

export const ChecklistInstanceKeySchema = z
  .string()
  .refine(
    (v) =>
      CHECKLIST_INSTANCE_KEY_REGEX.daily.test(v) ||
      CHECKLIST_INSTANCE_KEY_REGEX.weekly.test(v) ||
      CHECKLIST_INSTANCE_KEY_REGEX.monthly.test(v) ||
      CHECKLIST_INSTANCE_KEY_REGEX.adhoc.test(v),
    { message: 'instanceKey must match daily / weekly / monthly / ad-hoc format' },
  )
export type ChecklistInstanceKey = z.infer<typeof ChecklistInstanceKeySchema>

export type ProcessingStatus = 'processing' | 'ready' | 'failed'

export type DocListItem = {
  id: string
  title: string | null
  contentPreview: string
  venueId: string | null
  venueName: string | null
  summary: string | null
  tags: string[]
  docType: string | null
  documentType: DocumentTypeDto | null
  pendingTypeProposal: ProposedDocType | null
  isProcedural: boolean
  processingStatus: ProcessingStatus
  processingError: string | null
  createdAt: string
  updatedAt: string
}

export type CreateDocResponse = {
  id: string
  summary: string | null
  tags: string[]
  docType: string | null
  failSoft: boolean
  documentType: DocumentTypeDto | null
  pendingTypeProposal: ProposedDocType | null
  checklist: ChecklistDto | null
  processingStatus: ProcessingStatus
}

export type DocDetail = {
  id: string
  title: string | null
  content: string
  venueId: string | null
  venueName: string | null
  summary: string | null
  tags: string[]
  docType: string | null
  documentType: DocumentTypeDto | null
  pendingTypeProposal: ProposedDocType | null
  checklist: ChecklistDto | null
  metadata: Record<string, unknown>
  processingStatus: ProcessingStatus
  processingError: string | null
  createdAt: string
  updatedAt: string
}

/// Phase C — knowledge gap surfaced from chat for GM to answer.
export type KbGapDto = {
  id: string
  question: string
  tentativeAnswer: string | null
  askCount: number
  askedByUserIds: string[]
  venueId: string | null
  venueName: string | null
  createdAt: string
  updatedAt: string
  lastAskedAt: string | null
}

export const AnswerGapRequestSchema = z.object({
  answer: z.string().trim().min(5, 'answer too short').max(50_000),
})
export type AnswerGapRequest = z.infer<typeof AnswerGapRequestSchema>
