'use client'

import { Trophy } from 'lucide-react'
import { CardEmpty, CardShell } from './card-shell'
import { type BarRow, BarSection, fmtMoney, type Money } from './report-sections'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

type TopItem = {
  name: string
  quantitySold: number
  grossSales: Money | null
  orderCount: number
}

type TopItems = {
  items: TopItem[]
  windowHours: number
  truncated: boolean
}

export function PosTopItemsCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    if (output.reason === 'no-data' || output.reason === 'not-supported') return null
    return (
      <CardShell icon={Trophy} title="Top sellers">
        <CardEmpty
          message={output.detail ?? "Couldn't pull top sellers from your POS right now."}
        />
      </CardShell>
    )
  }
  if (!isToolOk<TopItems>(output)) return null
  const items = output.data.items
  if (items.length === 0) return null

  // Rank by revenue when the POS returns priced sales; fall back to units sold
  // for catalogs without prices on the line items.
  const currency = items.find((it) => it.grossSales)?.grossSales?.currency ?? null
  const byRevenue = currency != null
  const rows: BarRow[] = items.map((it) => ({
    label: it.name,
    value: byRevenue ? (it.grossSales?.value ?? 0) : it.quantitySold,
    tone: 'positive',
    sublabel: byRevenue
      ? `${it.quantitySold.toLocaleString()} sold · ${it.orderCount} ${it.orderCount === 1 ? 'order' : 'orders'}`
      : `${it.orderCount} ${it.orderCount === 1 ? 'order' : 'orders'}`,
  }))

  const formatValue = byRevenue ? (value: number) => fmtMoney({ value, currency }) : undefined

  return (
    <CardShell
      icon={Trophy}
      title="Top sellers"
      subtitle={byRevenue ? 'By revenue' : 'By units sold'}
    >
      <BarSection rows={rows} unit={byRevenue ? undefined : 'sold'} formatValue={formatValue} />
    </CardShell>
  )
}
