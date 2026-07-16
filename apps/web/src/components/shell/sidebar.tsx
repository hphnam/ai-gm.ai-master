'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BarChart3,
  CheckSquare,
  ChevronRight,
  Folder,
  LayoutGrid,
  MessageSquare,
  Plus,
  Settings,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useInboxCount } from '@/components/docs/inbox-tab'
import { useQuestionsCount } from '@/components/docs/questions-tab'
import { useExpiryCounts } from '@/lib/hooks/use-compliance'
import { useCurrentMember } from '@/lib/hooks/use-current-member'
import { useOpenIncidentsCount } from '@/lib/hooks/use-incidents'
import { useOpenTasksCount } from '@/lib/hooks/use-tasks'
import { markMinted } from '@/lib/minted-conv-ids'
import { prefetchRoute } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { NotificationsBell } from './notifications-bell'
import { SidebarThreads } from './sidebar-threads'
import { SidebarUser, type SidebarUserInfo } from './sidebar-user'

type NavChild = {
  label: string
  href: string
  match: (pathname: string) => boolean
}

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match: (pathname: string) => boolean
  /// Sub-items rendered indented underneath the parent when the parent
  /// section is active — the ledger design's expandable "Documents" group.
  children?: NavChild[]
}

const chatNav: NavItem = {
  label: 'Chat',
  href: '/chat',
  icon: MessageSquare,
  match: (p) => p.startsWith('/chat'),
}

const dashboardNav: NavItem = {
  label: 'Dashboard',
  href: '/dashboard',
  icon: LayoutGrid,
  match: (p) => p.startsWith('/dashboard'),
}

const tasksNav: NavItem = {
  label: 'Tasks',
  href: '/tasks',
  icon: CheckSquare,
  match: (p) => p.startsWith('/tasks'),
}

const incidentsNav: NavItem = {
  label: 'Incidents',
  href: '/incidents',
  icon: AlertTriangle,
  match: (p) => p.startsWith('/incidents'),
}

// The ledger design folds Knowledge, Inbox, Compliance and Questions under one
// expandable "Documents" parent. Each child keeps its own existing route.
const documentsNav: NavItem = {
  label: 'Documents',
  href: '/docs',
  icon: Folder,
  match: (p) => p.startsWith('/docs') || p.startsWith('/compliance'),
  children: [
    { label: 'Library', href: '/docs', match: (p) => p === '/docs' },
    { label: 'Inbox', href: '/docs/inbox', match: (p) => p.startsWith('/docs/inbox') },
    { label: 'Compliance', href: '/compliance', match: (p) => p.startsWith('/compliance') },
    { label: 'Questions', href: '/docs/questions', match: (p) => p.startsWith('/docs/questions') },
  ],
}

// Flat item like the design — Schedules is reached from a link inside the
// Reports page, not a sidebar child (only Documents expands).
const reportsNav: NavItem = {
  label: 'Reports',
  href: '/reports',
  icon: BarChart3,
  match: (p) => p === '/reports' || p.startsWith('/reports/'),
}

type Props = {
  mobileOpen?: boolean
  onMobileClose?: () => void
  initialUser: SidebarUserInfo
}

