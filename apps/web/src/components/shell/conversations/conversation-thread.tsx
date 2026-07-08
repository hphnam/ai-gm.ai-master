'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowLeft, Loader2, MessageCircle, Send } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  useConversationMessages,
  useMarkConversationRead,
  useSendMessage,
} from '@/lib/hooks/use-conversations'
import { apiErrorLabel, initials, ListSkeleton, partyDisplayName } from '../notifications-shared'
import { MessageBubble } from './message-bubble'

// Initial estimate for a message row (single-line bubble + timestamp + the
// 6px inter-row gap baked into each row's padding). Rows are re-measured on
// mount via measureElement, so this only governs the first paint.
const MESSAGE_ROW_ESTIMATE_PX = 56

export function ConversationThread({
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
    return reversed.flatMap((p) => p.messages)
  }, [pages])

  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => MESSAGE_ROW_ESTIMATE_PX,
    overscan: 10,
    getItemKey: (i) => {
      const m = flat[i]
      return m ? `${m.kind}-${m.id}` : i
    },
  })
  const virtualItems = virtualizer.getVirtualItems()

  // --- Load older on scroll-up ---------------------------------------------
  // When older messages prepend at the top, every existing message shifts down
  // by the height of the new content. We keep the viewport stable by anchoring
  // to distance-from-bottom: capture it the instant we trigger the fetch, then
  // restore scrollTop once the new rows are in the DOM. react-virtual's own
  // above-viewport measurement adjustment refines the position as the freshly
  // prepended rows measure their real height.
  const olderAnchorRef = useRef<number | null>(null)
  const didInitialScrollRef = useRef(false)
  useEffect(() => {
    didInitialScrollRef.current = false
  }, [otherUserId])

  const firstRenderedIndex = virtualItems[0]?.index ?? -1
  useEffect(() => {
    if (
      didInitialScrollRef.current &&
      firstRenderedIndex === 0 &&
      messages.hasNextPage &&
      !messages.isFetchingNextPage
    ) {
      const el = scrollRef.current
      olderAnchorRef.current = el ? el.scrollHeight - el.scrollTop : null
      messages.fetchNextPage()
    }
  }, [
    firstRenderedIndex,
    messages.hasNextPage,
    messages.isFetchingNextPage,
    messages.fetchNextPage,
  ])

  useLayoutEffect(() => {
    if (olderAnchorRef.current == null) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight - olderAnchorRef.current
    olderAnchorRef.current = null
  }, [flat.length])

  // --- Auto-scroll to bottom ------------------------------------------------
  // When a new newest message arrives, follow it IF the user is already near
  // the bottom. If they've scrolled up to read history, don't yank them.
  const lastMessageId = flat[flat.length - 1]?.id
  useEffect(() => {
    const node = scrollRef.current
    if (!node || flat.length === 0) return
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120
    if (nearBottom) {
      virtualizer.scrollToIndex(flat.length - 1, { align: 'end' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageId])

  // Initial scroll-to-bottom when the first page lands. Runs once per
  // conversation (the latch resets when otherUserId changes).
  useEffect(() => {
    if (didInitialScrollRef.current) return
    if (!messages.data || messages.isFetching) return
    if (flat.length === 0) return
    didInitialScrollRef.current = true
    virtualizer.scrollToIndex(flat.length - 1, { align: 'end' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.data, messages.isFetching, flat.length, otherUserId])

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
        if (flat.length > 0) virtualizer.scrollToIndex(flat.length - 1, { align: 'end' })
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
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
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
          <ul className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualItems.map((vi) => {
              const m = flat[vi.index]
              if (!m) return null
              const prev = flat[vi.index - 1]
              // Show the sender's name on the first bubble of a run. Reduces
              // visual noise in a back-and-forth where two people alternate.
              const showAuthor = !prev || prev.fromMe !== m.fromMe
              // Read receipt only on the most recent outbound note — iMessage
              // convention. Avoids "Read · Read · Read" stacking down the thread.
              const isLastOutboundNote =
                m.fromMe &&
                m.kind === 'note' &&
                !flat.slice(vi.index + 1).some((later) => later.fromMe && later.kind === 'note')
              return (
                <li
                  key={`${m.kind}-${m.id}`}
                  ref={virtualizer.measureElement}
                  data-index={vi.index}
                  className="absolute inset-x-0 pb-1.5"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <MessageBubble
                    message={m}
                    showAuthor={showAuthor && !m.fromMe}
                    showStatus={isLastOutboundNote}
                    otherUserId={otherUserId}
                  />
                </li>
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
