'use client'

import { Building2, MapPinned, Phone, Plug } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCurrentMember } from '@/lib/hooks/use-current-member'
import { cn } from '@/lib/utils'

type SettingsTab = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match: (pathname: string) => boolean
  managerOnly?: boolean
}

const TABS: SettingsTab[] = [
  {
    label: 'Organisation',
    href: '/settings/organization',
    icon: Building2,
    match: (p) => p.startsWith('/settings/organization'),
    managerOnly: true,
  },
  {
    label: 'Venues',
    href: '/settings/venues',
    icon: MapPinned,
    match: (p) => p.startsWith('/settings/venues'),
    managerOnly: true,
  },
  {
    label: 'Phone',
    href: '/settings/phone',
    icon: Phone,
    match: (p) => p.startsWith('/settings/phone'),
  },
  {
    label: 'Integrations',
    href: '/settings/integrations',
    icon: Plug,
    match: (p) => p.startsWith('/settings/integrations'),
    managerOnly: true,
  },
]

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const { isManager } = useCurrentMember()
  // Only reveal manager-only tabs once the role resolves to owner/manager, so
  // they stay hidden during the loading flash for staff.
  const tabs = TABS.filter((t) => !t.managerOnly || isManager)
  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2 sm:px-6">
        <nav aria-label="Settings sections" className="mb-5 flex gap-1 overflow-x-auto border-b">
          {tabs.map(({ label, href, icon: Icon, match }) => {
            const selected = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                aria-current={selected ? 'page' : undefined}
                className={cn(
                  'relative -mb-px flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm transition-colors',
                  selected
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
        {children}
      </div>
    </div>
  )
}
