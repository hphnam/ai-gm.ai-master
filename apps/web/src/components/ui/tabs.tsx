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
    <div
      className={cn('mb-6 flex min-w-0 items-center justify-between gap-3', className)}
      {...rest}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        // min-w-0 + overflow-x-auto lets the strip scroll instead of overflowing
        // the row when the labels + trailing action exceed a phone's width.
        className="flex min-w-0 gap-[3px] overflow-x-auto rounded-[10px] bg-[var(--paper-2)] p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map(({ id, label, icon: Icon, count, urgent, href }) => {
          const selected = value === id
          const tabClasses = cn(
            'relative flex shrink-0 cursor-pointer items-center gap-2 rounded-[7px] px-3.5 py-2 text-[13px] transition-colors',
            selected
              ? 'bg-[#fcfaf3] font-semibold text-[var(--ink-text)] shadow-[0_1px_2px_rgba(32,26,18,0.06)]'
              : 'font-medium text-[var(--ink-muted)] hover:text-[var(--ink-text)]',
          )
          const inner = (
            <>
              {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
              <span>{label}</span>
              {typeof count === 'number' && count > 0 ? (
                <span
                  className={cn(
                    'font-mono-ledger inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    selected ? 'text-[var(--ink-text)]' : 'text-[var(--mono-muted)]',
                  )}
                >
                  {urgent ? (
                    <span
                      className="inline-block h-1 w-1 rounded-full bg-[var(--clay)]"
                      aria-hidden
                    />
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
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
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
