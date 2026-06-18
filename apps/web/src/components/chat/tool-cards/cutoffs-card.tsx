'use client'

import { Clock3 } from 'lucide-react'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

type CutoffRow = {
  supplierName: string
  supplierNotes?: string | null
  leadTimeDays?: number | null
  estimatedDeliveryHours?: number | null
  stockCount?: number | null
  contactName?: string | null
  phone?: string | null
}

type Data = CutoffRow[] | { items: CutoffRow[] }

function asArray(data: Data): CutoffRow[] {
  if (Array.isArray(data)) return data
  if ('items' in data && Array.isArray(data.items)) return data.items
  return []
}

export function CutoffsCard({ part, ctx }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={Clock3} title="Order cutoffs">
        <CardEmpty
          message={
            output.reason === 'no-data'
              ? 'No cutoffs coming up in that window.'
              : (output.detail ?? "Couldn't check cutoffs.")
          }
        />
      </CardShell>
    )
  }
  if (!isToolOk<Data>(output)) return null
  const rows = asArray(output.data)
  if (rows.length === 0) {
    return (
      <CardShell icon={Clock3} title="Order cutoffs">
        <CardEmpty message="Nothing pressing." />
      </CardShell>
    )
  }
  return (
    <CardShell
      icon={Clock3}
      title="Order cutoffs"
      subtitle={`${rows.length} supplier${rows.length === 1 ? '' : 's'} approaching`}
      tone="warning"
    >
      <ul className="-mx-1 -my-1 divide-y divide-border/60">
        {rows.map((r, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: supplier+index is stable for one tool result; rows never reorder mid-render
          <li key={`${r.supplierName}-${i}`} className="px-1 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-foreground">{r.supplierName}</p>
                {r.contactName || r.stockCount ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {r.contactName ?? ''}
                    {r.contactName && r.stockCount ? ' · ' : ''}
                    {r.stockCount ? `${r.stockCount} lines` : ''}
                  </p>
                ) : null}
              </div>
              {typeof r.estimatedDeliveryHours === 'number' ? (
                <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  ~{Math.max(1, Math.round(r.estimatedDeliveryHours))}h delivery
                </span>
              ) : null}
            </div>
            {r.supplierNotes ? (
              <p className="mt-0.5 text-[12px] italic leading-snug text-muted-foreground">
                {r.supplierNotes}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-1.5">
              {r.phone ? (
                <a
                  href={`tel:${r.phone}`}
                  className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-accent"
                >
                  Call
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => ctx.onPrompt?.(`Help me draft the order for ${r.supplierName}.`)}
                className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-accent"
              >
                Draft order
              </button>
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
