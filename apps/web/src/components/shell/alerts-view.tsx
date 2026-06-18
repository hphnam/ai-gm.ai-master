'use client'

import { Check, CheckCheck, Inbox, Loader2, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  type Notification,
  type NotificationCategory,
  type NotificationListFilters,
  useComposeReply,
  useInfiniteNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationReplies,
} from '@/lib/hooks/use-notifications'
import { useUpdateTask } from '@/lib/hooks/use-tasks'
import { cn } from '@/lib/utils'
import {
  ALERT_CATEGORY_ORDER,
  apiErrorLabel,
  authorLabel,
  CATEGORY_LABELS,
  CategoryIcon,
  formatRelative,
  ListSkeleton,
  useDebouncedValue,
} from './notifications-shared'

type AlertStatusFilter = 'all' | 'unread'

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

export function AlertsView({ focusId }: { focusId: string | null }) {
  const [status, setStatus] = useState<AlertStatusFilter>('all')
  const [categories, setCategories] = useState<NotificationCategory[]>([])
  const [rawQuery, setRawQuery] = useState('')
  const debouncedQuery = useDebouncedValue(rawQuery, 250)

  // Alerts surface = chat-category notifications EXCLUDED. If the user picks
  // specific categories from chips, use those (still excluding 'chat'); if
  // they pick none, default to the three alert categories so the server
  // doesn't return chats.
  const effectiveCategories =
    categories.length > 0
      ? categories.filter((c) => c !== 'chat')
      : (['report', 'compliance', 'task', 'system'] as NotificationCategory[])

  const filters: NotificationListFilters = useMemo(
    () => ({
      status,
      direction: 'inbox',
      category: effectiveCategories,
      q: debouncedQuery.trim() || undefined,
      pageSize: 30,
    }),
    [status, effectiveCategories, debouncedQuery],
  )

  return (
    <>
      <AlertsHeader />
      <AlertsSearch query={rawQuery} onQueryChange={setRawQuery} />
      <AlertsFilters
        status={status}
        onStatusChange={setStatus}
        categories={categories}
        onCategoriesChange={setCategories}
      />
      <AlertsList filters={filters} focusId={focusId} />
    </>
  )
}

function AlertsHeader() {
  const markAllRead = useMarkAllNotificationsRead()
  return (
    <div className="flex items-center justify-end gap-1 border-b border-border px-4 py-2">
      <button
        type="button"
        onClick={() =>
          markAllRead.mutate(undefined, {
            onSuccess: (res) => {
              if (res.updated > 0) {
                toast.success(
                  res.updated === 1
                    ? '1 notification marked read'
                    : `${res.updated} notifications marked read`,
                )
              }
            },
            onError: (err) => toast.error(`Couldn't mark all read: ${apiErrorLabel(err)}`),
          })
        }
        disabled={markAllRead.isPending}
        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-foreground/70 text-xs transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        title="Mark all as read"
      >
        <CheckCheck className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Mark all read</span>
      </button>
    </div>
  )
}

function AlertsSearch({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (v: string) => void
}) {
  return (
    <div className="border-b border-border px-4 py-2.5">
      <div className="relative">
        <Search
          className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 text-foreground/40"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search alerts"
          aria-label="Search alerts"
          className="w-full rounded-md border border-border bg-background py-1.5 pr-7 pl-8 text-sm placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="-translate-y-1/2 absolute top-1/2 right-1.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded text-foreground/40 hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function AlertsFilters({
  status,
  onStatusChange,
  categories,
  onCategoriesChange,
}: {
  status: AlertStatusFilter
  onStatusChange: (s: AlertStatusFilter) => void
  categories: NotificationCategory[]
  onCategoriesChange: (c: NotificationCategory[]) => void
}) {
  function toggleCategory(c: NotificationCategory) {
    onCategoriesChange(
      categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c],
    )
  }
  return (
    <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b border-border px-4 py-2.5">
      <Chip active={status === 'all'} onClick={() => onStatusChange('all')} label="All" />
      <Chip active={status === 'unread'} onClick={() => onStatusChange('unread')} label="Unread" />
      <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
      {ALERT_CATEGORY_ORDER.map((c) => (
        <Chip
          key={c}
          active={categories.includes(c)}
          onClick={() => toggleCategory(c)}
          label={CATEGORY_LABELS[c]}
          icon={<CategoryIcon category={c} className="h-3 w-3" />}
        />
      ))}
    </div>
  )
}

function Chip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-foreground/70 hover:border-foreground/40 hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function AlertsList({
  filters,
  focusId,
}: {
  filters: NotificationListFilters
  focusId: string | null
}) {
  const query = useInfiniteNotifications(filters)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const markRead = useMarkNotificationRead()

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (e?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage()
        }
      },
      { rootMargin: '200px 0px' },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage])

  const focusedRowRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (focusId && focusedRowRef.current) {
      focusedRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [focusId])

  const pages = query.data?.pages ?? []
  const items = pages.flatMap((p) => p.notifications)

  if (query.isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <ListSkeleton />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <Inbox className="h-6 w-6 text-foreground/30" aria-hidden />
        <p className="text-foreground/60 text-sm">Couldn't load alerts.</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="cursor-pointer text-foreground/70 text-xs underline-offset-4 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <Inbox className="h-7 w-7 text-foreground/25" aria-hidden />
        <p className="text-foreground/70 text-sm">No alerts.</p>
        <p className="text-foreground/45 text-xs">
          Reports, compliance reminders and tasks will show up here.
        </p>
      </div>
    )
  }

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <ul className="flex flex-col">
        {items.map((n) => (
          <AlertRow
            key={n.id}
            note={n}
            expanded={expandedId === n.id}
            isFocused={focusId === n.id}
            focusRef={focusId === n.id ? focusedRowRef : undefined}
            onToggle={() => {
              const next = expandedId === n.id ? null : n.id
              setExpandedId(next)
              if (next && n.status === 'unread') {
                markRead.mutate(n.id, {
                  onError: (err) => toast.error(`Couldn't mark read: ${apiErrorLabel(err)}`),
                })
              }
            }}
          />
        ))}
      </ul>
      <div ref={sentinelRef} className="h-4" aria-hidden />
      {query.isFetchingNextPage ? (
        <div className="flex items-center justify-center py-4 text-foreground/50 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          <span className="ml-2">Loading more…</span>
        </div>
      ) : null}
    </div>
  )
}

