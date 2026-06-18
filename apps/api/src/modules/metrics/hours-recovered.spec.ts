// Run via:
//   node --import tsx --test apps/api/src/modules/metrics/hours-recovered.spec.ts

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_HOURLY_RATE_CENTS,
  DEFAULT_MINUTES_PER_QUERY,
  HoursRecoveredService,
  type MetricsPrisma,
} from './hours-recovered.service'

const ORG = 'org_1'
const OTHER_ORG = 'org_2'
const VENUE_A = 'venue_a'
const VENUE_B = 'venue_b'
const FROM = new Date('2026-05-10T00:00:00Z')
const TO = new Date('2026-05-17T00:00:00Z')

type FakeRow = {
  organizationId: string
  venueId: string | null
  outcome: 'hit' | 'no-data' | 'error'
  createdAt: Date
}

type FakeConfig = {
  organizationId: string
  hoursRecoveredMinutesPerQuery: number
  hoursRecoveredHourlyRateCents: number
}

const inRange = (d: Date, from: Date, to: Date): boolean =>
  d.getTime() >= from.getTime() && d.getTime() < to.getTime()

const buildDb = (rows: FakeRow[], configs: FakeConfig[]): MetricsPrisma =>
  ({
    searchAnalytics: {
      count: async ({ where }: { where: Record<string, unknown> }): Promise<number> => {
        const w = where as {
          organizationId: string
          outcome?: { in: string[] }
          createdAt?: { gte: Date; lt: Date }
          venueId?: string
        }
        return rows.filter((r) => {
          if (r.organizationId !== w.organizationId) return false
          if (w.outcome?.in && !w.outcome.in.includes(r.outcome)) return false
          if (w.createdAt && !inRange(r.createdAt, w.createdAt.gte, w.createdAt.lt)) return false
          if (w.venueId !== undefined && r.venueId !== w.venueId) return false
          return true
        }).length
      },
    },
    metricsConfig: {
      findUnique: async ({
        where,
      }: {
        where: { organizationId: string }
      }): Promise<FakeConfig | null> => {
        return configs.find((c) => c.organizationId === where.organizationId) ?? null
      },
    },
  }) as unknown as MetricsPrisma

const defaultConfig = (orgId: string): FakeConfig => ({
  organizationId: orgId,
  hoursRecoveredMinutesPerQuery: DEFAULT_MINUTES_PER_QUERY,
  hoursRecoveredHourlyRateCents: DEFAULT_HOURLY_RATE_CENTS,
})

