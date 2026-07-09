'use client'

import { AlertTriangle, BookOpen, FileBarChart, Settings, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type MoreDestination = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match: (pathname: string) => boolean
}

const MORE_DESTINATIONS: MoreDestination[] = [
  {
    label: 'Compliance',
    href: '/compliance',
    icon: ShieldCheck,
    match: (p) => p.startsWith('/compliance'),
  },
  {
    label: 'Incidents',
    href: '/incidents',
    icon: AlertTriangle,
    match: (p) => p.startsWith('/incidents'),
  },
  {
    label: 'Knowledge',
    href: '/docs',
    icon: BookOpen,
    match: (p) => p.startsWith('/docs'),
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: FileBarChart,
    match: (p) => p.startsWith('/reports'),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    match: (p) => p.startsWith('/settings'),
  },
]

export function matchesMoreDestination(pathname: string): boolean {
  return MORE_DESTINATIONS.some((d) => d.match(pathname))
}

export function MobileMoreSheet({
  open,
  onOpenChange,
  pathname,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" hideCloseButton className="pb-[env(safe-area-inset-bottom)]">
        <SheetTitle className="sr-only">More</SheetTitle>
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-border" aria-hidden />
        <nav aria-label="More destinations" className="flex flex-col gap-0.5 px-3 py-3">
          {MORE_DESTINATIONS.map(({ label, href, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => onOpenChange(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand/10 text-brand'
                    : 'text-foreground/85 hover:bg-muted active:bg-muted',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
