'use client'

import { ExternalLink, FileBarChart } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { CardEmpty, CardShell } from './card-shell'
import { type BarRow, BarSection, type Kpi, KpiGroupSection, TableSection } from './report-sections'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

// Mirror of the shared ReportSpec types in apps/api/src/types/reports.ts.
// Duplicated here intentionally to avoid coupling the web app to the api
// package — the contract is the JSON shape, validated by Zod on the server.

type Section =
  | { type: 'text'; body: string }
  | { type: 'kpi'; kpi: Kpi }
  | { type: 'kpiGroup'; title?: string; kpis: Kpi[] }
  | { type: 'bar'; title?: string; caption?: string; rows: BarRow[]; unit?: string }
  | { type: 'table'; title?: string; columns: string[]; rows: Array<Array<string | number | null>> }
  | { type: 'divider'; label?: string }

type Spec = {
  version?: number
  rangeFromIso?: string
  rangeToIso?: string
  sections: Section[]
}

type ReportData = {
  id: string
  title: string
  summary: string | null
  venueId: string | null
  spec: Spec
  createdAt: string
  url: string
}

function fmtRange(fromIso?: string, toIso?: string): string | null {
  if (!fromIso) return null
  const from = new Date(fromIso)
  const to = toIso ? new Date(toIso) : null
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (!to) return from.toLocaleDateString(undefined, opts)
  return `${from.toLocaleDateString(undefined, opts)} → ${to.toLocaleDateString(undefined, opts)}`
}

export function ReportCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={FileBarChart} title="Report">
        <CardEmpty
          message={
            output.detail === 'venue-not-in-org'
              ? "I couldn't save that report — venue not found in your org."
              : (output.detail ?? "Couldn't generate that report.")
          }
        />
      </CardShell>
    )
  }
  if (!isToolOk<ReportData>(output)) return null
  return <ReportSurface data={output.data} compact={false} />
}

/// Standalone surface — used by both the chat tool-card and the /reports/:id
/// page. `compact` shrinks padding for the chat surface; the standalone page
/// gets the roomier layout.
export function ReportSurface({ data, compact = true }: { data: ReportData; compact?: boolean }) {
  const range = fmtRange(data.spec.rangeFromIso, data.spec.rangeToIso)
  return (
    <CardShell icon={FileBarChart} title={data.title} subtitle={data.summary ?? range ?? undefined}>
      <div className={cn('flex flex-col', compact ? 'gap-3' : 'gap-5')}>
        {data.spec.sections.map((section, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: sections are an immutable rendered list from a frozen spec
          <SectionRenderer key={`section-${i}`} section={section} />
        ))}
        {compact ? (
          <div className="mt-1 flex items-center justify-end border-t border-[var(--hairline-soft)] pt-3">
            <Link
              href={data.url}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-[var(--brass)] px-3 py-1.5 text-xs font-semibold text-[var(--cream-hi)] shadow-[0_2px_0_var(--brass-shadow)] transition-colors hover:bg-[var(--brass-shadow)] active:translate-y-px"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Open full report
            </Link>
          </div>
        ) : null}
      </div>
    </CardShell>
  )
}

function SectionRenderer({ section }: { section: Section }) {
  switch (section.type) {
    case 'text':
      return <TextSection body={section.body} />
    case 'kpi':
      return <KpiGroupSection kpis={[section.kpi]} />
    case 'kpiGroup':
      return <KpiGroupSection title={section.title} kpis={section.kpis} />
    case 'bar':
      return (
        <BarSection
          title={section.title}
          caption={section.caption}
          rows={section.rows}
          unit={section.unit}
        />
      )
    case 'table':
      return <TableSection title={section.title} columns={section.columns} rows={section.rows} />
    case 'divider':
      return <DividerSection label={section.label} />
    default:
      return null
  }
}

function TextSection({ body }: { body: string }) {
  return (
    <div className="text-[13.5px] leading-relaxed text-[var(--ink-text)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}

function DividerSection({ label }: { label?: string }) {
  if (!label) return <hr className="border-[var(--hairline-soft)]" />
  return (
    <div className="flex items-center gap-3">
      <hr className="flex-1 border-[var(--hairline-soft)]" />
      <span className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mono-muted)]">
        {label}
      </span>
      <hr className="flex-1 border-[var(--hairline-soft)]" />
    </div>
  )
}
