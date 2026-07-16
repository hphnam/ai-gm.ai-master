import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ExecutionContext } from '@nestjs/common'
import { NotFoundException } from '@nestjs/common'
import type { AuthedRequest } from './auth.guard'
import { canAccessVenue, isVenueScoped, resolveAccessibleVenueIds } from './venue-scope'
import { VenueScopeGuard } from './venue-scope.guard'

describe('isVenueScoped', () => {
  it('treats an empty venue list as unscoped', () => {
    assert.equal(isVenueScoped({ role: 'staff', venueIds: [] }), false)
  })

  it('treats a non-empty list as scoped for staff', () => {
    assert.equal(isVenueScoped({ role: 'staff', venueIds: ['v1'] }), true)
  })

  it('never scopes an owner even with a non-empty list', () => {
    assert.equal(isVenueScoped({ role: 'owner', venueIds: ['v1'] }), false)
  })
})

describe('canAccessVenue', () => {
  it('allows an unscoped member any venue', () => {
    assert.equal(canAccessVenue({ role: 'staff', venueIds: [] }, 'v9'), true)
  })

  it('allows a scoped member their own venue', () => {
    assert.equal(canAccessVenue({ role: 'manager', venueIds: ['v1', 'v2'] }, 'v2'), true)
  })

  it('denies a scoped member an out-of-scope venue', () => {
    assert.equal(canAccessVenue({ role: 'manager', venueIds: ['v1', 'v2'] }, 'v3'), false)
  })

  it('allows an owner any venue regardless of the list', () => {
    assert.equal(canAccessVenue({ role: 'owner', venueIds: ['v1'] }, 'v3'), true)
  })
})

describe('resolveAccessibleVenueIds', () => {
  it('returns every org venue for an unscoped member', () => {
    assert.deepEqual(resolveAccessibleVenueIds({ role: 'staff', venueIds: [] }, ['a', 'b', 'c']), [
      'a',
      'b',
      'c',
    ])
  })

  it('narrows to the intersection for a scoped member', () => {
    assert.deepEqual(
      resolveAccessibleVenueIds({ role: 'staff', venueIds: ['b', 'z'] }, ['a', 'b', 'c']),
      ['b'],
    )
  })
})

function fakeContext(req: Partial<AuthedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req as AuthedRequest }),
  } as unknown as ExecutionContext
}

describe('VenueScopeGuard', () => {
  const guard = new VenueScopeGuard()

  it('passes a request with no membership (public route)', () => {
    assert.equal(guard.canActivate(fakeContext({ query: { venueId: 'v3' } })), true)
  })

  it('passes an unscoped member reaching any venue', () => {
    assert.equal(
      guard.canActivate(
        fakeContext({ membership: { role: 'staff', venueIds: [] }, query: { venueId: 'v3' } }),
      ),
      true,
    )
  })

  it('passes a scoped member reaching their own venue (from body)', () => {
    assert.equal(
      guard.canActivate(
        fakeContext({ membership: { role: 'staff', venueIds: ['v1'] }, body: { venueId: 'v1' } }),
      ),
      true,
    )
  })

  it('denies a scoped member reaching an out-of-scope venue', () => {
    assert.throws(
      () =>
        guard.canActivate(
          fakeContext({
            membership: { role: 'staff', venueIds: ['v1'] },
            query: { venueId: 'v2' },
          }),
        ),
      NotFoundException,
    )
  })

  it('passes a scoped member on a request carrying no venueId', () => {
    assert.equal(
      guard.canActivate(fakeContext({ membership: { role: 'manager', venueIds: ['v1'] } })),
      true,
    )
  })
})
