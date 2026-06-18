import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { PricingRecommendation as PrismaPricingRecommendation } from '@prisma/client'
import { prisma as defaultPrisma } from '../../database/prisma'
import {
  PRICING_RECOMMENDATION_STATUSES,
  type PricingRecommendationStatus,
} from './dto/pricing-recommendations.dto'

/// Narrow seam over the prisma client. Lets the unit tests inject a stub
/// without pulling in @prisma/client's PrismaClient surface.
type PrismaSeam = {
  venue: {
    findFirst(args: {
      where: { id: string; organizationId: string }
      select: { id: true }
    }): Promise<{ id: string } | null>
  }
  pricingRecommendation: {
    create(args: { data: Record<string, unknown> }): Promise<PrismaPricingRecommendation>
    findFirst(args: {
      where: { id: string; organizationId: string }
    }): Promise<PrismaPricingRecommendation | null>
    findMany(args: {
      where: Record<string, unknown>
      orderBy: unknown
      take: number
    }): Promise<PrismaPricingRecommendation[]>
    update(args: {
      where: { id: string }
      data: Record<string, unknown>
    }): Promise<PrismaPricingRecommendation>
  }
}

export type PricingRecommendationRow = {
  id: string
  organizationId: string
  venueId: string
  sourceItemRef: string
  sourceItemLabel: string
  currentPriceCents: number
  recommendedPriceCents: number
  rationale: string
  status: PricingRecommendationStatus
  createdAt: string
  adoptedAt: string | null
  adoptedPriceCents: number | null
  dismissedAt: string | null
  dismissedReason: string | null
  upliftWindowDays: number
  measuredUpliftCents: number | null
  measuredAt: string | null
}

const STATUS_SET = new Set<PricingRecommendationStatus>(PRICING_RECOMMENDATION_STATUSES)

export type CreatePricingRecommendationInput = {
  venueId: string
  sourceItemRef: string
  sourceItemLabel: string
  currentPriceCents: number
  recommendedPriceCents: number
  rationale: string
  upliftWindowDays?: number
}

@Injectable()
export class PricingRecommendationsService {
  private readonly logger = new Logger(PricingRecommendationsService.name)
  // Nest DI: no constructor args — the prisma client is a module-level
  // singleton, not a Nest provider. Tests inject a fake via the static
  // `withPrismaForTest` factory below.
  private prisma: PrismaSeam = defaultPrisma as unknown as PrismaSeam

  static withPrismaForTest(prismaStub: PrismaSeam): PricingRecommendationsService {
    const svc = new PricingRecommendationsService()
    svc.prisma = prismaStub
    return svc
  }

  async create(
    orgId: string,
    input: CreatePricingRecommendationInput,
  ): Promise<PricingRecommendationRow> {
    // Venue must belong to the calling org. The FK enforces existence but not
    // org scoping — without this check, a manager in org A could log a
    // recommendation against a venue in org B by passing its UUID.
    const venue = await this.prisma.venue.findFirst({
      where: { id: input.venueId, organizationId: orgId },
      select: { id: true },
    })
    if (!venue) {
      throw new BadRequestException('invalid-venue')
    }

    const row = await this.prisma.pricingRecommendation.create({
      data: {
        organizationId: orgId,
        venueId: input.venueId,
        sourceItemRef: input.sourceItemRef,
        sourceItemLabel: input.sourceItemLabel,
        currentPriceCents: input.currentPriceCents,
        recommendedPriceCents: input.recommendedPriceCents,
        rationale: input.rationale,
        upliftWindowDays: input.upliftWindowDays ?? 30,
      },
    })

    this.logger.log(
      JSON.stringify({
        event: 'pricing_recommendations.created',
        orgId,
        venueId: input.venueId,
        id: row.id,
        deltaCents: input.recommendedPriceCents - input.currentPriceCents,
      }),
    )

    return this.toRow(row)
  }

  async getById(orgId: string, id: string): Promise<PricingRecommendationRow | null> {
    const row = await this.prisma.pricingRecommendation.findFirst({
      where: { id, organizationId: orgId },
    })
    return row ? this.toRow(row) : null
  }

