// Pure-function tests for the WAU week bucket builder and zero-fill helper.
// The DB-touching path (getVenueWau) needs a live Postgres + seeded
// ChatConversation/ChatMessage rows; we leave it out of CI and rely on the
// probe harness + manual verification against a real venue.
//
// Run via:
//   node --import tsx --test apps/api/src/modules/metrics/wau.spec.ts

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildWeekBuckets, fillBuckets } from './wau.service'

describe('buildWeekBuckets', () => {
  it('returns the requested number of weeks', () => {
    const buckets = buildWeekBuckets(new Date('2026-05-17T12:00:00Z'), 'Europe/London', 12)
    assert.equal(buckets.length, 12)
  })

  it('orders weeks ascending oldest first', () => {
    const buckets = buildWeekBuckets(new Date('2026-05-17T12:00:00Z'), 'Europe/London', 4)
    for (let i = 1; i < buckets.length; i++) {
      assert.ok(buckets[i].weekStart > buckets[i - 1].weekStart)
    }
  })

  it('anchors weekStart on Monday for a Sunday "now"', () => {
    // 2026-05-17 is a Sunday — the ISO week starts Mon 2026-05-11.
    const buckets = buildWeekBuckets(new Date('2026-05-17T12:00:00Z'), 'Europe/London', 1)
    assert.equal(buckets[0].weekStart, '2026-05-11')
    assert.equal(buckets[0].weekEnd, '2026-05-17')
  })

  it('anchors weekStart on Monday for a Monday "now"', () => {
    // 2026-05-18 is a Monday.
    const buckets = buildWeekBuckets(new Date('2026-05-18T08:00:00Z'), 'Europe/London', 1)
    assert.equal(buckets[0].weekStart, '2026-05-18')
    assert.equal(buckets[0].weekEnd, '2026-05-24')
  })

  it('rolls the local week forward when UTC midnight has not yet hit in the venue tz', () => {
    // 2026-05-18 00:30 UTC is 2026-05-17 (Sun) 17:30 in Los Angeles.
    // The LA week-of contains Mon 2026-05-11, not Mon 2026-05-18.
    const buckets = buildWeekBuckets(new Date('2026-05-18T00:30:00Z'), 'America/Los_Angeles', 1)
    assert.equal(buckets[0].weekStart, '2026-05-11')
  })

  it('returns consecutive weeks with no gaps', () => {
    const buckets = buildWeekBuckets(new Date('2026-05-17T12:00:00Z'), 'Europe/London', 8)
    for (let i = 1; i < buckets.length; i++) {
      const prev = new Date(`${buckets[i - 1].weekStart}T00:00:00Z`)
      const cur = new Date(`${buckets[i].weekStart}T00:00:00Z`)
      const diffDays = (cur.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
      assert.equal(diffDays, 7)
    }
  })
})

describe('fillBuckets', () => {
  it('zero-fills weeks with no observations', () => {
    const buckets = [
      { weekStart: '2026-05-04', weekEnd: '2026-05-10' },
      { weekStart: '2026-05-11', weekEnd: '2026-05-17' },
    ]
    const filled = fillBuckets(buckets, new Map())
    assert.deepEqual(filled, [
      { weekStart: '2026-05-04', weekEnd: '2026-05-10', activeUsers: 0, messageCount: 0 },
      { weekStart: '2026-05-11', weekEnd: '2026-05-17', activeUsers: 0, messageCount: 0 },
    ])
  })

  it('uses observed counts when present', () => {
    const buckets = [
      { weekStart: '2026-05-04', weekEnd: '2026-05-10' },
      { weekStart: '2026-05-11', weekEnd: '2026-05-17' },
    ]
    const observed = new Map([['2026-05-11', { activeUsers: 4, messageCount: 27 }]])
    const filled = fillBuckets(buckets, observed)
    assert.equal(filled[0].activeUsers, 0)
    assert.equal(filled[0].messageCount, 0)
    assert.equal(filled[1].activeUsers, 4)
    assert.equal(filled[1].messageCount, 27)
  })

  it('preserves bucket ordering when filling', () => {
    const buckets = [
      { weekStart: '2026-04-27', weekEnd: '2026-05-03' },
      { weekStart: '2026-05-04', weekEnd: '2026-05-10' },
      { weekStart: '2026-05-11', weekEnd: '2026-05-17' },
    ]
    const observed = new Map([['2026-04-27', { activeUsers: 1, messageCount: 1 }]])
    const filled = fillBuckets(buckets, observed)
    assert.equal(filled[0].weekStart, '2026-04-27')
    assert.equal(filled[2].weekStart, '2026-05-11')
  })
})
