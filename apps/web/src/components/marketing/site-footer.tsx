import Link from 'next/link'
import { SITE_NAME, SITE_URL } from '@/lib/seo'
import { Wordmark } from './wordmark'

const LINKS: { href: string; label: string }[] = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

export function SiteFooter() {
  const host = SITE_URL.replace(/^https?:\/\//, '')
  return (
    <footer className="bg-[var(--ink)] text-[var(--cream-muted)]">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-7 py-12">
        <Link href="/" aria-label={`${SITE_NAME} home`}>
          <Wordmark variant="dark" />
        </Link>
        <nav className="flex flex-wrap gap-6 text-[13px] font-medium" aria-label="Footer">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[var(--cream-muted)] transition-colors hover:text-[var(--cream)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="font-mono-ledger w-full text-[12px] leading-none sm:w-auto">
          © {new Date().getFullYear()} {SITE_NAME} · {host} · read-only · venue-scoped · cited
        </p>
      </div>
    </footer>
  )
}
