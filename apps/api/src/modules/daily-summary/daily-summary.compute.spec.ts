import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ToolResult } from '../../types'
import type { CogsSummary } from '../integrations/square/square-cogs.service'
import {
  aggregateVenueSummaries,
  buildVenueSummary,
  composeDayFigures,
  type DayFigures,
  type VenueDailySummary,
} from './daily-summary.compute'

const GBP = 'GBP'

function cogsOk(p: {
  net: number | null
  gross?: number | null
  cogs?: number | null
  gp?: number | null
  coverage?: number
  noData?: string | null
}): ToolResult<CogsSummary> {
  return {
    ok: true,
    data: {
      netSales: p.net === null ? null : { value: p.net, currency: GBP },
      grossSales: (p.gross ?? p.net) === null ? null : { value: p.gross ?? p.net, currency: GBP },
      cogsAmount: p.cogs == null ? null : { value: p.cogs, currency: GBP },
      grossMarginPct: p.gp ?? null,
      coverageRate: p.coverage ?? 100,
      noData: p.noData ? { reason: p.noData } : null,
    } as unknown as CogsSummary,
  }
}

function figures(over: Partial<DayFigures>): DayFigures {
  return {
    currency: GBP,
    netSales: null,
    grossSales: null,
    cogs: null,
    gpPct: null,
    labourCost: null,
    labourPct: null,
    tickets: null,
    coverageRate: 100,
    connected: true,
    noData: null,
    ...over,
  }
}

function venue(over: Partial<VenueDailySummary>): VenueDailySummary {
  return {
    venueId: 'v',
    venueName: 'V',
    date: '2026-07-14',
    currency: GBP,
    netSales: null,
    grossSales: null,
    cogs: null,
    gpPct: null,
    labourCost: null,
    labourPct: null,
    tickets: null,
    coverageRate: 100,
    gpDeltaPts: null,
    labourDeltaPts: null,
    netSalesPrev: null,
    connected: true,
    noData: null,
    ...over,
  }
}

test('labour % divides labour cost by net sales', () => {
  const f = composeDayFigures(
    cogsOk({ net: 2551 }),
    { ok: true, data: { estimatedCost: { value: 740, currency: GBP } } },
    { ok: true, data: { paymentCount: 148 } },
  )
  assert.equal(f.labourPct, 29)
})

test('gp % passes through from the COGS summary', () => {
  const f = composeDayFigures(
    cogsOk({ net: 2551, gp: 68.2 }),
    { ok: true, data: { estimatedCost: null } },
    { ok: true, data: { paymentCount: 0 } },
  )
  assert.equal(f.gpPct, 68.2)
})

test('a non-ok COGS result yields all-null, connected:false', () => {
  const f = composeDayFigures(
    { ok: false, reason: 'not-found' },
    { ok: false, reason: 'not-found' },
    { ok: false, reason: 'not-found' },
  )
  assert.deepEqual(
    { net: f.netSales, connected: f.connected, noData: f.noData },
    { net: null, connected: false, noData: 'not-found' },
  )
})

test('a labour failure leaves labour % null but keeps net sales', () => {
  const f = composeDayFigures(
    cogsOk({ net: 2551, gp: 68.2 }),
    { ok: false, reason: 'error' },
    { ok: true, data: { paymentCount: 12 } },
  )
  assert.deepEqual({ labourPct: f.labourPct, net: f.netSales }, { labourPct: null, net: 2551 })
})

test('tickets come from the payment count', () => {
  const f = composeDayFigures(
    cogsOk({ net: 100 }),
    { ok: true, data: { estimatedCost: null } },
    { ok: true, data: { paymentCount: 148 } },
  )
  assert.equal(f.tickets, 148)
})

test('gp delta is current minus prior GP', () => {
  const v = buildVenueSummary(
    { id: 'v', name: 'V' },
    '2026-07-14',
    figures({ gpPct: 68.2 }),
    figures({ gpPct: 66.1 }),
  )
  assert.equal(v.gpDeltaPts, 2.1)
})

test('gp delta is null when the prior day GP is missing', () => {
  const v = buildVenueSummary(
    { id: 'v', name: 'V' },
    '2026-07-14',
    figures({ gpPct: 68.2 }),
    figures({ gpPct: null }),
  )
  assert.equal(v.gpDeltaPts, null)
})

test('group net sales sums the venue net sales', () => {
  const g = aggregateVenueSummaries(
    [venue({ netSales: 2551 }), venue({ netSales: 1000 })],
    '2026-07-14',
  )
  assert.equal(g.group.netSales, 3551)
})

test('group GP is weighted by net sales', () => {
  const g = aggregateVenueSummaries(
    [venue({ netSales: 1000, gpPct: 70 }), venue({ netSales: 3000, gpPct: 60 })],
    '2026-07-14',
  )
  assert.equal(g.group.gpPct, 62.5)
})

test('group labour % blends labour cost over net sales', () => {
  const g = aggregateVenueSummaries(
    [venue({ netSales: 1000, labourCost: 290 }), venue({ netSales: 3000, labourCost: 900 })],
    '2026-07-14',
  )
  assert.equal(g.group.labourPct, 29.8)
})

test('group GP is null when no venue has costed items', () => {
  const g = aggregateVenueSummaries(
    [venue({ netSales: 1000, gpPct: null }), venue({ netSales: 3000, gpPct: null })],
    '2026-07-14',
  )
  assert.equal(g.group.gpPct, null)
})
