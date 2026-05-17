import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-session'
import { DocsBody } from '../docs-body'

export const dynamic = 'force-dynamic'

export default async function DocsQuestionsPage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/docs/questions')
  return <DocsBody tab="questions" />
}
