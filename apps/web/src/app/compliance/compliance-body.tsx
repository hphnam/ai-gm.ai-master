'use client'

import { CircleAlert, FileText, Plus, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { type TabItem, Tabs } from '@/components/ui/tabs'
import {
  CATEGORY_LABELS,
  COMPLIANCE_CATEGORIES,
  type ComplianceCategory,
  type ExpiryRecord,
  useExpiryRecords,
  useUpdateExpiryRecord,
} from '@/lib/hooks/use-compliance'
import { useComplianceSocket } from '@/lib/hooks/use-compliance-socket'
import { cn } from '@/lib/utils'
import { AddExpiryDialog } from './add-expiry-dialog'

type Filter = 'active' | 'all' | 'dismissed'

const FILTERS: TabItem<Filter>[] = [
  { id: 'active', label: 'Active' },
  { id: 'all', label: 'All' },
  { id: 'dismissed', label: 'Dismissed' },
]

export function ComplianceBody() {
  const [filter, setFilter] = useState<Filter>('active')
  const [addOpen, setAddOpen] = useState(false)
  useComplianceSocket()
  const records = useExpiryRecords({ status: filter === 'all' ? 'all' : filter })

  const grouped = useMemo(() => groupByWindow(records.data?.records ?? []), [records.data?.records])

  return (
    <AppShell>
      <PageHeader
        title="Compliance"
        description="Cert renewals, service intervals, and insurance — the things that close a venue if you miss them."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)} className="cursor-pointer gap-1.5">
            <Plus className="h-4 w-4" />
            Add expiry
          </Button>
        }
      />

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <Tabs
            items={FILTERS}
            value={filter}
            onValueChange={setFilter}
            ariaLabel="Filter compliance records"
            trailing={
              records.data ? (
                <span className="text-xs text-muted-foreground">
                  {records.data.activeCount} active
                  {records.data.overdueCount > 0 ? ` · ${records.data.overdueCount} overdue` : ''}
                  {records.data.within30dCount > 0
                    ? ` · ${records.data.within30dCount} in next 30d`
                    : ''}
                </span>
              ) : null
            }
          />

          {records.isLoading ? (
            <ComplianceLoading />
          ) : records.data && records.data.records.length === 0 ? (
            <ComplianceEmpty onAdd={() => setAddOpen(true)} />
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.overdue.length > 0 ? (
                <RecordGroup label="Overdue" tone="danger" records={grouped.overdue} />
              ) : null}
              {grouped.within7.length > 0 ? (
                <RecordGroup label="Next 7 days" tone="warn" records={grouped.within7} />
              ) : null}
              {grouped.within30.length > 0 ? (
                <RecordGroup label="Next 30 days" records={grouped.within30} />
              ) : null}
              {grouped.within90.length > 0 ? (
                <RecordGroup label="Next 90 days" records={grouped.within90} />
              ) : null}
              {grouped.later.length > 0 ? (
                <RecordGroup label="Later" records={grouped.later} muted />
              ) : null}
              {grouped.closed.length > 0 ? (
                <RecordGroup label="Closed" records={grouped.closed} muted />
              ) : null}
            </div>
          )}
        </div>
      </div>

      <AddExpiryDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppShell>
  )
}

function ComplianceEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="Nothing on the radar yet"
      description="Upload a hygiene cert, gas safety report, or insurance renewal — the agent extracts the expiry date automatically. Or add one manually."
      action={
        <Button size="sm" onClick={onAdd} className="cursor-pointer gap-1.5">
          <Plus className="h-4 w-4" /> Add an expiry
        </Button>
      }
    />
  )
}

const COMPLIANCE_SKELETON_KEYS = ['a', 'b', 'c', 'd']

