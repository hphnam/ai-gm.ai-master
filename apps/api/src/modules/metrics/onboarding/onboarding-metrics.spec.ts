// Run via:
//   node --import tsx --test apps/api/src/modules/metrics/onboarding/onboarding-metrics.spec.ts

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COMPETENCY_MIN_QUERIES,
  COMPETENCY_TRAILING_DAYS,
  computeCompetency,
  type NormalizedQuery,
  ONBOARDING_WINDOW_DAYS,
} from './onboarding-metrics.service'

const DAY_MS = 24 * 60 * 60 * 1000
const START = new Date('2026-05-01T00:00:00Z')

function at(dayIndex: number, hour: number = 12): Date {
  return new Date(START.getTime() + dayIndex * DAY_MS + hour * 60 * 60 * 1000)
}

function q(text: string, day: number, hour: number = 12): NormalizedQuery {
  return { text: text.trim().toLowerCase(), createdAt: at(day, hour) }
}

describe('computeCompetency', () => {
  it('returns zero counts and null firstIndependentAt when no queries logged', () => {
    const now = at(5)
    const result = computeCompetency(START, [], now)
    assert.equal(result.totalQueries, 0)
    assert.equal(result.repeatQueries, 0)
    assert.equal(result.repeatRate, 0)
    assert.equal(result.firstIndependentAt, null)
    assert.equal(result.windowDays, ONBOARDING_WINDOW_DAYS)
    assert.equal(result.daysSinceStart, 5)
  })

  it('returns repeatRate 0 and reaches independence once 5+ unique queries land in a 7-day trailing window', () => {
    const queries: NormalizedQuery[] = []
    for (let i = 0; i < COMPETENCY_MIN_QUERIES; i += 1) {
      queries.push(q(`unique question ${i}`, i))
    }
    const now = at(ONBOARDING_WINDOW_DAYS)
    const result = computeCompetency(START, queries, now)
    assert.equal(result.totalQueries, COMPETENCY_MIN_QUERIES)
    assert.equal(result.repeatQueries, 0)
    assert.equal(result.repeatRate, 0)
    assert.ok(result.firstIndependentAt, 'expected firstIndependentAt to be set')
    // The 5th unique query lands on day 4 (zero-indexed); the trailing
    // 7-day window first contains 5 queries at the end of day 4, so the
    // boundary timestamp is start-of-day 5.
    const expected = new Date(START.getTime() + COMPETENCY_MIN_QUERIES * DAY_MS)
    assert.equal(result.firstIndependentAt?.getTime(), expected.getTime())
  })

  it('returns repeatRate 1 and null firstIndependentAt when every query is a repeat', () => {
    const queries: NormalizedQuery[] = []
    for (let i = 0; i < 12; i += 1) {
      queries.push(q('how do i open the till', Math.floor(i / 2), i % 24))
    }
    const result = computeCompetency(START, queries, at(ONBOARDING_WINDOW_DAYS))
    assert.equal(result.totalQueries, 12)
    assert.equal(result.repeatQueries, 11)
    assert.equal(result.repeatRate, 11 / 12)
    assert.equal(result.firstIndependentAt, null)
  })

  it('reaches independence later in the window when the user starts repeating then improves', () => {
    // Days 0-2: 6 queries, half repeats (rate 0.5) — not independent.
    // Days 3-9: 7 unique queries — by the end of the trailing window the
    // repeats have aged out and the rate drops below 10%.
    const queries: NormalizedQuery[] = [
      q('q a', 0, 9),
      q('q a', 0, 10),
      q('q b', 1, 9),
      q('q b', 1, 10),
      q('q c', 2, 9),
      q('q c', 2, 10),
      q('fresh 1', 3),
      q('fresh 2', 4),
      q('fresh 3', 5),
      q('fresh 4', 6),
      q('fresh 5', 7),
      q('fresh 6', 8),
      q('fresh 7', 9),
    ]
    const now = at(ONBOARDING_WINDOW_DAYS)
    const result = computeCompetency(START, queries, now)
    assert.ok(
      result.firstIndependentAt,
      'expected firstIndependentAt to be set once repeats age out',
    )
    // The repeats live in days 0-2; with a 7-day trailing window they age
    // out by the start of day 10. The first independent day must therefore
    // be no earlier than day 10's boundary (start of day 10).
    const earliest = new Date(START.getTime() + 10 * DAY_MS)
    assert.ok(
      result.firstIndependentAt!.getTime() >= earliest.getTime(),
      `firstIndependentAt should be on or after day-10 boundary, got ${result.firstIndependentAt?.toISOString()}`,
    )
  })

  it('treats LOWER(TRIM) duplicates as repeats', () => {
    const queries: NormalizedQuery[] = [
      q('Where is the fire exit?', 0),
      q('where is the fire exit?', 1),
    ]
    const result = computeCompetency(START, queries, at(2))
    assert.equal(result.repeatQueries, 1)
    assert.equal(result.repeatRate, 0.5)
  })

  it('does not reach independence when total queries in the trailing window stay below the minimum', () => {
    // 4 unique queries spread across the window — never hits the 5-query floor.
    const queries: NormalizedQuery[] = [q('a', 0), q('b', 3), q('c', 6), q('d', 9)]
    const result = computeCompetency(START, queries, at(ONBOARDING_WINDOW_DAYS))
    assert.equal(result.firstIndependentAt, null)
  })

  it('clamps the scan to the elapsed portion of the window when now is before windowEnd', () => {
    // Only 3 days have elapsed — the scan must not look past day 3.
    const queries: NormalizedQuery[] = []
    for (let i = 0; i < COMPETENCY_MIN_QUERIES; i += 1) {
      // All on day 0 — would qualify on the day-1 boundary.
      queries.push(q(`unique ${i}`, 0, i))
    }
    const result = computeCompetency(START, queries, at(3))
    assert.equal(result.daysSinceStart, 3)
    assert.ok(result.firstIndependentAt, 'should reach independence within the elapsed window')
  })

  it('honours the trailing-window length so older repeats fall out of the count', () => {
    // Day 0: repeated query. Day TRAILING+1: 5 unique queries. The trailing
    // 7-day window at that point excludes the day-0 repeats entirely.
    const queries: NormalizedQuery[] = [q('shared', 0, 9), q('shared', 0, 10)]
    for (let i = 0; i < COMPETENCY_MIN_QUERIES; i += 1) {
      queries.push(q(`fresh ${i}`, COMPETENCY_TRAILING_DAYS + 1, i))
    }
    const result = computeCompetency(START, queries, at(ONBOARDING_WINDOW_DAYS))
    assert.ok(result.firstIndependentAt)
  })
})
