import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/// Query for the single-venue summary. venueId is required — the caller's venue
/// scope is enforced in the controller (canAccessVenue) + the global guard.
export const DailySummaryQuerySchema = z.object({
  venueId: z.string().min(1),
})
export class DailySummaryQueryDto extends createZodDto(DailySummaryQuerySchema) {}

const VenueDailySummarySchema = z.object({
  venueId: z.string(),
  venueName: z.string(),
  date: z.string(),
  currency: z.string().nullable(),
  netSales: z.number().nullable(),
  grossSales: z.number().nullable(),
  cogs: z.number().nullable(),
  gpPct: z.number().nullable(),
  labourCost: z.number().nullable(),
  labourPct: z.number().nullable(),
  tickets: z.number().nullable(),
  coverageRate: z.number(),
  gpDeltaPts: z.number().nullable(),
  labourDeltaPts: z.number().nullable(),
  netSalesPrev: z.number().nullable(),
  connected: z.boolean(),
  noData: z.string().nullable(),
})

export const VenueDailySummaryResponseSchema = z.object({
  data: VenueDailySummarySchema.nullable(),
  error: z.string().nullable(),
})
export class VenueDailySummaryResponseDto extends createZodDto(VenueDailySummaryResponseSchema) {}

export const GroupDailySummaryResponseSchema = z.object({
  data: z
    .object({
      date: z.string(),
      currency: z.string().nullable(),
      venues: z.array(VenueDailySummarySchema),
      group: z.object({
        netSales: z.number().nullable(),
        gpPct: z.number().nullable(),
        labourPct: z.number().nullable(),
        gpDeltaPts: z.number().nullable(),
      }),
    })
    .nullable(),
  error: z.string().nullable(),
})
export class GroupDailySummaryResponseDto extends createZodDto(GroupDailySummaryResponseSchema) {}
