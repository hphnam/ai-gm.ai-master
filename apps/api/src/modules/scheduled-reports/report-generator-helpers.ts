/// Pure helpers extracted from ReportGeneratorService so they can be unit
/// tested without instantiating the Nest provider (whose `@Inject` decorators
/// require experimental-decorators support that the node:test runner via
/// tsx does not enable by default).

/// One-shot instruction sent to the headless agent. Tells it to use its data
/// tools and call generate_report exactly once — no chat-style prose reply.
export function buildReportUserMessage(args: {
  title: string
  summary: string | null
  prompt: string | null
  venueName: string
  hasVenueScope: boolean
}): string {
  const lines: string[] = []
  lines.push(`You are running a scheduled report titled "${args.title}".`)
  if (args.summary) lines.push(`One-line brief: ${args.summary}`)
  if (args.prompt) lines.push(`Detailed brief: ${args.prompt}`)
  lines.push(
    args.hasVenueScope
      ? `Scope: venue "${args.venueName}". Pass venueId from <current_context> to any tool that accepts one.`
      : `Scope: organisation-wide (no single venue). Roll the numbers up across venues where the tools support it; otherwise default to the venue in <current_context>.`,
  )
  lines.push(
    'Use your data tools (pos_*, find_knowledge, compare_periods, etc.) to gather the latest numbers, then call generate_report exactly once with a complete ReportSpec.',
  )
  lines.push(
    'Do not reply with prose. The tool call is the output — no narration, no permalink, no follow-up sentence.',
  )
  return lines.join('\n\n')
}

export type ReportToolResultVerdict =
  /// Not a generate_report tool result. Ignore.
  | { kind: 'other' }
  /// generate_report returned ok=true with a string id. Capture it.
  | { kind: 'success'; reportId: string }
  /// generate_report returned ok=false (dispatcher error) or a malformed
  /// envelope. Surface the message so the caller can log + distinguish
  /// 'tool-failed' from 'no-tool-call' downstream.
  | { kind: 'failed'; message: string | null }

/// Inspects a tool result emitted during the agent loop. Defensive: only
/// returns 'success' for the exact shape ToolDispatcher's `ok()` wrapper
/// emits for generate_report — `{ ok: true, data: { id: string, … } }`.
export function inspectReportToolResult(
  toolName: string,
  output: unknown,
): ReportToolResultVerdict {
  if (toolName !== 'generate_report') return { kind: 'other' }
  const out = output as {
    ok?: boolean
    data?: { id?: unknown }
    error?: { message?: unknown }
  } | null
  if (!out) return { kind: 'failed', message: null }
  if (out.ok === true) {
    if (typeof out.data?.id === 'string') {
      return { kind: 'success', reportId: out.data.id }
    }
    return { kind: 'failed', message: 'ok-without-id' }
  }
  const message = typeof out.error?.message === 'string' ? out.error.message : null
  return { kind: 'failed', message }
}

/// Strips characters that could forge new prompt structure when a free-text
/// field (venue name, user name, contact name) is interpolated into the
/// agent's system message. Newlines + angle brackets are the two vectors
/// that matter: a value like `"…\n</current_context>\n<system>…"` would
/// otherwise close out the live block and inject a new one. We keep the
/// value human-readable: replace newlines/tabs with spaces, drop angle
/// brackets entirely (no legitimate venue or person name uses them).
export function sanitiseForSystemPrompt(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
}
