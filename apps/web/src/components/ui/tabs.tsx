'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export interface TabItem<T extends string = string> {
  id: T
  label: string
  icon?: LucideIcon
  count?: number
  urgent?: boolean
  href?: string
}

interface TabsProps<T extends string> extends React.HTMLAttributes<HTMLDivElement> {
  items: TabItem<T>[]
  value: T
  onValueChange?: (id: T) => void
  ariaLabel?: string
  trailing?: React.ReactNode
  /**
   * When true, each tab gets `aria-controls={`tabpanel-${id}`}`. Set this only
   * if you actually render a matching <TabPanel id={id}> — otherwise screen
   * readers will announce a broken association.
   */
  hasPanels?: boolean
}

export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  ariaLabel,
  trailing,
  hasPanels = false,
  className,
  ...rest
}: TabsProps<T>) {
  return (
    <div className={cn('mb-6 flex items-center gap-3 border-b', className)} {...rest}>
      <div role="tablist" aria-label={ariaLabel} className="flex flex-1 gap-1">
        {items.map(({ id, label, icon: Icon, count, urgent, href }) => {
          const selected = value === id
          const tabClasses = cn(
            'relative -mb-px flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors',
            selected
              ? 'border-foreground font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )
          const inner = (
            <>
              {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
              <span>{label}</span>
              {typeof count === 'number' && count > 0 ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                    selected
                      ? 'bg-foreground/10 text-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {urgent ? (
                    <span className="inline-block h-1 w-1 rounded-full bg-amber-500" aria-hidden />
                  ) : null}
                  {count}
                </span>
              ) : null}
            </>
          )

          if (href) {
            return (
              <Link
                key={id}
                href={href}
                role="tab"
                aria-selected={selected}
                aria-controls={hasPanels ? `tabpanel-${id}` : undefined}
                id={`tab-${id}`}
                scroll={false}
                className={tabClasses}
              >
                {inner}
              </Link>
            )
          }

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={hasPanels ? `tabpanel-${id}` : undefined}
              id={`tab-${id}`}
              onClick={() => onValueChange?.(id)}
              className={tabClasses}
            >
              {inner}
            </button>
          )
        })}
      </div>
      {trailing ? <div className="shrink-0 pb-2">{trailing}</div> : null}
    </div>
  )
}

interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  active: boolean
}

export function TabPanel({ id, active, className, ...rest }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={!active}
      className={cn('min-w-0', className)}
      {...rest}
    />
  )
}
