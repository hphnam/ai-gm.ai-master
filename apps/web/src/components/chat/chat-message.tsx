'use client'

import { getToolName, isToolUIPart, type UIMessage } from 'ai'
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronRight,
  Copy,
  MoreHorizontal,
  RefreshCcw,
} from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { MentionedText } from '@/components/chat/mention-picker'
import { DocPreview } from '@/components/docs/doc-preview'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDoc } from '@/lib/hooks/use-docs'
import { cn } from '@/lib/utils'
import { FeedbackButtons } from './feedback-buttons'
import { FollowUpPills } from './follow-up-pills'
import { hasToolCard, ToolCard } from './tool-cards/tool-card-router'
import type { ToolCardCtx, ToolPart } from './tool-cards/types'

// Citation chip — a small numbered pill that sits inline with prose. The
// Tooltip exposes the source title on hover so the number reads as a real
// citation rather than an opaque marker. Clicking opens a Dialogue with the
// full DocPreview. Both the tooltip preview and the dialogue body share the
// same Radix trigger (the chip button).
function CitationChip({ docId, children }: { docId: string; children: React.ReactNode }) {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="View source document"
              className="mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded-md bg-muted px-1 align-[-0.15em] text-[11px] font-semibold leading-none tracking-tight text-foreground/75 transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {children}
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-[300px]">
          <CitationTooltipBody docId={docId} index={children} />
        </TooltipContent>
      </Tooltip>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Source document</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of the knowledge document cited by the assistant.
          </DialogDescription>
        </DialogHeader>
        {/* Radix unmounts DialogContent children when closed, so DocPreview
            only fires its useDoc fetch when the user actually opens it. */}
        <DocPreview docId={docId} />
        <a
          href={`/docs/${docId}`}
          target="_blank"
          rel="noreferrer noopener"
          className="self-end text-xs text-muted-foreground hover:text-foreground"
        >
          Open full document →
        </a>
      </DialogContent>
    </Dialog>
  )
}

// Tooltip body for a citation chip. The useDoc call only fires when the
// TooltipContent actually mounts (Radix portal stays unmounted until the
// trigger opens), and React Query dedupes/caches it for 30s so hovering
// multiple chips referencing the same doc is cheap.
function CitationTooltipBody({ docId, index }: { docId: string; index: React.ReactNode }) {
  const { data, isLoading, isError } = useDoc(docId)
  const title = data?.title?.trim() || null
  const description = (() => {
    if (isLoading) return 'Loading source…'
    if (isError) return 'Source unavailable'
    if (title) return title
    return 'Untitled document'
  })()
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Source {index}
      </span>
      <span className="line-clamp-2 text-[12.5px] font-medium leading-snug text-foreground">
        {description}
      </span>
      <span className="text-[11px] text-muted-foreground">Click to preview</span>
    </div>
  )
}

// Tight UUID gate before the chip mounts. Belt-and-braces for defence-in-depth:
// rewriteCitations only emits valid UUIDs into /docs/, but the link renderer
// also matches any Markdown link with that prefix. If the model ever emits a
// raw [text](/docs/anything-else) we fall through to the external-link branch
// instead of passing unvalidated text to useDoc.
const DOC_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function toolLabel(name: string): string {
  switch (name) {
    case 'find_knowledge':
      return 'Searching knowledge'
    case 'get_stock_below_par':
      return 'Checking stock levels'
    case 'get_stock_by_name':
      return 'Looking up stock'
    case 'get_supplier_by_name':
      return 'Looking up supplier'
    case 'get_upcoming_cutoffs':
      return 'Checking order cutoffs'
    case 'save_knowledge_doc':
      return 'Saving to knowledge base'
    case 'query_document_table':
      return 'Querying tabular data'
    case 'record_kb_gap':
      return 'Recording knowledge gap'
    case 'verify_quote':
      return 'Verifying source'
    case 'log_incident':
      return 'Logging incident'
    case 'update_stock':
      return 'Updating stock'
    case 'add_supplier_note':
      return 'Updating supplier notes'
    case 'deep_research':
      return 'Running deep research'
    default:
      return `Running ${name.replace(/_/g, ' ')}`
  }
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

function BrandDot() {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      <span className="absolute inset-0 rounded-full bg-foreground/30" />
      <span className="relative inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
    </span>
  )
}

type ReasoningPart = { type: 'reasoning'; text: string; state?: string }

