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

// Special role a doc plays for the chat agent. Open union — add purposes here
// when a new in-context shortcut earns its place. Each purpose is enforced
// unique per (orgId, venueId) scope in DocsService.updateDoc.
export const DocPurposeSchema = z.enum(['org_chart'])
export type DocPurpose = z.infer<typeof DocPurposeSchema>

// Edit-and-re-ingest. All fields optional, but at least one required so the
// endpoint is never a no-op. Title and venue are cheap edits; description
// triggers a full re-enrich because it's prepended to content (signal for the
// classifier + embedder). docPurpose=null clears the purpose; omitting it leaves
// the existing purpose untouched.
export const UpdateDocRequestSchema = z
  .object({
    title: z.string().trim().min(1, 'title required').max(200).optional(),
    venueId: z.union([z.string().regex(UUID_RE, 'invalid uuid'), z.null()]).optional(),
    description: z.string().trim().max(1_000).optional(),
    docPurpose: DocPurposeSchema.nullable().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.venueId !== undefined ||
      v.description !== undefined ||
      v.docPurpose !== undefined,
    { message: 'at least one field required' },
  )
export type UpdateDocRequest = z.infer<typeof UpdateDocRequestSchema>

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

// AI-generated category suggestion shown in the "create new" branch of the
// classify modal. Wraps ClassifierService — if it finds a match in the org's
// existing types, returns that name (reuse-on-conflict dedupes the eventual
// create); if it proposes a fresh type, returns those fields.
export const CategorySuggestionResponseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: DocumentTypeKindSchema,
  description: z.string().nullable(),
  existing: z.boolean(),
})
export type CategorySuggestionResponse = z.infer<typeof CategorySuggestionResponseSchema>

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
  docPurpose: DocPurpose | null
  processingStatus: ProcessingStatus
  processingError: string | null
  createdAt: string
  updatedAt: string
}

/// Phase C — knowledge gap surfaced from chat for GM to answer.
export type KbGapAsker = {
  id: string
  name: string | null
  email: string | null
}

export type KbGapDto = {
  id: string
  question: string
  tentativeAnswer: string | null
  askCount: number
  askedByUserIds: string[]
  askedBy: KbGapAsker[]
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