function AlertRow({
  note,
  expanded,
  isFocused,
  focusRef,
  onToggle,
}: {
  note: Notification
  expanded: boolean
  isFocused: boolean
  focusRef?: React.RefObject<HTMLLIElement | null>
  onToggle: () => void
}) {
  const action =
    note.category === 'report' || note.category === 'task' ? extractActionLink(note.body) : null
  const bodyPreview = stripInternalLinks(note.body)
  return (
    <li
      ref={focusRef ?? undefined}
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
      {expanded && note.author ? <AlertReplyThread note={note} /> : null}
    </li>
  )
}

/// Renders the row's action buttons. Two sources:
///   - structured `note.reference` (preferred — survives body edits)
///   - markdown link in the body (legacy path for rows that pre-date the
///     reference column; gracefully falls through)
/// For `reference.kind === 'task'` we also surface a "Mark complete"
/// mutation alongside the "Open task" link.
function ActionRow({
  note,
  bodyAction,
}: {
  note: Notification
  bodyAction: { label: string; href: string } | null
}) {
  const updateTask = useUpdateTask()
  // Reference takes precedence; bodyAction only fills the gap for old rows
  // that don't have one (backfill from before this column existed).
  const ref = note.reference
  const refHref =
    ref?.kind === 'task'
      ? `/tasks/${encodeURIComponent(ref.id)}`
      : ref?.kind === 'report'
        ? `/reports/${encodeURIComponent(ref.id)}`
        : null
  const href = refHref ?? bodyAction?.href ?? null
  const openLabel =
    ref?.kind === 'task'
      ? 'Open task'
      : ref?.kind === 'report'
        ? 'Open report'
        : (bodyAction?.label ?? null)

  if (!href && ref?.kind !== 'task') return null

  return (
    // Rendered as a sibling of the row's toggle button (not a child) so the
    // Link + button below sit in valid DOM. Padding mirrors the toggle
    // button's so the action chips align with the body text above.
    <div className="-mt-1 flex flex-wrap items-center gap-1.5 px-4 pb-2.5 pl-[3.25rem]">
      {href ? (
        <Link
          href={href}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-medium text-[11px] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
        >
          {openLabel ?? 'Open'}
        </Link>
      ) : null}
      {ref?.kind === 'task' ? (
        <button
          type="button"
          disabled={updateTask.isPending}
          onClick={() => {
            updateTask.mutate(
              { id: ref.id, status: 'done' },
              {
                onSuccess: () => toast.success('Task marked complete'),
                onError: (err) => toast.error(`Couldn't mark complete: ${apiErrorLabel(err)}`),
              },
            )
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-medium text-[11px] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateTask.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3 w-3" aria-hidden />
          )}
          Mark complete
        </button>
      ) : null}
    </div>
  )
}

function AlertReplyThread({ note }: { note: Notification }) {
  const replies = useNotificationReplies(note.id, { enabled: true })
  const compose = useComposeReply()
  const [body, setBody] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (trimmed.length === 0 || compose.isPending) return
    try {
      await compose.mutateAsync({ notificationId: note.id, body: trimmed })
      setBody('')
    } catch (err) {
      toast.error(`Couldn't send reply: ${apiErrorLabel(err)}`)
    }
  }

  // Replies route to the original author of the parent notification — for
  // an automated gm reminder, that's the task creator. Surface their name in
  // the placeholder so the user knows their reply isn't going "to gm".
  const replyTarget =
    note.author && (note.author.name ?? note.author.email)
      ? (note.author.name ?? note.author.email)
      : null
  const placeholder = replyTarget ? `Reply to ${replyTarget}…` : 'Reply…'

  const rows = replies.data?.replies ?? []
  return (
    <div className="border-t border-border/40 bg-muted/15 px-4 py-3">
      {note.automated && replyTarget ? (
        <p className="mb-2 text-[10px] text-foreground/55">
          Replies go to <span className="font-medium text-foreground/75">{replyTarget}</span>
        </p>
      ) : null}
      {replies.isLoading && rows.length === 0 ? (
        <p className="text-[11px] text-foreground/50 italic">Loading replies…</p>
      ) : rows.length > 0 ? (
        <ul className="mb-2 flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-0.5 rounded-md bg-background px-2.5 py-1.5 text-sm shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-2 text-[10px] text-foreground/60">
                <span className="font-medium text-foreground/80">
                  {r.author.name ?? r.author.email}
                </span>
                <time dateTime={r.createdAt}>{formatRelative(r.createdAt)}</time>
              </div>
              <p className="whitespace-pre-wrap break-words text-foreground text-sm leading-snug">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-[11px] text-foreground/50 italic">No replies yet.</p>
      )}

      <form className="flex items-end gap-2" onSubmit={onSubmit}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={1}
          maxLength={2000}
          disabled={compose.isPending}
          className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={compose.isPending || body.trim().length === 0}
          className="shrink-0 cursor-pointer rounded-md bg-foreground px-2.5 py-1.5 font-medium text-background text-xs transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {compose.isPending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
