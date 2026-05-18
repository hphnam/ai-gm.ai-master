// Run via:
//   node --import tsx --test apps/api/src/modules/chat/escalation.spec.ts

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ToolCallLogEntry } from '../../types/chat-message'
import { deriveEscalation } from './escalation'

const NOW = new Date('2026-05-17T12:00:00Z')
const AUTHOR = 'user_author'
const MANAGER = 'user_manager'

const entry = (tool: string, result: unknown, round: number = 0): ToolCallLogEntry => ({
  round,
  toolUseId: `tu_${round}_${tool}`,
  tool,
  input: {},
  result,
})

describe('deriveEscalation', () => {
  it('returns null for an empty tool log', () => {
    assert.equal(deriveEscalation([], AUTHOR, NOW), null)
  })

  it('returns null when no escalating tool was called', () => {
    const log = [entry('find_knowledge', { ok: true, data: [] })]
    assert.equal(deriveEscalation(log, AUTHOR, NOW), null)
  })

  it('flags log_incident as an escalation with a null target', () => {
    const log = [
      entry('log_incident', {
        ok: true,
        data: { id: 'inc_1', severity: 'minor', createdAt: NOW.toISOString() },
      }),
    ]
    const result = deriveEscalation(log, AUTHOR, NOW)
    assert.deepEqual(result, {
      escalatedAt: NOW,
      escalatedToUserId: null,
      escalationKind: 'incident',
    })
  })

  it('does not flag a failed log_incident', () => {
    const log = [entry('log_incident', { ok: false, reason: 'error' })]
    assert.equal(deriveEscalation(log, AUTHOR, NOW), null)
  })

  it('flags create_task assigned to a different user', () => {
    const log = [
      entry('create_task', {
        ok: true,
        data: { status: 'created', id: 't_1', assigneeUserId: MANAGER },
      }),
    ]
    const result = deriveEscalation(log, AUTHOR, NOW)
    assert.deepEqual(result, {
      escalatedAt: NOW,
      escalatedToUserId: MANAGER,
      escalationKind: 'task',
    })
  })

  it('does NOT flag a self-assigned create_task', () => {
    const log = [
      entry('create_task', {
        ok: true,
        data: { status: 'created', id: 't_1', assigneeUserId: AUTHOR },
      }),
    ]
    assert.equal(deriveEscalation(log, AUTHOR, NOW), null)
  })

  it('does NOT flag a create_task that needs disambiguation (no row written)', () => {
    const log = [
      entry('create_task', {
        ok: true,
        data: { status: 'needs-disambiguation', candidates: [] },
      }),
    ]
    assert.equal(deriveEscalation(log, AUTHOR, NOW), null)
  })

  it('flags leave_note_for_user to a different recipient', () => {
    const log = [
      entry('leave_note_for_user', {
        ok: true,
        data: {
          status: 'created',
          id: 'n_1',
          recipientUserId: MANAGER,
          recipientName: 'Manager',
          createdAt: NOW.toISOString(),
        },
      }),
    ]
    const result = deriveEscalation(log, AUTHOR, NOW)
    assert.deepEqual(result, {
      escalatedAt: NOW,
      escalatedToUserId: MANAGER,
      escalationKind: 'note',
    })
  })

  it('treats a missing author as escalation for any real recipient', () => {
    // Legacy WhatsApp conversations carry userId=null; any note to a real
    // user still counts as escalation since the equality check can't match.
    const log = [
      entry('leave_note_for_user', {
        ok: true,
        data: { status: 'created', id: 'n_1', recipientUserId: MANAGER },
      }),
    ]
    const result = deriveEscalation(log, null, NOW)
    assert.equal(result?.escalationKind, 'note')
    assert.equal(result?.escalatedToUserId, MANAGER)
  })

  it('returns the first escalation when multiple tools escalated', () => {
    const log = [
      entry('find_knowledge', { ok: true, data: [] }, 0),
      entry(
        'create_task',
        { ok: true, data: { status: 'created', id: 't_1', assigneeUserId: MANAGER } },
        1,
      ),
      entry(
        'log_incident',
        { ok: true, data: { id: 'inc_1', severity: 'minor', createdAt: NOW.toISOString() } },
        2,
      ),
    ]
    const result = deriveEscalation(log, AUTHOR, NOW)
    assert.equal(result?.escalationKind, 'task')
    assert.equal(result?.escalatedToUserId, MANAGER)
  })

  it('ignores malformed tool results', () => {
    const log = [
      entry('create_task', null),
      entry('log_incident', { ok: true }),
      entry('leave_note_for_user', { ok: true, data: { status: 'created' } }),
    ]
    assert.equal(deriveEscalation(log, AUTHOR, NOW), null)
  })
})
