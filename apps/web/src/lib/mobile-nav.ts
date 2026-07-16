/// Mobile "hero" screens — purpose-built for the phone in the Publican's Ledger
/// design, with their own in-content serif title and no action-bearing page
/// header. On these routes (and only these) the mobile surface swaps the
/// per-route header for the global MobileTopBar (venue pill + avatar). Every
/// other route (chat, dashboard, docs, settings, …) keeps its existing header
/// on mobile because that's where its title, filters and controls live.
export const MOBILE_HERO_PATHS = ['/today', '/tasks', '/alerts'] as const

export function isMobileHeroRoute(pathname: string): boolean {
  return MOBILE_HERO_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
