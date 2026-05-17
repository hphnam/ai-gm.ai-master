import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

const ISO_DATETIME = z
  .string()
  .datetime({ offset: true })
  .transform((s) => new Date(s))

/// Query for GET /metrics/hours-recovered.
/// venueId optional — omit for a whole-org rollup.
/// from/to optional ISO 8601 — default to "last 7 days ending now".
/// Range cap is 366 days; longer ranges are rejected to keep the SQL bounded.
export const HoursRecoveredQuerySchema = z
  .object({
    venueId: UUID.optional(),
    from: ISO_DATETIME.optional(),
    to: ISO_DATETIME.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.from && v.to && v.from.getTime() > v.to.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '`from` must be before `to`',
        path: ['from'],
      })
    }
    if (v.from && v.to) {
      const days = (v.to.getTime() - v.from.getTime()) / (1000 * 60 * 60 * 24)
      if (days > 366) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'range cannot exceed 366 days',
          path: ['to'],
        })
      }
    }
  })
export class HoursRecoveredQueryDto extends createZodDto(HoursRecoveredQuerySchema) {}

export const HoursRecoveredResponseSchema = z.object({
  queriesCount: z.number().int().nonnegative(),
  minutesSaved: z.number().nonnegative(),
  hoursSaved: z.number().nonnegative(),
  valueGbpCents: z.number().int().nonnegative(),
  range: z.object({
    from: z.string(),
    to: z.string(),
  }),
  scope: z.object({
    organizationId: z.string(),
    venueId: z.string().nullable(),
  }),
  baseline: z.object({
    minutesPerQuery: z.number().nonnegative(),
    hourlyRateCents: z.number().int().nonnegative(),
  }),
})
export class HoursRecoveredResponseDto extends createZodDto(HoursRecoveredResponseSchema) {}
