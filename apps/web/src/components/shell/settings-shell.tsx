'use client'

import { Building2, MapPinned, Phone, Plug, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PageHeader } from '@/components/shell/page-header'
import { cn } from '@/lib/utils'

type SettingsTab = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match: (pathname: string) => boolean
}

const TABS: SettingsTab[] = [
  {
    label: 'Organisation',
    href: '/settings/organization',
    icon: Building2,
    match: (p) => p.startsWith('/settings/organization'),
  },
  {
    label: 'Team',
    href: '/settings/team',
    icon: Users,
    match: (p) => p.startsWith('/settings/team'),
  },
  {
    label: 'Venues',
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
  {
    label: 'Integrations',
    href: '/settings/integrations',
    icon: Plug,
    match: (p) => p.startsWith('/settings/integrations'),
  },
]

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  return (
    <>
      <PageHeader title="Settings" />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <nav aria-label="Settings sections" className="mb-6 flex gap-1 overflow-x-auto border-b">
            {TABS.map(({ label, href, icon: Icon, match }) => {
              const selected = match(pathname)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={selected ? 'page' : undefined}
                  className={cn(
                    'relative -mb-px flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors',
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
    </>
  )
}
