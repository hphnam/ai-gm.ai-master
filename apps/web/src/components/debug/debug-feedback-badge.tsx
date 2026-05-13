'use client'

import { RotateCw, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { DebugFeedbackDto as DebugFeedback } from '@/lib/api-types'
import { cn } from '@/lib/utils'

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

const STYLE: Record<string, { icon: typeof ThumbsUp; label: string; cls: string }> = {
  up: {
    icon: ThumbsUp,
    label: 'up',
    cls: 'bg-emerald-500/20 text-emerald-900 border-emerald-500/40',
  },
  down: {
    icon: ThumbsDown,
    label: 'down',
    cls: 'bg-red-500/20 text-red-900 border-red-500/40',
  },
  regenerate: {
    icon: RotateCw,
    label: 'regenerate',
    cls: 'bg-amber-500/20 text-amber-900 border-amber-500/40',
  },
}

export function DebugFeedbackBadge({ feedback }: { feedback: DebugFeedback | null }) {
  if (!feedback) return null
  const style = STYLE[feedback.kind] ?? {
    icon: ThumbsUp,
    label: feedback.kind,
    cls: 'bg-muted text-foreground border-border',
  }
  const Icon = style.icon
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs', style.cls)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{style.label}</span>
      <span className="text-[10px] opacity-70">· {relativeTime(feedback.createdAt)}</span>
    </span>
  )
}
