import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildVenueScopeWhere,
  resolveClientForRequest,
  runWithVenueContext,
  VenueScopeViolationError,
  venueScopeExtension,
} from './venue-context'

// The extension now closes over a fixed scope (Prisma runs its hook in a
// detached async context, so the scope can't be read from ALS inside it).
function opFor(venueIds: string[]) {
  return venueScopeExtension({ role: 'staff', venueIds }).query.$allModels.$allOperations
}

// Drives the extension exactly as Prisma would, capturing the args it forwards.
function call(
  venueIds: string[],
  input: { model: string; operation: string; args: Record<string, unknown>; result?: unknown },
) {
  const record: { args: Record<string, unknown> | null } = { args: null }
  const query = async (args: Record<string, unknown>) => {
    record.args = args
    return input.result
  }
  return { record, run: () => opFor(venueIds)({ ...input, query }) }
}

describe('buildVenueScopeWhere', () => {
  it('reads org-wide models with an OR-null branch', () => {
    assert.deepEqual(buildVenueScopeWhere({ field: 'venueId', orgWideVisible: true }, ['a', 'b']), {
      OR: [{ venueId: null }, { venueId: { in: ['a', 'b'] } }],
    })
  })

  it('reads venue-bound models with a plain in-filter', () => {
    assert.deepEqual(buildVenueScopeWhere({ field: 'venueId', orgWideVisible: false }, ['a']), {
      venueId: { in: ['a'] },
    })
  })

  it('drops the org-wide branch for writes', () => {
    assert.deepEqual(
      buildVenueScopeWhere({ field: 'venueId', orgWideVisible: true }, ['a'], true),
      {
        venueId: { in: ['a'] },
      },
    )
  })

  it('keys the Venue model by its own id', () => {
    assert.deepEqual(buildVenueScopeWhere({ field: 'id', orgWideVisible: false }, ['a']), {
      id: { in: ['a'] },
    })
  })
})

describe('venueScopeExtension — reads', () => {
  it('does not touch an unregistered model', async () => {
    const c = call(['a'], { model: 'Notification', operation: 'findMany', args: { where: {} } })
    await c.run()
    assert.deepEqual(c.record.args, { where: {} })
  })

  it('injects an org-wide-aware filter for a scoped findMany', async () => {
    const c = call(['a'], { model: 'Task', operation: 'findMany', args: { where: { done: true } } })
    await c.run()
    assert.deepEqual(c.record.args, {
      where: { AND: [{ done: true }, { OR: [{ venueId: null }, { venueId: { in: ['a'] } }] }] },
    })
  })

  it('returns null from findUnique when the row is out of scope', async () => {
    const c = call(['a'], {
      model: 'IncidentLog',
      operation: 'findUnique',
      args: { where: { id: 'x' } },
      result: { id: 'x', venueId: 'other' },
    })
    assert.equal(await c.run(), null)
  })

  it('returns the row from findUnique when in scope', async () => {
    const row = { id: 'x', venueId: 'a' }
    const c = call(['a'], {
      model: 'IncidentLog',
      operation: 'findUnique',
      args: { where: { id: 'x' } },
      result: row,
    })
    assert.equal(await c.run(), row)
  })

  it('throws from findUniqueOrThrow when out of scope', async () => {
    const c = call(['a'], {
      model: 'IncidentLog',
      operation: 'findUniqueOrThrow',
      args: { where: { id: 'x' } },
      result: { id: 'x', venueId: 'other' },
    })
    await assert.rejects(c.run, VenueScopeViolationError)
  })
})

