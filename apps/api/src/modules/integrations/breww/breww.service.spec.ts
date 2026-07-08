import assert from 'node:assert/strict'
import test from 'node:test'
import type { IntegrationsService } from '../integrations.service'
import {
  BrewwService,
  filterByName,
  toBatchRow,
  toMarginRow,
  toProductRow,
  toPurchaseOrderRow,
} from './breww.service'

function serviceWithStubs(overrides?: { markError?: (org: string, p: string, m: string) => void }) {
  const integrations = {
    getActiveCredentials: async () => ({ accessToken: 'BRW.test' }),
    touchLastSynced: async () => undefined,
    markError: async (org: string, p: string, m: string) => overrides?.markError?.(org, p, m),
  } as unknown as IntegrationsService
  return new BrewwService(integrations)
}

function jsonResponse(status: number, body: unknown): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
}

test('filterByName matches case-insensitively on name and code', () => {
  const rows = [
    { name: 'Lune Pale 30L Keg', code: 'LP-KEG30' },
    { name: 'Stout Cask', code: null },
  ]
  assert.deepEqual(filterByName(rows, 'lune pale').concat(filterByName(rows, 'lp-keg')), [
    rows[0],
    rows[0],
  ])
})

test('a DRF page with a next link maps to truncated: true', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    jsonResponse(200, {
      count: 250,
      next: 'https://breww.com/api/drink-batches/?page=2',
      results: [{ id: 1, batch_code: 'G-1', status: 2 }],
    }),
  )
  const result = await serviceWithStubs().listBatches('org1', {})
  assert.deepEqual(
    result.ok && { truncated: result.data.truncated, totalCount: result.data.totalCount },
    { truncated: true, totalCount: 250 },
  )
})

test('a Breww 401 marks the integration errored and returns the reconnect message', async (t) => {
  t.mock.method(globalThis, 'fetch', jsonResponse(401, { detail: 'Invalid token.' }))
  let marked: string | null = null
  const service = serviceWithStubs({
    markError: (_org, _p, message) => {
      marked = message
    },
  })
  const result = await service.listBatches('org1', {})
  assert.deepEqual(
    { ok: result.ok, detail: !result.ok ? result.detail : null, marked },
    {
      ok: false,
      detail:
        'Breww rejected our API key. Ask an owner or manager to reconnect Breww in Settings → Integrations.',
      marked: 'auth: Breww returned 401 — key may be revoked',
    },
  )
})

test('maps a drink batch with numeric status to its name', () => {
  const row = toBatchRow({
    id: 7,
    batch_code: 'GYLE-042',
    batch_ref: null,
    drink: { id: 3, name: 'Lune Pale' },
    status: 2,
    abv: 4.6,
    datetime_started: '2026-06-30T09:00:00Z',
    datetime_completed: null,
  })
  assert.deepEqual(
    { code: row.batchCode, beer: row.beer, status: row.status, abv: row.abv },
    { code: 'GYLE-042', beer: 'Lune Pale', status: 'in-progress', abv: 4.6 },
  )
})

test('an unknown batch status code falls back to its string form', () => {
  assert.equal(toBatchRow({ id: 1, batch_code: 'X', status: 9 }).status, '9')
})

test('maps product price and packaged quantity, tolerating nulls', () => {
  const row = toProductRow({
    id: 12,
    name: 'Lune Pale 30L Keg',
    code: 'LP-KEG30',
    price: 92.5,
    total_packaged_beer_quantity: null,
    obsolete: false,
  })
  assert.deepEqual(
    { name: row.name, price: row.price, qty: row.packagedQuantity },
    { name: 'Lune Pale 30L Keg', price: 92.5, qty: null },
  )
})

test('maps purchase order landed cost and status name', () => {
  const row = toPurchaseOrderRow({
    id: 5,
    number: 1041,
    supplier_ref: 'MALT-88',
    status: 2,
    created_at: '2026-06-01T10:00:00Z',
    delivery_date: '2026-06-08',
    currency: 'GBP',
    total_items_value: 640,
    landed_cost_total: 702.4,
  })
  assert.deepEqual(
    { status: row.status, landed: row.landedCostTotal, items: row.totalItemsValue },
    { status: 'finalised', landed: 702.4, items: 640 },
  )
})

test('maps sale-line production cost and margin, nulling absent costs', () => {
  const row = toMarginRow({
    id: 88,
    product_name: 'Lune Pale 30L Keg',
    quantity: 4,
    value: 370,
    product_production_cost: 31.2,
    product_packaging_cost: 6.8,
    duty_cost: null,
    margin_value: 218,
    margin_percentage: 58.9,
  })
  assert.deepEqual(
    {
      production: row.productionCost,
      packaging: row.packagingCost,
      duty: row.dutyCost,
      marginPct: row.marginPercentage,
    },
    { production: 31.2, packaging: 6.8, duty: null, marginPct: 58.9 },
  )
})
