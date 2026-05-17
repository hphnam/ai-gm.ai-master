// Run via:
//   node --import tsx --test apps/api/src/modules/pricing-recommendations/pricing-recommendations.spec.ts
//
// Covers PricingRecommendationsService — org scoping on create, list, adopt,
// dismiss; status-transition validity (cannot adopt a dismissed row / cannot
// dismiss an adopted row); idempotency of repeated adopt + dismiss calls.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PricingRecommendationsService } from './pricing-recommendations.service'

type Row = {
  id: string
  organizationId: string
  venueId: string
  sourceItemRef: string
  sourceItemLabel: string
  currentPriceCents: number
  recommendedPriceCents: number
  rationale: string
  status: string
  createdAt: Date
  adoptedAt: Date | null
  adoptedPriceCents: number | null
  dismissedAt: Date | null
  dismissedReason: string | null
  upliftWindowDays: number
  measuredUpliftCents: number | null
  measuredAt: Date | null
}

const ORG = 'org-1'
const OTHER_ORG = 'org-2'
const VENUE = 'venue-1'
const NOW = new Date('2026-05-17T12:00:00Z')

function buildRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'rec-1',
    organizationId: ORG,
    venueId: VENUE,
    sourceItemRef: 'cat-1',
    sourceItemLabel: 'House lager pint',
    currentPriceCents: 575,
    recommendedPriceCents: 620,
    rationale: 'GP only 48% vs 65% target',
    status: 'pending',
    createdAt: NOW,
    adoptedAt: null,
    adoptedPriceCents: null,
    dismissedAt: null,
    dismissedReason: null,
    upliftWindowDays: 30,
    measuredUpliftCents: null,
    measuredAt: null,
    ...overrides,
  }
}

type FakePrisma = {
  venue: {
    findFirst: (args: { where: { id: string; organizationId: string } }) => Promise<{
      id: string
    } | null>
  }
  pricingRecommendation: {
    create: (args: { data: Record<string, unknown> }) => Promise<Row>
    findFirst: (args: { where: { id: string; organizationId: string } }) => Promise<Row | null>
    findMany: (args: {
      where: Record<string, unknown>
      orderBy: unknown
      take: number
    }) => Promise<Row[]>
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<Row>
  }
}

function buildService(prismaStub: FakePrisma): PricingRecommendationsService {
  return PricingRecommendationsService.withPrismaForTest(
    prismaStub as unknown as Parameters<typeof PricingRecommendationsService.withPrismaForTest>[0],
  )
}

describe('PricingRecommendationsService.create', () => {
  it('rejects a venue that does not belong to the caller org', async () => {
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => null },
      pricingRecommendation: {
        create: async () => {
          throw new Error('should not create')
        },
        findFirst: async () => null,
        findMany: async () => [],
        update: async () => {
          throw new Error('should not update')
        },
      },
    }
    const service = buildService(prismaStub)
    await assert.rejects(
      () =>
        service.create(ORG, {
          venueId: VENUE,
          sourceItemRef: 'cat-1',
          sourceItemLabel: 'Test',
          currentPriceCents: 100,
          recommendedPriceCents: 120,
          rationale: 'Test rationale',
        }),
      /invalid-venue/,
    )
  })

  it('writes a row with status pending when the venue is valid', async () => {
    let captured: Record<string, unknown> | null = null
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => ({ id: VENUE }) },
      pricingRecommendation: {
        create: async ({ data }) => {
          captured = data
          return buildRow({ ...(data as Partial<Row>) })
        },
        findFirst: async () => null,
        findMany: async () => [],
        update: async () => {
          throw new Error('should not update')
        },
      },
    }
    const service = buildService(prismaStub)
    const row = await service.create(ORG, {
      venueId: VENUE,
      sourceItemRef: 'cat-1',
      sourceItemLabel: 'Lager',
      currentPriceCents: 575,
      recommendedPriceCents: 620,
      rationale: 'GP low',
    })
    assert.equal(row.status, 'pending')
    assert.equal(row.recommendedPriceCents, 620)
    assert.equal((captured as unknown as { organizationId: string }).organizationId, ORG)
    assert.equal((captured as unknown as { upliftWindowDays: number }).upliftWindowDays, 30)
  })
})

describe('PricingRecommendationsService.listForVenue', () => {
  it('refuses to list when the venue is in a different org', async () => {
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => null },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => null,
        findMany: async () => {
          throw new Error('should not list')
        },
        update: async () => {
          throw new Error('unused')
        },
      },
    }
    const service = buildService(prismaStub)
    await assert.rejects(() => service.listForVenue(OTHER_ORG, VENUE), /venue-not-found/)
  })

  it('returns the rows the prisma layer surfaces when the venue is in the org', async () => {
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => ({ id: VENUE }) },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => null,
        findMany: async () => [buildRow({ id: 'a' }), buildRow({ id: 'b' })],
        update: async () => {
          throw new Error('unused')
        },
      },
    }
    const service = buildService(prismaStub)
    const rows = await service.listForVenue(ORG, VENUE)
    assert.equal(rows.length, 2)
    assert.deepEqual(
      rows.map((r) => r.id),
      ['a', 'b'],
    )
  })
})

