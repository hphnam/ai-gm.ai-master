import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { getServerSession } from '@/lib/server-session'
import { ReportsListBody } from './reports-list-body'

export const dynamic = 'force-dynamic'

export default async function ReportsIndexPage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/reports')
  return (
    <AppShell>
      <ReportsListBody />
    </AppShell>
  )
}
