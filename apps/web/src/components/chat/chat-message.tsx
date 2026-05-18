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
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
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

// Sections that find_knowledge retrieved this turn, grouped by docId. Lets the
// CitationTooltipBody surface "which section of this doc the model was reading
// when it wrote this answer" without changing the [doc:<uuid>] marker contract.
// Built once per assistant message from message.parts; consumed by chips
// rendered inside that message's prose.
type SectionsByDoc = ReadonlyMap<string, readonly string[]>
const CitationsContext = createContext<SectionsByDoc>(new Map())

function formatRelativeUpdated(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diffMs = Date.now() - ts
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

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
  const sectionsByDoc = useContext(CitationsContext)
  const sections = sectionsByDoc.get(docId) ?? []
  const title = data?.title?.trim() || null
  const description = (() => {
    if (isLoading) return 'Loading source…'
    if (isError) return 'Source unavailable'
    if (title) return title
    return 'Untitled document'
  })()
  const updated = data?.updatedAt ? formatRelativeUpdated(data.updatedAt) : null
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Source {index}
      </span>
      <span className="line-clamp-2 text-[12.5px] font-medium leading-snug text-foreground">
        {description}
      </span>
      {updated ? (
        <span className="text-[11px] text-muted-foreground">Updated {updated}</span>
      ) : null}
      {sections.length > 0 ? (
        <div className="mt-1 border-t border-border/60 pt-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {sections.length === 1 ? 'Section read' : 'Sections read'}
          </span>
          <ul className="mt-0.5 space-y-0.5">
            {sections.slice(0, 3).map((s) => (
              <li key={s} className="line-clamp-1 text-[11.5px] text-foreground/85">
                {s}
              </li>
            ))}
            {sections.length > 3 ? (
              <li className="text-[11px] text-muted-foreground">+{sections.length - 3} more</li>
            ) : null}
          </ul>
        </div>
      ) : null}
      <span className="mt-0.5 text-[11px] text-muted-foreground">Click to preview</span>
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

/// Friendly labels for every tool the agent can call. Two forms:
///   - active  : present-progressive, shown WHILE the tool is running. The
///               UI appends an ellipsis ("Pulling sales numbers…") so it
///               reads as activity, not a noun.
///   - settled : past tense, shown after the tool completes in the expanded
///               thought-process chip strip ("Pulled sales numbers").
/// New tools default to a humanised version of the snake-cased name — adding
/// a proper entry here is one line and worth doing whenever the agent gains
/// a new capability.
type ToolLabel = { active: string; settled: string }
const TOOL_LABELS: Record<string, ToolLabel> = {
  // Knowledge + retrieval
  find_knowledge: {
    active: 'Searching the knowledge base',
    settled: 'Searched the knowledge base',
  },
  query_document_table: { active: 'Reading a document', settled: 'Read a document' },
  save_knowledge_doc: {
    active: 'Saving to the knowledge base',
    settled: 'Saved to the knowledge base',
  },
  record_kb_gap: { active: 'Logging the question', settled: 'Logged the question' },
  verify_quote: { active: 'Verifying the source', settled: 'Verified the source' },
  deep_research: { active: 'Researching in depth', settled: 'Researched in depth' },
  // Stock + suppliers (mock + integration)
  get_stock_below_par: { active: 'Checking stock levels', settled: 'Checked stock levels' },
  get_stock_by_name: { active: 'Looking up that item', settled: 'Looked up that item' },
  get_supplier_by_name: { active: 'Looking up the supplier', settled: 'Looked up the supplier' },
  get_upcoming_cutoffs: { active: 'Checking order cutoffs', settled: 'Checked order cutoffs' },
  update_stock: { active: 'Updating stock', settled: 'Updated stock' },
  add_supplier_note: { active: 'Updating supplier notes', settled: 'Updated supplier notes' },
  // Incident + ops
  log_incident: { active: 'Logging the incident', settled: 'Logged the incident' },
  leave_note_for_user: { active: 'Leaving a note', settled: 'Left a note' },
  // Tasks
  create_task: { active: 'Adding a task', settled: 'Added a task' },
  complete_task: { active: 'Marking the task done', settled: 'Marked the task done' },
  list_my_tasks: { active: 'Pulling your tasks', settled: 'Pulled your tasks' },
  // Checklists
  present_checklist: { active: 'Pulling up the walkthrough', settled: 'Pulled up the walkthrough' },
  // Reports
  generate_report: { active: 'Putting the report together', settled: 'Put the report together' },
  schedule_report: { active: 'Scheduling the report', settled: 'Scheduled the report' },
  list_scheduled_reports: { active: 'Pulling your schedules', settled: 'Pulled your schedules' },
  pause_scheduled_report: { active: 'Pausing the schedule', settled: 'Paused the schedule' },
  resume_scheduled_report: { active: 'Resuming the schedule', settled: 'Resumed the schedule' },
  cancel_scheduled_report: { active: 'Cancelling the schedule', settled: 'Cancelled the schedule' },
  // POS (Square + future providers)
  pos_search_items: { active: 'Searching the menu', settled: 'Searched the menu' },
  pos_get_item_inventory: { active: 'Checking inventory', settled: 'Checked inventory' },
  pos_list_recent_orders: { active: 'Pulling recent orders', settled: 'Pulled recent orders' },
  pos_get_sales_summary: { active: 'Pulling sales numbers', settled: 'Pulled sales numbers' },
  pos_list_locations: { active: 'Listing POS locations', settled: 'Listed POS locations' },
  pos_list_recent_shifts: { active: 'Pulling recent shifts', settled: 'Pulled recent shifts' },
  pos_get_active_shifts: { active: 'Checking who is on', settled: 'Checked who is on' },
  pos_get_labor_summary: { active: 'Pulling labour numbers', settled: 'Pulled labour numbers' },
  pos_compare_periods: { active: 'Comparing to last period', settled: 'Compared to last period' },
  pos_get_top_items: { active: 'Pulling top items', settled: 'Pulled top items' },
  pos_get_payment_breakdown: { active: 'Pulling payment mix', settled: 'Pulled payment mix' },
  pos_list_refunds: { active: 'Pulling recent refunds', settled: 'Pulled recent refunds' },
  pos_get_refund_summary: { active: 'Pulling refund totals', settled: 'Pulled refund totals' },
  pos_get_hourly_breakdown: { active: 'Pulling hour-by-hour', settled: 'Pulled hour-by-hour' },
  pos_list_team_members: { active: 'Listing team members', settled: 'Listed team members' },
}

function toolLabel(name: string, state: 'active' | 'settled' = 'active'): string {
  const entry = TOOL_LABELS[name]
  if (entry) return entry[state]
  // Fallback for tools without a dedicated label — capitalise the first word
  // and snake → space the rest. Reads OK ("Running pos get sales summary")
  // but every tool deserves a proper entry above.
  const humanised = name.replace(/_/g, ' ')
  return state === 'active' ? `Running ${humanised}` : `Ran ${humanised}`
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

/// Live status line — replaces the tucked-away accordion header while a tool
/// is in flight. One borderless row under the gm avatar with a pulsing dot,
/// the human-readable active label, a typing ellipsis, and an elapsed time
/// counter once we're past two seconds. The whole line unmounts the moment
/// every tool in the chain settles, so it reads as "happening now" rather
/// than "happened". Respects prefers-reduced-motion: the ellipsis freezes
/// to a static three-dot and the dot pulse falls back to its non-animated
/// rest state (BrandDot already uses Tailwind's animate-pulse which the
/// reduced-motion media query disables at the OS level).
///
/// Implementation note: the elapsed timer starts on mount and the ellipsis
/// cycles on a 400ms JS interval, but we use `useRef` for the start time so
/// React state churn doesn't reset it when parent re-renders for unrelated
/// streaming deltas. The label prop changes as the agent moves between
/// tools mid-chain — that's a content swap on the same line, not a remount,
/// so the timer keeps running across the whole chain rather than resetting
/// per tool.
function LiveStatusLine({ label }: { label: string }) {
  const startedAtRef = useRef<number>(Date.now())
  const [tick, setTick] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 400)
    return () => clearInterval(id)
  }, [reduceMotion])

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Fixed-width three-character slot so the label text doesn't shift left/right
  // as the dot count changes. We use regular spaces here; the consumer renders
  // them inside `font-mono tabular-nums` so width stays predictable enough at
  // 13px display sizes, but accept that HTML collapses runs of spaces so the
  // visual is "label . / .. / ..." not three padded widths. Acceptable since
  // the trailing right-aligned elapsed counter has its own ml-auto anchor.
  const dotCount = reduceMotion ? 3 : Math.max(1, tick)
  const dotsText = '.'.repeat(dotCount) + ' '.repeat(3 - dotCount)
  const showElapsed = elapsedSec >= 2
  const elapsedText =
    elapsedSec < 60 ? `${elapsedSec}s` : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`

  // role="status" rather than aria-live: the parent <ol role="log"> in
  // chat-thread already declares a polite live region for the whole assistant
  // stream, so nesting another one risks double-announcement on some screen
  // readers. role="status" still surfaces this as a status node. The elapsed
  // timer span is aria-hidden so its per-second tick doesn't re-announce the
  // full row each second — the label is the only thing worth announcing.
  return (
    <div className="flex items-center gap-2.5 py-1 text-[13px] text-muted-foreground" role="status">
      <BrandDot />
      <span className="italic">
        {label}
        <span className="ml-0.5 font-mono tabular-nums" aria-hidden>
          {dotsText}
        </span>
      </span>
      {showElapsed ? (
        <span
          className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground/55"
          aria-hidden
        >
          {elapsedText}
        </span>
      ) : null}
    </div>
  )
}

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
  const inFlightChip = chips.find((c) => !c.done)
  // Settled chips only show in the expanded view for tools that DON'T have
  // their own rich card. The card itself is the visual marker — doubling up
  // (chip + card) reads as noise to a non-technical user.
  const settledChipsForStrip = chips.filter((c) => c.done && !hasToolCard(c.name))
  const erroredCount = chips.filter((c) => c.errored).length
  const hasChips = chips.length > 0
  const hasStripContent = settledChipsForStrip.length > 0
  if (!hasText && !hasChips) return null

  // While ANY tool is in flight, drop the accordion shell entirely and show
  // a single borderless live status line under the avatar — the user needs
  // to feel things happening, not hunt for it inside a collapsed pill. When
  // there's no in-flight tool but the model is still streaming reasoning
  // text, fall through to the same live line with a generic "Thinking" label
  // so the empty assistant turn doesn't sit silently. Once everything settles
  // we render the existing accordion so the user can drill back into the
  // chain if they want.
  if (inFlightChip) {
    return <LiveStatusLine label={inFlightChip.activeLabel} />
  }
  // All tools settled but the model is still streaming its final reply text —
  // keep a live line up so the turn doesn't sit visibly idle while the model
  // composes. Suppressed once the first reply token lands (hasText becomes
  // true), so the live line cleanly hands off to the streaming markdown.
  if (streaming && !hasText) {
    return <LiveStatusLine label="Thinking" />
  }
  const headerLabel = 'Thought process'
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
        {hasChips ? (
          <span className="text-[11px] font-normal text-muted-foreground/80">
            · {chips.length} {chips.length === 1 ? 'step' : 'steps'}
            {erroredCount ? ` · ${erroredCount} failed` : ''}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          )}
        </span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-3 py-2">
          {hasStripContent ? (
            <div className="flex flex-wrap gap-1.5">
              {settledChipsForStrip.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]',
                    c.errored
                      ? 'border-destructive/30 bg-destructive/5 text-destructive'
                      : 'border-border bg-background text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-1 w-1 rounded-full',
                      c.errored ? 'bg-destructive' : 'bg-muted-foreground/60',
                    )}
                  />
                  {c.settledLabel}
                </div>
              ))}
            </div>
          ) : null}
          {hasText ? (
            <div className="text-[13px] italic leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
              {text}
            </div>
          ) : null}
          {!hasStripContent && !hasText ? (
            <div className="text-[11.5px] text-muted-foreground/70">
              No prose this turn — the cards below are the answer.
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

// Tool names where calling them implies the model sourced from the knowledge
// corpus. If any of these fired this turn and the visible text has no
// [doc:<uuid>] markers, we render UncitedKbWarning so the user knows the
// answer wasn't backed by a verifiable source.
const KB_TOOL_NAMES = new Set(['find_knowledge', 'query_document_table'])

// Walks an assistant message's parts and groups retrieved section titles by
// their parent knowledge_item id (the same id the [doc:<uuid>] marker
// references). Each docId maps to a deduped, insertion-ordered list of section
// titles surfaced during the turn — typically 1-3 entries. Hits without a
// knowledge_item entityType or without a section title are skipped.
function buildSectionsByDoc(parts: UIMessage['parts']): Map<string, string[]> {
  const out = new Map<string, string[]>()
  parts.forEach((p) => {
    if (!isToolUIPart(p)) return
    if (getToolName(p) !== 'find_knowledge') return
    const output = (p as { output?: unknown }).output
    if (!output || typeof output !== 'object') return
    const wrapper = output as { ok?: boolean; data?: unknown }
    if (wrapper.ok !== true || !Array.isArray(wrapper.data)) return
    for (const raw of wrapper.data) {
      if (!raw || typeof raw !== 'object') continue
      const hit = raw as {
        entityType?: unknown
        entityId?: unknown
        metadata?: unknown
      }
      if (hit.entityType !== 'knowledge_item') continue
      if (typeof hit.entityId !== 'string' || hit.entityId.length === 0) continue
      const meta = (hit.metadata ?? {}) as { sectionTitle?: unknown }
      if (typeof meta.sectionTitle !== 'string') continue
      const title = meta.sectionTitle.trim()
      if (title.length === 0) continue
      const existing = out.get(hit.entityId)
      if (existing) {
        if (!existing.includes(title)) existing.push(title)
      } else {
        out.set(hit.entityId, [title])
      }
    }
  })
  return out
}

// True when the model called a knowledge-base tool this turn but the rendered
// answer text has zero citation markers. Used to surface UncitedKbWarning so
// the user knows the answer wasn't anchored to a verifiable source — the
// system prompt asks for citations whenever a fact comes from a KB doc.
function hasUncitedKb(parts: UIMessage['parts'], text: string): boolean {
  // Empty-text turns (user aborted mid-stream, post-answer-only tool calls,
  // record_kb_gap-style replies with no prose) have nothing to warn about —
  // the warning under an empty bubble would confuse rather than help.
  if (text.trim().length === 0) return false
  const kbCalled = parts.some((p) => isToolUIPart(p) && KB_TOOL_NAMES.has(getToolName(p)))
  if (!kbCalled) return false
  // Non-global clone so we don't carry lastIndex state from rewriteCitations.
  return !/\[doc:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/i.test(text)
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
  name: string
  /// Active label ("Pulling sales numbers") shown while the tool is in
  /// flight; the renderer appends an ellipsis. Settled state swaps in the
  /// past-tense ("Pulled sales numbers").
  activeLabel: string
  settledLabel: string
  done: boolean
  errored: boolean
}

type AssistantClassification = {
  reasoningText: string
  reasoningStreaming: boolean
  toolChips: ToolChip[]
  toolCardParts: ToolPart[]
  /// One entry per text part the model emitted, in emission order. Each
  /// becomes its own bubble. We deliberately do NOT fold any text into
  /// reasoning — the model's spoken output stays visible even when more tool
  /// calls fire after the answer (e.g. record_kb_gap firing post-answer).
  answerChunks: string[]
  /// True when the very last part in the message is a text part — used to
  /// decide whether the streaming cursor renders at the end of the last chunk.
  lastPartIsText: boolean
}

function classifyAssistantParts(
  parts: UIMessage['parts'],
  isStreaming: boolean,
): AssistantClassification {
  const lastIdx = parts.length - 1

  const toolChips: ToolChip[] = []
  parts.forEach((p, i) => {
    if (!isToolUIPart(p)) return
    const name = getToolName(p)
    toolChips.push({
      id: (p as { toolCallId?: string }).toolCallId ?? `tool-${i}`,
      name,
      activeLabel: toolLabel(name, 'active'),
      settledLabel: toolLabel(name, 'settled'),
      done: p.state === 'output-available' || p.state === 'output-error',
      errored: p.state === 'output-error',
    })
  })

  let reasoningStreaming = false
  const reasoningTextParts: string[] = []
  const answerChunks: string[] = []
  // Every text part is its own answer bubble. We don't try to be clever about
  // "interim narration" vs "answer" — that heuristic kept misclassifying real
  // answers as narration when the agent called another tool (e.g. logging a
  // KB gap) AFTER answering. Reasoning bucket only holds `reasoning`-typed
  // parts now.
  parts.forEach((p, i) => {
    if (p.type === 'reasoning') {
      const rp = p as ReasoningPart
      const isLast = i === lastIdx
      if (isStreaming && isLast && rp.state === 'streaming') reasoningStreaming = true
      const t = (rp.text ?? '').trim()
      if (t.length > 0) reasoningTextParts.push(t)
      return
    }
    if (p.type === 'text') {
      const t = stripFollowUpTail(p.text).trim()
      if (t.length === 0) return
      answerChunks.push(t)
    }
  })

  const toolCardParts: ToolPart[] = []
  parts.forEach((p) => {
    if (!isToolUIPart(p)) return
    const name = getToolName(p)
    if (!hasToolCard(name)) return
    const tp = p as unknown as ToolPart
    if (tp.state !== 'output-available' && tp.state !== 'output-error') return
    toolCardParts.push(tp)
  })

  return {
    reasoningText: reasoningTextParts.join('\n\n'),
    reasoningStreaming,
    toolChips,
    toolCardParts,
    answerChunks,
    lastPartIsText: lastIdx >= 0 && parts[lastIdx]?.type === 'text',
  }
}

/// Renders the reasoning + tool-card header for a single assistant turn. The
/// answer text itself is rendered separately by ChatMessage so that
/// multi-chunk turns can split into multiple bubbles.
function AssistantTurnHeader({
  classification,
  ctx,
}: {
  classification: AssistantClassification
  ctx: ToolCardCtx
}) {
  const { reasoningText, reasoningStreaming, toolChips, toolCardParts } = classification
  const hasReasoning = reasoningText.trim().length > 0
  const hasChips = toolChips.length > 0
  if (!hasReasoning && !hasChips && toolCardParts.length === 0) return null
  return (
    <div className="flex flex-col gap-2.5">
      <ReasoningBlock text={reasoningText} streaming={reasoningStreaming} chips={toolChips} />
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

function AssistantThinkingBridge() {
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
  const classification = classifyAssistantParts(message.parts, Boolean(isStreaming))
  const { answerChunks, toolChips, reasoningText, toolCardParts, lastPartIsText } = classification
  // Built once per message render — chips inside this message's prose look it
  // up via CitationsContext. Memoised on the parts identity to avoid rebuilds
  // when adjacent state (streaming, follow-ups) changes.
  const sectionsByDoc = useMemo(() => buildSectionsByDoc(message.parts), [message.parts])
  const showUncitedWarning = !isStreaming && hasUncitedKb(message.parts, plainText)

  // Continuity bridge — useChat pushes an empty assistant message the moment
  // the stream opens, before any reasoning / tool / text deltas arrive. Render
  // a single "Thinking" status while nothing visible has arrived yet.
  const showThinkingBridge =
    isStreaming &&
    reasoningText.trim().length === 0 &&
    toolChips.length === 0 &&
    toolCardParts.length === 0 &&
    answerChunks.length === 0

  // Unified structure across all states: an outer flex-col wrapper containing
  // 1+ <article>s. Bridge mode is its own article with its own key (one-time
  // remount when first content arrives — same as before). Otherwise we render
  // one article per answer chunk, with at least one article rendered (an
  // empty-text bubble shows reasoning/tool cards mid-stream before any text).
  // Stable keys mean a 1-chunk → 2-chunk transition appends a new article
  // without remounting the first one.
  const renderedChunks = showThinkingBridge ? [] : answerChunks.length > 0 ? answerChunks : ['']
  const lastChunkIdx = renderedChunks.length - 1

  return (
    <CitationsContext.Provider value={sectionsByDoc}>
      <div className="flex flex-col gap-6">
        {showThinkingBridge ? (
          <article
            key={`${message.id}:bridge`}
            aria-label="Assistant message"
            aria-busy="true"
            className="flex w-full gap-3"
          >
            <AssistantAvatar />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <AssistantThinkingBridge />
            </div>
          </article>
        ) : null}
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
                  <AssistantTurnHeader classification={classification} ctx={cardCtx} />
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
