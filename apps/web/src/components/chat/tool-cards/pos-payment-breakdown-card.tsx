'use client'

import { CreditCard } from 'lucide-react'
import { CardEmpty, CardShell } from './card-shell'
import { fmtMoney, type Kpi, KpiGroupSection, type Money, TableSection } from './report-sections'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

type TenderRow = { tender: string; count: number; amount: Money | null }

type PaymentBreakdown = {
  paymentCount: number
  totalCollected: Money | null
  tips: Money | null
  averageTicket: Money | null
  byTender: TenderRow[]
  windowHours: number
  truncated: boolean
}

const TENDER_LABEL: Record<string, string> = {
  CARD: 'Card',
  CASH: 'Cash',
  OTHER: 'Other',
}

export function PosPaymentBreakdownCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    if (output.reason === 'no-data' || output.reason === 'not-supported') return null
    return (
      <CardShell icon={CreditCard} title="Payment mix">
        <CardEmpty
          message={output.detail ?? "Couldn't pull the payment mix from your POS right now."}
        />
      </CardShell>
    )
  }
  if (!isToolOk<PaymentBreakdown>(output)) return null
  const data = output.data
  if (data.paymentCount === 0 || !data.totalCollected) return null

  const kpis: Kpi[] = [{ label: 'Collected', value: data.totalCollected }]
  if (data.averageTicket) kpis.push({ label: 'Avg ticket', value: data.averageTicket })
  if (data.tips) kpis.push({ label: 'Tips', value: data.tips })

  const total = data.totalCollected.value
  const rows = data.byTender.map((t) => {
    const amount = t.amount?.value ?? 0
    const share = total > 0 ? `${Math.round((amount / total) * 100)}%` : '—'
    return [TENDER_LABEL[t.tender] ?? t.tender, t.count, t.amount ? fmtMoney(t.amount) : '—', share]
  })

  return (
    <CardShell
      icon={CreditCard}
      title="Payment mix"
      subtitle={`${data.paymentCount} ${data.paymentCount === 1 ? 'ticket' : 'tickets'}${data.truncated ? ' · partial (understated)' : ''}`}
    >
      <div className="flex flex-col gap-3">
        <KpiGroupSection kpis={kpis} />
        <TableSection columns={['Tender', 'Count', 'Amount', 'Share']} rows={rows} />
      </div>
    </CardShell>
  )
}
