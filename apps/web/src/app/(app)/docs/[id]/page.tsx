import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-session'
import { DocDetailBody } from './doc-detail-body'

export const dynamic = 'force-dynamic'

export default async function DocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession()
  if (!session) {
    const { id } = await params
    redirect(`/auth/sign-in?redirect=/docs/${id}`)
  }
  const { id } = await params
  return <DocDetailBody id={id} />
}
