'use client'

import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  MessageSquarePlus,
  MoreVertical,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type ConversationMessage,
  type ConversationSummary,
  useConversationMessages,
  useConversations,
  useDeleteConversation,
  useDeleteMessage,
  useMarkConversationRead,
  useSendMessage,
} from '@/lib/hooks/use-conversations'
import { type Recipient, useNotificationRecipients } from '@/lib/hooks/use-notifications'
import { cn } from '@/lib/utils'
import {
  apiErrorLabel,
  formatRelative,
  GmMonogram,
  initials,
  ListSkeleton,
  partyDisplayName,
  useDebouncedValue,
} from './notifications-shared'

type ConversationsMode =
  | { kind: 'list' }
  | { kind: 'thread'; otherUserId: string; otherParty: { name: string | null; email: string } }
  | { kind: 'new' }

export function ConversationsView({ initialOtherUserId }: { initialOtherUserId?: string | null }) {
  const [mode, setMode] = useState<ConversationsMode>(
    initialOtherUserId
      ? // The deep-link payload doesn't carry name/email — render with "Loading…"
        // until the messages endpoint returns otherParty. The header still shows
        // a recognisable structure so the open isn't jarring.
        { kind: 'thread', otherUserId: initialOtherUserId, otherParty: { name: null, email: '' } }
      : { kind: 'list' },
  )

  if (mode.kind === 'list') {
    return (
      <ConversationsList
        onOpenThread={(c) =>
          setMode({
            kind: 'thread',
            otherUserId: c.otherParty.id,
            otherParty: { name: c.otherParty.name, email: c.otherParty.email },
          })
        }
        onNewConversation={() => setMode({ kind: 'new' })}
      />
    )
  }
  if (mode.kind === 'new') {
    return (
      <NewConversationPicker
        onBack={() => setMode({ kind: 'list' })}
        onPick={(r) =>
          setMode({
            kind: 'thread',
            otherUserId: r.userId,
            otherParty: { name: r.name, email: r.email },
          })
        }
      />
    )
  }
  return (
    <ConversationThread
      otherUserId={mode.otherUserId}
      seedParty={mode.otherParty}
      onBack={() => setMode({ kind: 'list' })}
    />
  )
}

// --- List view ---

