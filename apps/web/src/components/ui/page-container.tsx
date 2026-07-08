import type * as React from 'react'
import { cn } from '@/lib/utils'

const WIDTHS = {
  prose: 'max-w-3xl',
  content: 'max-w-5xl',
  wide: 'max-w-7xl',
} as const

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: keyof typeof WIDTHS
}

export function PageContainer({ width = 'prose', className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full px-4 py-6 sm:px-6 sm:py-8', WIDTHS[width], className)}
      {...props}
    />
  )
}
