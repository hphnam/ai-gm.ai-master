import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/// Mirror of the SquareLocation type exposed by SquareService. Kept inline
/// so the HTTP surface doesn't import the service's runtime types.
export const SquareLocationSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  status: z.string().nullable(),
  type: z.string().nullable(),
  currency: z.string().nullable(),
  timezone: z.string().nullable(),
  address: z.string().nullable(),
})
export class SquareLocationDto extends createZodDto(SquareLocationSchema) {}

export const ListSquareLocationsResponseSchema = z.object({
  locations: z.array(SquareLocationSchema),
  /// Surfaces a human-readable detail string when the SDK call failed (e.g.
  /// "not connected", Square 401, Square outage). Null on success.
  error: z.string().nullable(),
})
export class ListSquareLocationsResponseDto extends createZodDto(
  ListSquareLocationsResponseSchema,
) {}