function ConversationsList({
  onOpenThread,
  onNewConversation,
}: {
  onOpenThread: (c: ConversationSummary) => void
  onNewConversation: () => void
}) {
  const query = useConversations()
  const [rawQuery, setRawQuery] = useState('')
  const debouncedQuery = useDebouncedValue(rawQuery, 200)

  const filtered = useMemo(() => {
    const all = query.data?.conversations ?? []
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return all
    return all.filter((c) => {
      const name = (c.otherParty.name ?? '').toLowerCase()
      const email = c.otherParty.email.toLowerCase()
      const preview = c.latestPreview.toLowerCase()
      return name.includes(q) || email.includes(q) || preview.includes(q)
    })
  }, [query.data, debouncedQuery])

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="text-foreground/60 text-xs">
          {query.data
            ? `${query.data.conversations.length} ${query.data.conversations.length === 1 ? 'conversation' : 'conversations'}`
            : ''}
        </span>
        <button
          type="button"
          onClick={onNewConversation}
          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-foreground/70 text-xs transition-colors hover:bg-muted hover:text-foreground"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
          <span>New</span>
        </button>
      </div>

      <div className="border-b border-border px-4 py-2.5">
        <div className="relative">
          <Search
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 text-foreground/40"
            aria-hidden
          />
          <input
            type="search"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full rounded-md border border-border bg-background py-1.5 pr-7 pl-8 text-sm placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {rawQuery ? (
            <button
              type="button"
              onClick={() => setRawQuery('')}
              aria-label="Clear search"
              className="-translate-y-1/2 absolute top-1/2 right-1.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded text-foreground/40 hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex-1 overflow-y-auto">
          <ListSkeleton />
        </div>
      ) : query.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <MessageCircle className="h-6 w-6 text-foreground/30" aria-hidden />
          <p className="text-foreground/60 text-sm">Couldn't load conversations.</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="cursor-pointer text-foreground/70 text-xs underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <ListEmptyState
          hasFilter={rawQuery.trim().length > 0}
          onNewConversation={onNewConversation}
        />
      ) : (
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <ul className="flex flex-col">
            {filtered.map((c) => (
              <ConversationListRow
                key={c.otherParty.id}
                conversation={c}
                onClick={() => onOpenThread(c)}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function ListEmptyState({
  hasFilter,
  onNewConversation,
}: {
  hasFilter: boolean
  onNewConversation: () => void
}) {
  if (hasFilter) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <Search className="h-6 w-6 text-foreground/30" aria-hidden />
        <p className="text-foreground/70 text-sm">No conversations match.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <MessageCircle className="h-7 w-7 text-foreground/25" aria-hidden />
      <p className="text-foreground/70 text-sm">No conversations yet.</p>
      <p className="text-foreground/45 text-xs">Start a chat with a teammate to see it here.</p>
      <button
        type="button"
        onClick={onNewConversation}
        className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 font-medium text-foreground/80 text-xs transition-colors hover:bg-muted hover:text-foreground"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
        Start a conversation
      </button>
    </div>
  )
}

function ConversationListRow({
  conversation,
  onClick,
}: {
  conversation: ConversationSummary
  onClick: () => void
}) {
  const { otherParty, latestPreview, latestAt, latestFromMe, latestViaAi, unreadCount } =
    conversation
  const previewPrefix = latestFromMe ? 'You: ' : ''
  const deleteConversation = useDeleteConversation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <li
      className={cn(
        'group relative border-b border-border/40 last:border-b-0',
        unreadCount > 0 && 'bg-muted/30',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 pr-10 text-left transition-colors hover:bg-accent/40"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-medium text-[11px] text-foreground/75 uppercase tracking-tight">
          {initials(otherParty)}
          {unreadCount > 0 ? (
            <span
              role="status"
              className="-right-1 -top-1 absolute inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-foreground px-1 font-semibold text-[10px] text-background leading-none ring-2 ring-background"
              aria-label={`${unreadCount} unread`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                'truncate text-sm',
                unreadCount > 0
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-foreground/85',
              )}
            >
              {partyDisplayName(otherParty)}
            </span>
            <time
              dateTime={latestAt}
              className={cn(
                'shrink-0 text-[10px]',
                unreadCount > 0 ? 'font-medium text-foreground/70' : 'text-foreground/50',
              )}
              title={new Date(latestAt).toLocaleString()}
            >
              {formatRelative(latestAt)}
            </time>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            {latestViaAi ? <GmMonogram /> : null}
            <p
              className={cn(
                'min-w-0 truncate text-xs',
                unreadCount > 0 ? 'text-foreground/85' : 'text-foreground/55',
              )}
            >
              {previewPrefix}
              {latestPreview}
            </p>
          </div>
        </div>
      </button>

      {/* Hover-revealed action menu. On touch the trigger is always visible */}
      {/* (group-hover only affects pointer:fine devices). */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${partyDisplayName(otherParty)}`}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-foreground/55 hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              // Stop the row's onClick from firing when opening the menu.
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setConfirmOpen(true)
              }}
              className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden />
              Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete chat with ${partyDisplayName(otherParty)}?`}
        description="This removes the conversation from your inbox. The other person still has their copy, and a new message from either side will bring it back."
        confirmLabel="Delete chat"
        destructive
        loading={deleteConversation.isPending}
        onConfirm={async () => {
          try {
            await deleteConversation.mutateAsync(otherParty.id)
            toast.success(`Chat with ${partyDisplayName(otherParty)} deleted`)
            setConfirmOpen(false)
          } catch (err) {
            toast.error(`Couldn't delete chat: ${apiErrorLabel(err)}`)
          }
        }}
      />
    </li>
  )
}

// --- Thread (single conversation) view ---

function ConversationThread({
  otherUserId,
  seedParty,
  onBack,
}: {
  otherUserId: string
  seedParty: { name: string | null; email: string }
  onBack: () => void
}) {
  const messages = useConversationMessages(otherUserId)
  const send = useSendMessage(otherUserId)
  const markRead = useMarkConversationRead()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Mark the thread read when it opens AND whenever new pages land while
  // open. The mutation is idempotent server-side (0 rows → no-op).
  useEffect(() => {
    markRead.mutate(otherUserId)
    // We intentionally don't depend on markRead — the mutation reference is
    // stable across renders via React Query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId])

  const pages = messages.data?.pages ?? []
  // Pages come oldest-first within each, newest page LAST in the array
  // (the server returns OLDEST-FIRST within each page; the cursor walks
  // backwards in time). We concatenate as: older pages first, latest page
  // last → final array is oldest → newest.
  const flat = useMemo(() => {
    const reversed = pages.slice().reverse() // earliest fetched (latest in time) first
    // Each page is oldest-first; reversing the page order gives us
    // latest-page-first; but we want oldest-overall first. So:
    // [page0=newest_oldest_first, page1=older_oldest_first, ...]
    // overall oldest → newest = reverse the array of pages, then concat each
    // in its own oldest-first order.
    return reversed.flatMap((p) => p.messages)
  }, [pages])

  // Auto-scroll to bottom when new messages arrive, IF the user is already
  // near the bottom. If they've scrolled up to read history, don't yank
  // their viewport.
  const lastMessageId = flat[flat.length - 1]?.id
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120
    if (nearBottom) {
      node.scrollTop = node.scrollHeight
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageId])

  // Initial scroll-to-bottom when the first page lands. Runs once per
  // conversation (keyed by the first message id we see).
  const firstSeenIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!messages.data || messages.isFetching) return
    const firstId = flat[0]?.id ?? null
    if (firstId && firstSeenIdRef.current !== firstId) {
      firstSeenIdRef.current = firstId
      const node = scrollRef.current
      if (node) node.scrollTop = node.scrollHeight
    }
  }, [messages.data, messages.isFetching, flat])

  // IntersectionObserver at the TOP of the list to load older messages
  // when the user scrolls up. Mirrors the inbox pattern but inverted.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (e?.isIntersecting && messages.hasNextPage && !messages.isFetchingNextPage) {
          messages.fetchNextPage()
        }
      },
      { rootMargin: '120px 0px' },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [messages.hasNextPage, messages.isFetchingNextPage, messages.fetchNextPage])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (trimmed.length === 0 || send.isPending) return
    try {
      await send.mutateAsync(trimmed)
      setDraft('')
      // Force scroll to bottom on send — the user expects their own message
      // to land in view even if they were scrolled up reading history.
      requestAnimationFrame(() => {
        const node = scrollRef.current
        if (node) node.scrollTop = node.scrollHeight
      })
    } catch (err) {
      toast.error(`Couldn't send: ${apiErrorLabel(err)}`)
    }
  }

  // Prefer server-provided otherParty (full name/email) once messages have
  // loaded; fall back to the seed from the list row tap.
  const otherParty = messages.data?.pages[0]?.otherParty ?? {
    id: otherUserId,
    name: seedParty.name,
    email: seedParty.email,
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-medium text-[10px] text-foreground/75 uppercase tracking-tight">
          {initials(otherParty)}
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate font-semibold text-foreground text-sm">
            {partyDisplayName(otherParty)}
          </h2>
          {otherParty.name && otherParty.email ? (
            <p className="truncate text-[10px] text-foreground/50">{otherParty.email}</p>
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        <div ref={sentinelRef} className="h-4" aria-hidden />
        {messages.isFetchingNextPage ? (
          <div className="flex items-center justify-center py-2 text-foreground/50 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            <span className="ml-2">Loading older…</span>
          </div>
        ) : null}
        {messages.isLoading ? (
          <ListSkeleton />
        ) : flat.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <MessageCircle className="h-6 w-6 text-foreground/25" aria-hidden />
            <p className="text-foreground/60 text-sm">No messages yet.</p>
            <p className="text-foreground/40 text-xs">Send a message to start the conversation.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {flat.map((m, i) => {
              const prev = flat[i - 1]
              // Show the sender's name on the first bubble of a run. Reduces
              // visual noise in a back-and-forth where two people alternate.
              const showAuthor = !prev || prev.fromMe !== m.fromMe
              // Read receipt only on the most recent outbound note — iMessage
              // convention. Avoids "Read · Read · Read" stacking down the thread.
              const isLastOutboundNote =
                m.fromMe &&
                m.kind === 'note' &&
                !flat.slice(i + 1).some((later) => later.fromMe && later.kind === 'note')
              return (
                <MessageBubble
                  key={`${m.kind}-${m.id}`}
                  message={m}
                  showAuthor={showAuthor && !m.fromMe}
                  showStatus={isLastOutboundNote}
                  otherUserId={otherUserId}
                />
              )
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 border-t border-border bg-background px-3 py-2.5"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter to send, Shift+Enter for newline — match chat conventions.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (draft.trim().length > 0 && !send.isPending) {
                onSubmit(e as unknown as React.FormEvent)
              }
            }
          }}
          placeholder={`Message ${partyDisplayName(otherParty)}…`}
          rows={1}
          maxLength={2000}
          disabled={send.isPending}
          className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={send.isPending || draft.trim().length === 0}
          aria-label="Send message"
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-foreground text-background transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {send.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
        </button>
      </form>
    </>
  )
}

function MessageBubble({
  message,
  showAuthor,
  showStatus,
  otherUserId,
}: {
  message: ConversationMessage
  showAuthor: boolean
  showStatus: boolean
  otherUserId: string
}) {
  const { body, sentAt, fromMe, viaAi, author, canDeleteForAll } = message
  const deleteMessage = useDeleteMessage(otherUserId)
  const [confirmAllOpen, setConfirmAllOpen] = useState(false)

  async function handleDelete(scope: 'self' | 'all') {
    try {
      await deleteMessage.mutateAsync({ kind: message.kind, messageId: message.id, scope })
      toast.success(scope === 'all' ? 'Message deleted for everyone' : 'Message removed')
    } catch (err) {
      toast.error(`Couldn't delete: ${apiErrorLabel(err)}`)
    }
  }

  return (
    <li className={cn('group flex flex-col', fromMe ? 'items-end' : 'items-start')}>
      <div
        className={cn('flex max-w-[78%] flex-col gap-0.5', fromMe ? 'items-end' : 'items-start')}
      >
        {showAuthor && author ? (
          <span className="px-1 text-[10px] text-foreground/55">{author.name ?? author.email}</span>
        ) : null}
        <div className={cn('flex items-center gap-1', fromMe ? 'flex-row' : 'flex-row-reverse')}>
          {/* Hover-revealed ⋮ on the OUTSIDE of the bubble so it never */}
          {/* overlaps the text. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Message actions"
                className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground/40 opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 group-hover:opacity-100"
              >
                <MoreVertical className="h-3.5 w-3.5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={fromMe ? 'end' : 'start'} className="min-w-[180px]">
              <DropdownMenuItem
                onSelect={() => handleDelete('self')}
                className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden />
                Delete for me
              </DropdownMenuItem>
              {canDeleteForAll ? (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    setConfirmAllOpen(true)
                  }}
                  className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/30"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Delete for everyone
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            className={cn(
              'rounded-2xl px-3 py-1.5 text-sm leading-snug shadow-sm',
              fromMe ? 'bg-foreground text-background' : 'bg-muted text-foreground',
            )}
          >
            <p className="whitespace-pre-wrap break-words">{body}</p>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 px-1 text-[10px] text-foreground/45',
            fromMe ? 'flex-row-reverse' : '',
          )}
        >
          <time dateTime={sentAt} title={new Date(sentAt).toLocaleString()}>
            {formatRelative(sentAt)}
          </time>
          {viaAi ? <GmMonogram /> : null}
          {showStatus ? (
            <span
              className={cn(
                'font-medium',
                message.status === 'read' ? 'text-chart-1' : 'text-foreground/55',
              )}
            >
              {message.status === 'read' ? 'Read' : 'Sent'}
            </span>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmAllOpen}
        onOpenChange={setConfirmAllOpen}
        title="Delete this message for everyone?"
        description="The other person will no longer see this message. This can't be undone."
        confirmLabel="Delete for everyone"
        destructive
        loading={deleteMessage.isPending}
        onConfirm={async () => {
          await handleDelete('all')
          setConfirmAllOpen(false)
        }}
      />
    </li>
  )
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  loading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] gap-3 p-5">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="cursor-pointer rounded-md px-3 py-1.5 text-foreground/70 text-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50',
              destructive ? 'bg-red-600 text-white' : 'bg-foreground text-background',
            )}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- New conversation picker ---

function NewConversationPicker({
  onBack,
  onPick,
}: {
  onBack: () => void
  onPick: (r: Recipient) => void
}) {
  const { data, isLoading } = useNotificationRecipients({ enabled: true })
  const [query, setQuery] = useState('')
  const members = data?.members ?? []
  // Focus the search input once on mount. An inline ref callback would re-fire
  // on every render (the arrow's identity changes each pass) and yank focus
  // off mid-typing — that breaks IME composition for CJK input.
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) => (m.name?.toLowerCase().includes(q) ?? false) || m.email.toLowerCase().includes(q),
    )
  }, [members, query])

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <h2 className="font-semibold text-base text-foreground">New conversation</h2>
      </div>

      <div className="border-b border-border px-4 py-2.5">
        <div className="relative">
          <Search
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 text-foreground/40"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people in your org"
            className="w-full rounded-md border border-border bg-background py-1.5 pr-2 pl-8 text-sm placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isLoading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-foreground/60 text-sm">No matches.</p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((m) => (
              <li key={m.userId} className="border-b border-border/40 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onPick(m)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-medium text-[10px] text-foreground/75 uppercase tracking-tight">
                    {initials(m)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-foreground text-sm">
                      {m.name ?? m.email}
                    </span>
                    {m.name ? (
                      <span className="truncate text-[10px] text-foreground/50">{m.email}</span>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-foreground/60 uppercase tracking-wider">
                    {m.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
