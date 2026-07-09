import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Constrains content to the ledger measure (1180px) and supplies the standard
// 28px gutter. Every section uses it so the whole site shares one rail.
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1180px] px-7', className)}>{children}</div>
}

type EyebrowTone = 'brass' | 'clay' | 'brass-dark'

const EYEBROW_COLOR: Record<EyebrowTone, string> = {
  brass: 'text-[var(--brass)]',
  clay: 'text-[var(--clay)]',
  'brass-dark': 'text-[var(--brass-dark)]',
}

const EYEBROW_RULE: Record<EyebrowTone, string> = {
  brass: 'bg-[var(--brass)]',
  clay: 'bg-[var(--clay)]',
  'brass-dark': 'bg-[var(--brass-dark)]',
}

// Small uppercase editorial label with a leading 22px accent rule. The rule is
// dropped on centered eyebrows so the label reads as a standalone kicker.
export function Eyebrow({
  children,
  tone = 'brass',
  rule = true,
  className,
}: {
  children: ReactNode
  tone?: EyebrowTone
  rule?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-[11px] font-bold uppercase leading-none tracking-[0.2em]',
        EYEBROW_COLOR[tone],
        className,
      )}
    >
      {rule ? <span className={cn('h-px w-[22px]', EYEBROW_RULE[tone])} aria-hidden /> : null}
      {children}
    </span>
  )
}

// A 6px brass diamond — the ledger's separator / bullet glyph.
export function Diamond({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block size-1.5 rotate-45 bg-[var(--brass)]', className)}
      aria-hidden
    />
  )
}

// Mono citation pill: brass text/border on a faint brass wash, leading diamond.
export function CitationChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'font-mono-ledger inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-[11px] font-medium leading-none',
        'border-[rgba(143,107,31,0.35)] bg-[rgba(143,107,31,0.06)] text-[var(--brass)]',
        className,
      )}
    >
      <span className="size-1.5 rotate-45 bg-[var(--brass)]" aria-hidden />
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  eyebrowTone = 'brass',
  title,
  lede,
  align = 'left',
  className,
}: {
  eyebrow?: string
  eyebrowTone?: EyebrowTone
  title: ReactNode
  lede?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col', align === 'center' && 'items-center text-center', className)}
    >
      {eyebrow ? (
        <Eyebrow tone={eyebrowTone} rule={align === 'left'} className="mb-[22px]">
          {eyebrow}
        </Eyebrow>
      ) : null}
      <h2 className="font-news text-balance text-[clamp(2.25rem,3.6vw,3.125rem)] font-extrabold leading-[1.06] tracking-[-0.028em]">
        {title}
      </h2>
      {lede ? (
        <p
          className={cn(
            'mt-5 max-w-[44ch] text-pretty text-[16.5px] leading-[1.65] text-[var(--ink-muted)]',
            align === 'center' && 'max-w-2xl',
          )}
        >
          {lede}
        </p>
      ) : null}
    </div>
  )
}

// Solid brass CTA with the ledger's "printed" 2px offset shadow.
export function SolidButton({
  href,
  children,
  size = 'md',
  className,
}: {
  href: string
  children: ReactNode
  size?: 'md' | 'lg'
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center rounded-md bg-[var(--brass)] font-semibold text-[var(--cream-hi)] shadow-[0_2px_0_var(--brass-shadow)] transition-colors hover:bg-[var(--brass-shadow)]',
        size === 'lg' ? 'px-8 py-[17px] text-[16px]' : 'px-[26px] py-[15px] text-[15px]',
        className,
      )}
    >
      {children}
    </Link>
  )
}

// Outline CTA — hairline border that firms to ink on hover.
export function OutlineButton({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-[rgba(32,26,18,0.25)] px-5 py-[15px] text-[15px] font-semibold text-[var(--ink-text)] transition-colors hover:border-[var(--ink-text)]',
        className,
      )}
    >
      {children}
    </Link>
  )
}
