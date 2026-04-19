'use client'

import { useEffect, useRef } from 'react'
import type { ChatMessageDto } from '@gm-ai/types'
import { ChatMessage } from './chat-message'

type Props = {
  messages: ChatMessageDto[]
  optimisticUserMessage?: string | null
  pendingAssistant?: boolean
  isLoadingHistory?: boolean
}

export function ChatThread({
  messages,
  optimisticUserMessage,
  pendingAssistant,
  isLoadingHistory,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, optimisticUserMessage, pendingAssistant])

  if (isLoadingHistory) {
    return (
      <ol
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Conversation"
        className="flex flex-col gap-3"
      >
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex w-full">
            <div
              className={cn(
                'h-16 w-[85%] animate-pulse rounded-lg bg-muted',
                i % 2 === 0 ? 'ml-auto' : '',
              )}
            />
          </li>
        ))}
      </ol>
    )
  }

  if (messages.length === 0 && !optimisticUserMessage && !pendingAssistant) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Ask anything about stock, ordering, SOPs, or suppliers.
      </div>
    )
  }

  return (
    <ol
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Conversation"
      className="flex flex-col gap-3"
    >
      {messages.map((m) => (
        <li key={m.id}>
          <ChatMessage message={m} />
        </li>
      ))}
      {optimisticUserMessage ? (
        <li>
          <ChatMessage
            message={{
              id: 'optimistic',
              role: 'user',
              content: optimisticUserMessage,
              createdAt: new Date().toISOString(),
              retrievedItemIds: [],
            }}
            pending
          />
        </li>
      ) : null}
      {pendingAssistant ? (
        <li className="flex w-full justify-start">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-muted" />
        </li>
      ) : null}
      <div ref={bottomRef} />
    </ol>
  )
}

function cn(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ')
}
