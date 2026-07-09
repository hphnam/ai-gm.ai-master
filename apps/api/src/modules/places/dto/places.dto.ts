import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const PlacesSearchSchema = z
  .object({
    query: z.string().trim().min(2).max(200),
  })
  .strict()
export class PlacesSearchDto extends createZodDto(PlacesSearchSchema) {}

const PlaceCandidateSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  businessType: z.string().nullable(),
  venueType: z.string(),
  country: z.string().nullable(),
  currency: z.string().nullable(),
  timezone: z.string().nullable(),
  openingHours: z.string().nullable(),
  description: z.string().nullable(),
})

export const PlacesSearchResponseSchema = z.object({
  available: z.boolean(),
  candidates: z.array(PlaceCandidateSchema),
  error: z.literal('lookup-failed').optional(),
})
export class PlacesSearchResponseDto extends createZodDto(PlacesSearchResponseSchema) {}
export type PlacesSearchResponse = z.infer<typeof PlacesSearchResponseSchema>
