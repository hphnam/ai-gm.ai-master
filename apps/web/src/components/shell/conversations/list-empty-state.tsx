'use client'

import { MessageCircle, MessageSquarePlus, Search } from 'lucide-react'

export function ListEmptyState({
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
