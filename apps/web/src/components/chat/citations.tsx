'use client'

import { getToolName, isToolUIPart, type UIMessage } from 'ai'
import { createContext, useContext } from 'react'
import { DocPreview } from '@/components/docs/doc-preview'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDoc } from '@/lib/hooks/use-docs'

// Sections that find_knowledge retrieved this turn, grouped by docId. Lets the
// CitationTooltipBody surface "which section of this doc the model was reading
// when it wrote this answer" without changing the [doc:<uuid>] marker contract.
// Built once per assistant message from message.parts; consumed by chips
// rendered inside that message's prose.
export type SectionsByDoc = ReadonlyMap<string, readonly string[]>
export const CitationsContext = createContext<SectionsByDoc>(new Map())

// Tight UUID gate before the chip mounts. Belt-and-braces for defence-in-depth:
// rewriteCitations only emits valid UUIDs into /docs/, but the link renderer
// also matches any Markdown link with that prefix. If the model ever emits a
// raw [text](/docs/anything-else) we fall through to the external-link branch
// instead of passing unvalidated text to useDoc.
export const DOC_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
export const KB_TOOL_NAMES = new Set(['find_knowledge', 'query_document_table'])

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
export function CitationChip({ docId, children }: { docId: string; children: React.ReactNode }) {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="View source document"
              className="mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded-[4px] border border-[rgba(143,107,31,0.35)] bg-[rgba(143,107,31,0.08)] px-1 align-[-0.15em] font-mono-ledger text-[11px] font-medium leading-none tracking-tight text-[var(--brass)] transition-colors hover:bg-[var(--brass)] hover:text-[var(--cream-hi)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass)]"
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
      <span className="font-mono-ledger text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--mono-muted)]">
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
          <span className="font-mono-ledger text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--mono-muted)]">
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

// Walks an assistant message's parts and groups retrieved section titles by
// their parent knowledge_item id (the same id the [doc:<uuid>] marker
// references). Each docId maps to a deduped, insertion-ordered list of section
// titles surfaced during the turn — typically 1-3 entries. Hits without a
// knowledge_item entityType or without a section title are skipped.
export function buildSectionsByDoc(parts: UIMessage['parts']): Map<string, string[]> {
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
export function hasUncitedKb(parts: UIMessage['parts'], text: string): boolean {
  // Empty-text turns (user aborted mid-stream, post-answer-only tool calls,
  // record_kb_gap-style replies with no prose) have nothing to warn about —
  // the warning under an empty bubble would confuse rather than help.
  if (text.trim().length === 0) return false
  const kbCalled = parts.some((p) => isToolUIPart(p) && KB_TOOL_NAMES.has(getToolName(p)))
  if (!kbCalled) return false
  // Non-global clone so we don't carry lastIndex state from rewriteCitations.
  return !/\[doc:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]/i.test(text)
}

// True when a KB tool ran this turn but its result envelope reports an infra
// failure (reason:'error') rather than a genuine empty (reason:'no-data'). The
// dispatcher/retrieval layer stamps reason:'error' only when embeddings or
// Postgres were unreachable, so this cleanly separates "the KB was down" from
// "we have no doc on file". Survives reload — the persisted tool result is
// rehydrated as the part's output (message-mapping.ts).
export function hasKbRetrievalError(parts: UIMessage['parts']): boolean {
  return parts.some((p) => {
    if (!isToolUIPart(p) || !KB_TOOL_NAMES.has(getToolName(p))) return false
    const output = (p as { output?: unknown }).output
    if (!output || typeof output !== 'object') return false
    const env = output as { ok?: unknown; reason?: unknown; detail?: unknown }
    // Match the specific infra-outage detail, not any reason:'error' — keeps a
    // future tabular query-level error from misfiring the "KB unreachable" banner.
    return env.ok === false && env.reason === 'error' && env.detail === 'retrieval-unavailable'
  })
}

export function rewriteCitations(raw: string): string {
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
