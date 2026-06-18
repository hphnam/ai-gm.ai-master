import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

const ISO_DATETIME = z
  .string()
  .datetime({ offset: true })
  .transform((s) => new Date(s))

/// Shared range fields — extracted to a plain ZodObject so other DTOs can
/// extend it (e.g. NoDataQueryQuerySchema adds `limit`). The superRefine
/// version below is what nestjs-zod actually validates against; both share
/// the same field schemas.
const RANGE_FIELDS = {
  venueId: UUID.optional(),
  from: ISO_DATETIME.optional(),
  to: ISO_DATETIME.optional(),
} as const

function refineRange<T extends { from?: Date; to?: Date }>(v: T, ctx: z.RefinementCtx): void {
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
}

/// `venueId` optional (omit for whole-org rollup), from/to optional ISO 8601
/// (default last 30 days, applied controller-side). Range capped at 366 days
/// to keep SQL bounded; mirrors HoursRecoveredQueryDto's contract.
export const AnalyticsRangeQuerySchema = z.object(RANGE_FIELDS).superRefine(refineRange)
export class AnalyticsRangeQueryDto extends createZodDto(AnalyticsRangeQuerySchema) {}

const DateBucket = z.object({ date: z.string() })

// Search outcomes
export const SearchOutcomeBucketSchema = DateBucket.extend({
  hit: z.number().int().nonnegative(),
  noData: z.number().int().nonnegative(),
  error: z.number().int().nonnegative(),
})
export const SearchOutcomesResponseSchema = z.object({
  buckets: z.array(SearchOutcomeBucketSchema),
  totals: z.object({
    hit: z.number().int(),
    noData: z.number().int(),
    error: z.number().int(),
  }),
})
export class SearchOutcomesResponseDto extends createZodDto(SearchOutcomesResponseSchema) {}

// Top no-data queries
export const NoDataQueryQuerySchema = z
  .object({
    ...RANGE_FIELDS,
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine(refineRange)
export class NoDataQueryQueryDto extends createZodDto(NoDataQueryQuerySchema) {}

export const NoDataQueryItemSchema = z.object({
  query: z.string(),
  count: z.number().int().positive(),
  lastSeen: z.string(),
})
export const NoDataQueriesResponseSchema = z.object({
  items: z.array(NoDataQueryItemSchema),
})
export class NoDataQueriesResponseDto extends createZodDto(NoDataQueriesResponseSchema) {}

// Escalations
export const EscalationBucketSchema = DateBucket.extend({
  resolved: z.number().int().nonnegative(),
  escalated: z.number().int().nonnegative(),
})
export const EscalationsResponseSchema = z.object({
  buckets: z.array(EscalationBucketSchema),
  totals: z.object({
    resolved: z.number().int(),
    escalated: z.number().int(),
    resolutionRate: z.number(),
  }),
})
export class EscalationsResponseDto extends createZodDto(EscalationsResponseSchema) {}

// Costs
export const CostBucketSchema = DateBucket.extend({
  usdCents: z.number().int().nonnegative(),
  messages: z.number().int().nonnegative(),
})
export const CostsResponseSchema = z.object({
  buckets: z.array(CostBucketSchema),
  totals: z.object({
    usdCents: z.number().int(),
    messages: z.number().int(),
    costPerMessageCents: z.number(),
  }),
})
export class CostsResponseDto extends createZodDto(CostsResponseSchema) {}

// Feedback
export const MetricsFeedbackBucketSchema = DateBucket.extend({
  up: z.number().int().nonnegative(),
  down: z.number().int().nonnegative(),
  regenerate: z.number().int().nonnegative(),
})
export const MetricsFeedbackResponseSchema = z.object({
  buckets: z.array(MetricsFeedbackBucketSchema),
  totals: z.object({
    up: z.number().int(),
    down: z.number().int(),
    regenerate: z.number().int(),
    positiveRate: z.number(),
  }),
})
export class MetricsFeedbackResponseDto extends createZodDto(MetricsFeedbackResponseSchema) {}

// Pricing funnel
export const PricingFunnelQuerySchema = z.object({
  venueId: UUID.optional(),
})
export class PricingFunnelQueryDto extends createZodDto(PricingFunnelQuerySchema) {}

export const PricingFunnelResponseSchema = z.object({
  pending: z.number().int().nonnegative(),
  adopted: z.number().int().nonnegative(),
  dismissed: z.number().int().nonnegative(),
  adoptionRate: z.number(),
  measuredUpliftGbpCents: z.number().int(),
})
export class PricingFunnelResponseDto extends createZodDto(PricingFunnelResponseSchema) {}

// Top successful questions — shares the no-data query shape but filters to
// outcome='hit' on the service side.
export const TopQuestionsQuerySchema = z
  .object({
    ...RANGE_FIELDS,
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine(refineRange)
export class TopQuestionsQueryDto extends createZodDto(TopQuestionsQuerySchema) {}

export const TopQuestionsResponseSchema = z.object({
  items: z.array(NoDataQueryItemSchema),
})
export class TopQuestionsResponseDto extends createZodDto(TopQuestionsResponseSchema) {}

// Recent escalations
export const RecentEscalationsQuerySchema = z
  .object({
    ...RANGE_FIELDS,
    limit: z.coerce.number().int().min(1).max(50).default(8),
  })
  .superRefine(refineRange)
export class RecentEscalationsQueryDto extends createZodDto(RecentEscalationsQuerySchema) {}

export const RecentEscalationItemSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  escalatedAt: z.string(),
  escalationKind: z.string().nullable(),
  venueId: z.string(),
  venueName: z.string(),
  staffUserId: z.string().nullable(),
  staffName: z.string().nullable(),
  escalatedToUserId: z.string().nullable(),
  escalatedToName: z.string().nullable(),
})
export const RecentEscalationsResponseSchema = z.object({
  items: z.array(RecentEscalationItemSchema),
})
export class RecentEscalationsResponseDto extends createZodDto(RecentEscalationsResponseSchema) {}

// Most active staff
export const ActiveStaffQuerySchema = z
  .object({
    ...RANGE_FIELDS,
    limit: z.coerce.number().int().min(1).max(50).default(8),
  })
  .superRefine(refineRange)
export class ActiveStaffQueryDto extends createZodDto(ActiveStaffQuerySchema) {}

export const ActiveStaffItemSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string().nullable(),
  count: z.number().int().nonnegative(),
  lastSeen: z.string(),
})
export const ActiveStaffResponseSchema = z.object({
  items: z.array(ActiveStaffItemSchema),
})
export class ActiveStaffResponseDto extends createZodDto(ActiveStaffResponseSchema) {}

// Onboarding cohort
export const OnboardingCohortMemberSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string(),
  startedAt: z.string().nullable(),
  daysSinceStart: z.number().int().nonnegative(),
  totalQueries: z.number().int().nonnegative(),
  repeatQueries: z.number().int().nonnegative(),
  repeatRate: z.number(),
  firstIndependentAt: z.string().nullable(),
})
export const OnboardingCohortResponseSchema = z.object({
  members: z.array(OnboardingCohortMemberSchema),
})
export class OnboardingCohortResponseDto extends createZodDto(OnboardingCohortResponseSchema) {}