function ComplianceLoading() {
  return (
    <div className="flex flex-col gap-3">
      {COMPLIANCE_SKELETON_KEYS.map((k) => (
        <div
          key={k}
          className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 shadow-sm"
        >
          <Skeleton className="mt-0.5 h-5 w-5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function RecordGroup({
  label,
  records,
  tone,
  muted,
}: {
  label: string
  records: ExpiryRecord[]
  tone?: 'warn' | 'danger'
  muted?: boolean
}) {
  return (
    <section aria-label={label}>
      <h2
        className={cn(
          'mb-2 text-[11px] font-semibold uppercase tracking-wider',
          tone === 'danger'
            ? 'text-red-700'
            : tone === 'warn'
              ? 'text-amber-700'
              : 'text-muted-foreground',
        )}
      >
        {label}
      </h2>
      <ul className="flex flex-col gap-2">
        {records.map((r) => (
          <RecordRow key={r.id} record={r} muted={muted} tone={tone} />
        ))}
      </ul>
    </section>
  )
}

function RecordRow({
  record,
  muted,
  tone,
}: {
  record: ExpiryRecord
  muted?: boolean
  tone?: 'warn' | 'danger'
}) {
  const update = useUpdateExpiryRecord()
  const isClosed = record.status === 'dismissed' || record.status === 'renewed'
  const category =
    (record.category as ComplianceCategory) in CATEGORY_LABELS
      ? CATEGORY_LABELS[record.category as ComplianceCategory]
      : record.category

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 shadow-sm',
        tone === 'danger' && 'border-red-300/60 bg-red-50/40',
        tone === 'warn' && 'border-amber-300/60 bg-amber-50/40',
        muted && 'opacity-70',
      )}
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        {tone === 'danger' ? (
          <CircleAlert className="h-4 w-4 text-red-700" aria-hidden />
        ) : (
          <FileText
            className={cn('h-4 w-4', tone === 'warn' ? 'text-amber-700' : 'text-muted-foreground')}
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', isClosed && 'text-muted-foreground line-through')}>
          {record.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <ExpiryLabel expiresAt={record.expiresAt} closed={isClosed} />
          <span>· {category}</span>
          {record.personName ? <span>· {record.personName}</span> : null}
          {record.assetName ? <span>· {record.assetName}</span> : null}
          {record.renewalCostGbp !== null ? (
            <span>· £{record.renewalCostGbp.toFixed(2)}</span>
          ) : null}
          {record.extractionConfidence !== null && record.extractionConfidence < 0.8 ? (
            <span className="text-amber-700">· verify (auto-extracted)</span>
          ) : null}
        </div>
      </div>
      {!isClosed ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update.mutate({ id: record.id, status: 'renewed' })}
            disabled={update.isPending}
          >
            Renewed
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update.mutate({ id: record.id, status: 'dismissed' })}
            disabled={update.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => update.mutate({ id: record.id, status: 'active' })}
          disabled={update.isPending}
        >
          Reopen
        </Button>
      )}
    </li>
  )
}

function ExpiryLabel({ expiresAt, closed }: { expiresAt: string; closed: boolean }) {
  const ts = new Date(expiresAt).getTime()
  const now = Date.now()
  const diffMs = ts - now
  const day = 24 * 60 * 60 * 1000
  const overdue = !closed && diffMs < 0
  const absDays = Math.max(1, Math.round(Math.abs(diffMs) / day))
  const dateLabel = new Date(expiresAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  if (overdue)
    return (
      <span className="text-red-700">
        overdue {absDays}d · {dateLabel}
      </span>
    )
  if (diffMs < 7 * day)
    return (
      <span className="text-amber-700">
        in {absDays}d · {dateLabel}
      </span>
    )
  return <span>{dateLabel}</span>
}

function groupByWindow(records: ExpiryRecord[]) {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const overdue: ExpiryRecord[] = []
  const within7: ExpiryRecord[] = []
  const within30: ExpiryRecord[] = []
  const within90: ExpiryRecord[] = []
  const later: ExpiryRecord[] = []
  const closed: ExpiryRecord[] = []
  for (const r of records) {
    if (r.status === 'dismissed' || r.status === 'renewed') {
      closed.push(r)
      continue
    }
    const diff = new Date(r.expiresAt).getTime() - now
    if (diff < 0) overdue.push(r)
    else if (diff < 7 * day) within7.push(r)
    else if (diff < 30 * day) within30.push(r)
    else if (diff < 90 * day) within90.push(r)
    else later.push(r)
  }
  return { overdue, within7, within30, within90, later, closed }
}

export { COMPLIANCE_CATEGORIES }
