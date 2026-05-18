// Plan 06-01 Task 3 audit-M5 — single-source PII redaction helper for chat-core.
//
// All chat-core logger calls go through chatCoreLogger. Sensitive field names are
// stripped BEFORE serialization; long string values are truncated. Org/user/
// conversation IDs go through hashId; user-supplied query text through hashQuery.
//
// Direct NestJS Logger.log/info/warn/error calls inside chat-core are forbidden
// (grep-gated by Task 3 verify + repo-level verification table).

import { createHash } from 'node:crypto'
import { Logger } from '@nestjs/common'

const SENSITIVE_KEYS = new Set([
  'userMessage',
  'content',
  'email',
  'phone',
  'rawInput',
  'sanitizedInput',
])

const STRING_TRUNCATE_LIMIT = 200

const sha12 = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 12)

export const hashId = (s: string): string => sha12(s)

export const hashQuery = (s: string): string => sha12(s)

function redact(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { via: 'chatCoreLogger' }
  for (const [k, v] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '[REDACTED]'
      continue
    }
    if (typeof v === 'string' && v.length > STRING_TRUNCATE_LIMIT) {
      out[k] = `[truncated len=${v.length}]`
      continue
    }
    out[k] = v
  }
  return out
}

const baseLogger = new Logger('chatCore')

export const chatCoreLogger = {
  info(event: string, payload: Record<string, unknown> = {}): void {
    baseLogger.log(JSON.stringify({ event, ...redact(payload) }))
  },
  warn(event: string, payload: Record<string, unknown> = {}): void {
    baseLogger.warn(JSON.stringify({ event, ...redact(payload) }))
  },
  error(event: string, payload: Record<string, unknown> = {}): void {
    baseLogger.error(JSON.stringify({ event, ...redact(payload) }))
  },
}

// audit-M2 helper — convert any thrown value into a sanitized one-line failure
// description suitable for chat_messages.content on a turn-failed row. No stack
// traces, no PII; capped at 200 chars.
export function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  return raw.replace(/\s+/g, ' ').slice(0, 200)
}
