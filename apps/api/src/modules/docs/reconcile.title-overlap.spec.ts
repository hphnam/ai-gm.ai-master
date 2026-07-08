import assert from 'node:assert/strict'
import { test } from 'node:test'

import { titleOverlap } from './reconcile.service'

// 0.6 is the auto-supersede gate. These cases pin the behavior that keeps a
// genuine new version reconciling while distinct same-type docs do not.

test('a genuine new version clears the 0.6 gate', () => {
  assert.ok(titleOverlap('Opening Checklist', 'Opening Checklist 2026') >= 0.6)
})

test('two staff certificates differing only by name fall below the gate', () => {
  assert.ok(
    titleOverlap('Food Hygiene Certificate Alice Smith', 'Food Hygiene Certificate Bob Jones') <
      0.6,
  )
})

test('different subjects of the same type fall below the gate', () => {
  assert.ok(titleOverlap('Bar Opening Checklist', 'Kitchen Closing Checklist') < 0.6)
})

test('a missing title scores zero', () => {
  assert.equal(titleOverlap(null, 'Opening Checklist'), 0)
})

test('identical titles score one', () => {
  assert.equal(titleOverlap('Opening Checklist', 'opening checklist'), 1)
})
