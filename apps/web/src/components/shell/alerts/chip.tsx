'use client'

import { cn } from '@/lib/utils'

export function Chip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-[var(--brass)] bg-[var(--brass)] text-[var(--cream-hi)]'
          : 'border-[var(--hairline)] bg-transparent text-[var(--ink-muted)] hover:border-[var(--hairline-strong)] hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
