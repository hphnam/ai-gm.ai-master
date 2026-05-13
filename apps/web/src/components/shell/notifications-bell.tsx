'use client'

import { Bell, CheckCheck, MessageSquarePlus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationRecipients,
  useNotifications,
  useUnreadNotificationsCount,
} from '@/lib/hooks/use-notifications'
import { cn } from '@/lib/utils'

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

  const { data: countData } = useUnreadNotificationsCount()
  const { data, isLoading } = useNotifications({ enabled: popoverOpen })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unread = countData?.count ?? 0
  const notifications = data?.notifications ?? []

  // Toast when unread count increases since last render — surfaces inbound
  // notifications without forcing the user to watch the bell. Initial value
  // is null so first render doesn't fire a toast on existing unreads.
  const lastUnreadRef = useRef<number | null>(null)
  useEffect(() => {
    const prev = lastUnreadRef.current
    if (prev !== null && unread > prev) {
      const delta = unread - prev
      toast.message(delta === 1 ? 'New note for you' : `${delta} new notes for you`, {
        description: 'Open the bell to read.',
      })
    }
    lastUnreadRef.current = unread
  }, [unread])

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'relative inline-flex items-center justify-center rounded-md p-1.5 transition-colors',
              'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            )}
            aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
          >
            <Bell className="h-4 w-4" aria-hidden />
            {unread > 0 ? (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center',
                  'rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-white',
                )}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[340px] p-0" align="end">
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
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'group flex items-start gap-2 border-b border-border/40 px-3 py-2.5 last:border-b-0',
                      n.status === 'unread' && 'bg-amber-50/50 dark:bg-amber-500/5',
                    )}
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
                      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                        {n.body}
                      </p>
                      {n.status === 'unread' ? (
                        <button
                          type="button"
                          onClick={() =>
                            markRead.mutate(n.id, {
                              onError: (err) =>
                                toast.error(`Couldn't mark read: ${apiErrorLabel(err)}`),
                            })
                          }
                          className="self-start text-[11px] text-brand hover:underline disabled:opacity-50"
                          disabled={markRead.isPending}
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <ComposeNoteDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </>
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
