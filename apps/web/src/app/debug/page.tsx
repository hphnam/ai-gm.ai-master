import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-session'
import { DebugBody } from './debug-body'

export const dynamic = 'force-dynamic'

export default async function DebugPage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/debug')
  return <DebugBody />
}
