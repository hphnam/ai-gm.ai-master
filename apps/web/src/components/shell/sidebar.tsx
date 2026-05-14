'use client'

import { BookOpen, MessageSquarePlus, Settings, SquarePen, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useInboxCount } from '@/components/docs/inbox-tab'
import { useQuestionsCount } from '@/components/docs/questions-tab'
import { markMinted } from '@/lib/minted-conv-ids'
import { cn } from '@/lib/utils'
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
  // Aggregate Knowledge urgency badge. The counts come from the same hooks
  // the Knowledge page tabs use; React Query caches them so this isn't a
  // double fetch.
  const knowledgeUrgentCount = useInboxCount() + useQuestionsCount()
  const settingsActive = pathname.startsWith('/settings')

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
        <div className="flex items-center gap-2 px-2 pt-1 pb-1">
          <Link
            href="/chat"
            aria-label="GM AI — go to chat"
            className="group inline-flex items-baseline gap-1.5 font-display text-foreground transition-opacity hover:opacity-80"
          >
            <span className="text-lg font-semibold leading-none tracking-[-0.02em]">gm</span>
            <span
              aria-hidden
              className="inline-block h-1 w-1 translate-y-[-0.15em] rounded-full bg-foreground/40"
            />
            <span className="text-[10px] font-medium uppercase leading-none tracking-[0.22em] text-foreground/55">
              ai
            </span>
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
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
            const showBadge = isKnowledge && knowledgeUrgentCount > 0
            return (
              <Link
                key={item.label}
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
                <span className="flex-1">{item.label}</span>
                {showBadge ? (
                  <>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                        active
                          ? 'bg-sidebar-foreground/15 text-sidebar-accent-foreground'
                          : 'bg-sidebar-accent text-sidebar-foreground/85',
                      )}
                      aria-hidden
                    >
                      <span
                        className="inline-block h-1 w-1 rounded-full bg-amber-500"
                        aria-hidden
                      />
                      {knowledgeUrgentCount}
                    </span>
                    <span className="sr-only">{knowledgeUrgentCount} needing attention</span>
                  </>
                ) : null}
              </Link>
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
          <Link
            href="/settings/organization"
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
              settingsActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60',
            )}
            aria-current={settingsActive ? 'page' : undefined}
          >
            <Settings className="h-4 w-4" aria-hidden />
            Settings
          </Link>
          <span className="mt-1 px-1">
            <SidebarUser />
          </span>
        </div>
      </aside>
    </>
  )
}
