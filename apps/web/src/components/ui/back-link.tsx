import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const BACK_LINK_CLASSES =
  '-ml-1 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'

interface BackLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * Static back link to a known destination. Server-component safe — pure
 * `next/link`, no client runtime. For history-aware "go back" use
 * `<BackButton>` (client) instead.
 */
export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link href={href} className={cn(BACK_LINK_CLASSES, className)}>
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  )
}

export { BACK_LINK_CLASSES }
