'use client'

import {
  BookOpen,
  Building2,
  Inbox,
  Library,
  MapPinned,
  MessageCircleQuestion,
  MessageSquarePlus,
  Phone,
  SquarePen,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useInboxCount } from '@/components/docs/inbox-tab'
import { useQuestionsCount } from '@/components/docs/questions-tab'
import { markMinted } from '@/lib/minted-conv-ids'
import { cn } from '@/lib/utils'
import { NotificationsBell } from './notifications-bell'
import { SidebarThreads } from './sidebar-threads'
import { SidebarUser } from './sidebar-user'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match: (pathname: string) => boolean
}

const primaryNav: NavItem[] = [
  {
    label: 'Chat',
    href: '/chat',
    icon: SquarePen,
    match: (p) => p.startsWith('/chat'),
  },
  {
    label: 'Knowledge',
    href: '/docs',
    icon: BookOpen,
    match: (p) => p.startsWith('/docs'),
  },
]

const settingsNav: NavItem[] = [
  {
    label: 'Organisation',
    href: '/settings/organization',
    icon: Building2,
    match: (p) => p.startsWith('/settings/organization'),
  },
  {
    label: 'Venue profiles',
    href: '/settings/venues',
    icon: MapPinned,
    match: (p) => p.startsWith('/settings/venues'),
  },
  {
    label: 'Phone',
    href: '/settings/phone',
    icon: Phone,
    match: (p) => p.startsWith('/settings/phone'),
  },
]

// Always-mounted sub-nav under Knowledge. The count hooks fire globally so
// the badges stay live as the user works elsewhere; queries are cached by
// React Query and only poll while a doc is mid-processing.
function KnowledgeSubNav({ pathname }: { pathname: string }) {
  const inboxCount = useInboxCount()
  const questionsCount = useQuestionsCount()

  const items: Array<{
    label: string
    href: string
    Icon: React.ComponentType<{ className?: string }>
    match: (p: string) => boolean
    count: number
    urgent?: boolean
  }> = [
    {
      label: 'Library',
      href: '/docs',
      Icon: Library,
      match: (p) => p === '/docs' || p.startsWith('/docs/') === false,
      count: 0,
    },
    {
      label: 'Inbox',
      href: '/docs/inbox',
      Icon: Inbox,
      match: (p) => p.startsWith('/docs/inbox'),
      count: inboxCount,
      urgent: true,
    },
    {
      label: 'Questions',
      href: '/docs/questions',
      Icon: MessageCircleQuestion,
      match: (p) => p.startsWith('/docs/questions'),
      count: questionsCount,
      urgent: true,
    },
  ]

  // Library is the default on /docs and /docs/[id] — but only when we're
  // actually inside the /docs section. Without the onDocs gate, every other
  // page (e.g. /chat, /settings) would highlight Library as active.
  const onDocs = pathname === '/docs' || pathname.startsWith('/docs/')
  const onInbox = pathname.startsWith('/docs/inbox')
  const onQuestions = pathname.startsWith('/docs/questions')
  const libraryActive = onDocs && !onInbox && !onQuestions

  return (
    <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border/60 pl-2">
      {items.map(({ label, href, Icon, count, urgent }, idx) => {
        const active = idx === 0 ? libraryActive : idx === 1 ? onInbox : onQuestions
        return (
          <li key={label}>
            <Link
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-[13px] transition-colors',
                active
                  ? 'bg-sidebar-accent/70 font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span className="flex-1 truncate">{label}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                    active
                      ? 'bg-sidebar-foreground/15 text-sidebar-accent-foreground'
                      : urgent
                        ? 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300'
                        : 'bg-sidebar-accent/60 text-sidebar-muted',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

type Props = {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen = false, onMobileClose }: Props) {
  const pathname = usePathname() ?? '/'
  const params = useSearchParams()
  const router = useRouter()
  const isChat = pathname.startsWith('/chat')
  const activeVenue = params.get('venue')

  // Client-first thread ids: the new chat's UUID is generated here and carried
  // through the URL as the only source of truth for "which thread am I in".
  // The backend upserts into the conversation row the first time the user
  // sends a message under this id.
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
          'fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm md:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
        onClick={onMobileClose}
        aria-hidden
      />
      <aside
        className={cn(
          'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
          'flex flex-col gap-2 p-3',
          'md:sticky md:top-0 md:h-dvh md:w-[260px] md:shrink-0',
          'fixed inset-y-0 left-0 z-50 w-[280px] transition-transform md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        aria-label="Primary"
      >
        <div className="flex items-center gap-2 px-1 pt-1 pb-1">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span className="flex px-3 py-1.5 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              AI-GM
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell />
            <button
              type="button"
              onClick={onMobileClose}
              className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className={cn(
            'flex items-center justify-center gap-2 rounded-md border border-sidebar-border',
            'bg-sidebar px-3 py-2 text-sm font-medium shadow-sm',
            'hover:border-brand/40 hover:bg-sidebar-accent/60 transition-colors cursor-pointer',
          )}
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          New chat
        </button>

        <nav className="mt-1 flex flex-col gap-0.5" aria-label="Primary navigation">
          {primaryNav.map((item) => {
            const active = item.match(pathname)
            const Icon = item.icon
            const isKnowledge = item.href === '/docs'
            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
                {isKnowledge ? <KnowledgeSubNav pathname={pathname} /> : null}
              </div>
            )
          })}
        </nav>

        {isChat ? (
          <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
            <span className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              Recent
            </span>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1">
              <SidebarThreads />
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-2">
          {settingsNav.map((item) => {
            const active = item.match(pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            )
          })}
          <span className="mt-1 px-1">
            <SidebarUser />
          </span>
        </div>
      </aside>
    </>
  )
}
