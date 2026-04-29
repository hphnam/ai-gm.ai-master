import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'
import {
  CreateVenueBodySchema,
  UpdateVenueProfileSchema,
  UUID_RE,
  VenueProfileSchema,
} from '../../../types'

export const VenueIdParamSchema = z.object({
  id: z.string().regex(UUID_RE, 'invalid uuid'),
})
export class VenueIdParamDto extends createZodDto(VenueIdParamSchema) {}

export class CreateVenueBodyDto extends createZodDto(CreateVenueBodySchema) {}
export class UpdateVenueProfileDto extends createZodDto(UpdateVenueProfileSchema) {}

// Response schemas — needed so Swagger can describe response shapes.
// Currently @gm-ai/types only exposes these as TS types.
export const VenueListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  type: z.string(),
  timezone: z.string(),
})
export class VenueListItemDto extends createZodDto(VenueListItemSchema) {}

export const VenueDetailSchema = VenueListItemSchema.extend({
  profile: VenueProfileSchema,
})
export class VenueDetailDto extends createZodDto(VenueDetailSchema) {}
