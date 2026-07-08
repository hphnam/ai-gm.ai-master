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
        'group relative border-b border-border/40 last:border-b-0',
        unreadCount > 0 && 'bg-muted/30',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 pr-12 text-left transition-colors hover:bg-accent/40"
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

      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${partyDisplayName(otherParty)}`}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-foreground/55 hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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
