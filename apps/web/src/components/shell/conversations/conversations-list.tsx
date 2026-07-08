'use client'

import { MessageCircle, MessageSquarePlus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type ConversationSummary, useConversations } from '@/lib/hooks/use-conversations'
import { ListSkeleton, useDebouncedValue } from '../notifications-shared'
import { ConversationListRow } from './conversation-list-row'
import { ListEmptyState } from './list-empty-state'

export function ConversationsList({
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
