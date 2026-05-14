'use client'

import { User as UserIcon } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Recipient, useNotificationRecipients } from '@/lib/hooks/use-notifications'
import { cn } from '@/lib/utils'

/// What the AGENT sees on the wire — `@[Name](userId)` so the dispatcher can
/// resolve a canonical assignee without name-disambiguation. The textarea
/// itself never shows this form; the user only types/sees `@Name`. We track
/// the userId mapping in parent state and reconstruct the chip syntax at
/// submit time via `serializeMentions`.
const MENTION_WIRE_FORMAT = (name: string, userId: string) => `@[${name}](${userId})`

/// What the USER sees in the textarea — `@Name`. Trailing space is appended
/// by `insertMention` so the caret lands ready for the next word.
const MENTION_DISPLAY_FORMAT = (name: string) => `@${name}`

/// Parent-tracked mention metadata. We only need to remember name → userId
/// — the position of each mention is recovered by string search at submit
/// time. Multiple mentions of the same person are allowed; we walk left-to-
/// right and replace once per stored entry.
export type ChipMention = { display: string; userId: string }

type Props = {
  /// Anchor element — the picker positions itself just above this. Typically
  /// the composer textarea.
  anchor: HTMLElement | null
  /// Active substring after the "@" (lowercased). Empty string shows all
  /// members; null means the picker is closed.
  query: string | null
  onSelect: (member: Recipient) => void
  onClose: () => void
}

const MAX_VISIBLE = 6

export function MentionPicker({ anchor, query, onSelect, onClose }: Props) {
  const recipients = useNotificationRecipients({ enabled: query !== null })
  const members = recipients.data?.members ?? []

  const filtered = useMemo<Recipient[]>(() => {
    if (query === null) return []
    const q = query.toLowerCase().trim()
    if (!q) return members.slice(0, MAX_VISIBLE)
    return members
      .filter(
        (m) => (m.name?.toLowerCase().includes(q) ?? false) || m.email.toLowerCase().includes(q),
      )
      .slice(0, MAX_VISIBLE)
  }, [members, query])

  const [activeIndex, setActiveIndex] = useState(0)
  // Reset selection whenever the query changes so a fresh shortlist starts
  // highlighted on the first row.
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Keyboard navigation — bind to the document while open so the picker
  // intercepts arrows/enter/escape even though focus stays in the textarea.
  // We use a ref to the latest filtered list to avoid re-binding on every
  // keystroke.
  const filteredRef = useRef(filtered)
  filteredRef.current = filtered
  useEffect(() => {
    if (query === null) return
    const handler = (e: KeyboardEvent) => {
      const list = filteredRef.current
      if (list.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % list.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + list.length) % list.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const pick = list[Math.min(activeIndex, list.length - 1)]
        if (pick) onSelect(pick)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [query, onClose, onSelect, activeIndex])

  // Position the popover relative to the anchor. We render it above the
  // composer because the composer sits at the bottom of the chat surface;
  // dropping below would clip on most viewports. Recomputes on scroll +
  // resize so the chip tracks the textarea when the user grows it with
  // multi-line input or resizes the window.
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)
  useEffect(() => {
    if (!anchor || query === null) {
      setPos(null)
      return
    }
    const measure = () => {
      const rect = anchor.getBoundingClientRect()
      setPos({ left: rect.left, top: rect.top, width: rect.width })
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [anchor, query, filtered.length])

  if (query === null || !pos) return null
  // Portal to document.body so the picker escapes any ancestor with a
  // `backdrop-filter` / `transform` / `filter` set — those properties
  // establish a containing block for `position: fixed` descendants per the
  // CSS spec, which would otherwise position this popover relative to the
  // composer's blurred wrapper instead of the viewport. We saw this in dev:
  // the picker was technically rendered but offset off-screen.
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="listbox"
      aria-label="Tag a member"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top - 8,
        width: Math.min(pos.width, 360),
        transform: 'translateY(-100%)',
      }}
      className="z-50 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
    >
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {recipients.isLoading ? 'Loading…' : 'No matches.'}
        </div>
      ) : (
        filtered.map((m, idx) => {
          const active = idx === activeIndex
          return (
            <button
              key={m.userId}
              type="button"
              role="option"
              aria-selected={active}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => {
                // Prevent the textarea from losing focus before we insert
                // the mention — onClick would fire after blur and the
                // caret-restoration logic in the parent would miss the
                // intended insertion point.
                e.preventDefault()
                onSelect(m)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm',
                active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
              )}
            >
              <span className="truncate font-medium">{m.name ?? m.email}</span>
              <span className="ml-auto shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
                {m.role}
              </span>
            </button>
          )
        })
      )}
    </div>,
    document.body,
  )
}

