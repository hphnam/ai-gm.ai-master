'use client'

import { Check, ChevronDown } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useSession } from '@/lib/auth-client'
import { useVenues } from '@/lib/hooks/use-venues'
import { initials } from '@/lib/initials'
import { isMobileHeroRoute } from '@/lib/mobile-nav'
import { cn } from '@/lib/utils'
import type { SidebarUserInfo } from './sidebar-user'

/// Slim global top bar for the mobile app surface (md:hidden). Left: a venue
/// switcher pill; right: the account avatar (opens the More sheet). Replaces the
/// per-route page-title header on mobile — each screen renders its own serif h1.
export function MobileTopBar({
  initialUser,
  onOpenMore,
}: {
  initialUser: SidebarUserInfo
  onOpenMore: () => void
}) {
  const [venueSheetOpen, setVenueSheetOpen] = useState(false)
  const pathname = usePathname() ?? ''
  const { data: session } = useSession()
  const user = session?.user ?? initialUser

  const { data: venues } = useVenues()
  const params = useSearchParams()
  const selectedId = params.get('venue')
  const selected = venues?.find((v) => v.id === selectedId) ?? venues?.[0] ?? null
  const multi = (venues?.length ?? 0) > 1

  // Only the hero screens (Today/Tasks/Alerts) use the global top bar; other
  // routes keep their own page header on mobile.
  if (!isMobileHeroRoute(pathname)) return null

  return (
    <>
      <div
        className="flex flex-none items-center gap-2.5 border-b border-[var(--hairline-soft)] bg-[var(--paper)] px-4 pb-2.5 md:hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
      >
        <button
          type="button"
          onClick={() => multi && setVenueSheetOpen(true)}
          disabled={!multi}
          aria-label={multi ? 'Switch venue' : (selected?.name ?? 'Venue')}
          className={cn(
            'flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--paper-2)] py-1.5 pr-3 pl-2',
            multi && 'cursor-pointer active:scale-95 transition-transform',
          )}
        >
          <span className="grid h-[18px] w-[18px] flex-none place-items-center rounded-[5px] bg-[var(--brass)]">
            <span className="h-[6px] w-[6px] rotate-45 bg-[var(--cream-hi)]" />
          </span>
          <span className="max-w-[52vw] truncate text-[12.5px] font-semibold text-[var(--ink-text)]">
            {selected?.name ?? 'Select venue'}
          </span>
          {multi ? (
            <ChevronDown className="h-2.5 w-2.5 flex-none text-[var(--mono-muted)]" aria-hidden />
          ) : null}
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Account and more"
          className="grid h-[34px] w-[34px] flex-none cursor-pointer place-items-center rounded-full bg-[var(--ink)] font-sans text-[12px] font-bold text-[var(--cream-hi)] active:scale-95 transition-transform"
        >
          {initials(user.name, user.email)}
        </button>
      </div>

      <Sheet open={venueSheetOpen} onOpenChange={setVenueSheetOpen}>
        <SheetContent side="bottom" hideCloseButton className="pb-[env(safe-area-inset-bottom)]">
          <SheetTitle className="sr-only">Switch venue</SheetTitle>
          <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-border" aria-hidden />
          <div className="px-3 py-3">
            <span className="mb-2 block px-2 font-mono-ledger text-[10px] font-bold uppercase tracking-[1.6px] text-[var(--mono-muted)]">
              Venue
            </span>
            <VenuePicker
              venues={venues ?? []}
              selectedId={selected?.id ?? null}
              onSelect={() => setVenueSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function VenuePicker({
  venues,
  selectedId,
  onSelect,
}: {
  venues: { id: string; name: string; address?: string | null }[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const router = useRouter()
  const pathname = usePathname() ?? '/chat'
  return (
    <nav aria-label="Venues" className="flex flex-col gap-0.5">
      {venues.map((v) => {
        const active = v.id === selectedId
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              router.push(`${pathname}?venue=${v.id}`)
              onSelect(v.id)
            }}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 text-left transition-colors',
              active
                ? 'bg-[var(--brass)]/10'
                : 'hover:bg-[var(--paper-2)] active:bg-[var(--paper-2)]',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-medium text-[var(--ink-text)]">
                {v.name}
              </span>
              {v.address ? (
                <span className="mt-0.5 block truncate text-xs text-[var(--mono-muted)]">
                  {v.address}
                </span>
              ) : null}
            </span>
            {active ? (
              <Check className="h-4 w-4 flex-none text-[var(--brass)]" aria-hidden />
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
