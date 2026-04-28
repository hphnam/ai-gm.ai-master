'use client'

import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import { Sparkles } from 'lucide-react'
import { ChatMessage } from './chat-message'

type Props = {
  messages: UIMessage[]
  status: 'submitted' | 'streaming' | 'ready' | 'error'
  onFollowUpSelect?: (question: string) => void | Promise<void>
  latestFollowUps: string[]
  onRegenerate?: () => void
  feedbackByMessageId?: Record<string, 'up' | 'down' | 'regenerate'>
}

export function ChatThread({
  messages,
  status,
  onFollowUpSelect,
  latestFollowUps,
  onRegenerate,
  feedbackByMessageId,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, status])

  const isPendingAssistant = status === 'submitted'
  const isStreaming = status === 'streaming'

  const lastAssistantIdx = (() => {
    if (status !== 'ready') return -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i
    }
    return -1
  })()

  return (
    <ol
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Conversation"
      className="flex flex-col gap-6"
    >
      {messages.map((m, i) => (
        <li key={m.id}>
          <ChatMessage
            message={m}
            isStreaming={isStreaming && i === messages.length - 1}
            onFollowUpSelect={onFollowUpSelect}
            followUps={i === lastAssistantIdx ? latestFollowUps : undefined}
            onRegenerate={i === lastAssistantIdx ? onRegenerate : undefined}
            initialFeedback={feedbackByMessageId?.[m.id] ?? null}
          />
        </li>
      ))}
      {isPendingAssistant ? (
        <li className="flex gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="flex items-center gap-2 pt-1.5 text-sm text-muted-foreground">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            Thinking
          </div>
        </li>
      ) : null}
      <div ref={bottomRef} />
    </ol>
  )
}
