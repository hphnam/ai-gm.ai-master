import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-session'
import { ComplianceBody } from './compliance-body'

export const dynamic = 'force-dynamic'

export default async function CompliancePage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/compliance')
  return <ComplianceBody />
}
