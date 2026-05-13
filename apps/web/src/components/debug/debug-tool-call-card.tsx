'use client'

import { cn } from '@/lib/utils'
import { DebugJsonViewer } from './debug-json-viewer'

type ToolCallEntry = {
  round?: number
  toolUseId?: string
  tool?: string
  input?: unknown
  result?: {
    ok?: boolean
    data?: unknown
    reason?: string
    message?: string
  }
}

function similarityBand(sim: number): { cls: string; label: string } {
  if (sim >= 0.5) {
    return { cls: 'bg-emerald-500/20 text-emerald-900 border-emerald-500/40', label: 'high' }
  }
  if (sim >= 0.3) {
    return { cls: 'bg-amber-500/20 text-amber-900 border-amber-500/40', label: 'med' }
  }
  return { cls: 'bg-red-500/20 text-red-900 border-red-500/40', label: 'low' }
}

export function DebugToolCallCard({ entry }: { entry: ToolCallEntry }) {
  const round = typeof entry.round === 'number' ? entry.round : '?'
  const tool = entry.tool ?? 'unknown'
  const ok = entry.result?.ok === true
  const statusText = ok ? 'ok' : `fail:${entry.result?.reason ?? 'unknown'}`

  const similarityHits =
    tool === 'find_knowledge' && ok && Array.isArray(entry.result?.data)
      ? (entry.result!.data as Array<{ similarity?: unknown }>)
          .map((h) => (typeof h?.similarity === 'number' ? h.similarity : null))
          .filter((s): s is number => s !== null)
      : []

  return (
    <div className="border border-border rounded p-3 bg-card space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-muted-foreground">Round {round}</span>
        <span>·</span>
        <span className="font-medium">{tool}</span>
        <span
          className={cn(
            'ml-auto px-2 py-0.5 rounded border text-[10px]',
            ok
              ? 'bg-emerald-500/10 text-emerald-900 border-emerald-500/30'
              : 'bg-red-500/10 text-red-900 border-red-500/30',
          )}
        >
          {statusText}
        </span>
      </div>

      {similarityHits.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {similarityHits.map((sim, i) => {
            const band = similarityBand(sim)
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: similarity scores can duplicate, list is read-only
                key={i}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono',
                  band.cls,
                )}
              >
                <span>{sim.toFixed(3)}</span>
                <span className="uppercase opacity-80">{band.label}</span>
              </span>
            )
          })}
        </div>
      ) : null}

      <DebugJsonViewer title="input" data={entry.input} />
      <DebugJsonViewer title="result" data={entry.result} />
    </div>
  )
}
