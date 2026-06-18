import type { ReactNode } from 'react'

export type ToolPart = {
  type: string
  toolCallId?: string
  state?: string
  input?: unknown
  output?: unknown
}

export type ToolOk<T> = { ok: true; data: T }
export type ToolFail = { ok: false; reason: string; detail?: string }
export type ToolOutput<T> = ToolOk<T> | ToolFail

export function isToolOk<T>(out: unknown): out is ToolOk<T> {
  return (
    typeof out === 'object' &&
    out !== null &&
    (out as { ok?: boolean }).ok === true &&
    'data' in (out as object)
  )
}

export function isToolFail(out: unknown): out is ToolFail {
  return (
    typeof out === 'object' &&
    out !== null &&
    (out as { ok?: boolean }).ok === false &&
    typeof (out as { reason?: unknown }).reason === 'string'
  )
}

export type ToolCardCtx = {
  /// Re-prompt the agent with a freshly worded message. Cards use this for
  /// actions the agent should reason about (picking a disambiguation
  /// candidate, asking for a refined view, etc.).
  onPrompt?: (text: string) => void | Promise<void>
  /// Venue id for the current chat — needed by mutation cards that hit
  /// venue-scoped endpoints.
  venueId: string | null
}

export type ToolCardRendererProps = {
  part: ToolPart
  ctx: ToolCardCtx
}

export type ToolCardRenderer = (props: ToolCardRendererProps) => ReactNode

/// `User.name` is self-edited via better-auth and reaches us untrusted. Cards
/// interpolate it into `@[<name>](<userId>)` mention chips that the agent
/// parses for routing — so a hostile name like `Alice](other-uuid)…` could
/// redirect a task or note to a different recipient. Strip the mention
/// delimiters + newlines before splicing into prompt text. Empty results fall
/// back to a generic label.
export function sanitizeMentionName(raw: string | null | undefined): string {
  if (!raw) return 'member'
  const cleaned = raw.replace(/[[\]()\n\r]/g, '').trim()
  return cleaned.length > 0 ? cleaned : 'member'
}
