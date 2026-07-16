'use client'

import { getToolName, isToolUIPart, type UIMessage } from 'ai'
import { AlertTriangle, CloudOff, Copy, MoreHorizontal, RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MentionedText } from '@/components/chat/mention-picker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AgentTraceDisclosure, AgentTraceLive, type TraceStep } from './agent-trace'
import { AssistantMarkdown } from './assistant-markdown'
import {
  buildSectionsByDoc,
  CitationsContext,
  hasKbRetrievalError,
  hasUncitedKb,
} from './citations'
import { FeedbackButtons } from './feedback-buttons'
import { FollowUpPills } from './follow-up-pills'
import { hasToolCard, ToolCard } from './tool-cards/tool-card-router'
import type { ToolCardCtx, ToolPart } from './tool-cards/types'
import { toolDonePhrase, toolStatusPhrase } from './tool-labels'

type Props = {
  message: UIMessage
  isStreaming?: boolean
  onFollowUpSelect?: (question: string) => void | Promise<void>
  followUps?: string[]
  onRegenerate?: () => void
  initialFeedback?: 'up' | 'down' | 'regenerate' | null
  verify?: {
    status: 'pending' | 'clean' | 'issues' | 'skipped' | 'error'
    issueCount: number | null
  } | null
  /// Lets generative-UI cards re-prompt the agent (disambiguation picks,
  /// "draft order", refine actions). Falls back to onFollowUpSelect when the
  /// caller doesn't pass a dedicated handler.
  onPrompt?: (text: string) => void | Promise<void>
  venueId?: string | null
}

const FOLLOWUP_DELIMITER = '---FOLLOWUPS---'

function stripFollowUpTail(raw: string): string {
  const idx = raw.lastIndexOf(FOLLOWUP_DELIMITER)
  if (idx === -1) return raw
  return raw.slice(0, idx).trimEnd()
}

// Quiet monogram avatar — a thin-ringed circle with a small "gm" wordmark.
// Replaces the Sparkles glyph so the AI doesn't read as a generic chatbot.
function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground/75">
      <span className="font-display text-[11px] font-semibold leading-none tracking-[-0.02em]">
        gm
      </span>
    </div>
  )
}

type ToolStep = {
  id: string
  name: string
  status: 'active' | 'done' | 'error'
  input?: unknown
}

type AssistantClassification = {
  /// Every tool call this turn, in emission order — settled or in flight.
  /// Drives the step trace (live while streaming, disclosure once settled).
  toolSteps: ToolStep[]
  /// Deliverable tool cards (report, checklist, task-created, stock list, …).
  /// These are content the user keeps, so they render both mid-stream and on
  /// reload. Non-deliverable tool calls render nothing.
  toolCardParts: ToolPart[]
  /// One entry per text part the model emitted, in emission order. Each
  /// becomes its own bubble.
  answerChunks: string[]
  /// True when the very last part in the message is a text part — used to
  /// decide whether the streaming cursor renders at the end of the last chunk.
  lastPartIsText: boolean
}

function classifyAssistantParts(parts: UIMessage['parts']): AssistantClassification {
  const lastIdx = parts.length - 1

  const toolSteps: ToolStep[] = []
  const answerChunks: string[] = []
  const toolCardParts: ToolPart[] = []
  parts.forEach((p, idx) => {
    if (isToolUIPart(p)) {
      const name = getToolName(p)
      const settled = p.state === 'output-available' || p.state === 'output-error'
      const status = p.state === 'output-error' ? 'error' : settled ? 'done' : 'active'
      const input = 'input' in p ? p.input : undefined
      const prev = toolSteps[toolSteps.length - 1]
      if (prev?.name === name) {
        // Consecutive calls to the same tool collapse into one step; an error
        // only sticks if the whole run errored.
        if (status !== 'error' || prev.status === 'error') prev.status = status
        prev.input = input
      } else {
        toolSteps.push({ id: p.toolCallId ?? `${name}-${idx}`, name, status, input })
      }
      if (settled && hasToolCard(name)) toolCardParts.push(p as unknown as ToolPart)
      return
    }
    if (p.type === 'text') {
      const t = stripFollowUpTail(p.text).trim()
      if (t.length > 0) answerChunks.push(t)
    }
  })

  return {
    toolSteps,
    toolCardParts,
    answerChunks,
    lastPartIsText: lastIdx >= 0 && parts[lastIdx]?.type === 'text',
  }
}

