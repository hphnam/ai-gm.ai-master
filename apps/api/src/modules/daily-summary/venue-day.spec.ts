import assert from 'node:assert/strict'
import { test } from 'node:test'
import { venueDayWindow } from './venue-day'

const DAY_MS = 24 * 60 * 60 * 1000

test('resolves yesterday as the full prior local day in winter GMT', () => {
  const w = venueDayWindow('Europe/London', 1, new Date('2026-01-15T10:00:00Z'))
  assert.equal(w.date, '2026-01-14')
  assert.equal(w.fromIso, '2026-01-14T00:00:00.000Z')
  assert.equal(w.toIso, '2026-01-15T00:00:00.000Z')
})

test('accounts for the BST (+1) offset when resolving local midnight', () => {
  const w = venueDayWindow('Europe/London', 1, new Date('2026-07-15T10:00:00Z'))
  assert.equal(w.date, '2026-07-14')
  // Local midnight on 14 Jul BST is 23:00Z on 13 Jul.
  assert.equal(w.fromIso, '2026-07-13T23:00:00.000Z')
})

test('spans exactly 24h for a non-DST day in an east-of-UTC zone', () => {
  const w = venueDayWindow('Pacific/Auckland', 1, new Date('2026-01-15T10:00:00Z'))
  assert.equal(w.date, '2026-01-14')
  assert.equal(Date.parse(w.toIso) - Date.parse(w.fromIso), DAY_MS)
})

test('offset 0 resolves today rather than yesterday', () => {
  const w = venueDayWindow('Europe/London', 0, new Date('2026-01-15T10:00:00Z'))
  assert.equal(w.date, '2026-01-15')
})
