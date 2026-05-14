'use client'

import type { UIMessage } from 'ai'
import { useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message'

export type VerifyEntry = {
  status: 'pending' | 'clean' | 'issues' | 'skipped' | 'error'
  issueCount: number | null
}

type Props = {
  messages: UIMessage[]
  status: 'submitted' | 'streaming' | 'ready' | 'error'
  onFollowUpSelect?: (question: string) => void | Promise<void>
  latestFollowUps: string[]
  onRegenerate?: () => void
  feedbackByMessageId?: Record<string, 'up' | 'down' | 'regenerate'>
  verifyByMessageId?: Record<string, VerifyEntry>
  /// Re-prompt the agent — used by generative-UI cards (disambiguation
  /// picks, "draft order", refine actions). Defaults to onFollowUpSelect.
  onPrompt?: (text: string) => void | Promise<void>
  venueId?: string | null
}

export function ChatThread({
  messages,
  status,
  onFollowUpSelect,
  latestFollowUps,
  onRegenerate,
  feedbackByMessageId,
  verifyByMessageId,
  onPrompt,
  venueId,
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
            verify={verifyByMessageId?.[m.id] ?? null}
            onPrompt={onPrompt ?? onFollowUpSelect}
            venueId={venueId}
          />
        </li>
      ))}
      {isPendingAssistant ? (
        <li className="flex gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/75">
            <span className="font-display text-[11px] font-semibold leading-none tracking-[-0.02em]">
              gm
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1.5 text-sm text-muted-foreground">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-foreground/25" />
              <span className="relative inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
            </span>
            Thinking
          </div>
        </li>
      ) : null}
      <div ref={bottomRef} />
    </ol>
  )
}
