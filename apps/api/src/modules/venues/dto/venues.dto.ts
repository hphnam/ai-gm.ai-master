import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
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
  squareLocationId: z.string().nullable(),
})
export class VenueDetailDto extends createZodDto(VenueDetailSchema) {}

/// Manager-only endpoint payload — maps a venue to a Square location id (or
/// clears the mapping with null). The id is intentionally typed as a free
/// string because Square location ids are 16-char base32 without dashes; we
/// don't enforce a regex here so a Square format change doesn't break the
/// product. Length cap is defensive.
export const UpdateVenueSquareLocationBodySchema = z.object({
  squareLocationId: z.string().min(1).max(64).nullable(),
})
export class UpdateVenueSquareLocationBodyDto extends createZodDto(
  UpdateVenueSquareLocationBodySchema,
) {}
