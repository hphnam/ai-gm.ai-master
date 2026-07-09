import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { audienceForRole } from './chat-starters.queue'

describe('audienceForRole', () => {
  it('maps owner to the manager set', () => {
    assert.equal(audienceForRole('owner'), 'manager')
  })

  it('maps manager to the manager set', () => {
    assert.equal(audienceForRole('manager'), 'manager')
  })

  it('maps staff to the staff set', () => {
    assert.equal(audienceForRole('staff'), 'staff')
  })

  it('falls to the staff set for an unresolved role', () => {
    assert.equal(audienceForRole(null), 'staff')
  })

  it('falls to the staff set for an unknown role string', () => {
    assert.equal(audienceForRole('regional-director'), 'staff')
  })
})
