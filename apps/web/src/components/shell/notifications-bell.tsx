'use client'

import { Bell, CheckCheck, MessageSquarePlus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ApiError } from '@/lib/api-client'
import {
  type Notification,
  type Recipient,
  useComposeNotification,
  useComposeReply,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationRecipients,
  useNotificationReplies,
  useNotifications,
  useUnreadNotificationsCount,
} from '@/lib/hooks/use-notifications'
import { useNotificationsSocket } from '@/lib/hooks/use-notifications-socket'
import { cn } from '@/lib/utils'

const TOAST_BODY_PREVIEW_CHARS = 140

const RELATIVE_FORMAT_MS_PER_MINUTE = 60_000
const RELATIVE_FORMAT_MS_PER_HOUR = 60 * RELATIVE_FORMAT_MS_PER_MINUTE
const RELATIVE_FORMAT_MS_PER_DAY = 24 * RELATIVE_FORMAT_MS_PER_HOUR

function formatRelative(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  const diff = Math.max(0, now - t)
  if (diff < RELATIVE_FORMAT_MS_PER_MINUTE) return 'just now'
  if (diff < RELATIVE_FORMAT_MS_PER_HOUR) {
    const m = Math.floor(diff / RELATIVE_FORMAT_MS_PER_MINUTE)
    return `${m}m ago`
  }
  if (diff < RELATIVE_FORMAT_MS_PER_DAY) {
    const h = Math.floor(diff / RELATIVE_FORMAT_MS_PER_HOUR)
    return `${h}h ago`
  }
  const d = Math.floor(diff / RELATIVE_FORMAT_MS_PER_DAY)
  return `${d}d ago`
}

function authorLabel(n: Notification): string {
  if (!n.author) return 'System'
  if (n.author.name) return n.author.name
  return n.author.email
}

const SOURCE_LABELS: Record<Notification['source'], string> = {
  chat: 'via chat',
  whatsapp: 'via WhatsApp',
  manual: 'direct note',
}

function composeErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const code = String(err.code)
    if (err.status === 401) return 'you need to log in again'
    if (err.status === 404 && code === 'recipient-not-found') {
      return "that user isn't a member of your org"
    }
    if (err.status === 400 && code === 'invalid-recipient') {
      return "you can't send a note to yourself"
    }
    return `${err.status} ${code}`
  }
  if (err instanceof Error) return err.message
  return 'unknown error'
}

function apiErrorLabel(err: unknown): string {
  if (err instanceof ApiError) return `${err.status} ${String(err.code)}`
  if (err instanceof Error) return err.message
  return 'unknown error'
}

