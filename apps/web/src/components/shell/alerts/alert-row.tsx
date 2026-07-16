'use client'

import type { Notification } from '@/lib/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { authorLabel, CATEGORY_LABELS, CategoryIcon, formatRelative } from '../notifications-shared'
import { ActionRow } from './action-row'
import { AlertReplyThread } from './alert-reply-thread'

// Mirrors the body-link regex used elsewhere — extracts `[label](/path)` from
// notifications so reports/tasks can render a CTA button. Same path-traversal
// guards as the previous implementation.
const INTERNAL_LINK_RE = /\[([^\]]+)\]\((\/[^)\s]+)\)/
function extractActionLink(body: string): { label: string; href: string } | null {
  const m = INTERNAL_LINK_RE.exec(body)
  if (!m) return null
  const label = m[1]?.trim()
  const href = m[2]?.trim()
  if (!label || !href) return null
  if (href.includes('..') || href.includes('\\') || href.includes('//')) return null
  if (!/^\/(reports|tasks|chat|compliance|members|venues)(\/|$)/.test(href)) return null
  return { label, href }
}
function stripInternalLinks(body: string): string {
  return body.replace(INTERNAL_LINK_RE, '$1')
}

// Per-category colour: compliance ("closes a venue if you miss it") is clay,
// tasks green, system a muted ink, everything else the assistant's brass. The
// glyph tile and the little category chip share the same tint.
function categoryTone(category: Notification['category']): { bg: string; text: string } {
  switch (category) {
    case 'compliance':
      return { bg: 'bg-[rgba(154,75,44,0.12)]', text: 'text-[var(--clay)]' }
    case 'task':
      return { bg: 'bg-[rgba(47,93,61,0.1)]', text: 'text-[var(--ledger-green)]' }
    case 'system':
      return { bg: 'bg-[rgba(32,26,18,0.07)]', text: 'text-[var(--mono-muted)]' }
    default:
      return { bg: 'bg-[rgba(143,107,31,0.1)]', text: 'text-[var(--brass)]' }
  }
}

export function AlertRow({
  note,
  expanded,
  isFocused,
  replyDraft,
  onReplyDraftChange,
  onToggle,
}: {
  note: Notification
  expanded: boolean
  isFocused: boolean
  replyDraft: string
  onReplyDraftChange: (v: string) => void
  onToggle: () => void
}) {
  const action =
    note.category === 'report' || note.category === 'task' ? extractActionLink(note.body) : null
  const bodyPreview = stripInternalLinks(note.body)
  const tone = categoryTone(note.category)
  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border transition-shadow',
        note.status === 'unread'
          ? 'border-[rgba(143,107,31,0.35)] bg-[#fbf6ea]'
          : 'border-[var(--hairline)] bg-[var(--ledger-card)]',
        isFocused && 'ring-2 ring-[var(--brass)]/30',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-[var(--paper-2)]/40"
      >
        <span
          className={cn(
            'relative mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[rgba(32,26,18,0.1)]',
            tone.bg,
            tone.text,
          )}
        >
          {/* Automated rows wear the gm wordmark in place of the category */}
          {/* icon so the recipient reads it as "the assistant reminding me" */}
          {/* rather than "Elliot sent me a message". */}
          {note.automated ? (
            <span className="font-display font-semibold text-[10px] leading-none tracking-tight">
              gm
            </span>
          ) : (
            <CategoryIcon category={note.category} />
          )}
          {note.status === 'unread' ? (
            <span
              role="status"
              aria-label="Unread"
              className="-top-0.5 -right-0.5 absolute h-2 w-2 rounded-full bg-[var(--brass)] ring-2 ring-background"
            />
          ) : null}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-baseline gap-1.5">
              {note.automated ? (
                <>
                  <span className="shrink-0 font-semibold text-foreground text-xs">gm</span>
                  {note.author ? (
                    <span className="min-w-0 truncate text-[10px] text-[var(--ink-faint)]">
                      · {note.category === 'task' ? 'task by' : 'set up by'} {authorLabel(note)}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="truncate font-semibold text-foreground text-xs">
                  {authorLabel(note)}
                </span>
              )}
              <span
                className={cn(
                  'shrink-0 rounded font-mono-ledger px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.05em]',
                  tone.bg,
                  tone.text,
                )}
              >
                {CATEGORY_LABELS[note.category]}
              </span>
            </span>
            <time
              dateTime={note.createdAt}
              className="shrink-0 font-mono-ledger text-[10px] text-[var(--ink-faint)]"
              title={new Date(note.createdAt).toLocaleString()}
            >
              {formatRelative(note.createdAt)}
            </time>
          </div>
          <p
            className={cn(
              'whitespace-pre-wrap break-words text-[#3a3327] text-sm',
              expanded ? '' : 'line-clamp-3',
            )}
          >
            {bodyPreview}
          </p>
        </div>
      </button>
      {/* Interactive controls (Link, Mark complete) live OUTSIDE the toggle */}
      {/* button to keep the DOM valid — HTML5 forbids interactive descendants */}
      {/* inside <button>. ActionRow returns null when there's nothing to show, */}
      {/* so the row stays tight when no actions apply. */}
      <ActionRow note={note} bodyAction={action} />
      {expanded && note.author ? (
        <AlertReplyThread note={note} draft={replyDraft} onDraftChange={onReplyDraftChange} />
      ) : null}
    </div>
  )
}
