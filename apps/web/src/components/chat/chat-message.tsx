'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isToolUIPart, type UIMessage } from 'ai'
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
  const bare = name.replace(/^tool-/, '')
  switch (bare) {
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
    default:
      return `Running ${bare}`
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

function ReasoningBlock({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(streaming)
  if (!text.trim()) return null
  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <Brain className="h-3.5 w-3.5 text-brand" aria-hidden />
        <span>{streaming ? 'Thinking…' : 'Thought process'}</span>
        <span className="ml-auto flex items-center gap-1">
          {streaming ? <BrandDot /> : null}
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          )}
        </span>
      </button>
      {open ? (
        <div className="border-t border-border px-3 py-2 text-[13px] italic leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
          {text}
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
function AssistantBody({
  parts,
  isStreaming,
}: {
  parts: UIMessage['parts']
  isStreaming: boolean
}) {
  const lastIdx = parts.length - 1
  return (
    <div className="flex flex-col gap-2.5">
      {parts.map((p, i) => {
        const isLast = i === lastIdx
        if (p.type === 'text') {
          const visible = stripFollowUpTail(p.text).trim()
          if (!visible) return null
          return (
            <div key={`text-${i}`} className="relative">
              <AssistantMarkdown text={visible} />
              {isStreaming && isLast ? (
                <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-sm bg-foreground/70 align-middle" />
              ) : null}
            </div>
          )
        }
        if (p.type === 'reasoning') {
          const rp = p as ReasoningPart
          return (
            <ReasoningBlock
              key={`reasoning-${i}`}
              text={rp.text ?? ''}
              streaming={Boolean(isStreaming && isLast && rp.state === 'streaming')}
            />
          )
        }
        if (isToolUIPart(p)) {
          // suggest_followups is a mechanism — don't render it as a chip.
          const bare = p.type.replace(/^tool-/, '')
          if (bare === 'suggest_followups') return null
          const toolCallId =
            (p as { toolCallId?: string }).toolCallId ?? `tool-${i}`
          const done =
            p.state === 'output-available' || p.state === 'output-error'
          const errored = p.state === 'output-error'
          const label = toolLabel(p.type)
          return (
            <div
              key={toolCallId}
              className={cn(
                'inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-[12px]',
                done
                  ? errored
                    ? 'border-destructive/30 bg-destructive/5 text-destructive'
                    : 'border-border bg-muted/70 text-muted-foreground'
                  : 'border-brand/30 bg-brand/5 text-brand',
              )}
            >
              {done ? (
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full',
                    errored ? 'bg-destructive' : 'bg-muted-foreground/60',
                  )}
                />
              ) : (
                <BrandDot />
              )}
              <span>{label}</span>
            </div>
          )
        }
        return null
      })}
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