/// Wall-clock for the whole turn, captured client-side while this message
/// streams. Null on reloaded turns — the persisted log carries no timings.
function useTurnElapsed(isStreaming: boolean): number | null {
  const startRef = useRef<number | null>(isStreaming ? Date.now() : null)
  const [elapsedSec, setElapsedSec] = useState<number | null>(null)

  useEffect(() => {
    if (isStreaming) {
      if (startRef.current === null) startRef.current = Date.now()
      return
    }
    if (startRef.current !== null) {
      setElapsedSec(Math.max(1, Math.round((Date.now() - startRef.current) / 1000)))
      startRef.current = null
    }
  }, [isStreaming])

  return elapsedSec
}

function AssistantAnswer({ text, showCursor }: { text: string; showCursor: boolean }) {
  return (
    <div className="relative">
      <AssistantMarkdown text={text} />
      {showCursor ? (
        <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-sm bg-foreground/70 align-middle" />
      ) : null}
    </div>
  )
}

function assistantPlainText(parts: UIMessage['parts']): string {
  // Every text part is part of the visible answer. Copy/feedback ships the
  // concatenation of all bubbles so it matches what the user sees.
  const chunks: string[] = []
  parts.forEach((p) => {
    if (p.type !== 'text') return
    const t = stripFollowUpTail(p.text).trim()
    if (t.length > 0) chunks.push(t)
  })
  return chunks.join('\n\n')
}

function AssistantActions({
  messageId,
  text,
  onRegenerate,
  initialFeedback,
}: {
  messageId: string
  text: string
  onRegenerate?: () => void
  initialFeedback?: 'up' | 'down' | 'regenerate' | null
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access.")
    }
  }

  return (
    <div className="mt-1 flex items-center gap-1">
      <FeedbackButtons messageId={messageId} initial={initialFeedback ?? null} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          <DropdownMenuItem onSelect={copy} className="cursor-pointer gap-2">
            <Copy className="h-4 w-4" aria-hidden />
            Copy reply
          </DropdownMenuItem>
          {onRegenerate ? (
            <DropdownMenuItem onSelect={onRegenerate} className="cursor-pointer gap-2">
              <RefreshCcw className="h-4 w-4" aria-hidden />
              Regenerate
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Shown when the model searched the knowledge corpus but produced an answer
// without any [doc:<uuid>] markers. The system prompt says cite whenever a
// fact is sourced from the KB; silence means either (a) the model fabricated,
// (b) the model paraphrased without anchoring, or (c) retrieval returned
// nothing useful and the answer is from training-data alone. Either way the
// user should not trust specifics without verifying.
function UncitedKbWarning() {
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-2 text-xs text-warning"
      role="note"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        No sources cited — the model searched the knowledge base but didn't anchor this answer to a
        document. Treat specifics as a guess and verify before acting.
      </span>
    </div>
  )
}

// Phase 1.5 — shown when a knowledge-base lookup ERRORED this turn (embeddings /
// database unreachable) rather than returning empty. Degraded-mode signal so the
// operator knows the KB was DOWN — distinct from "we have no doc on file". Uses a
// neutral/muted tone + offline icon so it doesn't read as a content warning.
function KbUnreachableBanner() {
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground"
      role="status"
    >
      <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        Knowledge base was unreachable — this answer couldn't be checked against your documents. Try
        again in a moment.
      </span>
    </div>
  )
}

// Wave-C auto-verify status. Quiet inline strip — a small dot + grey text.
// Colour is reserved for true alarms (the "issues" state uses destructive); a
// clean check is just a muted dot, so a successful answer stays calm.
function VerifyBadge({ verify }: { verify: NonNullable<Props['verify']> }) {
  if (verify.status === 'clean') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
        title="Specifics in this answer were checked against the cited sources."
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        <span>Checked against sources</span>
      </span>
    )
  }
  if (verify.status === 'issues') {
    // The API guarantees issueCount >= 1 whenever status === 'issues'
    // (QuoteVerifierService only emits OK:false when at least one issue is
    // produced). The ?? 1 fallback handles legacy rows that pre-date the
    // column without breaking the badge.
    const n = verify.issueCount ?? 1
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] text-destructive"
        title="The verifier flagged specifics in this answer that may not match the cited sources. Double-check before acting."
      >
        <AlertTriangle className="h-3 w-3" aria-hidden />
        <span>
          Couldn't verify {n} {n === 1 ? 'claim' : 'claims'}
        </span>
      </span>
    )
  }
  if (verify.status === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
        title="Auto-verification didn't complete for this answer. Double-check anything specific before acting."
      >
        <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/50" aria-hidden />
        <span>Verification unavailable</span>
      </span>
    )
  }
  return null
}

