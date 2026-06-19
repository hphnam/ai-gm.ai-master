import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lineCogsMinor, readVariationCost } from './square-cogs.service'

// The SDK leaves these fields in raw snake_case (no v44 type), so the wire
// shape below mirrors what Square actually returns for Lune's catalog.
test('reads default_unit_cost (snake_case wire form) as the unit cost', () => {
  const cost = readVariationCost({ default_unit_cost: { amount: 25, currency: 'GBP' } })
  assert.deepEqual(cost, { amount: 25, currency: 'GBP' })
})

test('prefers default_unit_cost over the vendor price', () => {
  const cost = readVariationCost({
    default_unit_cost: { amount: 25, currency: 'GBP' },
    item_variation_vendor_infos: [
      { item_variation_vendor_info_data: { price_money: { amount: 99, currency: 'GBP' } } },
    ],
  })
  assert.deepEqual(cost, { amount: 25, currency: 'GBP' })
})

test('falls back to the vendor price_money when default_unit_cost is absent', () => {
  const cost = readVariationCost({
    item_variation_vendor_infos: [
      { item_variation_vendor_info_data: { price_money: { amount: 50, currency: 'GBP' } } },
    ],
  })
  assert.deepEqual(cost, { amount: 50, currency: 'GBP' })
})

test('still reads camelCase if a future SDK upgrade converts the field', () => {
  const cost = readVariationCost({ defaultUnitCost: { amount: 25, currency: 'GBP' } })
  assert.deepEqual(cost, { amount: 25, currency: 'GBP' })
})

test('returns null when no cost is set anywhere', () => {
  const cost = readVariationCost({ priceMoney: { amount: 500, currency: 'GBP' } })
  assert.equal(cost, null)
})

test('ignores a cost with no currency', () => {
  const cost = readVariationCost({ default_unit_cost: { amount: 25 } })
  assert.equal(cost, null)
})

test('line COGS is per-unit minor cost times whole quantity', () => {
  // 50p/unit catalog cost × 3 units = 150p — NOT scaled by 1e6.
  assert.equal(lineCogsMinor(50n, 3), 150n)
})

test('line COGS handles fractional quantity without drift', () => {
  // 200p/unit × 2.5 = 500p
  assert.equal(lineCogsMinor(200n, 2.5), 500n)
})
