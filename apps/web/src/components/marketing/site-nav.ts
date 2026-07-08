export type NavLink = { href: string; label: string }

// Top-level marketing nav. Order is intentional: product story first
// (features), then commercials (pricing), then company/updates.
export const NAV_LINKS: NavLink[] = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/blog', label: 'Blog' },
]
