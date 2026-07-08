'use client'

import type { UIMessage } from 'ai'
import { memo, type RefObject, useCallback, useEffect, useRef } from 'react'
import { AgentTraceLive, type TraceStep } from './agent-trace'
import { ChatMessage } from './chat-message'

const THINKING_STEPS: TraceStep[] = [{ id: 'thinking', label: 'Thinking', status: 'active' }]

// Settled messages keep a stable `message` reference across streaming deltas
// (useChat only replaces the in-flight message object), so a shallow-prop memo
// lets every prior bubble skip the ReactMarkdown re-parse on each token.
const MemoChatMessage = memo(ChatMessage)

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
  /// The scrollable ancestor (owned by the chat page). Lets the thread pin to
  /// the bottom as the answer streams in, and stop pinning once the user
  /// scrolls up to read history.
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

// Cheap signature that changes on every streamed token — the last message's
// part count plus its total text length. Drives the stream-follow effect
// without depending on the array identity (which churns each render).
function streamSignature(messages: UIMessage[]): number {
  const last = messages[messages.length - 1]
  if (!last) return 0
  let len = last.parts.length
  for (const p of last.parts) if (p.type === 'text') len += p.text.length
  return len
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
  scrollContainerRef,
}: Props) {
  // Whether we're allowed to auto-follow the bottom. Flips off the moment the
  // user scrolls away from the bottom, back on when they return — so streaming
  // never yanks them up while they're reading earlier messages.
  const stickRef = useRef(true)
  // First auto-scroll (opening a thread) jumps instantly; later ones animate.
  const mountedRef = useRef(false)

  // Scroll the THREAD CONTAINER to its bottom — never scrollIntoView(), which
  // bubbles up every scrollable ancestor and, on mobile, drags the page <body>
  // (min-h-dvh) so the view "starts halfway down". scrollTo stays local.
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      const el = scrollContainerRef?.current
      el?.scrollTo({ top: el.scrollHeight, behavior })
    },
    [scrollContainerRef],
  )

  useEffect(() => {
    const el = scrollContainerRef?.current
    if (!el) return
    const onScroll = () => {
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollContainerRef])

  // New message: re-pin and scroll to it — sending (or receiving a new turn) is
  // an intent to follow along. Instant on first mount (opening a thread), smooth
  // thereafter so a genuinely new message glides in.
  useEffect(() => {
    stickRef.current = true
    scrollToBottom(mountedRef.current ? 'smooth' : 'auto')
    mountedRef.current = true
  }, [messages.length, scrollToBottom])

  // The pending "Thinking" row appearing is also a follow intent. Keyed only on
  // the `submitted` entry — deliberately NOT on generic status changes, so the
  // streaming→ready transition can't drag a user who scrolled up back down
  // (that's the stickRef guard's job).
  useEffect(() => {
    if (status !== 'submitted') return
    stickRef.current = true
    scrollToBottom('smooth')
  }, [status, scrollToBottom])

  // Stream growth: the last message's text lengthens without a count change.
  // Jump (no smooth) to the bottom on each token so the answer stays in view —
  // but only while pinned, so a user reading history isn't dragged down.
  const signature = streamSignature(messages)
  useEffect(() => {
    if (!stickRef.current) return
    scrollToBottom('auto')
  }, [signature, scrollToBottom])

  const isPendingAssistant = status === 'submitted'
  const isStreaming = status === 'streaming'

  const lastAssistantIdx = (() => {
    if (status !== 'ready') return -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i
    }
    return -1
  })()

  // Resolve once so every row passes the same function reference — recomputing
  // `onPrompt ?? onFollowUpSelect` inline per row would still be stable, but
  // hoisting keeps the memo contract obvious.
  const promptHandler = onPrompt ?? onFollowUpSelect

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
          <MemoChatMessage
            message={m}
            isStreaming={isStreaming && i === messages.length - 1}
            onFollowUpSelect={onFollowUpSelect}
            followUps={i === lastAssistantIdx ? latestFollowUps : undefined}
            onRegenerate={i === lastAssistantIdx ? onRegenerate : undefined}
            initialFeedback={feedbackByMessageId?.[m.id] ?? null}
            verify={verifyByMessageId?.[m.id] ?? null}
            onPrompt={promptHandler}
            venueId={venueId}
          />
        </li>
      ))}
      {isPendingAssistant ? (
        <li className="flex gap-3 duration-300 animate-in fade-in motion-reduce:animate-none">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/75">
            <span className="font-display text-[11px] font-semibold leading-none tracking-[-0.02em]">
              gm
            </span>
          </div>
          <div className="pt-1">
            <AgentTraceLive steps={THINKING_STEPS} />
          </div>
        </li>
      ) : null}
    </ol>
  )
}
