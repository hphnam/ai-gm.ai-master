'use client'

import { Building2, MapPinned, Phone, Plug, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type SettingsSection = {
  label: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match: (pathname: string) => boolean
  managerOnly?: boolean
}

const SECTIONS: SettingsSection[] = [
  {
    label: 'General',
    description: 'Business profile',
    href: '/settings/general',
    icon: Building2,
    match: (p) => p.startsWith('/settings/general') || p.startsWith('/settings/organization'),
    managerOnly: true,
  },
  {
    label: 'Team',
    description: 'Members & invites',
    href: '/settings/team',
    icon: Users,
    match: (p) => p.startsWith('/settings/team'),
    managerOnly: true,
  },
  {
    label: 'Venues',
    description: 'Sites & profiles',
    href: '/settings/venues',
    icon: MapPinned,
    match: (p) => p.startsWith('/settings/venues'),
    managerOnly: true,
  },
  {
    label: 'Integrations',
    description: 'POS & connections',
    href: '/settings/integrations',
    icon: Plug,
    match: (p) => p.startsWith('/settings/integrations'),
    managerOnly: true,
  },
  {
    label: 'Phone',
    description: 'Your number',
    href: '/settings/phone',
    icon: Phone,
    match: (p) => p.startsWith('/settings/phone'),
  },
]

export function SettingsShell({
  children,
  isManager,
}: {
  children: React.ReactNode
  // Resolved server-side in the settings layout so manager-only sections are
  // correct on first paint — no client session fetch, no nav pop-in.
  isManager: boolean
}) {
  const pathname = usePathname() ?? ''
  const sections = SECTIONS.filter((s) => !s.managerOnly || isManager)

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-10 pt-4 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start md:gap-8">
        {/* Sticky within the scroll container: nav stays put while content scrolls. */}
        <nav
          aria-label="Settings sections"
          className="sticky top-0 z-10 -mx-4 bg-background/80 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:top-4 md:mx-0 md:self-start md:bg-transparent md:px-0 md:py-0 md:pt-1 md:backdrop-blur-none"
        >
          {/* Mobile: horizontal scroll strip. Desktop: vertical list. */}
          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:gap-0.5 md:px-0">
            {sections.map(({ label, description, href, icon: Icon, match }) => {
              const selected = match(pathname)
              return (
                <li key={href} className="shrink-0 md:shrink">
                  <Link
                    href={href}
                    aria-current={selected ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      'md:gap-3',
                      selected
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex flex-col">
                      <span className="leading-tight">{label}</span>
                      <span className="hidden text-xs font-normal text-muted-foreground md:block">
                        {description}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