/// Public helper for the composer — given current textarea value + caret
/// index, returns the active "@query" if the caret is inside one, or null.
/// Trigger rules:
///   - "@" must be preceded by start-of-string, whitespace, or newline.
///   - Query is everything from "@" to the caret, max 32 chars, no spaces.
///   - A second "@" inside the query closes the trigger (treat as cancel).
export function detectMentionTrigger(
  text: string,
  caret: number,
): { query: string; triggerStart: number } | null {
  if (caret < 1 || caret > text.length) return null
  // Walk backwards from the caret looking for "@". Bail if we hit whitespace
  // first (means the user moved past the mention) or the start of the line.
  let i = caret - 1
  while (i >= 0) {
    const ch = text[i]
    if (ch === '@') {
      const before = i === 0 ? '' : text[i - 1]
      const valid = i === 0 || before === ' ' || before === '\n' || before === '\t'
      if (!valid) return null
      const query = text.slice(i + 1, caret)
      if (query.length > 32) return null
      if (/[\s@]/.test(query)) return null
      return { query, triggerStart: i }
    }
    if (ch === '\n' || ch === ' ' || ch === '\t') return null
    if (caret - i > 32) return null
    i -= 1
  }
  return null
}

/// Insert a mention chip at `triggerStart..caret`. Writes the human-readable
/// `@Name ` form (no userId in the visible text); the userId is tracked in
/// parent state via the returned `mention` and reattached at submit time.
export function insertMention(
  text: string,
  triggerStart: number,
  caret: number,
  member: Recipient,
): { value: string; nextCaret: number; mention: ChipMention } {
  const display = member.name ?? member.email
  const chip = `${MENTION_DISPLAY_FORMAT(display)} `
  const next = text.slice(0, triggerStart) + chip + text.slice(caret)
  return {
    value: next,
    nextCaret: triggerStart + chip.length,
    mention: { display, userId: member.userId },
  }
}

/// Reconstruct the wire format from the user-facing text + the chip metadata
/// the composer has been collecting. For each stored mention we replace the
/// FIRST remaining unconsumed `@Name` occurrence (left-to-right) with the
/// full `@[Name](userId)` chip syntax. Mentions whose display name no longer
/// appears in the text (user deleted or edited them out) are silently
/// dropped — fallback to plain `@Name` lets the server's name-disambiguation
/// path catch any ambiguity.
export function serializeMentions(text: string, mentions: ChipMention[]): string {
  if (mentions.length === 0) return text
  // Track consumed positions so two mentions of the same person resolve in
  // insertion order rather than both matching the first occurrence.
  let cursor = 0
  let out = ''
  const remaining = [...mentions]
  while (cursor < text.length) {
    let bestIdx = -1
    let bestMention = -1
    for (let i = 0; i < remaining.length; i++) {
      const needle = MENTION_DISPLAY_FORMAT(remaining[i].display)
      const idx = text.indexOf(needle, cursor)
      if (idx === -1) continue
      if (bestIdx === -1 || idx < bestIdx) {
        bestIdx = idx
        bestMention = i
      }
    }
    if (bestMention === -1) {
      out += text.slice(cursor)
      break
    }
    const mention = remaining[bestMention]
    const needle = MENTION_DISPLAY_FORMAT(mention.display)
    out += text.slice(cursor, bestIdx)
    out += MENTION_WIRE_FORMAT(mention.display, mention.userId)
    cursor = bestIdx + needle.length
    remaining.splice(bestMention, 1)
  }
  return out
}

