'use client'

import { ArrowRight, ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useInbox } from '@/components/shell/inbox-provider'
import { PageContainer } from '@/components/ui/page-container'
import { useSession } from '@/lib/auth-client'
import { useExpiryCounts } from '@/lib/hooks/use-compliance'
import { useCurrentMember } from '@/lib/hooks/use-current-member'
import {
  type GroupDailySummary,
  useDailySummary,
  useDailySummaryGroup,
  type VenueDailySummary,
} from '@/lib/hooks/use-daily-summary'
import { useOpenIncidentsCount } from '@/lib/hooks/use-incidents'
import { useUnreadNotificationsCount } from '@/lib/hooks/use-notifications'
import { useOpenTasksCount } from '@/lib/hooks/use-tasks'
import { useVenues } from '@/lib/hooks/use-venues'
import { cn } from '@/lib/utils'

export function TodayBody() {
  const router = useRouter()
  const { openInbox } = useInbox()
  const { isOwner, isManager, isStaff, isLoading } = useCurrentMember()

  // Staff have no Today tab; if one lands here by URL, send them to Ask.
  useEffect(() => {
    if (!isLoading && isStaff) router.replace('/chat')
  }, [isLoading, isStaff, router])

  const { data: session } = useSession()
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? 'there'

  const { data: venues } = useVenues()
  const params = useSearchParams()
  const venueId = params.get('venue') ?? venues?.[0]?.id ?? null

  // Managers see one venue; owners see the group roll-up; staff neither (they're
  // redirected). `isManager` is true for owners too, so gate with `&& !isOwner`.
  const venueSummary = useDailySummary(venueId, !isLoading && isManager && !isOwner)
  const groupSummary = useDailySummaryGroup(!isLoading && isOwner)

  const kpi = isOwner ? fromGroup(groupSummary.data ?? null) : fromVenue(venueSummary.data ?? null)

  if (isStaff) return null

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <PageContainer width="prose" className="pb-10">
        <p className="mb-2.5 font-mono-ledger text-[11px] font-semibold uppercase tracking-[1.6px] text-[var(--mono-muted)]">
          {formatToday()}
        </p>
        <h1 className="font-news text-[30px] leading-[1.12] font-normal tracking-[-0.01em] text-[var(--ink-text)]">
          {greeting()}, {firstName}.
        </h1>
        <p className="mt-1.5 mb-6 max-w-prose text-[14.5px] leading-[1.62] text-[var(--ink-muted)]">
          {summaryLine(kpi)}
        </p>

        <KpiRow kpi={kpi} />

        <NeedsYou onOpenAlerts={() => openInbox()} />

        {isOwner ? <VenueBreakdown data={groupSummary.data ?? null} /> : null}

        <button
          type="button"
          onClick={() => router.push(venueId ? `/chat?venue=${venueId}` : '/chat')}
          className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-dashed border-[var(--brass)]/55 bg-[var(--paper-2)] px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
        >
          <span className="flex-1 text-[14px] font-medium text-[var(--ink-muted)]">
            Ask AI‑GM about today…
          </span>
          <ArrowRight className="h-4 w-4 text-[var(--brass)]" aria-hidden />
        </button>
      </PageContainer>
    </div>
  )
}

// ── KPI view model ──────────────────────────────────────────────────────────

type Kpi = {
  currency: string | null
  netSales: number | null
  gpPct: number | null
  gpDelta: number | null
  labourPct: number | null
  labourDelta: number | null
  connected: boolean
  netLabel: string
}

function fromVenue(v: VenueDailySummary | null): Kpi {
  return {
    currency: v?.currency ?? null,
    netSales: v?.netSales ?? null,
    gpPct: v?.gpPct ?? null,
    gpDelta: v?.gpDeltaPts ?? null,
    labourPct: v?.labourPct ?? null,
    labourDelta: v?.labourDeltaPts ?? null,
    connected: v?.connected ?? false,
    netLabel: 'Net sales',
  }
}

function fromGroup(g: GroupDailySummary | null): Kpi {
  return {
    currency: g?.currency ?? null,
    netSales: g?.group.netSales ?? null,
    gpPct: g?.group.gpPct ?? null,
    gpDelta: g?.group.gpDeltaPts ?? null,
    labourPct: g?.group.labourPct ?? null,
    labourDelta: null,
    connected: (g?.venues ?? []).some((v) => v.connected),
    netLabel: 'Group net sales',
  }
}

function KpiRow({ kpi }: { kpi: Kpi }) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-[14px] border border-[var(--hairline)] bg-[var(--hairline)]">
      <KpiTile
        label="GP"
        value={kpi.gpPct === null ? null : `${kpi.gpPct.toFixed(1)}%`}
        delta={kpi.gpDelta === null ? null : `${signed(kpi.gpDelta)} pts`}
        good={kpi.gpDelta === null ? undefined : kpi.gpDelta >= 0}
      />
      <KpiTile label={kpi.netLabel} value={formatMoney(kpi.netSales, kpi.currency)} delta={null} />
      <KpiTile
        label="Labour"
        value={kpi.labourPct === null ? null : `${kpi.labourPct.toFixed(1)}%`}
        delta={kpi.labourDelta === null ? null : `${signed(kpi.labourDelta)} pts`}
        // Lower labour is better — a negative delta is the good direction.
        good={kpi.labourDelta === null ? undefined : kpi.labourDelta <= 0}
      />
    </div>
  )
}

