import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-session'
import { DocsBody } from './docs-body'

export const dynamic = 'force-dynamic'

export default async function DocsPage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/docs')
  return <DocsBody tab="library" />
}
