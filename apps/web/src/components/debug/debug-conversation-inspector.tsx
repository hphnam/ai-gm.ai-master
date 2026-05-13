'use client'

import type { DebugConversationResponseDto as DebugConversationResponse } from '@/generated/api'
import type { DebugMessageDto as DebugMessage } from '@/lib/api-types'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'
import { DebugFeedbackBadge } from './debug-feedback-badge'
import { DebugJsonViewer } from './debug-json-viewer'
import { DebugToolCallCard } from './debug-tool-call-card'

type Props = {
  data: DebugConversationResponse | undefined
  isLoading: boolean
  error: unknown
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

function MessageCard({ message }: { message: DebugMessage }) {
  const toolCallLog = Array.isArray(message.toolCallLog) ? message.toolCallLog : []
  return (
    <article
      id={`msg-${message.id}`}
      aria-label={`${message.role} message`}
      className={cn(
        'border rounded-md p-4 space-y-3',
        message.role === 'user' ? 'bg-muted/40' : 'bg-card',
      )}
    >
      <header className="flex items-center gap-2 text-xs">
        <span className="font-semibold uppercase">{message.role}</span>
        <span className="text-muted-foreground">· {relativeTime(message.createdAt)}</span>
        {message.retrievedItemIds.length > 0 ? (
          <span className="ml-auto text-muted-foreground">
            {message.retrievedItemIds.length} retrieved
          </span>
        ) : null}
      </header>

      <div className="whitespace-pre-wrap break-words text-sm">{message.content}</div>

      {message.retrievedItemIds.length > 0 ? (
        <DebugJsonViewer title="Retrieved IDs" data={message.retrievedItemIds} />
      ) : null}

      {toolCallLog.length > 0 ? (
        <div className="space-y-2">
          {toolCallLog.map((e, i) => (
            <DebugToolCallCard
              // biome-ignore lint/suspicious/noArrayIndexKey: debug log entries have no stable id and order is fixed
              key={i}
              entry={e as Parameters<typeof DebugToolCallCard>[0]['entry']}
            />
          ))}
        </div>
      ) : null}

      {message.feedback ? (
        <footer>
          <DebugFeedbackBadge feedback={message.feedback} />
        </footer>
      ) : null}
    </article>
  )
}

function SkeletonCard() {
  return <div className="h-24 animate-pulse bg-muted rounded-md" />
}

export function DebugConversationInspector({ data, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className="border border-destructive/40 bg-destructive/10 text-sm rounded-md p-4"
      >
        Failed to load conversation. {mapApiError(error)}
      </div>
    )
  }

  if (!data) {
    return <div className="text-sm text-muted-foreground italic">No conversation loaded.</div>
  }

  return (
    <section aria-label="Conversation Trace" className="space-y-3">
      <header className="text-xs text-muted-foreground font-mono">
        conv {data.conversation.id.slice(0, 8)}… · {data.messages.length} messages
      </header>
      {data.messages.map((m) => (
        <MessageCard key={m.id} message={m} />
      ))}
    </section>
  )
}
