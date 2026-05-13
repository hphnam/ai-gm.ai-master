'use client'

import { MessagesSquare, Store, Trash2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useConversationsList, useDeleteConversation } from '@/lib/hooks/use-conversations-list'
import { cn } from '@/lib/utils'

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString()
}

export function SidebarThreads() {
  const router = useRouter()
  const params = useSearchParams()
  const currentConv = params.get('conv')
  const { data: conversations, isLoading } = useConversationsList(null)
  const deleteConversation = useDeleteConversation()

  const handleDelete = async (convId: string, venueId: string) => {
    if (!window.confirm('Delete this thread? This cannot be undone.')) return
    try {
      await deleteConversation.mutateAsync({ conversationId: convId, venueId })
      toast.success('Thread deleted')
      if (convId === currentConv) {
        router.replace(`/chat?venue=${venueId}`)
      }
    } catch {
      toast.error('Could not delete thread')
    }
  }

  if (isLoading) {
    return <p className="px-2 text-xs text-sidebar-muted">Loading threads…</p>
  }
  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-sidebar-muted">
        <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
        No threads yet.
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-0.5">
      {conversations.map((c) => {
        const isActive = c.id === currentConv
        return (
          <li key={c.id} className="group/thread">
            <div
              className={cn(
                'flex items-start gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors',
                isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/60',
              )}
            >
              <button
                type="button"
                onClick={() => router.push(`/chat?venue=${c.venueId}&conv=${c.id}`)}
                className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 text-left"
              >
                <span
                  className={cn(
                    'line-clamp-1 text-[13px]',
                    isActive
                      ? 'font-semibold text-sidebar-foreground'
                      : 'text-sidebar-foreground/90',
                  )}
                >
                  {c.preview ?? '(empty thread)'}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-sidebar-muted">
                  <Store className="h-3 w-3" aria-hidden />
                  <span className="truncate">{c.venueName}</span>
                  <span>·</span>
                  <span>{formatRelative(c.lastMessageAt)}</span>
                </span>
              </button>
              <button
                type="button"
                aria-label="Delete thread"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(c.id, c.venueId)
                }}
                disabled={deleteConversation.isPending}
                className={cn(
                  'mt-0.5 rounded p-1 text-sidebar-muted opacity-0 transition',
                  'hover:bg-destructive/10 hover:text-destructive',
                  'focus-visible:opacity-100 group-hover/thread:opacity-100',
                  'disabled:opacity-50',
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
