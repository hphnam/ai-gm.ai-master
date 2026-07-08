import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { roleMeetsMinRole } from './integration-provider'
import { redactShiftPayForStaff } from './square/square.provider'

describe('roleMeetsMinRole', () => {
  it('lets any role reach a staff-floor tool', () => {
    assert.equal(roleMeetsMinRole('staff', 'staff'), true)
  })

  it('lets a manager reach a manager-floor tool', () => {
    assert.equal(roleMeetsMinRole('manager', 'manager'), true)
  })

  it('lets an owner reach a manager-floor tool', () => {
    assert.equal(roleMeetsMinRole('owner', 'manager'), true)
  })

  it('denies staff a manager-floor tool', () => {
    assert.equal(roleMeetsMinRole('staff', 'manager'), false)
  })

  it('denies an unknown role a manager-floor tool (fail-safe)', () => {
    assert.equal(roleMeetsMinRole('contractor', 'manager'), false)
  })
})

describe('redactShiftPayForStaff', () => {
  const shift = {
    teamMemberName: 'Sam',
    hourlyRate: { value: 12, currency: 'GBP' },
    estimatedCost: { value: 96, currency: 'GBP' },
  }

  it('nulls pay fields for a staff caller', () => {
    const out = redactShiftPayForStaff({ ok: true, data: { shifts: [{ ...shift }] } }, 'staff')
    assert.deepEqual((out as { data: { shifts: unknown[] } }).data.shifts[0], {
      teamMemberName: 'Sam',
      hourlyRate: null,
      estimatedCost: null,
    })
  })

  it('preserves pay fields for a manager caller', () => {
    const out = redactShiftPayForStaff({ ok: true, data: { shifts: [{ ...shift }] } }, 'manager')
    const rows = (out as { data: { shifts: Array<{ hourlyRate: unknown }> } }).data.shifts
    assert.deepEqual(rows[0].hourlyRate, { value: 12, currency: 'GBP' })
  })

  it('passes a failed result through untouched', () => {
    const failure = { ok: false as const, reason: 'error' as const, detail: 'boom' }
    assert.equal(redactShiftPayForStaff(failure, 'staff'), failure)
  })
})