function KpiTile({
  label,
  value,
  delta,
  good,
}: {
  label: string
  value: string | null
  delta: string | null
  good?: boolean
}) {
  return (
    <div className="bg-[var(--ledger-card)] px-3 py-3.5">
      <div className="mb-2 text-[10px] font-medium text-[var(--mono-muted)]">{label}</div>
      <div className="font-mono-ledger text-[18px] font-semibold leading-none text-[var(--ink-text)]">
        {value ?? '—'}
      </div>
      <div
        className={cn(
          'mt-1.5 font-mono-ledger text-[10px] leading-none',
          good === undefined
            ? 'text-[var(--mono-muted)]'
            : good
              ? 'text-[var(--ledger-green)]'
              : 'text-[var(--clay)]',
        )}
      >
        {value === null ? 'No Square data' : (delta ?? '·')}
      </div>
    </div>
  )
}

// ── Needs you ───────────────────────────────────────────────────────────────

type NeedItem = { key: string; dot: string; title: string; detail: string; onClick: () => void }

function NeedsYou({ onOpenAlerts }: { onOpenAlerts: () => void }) {
  const router = useRouter()
  const tasks = useOpenTasksCount().data
  const incidents = useOpenIncidentsCount().data
  const expiry = useExpiryCounts().data
  const unread = useUnreadNotificationsCount().data?.count ?? 0

  const items: NeedItem[] = []
  if ((tasks?.overdueCount ?? 0) > 0) {
    items.push({
      key: 'tasks',
      dot: 'var(--clay)',
      title: plural(tasks?.overdueCount ?? 0, 'task', 'tasks') + ' overdue',
      detail: 'Past their due time',
      onClick: () => router.push('/tasks?status=open'),
    })
  }
  if ((incidents?.openCount ?? 0) > 0) {
    items.push({
      key: 'incidents',
      dot: (incidents?.criticalOpenCount ?? 0) > 0 ? 'var(--clay)' : 'var(--brass)',
      title: plural(incidents?.openCount ?? 0, 'incident', 'incidents') + ' open',
      detail: 'Needs review or sign-off',
      onClick: () => router.push('/incidents'),
    })
  }
  const expiringSoon = (expiry?.overdueCount ?? 0) + (expiry?.within30dCount ?? 0)
  if (expiringSoon > 0) {
    items.push({
      key: 'compliance',
      dot: (expiry?.overdueCount ?? 0) > 0 ? 'var(--clay)' : 'var(--brass)',
      title: plural(expiringSoon, 'cert', 'certs') + ' expiring',
      detail: (expiry?.overdueCount ?? 0) > 0 ? 'Some already overdue' : 'Within 30 days',
      onClick: () => router.push('/compliance'),
    })
  }
  if (unread > 0) {
    items.push({
      key: 'alerts',
      dot: 'var(--cream-mid)',
      title: plural(unread, 'unread alert', 'unread alerts'),
      detail: 'Reports, compliance and team notes',
      onClick: onOpenAlerts,
    })
  }

  return (
    <div className="mb-6">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono-ledger text-[10px] font-bold uppercase tracking-[1.6px] text-[var(--mono-muted)]">
          Needs you
        </span>
        <span className="font-mono-ledger text-[10px] text-[var(--mono-muted)]">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--hairline)] bg-[var(--ledger-card)] px-4 py-5 text-center text-[13px] text-[var(--mono-muted)]">
          You're all caught up.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={n.onClick}
              className="flex w-full cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--hairline)] bg-[var(--ledger-card)] px-4 py-3.5 text-left active:bg-[var(--paper-2)]"
            >
              <span
                className="mt-1 h-2 w-2 flex-none rounded-full"
                style={{ background: n.dot }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-[1.3] text-[var(--ink-text)]">
                  {n.title}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-[var(--ink-muted)]">
                  {n.detail}
                </span>
              </span>
              <ChevronRight
                className="mt-1 h-[13px] w-[13px] flex-none text-[var(--cream-mid)]"
                aria-hidden
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Owner: per-venue GP ─────────────────────────────────────────────────────

function VenueBreakdown({ data }: { data: GroupDailySummary | null }) {
  const venues = data?.venues ?? []
  if (venues.length === 0) return null
  return (
    <div className="mb-6">
      <span className="mb-2.5 block font-mono-ledger text-[10px] font-bold uppercase tracking-[1.6px] text-[var(--mono-muted)]">
        GP by venue · yesterday
      </span>
      <div className="overflow-hidden rounded-[14px] border border-[var(--hairline)] bg-[var(--ledger-card)]">
        {venues.map((v, i) => (
          <div
            key={v.venueId}
            className={cn(
              'flex items-center justify-between px-4 py-3.5',
              i < venues.length - 1 && 'border-b border-[var(--hairline-soft)]',
            )}
          >
            <span className="truncate text-[13.5px] font-medium text-[var(--ink-text)]">
              {v.venueName}
            </span>
            <span className="font-mono-ledger text-[13.5px] font-semibold text-[var(--ink-text)]">
              {v.gpPct === null ? '—' : `${v.gpPct.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 18) return 'Afternoon'
  return 'Evening'
}

function formatToday(): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

function summaryLine(kpi: Kpi): string {
  if (!kpi.connected) {
    return 'Connect Square in Settings to see yesterday’s GP, sales and labour here.'
  }
  if (kpi.gpPct !== null && kpi.netSales !== null) {
    return `Yesterday: ${kpi.gpPct.toFixed(1)}% GP on ${formatMoney(kpi.netSales, kpi.currency)} net sales.`
  }
  if (kpi.netSales !== null) {
    return `Yesterday’s net sales were ${formatMoney(kpi.netSales, kpi.currency)}. Add item costs in Square to unlock GP.`
  }
  return 'Here’s your day at a glance.'
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function formatMoney(value: number | null, currency: string | null): string | null {
  if (value === null) return null
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency ?? 'GBP',
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value)
  } catch {
    return `${currency ?? ''}${value.toFixed(0)}`
  }
}
