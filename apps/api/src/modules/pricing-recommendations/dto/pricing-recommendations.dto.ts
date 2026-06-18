import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID = z.string().regex(UUID_RE, 'invalid uuid')

export const PRICING_RECOMMENDATION_STATUSES = ['pending', 'adopted', 'dismissed'] as const
export type PricingRecommendationStatus = (typeof PRICING_RECOMMENDATION_STATUSES)[number]

export const PricingRecommendationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  venueId: z.string(),
  sourceItemRef: z.string(),
  sourceItemLabel: z.string(),
  currentPriceCents: z.number().int(),
  recommendedPriceCents: z.number().int(),
  rationale: z.string(),
  status: z.enum(PRICING_RECOMMENDATION_STATUSES),
  createdAt: z.string(),
  adoptedAt: z.string().nullable(),
  adoptedPriceCents: z.number().int().nullable(),
  dismissedAt: z.string().nullable(),
  dismissedReason: z.string().nullable(),
  upliftWindowDays: z.number().int(),
  measuredUpliftCents: z.number().int().nullable(),
  measuredAt: z.string().nullable(),
})
export class PricingRecommendationDto extends createZodDto(PricingRecommendationSchema) {}

export const ListPricingRecommendationsQuerySchema = z.object({
  venueId: UUID,
  status: z.enum(PRICING_RECOMMENDATION_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
})
export class ListPricingRecommendationsQueryDto extends createZodDto(
  ListPricingRecommendationsQuerySchema,
) {}

export const ListPricingRecommendationsResponseSchema = z.object({
  recommendations: z.array(PricingRecommendationSchema),
})
export class ListPricingRecommendationsResponseDto extends createZodDto(
  ListPricingRecommendationsResponseSchema,
) {}

export const CreatePricingRecommendationBodySchema = z.object({
  venueId: UUID,
  sourceItemRef: z.string().trim().min(1).max(200),
  sourceItemLabel: z.string().trim().min(1).max(200),
  /// Pennies. Non-negative — a £0 baseline (giveaway) is legal but a negative
  /// price never makes sense.
  currentPriceCents: z.number().int().min(0).max(10_000_000),
  recommendedPriceCents: z.number().int().min(0).max(10_000_000),
  rationale: z.string().trim().min(3).max(2000),
  upliftWindowDays: z.number().int().min(1).max(365).optional(),
})
export class CreatePricingRecommendationBodyDto extends createZodDto(
  CreatePricingRecommendationBodySchema,
) {}

export const AdoptPricingRecommendationBodySchema = z.object({
  /// Optional override — when omitted the recommended price is recorded as adopted.
  /// Lets the owner partially accept (e.g. take a smaller bump than recommended).
  adoptedPriceCents: z.number().int().min(0).max(10_000_000).optional(),
})
export class AdoptPricingRecommendationBodyDto extends createZodDto(
  AdoptPricingRecommendationBodySchema,
) {}

export const DismissPricingRecommendationBodySchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
})
export class DismissPricingRecommendationBodyDto extends createZodDto(
  DismissPricingRecommendationBodySchema,
) {}

export const PricingRecommendationIdParamSchema = z.object({ id: UUID })
export class PricingRecommendationIdParamDto extends createZodDto(
  PricingRecommendationIdParamSchema,
) {}

export const SinglePricingRecommendationResponseSchema = z.object({
  recommendation: PricingRecommendationSchema,
})
export class SinglePricingRecommendationResponseDto extends createZodDto(
  SinglePricingRecommendationResponseSchema,
) {}
