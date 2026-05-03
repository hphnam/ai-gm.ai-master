'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getToolName, isToolUIPart, type UIMessage } from 'ai'
import {
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  RefreshCcw,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FeedbackButtons } from './feedback-buttons'
import { FollowUpPills } from './follow-up-pills'

type Props = {
  message: UIMessage
  isStreaming?: boolean
  onFollowUpSelect?: (question: string) => void | Promise<void>
  followUps?: string[]
  onRegenerate?: () => void
  initialFeedback?: 'up' | 'down' | 'regenerate' | null
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

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-sm">
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
    </div>
  )
}

function BrandDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inset-0 animate-ping rounded-full bg-brand/60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
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
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <Brain className="h-3.5 w-3.5 text-brand" aria-hidden />
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
                        ? 'border-brand/30 bg-brand/5 text-brand'
                        : 'border-border bg-background text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-1 w-1 rounded-full',
                      c.errored
                        ? 'bg-destructive'
                        : !c.done
                          ? 'bg-brand'
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
// quoting from a knowledge_item. We rewrite each marker to a numbered
// superscript markdown link `[¹](/docs/<uuid>)`, dedupe by id (same doc cited
// twice → same number), and let the custom <a> renderer style internal
// /docs/ links as small chips without underlines.
const DOC_CITATION_RE = /\[doc:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi
const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']
function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPT_DIGITS[Number(d)] ?? d)
    .join('')
}

function rewriteCitations(raw: string): string {
  const seen = new Map<string, number>()
  return raw.replace(DOC_CITATION_RE, (_match, id: string) => {
    const lower = id.toLowerCase()
    let n = seen.get(lower)
    if (n === undefined) {
      n = seen.size + 1
      seen.set(lower, n)
    }
    return `[${toSuperscript(n)}](/docs/${lower})`
  })
}

function AssistantMarkdown({ text }: { text: string }) {
  // Scoped markdown styling — we only opt in to the inline formatting that
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
            <p className="mb-2 whitespace-pre-wrap break-words last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="break-words">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-[13px] font-mono">
              {children}
            </code>
          ),
          a: ({ href, children }) => {
            const isInternalDoc = typeof href === 'string' && href.startsWith('/docs/')
            if (isInternalDoc) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ml-0.5 inline-flex items-baseline rounded-sm bg-brand/10 px-1 align-baseline text-[10px] font-medium text-brand no-underline hover:bg-brand/20"
                  aria-label="View source document"
                >
                  {children}
                </a>
              )
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand underline underline-offset-2"
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
}: {
  parts: UIMessage['parts']
  isStreaming: boolean
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

  return (
    <div className="flex flex-col gap-2.5">
      <ReasoningBlock
        text={mergedReasoningText}
        streaming={reasoningStreaming}
        chips={toolChips}
      />
      {finalText ? (
        <div className="relative">
          <AssistantMarkdown text={finalText} />
          {isStreaming && lastTextIdx === lastIdx ? (
            <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-sm bg-foreground/70 align-middle" />
          ) : null}
        </div>
      ) : null}
      {isStreaming && parts.length === 0 ? (
        <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-sm bg-foreground/70 align-middle" />
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
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access.")
    }
  }

  return (
    <div className="mt-1 flex items-center gap-1">
      <FeedbackButtons messageId={messageId} initial={initialFeedback ?? null} />
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy reply'}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
      </button>
      {onRegenerate ? (
        <button
          type="button"
          onClick={onRegenerate}
          aria-label="Regenerate reply"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

export function ChatMessage({
  message,
  isStreaming,
  onFollowUpSelect,
  followUps,
  onRegenerate,
  initialFeedback,
}: Props) {
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
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
          <div className="whitespace-pre-wrap break-words">{text}</div>
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
        <AssistantBody parts={message.parts} isStreaming={Boolean(isStreaming)} />
        {!isStreaming ? (
          <AssistantActions
            messageId={message.id}
            text={plainText}
            onRegenerate={onRegenerate}
            initialFeedback={initialFeedback}
          />
        ) : null}
        {!isStreaming && followUps && onFollowUpSelect ? (
          <FollowUpPills followUps={followUps} onSelect={onFollowUpSelect} />
        ) : null}
      </div>
    </article>
  )
}
