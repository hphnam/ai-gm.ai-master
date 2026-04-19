import { z } from 'zod'
import { UUID_RE } from './api'

export const CreateDocRequestSchema = z.object({
  title: z.string().trim().min(1, 'title required').max(200),
  content: z.string().trim().min(1, 'content required').max(50_000),
  venueId: z.union([z.string().regex(UUID_RE, 'invalid uuid'), z.null()]),
})
export type CreateDocRequest = z.infer<typeof CreateDocRequestSchema>

export type DocListItem = {
  id: string
  title: string | null
  contentPreview: string
  venueId: string | null
  venueName: string | null
  summary: string | null
  tags: string[]
  docType: string | null
  createdAt: string
  updatedAt: string
}

export type CreateDocResponse = {
  id: string
  summary: string | null
  tags: string[]
  docType: string | null
  failSoft: boolean
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
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
