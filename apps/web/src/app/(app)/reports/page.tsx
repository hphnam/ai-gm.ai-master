import { AppShell } from '@/components/shell/app-shell'
import { ReportsListBody } from './reports-list-body'

export const dynamic = 'force-dynamic'

export default function ReportsIndexPage() {
  return (
    <AppShell>
      <ReportsListBody />
    </AppShell>
  )
}