describe('HoursRecoveredService.compute', () => {
  it('returns zeros for an empty range', async () => {
    const svc = HoursRecoveredService.withPrismaForTest(buildDb([], [defaultConfig(ORG)]))
    const result = await svc.compute(ORG, { from: FROM, to: TO })
    assert.equal(result.queriesCount, 0)
    assert.equal(result.minutesSaved, 0)
    assert.equal(result.hoursSaved, 0)
    assert.equal(result.valueGbpCents, 0)
  })

  it('computes minutes / hours / £ for N successful queries against the spec defaults', async () => {
    // 10 `hit` rows × 4.2 min = 42 minutes = 0.7 hours
    // 0.7 hours × £25 (2500 cents) = 1750 cents = £17.50
    const rows: FakeRow[] = Array.from({ length: 10 }, (_, i) => ({
      organizationId: ORG,
      venueId: VENUE_A,
      outcome: 'hit',
      createdAt: new Date(FROM.getTime() + i * 1000),
    }))
    const svc = HoursRecoveredService.withPrismaForTest(buildDb(rows, [defaultConfig(ORG)]))
    const result = await svc.compute(ORG, { from: FROM, to: TO })
    assert.equal(result.queriesCount, 10)
    assert.equal(result.minutesSaved, 42)
    assert.equal(result.hoursSaved, 0.7)
    assert.equal(result.valueGbpCents, 1750)
    assert.equal(result.baseline.minutesPerQuery, DEFAULT_MINUTES_PER_QUERY)
    assert.equal(result.baseline.hourlyRateCents, DEFAULT_HOURLY_RATE_CENTS)
  })

  it('excludes no-data and error outcomes from the time saved count', async () => {
    const rows: FakeRow[] = [
      { organizationId: ORG, venueId: VENUE_A, outcome: 'hit', createdAt: FROM },
      { organizationId: ORG, venueId: VENUE_A, outcome: 'no-data', createdAt: FROM },
      { organizationId: ORG, venueId: VENUE_A, outcome: 'no-data', createdAt: FROM },
      { organizationId: ORG, venueId: VENUE_A, outcome: 'error', createdAt: FROM },
    ]
    const svc = HoursRecoveredService.withPrismaForTest(buildDb(rows, [defaultConfig(ORG)]))
    const result = await svc.compute(ORG, { from: FROM, to: TO })
    assert.equal(result.queriesCount, 1)
  })

  it('scopes by venueId when provided', async () => {
    const rows: FakeRow[] = [
      { organizationId: ORG, venueId: VENUE_A, outcome: 'hit', createdAt: FROM },
      { organizationId: ORG, venueId: VENUE_A, outcome: 'hit', createdAt: FROM },
      { organizationId: ORG, venueId: VENUE_B, outcome: 'hit', createdAt: FROM },
    ]
    const svc = HoursRecoveredService.withPrismaForTest(buildDb(rows, [defaultConfig(ORG)]))
    const scoped = await svc.compute(ORG, { from: FROM, to: TO, venueId: VENUE_A })
    assert.equal(scoped.queriesCount, 2)
    assert.equal(scoped.scope.venueId, VENUE_A)
    const rollup = await svc.compute(ORG, { from: FROM, to: TO })
    assert.equal(rollup.queriesCount, 3)
    assert.equal(rollup.scope.venueId, null)
  })

  it('never returns rows from another org', async () => {
    const rows: FakeRow[] = [
      { organizationId: OTHER_ORG, venueId: VENUE_A, outcome: 'hit', createdAt: FROM },
      { organizationId: OTHER_ORG, venueId: VENUE_A, outcome: 'hit', createdAt: FROM },
    ]
    const svc = HoursRecoveredService.withPrismaForTest(buildDb(rows, [defaultConfig(ORG)]))
    const result = await svc.compute(ORG, { from: FROM, to: TO })
    assert.equal(result.queriesCount, 0)
  })

  it('excludes rows outside the requested range', async () => {
    const beforeFrom = new Date(FROM.getTime() - 1000)
    const atTo = TO // exclusive upper bound
    const rows: FakeRow[] = [
      { organizationId: ORG, venueId: VENUE_A, outcome: 'hit', createdAt: beforeFrom },
      { organizationId: ORG, venueId: VENUE_A, outcome: 'hit', createdAt: atTo },
      { organizationId: ORG, venueId: VENUE_A, outcome: 'hit', createdAt: FROM },
    ]
    const svc = HoursRecoveredService.withPrismaForTest(buildDb(rows, [defaultConfig(ORG)]))
    const result = await svc.compute(ORG, { from: FROM, to: TO })
    assert.equal(result.queriesCount, 1)
  })

  it('uses per-org tunables when the config row has been customised', async () => {
    // 5 queries × 10 min = 50 minutes; £30/hr (3000 cents) = 2500 cents
    const rows: FakeRow[] = Array.from({ length: 5 }, () => ({
      organizationId: ORG,
      venueId: VENUE_A,
      outcome: 'hit' as const,
      createdAt: FROM,
    }))
    const svc = HoursRecoveredService.withPrismaForTest(
      buildDb(rows, [
        {
          organizationId: ORG,
          hoursRecoveredMinutesPerQuery: 10,
          hoursRecoveredHourlyRateCents: 3000,
        },
      ]),
    )
    const result = await svc.compute(ORG, { from: FROM, to: TO })
    assert.equal(result.minutesSaved, 50)
    assert.equal(result.valueGbpCents, 2500)
    assert.equal(result.baseline.minutesPerQuery, 10)
    assert.equal(result.baseline.hourlyRateCents, 3000)
  })

  it('falls back to spec defaults when the org has no config row', async () => {
    const rows: FakeRow[] = [
      { organizationId: ORG, venueId: VENUE_A, outcome: 'hit', createdAt: FROM },
    ]
    // No configs for ORG.
    const svc = HoursRecoveredService.withPrismaForTest(buildDb(rows, []))
    const result = await svc.compute(ORG, { from: FROM, to: TO })
    assert.equal(result.baseline.minutesPerQuery, DEFAULT_MINUTES_PER_QUERY)
    assert.equal(result.baseline.hourlyRateCents, DEFAULT_HOURLY_RATE_CENTS)
    assert.equal(result.minutesSaved, 4.2)
  })
})
