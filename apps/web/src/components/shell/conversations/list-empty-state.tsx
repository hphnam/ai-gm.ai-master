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
        <Search className="h-6 w-6 text-[var(--ink-faint)]" aria-hidden />
        <p className="text-[var(--ink-muted)] text-sm">No conversations match.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-[var(--paper-2)] text-[var(--ink-faint)]">
        <MessageCircle className="h-5 w-5" aria-hidden />
      </span>
      <p className="font-medium text-foreground text-sm">No conversations yet.</p>
      <p className="text-[var(--mono-muted)] text-xs">
        Start a chat with a teammate to see it here.
      </p>
      <button
        type="button"
        onClick={onNewConversation}
        className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--hairline)] bg-[var(--ledger-card)] px-3 py-1.5 font-semibold text-foreground text-xs transition-colors hover:border-[var(--hairline-strong)]"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
        Start a conversation
      </button>
    </div>
  )
}