export function NotificationsBell() {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [openNote, setOpenNote] = useState<Notification | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  // Always-listen to the list query so the socket invalidation hydrates it
  // even when the popover is closed (so the toast can find the full row).
  const { data, isLoading } = useNotifications({ enabled: true })
  const { data: countData } = useUnreadNotificationsCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unread = countData?.count ?? 0
  const notifications = data?.notifications ?? []

  // Open popover scrolled to a specific note id. Sets focusId so the row
  // briefly flashes; popover open triggers the existing list render.
  const openPopoverFor = useCallback((id: string) => {
    setFocusId(id)
    setPopoverOpen(true)
  }, [])

  // Realtime socket — fires on inbound notification.created and
  // mark-read events. The hook also invalidates the list + unread-count
  // queries so the bell badge updates without polling.
  useNotificationsSocket({
    onCreated: useCallback(
      (payload) => {
        const who = payload.author?.name ?? payload.author?.email ?? 'New note'
        const preview =
          payload.body.length > TOAST_BODY_PREVIEW_CHARS
            ? `${payload.body.slice(0, TOAST_BODY_PREVIEW_CHARS).trimEnd()}…`
            : payload.body
        toast.message(who, {
          description: preview,
          action: {
            label: 'View',
            onClick: () => openPopoverFor(payload.id),
          },
        })
      },
      [openPopoverFor],
    ),
  })

  // Clear focusId after the popover closes so re-opening doesn't re-flash.
  useEffect(() => {
    if (!popoverOpen) {
      const t = setTimeout(() => setFocusId(null), 200)
      return () => clearTimeout(t)
    }
  }, [popoverOpen])

  // Scroll the focused row into view when popover opens.
  const focusedRowRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (popoverOpen && focusId && focusedRowRef.current) {
      focusedRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [popoverOpen, focusId])

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'relative inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
              'data-[state=open]:bg-muted data-[state=open]:text-foreground',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            )}
            aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
          >
            <Bell className="h-4 w-4" aria-hidden />
            {unread > 0 ? (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center',
                  'rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background',
                )}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[340px] p-0" align="end" side="bottom">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setPopoverOpen(false)
                  setComposeOpen(true)
                }}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-foreground/70 hover:bg-accent hover:text-foreground"
                aria-label="New note"
                title="New note"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">New</span>
              </button>
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
                disabled={unread === 0 || markAllRead.isPending}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs',
                  unread === 0
                    ? 'text-foreground/30'
                    : 'text-foreground/70 hover:bg-accent hover:text-foreground',
                )}
                title="Mark all read"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            </div>
          </div>

          <div className="scrollbar-thin max-h-[60vh] min-h-[80px] overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-6 text-center text-xs text-foreground/60">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-foreground/60">
                You're all caught up.
              </div>
            ) : (
              <ul className="flex flex-col">
                {notifications.map((n) => {
                  const isFocused = focusId === n.id
                  return (
                    <li
                      key={n.id}
                      ref={isFocused ? focusedRowRef : undefined}
                      className={cn(
                        'group border-b border-border/40 last:border-b-0',
                        n.status === 'unread' && 'bg-muted/40',
                        isFocused && 'ring-2 ring-foreground/20 ring-inset',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenNote(n)
                          if (n.status === 'unread') {
                            markRead.mutate(n.id, {
                              onError: (err) =>
                                toast.error(`Couldn't mark read: ${apiErrorLabel(err)}`),
                            })
                          }
                        }}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                            n.status === 'unread' ? 'bg-amber-500' : 'bg-transparent',
                          )}
                          aria-hidden
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="flex min-w-0 items-baseline gap-1.5">
                              <span className="truncate text-xs font-medium text-foreground/80">
                                {authorLabel(n)}
                              </span>
                              <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wider text-foreground/55">
                                {SOURCE_LABELS[n.source]}
                              </span>
                            </span>
                            <time
                              dateTime={n.createdAt}
                              className="shrink-0 text-[10px] text-foreground/50"
                            >
                              {formatRelative(n.createdAt)}
                            </time>
                          </div>
                          <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-foreground">
                            {n.body}
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <ComposeNoteDialog open={composeOpen} onOpenChange={setComposeOpen} />
      <NotePreviewDialog
        note={openNote}
        onOpenChange={(next) => {
          if (!next) setOpenNote(null)
        }}
      />
    </>
  )
}

function NotePreviewDialog({
  note,
  onOpenChange,
}: {
  note: Notification | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!note} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] gap-3 p-5">
        {note ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span>{authorLabel(note)}</span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wider text-foreground/60">
                  {SOURCE_LABELS[note.source]}
                </span>
              </DialogTitle>
              <DialogDescription>
                <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString()}</time>
              </DialogDescription>
            </DialogHeader>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {note.body}
            </p>
            <NoteReplyThread note={note} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NoteReplyThread({ note }: { note: Notification }) {
  // System notes (author === null) have no reply path on the server. Skip the
  // GET entirely — both to avoid a wasted RTT per dialog open and because the
  // server explicitly rejects /replies on system notes (the response is 400
  // not an empty list).
  const isSystemNote = note.author === null
  const replies = useNotificationReplies(note.id, { enabled: !isSystemNote })
  const compose = useComposeReply()
  const [body, setBody] = useState('')
  const rows = replies.data?.replies ?? []

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (trimmed.length === 0 || compose.isPending) return
    try {
      await compose.mutateAsync({ notificationId: note.id, body: trimmed })
      setBody('')
    } catch (err) {
      toast.error(`Couldn't send reply: ${composeErrorMessage(err)}`)
    }
  }

  // Render nothing for system notes — no thread to show, no reply path.
  if (isSystemNote) return null

  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
      {replies.isLoading && rows.length === 0 ? (
        <p className="text-[11px] italic text-muted-foreground">Loading replies…</p>
      ) : rows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <div className="flex items-baseline justify-between gap-2 text-[11px] text-foreground/60">
                <span className="font-medium text-foreground/80">
                  {r.author.name ?? r.author.email}
                </span>
                <time dateTime={r.createdAt}>{formatRelative(r.createdAt)}</time>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-snug text-foreground">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] italic text-muted-foreground">No replies yet.</p>
      )}

      <form className="mt-1 flex items-end gap-2" onSubmit={onSubmit}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reply…"
          rows={1}
          maxLength={2000}
          disabled={compose.isPending}
          className="min-h-9 max-h-32 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-foreground/15"
        />
        <button
          type="submit"
          disabled={compose.isPending || body.trim().length === 0}
          className="shrink-0 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:brightness-110 disabled:opacity-50"
        >
          {compose.isPending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}

function ComposeNoteDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading } = useNotificationRecipients({ enabled: open })
  const compose = useComposeNotification()
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [body, setBody] = useState<string>('')

  function reset() {
    setRecipient(null)
    setBody('')
    compose.reset()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!recipient || body.trim().length < 3) return
    const target = recipientLabel(recipient)
    try {
      await compose.mutateAsync({ recipientUserId: recipient.userId, body: body.trim() })
      toast.success(`Note sent to ${target}`)
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(`Couldn't send note: ${composeErrorMessage(err)}`)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-[440px] gap-4 p-5">
        <DialogHeader>
          <DialogTitle>Leave a note</DialogTitle>
          <DialogDescription>
            Send a direct note to another member of your organisation.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <RecipientPicker
            members={data?.members ?? []}
            isLoading={isLoading}
            value={recipient}
            onChange={setRecipient}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground/70" htmlFor="note-body">
              Message
            </label>
            <textarea
              id="note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What do they need to know?"
              rows={4}
              maxLength={2000}
              className="resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <span className="self-end text-[10px] text-foreground/50">{body.length}/2000</span>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md px-3 py-1.5 text-sm text-foreground/70 hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!recipient || body.trim().length < 3 || compose.isPending}
              className={cn(
                'rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {compose.isPending ? 'Sending…' : 'Send note'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function recipientLabel(r: Recipient): string {
  return r.name ?? r.email
}

function RecipientPicker({
  members,
  isLoading,
  value,
  onChange,
}: {
  members: Recipient[]
  isLoading: boolean
  value: Recipient | null
  onChange: (r: Recipient | null) => void
}) {
  const [query, setQuery] = useState('')
  const [openList, setOpenList] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = 'recipient-listbox'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) => (m.name?.toLowerCase().includes(q) ?? false) || m.email.toLowerCase().includes(q),
    )
  }, [members, query])

  // Reset highlight when filter narrows past current position.
  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0)
  }, [filtered.length, highlight])

  // Close list on outside click.
  useEffect(() => {
    if (!openList) return
    function onDown(e: MouseEvent) {
      const node = containerRef.current
      if (node && e.target instanceof Node && !node.contains(e.target)) {
        setOpenList(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openList])

  function pick(r: Recipient) {
    onChange(r)
    setQuery('')
    setOpenList(false)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpenList(true)
      setHighlight((h) => Math.min(filtered.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      if (openList && filtered[highlight]) {
        e.preventDefault()
        pick(filtered[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpenList(false)
    }
  }

  if (value) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground/70">Send to</span>
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">{recipientLabel(value)}</span>
            <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] uppercase tracking-wider text-foreground/60">
              {value.role}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-foreground/60 hover:bg-accent hover:text-foreground"
            aria-label="Change recipient"
          >
            <X className="h-3 w-3" aria-hidden />
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground/70" htmlFor="recipient-search">
        Send to
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/40"
          aria-hidden
        />
        <input
          ref={inputRef}
          id="recipient-search"
          type="text"
          role="combobox"
          aria-expanded={openList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          placeholder="Search people in your org"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpenList(true)
            setHighlight(0)
          }}
          onFocus={() => setOpenList(true)}
          onKeyDown={handleKey}
          className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>
      {openList ? (
        <div
          id={listboxId}
          role="listbox"
          className="scrollbar-thin absolute left-0 right-0 top-full z-10 mt-1 max-h-[200px] overflow-y-auto rounded-md border border-border bg-popover shadow-md"
        >
          {isLoading ? (
            <p className="px-2 py-3 text-center text-xs text-foreground/60">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-foreground/60">No matches.</p>
          ) : (
            filtered.map((m, idx) => (
              <button
                key={m.userId}
                type="button"
                role="option"
                aria-selected={idx === highlight}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(m)
                }}
                onMouseEnter={() => setHighlight(idx)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm',
                  idx === highlight ? 'bg-accent text-foreground' : 'hover:bg-accent/60',
                )}
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{recipientLabel(m)}</span>
                  {m.name ? <span className="text-foreground/50"> · {m.email}</span> : null}
                </span>
                <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] uppercase tracking-wider text-foreground/60">
                  {m.role}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
