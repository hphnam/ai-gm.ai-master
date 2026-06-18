'use client'

import { AlertCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  icon?: LucideIcon
  title: string
  subtitle?: string
  trailing?: ReactNode
  children: ReactNode
  tone?: 'default' | 'warning' | 'success'
  className?: string
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
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        tone === 'warning' && 'border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10',
        tone === 'success' && 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10',
        tone === 'default' && 'border-border',
        className,
      )}
    >
      <header className="flex items-start gap-2.5 border-b border-border/60 bg-background/40 px-3.5 py-2.5">
        {Icon ? (
          <Icon
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0',
              tone === 'warning'
                ? 'text-amber-600 dark:text-amber-500'
                : tone === 'success'
                  ? 'text-emerald-600 dark:text-emerald-500'
                  : 'text-muted-foreground',
            )}
            aria-hidden
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold leading-tight text-foreground">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[11.5px] leading-tight text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {trailing}
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}

export function CardEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-[12.5px] text-muted-foreground">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
      <span>{message}</span>
    </div>
  )
}
