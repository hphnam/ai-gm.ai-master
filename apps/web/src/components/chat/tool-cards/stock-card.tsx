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
    <ul className="-mx-1 -my-1 divide-y divide-border/60">
      {items.map((item, i) => {
        const below =
          highlightBelowPar && typeof item.parLevel === 'number' && item.currentQty < item.parLevel
        const unit = item.unit ? ` ${item.unit}` : ''
        return (
          <li key={item.id ?? `${item.name}-${i}`} className="flex items-center gap-3 px-1 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-foreground">{item.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-muted-foreground">
                <span className={below ? 'font-semibold text-destructive' : ''}>
                  {item.currentQty}
                  {unit}
                  {typeof item.parLevel === 'number' ? (
                    <span className="text-muted-foreground/70">
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
                className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:bg-accent"
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
    return (
      <CardShell icon={TrendingDown} title="Stock at par" tone="success">
        <CardEmpty
          message={
            output.reason === 'no-data'
              ? 'Everything is above par. Nothing to reorder.'
              : (output.detail ?? "Couldn't check stock right now.")
          }
        />
      </CardShell>
    )
  }
  if (!isToolOk<StockData>(output)) return null
  const items = normaliseList(output.data)
  if (items.length === 0) {
    return (
      <CardShell icon={TrendingDown} title="Stock at par" tone="success">
        <CardEmpty message="Everything is above par." />
      </CardShell>
    )
  }
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
    return (
      <CardShell icon={Package} title="Stock lookup">
        <CardEmpty message={output.detail ?? 'No stock matched that name.'} />
      </CardShell>
    )
  }
  if (!isToolOk<StockData>(output)) return null
  const items = normaliseList(output.data)
  if (items.length === 0) {
    return (
      <CardShell icon={Package} title="Stock lookup">
        <CardEmpty message="Nothing matched." />
      </CardShell>
    )
  }
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
