import { DEBUG_CONTENT_TRUNCATE, type DebugRetagQueueCounts } from '../../types'

export function truncateAtWord(s: string, max = 160): string {
  if (typeof s !== 'string') return ''
  if (s.length <= max) return s
  const slice = s.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > max * 0.6 ? lastSpace : max
  return `${slice.slice(0, cut).trimEnd()}…`
}

type ToolCallResult = {
  ok: boolean
  data?: unknown
  reason?: string
  message?: string
}

type ToolCallEntry = {
  round?: number
  toolUseId?: string
  tool?: string
  input?: unknown
  result?: ToolCallResult
}

export function truncateToolCallLogEntry(entry: unknown): unknown {
  if (!entry || typeof entry !== 'object') return entry
  const e = entry as ToolCallEntry
  if (!e.result || typeof e.result !== 'object') return entry
  if (!e.result.ok || !Array.isArray(e.result.data)) return entry

  const cappedData = e.result.data.map((hit: unknown) => {
    if (!hit || typeof hit !== 'object') return hit
    const h = hit as Record<string, unknown>
    if (typeof h.content !== 'string') return hit
    if (h.content.length <= DEBUG_CONTENT_TRUNCATE) return hit
    return {
      ...h,
      content: h.content.slice(0, DEBUG_CONTENT_TRUNCATE),
      __truncated: true,
    }
  })

  return {
    ...e,
    result: { ...e.result, data: cappedData },
  }
}

export function truncateToolCallLog(log: unknown): unknown {
  if (!Array.isArray(log)) return log
  return log.map(truncateToolCallLogEntry)
}

const KNOWN_STATUSES = ['queued', 'processing', 'done', 'failed', 'exhausted'] as const

type StatusGroupRow = {
  status: string
  _count: { status: number }
}

export function mapStatusCount(
  rows: StatusGroupRow[],
  log: (evt: string, payload: Record<string, unknown>) => void,
): DebugRetagQueueCounts {
  const counts: DebugRetagQueueCounts = {
    queued: 0,
    processing: 0,
    done: 0,
    failed: 0,
    exhausted: 0,
  }
  for (const row of rows) {
    const key = row.status as keyof DebugRetagQueueCounts
    if (KNOWN_STATUSES.includes(row.status as (typeof KNOWN_STATUSES)[number])) {
      counts[key] = (counts[key] ?? 0) + row._count.status
    } else {
      log('debug.unknown_status', { status: row.status, count: row._count.status })
      counts.failed += row._count.status
    }
  }
  return counts
}
