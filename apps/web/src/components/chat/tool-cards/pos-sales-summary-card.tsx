'use client'

import { TrendingUp } from 'lucide-react'
import { CardEmpty, CardShell } from './card-shell'
import { formatWindowRange, type Kpi, KpiGroupSection, type Money } from './report-sections'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

type SalesSummary = {
  orderCount: number
  gross: Money | null
  net: Money | null
  windowHours: number
  windowFromIso: string
  windowToIso: string
  truncated: boolean
}

export function PosSalesSummaryCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    if (output.reason === 'no-data' || output.reason === 'not-supported') return null
    return (
      <CardShell icon={TrendingUp} title="Sales">
        <CardEmpty message={output.detail ?? "Couldn't pull sales from your POS right now."} />
      </CardShell>
    )
  }
  if (!isToolOk<SalesSummary>(output)) return null
  const data = output.data
  if (data.orderCount === 0 || !data.gross) return null

  const kpis: Kpi[] = [{ label: 'Gross', value: data.gross }]
  if (data.net) kpis.push({ label: 'Net', value: data.net })
  kpis.push({ label: 'Orders', value: data.orderCount })

  const range = formatWindowRange(data.windowFromIso, data.windowToIso)
  const subtitle = data.truncated
    ? `${range ?? 'Selected window'} · partial (understated)`
    : (range ?? undefined)

  return (
    <CardShell icon={TrendingUp} title="Sales summary" subtitle={subtitle}>
      <KpiGroupSection kpis={kpis} />
    </CardShell>
  )
}