export function Sidebar({ mobileOpen = false, onMobileClose, initialUser }: Props) {
  const pathname = usePathname() ?? '/'
  const params = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const warm = (href: string) => prefetchRoute(queryClient, href)
  const isChat = pathname.startsWith('/chat')
  const activeVenue = params.get('venue')

  const inboxCount = useInboxCount()
  const questionsCount = useQuestionsCount()
  const tasksCounts = useOpenTasksCount().data
  const tasksOpenCount = tasksCounts?.openCount ?? 0
  const tasksOverdueCount = tasksCounts?.overdueCount ?? 0
  const expiryCounts = useExpiryCounts().data
  const expiryActiveCount = expiryCounts?.activeCount ?? 0
  const expiryOverdueCount = expiryCounts?.overdueCount ?? 0
  const expiryWithin30Count = expiryCounts?.within30dCount ?? 0
  const incidentCounts = useOpenIncidentsCount().data
  const incidentOpenCount = incidentCounts?.openCount ?? 0
  const incidentCriticalCount = incidentCounts?.criticalOpenCount ?? 0
  const settingsActive = pathname.startsWith('/settings')
  // Dashboard + Incidents are owner/manager only; role comes off the session so
  // staff read it too. Show while loading so the link doesn't flash off.
  const { isManager, isLoading: roleLoading } = useCurrentMember()
  const canSeeDashboard = roleLoading || isManager

  // Aggregate urgency for the collapsed Documents parent — a dot when any child
  // needs attention (inbox items, open questions, or a due/overdue expiry).
  const complianceUrgent = expiryOverdueCount > 0 || expiryWithin30Count > 0
  const documentsDot = inboxCount > 0 || questionsCount > 0 || complianceUrgent

  const nav: NavItem[] = [
    chatNav,
    ...(canSeeDashboard ? [dashboardNav] : []),
    tasksNav,
    ...(canSeeDashboard ? [incidentsNav] : []),
    documentsNav,
    reportsNav,
  ]

  const childBadge = (href: string): { count: number; urgent: boolean } | null => {
    if (href === '/docs/inbox' && inboxCount > 0) return { count: inboxCount, urgent: true }
    if (href === '/docs/questions' && questionsCount > 0)
      return { count: questionsCount, urgent: true }
    if (href === '/compliance' && expiryActiveCount > 0)
      return { count: expiryActiveCount, urgent: complianceUrgent }
    return null
  }

  const parentBadge = (item: NavItem): { count: number; urgent: boolean } | null => {
    if (item.href === '/tasks' && tasksOpenCount > 0)
      return { count: tasksOpenCount, urgent: tasksOverdueCount > 0 }
    if (item.href === '/incidents' && incidentOpenCount > 0)
      return { count: incidentOpenCount, urgent: incidentCriticalCount > 0 }
    return null
  }

  // Client-first thread ids: the new chat's UUID is generated here and carried
  // through the URL as the only source of truth for "which thread am I in".
  const onNewChat = () => {
    const conv =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`
    markMinted(conv)
    const url = activeVenue ? `/chat?venue=${activeVenue}&conv=${conv}` : `/chat?conv=${conv}`
    router.push(url)
    onMobileClose?.()
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-[var(--ink)]/40 backdrop-blur-sm md:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
        onClick={onMobileClose}
        aria-hidden
      />
      <aside
        className={cn(
          'flex flex-col gap-2 border-r border-[var(--hairline)] bg-[var(--paper-2)] p-3 text-[var(--ink-text)]',
          'md:sticky md:top-0 md:h-dvh md:w-[264px] md:shrink-0',
          'fixed inset-y-0 left-0 z-50 w-[280px] transition-transform md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        aria-label="Primary"
      >
        {/* Brand + bell */}
        <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
          <Link
            href="/chat"
            aria-label="GM AI — go to chat"
            className="inline-flex items-start gap-1.5 transition-opacity hover:opacity-80"
          >
            <span className="text-[22px] font-extrabold leading-none tracking-[-0.06em] text-[var(--ink-text)]">
              GM
            </span>
            <span className="font-mono-ledger mt-0.5 rounded-[3px] bg-[var(--brass)] px-1 py-[3px] text-[9px] font-bold leading-none text-[var(--cream-hi)]">
              AI
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <button
              type="button"
              onClick={onMobileClose}
              className="-mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-black/5 md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* New chat — brass CTA with the ledger printed offset shadow */}
        <button
          type="button"
          onClick={onNewChat}
          className={cn(
            'mt-1 flex items-center justify-center gap-2 rounded-[7px] bg-[var(--brass)] px-3 py-2.5',
            'text-[13.5px] font-semibold text-[var(--cream-hi)] shadow-[0_2px_0_var(--brass-shadow)]',
            'cursor-pointer transition-colors hover:bg-[var(--brass-shadow)] active:translate-y-px',
          )}
        >
          <Plus className="h-[15px] w-[15px]" aria-hidden strokeWidth={2} />
          New chat
        </button>

        <nav className="mt-1.5 flex flex-col gap-0.5" aria-label="Primary navigation">
          {nav.map((item) => {
            const active = item.match(pathname)
            const Icon = item.icon
            const badge = parentBadge(item)
            const sectionActive = active || (item.children?.some((c) => c.match(pathname)) ?? false)
            const showChildren = item.children && sectionActive
            const showDocDot = item.href === '/docs' && !sectionActive && documentsDot
            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  onMouseEnter={() => warm(item.href)}
                  onFocus={() => warm(item.href)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
                    active
                      ? 'bg-[#fcfaf3] font-semibold text-[var(--ink-text)] shadow-[0_1px_2px_rgba(32,26,18,0.06)]'
                      : 'font-medium text-[var(--ink-muted)] hover:bg-black/5',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {badge ? (
                    <span
                      className={cn(
                        'font-mono-ledger inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                        badge.urgent
                          ? 'bg-[rgba(154,75,44,0.1)] text-[var(--clay)]'
                          : 'bg-black/[0.07] text-[var(--ink-muted)]',
                      )}
                    >
                      {badge.urgent ? (
                        <span className="h-1 w-1 rounded-full bg-[var(--clay)]" aria-hidden />
                      ) : null}
                      {badge.count}
                    </span>
                  ) : null}
                  {showDocDot ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--clay)]" aria-hidden />
                  ) : null}
                  {item.children ? (
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 opacity-55 transition-transform',
                        sectionActive && 'rotate-90',
                      )}
                      aria-hidden
                    />
                  ) : null}
                </Link>

                {showChildren ? (
                  <div className="mt-0.5 mb-1 ml-5 flex flex-col gap-px border-l border-[var(--hairline)] pl-3">
                    {item.children?.map((child) => {
                      const childActive = child.match(pathname)
                      const cb = childBadge(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onMouseEnter={() => warm(child.href)}
                          onFocus={() => warm(child.href)}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors',
                            childActive
                              ? 'bg-[#fcfaf3] font-semibold text-[var(--ink-text)]'
                              : 'font-medium text-[var(--ink-muted)] hover:bg-black/5',
                          )}
                          aria-current={childActive ? 'page' : undefined}
                        >
                          <span className="flex-1">{child.label}</span>
                          {cb ? (
                            <span
                              className={cn(
                                'font-mono-ledger inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums',
                                cb.urgent
                                  ? 'bg-[rgba(154,75,44,0.1)] text-[var(--clay)]'
                                  : 'bg-black/[0.07] text-[var(--ink-muted)]',
                              )}
                            >
                              {cb.urgent ? (
                                <span
                                  className="h-1 w-1 rounded-full bg-[var(--clay)]"
                                  aria-hidden
                                />
                              ) : null}
                              {cb.count}
                            </span>
                          ) : null}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

        {/* Recent chats peek — only on the chat surface */}
        {isChat ? (
          <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="font-mono-ledger text-[9.5px] font-bold uppercase tracking-[0.14em] text-[var(--mono-muted)]">
                Recent chats
              </span>
              <Link
                href="/chat/history"
                className="text-[10.5px] font-medium text-[var(--brass)] hover:text-[var(--brass-shadow)]"
              >
                View all →
              </Link>
            </div>
            <div className="min-h-0 flex-1">
              <SidebarThreads />
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex flex-col gap-0.5 border-t border-[var(--hairline)] pt-2">
          <Link
            href="/settings/general"
            onMouseEnter={() => warm('/settings')}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
              settingsActive
                ? 'bg-[#fcfaf3] font-semibold text-[var(--ink-text)]'
                : 'font-medium text-[var(--ink-muted)] hover:bg-black/5',
            )}
            aria-current={settingsActive ? 'page' : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden />
            Settings
          </Link>
          <span className="mt-0.5">
            <SidebarUser initialUser={initialUser} />
          </span>
        </div>
      </aside>
    </>
  )
}
