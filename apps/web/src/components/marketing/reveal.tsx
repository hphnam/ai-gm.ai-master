'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Fade + 22px rise as an element enters the viewport. Replaces the prototype's
// CSS `animation-timeline: view()` (still Chromium-only) with an
// IntersectionObserver so it works everywhere and can be disabled for
// prefers-reduced-motion. Reveals once, then unobserves.
export function Reveal({
  children,
  className,
  as: Tag = 'div',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            io.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -20% 0px', threshold: 0.05 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-[22px] opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
