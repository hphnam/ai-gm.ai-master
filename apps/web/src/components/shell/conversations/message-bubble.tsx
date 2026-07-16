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
import { type ConversationMessage, useDeleteMessage } from '@/lib/hooks/use-conversations'
import { cn } from '@/lib/utils'
import { apiErrorLabel, formatRelative, GmMonogram } from '../notifications-shared'

export function MessageBubble({
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
    <div className={cn('group flex flex-col', fromMe ? 'items-end' : 'items-start')}>
      <div
        className={cn('flex max-w-[78%] flex-col gap-0.5', fromMe ? 'items-end' : 'items-start')}
      >
        {showAuthor && author ? (
          <span className="px-1 text-[10px] text-[var(--mono-muted)]">
            {author.name ?? author.email}
          </span>
        ) : null}
        <div className={cn('flex items-center gap-1', fromMe ? 'flex-row' : 'flex-row-reverse')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Message actions"
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--ink-faint)] opacity-100 transition-opacity hover:bg-[var(--paper-2)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              >
                <MoreVertical className="h-4 w-4" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={fromMe ? 'end' : 'start'} className="min-w-[180px]">
              <DropdownMenuItem
                onSelect={() => handleDelete('self')}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
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
                  className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Delete for everyone
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            className={cn(
              'rounded-2xl px-3 py-1.5 text-sm leading-snug shadow-[0_1px_2px_rgba(32,26,18,0.08)]',
              fromMe
                ? 'bg-[#ece3d2] text-foreground'
                : 'border border-[var(--hairline-soft)] bg-[var(--ledger-card)] text-foreground',
            )}
          >
            <p className="whitespace-pre-wrap break-words">{body}</p>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 px-1 text-[10px] text-[var(--ink-faint)]',
            fromMe ? 'flex-row-reverse' : '',
          )}
        >
          <time
            dateTime={sentAt}
            title={new Date(sentAt).toLocaleString()}
            className="font-mono-ledger"
          >
            {formatRelative(sentAt)}
          </time>
          {viaAi ? <GmMonogram /> : null}
          {showStatus ? (
            <span
              className={cn(
                'font-medium',
                message.status === 'read'
                  ? 'text-[var(--ledger-green)]'
                  : 'text-[var(--mono-muted)]',
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
    </div>
  )
}
