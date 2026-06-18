import type { LucideIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  size?: 'default' | 'compact'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'default',
  className,
  children,
  ...rest
}: EmptyStateProps) {
  const isCompact = size === 'compact'
  return (
    <div
      className={cn(
        'rounded-2xl border bg-card',
        isCompact ? 'px-5 py-8 sm:px-6 sm:py-10' : 'px-6 py-10 sm:px-10 sm:py-14',
        className,
      )}
      {...rest}
    >
      <div className="mx-auto max-w-xl text-center">
        {Icon ? (
          <div
            className={cn(
              'mx-auto mb-5 flex items-center justify-center rounded-full bg-primary/10 text-primary',
              isCompact ? 'h-10 w-10' : 'h-12 w-12',
            )}
          >
            <Icon className={cn(isCompact ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden />
          </div>
        ) : null}
        <h2
          className={cn(
            'font-semibold tracking-tight',
            isCompact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl',
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              'mt-2 leading-relaxed text-muted-foreground',
              isCompact ? 'text-sm' : 'text-sm sm:text-base',
            )}
          >
            {description}
          </p>
        ) : null}
        {action ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{action}</div>
        ) : null}
      </div>
      {children ? <div className="mt-10">{children}</div> : null}
    </div>
  )
}
