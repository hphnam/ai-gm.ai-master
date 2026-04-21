import { z } from 'zod'
import { UUID_RE } from './api'

export const CreateDocRequestSchema = z.object({
  title: z.string().trim().min(1, 'title required').max(200),
  content: z.string().trim().min(1, 'content required').max(50_000),
  venueId: z.union([z.string().regex(UUID_RE, 'invalid uuid'), z.null()]),
})
export type CreateDocRequest = z.infer<typeof CreateDocRequestSchema>

// Plan 04-02 Task 2 — per-tenant classifier output shape (owner-confirmable).
// `.passthrough()` on schema preserves emergent per-doc-type keys the classifier proposes
// (same agentic pattern as KnowledgeMetadataSchema — PROJECT.md Key Decision 2026-04-18).
export const ProposedDocTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(400).nullable(),
    schema: z.record(z.string(), z.unknown()).default({}),
    confidence: z.number().min(0).max(1),
  })
  .passthrough()
export type ProposedDocType = z.infer<typeof ProposedDocTypeSchema>

export type DocumentTypeDto = {
  id: string
  name: string
  description: string | null
  schema: Record<string, unknown>
}

// Accept/reject endpoints take no body — server reads the pending proposal from DB.
export const AcceptTypeRequestSchema = z.object({}).passthrough()
export type AcceptTypeRequest = z.infer<typeof AcceptTypeRequestSchema>
export type AcceptTypeResponse = DocumentTypeDto

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
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