describe('PricingRecommendationsService.markAdopted', () => {
  it('throws when the recommendation is not in the caller org', async () => {
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => null },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => null,
        findMany: async () => [],
        update: async () => {
          throw new Error('should not update')
        },
      },
    }
    const service = buildService(prismaStub)
    await assert.rejects(() => service.markAdopted(ORG, 'rec-1'), /recommendation-not-found/)
  })

  it('refuses to adopt a dismissed recommendation', async () => {
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => ({ id: VENUE }) },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => buildRow({ status: 'dismissed' }),
        findMany: async () => [],
        update: async () => {
          throw new Error('should not update a dismissed row')
        },
      },
    }
    const service = buildService(prismaStub)
    await assert.rejects(
      () => service.markAdopted(ORG, 'rec-1'),
      /cannot-adopt-dismissed-recommendation/,
    )
  })

  it('returns the existing row without updating when already adopted (idempotent)', async () => {
    const existing = buildRow({
      status: 'adopted',
      adoptedAt: NOW,
      adoptedPriceCents: 620,
    })
    let updateCalled = false
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => ({ id: VENUE }) },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => existing,
        findMany: async () => [],
        update: async () => {
          updateCalled = true
          throw new Error('should not update already-adopted row')
        },
      },
    }
    const service = buildService(prismaStub)
    const row = await service.markAdopted(ORG, 'rec-1', 999)
    assert.equal(updateCalled, false)
    assert.equal(row.adoptedPriceCents, 620)
  })

  it('records the recommended price when no override is supplied', async () => {
    let updateArgs: Record<string, unknown> | null = null
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => ({ id: VENUE }) },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => buildRow({ status: 'pending' }),
        findMany: async () => [],
        update: async ({ data }) => {
          updateArgs = data
          return buildRow({
            status: 'adopted',
            adoptedAt: NOW,
            adoptedPriceCents: (data.adoptedPriceCents as number) ?? null,
          })
        },
      },
    }
    const service = buildService(prismaStub)
    const row = await service.markAdopted(ORG, 'rec-1')
    assert.equal(row.status, 'adopted')
    assert.equal((updateArgs as unknown as { adoptedPriceCents: number }).adoptedPriceCents, 620)
  })
})

describe('PricingRecommendationsService.markDismissed', () => {
  it('throws when the recommendation is not in the caller org', async () => {
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => null },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => null,
        findMany: async () => [],
        update: async () => {
          throw new Error('should not update')
        },
      },
    }
    const service = buildService(prismaStub)
    await assert.rejects(() => service.markDismissed(ORG, 'rec-1'), /recommendation-not-found/)
  })

  it('refuses to dismiss an adopted recommendation', async () => {
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => ({ id: VENUE }) },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => buildRow({ status: 'adopted' }),
        findMany: async () => [],
        update: async () => {
          throw new Error('should not update an adopted row')
        },
      },
    }
    const service = buildService(prismaStub)
    await assert.rejects(
      () => service.markDismissed(ORG, 'rec-1'),
      /cannot-dismiss-adopted-recommendation/,
    )
  })

  it('returns the existing row without updating when already dismissed (idempotent)', async () => {
    const existing = buildRow({
      status: 'dismissed',
      dismissedAt: NOW,
      dismissedReason: 'too aggressive',
    })
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => ({ id: VENUE }) },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => existing,
        findMany: async () => [],
        update: async () => {
          throw new Error('should not update already-dismissed row')
        },
      },
    }
    const service = buildService(prismaStub)
    const row = await service.markDismissed(ORG, 'rec-1', 'second attempt')
    assert.equal(row.status, 'dismissed')
    assert.equal(row.dismissedReason, 'too aggressive')
  })

  it('writes status dismissed + reason on a pending recommendation', async () => {
    let updateArgs: Record<string, unknown> | null = null
    const prismaStub: FakePrisma = {
      venue: { findFirst: async () => ({ id: VENUE }) },
      pricingRecommendation: {
        create: async () => {
          throw new Error('unused')
        },
        findFirst: async () => buildRow({ status: 'pending' }),
        findMany: async () => [],
        update: async ({ data }) => {
          updateArgs = data
          return buildRow({
            status: 'dismissed',
            dismissedAt: NOW,
            dismissedReason: (data.dismissedReason as string) ?? null,
          })
        },
      },
    }
    const service = buildService(prismaStub)
    const row = await service.markDismissed(ORG, 'rec-1', 'price war risk')
    assert.equal(row.status, 'dismissed')
    assert.equal(
      (updateArgs as unknown as { dismissedReason: string }).dismissedReason,
      'price war risk',
    )
  })
})
