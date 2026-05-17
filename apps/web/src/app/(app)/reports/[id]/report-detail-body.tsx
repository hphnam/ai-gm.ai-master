'use client'

import { Copy, Download, Loader2, Printer, RefreshCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ReportSurface } from '@/components/chat/tool-cards/report-card'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { Alert } from '@/components/ui/alert'
import { BackLink } from '@/components/ui/back-link'
import { ConfirmDeleteDialog, DeleteButton } from '@/components/ui/confirm-delete-dialog'
import { ApiError } from '@/lib/api-client'
import { type Report, useDeleteReport, useReport } from '@/lib/hooks/use-reports'
import { cn } from '@/lib/utils'

function errorCopy(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'Report not found.'
    if (err.status === 422) return 'This report is no longer renderable.'
    if (err.status === 401 || err.status === 403) return 'You do not have access to this report.'
  }
  return "Couldn't load the report."
}

export function ReportDetailBody({ id }: { id: string }) {
  const { data, isLoading, isError, error } = useReport(id)

  return (
    <AppShell>
      <PageHeader
        title={data?.title ?? 'Report'}
        actions={data ? <ExportMenu report={data} /> : null}
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div id="report-print-root" className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <BackLink href="/reports" className="mb-4 print:hidden">
            All reports
          </BackLink>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Pulling the report…
            </div>
          ) : isError ? (
            <Alert variant="destructive">{errorCopy(error)}</Alert>
          ) : data ? (
            <>
              <ReportSurface
                data={{
                  id: data.id,
                  title: data.title,
                  summary: data.summary,
                  venueId: data.venueId,
                  spec: data.spec,
                  createdAt: data.createdAt,
                  url: `/reports/${data.id}`,
                }}
                compact={false}
              />
              {data.createdByName ? (
                <p className="mt-4 text-[12px] text-muted-foreground">
                  Created by {data.createdByName} ·{' '}
                  {new Date(data.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              ) : null}
              <ReportFooterActions report={data} />
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}

function ReportFooterActions({ report }: { report: Report }) {
  const router = useRouter()
  const del = useDeleteReport()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleRerun = () => {
    // Stash the prefill on session storage so the /chat redirect → mint
    // conv → composer flow can pick it up without relying on URL params
    // (the chat-body's auto-mint replaces ?prompt= away).
    const prefill = buildRerunPrefill(report)
    try {
      window.sessionStorage.setItem('chat:prefill', prefill)
    } catch {
      // sessionStorage blocked — fall through; user will land in a blank
      // composer but at least the page transitions.
    }
    const venueQs = report.venueId ? `?venue=${report.venueId}` : ''
    router.push(`/chat${venueQs}`)
  }

  return (
    <>
      {/* The print stylesheet hides the wrapping flex container so these
          buttons don't appear in the printed/PDF output. */}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4 print:hidden">
        <button
          type="button"
          onClick={handleRerun}
          title="Opens chat with a prefilled prompt to regenerate this report with fresh data. The original stays put."
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/85 transition-colors hover:bg-accent"
        >
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
          Re-run in chat
        </button>
        <DeleteButton
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          label="Delete report"
        />
      </div>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this report?"
        description={
          <>
            &ldquo;{report.title}&rdquo; will be permanently removed. The permalink will stop
            working and anyone with the link will see a not-found page.
          </>
        }
        onConfirm={async () => {
          await del.mutateAsync(report.id)
          router.push('/reports')
        }}
        isPending={del.isPending}
      />
    </>
  )
}

function ExportMenu({ report }: { report: Report }) {
  const [copied, setCopied] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleCopy = async () => {
    const md = reportToMarkdown(report)
    try {
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked — fall through silently.
    }
  }

  const handleDownloadCsv = () => {
    const csv = reportTablesToCsv(report)
    if (!csv) return
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(report.title) || 'report'}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const hasTable = report.spec.sections.some((s) => s.type === 'table' || s.type === 'bar')

  return (
    <div className="flex items-center gap-1">
      <IconButton onClick={handleCopy} title="Copy as Markdown" label={copied ? 'Copied' : 'Copy'}>
        <Copy className="h-3.5 w-3.5" aria-hidden />
      </IconButton>
      <IconButton
        onClick={handleDownloadCsv}
        title="Download tables and bars as CSV"
        label="CSV"
        disabled={!hasTable}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
      </IconButton>
      <IconButton onClick={handlePrint} title="Print or save as PDF" label="Print">
        <Printer className="h-3.5 w-3.5" aria-hidden />
      </IconButton>
    </div>
  )
}

function IconButton({
  onClick,
  title,
  label,
  disabled,
  children,
}: {
  onClick: () => void
  title: string
  label: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-accent',
      )}
    >
      {children}
      {label}
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildRerunPrefill(report: Report): string {
  // The agent reads this verbatim in the chat composer. We give it enough
  // context to regenerate a similar report without re-asking for the same
  // intent. The user can edit before sending.
  const parts: string[] = []
  parts.push(`Re-run this report with fresh data: "${report.title}".`)
  if (report.summary) parts.push(`Original summary: ${report.summary}`)
  const range =
    report.spec.rangeFromIso || report.spec.rangeToIso
      ? `Original range: ${report.spec.rangeFromIso ?? '?'} → ${report.spec.rangeToIso ?? '?'}.`
      : ''
  if (range) parts.push(range)
  parts.push(
    'Use the same structure (KPIs, charts, tables) but pull the latest numbers. Build a new generate_report.',
  )
  return parts.join('\n\n')
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

function fmtKpiValue(v: unknown): string {
  if (v && typeof v === 'object' && 'value' in v) {
    const m = v as { value: number; currency: string | null }
    const sym =
      m.currency === 'GBP' ? '£' : m.currency === 'USD' ? '$' : m.currency === 'EUR' ? '€' : ''
    return `${m.value < 0 ? '-' : ''}${sym}${Math.abs(m.value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  if (typeof v === 'number') return v.toLocaleString()
  return String(v ?? '')
}

function reportToMarkdown(report: Report): string {
  const lines: string[] = []
  lines.push(`# ${report.title}`)
  if (report.summary) lines.push('', report.summary)
  lines.push(
    '',
    `_Created ${new Date(report.createdAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })}_`,
  )
  for (const section of report.spec.sections) {
    lines.push('')
    if (section.type === 'text') {
      lines.push(section.body)
    } else if (section.type === 'kpi') {
      lines.push(`**${section.kpi.label}**: ${fmtKpiValue(section.kpi.value)}`)
    } else if (section.type === 'kpiGroup') {
      if (section.title) lines.push(`## ${section.title}`)
      for (const k of section.kpis) {
        lines.push(`- **${k.label}**: ${fmtKpiValue(k.value)}`)
      }
    } else if (section.type === 'bar') {
      if (section.title) lines.push(`## ${section.title}`)
      if (section.caption) lines.push(section.caption)
      for (const r of section.rows) {
        lines.push(`- ${r.label}: ${r.value.toLocaleString()}${section.unit ?? ''}`)
      }
    } else if (section.type === 'table') {
      if (section.title) lines.push(`## ${section.title}`)
      lines.push(`| ${section.columns.join(' | ')} |`)
      lines.push(`| ${section.columns.map(() => '---').join(' | ')} |`)
      for (const row of section.rows) {
        lines.push(`| ${row.map((c) => (c === null ? '—' : String(c))).join(' | ')} |`)
      }
    } else if (section.type === 'divider' && section.label) {
      lines.push(`### ${section.label}`)
    }
  }
  lines.push('', `Permalink: ${window.location.origin}/reports/${report.id}`)
  return lines.join('\n')
}

function reportTablesToCsv(report: Report): string {
  const parts: string[] = []
  for (const section of report.spec.sections) {
    if (section.type === 'table') {
      if (section.title) parts.push(`# ${section.title}`)
      parts.push(section.columns.map(csvCell).join(','))
      for (const row of section.rows) {
        parts.push(row.map((c) => csvCell(c == null ? '' : c)).join(','))
      }
      parts.push('')
    } else if (section.type === 'bar') {
      if (section.title) parts.push(`# ${section.title}`)
      parts.push(['label', 'value'].map(csvCell).join(','))
      for (const row of section.rows) {
        parts.push([csvCell(row.label), csvCell(row.value)].join(','))
      }
      parts.push('')
    }
  }
  return parts.join('\n').trim()
}

function csvCell(v: unknown): string {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
