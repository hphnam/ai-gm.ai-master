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
  return (
    <div
      className={cn(
        'group border-b border-border/40 transition-colors last:border-b-0',
        note.status === 'unread' && 'bg-muted/30',
        isFocused && 'ring-2 ring-foreground/20 ring-inset',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground/70">
          {/* Automated rows wear the gm wordmark in place of the category */}
          {/* icon so the recipient reads it as "the assistant reminding me" */}
          {/* rather than "Elliot sent me a message". */}
          {note.automated ? (
            <span className="font-display font-semibold text-[10px] text-foreground/80 leading-none tracking-tight">
              gm
            </span>
          ) : (
            <CategoryIcon category={note.category} />
          )}
          {note.status === 'unread' ? (
            <span
              role="status"
              aria-label="Unread"
              className="-top-0.5 -right-0.5 absolute h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background"
            />
          ) : null}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-baseline gap-1.5">
              {note.automated ? (
                <>
                  <span className="shrink-0 font-medium text-foreground text-xs">gm</span>
                  {note.author ? (
                    <span className="min-w-0 truncate text-[10px] text-foreground/50">
                      · {note.category === 'task' ? 'task by' : 'set up by'} {authorLabel(note)}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="truncate font-medium text-foreground text-xs">
                  {authorLabel(note)}
                </span>
              )}
              <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] text-foreground/55 uppercase tracking-wider">
                {CATEGORY_LABELS[note.category]}
              </span>
            </span>
            <time
              dateTime={note.createdAt}
              className="shrink-0 text-[10px] text-foreground/50"
              title={new Date(note.createdAt).toLocaleString()}
            >
              {formatRelative(note.createdAt)}
            </time>
          </div>
          <p
            className={cn(
              'whitespace-pre-wrap break-words text-foreground/85 text-sm',
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