function ReasoningBlock({
  text,
  streaming,
  chips,
}: {
  text: string
  streaming: boolean
  chips: ToolChip[]
}) {
  const [open, setOpen] = useState(streaming)
  const hasText = text.trim().length > 0
  const hasChips = chips.length > 0
  if (!hasText && !hasChips) return null
  const inFlightChip = chips.find((c) => !c.done)
  const erroredCount = chips.filter((c) => c.errored).length

  // Header summary: while a tool is running, show its label; otherwise the
  // standard Thinking… / Thought process state. Chips render as a compact
  // row inside the expanded body, alongside the reasoning text.
  const headerLabel = inFlightChip
    ? inFlightChip.label
    : streaming
      ? 'Thinking…'
      : 'Thought process'
  return (
    <div className="rounded-lg border border-border bg-muted">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <Brain className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span>{headerLabel}</span>
        {hasChips && !inFlightChip ? (
          <span className="text-[11px] font-normal text-muted-foreground/80">
            · {chips.length} {chips.length === 1 ? 'tool' : 'tools'}
            {erroredCount ? ` · ${erroredCount} failed` : ''}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          {streaming || inFlightChip ? <BrandDot /> : null}
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          )}
        </span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-3 py-2">
          {hasChips ? (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]',
                    c.errored
                      ? 'border-destructive/30 bg-destructive/5 text-destructive'
                      : !c.done
                        ? 'border-foreground/20 bg-foreground/5 text-foreground'
                        : 'border-border bg-background text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-1 w-1 rounded-full',
                      c.errored
                        ? 'bg-destructive'
                        : !c.done
                          ? 'bg-foreground'
                          : 'bg-muted-foreground/60',
                    )}
                  />
                  {c.label}
                </div>
              ))}
            </div>
          ) : null}
          {hasText ? (
            <div className="text-[13px] italic leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
              {text}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// Phase E1 — citation chips. The agent emits `[doc:<uuid>]` markers when
// quoting from a knowledge_item. We rewrite each marker to a numbered Markdown
// link `[1](/docs/<uuid>)`, dedupe by id (same doc cited twice → same number),
// and let the custom <a> renderer style internal /docs/ links as the
// CitationChip pill (numbered, tappable, visually distinct from prose).
const DOC_CITATION_RE = /\[doc:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi

function rewriteCitations(raw: string): string {
  const seen = new Map<string, number>()
  return raw.replace(DOC_CITATION_RE, (_match, id: string) => {
    const lower = id.toLowerCase()
    let n = seen.get(lower)
    if (n === undefined) {
      n = seen.size + 1
      seen.set(lower, n)
    }
    return `[${n}](/docs/${lower})`
  })
}

function AssistantMarkdown({ text }: { text: string }) {
  // Scoped Markdown styling — we only opt in to the inline formatting that
  // the system prompt actually uses (bold/italic/lists/inline code). Headings,
  // blockquotes, tables and hr are intentionally not styled — the prompt tells
  // the model not to emit them.
  const rewritten = rewriteCitations(text)
  return (
    <div className="text-[15px] leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 whitespace-pre-wrap break-words last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="break-words">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-[13px] font-mono">{children}</code>
          ),
          a: ({ href, children }) => {
            if (typeof href === 'string' && href.startsWith('/docs/')) {
              const docId = href.slice('/docs/'.length)
              if (DOC_ID_RE.test(docId)) {
                return <CitationChip docId={docId}>{children}</CitationChip>
              }
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-foreground underline decoration-foreground/40 underline-offset-2 hover:decoration-foreground"
              >
                {children}
              </a>
            )
          },
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-md border border-border last:mb-0">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60 text-foreground">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border last:border-b-0">{children}</tr>
          ),
          th: ({ children, style }) => (
            <th
              className="px-3 py-1.5 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
              style={style}
            >
              {children}
            </th>
          ),
          td: ({ children, style }) => (
            <td className="px-3 py-1.5 align-top" style={style}>
              {children}
            </td>
          ),
        }}
      >
        {rewritten}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Assistant parts arrive in order: reasoning → text → tool-call → text → ...
 * We render each segment inline so the "thinking" block, the tool chip, and
 * the final answer stay visually separate and reorderable.
 */
type ToolChip = {
  id: string
  label: string
  done: boolean
  errored: boolean
}

function AssistantBody({
  parts,
  isStreaming,
  ctx,
}: {
  parts: UIMessage['parts']
  isStreaming: boolean
  ctx: ToolCardCtx
}) {
  const lastIdx = parts.length - 1
  // Answer = the last text part. Any earlier text parts are interim narration
  // the model emits between tool calls; fold them into the thought-process
  // block so the answer area stays stable as later parts stream in.
  const lastTextIdx = (() => {
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i]?.type === 'text') return i
    }
    return -1
  })()
  const toolChips: ToolChip[] = []
  parts.forEach((p, i) => {
    if (!isToolUIPart(p)) return
    const name = getToolName(p)
    toolChips.push({
      id: (p as { toolCallId?: string }).toolCallId ?? `tool-${i}`,
      label: toolLabel(name),
      done: p.state === 'output-available' || p.state === 'output-error',
      errored: p.state === 'output-error',
    })
  })
  let reasoningStreaming = false
  const reasoningTextParts: string[] = []
  parts.forEach((p, i) => {
    // Reasoning parts always go to the thought block.
    if (p.type === 'reasoning') {
      const rp = p as ReasoningPart
      const isLast = i === lastIdx
      if (isStreaming && isLast && rp.state === 'streaming') reasoningStreaming = true
      const t = (rp.text ?? '').trim()
      if (t.length > 0) reasoningTextParts.push(t)
      return
    }
    // Text parts other than the final one = interim narration the model
    // emitted between tool calls. Fold into the thought block so the answer
    // area stays stable.
    if (p.type === 'text' && i !== lastTextIdx) {
      const t = stripFollowUpTail(p.text).trim()
      if (t.length > 0) reasoningTextParts.push(t)
    }
  })
  const mergedReasoningText = reasoningTextParts.join('\n\n')
  const finalTextPart = lastTextIdx >= 0 ? parts[lastTextIdx] : null
  const finalText =
    finalTextPart && finalTextPart.type === 'text'
      ? stripFollowUpTail(finalTextPart.text).trim()
      : ''

  // Continuity bridge — useChat pushes an empty assistant message the moment
  // the stream opens, before any reasoning / tool / text deltas arrive. Without
  // this, ReasoningBlock returns null (nothing to show), the answer block is
  // empty, and the bare cursor bar flashes — creating a "Thinking → blank →
  // Thinking" flicker between ChatThread's submitted-state fallback and the
  // reasoning block. Render a single Thinking status while streaming and
  // nothing visible has arrived yet.
  const hasReasoning = mergedReasoningText.trim().length > 0
  const hasChips = toolChips.length > 0
  const hasFinal = finalText.length > 0
  const showThinkingBridge = isStreaming && !hasReasoning && !hasChips && !hasFinal

  if (showThinkingBridge) {
    return (
      <div className="flex items-center gap-2 pt-1.5 text-sm text-muted-foreground">
        <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-foreground/25" />
          <span className="relative inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
        </span>
        Thinking
      </div>
    )
  }

  // Generative-UI tool cards — render any tool part with a registered renderer
  // and a final output, in the same order the agent emitted them. Live in-flight
  // tool calls stay as chips inside ReasoningBlock; the card shows up once the
  // output lands.
  const toolCardParts: ToolPart[] = []
  parts.forEach((p) => {
    if (!isToolUIPart(p)) return
    const name = getToolName(p)
    if (!hasToolCard(name)) return
    const tp = p as unknown as ToolPart
    if (tp.state !== 'output-available' && tp.state !== 'output-error') return
    toolCardParts.push(tp)
  })

  return (
    <div className="flex flex-col gap-2.5">
      <ReasoningBlock text={mergedReasoningText} streaming={reasoningStreaming} chips={toolChips} />
      {toolCardParts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {toolCardParts.map((p, i) => (
            <ToolCard key={p.toolCallId ?? `tool-card-${i}`} part={p} ctx={ctx} />
          ))}
        </div>
      ) : null}
      {hasFinal ? (
        <div className="relative">
          <AssistantMarkdown text={finalText} />
          {isStreaming && lastTextIdx === lastIdx ? (
            <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-sm bg-foreground/70 align-middle" />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function assistantPlainText(parts: UIMessage['parts']): string {
  return parts
    .filter((p) => p.type === 'text')
    .map((p) => (p.type === 'text' ? stripFollowUpTail(p.text) : ''))
    .join('\n')
    .trim()
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

  return (
    <article
      aria-label="Assistant message"
      aria-busy={isStreaming ? 'true' : undefined}
      className="flex w-full gap-3"
    >
      <AssistantAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <AssistantBody parts={message.parts} isStreaming={Boolean(isStreaming)} ctx={cardCtx} />
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
  )
}
