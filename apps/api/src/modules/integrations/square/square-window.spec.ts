import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { z } from 'zod'
import {
  applyScheduleWindowRefinements,
  ScheduleWindowInputShape,
} from './square-window'

const schema = applyScheduleWindowRefinements(z.object({ ...ScheduleWindowInputShape }))

describe('square-window schedule refinements', () => {
  it('accepts the default empty input (defaults applied at resolve time)', () => {
    const r = schema.safeParse({})
    assert.equal(r.success, true)
  })

  it('accepts aheadHours-only forward-looking window', () => {
    const r = schema.safeParse({ aheadHours: 168 })
    assert.equal(r.success, true)
  })

  it('accepts sinceHours + aheadHours hybrid (this week mid-week)', () => {
    const r = schema.safeParse({ sinceHours: 48, aheadHours: 120 })
    assert.equal(r.success, true)
  })

  it('accepts a fixed fromIso/toIso range', () => {
    const r = schema.safeParse({
      fromIso: '2026-05-18T00:00:00Z',
      toIso: '2026-05-25T00:00:00Z',
    })
    assert.equal(r.success, true)
  })

  it('rejects mixing rolling + fixed forms', () => {
    const r = schema.safeParse({ aheadHours: 168, fromIso: '2026-05-18T00:00:00Z' })
    assert.equal(r.success, false)
  })

  it('rejects toIso without fromIso', () => {
    const r = schema.safeParse({ toIso: '2026-05-25T00:00:00Z' })
    assert.equal(r.success, false)
  })

  it('rejects toIso before fromIso', () => {
    const r = schema.safeParse({
      fromIso: '2026-05-25T00:00:00Z',
      toIso: '2026-05-18T00:00:00Z',
    })
    assert.equal(r.success, false)
  })
})
