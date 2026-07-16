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
    // No upcoming cutoffs is a negative finding the prose already states —
    // suppress the card and only surface a genuine error.
    if (output.reason === 'no-data') return null
    return (
      <CardShell icon={Clock3} title="Order cutoffs">
        <CardEmpty message={output.detail ?? "Couldn't check cutoffs."} />
      </CardShell>
    )
  }
  if (!isToolOk<Data>(output)) return null
  const rows = asArray(output.data)
  if (rows.length === 0) return null
  return (
    <CardShell
      icon={Clock3}
      title="Order cutoffs"
      subtitle={`${rows.length} supplier${rows.length === 1 ? '' : 's'} approaching`}
      tone="warning"
    >
      <ul className="-my-2 divide-y divide-[var(--hairline-soft)]">
        {rows.map((r, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: supplier+index is stable for one tool result; rows never reorder mid-render
          <li key={`${r.supplierName}-${i}`} className="py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-[var(--ink-text)]">{r.supplierName}</p>
                {r.contactName || r.stockCount ? (
                  <p className="mt-0.5 font-mono-ledger text-[11px] text-[var(--mono-muted)]">
                    {r.contactName ?? ''}
                    {r.contactName && r.stockCount ? ' · ' : ''}
                    {r.stockCount ? `${r.stockCount} lines` : ''}
                  </p>
                ) : null}
              </div>
              {typeof r.estimatedDeliveryHours === 'number' ? (
                <span className="shrink-0 rounded-full bg-[rgba(181,138,62,0.14)] px-2 py-0.5 font-mono-ledger text-[11px] font-medium text-[var(--warning)]">
                  ~{Math.max(1, Math.round(r.estimatedDeliveryHours))}h delivery
                </span>
              ) : null}
            </div>
            {r.supplierNotes ? (
              <p className="mt-0.5 text-[12px] italic leading-snug text-[var(--ink-muted)]">
                {r.supplierNotes}
              </p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {r.phone ? (
                <a
                  href={`tel:${r.phone}`}
                  className="rounded-md border border-[var(--hairline)] bg-[#fcfaf3] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-text)] transition-colors hover:bg-[var(--paper-2)]"
                >
                  Call
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => ctx.onPrompt?.(`Help me draft the order for ${r.supplierName}.`)}
                className="rounded-md border border-[var(--hairline)] bg-[#fcfaf3] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-text)] transition-colors hover:bg-[var(--paper-2)]"
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
