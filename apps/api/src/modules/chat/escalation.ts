// Derives the escalation signal for an assistant turn from its toolCallLog.
// Powers operator-metrics fields on ChatMessage (escalatedAt / escalatedToUserId
// / escalationKind) — the inputs to "Manager Interruptions Prevented" (spec A)
// and "AI Response Resolution Rate" (spec F).
//
// An assistant turn is "escalated" when it routed the request to a human via
// one of three tools:
//
//   - log_incident                — always escalates (the prompt promises the
//                                   duty manager will be notified); generic
//                                   target, escalatedToUserId stays NULL.
//   - create_task                 — escalates only when the resolved assignee
//                                   is a DIFFERENT user than the author. Self-
//                                   assigned tasks are the user setting their
//                                   own reminder, not an interruption.
//   - leave_note_for_user         — escalates only when the recipient differs
//                                   from the author. The dispatcher already
//                                   blocks self-notes; the guard here is
//                                   defence in depth.
//
// Multiple escalating tools in one turn → record the FIRST one. Picking first
// over last is arbitrary but stable: the metric only cares whether the turn
// escalated at all, and "first" matches the read order in the UI's tool chips.

import type { ToolCallLogEntry } from '../../types/chat-message'

export type EscalationKind = 'incident' | 'task' | 'note'

export type EscalationSignal = {
  escalatedAt: Date
  escalatedToUserId: string | null
  escalationKind: EscalationKind
}

const ESCALATING_TOOLS: ReadonlySet<string> = new Set([
  'log_incident',
  'create_task',
  'leave_note_for_user',
])

type OkResult = { ok: true; data: unknown }

function isOk(result: unknown): result is OkResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    (result as { ok?: unknown }).ok === true &&
    'data' in result
  )
}

function readString(data: unknown, key: string): string | null {
  if (typeof data !== 'object' || data === null) return null
  const value = (data as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function deriveEscalation(
  toolCallLog: readonly ToolCallLogEntry[],
  authorUserId: string | null,
  now: Date = new Date(),
): EscalationSignal | null {
  for (const entry of toolCallLog) {
    if (!ESCALATING_TOOLS.has(entry.tool)) continue
    if (!isOk(entry.result)) continue
    const data = entry.result.data

    if (entry.tool === 'log_incident') {
      return { escalatedAt: now, escalatedToUserId: null, escalationKind: 'incident' }
    }

    // create_task and leave_note_for_user share a `status: 'created'` shape on
    // success; other statuses (no-match, needs-disambiguation) are lookups that
    // didn't actually write anything, so they don't count as escalation.
    const status = readString(data, 'status')
    if (status !== 'created') continue

    if (entry.tool === 'create_task') {
      const assigneeUserId = readString(data, 'assigneeUserId')
      if (!assigneeUserId) continue
      if (assigneeUserId === authorUserId) continue
      return {
        escalatedAt: now,
        escalatedToUserId: assigneeUserId,
        escalationKind: 'task',
      }
    }

    if (entry.tool === 'leave_note_for_user') {
      const recipientUserId = readString(data, 'recipientUserId')
      if (!recipientUserId) continue
      if (recipientUserId === authorUserId) continue
      return {
        escalatedAt: now,
        escalatedToUserId: recipientUserId,
        escalationKind: 'note',
      }
    }
  }
  return null
}
