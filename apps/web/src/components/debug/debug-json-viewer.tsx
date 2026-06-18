'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DEBUG_JSON_UI_CAP } from '@/lib/format'
import { cn } from '@/lib/utils'

type DebugJsonViewerProps = {
  data: unknown
  title: string
  defaultOpen?: boolean
  cap?: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function DebugJsonViewer({
  data,
  title,
  defaultOpen = false,
  cap = DEBUG_JSON_UI_CAP,
}: DebugJsonViewerProps) {
  const [open, setOpen] = useState(defaultOpen)
  const raw = JSON.stringify(data, null, 2)
  const totalBytes = new Blob([raw]).size
  const truncated = raw.length > cap
  const shown = truncated ? raw.slice(0, cap) : raw
  const omitted = raw.length - shown.length

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1"
        aria-label={`${title}, ${open ? 'expanded' : 'collapsed'}, ${formatBytes(totalBytes)}${truncated ? ' truncated' : ''}`}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{title}</span>
        <span className="text-[10px] text-muted-foreground/70">
          ({formatBytes(totalBytes)}
          {truncated ? ' — truncated' : ''})
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre
          className={cn(
            'overflow-x-auto max-h-[40vh] whitespace-pre-wrap break-words',
            'text-xs bg-muted p-3 rounded mt-1 font-mono',
          )}
        >
          <code>{shown}</code>
        </pre>
        {truncated ? (
          <div role="status" className="text-xs text-muted-foreground italic mt-1">
            Content truncated — {omitted.toLocaleString()} bytes omitted (
            {raw.length.toLocaleString()} total). Full payload available via direct API:
            /debug/messages/:id
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}