  async listForVenue(
    orgId: string,
    venueId: string,
    status?: PricingRecommendationStatus,
    limit = 100,
  ): Promise<PricingRecommendationRow[]> {
    // Org-scope guard on the venue first — otherwise a caller could enumerate
    // pricing recommendations on any venueId they guess.
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, organizationId: orgId },
      select: { id: true },
    })
    if (!venue) {
      throw new NotFoundException('venue-not-found')
    }

    const rows = await this.prisma.pricingRecommendation.findMany({
      where: {
        organizationId: orgId,
        venueId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((r) => this.toRow(r))
  }

  async markAdopted(
    orgId: string,
    id: string,
    adoptedPriceCents?: number,
  ): Promise<PricingRecommendationRow> {
    const existing = await this.prisma.pricingRecommendation.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      throw new NotFoundException('recommendation-not-found')
    }
    if (existing.status === 'dismissed') {
      // Dismissed → adopted would silently undo a dismissal and lose the
      // dismissedReason audit trail. Force the caller to recreate instead.
      throw new ForbiddenException('cannot-adopt-dismissed-recommendation')
    }
    // Idempotent: re-adopting an already-adopted row is a no-op (returns the
    // existing state). Avoids races where two clicks both fire.
    if (existing.status === 'adopted') {
      return this.toRow(existing)
    }

    const finalPrice = adoptedPriceCents ?? existing.recommendedPriceCents
    const updated = await this.prisma.pricingRecommendation.update({
      where: { id },
      data: {
        status: 'adopted',
        adoptedAt: new Date(),
        adoptedPriceCents: finalPrice,
      },
    })

    this.logger.log(
      JSON.stringify({
        event: 'pricing_recommendations.adopted',
        orgId,
        id,
        venueId: updated.venueId,
        adoptedPriceCents: finalPrice,
      }),
    )

    return this.toRow(updated)
  }

  async markDismissed(
    orgId: string,
    id: string,
    reason?: string,
  ): Promise<PricingRecommendationRow> {
    const existing = await this.prisma.pricingRecommendation.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) {
      throw new NotFoundException('recommendation-not-found')
    }
    if (existing.status === 'adopted') {
      // Once adopted there's measurement data to protect — flipping to dismissed
      // would muddy the metric. Owner should record a NEW recommendation
      // ("revert to old price") instead.
      throw new ForbiddenException('cannot-dismiss-adopted-recommendation')
    }
    // Idempotent dismissal — if the caller re-dismisses with a new reason,
    // keep the original reason + timestamp. First dismissal wins the audit.
    if (existing.status === 'dismissed') {
      return this.toRow(existing)
    }

    const updated = await this.prisma.pricingRecommendation.update({
      where: { id },
      data: {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedReason: reason ?? null,
      },
    })

    this.logger.log(
      JSON.stringify({
        event: 'pricing_recommendations.dismissed',
        orgId,
        id,
        venueId: updated.venueId,
        hasReason: Boolean(reason),
      }),
    )

    return this.toRow(updated)
  }

  private toRow(r: PrismaPricingRecommendation): PricingRecommendationRow {
    const status = STATUS_SET.has(r.status as PricingRecommendationStatus)
      ? (r.status as PricingRecommendationStatus)
      : 'pending'
    return {
      id: r.id,
      organizationId: r.organizationId,
      venueId: r.venueId,
      sourceItemRef: r.sourceItemRef,
      sourceItemLabel: r.sourceItemLabel,
      currentPriceCents: r.currentPriceCents,
      recommendedPriceCents: r.recommendedPriceCents,
      rationale: r.rationale,
      status,
      createdAt: r.createdAt.toISOString(),
      adoptedAt: r.adoptedAt?.toISOString() ?? null,
      adoptedPriceCents: r.adoptedPriceCents,
      dismissedAt: r.dismissedAt?.toISOString() ?? null,
      dismissedReason: r.dismissedReason,
      upliftWindowDays: r.upliftWindowDays,
      measuredUpliftCents: r.measuredUpliftCents,
      measuredAt: r.measuredAt?.toISOString() ?? null,
    }
  }
}
