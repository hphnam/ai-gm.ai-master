'use client'

import { getToolName, isToolUIPart, type UIMessage } from 'ai'
import { AlertTriangle, Copy, MoreHorizontal, RefreshCcw } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { MentionedText } from '@/components/chat/mention-picker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AssistantMarkdown } from './assistant-markdown'
import { buildSectionsByDoc, CitationsContext, hasUncitedKb } from './citations'
import { FeedbackButtons } from './feedback-buttons'
import { FollowUpPills } from './follow-up-pills'
import { LiveStatusLine } from './live-status'
import { hasToolCard, ToolCard } from './tool-cards/tool-card-router'
import type { ToolCardCtx, ToolPart } from './tool-cards/types'
import { toolStatusPhrase } from './tool-labels'

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

type AssistantClassification = {
  /// The tool currently in flight (input streamed, no output yet), if any. It
  /// drives the ephemeral live status line. We surface the most recent one so a
  /// multi-tool chain shows the freshest action.
  liveTool: { name: string; input: unknown } | null
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

  let liveTool: { name: string; input: unknown } | null = null
  const answerChunks: string[] = []
  const toolCardParts: ToolPart[] = []
  parts.forEach((p) => {
    if (isToolUIPart(p)) {
      const name = getToolName(p)
      const settled = p.state === 'output-available' || p.state === 'output-error'
      if (!settled) {
        liveTool = { name, input: (p as { input?: unknown }).input }
        return
      }
      if (hasToolCard(name)) toolCardParts.push(p as unknown as ToolPart)
      return
    }
    if (p.type === 'text') {
      const t = stripFollowUpTail(p.text).trim()
      if (t.length > 0) answerChunks.push(t)
    }
  })

  return {
    liveTool,
    toolCardParts,
    answerChunks,
    lastPartIsText: lastIdx >= 0 && parts[lastIdx]?.type === 'text',
  }
}

/// Renders the per-turn header: the ephemeral live status line (streaming only)
/// and any deliverable tool cards. The answer text is rendered separately by
/// ChatMessage so multi-chunk turns can split into multiple bubbles.
function AssistantTurnHeader({
  liveStatus,
  toolCardParts,
  ctx,
}: {
  liveStatus: string | null
  toolCardParts: ToolPart[]
  ctx: ToolCardCtx
}) {
  if (!liveStatus && toolCardParts.length === 0) return null
  return (
    <div className="flex flex-col gap-2.5">
      {liveStatus ? <LiveStatusLine label={liveStatus} /> : null}
      {toolCardParts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {toolCardParts.map((p, i) => (
            <ToolCard key={p.toolCallId ?? `tool-card-${i}`} part={p} ctx={ctx} />
          ))}
        </div>
      ) : null}
    </div>
  )
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
      className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
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
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500"
          aria-hidden
        />
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

  if (isUser) {
    const text = stripFollowUpTail(
      message.parts
        .map((p) => (p.type === 'text' ? p.text : ''))
        .join('')
        .trim(),
    )
    return (
      <article aria-label="Your message" className="flex w-full justify-end">
        <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-[15px] leading-relaxed text-foreground">
          <MentionedText text={text} className="whitespace-pre-wrap break-words" />
        </div>
      </article>
    )
  }

  const plainText = assistantPlainText(message.parts)
  const classification = classifyAssistantParts(message.parts)
  const { answerChunks, liveTool, toolCardParts, lastPartIsText } = classification
  // Built once per message render — chips inside this message's prose look it
  // up via CitationsContext. Memoised on the parts identity to avoid rebuilds
  // when adjacent state (streaming, follow-ups) changes.
  const sectionsByDoc = useMemo(() => buildSectionsByDoc(message.parts), [message.parts])
  const showUncitedWarning = !isStreaming && hasUncitedKb(message.parts, plainText)

  // Ephemeral working status — only while streaming, and only until the answer
  // text starts landing. An in-flight tool names the action ("Getting sales
  // from your POS"); between steps a generic "Working" covers the model's
  // thinking gaps. Never shown on settled/reloaded turns, so saved history
  // stays clean.
  const liveStatus =
    isStreaming && (liveTool || answerChunks.length === 0)
      ? liveTool
        ? toolStatusPhrase(liveTool.name, liveTool.input)
        : 'Working'
      : null

  // One <article> per answer chunk, with at least one rendered (an empty-text
  // bubble shows the live status / deliverable cards before any text arrives).
  // Stable keys mean a 1-chunk → 2-chunk transition appends a new article
  // without remounting the first one, and the empty → first-text transition
  // reuses the same article (no remount, smoother handoff).
  const renderedChunks = answerChunks.length > 0 ? answerChunks : ['']
  const lastChunkIdx = renderedChunks.length - 1

  return (
    <CitationsContext.Provider value={sectionsByDoc}>
      <div className="flex flex-col gap-6">
        {renderedChunks.map((chunk, i) => {
          const isFirst = i === 0
          const isLast = i === lastChunkIdx
          return (
            <article
              // biome-ignore lint/suspicious/noArrayIndexKey: chunks mirror model emission order and never reorder within a turn; index is the stable identity here.
              key={`${message.id}:chunk-${i}`}
              aria-label="Assistant message"
              aria-busy={isStreaming && isLast ? 'true' : undefined}
              className="flex w-full gap-3"
            >
              <AssistantAvatar />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {isFirst ? (
                  <AssistantTurnHeader
                    liveStatus={liveStatus}
                    toolCardParts={toolCardParts}
                    ctx={cardCtx}
                  />
                ) : null}
                {chunk.length > 0 ? (
                  <AssistantAnswer
                    text={chunk}
                    showCursor={Boolean(isStreaming) && isLast && lastPartIsText}
                  />
                ) : null}
                {isLast && showUncitedWarning ? <UncitedKbWarning /> : null}
                {isLast && !isStreaming ? (
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
                {isLast && !isStreaming && followUps && onFollowUpSelect ? (
                  <FollowUpPills followUps={followUps} onSelect={onFollowUpSelect} />
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </CitationsContext.Provider>
  )
}
