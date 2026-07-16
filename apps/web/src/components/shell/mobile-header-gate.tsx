'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { isMobileHeroRoute } from '@/lib/mobile-nav'

/// Wraps the @header slot. `display: contents` keeps the header a direct flex
/// child of the content column (no extra box). On mobile hero routes the header
/// is hidden — those screens render their own in-content title and use the
/// MobileTopBar for global chrome.
export function MobileHeaderGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  return (
    <div className={isMobileHeroRoute(pathname) ? 'contents max-md:hidden' : 'contents'}>
      {children}
    </div>
  )
}
