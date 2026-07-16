'use client'

import { MoreVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type ConversationSummary, useDeleteConversation } from '@/lib/hooks/use-conversations'
import { cn } from '@/lib/utils'
import {
  apiErrorLabel,
  formatRelative,
  GmMonogram,
  initials,
  partyDisplayName,
} from '../notifications-shared'

export function ConversationListRow({
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
        'group relative rounded-xl border transition-shadow hover:shadow-[0_3px_10px_-6px_rgba(32,26,18,0.3)]',
        unreadCount > 0
          ? 'border-[rgba(143,107,31,0.35)] bg-[#fbf6ea]'
          : 'border-[var(--hairline)] bg-[var(--ledger-card)]',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 pr-11 text-left"
      >
        <span className="relative flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--paper-2)] font-semibold text-[11px] text-[#6b6250] uppercase tracking-tight">
          {initials(otherParty)}
          {unreadCount > 0 ? (
            <span
              role="status"
              className="-right-1 -top-1 absolute inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--brass)] px-1 font-mono-ledger font-semibold text-[10px] text-[var(--cream-hi)] leading-none ring-2 ring-background"
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
                'truncate text-sm text-foreground',
                unreadCount > 0 ? 'font-bold' : 'font-semibold',
              )}
            >
              {partyDisplayName(otherParty)}
            </span>
            <time
              dateTime={latestAt}
              className={cn(
                'shrink-0 font-mono-ledger text-[10px]',
                unreadCount > 0 ? 'text-[var(--mono-muted)]' : 'text-[var(--ink-faint)]',
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
                unreadCount > 0 ? 'text-[#3a3327]' : 'text-[var(--mono-muted)]',
              )}
            >
              {previewPrefix}
              {latestPreview}
            </p>
          </div>
        </div>
      </button>

      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${partyDisplayName(otherParty)}`}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-[var(--mono-muted)] hover:bg-[var(--paper-2)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
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