export function ChatMessage({
  message,
  isStreaming,
  onFollowUpSelect,
  followUps,
  onRegenerate,
  initialFeedback,
  verify,
  onPrompt,
  venueId,
}: Props) {
  const cardCtx: ToolCardCtx = {
    onPrompt: onPrompt ?? onFollowUpSelect,
    venueId: venueId ?? null,
  }
  const isUser = message.role === 'user'

  // Hooks before the user-bubble early return — a message row never changes
  // role in place (keyed by id), but the hook order must not depend on it.
  const sectionsByDoc = useMemo(() => buildSectionsByDoc(message.parts), [message.parts])
  const turnElapsed = useTurnElapsed(!isUser && Boolean(isStreaming))

  if (isUser) {
    const text = stripFollowUpTail(
      message.parts
        .map((p) => (p.type === 'text' ? p.text : ''))
        .join('')
        .trim(),
    )
    return (
      <article
        aria-label="Your message"
        className="flex w-full justify-end duration-300 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
      >
        <div className="max-w-[85%] rounded-[18px] bg-[#ece3d2] px-[17px] py-3 text-[15px] leading-[1.5] text-[var(--ink-text)]">
          <MentionedText text={text} className="whitespace-pre-wrap break-words" />
        </div>
      </article>
    )
  }

  const plainText = assistantPlainText(message.parts)
  const classification = classifyAssistantParts(message.parts)
  const { answerChunks, toolSteps, toolCardParts, lastPartIsText } = classification
  // Trust signals, derived from parts + text so they survive reload. A KB
  // retrieval error owns the turn — suppress the uncited warning under it (the
  // model was told to say "can't reach the KB", not fabricate).
  const kbUnreachable = !isStreaming && hasKbRetrievalError(message.parts)
  const showUncitedWarning =
    !isStreaming && !kbUnreachable && hasUncitedKb(message.parts, plainText)

  const liveSteps: TraceStep[] = toolSteps.map((s) => ({
    id: s.id,
    label:
      s.status === 'active' ? toolStatusPhrase(s.name, s.input) : toolDonePhrase(s.name, s.input),
    status: s.status,
  }))
  if (isStreaming && answerChunks.length === 0 && !liveSteps.some((s) => s.status === 'active')) {
    liveSteps.push({
      id: 'working',
      label: liveSteps.length > 0 ? 'Working' : 'Thinking',
      status: 'active',
    })
  }
  const settledSteps: TraceStep[] = toolSteps.map((s) => ({
    id: s.id,
    label: toolDonePhrase(s.name, s.input),
    status: s.status === 'error' ? 'error' : 'done',
  }))

  // One <article> per answer chunk, with at least one rendered (an empty-text
  // bubble shows the live status / deliverable cards before any text arrives).
  // Stable keys mean a 1-chunk → 2-chunk transition appends a new article
  // without remounting the first one, and the empty → first-text transition
  // reuses the same article (no remount, smoother handoff).
  const renderedChunks = answerChunks.length > 0 ? answerChunks : ['']
  const lastChunkIdx = renderedChunks.length - 1

  return (
    <CitationsContext.Provider value={sectionsByDoc}>
      <article
        aria-label="Assistant message"
        aria-busy={isStreaming ? 'true' : undefined}
        className="flex w-full gap-3 duration-300 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
      >
        <AssistantAvatar />
        <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
          {isStreaming ? (
            <AgentTraceLive steps={liveSteps} />
          ) : (
            <AgentTraceDisclosure steps={settledSteps} elapsedSec={turnElapsed} />
          )}
          {toolCardParts.length > 0 ? (
            <div className="flex flex-col gap-2 duration-300 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none">
              {toolCardParts.map((p, i) => (
                <ToolCard key={p.toolCallId ?? `tool-card-${i}`} part={p} ctx={cardCtx} />
              ))}
            </div>
          ) : null}
          {renderedChunks.map((chunk, i) => {
            if (chunk.length === 0) return null
            const isLast = i === lastChunkIdx
            return (
              <AssistantAnswer
                // biome-ignore lint/suspicious/noArrayIndexKey: chunks mirror model emission order and never reorder within a turn; index is the stable identity here.
                key={`${message.id}:chunk-${i}`}
                text={chunk}
                showCursor={Boolean(isStreaming) && isLast && lastPartIsText}
              />
            )
          })}
          {kbUnreachable ? <KbUnreachableBanner /> : null}
          {showUncitedWarning ? <UncitedKbWarning /> : null}
          {!isStreaming ? (
            <div className="flex flex-wrap items-center gap-2">
              <AssistantActions
                messageId={message.id}
                text={plainText}
                onRegenerate={onRegenerate}
                initialFeedback={initialFeedback}
              />
              {verify ? <VerifyBadge verify={verify} /> : null}
            </div>
          ) : null}
          {!isStreaming && followUps && onFollowUpSelect ? (
            <FollowUpPills followUps={followUps} onSelect={onFollowUpSelect} />
          ) : null}
        </div>
      </article>
    </CitationsContext.Provider>
  )
}
