import { Slot } from '@radix-ui/react-slot'
import type * as React from 'react'
import { cn } from '@/lib/utils'

interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
  interactive?: boolean
}

export function ListRow({ asChild, interactive, className, ...props }: ListRowProps) {
  const Comp = asChild ? Slot : 'div'
  return (
    <Comp
      className={cn(
        'rounded-lg border border-border bg-card px-4 py-3 shadow-sm',
        interactive &&
          'cursor-pointer transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  )
}
