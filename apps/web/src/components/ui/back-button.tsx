'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type * as React from 'react'
import { BACK_LINK_CLASSES } from '@/components/ui/back-link'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  /** Where to land if there's no history to go back to. */
  fallbackHref: string
  children: React.ReactNode
  className?: string
}

/**
 * History-aware back trigger — calls `router.back()` to preserve the previous
 * URL exactly (including search params), falling back to `fallbackHref` on
 * cold loads. Client-only. For a static link to a known parent, prefer
 * `<BackLink>`.
 */
export function BackButton({ fallbackHref, children, className }: BackButtonProps) {
  const router = useRouter()
  return (
    <button
      type="button"
      className={cn(BACK_LINK_CLASSES, className)}
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
        } else {
          router.push(fallbackHref)
        }
      }}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {children}
    </button>
  )
}
