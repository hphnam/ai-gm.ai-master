'use client'

import { Copy, Mail, Phone, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

type Supplier = {
  id?: string
  name: string
  phone?: string | null
  email?: string | null
  contactName?: string | null
  leadTimeDays?: number | null
  notes?: string | null
  category?: string | null
}

type Data = Supplier | Supplier[] | { suppliers: Supplier[] }

function asArray(data: Data): Supplier[] {
  if (Array.isArray(data)) return data
  if ('suppliers' in data && Array.isArray(data.suppliers)) return data.suppliers
  return [data as Supplier]
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error("Couldn't copy — clipboard blocked.")
  }
}

function SupplierRow({ supplier }: { supplier: Supplier }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-foreground">{supplier.name}</p>
          {supplier.contactName ? (
            <p className="truncate text-[11.5px] text-muted-foreground">{supplier.contactName}</p>
          ) : null}
        </div>
        {typeof supplier.leadTimeDays === 'number' ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {supplier.leadTimeDays}d lead
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {supplier.phone ? (
          <a
            href={`tel:${supplier.phone}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Phone className="h-3 w-3" aria-hidden />
            {supplier.phone}
          </a>
        ) : null}
        {supplier.email ? (
          <a
            href={`mailto:${supplier.email}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Mail className="h-3 w-3" aria-hidden />
            {supplier.email}
          </a>
        ) : null}
        {supplier.phone || supplier.email ? (
          <button
            type="button"
            onClick={() => copy(supplier.phone ?? supplier.email ?? '', 'Contact')}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Copy contact"
          >
            <Copy className="h-3 w-3" aria-hidden />
          </button>
        ) : null}
      </div>
      {supplier.notes ? (
        <p className="text-[12px] italic leading-snug text-muted-foreground">{supplier.notes}</p>
      ) : null}
    </div>
  )
}

export function SupplierCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={Truck} title="Supplier">
        <CardEmpty message={output.detail ?? 'No supplier matched.'} />
      </CardShell>
    )
  }
  if (!isToolOk<Data>(output)) return null
  const suppliers = asArray(output.data)
  if (suppliers.length === 0) {
    return (
      <CardShell icon={Truck} title="Supplier">
        <CardEmpty message="Nothing matched." />
      </CardShell>
    )
  }
  return (
    <CardShell
      icon={Truck}
      title={suppliers.length === 1 ? suppliers[0].name : 'Suppliers'}
      subtitle={
        suppliers.length === 1
          ? (suppliers[0].category ?? undefined)
          : `${suppliers.length} matches`
      }
    >
      <div className="flex flex-col gap-2">
        {suppliers.map((s, i) => (
          <SupplierRow key={s.id ?? `${s.name}-${i}`} supplier={s} />
        ))}
      </div>
    </CardShell>
  )
}
