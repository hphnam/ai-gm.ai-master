import { z } from 'zod'

export const KnowledgeCrossRefSchema = z.object({
  id: z.string().uuid().optional(),
  ref: z.string().optional(),
})

export const KnowledgeMetadataSchema = z
  .object({
    title: z.string().nullable().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).optional(),
    docType: z.string().optional(),
    category: z.string().optional(),
    crossRefs: z.array(KnowledgeCrossRefSchema).optional(),
  })
  .passthrough()

export type KnowledgeCrossRef = z.infer<typeof KnowledgeCrossRefSchema>
export type KnowledgeMetadata = z.infer<typeof KnowledgeMetadataSchema>
