'use client'

import { AlertCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'warning' | 'success'

type Props = {
  icon?: LucideIcon
  title: string
  subtitle?: string
  trailing?: ReactNode
  children: ReactNode
  tone?: Tone
  className?: string
}

const ICON_TILE_TONE: Record<Tone, string> = {
  default: 'bg-[rgba(143,107,31,0.12)] text-[var(--brass)]',
  warning: 'bg-[rgba(181,138,62,0.16)] text-[var(--warning)]',
  success: 'bg-[rgba(47,93,61,0.12)] text-[var(--success)]',
}

export function CardShell({
  icon: Icon,
  title,
  subtitle,
  trailing,
  children,
  tone = 'default',
  className,
}: Props) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-[#fdfbf5]',
        tone === 'warning' && 'border-[rgba(181,138,62,0.4)]',
        tone === 'success' && 'border-[rgba(47,93,61,0.35)]',
        tone === 'default' && 'border-[var(--hairline)]',
        className,
      )}
    >
      <header className="flex items-start gap-3 border-b border-[var(--hairline-soft)] px-4 py-3">
        {Icon ? (
          <span
            className={cn(
              'mt-px grid size-[26px] shrink-0 place-items-center rounded-md',
              ICON_TILE_TONE[tone],
            )}
            aria-hidden
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-semibold leading-tight text-[var(--ink-text)]">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 font-mono-ledger text-[11px] leading-tight text-[var(--mono-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {trailing}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function CardEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--hairline-soft)] bg-[var(--paper-2)]/50 px-3 py-2 text-[12.5px] text-[var(--ink-muted)]">
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[var(--clay)]" aria-hidden />
      <span>{message}</span>
    </div>
  )
}

export function LedgerDiamond({ className }: { className?: string }) {
  return (
    <span
      className={cn('size-[5px] shrink-0 rotate-45 bg-[var(--brass)]', className)}
      aria-hidden
    />
  )
}

export const SOURCE_CHIP_CLASS =
  'inline-flex items-center gap-1.5 rounded-[4px] border border-[rgba(143,107,31,0.35)] bg-[rgba(143,107,31,0.06)] px-2.5 py-1.5 font-mono-ledger text-[11px] font-medium text-[var(--brass)] transition-colors hover:bg-[rgba(143,107,31,0.1)]'