/// Find every "@Name" run in `text` whose `display` exactly matches one of
/// the tracked mentions. Returned as sorted, non-overlapping `[start, end]`
/// ranges — the parent uses these to paint chip backgrounds in the overlay.
export function findChipRanges(
  text: string,
  mentions: ChipMention[],
): Array<{ start: number; end: number; display: string }> {
  if (mentions.length === 0) return []
  const out: Array<{ start: number; end: number; display: string }> = []
  const remaining = [...mentions]
  let cursor = 0
  while (cursor < text.length && remaining.length > 0) {
    let bestIdx = -1
    let bestMention = -1
    for (let i = 0; i < remaining.length; i++) {
      const needle = MENTION_DISPLAY_FORMAT(remaining[i].display)
      const idx = text.indexOf(needle, cursor)
      if (idx === -1) continue
      if (bestIdx === -1 || idx < bestIdx) {
        bestIdx = idx
        bestMention = i
      }
    }
    if (bestMention === -1) break
    const mention = remaining[bestMention]
    const needle = MENTION_DISPLAY_FORMAT(mention.display)
    out.push({ start: bestIdx, end: bestIdx + needle.length, display: mention.display })
    cursor = bestIdx + needle.length
    remaining.splice(bestMention, 1)
  }
  return out.sort((a, b) => a.start - b.start)
}

/// Drop tracked mentions whose `@display` substring no longer appears in
/// `text` (the user backspaced the chip out, or edited the name). Cheap pass
/// for the composer to run on every value change so its mentions state
/// doesn't grow unbounded.
export function pruneMissingMentions(text: string, mentions: ChipMention[]): ChipMention[] {
  if (mentions.length === 0) return mentions
  // Count occurrences of each `@display` in the text. A mention survives if
  // its display name still appears AT LEAST as many times as we have copies
  // of it in the mentions list. We walk the mentions list and the text in
  // parallel: each stored mention claims one occurrence; if there aren't
  // enough left, the extra entries are dropped.
  const counts = new Map<string, number>()
  for (const m of mentions) {
    const needle = MENTION_DISPLAY_FORMAT(m.display)
    if (!counts.has(needle)) {
      let found = 0
      let from = 0
      while (true) {
        const idx = text.indexOf(needle, from)
        if (idx === -1) break
        found++
        from = idx + needle.length
      }
      counts.set(needle, found)
    }
  }
  return mentions.filter((m) => {
    const needle = MENTION_DISPLAY_FORMAT(m.display)
    const remaining = counts.get(needle) ?? 0
    if (remaining > 0) {
      counts.set(needle, remaining - 1)
      return true
    }
    return false
  })
}

/// Regex for the wire format `@[Display Name](userId)`. The name allows any
/// char except `]`; the userId allows any char except `)`. Both are matched
/// non-greedily; the regex is global so we can iterate via matchAll.
const WIRE_MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g

/// Render a message body that may contain `@[Name](userId)` wire-format
/// chips. Each chip becomes a styled pill (user icon + name); plain text
/// flows around it. Used by the chat-message renderer so a sent message like
/// "Remind @[Sarah Brown](usr_xyz) to call" shows the same visual chip the
/// composer's overlay drew before sending.
export function MentionedText({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = []
  let cursor = 0
  let key = 0
  // Reset the regex's lastIndex on every render — global RegExps are stateful
  // and a previous call could otherwise skip matches in this one.
  WIRE_MENTION_RE.lastIndex = 0
  for (const m of text.matchAll(WIRE_MENTION_RE)) {
    if (m.index === undefined) continue
    if (m.index > cursor) parts.push(text.slice(cursor, m.index))
    const name = m[1]
    parts.push(
      <span
        key={`mention-${key++}-${m.index}`}
        className="mx-px inline-flex items-baseline gap-0.5 rounded-md bg-brand/15 px-1.5 py-0.5 font-medium text-brand"
      >
        <UserIcon className="h-3 w-3 self-center" aria-hidden />
        {name}
      </span>,
    )
    cursor = m.index + m[0].length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  if (parts.length === 0) parts.push(text)
  return <span className={className}>{parts}</span>
}
