'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  FileBarChart,
  LayoutGrid,
  type LucideIcon,
  MapPin,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { authClient, useSession } from '@/lib/auth-client'
import { useCurrentMember } from '@/lib/hooks/use-current-member'
import { useVenues } from '@/lib/hooks/use-venues'
import { initials } from '@/lib/initials'
import { cn } from '@/lib/utils'
import type { SidebarUserInfo } from './sidebar-user'

type Dest = { label: string; href: string; icon: LucideIcon }

// Routes surfaced under More that mark the tab active when visited.
const MORE_ROUTES = ['/dashboard', '/reports', '/docs', '/incidents', '/compliance', '/settings']

export function matchesMoreDestination(pathname: string): boolean {
  return MORE_ROUTES.some((r) => pathname.startsWith(r))
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  manager: 'General Manager',
  staff: 'Staff',
}

export function MobileMoreSheet({
  open,
  onOpenChange,
  initialUser,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialUser: SidebarUserInfo
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { role, isOwner, isStaff } = useCurrentMember()

  const user = session?.user ?? initialUser
  const { data: venues } = useVenues()
  const params = useSearchParams()
  const venue = venues?.find((v) => v.id === params.get('venue')) ?? venues?.[0] ?? null

  const sections = buildSections({ isOwner, isStaff })

  async function handleSignOut() {
    onOpenChange(false)
    await authClient.signOut()
    queryClient.clear()
    toast.success('Signed out')
    router.replace('/auth/sign-in')
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className="max-h-[88dvh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+16px)]"
      >
        <SheetTitle className="sr-only">More</SheetTitle>
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-border" aria-hidden />

        <div className="px-4 pt-3">
          <Link
            href="/settings"
            onClick={() => onOpenChange(false)}
            className="mb-5 flex items-center gap-3.5 rounded-2xl border border-[var(--hairline)] bg-[var(--ledger-card)] p-4"
          >
            <span className="grid h-[46px] w-[46px] flex-none place-items-center rounded-full bg-[var(--ink)] text-[15px] font-bold text-[var(--cream-hi)]">
              {initials(user.name, user.email)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-[var(--ink-text)]">
                {user.name ?? user.email.split('@')[0]}
              </span>
              <span className="mt-0.5 block truncate text-xs text-[var(--mono-muted)]">
                {ROLE_LABEL[role ?? 'staff']}
                {venue ? ` · ${venue.name}` : ''}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 flex-none text-[var(--cream-mid)]" aria-hidden />
          </Link>

          {sections.map((sec) => (
            <div key={sec.header} className="mb-4">
              <span className="mb-2.5 block font-mono-ledger text-[10px] font-bold uppercase tracking-[1.6px] text-[var(--mono-muted)]">
                {sec.header}
              </span>
              <div className="overflow-hidden rounded-[14px] border border-[var(--hairline)] bg-[var(--ledger-card)]">
                {sec.items.map((it, i) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'flex min-h-[52px] items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-[var(--paper-2)]',
                      i < sec.items.length - 1 && 'border-b border-[var(--hairline-soft)]',
                    )}
                  >
                    <it.icon
                      className="h-[18px] w-[18px] flex-none text-[var(--ink-muted)]"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span className="flex-1 text-[14.5px] font-medium text-[var(--ink-text)]">
                      {it.label}
                    </span>
                    <ChevronRight
                      className="h-[13px] w-[13px] flex-none text-[var(--cream-mid)]"
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 w-full cursor-pointer rounded-xl border border-[var(--hairline-strong)] py-3 text-[13.5px] font-medium text-[var(--clay)] active:bg-[var(--paper-2)]"
          >
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function buildSections({
  isOwner,
  isStaff,
}: {
  isOwner: boolean
  isStaff: boolean
}): { header: string; items: Dest[] }[] {
  if (isStaff) {
    return [
      { header: 'Account', items: [{ label: 'Settings', href: '/settings', icon: Settings }] },
    ]
  }
  const operations: Dest[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { label: 'Reports', href: '/reports', icon: FileBarChart },
    { label: 'Knowledge', href: '/docs', icon: BookOpen },
    { label: 'Incidents', href: '/incidents', icon: AlertTriangle },
    { label: 'Compliance', href: '/compliance', icon: ShieldCheck },
  ]
  if (isOwner) {
    return [
      { header: 'Operations', items: operations },
      {
        header: 'Group',
        items: [
          { label: 'Venues', href: '/settings/venues', icon: MapPin },
          { label: 'Team & roles', href: '/settings/team', icon: Users },
        ],
      },
      { header: 'Account', items: [{ label: 'Settings', href: '/settings', icon: Settings }] },
    ]
  }
  return [
    { header: 'Operations', items: operations },
    {
      header: 'Account',
      items: [
        { label: 'Team & rota', href: '/settings/team', icon: Users },
        { label: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ]
}
