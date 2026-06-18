'use client'

import {
  AlertCircle,
  AlertTriangle,
  Brain,
  CheckSquare,
  Clock,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { SearchOutcomesChart } from '@/components/dashboard/charts/search-outcomes-chart'
import { WauChart } from '@/components/dashboard/charts/wau-chart'
import {
  formatCompact,
  formatGbpFromCents,
  formatHours,
  formatPercent,
  formatRelativeDays,
} from '@/components/dashboard/format'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { type RankItem, RankList } from '@/components/dashboard/rank-list'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RANGE_PRESETS,
  type RangePreset,
  useActiveStaff,
  useDashboardRange,
  useEscalations,
  useHoursRecovered,
  useNoDataQueries,
  useRecentEscalations,
  useSearchOutcomes,
  useTopQuestions,
  useVenueWau,
} from '@/lib/hooks/use-dashboard'
import { useVenues } from '@/lib/hooks/use-venues'

const ALL_VENUES = 'all'

export function DashboardBody() {
  const [preset, setPreset] = useState<RangePreset>('30d')
  const { from, to } = useDashboardRange(preset)
  const venues = useVenues()
  const [scope, setScope] = useState<string>(ALL_VENUES)
  const venueId = scope === ALL_VENUES ? undefined : scope
  const range = useMemo(() => ({ venueId, from, to }), [venueId, from, to])

  const hours = useHoursRecovered(range)
  const escalations = useEscalations(range)
  const outcomes = useSearchOutcomes(range)
  const noData = useNoDataQueries(range, 8)
  const topQuestions = useTopQuestions(range, 8)
  const recentEsc = useRecentEscalations(range, 8)
  const activeStaff = useActiveStaff(range, 8)
  // WAU needs a single venue. When the user has "All venues" selected we
  // auto-pick the first available one as a sensible default — they can flip
  // venues to refine.
  const wauVenueId = venueId ?? venues.data?.[0]?.id
  const wau = useVenueWau(wauVenueId)

  const isAuthError = isForbidden(
    hours.error,
    escalations.error,
    outcomes.error,
    noData.error,
    topQuestions.error,
    recentEsc.error,
    activeStaff.error,
  )

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description={`Operational impact at a glance — ${RANGE_PRESETS[preset].label.toLowerCase()}.`}
        actions={
          <div className="flex items-center gap-2">
            <RangePresetPicker value={preset} onChange={setPreset} />
            <VenueScopePicker
              value={scope}
              onChange={setScope}
              venues={venues.data ?? []}
              disabled={venues.isLoading}
            />
          </div>
        }
      />

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {isAuthError ? (
            <Card>
              <CardContent className="p-10">
                <EmptyState
                  icon={ShieldCheck}
                  title="Dashboard is restricted"
                  description="Only owners and managers can view operational analytics. Ask your owner for a role upgrade if you need access."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <KpiStrip
                hoursRecovered={hours.data?.hoursSaved ?? 0}
                valueGbpCents={hours.data?.valueGbpCents ?? 0}
                queries={hours.data?.queriesCount ?? 0}
                resolutionRate={escalations.data?.totals?.resolutionRate ?? 0}
                isLoading={hours.isLoading || escalations.isLoading}
              />

              <PanelCard
                title="Search outcomes"
                description="Daily breakdown of staff queries — answered, no-data, or errored."
                icon={Search}
              >
                {outcomes.isLoading ? (
                  <ChartSkeleton />
                ) : outcomes.data && outcomes.data.buckets.length > 0 ? (
                  <SearchOutcomesChart buckets={outcomes.data.buckets} />
                ) : (
                  <EmptyChart label="No search activity in this window yet." />
                )}
              </PanelCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <PanelCard
                  title="Top knowledge gaps"
                  description="Questions staff asked that the AI couldn't answer."
                  icon={AlertCircle}
                >
                  <RankList
                    isLoading={noData.isLoading}
                    tone="warning"
                    emptyLabel="Nothing unanswered — knowledge base is keeping up."
                    items={(noData.data?.items ?? []).map(
                      (it): RankItem => ({
                        key: it.query,
                        weight: it.count,
                        primary: it.query,
                        trailing: (
                          <>
                            {it.count}
                            <span className="ml-1">· {formatRelativeDays(it.lastSeen)}</span>
                          </>
                        ),
                      }),
                    )}
                  />
                </PanelCard>

                <PanelCard
                  title="Top questions asked"
                  description="What your team actually relies on the AI for."
                  icon={Sparkles}
                >
                  <RankList
                    isLoading={topQuestions.isLoading}
                    tone="positive"
                    emptyLabel="No questions answered in this window yet."
                    items={(topQuestions.data?.items ?? []).map(
                      (it): RankItem => ({
                        key: it.query,
                        weight: it.count,
                        primary: it.query,
                        trailing: (
                          <>
                            {it.count}
                            <span className="ml-1">· {formatRelativeDays(it.lastSeen)}</span>
                          </>
                        ),
                      }),
                    )}
                  />
                </PanelCard>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <PanelCard
                  title="Recent escalations"
                  description="When the AI handed off to a human — and to whom."
                  icon={AlertTriangle}
                >
                  <RankList
                    isLoading={recentEsc.isLoading}
                    tone="warning"
                    loadingRows={4}
                    showBar={false}
                    emptyLabel="No escalations in this window — the AI handled everything."
                    items={(recentEsc.data?.items ?? []).map(
                      (e): RankItem => ({
                        key: e.messageId,
                        // No magnitude here — list is recency-sorted. Bar is
                        // suppressed via showBar={false} above; weight is a
                        // no-op but must be present to satisfy the type.
                        weight: 1,
                        // Click-through: incidents are first-class on the
                        // /incidents triage page so they go there (the list
                        // view filters by status — the manager lands on the
                        // open queue). Tasks + notes route back to the source
                        // conversation, which is the natural context for the
                        // handoff. Falls back to /chat without conv if the
                        // conversation id is missing (defensive — shouldn't
                        // happen as escalations originate from chat turns).
                        href:
                          e.escalationKind === 'incident'
                            ? '/incidents'
                            : e.conversationId
                              ? `/chat?venue=${e.venueId}&conv=${e.conversationId}`
                              : undefined,
                        primary: (
                          <span className="flex items-center gap-2">
                            <EscalationKindBadge kind={e.escalationKind} />
                            <span className="text-foreground">
                              {e.staffName ?? 'WhatsApp guest'}
                            </span>
                            <span className="text-muted-foreground">at</span>
                            <span className="text-muted-foreground">{e.venueName}</span>
                          </span>
                        ),
                        secondary: e.escalatedToName
                          ? `Routed to ${e.escalatedToName}`
                          : 'Routed to duty manager',
                        trailing: formatRelativeDays(e.escalatedAt),
                      }),
                    )}
                  />
                </PanelCard>

                <PanelCard
                  title="Most active staff"
                  description="Who's leaning on the AI in this window."
                  icon={Users}
                >
                  <RankList
                    isLoading={activeStaff.isLoading}
                    tone="positive"
                    loadingRows={4}
                    emptyLabel="No staff activity recorded yet."
                    items={(activeStaff.data?.items ?? []).map(
                      (s): RankItem => ({
                        key: s.userId,
                        weight: s.count,
                        primary: s.name ?? s.email ?? 'Unknown user',
                        secondary: s.role ? (
                          <span className="capitalize">{s.role}</span>
                        ) : undefined,
                        trailing: (
                          <>
                            {s.count}
                            <span className="ml-1">· {formatRelativeDays(s.lastSeen)}</span>
                          </>
                        ),
                      }),
                    )}
                  />
                </PanelCard>
              </div>

              <PanelCard
                title="Weekly active staff"
                description={
                  wauVenueId
                    ? (venueName(venues.data, wauVenueId) ?? 'Per-venue activity over 12 weeks.')
                    : 'Add a venue to start tracking staff adoption.'
                }
                icon={Users}
              >
                {wau.isLoading || !wauVenueId ? (
                  <ChartSkeleton />
                ) : wau.data && wau.data.weeks.length > 0 ? (
                  <WauChart weeks={wau.data.weeks} />
                ) : (
                  <EmptyChart label="No staff activity recorded yet." />
                )}
              </PanelCard>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function KpiStrip({
  hoursRecovered,
  valueGbpCents,
  queries,
  resolutionRate,
  isLoading,
}: {
  hoursRecovered: number
  valueGbpCents: number
  queries: number
  resolutionRate: number
  isLoading: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={Clock}
        label="Hours recovered"
        value={formatHours(hoursRecovered)}
        hint="Manager time the AI saved across answered queries"
        isLoading={isLoading}
      />
      <KpiCard
        icon={Brain}
        label="Value saved"
        value={formatGbpFromCents(valueGbpCents)}
        hint="Baseline £25/hr × hours recovered"
        isLoading={isLoading}
      />
      <KpiCard
        icon={MessageSquare}
        label="Queries answered"
        value={formatCompact(queries)}
        hint="`find_knowledge` hits in window"
        isLoading={isLoading}
      />
      <KpiCard
        icon={Brain}
        label="AI resolution rate"
        value={formatPercent(resolutionRate)}
        hint="Assistant turns handled without escalation"
        isLoading={isLoading}
      />
    </div>
  )
}

function PanelCard({
  title,
  description,
  icon: Icon,
  trailing,
  className,
  children,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  trailing?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
            <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
          </div>
        </div>
        {trailing ? <div className="text-xs">{trailing}</div> : null}
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  )
}

function EscalationKindBadge({ kind }: { kind: string | null }) {
  // Three kinds today: incident, task, note. Anything else (or null) renders
  // as a neutral "Handoff" so the row still parses.
  const meta =
    kind === 'incident'
      ? {
          icon: AlertTriangle,
          label: 'Incident',
          className: 'bg-chart-3/15 text-chart-3',
        }
      : kind === 'task'
        ? {
            icon: CheckSquare,
            label: 'Task',
            className: 'bg-chart-1/15 text-chart-1',
          }
        : kind === 'note'
          ? {
              icon: StickyNote,
              label: 'Note',
              className: 'bg-chart-2/15 text-chart-2',
            }
          : {
              icon: AlertTriangle,
              label: 'Handoff',
              className: 'bg-muted text-muted-foreground',
            }
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

function RangePresetPicker({
  value,
  onChange,
}: {
  value: RangePreset
  onChange: (v: RangePreset) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RangePreset)}>
      <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by date range">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(RANGE_PRESETS) as Array<[RangePreset, { label: string }]>).map(
          ([k, v]) => (
            <SelectItem key={k} value={k}>
              {v.label}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  )
}

function VenueScopePicker({
  value,
  onChange,
  venues,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  venues: Array<{ id: string; name: string }>
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 w-[200px]" aria-label="Filter by venue">
        <SelectValue placeholder="Select venue" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VENUES}>All venues</SelectItem>
        {venues.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            {v.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-[220px] w-full" />
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-center">
      <p className="max-w-[24ch] text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function venueName(
  venues: Array<{ id: string; name: string }> | undefined,
  id: string,
): string | null {
  return venues?.find((v) => v.id === id)?.name ?? null
}

function isForbidden(...errors: unknown[]): boolean {
  return errors.some((e) => {
    if (!e || typeof e !== 'object') return false
    const status = (e as { status?: number }).status
    return status === 401 || status === 403
  })
}
