'use client'

import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Props = {
  requestId: string | undefined
  label?: string
}

export function DebugRequestIdBadge({ requestId, label = 'Request ID' }: Props) {
  const present = Boolean(requestId)

  function handleCopy() {
    if (!requestId) return
    navigator.clipboard
      .writeText(requestId)
      .then(() => toast.success('Request ID copied'))
      .catch(() => toast.error('Could not copy to clipboard'))
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!present}
      title={present ? 'Copy to clipboard' : 'No debug call completed yet'}
      aria-label={present ? `Copy ${label} ${requestId}` : `${label} not available`}
      className={cn(
        'font-mono text-xs px-2 py-1 rounded border select-all',
        present
          ? 'bg-muted hover:bg-muted/80 border-border cursor-pointer'
          : 'bg-muted/30 text-muted-foreground border-border/50 cursor-not-allowed',
      )}
    >
      {label}: {requestId ?? '—'}
    </button>
  )
}
