'use client'

import { Package, TrendingDown } from 'lucide-react'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

type StockItem = {
  id?: string
  name: string
  currentQty: number
  parLevel?: number | null
  reorderQty?: number | null
  unit?: string | null
  supplierName?: string | null
  categoryName?: string | null
}

type StockData = StockItem[] | { items: StockItem[] }

function normaliseList(data: StockData): StockItem[] {
  if (Array.isArray(data)) return data
  if ('items' in data && Array.isArray(data.items)) return data.items
  return []
}

function StockTable({
  items,
  onPrompt,
  highlightBelowPar,
}: {
  items: StockItem[]
  onPrompt?: (text: string) => void | Promise<void>
  highlightBelowPar?: boolean
}) {
  return (
    <ul className="-my-2 divide-y divide-[var(--hairline-soft)]">
      {items.map((item, i) => {
        const below =
          highlightBelowPar && typeof item.parLevel === 'number' && item.currentQty < item.parLevel
        const unit = item.unit ? ` ${item.unit}` : ''
        return (
          <li key={item.id ?? `${item.name}-${i}`} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-[var(--ink-text)]">
                {item.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono-ledger text-[11.5px] text-[var(--mono-muted)]">
                <span
                  className={below ? 'font-semibold text-[var(--clay)]' : 'text-[var(--ink-muted)]'}
                >
                  {item.currentQty}
                  {unit}
                  {typeof item.parLevel === 'number' ? (
                    <span className="text-[var(--mono-muted)]">
                      {' '}
                      / {item.parLevel}
                      {unit} par
                    </span>
                  ) : null}
                </span>
                {item.supplierName ? <span>· {item.supplierName}</span> : null}
                {item.categoryName ? <span>· {item.categoryName}</span> : null}
                {item.reorderQty ? (
                  <span>
                    · reorder {item.reorderQty}
                    {unit}
                  </span>
                ) : null}
              </div>
            </div>
            {onPrompt ? (
              <button
                type="button"
                onClick={() => onPrompt(`I need to update the stock count for ${item.name}.`)}
                className="shrink-0 rounded-md border border-[var(--hairline)] bg-[#fcfaf3] px-2.5 py-1 text-[11.5px] font-medium text-[var(--ink-text)] transition-colors hover:bg-[var(--paper-2)]"
              >
                Update
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export function StockBelowParCard({ part, ctx }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    // "Nothing below par" is a negative finding the prose already states — a
    // card restating it is noise. Only surface a card for a genuine error.
    if (output.reason === 'no-data') return null
    return (
      <CardShell icon={TrendingDown} title="Stock check">
        <CardEmpty message={output.detail ?? "Couldn't check stock right now."} />
      </CardShell>
    )
  }
  if (!isToolOk<StockData>(output)) return null
  const items = normaliseList(output.data)
  if (items.length === 0) return null
  return (
    <CardShell
      icon={TrendingDown}
      title="Below par"
      subtitle={`${items.length} ${items.length === 1 ? 'item' : 'items'} need attention`}
      tone="warning"
    >
      <StockTable items={items} onPrompt={ctx.onPrompt} highlightBelowPar />
    </CardShell>
  )
}

export function StockByNameCard({ part, ctx }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    // No match is a negative finding the prose already covers — suppress it and
    // only card a genuine error.
    if (output.reason === 'no-data') return null
    return (
      <CardShell icon={Package} title="Stock lookup">
        <CardEmpty message={output.detail ?? "Couldn't look up that stock right now."} />
      </CardShell>
    )
  }
  if (!isToolOk<StockData>(output)) return null
  const items = normaliseList(output.data)
  if (items.length === 0) return null
  return (
    <CardShell
      icon={Package}
      title={items.length === 1 ? items[0].name : 'Stock matches'}
      subtitle={items.length === 1 ? undefined : `${items.length} matches`}
    >
      <StockTable items={items} onPrompt={ctx.onPrompt} highlightBelowPar />
    </CardShell>
  )
}