describe('venueScopeExtension — writes', () => {
  it('rejects a create pinned to an out-of-scope venue', async () => {
    const c = call(['a'], {
      model: 'Task',
      operation: 'create',
      args: { data: { title: 't', venueId: 'other' } },
    })
    await assert.rejects(c.run, VenueScopeViolationError)
  })

  it('allows a create pinned to an in-scope venue', async () => {
    const c = call(['a'], {
      model: 'Task',
      operation: 'create',
      args: { data: { title: 't', venueId: 'a' } },
    })
    await c.run()
    assert.deepEqual(c.record.args, { data: { title: 't', venueId: 'a' } })
  })

  it('allows an org-wide create (no venueId)', async () => {
    const c = call(['a'], { model: 'Task', operation: 'create', args: { data: { title: 't' } } })
    await c.run()
    assert.deepEqual(c.record.args, { data: { title: 't' } })
  })

  it('narrows a bulk deleteMany to owned venues only (no org-wide rows)', async () => {
    const c = call(['a'], {
      model: 'Task',
      operation: 'deleteMany',
      args: { where: { done: true } },
    })
    await c.run()
    assert.deepEqual(c.record.args, {
      where: { AND: [{ done: true }, { venueId: { in: ['a'] } }] },
    })
  })

  it('does not scope-validate creating the Venue itself', async () => {
    const c = call(['a'], { model: 'Venue', operation: 'create', args: { data: { name: 'New' } } })
    await c.run()
    assert.deepEqual(c.record.args, { data: { name: 'New' } })
  })

  it('pushes a strict venue filter into a single update by id', async () => {
    const c = call(['a'], {
      model: 'Task',
      operation: 'update',
      args: { where: { id: 'x' }, data: { done: true } },
    })
    await c.run()
    assert.deepEqual(c.record.args, {
      where: { id: 'x', venueId: { in: ['a'] } },
      data: { done: true },
    })
  })

  it('pushes a strict venue filter into a single delete by id', async () => {
    const c = call(['a'], {
      model: 'IncidentLog',
      operation: 'delete',
      args: { where: { id: 'x' } },
    })
    await c.run()
    assert.deepEqual(c.record.args, { where: { id: 'x', venueId: { in: ['a'] } } })
  })

  it('narrows updateManyAndReturn like updateMany', async () => {
    const c = call(['a'], {
      model: 'Task',
      operation: 'updateManyAndReturn',
      args: { where: { done: false }, data: { done: true } },
    })
    await c.run()
    assert.deepEqual(c.record.args, {
      where: { AND: [{ done: false }, { venueId: { in: ['a'] } }] },
      data: { done: true },
    })
  })

  it('validates each row of createManyAndReturn', async () => {
    const c = call(['a'], {
      model: 'Task',
      operation: 'createManyAndReturn',
      args: { data: [{ venueId: 'a' }, { venueId: 'other' }] },
    })
    await assert.rejects(c.run, VenueScopeViolationError)
  })

  it('rejects updating the Venue itself when out of scope', async () => {
    const c = call(['a'], { model: 'Venue', operation: 'update', args: { where: { id: 'other' } } })
    await assert.rejects(c.run, VenueScopeViolationError)
  })

  it('allows updating the Venue itself when in scope', async () => {
    const c = call(['a'], {
      model: 'Venue',
      operation: 'update',
      args: { where: { id: 'a' }, data: { name: 'x' } },
    })
    await c.run()
    assert.deepEqual(c.record.args, { where: { id: 'a' }, data: { name: 'x' } })
  })
})

describe('resolveClientForRequest', () => {
  // A stand-in base client whose $extends returns a tagged sentinel so we can
  // tell whether the scoped (extended) client was selected.
  const base = { $extends: () => ({ tag: 'extended' }) } as never

  it('returns the base client when there is no request context', () => {
    assert.equal(resolveClientForRequest(base), base)
  })

  it('returns the base client for an owner (unscoped)', () => {
    runWithVenueContext({ role: 'owner', venueIds: ['a'] }, () => {
      assert.equal(resolveClientForRequest(base), base)
    })
  })

  it('returns the base client for a member with no venue restriction', () => {
    runWithVenueContext({ role: 'staff', venueIds: [] }, () => {
      assert.equal(resolveClientForRequest(base), base)
    })
  })

  it('returns a scoped client for a venue-scoped member, cached across calls', () => {
    runWithVenueContext({ role: 'staff', venueIds: ['a'] }, () => {
      const first = resolveClientForRequest(base)
      assert.deepEqual(first, { tag: 'extended' })
      assert.equal(resolveClientForRequest(base), first)
    })
  })
})
